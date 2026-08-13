import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Share } from '@capacitor/share';
import { InfiniteScrollCustomEvent, IonicModule } from '@ionic/angular';

import { AdBannerComponent, AdScreen } from '../../ad-banner/ad-banner.component';
import { FooterComponent } from '../../footer/footer.component';
import { AuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';
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
  imports: [CommonModule, IonicModule, AdBannerComponent, FooterComponent],
  templateUrl: './eduhub-events.component.html',
  styleUrls: ['./eduhub-events.component.scss']
})
export class EduHubEventsComponent implements OnInit {
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
  activeFilter: ListingFilter = 'verified';

  private readonly pageSize = 20;
  private readonly favourites = new Set<number>();
  private requestVersion = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly location: Location,
    private readonly eventsService: EduHubEventsService,
    private readonly authService: AuthService,
    private readonly core: CoreService
  ) {}

  ngOnInit(): void {
    const data = this.route.snapshot.data as EventListingRouteData;
    this.entityType = data.entityType === 'Workshop' ? 'Workshop' : 'Events';
    this.title = data.title === 'Workshops' ? 'Workshops' : 'Events';
    this.restoreFavourites();
    this.loadFirstPage();
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
    return this.items.filter(item => {
      const matchesQuery = !query || this.normalise([
        item.name,
        item.address,
        item.city,
        item.state,
        item.categoryName
      ].join(' ')).includes(query);
      const matchesFilter = this.activeFilter !== 'verified' || !!item.verified;
      return matchesQuery && matchesFilter;
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

    this.eventsService.getPage(this.entityType, 0, this.pageSize).subscribe({
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

    this.eventsService.getPage(this.entityType, nextPage, this.pageSize).subscribe({
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

  onImageError(item: EduHubEventItem): void {
    item.imageUrls = [];
  }

  getLocation(item: EduHubEventItem): string {
    const cityAndState = [item.city, item.state]
      .map(value => String(value ?? '').trim())
      .filter(Boolean)
      .join(', ');
    return cityAndState || String(item.address ?? '').trim();
  }

  getFeeLabel(item: EduHubEventItem): string {
    const fee = Number(item.fee);
    if (!Number.isFinite(fee)) return '';
    if (fee === 0) return 'FREE';
    return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(fee)}`;
  }

  isFavourite(item: EduHubEventItem): boolean {
    return this.favourites.has(item.id);
  }

  toggleFavourite(item: EduHubEventItem): void {
    if (this.isFavourite(item)) {
      this.favourites.delete(item.id);
    } else {
      this.favourites.add(item.id);
    }
    this.persistFavourites();
  }

  openDetails(item: EduHubEventItem): void {
    this.saveItemForDetails(item);
    void this.router.navigate(['/authed/education', this.routeSegment, item.id], {
      state: { listing: item, entityType: this.entityType, title: this.title }
    });
  }

  async shareItem(item: EduHubEventItem): Promise<void> {
    const location = this.getLocation(item);
    try {
      await Share.share({
        title: item.name,
        text: `View ${item.name}${location ? ` in ${location}` : ''} on SuperMe EduHub.`,
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
      ? items.filter(item => item && Number.isFinite(Number(item.id)))
      : [];
  }

  private safePage(value: number | null | undefined, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
  }

  private normalise(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private favouritesKey(): string {
    return `superme_eduhub_${this.entityType.toLowerCase()}_favourites_${this.authService.getUserId() ?? 'guest'}`;
  }

  private restoreFavourites(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(this.favouritesKey()) ?? '[]');
      if (Array.isArray(saved)) {
        saved.forEach(id => {
          const numericId = Number(id);
          if (Number.isFinite(numericId)) this.favourites.add(numericId);
        });
      }
    } catch {
      this.favourites.clear();
    }
  }

  private persistFavourites(): void {
    try {
      localStorage.setItem(this.favouritesKey(), JSON.stringify([...this.favourites]));
    } catch {
      // Local favourites are a convenience only; the listing remains usable.
    }
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
