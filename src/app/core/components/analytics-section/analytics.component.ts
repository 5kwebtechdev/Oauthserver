import { CommonModule, Location } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { combineLatest, forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, startWith, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ParentAnalyticsService, InsightsResponseDto } from '../../services/parent-analytics.service';
import { ProfileStoreService } from '../../services/profile-store.service';
import { ChildInfo } from '../../models/child-info.model';
import { MoodTransition } from '../../models/mood.model';
import { FooterComponent } from '../footer/footer.component';
import { environment } from '../../../../environments/environment';
import { MoodService } from '../../services/mood.service';

type InsightsContextKind = 'child' | 'self' | 'unavailable';
type MetricTone = 'habit' | 'task' | 'knowledge' | 'journal' | 'achievement';

interface InsightsContext {
  key: string;
  kind: InsightsContextKind;
  userId: string | number | null;
  isParentView: boolean;
  childName: string;
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
  iconVariant?: string;
  weekValue?: number | null;
  monthValue?: number | null;
  unit?: string;
}

interface InsightSection {
  id: string;
  title: string;
  metrics: InsightMetric[];
}

interface MoodBalanceSegment {
  id: 'growing' | 'support' | 'difficult' | 'no-data';
  label: string;
  value: number;
  color: string;
}

interface ActivityBreakdownSegment {
  id: 'habits' | 'tasks' | 'time-management' | 'learnings';
  label: string;
  value: number;
  color: string;
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
  isParentView = false;
  selectedChildName = 'Child';
  readonly reportUnlockDays = 6;
  moodBalance: MoodBalanceSegment[] = this.emptyMoodBalance();
  activityBreakdown: ActivityBreakdownSegment[] = this.emptyActivityBreakdown();

  private readonly destroy$ = new Subject<void>();
  private requestVersion = 0;
  private context: InsightsContext = {
    key: 'unavailable',
    kind: 'unavailable',
    userId: null,
    isParentView: false,
    childName: 'Child',
    canReadJournal: false,
  };

