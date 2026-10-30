import { Component, OnInit, OnDestroy, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core/services/loading.service';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeInputsModule } from '../../superme-inputs/superme-inputs.module';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { ChallengeSubmissionResponse, Challenge } from 'src/app/core/models/learning.models';
import { BadgePopupService } from 'src/app/core/services/badge-popup.service';
import { ScoreStatusComponent } from './score-status.component';
import { AuthService } from 'src/app/core/services/auth.service';
import { BadgeApi } from 'src/app/core/api/badge.api';
import { BadgeCard, mapBadgeResponse } from '../../badge-section/badge-view-model';
import { BadgeArtComponent } from '../../badge-section/badge-art.component';

interface ResultNavigationState {
  submissionResult?: ChallengeSubmissionResponse | Record<string, unknown>;
  challenge?: Challenge;
  timeTaken?: number;
  source?: string;
}

@Component({
  selector: 'app-result-page',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    SupermeNavigatorComponent,
    BadgeArtComponent,
    ScoreStatusComponent,
    SupermeInputsModule,
    SupermeButtonComponent
  ],
  templateUrl: './result-page.component.html',
  styleUrls: ['./result-page.component.scss']
})
export class ResultPageComponent implements OnInit, OnDestroy {
  private readonly resultStorageKey = 'superme.challenge-result';
  private returnUrl = '/authed/content';

  // Keep result rewards aligned with the current Home/Insights icon set.
  readonly rewardCoinIcon = 'assets/icons/superme-coin.webp';
  readonly fallbackBadgeIcon = 'assets/Icons-Neutral/Icon-Badge.webp';

  // Results from submission
  submissionResult: ChallengeSubmissionResponse | null = null;
  badges: any[] = [];
  badgeCards: BadgeCard[] = [];
  challenge: Challenge | null = null;
  timeTaken = 0;

  // Computed properties for display
  totalQuestions = 0;
  correctAnswers = 0;
  scorePercentage = 0;
  coinsEarned = 0;
  trophiesEarned = 0;
  totalCoins = 0;
  totalTrophies = 0;
  celebrationText = '';
  overallFeedback = '';
  firstCompletion = false;
  earnedNewBadge = false;
  newlyEarnedBadges: any[] = [];
  badgeCelebrationMessage = '';
  challengeCompleted = false;
  hasSubmissionResult = false;

  private backButtonSub?: Subscription;
  private badgeProgressSub?: Subscription;

  constructor(
    private router: Router,
    private loadingService: LoadingService,
    private platform: Platform,
    private badgePopupService: BadgePopupService,
    private badgeApi: BadgeApi,
    @Optional() private authService?: AuthService
  ) {
    // Get data from router state
    const navigation = this.router.getCurrentNavigation();
    // `getCurrentNavigation()` can be unavailable by the time a lazy-loaded
    // result route is constructed. Recover the same state from browser
    // history, then session storage as a final WebView-safe fallback.
    const state = this.getResultNavigationState(navigation?.extras?.state)
      || this.getResultNavigationState(history.state)
      || this.getStoredResultNavigationState();

    if (state?.submissionResult) {
      this.submissionResult = this.unwrapSubmissionResult(state.submissionResult);
      this.challenge = state.challenge || null;
      this.timeTaken = state.timeTaken || 0;
      if (typeof state.source === 'string' && state.source.startsWith('/')) {
        this.returnUrl = state.source;
      }
    }
  }

  ngOnInit() {
    // Ensure any global loaders are cleared when arriving on the results page
    // (covers cases where previous page left a loader token active)
    try { this.loadingService.reset(); } catch (e) { }
    if (this.submissionResult) {
      this.applySubmissionResult(this.submissionResult);
      this.badgeCards = this.selectResultBadges(mapBadgeResponse({
        badges: this.badges.map(badge => ({ ...badge, title: badge.title || badge.name }))
      }).progress);
      // The submission only includes challenge-related badges. The existing
      // badge-progress endpoint supplies the second card and current totals.
      this.badgeProgressSub = this.badgeApi.getBadgeProgress().subscribe({
        next: response => {
          const cards = mapBadgeResponse(response).progress;
          if (cards.length) this.badgeCards = this.selectResultBadges(cards);
        },
        error: () => { /* Keep submission badge progress when this request fails. */ }
      });
    } else {
      console.warn('No submission result found in router state');
    }

    this.badgePopupService.check();

    // Intercept Android/Capacitor hardware back button with higher priority
    // than the global AppComponent handler (which uses priority 10).
    this.backButtonSub = this.platform.backButton.subscribeWithPriority(20, () => {
      this.goToContent();
    });

    // Also intercept browser/iOS swipe-back (popstate) on web and PWA.
    // Do not push a second history entry here: that made the first Back press
    // land on the same result page again. Replace the current entry instead,
    // then let the previous page's popstate take us back to the content list.
    history.replaceState({ ...(history.state || {}), resultPage: true }, '', window.location.href);
    window.addEventListener('popstate', this.handlePopState);
  }

