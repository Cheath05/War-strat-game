// Draws the battle: the HD-2D diorama of terrain, water, props, soldiers, corpses,
// missiles and effects, with post-processing. Reads the simulation, never changes it.

import * as THREE from 'three';
import { Battle, TEAM_COLORS, heightAt, spacing, unitType, type SimEvent, type Soldier, type Unit, type UnitTypeDef } from '@pl/sim';
import { buildAtlas, frameKey, spriteKey, type Atlas, type FrameRect } from '../art/atlas';
import type { Pose, View } from '../art/doll';
import { NEUTRAL_ROW, buildPaletteData } from '../art/palette';
import { PROPS } from '../art/props';
import { CameraRig } from './camera';
import { Effects, fogUniforms } from './fx';
import { BlobShadows, Overlays } from './overlays';
import { PostFX } from './postfx';
import { QUALITY, type GraphicsSettings } from './quality';
import { SpriteBatch, createSpriteShared, type SpriteShared } from './sprites';
import { createTerrain, type TerrainView } from './terrain';
import { groundAt, toScreen } from './picking';
import { Banners, type BannerInfo } from './banners';

let atlasCache: { atlas: Atlas; palette: Uint8Array } | null = null;
/** The atlas is built once per page (about a second of drawing). */
export function sharedArt(): { atlas: Atlas; palette: Uint8Array } {
  if (!atlasCache) atlasCache = { atlas: buildAtlas(), palette: buildPaletteData() };
  return atlasCache;
}

export interface FormationGhost {
  ax: number;
  ay: number;
  dx: number;
  dy: number;
  frontage: number;
  depth: number;
}

export interface Ping {
  x: number;
  y: number;
  t: number;
  color: string;
}

const SYMBOL: Record<string, string> = {
  inf: '⚔',
  spear: '↟',
  pike: '⇞',
  skirm: '➶',
  archer: '➹',
  slinger: '•',
  cav: '♞',
  hcav: '♞',
  hacav: '➹',
  ele: '♜',
  chariot: '☸',
};

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

