// Gold (Last Stand, Objective battles, PVP Thermopylae): players earn it in battle and
// spend it on new units, which march in from their map edge, or on refilling worn units.
// While the AI leads an army, its general does the same with the army's own purse.

import type { Battle } from '../battle';
import { faction, unitType, hasUnitType } from '../data/registry';
import { dist, norm } from '../math/det';
import { HP_SCALE, strengthOf } from '../constants';
import type { Army, Detachment, PlayerState, Unit } from '../types';
import { spawnUnit, emptyDetOrder } from '../setup';
import { orderMove } from '../commands';
import { recruitable, roleOf, type UnitRole } from './armies';
import { aiArmy } from '../ai/util';
import { sec } from '../constants';

/** Whoever holds the gold: a player, or the army itself while the AI leads it. */
interface Purse {
  gold: number;
}

export function goldEnabled(b: Battle, side?: number): boolean {
  const r = b.scenario.recruit;
  if (!r) return false;
  return side === undefined || !r.sides || r.sides.includes(side);
}

export function earn(b: Battle, pid: number, amount: number): void {
  const p = b.player(pid);
  if (p && goldEnabled(b)) p.gold = Math.round((p.gold + amount) * 100) / 100;
}

/** Buys a unit that arrives at the army's map edge and marches to the front. */
export function recruit(b: Battle, p: PlayerState, typeId: string): void {
  const army = b.army(p.army);
  if (!army) return;
  buyUnit(b, army, p, typeId, p.role === 'commander' ? b.detachment(p.det) : undefined, p.name);
}

function buyUnit(b: Battle, army: Army, purse: Purse, typeId: string, det: Detachment | undefined, who: string): boolean {
  const sc = b.scenario;
  if (!sc.recruit || !hasUnitType(typeId) || b.world.phase !== 'battle' || !goldEnabled(b, army.side)) return false;
  const t = unitType(typeId);
  if (t.faction !== army.faction || t.general || !faction(army.faction).units.includes(t)) return false;
  if (purse.gold < t.cost) return false;
  const alive = b.world.units.filter((u) => u.army === army.id && u.st !== 'gone').length;
  if (alive >= sc.recruit.maxUnits) return false;
  purse.gold -= t.cost;
  // Reinforcements join the commander's detachment, or a reserve detachment of the general.
  if (!det) det = b.world.dets.find((d) => d.army === army.id && d.name === 'Reinforcements') ?? newDetachment(b, army, 'Reinforcements');
  arrive(b, army, det, typeId);
  b.msg(`${who}'s ${t.name} are on their way.`, 'info', army.side);
  return true;
}

/** Adds an empty detachment to an army (for reinforcements and waves). */
export function newDetachment(b: Battle, army: Army, name: string): Detachment {
  const det: Detachment = { id: b.newId(), army: army.id, side: army.side, name, units: [], cmdUnit: 0, ctrl: 0, order: emptyDetOrder(), stage: 0, guard: false };
  b.addDetachment(det);
  army.dets.push(det.id);
  return det;
}

/**
 * A unit arrives at the army's map edge and marches to its deployment zone. Units of one
 * detachment arrive side by side.
 */
export function arrive(b: Battle, army: Army, det: Detachment, typeId: string): Unit {
  const t = unitType(typeId);
  const cx = (army.zone[0]! + army.zone[2]!) / 2;
  const cy = (army.zone[1]! + army.zone[3]!) / 2;
  const [fx, fy] = norm(cx - army.edgeX, cy - army.edgeY, 0, -1);
  const k = det.units.length;
  const lat = k === 0 ? 0 : (k % 2 === 1 ? 1 : -1) * Math.ceil(k / 2) * 14;
  const n = Math.max(1, Math.round(t.size * b.world.settings.unitSize));
  const u = spawnUnit(b.world, army, det, typeId, army.edgeX + fx * 6 - fy * lat, army.edgeY + fy * 6 + fx * lat, fx, fy, n, b.map);
  u.born = b.world.tick;
  if (!det.cmdUnit) det.cmdUnit = u.id;
  b.reindex();
  orderMove(b, u, cx - fy * lat, cy + fx * lat, fx, fy, 0, false, false);
  b.emit({ k: 'arrive', u: u.id });
  return u;
}

/** Refills a worn unit out of combat, near its general or map edge. Price per man. */
export function replenish(b: Battle, p: PlayerState, unitId: number): void {
  const army = b.army(p.army);
  const u = b.unit(unitId);
  if (army && u) refill(b, army, p, u, p.id);
}

