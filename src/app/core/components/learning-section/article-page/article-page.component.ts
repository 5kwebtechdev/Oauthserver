import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupermePopupConfig } from '../../superme-popup/superme-popup.component';
import { AdBannerComponent } from '../../ad-banner/ad-banner.component';
import { LearningService } from 'src/app/core/services/learning.service';
import { BadgePopupService } from 'src/app/core/services/badge-popup.service';
import { PetAgeService } from 'src/app/core/services/pet-age.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Article, Challenge, LearningCardData } from 'src/app/core/models/learning.models';
import { environment } from 'src/environments/environment';

type HelpfulnessValue = 'very-helpful' | 'helpful' | 'not-helpful';
type ArticleFeedback = 'VERY_HELPFUL' | 'HELPFUL' | 'NOT_HELPFUL';

interface HelpfulnessOption {
  value: HelpfulnessValue;
  label: string;
  image: string;
}

@Component({
  selector: 'app-article-page',
  templateUrl: './article-page.component.html',
  styleUrls: ['./article-page.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonicModule,
    HttpClientModule,
    AdBannerComponent
  ],
  providers: [LearningService]
})
export class ArticlePageComponent implements OnInit, OnDestroy {
  article: Article | null = null;
  relatedChallenges: LearningCardData[] = [];
  primaryArticleContent = '';
  secondaryArticleContent = '';
  isLoading = true;
  isMarking = false;
  actionError = '';
  selectedHelpfulness: HelpfulnessValue | null = null;
  isSubmittingFeedback = false;
  feedbackError = '';
  feedbackSubmitted = false;
  showFeedbackPrompt = false;

  readonly helpfulnessOptions: HelpfulnessOption[] = [
    {
      value: 'very-helpful',
      label: 'Very Helpful',
      image: 'assets/figma/learning-details/very-helpful-hd.webp'
    },
    {
      value: 'helpful',
      label: 'Helpful',
      image: 'assets/figma/learning-details/helpful-hd.webp'
    },
    {
      value: 'not-helpful',
      label: 'Not Helpful',
      image: 'assets/figma/learning-details/not-helpful-hd.webp'
    }
  ];

  // Minimum reading time gate
  readonly minReadSeconds = 60;
  readonly ringRadius = 17;
  readonly ringCircumference = 2 * Math.PI * this.ringRadius;
  remainingReadSeconds = this.minReadSeconds;
  readTimerDisplay = '01:00';
  readTimerInterval: any;
  readTimerComplete = false;
  justUnlocked = false;
  private justUnlockedTimeout: any;
  private readonly destroy$ = new Subject<void>();
  private readonly returnUrl: string;
  private readonly profileUserId: string | number | null;
  /** Parent detail pages assign the article to the selected child instead of reading it. */
  readonly parentAssignmentChildId: number | null;
  isParentAssignment = false;
  isAssigningToChild = false;
  parentAssignmentComplete = false;

  // Popup state and config
  showMarkPopup = false;
  markPopupConfig: SupermePopupConfig = {
    image: 'assets/Images-Transparent/Image-Home-GreatWork.webp',
    imageAlt: 'Great work',
    heading: 'Great job reading!',
    subtitle: "You'll earn 10 coins when you mark this article as read. Are you sure you want to complete it?",
    primaryCTA: {
      text: 'Mark as Read',
      buttonStyle: 'green',
      buttonMedium: true
    },
    secondaryCTA: {
      text: 'Cancel',
      buttonStyle: 'bronze-transparent',
      buttonMedium: true
    },
    showCloseButton: true,
    backdrop: true,
    ctaDirection: 'row'
  };

  constructor(
    private route: ActivatedRoute,
    private learningService: LearningService,
    public router: Router,
    private location: Location,
    private badgePopupService: BadgePopupService,
    private petAgeService: PetAgeService,
    private authService: AuthService
  ) {
    const navigationState = this.router.getCurrentNavigation()?.extras.state || history.state;
    const source = String(navigationState?.['source'] || '');
    this.returnUrl = source.startsWith('/authed/') ? source : '/authed/content';
    this.profileUserId = navigationState?.['ownProfile'] === true
      ? navigationState?.['forUserId'] ?? this.authService.getUserId()
      : null;
    const selectedChildId = Number(navigationState?.['selectedChildId']);
    this.parentAssignmentChildId = Number.isFinite(selectedChildId) && selectedChildId > 0 ? selectedChildId : null;
    this.isParentAssignment = source.includes('view=parent') && this.parentAssignmentChildId !== null;
  }

