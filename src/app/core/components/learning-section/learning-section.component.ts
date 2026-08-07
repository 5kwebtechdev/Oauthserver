import { Component, Input, TemplateRef, ContentChild, EventEmitter, Output, OnInit, ElementRef, ViewChild, AfterViewInit, Renderer2, OnDestroy } from '@angular/core';
import { NgIf, NgForOf } from "@angular/common";
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { IonicModule } from "@ionic/angular";
import { Router, RouterModule } from '@angular/router';
import { LearningCardComponent } from './learning-card/learning-card.component';
import { LearningService } from 'src/app/core/services/learning.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'learning-section',
  template: `
    <section class="content-section" aria-label="Curiosity highlights">
      <header class="content-header">
        <div class="content-title">
          <h2>
            <img [src]="headerIcon || 'assets/figma/child-home/learning-header.png'" class="content-title-icon"
              aria-hidden="true" role="presentation" />
            {{ title || 'Start Curious, Play, Conquer!' }}
          </h2>
          <p class="content-sub">{{ subtitle || 'Explore • Challenge • Grow' }}</p>
        </div>
        <nav class="content-actions">
          <button class="view-all-pill" type="button" aria-label="View all content" (click)="onViewAllClick()">
            View all
          </button>
        </nav>
      </header>

      <div class="slides" #slides>
        <div class="learning-slide-shell" [class.learning-slide-shell--reward]="rewardMode"
          *ngFor="let item of items; trackBy: trackByFn; let i = index">
          <learning-card
            [item]="item"
            [index]="i"
            [source]="source"
            (cardClick)="onItemClick($event.item, $event.index)">
          </learning-card>
          <button *ngIf="rewardMode" type="button" class="reward-assign"
            [attr.aria-label]="'Assign ' + getRewardCoins(item) + ' coins to ' + (item?.title || 'learning activity')"
            (click)="onRewardClick($event, item, i)">
            <span>Assign</span>
            <img src="assets/icons/child-home-coin-figma.png" alt="" aria-hidden="true">
            <strong>{{ getRewardCoins(item) }}</strong>
          </button>
        </div>
      </div>

      <div class="pager" *ngIf="showPager" #pager>
        <div class="dot" [class.active]="i === activeIndex" *ngFor="let item of items; let i = index"
          (click)="goToSlide(i)"></div>
      </div>

    </section>
  `,
  styles: [`
    .content-section {
      position: relative;
      width: 100%;
      max-width: none;
      background: transparent;
      border-radius: 0;
      padding: 0;
      box-shadow: none;
      overflow: visible;

      .content-header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        box-sizing: border-box;
        margin: 0 0 16px;

        .content-title {
          text-align: left;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
        }

        .content-title h2 {
          display: flex;
          align-items: center;
          gap: 2px;
          margin: 0;
          text-align: left;
          font-family: var(--font-heading);
          font-size: 16px;
          font-weight: 500;
          color: #282527;
          width: auto;
          white-space: nowrap;
        }

        .content-title-icon {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .content-sub {
          margin: 0;
          font-size: 14px;
          text-align: left;
          color: #6B656A;
          font-family: var(--font-sans);
          width: auto;
          align-self: flex-start;
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
        width: auto;
        padding: 0;
        box-sizing: border-box;
      }

      .view-all-pill {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        min-width: 71px;
        min-height: 22px;
        background:
          linear-gradient(#FFFFFF, #FFFFFF) padding-box,
          linear-gradient(135deg, #7C74D8, #E1527C, #F2A33B) border-box;
        border: 2px solid transparent;
        border-radius: 16px;
        padding: 4px 16px;
        color: #432478;
        font-family: var(--font-sans);
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        transition: background 0.15s ease;
        text-decoration: none;
        white-space: nowrap;

        &:active {
          background: rgba(225, 82, 124, 0.1);
        }
      }

      .slides {
        margin-top: 0;
        display: flex;
        gap: 8px;
        height: auto;
        width: 100%;
        box-sizing: border-box;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 0;

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

      .learning-slide-shell {
        display: flex;
        flex: 0 0 175px;
        flex-direction: column;
        overflow: hidden;
        border-radius: 12px;
        scroll-snap-align: start;
      }

      learning-card {
        display: block;
        width: 100%;
        height: 104px;
      }

      .learning-slide-shell--reward {
        border: 1px solid #f2cddd;
        background: #ffffff;
        box-shadow: 0 0 2px rgba(172, 36, 86, 0.12);
      }

      .reward-assign {
        display: flex;
        width: 100%;
        min-height: 36px;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px 12px;
        border: 0;
        border-top: 1px solid #f6dce6;
        background: #ffffff;
        color: #432477;
        font-family: var(--font-sans);
        font-size: 10px;
        font-weight: 700;
        line-height: 1.4;
        cursor: pointer;

        img {
          width: 16px;
          height: 16px;
          object-fit: contain;
        }

        strong {
          font-weight: 800;
        }

        &:active {
          background: #fff2f7;
        }
      }

      ::ng-deep learning-card .card-root {
        position: relative;
        height: 104px;
        border-radius: 12px;
        box-shadow: none;
      }

      ::ng-deep learning-card .media {
        height: 104px;
      }

      ::ng-deep learning-card .slide-body,
      ::ng-deep learning-card .article-body {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 2;
        min-height: 38px;
        padding: 0 8px 4px;
        gap: 4px;
        background: linear-gradient(180deg, rgba(40, 37, 39, 0.35) 0%, #282527 100%);
        box-sizing: border-box;
      }

      ::ng-deep learning-card .desc,
      ::ng-deep learning-card superme-button,
      ::ng-deep learning-card .tags-row {
        display: none;
      }

      ::ng-deep learning-card .head h3,
      ::ng-deep learning-card .slide-body h3,
      ::ng-deep learning-card .article-body h3 {
        max-width: 100%;
        overflow: hidden;
        color: #FFFFFF;
        font-size: 10px;
        font-weight: 700;
        line-height: 1.4;
        text-align: left;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      ::ng-deep learning-card .meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0;
      }

      ::ng-deep learning-card .coins,
      ::ng-deep learning-card .trophy {
        color: #FFFFFF;
        font-size: 10px;
      }

      ::ng-deep learning-card .coins img,
      ::ng-deep learning-card .trophy img {
        width: 16px !important;
        height: 16px !important;
        margin-right: 2px;
        object-fit: contain;
      }

      ::ng-deep learning-card .meta-left {
        gap: 12px;
      }

      ::ng-deep learning-card .time-duration {
        color: #FFFFFF;
        font-size: 10px;
      }

      ::ng-deep learning-card .difficulty {
        top: 8px;
        right: 8px;
        min-width: 32px;
        min-height: 18px;
        padding: 4px 8px;
        border: 1px solid #BB2124;
        border-radius: 16px;
        background: #F8E9E9;
        box-sizing: border-box;
      }

      ::ng-deep learning-card .difficulty img {
        display: none;
      }

      ::ng-deep learning-card .difficulty::after {
        content: attr(data-label);
        color: #BB2124;
        font-family: var(--font-sans);
        font-size: 7px;
        font-weight: 600;
        line-height: 1.4;
      }

      .pager {
        gap: 5px;
      }

      .dot {
        width: 6px;
        height: 6px;
      }

      .dot.active {
        width: 16px;
      }

      // This component has no dedicated web/tablet layout of its own — the
      // parent page (parent-account, user-dashboard, etc.) widens the outer
      // column on desktop, but everything in here was still the exact
      // mobile pixel size, so it read as tiny, sparse cards with big gaps.
      @media (min-width: 769px) {
        .content-title h2 {
          font-size: 22px;
        }

        .content-title-icon {
          width: 32px;
          height: 32px;
        }

        .content-sub {
          font-size: 14px;
        }

        .view-all-pill {
          min-width: 90px;
          min-height: 32px;
          padding: 8px 20px;
          font-size: 14px;
        }

        .slides {
          gap: 16px;
        }

        .learning-slide-shell {
          flex: 0 0 230px;
          border-radius: 16px;
        }

        learning-card {
          height: 140px;
        }

        .reward-assign {
          min-height: 46px;
          gap: 8px;
          padding: 10px 14px;
          font-size: 13px;

          img {
            width: 20px;
            height: 20px;
          }
        }

        ::ng-deep learning-card .card-root {
          height: 140px;
          border-radius: 16px;
        }

        ::ng-deep learning-card .media {
          height: 140px;
        }

        ::ng-deep learning-card .slide-body,
        ::ng-deep learning-card .article-body {
          min-height: 48px;
          padding: 0 12px 8px;
          gap: 6px;
        }

        ::ng-deep learning-card .head h3,
        ::ng-deep learning-card .slide-body h3,
        ::ng-deep learning-card .article-body h3 {
          font-size: 14px;
        }

        ::ng-deep learning-card .coins,
        ::ng-deep learning-card .trophy,
        ::ng-deep learning-card .time-duration {
          font-size: 13px;
        }

        ::ng-deep learning-card .coins img,
        ::ng-deep learning-card .trophy img {
          width: 20px !important;
          height: 20px !important;
        }

        ::ng-deep learning-card .difficulty {
          min-width: 40px;
          min-height: 22px;
          padding: 5px 10px;
        }

        ::ng-deep learning-card .difficulty::after {
          font-size: 9px;
        }

        .pager {
          gap: 8px;
        }

        .dot {
          width: 8px;
          height: 8px;
        }

        .dot.active {
          width: 22px;
        }
      }
    }
  `],
  imports: [NgIf, NgForOf, IonicModule, RouterModule, LearningCardComponent],
  standalone: true
})
export class LearningSectionComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() headerIcon: string = '';
  @Input() rewardMode: boolean = false;
  /** Opens the dedicated learning listing only for Child or Self accounts. */
  @Input() childSelfLearningViewAll: boolean = false;
  /** Opens the Figma Parenting listing only for Parent accounts. */
  @Input() parentLearningViewAll: boolean = false;
  @Input() parentLearningCategory: 'blogs' | 'quizzes' = 'blogs';
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

  @Input() showPager: boolean = false;
  @Output() itemSelected = new EventEmitter<any>();
  @Output() rewardSelected = new EventEmitter<any>();
  @Output() viewAll = new EventEmitter<void>();

  @ViewChild('slides', { read: ElementRef }) slidesRef!: ElementRef<HTMLElement>;
  @ViewChild('pager', { read: ElementRef }) pagerRef!: ElementRef<HTMLElement>;

  activeIndex: number = 0;

  private scrollHandler?: () => void;

  constructor(
    private renderer: Renderer2,
    private learningService: LearningService,
    private authService: AuthService,
    private router: Router
  ) { }

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

  onRewardClick(event: Event, item: any, index: number): void {
    event.stopPropagation();
    this.rewardSelected.emit({ item, index, coins: this.getRewardCoins(item) });
  }

  onViewAllClick(): void {
    this.viewAll.emit();
    const relationship = String(this.authService.getUserRelationship() || '').trim().toUpperCase();
    const isChildOrSelf = relationship === 'CHILD' || relationship === 'SELF';

    if (this.parentLearningViewAll && relationship === 'PARENT') {
      void this.router.navigate(['/authed/parent-learning'], {
        queryParams: { category: this.parentLearningCategory },
        state: { source: this.source || '/authed/parent-account' }
      });
      return;
    }

    if (this.childSelfLearningViewAll && isChildOrSelf) {
      void this.router.navigate(['/authed/content'], {
        queryParams: { view: 'child-self' },
        state: { source: this.source || '/authed/user-dashboard' }
      });
      return;
    }
    void this.router.navigate(['/authed/content']);
  }

  getRewardCoins(item: any): number {
    const value = Number(item?.assignmentCoins ?? item?.rewardCoins ?? item?.coins ?? 0);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }

  trackByFn(index: number, item: any) {
    return item.id || index;
  }

  ngOnInit(): void {
    if (!this.items || this.items.length === 0) {
      try {
        this.loadLatestFromService();
      } catch (e) {
        console.error('Error loading learning service items', e);
        this.items = [];
      }
    }
  }

  private loadLatestFromService() {
    forkJoin([
      this.learningService.fetchChallenges().pipe(
        map(challenges => {
          const quizzes = challenges.filter(c => c.category === 'QUIZ').map(c => this.learningService.transformChallengeToCard(c));
          const puzzles = challenges.filter(c => c.category === 'PUZZLE').map(c => this.learningService.transformChallengeToCard(c));
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
