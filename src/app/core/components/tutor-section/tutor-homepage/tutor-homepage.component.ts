import { Component, Output, EventEmitter, HostListener, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject } from 'rxjs';
import { skip, takeUntil } from 'rxjs/operators';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';
import { SupermeSpeechBubbleComponent } from '../../superme-speech-bubble/superme-speech-bubble.component';
import { TutorListComponent } from '../tutor-list/tutor-list.component';
import { TutorAllFilterComponent } from '../tutor-all-filter/tutor-all-filter.component';
import { FooterComponent } from '../../footer/footer.component';
import { SupermePopupComponent } from '../../superme-popup/superme-popup.component';
import { AuthService } from '../../../services/auth.service';
import { TutorService } from '../../../services/tutor.service';
import { TutorApi } from '../../../api/tutor.api';
import { SelectedFilters, TutorListItem, TutorSearchRequest, TutorSearchScope, TutorSearchSort, TutorSortOption } from '../../../models/tutor.model';
import { EduHubCitySelectorComponent } from '../../education-section/eduhub-city-selector/eduhub-city-selector.component';
import { EduHubCityService } from '../../../services/eduhub-city.service';

@Component({
  selector: 'tutor-homepage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SupermeButtonComponent,
    TutorListComponent,
    SupermePetComponent,
    SupermeSpeechBubbleComponent,
    FooterComponent,
    SupermePopupComponent,
    EduHubCitySelectorComponent,
    TutorAllFilterComponent
  ],
  templateUrl: './tutor-homepage.component.html',
  styleUrls: ['./tutor-homepage.component.scss']
})
export class TutorHomepageComponent implements OnInit, OnDestroy, ViewWillEnter {
  tutors: TutorListItem[] = [];
  isLoading = false;
  loadError = false;
  searchQuery = '';
  private directoryEntityType = '';
  lastAppliedFilters: any = null;
  showAllFilters = false;
  totalTutorCount = 0;
  private readonly searchPageSize = 100;
  selectedScope: TutorSearchScope = 'ALL_INDIA';
  showingOnlineFallback = false;

  /** Emitted when a tutor profile is requested */
  @Output() viewProfile = new EventEmitter<TutorListItem>();

  isReferModalOpen = false;
  referLink = 'https://supermeapp.com/become-a-tutor';

