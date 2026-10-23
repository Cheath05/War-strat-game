// Per-scenario scripts: timed waves, events and messages.

import type { Battle } from '../battle';
import { TICK_HZ, sec } from '../constants';
import { faction } from '../data/registry';
import { defaultArmy, groupDets } from '../economy/armies';
import { addMen, arrive, newDetachment } from '../economy/gold';
import { spawnLate, spawnReserve, type ArmySetup } from '../setup';
import { aiArmy } from '../ai/util';
import { rout } from '../morale/morale';
import type { Army } from '../types';
import { once, registerScenarioScript } from './runtime';
import { endBattle } from './victory';

/** The waves Xerxes keeps feeding into the pass, in turn. */
const PERSIAN_WAVES = [
  ['persia.levy', 'persia.levy', 'persia.takabara'],
  ['persia.levy', 'persia.archers', 'persia.levy'],
  ['persia.sparabara', 'persia.levy', 'persia.takabara'],
  ['persia.levy', 'persia.levy', 'persia.levy'],
];

/** Every unit of the army is gone or running. */
function broken(b: Battle, a: Army | undefined): boolean {
  if (!a) return false;
  return !b.world.units.some((u) => u.army === a.id && u.st !== 'gone' && u.st !== 'routing' && u.st !== 'shattered');
}

/**
 * Campaign battles: the battle's moments are announced on time, and armies that came later in
 * history march on when their hour comes (until then their side can't be broken).
 */
registerScenarioScript('campaign', (b: Battle) => {
  const w = b.world;
  const t = w.scenario.t;
  (b.scenario.events ?? []).forEach((e, k) => {
    if (t < sec(e.at) || !once(b, `event${k}`)) return;
    b.msg(e.text, e.tone ?? 'info', e.side);
    // Elephants or chariots turned back: they stampede, through their own lines as often as not.
    const p = e.panic;
    if (p) for (const u of w.units) if (u.side === p.side && u.st !== 'gone' && u.st !== 'routing' && u.st !== 'shattered' && p.cls.includes(b.typeOf(u).cls)) rout(b, u);
  });
  b.scenario.sides.forEach((side, si) => {
    let pending = 0;
    for (const slot of side.slots) {
      if (!slot.reserve) continue;
      if (t < sec(slot.arrive ?? 0)) {
        pending++;
        continue;
      }
      if (once(b, `arrive:${slot.key}`) && spawnReserve(w, b.map, slot.key)) {
        b.reindex();
        b.msg(`${slot.name} arrives with ${slot.title}!`, 'good', si);
        b.msg(`${slot.name} arrives with ${slot.title}!`, 'bad', 1 - si);
      }
    }
    w.scenario.vars[`pending${si}`] = pending;
  });
});

registerScenarioScript('thermopylae', (b: Battle) => {
  const w = b.world;
  const sc = w.scenario;
  const t = sc.t / TICK_HZ;
  const d = w.settings.difficulty;
  const hostAt = [420, 360, 300, 260][d] ?? 360;
  const betrayAt = [600, 480, 420, 360][d] ?? 480;
  const waveEvery = [130, 100, 85, 70][d] ?? 100;
  const wavesEnd = 15 * 60;
  const army = (slot: string): Army | undefined => w.armies.find((a) => a.slot === slot);

  if (once(b, 'start')) {
    b.msg('The Persians come in their thousands. Hold the Hot Gates!', 'epic', 0);
    b.msg('Break through the pass and reach the far side, or crush the Greeks.', 'epic', 1);
  }
  if (t >= hostAt && once(b, 'xerxes')) {
    spawnReserve(w, b.map, 'xerxes');
    b.reindex();
    b.msg('Xerxes sends his own host into the pass!', 'bad', 0);
    b.msg("The King's host joins the attack.", 'good', 1);
  }
  if (t >= betrayAt - 60 && once(b, 'rumour')) b.msg('Scouts report a local shepherd talking to Persian officers…', 'info', 0);
  if (t >= betrayAt && once(b, 'immortals')) {
    spawnReserve(w, b.map, 'immortals');
    b.reindex();
    b.msg('Ephialtes has betrayed the mountain path! The Immortals are marching on the Phocians.', 'epic', -1);
  }
  const imm = army('immortals');
  if (imm && imm.ai.plan === 'assault' && !broken(b, imm) && once(b, 'behind')) b.msg('The Immortals have come down behind the Greeks!', 'epic', -1);
  if (imm && broken(b, army('phocians')) && once(b, 'phocians')) b.msg('The Phocians have fled the mountain path!', 'bad', 0);
  if (imm && broken(b, imm) && once(b, 'history')) b.msg('The Immortals are broken on the mountain. History changes!', 'epic', -1);
  if (t >= 13 * 60 && once(b, 'fivemin')) b.msg('Five more minutes! Hold the line!', 'epic', 0);

  // Waves: fresh troops join an AI-led Persian army in turn (human Persians buy their own).
  if (sc.nextWave === 0) sc.nextWave = sec(120);
  if (sc.t >= sc.nextWave && t < wavesEnd) {
    sc.nextWave = sc.t + sec(waveEvery);
    const ai = w.armies.filter((a) => a.side === 1 && aiArmy(b, a) && !a.directive.startsWith('route:'));
    const alive = w.units.filter((u) => u.side === 1 && u.st !== 'gone').length;
    if (ai.length && alive < 30 + 4 * d) {
      const a = ai[sc.wave % ai.length]!;
      const greeks = w.players.filter((p) => p.role !== 'spectator' && b.army(p.army)?.side === 0).length;
      const types = [...PERSIAN_WAVES[sc.wave % PERSIAN_WAVES.length]!];
      // Bigger waves on Hard and Legendary, and one more unit per extra Greek player.
      for (let k = 1; k < greeks + Math.max(0, d - 1); k++) types.push(k % 2 ? 'persia.levy' : 'persia.takabara');
      const det = newDetachment(b, a, `Wave ${sc.wave + 1}`);
      for (const ty of types) arrive(b, a, det, ty);
      sc.wave++;
      b.msg('More Persians pour into the pass.', 'bad', 0);
    }
  }
  // The Persians aren't beaten while the King still has men to send.
  sc.vars.pending1 = (army('xerxes') ? 0 : 1) + (imm ? 0 : 1) + (t < wavesEnd ? 1 : 0);
});

