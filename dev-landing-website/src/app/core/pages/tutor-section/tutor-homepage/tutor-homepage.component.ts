import { Component, HostListener, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { finalize } from 'rxjs/operators';

import { FooterComponent } from '../../../components/footer/footer.component';
import { TutorCardComponent } from '../tutor-card/tutor-card.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { SupremePetBubbleComponent } from '../../../components/superme-pet-bubble/superme-pet-bubble.component';
import { ITutor } from '../../../models/tutor.model';
import { TutorApi, TutorCategoriesResponse } from '../../../api/tutor.api';
import { TutorService, SelectedFilters } from '../../../../core/services/tutor.service';
import { AdSliderComponent } from '../../../components/ad-slider/ad-slider.component';


interface FilterOption { id: string; value: string; label: string; }
interface FilterGroup { label: string; fieldKey: string; items: FilterOption[]; }
interface CategoryConfig { key: string; label: string; icon: string; filterGroups: FilterGroup[]; }

@Component({
  selector: 'tutor-homepage',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    FormsModule,
    PublicNavbarComponent,
    FooterComponent,
    TutorCardComponent,
    SupermeButtonComponent
    ,SupremePetBubbleComponent,
    AdSliderComponent
  ],
  templateUrl: './tutor-homepage.component.html',
  styleUrls: ['./tutor-homepage.component.scss']
})
export class TutorHomepageComponent implements OnInit, OnDestroy {
  
  tutors: ITutor[] = [];
  filteredTutors: ITutor[] = [];
  isLoading = false;
  isLoadingCategories = false;

  pageSize = 20;
  currentPage = 1;

  
  searchQuery = '';

  
  showFilters = false;
  showSort = false;
  showReferModal = false;

  
  currentSort: 'alphabets' | 'most-liked' | 'experience' | 'recent' = 'recent';
  readonly sortOptions: { key: 'alphabets' | 'most-liked' | 'experience' | 'recent'; label: string }[] = [
    { key: 'alphabets', label: 'Alphabets' },
    { key: 'most-liked', label: 'Most Liked' },
    { key: 'experience', label: 'Experience' },
    { key: 'recent', label: 'Recently added' }
  ];

  
  categories: CategoryConfig[] = [];
  activeCategory = 'school';
  activeSidebarGroup: string | null = null;
  selectedFiltersMap = new Map<string, Set<string>>();
  resultCount: number | null = null;

