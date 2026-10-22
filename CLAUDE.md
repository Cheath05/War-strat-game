# Pixel Legions (War-strat-game)

An HD-2D (Octopath Traveler / Final Fantasy Resonance style), Total War-like battle game that four friends play together in the browser on Windows and Mac. Every player's computer runs the same deterministic battle simulation (lockstep); a tiny relay passes orders between them.

## Where things are

- **Repo:** github.com/Cheath05/War-strat-game (public). Work happens on branch `v1`; `main` gets it through a pull request.
- **Plan and progress:**
  - `docs/plans/v1.md` is the approved plan;
  - `docs/roadmap.md` is the milestone checklist and the "ideas from game nights" inbox. Start there.
- **Design:** `docs/design.md` (game rules, roles, factions, modes); `docs/architecture.md` (lockstep, determinism, rendering); `docs/adding-content.md` (new units, factions, scenarios, maps).
- **Packages** (npm workspaces, TypeScript everywhere, imported as source):
  - `packages/sim`: the deterministic battle engine, game data (`src/data/`) and AI. No DOM, no Node APIs.
  - `packages/net`: wire protocol, `RoomCore` (lobby + lockstep relay, transport-agnostic) and the client-side `LockstepDriver`.
  - `packages/server`: Node host for development and LAN (`ws` + static files).
  - `packages/worker`: Cloudflare Worker + Durable Object wrapping `RoomCore` (the public link).
  - `packages/client`: React screens + the Three.js HD-2D battlefield; art and sound are generated in code.
  - `tools/`: headless battle runner, bot players, determinism scan, dev launcher.

## Commands

- `npm run dev` starts the relay on :8090 and the client on http://localhost:5190.
- `npm run check` runs the determinism scan, typecheck and all tests.
- `npm run battle -- <scenario> --seed N` runs a headless AI-vs-AI battle and prints timing.
- `npm run host` builds the client and serves the game on the LAN (port 8090).
- `npm run cf:dev` runs the Cloudflare Worker locally (http://localhost:8787, no account needed); `npm run deploy` publishes it (needs `npx wrangler login`, which the user approves).
- `npm run bots -- ABCD 3 --start --scenario thermopylae --seconds 60` plays a room with bots and reports whether they stayed in sync.
- `npx tsx tools/sprite-sheet.ts out.png 0 greece.spartans rome.hastati` renders units' sprites (key views, 4x, team colour 0) to a PNG for reviewing art without a browser; `#art` in the browser shows a faction's line-up.

## Rules that must hold

- **Determinism.** Everything under `packages/sim/src` must compute bit-identical results on every browser:
  - only `+ - * /`, `Math.sqrt`, floor/ceil/round/trunc/abs/min/max/sign/imul;
  - never `Math.random`, trig, `**`, `Date`, timers or `Float32Array`. `npm run check:det` enforces this;
  - all randomness comes from `world.rng`;
  - state is plain JSON (no class instances, Maps or typed arrays), iterated in array order.
  - Caches such as the spatial grid, paths and the map are rebuilt from state, never stored in it.
- **The renderer only reads.** The client never changes sim state directly; every change is a command that goes through the relay.
- **Updates:** with every deploy, add an entry to `packages/client/src/app/changelog.ts` (players open it from the version number at the bottom of the menus); the first entry's version is the game's version.
- **Ports:** this game uses 5190 and 8090. Footsim (Soccer-Game) uses 8000, 8765 and 5173. Never touch Soccer-Game.
- **This Mac has 8 GB of RAM and 4 performance cores.**
  - Run heavy checks one at a time, with at most 2 browser tabs.
  - Check that no footsim calibration batch is running (`pgrep -fl calibrate-engine`) before benchmarks.
