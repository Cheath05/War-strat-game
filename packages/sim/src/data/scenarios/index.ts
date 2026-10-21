import { registerScenario } from '../registry';
import { DUEL, FIELD, GAP, MIRROR } from './field';
import { THERMOPYLAE_SCENARIO } from './thermopylae';
import { LAST_STAND } from './laststand';
import { BRIDGE, CAPTURE_HOLD } from './objective';
import '../../scenario/scripts';

for (const s of [THERMOPYLAE_SCENARIO, LAST_STAND, CAPTURE_HOLD, BRIDGE, FIELD, DUEL, MIRROR, GAP]) registerScenario(s);