/** Refills u from the purse; the message goes to player `to` (0: the army's side). */
function refill(b: Battle, army: Army, purse: Purse, u: Unit, to: number): void {
  if (!goldEnabled(b, army.side) || b.world.phase !== 'battle') return;
  if (u.army !== army.id || u.st === 'gone' || u.st === 'routing' || u.st === 'shattered' || u.engaged) return;
  const missing = u.max - u.sol.length;
  if (missing <= 0) return;
  const t = b.typeOf(u);
  const price = Math.ceil((t.cost / Math.max(1, t.size)) * 1.25);
  const c = b.center(u);
  const gen = b.soldier(army.genSoldier);
  const near = (gen && dist(c.x, c.y, gen.x, gen.y) < 50) || dist(c.x, c.y, army.edgeX, army.edgeY) < 60;
  if (!near) return;
  const n = Math.min(missing, Math.floor(purse.gold / price));
  if (n <= 0) return;
  purse.gold -= n * price;
  addMen(b, u, n);
  if (to) b.msg(`${t.name} replenished (+${n}).`, 'good', -1, to);
  else b.msg(`${army.name}'s ${t.name} replenished (+${n}).`, 'good', army.side);
}

/** The army's purse while the AI leads it: its player's gold if it has one, else its own. */
function purseOf(b: Battle, a: Army): Purse {
  return b.player(a.ctrl) ?? a;
}

/**
 * The AI general spends gold every ten seconds in gold modes: refilling worn units resting
 * near him or the map edge, then buying units to keep the army balanced (about half line
 * infantry), and its faction's super unit when rich enough and it has none.
 */
export function aiSpend(b: Battle): void {
  const w = b.world;
  const sc = b.scenario;
  if (!sc.recruit?.gold || w.phase !== 'battle') return;
  for (const a of w.armies) {
    if ((w.tick + a.id * 7) % sec(10) !== 0 || !goldEnabled(b, a.side) || !aiArmy(b, a)) continue;
    const purse = purseOf(b, a);
    const own = w.units.filter((u) => u.army === a.id && u.st !== 'gone');
    for (const u of own) if ((u.max - u.sol.length) * 4 >= u.max) refill(b, a, purse, u, 0);
    if (own.length >= sc.recruit.maxUnits) continue;
    const pool = recruitable(a.faction);
    const champions = pool.find((t) => t.elite);
    if (champions && purse.gold >= champions.cost * 1.25 && !own.some((u) => b.typeOf(u).elite)) {
      buyUnit(b, a, purse, champions.id, undefined, a.name);
      continue;
    }
    const count: Record<UnitRole, number> = { line: 0, missile: 0, horse: 0 };
    for (const u of own) if (!b.typeOf(u).general) count[roleOf(b.typeOf(u))]++;
    const n = count.line + count.missile + count.horse + 1;
    const role: UnitRole = count.line * 2 < n ? 'line' : count.missile * 4 < n ? 'missile' : count.horse * 4 < n ? 'horse' : 'line';
    // The best unit of that kind it can afford.
    let pick: string | undefined;
    let best = -1;
    for (const t of pool) {
      if (t.elite || roleOf(t) !== role || t.cost > purse.gold || t.cost <= best) continue;
      best = t.cost;
      pick = t.id;
    }
    if (pick) buyUnit(b, a, purse, pick, undefined, a.name);
  }
}

/** Fresh men join a unit just behind it (replenishing, and AI allies between waves). */
export function addMen(b: Battle, u: Unit, n: number): void {
  const t = b.typeOf(u);
  const c = b.center(u);
  for (let k = 0; k < n; k++) {
    const id = b.newId();
    const s = { id, u: u.id, x: c.x - u.dx * 3 + (k % 5) * 0.8, y: c.y - u.dy * 3 + Math.floor(k / 5) * 0.8, vx: 0, vy: 0, fx: u.dx, fy: u.dy, hp: t.hp * HP_SCALE * strengthOf(b.world.settings, u.side), slot: u.sol.length, rank: 0, tgt: 0, cd: 0, act: 0, actK: 0, chg: 0 };
    b.addSoldier(s);
    u.sol.push(id);
  }
}

/** Steady income for players on gold sides, and armies without one, once a second. */
export function payIncome(b: Battle): void {
  const r = b.scenario.recruit;
  if (!r?.income || b.world.tick % 20 !== 0) return;
  for (const p of b.world.players) {
    if (!p.on || p.role === 'spectator') continue;
    const a = b.army(p.army);
    if (a && goldEnabled(b, a.side)) p.gold = Math.round((p.gold + r.income / 60) * 100) / 100;
  }
  if (!r.gold) return;
  for (const a of b.world.armies) if (!b.player(a.ctrl) && goldEnabled(b, a.side)) a.gold = Math.round((a.gold + r.income / 60) * 100) / 100;
}

/** Gold for kills: a share of the fallen soldier's price goes to whoever led the killers. */
export function bounty(b: Battle, killerUnit: number, victimType: string): void {
  const ku = b.unit(killerUnit);
  if (!ku) return;
  const a = b.army(ku.army);
  if (!a || !goldEnabled(b, a.side)) return;
  const d = b.detachment(ku.det);
  const pid = ku.possBy || d?.ctrl || a.ctrl;
  const purse: Purse = b.player(pid) ?? a;
  const t = unitType(victimType);
  purse.gold = Math.round((purse.gold + (t.cost / Math.max(1, t.size)) * 0.2) * 100) / 100;
}
