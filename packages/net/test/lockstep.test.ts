import { describe, expect, it } from 'vitest';
import { Battle, HASH_EVERY, TICKS_PER_TURN, type Command, type Unit } from '@pl/sim';
import { LockstepDriver, RoomCore, type RoomTransport, type S2C } from '../src';

/** A virtual-time network with latency and jitter between clients and the relay. */
class FakeNet {
  now = 0;
  private events: { at: number; seq: number; fn: () => void }[] = [];
  private timers: { every: number; next: number; fn: () => void; on: boolean }[] = [];
  private seq = 0;
  private rngState = 12345;

  rand(): number {
    this.rngState = (this.rngState * 1103515245 + 12345) & 0x7fffffff;
    return this.rngState / 0x7fffffff;
  }

  /** One-way delay: 25-90 ms with occasional spikes. */
  delay(): number {
    return 25 + this.rand() * 65 + (this.rand() < 0.03 ? 250 : 0);
  }

  private lastOn = new Map<string, number>();

  at(ms: number, fn: () => void): void {
    this.events.push({ at: this.now + ms, seq: this.seq++, fn });
  }

  /** Like a WebSocket: messages on one channel arrive in the order they were sent. */
  ordered(channel: string, ms: number, fn: () => void): void {
    const at = Math.max(this.now + ms, (this.lastOn.get(channel) ?? 0) + 0.001);
    this.lastOn.set(channel, at);
    this.events.push({ at, seq: this.seq++, fn });
  }

  every(ms: number, fn: () => void): () => void {
    const t = { every: ms, next: this.now + ms, fn, on: true };
    this.timers.push(t);
    return () => {
      t.on = false;
    };
  }

  /** Runs everything due up to now + ms, in time order. */
  advance(ms: number): void {
    const end = this.now + ms;
    for (;;) {
      let next = end;
      for (const e of this.events) if (e.at < next) next = e.at;
      for (const t of this.timers) if (t.on && t.next < next) next = t.next;
      this.now = next;
      const due = this.events.filter((e) => e.at <= this.now).sort((a, b) => a.at - b.at || a.seq - b.seq);
      this.events = this.events.filter((e) => e.at > this.now);
      for (const e of due) e.fn();
      for (const t of this.timers) {
        if (t.on && t.next <= this.now) {
          t.next += t.every;
          t.fn();
        }
      }
      if (this.now >= end && !due.length) break;
    }
  }
}

class FakeClient {
  id = 0;
  token = '';
  driver: LockstepDriver | null = null;
  hashes = new Map<number, number>();
  online = true;
  private stateReq = 0;
  private cmdTimer = 0;

  constructor(
    private net: FakeNet,
    private room: RoomCore,
    readonly conn: number,
    readonly name: string,
  ) {}

  connect(token = ''): void {
    this.online = true;
    this.room.open(this.conn);
    this.send({ t: 'hello', name: this.name, token: token || undefined, v: 1 });
  }

  send(m: unknown): void {
    if (!this.online) return;
    const raw = JSON.stringify(m);
    this.net.ordered(`up${this.conn}`, this.net.delay(), () => this.online && this.room.message(this.conn, raw));
  }

  receive(raw: string): void {
    if (!this.online) return;
    const m = JSON.parse(raw) as S2C;
    switch (m.t) {
      case 'welcome':
        this.id = m.you;
        this.token = m.token;
        break;
      case 'start':
        this.driver = new LockstepDriver(Battle.create(m.setup), this.hooks());
        break;
      case 'turn':
        this.driver?.receiveTurn(m.n, m.c ?? []);
        break;
      case 'stateReq':
        if (this.driver) this.stateReq = m.req;
        else this.send({ t: 'state', req: m.req, tick: -1, data: '' });
        break;
      case 'resync':
        if (!this.driver) this.driver = new LockstepDriver(Battle.load(m.data), this.hooks());
        else this.driver.resync(m.data);
        // Forget hashes from the drifted timeline.
        for (const t of [...this.hashes.keys()]) if (t >= m.tick) this.hashes.delete(t);
        break;
    }
  }

  private hooks() {
    return {
      send: (c: Command) => this.send({ t: 'cmd', c }),
      hash: (tick: number, h: number) => {
        this.hashes.set(tick, h);
        this.send({ t: 'hash', tick, h });
      },
    };
  }

