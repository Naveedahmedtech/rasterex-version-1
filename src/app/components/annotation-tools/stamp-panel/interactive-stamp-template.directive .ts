import { Directive, Input, HostListener, ElementRef } from '@angular/core';
import { RXCore } from 'src/rxcore';

@Directive({
  selector: '[interactiveStampTemplate]'
})
export class InteractiveStampTemplateDirective {
  @Input() interactiveStampTemplate: any;

  private startX = 0;
  private startY = 0;
  private dragging = false;

  constructor(private el: ElementRef) {
    // enable native drag on desktop
    this.el.nativeElement.setAttribute('draggable', 'true');
  }

  // =====================
  // Desktop (native drag)
  // =====================
  @HostListener('dragstart', ['$event'])
  onDragStart(event: DragEvent): void {
    if (!event.dataTransfer) return;
    RXCore.markupinteractiveStamp(true);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('Text', JSON.stringify(this.interactiveStampTemplate));
  }

  @HostListener('dragend')
  onDragEnd(): void {
    RXCore.markupinteractiveStamp(false);
  }

  // =====================
  // Mobile (simulate drag)
  // =====================
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.dragging = true;

    RXCore.markupinteractiveStamp(true);

    // fire fake dragstart
    this.dispatchDragEvent('dragstart', touch.clientX, touch.clientY);
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.dragging) return;
    const touch = event.touches[0];
    this.dispatchDragEvent('dragover', touch.clientX, touch.clientY);
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.dragging) return;
    this.dragging = false;

    RXCore.markupinteractiveStamp(false);

    const touch = event.changedTouches[0];
    this.dispatchDragEvent('drop', touch.clientX, touch.clientY);
    this.dispatchDragEvent('dragend', touch.clientX, touch.clientY);
  }

  private dispatchDragEvent(type: string, x: number, y: number): void {
    const event = new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y
    });

    // @ts-ignore: add fake DataTransfer
    event.dataTransfer = {
      effectAllowed: 'move',
      setData: (format: string, data: string) => {
        (event as any)._data = data;
      },
      getData: (format: string) => {
        return (event as any)._data;
      }
    };

    this.el.nativeElement.dispatchEvent(event);
  }
}
