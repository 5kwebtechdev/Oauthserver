import { Component, Input, TemplateRef, ContentChild, EventEmitter, Output, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, Renderer2, OnDestroy } from '@angular/core';
import { NgIf, NgForOf } from "@angular/common";
import { forkJoin, Observable, Subscription } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { IonicModule } from "@ionic/angular";
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { LearningCardComponent } from './learning-card/learning-card.component';
import { LearningService } from 'src/app/core/services/learning.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'learning-section',
  template: `
    <section class="content-section"
      [class.content-section--parent-home]="rewardMode || parentLearningViewAll"
      [class.content-section--summary-cards]="contentMode !== 'parenting'"
      [class.content-section--parenting]="contentMode === 'parenting'"
      aria-label="Curiosity highlights">
      <header class="content-header">
        <div class="content-title">
          <h2>
            <img [src]="headerIcon || 'assets/figma/child-home/learning-header.webp'" class="content-title-icon"
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
        <div class="learning-slide-shell" [class.learning-slide-shell--reward]="contentMode !== 'parenting'"
          *ngFor="let item of items; trackBy: trackByFn; let i = index">
          <learning-card
            [item]="item"
            [index]="i"
            [source]="source"
            [forUserId]="forUserId"
            [parentPreviewOnly]="rewardMode && (item.type === 'quiz' || item.type === 'puzzle')"
            (cardClick)="onItemClick($event.item, $event.index)">
          </learning-card>
          <span *ngIf="contentMode !== 'parenting' && getDifficultyLabel(item)" class="reward-difficulty"
            [attr.data-difficulty]="getDifficultyTone(item)">
            {{ getDifficultyLabel(item) }}
          </span>
          <div *ngIf="contentMode !== 'parenting'" class="reward-card-summary">
            <h3>{{ item?.title }}</h3>
            <div class="reward-card-summary__meta">
              <span class="reward-card-summary__coins">
                <img src="assets/icons/superme-coin.webp" alt="">
                +{{ getItemCoins(item) }}
                <span *ngIf="isRewardAssigned(item)" class="reward-card-summary__assigned-coins">
                  +<img src="assets/icons/superme-coin.webp" alt="">{{ getRewardCoins(item) }}
                </span>
              </span>
              <span>
                <img class="learning-meta-icon learning-meta-icon--time" src="assets/figma/child-learning/schedule.svg" alt="">
                {{ getItemDuration(item) }}
              </span>
            </div>
          </div>
          <span *ngIf="contentMode === 'parenting' && getDifficultyLabel(item)" class="parenting-difficulty"
            [attr.data-difficulty]="getDifficultyTone(item)">
            {{ getDifficultyLabel(item) }}
          </span>
          <div *ngIf="contentMode === 'parenting'" class="parenting-card-summary" aria-hidden="true">
            <h3>{{ item?.title }}</h3>
            <div class="parenting-card-summary__meta">
              <span>
                <img src="assets/icons/superme-coin.webp" alt="">
                +{{ getItemCoins(item) }}
              </span>
              <span>
                <img class="learning-meta-icon learning-meta-icon--time" src="assets/figma/child-learning/schedule.svg" alt="">
                {{ getItemDuration(item) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="content-state" *ngIf="isLoading" aria-live="polite">
        <ion-spinner name="crescent"></ion-spinner>
        <span>Loading content...</span>
      </div>

      <div class="content-state content-state--empty" *ngIf="!isLoading && items.length === 0">
        <span>No content is available right now.</span>
      </div>

      <section *ngIf="contentMode === 'parenting' && !isLoading" class="parenting-toolkit"
        aria-labelledby="parenting-toolkit-title">
        <button type="button" class="parenting-toolkit__card" (click)="openParentingQuizzes()"
          [attr.aria-label]="'View all ' + parentingQuizCount + ' parenting quizzes'">
          <span class="parenting-toolkit__card-icon">
            <img src="assets/figma/parent-home/parent-learning-quizzes.webp" alt="" aria-hidden="true">
          </span>
          <span class="parenting-toolkit__card-copy">
            <strong id="parenting-toolkit-title">Quizzes</strong>
            <span>Expand your knowledge</span>
            <small>{{ parentingQuizCount }} {{ parentingQuizCount === 1 ? 'quiz' : 'quizzes' }}</small>
          </span>
          <img class="parenting-toolkit__arrow" src="assets/figma/parent-home/parenting-section/arrow.svg" alt=""
            aria-hidden="true">
        </button>
        <div class="slides parenting-quiz-slides" *ngIf="parentingQuizItems.length > 0">
          <div class="learning-slide-shell" *ngFor="let item of parentingQuizItems; trackBy: trackByFn; let i = index">
            <learning-card [item]="item" [index]="i" [source]="source" [forUserId]="parentUserId"
              [parentPreviewOnly]="true"
              (cardClick)="onParentingQuizClick($event.item)"></learning-card>
            <div class="parenting-card-summary" aria-hidden="true">
              <h3>{{ item?.title }}</h3>
              <div class="parenting-card-summary__meta">
                <span><img src="assets/icons/superme-coin.webp" alt="">+{{ getItemCoins(item) }}</span>
                <span><img class="learning-meta-icon learning-meta-icon--time" src="assets/figma/child-learning/schedule.svg" alt="">{{ getItemDuration(item) }}</span>
              </div>
            </div>
          </div>
        </div>
        <p class="parenting-toolkit__empty" *ngIf="parentingQuizItems.length === 0">No quizzes are available right now.</p>
      </section>

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
          linear-gradient(var(--learning-card-bg, #FFFFFF), var(--learning-card-bg, #FFFFFF)) padding-box,
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

        &--assigned,
        &:disabled {
          background: #f3edf6;
          color: #6b656a;
          cursor: default;
          opacity: 1;
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

      // Use the same image-and-summary card treatment for learning cards
      // across Parent, Child and Self; Parenting content remains separate.
      &.content-section--summary-cards {
        .content-header {
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .content-title h2 {
          gap: 2px;
          font-family: var(--font-heading, 'Fredoka', sans-serif);
          font-size: 17px;
          font-weight: 500;
          line-height: 1.2;
        }

        .content-title-icon {
          width: 24px;
          height: 24px;
        }

        .content-sub {
          max-width: 208px;
          margin-top: 2px;
          color: rgba(40, 37, 39, 0.7);
          font-family: var(--font-sans, 'Nunito', sans-serif);
          font-size: 15px;
          font-weight: 500;
          line-height: 1.25;
        }

        .view-all-pill {
          min-width: 80px;
          min-height: 38px;
          padding: 8px 16px;
          border: 2px solid #e1527c;
          border-radius: 22px;
          background: var(--learning-card-bg, #ffffff);
          color: #432477;
          font-family: var(--font-sans, 'Nunito', sans-serif);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.4;
        }

        .slides {
          gap: 8px;
          scroll-padding-inline: 0;
        }

        .learning-slide-shell {
          position: relative;
          flex: 0 0 175px;
          height: 144px;
          border: 0;
          border-radius: 12px;
          background: transparent;
          box-shadow: none;
        }

        learning-card {
          height: 104px;
        }

        ::ng-deep learning-card .card-root,
        ::ng-deep learning-card .media {
          height: 104px;
          border-radius: 12px;
        }

        ::ng-deep learning-card .card-root {
          box-shadow: none;
        }

        ::ng-deep learning-card .media {
          background: #f8f6fa;
        }

        ::ng-deep learning-card .media .sk-img,
        ::ng-deep learning-card .media app-img,
        ::ng-deep learning-card .media app-img img {
          object-fit: cover !important;
          object-position: center;
        }

        ::ng-deep learning-card .difficulty,
        ::ng-deep learning-card .slide-body,
        ::ng-deep learning-card .article-body {
          display: none !important;
        }

        .reward-difficulty {
          position: absolute;
          z-index: 4;
          top: 8px;
          right: 8px;
          display: inline-flex;
          min-height: 24px;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          border: 1px solid #bb2124;
          border-radius: 16px;
          background: #f8e9e9;
          color: #bb2124;
          font-family: var(--font-sans, 'Nunito', sans-serif);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.2;
          text-transform: capitalize;
          pointer-events: none;
        }

        .reward-difficulty[data-difficulty='easy'] {
          border-color: #24963e;
          background: #e7f5e9;
          color: #16772d;
        }

        .reward-difficulty[data-difficulty='medium'] {
          border-color: #d78513;
          background: #fff3df;
          color: #995b08;
        }

        .reward-card-summary {
          position: absolute;
          z-index: 3;
          right: 0;
          bottom: 0;
          left: 0;
          display: flex;
          height: 36px;
          flex-direction: column;
          justify-content: flex-start;
          gap: 2px;
          padding: 0 4px;
          border-radius: 0;
          background: transparent;
          pointer-events: none;

          h3 {
            width: 100%;
            margin: 0;
            overflow: hidden;
            color: #282527;
            font-family: var(--font-sans, 'Nunito', sans-serif);
            font-size: 12px;
            font-weight: 700;
            line-height: 1.3;
            text-align: left;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .reward-card-summary__meta {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: flex-start;
          gap: 8px;

          span {
            display: inline-flex;
            min-width: 0;
            align-items: center;
            gap: 2px;
            color: #6b656a;
            font-family: var(--font-sans, 'Nunito', sans-serif);
            font-size: 12px;
            font-weight: 600;
            line-height: 1.2;
            white-space: nowrap;
          }

          img {
            width: 16px;
            height: 16px;
            flex: 0 0 16px;
            object-fit: contain;
            filter: none;
          }

          .reward-card-summary__coins {
            gap: 2px;
          }

          .reward-card-summary__assigned-coins {
            gap: 1px;
            color: #4caf50;
            font-weight: 700;
          }
        }

      }

      &.content-section--parenting {
        .content-header {
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .content-title h2 {
          gap: 2px;
          font-family: var(--font-heading, 'Fredoka', sans-serif);
          font-size: 17px;
          font-weight: 500;
          line-height: 1.2;
        }

        .content-title-icon {
          width: 24px;
          height: 24px;
        }

        .content-sub {
          margin-top: 2px;
          color: rgba(40, 37, 39, 0.7);
          font-family: var(--font-sans, 'Nunito', sans-serif);
          font-size: clamp(12px, 3.82vw, 15px);
          font-weight: 500;
          line-height: 1.4;
          white-space: nowrap;
        }

        .view-all-pill {
          min-width: 80px;
          min-height: 38px;
          padding: 8px 16px;
          border: 2px solid #e1527c;
          border-radius: 22px;
          background: transparent;
          color: #432477;
          font-family: var(--font-sans, 'Nunito', sans-serif);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.4;
        }

        .slides {
          gap: 8px;
          scroll-padding-inline: 0;
        }

        .learning-slide-shell {
          position: relative;
          flex: 0 0 175px;
          height: 144px;
          border: 0;
          border-radius: 12px;
          background: transparent;
          box-shadow: none;
        }

        learning-card,
        ::ng-deep learning-card .card-root,
        ::ng-deep learning-card .media {
          height: 104px;
          border-radius: 12px;
        }

        ::ng-deep learning-card .card-root {
          background: transparent;
          box-shadow: none;
        }

        ::ng-deep learning-card .media {
          background: #f8f6fa;
        }

        ::ng-deep learning-card .media .sk-img,
        ::ng-deep learning-card .media app-img,
        ::ng-deep learning-card .media app-img img {
          object-fit: cover !important;
          object-position: center;
        }

        ::ng-deep learning-card .difficulty,
        ::ng-deep learning-card .slide-body,
        ::ng-deep learning-card .article-body {
          display: none !important;
        }

        .parenting-difficulty {
          position: absolute;
          z-index: 4;
          top: 8px;
          right: 8px;
          display: inline-flex;
          min-height: 24px;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          border: 1px solid #bb2124;
          border-radius: 16px;
          background: #f8e9e9;
          color: #bb2124;
          font-family: var(--font-sans, 'Nunito', sans-serif);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.2;
          text-transform: capitalize;
          pointer-events: none;
        }

        .parenting-difficulty[data-difficulty='easy'] {
          border-color: #24963e;
          background: #e7f5e9;
          color: #16772d;
        }

        .parenting-difficulty[data-difficulty='medium'] {
          border-color: #d78513;
          background: #fff3df;
          color: #995b08;
        }

        .parenting-card-summary {
          position: absolute;
          z-index: 3;
          right: 0;
          bottom: 0;
          left: 0;
          display: flex;
          height: 36px;
          flex-direction: column;
          justify-content: flex-start;
          gap: 2px;
          padding: 0 4px;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          pointer-events: none;

          h3 {
            width: 100%;
            margin: 0;
            overflow: hidden;
            color: #282527;
            font-family: var(--font-sans, 'Nunito', sans-serif);
            font-size: 12px;
            font-weight: 700;
            line-height: 1.4;
            text-align: left;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .parenting-card-summary__meta {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: flex-start;
          gap: 8px;

          span {
            display: inline-flex;
            min-width: 0;
            align-items: center;
            gap: 2px;
            color: #6b656a;
            font-family: var(--font-sans, 'Nunito', sans-serif);
            font-size: 12px;
            font-weight: 600;
            line-height: 1.4;
            white-space: nowrap;
          }

          img {
            width: 16px;
            height: 16px;
            flex: 0 0 16px;
            object-fit: contain;
            filter: none;
          }
        }

        .parenting-toolkit {
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
          margin-top: 12px;
          padding: 10px 8px 12px;
          border-radius: 16px;
          background: linear-gradient(115deg, #af97d8 0%, #d9c9ec 54%, #eee9f8 100%);
          box-shadow: 0 0 2px 1px rgba(175, 151, 216, 0.45);
        }

        .parenting-toolkit__header {
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;

          h3 {
            display: flex;
            align-items: center;
            gap: 2px;
            margin: 0;
            color: #282527;
            font-family: var(--font-heading, 'Fredoka', sans-serif);
            font-size: 17px;
            font-weight: 500;
            line-height: 1.2;

            img {
              width: 24px;
              height: 24px;
              object-fit: contain;
            }
          }

          p {
            display: flex;
            align-items: center;
            gap: 4px;
            margin: 0;
            color: rgba(40, 37, 39, 0.7);
            font-family: var(--font-sans, 'Nunito', sans-serif);
            font-size: clamp(12px, 3.82vw, 15px);
            font-weight: 500;
            line-height: 1.4;
            white-space: nowrap;

            img {
              width: 4px;
              height: 4px;
              flex: 0 0 4px;
            }
          }
        }

        .parenting-toolkit__card {
          display: flex;
          width: 100%;
          min-height: 64px;
          align-items: center;
          gap: 8px;
          padding: 4px 4px;
          overflow: hidden;
          border: 0;
          border-radius: 16px;
          background: transparent;
          box-shadow: none;
          color: #282527;
          text-align: left;
          cursor: pointer;

          &:active {
            filter: brightness(0.97);
          }
        }

        .parenting-toolkit__card-icon {
          display: flex;
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          align-items: center;
          justify-content: center;
          overflow: hidden;

          img {
            width: 40px;
            height: 40px;
            object-fit: contain;
            filter: drop-shadow(0 2px 1px rgba(40, 37, 39, 0.3));
          }
        }

        .parenting-toolkit__card-copy {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          align-items: flex-start;
          color: #282527;
          font-family: var(--font-sans, 'Nunito', sans-serif);
          line-height: normal;

          strong {
            font-size: 17px;
            font-weight: 700;
          }

          > span {
            overflow: hidden;
            color: #6b656a;
            font-size: 15px;
            font-weight: 600;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          small {
            margin-top: 4px;
            color: #2c174f;
            font-size: 13px;
            font-weight: 600;
          }
        }

        .parenting-toolkit__arrow {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
        }

        .parenting-quiz-slides {
          width: 100%;
          padding-bottom: 2px;
        }

        .parenting-toolkit__empty {
          margin: 0 4px;
          color: #432477;
          font-family: var(--font-sans, 'Nunito', sans-serif);
          font-size: 13px;
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
  @Input() age: number | null | undefined = undefined;
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
  parentingBlogCount = 0;
  parentingQuizCount = 0;
  parentingQuizItems: any[] = [];

  get parentUserId(): string | number | null {
    return this.authService.getUserId();
  }

  private scrollHandler?: () => void;
  private initialized = false;
  private loadRequestId = 0;
  private wasOnSourceRoute = false;
  private routerEventsSubscription?: Subscription;
  private readonly learningCompletedHandler = (event: Event) => {
    const detail = (event as CustomEvent<{ id?: number | string; type?: string }>).detail;
    const completedId = Number(detail?.id);
    if (!Number.isFinite(completedId) || completedId <= 0) return;
    this.items = this.items.filter(item => {
      if (Number(item?.id) !== completedId) return true;
      const itemType = String(item?.type || item?.category || '').toLowerCase();
      const completedType = String(detail?.type || '').toLowerCase();
      if (completedType === 'article') return itemType !== 'article';
      if (completedType === 'challenge') return itemType !== 'quiz' && itemType !== 'puzzle';
      return false;
    });
    this.activeIndex = Math.min(this.activeIndex, Math.max(0, this.items.length - 1));
  };

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
    this.routerEventsSubscription?.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('superme:learning-completed', this.learningCompletedHandler);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;
    if (changes['forUserId'] || changes['age'] || changes['contentMode']) {
      this.items = [];
      if (this.contentMode !== 'parenting') this.parentingBlogCount = 0;
      this.loadLatestFromService();
    }
  }

  /** Refresh the Home rail after returning from a quiz/article screen. */
  refreshFromApi(): void {
    if (this.initialized) this.loadLatestFromService();
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
    if (this.rewardMode) {
      // Article cards navigate to their detail page themselves. Opening one
      // must not also emit the parent assignment action.
      if (item?.type === 'article') return;
      if (item?.type === 'quiz' || item?.type === 'puzzle') {
        const childId = Number(this.forUserId);
        void this.router.navigate(['/authed/content/description', item.id], {
          queryParams: {
            parentAssign: '1',
            assignmentCoins: this.getRewardCoins(item),
            ...(Number.isFinite(childId) && childId > 0 ? { childId } : {})
          },
          state: {
            source: this.source || '/parent-account',
            selectedChildId: Number.isFinite(childId) && childId > 0 ? childId : null,
            assignmentCoins: this.getRewardCoins(item),
            alreadyAssigned: this.isRewardAssigned(item)
          }
        });
        return;
      }
      if (!this.isRewardAssigned(item)) {
        this.rewardSelected.emit({ item, index, coins: this.getRewardCoins(item) });
      }
      return;
    }
    this.itemSelected.emit({ item, index });
  }

  onRewardClick(event: Event, item: any, index: number): void {
    event.stopPropagation();
    if (this.isRewardAssigned(item)) return;
    this.rewardSelected.emit({ item, index, coins: this.getRewardCoins(item) });
  }

  isRewardAssigned(item: any): boolean {
    const raw = item?.rawData ?? item;
    const value = raw?.alreadyAssignedToThisUser ?? item?.alreadyAssignedToThisUser;
    return value === true || value === 1 || String(value).trim().toLowerCase() === 'true';
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
        state: { source: this.source || '/home' }
      });
      return;
    }
    void this.router.navigate(['/authed/content']);
  }

  openParentingBlogs(): void {
    void this.router.navigate(['/authed/parent-learning'], {
      queryParams: { category: 'blogs' },
      state: { source: this.source || '/authed/parent-account' }
    });
  }

  openParentingQuizzes(): void {
    void this.router.navigate(['/authed/parent-learning'], {
      queryParams: { category: 'quizzes' },
      state: { source: this.source || '/authed/parent-account' }
    });
  }

  onParentingQuizClick(item: any): void {
    void this.router.navigate(['/authed/content/description', item.id], {
      state: { source: this.source || '/authed/parent-account', forUserId: this.parentUserId, ownProfile: true, category: 'quizzes' }
    });
  }

  getRewardCoins(item: any): number {
    const raw = item?.rawData ?? item;
    const value = Number(
      raw?.assignmentCoins
      ?? raw?.bonusCoins
      ?? raw?.extraCoinsByParent
      ?? raw?.extraCoins
      ?? 0
    );
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 20;
  }

  getItemCoins(item: any): number {
    const value = Number(item?.coins ?? item?.rawData?.coins ?? item?.rawData?.rewardCoins ?? 0);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }

  getItemTrophies(item: any): number | null {
    const rawValue = item?.trophy ?? item?.trophies ?? item?.rawData?.trophies ?? item?.rawData?.trophy;
    if (rawValue === null || rawValue === undefined || rawValue === '') return null;
    const value = Number(rawValue);
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  }

  getItemDuration(item: any): string {
    const raw = item?.rawData ?? item;
    const existing = String(
      item?.timeDuration
      ?? raw?.timeDuration
      ?? raw?.estimatedTimeMinutes
      ?? raw?.durationMinutes
      ?? raw?.readTimeMinutes
      ?? raw?.estimatedMinutes
      ?? raw?.duration
      ?? ''
    ).trim();
    if (existing) {
      if (/^\d+(?:\.\d+)?$/.test(existing)) return `${Math.round(Number(existing))} min`;
      return existing;
    }

    const buttonDuration = String(item?.buttonText ?? '').match(/(\d+(?:\.\d+)?)\s*(?:min|minute)/i);
    if (buttonDuration) return `${Math.round(Number(buttonDuration[1]))} min`;

    // The parent rails always reserve this metadata slot in the Figma design.
    return '5 min';
  }

  getDifficultyLabel(item: any): string {
    return String(item?.difficulty ?? item?.rawData?.difficultyDisplay ?? item?.rawData?.difficulty ?? '').trim();
  }

  getDifficultyTone(item: any): 'easy' | 'medium' | 'hard' {
    const value = this.getDifficultyLabel(item).toLowerCase();
    if (value === 'easy' || value === 'beginner') return 'easy';
    if (value === 'medium' || value === 'moderate' || value === 'intermediate') return 'medium';
    return 'hard';
  }

  trackByFn(index: number, item: any) {
    return item.id || index;
  }

  ngOnInit(): void {
    this.initialized = true;
    const sourceRoute = (this.source || '').split('?')[0].replace(/\/$/, '');
    const initialRoute = this.router.url.split('?')[0].replace(/\/$/, '');
    this.wasOnSourceRoute = !!sourceRoute && initialRoute === sourceRoute;
    if (typeof window !== 'undefined') {
      window.addEventListener('superme:learning-completed', this.learningCompletedHandler);
    }
    this.routerEventsSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        const currentSourceRoute = (this.source || '').split('?')[0].replace(/\/$/, '');
        if (!currentSourceRoute) return;
        const currentRoute = event.urlAfterRedirects.split('?')[0].replace(/\/$/, '');
        const isOnSourceRoute = currentRoute === currentSourceRoute;
        if (isOnSourceRoute && !this.wasOnSourceRoute) {
          // Ionic keeps this dashboard component alive while the quiz/result
          // routes are shown, so refresh the home rail on return.
          this.loadLatestFromService();
        }
        this.wasOnSourceRoute = isOnSourceRoute;
      });

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
    let quizItemsForRequest: any[] = [];
    this.isLoading = true;
    if (this.contentMode === 'parenting') this.parentingQuizItems = [];
    // Parenting content belongs to the signed-in parent, even while Parent
    // Home is displaying a selected child's dashboard. Supplying the parent ID
    // explicitly prevents the global profile selector from substituting the
    // selected child's forUserId.
    const scopedUserId = this.contentMode === 'parenting'
      ? this.authService.getUserId()
      : this.forUserId;
    const scopedAge = this.contentMode === 'parenting' ? undefined : this.age;
    const requests: Observable<any[]> = this.contentMode === 'parenting'
      ? forkJoin([
          this.learningService.fetchArticleCards(true, scopedUserId, undefined, true).pipe(
            tap(items => this.parentingBlogCount = items.length),
            map(items => this.pickLatestItems(items, 2))
          ),
          this.learningService.fetchQuizCards(true, scopedUserId, undefined, true).pipe(
            tap(items => this.parentingQuizCount = items.length),
            map(items => this.pickLatestItems(items, 2))
          )
        ]).pipe(map(([articles, quizzes]) => {
          quizItemsForRequest = quizzes;
          return articles;
        }))
      : this.childSelfLearningViewAll
        // Child/Self Home's "Start Curious, Play, Conquer!" rail is a quiz
        // discovery surface. Do not mix article or puzzle cards into it.
        ? this.learningService.fetchQuizCards(true, scopedUserId, scopedAge).pipe(
            map(items => this.pickLatestItems(items, 3))
          )
      : forkJoin([
          this.learningService.fetchQuizCards(true, scopedUserId, scopedAge),
          this.learningService.fetchPuzzleCards(true, scopedUserId, scopedAge),
          this.learningService.fetchArticleCards(true, scopedUserId, scopedAge)
        ]).pipe(map(groups => this.pickDistinctLatestItems(groups)));

    requests
      .subscribe({
        next: (latestItems: any[]) => {
          if (requestId !== this.loadRequestId) return;
          this.items = latestItems.filter((item: any) => !!item) as any[];
          if (this.contentMode === 'parenting') this.parentingQuizItems = quizItemsForRequest;
          this.isLoading = false;
        },
        error: (err: any) => {
          if (requestId !== this.loadRequestId) return;
          console.error('Error fetching latest learning items', err);
          this.items = [];
          this.parentingQuizItems = [];
          this.isLoading = false;
        }
      });
  }

  /** One card per feed, without showing the same challenge twice when scoped APIs overlap. */
  private pickDistinctLatestItems(groups: any[][]): any[] {
    const seen = new Set<string>();
    const selected: any[] = [];
    for (const cards of groups) {
      for (const card of this.pickLatestItems(cards, cards.length)) {
        const raw = card.rawData || card;
        const id = raw.challengeId ?? raw.articleId ?? raw.id ?? card.id;
        const kind = card.type === 'article' ? 'article' : 'challenge';
        const key = id != null
          ? `${kind}:${id}`
          : `${kind}:${String(card.title || '').trim().toLowerCase()}:${String(card.image || '').trim()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        selected.push(card);
        break;
      }
    }
    return selected;
  }

  private pickLatestItems(cards: any[] = [], limit = 1): any[] {
    if (!cards || !cards.length || limit <= 0) return [];
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
    return withDates.slice(0, limit).map(item => item.card);
  }
}
