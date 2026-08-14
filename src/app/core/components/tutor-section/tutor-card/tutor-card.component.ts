import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from "@ionic/angular";
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { TutorService } from '../../../services/tutor.service';
import { Tutor, TutorListItem } from '../../../models/tutor.model';
import { Subscription } from 'rxjs';
import { TutorLikeService } from '../../../services/tutor-like.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../../environments/environment';

type CategoryKey =
  | 'tutors'
  | 'academies'
  | 'workshops'
  | 'events'
  | 'stationery'
  | 'book-stores'
  | 'counselors'
  | 'second-hand-books'
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
}

interface EduHubPreview {
  id: string | number;
  name: string;
  description: string;
  image: string;
  fee: number | null;
  location: string;
}

@Component({
  selector: 'tutor-card',
  templateUrl: './tutor-card.component.html',
  styleUrls: ['./tutor-card.component.scss'],
  imports: [CommonModule, IonicModule],
  standalone: true
})
export class TutorCardComponent implements OnInit, OnDestroy {
  @Input() maxTutors: number = 4; // Max tutors to show in card view

  tutors: TutorListItem[] = [];
  listingCount = 0;
  isLoading = false;

  readonly listingVerifiedAsset = 'assets/figma/eduhub-home/listing-verified.png';
  readonly profileVerifiedAsset = 'assets/figma/eduhub-home/profile-verified.png';
  readonly favoriteAsset = 'assets/figma/eduhub-home/favorite.svg';
  readonly onlineModeAsset = 'assets/figma/eduhub-home/online-mode.svg';

  readonly categories: EduHubCategory[] = [
    { key: 'tutors', label: 'Tutors', image: 'assets/figma/eduhub-home/category-tutors.png', route: '/authed/tutors' },
    { key: 'academies', label: 'Academies', image: 'assets/figma/eduhub-home/category-academies.png', route: '/authed/academies' },
    { key: 'workshops', label: 'Workshops', image: 'assets/figma/eduhub-home/category-workshops.png', route: '/authed/education' },
    { key: 'events', label: 'Events', image: 'assets/figma/eduhub-home/category-events.png', route: '/authed/education' },
    { key: 'stationery', label: 'Stationery Shops', image: 'assets/figma/eduhub-home/category-stationery.png', route: '/authed/school-store' },
    { key: 'book-stores', label: 'Book Stores', image: 'assets/figma/eduhub-home/category-book-stores.png', route: '/authed/school-store' },
    { key: 'counselors', label: 'Counselors', image: 'assets/figma/eduhub-home/category-counselors.png', route: '/authed/counselors' },
    { key: 'second-hand-books', label: 'Second-Hand Books', image: 'assets/figma/eduhub-home/category-second-hand-books.png', route: '/authed/second-hand-books' },
    { key: 'sports-shops', label: 'Sports Shops', image: 'assets/figma/eduhub-home/category-sports-shops.png', route: '/authed/school-store' }
  ];

  selectedCategoryKey: CategoryKey = 'tutors';

  // Academies are the same underlying entity as tutors (entityType:
  // 'ACADEMY' on /tutors/overview), just a different filter on the same
  // directory — not the unrelated in-app "Skills Quest" learning feed.
  // Lazily loaded the first time that category is selected.
  academyTutors: TutorListItem[] = [];
  academyTotalCount = 0;
  private academyProfiles = new Map<number, Tutor>();
  private academyLoaded = false;
  private academyLoading = false;

  private readonly externalCategorySources: Partial<Record<CategoryKey, { endpoint: 'events' | 'shops' | 'tutors'; entityType: string }>> = {
    workshops: { endpoint: 'events', entityType: 'Workshop' },
    events: { endpoint: 'events', entityType: 'Events' },
    'book-stores': { endpoint: 'shops', entityType: 'Bookstore' },
    stationery: { endpoint: 'shops', entityType: 'stationary' },
    'sports-shops': { endpoint: 'shops', entityType: 'sports shop' },
    counselors: { endpoint: 'tutors', entityType: 'COUNSELOR' }
  };
  private readonly externalPreviews = new Map<CategoryKey, EduHubPreview[]>();
  private readonly externalCounts = new Map<CategoryKey, number>();
  private readonly externalLoading = new Set<CategoryKey>();

