// Bonus objectives: judged on how a battle ended, and only for the winner.

import type { Battle } from '../battle';
import { TICK_HZ } from '../constants';
import type { BattleDef, Objective } from './types';
import { slotKey } from './scenario';

/** What an objective asks, in words. */
export function objectiveText(o: Objective, battle: BattleDef, side: number): string {
  if (o.text) return o.text;
  switch (o.k) {
    case 'time':
      return `Win within ${o.min} minutes`;
    case 'losses':
      return `Win losing fewer than ${o.pct}% of your men`;
    case 'general':
      return 'Your general survives the battle';
    case 'killGeneral': {
      const enemy = battle.sides[1 - side]!.armies[o.army ?? 0];
      return `${enemy ? enemy.general : 'The enemy general'} falls`;
    }
    case 'destroy':
      return `Destroy or rout ${o.what}`;
    case 'hold':
      return `Hold ${o.what} at the end`;
    case 'kills':
      return `Your own army makes ${Math.round(o.share * 100)}% of your side's kills`;
  }
}

/**
 * Whether the player (leading the army in `slot`, on `side`) met the objective. Every
 * objective needs the battle won.
 */
export function judge(b: Battle, o: Objective, side: number, slot: string): boolean {
  const w = b.world;
  if (!w.result || w.result.winner !== side) return false;
  const army = w.armies.find((a) => a.slot === slot);
  if (!army) return false;
  const units = w.units.filter((u) => u.army === army.id);
  switch (o.k) {
    case 'time':
      return w.scenario.t <= o.min * 60 * TICK_HZ;
    case 'losses': {
      const brought = units.reduce((n, u) => n + u.max, 0);
      return brought > 0 && (army.losses / brought) * 100 < o.pct;
    }
    case 'general':
      return !army.genDead;
    case 'killGeneral': {
      const key = slotKey(1 - side, o.army ?? 0);
      const enemy = w.armies.find((a) => a.slot === key) ?? w.armies.find((a) => a.side !== side);
      return !!enemy?.genDead;
    }
    case 'destroy': {
      const targets = w.units.filter((u) => u.side !== side && ((o.cls && o.cls.includes(b.typeOf(u).cls)) || (o.types && o.types.includes(u.type))));
      return targets.length > 0 && targets.every((u) => u.st === 'gone' || u.st === 'routing' || u.st === 'shattered' || u.sol.length === 0);
    }
    case 'hold': {
      const pt = b.map.points[o.point];
      if (!pt) return false;
      const count = [0, 0];
      for (const s of w.soldiers) {
        if (s.hp <= 0 || Math.abs(s.x - pt.x) > 30 || Math.abs(s.y - pt.y) > 30) continue;
        const u = b.unit(s.u);
        if (u && u.st !== 'routing' && u.st !== 'shattered') count[u.side]!++;
      }
      return count[side]! > 0 && count[side]! >= count[1 - side]!;
    }
    case 'kills': {
      const all = w.armies.filter((a) => a.side === side).reduce((n, a) => n + a.kills, 0);
      return all > 0 && army.kills >= all * o.share;
    }
  }
}
