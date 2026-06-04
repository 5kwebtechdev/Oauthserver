import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PetAgeService } from '../../services/pet-age.service';

export type PetType = 'panda' | 'dragon' | 'llama' | 'owl';
export type PetMood = 'happy' | 'playful' | 'curious' | 'base' | 'tired' | 'anger';

@Component({
  selector: 'mindful-pet',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './mindful-pet.component.html',
  styleUrls: ['./mindful-pet.component.scss']
})
export class MindfulPetComponent implements OnInit, OnChanges {
  @Input() name: string = 'Buddy';

  @Input() mood: PetMood = 'base';

  @Input() pet: PetType = 'panda';

  @Input() age: number = 1;

  @Input() size = 96;

  @Input() sizePreset?: number | '68' | '96';

  @Input() imageOverride?: string;

  @Input() animated: boolean = false;

  @Output() petClick = new EventEmitter<void>();

  @Output() petSelected = new EventEmitter<{ pet: string; age: number }>();

  static readonly PETS = ['panda', 'dragon', 'llama', 'owl'] as const;

  currentImage = '';

  constructor(private petAgeService: PetAgeService) { }

  /**
   * Get image path based on pet type, age, mood, and animation state
   * Uses the Images-Pet folder structure: {PetType}-Age{age}-{Mood}.png
   * Or for animations: {PetType}-Move-Age{age}-{Mood}.png
   */
  private getImagePath(): string {
    if (this.imageOverride) {
      return this.imageOverride;
    }

    // Normalize inputs
    const petCapitalized = this.capitalizePetName(this.pet);
    const moodCapitalized = this.capitalizeMood(this.mood);
    const ageValue = Math.max(1, Math.min(4, this.age)); // Clamp age between 1-4

    // Build image filename based on structure
    const prefix = this.animated ? `${petCapitalized}-Move` : petCapitalized;
    const filename = `${prefix}-Age${ageValue}-${moodCapitalized}.png`;

    return `assets/Images-Pet/${filename}`;
  }

  /**
   * Capitalize pet name for image path
   */
  private capitalizePetName(pet: string): string {
    const petMap: Record<string, string> = {
      'panda': 'Panda',
      'dragon': 'Dragon',
      'llama': 'Llama',
      'owl': 'Owl'
    };
    return petMap[pet.toLowerCase()] || 'Panda';
  }

  /**
   * Capitalize and map mood to image naming convention
   */
  private capitalizeMood(mood: PetMood): string {
    const moodMap: Record<PetMood, string> = {
      'happy': 'Happy',
      'playful': 'Playful',
      'curious': 'Curious',
      'base': 'Base',
      'tired': 'Tired',
      'anger': 'Anger'
    };
    return moodMap[mood] || 'Base';
  }

  ngOnInit(): void {
    this.updateImage();

    // If no age is provided, use the current pet age from service
    if (!this.age || this.age === 1) {
      const petData = this.petAgeService.getCurrentPetData();
      this.age = petData.currentAge;
      this.pet = petData.petType;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pet'] || changes['age'] || changes['mood'] || changes['imageOverride'] || changes['animated']) {
      this.updateImage();
    }
  }

  private updateImage(): void {
    this.currentImage = this.getImagePath();
  }

  get displayName(): string {
    if (this.name && this.name.trim().length) return this.name;
    return this.capitalize(this.pet);
  }

  private capitalize(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  onClick(): void {
    this.petClick.emit();
    this.petSelected.emit({ pet: this.pet, age: this.age });
  }

  onImageError(): void {
    // Fallback to base mood if specific mood image fails
    if (this.mood !== 'base') {
      console.warn(`Image not found for ${this.pet} age ${this.age} mood ${this.mood}, falling back to base`);
      this.mood = 'base';
      this.updateImage();
    } else {
      console.error(`Failed to load pet image: ${this.currentImage}`);
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
