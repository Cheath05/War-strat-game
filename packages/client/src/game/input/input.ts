// Mouse and keyboard. In the General's view it works like Total War: left-click or drag to
// select, right-click to move or attack, right-drag to lay out a formation line, double
// right-click to run. In possession, WASD steers the officer and hotkeys command his men.

import { spacing, type DetOrder, type FormationKind, type Unit } from '@pl/sim';
import type { BattleRenderer, FormationGhost } from '../render/BattleRenderer';
import type { GameSession } from '../session';

interface Placement {
  u: Unit;
  x: number;
  y: number;
  dx: number;
  dy: number;
  w: number;
}

const DET_NEEDS_POINT: DetOrder['k'][] = ['hold', 'advance', 'attack', 'flankL', 'flankR', 'skirmish'];

export class BattleInput {
  private keys = new Set<string>();
  private mouse = { x: 0, y: 0, inside: false };
  private leftDown: { x: number; y: number } | null = null;
  private rightDown: { x: number; y: number; gx: number; gy: number } | null = null;
  private lastRightUp = 0;
  private lastGroupKey = { key: '', at: 0 };
  private box: HTMLDivElement;
  private groups = new Map<number, number[]>();
  private hoverTimer = 0;
  private avatarSent = { mx: 0, my: 0, run: false, ax: 0, ay: 0, at: 0 };
  /** A detachment order waiting for its target click. */
  pendingDet: { det: number; k: DetOrder['k'] } | null = null;
  orderMode = '';

  constructor(
    private s: GameSession,
    private r: BattleRenderer,
    private el: HTMLElement,
  ) {
    this.box = document.createElement('div');
    this.box.className = 'pl-selbox';
    el.appendChild(this.box);
    el.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    el.addEventListener('contextmenu', this.onContext);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('contextmenu', this.onContext);
    this.el.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.box.remove();
  }

  private get b() {
    return this.s.battle;
  }

