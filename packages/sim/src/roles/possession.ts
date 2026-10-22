// Taking command in person: a player drives an officer (captain, commander or general)
// with WASD and the unit follows him in formation. Leading a commander brings his whole
// detachment along; the other units keep their places around his unit.

import type { Battle } from '../battle';
import { PACE, sec } from '../constants';
import { clamp, dist, len, norm, turnToward } from '../math/det';
import { terrainSpeed } from '../map/mapgen';
import { classIndex } from '../map/pathfind';
import type { PlayerState, Soldier, Unit } from '../types';
import { RANK, UF } from '../types';
import { FORM } from '../units/formation';
import { fatigueMult, moveMask, officerLead } from '../units/movement';
import { nearestTargetInRange } from '../combat/missiles';
import { useAbility } from './abilities';

/** Offsets of follower units relative to the led unit, in its frame (lateral, back). */
interface Follow {
  lat: number;
  back: number;
}

export function possess(b: Battle, p: PlayerState, s: Soldier, u: Unit): void {
  if (u.st === 'routing' || u.st === 'shattered' || u.st === 'gone') return;
  if (u.possBy && u.possBy !== p.id) return;
  if (p.poss) unpossess(b, p);
  p.poss = s.id;
  p.mx = 0;
  p.my = 0;
  p.run = false;
  p.aimX = s.x + u.dx * 10;
  p.aimY = s.y + u.dy * 10;
  u.possBy = p.id;
  u.order = { k: 'follow', x: u.ax, y: u.ay, dx: u.dx, dy: u.dy, width: 0, target: 0, run: false, manual: true };
  u.path = [];
  u.flags &= ~(UF.needPath | UF.hold);
  // A commander or general brings the rest of the detachment along.
  if (s.rank >= RANK.commander) {
    const d = b.detachment(u.det);
    if (d) {
      for (const id of d.units) {
        const f = b.unit(id);
        if (!f || f.id === u.id || f.st === 'gone' || f.st === 'routing' || f.st === 'shattered' || f.possBy) continue;
        const off = relOffset(b, u, f);
        f.order = { k: 'follow', x: f.ax, y: f.ay, dx: u.dx, dy: u.dy, width: 0, target: 0, run: false, manual: true };
        f.path = [];
        f.follow = u.id;
        f.fLat = off.lat;
        f.fBack = off.back;
      }
    }
  }
  b.emit({ k: 'possess', p: p.id, s: s.id });
}

export function unpossess(b: Battle, p: PlayerState): void {
  const s = b.soldier(p.poss);
  if (s) {
    const u = b.unit(s.u);
    if (u && u.possBy === p.id) {
      u.possBy = 0;
      u.chargeAt = 0;
      u.order = { k: 'none', x: 0, y: 0, dx: 0, dy: 0, width: 0, target: 0, run: false, manual: true };
      // Re-anchor on the officer so the unit doesn't snap back.
      const t = b.typeOf(u);
      u.ax = s.x - u.dx * officerLead(t);
      u.ay = s.y - u.dy * officerLead(t);
      releaseFollowers(b, u);
    }
  }
  p.poss = 0;
  p.mx = 0;
  p.my = 0;
}

function releaseFollowers(b: Battle, u: Unit): void {
  for (const f of b.world.units) {
    if (f.follow !== u.id) continue;
    f.follow = 0;
    if (f.order.k === 'follow') f.order = { k: 'none', x: 0, y: 0, dx: 0, dy: 0, width: 0, target: 0, run: false, manual: true };
  }
}

function relOffset(b: Battle, lead: Unit, f: Unit): Follow {
  const rx = -lead.dy;
  const ry = lead.dx;
  const dx = f.ax - lead.ax;
  const dy = f.ay - lead.ay;
  return { lat: dx * rx + dy * ry, back: -(dx * lead.dx + dy * lead.dy) };
}

