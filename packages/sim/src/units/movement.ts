// Unit and soldier movement. A unit's anchor (the centre of its front rank) follows its
// order along a path; each soldier steers toward his slot behind the anchor, or toward the
// enemy he is fighting, while keeping clear of his neighbours and of impassable ground.

import type { Battle } from '../battle';
import { DT, TILE, sec } from '../constants';
import type { UnitTypeDef } from '../data/types';
import { clamp, dist, len, norm, turnToward } from '../math/det';
import { clearanceAt, passableAt, terrainSpeed } from '../map/mapgen';
import { findPath, classIndex } from '../map/pathfind';
import { MOVE } from '../map/terrain';
import type { Soldier, Unit } from '../types';
import { ACT, RANK, UF } from '../types';
import { FORM, depthOf, slotOffset, spacing } from './formation';

const PATHS_PER_TICK = 6;

export function moveMask(t: UnitTypeDef): number {
  if (t.cls === 'ele' || t.cls === 'chariot') return MOVE.large;
  return t.mounted ? MOVE.horse : MOVE.foot;
}

export function fatigueMult(b: Battle, u: Unit): number {
  if (!b.world.settings.fatigue) return 1;
  return 1 - clamp(u.fat - 40, 0, 60) * 0.004;
}

/** Officer stands this far in front of the front rank. */
export function officerLead(t: UnitTypeDef): number {
  return t.cls === 'ele' ? 3.5 : t.mounted || t.cls === 'chariot' ? 2.2 : 1.2;
}

/** Computes paths for units that asked for one, a few per tick, in unit order. */
export function processPaths(b: Battle): void {
  let budget = PATHS_PER_TICK;
  for (const u of b.world.units) {
    if (!(u.flags & UF.needPath)) continue;
    if (u.st === 'gone') {
      u.flags &= ~UF.needPath;
      continue;
    }
    if (budget-- <= 0) break;
    u.flags &= ~UF.needPath;
    const t = b.typeOf(u);
    let gx = u.order.x;
    let gy = u.order.y;
    if (u.order.k === 'attack') {
      const tu = b.unit(u.order.target);
      if (!tu) continue;
      const c = b.center(tu);
      gx = c.x;
      gy = c.y;
    } else if (u.st === 'routing' || u.st === 'shattered') {
      const a = b.army(u.army)!;
      gx = a.edgeX;
      gy = a.edgeY;
    } else if (u.order.k !== 'move') {
      continue;
    }
    u.path = findPath(b.map, u.ax, u.ay, gx, gy, moveMask(t));
  }
}

/** Moves every unit's anchor according to its order. */
export function updateAnchors(b: Battle): void {
  for (const u of b.world.units) {
    if (u.st === 'gone' || u.possBy) continue;
    const t = b.typeOf(u);
    const c = b.center(u);
    if (u.st === 'routing' || u.st === 'shattered') {
      // Flee along a path to the army's map edge, as a loose mob.
      const a = b.army(u.army)!;
      if (!u.path.length && !(u.flags & UF.needPath) && dist(u.ax, u.ay, a.edgeX, a.edgeY) > 6) u.flags |= UF.needPath;
      if (u.path.length) {
        const lag = dist(u.ax, u.ay, c.x, c.y);
        if (lag < 10) followPath(b, u, t, true, false, true);
      }
      continue;
    }
    if (u.st === 'rallying') continue;
    const o = u.order;
    if (o.k === 'move') {
      if (u.flags & UF.needPath) continue;
      const arrived = followPath(b, u, t, o.run);
      if (arrived) {
        if (o.dx || o.dy) {
          u.dx = o.dx;
          u.dy = o.dy;
        }
        if (o.width > 0) u.width = u.bw = o.width;
        o.k = 'none';
        u.st = u.engaged ? 'engaged' : 'idle';
      } else {
        u.st = 'moving';
      }
    } else if (o.k === 'attack') {
      attackMove(b, u, t, c);
    } else if (o.k === 'follow') {
      // Set by possession (a commander leading his detachment): o.x/o.y is the slot.
      const d = dist(u.ax, u.ay, o.x, o.y);
      if (d > 0.5) {
        u.path = [o.x, o.y];
        followPath(b, u, t, o.run || d > 12);
      }
      if (o.dx || o.dy) [u.dx, u.dy] = turnToward(u.dx, u.dy, o.dx, o.dy, 0.1);
      u.st = u.engaged ? 'engaged' : d > 1 ? 'moving' : 'idle';
    } else {
      u.st = u.engaged ? 'engaged' : 'idle';
    }
    if (u.st !== 'moving' && u.width !== u.bw && u.form !== 'wedge') {
      // Out of the narrows: spread back out.
      u.width = Math.min(u.bw, maxFilesAt(b, u, t, u.ax, u.ay));
    }
  }
}

