import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Location } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private history: string[] = [];

  constructor(private router: Router, private location: Location) {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url;
        if (!this.history.length || this.history[this.history.length - 1] !== url) {
          this.history.push(url);
        }
        if (this.history.length > 50) this.history.shift();
      });
  }

  back(): void {
    // If we have a previous route recorded, navigate to it
    if (this.history.length > 1) {
      // current url
      this.history.pop();
      const previous = this.history.pop();
      if (previous) {
        this.router.navigateByUrl(previous).catch(() => this.location.back());
        return;
      }
    }

    // Fallback to browser history
    this.location.back();
  }

  getHistory(): string[] {
    return [...this.history];
  }
}
