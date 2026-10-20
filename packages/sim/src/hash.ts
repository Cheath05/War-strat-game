// A fingerprint of the world. Clients compare these every HASH_EVERY ticks; any difference
// means a desync and triggers a resync from a healthy player.

import type { World } from './types';

const F64 = new Float64Array(1);
const U32 = new Uint32Array(F64.buffer);

class Hasher {
  h = 0x811c9dc5 | 0;
  int(v: number): void {
    this.h = Math.imul(this.h ^ (v | 0), 0x01000193);
  }
  num(v: number): void {
    // + 0 folds -0 into 0, which JSON can't tell apart either.
    F64[0] = v + 0;
    this.h = Math.imul(this.h ^ U32[0]!, 0x01000193);
    this.h = Math.imul(this.h ^ U32[1]!, 0x01000193);
  }
  str(s: string): void {
    for (let i = 0; i < s.length; i++) this.int(s.charCodeAt(i));
  }
}

export function hashWorld(w: World): number {
  const h = new Hasher();
  h.int(w.tick);
  h.str(w.phase);
  for (const r of w.rng) h.int(r);
  h.int(w.nextId);
  for (const s of w.soldiers) {
    h.int(s.id);
    h.num(s.x);
    h.num(s.y);
    h.num(s.vx);
    h.num(s.vy);
    h.num(s.hp);
    h.int(s.tgt);
    h.int(s.cd);
    h.int(s.act);
  }
  for (const u of w.units) {
    h.int(u.id);
    h.str(u.st);
    h.str(u.order.k);
    h.num(u.ax);
    h.num(u.ay);
    h.num(u.dx);
    h.num(u.dy);
    h.num(u.morale);
    h.num(u.fat);
    h.int(u.ammo);
    h.int(u.flags);
    h.int(u.sol.length);
    h.int(u.cap);
    h.int(u.path.length);
  }
  for (const p of w.proj) {
    h.int(p.id);
    h.int(p.t);
    h.num(p.tx);
    h.num(p.ty);
  }
  for (const a of w.armies) {
    h.int(a.id);
    h.int(a.ai.stage);
    h.str(a.ai.plan);
    h.int(a.shock);
  }
  for (const d of w.dets) {
    h.int(d.id);
    h.str(d.order.k);
    h.num(d.order.x);
    h.num(d.order.y);
  }
  for (const p of w.players) {
    h.int(p.id);
    h.int(p.poss);
    h.num(p.gold);
    h.num(p.mx);
    h.num(p.my);
  }
  for (const s of w.sides) h.num(s.score);
  for (const o of w.objectives) {
    h.int(o.owner);
    h.num(o.prog);
  }
  h.int(w.scenario.t);
  h.int(w.scenario.wave);
  return h.h >>> 0;
}