  update(dt: number): void {
    const d = this.driver;
    if (!d || !this.online) return;
    d.update(dt);
    const w = d.battle.world;
    if (this.stateReq && w.tick % TICKS_PER_TURN === 0) {
      this.send({ t: 'state', req: this.stateReq, tick: w.tick, data: d.battle.serialize() });
      this.stateReq = 0;
    }
    // Act like a player: ready up, then give orders now and then.
    if (w.phase === 'deploy') {
      d.issue({ k: 'ready', on: true });
      return;
    }
    this.cmdTimer += dt;
    if (this.cmdTimer < 1500) return;
    this.cmdTimer = 0;
    const me = d.battle.player(this.id);
    if (!me) return;
    const mine: Unit[] = w.units.filter((u) => u.army === me.army && u.st !== 'gone');
    const enemy = w.units.filter((u) => u.side !== mine[0]?.side && u.st !== 'gone');
    if (!mine.length) return;
    const u = mine[Math.floor(this.net.rand() * mine.length)]!;
    if (enemy.length && this.net.rand() < 0.6) {
      d.issue({ k: 'attack', u: [u.id], t: enemy[Math.floor(this.net.rand() * enemy.length)]!.id, run: this.net.rand() < 0.5 });
    } else {
      d.issue({ k: 'move', u: [u.id], x: Math.round(40 + this.net.rand() * 340), y: Math.round(40 + this.net.rand() * 220), run: false });
    }
  }
}

function setup() {
  const net = new FakeNet();
  const clients: FakeClient[] = [];
  const transport: RoomTransport = {
    send: (conn, msg) => {
      const c = clients.find((x) => x.conn === conn);
      if (c) net.ordered(`down${conn}`, net.delay(), () => c.receive(msg));
    },
    close: () => {},
    now: () => net.now,
    every: (ms, fn) => net.every(ms, fn),
  };
  const room = new RoomCore('TEST', transport);
  for (let i = 0; i < 4; i++) clients.push(new FakeClient(net, room, i + 1, `P${i + 1}`));
  return { net, room, clients };
}

/** Advances virtual time, updating every client each 16 ms frame. */
function play(net: FakeNet, clients: FakeClient[], ms: number): void {
  for (let t = 0; t < ms; t += 16) {
    net.advance(16);
    for (const c of clients) c.update(16);
  }
}

function agree(clients: FakeClient[], fromTick = 0): { compared: number; mismatched: number } {
  const live = clients.filter((c) => c.driver);
  let compared = 0;
  let mismatched = 0;
  const ticks = new Set<number>();
  for (const c of live) for (const t of c.hashes.keys()) if (t >= fromTick) ticks.add(t);
  for (const t of ticks) {
    const vals = live.map((c) => c.hashes.get(t)).filter((v) => v !== undefined);
    if (vals.length < live.length) continue;
    compared++;
    if (new Set(vals).size > 1) mismatched++;
  }
  return { compared, mismatched };
}

describe('lockstep over a laggy network', () => {
  it('keeps four players in identical battles, repairs a desync, and takes back a dropped player', () => {
    const { net, room, clients } = setup();
    for (const c of clients) c.connect();
    play(net, clients, 1000);
    // The host (first to arrive) starts; everyone was auto-assigned a general's slot.
    clients.find((c) => c.id === 1)!.send({ t: 'lobby', op: 'start' });
    play(net, clients, 60_000);
    const first = agree(clients);
    expect(first.compared).toBeGreaterThan(30);
    expect(first.mismatched).toBe(0);
    const tick1 = clients[0]!.driver!.battle.world.tick;
    expect(tick1).toBeGreaterThan(1000);

    // Corrupt one player's world: the relay must notice and repair it.
    const victim = clients[2]!;
    const s = victim.driver!.battle.world.soldiers[10]!;
    s.x += 3;
    play(net, clients, 8_000);
    const fixedFrom = victim.driver!.battle.world.tick;
    play(net, clients, 20_000);
    const after = agree(clients, fixedFrom);
    expect(after.compared).toBeGreaterThan(10);
    expect(after.mismatched).toBe(0);

    // A player drops (the AI takes over their army) and comes back.
    const dropper = clients[1]!;
    dropper.online = false;
    room.close(dropper.conn);
    play(net, clients, 10_000);
    expect(clients[0]!.driver!.battle.player(dropper.id)!.on).toBe(false);
    dropper.driver = null;
    dropper.hashes.clear();
    dropper.connect(dropper.token);
    play(net, clients, 20_000);
    expect(dropper.driver).not.toBeNull();
    const back = dropper.driver!.battle.world.tick;
    play(net, clients, 15_000);
    const rejoined = agree(clients, back);
    expect(rejoined.compared).toBeGreaterThan(10);
    expect(rejoined.mismatched).toBe(0);
    expect(clients[0]!.driver!.battle.player(dropper.id)!.on).toBe(true);

    // Everyone reloads at the same moment: nobody has a state to share, so the relay
    // rebuilds them all from the setup and the full order log.
    const tokens = clients.map((c) => c.token);
    for (const c of clients) {
      c.online = false;
      room.close(c.conn);
      c.driver = null;
      c.hashes.clear();
    }
    play(net, clients, 500);
    clients.forEach((c, i) => c.connect(tokens[i]!));
    play(net, clients, 30_000);
    expect(clients.every((c) => c.driver)).toBe(true);
    const from = Math.max(...clients.map((c) => c.driver!.battle.world.tick)) - 200;
    play(net, clients, 10_000);
    const rebuilt = agree(clients, from);
    expect(rebuilt.compared).toBeGreaterThan(5);
    expect(rebuilt.mismatched).toBe(0);
    void HASH_EVERY;
  });
});
