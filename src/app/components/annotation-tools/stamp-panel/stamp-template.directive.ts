import { Directive, Input, HostListener, ElementRef, Renderer2 } from '@angular/core';
import { RXCore } from 'src/rxcore';
import { UserService } from '../../user/user.service';

@Directive({
  selector: '[stampTemplate]'
})
export class StampTemplateDirective {
  @Input() stampTemplate: any;

  private dragging = false;
  private ghostEl: HTMLElement | null = null;
  private lastOverEl: Element | null = null;
  private dt: any | null = null;
  private removeGlobalGuards: (() => void)[] = [];

  constructor(
    private userService: UserService,
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {
    this.el.nativeElement.setAttribute('draggable', 'true');   // desktop
    this.renderer.setStyle(this.el.nativeElement, 'touch-action', 'none'); // mobile
  }

  // ================= Desktop =================
  @HostListener('dragstart', ['$event'])
  onDragStart(event: DragEvent): void {
    if (!event.dataTransfer) return;
    const payload = this.prepareStampTemplate();

    RXCore.markupImageStamp(true);
    const json = JSON.stringify(payload);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('Text', json);
    event.dataTransfer.setData('text/plain', json);
    event.dataTransfer.setData('application/json', json);
  }

  @HostListener('dragend', ['$event'])
  onDragEnd(ev: DragEvent): void {
    RXCore.markupImageStamp(false);
    // Ensure immediate visibility on desktop too (some viewers)
    const target = (ev.target as HTMLElement) ?? this.el.nativeElement;
    this.forceViewerRepaint(target);
  }

  // ================= Mobile (polyfill) =================
  @HostListener('touchstart', ['$event'])
  onTouchStart(ev: TouchEvent): void {
    if (ev.touches.length !== 1) return;
    ev.preventDefault();

    const touch = ev.touches[0];
    const payload = this.prepareStampTemplate();

    this.dragging = true;
    RXCore.markupImageStamp(true);

    // shared DataTransfer polyfill
    this.dt = this.createDataTransferPolyfill();
    const json = JSON.stringify(payload);
    this.dt.setData('Text', json);
    this.dt.setData('text/plain', json);
    this.dt.setData('application/json', json);

    // ghost clone
    this.ghostEl = this.makeGhost(this.el.nativeElement);
    this.moveGhost(touch.clientX, touch.clientY);

    // global guard: make drop accepted (like desktop)
    const onDocDragOver = (e: Event) => {
      try {
        (e as DragEvent).preventDefault();
        if ((e as DragEvent).dataTransfer) (e as DragEvent).dataTransfer!.dropEffect = 'copy';
      } catch {}
    };
    document.addEventListener('dragover', onDocDragOver, { capture: true, passive: false });
    this.removeGlobalGuards.push(() => document.removeEventListener('dragover', onDocDragOver, { capture: true } as any));

    // fire dragstart on source
    this.dispatchDragLike(this.el.nativeElement, 'dragstart', touch.clientX, touch.clientY);

    // initial enter/over under finger
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target) {
      this.lastOverEl = target;
      this.dispatchDragLike(target as HTMLElement, 'dragenter', touch.clientX, touch.clientY);
      this.dispatchDragLike(target as HTMLElement, 'dragover',  touch.clientX, touch.clientY);
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(ev: TouchEvent): void {
    if (!this.dragging || !this.dt) return;
    ev.preventDefault();

    const touch = ev.touches[0];
    this.moveGhost(touch.clientX, touch.clientY);

    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;

    if (this.lastOverEl !== target) {
      if (this.lastOverEl) {
        this.dispatchDragLike(this.lastOverEl as HTMLElement, 'dragleave', touch.clientX, touch.clientY);
      }
      this.dispatchDragLike(target as HTMLElement, 'dragenter', touch.clientX, touch.clientY);
      this.lastOverEl = target;
    }
    this.dispatchDragLike(target as HTMLElement, 'dragover', touch.clientX, touch.clientY);
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(ev: TouchEvent): void {
    if (!this.dragging) return;
    ev.preventDefault();

    const touch = ev.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;

    if (dropTarget) {
      // real drop
      this.dispatchDragLike(dropTarget, 'drop', touch.clientX, touch.clientY);

      // finalize like desktop
      this.dispatchPointerLike(dropTarget, 'pointerdown', touch.clientX, touch.clientY);
      this.dispatchPointerLike(dropTarget, 'pointerup',   touch.clientX, touch.clientY);
      this.dispatchMouseLike(  dropTarget, 'mousedown',   touch.clientX, touch.clientY);
      this.dispatchMouseLike(  dropTarget, 'mouseup',     touch.clientX, touch.clientY);
      this.dispatchMouseLike(  dropTarget, 'click',       touch.clientX, touch.clientY);
    }

    // end on source
    this.dispatchDragLike(this.el.nativeElement, 'dragend', touch.clientX, touch.clientY);

    // cleanup
    this.dragging = false;
    RXCore.markupImageStamp(false);
    if (this.ghostEl) { this.ghostEl.remove(); this.ghostEl = null; }
    if (this.lastOverEl && dropTarget && this.lastOverEl !== dropTarget) {
      this.dispatchDragLike(this.lastOverEl as HTMLElement, 'dragleave', touch.clientX, touch.clientY);
    }
    this.lastOverEl = null;
    this.removeGlobalGuards.forEach(fn => { try { fn(); } catch {} });
    this.removeGlobalGuards = [];

    // >>> Strong “move the file” nudge so the new signature is visible immediately
    if (dropTarget) {
      requestAnimationFrame(() => {
        this.panToReveal(dropTarget);        // scroll-by pulse
        this.forceViewerRepaint(dropTarget); // compositor + canvas nudges
        this.wheelTick(dropTarget, touch.clientX, touch.clientY); // extra hint for some engines
      });
    }

    this.dt = null;
  }

  @HostListener('touchcancel')
  onTouchCancel(): void {
    this.dragging = false;
    RXCore.markupImageStamp(false);
    if (this.ghostEl) { this.ghostEl.remove(); this.ghostEl = null; }
    this.lastOverEl = null;
    this.removeGlobalGuards.forEach(fn => { try { fn(); } catch {} });
    this.removeGlobalGuards = [];
    this.dt = null;
  }

  // ================= Helpers =================
  private prepareStampTemplate() {
    const newStampTemplate = { ...this.stampTemplate };
    if (this.stampTemplate?.type === 'image/svg+xml') {
      let svg = this.replaceDateTimeInSvg(this.convertBlobUrlToSvgString(this.stampTemplate.src));
      svg = this.replaceUsernameInSvg(svg);
      newStampTemplate.src = this.svgToBlobUrl(svg);
      newStampTemplate.svgContent = svg;
    }
    return newStampTemplate;
  }

  private svgToBlobUrl(svgContent: string): string {
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    return URL.createObjectURL(svgBlob);
  }

  private convertBlobUrlToSvgString(blobUrl: string): string {
    let s = '';
    const xhr = new XMLHttpRequest();
    xhr.open('GET', blobUrl, false);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) s = xhr.responseText;
    };
    xhr.send();
    return s;
  }

  private replaceDateTimeInSvg(svg: string): string {
    const d = new Date();
    const currentDate = d.toLocaleDateString();
    const currentTime = d.toLocaleTimeString();
    const formats = [
      /(\d{4}\/\d{1,2}\/\d{1,2})/,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{1,2}\.\d{1,2}\.\d{4})/,
    ];
    for (const f of formats) {
      if (f.test(svg)) { svg = svg.replace(f, currentDate); break; }
    }
    return svg.replace(/(\d{1,2}:\d{2}:\d{2}( )?(AM|PM)?)/, currentTime);
  }

