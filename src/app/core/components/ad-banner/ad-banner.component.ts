import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Slide {
  head: string;
  desc: string;
  cta: string;
  image?: string;
}

@Component({
  selector: 'ad-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ad-banner.component.html',
  styleUrls: ['./ad-banner.component.scss']
})
export class AdBannerComponent implements OnInit, OnDestroy {
  slides: Slide[] = [
    { head: 'Become a Young Scientist!', desc: 'Discover fun experiments with the Science Explorer Kit!', cta: 'Get yours today!', image: 'assets/images/Image 1.png' },
    { head: 'Explore Nature', desc: 'Outdoor discovery activities and step-by-step guides.', cta: 'Get yours today!', image: 'assets/images/Image 1.png' },
    { head: 'Creative Crafts', desc: 'Easy craft ideas for curious minds.', cta: 'Get yours today!', image: 'assets/images/Image 1.png' }
  ];

  currentIndex = 0;
  private intervalMs = 4000;
  private timer: any;

  ngOnInit(): void {
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private startAutoPlay() {
    this.clearTimer();
    this.timer = setInterval(() => this.next(), this.intervalMs);
  }

  private clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;
  }

  goTo(index: number) {
    if (index < 0 || index >= this.slides.length) return;
    this.currentIndex = index;
    this.startAutoPlay();
  }
}
