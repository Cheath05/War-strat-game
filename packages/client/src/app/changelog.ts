// The game's version and what each update added, newest first. Players see the version at
// the bottom of the menus and can open this list. Add an entry (and bump VERSION) with every
// update you deploy.

export interface Release {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '1.6.0',
    date: '22 October 2026',
    title: 'Campaigns',
    items: [
      'New: Campaigns (Campaign on the title screen). Lead Rome, Greece, Carthage, Persia or Macedon through 13 to 18 of their famous battles, from Marathon and Cannae to Gaugamela and Alesia, on a road read left to right, with side battles and choices along the way.',
      'Four difficulties, Easy, Normal, Hard and Extreme, and two ways to keep an army: a veteran army whose survivors carry on from battle to battle and rise in rank as they kill, or a fresh army for every battle, starting from the one history gave you.',
      'Every battle has three bonus objectives. Victories and objectives win Glory, which buys recruits and refills, upgrades (weapons, armour and drill for your infantry, missile troops and cavalry) and new troops, from the Praetorian Guard to war elephants.',
      'Fight the battles your side lost too: win Cannae as Rome or Gaugamela as Persia, and history changes. Lose a battle and you can fight it again at no cost.',
      'Thirteen new peoples to fight with and against, wherever you pick a country: Gauls, Samnites, Epirus, the Seleucid Empire, the Germanic tribes, Lydia, Babylon, Egypt, Scythia, Iberia, Thrace, Illyria and India, each with its own super unit. Rome gains the Legionary Cohort and Persia the Camel Archers.',
      'New art for them: camels, armoured horses for cataphracts, Egyptian headdresses, conical helmets, the Thracian rhomphaia and the khopesh. Country lists are now a compact grid, so all eighteen fit.',
      'Woods, rocky ground, marsh and shallows now break up a phalanx, testudo or shield wall: men standing there fight as a plain line.',
    ],
  },
  {
    version: '1.5.2',
    date: '22 October 2026',
    title: 'A results screen that fits',
    items: [
      'The results screen never runs off the bottom any more: the list of armies scrolls, and the buttons back to the menu or lobby stay in view.',
      'Last Stand\'s waves share one row in the results instead of one row per wave.',
    ],
  },
  {
    version: '1.5.1',
    date: '22 October 2026',
    title: 'Fighting back, and a free hand in the Sandbox',
    items: [
      'Sandbox deployment: place your units anywhere on the map, not just the golden zone. The host (or you, playing solo) can place the AI\'s armies too, and the battle waits until everyone is ready.',
      'Units never start in water, marsh or walls, or on top of each other: each forms up on the nearest dry, open ground. Units you drop in a river form up on the bank.',
      'Units under fire from archers, slingers or javelins no longer just stand there: they charge the shooters if they can catch them. Against horse archers, Romans close up in testudo until the arrows stop.',
      'Guard mode (G) keeps a unit in place under fire, as ordered.',
      'A general whose army has been destroyed no longer wanders off into a corner: he backs up the nearest friendly army, or leads his guard in a last charge.',
    ],
  },
  {
    version: '1.5.0',
    date: '22 October 2026',
    title: 'The Sandbox',
    items: [
      'New battle: the Sandbox. Pick the ground and up to four armies a side, each of any country: Rome and Greece against Persia, or whatever you like.',
      'Fill each army with any units from any country, super units too: up to thirty, and free. Shift-click adds five at once.',
      'Friends take an army and choose its country and units themselves; the host sets up the armies the AI leads.',
      'Three new battlefields for the Sandbox: Rolling Hills, Woodland and the Desert, laid out a little differently every battle.',
      'Every rule and choice in the battle setup now says what it does and how it changes the battle.',
    ],
  },
  {
    version: '1.4.0',
    date: '22 October 2026',
    title: 'Orders for your allies, and cleaner marching',
    items: [
      'Allied generals: the new panel at the top left asks each AI-led army on your side to Attack, Defend a place, Hold a place, or follow its own plan. They stick to it until you change it.',
      'Soldiers keep their bodies off walls, cliffs and the map edge instead of sinking into them.',
      'Units squeezed through a gap march through it as a column following their leader, and men cut off by a wall walk round through the gap instead of pushing against it.',
      'When a unit narrows or widens, the men nearest the front take the front ranks, so nobody crosses the whole block to find his place.',
    ],
  },
  {
    version: '1.3.1',
    date: '22 October 2026',
    title: 'Mouse buttons your way',
    items: [
      'Right click now selects (click, or hold and drag a box) and left click moves, attacks and draws formation lines.',
      'Prefer the classic Total War buttons? Settings → Controls → Mouse buttons → "Left selects" switches them back, also from the battle menu.',
    ],
  },
  {
    version: '1.3.0',
    date: '21 October 2026',
    title: 'Super units, iconic armies and smoother marching',
    items: [
      'Spartans carry the bronze shield with the great lambda and wear the tall horsehair crest; Greek hoplites have bronze greaves.',
      'Roman legionaries: red scutum with gold wings and thunderbolts, banded armour, crested helmets; triarii wear the centurion-style crest.',
      'New super units, one per faction: Black Spartans, the Praetorian Guard, Apple-Bearers, Hannibal\'s Veterans and the Silver Shields. Bigger, gold-edged, fearsome, and very expensive. Recruit them in Last Stand and the objective battles; they lead the last waves of Last Stand.',
      'Troops no longer squeeze into a column for no reason when they march, paths keep off walls, and everyone moves 30% faster.',
      'The Last Stand hill has lost its ring wall: defend the hilltop camp from any side.',
      'AI generals now spend gold: they refill worn units and buy reinforcements.',
      'Clear sides: outlines on the ground and banner edges are gold for your units, blue for allies and red for enemies (also on the minimap).',
      'The fallen sink away after a minute (Settings: 20 s to never). After a battle, "View the battlefield" hides the results.',
      'Settings in the battle menu: graphics, frame rate limit, sound and more, applied at once.',
    ],
  },
  {
    version: '1.2.0',
    date: '21 October 2026',
    title: 'A new look',
    items: [
      'A darker, cleaner interface: glass panels with fine borders and gold highlights instead of the blue windows.',
      'New font: Geist Pixel. Big titles are built from separate square tiles.',
      'A new title screen: the Hot Gates at dusk, with the phalanx on the ridge.',
      'Rules and settings use switches and option bars; the lobby keeps players and chat beside the battle and armies.',
      'New: a frame rate limit (30 to 144 fps, or none) in Settings and in the battle menu, to keep laptops cooler and quieter.',
    ],
  },
  {
    version: '1.1.0',
    date: '21 October 2026',
    title: 'Thermopylae fixes',
    items: [
      'Troops no longer wade into the sea or a bog when there is dry ground to walk on.',
      'No more soldiers climbing walls and cliffs: walls are solid stone blocks now.',
      'Bows and slings have shorter range (Persian archers 125 → 80 m, Cretan archers 120 → 85 m).',
      'New: a Strength setting for each side (×1 to ×5) in Solo and in the lobby, to give your side an edge.',
      'New: Menu → "Let the AI lead my troops" in battle. Bot players now let the AI lead their armies too.',
      'Fixed: the screen flashing white every few seconds the first time you played on a computer.',
      'New: this version number and list of updates.',
    ],
  },
  {
    version: '1.0.0',
    date: '21 October 2026',
    title: 'First release',
    items: [
      'Five factions: Rome, Greece, Carthage, Persia and Macedon, with elephants, scythed chariots and horse archers.',
      'Battles: Thermopylae (480 BC), Last Stand, Capture & Hold and Defend the Bridge.',
      'Play together online with a room code: lead as General, serve as a Commander, or take a captain into battle yourself.',
      'Gold modes: recruit your own army and buy reinforcements during the battle.',
      'Fog of war, 16-bit music and sound, and graphics settings for slower laptops.',
    ],
  },
];

export const VERSION = CHANGELOG[0]!.version;
