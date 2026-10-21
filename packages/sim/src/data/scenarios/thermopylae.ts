import type { ScenarioDef } from '../types';

/**
 * Thermopylae, 480 BC. A few thousand Greeks under Leonidas hold the pass against the
 * army of Xerxes for three days, until a local man shows the Persians the mountain path.
 * Co-op: hold the Hot Gates against wave after wave. PVP: someone plays Persia.
 */
export const THERMOPYLAE_SCENARIO: ScenarioDef = {
  id: 'thermopylae',
  name: 'Thermopylae',
  year: '480 BC',
  blurb: 'Hold the Hot Gates against the endless army of Xerxes, and watch the mountain path.',
  history:
    'King Leonidas of Sparta and about seven thousand Greeks held the narrow coastal pass for two days against a vastly larger Persian army. On the third, a local man named Ephialtes led the Immortals over the mountains by a goat path. Leonidas sent most of the army away and stayed with his three hundred Spartans, the Thespians and the Thebans to the end.',
  mode: 'historical',
  map: { id: 'thermopylae', seed: 480 },
  deploySeconds: 60,
  victory: [{ k: 'timer', winner: 0, seconds: 18 * 60 }, { k: 'zone', zone: 'east_exit', side: 1, count: 50 }, { k: 'rout' }],
  recruit: { gold: 0, maxUnits: 18, sides: [1], income: 60 },
  sides: [
    {
      name: 'Greeks',
      faction: 'greece',
      role: 'defender',
      slots: [
        {
          key: 'leonidas',
          name: 'Leonidas',
          title: 'The Three Hundred',
          faction: 'greece',
          deploy: 'greeks_front',
          ai: 'hold',
          pal: 0,
          dets: [
            { name: 'Spartiates', units: ['greece.spartans', 'greece.spartans', 'greece.spartans'] },
            { name: 'Helots', units: ['greece.psiloi', 'greece.peltasts'] },
          ],
        },
        {
          key: 'demophilus',
          name: 'Demophilus',
          title: 'The Thespians',
          faction: 'greece',
          deploy: 'greeks_front',
          ai: 'hold',
          dets: [
            { name: 'Thespian Hoplites', units: ['greece.hoplites', 'greece.hoplites', 'greece.hoplites'] },
            { name: 'Skirmishers', units: ['greece.peltasts'] },
          ],
        },
        {
          key: 'leontiades',
          name: 'Leontiades',
          title: 'Thebans and Arcadians',
          faction: 'greece',
          deploy: 'greeks_rear',
          ai: 'hold',
          dets: [
            { name: 'Allied Hoplites', units: ['greece.hoplites', 'greece.hoplites'] },
            { name: 'Bowmen', units: ['greece.archers', 'greece.psiloi'] },
          ],
        },
        {
          key: 'phocians',
          name: 'Hegesander',
          title: 'The Phocians',
          faction: 'greece',
          deploy: 'phocians',
          ai: 'hold',
          dets: [
            { name: 'Phocian Hoplites', units: ['greece.hoplites', 'greece.hoplites'] },
            { name: 'Mountain Scouts', units: ['greece.peltasts'] },
          ],
        },
      ],
    },
    {
      name: 'Persians',
      faction: 'persia',
      role: 'attacker',
      slots: [
        {
          key: 'medes',
          name: 'Datis',
          title: 'Medes and Cissians',
          faction: 'persia',
          deploy: 'persians',
          ai: 'zone:east_exit',
          dets: [
            { name: 'Medes', units: ['persia.levy', 'persia.levy', 'persia.levy'] },
            { name: 'Cissians', units: ['persia.levy', 'persia.levy', 'persia.takabara'] },
            { name: 'Archers', units: ['persia.archers', 'persia.archers'] },
          ],
        },
        {
          key: 'mardonius',
          name: 'Mardonius',
          title: 'The Shield-Bearers',
          faction: 'persia',
          deploy: 'persians',
          ai: 'zone:east_exit',
          dets: [
            { name: 'Sparabara', units: ['persia.sparabara', 'persia.sparabara', 'persia.sparabara'] },
            { name: 'Takabara', units: ['persia.takabara', 'persia.takabara'] },
          ],
        },
        {
          key: 'xerxes',
          name: 'Xerxes',
          title: "The King's Host",
          faction: 'persia',
          deploy: 'persians',
          ai: 'zone:east_exit',
          reserve: true,
          dets: [
            { name: 'Levies', units: ['persia.levy', 'persia.levy', 'persia.levy', 'persia.levy'] },
            { name: 'Archers', units: ['persia.archers', 'persia.archers', 'persia.sparabara'] },
          ],
        },
        {
          key: 'immortals',
          name: 'Hydarnes',
          title: 'The Immortals',
          faction: 'persia',
          deploy: 'immortals_start',
          ai: 'route:anopaea',
          reserve: true,
          dets: [
            { name: 'Immortals', units: ['persia.immortals', 'persia.immortals', 'persia.immortals'] },
            { name: 'Bowmen', units: ['persia.archers'] },
          ],
        },
      ],
    },
  ],
};
