import type { BattleDef } from '../../../campaign/types';
import { army, won } from './kit';

// The Persian Empire: its rise under Cyrus, Cambyses and Darius (547-513 BC), and its fall
// to Alexander (334-330 BC). Persia is side 0 in its own conquests, side 1 against Macedon.

export const PERSIAN_WARS: BattleDef[] = [
  {
    id: 'thymbra',
    name: 'Thymbra',
    year: '547 BC',
    place: 'Lydia, Asia Minor',
    history:
      "Croesus of Lydia, the richest king in the world, crossed into Persian lands and met Cyrus before Sardis. His lancers were the best horsemen in Asia, but Cyrus put the camels of his baggage train in front of his line; the Lydian horses could not bear their smell and bolted. Sardis fell soon after, and Croesus with it.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1 } },
    sides: [
      {
        name: 'Persia',
        armies: [army('Cyrus', 'The Persians and Medes', 'persia', 'south', 'persia.immortals*2, persia.sparabara*3, persia.levy*3, persia.archers*2, persia.cavalry*2, persia.camels*3, persia.chariots', { ai: 'defend' })],
      },
      {
        name: 'Lydia',
        armies: [army('Croesus', 'The Army of Lydia', 'lydia', 'north', 'lydia.lancers*3, lydia.hoplites*2, lydia.spearmen*2, lydia.archers*2, lydia.javelinmen, egypt.spearmen*2', { ai: 'assault' })],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'Put the camels in front of the Lydian lancers. Their horses cannot stand the smell.' },
      { at: 0, side: 1, tone: 'epic', text: 'Your lancers are the finest in Asia. Ride the Persians down before they form.' },
    ],
    bonus: [
      [won.destroy('the Lydian lancers', { types: ['lydia.lancers'] }, 200), won.time(14), won.losses(25)],
      [won.kill(250), won.destroy('the camels', { types: ['persia.camels'] }), won.general(100)],
    ],
  },
  {
    id: 'opis',
    name: 'Opis',
    year: '539 BC',
    place: 'Babylonia',
    history:
      "Cyrus came down the Tigris to take Babylon, the greatest city in the world. The army of Babylon met him at Opis and was destroyed, and within weeks the gates of Babylon opened to the Persians, it is said without a fight. The Jews held captive there were allowed to go home.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 2, river: 2, at: 0.88, forest: 0 } },
    sides: [
      { name: 'Persia', armies: [army('Cyrus', 'The Army of Persia', 'persia', 'south', 'persia.immortals*3, persia.sparabara*3, persia.levy*3, persia.archers*2, persia.cavalry*3, persia.takabara*2', { ai: 'assault' })] },
      {
        name: 'Babylon',
        armies: [
          army('Nabonidus', 'The Army of Babylon', 'babylon', 'north', 'babylon.spearmen*2, babylon.levy*3, babylon.archers*2, babylon.slingers*2, babylon.chariots*2, babylon.cavalry', { ai: 'defend' }),
          army('Belshazzar', 'The Royal Guard', 'babylon', 'north', 'babylon.guard, babylon.cavalry, babylon.chariots', { ai: 'defend' }),
        ],
      },
    ],
    bonus: [
      [won.kill(150), won.destroy('the chariots', { types: ['babylon.chariots'] }), won.losses(25)],
      [won.kill(250), won.general(150), won.losses(35, 100)],
    ],
  },
  {
    id: 'pelusium',
    name: 'Pelusium',
    year: '525 BC',
    place: 'Egypt',
    history:
      "Cambyses, son of Cyrus, marched on Egypt across the desert, guided by Phanes, a Greek mercenary captain who had deserted the pharaoh. At Pelusium, the gate of Egypt, the young pharaoh Psamtik III was crushed, and Egypt became a Persian province. A later story says the Persians carried cats before them, and the Egyptians would not shoot at the sacred animals.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 2, coast: 4, marsh: 1, forest: 0 } },
    sides: [
      {
        name: 'Persia',
        armies: [
          army('Cambyses', 'The Army of Persia', 'persia', 'south', 'persia.immortals*2, persia.sparabara*3, persia.levy*3, persia.archers*3, persia.cavalry*2, persia.takabara*2', { ai: 'assault' }),
          army('Phanes', 'The Greek Defectors', 'greece', 'south', 'greece.hoplites*2', { ai: 'assault' }),
        ],
      },
      {
        name: 'Egypt',
        armies: [army('Psamtik', 'The Army of Egypt', 'egypt', 'north', 'egypt.spearmen*4, egypt.swordsmen*3, egypt.archers*3, egypt.chariots*2, egypt.javelinmen*2, egypt.mercenaries*3', { ai: 'defend' })],
      },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: 'Your men carry cats before their shields. The Egyptians will not shoot at the sacred animals, or so the story goes.' }],
    bonus: [
      [won.kill(150), won.losses(25), won.destroy('the chariotry', { types: ['egypt.chariots'] })],
      [won.kill(250), won.general(150), won.losses(35, 100)],
    ],
  },
  {
    id: 'scythianwar',
    name: 'The Scythian Campaign',
    year: '513 BC',
    place: 'the Pontic steppe',
    history:
      "Darius crossed the Danube on a bridge of boats with a vast army to conquer the Scythians. They would not give battle: they burnt the grass, filled the wells and rode rings around him, picking off his foragers. At last Darius had to slip away by night, leaving his campfires burning, and was lucky to find his bridge still standing.",
    winner: 1,
    map: { id: 'battlefield', params: { g: 3, hills: 1, forest: 0 } },
    victory: [{ k: 'rout' }, { k: 'timer', winner: 1, seconds: 960 }],
    sides: [
      { name: 'Persia', armies: [army('Darius', 'The Army of Persia', 'persia', 'south', 'persia.immortals*2, persia.sparabara*3, persia.levy*4, persia.archers*3, persia.cavalry*2, persia.takabara*2, persia.saka', { ai: 'assault' })] },
      {
        name: 'Scythia',
        armies: [
          army('Idanthyrsus', 'The Royal Scyths', 'scythia', 'north', 'scythia.horsearchers*5, scythia.nobles*2, scythia.royal, scythia.footarchers*2', { ai: 'assault' }),
          army('Scopasis', 'The Second Horde', 'scythia', 'west', 'scythia.horsearchers*3, scythia.nobles', { ai: 'assault', arrive: 120 }),
          army('Taxacis', 'The Third Horde', 'scythia', 'east', 'scythia.horsearchers*3, scythia.axemen*2', { ai: 'assault', arrive: 240 }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'The Scythians will not stand and fight. Pin them down and break them within sixteen minutes, before your army starves.' },
      { at: 0, side: 1, tone: 'epic', text: 'Never let the Persians catch you. Wear them down for sixteen minutes and they will have to go home.' },
    ],
    bonus: [
      [won.destroy('the Royal Scyths', { types: ['scythia.royal'] }, 200), won.time(12, 150), won.losses(25, 100)],
      [won.losses(20, 200), won.kill(250), won.kills(0.5, 100)],
    ],
  },
  {
    id: 'granicus',
    name: 'The Granicus',
    year: '334 BC',
    place: 'Hellespontine Phrygia, Asia Minor',
    history:
      "Alexander's first battle in Asia. The Persian satraps lined the steep bank of the Granicus with their cavalry and waited. Alexander led the Companions straight across the river into them; Spithridates' axe split his helmet, and Cleitus the Black cut off the satrap's arm before the next blow fell. The Greek mercenaries behind the cavalry were left to be slaughtered.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, river: 1, at: 0.48, forest: 0 } },
    sides: [
      {
        name: 'Macedon',
        armies: [
          army('Alexander', 'The Army of Macedon', 'macedon', 'south', 'macedon.pikemen*4, macedon.hypaspists*2, macedon.agrianians, macedon.archers, macedon.companions*2, macedon.prodromoi', { ai: 'assault' }),
          army('Parmenion', 'The Left Wing', 'macedon', 'south_w', 'macedon.thessalians*3, macedon.pikemen', { ai: 'assault' }),
        ],
      },
      {
        name: 'Persia',
        armies: [
          army('Arsites', "The Satraps' Horse", 'persia', 'north', 'persia.cavalry*6, persia.saka*3, persia.takabara*3, persia.levy*3, persia.immortals*2', { ai: 'defend' }),
          army('Memnon', 'The Greek Mercenaries', 'greece', 'north', 'greece.hoplites*7, greece.peltasts*2', { ai: 'hold' }),
        ],
      },
    ],
    bonus: [
      [won.time(10, 200), won.kill(150), won.losses(20, 100)],
      [won.kill(300), won.losses(35), won.general(100)],
    ],
  },
  {
    id: 'issus',
    name: 'Issus',
    year: '333 BC',
    place: 'Cilicia',
    history:
      "Darius III cut in behind Alexander and met him on a narrow plain between the mountains and the sea, behind the little river Pinarus. Alexander led the Companions across the river straight at the Great King, and when Darius turned his chariot and fled, his army followed. His mother, wife and children were captured in the camp.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, coast: 1, river: 1, at: 0.5, hills: 2 } },
    victory: [{ k: 'general', side: 1 }, { k: 'rout' }],
    sides: [
      {
        name: 'Macedon',
        armies: [
          army('Alexander', 'The Army of Macedon', 'macedon', 'south', 'macedon.pikemen*5, macedon.hypaspists*2, macedon.companions*3, macedon.agrianians*2, macedon.archers', { ai: 'assault' }),
          army('Parmenion', 'The Left by the Sea', 'macedon', 'south_w', 'macedon.thessalians*3, macedon.pikemen*2, macedon.prodromoi', { ai: 'defend' }),
        ],
      },
      {
        name: 'Persia',
        armies: [
          army('Darius', 'The Great King', 'persia', 'north', 'persia.applebearers, persia.immortals*4, persia.levy*6, persia.archers*4, persia.chariots*2', { ai: 'defend' }),
          army('Nabarzanes', 'The Heavy Horse', 'persia', 'north_w', 'persia.cavalry*6, persia.saka*3', { ai: 'wait:90' }),
          army('Thymondas', 'The Greek Mercenaries', 'greece', 'north', 'greece.hoplites*6', { ai: 'defend' }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'Darius himself is in the centre. Break through to him, and the whole army will run.' },
      { at: 0, side: 1, tone: 'epic', text: 'Hold the river. If you fall, the empire falls with you.' },
    ],
    bonus: [
      [won.kill(250), won.time(12), won.losses(20, 100)],
      [won.general(200), won.kill(300), won.losses(35, 100)],
    ],
  },
  {
    id: 'gaugamela',
    name: 'Gaugamela',
    year: '331 BC',
    place: 'Assyria',
    history:
      "Darius chose a vast plain and had it levelled for his two hundred scythed chariots, and brought the cavalry of the whole East. Alexander edged his army to the right until the Persian line stretched to follow, then drove the Companions into the gap that opened and straight at the King. Darius fled again, and the Persian Empire with him.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 2, forest: 0 } },
    victory: [{ k: 'general', side: 1 }, { k: 'rout' }],
    sides: [
      {
        name: 'Macedon',
        armies: [
          army('Alexander', 'The Army of Macedon', 'macedon', 'south', 'macedon.pikemen*5, macedon.hypaspists*2, macedon.companions*3, macedon.agrianians*2, macedon.archers', { ai: 'assault' }),
          army('Parmenion', 'The Left Wing', 'macedon', 'south_w', 'macedon.thessalians*3, macedon.prodromoi, macedon.pikemen*2', { ai: 'defend' }),
        ],
      },
      {
        name: 'Persia',
        armies: [
          army('Darius', 'The Great King', 'persia', 'north', 'persia.applebearers, persia.immortals*4, persia.levy*6, persia.archers*4, persia.chariots*4, india.elephants', { ai: 'defend' }),
          army('Bessus', 'The Bactrian Horse', 'persia', 'north_w', 'persia.saka*4, persia.cavalry*5', { ai: 'wait:60' }),
          army('Mazaeus', 'The Right Wing', 'persia', 'north_e', 'persia.cavalry*5, persia.levy*3, persia.takabara*3', { ai: 'assault' }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'The plain has been levelled for the scythed chariots. Let them through, then strike at the King.' },
      { at: 0, side: 1, tone: 'epic', text: 'Two hundred scythed chariots and the horsemen of the whole East. Envelop them.' },
    ],
    bonus: [
      [won.kill(250), won.destroy('the scythed chariots', { types: ['persia.chariots'] }), won.losses(20)],
      [won.general(200), won.kill(300), won.losses(35, 100)],
    ],
  },
  {
    id: 'persiangate',
    name: 'The Persian Gate',
    year: '330 BC',
    place: 'the Zagros Mountains',
    history:
      "On the road to Persepolis, the satrap Ariobarzanes walled off a narrow mountain pass and stopped Alexander's army cold, rolling boulders down on it. For a month, by some accounts, the Persian Gate held, until a captive shepherd showed Alexander a path around. Leaving Craterus at the wall, he came down behind the defenders, who died almost to a man.",
    winner: 1,
    map: { id: 'battlefield', params: { g: 1, pass: 74, passWall: 1 } },
    victory: [{ k: 'rout' }, { k: 'timer', winner: 0, seconds: 900 }],
    sides: [
      { name: 'Persia', armies: [army('Ariobarzanes', 'The Defenders of the Gate', 'persia', 'hold_n', 'persia.immortals*4, persia.sparabara*3, persia.archers*4, persia.takabara*3', { ai: 'hold' })] },
      {
        name: 'Macedon',
        armies: [
          army('Craterus', 'The Frontal Assault', 'macedon', 'south', 'macedon.pikemen*2, macedon.hypaspists, macedon.archers, macedon.agrianians', { ai: 'assault' }),
          army('Alexander', 'The Mountain Column', 'macedon', 'north', 'macedon.hypaspists*2, macedon.agrianians*2, macedon.archers', { ai: 'assault', arrive: 360 }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'Hold the Gate for fifteen minutes. Every hour you hold, Persepolis has another hour to prepare.' },
      { at: 300, side: 0, tone: 'bad', text: 'Scouts report Macedonians on the mountain paths behind us!' },
      { at: 0, side: 1, tone: 'epic', text: 'Keep them busy at the wall, Craterus. The King is taking his column over the mountain.' },
    ],
    bonus: [
      [won.general(200), won.losses(40), won.kill(300, 1, 'Alexander falls')],
      [won.time(12, 150), won.losses(25), won.kill(150)],
    ],
  },
];
