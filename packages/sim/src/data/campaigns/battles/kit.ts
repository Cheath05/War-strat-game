import type { BattleArmy, Objective } from '../../../campaign/types';

// Shorthands for writing battles: an army, and the bonus objectives.

export function army(general: string, title: string, faction: string, zone: string, units: string, more: Partial<BattleArmy> = {}): BattleArmy {
  return { general, title, faction, zone, units, ...more };
}

export const won = {
  time: (min: number, glory = 100): Objective => ({ k: 'time', min, glory }),
  losses: (pct: number, glory = 150): Objective => ({ k: 'losses', pct, glory }),
  general: (glory = 150, text?: string): Objective => ({ k: 'general', glory, text }),
  kill: (glory = 200, armyIndex?: number, text?: string): Objective => ({ k: 'killGeneral', glory, army: armyIndex, text }),
  destroy: (what: string, sel: { cls?: string[]; types?: string[] }, glory = 150): Objective => ({ k: 'destroy', what, ...sel, glory }),
  hold: (point: string, what: string, glory = 150): Objective => ({ k: 'hold', point, what, glory }),
  kills: (share: number, glory = 100): Objective => ({ k: 'kills', share, glory }),
};

/** Destroy the enemy's war elephants. */
export const ELEPHANTS = { cls: ['ele'] };
