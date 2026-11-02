import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
    Challenge,
    Article,
    LearningCardData,
    ChallengeSubmissionResponse,
    HintResponse,
    ChallengeQuestion,
    BadgeProgress,
    ChallengeListItem,
    ChallengesFeedResponse,
    ArticlesFeedResponse
} from './learning.models';

@Injectable({ providedIn: 'root' })
export class LearningService {
    private apiUrl = environment.apiUrl;

    // GET /challenges returns ALL list content (quizzes, puzzles AND articles)
    // in one wrapped response: { challenges: [...], completedChallenges: [...], ... }.
    // Every tab (Quiz/Puzzle/Article) derives from this single shared, replayed
    // call instead of firing its own request. refCount: false keeps the source
    // alive even if every subscriber unsubscribes (e.g. switching tabs mid
    // request), so the call always finishes and later subscribers just get the
    // cached result replayed instantly instead of re-fetching.
    private challengesFeed$: Observable<ChallengeListItem[]> | null = null;

    // GET /articles is a separate endpoint with its own wrapped shape:
    // { articles: [...], completed: [...], pending: [...], ... }. Shared and
    // replayed the same way as challengesFeed$ above.
    private articlesFeed$: Observable<Article[]> | null = null;

    constructor(private http: HttpClient) { }

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('access_token') || '';
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
        });
    }

    /**
     * Fetch the challenges feed (shared across every caller, see challengesFeed$
     * above). Extracts the "challenges" array from the wrapped response and
     * defaults to [] if it's missing, so a malformed response can't throw.
     */
    private fetchChallengesFeed(): Observable<ChallengeListItem[]> {
        if (!this.challengesFeed$) {
            this.challengesFeed$ = this.http.get<ChallengesFeedResponse>(`${this.apiUrl}/challenges`, { headers: this.getHeaders() }).pipe(
                map(response => response?.challenges ?? []),
                catchError(() => of([])),
                shareReplay({ bufferSize: 1, refCount: false })
            );
        }
        return this.challengesFeed$;
    }

    /**
     * Fetch the articles feed (shared across every caller, see articlesFeed$
     * above). Extracts the "articles" array from the wrapped response and
     * defaults to [] if it's missing, so a malformed response can't throw.
     */
    private fetchArticlesFeed(): Observable<Article[]> {
        if (!this.articlesFeed$) {
            this.articlesFeed$ = this.http.get<ArticlesFeedResponse>(`${this.apiUrl}/articles`, { headers: this.getHeaders() }).pipe(
                map(response => response?.articles ?? []),
                catchError(() => of([])),
                shareReplay({ bufferSize: 1, refCount: false })
            );
        }
        return this.articlesFeed$;
    }

    // Fetch a single challenge's full detail (separate endpoint/shape - includes
    // `questions`, used by the play/description flow, not the list tabs).
    fetchChallengeById(id: number): Observable<Challenge | null> {
        return this.http.get<Challenge>(`${this.apiUrl}/challenges/${id}`, { headers: this.getHeaders() }).pipe(
            catchError(() => of(null))
        );
    }

    // Submit challenge answers
    submitChallenge(challengeId: number, payload: { questionAnswers: Record<string, string>; timeTaken: number; skippedQuestions: string[] }): Observable<ChallengeSubmissionResponse> {
        return this.http.post<ChallengeSubmissionResponse>(`${this.apiUrl}/challenges/${challengeId}/submit-all`, payload, { headers: this.getHeaders() }).pipe(
            catchError(err => {
                if ((err.status === 400 || err.status === 409) && err.error?.celebrationText) return of(err.error);
                throw err;
            })
        );
    }

    // Fetch badge progress for the current user
    fetchBadgeProgress(): Observable<BadgeProgress[]> {
        return this.http.get<BadgeProgress[]>(`${this.apiUrl}/badges/progress`, { headers: this.getHeaders() }).pipe(
            catchError(() => of([]))
        );
    }

    // Use hint
    useHint(challengeId: number): Observable<HintResponse> {
        return this.http.post<HintResponse>(`${this.apiUrl}/challenges/${challengeId}/hint`, {}, { headers: this.getHeaders() });
    }

    // Fetch a single article's full content (separate endpoint/shape - used by
    // the article detail page, not the list tab).
    fetchArticleById(id: number): Observable<Article | null> {
        return this.http.get<Article>(`${this.apiUrl}/articles/${id}`, { headers: this.getHeaders() }).pipe(
            catchError(() => of(null))
        );
    }

    /** Public article detail lookup; never sends a user token. */
    fetchPublicArticleBySlug(slug: string): Observable<Article | null> {
        return this.http.get<Article>(`${this.apiUrl}/public/articles/${encodeURIComponent(slug)}`).pipe(
            catchError(() => of(null))
        );
    }

    // Mark article as read
    markArticleAsRead(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/articles/${id}/complete`, {}, { headers: this.getHeaders() }).pipe(
            catchError(() => of(null))
        );
    }

    // Get cards by category - all three derive from the same shared challenges feed
    getQuizCards(): Observable<LearningCardData[]> {
        return this.fetchChallengesFeed().pipe(
            map(items => items.filter(c => (c.category || '').toUpperCase() === 'QUIZ').map(c => this.toCard(c)))
        );
    }

    getPuzzleCards(): Observable<LearningCardData[]> {
        return this.fetchChallengesFeed().pipe(
            map(items => items.filter(c => (c.category || '').toUpperCase() === 'PUZZLE').map(c => this.toCard(c)))
        );
    }

    // Articles come from their own endpoint/shape - no category to filter by,
    // everything in the "articles" array is an article.
    getArticleCards(): Observable<LearningCardData[]> {
        return this.fetchArticlesFeed().pipe(
            map(articles => articles.map(a => this.articleToCard(a)))
        );
    }

    // Transform a challenges-feed list item to the shared card view-model
    private toCard(c: ChallengeListItem): LearningCardData {
        const category = (c.category || '').toUpperCase();
        const type = category === 'QUIZ' ? 'quiz' : category === 'ARTICLE' ? 'article' : 'puzzle';

        return {
            id: c.id,
            title: c.name,
            description: c.description,
            image: c.thumbnailImageUrl || (type === 'article' ? 'assets/images/default-article.jpg' : 'assets/images/default-challenge.jpg'),
            coins: c.coins,
            trophy: c.trophies,
            difficulty: c.difficultyDisplay || c.difficulty,
            buttonText: type === 'article'
                ? (c.timeDuration ? `Read in ${c.timeDuration} mins` : 'Read')
                : (c.timeDuration ? `Finish in ${c.timeDuration} mins` : 'Start'),
            type,
            subType: c.categoryDisplay,
            totalQuestions: c.totalQuestions,
            timeDuration: c.timeDuration,
            rawData: c
        };
    }

    // Transform an articles-feed item to the shared card view-model.
    // durationMinutes (number) becomes timeDuration (string) to match the
    // display field every card component already reads.
    private articleToCard(a: Article): LearningCardData {
        const mins = a.durationMinutes != null ? a.durationMinutes.toString() : '';
        return {
            id: a.id,
            slug: a.slug,
            title: a.title,
            description: a.description,
            image: a.thumbnailUrl || 'assets/images/default-article.jpg',
            coins: a.coins ?? 0,
            buttonText: mins ? `Read in ${mins} mins` : 'Read',
            type: 'article',
            timeDuration: mins,
            tags: a.tags,
            rawData: a
        };
    }

    /**
     * Transform challenge questions to a format suitable for the UI
     */
    transformQuestions(challenge: Challenge): any[] {
        return challenge.questions.map(q => ({
            id: q.questionId,
            text: q.questionText,
            type: this.mapAnswerType(q.answerType),
            options: q.options.map(opt => ({
                id: opt.optionId,
                text: opt.optionText,
                imageUrl: opt.optionImageUrl,
                isCorrect: opt.isCorrect,
                explanation: opt.explanation
            })),
            correctAnswer: '',
            image: q.questionImageUrl || '',
            hint: q.hint || '',
            optionImages: q.options.filter(o => o.imageOption).map(o => o.optionImageUrl || ''),
            contentType: this.determineContentType(q) as 'text-only' | 'image-only' | 'text-and-image'
        }));
    }

    /**
     * Map AnswerType to question type string
     */
    private mapAnswerType(answerType: string): string {
        if (answerType === 'TRUE_FALSE') return 'true-false';
        if (answerType === 'VISUALS') return 'visual';
        return 'mcq';
    }

    /**
     * Determine content type based on question data
     */
    private determineContentType(question: ChallengeQuestion): string {
        const hasText = !!question.questionText;
        const hasImage = !!question.questionImageUrl;
        if (hasText && hasImage) return 'text-and-image';
        if (hasImage) return 'image-only';
        return 'text-only';
    }

    /**
     * Parse time duration string to minutes
     */
    parseTimeDuration(duration: string | undefined): number {
        if (!duration) return 10;
        const match = duration.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 10;
    }

    /**
     * Format time in seconds to display format (MM:SS)
     */
    formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Calculate pet mood based on quiz performance
     */
    calculatePetMood(score: number, total: number): { mood: 'happy' | 'playful' | 'curious' | 'base' | 'tired'; message: string } {
        const percentage = (score / total) * 100;

        if (percentage >= 80) {
            return { mood: 'happy', message: 'Outstanding! You nailed it!' };
        }
        if (percentage >= 60) {
            return { mood: 'playful', message: 'Great job! Keep it up!' };
        }
        if (percentage >= 40) {
            return { mood: 'curious', message: 'Good effort! You\'re learning!' };
        }
        if (percentage >= 20) {
            return { mood: 'base', message: 'Nice try! Practice makes perfect!' };
        }
        return { mood: 'tired', message: 'Don\'t give up! Try again!' };
    }
}
