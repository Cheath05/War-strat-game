// Plays campaign battles headless with the AI leading the player's army (as a player who
// handed it to the AI, so the enemy still gets its difficulty edge) and reports who wins.
//   npx tsx tools/campaign-balance.ts [difficulties=0,3] [faction|battle ...] [--seeds 1] [--detail] [--one-side]
// --detail prints how each battle ended: the reason, and every army's losses.
// --one-side plays a battle two campaigns share from one side only: at Normal it's the same
// fight either way, so the other side's result is the mirror image.

import { Battle, TICK_HZ, battleDef, defaultSettings, listCampaigns, slotKey, DIFFICULTIES, type BattleSetup } from '@pl/sim';

const args = process.argv.slice(2);
const seedsAt = args.indexOf('--seeds');
const seeds = seedsAt >= 0 ? Number(args[seedsAt + 1]) : 1;
const detail = args.includes('--detail');
const oneSide = args.includes('--one-side');
const rest = args.filter((a, i) => !a.startsWith('--') && !(seedsAt >= 0 && i === seedsAt + 1));
const diffs = (rest[0] && /^[0-3](,[0-3])*$/.test(rest[0]) ? rest.shift()! : '0,3').split(',').map(Number);
const only = new Set(rest);

/** A battle set up as a campaign would start it, with fog and strength for the difficulty. */
export function campaignSetup(battleId: string, side: number, diff: number, seed: number): { setup: BattleSetup; slot: string } {
  const b = battleDef(battleId);
  const d = DIFFICULTIES[diff]!;
  const strength = [1, 1];
  strength[1 - side] = d.strength;
  const slot = b.scenario ? b.scenario.slots[side]! : slotKey(side, 0);
  const settings = { ...defaultSettings(), difficulty: diff, strength, fog: !!b.fog };
  const setup: BattleSetup = b.scenario
    ? { seed, scenario: b.scenario.id, settings, players: [{ id: 1, name: 'AI', role: 'general', slot, det: 0, host: true }] }
    : { seed, scenario: 'campaign', options: { battle: battleId, side: String(side), diff: String(diff) }, settings, players: [{ id: 1, name: 'AI', role: 'general', slot, det: 0, host: true }] };
  return { setup, slot };
}

const rows: string[] = [];
const tally = new Map<number, { won: number; drawn: number; played: number }>();
const seen = new Set<string>();
for (const c of listCampaigns()) {
  for (const n of c.nodes) {
    const key = oneSide ? n.battle : `${n.battle}:${n.side}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (only.size && !only.has(c.faction) && !only.has(n.battle)) continue;
    const b = battleDef(n.battle);
    // A player who must hold out keeps to it; any other presses the attack with every army
    // after eight minutes, as a human would (the AI alone waits forever when both sides defend).
    const holdOut = !!b.scenario || !!b.victory?.some((r) => r.k === 'timer' && r.winner === n.side);
    const parts: string[] = [];
    for (const diff of diffs) {
      let won = 0;
      let drawn = 0;
      const times: string[] = [];
      for (let s = 0; s < seeds; s++) {
        const { setup } = campaignSetup(n.battle, n.side, diff, 1000 + s * 77);
        const bt = Battle.create(setup);
        bt.world.players[0]!.auto = true;
        bt.step([{ p: 1, c: { k: 'ready', on: true } }]);
        const w = bt.world;
        while (!w.result && w.scenario.t < 25 * 60 * TICK_HZ) {
          bt.step([]);
          if (!holdOut && w.scenario.t === 8 * 60 * TICK_HZ) {
            for (const a of w.armies) if (a.side === n.side) Object.assign(a.ai, { cmd: 'assault', at: [], plan: 'assault', stage: 0, since: w.tick });
          }
        }
        if (w.result?.winner === n.side) won++;
        else if (!w.result) drawn++;
        times.push((w.scenario.t / TICK_HZ / 60).toFixed(1) + (w.result ? '' : '?'));
        if (detail) {
          const armies = w.armies.map((a) => `${a.name} ${a.losses}/${w.units.filter((u) => u.army === a.id).reduce((t, u) => t + u.max, 0)}${a.genDead ? '†' : ''}`);
          console.log(`    ${DIFFICULTIES[diff]!.name} seed ${s}: ${w.result ? w.result.reason : 'no result'}; lost ${armies.join(', ')}`);
        }
      }
      const t = tally.get(diff) ?? { won: 0, drawn: 0, played: 0 };
      t.won += won;
      t.drawn += drawn;
      t.played += seeds;
      tally.set(diff, t);
      parts.push(`${DIFFICULTIES[diff]!.name} ${won}/${seeds} (${times.join(',')} min)`);
    }
    rows.push(`${(c.faction + ' ' + n.battle).padEnd(28)} side ${n.side}: ${parts.join('  ')}`);
    console.log(rows[rows.length - 1]);
  }
}
console.log('\nWon by the AI-led player army (? marks a battle still undecided after 25 minutes):');
for (const [d, t] of tally) console.log(`  ${DIFFICULTIES[d]!.name}: ${t.won}/${t.played}${t.drawn ? `, ${t.drawn} undecided` : ''}`);
