// Elephants and scythed chariots. Chariots driving at speed cut down everyone their
// blades reach and keep going; panicked (routing) elephants rampage through anyone near
// them, friend or foe.

import type { Battle } from '../battle';
import { PACE } from '../constants';
import { dist } from '../math/det';
import { rand } from '../math/rng';
import { ACT } from '../types';
import { damage } from './damage';

const EVERY = 5;

export function updateBeasts(b: Battle): void {
  const w = b.world;
  if ((w.tick % EVERY) !== 0) return;
  for (const u of w.units) {
    if (u.st === 'gone') continue;
    const t = b.typeOf(u);
    if (t.cls !== 'chariot' && t.cls !== 'ele') continue;
    const rampage = t.cls === 'ele' && (u.st === 'routing' || u.st === 'shattered');
    for (const id of u.sol) {
      const s = b.soldier(id);
      if (!s) continue;
      const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      const scything = t.cls === 'chariot' && speed > t.run * PACE * 0.5;
      if (!scything && !rampage) continue;
      const r = t.radius + 1.2;
      b.grid.query(s.x, s.y, r + 1, (j) => {
        const e = w.soldiers[j]!;
        if (e.hp <= 0 || e === s) return;
        const eu = b.unit(e.u);
        if (!eu || eu === u) return;
        if (!rampage && eu.side === u.side) return;
        if (dist(s.x, s.y, e.x, e.y) > r + b.typeOf(eu).radius) return;
        if (rand(w.rng) > (rampage ? 0.35 : 0.55)) return;
        damage(b, e, eu, rampage ? 45 : 38, s, u);
        if (e.hp > 0) {
          e.act = 12;
          e.actK = ACT.knocked;
          e.vx += (e.x - s.x) * 2;
          e.vy += (e.y - s.y) * 2;
        }
        eu.shock = Math.max(eu.shock, 40);
      });
      // Chariots barely slow down as they cut through.
      if (scything) {
        s.vx *= 1.02;
        s.vy *= 1.02;
      }
    }
  }
}
