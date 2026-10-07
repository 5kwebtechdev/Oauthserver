import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from "@ionic/angular";
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { TutorService } from '../../../services/tutor.service';
import { Tutor, TutorListItem } from '../../../models/tutor.model';
import { distinctUntilChanged, skip, Subscription } from 'rxjs';
import { TutorLikeService } from '../../../services/tutor-like.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../../environments/environment';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';
import { EduHubEventItem, EduHubEventsService } from '../../../services/eduhub-events.service';
import { EduHubEventCardComponent } from '../../education-section/eduhub-event-card/eduhub-event-card.component';
import { EduHubCityService } from '../../../services/eduhub-city.service';
import { EduHubCitySelectorComponent } from '../../education-section/eduhub-city-selector/eduhub-city-selector.component';
import { EduHubShopCard, EduHubShopCardComponent } from '../../education-section/eduhub-shop-card/eduhub-shop-card.component';
import { Share } from '@capacitor/share';
import { ShareLinkService } from '../../../services/share-link.service';
import { CoreService } from '../../../services/core.service';
import { CounselorCardComponent } from '../../education-section/counselor-card/counselor-card.component';
import { PgHostel, PgHostelsService } from '../../../services/pg-hostels.service';
import { PgHostelCardComponent } from '../../education-section/pg-hostels/pg-hostel-card.component';

type CategoryKey =
  | 'tutors'
  | 'academies'
  | 'workshops'
  | 'events'
  | 'stationery'
  | 'book-stores'
  | 'counselors'
  | 'second-hand-books'
  | 'hostels'
  | 'sports-shops';

interface EduHubCategory {
  key: CategoryKey;
  label: string;
  image: string;
  route: string;
}

interface EduHubDirectoryItem {
  id?: number | string;
  name?: string | null;
  title?: string | null;
  bio?: string | null;
  description?: string | null;
  fee?: number | string | null;
  hourlyRate?: number | string | null;
  imageUrls?: string[] | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  profilePicUrl?: string | null;
  avatar?: string | null;
  headline?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  exactLocation?: string | null;
  phone?: string | null;
  email?: string | null;
  unlocked?: boolean | null;
  isUnlocked?: boolean | null;
  unlockCost?: number | string | null;
  contactUnlockCost?: number | string | null;
  status?: string | null;
  accountStatus?: string | null;
  isActive?: boolean | null;
  verified?: boolean | null;
  likedBySelf?: boolean | null;
}

interface EduHubPreview {
  shop?: EduHubShopCard;
  event?: EduHubEventItem;
  id: string | number;
  name: string;
  description: string;
  image: string;
  fee: number | null;
  location: string;
  counselor?: Tutor;
  hostel?: PgHostel;
  /** Preserve the API record so details pages can render immediately. */
  source?: EduHubDirectoryItem;
}

@Component({
  selector: 'tutor-card',
  templateUrl: './tutor-card.component.html',
  styleUrls: ['./tutor-card.component.scss'],
  imports: [CommonModule, IonicModule, ProfileImageComponent, EduHubCitySelectorComponent, EduHubEventCardComponent, EduHubShopCardComponent, CounselorCardComponent, PgHostelCardComponent],
  standalone: true
})
export class TutorCardComponent implements OnInit, OnDestroy {
  @Input() maxTutors: number = 4; // Max tutors to show in card view

  tutors: TutorListItem[] = [];
  listingCount = 0;
  isLoading = false;
  // EduHub's headline is a product-wide trust signal, not the number loaded
  // for the currently selected city/category preview.
  readonly displayedListingCount = '1800+';

  readonly listingVerifiedAsset = 'assets/figma/eduhub-home/listing-verified.webp';
  readonly profileVerifiedAsset = 'assets/figma/eduhub-home/profile-verified.webp';
  readonly favoriteAsset = 'assets/figma/eduhub-home/favorite.svg';
  readonly onlineModeAsset = 'assets/figma/eduhub-home/online-mode.svg';

  readonly categories: EduHubCategory[] = [
    { key: 'tutors', label: 'Tutors', image: 'assets/figma/eduhub-navigation/tutors.png', route: '/authed/tutors' },
    { key: 'academies', label: 'Academies', image: 'assets/figma/eduhub-navigation/academies.png', route: '/academies' },
    { key: 'counselors', label: 'Counselors', image: 'assets/figma/eduhub-home/counselors.png', route: '/authed/counselors' },
    { key: 'events', label: 'Events & Workshops', image: 'assets/figma/eduhub-navigation/events.png', route: '/authed/education/events' },
    { key: 'book-stores', label: 'Book Stores', image: 'assets/figma/eduhub-navigation/book-stores.png', route: '/authed/education/shops' },
    { key: 'sports-shops', label: 'Sports Shops', image: 'assets/figma/eduhub-navigation/sports-shops.png', route: '/authed/education/shops' },
    { key: 'stationery', label: 'Stationery Shops', image: 'assets/figma/eduhub-navigation/stationery.png', route: '/authed/education/shops' },
    { key: 'second-hand-books', label: 'Second-Hand Books', image: 'assets/figma/eduhub-navigation/second-hand-books.png', route: '/second-hand-books' },
    { key: 'hostels', label: 'PG / Hostels', image: 'assets/figma/eduhub-navigation/hostels.png', route: '/authed/education/pg-hostels' }
  ];

