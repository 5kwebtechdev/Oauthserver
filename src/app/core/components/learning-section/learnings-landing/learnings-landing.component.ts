import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { from, Observable, Subscription } from 'rxjs';
import { map, mergeMap, switchMap } from 'rxjs/operators';
import { LearningCardData, LearningCategorySummary } from '../../../models/learning.models';
import { AcademyService, Course } from '../../../services/academy.service';
import { AuthService } from '../../../services/auth.service';
import { LearningService } from '../../../services/learning.service';
import { PetAgeService, PetType } from '../../../services/pet-age.service';
import { EduHubDirectorySearchComponent } from '../../education-section/eduhub-directory-search/eduhub-directory-search.component';
import { SkeletonImageComponent } from '../../skeleton-image/skeleton-image.component';
import { QuizBannerComponent } from './quiz-banner/quiz-banner.component';
import { TopicBannerComponent } from './topic-banner/topic-banner.component';

export type LearningsLandingTab = 'quizzes' | 'articles' | 'masterclass';
type ProgressFilter = 'all' | 'pending' | 'completed';
interface ContentEntry { item: LearningCardData; category: string; }
interface TabContent { categories: LearningCategorySummary[]; entries: ContentEntry[]; loading: boolean; error: boolean; }
const emptyTab = (): TabContent => ({ categories: [], entries: [], loading: true, error: false });

/** Figma's supplied learning landing UI, backed by the existing user-scoped APIs. */
@Component({
  selector: 'app-learnings-landing',
  standalone: true,
  imports: [CommonModule, EduHubDirectorySearchComponent, IonicModule, SkeletonImageComponent, QuizBannerComponent, TopicBannerComponent],
  templateUrl: './learnings-landing.component.html',
  styleUrls: ['./learnings-landing.component.scss']
})
export class LearningsLandingComponent implements OnInit, OnChanges, OnDestroy {
  @Input() tab: LearningsLandingTab = 'quizzes';
  @Input() refreshVersion = 0;
  @Output() tabChange = new EventEmitter<LearningsLandingTab>();
  @Output() openItem = new EventEmitter<LearningCardData>();

  readonly tabs = [
    { id: 'quizzes' as const, label: 'Quiz', icon: 'tab-quiz.webp' },
    { id: 'articles' as const, label: 'Article', icon: 'tab-articles.webp' },
    { id: 'masterclass' as const, label: 'MasterClass', icon: 'tab-masterclass.webp' }
  ];
  content: Record<LearningsLandingTab, TabContent> = { quizzes: emptyTab(), articles: emptyTab(), masterclass: emptyTab() };
  pet: PetType = 'panda';
  progress: ProgressFilter = 'all';
  filterSheet: 'progress' | 'category' | null = null;
  desktopFilters = window.matchMedia('(min-width: 768px)').matches;

  @HostListener('window:resize')
  updateFilterLayout(): void {
    const desktop = window.matchMedia('(min-width: 768px)').matches;
    if (desktop !== this.desktopFilters) this.filterSheet = null;
    this.desktopFilters = desktop;
  }
  readonly progressOptions: { value: ProgressFilter; label: string }[] = [
    { value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }
  ];
  category = '';
  searchOpen = false;
  private searchOrigin?: { page: number; totalPages: number; entries: ContentEntry[] };
  query = '';
  page = 0;
  totalPages = 0;
  private pageRequest?: Subscription;
  private totals: Partial<Record<LearningsLandingTab, { completed: number; total: number }>> = {};
  private requests?: Subscription;
  private petChanges?: Subscription;
  private generation = 0;

  constructor(
    private readonly learning: LearningService,
    private readonly academy: AcademyService,
    private readonly auth: AuthService,
    private readonly pets: PetAgeService
  ) {}