  constructor(
    private readonly location: Location,
    private readonly authService: AuthService,
    private readonly profileStore: ProfileStoreService,
    private readonly parentAnalyticsService: ParentAnalyticsService,
    private readonly moodService: MoodService,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.isParentView = this.authService.isParentUser();
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

  get activityChartBackground(): string {
    if (!this.activityBreakdown.some(segment => segment.value > 0)) {
      return '#ebe9eb';
    }
    let cursor = 0;
    const stops = this.activityBreakdown.map(segment => {
      const start = cursor;
      cursor += segment.value;
      return `${segment.color} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  showAiInsight(section: InsightSection): boolean {
    return ['habits', 'tasks', 'knowledge', 'journal'].includes(section.id);
  }

  aiInsight(section: InsightSection): string {
    const available = section.metrics
      .reduce<Array<number | null | undefined>>(
        (values, metric) => values.concat(metric.value, metric.weekValue, metric.monthValue),
        [],
      )
      .filter((value): value is number => value !== undefined && value !== null && Number.isFinite(value));
    if (!available.length || available.every(value => value === 0)) {
      return `${this.selectedChildName} is just getting started. More activity will make this insight stronger.`;
    }
    return `${this.selectedChildName} is doing reasonably well, though there’s room to tighten one or two areas.`;
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
          isParentView: true,
          childName: 'Child',
          canReadJournal: false,
        };
      }

      return {
        key: `child:${selectedChild.id}`,
        kind: 'child',
        userId: selectedChild.id,
        isParentView: true,
        childName: selectedChild.name?.trim() || 'Child',
        canReadJournal: false,
      };
    }

    if (!currentUserId) {
      return {
        key: `unavailable:${relationship || 'unknown'}`,
        kind: 'unavailable',
        userId: null,
        isParentView: false,
        childName: 'Child',
        canReadJournal: false,
      };
    }

    const isChild = relationship === 'CHILD';
    return {
      key: `${isChild ? 'child' : 'self'}:${currentUserId}`,
      kind: isChild ? 'child' : 'self',
      userId: currentUserId,
      isParentView: false,
      childName: String(user?.name || user?.userName || 'You'),
      canReadJournal: true,
    };
  }

  private loadInsights(context: InsightsContext): void {
    const requestVersion = ++this.requestVersion;
    this.context = context;
    this.isParentView = context.isParentView;
    this.selectedChildName = context.childName;
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
      insights: this.parentAnalyticsService.getInsights(userId).pipe(catchError(() => of(null))),
      journal: context.canReadJournal ? this.getJournalEntries() : of(null),
      moods: context.isParentView ? this.getRecentMoodTransitions(userId) : of([] as MoodTransition[]),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (requestVersion !== this.requestVersion) return;

          this.isLoading = false;
          if (!response.insights) {
            this.hasError = true;
            return;
          }

          this.sections = this.buildSections(response.insights, response.journal, context);
          this.moodBalance = this.buildMoodBalance(response.moods);
          this.activityBreakdown = this.buildActivityBreakdown(response.insights);
        },
        error: () => {
          if (requestVersion !== this.requestVersion) return;
          this.isLoading = false;
          this.hasError = true;
        },
      });
  }

  private buildSections(insights: InsightsResponseDto, journal: unknown[] | null, context: InsightsContext): InsightSection[] {
    if (context.isParentView) {
      return this.buildParentSections(insights);
    }

    const sections: InsightSection[] = [
      {
        id: 'habits',
        title: 'Habits',
        metrics: [
          this.metric('habits-week', 'This week', this.asNumber(insights.habits?.thisWeek), 'Habits progress in the last 7 days', 'assets/figma/insights/habits-week.webp', 'habit'),
          this.metric('habits-month', 'This month', this.asNumber(insights.habits?.thisMonth), 'Growing stronger over 30 days', 'assets/figma/insights/habits-month.webp', 'habit'),
        ],
      },
      {
        id: 'tasks',
        title: 'Tasks',
        metrics: [
          this.metric('tasks-week', 'This week', this.asNumber(insights.tasks?.thisWeek), 'Tasks progress in the last 7 days', 'assets/figma/insights/tasks-week.webp', 'task'),
          this.metric('tasks-month', 'This month', this.asNumber(insights.tasks?.thisMonth), 'Growing stronger over 30 days', 'assets/figma/insights/tasks-month.webp', 'task'),
        ],
      },
      {
        id: 'knowledge',
        title: 'Knowledge gained',
        metrics: [
          this.metric('quizzes', 'Quizzes', this.asNumber(insights.knowledgeGained?.quizzes), 'Quizzes conquered so far', 'assets/figma/insights/knowledge-quizzes.webp', 'knowledge'),
          this.metric('puzzles', 'Puzzles', this.asNumber(insights.knowledgeGained?.puzzles), 'Puzzles cracked since you started', 'assets/figma/insights/knowledge-puzzles.webp', 'knowledge'),
          this.metric('articles', 'Articles', this.asNumber(insights.knowledgeGained?.articles), 'Ideas absorbed since you joined', 'assets/figma/insights/knowledge-articles.webp', 'knowledge'),
          this.metric('lessons', 'Lessons', this.asNumber(insights.knowledgeGained?.lessons), 'Lessons progress since you started', 'assets/figma/insights/knowledge-lessons.webp', 'knowledge'),
        ],
      },
    ];

    if (context.canReadJournal) {
      sections.push({
        id: 'journal',
        title: 'Journal',
        metrics: [
          this.metric('journal-week', 'This week', this.countJournalDays(journal, 'week'), 'Days you showed up this week', 'assets/figma/insights/journal-week.webp', 'journal'),
          this.metric('journal-month', 'This month', this.countJournalDays(journal, 'month'), 'Days you showed up this month', 'assets/figma/insights/journal-month.webp', 'journal'),
        ],
      });
    }

    sections.push({
      id: 'achievements',
      title: 'Achievements',
      metrics: [
        this.metric('badges', 'Badges', this.asNumber(insights.achievements?.badges), 'Badges earned in the last 30 days', 'assets/figma/insights/achievement-badges.webp', 'achievement'),
        this.metric('trophies', 'Trophies', this.asNumber(insights.achievements?.trophies), 'Trophies unlocked this month', 'assets/figma/insights/achievement-trophies.webp', 'achievement'),
        this.metric('streaks', 'Streaks', this.asNumber(insights.achievements?.streaks), 'Your longest streak this month', 'assets/figma/insights/achievement-streaks.webp', 'achievement'),
        this.metric('coins', 'Coins', this.asNumber(insights.achievements?.coins), 'Coins collected this month', 'assets/figma/insights/achievement-coins.webp', 'achievement'),
      ],
    });

    return sections;
  }

  private buildParentSections(insights: InsightsResponseDto): InsightSection[] {
    const knowledge = insights.knowledgeGained;
    const journal = insights.journal;
    const achievementMetrics = [
      this.metric('badges', 'Badges', this.asNumber(insights.achievements?.badges), 'Badges earned in the last 30 days', 'assets/figma/parent-insights/badge.png', 'achievement'),
      this.metric('streaks', 'Streak', this.asNumber(insights.achievements?.streaks), 'Your longest streak this month', 'assets/figma/parent-insights/streak.png', 'achievement'),
      this.metric('trophies', 'Trophies', this.asNumber(insights.achievements?.trophies), 'Trophies unlocked this month', 'assets/figma/parent-insights/trophy.png', 'achievement'),
      this.metric('coins', 'Coins', this.asNumber(insights.achievements?.coins), 'Coins collected this month', 'assets/figma/parent-insights/coin.png', 'achievement'),
    ];

    return [
      {
        id: 'habits',
        title: 'Habits',
        metrics: [
          this.metric('habits-week', 'This week', this.asNumber(insights.habits?.thisWeek), 'Progress in the last 7 days', 'assets/figma/parent-insights/metrics-sprite.png', 'habit', 'habit-week'),
          this.metric('habits-month', 'This month', this.asNumber(insights.habits?.thisMonth), 'Growth over 30 days', 'assets/figma/parent-insights/metrics-sprite.png', 'habit', 'habit-month'),
        ],
      },
      {
        id: 'tasks',
        title: 'Tasks',
        metrics: [
          this.metric('tasks-week', 'This week', this.asNumber(insights.tasks?.thisWeek), 'Progress in the last 7 days', 'assets/figma/parent-insights/metrics-sprite.png', 'task', 'task-week'),
          this.metric('tasks-month', 'This month', this.asNumber(insights.tasks?.thisMonth), 'Growth over 30 days', 'assets/figma/parent-insights/metrics-sprite.png', 'task', 'task-month'),
        ],
      },
      {
        id: 'knowledge',
        title: 'Learnings',
        metrics: [
          this.periodMetric('quizzes', 'Quizzes', knowledge?.quizzes, 'assets/figma/parent-insights/quiz.png', 'quiz'),
          this.periodMetric('puzzles', 'Puzzles', knowledge?.puzzles, 'assets/figma/parent-insights/puzzle.png', 'puzzle'),
          this.periodMetric('articles', 'Articles', knowledge?.articles, 'assets/figma/parent-insights/article.png', 'article'),
          this.periodMetric('lessons', 'Lessons', knowledge?.lessons, 'assets/figma/parent-insights/lesson.png', 'lesson'),
        ],
      },
      {
        id: 'journal',
        title: 'Journal',
        metrics: [
          this.metric('journal-week', 'This week', this.asNumber(journal?.thisWeek), 'Journal entries this week', 'assets/figma/parent-insights/section-sprite.png', 'journal', 'journal', undefined, undefined, 'Entries'),
          this.metric('journal-month', 'This month', this.asNumber(journal?.thisMonth), 'Journal entries this month', 'assets/figma/parent-insights/section-sprite.png', 'journal', 'journal', undefined, undefined, 'Entries'),
        ],
      },
      { id: 'achievements', title: 'Achievements', metrics: achievementMetrics },
    ];
  }

  private metric(
    id: string,
    label: string,
    value: number | null,
    description: string,
    icon: string,
    tone: MetricTone,
    iconVariant?: string,
    weekValue?: number | null,
    monthValue?: number | null,
    unit?: string,
  ): InsightMetric {
    return { id, label, value, description, icon, tone, iconVariant, weekValue, monthValue, unit };
  }

  private periodMetric(id: string, label: string, rawValue: unknown, icon: string, iconVariant: string): InsightMetric {
    const period = this.periodValues(rawValue);
    return this.metric(id, label, period.month, '', icon, 'knowledge', iconVariant, period.week, period.month);
  }

  private periodValues(rawValue: unknown): { week: number | null; month: number | null } {
    if (rawValue && typeof rawValue === 'object') {
      const value = rawValue as Record<string, unknown>;
      return {
        week: this.asNumber(value['thisWeek'] ?? value['week']),
        month: this.asNumber(value['thisMonth'] ?? value['month']),
      };
    }
    return { week: null, month: this.asNumber(rawValue) };
  }

  private getRecentMoodTransitions(userId: string | number): Observable<MoodTransition[]> {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return forkJoin([
      this.moodService.getMoodTransitionsMonthly(now.getFullYear(), now.getMonth() + 1, userId).pipe(catchError(() => of([]))),
      this.moodService.getMoodTransitionsMonthly(previousMonth.getFullYear(), previousMonth.getMonth() + 1, userId).pipe(catchError(() => of([]))),
    ]).pipe(map(([current, previous]) => [...previous, ...current]));
  }

  private buildMoodBalance(transitions: MoodTransition[]): MoodBalanceSegment[] {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const latestByDate = new Map<string, MoodTransition>();
    transitions.forEach(transition => {
      const date = new Date(transition.date);
      if (Number.isNaN(date.getTime()) || date < start) return;
      latestByDate.set(transition.date, transition);
    });

    const counts = { growing: 0, support: 0, difficult: 0, 'no-data': Math.max(0, 7 - latestByDate.size) };
    latestByDate.forEach(transition => {
      const mood = String(transition.toMood || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
      if (['happy', 'very happy', 'excited'].includes(mood)) counts.growing++;
      else if (['nervous'].includes(mood)) counts.support++;
      else if (['sad', 'upset'].includes(mood)) counts.difficult++;
      else counts['no-data']++;
    });

    const total = Math.max(7, Object.values(counts).reduce((sum, value) => sum + value, 0));
    const percentages = this.toPercentages([counts.growing, counts.support, counts.difficult, counts['no-data']], total);
    return [
      { id: 'growing', label: 'Growing Well', value: percentages[0], color: '#4caf50' },
      { id: 'support', label: 'Needs Support', value: percentages[1], color: '#f9b744' },
      { id: 'difficult', label: 'Difficult Moments', value: percentages[2], color: '#c41f32' },
      { id: 'no-data', label: 'No Data', value: percentages[3], color: '#a6a3a5' },
    ];
  }

  private buildActivityBreakdown(insights: InsightsResponseDto): ActivityBreakdownSegment[] {
    const raw = insights as InsightsResponseDto & {
      timeManagement?: { thisMonth?: number };
      journal?: { thisMonth?: number };
    };
    const values = [
      this.asNumber(insights.habits?.thisMonth) ?? 0,
      this.asNumber(insights.tasks?.thisMonth) ?? 0,
      this.asNumber(raw.timeManagement?.thisMonth) ?? 0,
      ['quizzes', 'puzzles', 'articles', 'lessons'].reduce((total, key) => {
        const period = this.periodValues((insights.knowledgeGained as unknown as Record<string, unknown> | undefined)?.[key]);
        return total + (period.month ?? 0);
      }, 0),
    ];
    const total = values.reduce((sum, value) => sum + value, 0);
    const percentages = total > 0 ? this.toPercentages(values, total) : [0, 0, 0, 0];
    return [
      { id: 'habits', label: 'Habits', value: percentages[0], color: '#8b8dcb' },
      { id: 'tasks', label: 'Tasks', value: percentages[1], color: '#f6ac72' },
      { id: 'time-management', label: 'Time Management', value: percentages[2], color: '#89b3b6' },
      { id: 'learnings', label: 'Learnings', value: percentages[3], color: '#e1527c' },
    ];
  }

  private toPercentages(values: number[], total: number): number[] {
    if (total <= 0) return values.map(() => 0);
    const percentages = values.map(value => Math.round((value / total) * 100));
    const difference = 100 - percentages.reduce((sum, value) => sum + value, 0);
    if (percentages.length) percentages[percentages.length - 1] += difference;
    return percentages;
  }

  private emptyMoodBalance(): MoodBalanceSegment[] {
    return [
      { id: 'growing', label: 'Growing Well', value: 0, color: '#4caf50' },
      { id: 'support', label: 'Needs Support', value: 0, color: '#f9b744' },
      { id: 'difficult', label: 'Difficult Moments', value: 0, color: '#c41f32' },
      { id: 'no-data', label: 'No Data', value: 100, color: '#a6a3a5' },
    ];
  }

  private emptyActivityBreakdown(): ActivityBreakdownSegment[] {
    return [
      { id: 'habits', label: 'Habits', value: 0, color: '#8b8dcb' },
      { id: 'tasks', label: 'Tasks', value: 0, color: '#f6ac72' },
      { id: 'time-management', label: 'Time Management', value: 0, color: '#89b3b6' },
      { id: 'learnings', label: 'Learnings', value: 0, color: '#e1527c' },
    ];
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
