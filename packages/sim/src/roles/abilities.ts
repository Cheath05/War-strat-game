// Officer abilities: the general's Rally and Inspire, and a captain's rallying shout.

import type { Battle } from '../battle';
import { sec } from '../constants';
import { dist } from '../math/det';
import type { Unit } from '../types';

export interface AbilityDef {
  id: string;
  name: string;
  desc: string;
  cooldown: number;
  radius: number;
}

export const ABILITIES: Record<string, AbilityDef> = {
  rally: { id: 'rally', name: 'Rally', desc: 'Routing units nearby turn and reform; others steady themselves.', cooldown: sec(60), radius: 45 },
  inspire: { id: 'inspire', name: 'Inspire', desc: 'Nearby units fight harder and hold longer for 20 seconds.', cooldown: sec(90), radius: 35 },
  shout: { id: 'shout', name: 'Rallying shout', desc: 'The captain steadies his own men and stops nearby friends from running.', cooldown: sec(30), radius: 15 },
};

/** Abilities a unit's officer can use right now. */
export function abilitiesOf(b: Battle, u: Unit): string[] {
  const t = b.typeOf(u);
  const out = [...(t.abilities ?? [])];
  if (u.possBy && !out.includes('shout')) out.push('shout');
  return out;
}

export function useAbility(b: Battle, u: Unit, id: string, _x = 0, _y = 0): void {
  const def = ABILITIES[id];
  if (!def || u.st === 'routing' || u.st === 'shattered' || u.st === 'gone') return;
  if (!abilitiesOf(b, u).includes(id)) return;
  if ((u.cds[id] ?? 0) > 0) return;
  const officer = b.soldier(u.cap);
  if (!officer) return;
  u.cds[id] = def.cooldown;
  const army = b.army(u.army)!;
  for (const o of b.world.units) {
    if (o.side !== u.side || o.st === 'gone') continue;
    const c = b.center(o);
    if (dist(c.x, c.y, officer.x, officer.y) > def.radius) continue;
    if (id === 'rally' || id === 'shout') {
      if (o.st === 'routing') {
        o.st = 'rallying';
        o.calm = 0;
        o.ax = c.x;
        o.ay = c.y;
        o.path = [];
      }
      o.buff = Math.max(o.buff, id === 'shout' && o.id !== u.id ? sec(6) : sec(10));
      o.shock = 0;
    } else if (id === 'inspire') {
      o.buff = Math.max(o.buff, sec(20));
    }
  }
  b.emit({ k: 'ability', a: id, army: army.id, u: u.id, x: officer.x, y: officer.y });
}

/** Ticks down cooldowns and buffs. */
export function updateTimers(b: Battle): void {
  for (const u of b.world.units) {
    if (u.buff > 0) u.buff--;
    for (const k in u.cds) {
      const v = u.cds[k]!;
      if (v > 0) u.cds[k] = v - 1;
    }
  }
}
