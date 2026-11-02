import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PublicNavbarComponent } from '../../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../components/common-footer/common-footer.component';
import { FilterPanelComponent } from '../../../components/filter-panel/filter-panel.component';
import { environment } from '../../../../../environments/environment';
import { AdSliderComponent } from '../../../../core/components/ad-slider/ad-slider.component';
import { AuthService } from '../../../../core/services/auth.service';
import { DiscoveryPreviewComponent } from './discovery-preview.component';
import { EduhubInitialsComponent } from '../../../components/eduhub-initials/eduhub-initials.component';
import { eduHubProfileFrame } from '../../../components/eduhub-initials/eduhub-profile-frame';

interface TutorCard {
  previewSummary: string;
  previewLocation: string;
  previewExperience: string;
  previewDate: string;
  id: string;
  name: string;
  subjects: string;
  classes: string;
  schedule: string;
  rating: string;
  experience: string;
  rate: string;
  avatar: string;
  profileEnabled: boolean;
}

interface TutorApiRecord {
  id: number;
  name: string;
  subjects?: string[];
  classes?: string[];
  levels?: string[];
  availability?: string[];
  startTime?: string;
  endTime?: string;
  rating?: number | null;
  experience?: string;
  fees?: number | null;
  profilePicUrl?: string;
  headline?: string;
  description?: string;
  categoryName?: string;
  location?: string;
  address?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  title?: string;
  venue?: string;
  startDt?: string;
  endDt?: string;
  fee?: number | null;
  imageUrls?: string[];
  imageUrl?: string;
  thumbnailUrl?: string;
  champsLiked?: number;
  createdAt?: string;
  bookType?: string;
  condition?: string;
  bookClass?: string;
  board?: string;
  subject?: string;
  degreeStream?: string;
  year?: string;
  targetExam?: string;
  genre?: string;
  authorPublisher?: string;
  sellingPrice?: number | null;
}

interface PublicDirectoryResponse { content?: TutorApiRecord[]; data?: TutorApiRecord[]; }

interface PublicDirectoryConfig {
  endpoint: string;
  title: string;
  singular: string;
  plural: string;
  intro: string;
  profileEnabled?: boolean;
  rateSuffix?: string;
}

type SortOption = 'alphabets' | 'most-liked' | 'experience' | 'recently-added';

const APPLE_PATH =
  'M15.7899 12.685C15.7899 10.7072 16.8313 8.98188 18.3763 8.0681C17.5695 7.04054 16.356 6.11965 15.0182 5.84943C13.194 5.48054 12.1534 6.09476 11.4803 6.34099C10.8071 6.58721 9.91301 6.80854 9.91301 6.80854C9.91301 6.80854 9.01975 6.58721 8.34574 6.34099C7.67344 6.09476 6.63287 5.47965 4.80867 5.84854C2.98446 6.21743 1.39149 7.79699 0.744027 9.20499C-0.504654 11.9223 0.00920651 15.341 0.891334 17.7997C1.77261 20.2592 4.10296 23.6957 5.91004 23.9721C7.19555 24.1685 7.99118 23.2468 9.91301 23.013C11.8349 23.2468 12.6305 24.1685 13.916 23.9721C15.7231 23.6957 18.0534 20.2592 18.9347 17.7997C18.9561 17.7392 18.9784 17.677 18.9998 17.6148C17.1182 16.8308 15.7899 14.9188 15.7899 12.685ZM9.45654 5.39965C9.45654 5.39965 11.2439 5.64588 12.8669 3.73299C14.4898 1.8201 14.0282 0.0103203 14.0282 0.0103203C14.0282 0.0103203 12.2408 -0.235902 10.6179 1.67699C8.99492 3.58988 9.45654 5.39965 9.45654 5.39965Z';

const DAY_ABBREVIATIONS: Record<string, string> = {
  SUNDAY: 'Sun',
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
};

