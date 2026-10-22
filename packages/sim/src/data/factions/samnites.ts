import type { FactionDef } from '../types';
import { unit } from './kit';

// The Samnites of the southern Apennines (c. 340-290 BC): hill people who fought Rome for
// fifty years, with feathered helmets, broad belts and the oblong shield Rome borrowed.

const F = 'samnites';

export const SAMNITES: FactionDef = {
  id: F,
  name: 'Samnites',
  adjective: 'Samnite',
  desc: "Rome's toughest Italian enemy: mountain infantry with javelins and long shields, feathered helmets, and the sworn Linen Legion.",
  colors: [5, 7, 3, 10],
  general: 'samnites.general',
  generalNames: ['Gellius Egnatius', 'Gaius Pontius', 'Statius Gellius', 'Papius Mutilus', 'Herennius'],
  units: [
    unit(
      F,
      'infantry',
      'Samnite Infantry',
      'Mountain swordsmen in bronze breastplates with two feathers on the helmet: they throw their javelins, then close behind long shields.',
      'swordsman',
      { body: 'medium', armor: 'bronze', helmet: 'attic', crest: 'feathers', shield: 'scutum', weapon: 'sword', cloth: 'team', skin: 'olive', beard: true, greaves: true },
      { cost: 500, armor: 36, morale: 56, missile: { kind: 'javelin', range: 24, ammo: 2, dmg: 30, ap: 12, reload: 2.5, acc: 0.74 } },
    ),
    unit(F, 'spearmen', 'Samnite Spearmen', 'A steady line of spears behind round shields.', 'spearman', {
      body: 'medium',
      armor: 'linen',
      helmet: 'attic',
      crest: 'feathers',
      shield: 'aspis',
      weapon: 'spear',
      cloth: 'team',
      skin: 'olive',
      beard: true,
    }),
    unit(F, 'javelinmen', 'Lucanian Javelinmen', 'Light troops from the hills of Lucania, quick and hard to pin down.', 'javelin', {
      body: 'light',
      armor: 'none',
      helmet: 'none',
      crest: 'none',
      shield: 'small',
      weapon: 'javelin',
      cloth: 'linen',
      skin: 'olive',
    }),
    unit(F, 'cavalry', 'Samnite Cavalry', 'Horsemen of the Samnite nobility, with spears and feathered helmets.', 'cav', {
      body: 'medium',
      armor: 'bronze',
      helmet: 'attic',
      crest: 'feathers',
      shield: 'parma',
      weapon: 'spear',
      cloth: 'team',
      skin: 'olive',
      mount: 'horse',
    }),
    unit(
      F,
      'linen',
      'Linen Legion',
      'Picked men sworn to the death in a sanctuary walled with linen before Aquilonia, in white tunics and silver-plumed helmets. None may flee.',
      'eliteInf',
      { body: 'heavy', armor: 'linen', helmet: 'attic', crest: 'feathers', shield: 'scutum', weapon: 'sword', cloth: 'linen', skin: 'olive', beard: true, greaves: true, tint: { cloth: 'white', crest: 'white', shield: 'white', trim: 'silver' } },
      { missile: { kind: 'javelin', range: 24, ammo: 2, dmg: 34, ap: 14, reload: 2.5, acc: 0.76 } },
    ),
    unit(F, 'general', "Meddix's Guard", 'The meddix tuticus, chief magistrate of the Samnites, and his riders.', 'general', {
      body: 'heavy',
      armor: 'bronze',
      helmet: 'attic',
      crest: 'feathers',
      shield: 'parma',
      weapon: 'sword',
      cloth: 'team',
      cape: 'team',
      skin: 'olive',
      beard: true,
      mount: 'darkhorse',
    }),
  ],
};
