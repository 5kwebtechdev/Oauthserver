import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { IonicModule } from '@ionic/angular';
import { distinctUntilChanged, skip, Subscription } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';
import { UserService } from '../../../services/user.service';
import { EduHubEventsService } from '../../../services/eduhub-events.service';
import { PetAgeService } from '../../../services/pet-age.service';
import { EduHubCityService } from '../../../services/eduhub-city.service';
import { ShareLinkService } from '../../../services/share-link.service';
import { AdBannerComponent } from '../../ad-banner/ad-banner.component';
import { FooterComponent } from '../../footer/footer.component';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';
import { EduHubShopCardComponent } from '../eduhub-shop-card/eduhub-shop-card.component';
import { EduHubCitySelectorComponent } from '../eduhub-city-selector/eduhub-city-selector.component';

type DirectorySort = 'verified' | 'nearest';
type ContactMethod = 'call' | 'email';

interface StoreCategoryResponse {
  id: number;
  name?: string | null;
  displayName?: string | null;
}

interface EduHubDirectoryResponse {
  id: number;
  categoryId?: number | string | null;
  category?: string | null;
  categoryName?: string | null;
  entityType?: string | null;
  name?: string | null;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  exactLocation?: string | null;
  state?: string | null;
  city?: string | null;
  status?: string | null;
  accountStatus?: string | null;
  isActive?: boolean | null;
  verified?: boolean | null;
  imageUrls?: string[] | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  distance?: number | string | null;
  distanceKm?: number | string | null;
  unlockCost?: number | string | null;
  contactUnlockCost?: number | string | null;
  unlocked?: boolean | null;
  isUnlocked?: boolean | null;
  champsLiked?: number | null;
  likedBySelf?: boolean | null;
}

interface EduHubShopListing {
  id: number;
  entityType: string;
  name: string;
  publicLocation: string;
  fullAddress: string;
  phone: string;
  email: string;
  image: string;
  verified: boolean;
  distanceKm: number | null;
  latitude: number | null;
  longitude: number | null;
  unlockCost: number;
  unlocked: boolean;
  champsLiked: number;
  likedBySelf: boolean;
}

@Component({
  selector: 'app-parent-eduhub-shop-listing',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    AdBannerComponent,
    FooterComponent,
    SupermePetComponent,
    EduHubShopCardComponent,
    EduHubCitySelectorComponent
  ],
  templateUrl: './parent-eduhub-shop-listing.component.html',
  styleUrls: ['./parent-eduhub-shop-listing.component.scss']
})
export class ParentEduHubShopListingComponent implements OnInit, OnDestroy {
  readonly loadingCards = [0, 1, 2];
  readonly sortOptions: Array<{ value: DirectorySort; label: string }> = [
    { value: 'verified', label: 'Verified' },
    { value: 'nearest', label: 'Nearest' }
  ];

  categoryId: number | null = null;
  categoryLabel = 'Shops';
  entityType = '';
  selectedListingId: number | null = null;
  listings: EduHubShopListing[] = [];
  loading = true;
  loadError = '';
  searchOpen = false;
  searchQuery = '';
  sortOpen = false;
  selectedSort: DirectorySort = 'verified';

  unlockItem: EduHubShopListing | null = null;
  contactItem: EduHubShopListing | null = null;
  selectedContactMethod: ContactMethod = 'call';
  unlockRequestInProgress = false;
  contactLaunching = false;
  coinBalance = 0;

