// Words for campaign screens: how a battle is won, an army in brief, the battle briefing.

import { DIFFICULTIES, battleDef, faction, objectiveText, parseUnits, scenarioDef, unitType, type BattleDef, type CampaignNode, type VictoryRule } from '@pl/sim';
import type { CampaignSave } from '../../app/campaign';

/** How the battle is won and lost, from the player's side. */
export function victoryLines(b: BattleDef, side: number): string[] {
  const rules: VictoryRule[] = b.scenario ? scenarioDef(b.scenario.id).victory : (b.victory ?? [{ k: 'rout' }]);
  const out: string[] = [];
  for (const r of rules) {
    switch (r.k) {
      case 'rout':
        out.push('Break the enemy: rout or destroy every army they have on the field.');
        break;
      case 'timer':
        out.push(r.winner === side ? `Hold out for ${Math.round(r.seconds / 60)} minutes.` : `Win within ${Math.round(r.seconds / 60)} minutes, or the battle is lost.`);
        break;
      case 'zone':
        out.push(r.side === side ? 'Or break through: get enough men past the enemy to the far side.' : 'Do not let them break through behind you.');
        break;
      case 'general': {
        const army = r.slot ? b.sides[r.side]!.armies[Number(r.slot.split('a')[1] ?? 0)] : b.sides[r.side]!.armies[0];
        out.push(r.side === side ? `If ${army?.general ?? 'your general'} falls, the battle is lost.` : `Kill or rout ${army?.general ?? 'their general'} and their army will flee.`);
        break;
      }
      case 'points':
      case 'deadline':
        out.push('Hold the objectives to score victory points.');
        break;
    }
  }
  return out;
}

/** '3× Hastati, Principes, 2× Velites'. */
export function summary(types: string[]): string {
  const counts = new Map<string, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([t, n]) => `${n > 1 ? `${n}× ` : ''}${unitType(t).name}`).join(', ');
}

export const armyUnits = (units: string): string[] => parseUnits(units);

/** The panel shown in battle: how to win, and the bonus objectives with their Glory. */
export function briefingFor(s: CampaignSave, n: CampaignNode): { title: string; lines: string[] } {
  const b = battleDef(n.battle);
  const mult = DIFFICULTIES[s.difficulty]!.glory;
  return {
    title: `${b.name}, ${b.year}`,
    lines: [...victoryLines(b, n.side), ...b.bonus[n.side]!.map((o) => `★ ${objectiveText(o, b, n.side)} (+${Math.round(o.glory * mult)} Glory)`)],
  };
}

/** The enemy, in a few words: 'Carthage (Hannibal, Hasdrubal)'. */
export function foeOf(n: CampaignNode): string {
  const s = battleDef(n.battle).sides[1 - n.side]!;
  return s.name;
}

export const factionName = (id: string): string => faction(id).name;
