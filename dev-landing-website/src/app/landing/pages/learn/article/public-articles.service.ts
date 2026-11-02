import { Injectable, inject, REQUEST_CONTEXT, TransferState, makeStateKey, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, from, EMPTY, expand, reduce, map, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface PublicArticleSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  imageUrl: string | null;
  publishedDate: string | null;
  category: string | null;
  author: string | null;
  tags?: string[];
}

export interface PublicArticlePage {
  articles: PublicArticleSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

@Injectable({ providedIn: 'root' })
export class PublicArticlesService {
  private allArticles$?: Observable<PublicArticleSummary[]>;
  private readonly context = inject(REQUEST_CONTEXT, { optional: true }) as { archive?: PublicArticlePage; articleFetch?: (path: string) => Promise<Response> } | null;
  private readonly transfer = inject(TransferState);
  private readonly server = isPlatformServer(inject(PLATFORM_ID));
  constructor(private readonly http: HttpClient) {}

  refresh(): void { this.allArticles$ = undefined; }

  list(page: number): Observable<PublicArticlePage> {
    const key = makeStateKey<PublicArticlePage>(`public-articles-${page}`);
    if (this.transfer.hasKey(key)) {
      const data = this.transfer.get(key, null!);
      if (!this.server) this.transfer.remove(key);
      return of(data);
    }
    const request = this.allArticles$ ??= this.fetchPage(0).pipe(
      expand(data => data.hasNext && data.page < 99 ? this.fetchPage(data.page + 1) : EMPTY),
      reduce((items, data) => items.concat(data.articles || []), [] as PublicArticleSummary[]),
      map(items => items.sort((a, b) => b.id - a.id)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    return request.pipe(map(articles => ({
      articles: articles.slice(page * 20, (page + 1) * 20),
      page, size: 20, totalElements: articles.length,
      totalPages: Math.ceil(articles.length / 20),
      hasNext: (page + 1) * 20 < articles.length
    })), tap(data => { if (this.server) this.transfer.set(key, data); }));
  }

  private fetchPage(page: number): Observable<PublicArticlePage> {
    const params = new HttpParams().set('page', page).set('size', 20);
    return this.context?.archive?.page === page ? of(this.context.archive)
      : this.context?.articleFetch ? from(this.context.articleFetch(`?page=${page}&size=20`).then(async response => {
        if (!response.ok) throw new Error('Article feed unavailable');
        return response.json() as Promise<PublicArticlePage>;
      })) : this.http.get<PublicArticlePage>(`${environment.apiUrl}/public/articles`, { params });
  }

  related(article: { id: number; slug?: string; tags?: string[]; category?: string }): Observable<PublicArticleSummary[]> {
    this.allArticles$ ??= this.fetchPage(0).pipe(
      expand(data => data.hasNext && data.page < 99 ? this.fetchPage(data.page + 1) : EMPTY),
      reduce((items, page) => items.concat(page.articles || []), [] as PublicArticleSummary[]),
      map(items => items.sort((a, b) => b.id - a.id)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    return this.allArticles$.pipe(map(items => {
      const current = items.find(item => item.id === article.id || item.slug === article.slug);
      const category = article.category || current?.category;
      const tags = new Set((article.tags || []).map(tag => tag.toLowerCase()));
      const score = (item: PublicArticleSummary) => (category && item.category === category ? 2 : 0)
        + (item.tags || []).filter(tag => tags.has(tag.toLowerCase())).length;
      return items.filter((item, index) => item.slug && item.title && item.id !== article.id && item.slug !== article.slug
        && items.findIndex(other => other.slug === item.slug) === index)
        .sort((a, b) => score(b) - score(a)).slice(0, 3);
    }));
  }
}