/** Moves possessed officers by their players' input and drags their units along. */
export function updatePossession(b: Battle): void {
  const w = b.world;
  for (const p of w.players) {
    if (!p.poss) continue;
    const s = b.soldier(p.poss);
    const u = s ? b.unit(s.u) : undefined;
    if (!s || !u || s.hp <= 0 || u.st === 'routing' || u.st === 'shattered' || !p.on) {
      unpossess(b, p);
      continue;
    }
    p.led++;
    const t = b.typeOf(u);
    const ci = classIndex(moveMask(t));
    const running = p.run && !FORM[u.form].noRun;
    let speed = (running ? t.run : t.speed) * PACE * terrainSpeed(b.map, s.x, s.y, ci) * fatigueMult(b, u);
    if (u.flags & UF.charging) speed *= 1.1;
    // The officer walks where the player steers; in a fight he stands and strikes.
    let vx = p.mx * speed;
    let vy = p.my * speed;
    if (s.tgt && !p.mx && !p.my) {
      vx = 0;
      vy = 0;
    }
    const accel = t.mounted ? 0.25 : 0.45;
    s.vx += (vx - s.vx) * accel;
    s.vy += (vy - s.vy) * accel;
    // Facing: toward the aim point, else the direction of travel.
    const [ax, ay] = norm(p.aimX - s.x, p.aimY - s.y, s.fx, s.fy);
    const sp = len(s.vx, s.vy);
    const [tx, ty] = sp > 0.5 && dist(p.aimX, p.aimY, s.x, s.y) < 1 ? [s.vx / sp, s.vy / sp] : [ax, ay];
    if (!s.tgt) [s.fx, s.fy] = turnToward(s.fx, s.fy, tx, ty, 0.3);
    // The unit forms up behind its officer unless told to hold.
    if (!(u.flags & UF.hold)) {
      const lead = officerLead(t);
      const [fx, fy] = turnToward(u.dx, u.dy, s.fx, s.fy, 0.08);
      u.dx = fx;
      u.dy = fy;
      const nx = s.x - fx * lead;
      const ny = s.y - fy * lead;
      // While fighting, the block holds its ground instead of following every step.
      const fighting = u.engaged > Math.max(2, u.sol.length * 0.2);
      if (!fighting || dist(nx, ny, u.ax, u.ay) > 10) {
        u.ax = nx;
        u.ay = ny;
      }
      u.order.run = running;
      u.st = u.engaged ? 'engaged' : sp > 0.3 ? 'moving' : 'idle';
    }
    // Followers keep station around the led unit.
    for (const f of w.units) {
      if (f.follow !== u.id || f.order.k !== 'follow') continue;
      const lat = f.fLat;
      const back = f.fBack;
      f.order.x = clamp(u.ax + -u.dy * lat - u.dx * back, 1, b.map.wm - 1);
      f.order.y = clamp(u.ay + u.dx * lat - u.dy * back, 1, b.map.hm - 1);
      f.order.dx = u.dx;
      f.order.dy = u.dy;
      f.order.run = running;
    }
  }
}

/** The possessed officer's hotkeys. */
export function avatarAction(b: Battle, p: PlayerState, a: 'charge' | 'rally' | 'volley' | 'hold' | 'formation', x = 0, y = 0): void {
  const s = b.soldier(p.poss);
  if (!s) return;
  const u = b.unit(s.u);
  if (!u || u.possBy !== p.id) return;
  const t = b.typeOf(u);
  switch (a) {
    case 'charge': {
      // Charge the nearest enemy in front of the officer.
      let best = 0;
      let bestD = t.mounted ? 70 : 45;
      for (const o of b.world.units) {
        if (o.side === u.side || o.st === 'gone') continue;
        const oc = b.center(o);
        if (!oc.n) continue;
        const dx = oc.x - s.x;
        const dy = oc.y - s.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0 && (dx * s.fx + dy * s.fy) / d < 0.3) continue;
        if (d < bestD) {
          bestD = d;
          best = o.id;
        }
      }
      if (!best || FORM[u.form].noRun) return;
      u.flags |= UF.charging;
      u.chargeT = sec(4);
      // The men surge at the enemy; the player keeps steering the officer.
      for (const id of u.sol) {
        const m = b.soldier(id);
        if (m && m.id !== s.id) m.tgt = 0;
      }
      u.chargeAt = best;
      b.emit({ k: 'charge', u: u.id, x: s.x, y: s.y });
      return;
    }
    case 'rally':
      useAbility(b, u, 'shout', s.x, s.y);
      return;
    case 'volley': {
      const m = t.missile;
      if (!m || u.volleyCd > 0) return;
      // Aim at the enemy unit nearest the cursor.
      let best = 0;
      let bestD = 25;
      for (const o of b.world.units) {
        if (o.side === u.side || o.st === 'gone') continue;
        const oc = b.center(o);
        const d = dist(oc.x, oc.y, x, y);
        if (d < bestD) {
          bestD = d;
          best = o.id;
        }
      }
      u.fireT = best || nearestTargetInRange(b, u, m.range);
      return;
    }
    case 'hold':
      u.flags ^= UF.hold;
      return;
    case 'formation': {
      const i = t.forms.indexOf(u.form);
      const next = t.forms[(i + 1) % t.forms.length]!;
      u.form = next;
      u.baseForm = next;
      if (FORM[next].noRun) p.run = false;
      return;
    }
  }
}

