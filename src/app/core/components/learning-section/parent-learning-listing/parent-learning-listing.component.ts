import { CommonModule, Location } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FooterComponent } from '../../footer/footer.component';
import { LearningCardData } from '../../../models/learning.models';
import { LearningService } from '../../../services/learning.service';
import { AuthService } from '../../../services/auth.service';

type ParentLearningCategory = 'blogs' | 'quizzes';

interface ParentLearningTab {
  key: ParentLearningCategory;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-parent-learning-listing',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, FooterComponent],
  templateUrl: './parent-learning-listing.component.html',
  styleUrls: ['./parent-learning-listing.component.scss']
})
export class ParentLearningListingComponent implements OnInit, OnDestroy {
  @ViewChild('parentSearchInput') parentSearchInput?: ElementRef<HTMLInputElement>;

  readonly tabs: ParentLearningTab[] = [
    {
      key: 'blogs',
      label: 'Blogs',
      icon: 'assets/figma/parent-home/parent-learning-blogs.webp'
    },
    {
      key: 'quizzes',
      label: 'Quizzes',
      icon: 'assets/figma/parent-home/parent-learning-quizzes.webp'
    }
  ];
  readonly pageSize = 5;

  selectedCategory: ParentLearningCategory = 'blogs';
  searchOpen = false;
  searchQuery = '';
  currentPage = 1;

  private readonly itemsByCategory: Record<ParentLearningCategory, LearningCardData[]> = {
    blogs: [],
    quizzes: []
  };
  private readonly loadingByCategory: Record<ParentLearningCategory, boolean> = {
    blogs: false,
    quizzes: false
  };
  private readonly errorByCategory: Record<ParentLearningCategory, boolean> = {
    blogs: false,
    quizzes: false
  };
  private readonly loadedCategories = new Set<ParentLearningCategory>();
  private readonly destroy$ = new Subject<void>();
  private parentUserId: string | number | null = null;

  constructor(
    private readonly learningService: LearningService,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    // This page is the parent's own learning area. A child can remain selected
    // on Parent Home, but that dashboard state must never scope these requests.
    this.parentUserId = this.authService.getUserId();
    this.selectedCategory = this.resolveInitialCategory();
    this.persistCategory(this.selectedCategory);
    this.loadSelectedCategory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedTab(): ParentLearningTab {
    return this.tabs.find(tab => tab.key === this.selectedCategory) || this.tabs[0];
  }

  get isLoading(): boolean {
    return this.loadingByCategory[this.selectedCategory];
  }

  get hasError(): boolean {
    return this.errorByCategory[this.selectedCategory];
  }

  get filteredItems(): LearningCardData[] {
    const query = this.searchQuery.trim().toLowerCase();
    const items = this.itemsByCategory[this.selectedCategory];
    if (!query) return items;

    return items.filter(item => {
      const raw = item.rawData as any;
      return [
        item.title,
        item.description,
        item.subType,
        ...(item.tags || []),
        raw?.topic,
        raw?.categoryDisplay
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }

  get pagedItems(): LearningCardData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  selectCategory(category: ParentLearningCategory): void {
    if (category === this.selectedCategory) return;

    this.selectedCategory = category;
    this.currentPage = 1;
    this.searchQuery = '';
    this.persistCategory(category);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.loadSelectedCategory();
  }

  loadSelectedCategory(forceRefresh = false): void {
    const category = this.selectedCategory;
    if (!forceRefresh && this.loadedCategories.has(category)) return;
    if (this.loadingByCategory[category]) return;

    this.loadingByCategory[category] = true;
    this.errorByCategory[category] = false;

    this.getCategoryRequest(category)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: items => {
          this.itemsByCategory[category] = Array.isArray(items) ? items : [];
          this.loadingByCategory[category] = false;
          this.errorByCategory[category] = false;
          this.loadedCategories.add(category);
          this.keepPageInRange();
        },
        error: () => {
          this.itemsByCategory[category] = [];
          this.loadingByCategory[category] = false;
          this.errorByCategory[category] = true;
        }
      });
  }

  retry(): void {
    this.loadedCategories.delete(this.selectedCategory);
    this.loadSelectedCategory(true);
  }

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen) {
      this.searchQuery = '';
      this.currentPage = 1;
      return;
    }

    setTimeout(() => this.parentSearchInput?.nativeElement.focus(), 0);
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    setTimeout(() => this.parentSearchInput?.nativeElement.focus(), 0);
  }

  setPage(page: number): void {
    const nextPage = Math.min(this.totalPages, Math.max(1, page));
    if (nextPage === this.currentPage) return;
    this.currentPage = nextPage;
    document.querySelector('.parent-learning-results-title')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  goBack(): void {
    this.location.back();
  }

  openItem(item: LearningCardData): void {
    const source = `/authed/parent-learning?category=${this.selectedCategory}`;
    const extras = {
      state: {
        source,
        forUserId: this.parentUserId,
        ownProfile: true,
        category: this.selectedCategory
      }
    };

    if (item.type === 'article') {
      void this.router.navigate(['/authed/content/article', item.id], extras);
      return;
    }
    void this.router.navigate(['/authed/content/questions', item.id], extras);
  }

  getItemTag(item: LearningCardData): string {
    const raw = item.rawData as any;

    if (this.selectedCategory === 'quizzes') {
      return String(
        item.difficulty
        || raw?.difficultyDisplay
        || raw?.difficulty
        || 'Quiz'
      );
    }

    return String(
      item.tags?.[0]
      || raw?.topic
      || item.subType
      || raw?.categoryDisplay
      || this.selectedTab.label
    );
  }

  getItemDuration(item: LearningCardData): string {
    const raw = item.rawData as any;
    const value = item.timeDuration
      || raw?.estimatedTimeMinutes
      || raw?.durationMinutes
      || raw?.timeDuration;

    if (typeof value === 'number') return `${value} min`;
    const text = String(value || '').trim();
    if (text) return /min|hour|sec/i.test(text) ? text : `${text} min`;

    const fromButton = String(item.buttonText || '').match(/(\d+(?:\.\d+)?\s*(?:min|hour|sec)[a-z]*)/i);
    return fromButton?.[1] || '';
  }

  hasItemImage(item: LearningCardData): boolean {
    const image = String(item.image || '').trim();
    return !!image && !image.includes('Flux_Dev_a_surreal');
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  trackByItemId(index: number, item: LearningCardData): number | string {
    return item.id ?? index;
  }

  private getCategoryRequest(category: ParentLearningCategory): Observable<LearningCardData[]> {
    return category === 'blogs'
      ? this.learningService.fetchArticleCards(false, this.parentUserId, undefined, true)
      : this.learningService.fetchQuizCards(false, this.parentUserId, undefined, true);
  }

  private resolveInitialCategory(): ParentLearningCategory {
    const queryCategory = this.normalizeCategory(this.route.snapshot.queryParamMap.get('category'));
    if (queryCategory) return queryCategory;

    try {
      const savedCategory = this.normalizeCategory(sessionStorage.getItem('superme_parent_learning_tab'));
      if (savedCategory) return savedCategory;
    } catch { /* Storage can be unavailable in restricted browser modes. */ }

    return 'blogs';
  }

  private normalizeCategory(value: string | null): ParentLearningCategory | null {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'blogs' || normalized === 'quizzes'
      ? normalized as ParentLearningCategory
      : null;
  }

  private persistCategory(category: ParentLearningCategory): void {
    try {
      sessionStorage.setItem('superme_parent_learning_tab', category);
    } catch { /* Storage can be unavailable in restricted browser modes. */ }
  }

  private keepPageInRange(): void {
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }
}
