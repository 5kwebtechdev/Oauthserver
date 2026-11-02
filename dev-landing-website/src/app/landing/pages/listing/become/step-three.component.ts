import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ListingConfig } from './listing-config';
import {
  ListingBasicData,
  ListingDetailsData,
  ListingMediaData,
} from './listing-shared';
import { ListingRegistrationService } from './listing-registration.service';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-listing-step-three',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-three.component.html',
})
export class ListingStepThreeComponent implements OnChanges {
  @Input({ required: true }) config!: ListingConfig;
  @Input({ required: true }) basicData!: ListingBasicData;
  @Input({ required: true }) detailsData!: ListingDetailsData;

  @Input() initialImages: File[] = [];

  @Output() back = new EventEmitter<void>();
  @Output() imagesChange = new EventEmitter<File[]>();

  images: File[] = [];
  previews: string[] = [];

  isSubmitting = false;
  success = false;
  submitError = '';
  dragOver = false;

  readonly maxImages = MAX_IMAGES;

  constructor(
    private registrationService: ListingRegistrationService,
    private router: Router,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialImages']) {
      this.images = [...(this.initialImages || [])];
      this.refreshPreviews();
    }
  }

  private isValidImage(file: File): boolean {
    return IMAGE_TYPES.includes(file.type.toLowerCase()) && file.size <= MAX_FILE_SIZE;
  }

  get imageErrors(): string[] {
    return this.images.map((file) => {
      if (!IMAGE_TYPES.includes(file.type.toLowerCase())) return 'Invalid image format';
      if (file.size > MAX_FILE_SIZE) return 'Image exceeds 5 MB';
      return '';
    });
  }

  get hasImageErrors(): boolean {
    return this.imageErrors.some(Boolean);
  }

  get isValid(): boolean {
    // Images are optional because EduItem fields are optional.
    return !this.hasImageErrors && !this.isSubmitting;
  }

  private refreshPreviews(): void {
    this.previews = this.images.map((file) => URL.createObjectURL(file));
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files || []));
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    this.addFiles(Array.from(event.dataTransfer?.files || []));
  }

  addFiles(files: File[]): void {
    const next = [...this.images, ...files].slice(0, MAX_IMAGES);
    this.images = next;
    this.refreshPreviews();
    this.imagesChange.emit([...this.images]);
  }

  removeImage(index: number): void {
    this.images = this.images.filter((_, i) => i !== index);
    this.refreshPreviews();
    this.imagesChange.emit([...this.images]);
  }

  handleSubmit(): void {
    if (!this.isValid) return;

    const media: ListingMediaData = {
      images: [...this.images],
    };

    this.submitError = '';
    this.isSubmitting = true;

    this.registrationService
      .submit(this.config, this.basicData, this.detailsData, media)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.success = true;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (error) => {
          console.error('EduHub registration error:', error);
          this.submitError =
            error?.error?.message ||
            'We could not submit your listing. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  navigateHome(): void {
    this.router.navigate(['/']);
  }
}
