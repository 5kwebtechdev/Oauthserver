import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Opens one of our own web pages in a real browser with the signed-in user carried across.
 *
 * A native app's WebView shares no cookies or storage with Chrome or Safari, so tapping through
 * to the website would otherwise land the user there as a stranger. The only channel that crosses
 * that boundary is the URL itself, and putting an access token in one is unsafe: URLs are kept in
 * history, sent in Referer headers, written to server logs and pasted into chats, and that token
 * stays usable for its full lifetime. So the URL carries a one-time pass instead - worthless by
 * itself, dead within a minute, and spent the first time it is redeemed.
 *
 * The same code serves web, Android and iOS, because nothing here depends on what the app and the
 * browser share; only HOW the link is opened differs by platform.
 */
@Injectable({ providedIn: 'root' })
export class HandoffLinkService {

  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Our own sites only. A pass is a sign-in, so attaching one to a URL someone else controls -
   * an advertiser's link, say - would hand them the ability to act as this user. Anything not
   * listed here is opened as an ordinary link, with nothing attached.
   */
  private isOwnDomain(url: string): boolean {
    let host: string;
    try {
      host = new URL(url, window.location.href).hostname.toLowerCase();
    } catch {
      return false;
    }
    const own = [environment.publicWebUrl, environment.oauth?.issuer, environment.apiUrl]
      .filter(Boolean)
      .map(value => { try { return new URL(value as string).hostname.toLowerCase(); } catch { return ''; } })
      .filter(Boolean);
    // Exact host or a subdomain of one of ours - never a suffix match like "notsupermeapp.com".
    return own.some(ourHost => host === ourHost || host.endsWith('.' + ourHost));
  }

  /**
   * Opens the link, attaching a one-time sign-in pass when it is one of our pages and the user is
   * actually signed in. Never throws: if the pass cannot be obtained the link still opens, the
   * user just signs in there as they would have anyway.
   */
  async openWithSession(url: string): Promise<void> {
    const native = Capacitor.isNativePlatform();
    // Reserve a browser tab during the click; browsers block window.open after an awaited request.
    const browserTab = native ? null : window.open('about:blank', '_blank');
    if (browserTab) browserTab.opener = null;

    let target = url;
    if (this.isOwnDomain(url) && this.authService.isLoggedIn()) {
      try {
        const ticket = await this.requestTicket();
        if (ticket) {
          const withTicket = new URL(url, window.location.href);
          withTicket.searchParams.set('t', ticket);
          target = withTicket.toString();
        }
      } catch (error) {
        console.warn('[Handoff] Could not obtain a sign-in pass; opening the link as a normal visit', error);
      }
    }
    if (native) {
      this.openExternally(target);
      return;
    }
    if (browserTab && !browserTab.closed) {
      browserTab.location.replace(target);
      return;
    }
    window.location.assign(target);
  }

  private async requestTicket(): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<{ ticket: string }>(`${environment.apiUrl}/auth/handoff-ticket`, {})
        .pipe(timeout({ first: 8000 }))
    );
    return String(response?.ticket || '').trim();
  }

  /**
   * The only platform-specific part. On native, '_blank' commonly opens inside the app's own
   * WebView, which defeats the point - the user never reaches the real browser and the handoff
   * buys nothing. '_system' hands the URL to Chrome or Safari proper.
   */
  private openExternally(url: string): void {
    if (Capacitor.isNativePlatform()) {
      window.open(url, '_system');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
