import { describe, expect, it } from 'vitest';
import { Battle, DIFFICULTIES, campaignDef, parseUnits, unitType } from '@pl/sim';
import {
  applyOutcome,
  available,
  battleSetup,
  newCampaign,
  nodeState,
  recruit,
  recruitCost,
  refill,
  refillCost,
  unlock,
  unlockBlock,
  upgrade,
  type CampaignSave,
} from '../src/app/campaign';

describe('campaign rules', () => {
  const rome = campaignDef('rome');
  const node = (id: string) => rome.nodes.find((n) => n.battle === id)!;

  it('starts with the campaign army, Glory for the difficulty and the first battle open', () => {
    const s = newCampaign('rome', 2, 'veteran', 1);
    expect(s.army.map((u) => u.type).sort()).toEqual(parseUnits(rome.start).sort());
    expect(s.glory).toBe(DIFFICULTIES[2]!.startGlory);
    expect(nodeState(s, node('sentinum'))).toBe('open');
    expect(nodeState(s, node('heraclea'))).toBe('locked');
    // Either of two battles opens the next.
    const won = { ...s, won: { bagradas: [false, false, false] } };
    expect(nodeState(won, node('telamon'))).toBe('open');
  });

  it('spends Glory on recruits, refills, upgrades and unlocks', () => {
    let s: CampaignSave = { ...newCampaign('rome', 1, 'veteran', 1), glory: 5000 };
    s = recruit(s, rome, 'rome.triarii');
    expect(s.army.at(-1)!.type).toBe('rome.triarii');
    expect(s.glory).toBe(5000 - recruitCost('rome.triarii'));
    // Locked troops can't be recruited until unlocked, and not unlocked before their battle.
    expect(recruit(s, rome, 'rome.praetorians')).toBe(s);
    expect(unlockBlock(s, rome, 'rome.praetorians')).toMatch(/Zama/);
    const afterZama = { ...s, won: { ...s.won, zama: [true, true, true] } };
    const u = unlock(afterZama, rome, 'rome.praetorians');
    expect(available(u, rome, 'rome.praetorians')).toBe(true);
    expect(u.glory).toBe(afterZama.glory - 1500);
    // Refilling a worn unit.
    const worn = { ...s, army: s.army.map((x, i) => (i === 0 ? { ...x, str: 0.5 } : x)) };
    const cost = refillCost(worn.army[0]!);
    const full = refill(worn, worn.army[0]!.id);
    expect(full.army[0]!.str).toBe(1);
    expect(full.glory).toBe(worn.glory - cost);
    // Upgrades rise a level at a time, each dearer.
    const up1 = upgrade(s, 'line', 0);
    const up2 = upgrade(up1, 'line', 0);
    expect(up2.upgrades.line[0]).toBe(2);
    expect(s.glory - up1.glory).toBeLessThan(up1.glory - up2.glory);
  });

  it('a victory pays Glory and brings the survivors home; a defeat changes nothing', () => {
    const s: CampaignSave = { ...newCampaign('rome', 1, 'veteran', 1), glory: 0 };
    const n = node('sentinum');
    const { setup, slot } = battleSetup(s, n, null, 'Me');
    const b = Battle.create(setup);
    b.step([{ p: 1, c: { k: 'ready', on: true } }]);
    for (let t = 0; t < 400; t++) b.step([]);
    // Pretend the battle was won, with the first unit badly mauled and a hundred kills.
    const w = b.world;
    const mine = w.units.filter((u) => u.ref);
    mine[0]!.losses = Math.round(mine[0]!.max * 0.6);
    mine[0]!.kills = 100;
    w.result = { winner: 0, reason: 'test', tick: w.tick };
    const { save, outcome } = applyOutcome(s, n, b, slot);
    expect(outcome.won).toBe(true);
    expect(outcome.glory).toBeGreaterThanOrEqual(n.glory);
    expect(save.glory).toBe(outcome.glory);
    expect(save.won.sentinum).toHaveLength(3);
    const back = save.army.find((u) => u.id === mine[0]!.ref)!;
    expect(back.str).toBeCloseTo(0.4, 1);
    expect(back.kills).toBe(100);
    expect(nodeState(save, node('heraclea'))).toBe('open');

    w.result = { winner: 1, reason: 'test', tick: w.tick };
    const lost = applyOutcome(s, n, b, slot);
    expect(lost.outcome.won).toBe(false);
    expect(lost.save).toBe(s);
    expect(unitType(back.type).size).toBeGreaterThan(0);
  });
});
