// Player orders. Every change a player makes to the battle is a command that travels
// through the relay, is tagged with the sender's player id there, and is applied by every
// computer at the same tick. Commands are validated here: a player can only order what
// they control.

import type { Battle } from './battle';
import { sec } from './constants';
import { dist, norm, q2 } from './math/det';
import { FORM, depthOf } from './units/formation';
import type { DetOrder, FormationKind, PlayerState, Unit } from './types';
import { RANK, UF } from './types';
import { possess, unpossess, avatarAction } from './roles/possession';
import { useAbility } from './roles/abilities';
import { recruit, replenish } from './economy/gold';

export type Command =
  | { k: 'move'; u: number[]; x: number; y: number; dx?: number; dy?: number; w?: number; run?: boolean }
  | { k: 'attack'; u: number[]; t: number; run?: boolean }
  | { k: 'halt'; u: number[] }
  | { k: 'form'; u: number[]; f: FormationKind }
  | { k: 'flag'; u: number[]; f: 'fire' | 'skirmish' | 'guard'; on: boolean }
  | { k: 'det'; d: number; o: DetOrder['k']; x?: number; y?: number; t?: number }
  | { k: 'ability'; u: number; a: string; x?: number; y?: number }
  | { k: 'possess'; s: number }
  | { k: 'unpossess' }
  | { k: 'avatar'; mx: number; my: number; run: boolean; ax: number; ay: number }
  | { k: 'act'; a: 'charge' | 'rally' | 'volley' | 'hold' | 'formation'; x?: number; y?: number }
  | { k: 'deploy'; u: number; x: number; y: number; dx: number; dy: number }
  | { k: 'ready'; on: boolean }
  | { k: 'recruit'; t: string }
  | { k: 'replenish'; u: number }
  /** Only the relay sends these: a player dropped or came back. */
  | { k: 'sys'; e: 'leave' | 'join'; p: number };

/** A command as delivered in a relay turn: p is the sender, set by the relay. */
export interface TaggedCommand {
  p: number;
  c: Command;
}

/** Can player p give direct orders to unit u? */
export function controls(b: Battle, p: PlayerState, u: Unit): boolean {
  if (p.role === 'spectator' || !p.on) return false;
  const d = b.detachment(u.det);
  if (!d) return false;
  if (p.role === 'commander') return d.ctrl === p.id;
  // A general commands their army, except detachments led by human commanders.
  return u.army === p.army && (d.ctrl === 0 || d.ctrl === p.id || d.guard);
}

function ownedUnits(b: Battle, p: PlayerState, ids: number[]): Unit[] {
  const out: Unit[] = [];
  const seen = new Set<number>();
  for (const id of ids.slice(0, 64)) {
    if (seen.has(id)) continue;
    seen.add(id);
    const u = b.unit(id);
    if (u && u.st !== 'gone' && controls(b, p, u)) out.push(u);
  }
  return out;
}

function finite(...vs: (number | undefined)[]): boolean {
  return vs.every((v) => v === undefined || (typeof v === 'number' && Number.isFinite(v)));
}

export function applyCommands(b: Battle, cmds: TaggedCommand[]): void {
  for (const tc of cmds) {
    const c = tc.c;
    if (!c || typeof c !== 'object') continue;
    if (c.k === 'sys') {
      applySys(b, c.e, c.p);
      continue;
    }
    const p = b.player(tc.p);
    if (!p) continue;
    try {
      applyOne(b, p, c);
    } catch {
      // A malformed command is dropped the same way on every computer.
    }
  }
}

function applySys(b: Battle, e: 'leave' | 'join', pid: number): void {
  const p = b.player(pid);
  if (!p) return;
  if (e === 'leave') {
    if (p.poss) unpossess(b, p);
    p.on = false;
    p.mx = 0;
    p.my = 0;
    b.msg(`${p.name} lost connection; their troops fight on under AI command.`, 'bad');
  } else {
    p.on = true;
    b.msg(`${p.name} is back in command.`, 'good');
  }
}

