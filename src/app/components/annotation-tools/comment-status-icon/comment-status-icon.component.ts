import { Component, Input } from '@angular/core';
import { COMMENT_STATUS } from 'src/rxcore/constants';

@Component({
  selector: 'rx-comment-status-icon',
  templateUrl: './comment-status-icon.component.html',
  styleUrls: ['./comment-status-icon.component.scss'],
})
export class CommentStatusIconComponent {
  statusType = COMMENT_STATUS;
  @Input() type: string;
}