export class BattleRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig: CameraRig;
  battle: Battle;
  selected = new Set<number>();
  hover = 0;
  ghosts: FormationGhost[] = [];
  pings: Ping[] = [];
  groups = new Map<number, number>();
  possessed = 0;
  /** Units this player may command (for banners and selection colour). */
  mine = (_u: Unit): boolean => false;
  /** Fog of war: is this enemy unit visible to us? */
  visible = (_u: Unit): boolean => true;
  /** Deployment zone to highlight, if any. */
  zone: number[] | null = null;

  private post: PostFX | null = null;
  private terrain: TerrainView;
  private shared: SpriteShared;
  private atlas: Atlas;
  private soldierBatch: SpriteBatch;
  private corpseBatch: SpriteBatch;
  private propBatch: SpriteBatch;
  private blobs: BlobShadows;
  private fx: Effects;
  private overlays: Overlays;
  private banners: Banners;
  private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh;
  private prev = new Map<number, [number, number]>();
  private flash = new Map<number, number>();
  private corpses: { x: number; y: number; h: number; f: FrameRect; pal: number; flip: number }[] = [];
  private corpseDirty = true;
  private time = 0;
  private frame = 0;
  private keyCache = new Map<string, string>();
  private w = 1;
  private h = 1;
  private quality;
  private resizeObserver: ResizeObserver;

  constructor(
    readonly container: HTMLElement,
    battle: Battle,
    readonly graphics: GraphicsSettings,
  ) {
    this.battle = battle;
    this.quality = QUALITY[graphics.quality];
    const q = this.quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.setClearColor(0xd8d2c0);
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = q.bloom || q.tiltShift ? THREE.NoToneMapping : THREE.AgXToneMapping;
    this.renderer.domElement.className = 'pl-canvas';
    if (graphics.pixelSize > 1) this.renderer.domElement.style.imageRendering = 'pixelated';
    container.appendChild(this.renderer.domElement);

    const map = battle.map;
    this.rig = new CameraRig(map, 1);
    const art = sharedArt();
    this.atlas = art.atlas;
    this.shared = createSpriteShared(art.atlas.pixels, art.atlas.size, art.palette);

    // Light: warm low sun from the south-west, cool sky fill, a touch of ambient.
    this.sun = new THREE.DirectionalLight(0xfff0d4, 2.6);
    this.sun.castShadow = q.shadows;
    this.sun.shadow.mapSize.set(q.shadowMap, q.shadowMap);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(new THREE.HemisphereLight(0xc8dcff, 0x6a5a3c, 1.25));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    this.scene.fog = new THREE.Fog(0xd8d2c0, 200, 900);

    this.sky = makeSky();
    this.scene.add(this.sky);

    this.terrain = createTerrain(map);
    this.scene.add(this.terrain.group);
    // Ground beyond the map's edge (a ring around it) so the diorama never shows a void.
    const ring = new THREE.Shape([new THREE.Vector2(-3000, -3000), new THREE.Vector2(3000 + map.wm, -3000), new THREE.Vector2(3000 + map.wm, 3000 + map.hm), new THREE.Vector2(-3000, 3000 + map.hm)]);
    ring.holes.push(new THREE.Path([new THREE.Vector2(0.5, 0.5), new THREE.Vector2(0.5, map.hm - 0.5), new THREE.Vector2(map.wm - 0.5, map.hm - 0.5), new THREE.Vector2(map.wm - 0.5, 0.5)]));
    const skirtGeo = new THREE.ShapeGeometry(ring);
    skirtGeo.rotateX(Math.PI / 2);
    const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshLambertMaterial({ color: new THREE.Color(0x4a6a32).convertSRGBToLinear(), side: THREE.DoubleSide }));
    skirt.position.y = -0.4;
    this.scene.add(skirt);

    this.propBatch = new SpriteBatch(this.shared, Math.max(16, map.props.length), { castShadow: q.shadows, receiveShadow: true });
    this.scene.add(this.propBatch.mesh);
    this.buildProps();

    this.corpseBatch = new SpriteBatch(this.shared, 5000, { receiveShadow: true });
    this.scene.add(this.corpseBatch.mesh);
    this.soldierBatch = new SpriteBatch(this.shared, 9000, { castShadow: q.spriteShadows, receiveShadow: true });
    this.scene.add(this.soldierBatch.mesh);
    this.blobs = new BlobShadows(9000);
    if (!q.spriteShadows) this.scene.add(this.blobs.mesh);

    this.fx = new Effects(map, q.particles);
    this.scene.add(this.fx.group);
    this.overlays = new Overlays(map);
    this.scene.add(this.overlays.lines);
    this.banners = new Banners(container);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    if (q.bloom || q.tiltShift || q.vignette) this.post = new PostFX(this.renderer, this.scene, this.rig.camera, q);
    this.resize();
  }

  /** Swaps in a new battle object (after a resync); visuals carry on. */
  setBattle(b: Battle): void {
    this.battle = b;
    this.prev.clear();
  }

  private buildProps(): void {
    const map = this.battle.map;
    this.propBatch.begin();
    for (const p of map.props) {
      const art = PROPS[p.kind];
      if (!art) continue;
      const f = this.atlas.frames.get(`prop|${p.kind}|${p.v % art.variants}`);
      if (!f) continue;
      const h = heightAt(map, Math.min(map.wm - 0.01, p.x), Math.min(map.hm - 0.01, p.y));
      this.propBatch.push(p.x, h - 0.15, p.y, f, NEUTRAL_ROW, p.v % 2, 0, 0, p.s, p.kind === 'tree' || p.kind === 'reeds' ? 2 : 1);
    }
    this.propBatch.end();
  }

  resize(): void {
    const r = this.container.getBoundingClientRect();
    this.w = Math.max(1, Math.floor(r.width));
    this.h = Math.max(1, Math.floor(r.height));
    const ratio = Math.min(window.devicePixelRatio || 1, 2) / Math.max(1, this.graphics.pixelSize);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(this.w, this.h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.rig.resize(this.w / this.h);
    this.post?.setSize(this.w, this.h);
    this.fx?.setProjection(this.h * this.renderer.getPixelRatio(), this.rig.camera.fov);
  }

  get size(): { w: number; h: number } {
    return { w: this.w, h: this.h };
  }

  // --- Hooks from the lockstep driver --------------------------------------------------

  beforeTick(b: Battle): void {
    for (const s of b.world.soldiers) {
      const p = this.prev.get(s.id);
      if (p) {
        p[0] = s.x;
        p[1] = s.y;
      } else this.prev.set(s.id, [s.x, s.y]);
    }
  }

  afterTick(b: Battle): void {
    for (const e of b.events) this.onEvent(b, e);
    if (b.world.tick % 100 === 0) {
      // Forget soldiers who are gone.
      const alive = new Set(b.world.soldiers.map((s) => s.id));
      for (const id of this.prev.keys()) if (!alive.has(id)) this.prev.delete(id);
    }
  }

  private onEvent(b: Battle, e: SimEvent): void {
    switch (e.k) {
      case 'death': {
        const t = unitType(e.type);
        const f = this.atlas.frames.get(frameKey(this.keyOf(t), 0, 'dead'));
        const army = b.army(e.army);
        if (f && army) {
          this.corpses.push({ x: e.x, y: e.y, h: heightAt(b.map, e.x, e.y), f, pal: army.pal, flip: (e.s % 2) as number });
          if (this.corpses.length > 4800) this.corpses.splice(0, 200);
          this.corpseDirty = true;
        }
        this.fx.blood(e.x, e.y, 4);
        this.flash.delete(e.s);
        break;
      }
      case 'hit':
        this.flash.set(e.s, 0.12);
        if (e.big) this.fx.sparks(e.x, e.y, 3);
        if (Math.random() < 0.3) this.fx.blood(e.x, e.y, 2);
        break;
      case 'block':
        if (Math.random() < 0.5) this.fx.sparks(e.x, e.y, 2);
        break;
      case 'land':
        if (!e.hit) {
          const t = b.map.ter[Math.floor(e.y / 2) * b.map.w + Math.floor(e.x / 2)];
          if (t === 8 || t === 9) this.fx.splash(e.x, e.y);
          else if (Math.random() < 0.4) this.fx.dust(e.x, e.y, 1);
        }
        break;
      case 'impact':
        this.fx.dust(e.x, e.y, 2, true);
        this.fx.sparks(e.x, e.y, e.braced ? 6 : 3);
        break;
      case 'charge': {
        const u = b.unit(e.u);
        if (u && b.typeOf(u).mounted) this.fx.dust(e.x, e.y, 6, true);
        break;
      }
    }
  }

  private keyOf(t: UnitTypeDef): string {
    let k = this.keyCache.get(t.id);
    if (!k) {
      k = spriteKey(t);
      this.keyCache.set(t.id, k);
    }
    return k;
  }

  // --- Picking --------------------------------------------------------------------------

  ground(px: number, py: number): { x: number; y: number } | null {
    return groundAt(this.rig.camera, this.battle.map, px, py, this.w, this.h);
  }

  screenOf(x: number, y: number, lift = 1): { x: number; y: number } | null {
    const map = this.battle.map;
    return toScreen(this.rig.camera, x, heightAt(map, Math.min(map.wm - 0.01, Math.max(0, x)), Math.min(map.hm - 0.01, Math.max(0, y))) + lift, y, this.w, this.h);
  }

  /** The unit with a soldier (or banner) nearest the screen point. */
  pickUnit(px: number, py: number, filter?: (u: Unit) => boolean): Unit | undefined {
    const b = this.battle;
    let best: Unit | undefined;
    let bestD = 22;
    for (const u of b.world.units) {
      if (u.st === 'gone' || (filter && !filter(u))) continue;
      if (!this.mine(u) && !this.visible(u)) continue;
      const c = b.center(u);
      const sc = this.screenOf(c.x, c.y, 3.4);
      if (sc) {
        const d = Math.hypot(sc.x - px, sc.y - py) - 6;
        if (d < bestD) {
          bestD = d;
          best = u;
        }
      }
      for (let i = 0; i < u.sol.length; i += 2) {
        const s = b.soldier(u.sol[i]!);
        if (!s) continue;
        const p = this.screenOf(s.x, s.y, 0.9);
        if (!p) continue;
        const d = Math.hypot(p.x - px, p.y - py);
        if (d < bestD) {
          bestD = d;
          best = u;
        }
      }
    }
    return best;
  }

  unitsInRect(x0: number, y0: number, x1: number, y1: number, filter: (u: Unit) => boolean): Unit[] {
    const out: Unit[] = [];
    const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)];
    const [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
    for (const u of this.battle.world.units) {
      if (u.st === 'gone' || !filter(u)) continue;
      for (const id of u.sol) {
        const s = this.battle.soldier(id);
        if (!s) continue;
        const p = this.screenOf(s.x, s.y, 0.9);
        if (p && p.x >= ax && p.x <= bx && p.y >= ay && p.y <= by) {
          out.push(u);
          break;
        }
      }
    }
    return out;
  }

  // --- Frame ----------------------------------------------------------------------------

  render(dt: number, alpha: number): void {
    this.time += dt;
    this.frame++;
    const b = this.battle;
    const w = b.world;
    const map = b.map;
    const rig = this.rig;
    rig.update(dt);
    const cam = rig.camera;
    const focus = rig.focus;

    // Billboard orientation from the camera: upright, leaning a little toward the viewer.
    const yaw = Math.atan2(cam.position.x - focus.x, cam.position.z - focus.y);
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const up = new THREE.Vector3(0, 1, 0).lerp(camUp, 0.45).normalize();
    this.shared.uniforms.uRight.value.copy(right);
    this.shared.uniforms.uUp.value.copy(up);
    this.shared.uniforms.uNormal.value.set(Math.sin(yaw) * 0.55, 0.85, Math.cos(yaw) * 0.55).normalize();
    this.shared.uniforms.uTime.value = this.time;
    const fwdX = -Math.sin(yaw);
    const fwdY = -Math.cos(yaw);
    const rgtX = Math.cos(yaw);
    const rgtY = -Math.sin(yaw);

    // Sun and shadow camera follow the view.
    const span = Math.min(260, 30 + focus.dist * 0.9);
    const fh = heightAt(map, Math.min(map.wm - 0.01, Math.max(0, focus.x)), Math.min(map.hm - 0.01, Math.max(0, focus.y)));
    this.sun.position.set(focus.x - 70, fh + 110, focus.y + 55);
    this.sun.target.position.set(focus.x, fh, focus.y);
    const sc = this.sun.shadow.camera;
    sc.left = -span;
    sc.right = span;
    sc.top = span;
    sc.bottom = -span;
    sc.near = 10;
    sc.far = 400;
    sc.updateProjectionMatrix();

    // Fog and sky follow the zoom.
    const fog = this.scene.fog as THREE.Fog;
    fog.near = focus.dist * 1.4 + 60;
    fog.far = focus.dist * 4.5 + 400;
    fogUniforms.uFogColor.value.copy(fog.color);
    fogUniforms.uFogNear.value = fog.near;
    fogUniforms.uFogFar.value = fog.far;
    const wu = this.terrain.waterUniforms;
    wu.uTime!.value = this.time;
    (wu.uFogColor!.value as THREE.Color).copy(fog.color);
    wu.uFogNear!.value = fog.near;
    wu.uFogFar!.value = fog.far;
    this.terrain.uniforms.uTime.value = this.time;
    if (this.zone) {
      this.terrain.uniforms.uZone.value.set(this.zone[0]!, this.zone[1]!, this.zone[2]!, this.zone[3]!);
      this.terrain.uniforms.uZoneOn.value = 1;
    } else this.terrain.uniforms.uZoneOn.value = 0;
    this.sky.position.copy(cam.position);

    // Soldiers.
    for (const [id, t] of this.flash) {
      if (t - dt <= 0) this.flash.delete(id);
      else this.flash.set(id, t - dt);
    }
    const sb = this.soldierBatch;
    const blobs = this.blobs;
    sb.begin();
    blobs.begin();
    const showBlobs = !this.quality.spriteShadows;
    for (const s of w.soldiers) {
      const u = b.unit(s.u);
      if (!u) continue;
      if (!this.visible(u)) continue;
      const t = b.typeOf(u);
      const army = b.army(u.army)!;
      const p = this.prev.get(s.id);
      const x = p ? p[0] + (s.x - p[0]) * alpha : s.x;
      const y = p ? p[1] + (s.y - p[1]) * alpha : s.y;
      const gh = heightAt(map, Math.min(map.wm - 0.01, Math.max(0, x)), Math.min(map.hm - 0.01, Math.max(0, y)));
      const dot = s.fx * fwdX + s.fy * fwdY;
      let view: View = 2;
      let flip = 0;
      if (dot > 0.42) view = 1;
      else if (dot < -0.42) view = 0;
      else flip = s.fx * rgtX + s.fy * rgtY < 0 ? 1 : 0;
      const pose = this.poseOf(s, u);
      const f = this.atlas.frames.get(frameKey(this.keyOf(t), view, pose));
      if (!f) continue;
      const scale = s.rank === 3 ? 1.28 : s.rank === 2 ? 1.18 : s.rank === 1 ? 1.1 : 1;
      const hl = s.id === this.possessed ? 0.6 : this.selected.has(u.id) ? 0.32 : this.hover === u.id ? 0.18 : 0;
      const knocked = s.act > 0 && s.actK === 2;
      sb.push(x, gh - (knocked ? 0.5 : 0), y, f, army.pal, flip, Math.min(1, (this.flash.get(s.id) ?? 0) * 8), hl, scale);
      if (showBlobs) blobs.push(x, gh, y, t.radius * 2.6 * scale);
    }
    sb.end();
    blobs.end();

    if (this.corpseDirty) {
      const cb = this.corpseBatch;
      cb.begin();
      for (const c of this.corpses) cb.push(c.x, c.h - 0.1, c.y, c.f, c.pal, c.flip, 0, -0.25);
      cb.end();
      this.corpseDirty = false;
    }

    // Effects.
    this.fx.projectiles(w.proj, alpha);
    if (this.quality.ambientMotes) this.fx.motes(dt, focus.x, focus.y, Math.min(60, 12 + focus.dist * 0.4));
    if (this.quality.particles > 0) this.dustFromRunners(dt);
    this.fx.update(dt, focus.dist);

    this.drawOverlays();
    if (this.frame % 2 === 0) this.drawBanners();

    // Tilt-shift focus: centre of the screen, tighter when close.
    this.post?.focus(this.possessed ? -0.05 : 0.04, this.possessed ? 0.36 : 0.42 + rig.zoomT() * 0.25);
    if (this.post) this.post.render(dt);
    else this.renderer.render(this.scene, cam);
  }

  private poseOf(s: Soldier, u: Unit): Pose {
    if (s.act > 0) {
      if (s.actK === 1) return s.act > 4 ? 'atk0' : s.act > 2 ? 'atk1' : 'atk2';
      if (s.actK === 4) return s.act > 8 ? 'atk0' : s.act > 4 ? 'atk1' : 'atk2';
      if (s.actK === 2 || s.actK === 3) return 'hit';
    }
    const sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    if (sp > 0.3) {
      const rate = sp > 3.5 ? 9 : 5.5;
      const k = Math.floor(this.time * rate + s.id * 0.37) % 4;
      return (['walk0', 'walk1', 'walk2', 'walk3'] as const)[k]!;
    }
    void u;
    return Math.floor(this.time * 1.6 + s.id * 0.71) % 2 === 0 ? 'idle0' : 'idle1';
  }

  private dustAcc = 0;
  private dustFromRunners(dt: number): void {
    this.dustAcc += dt;
    if (this.dustAcc < 0.12) return;
    this.dustAcc = 0;
    const b = this.battle;
    for (const u of b.world.units) {
      if (u.st === 'gone' || !this.visible(u)) continue;
      const t = b.typeOf(u);
      if (!t.mounted && t.cls !== 'ele' && t.cls !== 'chariot' && !u.order.run) continue;
      for (let i = 0; i < u.sol.length; i += t.mounted ? 2 : 6) {
        const s = b.soldier(u.sol[i]!);
        if (!s) continue;
        const sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        if (sp > (t.mounted ? 4 : 3.2)) this.fx.dust(s.x - s.vx * 0.1, s.y - s.vy * 0.1, 1, t.mounted);
      }
    }
  }

  private drawOverlays(): void {
    const o = this.overlays;
    const b = this.battle;
    o.begin();
    const gold = new THREE.Color(1.0, 0.85, 0.35);
    const white = new THREE.Color(0.95, 0.95, 0.9);
    const red = new THREE.Color(1, 0.3, 0.25);
    const ghostC = new THREE.Color(0.55, 0.85, 1.0);
    for (const u of b.world.units) {
      if (u.st === 'gone') continue;
      const sel = this.selected.has(u.id);
      const hov = this.hover === u.id;
      if (!sel && !hov) continue;
      const t = b.typeOf(u);
      const n = Math.max(1, u.sol.length - 1);
      const [sx, sy] = spacing(t, u.form);
      const frontage = Math.max(0, Math.min(u.width, n) - 1) * sx;
      const depth = (Math.ceil(n / Math.max(1, u.width)) - 1) * sy;
      const c = this.mine(u) ? (sel ? gold : white) : red;
      o.formation(u.ax, u.ay, u.dx, u.dy, frontage, depth, c);
      if (sel && u.order.k === 'move') {
        o.arrow(u.ax, u.ay, u.order.x, u.order.y, white);
      } else if (sel && u.order.k === 'attack') {
        const tu = b.unit(u.order.target);
        if (tu) {
          const tc = b.center(tu);
          o.arrow(u.ax, u.ay, tc.x, tc.y, red);
        }
      }
    }
    for (const g of this.ghosts) o.formation(g.ax, g.ay, g.dx, g.dy, g.frontage, g.depth, ghostC, true);
    // Capture points.
    for (const ob of b.world.objectives) {
      if (ob.kind !== 'point') continue;
      const tc = ob.owner < 0 ? white : new THREE.Color(hex(TEAM_COLORS[sideColor(b, ob.owner)]!.primary));
      o.circle(ob.x, ob.y, ob.r, tc, 40);
      o.circle(ob.x, ob.y, ob.r * Math.abs(ob.prog) / 100, tc, 24);
    }
    // Pings fade out over three seconds.
    this.pings = this.pings.filter((p) => this.time - p.t < 3);
    for (const p of this.pings) {
      const age = this.time - p.t;
      o.circle(p.x, p.y, 2 + (age % 1) * 6, new THREE.Color(p.color), 20);
    }
    if (this.possessed) {
      const s = b.soldier(this.possessed);
      if (s) o.circle(s.x, s.y, 1.4, gold, 16);
    }
    o.end();
  }

  addPing(x: number, y: number, color: string): void {
    this.pings.push({ x, y, t: this.time, color });
  }

  private drawBanners(): void {
    const b = this.battle;
    const list: BannerInfo[] = [];
    const zoomFar = this.rig.zoomT() > 0.12;
    for (const u of b.world.units) {
      if (u.st === 'gone' || !this.visible(u)) continue;
      const mine = this.mine(u);
      if (!zoomFar && !mine && !this.selected.has(u.id) && this.hover !== u.id) continue;
      const c = b.center(u);
      if (!c.n) continue;
      const t = b.typeOf(u);
      const p = this.screenOf(c.x, c.y, t.mounted || t.cls === 'ele' ? 6 : 4.2);
      if (!p || p.x < -40 || p.y < -40 || p.x > this.w + 40 || p.y > this.h + 40) continue;
      const army = b.army(u.army)!;
      const tc = TEAM_COLORS[army.pal]!;
      list.push({
        id: u.id,
        x: p.x,
        y: p.y,
        color: hex(tc.primary),
        trim: hex(tc.secondary),
        symbol: SYMBOL[t.cls] ?? '⚔',
        strength: u.sol.length / Math.max(1, u.max),
        morale: u.st === 'shattered' ? 'shattered' : u.st === 'routing' ? 'routing' : u.morale < 20 ? 'wavering' : 'steady',
        mine,
        selected: this.selected.has(u.id),
        group: this.groups.has(u.id) ? String(this.groups.get(u.id)) : '',
        led: u.possBy !== 0,
      });
    }
    this.banners.update(list);
  }

  /** Writes fog-of-war visibility (0..255 per 4 m cell) into the terrain shader. */
  setFog(data: Uint8Array | null): void {
    this.terrain.uniforms.uFogOn.value = data ? 1 : 0;
    if (data) {
      this.terrain.fogData.set(data);
      this.terrain.uniforms.uFogTex.value.needsUpdate = true;
    }
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.post?.dispose();
    this.terrain.dispose();
    this.soldierBatch.dispose();
    this.corpseBatch.dispose();
    this.propBatch.dispose();
    this.fx.dispose();
    this.banners.dispose();
    this.shared.atlas.dispose();
    this.shared.palette.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function sideColor(b: Battle, side: number): number {
  return b.world.armies.find((a) => a.side === side)?.pal ?? 0;
}

function makeSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1500, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {},
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'varying vec3 vDir; void main(){ float h = clamp(vDir.y, -0.1, 1.0); vec3 zen = vec3(0.24,0.45,0.75); vec3 hor = vec3(0.92,0.86,0.72); vec3 c = mix(hor, zen, smoothstep(0.0, 0.55, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}
