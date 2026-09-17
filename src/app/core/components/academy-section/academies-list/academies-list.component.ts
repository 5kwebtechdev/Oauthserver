import { Component, HostListener, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, skip, Subscription } from 'rxjs';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';
import { SupermeSpeechBubbleComponent } from '../../superme-speech-bubble/superme-speech-bubble.component';
import { SupermePopupComponent } from '../../superme-popup/superme-popup.component';
import { FooterComponent } from '../../footer/footer.component';
import { AdScreen } from '../../ad-banner/ad-banner.component';
import { AuthService } from '../../../services/auth.service';
import { CustomToastService } from '../../../services/custom-toast.service';
import { environment } from '../../../../../environments/environment';
import { TutorListComponent } from '../../tutor-section/tutor-list/tutor-list.component';
import { TutorProfileComponent } from '../../tutor-section/tutor-profile/tutor-profile.component';
import { Tutor, TutorListItem } from '../../../models/tutor.model';
import { EduHubCitySelectorComponent } from '../../education-section/eduhub-city-selector/eduhub-city-selector.component';
import { EduHubCityService } from '../../../services/eduhub-city.service';

type AcademySort = 'recent' | 'alphabets' | 'rating' | 'price';

interface Academy {
  id: number;
  name: string;
  image: string;
  rating: number;
  experience: string;
  headline: string;
  subjects: string[];
  classes: string[];
  days: string;
  timing: string;
  hourlyRate: number;
  feeLabel: string;
  location: string;
  totalStudents: number;
  verified: boolean;
  liked: boolean;
  profile: Tutor;
}

@Component({
  selector: 'academies-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SupermeButtonComponent,
    SupermePetComponent,
    SupermeSpeechBubbleComponent,
    SupermePopupComponent,
    FooterComponent,
    TutorListComponent,
    EduHubCitySelectorComponent
  ],
  templateUrl: './academies-list.component.html',
  styleUrls: ['./academies-list.component.scss']
})
export class AcademiesListComponent implements OnInit, OnDestroy {
  readonly adScreen: AdScreen = 'EDUHUB';
  readonly academyPlaceholderImage = 'assets/Images-Transparent/Academies.webp';
  academies: Academy[] = [];
  academyListItems: TutorListItem[] = [];
  totalAcademies = 0;
  isLoading = false;
  hasError = false;
  searchQuery = '';

  isReferModalOpen = false;
  referLink = 'https://supermeapp.com/become-an-academy-partner';

  isSortOpen = false;
  currentSort: AcademySort = 'recent';
  readonly sortOptions: { key: AcademySort; label: string }[] = [
    { key: 'recent', label: 'Recently added' },
    { key: 'alphabets', label: 'Alphabets' },
    { key: 'rating', label: 'Top Rated' },
    { key: 'price', label: 'Price' }
  ];
  private readonly subscriptions = new Subscription();
  private academyRequestId = 0;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: CustomToastService,
    private modalCtrl: ModalController,
    private cdr: ChangeDetectorRef,
    private cityService: EduHubCityService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Read Angular's active route rather than window.location.search. Ionic's
    // hash navigation can place query params after '#', where URLSearchParams
    // on window.location.search cannot see them.
    this.subscriptions.add(this.route.queryParamMap.subscribe(params => {
      const navigationCity = String(
        history.state?.city ?? params.get('city') ?? ''
      ).trim();
      if (navigationCity) this.cityService.selectCity(navigationCity);

      const carriedAcademies = Array.isArray(history.state?.directoryItems)
        ? history.state.directoryItems as Tutor[]
        : [];
      if (carriedAcademies.length) this.applyAcademies(carriedAcademies);

      this.loadAcademies();
    }));

