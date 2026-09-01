import { CommonModule, Location } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Share } from '@capacitor/share';
import { IonicModule, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';

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

type FilterTab = 'specialization' | 'experience';

@Component({
  selector: 'app-counselor-directory',
  standalone: true,
  imports: [CommonModule, IonicModule, AdBannerComponent, FooterComponent, SupermePetComponent, EduHubCitySelectorComponent],
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
  verifiedOnly = true;
  showFilters = false;
  filterTab: FilterTab = 'specialization';
  selectedSpecializations = new Set<string>();
  selectedExperience = new Set<string>();
  entityType = 'COUNSELOR';
  directoryTitle = 'Counselors';
  singularTitle = 'Counselor';
  educationFilters: SelectedFilters | null = null;

  private readonly subscriptions = new Subscription();
  private readonly likeSubscriptions = new Map<number, Subscription>();

  constructor(
    private readonly location: Location,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly tutorService: TutorService,
    private readonly likeService: TutorLikeService,
    private readonly authService: AuthService,
    private readonly core: CoreService,
    private readonly petAgeService: PetAgeService,
    private readonly modalCtrl: ModalController,
    private readonly cityService: EduHubCityService
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
    this.loadCounselors();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.likeSubscriptions.forEach(subscription => subscription.unsubscribe());
    this.likeSubscriptions.clear();
    document.body.style.overflow = '';
  }

  get visibleCounselors(): Tutor[] {
    const city = this.cityService.city.toLocaleLowerCase();
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
        && (!city || [counselor.city, counselor.location].filter(Boolean).join(' ').toLocaleLowerCase().includes(city))
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
    this.isLoading = true;
    this.errorMessage = '';
    this.subscriptions.add(
      (this.educationFilters && this.entityType !== 'COUNSELOR'
        ? this.tutorService.searchDirectory(this.entityType, this.educationFilters)
        : this.tutorService.getTutorsByEntityType(this.entityType)).subscribe({
        next: counselors => {
          this.counselors = Array.isArray(counselors) ? counselors : [];
          this.counselors.forEach(counselor => this.watchLikes(counselor));
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = `We couldn’t load ${this.directoryTitle.toLowerCase()} right now. Check your connection and try again.`;
        }
      })
    );
  }

  async openEducationFilters(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TutorAllFilterComponent,
      componentProps: { initialFilters: this.educationFilters, useServerResults: true }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
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
    return !!(counselor.isVerified || counselor.verified);
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
    const profileBaseRoute = this.entityType === 'COUNSELOR' ? '/authed/counselors' : '/authed/tutors';
    void this.router.navigate([profileBaseRoute, counselor.id], {
      state: { tutor: counselor }
    });
  }

  getName(counselor: Tutor): string {
    return counselor.name?.trim() || counselor.entityName?.trim() || this.singularTitle;
  }

  getProfileImage(counselor: Tutor): string {
    return counselor.profilePicUrl?.trim() || 'assets/Images-Transparent/Image-Tutor.png';
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.src = 'assets/Images-Transparent/Image-Tutor.png';
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
