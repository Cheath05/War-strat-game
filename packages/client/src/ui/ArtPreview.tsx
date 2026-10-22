import { useEffect, useRef, useState } from 'react';
import { FACTIONS } from '@pl/sim';
import { frameKey, spriteKey } from '../game/art/atlas';
import { type Pose, type View } from '../game/art/doll';
import { colorOf } from '../game/art/palette';
import { sharedArt } from '../game/render/BattleRenderer';

/** The views shown per unit: front, side and back standing, then side and front striking, side walking. */
const SHOTS: [View, Pose][] = [
  [0, 'idle0'],
  [2, 'idle0'],
  [1, 'idle0'],
  [2, 'atk1'],
  [0, 'atk1'],
  [2, 'walk0'],
  [0, 'dead'],
];

/** Dev page (#art): every unit of a faction in its key views, scaled up, in a chosen team colour. */
export function ArtPreview() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [pal, setPal] = useState(0);
  const [faction, setFaction] = useState(FACTIONS[0]!.id);
  useEffect(() => {
    const c = ref.current!;
    const { atlas, palette } = sharedArt();
    const f = FACTIONS.find((x) => x.id === faction)!;
    const S = 4;
    const cell = 66;
    c.width = SHOTS.length * cell * S;
    c.height = f.units.length * cell * S;
    const g = c.getContext('2d')!;
    g.fillStyle = '#5c8f3a';
    g.fillRect(0, 0, c.width, c.height);
    f.units.forEach((t, row) => {
      SHOTS.forEach(([view, pose], i) => {
        const px = atlas.cells.get(frameKey(spriteKey(t), view, pose));
        if (!px) return;
        for (let y = 0; y < px.h; y++) {
          for (let x = 0; x < px.w; x++) {
            const idx = px.data[y * px.w + x]!;
            if (!idx) continue;
            const [r, gg, b] = colorOf(palette, pal, idx);
            g.fillStyle = `rgb(${r},${gg},${b})`;
            g.fillRect((i * cell + x) * S, (row * cell + y) * S, S, S);
          }
        }
      });
      g.fillStyle = '#fff';
      g.font = '14px sans-serif';
      g.fillText(t.name, 6, row * cell * S + 16);
    });
  }, [pal, faction]);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', background: '#222' }}>
      <div className="row" style={{ padding: 8, position: 'sticky', top: 0, background: '#111', zIndex: 2 }}>
        {FACTIONS.map((f) => (
          <button key={f.id} className={`btn small ${f.id === faction ? 'on' : ''}`} onClick={() => setFaction(f.id)}>
            {f.name}
          </button>
        ))}
        {[0, 1, 2, 3, 8].map((p) => (
          <button key={p} className={`btn small ${p === pal ? 'on' : ''}`} onClick={() => setPal(p)}>
            colour {p}
          </button>
        ))}
      </div>
      <canvas ref={ref} style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}
