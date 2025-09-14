import { Component, Input, TemplateRef, ContentChild, EventEmitter, Output, OnInit } from '@angular/core';
import { NgIf, NgTemplateOutlet  } from "@angular/common";
import { ContentSlidesComponent } from '../content-slides/content-slides.component';
import { IonicModule } from "@ionic/angular";
import { RouterModule } from '@angular/router';

@Component({
  selector: 'content-card',
  templateUrl: './content-card.component.html',
  styleUrls: ['./content-card.component.scss'],
  imports: [NgIf, NgTemplateOutlet, IonicModule, ContentSlidesComponent, RouterModule],
  standalone: true
})
export class ContentCardComponent implements OnInit {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() imageUrl: string = '';
  @Input() difficulty: string = '';
  @Input() likes: number = 0;
  @Input() views: number = 0;
  @Input() isNew: boolean = false;

  // array of slide items to render. Each item can contain the fields used in the default template.
  @Input() items: Array<any> = [];

  // allow consumers to provide a custom slide template via content projection
  @ContentChild(TemplateRef) slideTemplate?: TemplateRef<any>;

  @Input() showPager: boolean = true;
  @Output() itemSelected = new EventEmitter<any>();
  @Output() viewAll = new EventEmitter<void>();

  // forward item clicks from child slides component
  onChildItemSelected(event: { item: any; index: number }) {
    this.itemSelected.emit(event);
  }

  ngOnInit(): void {
    // If no items provided by the consumer, provide a small default set so the slides render
    if (!this.items || this.items.length === 0) {
      this.items = [
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
          cta: 'Solve in 2 min'
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
    }
  }
}