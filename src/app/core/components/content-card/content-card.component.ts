import { Component, ElementRef, Input, ViewChild, AfterViewInit, Renderer2, OnDestroy } from '@angular/core';
import { NgClass, NgIf } from "@angular/common";
import { IonicModule } from "@ionic/angular";

@Component({
  selector: 'content-card',
  templateUrl: './content-card.component.html',
  styleUrls: ['./content-card.component.scss'],
  imports: [NgClass, NgIf, IonicModule],
  standalone: true
})
export class ContentCardComponent implements AfterViewInit, OnDestroy {
  @Input() title: string = '';
  @Input() imageUrl: string = '';
  @Input() difficulty: string = '';
  @Input() likes: number = 0;
  @Input() views: number = 0;
  @Input() isNew: boolean = false;

  @ViewChild('slides', { read: ElementRef }) slidesRef!: ElementRef<HTMLElement>;
  @ViewChild('pager', { read: ElementRef }) pagerRef!: ElementRef<HTMLElement>;

  private scrollHandler?: () => void;

  constructor(private renderer: Renderer2) {}

  ngAfterViewInit(): void {
    if (!this.slidesRef) return;
    const el = this.slidesRef.nativeElement;
    // listen to scroll and update dots
    this.scrollHandler = this.renderer.listen(el, 'scroll', () => this.updateActiveDot());
    // initial sync
    setTimeout(() => this.updateActiveDot(), 0);
  }

  ngOnDestroy(): void {
    if (this.scrollHandler) this.scrollHandler();
  }

  private updateActiveDot(): void {
    const el = this.slidesRef.nativeElement;
    const children = Array.from(el.querySelectorAll('.slide')) as HTMLElement[];
    if (!children.length) return;
    // find center-most visible slide
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
    // smooth scroll so active dot updates via scroll listener
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    // ensure immediate visual update for non-supported browsers
    this.setActiveDot(index);
  }
}