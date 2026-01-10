import { Component, Input, AfterViewInit, ViewChild, ElementRef, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
  selector: 'app-change-pet',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './change-pet.component.html',
  styleUrls: ['./change-pet.component.scss'],
})
export class ChangePetComponent {
  @Input() slides: any[] = [];

  @ViewChild('swiperEl', { static: false }) swiperEl?: ElementRef;

  pets: any[] = [];
  currentIndex = 0;
  private touchStartX = 0;
  private resizeObserver?: ResizeObserver;

  constructor(private modalCtrl: ModalController) { }

  setSlide(i: number) {
    if (i >= 0 && i < this.pets.length) this.currentIndex = i;
  }

  nextSlide() {
    this.currentIndex = (this.currentIndex + 1) % Math.max(1, this.pets.length);
  }

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0]?.clientX || 0;
  }

  onTouchEnd(event: TouchEvent) {
    const endX = event.changedTouches[0]?.clientX || 0;
    const diff = this.touchStartX - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) this.nextSlide();
      else this.currentIndex = Math.max(0, this.currentIndex - 1);
    }
  }

  ngOnInit() {

    this.pets = [
      {
        name: 'Bubu the Panda',
        image: 'assets/Images-Pet/Panda-Age3-Happy.png',
        text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
      },
      {
        name: 'Olly the Owl',
        image: 'assets/Images-Pet/Owl-Age3-Happy.png',
        text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
      },
      {
        name: 'Gradon the dragon',
        image: 'assets/Images-Pet/Dragon-Age3-Happy.png',
        text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
      },
      {
        name: 'Gradon the Llama',
        image: 'assets/Images-Pet/Llama-Age3-Happy.png',
        text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
      }
    ];
  }

  onSlideChange() {

  }

  ngAfterViewInit(): void {
    if (!this.swiperEl?.nativeElement) return;
    const swiperEl = this.swiperEl.nativeElement;
    swiperEl.addEventListener('swiperinit', () => {
      const swiperInstance = swiperEl.swiper;
      this.currentIndex = swiperInstance.realIndex || 0;
      this.updateCardScale();
    });
    swiperEl.addEventListener('swiperslidechange', () => {
      const swiperInstance = swiperEl.swiper;
      this.currentIndex = swiperInstance.realIndex || 0;
    });

    // Observe container resize to adjust card scale and gap dynamically
    try {
      this.resizeObserver = new ResizeObserver(() => this.updateCardScale());
      this.resizeObserver.observe(swiperEl);
      // also observe window resize as a fallback
      window.addEventListener('resize', this.updateCardScale.bind(this));
    } catch (e) {
      window.addEventListener('resize', this.updateCardScale.bind(this));
    }
  }

  private updateCardScale() {
    if (!this.swiperEl?.nativeElement) return;
    const swiperEl = this.swiperEl.nativeElement as HTMLElement;
    const containerWidth = swiperEl.clientWidth || swiperEl.getBoundingClientRect().width;
    // Find a representative card (first slide's card)
    const card = swiperEl.querySelector('.pet-card') as HTMLElement | null;
    const gap = 20; // desired gap in px
    if (!card || !containerWidth) {
      document.documentElement.style.setProperty('--pet-card-scale', '1');
      document.documentElement.style.setProperty('--pet-gap', `${gap}px`);
      return;
    }
    const cardWidth = card.offsetWidth || 305;
    // Determine how many slides we want visible (approx). Keep at most 1.4 like before.
    const maxVisible = 1.4;
    // Compute available width per visible slide when showing partial next slide
    const availablePerSlide = containerWidth / maxVisible;
    // If cardWidth + gap fits into availablePerSlide, no scale needed
    if (cardWidth + gap <= availablePerSlide) {
      document.documentElement.style.setProperty('--pet-card-scale', '1');
      document.documentElement.style.setProperty('--pet-gap', `${gap}px`);
      return;
    }
    // Otherwise compute scale so (cardWidth * scale + gap) == availablePerSlide
    const scale = Math.max(0.7, Math.min(1, (availablePerSlide - gap) / cardWidth));
    document.documentElement.style.setProperty('--pet-card-scale', `${scale}`);
    document.documentElement.style.setProperty('--pet-gap', `${gap}px`);
  }

  async confirmSelection() {
    const selected = this.pets[this.currentIndex];
    await this.modalCtrl.dismiss({ selected });
  }

  async close() {
    await this.modalCtrl.dismiss();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver && this.swiperEl?.nativeElement) {
      this.resizeObserver.unobserve(this.swiperEl.nativeElement);
    }
    window.removeEventListener('resize', this.updateCardScale.bind(this));
  }
}