  get isArticleRead(): boolean {
    return !!this.article?.alreadyRead;
  }

  get isMarkAsReadDisabled(): boolean {
    return this.isMarking || this.isArticleRead || !this.readTimerComplete;
  }

  assignToChild(): void {
    if (!this.article || !this.isParentAssignment || !this.parentAssignmentChildId || this.isAssigningToChild || this.parentAssignmentComplete) return;
    this.isAssigningToChild = true;
    this.actionError = '';
    this.learningService.assignArticle(this.article.id, [this.parentAssignmentChildId], 20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isAssigningToChild = false;
          this.parentAssignmentComplete = true;
          this.actionError = '';
        },
        error: (error) => {
          this.isAssigningToChild = false;
          this.actionError = String(error?.error?.message || error?.message || 'Unable to assign this article. Please try again.');
        }
      });
  }

  get readTimerProgressPercent(): number {
    if (this.minReadSeconds <= 0) return 100;
    const elapsed = this.minReadSeconds - this.remainingReadSeconds;
    return Math.min(100, Math.max(0, (elapsed / this.minReadSeconds) * 100));
  }

  get articleImage(): string {
    const article = this.article as any;
    return String(
      article?.heroImageUrl
      || article?.coverImageUrl
      || article?.thumbnailUrl
      || article?.image
      || ''
    ).trim();
  }

  get articleAuthorName(): string {
    const article = this.article as any;
    const createdBy = typeof article?.createdBy === 'string' ? article.createdBy : '';
    return String(
      article?.publishedBy
      || article?.author?.name
      || article?.authorName
      || article?.createdByName
      || article?.createdBy?.name
      || createdBy
      || 'SuperMeApp'
    );
  }

  get articleAuthorImage(): string {
    const article = this.article as any;
    return String(
      article?.author?.avatarUrl
      || article?.authorAvatarUrl
      || article?.createdByAvatarUrl
      || 'assets/figma/learning-details/app-icon.webp'
    );
  }

  get articleReadTime(): string {
    const article = this.article as any;
    const numericMinutes = Number(
      article?.durationMinutes
      || article?.estimatedTimeMinutes
      || article?.readTimeMinutes
      || 0
    );
    if (numericMinutes > 0) return `${numericMinutes} min`;

    const rawDuration = String(article?.timeDuration || '').trim();
    if (/\d/.test(rawDuration)) {
      return /min|hour|sec/i.test(rawDuration) ? rawDuration : `${rawDuration} min`;
    }

    const durationBySize: Record<string, number> = { SHORT: 5, MEDIUM: 10, LONG: 15 };
    const mappedMinutes = durationBySize[rawDuration.toUpperCase()];
    return mappedMinutes ? `${mappedMinutes} min` : '';
  }

  get articlePublishedDate(): string {
    const article = this.article as any;
    const value = article?.publishedAt || article?.createdAt || article?.updatedAt;
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  get articleCoins(): number {
    const article = this.article as any;
    return Math.max(0, Number(article?.coins ?? article?.rewardCoins ?? 0) || 0);
  }

  /**
   * Mark the current article as read by calling the API
   */
  markAsRead(): void {
    // Deprecated: markAsRead is now handled via the confirmation popup.
    this.openMarkAsReadPopup();
  }

  openMarkAsReadPopup(): void {
    this.openFeedbackPrompt();
  }

  openFeedbackPrompt(): void {
    if (!this.article || this.isArticleRead || !this.readTimerComplete || this.isMarking) return;
    this.feedbackError = '';
    this.showFeedbackPrompt = true;
    // The prompt is rendered below the CTA. Bring it into view immediately so
    // the user can rate the article as part of the same completion action.
    setTimeout(() => {
      document.querySelector<HTMLElement>('.learning-details-feedback')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  closeMarkPopup(): void {
    this.showMarkPopup = false;
  }

  confirmMarkAsRead(): void {
    if (!this.article || this.isArticleRead || this.isMarking) return;
    this.isMarking = true;
    this.actionError = '';
    this.learningService.markArticleComplete(
      this.article.id,
      this.toArticleFeedback(this.selectedHelpfulness),
      this.profileUserId
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (res) => {
        console.log('Article marked as read response:', res);
        this.isMarking = false;
        this.showMarkPopup = false;
        this.petAgeService.recordActivity('articles');
        this.badgePopupService.check();
        void this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        console.error('Failed to mark article as read:', err);
        this.isMarking = false;
        this.showMarkPopup = false;
        this.actionError = 'We could not update this article. Please try again.';
      }
    });
  }

  ngOnInit() {
    // Get article ID from route parameters
    const articleId = this.route.snapshot.paramMap.get('id');
    console.log('Article ID from route:', articleId);

    if (articleId) {
      this.learningService.fetchArticleById(Number(articleId), this.profileUserId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: (article) => {
          console.log('Article loaded:', article);
          this.article = article;
          this.isLoading = false;
          if (article) {
            this.prepareArticleContent(article.content);
            this.initializeHelpfulness(article);
            this.loadRelatedChallenges(article);
            this.updatePopupRewardCopy();
            this.startReadingTimer();
          }
        },
        error: (error) => {
          console.error('Error loading article:', error);
          this.isLoading = false;
        }
      });
    } else {
      console.error('No article ID provided in route');
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopReadingTimer();
    if (this.justUnlockedTimeout) {
      clearTimeout(this.justUnlockedTimeout);
      this.justUnlockedTimeout = null;
    }
  }

  goBack(): void {
    this.location.back();
  }

  async shareArticle(): Promise<void> {
    if (!this.article) return;

    try {
      await Share.share({
        title: this.article.title,
        text: this.article.description || this.article.title,
        url: this.getPublicArticleUrl(),
        dialogTitle: `Share ${this.article.title}`
      });
    } catch (error) {
      console.warn('Article share is unavailable:', error);
    }
  }

  selectHelpfulness(value: HelpfulnessValue): void {
    if (!this.article || this.isArticleRead || !this.showFeedbackPrompt || this.isSubmittingFeedback || this.feedbackSubmitted) return;
    this.selectedHelpfulness = value;
    this.feedbackError = '';

    this.isSubmittingFeedback = true;
    this.isMarking = true;
    this.learningService.markArticleComplete(this.article.id, this.toArticleFeedback(value), this.profileUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmittingFeedback = false;
          this.isMarking = false;
          this.feedbackSubmitted = true;
          this.showFeedbackPrompt = false;
          this.article = { ...this.article!, alreadyRead: true };
          this.petAgeService.recordActivity('articles');
          this.badgePopupService.check();
          try {
            localStorage.setItem(this.getFeedbackStorageKey(this.article!.id), value);
          } catch { /* Storage can be unavailable in restricted browser modes. */ }
        },
        error: () => {
          this.isSubmittingFeedback = false;
          this.isMarking = false;
          this.selectedHelpfulness = null;
          this.feedbackError = 'We could not save your feedback. Please try again.';
        }
      });
  }

  private getPublicArticleUrl(): string {
    const baseUrl = String(environment.publicWebUrl || 'https://supermeapp.com').replace(/\/+$/, '');
    return `${baseUrl}/authed/content/article/${encodeURIComponent(String(this.article?.id || ''))}`;
  }

  private toArticleFeedback(value: HelpfulnessValue | null): ArticleFeedback | undefined {
    const feedback: Record<HelpfulnessValue, ArticleFeedback> = {
      'very-helpful': 'VERY_HELPFUL',
      helpful: 'HELPFUL',
      'not-helpful': 'NOT_HELPFUL'
    };
    return value ? feedback[value] : undefined;
  }

  private getFeedbackStorageKey(articleId: number): string {
    const user = this.authService.getUserData() || {};
    const userId = String(user.id || user.userId || user.email || 'anonymous').trim();
    return `superme_article_helpfulness_${userId}_${articleId}`;
  }

  openRelatedChallenge(relatedChallenge: LearningCardData): void {
    if (!relatedChallenge?.id) return;
    void this.router.navigate(['/authed/content/questions', relatedChallenge.id], {
      state: {
        source: this.router.url,
        ...(this.profileUserId != null
          ? { forUserId: this.profileUserId, ownProfile: true }
          : {})
      }
    });
  }

  getRelatedDifficulty(relatedChallenge: LearningCardData): string {
    const raw = relatedChallenge.rawData as any;
    return String(
      relatedChallenge.difficulty
      || raw?.difficultyDisplay
      || raw?.difficulty
      || ''
    );
  }

  getRelatedDuration(relatedChallenge: LearningCardData): string {
    const raw = relatedChallenge.rawData as any;
    const value = relatedChallenge.timeDuration
      || raw?.estimatedTimeMinutes
      || raw?.timeDuration;

    if (typeof value === 'number') return `${value} min`;
    const text = String(value || '').trim();
    return text && !/min|hour|sec/i.test(text) ? `${text} min` : text;
  }

  hasRelatedImage(relatedChallenge: LearningCardData): boolean {
    const image = String(relatedChallenge?.image || '').trim();
    return !!image && !image.includes('Flux_Dev_a_surreal');
  }

  trackRelatedChallenge(index: number, relatedChallenge: LearningCardData): number | string {
    return relatedChallenge.id || index;
  }

  hideBrokenImage(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  useAuthorFallback(event: Event): void {
    const image = event.target as HTMLImageElement;
    const fallback = 'assets/figma/learning-details/app-icon.webp';
    if (!image.src.endsWith(fallback)) image.src = fallback;
  }

  /**
   * Start the 60-second minimum reading time countdown.
   * Skips entirely if the article is already marked as read.
   */
  private startReadingTimer(): void {
    if (this.isArticleRead) {
      this.readTimerComplete = true;
      return;
    }

    this.remainingReadSeconds = this.minReadSeconds;
    this.updateReadTimerDisplay();

    this.readTimerInterval = setInterval(() => {
      this.remainingReadSeconds--;
      this.updateReadTimerDisplay();

      if (this.remainingReadSeconds <= 0) {
        this.stopReadingTimer();
        this.onReadingTimerComplete();
      }
    }, 1000);
  }

  private stopReadingTimer(): void {
    if (this.readTimerInterval) {
      clearInterval(this.readTimerInterval);
      this.readTimerInterval = null;
    }
  }

  private updateReadTimerDisplay(): void {
    const minutes = Math.floor(this.remainingReadSeconds / 60);
    const seconds = this.remainingReadSeconds % 60;
    this.readTimerDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private onReadingTimerComplete(): void {
    this.readTimerComplete = true;
    this.justUnlocked = true;
    this.justUnlockedTimeout = setTimeout(() => {
      this.justUnlocked = false;
    }, 4000);
  }

  private prepareArticleContent(content: string | null | undefined): void {
    const html = String(content || '').trim();
    this.primaryArticleContent = html;
    this.secondaryArticleContent = '';
    if (!html || typeof document === 'undefined') return;

    const container = document.createElement('div');
    container.innerHTML = html;
    const nodes = Array.from(container.childNodes);
    if (nodes.length < 2) return;

    const isHeading = (node: Node) => node instanceof Element && /^H[1-6]$/.test(node.tagName);
    const serialize = (node: Node) => node instanceof Element ? node.outerHTML : (node.textContent || '');
    const firstHeadingIndex = nodes.findIndex(isHeading);
    const nextHeadingIndex = nodes.findIndex((node, index) => (
      index > Math.max(firstHeadingIndex, 0) && isHeading(node)
    ));

    if (nextHeadingIndex <= 0) return;
    this.primaryArticleContent = nodes.slice(0, nextHeadingIndex).map(serialize).join('');
    this.secondaryArticleContent = nodes.slice(nextHeadingIndex).map(serialize).join('');
  }

  private initializeHelpfulness(article: Article): void {
    const apiValue = String((article as any)?.helpfulness || (article as any)?.feedback || '')
      .trim()
      .toLowerCase()
      .replace(/_/g, '-');

    if (apiValue === 'very-helpful' || apiValue === 'helpful' || apiValue === 'not-helpful') {
      this.selectedHelpfulness = apiValue;
      this.feedbackSubmitted = true;
      this.showFeedbackPrompt = false;
      return;
    }

    try {
      const storedValue = localStorage.getItem(this.getFeedbackStorageKey(article.id)) as HelpfulnessValue | null;
      if (storedValue === 'very-helpful' || storedValue === 'helpful' || storedValue === 'not-helpful') {
        this.selectedHelpfulness = storedValue;
        this.feedbackSubmitted = true;
        this.showFeedbackPrompt = false;
      }
    } catch { /* Storage can be unavailable in restricted browser modes. */ }
  }

  private loadRelatedChallenges(article: Article): void {
    const relatedChallenges = Array.isArray(article.relatedChallenges)
      ? article.relatedChallenges
      : [];

    this.relatedChallenges = relatedChallenges
      .filter((challenge): challenge is Challenge => !!challenge && typeof challenge === 'object')
      .map(challenge => this.learningService.transformChallengeToCard(challenge as Challenge))
      .filter(challenge => Number.isFinite(Number(challenge.id)) && Number(challenge.id) > 0);
  }

  private updatePopupRewardCopy(): void {
    this.markPopupConfig = {
      ...this.markPopupConfig,
      subtitle: this.articleCoins > 0
        ? `You'll earn ${this.articleCoins} coins when you mark this article as read. Are you sure you want to complete it?`
        : 'Mark this article as read to complete it.'
    };
  }
}
