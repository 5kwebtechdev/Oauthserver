import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermePopupComponent, SupermePopupConfig } from '../../superme-popup/superme-popup.component';
import { LearningService } from 'src/app/core/services/learning.service';
import { BadgePopupService } from 'src/app/core/services/badge-popup.service';
import { Article } from 'src/app/core/models/learning.models';

@Component({
  selector: 'app-article-page',
  templateUrl: './article-page.component.html',
  styleUrls: ['./article-page.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonicModule,
    HttpClientModule,
    SupermeNavigatorComponent,
    SupermeButtonComponent,
    SupermePopupComponent
  ],
  providers: [LearningService]
})
export class ArticlePageComponent implements OnInit, OnDestroy {
  article: Article | null = null;
  isLoading = true;
  isMarking = false;

  // Minimum reading time gate
  readonly minReadSeconds = 60;
  readonly ringRadius = 17;
  readonly ringCircumference = 2 * Math.PI * this.ringRadius;
  remainingReadSeconds = this.minReadSeconds;
  readTimerDisplay = '01:00';
  readTimerInterval: any;
  readTimerComplete = false;
  justUnlocked = false;
  private justUnlockedTimeout: any;

  // Popup state and config
  showMarkPopup = false;
  markPopupConfig: SupermePopupConfig = {
    image: 'assets/Images-Transparent/Image-Home-GreatWork.png',
    imageAlt: 'Great work',
    heading: 'Great job reading!',
    subtitle: "You'll earn 10 coins when you mark this article as read. Are you sure you want to complete it?",
    primaryCTA: {
      text: 'Mark as Read',
      buttonStyle: 'green',
      buttonMedium: true
    },
    secondaryCTA: {
      text: 'Cancel',
      buttonStyle: 'bronze-transparent',
      buttonMedium: true
    },
    showCloseButton: true,
    backdrop: true,
    ctaDirection: 'row'
  };

  constructor(
    private route: ActivatedRoute,
    private learningService: LearningService,
    public router: Router,
    private badgePopupService: BadgePopupService
  ) { }

  get isArticleRead(): boolean {
    return !!this.article?.alreadyRead;
  }

  get isMarkAsReadDisabled(): boolean {
    return this.isMarking || this.isArticleRead || !this.readTimerComplete;
  }

  get readTimerProgressPercent(): number {
    if (this.minReadSeconds <= 0) return 100;
    const elapsed = this.minReadSeconds - this.remainingReadSeconds;
    return Math.min(100, Math.max(0, (elapsed / this.minReadSeconds) * 100));
  }

  /**
   * Mark the current article as read by calling the API
   */
  markAsRead(): void {
    // Deprecated: markAsRead is now handled via the confirmation popup.
    this.openMarkAsReadPopup();
  }

  openMarkAsReadPopup(): void {
    if (!this.article || this.isArticleRead || !this.readTimerComplete) return;
    this.showMarkPopup = true;
  }

  closeMarkPopup(): void {
    this.showMarkPopup = false;
  }

  confirmMarkAsRead(): void {
    if (!this.article || this.isArticleRead || this.isMarking) return;
    this.isMarking = true;
    this.learningService.markArticleComplete(this.article.id).subscribe({
      next: (res) => {
        console.log('Article marked as read response:', res);
        this.isMarking = false;
        this.showMarkPopup = false;
        this.badgePopupService.check();
        this.router.navigate(['/authed/content']);
      },
      error: (err) => {
        console.error('Failed to mark article as read:', err);
        this.isMarking = false;
        this.showMarkPopup = false;
      }
    });
  }

  ngOnInit() {
    // Get article ID from route parameters
    const articleId = this.route.snapshot.paramMap.get('id');
    console.log('Article ID from route:', articleId);

    if (articleId) {
      this.learningService.fetchArticleById(Number(articleId)).subscribe({
        next: (article) => {
          console.log('Article loaded:', article);
          this.article = article;
          this.isLoading = false;
          this.startReadingTimer();
        },
        error: (error) => {
          console.error('Error loading article:', error);
          this.isLoading = false;
        }
      });
    } else {
      console.error('No article ID provided in route');
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.stopReadingTimer();
    if (this.justUnlockedTimeout) {
      clearTimeout(this.justUnlockedTimeout);
      this.justUnlockedTimeout = null;
    }
  }

  /**
   * Start the 60-second minimum reading time countdown.
   * Skips entirely if the article is already marked as read.
   */
  private startReadingTimer(): void {
    if (this.isArticleRead) {
      this.readTimerComplete = true;
      return;
    }

    this.remainingReadSeconds = this.minReadSeconds;
    this.updateReadTimerDisplay();

    this.readTimerInterval = setInterval(() => {
      this.remainingReadSeconds--;
      this.updateReadTimerDisplay();

      if (this.remainingReadSeconds <= 0) {
        this.stopReadingTimer();
        this.onReadingTimerComplete();
      }
    }, 1000);
  }

  private stopReadingTimer(): void {
    if (this.readTimerInterval) {
      clearInterval(this.readTimerInterval);
      this.readTimerInterval = null;
    }
  }

  private updateReadTimerDisplay(): void {
    const minutes = Math.floor(this.remainingReadSeconds / 60);
    const seconds = this.remainingReadSeconds % 60;
    this.readTimerDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private onReadingTimerComplete(): void {
    this.readTimerComplete = true;
    this.justUnlocked = true;
    this.justUnlockedTimeout = setTimeout(() => {
      this.justUnlocked = false;
    }, 4000);
  }
}
