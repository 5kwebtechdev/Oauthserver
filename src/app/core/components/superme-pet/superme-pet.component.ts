import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { PetAgeService, PetMood, PetType } from '../../services/pet-age.service';

export type { PetType, PetMood } from '../../services/pet-age.service';

@Component({
  selector: 'superme-pet',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './superme-pet.component.html',
  styleUrls: ['./superme-pet.component.scss']
})
export class SupermePetComponent implements OnInit, OnChanges, OnDestroy {
  @Input() name: string = 'Buddy';

  @Input() mood: PetMood = 'base';

  @Input() pet: PetType | null = null;

  @Input() age: number = 1;

  @Input() size = 96;

  @Input() sizePreset?: number | '68' | '96';

  @Input() imageOverride?: string;

  @Input() animated: boolean = false;

  @Output() petClick = new EventEmitter<void>();

  @Output() petSelected = new EventEmitter<{ pet: PetType | null; age: number }>();

  static readonly PETS = ['panda', 'dragon', 'llama', 'owl'] as const;

  currentImage = '';
  private petSub?: Subscription;
  private hasExplicitPetInput = false;
  private hasExplicitAgeInput = false;

  constructor(private petAgeService: PetAgeService) {
    const currentPet = this.petAgeService.getCurrentPetData();
    this.pet = currentPet.petType;
    this.age = currentPet.currentAge;
  }

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
    // A newly-loaded session can briefly have no local pet selection before the
    // profile response is hydrated. Keep the dashboard visual populated with
    // the standard panda fallback instead of rendering an empty slot.
    const petCapitalized = this.capitalizePetName(this.pet) || 'Panda';

    const moodCapitalized = this.capitalizeMood(this.mood);
    const ageValue = Math.max(1, Math.min(3, this.age)); // Clamp age between 1-3 (PRD max is 3)

    // Build image filename based on structure
    const prefix = this.animated ? `${petCapitalized}-Move` : petCapitalized;
    const filename = `${prefix}-Age${ageValue}-${moodCapitalized}.png`;

    return `assets/Images-Pet/${filename}`;
  }

  /**
   * Capitalize pet name for image path
   */
  private capitalizePetName(pet: string | null): string | null {
    if (!pet) return null;

    const petMap: Record<string, string> = {
      'panda': 'Panda',
      'dragon': 'Dragon',
      'llama': 'Llama',
      'owl': 'Owl'
    };
    return petMap[pet.toLowerCase()] || null;
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
    // Initial render (handles cases where age/pet were set via @Input before init)
    this.updateImage();

    // Unbound pets follow the logged-in user's persisted API selection in real time.
    // Decorative instances with explicit pet/age inputs keep those inputs.
    this.petSub = this.petAgeService.petData$.subscribe(data => {
      const newAge = Math.min(3, Math.max(1, data.currentAge));
      const nextAge = this.hasExplicitAgeInput ? this.age : newAge;
      const nextPet = this.hasExplicitPetInput ? this.pet : data.petType;

      if (this.age !== nextAge || this.pet !== nextPet) {
        this.age = nextAge;
        this.pet = nextPet;
        this.updateImage();
      }
    });
  }

  ngOnDestroy(): void {
    this.petSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pet']) this.hasExplicitPetInput = true;
    if (changes['age']) this.hasExplicitAgeInput = true;

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

  private capitalize(s: string | null): string {
    if (!s) return '';
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
