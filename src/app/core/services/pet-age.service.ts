import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type PetActivityType = 'tasks' | 'habits' | 'quizzes' | 'puzzles' | 'articles' | 'lessons';
export type PetType = 'panda' | 'dragon' | 'llama' | 'owl';
export type PetMood = 'happy' | 'playful' | 'curious' | 'base' | 'tired' | 'anger';

export interface ApiUserPet {
  id?: number;
  petName?: string;
  name?: string;
  petType?: string;
  gender?: string | null;
  url?: string;
}

export interface PetActivityCounts {
  tasks: number;
  habits: number;
  quizzes: number;
  puzzles: number;
  articles: number;
  lessons: number;
}

export interface PetAgeConfig {
  age: number;
  requiredDays: number;
  description: string;
}

export interface UserPetData {
  petType: PetType | null;
  currentAge: number;            // 1, 2, or 3 (3 = max per PRD)
  activityCounts: PetActivityCounts;  // per-type counters, reset on each age-up
  totalActivityScore: number;         // accumulated score toward next threshold
  // Streak fields kept for daily login / streak-milestone overlay logic
  currentStreak: number;
  longestStreak: number;
  totalDaysOpened: number;
  lastOpenDate: string | null;
  createdAt: string;
}

// Age threshold: Age 1→2 needs 100 points, Age 2→3 needs 300 points
const AGE_THRESHOLD: Record<number, number> = { 1: 100, 2: 300 };

const EMPTY_COUNTS: PetActivityCounts = {
  tasks: 0, habits: 0, quizzes: 0, puzzles: 0, articles: 0, lessons: 0
};

const PET_TYPES: readonly PetType[] = ['panda', 'dragon', 'llama', 'owl'];

@Injectable({ providedIn: 'root' })
export class PetAgeService {
  private readonly STORAGE_KEY = 'superme_buddy_pet_data';

  private petDataSubject: BehaviorSubject<UserPetData>;
  public petData$: Observable<UserPetData>;

  constructor() {
    const initialData = this.loadPetData();
    this.petDataSubject = new BehaviorSubject<UserPetData>(initialData);
    this.petData$ = this.petDataSubject.asObservable();
  }