  private subscriptions = new Subscription();
  private likeSubscriptions = new Map<string, Subscription>();

  constructor(
    private router: Router,
    private tutorService: TutorService,
    private likeService: TutorLikeService,
    private authService: AuthService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadTutors();
    this.preloadExternalCategories();
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
    return this.tutors.slice(0, this.maxTutors);
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
    return (this.externalPreviews.get(this.selectedCategoryKey) || []).slice(0, this.maxTutors);
  }

  get isExternalCategoryLoading(): boolean {
    return this.externalLoading.has(this.selectedCategoryKey);
  }

  /** Keep the category CTA available whenever the selected preview has data. */
  get showViewAll(): boolean {
    if (this.isLoading) return false;
    if (this.selectedCategoryKey === 'tutors') return this.visibleTutors.length > 0;
    if (this.selectedCategoryKey === 'academies') return this.academyTutors.length > 0;
    if (this.isExternalCategory(this.selectedCategoryKey)) return this.visibleExternalPreviews.length > 0;
    return true;
  }

  /**
   * Switch the visible category. Filters in place — never navigates away.
   * Each category's data is fetched at most once and cached thereafter, so
   * repeated taps never trigger duplicate API calls.
   */
  selectCategory(category: EduHubCategory): void {
    if (this.selectedCategoryKey === category.key) return;

    // These categories have dedicated EduHub flows. Opening an inline preview
    // here made the card feel unresponsive and prevented users from reaching
    // the required entry screen.
    if (category.key === 'counselors' || category.key === 'second-hand-books') {
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
    // Workshops / Events / Stationery: no backend source yet — the template
    // shows an empty state for them instead of hardcoded placeholder data.
  }

  private preloadExternalCategories(): void {
    (Object.keys(this.externalCategorySources) as CategoryKey[])
      .forEach(categoryKey => this.loadExternalCategory(categoryKey));
  }

  private isExternalCategory(categoryKey: CategoryKey): boolean {
    return !!this.externalCategorySources[categoryKey];
  }

  private loadExternalCategory(categoryKey: CategoryKey): void {
    const source = this.externalCategorySources[categoryKey];
    if (!source || this.externalLoading.has(categoryKey) || this.externalPreviews.has(categoryKey)) return;

    this.externalLoading.add(categoryKey);
    const baseUrl = this.getUserFacingApiBaseUrl();
    const endpointUrl = source.endpoint === 'tutors'
      ? `${baseUrl}/tutors`
      : `${baseUrl}/eduhub/${source.endpoint}`;
    let params = new HttpParams().set('entityType', source.entityType);
    if (source.endpoint !== 'tutors') {
      params = params.set('page', '0').set('size', '20');
    }
    this.subscriptions.add(
      this.http.get<any>(endpointUrl, {
        headers: this.academyHeaders(),
        params
      }).subscribe({
        next: response => {
          const rawItems = this.extractDirectoryItems(response);
          const fallbackImage = this.categories.find(category => category.key === categoryKey)?.image || '';
          const previews = rawItems.map(item => this.mapExternalPreview(item, fallbackImage));
          this.externalPreviews.set(categoryKey, previews);
          this.externalCounts.set(categoryKey, Number(response?.totalElements ?? response?.data?.totalElements ?? previews.length));
          this.externalLoading.delete(categoryKey);
        },
        error: () => {
          this.externalPreviews.set(categoryKey, []);
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

  /**
   * Use the local backend only for an Angular browser dev server. Capacitor
   * builds continue using the configured secure API URL.
   */
  private getUserFacingApiBaseUrl(): string {
    const isBrowserLocalDev = typeof window !== 'undefined'
      && ['localhost', '127.0.0.1'].includes(window.location.hostname)
      && window.location.port === '4200';
    return isBrowserLocalDev ? 'http://localhost:8080/v1' : environment.apiUrl;
  }

  private mapExternalPreview(item: EduHubDirectoryItem, fallbackImage: string): EduHubPreview {
    const fee = Number(item?.fee ?? item?.hourlyRate);
    return {
      id: item?.id ?? `${item?.name || item?.title || 'listing'}-${item?.city || ''}`,
      name: String(item?.name || item?.title || 'EduHub listing').trim(),
      description: String(item?.bio || item?.description || item?.headline || [item?.city, item?.state].filter(Boolean).join(', ') || 'EduHub listing').trim(),
      image: item?.imageUrls?.[0] || item?.imageUrl || item?.thumbnailUrl || item?.profilePicUrl || item?.avatar || fallbackImage,
      fee: Number.isFinite(fee) ? fee : null,
      location: [item?.city, item?.state].filter(Boolean).join(', ') || String(item?.address || '').trim()
    };
  }

  /**
   * Load recent tutors from service
   */
  private loadTutors(): void {
    this.isLoading = true;

    // Subscribe to loading state
    this.subscriptions.add(
      this.tutorService.isLoading$.subscribe(loading => {
        if (this.selectedCategoryKey === 'tutors') this.isLoading = loading;
      })
    );

    // Fetch tutors if not already loaded
    if (!this.tutorService.isLoaded) {
      this.subscriptions.add(
        this.tutorService.fetchTutors().subscribe()
      );
    }

    // Subscribe to recent tutors
    this.subscriptions.add(
      this.tutorService.getRecentTutors(this.maxTutors).subscribe(tutors => {
        this.tutors = tutors;
        this.syncLikeStates();
        if (this.selectedCategoryKey === 'tutors') this.isLoading = false;
      })
    );

    this.subscriptions.add(
      this.tutorService.allTutors$.subscribe(tutors => {
        this.listingCount = tutors.length;
      })
    );
  }

  private academyHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const authValue = token
      ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`)
      : (environment.apiAuthToken?.startsWith('Bearer ') ? environment.apiAuthToken : `Bearer ${environment.apiAuthToken ?? ''}`);

    return new HttpHeaders({
      'Authorization': authValue,
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });
  }

  private loadAcademies(): void {
    this.academyLoading = true;
    this.isLoading = true;

    this.subscriptions.add(
      this.http.get<any>(`${environment.apiUrl}/tutors/overview`, {
        headers: this.academyHeaders(),
        params: { entityType: 'ACADEMY' }
      }).subscribe({
        next: (res) => {
          const raw = Array.isArray(res)
            ? res
            : (res?.data?.tutors ?? res?.tutors ?? res?.content ?? []);

          this.academyProfiles.clear();
          const mapped: TutorListItem[] = (Array.isArray(raw) ? raw : []).map((a: any) => {
            const { listItem, profile } = this.mapAcademy(a);
            if (listItem.id != null) this.academyProfiles.set(Number(listItem.id), profile);
            return listItem;
          });

          this.academyTutors = mapped.slice(0, this.maxTutors);
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
      fees
    } as unknown as Tutor;

    const listItem: TutorListItem = {
      id: a?.id,
      name,
      avatar: image,
      description: subjects.length ? subjects.join(', ') : (a?.headline || 'Academy'),
      rating: Number(a?.rating ?? 0),
      champsLiked: Number(a?.champsLiked ?? 0),
      likedByUser: !!(a?.likedByUser ?? a?.liked),
      isVerified: !!(a?.isVerified ?? a?.verified),
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
    if (this.selectedCategoryKey === 'tutors') {
      this.router.navigateByUrl('/authed/tutors');
      return;
    }
    this.router.navigateByUrl(this.selectedCategory.route);
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

  onViewAcademyProfile(item: TutorListItem): void {
    const profile = this.academyProfiles.get(Number(item.id));
    void this.router.navigate(['/authed/tutors', item.id], {
      state: profile ? { tutor: profile } : undefined
    });
  }

}
