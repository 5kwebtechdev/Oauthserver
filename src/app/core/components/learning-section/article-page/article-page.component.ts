import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulPopupComponent, MindfulPopupConfig } from '../../mindful-popup/mindful-popup.component';
import { LearningService } from 'src/app/core/services/learning.service';
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
    MindfulNavigatorComponent,
    MindfulButtonComponent,
    MindfulPopupComponent
  ],
  providers: [LearningService]
})
export class ArticlePageComponent implements OnInit {
  article: Article | null = null;
  isLoading = true;
  isMarking = false;
  // Popup state and config
  showMarkPopup = false;
  markPopupConfig: MindfulPopupConfig = {
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
    public router: Router
  ) { }

  /**
   * Mark the current article as read by calling the API
   */
  markAsRead(): void {
    // Deprecated: markAsRead is now handled via the confirmation popup.
    this.openMarkAsReadPopup();
  }

  openMarkAsReadPopup(): void {
    if (!this.article) return;
    this.showMarkPopup = true;
  }

  closeMarkPopup(): void {
    this.showMarkPopup = false;
  }

  confirmMarkAsRead(): void {
    if (!this.article || this.isMarking) return;
    this.isMarking = true;
    this.learningService.markArticleComplete(this.article.id).subscribe({
      next: (res) => {
        console.log('Article marked as read response:', res);
        this.isMarking = false;
        this.showMarkPopup = false;
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
}