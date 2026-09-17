import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Share } from '@capacitor/share';
import { IonicModule } from '@ionic/angular';
import { Observable, Subscription, catchError, map, of, switchMap, take } from 'rxjs';

import { AdBannerComponent, AdScreen } from '../../ad-banner/ad-banner.component';
import { FooterComponent } from '../../footer/footer.component';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';
import { Tutor, SelectedFilters, formatContactModes, formatExperience } from '../../../models/tutor.model';
import { TutorAllFilterComponent } from '../../tutor-section/tutor-all-filter/tutor-all-filter.component';
import { AuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';
import { PetAgeService } from '../../../services/pet-age.service';
import { TutorLikeService } from '../../../services/tutor-like.service';
import { TutorService } from '../../../services/tutor.service';
import { EduHubCityService } from '../../../services/eduhub-city.service';
import { EduHubCitySelectorComponent } from '../eduhub-city-selector/eduhub-city-selector.component';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';

type FilterTab = 'specialization' | 'experience';

@Component({
  selector: 'app-counselor-directory',
  standalone: true,
  imports: [CommonModule, IonicModule, AdBannerComponent, FooterComponent, SupermePetComponent, EduHubCitySelectorComponent, TutorAllFilterComponent, ProfileImageComponent],
  templateUrl: './counselor-directory.component.html',
  styleUrls: ['./counselor-directory.component.scss']
})
export class CounselorDirectoryComponent implements OnInit, OnDestroy {
  readonly loadingCards = [0, 1, 2];
  @ViewChild('directorySearchInput') private directorySearchInput?: ElementRef<HTMLInputElement>;

  counselors: Tutor[] = [];
  isLoading = true;
  errorMessage = '';
  showVerifiedMenu = false;
  searchOpen = false;
  searchQuery = '';
  // Active listings are the default. Verification is a trust badge, not a
  // visibility requirement, so unverified active counselors remain visible.
  verifiedOnly = false;
  showFilters = false;
  filterTab: FilterTab = 'specialization';
  selectedSpecializations = new Set<string>();
  selectedExperience = new Set<string>();
  entityType = 'COUNSELOR';
  directoryTitle = 'Counselors';
  singularTitle = 'Counselor';
  educationFilters: SelectedFilters | null = null;
  showEducationFilters = false;
  private selectedCity = '';

  private readonly subscriptions = new Subscription();
  private readonly likeSubscriptions = new Map<number, Subscription>();
  private directoryRequestVersion = 0;

  constructor(
    private readonly location: Location,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly tutorService: TutorService,
    private readonly likeService: TutorLikeService,
    private readonly authService: AuthService,
    private readonly core: CoreService,
    private readonly petAgeService: PetAgeService,
    private readonly cityService: EduHubCityService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  /** Panda uses the same Figma artwork shown on Home/Coins/Learning instead of this page's decorative mascot. */
  get isPandaPet(): boolean {
    return this.petAgeService.getCurrentPetType() === 'panda';
  }

  ngOnInit(): void {
    const routeData = this.route.snapshot.data;
    this.entityType = String(routeData['entityType'] || 'COUNSELOR').trim().toUpperCase();
    this.directoryTitle = String(routeData['title'] || 'Counselors').trim() || 'Counselors';
    this.singularTitle = String(routeData['singularTitle'] || this.directoryTitle.replace(/s$/i, '')).trim() || 'Listing';
    const navigationState = (history.state || {}) as { city?: string; directoryItems?: Tutor[] };
    const navigationCity = String(
      this.route.snapshot.queryParamMap.get('city') || navigationState.city || ''
    ).trim();
    if (navigationCity) this.cityService.selectCity(navigationCity);
    // Ionic keeps this route alive on mobile. Subscribe to the shared city so
    // returning to the page or changing location immediately recomputes cards.
    this.selectedCity = this.normalizeLocation(navigationCity || this.cityService.city);
    this.subscriptions.add(this.cityService.city$.subscribe(city => {
      const nextCity = this.normalizeLocation(city);
      const cityChanged = nextCity !== this.selectedCity;
      this.selectedCity = nextCity;
      if (cityChanged) {
        // A new city is a new directory query. Remove records handed off for
        // the previous city and reload the complete entity directory so both
        // the selector and cards always describe the same location.
        this.educationFilters = null;
        const cachedDirectory = this.filterDirectoryType(
          this.tutorService.getDirectoryCache(this.entityType)
        );
        this.counselors = cachedDirectory.filter(item => this.isActiveListing(item));
        this.loadCounselors();

        // Keep the route in sync with the selector. Without this, Ionic can
        // restore the old Home city from the URL when this cached page is
        // revisited, making the selector appear unable to change location.
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { city },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
      // City selection can be emitted by the nested selector outside the
      // cached Ionic page's normal render pass on native builds.
      Promise.resolve().then(() => this.cdr.detectChanges());
    }));

    // Use the exact records the user could already see on Home. Router state
    // survives the Home -> View All transition and avoids losing valid cards
    // when a second mobile request is delayed or returns an anomalous empty
    // response.
    const handedOffItems = this.filterDirectoryType(navigationState.directoryItems);
    if (handedOffItems.length) {
      this.counselors = handedOffItems.filter(item => this.isActiveListing(item));
      this.counselors.forEach(item => this.watchLikes(item));
      this.isLoading = false;
    }

    const directoryCache = this.filterDirectoryType(
      this.tutorService.getDirectoryCache(this.entityType)
    );
    if (!this.counselors.length && directoryCache.length) {
      this.counselors = directoryCache.filter(item => this.isActiveListing(item));
      this.counselors.forEach(item => this.watchLikes(item));
      this.isLoading = false;
    }

    // "View all" is opened from Home, where the same service has already
    // loaded valid tutor records. Paint those records immediately and keep
    // them as a safe fallback while the directory refresh runs.
    this.subscriptions.add(this.tutorService.allTutors$.pipe(take(1)).subscribe(items => {
      const cached = this.filterDirectoryType(items);
      if (cached.length && !this.counselors.length) {
        this.counselors = cached.filter(item => this.isActiveListing(item));
        this.counselors.forEach(item => this.watchLikes(item));
        this.isLoading = false;
      }
    }));
    this.loadCounselors();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.likeSubscriptions.forEach(subscription => subscription.unsubscribe());
    this.likeSubscriptions.clear();
    document.body.style.overflow = '';
    document.body.classList.remove('tutor-filter-open');
  }

  get visibleCounselors(): Tutor[] {
    const city = this.selectedCity;
    return this.counselors.filter(counselor => {
      const specializations = this.getSpecializations(counselor);
      const experience = this.getExperienceFilterValue(counselor);
      const searchableText = [
        this.getName(counselor),
        this.getSpecializationLabel(counselor),
        counselor.qualification,
        counselor.location,
        counselor.city,
        counselor.state
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return (!this.verifiedOnly || this.isVerified(counselor))
        && (!city || this.matchesSelectedCity(city, this.normalizeLocation([
          counselor.city,
          counselor.location,
          counselor.state,
          (counselor as any).addressLine,
          (counselor as any).exactLocation
        ].filter(Boolean).join(' '))))
        && (!this.selectedSpecializations.size || specializations.some(value => this.selectedSpecializations.has(value)))
        && (!this.selectedExperience.size || this.selectedExperience.has(experience))
        && (!this.searchQuery.trim() || searchableText.includes(this.searchQuery.trim().toLocaleLowerCase()));
    });
  }

  get specializationOptions(): string[] {
    const values = this.counselors.reduce<string[]>(
      (all, counselor) => all.concat(this.getSpecializations(counselor)),
      []
    );
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }

  get experienceOptions(): string[] {
    return [...new Set(this.counselors.map(counselor => this.getExperienceFilterValue(counselor)))];
  }

  get activeFilterOptions(): string[] {
    return this.filterTab === 'specialization' ? this.specializationOptions : this.experienceOptions;
  }

  get activeSelectedOptions(): Set<string> {
    return this.filterTab === 'specialization' ? this.selectedSpecializations : this.selectedExperience;
  }

  get resultsLabel(): string {
    const count = this.visibleCounselors.length;
    return `Show ${count} ${count === 1 ? 'result' : 'results'}`;
  }

  get eduAdScreen(): AdScreen {
    return this.authService.isParentUser() ? 'EDUHUB_PARENTS' : 'EDUHUB';
  }

  /** Public directory previews intentionally reveal only identity information. */
  get isGuestView(): boolean {
    return !this.authService.isLoggedIn();
  }

  @HostListener('document:click')
  closeVerifiedMenu(): void {
    this.showVerifiedMenu = false;
  }

  goBack(): void {
    this.location.back();
  }

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen) {
      this.searchQuery = '';
      return;
    }

    setTimeout(() => this.directorySearchInput?.nativeElement.focus());
  }

  updateSearch(value: string): void {
    this.searchQuery = value;
  }

  loadCounselors(): void {
    const requestVersion = ++this.directoryRequestVersion;
    // Keep the Home-page results visible while refreshing this directory.
    // A background request should not replace valid shared data with a loader.
    this.isLoading = !this.counselors.length;
    this.errorMessage = '';
    const directoryRequest = this.educationFilters && this.entityType !== 'COUNSELOR'
      ? this.tutorService.searchDirectory(this.entityType, this.educationFilters)
      : this.getDirectoryWithFallback();
    this.subscriptions.add(
      directoryRequest.subscribe({
        next: counselors => {
          if (requestVersion !== this.directoryRequestVersion) return;
          const refreshed = (Array.isArray(counselors) ? counselors : [])
            .filter(counselor => this.isActiveListing(counselor));
          // A successful filtered search may legitimately contain no matches.
          // In that case the old unfiltered cards must not remain on screen.
          if (this.educationFilters || refreshed.length || !this.counselors.length) {
            this.counselors = refreshed;
          }
          this.counselors.forEach(counselor => this.watchLikes(counselor));
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          if (requestVersion !== this.directoryRequestVersion) return;
          this.isLoading = false;
          this.errorMessage = this.counselors.length
            ? ''
            : `We couldn’t load ${this.directoryTitle.toLowerCase()} right now. Check your connection and try again.`;
          this.cdr.detectChanges();
        }
      })
    );
  }

  /**
   * Home already loads the general tutor directory successfully. Some mobile
   * sessions receive an empty/error response from the entityType variant, so
   * reuse that proven endpoint and filter locally instead of showing 0 cards.
   */
  private getDirectoryWithFallback(): Observable<Tutor[]> {
    const expectedType = this.entityType;
    const normalizeRequestedType = (items: Tutor[]) => (Array.isArray(items) ? items : [])
      // The endpoint is already filtered by entityType. Some Academy payloads
      // omit that property or return a legacy alias; normalizing it prevents
      // valid Academy records from being discarded only on the inner page.
      .map(item => ({ ...item, entityType: expectedType } as Tutor));
    const filterExpectedType = (items: Tutor[]) => (Array.isArray(items) ? items : [])
      .filter(item => String(item?.entityType || '').trim().toUpperCase() === expectedType);

    // Unlike paginated workshops, the tutors endpoint returns the complete
    // INDIVIDUAL directory. Fetch it without a city parameter and apply the
    // same local city matcher as Home so active unverified tutors remain.
    // Fetch the complete Academy directory just like Home. Some backend city
    // filters use legacy spellings or have incomplete city indexing; applying
    // the shared local matcher avoids valid cities returning an empty page.
    return this.tutorService.getTutorsByEntityType(expectedType).pipe(
      switchMap(items => {
        const requestedDirectory = normalizeRequestedType(items);
        return requestedDirectory.length
          ? of(requestedDirectory)
          : this.tutorService.fetchTutors(true).pipe(map(filterExpectedType));
      }),
      catchError(() => this.tutorService.fetchTutors(true).pipe(map(filterExpectedType)))
    );
  }

  private filterDirectoryType(items: Tutor[] | null | undefined): Tutor[] {
    return (Array.isArray(items) ? items : []).filter(item =>
      String(item?.entityType || '').trim().toUpperCase() === this.entityType
    );
  }

  private isActiveListing(tutor: Tutor): boolean {
    const explicitFlags = [(tutor as any)?.isActive, (tutor as any)?.active]
      .filter(value => typeof value === 'boolean');
    if (explicitFlags.includes(false)) return false;
    if (explicitFlags.includes(true)) return true;

    const status = String((tutor as any)?.accountStatus ?? (tutor as any)?.status ?? '')
      .trim().toLocaleLowerCase();
    return !status || ['active', 'approved', 'published', 'verified', 'enabled'].includes(status);
  }

  private normalizeLocation(value: unknown): string {
    return String(value ?? '')
      .normalize('NFKC')
      .trim()
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ');
  }

  private matchesSelectedCity(selectedCity: string, listingLocation: string): boolean {
    const aliases: Record<string, string[]> = {
      bengaluru: ['bengaluru', 'bangalore'],
      bangalore: ['bengaluru', 'bangalore'],
      mumbai: ['mumbai', 'bombay'],
      bombay: ['mumbai', 'bombay'],
      chennai: ['chennai', 'madras'],
      madras: ['chennai', 'madras'],
      kolkata: ['kolkata', 'calcutta'],
      calcutta: ['kolkata', 'calcutta']
    };
    const candidates = aliases[selectedCity] ?? [selectedCity];
    return candidates.some(candidate => listingLocation.includes(candidate));
  }

  openEducationFilters(): void {
    if (this.showEducationFilters) return;
    this.showEducationFilters = true;
    document.body.classList.add('tutor-filter-open');
  }

  closeEducationFilters(data?: any): void {
    this.showEducationFilters = false;
    document.body.classList.remove('tutor-filter-open');
    if (data?.clearAll || data?.filters) {
      this.educationFilters = data.clearAll ? null : data.filters;
      this.loadCounselors();
    }
  }

  toggleVerifiedMenu(event: Event): void {
    event.stopPropagation();
    this.showVerifiedMenu = !this.showVerifiedMenu;
  }

  setVerifiedFilter(value: boolean, event: Event): void {
    event.stopPropagation();
    this.verifiedOnly = value;
    this.showVerifiedMenu = false;
    // Ionic may retain this page between navigations; update the cached view
    // immediately when the user switches between Verified and All.
    this.cdr.detectChanges();
  }

  openFilters(tab: FilterTab): void {
    this.filterTab = tab;
    this.showFilters = true;
    document.body.style.overflow = 'hidden';
  }

  closeFilters(): void {
    this.showFilters = false;
    document.body.style.overflow = '';
  }

  setFilterTab(tab: FilterTab): void {
    this.filterTab = tab;
  }

  toggleFilterValue(value: string): void {
    const selected = this.activeSelectedOptions;
    if (selected.has(value)) selected.delete(value); else selected.add(value);
    this.refreshSelections();
  }

  clearFilters(): void {
    this.selectedSpecializations.clear();
    this.selectedExperience.clear();
    this.refreshSelections();
  }

  applyFilters(): void {
    this.closeFilters();
  }

  isVerified(counselor: Tutor): boolean {
    // `isVerified` is the current API source of truth. Some older records can
    // contain a stale, conflicting `verified` alias; OR-ing both values makes
    // an explicitly unverified tutor appear verified and breaks this filter.
    const primary = this.toOptionalBoolean((counselor as any).isVerified);
    if (primary !== null) return primary;

    const legacy = this.toOptionalBoolean((counselor as any).verified);
    if (legacy !== null) return legacy;

    return this.toOptionalBoolean((counselor as any).documentsVerified) === true;
  }

  private toOptionalBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    return null;
  }

  isLiked(counselor: Tutor): boolean {
    return !!counselor.likedByUser;
  }

  toggleLike(counselor: Tutor): void {
    const request = this.likeService.toggleLike(counselor);
    if (!request) return;
    void request.catch(() => this.core.triggerToasrt('Unable to update like. Please try again.', 'error'));
  }

  async shareCounselor(counselor: Tutor): Promise<void> {
    const title = this.getName(counselor);
    const text = `View ${title} on SuperMe EduHub.`;
    const url = typeof window !== 'undefined' ? window.location.href : '';

    try {
      await Share.share({ title, text, url, dialogTitle: `Share ${title}` });
    } catch (error) {
      const message = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
      if (message.includes('cancel') || message.includes('dismiss')) return;

      // The native share sheet can be unavailable in some environments even
      // though sharing itself isn't the point of failure — fall back to
      // copying the link before treating this as an actual error.
      try {
        await navigator.clipboard.writeText(url || text);
        this.core.triggerToasrt('Counselor link copied.', 'success');
      } catch {
        console.warn('[CounselorDirectory] Unable to share counselor', error);
        this.core.triggerToasrt('Unable to share this counselor. Please try again.', 'error');
      }
    }
  }

  async referCounselor(): Promise<void> {
    const listingType = this.singularTitle.trim().toLowerCase() || 'listing';
    const article = /^[aeiou]/i.test(listingType) ? 'an' : 'a';
    const tutorReferral = 'Know a great tutor?\n\n👉 Refer them to get listed on SuperMeApp and grow their reach.\n\n🔗 https://bit.ly/Become-a-tutor';
    const referralText = this.entityType === 'TUTOR'
      ? tutorReferral
      : `Know ${article} ${listingType}? Refer them to get listed on SuperMe EduHub.`;
    try {
      await Share.share({
        title: 'Refer for listing',
        text: referralText,
        ...(this.entityType === 'TUTOR' ? {} : { url: 'https://supermeapp.com' })
      });
    } catch (error) {
      const message = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
      if (!message.includes('cancel') && !message.includes('dismiss')) {
        try {
          await navigator.clipboard.writeText(referralText);
          this.core.triggerToasrt('Referral message copied.', 'success');
        } catch {
          this.core.triggerToasrt('Unable to open sharing right now. Please try again.', 'error');
        }
      }
    }
  }

  openProfile(counselor: Tutor): void {
    if (this.isGuestView) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const profileBaseRoute = this.entityType === 'COUNSELOR' ? '/app/counselors' : '/app/tutors';
    void this.router.navigate([profileBaseRoute, counselor.id], {
      state: { tutor: counselor }
    });
  }

  getName(counselor: Tutor): string {
    return counselor.name?.trim() || counselor.entityName?.trim() || this.singularTitle;
  }

  getProfileImage(counselor: Tutor): string | null {
    return counselor.profilePicUrl?.trim() || null;
  }

  getSpecializationLabel(counselor: Tutor): string {
    const values = this.getSpecializations(counselor);
    if (!values.length) return counselor.qualification?.trim() || 'Specialization not specified';
    if (values.length <= 2) return values.join(', ');
    return `${values.slice(0, 2).join(', ')} + ${values.length - 2}`;
  }

  getAvailability(counselor: Tutor): string {
    const modes = counselor.contactModes?.length ? formatContactModes(counselor.contactModes) : '';
    return modes || 'Availability not specified';
  }

  getExperience(counselor: Tutor): string {
    const years = Math.max(0, ...(counselor.categoryMappings || []).map(mapping => mapping.yearsOfExperience || 0));
    return years > 0 ? `${years} years exp` : formatExperience(counselor.experience || 'FRESHER').replace('Exp', 'exp');
  }

  getFee(counselor: Tutor): string {
    const mappingFee = (counselor.categoryMappings || []).find(mapping => mapping.categoryHourlyRate > 0)?.categoryHourlyRate;
    const fee = Number(mappingFee || counselor.hourlyRate || counselor.fees || 0);
    if (!Number.isFinite(fee) || fee <= 0) return 'Pricing on request';
    const labels: Record<string, string> = {
      PER_SESSION: 'Per Session',
      PER_HOUR: 'Per Hour',
      PER_MONTH: 'Per Month'
    };
    return `₹ ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(fee)} / ${labels[String(counselor.feeType)] || 'Session'}`;
  }

  trackCounselor(_: number, counselor: Tutor): number {
    return counselor.id;
  }

  private watchLikes(counselor: Tutor): void {
    if (!counselor?.id || this.likeSubscriptions.has(counselor.id)) return;
    this.likeService.initFromServer(counselor);
    this.likeSubscriptions.set(counselor.id, this.likeService.watch(counselor.id).subscribe(state => {
      counselor.likedByUser = state.liked;
      counselor.champsLiked = state.count;
    }));
  }

  private getSpecializations(counselor: Tutor): string[] {
    const direct = (counselor.subjects || []).map(value => String(value).trim()).filter(Boolean);
    const configured = (counselor.categoryMappings || []).reduce<string[]>(
      (all, mapping) => all.concat(this.getMappedSpecializations(mapping.selectedFieldOptions)),
      []
    );
    return Array.from(new Set(direct.concat(configured)));
  }

  private getMappedSpecializations(value: unknown): string[] {
    if (!value) return [];
    let selected: Record<string, unknown> = {};
    try {
      selected = typeof value === 'string' ? JSON.parse(value) : value as Record<string, unknown>;
    } catch {
      return [];
    }
    if (!selected || typeof selected !== 'object' || Array.isArray(selected)) return [];
    return Object.keys(selected)
      .filter(key => /special|subject|expert/i.test(key))
      .reduce<string[]>((items, key) => {
        const raw = selected[key];
        const values = Array.isArray(raw) ? raw : String(raw ?? '').split(',');
        return items.concat(values.map(item => String(item).replace(/[_-]+/g, ' ').trim()).filter(Boolean));
      }, []);
  }

  private getExperienceFilterValue(counselor: Tutor): string {
    const years = Math.max(0, ...(counselor.categoryMappings || []).map(mapping => mapping.yearsOfExperience || 0));
    if (years <= 0) return 'Fresher';
    if (years <= 3) return '1-3 years';
    if (years <= 5) return '3-5 years';
    if (years <= 10) return '5-10 years';
    return '10+ years';
  }

  private refreshSelections(): void {
    this.selectedSpecializations = new Set(this.selectedSpecializations);
    this.selectedExperience = new Set(this.selectedExperience);
  }
}
