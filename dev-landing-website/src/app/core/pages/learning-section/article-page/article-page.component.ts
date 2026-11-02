import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil, switchMap, of, map } from 'rxjs';
import { LearningService } from '../learning.service';
import { Article } from '../learning.models';
import { MoodService } from '../../../services/mood.service';
import { AuthService } from '../../../services/auth.service';
import { SeoService } from '../../../services/seo.service';
import { PublicNavbarComponent } from '../../../components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../../landing/components/common-footer/common-footer.component';
import { PublicArticlesService, PublicArticleSummary } from '../../../../landing/pages/learn/article/public-articles.service';
@Component({
    selector: 'app-article-page',
    standalone: true,
    imports: [CommonModule, RouterLink, PublicNavbarComponent, CommonFooterComponent],
    templateUrl: './article-page.component.html',
    styleUrls: ['./article-page.component.scss']
})
export class ArticlePageComponent implements OnInit, OnDestroy {
    article: Article | null = null;
    loading = true;
    error: string | null = null;
    isMarked = false;
    isMarking = false;
    showMarkPopup = false;
    isAuthenticated = false;
    sanitizedContent: SafeHtml = '';
    relatedArticles: PublicArticleSummary[] = [];
    shareStatus = '';
    private readonly articleChanged$ = new Subject<void>();
    private articleId: number | null = null;
    private destroy$ = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        public router: Router,
        private learningService: LearningService,
        private sanitizer: DomSanitizer,
        private moodService: MoodService,
        private authService: AuthService,
        private seoService: SeoService,
        private location: Location,
        private publicArticles: PublicArticlesService
    ) { }

    ngOnInit(): void {
        this.isAuthenticated = this.authService.isLoggedIn();
        this.route.data.pipe(
            switchMap(data => {
                this.articleChanged$.next();
                this.article = null;
                this.relatedArticles = [];
                this.loading = true;
                this.error = null;
                this.shareStatus = '';
                this.showMarkPopup = false;
                const resolved = data['articleSelection'];
                if (resolved?.article) {
                    const article = resolved.article as Article;
                    return this.isAuthenticated
                        ? this.learningService.fetchArticleById(article.id).pipe(map(accountArticle => accountArticle || article))
                        : of(article);
                }
                const id = resolved?.id || this.route.snapshot.paramMap.get('id');
                if (!id) {
                    this.error = resolved?.error || 'Article not found';
                    return of(null);
                }
                const state = typeof history !== 'undefined' ? history.state : null;
                return state?.article && Number(state.article.id) === Number(id)
                    ? of(state.article as Article) : this.learningService.fetchArticleById(+id);
            }),
            takeUntil(this.destroy$)
        ).subscribe(article => {
            if (article) this.showArticle(article);
            else {
                this.error ||= 'Article not found';
                this.loading = false;
                this.seoService.setArticleUnavailable(this.error);
            }
        });
    }

    ngOnDestroy(): void {
        this.articleChanged$.next();
        this.articleChanged$.complete();
        this.seoService.clearArticleSchema();
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadArticle(id: number): void {
        this.learningService.fetchArticleById(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (article) => {
                    if (article) this.showArticle(article);
                    else {
                        this.error = 'This article link is unavailable.';
                        this.loading = false;
                    }
                },
                error: () => {
                    this.error = 'Failed to load article';
                    this.loading = false;
                }
            });
    }

    private showArticle(article: Article): void {
        this.articleChanged$.next();
        this.relatedArticles = [];
        this.article = article;
        this.articleId = article.id;
        this.isMarked = !!article.alreadyRead;
        this.updateSanitizedContent();
        this.loading = false;
        this.publicArticles.related(article).pipe(takeUntil(this.articleChanged$), takeUntil(this.destroy$))
            .subscribe({ next: items => this.relatedArticles = items, error: () => this.relatedArticles = [] });
        if (article.slug) {
            this.seoService.setArticleMetadata(article);
            const canonicalPath = `/article/${encodeURIComponent(article.slug)}`;
            if (this.router.url.split('?')[0] !== canonicalPath) {
                this.location.replaceState(canonicalPath, this.router.url.split('?')[1] || '');
            }
        }
    }

    get readTime(): string {
        if (!this.article?.readTime) return '5 min read';
        const mins = Math.ceil(this.article.readTime / 60);
        return `${mins} min read`;
    }

    get formattedDate(): string {
        const value = this.article?.publishedAt || this.article?.publishedDate;
        if (!value || Number.isNaN(new Date(value).valueOf())) return '';
        return new Date(value).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric', timeZone: 'UTC'
        });
    }

    get authorName(): string { return this.article?.publishedBy?.trim() || this.article?.author?.trim() || ''; }
    get featuredImage(): string { return this.article?.thumbnailUrl || this.article?.imageUrl || ''; }
    hideBrokenImage(event: Event): void { (event.target as HTMLImageElement).hidden = true; }

    private updateSanitizedContent(): void {
        if (this.article?.content) {
            // The title owns the only H1. Angular sanitizes the CMS body.
            this.sanitizedContent = this.article.content.replace(/<(\/?)h1\b/gi, '<$1h2');
        }
    }

    onBack(): void {
        if (this.isAuthenticated) { this.location.back(); return; }
        const previous = typeof history !== 'undefined' ? history.state?.blogSource : '';
        if (typeof previous === 'string' && /^\/(?:blogs(?:\?page=\d+)?|article\/[a-z0-9-]+)$/.test(previous)) {
            this.location.back();
        } else if (typeof document !== 'undefined' && document.referrer) {
            const referrer = new URL(document.referrer);
            if (referrer.origin === location.origin && /^\/(?:blogs|article\/[^/]+)\/?$/.test(referrer.pathname)) {
                this.location.back(); return;
            }
            this.router.navigate(['/blogs']);
        } else this.router.navigate(['/blogs']);
    }

    articleUrl(slug: string): string { return `/article/${encodeURIComponent(slug)}`; }
    async shareArticle(): Promise<void> {
        if (!this.article?.slug || typeof navigator === 'undefined') return;
        const url = `https://supermeapp.com${this.articleUrl(this.article.slug)}`;
        try {
            if (navigator.share) await navigator.share({ title: this.article.title, url });
            else { await navigator.clipboard.writeText(url); this.shareStatus = 'Article link copied'; }
        } catch (error) { if ((error as Error).name !== 'AbortError') this.shareStatus = 'Unable to share. Please copy the page URL.'; }
    }

    openMarkPopup(): void {
        this.showMarkPopup = true;
    }

    closeMarkPopup(): void {
        this.showMarkPopup = false;
    }

    confirmMarkAsRead(): void {
        if (!this.articleId || this.isMarked || this.isMarking) return;
        this.isMarking = true;
        this.learningService.markArticleAsRead(this.articleId)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.isMarked = true;
                this.isMarking = false;
                this.showMarkPopup = false;
                this.moodService.refreshRewardStats();
                this.router.navigate(['/home/learning']);
            });
    }
}
