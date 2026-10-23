import { useState } from 'react';
import { DIFFICULTIES, faction, listCampaigns } from '@pl/sim';
import type { Screen } from '../../app/App';
import { loadCampaign, newCampaign, type ArmyMode } from '../../app/campaign';
import { Backdrop } from '../Backdrop';
import { Segmented, type SegOption } from '../controls';
import { UnitIcon } from '../UnitIcon';

const MODES: { k: ArmyMode; name: string; desc: string }[] = [
  {
    k: 'veteran',
    name: 'Veteran army',
    desc: 'One army for the whole campaign. Survivors carry on to the next battle and grow into veterans; spend Glory to bring units back to strength and to raise new ones. Losses hurt.',
  },
  {
    k: 'fresh',
    name: 'Fresh armies',
    desc: 'Every battle gives you a fresh army: start from the one history gave you, and change it with the battle\'s budget using the troops you have unlocked.',
  },
];

const SIZES: SegOption<number>[] = [
  { v: 0.5, label: 'Small' },
  { v: 1, label: 'Medium' },
  { v: 1.5, label: 'Large' },
];

/** Choose a country's campaign: continue it, or start it again. */
export function CampaignSelect({ go }: { go: (s: Screen) => void }) {
  const [starting, setStarting] = useState<string | null>(null);
  return (
    <div className="screen">
      <Backdrop dim />
      <div className="window campaigns">
        <header className="window-head">
          <h2 className="heading">Campaigns</h2>
          <button className="btn small ghost" onClick={() => go({ k: 'title' })}>
            Back
          </button>
        </header>
        <div className="window-body">
          <p className="hint">
            Lead a country through its famous battles, left to right along a road of victories. Win Glory for each battle and its bonus objectives, and spend it on your army, on upgrades and on new troops.
          </p>
          <div className="campaign-grid">
            {listCampaigns().map((c) => {
              const s = loadCampaign(c.faction);
              const f = faction(c.faction);
              const hero = f.units.find((u) => u.elite) ?? f.units[0]!;
              const won = s ? Object.keys(s.won).length : 0;
              return (
                <div key={c.faction} className="choice campaign-card">
                  <div className="campaign-card-head">
                    <UnitIcon type={hero.id} pal={f.colors[0] ?? 0} />
                    <div>
                      <div className="label">{f.name}</div>
                      <h3>{c.title}</h3>
                    </div>
                  </div>
                  <p>{c.blurb}</p>
                  <div className="campaign-progress dim">
                    {s
                      ? `${won} of ${c.nodes.length} battles won · ${DIFFICULTIES[s.difficulty]!.name} · ${s.mode === 'veteran' ? 'veteran army' : 'fresh armies'}${s.done ? ' · campaign won!' : ''}`
                      : `${c.nodes.length} battles · not started`}
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    {s && (
                      <button className="btn primary small" onClick={() => go({ k: 'campaign', faction: c.faction })}>
                        Continue
                      </button>
                    )}
                    <button className="btn small" onClick={() => setStarting(c.faction)}>
                      {s ? 'Start again' : 'Start'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {starting && <NewCampaign faction={starting} close={() => setStarting(null)} start={() => go({ k: 'campaign', faction: starting })} />}
    </div>
  );
}

function NewCampaign({ faction: fid, close, start }: { faction: string; close: () => void; start: () => void }) {
  const [difficulty, setDifficulty] = useState(1);
  const [mode, setMode] = useState<ArmyMode>('veteran');
  const [unitSize, setUnitSize] = useState(1);
  const existing = loadCampaign(fid);
  return (
    <div className="modal-back" onClick={close}>
      <div className="window new-campaign" onClick={(e) => e.stopPropagation()}>
        <header className="window-head">
          <h2 className="heading">New campaign: {faction(fid).name}</h2>
        </header>
        <div className="window-body">
          <section>
            <div className="label">Difficulty</div>
            <div className="option-list">
              {DIFFICULTIES.map((d, i) => (
                <button key={d.name} className={`option ${difficulty === i ? 'on' : ''}`} onClick={() => setDifficulty(i)}>
                  <span className="option-name">
                    <span className={`lamp ${difficulty === i ? 'on' : ''}`} />
                    {d.name}
                  </span>
                  <span className="dim">{d.desc}</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="label">Your army</div>
            <div className="option-list two">
              {MODES.map((m) => (
                <button key={m.k} className={`option ${mode === m.k ? 'on' : ''}`} onClick={() => setMode(m.k)}>
                  <span className="option-name">
                    <span className={`lamp ${mode === m.k ? 'on' : ''}`} />
                    {m.name}
                  </span>
                  <span className="dim">{m.desc}</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="setting">
              <div>
                <div>Unit size</div>
                <div className="setting-desc">Men in every unit, for the whole campaign. Smaller runs better on older laptops.</div>
              </div>
              <Segmented options={SIZES} value={unitSize} onChange={setUnitSize} />
            </div>
          </section>
          {existing && <p className="hint bad">This replaces your {faction(fid).name} campaign in progress ({Object.keys(existing.won).length} battles won).</p>}
        </div>
        <footer className="window-foot">
          <button className="btn ghost" onClick={close}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => {
              newCampaign(fid, difficulty, mode, unitSize);
              start();
            }}
          >
            Begin the campaign
          </button>
        </footer>
      </div>
    </div>
  );
}
