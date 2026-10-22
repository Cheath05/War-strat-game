// Unit and soldier movement. A unit's anchor (the centre of its front rank) follows its
// order along a path; each soldier steers toward his slot behind the anchor, or toward the
// enemy he is fighting, while keeping clear of his neighbours and of impassable ground.
// A column squeezed through a gap lays its ranks along the anchor's trail, and a man cut off
// from his slot by a wall follows that trail round instead of pressing against the wall.

import type { Battle } from '../battle';
import { DT, PACE, TILE, sec } from '../constants';
import type { UnitTypeDef } from '../data/types';
import { clamp, dist, len, norm, turnToward } from '../math/det';
import { dryAt, easyLine, passableAt, terrainSpeed } from '../map/mapgen';
import { findPath, classIndex } from '../map/pathfind';
import { MOVE } from '../map/terrain';
import type { Soldier, Unit } from '../types';
import { ACT, RANK, UF } from '../types';
import { FORM, depthOf, slotOffset, spacing } from './formation';
import { isRanged } from '../combat/missiles';

const PATHS_PER_TICK = 6;

/** Spacing of trail points, in metres. */
const TRAIL_STEP = 1;
/** Room a soldier keeps between his body and a wall, cliff or the sea's edge, in metres. */
const WALL_GAP = 0.35;

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
        if (o.width > 0) {
          u.bw = o.width;
          setWidth(b, u, o.width);
        }
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
      setWidth(b, u, maxFilesAt(b, u, t, u.ax, u.ay));
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
  if (t.missile && isRanged(u, b) && (u.ammo > 0 || !b.world.settings.ammo)) {
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

/**
 * Moves toward a (moving) target: straight when close and the way is clear (and doesn't wade
 * through water or bog that neither end is in), else along a refreshed path.
 */
function chaseStep(b: Battle, u: Unit, t: UnitTypeDef, tc: { x: number; y: number }, run: boolean): void {
  const mask = moveMask(t);
  const ci = classIndex(mask);
  const d = dist(u.ax, u.ay, tc.x, tc.y);
  const easy = Math.min(0.75, terrainSpeed(b.map, u.ax, u.ay, ci), terrainSpeed(b.map, tc.x, tc.y, ci));
  const direct = d < 60 && easyLine(b.map, u.ax, u.ay, tc.x, tc.y, mask, ci, easy);
  if (direct) {
    u.path = [tc.x, tc.y];
  } else if (!u.path.length || (b.world.tick + u.id) % sec(2) === 0) {
    u.flags |= UF.needPath;
  }
  if (u.path.length) followPath(b, u, t, run, true);
}


/** Furthest a unit looks to either side for room, in metres. */
const ROOM_MAX = 40;

/**
 * Open ground to the left and right of (x, y) across the unit's front, in metres. On dry
 * ground, water and bog count as edges too, so a unit marching along a shore keeps out of it.
 */
function sideRoom(b: Battle, u: Unit, t: UnitTypeDef, x: number, y: number): [number, number] {
  const mask = moveMask(t);
  const dry = dryAt(b.map, x, y);
  const rx = -u.dy;
  const ry = u.dx;
  const room = (sgn: number): number => {
    for (let d = TILE * 0.5; d <= ROOM_MAX; d += TILE * 0.5) {
      const px = x + rx * d * sgn;
      const py = y + ry * d * sgn;
      if (!passableAt(b.map, px, py, mask) || (dry && !dryAt(b.map, px, py))) return d - TILE * 0.5;
    }
    return ROOM_MAX;
  };
  return [room(-1), room(1)];
}

/**
 * Files that fit across the gap at a point (measured across the unit's front, so walls and
 * water ahead or behind don't squeeze it).
 */
function maxFilesAt(b: Battle, u: Unit, t: UnitTypeDef, x: number, y: number): number {
  const [l, r] = sideRoom(b, u, t, x, y);
  const [sx] = spacing(t, u.form);
  return Math.max(1, Math.min(u.bw, Math.floor((l + r + TILE * 0.5) / sx)));
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
  let speed = (run && !FORM[u.form].noRun ? t.run : t.speed) * PACE * FORM[u.form].speed * fatigueMult(b, u);
  speed *= Math.max(0.35, terrainSpeed(b.map, u.ax, u.ay, ci));
  if (u.flags & UF.charging) speed *= 1.1;
  // Cohesion: wait for the men if the block has fallen behind the anchor.
  const c = b.center(u);
  if (c.n > 1 && !fleeing) {
    const n = Math.max(1, u.sol.length - 1);
    const back = depthOf(u, t, n, u.width) / 2;
    const [mx, my] = inColumn(u) ? trailAt(u, back) : [u.ax - u.dx * back, u.ay - u.dy * back];
    const lag = dist(mx, my, c.x, c.y);
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
  // Squeeze into a column through narrow ground ahead, and keep the block off a wall or
  // shore that is close on one side when there is room on the other.
  if (u.form !== 'wedge' && !fleeing) {
    const ahead = Math.min(maxFilesAt(b, u, t, u.ax, u.ay), maxFilesAt(b, u, t, u.ax + u.dx * 8, u.ay + u.dy * 8));
    setWidth(b, u, ahead);
    const [l, r] = sideRoom(b, u, t, u.ax, u.ay);
    const half = (u.width * spacing(t, u.form)[0]) / 2;
    const shift = l < half && r > half ? Math.min(half - l, r - half) : r < half && l > half ? -Math.min(half - r, l - half) : 0;
    if (shift) {
      u.ax += -u.dy * shift * 0.1;
      u.ay += u.dx * shift * 0.1;
    }
    recordTrail(b, u, t);
  }
  return u.path.length === 0;
}

/** Adds the anchor's position to its trail and drops what the unit no longer needs. */
function recordTrail(b: Battle, u: Unit, t: UnitTypeDef): void {
  const tr = u.trail;
  if (tr.length >= 2) {
    const d = dist(u.ax, u.ay, tr[0]!, tr[1]!);
    if (d < TRAIL_STEP) return;
    // The anchor jumped (drifting in a fight, or a nudge): the old trail no longer leads here.
    if (d > TRAIL_STEP * 4) tr.length = 0;
  }
  tr.unshift(u.ax, u.ay);
  const keep = depthOf(u, t, Math.max(1, u.sol.length - 1), u.width) + 8;
  let acc = 0;
  for (let i = 2; i + 1 < tr.length; i += 2) {
    acc += dist(tr[i - 2]!, tr[i - 1]!, tr[i]!, tr[i + 1]!);
    if (acc > keep) {
      tr.length = i + 2;
      break;
    }
  }
}

/** A unit squeezed narrower than its formation while marching: its ranks follow the trail. */
function inColumn(u: Unit): boolean {
  return u.st === 'moving' && u.width < u.bw && u.form !== 'wedge' && u.trail.length >= 4;
}

/**
 * The point `back` metres behind the anchor along its trail, and the direction of march there
 * (straight on past the end of the trail).
 */
export function trailAt(u: Unit, back: number): [number, number, number, number] {
  let px = u.ax;
  let py = u.ay;
  let fx = u.dx;
  let fy = u.dy;
  let left = back;
  const tr = u.trail;
  for (let i = 0; i + 1 < tr.length; i += 2) {
    const qx = tr[i]!;
    const qy = tr[i + 1]!;
    const d = dist(px, py, qx, qy);
    if (d < 1e-6) continue;
    const sx = (px - qx) / d;
    const sy = (py - qy) / d;
    if (d >= left) return [px - sx * left, py - sy * left, sx, sy];
    left -= d;
    px = qx;
    py = qy;
    fx = sx;
    fy = sy;
  }
  return [px - fx * left, py - fy * left, fx, fy];
}

/**
 * Where a soldier should head for his slot at (tx, ty). Close by, or with the way clear, that
 * is the slot itself; cut off by a wall, he follows the anchor's trail instead: the furthest
 * point along it toward the anchor that he can walk straight to.
 */
function detour(b: Battle, u: Unit, s: Soldier, mask: number, tx: number, ty: number): [number, number] {
  const tr = u.trail;
  if (tr.length < 4 || dist(s.x, s.y, tx, ty) < 2.5 || easyLine(b.map, s.x, s.y, tx, ty, mask, 0, 0)) return [tx, ty];
  let best = -1;
  let bd = Infinity;
  for (let i = 0; i + 1 < tr.length; i += 2) {
    const d = (tr[i]! - s.x) * (tr[i]! - s.x) + (tr[i + 1]! - s.y) * (tr[i + 1]! - s.y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  // From the nearest trail point, look ahead toward the anchor while the way stays clear.
  let to = best;
  for (let i = best - 2, n = 0; i >= -2 && n < 8; i -= 2, n++) {
    const x = i < 0 ? u.ax : tr[i]!;
    const y = i < 0 ? u.ay : tr[i + 1]!;
    if (!easyLine(b.map, s.x, s.y, x, y, mask, 0, 0)) break;
    to = i;
  }
  return to < 0 ? [u.ax, u.ay] : [tr[to]!, tr[to + 1]!];
}

const DIRS = [1, 0, -1, 0, 0, 1, 0, -1, 0.7071, 0.7071, -0.7071, 0.7071, 0.7071, -0.7071, -0.7071, -0.7071];

/** A push away from impassable ground within a man's body and a little more of him. */
function wallPush(b: Battle, x: number, y: number, mask: number, r: number): [number, number] {
  let px = 0;
  let py = 0;
  const near = r * 0.6;
  const far = r + WALL_GAP;
  for (let i = 0; i < DIRS.length; i += 2) {
    const ox = DIRS[i]!;
    const oy = DIRS[i + 1]!;
    if (!passableAt(b.map, x + ox * far, y + oy * far, mask)) {
      const hard = !passableAt(b.map, x + ox * near, y + oy * near, mask);
      px -= ox * (hard ? 3 : 1.5);
      py -= oy * (hard ? 3 : 1.5);
    }
  }
  return [px, py];
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
    let maxSpeed = t.speed * PACE;
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
      maxSpeed = t.run * PACE * 1.05;
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
        [tx, ty] = detour(b, u, s, mask, ...slotPos(b, u, t, s));
      } else {
        const eu = b.unit(e.u)!;
        const reach = t.reach + t.radius + b.typeOf(eu).radius;
        const d = dist(s.x, s.y, e.x, e.y);
        const [nx, ny] = norm(e.x - s.x, e.y - s.y, s.fx, s.fy);
        // Close to striking distance and hold there.
        const stand = Math.max(t.radius + b.typeOf(eu).radius, reach - 0.35);
        tx = s.x + nx * (d - stand);
        ty = s.y + ny * (d - stand);
        maxSpeed = (d > reach + 3 ? t.run : t.speed) * PACE;
        s.fx = nx;
        s.fy = ny;
      }
    } else {
      [tx, ty] = detour(b, u, s, mask, ...slotPos(b, u, t, s));
    }

    // Desired velocity toward the target point.
    let dx = tx - s.x;
    let dy = ty - s.y;
    const d = len(dx, dy);
    const running = u.order.run || (u.flags & UF.charging) !== 0;
    if (!routing && !s.tgt) maxSpeed = (running && !FORM[u.form].noRun ? t.run : d > 3 ? t.run * 0.85 : t.speed * FORM[u.form].speed) * PACE;
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
    const [wx, wy] = wallPush(b, s.x, s.y, mask, r);
    vx += wx;
    vy += wy;
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
  if (inColumn(u)) {
    const [x, y, fx, fy] = trailAt(u, back);
    return [x - fy * lat, y + fx * lat];
  }
  return [u.ax + rx * lat - u.dx * back, u.ay + ry * lat - u.dy * back];
}

/**
 * Changes how many files abreast a unit stands, and deals out the slots again by where the men
 * are: the nearest the front take the front rank, left to right, then the next rank, so
 * nobody crosses the block to reach his new place.
 */
function setWidth(b: Battle, u: Unit, width: number): void {
  if (width === u.width) return;
  u.width = width;
  if (u.form === 'wedge') return;
  const rx = -u.dy;
  const ry = u.dx;
  const men: { s: Soldier; back: number; lat: number }[] = [];
  for (const id of u.sol) {
    const s = b.soldier(id);
    if (!s || id === u.cap) continue;
    const ox = s.x - u.ax;
    const oy = s.y - u.ay;
    men.push({ s, back: -(ox * u.dx + oy * u.dy), lat: ox * rx + oy * ry });
  }
  men.sort((a, z) => a.back - z.back || a.s.id - z.s.id);
  const w = Math.max(1, Math.min(width, men.length));
  for (let i = 0; i < men.length; i += w) {
    const row = men.slice(i, i + w).sort((a, z) => a.lat - z.lat || a.s.id - z.s.id);
    for (let k = 0; k < row.length; k++) row[k]!.s.slot = i + k;
  }
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
