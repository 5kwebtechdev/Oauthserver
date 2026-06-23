import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Slide {
  head: string;
  desc: string;
  cta: string;
  badge: string;
  badgeBg: string;
  accent: string;
  bg: string;
  blob: string;
  image?: string;
  ctaRoute?: string;
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
    {
      badge: 'Science',
      badgeBg: 'rgba(255, 152, 0, 0.15)',
      accent: '#E07B00',
      bg: 'linear-gradient(135deg, #FFF8ED 0%, #FFE8C0 100%)',
      blob: 'radial-gradient(circle, #FFD080 0%, #FFA726 100%)',
      head: 'Become a Young\nScientist!',
      desc: 'Discover fun experiments with the Science Explorer Kit.',
      cta: 'Explore now →',
      image: 'assets/images/Image1.png',
      ctaRoute: '/authed/academy'
    },
    {
      badge: 'Nature',
      badgeBg: 'rgba(76, 175, 80, 0.14)',
      accent: '#2E7D32',
      bg: 'linear-gradient(135deg, #F1F8F1 0%, #C8E6C9 100%)',
      blob: 'radial-gradient(circle, #A5D6A7 0%, #66BB6A 100%)',
      head: 'Explore the\nOutdoors',
      desc: 'Step-by-step outdoor discovery guides for curious minds.',
      cta: 'Start exploring →',
      image: 'assets/images/Image1.png',
      ctaRoute: '/authed/academy'
    },
    {
      badge: 'Creative',
      badgeBg: 'rgba(156, 39, 176, 0.12)',
      accent: '#6A1B9A',
      bg: 'linear-gradient(135deg, #F9F0FF 0%, #E1BEE7 100%)',
      blob: 'radial-gradient(circle, #CE93D8 0%, #AB47BC 100%)',
      head: 'Creative Crafts\nFor Kids',
      desc: 'Easy craft ideas that inspire imagination every day.',
      cta: 'Get crafting →',
      image: 'assets/images/Image1.png',
      ctaRoute: '/authed/academy'
    }
  ];

  currentIndex = 0;
  private readonly intervalMs = 4500;
  private timer: any;
  private touchStartX = 0;
  private readonly swipeThreshold = 40;

  ngOnInit(): void {
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private startAutoPlay(): void {
    this.clearTimer();
    this.timer = setInterval(() => this.next(), this.intervalMs);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;
  }

  goTo(index: number): void {
    if (index < 0 || index >= this.slides.length || index === this.currentIndex) return;
    this.currentIndex = index;
    this.startAutoPlay();
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    const deltaX = event.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(deltaX) < this.swipeThreshold) return;

    if (deltaX < 0) {
      // swipe left → next
      this.currentIndex = (this.currentIndex + 1) % this.slides.length;
    } else {
      // swipe right → prev
      this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    }
    this.startAutoPlay();
  }

  onCtaClick(slide: Slide): void {
    if (slide.ctaRoute) {
      // Route navigation handled by parent or can be extended with Router injection if needed
      console.log('CTA clicked, route:', slide.ctaRoute);
    }
  }
}
