import { useState } from 'react';
import type { Screen } from '../app/App';
import { loadProfile, saveProfile } from '../app/profile';

export function Title({ go }: { go: (s: Screen) => void }) {
  const [name, setName] = useState(loadProfile().name);
  const ok = name.trim().length > 0;
  const commit = (): void => saveProfile({ name: name.trim().slice(0, 20) });
  return (
    <div className="screen title-bg">
      <div className="menu">
        <div className="logo">
          PIXEL
          <br />
          LEGIONS
        </div>
        <div className="subtitle">Rome · Greece · Carthage · Persia · Macedon</div>
        <div className="ff-window col" style={{ alignItems: 'stretch', minWidth: 300 }}>
          <label className="dim" htmlFor="name">
            Your name, commander
          </label>
          <input id="name" className="ff-input" value={name} maxLength={20} placeholder="e.g. Leonidas" onChange={(e) => setName(e.target.value)} onBlur={commit} />
        </div>
        <div className="menu-list">
          <button className="ff-btn big" disabled={!ok} onClick={() => (commit(), go({ k: 'solo' }))}>
            Solo battle
          </button>
          <button className="ff-btn big" disabled title="Multiplayer arrives in the next update">
            Host a game
          </button>
          <button className="ff-btn big" disabled title="Multiplayer arrives in the next update">
            Join a game
          </button>
          <button className="ff-btn big" onClick={() => go({ k: 'help' })}>
            How to play
          </button>
          <button className="ff-btn big" onClick={() => go({ k: 'settings' })}>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
