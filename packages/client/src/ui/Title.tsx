import { useState } from 'react';
import { validCode } from '@pl/net';
import { inviteCode, type Screen } from '../app/App';
import { loadProfile, saveProfile } from '../app/profile';
import { createRoom } from '../net/connection';

export function Title({ go }: { go: (s: Screen) => void }) {
  const [name, setName] = useState(loadProfile().name);
  const [joining, setJoining] = useState(!!inviteCode());
  const [code, setCode] = useState(inviteCode());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ok = name.trim().length > 0;
  const commit = (): void => saveProfile({ name: name.trim().slice(0, 20) });

  const host = async (): Promise<void> => {
    commit();
    setBusy(true);
    setErr('');
    try {
      const c = await createRoom();
      history.replaceState(null, '', `#join=${c}`);
      go({ k: 'room', code: c });
    } catch (e) {
      setErr(`Couldn't reach the game server (${String(e)}).`);
    } finally {
      setBusy(false);
    }
  };
  const join = (): void => {
    const c = code.trim().toUpperCase();
    if (!validCode(c)) {
      setErr('Room codes are four letters, like KXQB.');
      return;
    }
    commit();
    history.replaceState(null, '', `#join=${c}`);
    go({ k: 'room', code: c });
  };

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
        {joining ? (
          <div className="ff-window col" style={{ alignItems: 'stretch', minWidth: 300 }}>
            <label className="dim" htmlFor="code">
              Room code from your friend
            </label>
            <input id="code" className="ff-input" value={code} maxLength={4} placeholder="ABCD" style={{ textTransform: 'uppercase', letterSpacing: 4 }} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && ok && join()} />
            <div className="row">
              <button className="ff-btn" disabled={!ok} onClick={join}>
                Join
              </button>
              <button className="ff-btn" onClick={() => setJoining(false)}>
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="menu-list">
            <button className="ff-btn big" disabled={!ok || busy} onClick={host}>
              {busy ? 'Opening a room…' : 'Host a game'}
            </button>
            <button className="ff-btn big" disabled={!ok} onClick={() => setJoining(true)}>
              Join a game
            </button>
            <button className="ff-btn big" disabled={!ok} onClick={() => (commit(), go({ k: 'solo' }))}>
              Solo battle
            </button>
            <button className="ff-btn big" onClick={() => go({ k: 'help' })}>
              How to play
            </button>
            <button className="ff-btn big" onClick={() => go({ k: 'settings' })}>
              Settings
            </button>
          </div>
        )}
        {err && (
          <div className="ff-window" style={{ color: 'var(--bad)' }}>
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
