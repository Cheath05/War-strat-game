// Missiles: units fire volleys at a target unit; each projectile flies for a fixed time
// toward a predicted point with scatter, then hits whoever is standing closest to where
// it lands. Shields facing the volley (and the testudo) can block it.

import type { Battle } from '../battle';
import { TICK_HZ, sec } from '../constants';
import type { MissileDef } from '../data/types';
import { dist, norm } from '../math/det';
import { rand, randInt, randRange } from '../math/rng';
import { terrainAt } from '../map/mapgen';
import { TERRAIN } from '../map/terrain';
import type { Projectile, Unit } from '../types';
import { ACT, UF } from '../types';
import { FORM } from '../units/formation';
import { damage, isLarge } from './damage';

export const PROJ_KIND = { arrow: 0, javelin: 1, stone: 2, pilum: 3 } as const;
const SPEED = [48, 24, 38, 20];
const HIT_RADIUS = [0.65, 0.8, 0.6, 0.85];

export function projKind(m: MissileDef): number {
  return PROJ_KIND[m.kind];
}

/**
 * Is this a dedicated missile unit that keeps its distance? Infantry with pila, shock
 * cavalry carrying a few javelins and elephants are melee units that throw on the approach.
 */
export function isRanged(u: Unit, b: Battle): boolean {
  const t = b.typeOf(u);
  const m = t.missile;
  if (!m || m.kind === 'pilum' || t.cls === 'inf' || t.cls === 'ele') return false;
  if (t.mounted && t.cls !== 'hacav' && m.ammo <= 4) return false;
  return true;
}

function hasAmmo(b: Battle, u: Unit): boolean {
  return !b.world.settings.ammo || u.ammo > 0;
}

/** Nearest enemy unit within range of u (by centres), or 0. */
export function nearestTargetInRange(b: Battle, u: Unit, range: number): number {
  const c = b.center(u);
  let best = 0;
  let bestD = range;
  for (const o of b.world.units) {
    if (o.side === u.side || o.st === 'gone') continue;
    const oc = b.center(o);
    if (!oc.n) continue;
    let d = dist(c.x, c.y, oc.x, oc.y);
    if (o.st === 'routing' || o.st === 'shattered') d += 25;
    if (d < bestD) {
      bestD = d;
      best = o.id;
    }
  }
  return best;
}

export function updateMissiles(b: Battle): void {
  const w = b.world;
  for (const u of w.units) {
    if (u.st === 'gone' || u.st === 'routing' || u.st === 'shattered' || u.st === 'rallying') continue;
    const t = b.typeOf(u);
    const m = t.missile;
    if (!m) continue;
    if (u.volleyCd > 0) {
      u.volleyCd--;
      continue;
    }
    if (!hasAmmo(b, u)) continue;
    if (u.engaged > Math.max(2, u.sol.length * 0.3)) continue;
    const pilum = !isRanged(u, b);
    if (pilum) {
      // One volley right before contact: at the unit we're advancing on, or at whoever is
      // closing on us.
      if (u.engaged > 0) continue;
      if (u.order.k === 'attack') u.fireT = u.order.target;
      else u.fireT = nearestTargetInRange(b, u, m.range);
    } else if (u.st === 'moving' && !m.onMove && !u.possBy) {
      continue;
    }
    let tu = b.unit(u.fireT);
    const c = b.center(u);
    let ok = !!tu && tu.st !== 'gone' && tu.side !== u.side;
    if (ok) {
      const tc = b.center(tu!);
      const d = dist(c.x, c.y, tc.x, tc.y);
      ok = d <= m.range && d >= (pilum ? 7 : 4);
    }
    if (!ok && !pilum && u.flags & UF.fireAtWill) {
      u.fireT = nearestTargetInRange(b, u, m.range);
      tu = b.unit(u.fireT);
      ok = !!tu;
    }
    if (!ok || !tu) continue;
    fireVolley(b, u, tu, m);
  }

  // Flight and landing.
  if (!w.proj.length) return;
  const keep: Projectile[] = [];
  for (const p of w.proj) {
    p.t++;
    if (p.t < p.dur) {
      keep.push(p);
      continue;
    }
    land(b, p);
  }
  w.proj = keep;
}

