// General AI: picks a battle plan for an AI-led army and gives its detachments orders.
// Plans: assault (skirmish, advance, engage, flank with horse), defend (hold a line and
// counter-charge), or a scenario directive (march a route, take a zone, wait).

import type { Battle } from '../battle';
import { TICK_HZ, sec } from '../constants';
import { dist, norm } from '../math/det';
import type { Army, DetOrder, Detachment, Unit } from '../types';
import { useAbility } from '../roles/abilities';
import { aiArmy, armyUnits, centroid, detUnits, enemiesOf, fighting, fitRow, isCav, isMissile, nearestEnemy, roomAt, sidePower, unitFrontage } from './util';
import { passableAt } from '../map/mapgen';
import { moveMask } from '../units/movement';

const THINK = [40, 20, 15, 10];

export function generalAI(b: Battle): void {
  const w = b.world;
  const every = THINK[w.settings.difficulty] ?? 20;
  for (const a of w.armies) {
    if ((w.tick + a.id * 3) % every !== 0) continue;
    if (!aiArmy(b, a)) continue;
    think(b, a);
  }
}

function setOrder(b: Battle, d: Detachment, k: DetOrder['k'], x: number, y: number, t = 0, face?: number[]): void {
  const o = d.order;
  const fx = face ? face[0]! : 0;
  const fy = face ? face[1]! : 0;
  if (o.k === k && o.t === t && dist(o.x, o.y, x, y) < 6 && (o.fx ?? 0) === fx && (o.fy ?? 0) === fy) return;
  if (o.k !== k) d.stage = 0;
  d.order = { k, x, y, t, by: 0, at: b.world.tick };
  if (face) {
    d.order.fx = fx;
    d.order.fy = fy;
  }
}

/** Classifies detachments once: line, skirmish, wing (cavalry), reserve, guard. */
function assignRoles(b: Battle, a: Army): void {
  const dets = a.dets.map((id) => b.detachment(id)!).filter((d) => d && d.units.length);
  const field = dets.filter((d) => !d.guard);
  const kind = (d: Detachment): string => {
    const us = d.units.map((id) => b.unit(id)!).filter(Boolean);
    const cav = us.filter((u) => isCav(b, u)).length;
    const mis = us.filter((u) => isMissile(b, u)).length;
    if (cav * 2 >= us.length) return 'wing';
    if (mis * 2 >= us.length) return 'skirm';
    return 'line';
  };
  let lines = 0;
  for (const d of field) {
    const k = kind(d);
    a.ai.roles[String(d.id)] = k;
    if (k === 'line') lines++;
  }
  // With three or more line detachments, the last one waits in reserve.
  if (lines >= 3) {
    const last = [...field].reverse().find((d) => a.ai.roles[String(d.id)] === 'line');
    if (last) a.ai.roles[String(last.id)] = 'reserve';
  }
  for (const d of dets) if (d.guard) a.ai.roles[String(d.id)] = 'guard';
}

