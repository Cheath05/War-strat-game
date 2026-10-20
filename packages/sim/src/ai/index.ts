// Three levels of AI, all inside the deterministic simulation: generals choose plans and
// give detachment orders, commanders carry them out, captains handle their own unit.

import type { Battle } from '../battle';
import { generalAI } from './general';
import { commanderAI } from './commander';
import { captainAI } from './captain';

export function runAI(b: Battle): void {
  generalAI(b);
  commanderAI(b);
  captainAI(b);
}
