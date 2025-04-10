// global-tooltip.component.ts
import {SessionContextService} from "./services/session-context.service";
import {Component} from "@angular/core";

@Component({
  selector: 'app-global-tooltip',
  template: `
    <div class="tooltip" *ngIf="tooltip.visible"
         [ngStyle]="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      {{ tooltip.text }}
    </div>
  `,
  styles: [`
    .tooltip {
      position: fixed;
      background: rgba(0, 0, 0, 0.75);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      pointer-events: none;
      transform: translate(-50%, -100%);
      font-size: 12px;
      z-index: 1000;
    }
  `]
})
export class GlobalTooltipComponent {
  tooltip: any = { visible: false, x: 0, y: 0, text: '' };

  constructor(private sessionContext: SessionContextService) {
    this.sessionContext.tooltip$.subscribe(state => this.tooltip = state);
  }
}
