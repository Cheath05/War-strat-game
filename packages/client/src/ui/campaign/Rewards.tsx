import { RANK_NAMES, battleDef, campaignDef, unitType } from '@pl/sim';
import type { Screen } from '../../app/App';
import type { Outcome } from '../../app/campaign';
import { Backdrop } from '../Backdrop';

/** After a campaign battle: victory or defeat, the bonus objectives, Glory, and the army's state. */
export function Rewards({ faction, outcome, go }: { faction: string; outcome: Outcome; go: (s: Screen) => void }) {
  const b = battleDef(outcome.battle);
  const def = campaignDef(faction);
  const promoted = outcome.units.filter((u) => !u.lost && u.rankAfter > u.rankBefore);
  return (
    <div className="screen">
      <Backdrop dim />
      <div className="window rewards">
        <header className="window-head">
          <h2 className="heading">
            {b.name} · {outcome.won ? 'Victory' : 'Defeat'}
          </h2>
        </header>
        <div className="window-body">
          {outcome.finished && (
            <div className="notice good" style={{ marginBottom: 12 }}>
              {def.title}: the campaign is won! Any side battles left are still yours to fight.
            </div>
          )}
          {!outcome.won && <p className="hint">Nothing is lost: your army is as it was before the battle. Try again, perhaps with a different plan or army.</p>}
          {outcome.won && (
            <>
              <section>
                <div className="label">Bonus objectives</div>
                <ul className="objective-list big">
                  {outcome.objectives.map((o, i) => (
                    <li key={i} className={o.ok ? 'ok' : ''}>
                      {o.ok ? '★' : '☆'} {o.text} {o.ok && <span className="gold">+{o.glory}</span>}
                    </li>
                  ))}
                </ul>
                <div className="briefing-reward">
                  Glory earned: <span className="gold">+{outcome.glory}</span>
                </div>
              </section>
              {outcome.units.length > 0 && (
                <section>
                  <div className="label">Your army</div>
                  <div className="roster">
                    {outcome.units.map((u, i) => (
                      <div key={i} className="roster-row compact">
                        <div className="roster-name">{u.name}</div>
                        <span className="dim">
                          {Math.round(u.before * 100)}% → {u.lost ? <span className="bad">destroyed</span> : `${Math.round(u.after * 100)}%`}
                        </span>
                        {u.rankAfter > u.rankBefore && <span className="gold">now {RANK_NAMES[u.rankAfter]}</span>}
                      </div>
                    ))}
                  </div>
                  {promoted.length > 0 && <p className="hint">Veterans fight harder: each rank adds attack, defence and morale.</p>}
                </section>
              )}
              {outcome.unlocked.length > 0 && (
                <section>
                  <div className="label">New troops</div>
                  <p>{outcome.unlocked.map((t) => unitType(t).name).join(', ')} can now join your army.</p>
                </section>
              )}
            </>
          )}
        </div>
        <footer className="window-foot">
          <button className="btn primary big" onClick={() => go({ k: 'campaign', faction })}>
            Back to the campaign
          </button>
        </footer>
      </div>
    </div>
  );
}
