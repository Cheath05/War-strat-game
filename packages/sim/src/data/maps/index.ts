import { registerMap } from '../../map/mapgen';
import { FLAT, PLAINS, WALLGAP } from './plains';
import { THERMOPYLAE } from './thermopylae';
import { HILLFORT } from './hillfort';
import { RIVER } from './river';

for (const m of [PLAINS, FLAT, WALLGAP, THERMOPYLAE, HILLFORT, RIVER]) registerMap(m);