// --- Last Stand -------------------------------------------------------------------------

/** Brings wave n onto the field: one army early on, up to three from different sides later. */
function spawnWave(b: Battle, n: number): void {
  const w = b.world;
  const def = b.scenario;
  const waves = def.waves!;
  const them = faction(def.sides[1].faction);
  const d = w.settings.difficulty;
  const humans = w.players.filter((p) => p.role !== 'spectator' && b.army(p.army)?.side === 0).length;
  const budget = (1400 + 650 * (n - 1)) * ([0.7, 1, 1.25, 1.5][d] ?? 1) * (1 + 0.15 * Math.max(0, humans - 1));
  const groups = n >= 9 ? 3 : n >= 5 ? 2 : 1;
  const pal = w.armies.find((a) => a.side === 1)?.pal;
  const champions = them.units.find((t) => t.elite);
  for (let k = 0; k < groups; k++) {
    const units = defaultArmy(them.id, Math.floor(budget / groups), 14);
    // The last waves bring the enemy's super unit; the final one, a unit with every group.
    if (champions && (n === waves.count || (k === 0 && n >= waves.count - 2))) units.unshift(champions.id);
    const setup: ArmySetup = {
      slot: `wave${n}-${k}`,
      side: 1,
      faction: them.id,
      name: them.generalNames[(n + k) % them.generalNames.length]!,
      title: `Wave ${n}`,
      dets: groupDets(units),
      deploy: waves.zones[(n + k) % waves.zones.length]!,
      ai: 'assault',
      pal,
    };
    spawnLate(w, b.map, setup);
  }
  b.reindex();
  const last = n === waves.count;
  b.msg(last ? `The final wave! ${them.name} throw everything they have at you.` : `Wave ${n}: ${them.name} attack!`, last ? 'epic' : 'bad', 0);
}

registerScenarioScript('laststand', (b: Battle) => {
  const w = b.world;
  const sc = w.scenario;
  const waves = b.scenario.waves;
  if (!waves) return;
  // The enemy never runs out: only beating the last wave wins.
  sc.vars.pending1 = 1;
  if (once(b, 'start')) {
    b.msg(`Hold out against ${waves.count} waves of ${faction(b.scenario.sides[1].faction).name}. Every wave you beat pays gold.`, 'epic', 0);
    sc.nextWave = sec(15);
  }
  // The newest wave is beaten when fewer than one man in seven of its troops still fights
  // (its general's guard doesn't count: he keeps out of reach).
  if (sc.wave > 0) {
    const current = w.armies.filter((a) => a.side === 1 && a.slot.startsWith(`wave${sc.wave}-`));
    const ids = new Set(current.map((a) => a.id));
    const guards = new Set(current.map((a) => a.genUnit));
    let brought = 0;
    let fighting = 0;
    for (const u of w.units) {
      if (!ids.has(u.army) || guards.has(u.id)) continue;
      brought += u.max;
      if (u.st !== 'gone' && u.st !== 'routing' && u.st !== 'shattered') fighting += u.sol.length;
    }
    if (fighting * 7 < brought && once(b, `beaten${sc.wave}`)) {
      w.sides[0]!.score = sc.wave;
      if (sc.wave >= waves.count) return endBattle(b, 0, `held against all ${waves.count} waves`);
      const bonus = 250 + 100 * sc.wave;
      for (const p of w.players) if (b.army(p.army)?.side === 0) p.gold += bonus;
      // AI-led allies get the bonus for their own purse, and half their missing men back.
      for (const a of w.armies) {
        if (a.side !== 0 || !aiArmy(b, a)) continue;
        if (!b.player(a.ctrl)) a.gold += bonus;
        for (const u of w.units) if (u.army === a.id && u.st !== 'gone' && u.st !== 'shattered' && !u.engaged) addMen(b, u, Math.floor((u.max - u.sol.length) / 2));
      }
      b.reindex();
      b.msg(`Wave ${sc.wave} is beaten! +${bonus} gold. The next wave comes in 30 seconds.`, 'good', 0);
      sc.nextWave = Math.min(sc.nextWave, sc.t + sec(30));
    }
  }
  if (sc.wave < waves.count && sc.t >= sc.nextWave) {
    sc.wave++;
    spawnWave(b, sc.wave);
    // The next wave comes anyway after three minutes.
    sc.nextWave = sc.t + sec(180);
  }
});
