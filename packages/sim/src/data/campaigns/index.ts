// Every campaign battle and each country's campaign, registered once at import.

import { registerBattles, registerCampaign } from '../../campaign/registry';
import { CAMPAIGNS } from './campaigns';
import { PUNIC } from './battles/punic';
import { ROME_WARS } from './battles/rome';
import { GREEK_WARS } from './battles/greek';
import { PERSIAN_WARS } from './battles/persia';
import { MACEDON_WARS } from './battles/macedon';

registerBattles([...PUNIC, ...ROME_WARS, ...GREEK_WARS, ...PERSIAN_WARS, ...MACEDON_WARS]);
for (const c of CAMPAIGNS) registerCampaign(c);
