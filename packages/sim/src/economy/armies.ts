// Army building for gold modes: what a list of units costs, grouping it into detachments,
// and a balanced army for any faction and budget (the AI's, or a quick pick).

import { FACTIONS, faction, hasUnitType, unitType } from '../data/registry';
import type { DetDef, UnitTypeDef } from '../data/types';

export type UnitRole = 'line' | 'missile' | 'horse';

export function roleOf(t: UnitTypeDef): UnitRole {
  if (t.mounted || t.cls === 'chariot' || t.cls === 'ele') return 'horse';
  if (t.cls === 'skirm' || t.cls === 'archer' || t.cls === 'slinger') return 'missile';
  return 'line';
}

export function armyCost(units: string[]): number {
  let c = 0;
  for (const id of units) c += unitType(id).cost;
  return c;
}

/** Units this faction can recruit (not the general's guard). */
export function recruitable(fid: string): UnitTypeDef[] {
  return faction(fid).units.filter((t) => !t.general);
}

/** Can this faction field this list with this gold? */
export function validArmy(fid: string, units: string[], gold: number, maxUnits: number): boolean {
  if (units.length > maxUnits) return false;
  const ok = new Set(recruitable(fid).map((t) => t.id));
  return units.every((id) => ok.has(id)) && armyCost(units) <= gold;
}

/** Every unit any faction can recruit: sandbox armies mix them freely. */
export function allRecruitable(): UnitTypeDef[] {
  return FACTIONS.flatMap((f) => recruitable(f.id));
}

/** A sandbox army: any faction's units (not generals' guards), at most maxUnits, at no cost. */
export function validSandboxArmy(units: string[], maxUnits: number): boolean {
  return units.length <= maxUnits && units.every((id) => hasUnitType(id) && !unitType(id).general);
}

const DET_NAMES: Record<UnitRole, string[]> = {
  line: ['Infantry', 'Second Line', 'Third Line', 'Fourth Line'],
  missile: ['Skirmishers', 'More Skirmishers', 'Missile Reserve', 'Last Skirmishers'],
  horse: ['Cavalry', 'Second Horse', 'Third Horse', 'Fourth Horse'],
};

/** Groups units into detachments: the line in blocks of up to four, then missiles, then horse. */
export function groupDets(units: string[]): DetDef[] {
  return groupBy(units, (id) => id).map((g) => ({ name: g.name, units: g.items }));
}

/** groupDets for any kind of item that has a unit type (campaign units keep their extras). */
export function groupBy<T>(items: T[], typeOf: (item: T) => string): { name: string; items: T[] }[] {
  const by: Record<UnitRole, T[]> = { line: [], missile: [], horse: [] };
  for (const it of items) by[roleOf(unitType(typeOf(it)))].push(it);
  const out: { name: string; items: T[] }[] = [];
  for (const role of ['line', 'missile', 'horse'] as UnitRole[]) {
    const list = by[role];
    for (let i = 0; i < list.length; i += 4) out.push({ name: DET_NAMES[role][Math.min(3, i / 4)]!, items: list.slice(i, i + 4) });
  }
  return out;
}

/**
 * A balanced army for the budget: about half line infantry, the rest missiles and horse,
 * cycling through the faction's unit types for variety. Super units are left out: they
 * are bought on purpose.
 */
export function defaultArmy(fid: string, gold: number, maxUnits: number): string[] {
  const pool: Record<UnitRole, UnitTypeDef[]> = { line: [], missile: [], horse: [] };
  for (const t of recruitable(fid)) if (!t.elite) pool[roleOf(t)].push(t);
  for (const k of ['line', 'missile', 'horse'] as UnitRole[]) pool[k].sort((a, z) => a.cost - z.cost || (a.id < z.id ? -1 : 1));
  const order: UnitRole[] = ['line', 'line', 'missile', 'line', 'horse', 'line', 'missile', 'horse'];
  const next: Record<UnitRole, number> = { line: 0, missile: 0, horse: 0 };
  const out: string[] = [];
  let left = gold;
  let misses = 0;
  for (let i = 0; out.length < maxUnits && misses < order.length; i++) {
    const role = order[i % order.length]!;
    const list = pool[role];
    let pick: UnitTypeDef | undefined;
    for (let k = 0; k < list.length && !pick; k++) {
      const t = list[(next[role] + k) % list.length]!;
      if (t.cost <= left) {
        pick = t;
        next[role] = (next[role] + k + 1) % list.length;
      }
    }
    if (!pick) {
      misses++;
      continue;
    }
    misses = 0;
    out.push(pick.id);
    left -= pick.cost;
  }
  return out;
}
