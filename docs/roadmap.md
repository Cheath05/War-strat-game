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
- [ ] **M4 Roles:** detachment orders and markers, human Commanders, pings, possession with prediction.
- [ ] **M5 Content:**
  - Carthage, Persia and Macedon;
  - Thermopylae, Last Stand, Capture & Hold and Defend the Bridge;
  - the gold economy and fog of war.
- [ ] **M6 Launch:**
  - sound and music, the intro fly-over, settings and How to Play;
  - the performance pass;
  - the Cloudflare deploy and the pull request.

## After v1

1. **Skirmish:** annihilation on a random map.
2. **Replays:** the seed plus the order log.
3. **More historical battles:** Cannae, Gaugamela, Zama, Marathon, Plataea, Pydna.
4. **Personal action combat** for captains.
5. **A linked co-op campaign** with veterans, then a campaign map.
6. **More factions:** Gauls and Germans, Egypt, Parthia.
7. **Bigger systems:** sieges, weather, night battles with torchlight, a map editor, gamepad support, spectator tools.

## Known polish items

- Horses read a little like camels: the neck is too upright.
- Close zoom drops to about 40 fps on this Mac, from overdraw of large alpha-tested sprites.
  - Options: sort front to back, or lower the render scale when zoomed in.
- The map edge past the playable area can look dark at some angles.

## Ideas from game nights

Write ideas here after you play; future sessions pick from this list.

-