  ngOnInit(): void {
    this.petChanges = this.pets.petData$.subscribe(data => { this.pet = data.petType || 'panda'; });
    this.reload();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tab'] && !changes['tab'].firstChange) { this.resetFilters(); this.reload(); }
    else if (changes['refreshVersion'] && !changes['refreshVersion'].firstChange) { this.totals = {}; this.reload(); }
  }

  ngOnDestroy(): void {
    this.generation++;
    this.pageRequest?.unsubscribe();
    this.requests?.unsubscribe();
    this.petChanges?.unsubscribe();
  }

  get active(): TabContent { return this.content[this.tab]; }
  get items(): LearningCardData[] {
    if (!this.query) return this.unique(this.active.entries);
    const query = this.query.trim().toLocaleLowerCase();
    return this.unique(this.active.entries.filter(entry => {
      const searchable = [entry.item.title, entry.item.description, entry.category, ...(entry.item.tags || [])].join(' ').toLocaleLowerCase();
      return (!this.category || entry.category === this.category) && (!query || searchable.includes(query));
    })).filter(item => this.progress === 'all' || this.completed(item) === (this.progress === 'completed'));
  }

  metrics(tab: LearningsLandingTab): { completed: number | null; total: number | null; percent: number | null } {
    const counts = this.totals[tab];
    if (!counts) return { completed: null, total: null, percent: null };
    return { ...counts, percent: counts.total ? Math.round(counts.completed * 100 / counts.total) : 0 };
  }

  selectTab(tab: LearningsLandingTab): void {
    if (tab === this.tab) return;
    this.resetFilters();
    this.tabChange.emit(tab);
  }

  categoryName(category: LearningCategorySummary): string { return category.categoryName || category.name || ''; }

  get progressLabel(): string { return this.progressOptions.find(option => option.value === this.progress)?.label || 'All'; }

  chooseProgress(value: ProgressFilter): void { this.filterSheet = null; if (this.progress === value) return; this.progress = value; this.reload(); }
  chooseCategory(value: string): void { this.filterSheet = null; if (this.category === value) return; this.category = value; this.reload(); }

  categoryLabel(group: LearningCategorySummary): string {
    const name = this.categoryName(group);
    return name.toLocaleLowerCase() === 'people & vlogs' ? name.replace(/ & /, ' &\n') : name;
  }

  categoryImage(group: LearningCategorySummary): string | null {
    // These existing Figma exports are the same artwork used in the supplied
    // category-sheet reference. Other API categories keep their own imagery.
    const icons: Record<string, string> = {
      education: 'education', 'how-to': 'how-to', 'arts & creativity': 'arts-creativity',
      entertainment: 'entertainment', fitness: 'fitness', 'animals & nature': 'animals-nature',
      food: 'food', stem: 'stem', motivational: 'motivational', gaming: 'gaming',
      'people & vlogs': 'people-vlogs', productivity: 'productivity'
    };
    const icon = icons[this.categoryName(group).trim().toLocaleLowerCase()];
    return icon ? `assets/figma/reels/categories/${icon}.webp` : group.image || group.thumbnailUrl || null;
  }

  openFilter(sheet: 'progress' | 'category'): void {
    if (Capacitor.isNativePlatform()) void Keyboard.hide().catch(() => {});
    this.filterSheet = sheet;
  }

  get searchTerms(): string[] {
    return (this.searchOrigin?.entries ?? this.active.entries).map(({ item }) => item.title);
  }

  submitSearch(value: string): void {
    const query = value.trim();
    if (query !== this.query) {
      this.query = query;
      this.reload();
    }
  }

  toggleSearch(): void {
    if (!this.searchOpen) {
      if (!this.active.loading && !this.active.error) {
        this.searchOrigin = { page: this.page, totalPages: this.totalPages, entries: this.active.entries };
      }
      this.searchOpen = true;
      return;
    }
    this.searchOpen = false;
    const origin = this.searchOrigin;
    this.searchOrigin = undefined;
    if (!this.query) return;
    this.query = '';
    if (!origin) {
      this.reload();
      return;
    }
    this.pageRequest?.unsubscribe();
    this.page = origin.page;
    this.totalPages = origin.totalPages;
    this.active.entries = origin.entries;
    this.active.loading = false;
    this.active.error = false;
  }

