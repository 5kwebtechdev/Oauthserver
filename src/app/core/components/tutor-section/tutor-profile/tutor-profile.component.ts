import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { ProfileFactsComponent, FaqItem, PROFILE_FAQS } from '../../user-profile/profile-facts/profile-facts.component';
import {
  Tutor,
  formatExperience,
  formatAvailability,
  formatTime,
  formatLevels,
  formatContactModes,
  getExperienceYears
} from '../../../models/tutor.model';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { TutorLikeService } from '../../../services/tutor-like.service';

@Component({
  selector: 'tutor-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulButtonComponent, MindfulNavigatorComponent, ProfileFactsComponent, HttpClientModule],
  templateUrl: './tutor-profile.component.html',
  styleUrls: ['./tutor-profile.component.scss']
})
export class TutorProfileComponent implements OnInit {
  @Input() tutor: Tutor | undefined;

  // Like toggle state
  isLiked = false;

  // Navigator actions
  navActions: Array<{ type: 'edit' | 'icon' | 'iconWithCount' | 'heart', src?: string, alt?: string, count?: number }> = [];

  // FAQ data
  tutorFaqs: FaqItem[] = PROFILE_FAQS.filter(f => {
    const s = (f.section || '').toLowerCase();
    const scr = (f.screen || '').toLowerCase();
    return s === 'tutor' || scr.includes('tutor');
  });

  // Whether a like/unlike request is in progress to avoid duplicate requests
  isLikeRequestInProgress = false;

  // Inline contact sheet state
  showContactSheet = false;
  selectedContactMethod: 'call' | 'email' | null = 'call';

  constructor(private http: HttpClient, private authService: AuthService, private likeService: TutorLikeService, private location: Location) { }

