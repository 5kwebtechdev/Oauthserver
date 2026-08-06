import { Component, Input, OnInit, OnDestroy, NgZone, ViewChild } from '@angular/core';
import { IonContent, ViewWillEnter } from '@ionic/angular';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, of, throwError } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { HttpClientModule } from '@angular/common/http';
import { FooterComponent } from 'src/app/core/components/footer/footer.component';
import { SupermePetComponent } from 'src/app/core/components/superme-pet/superme-pet.component';
import { LearningService } from 'src/app/core/services/learning.service';
import { LearningCardData, LearningCategorySummary } from 'src/app/core/models/learning.models';
import { EmptyStateComponent } from 'src/app/core/components/empty-state/empty-state.component';
import { CustomToastService } from 'src/app/core/services/custom-toast.service';
import { AcademyCategory, AcademyService, Course } from 'src/app/core/services/academy.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { PetAgeService } from 'src/app/core/services/pet-age.service';
import { ProfileStoreService } from 'src/app/core/services/profile-store.service';
import { ChildInfo } from 'src/app/core/models/child-info.model';
import { SkeletonImageComponent } from '../../skeleton-image/skeleton-image.component';
import { LearningChallengeCardComponent } from '../learning-card/learning-challenge-card.component';
import { LearningArticleCardComponent } from '../learning-card/learning-article-card.component';
import { SectionComingSoonComponent } from '../../section-coming-soon/section-coming-soon.component';
import { AdBannerComponent } from '../../ad-banner/ad-banner.component';
import { UserService } from 'src/app/core/services/user.service';

type LearningCategoryTab = 'puzzles' | 'quizzes' | 'articles' | 'masterclass';
type ParentLearningStatus = 'pending' | 'completed';

