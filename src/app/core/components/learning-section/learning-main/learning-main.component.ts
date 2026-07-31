import { Component, Input, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { HttpClientModule } from '@angular/common/http';
import { FooterComponent } from 'src/app/core/components/footer/footer.component';
import { SupermePetComponent } from 'src/app/core/components/superme-pet/superme-pet.component';
import { LearningService } from 'src/app/core/services/learning.service';
import { LearningCardData, LearningCategorySummary } from 'src/app/core/models/learning.models';
import { EmptyStateComponent } from 'src/app/core/components/empty-state/empty-state.component';
import { CustomToastService } from 'src/app/core/services/custom-toast.service';
import { AcademyCategory, AcademyService } from 'src/app/core/services/academy.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { PetAgeService } from 'src/app/core/services/pet-age.service';
import { SkeletonImageComponent } from '../../skeleton-image/skeleton-image.component';
import { LearningChallengeCardComponent } from '../learning-card/learning-challenge-card.component';
import { LearningArticleCardComponent } from '../learning-card/learning-article-card.component';
import { SectionComingSoonComponent } from '../../section-coming-soon/section-coming-soon.component';

type LearningCategoryTab = 'puzzles' | 'quizzes' | 'articles' | 'masterclass';

@Component({
  selector: 'learning-main',
  templateUrl: './learning-main.component.html',
  styleUrls: ['./learning-main.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule, HttpClientModule, FooterComponent, SupermePetComponent, EmptyStateComponent, SkeletonImageComponent, LearningChallengeCardComponent, LearningArticleCardComponent, SectionComingSoonComponent],
  providers: [LearningService]
})
export class LearningMainComponent implements OnInit, OnDestroy, ViewWillEnter {
  @Input() title: string = '';
  @Input() body: string = '';

  selectedCategory: LearningCategoryTab = 'puzzles';

  categoryTabs: { id: LearningCategoryTab; label: string; icon: string; ariaLabel: string }[] = [
    { id: 'puzzles', label: 'Puzzles', icon: 'assets/Icons-Neutral/Icon-Content-Puzzle.png', ariaLabel: 'Open Puzzles' },
    { id: 'quizzes', label: 'Quizzes', icon: 'assets/Icons-Neutral/Icon-Content-Quiz.png', ariaLabel: 'Open Quizzes' },
    { id: 'articles', label: 'Articles', icon: 'assets/Icons-Neutral/Icon-Content-Articles.png', ariaLabel: 'Open Articles' },
    { id: 'masterclass', label: 'MasterClass', icon: 'assets/Icons-Neutral/Icon-Content-ForYou.png', ariaLabel: 'Open MasterClass' }
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

  private loadedTabs = new Set<LearningCategoryTab>();

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

  constructor(
    private learningService: LearningService,
    private toastService: CustomToastService,
    private academyService: AcademyService,
    private authService: AuthService,
    private petAgeService: PetAgeService,
    private router: Router,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    this.loadTab('puzzles');
  }

  get currentPetCuriousImage(): string {
    return this.petAgeService.getPetImagePath('curious');
  }

  get currentPetCuriousAlt(): string {
    return this.petAgeService.getPetImageAlt('curious');
  }

  ionViewWillEnter(): void {
    // Refresh current tab when returning to the page
    this.loadTab(this.selectedCategory, true);
  }

  private loadTab(tab: LearningCategoryTab, forceRefresh = false): void {
    if (!forceRefresh && this.loadedTabs.has(tab)) return;

    this.loadingTabs[tab] = true;
    this.getCategoryRequest(tab)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: items => {
          this.categoryItems[tab] = items;
          this.loadingTabs[tab] = false;
          this.loadedTabs.add(tab);
          if (this.searchKeyword.trim()) this.updateSearchResults();
        },
        error: () => {
          this.loadingTabs[tab] = false;
        }
      });
  }

  private getCategoryRequest(tab: LearningCategoryTab): Observable<LearningCategorySummary[]> {
    switch (tab) {
      case 'quizzes':
        return this.learningService.fetchChallengeCategorySummary('QUIZ');
      case 'articles':
        return this.learningService.fetchArticleCategories();
      case 'masterclass':
        return this.fetchMasterClassCategories();
      case 'puzzles':
      default:
        return this.learningService.fetchChallengeCategorySummary('PUZZLE');
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
        return of([]);
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectCategory(cat: LearningCategoryTab) {
    this.selectedCategory = cat;
    this.closeCategoryContent();
    this.loadTab(cat);
    if (this.searchKeyword.trim()) this.updateSearchResults();
  }

  openPuzzles() { this.selectCategory('puzzles'); }
  openQuizzes() { this.selectCategory('quizzes'); }
  openArticles() { this.selectCategory('articles'); }
  openMasterClass() { this.selectCategory('masterclass'); }

  onSearchInput(): void {
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
  }

  onCategoryCardClick(item: LearningCategorySummary): void {
    const categoryName = item.categoryName || item.name;
    if (!categoryName) return;

    if (this.selectedCategory === 'masterclass') {
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

    const request = this.selectedCategory === 'articles'
      ? this.learningService.fetchArticlesForLearningCategory(categoryName)
      : this.learningService.fetchChallengesForLearningCategory(
          categoryName,
          this.getSelectedChallengeType()
        );

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: items => {
        this.categoryContentItems = items;
        this.categoryContentLoading = false;
      },
      error: () => {
        this.categoryContentItems = [];
        this.categoryContentLoading = false;
      }
    });
  }

  closeCategoryContent(): void {
    this.selectedCategoryItem = null;
    this.categoryContentItems = [];
    this.categoryContentLoading = false;
    if (this.searchKeyword.trim()) this.updateSearchResults();
  }

  private getSelectedChallengeType(): 'QUIZ' | 'PUZZLE' | undefined {
    if (this.selectedCategory === 'quizzes') return 'QUIZ';
    if (this.selectedCategory === 'puzzles') return 'PUZZLE';
    return undefined;
  }
}
