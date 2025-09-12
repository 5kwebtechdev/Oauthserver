import { Component, Input, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ContentSlidesComponent } from '../../content-slides/content-slides.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
  selector: 'content-main',
  templateUrl: './content-main.component.html',
  styleUrls: ['./content-main.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ContentSlidesComponent, MindfulButtonComponent]
})
export class ContentMainComponent {
  @Input() title: string = '';
  @Input() body: string = '';

  slidesItems = [
    { title: 'Memory Maze', desc: 'Sharpen your memory with quick puzzles.', image: '/assets/images/Content-memory-maze-thumbnail.png' },
    { title: 'Story Time', desc: 'Short stories to spark curiosity.', image: '/assets/images/Content-memory-maze-thumbnail.png' },
    { title: 'Brain Teasers', desc: 'Try these fun brain teasers.', image: '/assets/images/Content-memory-maze-thumbnail.png' }
  ];

  // Backwards-compatible properties referenced by templates
  items: any[] = this.slidesItems;
  showPager: boolean = true;
  itemSelected: EventEmitter<any> = new EventEmitter<any>();

  onItemSelected(event: any) {
    // forward selection — later you can emit an EventEmitter or navigate
    console.log('slide item selected', event);
  }

  // upgrade popup state
  showUpgradePopup: boolean = false;

  openUpgradePopup(){
    this.showUpgradePopup = true;
    // add blur class to root content-page for visual effect
    const el = document.querySelector('.content-page');
    if(el) el.classList.add('blurred');
  }

  closeUpgradePopup(){
    this.showUpgradePopup = false;
    const el = document.querySelector('.content-page');
    if(el) el.classList.remove('blurred');
  }

  onConfirmUpgrade(){
    // placeholder: trigger purchase flow
    console.log('Upgrade confirmed');
    this.closeUpgradePopup();
  }
}
