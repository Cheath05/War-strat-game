import type { ScenarioDef } from '../types';

/** Open-field battle between two Roman and two Greek armies; the M1 test bed. */
export const FIELD: ScenarioDef = {
  id: 'field',
  name: 'Clash on the Plains',
  blurb: 'Two consular armies meet two Greek allied armies on open ground. A test of arms.',
  mode: 'test',
  map: { id: 'plains' },
  deploySeconds: 45,
  victory: [{ k: 'rout' }],
  sides: [
    {
      name: 'Rome',
      faction: 'rome',
      role: 'attacker',
      slots: [
        {
          key: 'rome-a',
          name: 'Scipio',
          title: 'The First Legion',
          faction: 'rome',
          deploy: 'south',
          ai: 'assault',
          dets: [
            { name: 'Velites', units: ['rome.velites', 'rome.velites'] },
            { name: 'Hastati', units: ['rome.hastati', 'rome.hastati', 'rome.hastati'] },
            { name: 'Principes', units: ['rome.principes', 'rome.principes'] },
            { name: 'Triarii & Horse', units: ['rome.triarii', 'rome.equites'] },
          ],
        },
        {
          key: 'rome-b',
          name: 'Flamininus',
          title: 'The Allied Legion',
          faction: 'rome',
          deploy: 'south',
          ai: 'assault',
          dets: [
            { name: 'Velites', units: ['rome.velites'] },
            { name: 'Socii', units: ['rome.socii', 'rome.socii', 'rome.socii'] },
            { name: 'Principes', units: ['rome.principes', 'rome.triarii'] },
            { name: 'Equites', units: ['rome.equites', 'rome.equites'] },
          ],
        },
      ],
    },
    {
      name: 'Greece',
      faction: 'greece',
      role: 'defender',
      slots: [
        {
          key: 'greece-a',
          name: 'Pausanias',
          title: 'The Spartans',
          faction: 'greece',
          deploy: 'north',
          ai: 'defend',
          dets: [
            { name: 'Light Troops', units: ['greece.peltasts', 'greece.psiloi'] },
            { name: 'Hoplites', units: ['greece.hoplites', 'greece.hoplites', 'greece.hoplites'] },
            { name: 'Spartiates', units: ['greece.spartans', 'greece.spartans'] },
            { name: 'Archers & Horse', units: ['greece.archers', 'greece.hippeis'] },
          ],
        },
        {
          key: 'greece-b',
          name: 'Aristides',
          title: 'The Athenians',
          faction: 'greece',
          deploy: 'north',
          ai: 'defend',
          dets: [
            { name: 'Archers', units: ['greece.archers', 'greece.psiloi'] },
            { name: 'Hoplites', units: ['greece.hoplites', 'greece.hoplites', 'greece.hoplites'] },
            { name: 'Reserve', units: ['greece.hoplites', 'greece.peltasts'] },
            { name: 'Hippeis', units: ['greece.hippeis', 'greece.hippeis'] },
          ],
        },
      ],
    },
  ],
};

/** Rome against Rome: checks the AI and the map have no built-in side bias. */
export const MIRROR: ScenarioDef = {
  ...FIELD,
  id: 'mirror',
  name: 'Civil War',
  blurb: 'Roman legions on both sides (balance test).',
  sides: [FIELD.sides[0], { ...FIELD.sides[0], slots: FIELD.sides[0].slots.map((s) => ({ ...s, key: `${s.key}-2`, deploy: 'north', ai: 'defend' })) }],
};

/** Minimal 1v1 used by tests. */
export const DUEL: ScenarioDef = {
  id: 'duel',
  name: 'Duel',
  blurb: 'Test scenario.',
  mode: 'test',
  map: { id: 'flat' },
  deploySeconds: 0,
  victory: [{ k: 'rout' }],
  sides: [
    { name: 'Rome', faction: 'rome', role: 'attacker', slots: [{ key: 'a', name: 'A', title: 'A', faction: 'rome', deploy: 'south', ai: 'assault', dets: [] }] },
    { name: 'Greece', faction: 'greece', role: 'defender', slots: [{ key: 'b', name: 'B', title: 'B', faction: 'greece', deploy: 'north', ai: 'defend', dets: [] }] },
  ],
};

/** Duel on the wall-with-a-gap map: used by the narrow-passage test. */
export const GAP: ScenarioDef = { ...DUEL, id: 'gap', name: 'Gap', map: { id: 'wallgap' } };
