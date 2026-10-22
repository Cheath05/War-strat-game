import { registerMap } from '../../map/mapgen';
import { FLAT, PLAINS, WALLGAP } from './plains';
import { THERMOPYLAE } from './thermopylae';
import { HILLFORT } from './hillfort';
import { RIVER } from './river';
import { DESERT, HILLS, WOODS } from './sandbox';
import { BATTLEFIELD } from './battlefield';

for (const m of [PLAINS, FLAT, WALLGAP, THERMOPYLAE, HILLFORT, RIVER, HILLS, WOODS, DESERT, BATTLEFIELD]) registerMap(m);
