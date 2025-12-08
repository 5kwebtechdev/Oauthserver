import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
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
    MindfulButtonComponent
  ],
  providers: [LearningService]
})
export class ArticlePageComponent implements OnInit {
  article: Article | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private learningService: LearningService,
    public router: Router
  ) { }

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