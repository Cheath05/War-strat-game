// Turns a historical battle into a scenario played from one side, at one difficulty: the
// enemy's armies grow or shrink with the difficulty, armies that came later in history
// arrive on time, and the battle's moments are announced as they happen.

import { groupDets } from '../economy/armies';
import type { ArmySlotDef, ScenarioDef, ScenarioSideDef } from '../data/types';
import { DIFFICULTIES, type BattleDef } from './types';

/** Parses 'rome.hastati*4, rome.velites*2' into a list of unit types. */
export function parseUnits(s: string): string[] {
  const out: string[] = [];
  for (const part of s.split(',')) {
    const t = part.trim();
    if (!t) continue;
    const [id, n] = t.split('*');
    const count = n ? Math.max(0, Math.floor(Number(n))) : 1;
    for (let k = 0; k < count; k++) out.push(id!.trim());
  }
  return out;
}

/** An army's units scaled to f times as many (rounded), keeping its mix. */
export function scaleUnits(units: string[], f: number): string[] {
  if (f === 1 || !units.length) return units;
  const n = Math.max(1, Math.round(units.length * f));
  if (n <= units.length) {
    // An even spread through the list, so every arm keeps its share.
    const out: string[] = [];
    for (let k = 0; k < n; k++) out.push(units[Math.floor((k * units.length) / n)]!);
    return out;
  }
  const out = [...units];
  for (let k = 0; out.length < n; k++) out.push(units[k % units.length]!);
  return out;
}

/** Slot key of a battle's army: side and index. */
export const slotKey = (side: number, i: number): string => `s${side}a${i}`;

/** The scenario for a battle played from `side` at difficulty `diff` (0..3). */
export function battleScenario(battle: BattleDef, side: number, diff: number): ScenarioDef {
  const d = DIFFICULTIES[diff] ?? DIFFICULTIES[1]!;
  const sides = battle.sides.map((bs, si): ScenarioSideDef => {
    const slots = bs.armies.map((a, i): ArmySlotDef => {
      const units = parseUnits(a.units);
      return {
        key: slotKey(si, i),
        name: a.general,
        title: a.title,
        faction: a.faction,
        deploy: a.zone,
        ai: a.ai ?? '',
        general: a.guard,
        reserve: a.arrive !== undefined,
        arrive: a.arrive,
        dets: groupDets(si === side ? units : scaleUnits(units, d.enemy)),
      };
    });
    return { name: bs.name, faction: bs.armies[0]!.faction, role: 'neutral', slots };
  });
  return {
    id: 'campaign',
    name: battle.name,
    year: battle.year,
    blurb: battle.history,
    mode: 'historical',
    hidden: true,
    map: battle.map,
    deploySeconds: battle.deploySeconds ?? 60,
    victory: battle.victory ?? [{ k: 'rout' }],
    events: battle.events,
    sides: [sides[0]!, sides[1]!],
  };
}
