import { Component, Input, TemplateRef, ContentChild, EventEmitter, Output, OnInit, ElementRef, ViewChild, AfterViewInit, Renderer2, OnDestroy } from '@angular/core';
import { NgIf, NgForOf } from "@angular/common";
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { ViewAllComponent } from 'src/app/core/components/mindful-navigator/view-all/view-all.component';
import { IonicModule } from "@ionic/angular";
import { RouterModule } from '@angular/router';
import { LearningCardComponent } from './learning-card/learning-card.component';
import { LearningService } from 'src/app/core/services/learning.service';

@Component({
  selector: 'learning-section',
  template: `
    <section class="content-section" aria-label="Curiosity highlights">
      <img src="/assets/Images-Transparent/Image-Content-bg1.png" class="content-banner content-banner--bulb"
        aria-hidden="true" role="presentation" />
      <img src="/assets/Images-Transparent/Image-Content-bg4.png" class="content-banner content-banner--puzzle"
        aria-hidden="true" role="presentation" />
      <img src="/assets/Images-Transparent/Image-Content-bg2.png" class="content-banner content-banner--book"
        aria-hidden="true" role="presentation" />
      <img src="/assets/Images-Transparent/Image-Content-bg3.png" class="content-banner content-banner--blue"
        aria-hidden="true" role="presentation" />
      <header class="content-header">
        <div class="content-title">
          <h2>{{ title || 'Start Curious, Play, Conquer!' }}</h2>
          <p class="content-sub">{{ subtitle || 'Dive into brain-teasing quizzes, mind-bending puzzles, captivating stories,
            and insightful reads.' }}</p>
        </div>
      </header>

      <nav class="content-actions">
        <mindful-view-all class="see-all content-section__view-all" [ariaLabel]="'View all content'"
          [routerLink]="['/authed','content']"></mindful-view-all>
      </nav>

      <div class="slides" #slides>
        <learning-card 
          *ngFor="let item of items; trackBy: trackByFn; let i = index" 
          [item]="item" 
          [index]="i"
          [source]="source"
          (cardClick)="onItemClick($event.item, $event.index)"
          (click)="onItemClick(item, i)">
        </learning-card>
      </div>

      <div class="pager" *ngIf="showPager" #pager>
        <div class="dot" [class.active]="i === activeIndex" *ngFor="let item of items; let i = index"
          (click)="goToSlide(i)"></div>
      </div>

      <div class="debug-indicator" *ngIf="items.length" style="text-align:center;margin-top:8px;font-size:12px;color:#333;">
      </div>

    </section>
  `,
  styles: [`
    .content-section {
      position: relative;
      width: 100%;
      height: 460px;
      max-width: 90vw;

      background: #FBE8EF;
      border-radius: 1rem;
      padding: clamp(1rem, 2.5vw, 1.25rem);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
      overflow: visible;

      .content-header {
        display: flex;
        flex-direction: row;
        justify-content: center;
        box-sizing: border-box;
        margin-top: 5px;

        .content-title {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .content-title h2 {
          text-align: center;
          display: block;
          margin: 0;
          font-size: 1.25rem;
          color: #282527;
          width: 137px;
        }

        .content-sub {
          margin:0;
          font-size: 10px;
          text-align: center;
          color:#282527;
          font-family: 'Nunito';
          width: 235px;
          align-self: center;
        }
      }

      .content-banner {
        position: absolute;
        pointer-events: none;
        user-select: none;
        z-index: 0;
        display: block;
        background-repeat: no-repeat;
        background-size: contain;
      }

      .content-banner--bulb {
        width: 80.96px;
        height: auto;
        left: 0vw;
        top: 0vh;
        z-index: 0;
      }

      .content-banner--puzzle {
        width: 64px;
        height: auto;
        right: 0vw;
        top: 24px;
        z-index: 0;
      }

      .content-banner--book {
        width: auto;
        height: 60px;
        left: 7vw;
        top: 0vh;
        z-index: 0;
      }

      .content-banner--blue {
        width: auto;
        height: 60px;
        left: 60vw;
        top: 0px;
        z-index: 0;
      }

      .content-actions {
        display: flex;
        justify-content: flex-end;
        width: 100%;
        padding: 6px 0;
        box-sizing: border-box;
      }

      .see-all {
        background: none;
        border: 0;
        color: #90214D;
        font-family: 'Nunito', sans-serif;
        font-weight: 600;
        font-size: 16px;
        line-height: 140%;
        position: relative;

        &::after {
          content: '';
          position: absolute;
          left: 0;
          top: 18px;
          width: 77px;
          height: 0;
          border-top: 1px solid currentColor;
          opacity: 0.9;
          z-index: 2;
        }
      }

      .see-all .fa-chevron-right,
      .see-all .fa-solid.fa-chevron-right {
        display: inline-block;
        width: 6px;
        height: 10px;
        font-size: 10px;
        line-height: 10px;
        vertical-align: middle;
        text-align: center;
      }

      .content-section__view-all {
        @extend .see-all;
      }

      .slides {
        margin-top: 0px;
        display: flex;
        gap: 1rem;
        height: auto;
        width: 100%;
        box-sizing: border-box;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 1rem;

        -ms-overflow-style: none;
        scrollbar-width: none;

        &::-webkit-scrollbar {
          height: 0;
          display: none;
        }


      }

      .pager {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.2);
        display: inline-block;
      }

      .dot.active {
        width: 16px;
        background: #90214D;
        border-radius: 23px;
      }
    }
  `],
  imports: [NgIf, NgForOf, IonicModule, RouterModule, ViewAllComponent, LearningCardComponent],
  standalone: true
})
export class LearningSectionComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() imageUrl: string = '';
  @Input() difficulty: string = '';
  @Input() likes: number = 0;
  @Input() views: number = 0;
  @Input() isNew: boolean = false;
  /** Optional source route for back navigation from child pages */
  @Input() source?: string;

  // array of slide items to render. Each item can contain the fields used in the default template.
  @Input() items: Array<any> = [];

  // allow consumers to provide a custom slide template via content projection
  @ContentChild(TemplateRef) slideTemplate?: TemplateRef<any>;

  @Input() showPager: boolean = true;
  @Output() itemSelected = new EventEmitter<any>();
  @Output() viewAll = new EventEmitter<void>();

  @ViewChild('slides', { read: ElementRef }) slidesRef!: ElementRef<HTMLElement>;
  @ViewChild('pager', { read: ElementRef }) pagerRef!: ElementRef<HTMLElement>;

  activeIndex: number = 0;

  private scrollHandler?: () => void;

  constructor(private renderer: Renderer2, private learningService: LearningService) { }

  ngAfterViewInit(): void {
    if (!this.slidesRef) return;
    const el = this.slidesRef.nativeElement;
    this.scrollHandler = this.renderer.listen(el, 'scroll', () => this.updateActiveDot());
    setTimeout(() => this.updateActiveDot(), 0);
  }

  ngOnDestroy(): void {
    if (this.scrollHandler) this.scrollHandler();
  }

  private updateActiveDot(): void {
    const el = this.slidesRef.nativeElement;
    const children = Array.from(el.querySelectorAll('.slide')) as HTMLElement[];
    if (!children.length) return;
    const elRect = el.getBoundingClientRect();
    let activeIndex = 0;
    let minDistance = Infinity;
    children.forEach((c, idx) => {
      const r = c.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const distance = Math.abs(center - (elRect.left + elRect.width / 2));
      if (distance < minDistance) {
        minDistance = distance;
        activeIndex = idx;
      }
    });
    this.setActiveDot(activeIndex);
  }

  private setActiveDot(index: number) {
    this.activeIndex = index;
    if (!this.pagerRef) return;
    const dots = Array.from(this.pagerRef.nativeElement.querySelectorAll('.dot')) as HTMLElement[];
    dots.forEach((d, i) => {
      if (i === index) d.classList.add('active'); else d.classList.remove('active');
    });
  }

  goToSlide(index: number) {
    if (!this.slidesRef) return;
    const el = this.slidesRef.nativeElement;
    const children = Array.from(el.querySelectorAll('.slide')) as HTMLElement[];
    const target = children[index];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    this.setActiveDot(index);
  }

  onItemClick(item: any, index: number) {
    this.itemSelected.emit({ item, index });
  }

  trackByFn(index: number, item: any) {
    return item.id || index;
  }

  ngOnInit(): void {
    // If no items provided by the consumer, attempt to load latest items from API
    if (!this.items || this.items.length === 0) {
      // Load latest quiz, puzzle and article from service
      try {
        this.loadLatestFromService();
        return;
      } catch (e) {
        console.error('Error loading learning service items', e);
      }

      // Fallback static defaults so UI renders even if API unavailable
      this.items = [
        // Quiz (challenge) card
        {
          id: 'quiz-1',
          type: 'challenge',
          subType: 'quiz',
          title: 'Quick Quiz: Animal Facts',
          description: 'Test your knowledge with a short 5-question quiz.',
          image: '/assets/images/Content-quiz-thumbnail.png',
          difficulty: 'Easy',
          difficultyImage: '/assets/images/difficulty-easy.png',
          tag: 'Quiz',
          coins: 40,
          trophy: 1,
          buttonText: 'Play Quiz'
        },

        // Puzzle (challenge) card
        {
          id: 'puzzle-1',
          type: 'challenge',
          subType: 'puzzle',
          title: 'Memory Maze',
          description: 'Sharpen your memory with a quick puzzle.',
          image: '/assets/images/Content-memory-maze-thumbnail.png',
          difficulty: 'Medium',
          difficultyImage: '/assets/images/difficulty-medium.png',
          tag: 'Puzzle',
          coins: 50,
          trophy: 1,
          buttonText: 'Play Puzzle'
        },

        // Article card
        {
          id: 'article-1',
          type: 'article',
          title: '5 Science-Backed Study Hacks That Actually Work',
          description: 'Boost focus and retention in 10 minutes or less. Backed by standford researchers.',
          image: '/assets/images/Content-story-thumbnail.png',
          coins: 30,
          buttonText: 'Read Article'
        }
      ];
    }
  }

  private loadLatestFromService() {
    forkJoin([
      this.learningService.fetchChallenges().pipe(
        map(challenges => {
          const quizzes = challenges.filter(c => c.category === 'QUIZ');
          const puzzles = challenges.filter(c => c.category === 'PUZZLE');
          const latestQuiz = this.pickLatest(quizzes);
          const latestPuzzle = this.pickLatest(puzzles);
          return { latestQuiz, latestPuzzle };
        })
      ),
      this.learningService.getArticleCards().pipe(
        map(articles => this.pickLatest(articles))
      )
    ])
      .subscribe({
        next: ([{ latestQuiz, latestPuzzle }, latestArticle]) => {
          const combined = [latestQuiz, latestPuzzle, latestArticle].filter(x => !!x) as any[];
          if (combined.length) this.items = combined;
        },
        error: (err) => {
          console.error('Error fetching latest learning items', err);
        }
      });
  }

  private pickLatest(cards: any[] = []) {
    if (!cards || !cards.length) return null;
    // Prefer publishedAt / createdAt / updatedAt on rawData if available
    const withDates = cards.map(c => {
      const raw = c.rawData || c;
      const dateStr = raw && (raw.publishedAt || raw.createdAt || raw.updatedAt || raw.published_at || raw.created_at);
      const date = dateStr ? new Date(dateStr) : null;
      return { card: c, date };
    });
    withDates.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    });
    return withDates[0].card;
  }
}