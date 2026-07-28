import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ModalController } from "@ionic/angular";
import { CommonModule } from '@angular/common';
import { TutorService } from '../../../services/tutor.service';
import { TutorListItem, Tutor } from '../../../models/tutor.model';
import { TutorProfileComponent } from '../tutor-profile/tutor-profile.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'tutor-card',
  templateUrl: './tutor-card.component.html',
  styleUrls: ['./tutor-card.component.scss'],
  imports: [CommonModule, IonicModule],
  standalone: true
})
export class TutorCardComponent implements OnInit, OnDestroy {
  @Input() maxTutors: number = 3; // Max tutors to show in card view

  tutors: TutorListItem[] = [];
  listingCount = 0;
  isLoading = false;

  readonly categories = [
    { label: 'Tutors', image: 'assets/figma/child-home/eduhub-tutors.png', route: '/authed/tutors' },
    { label: 'Academies', image: 'assets/figma/child-home/eduhub-academies.png', route: '/authed/academy' },
    { label: 'Workshops', image: 'assets/figma/child-home/eduhub-workshops.png', route: '/authed/education' },
    { label: 'Events', image: 'assets/figma/child-home/eduhub-events.png', route: '/authed/education' },
    { label: 'Stationery', image: 'assets/figma/child-home/eduhub-stationery.png', route: '/authed/school-store' }
  ];
  
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private tutorService: TutorService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit(): void {
    this.loadTutors();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load recent tutors from service
   */
  private loadTutors(): void {
    this.isLoading = true;

    // Subscribe to loading state
    this.subscriptions.add(
      this.tutorService.isLoading$.subscribe(loading => {
        this.isLoading = loading;
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
        this.isLoading = false;
      })
    );

    this.subscriptions.add(
      this.tutorService.allTutors$.subscribe(tutors => {
        this.listingCount = tutors.length;
      })
    );
  }

  onViewAll(): void {
    this.router.navigate(['/authed', 'tutors']);
  }

  navigateCategory(route: string): void {
    this.router.navigateByUrl(route);
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

  async openProfileModal(tutor: Tutor): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TutorProfileComponent,
      componentProps: { tutor },
      cssClass: 'tutor-profile-modal'
    });
    await modal.present();
  }
}
