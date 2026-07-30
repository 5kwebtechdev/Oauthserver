import { Component, Output, EventEmitter, HostListener, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ViewWillEnter } from '@ionic/angular';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';
import { SupermeSpeechBubbleComponent } from '../../superme-speech-bubble/superme-speech-bubble.component';
import { TutorListComponent } from '../tutor-list/tutor-list.component';
import { TutorAllFilterComponent } from '../tutor-all-filter/tutor-all-filter.component';
import { TutorProfileComponent } from '../tutor-profile/tutor-profile.component';
import { FooterComponent } from '../../footer/footer.component';
import { SupermePopupComponent } from '../../superme-popup/superme-popup.component';
import { TutorService } from '../../../services/tutor.service';
import { TutorApi } from '../../../api/tutor.api';
import { TutorListItem, TutorSortOption, Tutor } from '../../../models/tutor.model';

@Component({
  selector: 'tutor-homepage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SupermeButtonComponent,
    TutorListComponent,
    SupermePetComponent,
    SupermeSpeechBubbleComponent,
    FooterComponent,
    SupermePopupComponent
  ],
  templateUrl: './tutor-homepage.component.html',
  styleUrls: ['./tutor-homepage.component.scss']
})
export class TutorHomepageComponent implements OnInit, OnDestroy, ViewWillEnter {
  tutors: TutorListItem[] = [];
  isLoading = false;
  searchQuery = '';
  private lastAppliedFilters: any = null;

  /** Emitted when a tutor profile is requested */
  @Output() viewProfile = new EventEmitter<TutorListItem>();

  isReferModalOpen = false;
  referLink = 'https://supermeapp.com/become-a-tutor';

  // Sort dropdown state
  isSortOpen = false;
  currentSort: TutorSortOption = 'recent';
  readonly sortOptions: { key: TutorSortOption; label: string }[] = [
    { key: 'alphabets', label: 'Alphabetical' },
    { key: 'mostLiked', label: 'Most Liked' },
    { key: 'experience', label: 'Experience' },
    { key: 'recent', label: 'Recently added' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private modalCtrl: ModalController,
    private tutorService: TutorService,
    private tutorApi: TutorApi,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadTutors();
  }

  ionViewWillEnter(): void {
    this.loadTutors();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTutors(): void {
    this.tutorService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => { this.isLoading = loading; });

    this.tutorService.fetchTutors()
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    this.tutorService.tutors$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tutors => { this.tutors = tutors; });

    this.currentSort = this.tutorService.getCurrentSort();
  }

  onViewProfile(tutor: TutorListItem): void {
    const cachedTutor = this.tutorService.getTutorFromCache(tutor.id);
    this.tutorService.getTutorById(tutor.id).subscribe(fullTutor => {
      const profileTutor = fullTutor || cachedTutor;
      if (profileTutor) this.openProfileModal(profileTutor);
    });
  }

  async openProfileModal(tutor: Tutor): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TutorProfileComponent,
      componentProps: {
        tutor,
        categoryKey: this.lastAppliedFilters?.categoryKey || null
      },
      cssClass: 'tutor-profile-modal'
    });
    await modal.present();
  }

  async openAllFilters(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TutorAllFilterComponent,
      componentProps: {
        filters: ['Mathematics', 'Science', 'English', 'Computer Science', 'Social Studies', 'Hindi', 'Art & Craft'],
        initialFilters: this.lastAppliedFilters
      }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();

    // Clear All pressed — refetch all tutors from API and reset filter state
    if (data?.clearAll) {
      this.lastAppliedFilters = null;
      this.tutorService.clearFilters();
      this.isLoading = true;
      this.tutorService.fetchTutors().pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.isLoading = false; },
        error: () => { this.isLoading = false; }
      });
      return;
    }

    // Filters applied — search tutors with selected filters
    if (data?.filters) {
      const sel = data.filters as any;
      this.lastAppliedFilters = sel;

      this.tutorApi.searchTutors(sel).pipe(takeUntil(this.destroy$)).subscribe({
        next: (resp: any) => {
          const tutors = Array.isArray(resp) ? resp : (resp?.tutors ?? []);
          if (tutors.length > 0) {
            this.tutorService.setCacheAndApply(tutors);
          } else {
            this.applyLocalFilters(sel);
          }
        },
        error: () => this.applyLocalFilters(sel)
      });
    }
  }

  private applyLocalFilters(sel: any): void {
    const tf: any = {};
    if (!sel?.filters) { return; }
    Object.keys(sel.filters).forEach((fieldKey: string) => {
      const values: string[] = sel.filters[fieldKey] || [];
      const k = fieldKey.toLowerCase();
      if (k.includes('subject')) { tf.subjects = values; }
      else if (k.includes('level') || k.includes('class') || k.includes('grade')) { tf.levels = values; }
      else if (k.includes('availability') || k.includes('day')) { tf.availability = values; }
      else if (k.includes('contact') || k.includes('mode')) { tf.contactModes = values; }
      else if (k.includes('location')) { tf.location = values[0]; }
      else if (k.includes('experience')) { tf.experience = values[0]; }
      else if (k.includes('fee') || k.includes('rate') || k.includes('price')) {
        const nums = values.map(v => Number(String(v).replace(/[^0-9.]/g, ''))).filter(n => !isNaN(n));
        if (nums.length === 1) { tf.minRate = nums[0]; }
        else if (nums.length >= 2) { tf.minRate = Math.min(...nums); tf.maxRate = Math.max(...nums); }
      } else { tf.subjects = tf.subjects ? [...tf.subjects, ...values] : values; }
    });
    this.tutorService.setFilters(tf);
  }

  /**
   * Handle search input
   */
  onSearch(): void {
    this.tutorService.searchTutors(this.searchQuery);
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.tutorService.searchTutors('');
  }

  openReferModal(): void {
    this.isReferModalOpen = true;
  }

  closeReferModal(): void {
    this.isReferModalOpen = false;
  }

  async copyLink(): Promise<void> {
    try {
      if (navigator && 'clipboard' in navigator) {
        await navigator.clipboard.writeText(this.referLink);
        alert('Link copied to clipboard');
      } else {
        const el = document.createElement('textarea');
        el.value = this.referLink;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        alert('Link copied to clipboard');
      }
    } catch (err) {
      console.error('Copy failed', err);
      alert('Unable to copy link');
    }
  }

  shareWhatsapp(): void {
    const text = encodeURIComponent('Join our platform as a tutor: ' + this.referLink);
    const whatsappUrl = `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, '_blank');
  }

  toggleSortMenu(): void {
    this.isSortOpen = !this.isSortOpen;
  }

  selectSort(option: TutorSortOption): void {
    this.currentSort = option;
    this.isSortOpen = false;
    this.tutors = this.sortTutors([...this.tutors], option);
    this.tutorService.setSort(option);
    this.cdr.detectChanges();
  }

  private sortTutors(tutors: TutorListItem[], sort: TutorSortOption): TutorListItem[] {
    switch (sort) {
      case 'alphabets':
        return tutors.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'mostLiked':
        return tutors.sort((a, b) => (b.champsLiked || 0) - (a.champsLiked || 0));
      case 'experience':
        return tutors.sort((a, b) => {
          const parse = (s: string) => parseInt((s || '').replace(/\D/g, ''), 10) || 0;
          return parse(b.experience) - parse(a.experience);
        });
      case 'recent':
      default:
        return tutors.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }
  }

  get currentSortLabel(): string {
    const opt = this.sortOptions.find(o => o.key === this.currentSort);
    return opt ? opt.label : 'Recently added';
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isSortOpen) this.isSortOpen = false;
  }
}
