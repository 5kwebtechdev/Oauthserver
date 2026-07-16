import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ModalController } from "@ionic/angular";
import { CommonModule } from '@angular/common';
import { ViewAllComponent } from '../../superme-navigator/view-all/view-all.component';
import { SupermeCardHeaderComponent } from '../../superme-navigator/superme-card-header/superme-card-header.component';
import { TutorListComponent } from '../tutor-list/tutor-list.component';
import { TutorService } from '../../../services/tutor.service';
import { TutorListItem, Tutor } from '../../../models/tutor.model';
import { TutorProfileComponent } from '../tutor-profile/tutor-profile.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'tutor-card',
  templateUrl: './tutor-card.component.html',
  styleUrls: ['./tutor-card.component.scss'],
  imports: [CommonModule, IonicModule, ViewAllComponent, TutorListComponent, SupermeCardHeaderComponent],
  standalone: true
})
export class TutorCardComponent implements OnInit, OnDestroy {
  @Input() maxTutors: number = 3; // Max tutors to show in card view

  tutors: TutorListItem[] = [];
  isLoading = false;
  
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
  }

  onViewAll(): void {
    this.router.navigate(['/authed', 'tutors']);
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
