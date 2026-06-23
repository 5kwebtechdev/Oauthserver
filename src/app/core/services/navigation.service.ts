import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Location } from '@angular/common';
import { NavController } from '@ionic/angular';

/**
 * Simple navigation service that tracks page history using sessionStorage.
 * This ensures the back button always follows the exact navigation flow.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly STORAGE_KEY = 'nav_history';
  private readonly MAX_HISTORY = 50;

  constructor(private router: Router, private location: Location, private navCtrl: NavController) {
    this.initHistory();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url;
        this.pushUrl(url);
      });
  }

  private initHistory(): void {
    if (!sessionStorage.getItem(this.STORAGE_KEY)) {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
    }
  }

  private getStoredHistory(): string[] {
    try {
      return JSON.parse(sessionStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveHistory(history: string[]): void {
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
  }

  private pushUrl(url: string): void {
    const history = this.getStoredHistory();
    // Don't add duplicate consecutive entries
    if (history.length === 0 || history[history.length - 1] !== url) {
      history.push(url);
      // Keep history size limited
      if (history.length > this.MAX_HISTORY) {
        history.shift();
      }
      this.saveHistory(history);
    }
  }

  /**
   * Navigate back to the previous page in history.
   * Uses the exact navigation flow recorded in sessionStorage.
   */
  back(): void {
    const history = this.getStoredHistory();
    
    if (history.length > 1) {
      // Remove current page
      history.pop();
      // Get and remove previous page
      const previous = history.pop();
      this.saveHistory(history);
      
      if (previous) {
        this.navCtrl.navigateBack(previous).catch(() => this.location.back());
        return;
      }
    }

    // Fallback: use NavController.back() which plays the Ionic back animation
    this.navCtrl.back();
  }

  /**
   * Navigate back by N steps (including current). For example, backN(1) behaves like back(),
   * backN(2) skips the previous entry and navigates to the one before that.
   */
  backN(steps: number): void {
    if (!steps || steps <= 0) return;

    const history = this.getStoredHistory();
    if (history.length > 0) history.pop();

    for (let i = 1; i < steps; i++) {
      if (history.length > 0) history.pop();
      else break;
    }

    const target = history.length ? history.pop() : undefined;
    this.saveHistory(history);

    if (target) {
      this.navCtrl.navigateBack(target).catch(() => this.location.back());
      return;
    }

    this.navCtrl.back();
  }

  /**
   * Get a copy of the navigation history
   */
  getHistory(): string[] {
    return [...this.getStoredHistory()];
  }

  /**
   * Get the previous URL without navigating
   */
  getPreviousUrl(): string | null {
    const history = this.getStoredHistory();
    return history.length > 1 ? history[history.length - 2] : null;
  }

  /**
   * Clear the navigation history (useful on logout)
   */
  clearHistory(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.initHistory();
  }
}
