import { Component, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { ContentSlidesComponent } from 'src/app/core/components/content-card/content-slides/content-slides.component';
import { MindfulButtonComponent } from 'src/app/core/components/mindful-button/mindful-button.component';
import { FooterComponent } from 'src/app/core/components/footer/footer.component';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../../mindful-navigator/view-all/view-all.component';

@Component({
  selector: 'content-main',
  templateUrl: './content-main.component.html',
  styleUrls: ['./content-main.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ContentSlidesComponent, MindfulCardHeaderComponent, ViewAllComponent, MindfulButtonComponent, FooterComponent]
})
export class ContentMainComponent {
  @Input() title: string = '';
  @Input() body: string = '';

  slidesItems = [
    {
      title: 'Memory Maze',
      desc: 'Sharpen your memory with quick puzzles.',
      image: '/assets/images/Content-memory-maze-thumbnail.png',
      tag: 'Puzzle',
      rewards: { coins: 50, trophies: 1 },
      cta: 'Finish in 5 min'
    },
    {
      title: 'Story Time',
      desc: 'Short stories to spark curiosity.',
      image: '/assets/images/Content-memory-maze-thumbnail.png',
      tag: 'Story',
      rewards: { coins: 30, trophies: 0 },
      cta: 'Read now'
    },
    {
      title: 'Brain Teasers',
      desc: 'Try these fun brain teasers.',
      image: '/assets/images/Content-memory-maze-thumbnail.png',
      tag: 'Quiz',
      rewards: { coins: 40, trophies: 1 },
      cta: 'Solve in 2 min'
    }
  ];

  // Backwards-compatible properties referenced by templates
  items: any[] = this.slidesItems;
  showPager: boolean = true;
  @Output() itemSelected: EventEmitter<any> = new EventEmitter<any>();

  onItemSelected(event: any) {
    // forward selection — later you can emit an EventEmitter or navigate
    console.log('slide item selected', event);
  }

  // upgrade popup state
  showUpgradePopup: boolean = false;

  // track which category is selected so we can show the bottom border only on the selected one
  selectedCategory: 'for-you' | 'puzzles' | 'quizzes' | 'articles' | null = null;

  selectCategory(cat: 'for-you' | 'puzzles' | 'quizzes' | 'articles') {
    this.selectedCategory = cat;
  }

  // inject Router to navigate within the app
  constructor(private router: Router) { }

  openUpgradePopup() {
    this.showUpgradePopup = true;
    // add blur class to root content-page for visual effect
    const el = document.querySelector('.content-page');
    if (el) el.classList.add('blurred');
  }

  closeUpgradePopup() {
    this.showUpgradePopup = false;
    const el = document.querySelector('.content-page');
    if (el) el.classList.remove('blurred');
  }

  onConfirmUpgrade() {
    // placeholder: trigger purchase flow
    console.log('Upgrade confirmed');
    this.closeUpgradePopup();
  }

  openForYou() {
    // open the For You page in a new tab, same behavior as the previous anchor
    window.open('/for-you', '_blank', 'noopener');
  }

  openPuzzles() {
    // puzzles is an external page in this app; open in new tab to preserve previous behavior
    window.open('/puzzles', '_blank', 'noopener');
  }

  openQuizzes() {
    // quizzes route lives under content/description; navigate internally
    this.router.navigate(['/content', 'description']);
  }

  openArticles() {
    this.router.navigate(['/articles']);
  }
}
