import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'rx-signature-modal',
  templateUrl: './signature-modal.component.html',
  styleUrls: ['./signature-modal.component.scss']
})
export class SignatureModalComponent {
  @Input() title: string;
  @Input() maxHeight: number = Number.MAX_SAFE_INTEGER;
  @Output() onClose: EventEmitter<void> = new EventEmitter<void>();

  onCloseClick(): void {
    this.onClose.emit();
  }
}
