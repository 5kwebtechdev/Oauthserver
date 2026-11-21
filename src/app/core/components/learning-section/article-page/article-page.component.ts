import { MicroRewardService } from 'src/app/core/services/micro-reward/micro-reward.service';
import { sessionStorageAdapter as localStorage } from '../../../storage/session-storage';
import { Component, ElementRef, ViewChild, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { Subject, of } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { SupermePopupConfig } from '../../superme-popup/superme-popup.component';
import { ArticleAnswerResult, LearningService } from 'src/app/core/services/learning.service';
import { BadgePopupService } from 'src/app/core/services/badge-popup.service';
import { PetAgeService } from 'src/app/core/services/pet-age.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';
import { Article, ArticleQuestion, Challenge, LearningCardData } from 'src/app/core/models/learning.models';
import { environment } from 'src/environments/environment';
import { articleRoute } from '../../../models/article-route';

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
    HttpClientModule
  ],
  providers: [LearningService]
})
export class ArticlePageComponent implements OnInit, OnDestroy {
  articleQuestions: ArticleQuestion[] = [];
  showArticleQuestions = false;
  @ViewChild('articleQuestionsSection') articleQuestionsSection?: ElementRef<HTMLElement>;
  selectedArticleAnswers: Record<number, number> = {};
  articleAnswersChecked = false;
  submittingArticleAnswers = false;
  articleAnswerError = '';
  articleAnswerResult: ArticleAnswerResult | null = null;

  answerCorrect(questionId: number): boolean | undefined {
    return this.articleAnswerResult?.answers.find(answer => answer.questionId === questionId)?.correct;
  }

  get allArticleQuestionsAnswered(): boolean {
    return this.articleQuestions.length > 0 && this.articleQuestions.every(question =>
      question.options.some(option => option.id === this.selectedArticleAnswers[question.id]));
  }

  selectArticleAnswer(questionId: number, optionId: number): void {
    if (!this.articleAnswersChecked && !this.submittingArticleAnswers) this.selectedArticleAnswers[questionId] = optionId;
  }

