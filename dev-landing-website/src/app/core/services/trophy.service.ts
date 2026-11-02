import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TrophyApi } from '../api/trophy.api';

// ========== INTERFACES ==========

export interface Trophy {
    id: string;
    title: string;
    earnedOn: Date;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    points: number;
    image: string;
    contentType: string;
    challengeId: string;
    categoryIconUrl: string | null;
    challengeName: string | null;
}

export interface TrophyApiResponse {
    trophies: {
        title: string;
        challengeName: string | null;
        trophyCount: number;
        earnedDate: string;
        formattedEarnedDate: string;
        contentType: string;
        difficultyLevel: 'Easy' | 'Medium' | 'Hard';
        challengeId: string;
        categoryIconUrl: string | null;
    }[];
    totalTrophies: number;
}

export interface GroupedTrophies {
    title: string;
    items: Trophy[];
}

// ========== SERVICE ==========

@Injectable({ providedIn: 'root' })
export class TrophyService {
    constructor(private trophyApi: TrophyApi) { }

    /**
     * Fetch user's trophies from the backend API
     */
    fetchTrophies(): Observable<{ trophies: Trophy[], totalCount: number }> {
        return this.trophyApi.getMyTrophies().pipe(
            map((response: TrophyApiResponse) => this.transformTrophyData(response)),
            catchError(error => {
                console.error('Error fetching trophies:', error);
                return throwError(() => new Error('Failed to load trophies. Please try again later.'));
            })
        );
    }

    /**
     * Transform backend API response to internal Trophy model
     */
    private transformTrophyData(response: TrophyApiResponse): { trophies: Trophy[], totalCount: number } {
        const trophies: Trophy[] = (response.trophies || []).map((trophy, index) => ({
            id: trophy.challengeId || `trophy_${index}`,
            title: trophy.title,
            earnedOn: this.parseEarnedDate(trophy.earnedDate),
            difficulty: trophy.difficultyLevel,
            points: trophy.trophyCount,
            image: this.getTrophyImage(trophy.difficultyLevel),
            contentType: trophy.contentType,
            challengeId: trophy.challengeId,
            categoryIconUrl: trophy.categoryIconUrl || null,
            challengeName: trophy.challengeName || null
        }));

        return {
            trophies,
            totalCount: response.totalTrophies || 0
        };
    }

    /**
     * Parse earned date string to Date object
     * Handles format like "9 Dec"
     */
    private parseEarnedDate(dateStr: string): Date {
        if (!dateStr) return new Date();

        const currentYear = new Date().getFullYear();
        const dateParts = dateStr.split(' ');

        if (dateParts.length === 2) {
            const day = parseInt(dateParts[0], 10);
            const month = dateParts[1];
            const dateString = `${month} ${day}, ${currentYear}`;
            const parsedDate = new Date(dateString);

            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }

        // Fallback to current date if parsing fails
        console.warn(`Could not parse date: ${dateStr}, using current date`);
        return new Date();
    }

    /**
     * Get trophy image based on difficulty level
     */
    private getTrophyImage(difficulty: string): string {
        const imageMap: Record<string, string> = {
            'Easy': '/assets/Icons-Neutral/Icon-Trophy.png',
            'Medium': '/assets/Icons-Neutral/Icon-Trophy.png',
            'Hard': '/assets/Icons-Neutral/Icon-Trophy.png'
        };
        return imageMap[difficulty] || '/assets/Icons-Neutral/Icon-Trophy.png';
    }

    /**
     * Group trophies by month and year
     */
    groupTrophiesByMonth(trophies: Trophy[]): GroupedTrophies[] {
        const map = new Map<string, Trophy[]>();

        trophies.forEach(trophy => {
            const key = trophy.earnedOn.toLocaleString('en-US', {
                month: 'long',
                year: 'numeric'
            });

            const existing = map.get(key) || [];
            map.set(key, [...existing, trophy]);
        });

        // Convert map to array and sort by date (newest first)
        return Array.from(map, ([title, items]) => ({
            title,
            items: items.sort((a, b) => b.earnedOn.getTime() - a.earnedOn.getTime())
        })).sort((a, b) => {
            const dateA = a.items[0]?.earnedOn || new Date(0);
            const dateB = b.items[0]?.earnedOn || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    }

    /**
     * Get category letter for display
     */
    getCategoryLetter(contentType?: string): string {
        if (!contentType) return '★';
        const ct = contentType.toLowerCase();
        if (ct.includes('quiz')) return 'Q';
        if (ct.includes('challenge')) return 'C';
        if (ct.includes('habit')) return 'H';
        if (ct.includes('task')) return 'T';
        return contentType.charAt(0).toUpperCase();
    }

    /**
     * Get category class for styling
     */
    getCategoryClass(contentType?: string): string {
        if (!contentType) return 'cat-default';
        const ct = contentType.toLowerCase();
        if (ct.includes('quiz')) return 'cat-quiz';
        if (ct.includes('challenge')) return 'cat-challenge';
        if (ct.includes('habit')) return 'cat-habit';
        if (ct.includes('task')) return 'cat-task';
        return 'cat-default';
    }

    /**
     * Format earned date with ordinal suffix
     */
    formatEarnedOn(date: Date | string | undefined | null): string {
        if (!date) return '';
        const d = (date instanceof Date) ? date : new Date(date);
        if (isNaN(d.getTime())) return '';

        const day = d.getDate();
        const suffix = this.getOrdinalSuffix(day);
        const month = d.toLocaleString('en-US', { month: 'short' });
        return `${month} ${day}${suffix}`;
    }

    private getOrdinalSuffix(day: number): string {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }
}