  selectedCategoryKey: CategoryKey = 'tutors';

  // Tutors, Academies and Counselors share /v1/tutors and are separated by
  // the backend's INDIVIDUAL, ACADEMY and COUNSELOR entityType filters.
  // Academies are the same underlying entity as tutors (entityType:
  // 'ACADEMY'), just a different filter on the same
  // directory — not the unrelated in-app "Skills Quest" learning feed.
  // Lazily loaded the first time that category is selected.
  academyTutors: TutorListItem[] = [];
  academyTotalCount = 0;
  private academyProfiles = new Map<number, Tutor>();
  private academyLoaded = false;
  private academyLoading = false;

  private readonly externalCategorySources: Partial<Record<CategoryKey, { endpoint: 'events' | 'shops' | 'tutors' | 'pg-hostels'; entityType: string }>> = {
    workshops: { endpoint: 'events', entityType: 'Workshop' },
    events: { endpoint: 'events', entityType: 'Events' },
    'book-stores': { endpoint: 'shops', entityType: 'bookstore' },
    stationery: { endpoint: 'shops', entityType: 'stationary' },
    'sports-shops': { endpoint: 'shops', entityType: 'sports' },
    counselors: { endpoint: 'tutors', entityType: 'COUNSELOR' },
    hostels: { endpoint: 'pg-hostels', entityType: '' }
  };
  private readonly externalPreviews = new Map<CategoryKey, EduHubPreview[]>();
  private readonly externalCounts = new Map<CategoryKey, number>();
  private readonly externalLoading = new Set<CategoryKey>();

  private subscriptions = new Subscription();
  tutorLoadError = false;
  showingOnlineFallback = false;
  private likeSubscriptions = new Map<string, Subscription>();

  constructor(
    private router: Router,
    private tutorService: TutorService,
    private likeService: TutorLikeService,
    private authService: AuthService,
    private http: HttpClient,
    private readonly eduhubEventsService: EduHubEventsService,
    private readonly cityService: EduHubCityService,
    private readonly shareLinks: ShareLinkService,
    private readonly core: CoreService,
    private readonly pgHostels: PgHostelsService
  ) { }

  ngOnInit(): void {
    this.loadTutors();
    this.subscriptions.add(this.cityService.location$.pipe(
      skip(1)
    ).subscribe(() => this.onEduHubCityChanged()));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.likeSubscriptions.forEach(subscription => subscription.unsubscribe());
    this.likeSubscriptions.clear();
  }

  get selectedCategory(): EduHubCategory {
    return this.categories.find(c => c.key === this.selectedCategoryKey) || this.categories[0];
  }

  /** The Home preview must never render more than the first four tutors. */
  get visibleTutors(): TutorListItem[] {
    return this.filterBySelectedCity(this.tutors).slice(0, this.maxTutors);
  }

  get visibleAcademies(): TutorListItem[] {
    return this.filterBySelectedCity(this.academyTutors).slice(0, this.maxTutors);
  }

  get hasMoreTutors(): boolean {
    return this.listingCount > this.visibleTutors.length;
  }

  get totalListingCount(): number {
    const externalCount = Array.from(this.externalCounts.values())
      .reduce((total, count) => total + count, 0);
    return this.listingCount + externalCount;
  }

  get visibleExternalPreviews(): EduHubPreview[] {
    const items = this.externalPreviews.get(this.selectedCategoryKey) || [];
    // PG / Hostels is already filtered by `city` on the dedicated API.
    // Some list responses omit display city, so do not hide valid records.
    return (this.selectedCategoryKey === 'hostels'
      ? items
      : items.filter(item => this.matchesSelectedCity(item.location)))
      .slice(0, this.maxTutors);
  }

  get isExternalCategoryLoading(): boolean {
    return this.externalLoading.has(this.selectedCategoryKey);
  }

  get isSelectedCategoryLoading(): boolean {
    return this.isExternalCategory(this.selectedCategoryKey)
      ? this.isExternalCategoryLoading
      : this.isLoading;
  }

  get isShopCategory(): boolean {
    return this.selectedCategoryKey === 'stationery'
      || this.selectedCategoryKey === 'book-stores'
      || this.selectedCategoryKey === 'sports-shops';
  }

  get showEmptyState(): boolean {
    if (this.isSelectedCategoryLoading) return false;
    if (this.selectedCategoryKey === 'tutors') return this.visibleTutors.length === 0;
    if (this.selectedCategoryKey === 'academies') return this.visibleAcademies.length === 0;
    return this.visibleExternalPreviews.length === 0;
  }