function think(b: Battle, a: Army): void {
  const w = b.world;
  const own = armyUnits(b, a);
  if (!own.length) return;
  const enemies = enemiesOf(b, a.side).filter((e) => e.st !== 'routing');
  if (!enemies.length) return;
  if (!Object.keys(a.ai.roles).length || newDetachments(b, a)) assignRoles(b, a);
  const C = centroid(b, own)!;
  const E = centroid(b, enemies)!;
  // A 'hold' army keeps the facing the scenario gave its position; others face the enemy.
  const holdFace = a.directive === 'hold' && (a.face[0] || a.face[1]) ? a.face : undefined;
  const [fx, fy] = holdFace ? [holdFace[0]!, holdFace[1]!] : norm(E.x - C.x, E.y - C.y, 0, -1);
  const rx = -fy;
  const ry = fx;
  const ratio = sidePower(b, a.side) / Math.max(1, sidePower(b, 1 - a.side));
  const dirv = a.directive;

  if (!a.ai.plan) {
    a.ai.plan = dirv.startsWith('route:') || dirv.startsWith('zone:') || dirv.startsWith('wait:') ? dirv : dirv === 'defend' || dirv === 'hold' ? 'defend' : dirv === 'capture' ? 'capture' : dirv === 'assault' ? 'assault' : ratio >= 1 ? 'assault' : 'defend';
    a.ai.since = w.tick;
    a.ai.stage = 0;
  }
  const plan = a.ai.plan;
  const dets = a.dets.map((id) => b.detachment(id)!).filter((d) => d && detUnits(b, d).length);
  // Skirmishers who've shot their last join the line.
  for (const d of dets) if (a.ai.roles[String(d.id)] === 'skirm' && !detUnits(b, d).some((u) => isMissile(b, u))) a.ai.roles[String(d.id)] = 'line';
  const role = (d: Detachment): string => a.ai.roles[String(d.id)] ?? 'line';
  const closest = Math.min(...own.filter((u) => !isMissile(b, u)).map((u) => nearestDist(b, u)), 1e9);

  if (plan.startsWith('wait:')) {
    const secs = Number(plan.slice(5)) || 0;
    if (w.scenario.t >= secs * TICK_HZ || closest < 60) {
      a.ai.plan = 'assault';
      a.ai.stage = 1;
    } else {
      for (const d of dets) if (!d.guard) setOrder(b, d, 'hold', centroid(b, detUnits(b, d))!.x, centroid(b, detUnits(b, d))!.y);
    }
  } else if (plan.startsWith('route:')) {
    marchRoute(b, a, dets, plan.slice(6));
  } else if (plan.startsWith('zone:')) {
    const z = b.map.zones[plan.slice(5)];
    if (z) {
      const zx = (z.x0 + z.x1) / 2;
      const zy = (z.y0 + z.y1) / 2;
      // Each detachment fights whoever bars its way; otherwise it pushes into the zone.
      for (const d of dets) {
        if (d.guard) continue;
        const dc = centroid(b, detUnits(b, d))!;
        const foe = nearestEnemy(b, dc.x, dc.y, a.side, 90, (o) => o.st !== 'routing');
        if (role(d) === 'skirm') setOrder(b, d, 'skirmish', zx, zy);
        else if (foe) setOrder(b, d, 'attack', zx, zy, foe.id);
        else setOrder(b, d, 'advance', zx, zy);
      }
    }
  } else if (plan === 'capture') {
    capture(b, a, dets, role);
  } else if (plan === 'assault') {
    const lineDets = dets.filter((d) => role(d) === 'line');
    if (a.ai.stage === 0) {
      // Advance as one line: attack once most of it has formed up 60 m out, or the enemy
      // comes at us, or we've waited long enough.
      let ready = 0;
      let total = 0;
      for (const d of lineDets) {
        for (const u of detUnits(b, d)) {
          total++;
          if (u.st !== 'moving' || u.engaged > 0) ready++;
        }
      }
      const formed = total === 0 || ready >= total * 0.8;
      if ((formed && w.tick - a.ai.since > sec(15)) || closest < 40 || w.tick - a.ai.since > sec(150)) {
        a.ai.stage = 1;
        a.ai.since = w.tick;
      }
    }
    const totalW = lineDets.reduce((s, d) => s + detUnits(b, d).reduce((q, u) => q + unitFrontage(b, u), 0) + 8, 0);
    let cur = -totalW / 2;
    let wing = 0;
    for (const d of dets) {
      const r = role(d);
      if (r === 'guard') continue;
      const dc = centroid(b, detUnits(b, d))!;
      if (r === 'line') {
        const wdt = detUnits(b, d).reduce((q, u) => q + unitFrontage(b, u), 0) + 8;
        const lat = cur + wdt / 2;
        cur += wdt;
        if (a.ai.stage === 0) setOrder(b, d, 'advance', E.x - fx * 60 + rx * lat, E.y - fy * 60 + ry * lat);
        else setOrder(b, d, 'attack', E.x + rx * lat, E.y + ry * lat, nearestEnemyTo(b, d, a.side)?.id ?? 0);
      } else if (r === 'skirm') {
        setOrder(b, d, 'skirmish', E.x, E.y);
      } else if (r === 'wing') {
        const side = wing++ % 2 === 0 ? 1 : -1;
        if (w.settings.difficulty === 0) setOrder(b, d, 'advance', E.x - fx * 50 + rx * side * (totalW / 2 + 30), E.y - fy * 50 + ry * side * (totalW / 2 + 30));
        else if (a.ai.stage === 0) setOrder(b, d, 'advance', C.x + rx * side * (totalW / 2 + 35) + fx * 20, C.y + ry * side * (totalW / 2 + 35) + fy * 20);
        else setOrder(b, d, side > 0 ? 'flankR' : 'flankL', E.x, E.y);
      } else if (r === 'reserve') {
        setOrder(b, d, 'reserve', dc.x, dc.y);
      }
    }
  } else {
    // Defend: hold where we stand (or the deployment zone), counter-attack what reaches us.
    const zx = (a.zone[0]! + a.zone[2]!) / 2;
    const zy = (a.zone[1]! + a.zone[3]!) / 2;
    const hx = dist(C.x, C.y, zx, zy) < 60 ? zx : C.x;
    const hy = dist(C.x, C.y, zx, zy) < 60 ? zy : C.y;
    const lineDets = dets.filter((d) => role(d) === 'line');
    const widths = lineDets.map((d) => detUnits(b, d).reduce((q, u) => q + unitFrontage(b, u) + 3, 0) + 5);
    const totalW = widths.reduce((s, x) => s + x, 0);
    // In narrow ground the detachments stand one behind the other.
    const at = fitRow(b, hx, hy, fx, fy, widths, 3, 30);
    const deep = at.length ? at[at.length - 1]![1] + 30 : 0;
    const [L, R] = roomAt(b, hx, hy, rx, ry);
    let wing = 0;
    const contact = own.some((u) => u.engaged > 0);
    for (const d of dets) {
      const r = role(d);
      if (r === 'guard') continue;
      if (r === 'line') {
        const [lat, back] = at[lineDets.indexOf(d)]!;
        setOrder(b, d, 'hold', hx + rx * lat - fx * back, hy + ry * lat - fy * back, 0, holdFace);
      } else if (r === 'skirm') {
        setOrder(b, d, 'skirmish', hx + fx * 25, hy + fy * 25, 0, holdFace);
      } else if (r === 'wing') {
        const side = wing++ % 2 === 0 ? 1 : -1;
        const off = totalW / 2 + 25;
        if (contact && w.settings.difficulty > 0) setOrder(b, d, side > 0 ? 'flankR' : 'flankL', E.x, E.y);
        else if ((side > 0 ? R : L) >= off + 15) setOrder(b, d, 'hold', hx + rx * side * off, hy + ry * side * off, 0, holdFace);
        else setOrder(b, d, 'hold', hx - fx * (deep + 15), hy - fy * (deep + 15), 0, holdFace);
      } else if (r === 'reserve') {
        setOrder(b, d, 'reserve', hx - fx * deep, hy - fy * deep);
      }
    }
    // Nobody comes: take the fight to them if we're not weaker; finish a broken enemy.
    const waited = !contact && a.directive !== 'defend' && a.directive !== 'hold' && w.tick - a.ai.since > sec(150) && ratio >= 0.95;
    if ((waited || ratio > 1.8) && a.directive !== 'hold') {
      a.ai.plan = 'assault';
      a.ai.stage = 0;
      a.ai.since = w.tick;
    }
  }

  generalUnit(b, a, own, C, fx, fy);
}

