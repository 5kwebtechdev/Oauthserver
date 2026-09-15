import { CommonModule, Location } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { environment } from '../../../../../environments/environment';
import { AuthApi } from '../../../api/auth.api';
import { AuthService } from '../../../services/auth.service';
import { RefreshService } from '../../../services/refresh.service';

interface JournalOption {
  label: string;
  image: string;
  kind?: 'photo' | 'icon';
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
  isAge16Plus = false;
  editingEntryId: string | number | null = null;

  readonly under16Sections: JournalSection[] = [
    {
      key: 'emotions',
      title: 'How are you feeling?',
      icon: 'assets/figma/journal/mood.svg',
      columns: 4,
      options: [
        { label: 'Happy', image: 'assets/figma/journal/mood-happy.webp' },
        { label: 'Excited', image: 'assets/figma/journal/mood-excited.webp' },
        { label: 'Calm', image: 'assets/figma/journal/mood-calm.webp' },
        { label: 'Sad', image: 'assets/figma/journal/mood-sad.webp' },
        { label: 'Anxious', image: 'assets/figma/journal/mood-anxious.webp' },
        { label: 'Frustated', image: 'assets/figma/journal/mood-frustrated.webp' },
      ],
    },
    {
      key: 'sleep',
      title: 'How was your sleep?',
      icon: 'assets/figma/journal/bedtime.svg',
      columns: 4,
      options: [
        { label: 'Deep', image: 'assets/figma/journal/sleep-deep-hd.webp' },
        { label: 'Moderate', image: 'assets/figma/journal/sleep-moderate-hd.webp' },
        { label: 'Disturbed', image: 'assets/figma/journal/sleep-disturbed-hd.webp' },
        { label: 'Awake', image: 'assets/figma/journal/sleep-awake-hd.webp' },
      ],
    },
    {
      key: 'health',
      title: 'How’s your health?',
      icon: 'assets/figma/journal/health.svg',
      columns: 4,
      options: [
        { label: 'Good', image: 'assets/figma/journal/health-good.webp' },
        { label: 'Normal', image: 'assets/figma/journal/health-normal.webp' },
        { label: 'Unwell', image: 'assets/figma/journal/health-unwell-new.webp' },
        { label: 'Quite Sick', image: 'assets/figma/journal/health-quite-sick-new.webp' },
      ],
    },
    {
      key: 'hobbies',
      title: 'What did you do?',
      icon: 'assets/figma/journal/interests.svg',
      columns: 4,
      options: [
        { label: 'Movies', image: 'assets/figma/journal/activity-movies.webp' },
        { label: 'Reading', image: 'assets/figma/journal/activity-reading.webp' },
        { label: 'Art', image: 'assets/figma/journal/activity-art.webp' },
        { label: 'Sport', image: 'assets/figma/journal/activity-sport.webp' },
        { label: 'Music', image: 'assets/figma/journal/activity-music.webp' },
        { label: 'Travel', image: 'assets/figma/journal/activity-travel.webp' },
        { label: 'Exercise', image: 'assets/figma/journal/activity-exercise.webp' },
      ],
    },
    {
      key: 'social',
      title: 'Who were you with?',
      icon: 'assets/figma/journal/group.svg',
      columns: 4,
      options: [
        { label: 'Family', image: 'assets/figma/journal/social-family.webp' },
        { label: 'Friends', image: 'assets/figma/journal/social-friends.webp' },
        { label: 'Party', image: 'assets/figma/journal/social-party.webp' },
        { label: 'Alone', image: 'assets/figma/journal/social-alone.webp' },
      ],
    },
    {
      key: 'school',
      title: 'How was school/college today?',
      icon: 'assets/figma/journal/school.svg',
      columns: 4,
      options: [
        { label: 'Exam', image: 'assets/figma/journal/school-exam.webp' },
        { label: 'Hard', image: 'assets/figma/journal/school-hard.webp' },
        { label: 'Easy', image: 'assets/figma/journal/school-easy.webp' },
        { label: 'Fun', image: 'assets/figma/journal/school-fun.webp' },
      ],
    },
    {
      key: 'growth',
      title: 'How did you grow today?',
      icon: 'assets/figma/journal/growth.svg',
      columns: 4,
      options: [
        { label: 'Exercise', image: 'assets/figma/journal/growth-exercise.webp' },
        { label: 'Learnings', image: 'assets/figma/journal/growth-learning.webp' },
        { label: 'Meditation', image: 'assets/figma/journal/growth-meditation.webp' },
        { label: 'Listen', image: 'assets/figma/journal/growth-listen.webp' },
      ],
    },
  ];

