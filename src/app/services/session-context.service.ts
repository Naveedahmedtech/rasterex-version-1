import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
}



@Injectable({
  providedIn: 'root',
})





export class SessionContextService {
  private userIdSubject = new BehaviorSubject<string | null>(null);
  private projectIdSubject = new BehaviorSubject<string | null>(null);
  private usernameSubject = new BehaviorSubject<string | null>(null);

  // handle tooltip on mouse for issue creation
  show = new BehaviorSubject(false);
  position = new BehaviorSubject<{ x: number, y: number }>({ x: 0, y: 0 });

  private tooltipState = new BehaviorSubject<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    text: ''
  });

  tooltip$ = this.tooltipState.asObservable();

  // Exposed as observables
  userId$: Observable<string | null> = this.userIdSubject.asObservable();
  projectId$: Observable<string | null> = this.projectIdSubject.asObservable();
  username$: Observable<string | null> = this.usernameSubject.asObservable();

  constructor() {}

  setUserContext(userId: string, projectId: string, username: string): void {
    this.userIdSubject.next(userId);
    this.projectIdSubject.next(projectId);
    this.usernameSubject.next(username);
  }

  clear(): void {
    this.userIdSubject.next(null);
    this.projectIdSubject.next(null);
    this.usernameSubject.next(null);
  }

  // Synchronous access (optional)
  get userId(): string | null {
    return this.userIdSubject.value;
  }

  get projectId(): string | null {
    return this.projectIdSubject.value;
  }

  get username(): string | null {
    return this.usernameSubject.value;
  }


  showTooltip(x: number, y: number, text: string) {
    this.tooltipState.next({ visible: true, x, y, text });
  }

  updateTooltipPosition(x: number, y: number) {
    const current = this.tooltipState.getValue();
    if (current.visible) {
      this.tooltipState.next({ ...current, x, y });
    }
  }

  hideTooltip() {
    this.tooltipState.next({ ...this.tooltipState.getValue(), visible: false });
  }
}
