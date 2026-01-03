import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, skip } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileSelectorService {
  private childSubject = new BehaviorSubject<number | null>(null);

  /** Current selected child ID observable */
  public child$: Observable<number | null> = this.childSubject.asObservable();

  /** Emits only when child actually changes (skips initial null) */
  public childChanged$ = this.child$.pipe(
    distinctUntilChanged(),
    skip(1) // Skip initial value - only emit on actual changes
  );

  /** Set the currently selected child ID */
  setChild(value: number | null): void {
    this.childSubject.next(value);
  }

  /** Get current child ID synchronously */
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
  }
}
