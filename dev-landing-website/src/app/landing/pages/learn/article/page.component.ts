import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, catchError, of, switchMap, takeUntil } from 'rxjs';
import { PublicNavbarComponent } from '../../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../components/common-footer/common-footer.component';
import { PublicArticlePage, PublicArticleSummary, PublicArticlesService } from './public-articles.service';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'app-article-page',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicNavbarComponent, CommonFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
})
export class ArticlePageComponent implements OnInit, OnDestroy {
  readonly fallbackImage = '/assets/Images-Thumbnails/Image-Content-ThumbnailRandom.jpg';
  result: PublicArticlePage | null = null;
  page = 0;
  loading = true;
  failed = false;
  private readonly destroyed = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly articles: PublicArticlesService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly seo: SeoService
  ) {}

  ngOnInit(): void {
    this.articles.refresh();
    this.route.queryParamMap.pipe(
      switchMap(params => {
        const raw = params.get('page');
        this.page = raw && /^\d+$/.test(raw) ? Math.min(Number(raw), 999) : 0;
        this.loading = true;
        this.failed = false;
        return this.articles.list(this.page).pipe(catchError(() => {
          this.failed = true;
          return of(null);
        }));
      }),
      takeUntil(this.destroyed)
    ).subscribe(result => {
      this.result = result;
      this.loading = false;
      this.seo.setArchivePageMetadata(this.page);
      this.changeDetector.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  articleUrl(article: PublicArticleSummary): string {
    return `/article/${encodeURIComponent(article.slug)}`;
  }

  pageUrl(page: number): string {
    return page === 0 ? '/blogs' : `/blogs?page=${page}`;
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith(this.fallbackImage)) image.src = this.fallbackImage;
  }
}
