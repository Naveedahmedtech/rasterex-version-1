import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'rx-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss']
})
export class PanelComponent {
  @Input() title: string;
  @Input() maxHeight: number = Number.MAX_SAFE_INTEGER;
  @Output() onClose: EventEmitter<void> = new EventEmitter<void>();

  onCloseClick(): void {
    this.onClose.emit();
  }

}
