import type { FactionDef } from '../types';
import { unit } from './kit';

// The Iberians, Celtiberians and Lusitanians of Spain (c. 240-130 BC): the falcata, the
// caetra, the javelin, and men sworn never to outlive their chief.

const F = 'iberia';

export const IBERIA: FactionDef = {
  id: F,
  name: 'Iberia',
  adjective: 'Iberian',
  desc: 'The peoples of Spain: quick caetrati, Celtiberian swordsmen with the falcata, Lusitanian javelinmen, slingers and fine horsemen.',
  colors: [9, 6, 4, 5],
  general: 'iberia.general',
  generalNames: ['Indibilis', 'Mandonius', 'Viriathus', 'Istolatios', 'Indortes', 'Orissus'],
  units: [
    unit(
      F,
      'caetrati',
      'Caetrati',
      'Light infantry with the small round caetra, a falcata and javelins: they fight in the open and in ambush.',
      'swordsman',
      { body: 'light', armor: 'none', helmet: 'headband', crest: 'none', shield: 'small', weapon: 'falcata', cloth: 'linen', skin: 'olive' },
      { cost: 360, armor: 14, shield: 30, speed: 2.5, run: 5, missile: { kind: 'javelin', range: 26, ammo: 3, dmg: 26, ap: 10, reload: 2.6, acc: 0.72 } },
    ),
    unit(
      F,
      'scutarii',
      'Celtiberian Scutarii',
      'Swordsmen with long shields and the falcata, which cuts through shield and helmet alike.',
      'swordsman',
      { body: 'medium', armor: 'linen', helmet: 'montefortino', crest: 'none', shield: 'thureos', weapon: 'falcata', cloth: 'team', skin: 'olive', beard: true },
      { cost: 480, ap: 10, missile: { kind: 'javelin', range: 24, ammo: 2, dmg: 32, ap: 14, reload: 2.5, acc: 0.74 } },
    ),
    unit(F, 'lusitanians', 'Lusitanian Javelinmen', 'Mountain raiders from the far west, who wore down legion after legion.', 'javelin', {
      body: 'light',
      armor: 'none',
      helmet: 'none',
      crest: 'none',
      shield: 'small',
      weapon: 'javelin',
      cloth: 'dark',
      skin: 'olive',
      beard: true,
    }),
    unit(F, 'slingers', 'Iberian Slingers', 'Slingers from the coasts and islands.', 'slinger', {
      body: 'light',
      armor: 'none',
      helmet: 'none',
      crest: 'none',
      shield: 'none',
      weapon: 'sling',
      cloth: 'linen',
      skin: 'tan',
    }),
    unit(F, 'cavalry', 'Iberian Horse', 'Riders who charge with the falcata and the javelin, and dismount to fight if need be.', 'cav', {
      body: 'medium',
      armor: 'linen',
      helmet: 'montefortino',
      crest: 'plume',
      shield: 'small',
      weapon: 'falcata',
      cloth: 'team',
      skin: 'olive',
      mount: 'horse',
    }),
    unit(
      F,
      'soldurii',
      'Soldurii',
      'Warriors bound by a sacred oath to their chief: if he falls, they fight to the last or die by their own hand.',
      'eliteInf',
      { body: 'heavy', armor: 'mail', helmet: 'montefortino', crest: 'plume', shield: 'thureos', weapon: 'falcata', cloth: 'dark', cape: 'team', skin: 'olive', beard: true, greaves: true, tint: { shield: 'black', crest: 'red', trim: 'silver' } },
      {},
    ),
    unit(F, 'general', "Chieftain's Horse", 'A war chief and his sworn riders.', 'general', {
      body: 'heavy',
      armor: 'mail',
      helmet: 'montefortino',
      crest: 'plume',
      shield: 'small',
      weapon: 'falcata',
      cloth: 'team',
      cape: 'team',
      skin: 'olive',
      beard: true,
      mount: 'darkhorse',
      tint: { trim: 'silver' },
    }),
  ],
};
