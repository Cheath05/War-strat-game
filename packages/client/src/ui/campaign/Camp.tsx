import { useState } from 'react';
import {
  MAX_LEVEL,
  PER_LEVEL,
  RANK_NAMES,
  TRACKS,
  armyCost,
  battleDef,
  campaignDef,
  faction,
  rankOf,
  roleOf,
  unitType,
  type CampaignNode,
  type UnitRole,
} from '@pl/sim';
import type { Screen } from '../../app/App';
import {
  ARM_NAMES,
  LEVEL_COST,
  MAX_ARMY,
  TRACK_NAMES,
  available,
  dismiss,
  freshBudget,
  historicalArmy,
  loadCampaign,
  recruit,
  recruitCost,
  refill,
  refillCost,
  saveCampaign,
  unlock,
  unlockBlock,
  upgrade,
  type CampaignSave,
} from '../../app/campaign';
import { Backdrop } from '../Backdrop';
import { UnitIcon } from '../UnitIcon';

type Tab = 'army' | 'upgrades' | 'troops';

/**
 * Between battles: the army (veteran: refill, dismiss, recruit with Glory; fresh: build this
 * battle's army from its budget), the upgrades, and the troops to unlock. Opened for a battle,
 * it ends by marching to it.
 */
export function Camp({ faction: fid, battle, go }: { faction: string; battle?: string; go: (s: Screen) => void }) {
  const [save, setSaveState] = useState<CampaignSave>(() => loadCampaign(fid)!);
  const [tab, setTab] = useState<Tab>('army');
  const def = campaignDef(fid);
  const node = battle ? def.nodes.find((n) => n.battle === battle) : undefined;
  const [fresh, setFresh] = useState<string[]>(() => (node ? historicalArmy(node) : []));
  const set = (s: CampaignSave): void => {
    setSaveState(s);
    saveCampaign(s);
  };
  const pal = faction(fid).colors[0] ?? 0;
  const freshMode = save.mode === 'fresh';
  const budget = node ? freshBudget(save, node) : 0;
  const spent = armyCost(fresh);
  const ready = freshMode ? fresh.length > 0 && spent <= budget : save.army.length > 0;
  return (
    <div className="screen">
      <Backdrop dim />
      <div className="window camp">
        <header className="window-head">
          <div className="row" style={{ gap: 14 }}>
            <h2 className="heading">{node ? `Preparing for ${battleDef(node.battle).name}` : 'Army & upgrades'}</h2>
            <span className="glory">
              Glory <b>{save.glory}</b>
            </span>
          </div>
          <button className="btn small ghost" onClick={() => go({ k: 'campaign', faction: fid })}>
            Back to the map
          </button>
        </header>
        <div className="camp-tabs">
          {(['army', 'upgrades', 'troops'] as Tab[]).map((t) => (
            <button key={t} className={`seg-opt ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {t === 'army' ? 'Army' : t === 'upgrades' ? 'Upgrades' : 'Troops'}
            </button>
          ))}
        </div>
        <div className="window-body">
          {tab === 'army' &&
            (freshMode ? (
              <FreshArmy save={save} node={node} units={fresh} setUnits={setFresh} budget={budget} pal={pal} />
            ) : (
              <VeteranArmy save={save} set={set} pal={pal} />
            ))}
          {tab === 'upgrades' && <UpgradesTab save={save} set={set} />}
          {tab === 'troops' && <TroopsTab save={save} set={set} pal={pal} />}
        </div>
        {node && (
          <footer className="window-foot">
            {freshMode && (
              <span className={spent > budget ? 'bad' : 'dim'}>
                Gold {spent} of {budget}
              </span>
            )}
            <button className="btn primary big" disabled={!ready} onClick={() => go({ k: 'campaignBattle', faction: fid, battle: node.battle, units: freshMode ? fresh : null })}>
              To battle
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function Pips({ n, of }: { n: number; of: number }) {
  return (
    <span className="pips">
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}

function VeteranArmy({ save, set, pal }: { save: CampaignSave; set: (s: CampaignSave) => void; pal: number }) {
  const def = campaignDef(save.faction);
  const worn = save.army.filter((u) => u.str < 1);
  const refillAll = worn.reduce((t, u) => t + refillCost(u), 0);
  const types = def.roster.filter((r) => available(save, def, r.type)).map((r) => unitType(r.type));
  return (
    <>
      <section>
        <div className="label">
          Your army · {save.army.length} of {MAX_ARMY} units
        </div>
        <div className="roster">
          {save.army.map((u) => {
            const t = unitType(u.type);
            const rank = rankOf(u);
            const c = refillCost(u);
            return (
              <div key={u.id} className="roster-row">
                <UnitIcon type={u.type} pal={pal} />
                <div className="roster-name">
                  <div>{t.name}</div>
                  <div className="dim">
                    {RANK_NAMES[rank]} <Pips n={rank} of={3} /> · {u.kills} kills
                  </div>
                </div>
                <div className="roster-str" title={`${Math.round(u.str * 100)}% strength`}>
                  <i style={{ width: `${u.str * 100}%` }} />
                </div>
                <span className="dim roster-pct">{Math.round(u.str * 100)}%</span>
                <button className="btn small" disabled={u.str >= 1 || save.glory < c} onClick={() => set(refill(save, u.id))}>
                  {u.str >= 1 ? 'Full' : `Refill ${c}`}
                </button>
                <button className="btn small ghost" title="Send this unit home" onClick={() => set(dismiss(save, u.id))}>
                  Dismiss
                </button>
              </div>
            );
          })}
        </div>
        {worn.length > 1 && (
          <button
            className="btn small"
            style={{ marginTop: 8 }}
            disabled={save.glory < refillAll}
            onClick={() => {
              let s = save;
              for (const u of worn) s = refill(s, u.id);
              set(s);
            }}
          >
            Refill all ({refillAll} Glory)
          </button>
        )}
      </section>
      <section>
        <div className="label">Raise new units</div>
        <p className="hint">Recruits start with no experience. Unlock more kinds of troops on the Troops tab.</p>
        <div className="recruit-grid">
          {types.map((t) => {
            const c = recruitCost(t.id);
            const can = save.glory >= c && save.army.length < MAX_ARMY;
            return (
              <div key={t.id} className={`choice recruit-card ${can ? '' : 'off'} ${t.elite ? 'elite' : ''}`} title={t.desc} onClick={() => can && set(recruit(save, def, t.id))}>
                <UnitIcon type={t.id} pal={pal} />
                <div>
                  <div>{t.name}</div>
                  <div className="gold" style={{ fontSize: 13 }}>
                    {c} Glory
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function FreshArmy({ save, node, units, setUnits, budget, pal }: { save: CampaignSave; node?: CampaignNode; units: string[]; setUnits: (u: string[]) => void; budget: number; pal: number }) {
  const def = campaignDef(save.faction);
  if (!node) {
    return (
      <p className="hint">
        In this campaign every battle brings a fresh army: choose a battle on the map and you will build its army from the budget it gives you, with the troops you have unlocked. Upgrades and unlocks carry over.
      </p>
    );
  }
  const left = budget - armyCost(units);
  const types = def.roster.filter((r) => available(save, def, r.type)).map((r) => unitType(r.type));
  const without = (i: number): string[] => [...units.slice(0, i), ...units.slice(i + 1)];
  return (
    <>
      <section>
        <div className="label">
          This battle's army · gold {left} left of {budget}
        </div>
        <p className="hint">This is the army history gave you. Click a unit to send it home; add others below. Every unit gets your upgrades.</p>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {units.map((id, i) => (
            <button key={i} className="btn small army-chip" title={`${unitType(id).name}: send home (+${unitType(id).cost} gold)`} onClick={() => setUnits(without(i))}>
              <UnitIcon type={id} pal={pal} /> {unitType(id).name}
            </button>
          ))}
        </div>
        <button className="btn small ghost" style={{ marginTop: 8 }} onClick={() => setUnits(historicalArmy(node))}>
          Back to history's army
        </button>
      </section>
      <section>
        <div className="label">Add units</div>
        <div className="recruit-grid">
          {types.map((t) => {
            const can = t.cost <= left && units.length < MAX_ARMY;
            return (
              <div key={t.id} className={`choice recruit-card ${can ? '' : 'off'} ${t.elite ? 'elite' : ''}`} title={t.desc} onClick={() => can && setUnits([...units, t.id])}>
                <UnitIcon type={t.id} pal={pal} />
                <div>
                  <div>{t.name}</div>
                  <div className="gold" style={{ fontSize: 13 }}>
                    {t.cost} gold
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function UpgradesTab({ save, set }: { save: CampaignSave; set: (s: CampaignSave) => void }) {
  const effect = (k: (typeof TRACKS)[number]): string => {
    const p = PER_LEVEL[k];
    return [p.atk && `+${p.atk} attack`, p.def && `+${p.def} defence`, p.armor && `+${p.armor} armour`, p.morale && `+${p.morale} morale`].filter(Boolean).join(', ');
  };
  return (
    <section>
      <p className="hint">Upgrades apply to every unit of an arm, in every battle from now on. Each level costs more than the last.</p>
      <div className="upgrades">
        {(Object.keys(ARM_NAMES) as UnitRole[]).map((arm) => (
          <div key={arm} className="upgrade-arm">
            <div className="label">{ARM_NAMES[arm]}</div>
            {TRACKS.map((track, k) => {
              const level = save.upgrades[arm][k] ?? 0;
              const cost = LEVEL_COST[level];
              return (
                <div key={track} className="upgrade-row">
                  <div>
                    <div>
                      {TRACK_NAMES[track]} <Pips n={level} of={MAX_LEVEL} />
                    </div>
                    <div className="setting-desc">{effect(track)} a level</div>
                  </div>
                  <button className="btn small" disabled={level >= MAX_LEVEL || cost === undefined || save.glory < cost} onClick={() => set(upgrade(save, arm, k))}>
                    {level >= MAX_LEVEL ? 'Mastered' : `${cost} Glory`}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function TroopsTab({ save, set, pal }: { save: CampaignSave; set: (s: CampaignSave) => void; pal: number }) {
  const def = campaignDef(save.faction);
  return (
    <section>
      <p className="hint">Troops your country can field. Some come with victories; the rest unlock for Glory once a battle has opened the way.</p>
      <div className="roster">
        {def.roster.map((r) => {
          const t = unitType(r.type);
          const have = available(save, def, r.type);
          const block = have ? '' : unlockBlock(save, def, r.type);
          return (
            <div key={r.type} className={`roster-row ${t.elite ? 'elite' : ''}`}>
              <UnitIcon type={r.type} pal={pal} />
              <div className="roster-name">
                <div>
                  {t.name} <span className="dim">· {roleOf(t) === 'line' ? 'infantry' : roleOf(t) === 'missile' ? 'missile troops' : 'cavalry'}</span>
                  {t.elite && <span className="tag">Super unit</span>}
                </div>
                <div className="dim">{t.desc}</div>
              </div>
              {have ? (
                <span className="gold">{r.cost === 0 ? 'Ready' : 'Unlocked'}</span>
              ) : (
                <button className="btn small" disabled={!!block} title={block} onClick={() => set(unlock(save, def, r.type))}>
                  {block || `Unlock ${r.cost}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
