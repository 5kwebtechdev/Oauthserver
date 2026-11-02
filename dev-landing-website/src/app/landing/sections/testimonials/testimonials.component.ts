import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import svgPaths from '../../imports/svg-wp1x1cqsn3';

const TESTIMONIALS = [
  {
    id: 'priya',
    initial: 'P',
    name: 'Priya',
    review: "Yuvraj used to forget his extracurricular schedule all the time and it was difficult to keep reminding him since I am a working mom. Now, he keeps track of his classes on SuperMe app.",
  },
  {
    id: 'raj',
    initial: 'R',
    name: 'Raj',
    review: "Ria's math grades jumped after solving the quizzes. She does not want to miss her streak and looks forward to solving them daily. Finally, screen time we both feel good about.",
  },
  {
    id: 'neha',
    initial: 'N',
    name: 'Neha',
    review: "Those 6am reminders to workout really worked! They pushed me to get up, take action and stay consistent. I am on 60 day streak and finally getting fitter and stronger.",
  },
  {
    id: 'vikram',
    initial: 'V',
    name: 'Vikram',
    review: "I can see Sanaa's consistency and focus increasing and she is excited to log in her emotions and journaling has become a breeze for her.",
  },
];

@Component({
  selector: 'app-testimonials-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testimonials.component.html',
})
export class TestimonialsSectionComponent {
  testimonials = TESTIMONIALS;
  activeIndex = 0;
  dotCount = TESTIMONIALS.length;
  badgeShieldPath = svgPaths.p1ed2300;
  badgeLockPath = svgPaths.p1b08d700;
  badgeCheckPath = svgPaths.p332069c0;

  @ViewChild('mobileCarousel') mobileCarousel?: ElementRef<HTMLDivElement>;

  constructor(private cdr: ChangeDetectorRef) {}

  setActive(i: number): void {
    const carousel = this.mobileCarousel?.nativeElement;
    if (carousel) {
      const cards = carousel.querySelectorAll<HTMLElement>('[data-card]');
      const card = cards[i];
      if (card) {
        carousel.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
      }
    }
    this.activeIndex = i;
    this.cdr.markForCheck();
  }

  onMobileScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-card]'));
    if (!cards.length) return;

    const scrollLeft = el.scrollLeft;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, i) => {
      const distance = Math.abs(card.offsetLeft - scrollLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    });

    if (closestIndex !== this.activeIndex) {
      this.activeIndex = closestIndex;
      this.cdr.markForCheck();
    }
  }
}
