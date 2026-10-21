import { useEffect, useRef } from 'react';
import { TEAM_COLORS, TERRAIN, heightAt } from '@pl/sim';
import type { GameSession } from '../game/session';

/** The minimap: terrain drawn once, units and the camera's view refreshed 5 times a second. */
export function Minimap({ session }: { session: GameSession }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const base = useRef<HTMLCanvasElement | null>(null);
  const map = session.battle.map;
  const W = 200;
  const H = Math.round((W * map.hm) / map.wm);

  useEffect(() => {
    // Terrain with simple hill shading.
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    const img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const mx = ((x + 0.5) / W) * map.wm;
        const my = ((y + 0.5) / H) * map.hm;
        const t = map.ter[Math.min(map.h - 1, Math.floor(my / 2)) * map.w + Math.min(map.w - 1, Math.floor(mx / 2))]!;
        const col = TERRAIN[t]!.color;
        const shade = Math.max(-0.25, Math.min(0.25, (heightAt(map, Math.min(map.wm - 0.01, mx + 2), my) - heightAt(map, mx, Math.min(map.hm - 0.01, my + 2))) * 0.15));
        const k = (y * W + x) * 4;
        img.data[k] = Math.max(0, Math.min(255, ((col >> 16) & 255) * (1 + shade)));
        img.data[k + 1] = Math.max(0, Math.min(255, ((col >> 8) & 255) * (1 + shade)));
        img.data[k + 2] = Math.max(0, Math.min(255, (col & 255) * (1 + shade)));
        img.data[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    base.current = c;
    const draw = (): void => {
      const cv = ref.current;
      if (!cv || !base.current) return;
      const ctx = cv.getContext('2d')!;
      ctx.drawImage(base.current, 0, 0);
      const b = session.battle;
      const sx = W / map.wm;
      const sy = H / map.hm;
      const r = session.renderer;
      for (const u of b.world.units) {
        if (u.st === 'gone') continue;
        if (r && !r.mine(u) && !r.visible(u)) continue;
        const c2 = b.center(u);
        if (!c2.n) continue;
        const a = b.army(u.army)!;
        ctx.fillStyle = `#${TEAM_COLORS[a.pal]!.primary.toString(16).padStart(6, '0')}`;
        const sel = r?.selected.has(u.id);
        const s = sel ? 4 : 3;
        ctx.fillRect(Math.round(c2.x * sx - s / 2), Math.round(c2.y * sy - s / 2), s, s);
        if (sel) {
          ctx.strokeStyle = '#ffd257';
          ctx.strokeRect(Math.round(c2.x * sx - 3) + 0.5, Math.round(c2.y * sy - 3) + 0.5, 6, 6);
        }
        if (u.st === 'routing') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(Math.round(c2.x * sx), Math.round(c2.y * sy), 1, 1);
        }
      }
      // The camera's view on the ground.
      if (r) {
        const { w, h } = r.size;
        const pts = [r.ground(0, h * 0.15), r.ground(w, h * 0.15), r.ground(w, h), r.ground(0, h)];
        if (pts.every(Boolean)) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath();
          pts.forEach((p, i) => (i ? ctx.lineTo(p!.x * sx, p!.y * sy) : ctx.moveTo(p!.x * sx, p!.y * sy)));
          ctx.closePath();
          ctx.stroke();
        }
      }
    };
    draw();
    const id = setInterval(draw, 200);
    return () => clearInterval(id);
  }, [session, map, W, H]);

  const click = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * map.wm;
    const y = ((e.clientY - rect.top) / rect.height) * map.hm;
    session.renderer?.rig.jump(x, y);
  };

  return (
    <div className="panel minimap pl-hud-block">
      <canvas ref={ref} width={W} height={H} onMouseDown={click} />
    </div>
  );
}
