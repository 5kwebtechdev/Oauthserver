import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../../mindful-navigator/mindful-navigator.component';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'product-detail',
  templateUrl: './product-detail.components.html',
  styleUrls: ['./product-detail.components.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent]
})
export class ProductDetailComponent implements OnInit {
  heading = 'Product';
  product: any = null;
  images: string[] = [];
  currentIndex = 0;
  isDragging = false;
  private startX = 0;
  private containerWidth = 0;

  @ViewChild('swiper', { static: true }) swiperRef!: ElementRef<HTMLElement>;
  @ViewChild('slides', { static: true }) slidesRef!: ElementRef<HTMLElement>;
  constructor(private router: Router) {}

  ngOnInit(): void {
    try {
      const s: any = history && (history as any).state;
      if (s && s.product) {
        this.product = s.product;
        this.heading = this.product.title || this.heading;
      } else if (s && s.title) {
        this.heading = s.title;
      }
    } catch (e) { }

    // Prepare images (use same image 3 times as requested)
    const src = 'assets/School-assets/temp/Shirt-l.jpg';
    this.images = [src, src, src];
  }

  goBack(): void {
    if (history.length > 1) { history.back(); } else { this.router.navigateByUrl('/home'); }
  }

  ngAfterViewInit(): void {
    this.updateSizes();
    // set initial translate
    this.setTranslate(-this.currentIndex * this.containerWidth, false);
  }

  @HostListener('window:resize')
  updateSizes(): void {
    try {
      this.containerWidth = this.swiperRef?.nativeElement?.clientWidth || 0;
      this.setTranslate(-this.currentIndex * this.containerWidth, false);
    } catch (e) { }
  }

  onPointerDown(ev: PointerEvent): void {
    this.isDragging = true;
    this.startX = ev.clientX;
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.isDragging) return;
    const dx = ev.clientX - this.startX;
    const translate = -this.currentIndex * this.containerWidth + dx;
    this.setTranslate(translate, true);
  }

  onPointerUp(ev: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    const dx = ev.clientX - this.startX;
    const threshold = this.containerWidth * 0.2;
    if (dx < -threshold && this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
    } else if (dx > threshold && this.currentIndex > 0) {
      this.currentIndex--;
    }
    this.setTranslate(-this.currentIndex * this.containerWidth, false);
    try { (ev.target as Element).releasePointerCapture?.(ev.pointerId); } catch (e) { }
  }

  goTo(i: number): void {
    this.currentIndex = i;
    this.setTranslate(-this.currentIndex * this.containerWidth, false);
  }

  private setTranslate(px: number, noTransition = false): void {
    const el = this.slidesRef?.nativeElement as HTMLElement | undefined;
    if (!el) return;
    el.style.transition = noTransition ? 'none' : 'transform 320ms ease';
    el.style.transform = `translateX(${px}px)`;
  }
}


