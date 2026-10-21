# Roadmap

The approved plan for the first version is [plans/v1.md](plans/v1.md). Each milestone ends playable and tested, with a commit on branch `v1`.

## v1 milestones

- [x] **M0 Foundation:** repo, workspaces, tooling, docs, determinism scan.
- [x] **M1 Battle engine:**
  - deterministic sim, maps and pathfinding;
  - formations, combat, morale, fatigue and ammo;
  - the chain of command and three levels of AI;
  - the headless battle runner.
- [x] **M2 HD-2D battlefield (solo):**
  - Three.js scene, pixel art and post effects;
  - camera, controls and HUD;
  - the local relay.
- [x] **M3 Multiplayer:**
  - RoomCore relay, lobby and LockstepDriver;
  - resync, reconnect and pause;
  - the Node host, bots and the integration test.
- [x] **M4 Roles:** detachment orders and markers, human Commanders, pings, possession with prediction.
- [x] **M5 Content:**
  - Carthage, Persia and Macedon, with elephants, scythed chariots and horse archers;
  - Thermopylae, Last Stand, Capture & Hold and Defend the Bridge, with lobby choices for maps and factions;
  - the gold economy (recruiting, reinforcements, refills) and fog of war.
- [x] **M6 Launch:**
  - synthesised 16-bit music (menu, battle, victory and defeat themes) and battle sound effects, with volume settings;
  - the intro fly-over, settings and How to Play;
  - the performance check: 0.4–0.7 ms per tick on average, headless, in every mode;
  - the Cloudflare Worker and Durable Object relay (tested locally with bots), and the pull request.
- [x] **Go live:** https://pixel-legions.pl-worker.workers.dev (first deployed 2026-10-21; checked with bots over the internet).

## After v1

1. **Skirmish:** annihilation on a random map.
2. **Replays:** the seed plus the order log.
3. **More historical battles:** Cannae, Gaugamela, Zama, Marathon, Plataea, Pydna.
4. **Personal action combat** for captains.
5. **A linked co-op campaign** with veterans, then a campaign map.
6. **More factions:** Gauls and Germans, Egypt, Parthia.
7. **Bigger systems:** sieges, weather, night battles with torchlight, a map editor, gamepad support, spectator tools.

## Known polish items

- Close zoom drops to about 40 fps on this Mac, from overdraw of large alpha-tested sprites.
  - Options: sort front to back, or lower the render scale when zoomed in.
- The map edge past the playable area can look dark at some angles.
- Walls are drawn as stone blocks with a stretched texture on their sides.
- The general of a beaten wave rides off to a map corner and waits there.
- Recruiting can't move units between detachments yet; they group automatically.
- The art preview (`#art`) only opens on a fresh page load.

## Ideas from game nights

Write ideas here after you play; future sessions pick from this list.

-
