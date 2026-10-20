// Hit and damage rules shared by melee, charges and missiles (Total War-style):
// hit chance from attack vs defence, damage split into a part armour can stop and an
// armour-piercing part.

import type { Battle } from '../battle';
import { sec } from '../constants';
import type { UnitTypeDef } from '../data/types';
import { clamp, norm } from '../math/det';
import { rand, randRange } from '../math/rng';
import { heightAt } from '../map/mapgen';
import type { Soldier, Unit } from '../types';
import { ACT } from '../types';
import { FORM } from '../units/formation';

/** Ticks of charge bonus after impact. */
export const CHARGE_BONUS_TICKS = sec(2);

/** Attack/defence penalty from fatigue. */
export function fatiguePenalty(b: Battle, u: Unit): number {
  if (!b.world.settings.fatigue) return 0;
  return u.fat > 85 ? 12 : u.fat > 65 ? 7 : u.fat > 45 ? 3 : 0;
}

/** Difficulty edge for AI-led armies: Easy -6, Normal 0, Hard +4, Legendary +8. */
export function aiEdge(b: Battle, u: Unit): number {
  const a = b.army(u.army);
  if (!a || (a.ctrl && b.player(a.ctrl)?.on)) return 0;
  return [-6, 0, 4, 8][b.world.settings.difficulty] ?? 0;
}

/** 0 front, 1 flank, 2 rear: where an attack from (ax, ay) hits a unit. */
export function attackAngle(ax: number, ay: number, e: Soldier, eu: Unit): number {
  const [dx, dy] = norm(ax - e.x, ay - e.y, eu.dx, eu.dy);
  const dot = dx * eu.dx + dy * eu.dy;
  return dot > 0.4 ? 0 : dot < -0.35 ? 2 : 1;
}

export function isLarge(t: UnitTypeDef): boolean {
  return !!(t.mounted || t.large || t.cls === 'ele' || t.cls === 'chariot');
}

export function meleeStrike(b: Battle, s: Soldier, u: Unit, t: UnitTypeDef, e: Soldier, eu: Unit, et: UnitTypeDef): void {
  const rng = b.world.rng;
  const rel = attackAngle(s.x, s.y, e, eu);
  const fa = FORM[u.form];
  const fe = FORM[eu.form];
  let atk = t.atk + fa.atk + (u.buff > 0 ? 6 : 0) + (u.possBy ? 4 : 0) + aiEdge(b, u) - fatiguePenalty(b, u);
  if (s.chg > 0) atk += ((t.charge + fa.chargeBonus) * s.chg) / CHARGE_BONUS_TICKS;
  let def = et.def + fe.def + aiEdge(b, eu) - fatiguePenalty(b, eu);
  if (rel === 0) def += (et.shield >= 30 ? 5 : 0) + fe.frontDef;
  else if (rel === 1) atk += 6;
  else atk += 12;
  const large = isLarge(et);
  if (large) atk += t.bonusLarge;
  const hd = heightAt(b.map, s.x, s.y) - heightAt(b.map, e.x, e.y);
  if (hd > 1.2) atk += 6;
  else if (hd < -1.2) atk -= 6;
  if (e.act > 0 && e.actK === ACT.knocked) def -= 20;
  if (rel > eu.flank) eu.flank = rel;
  eu.hitT = b.world.tick;
  const p = clamp(40 + atk - def, 10, 90) / 100;
  if (rand(rng) >= p) {
    if (rel === 0 && et.shield > 0) b.emit({ k: 'block', s: e.id, x: e.x, y: e.y });
    return;
  }
  const armor = clamp(et.armor - (rel === 2 ? 10 : 0), 0, 90);
  const roll = randRange(rng, armor * 0.5, armor) / 100;
  let dmg = t.dmg * (1 - roll) + t.ap;
  if (large) dmg += t.bonusLarge * 0.5;
  if (s.chg > 0) dmg += (t.charge * 0.25 * s.chg) / CHARGE_BONUS_TICKS;
  dmg *= randRange(rng, 0.85, 1.15);
  damage(b, e, eu, dmg, s, u);
}

/** Applies damage to a soldier; kills him at 0 hp. */
export function damage(b: Battle, e: Soldier, eu: Unit, dmg: number, by: Soldier | null, byU: Unit | null): void {
  if (e.hp <= 0) return;
  e.hp -= dmg;
  b.emit({ k: 'hit', s: e.id, by: by ? by.id : 0, x: e.x, y: e.y, big: dmg > 30 });
  if (e.actK !== ACT.knocked) {
    e.act = Math.max(e.act, 3);
    e.actK = ACT.hit;
  }
  if (e.hp <= 0) kill(b, e, eu, byU);
}

export function kill(b: Battle, e: Soldier, eu: Unit, byU: Unit | null): void {
  e.hp = 0;
  eu.losses++;
  eu.recentLoss += 1;
  const army = b.army(eu.army);
  if (army) army.losses++;
  if (byU) {
    byU.kills++;
    const ba = b.army(byU.army);
    if (ba) ba.kills++;
    const d = b.detachment(byU.det);
    const pid = byU.possBy || d?.ctrl || ba?.ctrl || 0;
    const p = b.player(pid);
    if (p) p.kills++;
  }
  b.emit({ k: 'death', s: e.id, u: eu.id, army: eu.army, type: eu.type, x: e.x, y: e.y, fx: e.fx, fy: e.fy, rank: e.rank });
}
