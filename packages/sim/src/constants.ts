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