  readonly age16PlusSections: JournalSection[] = [
    this.under16Sections[0],
    {
      key: 'carrying', title: 'What are you carrying today?', icon: 'assets/figma/journal/adult/carrying.svg', columns: 4,
      options: [
        ['Relaxed', 'relaxed'], ['Bored', 'bored'], ['Tired', 'tired'], ['Angry', 'angry'],
        ['Stressed', 'stressed'], ['Desperate', 'desperate'], ['Depressed', 'depressed'], ['Lonely', 'lonely'],
        ['Pressured', 'pressured'], ['Annoyed', 'annoyed'], ['Proud', 'proud'], ['Hopeful', 'hopeful'],
        ['Grateful', 'grateful'], ['Enthusiastic', 'enthusiastic'],
      ].map(([label, asset]) => ({ label, image: `assets/figma/journal/adult/${asset}.svg`, kind: 'icon' as const })),
    },
    {
      key: 'health', title: 'How’s your health?', icon: 'assets/figma/journal/adult/health.svg', columns: 4,
      options: [
        ['Good', 'health-good'], ['Normal', 'health-normal'], ['Unwell', 'health-unwell'], ['Quite Sick', 'health-sick'],
      ].map(([label, asset]) => ({ label, image: `assets/figma/journal/adult/${asset}.svg`, kind: 'icon' as const })),
    },
    {
      key: 'hobbies', title: 'What did you do?', icon: 'assets/figma/journal/adult/interests.svg', columns: 4,
      options: [
        ['Movies', 'movies'], ['Reading', 'reading'], ['Art', 'art'], ['Sport', 'sport'],
        ['Music', 'music'], ['Travel', 'travel'], ['Exercise', 'exercise'],
      ].map(([label, asset]) => ({ label, image: `assets/figma/journal/adult/${asset}.svg`, kind: 'icon' as const })),
    },
    {
      key: 'social', title: 'Who were you with?', icon: 'assets/figma/journal/adult/group.svg', columns: 4,
      options: [
        ['Family', 'family'], ['Friends', 'friends'], ['Party', 'party'], ['Alone', 'lonely'],
      ].map(([label, asset]) => ({ label, image: `assets/figma/journal/adult/${asset}.svg`, kind: 'icon' as const })),
    },
    {
      key: 'school', title: 'How was school/college today?', icon: 'assets/figma/journal/adult/school.svg', columns: 4,
      options: [
        ['Exam', 'school-exam'], ['Hard', 'school-hard'], ['Easy', 'school-easy'], ['Fun', 'school-fun'],
      ].map(([label, asset]) => ({ label, image: `assets/figma/journal/adult/${asset}.svg`, kind: 'icon' as const })),
    },
    {
      key: 'growth', title: 'How did you grow today?', icon: 'assets/figma/journal/adult/growth.svg', columns: 4,
      options: [
        ['Exercise', 'exercise'], ['Learnings', 'learning'], ['Meditation', 'meditation'], ['Listen', 'listen'],
      ].map(([label, asset]) => ({ label, image: `assets/figma/journal/adult/${asset}.svg`, kind: 'icon' as const })),
    },
    {
      key: 'productivity', title: 'How productive were you?', icon: 'assets/figma/journal/adult/productivity.svg', columns: 4,
      options: [
        ['Start early', 'start-early'], ['Make list', 'make-list'], ['Focus', 'focus'], ['Took break', 'took-break'],
      ].map(([label, asset]) => ({ label, image: `assets/figma/journal/adult/${asset}.svg`, kind: 'icon' as const })),
    },
    {
      key: 'day', title: 'How was your day?', icon: 'assets/figma/journal/adult/day.svg', columns: 4,
      options: [
        ['Worst Day', 'worst-day'], ['Hectic', 'hectic'], ['Normal', 'bored'], ['Slow Paced', 'slow-paced'],
      ].map(([label, asset]) => ({ label, image: `assets/figma/journal/adult/${asset}.svg`, kind: 'icon' as const })),
    },
  ];

  get sections(): JournalSection[] {
    return this.isAge16Plus ? this.age16PlusSections : this.under16Sections;
  }

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly authApi: AuthApi,
    private readonly authService: AuthService,
    private readonly refreshService: RefreshService,
    private readonly toastController: ToastController,
    private readonly location: Location,
  ) {}

  ngOnInit(): void {
    this.isAge16Plus = (this.authService.getCurrentUserAge() ?? 0) >= 16;
    const entry = history?.state?.journalEntry as any;
    if (entry?.id != null) {
      this.editingEntryId = entry.id;
      this.text = entry.text || entry.notes || '';
      this.restoreSelections(entry);
    } else {
      this.text = this.initialText || '';
    }
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
    const request = this.editingEntryId != null
      ? this.http.put(`${environment.apiUrl}/journal/${encodeURIComponent(String(this.editingEntryId))}`, formData, this.authHeaders())
      : this.http.post(`${environment.apiUrl}/journal/add`, formData, this.authHeaders());

    request.subscribe({
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
        const apiMessage = String(error?.error?.message || error?.message || '').toLowerCase();
        if (error?.status === 400 && apiMessage.includes('only one journal entry per day')) {
          this.emotionError = 'You can add only one journal entry per day.';
          void this.showSaveError(this.emotionError);
          return;
        }
        this.emotionError = 'Your journal could not be saved. Please try again.';
        void this.showSaveError(this.emotionError);
      },
    });
  }

  private async showSaveError(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 4000,
      position: 'top',
      color: 'danger',
      buttons: [{ text: 'OK', role: 'cancel' }],
    });
    await toast.present();
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
    this.editingEntryId = null;
    if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
  }

  private restoreSelections(entry: any): void {
    const values: Record<string, string> = {
      emotions: entry.emotions ?? entry.mood,
      sleep: entry.sleep,
      health: entry.health,
      hobbies: entry.hobbies,
      social: entry.social,
      school: entry.school,
      growth: entry.growth,
      carrying: entry.carrying,
      productivity: entry.productivity,
      day: entry.day,
    };

    this.sections.forEach(section => {
      const value = String(values[section.key] ?? '').split(',')[0].trim().toLowerCase();
      const index = section.options.findIndex(option => option.label.toLowerCase() === value);
      if (index >= 0) this.selected[section.key] = index;
    });
  }

  private revokePreviewUrls(): void {
    this.uploadedImages.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
  }
}
