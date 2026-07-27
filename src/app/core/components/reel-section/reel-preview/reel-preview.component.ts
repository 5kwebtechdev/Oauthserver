import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface ReelPreviewItem {
  category: string;
  /** Drives the card's placeholder gradient + tag color until real thumbnails/API land */
  categoryClass: 'science' | 'art';
  author: string;
  title: string;
}

@Component({
  selector: 'reel-preview-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reel-preview.component.html',
  styleUrls: ['./reel-preview.component.scss']
})
export class ReelPreviewSectionComponent {
  @Input() title = 'Made by Kids, for Kids!';
  @Input() subtitle = 'Watch reels • Create • Get Inspired';

  // TODO: hardcoded for now — replace with the reels API response once available.
  @Input() items: ReelPreviewItem[] = [
    {
      category: 'Science Wonders',
      categoryClass: 'science',
      author: 'ScienceGuy',
      title: 'Epic Volcano Eruption Experiment!'
    },
    {
      category: 'Creative Arts',
      categoryClass: 'art',
      author: 'ArtWhiz',
      title: 'Painting a Sunset with My Fingers!'
    }
  ];
}
