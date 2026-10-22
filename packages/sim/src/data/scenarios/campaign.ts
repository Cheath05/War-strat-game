import '../campaigns';
import { battleDef, listBattles } from '../../campaign/registry';
import { battleScenario } from '../../campaign/scenario';
import type { ScenarioDef } from '../types';

/**
 * Campaign battles, as one hidden scenario: the lobby options pick the battle, the side the
 * player fights on and the difficulty (Easy 0 to Extreme 3).
 */
export function campaignScenario(): ScenarioDef {
  const battles = listBattles();
  return {
    ...battleScenario(battles[0]!, 0, 1),
    options: [
      { id: 'battle', name: 'Battle', choices: battles.map((b) => ({ id: b.id, name: b.name })) },
      { id: 'side', name: 'Side', choices: ['0', '1'].map((id) => ({ id, name: id })) },
      { id: 'diff', name: 'Difficulty', choices: ['1', '0', '2', '3'].map((id) => ({ id, name: id })) },
    ],
    configure: (c) => battleScenario(battleDef(c.battle!), Number(c.side), Number(c.diff)),
  };
}
