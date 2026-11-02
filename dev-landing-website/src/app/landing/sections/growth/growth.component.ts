import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import svgPaths from '../../imports/svg-wk71ficgqk';

interface GrowthItem {
  id: string;
  title: string;
  description: string;
  gif: string;
  imageWidth: number;
  imageHeight: number;
  bgColor: string;
  href?: string;
}

@Component({
  selector: 'app-growth-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './growth.component.html',
})
export class GrowthSectionComponent {
  activeIndex = 0;

  arrowPath = svgPaths.p1ceddf00;

  items: GrowthItem[] = [
    {
      id: 'ecom',
      title: 'Back to School Deals Are Here!',
      description: 'Shop uniforms, textbooks, and more in one click, at prices that make you smile.',
      gif: "assets/360 Growth-GIF's/E-Com-cropped.webp",
      imageWidth: 1262,
      imageHeight: 681,
      bgColor: '#e1527c',
      href: '/find-a-book-store',
    },
    {
      id: 'tutors',
      title: 'Trusted Tutors',
      description: 'Find and connect with carefully vetted and experienced tutors.',
      gif: "assets/360 Growth-GIF's/Tutor-cropped.webp",
      imageWidth: 1255,
      imageHeight: 645,
      bgColor: '#e1527c',
      href: '/find-a-tutor',
    },
    {
      id: 'pet',
      title: 'Your Growth Buddy',
      description: 'A virtual pet that learns and evolves with every milestone you achieve.',
      gif: 'assets/Landing/a02667fb8cf13894ff6ff69e69803291bc9cbc49.png',
      imageWidth: 1216,
      imageHeight: 880,
      bgColor: '#89b3b6',
      href: '/pet-gallery',
    },
    {
      id: 'articles',
      title: 'Articles That Inspire',
      description: 'Curated articles on growth topics that matter. Readable during short breaks.',
      gif: "assets/360 Growth-GIF's/Articles-cropped.webp",
      imageWidth: 1259,
      imageHeight: 646,
      bgColor: '#e1527c',
      href: '/blogs',
    },
    {
      id: 'journal',
      title: 'Transformative Power of Journaling',
      description: 'Answer guided daily questions that help you reflect on your day and understand your patterns.',
      gif: "assets/360 Growth-GIF's/Journal-cropped.webp",
      imageWidth: 1259,
      imageHeight: 646,
      bgColor: '#8b8dcb',
      href: '/daily-journal',
    },
    {
      id: 'reels',
      title: 'Scroll time into Skill time',
      description: 'Short reels that turn downtime into growth time. Learn valuable skills while scrolling.',
      gif: "assets/360 Growth-GIF's/Reels-cropped.webp",
      imageWidth: 1258,
      imageHeight: 645,
      bgColor: '#e1527c',
      href: '/reels',
    },
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  setActive(index: number): void {
    this.activeIndex = index;
    this.cdr.markForCheck();
  }
}