@Component({
  selector: 'app-find-tutor-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicNavbarComponent, CommonFooterComponent, FilterPanelComponent, AdSliderComponent, DiscoveryPreviewComponent, EduhubInitialsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page.component.html',
})
export class FindTutorPageComponent implements OnInit, OnDestroy {
  private readonly onDocClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if (!target.closest('.sort-dropdown-wrapper')) {
      this.sortDropdownOpen = false;
      this.cdr.markForCheck();
    }
  };
  filterPanelOpen = false;
  sortDropdownOpen = false;
  selectedSort: SortOption = 'recently-added';
  isLoading = true;
  loadError = false;
  tutors: TutorCard[] = [];
  private allTutors: TutorCard[] = [];
  directory: PublicDirectoryConfig = {
    endpoint: 'find-a-tutor',
    title: 'Find a tutor',
    singular: 'tutor',
    plural: 'tutors',
    intro: 'Discover and hire best tutors and coaches. Download the app to book a session today!',
    profileEnabled: true,
    rateSuffix: '/ Hour',
  };

  sortOptions: { value: SortOption; label: string }[] = [
    { value: 'alphabets', label: 'Alphabets' },
    { value: 'most-liked', label: 'Most Liked' },
    { value: 'experience', label: 'Experience' },
    { value: 'recently-added', label: 'Recently added' },
  ];

  applePath = APPLE_PATH;
  gradientButton = 'linear-gradient(-86deg, rgb(144, 33, 77) 0%, rgb(205, 53, 120) 100%)';
  googlePlaySrc = 'assets/Landing/a545087c920a7aa3d0b8e311d8b60b7ded2efb74.png';

  constructor(
    public authService: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    if (typeof document !== 'undefined') document.addEventListener('click', this.onDocClick);
    const routeDirectory = this.route.snapshot.data['directory'] ?? {};
    this.directory = { ...this.directory, ...routeDirectory };
    if (!Object.prototype.hasOwnProperty.call(routeDirectory, 'profileEnabled')) {
      this.directory.profileEnabled = this.directory.endpoint === 'find-a-tutor';
    }
    if (!Object.prototype.hasOwnProperty.call(routeDirectory, 'rateSuffix')) {
      this.directory.rateSuffix = this.directory.endpoint === 'find-a-tutor' ? '/ Hour' : '';
    }
    this.loadTutors();
  }

  get hasCategoryFrame(): boolean {
    return !!eduHubProfileFrame(this.directory.singular);
  }

  hideBrokenImage(tutor: TutorCard): void {
    tutor.avatar = '';
    this.cdr.markForCheck();
  }

  loadTutors(): void {
    this.isLoading = true;
    this.loadError = false;
    const needsPaging = ['find-an-event', 'find-a-workshop', 'find-a-stationary-shop', 'find-a-bookstore', 'find-a-sports-shop', 'find-a-second-hand-book']
      .includes(this.directory.endpoint);
    const params = needsPaging
      ? new HttpParams().set('city', '').set('page', '0').set('size', '100')
      : undefined;

    this.http
      .get<TutorApiRecord[] | PublicDirectoryResponse>(`${environment.apiUrl}/public/${this.directory.endpoint}`, { params })
      .subscribe({
        next: (res) => {
          const records = Array.isArray(res) ? res : (res?.content ?? res?.data ?? []);
          this.allTutors = records.map((record) => this.toTutorCard(record));
          this.applySort();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          console.error('Failed to load tutors:', error);
          this.loadError = true;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  toggleSortDropdown(): void {
    this.sortDropdownOpen = !this.sortDropdownOpen;
  }

  selectSort(option: SortOption): void {
    this.selectedSort = option;
    this.sortDropdownOpen = false;
    this.applySort();
    this.cdr.markForCheck();
  }

  get selectedSortLabel(): string {
    return this.sortOptions.find(o => o.value === this.selectedSort)?.label ?? 'Sort';
  }

  openFilterPanel(): void {
    this.filterPanelOpen = true;
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') document.removeEventListener('click', this.onDocClick);
  }

  closeFilterPanel(): void {
    this.filterPanelOpen = false;
  }

  private applySort(): void {
    const sorted = [...this.allTutors];
    switch (this.selectedSort) {
      case 'alphabets':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'most-liked':
        sorted.sort((a, b) => {
          const rA = a.rating === 'New' ? 0 : parseFloat(a.rating);
          const rB = b.rating === 'New' ? 0 : parseFloat(b.rating);
          return rB - rA;
        });
        break;
      case 'experience':
        sorted.sort((a, b) => {
          const parse = (s: string) => parseInt(s, 10) || 0;
          return parse(b.experience) - parse(a.experience);
        });
        break;
      case 'recently-added':
      default:
        break;
    }
    this.tutors = sorted;
  }

  private toTutorCard(tutor: TutorApiRecord): TutorCard {
    const location = [tutor.location || tutor.address || tutor.addressLine || tutor.venue, tutor.city, tutor.state]
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(', ');
    const displayName = tutor.name || tutor.title || this.directory.singular;
    const isTutorLike = ['find-a-tutor', 'find-a-counselor', 'find-an-academy'].includes(this.directory.endpoint);
    const isSecondHandBook = this.directory.endpoint === 'find-a-second-hand-book';
    const schedule = isTutorLike
      ? this.formatSchedule(tutor.availability, tutor.startTime, tutor.endTime)
      : this.formatDateRange(tutor.startDt, tutor.endDt);

    return {
      previewSummary: this.previewText(isSecondHandBook
        ? [tutor.authorPublisher, tutor.subject, tutor.bookClass, tutor.condition].filter(Boolean).join(' • ')
        : this.joinWithOverflow(tutor.subjects, 3) || tutor.headline || tutor.categoryName || tutor.description || this.directory.intro),
      previewLocation: this.previewText([tutor.city, tutor.state].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')),
      previewExperience: isTutorLike ? (tutor.experience || '').replace(/^RANGE_/, '').replace(/^PLUS_/, '').replace(/_/g, '–') : '',
      previewDate: this.formatDateRange(tutor.startDt, tutor.endDt),
      id: String(tutor.id),
      name: displayName,
      subjects: isSecondHandBook
        ? [tutor.authorPublisher, tutor.subject, tutor.genre].filter(Boolean).join(' • ')
        : this.joinWithOverflow(tutor.subjects, 3) || tutor.headline || tutor.categoryName || tutor.description || this.directory.singular,
      classes: isSecondHandBook
        ? [tutor.bookClass || tutor.degreeStream || tutor.targetExam, tutor.board, tutor.year].filter(Boolean).join(' • ') || location
        : this.joinWithOverflow(tutor.classes?.length ? tutor.classes : tutor.levels, 3) || location,
      schedule: schedule || tutor.venue || location,
      rating: isSecondHandBook ? this.toDisplayLabel(tutor.condition) : tutor.rating != null ? String(tutor.rating) : String(tutor.champsLiked ?? 0),
      experience: isSecondHandBook ? this.toDisplayLabel(tutor.bookType) : (tutor.experience || '').replace(/^RANGE_/, '').replace(/^PLUS_/, '').replace(/_/g, '–'),
      rate: tutor.sellingPrice != null ? String(tutor.sellingPrice) : tutor.fees != null ? String(tutor.fees) : tutor.fee != null ? String(tutor.fee) : '-',
      avatar: tutor.profilePicUrl || tutor.imageUrls?.[0] || tutor.imageUrl || tutor.thumbnailUrl || '',
      profileEnabled: !!this.directory.profileEnabled,
    };
  }

  private toDisplayLabel(value?: string): string {
    if (!value) return '';
    return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  get isVisualDirectory(): boolean { return ['find-an-event', 'find-a-workshop'].includes(this.directory.endpoint); }
  get isContactDirectory(): boolean { return ['find-a-tutor', 'find-an-academy', 'find-a-counselor'].includes(this.directory.endpoint); }

  private previewText(value: string): string {
    // Build a short preview without exposing contacts embedded in free text.
    return value.replace(/<[^>]*>/g, '').replace(/https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '')
      .replace(/\+?\d[\d\s().-]{7,}\d/g, '').trim().slice(0, 110);
  }

  private formatDateRange(start?: string, end?: string): string {
    const format = (value?: string): string => {
      if (!value) return '';
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const startLabel = format(start);
    const endLabel = format(end);
    return startLabel && endLabel && startLabel !== endLabel ? `${startLabel} – ${endLabel}` : startLabel || endLabel;
  }

  private joinWithOverflow(values: string[] | undefined, max: number): string {
    const unique = (values ?? []).filter((value, index, arr) => arr.indexOf(value) === index);
    if (unique.length <= max) {
      return unique.join(', ');
    }
    return `${unique.slice(0, max).join(', ')} +${unique.length - max}`;
  }

  private formatSchedule(availability: string[] | undefined, startTime?: string, endTime?: string): string {
    const days = (availability ?? []).map((day) => DAY_ABBREVIATIONS[day] ?? day);
    const timeRange = startTime && endTime ? `${this.formatTime(startTime)}-${this.formatTime(endTime)}` : '';
    return [days.join(', '), timeRange].filter(Boolean).join(' - ');
  }

  private formatTime(time: string): string {
    const match = time.match(/(?:T|^)(\d{2}):(\d{2})/);
    if (!match) return '';
    const [, hourStr, minuteStr] = match;
    const hour = parseInt(hourStr, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${minuteStr}${period}`;
  }
}
