import type { BattleDef } from '../../../campaign/types';
import { army, won } from './kit';

// The Greeks' wars: against Persia (490-466 BC), against each other (425-362 BC), Cunaxa,
// and against Macedon (338-322 BC). The Greek side is side 0 except where Greeks fought
// Greeks; Persia and Macedon are side 1.

export const GREEK_WARS: BattleDef[] = [
  {
    id: 'marathon',
    name: 'Marathon',
    year: '490 BC',
    place: 'Attica, Greece',
    history:
      "Darius sent an army by sea to punish Athens. On the plain of Marathon, with the Persians' backs to the sea, Miltiades thinned his centre, strengthened his wings and sent the Athenians in at a run to get under the arrows. The wings closed on the Persian centre; 6,400 Persians died against 192 Athenians.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, coast: 4, marsh: 2, ridge: 3, hillH: 6 } },
    sides: [
      {
        name: 'Athens',
        armies: [
          army('Miltiades', 'The Athenians', 'greece', 'south', 'greece.hoplites*7, greece.psiloi*2', { ai: 'assault' }),
          army('Arimnestos', 'The Plataeans', 'greece', 'south', 'greece.hoplites*2', { ai: 'assault' }),
        ],
      },
      {
        name: 'Persia',
        armies: [army('Datis', 'The Expedition', 'persia', 'north', 'persia.levy*5, persia.sparabara*4, persia.archers*3, persia.takabara*2, persia.immortals*2', { ai: 'defend' })],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'The Persians have their backs to the sea. Charge across the plain at a run, under the arrows.' },
      { at: 0, side: 1, tone: 'epic', text: 'The Athenians are coming down from the hills. Let the archers thin them before they reach you.' },
    ],
    bonus: [
      [won.losses(15, 250), won.time(10), won.kill(100)],
      [won.general(150), won.losses(30), won.kill(200)],
    ],
  },
  {
    id: 'thermopylae',
    name: 'Thermopylae',
    year: '480 BC',
    place: 'Locris, Greece',
    history:
      "Leonidas and his Spartans held the narrow pass between the mountains and the sea for three days against the army of Xerxes, until a local man, Ephialtes, showed the Persians a path over the mountain. Leonidas sent most of the Greeks away and stayed with his three hundred to the end.",
    winner: 1,
    scenario: { id: 'thermopylae', slots: ['leonidas', 'medes'] },
    map: { id: 'thermopylae' },
    sides: [
      {
        name: 'The Greeks',
        armies: [
          army('Leonidas', 'The Three Hundred', 'greece', 'greeks_front', 'greece.spartans*3, greece.psiloi, greece.peltasts'),
          army('Demophilus', 'The Thespians', 'greece', 'greeks_front', 'greece.hoplites*3, greece.peltasts'),
        ],
      },
      {
        name: 'Persia',
        armies: [
          army('Datis', 'Medes and Cissians', 'persia', 'persians', 'persia.levy*5, persia.takabara, persia.archers*2'),
          army('Hydarnes', 'The Immortals', 'persia', 'immortals_start', 'persia.immortals*3, persia.archers', { arrive: 480 }),
        ],
      },
    ],
    bonus: [
      [won.general(300, 'Leonidas survives: history changes'), won.losses(50), won.hold('gate', 'the Phocian wall', 150)],
      [won.kill(200), won.time(14, 150), won.losses(40, 100)],
    ],
  },
  {
    id: 'plataea',
    name: 'Plataea',
    year: '479 BC',
    place: 'Boeotia, Greece',
    history:
      "A year after Thermopylae, the largest Greek army ever assembled faced Mardonius across the river Asopus. When the Greeks fell back in disorder at night, Mardonius attacked, and the Spartans, waiting under a hail of arrows for good omens, finally charged. Mardonius was killed by a Spartan named Arimnestus and the Persian army broke. Persia never invaded Greece again.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, river: 1, at: 0.42, ridge: 3, hills: 1 } },
    sides: [
      {
        name: 'The Greeks',
        armies: [
          army('Pausanias', 'The Spartans and Tegeans', 'greece', 'south_e', 'greece.spartans*3, greece.hoplites*3, greece.psiloi*2', { ai: 'defend' }),
          army('Aristides', 'The Athenians', 'greece', 'south_w', 'greece.hoplites*4, greece.archers', { ai: 'defend' }),
        ],
      },
      {
        name: 'Persia',
        armies: [
          army('Mardonius', 'The Army of Persia', 'persia', 'north', 'persia.immortals*3, persia.sparabara*4, persia.levy*3, persia.archers*3, persia.cavalry*3, persia.saka', { ai: 'assault' }),
          army('Attaginus', 'The Thebans', 'greece', 'north_w', 'greece.hoplites*3, greece.hippeis', { ai: 'assault' }),
          army('Artabazus', 'The Reserve', 'persia', 'north_e', 'persia.levy*2, persia.takabara*2, persia.cavalry', { ai: 'hold' }),
        ],
      },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: 'Mardonius has caught you as you fall back. Hold under the arrows, then charge when the omens turn.' }],
    bonus: [
      [won.kill(250), won.destroy('the Immortals', { types: ['persia.immortals'] }), won.losses(25, 100)],
      [won.general(200, 'Mardonius survives'), won.kill(200), won.losses(35, 100)],
    ],
  },
  {
    id: 'mycale',
    name: 'Mycale',
    year: '479 BC',
    place: 'Ionia, Asia Minor',
    history:
      "On the same day as Plataea, so the story goes, a Greek fleet landed at the foot of Mount Mycale, where the Persian fleet had been drawn up on the beach behind a stockade. The Athenians broke in, the Ionian Greeks in the Persian camp turned on their masters, and the fleet was burnt. It set the Greek cities of Asia free.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, coast: 3, ridge: 2, forest: 1 } },
    sides: [
      {
        name: 'The Greeks',
        armies: [
          army('Leotychidas', 'The Spartans', 'greece', 'south_e', 'greece.spartans*2, greece.hoplites*3', { ai: 'assault' }),
          army('Xanthippus', 'The Athenians', 'greece', 'south_w', 'greece.hoplites*4, greece.archers, greece.psiloi', { ai: 'assault' }),
        ],
      },
      {
        name: 'Persia',
        armies: [
          army('Tigranes', 'The Army of Ionia', 'persia', 'north', 'persia.immortals, persia.sparabara*3, persia.levy*3, persia.archers*2, persia.cavalry', { ai: 'defend' }),
          army('Mardontes', "The Fleet's Marines", 'persia', 'north', 'persia.takabara*2, persia.levy*2', { ai: 'defend' }),
        ],
      },
    ],
    bonus: [
      [won.kill(200), won.losses(25), won.time(14)],
      [won.general(150), won.losses(35), won.kill(150)],
    ],
  },
  {
    id: 'eurymedon',
    name: 'The Eurymedon',
    year: '466 BC',
    place: 'Pamphylia, Asia Minor',
    history:
      "Cimon took the fleet of the new Delian League to the mouth of the Eurymedon, where Persia was gathering ships and an army. He destroyed the fleet at sea, landed his marines the same day and routed the Persian army on the river bank: two victories, on sea and land, in one afternoon.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, coast: 3, river: 2, at: 0.86 } },
    sides: [
      { name: 'The Delian League', armies: [army('Cimon', 'The Delian League', 'greece', 'south', 'greece.hoplites*6, greece.archers*2, greece.peltasts*2, greece.hippeis', { ai: 'assault' })] },
      {
        name: 'Persia',
        armies: [
          army('Pherendates', 'The Army of Pamphylia', 'persia', 'north', 'persia.immortals*2, persia.sparabara*3, persia.levy*3, persia.archers*2, persia.cavalry*2', { ai: 'defend' }),
          army('Tithraustes', 'The Fleet', 'persia', 'north_e', 'persia.takabara*2, persia.levy*2, persia.archers', { ai: 'defend' }),
        ],
      },
    ],
    bonus: [
      [won.losses(25), won.kill(150), won.time(14)],
      [won.general(150), won.kill(200), won.losses(35, 100)],
    ],
  },
  {
    id: 'sphacteria',
    name: 'Sphacteria',
    year: '425 BC',
    place: 'Messenia, Greece',
    history:
      "Four hundred Spartans were cut off on the island of Sphacteria. Demosthenes landed thousands of light troops, archers and javelinmen, who would not stand to be caught and wore the hoplites down with missiles from every side. The survivors surrendered: the first time Spartiates had ever laid down their arms, and Greece could hardly believe it.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 1, coast: 4, lake: 3, forest: 1, hills: 1 } },
    sides: [
      {
        name: 'Athens',
        armies: [
          army('Demosthenes', 'The Landing Force', 'greece', 'south', 'greece.peltasts*4, greece.archers*3, greece.psiloi*3', { ai: 'assault' }),
          army('Cleon', 'The Hoplites', 'greece', 'south', 'greece.hoplites*3', { ai: 'hold' }),
        ],
      },
      { name: 'Sparta', armies: [army('Epitadas', 'The Spartiates', 'greece', 'north', 'greece.spartans*4, greece.hoplites, greece.psiloi', { ai: 'defend' })] },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'Never close with the Spartiates. Wear them down with arrows and javelins from every side.' },
      { at: 0, side: 1, tone: 'epic', text: 'Four hundred Spartiates trapped on Sphacteria. Spartans do not surrender.' },
    ],
    bonus: [
      [won.losses(15, 250), won.destroy('the Spartiates', { types: ['greece.spartans'] }), won.time(15)],
      [won.general(150, 'Epitadas survives'), won.kill(200), won.losses(40, 100)],
    ],
  },
  {
    id: 'delium',
    name: 'Delium',
    year: '424 BC',
    place: 'Boeotia, Greece',
    history:
      "Athens invaded Boeotia and was caught on the way home. Pagondas of Thebes drew up his Thebans twenty-five shields deep, a weight no line could hold, and sent cavalry round behind a hill; when they appeared, the Athenian right thought a new army had come and ran. Socrates was among the Athenians who got away.",
    winner: 1,
    map: { id: 'battlefield', params: { g: 1, ridge: 2, hills: 1 } },
    sides: [
      { name: 'Athens', armies: [army('Hippocrates', 'The Athenians', 'greece', 'south', 'greece.hoplites*7, greece.hippeis*2, greece.psiloi', { ai: 'assault' })] },
      { name: 'Boeotia', armies: [army('Pagondas', 'The Boeotians', 'greece', 'north', 'greece.hoplites*6, greece.hippeis*2, greece.peltasts*2', { ai: 'defend' })] },
    ],
    events: [
      { at: 0, side: 1, tone: 'epic', text: 'Your Thebans stand twenty-five shields deep. Push the Athenians off the hill and send the horse round behind them.' },
      { at: 0, side: 0, tone: 'epic', text: 'The Boeotians hold the hill. Push them off it before their cavalry finds your flank.' },
    ],
    bonus: [
      [won.general(150), won.losses(35), won.kill(150)],
      [won.kill(200), won.losses(25), won.time(14)],
    ],
  },
  {
    id: 'mantinea418',
    name: 'Mantinea',
    year: '418 BC',
    place: 'Arcadia, Greece',
    history:
      "The largest battle of the Peloponnesian War: Argos, Mantinea and Athens against Sparta. As the lines closed, each drifted right behind its neighbours' shields, and the Spartan king Agis found his left wing overlapped. His orders to close the gap were ignored, but the Spartiates in the centre simply broke everything in front of them.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 4, hills: 1, forest: 1 } },
    sides: [
      { name: 'Sparta', armies: [army('Agis', 'The Spartans', 'greece', 'south', 'greece.spartans*4, greece.hoplites*4, greece.hippeis, greece.psiloi', { ai: 'assault' })] },
      { name: 'The Alliance', armies: [army('Laches', 'Argos, Mantinea and Athens', 'greece', 'north', 'greece.hoplites*8, greece.hippeis*2, greece.peltasts', { ai: 'assault' })] },
    ],
    bonus: [
      [won.losses(20, 200), won.kill(150), won.time(14)],
      [won.kill(200), won.general(150), won.losses(35, 100)],
    ],
  },
  {
    id: 'cunaxa',
    name: 'Cunaxa',
    year: '401 BC',
    place: 'Babylonia',
    history:
      "Cyrus the Younger marched on his brother, King Artaxerxes, with an army of Persians and ten thousand Greek mercenaries. The Greeks broke the King's left without losing a man, but Cyrus, seeing his brother across the field, charged him with his bodyguard and was killed. The Ten Thousand had won their battle and lost the war, and had to march home through the heart of the empire.",
    winner: 1,
    map: { id: 'battlefield', params: { g: 2, river: 2, at: 0.08, forest: 0 } },
    victory: [{ k: 'general', side: 0, slot: 's0a1' }, { k: 'general', side: 1 }, { k: 'rout' }],
    sides: [
      {
        name: 'Cyrus the Younger',
        armies: [
          army('Clearchus', 'The Ten Thousand', 'greece', 'south_w', 'greece.hoplites*6, greece.peltasts*2, greece.psiloi', { ai: 'assault' }),
          army('Cyrus', 'The Army of Cyrus', 'persia', 'south_e', 'persia.levy*3, persia.cavalry*2, persia.takabara*2, persia.archers*2', { ai: 'assault' }),
        ],
      },
      {
        name: 'The Great King',
        armies: [
          army('Artaxerxes', "The King's Army", 'persia', 'north', 'persia.immortals*2, persia.sparabara*3, persia.levy*4, persia.archers*3, persia.cavalry*2, persia.chariots*2', { ai: 'defend' }),
          army('Tissaphernes', 'The Left Wing', 'persia', 'north_w', 'persia.cavalry*2, persia.takabara*2, persia.levy*2', { ai: 'assault' }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'Cyrus has staked everything on killing his brother the King. If Cyrus falls, the war is lost: keep him alive!' },
      { at: 0, side: 1, tone: 'epic', text: 'Your brother Cyrus has come for your throne. If he falls, his rebellion dies with him.' },
    ],
    bonus: [
      [won.general(150), won.losses(15, 200), won.kills(0.5, 150)],
      [won.kill(250, 1, 'Cyrus falls'), won.losses(30), won.general(100)],
    ],
  },
  {
    id: 'leuctra',
    name: 'Leuctra',
    year: '371 BC',
    place: 'Boeotia, Greece',
    history:
      "Epaminondas of Thebes broke every rule of Greek warfare. Instead of his best men on the right, he massed his left fifty shields deep against the Spartiates, with Pelopidas and the Sacred Band at its point, and held back his weaker right. The Spartan king Cleombrotus fell, the Spartan line broke, and Sparta's power was finished in an afternoon.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 4, hills: 1 } },
    sides: [
      {
        name: 'Thebes',
        armies: [
          army('Epaminondas', 'The Boeotians', 'greece', 'south_e', 'greece.hoplites*7, greece.peltasts, greece.hippeis*2', { ai: 'assault' }),
          army('Pelopidas', 'The Sacred Band', 'greece', 'south_w', 'greece.thebans*2, greece.hippeis', { ai: 'assault' }),
        ],
      },
      { name: 'Sparta', armies: [army('Cleombrotus', 'The Spartans', 'greece', 'north', 'greece.spartans*3, greece.hoplites*4, greece.hippeis, greece.psiloi', { ai: 'assault' })] },
    ],
    events: [{ at: 0, side: 0, tone: 'epic', text: 'Mass your left fifty shields deep against the Spartiates and hold back your right. Strike where they are strongest.' }],
    bonus: [
      [won.kill(200), won.destroy('the Spartiates', { types: ['greece.spartans'] }, 200), won.losses(25, 100)],
      [won.general(150), won.kill(200), won.losses(35, 100)],
    ],
  },
  {
    id: 'mantinea362',
    name: 'Mantinea',
    year: '362 BC',
    place: 'Arcadia, Greece',
    history:
      "Epaminondas' last battle. Once again he massed his left and drove it into the Spartans like the ram of a warship, and the enemy line gave way. But at the moment of victory he was struck by a spear. Told that his army had won, he had the spearhead drawn out and died; and with him died the power of Thebes.",
    winner: 0,
    map: { id: 'battlefield', params: { g: 4, hills: 1, forest: 1 } },
    sides: [
      { name: 'Thebes', armies: [army('Epaminondas', 'The Boeotians', 'greece', 'south', 'greece.hoplites*5, greece.thebans*2, greece.peltasts*2, greece.hippeis*2, macedon.thessalians', { ai: 'assault' })] },
      {
        name: 'Sparta and Athens',
        armies: [
          army('Agesilaus', 'The Spartans and Mantineans', 'greece', 'north_e', 'greece.spartans*2, greece.hoplites*4', { ai: 'defend' }),
          army('Hegesileos', 'The Athenians', 'greece', 'north_w', 'greece.hoplites*3, greece.hippeis*2', { ai: 'defend' }),
        ],
      },
    ],
    bonus: [
      [won.general(300, 'Epaminondas survives: history changes'), won.losses(25), won.time(15, 100)],
      [won.kill(250), won.losses(35), won.general(100)],
    ],
  },
  {
    id: 'chaeronea',
    name: 'Chaeronea',
    year: '338 BC',
    place: 'Boeotia, Greece',
    history:
      "Athens and Thebes made a last stand for the freedom of Greece against Philip of Macedon. Philip drew the Athenians forward with a feigned retreat, and as their line stretched and opened, his eighteen-year-old son Alexander led the Companion cavalry into the gap. The Sacred Band of Thebes died where it stood, to the last man.",
    winner: 1,
    map: { id: 'battlefield', params: { g: 1, river: 2, at: 0.92, hills: 1 } },
    sides: [
      {
        name: 'Athens and Thebes',
        armies: [
          army('Chares', 'The Athenians', 'greece', 'south_w', 'greece.hoplites*6, greece.peltasts*2, greece.psiloi', { ai: 'assault' }),
          army('Theagenes', 'The Thebans', 'greece', 'south_e', 'greece.hoplites*3, greece.thebans*2, greece.hippeis', { ai: 'assault' }),
        ],
      },
      {
        name: 'Macedon',
        armies: [
          army('Philip', 'The Phalanx', 'macedon', 'north_w', 'macedon.pikemen*3, macedon.hypaspists, macedon.agrianians, macedon.archers', { ai: 'defend' }),
          army('Alexander', 'The Companions', 'macedon', 'north_e', 'macedon.companions*3, macedon.pikemen', { ai: 'assault' }),
        ],
      },
    ],
    events: [
      { at: 0, side: 0, tone: 'epic', text: 'The freedom of Greece is decided today. The Sacred Band holds the right.' },
      { at: 0, side: 1, tone: 'epic', text: 'Philip will draw the Athenians forward with a feigned retreat. When a gap opens, Alexander leads the Companions in.' },
    ],
    bonus: [
      [won.kill(250), won.losses(30), won.destroy('the Companions', { types: ['macedon.companions'] })],
      [won.destroy('the Sacred Band', { types: ['greece.thebans'] }, 200), won.losses(20), won.time(14)],
    ],
  },
  {
    id: 'crannon',
    name: 'Crannon',
    year: '322 BC',
    place: 'Thessaly, Greece',
    history:
      "When Alexander died, Athens led the Greeks in one more war for freedom. At Crannon the Thessalian cavalry of Menon of Pharsalus held its own, but the Greek infantry could not stand against the phalanx of Antipater and Craterus' veterans. The war was lost, Athens' democracy was abolished, and Demosthenes took poison.",
    winner: 1,
    map: { id: 'battlefield', params: { g: 4 } },
    sides: [
      {
        name: 'The Greek League',
        armies: [
          army('Antiphilus', 'The Greek League', 'greece', 'south', 'greece.hoplites*7, greece.peltasts*2, greece.psiloi', { ai: 'defend' }),
          army('Menon', 'The Thessalian Horse', 'greece', 'south', 'macedon.thessalians*3, greece.hippeis', { ai: 'wait:90' }),
        ],
      },
      {
        name: 'Macedon',
        armies: [
          army('Antipater', 'The Phalanx', 'macedon', 'north', 'macedon.pikemen*3, macedon.hypaspists, macedon.agrianians, macedon.archers', { ai: 'assault' }),
          army('Craterus', 'The Veterans', 'macedon', 'north', 'macedon.hypaspists, macedon.companions*2', { ai: 'assault' }),
        ],
      },
    ],
    bonus: [
      [won.kill(200), won.losses(30), won.time(15)],
      [won.losses(20), won.kill(150), won.destroy('the Thessalian horse', { types: ['macedon.thessalians'] })],
    ],
  },
];
