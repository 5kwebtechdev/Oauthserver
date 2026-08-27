/**
 * Learning Section Models
 * Interfaces for Quiz, Puzzle, and Article data from backend
 */

export type ChallengeCategory = 'QUIZ' | 'PUZZLE';
export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type AgeGroup = 'BELOW_11' | 'AGE_11_TO_13' | 'AGE_14_TO_15' | 'AGE_16_TO_17' | 'AGE_18_PLUS';
export type ChallengeStatus = 'DRAFT' | 'PUBLISHED';
export type TimeDuration = 'SHORT' | 'MEDIUM' | 'LONG';
export type AnswerType = 'MCQ' | 'TRUE_FALSE' | 'VISUALS';
export type SectionTitle = 'TODAYS_CHALLENGE' | 'RECENTLY_ADDED';
export type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'READ';

/**
 * Question Option Interface
 */
export interface QuestionOption {
    optionId: number;
    optionText: string;
    optionImageUrl: string | null;
    optionOrder: number;
    isCorrect: boolean;
    explanation: string | null;
    createdAt: string;
    updatedAt: string;
    imageOption: boolean;
}

/**
 * Challenge Question Interface
 */
export interface ChallengeQuestion {
    questionId: number;
    questionOrder: number;
    questionText: string;
    questionImageUrl: string | null;
    hint: string | null;
    answerType: AnswerType;
    points: number;
    timeLimit: number;
    attachmentUrl: string | null;
    attachmentType: string | null;
    positiveFeedback: string | null;
    negativeFeedback: string | null;
    negativeFeedbackTryAgain: string | null;
    createdAt: string;
    updatedAt: string;
    options: QuestionOption[];
    correctOptionsCount: number;
    singleChoice: boolean;
    multipleChoice: boolean;
    visual: boolean;
    trueFalse: boolean;
}

/**
 * Challenge Interface (Quiz/Puzzle)
 */
export interface Challenge {
    challengeId: number;
    name: string;
    description: string;
    descriptionExpanded: string;
    category: ChallengeCategory;
    difficulty: ChallengeDifficulty;
    ageGroups: AgeGroup[];
    topic: string;
    status: ChallengeStatus;
    coins: number;
    coinsForCorrectAnswer: number;
    trophies: number;
    timeDuration: string; // e.g., "10 Minutes", "5 Minutes"
    sectionTitle: SectionTitle;
    positiveFeedback: string | null;
    negativeFeedback: string | null;
    negativeFeedbackTryAgain: string | null;
    thumbnailImageUrl: string;
    innerImageUrl: string;
    enabled: boolean;
    questions: ChallengeQuestion[];
    attachments: any[];
    totalQuestions: number;
    totalPoints: number;
    estimatedTimeMinutes: number | null;
    completionCount: number | null;
    averageScore: number | null;
    statusDisplay: string;
    ageGroupsDisplay: string;
    published: boolean;
    categoryDisplay: string;
    difficultyDisplay: string;
}

/**
 * Article Interface
 */
export interface Article {
    id: number;
    title: string;
    description: string;
    tags: string[];
    ageGroup: AgeGroup;
    thumbnailUrl: string;
    content: string;
    timeDuration: TimeDuration;
    status: ArticleStatus;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    alreadyRead?: boolean;
    relatedChallenges?: Challenge[];
}

/**
 * Card Display Interface - Used for rendering cards in UI
 */
export interface LearningCardData {
    id: number;
    title: string;
    description: string;
    image: string;
    coins: number;
    trophy?: number;
    difficulty?: string;
    difficultyImage?: string; // Optional difficulty image path
    buttonText: string;
    type: 'quiz' | 'puzzle' | 'article' | 'masterclass';
    category?: ChallengeCategory; // backend category for challenges (QUIZ | PUZZLE)
    subType?: string;
    timeDuration?: string;
    totalQuestions?: number;
    tags?: string[];
    rawData?: unknown; // Original API data for navigation and user-scoped progress
}

/**
 * Category summary item returned by learning category APIs.
 */
export interface LearningCategorySummary {
    id: number;
    categoryName?: string;
    name?: string;
    description?: string;
    thumbnailUrl?: string;
    image?: string;
    status?: string;
    count?: number;
    createdAt?: string;
    type?: 'puzzle' | 'quiz' | 'article' | 'masterclass';
}

/**
 * Challenge Submission Request
 */
export interface ChallengeSubmissionRequest {
    answers: {
        questionId: number;
        selectedOptionId: number | null;
        selectedOptionIds?: number[];
    }[];
}

/**
 * Challenge Submission Response
 */
export interface ChallengeSubmissionResponse {
    success: boolean;
    celebrationText: string;
    correctCount: number;
    totalQuestions: number;
    coinsEarned: number;
    trophiesEarned: number;
    totalCoins: number;
    totalTrophies: number;
    badges: any | null;
    challengeCompleted: boolean;
    percentageScore: number;
    questionResults: any | null;
    questionFeedbacks: any | null;
    overallFeedback: string;
    firstCompletion: boolean;
    earnedNewBadge: boolean;
    newlyEarnedBadges: any | null;
    badgeCelebrationMessage: string | null;
}
