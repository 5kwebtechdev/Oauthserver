export interface Trophy {
  id: string;
  title: string;
  earnedOn: Date;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  image?: string;
}
