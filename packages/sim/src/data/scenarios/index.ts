import { registerScenario } from '../registry';
import { DUEL, FIELD, GAP, MIRROR } from './field';
import { THERMOPYLAE_SCENARIO } from './thermopylae';
import { LAST_STAND } from './laststand';
import { BRIDGE, CAPTURE_HOLD } from './objective';
import { SANDBOX } from './sandbox';
import { campaignScenario } from './campaign';
import '../../scenario/scripts';

for (const s of [THERMOPYLAE_SCENARIO, LAST_STAND, CAPTURE_HOLD, BRIDGE, SANDBOX, FIELD, DUEL, MIRROR, GAP, campaignScenario()]) registerScenario(s);
