// Bot players for testing multiplayer with fewer friends (or none):
//   npm run bots -- ABCD 2          two bots join room ABCD on the local relay
//   npm run bots -- ABCD 1 --url http://192.168.1.20:8090
//   npm run bots -- ABCD 3 --start --scenario thermopylae --seconds 60
// Bots take free army slots, ready up, run the battle like a real client and let the AI lead
// their armies (--chaos instead sends random units at random enemies, a stress test), and
// print a line whenever their battle hash disagrees with the relay's verdict.
// With --start the host bot starts the battle once every bot is in (a scripted test needs
// no human); at exit, bots in one process compare the hashes they computed.

import WebSocket from 'ws';
import { Battle, TICKS_PER_TURN, type Command } from '@pl/sim';
import { LockstepDriver, PROTOCOL_VERSION, type S2C } from '@pl/net';

const args = process.argv.slice(2);
const code = (args.find((a) => /^[A-Za-z]{4}$/.test(a)) ?? '').toUpperCase();
const count = Number(args.find((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--seconds') ?? 1);
const urlIdx = args.indexOf('--url');
const base = urlIdx >= 0 ? args[urlIdx + 1]! : 'http://localhost:8090';
const autoStart = args.includes('--start');
const chaos = args.includes('--chaos');
const scIdx = args.indexOf('--scenario');
const scenario = scIdx >= 0 ? args[scIdx + 1]! : '';
let started = false;
/** Hashes each bot computed, by tick (all bots run in this process). */
const checkpoints = new Map<number, number[]>();
if (!code) {
  console.log('Usage: npm run bots -- <ROOM CODE> [count] [--url http://host:8090]');
  process.exit(1);
}

function bot(n: number): void {
  const name = `Bot ${n}`;
  const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/ws/${code}`);
  let me = 0;
  let driver: LockstepDriver | null = null;
  let stateReq = 0;
  let orderTimer = 0;
  const send = (m: unknown): void => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m));
  };
  const hooks = {
    send: (c: Command) => send({ t: 'cmd', c }),
    hash: (tick: number, h: number) => {
      send({ t: 'hash', tick, h });
      checkpoints.set(tick, [...(checkpoints.get(tick) ?? []), h]);
    },
  };
  ws.on('open', () => send({ t: 'hello', name, v: PROTOCOL_VERSION }));
  ws.on('message', (data) => {
    const m = JSON.parse(data.toString()) as S2C;
    switch (m.t) {
      case 'welcome':
        me = m.you;
        console.log(`${name} joined ${code} as player ${me}`);
        send({ t: 'lobby', op: 'ready', on: true });
        break;
      case 'lobby': {
        const host = m.lobby.players.find((p) => p.id === me)?.host;
        if (!autoStart || started || !host || m.lobby.phase !== 'lobby') break;
        if (scenario && m.lobby.scenario !== scenario) {
          send({ t: 'lobby', op: 'scenario', id: scenario });
          break;
        }
        if (m.lobby.players.filter((p) => p.connected).length < count) break;
        started = true;
        console.log(`${name}: starting ${m.lobby.scenario}`);
        send({ t: 'lobby', op: 'start' });
        break;
      }
      case 'start':
        driver = new LockstepDriver(Battle.create(m.setup), hooks);
        console.log(`${name}: battle started (${m.setup.scenario})`);
        break;
      case 'turn':
        driver?.receiveTurn(m.n, m.c ?? []);
        break;
      case 'stateReq':
        if (driver) stateReq = m.req;
        else send({ t: 'state', req: m.req, tick: -1, data: '' });
        break;
      case 'resync':
        console.log(`${name}: resynced at tick ${m.tick}`);
        if (driver) driver.resync(m.data);
        else driver = new LockstepDriver(Battle.load(m.data), hooks);
        break;
      case 'note':
        console.log(`${name} sees: ${m.text}`);
        break;
      case 'ended':
        driver = null;
        send({ t: 'lobby', op: 'ready', on: true });
        break;
      case 'error':
        console.log(`${name}: ${m.msg}`);
        break;
    }
  });
  ws.on('close', () => console.log(`${name} disconnected`));
  setInterval(() => {
    const d = driver;
    if (!d) return;
    d.update(50);
    const w = d.battle.world;
    if (stateReq && w.tick % TICKS_PER_TURN === 0) {
      send({ t: 'state', req: stateReq, tick: w.tick, data: d.battle.serialize() });
      stateReq = 0;
    }
    if (w.phase === 'deploy') {
      if (w.tick % 40 === 0) {
        d.issue({ k: 'ready', on: true });
        if (!chaos && !d.battle.player(me)?.auto) d.issue({ k: 'auto', on: true });
      }
      return;
    }
    if (!chaos) {
      // Joined mid-battle: hand the army to the AI now.
      if (w.tick % 40 === 0 && !d.battle.player(me)?.auto) d.issue({ k: 'auto', on: true });
      return;
    }
    // Every few seconds, send a random unit to attack the nearest enemy.
    orderTimer += 50;
    if (orderTimer < 4000) return;
    orderTimer = 0;
    const p = d.battle.player(me);
    if (!p) return;
    const mine = w.units.filter((u) => u.army === p.army && u.st !== 'gone');
    const foes = w.units.filter((u) => mine[0] && u.side !== mine[0].side && u.st !== 'gone');
    const u = mine[Math.floor(Math.random() * mine.length)];
    const f = foes[Math.floor(Math.random() * foes.length)];
    if (u && f) d.issue({ k: 'attack', u: [u.id], t: f.id, run: Math.random() < 0.4 });
  }, 50);
}

for (let i = 1; i <= count; i++) bot(i);

// --seconds N: leave after N seconds (for scripted tests), saying whether the bots agreed.
const secIdx = args.indexOf('--seconds');
if (secIdx >= 0) {
  setTimeout(() => {
    const full = [...checkpoints].filter(([, hs]) => hs.length === count);
    const bad = full.filter(([, hs]) => hs.some((h) => h !== hs[0]));
    if (count > 1) console.log(bad.length ? `DESYNC: bots disagreed at ${bad.length} of ${full.length} checkpoints (first at tick ${bad[0]![0]})` : `In sync: ${full.length} checkpoints agree, up to tick ${full.length ? full[full.length - 1]![0] : 0}`);
    process.exit(bad.length ? 1 : 0);
  }, Number(args[secIdx + 1]) * 1000);
}
