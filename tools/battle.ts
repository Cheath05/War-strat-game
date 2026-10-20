// Headless AI-vs-AI battle runner and benchmark.
//   npm run battle -- field --seed 3 --size 1 --minutes 30 [--quiet]

import { Battle, TICK_HZ, defaultSettings, unitType } from '@pl/sim';

const args = process.argv.slice(2);
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : dflt;
};
const scenario = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1]!.startsWith('--'))) ?? 'field';
const seed = Number(opt('seed', '1'));
const minutes = Number(opt('minutes', '30'));
const unitSize = Number(opt('size', '1'));
const quiet = args.includes('--quiet');

const mapId = opt('map', '');
const b = Battle.create({ seed, scenario, settings: { ...defaultSettings(), unitSize }, players: [], map: mapId ? { id: mapId, seed, params: {} } : undefined });
const w = b.world;
// --attack N: side N assaults, the other defends.
const attacker = opt('attack', '');
if (attacker !== '') for (const a of w.armies) a.directive = String(a.side) === attacker ? 'assault' : 'defend';
const startSoldiers = [0, 0];
for (const s of w.soldiers) startSoldiers[b.unit(s.u)!.side]!++;
console.log(`${b.scenario.name} on ${b.map.name} (${b.map.wm}x${b.map.hm} m), seed ${seed}, unit size ${unitSize}`);
console.log(`Soldiers: ${w.sides[0]!.name} ${startSoldiers[0]}, ${w.sides[1]!.name} ${startSoldiers[1]}; units ${w.units.length}`);

const times: number[] = [];
const maxTicks = minutes * 60 * TICK_HZ;
const t0 = performance.now();
while (!w.result && w.tick < maxTicks) {
  const s = performance.now();
  b.step([]);
  times.push(performance.now() - s);
  if (!quiet && w.tick % (60 * TICK_HZ) === 0) {
    const alive = [0, 0];
    const routing = [0, 0];
    for (const u of w.units) {
      if (u.st === 'gone') continue;
      alive[u.side]! += u.sol.length;
      if (u.st === 'routing' || u.st === 'shattered') routing[u.side]!++;
    }
    console.log(`  ${String(w.tick / TICK_HZ / 60).padStart(2)} min: ${w.sides[0]!.name} ${alive[0]} men (${routing[0]} units fleeing), ${w.sides[1]!.name} ${alive[1]} men (${routing[1]} fleeing)`);
  }
}
const wall = performance.now() - t0;
times.sort((a, z) => a - z);
const avg = times.reduce((s, x) => s + x, 0) / Math.max(1, times.length);
const p99 = times[Math.floor(times.length * 0.99)] ?? 0;
const max = times[times.length - 1] ?? 0;
const r = w.result;
console.log(r ? `Result: side ${r.winner} ${r.winner >= 0 ? w.sides[r.winner]!.name : 'draw'} (${r.reason}) after ${(r.tick / TICK_HZ / 60).toFixed(1)} min` : `No result after ${minutes} min`);
for (const a of w.armies) console.log(`  ${a.name.padEnd(12)} ${a.title.padEnd(20)} kills ${String(a.kills).padStart(4)}  losses ${String(a.losses).padStart(4)}${a.genDead ? '  (general fell)' : ''}`);
const best = [...w.units].sort((x, y) => y.kills - x.kills)[0];
if (best) console.log(`  Best unit: ${unitType(best.type).name} (${b.army(best.army)!.title}), ${best.kills} kills`);
console.log(`Timing: ${times.length} ticks in ${(wall / 1000).toFixed(1)} s; avg ${avg.toFixed(2)} ms/tick, p99 ${p99.toFixed(2)} ms, max ${max.toFixed(1)} ms`);
console.log(`Final hash: ${b.hash().toString(16)}`);
