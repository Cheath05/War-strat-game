import { useState } from 'react';
import { CHANGELOG, VERSION } from '../app/changelog';

const SEEN = 'pl.seenVersion';

function seenVersion(): string {
  try {
    return localStorage.getItem(SEEN) ?? '';
  } catch {
    return VERSION;
  }
}

/** The version at the bottom of the menus; click it for the list of updates. */
export function VersionBadge() {
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(() => seenVersion() !== VERSION);
  const show = (): void => {
    setOpen(true);
    setFresh(false);
    try {
      localStorage.setItem(SEEN, VERSION);
    } catch {
      // fine: it shows as new again next time
    }
  };
  return (
    <>
      <button className="version-badge" onClick={show} title="What's new">
        v{VERSION}
        {fresh && <span className="tag">new</span>}
      </button>
      {open && (
        <div className="modal-back" onClick={() => setOpen(false)}>
          <div className="window updates" onClick={(e) => e.stopPropagation()}>
            <header className="window-head">
              <h2 className="heading">What's new</h2>
              <button className="btn small ghost" onClick={() => setOpen(false)}>
                Close
              </button>
            </header>
            <div className="window-body">
              {CHANGELOG.map((r) => (
                <div key={r.version} className="release">
                  <h3>
                    v{r.version} · {r.title} <span className="dim">{r.date}</span>
                  </h3>
                  <ul>
                    {r.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
