import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulSpeechBubbleComponent } from '../../mindful-speech-bubble/mindful-speech-bubble.component';
import { TutorListComponent, Tutor } from '../tutor-list/tutor-list.component';
import { TutorAllFilterComponent } from '../tutor-all-filter/tutor-all-filter.component';
import { TutorViewAllScreenComponent } from '../Tutor-View-all-Screen/tutor-view-all-screen.component';
import { TutorProfileComponent } from '../tutor-profile/tutor-profile.component';
import { FooterComponent } from '../../footer/footer.component';
import { MindfulPopupComponent } from '../../mindful-popup/mindful-popup.component';

@Component({
  selector: 'tutor-homepage',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulButtonComponent, TutorListComponent, MindfulPetComponent, MindfulSpeechBubbleComponent, TutorViewAllScreenComponent, TutorAllFilterComponent, FooterComponent, MindfulPopupComponent],
  templateUrl: './tutor-homepage.component.html',
  styleUrls: ['./tutor-homepage.component.scss']
})
export class TutorHomepageComponent {
  @Input() tutors: Tutor[] = [];

  /** Emitted when a tutor profile is requested */
  @Output() viewProfile = new EventEmitter<Tutor>();

  onViewProfile(tutor: Tutor) {
    // Open profile modal
    this.openProfileModal(tutor);
  }

  async openProfileModal(tutor: Tutor) {
    const modal = await this.modalCtrl.create({
      component: TutorProfileComponent,
      componentProps: {
        tutor
      },
      cssClass: 'tutor-profile-modal'
    });

    await modal.present();
  }

  async viewAllTutors() {
    const modal = await this.modalCtrl.create({
      component: TutorViewAllScreenComponent,
      componentProps: {
        tutors: this.tutors
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    // handle returned data if needed
    if (data && data.selected) {
      console.log('Returned from view-all modal:', data.selected);
    }
  }
  isReferModalOpen = false;

  // The link to share — adjust if you have a dynamic link
  referLink = 'https://example.com/refer-tutor';
  // Sort dropdown state
  isSortOpen = false;
  currentSort: 'alphabets' | 'mostLiked' | 'experience' | 'recent' = 'alphabets';

  constructor(private modalCtrl: ModalController) { }

  async openAllFilters() {
    const modal = await this.modalCtrl.create({
      component: TutorAllFilterComponent,
      componentProps: {
        filters: ['Mathematics', 'Science', 'English', 'Computer Science', 'Social Studies', 'Hindi', 'Art & Craft']
      }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    // data may include selected filters if you decide to return them from the filter component
    if (data && data.selected) {
      // handle selected filters here or emit an event
      console.log('Selected filters from modal:', data.selected);
    }
  }

  // Provide sample data when none is supplied (useful for preview / dev)
  ngOnInit() {
    if (!this.tutors || this.tutors.length === 0) {
      this.tutors = [
        {
          name: 'Naveen Malik',
          avatar: '/assets/images/Avatar.png',
          description: 'Math tutor — Grades 6-8',
          rating: 128,
          experience: '5+ yrs'
        },
        {
          name: 'Yashmeet Singh',
          avatar: '/assets/images/Avatar.png',
          description: 'Science & Coding',
          rating: 256,
          experience: '7+ yrs'
        },
        {
          name: 'Ms. Sharma',
          avatar: '/assets/images/Avatar.png',
          description: 'English & Communication',
          rating: 400,
          experience: '10+ yrs'
        },
        {
          name: 'Ms. Sharma',
          avatar: '/assets/images/Avatar.png',
          description: 'English & Communication',
          rating: 400,
          experience: '10+ yrs'
        },
        {
          name: 'Ms. Sharma',
          avatar: '/assets/images/Avatar.png',
          description: 'English & Communication',
          rating: 400,
          experience: '10+ yrs'
        }
      ];
    }
  }

  openReferModal() {
    this.isReferModalOpen = true;
  }

  closeReferModal() {
    this.isReferModalOpen = false;
  }

  async copyLink() {
    try {
      if (navigator && 'clipboard' in navigator) {
        await navigator.clipboard.writeText(this.referLink);
        // Optionally provide user feedback — using alert for simplicity
        alert('Link copied to clipboard');
      } else {
        // fallback
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

  shareWhatsapp() {
    const text = encodeURIComponent('Join our platform as a tutor: ' + this.referLink);
    // Opens WhatsApp share (web or app) — for mobile this will trigger app
    const whatsappUrl = `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, '_blank');
  }

  toggleSortMenu() {
    this.isSortOpen = !this.isSortOpen;
  }

  selectSort(option: 'alphabets' | 'mostLiked' | 'experience' | 'recent') {
    this.currentSort = option;
    this.isSortOpen = false;
    // TODO: implement actual sorting logic and emit or apply to `tutors`
    console.log('Selected sort:', option);
  }

  get currentSortLabel() {
    switch (this.currentSort) {
      case 'mostLiked':
        return 'Most Liked';
      case 'experience':
        return 'Experience';
      case 'recent':
        return 'Recently added';
      default:
        return 'Alphabets';
    }
  }

  // close menus when clicking outside - listens to document clicks
  @HostListener('document:click', ['$event'])
  onDocumentClick() {
    if (this.isSortOpen) this.isSortOpen = false;
  }
}
