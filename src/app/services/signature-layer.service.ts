// import { Injectable } from '@angular/core';
// import { SignatureDragService } from './drag-drop.service';

// export interface SignatureInstanceOptions {
//   x?: number;     // px inside overlay
//   y?: number;
//   width?: number; // px (height keeps aspect)
// }

// @Injectable({ providedIn: 'root' })
// export class SignatureLayerService {
//   private host?: HTMLElement;

//   constructor(private drag: SignatureDragService) {}

//   setHost(el: HTMLElement) {
//     this.host = el;
//     this.ensureHostStyles();
//   }

//   private ensureHostStyles() {
//     if (!this.host) return;
//     const s = this.host.style;
//     s.position = 'absolute';
//     s.inset = '0';
//     s.pointerEvents = 'none'; // let Foxit receive interactions unless on a signature
//     s.zIndex = '9999';        // keep it above iframe
//   }

//   addSignature(dataUrl: string, opt: SignatureInstanceOptions = {}) {
//     if (!this.host) throw new Error('SignatureLayerService: host overlay not set');

//     // wrapper
//     const wrap = document.createElement('div');
//     wrap.className = 'sig-instance';
//     wrap.style.position = 'absolute';
//     wrap.style.pointerEvents = 'auto'; // enable interactions on the element

//     // image
//     const img = document.createElement('img');
//     img.draggable = false;
//     img.alt = 'Signature';
//     img.src = dataUrl;
//     img.style.display = 'block';
//     img.style.width = '100%';
//     img.style.height = '100%';
//     img.style.objectFit = 'contain';

//     wrap.appendChild(img);
//     this.host.appendChild(wrap);

//     img.onload = () => {
//       const natW = img.naturalWidth || 300;
//       const natH = img.naturalHeight || 100;
//       const aspect = natW / natH;

//       const width  = opt.width ?? Math.min(300, this.host!.clientWidth - 20);
//       const height = Math.round(width / aspect);

//       const x = Math.min(opt.x ?? 20, Math.max(0, this.host!.clientWidth  - width));
//       const y = Math.min(opt.y ?? 20, Math.max(0, this.host!.clientHeight - height));

//       wrap.style.left = `${x}px`;
//       wrap.style.top  = `${y}px`;
//       wrap.style.width  = `${width}px`;
//       wrap.style.height = `${height}px`;
//     };

//     // activate drag + resize bounded to host
//     const destroy = this.drag.makeDraggableAndResizable(wrap, {
//       bounds: this.host,
//       keepRatio: true,
//       minW: 40,
//       minH: 20,
//     });

//     // optional: return a tiny API for this instance
//     return {
//       element: wrap,
//       remove: () => { destroy(); wrap.remove(); },
//       getRect: () => wrap.getBoundingClientRect(),
//     };
//   }
// }
