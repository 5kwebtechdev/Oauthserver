import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Share } from '@capacitor/share';
import { InfiniteScrollCustomEvent, IonicModule } from '@ionic/angular';
import { Subscription, distinctUntilChanged, skip } from 'rxjs';

import { AdBannerComponent, AdScreen } from '../../ad-banner/ad-banner.component';
import { FooterComponent } from '../../footer/footer.component';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';
import { EduHubCitySelectorComponent } from '../eduhub-city-selector/eduhub-city-selector.component';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';
import { AuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';
import { PetAgeService } from '../../../services/pet-age.service';
import { EduHubCityService } from '../../../services/eduhub-city.service';
import {
  EduHubEventEntityType,
  EduHubEventItem,
  EduHubEventsService
} from '../../../services/eduhub-events.service';

type ListingFilter = 'verified' | 'all';

interface EventListingRouteData {
  entityType?: EduHubEventEntityType;
  title?: string;
}

@Component({
  selector: 'app-eduhub-events',
  standalone: true,
  imports: [CommonModule, IonicModule, AdBannerComponent, FooterComponent, SupermePetComponent, EduHubCitySelectorComponent, ProfileImageComponent],
  templateUrl: './eduhub-events.component.html',
  styleUrls: ['./eduhub-events.component.scss']
})
export class EduHubEventsComponent implements OnInit, OnDestroy {
  readonly loadingCards = [0, 1, 2];

  entityType: EduHubEventEntityType = 'Events';
  title = 'Events';
  items: EduHubEventItem[] = [];
  isLoading = true;
  isLoadingMore = false;
  errorMessage = '';
  paginationError = '';
  page = 0;
  totalPages = 0;
  totalElements = 0;
  searchOpen = false;
  searchQuery = '';
  filterOpen = false;
  // Active listings are the default catalogue. Verification is an optional
  // trust signal and must not hide an otherwise active event/workshop.
  activeFilter: ListingFilter = 'all';

  private readonly pageSize = 20;
  private readonly likeInProgress = new Set<number>();
  private readonly subscriptions = new Subscription();
  private requestVersion = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly location: Location,
    private readonly eventsService: EduHubEventsService,
    private readonly authService: AuthService,
    private readonly core: CoreService,
    private readonly petAgeService: PetAgeService,
    private readonly cityService: EduHubCityService
  ) {}

  /** Panda uses the same Figma artwork shown on Home/Coins/Learning instead of this page's decorative mascot. */
  get isPandaPet(): boolean {
    return this.petAgeService.getCurrentPetType() === 'panda';
  }

  ngOnInit(): void {
    const data = this.route.snapshot.data as EventListingRouteData;
    this.entityType = data.entityType === 'Workshop' ? 'Workshop' : 'Events';
    this.title = data.title === 'Workshops' ? 'Workshops' : 'Events';
    const navigationCity = String(this.route.snapshot.queryParamMap.get('city') || '').trim();
    if (navigationCity) this.cityService.selectCity(navigationCity);
    this.loadFirstPage();
    this.subscriptions.add(this.cityService.city$.pipe(
      distinctUntilChanged(),
      skip(1)
    ).subscribe(() => this.loadFirstPage()));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get sectionTitle(): string {
    return `${this.title} Near You`;
  }

  get singularTitle(): string {
    return this.entityType === 'Workshop' ? 'workshop' : 'event';
  }

  get activeFilterLabel(): string {
    return this.activeFilter === 'verified' ? 'Verified' : 'All';
  }

  get canLoadMore(): boolean {
    return this.totalPages > 0 && this.page + 1 < this.totalPages;
  }

  get visibleItems(): EduHubEventItem[] {
    const query = this.normalise(this.searchQuery);
    const city = this.normalise(this.cityService.city);
    return this.items.filter(item => {
      const matchesQuery = !query || this.normalise([
        item.name,
        item.title,
        item.venue,
        item.organizer,
        item.address,
        item.city,
        item.state,
        item.categoryName
      ].join(' ')).includes(query);
      const matchesFilter = this.activeFilter !== 'verified' || !!item.verified;
      const matchesCity = !city || this.normalise([item.city, item.address, item.venue].join(' ')).includes(city);
      return matchesQuery && matchesFilter && matchesCity;
    });
  }

  get eduAdScreen(): AdScreen {
    return this.authService.isParentUser() ? 'EDUHUB_PARENTS' : 'EDUHUB';
  }

  @HostListener('document:click')
  closeFilterMenu(): void {
    this.filterOpen = false;
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

  toggleFilter(event: Event): void {
    event.stopPropagation();
    this.filterOpen = !this.filterOpen;
  }

  selectFilter(filter: ListingFilter, event: Event): void {
    event.stopPropagation();
    this.activeFilter = filter;
    this.filterOpen = false;
  }

  retry(): void {
    this.loadFirstPage();
  }

  loadFirstPage(): void {
    const requestVersion = ++this.requestVersion;
    this.isLoading = true;
    this.errorMessage = '';
    this.paginationError = '';
    this.items = [];
    this.page = 0;
    this.totalPages = 0;
    this.totalElements = 0;

    this.eventsService.getPage(this.entityType, 0, this.pageSize, this.cityService.city).subscribe({
      next: response => {
        if (requestVersion !== this.requestVersion) return;
        this.items = this.normaliseItems(response.content);
        this.page = this.safePage(response.page, 0);
        this.totalPages = this.safePage(response.totalPages, 0);
        this.totalElements = this.safePage(response.totalElements, this.items.length);
        this.isLoading = false;
      },
      error: () => {
        if (requestVersion !== this.requestVersion) return;
        this.isLoading = false;
        this.errorMessage = `We couldn’t load ${this.title.toLowerCase()} right now. Check your connection and try again.`;
      }
    });
  }

  async loadNextPage(event?: InfiniteScrollCustomEvent): Promise<void> {
    if (this.isLoading || this.isLoadingMore || !this.canLoadMore) {
      event?.target.complete();
      return;
    }

    const nextPage = this.page + 1;
    this.isLoadingMore = true;
    this.paginationError = '';

    this.eventsService.getPage(this.entityType, nextPage, this.pageSize, this.cityService.city).subscribe({
      next: response => {
        const incoming = this.normaliseItems(response.content)
          .filter(item => !this.items.some(current => current.id === item.id));
        this.items = [...this.items, ...incoming];
        this.page = this.safePage(response.page, nextPage);
        this.totalPages = this.safePage(response.totalPages, this.totalPages);
        this.totalElements = this.safePage(response.totalElements, this.totalElements);
        this.isLoadingMore = false;
        event?.target.complete();
      },
      error: () => {
        this.isLoadingMore = false;
        this.paginationError = 'Couldn’t load more listings.';
        event?.target.complete();
      }
    });
  }

  retryPagination(): void {
    void this.loadNextPage();
  }

  getImage(item: EduHubEventItem): string {
    return (item.imageUrls ?? []).find(url => typeof url === 'string' && url.trim())?.trim() ?? '';
  }

  getDisplayName(item: EduHubEventItem): string {
    return this.firstText(item.title, item.name) || `${this.singularTitle[0].toUpperCase()}${this.singularTitle.slice(1)}`;
  }

  getEventMeta(item: EduHubEventItem): string {
    const schedule = this.getScheduleLabel(item);
    // Venue/address is protected contact information. The API may include it
    // in the catalogue response, but it must not be exposed before unlock.
    const venue = item.unlocked ? this.firstText(item.exactLocation, item.address, item.venue) : '';
    const organizer = this.firstText(item.organizer);
    return [schedule, venue, organizer ? `By ${organizer}` : ''].filter(Boolean).join(' • ');
  }

  onImageError(item: EduHubEventItem): void {
    item.imageUrls = [];
  }

  getLocation(item: EduHubEventItem): string {
    const cityAndState = [item.city, item.state]
      .map(value => String(value ?? '').trim())
      .filter(Boolean)
      .join(', ');
    // Never fall back to the exact address for a locked landing-page card.
    // City/state are the public discovery location; the complete venue is
    // revealed on the details page only after a successful unlock.
    if (!item.unlocked) return cityAndState;
    return cityAndState || this.firstText(item.exactLocation, item.address, item.venue);
  }

  getFeeLabel(item: EduHubEventItem): string {
    if (item.isFree) return 'FREE';
    const fee = Number(item.fee);
    if (!Number.isFinite(fee)) return '';
    if (fee === 0) return 'FREE';
    return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(fee)}`;
  }

  isFavourite(item: EduHubEventItem): boolean {
    return !!item.likedBySelf;
  }

  toggleFavourite(item: EduHubEventItem): void {
    if (this.likeInProgress.has(item.id)) return;

    const nextLiked = !item.likedBySelf;
    const previousLiked = item.likedBySelf;
    const previousCount = item.champsLiked;

    // Optimistic update so the heart responds instantly.
    item.likedBySelf = nextLiked;
    item.champsLiked = Math.max(0, (Number(item.champsLiked) || 0) + (nextLiked ? 1 : -1));
    this.likeInProgress.add(item.id);

    this.eventsService.toggleLike(item.id, nextLiked).subscribe({
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

  openDetails(item: EduHubEventItem): void {
    this.saveItemForDetails(item);
    void this.router.navigate(['/education', this.routeSegment, item.id], {
      state: { listing: item, entityType: this.entityType, title: this.title }
    });
  }

  async shareItem(item: EduHubEventItem): Promise<void> {
    const location = this.getLocation(item);
    const name = this.getDisplayName(item);
    try {
      await Share.share({
        title: name,
        text: `View ${name}${location ? ` in ${location}` : ''} on SuperMe EduHub.`,
        url: window.location.href
      });
    } catch (error) {
      if (!this.isShareCancelled(error)) {
        this.core.triggerToasrt('Unable to share this listing. Please try again.', 'error');
      }
    }
  }

  async referForListing(): Promise<void> {
    try {
      await Share.share({
        title: 'Refer for listing',
        text: `Know an ${this.singularTitle} organizer? Refer them to get listed on SuperMe EduHub.`,
        url: 'https://supermeapp.com'
      });
    } catch (error) {
      if (!this.isShareCancelled(error)) {
        this.core.triggerToasrt('Unable to open sharing right now. Please try again.', 'error');
      }
    }
  }

  trackItem(_: number, item: EduHubEventItem): number {
    return item.id;
  }

  private get routeSegment(): string {
    return this.entityType === 'Workshop' ? 'workshops' : 'events';
  }

  private normaliseItems(items: EduHubEventItem[] | null | undefined): EduHubEventItem[] {
    return Array.isArray(items)
      ? items.filter(item =>
          item
          && Number.isFinite(Number(item.id))
          && this.isActiveListing(item)
        )
      : [];
  }

  private isActiveListing(item: EduHubEventItem): boolean {
    // The explicit activity flag takes precedence when the API supplies it.
    // Verification never decides whether an event/workshop is discoverable.
    if (item.isActive === true) return true;
    if (item.isActive === false) return false;

    const accountStatus = this.normalise(item.accountStatus);
    if (accountStatus) return accountStatus === 'active';

    // Backward compatibility for older responses that did not yet expose
    // accountStatus but used the listing status field for the same state.
    return this.normalise(item.status) === 'active';
  }

  private safePage(value: number | null | undefined, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
  }

  private getScheduleLabel(item: EduHubEventItem): string {
    const start = this.formatDate(item.startDt);
    const end = this.formatDate(item.endDt);
    return start && end && start !== end ? `${start} – ${end}` : start || end;
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  private firstText(...values: Array<string | null | undefined>): string {
    return values.map(value => String(value ?? '').trim()).find(Boolean) ?? '';
  }

  private normalise(value: unknown): string {
    return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private saveItemForDetails(item: EduHubEventItem): void {
    try {
      sessionStorage.setItem(
        `superme_eduhub_${this.entityType.toLowerCase()}_${item.id}`,
        JSON.stringify(item)
      );
    } catch {
      // Router state still carries the listing during the normal navigation flow.
    }
  }

  private isShareCancelled(error: unknown): boolean {
    const message = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
    return message.includes('cancel') || message.includes('dismiss');
  }
}
