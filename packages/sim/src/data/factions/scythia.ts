import type { FactionDef } from '../types';
import { unit } from './kit';

// The Scythians of the Pontic steppe (c. 600-300 BC): a nation of horse archers who would not
// stand to be caught, and gilded nobles who rode down whatever their arrows had broken.

const F = 'scythia';

export const SCYTHIA: FactionDef = {
  id: F,
  name: 'Scythia',
  adjective: 'Scythian',
  desc: 'Riders of the steppe: swarms of horse archers, nobles in scale with bow and spear, foot archers and axemen, and the Royal Scyths in gold.',
  colors: [4, 9, 6, 7],
  general: 'scythia.general',
  generalNames: ['Idanthyrsus', 'Scopasis', 'Taxacis', 'Ateas', 'Spargapises', 'Tomyris'],
  units: [
    unit(F, 'horsearchers', 'Scythian Horse Archers', 'Born in the saddle: they shoot as they ride away and never let an army catch them.', 'horseArcher', {
      body: 'light',
      armor: 'leather',
      helmet: 'hood',
      crest: 'none',
      shield: 'none',
      weapon: 'bow',
      cloth: 'team',
      skin: 'olive',
      beard: true,
      mount: 'horse',
    }),
    unit(
      F,
      'nobles',
      'Noble Cavalry',
      'Nobles in scale armour with bow, spear and battle-axe: they shoot first, then charge.',
      'heavyCav',
      { body: 'heavy', armor: 'scale', helmet: 'conical', crest: 'none', shield: 'pelte', weapon: 'spear', cloth: 'team', skin: 'olive', beard: true, mount: 'darkhorse' },
      { cost: 880, missile: { kind: 'arrow', range: 60, ammo: 8, dmg: 18, ap: 5, reload: 3.2, acc: 0.6, onMove: true } },
    ),
    unit(F, 'footarchers', 'Foot Archers', 'Commoners with the deadly Scythian bow.', 'archer', {
      body: 'light',
      armor: 'none',
      helmet: 'hood',
      crest: 'none',
      shield: 'none',
      weapon: 'bow',
      cloth: 'linen',
      skin: 'olive',
      beard: true,
    }),
    unit(
      F,
      'axemen',
      'Sagaris Axemen',
      'Warriors with the sagaris, the long-hafted steppe battle-axe that splits helmets.',
      'swordsman',
      { body: 'medium', armor: 'leather', helmet: 'hood', crest: 'none', shield: 'pelte', weapon: 'axe', cloth: 'team', skin: 'olive', beard: true },
      { ap: 12, cost: 480 },
    ),
    unit(F, 'spearmen', 'Steppe Spearmen', 'Herdsmen and farmers of the settled lands, called up to hold the line.', 'levy', {
      body: 'light',
      armor: 'none',
      helmet: 'hood',
      crest: 'none',
      shield: 'spara',
      weapon: 'spear',
      cloth: 'linen',
      skin: 'olive',
      beard: true,
    }),
    unit(
      F,
      'royal',
      'Royal Scyths',
      'The ruling horde, who held all other Scythians as their slaves: horse archers in gold scale, as deadly with the axe as the bow.',
      'eliteCav',
      { body: 'heavy', armor: 'scale', helmet: 'conical', crest: 'none', shield: 'none', weapon: 'bow', cloth: 'team', cape: 'team', skin: 'olive', beard: true, mount: 'horse', tint: { armor: 'gold', helm: 'gold', trim: 'gold' } },
      { cls: 'hacav', missile: { kind: 'arrow', range: 75, ammo: 20, dmg: 22, ap: 7, reload: 2.8, acc: 0.66, onMove: true }, speed: 4.6, run: 11.5 },
    ),
    unit(F, 'general', "King's Riders", 'A king of the Scythians and his noble horsemen.', 'general', {
      body: 'heavy',
      armor: 'scale',
      helmet: 'conical',
      crest: 'none',
      shield: 'pelte',
      weapon: 'bow',
      cloth: 'team',
      cape: 'team',
      skin: 'olive',
      beard: true,
      mount: 'horse',
      tint: { helm: 'gold', trim: 'gold' },
    }),
  ],
};
