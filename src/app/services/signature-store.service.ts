import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SignatureModel {
  id: string;
  dataUrl: string;       // PNG from canvas (transparent background)
  x: number;             // px in overlay coords
  y: number;             // px in overlay coords
  width: number;         // rendered width in px
  height: number;        // rendered height in px (maintain aspect ratio)
  rotation?: number;     // keep for future
}

@Injectable({ providedIn: 'root' })
export class SignatureStoreService {
  private _signatures = new BehaviorSubject<SignatureModel[]>([]);
  signatures$ = this._signatures.asObservable();

  add(sig: Omit<SignatureModel, 'id'>) {
    const id = 'sig_' + Math.random().toString(36).slice(2, 9);
    const next = [...this._signatures.value, { id, ...sig }];
    this._signatures.next(next);
    return id;
  }

  update(id: string, patch: Partial<SignatureModel>) {
    const next = this._signatures.value.map(s => s.id === id ? { ...s, ...patch } : s);
    this._signatures.next(next);
  }

  remove(id: string) {
    const next = this._signatures.value.filter(s => s.id !== id);
    this._signatures.next(next);
  }

  clear() {
    this._signatures.next([]);
  }
}
