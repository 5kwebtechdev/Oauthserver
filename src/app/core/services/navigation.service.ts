import { Injectable } from '@angular/core';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Location } from '@angular/common';
import { NavController } from '@ionic/angular';

/**
 * Tracks page history in sessionStorage and provides consistent back navigation.
 *
 * Key design:
 * - Every forward NavigationEnd pushes the destination URL.
 * - Every back navigation (ours or a component's location.back() / window.history.back())
 *   must NOT re-push the destination, or the history grows incorrectly and the next
 *   back press goes forward.
 * - We detect external back navigation via NavigationStart.navigationTrigger === 'popstate'.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly STORAGE_KEY = 'nav_history';
  private readonly MAX_HISTORY = 50;
  private readonly REMOVED_ROUTES = new Set(['/home/instructions-for-child']);

  // True while we are in the middle of a back navigation so pushUrl is a no-op.
  private isGoingBack = false;

  constructor(
    private router: Router,
    private location: Location,
    private navCtrl: NavController
  ) {
    this.initHistory();

    // Detect external back navigation (location.back(), window.history.back(), navCtrl.back()).
    // When a popstate fires, the current page is leaving — pop it from our history so that the
    // subsequent NavigationEnd lands on the already-correct top entry.
    this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe((event: NavigationStart) => {
        if (event.navigationTrigger === 'popstate') {
          const history = this.getStoredHistory();
          if (history.length > 0) history.pop();
          this.saveHistory(history);
          this.isGoingBack = true;
        }
      });

    // Track every forward navigation.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url;
        this.pushUrl(url);
      });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private initHistory(): void {
    if (!sessionStorage.getItem(this.STORAGE_KEY)) {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
      return;
    }

    // Remove retired onboarding destinations left by an older app version so
    // hardware/browser Back can never reopen them after an upgrade.
    this.saveHistory(this.getStoredHistory());
  }

  private getStoredHistory(): string[] {
    try {
      const history = JSON.parse(sessionStorage.getItem(this.STORAGE_KEY) || '[]');
      return Array.isArray(history)
        ? history.filter(url => typeof url === 'string' && !this.isRemovedRoute(url))
        : [];
    } catch {
      return [];
    }
  }

  private saveHistory(history: string[]): void {
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
  }

  private pushUrl(url: string): void {
    if (this.isGoingBack) {
      // Back navigation already adjusted the history — don't add the destination again.
      this.isGoingBack = false;
      return;
    }
    if (this.isRemovedRoute(url)) return;

    const history = this.getStoredHistory();
    // Deduplicate consecutive identical entries (e.g. guard redirects to same page).
    if (history.length > 0 && history[history.length - 1] === url) return;
    history.push(url);
    if (history.length > this.MAX_HISTORY) history.shift();
    this.saveHistory(history);
  }

  private isRemovedRoute(url: string): boolean {
    const path = String(url || '').split('?')[0].split('#')[0].replace(/\/+$/, '');
    return this.REMOVED_ROUTES.has(path);
  }

  private doNavigateBack(url: string): void {
    this.isGoingBack = true;
    this.navCtrl.navigateBack(url).catch(() => {
      // navCtrl failed — try plain router as fallback.
      this.router.navigateByUrl(url).catch(() => {
        // Nothing worked — reset flag so future pushes work normally.
        this.isGoingBack = false;
      });
    });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Navigate back one page.
   * Pops the current entry and navigates to what is now the top of the stack.
   */
  back(): void {
    const history = this.getStoredHistory();

    if (history.length > 1) {
      history.pop(); // remove current page
      const previous = history[history.length - 1]; // peek — stays in history
      this.saveHistory(history);
      this.doNavigateBack(previous);
      return;
    }

    // No recorded history — fall back to browser/Angular Location.
    this.isGoingBack = true;
    this.location.back();
  }

  /**
   * Navigate back N pages.
   * backN(1) is identical to back(). backN(2) skips one intermediate page.
   */
  backN(steps: number): void {
    if (!steps || steps <= 0) return;

    const history = this.getStoredHistory();
    for (let i = 0; i < steps && history.length > 0; i++) {
      history.pop();
    }
    const target = history.length > 0 ? history[history.length - 1] : null;
    this.saveHistory(history);

    if (target) {
      this.doNavigateBack(target);
    } else {
      this.isGoingBack = true;
      this.location.back();
    }
  }

  /** Return a shallow copy of the recorded history. */
  getHistory(): string[] {
    return [...this.getStoredHistory()];
  }

  /** Return the URL one step before the current page without navigating. */
  getPreviousUrl(): string | null {
    const history = this.getStoredHistory();
    return history.length > 1 ? history[history.length - 2] : null;
  }

  /**
   * Replace the custom navigation stack with one known-safe destination.
   * Used when an onboarding screen must not be reachable by any Back action.
   */
  replaceHistory(url: string): void {
    this.isGoingBack = false;
    this.saveHistory(this.isRemovedRoute(url) ? [] : [url]);
  }

  /** Replace the current app-history entry when a screen has a known source. */
  navigateReplacingCurrent(url: string): void {
    if (this.isRemovedRoute(url)) return;
    const history = this.getStoredHistory();
    if (history.length) history[history.length - 1] = url;
    else history.push(url);
    this.isGoingBack = false;
    this.saveHistory(history);
    void this.router.navigateByUrl(url, { replaceUrl: true });
  }

  /** Clear history — call on logout. */
  clearHistory(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.initHistory();
  }
}
