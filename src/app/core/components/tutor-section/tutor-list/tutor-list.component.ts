import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { AdBannerComponent, AdScreen } from '../../ad-banner/ad-banner.component';
import {
  TutorListItem,
  formatAvailability,
  formatTime,
  formatLevels
} from '../../../models/tutor.model';
import { TutorLikeService } from '../../../services/tutor-like.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';

@Component({
  selector: 'tutor-list',
  standalone: true,
  imports: [CommonModule, SupermeButtonComponent, AdBannerComponent, ProfileImageComponent],
  templateUrl: './tutor-list.component.html',
  styleUrls: ['./tutor-list.component.scss']
})
export class TutorListComponent implements OnChanges, OnDestroy {
  @Input() tutors: TutorListItem[] = [];
  @Input() itemLabel = 'Tutor';
  @Input() fallbackAvatar = 'assets/Images-Transparent/Image-Tutor.webp';
  @Input() adScreen?: AdScreen;

  // track subscriptions / live states
  private likeSubscriptions = new Map<string, Subscription>();

  constructor(private likeService: TutorLikeService, private authService: AuthService) {}

  get resolvedAdScreen(): AdScreen {
    return this.adScreen ?? (this.authService.isParentUser() ? 'PARENT_TUTOR' : 'TUTOR_HOME');
  }

  /** Emitted when user clicks View Profile. Payload: tutor object. */
  @Output() viewProfile = new EventEmitter<TutorListItem>();

  // Avatar viewer state
  viewerOpen = false;
  viewerSrc = '';
  viewerName = '';

  onViewProfile(tutor: TutorListItem) {
    this.viewProfile.emit(tutor);
  }

  openAvatarViewer(tutor: TutorListItem): void {
    this.viewerSrc = tutor.avatar || this.fallbackAvatar;
    this.viewerName = tutor.name || this.itemLabel;
    this.viewerOpen = true;
  }

  closeAvatarViewer(): void {
    this.viewerOpen = false;
  }

  onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).src = this.fallbackAvatar;
  }

  onViewerError(event: Event): void {
    (event.target as HTMLImageElement).src = this.fallbackAvatar;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tutors'] && Array.isArray(this.tutors)) {
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

      this.tutors.forEach(t => {
        if (!t || !t.id) return;
        const id = String(t.id);
        // initialize the like state in the service
        this.likeService.initFromServer(t);
        if (this.likeSubscriptions.has(id)) return;

        // subscribe and update the list item when state changes
        const subscription = this.likeService.watch(id).subscribe(s => {
          // Resolve against the current input array. The service can emit a new
          // tutor array containing the same id while this component stays alive.
          this.tutors
            .filter(currentTutor => String(currentTutor.id) === id)
            .forEach(currentTutor => {
              currentTutor.champsLiked = s.count;
              (currentTutor as any).likedByUser = s.liked;
            });
        });
        this.likeSubscriptions.set(id, subscription);
      });
    }
  }

  ngOnDestroy(): void {
    this.likeSubscriptions.forEach(subscription => subscription.unsubscribe());
    this.likeSubscriptions.clear();
  }

  /**
   * Format availability days for display
   */
  formatDays(availability: string[]): string {
    return formatAvailability(availability as any);
  }

  /**
   * Format time for display
   */
  formatTimeDisplay(isoTime: string): string {
    return formatTime(isoTime);
  }

  /**
   * Format levels/classes for display
   */
  formatLevelsDisplay(levels: string[]): string {
    return formatLevels(levels);
  }

  /**
   * Get timing string
   */
  getTimingString(tutor: TutorListItem): string {
    const days = this.formatDays(tutor.availability);
    const startTime = this.formatTimeDisplay(tutor.startTime);
    const endTime = this.formatTimeDisplay(tutor.endTime);
    
    if (days && startTime && endTime) {
      return `${days} - ${startTime}-${endTime}`;
    }
    return days || 'Schedule not available';
  }
}