  private resetFilters(): void {
    this.filterSheet = null;
    this.progress = 'all';
    this.category = '';
    this.query = '';
    this.searchOpen = false;
    this.searchOrigin = undefined;
  }

  completed(item: LearningCardData): boolean {
    const raw = item.rawData as Record<string, unknown> | undefined;
    const status = String(raw?.['userLearningStatus'] || raw?.['progressStatus'] || '').toUpperCase();
    if (status === 'COMPLETED' || status === 'READ') return true;
    if (item.type === 'masterclass') return raw?.['isCourseCompleted'] === true || Number(raw?.['completionPercentage'] || 0) >= 100;
    if (item.type === 'article') return raw?.['alreadyRead'] === true || raw?.['status'] === 'READ';
    return raw?.['completed'] === true || raw?.['isCompleted'] === true;
  }

  bonus(item: LearningCardData): number {
    const value = Number((item.rawData as Record<string, unknown> | undefined)?.['extraCoinsByParent'] || (item.rawData as Record<string, unknown> | undefined)?.['parentAssignedCoins'] || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  duration(item: LearningCardData): string {
    const raw = item.rawData as Record<string, unknown> | undefined;
    const value = String(item.timeDuration ?? raw?.['estimatedTimeMinutes'] ?? raw?.['durationMinutes'] ?? raw?.['duration'] ?? '').trim();
    const minutes = value.match(/\d+/)?.[0];
    return minutes ? `${minutes} min` : value;
  }

  lessons(item: LearningCardData): number | null {
    const course = item.rawData as Course | undefined;
    const count = course?.noOfLessons ?? course?.lessons?.length;
    return count == null ? null : Math.max(0, Number(count) || 0);
  }

  difficulty(item: LearningCardData): string {
    const value = String(item.difficulty || '').replace(/_/g, ' ').trim();
    return value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : '';
  }

  fallbackImage(): string { return `assets/learnings/${this.tabs.find(tab => tab.id === this.tab)!.icon}`; }
  trackItem(_: number, item: LearningCardData): string { return `${item.type}:${item.id}`; }

  reload(): void {
    const generation = ++this.generation;
    this.pageRequest?.unsubscribe();
    this.requests?.unsubscribe();
    this.page = 0;
    this.totalPages = 0;
    this.active.entries = [];
    this.active.error = false;
    const userId = this.auth.getUserId();
    const age = this.auth.getCurrentUserAge();
    if (!userId) {
      this.tabs.forEach(tab => { this.content[tab.id].loading = false; this.content[tab.id].error = true; });
      return;
    }
    const summaries: Record<LearningsLandingTab, Observable<LearningCategorySummary[]>> = {
      quizzes: this.learning.fetchChallengeCategorySummary('QUIZ', false, userId, age),
      articles: this.learning.fetchArticleCategories(false, userId, age),
      masterclass: this.academy.getCategories(age, userId).pipe(map(categories => categories.filter(category =>
        (category.status || 'ACTIVE').toUpperCase() === 'ACTIVE')))
    };
    const tab = this.tab;
    this.requests = new Subscription();
    const types = { quizzes: 'QUIZ', articles: 'ARTICLE', masterclass: 'MASTERCLASS' } as const;
    for (const { id } of this.tabs) {
      if (this.totals[id] || (id === tab && !this.category && !this.query)) continue;
      this.requests.add(this.learning.fetchLearningPage(types[id], 0, 'ALL', '', age, 1).subscribe({
        next: result => {
          if (this.auth.getUserId() === userId) this.totals[id] = {
            completed: result.totalCompleted, total: result.totalPending + result.totalCompleted
          };
        },
        error: () => {}
      }));
    }
    if (!this.active.categories.length && !this.query) {
      this.requests.add(summaries[tab].subscribe({ next: categories => {
        if (generation === this.generation) this.content[tab].categories = categories;
      }, error: () => {} }));
    }
    if (!this.query) {
      this.loadPage(0);
      return;
    }

    // The unified endpoint has no keyword filter. Preserve full-catalog search
    // using the existing category APIs until keyword paging is supported.
    this.active.loading = true;
    this.pageRequest = summaries[tab].pipe(switchMap(categories => {
      const names = this.category ? [this.category] : categories.map(category => this.categoryName(category)).filter(Boolean);
      return from(new Set(names)).pipe(mergeMap(category =>
        this.categoryRequest(tab, category, userId, age).pipe(map(items => ({ category, items }))), 4));
    })).subscribe({
      next: ({ category, items }) => this.active.entries.push(...items.map(item => ({ category, item }))),
      error: () => { this.active.error = true; this.active.loading = false; },
      complete: () => { this.active.loading = false; }
    });
  }

  get pageNumbers(): number[] {
    const first = Math.max(0, Math.min(this.page - 2, this.totalPages - 5));
    return Array.from({ length: Math.min(5, this.totalPages) }, (_, index) => first + index);
  }

  changePage(page: number): void {
    if (!this.active.loading && page !== this.page && page >= 0 && page < this.totalPages) this.loadPage(page);
  }

  private loadPage(page: number): void {
    this.pageRequest?.unsubscribe();
    const state = this.active;
    const userId = this.auth.getUserId();
    const type = ({ quizzes: 'QUIZ', articles: 'ARTICLE', masterclass: 'MASTERCLASS' } as const)[this.tab];
    const tab = this.tab;
    state.loading = true;
    state.error = false;
    this.pageRequest = this.learning.fetchLearningPage(type, page, this.progress.toUpperCase(), this.category,
      this.auth.getCurrentUserAge()).subscribe({
      next: result => {
        if (this.auth.getUserId() !== userId) return;
        if (page > 0 && page >= result.totalPages) {
          this.loadPage(Math.max(0, result.totalPages - 1));
          return;
        }
        this.page = result.page;
        this.totalPages = result.totalPages;
        if (!this.category) this.totals[tab] = { completed: result.totalCompleted, total: result.totalPending + result.totalCompleted };
        state.entries = result.items.map(item => ({ item, category: item.subType || '' }));
        state.loading = false;
      },
      error: () => { state.error = true; state.loading = false; }
    });
  }

  private categoryRequest(tab: LearningsLandingTab, category: string, userId: string, age: number | null): Observable<LearningCardData[]> {
    if (tab === 'quizzes') return this.learning.fetchChallengesForLearningCategory(category, 'QUIZ', false, userId, age);
    if (tab === 'articles') return this.learning.fetchArticlesForLearningCategory(category, false, userId, age);
    return this.academy.getCoursesByCategory(category, age, userId).pipe(map(courses => courses.map(course => ({
      id: course.id, title: course.courseName, description: course.description || '',
      image: course.thumbnailUrl || 'assets/learnings/tab-masterclass.webp', coins: Number(course.totalCoins || 0),
      difficulty: course.difficulty || '', buttonText: '', type: 'masterclass' as const,
      subType: course.category || category, timeDuration: course.duration ? String(course.duration) : '', rawData: course
    }))));
  }

  private unique(entries: ContentEntry[]): LearningCardData[] {
    const items = new Map<string, LearningCardData>();
    entries.forEach(({ item }) => {
      const key = `${item.type}:${item.id}`;
      // Prefer authoritative completed state when an item belongs to multiple categories.
      if (!items.has(key) || this.completed(item)) items.set(key, item);
    });
    return Array.from(items.values());
  }
}