  ngOnInit(): void {
    // initialize nav actions first so subscription can update the icon
    this.initNavActions();

    if (this.tutor && this.tutor.id) {
      // register initial server-provided state with the shared service
      this.likeService.initFromServer(this.tutor);

      // subscribe to live updates for this tutor
      this.likeService.watch(this.tutor.id).subscribe(s => {
        this.isLiked = s.liked;
        if (this.tutor) this.tutor.champsLiked = s.count;

        // update heart svg to reflect current liked state
        if (this.navActions && this.navActions[0]) {
          const gradientSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff6a6a"/><stop offset="100%" stop-color="#ff2e7a"/></linearGradient></defs><circle cx="30" cy="30" r="24" fill="url(#g1)" opacity="0.1"/><path d="M30 39L28.55 37.7C26.87 36.18 25.48 34.87 24.38 33.77C23.28 32.67 22.4 31.69 21.75 30.81C21.1 29.94 20.65 29.13 20.39 28.4C20.13 27.67 20 26.92 20 26.15C20 24.58 20.53 23.27 21.58 22.22C22.63 21.17 23.93 20.65 25.5 20.65C26.37 20.65 27.19 20.83 27.98 21.2C28.76 21.57 29.43 22.08 30 22.75C30.57 22.08 31.24 21.57 32.03 21.2C32.81 20.83 33.63 20.65 34.5 20.65C36.07 20.65 37.38 21.17 38.43 22.22C39.48 23.27 40 24.58 40 26.15C40 26.92 39.87 27.67 39.61 28.4C39.35 29.13 38.9 29.94 38.25 30.81C37.6 31.69 36.73 32.67 35.63 33.77C34.53 34.87 33.13 36.18 31.45 37.7L30 39Z" fill="url(#g1)"/></svg>';
          const neutralSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none"><g filter="url(#filter0_d_4507_48920)"><foreignObject x="-10" y="-10" width="80" height="80"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(8px);clip-path:url(#bgblur_0_4507_48920_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="16" cx="30" cy="30" r="24" fill="url(#paint0_linear_4507_48920)"/><mask id="mask0_4507_48920" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="18" y="18" width="24" height="24"><rect x="18" y="18" width="24" height="24" fill="#282527"/></mask><g mask="url(#mask0_4507_48920)"><path d="M30 38.9984L28.55 37.6984C26.8667 36.1818 25.475 34.8734 24.375 33.7734C23.275 32.6734 22.4 31.6859 21.75 30.8109C21.1 29.9359 20.6458 29.1318 20.3875 28.3984C20.1292 27.6651 20 26.9151 20 26.1484C20 24.5818 20.525 23.2734 21.575 22.2234C22.625 21.1734 23.9333 20.6484 25.5 20.6484C26.3667 20.6484 27.1917 20.8318 27.975 21.1984C28.7583 21.5651 29.4333 22.0818 30 22.7484C30.5667 22.0818 31.2417 21.5651 32.025 21.1984C32.8083 20.8318 33.6333 20.6484 34.5 20.6484C36.0667 20.6484 37.375 21.1734 38.425 22.2234C39.475 23.2734 40 24.5818 40 26.1484C40 26.9151 39.8708 27.6651 39.6125 28.3984C39.3542 29.1318 38.9 29.9359 38.25 30.8109C37.6 31.6859 36.725 32.6734 35.625 33.7734C34.525 34.8734 33.1333 36.1818 31.45 37.6984L30 38.9984ZM30 36.2984C31.6 34.8651 32.9167 33.6359 33.95 32.6109C34.9833 31.5859 35.8 30.6943 36.4 29.9359C37 29.1776 37.4167 28.5026 37.65 27.9109C37.8833 27.3193 38 26.7318 38 26.1484C38 25.1484 37.6667 24.3151 37 23.6484C36.3333 22.9818 35.5 22.6484 34.5 22.6484C33.7167 22.6484 32.9917 22.8693 32.325 23.3109C31.6583 23.7526 31.2 24.3151 30.95 24.9984H29.05C28.8 24.3151 28.3417 23.7526 27.675 23.3109C27.0083 22.8693 26.2833 22.6484 25.5 22.6484C24.5 22.6484 23.6667 22.9818 23 23.6484C22.3333 24.3151 22 25.1484 22 26.1484C22 26.7318 22.1167 27.3193 22.35 27.9109C22.5833 28.5026 23 29.1776 23.6 29.9359C24.2 30.6943 25.0167 31.5859 26.05 32.6109C27.0833 33.6359 28.4 34.8651 30 36.2984Z" fill="#282527"/></g></g><defs><filter id="filter0_d_4507_48920" x="0" y="0" width="60" height="60" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="3"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.419608 0 0 0 0 0.396078 0 0 0 0 0.415686 0 0 0 0.15 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_4507_48920"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_4507_48920" result="shape"/></filter></defs></svg>';
    this.navActions[0].src = 'data:image/svg+xml;utf8,' + encodeURIComponent(this.isLiked ? gradientSvg : neutralSvg);
        }
      });
    }
  }

  private initNavActions(): void {
    // Choose initial SVG according to current liked state
    const neutralSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none"><g filter="url(#filter0_d_4507_48920)"><foreignObject x="-10" y="-10" width="80" height="80"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(8px);clip-path:url(#bgblur_0_4507_48920_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="16" cx="30" cy="30" r="24" fill="url(#paint0_linear_4507_48920)"/><mask id="mask0_4507_48920" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="18" y="18" width="24" height="24"><rect x="18" y="18" width="24" height="24" fill="#282527"/></mask><g mask="url(#mask0_4507_48920)"><path d="M30 38.9984L28.55 37.6984C26.8667 36.1818 25.475 34.8734 24.375 33.7734C23.275 32.6734 22.4 31.6859 21.75 30.8109C21.1 29.9359 20.6458 29.1318 20.3875 28.3984C20.1292 27.6651 20 26.9151 20 26.1484C20 24.5818 20.525 23.2734 21.575 22.2234C22.625 21.1734 23.9333 20.6484 25.5 20.6484C26.3667 20.6484 27.1917 20.8318 27.975 21.1984C28.7583 21.5651 29.4333 22.0818 30 22.7484C30.5667 22.0818 31.2417 21.5651 32.025 21.1984C32.8083 20.8318 33.6333 20.6484 34.5 20.6484C36.0667 20.6484 37.375 21.1734 38.425 22.2234C39.475 23.2734 40 24.5818 40 26.1484C40 26.9151 39.8708 27.6651 39.6125 28.3984C39.3542 29.1318 38.9 29.9359 38.25 30.8109C37.6 31.6859 36.725 32.6734 35.625 33.7734C34.525 34.8734 33.1333 36.1818 31.45 37.6984L30 38.9984ZM30 36.2984C31.6 34.8651 32.9167 33.6359 33.95 32.6109C34.9833 31.5859 35.8 30.6943 36.4 29.9359C37 29.1776 37.4167 28.5026 37.65 27.9109C37.8833 27.3193 38 26.7318 38 26.1484C38 25.1484 37.6667 24.3151 37 23.6484C36.3333 22.9818 35.5 22.6484 34.5 22.6484C33.7167 22.6484 32.9917 22.8693 32.325 23.3109C31.6583 23.7526 31.2 24.3151 30.95 24.9984H29.05C28.8 24.3151 28.3417 23.7526 27.675 23.3109C27.0083 22.8693 26.2833 22.6484 25.5 22.6484C24.5 22.6484 23.6667 22.9818 23 23.6484C22.3333 24.3151 22 25.1484 22 26.1484C22 26.7318 22.1167 27.3193 22.35 27.9109C22.5833 28.5026 23 29.1776 23.6 29.9359C24.2 30.6943 25.0167 31.5859 26.05 32.6109C27.0833 33.6359 28.4 34.8651 30 36.2984Z" fill="#282527"/></g></g><defs><filter id="filter0_d_4507_48920" x="0" y="0" width="60" height="60" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="3"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.419608 0 0 0 0 0.396078 0 0 0 0 0.415686 0 0 0 0.15 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_4507_48920"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_4507_48920" result="shape"/></filter></defs></svg>';
    const gradientSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff6a6a"/><stop offset="100%" stop-color="#ff2e7a"/></linearGradient></defs><circle cx="30" cy="30" r="24" fill="url(#g1)" opacity="0.1"/><path d="M30 39L28.55 37.7C26.87 36.18 25.48 34.87 24.38 33.77C23.28 32.67 22.4 31.69 21.75 30.81C21.1 29.94 20.65 29.13 20.39 28.4C20.13 27.67 20 26.92 20 26.15C20 24.58 20.53 23.27 21.58 22.22C22.63 21.17 23.93 20.65 25.5 20.65C26.37 20.65 27.19 20.83 27.98 21.2C28.76 21.57 29.43 22.08 30 22.75C30.57 22.08 31.24 21.57 32.03 21.2C32.81 20.83 33.63 20.65 34.5 20.65C36.07 20.65 37.38 21.17 38.43 22.22C39.48 23.27 40 24.58 40 26.15C40 26.92 39.87 27.67 39.61 28.4C39.35 29.13 38.9 29.94 38.25 30.81C37.6 31.69 36.73 32.67 35.63 33.77C34.53 34.87 33.13 36.18 31.45 37.7L30 39Z" fill="url(#g1)"/></svg>';

    const svgData = 'data:image/svg+xml;utf8,' + encodeURIComponent(this.isLiked ? gradientSvg : neutralSvg);

    this.navActions = [
      { type: 'heart', src: svgData, alt: 'Heart' }
    ];
  }

  close(): void {
    // Navigate back in history (previous screen)
    try { this.location.back(); } catch (e) { window.history.back(); }
  }

  /**
   * Get likes count from tutor data
   */
  getLikesCount(): number {
    return this.tutor?.champsLiked || this.tutor?.likes?.length || 0;
  }

  /**
   * Get experience years for display
   */
  getExperienceYears(): number {
    if (!this.tutor?.experience) return 0;
    return getExperienceYears(this.tutor.experience);
  }

  /**
   * Get formatted experience string
   */
  getExperienceString(): string {
    if (!this.tutor?.experience) return '0 years Exp';
    return formatExperience(this.tutor.experience);
  }

  /**
   * Get formatted subjects string
   */
  getSubjectsString(): string {
    if (!this.tutor?.subjects || this.tutor.subjects.length === 0) {
      return this.tutor?.qualification || 'Various Subjects';
    }
    return this.tutor.subjects.join(', ');
  }

  /**
   * Get formatted levels/classes string
   */
  getLevelsString(): string {
    if (!this.tutor?.levels || this.tutor.levels.length === 0) {
      return 'All Levels';
    }
    return formatLevels(this.tutor.levels);
  }

  /**
   * Get formatted contact modes string
   */
  getContactModesString(): string {
    if (!this.tutor?.contactModes || this.tutor.contactModes.length === 0) {
      return 'Online, Offline';
    }
    return formatContactModes(this.tutor.contactModes);
  }

  /**
   * Get formatted availability string
   */
  getAvailabilityString(): string {
    if (!this.tutor) return 'Schedule not available';

    const days = this.tutor.availability?.length > 0
      ? formatAvailability(this.tutor.availability)
      : 'Not specified';

    const startTime = this.tutor.startTime ? formatTime(this.tutor.startTime) : '';
    const endTime = this.tutor.endTime ? formatTime(this.tutor.endTime) : '';

    if (startTime && endTime) {
      return `${days} - ${startTime} - ${endTime}`;
    }
    return days;
  }

  /**
   * Get hourly rate
   */
  getHourlyRate(): number {
    return this.tutor?.hourlyRate || this.tutor?.fees || 0;
  }

  /**
   * Get fee type string
   */
  getFeeTypeString(): string {
    if (!this.tutor?.feeType) return '/per hour';
    const feeTypeMap: Record<string, string> = {
      'PER_HOUR': '/per hour',
      'PER_MONTH': '/per month',
      'PER_SESSION': '/per session',
      'PER_COURSE': '/per course'
    };
    return feeTypeMap[this.tutor.feeType] || '/per hour';
  }

  /**
   * Get board information from category mappings
   */
  getBoardString(): string {
    if (!this.tutor?.categoryMappings || this.tutor.categoryMappings.length === 0) {
      return 'CBSE, State Board';
    }

    const boards: string[] = [];
    this.tutor.categoryMappings.forEach(mapping => {
      try {
        const options = JSON.parse(mapping.selectedFieldOptions);
        if (options.boards) {
          boards.push(...options.boards);
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    return boards.length > 0 ? [...new Set(boards)].join(', ') : 'CBSE, State Board';
  }

  onFavorite(): void {
    console.log('Favorite clicked for:', this.tutor?.name);
  }

  /**
   * Return true when the current user relationship is CHILD
   * (used to disable actions not allowed for child users)
   */
  isChildUser(): boolean {
    try {
      return this.authService.getUserRelationship() === 'CHILD';
    } catch (e) {
      return false;
    }
  }

  handleNavAction(event: any): void {
    const { index, action } = event;
    if (action.type === 'heart') {
      // Delegate all like/unlike handling to the shared like service.
      // The service performs optimistic updates, persistence and reconciliation.
      this.likeService.toggleLike(this.tutor);
      // UI updates (count and icon) are handled by the service subscription.
      this.onFavorite();
    }
  }

  contactTutor(): void {
    if (this.isChildUser()) {
      console.warn('Contact disabled for child users');
      return;
    }
    // open inline bottom sheet
    this.openContactSheet();
  }

  openContactSheet(): void {
    this.selectedContactMethod = 'call';
    this.showContactSheet = true;
    // prevent body scroll when sheet open (minimal)
    document.body.style.overflow = 'hidden';
  }

  closeContactSheet(): void {
    this.showContactSheet = false;
    document.body.style.overflow = '';
  }

  selectContact(method: 'call' | 'email') {
    this.selectedContactMethod = method;
  }

  async confirmContact(): Promise<void> {
    const method = this.selectedContactMethod;
    // close sheet immediately
    this.closeContactSheet();

    if (!method) return;

    // Helper to open URL via Capacitor App when available, otherwise fallback to window.location
    const openUrl = async (url: string) => {
      try {
        // dynamic import to avoid bundling issues on web
        const mod = await import('@capacitor/app');
        // use any-cast to avoid TypeScript typing mismatch across Capacitor versions
        const appAny: any = (mod && (mod as any).App) || null;
        if (appAny && typeof appAny.openUrl === 'function') {
          await appAny.openUrl({ url });
          return;
        }
      } catch (e) {
        // ignore and fallback
      }
      // fallback for web
      window.location.href = url;
    };

    if (method === 'call') {
      const raw = (this.tutor?.phone || '').toString().trim();
      if (!raw) return;
      // normalize phone: keep leading + and digits only
      const normalized = raw.replace(/[^+\d]/g, '');
      const telUrl = `tel:${normalized}`;
      await openUrl(telUrl);
      return;
    }

    if (method === 'email') {
      const email = (this.tutor?.email || '').toString().trim();
      if (!email) return;
      const mailto = `mailto:${encodeURIComponent(email)}`;
      await openUrl(mailto);
      return;
    }
  }
}
