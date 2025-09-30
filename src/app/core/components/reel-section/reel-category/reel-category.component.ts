import { Component, AfterViewInit, ViewChildren, QueryList, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';

import { ReelsExpandComponent } from 'src/app/core/components/reel-section/reel-expand/reels-expand.component';
import { BookmarkReelsComponent } from 'src/app/core/components/reel-section/bookmark-reels/bookmark-reels.component';
import { ReelGuidelinesComponent } from 'src/app/core/components/reel-section/reel-guidelines/reel-guidelines.component';
import { NewReelsComponent } from 'src/app/core/components/reel-section/new-reels/new-reels.component';
import { ShareReelComponent } from 'src/app/core/components/reel-section/share-reel.component';
import { MindfulButtonComponent } from 'src/app/core/components/mindful-button/mindful-button.component';
import { MindfulCardHeaderComponent } from 'src/app/core/components/mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ReelsCardComponent } from 'src/app/core/components/reel-section/reels-card/reels-card.component';

@Component({
  selector: 'reel-category',
  templateUrl: './reel-category.component.html',
  styleUrls: ['./reel-category.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ReelsExpandComponent, BookmarkReelsComponent, ReelGuidelinesComponent, NewReelsComponent, ShareReelComponent, MindfulButtonComponent, MindfulCardHeaderComponent, ReelsCardComponent]
})
export class ReelCategoryComponent implements AfterViewInit {
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
      tags: '#ScienceAtHome #Crystals',
      image: '/assets/images/reel-1-placeholder.png',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 3,
      category: 'Science Wonders',
      author: 'CurioKid',
      title: 'Magnet Tricks You Can Try',
      duration: '25 sec',
      likes: '6K',
      tags: '#Magnets #FunFacts',
      image: '/assets/images/reel-1-placeholder.png',
      video: '',
      isPlaying: false,
      saved: false
    },

    // Creative Arts
    {
      id: 4,
      category: 'Creative Arts',
      author: 'ArtWhiz',
      title: 'Painting a Sunset with My Fingers!',
      duration: '60 sec',
      likes: '1K',
      tags: '#LittleArtist #MessyFun',
      image: '/assets/images/reel-1-placeholder.png',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 5,
      category: 'Creative Arts',
      author: 'DoodleStar',
      title: 'Turn Scribbles into Characters',
      duration: '40 sec',
      likes: '4.5K',
      tags: '#Drawing #KidsArt',
      image: '/assets/images/reel-1-placeholder.png',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 6,
      category: 'Creative Arts',
      author: 'CraftyBee',
      title: 'Easy Paper Crafts for Rainy Days',
      duration: '35 sec',
      likes: '3.2K',
      tags: '#Crafts #DIY',
      image: '/assets/images/reel-1-placeholder.png',
      video: '',
      isPlaying: false,
      saved: false
    },

    // Comedy & Fun
    {
      id: 7,
      category: 'Comedy & Fun',
      author: 'FunnyBones',
      title: 'Silly Dance Moves to Try',
      duration: '15 sec',
      likes: '12K',
      tags: '#Dance #Silly',
      image: '/assets/images/reel-1-placeholder.png',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 8,
      category: 'Comedy & Fun',
      author: 'GiggleGang',
      title: 'Tiny Pranks (Nice Ones!)',
      duration: '22 sec',
      likes: '5K',
      tags: '#Pranks #GoodVibes',
      image: '/assets/images/reel-1-placeholder.png',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 9,
      category: 'Comedy & Fun',
      author: 'SmileSquad',
      title: 'Funny Face Challenge',
      duration: '18 sec',
      likes: '9K',
      tags: '#Faces #Challenge',
      image: '/assets/images/reel-1-placeholder.png',
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

  // categories used by the template
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
    // also dispatch a global event for other parts of the app to respond to
    try {
      const ev = new CustomEvent('openReelPlayAll', { detail: { category, slides: list } });
      window.dispatchEvent(ev);
    } catch (e) {
      // ignore in environments where CustomEvent may be restricted
    }
  }
}

