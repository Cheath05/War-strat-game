// Melee: soldiers pick an enemy within reach of their unit's fight, close in, and strike
// on their own cooldowns. Units count how many men are in contact for morale and AI.

import type { Battle } from '../battle';
import { TICK_HZ } from '../constants';
import { randRange } from '../math/rng';
import type { Soldier, Unit } from '../types';
import { ACT, UF } from '../types';
import { meleeStrike } from './damage';
import { isRanged } from './missiles';

/** How far (m) a soldier looks for someone to fight, given what his unit is doing. */
function searchRadius(b: Battle, u: Unit, s: Soldier): number {
  const t = b.typeOf(u);
  const selfDefense = t.reach + t.radius + 1.6;
  if (u.st === 'routing' || u.st === 'shattered' || u.st === 'rallying') return 0;
  const ranged = isRanged(u, b);
  if (ranged && (u.ammo > 0 || !b.world.settings.ammo) && !(u.order.k === 'attack' && u.engaged > 0)) return selfDefense;
  if (u.flags & UF.hold) return selfDefense;
  if (u.order.k === 'attack') {
    const tu = b.unit(u.order.target);
    if (tu) {
      const c = b.center(tu);
      const dx = c.x - s.x;
      const dy = c.y - s.y;
      if (dx * dx + dy * dy < 30 * 30) return t.mounted ? 9 : 7;
    }
  }
  if (u.possBy && u.chargeAt && u.flags & UF.charging) return 14;
  if (u.possBy || u.engaged > 0 || u.st === 'engaged') return 6;
  if (u.order.k === 'move') return selfDefense;
  return selfDefense + 1.5;
}

export function acquireTargets(b: Battle): void {
  const w = b.world;
  // How many attackers already chose each enemy, to spread the fighting.
  const pressed = new Map<number, number>();
  for (const s of w.soldiers) if (s.tgt) pressed.set(s.tgt, (pressed.get(s.tgt) ?? 0) + 1);

  for (const s of w.soldiers) {
    if (s.hp <= 0) continue;
    const u = b.unit(s.u)!;
    const r = searchRadius(b, u, s);
    if (r <= 0) {
      s.tgt = 0;
      continue;
    }
    if (s.tgt) {
      const e = b.soldier(s.tgt);
      const ok = e && e.hp > 0 && (e.x - s.x) * (e.x - s.x) + (e.y - s.y) * (e.y - s.y) < (r + 1.5) * (r + 1.5);
      if (!ok) {
        pressed.set(s.tgt, (pressed.get(s.tgt) ?? 1) - 1);
        s.tgt = 0;
      } else if ((w.tick + s.id) % 12 !== 0) {
        continue;
      }
    }
    if (!s.tgt && (w.tick + s.id) % 3 !== 0) continue;
    const prefer = u.order.k === 'attack' ? u.order.target : u.chargeAt;
    let best = 0;
    let bestScore = Infinity;
    b.grid.query(s.x, s.y, r, (j) => {
      const e = w.soldiers[j]!;
      if (e.hp <= 0) return;
      const eu = b.unit(e.u);
      if (!eu || eu.side === u.side || eu.st === 'gone') return;
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r * r) return;
      let score = Math.sqrt(d2) + (pressed.get(e.id) ?? 0) * 0.8;
      if (eu.id === prefer) score -= 2;
      if (eu.st === 'routing' || eu.st === 'shattered') score += 1.5;
      if (score < bestScore) {
        bestScore = score;
        best = e.id;
      }
    });
    if (best !== s.tgt) {
      if (s.tgt) pressed.set(s.tgt, (pressed.get(s.tgt) ?? 1) - 1);
      s.tgt = best;
      if (best) pressed.set(best, (pressed.get(best) ?? 0) + 1);
    }
  }
}

export function resolveMelee(b: Battle): void {
  const w = b.world;
  const contact = new Map<number, number>();
  for (const u of w.units) u.flank = 0;
  for (const s of w.soldiers) {
    if (s.hp <= 0) continue;
    if (s.cd > 0) s.cd--;
    if (s.act > 0) {
      s.act--;
      if (s.act === 0) s.actK = ACT.none;
      if (s.actK === ACT.knocked) continue;
    }
    if (!s.tgt) continue;
    const e = b.soldier(s.tgt);
    if (!e || e.hp <= 0) {
      s.tgt = 0;
      continue;
    }
    const u = b.unit(s.u)!;
    const t = b.typeOf(u);
    const eu = b.unit(e.u)!;
    const et = b.typeOf(eu);
    const dx = e.x - s.x;
    const dy = e.y - s.y;
    const reach = t.reach + t.radius + et.radius + 0.35;
    if (dx * dx + dy * dy > reach * reach) continue;
    contact.set(u.id, (contact.get(u.id) ?? 0) + 1);
    if (s.cd > 0 || (s.act > 0 && s.actK === ACT.attack)) continue;
    if (u.st === 'routing' || u.st === 'shattered') continue;
    s.cd = Math.max(4, Math.round(t.cd * TICK_HZ * randRange(w.rng, 0.8, 1.2)));
    s.act = 6;
    s.actK = ACT.attack;
    b.emit({ k: 'swing', s: s.id });
    meleeStrike(b, s, u, t, e, eu, et);
  }
  for (const u of w.units) u.engaged = contact.get(u.id) ?? 0;
}
