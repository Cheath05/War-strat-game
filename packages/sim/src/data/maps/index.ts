import { registerMap } from '../../map/mapgen';
import { FLAT, PLAINS, WALLGAP } from './plains';

for (const m of [PLAINS, FLAT, WALLGAP]) registerMap(m);