function attackMove(b: Battle, u: Unit, t: UnitTypeDef, c: { x: number; y: number }): void {
  const o = u.order;
  const tu = b.unit(o.target);
  if (!tu || tu.st === 'gone' || (tu.st === 'shattered' && !t.mounted)) {
    o.k = 'none';
    u.flags &= ~UF.charging;
    u.st = u.engaged ? 'engaged' : 'idle';
    return;
  }
  const tc = b.center(tu);
  const d = dist(c.x, c.y, tc.x, tc.y);
  const [tdx, tdy] = norm(tc.x - c.x, tc.y - c.y, u.dx, u.dy);
  // Missile units close to range and shoot; they only melee if caught.
  if (t.missile && u.ammo > 0 && t.missile.kind !== 'pilum' && !(t.cls === 'inf')) {
    const want = t.missile.range * 0.85;
    if (d > want) {
      chaseStep(b, u, t, tc, o.run);
      u.st = 'moving';
    } else {
      [u.dx, u.dy] = turnToward(u.dx, u.dy, tdx, tdy, 0.1);
      u.path = [];
      u.st = u.engaged ? 'engaged' : 'idle';
    }
    return;
  }
  const fighting = u.engaged >= Math.max(2, u.sol.length * 0.2);
  if (fighting) {
    // Locked in melee: the anchor drifts to where the front actually is.
    const front = depthOf(u, t, Math.max(1, u.sol.length - 1), u.width) / 2;
    u.ax += (c.x + u.dx * front - u.ax) * 0.05;
    u.ay += (c.y + u.dy * front - u.ay) * 0.05;
    [u.dx, u.dy] = turnToward(u.dx, u.dy, tdx, tdy, 0.03);
    u.st = 'engaged';
    return;
  }
  const chargeDist = t.mounted || t.cls === 'chariot' || t.cls === 'ele' ? 40 : 18;
  if (o.run && d < chargeDist && !(u.flags & UF.charging) && !FORM[u.form].noRun) {
    u.flags |= UF.charging;
    u.chargeT = sec(4);
    b.emit({ k: 'charge', u: u.id, x: c.x, y: c.y });
  }
  chaseStep(b, u, t, tc, o.run || (u.flags & UF.charging) !== 0);
  [u.dx, u.dy] = turnToward(u.dx, u.dy, tdx, tdy, 0.12);
  u.st = 'moving';
}

/** Moves toward a (moving) target: straight when close and clear, else along a refreshed path. */
function chaseStep(b: Battle, u: Unit, t: UnitTypeDef, tc: { x: number; y: number }, run: boolean): void {
  const mask = moveMask(t);
  const d = dist(u.ax, u.ay, tc.x, tc.y);
  const direct = d < 60 && lineClearFast(b, u.ax, u.ay, tc.x, tc.y, mask);
  if (direct) {
    u.path = [tc.x, tc.y];
  } else if (!u.path.length || (b.world.tick + u.id) % sec(2) === 0) {
    u.flags |= UF.needPath;
  }
  if (u.path.length) followPath(b, u, t, run, true);
}

function lineClearFast(b: Battle, ax: number, ay: number, bx: number, by: number, mask: number): boolean {
  const steps = Math.ceil(dist(ax, ay, bx, by) / TILE);
  for (let s = 1; s <= steps; s++) {
    const f = s / steps;
    if (!passableAt(b.map, ax + (bx - ax) * f, ay + (by - ay) * f, mask)) return false;
  }
  return true;
}

/** Files that fit at a point, given the clearance on either side. */
function maxFilesAt(b: Battle, u: Unit, t: UnitTypeDef, x: number, y: number): number {
  const c = clearanceAt(b.map, x, y);
  if (c >= 20) return u.bw;
  const [sx] = spacing(t, u.form);
  const corridor = Math.max(TILE, (c * 2 - 1) * TILE);
  return Math.max(1, Math.floor(corridor / sx));
}

/**
 * Advances the anchor along u.path. Returns true when the path is finished. Slows down
 * when the men fall behind, and narrows the formation through gaps.
 */