  private readonly subscriptions = new Subscription();
  private listingsRequestId = 0;
  private readonly likeInProgress = new Set<number>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly location: Location,
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly core: CoreService,
    private readonly userService: UserService,
    private readonly eduHubEventsService: EduHubEventsService,
    private readonly petAgeService: PetAgeService,
    private readonly cityService: EduHubCityService,
    private readonly shareLinks: ShareLinkService
  ) {}

  /** Panda uses the same Figma artwork shown on Home/Coins/Learning instead of this page's decorative mascot. */
  get isPandaPet(): boolean {
    return this.petAgeService.getCurrentPetType() === 'panda';
  }

  ngOnInit(): void {
    this.loadStoredCoinBalance();

    this.subscriptions.add(
      this.route.queryParamMap.subscribe(params => {
        const navigationCity = String(
          history.state?.city ?? params.get('city') ?? ''
        ).trim();
        if (navigationCity) this.cityService.selectCity(navigationCity);

        this.entityType = String(params.get('entityType') ?? '').trim();
        const rawListingId = Number(params.get('listing'));
        this.selectedListingId = Number.isFinite(rawListingId) && rawListingId > 0
          ? rawListingId
          : null;
        const rawCategoryId = Number(params.get('category'));
        this.categoryId = Number.isFinite(rawCategoryId) && rawCategoryId > 0
          ? rawCategoryId
          : null;

        const navigationLabel = String(
          history.state?.categoryLabel
          ?? this.route.snapshot.data?.['listingCategory']
          ?? params.get('label')
          ?? ''
        ).trim();

        if (navigationLabel) {
          this.categoryLabel = navigationLabel;
          this.loadListings();
        } else {
          this.resolveCategoryLabel();
        }
      })
    );

    // The selector on this page updates the shared city. Refresh the API
    // immediately so changing city here updates this directory too.
    this.subscriptions.add(
      this.cityService.location$.pipe(skip(1)).subscribe(() => {
        this.selectedListingId = null;
        this.loadListings();
      })
    );

    this.refreshCoinBalance();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    document.body.style.overflow = '';
  }

  @HostListener('document:click')
  closeSortMenu(): void {
    this.sortOpen = false;
  }

  get pageTitle(): string {
    const label = this.categoryLabel.trim() || 'Shops';
    const normalized = label.toLowerCase();
    if (/\b(shops?|stores?)\b/.test(normalized)) return label;
    if (/\bbooks?\b/.test(normalized)) return `${label} Stores`;
    return `${label} Shops`;
  }

  get singularPageTitle(): string {
    return this.pageTitle
      .replace(/\bshops\b/i, 'shop')
      .replace(/\bstores\b/i, 'store')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  get sectionTitle(): string {
    return `${this.pageTitle} near you`;
  }

  get selectedSortLabel(): string {
    return this.sortOptions.find(option => option.value === this.selectedSort)?.label ?? 'Verified';
  }

  get visibleListings(): EduHubShopListing[] {
    const query = this.normalize(this.searchQuery);
    const city = this.normalize(this.cityService.city);
    const filtered = this.listings.filter(item => {
      if (this.selectedListingId != null && item.id !== this.selectedListingId) return false;
      const itemLocation = this.normalize([item.publicLocation, item.fullAddress].join(' '));
      const matchesCity = !city || itemLocation.includes(city);
      const matchesQuery = !query || this.normalize([
          item.name,
          item.publicLocation,
          item.fullAddress,
          item.entityType
        ].join(' ')).includes(query);
      return matchesCity && matchesQuery;
    });

    if (this.selectedSort === 'nearest') {
      return filtered.sort((a, b) => {
        const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance || a.name.localeCompare(b.name);
      });
    }

    return filtered.sort((a, b) => Number(b.verified) - Number(a.verified));
  }

  goBack(): void {
    this.location.back();
  }

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen) this.searchQuery = '';
  }

  updateSearch(value: string): void {
    this.searchQuery = value;
  }

  toggleSort(event: Event): void {
    event.stopPropagation();
    this.sortOpen = !this.sortOpen;
  }

  selectSort(value: DirectorySort, event: Event): void {
    event.stopPropagation();
    this.selectedSort = value;
    this.sortOpen = false;
  }

  retry(): void {
    this.loadListings();
  }

  async referForListing(): Promise<void> {
    const text = `Know a ${this.singularPageTitle}? Refer them to get listed on SuperMe EduHub.`;
    try {
      await Share.share({
        title: 'Refer for listing',
        text,
        url: 'https://supermeapp.com'
      });
    } catch (error) {
      if (!this.isShareCancelled(error)) {
        this.core.triggerToasrt('Unable to open sharing right now. Please try again.', 'error');
      }
    }
  }

  toggleFavourite(item: EduHubShopListing): void {
    if (this.likeInProgress.has(item.id)) return;

    const nextLiked = !item.likedBySelf;
    const previousLiked = item.likedBySelf;
    const previousCount = item.champsLiked;

    item.likedBySelf = nextLiked;
    item.champsLiked = Math.max(0, item.champsLiked + (nextLiked ? 1 : -1));
    this.likeInProgress.add(item.id);

    this.eduHubEventsService.toggleLike(item.id, nextLiked).subscribe({
      next: response => {
        this.likeInProgress.delete(item.id);
        if (typeof response.likedBySelf === 'boolean') item.likedBySelf = response.likedBySelf;
        if (typeof response.champsLiked === 'number') item.champsLiked = response.champsLiked;
      },
      error: () => {
        this.likeInProgress.delete(item.id);
        item.likedBySelf = previousLiked;
        item.champsLiked = previousCount;
        this.core.triggerToasrt('Unable to update like. Please try again.', 'error');
      }
    });
  }

  isFavourite(item: EduHubShopListing): boolean {
    return item.likedBySelf;
  }

  async shareListing(item: EduHubShopListing): Promise<void> {
    const location = item.publicLocation ? ` in ${item.publicLocation}` : '';
    try {
      await Share.share({
        title: item.name,
        text: `View ${item.name}${location} on SuperMe EduHub.`,
        url: this.shareLinks.buildListingLink('shop', item.id)
      });
    } catch (error) {
      if (!this.isShareCancelled(error)) {
        this.core.triggerToasrt('Unable to share this listing. Please try again.', 'error');
      }
    }
  }

  async openDirections(item: EduHubShopListing): Promise<void> {
    if (!item.unlocked) {
      this.core.triggerToasrt('Unlock this listing to view directions.', 'info');
      return;
    }

    const coordinates = item.unlocked && item.latitude != null && item.longitude != null
      ? `${item.latitude},${item.longitude}`
      : '';
    const query = coordinates || (item.unlocked ? item.fullAddress : '') || item.publicLocation;

    if (!query) {
      this.core.triggerToasrt('Directions are not available for this listing.', 'info');
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    try {
      await this.openExternalUrl(url);
    } catch {
      this.core.triggerToasrt('Unable to open maps. Please try again.', 'error');
    }
  }

  requestUnlock(item: EduHubShopListing): void {
    if (item.unlocked) {
      this.openContactSheet(item);
      return;
    }

    // The directory response intentionally hides protected contact data. The
    // unlock endpoint returns those fields after it verifies and deducts coins.
    this.unlockItem = item;
    document.body.style.overflow = 'hidden';
  }

  closeUnlockSheet(): void {
    if (this.unlockRequestInProgress) return;
    this.unlockItem = null;
    document.body.style.overflow = '';
  }

  confirmUnlock(): void {
    const item = this.unlockItem;
    if (!item || this.unlockRequestInProgress) return;

    const userId = this.authService.getUserId();
    if (userId == null) {
      this.core.triggerToasrt('Unable to identify your account. Please sign in again.', 'error');
      return;
    }

    this.unlockRequestInProgress = true;

    // Reuses the same EduHub unlock-contact call as the event/workshop detail
    // screen instead of duplicating the raw HTTP request here.
    this.eduHubEventsService.unlockContact(item.id).subscribe({
      next: response => {
        this.applyUnlockedListing(item, response);
        item.unlocked = true;
        this.unlockRequestInProgress = false;
        this.unlockItem = null;
        document.body.style.overflow = '';

        const coinsSpent = Number((response as any)?.coinsSpent ?? 0);
        if (coinsSpent > 0) {
          // First-time unlock — coins were actually deducted. Trust the
          // unlock response's own balance rather than firing a second GET.
          this.core.triggerToasrt(`${coinsSpent} coins deducted. Contact details unlocked.`, 'success');
          this.applyRemainingBalance((response as any)?.remainingBalance);
        } else {
          // Repeat tap on an already-unlocked listing — nothing was spent,
          // so just reveal the contact info without a coin animation.
          this.core.triggerToasrt('Contact details unlocked.', 'success');
        }

        this.openContactSheet(item);
      },
      error: (error: HttpErrorResponse) => {
        this.unlockRequestInProgress = false;
        this.core.triggerToasrt(
          this.extractApiError(error, 'Unable to unlock these details. Please try again.'),
          'error'
        );
      }
    });
  }

  /** Updates the visible wallet balance from the unlock response; falls back to a fresh GET only if it's missing. */
  private applyRemainingBalance(remainingBalance: unknown): void {
    const coins = Number(remainingBalance);
    if (!Number.isFinite(coins)) {
      this.refreshCoinBalance();
      return;
    }

    this.coinBalance = Math.max(0, coins);
    this.authService.updateUserData({ coins: this.coinBalance });
    const currentStats = this.userService.getUserStats();
    if (currentStats) {
      this.userService.saveUserStats({ ...currentStats, coins: this.coinBalance });
    } else {
      this.userService.refreshStats().subscribe();
    }
  }

  openContactSheet(item: EduHubShopListing): void {
    if (!item.phone && !item.email) {
      this.core.triggerToasrt('No phone number or email is available for this listing.', 'info');
      return;
    }
    this.contactItem = item;
    this.selectedContactMethod = item.phone ? 'call' : 'email';
    document.body.style.overflow = 'hidden';
  }

  closeContactSheet(): void {
    if (this.contactLaunching) return;
    this.contactItem = null;
    document.body.style.overflow = '';
  }

  selectContactMethod(method: ContactMethod): void {
    if (method === 'call' && !this.contactItem?.phone) return;
    if (method === 'email' && !this.contactItem?.email) return;
    this.selectedContactMethod = method;
  }

  async confirmContact(): Promise<void> {
    const item = this.contactItem;
    if (!item || this.contactLaunching) return;

    const url = this.selectedContactMethod === 'call'
      ? this.buildTelephoneUrl(item.phone)
      : this.buildEmailUrl(item.email, item.name);

    if (!url) {
      this.core.triggerToasrt('This contact option is not available.', 'error');
      return;
    }

    this.contactLaunching = true;
    try {
      await this.openExternalUrl(url);
      this.contactItem = null;
      document.body.style.overflow = '';
    } catch {
      this.core.triggerToasrt('Unable to open this contact option. Please try again.', 'error');
    } finally {
      this.contactLaunching = false;
    }
  }

  get contactActionLabel(): string {
    return this.selectedContactMethod === 'call' ? 'Call' : 'Email';
  }

  onListingImageError(item: EduHubShopListing): void {
    item.image = '';
  }

  trackListing(_: number, item: EduHubShopListing): number {
    return item.id;
  }

  openListing(item: EduHubShopListing, event?: Event): void {
    event?.stopPropagation();
    // Keep the complete card in navigation state so the detail screen opens
    // instantly without another request. It can still show a useful fallback
    // when opened from a copied URL.
    try {
      sessionStorage.setItem(`superme_eduhub_shop_${item.id}`, JSON.stringify(item));
    } catch {
      // Router state still supports the normal in-app navigation flow.
    }
    void this.router.navigate(['/education/shops', item.id], {
      state: { listing: item, categoryLabel: this.categoryLabel }
    });
  }

  private resolveCategoryLabel(): void {
    if (this.categoryId == null) {
      this.loadListings();
      return;
    }

    this.loading = true;
    this.http.get<StoreCategoryResponse[]>(
      `${environment.apiUrl}/store/categories/all`,
      { headers: this.getApiHeaders() }
    ).subscribe({
      next: response => {
        const match = (Array.isArray(response) ? response : [])
          .find(category => Number(category.id) === this.categoryId);
        this.categoryLabel = String(match?.displayName ?? match?.name ?? 'Shops').trim() || 'Shops';
        this.loadListings();
      },
      error: () => this.loadListings()
    });
  }

  private loadListings(): void {
    const requestId = ++this.listingsRequestId;
    this.loading = true;
    this.loadError = '';
    this.listings = [];

    const userId = this.authService.getUserId();
    const params: Record<string, string> = {
      page: '0',
      size: '100'
    };
    Object.assign(params, this.cityService.filter);
    if (userId != null) params['forUserId'] = String(userId);
    if (this.entityType) params['entityType'] = this.entityType;

    this.http.get<any>(
      `${environment.apiUrl}/eduhub/shops`,
      { headers: this.getApiHeaders(), params }
    ).subscribe({
      next: response => {
        if (requestId !== this.listingsRequestId) return;
        const rawItems = this.extractDirectoryItems(response);
        this.listings = rawItems
          .filter(item => this.isPublished(item))
          .filter(item => this.matchesSelectedCategory(item))
          .map(item => this.mapListing(item));
        this.loading = false;
        this.openSharedListingIfAvailable();
      },
      error: () => {
        if (requestId !== this.listingsRequestId) return;
        this.loading = false;
        this.loadError = 'We couldn’t load nearby listings. Check your connection and try again.';
      }
    });
  }

  private extractDirectoryItems(response: any): EduHubDirectoryResponse[] {
    const candidates = Array.isArray(response)
      ? response
      : response?.content ?? response?.items ?? response?.data?.content ?? response?.data?.items ?? response?.data;
    return Array.isArray(candidates) ? candidates : [];
  }

  private openSharedListingIfAvailable(): void {
    if (this.selectedListingId == null) return;
    const listing = this.listings.find(item => item.id === this.selectedListingId);
    if (!listing) return;
    this.selectedListingId = null;
    if (this.route.snapshot.queryParamMap.get('action') === 'contact') {
      this.requestUnlock(listing);
      return;
    }
    this.openListing(listing);
  }

  private isPublished(item: EduHubDirectoryResponse): boolean {
    // Active is the listing visibility flag. Verification is deliberately not
    // part of this condition: active, unverified stationery shops must be
    // discoverable and simply render without a Verified badge.
    if (item.isActive === true) return true;
    if (item.isActive === false) return false;

    const statuses = [item.status, item.accountStatus]
      .map(value => this.normalize(value))
      .filter(Boolean);
    if (!statuses.length) return true;
    return statuses.every(status => ['active', 'approved', 'published', 'verified', 'enabled'].includes(status));
  }

  private matchesSelectedCategory(item: EduHubDirectoryResponse): boolean {
    if (this.categoryId != null && item.categoryId != null) {
      const itemCategoryId = Number(item.categoryId);
      if (Number.isFinite(itemCategoryId)) {
        return itemCategoryId === this.categoryId;
      }
    }

    const selectedTokens = this.categoryTokens(this.categoryLabel);
    if (!selectedTokens.length) return true;

    const itemCategory = this.normalize([
      item.entityType,
      item.category,
      item.categoryName
    ].filter(Boolean).join(' '));

    return selectedTokens.every(token =>
      this.categoryTokenAlternatives(token).some(candidate => itemCategory.includes(candidate))
    );
  }

  /**
   * The user-facing category is correctly called "Stationery", while the
   * current API uses the legacy entityType spelling "stationary". Treat both
   * forms as the same category so the directory does not show an empty state.
   */
  private categoryTokenAlternatives(token: string): string[] {
    if (token === 'stationery' || token === 'stationary') {
      return ['stationery', 'stationary'];
    }
    return [token];
  }

  private categoryTokens(value: string): string[] {
    const ignored = new Set(['shop', 'shops', 'store', 'stores', 'near', 'you', 'and']);
    return this.normalize(value)
      .split(' ')
      .filter(token => token.length > 1 && !ignored.has(token))
      .map(token => this.singularizeToken(token));
  }

  private singularizeToken(token: string): string {
    if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
    if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) return token.slice(0, -1);
    return token;
  }

  private mapListing(item: EduHubDirectoryResponse): EduHubShopListing {
    const id = Number(item.id);
    const fullAddress = this.firstText(item.exactLocation, item.address);
    const publicLocation = [item.city, item.state]
      .map(value => String(value ?? '').trim())
      .filter(Boolean)
      .join(', ') || this.publicAddressFallback(fullAddress);
    const apiUnlocked = !!(item.unlocked ?? item.isUnlocked);

    return {
      id: Number.isFinite(id) ? id : 0,
      entityType: this.firstText(item.entityType, item.categoryName, item.category),
      name: this.firstText(item.name, item.title) || this.categoryLabel,
      publicLocation,
      fullAddress,
      phone: this.firstText(item.phone),
      email: this.firstText(item.email),
      image: this.firstText(item.imageUrls?.[0], item.imageUrl, item.thumbnailUrl),
      verified: !!item.verified,
      distanceKm: this.toFiniteNumber(item.distanceKm ?? item.distance),
      latitude: this.toFiniteNumber(item.latitude),
      longitude: this.toFiniteNumber(item.longitude),
      unlockCost: Math.max(0, this.toFiniteNumber(item.contactUnlockCost ?? item.unlockCost) ?? 10),
      // Driven purely by the server's per-viewer flag (matches the Tutor/Academy
      // unlock-contact pattern) — no local persistence, so this always reflects
      // the account's real unlock state even across devices/reinstalls.
      unlocked: apiUnlocked,
      champsLiked: Math.max(0, this.toFiniteNumber(item.champsLiked) ?? 0),
      likedBySelf: !!item.likedBySelf
    };
  }

  /** Apply the unlocked listing returned by the API without discarding card data omitted by a response wrapper. */
  private applyUnlockedListing(item: EduHubShopListing, response: any): void {
    const serverItem = response?.data?.listing ?? response?.listing ?? response?.data ?? response;
    if (!serverItem || typeof serverItem !== 'object') return;

    const updated = this.mapListing({
      ...serverItem,
      id: serverItem.id ?? item.id,
      unlocked: true,
      isUnlocked: true
    });

    Object.assign(item, {
      ...updated,
      id: item.id,
      name: updated.name || item.name,
      image: updated.image || item.image,
      publicLocation: updated.publicLocation || item.publicLocation,
      fullAddress: updated.fullAddress || item.fullAddress,
      phone: updated.phone || item.phone,
      email: updated.email || item.email,
      latitude: updated.latitude ?? item.latitude,
      longitude: updated.longitude ?? item.longitude,
      unlocked: true
    });
  }

  private publicAddressFallback(fullAddress: string): string {
    if (!fullAddress) return '';
    const segments = fullAddress.split(',').map(part => part.trim()).filter(Boolean);
    return segments.slice(-2).join(', ');
  }

  private getApiHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });
    if (token) {
      headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    }
    return headers;
  }

  private refreshCoinBalance(): void {
    this.http.get<any>(
      `${environment.apiUrl}/coins/balance`,
      { headers: this.getApiHeaders() }
    ).subscribe({
      next: response => {
        const coins = this.extractCoinBalance(response, this.coinBalance);
        this.coinBalance = coins;
        this.authService.updateUserData({ coins });

        const currentStats = this.userService.getUserStats();
        if (currentStats) {
          this.userService.saveUserStats({ ...currentStats, coins });
        } else {
          // Seed the persistent header state even if Home has not loaded its
          // stats cache yet; the API refresh keeps streaks and badges current.
          this.userService.refreshStats().subscribe();
        }
      }
    });
  }

  private loadStoredCoinBalance(): void {
    const user = this.authService.getUserData() ?? {};
    this.coinBalance = this.extractCoinBalance(user, 0);
  }

  private extractCoinBalance(source: any, fallback: number): number {
    const candidates = [
      source?.balance,
      source?.coinBalance,
      source?.coins,
      source?.totalCoins,
      source?.availableCoins,
      source?.data?.balance,
      source?.data?.coins,
      source?.wallet?.balance
    ];
    const value = candidates
      .map(candidate => Number(candidate))
      .find(candidate => Number.isFinite(candidate));
    return Math.max(0, value ?? fallback);
  }

  private buildTelephoneUrl(phone: string): string | null {
    const normalized = phone.replace(/(?!^\+)[^\d]/g, '');
    return normalized.replace(/\D/g, '').length >= 7 ? `tel:${normalized}` : null;
  }

  private buildEmailUrl(email: string, name: string): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    const subject = `SuperMe enquiry for ${name}`;
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}`;
  }

  private async openExternalUrl(url: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await AppLauncher.openUrl({ url });
        if (result.completed) return;
      } catch {
        // Continue to the browser/system URL fallback below.
      }
    }
    window.location.assign(url);
  }

  private extractApiError(error: HttpErrorResponse, fallback: string): string {
    const message = error?.error?.message ?? error?.error?.error ?? error?.message;
    return typeof message === 'string' && message.trim() ? message.trim() : fallback;
  }

  private isShareCancelled(error: unknown): boolean {
    const message = String((error as any)?.message ?? error ?? '').toLowerCase();
    return message.includes('cancel') || message.includes('dismiss');
  }

  private firstText(...values: Array<string | null | undefined>): string {
    const match = values.find(value => typeof value === 'string' && value.trim().length > 0);
    return match?.trim() ?? '';
  }

  private toFiniteNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

}
