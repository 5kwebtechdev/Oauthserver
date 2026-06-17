import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PetAgeConfig {
    age: number;
    requiredDays: number;
    description: string;
}

export interface UserPetData {
    petType: 'panda' | 'dragon' | 'llama' | 'owl';
    currentAge: number;
    currentStreak: number;
    longestStreak: number;
    totalDaysOpened: number;
    lastOpenDate: string | null;
    createdAt: string;
}

/**
 * Service to manage pet age progression based on user streak and performance
 * 
 * Age Progression Logic (based on PRD):
 * - Age 1: Default starting age for new accounts
 * - Age 2: Opens app for 7 consecutive days
 * - Age 3: Opens app for 21 consecutive days
 * - Age 4: Opens app for 60 consecutive days
 * 
 * Important: Pet age never decreases, even if streak breaks
 */
@Injectable({ providedIn: 'root' })
export class PetAgeService {
    private readonly STORAGE_KEY = 'superme_buddy_pet_data';

    // Age progression milestones based on consecutive days
    private readonly AGE_MILESTONES: PetAgeConfig[] = [
        { age: 1, requiredDays: 0, description: 'Just starting the journey' },
        { age: 2, requiredDays: 7, description: 'First week complete - habit forming' },
        { age: 3, requiredDays: 21, description: '3 weeks streak - habit hardwired' },
        { age: 4, requiredDays: 60, description: 'Full mastery - 2 months of consistency' }
    ];

    private petDataSubject: BehaviorSubject<UserPetData>;
    public petData$: Observable<UserPetData>;

    constructor() {
        const initialData = this.loadPetData();
        this.petDataSubject = new BehaviorSubject<UserPetData>(initialData);
        this.petData$ = this.petDataSubject.asObservable();
    }

    /**
     * Load pet data from localStorage or initialize new pet
     */
    private loadPetData(): UserPetData {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading pet data:', error);
        }

        // Initialize new pet for new account
        return this.createNewPet();
    }

    /**
     * Create a new pet with default values (Age 1)
     */
    private createNewPet(petType: 'panda' | 'dragon' | 'llama' | 'owl' = 'panda'): UserPetData {
        return {
            petType,
            currentAge: 1,
            currentStreak: 0,
            longestStreak: 0,
            totalDaysOpened: 0,
            lastOpenDate: null,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Save pet data to localStorage
     */
    private savePetData(data: UserPetData): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            this.petDataSubject.next(data);
        } catch (error) {
            console.error('Error saving pet data:', error);
        }
    }

    /**
     * Get current pet data
     */
    getCurrentPetData(): UserPetData {
        return this.petDataSubject.value;
    }

    /**
     * Record app opening and update streak
     * This should be called when the app is opened
     */
    recordAppOpen(): { ageIncreased: boolean; newAge?: number; coinsEarned: number } {
        const petData = this.getCurrentPetData();
        const today = this.getTodayDateString();

        // Don't record if already opened today
        if (petData.lastOpenDate === today) {
            return { ageIncreased: false, coinsEarned: 0 };
        }

        const yesterday = this.getYesterdayDateString();
        let newStreak: number;
        let coinsEarned = 5; // Base daily login coins

        // Check if continuing streak
        if (petData.lastOpenDate === yesterday) {
            newStreak = petData.currentStreak + 1;
        } else if (petData.lastOpenDate === null) {
            // First time opening app
            newStreak = 1;
            coinsEarned = 10; // Bonus for first time
        } else {
            // Streak broken, reset to 1
            newStreak = 1;
        }

        // Update longest streak if needed
        const longestStreak = Math.max(petData.longestStreak, newStreak);

        // Calculate new age based on current streak
        const previousAge = petData.currentAge;
        const newAge = this.calculateAgeFromStreak(newStreak);

        // Award bonus coins for streak milestones
        if (newStreak === 7 || newStreak === 21 || newStreak === 60) {
            coinsEarned += 10; // Bonus coins for milestone
        }

        // Update pet data
        const updatedData: UserPetData = {
            ...petData,
            currentStreak: newStreak,
            longestStreak,
            currentAge: newAge,
            totalDaysOpened: petData.totalDaysOpened + 1,
            lastOpenDate: today
        };

        this.savePetData(updatedData);

        return {
            ageIncreased: newAge > previousAge,
            newAge: newAge > previousAge ? newAge : undefined,
            coinsEarned
        };
    }

    /**
     * Calculate pet age based on current streak
     * Age never decreases, only increases
     */
    private calculateAgeFromStreak(streak: number): number {
        const currentAge = this.getCurrentPetData().currentAge;

        // Find the appropriate age for the streak
        for (let i = this.AGE_MILESTONES.length - 1; i >= 0; i--) {
            if (streak >= this.AGE_MILESTONES[i].requiredDays) {
                const newAge = this.AGE_MILESTONES[i].age;
                // Age never decreases
                return Math.max(currentAge, newAge);
            }
        }

        return Math.max(currentAge, 1);
    }

    /**
     * Get the current pet age
     */
    getCurrentAge(): number {
        return this.getCurrentPetData().currentAge;
    }

    /**
     * Get the current streak
     */
    getCurrentStreak(): number {
        return this.getCurrentPetData().currentStreak;
    }

    /**
     * Get days until next age milestone
     */
    getDaysUntilNextAge(): number | null {
        const currentStreak = this.getCurrentStreak();
        const currentAge = this.getCurrentAge();

        // Find next milestone
        const nextMilestone = this.AGE_MILESTONES.find(m => m.age > currentAge);

        if (!nextMilestone) {
            return null; // Already at max age
        }

        return Math.max(0, nextMilestone.requiredDays - currentStreak);
    }

    /**
     * Get age milestone information
     */
    getAgeMilestones(): PetAgeConfig[] {
        return [...this.AGE_MILESTONES];
    }

    /**
     * Change pet type (e.g., when user selects a different pet)
     */
    changePetType(petType: 'panda' | 'dragon' | 'llama' | 'owl'): void {
        const petData = this.getCurrentPetData();
        this.savePetData({ ...petData, petType });
    }

    /**
     * Reset pet data (for testing or account reset)
     */
    resetPetData(petType?: 'panda' | 'dragon' | 'llama' | 'owl'): void {
        const newPet = this.createNewPet(petType);
        this.savePetData(newPet);
    }

    /**
     * Get today's date as YYYY-MM-DD string
     */
    private getTodayDateString(): string {
        const today = new Date();
        return this.formatDateString(today);
    }

    /**
     * Get yesterday's date as YYYY-MM-DD string
     */
    private getYesterdayDateString(): string {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return this.formatDateString(yesterday);
    }

    /**
     * Format date as YYYY-MM-DD
     */
    private formatDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
