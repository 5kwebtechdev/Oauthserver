import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { Step1Data } from './step-one.component';
import { toTutorSubmissionPhone } from './phone-country';
import { Step2Data } from './step-two.component';
import { ALL_CATEGORIES } from './category-accordion.component';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_CERT_FILES = 5;
const ACHIEVEMENT_MAX = 48;

const IMG_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const CERT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

function validateFile(file: File, accepted: string[]): 'ok' | 'format' | 'size' {
  if (!accepted.includes(file.type.toLowerCase())) return 'format';
  if (file.size > MAX_FILE_SIZE) return 'size';
  return 'ok';
}

// Whole-years age from a yyyy-mm-dd date string, matching how AdminTutorController
// computes/expects age server-side. This is the ONLY age-calculation logic in
// this file — a duplicate Date-based version (formatDob/calculateAge as class
// methods, expecting a s1.dob: Date property that doesn't exist on Step1Data)
// was removed here; it was leftover from a different, incompatible attempt.
function calculateAge(dobString: string): number {
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

@Component({
  selector: 'app-tutor-step-three',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './step-three.component.html',
})
export class StepThreeComponent implements OnChanges {
  @Input() step1Data!: Step1Data;
  @Input() step2Data!: Step2Data;
  @Output() back = new EventEmitter<void>();

  // Retained across back/forward navigation via parent-hoisted inputs
  @Input() initialProfilePicture: File | null = null;
  @Input() initialCertifications: File[] = [];
  @Input() initialAchievement = '';
  @Output() profilePictureChange = new EventEmitter<File | null>();
  @Output() certificationsChange = new EventEmitter<File[]>();
  @Output() achievementChange = new EventEmitter<string>();

  readonly achievementMax = ACHIEVEMENT_MAX;
  readonly maxCertFiles = MAX_CERT_FILES;

  profilePicture: File | null = null;
  profilePicPreview: string | null = null;
  certifications: File[] = [];
  certPreviews: (string | null)[] = [];
  achievement = '';

  submitted = false;
  isSubmitting = false;
  success = false;

  dragOverProfile = false;
  dragOverCert = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialProfilePicture']) {
      this.profilePicture = this.initialProfilePicture;
      this.refreshProfilePreview();
    }
    if (changes['initialCertifications']) {
      this.certifications = this.initialCertifications ? [...this.initialCertifications] : [];
      this.refreshCertPreviews();
    }
    if (changes['initialAchievement']) {
      this.achievement = this.initialAchievement ?? '';
    }
  }

  get isAcademy(): boolean {
    return this.step1Data?.entityType === 'Academy';
  }

  get picError(): string {
    return this.profilePicture ? validateFile(this.profilePicture, IMG_TYPES) : '';
  }

  get hasPicError(): boolean {
    return this.picError !== '' && this.picError !== 'ok';
  }

  get certErrors(): string[] {
    return this.certifications.map((f) => {
      const r = validateFile(f, CERT_TYPES);
      return r === 'ok' ? '' : r;
    });
  }

  get hasCertError(): boolean {
    return this.certErrors.some(Boolean);
  }

  get isValid(): boolean {
    return (
      this.profilePicture !== null &&
      !this.hasPicError &&
      !this.hasCertError &&
      this.achievement.length <= ACHIEVEMENT_MAX
    );
  }

  get certTiles(): number[] {
    return Array.from({ length: MAX_CERT_FILES }, (_, i) => i);
  }

  private refreshProfilePreview(): void {
    this.profilePicPreview =
      this.profilePicture && this.profilePicture.type.startsWith('image/')
        ? URL.createObjectURL(this.profilePicture)
        : null;
  }

  private refreshCertPreviews(): void {
    this.certPreviews = this.certifications.map((f) =>
      f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    );
  }

  // ── Profile picture ──────────────────────────────────────────────────────
  onProfileFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setProfilePicture(file);
    input.value = '';
  }

  onProfileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOverProfile = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setProfilePicture(file);
  }

  setProfilePicture(file: File): void {
    this.profilePicture = file;
    this.refreshProfilePreview();
    this.profilePictureChange.emit(file);
  }

  clearProfilePicture(): void {
    this.profilePicture = null;
    this.profilePicPreview = null;
    this.profilePictureChange.emit(null);
  }

  // ── Certifications ───────────────────────────────────────────────────────
  onCertFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.addCertFiles(files);
    input.value = '';
  }

  onCertDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOverCert = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.addCertFiles(files);
  }

  addCertFiles(newFiles: File[]): void {
    this.certifications = [...this.certifications, ...newFiles].slice(0, MAX_CERT_FILES);
    this.refreshCertPreviews();
    this.certificationsChange.emit(this.certifications);
  }

  removeCertFile(idx: number): void {
    this.certifications = this.certifications.filter((_, i) => i !== idx);
    this.refreshCertPreviews();
    this.certificationsChange.emit(this.certifications);
  }

  onAchievementInput(value: string): void {
    this.achievement = value;
    this.achievementChange.emit(value);
  }

  truncateName(name: string): string {
    return name.length > 20 ? name.slice(0, 18) + '…' : name;
  }

  handleBack(): void {
    this.back.emit();
  }

  navigateHome(): void {
    this.router.navigate(['/']);
  }

  // ── Submit — posts to backend (unchanged endpoint/contract from previous version) ──
  handleSubmit(): void {
    this.submitted = true;
    if (!this.isValid) return;

    const s1 = this.step1Data;
    const s2 = this.step2Data;
    const submissionPhone = toTutorSubmissionPhone(s1.phone, s1.phoneCountry);
    const phone2 = s1.phone2 ? toTutorSubmissionPhone(s1.phone2, s1.phone2Country) : '';
    const phone3 = s1.phone3 ? toTutorSubmissionPhone(s1.phone3, s1.phone3Country) : '';
    if (phone2 === undefined || phone3 === undefined) return;
    if (!submissionPhone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s1.email.trim()) || s1.email.trim().length > 254) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const title = s1.entityType === 'Academy' ? s1.name : `${s1.gender === 'Male' ? 'Mr.' : 'Ms.'} ${s1.name}`;

    const fd = new FormData();

    const firstSlot = s2.slots[0];
    const categoryLabels = s2.categories.map((id) => ALL_CATEGORIES.find((c) => c.id === id)!.label);

    const params: Record<string, string> = {
      name: s1.name,
      time: timeString,
      entity_name: s1.name,
      entity_type: s1.entityType,
      gender: s1.gender,
      phone: submissionPhone,
      phone2, phone3,
      email: s1.email.trim(),
      date_of_birth: s1.dateOfBirth ?? '',
      calculated_age: s1.dateOfBirth ? String(calculateAge(s1.dateOfBirth)) : '',
      address: s2.address,
      selected_category: categoryLabels.join(', '),
      selected_teach_mode: s2.teachingMode.join(', '),
      selected_spoken_langs: s2.languagesSpoken.join(', '),
      selected_experience: s2.experience,
      selected_fee_type: s2.feeType,
      fee_amount: s2.fees,
      selected_days: firstSlot?.days.join(', ') ?? '',
      start_time: firstSlot?.startTime ?? '',
      end_time: firstSlot?.endTime ?? '',
      // Full multi-slot schedule (new in this version) — backend should parse this
      // JSON array if it needs to support more than one time slot per tutor.
      all_time_slots: JSON.stringify(s2.slots),
      qualification: s2.qualification,
      achievement: this.achievement,
      title,
    };

    // Per-category selections — mapped to the same backend param names your
    // API already expects from the previous (5-step) version of this form.
    const asStr = (val: string[] | string | undefined): string =>
      Array.isArray(val) ? val.join(', ') : (val as string) || '';

    const school = s2.categoryData.school ?? {};
    const college = s2.categoryData.college ?? {};
    const languages = s2.categoryData.languages ?? {};
    const hobbies = s2.categoryData.hobbies ?? {};
    const exams = s2.categoryData.exams ?? {};
    const sports = s2.categoryData.sports ?? {};
    const others = s2.categoryData.others ?? {};

    Object.assign(params, {
      selected_boards: asStr(school['board']),
      selected_classes: asStr(school['class']),
      selected_school_subjects: asStr(school['subjects']),
      selected_degree: asStr(college['degreeStream']),
      selected_year: asStr(college['year']),
      selected_lang_list: asStr(languages['languages']),
      selected_lang_level: asStr(languages['proficiency']),
      selected_hobbies_skills: asStr(hobbies['skill']),
      selected_hobbies_level: asStr(hobbies['proficiency']),
      selected_hobbies_age: asStr(hobbies['ageGroup']),
      selected_exams: asStr(exams['targetExams']),
      selected_sports_acts: asStr(sports['activities']),
      selected_sports_age: asStr(sports['ageGroup']),
      selected_others_skills: asStr(others['skill']),
      selected_others_level: asStr(others['level']),
    });

    for (const [key, val] of Object.entries(params)) {
      fd.append(`template_params[${key}]`, val);
    }

    if (this.profilePicture) {
      fd.append('profile_pic', this.profilePicture, this.profilePicture.name);
    }
    for (const doc of this.certifications) {
      fd.append('documents[]', doc, doc.name);
    }

    const baseUrl = environment.apiUrl.replace(/\/v1$/, '');
    const endpoint = `${baseUrl}/v1/public/request-tutor-register`;

    this.isSubmitting = true;

    this.http.post(endpoint, fd).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.success = true;
        window.scrollTo(0, 0);
      },
      error: (error: unknown) => {
        console.error('Tutor registration error:', error);
        this.isSubmitting = false;
      },
    });
  }
}