  private loadPetData(): UserPetData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return this.migrateData(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pet data:', error);
    }
    return this.createNewPet();
  }

  /** Migrate legacy streak-based format to activity-based format */
  private migrateData(raw: any): UserPetData {
    return {
      petType: this.resolvePetType(raw.petType),
      currentAge: Math.min(3, Math.max(1, Number(raw.currentAge) || 1)),
      activityCounts: raw.activityCounts ? { ...EMPTY_COUNTS, ...raw.activityCounts } : { ...EMPTY_COUNTS },
      totalActivityScore: Number(raw.totalActivityScore) || 0,
      currentStreak: Number(raw.currentStreak) || 0,
      longestStreak: Number(raw.longestStreak) || 0,
      totalDaysOpened: Number(raw.totalDaysOpened) || 0,
      lastOpenDate: raw.lastOpenDate || null,
      createdAt: raw.createdAt || new Date().toISOString()
    };
  }

  private createNewPet(petType: PetType | null = null): UserPetData {
    return {
      petType,
      currentAge: 1,
      activityCounts: { ...EMPTY_COUNTS },
      totalActivityScore: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalDaysOpened: 0,
      lastOpenDate: null,
      createdAt: new Date().toISOString()
    };
  }

  private savePetData(data: UserPetData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      this.petDataSubject.next(data);
    } catch (error) {
      console.error('Error saving pet data:', error);
    }
  }

  getCurrentPetData(): UserPetData {
    return this.petDataSubject.value;
  }

  /** Reset the in-memory pet state without recreating user storage on logout. */
  clearSessionData(): void {
    this.petDataSubject.next(this.createNewPet());
  }

  getCurrentAge(): number {
    return this.petDataSubject.value.currentAge;
  }

  getCurrentPetType(): PetType | null {
    return this.petDataSubject.value.petType;
  }

  getCurrentPetDisplayName(): string {
    const petType = this.getCurrentPetType();
    return petType ? petType.charAt(0).toUpperCase() + petType.slice(1) : '';
  }

  /**
   * Synchronize the locally-rendered pet with the pet object returned by the
   * login/profile API. Activity age and progress are preserved.
   */
  syncFromUserPet(userPet: ApiUserPet | string | null | undefined): void {
    // `undefined` means this response did not include pet data, so retain the
    // existing selection. `null` is an explicit no-pet value and must not
    // silently render a different user's previous pet.
    if (userPet === undefined) return;

    const petType = this.resolvePetType(userPet);
    if (petType === this.getCurrentPetType()) return;

    this.savePetData({
      ...this.getCurrentPetData(),
      petType
    });
  }

  /**
   * Resolve all supported backend shapes, including values such as
   * "Panda-Age1-Happy.png" and "src/main/resources/pets/Panda-Age1-Happy.png".
   */
  resolvePetType(userPet: ApiUserPet | string | null | undefined): PetType | null {
    if (!userPet) return null;

    const values = typeof userPet === 'string'
      ? [userPet]
      : [userPet.petName, userPet.name, userPet.petType, userPet.url];
    const normalized = values.filter(Boolean).join(' ').toLowerCase();

    return PET_TYPES.find(type => normalized.includes(type)) || null;
  }

  getPetImagePath(
    mood: PetMood = 'base',
    age: number = this.getCurrentAge(),
    animated: boolean = false
  ): string {
    const petName = this.getCurrentPetDisplayName();
    if (!petName) return '';

    const normalizedAge = Math.max(1, Math.min(3, Number(age) || 1));
    const moodName = mood.charAt(0).toUpperCase() + mood.slice(1);
    const prefix = animated ? `${petName}-Move` : petName;
    return `assets/Images-Pet/${prefix}-Age${normalizedAge}-${moodName}.png`;
  }

  getPetImageAlt(mood?: PetMood): string {
    const moodLabel = mood && mood !== 'base' ? `${mood} ` : '';
    const petName = this.getCurrentPetDisplayName();
    return petName ? `${moodLabel}${petName} illustration` : 'Digital pet';
  }

  getCurrentStreak(): number {
    return this.petDataSubject.value.currentStreak;
  }

  /**
   * Record a completed activity and advance pet age if the threshold is reached.
   *
   * Score per completion (PRD Section 16):
   *  - First 10 completions of each type: 1.0 point each
   *  - After 10th — tasks/habits: 0.1, quizzes/puzzles/articles/lessons: 0.2
   *
   * Thresholds:
   *  - Age 1 → 2: 100 total points
   *  - Age 2 → 3: 300 total points (counters reset at each age-up)
   *  - Age 3: max — no further progression
   *
   * The BehaviorSubject emits immediately so all active `superme-pet` components
   * update in place without waiting for a page reload.
   */
  recordActivity(type: PetActivityType): { ageIncreased: boolean; newAge?: number } {
    const data = this.getCurrentPetData();

    if (data.currentAge >= 3) {
      return { ageIncreased: false };
    }

    const countBefore = data.activityCounts[type];
    const score = this.getActivityScore(type, countBefore);
    const newTotalScore = data.totalActivityScore + score;
    const threshold = AGE_THRESHOLD[data.currentAge] ?? 100;

    if (newTotalScore >= threshold) {
      const newAge = data.currentAge + 1;
      this.savePetData({
        ...data,
        currentAge: newAge,
        activityCounts: { ...EMPTY_COUNTS },
        totalActivityScore: 0
      });
      return { ageIncreased: true, newAge };
    }

    this.savePetData({
      ...data,
      activityCounts: { ...data.activityCounts, [type]: countBefore + 1 },
      totalActivityScore: newTotalScore
    });
    return { ageIncreased: false };
  }

  /**
   * Score contribution per activity completion.
   * First 10 completions of a type each count as 1.0 (full activity point).
   * Beyond 10th: tasks/habits count 0.1, all learning types count 0.2.
   */
  private getActivityScore(type: PetActivityType, countBefore: number): number {
    if (countBefore < 10) return 1.0;
    return (type === 'tasks' || type === 'habits') ? 0.1 : 0.2;
  }

  /**
   * Record daily app open and update streak.
   * Called once per calendar day on app launch.
   */
  recordAppOpen(): { coinsEarned: number } {
    const petData = this.getCurrentPetData();
    const today = this.getTodayDateString();

    if (petData.lastOpenDate === today) {
      return { coinsEarned: 0 };
    }

    const yesterday = this.getYesterdayDateString();
    let newStreak: number;
    let coinsEarned = 5;

    if (petData.lastOpenDate === yesterday) {
      newStreak = petData.currentStreak + 1;
    } else if (petData.lastOpenDate === null) {
      newStreak = 1;
      coinsEarned = 10; // First-signup bonus
    } else {
      newStreak = 1;
    }

    if (newStreak % 7 === 0) {
      coinsEarned += 10; // Streak milestone bonus
    }

    this.savePetData({
      ...petData,
      currentStreak: newStreak,
      longestStreak: Math.max(petData.longestStreak, newStreak),
      totalDaysOpened: petData.totalDaysOpened + 1,
      lastOpenDate: today
    });

    return { coinsEarned };
  }

  /** Returns progress info toward the next age stage, or null if already at max (Age 3) */
  getProgressToNextAge(): { current: number; threshold: number; percentage: number } | null {
    const data = this.getCurrentPetData();
    if (data.currentAge >= 3) return null;
    const threshold = AGE_THRESHOLD[data.currentAge] ?? 100;
    return {
      current: data.totalActivityScore,
      threshold,
      percentage: Math.min(100, Math.round((data.totalActivityScore / threshold) * 100))
    };
  }

  changePetType(petType: PetType): void {
    this.savePetData({ ...this.getCurrentPetData(), petType });
  }

  resetPetData(petType?: PetType): void {
    this.savePetData(this.createNewPet(petType));
  }

  /** @deprecated Legacy method kept for backward compatibility */
  getAgeMilestones(): PetAgeConfig[] {
    return [
      { age: 1, requiredDays: 0, description: 'Starting the journey' },
      { age: 2, requiredDays: 100, description: 'Active — 100 activity points' },
      { age: 3, requiredDays: 400, description: 'Master — 400 total activity points' }
    ];
  }

  private getTodayDateString(): string {
    return this.formatDateString(new Date());
  }

  private getYesterdayDateString(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.formatDateString(yesterday);
  }

  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
