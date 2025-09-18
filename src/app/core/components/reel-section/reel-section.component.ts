import { Component, AfterViewInit, ViewChildren, QueryList, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';

import { ReelsExpandComponent } from './reel-expand/reels-expand.component';
import { BookmarkReelsComponent } from './bookmark-reels/bookmark-reels.component';
import { ReelGuidelinesComponent } from './reel-guidelines/reel-guidelines.component';
import { NewReelsComponent } from './new-reels.component';
import { ShareReelComponent } from './share-reel.component';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';

@Component({
  selector: 'reel-section',
  templateUrl: './reel-section.component.html',
  styleUrls: ['./reel-section.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    ReelsExpandComponent,
    BookmarkReelsComponent,
    ReelGuidelinesComponent,
    NewReelsComponent,
    ShareReelComponent,
    MindfulButtonComponent
  ]
})
export class ReelSectionComponent implements AfterViewInit {
  public slides = [
    {
      id: 1,
      category: 'Science Wonders',
      author: 'SparkleKid',
      title: 'Epic Volcano Eruption Experiment!',
      duration: '20 sec',
      likes: '10K',
      tags: '#FunScience #DIYExperiment',
      image: '/assets/images/reel-1-placeholder.png',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 2,
      category: 'Science Wonders',
      author: 'LabLearner',
      title: 'Grow a Crystal at Home',
      duration: '30 sec',
      likes: '8.2K',
      tags: '#Chemistry #STEM',
      image: '/assets/images/reel-2-placeholder.png',
      video: '',
      isPlaying: false,
      saved: false
    }
  ];

  @ViewChildren('reelItem', { read: ElementRef }) reels!: QueryList<ElementRef>;
  @ViewChild('player', { read: ElementRef }) playerRef!: ElementRef;

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    // minimal initialization to keep component safe for compilation
    if (this.reels && this.reels.length) {
      // placeholder for future player setup
    }
  }

  // Navigation / UI helpers used by the template
  public goBack(): void {
    window.history.back();
  }

  public get slidesByCategory(): Record<string, any[]> {
    const map: Record<string, any[]> = {};
    for (const s of this.slides) {
      const cat = s.category || 'Uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    }
    return map;
  }

  public get categories(): string[] {
    return Object.keys(this.slidesByCategory);
  }

  public openReel(reel: any, event?: Event): void {
    event?.stopPropagation();
    // navigate to expand view (adjust route as needed)
    this.router.navigate(['/reel-expand', reel.id]);
  }

  public toggleSave(reel: any, event?: Event): void {
    event?.stopPropagation();
    reel.saved = !reel.saved;
  }

  public playReel(reel: any, event?: Event): void {
    event?.stopPropagation();
    // simple play flag - replace with real player logic as needed
    reel.isPlaying = true;
  }

  public stopReel(reel: any, event?: Event): void {
    event?.stopPropagation();
    reel.isPlaying = false;
  }

  public playAll(category: string): void {
    const list = this.slidesByCategory[category] || [];
    for (const s of list) {
      s.isPlaying = true;
    }
  }
}

