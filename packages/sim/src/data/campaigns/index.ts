// Every campaign battle and each country's campaign, registered once at import.

import { registerBattles } from '../../campaign/registry';
import { PUNIC } from './battles/punic';

registerBattles([...PUNIC]);
