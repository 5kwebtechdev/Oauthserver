import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Challenge, Article, LearningCardData, LearningCategorySummary } from '../models/learning.models';
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

    private getUserAge(): number | null {
        try {
            const raw = localStorage.getItem('user_data');
            if (!raw) return null;
            const profile = JSON.parse(raw);
            // Prefer the `age` field the login response stores directly
            if (typeof profile?.age === 'number' && profile.age > 0) return profile.age;
            // Fall back to calculating from DOB
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

    /**
     * Fetch all challenges from backend
     */
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
                map(challenge => challenge ? this.normalizeChallenge(challenge) : null),
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
        skippedQuestions: number[]
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
    fetchArticles(recoverWithEmpty = true): Observable<Article[]> {
        this.articlesLoading$.next(true);
        const age = this.getUserAge();
        const url = age ? `${this.apiUrl}/articles?age=${age}` : `${this.apiUrl}/articles`;
        return this.http.get<Article[] | { articles?: Article[] }>(url, { headers: this.getHeaders() })
            .pipe(
                // The API can return either a bare array or an object like
                // { articles: [...], completed: [...], pending: [...] } —
                // treating the latter as an array (the old assumption) threw
                // at runtime (articles.map is not a function), which
                // catchError silently turned into a generic load failure.
                map(response => Array.isArray(response) ? response : (response?.articles ?? [])),
                tap(articles => {
                    this.articlesCache$.next(articles);
                    this.articlesLoading$.next(false);
                }),
                catchError(error => {
                    console.error('Error fetching articles:', error);
                    this.articlesLoading$.next(false);
                    return recoverWithEmpty ? of([]) : throwError(() => error);
                })
            );
    }

    /**
     * Fetch a specific article by ID
     */
    fetchArticleById(id: number): Observable<Article | null> {
        return this.http.get<Article>(`${this.apiUrl}/articles/${id}`, { headers: this.getHeaders() })
            .pipe(
                map(article => article ? this.normalizeArticle(article) : null),
                catchError(error => {
                    console.error(`Error fetching article ${id}:`, error);
                    return of(null);
                })
            );
    }

    /**
     * Fetch quizzes from dedicated endpoint
     */
    fetchQuizCards(recoverWithEmpty = true): Observable<LearningCardData[]> {
        const age = this.getUserAge();
        const url = age ? `${this.apiUrl}/challenges/quizzes?age=${age}` : `${this.apiUrl}/challenges/quizzes`;
        return this.http.get<Challenge[] | { quizzes?: Challenge[] }>(url, { headers: this.getHeaders() }).pipe(
            // Defensive against the same wrapped-response shape found on
            // /articles ({ quizzes: [...], completed: [...], pending: [...] }
            // instead of a bare array) — see fetchArticles().
            map(response => (Array.isArray(response) ? response : (response?.quizzes ?? [])).map(c => this.transformChallengeToCard(c))),
            catchError(error => {
                console.error('Error fetching quiz cards:', error);
                return recoverWithEmpty ? of([]) : throwError(() => error);
            })
        );
    }

    /**
     * Fetch puzzles from dedicated endpoint
     */
    fetchPuzzleCards(): Observable<LearningCardData[]> {
        const age = this.getUserAge();
        const url = age ? `${this.apiUrl}/challenges/puzzles?age=${age}` : `${this.apiUrl}/challenges/puzzles`;
        return this.http.get<Challenge[] | { puzzles?: Challenge[] }>(url, { headers: this.getHeaders() }).pipe(
            map(response => (Array.isArray(response) ? response : (response?.puzzles ?? [])).map(c => this.transformChallengeToCard(c))),
            catchError(() => of([]))
        );
    }

    /**
     * Fetch articles as cards from dedicated endpoint
     */
    fetchArticleCards(recoverWithEmpty = true): Observable<LearningCardData[]> {
        return this.fetchArticles(recoverWithEmpty).pipe(
            map(articles => articles.map(a => this.transformArticleToCard(a)))
        );
    }

    /**
     * Fetch challenge category summaries for the Learning category grid.
     */
    fetchChallengeCategorySummary(
        challengeType: 'QUIZ' | 'PUZZLE',
        recoverWithEmpty = true
    ): Observable<LearningCategorySummary[]> {
        const url = `${this.apiUrl}/challenges/categories/summary?challengeType=${challengeType}`;
        const type = challengeType === 'QUIZ' ? 'quiz' : 'puzzle';

        return this.http.get<LearningCategorySummary[]>(url, { headers: this.getHeaders() }).pipe(
            map(categories => this.normalizeLearningCategories(categories, type)),
            catchError(error => {
                console.error(`Error fetching ${challengeType} category summary:`, error);
                return recoverWithEmpty ? of([]) : throwError(() => error);
            })
        );
    }

    /**
     * Fetch general challenge categories for the MasterClass tab.
     */
    fetchChallengeCategories(): Observable<LearningCategorySummary[]> {
        return this.http.get<LearningCategorySummary[]>(`${this.apiUrl}/challenges/categories`, { headers: this.getHeaders() }).pipe(
            map(categories => this.normalizeLearningCategories(categories, 'masterclass')),
            catchError(error => {
                console.error('Error fetching challenge categories:', error);
                return of([]);
            })
        );
    }

    /**
     * Fetch article categories for the Learning category grid.
     */
    fetchArticleCategories(recoverWithEmpty = true): Observable<LearningCategorySummary[]> {
        return this.http.get<LearningCategorySummary[]>(`${this.apiUrl}/articles/categories`, { headers: this.getHeaders() }).pipe(
            map(categories => this.normalizeLearningCategories(categories, 'article')),
            catchError(error => {
                console.error('Error fetching article categories:', error);
                return recoverWithEmpty ? of([]) : throwError(() => error);
            })
        );
    }

    /**
     * Fetch the challenge cards belonging to a named Learning category.
     * The category endpoint returns a summary object instead of a plain array.
     */
    fetchChallengesForLearningCategory(
        categoryName: string,
        challengeType?: Challenge['category'],
        recoverWithEmpty = true
    ): Observable<LearningCardData[]> {
        const params = new HttpParams().set('category', categoryName);

        return this.http.get<{ challenges?: Challenge[] } | Challenge[]>(
            `${this.apiUrl}/challenges`,
            { headers: this.getHeaders(), params }
        ).pipe(
            map(response => Array.isArray(response) ? response : (response?.challenges || [])),
            map(challenges => challengeType
                ? challenges.filter(challenge => String(challenge.category).toUpperCase() === challengeType)
                : challenges
            ),
            map(challenges => challenges.map(challenge => this.transformChallengeToCard(challenge))),
            catchError(error => {
                console.error(`Error fetching challenges for category ${categoryName}:`, error);
                return recoverWithEmpty ? of([]) : throwError(() => error);
            })
        );
    }

    /**
     * Fetch the article cards belonging to a named Learning category.
     */
    fetchArticlesForLearningCategory(
        categoryName: string,
        recoverWithEmpty = true
    ): Observable<LearningCardData[]> {
        const params = new HttpParams().set('category', categoryName);

        return this.http.get<{ articles?: Article[] } | Article[]>(
            `${this.apiUrl}/articles`,
            { headers: this.getHeaders(), params }
        ).pipe(
            map(response => Array.isArray(response) ? response : (response?.articles || [])),
            map(articles => articles.map(article => this.transformArticleToCard(article))),
            catchError(error => {
                console.error(`Error fetching articles for category ${categoryName}:`, error);
                return recoverWithEmpty ? of([]) : throwError(() => error);
            })
        );
    }

    private normalizeLearningCategories(
        categories: LearningCategorySummary[] | null | undefined,
        type: LearningCategorySummary['type']
    ): LearningCategorySummary[] {
        return (categories || [])
            .filter(category => (category.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
            .map(category => ({
                ...category,
                type,
                name: category.name || category.categoryName || 'Untitled',
                categoryName: category.categoryName || category.name || 'Untitled',
                thumbnailUrl: this.normalizeApiImageUrl(category.thumbnailUrl || category.image),
                image: this.normalizeApiImageUrl(category.image || category.thumbnailUrl),
                count: Number(category.count || 0)
            }));
    }

    private normalizeApiImageUrl(value?: string | null): string {
        const raw = (value || '').trim();
        if (!raw) return '';

        const markdownUrl = raw.match(/\((https?:\/\/[^)]+)\)/);
        if (markdownUrl?.[1]) return markdownUrl[1];

        const directUrl = raw.match(/https?:\/\/[^\]\s)]+/);
        return directUrl?.[0] || raw;
    }

    /**
     * Fetch "For You" feed (all challenges + articles combined) from dedicated endpoints
     */
    fetchForYouCards(): Observable<LearningCardData[]> {
        const age = this.getUserAge();
        const challengeUrl = age ? `${this.apiUrl}/challenges?age=${age}` : `${this.apiUrl}/challenges`;
        const articleUrl  = age ? `${this.apiUrl}/articles?age=${age}`   : `${this.apiUrl}/articles`;
        return new Observable(observer => {
            Promise.all([
                this.http.get<Challenge[]>(challengeUrl, { headers: this.getHeaders() }).toPromise(),
                this.http.get<Article[]>(articleUrl,    { headers: this.getHeaders() }).toPromise()
            ]).then(([challenges, articles]) => {
                const cards = [
                    ...(challenges || []).map(c => this.transformChallengeToCard(c)),
                    ...(articles   || []).map(a => this.transformArticleToCard(a))
                ];
                observer.next(cards);
                observer.complete();
            }).catch(() => { observer.next([]); observer.complete(); });
        });
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

    private ensureMinSuffix(timeText: string): string {
        if (!timeText) return timeText;
        const lower = timeText.toLowerCase();
        if (lower.includes('min') || lower.includes('hour') || lower.includes('sec')) return timeText;
        if (/^\d+(\.\d+)?\s*$/.test(timeText.trim())) return `${timeText.trim()} min`;
        return timeText;
    }

    /**
     * Transform Challenge to LearningCardData for UI display
     */
    transformChallengeToCard(challenge: Challenge): LearningCardData {
        const normalizedChallenge = this.normalizeChallenge(challenge);
        const isQuiz = normalizedChallenge.category === 'QUIZ';
        const timeText = this.formatApiDuration(normalizedChallenge.timeDuration, 10);
        const buttonLabel = isQuiz ? 'Play Quiz' : 'Play Puzzle';

        return {
            id: normalizedChallenge.challengeId,
            title: normalizedChallenge.name,
            description: normalizedChallenge.description,
            image: normalizedChallenge.thumbnailImageUrl || 'assets/icons/Flux_Dev_a_surreal_and_vibrant_cinematic_photo_of_A_minimal_ye_3%201.jpg',
            coins: normalizedChallenge.coins,
            trophy: normalizedChallenge.trophies,
            difficulty: normalizedChallenge.difficultyDisplay || normalizedChallenge.difficulty,
            buttonText: timeText ? `Finish in ${timeText}` : buttonLabel,
            type: isQuiz ? 'quiz' : 'puzzle',
            // Preserve backend category for use by UI (e.g. superme-badge)
            category: normalizedChallenge.category,
            subType: normalizedChallenge.categoryDisplay,
            totalQuestions: normalizedChallenge.totalQuestions,
            timeDuration: timeText,
            rawData: normalizedChallenge
        };
    }

    /**
     * Transform Article to LearningCardData for UI display
     */
    transformArticleToCard(article: Article): LearningCardData {
        const normalizedArticle = this.normalizeArticle(article);
        const apiArticle = normalizedArticle as Article & { durationMinutes?: number; coins?: number };
        const readTime = apiArticle.durationMinutes
            ? `${apiArticle.durationMinutes} min`
            : this.formatApiDuration(article.timeDuration, 5);

        const normalizedTags = Array.isArray((article as any).tags) ? (article as any).tags : ((article as any).tags ? [String((article as any).tags)] : []);
        console.log(`transformArticleToCard: article id=${article.id} incoming tags=`, (article as any).tags, 'normalized=', normalizedTags, 'coins=', (article as any).coins);

        return {
            id: normalizedArticle.id,
            title: normalizedArticle.title,
            description: normalizedArticle.description,
            image: normalizedArticle.thumbnailUrl || 'assets/icons/Flux_Dev_a_surreal_and_vibrant_cinematic_photo_of_A_minimal_ye_3%201.jpg',
            // Prefer coins from backend article if provided, otherwise fall back to 0
            coins: apiArticle.coins ?? 0,
            buttonText: `Read in ${readTime}`,
            type: 'article',
            timeDuration: normalizedArticle.timeDuration,
            // Normalized tags
            tags: normalizedTags,
            rawData: normalizedArticle
        };
    }

    private normalizeChallenge(challenge: Challenge): Challenge {
        const apiChallenge = challenge as Challenge & { id?: number };
        return {
            ...challenge,
            challengeId: Number(apiChallenge.challengeId ?? apiChallenge.id),
            thumbnailImageUrl: this.normalizeApiImageUrl(challenge.thumbnailImageUrl),
            innerImageUrl: this.normalizeApiImageUrl(challenge.innerImageUrl)
        };
    }

    private normalizeArticle(article: Article): Article {
        return {
            ...article,
            thumbnailUrl: this.normalizeApiImageUrl(article.thumbnailUrl)
        };
    }

    private formatApiDuration(value: string | undefined, fallbackMinutes: number): string {
        switch ((value || '').toUpperCase()) {
            case 'SHORT': return '3 min';
            case 'MEDIUM': return '5 min';
            case 'LONG': return '10 min';
            default: return this.ensureMinSuffix(value || `${fallbackMinutes} min`);
        }
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
                    image: item.thumbnailUrl ?? item.image ?? 'assets/icons/placeholder.png',
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
        const image = item.thumbnailImageUrl ?? item.thumbnailUrl ?? item.image ?? 'assets/icons/placeholder.png';
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
