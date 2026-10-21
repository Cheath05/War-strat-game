import { useEffect, useRef, useState } from 'react';
import { FACTIONS } from '@pl/sim';
import { frameKey, spriteKey } from '../game/art/atlas';
import { POSES, type View } from '../game/art/doll';
import { colorOf } from '../game/art/palette';
import { sharedArt } from '../game/render/BattleRenderer';

/** Dev page (#art): every unit's frames, scaled up, in a chosen team colour. */
export function ArtPreview() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [pal, setPal] = useState(0);
  const [faction, setFaction] = useState(FACTIONS[0]!.id);
  useEffect(() => {
    const c = ref.current!;
    const { atlas, palette } = sharedArt();
    const f = FACTIONS.find((x) => x.id === faction)!;
    const S = 3;
    const cell = 66;
    const rows = f.units.length * 3;
    c.width = POSES.length * cell * S;
    c.height = rows * cell * S;
    const g = c.getContext('2d')!;
    g.fillStyle = '#5c8f3a';
    g.fillRect(0, 0, c.width, c.height);
    let row = 0;
    for (const t of f.units) {
      for (const view of [0, 1, 2] as View[]) {
        POSES.forEach((pose, i) => {
          const px = atlas.cells.get(frameKey(spriteKey(t), pose === 'dead' ? 0 : view, pose));
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
        row++;
      }
    }
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
