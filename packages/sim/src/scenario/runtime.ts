// Scenario scripts: per-scenario logic (waves, events, objectives) run once per tick.
// Generic capture points are handled here for every scenario.

import type { Battle } from '../battle';
import { TICK_HZ } from '../constants';
import { dist } from '../math/det';

export type ScenarioScript = (b: Battle) => void;

const SCRIPTS = new Map<string, ScenarioScript>();

export function registerScenarioScript(id: string, fn: ScenarioScript): void {
  SCRIPTS.set(id, fn);
}

export function runScenario(b: Battle): void {
  const fn = SCRIPTS.get(b.world.scenario.id);
  if (fn) fn(b);
  if (b.world.objectives.length && b.world.tick % 5 === 0) updatePoints(b);
}

/** Capture points: the side with men on the point and no enemies there pulls it over. */
function updatePoints(b: Battle): void {
  const w = b.world;
  for (const o of w.objectives) {
    if (o.kind !== 'point') continue;
    const count = [0, 0];
    b.grid.query(o.x, o.y, o.r, (j) => {
      const s = w.soldiers[j]!;
      if (s.hp <= 0 || dist(s.x, s.y, o.x, o.y) > o.r) return;
      const u = b.unit(s.u);
      if (!u || u.st === 'routing' || u.st === 'shattered') return;
      count[u.side]!++;
    });
    const a = count[0]!;
    const c = count[1]!;
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
}

/** Seconds since the battle phase began. */
export function battleSeconds(b: Battle): number {
  return b.world.scenario.t / TICK_HZ;
}
