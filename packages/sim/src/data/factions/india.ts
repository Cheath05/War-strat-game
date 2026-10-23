import type { FactionDef } from '../types';
import { unit } from './kit';

// The Paurava kingdom of the Punjab under Porus (326 BC): longbowmen, broadswords, heavy
// chariots and a wall of war elephants, with the king himself on the greatest of them.

const F = 'india';

export const INDIA: FactionDef = {
  id: F,
  name: 'India',
  adjective: 'Indian',
  desc: 'The armies of the Punjab: longbowmen whose arrows pierce shield and breastplate, swordsmen with two-handed broadswords, chariots and war elephants in their hundreds.',
  colors: [7, 11, 4, 3],
  general: 'india.general',
  generalNames: ['Porus', 'Spitaces', 'Malayaketu', 'Abisares', 'Chandragupta'],
  units: [
    unit(
      F,
      'longbowmen',
      'Longbowmen',
      'Bows as tall as a man, braced against the ground with the foot: "nothing withstands an arrow shot by an Indian archer, neither shield nor breastplate" (Arrian).',
      'archer',
      { body: 'light', armor: 'none', helmet: 'turban', crest: 'none', shield: 'none', weapon: 'bow', cloth: 'linen', skin: 'tan', beard: true },
      { size: 20, cost: 480, missile: { kind: 'arrow', range: 90, ammo: 14, dmg: 30, ap: 12, reload: 4, acc: 0.64 } },
    ),
    unit(
      F,
      'swordsmen',
      'Indian Swordsmen',
      'Warriors with broad two-handed swords and a buckler of oxhide.',
      'swordsman',
      { body: 'medium', armor: 'quilted', helmet: 'turban', crest: 'none', shield: 'small', weapon: 'sword', cloth: 'team', skin: 'tan', beard: true },
      { dmg: 34, ap: 10, cost: 480 },
    ),
    unit(F, 'spearmen', 'Indian Spearmen', 'Spearmen from the villages of the Punjab.', 'levy', {
      body: 'light',
      armor: 'none',
      helmet: 'turban',
      crest: 'none',
      shield: 'spara',
      weapon: 'spear',
      cloth: 'linen',
      skin: 'tan',
      beard: true,
    }),
    unit(
      F,
      'chariots',
      'Indian Chariots',
      'Heavy chariots drawn by four horses, carrying archers and shield-bearers. At the Hydaspes the rain-soaked mud bogged them down.',
      'archerChariot',
      { body: 'medium', armor: 'quilted', helmet: 'turban', crest: 'none', shield: 'none', weapon: 'bow', cloth: 'team', skin: 'tan', beard: true, mount: 'chariot' },
      { hp: 260, armor: 28, charge: 44, mass: 14, cost: 760, speed: 4, run: 10.5 },
    ),
    unit(F, 'cavalry', 'Indian Cavalry', 'Riders with two javelins and a small shield.', 'lightCav', {
      body: 'light',
      armor: 'quilted',
      helmet: 'turban',
      crest: 'none',
      shield: 'small',
      weapon: 'javelin',
      cloth: 'team',
      skin: 'tan',
      beard: true,
      mount: 'horse',
    }),
    unit(
      F,
      'elephants',
      'War Elephants',
      'Great beasts of the Punjab with archers and javelinmen on their backs. No horse will face them.',
      'elephant',
      { body: 'light', armor: 'quilted', helmet: 'turban', crest: 'none', shield: 'none', weapon: 'bow', cloth: 'team', skin: 'tan', mount: 'elephant' },
      { hp: 1000, missile: { kind: 'arrow', range: 60, ammo: 10, dmg: 24, ap: 8, reload: 3.6, acc: 0.6, onMove: true } },
    ),
    unit(
      F,
      'royal',
      'Royal Elephants',
      'The king\'s own elephants, the biggest in the Punjab, armoured and hung with gold.',
      'elephant',
      { body: 'heavy', armor: 'scale', helmet: 'turban', crest: 'none', shield: 'none', weapon: 'bow', cloth: 'team', skin: 'tan', mount: 'elephant', tint: { armor: 'gold', trim: 'gold' } },
      { elite: true, size: 4, cost: 2000, hp: 1300, armor: 60, morale: 80, terror: 18, abilities: ['inspire'], missile: { kind: 'arrow', range: 65, ammo: 12, dmg: 26, ap: 9, reload: 3.4, acc: 0.62, onMove: true } },
    ),
    unit(
      F,
      'general',
      "Porus' Elephant",
      'Porus, a giant of a man, on the greatest elephant of all, with his guard around him.',
      'general',
      { body: 'heavy', armor: 'scale', helmet: 'crown', crest: 'none', shield: 'none', weapon: 'javelin', cloth: 'team', skin: 'tan', beard: true, mount: 'elephant', tint: { armor: 'gold', trim: 'gold' } },
      { cls: 'ele', size: 2, hp: 1400, atk: 42, def: 22, armor: 56, dmg: 62, ap: 25, cd: 1.6, reach: 3.2, charge: 70, mass: 30, speed: 3.2, run: 6.5, radius: 1.8, large: true, mounted: undefined, terror: 16, forms: ['line', 'loose'] },
    ),
  ],
};