function fireVolley(b: Battle, u: Unit, tu: Unit, m: MissileDef): void {
  const w = b.world;
  const rng = w.rng;
  const targets = tu.sol;
  if (!targets.length) return;
  const kind = PROJ_KIND[m.kind];
  const speed = SPEED[kind]!;
  let n = 0;
  for (const id of u.sol) {
    const s = b.soldier(id);
    if (!s || s.hp <= 0 || s.tgt || (s.act > 0 && s.actK === ACT.knocked)) continue;
    const ts = b.soldier(targets[randInt(rng, targets.length)]!);
    if (!ts) continue;
    const d = dist(s.x, s.y, ts.x, ts.y);
    if (d > m.range * 1.1) continue;
    const flight = d / speed;
    const sigma = (1 - m.acc) * d * 0.11 + 0.35;
    const delay = randInt(rng, 9);
    const p: Projectile = {
      id: b.newId(),
      kind,
      side: u.side,
      army: u.army,
      unit: u.id,
      sx: s.x,
      sy: s.y,
      tx: ts.x + ts.vx * flight + randRange(rng, -1, 1) * sigma,
      ty: ts.y + ts.vy * flight + randRange(rng, -1, 1) * sigma,
      tgt: ts.id,
      t: -delay,
      dur: Math.max(4, Math.round(flight * TICK_HZ)),
      dmg: m.dmg,
      ap: m.ap,
      vsLarge: kind === PROJ_KIND.javelin || kind === PROJ_KIND.pilum ? 10 : 0,
    };
    w.proj.push(p);
    const [fx, fy] = norm(ts.x - s.x, ts.y - s.y, s.fx, s.fy);
    s.fx = fx;
    s.fy = fy;
    s.act = 8 + delay;
    s.actK = ACT.shoot;
    n++;
  }
  if (!n) return;
  if (w.settings.ammo) u.ammo--;
  u.volleyCd = Math.round(m.reload * TICK_HZ * randRange(rng, 0.9, 1.15));
  const c = b.center(u);
  b.emit({ k: 'fire', u: u.id, kind, n, x: c.x, y: c.y });
}

function land(b: Battle, p: Projectile): void {
  const w = b.world;
  const r = HIT_RADIUS[p.kind]!;
  let hit = 0;
  let hitD = Infinity;
  b.grid.query(p.tx, p.ty, r + 1.8, (j) => {
    const e = w.soldiers[j]!;
    if (e.hp <= 0) return;
    const eu = b.unit(e.u);
    if (!eu) return;
    if (eu.side === p.side && !w.settings.friendlyFire) return;
    const rr = r + b.typeOf(eu).radius;
    const d = dist(e.x, e.y, p.tx, p.ty);
    if (d <= rr && d < hitD) {
      hitD = d;
      hit = e.id;
    }
  });
  if (!hit) {
    b.emit({ k: 'land', kind: p.kind, x: p.tx, y: p.ty, hit: false });
    return;
  }
  const e = b.soldier(hit)!;
  const eu = b.unit(e.u)!;
  const et = b.typeOf(eu);
  b.emit({ k: 'land', kind: p.kind, x: p.tx, y: p.ty, hit: true });
  eu.hitT = w.tick;
  // Trees and rocks give cover.
  const cover = TERRAIN[terrainAt(b.map, e.x, e.y)]!.cover;
  if (cover > 0 && rand(w.rng) < cover) return;
  // Shields facing the volley; the testudo covers above and in front.
  const [dx, dy] = norm(p.tx - p.sx, p.ty - p.sy);
  const facing = -(dx * eu.dx + dy * eu.dy);
  const f = FORM[eu.form];
  let block = 0;
  if (facing > 0.2) block = et.shield + f.missileBlock;
  else if (eu.form === 'testudo') block = f.missileBlock;
  if (p.kind === PROJ_KIND.pilum) block *= 0.5;
  if (block > 0 && rand(w.rng) * 100 < Math.min(95, block)) {
    b.emit({ k: 'block', s: e.id, x: e.x, y: e.y });
    return;
  }
  const armor = Math.min(90, et.armor + eu.up.armor);
  const roll = randRange(w.rng, armor * 0.5, armor) / 100;
  let dmg = p.dmg * (1 - roll) + p.ap;
  if (isLarge(et)) dmg += p.vsLarge;
  damage(b, e, eu, dmg, null, b.unit(p.unit) ?? null);
}

/** Ticks of "under fire" morale pressure after a missile hit. */
export const UNDER_FIRE_TICKS = sec(3);
