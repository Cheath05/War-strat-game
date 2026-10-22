import type { BattleDef } from '../../../campaign/types';

// Rome against Carthage: the Punic Wars, 264-202 BC.

export const PUNIC: BattleDef[] = [
  {
    id: 'cannae',
    name: 'Cannae',
    year: '216 BC',
    place: 'Apulia, Italy',
    history:
      'Rome raised the largest army in its history to finish Hannibal on the open plain by the river Aufidus. He let his Gauls and Iberians give way in the centre while his African veterans closed on the Roman flanks and his cavalry, having routed the Roman horse, struck the legions from behind. Some fifty thousand Romans died, among them the consul Aemilius Paullus.',
    winner: 1,
    map: { id: 'battlefield', params: { g: 1, river: 2, at: 0.88, forest: 0 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          { general: 'Paullus', title: 'The Consular Legions', faction: 'rome', zone: 'south', ai: 'assault', units: 'rome.hastati*4, rome.principes*3, rome.triarii*2, rome.velites*3, rome.equites*2' },
          { general: 'Varro', title: 'The Allied Legions', faction: 'rome', zone: 'south', ai: 'assault', units: 'rome.socii*4, rome.hastati*2, rome.velites, rome.equites*2' },
        ],
      },
      {
        name: 'Carthage',
        armies: [
          { general: 'Hannibal', title: 'The Army of Italy', faction: 'carthage', zone: 'north', ai: 'defend', units: 'carthage.gauls*3, carthage.scutarii*3, carthage.libyans*4, carthage.slingers*2' },
          { general: 'Hasdrubal', title: 'The Horse', faction: 'carthage', zone: 'north', ai: 'assault', units: 'carthage.iberiancav*3, carthage.numidians*3' },
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'Your legions outnumber Hannibal two to one. Break his centre before his horsemen break your flanks.' },
      { at: 0, side: 1, tone: 'epic', text: 'Let the centre bend, not break: then close the trap on both flanks.' },
    ],
    bonus: [
      [
        { k: 'killGeneral', glory: 250 },
        { k: 'losses', pct: 40, glory: 150 },
        { k: 'general', glory: 100 },
      ],
      [
        { k: 'losses', pct: 25, glory: 200 },
        { k: 'killGeneral', glory: 150 },
        { k: 'time', min: 14, glory: 100 },
      ],
    ],
  },
];
