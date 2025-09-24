import { Injectable } from '@angular/core';
import { Trophy } from './models/trophy.model';

@Injectable({ providedIn: 'root' })
export class TrophyService {
  constructor() {}

  // mock fetch - replace with HTTP call later
  async fetchTrophies(): Promise<Trophy[]> {
    return [
      { id: 't1', title: 'Word Wizard', earnedOn: new Date('2025-03-02'), difficulty: 'Hard', points: 10, image: '/assets/Icons-Neutral/Icon-Trophy.png' },
      { id: 't2', title: 'Shape Master', earnedOn: new Date('2025-03-05'), difficulty: 'Hard', points: 20, image: '/assets/Icons-Neutral/Icon-Trophy.png' },
      { id: 't3', title: 'Color Connoisseur', earnedOn: new Date('2025-02-10'), difficulty: 'Hard', points: 15, image: '/assets/Icons-Neutral/Icon-Trophy.png' },
        { id: 't4', title: 'Design Dynamo', earnedOn: new Date('2025-02-12'), difficulty: 'Easy', points: 5, image: '/assets/Icons-Neutral/Icon-Trophy.png' },
        { id: 't5', title: 'Color Connoisseur', earnedOn: new Date('2025-01-10'), difficulty: 'Hard', points: 15, image: '/assets/Icons-Neutral/Icon-Trophy.png' },
        { id: 't6', title: 'Design Dynamo', earnedOn: new Date('2025-01-12'), difficulty: 'Easy', points: 5, image: '/assets/Icons-Neutral/Icon-Trophy.png' }
    ];
  }
}
