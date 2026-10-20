// End-of-tick bookkeeping: removes the dead and the fled, promotes new officers, and
// handles a general or a possessed officer falling.

import type { Battle } from '../battle';
import { sec } from '../constants';
import type { Soldier, Unit } from '../types';
import { RANK } from '../types';
import { repackSlots } from './movement';

export function cleanup(b: Battle): void {
  const w = b.world;
  let any = false;
  for (const s of w.soldiers) {
    if (s.hp <= 0) {
      any = true;
      break;
    }
  }
  if (!any) return;
  const touched: Unit[] = [];
  const seen = new Set<number>();
  const fallen: Soldier[] = [];
  w.soldiers = w.soldiers.filter((s) => {
    if (s.hp > 0) return true;
    fallen.push(s);
    b.forgetSoldier(s.id);
    if (!seen.has(s.u)) {
      seen.add(s.u);
      const u = b.unit(s.u);
      if (u) touched.push(u);
    }
    return false;
  });
  // Possessed officers and generals first (they need the soldier's last position).
  for (const s of fallen) {
    for (const p of w.players) {
      if (p.poss === s.id) {
        unpossessDead(b, p.id, s);
      }
    }
    if (s.rank === RANK.general) generalDown(b, s);
  }
  for (const u of touched) {
    const fled = fallen.filter((s) => s.u === u.id && s.hp === -1).length;
    if (fled) u.losses += fled;
    u.sol = u.sol.filter((id) => b.soldier(id) !== undefined);
    if (!u.sol.length) {
      u.st = 'gone';
      u.cap = 0;
      u.possBy = 0;
      u.order.k = 'none';
      continue;
    }
    if (!b.soldier(u.cap)) promote(b, u, fallen.find((s) => s.id === u.cap));
    repackSlots(b, u);
  }
  fixCommanders(b);
}

function unpossessDead(b: Battle, pid: number, s: Soldier): void {
  const p = b.player(pid)!;
  const u = b.unit(s.u);
  // The soldier is already gone from the index; release the unit by hand.
  p.poss = 0;
  p.mx = 0;
  p.my = 0;
  if (u) {
    u.possBy = 0;
    u.chargeAt = 0;
    u.shock = Math.max(u.shock, sec(4));
    u.order = { k: 'none', x: 0, y: 0, dx: 0, dy: 0, width: 0, target: 0, run: false, manual: true };
    for (const f of b.world.units) {
      if (f.follow === u.id) {
        f.follow = 0;
        if (f.order.k === 'follow') f.order.k = 'none';
      }
    }
  }
  b.emit({ k: 'possLost', p: pid, s: s.id });
  b.msg('You have fallen! Your men fight on.', 'bad', -1, pid);
}

function generalDown(b: Battle, s: Soldier): void {
  const u = b.unit(s.u);
  if (!u) return;
  const a = b.army(u.army);
  if (!a || a.genDead) return;
  a.genDead = true;
  a.genSoldier = 0;
  a.shock = sec(60);
  b.emit({ k: 'genDead', army: a.id, x: s.x, y: s.y });
  b.msg(`${a.name} has fallen! ${a.title} waver.`, 'epic', -1);
}

/** Picks the man nearest the front centre as the unit's new officer. */
function promote(b: Battle, u: Unit, old: Soldier | undefined): void {
  const front = Math.floor(Math.min(u.width, u.sol.length) / 2);
  let pick: Soldier | undefined;
  for (const id of u.sol) {
    const s = b.soldier(id)!;
    if (!pick || Math.abs(s.slot - front) < Math.abs(pick.slot - front)) pick = s;
  }
  if (!pick) return;
  const oldRank = old?.rank ?? RANK.captain;
  pick.rank = oldRank === RANK.general ? RANK.captain : oldRank;
  u.cap = pick.id;
  u.shock = Math.max(u.shock, sec(3));
  if (oldRank >= RANK.captain) b.emit({ k: 'officerDead', u: u.id, rank: oldRank });
  // Keep the detachment's commander slot filled.
  const d = b.detachment(u.det);
  if (d && d.cmdUnit === u.id && oldRank === RANK.commander) pick.rank = RANK.commander;
}

/** Moves a detachment's commander to another unit when his unit is destroyed. */
export function fixCommanders(b: Battle): void {
  for (const d of b.world.dets) {
    const cu = b.unit(d.cmdUnit);
    if (cu && cu.st !== 'gone') continue;
    const next = d.units.map((id) => b.unit(id)).find((u) => u && u.st !== 'gone' && u.st !== 'shattered');
    if (!next) continue;
    d.cmdUnit = next.id;
    const off = b.soldier(next.cap);
    if (off && off.rank < RANK.commander) off.rank = RANK.commander;
  }
}
