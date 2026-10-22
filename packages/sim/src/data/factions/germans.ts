import type { FactionDef } from '../types';
import { unit } from './kit';

// The Cimbri and Teutones (113-101 BC): whole peoples on the march from the North Sea, who
// beat seven Roman armies before Marius stopped them.

const F = 'germans';

export const GERMANS: FactionDef = {
  id: F,
  name: 'Germanic Tribes',
  adjective: 'Germanic',
  desc: 'The Cimbri and Teutones: tall spearmen and axemen in great masses, fearless wolf warriors, and horsemen who fight among runners on foot.',
  colors: [6, 3, 4, 9],
  general: 'germans.general',
  generalNames: ['Boiorix', 'Teutobod', 'Lugius', 'Claodicus', 'Caesorix', 'Ariovistus'],
  units: [
    unit(
      F,
      'spearmen',
      'Spear Warriors',
      'Freemen with the framea, a spear for thrusting or throwing, and a big wooden shield.',
      'levy',
      { body: 'medium', armor: 'none', helmet: 'none', crest: 'none', shield: 'oval', weapon: 'spear', cloth: 'dark', skin: 'light', hair: 'fair', beard: true },
      { size: 28, cost: 330, hp: 72, atk: 26, def: 26, armor: 10, shield: 40, morale: 48 },
    ),
    unit(F, 'warriors', 'Axe Warriors', 'Warriors with axes and clubs who crash into the enemy line in a dense wedge.', 'warband', {
      body: 'medium',
      armor: 'none',
      helmet: 'none',
      crest: 'none',
      shield: 'oval',
      weapon: 'axe',
      cloth: 'team',
      skin: 'light',
      hair: 'auburn',
      beard: true,
    }),
    unit(F, 'skirmishers', 'Javelin Throwers', 'Youths who pelt the enemy with javelins and stones before the warriors close.', 'javelin', {
      body: 'light',
      armor: 'none',
      helmet: 'none',
      crest: 'none',
      shield: 'small',
      weapon: 'javelin',
      cloth: 'linen',
      skin: 'light',
      hair: 'fair',
    }),
    unit(
      F,
      'cavalry',
      'Germanic Horse',
      'Riders on small, tough horses, fighting with runners on foot among them.',
      'cav',
      { body: 'light', armor: 'none', helmet: 'none', crest: 'none', shield: 'oval', weapon: 'spear', cloth: 'team', skin: 'light', hair: 'fair', beard: true, mount: 'darkhorse' },
      { armor: 16, cost: 560, morale: 50 },
    ),
    unit(
      F,
      'wolves',
      'Wolf Warriors',
      'Champions in wolf skins who fight in a frenzy, feeling no wounds. Even their own people fear them.',
      'eliteInf',
      { body: 'heavy', armor: 'none', helmet: 'wolfpelt', crest: 'none', shield: 'none', weapon: 'axe', cloth: 'bare', skin: 'light', hair: 'fair', beard: true },
      { size: 18, cost: 1550, armor: 16, shield: 0, def: 40, atk: 64, dmg: 44, ap: 16, charge: 30, terror: 8, speed: 2.7, run: 5.4 },
    ),
    unit(F, 'general', "Chieftain's Retinue", 'A war-king of the Cimbri and his sworn horsemen.', 'general', {
      body: 'heavy',
      armor: 'mail',
      helmet: 'none',
      crest: 'none',
      shield: 'oval',
      weapon: 'sword',
      cloth: 'team',
      cape: 'team',
      skin: 'light',
      hair: 'fair',
      beard: true,
      mount: 'horse',
      tint: { trim: 'gold' },
    }),
  ],
};
