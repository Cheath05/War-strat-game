import type { BattleDef } from '../../../campaign/types';
import { ELEPHANTS, army, won } from './kit';

// Rome's rise beyond the Punic Wars: the conquest of Italy (295-275 BC), the Gauls, the
// Hellenistic kingdoms (197-168 BC), the Cimbri and Caesar's Gaul. Rome is side 0.

export const ROME_WARS: BattleDef[] = [
  {
    id: 'sentinum',
    name: 'Sentinum',
    year: '295 BC',
    place: 'Umbria, Italy',
    history:
      'Samnites and Gauls joined forces to stop Rome, and met two consular armies at Sentinum. The Gallic chariots broke the Roman left, until the consul Decius Mus devoted himself and the enemy to the gods below and rode to his death in their ranks. His men rallied, Fabius won on the right, and Italy was Rome\'s.',
    winner: 0,
    map: { id: 'battlefield', params: { g: 0, hills: 1, forest: 1 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Fabius', 'The First Consular Army', 'rome', 'south_e', 'rome.hastati*3, rome.principes*3, rome.triarii*2, rome.velites*2, rome.equites', { ai: 'assault' }),
          army('Decius', 'The Second Consular Army', 'rome', 'south_w', 'rome.hastati*2, rome.principes*2, rome.socii*2, rome.equites*3', { ai: 'assault' }),
        ],
      },
      {
        name: 'Samnites and Gauls',
        armies: [
          army('Gellius Egnatius', 'The Samnite Army', 'samnites', 'north_e', 'samnites.infantry*4, samnites.spearmen*2, samnites.javelinmen*2, samnites.cavalry', { ai: 'defend' }),
          army('The Senone chiefs', 'The Senones', 'gauls', 'north_w', 'gauls.warband*4, gauls.chariots*2, gauls.cavalry*2, gauls.skirmishers', { ai: 'assault' }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'Samnites and Gauls together. Your men have never faced the Gallic war chariots.' },
      { at: 300, side: -1, tone: 'epic', text: 'Decius Mus devotes himself and the enemy to the gods below, and rides alone into the Gallic ranks!' },
    ],
    bonus: [
      [won.destroy('the Gallic chariots', { types: ['gauls.chariots'] }, 200), won.kill(200), won.losses(35, 100)],
      [won.kill(200), won.general(150), won.time(15)],
    ],
  },
  {
    id: 'heraclea',
    name: 'Heraclea',
    year: '280 BC',
    place: 'southern Italy',
    history:
      "Pyrrhus of Epirus, the finest general of his age, came to defend Tarentum against Rome. The legions crossed the river Siris and fought his phalanx to a standstill, until he sent in his elephants, beasts no Roman had ever seen. The Roman horses bolted and the army broke, but Pyrrhus had lost thousands of his best men.",
    winner: 1,
    map: { id: 'battlefield', params: { g: 0, river: 1, at: 0.62, forest: 0 } },
    sides: [
      {
        name: 'Rome',
        armies: [army('Laevinus', 'The Consular Army', 'rome', 'south', 'rome.hastati*4, rome.principes*3, rome.triarii*2, rome.velites*3, rome.socii*3, rome.equites*3', { ai: 'assault' })],
      },
      {
        name: 'Epirus',
        armies: [army('Pyrrhus', 'The Army of Epirus', 'epirus', 'north', 'epirus.phalanx*3, epirus.hoplites*2, epirus.javelinmen*2, epirus.tarentines*2, epirus.companions, epirus.elephants', { ai: 'defend' })],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: "Pyrrhus waits across the Siris with a phalanx and something else: beasts no Roman has ever seen." },
      { at: 0, side: 1, tone: 'epic', text: 'Hold the Romans at the river. When the moment comes, the elephants will finish it.' },
    ],
    bonus: [
      [won.destroy('the elephants', ELEPHANTS, 200), won.kill(200), won.losses(35, 100)],
      [won.losses(25, 250), won.kill(150), won.time(15)],
    ],
  },
  {
    id: 'asculum',
    name: 'Asculum',
    year: '279 BC',
    place: 'Apulia, Italy',
    history:
      'Two days of fighting on broken, wooded ground, then on the open plain. Pyrrhus won again, but lost so many of the men he had brought from Epirus that he said: "One more such victory and we are lost." Ever since, a victory that costs too much has been called Pyrrhic.',
    winner: 1,
    map: { id: 'battlefield', params: { g: 1, forest: 2, hills: 2 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Sulpicius', 'The First Consular Army', 'rome', 'south', 'rome.hastati*3, rome.principes*3, rome.triarii*2, rome.velites*2, rome.equites*2', { ai: 'assault' }),
          army('Decius', 'The Second Consular Army', 'rome', 'south', 'rome.socii*4, rome.hastati*2, rome.velites', { ai: 'assault' }),
        ],
      },
      {
        name: 'Epirus',
        armies: [army('Pyrrhus', 'Pyrrhus and his Allies', 'epirus', 'north', 'epirus.phalanx*3, epirus.hoplites*2, epirus.elephants*2, epirus.tarentines*2, epirus.companions, samnites.infantry*2', { ai: 'assault' })],
      },
    ],
    bonus: [
      [won.destroy('the elephants', ELEPHANTS, 200), won.losses(35), won.kill(150)],
      [won.losses(25, 250), won.kill(100), won.time(15)],
    ],
  },
  {
    id: 'beneventum',
    name: 'Beneventum',
    year: '275 BC',
    place: 'Samnium, Italy',
    history:
      "Pyrrhus tried a night march through the hills to surprise Manius Curius' camp, but his men lost their way and came down tired and late. The Romans drove them off, and when a wounded elephant calf ran screaming, its mother charged into Pyrrhus' own lines. He left Italy for good.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 0, hills: 2, forest: 2, ridge: 2 } },
    sides: [
      {
        name: 'Rome',
        armies: [army('Curius', 'The Consular Army', 'rome', 'south', 'rome.hastati*3, rome.principes*3, rome.triarii*2, rome.velites*3, rome.socii*2, rome.equites', { ai: 'defend' })],
      },
      {
        name: 'Epirus',
        armies: [army('Pyrrhus', 'The Army of Epirus', 'epirus', 'north', 'epirus.phalanx*3, epirus.hoplites, epirus.javelinmen*2, epirus.elephants, epirus.tarentines, epirus.companions, epirus.agema', { ai: 'assault' })],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: "Pyrrhus' night march through the hills went astray. His men come down tired and late. Strike now." },
      { at: 150, side: -1, tone: 'epic', text: "A wounded elephant calf runs screaming through the lines, and its mother turns and charges into Pyrrhus' own army!", panic: { side: 1, cls: ['ele'] } },
    ],
    bonus: [
      [won.destroy('the elephants', ELEPHANTS, 250), won.kill(200), won.losses(30, 100)],
      [won.losses(30, 200), won.general(150), won.time(15)],
    ],
  },
  {
    id: 'telamon',
    name: 'Telamon',
    year: '225 BC',
    place: 'Etruria, Italy',
    history:
      "A great Gallic army raided deep into Italy and was marching home with its plunder when it ran into a Roman army landing from Sardinia, with another close behind. The Gauls formed up facing both ways, the naked Gaesatae in front, and were cut to pieces between the two. The consul Regulus died; Aneroestes took his own life.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 0, coast: 1, hills: 1 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Regulus', 'The Army from Sardinia', 'rome', 'south', 'rome.hastati*3, rome.principes*3, rome.triarii*2, rome.velites*2, rome.equites*2', { ai: 'assault' }),
          army('Papus', 'The Army of the North', 'rome', 'north', 'rome.hastati*3, rome.principes*2, rome.triarii, rome.velites*2, rome.equites*2', { ai: 'assault', arrive: 60 }),
        ],
      },
      {
        name: 'The Gauls',
        armies: [
          army('Aneroestes', 'The Gaesatae and Insubres', 'gauls', 'centre_s', 'gauls.warband*4, gauls.fanatics*2, gauls.nobles, gauls.chariots', { ai: 'assault' }),
          army('Concolitanus', 'The Boii and Taurisci', 'gauls', 'centre_n', 'gauls.warband*3, gauls.spearmen*2, gauls.cavalry*2, gauls.chariots', { ai: 'defend' }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'The Gauls are marching home loaded with plunder, straight into your army. And Papus is close behind them.' },
      { at: 0, side: 1, tone: 'epic', text: 'A Roman army blocks the road home, and another follows behind. Face both ways!' },
    ],
    bonus: [
      [won.destroy('the naked Gaesatae', { types: ['gauls.fanatics'] }, 200), won.kill(150), won.losses(30, 100)],
      [won.general(200), won.kill(200), won.losses(40, 100)],
    ],
  },
  {
    id: 'cynoscephalae',
    name: 'Cynoscephalae',
    year: '197 BC',
    place: 'Thessaly, Greece',
    history:
      "In thick fog, Philip V's and Flamininus' scouts collided on the hills called the Dog's Heads, and both armies were drawn in piece by piece. Philip's right wing charged downhill and drove the legions back, but his left was still forming when the Romans and their elephants struck it. An unnamed tribune took twenty maniples round behind the victorious Macedonian right, and the phalanx died where it stood.",
    winner: 0,
    fog: true,
    map: { id: 'battlefield', params: { g: 1, ridge: 1, hills: 2, hillH: 8 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Flamininus', 'The Legions', 'rome', 'south', 'rome.hastati*3, rome.principes*3, rome.triarii*2, rome.velites*2, rome.equites*2, carthage.elephants*2', { ai: 'assault' }),
          army('Phaeneas', 'The Aetolians', 'greece', 'south', 'greece.hippeis*2, greece.hoplites*2, greece.peltasts', { ai: 'assault' }),
        ],
      },
      {
        name: 'Macedon',
        armies: [
          army('Philip', 'The Right Wing', 'macedon', 'north', 'macedon.pikemen*4, thrace.peltasts*2, macedon.companions', { ai: 'assault' }),
          army('Nicanor', 'The Left Wing', 'macedon', 'north', 'macedon.pikemen*3, macedon.agrianians', { ai: 'assault', arrive: 240 }),
        ],
      },
    ],
    events: [{ at: 0, side: -1, tone: 'epic', text: "Fog lies thick over the Dog's Heads. The skirmishers have run into each other on the ridge." }],
    bonus: [
      [won.losses(25, 200), won.kill(200), won.time(15)],
      [won.kills(0.6, 150), won.general(150), won.losses(35)],
    ],
  },
  {
    id: 'magnesia',
    name: 'Magnesia',
    year: '190 BC',
    place: 'Lydia, Asia Minor',
    history:
      "Antiochus the Great brought the whole East against Rome: a deep phalanx with elephants between its files, cataphracts, scythed chariots, Galatians. Eumenes of Pergamon's archers shot down the chariot horses and turned the chariots back into their own line, and while Antiochus chased the Roman left, the rest of his army fell apart.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, river: 2, at: 0.08, forest: 0 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Domitius', 'The Legions', 'rome', 'south', 'rome.hastati*3, rome.principes*3, rome.triarii*2, rome.velites*2, rome.socii*4, rome.equites*2', { ai: 'assault' }),
          army('Eumenes', 'The Pergamenes', 'greece', 'south_e', 'greece.hippeis*3, greece.archers*2, greece.peltasts*2', { ai: 'assault' }),
        ],
      },
      {
        name: 'Seleucid Empire',
        armies: [
          army('Antiochus', 'The Royal Army', 'seleucids', 'north_e', 'seleucids.cataphracts*2, seleucids.agema, seleucids.archers, seleucids.chariots*2', { ai: 'assault' }),
          army('Seleucus', 'The Phalanx', 'seleucids', 'north_w', 'seleucids.phalangites*3, seleucids.elephants*2, seleucids.galatians*2, seleucids.thureophoroi', { ai: 'defend' }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: "Eumenes' light troops have a plan for those scythed chariots: shoot the horses." },
      { at: 70, side: -1, tone: 'epic', text: "Eumenes' archers and slingers shoot down the chariot horses: the scythed chariots turn back into Antiochus' own lines!", panic: { side: 1, cls: ['chariot'] } },
    ],
    bonus: [
      [won.destroy('the scythed chariots', { types: ['seleucids.chariots'] }), won.destroy('the elephants', ELEPHANTS, 200), won.losses(25)],
      [won.kill(200), won.kills(0.5, 100), won.general(150)],
    ],
  },
  {
    id: 'pydna',
    name: 'Pydna',
    year: '168 BC',
    place: 'Macedonia',
    history:
      "Aemilius Paullus said he had never seen anything as terrifying as the Macedonian phalanx coming on. But as it advanced over rough ground its line opened gaps, and the legionaries slipped in with their swords where the long pikes were useless. In an hour the last Macedonian army was destroyed and the kingdom of Alexander came to an end.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, river: 1, at: 0.52, hills: 2 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Paullus', 'The Legions', 'rome', 'south', 'rome.hastati*3, rome.principes*3, rome.triarii*2, rome.velites*2, rome.equites*2, carthage.elephants*2', { ai: 'defend' }),
          army('Nasica', 'The Allies', 'rome', 'south', 'rome.socii*3, rome.velites, rome.equites', { ai: 'defend' }),
        ],
      },
      {
        name: 'Macedon',
        armies: [army('Perseus', 'The Royal Army', 'macedon', 'north', 'macedon.pikemen*4, macedon.hypaspists*2, thrace.peltasts*2, macedon.archers, macedon.companions*2', { ai: 'assault' })],
      },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: 'Never meet the phalanx head on. Draw it onto broken ground and get in among the pikes.' }],
    bonus: [
      [won.losses(20, 200), won.kill(150), won.time(15)],
      [won.general(150), won.kills(0.6, 150), won.losses(35)],
    ],
  },
  {
    id: 'vercellae',
    name: 'Vercellae',
    year: '101 BC',
    place: 'northern Italy',
    history:
      "The Cimbri had beaten seven Roman armies and were pouring into Italy. Marius, with the professional legions he had reformed, chose the ground so that the dust and the noonday sun were in the barbarians' eyes. The Cimbri were annihilated and their king Boiorix died fighting.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 4, forest: 0 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Marius', 'The Legions of Marius', 'rome', 'south', 'rome.cohort*6, rome.equites*2', { ai: 'defend' }),
          army('Catulus', 'The Army of Catulus', 'rome', 'south', 'rome.cohort*4, rome.equites', { ai: 'defend' }),
        ],
      },
      {
        name: 'The Cimbri',
        armies: [army('Boiorix', 'The Cimbri', 'germans', 'north', 'germans.spearmen*6, germans.warriors*4, germans.wolves, germans.skirmishers*2, germans.cavalry*3', { ai: 'assault' })],
      },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: "The dust and the noonday sun are in the Cimbri's eyes. Marius has seen to that." }],
    bonus: [
      [won.kill(200), won.losses(15, 200), won.time(15)],
      [won.general(150), won.kill(200), won.losses(40, 100)],
    ],
  },
  {
    id: 'alesia',
    name: 'Alesia',
    year: '52 BC',
    place: 'Gaul',
    history:
      "Caesar trapped Vercingetorix in the hill fort of Alesia behind miles of walls and ditches, then built a second line facing outward when all Gaul raised an army to save him. For days the Romans fought on both lines at once. When the last assault broke on the outer wall, Vercingetorix rode out and laid his arms at Caesar's feet.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 4, walls: 1, forest: 0 } },
    victory: [{ k: 'rout' }, { k: 'timer', winner: 0, seconds: 1080 }],
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Caesar', 'The Legions', 'rome', 'between', 'rome.cohort*5, germans.cavalry*2, greece.archers', { ai: 'hold' }),
          army('Labienus', 'The Outer Line', 'rome', 'between_s', 'rome.cohort*4, rome.equites', { ai: 'hold' }),
        ],
      },
      {
        name: 'The Gauls',
        armies: [
          army('Vercingetorix', 'The Army in Alesia', 'gauls', 'north', 'gauls.warband*4, gauls.nobles*2, gauls.spearmen*2, gauls.skirmishers', { ai: 'assault' }),
          army('Vercassivellaunus', 'The Relief Army', 'gauls', 'south', 'gauls.warband*5, gauls.nobles*2, gauls.cavalry*3, gauls.skirmishers*2', { ai: 'assault', arrive: 180 }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'Vercingetorix is trapped inside your lines, and all Gaul is coming to save him. Hold both walls for eighteen minutes.' },
      { at: 0, side: 1, tone: 'epic', text: 'Our people are coming to break the siege. Attack the inner wall when they do!' },
    ],
    bonus: [
      [won.kill(250, 0, 'Vercingetorix is taken'), won.losses(30), won.general(100)],
      [won.kill(300), won.general(150), won.losses(50, 100)],
    ],
  },
];