  /** Keep the category CTA available whenever the selected preview has data. */
  get showViewAll(): boolean {
    if (this.isSelectedCategoryLoading) return false;
    if (this.selectedCategoryKey === 'hostels') return this.visibleExternalPreviews.length > 0;
    if (this.selectedCategoryKey === 'tutors') return this.visibleTutors.length > 0;
    if (this.selectedCategoryKey === 'academies') return this.visibleAcademies.length > 0;
    if (this.isExternalCategory(this.selectedCategoryKey)) return this.visibleExternalPreviews.length > 0;
    return true;
  }

  /**
   * Switch the visible category. Filters in place — never navigates away.
   * Each category's data is fetched at most once and cached thereafter, so
   * repeated taps never trigger duplicate API calls.
   */
  selectCategory(category: EduHubCategory): void {
    if (this.selectedCategoryKey === category.key) {
      if (this.isExternalCategory(category.key) && !this.externalPreviews.has(category.key)) {
        this.loadExternalCategory(category.key);
      }
      return;
    }

    // Second-hand books keep their dedicated flow; counselors filter inline.
    if (category.key === 'second-hand-books') {
      void this.router.navigateByUrl(category.route);
      return;
    }

    this.selectedCategoryKey = category.key;

    if (category.key === 'tutors' && !this.tutorService.isLoaded) {
      this.loadTutors();
    } else if (category.key === 'academies' && !this.academyLoaded && !this.academyLoading) {
      this.loadAcademies();
    }
    if (this.isExternalCategory(category.key)) this.loadExternalCategory(category.key);
  }

  private isExternalCategory(categoryKey: CategoryKey): boolean {
    return !!this.externalCategorySources[categoryKey];
  }

