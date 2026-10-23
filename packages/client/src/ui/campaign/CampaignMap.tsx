import { useMemo, useState } from 'react';
import { DIFFICULTIES, battleDef, campaignDef, faction, objectiveText, parseUnits, scaleUnits, type CampaignNode } from '@pl/sim';
import type { Screen } from '../../app/App';
import { loadCampaign, nodeState, type CampaignSave } from '../../app/campaign';
import { Backdrop } from '../Backdrop';
import { summary, victoryLines } from './text';

/** Spacing of the path tree, in pixels. */
const COL_W = 196;
const ROW_H = 118;
const NODE_W = 160;
const NODE_H = 86;
const PAD = 24;

/** A campaign's road of battles, left to right, and the briefing for the one chosen. */
export function CampaignMap({ faction: fid, go }: { faction: string; go: (s: Screen) => void }) {
  const [save] = useState<CampaignSave | null>(() => loadCampaign(fid));
  const def = campaignDef(fid);
  const firstOpen = def.nodes.find((n) => save && nodeState(save, n) === 'open') ?? def.nodes[0]!;
  const [sel, setSel] = useState<string>(firstOpen.battle);
  const cols = Math.max(...def.nodes.map((n) => n.col)) + 1;
  const width = PAD * 2 + (cols - 1) * COL_W + NODE_W;
  const height = PAD * 2 + 2 * ROW_H + NODE_H;
  const pos = (n: CampaignNode): [number, number] => [PAD + n.col * COL_W, PAD + (n.row + 1) * ROW_H];
  const byId = useMemo(() => new Map(def.nodes.map((n) => [n.battle, n])), [def]);
  if (!save) {
    return (
      <div className="screen">
        <Backdrop dim />
        <div className="window" style={{ width: 'min(92vw, 420px)' }}>
          <div className="window-body col" style={{ gap: 12 }}>
            <div>No {faction(fid).name} campaign is under way.</div>
            <button className="btn" onClick={() => go({ k: 'campaigns' })}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }
  const node = byId.get(sel)!;
  return (
    <div className="screen">
      <Backdrop dim />
      <div className="window campaign-map">
        <header className="window-head">
          <div className="row" style={{ gap: 14 }}>
            <h2 className="heading">{def.title}</h2>
            <span className="dim">
              {faction(fid).name} · {DIFFICULTIES[save.difficulty]!.name} · {save.mode === 'veteran' ? 'veteran army' : 'fresh armies'}
            </span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <span className="glory" title="Won in battle; spent on your army, upgrades and new troops">
              Glory <b>{save.glory}</b>
            </span>
            <button className="btn small" onClick={() => go({ k: 'camp', faction: fid })}>
              Army &amp; upgrades
            </button>
            <button className="btn small ghost" onClick={() => go({ k: 'campaigns' })}>
              Back
            </button>
          </div>
        </header>
        <div className="window-body campaign-body">
          {save.done && <div className="notice good">Campaign won! The side battles are still yours to fight.</div>}
          <div className="tree-scroll">
            <div className="tree" style={{ width, height }}>
              <svg className="tree-edges" width={width} height={height}>
                {def.nodes.flatMap((n) =>
                  n.after.map((a) => {
                    const from = byId.get(a);
                    if (!from) return null;
                    const [x0, y0] = pos(from);
                    const [x1, y1] = pos(n);
                    const sx = x0 + NODE_W;
                    const sy = y0 + NODE_H / 2;
                    const ex = x1;
                    const ey = y1 + NODE_H / 2;
                    const lit = !!save.won[a];
                    return (
                      <path
                        key={`${a}-${n.battle}`}
                        d={`M${sx},${sy} C${sx + 24},${sy} ${ex - 24},${ey} ${ex},${ey}`}
                        className={`edge ${lit ? 'lit' : ''} ${n.optional ? 'side' : ''}`}
                      />
                    );
                  }),
                )}
              </svg>
              {def.nodes.map((n) => {
                const b = battleDef(n.battle);
                const st = nodeState(save, n);
                const [x, y] = pos(n);
                const stars = save.won[n.battle];
                return (
                  <button
                    key={n.battle}
                    className={`cnode ${st} ${n.optional ? 'side' : ''} ${sel === n.battle ? 'sel' : ''} ${n.battle === def.final ? 'final' : ''}`}
                    style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
                    onClick={() => setSel(n.battle)}
                  >
                    <span className="cnode-year">
                      {b.year}
                      {n.optional && <span className="tag">side battle</span>}
                      {n.battle === def.final && <span className="tag">finale</span>}
                    </span>
                    <span className="cnode-name">{b.name}</span>
                    <span className="cnode-foe">vs {b.sides[1 - n.side]!.name}</span>
                    {stars ? (
                      <span className="cnode-stars">{stars.map((ok, i) => (ok ? <b key={i}>★</b> : <i key={i}>☆</i>))}</span>
                    ) : (
                      <span className="cnode-state">{st === 'open' ? 'Ready' : 'Locked'}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <Briefing save={save} node={node} go={go} />
        </div>
      </div>
    </div>
  );
}

function Briefing({ save, node, go }: { save: CampaignSave; node: CampaignNode; go: (s: Screen) => void }) {
  const b = battleDef(node.battle);
  const st = nodeState(save, node);
  const mine = b.sides[node.side]!;
  const foe = b.sides[1 - node.side]!;
  const mult = DIFFICULTIES[save.difficulty]!.glory;
  // The enemy as you'll meet it: bigger or smaller with the difficulty (Thermopylae scales its own waves).
  const foeUnits = (units: string): string[] => (b.scenario ? parseUnits(units) : scaleUnits(parseUnits(units), DIFFICULTIES[save.difficulty]!.enemy));
  const changed = b.winner !== node.side;
  return (
    <div className="briefing">
      <div className="briefing-main">
        <h3>
          {b.name} <span className="dim">{b.year} · {b.place}</span>
        </h3>
        <p>{b.history}</p>
        {changed && <p className="hint">History says your side lost this one. Win it, and history changes.</p>}
        <div className="briefing-armies">
          <div>
            <div className="label">You lead</div>
            {mine.armies.map((a, i) => (
              <div key={i} className="briefing-army">
                <b>{a.general}</b> <span className="dim">· {a.title}{i === 0 ? '' : ' (allies)'}</span>
                {a.arrive !== undefined && <span className="tag">arrives later</span>}
                <div className="dim">{i === 0 && save.mode === 'veteran' ? 'Your veteran army' : summary(parseUnits(a.units))}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="label">Against {foe.name}</div>
            {foe.armies.map((a, i) => (
              <div key={i} className="briefing-army">
                <b>{a.general}</b> <span className="dim">· {a.title}</span>
                {a.arrive !== undefined && <span className="tag">arrives later</span>}
                <div className="dim">{summary(foeUnits(a.units))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="briefing-side">
        <div className="label">To win</div>
        <ul className="objective-list">
          {victoryLines(b, node.side).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        <div className="label" style={{ marginTop: 10 }}>
          Bonus objectives
        </div>
        <ul className="objective-list">
          {b.bonus[node.side]!.map((o, i) => (
            <li key={i}>
              {save.won[node.battle]?.[i] ? '★' : '☆'} {objectiveText(o, b, node.side)} <span className="gold">+{Math.round(o.glory * mult)}</span>
            </li>
          ))}
        </ul>
        <div className="briefing-reward">
          Victory: <span className="gold">+{Math.round(node.glory * mult)} Glory</span>
          {node.unlocks?.length ? <span className="dim"> and new troops</span> : null}
        </div>
        {st === 'open' && (
          <button className="btn primary big" onClick={() => go({ k: 'camp', faction: save.faction, battle: node.battle })}>
            Prepare for battle
          </button>
        )}
        {st === 'won' && <div className="notice good">Won. {save.won[node.battle]!.filter(Boolean).length} of 3 bonus objectives.</div>}
        {st === 'locked' && <div className="notice">Win {node.after.map((a) => battleDef(a).name).join(' or ')} first.</div>}
      </div>
    </div>
  );
}
