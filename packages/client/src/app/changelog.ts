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