function followPath(b: Battle, u: Unit, t: UnitTypeDef, run: boolean, keepFacing = false, fleeing = false): boolean {
  if (!u.path.length) return true;
  const wx = u.path[0]!;
  const wy = u.path[1]!;
  const dx = wx - u.ax;
  const dy = wy - u.ay;
  const d = len(dx, dy);
  const ci = classIndex(moveMask(t));
  let speed = (run && !FORM[u.form].noRun ? t.run : t.speed) * FORM[u.form].speed * fatigueMult(b, u);
  speed *= Math.max(0.35, terrainSpeed(b.map, u.ax, u.ay, ci));
  if (u.flags & UF.charging) speed *= 1.1;
  // Cohesion: wait for the men if the block has fallen behind the anchor.
  const c = b.center(u);
  if (c.n > 1 && !fleeing) {
    const n = Math.max(1, u.sol.length - 1);
    const back = depthOf(u, t, n, u.width) / 2;
    const lag = dist(u.ax - u.dx * back, u.ay - u.dy * back, c.x, c.y);
    if (lag > 12) speed *= 0.15;
    else if (lag > 6) speed *= 0.5;
  }
  const step = speed * DT;
  if (d <= step || d < 0.05) {
    u.ax = wx;
    u.ay = wy;
    u.path.splice(0, 2);
  } else {
    u.ax += (dx / d) * step;
    u.ay += (dy / d) * step;
    if (!keepFacing) [u.dx, u.dy] = turnToward(u.dx, u.dy, dx / d, dy / d, 0.1);
  }
  // Squeeze into a column through narrow ground ahead.
  if (u.form !== 'wedge' && !fleeing) {
    const ahead = Math.min(maxFilesAt(b, u, t, u.ax, u.ay), maxFilesAt(b, u, t, u.ax + u.dx * 8, u.ay + u.dy * 8));
    u.width = Math.min(u.bw, ahead);
  }
  return u.path.length === 0;
}

// --- Soldiers ---------------------------------------------------------------------------

const FLEE_EDGE = 2;

/** Steers and moves every soldier for this tick. */
export function steerSoldiers(b: Battle): void {
  const w = b.world;
  const map = b.map;
  const avatars = new Set<number>();
  for (const p of w.players) if (p.poss) avatars.add(p.poss);

  for (const s of w.soldiers) {
    if (s.hp <= 0) continue;
    const u = b.unit(s.u);
    if (!u) continue;
    const t = b.typeOf(u);
    const ci = classIndex(moveMask(t));
    const mask = moveMask(t);
    if (s.act > 0 && s.actK === ACT.knocked) {
      // Knocked down: slide to a stop.
      s.vx *= 0.7;
      s.vy *= 0.7;
      integrate(b, s, mask, u);
      continue;
    }
    let tx: number;
    let ty: number;
    let maxSpeed = t.speed;
    let arrive = true;
    const routing = u.st === 'routing' || u.st === 'shattered';

    if (avatars.has(s.id)) {
      // Possessed officer: velocity was set by the possession system.
      integrate(b, s, mask, u);
      continue;
    } else if (routing) {
      const a = b.army(u.army)!;
      if (s.x < FLEE_EDGE || s.y < FLEE_EDGE || s.x > map.wm - FLEE_EDGE || s.y > map.hm - FLEE_EDGE) {
        s.hp = -1; // fled the field
        continue;
      }
      maxSpeed = t.run * 1.05;
      arrive = false;
      const atEdge = !u.path.length && dist(u.ax, u.ay, a.edgeX, a.edgeY) < 8;
      if (atEdge) {
        // Run off the map past the edge point.
        const [ox, oy] = norm(a.edgeX - map.wm / 2, a.edgeY - map.hm / 2);
        tx = a.edgeX + ox * 10 + ((s.slot % 7) - 3) * 1.5;
        ty = a.edgeY + oy * 10 + ((s.slot % 5) - 2) * 1.5;
      } else {
        // A loose mob around the fleeing anchor.
        const [mx, my] = norm(u.ax - s.x, u.ay - s.y, u.dx, u.dy);
        tx = u.ax + mx * 4 + ((s.slot % 7) - 3) * 1.6 * -u.dy;
        ty = u.ay + my * 4 + ((s.slot % 7) - 3) * 1.6 * u.dx;
      }
    } else if (s.tgt) {
      const e = b.soldier(s.tgt);
      if (!e || e.hp <= 0) {
        s.tgt = 0;
        [tx, ty] = slotPos(b, u, t, s);
      } else {
        const eu = b.unit(e.u)!;
        const reach = t.reach + t.radius + b.typeOf(eu).radius;
        const d = dist(s.x, s.y, e.x, e.y);
        const [nx, ny] = norm(e.x - s.x, e.y - s.y, s.fx, s.fy);
        // Close to striking distance and hold there.
        const stand = Math.max(t.radius + b.typeOf(eu).radius, reach - 0.35);
        tx = s.x + nx * (d - stand);
        ty = s.y + ny * (d - stand);
        maxSpeed = d > reach + 3 ? t.run : t.speed;
        s.fx = nx;
        s.fy = ny;
      }
    } else {
      [tx, ty] = slotPos(b, u, t, s);
    }

    // Desired velocity toward the target point.
    let dx = tx - s.x;
    let dy = ty - s.y;
    const d = len(dx, dy);
    const running = u.order.run || (u.flags & UF.charging) !== 0;
    if (!routing && !s.tgt) maxSpeed = running && !FORM[u.form].noRun ? t.run : d > 3 ? t.run * 0.85 : t.speed * FORM[u.form].speed;
    maxSpeed *= terrainSpeed(map, s.x, s.y, ci) * fatigueMult(b, u);
    if (u.flags & UF.charging) maxSpeed *= 1.1;
    let vx = 0;
    let vy = 0;
    if (d > 0.05) {
      const sp = arrive ? Math.min(maxSpeed, d * 2.5) : maxSpeed;
      vx = (dx / d) * sp;
      vy = (dy / d) * sp;
    }

    // Separation from neighbours.
    const r = t.radius;
    let px = 0;
    let py = 0;
    b.grid.query(s.x, s.y, r + 2.4, (j) => {
      const o = w.soldiers[j]!;
      if (o === s || o.hp <= 0) return;
      const ou = b.unit(o.u);
      if (!ou) return;
      const ot = b.typeOf(ou);
      const minD = r + ot.radius + (ou.side === u.side ? 0.05 : 0.15);
      const ox = s.x - o.x;
      const oy = s.y - o.y;
      const d2 = ox * ox + oy * oy;
      if (d2 >= minD * minD) return;
      const od = Math.sqrt(d2);
      const push = od > 1e-6 ? (minD - od) / od : 0;
      const massK = ot.mass / (ot.mass + t.mass);
      const k = (ou.side === u.side ? 3 : 5) * massK;
      if (od > 1e-6) {
        px += ox * push * k;
        py += oy * push * k;
      } else {
        px += ((s.id % 7) - 3) * 0.1;
        py += ((o.id % 5) - 2) * 0.1;
      }
    });
    vx += px;
    vy += py;
    const vl = len(vx, vy);
    const cap = maxSpeed * 1.4 + 0.5;
    if (vl > cap) {
      vx = (vx / vl) * cap;
      vy = (vy / vl) * cap;
    }
    const accel = t.cls === 'ele' ? 0.12 : t.mounted || t.cls === 'chariot' ? 0.2 : 0.4;
    s.vx += (vx - s.vx) * accel;
    s.vy += (vy - s.vy) * accel;
    integrate(b, s, mask, u);

    // Face the fight, the march, or the unit's front.
    if (!s.tgt) {
      const sp = len(s.vx, s.vy);
      if (sp > 0.6 && !routing) [s.fx, s.fy] = turnToward(s.fx, s.fy, s.vx / sp, s.vy / sp, 0.25);
      else if (routing && sp > 0.3) [s.fx, s.fy] = turnToward(s.fx, s.fy, s.vx / sp, s.vy / sp, 0.3);
      else [s.fx, s.fy] = turnToward(s.fx, s.fy, u.dx, u.dy, 0.15);
    }
  }
}

