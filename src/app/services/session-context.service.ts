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
  private orderIdSubject = new BehaviorSubject<string | null>(null);
  private modeSubject = new BehaviorSubject<'annotation' | 'signature' | null>(null);
  private isSignedSubject = new BehaviorSubject<boolean>(false);
  private isFileReadySubject = new BehaviorSubject<boolean>(false); // ✅ NEW

  // Tooltip state
  show = new BehaviorSubject(false);
  position = new BehaviorSubject<{ x: number, y: number }>({ x: 0, y: 0 });
  private tooltipState = new BehaviorSubject<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    text: ''
  });
  tooltip$ = this.tooltipState.asObservable();

  // Observables
  userId$: Observable<string | null> = this.userIdSubject.asObservable();
  projectId$: Observable<string | null> = this.projectIdSubject.asObservable();
  username$: Observable<string | null> = this.usernameSubject.asObservable();
  orderId$: Observable<string | null> = this.orderIdSubject.asObservable();
  mode$: Observable<'annotation' | 'signature' | null> = this.modeSubject.asObservable();
  isSigned$: Observable<boolean> = this.isSignedSubject.asObservable();
  isFileReady$: Observable<boolean> = this.isFileReadySubject.asObservable(); // ✅

  constructor() {}

  setUserContext(
    userId: string,
    projectId: string,
    username: string,
    orderId?: string,
    mode?: 'annotation' | 'signature',
    isSigned: boolean = false,
    isFileReady: boolean = false // ✅ optional param
  ): void {
    this.userIdSubject.next(userId);
    this.projectIdSubject.next(projectId);
    this.usernameSubject.next(username);
    if (orderId) this.orderIdSubject.next(orderId);
    if (mode) this.modeSubject.next(mode);
    this.isSignedSubject.next(isSigned);
    this.isFileReadySubject.next(isFileReady);
  }

  clear(): void {
    this.userIdSubject.next(null);
    this.projectIdSubject.next(null);
    this.usernameSubject.next(null);
    this.orderIdSubject.next(null);
    this.modeSubject.next(null);
    this.isSignedSubject.next(false);
    this.isFileReadySubject.next(false); // ✅ reset
  }

  // Synchronous accessors
  get userId(): string | null {
    return this.userIdSubject.value;
  }

  get projectId(): string | null {
    return this.projectIdSubject.value;
  }

  get username(): string | null {
    return this.usernameSubject.value;
  }

  get orderId(): string | null {
    return this.orderIdSubject.value;
  }

  get mode(): 'annotation' | 'signature' | null {
    return this.modeSubject.value;
  }

  get isSigned(): boolean {
    return this.isSignedSubject.value;
  }

  get isFileReady(): boolean {
    return this.isFileReadySubject.value;
  }

  // ✅ Setters for reactive flags
  setSignedStatus(value: boolean): void {
    this.isSignedSubject.next(value);
  }

  setFileReady(value: boolean): void {
    this.isFileReadySubject.next(value);
  }

  // Tooltip controls
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
