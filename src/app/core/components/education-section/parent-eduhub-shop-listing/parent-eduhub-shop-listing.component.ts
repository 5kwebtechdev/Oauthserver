import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';
import { UserService } from '../../../services/user.service';
import { AdBannerComponent } from '../../ad-banner/ad-banner.component';
import { FooterComponent } from '../../footer/footer.component';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';

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
}

@Component({
  selector: 'app-parent-eduhub-shop-listing',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    AdBannerComponent,
    FooterComponent,
    SupermePetComponent
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
  private favourites = new Set<number>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly location: Location,
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly core: CoreService,
    private readonly userService: UserService
  ) {}

  ngOnInit(): void {
    this.restoreFavourites();
    this.loadStoredCoinBalance();

    this.subscriptions.add(
      this.route.queryParamMap.subscribe(params => {
        const rawCategoryId = Number(params.get('category'));
        this.categoryId = Number.isFinite(rawCategoryId) && rawCategoryId > 0
          ? rawCategoryId
          : null;

        const navigationLabel = String(
          history.state?.categoryLabel ?? params.get('label') ?? ''
        ).trim();

        if (navigationLabel) {
          this.categoryLabel = navigationLabel;
          this.loadListings();
        } else {
          this.resolveCategoryLabel();
        }
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
    const filtered = query
      ? this.listings.filter(item => this.normalize([
          item.name,
          item.publicLocation,
          item.fullAddress,
          item.entityType
        ].join(' ')).includes(query))
      : [...this.listings];

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
    if (this.favourites.has(item.id)) {
      this.favourites.delete(item.id);
    } else {
      this.favourites.add(item.id);
    }
    this.persistFavourites();
  }

  isFavourite(item: EduHubShopListing): boolean {
    return this.favourites.has(item.id);
  }

  async shareListing(item: EduHubShopListing): Promise<void> {
    const location = item.publicLocation ? ` in ${item.publicLocation}` : '';
    try {
      await Share.share({
        title: item.name,
        text: `View ${item.name}${location} on SuperMe EduHub.`,
        url: this.currentShareUrl()
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
    const params = new HttpParams()
      .set('userId', String(userId))
      .set('id', String(item.id));

    this.http.post<any>(
      `${environment.apiUrl}/eduhub/unlock-contact`,
      null,
      { headers: this.getApiHeaders(), params }
    ).subscribe({
      next: response => {
        this.applyUnlockedListing(item, response);
        item.unlocked = true;
        this.persistUnlockedItem(item.id);
        this.unlockRequestInProgress = false;
        this.unlockItem = null;
        document.body.style.overflow = '';
        this.refreshCoinBalance();
        this.core.triggerToasrt('Contact details unlocked successfully.', 'success');
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

    this.http.get<any>(
      `${environment.apiUrl}/eduhub`,
      { headers: this.getApiHeaders() }
    ).subscribe({
      next: response => {
        if (requestId !== this.listingsRequestId) return;
        const rawItems = this.extractDirectoryItems(response);
        this.listings = rawItems
          .filter(item => this.isPublished(item))
          .filter(item => this.matchesSelectedCategory(item))
          .map(item => this.mapListing(item));
        this.loading = false;
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

  private isPublished(item: EduHubDirectoryResponse): boolean {
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
      unlocked: apiUnlocked || this.isItemPersistedAsUnlocked(Number(item.id))
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

  private currentShareUrl(): string {
    return typeof window !== 'undefined' ? window.location.href : 'https://supermeapp.com';
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

  private favouritesStorageKey(): string {
    return `superme_eduhub_favourites_${this.authService.getUserId() ?? 'anonymous'}`;
  }

  private restoreFavourites(): void {
    try {
      const raw = JSON.parse(localStorage.getItem(this.favouritesStorageKey()) ?? '[]');
      this.favourites = new Set(
        (Array.isArray(raw) ? raw : []).map(value => Number(value)).filter(Number.isFinite)
      );
    } catch {
      this.favourites = new Set<number>();
    }
  }

  private persistFavourites(): void {
    localStorage.setItem(this.favouritesStorageKey(), JSON.stringify([...this.favourites]));
  }

  private unlocksStorageKey(): string {
    return `superme_eduhub_unlocks_${this.authService.getUserId() ?? 'anonymous'}`;
  }

  private isItemPersistedAsUnlocked(itemId: number): boolean {
    try {
      const raw = JSON.parse(localStorage.getItem(this.unlocksStorageKey()) ?? '[]');
      return Array.isArray(raw) && raw.map(Number).includes(itemId);
    } catch {
      return false;
    }
  }

  private persistUnlockedItem(itemId: number): void {
    try {
      const raw = JSON.parse(localStorage.getItem(this.unlocksStorageKey()) ?? '[]');
      const ids = new Set<number>(
        (Array.isArray(raw) ? raw : []).map(value => Number(value)).filter(Number.isFinite)
      );
      ids.add(itemId);
      localStorage.setItem(this.unlocksStorageKey(), JSON.stringify([...ids]));
    } catch {
      localStorage.setItem(this.unlocksStorageKey(), JSON.stringify([itemId]));
    }
  }
}
