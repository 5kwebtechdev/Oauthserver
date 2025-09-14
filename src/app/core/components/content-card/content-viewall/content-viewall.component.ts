import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

interface Challenge {
  id: number;
  title: string;
  description: string;
  image: string;
  points: number;
  trophies: number;
  timeLimit: string;
  status: 'available' | 'completed' | 'locked';
  statusColor: string;
}

@Component({
  selector: 'app-content-viewall',
  templateUrl: './content-viewall.component.html',
  styleUrls: ['./content-viewall.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule]
})
export class ContentViewallComponent implements OnInit {
  challenges: Challenge[] = [
    {
      id: 1,
      title: 'The Memory Maze',
      description: 'Test your memory by finding matching pairs in the shortest time!',
      image: 'assets/app-assets/Flux_Dev.svg',
      points: 50,
      trophies: 2,
      timeLimit: 'Finish in 5 min',
      status: 'available',
      statusColor: '#ff4757'
    },
    {
      id: 2,
      title: 'Riddle Royale',
      description: 'Crack three mind-bending riddles!',
      image: 'assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg',
      points: 70,
      trophies: 4,
      timeLimit: 'Solve in 2 min',
      status: 'available',
      statusColor: '#2ed573'
    },
    {
      id: 3,
      title: 'The Memory Maze',
      description: 'Crack three mind-bending riddles!',
      image: 'assets/app-assets/Flux_Dev.svg',
      points: 60,
      trophies: 3,
      timeLimit: 'Solve in 3 min',
      status: 'available',
      statusColor: '#2ed573'
    },
    {
      id: 4,
      title: 'Riddle Royale',
      description: 'Crack three mind-bending riddles!',
      image: 'assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg',
      points: 30,
      trophies: 2,
      timeLimit: 'Solve in 5 min',
      status: 'available',
      statusColor: '#2ed573'
    }
  ];
  constructor(private router: Router) {}

  ngOnInit(): void {}

  // Fallback placeholder in case an image fails to load
  private readonly PLACEHOLDER = 'assets/app-assets/placeholder.svg';

  /**
   * Normalize image path for template use.
   * - If empty -> placeholder
   * - If starts with http(s) -> return as-is
   * - If starts with 'assets/' -> return as-is
   * - Otherwise prepend 'assets/' (handles filenames like 'app-assets/foo.png' or 'images/foo.jpg')
   */
  getImagePath(image?: string): string {
    if (!image) return this.PLACEHOLDER;
    const trimmed = image.trim();
    if (!trimmed) return this.PLACEHOLDER;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      return trimmed;
    }
    if (lower.startsWith('assets/')) return trimmed;
    // encode spaces and other characters safely
    const encoded = encodeURI(trimmed);
    return `assets/${encoded}`;
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src && !target.src.includes(this.PLACEHOLDER)) {
      target.src = this.PLACEHOLDER;
    }
  }

  onChallengeClick(challenge: Challenge): void {
    if (challenge.status === 'available') {
      console.log(`Starting challenge: ${challenge.title}`);
      // Add your challenge start logic here
    }
  }

  onPauseClick(challenge: Challenge): void {
    console.log(`Pausing challenge: ${challenge.title}`);
    // Add pause logic here
  }

  goBack(): void {
    // navigate back to the content main page
    this.router.navigate(['/content']);
  }
}
