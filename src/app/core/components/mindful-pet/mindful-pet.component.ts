import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
// NgIf/NgClass removed from imports - not used in template
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'mindful-pet',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './mindful-pet.component.html',
  styleUrls: ['./mindful-pet.component.scss']
})
export class MindfulPetComponent implements OnInit, OnChanges {
  @Input() name: string = 'Buddy';

  @Input() mood: 'default' | 'happy' | 'anger' | 'tired' | 'playful' | 'curious' = 'default';

  @Input() pet: 'panda' | 'dragon' | 'llama' | 'owl' = 'panda';

  @Input() age: number = 1;

  @Input() size = 96;

  @Input() sizePreset?: number | '68' | '96';

  @Input() imageOverride?: string;

  @Output() petClick = new EventEmitter<void>();

  @Output() petSelected = new EventEmitter<{ pet: string; age: number }>();

  static readonly PETS = ['panda', 'dragon', 'llama', 'owl'] as const;

  currentImage = '';

  private getImageCandidates(): string[] {
    const candidates: string[] = [];
    if (this.imageOverride) {
      candidates.push(this.imageOverride);
    }

    const moodMap: Record<string, string> = {
      default: 'Default',
      happy: 'Happy',
      anger: 'Angry',
      tired: 'Tired',
      playful: 'Playful',
      curious: 'Curious',
    };

    const moodLabel = moodMap[this.mood] || this.capitalize(this.mood || 'Default');

    const petCapital = this.capitalize(this.pet);
    const petVariantsFolder = `${petCapital} Variants`;

    if (this.mood && this.mood !== 'default') {
      candidates.push(`assets/Pets/${petVariantsFolder}/Age-${this.age}-${moodLabel}.svg`);
    }
    candidates.push(`assets/Pets/${petVariantsFolder}/Age-${this.age}-Default.svg`);

    if (this.mood && this.mood !== 'default') {
      candidates.push(`assets/Pets/${this.pet}/age_${this.age}/mood_${this.mood}.svg`);
      candidates.push(`assets/Pets/${this.pet}/age_${this.age}/mood_${this.mood}.png`);
    }
    candidates.push(`assets/Pets/${this.pet}/age_${this.age}.svg`);
    candidates.push(`assets/Pets/${this.pet}/age_${this.age}.png`);

    candidates.push(`assets/Pets/${this.pet}.svg`);
    candidates.push(`assets/Pets/${this.pet}.png`);

    candidates.push(`assets/Pets/${petVariantsFolder}/Age-${this.age}-Default.svg`);

    return candidates;
  }

  private imageCandidates: string[] = [];
  private currentImageIndex = 0;

  ngOnInit(): void {
    this.resetImageCandidates();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pet'] || changes['age'] || changes['mood'] || changes['imageOverride']) {
      this.resetImageCandidates();
    }
  }

  private resetImageCandidates() {
    this.imageCandidates = this.getImageCandidates();
    this.currentImageIndex = 0;
    this.currentImage = this.imageCandidates.length ? this.imageCandidates[0] : '';
  }

  get displayName(): string {
    if (this.name && this.name.trim().length) return this.name;
    return this.capitalize(this.pet);
  }

  private capitalize(s: string) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  onClick() {
    this.petClick.emit();
    this.petSelected.emit({ pet: this.pet, age: this.age });
  }

  onImageError() {
    if (this.currentImageIndex + 1 < this.imageCandidates.length) {
      this.currentImageIndex += 1;
      this.currentImage = this.imageCandidates[this.currentImageIndex];
    }
  }

  get sizePx(): number {
    if (typeof this.sizePreset === 'string') {
      const n = parseInt(this.sizePreset, 10);
      if (n === 68 || n === 96) return n;
    }

    if (typeof this.sizePreset === 'number') {
      if (this.sizePreset === 68 || this.sizePreset === 96) return this.sizePreset;
    }

    return this.size || 48;
  }
}
