import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SessionContextService {
  private userIdSubject = new BehaviorSubject<string | null>(null);
  private projectIdSubject = new BehaviorSubject<string | null>(null);
  private usernameSubject = new BehaviorSubject<string | null>(null);

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
}
