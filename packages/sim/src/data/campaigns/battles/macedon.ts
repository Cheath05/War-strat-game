import type { BattleDef } from '../../../campaign/types';
import { ELEPHANTS, army, won } from './kit';

// Macedon's wars beyond Greece and Persia: Philip's new army (358-352 BC), Alexander on the
// Danube, the Jaxartes and the Hydaspes (335-326 BC), and the wars of his successors
// (301-222 BC). Macedon is side 0.

export const MACEDON_WARS: BattleDef[] = [
  {
    id: 'erigon',
    name: 'The Erigon Valley',
    year: '358 BC',
    place: 'Lynkestis, Macedonia',
    history:
      "The Illyrians had just killed a Macedonian king and four thousand of his men. A year later his brother Philip led out the army he had rebuilt, armed with long pikes and drilled as no army in Greece. The old Illyrian king Bardylis formed his men in a hollow square; Philip drove his phalanx into one face of it and his cavalry into the corner, and seven thousand Illyrians died.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, hills: 1, river: 2, at: 0.1 } },
    sides: [
      { name: 'Macedon', armies: [army('Philip', 'The New Army', 'macedon', 'south', 'macedon.pikemen*5, macedon.hypaspists, macedon.companions*2, macedon.prodromoi, macedon.archers', { ai: 'assault' })] },
      { name: 'Illyria', armies: [army('Bardylis', 'The Dardanian Host', 'illyria', 'north', 'illyria.spearmen*5, illyria.warriors*3, illyria.javelinmen*2, illyria.cavalry*2, illyria.pirates', { ai: 'defend' })] },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: 'Your new phalanx fights its first battle. Bardylis waits in a hollow square: break one corner of it with everything you have.' }],
    bonus: [
      [won.kill(200), won.losses(20), won.time(14)],
      [won.general(150), won.kill(250), won.losses(35, 100)],
    ],
  },
  {
    id: 'crocusfield',
    name: 'Crocus Field',
    year: '352 BC',
    place: 'Thessaly, Greece',
    history:
      "The Phocians had seized Delphi and paid their mercenaries with Apollo's treasure. Philip came south to fight them with the cavalry of Thessaly beside his phalanx, and his men went into battle wearing laurel wreaths, as soldiers of the god. The Phocians were driven into the sea and their general Onomarchus was killed. It made Philip master of Thessaly.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 4, coast: 4 } },
    sides: [
      { name: 'Macedon', armies: [army('Philip', 'Macedon and Thessaly', 'macedon', 'south', 'macedon.pikemen*5, macedon.hypaspists*2, macedon.companions*2, macedon.thessalians*3', { ai: 'assault' })] },
      { name: 'Phocis', armies: [army('Onomarchus', 'The Phocians', 'greece', 'north', 'greece.hoplites*6, greece.peltasts*2, greece.psiloi*2, greece.hippeis', { ai: 'defend' })] },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: 'Your men wear laurel wreaths: they fight for Apollo against the robbers of his temple.' }],
    bonus: [
      [won.kill(200), won.losses(20), won.time(14)],
      [won.kill(250), won.general(150), won.losses(35, 100)],
    ],
  },
  {
    id: 'danube',
    name: 'The Danube',
    year: '335 BC',
    place: 'Thrace',
    history:
      "Before he could turn on Persia, the young Alexander marched north to subdue the Thracians. The Triballi under King Syrmus hid in a wooded glen by a river; Alexander drew them out with his archers and slingers, then crushed them in the open with his cavalry and phalanx, and crossed the Danube itself by night to scatter the Getae.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 0, forest: 2, wood: 2 } },
    sides: [
      { name: 'Macedon', armies: [army('Alexander', 'The Army of Macedon', 'macedon', 'south', 'macedon.pikemen*4, macedon.hypaspists*2, macedon.agrianians*2, macedon.archers*2, macedon.companions*2, macedon.prodromoi', { ai: 'assault' })] },
      { name: 'Thrace', armies: [army('Syrmus', 'The Triballi and Getae', 'thrace', 'north', 'thrace.peltasts*4, thrace.rhomphaia*3, thrace.tribesmen*3, thrace.cavalry*2, thrace.horsearchers*2', { ai: 'defend' })] },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: 'The Triballi are hiding in the woods. Draw them out with your archers, then crush them in the open.' }],
    bonus: [
      [won.losses(15, 200), won.time(12, 150), won.destroy('the rhomphaia warriors', { types: ['thrace.rhomphaia'] }, 100)],
      [won.kill(300), won.general(150), won.losses(35, 100)],
    ],
  },
  {
    id: 'jaxartes',
    name: 'The Jaxartes',
    year: '329 BC',
    place: 'Sogdiana',
    history:
      "At the edge of the known world, Scythian horse archers rode up and down the far bank of the Jaxartes jeering at Alexander. Though ill, he crossed under the cover of his catapults, then pinned the elusive horsemen between his cavalry and his light troops so they could neither scatter nor shoot their way out.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 3, river: 1, at: 0.66, forest: 0 } },
    sides: [
      {
        name: 'Macedon',
        armies: [army('Alexander', 'The Army of Macedon', 'macedon', 'south', 'macedon.pikemen*3, macedon.hypaspists*2, macedon.agrianians*2, macedon.archers*3, macedon.companions*3, macedon.prodromoi*2, macedon.thessalians', { ai: 'assault' })],
      },
      { name: 'The Saka', armies: [army('Carthasis', 'The Saka Horde', 'scythia', 'north', 'scythia.horsearchers*6, scythia.nobles*2, scythia.footarchers*2, scythia.royal', { ai: 'assault' })] },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: 'The Scythians jeer at you from across the river. Cross, then pin their horse archers between your cavalry and your light troops.' }],
    bonus: [
      [won.destroy('the horse archers', { types: ['scythia.horsearchers'] }, 200), won.losses(20), won.time(14)],
      [won.losses(20, 200), won.kill(300), won.general(100)],
    ],
  },
  {
    id: 'hydaspes',
    name: 'The Hydaspes',
    year: '326 BC',
    place: 'the Punjab, India',
    history:
      "King Porus held the far bank of the Hydaspes with a wall of war elephants. On a stormy night Alexander slipped across upstream and met him on a plain turned to mud by the monsoon. Coenus' cavalry swept round behind the Indian horse, and the phalanx fought the elephants with axes and pikes until they turned and trampled their own men. Asked how he wished to be treated, the giant Porus replied: like a king.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 0, river: 2, at: 0.9, marsh: 1, forest: 0 } },
    sides: [
      {
        name: 'Macedon',
        armies: [
          army('Alexander', 'The Army of Macedon', 'macedon', 'south', 'macedon.pikemen*4, macedon.hypaspists*2, macedon.agrianians*2, macedon.archers*2, macedon.companions*3', { ai: 'assault' }),
          army('Coenus', 'The Flanking Horse', 'macedon', 'west', 'macedon.companions*2, macedon.prodromoi', { ai: 'assault', arrive: 200 }),
        ],
      },
      { name: 'India', armies: [army('Porus', 'The Army of the Paurava', 'india', 'north', 'india.elephants*5, india.longbowmen*3, india.swordsmen*3, india.spearmen*3, india.chariots*2, india.cavalry*2, india.royal', { ai: 'defend' })] },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: "The rain has turned the plain to mud. Porus' chariots will bog down, but his elephants will not." },
      { at: 0, side: 1, tone: 'epic', text: 'Your elephants are a wall no horse will face. Let the Greeks break themselves on it.' },
    ],
    bonus: [
      [won.destroy('the war elephants', ELEPHANTS, 250), won.losses(25), won.kill(150, 0, 'Porus is taken')],
      [won.kill(300), won.general(150), won.destroy('the Companions', { types: ['macedon.companions'] })],
    ],
  },
  {
    id: 'ipsus',
    name: 'Ipsus',
    year: '301 BC',
    place: 'Phrygia, Asia Minor',
    history:
      "After Alexander, his generals fought over his empire for twenty years. At Ipsus, old one-eyed Antigonus, who held most of Asia, faced a coalition of Seleucus and Lysimachus. His son Demetrius won the cavalry fight and chased too far; Seleucus put his four hundred elephants between Demetrius and the battle, and Antigonus, eighty-one years old, died under a shower of javelins still waiting for his son.",
    winner: 1,
    map: { id: 'battlefield', params: { g: 1, hills: 1 } },
    victory: [{ k: 'general', side: 0 }, { k: 'rout' }],
    sides: [
      {
        name: 'Antigonus',
        armies: [
          army('Antigonus', 'The Royal Army', 'macedon', 'south', 'macedon.pikemen*6, macedon.hypaspists*2, macedon.agrianians*2, seleucids.elephants*2', { ai: 'defend' }),
          army('Demetrius', 'The Cavalry', 'macedon', 'south_e', 'macedon.companions*3, macedon.thessalians*2', { ai: 'assault' }),
        ],
      },
      {
        name: 'The Coalition',
        armies: [
          army('Seleucus', 'The Army of the East', 'seleucids', 'north', 'seleucids.phalangites*4, seleucids.elephants*5, seleucids.archers*2, seleucids.thureophoroi', { ai: 'assault' }),
          army('Lysimachus', 'The Army of Thrace', 'macedon', 'north', 'macedon.pikemen*4, thrace.peltasts*2, thrace.cavalry', { ai: 'assault' }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: "If Antigonus falls, the battle is lost. And Demetrius must not ride too far: Seleucus' elephants wait behind the line." },
      { at: 0, side: 1, tone: 'epic', text: 'Kill the old king and his empire dies with him.' },
    ],
    bonus: [
      [won.general(300, 'Antigonus survives: history changes'), won.destroy('the elephants', ELEPHANTS), won.losses(30, 100)],
      [won.kill(250), won.losses(25), won.time(15)],
    ],
  },
  {
    id: 'sellasia',
    name: 'Sellasia',
    year: '222 BC',
    place: 'Laconia, Greece',
    history:
      "Cleomenes III had remade Sparta and armed it in the Macedonian way, and Antigonus Doson came south with Macedonians, Achaeans and Illyrians to stop him. The Spartans held two hills across the road into Laconia. A young Achaean cavalry officer, Philopoemen, charged without orders and turned the battle; Cleomenes' brother died on one hill, and Cleomenes fled to Egypt.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, hills: 2, ridge: 2, hillH: 9 } },
    sides: [
      {
        name: 'Macedon and its Allies',
        armies: [
          army('Antigonus', 'The Macedonians', 'macedon', 'south', 'macedon.pikemen*5, macedon.hypaspists*2, macedon.agrianians, macedon.companions', { ai: 'assault' }),
          army('Philopoemen', 'The Achaeans', 'greece', 'south_e', 'greece.hoplites*3, greece.hippeis*2', { ai: 'assault' }),
          army('Demetrius of Pharos', 'The Illyrians', 'illyria', 'south_w', 'illyria.warriors*3', { ai: 'assault' }),
        ],
      },
      {
        name: 'Sparta',
        armies: [
          army('Cleomenes', 'The Spartans', 'greece', 'north', 'greece.spartans*3, greece.hoplites*3, macedon.pikemen*2, greece.peltasts*2, greece.hippeis', { ai: 'defend' }),
          army('Eucleidas', 'The Left on Mount Evas', 'greece', 'north_w', 'greece.hoplites*3, greece.peltasts', { ai: 'defend' }),
        ],
      },
    ],
    bonus: [
      [won.time(15, 150), won.losses(25), won.kill(100, 1, 'Eucleidas falls')],
      [won.kill(250), won.general(150), won.losses(35, 100)],
    ],
  },
];