  private local(e: PointerEvent | WheelEvent | MouseEvent): { x: number; y: number } {
    const rect = this.el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private possessing(): boolean {
    return !!this.s.me?.poss;
  }

  // --- Selection ----------------------------------------------------------------------

  selectedUnits(): Unit[] {
    const out: Unit[] = [];
    for (const id of this.r.selected) {
      const u = this.b.unit(id);
      if (u && u.st !== 'gone' && this.s.mine(u)) out.push(u);
    }
    return out;
  }

  select(ids: number[], add = false): void {
    if (!add) this.r.selected.clear();
    for (const id of ids) {
      if (add && this.r.selected.has(id) && ids.length === 1) this.r.selected.delete(id);
      else this.r.selected.add(id);
    }
  }

  // --- Pointer --------------------------------------------------------------------------

  private onContext = (e: MouseEvent): void => e.preventDefault();

  private onDown = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest('.pl-hud-block')) return;
    const p = this.local(e);
    if (e.button === 0) this.leftDown = p;
    if (e.button === 2) {
      const g = this.r.ground(p.x, p.y);
      if (g) this.rightDown = { ...p, gx: g.x, gy: g.y };
    }
    if (e.button === 1) e.preventDefault();
  };

  private onMove = (e: PointerEvent): void => {
    const p = this.local(e);
    const rect = this.el.getBoundingClientRect();
    this.mouse = { ...p, inside: e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom };
    if (e.buttons & 4) {
      // Middle drag pans.
      this.r.rig.pan(-e.movementX * 0.02, e.movementY * 0.02, 1);
    }
    if (this.leftDown) {
      const dx = p.x - this.leftDown.x;
      const dy = p.y - this.leftDown.y;
      if (Math.abs(dx) + Math.abs(dy) > 6 && !this.possessing()) {
        Object.assign(this.box.style, {
          display: 'block',
          left: `${Math.min(p.x, this.leftDown.x)}px`,
          top: `${Math.min(p.y, this.leftDown.y)}px`,
          width: `${Math.abs(dx)}px`,
          height: `${Math.abs(dy)}px`,
        });
      }
    }
    if (this.rightDown && !this.possessing()) {
      const g = this.r.ground(p.x, p.y);
      if (g && Math.hypot(g.x - this.rightDown.gx, g.y - this.rightDown.gy) > 3) {
        this.r.ghosts = this.layout(this.selectedUnits(), this.rightDown.gx, this.rightDown.gy, g.x, g.y).map(toGhost(this.b));
      }
    }
  };

  private onUp = (e: PointerEvent): void => {
    const p = this.local(e);
    if (e.button === 0 && this.leftDown) {
      const start = this.leftDown;
      this.leftDown = null;
      this.box.style.display = 'none';
      if (this.possessing()) return;
      if (this.pendingDet) {
        this.finishDetOrder(p.x, p.y);
        return;
      }
      if (Math.abs(p.x - start.x) + Math.abs(p.y - start.y) > 6) {
        const units = this.r.unitsInRect(start.x, start.y, p.x, p.y, (u) => this.s.mine(u));
        this.select(
          units.map((u) => u.id),
          e.shiftKey,
        );
      } else {
        const u = this.r.pickUnit(p.x, p.y);
        if (u && this.s.mine(u)) this.select([u.id], e.shiftKey || e.ctrlKey || e.metaKey);
        else if (!e.shiftKey) this.r.selected.clear();
      }
      return;
    }
    if (e.button === 2 && this.rightDown) {
      const start = this.rightDown;
      this.rightDown = null;
      const ghosts = this.r.ghosts;
      this.r.ghosts = [];
      if (this.pendingDet) {
        this.pendingDet = null;
        this.orderMode = '';
        return;
      }
      if (this.possessing()) return;
      const now = performance.now();
      const dbl = now - this.lastRightUp < 320;
      this.lastRightUp = now;
      const run = dbl || e.shiftKey;
      const units = this.selectedUnits();
      if (!units.length) return;
      if (ghosts.length) {
        const g = this.r.ground(p.x, p.y);
        if (g) this.issuePlacements(this.layout(units, start.gx, start.gy, g.x, g.y), run);
        return;
      }
      const target = this.r.pickUnit(p.x, p.y);
      if (target && target.side !== units[0]!.side) {
        this.s.issue({ k: 'attack', u: units.map((u) => u.id), t: target.id, run });
        this.r.addPing(this.b.center(target).x, this.b.center(target).y, '#ff6a50');
        return;
      }
      const g = this.r.ground(p.x, p.y);
      if (!g) return;
      this.issuePlacements(this.layoutAround(units, g.x, g.y), run);
      this.r.addPing(g.x, g.y, run ? '#ffd27a' : '#bfe8ff');
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const p = this.local(e);
    const g = this.r.ground(p.x, p.y) ?? undefined;
    this.r.rig.zoom(Math.exp(e.deltaY * 0.0012), g);
  };

  private onBlur = (): void => this.keys.clear();

  // --- Keyboard -------------------------------------------------------------------------

  private onKey = (e: KeyboardEvent): void => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea')) {
      this.keys.clear();
      return;
    }
    const k = e.key.toLowerCase();
    this.keys.add(k);
    const poss = this.possessing();
    if (k === 'tab') {
      e.preventDefault();
      if (poss) this.s.issue({ k: 'unpossess' });
      return;
    }
    if (poss) {
      const aim = this.r.ground(this.mouse.x, this.mouse.y);
      const at = aim ? { x: aim.x, y: aim.y } : {};
      if (k === ' ') {
        e.preventDefault();
        this.s.issue({ k: 'act', a: 'charge' });
      } else if (k === 'r') this.s.issue({ k: 'act', a: 'rally' });
      else if (k === 'q') this.s.issue({ k: 'act', a: 'volley', ...at });
      else if (k === 'e') this.s.issue({ k: 'act', a: 'hold' });
      else if (k === 'f') this.s.issue({ k: 'act', a: 'formation' });
      return;
    }
    const units = this.selectedUnits();
    const ids = units.map((u) => u.id);
    if (k >= '0' && k <= '9') {
      const n = Number(k);
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        this.groups.set(n, ids);
        for (const [uid, g] of this.r.groups) if (g === n) this.r.groups.delete(uid);
        for (const id of ids) this.r.groups.set(id, n);
      } else {
        const g = (this.groups.get(n) ?? []).filter((id) => this.b.unit(id)?.st !== 'gone');
        this.select(g, e.shiftKey);
        const now = performance.now();
        if (this.lastGroupKey.key === k && now - this.lastGroupKey.at < 350) this.centerOn(g);
        this.lastGroupKey = { key: k, at: now };
      }
      return;
    }
    switch (k) {
      case 'escape':
        if (this.pendingDet) {
          this.pendingDet = null;
          this.orderMode = '';
        } else this.r.selected.clear();
        return;
      case 'backspace':
      case 'h':
        if (ids.length) this.s.issue({ k: 'halt', u: ids });
        return;
      case 'f':
        this.cycleFormation(units);
        return;
      case 't':
        if (ids.length) this.s.issue({ k: 'flag', u: ids, f: 'fire', on: !(units[0]!.flags & 1) });
        return;
      case 'k':
        if (ids.length) this.s.issue({ k: 'flag', u: ids, f: 'skirmish', on: !(units[0]!.flags & 2) });
        return;
      case 'g':
        if (ids.length) this.s.issue({ k: 'flag', u: ids, f: 'guard', on: !(units[0]!.flags & 4) });
        return;
      case 'p':
        this.possessSelected();
        return;
      case 'home':
        this.centerOnGeneral();
        return;
      case ' ':
        e.preventDefault();
        this.s.togglePause();
        return;
      case 'v': {
        const g = this.r.ground(this.mouse.x, this.mouse.y);
        if (g) this.s.ping(Math.round(g.x * 10) / 10, Math.round(g.y * 10) / 10);
        return;
      }
      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.select(this.b.world.units.filter((u) => u.st !== 'gone' && this.s.mine(u)).map((u) => u.id));
        }
        return;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  // --- Commands -------------------------------------------------------------------------

  cycleFormation(units: Unit[]): void {
    if (!units.length) return;
    const t = this.b.typeOf(units[0]!);
    const i = t.forms.indexOf(units[0]!.form);
    const next = t.forms[(i + 1) % t.forms.length] as FormationKind;
    this.setFormation(units, next);
  }

  setFormation(units: Unit[], f: FormationKind): void {
    const ids = units.filter((u) => this.b.typeOf(u).forms.includes(f)).map((u) => u.id);
    if (ids.length) this.s.issue({ k: 'form', u: ids, f });
  }

  possessSelected(): void {
    const u = this.selectedUnits()[0];
    if (!u || !u.cap) return;
    this.s.issue({ k: 'possess', s: u.cap });
  }

  possessUnit(id: number): void {
    const u = this.b.unit(id);
    if (u?.cap) this.s.issue({ k: 'possess', s: u.cap });
  }

  /** Starts a detachment order; orders that need a place wait for a click on the map. */
  detOrder(det: number, k: DetOrder['k']): void {
    if (DET_NEEDS_POINT.includes(k)) {
      this.pendingDet = { det, k };
      this.orderMode = k;
      return;
    }
    const d = this.b.detachment(det);
    const c = d ? this.b.center(this.b.unit(d.units[0]!)!) : { x: 0, y: 0 };
    this.s.issue({ k: 'det', d: det, o: k, x: c.x, y: c.y });
  }

  private finishDetOrder(px: number, py: number): void {
    const pd = this.pendingDet!;
    this.pendingDet = null;
    this.orderMode = '';
    const enemy = this.r.pickUnit(px, py, (u) => !this.s.mine(u));
    const g = this.r.ground(px, py);
    if (!g) return;
    this.s.issue({ k: 'det', d: pd.det, o: pd.k, x: g.x, y: g.y, t: enemy && pd.k === 'attack' ? enemy.id : 0 });
    this.r.addPing(g.x, g.y, '#ffd27a');
  }

  private issuePlacements(list: Placement[], run: boolean): void {
    const deploy = this.b.world.phase === 'deploy';
    for (const p of list) {
      if (deploy) this.s.issue({ k: 'deploy', u: p.u.id, x: p.x, y: p.y, dx: p.dx, dy: p.dy });
      else this.s.issue({ k: 'move', u: [p.u.id], x: p.x, y: p.y, dx: p.dx, dy: p.dy, w: p.w, run });
    }
  }

  /** Units side by side on a line centred at (x, y), facing away from where they are now. */
  private layoutAround(units: Unit[], x: number, y: number): Placement[] {
    let cx = 0;
    let cy = 0;
    for (const u of units) {
      cx += u.ax;
      cy += u.ay;
    }
    cx /= units.length;
    cy /= units.length;
    let [fx, fy] = [x - cx, y - cy];
    const d = Math.hypot(fx, fy);
    if (d < 12) [fx, fy] = [units[0]!.dx, units[0]!.dy];
    else [fx, fy] = [fx / d, fy / d];
    const rx = -fy;
    const ry = fx;
    const total = units.reduce((s, u) => s + this.frontage(u, u.width), 0) + (units.length - 1) * 3;
    return this.layout(units, x - (rx * total) / 2, y - (ry * total) / 2, x + (rx * total) / 2, y + (ry * total) / 2, [fx, fy]);
  }

  private frontage(u: Unit, width: number): number {
    const [sx] = spacing(this.b.typeOf(u), u.form);
    return Math.max(0, width - 1) * sx + 1.5;
  }

  /** Spreads units along the line A→B; facing is perpendicular, away from the camera. */
  layout(units: Unit[], ax: number, ay: number, bx: number, by: number, facing?: [number, number]): Placement[] {
    if (!units.length) return [];
    const len = Math.hypot(bx - ax, by - ay);
    const ux = len > 0.01 ? (bx - ax) / len : 1;
    const uy = len > 0.01 ? (by - ay) / len : 0;
    let fx: number;
    let fy: number;
    if (facing) [fx, fy] = facing;
    else {
      // Of the two perpendiculars, face the one pointing away from the camera.
      const yaw = this.r.rig.yaw;
      const cfx = -Math.sin(yaw);
      const cfy = -Math.cos(yaw);
      [fx, fy] = [-uy, ux];
      if (fx * cfx + fy * cfy < 0) [fx, fy] = [uy, -ux];
    }
    // Keep the units' left-to-right order along the line.
    const sorted = [...units].sort((p, q) => (p.ax - q.ax) * ux + (p.ay - q.ay) * uy);
    const men = sorted.reduce((s, u) => s + u.sol.length, 0);
    const gaps = (sorted.length - 1) * 3;
    const usable = Math.max(0, len - gaps);
    let cursor = 0;
    const out: Placement[] = [];
    for (const u of sorted) {
      const [sx] = spacing(this.b.typeOf(u), u.form);
      const share = facing ? this.frontage(u, u.width) : (usable * u.sol.length) / Math.max(1, men);
      const width = facing ? u.width : Math.max(2, Math.min(u.sol.length, Math.round(share / sx) + 1));
      const fw = facing ? share : Math.max(share, this.frontage(u, width));
      const mid = cursor + fw / 2;
      out.push({ u, x: ax + ux * mid, y: ay + uy * mid, dx: fx, dy: fy, w: width });
      cursor += fw + 3;
    }
    return out;
  }

  centerOn(ids: number[]): void {
    let x = 0;
    let y = 0;
    let n = 0;
    for (const id of ids) {
      const u = this.b.unit(id);
      if (!u) continue;
      const c = this.b.center(u);
      x += c.x;
      y += c.y;
      n++;
    }
    if (n) this.r.rig.jump(x / n, y / n);
  }

  centerOnGeneral(): void {
    const me = this.s.me;
    const a = me ? this.b.army(me.army) : undefined;
    const g = a ? this.b.soldier(a.genSoldier) : undefined;
    if (g) this.r.rig.jump(g.x, g.y);
  }

  // --- Per frame ------------------------------------------------------------------------

  update(dt: number): void {
    const rig = this.r.rig;
    const k = this.keys;
    const me = this.s.me;
    const poss = me?.poss ? this.b.soldier(me.poss) : undefined;
    this.r.possessed = poss?.id ?? 0;
    if (k.has('q') && !poss) rig.rotate(dt * 1.4);
    if (k.has('e') && !poss) rig.rotate(-dt * 1.4);
    if (k.has('[')) rig.rotate(dt * 1.4);
    if (k.has(']')) rig.rotate(-dt * 1.4);
    if (poss) {
      this.steerAvatar();
      this.predictAvatar(dt, poss);
      const at = this.r.ledPosition() ?? poss;
      rig.follow = { x: at.x, y: at.y };
      if (rig.dist > 40) rig.dist = 26;
    } else {
      rig.follow = null;
      this.r.predict.x = 0;
      this.r.predict.y = 0;
      let px = 0;
      let py = 0;
      if (k.has('a') || k.has('arrowleft')) px -= 1;
      if (k.has('d') || k.has('arrowright')) px += 1;
      if (k.has('w') || k.has('arrowup')) py += 1;
      if (k.has('s') || k.has('arrowdown')) py -= 1;
      if (px || py) rig.pan(px, py, dt);
    }
    this.hoverTimer += dt;
    if (this.hoverTimer > 0.08 && this.mouse.inside) {
      this.hoverTimer = 0;
      const u = this.r.pickUnit(this.mouse.x, this.mouse.y);
      this.r.hover = u?.id ?? 0;
    }
  }

  /**
   * Hides the network delay for the officer you lead: draw him where your keys are taking
   * him (the difference between your intended velocity and the sim's, accumulated), and let
   * that lead decay as the sim catches up.
   */
  private predictAvatar(dt: number, s: { vx: number; vy: number; u: number }): void {
    const a = this.avatarSent;
    const u = this.b.unit(s.u);
    const t = u ? this.b.typeOf(u) : undefined;
    const speed = t ? (a.run ? t.run : t.speed) : 0;
    const p = this.r.predict;
    p.x += (a.mx * speed - s.vx) * dt;
    p.y += (a.my * speed - s.vy) * dt;
    const k = Math.exp(-dt / 0.3);
    p.x *= k;
    p.y *= k;
    const l = Math.hypot(p.x, p.y);
    if (l > 2.5) {
      p.x *= 2.5 / l;
      p.y *= 2.5 / l;
    }
  }

  private steerAvatar(): void {
    const k = this.keys;
    let dx = 0;
    let dy = 0;
    if (k.has('a') || k.has('arrowleft')) dx -= 1;
    if (k.has('d') || k.has('arrowright')) dx += 1;
    if (k.has('w') || k.has('arrowup')) dy += 1;
    if (k.has('s') || k.has('arrowdown')) dy -= 1;
    const yaw = this.r.rig.yaw;
    const fx = -Math.sin(yaw);
    const fy = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const ry = -Math.sin(yaw);
    let mx = rx * dx + fx * dy;
    let my = ry * dx + fy * dy;
    const l = Math.hypot(mx, my);
    if (l > 0) {
      mx /= l;
      my /= l;
    }
    mx = Math.round(mx * 100) / 100;
    my = Math.round(my * 100) / 100;
    const run = k.has('shift');
    const aim = this.r.ground(this.mouse.x, this.mouse.y);
    const ax = aim ? Math.round(aim.x * 10) / 10 : this.avatarSent.ax;
    const ay = aim ? Math.round(aim.y * 10) / 10 : this.avatarSent.ay;
    const now = performance.now();
    const a = this.avatarSent;
    const moved = mx !== a.mx || my !== a.my || run !== a.run;
    const aimed = Math.hypot(ax - a.ax, ay - a.ay) > 1.5 && now - a.at > 200;
    if (moved || aimed) {
      this.s.issue({ k: 'avatar', mx, my, run, ax, ay });
      this.avatarSent = { mx, my, run, ax, ay, at: now };
    }
  }
}

function toGhost(b: import('@pl/sim').Battle) {
  return (p: Placement): FormationGhost => {
    const t = b.typeOf(p.u);
    const [sx, sy] = spacing(t, p.u.form);
    const n = Math.max(1, p.u.sol.length - 1);
    return { ax: p.x, ay: p.y, dx: p.dx, dy: p.dy, frontage: Math.max(0, Math.min(p.w, n) - 1) * sx, depth: (Math.ceil(n / p.w) - 1) * sy };
  };
}
