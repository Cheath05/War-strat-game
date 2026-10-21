import { describe, expect, it } from 'vitest';
import { armyCost, defaultArmy, scenarioDef, type BattleSetup } from '@pl/sim';
import { PROTOCOL_VERSION, RoomCore, type LobbyState, type RoomTransport, type S2C } from '../src';

/** A room on a synchronous fake transport, with one connected player per conn. */
function setup(names: string[]): { room: RoomCore; say: (conn: number, m: object) => void; lobby: () => LobbyState; started: () => BattleSetup | null } {
  const inbox: S2C[] = [];
  const io: RoomTransport = {
    send: (_conn, msg) => inbox.push(JSON.parse(msg) as S2C),
    close: () => {},
    now: () => 0,
    every: () => () => {},
  };
  const room = new RoomCore('TEST', io);
  const say = (conn: number, m: object): void => room.message(conn, JSON.stringify(m));
  names.forEach((name, i) => {
    room.open(i + 1);
    say(i + 1, { t: 'hello', name, v: PROTOCOL_VERSION });
  });
  const last = <K extends S2C['t']>(t: K): Extract<S2C, { t: K }> | undefined => [...inbox].reverse().find((m) => m.t === t) as Extract<S2C, { t: K }> | undefined;
  return { room, say, lobby: () => last('lobby')!.lobby, started: () => last('start')?.setup ?? null };
}

describe('lobby', () => {
  it('checks recruited armies against the budget and carries the change into battle', () => {
    const { say, lobby, started } = setup(['Ann', 'Ben']);
    say(1, { t: 'lobby', op: 'scenario', id: 'laststand' });
    say(1, { t: 'lobby', op: 'options', options: { map: 'river', faction: 'greece', enemy: 'persia' } });
    expect(lobby().options).toEqual({ map: 'river', faction: 'greece', enemy: 'persia' });
    const me = lobby().players.find((p) => p.name === 'Ann')!;
    expect(me.role).toBe('general');

    // Too expensive, or the wrong faction: refused.
    say(1, { t: 'lobby', op: 'army', units: Array(10).fill('greece.spartans') });
    say(1, { t: 'lobby', op: 'army', units: ['rome.hastati'] });
    expect(lobby().armies).toEqual([]);

    // Within budget: accepted, grouped into detachments under the slot's own general.
    const units = defaultArmy('greece', 2000, 12);
    say(1, { t: 'lobby', op: 'army', units });
    const army = lobby().armies.find((a) => a.slot === me.slot)!;
    expect(army.faction).toBe('greece');
    expect(army.dets.flatMap((d) => d.units).sort()).toEqual([...units].sort());

    // The AI side can't be claimed.
    say(2, { t: 'lobby', op: 'claim', role: 'general', slot: 'waves', det: 0 });
    expect(lobby().players.find((p) => p.name === 'Ben')!.slot).not.toBe('waves');

    say(1, { t: 'lobby', op: 'start' });
    const s = started()!;
    expect(s.options).toEqual({ map: 'river', faction: 'greece', enemy: 'persia' });
    expect(s.armies?.length).toBe(1);
    const budget = scenarioDef('laststand').recruit!.gold;
    expect(s.players.find((p) => p.name === 'Ann')!.gold).toBe(budget - armyCost(units));
  });

  it('new choices throw away recruited armies', () => {
    const { say, lobby } = setup(['Ann']);
    say(1, { t: 'lobby', op: 'scenario', id: 'capture' });
    say(1, { t: 'lobby', op: 'army', units: defaultArmy('rome', 3000, 12) });
    expect(lobby().armies.length).toBe(1);
    say(1, { t: 'lobby', op: 'options', options: { side0: 'carthage' } });
    expect(lobby().armies.length).toBe(0);
    expect(lobby().options.side0).toBe('carthage');
  });
});
