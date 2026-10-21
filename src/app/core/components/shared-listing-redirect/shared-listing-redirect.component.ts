import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ShareLinkService, SharedListingType } from '../../services/share-link.service';

@Component({
  selector: 'app-shared-listing-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="shared-listing-redirect" aria-live="polite">
      <p>Opening this SuperMe listing…</p>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .shared-listing-redirect {
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 2rem;
      color: #492486;
      font: 500 1rem/1.5 Arial, sans-serif;
      text-align: center;
    }
  `]
})
export class SharedListingRedirectComponent implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly links: ShareLinkService
  ) {}

  ngOnInit(): void {
    const type = String(this.route.snapshot.paramMap.get('type') || '').trim().toLowerCase() as SharedListingType;
    const id = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!id || !this.isSupportedType(type)) {
      this.redirectToStore();
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      // A share link is an app hand-off link. If the app is not installed the
      // public URL is opened in a browser, so send the user to the Android
      // download page instead of exposing an authenticated/empty web route.
      this.redirectToStore();
      return;
    }

    const route = this.internalRoute(type, id);
    void this.router.navigateByUrl(route, { replaceUrl: true });
  }

  private internalRoute(type: SharedListingType, id: string): string {
    const encodedId = encodeURIComponent(id);
    switch (type) {
      case 'quiz': return `/authed/content/description/${encodedId}`;
      case 'counselor': return `/authed/counselors/${encodedId}`;
      case 'event': return `/authed/education/events?sharedId=${encodedId}`;
      case 'workshop': return `/authed/education/workshops?sharedId=${encodedId}`;
      case 'shop': return `/authed/education/shops?listing=${encodedId}`;
      case 'book': return `/authed/second-hand-books?listingId=${encodedId}`;
      // Academy detail pages use the same profile screen as tutor listings;
      // the profile response supplies its entity type and renders academy data.
      case 'academy':
      case 'tutor':
      default: return `/authed/tutors/${encodedId}`;
    }
  }

  private isSupportedType(type: SharedListingType): boolean {
    return ['quiz', 'tutor', 'counselor', 'academy', 'event', 'workshop', 'shop', 'book'].includes(type);
  }

  private redirectToStore(): void {
    if (typeof window !== 'undefined') {
      window.location.replace(this.links.getAndroidStoreUrl());
    }
  }
}
