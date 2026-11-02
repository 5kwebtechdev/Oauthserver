export type CourseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | string;

export interface Course {
  id: number;
  courseName: string;
  category: string;
  description?: string;
  thumbnailUrl: string;
  noOfLessons: number;
  duration: number;
  difficulty: CourseDifficulty;
  totalCoins: number;
  progressStatus?: string;
  completionPercentage?: number;
  completedLessons?: number;
}
