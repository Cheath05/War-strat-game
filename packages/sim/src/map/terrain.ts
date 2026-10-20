// Terrain types and their rules. Tile ids are plain numbers so maps can live in typed
// arrays (in the cache, never in world state).

export const T = {
  grass: 0,
  dry: 1,
  dirt: 2,
  road: 3,
  sand: 4,
  forest: 5,
  rough: 6,
  marsh: 7,
  shallow: 8,
  water: 9,
  cliff: 10,
  wall: 11,
  bridge: 12,
  field: 13,
} as const;
export type TerrainId = (typeof T)[keyof typeof T];

/** Movement classes: soldiers on foot, horses, and large beasts/chariots. */
export const MOVE = { foot: 1, horse: 2, large: 4 } as const;

export interface TerrainInfo {
  name: string;
  /** Speed multipliers [foot, horse, large]; 0 means impassable. */
  speed: [number, number, number];
  /** Chance a missile is stopped by cover. */
  cover: number;
  /** Breaks tight formations (phalanx, testudo) and cavalry charges. */
  rough: boolean;
  /** Units here are hidden from enemies beyond short range (fog of war). */
  hides: boolean;
  /** Minimap colour. */
  color: number;
}

export const TERRAIN: Record<number, TerrainInfo> = {
  [T.grass]: { name: 'Grass', speed: [1, 1, 1], cover: 0, rough: false, hides: false, color: 0x6e9a3e },
  [T.dry]: { name: 'Dry grass', speed: [1, 1, 1], cover: 0, rough: false, hides: false, color: 0xa8a050 },
  [T.dirt]: { name: 'Dirt', speed: [1, 1, 1], cover: 0, rough: false, hides: false, color: 0x9a7a4c },
  [T.road]: { name: 'Road', speed: [1.15, 1.15, 1.1], cover: 0, rough: false, hides: false, color: 0xc8b088 },
  [T.sand]: { name: 'Sand', speed: [0.85, 0.85, 0.8], cover: 0, rough: false, hides: false, color: 0xe0cc8c },
  [T.forest]: { name: 'Forest', speed: [0.7, 0.45, 0.35], cover: 0.45, rough: true, hides: true, color: 0x3a5e2a },
  [T.rough]: { name: 'Rocky ground', speed: [0.75, 0.5, 0.5], cover: 0.15, rough: true, hides: false, color: 0x8c8274 },
  [T.marsh]: { name: 'Marsh', speed: [0.55, 0.4, 0.3], cover: 0.05, rough: true, hides: false, color: 0x5e7a5a },
  [T.shallow]: { name: 'Shallows', speed: [0.5, 0.6, 0.6], cover: 0, rough: true, hides: false, color: 0x5aa0b0 },
  [T.water]: { name: 'Deep water', speed: [0, 0, 0], cover: 0, rough: true, hides: false, color: 0x2a5a8c },
  [T.cliff]: { name: 'Cliffs', speed: [0, 0, 0], cover: 0, rough: true, hides: false, color: 0x6a5e52 },
  [T.wall]: { name: 'Wall', speed: [0, 0, 0], cover: 0, rough: true, hides: false, color: 0x9a9088 },
  [T.bridge]: { name: 'Bridge', speed: [1, 1, 1], cover: 0, rough: false, hides: false, color: 0xa0784c },
  [T.field]: { name: 'Wheat field', speed: [0.9, 0.9, 0.9], cover: 0.05, rough: false, hides: false, color: 0xc8b452 },
};

export function passMask(t: number): number {
  const s = TERRAIN[t]!.speed;
  return (s[0] > 0 ? MOVE.foot : 0) | (s[1] > 0 ? MOVE.horse : 0) | (s[2] > 0 ? MOVE.large : 0);
}
