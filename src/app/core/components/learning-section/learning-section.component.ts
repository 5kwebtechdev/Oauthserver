import { Component, Input, TemplateRef, ContentChild, EventEmitter, Output, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, Renderer2, OnDestroy } from '@angular/core';
import { NgIf, NgForOf } from "@angular/common";
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IonicModule } from "@ionic/angular";
import { Router, RouterModule } from '@angular/router';
import { LearningCardComponent } from './learning-card/learning-card.component';
import { LearningService } from 'src/app/core/services/learning.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'learning-section',
  template: `
    <section class="content-section"
      [class.content-section--parent-home]="rewardMode || parentLearningViewAll"
      aria-label="Curiosity highlights">
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

      <div class="content-state" *ngIf="isLoading" aria-live="polite">
        <ion-spinner name="crescent"></ion-spinner>
        <span>Loading content...</span>
      </div>

      <div class="content-state content-state--empty" *ngIf="!isLoading && items.length === 0">
        <span>No content is available right now.</span>
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

      .content-state {
        display: flex;
        min-height: 72px;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #6b656a;
        font-family: var(--font-sans);
        font-size: 13px;
        text-align: center;

        ion-spinner {
          width: 20px;
          height: 20px;
          color: #b51f59;
        }
      }

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
          flex: 1 1 auto;
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
          width: 100%;
          min-width: 0;
          white-space: normal;
          overflow-wrap: anywhere;
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
        flex: 0 0 auto;
        justify-content: flex-end;
        width: auto;
        padding: 0;
        box-sizing: border-box;
      }

      .view-all-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        box-sizing: border-box;
        width: fit-content;
        min-width: 68px;
        height: 28px;
        background:
          linear-gradient(#FFFFFF, #FFFFFF) padding-box,
          linear-gradient(135deg, #7C74D8, #E1527C, #F2A33B) border-box;
        border: 2px solid transparent;
        border-radius: 16px;
        padding: 0 12px;
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

      &.content-section--parent-home {
        .content-header {
          align-items: center;
          margin-bottom: 12px;
        }

        .content-actions {
          flex: 0 0 auto;
          align-self: center;
        }

        .view-all-pill {
          border-radius: 14px;
          font-size: 10px;
          line-height: 1;
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
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      ::ng-deep learning-card .card-root:focus-visible {
        outline: 2px solid #6C3FCC;
        outline-offset: 2px;
      }

      ::ng-deep learning-card .media {
        height: 104px;
        background: #F8F6FA;
      }

      ::ng-deep learning-card .media .sk-img {
        object-fit: contain !important;
        object-position: center;
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
      ::ng-deep learning-card .tags-row,
      ::ng-deep learning-card superme-badge {
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
        display: none;
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
export class LearningSectionComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() headerIcon: string = '';
  @Input() rewardMode: boolean = false;
  @Input() contentMode: 'learning' | 'parenting' = 'learning';
  @Input() forUserId: string | number | null = null;
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
  isLoading = false;

  private scrollHandler?: () => void;
  private initialized = false;
  private loadRequestId = 0;

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

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;
    if (changes['forUserId'] || changes['contentMode']) {
      this.items = [];
      this.loadLatestFromService();
    }
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
    this.initialized = true;
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
    const requestId = ++this.loadRequestId;
    this.isLoading = true;
    const scopedUserId = this.contentMode === 'parenting' ? null : this.forUserId;
    const requests: Observable<any[]> = this.contentMode === 'parenting'
      ? forkJoin([
          this.learningService.fetchArticleCards(true).pipe(map(items => this.pickLatest(items))),
          this.learningService.fetchQuizCards(true).pipe(map(items => this.pickLatest(items)))
        ])
      : forkJoin([
          this.learningService.fetchQuizCards(true, scopedUserId).pipe(map(items => this.pickLatest(items))),
          this.learningService.fetchPuzzleCards(true, scopedUserId).pipe(map(items => this.pickLatest(items))),
          this.learningService.fetchArticleCards(true, scopedUserId).pipe(map(items => this.pickLatest(items)))
        ]);

    requests
      .subscribe({
        next: (latestItems: any[]) => {
          if (requestId !== this.loadRequestId) return;
          this.items = latestItems.filter((item: any) => !!item) as any[];
          this.isLoading = false;
        },
        error: (err: any) => {
          if (requestId !== this.loadRequestId) return;
          console.error('Error fetching latest learning items', err);
          this.items = [];
          this.isLoading = false;
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
