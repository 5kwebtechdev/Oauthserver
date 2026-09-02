import { CommonModule, Location } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { environment } from '../../../../../environments/environment';
import { AuthApi } from '../../../api/auth.api';
import { RefreshService } from '../../../services/refresh.service';

interface JournalOption {
  label: string;
  image: string;
}

interface JournalSection {
  key: string;
  title: string;
  icon: string;
  columns: number;
  options: JournalOption[];
}

interface UploadedJournalImage {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-journal-input',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './journal-input.component.html',
  styleUrls: ['./journal-input.component.scss'],
})
export class JournalInputComponent implements OnInit, OnDestroy {
  @Input() initialText = '';
  @Input() placeholder = 'Add a note to your journal';
  @Output() save = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private static readonly MAX_IMAGES = 3;
  text = '';
  selected: Record<string, number | null> = {};
  uploadedImages: UploadedJournalImage[] = [];
  emotionError: string | null = null;
  imageUploadError: string | null = null;
  noteMaxLength = 100;
  currentUploadIndex = -1;
  submitting = false;

  readonly sections: JournalSection[] = [
    {
      key: 'emotions',
      title: 'How are you feeling?',
      icon: 'assets/figma/journal/mood.svg',
      columns: 4,
      options: [
        { label: 'Happy', image: 'assets/figma/journal/mood-happy.png' },
        { label: 'Excited', image: 'assets/figma/journal/mood-excited.png' },
        { label: 'Calm', image: 'assets/figma/journal/mood-calm.png' },
        { label: 'Sad', image: 'assets/figma/journal/mood-sad.png' },
        { label: 'Anxious', image: 'assets/figma/journal/mood-anxious.png' },
        { label: 'Frustated', image: 'assets/figma/journal/mood-frustrated.png' },
      ],
    },
    {
      key: 'sleep',
      title: 'How was your sleep?',
      icon: 'assets/figma/journal/bedtime.svg',
      columns: 4,
      options: [
        { label: 'Deep', image: 'assets/figma/journal/sleep-deep-figma.png' },
        { label: 'Moderate', image: 'assets/figma/journal/sleep-moderate-figma.png' },
        { label: 'Disturbed', image: 'assets/figma/journal/sleep-disturbed-figma.png' },
        { label: 'Awake', image: 'assets/figma/journal/sleep-awake-figma.png' },
      ],
    },
    {
      key: 'health',
      title: 'How’s your health?',
      icon: 'assets/figma/journal/health.svg',
      columns: 4,
      options: [
        { label: 'Good', image: 'assets/figma/journal/health-good.png' },
        { label: 'Normal', image: 'assets/figma/journal/health-normal.png' },
        { label: 'Unwell', image: 'assets/figma/journal/health-unwell-new.png' },
        { label: 'Quite Sick', image: 'assets/figma/journal/health-quite-sick-new.png' },
      ],
    },
    {
      key: 'hobbies',
      title: 'What did you do?',
      icon: 'assets/figma/journal/interests.svg',
      columns: 4,
      options: [
        { label: 'Movies', image: 'assets/figma/journal/activity-movies.png' },
        { label: 'Reading', image: 'assets/figma/journal/activity-reading.png' },
        { label: 'Art', image: 'assets/figma/journal/activity-art.png' },
        { label: 'Sport', image: 'assets/figma/journal/activity-sport.png' },
        { label: 'Music', image: 'assets/figma/journal/activity-music.png' },
        { label: 'Travel', image: 'assets/figma/journal/activity-travel.png' },
        { label: 'Exercise', image: 'assets/figma/journal/activity-exercise.png' },
      ],
    },
    {
      key: 'social',
      title: 'Who were you with?',
      icon: 'assets/figma/journal/group.svg',
      columns: 4,
      options: [
        { label: 'Family', image: 'assets/figma/journal/social-family.png' },
        { label: 'Friends', image: 'assets/figma/journal/social-friends.png' },
        { label: 'Party', image: 'assets/figma/journal/social-party.png' },
        { label: 'Alone', image: 'assets/figma/journal/social-alone.png' },
      ],
    },
    {
      key: 'school',
      title: 'How was school/college today?',
      icon: 'assets/figma/journal/school.svg',
      columns: 4,
      options: [
        { label: 'Exam', image: 'assets/figma/journal/school-exam.png' },
        { label: 'Hard', image: 'assets/figma/journal/school-hard.png' },
        { label: 'Easy', image: 'assets/figma/journal/school-easy.png' },
        { label: 'Fun', image: 'assets/figma/journal/school-fun.png' },
      ],
    },
    {
      key: 'growth',
      title: 'How did you grow today?',
      icon: 'assets/figma/journal/growth.svg',
      columns: 4,
      options: [
        { label: 'Exercise', image: 'assets/figma/journal/growth-exercise.png' },
        { label: 'Learnings', image: 'assets/figma/journal/growth-learning.png' },
        { label: 'Meditation', image: 'assets/figma/journal/growth-meditation.png' },
        { label: 'Listen', image: 'assets/figma/journal/growth-listen.png' },
      ],
    },
  ];

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly authApi: AuthApi,
    private readonly refreshService: RefreshService,
    private readonly location: Location,
  ) {}

  ngOnInit(): void {
    this.text = this.initialText || '';
  }

  ngOnDestroy(): void {
    this.revokePreviewUrls();
  }

  get notesCharCount(): number {
    return (this.text || '').length;
  }

  get isPostEnabled(): boolean {
    return this.selected['emotions'] != null && !this.submitting;
  }

  get canAddMoreImages(): boolean {
    return this.uploadedImages.length < JournalInputComponent.MAX_IMAGES;
  }

  selectOption(section: string, index: number): void {
    this.selected[section] = this.selected[section] === index ? null : index;
    if (section === 'emotions' && this.selected['emotions'] != null) this.emotionError = null;
  }

  isSelected(section: string, index: number): boolean {
    return this.selected[section] === index;
  }

  trackBySection(_: number, section: JournalSection): string {
    return section.key;
  }

  trackByOption(_: number, option: JournalOption): string {
    return option.label;
  }

  onNotesInput(): void {
    if (this.text.length > this.noteMaxLength) this.text = this.text.slice(0, this.noteMaxLength);
  }

  async submit(): Promise<void> {
    if (this.submitting) return;
    if (this.selected['emotions'] == null) {
      this.emotionError = 'How are you feeling? Pick an emotion to continue.';
      this.scrollToMood();
      return;
    }

    const formData = new FormData();
    formData.append('notes', this.text || '');
    this.sections.forEach((section) => {
      const selectedIndex = this.selected[section.key];
      if (selectedIndex != null) formData.append(section.key, section.options[selectedIndex].label.toLowerCase());
    });
    this.uploadedImages.forEach(({ file }) => formData.append('files', file));

    this.submitting = true;
    this.http.post(`${environment.apiUrl}/journal/add`, formData, this.authHeaders()).subscribe({
      next: () => {
        this.refreshService.notifyJournalAdded();
        this.save.emit(this.text);
        this.resetForm();
        this.submitting = false;
        void this.router.navigate(['/authed/journal-output']);
      },
      error: (error) => {
        console.error('Failed to add journal', error);
        this.submitting = false;
        this.emotionError = 'Your journal could not be saved. Please try again.';
      },
    });
  }

  triggerNativeFilePicker(): void {
    if (!this.canAddMoreImages) return;
    this.currentUploadIndex = this.uploadedImages.length;
    this.fileInput?.nativeElement.click();
  }

  triggerFileInput(index: number): void {
    if (index >= JournalInputComponent.MAX_IMAGES) return;
    this.currentUploadIndex = index;
    this.fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    try {
      const file = input.files?.[0];
      if (!file) return;
      if ((file.type && !file.type.startsWith('image/'))
        || (!file.type && !/\.(jpg|jpeg|png|gif|webp|heic)$/i.test(file.name))) {
        this.imageUploadError = 'Please choose a valid image.';
        return;
      }
      if (file.size > 7 * 1024 * 1024) {
        this.imageUploadError = 'Image size must be 7 MB or less.';
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      const index = this.currentUploadIndex >= 0 ? this.currentUploadIndex : this.uploadedImages.length;
      if (index < this.uploadedImages.length) {
        URL.revokeObjectURL(this.uploadedImages[index].previewUrl);
        this.uploadedImages[index] = { file, previewUrl };
      } else if (index < JournalInputComponent.MAX_IMAGES) {
        this.uploadedImages.push({ file, previewUrl });
      }
      this.imageUploadError = null;
    } finally {
      input.value = '';
      this.currentUploadIndex = -1;
    }
  }

  removeImage(index: number): void {
    const image = this.uploadedImages[index];
    if (!image) return;
    URL.revokeObjectURL(image.previewUrl);
    this.uploadedImages.splice(index, 1);
  }

  goBack(): void {
    this.cancel.emit();
    this.location.back();
  }

  private authHeaders(): { headers: HttpHeaders } {
    const token = this.authApi.getToken();
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    return { headers };
  }

  private scrollToMood(): void {
    document.querySelector<HTMLElement>('[data-section="emotions"]')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  private resetForm(): void {
    this.revokePreviewUrls();
    this.text = '';
    this.selected = {};
    this.uploadedImages = [];
    this.imageUploadError = null;
    this.emotionError = null;
    if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
  }

  private revokePreviewUrls(): void {
    this.uploadedImages.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
  }
}
