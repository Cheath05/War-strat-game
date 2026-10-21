# Architecture

## Lockstep in one paragraph

- **Every computer runs the same battle.** Each player's computer runs the battle simulation (`packages/sim`) tick by tick, at 20 ticks a second.
- **The relay owns the clock.** The relay is `RoomCore`, hosted in a Cloudflare Durable Object or the Node host.
  - Every 100 ms (2 ticks) it broadcasts a **turn**: the orders it received since the last turn.
  - It tags each order with the player who sent it.
- **Nobody runs ahead.** A client simulates a tick only once it holds that tick's turn, so every computer applies the same orders at the same tick and stays identical.
- **Only orders cross the network,** so bandwidth doesn't grow with the number of soldiers.

## The simulation (`packages/sim`)

- **`World` (types.ts) is the whole state.**
  - It is plain JSON: armies, detachments, units, soldiers, projectiles, players, scenario state and the RNG.
  - It can be hashed, saved and sent to a reconnecting player exactly as it is.
- **`Battle` (battle.ts) wraps a World with caches rebuilt from it.**
  - The caches: the map (rebuilt from `world.map` = id + seed), id lookups, unit centres, and the spatial grid.
  - `Battle.load(json)` and `serialize()` round-trip exactly.
- **One tick (`Battle.step`) runs in a fixed order:**
  1. Unit centres.
  2. Commands.
  3. Scenario script.
  4. AI (general → commander → captain).
  5. Paths.
  6. Possession.
  7. Unit anchors.
  8. Grid.
  9. Melee targeting.
  10. Soldier steering.
  11. Grid.
  12. Charges.
  13. Melee.
  14. Missiles.
  15. Morale and fatigue.
  16. Cooldowns.
  17. Cleanup (deaths, promotions).
  18. Victory.
- **Units and soldiers.**
  - A unit's *anchor* (the centre of its front rank) follows its order along an A* path.
  - Each soldier steers to a slot behind the anchor, or toward the enemy he's fighting.
  - Slots are implicit: a soldier's slot is his place in `unit.sol`, so when men fall the rear ranks step up.
- **The chain of command.** An army has a general (in his guard detachment) and detachments, each with a commander. Every unit has a captain. Any of those officers can be possessed by a player.
- **AI** (all inside the sim, so it's identical everywhere):
  - **Generals** choose a plan (assault, defend, or a scenario directive) and give detachment orders.
  - **Commanders** lay out and order their units.
  - **Captains** fire at will, skirmish, brace and fight back.
- **Speed:** about 0.45 ms per tick for 760 soldiers and 1.1 ms for 1,500 on this Mac (`npm run battle`).

## The relay (`packages/net`)

**`RoomCore`** is one game room. The Node host (`packages/server`) and the Cloudflare Durable Object (`packages/worker`) both drive it.

**In the lobby,** it owns who leads which army (General or Commander), the scenario and the rules.

**When the host starts,** it broadcasts a `BattleSetup`. Every client builds the identical world from it.

**During the battle,** a 100 ms timer broadcasts `turn {n, c}`. The commands are tagged with the sender's player id, and `c` is left out when there are none.

**`LockstepDriver`** is the client side:
- It buffers turns.
- It simulates tick `t` only once turn `floor(t / 2)` has arrived.
- It catches up quickly when behind (for example, after the browser tab was in the background).
- It reports a hash every 20 ticks.

**Hash checks.** Once every connected player has reported a tick:
- If all the hashes agree, nothing happens.
- Otherwise the majority wins (the host's version on a tie), and the relay sends `stateReq` to a healthy player.
- That player answers at the next turn boundary with its serialised world.
- The relay forwards it as `resync`, then replays every turn since then, empty ones included, so the receiver's turn numbers have no gaps.

**Reconnect and late join** use the same path. The browser keeps a room token in `sessionStorage`, so a reload or dropped connection comes back as the same player. While they're gone, a `sys leave` command (inside a turn, so every computer applies it at the same tick) hands their troops to the AI. `sys join` gives them back.

**Testing.**
- `packages/net/test/lockstep.test.ts` runs four clients against `RoomCore` over a fake network with lag, jitter and ordered delivery. It checks that every hash agrees, that a deliberately corrupted world gets repaired, and that a dropped player rejoins in step.
- `npm run bots -- ABCD 2` adds bot players to a real room.

## Determinism rules

See CLAUDE.md. `npm run check:det` scans the sim for banned APIs.

- **Caches never carry information between ticks.** Anything used in a tick must come from state at that point, because a resynced client starts with empty caches.
- **Two caches are exempt,** because they're pure functions of their inputs: the path cache and the map.

## Safety nets

- **Hash checks.** Every 20 ticks each client sends a hash of its world. When hashes disagree, the relay asks a healthy client for its state and sends it to the others as a `resync`. They load it and replay the turns since then.
- **Reconnect.** This uses the same mechanism. While a player is away, their armies and detachments go to the AI (a `sys` command inside a turn, so every computer switches at the same tick).
