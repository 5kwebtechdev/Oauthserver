import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ModalController } from "@ionic/angular";
import { CommonModule } from '@angular/common';
import { TutorService } from '../../../services/tutor.service';
import { TutorListItem, Tutor } from '../../../models/tutor.model';
import { TutorProfileComponent } from '../tutor-profile/tutor-profile.component';
import { Subscription } from 'rxjs';
import { TutorLikeService } from '../../../services/tutor-like.service';
import { AcademyService } from '../../../services/academy.service';
import { AuthService } from '../../../services/auth.service';

type CategoryKey = 'tutors' | 'academies' | 'workshops' | 'events' | 'stationery';

interface EduHubCategory {
  key: CategoryKey;
  label: string;
  image: string;
  route: string;
}

// Normalized card shape shared by categories that don't have their own
// bespoke rendering (currently just Academies — Tutors keeps its existing
// detailed card markup untouched).
interface EduHubListItem {
  id: string | number;
  title: string;
  description: string;
  image: string;
  meta?: string;
}

@Component({
  selector: 'tutor-card',
  templateUrl: './tutor-card.component.html',
  styleUrls: ['./tutor-card.component.scss'],
  imports: [CommonModule, IonicModule],
  standalone: true
})
export class TutorCardComponent implements OnInit, OnDestroy {
  @Input() maxTutors: number = 4; // Max tutors to show in card view

  tutors: TutorListItem[] = [];
  listingCount = 0;
  isLoading = false;

  readonly categories: EduHubCategory[] = [
    { key: 'tutors', label: 'Tutors', image: 'assets/figma/child-home/eduhub-tutors.png', route: '/authed/tutors' },
    { key: 'academies', label: 'Academies', image: 'assets/figma/child-home/eduhub-academies.png', route: '/authed/academy' },
    { key: 'workshops', label: 'Workshops', image: 'assets/figma/child-home/eduhub-workshops.png', route: '/authed/education' },
    { key: 'events', label: 'Events', image: 'assets/figma/child-home/eduhub-events.png', route: '/authed/education' },
    { key: 'stationery', label: 'Stationery', image: 'assets/figma/child-home/eduhub-stationery.png', route: '/authed/school-store' }
  ];

  selectedCategoryKey: CategoryKey = 'tutors';

  // Academies — lazily loaded the first time that category is selected.
  academyItems: EduHubListItem[] = [];
  academyTotalCount = 0;
  private academyLoaded = false;
  private academyLoading = false;

  private subscriptions = new Subscription();
  private likeSubscriptions = new Map<string, Subscription>();

  constructor(
    private router: Router,
    private tutorService: TutorService,
    private modalCtrl: ModalController,
    private likeService: TutorLikeService,
    private academyService: AcademyService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadTutors();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.likeSubscriptions.forEach(subscription => subscription.unsubscribe());
    this.likeSubscriptions.clear();
  }

  get selectedCategory(): EduHubCategory {
    return this.categories.find(c => c.key === this.selectedCategoryKey) || this.categories[0];
  }

  /** Whether the currently selected category has more than 4 items to view. */
  get showViewAll(): boolean {
    if (this.isLoading) return false;
    if (this.selectedCategoryKey === 'tutors') return this.listingCount > this.maxTutors;
    if (this.selectedCategoryKey === 'academies') return this.academyTotalCount > this.maxTutors;
    return false; // Workshops / Events / Stationery have no data source yet.
  }

  /**
   * Switch the visible category. Filters in place — never navigates away.
   * Each category's data is fetched at most once and cached thereafter, so
   * repeated taps never trigger duplicate API calls.
   */
  selectCategory(category: EduHubCategory): void {
    if (this.selectedCategoryKey === category.key) return;
    this.selectedCategoryKey = category.key;

    if (category.key === 'tutors' && !this.tutorService.isLoaded) {
      this.loadTutors();
    } else if (category.key === 'academies' && !this.academyLoaded && !this.academyLoading) {
      this.loadAcademies();
    }
    // Workshops / Events / Stationery: no backend source yet — the template
    // shows an empty state for them instead of hardcoded placeholder data.
  }

