import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

import { ReelsExpandComponent } from '../reel-expand/reels-expand.component';

interface ReelCategory {
  label: string;
  icon: string;
}

interface ReelItem {
  id: number;
  category: string;
  author: string;
  title: string;
  duration: string;
  likes: string;
  tags: string;
  image: string;
  avatar: string;
  video: string;
  aiGenerated?: boolean;
  saved: boolean;
  liked: boolean;
}

@Component({
  selector: 'reel-category',
  templateUrl: './reel-category.component.html',
  styleUrls: ['./reel-category.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReelsExpandComponent]
})
export class ReelCategoryComponent {
  readonly categories: ReelCategory[] = [
    { label: 'Education', icon: 'assets/figma/reels/categories/education.png' },
    { label: 'How-to', icon: 'assets/figma/reels/categories/how-to.png' },
    { label: 'Arts & Creativity', icon: 'assets/figma/reels/categories/arts-creativity.png' },
    { label: 'Entertainment', icon: 'assets/figma/reels/categories/entertainment.png' },
    { label: 'Fitness', icon: 'assets/figma/reels/categories/fitness.png' },
    { label: 'Animals & Nature', icon: 'assets/figma/reels/categories/animals-nature.png' },
    { label: 'Food', icon: 'assets/figma/reels/categories/food.png' },
    { label: 'STEM', icon: 'assets/figma/reels/categories/stem.png' },
    { label: 'Motivational', icon: 'assets/figma/reels/categories/motivational.png' },
    { label: 'Gaming', icon: 'assets/figma/reels/categories/gaming.png' },
    { label: 'People & Vlogs', icon: 'assets/figma/reels/categories/people-vlogs.png' },
    { label: 'Productivity', icon: 'assets/figma/reels/categories/productivity.png' }
  ];

  readonly slides: ReelItem[] = [
    this.createReel(1, 'Education', 'Username', 'Epic Volcano Eruption Experiment!', '20 sec', '10K', true),
    this.createReel(2, 'How-to', 'LabLearner', 'Grow a Crystal at Home', '30 sec', '8.2K'),
    this.createReel(3, 'STEM', 'CurioKid', 'Magnet Tricks You Can Try', '25 sec', '6K'),
    this.createReel(4, 'Arts & Creativity', 'ArtWhiz', 'Painting a Sunset with My Fingers!', '60 sec', '1K'),
    this.createReel(5, 'Productivity', 'DoodleStar', 'Turn Scribbles into Characters', '40 sec', '4.5K'),
    this.createReel(6, 'Entertainment', 'CraftyBee', 'Easy Paper Crafts for Rainy Days', '35 sec', '3.2K'),
    this.createReel(7, 'Fitness', 'FunnyBones', 'Silly Dance Moves to Try', '15 sec', '12K'),
    this.createReel(8, 'Animals & Nature', 'GiggleGang', 'Tiny Pranks (Nice Ones!)', '22 sec', '5K')
  ];

  selectedCategory = 'All';
  searchTerm = '';

  constructor(private readonly router: Router) {}

  get filteredSlides(): ReelItem[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.slides.filter(reel => {
      const matchesCategory = this.selectedCategory === 'All' || reel.category === this.selectedCategory;
      const matchesSearch = !query || [reel.title, reel.author, reel.category, reel.tags]
        .some(value => value.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }

  goBack(): void {
    window.history.back();
  }

  openBookmarks(): void {
    this.router.navigate(['/authed/bookmark-reels']);
  }

  goToMyReels(): void {
    this.router.navigate(['/authed/bookmark-reels'], { queryParams: { source: 'my-reels' } });
  }

  openUpload(): void {
    this.router.navigate(['/authed/upload-reel']);
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  openReel(reel: ReelItem, event?: Event): void {
    event?.stopPropagation();
    window.dispatchEvent(new CustomEvent('openReelExpanded', { detail: reel }));
  }

  toggleSave(reel: ReelItem, event: Event): void {
    event.stopPropagation();
    reel.saved = !reel.saved;
  }

  onCardKeydown(event: KeyboardEvent, reel: ReelItem): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openReel(reel, event);
    }
  }

  trackCategory(_index: number, category: ReelCategory): string {
    return category.label;
  }

  trackReel(_index: number, reel: ReelItem): number {
    return reel.id;
  }

  private createReel(
    id: number,
    category: string,
    author: string,
    title: string,
    duration: string,
    likes: string,
    aiGenerated = false
  ): ReelItem {
    return {
      id,
      category,
      author,
      title,
      duration,
      likes,
      tags: '#FunScience #DIYExperiment....',
      image: 'assets/figma/reels/reel-volcano.png',
      avatar: 'assets/figma/reels/avatar.png',
      video: '',
      aiGenerated,
      saved: false,
      liked: false
    };
  }
}
