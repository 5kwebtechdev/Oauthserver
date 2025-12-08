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
    fetchChallenges(): Observable<Challenge[]> {
        console.log('fetchChallenges called');

        // Return cached data if available
        if (this.challengesCache$.value.length > 0) {
            console.log('Returning cached challenges:', this.challengesCache$.value.length);
            return of(this.challengesCache$.value);
        }

        this.challengesLoading$.next(true);

        const url = `${this.apiUrl}/challenges`;
        console.log('Fetching challenges from:', url);

        return this.http.get<Challenge[]>(url, { headers: this.getHeaders() })
            .pipe(
                tap(challenges => {
                    console.log('Challenges received:', challenges);
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
     * Fetch all articles from backend
     */
    fetchArticles(): Observable<Article[]> {
        console.log('fetchArticles called');

        // Return cached data if available
        if (this.articlesCache$.value.length > 0) {
            console.log('Returning cached articles:', this.articlesCache$.value.length);
            return of(this.articlesCache$.value);
        }

        this.articlesLoading$.next(true);

        const url = `${this.apiUrl}/articles`;
        console.log('Fetching articles from:', url);

        return this.http.get<Article[]>(url, { headers: this.getHeaders() })
            .pipe(
                tap(articles => {
                    console.log('Articles received:', articles);
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
    transformChallengeToCard(challenge: Challenge): LearningCardData {
        const isQuiz = challenge.category === 'QUIZ';
        const timeText = challenge.timeDuration || '10 Minutes';

        return {
            id: challenge.challengeId,
            title: challenge.name,
            description: challenge.description,
            image: challenge.thumbnailImageUrl || '/assets/icons/Flux_Dev_a_surreal_and_vibrant_cinematic_photo_of_A_minimal_ye_3%201.jpg',
            coins: challenge.coins,
            trophy: challenge.trophies,
            difficulty: challenge.difficultyDisplay || challenge.difficulty,
            buttonText: `Finish in ${timeText}`,
            type: isQuiz ? 'quiz' : 'puzzle',
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

        return {
            id: article.id,
            title: article.title,
            description: article.description,
            image: article.thumbnailUrl || '/assets/icons/Flux_Dev_a_surreal_and_vibrant_cinematic_photo_of_A_minimal_ye_3%201.jpg',
            coins: 0, // Articles might not have coins, adjust if needed
            buttonText: `Read in ${readTime}`,
            type: 'article',
            timeDuration: article.timeDuration,
            tags: article.tags,
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
}
