import { Component, OnInit } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

interface Rewards { points: number; trophies: number; }
interface Challenge {
  id: number;
  title: string;
  difficulty: string;
  description: string;
  rewards?: Rewards;
  durationLabel: string;
  image: string;
}

@Component({
  selector: 'app-content-viewall',
  templateUrl: './content-viewall.component.html',
  styleUrls: ['./content-viewall.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule]
})
export class ContentViewallComponent implements OnInit {
  // public properties used by template
  data: Challenge[] = [];      // optional external data source
  puzzles: Challenge[] = [     // fallback sample items (six)
    {
      id: 1,
      title: 'The Memory Maze',
      difficulty: 'Puzzle',
      description: 'Test your memory by finding matching pairs in the shortest time!',
      rewards: { points: 50, trophies: 2 },
      durationLabel: 'Finish in 5 min',
      image: '/assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg'
    },
    {
      id: 2,
      title: 'Focus Flow',
      difficulty: 'Easy',
      description: 'Short tasks to help you sharpen attention and focus.',
      rewards: { points: 30, trophies: 1 },
      durationLabel: 'Finish in 3 min',
      image: '/assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg'
    },
    {
      id: 3,
      title: 'Pattern Pursuit',
      difficulty: 'Medium',
      description: 'Recognize and continue sequences under time pressure.',
      rewards: { points: 45, trophies: 1 },
      durationLabel: 'Finish in 7 min',
      image: '/assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg'
    },
    {
      id: 4,
      title: 'Speed Math',
      difficulty: 'Hard',
      description: 'Solve quick mental arithmetic problems as fast as you can.',
      rewards: { points: 60, trophies: 3 },
      durationLabel: 'Finish in 4 min',
      image: '/assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg'
    },
    {
      id: 5,
      title: 'Word Weave',
      difficulty: 'Puzzle',
      description: 'Form words from mixed letters to expand vocabulary and recall.',
      rewards: { points: 35, trophies: 1 },
      durationLabel: 'Finish in 6 min',
      image: '/assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg'
    },
    {
      id: 6,
      title: 'Zen Balance',
      difficulty: 'Relax',
      description: 'Breathing and simple mindfulness micro-tasks for calm and clarity.',
      rewards: { points: 20, trophies: 0 },
      durationLabel: 'Finish in 2 min',
      image: '/assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg'
    }
  ];

  constructor(private location: Location) {}

  ngOnInit(): void {
    // Use puzzles as fallback if data not provided by parent/service
    if (!this.data || !this.data.length) {
      this.data = []; // keep empty to demonstrate fallback; template will use puzzles
    }
    // debug help: open browser console to see this log
    console.log('ContentViewall initialized, data length:', this.data?.length, 'puzzles length:', this.puzzles?.length);
  }

  // explicit getter to use in template — safer than inline ternary logic
  get list(): Challenge[] {
    return (this.data && this.data.length) ? this.data : this.puzzles;
  }

  goBack(): void {
    this.location.back();
  }

  onPlay(challenge: Challenge): void {
    console.log('Play challenge:', challenge);
  }
}
