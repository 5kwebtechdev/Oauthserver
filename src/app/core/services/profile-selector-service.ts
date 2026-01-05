import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, skip } from 'rxjs';

const STORAGE_KEY = 'mb_selected_child_id';

@Injectable({
  providedIn: 'root'
})
export class ProfileSelectorService {
  private childSubject: BehaviorSubject<number | null>;

  /** Current selected child ID observable */
  public child$: Observable<number | null>;

  /** Emits only when child actually changes (skips initial null) */
  public childChanged$: Observable<number | null>;

  constructor() {
    // Restore from localStorage on service init
    const stored = this.getStoredChildId();
    this.childSubject = new BehaviorSubject<number | null>(stored);
    this.child$ = this.childSubject.asObservable();
    this.childChanged$ = this.child$.pipe(
      distinctUntilChanged(),
      skip(1) // Skip initial value - only emit on actual changes
    );
  }

  /** Set the currently selected child ID (forUserId) */
  setChild(value: number | null): void {
    this.childSubject.next(value);
    this.persistChildId(value);
  }

  /** Get current child ID (forUserId) synchronously */
  getChildId(): number | null {
    return this.childSubject.value;
  }

  /** Check if a child is currently selected */
  hasSelectedChild(): boolean {
    return this.childSubject.value !== null;
  }

  /** Clear the selected child */
  clearChild(): void {
    this.childSubject.next(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { }
  }

  private persistChildId(value: number | null): void {
    try {
      if (value !== null) {
        localStorage.setItem(STORAGE_KEY, String(value));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { }
  }

  private getStoredChildId(): number | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = Number(stored);
        return isNaN(parsed) ? null : parsed;
      }
    } catch { }
    return null;
  }
}
