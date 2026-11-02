import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { ModalController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { FaqItem, PROFILE_FAQS } from '../../../components/superme-facts/superme-facts.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { ITutor, normalizeTutor } from '../../../models/tutor.model';
import { TutorApi } from '../../../api/tutor.api';
import { CoreModule } from "src/app/core/core.module";

// Helper formatters
function formatTime(t?: string) {
  if (!t) return '';
  try {
    const d = new Date(t);
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, '0')} ${period}`;
  } catch {
    return t;
  }
}

function formatLevels(levels: any) {
  if (!levels) return 'All Levels';
  if (Array.isArray(levels)) return levels.join(', ');
  return String(levels);
}

function formatContactModes(modes: any) {
  if (!modes) return 'Online, Offline';
  if (Array.isArray(modes)) return modes.join(', ');
  return String(modes);
}

function formatAvailability(av: any) {
  if (!av) return 'Not specified';
  if (Array.isArray(av)) return av.join(', ');
  return String(av);
}

function formatExperience(exp?: string) {
  return exp || '0 years Exp';
}

function parseExperienceYears(exp?: string) {
  if (!exp) return 0;
  const m = String(exp).match(/(\d+)/);
  return m ? parseInt(m[0], 10) : 0;
}

@Component({
  selector: 'tutor-profile',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, CoreModule, FooterComponent, SupermeButtonComponent],
  templateUrl: './tutor-profile.component.html',
  styleUrls: ['./tutor-profile.component.scss']
})
export class TutorProfileComponent implements OnInit {
  @Input() tutor: ITutor | undefined;

  // State properties
  expandedFaqIndex: number | null = null;
  isLiked: boolean = false;
  isBooking: boolean = false;
  // Contact popup state
  showContactPopup: boolean = false;
  contactMode: 'call' | 'email' = 'call';

  // FAQ data
  tutorFaqs: FaqItem[] = PROFILE_FAQS.filter(f => {
    const s = (f.section || '').toLowerCase();
    const scr = (f.screen || '').toLowerCase();
    return s === 'tutor' || scr.includes('tutor');
  });

  constructor(
    private modalCtrl: ModalController,
    private route: ActivatedRoute,
    private tutorApi: TutorApi
  ) { }

  ngOnInit(): void {
    this.loadFromRoute();
  }

  private loadFromRoute(): void {
    const id = this.route.snapshot.paramMap.get('id') || '1';
    // If tutor already present (modal), skip fetch
    if (this.tutor) return;

    // Try API for tutor details
    this.tutorApi.getTutorById(id).subscribe(resp => {
      if (resp) {
        // normalize response into ITutor
        this.tutor = normalizeTutor(resp);
      } else {
        console.warn('[TutorProfile] tutor not found for id', id);
      }
    }, err => {
      console.error('[TutorProfile] error fetching tutor', err);
    });
  }

  async close(): Promise<void> {
    // Try to dismiss if opened as a modal; otherwise fallback to history.back()
    try {
      await this.modalCtrl.dismiss();
      return;
    } catch (e) {
      // Not a modal or dismiss failed — fallback below
    }

    try {
      window.history.back();
    } catch (err) {
      // as a last resort, log and do nothing
      console.warn('[TutorProfile] unable to navigate back', err);
    }
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
    return parseExperienceYears(this.tutor?.experience);
  }

  /**
   * Get formatted experience string
   */
  getExperienceString(): string {
    return formatExperience(this.tutor?.experience);
  }

  /**
   * Get formatted subjects string
   */
  getSubjectsString(): string {
    const subjects = this.tutor?.subjects;
    if (!subjects || (Array.isArray(subjects) && subjects.length === 0)) {
      return this.tutor?.qualification || 'Various Subjects';
    }
    return Array.isArray(subjects) ? subjects.join(', ') : String(subjects);
  }

  /**
   * Get formatted levels/classes string
   */
  getLevelsString(): string {
    const levels = this.tutor?.levels || this.tutor?.classes;
    return formatLevels(levels);
  }

  /**
   * Get formatted contact modes string
   */
  getContactModesString(): string {
    return formatContactModes(this.tutor?.contactModes);
  }

  /**
   * Get formatted availability string
   */
  getAvailabilityString(): string {
    if (!this.tutor) return 'Schedule not available';
    const days = formatAvailability(this.tutor.availability);
    const startTime = this.tutor.startTime ? formatTime(this.tutor.startTime) : '';
    const endTime = this.tutor.endTime ? formatTime(this.tutor.endTime) : '';
    if (startTime && endTime) return `${days} - ${startTime} - ${endTime}`;
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
    if (!this.tutor?.feeType) return '/ Hour';
    const feeTypeMap: Record<string, string> = {
      'PER_HOUR': '/ Hour',
      'PER_MONTH': '/per month',
      'PER_SESSION': '/per session',
      'PER_COURSE': '/per course'
    };
    return feeTypeMap[this.tutor.feeType] || '/ Hour';
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

  /**
   * Get formatted languages string
   */
  getLanguagesString(): string {
    // TODO: Add languages property to ITutor model when available from API
    return 'English, Hindi';
  }

  /**
   * Toggle FAQ accordion item
   */
  toggleFaq(index: number): void {
    this.expandedFaqIndex = this.expandedFaqIndex === index ? null : index;
  }

  /**
   * Toggle favorite/like status
   */
  onFavorite(): void {
    this.isLiked = !this.isLiked;
    console.log('Favorite toggled for:', this.tutor?.name, '| Liked:', this.isLiked);
  }

  /**
   * Open map view for tutor location
   */
  viewOnMap(): void {
    const location = this.tutor?.location;
    console.log('View on map clicked:', location);
    // TODO: Integrate with Google Maps or similar mapping service
    if (location) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
    }
  }

  /**
   * Book a call with the tutor
   */
  bookCall(): void {
    // Open contact options popup instead of immediate booking
    this.showContactPopup = true;
    this.contactMode = 'call';
  }

  closeContactPopup(): void {
    this.showContactPopup = false;
  }

  selectContactMode(mode: 'call' | 'email') {
    this.contactMode = mode;
  }

  copyPhoneNumber(): void {
    const src: any = this.tutor as any;
    const phone = src?.phone || src?.contactNumber || src?.mobile || src?.contact || '';
    if (!phone) {
      console.warn('No phone number available to copy');
      return;
    }

    try {
      navigator.clipboard.writeText(phone);
      // quick feedback — replace with toast if available
      alert('Phone number copied to clipboard');
      this.closeContactPopup();
    } catch (e) {
      console.error('Copy failed', e);
    }
  }

  handlePrimaryContactAction(): void {
    if (this.contactMode === 'email') {
      this.sendEmail();
    } else {
      this.copyPhoneNumber();
    }
  }

  sendEmail(): void {
    const src: any = this.tutor as any;
    const email = src?.email || src?.contactEmail || src?.emailAddress || '';
    if (!email) {
      console.warn('No email available to send to');
      alert('No email address available for this tutor');
      return;
    }

    const subject = encodeURIComponent('Regarding tutoring');
    const body = encodeURIComponent('Hi, I would like to get in touch regarding tutoring.');
    // open mail client
    try {
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      this.closeContactPopup();
    } catch (e) {
      console.error('Unable to open mail client', e);
    }
  }
}
