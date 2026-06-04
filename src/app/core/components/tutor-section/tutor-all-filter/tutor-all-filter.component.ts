import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { ModalController } from '@ionic/angular';
import { TutorApi } from '../../../api/tutor.api';
import { TutorCategory, TutorCategoriesResponse, FilterGroup, FilterOption, SelectedFilters } from '../../../models/tutor.model';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { TutorService } from '../../../services/tutor.service';

@Component({
  selector: 'tutor-all-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent],
  templateUrl: './tutor-all-filter.component.html',
  styleUrls: ['./tutor-all-filter.component.scss']
})
export class TutorAllFilterComponent implements OnInit, AfterViewInit, OnDestroy {
  /** List of available filter labels */
  @Input() filters: string[] = [];

  /** Previously applied filters to pre-populate selections */
  @Input() initialFilters: SelectedFilters | null = null;

  /** Loading state */
  isLoading = false;

  /** Error state */
  errorMessage: string | null = null;

  /** API data */
  private apiCategories: TutorCategory[] = [];

  /** Topbar-slider categories for slider */
  categories: Array<{ key: string; label: string; icon: string }> = [];

  /** Topbar-slider active category */
  selectedCategory: string | null = null;

  /** Sidebar groups generated from selected topbar category */
  sidebarGroups: FilterGroup[] = [];
  selectedSidebar: string | null = null;
  selectedSubFilters: FilterOption[] = [];

  /** Currently checked subfilters mapped by fieldKey */
  selectedFiltersMap: Map<string, Set<string>> = new Map();

  /** Computed number of matching tutors for current selection. null = no interaction yet */
  resultCount: number | null = null;

  /** Mapping of category icons (fallback if API doesn't provide iconUrl) */
  private categoryIconMap: Record<string, string> = {
    SCHOOL: '/assets/Icons-Neutral/Tutors-School.png',
    COLLEGE: '/assets/Icons-Neutral/Tutors-College.png',
    HOBBIES: '/assets/Icons-Neutral/Tutors-Hobbies.png',
    SPORTS: '/assets/Icons-Neutral/Tutors-Sports.png',
    EXAMS: '/assets/Icons-Neutral/Tutors-Exams.png',
    LANGUAGES: '/assets/Icons-Neutral/Tutors-Language.png',
    OTHERS: '/assets/Icons-Neutral/Tutors-Others.png'
  };

  ngOnInit(): void {
    this.loadTutorCategories();
  }

  /**
   * Load tutor categories from API
   */
  private loadTutorCategories(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.tutorApi.getTutorCategories()
      .pipe(finalize(() => {
        this.isLoading = false;
        // Initialize swiper after data loads and view updates
        setTimeout(() => this.initSwiper(), 100);
      }))
      .subscribe({
        next: (categories) => {
          this.apiCategories = categories;
          this.mapCategoriesToUI(categories);

          // Restore previously applied category, or default to first
          const restoreCategory = this.initialFilters?.categoryKey ?? (this.categories.length > 0 ? this.categories[0].key : null);
          if (restoreCategory) {
            this.selectedCategory = restoreCategory;
            this.setSidebarForCategory(restoreCategory);
          }

          // Pre-populate selected filters from initialFilters
          if (this.initialFilters?.filters) {
            Object.entries(this.initialFilters.filters).forEach(([fieldKey, values]) => {
              if (values.length > 0) {
                this.selectedFiltersMap.set(fieldKey, new Set(values));
              }
            });
          }
        },
        error: (error) => {
          console.error('[TutorAllFilter] Error loading categories:', error);
          this.errorMessage = 'Failed to load filter categories. Please try again.';
          // Use fallback data if API fails
          this.useFallbackData();
        }
      });
  }

  /**
   * Map API categories to UI structure
   */
  private mapCategoriesToUI(categories: TutorCategory[]): void {
    this.categories = categories.map(cat => ({
      key: cat.categoryKey,
      label: cat.categoryName,
      icon: cat.iconUrl || this.categoryIconMap[cat.categoryKey] || '/assets/Icons-Neutral/Tutors-Others.png'
    }));
  }

  /**
   * Fallback to hardcoded data if API fails
   */
  private useFallbackData(): void {
    this.categories = [
      { key: 'SCHOOL', label: 'School', icon: this.categoryIconMap['SCHOOL'] },
      { key: 'COLLEGE', label: 'College', icon: this.categoryIconMap['COLLEGE'] },
      { key: 'HOBBIES', label: 'Hobbies', icon: this.categoryIconMap['HOBBIES'] },
      { key: 'SPORTS', label: 'Sports', icon: this.categoryIconMap['SPORTS'] },
      { key: 'EXAMS', label: 'Exams', icon: this.categoryIconMap['EXAMS'] },
      { key: 'LANGUAGES', label: 'Languages', icon: this.categoryIconMap['LANGUAGES'] },
      { key: 'OTHERS', label: 'Others', icon: this.categoryIconMap['OTHERS'] }
    ];

    if (this.categories.length > 0) {
      this.selectedCategory = this.categories[0].key;
      this.setSidebarForCategory(this.selectedCategory);
    }

    // Initialize swiper for fallback data
    setTimeout(() => this.initSwiper(), 100);
  }

