import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, map, shareReplay } from 'rxjs';
import { ChildInfo } from '../models/child-info.model';

const STORAGE_KEY = 'mb_selected_child_id';

/**
 * ProfileStoreService - Single source of truth for selected child profile.
 * 
 * Usage across app:
 * - Inject and subscribe to `selectedChild$` for full child data.
 * - Use `selectedChildId$` if only id needed.
 * - Call `select(child)` to switch child context atomically.
 * - Call `getSelectedChildSync()` in synchronous contexts (interceptors).
 */
@Injectable({ providedIn: 'root' })
export class ProfileStoreService {
  // Internal state
  private readonly childrenSubject = new BehaviorSubject<ChildInfo[]>([]);
  private readonly selectedSubject = new BehaviorSubject<ChildInfo | null>(null);

  // Public observables (shareReplay so late subscribers get current value)
  readonly children$: Observable<ChildInfo[]> = this.childrenSubject.asObservable().pipe(shareReplay(1));
  readonly selectedChild$: Observable<ChildInfo | null> = this.selectedSubject.asObservable().pipe(shareReplay(1));
  readonly selectedChildId$: Observable<string | number | null> = this.selectedChild$.pipe(
    map(c => c?.id ?? null),
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Emits when the selected child or that child's age context changes.
   *
   * Family data can arrive after the lighter dashboard/vibe snapshot. If we
   * compare only the id, subscribers keep the first snapshot (which may not
   * contain DOB/age) and learning requests can be built with the wrong age.
   */
  readonly selectionChanged$: Observable<ChildInfo | null> = this.selectedChild$.pipe(
    distinctUntilChanged((a, b) =>
      String(a?.id ?? '') === String(b?.id ?? '')
      && String(a?.age ?? '') === String(b?.age ?? '')
      && String(a?.dateOfBirth ?? '') === String(b?.dateOfBirth ?? '')
    )
  );

  constructor() {
    // Restore persisted child id on init (will be matched when children load)
    this.restoreSelection();
  }

  // ─────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────

  /** Set children list and auto-select restored or first child */
  setChildren(children: ChildInfo[]): void {
    this.childrenSubject.next(children);
    if (!children.length) {
      this.clearSelection();
      return;
    }

    // Try to match stored id (use string comparison for mixed types)
    const storedId = this.getStoredId();
    const match = storedId !== null ? children.find(c => String(c.id) === String(storedId)) : null;
    if (match) {
      this.selectedSubject.next(match);
    } else if (children.length && !this.selectedSubject.value) {
      this.select(children[0]);
    } else if (this.selectedSubject.value && !children.some(c => String(c.id) === String(this.selectedSubject.value?.id))) {
      this.select(children[0]);
    }
  }

  /** Select a child (atomic: updates subject + persists) */
  select(child: ChildInfo | null): void {
    this.selectedSubject.next(child);
    this.persistId(child?.id ?? null);
  }

  /** Select child by id (looks up from current children list) */
  selectById(id: string | number): boolean {
    const child = this.childrenSubject.value.find(c => String(c.id) === String(id)) ?? null;
    if (child) {
      this.select(child);
      return true;
    }
    return false;
  }

  /** Update selected child's data in place (e.g., after stats refresh) */
  updateSelectedChild(partial: Partial<ChildInfo>): void {
    const current = this.selectedSubject.value;
    if (current) {
      this.selectedSubject.next({ ...current, ...partial });
      // Also update in children list (use string comparison)
      const list = this.childrenSubject.value.map(c =>
        String(c.id) === String(current.id) ? { ...c, ...partial } : c
      );
      this.childrenSubject.next(list);
    }
  }

  /** Clear selection */
  clearSelection(): void {
    this.selectedSubject.next(null);
    this.persistId(null);
  }

  /** Clear everything (logout) */
  reset(): void {
    this.childrenSubject.next([]);
    this.selectedSubject.next(null);
    this.persistId(null);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Sync accessors (for interceptors / guards)
  // ─────────────────────────────────────────────────────────────────────

  getSelectedChildSync(): ChildInfo | null {
    return this.selectedSubject.value;
  }

  getSelectedChildIdSync(): string | number | null {
    return this.selectedSubject.value?.id ?? null;
  }

  getChildrenSync(): ChildInfo[] {
    return this.childrenSubject.value;
  }

  hasSelectedChild(): boolean {
    return this.selectedSubject.value !== null;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Persistence helpers
  // ─────────────────────────────────────────────────────────────────────

  private persistId(id: string | number | null): void {
    try {
      if (id !== null) {
        localStorage.setItem(STORAGE_KEY, String(id));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* storage unavailable */ }
  }

  private getStoredId(): string | number | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v !== null && v !== undefined) {
        return v;
      }
    } catch { /* ignore */ }
    return null;
  }

  private restoreSelection(): void {
    // Will be matched when setChildren is called
  }
}
