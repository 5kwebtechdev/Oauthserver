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

  constructor(private modalCtrl: ModalController) {}

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
    // default pets (copied from signup flow), can be overridden via componentProps
    this.pets = [
      {
        name: 'Bubu the Panda',
        image: 'assets/app-assets/Onboarding-pet-selection-panda.svg',
        text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
      },
      {
        name: 'Kiko the sky fox',
        image: 'assets/app-assets/Onboarding-pet-selection-sky-fox.svg',
        text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
      },
      {
        name: 'Gradon the dragon',
        image: 'assets/app-assets/Onboarding-pet-selection-neon-dragon.svg',
        text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
      }
    ];
  }

  onSlideChange() {
    // placeholder used by template bindings; actual slide changes update via swiper events
    // kept intentionally minimal — can be expanded if needed
    // console.debug('slide change event (animation/transition)');
  }

  ngAfterViewInit(): void {
    if (!this.swiperEl?.nativeElement) return;
    const swiperEl = this.swiperEl.nativeElement;
    swiperEl.addEventListener('swiperinit', () => {
      const swiperInstance = swiperEl.swiper;
      this.currentIndex = swiperInstance.realIndex || 0;
    });
    swiperEl.addEventListener('swiperslidechange', () => {
      const swiperInstance = swiperEl.swiper;
      this.currentIndex = swiperInstance.realIndex || 0;
    });
  }

  async confirmSelection() {
    const selected = this.pets[this.currentIndex];
    await this.modalCtrl.dismiss({ selected });
  }

  async close() {
    await this.modalCtrl.dismiss();
  }
}
