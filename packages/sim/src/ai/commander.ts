// Commander AI: carries out a detachment order (hold, advance, attack, flank, skirmish,
// reserve, guard, retreat) by laying out and ordering the detachment's units. Runs for
// every detachment without a connected human commander.

import type { Battle } from '../battle';
import { dist, norm } from '../math/det';
import type { Detachment, Unit } from '../types';
import { UF } from '../types';
import { orderAttack, orderMove } from '../commands';
import { attackerOf } from './captain';
import { aiDetachment, centroid, detUnits, fighting, isCav, isMissile, nearestEnemy, towardEnemy, unitFrontage } from './util';

const EVERY = 10;

export function commanderAI(b: Battle): void {
  const w = b.world;
  for (const d of w.dets) {
    if ((w.tick + d.id) % EVERY !== 0) continue;
    if (!aiDetachment(b, d) || d.order.k === 'none') continue;
    execute(b, d);
  }
}

/** Units the commander may order: not possessed, not under a player's direct order. */
function free(b: Battle, d: Detachment): Unit[] {
  return detUnits(b, d).filter((u) => !u.possBy && u.st !== 'rallying' && !(u.order.manual && u.order.k !== 'none') && u.follow === 0);
}

function execute(b: Battle, d: Detachment): void {
  const units = free(b, d);
  if (!units.length) return;
  const o = d.order;
  switch (o.k) {
    case 'hold':
      return line(b, d, units, o.x, o.y, 28, false);
    case 'advance':
      return line(b, d, units, o.x, o.y, 40, false);
    case 'attack':
      return attack(b, d, units);
    case 'flankL':
    case 'flankR':
      return flank(b, d, units, o.k === 'flankL' ? -1 : 1);
    case 'skirmish':
      return skirmish(b, d, units);
    case 'reserve':
      return reserve(b, d, units);
    case 'guard':
      // The general's own guard moves to the spot the general picked; others shield him.
      // (The general's guard never chases: it only fights whoever reaches it.)
      return d.guard ? line(b, d, units, o.x, o.y, 0, false) : guard(b, d, units);
    case 'retreat': {
      const a = b.army(d.army)!;
      const zx = (a.zone[0]! + a.zone[2]!) / 2;
      const zy = (a.zone[1]! + a.zone[3]!) / 2;
      return line(b, d, units, zx, zy, 0, true);
    }
  }
}

/** Moves a unit only if it isn't already heading (close to) there. */
export function moveIfNeeded(b: Battle, u: Unit, x: number, y: number, fx: number, fy: number, run: boolean, slack = 4): void {
  const there = u.order.k === 'move' ? dist(u.order.x, u.order.y, x, y) : dist(u.ax, u.ay, x, y);
  if (u.order.k === 'move' && there < slack) return;
  if (u.order.k !== 'move' && there < slack && u.st !== 'moving') {
    if (u.dx * fx + u.dy * fy < 0.9) orderMove(b, u, u.ax, u.ay, fx, fy, 0, false, false);
    return;
  }
  orderMove(b, u, x, y, fx, fy, 0, run, false);
}

/**
 * Holds or advances a line at (x, y): main units side by side, missile units in front
 * (falling back behind when the enemy closes), cavalry on the ends. Units engage enemies
 * that come within `engage` metres.
 */
function line(b: Battle, d: Detachment, units: Unit[], x: number, y: number, engage: number, run: boolean): void {
  const [fx, fy] = towardEnemy(b, x, y, d.side, units[0]!.dx, units[0]!.dy);
  const rx = -fy;
  const ry = fx;
  const main = units.filter((u) => !isMissile(b, u) && !isCav(b, u));
  const screen = units.filter((u) => isMissile(b, u));
  const cav = units.filter((u) => isCav(b, u) && !isMissile(b, u));
  const enemy = nearestEnemy(b, x, y, d.side, 1e9);
  const enemyD = enemy ? dist(x, y, b.center(enemy).x, b.center(enemy).y) : 1e9;

  const place = (row: Unit[], fwd: number, lat0 = 0): void => {
    const total = row.reduce((s, u) => s + unitFrontage(b, u), 0) + Math.max(0, row.length - 1) * 3;
    let cur = lat0 - total / 2;
    for (const u of row) {
      const fw = unitFrontage(b, u);
      const lat = cur + fw / 2;
      cur += fw + 3;
      const tx = x + rx * lat + fx * fwd;
      const ty = y + ry * lat + fy * fwd;
      if (!engageNear(b, u, engage)) moveIfNeeded(b, u, tx, ty, fx, fy, run);
    }
  };
  place(main, 0);
  // Skirmishers in front until the enemy is close, then behind the line.
  place(screen, enemyD < 45 && main.length ? -14 : main.length ? 12 : 0);
  const mainW = main.reduce((s, u) => s + unitFrontage(b, u), 0) + 6;
  cav.forEach((u, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const lat = side * (mainW / 2 + unitFrontage(b, u) / 2 + 6 + Math.floor(i / 2) * 14);
    const tx = x + rx * lat;
    const ty = y + ry * lat;
    if (!engageNear(b, u, engage + 10)) moveIfNeeded(b, u, tx, ty, fx, fy, run);
  });
}

