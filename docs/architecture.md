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

## Determinism rules

See CLAUDE.md. `npm run check:det` scans the sim for banned APIs.

- **Caches never carry information between ticks.** Anything used in a tick must come from state at that point, because a resynced client starts with empty caches.
- **Two caches are exempt,** because they're pure functions of their inputs: the path cache and the map.

## Safety nets

- **Hash checks.** Every 20 ticks each client sends a hash of its world. When hashes disagree, the relay asks a healthy client for its state and sends it to the others as a `resync`. They load it and replay the turns since then.
- **Reconnect.** This uses the same mechanism. While a player is away, their armies and detachments go to the AI (a `sys` command inside a turn, so every computer switches at the same tick).
