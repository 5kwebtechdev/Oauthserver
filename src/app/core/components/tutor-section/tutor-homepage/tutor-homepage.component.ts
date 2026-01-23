import { Component, Input, Output, EventEmitter, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulSpeechBubbleComponent } from '../../mindful-speech-bubble/mindful-speech-bubble.component';
import { TutorListComponent } from '../tutor-list/tutor-list.component';
import { TutorAllFilterComponent } from '../tutor-all-filter/tutor-all-filter.component';
import { TutorProfileComponent } from '../tutor-profile/tutor-profile.component';
import { FooterComponent } from '../../footer/footer.component';
import { MindfulPopupComponent } from '../../mindful-popup/mindful-popup.component';
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
    MindfulButtonComponent,
    TutorListComponent,
    MindfulPetComponent,
    MindfulSpeechBubbleComponent,
    FooterComponent,
    MindfulPopupComponent
  ],
  templateUrl: './tutor-homepage.component.html',
  styleUrls: ['./tutor-homepage.component.scss']
})
export class TutorHomepageComponent implements OnInit, OnDestroy {
  tutors: TutorListItem[] = [];
  isLoading = false;
  searchQuery = '';

  /** Emitted when a tutor profile is requested */
  @Output() viewProfile = new EventEmitter<TutorListItem>();

  isReferModalOpen = false;
  referLink = 'https://example.com/refer-tutor';

  // Sort dropdown state
  isSortOpen = false;
  currentSort: TutorSortOption = 'recent';
  readonly sortOptions: { key: TutorSortOption; label: string }[] = [
    { key: 'alphabets', label: 'Alphabets' },
    { key: 'mostLiked', label: 'Most Liked' },
    { key: 'experience', label: 'Experience' },
    { key: 'recent', label: 'Recently added' }
  ];

  private subscriptions = new Subscription();

  constructor(
    private modalCtrl: ModalController,
    private tutorService: TutorService,
    private route: ActivatedRoute,
    private tutorApi: TutorApi
  ) { }

