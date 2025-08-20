import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  AnnotationToolsService,
  DrawnSignature,
} from '../annotation-tools.service';

type Point = { x: number; y: number; t: number; p?: number };

@Component({
  selector: 'rx-signature-modal',
  templateUrl: './signature-modal.component.html',
  styleUrls: ['./signature-modal.component.scss'],
})
export class SignatureModalComponent implements OnInit, OnDestroy {
  @ViewChild('pad', { static: true }) padRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('padWrap', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;

  // UI state
  color = '#000000';
  stroke = 2; // logical px (scaled by DPR internally)
  isDrawing = false;

  // drawing state
  private dpr = Math.max(1, window.devicePixelRatio || 1);
  private ctx!: CanvasRenderingContext2D;
  private strokes: Point[][] = []; // list of strokes
  private current: Point[] = []; // points of the active stroke

  constructor(private tools: AnnotationToolsService) {}

  ngOnInit(): void {
    this.setupCanvas();
    document.body.style.overflow = 'hidden'; // prevent background scroll on mobile while modal is open
  }

  ngOnDestroy(): void {
    document.body.style.overflow = ''; // restore
  }

  // Make template-friendly (avoid accessing private fields directly)
  public get hasAnyStrokes(): boolean {
    return this.strokes.length > 0 || this.current.length > 0;
  }

  // Close on Esc
  @HostListener('document:keydown.escape')
  onEsc() {
    this.cancel();
  }

  // Resize canvas if modal resizes / orientation changes
  @HostListener('window:resize')
  onResize() {
    this.setupCanvas(true);
  }

  private setupCanvas(fromResize = false) {
    const canvas = this.padRef.nativeElement;
    const wrap = this.wrapRef.nativeElement;

    const rect = wrap.getBoundingClientRect();
    const w = Math.max(300, Math.floor(rect.width));
    const h = Math.max(160, Math.floor(rect.height - 72)); // leave room for toolbar

    canvas.width = Math.floor(w * this.dpr);
    canvas.height = Math.floor(h * this.dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.imageSmoothingEnabled = true;
    this.redraw(); // keep existing content after resize
  }

  // ===== Pointer handlers (mouse/touch/pen) =====
  onDown(ev: PointerEvent) {
    ev.preventDefault();
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
    this.isDrawing = true;
    this.current = [];
    this.addPoint(ev, true);
  }

  onMove(ev: PointerEvent) {
    if (!this.isDrawing) return;
    ev.preventDefault();
    this.addPoint(ev, false);
    this.redraw();
  }

  onUp(ev: PointerEvent) {
    if (!this.isDrawing) return;
    ev.preventDefault();
    this.isDrawing = false;
    if (this.current.length > 1) {
      this.strokes.push(this.current);
    }
    this.current = [];
    this.redraw();
  }

  private addPoint(ev: PointerEvent, start: boolean) {
    const canvas = this.padRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * this.dpr;
    const y = (ev.clientY - rect.top) * this.dpr;
    const t = performance.now();
    const p = ev.pressure && ev.pressure > 0 ? ev.pressure : 1; // simple pressure usage
    const pt: Point = { x, y, t, p };
    this.current.push(pt);
    if (start) return;
  }

  // Basic redraw of all strokes + current
  private redraw() {
    const c = this.ctx;
    const canvas = this.padRef.nativeElement;
    c.clearRect(0, 0, canvas.width, canvas.height);

    c.strokeStyle = this.color;
    const base = this.stroke * this.dpr;

    const drawStroke = (pts: Point[]) => {
      if (pts.length < 2) return;
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        // Simple line; can be replaced by smoothing if needed
        c.lineTo(pts[i].x, pts[i].y);
      }
      // pressure-aware width (average this stroke)
      const avgP = pts.reduce((s, p) => s + (p.p || 1), 0) / pts.length;
      c.lineWidth = Math.max(1, base * avgP);
      c.stroke();
    };

    this.strokes.forEach(drawStroke);
    if (this.current.length > 1) drawStroke(this.current);
  }

  // ===== Toolbar actions =====
  undo() {
    if (this.current.length > 0) {
      this.current = [];
    } else if (this.strokes.length > 0) {
      this.strokes.pop();
    }
    this.redraw();
  }

  clear() {
    this.strokes = [];
    this.current = [];
    this.redraw();
  }

  cancel() {
    this.tools.closeSignatureModal();
  }

  done() {
    if (this.current.length > 1) {
      this.strokes.push(this.current);
      this.current = [];
    }
    if (this.strokes.length === 0) {
      this.tools.closeSignatureModal();
      return;
    }

    const { path, bbox } = this.exportSvgPath();
    const payload: DrawnSignature = {
      kind: 'drawn',
      svgPath: path,
      bbox,
      style: { color: this.color, stroke: this.stroke },
    };

    // tell service to start placement
    this.tools.beginPlacement(payload);

    // close the modal
    this.tools.closeSignatureModal();
  }

  private exportSvgPath(): { path: string; bbox: { w: number; h: number } } {
    // Flatten all points to compute bounds
    const allPts = this.strokes.flat();
    const minX = Math.min(...allPts.map((p) => p.x));
    const minY = Math.min(...allPts.map((p) => p.y));
    const maxX = Math.max(...allPts.map((p) => p.x));
    const maxY = Math.max(...allPts.map((p) => p.y));
    const w = Math.max(1, Math.round(maxX - minX));
    const h = Math.max(1, Math.round(maxY - minY));

    // Build path with coordinates translated to (0,0) top-left of bbox
    const segs: string[] = [];
    const toSeg = (pts: Point[]) => {
      if (pts.length < 2) return;
      segs.push(
        `M ${Math.round(pts[0].x - minX)} ${Math.round(pts[0].y - minY)}`
      );
      for (let i = 1; i < pts.length; i++) {
        segs.push(
          `L ${Math.round(pts[i].x - minX)} ${Math.round(pts[i].y - minY)}`
        );
      }
    };
    this.strokes.forEach(toSeg);

    return { path: segs.join(' '), bbox: { w, h } };
  }
}
