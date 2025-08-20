import { Directive, ElementRef, EventEmitter, HostListener, Input, NgZone, OnInit, Output, Renderer2 } from '@angular/core';

@Directive({
  selector: '[rxDraggable]'
})
export class RxDraggableDirective implements OnInit {
  @Input() rxDraggable: { id: string } | null = null;
  @Output() positionChange = new EventEmitter<{ id: string; x: number; y: number }>();

  private dragging = false;
  private startX = 0;
  private startY = 0;
  private originLeft = 0;
  private originTop = 0;

  constructor(private el: ElementRef<HTMLElement>, private r: Renderer2, private zone: NgZone) {}

  ngOnInit() {
    this.r.setStyle(this.el.nativeElement, 'touch-action', 'none');
    this.r.setStyle(this.el.nativeElement, 'position', 'absolute');
    this.r.setStyle(this.el.nativeElement, 'cursor', 'grab');
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(ev: PointerEvent) {
    if ((ev.target as HTMLElement).classList.contains('resize-handle')) return;
    ev.preventDefault();
    const rect = this.el.nativeElement.getBoundingClientRect();
    this.dragging = true;
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.originLeft = this.el.nativeElement.offsetLeft;
    this.originTop = this.el.nativeElement.offsetTop;
    this.el.nativeElement.setPointerCapture(ev.pointerId);
    this.r.setStyle(this.el.nativeElement, 'cursor', 'grabbing');
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(ev: PointerEvent) {
    if (!this.dragging) return;
    ev.preventDefault();
    const dx = ev.clientX - this.startX;
    const dy = ev.clientY - this.startY;
    const x = this.originLeft + dx;
    const y = this.originTop + dy;
    this.r.setStyle(this.el.nativeElement, 'left', `${x}px`);
    this.r.setStyle(this.el.nativeElement, 'top', `${y}px`);
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(ev: PointerEvent) {
    if (!this.dragging) return;
    this.dragging = false;
    this.el.nativeElement.releasePointerCapture(ev.pointerId);
    this.r.setStyle(this.el.nativeElement, 'cursor', 'grab');
    const x = this.el.nativeElement.offsetLeft;
    const y = this.el.nativeElement.offsetTop;
    if (this.rxDraggable) this.positionChange.emit({ id: this.rxDraggable.id, x, y });
  }

  @HostListener('pointercancel')
  onCancel() { this.dragging = false; }
}
