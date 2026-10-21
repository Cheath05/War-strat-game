// Morale and fatigue. Morale is recomputed every few ticks from the unit's situation
// (Total War-style modifiers); below zero the unit routs. Routers can rally once they are
// out of danger, unless they've broken too often or lost too many men (shattered).

import type { Battle } from '../battle';
import { sec } from '../constants';
import { clamp, dist } from '../math/det';
import type { Unit } from '../types';
import { UF } from '../types';
import { aiEdge } from '../combat/damage';
import { UNDER_FIRE_TICKS } from '../combat/missiles';

const MORALE_EVERY = 5;
const AURA = 45;

export function updateMorale(b: Battle): void {
  const w = b.world;
  for (const u of w.units) {
    if (u.st === 'gone') continue;
    if (u.shock > 0) u.shock--;
    if (u.recentLoss > 0) u.recentLoss = u.recentLoss < 0.01 ? 0 : u.recentLoss * 0.994;
    if (w.settings.fatigue) updateFatigue(u);
    if ((w.tick + u.id) % MORALE_EVERY !== 0) continue;
    u.morale = computeMorale(b, u);
    transition(b, u);
  }
  for (const a of w.armies) if (a.shock > 0) a.shock--;
}

function updateFatigue(u: Unit): void {
  let d: number;
  if (u.st === 'routing' || u.st === 'shattered') d = 0.04;
  else if (u.engaged > 0) d = 0.035;
  else if (u.st === 'moving' && (u.order.run || u.flags & UF.charging)) d = 0.045;
  else if (u.st === 'moving') d = 0.004;
  else d = -0.05;
  u.fat = clamp(u.fat + d, 0, 100);
}

export function computeMorale(b: Battle, u: Unit): number {
  const t = b.typeOf(u);
  const army = b.army(u.army)!;
  const c = b.center(u);
  let m = t.morale;
  // The general's presence.
  const gen = b.soldier(army.genSoldier);
  if (gen && !army.genDead) {
    if (u.id === army.genUnit) m += 15;
    else if (dist(c.x, c.y, gen.x, gen.y) < AURA * (genLed(b, army.genUnit) ? 1.5 : 1)) m += genLed(b, army.genUnit) ? 15 : 10;
  }
  if (u.possBy) m += 12;
  if (u.buff > 0) m += 15;
  // Casualties: overall and recent.
  const strength = u.sol.length / Math.max(1, u.max);
  m -= (1 - strength) * 40;
  m -= Math.min(30, (u.recentLoss / Math.max(4, u.max)) * 80);
  // Attacked from the flank or rear.
  if (u.flank === 1) m -= 10;
  else if (u.flank === 2) m -= 22;
  m -= Math.min(20, u.shock / 3);
  if (army.shock > 0) m -= 15;
  if (army.genDead) m -= 6;
  if (!u.cap) m -= 8;
  // Friends breaking nearby; terror; outnumbering foes nearby.
  let routers = 0;
  let terror = 0;
  for (const o of b.world.units) {
    if (o.id === u.id || o.st === 'gone') continue;
    const oc = b.center(o);
    if (!oc.n) continue;
    const d = dist(c.x, c.y, oc.x, oc.y);
    if (o.side === u.side) {
      if ((o.st === 'routing' || o.st === 'shattered') && d < 35) routers++;
    } else if (d < 28) {
      const ot = b.typeOf(o);
      if (ot.terror && o.st !== 'routing') terror = Math.max(terror, ot.terror);
    }
  }
  m -= Math.min(3, routers) * 6;
  if (terror && t.cls !== 'ele') m -= terror;
  if (b.world.settings.fatigue) m -= u.fat > 85 ? 14 : u.fat > 65 ? 6 : 0;
  if (u.engaged === 0 && b.world.tick - u.hitT < UNDER_FIRE_TICKS) m -= 6;
  m += aiEdge(b, u);
  return clamp(m, -60, 130);
}

function genLed(b: Battle, genUnit: number): boolean {
  const gu = b.unit(genUnit);
  return !!gu && gu.possBy !== 0;
}

function transition(b: Battle, u: Unit): void {
  const w = b.world;
  if (!w.settings.morale) {
    if (u.st === 'routing' || u.st === 'rallying') u.st = 'idle';
    return;
  }
  if (u.st === 'routing' || u.st === 'shattered') {
    const near = nearestEnemyDist(b, u);
    u.enemyD = near;
    u.calm = near > 30 ? u.calm + MORALE_EVERY : 0;
    const strength = u.sol.length / Math.max(1, u.max);
    if (u.st === 'routing' && (strength < 0.2 || u.routs >= 3)) {
      u.st = 'shattered';
      b.emit({ k: 'shatter', u: u.id });
      return;
    }
    if (u.st === 'routing' && u.calm >= sec(8) && u.morale > 12) {
      u.st = 'rallying';
      u.calm = 0;
      const c = b.center(u);
      u.ax = c.x;
      u.ay = c.y;
      u.path = [];
    }
    return;
  }
  if (u.st === 'rallying') {
    u.calm += MORALE_EVERY;
    if (u.calm >= sec(6)) {
      u.st = 'idle';
      u.calm = 0;
      u.order.k = 'none';
      b.emit({ k: 'rally', u: u.id });
      b.msg(`${b.typeOf(u).name} have rallied!`, 'good', u.side);
    }
    return;
  }
  if (u.morale < 0) rout(b, u);
}

export function rout(b: Battle, u: Unit): void {
  u.st = 'routing';
  u.routs++;
  u.order = { k: 'none', x: 0, y: 0, dx: 0, dy: 0, width: 0, target: 0, run: true, manual: false };
  u.flags &= ~(UF.charging | UF.brace | UF.hold);
  u.flags |= UF.needPath;
  u.chargeT = 0;
  u.calm = 0;
  for (const id of u.sol) {
    const s = b.soldier(id);
    if (s) s.tgt = 0;
  }
  b.emit({ k: 'rout', u: u.id });
  b.msg(`${b.army(u.army)!.title}: ${b.typeOf(u).name} are routing!`, 'bad', u.side);
  b.msg(`Enemy ${b.typeOf(u).name} are routing!`, 'good', 1 - u.side);
}

function nearestEnemyDist(b: Battle, u: Unit): number {
  const c = b.center(u);
  let best = 1e9;
  for (const o of b.world.units) {
    if (o.side === u.side || o.st === 'gone' || o.st === 'routing' || o.st === 'shattered') continue;
    const oc = b.center(o);
    if (!oc.n) continue;
    best = Math.min(best, dist(c.x, c.y, oc.x, oc.y));
  }
  return best;
}
