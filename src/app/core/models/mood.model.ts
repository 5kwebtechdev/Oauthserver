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

// Mood emoji mapping - only six available mood images
export const MOOD_EMOJI_MAP: { [key: string]: string } = {
  'Happy': 'assets/Images-Transparent/Image-Mood-Happy.png',
  'Very Happy': 'assets/Images-Transparent/Image-Mood-Very happy.png',
  'Excited': 'assets/Images-Transparent/Image-Mood-Excited.png',
  'Sad': 'assets/Images-Transparent/Image-Mood-Sad.png',
  'Upset': 'assets/Images-Transparent/Image-Mood-Upset.png',
  'Nervous': 'assets/Images-Transparent/Image-Mood-Nervous.png',
};