  ngOnInit(): void {
    this.loadTutors();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load tutors from service
   */
  private loadTutors(): void {
    // Subscribe to loading state
    this.subscriptions.add(
      this.tutorService.isLoading$.subscribe(loading => {
        this.isLoading = loading;
      })
    );

    // Fetch tutors (will use cache if available)
    this.subscriptions.add(
      this.tutorService.fetchTutors().subscribe()
    );

    // Subscribe to filtered tutors
    this.subscriptions.add(
      this.tutorService.tutors$.subscribe(tutors => {
        this.tutors = tutors;
      })
    );

    // Set initial sort
    this.currentSort = this.tutorService.getCurrentSort();
  }

  /**
   * Check if we should open a tutor profile from query params
   */
  private checkForTutorProfile(): void {
    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        const tutorId = params['tutorId'];
        if (tutorId) {
          const id = parseInt(tutorId, 10);
          this.openProfileById(id);
        }
      })
    );
  }

  /**
   * Open profile modal by tutor ID
   */
  private async openProfileById(id: number): Promise<void> {
    this.subscriptions.add(
      this.tutorService.getTutorById(id).subscribe(async tutor => {
        if (tutor) {
          await this.openProfileModal(tutor);
        }
      })
    );
  }

  onViewProfile(tutor: TutorListItem): void {
    // Get full tutor data from cache
    const fullTutor = this.tutorService.getTutorFromCache(tutor.id);
    if (fullTutor) {
      this.openProfileModal(fullTutor);
    } else {
      // Fetch if not in cache
      this.tutorService.getTutorById(tutor.id).subscribe(t => {
        if (t) this.openProfileModal(t);
      });
    }
  }

  async openProfileModal(tutor: Tutor): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TutorProfileComponent,
      componentProps: { tutor },
      cssClass: 'tutor-profile-modal'
    });
    await modal.present();
  }

  async openAllFilters(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TutorAllFilterComponent,
      componentProps: {
        filters: ['Mathematics', 'Science', 'English', 'Computer Science', 'Social Studies', 'Hindi', 'Art & Craft']
      }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    // TutorAllFilter returns payload as { filters: SelectedFilters }
    if (data && data.filters) {
      const sel = data.filters as any;

      // First try server-side search using the exact SelectedFilters payload
      // this lets the backend match any field/keyword precisely.
      this.tutorApi.searchTutors(sel).subscribe(resp => {
        // TutorApi may return { tutors: [], total: 0 } or an array - handle both
        const tutors = Array.isArray(resp) ? resp : (resp && resp.tutors ? resp.tutors : []);
        if (tutors && tutors.length > 0) {
          // Replace client cache with server-provided results and update list
          this.tutorService.setCacheAndApply(tutors);
        } else {
          // If server returned no results, fall back to local derived filters
          const tf: any = {};
          if (sel.filters) {
            Object.keys(sel.filters).forEach((fieldKey: string) => {
              const values: string[] = sel.filters[fieldKey] || [];
              const k = fieldKey.toLowerCase();

              if (k.includes('subject')) {
                tf.subjects = values;
              } else if (k.includes('level') || k.includes('class') || k.includes('grade')) {
                tf.levels = values;
              } else if (k.includes('availability') || k.includes('day')) {
                tf.availability = values;
              } else if (k.includes('contact') || k.includes('mode')) {
                tf.contactModes = values;
              } else if (k.includes('location')) {
                tf.location = values.length > 0 ? values[0] : undefined;
              } else if (k.includes('experience')) {
                tf.experience = values.length > 0 ? values[0] : undefined;
              } else if (k.includes('fee') || k.includes('rate') || k.includes('price')) {
                // try to extract numeric values for min/max
                const nums = values.map(v => Number(String(v).replace(/[^0-9.]/g, ''))).filter(n => !isNaN(n));
                if (nums.length === 1) tf.minRate = nums[0];
                else if (nums.length >= 2) { tf.minRate = Math.min(...nums); tf.maxRate = Math.max(...nums); }
              } else {
                // Fallback: add to subjects if nothing better
                tf.subjects = tf.subjects ? [...tf.subjects, ...values] : values;
              }
            });
          }

          // Apply derived filters locally
          this.tutorService.setFilters(tf);
        }
      }, err => {
        // On error use local filtering as fallback
        console.error('[TutorHomepage] server search failed, falling back to local filters', err);
        const tf: any = {};
        if (sel.filters) {
          Object.keys(sel.filters).forEach((fieldKey: string) => {
            const values: string[] = sel.filters[fieldKey] || [];
            const k = fieldKey.toLowerCase();

            if (k.includes('subject')) {
              tf.subjects = values;
            } else if (k.includes('level') || k.includes('class') || k.includes('grade')) {
              tf.levels = values;
            } else if (k.includes('availability') || k.includes('day')) {
              tf.availability = values;
            } else if (k.includes('contact') || k.includes('mode')) {
              tf.contactModes = values;
            } else if (k.includes('location')) {
              tf.location = values.length > 0 ? values[0] : undefined;
            } else if (k.includes('experience')) {
              tf.experience = values.length > 0 ? values[0] : undefined;
            } else if (k.includes('fee') || k.includes('rate') || k.includes('price')) {
              const nums = values.map(v => Number(String(v).replace(/[^0-9.]/g, ''))).filter(n => !isNaN(n));
              if (nums.length === 1) tf.minRate = nums[0];
              else if (nums.length >= 2) { tf.minRate = Math.min(...nums); tf.maxRate = Math.max(...nums); }
            } else {
              tf.subjects = tf.subjects ? [...tf.subjects, ...values] : values;
            }
          });
        }
        this.tutorService.setFilters(tf);
      });
    }
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
    this.tutorService.setSort(option);
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
