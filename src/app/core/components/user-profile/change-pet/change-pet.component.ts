import { Component, AfterViewInit, ViewChild, ElementRef, Input, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { PetAgeService } from '../../../services/pet-age.service';

@Component({
  selector: 'app-change-pet',
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeButtonComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './change-pet.component.html',
  styleUrls: ['./change-pet.component.scss'],
})
export class ChangePetComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('swiperEl', { static: false }) swiperEl?: ElementRef;

  /** The user's currently saved pet type (e.g. "panda"). Defaults to the live PetAgeService value if not passed in. */
  @Input() currentPetType: string | null = null;

  pets: any[] = [];
  currentIndex = 0;
  selectedIndex = 0;
  readonly swiperBreakpoints = {
    480: { slidesPerView: 1.45, spaceBetween: 16 },
    768: { slidesPerView: 2.15, spaceBetween: 20 },
  };
  private resizeObserver?: ResizeObserver;

  constructor(private modalCtrl: ModalController, private petAgeService: PetAgeService) { }

  ngOnInit() {
    this.pets = [
      {
        displayName: 'Bao the superme Panda',
        name: 'Panda',
        apiName: 'Panda-Age1-Happy.png',
        image: 'assets/Images-Pet/Panda-Age3-Happy.png',
        text: ['Your gentle guide to inner peace', 'Celebrates small acts of kindness']
      },
      {
        displayName: 'Luna the Wise Owl',
        name: 'Owl',
        apiName: 'Owl-Age1-Happy.png',
        image: 'assets/Images-Pet/Owl-Age3-Happy.png',
        text: ['Your midnight study buddy', 'Celebrates "aha!" moments']
      },
      {
        displayName: 'Zuki the Fierce Dragon',
        name: 'Dragon',
        apiName: 'Dragon-Age1-Happy.png',
        image: 'assets/Images-Pet/Dragon-Age3-Happy.png',
        text: ['Loves big ideas and bold moves', 'Celebrates when you go on streaks']
      },
      {
        displayName: 'Koda the Chill Llama',
        name: 'Llama',
        apiName: 'Llama-Age1-Happy.png',
        image: 'assets/Images-Pet/Llama-Age3-Happy.png',
        text: ['Master of staying cool under pressure', 'Loves colorful, quirky adventures']
      }
    ];

    const activePetType = (this.currentPetType || this.petAgeService.getCurrentPetType() || '').toLowerCase();
    const matchedIndex = this.pets.findIndex(pet => pet.name.toLowerCase() === activePetType);
    this.selectedIndex = matchedIndex >= 0 ? matchedIndex : 0;
    this.currentIndex = this.selectedIndex;
  }

  isCurrentPet(index: number): boolean {
    return index === this.selectedIndex;
  }

  onSlideChange() {
    if (!this.swiperEl?.nativeElement) return;
    const swiperInstance = this.swiperEl.nativeElement.swiper;
    if (!swiperInstance) return;
    // prefer realIndex (when looped) else fallback to activeIndex
    this.currentIndex = (swiperInstance.realIndex !== undefined && swiperInstance.realIndex !== null)
      ? swiperInstance.realIndex
      : (swiperInstance.activeIndex ?? 0);
  }

  ngAfterViewInit(): void {
    if (!this.swiperEl?.nativeElement) return;
    const swiperEl = this.swiperEl.nativeElement;
    swiperEl.addEventListener('swiperinit', () => {
      const swiperInstance = swiperEl.swiper;
      this.currentIndex = swiperInstance.realIndex || 0;
    });
    // ensure slide change updates are captured for other event names
    swiperEl.addEventListener('swiperslidechange', () => {
      const swiperInstance = swiperEl.swiper;
      if (!swiperInstance) return;
      this.currentIndex = (swiperInstance.realIndex !== undefined && swiperInstance.realIndex !== null)
        ? swiperInstance.realIndex
        : (swiperInstance.activeIndex ?? 0);
    });
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
  }
}