  @ViewChild('categoryTabsContainer') categoryTabsRef!: ElementRef<HTMLElement>;

  
  private search$ = new Subject<string>();
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private tutorApi: TutorApi,
    private tutorService: TutorService,
    private hostRef: ElementRef<HTMLElement>
  ) { }

  ngOnInit(): void {
    this.initializeSubscriptions();
    this.loadCategoriesFromAPI();
    this.loadTutorsFromAPI();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.search$.complete();
  }

  private initializeSubscriptions(): void {
    // Subscribe to loading state from service
    this.subscriptions.add(
      this.tutorService.isLoading$.subscribe((loading: boolean) => {
        this.isLoading = loading;
      })
    );

    // Subscribe to filtered tutors from service
    this.subscriptions.add(
      this.tutorService.tutors$.subscribe((tutors: ITutor[]) => {
        this.tutors = tutors;
        this.currentPage = 1;
        this.filteredTutors = this.sortTutors(tutors);
      })
    );

    this.subscriptions.add(
      this.search$.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(query => {
        // Call service to filter cached tutors (NO API CALL)
        this.tutorService.searchTutors(query);
      })
    );
  }

  private loadCategoriesFromAPI(): void {
    this.isLoadingCategories = true;

    this.tutorApi.getTutorCategories()
      .pipe(finalize(() => this.isLoadingCategories = false))
      .subscribe({
        next: (apiCategories) => {
          this.categories = this.mapAPICategoriesToUI(apiCategories);
          this.setActiveCategoryDefaults();
        },
        error: (error) => {
          console.error('[TutorHomepage] Error loading categories:', error);
          this.setActiveCategoryDefaults();
        }
      });
  }

  /**
   * Load tutors from API (single call, then cached)
   */
  private loadTutorsFromAPI(): void {
    this.subscriptions.add(
      this.tutorService.fetchTutors().subscribe({
        next: (tutors: ITutor[]) => {
          console.log('[TutorHomepage] Tutors loaded:', tutors.length);
        },
        error: (error: any) => {
          console.error('[TutorHomepage] Error loading tutors:', error);
        }
      })
    );
  }


  onSearch(): void {
    this.search$.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.search$.next('');
  }

  selectSort(option: typeof this.currentSort): void {
    this.currentSort = option;
    this.showSort = false;
    this.currentPage = 1;
    this.filteredTutors = this.sortTutors(this.filteredTutors);
  }

  get currentSortLabel(): string {
    const opt = this.sortOptions.find(o => o.key === this.currentSort);
    return opt ? opt.label : 'Recently added';
  }

  get paginatedTutors(): ITutor[] {
    return this.filteredTutors.slice(0, this.currentPage * this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTutors.length / this.pageSize);
  }

  get hasMoreTutors(): boolean {
    return this.currentPage * this.pageSize < this.filteredTutors.length;
  }

  loadMore(): void {
    if (this.hasMoreTutors) {
      this.currentPage++;
    }
  }

  private sortTutors(tutors: ITutor[]): ITutor[] {
    if (!tutors || tutors.length === 0) return [];

    const sorted = [...tutors];

    switch (this.currentSort) {
      case 'alphabets':
        return sorted.sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );

      case 'most-liked':
        return sorted.sort((a, b) =>
          (b.hearts || 0) - (a.hearts || 0)
        );

      case 'experience':
        return sorted.sort((a, b) => {
          const getYears = (exp: string | undefined) =>
            parseInt(exp?.split(' ')[0] || '0', 10);
          return getYears(b.experience) - getYears(a.experience);
        });

      case 'recent':
      default:
        return sorted.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.showSort) return;
    const clickedInside = this.hostRef?.nativeElement?.contains(event.target as Node);
    if (!clickedInside) this.showSort = false;
  }

  toggleSort(event?: Event): void {
    if (event && typeof (event as Event).stopPropagation === 'function') {
      (event as Event).stopPropagation();
    }
    this.showSort = !this.showSort;
  }

  // ===== Filter System =====

  get currentCategory(): CategoryConfig | undefined {
    return this.categories.find(c => c.key === this.activeCategory);
  }

  get sidebarGroups(): FilterGroup[] {
    return this.currentCategory?.filterGroups || [];
  }

  get currentSubFilters(): FilterOption[] {
    const group = this.sidebarGroups.find(g => g.label === this.activeSidebarGroup);
    return group?.items || [];
  }

  get currentFieldKey(): string {
    const group = this.sidebarGroups.find(g => g.label === this.activeSidebarGroup);
    return group?.fieldKey || '';
  }

  get totalSelectedCount(): number {
    let count = 0;
    this.selectedFiltersMap.forEach(set => count += set.size);
    return count;
  }

  selectCategory(key: string): void {
    this.activeCategory = key;
    this.setActiveCategoryDefaults();
  }

  selectSidebar(label: string): void {
    this.activeSidebarGroup = label;
  }

  isSubFilterSelected(item: FilterOption): boolean {
    const set = this.selectedFiltersMap.get(this.currentFieldKey);
    return set ? set.has(item.value) : false;
  }

  onToggleSubFilter(item: FilterOption, checked: boolean): void {
    const fieldKey = this.currentFieldKey;
    if (!fieldKey) return;

    if (!this.selectedFiltersMap.has(fieldKey)) {
      this.selectedFiltersMap.set(fieldKey, new Set());
    }

    const set = this.selectedFiltersMap.get(fieldKey)!;
    if (checked) {
      set.add(item.value);
    } else {
      set.delete(item.value);
    }

    this.updateResultCount();
  }

  getSelectedCount(fieldKey: string): number {
    return this.selectedFiltersMap.get(fieldKey)?.size || 0;
  }

  private updateResultCount(): void {
    try {
      const sel = this.getSelectedFilters();
      this.resultCount = this.tutorService.countForSelectedFilters(sel);
    } catch (e) {
      this.resultCount = 0;
    }
  }

  clearFilters(): void {
    this.selectedFiltersMap.clear();
    this.resultCount = null;
    this.tutorService.clearFilters();
  }

  applyFilters(): void {
    const filters = this.getSelectedFilters();
    console.log('[TutorHomepage] Applying filters:', filters);
    // TODO: Pass structured filters to service
    this.closeFilters();
  }

  getSelectedFilters(): SelectedFilters {
    const filters: Record<string, string[]> = {};
    this.selectedFiltersMap.forEach((values, key) => {
      if (values.size > 0) {
        filters[key] = Array.from(values);
      }
    });
    return { categoryKey: this.activeCategory, filters };
  }

  scrollCategoryTabs(direction: 'left' | 'right'): void {
    const el = this.categoryTabsRef?.nativeElement;
    if (el) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  openFilters(): void {
    this.showFilters = true;
    this.setActiveCategoryDefaults();
  }

  closeFilters(): void {
    this.showFilters = false;
  }

  // ===== Helper Methods =====

  private mapAPICategoriesToUI(apiCategories: TutorCategoriesResponse): CategoryConfig[] {
    return apiCategories
      .filter(cat => cat.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(cat => ({
        key: cat.categoryKey.toLowerCase(),
        label: cat.categoryName,
        icon: cat.iconUrl || this.getDefaultCategoryIcon(cat.categoryKey),
        filterGroups: cat.fields
          .filter(f => f.isFilterable)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(f => ({
            label: f.fieldLabel,
            fieldKey: f.fieldKey,
            items: f.options
              .filter(o => o.isActive)
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map(o => ({
                id: o.id.toString(),
                value: o.optionValue,
                label: o.optionLabel
              }))
          }))
      }));
  }

  private getDefaultCategoryIcon(categoryKey: string): string {
    const iconMap: Record<string, string> = {
      'SCHOOL':   'assets/filter/Categories-Icons (4).png',
      'COLLEGE':  'assets/filter/Categories-Icons (5).png',
      'LANGUAGE': 'assets/filter/Categories-Icons (6).png',
      'HOBBIES':  'assets/filter/Categories-Icons.png',
      'EXAMS':    'assets/filter/Categories-Icons (7).png',
      'SPORTS':   'assets/filter/Categories-Icons (8).png',
      'OTHERS':   'assets/filter/Categories-Icons (2).png',
    };
    return iconMap[categoryKey] || 'assets/filter/Categories-Icons (2).png';
  }

  private setActiveCategoryDefaults(): void {
    const cat = this.categories.find(c => c.key === this.activeCategory);
    if (cat?.filterGroups.length) {
      this.activeSidebarGroup = cat.filterGroups[0].label;
    }
  }

  // ===== Refer Modal =====

  openReferModal(): void {
    this.showReferModal = true;
  }

  closeReferModal(): void {
    this.showReferModal = false;
  }

  async copyLink(): Promise<void> {
    const referralLink = window.location.origin + '/refer-tutor';
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const ta = document.createElement('textarea');
        ta.value = referralLink;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      alert('Link copied to clipboard');
    } catch (err) {
      console.error('Copy failed', err);
      alert('Unable to copy link');
    }
  }

  shareWhatsApp(): void {
    const referralLink = window.location.origin + '/refer-tutor';
    const text = encodeURIComponent(`Hi! I found this tutor referral form: ${referralLink}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  // ===== Navigation =====

  goBack(): void {
    // Prefer a regular history back when the user has navigation history.
    // Fall back to navigating to the home route if there is no previous entry.
    try {
      if (window.history && window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch (e) {
      // ignore and fall through to router navigation
    }

    this.router.navigate(['/home']);
  }

  onViewProfile(tutor: ITutor): void {
    const id = (tutor.name || 'tutor').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    this.router.navigate(['/tutor', id], { state: { tutor } });
  }
}
