import type { BattleDef } from '../../../campaign/types';
import { ELEPHANTS, army, won } from './kit';

// Carthage's wars: against the Greeks of Sicily (480-341 BC), and against Rome in the Punic
// Wars (264-202 BC), with the Mercenary War and the conquest of Spain between them. Rome is
// side 0 against Carthage; Carthage is side 0 against everyone else.

export const PUNIC: BattleDef[] = [
  {
    id: 'himera',
    name: 'Himera',
    year: '480 BC',
    place: 'Sicily',
    history:
      'Hamilcar brought a great army to Sicily and camped by the sea before Himera. Gelon of Syracuse learnt that Carthage expected horsemen from its ally Selinus, and sent his own riders to the camp in their place. Once inside they fired the fleet and killed Hamilcar, and the Greeks broke the leaderless army.',
    winner: 1,
    map: { id: 'battlefield', params: { g: 1, coast: 4, river: 2, at: 0.86 } },
    sides: [
      {
        name: 'Carthage',
        armies: [army('Hamilcar', 'The Army of Sicily', 'carthage', 'north', 'carthage.libyans*5, carthage.scutarii*3, carthage.gauls*3, carthage.slingers*2, carthage.iberiancav*2', { ai: 'defend' })],
      },
      {
        name: 'Syracuse',
        armies: [
          army('Gelon', 'The Army of Syracuse', 'greece', 'south', 'greece.hoplites*4, greece.hippeis*2, greece.archers, greece.psiloi*2', { ai: 'assault' }),
          army('Theron', 'The Army of Akragas', 'greece', 'south', 'greece.hoplites*2, greece.peltasts*2', { ai: 'assault' }),
          army('Chromius', 'The "Horsemen of Selinus"', 'greece', 'north', 'greece.hippeis*2', { ai: 'assault', arrive: 200 }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'Horsemen from your ally Selinus are expected at the camp today. Hold the Greeks until they come.' },
      { at: 0, side: 1, tone: 'epic', text: 'Chromius and our riders will reach the Carthaginian camp posing as allies from Selinus. Keep Hamilcar busy until then.' },
      { at: 200, side: 0, tone: 'bad', text: "The horsemen from Selinus are Gelon's men! They are in the camp, firing the ships!" },
    ],
    bonus: [
      [won.general(250, 'Hamilcar survives: history changes'), won.losses(35), won.time(15)],
      [won.kill(250), won.losses(25), won.time(12)],
    ],
  },
  {
    id: 'crimisus',
    name: 'The Crimisus',
    year: '341 BC',
    place: 'Sicily',
    history:
      'A Carthaginian army of seventy thousand marched to crush Timoleon of Syracuse, who met it with a fraction of the men as it crossed the river Crimisus. A storm of hail broke in the Carthaginians\' faces, the river rose behind them, and the Sacred Band of Carthage, its finest citizens, died almost to a man.',
    winner: 1,
    map: { id: 'battlefield', params: { g: 1, river: 1, at: 0.42, forest: 1, hills: 1 } },
    sides: [
      {
        name: 'Carthage',
        armies: [
          army('Hasdrubal', 'The Army of Sicily', 'carthage', 'north', 'carthage.sacredband*3, carthage.libyans*3, persia.chariots*2, carthage.iberiancav, carthage.slingers', { ai: 'assault' }),
          army('Hamilcar', 'The Mercenaries', 'carthage', 'north', 'carthage.gauls*3, carthage.scutarii*2', { ai: 'assault', arrive: 90 }),
        ],
      },
      {
        name: 'Syracuse',
        armies: [
          army('Timoleon', 'The Army of Syracuse', 'greece', 'south', 'greece.hoplites*5, greece.hippeis*2, greece.peltasts*2', { ai: 'assault' }),
          army('Demaretus', 'The Mercenaries', 'greece', 'south', 'greece.hoplites*2, greece.peltasts', { ai: 'assault' }),
        ],
      },
    ],
    events: [
      { at: 0, side: 1, tone: 'epic', text: 'The Carthaginians are crossing the Crimisus. Strike before they are all over!' },
      { at: 0, side: 0, tone: 'epic', text: 'Cross the river and form up. Half the army is still on the far bank.' },
      { at: 150, side: -1, tone: 'epic', text: "A storm breaks over the battlefield: hail and rain drive into the Carthaginians' faces." },
    ],
    bonus: [
      [won.kill(200), won.general(150), won.losses(35)],
      [won.destroy('the Sacred Band', { types: ['carthage.sacredband'] }, 250), won.losses(25), won.time(14)],
    ],
  },
  {
    id: 'agrigentum',
    name: 'Agrigentum',
    year: '262 BC',
    place: 'Sicily',
    history:
      "Rome's first great siege: two consular armies starved Agrigentum for months, until Hanno came from Carthage with a relief army and war elephants. After weeks of skirmishing he offered battle; the legions broke his line, his elephants fled, and the city fell.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, hills: 2 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Postumius', 'The Consular Army', 'rome', 'south', 'rome.hastati*3, rome.principes*3, rome.triarii*2, rome.velites*2, rome.equites', { ai: 'assault' }),
          army('Mamilius', 'The Allied Legions', 'rome', 'south', 'rome.socii*3, rome.velites, rome.equites', { ai: 'assault' }),
        ],
      },
      {
        name: 'Carthage',
        armies: [army('Hanno', 'The Relief Army', 'carthage', 'north', 'carthage.libyans*3, carthage.scutarii*2, carthage.gauls*2, carthage.slingers, carthage.elephants*3, carthage.numidians*2', { ai: 'assault' })],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: "Hanno's relief army has come to break the siege. Beat it, and Agrigentum falls." },
      { at: 0, side: 1, tone: 'epic', text: "Drive the Romans from Agrigentum's walls, and the city is saved." },
    ],
    bonus: [
      [won.destroy('the war elephants', ELEPHANTS, 200), won.losses(35), won.general(100)],
      [won.kill(200), won.losses(30), won.time(15)],
    ],
  },
  {
    id: 'bagradas',
    name: 'The Bagradas',
    year: '255 BC',
    place: 'near Tunis, Africa',
    history:
      'Regulus had invaded Africa and Carthage seemed lost, until a Spartan mercenary, Xanthippus, took its army in hand. He brought it down from the hills onto the open plain, where a hundred elephants trampled the legions and the cavalry closed round them. Regulus was taken prisoner.',
    winner: 1,
    map: { id: 'battlefield', params: { g: 1 } },
    sides: [
      {
        name: 'Rome',
        armies: [army('Regulus', 'The Army of Africa', 'rome', 'south', 'rome.hastati*4, rome.principes*3, rome.triarii*2, rome.velites*2, rome.equites', { ai: 'assault' })],
      },
      {
        name: 'Carthage',
        armies: [
          army('Xanthippus', 'The Army of Carthage', 'carthage', 'north', 'carthage.elephants*4, carthage.libyans*4, carthage.iberiancav*2, carthage.numidians*2, carthage.slingers', { ai: 'assault' }),
          army('Hasdrubal', 'The Mercenaries', 'carthage', 'north', 'greece.hoplites*2, carthage.gauls*2', { ai: 'assault' }),
        ],
      },
    ],
    events: [{ at: 0, side: 1, tone: 'epic', text: 'Xanthippus the Spartan has drilled your army. On open ground, let the elephants and horse do the work.' }],
    bonus: [
      [won.destroy('the war elephants', ELEPHANTS, 250), won.general(150), won.losses(40, 100)],
      [won.kill(200, 0, 'Regulus is taken'), won.losses(20), won.time(12)],
    ],
  },
  {
    id: 'thesaw',
    name: 'The Saw',
    year: '238 BC',
    place: 'Africa',
    history:
      "After the war with Rome, Carthage could not pay its mercenaries, and they rose against it. Hamilcar Barca, with the help of the Numidian prince Naravas, drove the rebel army into a gorge called the Saw and starved it there until it came out to die.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, pass: 140 } },
    sides: [
      {
        name: 'Carthage',
        armies: [
          army('Hamilcar', 'The Army of Carthage', 'carthage', 'south', 'carthage.libyans*2, carthage.sacredband*2, carthage.numidians*2, carthage.elephants*2, carthage.slingers', { ai: 'assault' }),
          army('Naravas', 'The Numidian Horse', 'carthage', 'south', 'carthage.numidians*3', { ai: 'assault' }),
        ],
      },
      {
        name: 'The Mercenaries',
        armies: [army('Spendius', 'The Rebel Army', 'carthage', 'north', 'carthage.libyans*3, carthage.gauls*4, carthage.scutarii*2, carthage.slingers*2', { ai: 'defend' })],
      },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: 'The rebels are trapped in the Saw, starving. Finish them before they can break out.' }],
    bonus: [
      [won.losses(25), won.kill(150), won.time(15)],
      [won.kill(250), won.general(150), won.losses(40, 100)],
    ],
  },
  {
    id: 'helike',
    name: 'Helike',
    year: '228 BC',
    place: 'Spain',
    history:
      "Hamilcar Barca was conquering Spain for Carthage when the Oretani, who had come to him as allies, turned on him at the siege of Helike. Covering the escape of his sons Hannibal and Hasdrubal, he drew the pursuit after himself and drowned crossing a river.",
    winner: 1,
    map: { id: 'battlefield', params: { g: 1, river: 1, at: 0.84, hills: 1 } },
    sides: [
      {
        name: 'Carthage',
        armies: [army('Hamilcar', 'The Army of Iberia', 'carthage', 'centre', 'carthage.libyans*3, carthage.scutarii*2, carthage.numidians*2, carthage.elephants*2, carthage.slingers', { ai: 'defend' })],
      },
      {
        name: 'The Oretani',
        armies: [army('Orissus', 'The Oretani', 'iberia', 'north', 'iberia.caetrati*6, iberia.scutarii*3, iberia.slingers*2, iberia.cavalry*4', { ai: 'assault' })],
      },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: 'The Oretani came as friends. Now they turn on you, with the river at your back.' }],
    bonus: [
      [won.general(250, 'Hamilcar survives: history changes'), won.losses(35), won.time(15)],
      [won.kill(250), won.time(12), won.losses(30)],
    ],
  },
  {
    id: 'ticinus',
    name: 'The Ticinus',
    year: '218 BC',
    place: 'northern Italy',
    history:
      "The first clash with Hannibal in Italy was a cavalry fight. The consul Publius Scipio rode out with his horse and javelinmen; Hannibal's heavy cavalry held them in front while his Numidians swept round behind. Scipio was badly wounded and was saved by his seventeen-year-old son, the future Africanus.",
    winner: 1,
    map: { id: 'battlefield', params: { g: 4 } },
    sides: [
      { name: 'Rome', armies: [army('Scipio', "The Consul's Horse", 'rome', 'south', 'rome.equites*4, rome.velites*3', { ai: 'assault' })] },
      { name: 'Carthage', armies: [army('Hannibal', 'The Horse', 'carthage', 'north', 'carthage.iberiancav*3, carthage.numidians*4', { ai: 'assault' })] },
    ],
    bonus: [
      [won.general(200, 'Scipio survives unwounded'), won.losses(40, 100), won.kills(0.6, 100)],
      [won.kill(200), won.time(8), won.losses(20)],
    ],
  },
  {
    id: 'trebia',
    name: 'The Trebia',
    year: '218 BC',
    place: 'northern Italy',
    history:
      "On a freezing December morning Hannibal's Numidians lured the consul Sempronius across the icy Trebia before his men had eaten. While the cold, wet legions fought Hannibal's line, his brother Mago burst from a hidden stream bed behind them with two thousand picked men.",
    winner: 1,
    map: { id: 'battlefield', params: { g: 0, river: 1, at: 0.62, ravine: 1, forest: 0 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Sempronius', 'The Consular Armies', 'rome', 'south', 'rome.hastati*5, rome.principes*3, rome.triarii*2, rome.velites*3, rome.socii*3, rome.equites*3', { ai: 'assault' }),
        ],
      },
      {
        name: 'Carthage',
        armies: [
          army('Hannibal', 'The Army of Italy', 'carthage', 'north', 'carthage.libyans*3, carthage.gauls*3, carthage.scutarii*2, carthage.slingers*2, carthage.elephants*2, carthage.iberiancav*2, carthage.numidians*2', { ai: 'defend' }),
          army('Mago', 'The Ambush', 'carthage', 'ravine', 'carthage.numidians*2, carthage.scutarii*2', { ai: 'assault', arrive: 180 }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: "Hannibal's Numidians have lured you out at dawn, across the freezing Trebia, before breakfast. Break his line before the cold breaks you." },
      { at: 0, side: 1, tone: 'epic', text: "Mago's two thousand wait in the stream bed. Hold the Romans until they spring the trap." },
    ],
    bonus: [
      [won.kill(250), won.losses(40), won.general(100)],
      [won.losses(15, 200), won.kill(150), won.time(12)],
    ],
  },
  {
    id: 'trasimene',
    name: 'Lake Trasimene',
    year: '217 BC',
    place: 'Etruria, Italy',
    history:
      "The consul Flaminius chased Hannibal along the north shore of Lake Trasimene, into a narrow strip between the water and the hills, in a thick morning mist. Hannibal's army was waiting on the hills above. Fifteen thousand Romans died in three hours, many driven into the lake, and Flaminius was cut down by a Gallic horseman.",
    winner: 1,
    fog: true,
    map: { id: 'battlefield', params: { g: 0, lake: 3, ridge: 2, hillH: 9, forest: 1 } },
    sides: [
      {
        name: 'Rome',
        armies: [army('Flaminius', 'The Consular Army', 'rome', 'south', 'rome.hastati*4, rome.principes*3, rome.triarii*2, rome.velites*2, rome.socii*4, rome.equites*2', { ai: 'defend' })],
      },
      {
        name: 'Carthage',
        armies: [
          army('Hannibal', 'The Army of Italy', 'carthage', 'north_e', 'carthage.libyans*3, carthage.scutarii*3, carthage.slingers*2', { ai: 'assault' }),
          army('Ducarius', 'The Gauls', 'gauls', 'north_w', 'gauls.warband*3, gauls.cavalry*2', { ai: 'assault' }),
          army('Maharbal', 'The Horse', 'carthage', 'west', 'carthage.numidians*2, carthage.iberiancav', { ai: 'assault', arrive: 40 }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'Morning mist hides the hills above the lake. Something moves up there...' },
      { at: 30, side: 0, tone: 'bad', text: "War cries on every side! Hannibal's army pours down from the hills." },
      { at: 0, side: 1, tone: 'epic', text: 'The Romans march into the mist along the shore. Fall on them from every side and drive them into the lake.' },
    ],
    bonus: [
      [won.general(200, 'Flaminius survives'), won.losses(50), won.kills(0.6, 100)],
      [won.kill(200), won.losses(10, 200), won.time(10)],
    ],
  },
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
          army('Paullus', 'The Consular Legions', 'rome', 'south', 'rome.hastati*4, rome.principes*3, rome.triarii*2, rome.velites*3, rome.equites*2', { ai: 'assault' }),
          army('Varro', 'The Allied Legions', 'rome', 'south', 'rome.socii*3, rome.hastati*2, rome.velites, rome.equites', { ai: 'assault' }),
        ],
      },
      {
        name: 'Carthage',
        armies: [
          army('Hannibal', 'The Army of Italy', 'carthage', 'north', 'carthage.gauls*4, carthage.scutarii*4, carthage.libyans*6, carthage.slingers*2, carthage.numidians*2', { ai: 'defend' }),
          army('Hasdrubal', 'The Horse', 'carthage', 'east', 'carthage.iberiancav*4, carthage.numidians*2', { ai: 'assault', arrive: 90 }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'The largest army Rome has ever raised. Break Hannibal\'s centre before his horsemen break your flanks.' },
      { at: 0, side: 1, tone: 'epic', text: 'Let the centre bend, not break. Hasdrubal will rout the Roman horse and come round on their flank.' },
    ],
    bonus: [
      [won.kill(250), won.losses(40), won.general(100)],
      [won.losses(25, 200), won.kill(150), won.time(14)],
    ],
  },
  {
    id: 'metaurus',
    name: 'The Metaurus',
    year: '207 BC',
    place: 'Umbria, Italy',
    history:
      "Hasdrubal Barca crossed the Alps to bring his brother Hannibal a second army. The consul Claudius Nero slipped away from Hannibal in the south with seven thousand men, marched the length of Italy in a week, and joined his colleague Livius. In the battle Nero swung his men round behind the hills onto Hasdrubal's flank. Hasdrubal died sword in hand.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 0, river: 2, at: 0.1, hills: 2 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Livius', 'The Consular Army', 'rome', 'south', 'rome.hastati*3, rome.principes*3, rome.triarii*2, rome.velites*2, rome.equites*2', { ai: 'assault' }),
          army('Porcius', "The Praetor's Legions", 'rome', 'south', 'rome.socii*3, rome.velites', { ai: 'assault' }),
          army('Nero', 'The Army of the South', 'rome', 'east', 'rome.hastati*2, rome.principes*2, rome.equites*2', { ai: 'assault', arrive: 240 }),
        ],
      },
      {
        name: 'Carthage',
        armies: [army('Hasdrubal', 'The Army of Iberia', 'carthage', 'north', 'carthage.scutarii*3, carthage.libyans*4, carthage.gauls*3, carthage.elephants*2, carthage.slingers, carthage.numidians, carthage.iberiancav', { ai: 'assault' })],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'Nero has marched his men the length of Italy to join you. Hold until he swings round the enemy flank.' },
      { at: 0, side: 1, tone: 'epic', text: 'Your brother Hannibal waits in the south. Break this army and the road to him is open.' },
    ],
    bonus: [
      [won.kill(250), won.destroy('the war elephants', ELEPHANTS), won.losses(30, 100)],
      [won.general(250, 'Hasdrubal lives: history changes'), won.losses(35), won.kill(100)],
    ],
  },
  {
    id: 'ilipa',
    name: 'Ilipa',
    year: '206 BC',
    place: 'Spain',
    history:
      "For days Scipio drew up his army the same way, legions in the centre. On the day of battle he reversed it: his Spanish allies in the centre, the legions on the wings, before the Carthaginians had even eaten. While their centre stood watching, Scipio's wings swung in and crushed theirs. It ended Carthage's rule in Spain.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, hills: 1 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Scipio', 'The Army of Spain', 'rome', 'south', 'rome.hastati*3, rome.principes*3, rome.triarii*2, rome.velites*3, rome.equites*2', { ai: 'assault' }),
          army('Culchas', 'The Spanish Allies', 'iberia', 'south', 'iberia.caetrati*3, iberia.scutarii*3, iberia.cavalry', { ai: 'hold' }),
        ],
      },
      {
        name: 'Carthage',
        armies: [
          army('Hasdrubal', 'The Army of Iberia', 'carthage', 'north', 'carthage.libyans*4, carthage.scutarii*3, carthage.elephants*2, carthage.slingers, carthage.numidians*2, carthage.iberiancav', { ai: 'defend' }),
          army('Mago', "Mago's Army", 'carthage', 'north', 'carthage.gauls*2, carthage.scutarii, carthage.iberiancav', { ai: 'defend' }),
        ],
      },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: 'Your legions are on the wings today, your Spanish allies in the centre. Swing the wings in and crush theirs.' }],
    bonus: [
      [won.losses(25, 200), won.destroy('the war elephants', ELEPHANTS), won.time(15)],
      [won.kill(250), won.general(150), won.losses(35, 100)],
    ],
  },
  {
    id: 'zama',
    name: 'Zama',
    year: '202 BC',
    place: 'Africa',
    history:
      "Hannibal's last battle, before the gates of Carthage. Scipio drew up his maniples in columns, leaving lanes through which Hannibal's eighty elephants ran harmlessly. The infantry fought it out line against line, until Scipio's cavalry and Masinissa's Numidians returned from the chase and fell on Hannibal's rear. Carthage sued for peace.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, forest: 0 } },
    sides: [
      {
        name: 'Rome',
        armies: [
          army('Scipio', 'The Legions', 'rome', 'south', 'rome.hastati*4, rome.principes*3, rome.triarii*3, rome.velites*3', { ai: 'assault' }),
          army('Laelius', 'The Roman Horse', 'rome', 'south', 'rome.equites*3', { ai: 'wait:60' }),
          army('Masinissa', 'The Numidians', 'carthage', 'south', 'carthage.numidians*4', { ai: 'wait:60' }),
        ],
      },
      {
        name: 'Carthage',
        armies: [
          army('Hannibal', 'The Army of Carthage', 'carthage', 'north', 'carthage.elephants*2, carthage.gauls*3, carthage.slingers*2, carthage.libyans*3, carthage.veterans', { ai: 'defend' }),
          army('Tychaeus', 'The Numidian Horse', 'carthage', 'north', 'carthage.numidians*2, carthage.iberiancav', { ai: 'defend' }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: "Your maniples stand in columns, leaving lanes for Hannibal's elephants to run through." },
      { at: 0, side: 1, tone: 'epic', text: 'The elephants open the battle. Your veterans of Italy wait in the third line.' },
      { at: 75, side: -1, tone: 'epic', text: "Roman trumpets blare all along the line! Hannibal's elephants panic: some turn back on his own horse, the rest run down Scipio's lanes.", panic: { side: 1, cls: ['ele'] } },
    ],
    bonus: [
      [won.kill(250), won.destroy('the war elephants', ELEPHANTS), won.losses(30, 100)],
      [won.kill(250), won.general(150), won.losses(35, 100)],
    ],
  },
];