  ngOnDestroy(): void {
    this.backButtonSub?.unsubscribe();
    this.badgeProgressSub?.unsubscribe();
    window.removeEventListener('popstate', this.handlePopState);
  }

  private selectResultBadges(cards: BadgeCard[]): BadgeCard[] {
    const preferred = ['Quiz Ace', 'Daily Learner'];
    return preferred.map(name => cards.find(card => card.name === name))
      .filter((card): card is BadgeCard => !!card).slice(0, 2);
  }

  private handlePopState = (_event: PopStateEvent) => {
    this.goToContent();
  }

  private goToContent(): void {
    this.returnToUpdatedLearningList();
  }

  private returnToUpdatedLearningList(): void {
    this.clearStoredResult();
    const challengeId = Number(this.challenge?.challengeId ?? (this.challenge as any)?.id);
    // The generic content route opens the child feed even for a signed-in
    // parent. A parent's completed quiz belongs to their own quiz listing.
    const returnUrl = this.authService?.isParentUser() &&
      (this.returnUrl === '/authed/content' || this.returnUrl.startsWith('/authed/content?'))
      ? '/authed/parent-learning?category=quizzes'
      : this.returnUrl;
    this.router.navigateByUrl(returnUrl, {
      replaceUrl: true,
      state: Number.isFinite(challengeId) && challengeId > 0
        ? { completedChallengeId: challengeId }
        : undefined
    });
  }

  private getResultNavigationState(value: unknown): ResultNavigationState | null {
    if (!value || typeof value !== 'object') return null;
    const state = value as ResultNavigationState;
    return state.submissionResult ? state : null;
  }