function applyOne(b: Battle, p: PlayerState, c: Command): void {
  const w = b.world;
  const deploy = w.phase === 'deploy';
  switch (c.k) {
    case 'ready':
      p.ready = !!c.on;
      return;
    case 'deploy': {
      if (!deploy || !finite(c.x, c.y, c.dx, c.dy)) return;
      const u = b.unit(c.u);
      if (!u || !controls(b, p, u)) return;
      teleportUnit(b, u, q2(c.x), q2(c.y), c.dx, c.dy);
      return;
    }
    case 'recruit':
      if (!deploy) recruit(b, p, String(c.t));
      return;
    case 'replenish':
      replenish(b, p, c.u);
      return;
  }
  if (deploy || w.phase !== 'battle') return;

  switch (c.k) {
    case 'move': {
      if (!finite(c.x, c.y, c.dx, c.dy, c.w)) return;
      const units = ownedUnits(b, p, c.u);
      for (const u of units) {
        if (u.possBy && u.possBy !== p.id) continue;
        if (u.possBy === p.id) unpossess(b, p);
        orderMove(b, u, q2(c.x), q2(c.y), c.dx ?? 0, c.dy ?? 0, c.w ?? 0, !!c.run, true);
      }
      return;
    }
    case 'attack': {
      const target = b.unit(c.t);
      if (!target || target.st === 'gone') return;
      for (const u of ownedUnits(b, p, c.u)) {
        if (target.side === u.side) continue;
        if (u.possBy === p.id) unpossess(b, p);
        orderAttack(b, u, target.id, !!c.run, true);
      }
      return;
    }
    case 'halt':
      for (const u of ownedUnits(b, p, c.u)) halt(b, u);
      return;
    case 'form':
      for (const u of ownedUnits(b, p, c.u)) setFormation(b, u, c.f);
      return;
    case 'flag': {
      const bit = c.f === 'fire' ? UF.fireAtWill : c.f === 'skirmish' ? UF.skirmish : UF.guard;
      for (const u of ownedUnits(b, p, c.u)) u.flags = c.on ? u.flags | bit : u.flags & ~bit;
      return;
    }
    case 'det': {
      const d = b.detachment(c.d);
      if (!d || !finite(c.x, c.y)) return;
      // Generals order their own army's detachments, including human commanders' (as advice).
      if (p.role !== 'general' || d.army !== p.army) return;
      d.order = { k: c.o, x: q2(c.x ?? 0), y: q2(c.y ?? 0), t: c.t ?? 0, by: p.id, at: w.tick };
      if (d.ctrl === 0) {
        for (const id of d.units) {
          const u = b.unit(id);
          if (u) u.order.manual = false;
        }
      } else {
        b.msg(`${p.name} orders ${d.name}: ${ORDER_NAMES[c.o]}.`, 'info', -1, d.ctrl);
      }
      return;
    }
    case 'ability': {
      const u = b.unit(c.u);
      if (u && controls(b, p, u) && finite(c.x, c.y)) useAbility(b, u, c.a, c.x, c.y);
      return;
    }
    case 'possess': {
      const s = b.soldier(c.s);
      if (!s || s.rank < RANK.captain) return;
      const u = b.unit(s.u);
      if (!u || !controls(b, p, u)) return;
      possess(b, p, s, u);
      return;
    }
    case 'unpossess':
      unpossess(b, p);
      return;
    case 'avatar': {
      if (!finite(c.mx, c.my, c.ax, c.ay)) return;
      const [mx, my] = c.mx || c.my ? norm(c.mx, c.my) : [0, 0];
      p.mx = q2(mx);
      p.my = q2(my);
      p.run = !!c.run;
      p.aimX = q2(c.ax);
      p.aimY = q2(c.ay);
      return;
    }
    case 'act':
      if (finite(c.x, c.y)) avatarAction(b, p, c.a, c.x, c.y);
      return;
  }
}

export const ORDER_NAMES: Record<DetOrder['k'], string> = {
  none: 'Free command',
  hold: 'Hold position',
  advance: 'Advance',
  attack: 'Attack',
  flankL: 'Flank left',
  flankR: 'Flank right',
  skirmish: 'Skirmish',
  reserve: 'Stay in reserve',
  guard: 'Guard the general',
  retreat: 'Fall back',
};

// --- Order helpers used by commands and the AI ---------------------------------------------

