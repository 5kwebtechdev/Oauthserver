import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Challenge, Article, LearningCardData } from '../models/learning.models';
import { AuthService } from '../../../package/api/auth.service';

@Injectable({
    providedIn: 'root'
})
export class LearningService {
    private apiUrl = environment.apiUrl;

    // Cache for challenges and articles
    private challengesCache$ = new BehaviorSubject<Challenge[]>([]);
    private articlesCache$ = new BehaviorSubject<Article[]>([]);

    // Loading states
    private challengesLoading$ = new BehaviorSubject<boolean>(false);
    private articlesLoading$ = new BehaviorSubject<boolean>(false);

    // Combined loading state
    public isLoading$ = new BehaviorSubject<boolean>(false);

    constructor(private http: HttpClient, private authService: AuthService) { }

    /**
     * Get HTTP headers with authorization token
     */
    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        } else if (environment.apiAuthToken) {
            // fallback to environment token
            const envValue = environment.apiAuthToken.startsWith('Bearer ') ? environment.apiAuthToken : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envValue);
        }

        return headers;
    }

    /**
     * Fetch all challenges from backend
     */
    private getUserAge(): number | null {
        try {
            const raw = localStorage.getItem('user_data');
            if (!raw) return null;
            const profile = JSON.parse(raw);
            const dob = profile?.dateOfBirth || profile?.dob;
            if (!dob) return null;
            const birth = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            return age > 0 ? age : null;
        } catch {
            return null;
        }
    }

    fetchChallenges(): Observable<Challenge[]> {
        this.challengesLoading$.next(true);
        const age = this.getUserAge();
        const url = age ? `${this.apiUrl}/challenges?age=${age}` : `${this.apiUrl}/challenges`;
        return this.http.get<Challenge[]>(url, { headers: this.getHeaders() })
            .pipe(
                tap(challenges => {
                    this.challengesCache$.next(challenges);
                    this.challengesLoading$.next(false);
                }),
                catchError(error => {
                    console.error('Error fetching challenges:', error);
                    this.challengesLoading$.next(false);
                    return of([]);
                })
            );
    }

    /**
     * Fetch a specific challenge by ID
     */
    fetchChallengeById(id: number): Observable<Challenge | null> {
        return this.http.get<Challenge>(`${this.apiUrl}/challenges/${id}`, { headers: this.getHeaders() })
            .pipe(
                catchError(error => {
                    console.error(`Error fetching challenge ${id}:`, error);
                    return of(null);
                })
            );
    }

    /**
     * Submit challenge answers (new format)
     */
    submitChallengeNewFormat(challengeId: number, payload: {
        questionAnswers: { [key: string]: string },
        timeTaken: number,
        skippedQuestions: string[]
    }): Observable<any> {
        const url = `${this.apiUrl}/challenges/${challengeId}/submit-all`;

        console.log('Submitting challenge to URL:', url);
        console.log('Full payload:', payload);
        console.log('JSON payload:', JSON.stringify(payload, null, 2));

        return this.http.post<any>(url, payload, { headers: this.getHeaders() })
            .pipe(
                tap(response => {
                    console.log('Challenge submission response:', response);
                }),
                catchError(error => {
                    console.error('Error submitting challenge:', error);
                    // If it's a 409 error (conflict), the backend might still return useful data
                    if (error.status === 409 && error.error) {
                        // Return the error response body so the UI can handle it appropriately
                        return of(error.error);
                    }
                    // If it's a 400 error (bad request), check if it contains successful response data
                    if (error.status === 400 && error.error) {
                        console.error('Bad request details:', error.error);
                        // If the error response looks like a successful submission response, return it
                        if (error.error.celebrationText || error.error.success !== undefined) {
                            return of(error.error);
                        }
                    }
                    throw error;
                })
            );
    }

    /**
     * Submit challenge answers (legacy format)
     */
    submitChallenge(challengeId: number, answers: { questionId: number; selectedOptionId: number | null; selectedOptionIds?: number[]; }[]): Observable<any> {
        const url = `${this.apiUrl}/challenges/${challengeId}/submit-all`;
        const payload = { answers };

        console.log('Submitting challenge:', challengeId, payload);

        return this.http.post<any>(url, payload, { headers: this.getHeaders() })
            .pipe(
                tap(response => {
                    console.log('Challenge submission response:', response);
                }),
                catchError(error => {
                    console.error('Error submitting challenge:', error);
                    throw error;
                })
            );
    }

    /**
     * Reset loading state to false
     */
    resetLoadingState(): void {
        this.isLoading$.next(false);
    }

    /**
     * Fetch all articles from backend
     */
    fetchArticles(): Observable<Article[]> {
        this.articlesLoading$.next(true);
        const age = this.getUserAge();
        const url = age ? `${this.apiUrl}/articles?age=${age}` : `${this.apiUrl}/articles`;
        return this.http.get<Article[]>(url, { headers: this.getHeaders() })
            .pipe(
                tap(articles => {
                    this.articlesCache$.next(articles);
                    this.articlesLoading$.next(false);
                }),
                catchError(error => {
                    console.error('Error fetching articles:', error);
                    this.articlesLoading$.next(false);
                    return of([]);
                })
            );
    }

    /**
     * Fetch a specific article by ID
     */
    fetchArticleById(id: number): Observable<Article | null> {
        return this.http.get<Article>(`${this.apiUrl}/articles/${id}`, { headers: this.getHeaders() })
            .pipe(
                catchError(error => {
                    console.error(`Error fetching article ${id}:`, error);
                    return of(null);
                })
            );
    }

    /**
     * Get challenges filtered by category (QUIZ or PUZZLE)
     */
    getChallengesByCategory(category: 'QUIZ' | 'PUZZLE'): Observable<Challenge[]> {
        return this.fetchChallenges().pipe(
            map(challenges => challenges.filter(challenge => challenge.category === category))
        );
    }

    /**
     * Get all quizzes
     */
    getQuizzes(): Observable<Challenge[]> {
        return this.getChallengesByCategory('QUIZ');
    }

    /**
     * Get all puzzles
     */
    getPuzzles(): Observable<Challenge[]> {
        return this.getChallengesByCategory('PUZZLE');
    }

    /**
     * Transform Challenge to LearningCardData for UI display
     */
    private ensureMinSuffix(timeText: string): string {
        if (!timeText) return timeText;
        const lower = timeText.toLowerCase();
        if (lower.includes('min') || lower.includes('hour') || lower.includes('sec')) return timeText;
        // If it's a pure number or number with only spaces, append " min"
        if (/^\d+(\.\d+)?\s*$/.test(timeText.trim())) return `${timeText.trim()} min`;
        return timeText;
    }

    transformChallengeToCard(challenge: Challenge): LearningCardData {
        const isQuiz = challenge.category === 'QUIZ';
        const timeText = this.ensureMinSuffix(challenge.timeDuration || '10 min');
        const buttonLabel = isQuiz ? 'Play Quiz' : 'Play Puzzle';

        return {
            id: challenge.challengeId,
            title: challenge.name,
            description: challenge.description,
            image: challenge.thumbnailImageUrl || '/assets/icons/Flux_Dev_a_surreal_and_vibrant_cinematic_photo_of_A_minimal_ye_3%201.jpg',
            coins: challenge.coins,
            trophy: challenge.trophies,
            difficulty: challenge.difficultyDisplay || challenge.difficulty,
            buttonText: timeText ? `Finish in ${timeText}` : buttonLabel,
            type: isQuiz ? 'quiz' : 'puzzle',
            // Preserve backend category for use by UI (e.g. mindful-badge)
            category: challenge.category,
            subType: challenge.categoryDisplay,
            totalQuestions: challenge.totalQuestions,
            timeDuration: timeText,
            rawData: challenge
        };
    }

    /**
     * Transform Article to LearningCardData for UI display
     */
    transformArticleToCard(article: Article): LearningCardData {
        // Calculate reading time from timeDuration
        let readTime = '5 min';
        if (article.timeDuration === 'SHORT') readTime = '3 min';
        if (article.timeDuration === 'MEDIUM') readTime = '5 min';
        if (article.timeDuration === 'LONG') readTime = '10 min';

        const normalizedTags = Array.isArray((article as any).tags) ? (article as any).tags : ((article as any).tags ? [String((article as any).tags)] : []);
        console.log(`transformArticleToCard: article id=${article.id} incoming tags=`, (article as any).tags, 'normalized=', normalizedTags, 'coins=', (article as any).coins);

        return {
            id: article.id,
            title: article.title,
            description: article.description,
            image: article.thumbnailUrl || '/assets/icons/Flux_Dev_a_surreal_and_vibrant_cinematic_photo_of_A_minimal_ye_3%201.jpg',
            // Prefer coins from backend article if provided, otherwise fall back to 0
            coins: (article as any)?.coins ?? 0,
            buttonText: `Read in ${readTime}`,
            type: 'article',
            timeDuration: article.timeDuration,
            // Normalized tags
            tags: normalizedTags,
            rawData: article
        };
    }

    /**
     * Get quiz cards formatted for UI
     */
    getQuizCards(): Observable<LearningCardData[]> {
        this.isLoading$.next(true);
        return this.getQuizzes().pipe(
            map(quizzes => quizzes.map(quiz => this.transformChallengeToCard(quiz))),
            tap(() => this.isLoading$.next(false))
        );
    }

    /**
     * Get puzzle cards formatted for UI
     */
    getPuzzleCards(): Observable<LearningCardData[]> {
        this.isLoading$.next(true);
        return this.getPuzzles().pipe(
            map(puzzles => puzzles.map(puzzle => this.transformChallengeToCard(puzzle))),
            tap(() => this.isLoading$.next(false))
        );
    }

    /**
     * Get article cards formatted for UI
     */
    getArticleCards(): Observable<LearningCardData[]> {
        this.isLoading$.next(true);
        return this.fetchArticles().pipe(
            map(articles => articles.map(article => this.transformArticleToCard(article))),
            tap(() => this.isLoading$.next(false))
        );
    }

    /**
     * Get all content for "For You" section (quizzes, puzzles, and articles combined)
     */
    getForYouContent(): Observable<LearningCardData[]> {
        return this.fetchChallenges().pipe(
            map(challenges => {
                const challengeCards = challenges.map(challenge => this.transformChallengeToCard(challenge));
                return challengeCards;
            })
        );
    }

    /**
     * Get combined content including articles for "For You" section
     */
    getAllContent(): Observable<LearningCardData[]> {
        this.isLoading$.next(true);

        return new Observable(observer => {
            const challengesObs = this.fetchChallenges();
            const articlesObs = this.fetchArticles();

            // Combine both observables
            Promise.all([
                challengesObs.toPromise(),
                articlesObs.toPromise()
            ]).then(([challenges, articles]) => {
                const challengeCards = (challenges || []).map(challenge => this.transformChallengeToCard(challenge));
                const articleCards = (articles || []).map(article => this.transformArticleToCard(article));

                // Combine and return flat array
                const allContent = [...challengeCards, ...articleCards];

                this.isLoading$.next(false);
                observer.next(allContent);
                observer.complete();
            }).catch(error => {
                console.error('Error fetching all content:', error);
                this.isLoading$.next(false);
                observer.next([]);
                observer.complete();
            });
        });
    }

    /**
     * Force refresh challenges from backend
     */
    refreshChallenges(): Observable<Challenge[]> {
        this.challengesCache$.next([]);
        return this.fetchChallenges();
    }

    /**
     * Force refresh articles from backend
     */
    refreshArticles(): Observable<Article[]> {
        this.articlesCache$.next([]);
        return this.fetchArticles();
    }

    /**
     * Get loading state for challenges
     */
    getChallengesLoadingState(): Observable<boolean> {
        return this.challengesLoading$.asObservable();
    }

    /**
     * Get loading state for articles
     */
    getArticlesLoadingState(): Observable<boolean> {
        return this.articlesLoading$.asObservable();
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.challengesCache$.next([]);
        this.articlesCache$.next([]);
    }

    /**
     * Use a hint for a specific challenge
     * @param challengeId The ID of the challenge
     * @returns Observable with the API response
     */
    useHint(questionId: number): Observable<any> {
        const url = `${this.apiUrl}/challenges/hint/${questionId}/use`;
        return this.http.get<any>(url, { headers: this.getHeaders() })
            .pipe(
                tap(response => {
                    console.log('Hint used successfully:', response);
                }),
                catchError(error => {
                    console.error('Error using hint:', error);
                    throw error;
                })
            );
    }

    /**
     * Mark an article as complete/read for the current user
     */
    markArticleComplete(articleId: number): Observable<any> {
        const url = `${this.apiUrl}/articles/${articleId}/complete`;
        console.log('Marking article complete at:', url);
        return this.http.post<any>(url, {}, { headers: this.getHeaders() })
            .pipe(
                tap(response => {
                    console.log('Article marked complete:', response);
                }),
                catchError(error => {
                    console.error('Error marking article complete:', error);
                    throw error;
                })
            );
    }

    /**
     * Search learning content by keyword and optional category
     * @param keyword Search keyword
     * @param category Optional category: 'puzzle', 'quiz', 'article' (omit for all)
     */
    search(keyword: string, category?: string): Observable<LearningCardData[]> {
        this.isLoading$.next(true);
        let url = `${this.apiUrl}/learning/search?keyword=${encodeURIComponent(keyword)}`;
        if (category) {
            url += `&category=${encodeURIComponent(category)}`;
        }
        console.log('LearningService.search -> URL:', url, 'keyword:', keyword, 'category:', category);
        return this.http.get<any[]>(url, { headers: this.getHeaders() }).pipe(
            map(results => results.map(item => this.mapSearchItemToCard(item))),
            tap(() => this.isLoading$.next(false)),
            catchError(error => {
                console.error('Search error:', error);
                this.isLoading$.next(false);
                return of([]);
            })
        );
    }

    /**
     * Map a raw search result item to LearningCardData, handling different shapes
     */
    private mapSearchItemToCard(item: any): LearningCardData {
        const rawType = (item?.type || item?.category || '').toString().toUpperCase();

        if (rawType === 'ARTICLE' || rawType === 'ARTICLE') {
            try {
                return this.transformArticleToCard(item as Article);
            } catch (e) {
                // Fallback mapping for article-like objects
                return {
                    id: item.id ?? 0,
                    title: item.title ?? item.name ?? 'Untitled',
                    description: item.description ?? '',
                    image: item.thumbnailUrl ?? item.image ?? '/assets/icons/placeholder.png',
                    coins: (item.coins as number) ?? 0,
                    buttonText: `Read in ${item.timeDuration ?? '5 min'}`,
                    type: 'article',
                    timeDuration: item.timeDuration,
                    rawData: item
                } as LearningCardData;
            }
        }

        // Treat as challenge (quiz / puzzle)
        const typeLower = rawType === 'PUZZLE' ? 'puzzle' : rawType === 'QUIZ' ? 'quiz' : (item.type || '').toString().toLowerCase();

        const id = item.challengeId ?? item.id ?? 0;
        const title = item.name ?? item.title ?? item.name ?? 'Untitled Challenge';
        const description = item.description ?? '';
        const image = item.thumbnailImageUrl ?? item.thumbnailUrl ?? item.image ?? '/assets/icons/placeholder.png';
        const coins = (item.coins as number) ?? 0;
        const trophy = (item.trophies as number) ?? undefined;
        const difficulty = item.difficultyDisplay ?? item.difficulty ?? undefined;
        const timeText = this.ensureMinSuffix(item.timeDuration ?? (item.estimatedTimeMinutes ? `${item.estimatedTimeMinutes} min` : '10 min'));

        return {
            id,
            title,
            description,
            image,
            coins,
            trophy,
            difficulty,
            buttonText: `Finish in ${timeText}`,
            type: (typeLower === 'quiz' || typeLower === 'puzzle') ? (typeLower as 'quiz' | 'puzzle') : 'quiz',
            category: (item.category as any) ?? undefined,
            subType: item.categoryDisplay ?? item.subType,
            totalQuestions: item.totalQuestions ?? undefined,
            timeDuration: timeText,
            rawData: item
        } as LearningCardData;
    }
}
