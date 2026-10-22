import { useMemo, useState } from 'react';
import { armyCost, budgetFor, defaultSettings, faction, listScenarios, recruitedArmy, scenarioChoices, scenarioDef, slotSide, unitType, type ArmySetup, type BattleSetup, type Settings } from '@pl/sim';
import { RecruitPanel } from './Recruit';
import { RulesEditor, ScenarioOptions } from './Rules';
import { SandboxArmies } from './Sandbox';
import { Backdrop } from './Backdrop';
import type { Screen } from '../app/App';
import { loadProfile } from '../app/profile';

/** Choose a battle, a side and a role; then fight it against the AI in this browser. */
export function SoloSetup({ go }: { go: (s: Screen) => void }) {
  const scenarios = useMemo(() => listScenarios().filter((s) => !s.hidden), []);
  const [scId, setScId] = useState(scenarios[0]?.id ?? 'field');
  const [choices, setChoices] = useState<Record<string, string>>(() => scenarioChoices(scenarios[0]?.id ?? 'field'));
  const raw = scenarios.find((s) => s.id === scId)!;
  const sc = scenarioDef(scId, choices);
  const [slot, setSlot] = useState(sc.sides[0].slots[0]!.key);
  const [role, setRole] = useState<{ k: 'general' } | { k: 'commander'; det: number }>({ k: 'general' });
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  // Recruited units for our army (gold modes); null keeps the scenario's own army.
  const [units, setUnits] = useState<string[] | null>(null);
  const [recruiting, setRecruiting] = useState(false);
  // Sandbox: every army's units, by slot (missing: the slot's balanced default), and the one
  // being edited.
  const [armies, setArmies] = useState<Record<string, string[]>>({});
  const [editing, setEditing] = useState('');
  const set = (p: Partial<Settings>): void => setSettings({ ...settings, ...p });
  const side = slotSide(sc, slot);
  const slotDef = sc.sides[side]?.slots.find((s) => s.key === slot);
  const budget = role.k === 'general' ? budgetFor(sc, side) : 0;
  const army = units?.length ? units : (slotDef?.dets.flatMap((d) => d.units) ?? []);

  const start = (): void => {
    const recruited = units?.length && role.k === 'general' ? recruitedArmy(sc, slot, units) : null;
    const sandboxed = sc.sandbox ? Object.entries(armies).flatMap(([k, list]): ArmySetup[] => (list.length ? [recruitedArmy(sc, k, list)].filter((a): a is ArmySetup => !!a) : [])) : [];
    const setup: BattleSetup = {
      seed: Math.floor(Math.random() * 1e9),
      scenario: sc.id,
      settings,
      options: choices,
      armies: sc.sandbox ? (sandboxed.length ? sandboxed : undefined) : recruited ? [recruited] : undefined,
      players: [{ id: 1, name: loadProfile().name || 'Commander', role: role.k, slot, det: role.k === 'commander' ? role.det : 0, host: true, gold: sc.recruit ? Math.max(0, budget - (budget ? armyCost(army) : 0)) : undefined }],
    };
    go({ k: 'battle', setup, playerId: 1 });
  };
  const pickScenario = (id: string, c: Record<string, string>): void => {
    setScId(id);
    setChoices(c);
    const next = scenarioDef(id, c);
    // A sandbox keeps the army you lead, and every army's units, while the line-up changes.
    if (id === scId && next.sandbox && slotSide(next, slot) >= 0) return;
    setSlot(next.sides[0].slots[0]!.key);
    setRole({ k: 'general' });
    setUnits(null);
    if (id !== scId) setArmies({});
  };
  const unitsOf = (k: string, fallback: string[]): string[] => (armies[k]?.length ? armies[k]! : fallback);
  const editDef = sc.sides.flatMap((x) => x.slots).find((x) => x.key === editing);

  return (
    <div className="screen">
      <Backdrop dim />
      <div className="window setup">
        <header className="window-head">
          <h2 className="heading">Solo battle</h2>
          <button className="btn small ghost" onClick={() => go({ k: 'title' })}>
            Back
          </button>
        </header>
        <div className="window-body">
          <section>
            <div className="label">Battle</div>
            <div className="panel-list">
              {scenarios.map((s) => (
                <div key={s.id} className={`choice ${s.id === scId ? 'on' : ''}`} onClick={() => pickScenario(s.id, scenarioChoices(s.id))}>
                  <h3>
                    {s.name} {s.year ? <span className="dim">{s.year}</span> : null}
                  </h3>
                  <p>{s.blurb}</p>
                </div>
              ))}
            </div>
            <ScenarioOptions sc={raw} choices={choices} onChange={(c) => pickScenario(scId, c)} />
          </section>
          {sc.sandbox ? (
            <section>
              <div className="label">Armies</div>
              <p className="hint">Choose each army's country and units, and the army you lead. The AI leads the rest.</p>
              <SandboxArmies
                sc={sc}
                choices={choices}
                unitSize={settings.unitSize}
                unitsOf={(sl) => unitsOf(sl.key, sl.dets.flatMap((d) => d.units))}
                canSetCountry={() => true}
                canEditUnits={() => true}
                canAddRemove
                setChoices={(c) => pickScenario(scId, c)}
                editUnits={(sl) => setEditing(sl.key)}
                extra={(sl) => (
                  <div className="slot-line">
                    {sl.key === slot ? (
                      <span className="gold">You lead this army</span>
                    ) : (
                      <button className="btn small" onClick={() => setSlot(sl.key)}>
                        Lead this army
                      </button>
                    )}
                  </div>
                )}
              />
            </section>
          ) : (
          <section>
            <div className="label">Your army</div>
            <p className="hint">Every place you don't take is led by the AI.</p>
            <div className="sides">
              {sc.sides.map((side, si) => (
                <div key={si} className="col">
                  <div className="side-head">
                    {side.name} <span className="dim">{side.role}</span>
                  </div>
                  {side.aiOnly && (
                    <div className="slot dim">{sc.waves ? `${sc.waves.count} waves of ${faction(side.faction).name}, each bigger than the last.` : 'Led by the AI.'}</div>
                  )}
                  {side.slots
                    .filter(() => !side.aiOnly)
                    .map((sl) => {
                      const on = sl.key === slot;
                      return (
                        <div key={sl.key} className={`choice ${on ? 'on' : ''}`} onClick={() => (setSlot(sl.key), setRole({ k: 'general' }), setUnits(null))}>
                          <h3>
                            {sl.name} <span className="dim">· {sl.title}</span> {sl.reserve && <span className="tag">arrives mid-battle</span>}
                          </h3>
                          <p>
                            {faction(sl.faction).name}: {summary(on && units?.length ? units : sl.dets.flatMap((d) => d.units))}
                          </p>
                          {on && (
                            <div className="row" style={{ marginTop: 10, gap: 6 }}>
                              <button className={`btn small ${role.k === 'general' ? 'on' : ''}`} onClick={(e) => (e.stopPropagation(), setRole({ k: 'general' }))}>
                                Lead as General
                              </button>
                              {role.k === 'general' && budget > 0 && (
                                <button className="btn small" onClick={(e) => (e.stopPropagation(), setRecruiting(true))}>
                                  Recruit army ({budget} gold)
                                </button>
                              )}
                              {sl.dets.map((d, i) => (
                                <button
                                  key={i}
                                  className={`btn small ${role.k === 'commander' && role.det === i ? 'on' : ''}`}
                                  title={`Serve under ${sl.name} as commander of the ${d.name}`}
                                  onClick={(e) => (e.stopPropagation(), setRole({ k: 'commander', det: i }))}
                                >
                                  Command {d.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </section>
          )}
          <section>
            <div className="label">Rules</div>
            <RulesEditor sc={sc} settings={settings} onChange={set} />
          </section>
        </div>
        <footer className="window-foot">
          <button className="btn primary big" onClick={start}>
            To battle
          </button>
        </footer>
      </div>
      {editDef && (
        <RecruitPanel
          title={`${editDef.name}, ${editDef.title}`}
          factionId={editDef.faction}
          budget={0}
          maxUnits={sc.sandbox?.maxUnits ?? 30}
          units={unitsOf(editDef.key, editDef.dets.flatMap((d) => d.units))}
          pal={slotSide(sc, editDef.key) === 0 ? 0 : 2}
          sandbox
          onChange={(list) => setArmies({ ...armies, [editDef.key]: list })}
          onClose={() => setEditing('')}
        />
      )}
      {recruiting && slotDef && (
        <RecruitPanel
          title={`${slotDef.name}, ${slotDef.title}`}
          factionId={slotDef.faction}
          budget={budget}
          maxUnits={sc.recruit?.maxUnits ?? 12}
          units={army}
          pal={side === 0 ? 0 : 2}
          onChange={setUnits}
          onClose={() => setRecruiting(false)}
        />
      )}
    </div>
  );
}

function summary(types: string[]): string {
  const counts = new Map<string, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([t, n]) => `${n > 1 ? `${n}× ` : ''}${unitType(t).name}`).join(', ');
}
