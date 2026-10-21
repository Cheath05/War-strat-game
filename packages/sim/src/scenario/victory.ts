// Victory rules: a side loses when every unit it has on the field has fled or broken, or
// when a scenario rule (timer, breakthrough zone, points) decides it.

import type { Battle } from '../battle';
import { TICK_HZ } from '../constants';

/**
 * A side is broken when nothing it has on the field is still willing to fight, or what is
 * left is a remnant (under 8% of the men it brought), with no reinforcements to come.
 */
export function sideBroken(b: Battle, side: number): boolean {
  if (b.world.scenario.vars[`pending${side}`] ?? 0) return false;
  let fighting = 0;
  let brought = 0;
  for (const u of b.world.units) {
    if (u.side !== side) continue;
    brought += u.max;
    if (u.st !== 'gone' && u.st !== 'routing' && u.st !== 'shattered') fighting += u.sol.length;
  }
  return fighting === 0 || fighting < brought * 0.08;
}

export function countInZone(b: Battle, side: number, zone: string): number {
  const z = b.map.zones[zone];
  if (!z) return 0;
  let n = 0;
  for (const s of b.world.soldiers) {
    if (s.x < z.x0 || s.x > z.x1 || s.y < z.y0 || s.y > z.y1) continue;
    const u = b.unit(s.u);
    if (u && u.side === side && u.st !== 'routing' && u.st !== 'shattered') n++;
  }
  return n;
}

export function endBattle(b: Battle, winner: number, reason: string): void {
  const w = b.world;
  if (w.result) return;
  w.result = { winner, reason, tick: w.tick };
  w.phase = 'ended';
  b.emit({ k: 'end', winner, reason });
  const name = winner >= 0 ? w.sides[winner]!.name : 'Nobody';
  b.msg(winner >= 0 ? `${name} are victorious! (${reason})` : `The battle ends in a draw (${reason}).`, 'epic');
}

export function checkVictory(b: Battle): void {
  const w = b.world;
  if (w.result || w.tick % 10 !== 0) return;
  const t = w.scenario.t;
  for (const rule of b.scenario.victory) {
    switch (rule.k) {
      case 'rout':
        for (const side of [0, 1]) {
          if (sideBroken(b, side)) return endBattle(b, 1 - side, `${w.sides[side]!.name} broken`);
        }
        break;
      case 'timer':
        if (t >= rule.seconds * TICK_HZ) return endBattle(b, rule.winner, 'held until time ran out');
        break;
      case 'zone':
        if (countInZone(b, rule.side, rule.zone) >= rule.count) return endBattle(b, rule.side, 'broke through');
        break;
      case 'points':
        for (const side of [0, 1]) {
          if (w.sides[side]!.score >= rule.target) return endBattle(b, side, 'victory points');
        }
        break;
      case 'deadline':
        if (t >= rule.seconds * TICK_HZ) {
          const s0 = w.sides[0]!.score;
          const s1 = w.sides[1]!.score;
          return endBattle(b, s0 === s1 ? -1 : s0 > s1 ? 0 : 1, 'most victory points at the deadline');
        }
        break;
    }
  }
  if (w.settings.timeLimit > 0 && t >= w.settings.timeLimit * TICK_HZ) {
    const strength = [0, 0];
    for (const u of w.units) if (u.st !== 'gone' && u.st !== 'shattered') strength[u.side]! += u.sol.length;
    const s0 = w.sides[0]!.score + strength[0]!;
    const s1 = w.sides[1]!.score + strength[1]!;
    endBattle(b, s0 === s1 ? -1 : s0 > s1 ? 0 : 1, 'time limit');
  }
}
