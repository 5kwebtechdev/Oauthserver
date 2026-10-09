import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

export type DeepLinkTarget =
  | { type: 'academy'; categoryId?: string | number; category?: string; title?: string; subtitle?: string; age?: string | number }
  | { type: 'academyCourse'; id: string | number }
  | { type: 'product'; id: string | number }
  | { type: 'productCategory'; category: string }
  | { type: 'route'; path: string; queryParams?: Record<string, string | number | boolean> };

@Injectable({ providedIn: 'root' })
export class DeepLinkService {
  private initialized = false;

  constructor(private router: Router) {}

  initialize(): void {
    if (this.initialized || !Capacitor.isNativePlatform()) return;
    this.initialized = true;

    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.handleUrl(event.url, false);
    }).catch(error => console.warn('[DeepLink] Failed to register appUrlOpen listener:', error));

    App.getLaunchUrl()
      .then(result => {
        if (result?.url) this.handleUrl(result.url, true);
      })
      .catch(() => {});
  }

  createLink(target: DeepLinkTarget): string {
    const deepLinks = environment.firebase?.deepLinks;
    const host = deepLinks?.hosts?.[0] || 'supermeapp.com';
    const url = new URL(`https://${host}`);

    if (target.type === 'academy') {
      url.pathname = '/academy';
      this.appendQuery(url, target);
    } else if (target.type === 'academyCourse') {
      url.pathname = `/academy/course/${encodeURIComponent(String(target.id))}`;
    } else if (target.type === 'product') {
      url.pathname = `/product/${encodeURIComponent(String(target.id))}`;
    } else if (target.type === 'productCategory') {
      url.pathname = '/product';
      url.searchParams.set('category', target.category);
    } else {
      url.pathname = target.path.startsWith('/') ? target.path : `/${target.path}`;
      this.appendQuery(url, target.queryParams ?? {});
    }

    return url.toString();
  }

  private handleUrl(rawUrl: string, coldStart = false): void {
    const route = this.toInternalRoute(rawUrl);
    if (!route) return;

    const navigate = () =>
      this.router.navigateByUrl(route).catch(error => {
        console.warn('[DeepLink] Navigation failed:', error);
      });

    if (coldStart) {
      // Router may not be ready on cold start — wait for Angular to bootstrap
      setTimeout(navigate, 600);
    } else {
      navigate();
    }
  }

  private toInternalRoute(rawUrl: string): string | null {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return null;
    }

    const deepLinks = environment.firebase?.deepLinks;
    const allowedHosts = new Set((deepLinks?.hosts ?? []).map(host => host.toLowerCase()));
    const scheme = deepLinks?.scheme || 'superme';
    const isAllowedHttpLink = (url.protocol === 'https:' || url.protocol === 'http:') && allowedHosts.has(url.host.toLowerCase());
    const isAllowedSchemeLink = url.protocol.replace(':', '') === scheme;

    if (!isAllowedHttpLink && !isAllowedSchemeLink) return null;

    // Links copied from older web builds can contain the document base
    // (`/app`). Angular routes are relative to that base, so normalize it
    // before matching native deep-link destinations.
    const rawPath = this.normalizePath(isAllowedSchemeLink ? this.getSchemePath(url) : url.pathname);
    const path = rawPath.replace(/^\/app(?=\/|$)/, '') || '/';
    const query = url.search || '';

    if (path === '/referral') {
      const code = url.searchParams.get('code');
      if (code) {
        try {
          sessionStorage.setItem('referralCode', code.toUpperCase());
          sessionStorage.setItem('referralCodeLocked', 'true');
        } catch (e) {}
      }
      return '/signup?step=0.1';
    }

    if (path.startsWith('/authed/')) {
      return `${path}${query}`;
    }

    if (path.startsWith('/share/')) {
      return `${path}${query}`;
    }

    // Article share URLs use the public website host. Preserve the ID/slug so
    // an installed app opens the same article instead of its default Home tab.
    if (/^\/(?:article|articles)\/[^/]+$/.test(path)) {
      return `${path}${query}`;
    }

    if (path === '/join-family') {
      return `/home/join-family${query}`;
    }

    if (path === '/join-family2') {
      return `/home/join-family2${query}`;
    }

    if (path === '/academy') {
      return `/authed/academy${query}`;
    }

    if (path === '/academy/subject') {
      return `/authed/academy/subject${query}`;
    }

    const academyCourse = path.match(/^\/academy\/course\/([^/]+)$/);
    if (academyCourse) {
      return `/authed/academy/course/${academyCourse[1]}${query}`;
    }

    const product = path.match(/^\/(?:product|school-store\/product)\/([^/]+)$/);
    if (product) {
      return `/authed/school-store/product/${product[1]}${query}`;
    }

    if (path === '/product' || path === '/school-store/product') {
      return `/authed/school-store/product${query}`;
    }

    return deepLinks?.defaultPath || '/home';
  }

  private getSchemePath(url: URL): string {
    if (url.hostname && url.pathname) {
      return `/${url.hostname}${url.pathname}`;
    }
    if (url.hostname) {
      return `/${url.hostname}`;
    }
    return url.pathname || '/';
  }

  private normalizePath(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return normalized.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  private appendQuery(url: URL, params: Record<string, string | number | boolean | undefined>): void {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
}
