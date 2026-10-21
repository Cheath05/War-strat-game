// Scenario scripts: per-scenario logic (waves, events, objectives) run once per tick.
// Generic capture points are handled here for every scenario.

import type { Battle } from '../battle';
import { TICK_HZ } from '../constants';
import { dist } from '../math/det';
import { payIncome } from '../economy/gold';

export type ScenarioScript = (b: Battle) => void;

const SCRIPTS = new Map<string, ScenarioScript>();

export function registerScenarioScript(id: string, fn: ScenarioScript): void {
  SCRIPTS.set(id, fn);
}

export function runScenario(b: Battle): void {
  const fn = SCRIPTS.get(b.world.scenario.id);
  if (fn) fn(b);
  payIncome(b);
  if (b.world.objectives.length && b.world.tick % 5 === 0) updatePoints(b);
}

/** Capture points: the side with men on the point and no enemies there pulls it over. */
function updatePoints(b: Battle): void {
  const w = b.world;
  // (A plain pass over the soldiers: the spatial grid is stale this early in the tick.)
  const pts = w.objectives.filter((o) => o.kind === 'point');
  const count = pts.map(() => [0, 0]);
  for (const s of w.soldiers) {
    if (s.hp <= 0) continue;
    for (let k = 0; k < pts.length; k++) {
      const o = pts[k]!;
      if (Math.abs(s.x - o.x) > o.r || Math.abs(s.y - o.y) > o.r || dist(s.x, s.y, o.x, o.y) > o.r) continue;
      const u = b.unit(s.u);
      if (u && u.st !== 'routing' && u.st !== 'shattered') count[k]![u.side]!++;
    }
  }
  for (let k = 0; k < pts.length; k++) {
    const o = pts[k]!;
    const a = count[k]![0]!;
    const c = count[k]![1]!;
    const before = o.owner;
    if (a > 0 && c === 0) o.prog = Math.max(-100, o.prog - Math.min(4, 1 + a / 10));
    else if (c > 0 && a === 0) o.prog = Math.min(100, o.prog + Math.min(4, 1 + c / 10));
    if (o.prog <= -100) o.owner = 0;
    else if (o.prog >= 100) o.owner = 1;
    else if ((o.owner === 0 && o.prog > 0) || (o.owner === 1 && o.prog < 0)) o.owner = -1;
    if (o.owner !== before) {
      b.emit({ k: 'objective', id: o.id, owner: o.owner });
      if (o.owner >= 0) b.msg(`${w.sides[o.owner]!.name} captured ${o.name}!`, 'info');
    }
  }
  // Victory points: every point held scores one a second for its owner.
  if (w.tick % TICK_HZ === 0 && b.scenario.victory.some((r) => r.k === 'points' || r.k === 'deadline')) {
    for (const o of w.objectives) if (o.owner >= 0) w.sides[o.owner]!.score++;
  }
}

/** Seconds since the battle phase began. */
export function battleSeconds(b: Battle): number {
  return b.world.scenario.t / TICK_HZ;
}

/** Fires a one-off scenario event; returns true the first time only. */
export function once(b: Battle, key: string): boolean {
  const f = b.world.scenario.fired;
  if (f.includes(key)) return false;
  f.push(key);
  return true;
}
