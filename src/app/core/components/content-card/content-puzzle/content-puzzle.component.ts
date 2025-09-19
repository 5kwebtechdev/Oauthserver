import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-content-puzzle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-puzzle.component.html',
  styleUrls: ['./content-puzzle.component.scss']
})
export class ContentPuzzleComponent implements OnInit {
  @Input() data: any;
  @Output() play = new EventEmitter<any>();

  // Provide a default shape so the template can render even if `data` is missing
  defaultData = {
    title: 'The Memory Maze',
    difficulty: 'Hard',
    description: 'Test your memory by finding matching pairs in the shortest time!',
    image: 'assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg',
    rewards: {
      points: 50,
      trophies: 2
    },
    durationLabel: 'Finish in 5 min'
  };

  // A list of puzzles to display (will be used by the template)
  puzzles = [
    this.defaultData,
    {
      title: ' Riddle Royale',
      difficulty: 'Hard',
      description: 'Crack three mind-bending riddles to prove your wit',
      image: 'assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg',
      rewards: { points: 70, trophies: 4 },
      durationLabel: 'Finish in 2 min'
    },
    {
      title: 'Riddle Royale',
      difficulty: 'Hard',
      description: 'Crack three mind-bending riddles to prove your wit',
      image: 'assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg',
      rewards: { points: 70, trophies: 4 },
      durationLabel: 'Finish in 2 min'
    },
    {
      title: 'The Memory Maze',
      difficulty: 'Hard',
      description: 'Spot subtle differences and repeat the pattern to win.',
      image: 'assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg',
      rewards: { points: 50, trophies: 2 },
      durationLabel: 'Finish in 5 min'
    }
  ];

  onPlay(puzzle: any) {
    this.play.emit(puzzle);
  }

  constructor() { }

  ngOnInit(): void {
  }

}