  // Sort dropdown state
  isSortOpen = false;
  currentSort: TutorSortOption = 'recent';
  readonly sortOptions: { key: TutorSortOption; label: string }[] = [
    { key: 'alphabets', label: 'Alphabetical' },
    { key: 'mostLiked', label: 'Most Liked' },
    { key: 'experience', label: 'Experience' },
    { key: 'recent', label: 'Recently added' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private tutorService: TutorService,
    private tutorApi: TutorApi,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private authService: AuthService,
    private route: ActivatedRoute,
    private cityService: EduHubCityService
  ) { }

  ngOnInit(): void {
    this.directoryEntityType = String(this.route.snapshot.queryParamMap.get('entityType') || '').trim().toUpperCase();
    this.loadTutors();
    this.cityService.location$.pipe(skip(1), takeUntil(this.destroy$)).subscribe(() => {
      // Changing the saved location only affects an explicitly selected city search.
      if (this.selectedScope === 'CITY' || this.isCounselorDirectory) this.refreshDirectory();
    });
  }

  ionViewWillEnter(): void {
    this.loadTutors();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('tutor-filter-open');
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTutors(): void {
    // A filtered EduHub directory must start with unfiltered API data instead
    // of inheriting search/filter state from the general Tutors page.
    if (this.directoryEntityType) this.tutorService.clearFilters();

    this.refreshDirectory();

    this.tutorService.tutors$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tutors => {
        this.tutors = tutors;
        if (!this.lastAppliedFilters) this.totalTutorCount = tutors.length;
      });

    this.currentSort = this.tutorService.getCurrentSort();
  }

  private refreshDirectory(): void {
    this.loadError = false;
    if (this.lastAppliedFilters) {
      this.searchWithBackend(this.lastAppliedFilters as SelectedFilters);
      return;
    }
    this.isLoading = true;
    if (!this.directoryEntityType && this.selectedScope === 'ALL_INDIA') {
      this.tutorService.fetchTutorsByEntityType('INDIVIDUAL', undefined, false, true)
        .pipe(takeUntil(this.destroy$)).subscribe({
          next: () => { this.isLoading = false; },
          error: () => {
            this.tutorService.setCacheAndApply([]);
            this.loadError = true;
            this.isLoading = false;
          }
        });
      return;
    }
    if (!this.directoryEntityType && (this.selectedScope === 'WORLDWIDE' || this.cityService.isAutomaticLocation)) {
      this.tutorService.getHomeTutorListings(this.selectedScope).pipe(takeUntil(this.destroy$)).subscribe({
        next: result => {
          this.showingOnlineFallback = result.usedOnlineFallback && result.tutors.length > 0;
          if (this.showingOnlineFallback) this.selectedScope = 'ALL_INDIA';
          this.tutorService.setCacheAndApply(result.tutors);
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; }
      });
      return;
    }
    const request = this.directoryEntityType
      ? this.tutorService.fetchTutorsByEntityType(this.directoryEntityType)
      : this.tutorService.fetchTutors(true);
    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  onScopeChange(): void {
    this.showingOnlineFallback = false;
    if (this.lastAppliedFilters) this.searchWithBackend(this.lastAppliedFilters as SelectedFilters);
    else this.refreshDirectory();
  }

  get isCounselorDirectory(): boolean {
    return this.directoryEntityType === 'COUNSELOR';
  }

  get directoryHeading(): string {
    return this.isCounselorDirectory ? 'Your Trusted Counselors' : 'Your Guides to Greatness!';
  }

  get directorySearchPlaceholder(): string {
    return this.isCounselorDirectory ? 'Looking for support?' : 'Looking for a math hero?';
  }

  get directoryIntro(): string {
    return this.isCounselorDirectory
      ? 'Find a trusted counselor who can support your child.'
      : 'Sniffed out the best tutors just for you, ready to fetch your favorite?';
  }

  get visibleTutors(): TutorListItem[] {
    const city = this.selectedScope === 'CITY' ? this.cityService.city.toLocaleLowerCase() : '';
    return this.tutors.filter(tutor => {
      const raw = this.tutorService.getTutorFromCache(tutor.id) as any;
      const location = [raw?.city, raw?.location, raw?.state, (tutor as any)?.location]
        .filter(Boolean).join(' ').toLocaleLowerCase();
      return !city || location.includes(city);
    });
  }

  onViewProfile(tutor: TutorListItem): void {
    if (!this.authService.isLoggedIn()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const cachedTutor = this.tutorService.getTutorFromCache(tutor.id);
    void this.router.navigate(['/authed/tutors', tutor.id], {
      queryParams: this.lastAppliedFilters?.categoryKey
        ? { category: this.lastAppliedFilters.categoryKey }
        : undefined,
      state: cachedTutor ? { tutor: cachedTutor } : undefined
    });
  }

  openAllFilters(): void {
    if (this.showAllFilters) return;
    this.showAllFilters = true;
    document.body.classList.add('tutor-filter-open');
  }

  onAllFiltersDismiss(data?: any): void {
    this.showAllFilters = false;
    document.body.classList.remove('tutor-filter-open');

    // Clear All pressed — refetch all tutors from API and reset filter state
    if (data?.clearAll) {
      this.lastAppliedFilters = null;
      this.totalTutorCount = 0;
      this.tutorService.clearFilters();
      this.clearSearch();
      this.refreshDirectory();
      return;
    }

    // Filters applied — search tutors with selected filters
    if (data?.filters) {
      const sel = data.filters as SelectedFilters;
      this.lastAppliedFilters = sel;
      this.searchWithBackend(sel);
    }
  }

  private searchWithBackend(sel: SelectedFilters): void {
    this.loadError = false;
    const request: TutorSearchRequest = {
      categoryKey: sel.categoryKey,
      filters: sel.filters,
      ...(this.selectedScope === 'CITY' ? this.cityService.filter : {}),
      scope: this.selectedScope,
      autoFallbackToOnline: false,
      page: 0,
      size: this.searchPageSize,
      sort: this.toBackendSort(this.currentSort)
    };

    this.isLoading = true;
    this.tutorApi.searchTutors(request).pipe(takeUntil(this.destroy$)).subscribe({
      next: (resp: any) => {
        const result = this.extractSearchResult(resp);
        this.totalTutorCount = result.totalElements;
        // An empty successful response is a valid filtered result and must
        // clear the cards instead of restoring the unfiltered tutor cache.
        this.tutorService.setCacheAndApply(result.tutors);
        this.isLoading = false;
      },
      error: () => {
        this.tutorService.applySelectedFilters(sel);
        this.totalTutorCount = this.tutorService.countForSelectedFilters(sel);
        this.isLoading = false;
      }
    });
  }

  private extractSearchResult(resp: any): { tutors: any[]; totalElements: number } {
    const candidates = [
      resp,
      resp?.tutors,
      resp?.content,
      resp?.data,
      resp?.data?.tutors,
      resp?.data?.content,
      resp?.result,
      resp?.result?.tutors,
      resp?.result?.content
    ];
    const tutors = candidates.find(Array.isArray) ?? [];
    const containers = [resp, resp?.data, resp?.result].filter(Boolean);
    const total = containers
      .map(container => Number(container?.totalElements ?? container?.total ?? container?.totalCount))
      .find(value => Number.isFinite(value));
    return { tutors, totalElements: total ?? tutors.length };
  }

  private toBackendSort(sort: TutorSortOption): TutorSearchSort {
    const sortMap: Record<TutorSortOption, TutorSearchSort> = {
      recent: 'RECENT',
      alphabets: 'ALPHABETICAL',
      mostLiked: 'MOST_LIKED',
      experience: 'EXPERIENCE'
    };
    return sortMap[sort];
  }

  /**
   * Handle search input
   */
  onSearch(): void {
    this.tutorService.searchTutors(this.searchQuery);
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.tutorService.searchTutors('');
  }

  openReferModal(): void {
    this.isReferModalOpen = true;
  }

  closeReferModal(): void {
    this.isReferModalOpen = false;
  }

  async copyLink(): Promise<void> {
    try {
      if (navigator && 'clipboard' in navigator) {
        await navigator.clipboard.writeText(this.referLink);
        alert('Link copied to clipboard');
      } else {
        const el = document.createElement('textarea');
        el.value = this.referLink;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        alert('Link copied to clipboard');
      }
    } catch (err) {
      console.error('Copy failed', err);
      alert('Unable to copy link');
    }
  }

  shareWhatsapp(): void {
    const text = encodeURIComponent('Join our platform as a tutor: ' + this.referLink);
    const whatsappUrl = `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, '_blank');
  }

  toggleSortMenu(): void {
    this.isSortOpen = !this.isSortOpen;
  }

  selectSort(option: TutorSortOption): void {
    this.currentSort = option;
    this.isSortOpen = false;
    if (this.lastAppliedFilters) {
      this.searchWithBackend(this.lastAppliedFilters as SelectedFilters);
      return;
    }
    this.tutors = this.sortTutors([...this.tutors], option);
    this.tutorService.setSort(option);
    this.cdr.detectChanges();
  }

  private sortTutors(tutors: TutorListItem[], sort: TutorSortOption): TutorListItem[] {
    switch (sort) {
      case 'alphabets':
        return tutors.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'mostLiked':
        return tutors.sort((a, b) => (b.champsLiked || 0) - (a.champsLiked || 0));
      case 'experience':
        return tutors.sort((a, b) => {
          const parse = (s: string) => parseInt((s || '').replace(/\D/g, ''), 10) || 0;
          return parse(b.experience) - parse(a.experience);
        });
      case 'recent':
      default:
        return tutors.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }
  }

  get currentSortLabel(): string {
    const opt = this.sortOptions.find(o => o.key === this.currentSort);
    return opt ? opt.label : 'Recently added';
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isSortOpen) this.isSortOpen = false;
  }
}