  private loadExternalCategory(categoryKey: CategoryKey): void {
    const source = this.externalCategorySources[categoryKey];
    if (!source || this.externalLoading.has(categoryKey) || this.externalPreviews.has(categoryKey)) return;

    this.externalLoading.add(categoryKey);
    if (categoryKey === 'hostels') {
      this.subscriptions.add(this.pgHostels.list(0, 20, this.cityService.filter).subscribe({
        next: page => {
          this.externalPreviews.set(categoryKey, page.content.map(hostel => ({
            id: hostel.id,
            name: hostel.name || hostel.title || 'PG / Hostel',
            description: [hostel.accommodationType, hostel.suitableFor].filter(Boolean).join(' · '),
            image: this.pgHostels.imageCandidates(hostel)[0] || '',
            fee: hostel.monthlyRent ?? hostel.rent ?? hostel.price ?? null,
            location: [hostel.city, hostel.state].filter(Boolean).join(', '),
            hostel
          })));
          this.externalCounts.set(categoryKey, page.totalElements);
          this.externalLoading.delete(categoryKey);
        },
        error: () => {
          this.externalPreviews.delete(categoryKey);
          this.externalLoading.delete(categoryKey);
        }
      }));
      return;
    }
    if (categoryKey === 'counselors') {
      // Use the same API and normalization as the full counselor directory.
      this.subscriptions.add(this.tutorService.getTutorsByEntityType('COUNSELOR').subscribe({
        next: counselors => {
          const previews = counselors
            .filter(counselor => counselor?.isActive === true)
            .map(counselor => ({
            ...this.mapExternalPreview(counselor, this.categories.find(c => c.key === 'counselors')!.image),
            name: counselor.name?.trim() || counselor.entityName?.trim() || 'Counselor',
            description: counselor.subjects?.join(', ') || counselor.qualification || 'Counselor',
            fee: Number(counselor.categoryMappings?.find(m => m.categoryHourlyRate > 0)?.categoryHourlyRate || counselor.hourlyRate || counselor.fees) || null,
            location: counselor.location || [counselor.city, counselor.state].filter(Boolean).join(', '),
              counselor
            }));
          this.externalPreviews.set(categoryKey, previews);
          this.externalCounts.set(categoryKey, previews.length);
          this.externalLoading.delete(categoryKey);
        },
        error: () => {
          this.externalLoading.delete(categoryKey);
          this.externalCounts.set(categoryKey, 0);
        }
      }));
      return;
    }
    // Events and workshops must use the paged EduHub events service. This is
    // also the source used by their full listing pages, so Home cannot drift
    // to a different endpoint or silently miss the `content` payload.
    if (categoryKey === 'workshops' || categoryKey === 'events') {
      this.subscriptions.add(this.eduhubEventsService.getCombinedPage(0, 20, this.cityService.city).subscribe({
        next: response => {
          // Category artwork is navigation chrome, not a person's/listing's
          // profile image. Keep it as a fallback only for shop cards that
          // intentionally use branded category art; Workshops and Events must
          // fall back to the neutral empty image state when no image was uploaded.
          const fallbackImage = source.endpoint === 'shops'
            ? (this.categories.find(category => category.key === categoryKey)?.image || '')
            : '';
          const previews = (response?.content || [])
            .filter(item => this.isActiveDirectoryListing(item as EduHubDirectoryItem))
            .map(item => ({ ...this.mapExternalPreview(item as EduHubDirectoryItem, fallbackImage), event: item }));
          this.externalPreviews.set(categoryKey, previews);
          this.externalCounts.set(categoryKey, response?.totalElements ?? previews.length);
          this.externalLoading.delete(categoryKey);
        },
        error: () => {
          // Do not cache failed requests as successful empty responses; a
          // later tap should be able to retry after auth/network recovery.
          this.externalPreviews.delete(categoryKey);
          this.externalCounts.set(categoryKey, 0);
          this.externalLoading.delete(categoryKey);
        }
      }));
      return;
    }
    const baseUrl = this.getUserFacingApiBaseUrl();
    const endpointUrl = source.endpoint === 'tutors'
      ? `${baseUrl}/tutors`
      : `${baseUrl}/eduhub/${source.endpoint}`;
    let params = new HttpParams().set('entityType', source.entityType);
    if (source.endpoint !== 'tutors') {
      params = params.set('page', '0').set('size', '20');
      const userId = this.authService.getUserId();
      if (userId != null) params = params.set('forUserId', String(userId));
      if (source.endpoint === 'shops') {
        for (const [key, value] of Object.entries(this.cityService.filter)) {
          if (value) params = params.set(key, value);
        }
      }
    }
    this.subscriptions.add(
      this.http.get<any>(endpointUrl, {
        headers: this.academyHeaders(),
        params
      }).subscribe({
        next: response => {
          const rawItems = this.extractDirectoryItems(response);
          const fallbackImage = this.categories.find(category => category.key === categoryKey)?.image || '';
          const previews = rawItems
            // The shops API already applies its entity/status filtering. Keep
            // returned shop records visible even when legacy responses omit
            // the optional `isActive` flag.
            .filter(item => source.endpoint === 'shops' || this.isActiveDirectoryListing(item))
            .map(item => {
              const preview = this.mapExternalPreview(item, fallbackImage);
              // The Stationery API currently returns the shared blue pouch
              // artwork as a successful image URL for every listing. Treat it
              // as missing so each listing gets the neutral empty image state.
              if (categoryKey === 'stationery') preview.image = '';
              if (source.endpoint === 'shops') {
                preview.shop = {
                  name: preview.name,
                  image: categoryKey === 'stationery' ? '' : String(item.imageUrls?.[0] || item.imageUrl || item.thumbnailUrl || ''),
                  verified: !!item.verified,
                  fullAddress: String(item.exactLocation?.trim() || item.address?.trim() || ''),
                  unlocked: !!(item.unlocked ?? item.isUnlocked),
                  unlockCost: Math.max(0, Number(item.contactUnlockCost ?? item.unlockCost ?? 10) || 0),
                  likedBySelf: !!item.likedBySelf
                };
              }
              return preview;
            });
          this.externalPreviews.set(categoryKey, previews);
          this.externalCounts.set(categoryKey, Number(response?.totalElements ?? response?.data?.totalElements ?? previews.length));
          this.externalLoading.delete(categoryKey);
        },
        error: () => {
          this.externalPreviews.delete(categoryKey);
          this.externalCounts.set(categoryKey, 0);
          this.externalLoading.delete(categoryKey);
        }
      })
    );
  }

  private extractDirectoryItems(response: any): EduHubDirectoryItem[] {
    const items = Array.isArray(response)
      ? response
      : (response?.content ?? response?.items ?? response?.tutors ?? response?.data?.content ?? response?.data?.items ?? response?.data?.tutors ?? response?.data ?? []);
    return Array.isArray(items) ? items : [];
  }

  private onEduHubCityChanged(): void {
    this.externalPreviews.clear();
    this.externalCounts.clear();
    this.externalLoading.clear();
    if (this.isExternalCategory(this.selectedCategoryKey)) {
      this.loadExternalCategory(this.selectedCategoryKey);
    }
    this.refreshHomeTutors();
    this.academyLoaded = false;
    if (this.selectedCategoryKey === 'academies') this.loadAcademies();
  }

  private filterBySelectedCity(items: TutorListItem[]): TutorListItem[] {
    return items.filter(item => {
      const cached = this.tutorService.getTutorFromCache(item.id) as any;
      return this.matchesSelectedCity([
        item.location,
        cached?.city,
        cached?.location,
        cached?.state
      ].filter(Boolean).join(' '));
    });
  }

  private matchesSelectedCity(location: unknown): boolean {
    const city = this.cityService.city.trim().toLocaleLowerCase();
    return !city || String(location ?? '').toLocaleLowerCase().includes(city);
  }