/** Capture & Hold: take the points we don't own, then guard the ones we do. */
function capture(b: Battle, a: Army, dets: Detachment[], role: (d: Detachment) => string): void {
  const pts = b.world.objectives.filter((o) => o.kind === 'point');
  if (!pts.length) {
    a.ai.plan = 'assault';
    return;
  }
  const want = pts.filter((o) => o.owner !== a.side);
  const list = want.length ? want : pts;
  let i = 0;
  for (const d of dets) {
    if (d.guard) continue;
    const dc = centroid(b, detUnits(b, d))!;
    // Spread the detachments over the two nearest points they want.
    const near = [...list].sort((p, q) => dist(dc.x, dc.y, p.x, p.y) - dist(dc.x, dc.y, q.x, q.y) || p.id - q.id);
    const target = near[i++ % Math.min(2, near.length)]!;
    const foe = nearestEnemy(b, dc.x, dc.y, a.side, role(d) === 'wing' ? 120 : 70, (o) => o.st !== 'routing');
    if (role(d) === 'skirm') setOrder(b, d, 'skirmish', target.x, target.y);
    else if (foe) setOrder(b, d, 'attack', target.x, target.y, foe.id);
    else setOrder(b, d, want.length ? 'advance' : 'hold', target.x, target.y);
  }
}

function newDetachments(b: Battle, a: Army): boolean {
  return a.dets.some((id) => a.ai.roles[String(id)] === undefined && (b.detachment(id)?.units.length ?? 0) > 0);
}

function nearestDist(b: Battle, u: Unit): number {
  const c = b.center(u);
  const e = nearestEnemy(b, c.x, c.y, u.side, 1e9, (o) => o.st !== 'routing');
  if (!e) return 1e9;
  const ec = b.center(e);
  return dist(c.x, c.y, ec.x, ec.y);
}

