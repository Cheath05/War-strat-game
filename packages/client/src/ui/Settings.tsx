import { useState } from 'react';
import { loadGraphics, saveGraphics, type GraphicsSettings, type QualityName } from '../game/render/quality';
import { audio, type AudioPrefs } from '../audio/engine';
import { ui } from '../audio/sfx';

const LEVELS = [0, 0.25, 0.5, 0.75, 1];

const QUALITIES: { k: QualityName; name: string; desc: string }[] = [
  { k: 'low', name: 'Low', desc: 'No shadows or blur. For older laptops.' },
  { k: 'medium', name: 'Medium', desc: 'Shadows, tilt-shift blur and bloom.' },
  { k: 'high', name: 'High', desc: 'Every soldier casts a real shadow.' },
  { k: 'ultra', name: 'Ultra', desc: 'Sharpest shadows and the most particles.' },
];

export function Settings({ back }: { back: () => void }) {
  const [g, setG] = useState<GraphicsSettings>(loadGraphics());
  const [a, setA] = useState<AudioPrefs>(audio.prefs);
  const setAudio = (p: Partial<AudioPrefs>): void => {
    const next = { ...a, ...p };
    setA(next);
    audio.setPrefs(next);
    if (p.sfx !== undefined) setTimeout(() => ui('chime'), 60);
  };
  const set = (p: Partial<GraphicsSettings>): void => {
    const next = { ...g, ...p };
    setG(next);
    saveGraphics(next);
  };
  return (
    <div className="screen title-bg">
      <div className="ff-window setup" style={{ position: 'relative', zIndex: 1, maxWidth: 640 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="ff-title">Settings</h2>
          <button className="ff-btn small" onClick={back}>
            Back
          </button>
        </div>
        <section>
          <div className="dim">Graphics quality</div>
          <div className="col">
            {QUALITIES.map((q) => (
              <button key={q.k} className={`ff-btn ${g.quality === q.k ? 'on' : ''}`} onClick={() => set({ quality: q.k })}>
                {q.name} <span className="dim">· {q.desc}</span>
              </button>
            ))}
          </div>
        </section>
        <section>
          <div className="dim">Sound</div>
          {(['music', 'sfx'] as const).map((k) => (
            <div key={k} className="row" style={{ marginTop: 4 }}>
              <span style={{ minWidth: 90 }}>{k === 'music' ? 'Music' : 'Effects'}</span>
              {LEVELS.map((v) => (
                <button key={v} className={`ff-btn small ${Math.abs(a[k] - v) < 0.01 ? 'on' : ''}`} onClick={() => setAudio({ [k]: v })}>
                  {v === 0 ? 'Off' : `${Math.round(v * 100)}%`}
                </button>
              ))}
            </div>
          ))}
        </section>
        <section>
          <div className="dim">Miniature blur at the top and bottom of the screen.</div>
          <div className="row">
            {(['off', 'light', 'strong'] as const).map((b) => (
              <button key={b} className={`ff-btn small ${(g.blur ?? 'light') === b ? 'on' : ''}`} onClick={() => set({ blur: b })}>
                {b === 'off' ? 'Off' : b === 'light' ? 'Light' : 'Strong'}
              </button>
            ))}
          </div>
        </section>
        <section>
          <div className="dim">Pixel size: bigger pixels look chunkier and run faster.</div>
          <div className="row">
            {[1, 2, 3].map((n) => (
              <button key={n} className={`ff-btn small ${g.pixelSize === n ? 'on' : ''}`} onClick={() => set({ pixelSize: n })}>
                {n === 1 ? 'Sharp' : n === 2 ? 'Chunky' : 'Very chunky'}
              </button>
            ))}
          </div>
        </section>
        <section>
          <button className={`ff-btn small ${g.showFps ? 'on' : ''}`} onClick={() => set({ showFps: !g.showFps })}>
            Show frame rate: {g.showFps ? 'on' : 'off'}
          </button>
        </section>
      </div>
    </div>
  );
}
