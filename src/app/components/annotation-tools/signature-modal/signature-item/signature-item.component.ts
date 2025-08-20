import { Component, EventEmitter, Input, Output } from '@angular/core';


@Component({
  selector: 'rx-signature-item',
  templateUrl: './signature-item.component.html',
  styleUrls: ['./signature-item.component.scss']
})
export class SignatureItemComponent {
  // @Input({ required: true }) sig!: SignatureModel;
  // @Output() removed = new EventEmitter<string>();

  // aspectRatio(): number {
  //   return this.sig.width / this.sig.height;
  // }

  // onMoved(e: { id: string; x: number; y: number }) {
  //   // Update store outside for consistency, but you can also emit upward
  // }

  // onSized(e: { id: string; width: number; height: number }) {
  //   // same as onMoved (up to you where to persist)
  // }
}