  /**
   * Load recent tutors from service
   */
  private loadTutors(): void {
    this.isLoading = true;

    // Subscribe to loading state
    this.subscriptions.add(
      this.tutorService.isLoading$.subscribe(loading => {
        if (this.selectedCategoryKey === 'tutors') this.isLoading = loading;
      })
    );

    // Fetch tutors if not already loaded
    if (!this.tutorService.isLoaded) {
      this.subscriptions.add(
        this.tutorService.fetchTutors().subscribe()
      );
    }

    // Subscribe to recent tutors
    this.subscriptions.add(
      this.tutorService.getRecentTutors(this.maxTutors).subscribe(tutors => {
        this.tutors = tutors;
        this.syncLikeStates();
        if (this.selectedCategoryKey === 'tutors') this.isLoading = false;
      })
    );

    this.subscriptions.add(
      this.tutorService.allTutors$.subscribe(tutors => {
        this.listingCount = tutors.length;
      })
    );
  }

  private loadAcademies(): void {
    this.academyLoading = true;
    this.isLoading = true;

    const age = this.authService.getCurrentUserAge() ?? undefined;
    this.subscriptions.add(
      this.academyService.getAcademyFeed(age).subscribe({
        next: (res) => {
          const items = res.state === 2
            ? (res.lessons ?? []).map(lesson => ({
                id: lesson.lessonId,
                title: lesson.lessonTitle,
                description: lesson.lessonDescription || '',
                image: lesson.thumbnailUrl || lesson.courseThumbnailUrl || '',
                meta: lesson.duration ? `${lesson.duration} min` : undefined
              } as EduHubListItem))
            : (res.courses ?? []).map(course => ({
                id: course.id,
                title: course.courseName,
                description: course.description || '',
                image: course.thumbnailUrl || '',
                meta: course.noOfLessons ? `${course.noOfLessons} lessons` : undefined
              } as EduHubListItem));

          this.academyItems = items.slice(0, this.maxTutors);
          this.academyTotalCount = items.length;
          this.academyLoaded = true;
          this.academyLoading = false;
          if (this.selectedCategoryKey === 'academies') this.isLoading = false;
        },
        error: () => {
          this.academyItems = [];
          this.academyTotalCount = 0;
          this.academyLoaded = true;
          this.academyLoading = false;
          if (this.selectedCategoryKey === 'academies') this.isLoading = false;
        }
      })
    );
  }

  private syncLikeStates(): void {
    const visibleIds = new Set(
      this.tutors
        .filter(tutor => !!tutor?.id)
        .map(tutor => String(tutor.id))
    );

    this.likeSubscriptions.forEach((subscription, id) => {
      if (!visibleIds.has(id)) {
        subscription.unsubscribe();
        this.likeSubscriptions.delete(id);
      }
    });

    this.tutors.forEach(tutor => {
      if (!tutor?.id) return;

      const id = String(tutor.id);
      this.likeService.initFromServer(tutor);
      if (this.likeSubscriptions.has(id)) return;

      const subscription = this.likeService.watch(id).subscribe(state => {
        this.tutors
          .filter(currentTutor => String(currentTutor.id) === id)
          .forEach(currentTutor => {
            currentTutor.champsLiked = state.count;
            (currentTutor as any).likedByUser = state.liked;
          });
      });
      this.likeSubscriptions.set(id, subscription);
    });
  }

  onViewAll(): void {
    this.router.navigateByUrl(this.selectedCategory.route);
  }

  getTutorMeta(tutor: TutorListItem): string {
    const likes = typeof tutor.champsLiked === 'number'
      ? tutor.champsLiked
      : (typeof tutor.rating === 'number' ? tutor.rating : null);
    const experience = tutor.experience?.trim();

    if (likes === null) return experience || '';
    return experience ? `${likes} | ${experience}` : String(likes);
  }

  onViewProfile(tutor: TutorListItem): void {
    const cachedTutor = this.tutorService.getTutorFromCache(tutor.id);
    this.tutorService.getTutorById(tutor.id).subscribe(fullTutor => {
      const profileTutor = fullTutor || cachedTutor;
      if (profileTutor) this.openProfileModal(profileTutor);
    });
  }

  onAcademyItemClick(item: EduHubListItem): void {
    this.router.navigate(['/authed/academy/course', item.id]);
  }

  async openProfileModal(tutor: Tutor): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TutorProfileComponent,
      componentProps: { tutor },
      cssClass: 'tutor-profile-modal'
    });
    await modal.present();
  }
}
