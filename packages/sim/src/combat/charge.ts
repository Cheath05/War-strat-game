// Charge impacts: a fast-moving soldier who reaches the enemy gets a short charge bonus,
// and heavy chargers (cavalry, elephants) bowl lighter men over, unless those men are
// braced spears facing the charge, which stop it cold and hurt the charger.

import type { Battle } from '../battle';
import { PACE, sec } from '../constants';
import { len, norm } from '../math/det';
import { rand } from '../math/rng';
import { terrainAt } from '../map/mapgen';
import { TERRAIN } from '../map/terrain';
import { ACT, UF } from '../types';
import { FORM } from '../units/formation';
import { CHARGE_BONUS_TICKS, damage } from './damage';

export function resolveCharges(b: Battle): void {
  const w = b.world;
  for (const u of w.units) {
    if (u.chargeT > 0) {
      u.chargeT--;
      if (u.chargeT === 0) u.flags &= ~UF.charging;
    }
  }
  for (const s of w.soldiers) {
    if (s.chg > 0) {
      s.chg--;
      continue;
    }
    if (s.hp <= 0) continue;
    const u = b.unit(s.u)!;
    if (!(u.flags & UF.charging) || u.st === 'routing' || u.st === 'shattered') continue;
    const t = b.typeOf(u);
    const speed = len(s.vx, s.vy);
    if (speed < t.run * PACE * 0.55) continue;
    const [dx, dy] = norm(s.vx, s.vy);
    let hit = 0;
    let hitD = Infinity;
    b.grid.query(s.x, s.y, t.radius + 2.2, (j) => {
      const e = w.soldiers[j]!;
      if (e.hp <= 0) return;
      const eu = b.unit(e.u);
      if (!eu || eu.side === u.side) return;
      const ex = e.x - s.x;
      const ey = e.y - s.y;
      const d = Math.sqrt(ex * ex + ey * ey);
      const reachD = t.radius + b.typeOf(eu).radius + 0.5;
      if (d > reachD || d < 1e-6) return;
      if ((ex * dx + ey * dy) / d < 0.3) return; // only what's in front
      if (d < hitD) {
        hitD = d;
        hit = e.id;
      }
    });
    if (!hit) continue;
    const e = b.soldier(hit)!;
    const eu = b.unit(e.u)!;
    const et = b.typeOf(eu);
    s.chg = CHARGE_BONUS_TICKS;
    const rough = TERRAIN[terrainAt(b.map, e.x, e.y)]!.rough;
    const facing = -(dx * eu.dx + dy * eu.dy); // > 0 when hitting their front
    const braceUnit = (FORM[eu.form].brace || (eu.flags & UF.brace) !== 0) && (et.cls === 'spear' || et.cls === 'pike' || et.cls === 'inf');
    const braced = braceUnit && facing > 0.5 && !rough && eu.st !== 'routing' && eu.st !== 'shattered' && (e.act === 0 || e.actK !== ACT.knocked);
    const force = t.mass * speed;
    const resist = et.mass * 2.5 * (braced ? 4 : 1) + 4;
    if (braced) {
      s.vx *= 0.1;
      s.vy *= 0.1;
      const hurt = t.mounted || t.cls === 'ele' || t.cls === 'chariot' ? 12 + et.bonusLarge * 0.8 : 4;
      damage(b, s, u, hurt, e, eu);
      b.emit({ k: 'impact', u: u.id, x: e.x, y: e.y, braced: true });
    } else if (force > resist) {
      const push = Math.min(3.2, (force - resist) / (et.mass * 6));
      e.vx += dx * push * 3;
      e.vy += dy * push * 3;
      e.act = sec(0.7) + Math.floor(rand(w.rng) * sec(0.6));
      e.actK = ACT.knocked;
      e.tgt = 0;
      const ratio = Math.min(2, force / resist);
      damage(b, e, eu, t.charge * 0.55 * ratio, s, u);
      eu.shock = Math.max(eu.shock, sec(2.5));
      s.vx *= 0.8;
      s.vy *= 0.8;
      b.emit({ k: 'impact', u: u.id, x: e.x, y: e.y, braced: false });
    } else {
      s.vx *= 0.35;
      s.vy *= 0.35;
      eu.shock = Math.max(eu.shock, sec(0.5));
    }
  }
}
