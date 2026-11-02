import { Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { map, Observable, of } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MetaTagConfig } from '../models/metatag.model';

const DEFAULT_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const DEFAULT_SOCIAL_IMAGE = 'https://supermeapp.com/social/supermeapp-og-1200.jpg';
const DEFAULT_SITE_TITLE = 'SuperMeApp – Habit Tracker & Routine Planner';
const DEFAULT_SITE_DESCRIPTION = 'SuperMeApp - a science-backed habit tracker, daily planner, task manager, journal, and learning platform designed to help children, teens, parents, and adults build better habits and achieve their goals.';
const HOME_TITLE = DEFAULT_SITE_TITLE;
const HOME_DESCRIPTION = DEFAULT_SITE_DESCRIPTION;
const PAGE_H1_OVERRIDES: Record<string, string> = {
  '/master-class': 'Online Master Classes',
  '/habit-tracker': 'Habit Tracker',
  '/task-manager': 'Task Manager',
  '/daily-journal': 'Daily Journal',
  '/productivity-calendar': 'Productivity Calendar',
  '/note-taking-app': 'Note Taking App',
};
const DIRECTORY_DESCRIPTIONS: Record<string, string> = {
  '/find-a-tutor': 'Discover tutors and coaches on SuperMeApp, explore their profiles and find support for your learning goals.',
  '/find-an-academy': 'Explore academies on SuperMeApp that help learners build skills and grow with confidence.',
  '/find-events': 'Find local events on SuperMeApp and discover activities happening near you.',
  '/find-second-hand-book': 'Browse pre-loved books on SuperMeApp and find affordable learning resources from nearby sellers.',
  '/find-a-counselor': 'Find counselors on SuperMeApp and explore guidance and well-being support for students and families.',
  '/find-a-stationery-shop': 'Find nearby stationery shops on SuperMeApp for school, art and everyday supplies.',
  '/find-a-book-store': 'Discover book stores on SuperMeApp and explore places to find your next read.',
  '/find-a-sport-shop': 'Find sports shops on SuperMeApp for gear and supplies to help you stay active.',
  '/find-pg-hostel': 'Explore PG and hostel listings on SuperMeApp by city, stay type, suitability and food availability.',
};
const PROVIDER_META: Record<string, { title: string; description: string }> = {
  '/become-a-tutor': {
    title: 'Become a Tutor | SuperMeApp',
    description: 'Join SuperMeApp as a tutor to share your expertise, connect with learners and parents, and grow your teaching profile.',
  },
  '/advertise-with-us': {
    title: 'Advertise on SuperMeApp',
    description: 'Promote your brand to learners and parents on SuperMeApp. Share your advertising details and our team will review your request.',
  },
  '/list-second-hand-books': {
    title: 'List Second-Hand Books | SuperMeApp',
    description: 'List your second-hand books on SuperMeApp so students and families can discover affordable learning resources.',
  },
  '/list-your-stationery-shop': {
    title: 'List Your Stationery Shop | SuperMeApp',
    description: 'List your stationery shop on SuperMeApp so students and parents can discover your store for school, art and everyday supplies.',
  },
  '/become-a-counsellor': {
    title: 'Become a Counsellor | SuperMeApp',
    description: 'Create a counsellor profile on SuperMeApp and connect with students and families looking for guidance and support.',
  },
  '/list-a-workshop': {
    title: 'List a Workshop | SuperMeApp',
    description: 'List a workshop on SuperMeApp and share practical learning experiences, schedules and venue details with students and families.',
  },
  '/list-your-academy': {
    title: 'List Your Academy | SuperMeApp',
    description: 'List your academy on SuperMeApp so learners and parents can discover your classes.',
  },
  '/list-your-bookstore': {
    title: 'List Your Bookstore | SuperMeApp',
    description: 'List your bookstore on SuperMeApp and help students and families discover books, guides and learning resources.',
  },
  '/list-your-sports-shop': {
    title: 'List Your Sports Shop | SuperMeApp',
    description: 'List your sports shop on SuperMeApp to help students, parents and young athletes discover sports gear nearby.',
  },
  '/list-an-event': {
    title: 'List an Event | SuperMeApp',
    description: 'List an educational or community event on SuperMeApp and share its schedule and venue with families.',
  },
  '/list-your-pg-hostel': {
    title: 'List Your PG or Hostel | SuperMeApp',
    description: 'List your PG or hostel on SuperMeApp so students and families can explore rooms, food options and amenities.',
  },
};
const DEFAULT_SOCIAL_IMAGE_ALT = 'SuperMeApp';
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
const HOME_APP_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': 'https://supermeapp.com/#app',
  name: 'SuperMeApp',
  url: 'https://supermeapp.com/',
  description: 'SuperMeApp brings habits, planning, learning, journaling and rewards together in one personal growth app.',
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'Android, iOS',
  publisher: {
    '@type': 'Organization',
    name: 'SuperMeApp',
    url: 'https://supermeapp.com/',
  },
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly fallbackTitle = DEFAULT_SITE_TITLE;
  private readonly fallbackDescription = DEFAULT_SITE_DESCRIPTION;
  private pendingHeadings?: MetaTagConfig;

  constructor(
    private http: HttpClient,
    private title: Title,
    private meta: Meta,
    private router: Router,
    @Inject(DOCUMENT) private readonly doc: Document
  ) {
    // Heading elements live inside the routed component's own template. The resolver runs
    // before that component (and any lazy chunk behind loadComponent) has been created, so
    // applying headings there would just get clobbered by the component's own initial render.
    // NavigationEnd only fires once the whole navigation — including activating the new
    // component — has finished, so it's the first safe point to touch the rendered DOM.
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        const headings = this.pendingHeadings;
        setTimeout(() => this.applyHeadings(headings), 0);
      });
  }

  /** Keep article metadata tied to the backend's canonical stored slug. */
  setArchivePageMetadata(page: number): void {
    const canonical = page > 0 ? `https://supermeapp.com/blogs?page=${page}` : 'https://supermeapp.com/blogs';
    const title = page > 0 ? `Blogs — Page ${page + 1} | SuperMeApp` : 'Blogs on Habits, Productivity and Growth | SuperMeApp';
    this.title.setTitle(title);
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.updateCanonicalLink(canonical);
  }

  setArticleMetadata(article: { slug?: string; title: string; description?: string; thumbnailUrl?: string; imageUrl?: string; publishedBy?: string | null; author?: string; publishedAt?: string | null; publishedDate?: string; updatedAt?: string | null }): void {
    if (!article.slug) return;
    const canonical = `https://supermeapp.com/article/${encodeURIComponent(article.slug)}`;
    const title = `${article.title} | SuperMeApp`;
    const description = article.description || this.fallbackDescription;
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    const image = article.thumbnailUrl || article.imageUrl || DEFAULT_SOCIAL_IMAGE;
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:secure_url', content: image });
    this.meta.updateTag({ name: 'twitter:image', content: image });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    for (const field of ['width', 'height', 'type']) this.meta.removeTag(`property="og:image:${field}"`);
    this.meta.updateTag({ name: 'robots', content: DEFAULT_ROBOTS });
    this.updateCanonicalLink(canonical);
    const author = article.publishedBy?.trim() || article.author?.trim();
    if (author) this.meta.updateTag({ name: 'author', content: author });
    else this.meta.removeTag('name="author"');
    const published = article.publishedAt || article.publishedDate;
    this.clearArticleSchema();
    const schema = this.doc.createElement('script');
    schema.id = 'article-schema';
    schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      '@id': `${canonical}#article`, mainEntityOfPage: canonical,
      headline: article.title, description,
      ...(article.thumbnailUrl || article.imageUrl ? { image } : {}),
      ...(author ? { author: { '@type': 'Person', name: author } } : {}),
      ...(published && !Number.isNaN(Date.parse(published)) ? { datePublished: published } : {}),
      ...(article.updatedAt && !Number.isNaN(Date.parse(article.updatedAt)) ? { dateModified: article.updatedAt } : {}),
      publisher: { '@type': 'Organization', name: 'SuperMeApp', url: 'https://supermeapp.com/' }
    }).replace(/</g, '\\u003c');
    this.doc.head.appendChild(schema);
  }

  clearArticleSchema(): void { this.doc.getElementById('article-schema')?.remove(); }
  setArticleUnavailable(message: string): void {
    this.clearArticleSchema();
    this.title.setTitle(`${message} | SuperMeApp`);
    this.meta.updateTag({ name: 'robots', content: 'noindex,follow' });
    this.doc.querySelector('link[rel="canonical"]')?.remove();
  }

  /** Used by seoResolver — the router waits for this to complete before rendering the target route. */
  resolveForUrl(url: string, route: ActivatedRouteSnapshot): Observable<void> {
    const pageName = this.buildCanonicalUrl(url);

    return this.fetchMetaTag(pageName).pipe(
      map(config => {
        this.applyMeta(config ?? undefined, url, route.data['seoFallbackTitle']);
        this.pendingHeadings = config ?? undefined;
      })
    );
  }

  /** GET {apiUrl}/metatags/by-page?pageName=<absolute page URL> — cached per page for the app session. */
  private fetchMetaTag(pageName: string): Observable<MetaTagConfig | null> {
    const params = new HttpParams().set('pageName', pageName);
    return this.http.get<MetaTagConfig>(`${environment.apiUrl}/metatags/by-page`, { params }).pipe(
      catchError(error => {
        console.error(`Failed to load SEO metatags for ${pageName}:`, error);
        return of(null);
      })
    );
  }

  private applyMeta(config?: MetaTagConfig, url = '', routeFallbackTitle?: string): void {
    const cleanPath = (url || '').split('?')[0].split('#')[0] || '/';
    const isHomePage = cleanPath === '/';
    const providerMeta = PROVIDER_META[cleanPath];
    const title = config?.title?.trim() || (isHomePage ? HOME_TITLE : providerMeta?.title || routeFallbackTitle || this.fallbackTitle);
    const description = config?.description?.trim() || (isHomePage ? HOME_DESCRIPTION : providerMeta?.description || DIRECTORY_DESCRIPTIONS[cleanPath] || this.fallbackDescription);
    const keywords = config?.keywords?.trim() || '';
    const canonical = config?.canonical?.trim() || this.buildCanonicalUrl(url);
    const robots = config?.robots?.trim() || DEFAULT_ROBOTS;
    const author = config?.author?.trim() || 'SuperMe';
    const ogTitle = title;
    const ogDescription = description;
    const ogUrl = canonical;
    const ogImage = DEFAULT_SOCIAL_IMAGE;
    const twitterTitle = ogTitle;
    const twitterDescription = ogDescription;

    this.title.setTitle(title);
    this.updateHomeAppSchema(isHomePage);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: keywords });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ name: 'author', content: author });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'SuperMeApp' });
    this.meta.updateTag({ property: 'og:title', content: ogTitle });
    this.meta.updateTag({ property: 'og:description', content: ogDescription });
    this.meta.updateTag({ property: 'og:url', content: ogUrl });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: twitterTitle });
    this.meta.updateTag({ name: 'twitter:description', content: twitterDescription });
    this.updateCanonicalLink(canonical);

    this.meta.updateTag({ property: 'og:image', content: ogImage });
    this.meta.updateTag({ property: 'og:image:secure_url', content: ogImage });
    this.meta.updateTag({ property: 'og:image:type', content: 'image/jpeg' });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ property: 'og:image:alt', content: DEFAULT_SOCIAL_IMAGE_ALT });
    this.meta.updateTag({ name: 'twitter:image', content: ogImage });
    this.meta.updateTag({ name: 'twitter:image:alt', content: DEFAULT_SOCIAL_IMAGE_ALT });
  }

  /**
   * Overwrites the text of the page's heading elements (h1-h6) with the API-provided copy,
   * when present. Only touches a level when the API actually sends non-blank text for it, so
   * pages whose h2-h6 are just page layout (not SEO-managed) are left alone.
   */
  private applyHeadings(config?: MetaTagConfig): void {
    if (typeof document === 'undefined') return;
    HEADING_TAGS.forEach(tag => {
      // Keep these page-specific headings aligned with prerendered HTML when the
      // existing metatag API supplies older, broader H1 wording.
      const text = tag === 'h1'
        ? PAGE_H1_OVERRIDES[this.router.url.split('?')[0]] || config?.[tag]?.trim()
        : config?.[tag]?.trim();
      if (!text) return;

      const el = document.querySelector(tag);
      if (el) {
        el.textContent = text;
      }
    });
  }

  private buildCanonicalUrl(url: string): string {
    const path = (url || '').split('?')[0].split('#')[0] || '/';
    return `https://supermeapp.com${path === '/' ? '/' : path.replace(/\/+$/g, '')}`;
  }

  private updateCanonicalLink(href: string): void {
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private updateHomeAppSchema(isHomePage: boolean): void {
    let script = this.doc.querySelector<HTMLScriptElement>('script[data-seo-schema="home-app"]');
    if (!isHomePage) {
      script?.remove();
      return;
    }
    if (!script) {
      script = this.doc.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo-schema', 'home-app');
      this.doc.head.appendChild(script);
    }
    script.textContent = JSON.stringify(HOME_APP_SCHEMA);
  }
}
