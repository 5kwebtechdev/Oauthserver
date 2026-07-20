import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { ProfileFactsComponent, FaqItem, PROFILE_FAQS } from '../../user-profile/profile-facts/profile-facts.component';
import {
  Tutor,
  TutorCategory,
  formatExperience,
  formatAvailability,
  formatTime,
  formatLevels,
  formatContactModes,
  getExperienceYears
} from '../../../models/tutor.model';
import { TutorApi } from '../../../api/tutor.api';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { TutorLikeService } from '../../../services/tutor-like.service';
import { CustomToastService, Toast } from '../../../services/custom-toast.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'tutor-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeButtonComponent, SupermeNavigatorComponent, ProfileFactsComponent, HttpClientModule],
  templateUrl: './tutor-profile.component.html',
  styleUrls: ['./tutor-profile.component.scss']
})
export class TutorProfileComponent implements OnInit, OnDestroy {
  @Input() tutor: Tutor | undefined;
  @Input() categoryKey: string | null = null;
  categoryFieldRows: Array<{ label: string; value: string }> = [];
  readonly fallbackProfileImage = 'assets/Images-Transparent/Image-Tutor.png';

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

  // Transient contact message
  contactToastMessage = 'Ask your parent to reach out';
  // Observable for shared toast service (add toast HTML to template)
  toast$: Observable<Toast | null> = this.toastService.toast$;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private likeService: TutorLikeService,
    private location: Location,
    private modalCtrl: ModalController
    , private toastService: CustomToastService
    , private tutorApi: TutorApi
  ) { }

  ngOnInit(): void {
    this.categoryFieldRows = this.buildCategoryFieldRows();
    this.loadCategoryFieldLabels();

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

  async close(): Promise<void> {
    // If opened as an Ionic modal, dismiss it to return to the entry page.
    try {
      const top = await this.modalCtrl.getTop();
      if (top) {
        await top.dismiss();
        return;
      }
    } catch (e) {
      // ignore and fall back to history
    }

    // Fallback: navigate back in browser history
    try { this.location.back(); } catch (e) { window.history.back(); }
  }

  getLikesCount(): number {
    return this.tutor?.champsLiked || this.tutor?.likes?.length || 0;
  }

  getExperienceYears(): number {
    // Prefer the direct numeric value the admin entered per category mapping
    const fromMappings = (this.tutor?.categoryMappings || [])
      .reduce((max, m) => Math.max(max, m.yearsOfExperience || 0), 0);
    if (fromMappings > 0) return fromMappings;
    // Fall back to the top-level experience enum
    if (!this.tutor?.experience) return 0;
    return getExperienceYears(this.tutor.experience);
  }

  getExperienceString(): string {
    const fromMappings = (this.tutor?.categoryMappings || [])
      .reduce((max, m) => Math.max(max, m.yearsOfExperience || 0), 0);
    if (fromMappings > 0) return `${fromMappings}+ years Exp`;
    if (!this.tutor?.experience || this.tutor.experience === 'FRESHER') return 'Fresher';
    return formatExperience(this.tutor.experience);
  }

  isAcademyProfile(): boolean {
    const rawType = String((this.tutor as any)?.entityType || '').toUpperCase();
    return rawType === 'ACADEMY' || rawType === 'ACADEMY_PROFILE';
  }

  getProfileHeading(): string {
    return '';
  }

  getProfileNameFallback(): string {
    return this.isAcademyProfile() ? 'Unknown Academy' : 'Unknown Tutor';
  }

  getProfileImage(): string {
    return this.tutor?.profilePicUrl?.trim() || this.fallbackProfileImage;
  }

  onProfileImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith(this.fallbackProfileImage)) {
      image.src = this.fallbackProfileImage;
    }
  }

  getProfileSubtitle(): string {
    const t = this.tutor as any;
    return t?.headline || this.tutor?.qualification || (this.isAcademyProfile() ? 'Academy' : 'Subject Expert');
  }

  getTeachHeading(): string {
    return this.isAcademyProfile() ? 'What we teach' : 'What I teach';
  }

  getContactCtaLabel(): string {
    return this.isAcademyProfile() ? 'Contact Academy' : 'Contact Tutor';
  }

  getContactSheetTitle(): string {
    return this.isAcademyProfile() ? 'Get in touch with Academy' : 'Get in touch with Tutor';
  }

  getSubjectsString(): string {
    if (!this.tutor?.subjects || this.tutor.subjects.length === 0) {
      return (this.tutor as any)?.headline || this.tutor?.qualification || 'Various Subjects';
    }
    return this.tutor.subjects.join(', ');
  }

  private loadCategoryFieldLabels(): void {
    this.tutorApi.getTutorCategories().subscribe({
      next: categories => {
        this.categoryFieldRows = this.buildCategoryFieldRows(categories);
      },
      error: () => {
        this.categoryFieldRows = this.buildCategoryFieldRows();
      }
    });
  }

  private buildCategoryFieldRows(categories: TutorCategory[] = []): Array<{ label: string; value: string }> {
    const allMappings = this.tutor?.categoryMappings || [];
    const selectedCategory = this.findSelectedCategory(categories);
    const mappings = selectedCategory
      ? allMappings.filter(mapping => String(mapping.categoryId) === String(selectedCategory.id))
      : allMappings.slice(0, 1);
    const mergedRows = new Map<string, { label: string; values: string[]; order: number }>();

    mappings.forEach((mapping, mappingIndex) => {
      const category = categories.find(cat => String(cat.id) === String(mapping.categoryId));
      const selectedOptions = this.parseSelectedFieldOptions(mapping.selectedFieldOptions);

      Object.entries(selectedOptions).forEach(([fieldKey, rawValue], fieldIndex) => {
        if (!this.isTeachingField(fieldKey)) return;

        const values = this.normalizeFieldValue(rawValue);
        if (values.length === 0) return;

        const field = category?.fields?.find(item => this.normalizeKey(item.fieldKey) === this.normalizeKey(fieldKey));
        const label = field?.fieldLabel || this.formatFieldLabel(fieldKey);
        const displayValues = values.map(value => this.getOptionDisplayValue(value, field)).filter(Boolean);
        if (displayValues.length === 0) return;

        const mapKey = label.toLowerCase();
        const existing = mergedRows.get(mapKey);
        const order = ((category?.displayOrder ?? mappingIndex) * 100) + (field?.displayOrder ?? fieldIndex);

        if (existing) {
          existing.values = [...new Set([...existing.values, ...displayValues])];
          existing.order = Math.min(existing.order, order);
        } else {
          mergedRows.set(mapKey, {
            label,
            values: [...new Set(displayValues)],
            order
          });
        }
      });
    });

    const rows = Array.from(mergedRows.values())
      .sort((a, b) => a.order - b.order)
      .map(row => ({
        label: row.label,
        value: row.values.join(', ')
      }));

    if (rows.length > 0) {
      return rows;
    }

    // Use API field definitions with direct tutor values when a mapping has no selected values.
    const fallbackCategory = selectedCategory || (mappings.length > 0
      ? categories.find(category => String(category.id) === String(mappings[0].categoryId))
      : undefined);
    if (fallbackCategory?.fields?.length) {
        const fallbackRows = fallbackCategory.fields
          .slice()
          .filter(field => this.isTeachingField(field.fieldKey))
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(f => ({ label: f.fieldLabel, value: this.guessValueForField(f.fieldKey) }))
          .filter(r => !!r.value);
        if (fallbackRows.length > 0) return fallbackRows;
    }

    return [];
  }

  private guessValueForField(fieldKey: string): string {
    const k = this.normalizeKey(fieldKey);
    const tutor = this.tutor as any;

    if (k.includes('language')) {
      return this.joinDirectValues(tutor?.languages, tutor?.languagesOffered, tutor?.subjects);
    }
    if (k.includes('subject') || k.includes('stream') || k.includes('course') || k.includes('degree') ||
        k.includes('topic') || k.includes('hobby') || k.includes('activity') || k.includes('exam') || k.includes('skill')) {
      return this.joinDirectValues(tutor?.subjects);
    }
    if (k.includes('class') || k.includes('grade') || k.includes('year') || k.includes('level')) {
      const levels = this.normalizeFieldValue(tutor?.levels || tutor?.classes || []);
      return levels.length > 0 ? formatLevels(levels) : '';
    }
    if (k.includes('board')) {
      return this.joinDirectValues(tutor?.boards);
    }
    return '';
  }

  private parseSelectedFieldOptions(selectedFieldOptions: string | Record<string, unknown> | null | undefined): Record<string, unknown> {
    if (!selectedFieldOptions) return {};
    if (typeof selectedFieldOptions === 'object' && !Array.isArray(selectedFieldOptions)) {
      return selectedFieldOptions;
    }

    try {
      let parsed: unknown = JSON.parse(String(selectedFieldOptions));
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

    if (value === null || value === undefined) {
      return [];
    }

    if (typeof value === 'object') {
      const item = value as Record<string, unknown>;
      return this.normalizeFieldValue(item['optionValue'] ?? item['value'] ?? item['optionLabel'] ?? item['label']);
    }

    const text = String(value).trim();
    return text ? text.split(',').map(item => item.trim()).filter(Boolean) : [];
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
    const aliases: Record<string, string> = {
      LANGUAGES: 'LANGUAGE',
      EXAM: 'EXAMS',
      OTHER: 'OTHERS'
    };
    return aliases[normalized] || normalized;
  }

  private isTeachingField(fieldKey: string): boolean {
    const key = this.normalizeKey(fieldKey);
    return !['TUTORTYPE', 'MODE', 'LOCATION'].includes(key);
  }

  private normalizeKey(value: unknown): string {
    return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  }

  private joinDirectValues(...values: unknown[]): string {
    const items = values.reduce<string[]>((result, value) => result.concat(this.normalizeFieldValue(value)), []);
    return [...new Set(items)].join(', ');
  }

  private formatFieldLabel(fieldKey: string): string {
    return fieldKey
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  private formatEnumValue(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  getLevelsString(): string {
    const levels = this.tutor?.levels?.length
      ? this.tutor.levels
      : ((this.tutor as any)?.classes || []);

    if (!levels || levels.length === 0) {
      return this.isAcademyProfile() ? 'Not specified' : 'All Levels';
    }
    return formatLevels(levels);
  }

  getContactModesString(): string {
    if (!this.tutor?.contactModes || this.tutor.contactModes.length === 0) {
      return this.isAcademyProfile() ? 'Not specified' : 'Online, Offline';
    }
    return formatContactModes(this.tutor.contactModes);
  }

  getLanguagesString(): string {
    const directLanguages = [
      ...(((this.tutor as any)?.languages || []) as string[]),
      ...(((this.tutor as any)?.languagesOffered || []) as string[])
    ].map(item => String(item).trim()).filter(Boolean);

    if (directLanguages.length > 0) {
      return [...new Set(directLanguages)].join(', ');
    }

    const languageRows = this.categoryFieldRows
      .filter(row => row.label.toLowerCase().includes('language'))
      .map(row => row.value)
      .filter(Boolean);

    return languageRows.length > 0 ? [...new Set(languageRows)].join(', ') : 'Not specified';
  }

  getAvailabilityString(): string {
    if (!this.tutor) return 'Schedule not available';

    const days = this.tutor.availability?.length > 0
      ? formatAvailability(this.tutor.availability)
      : 'Not specified';

    const startTime = this.tutor.startTime ? this.formatDisplayTime(this.tutor.startTime) : '';
    const endTime = this.tutor.endTime ? this.formatDisplayTime(this.tutor.endTime) : '';

    if (startTime && endTime) {
      return `${days} - ${startTime} - ${endTime}`;
    }
    return days;
  }

  getHourlyRate(): number {
    return this.tutor?.hourlyRate || this.tutor?.fees || 0;
  }

  getFeeTypeString(): string {
    if (!this.tutor?.feeType) return '/per hour';
    const feeTypeMap: Record<string, string> = {
      'PER_HOUR': '/per hour',
      'PER_MONTH': '/per month',
      'PER_SESSION': '/per session',
      'PER_COURSE': '/per course',
      'PER_SUBJECT': '/per subject'
    };
    return feeTypeMap[this.tutor.feeType] || '/per hour';
  }

  getBoardString(): string {
    const directBoards = ((this.tutor as any)?.boards || [])
      .map((item: any) => String(item).trim())
      .filter(Boolean);

    if (directBoards.length > 0) {
      return [...new Set(directBoards)].join(', ');
    }

    if (!this.tutor?.categoryMappings || this.tutor.categoryMappings.length === 0) {
      return this.isAcademyProfile() ? 'Not specified' : 'CBSE, State Board';
    }

    const boards: string[] = [];
    this.tutor.categoryMappings.forEach(mapping => {
      const options = this.parseSelectedFieldOptions(mapping.selectedFieldOptions);
      boards.push(...this.normalizeFieldValue(options['boards'] ?? options['board']));
    });

    return boards.length > 0 ? [...new Set(boards)].join(', ') : (this.isAcademyProfile() ? 'Not specified' : 'CBSE, State Board');
  }

  getQualificationDetailLabel(): string {
    return this.isAcademyProfile() ? 'About' : 'Qualification';
  }

  getQualificationDetailValue(): string {
    const t = this.tutor as any;
    return t?.headline || this.tutor?.qualification || 'Not specified';
  }

  private formatDisplayTime(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const match = raw.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return formatTime(raw);
  }

  /**
   * Build the full location string from all available address fields.
   * Falls back to tutor.location (city only) if granular fields are absent.
   * API returns: addressLine, city, state, pincode, country
   */
  getFullLocation(): string {
    const t = this.tutor as any;
    if (!t) return 'Location not specified';

    const parts: string[] = [];

    if (t.addressLine) parts.push(t.addressLine);
    if (t.city)        parts.push(t.city);
    if (t.state)       parts.push(t.state);
    if (t.pincode)     parts.push(t.pincode);
    if (t.country)     parts.push(t.country);

    if (parts.length > 0) return parts.join(', ');

    return t.location || 'Location not specified';
  }

  onFavorite(): void {
    console.log('Favorite clicked for:', this.tutor?.name);
  }

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
      this.likeService.toggleLike(this.tutor);
      this.onFavorite();
    }
  }

  contactTutor(): void {
    if (this.isChildUser()) {
      this.showTransientContactToast();
      console.warn('Contact disabled for child users');
      return;
    }

    this.openContactSheet();
  }

  private showTransientContactToast(durationMs = 3000): void {
    this.toastService.error(this.contactToastMessage, durationMs);
  }

  ngOnDestroy(): void {
    // no local timeouts to clear; shared toast service auto-hides
  }

  openContactSheet(): void {
    this.selectedContactMethod = 'call';
    this.showContactSheet = true;
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
    this.closeContactSheet();

    if (!method) return;

    const openUrl = async (url: string) => {
      try {
        const mod = await import('@capacitor/app');
        const appAny: any = (mod && (mod as any).App) || null;
        if (appAny && typeof appAny.openUrl === 'function') {
          await appAny.openUrl({ url });
          return;
        }
      } catch (e) {
        // ignore and fallback
      }
      window.location.href = url;
    };

    if (method === 'call') {
      const raw = (this.tutor?.phone || '').toString().trim();
      if (!raw) return;
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
