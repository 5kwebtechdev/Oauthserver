import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ProfileStoreService } from './profile-store.service';
import { ChildInfo } from '../models/child-info.model';

/**
 * ProfileSelectorService - Thin facade over ProfileStoreService.
 * Provides backward-compatible API for existing code.
 * Prefer using ProfileStoreService directly in new code.
 */
@Injectable({ providedIn: 'root' })
export class ProfileSelectorService {
  /** Current selected child ID observable */
  readonly child$: Observable<string | number | null>;

  /** Emits only when child actually changes */
  readonly childChanged$: Observable<string | number | null>;

  constructor(private store: ProfileStoreService) {
    this.child$ = this.store.selectedChildId$;
    this.childChanged$ = this.store.selectionChanged$.pipe(map(c => c?.id ?? null));
  }

  /** Set the currently selected child by ID (looks up in store) */
  setChild(value: string | number | null): void {
    if (value === null) {
      this.store.clearSelection();
    } else {
      this.store.selectById(value);
    }
  }

  /** Set the currently selected child by full object */
  setChildInfo(child: ChildInfo | null): void {
    this.store.select(child);
  }

  /** Get current child ID synchronously */
  getChildId(): string | number | null {
    return this.store.getSelectedChildIdSync();
  }

  /** Get full selected child synchronously */
  getSelectedChild(): ChildInfo | null {
    return this.store.getSelectedChildSync();
  }

  /** Check if a child is currently selected */
  hasSelectedChild(): boolean {
    return this.store.hasSelectedChild();
  }

  /** Clear the selected child */
  clearChild(): void {
    this.store.clearSelection();
  }
}
