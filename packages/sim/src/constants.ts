/** Simulation ticks per second. Every computer advances the battle in these fixed steps. */
export const TICK_HZ = 20;
/** Seconds per tick. */
export const DT = 1 / TICK_HZ;
/** Ticks covered by one relay turn (100 ms). */
export const TICKS_PER_TURN = 2;
/** How often (in ticks) clients compare world hashes. */
export const HASH_EVERY = 20;
/** Metres per map tile. */
export const TILE = 2;
/**
 * Game pace: every unit's walking and running speed (in its data) is multiplied by this,
 * so armies close faster than real men would.
 */
export const PACE = 1.3;
/** Spatial grid cell size in metres. */
export const GRID_CELL = 4;
/** Sim schema version; bump when the world format changes. */
export const WORLD_VERSION = 1;

/** Seconds → ticks. */
export const sec = (s: number): number => Math.round(s * TICK_HZ);

/**
 * Hit points per soldier are the unit's hp times this. Raising it makes melee last longer
 * without changing the balance between unit types.
 */
export const HP_SCALE = 2.5;

/** Strength choices for a side (lobby setting): health and damage are multiplied by it. */
export const STRENGTHS = [1, 1.5, 2, 3, 5];

/**
 * A side's strength: every soldier's health and damage are multiplied by it, so at ×2 a
 * soldier fights like two (a handicap to help a side, such as co-op players against waves).
 */
export function strengthOf(settings: { strength?: number[] }, side: number): number {
  return settings.strength?.[side] ?? 1;
}
