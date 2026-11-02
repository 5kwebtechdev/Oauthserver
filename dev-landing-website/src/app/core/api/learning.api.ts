import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Learning API Service
 * Handles all HTTP requests for learning content (challenges, articles, hints, submissions)
 */
@Injectable({ providedIn: 'root' })
export class LearningApi {
    private base = environment.apiUrl || '';

    constructor(private http: HttpClient, private authService: AuthService) { }

    /**
     * Get HTTP headers with authorization token
     */
    private headers(): HttpHeaders {
        const token = this.authService.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        }
        return headers;
    }

    // ==================== CHALLENGES (Quizzes & Puzzles) ====================

    /**
     * Fetch all challenges (quizzes and puzzles)
     */
    getAllChallenges(): Observable<any[]> {
        const url = `${this.base}/challenges`;
        return this.http.get<any[]>(url, { headers: this.headers() }).pipe(
            tap(data => console.log('[LearningApi] Challenges fetched:', data?.length)),
            catchError(err => {
                console.error('[LearningApi] Error fetching challenges:', err);
                return of([]);
            })
        );
    }

    /**
     * Fetch a specific challenge by ID with full questions data
     */
    getChallengeById(id: number): Observable<any> {
        const url = `${this.base}/challenges/${id}`;
        return this.http.get<any>(url, { headers: this.headers() }).pipe(
            tap(data => console.log('[LearningApi] Challenge fetched:', data?.name)),
            catchError(err => {
                console.error(`[LearningApi] Error fetching challenge ${id}:`, err);
                return of(null);
            })
        );
    }

    /**
     * Submit challenge answers (new format with all answers at once)
     */
    submitChallenge(challengeId: number, payload: {
        questionAnswers: { [key: string]: string };
        timeTaken: number;
        skippedQuestions: string[];
    }): Observable<any> {
        const url = `${this.base}/challenges/${challengeId}/submit-all`;
        return this.http.post<any>(url, payload, { headers: this.headers() }).pipe(
            tap(res => console.log('[LearningApi] Challenge submitted:', res)),
            catchError(err => {
                console.error('[LearningApi] Error submitting challenge:', err);
                // Handle 409 conflict (already completed) or 400 with successful response data
                if ((err.status === 409 || err.status === 400) && err.error?.celebrationText) {
                    return of(err.error);
                }
                throw err;
            })
        );
    }

    /**
     * Use a hint for a specific challenge question
     */
    useHint(challengeId: number): Observable<any> {
        const url = `${this.base}/challenges/hint/${challengeId}/use`;
        return this.http.get<any>(url, { headers: this.headers() }).pipe(
            tap(res => console.log('[LearningApi] Hint used:', res)),
            catchError(err => {
                console.error('[LearningApi] Error using hint:', err);
                throw err;
            })
        );
    }

    // ==================== ARTICLES ====================

    /**
     * Fetch all articles
     */
    getAllArticles(): Observable<any[]> {
        const url = `${this.base}/articles`;
        return this.http.get<any[]>(url, { headers: this.headers() }).pipe(
            tap(data => console.log('[LearningApi] Articles fetched:', data?.length)),
            catchError(err => {
                console.error('[LearningApi] Error fetching articles:', err);
                return of([]);
            })
        );
    }

    /**
     * Fetch a specific article by ID
     */
    getArticleById(id: number): Observable<any> {
        const url = `${this.base}/articles/${id}`;
        return this.http.get<any>(url, { headers: this.headers() }).pipe(
            tap(data => console.log('[LearningApi] Article fetched:', data?.title)),
            catchError(err => {
                console.error(`[LearningApi] Error fetching article ${id}:`, err);
                return of(null);
            })
        );
    }

    /**
     * Mark article as read
     */
    markArticleRead(id: number): Observable<any> {
        const url = `${this.base}/articles/${id}/read`;
        return this.http.post<any>(url, {}, { headers: this.headers() }).pipe(
            tap(res => console.log('[LearningApi] Article marked as read:', res)),
            catchError(err => {
                console.error('[LearningApi] Error marking article read:', err);
                return of({ success: false });
            })
        );
    }
}