  /**
   * Active is the only visibility requirement for EduHub shop cards.
   * `verified` is intentionally not considered here: an active but
   * unverified stationery shop remains visible without a Verified badge.
   */
  private isActiveDirectoryListing(item: EduHubDirectoryItem): boolean {
    if (item.isActive === true) return true;
    if (item.isActive === false) return false;

    const statuses = [item.status, item.accountStatus]
      .map(status => String(status ?? '').trim().toLowerCase())
      .filter(Boolean);
    return !statuses.length || statuses.every(status =>
      ['active', 'approved', 'published', 'verified', 'enabled'].includes(status)
    );
  }

  private getUserFacingApiBaseUrl(): string {
    // Keep Home previews on the same configured API as the full EduHub pages.
    // Rewriting localhost:4200 to a separate backend caused valid production
    // shop results to appear as an empty category in local frontend testing.
    return environment.apiUrl;
  }

  private mapExternalPreview(item: EduHubDirectoryItem, fallbackImage: string): EduHubPreview {
    const fee = Number(item?.fee ?? item?.hourlyRate);
    const candidateImage = item?.imageUrls?.[0] || item?.imageUrl || item?.thumbnailUrl || item?.profilePicUrl || item?.avatar || '';
    const imageLooksLikePlaceholder = /(?:default|placeholder|category-(?:workshops?|events?)|(?:light[-_ ]?)bulb)[^/]*\.(?:png|jpe?g|webp|svg)(?:$|[?#])/i.test(candidateImage);
    return {
      id: item?.id ?? `${item?.name || item?.title || 'listing'}-${item?.city || ''}`,
      name: String(item?.name || item?.title || 'EduHub listing').trim(),
      description: String(item?.bio || item?.description || item?.headline || [item?.city, item?.state].filter(Boolean).join(', ') || 'EduHub listing').trim(),
      image: imageLooksLikePlaceholder ? fallbackImage : (candidateImage || fallbackImage),
      fee: Number.isFinite(fee) ? fee : null,
      location: [item?.city, item?.state].filter(Boolean).join(', ') || String(item?.address || '').trim(),
      source: item
    };
  }

  /**
   * Load recent tutors from service
   */
  private readonly shopLikesPending = new Set<string | number>();

  toggleShopLike(listing: EduHubPreview): void {
    const shop = listing.shop;
    if (!shop || this.shopLikesPending.has(listing.id)) return;
    const previous = shop.likedBySelf;
    shop.likedBySelf = !previous;
    this.shopLikesPending.add(listing.id);
    this.subscriptions.add(this.eduhubEventsService.toggleLike(Number(listing.id), shop.likedBySelf).subscribe({
      next: response => {
        shop.likedBySelf = response.likedBySelf ?? shop.likedBySelf;
        this.shopLikesPending.delete(listing.id);
      },
      error: () => {
        shop.likedBySelf = previous;
        this.shopLikesPending.delete(listing.id);
        this.core.triggerToasrt('Unable to update like. Please try again.', 'error');
      }
    }));
  }

  async shareShop(listing: EduHubPreview): Promise<void> {
    try {
      await Share.share({ title: listing.name, text: `View ${listing.name} on SuperMe EduHub.`,
        url: this.shareLinks.buildListingLink('shop', listing.id) });
    } catch (error: any) {
      if (!/cancel|dismiss/i.test(String(error?.message || error))) {
        this.core.triggerToasrt('Unable to share this listing. Please try again.', 'error');
      }
    }
  }

  openShopDirections(listing: EduHubPreview): void {
    if (!listing.shop?.unlocked) return;
    const address = listing.shop.fullAddress;
    if (!address) {
      this.core.triggerToasrt('Directions are not available for this listing.', 'info');
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
  }

  openShopContact(listing: EduHubPreview): void {
    const source = this.externalCategorySources[this.selectedCategoryKey];
    void this.router.navigate(['/authed/education/shops'], {
      queryParams: { entityType: source?.entityType, label: this.selectedCategory.label,
        city: this.cityService.city, listing: listing.id, action: 'contact' }
    });
  }

  private loadTutors(): void {
    this.isLoading = true;

    // The unfiltered endpoint mixes individual tutors, academies and
    // counselors. The Tutors tab must contain individual profiles only.
    this.refreshHomeTutors();

    // Subscribe to recent tutors
    this.subscriptions.add(
      // Keep the complete tutor directory here. `visibleTutors` applies the
      // city filter first and only then limits the Home preview to four cards.
      // Limiting before filtering hid valid records such as Elizabeth Sherly.
      this.tutorService.getRecentTutors(Number.MAX_SAFE_INTEGER).subscribe(tutors => {
        this.tutors = tutors;
        this.syncLikeStates();
      })
    );

    this.subscriptions.add(
      this.tutorService.allTutors$.subscribe(tutors => {
        this.listingCount = tutors.length;
      })
    );
  }

  private refreshHomeTutors(): void {
    this.tutorLoadError = false;
    this.showingOnlineFallback = false;
    this.isLoading = true;
    this.tutorService.setCacheAndApply([]);
    this.subscriptions.add(this.tutorService.getHomeTutorListings().subscribe({
      next: result => {
        this.showingOnlineFallback = result.usedOnlineFallback && result.noLocalListings;
        this.tutorService.setCacheAndApply(result.tutors);
        this.isLoading = false;
      },
      error: () => {
        this.tutorLoadError = true;
        this.isLoading = false;
      }
    }));
  }

  retryTutors(): void { this.refreshHomeTutors(); }

  private academyHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const fallbackToken = String(environment.apiAuthToken ?? '').trim();
    const selectedToken = token || fallbackToken;
    let headers = new HttpHeaders({
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });

    if (selectedToken) {
      headers = headers.set(
        'Authorization',
        selectedToken.startsWith('Bearer ') ? selectedToken : `Bearer ${selectedToken}`
      );
    }

    return headers;
  }

  private loadAcademies(): void {
    this.academyLoading = true;
    this.isLoading = true;

    this.subscriptions.add(
      this.http.get<any>(`${environment.apiUrl}/tutors`, {
        headers: this.academyHeaders(),
        params: { entityType: 'ACADEMY', ...this.cityService.filter }
      }).subscribe({
        next: (res) => {
          const raw = Array.isArray(res)
            ? res
            : (res?.data?.tutors ?? res?.data?.content ?? res?.data ?? res?.tutors ?? res?.content ?? []);

          this.academyProfiles.clear();
          const mapped: TutorListItem[] = (Array.isArray(raw) ? raw : [])
            // Academy discovery must be driven by account activity, not the
            // verification flag. Unverified active academies are visible but
            // simply do not receive a Verified badge.
            .filter((academy: any) => this.isActiveDirectoryListing(academy))
            .map((a: any) => {
              const { listItem, profile } = this.mapAcademy(a);
              if (listItem.id != null) this.academyProfiles.set(Number(listItem.id), profile);
              return listItem;
            });

          // Keep every academy; `visibleAcademies` filters by city first and
          // only then limits the Home preview. Slicing here hid Bengaluru
          // academies whenever they were not among the first four API rows.
          this.academyTutors = mapped;
          this.tutorService.setDirectoryCache(
            'ACADEMY',
            Array.from(this.academyProfiles.values())
          );
          this.academyTotalCount = Number(res?.data?.totalElements ?? mapped.length);
          this.academyLoaded = true;
          this.academyLoading = false;
          if (this.selectedCategoryKey === 'academies') this.isLoading = false;
        },
        error: () => {
          this.academyTutors = [];
          this.academyTotalCount = 0;
          this.academyLoaded = true;
          this.academyLoading = false;
          if (this.selectedCategoryKey === 'academies') this.isLoading = false;
        }
      })
    );
  }

  // Mirrors AcademiesListComponent's mapping so the two screens agree on
  // what an "Academy" is — field names are a best guess pending the real
  // API contract, same caveat as the full academies list page.
  private mapAcademy(a: any): { listItem: TutorListItem; profile: Tutor } {
    const name = a?.entityName ?? a?.name ?? a?.academyName ?? a?.title ?? 'Academy';
    const image = a?.profilePicUrl ?? a?.image ?? a?.thumbnailUrl ?? a?.imageUrl ?? '';
    const location = a?.location ?? [a?.city, a?.state].filter(Boolean).join(', ');
    const subjects = Array.isArray(a?.subjects) ? a.subjects.map((s: any) => String(s).trim()).filter(Boolean) : [];
    const levels = Array.isArray(a?.classes) ? a.classes.map((s: any) => String(s).trim()).filter(Boolean) : [];
    const fees = Number(a?.fees ?? a?.hourlyRate ?? a?.price ?? 0);

    const verified = !!(a?.verified ?? a?.isVerified ?? a?.documentsVerified ?? a?.verificationStatus === 'Verified');

    const profile = {
      ...a,
      id: a?.id,
      name,
      entityName: name,
      entityType: 'ACADEMY',
      profilePicUrl: image,
      subjects,
      levels,
      location,
      hourlyRate: fees,
      fees,
      isVerified: verified,
      verified
    } as unknown as Tutor;

    const listItem: TutorListItem = {
      id: a?.id,
      name,
      avatar: image,
      description: subjects.length ? subjects.join(', ') : (a?.headline || 'Academy'),
      rating: Number(a?.rating ?? 0),
      champsLiked: Number(a?.champsLiked ?? 0),
      likedByUser: !!(a?.likedByUser ?? a?.liked),
      isVerified: verified,
      experience: a?.experience ?? a?.experienceRange ?? '',
      qualification: a?.qualification ?? a?.headline ?? 'Academy',
      hourlyRate: fees,
      feeLabel: a?.feeType ? `/${String(a.feeType).replace(/^PER_/, '').toLowerCase()}` : '',
      location,
      subjects,
      levels,
      availability: Array.isArray(a?.availability) ? a.availability : [],
      startTime: a?.startTime ?? '',
      endTime: a?.endTime ?? '',
      contactModes: Array.isArray(a?.contactModes) ? a.contactModes : [],
      teachingMode: a?.teachingMode ?? null,
      createdAt: a?.createdAt ?? '',
      totalStudents: Number(a?.totalStudents ?? a?.studentCount ?? 0)
    };

    return { listItem, profile };
  }

  private syncLikeStates(): void {
    const visibleIds = new Set(
      this.tutors
        .filter(tutor => !!tutor?.id)
        .map(tutor => String(tutor.id))
    );

    this.likeSubscriptions.forEach((subscription, id) => {
      if (!visibleIds.has(id)) {
        subscription.unsubscribe();
        this.likeSubscriptions.delete(id);
      }
    });

    this.tutors.forEach(tutor => {
      if (!tutor?.id) return;

      const id = String(tutor.id);
      this.likeService.initFromServer(tutor);
      if (this.likeSubscriptions.has(id)) return;

      const subscription = this.likeService.watch(id).subscribe(state => {
        this.tutors
          .filter(currentTutor => String(currentTutor.id) === id)
          .forEach(currentTutor => {
            currentTutor.champsLiked = state.count;
            (currentTutor as any).likedByUser = state.liked;
            (currentTutor as any).likePending = state.pending;
          });
      });
      this.likeSubscriptions.set(id, subscription);
    });
  }

  onViewAll(): void {
    if (this.selectedCategoryKey === 'hostels') {
      void this.router.navigate(['/authed/education/pg-hostels'], { queryParams: this.cityService.filter });
      return;
    }
    if (this.selectedCategoryKey === 'tutors') {
      const visibleProfiles = this.visibleTutors
        .map(tutor => this.tutorService.getTutorFromCache(tutor.id))
        .filter((tutor): tutor is Tutor => !!tutor);
      // Carry the exact Home selection into the full directory. This also
      // protects native/Ionic navigation from recreating the destination
      // before its shared-city subscription has emitted.
      void this.router.navigate(['/authed/tutors'], {
        queryParams: this.cityService.filter,
        state: {
          city: this.cityService.city,
          state: this.cityService.state,
          directoryItems: visibleProfiles
        }
      });
      return;
    }
    if (this.isShopCategory) {
      const shopDirectory: Record<'stationery' | 'book-stores' | 'sports-shops', { label: string; entityType: string }> = {
        stationery: { label: 'Stationery Shops', entityType: 'stationary' },
        'book-stores': { label: 'Book Stores', entityType: 'bookstore' },
        'sports-shops': { label: 'Sports Shops', entityType: 'sports' }
      };
      const selectedShop = shopDirectory[this.selectedCategoryKey as keyof typeof shopDirectory];

      // These are EduHub local-business listings, not the school ecommerce
      // catalogue. Preserve the Home city so each full directory opens with
      // matching results and remains independently changeable there.
      void this.router.navigate(['/authed/education/shops'], {
        queryParams: {
          label: selectedShop.label,
          entityType: selectedShop.entityType,
          ...this.cityService.filter
        },
        state: this.cityService.filter
      });
      return;
    }
    if (this.selectedCategoryKey === 'workshops' || this.selectedCategoryKey === 'events') {
      void this.router.navigate([this.selectedCategory.route], {
        queryParams: { ...this.cityService.filter, combined: 'true' }
      });
      return;
    }
    if (this.selectedCategoryKey === 'academies') {
      const visibleProfiles = this.visibleAcademies
        .map(academy => this.academyProfiles.get(Number(academy.id)))
        .filter((academy): academy is Tutor => !!academy);
      void this.router.navigate([this.selectedCategory.route], {
        queryParams: this.cityService.filter,
        state: {
          city: this.cityService.city,
          state: this.cityService.state,
          directoryItems: visibleProfiles
        }
      });
      return;
    }
    this.router.navigateByUrl(this.selectedCategory.route);
  }

  onViewExternalDetails(listing: EduHubPreview): void {
    if (this.selectedCategoryKey === 'hostels' && listing.hostel) {
      void this.router.navigate(['/authed/education/pg-hostels', listing.hostel.id]);
      return;
    }
    if (this.selectedCategoryKey === 'counselors' && listing.counselor) {
      this.onViewCounselorProfile(listing.counselor);
      return;
    }

    if (this.selectedCategoryKey === 'workshops' || this.selectedCategoryKey === 'events') {
      const isWorkshop = listing.event?.entityType?.toLowerCase() === 'workshop';
      const routeSegment = isWorkshop ? 'workshops' : 'events';
      const entityType = isWorkshop ? 'Workshop' : 'Events';
      const title = isWorkshop ? 'Workshops' : 'Events';
      const source = listing.source;

      if (source) {
        try {
          sessionStorage.setItem(
            `superme_eduhub_${entityType.toLowerCase()}_${listing.id}`,
            JSON.stringify(source)
          );
        } catch {
          // Router state still carries the record for normal navigation.
        }
      }

      void this.router.navigate(['/authed/education', routeSegment, listing.id], {
        state: { listing: source, entityType, title }
      });
      return;
    }

    if (!this.isShopCategory) return;
    const labelByCategory: Partial<Record<CategoryKey, string>> = {
      stationery: 'Stationery Shops',
      'book-stores': 'Book Stores',
      'sports-shops': 'Sports Shops'
    };
    const entityTypeByCategory: Partial<Record<CategoryKey, string>> = {
      stationery: 'stationary',
      'book-stores': 'bookstore',
      'sports-shops': 'sports'
    };
    const source = listing.source;
    const detailListing = {
      id: Number(listing.id),
      entityType: entityTypeByCategory[this.selectedCategoryKey] || '',
      name: listing.name,
      publicLocation: listing.location,
      fullAddress: String(source?.exactLocation || source?.address || listing.location || ''),
      phone: String(source?.phone || ''),
      email: String(source?.email || ''),
      image: listing.image,
      verified: !!source?.verified,
      unlockCost: Number(source?.unlockCost ?? source?.contactUnlockCost ?? 10),
      unlocked: !!(source?.unlocked ?? source?.isUnlocked)
    };

    try {
      sessionStorage.setItem(`superme_eduhub_shop_${listing.id}`, JSON.stringify(detailListing));
    } catch {
      // Navigation state is sufficient during the normal in-app flow.
    }

    void this.router.navigate(['/authed/education/shops', listing.id], {
      state: {
        city: this.cityService.city,
        categoryLabel: labelByCategory[this.selectedCategoryKey],
        listing: detailListing
      }
    });
  }

  onViewCounselorProfile(counselor: Tutor): void {
    void this.router.navigate(['/authed/counselors', counselor.id], {
      state: { tutor: counselor }
    });
  }

  getTutorMeta(tutor: TutorListItem): string {
    const likes = typeof tutor.champsLiked === 'number'
      ? tutor.champsLiked
      : (typeof tutor.rating === 'number' ? tutor.rating : null);
    const experience = tutor.experience?.trim();

    if (likes === null) return experience || '';
    return experience ? `${likes} | ${experience}` : String(likes);
  }

  isVerified(tutor: TutorListItem): boolean {
    return !!tutor.isVerified;
  }

  isLikePending(tutor: TutorListItem): boolean {
    return !!(tutor as TutorListItem & { likePending?: boolean }).likePending;
  }

  getTimeLabel(tutor: TutorListItem): string {
    const start = this.formatCardTime(tutor.startTime);
    const end = this.formatCardTime(tutor.endTime);

    if (start && end) return `${start} - ${end}`;
    return start || end;
  }

  toggleLike(event: Event, tutor: TutorListItem): void {
    event.stopPropagation();
    if (this.isLikePending(tutor)) return;

    const request = this.likeService.toggleLike(tutor);
    if (!request) return;

    void request.catch(() => {
      // The shared like service restores the prior state after a failed request.
    });
  }

  onImageError(event: Event, fallbackImage: string): void {
    const image = event.target as HTMLImageElement | null;
    if (!image || image.src.endsWith(fallbackImage)) return;
    image.src = fallbackImage;
  }

  private formatCardTime(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    const timeMatch = raw.match(/(?:T|\b)(\d{1,2}):(\d{2})(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/);
    if (!timeMatch) return '';

    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return '';

    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  trackCategory(_: number, category: EduHubCategory): CategoryKey {
    return category.key;
  }

  trackTutor(_: number, tutor: TutorListItem): number {
    return tutor.id;
  }

  trackPreview(_: number, preview: EduHubPreview): string | number {
    return preview.id;
  }

  onViewProfile(tutor: TutorListItem): void {
    const cachedTutor = this.tutorService.getTutorFromCache(tutor.id);
    void this.router.navigate(['/authed/tutors', tutor.id], {
      state: cachedTutor ? { tutor: cachedTutor } : undefined
    });
  }

  getEducationProfile(item: TutorListItem): Tutor | undefined {
    return this.selectedCategoryKey === 'academies'
      ? this.academyProfiles.get(Number(item.id))
      : this.tutorService.getTutorFromCache(item.id);
  }

  onViewAcademyProfile(item: TutorListItem): void {
    const profile = this.academyProfiles.get(Number(item.id));
    void this.router.navigate(['/authed/tutors', item.id], {
      state: profile ? { tutor: profile } : undefined
    });
  }

}