    // The shared selector is usable on this inner page as well. A new city
    // selection must immediately refresh the directory for that city.
    this.subscriptions.add(
      this.cityService.city$.pipe(skip(1), distinctUntilChanged()).subscribe(() => {
        this.searchQuery = '';
        this.loadAcademies();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private headers(): HttpHeaders {
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

  loadAcademies(): void {
    const requestId = ++this.academyRequestId;
    this.isLoading = true;
    this.hasError = false;
    this.http.get<any>(`${environment.apiUrl}/tutors`, {
      headers: this.headers(),
      params: { entityType: 'ACADEMY' }
    }).subscribe({
      next: (res) => {
        if (requestId !== this.academyRequestId) return;
        const raw = Array.isArray(res)
          ? res
          : (res?.data?.tutors ?? res?.data?.content ?? res?.data ?? res?.tutors ?? res?.content ?? []);
        // Active academies belong in the directory regardless of verification.
        // `verified` controls only the badge shown on the card/profile.
        this.applyAcademies(Array.isArray(raw) ? raw : []);
        this.totalAcademies = Number(res?.data?.totalElements ?? this.academies.length);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        if (requestId !== this.academyRequestId) return;
        this.hasError = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private applyAcademies(raw: any[]): void {
    this.academies = raw
      .filter((academy: any) => this.isActiveAcademy(academy))
      .map((academy: any) => this.mapAcademy(academy));
    this.academyListItems = this.academies.map(academy => this.toAcademyListItem(academy));
    this.totalAcademies = this.academies.length;
  }

  private isActiveAcademy(academy: any): boolean {
    const explicit = [academy?.isActive, academy?.active]
      .map(value => typeof value === 'string' ? value.trim().toLowerCase() === 'true' : value)
      .filter(value => typeof value === 'boolean');
    if (explicit.includes(false)) return false;
    if (explicit.includes(true)) return true;

    const status = String(academy?.accountStatus ?? academy?.status ?? '').trim().toLowerCase();
    return !status || ['active', 'approved', 'published', 'verified', 'enabled'].includes(status);
  }

  // Field names are a best guess pending the real API contract — adjust once confirmed.
  private mapAcademy(a: any): Academy {
    const classes = this.asStringArray(a?.classes);
    const subjects = this.asStringArray(a?.subjects);
    const availability = this.asStringArray(a?.availability);
    const startTime = this.formatTime(a?.startTime);
    const endTime = this.formatTime(a?.endTime);

    const name = a?.entityName ?? a?.name ?? a?.academyName ?? a?.title ?? 'Academy';
    const image = a?.profilePicUrl ?? a?.image ?? a?.thumbnailUrl ?? a?.imageUrl ?? this.academyPlaceholderImage;
    const location = String(a?.location ?? '').trim()
      || [a?.city, a?.state].map((value: unknown) => String(value ?? '').trim()).filter(Boolean).join(', ')
      || String(a?.addressLine ?? '').trim();
    const fees = Number(a?.fees ?? a?.hourlyRate ?? a?.price ?? 0);
    const totalStudents = Number(a?.totalStudents ?? a?.studentCount ?? 0);
    const verified = !!(a?.verified ?? a?.isVerified ?? a?.documentsVerified ?? a?.verificationStatus === 'Verified');

    const profile = {
      ...a,
      id: a?.id,
      name,
      entityName: name,
      entityType: 'ACADEMY',
      profilePicUrl: image,
      qualification: a?.qualification ?? a?.headline ?? 'Academy',
      headline: a?.headline ?? a?.qualification ?? '',
      subjects,
      levels: classes.length ? classes : this.asStringArray(a?.levels),
      classes,
      boards: this.asStringArray(a?.boards),
      languages: this.asStringArray(a?.languages),
      availability,
      startTime: a?.startTime ?? '',
      endTime: a?.endTime ?? '',
      contactModes: this.asStringArray(a?.contactModes),
      hourlyRate: fees,
      fees,
      feeType: a?.feeType ?? null,
      location,
      addressLine: a?.addressLine,
      city: a?.city,
      state: a?.state,
      pincode: a?.pincode,
      phone: a?.phone ?? '',
      email: a?.email ?? '',
      totalStudents,
      isVerified: verified,
      verified,
      documentsVerified: verified,
      champsLiked: Number(a?.champsLiked ?? 0),
      likedByUser: !!(a?.likedByUser ?? a?.liked),
      likes: Array.isArray(a?.likes) ? a.likes : [],
      categoryMappings: Array.isArray(a?.categoryMappings) ? a.categoryMappings : []
    } as unknown as Tutor;

    return {
      id: a?.id,
      name,
      image,
      rating: Number(a?.rating ?? 0),
      headline: a?.headline ?? a?.qualification ?? '',
      experience: a?.experience ?? a?.experienceRange ?? '',
      subjects,
      classes: classes.length ? classes : this.asStringArray(a?.levels),
      days: availability.length ? this.formatAvailability(availability) : (a?.days ?? a?.availabilityDays ?? ''),
      timing: startTime && endTime ? `${startTime} - ${endTime}` : (a?.timing ?? a?.availabilityTiming ?? ''),
      hourlyRate: fees,
      feeLabel: this.formatFeeType(a?.feeType),
      location,
      totalStudents,
      verified,
      liked: !!(a?.likedByUser ?? a?.liked),
      profile
    };
  }

  private asStringArray(value: any): string[] {
    return Array.isArray(value)
      ? value.map(v => String(v).trim()).filter(Boolean)
      : [];
  }

  private formatTime(value: any): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const [hours, minutes = '00'] = raw.split(':');
    if (!hours) return raw;
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }

  private formatAvailability(days: string[]): string {
    const labels: Record<string, string> = {
      MONDAY: 'Mon',
      TUESDAY: 'Tue',
      WEDNESDAY: 'Wed',
      THURSDAY: 'Thu',
      FRIDAY: 'Fri',
      SATURDAY: 'Sat',
      SUNDAY: 'Sun'
    };
    return days.map(day => labels[day.toUpperCase()] ?? day).join(', ');
  }

  private formatFeeType(value: any): string {
    const raw = String(value ?? '').trim().toUpperCase();
    const labels: Record<string, string> = {
      PER_HOUR: '/hour',
      PER_SUBJECT: '/subject',
      PER_SESSION: '/session',
      PER_MONTH: '/month',
      PER_COURSE: '/course'
    };
    return labels[raw] ?? (raw ? `/${raw.replace(/^PER_/, '').toLowerCase()}` : '');
  }

  get filteredAcademies(): Academy[] {
    const q = this.searchQuery.trim().toLowerCase();
    const city = this.cityService.city.trim().toLowerCase();
    return this.academies.filter(a => {
      const academyLocation = [
        a.location,
        a.profile.city,
        a.profile.state,
        a.profile.addressLine
      ].filter(Boolean).join(' ').toLowerCase();
      return (!city || academyLocation.includes(city)) &&
      (!q || a.name.toLowerCase().includes(q) ||
        a.headline.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.subjects.some(s => s.toLowerCase().includes(q)) ||
        a.classes.some(c => c.toLowerCase().includes(q)));
    });
  }

  get filteredAcademyListItems(): TutorListItem[] {
    const visibleIds = new Set(this.filteredAcademies.map(academy => academy.id));
    return this.academyListItems.filter(item => visibleIds.has(item.id));
  }

  private toAcademyListItem(academy: Academy): TutorListItem {
    return {
      id: academy.id,
      name: academy.name,
      avatar: academy.image || this.academyPlaceholderImage,
      description: academy.subjects.length ? academy.subjects.join(', ') : (academy.headline || 'Academy'),
      rating: academy.rating,
      champsLiked: Number(academy.profile.champsLiked || 0),
      likedByUser: academy.liked,
      isVerified: academy.verified,
      experience: academy.experience,
      qualification: academy.headline || 'Academy',
      hourlyRate: academy.hourlyRate,
      feeLabel: academy.feeLabel || '/hr',
      location: academy.location,
      subjects: academy.subjects,
      levels: academy.classes,
      availability: academy.profile.availability || [],
      startTime: academy.profile.startTime || '',
      endTime: academy.profile.endTime || '',
      contactModes: academy.profile.contactModes || [],
      createdAt: academy.profile.createdAt || '',
      totalStudents: academy.totalStudents
    };
  }

  onSearch(): void { /* client-side filter via filteredAcademies */ }

  clearSearch(): void { this.searchQuery = ''; }

  openReferModal(): void { this.isReferModalOpen = true; }
  closeReferModal(): void { this.isReferModalOpen = false; }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.referLink);
      this.toastService.success('Link copied to clipboard');
    } catch {
      this.toastService.error('Unable to copy link');
    }
    this.closeReferModal();
  }

  shareWhatsapp(): void {
    const text = encodeURIComponent('Know a great academy? Refer them here: ' + this.referLink);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    this.closeReferModal();
  }

  toggleSortMenu(): void { this.isSortOpen = !this.isSortOpen; }

  selectSort(option: AcademySort): void {
    this.currentSort = option;
    this.isSortOpen = false;
    this.academies = this.sortAcademies([...this.academies], option);
    const order = new Map(this.academies.map((academy, index) => [academy.id, index]));
    this.academyListItems = [...this.academyListItems].sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    );
    this.cdr.detectChanges();
  }

  private sortAcademies(list: Academy[], sort: AcademySort): Academy[] {
    switch (sort) {
      case 'alphabets':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'rating':
        return list.sort((a, b) => b.rating - a.rating);
      case 'price':
        return list.sort((a, b) => a.hourlyRate - b.hourlyRate);
      case 'recent':
      default:
        return list;
    }
  }

  get currentSortLabel(): string {
    return this.sortOptions.find(o => o.key === this.currentSort)?.label ?? 'Recently added';
  }

  async onViewProfile(item: TutorListItem): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      await this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const academy = this.academies.find(candidate => candidate.id === item.id);
    if (!academy) return;

    const modal = await this.modalCtrl.create({
      component: TutorProfileComponent,
      componentProps: { tutor: academy.profile },
      cssClass: 'tutor-profile-modal'
    });
    await modal.present();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isSortOpen) this.isSortOpen = false;
  }
}