  private replaceUsernameInSvg(svg: string): string {
    const user = this.userService.getCurrentUser?.();
    if (!user || !user.displayName) return svg;
    return svg.replace(/Demo/, user.displayName);
  }

  // --- DnD synth events ---
  private createDataTransferPolyfill() {
    const store = new Map<string, string>();
    const poly: any = {
      dropEffect: 'copy',
      effectAllowed: 'all',
      files: [],
      items: {
        add: (data: string, type: string) => { store.set(type, data); },
        clear: () => store.clear(),
        get length() { return store.size; }
      },
      get types() { return Array.from(store.keys()); },
      setData: (type: string, data: string) => { store.set(type, data); },
      getData: (type: string) => store.get(type) ?? '',
      clearData: (type?: string) => { type ? store.delete(type) : store.clear(); },
      setDragImage: () => {}
    };
    return poly;
  }

  private createDragEvent(type: string, x: number, y: number): Event {
    let ev: any;
    try {
      ev = new DragEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
    } catch {
      ev = document.createEvent('CustomEvent'); ev.initCustomEvent(type, true, true, null);
      ev.clientX = x; ev.clientY = y;
    }
    if (this.dt) Object.defineProperty(ev, 'dataTransfer', { value: this.dt });
    return ev;
  }

  private dispatchDragLike(target: HTMLElement, type: string, x: number, y: number) {
    target.dispatchEvent(this.createDragEvent(type, x, y));
  }

