import { memo, useEffect, useRef } from 'react';
import { unitType } from '@pl/sim';
import { frameKey, spriteKey } from '../game/art/atlas';
import { colorOf } from '../game/art/palette';
import { sharedArt } from '../game/render/BattleRenderer';

/** A unit's portrait: its front idle frame in the army's colours, drawn from the atlas. */
export const UnitIcon = memo(function UnitIcon({ type, pal }: { type: string; pal: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const { atlas, palette } = sharedArt();
    const px = atlas.cells.get(frameKey(spriteKey(unitType(type)), 0, 'idle0'));
    if (!px) return;
    c.width = px.w;
    c.height = px.h;
    const g = c.getContext('2d')!;
    const img = g.createImageData(px.w, px.h);
    for (let i = 0; i < px.data.length; i++) {
      const idx = px.data[i]!;
      if (!idx) continue;
      const [r, gg, b, a] = colorOf(palette, pal, idx);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = gg;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = a;
    }
    g.putImageData(img, 0, 0);
  }, [type, pal]);
  return <canvas ref={ref} />;
});
