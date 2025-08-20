import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DragDropService {
  makeDraggable(el: HTMLElement, bounds: HTMLElement) {
    let startX = 0, startY = 0, originLeft = 0, originTop = 0;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
      el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      const brect = bounds.getBoundingClientRect();
      originLeft = rect.left - brect.left; originTop = rect.top - brect.top;
      startX = e.clientX; startY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!el.classList.contains('dragging')) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      const b = bounds.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      let left = originLeft + dx, top = originTop + dy;
      left = Math.max(0, Math.min(left, b.width - r.width));
      top  = Math.max(0, Math.min(top,  b.height - r.height));
      el.style.left = left + 'px';
      el.style.top  = top  + 'px';
      el.style.transform = ''; // reset center translate if any
    };
    const onUp = (e: PointerEvent) => {
      el.classList.remove('dragging');
      try { el.releasePointerCapture(e.pointerId); } catch {}
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  }

  makeResizable(el: HTMLElement, bounds: HTMLElement, min = 40, max = 2000) {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    el.appendChild(handle);

    let startX = 0, startY = 0, startW = 0, startH = 0;
    const onDown = (e: PointerEvent) => {
      e.stopPropagation();
      el.classList.add('resizing');
      handle.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      startW = r.width; startH = r.height;
      startX = e.clientX; startY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!el.classList.contains('resizing')) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let w = Math.max(min, Math.min(max, startW + dx));
      let h = Math.max(min, Math.min(max, startH + dy));
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      // keep within bounds
      const b = bounds.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (r.right > b.right) el.style.left = (b.width - r.width) + 'px';
      if (r.bottom > b.bottom) el.style.top = (b.height - r.height) + 'px';
    };
    const onUp = (e: PointerEvent) => {
      el.classList.remove('resizing');
      try { handle.releasePointerCapture(e.pointerId); } catch {}
    };

    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }
}
