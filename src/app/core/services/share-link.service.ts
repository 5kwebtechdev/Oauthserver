import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

export type SharedListingType =
  | 'quiz'
  | 'tutor'
  | 'counselor'
  | 'academy'
  | 'event'
  | 'workshop'
  | 'shop'
  | 'book';

/**
 * Builds links that are safe to put in a native share sheet.  In particular,
 * this never uses window.location, because that would leak localhost when a
 * share is initiated from a development build.
 */
@Injectable({ providedIn: 'root' })
export class ShareLinkService {
  private readonly publicBaseUrl = String(environment.publicWebUrl || 'https://supermeapp.com')
    .replace(/\/+$/, '');
  private readonly publicAppUrl = this.publicBaseUrl.endsWith('/app')
    ? this.publicBaseUrl
    : `${this.publicBaseUrl}/app`;

  buildListingLink(type: SharedListingType, id: string | number | null | undefined): string {
    const value = String(id ?? '').trim();
    if (!value) return `${this.publicAppUrl}/share`;
    return `${this.publicAppUrl}/share/${encodeURIComponent(type)}/${encodeURIComponent(value)}`;
  }

  getAndroidStoreUrl(): string {
    return String(environment.firebase?.remoteConfig?.defaults?.android_store_url
      || 'https://play.google.com/store/apps/details?id=com.superme.app').trim();
  }
}