@Component({
  selector: 'learning-main',
  templateUrl: './learning-main.component.html',
  styleUrls: ['./learning-main.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule, HttpClientModule, FooterComponent, SupermePetComponent, EmptyStateComponent, SkeletonImageComponent, LearningChallengeCardComponent, LearningArticleCardComponent, SectionComingSoonComponent, AdBannerComponent],
  providers: [LearningService]
})
export class LearningMainComponent implements OnInit, OnDestroy, ViewWillEnter {
  @ViewChild(IonContent) ionContent?: IonContent;
  @Input() title: string = '';
  @Input() body: string = '';
  @ViewChild('parentTabs') private parentTabs?: ElementRef<HTMLElement>;
  @ViewChild('childTabs') private childTabs?: ElementRef<HTMLElement>;

  selectedCategory: LearningCategoryTab = 'puzzles';
  parentView = false;
  childView = false;
  childCoins = 0;
  parentStatus: ParentLearningStatus = 'pending';
  parentSearchOpen = false;
  parentPage = 1;
  readonly parentPageSize = 5;
  selectedChild: ChildInfo | null = null;
  categoryContentError = false;

  categoryTabs: { id: LearningCategoryTab; label: string; icon: string; parentIcon: string; ariaLabel: string }[] = [
    { id: 'puzzles', label: 'Puzzles', icon: 'assets/Icons-Neutral/Icon-Content-Puzzle.png', parentIcon: 'assets/figma/parent-child-learning/tab-puzzles.png', ariaLabel: 'Open Puzzles' },
    { id: 'quizzes', label: 'Quizzes', icon: 'assets/Icons-Neutral/Icon-Content-Quiz.png', parentIcon: 'assets/figma/parent-child-learning/tab-quizzes.png', ariaLabel: 'Open Quizzes' },
    { id: 'articles', label: 'Articles', icon: 'assets/Icons-Neutral/Icon-Content-Articles.png', parentIcon: 'assets/figma/parent-child-learning/tab-articles.png', ariaLabel: 'Open Articles' },
    { id: 'masterclass', label: 'Master Class', icon: 'assets/Icons-Neutral/Icon-Content-ForYou.png', parentIcon: 'assets/figma/parent-child-learning/tab-masterclass.png', ariaLabel: 'Open Master Class' }
  ];

  categoryItems: Record<LearningCategoryTab, LearningCategorySummary[]> = {
    puzzles: [],
    quizzes: [],
    articles: [],
    masterclass: []
  };
  searchItems: LearningCategorySummary[] = [];
  selectedCategoryItem: LearningCategorySummary | null = null;
  categoryContentItems: LearningCardData[] = [];
  categoryContentLoading = false;

  loadingTabs: Record<LearningCategoryTab, boolean> = {
    puzzles: false,
    quizzes: false,
    articles: false,
    masterclass: false
  };

  tabErrors: Record<LearningCategoryTab, boolean> = {
    puzzles: false,
    quizzes: false,
    articles: false,
    masterclass: false
  };

  private loadedTabs = new Set<LearningCategoryTab>();
  private selectedChildId: string | number | null = null;
  private parentSelectionInitialized = false;
  private childRequestCancel$ = new Subject<void>();

  searchKeyword = '';
  isSearching   = false;
  isListening   = false;

  private destroy$ = new Subject<void>();
  private recognition: any = null;

  get isLoading(): boolean {
    return Object.values(this.loadingTabs).some(Boolean);
  }

  get activeTabLoading(): boolean {
    return this.loadingTabs[this.selectedCategory];
  }

  get visibleCategoryCards(): LearningCategorySummary[] {
    return this.isSearching ? this.searchItems : this.categoryItems[this.selectedCategory];
  }

  get visibleCategoryContent(): LearningCardData[] {
    const keyword = this.searchKeyword.trim().toLowerCase();
    if (!keyword) return this.categoryContentItems;

    return this.categoryContentItems.filter(item => [
      item.title,
      item.description,
      item.type,
      item.category,
      item.subType,
      ...(item.tags || [])
    ].filter(Boolean).join(' ').toLowerCase().includes(keyword));
  }

  get parentCategoryTabs(): typeof this.categoryTabs {
    const order: LearningCategoryTab[] = ['quizzes', 'puzzles', 'articles', 'masterclass'];
    return order
      .map(id => this.categoryTabs.find(tab => tab.id === id))
      .filter((tab): tab is typeof this.categoryTabs[number] => !!tab);
  }

  get visibleParentContent(): LearningCardData[] {
    return this.visibleCategoryContent.filter(item => this.getParentItemStatus(item) === this.parentStatus);
  }

  get pagedParentContent(): LearningCardData[] {
    const start = (this.parentPage - 1) * this.parentPageSize;
    return this.visibleParentContent.slice(start, start + this.parentPageSize);
  }

  get parentTotalPages(): number {
    return Math.max(1, Math.ceil(this.visibleParentContent.length / this.parentPageSize));
  }

  get parentPageNumbers(): number[] {
    return Array.from({ length: this.parentTotalPages }, (_, index) => index + 1);
  }

  get hasSelectedChild(): boolean {
    return this.selectedChildId !== null && this.selectedChildId !== undefined;
  }

  get parentStatusOptions(): Array<{ id: ParentLearningStatus; label: string; count: number }> {
    return [
      { id: 'pending', label: 'Pending', count: this.getParentStatusCount('pending') },
      { id: 'completed', label: 'Completed', count: this.getParentStatusCount('completed') }
    ];
  }

  get parentHeaderTitle(): string {
    return this.selectedCategoryItem ? this.getCategoryTitle(this.selectedCategoryItem) : 'Your Child’s Learnings';
  }

  get parentHeaderSubtitle(): string {
    return this.selectedCategoryItem ? this.getCategoryCountText(this.selectedCategoryItem) : '';
  }

  get parentGuidanceText(): string {
    const name = String(this.selectedChild?.name || '').trim();
    return name
      ? `View ${name}'s feed, assign extra coins, and support their learning at each step.`
      : `View your child's feed, assign extra coins, and support their learning at each step.`;
  }

  get parentSearchPlaceholder(): string {
    const singular: Record<LearningCategoryTab, string> = {
      quizzes: 'quiz',
      puzzles: 'puzzle',
      articles: 'article',
      masterclass: 'masterclass'
    };
    return `Looking for a ${singular[this.selectedCategory]}?`;
  }

  constructor(
    private learningService: LearningService,
    private toastService: CustomToastService,
    private academyService: AcademyService,
    private authService: AuthService,
    private petAgeService: PetAgeService,
    private profileStore: ProfileStoreService,
    private router: Router,
    private zone: NgZone,
    private route: ActivatedRoute,
    private location: Location,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.parentView = this.route.snapshot.queryParamMap.get('view') === 'parent'
      || this.authService.isParentUser();
    this.childView = !this.parentView && this.authService.getUserRelationship() === 'CHILD';
    const requestedCategory = this.normalizeCategory(this.route.snapshot.queryParamMap.get('tab'));
    if (requestedCategory) {
      this.selectedCategory = requestedCategory;
    } else if (this.parentView) {
      const savedCategory = this.readParentCategory();
      this.selectedCategory = savedCategory || 'quizzes';
    } else if (this.childView) {
      this.selectedCategory = 'quizzes';
    }

    if (this.parentView) {
      this.bindSelectedChild();
    } else {
      if (this.childView) this.bindChildStats();
      this.loadTab(this.selectedCategory);
    }
  }

  private bindChildStats(): void {
    this.userService.stats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        if (stats) this.childCoins = Number(stats.coins || 0);
      });

    this.userService.refreshStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ error: () => undefined });
  }

  private bindSelectedChild(): void {
    this.profileStore.selectionChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(child => {
        const nextId = child?.id ?? null;
        const changed = !this.parentSelectionInitialized
          || String(nextId ?? '') !== String(this.selectedChildId ?? '');

        this.selectedChild = child;
        this.selectedChildId = nextId;
        if (!changed) return;

        this.parentSelectionInitialized = true;
        this.childRequestCancel$.next();
        this.resetParentLearningData();
        if (this.hasSelectedChild) {
          this.loadTab(this.selectedCategory, true);
        }
      });
  }

  private resetParentLearningData(): void {
    this.categoryItems = {
      puzzles: [],
      quizzes: [],
      articles: [],
      masterclass: []
    };
    this.searchItems = [];
    this.selectedCategoryItem = null;
    this.categoryContentItems = [];
    this.categoryContentLoading = false;
    this.categoryContentError = false;
    this.searchKeyword = '';
    this.isSearching = false;
    this.parentSearchOpen = false;
    this.parentStatus = 'pending';
    this.parentPage = 1;
    this.loadedTabs.clear();
    (Object.keys(this.loadingTabs) as LearningCategoryTab[]).forEach(tab => {
      this.loadingTabs[tab] = false;
      this.tabErrors[tab] = false;
    });
  }

  private readParentCategory(): LearningCategoryTab | null {
    const queryCategory = this.normalizeCategory(this.route.snapshot.queryParamMap.get('category'));
    if (queryCategory) return queryCategory;

    try {
      return this.normalizeCategory(sessionStorage.getItem('superme_parent_learning_main_tab'));
    } catch {
      return null;
    }
  }

  private persistParentCategory(category: LearningCategoryTab): void {
    try {
      sessionStorage.setItem('superme_parent_learning_main_tab', category);
    } catch {
      // Storage can be unavailable in restricted browser modes.
    }
  }

  private normalizeCategory(value: string | null): LearningCategoryTab | null {
    const normalized = String(value || '').trim().toLowerCase();
    const validTabs: LearningCategoryTab[] = ['puzzles', 'quizzes', 'articles', 'masterclass'];
    return validTabs.includes(normalized as LearningCategoryTab) ? (normalized as LearningCategoryTab) : null;
  }

  goBackFromParentLearning(): void {
    if (this.selectedCategoryItem) {
      this.closeCategoryContent();
      return;
    }
    this.location.back();
  }

  retryParentLoad(): void {
    if (this.selectedCategoryItem) {
      this.onCategoryCardClick(this.selectedCategoryItem);
      return;
    }
    this.loadTab(this.selectedCategory, true);
  }

  setParentStatus(status: ParentLearningStatus): void {
    this.parentStatus = status;
    this.parentPage = 1;
  }

  setParentPage(page: number): void {
    const nextPage = Math.min(this.parentTotalPages, Math.max(1, page));
    if (nextPage === this.parentPage) return;
    this.parentPage = nextPage;
    document.querySelector('.parent-status-tabs, .child-status-tabs')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  toggleParentSearch(): void {
    this.parentSearchOpen = !this.parentSearchOpen;
    if (!this.parentSearchOpen) this.clearSearch();
  }

  /**
   * Only "completed" has real backend signal today (Article.alreadyRead).
   * Challenges carry no per-user completion field yet, and there's no
   * assignment API at all, so both fall back to "pending" until the
   * backend exposes that data — this keeps the tabs honest instead of
   * guessing.
   */
  getParentItemStatus(item: LearningCardData): ParentLearningStatus {
    const raw = item.rawData as any;
    const scopedStatus = String(raw?.userLearningStatus || raw?.progressStatus || '').toUpperCase();
    if (scopedStatus === 'COMPLETED' || scopedStatus === 'READ') return 'completed';
    if (item.type === 'masterclass') {
      return raw?.isCourseCompleted === true || Number(raw?.completionPercentage || 0) >= 100
        ? 'completed'
        : 'pending';
    }
    if (item.type === 'article') {
      return raw?.alreadyRead === true || raw?.status === 'READ' ? 'completed' : 'pending';
    }
    return raw?.completed === true || raw?.isCompleted === true ? 'completed' : 'pending';
  }

  getParentStatusCount(status: ParentLearningStatus): number {
    return this.visibleCategoryContent.filter(item => this.getParentItemStatus(item) === status).length;
  }

  getParentActionLabel(item: LearningCardData): string {
    const status = this.getParentItemStatus(item);
    if (status === 'completed') return 'View';
    return this.isParentItemAssigned(item) ? 'View' : 'Assign';
  }

  getParentItemDetail(item: LearningCardData): string {
    const raw = item.rawData as any;
    if (item.type === 'masterclass') {
      const lessons = Number(raw?.noOfLessons ?? raw?.lessons?.length ?? 0);
      return `${lessons} ${lessons === 1 ? 'lesson' : 'lessons'}`;
    }
    if (item.type === 'article') {
      const minutes = Number(raw?.durationMinutes || 0);
      return minutes > 0 ? `${minutes} min read` : '';
    }
    return '';
  }

  getParentBonusCoins(item: LearningCardData): number {
    const raw = item.rawData as any;
    const value = Number(
      raw?.assignmentCoins
      ?? raw?.bonusCoins
      ?? raw?.extraCoins
      ?? raw?.coinsForCorrectAnswer
      ?? 0
    );
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }

  isParentItemAssigned(item: LearningCardData): boolean {
    const raw = item.rawData as any;
    const status = String(raw?.userLearningStatus || raw?.assignmentStatus || '').toUpperCase();
    return raw?.assigned === true || !!raw?.assignedAt || status === 'ASSIGNED';
  }

  openParentLearningItem(item: LearningCardData): void {
    const extras = {
      state: {
        source: '/authed/content?view=parent',
        selectedChildId: this.selectedChildId
      }
    };
    if (item.type === 'masterclass') {
      void this.router.navigate(['/authed/academy/course', item.id], extras);
      return;
    }
    if (item.type === 'article') {
      void this.router.navigate(['/authed/content/article', item.id], extras);
      return;
    }
    void this.router.navigate(['/authed/content/description', item.id], extras);
  }

  openChildLearningItem(item: LearningCardData): void {
    const extras = { state: { source: '/authed/content' } };
    if (item.type === 'masterclass') {
      void this.router.navigate(['/authed/academy/course', item.id], extras);
      return;
    }
    if (item.type === 'article') {
      void this.router.navigate(['/authed/content/article', item.id], extras);
      return;
    }
    void this.router.navigate(['/authed/content/description', item.id], extras);
  }

  getChildTrophyCount(item: LearningCardData): number {
    const raw = item.rawData as any;
    const value = Number(item.trophy ?? raw?.trophies ?? raw?.trophy ?? 0);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }

  getChildTimeText(item: LearningCardData): string {
    const raw = item.rawData as any;
    const source = String(
      item.timeDuration
      ?? raw?.estimatedTimeMinutes
      ?? raw?.durationMinutes
      ?? raw?.duration
      ?? ''
    ).trim();
    if (!source) return '';

    const minutes = source.match(/\d+/)?.[0];
    return minutes ? `${minutes} min` : source;
  }

  onParentImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  get currentPetCuriousImage(): string {
    return this.petAgeService.getPetImagePath('curious');
  }

  get currentPetCuriousAlt(): string {
    return this.petAgeService.getPetImageAlt('curious');
  }

  ionViewWillEnter(): void {
    // Refresh current tab when returning to the page
    if (!this.parentView || this.hasSelectedChild) {
      this.loadTab(this.selectedCategory, true);
    }
  }

  private loadTab(tab: LearningCategoryTab, forceRefresh = false): void {
    if (!forceRefresh && this.loadedTabs.has(tab)) return;
    if (this.loadingTabs[tab]) return;
    if (this.parentView && !this.hasSelectedChild) return;

    this.loadingTabs[tab] = true;
    this.tabErrors[tab] = false;
    const requestChildId = this.parentView ? this.selectedChildId : null;
    this.getCategoryRequest(tab)
      .pipe(takeUntil(this.destroy$), takeUntil(this.childRequestCancel$))
      .subscribe({
        next: items => {
          if (this.parentView && String(requestChildId) !== String(this.selectedChildId)) return;
          this.categoryItems[tab] = items;
          this.loadingTabs[tab] = false;
          this.loadedTabs.add(tab);
          if (this.searchKeyword.trim()) this.updateSearchResults();
        },
        error: () => {
          if (this.parentView && String(requestChildId) !== String(this.selectedChildId)) return;
          this.loadingTabs[tab] = false;
          this.tabErrors[tab] = true;
        }
      });
  }

  private getCategoryRequest(tab: LearningCategoryTab): Observable<LearningCategorySummary[]> {
    switch (tab) {
      case 'quizzes':
        return this.learningService.fetchChallengeCategorySummary('QUIZ', !this.parentView, this.selectedChildId);
      case 'articles':
        return this.learningService.fetchArticleCategories(!this.parentView, this.selectedChildId);
      case 'masterclass':
        return this.fetchMasterClassCategories();
      case 'puzzles':
      default:
        return this.learningService.fetchChallengeCategorySummary('PUZZLE', !this.parentView, this.selectedChildId);
    }
  }

  /**
   * MasterClass reuses the same Life Skills Quest categories shown on the
   * Academy home screen, instead of the generic (and often test-data-polluted)
   * challenge categories endpoint.
   */
  private fetchMasterClassCategories(): Observable<LearningCategorySummary[]> {
    return this.academyService.getCategories().pipe(
      map((categories: AcademyCategory[]) => (categories || [])
        .filter(category => (category.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
        .map(category => this.mapAcademyCategoryToSummary(category))),
      catchError(error => {
        console.error('Error fetching Life Skills Quest categories for MasterClass:', error);
        return this.parentView ? throwError(() => error) : of([]);
      })
    );
  }

  private mapAcademyCategoryToSummary(category: AcademyCategory): LearningCategorySummary {
    return {
      id: category.id,
      name: this.formatMasterClassTitle(category.categoryName),
      categoryName: category.categoryName,
      description: category.description || '',
      thumbnailUrl: category.thumbnailUrl || '',
      image: category.thumbnailUrl || '',
      status: category.status,
      count: category.courseCount || 0,
      type: 'masterclass'
    };
  }

  private formatMasterClassTitle(categoryName: string): string {
    const title = (categoryName || '').trim().replace(/_/g, ' ');
    const isAllCaps = title === title.toUpperCase();
    if (!isAllCaps) return title;
    return title.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
  }

  ngOnDestroy(): void {
    this.stopVoiceSearch();
    this.childRequestCancel$.next();
    this.childRequestCancel$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectCategory(cat: LearningCategoryTab) {
    this.selectedCategory = cat;
    if (this.parentView) this.persistParentCategory(cat);
    this.closeCategoryContent();
    this.loadTab(cat);
    if (this.searchKeyword.trim()) this.updateSearchResults();
    this.scrollLearningToTop();
  }

  openPuzzles() { this.selectCategory('puzzles'); }
  openQuizzes() { this.selectCategory('quizzes'); }
  openArticles() { this.selectCategory('articles'); }
  openMasterClass() { this.selectCategory('masterclass'); }

  onSearchInput(): void {
    if (this.parentView) this.parentPage = 1;
    this.updateSearchResults();
  }

  performSearch(): void {
    this.updateSearchResults();
  }

  async onVoiceSearch(): Promise<void> {
    if (this.isListening) {
      this.stopVoiceSearch();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.toastService.error('Voice search is not supported on this device.');
      return;
    }

    // Check permission state without consuming the microphone stream.
    // Using getUserMedia before SpeechRecognition.start() competes for the
    // audio resource and causes service-not-allowed on Android WebView.
    const denied = await this.isMicrophoneDenied();
    if (denied) {
      this.toastService.error('Microphone permission is required. Please enable it in your device settings.');
      return;
    }

    this.stopVoiceSearch();

    const recognition = new SpeechRecognition();
    this.recognition = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onstart = () => {
      this.zone.run(() => {
        this.isListening = true;
        this.toastService.show('Listening...', 'info', 1500);
      });
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const spokenText = (finalTranscript || interimTranscript).trim();
      if (spokenText) {
        this.zone.run(() => {
          this.searchKeyword = spokenText;
          this.updateSearchResults();
        });
      }
    };

    recognition.onerror = (event: any) => {
      this.zone.run(() => {
        this.isListening = false;
        this.toastService.error(this.getVoiceSearchErrorMessage(event?.error));
      });
    };

    recognition.onend = () => {
      this.zone.run(() => {
        this.isListening = false;
        if (this.recognition === recognition) {
          this.recognition = null;
        }
      });
    };

    try {
      recognition.start();
    } catch (error) {
      this.isListening = false;
      this.recognition = null;
      this.toastService.error('Voice search could not start. Please try again.');
    }
  }

  /**
   * Returns true only when the microphone permission is explicitly denied.
   * Uses the Permissions API (no microphone stream acquired) so we don't
   * compete with SpeechRecognition for the audio resource — which is the
   * root cause of service-not-allowed on Android WebView when getUserMedia
   * was called immediately before recognition.start().
   */
  private async isMicrophoneDenied(): Promise<boolean> {
    try {
      if (navigator.permissions) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return status.state === 'denied';
      }
    } catch {
      // Permissions API unsupported — let SpeechRecognition decide
    }
    return false;
  }

  private stopVoiceSearch(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) { }
      this.recognition = null;
    }
    this.isListening = false;
  }

  private getVoiceSearchErrorMessage(error?: string): string {
    switch (error) {
      case 'not-allowed':
        return 'Microphone permission is required. Please enable it in your device settings.';
      case 'service-not-allowed':
        return 'Voice search service is unavailable on this device. Please use the keyboard to search.';
      case 'no-speech':
        return 'No voice detected. Please try again.';
      case 'audio-capture':
        return 'Microphone is not available on this device.';
      case 'network':
        return 'Voice search needs a stable internet connection.';
      default:
        return 'Voice search could not hear that. Please try again.';
    }
  }

  private updateSearchResults(): void {
    const keyword = this.searchKeyword.trim().toLowerCase();
    if (!keyword) {
      this.isSearching = false;
      this.searchItems = [];
      return;
    }
    this.isSearching = true;
    if (this.selectedCategoryItem) return;
    this.searchItems = this.categoryItems[this.selectedCategory].filter(item => this.matchesSearch(item, keyword));
  }

  private matchesSearch(item: LearningCategorySummary, keyword: string): boolean {
    return [item.name, item.categoryName, item.description, item.type]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(keyword);
  }

  getCategoryTitle(item: LearningCategorySummary): string {
    return item.name || item.categoryName || 'Untitled';
  }

  getCategoryImage(item: LearningCategorySummary): string {
    return item.thumbnailUrl || item.image || this.getCategoryFallbackImage();
  }

  isPhotographicCategoryImage(item: LearningCategorySummary): boolean {
    const imageUrl = this.getCategoryImage(item).split('?')[0].toLowerCase();
    return /\.(jpe?g|webp|avif)$/.test(imageUrl);
  }

  getCategoryImageFit(item: LearningCategorySummary): 'cover' | 'contain' {
    return this.isPhotographicCategoryImage(item) ? 'cover' : 'contain';
  }

  getCategoryFallbackImage(): string {
    if (this.parentView || this.childView) {
      return this.parentCategoryTabs.find(tab => tab.id === this.selectedCategory)?.parentIcon
        || 'assets/figma/parent-child-learning/tab-quizzes.png';
    }
    switch (this.selectedCategory) {
      case 'quizzes':
        return 'assets/Icons-Neutral/Icon-Content-Quiz.png';
      case 'articles':
        return 'assets/Icons-Neutral/Icon-Content-Articles.png';
      case 'masterclass':
        return 'assets/Icons-Neutral/Icon-Content-ForYou.png';
      case 'puzzles':
      default:
        return 'assets/Icons-Neutral/Icon-Content-Puzzle.png';
    }
  }

  getCategoryCountText(item: LearningCategorySummary): string {
    const count = Number(item.count || 0);
    const label = this.getCategoryUnitLabel(count);
    return `${count} ${label}`;
  }

  private getCategoryUnitLabel(count: number): string {
    const singular = count === 1;
    switch (this.selectedCategory) {
      case 'quizzes':
        return singular ? 'quiz' : 'quizzes';
      case 'articles':
        return singular ? 'article' : 'articles';
      case 'masterclass':
        return singular ? 'masterclass' : 'masterclasses';
      case 'puzzles':
      default:
        return singular ? 'puzzle' : 'puzzles';
    }
  }

  clearSearch(): void {
    this.searchKeyword = '';
    this.isSearching = false;
    this.searchItems = [];
    this.parentPage = 1;
  }

  onCategoryCardClick(item: LearningCategorySummary): void {
    const categoryName = item.categoryName || item.name;
    if (!categoryName) return;
    this.scrollLearningToTop();

    if (this.selectedCategory === 'masterclass' && !this.parentView) {
      const age = this.authService.getCurrentUserAge();
      const queryParams: Record<string, string | number> = {
        category: categoryName,
        categoryId: item.id,
        title: this.getCategoryTitle(item),
        subtitle: item.description || ''
      };
      if (age) queryParams['age'] = age;
      this.router.navigate(['/authed/academy/subject'], { queryParams });
      return;
    }

    this.selectedCategoryItem = item;
    this.categoryContentItems = [];
    this.categoryContentLoading = true;
    this.categoryContentError = false;
    this.parentStatus = 'pending';
    this.parentPage = 1;
    this.parentSearchOpen = false;
    this.clearSearch();
    const requestChildId = this.parentView ? this.selectedChildId : null;

    let request: Observable<LearningCardData[]>;
    if (this.selectedCategory === 'masterclass') {
      request = this.academyService.getCoursesByCategory(
        categoryName,
        null,
        requestChildId
      ).pipe(map(courses => (courses || []).map(course => this.mapCourseToLearningCard(course))));
    } else if (this.selectedCategory === 'articles') {
      request = this.learningService.fetchArticlesForLearningCategory(
        categoryName,
        !this.parentView,
        requestChildId
      );
    } else {
      request = this.learningService.fetchChallengesForLearningCategory(
        categoryName,
        this.getSelectedChallengeType(),
        !this.parentView,
        requestChildId
      );
    }

    request.pipe(takeUntil(this.destroy$), takeUntil(this.childRequestCancel$)).subscribe({
      next: items => {
        if (this.parentView && String(requestChildId) !== String(this.selectedChildId)) return;
        this.categoryContentItems = items;
        this.categoryContentLoading = false;
      },
      error: () => {
        if (this.parentView && String(requestChildId) !== String(this.selectedChildId)) return;
        this.categoryContentItems = [];
        this.categoryContentLoading = false;
        this.categoryContentError = true;
      }
    });
  }

  closeCategoryContent(): void {
    this.selectedCategoryItem = null;
    this.categoryContentItems = [];
    this.categoryContentLoading = false;
    this.categoryContentError = false;
    this.parentSearchOpen = false;
    this.parentStatus = 'pending';
    this.parentPage = 1;
    this.clearSearch();
    if (this.searchKeyword.trim()) this.updateSearchResults();
    this.scrollLearningToTop();
  }

  private scrollLearningToTop(): void {
    setTimeout(() => void this.ionContent?.scrollToTop(0), 0);
  }

  private mapCourseToLearningCard(course: Course): LearningCardData {
    return {
      id: course.id,
      title: course.courseName,
      description: course.description || '',
      image: course.thumbnailUrl || this.getCategoryFallbackImage(),
      coins: Number(course.totalCoins || 0),
      difficulty: course.difficulty || '',
      buttonText: '',
      type: 'masterclass',
      subType: course.category || '',
      timeDuration: course.duration ? String(course.duration) : '',
      rawData: course
    };
  }

  private getSelectedChallengeType(): 'QUIZ' | 'PUZZLE' | undefined {
    if (this.selectedCategory === 'quizzes') return 'QUIZ';
    if (this.selectedCategory === 'puzzles') return 'PUZZLE';
    return undefined;
  }
}
