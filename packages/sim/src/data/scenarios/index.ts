import { registerScenario } from '../registry';
import { DUEL, FIELD, GAP, MIRROR } from './field';

for (const s of [FIELD, DUEL, MIRROR, GAP]) registerScenario(s);
