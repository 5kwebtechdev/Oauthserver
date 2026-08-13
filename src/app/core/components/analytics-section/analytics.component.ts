import { CommonModule, Location } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { combineLatest, forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, startWith, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { MoodService } from '../../services/mood.service';
import { AcademyFeedResponse, AcademyService } from '../../services/academy.service';
import { LearningCardData } from '../../models/learning.models';
import { LearningService } from '../../services/learning.service';
import { ProfileStoreService } from '../../services/profile-store.service';
import { ChildInfo } from '../../models/child-info.model';
import { VibesDisplayResponse } from '../../models/mood.model';
import { HabitApi } from '../../api/habit.api';
import { TaskApi } from '../../api/task.api';
import { FooterComponent } from '../footer/footer.component';
import { environment } from '../../../../environments/environment';

type InsightsContextKind = 'child' | 'self' | 'unavailable';
type MetricTone = 'habit' | 'task' | 'knowledge' | 'journal' | 'achievement';

interface InsightsContext {
  key: string;
  kind: InsightsContextKind;
  userId: string | number | null;
  /** Journal entries are private when a parent is viewing a selected child. */
  canReadJournal: boolean;
}

interface InsightMetric {
  id: string;
  label: string;
  value: number | null;
  description: string;
  icon: string;
  tone: MetricTone;
}

interface InsightSection {
  id: string;
  title: string;
  metrics: InsightMetric[];
}

interface InsightsResponseBundle {
  overview: VibesDisplayResponse | null;
  habits: unknown;
  tasks: unknown;
  quizzes: LearningCardData[] | null;
  puzzles: LearningCardData[] | null;
  articles: LearningCardData[] | null;
  academy: AcademyFeedResponse | null;
  journal: unknown[] | null;
}

/**
 * The same Figma layout is intentionally used for a signed-in child and a
 * SELF user. The data context is still explicit so parent-selected child data
 * cannot leak into a SELF session (or the other way around).
 */
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, IonicModule, FooterComponent],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  readonly skeletonSections = [1, 2, 3, 4, 5];

  sections: InsightSection[] = [];
  isLoading = true;
  hasError = false;
  isEmpty = false;
  emptyMessage = 'Insights will appear here as you build your progress.';

  private readonly destroy$ = new Subject<void>();
  private requestVersion = 0;
  private context: InsightsContext = {
    key: 'unavailable',
    kind: 'unavailable',
    userId: null,
    canReadJournal: false,
  };

  constructor(
    private readonly location: Location,
    private readonly authService: AuthService,
    private readonly profileStore: ProfileStoreService,
    private readonly moodService: MoodService,
    private readonly habitApi: HabitApi,
    private readonly taskApi: TaskApi,
    private readonly learningService: LearningService,
    private readonly academyService: AcademyService,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.authService.userData$.pipe(startWith(this.authService.getUserData())),
      this.profileStore.selectionChanged$.pipe(startWith(this.profileStore.getSelectedChildSync())),
    ])
      .pipe(
        map(([user, selectedChild]) => this.resolveContext(user, selectedChild)),
        distinctUntilChanged((previous, current) => previous.key === current.key),
        takeUntil(this.destroy$),
      )
      .subscribe(context => this.loadInsights(context));
  }

  ngOnDestroy(): void {
    this.requestVersion++;
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.location.back();
  }

  retry(): void {
    this.loadInsights(this.context);
  }

  trackSection = (_: number, section: InsightSection): string => section.id;

  trackMetric = (_: number, metric: InsightMetric): string => metric.id;

  displayValue(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
  }

  private resolveContext(userData: any, selectedChild: ChildInfo | null): InsightsContext {
    const user = userData?.user ?? userData?.data?.user ?? userData?.data ?? userData ?? {};
    const relationship = String(user?.relationship || this.authService.getUserRelationship() || '').toUpperCase();
    const currentUserId = user?.id ?? user?.userId ?? this.authService.getUserId() ?? null;

    if (relationship === 'PARENT') {
      if (!selectedChild?.id) {
        return {
          key: 'parent-without-child',
          kind: 'unavailable',
          userId: null,
          canReadJournal: false,
        };
      }

      return {
        key: `child:${selectedChild.id}`,
        kind: 'child',
        userId: selectedChild.id,
        canReadJournal: false,
      };
    }

    if (!currentUserId) {
      return {
        key: `unavailable:${relationship || 'unknown'}`,
        kind: 'unavailable',
        userId: null,
        canReadJournal: false,
      };
    }

    const isChild = relationship === 'CHILD';
    return {
      key: `${isChild ? 'child' : 'self'}:${currentUserId}`,
      kind: isChild ? 'child' : 'self',
      userId: currentUserId,
      canReadJournal: true,
    };
  }

  private loadInsights(context: InsightsContext): void {
    const requestVersion = ++this.requestVersion;
    this.context = context;
    this.sections = [];
    this.hasError = false;
    this.isEmpty = false;
    this.isLoading = false;

    if (context.kind === 'unavailable' || context.userId === null) {
      this.isEmpty = true;
      this.emptyMessage = 'Select a child to see their Insights.';
      return;
    }

    const userId = context.userId;
    this.isLoading = true;
    forkJoin({
      overview: this.moodService.getVibesDisplay(userId).pipe(
        map(response => this.pickOverview(response, userId)),
      ),
      habits: this.habitApi.getAllHabits(userId).pipe(catchError(() => of(null))),
      tasks: this.taskApi.getAllTasks(userId).pipe(catchError(() => of(null))),
      quizzes: this.learningService.fetchQuizCards(false, userId).pipe(catchError(() => of(null))),
      puzzles: this.learningService.fetchPuzzleCards(false, userId).pipe(catchError(() => of(null))),
      articles: this.learningService.fetchArticleCards(false, userId).pipe(catchError(() => of(null))),
      academy: this.academyService.getAcademyFeed(undefined, userId).pipe(catchError(() => of(null))),
      journal: context.canReadJournal ? this.getJournalEntries() : of(null),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (requestVersion !== this.requestVersion) return;

          this.isLoading = false;
          if (!response.overview) {
            this.isEmpty = true;
            this.emptyMessage = context.kind === 'child'
              ? 'No Insights are available for this child yet.'
              : 'Your Insights will appear here as you build your progress.';
            return;
          }

          this.sections = this.buildSections(response, context);
        },
        error: () => {
          if (requestVersion !== this.requestVersion) return;
          this.isLoading = false;
          this.hasError = true;
        },
      });
  }

  private pickOverview(
    response: VibesDisplayResponse[] | null | undefined,
    userId: string | number,
  ): VibesDisplayResponse | null {
    const records = Array.isArray(response) ? response : [];
    if (!records.length) return null;
    return records.find(item => String(item?.userId) === String(userId)) ?? records[0] ?? null;
  }

  private buildSections(response: InsightsResponseBundle, context: InsightsContext): InsightSection[] {
    const habits = this.asItems(response.habits);
    const tasks = this.asItems(response.tasks);
    const overview = response.overview!;
    const knowledgeMetrics: InsightMetric[] = [
      this.metric('quizzes', 'Quizzes', this.countCompletedLearning(response.quizzes), 'Quizzes conquered so far', 'assets/figma/insights/knowledge-quizzes.png', 'knowledge'),
      this.metric('puzzles', 'Puzzles', this.countCompletedLearning(response.puzzles), 'Puzzles cracked since you started', 'assets/figma/insights/knowledge-puzzles.png', 'knowledge'),
      this.metric('articles', 'Articles', this.countCompletedLearning(response.articles), 'Ideas absorbed since you joined', 'assets/figma/insights/knowledge-articles.png', 'knowledge'),
      this.metric('lessons', 'Lessons', this.countCompletedLessons(response.academy), 'Lessons progress since you started', 'assets/figma/insights/knowledge-lessons.png', 'knowledge'),
    ];

    const sections: InsightSection[] = [
      {
        id: 'habits',
        title: 'Habits',
        metrics: [
          this.metric('habits-week', 'This week', this.countCompletions(habits, 7), 'Habits progress in the last 7 days', 'assets/figma/insights/habits-week.png', 'habit'),
          this.metric('habits-month', 'This month', this.countCompletions(habits, 30), 'Growing stronger over 30 days', 'assets/figma/insights/habits-month.png', 'habit'),
        ],
      },
      {
        id: 'tasks',
        title: 'Tasks',
        metrics: [
          this.metric('tasks-week', 'This week', this.countCompletions(tasks, 7), 'Tasks progress in the last 7 days', 'assets/figma/insights/tasks-week.png', 'task'),
          this.metric('tasks-month', 'This month', this.countCompletions(tasks, 30), 'Growing stronger over 30 days', 'assets/figma/insights/tasks-month.png', 'task'),
        ],
      },
      {
        id: 'knowledge',
        title: 'Knowledge gained',
        metrics: knowledgeMetrics,
      },
    ];

    if (context.canReadJournal) {
      sections.push({
        id: 'journal',
        title: 'Journal',
        metrics: [
          this.metric('journal-week', 'This week', this.countJournalDays(response.journal, 'week'), 'Days you showed up this week', 'assets/figma/insights/journal-week.png', 'journal'),
          this.metric('journal-month', 'This month', this.countJournalDays(response.journal, 'month'), 'Days you showed up this month', 'assets/figma/insights/journal-month.png', 'journal'),
        ],
      });
    }

    sections.push({
      id: 'achievements',
      title: 'Achievements',
      metrics: [
        this.metric('badges', 'Badges', this.asNumber(overview.badges), 'Badges earned in the last 30 days', 'assets/figma/insights/achievement-badges.png', 'achievement'),
        this.metric('trophies', 'Trophies', this.asNumber(overview.trophies), 'Trophies unlocked this month', 'assets/figma/insights/achievement-trophies.png', 'achievement'),
        this.metric('streaks', 'Streaks', this.asNumber(overview.streak), 'Your longest streak this month', 'assets/figma/insights/achievement-streaks.png', 'achievement'),
        this.metric('coins', 'Coins', this.asNumber(overview.coins), 'Coins collected this month', 'assets/figma/insights/achievement-coins.png', 'achievement'),
      ],
    });

    return sections;
  }

  private metric(
    id: string,
    label: string,
    value: number | null,
    description: string,
    icon: string,
    tone: MetricTone,
  ): InsightMetric {
    return { id, label, value, description, icon, tone };
  }

  private asItems(response: unknown): any[] | null {
    if (response === null || response === undefined) return null;
    if (Array.isArray(response)) return response;
    if (typeof response !== 'object') return null;

    const payload = response as Record<string, unknown>;
    const candidates = [
      payload['habits'],
      payload['tasks'],
      payload['content'],
      payload['items'],
      payload['results'],
      payload['data'],
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    return null;
  }

  private countCompletions(items: any[] | null, days: number): number | null {
    if (items === null) return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    return items.reduce((total, item) => total + this.getCompletionDates(item)
      .filter(date => date >= start)
      .length, 0);
  }

  private getCompletionDates(item: any): Date[] {
    const dates = item?.completionDate ?? item?.completion_date ?? item?.completions ?? [];
    const values = Array.isArray(dates) ? dates : [dates];
    return values
      .map(value => {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      })
      .filter((value): value is Date => value !== null);
  }

  private countCompletedLearning(cards: LearningCardData[] | null): number | null {
    if (cards === null) return null;
    const progressIsAvailable = cards.some(card => this.hasLearningProgress(card));
    if (!progressIsAvailable) return null;
    return cards.filter(card => this.isLearningComplete(card)).length;
  }

  private hasLearningProgress(card: LearningCardData): boolean {
    const raw = (card?.rawData ?? {}) as Record<string, unknown>;
    return raw['userLearningStatus'] !== undefined
      || raw['alreadyRead'] !== undefined
      || raw['isCompleted'] !== undefined
      || raw['completed'] !== undefined
      || raw['status'] === 'READ';
  }

  private isLearningComplete(card: LearningCardData): boolean {
    const raw = (card?.rawData ?? {}) as Record<string, unknown>;
    const status = String(raw['userLearningStatus'] ?? raw['status'] ?? '').toUpperCase();
    return raw['alreadyRead'] === true
      || raw['isCompleted'] === true
      || raw['completed'] === true
      || status === 'COMPLETED'
      || status === 'READ';
  }

  private countCompletedLessons(feed: AcademyFeedResponse | null): number | null {
    const lessons = feed?.lessons;
    if (!Array.isArray(lessons)) return null;
    if (!lessons.some(lesson => lesson?.isCompleted !== undefined)) return null;
    return lessons.filter(lesson => lesson?.isCompleted === true).length;
  }

  private getJournalEntries(): Observable<unknown[] | null> {
    const now = new Date();
    let params = new HttpParams()
      .set('type', 'MONTH')
      .set('month', String(now.getMonth() + 1))
      .set('year', String(now.getFullYear()));
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    }

    return this.http.get<unknown>(`${environment.apiUrl}/journal/entries`, { headers, params }).pipe(
      map(response => Array.isArray(response) ? response : null),
      catchError(() => of(null)),
    );
  }

  private countJournalDays(entries: unknown[] | null, period: 'week' | 'month'): number | null {
    if (entries === null) return null;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (period === 'week') {
      const mondayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - mondayOffset);
    } else {
      start.setDate(1);
    }

    const uniqueDates = new Set<string>();
    entries.forEach(entry => {
      const item = entry as Record<string, unknown>;
      const rawDate = item?.['creationDate'] ?? item?.['date'] ?? item?.['createdAt'];
      const date = rawDate ? new Date(String(rawDate)) : null;
      if (!date || Number.isNaN(date.getTime()) || date < start || date > now) return;
      uniqueDates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
    });
    return uniqueDates.size;
  }

  private asNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
  }
}