  private dispatchMouseLike(target: HTMLElement, type: string, x: number, y: number) {
    let ev: MouseEvent;
    try { ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }); }
    catch {
      ev = document.createEvent('MouseEvent');
      (ev as any).initMouseEvent(type, true, true, window, 1, 0,0, x, y, false,false,false,false, 0, null);
    }
    target.dispatchEvent(ev);
  }

  private dispatchPointerLike(target: HTMLElement, type: string, x: number, y: number) {
    try {
      target.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, pointerType: 'touch'
      }));
    } catch {}
  }

  // --- Ghost clone ---
  private makeGhost(source: HTMLElement): HTMLElement {
    const g = source.cloneNode(true) as HTMLElement;
    const rect = source.getBoundingClientRect();
    g.style.position = 'fixed';
    g.style.pointerEvents = 'none';
    g.style.opacity = '0.7';
    g.style.zIndex = '9999';
    g.style.width  = `${rect.width}px`;
    g.style.height = `${rect.height}px`;
    document.body.appendChild(g);
    return g;
  }
  private moveGhost(x: number, y: number) {
    if (!this.ghostEl) return;
    const offset = 40;
    this.ghostEl.style.left = `${x - offset}px`;
    this.ghostEl.style.top  = `${y - offset}px`;
  }

  // ================= Make it VISIBLE immediately =================
  private panToReveal(fromEl: HTMLElement) {
    const sc = this.findScrollable(this.findViewerContainer(fromEl) || fromEl);
    if (!sc) return;
    // Stronger pulse than a 1px jiggle
    const by = Math.min(120, Math.max(48, Math.round(sc.clientHeight * 0.08))); // 8% viewport, 48–120px
    sc.scrollBy({ top: by,  left: 0, behavior: 'auto' });
    requestAnimationFrame(() => sc.scrollBy({ top: -by, left: 0, behavior: 'auto' }));
  }

  private wheelTick(target: HTMLElement, x?: number, y?: number) {
    try {
      const we = new WheelEvent('wheel', {
        deltaY: 1, bubbles: true, cancelable: true,
        clientX: x ?? 0, clientY: y ?? 0
      });
      target.dispatchEvent(we);
    } catch {}
  }

  private forceViewerRepaint(fromEl: HTMLElement) {
    try { (window as any)?.RXCore?.invalidate?.(); } catch {}
    try { (window as any)?.RXCore?.viewer?.invalidate?.(); } catch {}

    const container = this.findViewerContainer(fromEl) || fromEl;
    const canvas = this.findDeepCanvas(container);

    // compositor tick
    const prevWill = (container as HTMLElement).style.willChange;
    const prevTr   = (container as HTMLElement).style.transform;
    (container as HTMLElement).style.willChange = 'transform';
    (container as HTMLElement).style.transform  = 'translateZ(0.0001px)';
    // flush
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (container as HTMLElement).offsetHeight;
    (container as HTMLElement).style.transform  = prevTr;
    (container as HTMLElement).style.willChange = prevWill;

    // canvas nudge
    if (canvas) {
      const prevW = canvas.style.width;
      canvas.style.width = 'calc(100% + 0.2px)';
      // flush
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      canvas.offsetWidth;
      canvas.style.width = prevW;

      requestAnimationFrame(() => {
        try {
          const wAttr = (canvas.getAttribute('width') || '').trim();
          const w = wAttr ? parseInt(wAttr, 10) : (canvas as HTMLCanvasElement).width;
          if (w) {
            canvas.setAttribute('width', String(w + 1));
            requestAnimationFrame(() => canvas.setAttribute('width', String(w)));
          }
        } catch {}
      });
    }

    // resize tick (many viewers re-layout on this)
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  private findViewerContainer(el: HTMLElement): HTMLElement | null {
    let cur: HTMLElement | null = el;
    const rxLike = /(rx|rasterex|viewer|canvas|pdf|foxit)/i;
    while (cur && cur !== document.body) {
      const cls = cur.className?.toString() || '';
      const id  = cur.id || '';
      const cs  = getComputedStyle(cur);
      const ov  = `${cs.overflow}${cs.overflowY}${cs.overflowX}`.toLowerCase();
      if (rxLike.test(cls) || rxLike.test(id)) return cur;
      if (ov.includes('auto') || ov.includes('scroll')) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  private findScrollable(from: HTMLElement | null): HTMLElement | null {
    let cur: HTMLElement | null = from;
    while (cur && cur !== document.body) {
      const cs = getComputedStyle(cur);
      const ov = `${cs.overflow}${cs.overflowY}${cs.overflowX}`.toLowerCase();
      if (ov.includes('auto') || ov.includes('scroll')) return cur;
      cur = cur.parentElement;
    }
    return document.scrollingElement as HTMLElement | null;
  }

  private findDeepCanvas(root: HTMLElement): HTMLCanvasElement | null {
    const canvases = root.querySelectorAll('canvas');
    if (canvases && canvases.length) {
      return canvases[canvases.length - 1] as HTMLCanvasElement; // deepest
    }
    return null;
  }
}
