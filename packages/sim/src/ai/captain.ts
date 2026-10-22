// Captain AI: every unit's own sense, whoever commands it. Missile units pick targets and
// skirmishers dodge melee; spearmen brace against cavalry; idle units fight back when hit,
// and go for the shooters (or close up in testudo) when they're under missile fire.

import type { Battle } from '../battle';
import { sec } from '../constants';
import { dist, norm } from '../math/det';
import type { Unit } from '../types';
import { UF } from '../types';
import { orderAttack, orderMove } from '../commands';
import { nearestTargetInRange } from '../combat/missiles';
import { fighting, isCav, isMissile } from './util';

const EVERY = 4;

export function captainAI(b: Battle): void {
  const w = b.world;
  for (const u of w.units) {
    if (!fighting(u) || u.st === 'rallying' || u.possBy) continue;
    if ((w.tick + u.id) % EVERY !== 0) continue;
    think(b, u);
  }
}

function think(b: Battle, u: Unit): void {
  const t = b.typeOf(u);
  const c = b.center(u);
  if (!c.n) return;
  // Nearest enemy unit and nearest enemy cavalry.
  let near: Unit | undefined;
  let nearD = 1e9;
  let cav: Unit | undefined;
  let cavD = 1e9;
  let melee: Unit | undefined;
  let meleeD = 1e9;
  for (const o of b.world.units) {
    if (o.side === u.side || !fighting(o)) continue;
    const oc = b.center(o);
    if (!oc.n) continue;
    const d = dist(c.x, c.y, oc.x, oc.y);
    if (d < nearD) {
      nearD = d;
      near = o;
    }
    if (isCav(b, o) && d < cavD) {
      cavD = d;
      cav = o;
    }
    if (!isMissile(b, o) && d < meleeD) {
      meleeD = d;
      melee = o;
    }
  }
  u.enemyD = nearD;

  // Missile units: fire at will and skirmish away from melee.
  if (isMissile(b, u)) {
    const m = t.missile!;
    if (u.flags & UF.fireAtWill && u.order.k !== 'attack') {
      const cur = b.unit(u.fireT);
      const cc = cur ? b.center(cur) : null;
      if (!cur || !fighting(cur) || !cc || dist(c.x, c.y, cc.x, cc.y) > m.range) u.fireT = nearestTargetInRange(b, u, m.range);
    }
    const hasAmmo = !b.world.settings.ammo || u.ammo > 0;
    if (u.flags & UF.skirmish && melee && meleeD < 26 && hasAmmo && u.engaged < 3) {
      const mc = b.center(melee);
      const [ax, ay] = norm(c.x - mc.x, c.y - mc.y, -u.dx, -u.dy);
      const tx = c.x + ax * 32;
      const ty = c.y + ay * 32;
      if (u.order.k !== 'move' || dist(u.order.x, u.order.y, tx, ty) > 10) {
        orderMove(b, u, tx, ty, -ax, -ay, 0, true, u.order.manual);
        u.flags |= UF.evading;
      }
      return;
    }
    if (u.flags & UF.evading && u.order.k === 'none') u.flags &= ~UF.evading;
    // Out of ammo with nothing to do: join the fight if attacked.
    if (!hasAmmo && u.engaged > 0 && u.order.k === 'none' && near) orderAttack(b, u, near.id, false, false);
    return;
  }

  // Spear and pike units brace when cavalry comes at their front.
  if ((t.cls === 'spear' || t.cls === 'pike') && u.order.k === 'none' && !u.engaged) {
    if (cav && cavD < 45) {
      const cc = b.center(cav);
      const [ax, ay] = norm(cc.x - c.x, cc.y - c.y);
      if (ax * u.dx + ay * u.dy > 0.4) u.flags |= UF.brace;
    } else {
      u.flags &= ~UF.brace;
    }
  }

  // Attacked while idle: turn and fight whoever is hitting us.
  if (u.order.k === 'none' && u.engaged > 0 && !(u.flags & UF.guard)) {
    const foe = attackerOf(b, u);
    if (foe) orderAttack(b, u, foe.id, false, u.order.manual);
  }
  underFire(b, u, c);
}

/** Furthest a unit charges out at missile troops shooting at it, in metres. */
const SALLY = 110;

/**
 * Shot at while standing with nobody to fight (guard mode keeps the place, as ordered): go for
 * the shooters if we can catch them; foot under fire from horsemen closes up in testudo if it
 * can. A chase that runs on too far is given up.
 */
function underFire(b: Battle, u: Unit, c: { x: number; y: number }): void {
  const w = b.world;
  const t = b.typeOf(u);
  const shot = w.tick - u.hitT < sec(2) && u.engaged === 0;
  if (u.flags & UF.cover && (w.tick - u.hitT > sec(6) || u.order.k !== 'none')) {
    u.flags &= ~UF.cover;
    u.form = u.baseForm;
  }
  if (u.order.k === 'attack') {
    const tu = b.unit(u.order.target);
    const tc = tu ? b.center(tu) : null;
    if (tu && tc && isMissile(b, tu) && !u.engaged && !u.order.manual && dist(c.x, c.y, tc.x, tc.y) > SALLY * 1.4) u.order.k = 'none';
    return;
  }
  if (!shot || u.order.k !== 'none' || u.flags & UF.guard) return;
  // Who is shooting at us: the nearest missile unit aiming here.
  let shooter: Unit | undefined;
  let sd = 1e9;
  for (const o of w.units) {
    if (o.side === u.side || o.fireT !== u.id || !fighting(o)) continue;
    const oc = b.center(o);
    const d = dist(c.x, c.y, oc.x, oc.y);
    if (d < sd) {
      sd = d;
      shooter = o;
    }
  }
  if (!shooter) return;
  const catchable = t.mounted || !b.typeOf(shooter).mounted;
  if (catchable && sd <= SALLY) {
    orderAttack(b, u, shooter.id, sd > 40, u.order.manual);
  } else if (t.forms.includes('testudo') && u.form !== 'testudo') {
    u.form = 'testudo';
    u.flags |= UF.cover;
  }
}

/** The enemy unit most of our men are fighting. */
export function attackerOf(b: Battle, u: Unit): Unit | undefined {
  const tally = new Map<number, number>();
  for (const id of u.sol) {
    const s = b.soldier(id);
    if (!s || !s.tgt) continue;
    const e = b.soldier(s.tgt);
    if (e) tally.set(e.u, (tally.get(e.u) ?? 0) + 1);
  }
  let best = 0;
  let bestN = 0;
  for (const [id, n] of tally) {
    if (n > bestN) {
      bestN = n;
      best = id;
    }
  }
  return b.unit(best);
}
