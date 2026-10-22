// Floating unit banners (DOM over the canvas): a pennant in the army's colours with the
// unit's class symbol, a strength bar, and morale shown by colour and flashing. The edge and
// bar say whose it is: gold for yours, blue for allies, red (and square-cut) for the enemy.

export interface BannerInfo {
  id: number;
  x: number;
  y: number;
  color: string;
  trim: string;
  symbol: string;
  strength: number;
  morale: 'steady' | 'wavering' | 'routing' | 'shattered';
  mine: boolean;
  rel: 'mine' | 'ally' | 'enemy';
  selected: boolean;
  group: string;
  led: boolean;
  /** A super unit: a gold-edged banner. */
  elite: boolean;
}

export class Banners {
  private els = new Map<number, HTMLDivElement>();
  readonly root: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'pl-banners';
    parent.appendChild(this.root);
  }

  update(list: BannerInfo[]): void {
    const live = new Set<number>();
    for (const b of list) {
      live.add(b.id);
      let el = this.els.get(b.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'pl-banner';
        el.innerHTML = '<div class="pl-flag"><span class="pl-sym"></span><span class="pl-grp"></span></div><div class="pl-bar"><i></i></div>';
        this.root.appendChild(el);
        this.els.set(b.id, el);
      }
      el.style.transform = `translate(${Math.round(b.x)}px, ${Math.round(b.y)}px)`;
      const flag = el.firstElementChild as HTMLDivElement;
      flag.style.background = b.color;
      (flag.firstElementChild as HTMLSpanElement).textContent = b.symbol;
      (flag.lastElementChild as HTMLSpanElement).textContent = b.group;
      const bar = (el.lastElementChild as HTMLDivElement).firstElementChild as HTMLElement;
      bar.style.width = `${Math.round(b.strength * 100)}%`;
      el.dataset.morale = b.morale;
      el.classList.toggle('mine', b.mine);
      el.classList.toggle('ally', b.rel === 'ally');
      el.classList.toggle('enemy', b.rel === 'enemy');
      el.classList.toggle('sel', b.selected);
      el.classList.toggle('led', b.led);
      el.classList.toggle('elite', b.elite);
    }
    for (const [id, el] of this.els) {
      if (!live.has(id)) {
        el.remove();
        this.els.delete(id);
      }
    }
  }

  dispose(): void {
    this.root.remove();
    this.els.clear();
  }
}
