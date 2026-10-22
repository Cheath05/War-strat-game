import type { FactionDef } from '../types';
import { unit } from './kit';

// The Illyrians of the Adriatic coast and its mountains (c. 400-170 BC): hard-fighting
// spearmen and swordsmen with the curved sica, pirates, and the horsemen of Dardania.

const F = 'illyria';

export const ILLYRIA: FactionDef = {
  id: F,
  name: 'Illyria',
  adjective: 'Illyrian',
  desc: 'Mountain and coast people of the Adriatic: spearmen and swordsmen with the curved sica, javelinmen, Dardanian horse and pirate champions.',
  colors: [10, 3, 9, 4],
  general: 'illyria.general',
  generalNames: ['Bardylis', 'Glaukias', 'Kleitos', 'Agron', 'Pleuratus', 'Genthius'],
  units: [
    unit(F, 'warriors', 'Illyrian Warriors', 'Swordsmen with the sica, a short curved blade, and a round shield.', 'swordsman', {
      body: 'medium',
      armor: 'none',
      helmet: 'chalcidian',
      crest: 'none',
      shield: 'small',
      weapon: 'falcata',
      cloth: 'team',
      skin: 'olive',
      beard: true,
    }),
    unit(F, 'spearmen', 'Illyrian Spearmen', 'Spearmen in bronze helmets who fight in a square, as they did against Philip.', 'spearman', {
      body: 'medium',
      armor: 'leather',
      helmet: 'chalcidian',
      crest: 'long',
      shield: 'aspis',
      weapon: 'spear',
      cloth: 'team',
      skin: 'olive',
      beard: true,
    }),
    unit(F, 'javelinmen', 'Illyrian Javelinmen', 'Mountain skirmishers with a sheaf of javelins.', 'javelin', {
      body: 'light',
      armor: 'none',
      helmet: 'none',
      crest: 'none',
      shield: 'small',
      weapon: 'javelin',
      cloth: 'linen',
      skin: 'olive',
    }),
    unit(F, 'cavalry', 'Dardanian Horse', 'Horsemen from the inland mountains of Dardania.', 'cav', {
      body: 'medium',
      armor: 'leather',
      helmet: 'chalcidian',
      crest: 'none',
      shield: 'small',
      weapon: 'spear',
      cloth: 'team',
      skin: 'olive',
      beard: true,
      mount: 'horse',
    }),
    unit(
      F,
      'pirates',
      'Ardiaean Raiders',
      'Pirate champions of the Adriatic, the terror of every coast from Epirus to Italy.',
      'eliteInf',
      { body: 'heavy', armor: 'mail', helmet: 'chalcidian', crest: 'feathers', shield: 'small', weapon: 'falcata', cloth: 'dark', cape: 'team', skin: 'olive', beard: true, greaves: true, tint: { trim: 'silver', crest: 'black' } },
      { speed: 2.6, run: 5.2 },
    ),
    unit(F, 'general', "King's Guard", 'An Illyrian king and his companions.', 'general', {
      body: 'heavy',
      armor: 'bronze',
      helmet: 'chalcidian',
      crest: 'long',
      shield: 'small',
      weapon: 'spear',
      cloth: 'team',
      cape: 'team',
      skin: 'olive',
      beard: true,
      mount: 'horse',
      tint: { trim: 'gold' },
    }),
  ],
};
