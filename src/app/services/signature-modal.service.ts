import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SignatureModalData {
  title?: string;
  draw?: boolean;
}

export interface SignatureModalState {
  isOpen: boolean;
  data?: SignatureModalData;
}

@Injectable({ providedIn: 'root' })
export class SignatureModalService {

 private readonly _state = new BehaviorSubject<SignatureModalState>({ isOpen: false });
  public readonly state$ = this._state.asObservable();

  open(data?: SignatureModalData) {
    this._state.next({ isOpen: true, data });
  }

  close() {
    this._state.next({ isOpen: false });
  }

  toggle(data?: SignatureModalData) {
    this._state.value.isOpen ? this.close() : this.open(data);
  }

  // Synchronous getter (handy for guards / quick checks)
  get isOpen(): boolean {
    return this._state.value.isOpen;
  }
}
