// Campaign upgrades and veterancy: bonuses a unit carries on top of its type's stats.
// Upgrades are bought for a whole arm (infantry, missile troops or cavalry) in three
// tracks; veterancy is earned by each unit from the enemies it has killed.

import { unitType } from '../data/registry';
import type { Unit } from '../types';
import { roleOf, type UnitRole } from './armies';

export type Bonus = Unit['up'];

export const NO_BONUS: Bonus = { atk: 0, def: 0, armor: 0, morale: 0 };

/** Upgrade tracks, in the order levels are stored. */
export const TRACKS = ['weapons', 'armour', 'drill'] as const;
export type Track = (typeof TRACKS)[number];

/** Highest level of a track. */
export const MAX_LEVEL = 3;

/** Levels bought for each arm, per track ([weapons, armour, drill], each 0..MAX_LEVEL). */
export type Upgrades = Record<UnitRole, number[]>;

export function noUpgrades(): Upgrades {
  return { line: [0, 0, 0], missile: [0, 0, 0], horse: [0, 0, 0] };
}

/** What one level of each track adds. */
export const PER_LEVEL: Record<Track, Bonus> = {
  weapons: { atk: 3, def: 0, armor: 0, morale: 0 },
  armour: { atk: 0, def: 1, armor: 6, morale: 0 },
  drill: { atk: 0, def: 2, armor: 0, morale: 6 },
};

/** What each veterancy rank adds. */
export const PER_RANK: Bonus = { atk: 2, def: 2, armor: 0, morale: 5 };

/** Highest veterancy rank. */
export const MAX_RANK = 3;

/** A unit's bonus from its arm's upgrades and its own veterancy rank. */
export function unitBonus(type: string, upgrades: Upgrades | undefined, vet: number): Bonus {
  const levels = upgrades?.[roleOf(unitType(type))] ?? [0, 0, 0];
  const b = { ...NO_BONUS };
  TRACKS.forEach((track, k) => {
    const n = Math.max(0, Math.min(MAX_LEVEL, levels[k] ?? 0));
    const per = PER_LEVEL[track];
    b.atk += per.atk * n;
    b.def += per.def * n;
    b.armor += per.armor * n;
    b.morale += per.morale * n;
  });
  const r = Math.max(0, Math.min(MAX_RANK, vet));
  b.atk += PER_RANK.atk * r;
  b.def += PER_RANK.def * r;
  b.morale += PER_RANK.morale * r;
  return b;
}

/**
 * Veterancy rank from the kills a unit has made over a campaign, relative to its size: a
 * unit that has killed half its own number is blooded (1), its number and a half seasoned
 * (2), three times its number a veteran (3).
 */
export function vetRank(kills: number, size: number): number {
  const k = kills / Math.max(1, size);
  return k >= 3 ? 3 : k >= 1.5 ? 2 : k >= 0.5 ? 1 : 0;
}

export const RANK_NAMES = ['Recruits', 'Blooded', 'Seasoned', 'Veterans'];
