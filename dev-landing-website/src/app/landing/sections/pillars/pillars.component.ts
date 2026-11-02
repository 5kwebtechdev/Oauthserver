import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface PillarCard {
  id: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  imgClass: string;
  imgContainerClass: string;
  title: string;
  description: string;
  href: string;
}

@Component({
  selector: 'app-pillars-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pillars.component.html',
  styleUrls: ['./pillars.component.scss'],
})
export class PillarsSectionComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  activeIndex = 0;
  private scrollListener?: () => void;

  cards: PillarCard[] = [
    {
      id: 'card1',
      image: 'assets/Landing/5e07852b1b91c9b1c2f711edb8958ae4da331d8b.webp',
      imageWidth: 864,
      imageHeight: 1184,
      imgClass: 'absolute h-[163.23%] left-[-15.15%] max-w-none top-[-34.33%] w-[139.73%]',
      imgContainerClass: 'h-[368px] relative shrink-0 w-[314px]',
      title: 'Habits that Last',
      description: 'Turn habits into quests and earn coins with every completion. Track progress and watch your rewards grow.',
      href: '/habit-tracker',
    },
    {
      id: 'card2',
      image: 'assets/Landing/b53f7e826d2cb17d46be2bf51f046bd7753d37ae.webp',
      imageWidth: 864,
      imageHeight: 1184,
      imgClass: 'absolute h-[135.03%] left-0 max-w-none top-[-16.97%] w-full',
      imgContainerClass: 'relative shrink-0 size-[316px]',
      title: 'Own Your Day',
      description: 'Take control of your time and turn busy days into productive wins.',
      href: '/task-manager',
    },
    {
      id: 'card3',
      image: 'assets/Landing/97b56f025db7ebed619ddf328716fbfc7bbc913a.webp',
      imageWidth: 672,
      imageHeight: 1536,
      imgClass: 'absolute h-[193.94%] left-0 max-w-none top-[-47.1%] w-full',
      imgContainerClass: 'h-[304px] relative shrink-0 w-[261px]',
      title: 'Plan It. Do It. Win It',
      description: "Turn your to-dos into achievements. Set routines, create easy schedules and own your calendar!",
      href: '/productivity-calendar',
    },
    {
      id: 'card4',
      image: 'assets/Landing/9443f9427a1f14e4d3234b4b1e6f29bfd119f9e9.webp',
      imageWidth: 704,
      imageHeight: 1488,
      imgClass: 'absolute h-[190.04%] left-0 max-w-none top-[-52.23%] w-full',
      imgContainerClass: 'h-[368px] relative shrink-0 w-[316px]',
      title: 'Play meets Progress',
      description: 'Adaptive brain boosting puzzles and quizzes built just for you. Every challenge you conquer earns you trophies.',
      href: '/quiz',
    },
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  goNext(): void {
    if (this.activeIndex < this.cards.length - 1) {
      this.activeIndex++;
      this.scrollToIndex(this.activeIndex);
      this.cdr.markForCheck();
    }
  }

  goPrev(): void {
    if (this.activeIndex > 0) {
      this.activeIndex--;
      this.scrollToIndex(this.activeIndex);
      this.cdr.markForCheck();
    }
  }

  scrollToIndex(index: number): void {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    this.activeIndex = Math.min(index, this.cards.length - 1);
    this.cdr.markForCheck();
  }

  getCompactImgClass(original: string): string {
    return original;
  }
}
