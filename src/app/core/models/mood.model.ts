export interface MoodTransition {
  userId: number;
  userName: string;
  date: string; // Format: YYYY-MM-DD
  fromMood: string;
  toMood: string;
  parentVersion: boolean;
  title: string;
  firstLine: string;
  secondLine: string;
}

export interface MoodData {
  [date: string]: MoodTransition; // Key is date in YYYY-MM-DD format
}

export interface VibesDisplayResponse {
  userId: number;
  userName: string;
  relationship: string;
  mood: string;
  audience: string;
  /** How many times the user has set their mood today (server is authoritative; daily cap is 2). */
  moodSetCountToday?: number;
  title: string;
  description: string;
  emptyStateDescription: string;
  completedStateDescription: string;
  totalHabits: number;
  completedHabits: number;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  coins: number;
  trophies: number;
  streak: number;
  badges: number;
  completionRate: number;
  consistencyRate: number;
  improvementRate: number;
  appScore: number;
}

// Mood emoji mapping - only six available mood images
export const MOOD_EMOJI_MAP: { [key: string]: string } = {
  'Happy': 'assets/Images-Transparent/Image-Mood-Happy.png',
  'Very Happy': 'assets/Images-Transparent/Image-Mood-Very happy.png',
  'Excited': 'assets/Images-Transparent/Image-Mood-Excited.png',
  'Sad': 'assets/Images-Transparent/Image-Mood-Sad.png',
  'Upset': 'assets/Images-Transparent/Image-Mood-Upset.png',
  'Nervous': 'assets/Images-Transparent/Image-Mood-Nervous.png',
};
