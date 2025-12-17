import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'tutor-all-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent],
  templateUrl: './tutor-all-filter.component.html',
  styleUrls: ['./tutor-all-filter.component.scss']
})
export class TutorAllFilterComponent {
  /** List of available filter labels */
  @Input() filters: string[] = [];

  /** Topbar-slider categories for slider */
  categories = [
    { key: 'School', label: 'School', icon: '/assets/Icons-Neutral/Tutors-School.png' },
    { key: 'College', label: 'College', icon: '/assets/Icons-Neutral/Tutors-College.png' },
    { key: 'Hobbies', label: 'Hobbies', icon: '/assets/Icons-Neutral/Tutors-Hobbies.png' },
    { key: 'Sports', label: 'Sports', icon: '/assets/Icons-Neutral/Tutors-Sports.png' },
    { key: 'Exams', label: 'Exams', icon: '/assets/Icons-Neutral/Tutors-Exams.png' },
    { key: 'Language', label: 'Language', icon: '/assets/Icons-Neutral/Tutors-Language.png' },
    { key: 'Others', label: 'Others', icon: '/assets/Icons-Neutral/Tutors-Others.png' }
  ];

  /** Topbar-slider active category (kept for template compatibility) */
  selectedCategory: string | null = this.categories[0].key;

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  @ViewChild('categoriesSwiper', { read: ElementRef, static: true }) categoriesSwiperRef!: ElementRef;
  private swiperInstance: any | null = null;

  ngAfterViewInit() {
    // initialize global Swiper if available (loaded in index.html)
    const win: any = typeof window !== 'undefined' ? window : null;
    if (win && typeof win.Swiper === 'function' && this.categoriesSwiperRef?.nativeElement) {
      this.swiperInstance = new win.Swiper(this.categoriesSwiperRef.nativeElement, {
        slidesPerView: 'auto',
        spaceBetween: 12,
        freeMode: true,
        watchOverflow: true
      });
    }
  }

  ngOnDestroy() {
    if (this.swiperInstance && typeof this.swiperInstance.destroy === 'function') {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }
  }

  constructor(private modalCtrl: ModalController) { }

  close() {
    this.modalCtrl.dismiss();
  }

  // Filters removed — kept component minimal
}
