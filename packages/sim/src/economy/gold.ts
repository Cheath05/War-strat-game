// Gold (Last Stand, Objective battles, PVP Thermopylae): players earn it in battle and
// spend it on new units, which march in from their map edge, or on refilling worn units.

import type { Battle } from '../battle';
import { faction, unitType, hasUnitType } from '../data/registry';
import { dist, norm } from '../math/det';
import { HP_SCALE } from '../constants';
import type { Army, Detachment, PlayerState, Unit } from '../types';
import { spawnUnit, emptyDetOrder } from '../setup';
import { orderMove } from '../commands';

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
  const sc = b.scenario;
  if (!sc.recruit || !hasUnitType(typeId) || b.world.phase !== 'battle') return;
  const army = b.army(p.army);
  if (!army || !goldEnabled(b, army.side)) return;
  const t = unitType(typeId);
  if (t.faction !== army.faction || t.general || !faction(army.faction).units.includes(t)) return;
  if (p.gold < t.cost) return;
  const alive = b.world.units.filter((u) => u.army === army.id && u.st !== 'gone').length;
  if (alive >= sc.recruit.maxUnits) return;
  p.gold -= t.cost;
  // Reinforcements join the commander's detachment, or a reserve detachment of the general.
  let det = p.role === 'commander' ? b.detachment(p.det) : undefined;
  if (!det) det = b.world.dets.find((d) => d.army === army.id && d.name === 'Reinforcements') ?? newDetachment(b, army, 'Reinforcements');
  arrive(b, army, det, typeId);
  b.msg(`${p.name}'s ${t.name} are on their way.`, 'info', army.side);
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
  if (!army || !goldEnabled(b, army.side) || b.world.phase !== 'battle') return;
  const u = b.unit(unitId);
  if (!u || u.army !== army.id || u.st === 'gone' || u.st === 'routing' || u.st === 'shattered' || u.engaged) return;
  const missing = u.max - u.sol.length;
  if (missing <= 0) return;
  const t = b.typeOf(u);
  const price = Math.ceil((t.cost / Math.max(1, t.size)) * 1.25);
  const c = b.center(u);
  const gen = b.soldier(army.genSoldier);
  const near = (gen && dist(c.x, c.y, gen.x, gen.y) < 50) || dist(c.x, c.y, army.edgeX, army.edgeY) < 60;
  if (!near) return;
  const n = Math.min(missing, Math.floor(p.gold / price));
  if (n <= 0) return;
  p.gold -= n * price;
  addMen(b, u, n);
  b.msg(`${t.name} replenished (+${n}).`, 'good', -1, p.id);
}

/** Fresh men join a unit just behind it (replenishing, and AI allies between waves). */
export function addMen(b: Battle, u: Unit, n: number): void {
  const t = b.typeOf(u);
  const c = b.center(u);
  for (let k = 0; k < n; k++) {
    const id = b.newId();
    const s = { id, u: u.id, x: c.x - u.dx * 3 + (k % 5) * 0.8, y: c.y - u.dy * 3 + Math.floor(k / 5) * 0.8, vx: 0, vy: 0, fx: u.dx, fy: u.dy, hp: t.hp * HP_SCALE, slot: u.sol.length, rank: 0, tgt: 0, cd: 0, act: 0, actK: 0, chg: 0 };
    b.addSoldier(s);
    u.sol.push(id);
  }
}

/** Steady income for players on gold sides, once a second. */
export function payIncome(b: Battle): void {
  const r = b.scenario.recruit;
  if (!r?.income || b.world.tick % 20 !== 0) return;
  for (const p of b.world.players) {
    if (!p.on || p.role === 'spectator') continue;
    const a = b.army(p.army);
    if (a && goldEnabled(b, a.side)) p.gold = Math.round((p.gold + r.income / 60) * 100) / 100;
  }
}

/** Gold for kills: a share of the fallen soldier's price goes to whoever led the killers. */
export function bounty(b: Battle, killerUnit: number, victimType: string): void {
  const ku = b.unit(killerUnit);
  if (!ku) return;
  const a = b.army(ku.army);
  if (!a || !goldEnabled(b, a.side)) return;
  const d = b.detachment(ku.det);
  const pid = ku.possBy || d?.ctrl || a.ctrl;
  const p = b.player(pid);
  if (!p) return;
  const t = unitType(victimType);
  p.gold = Math.round((p.gold + (t.cost / Math.max(1, t.size)) * 0.2) * 100) / 100;
}
