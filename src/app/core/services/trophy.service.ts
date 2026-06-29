import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Trophy {
    id: string;
    title: string;
    contentTitle?: string;
    contentThumbnailUrl?: string;
    earnedOn: Date;
    earnedOnDisplay?: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    points: number;
    image: string;
    contentType: string;
    challengeId: string;
    categoryIconUrl?: string;
}

export interface TrophyApiResponse {
    trophies: {
        title: string;
        trophyCount: number;
        earnedDate: string;
        formattedEarnedDate: string;
        contentType: string;
        difficultyLevel: 'Easy' | 'Medium' | 'Hard';
        challengeId: string;
        challengeName?: string;
        categoryIconUrl?: string;
        contentTitle?: string;
        contentThumbnailUrl?: string;
        thumbnailUrl?: string;
    }[];
    totalTrophies: number;
}

export interface GroupedTrophies {
    title: string;
    items: Trophy[];
}

@Injectable({
    providedIn: 'root'
})
export class TrophyService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    /**
     * Fetch user's trophies from the backend API
     */
    fetchTrophies(): Observable<{ trophies: Trophy[], totalCount: number }> {
        const headers = this.getHeaders();

        return this.http.get<TrophyApiResponse>(`${this.apiUrl}/trophies/my-trophies`, { headers })
            .pipe(
                map(response => this.transformTrophyData(response)),
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
        const trophies: Trophy[] = response.trophies.map((trophy, index) => {
            const raw = trophy as any;

            const iconUrl: string | undefined =
                raw.categoryIconUrl ||
                raw.categoryIconURL ||
                raw.CategoryIconUrl ||
                raw.iconUrl ||
                raw.categoryUrl ||
                undefined;

            // Content-level thumbnail (the actual article/quiz image)
            const contentThumbnailUrl: string | undefined =
                raw.contentThumbnailUrl ||
                raw.thumbnailUrl ||
                raw.contentImageUrl ||
                raw.contentImage ||
                raw.articleImageUrl ||
                raw.quizImageUrl ||
                raw.articleThumbnail ||
                raw.quizThumbnail ||
                raw.contentThumb ||
                raw.imageUrl ||
                undefined;

            // Title of the learning content (article/quiz) that earned this trophy
            const contentTitle: string | undefined =
                raw.contentTitle ||
                raw.challengeName ||
                raw.articleTitle ||
                raw.quizTitle ||
                raw.challengeTitle ||
                raw.learningContentTitle ||
                raw.contentName ||
                raw.lessonTitle ||
                undefined;

            console.log(`[Trophy] "${raw.title}" contentTitle="${contentTitle}" thumbnail="${contentThumbnailUrl}" iconUrl="${iconUrl}"`);

            return {
                id: raw.challengeId || `trophy_${index}`,
                title: raw.title,
                contentTitle,
                contentThumbnailUrl,
                earnedOn: this.parseEarnedDate(raw.earnedDate || raw.formattedEarnedDate),
                earnedOnDisplay: raw.formattedEarnedDate || undefined,
                difficulty: raw.difficultyLevel,
                points: raw.trophyCount,
                image: this.getTrophyImage(raw.difficultyLevel),
                contentType: raw.contentType,
                challengeId: raw.challengeId,
                categoryIconUrl: iconUrl
            };
        });

        return {
            trophies,
            totalCount: response.totalTrophies
        };
    }

    /**
     * Parse earned date string to Date object
     * Handles format like "9 Dec"
     */
    private parseEarnedDate(dateStr: string): Date {
        if (!dateStr) return new Date();

        const currentYear = new Date().getFullYear();
        const trimmed = dateStr.trim();

        // Handle short format "9 Dec" or "20th Jun" (no year)
        const shortMatch = trimmed.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)$/);
        if (shortMatch) {
            const parsed = new Date(`${shortMatch[2]} ${shortMatch[1]}, ${currentYear}`);
            if (!isNaN(parsed.getTime())) return parsed;
        }

        // Try direct parsing (ISO 8601, "March 2, 2025", etc.)
        const direct = new Date(trimmed);
        if (!isNaN(direct.getTime()) && direct.getFullYear() >= 2020) return direct;

        // If direct parse gave an old year, re-parse with current year
        if (!isNaN(direct.getTime())) {
            const withYear = new Date(direct);
            withYear.setFullYear(currentYear);
            return withYear;
        }

        return new Date();
    }

    /**
     * Get trophy image based on difficulty level
     */
    private getTrophyImage(difficulty: string): string {
        const imageMap: Record<string, string> = {
            'Easy': 'assets/Icons-Neutral/Icon-Trophy.png',
            'Medium': 'assets/Icons-Neutral/Icon-Trophy.png',
            'Hard': 'assets/Icons-Neutral/Icon-Trophy.png'
        };
        return imageMap[difficulty] || 'assets/Icons-Neutral/Icon-Trophy.png';
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
     * Get HTTP headers with authentication token
     */
    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('auth_token');
        let headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        // Add authorization token if available
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        } else if (environment.apiAuthToken) {
            // Fallback to environment token if no user token
            headers = headers.set('Authorization', environment.apiAuthToken);
        }

        return headers;
    }
}
