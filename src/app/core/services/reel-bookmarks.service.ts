import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ReelBookmarksService {
  constructor(private readonly authService: AuthService) {}

  isSaved(reelId: number | string): boolean {
    return this.readIds().has(String(reelId));
  }

  toggle(reelId: number | string): boolean {
    const ids = this.readIds();
    const key = String(reelId);
    ids.has(key) ? ids.delete(key) : ids.add(key);
    this.writeIds(ids);
    return ids.has(key);
  }

  savedIds(): Set<string> {
    return this.readIds();
  }

  private storageKey(): string {
    return `superme_saved_reels_${this.authService.getUserId() || 'anonymous'}`;
  }

  private readIds(): Set<string> {
    try {
      const value = JSON.parse(localStorage.getItem(this.storageKey()) || '[]');
      return new Set(Array.isArray(value) ? value.map(String) : []);
    } catch {
      return new Set<string>();
    }
  }

  private writeIds(ids: Set<string>): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(Array.from(ids)));
    } catch {
      // Saving remains non-blocking when browser storage is unavailable.
    }
  }
}
