import { CommonModule, Location } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { IonicModule, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { TutorApi } from '../../../api/tutor.api';
import {
  Tutor,
  TutorCategory,
  formatAvailability,
  formatContactModes,
  formatExperience,
  formatLevels,
  getExperienceYears
} from '../../../models/tutor.model';
import { AuthService } from '../../../services/auth.service';
import { CustomToastService } from '../../../services/custom-toast.service';
import { TutorLikeService } from '../../../services/tutor-like.service';
import { TutorService } from '../../../services/tutor.service';
import { UserService } from '../../../services/user.service';
import { FaqItem, PROFILE_FAQS, ProfileFactsComponent } from '../../user-profile/profile-facts/profile-facts.component';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';

type ContactMethod = 'call' | 'email' | 'whatsapp';

@Component({
  selector: 'tutor-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, ProfileFactsComponent, ProfileImageComponent],
  templateUrl: './tutor-profile.component.html',
  styleUrls: ['./tutor-profile.component.scss']
})
export class TutorProfileComponent implements OnInit, OnDestroy {
  /** Contact unlock pricing is currently a fixed product rule. */
  readonly contactUnlockCost = 50;
  @Input() tutor: Tutor | undefined;
  @Input() categoryKey: string | null = null;

  readonly tutorFaqs: FaqItem[] = PROFILE_FAQS.filter(faq => {
    const section = (faq.section || '').toLowerCase();
    const screen = (faq.screen || '').toLowerCase();
    return section === 'tutor' || section === 'tutors' || screen.includes('tutor');
  });

  categoryFieldRows: Array<{ label: string; value: string }> = [];
  isLoading = false;
  loadError = '';
  isLiked = false;
  isLikeRequestInProgress = false;
  isAboutExpanded = false;
  showContactSheet = false;
  showUnlockConfirmation = false;
  selectedContactMethod: ContactMethod = 'call';
  isContactLaunching = false;
  isUnlockingContact = false;
  isContactUnlocked = false;

  private tutorCategories: TutorCategory[] = [];
  private activeLikeTutorId: number | null = null;
  private subscriptions = new Subscription();
  /**
   * The image shown on the listing card the user tapped. The by-ID detail
   * fetch doesn't always return `profilePicUrl` on every backend build, so
   * this is kept as a fallback to stop the detail page flashing to the
   * generic placeholder even though the real photo is known.
   */
  private navigationProfileImage?: string;

  constructor(
    private authService: AuthService,
    private likeService: TutorLikeService,
    private location: Location,
    private modalCtrl: ModalController,
    private toastService: CustomToastService,
    private tutorApi: TutorApi,
    private route: ActivatedRoute,
    private router: Router,
    private tutorService: TutorService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.categoryKey = this.categoryKey || this.route.snapshot.queryParamMap.get('category');
    this.loadCategoryFieldLabels();

    const navigationTutor = this.getNavigationTutor();
    this.navigationProfileImage = (navigationTutor?.profilePicUrl || this.tutor?.profilePicUrl)?.trim() || undefined;
    if (!this.tutor && navigationTutor) {
      this.setTutor(navigationTutor);
    } else if (this.tutor) {
      this.setTutor(this.tutor);
    }

    const routeId = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(routeId) && routeId > 0) {
      this.loadTutor(routeId);
    } else if (!this.tutor) {
      this.loadError = 'Tutor details are not available.';
    }
  }

  get isCounselorProfile(): boolean {
    return String(this.route.snapshot.data?.['entityType'] || '').toUpperCase() === 'COUNSELOR'
      || this.route.snapshot.routeConfig?.path?.startsWith('counselors/') === true;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    document.body.style.overflow = '';
  }

  private getNavigationTutor(): Tutor | undefined {
    const currentNavigation = this.router.getCurrentNavigation();
    const fromRouter = currentNavigation?.extras.state?.['tutor'];
    const fromHistory = typeof history !== 'undefined' ? history.state?.tutor : undefined;
    return (fromRouter || fromHistory) as Tutor | undefined;
  }

  private loadTutor(tutorId: number): void {
    this.isLoading = !this.tutor;
    this.loadError = '';

    this.subscriptions.add(
      this.tutorService.getTutorById(tutorId).subscribe(tutor => {
        this.isLoading = false;
        if (tutor) {
          this.setTutor(tutor);
          return;
        }

        if (!this.tutor) {
          this.loadError = 'We could not load this tutor. Please try again.';
        }
      })
    );
  }

  retryLoad(): void {
    const routeId = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(routeId) && routeId > 0) {
      this.loadTutor(routeId);
    }
  }

  private setTutor(tutor: Tutor): void {
    // The list card and the by-ID detail fetch can disagree on the image
    // field (missing on one, or simply a different photo on the other). The
    // detail page must always show the exact photo the user tapped from the
    // list, so the navigation-supplied image wins whenever one was captured.
    if (this.navigationProfileImage) {
      tutor = { ...tutor, profilePicUrl: this.navigationProfileImage };
    } else if (tutor.profilePicUrl?.trim()) {
      this.navigationProfileImage = tutor.profilePicUrl.trim();
    }
    this.tutor = tutor;
    const alreadySpentCoins = (tutor as any)?.alreadySpentCoinsForThisProfile;
    // The tutor API now returns a per-user unlock flag. When it is supplied,
    // it takes precedence over legacy `unlocked` values so one user's payment
    // never exposes contact details to another user.
    this.isContactUnlocked = alreadySpentCoins === undefined || alreadySpentCoins === null
      ? !!((tutor as any)?.unlocked || (tutor as any)?.isUnlocked)
      : alreadySpentCoins === true || String(alreadySpentCoins).toLowerCase() === 'true';
    this.categoryFieldRows = this.buildCategoryFieldRows(this.tutorCategories);
    this.initializeLikeState(tutor);
  }

  private initializeLikeState(tutor: Tutor): void {
    this.likeService.initFromServer(tutor);
    if (this.activeLikeTutorId === tutor.id) return;

    this.activeLikeTutorId = tutor.id;
    this.subscriptions.add(
      this.likeService.watch(tutor.id).subscribe(state => {
        this.isLiked = state.liked;
        this.isLikeRequestInProgress = state.pending;
        if (this.tutor) {
          this.tutor.champsLiked = state.count;
          this.tutor.likedByUser = state.liked;
        }
      })
    );
  }

  async close(): Promise<void> {
    if (this.route.snapshot.paramMap.has('id')) {
      this.location.back();
      return;
    }

    try {
      const topModal = await this.modalCtrl.getTop();
      if (topModal) {
        await topModal.dismiss();
        return;
      }
    } catch {
      // Fall back to browser history below.
    }

    this.location.back();
  }

  toggleLike(): void {
    if (!this.tutor || this.isLikeRequestInProgress) return;

    const request = this.likeService.toggleLike(this.tutor);
    if (!request) return;

    void request.catch(() => {
      this.toastService.error('Unable to update like. Please try again.');
    });
  }

  async shareTutor(): Promise<void> {
    if (!this.tutor) return;

    const title = this.getDisplayName();
    const text = `View ${title} on SuperMe EduHub`;
    const url = typeof window !== 'undefined' ? window.location.href : '';

    try {
      await Share.share({ title, text, url, dialogTitle: `Share ${title}` });
    } catch (error) {
      try {
        await navigator.clipboard.writeText(url || text);
        this.toastService.success('Tutor link copied.');
      } catch {
        console.warn('[TutorProfile] Unable to share tutor', error);
        this.toastService.error('Unable to share this tutor right now.');
      }
    }
  }

  getDisplayName(): string {
    if (!this.tutor) return this.isCounselorProfile ? 'Counselor' : 'Tutor';
    if (this.isAcademyProfile()) {
      return this.tutor.entityName?.trim() || this.tutor.name?.trim() || 'Academy';
    }
    return this.tutor.name?.trim() || this.tutor.entityName?.trim() || (this.isCounselorProfile ? 'Counselor' : 'Tutor');
  }

  getProfileImage(): string | null {
    return this.tutor?.profilePicUrl?.trim() || null;
  }

  isVerified(): boolean {
    return !!(this.tutor?.isVerified || this.tutor?.verified);
  }

  isAcademyProfile(): boolean {
    const type = String(this.tutor?.entityType || '').toUpperCase();
    return ['ACADEMY', 'ACADEMY_PROFILE', 'COACHING', 'TUITION', 'SCHOOL', 'COLLEGE'].includes(type);
  }

  getProfileSubtitle(): string {
    const tutor = this.tutor as any;
    return tutor?.headline?.trim()
      || this.tutor?.qualification?.trim()
      || this.getSubjectsString()
      || (this.isAcademyProfile() ? 'Learning centre' : 'Subject expert');
  }

  getTeachHeading(): string {
    return this.isAcademyProfile() ? 'What we teach' : 'What I teach';
  }

  getLikesCount(): number {
    if (typeof this.tutor?.champsLiked === 'number') return this.tutor.champsLiked;
    return this.tutor?.likes?.length || 0;
  }

  getStudentsCount(): number {
    if (typeof this.tutor?.totalStudents === 'number' && this.tutor.totalStudents > 0) {
      return this.tutor.totalStudents;
    }
    return (this.tutor?.categoryMappings || []).reduce(
      (total, mapping) => total + (mapping.studentCount || mapping.currentStudents || 0),
      0
    );
  }

  getExperienceString(): string {
    const mappingYears = (this.tutor?.categoryMappings || [])
      .reduce((maximum, mapping) => Math.max(maximum, mapping.yearsOfExperience || 0), 0);
    if (mappingYears > 0) return `${mappingYears}+ years Exp`;
    if (!this.tutor?.experience || this.tutor.experience === 'FRESHER') return 'Fresher';
    return formatExperience(this.tutor.experience);
  }

  getExperienceYears(): number {
    const mappingYears = (this.tutor?.categoryMappings || [])
      .reduce((maximum, mapping) => Math.max(maximum, mapping.yearsOfExperience || 0), 0);
    return mappingYears || (this.tutor?.experience ? getExperienceYears(this.tutor.experience) : 0);
  }

  getSubjectsString(): string {
    const subjects = this.tutor?.subjects?.map(subject => String(subject).trim()).filter(Boolean) || [];
    return [...new Set(subjects)].join(', ');
  }

  getTeachingRows(): Array<{ label: string; value: string }> {
    if (this.categoryFieldRows.length > 0) return this.categoryFieldRows;

    const rows: Array<{ label: string; value: string }> = [];
    const subjects = this.getSubjectsString();
    const levels = this.getLevelsString(false);
    const languages = this.getLanguagesString(false);

    if (subjects) rows.push({ label: 'Subjects', value: subjects });
    if (levels && levels !== subjects) rows.push({ label: 'Classes', value: levels });
    if (languages) rows.push({ label: 'Languages', value: languages });
    return rows;
  }

  getTeachingIcon(label: string): string {
    const normalized = label.toLowerCase();
    if (normalized.includes('language')) return 'assets/Icons-Neutral/Tutor-LanguageSpoken.png';
    if (normalized.includes('class') || normalized.includes('grade') || normalized.includes('level')) {
      return 'assets/Icons-Neutral/Tutors-School.png';
    }
    return 'assets/Icons-Neutral/Icon-Tutor-Subjects.png';
  }

  getLevelsString(useFallback = true): string {
    const levels = this.tutor?.levels?.length ? this.tutor.levels : ((this.tutor as any)?.classes || []);
    if (levels?.length) return formatLevels(levels);
    return useFallback ? 'Not specified' : '';
  }

  getContactModesString(): string {
    const configuredModes = this.findFieldValues(['mode', 'teaching_mode', 'class_mode']);
    if (configuredModes.length) return configuredModes.map(value => this.formatEnumValue(value)).join(', ');
    if (this.tutor?.contactModes?.length) return formatContactModes(this.tutor.contactModes);
    return 'Not specified';
  }

  getLanguagesString(useFallback = true): string {
    const tutor = this.tutor as any;
    const directLanguages = this.normalizeFieldValue(tutor?.languages || tutor?.languagesOffered || []);
    const mappedLanguages = this.categoryFieldRows
      .filter(row => row.label.toLowerCase().includes('language'))
      .reduce<string[]>((languages, row) => languages.concat(this.normalizeFieldValue(row.value)), []);
    const languages = [...new Set([...directLanguages, ...mappedLanguages])];
    return languages.length ? languages.join(', ') : (useFallback ? 'Not specified' : '');
  }

  getAboutText(): string {
    const tutor = this.tutor as any;
    const mappingDescriptions = (this.tutor?.categoryMappings || [])
      .map(mapping => mapping.description?.trim())
      .filter(Boolean);
    return tutor?.description?.trim()
      || tutor?.about?.trim()
      || tutor?.bio?.trim()
      || mappingDescriptions[0]
      || tutor?.headline?.trim()
      || this.tutor?.qualification?.trim()
      || 'Details are not available.';
  }

  shouldShowReadMore(): boolean {
    return this.getAboutText().length > 115;
  }

  toggleAbout(): void {
    this.isAboutExpanded = !this.isAboutExpanded;
  }

  getAvailabilityDays(): string {
    return this.tutor?.availability?.length
      ? formatAvailability(this.tutor.availability)
      : 'Not specified';
  }

  getAvailabilityTime(): string {
    const start = this.formatDisplayTime(this.tutor?.startTime || '');
    const end = this.formatDisplayTime(this.tutor?.endTime || '');
    if (start && end) return `${start} - ${end}`;
    return start || end || 'Time not specified';
  }

  getAvailabilityString(): string {
    return `${this.getAvailabilityDays()} · ${this.getAvailabilityTime()}`;
  }

  getPublicLocation(): string {
    const tutor = this.tutor as any;
    return tutor?.location?.trim()
      || [tutor?.city, tutor?.state].map(value => String(value || '').trim()).filter(Boolean).join(', ')
      || 'Location not specified';
  }

  getFullLocation(): string {
    const tutor = this.tutor as any;
    const parts = [tutor?.addressLine, tutor?.city, tutor?.state, tutor?.pincode, tutor?.country]
      .map(value => String(value || '').trim())
      .filter(Boolean);
    return parts.length ? parts.join(', ') : this.getPublicLocation();
  }

  getHourlyRate(): number {
    const mappingRate = (this.tutor?.categoryMappings || []).find(mapping => mapping.categoryHourlyRate > 0)?.categoryHourlyRate;
    return Number(mappingRate || this.tutor?.hourlyRate || this.tutor?.fees || 0);
  }

  getFeeTypeString(): string {
    const labels: Record<string, string> = {
      PER_HOUR: '/per hour',
      PER_MONTH: '/per month',
      PER_SESSION: '/per session',
      PER_COURSE: '/per course',
      PER_SUBJECT: '/per subject'
    };
    return labels[String(this.tutor?.feeType || '')] || '/per hour';
  }

  isChildUser(): boolean {
    return this.authService.getUserRelationship() === 'CHILD';
  }

  requestUnlock(): void {
    if (this.isContactUnlocked) {
      this.openContactSheet();
      return;
    }

    if (!this.tutor || this.isUnlockingContact) return;
    const userId = this.authService.getUserId();
    if (!userId) {
      this.toastService.error('Unable to identify your account. Please sign in again.');
      return;
    }

    this.isUnlockingContact = true;
    this.tutorApi.unlockContact(userId, this.tutor.id, this.contactUnlockCost).subscribe({
      next: response => {
        this.applyUnlockedContact(response);
        this.isContactUnlocked = true;
        this.updateCoinBalance(response);
        this.isUnlockingContact = false;
        this.toastService.success('Contact details unlocked successfully.');
        this.openContactSheet();
      },
      error: error => {
        this.isUnlockingContact = false;
        this.toastService.error(error?.error?.message || 'Unable to unlock contact details. Please try again.');
      }
    });
  }

  openUnlockConfirmation(): void {
    if (this.isChildUser()) {
      this.toastService.error('Ask your parent to unlock the counselor contact details.');
      return;
    }
    if (this.isContactUnlocked) {
      this.openContactSheet();
      return;
    }
    if (!this.tutor || this.isUnlockingContact) return;
    this.showUnlockConfirmation = true;
    document.body.style.overflow = 'hidden';
  }

  closeUnlockConfirmation(): void {
    if (this.isUnlockingContact) return;
    this.showUnlockConfirmation = false;
    document.body.style.overflow = '';
  }

  confirmUnlock(): void {
    if (this.isUnlockingContact) return;
    this.showUnlockConfirmation = false;
    document.body.style.overflow = '';
    this.requestUnlock();
  }

  getCoinBalance(): number {
    const coins = Number(this.authService.getUserData()?.coins);
    return Number.isFinite(coins) ? Math.max(0, coins) : 0;
  }

  getCounselorQualifications(): string {
    return this.tutor?.qualification?.trim() || this.getProfileSubtitle() || 'Not specified';
  }

  getCounselorSpecializations(): string {
    // The API returns a dedicated `specializations` array for counselors —
    // it isn't part of the tutor "what I teach" subjects/classes rows, so it
    // has to be read directly rather than derived from getTeachingRows().
    const tutor = this.tutor as any;
    const specializations = [...new Set(this.normalizeFieldValue(tutor?.specializations || []))];
    if (specializations.length) return specializations.join(', ');

    const rows = this.getTeachingRows();
    const specializationRows = rows.filter(row => /special|subject|expert/i.test(row.label));
    const values = specializationRows.map(row => row.value).filter(Boolean);
    return values.join(', ') || this.getSubjectsString() || 'Not specified';
  }

  getCounselorFee(): string {
    const fee = this.getHourlyRate();
    return fee > 0
      ? `₹ ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(fee)} ${this.getFeeTypeString()}`
      : 'Not specified';
  }

  openContactSheet(): void {
    this.selectedContactMethod = this.hasPhoneNumber() ? 'call' : 'email';
    this.showContactSheet = true;
    document.body.style.overflow = 'hidden';
  }

  closeContactSheet(): void {
    this.showContactSheet = false;
    document.body.style.overflow = '';
  }

  selectContact(method: ContactMethod): void {
    this.selectedContactMethod = method;
  }

  hasPhoneNumber(): boolean {
    return !!this.getRawPhone();
  }

  hasEmailAddress(): boolean {
    return !!this.getRawEmail();
  }

  getUnlockedPhone(): string {
    return this.getRawPhone() || 'Not available';
  }

  getUnlockedEmail(): string {
    return this.getRawEmail() || 'Not available';
  }

  async confirmContact(): Promise<void> {
    if (this.isContactLaunching) return;

    const url = this.selectedContactMethod === 'call'
      ? this.buildTelephoneUrl()
      : this.selectedContactMethod === 'whatsapp'
        ? this.buildWhatsAppUrl()
        : this.buildEmailUrl();

    if (!url) {
      this.toastService.error('This contact option is not available for this tutor.');
      return;
    }

    this.isContactLaunching = true;
    try {
      await this.openContactUrl(url);
      this.closeContactSheet();
    } catch (error) {
      console.error('[TutorProfile] Unable to open contact action', error);
      this.toastService.error('Unable to open this contact option. Please try again.');
    } finally {
      this.isContactLaunching = false;
    }
  }

  getSelectedContactLabel(): string {
    if (this.selectedContactMethod === 'call') return 'Call Now';
    if (this.selectedContactMethod === 'whatsapp') return 'Open WhatsApp';
    return 'Send Email';
  }

  private applyUnlockedContact(response: any): void {
    const unlocked = response?.data?.tutor ?? response?.tutor ?? response?.data ?? response;
    if (!this.tutor || !unlocked || typeof unlocked !== 'object') return;
    Object.assign(this.tutor as any, {
      phone: unlocked.phone ?? (this.tutor as any).phone,
      email: unlocked.email ?? (this.tutor as any).email,
      addressLine: unlocked.addressLine ?? unlocked.address ?? (this.tutor as any).addressLine,
      location: unlocked.location ?? (this.tutor as any).location,
      state: unlocked.state ?? (this.tutor as any).state,
      city: unlocked.city ?? (this.tutor as any).city,
      pincode: unlocked.pincode ?? (this.tutor as any).pincode,
      unlocked: true,
      alreadySpentCoinsForThisProfile: true
    });
  }

  private updateCoinBalance(response: any): void {
    const amount = Number(
      response?.remainingBalance ?? response?.data?.remainingBalance ?? response?.coins ?? response?.data?.coins
    );
    if (!Number.isFinite(amount)) {
      this.userService.refreshStats().subscribe();
      return;
    }

    const coins = Math.max(0, amount);
    this.authService.updateUserData({ coins });
    const stats = this.userService.getUserStats();
    if (stats) this.userService.saveUserStats({ ...stats, coins });
    else this.userService.refreshStats().subscribe();
  }

  private getRawPhone(): string {
    const tutor = this.tutor as any;
    return this.firstContactValue(
      tutor?.phone,
      tutor?.phoneNumber,
      tutor?.mobile,
      tutor?.mobileNumber,
      tutor?.contactNumber,
      tutor?.contactPhone,
      tutor?.user?.phone
    );
  }

  private getRawEmail(): string {
    const tutor = this.tutor as any;
    return this.firstContactValue(tutor?.email, tutor?.emailAddress, tutor?.contactEmail, tutor?.user?.email);
  }

  private buildTelephoneUrl(): string | null {
    const rawPhone = this.getRawPhone();
    if (!rawPhone) return null;
    const normalized = rawPhone.replace(/(?!^\+)[^\d]/g, '');
    return normalized.replace(/\D/g, '').length >= 7 ? `tel:${normalized}` : null;
  }

  private buildWhatsAppUrl(): string | null {
    const digits = this.getRawPhone().replace(/\D/g, '');
    if (digits.length < 7) return null;
    const message = encodeURIComponent(`Hi, I found ${this.getDisplayName()} on SuperMe EduHub.`);
    return `https://wa.me/${digits}?text=${message}`;
  }

  private buildEmailUrl(): string | null {
    const email = this.getRawEmail();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    const subject = `SuperMe enquiry for ${this.getDisplayName()}`;
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}`;
  }

  private firstContactValue(...values: unknown[]): string {
    const value = values.find(candidate => typeof candidate === 'string' && candidate.trim().length > 0);
    return typeof value === 'string' ? value.trim() : '';
  }

  private async openContactUrl(url: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await AppLauncher.openUrl({ url });
        if (result.completed) return;
      } catch {
        // Continue to the installed system browser fallback.
      }

      const inAppBrowser = (window as any)?.cordova?.InAppBrowser;
      if (typeof inAppBrowser?.open === 'function') {
        inAppBrowser.open(url, '_system', 'location=yes');
        return;
      }
    }

    window.location.assign(url);
  }

  private formatDisplayTime(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const timeMatch = raw.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      const suffix = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${String(minutes).padStart(2, '0')} ${suffix}`;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime())
      ? raw
      : parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  private loadCategoryFieldLabels(): void {
    this.subscriptions.add(
      this.tutorApi.getTutorCategories().subscribe(categories => {
        this.tutorCategories = categories;
        this.categoryFieldRows = this.buildCategoryFieldRows(categories);
      })
    );
  }

  private buildCategoryFieldRows(categories: TutorCategory[] = []): Array<{ label: string; value: string }> {
    const allMappings = this.tutor?.categoryMappings || [];
    const selectedCategory = this.findSelectedCategory(categories);
    const mappings = selectedCategory
      ? allMappings.filter(mapping => String(mapping.categoryId) === String(selectedCategory.id))
      : allMappings;
    const mergedRows = new Map<string, { label: string; values: string[]; order: number }>();

    mappings.forEach((mapping, mappingIndex) => {
      const category = categories.find(item => String(item.id) === String(mapping.categoryId));
      const selectedOptions = this.parseSelectedFieldOptions(mapping.selectedFieldOptions);

      Object.entries(selectedOptions).forEach(([fieldKey, rawValue], fieldIndex) => {
        if (!this.isTeachingField(fieldKey)) return;

        const values = this.normalizeFieldValue(rawValue);
        if (!values.length) return;

        const field = category?.fields?.find(item => this.normalizeKey(item.fieldKey) === this.normalizeKey(fieldKey));
        const label = field?.fieldLabel || this.formatFieldLabel(fieldKey);
        const displayValues = values.map(value => this.getOptionDisplayValue(value, field)).filter(Boolean);
        if (!displayValues.length) return;

        const key = label.toLowerCase();
        const existing = mergedRows.get(key);
        const order = ((category?.displayOrder ?? mappingIndex) * 100) + (field?.displayOrder ?? fieldIndex);
        if (existing) {
          existing.values = [...new Set([...existing.values, ...displayValues])];
          existing.order = Math.min(existing.order, order);
        } else {
          mergedRows.set(key, { label, values: [...new Set(displayValues)], order });
        }
      });
    });

    return Array.from(mergedRows.values())
      .sort((a, b) => a.order - b.order)
      .map(row => ({ label: row.label, value: row.values.join(', ') }));
  }

  private findFieldValues(keys: string[]): string[] {
    const normalizedKeys = keys.map(key => this.normalizeKey(key));
    const values: string[] = [];
    (this.tutor?.categoryMappings || []).forEach(mapping => {
      const options = this.parseSelectedFieldOptions(mapping.selectedFieldOptions);
      Object.entries(options).forEach(([key, rawValue]) => {
        if (normalizedKeys.includes(this.normalizeKey(key))) {
          values.push(...this.normalizeFieldValue(rawValue));
        }
      });
    });
    return [...new Set(values)];
  }

  private parseSelectedFieldOptions(value: string | Record<string, unknown> | null | undefined): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    try {
      let parsed: unknown = JSON.parse(String(value));
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }

  private normalizeFieldValue(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.reduce<string[]>((items, item) => items.concat(this.normalizeFieldValue(item)), []);
    }
    if (value === null || value === undefined) return [];
    if (typeof value === 'object') {
      const item = value as Record<string, unknown>;
      return this.normalizeFieldValue(item['optionValue'] ?? item['value'] ?? item['optionLabel'] ?? item['label']);
    }
    return String(value).split(',').map(item => item.trim()).filter(Boolean);
  }

  private getOptionDisplayValue(value: string, field?: TutorCategory['fields'][number]): string {
    const normalizedValue = this.normalizeKey(value);
    const option = field?.options?.find(item =>
      this.normalizeKey(item.optionValue) === normalizedValue || this.normalizeKey(item.optionLabel) === normalizedValue
    );
    return option?.optionLabel || this.formatEnumValue(value);
  }

  private findSelectedCategory(categories: TutorCategory[]): TutorCategory | undefined {
    if (!this.categoryKey) return undefined;
    const selectedKey = this.normalizeCategoryKey(this.categoryKey);
    return categories.find(category => this.normalizeCategoryKey(category.categoryKey) === selectedKey);
  }

  private normalizeCategoryKey(value: string): string {
    const normalized = this.normalizeKey(value);
    const aliases: Record<string, string> = { LANGUAGES: 'LANGUAGE', EXAM: 'EXAMS', OTHER: 'OTHERS' };
    return aliases[normalized] || normalized;
  }

  private isTeachingField(fieldKey: string): boolean {
    return !['TUTORTYPE', 'MODE', 'TEACHINGMODE', 'CLASSMODE', 'LOCATION'].includes(this.normalizeKey(fieldKey));
  }

  private normalizeKey(value: unknown): string {
    return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  }

  private formatFieldLabel(fieldKey: string): string {
    return fieldKey
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  private formatEnumValue(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, character => character.toUpperCase());
  }
}