  checkArticleAnswers(): void {
    if (!this.article || !this.showArticleQuestions || !this.isAuthenticated || this.isParentAssignment || !this.allArticleQuestionsAnswered
      || this.submittingArticleAnswers || this.articleAnswersChecked || this.isMarking) return;
    this.submittingArticleAnswers = true;
    this.articleAnswerError = '';
    this.learningService.submitArticleAnswers(this.article.id, { ...this.selectedArticleAnswers })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: result => {
          this.submittingArticleAnswers = false;
          this.articleAnswerResult = result;
          this.articleAnswersChecked = true;
          if (result.completed) {
            this.article = { ...this.article!, alreadyRead: true };
            void this.playReadReward(result.questionCoinsAwarded);
            this.badgePopupService.check();
            this.petAgeService.recordActivity('articles');
            window.dispatchEvent(new CustomEvent('superme:learning-completed', { detail: { id: result.articleId, type: 'article' } }));
          }
          this.userService.refreshStats().pipe(takeUntil(this.destroy$)).subscribe({
            next: stats => { if (stats && Number.isFinite(stats.coins)) this.authService.updateUserData({ coins: stats.coins }); },
            error: () => { /* Submission succeeded; wallet refresh is independent. */ }
          });
        },
        error: () => {
          this.submittingArticleAnswers = false;
          this.articleAnswerError = 'We could not submit your answers. Please try again.';
        }
      });
  }

  trackQuestion(_: number, question: ArticleQuestion): number { return question.id; }
  trackQuestionOption(_: number, option: ArticleQuestion['options'][number]): number { return option.id; }
  article: Article | null = null;
  relatedChallenges: LearningCardData[] = [];
  relatedArticles: LearningCardData[] = [];
  primaryArticleContent = '';
  secondaryArticleContent = '';
  isLoading = true;
  isMarking = false;
  actionError = '';
  selectedHelpfulness: HelpfulnessValue | null = null;
  isSubmittingFeedback = false;
  feedbackError = '';
  feedbackSubmitted = false;
  private readonly microReward = inject(MicroRewardService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  showFeedbackPrompt = false;
  rewardMessage = '';
  showRewardAnimation = false;

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
  readonly isAuthenticated: boolean;
  readonly ringRadius = 17;
  readonly ringCircumference = 2 * Math.PI * this.ringRadius;
  remainingReadSeconds = this.minReadSeconds;
  readTimerDisplay = '01:00';
  readTimerInterval: any;
  readTimerComplete = false;
  justUnlocked = false;
  private justUnlockedTimeout: any;
  private readonly destroy$ = new Subject<void>();
  private canonicalLink: HTMLLinkElement | null = null;
  private previousCanonicalHref: string | null = null;
  private createdCanonicalLink = false;
  private readonly returnUrl: string;
  private readonly profileUserId: string | number | null;
  /** Parent detail pages assign the article to the selected child instead of reading it. */
  readonly parentAssignmentChildId: number | null;
  isParentAssignment = false;
  isAssigningToChild = false;
  parentAssignmentComplete = false;
  assignmentCoins = 20;

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
    private authService: AuthService,
    private userService: UserService
  ) {
    this.isAuthenticated = this.authService.isLoggedIn();
    const navigationState = this.router.getCurrentNavigation()?.extras.state || history.state;
    const source = String(navigationState?.['source'] || '');
    this.returnUrl = (source.startsWith('/') || source.startsWith('/authed/')) ? source : '/article';
    this.profileUserId = navigationState?.['ownProfile'] === true
      ? navigationState?.['forUserId'] ?? this.authService.getUserId()
      : null;
    const selectedChildId = Number(this.route.snapshot.queryParamMap.get('childId') ?? navigationState?.['selectedChildId']);
    this.parentAssignmentChildId = Number.isFinite(selectedChildId) && selectedChildId > 0 ? selectedChildId : null;
    this.isParentAssignment = this.route.snapshot.queryParamMap.get('parentAssign') === '1' || source.includes('view=parent');
    this.parentAssignmentComplete = this.isParentAssignment && navigationState?.['alreadyAssigned'] === true;
    const assignmentCoins = Number(navigationState?.['assignmentCoins']);
    if (Number.isFinite(assignmentCoins) && assignmentCoins > 0) this.assignmentCoins = Math.round(assignmentCoins);
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
    this.learningService.assignArticle(this.article.id, [this.parentAssignmentChildId], this.assignmentCoins)
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
      || (typeof article?.author === 'string' ? article.author : '')
      || article?.authorName
      || article?.createdByName
      || article?.createdBy?.name
      || createdBy
      || ''
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
    const value = article?.publishedAt || article?.publishedDate;
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      day: 'numeric',
      year: 'numeric', timeZone: 'UTC'
    }).format(date);
  }

  get articleReadAction(): string {
    return this.articleCoins > 0 ? `Read & Earn ${this.articleCoins} coins` : 'Mark this article as read';
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
    this.confirmMarkAsRead();
  }

  private async playReadReward(coins: number): Promise<void> {
    const user = this.authService.getUserData();
    const role = String(user?.relationship).toUpperCase();
    const articleId = this.article?.id;
    if (role === 'CHILD' || role === 'PARENT') {
      const from = this.element.nativeElement.querySelector<HTMLElement>('.learning-details-action__button')
        ?? this.element.nativeElement;
      await this.microReward.celebrate({ from, coins, balance: Number(user?.coins) || 0, pill: 'floating', confetti: false })
        .catch(() => undefined);
    } else {
      this.showRewardAnimation = coins > 0;
    }
    if (this.article?.id === articleId && this.element.nativeElement.isConnected) {
      this.showFeedbackPrompt = !this.feedbackSubmitted;
    }
  }

  openFeedbackPrompt(): void {
    this.confirmMarkAsRead();
  }

  closeMarkPopup(): void {
    this.showMarkPopup = false;
  }

  confirmMarkAsRead(): void {
    if (!this.article || this.isArticleRead || !this.readTimerComplete || this.isMarking || this.submittingArticleAnswers) return;
    if (this.articleQuestions.length) {
      this.showArticleQuestions = true;
      setTimeout(() => this.articleQuestionsSection?.nativeElement.scrollIntoView({ block: 'start', behavior: 'smooth' }));
      return;
    }
    this.microReward.unlockSound();
    this.isMarking = true;
    this.actionError = '';
    this.learningService.markArticleComplete(
      this.article.id,
      undefined,
      this.profileUserId
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: response => {
        this.isMarking = false;
        this.showMarkPopup = false;
        this.article = { ...this.article!, alreadyRead: true };
        this.rewardMessage = `You have received ${this.articleCoins} coins for completing this article.`;
        void this.playReadReward(Number(response?.coinsAwarded ?? response?.coinsEarned ?? this.articleCoins));
        this.userService.refreshStats().pipe(takeUntil(this.destroy$)).subscribe({
          next: stats => {
            if (stats && Number.isFinite(stats.coins)) {
              this.authService.updateUserData({ coins: stats.coins });
            }
          },
          error: () => { /* Completion succeeded; wallet refresh can retry on the next screen. */ }
        });
        this.petAgeService.recordActivity('articles');
        this.badgePopupService.check();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('superme:learning-completed', {
            detail: { id: this.article?.id, type: 'article' }
          }));
        }
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
    const articleId = this.route.snapshot.paramMap.get('id');
    const slug = this.route.snapshot.paramMap.get('slug');
    const legacyId = articleId || (slug && /^\d+$/.test(slug) ? slug : null);
    const articleRequest = slug && !legacyId
      ? this.learningService.fetchPublicArticleBySlug(slug).pipe(
          switchMap(publicArticle => publicArticle && this.isAuthenticated
            ? this.learningService.fetchArticleById(publicArticle.id, this.profileUserId)
                .pipe(map(accountArticle => accountArticle || publicArticle))
            : of(publicArticle)))
      : legacyId && this.isAuthenticated
        ? this.learningService.fetchArticleById(legacyId, this.profileUserId)
        : of(null);

    if (articleId || slug) {
      articleRequest
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: (article) => {
          this.article = article;
          this.showArticleQuestions = false;
          this.selectedArticleAnswers = {};
          this.articleAnswersChecked = false;
          this.articleAnswerResult = null;
          this.articleAnswerError = '';
          this.articleQuestions = [...(article?.questions || [])]
            .sort((a, b) => a.questionOrder - b.questionOrder)
            .map(question => ({ ...question, options: [...(question.options || [])]
              .sort((a, b) => a.optionOrder - b.optionOrder) }));
          this.isLoading = false;
          if (article) {
            this.updateCanonical(article.slug);
            if (article.slug && (legacyId || this.route.snapshot.routeConfig?.path === 'articles/:slug')) {
              void this.router.navigate(['/article', article.slug], {
                replaceUrl: true,
                queryParamsHandling: 'preserve',
                state: { ...history.state }
              });
            }
            this.prepareArticleContent(article.content);
            this.initializeHelpfulness(article);
            this.loadRelatedChallenges(article);
            this.loadRelatedArticles(article);
            this.updatePopupRewardCopy();
            if (this.isAuthenticated) this.startReadingTimer();
          }
        },
        error: (error) => {
          console.error('Error loading article:', error);
          this.isLoading = false;
        }
      });
    } else {
      console.error('No article identifier provided in route');
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopReadingTimer();
    if (this.canonicalLink) {
      if (this.createdCanonicalLink) this.canonicalLink.remove();
      else if (this.previousCanonicalHref !== null) this.canonicalLink.href = this.previousCanonicalHref;
    }
    if (this.justUnlockedTimeout) {
      clearTimeout(this.justUnlockedTimeout);
      this.justUnlockedTimeout = null;
    }
  }

  goBack(): void {
    this.location.back();
  }

  async shareArticle(): Promise<void> {
    if (!this.article?.slug) return;

    try {
      await Share.share({
        // Some share targets append the subject to the message. Keep the
        // article title only in the message so it isn't repeated.
        text: this.article.title,
        url: this.getPublicArticleUrl(),
        dialogTitle: `Share ${this.article.title}`
      });
    } catch (error) {
      console.warn('Article share is unavailable:', error);
    }
  }

  selectHelpfulness(value: HelpfulnessValue): void {
    if (!this.article || !this.isArticleRead || !this.showFeedbackPrompt || this.isSubmittingFeedback || this.feedbackSubmitted) return;
    this.selectedHelpfulness = value;
    this.feedbackError = '';

    this.isSubmittingFeedback = true;
    this.learningService.markArticleComplete(this.article.id, this.toArticleFeedback(value), this.profileUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmittingFeedback = false;
          this.feedbackSubmitted = true;
          this.showFeedbackPrompt = false;
          try {
            localStorage.setItem(this.getFeedbackStorageKey(this.article!.id), value);
          } catch { /* Storage can be unavailable in restricted browser modes. */ }
          this.goBack();
        },
        error: () => {
          this.isSubmittingFeedback = false;
          this.selectedHelpfulness = null;
          this.feedbackError = 'We could not save your feedback. Please try again.';
        }
      });
  }

  private getPublicArticleUrl(): string {
    const baseUrl = String(environment.publicWebUrl || 'https://supermeapp.com').replace(/\/+$/, '');
    return `${baseUrl}/article/${encodeURIComponent(this.article!.slug!)}`;
  }

  private updateCanonical(slug: string | undefined): void {
    if (!slug || typeof document === 'undefined') return;
    const href = this.getPublicArticleUrl();
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
      this.createdCanonicalLink = true;
    } else if (!this.canonicalLink) {
      this.previousCanonicalHref = link.href;
    }
    this.canonicalLink = link;
    link.href = href;
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
    void this.router.navigate(['/authed/content/description', relatedChallenge.id], {
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
    const html = String(content || '').trim().replace(/<(\/?)h1\b/gi, '<$1h2');
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

  private loadRelatedArticles(article: Article): void {
    this.relatedArticles = [];
    if (!this.isAuthenticated) return;
    const keywords = this.getArticleKeywords(article);
    if (!keywords.size) return;
    this.learningService.fetchArticles(false, this.profileUserId).pipe(takeUntil(this.destroy$)).subscribe({
      next: articles => {
        if (String(this.article?.id) !== String(article.id)) return;
        const seen = new Set<string>([String(article.id)]);
        this.relatedArticles = articles
          .filter(item => {
            if (seen.has(String(item.id)) || String(item.status).toUpperCase() === 'DRAFT') return false;
            seen.add(String(item.id));
            return true;
          })
          .map(item => ({
            item,
            matches: [...this.getArticleKeywords(item)].filter(keyword => keywords.has(keyword)).length
          }))
          .filter(({ matches }) => matches > 0)
          .sort((a, b) => b.matches - a.matches)
          .slice(0, 3)
          .map(({ item }) => this.learningService.transformArticleToCard(item));
      },
      error: () => { /* Recommendations must not block reading the article. */ }
    });
  }

  private getArticleKeywords(article: Article): Set<string> {
    const keywords = typeof article.keywords === 'string' ? article.keywords.split(',') : article.keywords ?? [];
    return new Set(keywords.map(keyword => keyword.trim().toLowerCase()).filter(Boolean));
  }

  openRelatedArticle(article: LearningCardData): void {
    void this.router.navigate(articleRoute(article), {
      state: { source: this.router.url, ...(this.profileUserId != null
        ? { forUserId: this.profileUserId, ownProfile: true } : {}) }
    });
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
