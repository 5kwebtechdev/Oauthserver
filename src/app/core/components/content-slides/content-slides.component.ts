import { Component, ElementRef, Input, ViewChild, AfterViewInit, Renderer2, OnDestroy, TemplateRef, ContentChild, EventEmitter, Output } from '@angular/core';
import { NgForOf, NgTemplateOutlet, NgIf } from '@angular/common';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'content-slides',
  templateUrl: './content-slides.component.html',
  styleUrls: ['./content-slides.component.scss'],
  standalone: true,
  imports: [NgForOf, NgTemplateOutlet, NgIf, IonicModule, MindfulButtonComponent]
})
export class ContentSlidesComponent implements AfterViewInit, OnDestroy {
  @Input() items: any[] = [];
  @Input() showPager: boolean = true;

  @ContentChild(TemplateRef) slideTemplate?: TemplateRef<any>;
  @Output() itemSelected = new EventEmitter<{ item: any; index: number }>();

  @ViewChild('slides', { read: ElementRef }) slidesRef!: ElementRef<HTMLElement>;
  @ViewChild('pager', { read: ElementRef }) pagerRef!: ElementRef<HTMLElement>;

  private scrollHandler?: () => void;

  constructor(private renderer: Renderer2) {}

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
}