  /**
   * Set sidebar filters based on selected category
   */
  private setSidebarForCategory(categoryKey: string): void {
    const category = this.apiCategories.find(cat => cat.categoryKey === categoryKey);

    if (category && category.fields.length > 0) {
      // Map API fields to sidebar groups
      this.sidebarGroups = category.fields
        .filter(field => field.isFilterable)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(field => ({
          label: field.fieldLabel,
          fieldKey: field.fieldKey,
          isRequired: field.isRequired,
          isFilterable: field.isFilterable,
          items: field.options
            .filter(opt => opt.isActive)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map(opt => ({
              id: opt.id,
              value: opt.optionValue,
              label: opt.optionLabel,
              displayOrder: opt.displayOrder
            }))
        }));

      // Select first sidebar group by default
      if (this.sidebarGroups.length > 0) {
        this.selectedSidebar = this.sidebarGroups[0].label;
        this.selectedSubFilters = this.sidebarGroups[0].items;
      } else {
        this.selectedSidebar = null;
        this.selectedSubFilters = [];
      }
    } else {
      // No fields found, clear sidebar
      this.sidebarGroups = [];
      this.selectedSidebar = null;
      this.selectedSubFilters = [];
    }

  }

  /**
   * Select a sidebar filter group
   */
  selectSidebar(filterLabel: string): void {
    this.selectedSidebar = filterLabel;
    const group = this.sidebarGroups.find(g => g.label === filterLabel);
    this.selectedSubFilters = group ? group.items : [];
  }

  /**
   * Select a category from topbar
   */
  selectCategory(categoryKey: string): void {
    this.selectedCategory = categoryKey;
    this.setSidebarForCategory(categoryKey);
  }

  /**
   * Toggle a sub-filter option
   */
  onToggleSubFilter(item: FilterOption, checked: boolean): void {
    const group = this.sidebarGroups.find(g => g.label === this.selectedSidebar);
    if (!group) return;

    const fieldKey = group.fieldKey;

    if (!this.selectedFiltersMap.has(fieldKey)) {
      this.selectedFiltersMap.set(fieldKey, new Set());
    }

    const fieldSet = this.selectedFiltersMap.get(fieldKey)!;

    if (checked) {
      fieldSet.add(item.value);
    } else {
      fieldSet.delete(item.value);
      // If no values remain for this field, remove the key from the map
      if (fieldSet.size === 0) {
        this.selectedFiltersMap.delete(fieldKey);
      }
    }

    // User interaction begins: compute and show count
    this.updateResultCount();
  }

  /**
   * Check if a sub-filter is selected
   */
  isSubFilterSelected(item: FilterOption): boolean {
    const group = this.sidebarGroups.find(g => g.label === this.selectedSidebar);
    if (!group) return false;

    const fieldSet = this.selectedFiltersMap.get(group.fieldKey);
    return fieldSet ? fieldSet.has(item.value) : false;
  }

  /**
   * Get number of selected options for a field
   */
  getSelectedCount(fieldKey: string): number {
    const set = this.selectedFiltersMap.get(fieldKey);
    return set ? set.size : 0;
  }

  /**
   * Check if any filters are currently selected
   */
  hasSelectedFilters(): boolean {
    return this.selectedFiltersMap.size > 0;
  }

  /**
   * Clear all selected filters
   */
  clearAll(): void {
    this.selectedFiltersMap.clear();
    this.resultCount = null;
    // Dismiss modal with clearAll flag so parent can refetch all tutors from API
    this.modalCtrl.dismiss({ clearAll: true });
  }

  /**
   * Get selected filters for API submission
   */
  getSelectedFilters(): SelectedFilters | null {
    if (!this.selectedCategory) return null;

    const filters: { [fieldKey: string]: string[] } = {};

    this.selectedFiltersMap.forEach((values, fieldKey) => {
      if (values.size > 0) {
        filters[fieldKey] = Array.from(values);
      }
    });

    return {
      categoryKey: this.selectedCategory,
      filters
    };
  }

  /**
   * Show result with selected filters
   */
  showResult(): void {
    const selectedFilters = this.getSelectedFilters();
    console.log('[TutorAllFilter] Selected filters:', selectedFilters);

    // update count right before dismiss (optional)
    this.updateResultCount();

    // Close modal and pass selected filters
    this.modalCtrl.dismiss({
      filters: selectedFilters
    });
  }

  @ViewChild('categoriesSwiper', { read: ElementRef, static: false }) categoriesSwiperRef!: ElementRef;
  private swiperInstance: any | null = null;

  ngAfterViewInit() {
    // Swiper will be initialized after data loads
  }

  /**
   * Initialize Swiper slider
   */
  private initSwiper(): void {
    const win: any = typeof window !== 'undefined' ? window : null;

    // Destroy existing instance if any
    if (this.swiperInstance && typeof this.swiperInstance.destroy === 'function') {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }

    // Initialize new instance
    if (win && typeof win.Swiper === 'function' && this.categoriesSwiperRef?.nativeElement) {
      this.swiperInstance = new win.Swiper(this.categoriesSwiperRef.nativeElement, {
        slidesPerView: 'auto',
        spaceBetween: 12,
        freeMode: true,
        watchOverflow: true
      });
    }
  }

  ngOnDestroy() {
    if (this.swiperInstance && typeof this.swiperInstance.destroy === 'function') {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }
  }

  constructor(
    private modalCtrl: ModalController,
    private tutorApi: TutorApi,
    private tutorService: TutorService
  ) { }

  /** Update the computed result count based on current selections */
  private updateResultCount(): void {
    try {
      const sel = this.getSelectedFilters();
      // If there are no selected filters, treat as zero results (user expects no count)
      if (!sel || !sel.filters || Object.keys(sel.filters).length === 0) {
        this.resultCount = 0;
        return;
      }

      this.resultCount = this.tutorService.countForSelectedFilters(sel);
    } catch (e) {
      this.resultCount = 0;
    }
  }

  /**
   * Close modal without applying filters
   */
  close(): void {
    this.modalCtrl.dismiss();
  }
}
