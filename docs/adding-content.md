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

Covered at M5 (Thermopylae). For now, see `data/scenarios/field.ts` and `data/maps/plains.ts`:

- **Maps** are deterministic scripts that paint terrain and heights with the `Painter` (`map/mapgen.ts`), in metres. They also define named deployment zones, points and routes.
