import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { ProfileFactsComponent, FaqItem, PROFILE_FAQS } from '../../user-profile/profile-facts/profile-facts.component';

export interface TutorProfile {
  name?: string;
  avatar?: string;
  rating?: number;
  students?: number;
  experience?: string;
  subjects?: string;
  classes?: string;
  board?: string;
}

@Component({
  selector: 'tutor-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulButtonComponent, MindfulNavigatorComponent, ProfileFactsComponent],
  templateUrl: './tutor-profile.component.html',
  styleUrls: ['./tutor-profile.component.scss']
})
export class TutorProfileComponent {
  @Input() tutor: TutorProfile | undefined;
  // right-side navigator actions for this profile (heart with count)
  navActions: Array<{ type: 'edit' | 'icon' | 'iconWithCount' | 'heart', src?: string, alt?: string, count?: number }> = [];
  // FAQ data to pass to ProfileFacts component — use shared PROFILE_FAQS filtered for Tutor entries
  tutorFaqs: FaqItem[] = PROFILE_FAQS.filter(f => {
    const s = (f.section || '').toLowerCase();
    const scr = (f.screen || '').toLowerCase();
    return s === 'tutor' || scr.includes('tutor');
  });

  constructor(private modalCtrl: ModalController) { }

  close() {
    this.modalCtrl.dismiss();
  }

  getExperienceParts(): { years: string } {
    const raw = this.tutor?.experience || '';
    const m = raw.match(/(\d+)/);
    if (m) return { years: m[1] };
    return { years: '8' };
  }

  onFavorite() {
    // placeholder for favorite action
    console.log('favorite clicked', this.tutor?.name);
  }

  ngOnInit() {
    // initialize with heart action; use inline SVG data URL for the provided eclipse SVG
    const svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none">  <g filter="url(#filter0_d_4507_48920)">    <foreignObject x="-10" y="-10" width="80" height="80"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(8px);clip-path:url(#bgblur_0_4507_48920_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="16" cx="30" cy="30" r="24" fill="url(#paint0_linear_4507_48920)"/>    <mask id="mask0_4507_48920" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="18" y="18" width="24" height="24">      <rect x="18" y="18" width="24" height="24" fill="#282527"/>    </mask>    <g mask="url(#mask0_4507_48920)">      <path d="M30 38.9984L28.55 37.6984C26.8667 36.1818 25.475 34.8734 24.375 33.7734C23.275 32.6734 22.4 31.6859 21.75 30.8109C21.1 29.9359 20.6458 29.1318 20.3875 28.3984C20.1292 27.6651 20 26.9151 20 26.1484C20 24.5818 20.525 23.2734 21.575 22.2234C22.625 21.1734 23.9333 20.6484 25.5 20.6484C26.3667 20.6484 27.1917 20.8318 27.975 21.1984C28.7583 21.5651 29.4333 22.0818 30 22.7484C30.5667 22.0818 31.2417 21.5651 32.025 21.1984C32.8083 20.8318 33.6333 20.6484 34.5 20.6484C36.0667 20.6484 37.375 21.1734 38.425 22.2234C39.475 23.2734 40 24.5818 40 26.1484C40 26.9151 39.8708 27.6651 39.6125 28.3984C39.3542 29.1318 38.9 29.9359 38.25 30.8109C37.6 31.6859 36.725 32.6734 35.625 33.7734C34.525 34.8734 33.1333 36.1818 31.45 37.6984L30 38.9984ZM30 36.2984C31.6 34.8651 32.9167 33.6359 33.95 32.6109C34.9833 31.5859 35.8 30.6943 36.4 29.9359C37 29.1776 37.4167 28.5026 37.65 27.9109C37.8833 27.3193 38 26.7318 38 26.1484C38 25.1484 37.6667 24.3151 37 23.6484C36.3333 22.9818 35.5 22.6484 34.5 22.6484C33.7167 22.6484 32.9917 22.8693 32.325 23.3109C31.6583 23.7526 31.2 24.3151 30.95 24.9984H29.05C28.8 24.3151 28.3417 23.7526 27.675 23.3109C27.0083 22.8693 26.2833 22.6484 25.5 22.6484C24.5 22.6484 23.6667 22.9818 23 23.6484C22.3333 24.3151 22 25.1484 22 26.1484C22 26.7318 22.1167 27.3193 22.35 27.9109C22.5833 28.5026 23 29.1776 23.6 29.9359C24.2 30.6943 25.0167 31.5859 26.05 32.6109C27.0833 33.6359 28.4 34.8651 30 36.2984Z" fill="#282527"/>    </g>  </g>  <defs>    <filter id="filter0_d_4507_48920" x="0" y="0" width="60" height="60" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">      <feFlood flood-opacity="0" result="BackgroundImageFix"/>      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>      <feOffset/>      <feGaussianBlur stdDeviation="3"/>      <feComposite in2="hardAlpha" operator="out"/>      <feColorMatrix type="matrix" values="0 0 0 0 0.419608 0 0 0 0 0.396078 0 0 0 0 0.415686 0 0 0 0.15 0"/>      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_4507_48920"/>      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_4507_48920" result="shape"/>    </filter>  </defs></svg>';
    const svgData = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);

    this.navActions = [
      { type: 'heart', src: svgData, alt: 'Heart', count: this.tutor?.rating || 0 }
    ];
  }

  // handle click coming from MindfulNavigator actions
  handleNavAction(event: any) {
    const { index, action } = event;
    if (action.type === 'heart' || action.type === 'iconWithCount') {
      // increment a local count and reflect it back
      action.count = (action.count || 0) + 1;
      // emit local favorite logic
      this.onFavorite();
    }
  }

  bookCall() {
    // placeholder for booking flow — replace with real navigation/modal when available
    console.log('Book a call clicked for', this.tutor?.name);
    alert('Booking request sent — we will contact you shortly.');
  }
}
