import { Directive, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, Renderer2 } from '@angular/core';

@Directive({
  selector: '[rxResizable]'
})
export class RxResizableDirective implements OnInit {
  @Input() rxResizable: { id: string; aspectRatio?: number } | null = null;
  @Output() sizeChange = new EventEmitter<{ id: string; width: number; height: number }>();

  private resizing = false;
  private startX = 0;
  private startY = 0;
  private startW = 0;
  private startH = 0;
  private handle!: HTMLElement;

  constructor(private el: ElementRef<HTMLElement>, private r: Renderer2) {}

  ngOnInit() {
    this.r.setStyle(this.el.nativeElement, 'position', 'absolute');
    this.r.setStyle(this.el.nativeElement, 'touch-action', 'none');

    this.handle = this.r.createElement('div');
    this.r.addClass(this.handle, 'resize-handle');
    this.r.setStyle(this.handle, 'position', 'absolute');
    this.r.setStyle(this.handle, 'right', '-8px');
    this.r.setStyle(this.handle, 'bottom', '-8px');
    this.r.setStyle(this.handle, 'width', '16px');
    this.r.setStyle(this.handle, 'height', '16px');
    this.r.setStyle(this.handle, 'borderRadius', '50%');
    this.r.setStyle(this.handle, 'border', '2px solid #0c7cec');
    this.r.setStyle(this.handle, 'background', '#fff');
    this.r.setStyle(this.handle, 'boxShadow', '0 1px 3px rgba(0,0,0,.2)');
    this.r.setStyle(this.handle, 'touch-action', 'none');
    this.r.setStyle(this.handle, 'cursor', 'nwse-resize');
    this.r.appendChild(this.el.nativeElement, this.handle);

    this.handle.addEventListener('pointerdown', this.onHandleDown);
  }

  private onHandleDown = (ev: PointerEvent) => {
    ev.preventDefault();
    this.resizing = true;
    this.el.nativeElement.setPointerCapture(ev.pointerId);
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.startW = this.el.nativeElement.offsetWidth;
    this.startH = this.el.nativeElement.offsetHeight;
  };

  @HostListener('pointermove', ['$event'])
  onPointerMove(ev: PointerEvent) {
    if (!this.resizing) return;
    ev.preventDefault();
    const dx = ev.clientX - this.startX;
    const dy = ev.clientY - this.startY;

    let newW = this.startW + dx;
    let newH = this.startH + dy;

    const ratio = this.rxResizable?.aspectRatio;
    if (ratio && ratio > 0) {
      // lock aspect ratio
      if (Math.abs(dx) > Math.abs(dy)) {
        newH = newW / ratio;
      } else {
        newW = newH * ratio;
      }
    }

    newW = Math.max(30, newW);
    newH = Math.max(20, newH);

    this.el.nativeElement.style.width = `${newW}px`;
    this.el.nativeElement.style.height = `${newH}px`;
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(ev: PointerEvent) {
    if (!this.resizing) return;
    this.resizing = false;
    this.el.nativeElement.releasePointerCapture(ev.pointerId);
    const width = this.el.nativeElement.offsetWidth;
    const height = this.el.nativeElement.offsetHeight;
    if (this.rxResizable) this.sizeChange.emit({ id: this.rxResizable.id, width, height });
  }

  @HostListener('pointercancel')
  onCancel() { this.resizing = false; }
}