function nearestEnemyTo(b: Battle, d: Detachment, side: number): Unit | undefined {
  const c = centroid(b, detUnits(b, d));
  if (!c) return undefined;
  return nearestEnemy(b, c.x, c.y, side, 1e9, (o) => o.st !== 'routing');
}

/** Follow a named route waypoint by waypoint, fighting what blocks the way; then assault. */
function marchRoute(b: Battle, a: Army, dets: Detachment[], name: string): void {
  const route = b.map.routes[name];
  if (!route || a.ai.stage * 2 >= route.length) {
    a.ai.plan = 'assault';
    a.ai.stage = 1;
    a.ai.since = b.world.tick;
    return;
  }
  const wx = route[a.ai.stage * 2]!;
  const wy = route[a.ai.stage * 2 + 1]!;
  // The column (without the general, who trails behind).
  const field = dets.filter((d) => !d.guard).flatMap((d) => detUnits(b, d));
  const C = centroid(b, field) ?? centroid(b, armyUnits(b, a));
  if (!C) return;
  const block = nearestEnemy(b, C.x, C.y, a.side, 35, (o) => o.st !== 'routing');
  for (const d of dets) {
    if (d.guard) continue;
    if (block) setOrder(b, d, 'attack', wx, wy, block.id);
    else setOrder(b, d, 'advance', wx, wy);
  }
  // On to the next waypoint once the column is there, or has stopped as close as it can get.
  const w = b.world;
  if (block) a.ai.since = w.tick;
  let lead = 1e9;
  for (const u of field) {
    const c = b.center(u);
    lead = Math.min(lead, dist(c.x, c.y, wx, wy));
  }
  const stopped = field.every((u) => u.st !== 'moving');
  if (dist(C.x, C.y, wx, wy) < 30 || (stopped && lead < 35) || w.tick - a.ai.since > sec(120)) {
    a.ai.stage++;
    a.ai.since = w.tick;
  }
}

/** Keeps the general behind the line, out of trouble, and uses his abilities. */
function generalUnit(b: Battle, a: Army, own: Unit[], C: { x: number; y: number }, fx: number, fy: number): void {
  const gu = b.unit(a.genUnit);
  if (!fighting(gu) || gu.possBy) return;
  const gd = b.detachment(gu.det);
  const g = b.soldier(gu.cap);
  if (!g || !gd) return;
  // Behind the centre of the army, but never closer than 55 m to a fighting enemy.
  let gx = C.x - fx * 35;
  let gy = C.y - fy * 35;
  for (let pass = 0; pass < 3; pass++) {
    const e = nearestEnemy(b, gx, gy, a.side, 55, (o) => o.st !== 'routing');
    if (!e) break;
    const ec = b.center(e);
    const [ax, ay] = norm(gx - ec.x, gy - ec.y, -fx, -fy);
    gx = ec.x + ax * 56;
    gy = ec.y + ay * 56;
  }
  gx = Math.max(4, Math.min(b.map.wm - 4, gx));
  gy = Math.max(4, Math.min(b.map.hm - 4, gy));
  // Somewhere he can stand (in a pass "behind" may be a cliff): else stay with the army.
  const mask = moveMask(b.typeOf(gu));
  if (!passableAt(b.map, gx, gy, mask)) {
    const near = own.filter((u) => u.id !== gu.id).sort((p, q) => dist(b.center(p).x, b.center(p).y, C.x, C.y) - dist(b.center(q).x, b.center(q).y, C.x, C.y))[0];
    const at = passableAt(b.map, C.x, C.y, mask) ? C : near ? b.center(near) : b.center(gu);
    gx = at.x;
    gy = at.y;
  }
  setOrder(b, gd, 'guard', gx, gy);
  if (b.world.settings.difficulty === 0) return;
  const ab = b.typeOf(gu).abilities ?? [];
  let routing = 0;
  let engaged = 0;
  for (const u of b.world.units) {
    if (u.army !== a.id) continue;
    const c = b.center(u);
    if (!c.n) continue;
    const d = dist(c.x, c.y, g.x, g.y);
    if (u.st === 'routing' && d < 45) routing++;
    if (u.engaged > 0 && d < 35) engaged++;
  }
  if (routing > 0 && ab.includes('rally')) useAbility(b, gu, 'rally');
  else if (engaged >= 2 && ab.includes('inspire')) useAbility(b, gu, 'inspire');
  void own;
}
