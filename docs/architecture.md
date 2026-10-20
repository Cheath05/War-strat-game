# Architecture

## Lockstep in one paragraph

Every player's computer runs the same battle simulation (`packages/sim`), tick by tick, at 20 ticks a second. The relay (`RoomCore`, hosted in a Cloudflare Durable Object or the Node host) owns the clock. Every 100 ms (2 ticks) it broadcasts a **turn**: the orders it received since the last turn, each tagged with the player who sent it. A client simulates a tick only once it holds that tick's turn, so every computer applies the same orders at the same tick and stays identical. Only orders cross the network, so bandwidth doesn't grow with the number of soldiers.

## Determinism rules

See CLAUDE.md. `npm run check:det` scans the sim for banned APIs.

## Safety nets

- **Hash checks.** Every 20 ticks each client sends a hash of its world. When hashes disagree, the relay asks a healthy client for its state and sends it to the others as a `resync`. They load it and replay the turns since then.
- **Reconnect.** This uses the same mechanism. While a player is away, their armies and detachments go to the AI (a `sys` command inside a turn, so every computer switches at the same tick).

## More to come

Each milestone adds its section here: the sim tick order, the renderer, the relay protocol and the worker.
