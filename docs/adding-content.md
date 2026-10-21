# Adding content

All content is data in `packages/sim/src/data/`.

## A new unit type

1. Add an entry to the faction's `units` list in `data/factions/<faction>.ts`. Copy a similar unit and change:
   - **`id`:** `'<faction>.<name>'`, unique.
   - **`cls`:** `inf`, `spear`, `pike`, `skirm`, `archer`, `slinger`, `cav`, `hcav`, `hacav`, `ele` or `chariot`. The AI uses it to decide how to employ the unit.
   - **Stats:**
     - `hp`, `atk`, `def`, `armor` and `shield`;
     - `dmg` and `ap` (armour-piercing);
     - `charge` and `bonusLarge` (vs cavalry/elephants);
     - `mass` (charge impact);
     - `speed`/`run` in m/s, and `morale`.
   - **`missile`** (optional): range, ammo, damage and reload.
   - **`forms`:** allowed formations; the first is the default.
   - **`sprite`:** how the client's pixel-doll generator draws it (helmet, shield, weapon, colours, mount).
2. Check balance with the headless runner. To try one unit against another, add a scenario or use the helpers in `packages/sim/test/helpers.ts` (see `tools/out/matchup.ts` for an example).

## A new faction

1. Create `data/factions/<id>.ts` exporting a `FactionDef`. It needs its units, a general's guard unit (`general: true`), general names, and preferred team colours (indices into `data/colors.ts`).
2. Add it to `FACTIONS` in `data/registry.ts`.

## Scenarios and maps

Good examples: `data/maps/thermopylae.ts` and `data/scenarios/thermopylae.ts` (hand-made), `data/scenarios/laststand.ts` and `objective.ts` (configured from lobby choices).

- **Maps** are deterministic scripts that paint terrain and heights with the `Painter` (`map/mapgen.ts`), in metres. Map scripts follow the same determinism rules as the sim: no trig or `**`.
  - `zone(name, x0, y0, x1, y1, dx, dy)` makes a deployment zone facing (dx, dy). Armies sharing a zone split it: side by side if it's wide, front to back if it's narrow.
  - `point(name, x, y)` names a spot. Capture points are `cp1`, `cp2`, `cp3` by convention.
  - `route(name, [x0, y0, ...])` is a path for the AI's `route:` directive.
  - Register the map in `data/maps/index.ts`.
- **Scenarios** are `ScenarioDef`s (`data/types.ts`). Register them in `data/scenarios/index.ts`.
  - Each side lists army slots: general, faction, deployment zone, detachments and an AI directive. The directives are `assault`, `defend`, `hold` (keep the zone's facing; never attack), `capture` (go for the objectives), `zone:<id>` (push into a zone), `route:<id>` (march the route, then assault) and `wait:<seconds>`.
  - `reserve: true` slots arrive mid-battle (a script calls `spawnReserve`). Players can claim them in the lobby and take command when they arrive.
  - `victory` rules: `rout`, `timer` (a side wins when time runs out), `zone` (n men in a zone), `points` (a victory-point target) and `deadline` (most points wins).
  - `recruit` makes it a gold mode: `gold` (or `goldBySide`) to recruit before the battle, a unit cap, which `sides` use gold, and `income` per minute.
  - `options` plus `configure(choices)` give the lobby choices (map, factions) and build the battle from them. Slot keys should stay the same across choices.
  - `objectives` puts capture points on map points; `waves` turns on scripted waves (see Last Stand).
- **Scripts** (`scenario/scripts.ts`): `registerScenarioScript(id, fn)` runs `fn` every tick of the battle phase.
  - Helpers: `once(b, key)` for one-off events, `spawnReserve` and `spawnLate` for armies, `newDetachment` and `arrive` for single units, and `b.msg(text, tone, side)` for messages.
  - Set `world.scenario.vars.pending<side>` above 0 while a side still has troops to come, so it can't be called broken early.
- **Try it headless:** `npm run battle -- <scenario> --seed 1 --difficulty 1 --log` prints the script's messages, the result and the timing.
