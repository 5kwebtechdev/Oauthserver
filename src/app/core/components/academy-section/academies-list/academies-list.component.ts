import { Component, HostListener, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';
import { SupermeSpeechBubbleComponent } from '../../superme-speech-bubble/superme-speech-bubble.component';
import { SupermePopupComponent } from '../../superme-popup/superme-popup.component';
import { FooterComponent } from '../../footer/footer.component';
import { AdBannerComponent, AdScreen } from '../../ad-banner/ad-banner.component';
import { AuthService } from '../../../services/auth.service';
import { CustomToastService } from '../../../services/custom-toast.service';
import { environment } from '../../../../../environments/environment';
import { TutorProfileComponent } from '../../tutor-section/tutor-profile/tutor-profile.component';
import { Tutor } from '../../../models/tutor.model';

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
    AdBannerComponent
  ],
  templateUrl: './academies-list.component.html',
  styleUrls: ['./academies-list.component.scss']
})
export class AcademiesListComponent implements OnInit {
  readonly adScreen: AdScreen = 'EDUHUB';
  readonly academyPlaceholderImage = 'assets/Images-Transparent/Academies.png';
  academies: Academy[] = [];
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

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: CustomToastService,
    private modalCtrl: ModalController,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadAcademies();
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
    this.isLoading = true;
    this.hasError = false;
    this.http.get<any>(`${environment.apiUrl}/tutors/overview`, {
      headers: this.headers(),
      params: { entityType: 'ACADEMY' }
    }).subscribe({
      next: (res) => {
        const raw = Array.isArray(res)
          ? res
          : (res?.data?.tutors ?? res?.tutors ?? res?.content ?? []);
        this.academies = (Array.isArray(raw) ? raw : []).map((a: any) => this.mapAcademy(a));
        this.totalAcademies = Number(res?.data?.totalElements ?? this.academies.length);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
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
    const location = a?.location ?? [a?.city, a?.state].filter(Boolean).join(', ');
    const fees = Number(a?.fees ?? a?.hourlyRate ?? a?.price ?? 0);
    const totalStudents = Number(a?.totalStudents ?? a?.studentCount ?? 0);
    const verified = !!(a?.isVerified ?? a?.documentsVerified ?? a?.verificationStatus === 'Verified');

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
    if (!q) return this.academies;
    return this.academies.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.headline.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      a.subjects.some(s => s.toLowerCase().includes(q)) ||
      a.classes.some(c => c.toLowerCase().includes(q))
    );
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

  openAllFilters(): void {
    this.toastService.show('Filters are coming soon.', 'info');
  }

  toggleSortMenu(): void { this.isSortOpen = !this.isSortOpen; }

  selectSort(option: AcademySort): void {
    this.currentSort = option;
    this.isSortOpen = false;
    this.academies = this.sortAcademies([...this.academies], option);
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

  toggleLike(a: Academy, event: Event): void {
    event.stopPropagation();
    a.liked = !a.liked;
  }

  async onViewProfile(a: Academy, event?: Event): Promise<void> {
    event?.stopPropagation();
    const modal = await this.modalCtrl.create({
      component: TutorProfileComponent,
      componentProps: { tutor: a.profile },
      cssClass: 'tutor-profile-modal'
    });
    await modal.present();
  }

  onAcademyImageError(event: Event): void {
    const imageElement = event.target as HTMLImageElement | null;
    if (!imageElement || imageElement.dataset['fallbackApplied'] === 'true') {
      return;
    }

    imageElement.dataset['fallbackApplied'] = 'true';
    imageElement.src = this.academyPlaceholderImage;
    imageElement.classList.add('ac-card__image--placeholder');
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isSortOpen) this.isSortOpen = false;
  }
}
