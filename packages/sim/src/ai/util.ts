// Shared helpers for the three levels of AI.

import type { Battle } from '../battle';
import { clamp, dist, norm } from '../math/det';
import { passableAt } from '../map/mapgen';
import { MOVE } from '../map/terrain';
import type { Army, Detachment, Unit } from '../types';
import { frontageOf } from '../units/formation';
import { isRanged } from '../combat/missiles';

export function alive(u: Unit | undefined): u is Unit {
  return !!u && u.st !== 'gone';
}

export function fighting(u: Unit | undefined): u is Unit {
  return !!u && u.st !== 'gone' && u.st !== 'routing' && u.st !== 'shattered';
}

export function isCav(b: Battle, u: Unit): boolean {
  const t = b.typeOf(u);
  return !!t.mounted || t.cls === 'chariot' || t.cls === 'ele';
}

/** Foot missile troops and horse archers with ammo left: kept out of the line, fire from range. */
export function isMissile(b: Battle, u: Unit): boolean {
  if (b.world.settings.ammo && u.ammo <= 0) return false;
  return isRanged(u, b) && (!isCav(b, u) || b.typeOf(u).cls === 'hacav');
}

/** Rough fighting value of a unit (for force ratios). */
export function power(b: Battle, u: Unit): number {
  const t = b.typeOf(u);
  const per = ((t.atk + t.def + t.armor / 2) * t.hp) / 100;
  return u.sol.length * per * (u.st === 'routing' || u.st === 'shattered' ? 0.1 : 1);
}

export function sidePower(b: Battle, side: number): number {
  let p = 0;
  for (const u of b.world.units) if (u.side === side && alive(u)) p += power(b, u);
  return p;
}

export function centroid(b: Battle, units: Unit[]): { x: number; y: number } | null {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const u of units) {
    const c = b.center(u);
    if (!c.n) continue;
    x += c.x * c.n;
    y += c.y * c.n;
    n += c.n;
  }
  return n ? { x: x / n, y: y / n } : null;
}

export function enemiesOf(b: Battle, side: number): Unit[] {
  return b.world.units.filter((u) => u.side !== side && u.st !== 'gone' && u.st !== 'shattered' && b.center(u).n > 0);
}

export function nearestEnemy(b: Battle, x: number, y: number, side: number, maxD = 1e9, filter?: (u: Unit) => boolean): Unit | undefined {
  let best: Unit | undefined;
  let bestD = maxD;
  for (const o of b.world.units) {
    if (o.side === side || o.st === 'gone' || o.st === 'shattered') continue;
    if (filter && !filter(o)) continue;
    const c = b.center(o);
    if (!c.n) continue;
    let d = dist(x, y, c.x, c.y);
    if (o.st === 'routing') d += 30;
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

export function detUnits(b: Battle, d: Detachment): Unit[] {
  const out: Unit[] = [];
  for (const id of d.units) {
    const u = b.unit(id);
    if (fighting(u)) out.push(u);
  }
  return out;
}

export function armyUnits(b: Battle, a: Army): Unit[] {
  return b.world.units.filter((u) => u.army === a.id && fighting(u));
}

/** Frontage (m) a unit takes up in its current formation. */
export function unitFrontage(b: Battle, u: Unit): number {
  return frontageOf(b.typeOf(u), u.form, u.width) + 2;
}

/** Facing from a point toward the enemy's centre of mass. */
export function towardEnemy(b: Battle, x: number, y: number, side: number, fx: number, fy: number): [number, number] {
  const c = centroid(b, enemiesOf(b, side));
  if (!c) return [fx, fy];
  return norm(c.x - x, c.y - y, fx, fy);
}

/** Is this army run by the AI right now (no human general, or the human dropped)? */
export function aiArmy(b: Battle, a: Army): boolean {
  if (!a.ctrl) return true;
  const p = b.player(a.ctrl);
  return !p || !p.on;
}

/** Is this detachment run by its AI commander (no connected human commander)? */
export function aiDetachment(b: Battle, d: Detachment): boolean {
  if (!d.ctrl) return true;
  const p = b.player(d.ctrl);
  return !p || !p.on;
}

/** Free ground (m) to the left and right of (x, y) along (rx, ry) for men on foot, up to max. */
export function roomAt(b: Battle, x: number, y: number, rx: number, ry: number, max = 200): [number, number] {
  const side = (s: number): number => {
    for (let d = 2; d <= max; d += 2) if (!passableAt(b.map, x + rx * s * d, y + ry * s * d, MOVE.foot)) return d - 2;
    return max;
  };
  return [side(-1), side(1)];
}

/**
 * Lays out blocks of the given widths side by side across the facing (fx, fy) at (x, y).
 * On open ground that's one row centred on the point. Where the ground is narrower (a
 * pass, a bridge, a gap in a wall) the row shifts to fit, and the blocks that don't fit
 * stack behind in rows `depth` metres apart. Returns each block's [lateral, back] offset.
 */
export function fitRow(b: Battle, x: number, y: number, fx: number, fy: number, widths: number[], gap: number, depth: number): [number, number][] {
  const rx = -fy;
  const ry = fx;
  const out: [number, number][] = [];
  let room: [number, number] = [200, 200];
  let back = 0;
  let i = 0;
  while (i < widths.length) {
    const px = x - fx * back;
    const py = y - fy * back;
    if (passableAt(b.map, px, py, MOVE.foot)) room = roomAt(b, px, py, rx, ry);
    const [L, R] = room;
    let w = widths[i]!;
    let j = i + 1;
    while (j < widths.length && w + gap + widths[j]! <= L + R) {
      w += gap + widths[j]!;
      j++;
    }
    const mid = w <= L + R ? clamp(0, -L + w / 2, R - w / 2) : (R - L) / 2;
    let cur = mid - w / 2;
    for (let k = i; k < j; k++) {
      out.push([cur + widths[k]! / 2, back]);
      cur += widths[k]! + gap;
    }
    i = j;
    back += depth;
  }
  return out;
}