/** Engages the nearest enemy within r of the unit; true if it did. */
function engageNear(b: Battle, u: Unit, r: number): boolean {
  if (r <= 0) return false;
  if (u.engaged > 0) {
    const foe = attackerOf(b, u);
    if (foe && u.order.k !== 'attack') orderAttack(b, u, foe.id, false, false);
    return true;
  }
  const c = b.center(u);
  if (isMissile(b, u)) {
    u.flags |= UF.fireAtWill;
    return false;
  }
  const e = nearestEnemy(b, c.x, c.y, u.side, r, (o) => o.st !== 'routing' || isCav(b, u));
  if (!e) {
    if (u.order.k === 'attack') {
      const tu = b.unit(u.order.target);
      if (!fighting(tu)) u.order.k = 'none';
    }
    return u.order.k === 'attack';
  }
  const ec = b.center(e);
  orderAttack(b, u, e.id, dist(c.x, c.y, ec.x, ec.y) < 30, false);
  return true;
}

/** Attack the order's target unit (or what's near the order point), spreading out. */
function attack(b: Battle, d: Detachment, units: Unit[]): void {
  const o = d.order;
  let focus = b.unit(o.t);
  if (!fighting(focus)) {
    const c = centroid(b, units)!;
    focus = nearestEnemy(b, o.x || c.x, o.y || c.y, d.side);
    if (!focus) return;
    o.t = focus.id;
  }
  const fc = b.center(focus);
  // Candidates: the target and enemies near it.
  const cands = b.world.units.filter((e) => e.side !== d.side && fighting(e) && b.center(e).n && dist(b.center(e).x, b.center(e).y, fc.x, fc.y) < 45);
  const load = new Map<number, number>();
  for (const u of units) {
    if (isMissile(b, u)) {
      u.flags |= UF.fireAtWill;
      u.fireT = focus.id;
      const m = b.typeOf(u).missile!;
      const c = b.center(u);
      if (dist(c.x, c.y, fc.x, fc.y) > m.range * 0.85) orderAttack(b, u, focus.id, false, false);
      continue;
    }
    if (u.engaged > 0 && u.order.k === 'attack') continue;
    const c = b.center(u);
    let best = focus;
    let bestS = Infinity;
    for (const e of cands) {
      const ec = b.center(e);
      const s = dist(c.x, c.y, ec.x, ec.y) + (load.get(e.id) ?? 0) * 25 + (e.st === 'routing' ? 40 : 0);
      if (s < bestS) {
        bestS = s;
        best = e;
      }
    }
    load.set(best.id, (load.get(best.id) ?? 0) + 1);
    // Cavalry goes for the rear of an enemy already locked in melee.
    if (isCav(b, u) && best.engaged > 0) {
      const bc = b.center(best);
      const rx = bc.x - best.dx * 22;
      const ry = bc.y - best.dy * 22;
      if (dist(c.x, c.y, rx, ry) > 14 && dist(c.x, c.y, bc.x, bc.y) > 18) {
        moveIfNeeded(b, u, rx, ry, best.dx, best.dy, true, 8);
        continue;
      }
    }
    const bc = b.center(best);
    orderAttack(b, u, best.id, dist(c.x, c.y, bc.x, bc.y) < (isCav(b, u) ? 70 : 32), false);
  }
}

