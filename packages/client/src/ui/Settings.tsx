import { useState, type ReactNode } from 'react';
import { FPS_CAPS, loadGraphics, saveGraphics, type BlurLevel, type GraphicsSettings, type QualityName } from '../game/render/quality';
import { audio, type AudioPrefs } from '../audio/engine';
import { ui } from '../audio/sfx';
import { Backdrop } from './Backdrop';
import { Segmented, Toggle, type SegOption } from './controls';

const LEVELS: SegOption<number>[] = [0, 0.25, 0.5, 0.75, 1].map((v) => ({ v, label: v === 0 ? 'Off' : `${Math.round(v * 100)}%` }));

const QUALITIES: { k: QualityName; name: string; desc: string }[] = [
  { k: 'low', name: 'Low', desc: 'No shadows or blur. For older laptops.' },
  { k: 'medium', name: 'Medium', desc: 'Shadows, tilt-shift blur and bloom.' },
  { k: 'high', name: 'High', desc: 'Every soldier casts a real shadow.' },
  { k: 'ultra', name: 'Ultra', desc: 'Sharpest shadows and the most particles.' },
];

/** Frame-rate limits to pick from (also in the battle menu). */
export const FPS_OPTIONS: SegOption<number>[] = FPS_CAPS.map((v) => ({ v, label: v ? String(v) : 'No limit' }));

const BLURS: SegOption<BlurLevel>[] = [
  { v: 'off', label: 'Off' },
  { v: 'light', label: 'Light' },
  { v: 'strong', label: 'Strong' },
];

const PIXELS: SegOption<number>[] = [
  { v: 1, label: 'Sharp' },
  { v: 2, label: 'Chunky' },
  { v: 3, label: 'Very chunky' },
];

/** The volume step nearest a saved level. */
const nearest = (x: number): number => LEVELS.reduce((best, o) => (Math.abs(o.v - x) < Math.abs(best - x) ? o.v : best), 0);

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
    <div className="screen">
      <Backdrop dim />
      <div className="window settings">
        <header className="window-head">
          <h2 className="heading">Settings</h2>
          <button className="btn small ghost" onClick={back}>
            Back
          </button>
        </header>
        <div className="window-body">
          <section>
            <div className="label">Graphics quality</div>
            <div className="option-list">
              {QUALITIES.map((q) => (
                <button key={q.k} className={`option ${g.quality === q.k ? 'on' : ''}`} onClick={() => set({ quality: q.k })}>
                  <span className="option-name">
                    <span className={`lamp ${g.quality === q.k ? 'on' : ''}`} />
                    {q.name}
                  </span>
                  <span className="dim">{q.desc}</span>
                </button>
              ))}
            </div>
            <Setting name="Frame rate limit" desc="At most this many frames a second. A limit keeps a laptop cooler and quieter.">
              <Segmented options={FPS_OPTIONS} value={g.fpsCap} onChange={(fpsCap) => set({ fpsCap })} />
            </Setting>
            <Setting name="Miniature blur" desc="The tilt-shift blur at the top and bottom of the screen.">
              <Segmented options={BLURS} value={g.blur ?? 'light'} onChange={(blur) => set({ blur })} />
            </Setting>
            <Setting name="Pixel size" desc="Bigger pixels look chunkier and run faster.">
              <Segmented options={PIXELS} value={g.pixelSize} onChange={(pixelSize) => set({ pixelSize })} />
            </Setting>
            <Setting name="Frame rate counter" desc="Frames a second, in the corner during battle.">
              <Toggle on={g.showFps} label={g.showFps ? 'Shown' : 'Hidden'} onChange={(showFps) => set({ showFps })} />
            </Setting>
          </section>
          <section>
            <div className="label">Sound</div>
            {(['music', 'sfx'] as const).map((k) => (
              <Setting key={k} name={k === 'music' ? 'Music' : 'Effects'}>
                <Segmented options={LEVELS} value={nearest(a[k])} onChange={(v) => setAudio({ [k]: v })} />
              </Setting>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

/** One setting: its name and a line of help, with the control on the right. */
function Setting({ name, desc, children }: { name: string; desc?: string; children: ReactNode }) {
  return (
    <div className="setting">
      <div>
        <div>{name}</div>
        {desc && <div className="setting-desc">{desc}</div>}
      </div>
      {children}
    </div>
  );
}