  private getStoredResultNavigationState(): ResultNavigationState | null {
    try {
      const raw = sessionStorage.getItem(this.resultStorageKey);
      return raw ? this.getResultNavigationState(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  private clearStoredResult(): void {
    try {
      sessionStorage.removeItem(this.resultStorageKey);
    } catch {
      // Storage can be disabled in private browsing; navigation still works.
    }
  }

  private unwrapSubmissionResult(value: ChallengeSubmissionResponse | Record<string, unknown>): ChallengeSubmissionResponse {
    const raw = value as Record<string, unknown>;
    const nested = raw['data'] ?? raw['result'] ?? raw['payload'];
    return (nested && typeof nested === 'object' ? nested : raw) as ChallengeSubmissionResponse;
  }

  private applySubmissionResult(result: ChallengeSubmissionResponse): void {
    const raw = result as unknown as Record<string, unknown>;
    const numberValue = (...keys: string[]): number => {
      for (const key of keys) {
        const value = Number(raw[key]);
        if (Number.isFinite(value)) return value;
      }
      return 0;
    };

    this.hasSubmissionResult = true;
    this.totalQuestions = numberValue('totalQuestions', 'total_questions');
    this.correctAnswers = numberValue('correctCount', 'correct_count');
    this.scorePercentage = numberValue('percentageScore', 'percentage_score');
    this.coinsEarned = numberValue('coinsEarned', 'coins_earned');
    this.trophiesEarned = numberValue('trophiesEarned', 'trophies_earned');
    this.totalCoins = numberValue('totalCoins', 'total_coins');
    this.totalTrophies = numberValue('totalTrophies', 'total_trophies');
    this.celebrationText = String(raw['celebrationText'] ?? raw['celebration_text'] ?? '');
    this.overallFeedback = String(raw['overallFeedback'] ?? raw['overall_feedback'] ?? '');
    this.firstCompletion = Boolean(raw['firstCompletion'] ?? raw['first_completion']);
    this.challengeCompleted = Boolean(raw['challengeCompleted'] ?? raw['challenge_completed']);
    this.earnedNewBadge = Boolean(raw['earnedNewBadge'] ?? raw['earned_new_badge']);
    this.newlyEarnedBadges = Array.isArray(raw['newlyEarnedBadges'])
      ? raw['newlyEarnedBadges'] as any[]
      : [];
    this.badgeCelebrationMessage = String(raw['badgeCelebrationMessage'] ?? raw['badge_celebration_message'] ?? '');
    this.badges = Array.isArray(raw['badges']) ? raw['badges'] as any[] : [];
  }


  private readonly BADGE_ICON_MAP: Readonly<Record<string, string>> = {
    'Coin Collector':       'assets/Icons-Neutral/Icon-Badge-CoinCollector.webp',
    'Quiz Ace':             'assets/Icons-Neutral/Icon-Badge-QuizAce.webp',
    'Pet Collector':        'assets/Icons-Neutral/Icon-Badge-PetCollector.webp',
    'Content Creator':      'assets/Icons-Neutral/Icon-Badge-ContentCreator.webp',
    'Knowledge Seeker':     'assets/Icons-Neutral/Icon-Badge-KnowledgeSeeker.webp',
    'Habit Master':         'assets/Icons-Neutral/Icon-Badge-HabitMaster.webp',
    'Daily Champion':       'assets/Icons-Neutral/Icon-Badge-DailyChampion.webp',
    'Feature Explorer':     'assets/Icons-Neutral/Icon-Badge-FeatureExploerer.webp',
    'Puzzle Master':        'assets/Icons-Neutral/Icon-Badge-PuzzleMaster.webp',
    'Pet Stylist':          'assets/Icons-Neutral/Icon-Badge-PetStylist.webp',
    'Task Terminator':      'assets/Icons-Neutral/Icon-Badges-TaskTerminator.webp',
    'Learning Enthusiast':  'assets/Icons-Neutral/Icon-Badge-LearningEnthusiast.webp',
    'Social Star':          'assets/Icons-Neutral/Icon-Badge-SocialStar.webp',
    'Streak Keeper':        'assets/Icons-Neutral/Icon-Badge-StreakKeeper.webp'
  };

  getBadgeIconUrl(badge: any): string {
    const title = badge?.title || badge?.name || '';
    return this.BADGE_ICON_MAP[title] || this.fallbackBadgeIcon;
  }

  onBadgeImageError(event: Event, _badge: any): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith(this.fallbackBadgeIcon)) image.src = this.fallbackBadgeIcon;
  }

  // Returns true if the badge was earned — tries multiple boolean field names
  isBadgeEarned(badge: any): boolean {
    return !!(badge?.isEarned ?? badge?.earned ?? badge?.isUnlocked ?? badge?.unlocked ?? false);
  }

  // Returns the green celebration/motivation text shown below the description
  getBadgeCelebrationText(badge: any): string {
    return badge?.celebrationMessage
      || badge?.celebrationText
      || badge?.motivationalText
      || badge?.motivationMessage
      || badge?.encouragementText
      || badge?.startMessage
      || badge?.progressMessage
      || '';
  }

  // Returns the text shown when a badge is earned ("Achievement Unlocked!" line)
  getBadgeAchievementText(badge: any): string {
    return badge?.achievementText
      || badge?.achievementMessage
      || badge?.unlockedText
      || 'Achievement Unlocked!';
  }

  getBadgeCompletionPercent(badge: any): number {
    if (this.isBadgeEarned(badge)) return 100;
    if (!badge.target || badge.target <= 0) return 0;
    return Math.min(100, Math.round((badge.progress / badge.target) * 100));
  }

  getScoreColor(): string {
    if (this.scorePercentage >= 80) {
      return '#4CAF50';
    } else if (this.scorePercentage >= 40) {
      return '#F0AD4E';
    } else {
      return '#BB2124';
    }
  }


  onCancel(): void {
    this.returnToUpdatedLearningList();
  }

  onPetClick(): void {
    console.log('Pet clicked!');
  }

  onContinue(): void {
    this.returnToUpdatedLearningList();
  }


  getFormattedTime(): string {
    const elapsedSeconds = Number.isFinite(this.timeTaken) ? Math.max(0, Math.floor(this.timeTaken)) : 0;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
