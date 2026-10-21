import { useState } from 'react';
import { validCode } from '@pl/net';
import { inviteCode, type Screen } from '../app/App';
import { loadProfile, saveProfile } from '../app/profile';
import { createRoom } from '../net/connection';
import { Backdrop } from './Backdrop';

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
    <div className="screen title-screen">
      <Backdrop />
      <div className="title-ui">
        <div>
          <h1 className="logo">
            PIXEL
            <br />
            LEGIONS
          </h1>
          <div className="subtitle">Rome · Greece · Carthage · Persia · Macedon</div>
        </div>
        <div className="col" style={{ gap: 6 }}>
          <label className="label" htmlFor="name">
            Your name, commander
          </label>
          <input id="name" className="field" value={name} maxLength={20} placeholder="e.g. Leonidas" onChange={(e) => setName(e.target.value)} onBlur={commit} />
        </div>
        {joining ? (
          <div className="col" style={{ gap: 6 }}>
            <label className="label" htmlFor="code">
              Room code from your friend
            </label>
            <input id="code" className="field code" value={code} maxLength={4} placeholder="ABCD" onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && ok && join()} />
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn primary" disabled={!ok} onClick={join}>
                Join
              </button>
              <button className="btn ghost" onClick={() => setJoining(false)}>
                Back
              </button>
            </div>
          </div>
        ) : (
          <nav className="menu-list">
            <button className="menu-item" disabled={!ok || busy} onClick={host}>
              {busy ? 'Opening a room…' : 'Host a game'}
            </button>
            <button className="menu-item" disabled={!ok} onClick={() => setJoining(true)}>
              Join a game
            </button>
            <button className="menu-item" disabled={!ok} onClick={() => (commit(), go({ k: 'solo' }))}>
              Solo battle
            </button>
            <button className="menu-item" onClick={() => go({ k: 'help' })}>
              How to play
            </button>
            <button className="menu-item" onClick={() => go({ k: 'settings' })}>
              Settings
            </button>
          </nav>
        )}
        {err && <div className="notice bad">{err}</div>}
      </div>
    </div>
  );
}