/** Moves a soldier by its velocity, sliding along impassable ground. */
function integrate(b: Battle, s: Soldier, mask: number, u: Unit): void {
  const map = b.map;
  const nx = s.x + s.vx * DT;
  const ny = s.y + s.vy * DT;
  const routing = u.st === 'routing' || u.st === 'shattered';
  const lo = routing ? 0.01 : 0.5;
  if (passableAt(map, nx, ny, mask)) {
    s.x = nx;
    s.y = ny;
  } else if (passableAt(map, nx, s.y, mask)) {
    s.x = nx;
    s.vy *= 0.3;
  } else if (passableAt(map, s.x, ny, mask)) {
    s.y = ny;
    s.vx *= 0.3;
  } else {
    s.vx = 0;
    s.vy = 0;
  }
  s.x = clamp(s.x, lo, map.wm - lo);
  s.y = clamp(s.y, lo, map.hm - lo);
}

/** World position of a soldier's formation slot (or the officer's place in front). */
export function slotPos(b: Battle, u: Unit, t: UnitTypeDef, s: Soldier): [number, number] {
  const rx = -u.dy;
  const ry = u.dx;
  if (s.id === u.cap) {
    if (s.rank === RANK.general && !u.possBy) {
      const back = depthOf(u, t, Math.max(1, u.sol.length - 1), u.width) / 2;
      return [u.ax - u.dx * back, u.ay - u.dy * back];
    }
    const lead = officerLead(t);
    return [u.ax + u.dx * lead, u.ay + u.dy * lead];
  }
  const n = u.sol.length - (u.cap ? 1 : 0);
  const [lat, back] = slotOffset(u, t, s.slot, n, u.width);
  return [u.ax + rx * lat - u.dx * back, u.ay + ry * lat - u.dy * back];
}

/** Re-numbers slots after losses so the rear ranks step forward. */
export function repackSlots(b: Battle, u: Unit): void {
  let k = 0;
  for (const id of u.sol) {
    const s = b.soldier(id);
    if (!s || id === u.cap) continue;
    s.slot = k++;
  }
}