/** Swing around one end of the enemy line, then hit them from behind. */
function flank(b: Battle, d: Detachment, units: Unit[], side: number): void {
  const c = centroid(b, units);
  if (!c) return;
  const [fx, fy] = towardEnemy(b, c.x, c.y, d.side, units[0]!.dx, units[0]!.dy);
  const rx = -fy * side;
  const ry = fx * side;
  // Enemy unit furthest toward our flank side.
  let end: Unit | undefined;
  let endS = -Infinity;
  for (const e of b.world.units) {
    if (e.side === d.side || !fighting(e)) continue;
    const ec = b.center(e);
    if (!ec.n) continue;
    const s = (ec.x - c.x) * rx + (ec.y - c.y) * ry - Math.abs((ec.x - c.x) * fx + (ec.y - c.y) * fy) * 0.2;
    if (s > endS) {
      endS = s;
      end = e;
    }
  }
  if (!end) return;
  const ec = b.center(end);
  if (d.stage === 0) {
    const wx = ec.x + rx * 45 - fx * 10;
    const wy = ec.y + ry * 45 - fy * 10;
    let arrived = true;
    for (const u of units) {
      if (dist(b.center(u).x, b.center(u).y, wx, wy) > 25) arrived = false;
      if (!engageNear(b, u, 12)) moveIfNeeded(b, u, wx, wy, -rx, -ry, true, 10);
    }
    if (arrived || dist(c.x, c.y, ec.x, ec.y) < 35) d.stage = 1;
    return;
  }
  // Stage 1: charge the engaged enemy nearest us, from wherever we are (often the rear).
  for (const u of units) {
    const uc = b.center(u);
    const tgt = nearestEnemy(b, uc.x, uc.y, d.side, 160, (e) => e.engaged > 0) ?? nearestEnemy(b, uc.x, uc.y, d.side, 200);
    if (!tgt) continue;
    if (u.order.k === 'attack' && u.order.target === tgt.id) continue;
    orderAttack(b, u, tgt.id, true, false);
  }
}

/** Missile units harass from range and fall back from melee; others hold behind them. */
function skirmish(b: Battle, d: Detachment, units: Unit[]): void {
  for (const u of units) {
    const c = b.center(u);
    if (!isMissile(b, u)) {
      engageNear(b, u, 20);
      continue;
    }
    u.flags |= UF.fireAtWill | UF.skirmish;
    const m = b.typeOf(u).missile!;
    const e = nearestEnemy(b, c.x, c.y, d.side, 400);
    if (!e) continue;
    const ec = b.center(e);
    const dd = dist(c.x, c.y, ec.x, ec.y);
    if (u.flags & UF.evading) continue;
    if (dd > m.range * 0.9) {
      const [ax, ay] = norm(ec.x - c.x, ec.y - c.y);
      const tx = ec.x - ax * m.range * 0.75;
      const ty = ec.y - ay * m.range * 0.75;
      moveIfNeeded(b, u, tx, ty, ax, ay, false, 10);
    } else {
      u.fireT = e.id;
    }
  }
}

/** Wait behind the army; commit to help any friend in trouble nearby. */
function reserve(b: Battle, d: Detachment, units: Unit[]): void {
  const a = b.army(d.army)!;
  const others = b.world.units.filter((u) => u.army === a.id && u.det !== d.id && fighting(u));
  const c = centroid(b, others) ?? centroid(b, units)!;
  const [fx, fy] = towardEnemy(b, c.x, c.y, d.side, units[0]!.dx, units[0]!.dy);
  // A friend in trouble: engaged and wavering or outnumbered.
  let trouble: Unit | undefined;
  for (const f of others) {
    if (f.engaged > 0 && (f.morale < 35 || f.sol.length < f.max * 0.6)) {
      const fc = b.center(f);
      if (!trouble || dist(fc.x, fc.y, c.x, c.y) < dist(b.center(trouble).x, b.center(trouble).y, c.x, c.y)) trouble = f;
    }
  }
  if (trouble) {
    const foe = attackerOf(b, trouble);
    if (foe) {
      for (const u of units) if (!isMissile(b, u)) orderAttack(b, u, foe.id, true, false);
      return;
    }
  }
  line(b, d, units, c.x - fx * 32, c.y - fy * 32, 18, false);
}

/** Stay close to the general and cut down anyone who comes for him. */
function guard(b: Battle, d: Detachment, units: Unit[]): void {
  const a = b.army(d.army)!;
  const g = b.soldier(a.genSoldier);
  if (!g) return reserve(b, d, units);
  const e = nearestEnemy(b, g.x, g.y, d.side, 28);
  for (const u of units) {
    if (e) {
      orderAttack(b, u, e.id, true, false);
      continue;
    }
    const [fx, fy] = towardEnemy(b, g.x, g.y, d.side, u.dx, u.dy);
    moveIfNeeded(b, u, g.x - fx * 8 + (u.id % 3) * 4, g.y - fy * 8, fx, fy, false, 8);
  }
}

export { line as holdLine };
