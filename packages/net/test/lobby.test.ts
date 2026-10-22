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

  it('sandbox: mixed armies, any units, and who may change what', () => {
    const { say, lobby, started } = setup(['Ann', 'Ben', 'Cal']);
    say(1, { t: 'lobby', op: 'scenario', id: 'sandbox' });
    // By default Rome and Greece stand against Persia: three armies, the players in the first three.
    const slots = scenarioDef('sandbox', lobby().options).sides.map((x) => x.slots.map((sl) => `${sl.key}:${sl.faction}`));
    expect(slots).toEqual([['a1:rome', 'a2:greece'], ['b1:persia']]);
    const slotOf = (name: string) => lobby().players.find((p) => p.name === name)!.slot;
    expect([slotOf('Ann'), slotOf('Ben'), slotOf('Cal')]).toEqual(['a1', 'a2', 'b1']);

    // Ben (not the host) picks Carthage for his own army, but can't touch Ann's or add armies.
    say(2, { t: 'lobby', op: 'options', options: { ...lobby().options, a2: 'carthage' } });
    expect(lobby().options.a2).toBe('carthage');
    say(2, { t: 'lobby', op: 'options', options: { ...lobby().options, a1: 'persia' } });
    say(2, { t: 'lobby', op: 'options', options: { ...lobby().options, a3: 'macedon' } });
    expect(lobby().options.a1).toBe('rome');
    expect(lobby().options.a3).toBe('none');

    // Any country's units, super units too, at no cost; too many is refused.
    const mixed = ['greece.blackspartans', 'greece.blackspartans', 'rome.praetorians', 'carthage.elephants', 'persia.immortals'];
    say(2, { t: 'lobby', op: 'army', units: mixed });
    say(2, { t: 'lobby', op: 'army', units: Array(31).fill('rome.hastati') });
    expect(lobby().armies.find((a) => a.slot === 'a2')!.dets.flatMap((d) => d.units).sort()).toEqual([...mixed].sort());

    // The host adds a Macedonian army for the AI and picks its units; Ben can't set it up.
    say(1, { t: 'lobby', op: 'options', options: { ...lobby().options, b2: 'macedon' } });
    say(2, { t: 'lobby', op: 'army', units: ['rome.velites'], slot: 'b2' });
    say(1, { t: 'lobby', op: 'army', units: ['macedon.pikemen', 'macedon.pikemen'], slot: 'b2' });
    say(1, { t: 'lobby', op: 'army', units: ['rome.velites'], slot: 'b1' });
    expect(lobby().armies.find((a) => a.slot === 'b2')!.dets.flatMap((d) => d.units)).toEqual(['macedon.pikemen', 'macedon.pikemen']);
    expect(lobby().armies.some((a) => a.slot === 'b1')).toBe(false);

    // Ben's units survive a change of country; removing Cal's army sends Cal to watch.
    say(1, { t: 'lobby', op: 'options', options: { ...lobby().options, map: 'desert', b1: 'none' } });
    expect(lobby().armies.find((a) => a.slot === 'a2')?.faction).toBe('carthage');
    expect(lobby().players.find((p) => p.name === 'Cal')!.role).toBe('spectator');

    say(1, { t: 'lobby', op: 'start' });
    const st = started()!;
    expect(st.armies!.map((a) => a.slot).sort()).toEqual(['a2', 'b2']);
    expect(st.players.every((p) => p.gold === undefined)).toBe(true);
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
