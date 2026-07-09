import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { BgSkeletonDirective } from '../../skeleton-image/bg-skeleton.directive';
import { AdBannerComponent, AdScreen } from '../../ad-banner/ad-banner.component';
import {
  TutorListItem,
  formatAvailability,
  formatTime,
  formatLevels
} from '../../../models/tutor.model';
import { TutorLikeService } from '../../../services/tutor-like.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'tutor-list',
  standalone: true,
  imports: [CommonModule, SupermeButtonComponent, BgSkeletonDirective, AdBannerComponent],
  templateUrl: './tutor-list.component.html',
  styleUrls: ['./tutor-list.component.scss']
})
export class TutorListComponent implements OnChanges {
  @Input() tutors: TutorListItem[] = [];

  // track subscriptions / live states
  private _watching = new Set<string | number>();

  constructor(private likeService: TutorLikeService, private authService: AuthService) {}

  get tutorAdScreen(): AdScreen {
    return this.authService.isParentUser() ? 'PARENT_TUTOR' : 'TUTOR_HOME';
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
    this.viewerSrc = tutor.avatar || 'assets/images/Avatar.png';
    this.viewerName = tutor.name || 'Tutor';
    this.viewerOpen = true;
  }

  closeAvatarViewer(): void {
    this.viewerOpen = false;
  }

  onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/Avatar.png';
  }

  onViewerError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/Avatar.png';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tutors'] && Array.isArray(this.tutors)) {
      this.tutors.forEach(t => {
        if (!t || !t.id) return;
        const id = t.id;
        if (this._watching.has(id)) return;
        this._watching.add(id);
        // initialize the like state in the service
        this.likeService.initFromServer(t);
        // subscribe and update the list item when state changes
        this.likeService.watch(id).subscribe(s => {
          t.champsLiked = s.count;
          (t as any).likedByUser = s.liked;
        });
      });
    }
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
