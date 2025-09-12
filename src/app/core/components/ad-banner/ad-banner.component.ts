import { Component, ElementRef, AfterViewInit, Renderer2, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BannerSlide {
  title: string;
  description: string;
  cta: string;
  image: string;
  bg?: string;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'ad-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ad-banner.component.html',
  styleUrls: ['./ad-banner.component.scss']
})
export class AdBannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('slidesContainer', { read: ElementRef }) slidesRef!: ElementRef<HTMLElement>;
  @ViewChild('pagerContainer', { read: ElementRef }) pagerRef!: ElementRef<HTMLElement>;

  // Default to 5 slides for layout preview; project may replace with dynamic slides later
  slides: BannerSlide[] = Array.from({ length: 5 }).map((_, idx) => ({
    title: `Become a Young Scientist!`,
    description: `Discover fun experiments with the Science Explorer Kit!`,
    cta: 'Get yours today!',
    image: '/assets/images/science-kid.png',
    bg: '#F9D2DC'
  }));

  current = 0;
  private intervalId: any;
  private scrollHandler?: () => void;
  private swiperInstance: any;
  useSwiper = false;
  private paginationListeners: Array<() => void> = [];

  constructor(private renderer: Renderer2) {}

  ngAfterViewInit(): void {
    if (!this.slidesRef) return;
    const el = this.slidesRef.nativeElement;

    // If Swiper was loaded on window by index.html, use it instead of native scroll-snap
    const win = window as any as { Swiper?: any } & Window;
    if (win && win.Swiper) {
      try {
        this.useSwiper = true;
        this.swiperInstance = new win.Swiper(el, {
          slidesPerView: 1,
          spaceBetween: 16,
          loop: true,
          autoplay: { delay: 5000, disableOnInteraction: false },
          pagination: {
            el: this.pagerRef?.nativeElement,
            clickable: true,
            bulletClass: 'dot',
            bulletActiveClass: 'active',
            renderBullet: function (index: number, className: string) {
              return `<span class="${className}"></span>`;
            }
          },
        });
        if (this.swiperInstance && this.swiperInstance.on) {
          this.swiperInstance.on('slideChange', () => {
            try {
              const idx = (this.swiperInstance.realIndex !== undefined && this.swiperInstance.realIndex !== null)
                ? this.swiperInstance.realIndex
                : (this.swiperInstance.activeIndex !== undefined && this.swiperInstance.activeIndex !== null)
                  ? this.swiperInstance.activeIndex
                  : 0;
              this.current = idx;
              this.updateManualDots(idx);
            } catch (e) { /* ignore */ }
          });
        }
        setTimeout(() => this.ensurePaginationBullets(), 0);
      } catch (e) {
        this.scrollHandler = this.renderer.listen(el, 'scroll', () => this.updateActiveDot());
        setTimeout(() => this.updateActiveDot(), 0);
        this.startAutoPlay();
      }
      return;
    }

    this.scrollHandler = this.renderer.listen(el, 'scroll', () => this.updateActiveDot());
    setTimeout(() => this.updateActiveDot(), 0);
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    if (this.scrollHandler) this.scrollHandler();
    this.stopAutoPlay();
    if (this.swiperInstance && typeof this.swiperInstance.destroy === 'function') {
      try { this.swiperInstance.destroy(true, true); } catch (e) { /* ignore */ }
    }
    try {
      if (this.pagerRef && this.pagerRef.nativeElement) {
        this.pagerRef.nativeElement.innerHTML = '';
      }
    } catch (e) {}
    this.paginationListeners.forEach(fn => {
      try { fn(); } catch (e) {}
    });
    this.paginationListeners = [];
  }

  private ensurePaginationBullets() {
    if (!this.pagerRef) return;
    const container = this.pagerRef.nativeElement as HTMLElement;
    if (!container) return;
    // Always show exactly 4 pagination dots under the banner
    const dotsToShow = 4;
    const existing = container.querySelectorAll('.dot');
    if (existing && existing.length === dotsToShow) return;
    container.innerHTML = '';
    for (let i = 0; i < dotsToShow; i++) {
      const span = document.createElement('span');
      span.className = 'dot' + (this.mapDotIndexToSlide(i, dotsToShow) === this.current ? ' active' : '');
      const onClick = () => this.goTo(this.mapDotIndexToSlide(i, dotsToShow));
      span.addEventListener('click', onClick);
      this.paginationListeners.push(() => span.removeEventListener('click', onClick));
      container.appendChild(span);
    }
  }

  // Map a dot index to a slide index. Distribute slides across dots evenly.
  private mapDotIndexToSlide(dotIndex: number, dots: number): number {
    if (this.slides.length >= dots) return Math.min(dotIndex, this.slides.length - 1);
    // distribute slides across dots (e.g., slides=2, dots=4 => [0,0,1,1])
    const ratio = this.slides.length / dots;
    return Math.min(Math.floor(dotIndex * ratio + 0.0001), this.slides.length - 1);
  }

  private updateManualDots(activeIndex: number) {
    if (!this.pagerRef) return;
    const container = this.pagerRef.nativeElement as HTMLElement;
    if (!container) return;
    const dots = Array.from(container.querySelectorAll('.dot')) as HTMLElement[];
    dots.forEach((d, idx) => {
      if (idx === activeIndex) d.classList.add('active'); else d.classList.remove('active');
    });
  }

  startAutoPlay(): void {
    this.stopAutoPlay();
    this.intervalId = setInterval(() => this.next(), 5000);
  }

  stopAutoPlay(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  next(): void {
    const el = this.slidesRef.nativeElement;
    const children = Array.from(el.querySelectorAll('.banner-slide')) as HTMLElement[];
    const nextIndex = (this.current + 1) % children.length;
    // Scroll the slides container horizontally to the child's offset instead of
    // using scrollIntoView which may cause the main viewport to scroll.
    try {
      const target = children[nextIndex];
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
      } else {
        // Fallback to setting scrollLeft
        el.scrollLeft = target.offsetLeft;
      }
    } catch (e) {
      // As a last resort, fall back to scrollIntoView
      try { children[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); } catch (err) { /* ignore */ }
    }
    this.setActiveDot(nextIndex);
  }

  goTo(index: number) {
    if (!this.slidesRef) return;
    if (this.useSwiper && this.swiperInstance && typeof this.swiperInstance.slideTo === 'function') {
      if (typeof this.swiperInstance.slideToLoop === 'function') {
        this.swiperInstance.slideToLoop(index, 600);
      } else {
        this.swiperInstance.slideTo(index, 600);
      }
      this.startAutoPlay();
      this.current = index;
      return;
    }

    const el = this.slidesRef.nativeElement;
    const children = Array.from(el.querySelectorAll('.banner-slide')) as HTMLElement[];
    const target = children[index];
    if (!target) return;
    // Scroll the slides container horizontally to the target to avoid moving the page
    try {
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
      } else {
        el.scrollLeft = target.offsetLeft;
      }
    } catch (e) {
      try { target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); } catch (err) { /* ignore */ }
    }
    this.startAutoPlay();
    this.setActiveDot(index);
  }

  private updateActiveDot(): void {
    if (!this.slidesRef) return;
    const el = this.slidesRef.nativeElement;
    const children = Array.from(el.querySelectorAll('.banner-slide')) as HTMLElement[];
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
    this.current = index;
    if (!this.pagerRef) return;
    const dots = Array.from(this.pagerRef.nativeElement.querySelectorAll('.dot')) as HTMLElement[];
    dots.forEach((d, i) => {
      if (i === index) d.classList.add('active'); else d.classList.remove('active');
    });
  }
}
