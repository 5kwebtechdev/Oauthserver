import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Challenge, Article, LearningCardData, LearningCategorySummary } from '../models/learning.models';
import { AuthService } from '../../../package/api/auth.service';
import { UserService } from './user.service';

export interface ChallengeAssignmentResponse {
    challengeId: number;
    challengeName: string;
    assignedBy: number;
    assignedToChild: number[];
    extraCoinsByParent?: number;
    assignedAt: string;
}

export interface ArticleAssignmentResponse {
    articleId: number;
    articleTitle: string;
    assignedBy: number;
    assignedToChild: number[];
    extraCoinsByParent?: number;
    assignedAt: string;
}

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

    constructor(private http: HttpClient, private authService: AuthService, private userService: UserService) { }

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

    /** Resolve age without mixing a selected child's ID with the parent's age. */
    private resolveRequestAge(ageOverride?: number | null): number | null {
        if (ageOverride === null) return null;
        if (ageOverride !== undefined) {
            const age = Number(ageOverride);
            return Number.isFinite(age) && age >= 0 ? Math.floor(age) : null;
        }
        return this.getUserAge();
    }

    /**
     * Assign a quiz/puzzle challenge to one or more children (parent-only).
     */
    assignChallenge(
        challengeId: number,
        childIds: number[],
        extraCoinsByParent: number,
    ): Observable<ChallengeAssignmentResponse> {
        return this.http.post<ChallengeAssignmentResponse>(
            `${this.apiUrl}/challenges/assign`,
            { challengeId, childIds, extraCoinsByParent },
            { headers: this.getHeaders() },
        );
    }

    /**
     * Assign an article to one or more children (parent-only).
     */
    assignArticle(
        articleId: number,
        childIds: number[],
        extraCoinsByParent: number,
    ): Observable<ArticleAssignmentResponse> {
        return this.http.post<ArticleAssignmentResponse>(
            `${this.apiUrl}/articles/assign`,
            { articleId, childIds, extraCoinsByParent },
            { headers: this.getHeaders() },
        );
    }

    /**
     * Fetch all challenges from backend
     */
    fetchChallenges(): Observable<Challenge[]> {
        this.challengesLoading$.next(true);
        const age = this.getUserAge();
        const url = age ? `${this.apiUrl}/challenges?age=${age}` : `${this.apiUrl}/challenges`;
        return this.http.get<Challenge[] | Record<string, Challenge[]>>(url, { headers: this.getHeaders() })
            .pipe(
                // Challenge APIs are returned as either an array or a scoped/
                // paginated object (for example { content: [...] }). Always
                // unwrap the actual records before caching or rendering them.
                map(response => this.normalizeScopedResponse<Challenge>(response, 'challenges')
                    .map(challenge => this.normalizeChallenge(challenge))),
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
    fetchChallengeById(id: number, forUserId?: string | number | null): Observable<Challenge | null> {
        let params = new HttpParams();
        if (forUserId != null && String(forUserId).trim()) {
            params = params.set('forUserId', String(forUserId));
        }
        return this.http.get<Challenge>(`${this.apiUrl}/challenges/${id}`, { headers: this.getHeaders(), params })
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
    }, forUserId?: string | number | null): Observable<any> {
        const submittingUserId = localStorage.getItem('user_id');
        const submittingToken = this.authService.getToken();
        const url = `${this.apiUrl}/challenges/${challengeId}/submit-all`;
        const requestPayload = forUserId != null && String(forUserId).trim()
            ? { ...payload, forUserId: String(forUserId) }
            : payload;

        console.log('Submitting challenge to URL:', url);
        console.log('Full payload:', requestPayload);
        console.log('JSON payload:', JSON.stringify(requestPayload, null, 2));

        return this.http.post<any>(url, requestPayload, { headers: this.getHeaders() })
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
                }),
                tap(response => {
                    // A response for another profile or a previous login must
                    // never change the signed-in user's displayed balance.
                    if (!submittingUserId || submittingUserId !== localStorage.getItem('user_id')
                        || submittingToken !== this.authService.getToken()
                        || (forUserId != null && String(forUserId) !== submittingUserId)) return;
                    const result = response?.data ?? response;
                    if (result?.success === false) return;
                    this.userService.updateCoinBalance(result?.totalCoins ?? result?.total_coins);
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
    fetchArticles(
        recoverWithEmpty = true,
        forUserId?: string | number | null,
        ageOverride?: number | null,
        specificForParent = false
    ): Observable<Article[]> {
        this.articlesLoading$.next(true);
        const age = this.resolveRequestAge(ageOverride);
        let params = new HttpParams();
        if (age != null) params = params.set('age', String(age));
        if (forUserId != null && String(forUserId).trim()) {
            params = params.set('forUserId', String(forUserId));
        }
        if (specificForParent) {
            params = params.set('specificForParent', 'true');
        }
        return this.http.get<Article[] | Record<string, Article[]>>(`${this.apiUrl}/articles`, { headers: this.getHeaders(), params })
            .pipe(
                // The API can return either a bare array or an object like
                // { articles: [...], completed: [...], pending: [...] } —
                // treating the latter as an array (the old assumption) threw
                // at runtime (articles.map is not a function), which
                // catchError silently turned into a generic load failure.
                map(response => this.normalizeScopedResponse<Article>(response, 'articles')),
                tap(articles => {
                    // Analytics asks for an explicit Child/Self context. Do not
                    // replace the shared Learning feed cache with scoped stats.
                    if (forUserId == null) {
                        this.articlesCache$.next(articles);
                    }
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
    fetchArticleById(id: number | string, forUserId?: string | number | null): Observable<Article | null> {
        let params = new HttpParams();
        if (forUserId != null && String(forUserId).trim()) {
            params = params.set('forUserId', String(forUserId));
        }
        return this.http.get<Article>(`${this.apiUrl}/articles/${encodeURIComponent(String(id))}`, { headers: this.getHeaders(), params })
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
    fetchQuizCards(
        recoverWithEmpty = true,
        forUserId?: string | number | null,
        ageOverride?: number | null,
        specificForParent = false
    ): Observable<LearningCardData[]> {
        const age = this.resolveRequestAge(ageOverride);
        let params = new HttpParams();
        if (age != null) params = params.set('age', String(age));
        if (forUserId != null && String(forUserId).trim()) {
            params = params.set('forUserId', String(forUserId));
        }
        if (specificForParent) {
            params = params.set('specificForParent', 'true');
        }
        return this.http.get<Challenge[] | Record<string, Challenge[]>>(`${this.apiUrl}/challenges/quizzes`, { headers: this.getHeaders(), params }).pipe(
            // Defensive against the same wrapped-response shape found on
            // /articles ({ quizzes: [...], completed: [...], pending: [...] }
            // instead of a bare array) — see fetchArticles().
            map(response => this.normalizeScopedResponse<Challenge>(response, 'quizzes')
                .map(c => this.transformChallengeToCard(c))),
            catchError(error => {
                console.error('Error fetching quiz cards:', error);
                return recoverWithEmpty ? of([]) : throwError(() => error);
            })
        );
    }

    /**
     * Fetch puzzles from dedicated endpoint
     */
    fetchPuzzleCards(
        recoverWithEmpty = true,
        forUserId?: string | number | null,
        ageOverride?: number | null
    ): Observable<LearningCardData[]> {
        const age = this.resolveRequestAge(ageOverride);
        let params = new HttpParams();
        if (age != null) params = params.set('age', String(age));
        if (forUserId != null && String(forUserId).trim()) {
            params = params.set('forUserId', String(forUserId));
        }
        return this.http.get<Challenge[] | Record<string, Challenge[]>>(`${this.apiUrl}/challenges/puzzles`, { headers: this.getHeaders(), params }).pipe(
            map(response => this.normalizeScopedResponse<Challenge>(response, 'puzzles')
                .map(c => this.transformChallengeToCard(c))),
            catchError(error => recoverWithEmpty ? of([]) : throwError(() => error))
        );
    }

    /**
     * Fetch articles as cards from dedicated endpoint
     */
    fetchArticleCards(
        recoverWithEmpty = true,
        forUserId?: string | number | null,
        ageOverride?: number | null,
        specificForParent = false
    ): Observable<LearningCardData[]> {
        return this.fetchArticles(recoverWithEmpty, forUserId, ageOverride, specificForParent).pipe(
            map(articles => articles.map(a => this.transformArticleToCard(a)))
        );
    }

    /**
     * Fetch challenge category summaries for the Learning category grid.
     */
    fetchChallengeCategorySummary(
        challengeType: 'QUIZ' | 'PUZZLE',
        recoverWithEmpty = true,
        forUserId?: string | number | null,
        ageOverride?: number | null
    ): Observable<LearningCategorySummary[]> {
        const url = `${this.apiUrl}/challenges/categories/summary?challengeType=${challengeType}`;
        const type = challengeType === 'QUIZ' ? 'quiz' : 'puzzle';
        let params = new HttpParams();
        const age = this.resolveRequestAge(ageOverride);
        if (age != null) {
            params = params.set('age', String(age));
        }
        const userId = forUserId != null && String(forUserId).trim() ? forUserId : this.authService.getUserId();
        if (userId != null && String(userId).trim()) {
            params = params.set('userId', String(userId));
        }
        if (forUserId != null && String(forUserId).trim()) {
            params = params.set('forUserId', String(forUserId));
        }

        return this.http.get<LearningCategorySummary[]>(url, { headers: this.getHeaders(), params }).pipe(
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
    fetchArticleCategories(
        recoverWithEmpty = true,
        forUserId?: string | number | null,
        ageOverride?: number | null
    ): Observable<LearningCategorySummary[]> {
        let params = new HttpParams();
        const age = this.resolveRequestAge(ageOverride);
        if (age != null) {
            params = params.set('age', String(age));
        }
        const userId = forUserId != null && String(forUserId).trim() ? forUserId : this.authService.getUserId();
        if (userId != null && String(userId).trim()) {
            params = params.set('userId', String(userId));
        }
        if (forUserId != null && String(forUserId).trim()) {
            params = params.set('forUserId', String(forUserId));
        }
        return this.http.get<LearningCategorySummary[]>(`${this.apiUrl}/articles/categories`, {
            headers: this.getHeaders(),
            params
        }).pipe(
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
        recoverWithEmpty = true,
        forUserId?: string | number | null,
        ageOverride?: number | null
    ): Observable<LearningCardData[]> {
        let params = new HttpParams().set('category', categoryName);
        const age = this.resolveRequestAge(ageOverride);
        if (age != null) {
            params = params.set('age', String(age));
        }
        if (forUserId != null && String(forUserId).trim()) {
            params = params.set('forUserId', String(forUserId));
        }

        return this.http.get<Record<string, Challenge[]> | Challenge[]>(
            `${this.apiUrl}/challenges`,
            { headers: this.getHeaders(), params }
        ).pipe(
            map(response => this.normalizeScopedResponse<Challenge>(response, 'challenges')),
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
        recoverWithEmpty = true,
        forUserId?: string | number | null,
        age?: number | null
    ): Observable<LearningCardData[]> {
        let params = new HttpParams().set('category', categoryName);
        if (age != null && Number.isFinite(age) && age >= 0) {
            params = params.set('age', String(Math.floor(age)));
        }
        if (forUserId != null && String(forUserId).trim()) {
            params = params.set('forUserId', String(forUserId));
        }

        return this.http.get<Record<string, Article[]> | Article[]>(
            `${this.apiUrl}/articles`,
            { headers: this.getHeaders(), params }
        ).pipe(
            map(response => this.normalizeScopedResponse<Article>(response, 'articles')),
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
            .map(category => {
                const pendingCount = this.resolvePendingCategoryCount(category);
                return {
                    ...category,
                    type,
                    name: category.name || category.categoryName || 'Untitled',
                    categoryName: category.categoryName || category.name || 'Untitled',
                    thumbnailUrl: this.normalizeApiImageUrl(category.thumbnailUrl || category.image),
                    image: this.normalizeApiImageUrl(category.image || category.thumbnailUrl),
                    pendingCount,
                    // Keep `count` aligned with what the category card displays.
                    count: pendingCount
                };
            });
    }

    private resolvePendingCategoryCount(category: LearningCategorySummary): number {
        const pending = category.pending
            ?? category.pendingCount
            ?? category.pendingQuizCount
            ?? category.pendingArticleCount
            ?? category.pendingCourseCount;

        if (pending != null) return this.toCategoryCount(pending);

        const total = category.totalCount ?? category.count;
        const completed = category.completedCount
            ?? category.completedQuizCount
            ?? category.completedArticleCount
            ?? category.completedCourseCount;

        if (total != null && completed != null) {
            return Math.max(0, this.toCategoryCount(total) - this.toCategoryCount(completed));
        }

        // Older API responses expose only `count`; retain that value until the
        // user-scoped pending/completed fields are available.
        return this.toCategoryCount(total);
    }

    private toCategoryCount(value: unknown): number {
        const count = Number(value ?? 0);
        return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    }

    /**
     * Child-scoped learning endpoints may return either a plain array or a
     * response grouped into pending/completed/assigned collections. Preserve
     * that backend progress state on each item instead of dropping it while
     * normalising the response.
     */
    private normalizeScopedResponse<T extends Record<string, any>>(
        response: T[] | Record<string, T[]> | null | undefined,
        primaryKey: string
    ): T[] {
        if (Array.isArray(response)) return response;
        if (!response || typeof response !== 'object') return [];

        const result = new Map<string, T>();
        let anonymousIndex = 0;
        const scopedCollectionName = primaryKey.charAt(0).toUpperCase() + primaryKey.slice(1);
        const addItems = (items: unknown, status?: string) => {
            if (!Array.isArray(items)) return;
            items.forEach(item => {
                if (!item || typeof item !== 'object') return;
                const raw = item as T;
                const id = raw['id'] ?? raw['challengeId'] ?? raw['articleId'] ?? raw['courseId'];
                const key = id == null ? `anonymous-${anonymousIndex++}` : String(id);
                const existing = result.get(key);
                result.set(key, {
                    ...(existing || {} as T),
                    ...raw,
                    ...(status ? { userLearningStatus: status } : {})
                } as T);
            });
        };

        const addScopedItems = (container: Record<string, unknown>) => {
            addItems(container['pending'], 'PENDING');
            addItems(container[`pending${scopedCollectionName}`], 'PENDING');
            addItems(container['assigned'], 'ASSIGNED');
            addItems(container[`assigned${scopedCollectionName}`], 'ASSIGNED');
            addItems(container['inProgress'], 'IN_PROGRESS');
            addItems(container[`inProgress${scopedCollectionName}`], 'IN_PROGRESS');
            addItems(container['completed'], 'COMPLETED');
            addItems(container[`completed${scopedCollectionName}`], 'COMPLETED');
            addItems(container['read'], 'COMPLETED');
            addItems(container[`read${scopedCollectionName}`], 'COMPLETED');
        };

        addItems(response[primaryKey]);
        // Spring pagination and some user-scoped endpoints wrap the list in
        // `content`, `items`, or `data`.  Support each response shape so a
        // successful request cannot be mistaken for an empty feed.
        addItems(response['content']);
        addItems(response['items']);
        addItems(response['results']);
        if (response['data'] && typeof response['data'] === 'object' && !Array.isArray(response['data'])) {
            const data = response['data'] as Record<string, unknown>;
            addItems(data[primaryKey]);
            addItems(data['content']);
            addItems(data['items']);
            addItems(data['results']);
            addScopedItems(data);
        } else {
            addItems(response['data']);
        }
        // The challenge endpoint uses keys such as `pendingChallenges` and
        // `completedChallenges`. Add those after the general `challenges`
        // collection so the user-scoped state wins when an item is repeated.
        addScopedItems(response as Record<string, unknown>);

        return Array.from(result.values());
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
            // The API's difficultyDisplay is a pre-formatted label (e.g. "Easy")
            // — lowercase it at the source rather than relying on the badge's
            // CSS text-transform, since that pre-formatted casing was leaking
            // through in some renders.
            difficulty: String(normalizedChallenge.difficultyDisplay || normalizedChallenge.difficulty || '').toLowerCase(),
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
            timeDuration: readTime,
            // Normalized tags
            tags: normalizedTags,
            rawData: normalizedArticle
        };
    }

    private normalizeChallenge(challenge: Challenge): Challenge {
        const apiChallenge = challenge as Challenge & { id?: number; challengeType?: string; type?: string };
        const rawCategory = String(apiChallenge.category ?? apiChallenge.challengeType ?? apiChallenge.type ?? '').toUpperCase();
        const category = rawCategory.includes('QUIZ')
            ? 'QUIZ'
            : rawCategory.includes('PUZZLE')
                ? 'PUZZLE'
                : rawCategory as Challenge['category'];
        return {
            ...challenge,
            challengeId: Number(apiChallenge.challengeId ?? apiChallenge.id),
            category,
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
    useHint(questionId: number, forUserId?: string | number | null): Observable<any> {
        const url = `${this.apiUrl}/challenges/hint/${questionId}/use`;
        let params = new HttpParams();
        if (forUserId != null && String(forUserId).trim()) {
            params = params.set('forUserId', String(forUserId));
        }
        return this.http.get<any>(url, { headers: this.getHeaders(), params })
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
    markArticleComplete(
        articleId: number,
        feedback?: 'VERY_HELPFUL' | 'HELPFUL' | 'NOT_HELPFUL',
        forUserId?: string | number | null
    ): Observable<any> {
        const url = `${this.apiUrl}/articles/${articleId}/complete`;
        const params = feedback ? new HttpParams().set('feedback', feedback) : undefined;
        const body = forUserId != null && String(forUserId).trim()
            ? { forUserId: String(forUserId) }
            : {};
        console.log('Marking article complete at:', url);
        return this.http.post<any>(url, body, { headers: this.getHeaders(), params })
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
                    image: item.thumbnailUrl ?? item.image ?? 'assets/icons/placeholder.webp',
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
        const image = item.thumbnailImageUrl ?? item.thumbnailUrl ?? item.image ?? 'assets/icons/placeholder.webp';
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
