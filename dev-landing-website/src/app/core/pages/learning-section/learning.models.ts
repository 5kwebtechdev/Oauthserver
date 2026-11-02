/**
 * Learning Section Models - Optimized Types
 */

export type ChallengeCategory = 'QUIZ' | 'PUZZLE';
export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type TimeDuration = 'SHORT' | 'MEDIUM' | 'LONG';
export type AnswerType = 'MCQ' | 'TRUE_FALSE' | 'VISUALS';
export type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'READ';

export interface QuestionOption {
    optionId: number;
    optionText: string;
    optionImageUrl: string | null;
    optionOrder: number;
    isCorrect: boolean;
    explanation: string | null;
    imageOption: boolean;
}

export interface ChallengeQuestion {
    questionId: number;
    questionOrder: number;
    questionText: string;
    questionImageUrl: string | null;
    hint: string | null;
    answerType: AnswerType;
    points: number;
    timeLimit: number;
    positiveFeedback: string | null;
    negativeFeedback: string | null;
    options: QuestionOption[];
    singleChoice: boolean;
    multipleChoice: boolean;
    visual: boolean;
    trueFalse: boolean;
}

export interface Challenge {
    challengeId: number;
    name: string;
    description: string;
    descriptionExpanded: string;
    category: ChallengeCategory;
    difficulty: ChallengeDifficulty;
    topic: string;
    coins: number;
    coinsForCorrectAnswer: number;
    trophies: number;
    timeDuration: string;
    positiveFeedback: string;
    negativeFeedback: string;
    thumbnailImageUrl: string;
    innerImageUrl: string;
    questions: ChallengeQuestion[];
    totalQuestions: number;
    categoryDisplay: string;
    difficultyDisplay: string;
}

/**
 * Single item inside GET /challenges's "challenges" (and completed/pending)
 * arrays - the list-view shape. Distinct from `Challenge` above, which is the
 * full single-challenge detail returned by GET /challenges/:id (includes
 * `questions`, etc.) and is unaffected by this.
 */
export interface ChallengeListItem {
    id: number;
    name: string;
    description: string;
    category: 'QUIZ' | 'PUZZLE' | 'ARTICLE' | string;
    difficulty: string;
    coins: number;
    trophies: number;
    timeDuration: string;
    thumbnailImageUrl: string;
    quiz?: boolean;
    puzzle?: boolean;
    article?: boolean;
    categoryDisplay?: string;
    difficultyDisplay?: string;
    totalQuestions?: number;
}

/** Wrapped response shape returned by GET /challenges. */
export interface ChallengesFeedResponse {
    challenges: ChallengeListItem[];
    completedChallenges?: ChallengeListItem[];
    pendingChallenges?: ChallengeListItem[];
    totalChallenges?: number;
    completedCount?: number;
    completionRate?: number;
    totalCoins?: number;
    totalTrophies?: number;
}

export interface Article {
    id: number;
    /** Stable, unique slug assigned by the backend. */
    slug?: string;
    title: string;
    description: string;
    tags: string[];
    thumbnailUrl: string;
    content: string;
    coins?: number;
    durationMinutes?: number;
    timeDuration?: TimeDuration;
    status: ArticleStatus;
    ageGroups?: string[];
    createdAt?: string | null;
    updatedAt?: string | null;
    publishedAt?: string | null;
    publishedBy?: string | null;
    // Optional fields for display
    category?: string;
    author?: string;
    authorImage?: string;
    imageUrl?: string;
    readTime?: number;
    publishedDate?: string;
    alreadyRead?: boolean;
}

/** Wrapped response shape returned by GET /articles. */
export interface ArticlesFeedResponse {
    articles: Article[];
    completed?: Article[];
    pending?: Article[];
    totalArticles?: number;
    completedCount?: number;
    completionRate?: number;
    totalCoins?: number;
}

export interface LearningCardData {
    id: number;
    slug?: string;
    title: string;
    description: string;
    image: string;
    coins: number;
    trophy?: number;
    difficulty?: string;
    buttonText: string;
    type: 'quiz' | 'puzzle' | 'article';
    subType?: string;
    timeDuration?: string;
    totalQuestions?: number;
    tags?: string[];
    rawData?: Challenge | Article | ChallengeListItem;
}

export interface Question {
    id: number;
    text: string;
    options: string[];
    correctAnswer: string;
    image: string;
    hint: string;
    type: 'mcq' | 'true-false' | 'visual';
    optionImages?: string[];
    contentType: 'text-only' | 'image-only' | 'text-and-image';
    positiveFeedback: string;
    negativeFeedback: string;
}

export interface QuestionAnswer {
    selected: string | null;
    correct: boolean;
    selectedOptionId: number | null;
}

export interface ChallengeSubmissionResponse {
    success: boolean;
    celebrationText: string;
    correctCount: number;
    totalQuestions: number;
    coinsEarned: number;
    trophiesEarned: number;
    totalCoins: number;
    totalTrophies: number;
    percentageScore: number;
    overallFeedback: string;
    firstCompletion: boolean;
    earnedNewBadge: boolean;
    newlyEarnedBadges: any[];
    badgeCelebrationMessage: string | null;
}

export interface BadgeProgress {
    badgeId: number;
    name: string;
    description: string;
    iconUrl: string | null;
    level: number;
    currentProgress: number;
    targetProgress: number;
    earned: boolean;
}

export interface HintResponse {
    hint: string;
    hintCount: number;
}

export interface ChallengeSubmissionRequest {
    questionAnswers: Record<string, string>;
    timeTaken: number;
    skippedQuestions: string[];
}