export function orderMove(b: Battle, u: Unit, x: number, y: number, dx: number, dy: number, width: number, run: boolean, manual: boolean): void {
  if (u.st === 'routing' || u.st === 'shattered' || u.st === 'gone') return;
  const fx = Math.max(1, Math.min(b.map.wm - 1, x));
  const fy = Math.max(1, Math.min(b.map.hm - 1, y));
  const [ndx, ndy] = dx || dy ? norm(dx, dy) : [0, 0];
  u.order = { k: 'move', x: fx, y: fy, dx: ndx, dy: ndy, width: width > 0 ? Math.round(width) : 0, target: 0, run: run && !FORM[u.form].noRun, manual };
  if (width > 0) u.bw = Math.max(1, Math.round(width));
  u.flags |= UF.needPath;
  u.flags &= ~(UF.brace | UF.charging);
  u.path = [];
  u.chargeT = 0;
  if (u.st === 'idle' || u.st === 'engaged') u.st = 'moving';
}

export function orderAttack(b: Battle, u: Unit, target: number, run: boolean, manual: boolean): void {
  if (u.st === 'routing' || u.st === 'shattered' || u.st === 'gone') return;
  if (u.order.k === 'attack' && u.order.target === target && u.order.run === run) {
    u.order.manual = manual || u.order.manual;
    return;
  }
  u.order = { k: 'attack', x: 0, y: 0, dx: 0, dy: 0, width: 0, target, run: run && !FORM[u.form].noRun, manual };
  u.flags &= ~UF.brace;
  u.flags |= UF.needPath;
  u.path = [];
  if (u.st === 'idle') u.st = 'moving';
  if (b.typeOf(u).missile) u.fireT = target;
}

export function halt(b: Battle, u: Unit): void {
  if (u.st === 'routing' || u.st === 'shattered' || u.st === 'gone') return;
  const c = b.center(u);
  u.order = { k: 'none', x: 0, y: 0, dx: 0, dy: 0, width: 0, target: 0, run: false, manual: true };
  u.path = [];
  u.flags &= ~(UF.needPath | UF.charging);
  u.chargeT = 0;
  // Re-anchor where the men actually are, so they don't walk back.
  const t = b.typeOf(u);
  const front = depthOf(u, t, Math.max(1, u.sol.length - 1), u.width) / 2;
  u.ax = c.x + u.dx * front;
  u.ay = c.y + u.dy * front;
  for (const id of u.sol) {
    const s = b.soldier(id);
    if (s) s.tgt = 0;
  }
  if (u.st === 'moving' || u.st === 'engaged') u.st = 'idle';
}

export function setFormation(b: Battle, u: Unit, f: FormationKind): void {
  const t = b.typeOf(u);
  if (!t.forms.includes(f) || u.st === 'routing' || u.st === 'shattered') return;
  u.form = f;
  u.baseForm = f;
  if (FORM[f].noRun && u.order.run) u.order.run = false;
  if (!FORM[f].brace) u.flags &= ~UF.brace;
}

/** Instantly places a unit in formation (deployment phase only). */
export function teleportUnit(b: Battle, u: Unit, x: number, y: number, dx: number, dy: number): void {
  const army = b.army(u.army);
  if (!army) return;
  // Units stay inside their army's deployment zone.
  const [x0, y0, x1, y1] = army.zone as [number, number, number, number];
  if (x < x0 || x > x1 || y < y0 || y > y1) return;
  const [fx, fy] = norm(dx, dy, u.dx, u.dy);
  const ox = u.ax;
  const oy = u.ay;
  u.ax = x;
  u.ay = y;
  u.dx = fx;
  u.dy = fy;
  for (const id of u.sol) {
    const s = b.soldier(id);
    if (!s) continue;
    s.x += x - ox;
    s.y += y - oy;
    s.fx = fx;
    s.fy = fy;
  }
}

/** Distance helper for AI and commands. */
export function unitDist(b: Battle, a: Unit, c: Unit): number {
  const ca = b.center(a);
  const cc = b.center(c);
  return dist(ca.x, ca.y, cc.x, cc.y);
}

export const CHARGE_TICKS = sec(3);
