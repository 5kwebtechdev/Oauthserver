import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ITutor } from '../../../models/tutor.model';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';

@Component({
  selector: 'app-tutor-card',
  standalone: true,
  imports: [CommonModule, SupermeButtonComponent],
  templateUrl: './tutor-card.component.html',
  styleUrls: ['./tutor-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TutorCardComponent {
  
  @Input({ required: true }) tutor!: ITutor;

  @Output() viewProfileClick = new EventEmitter<ITutor>();

  readonly likeIcon = 'assets/Icons-Neutral/Tutor-Heart-Like.png';
  readonly timeIcon = 'assets/Icons-Neutral/Tutors-Time.png';
  readonly defaultAvatar = 'assets/images/default-tutor-avatar.png';

  constructor(private router: Router) {}

  get avatarUrl(): string {
    return this.tutor?.profilePicUrl || this.tutor?.avatar || this.defaultAvatar;
  }

  get experienceDisplay(): string {
    const rating = this.tutor?.rating || 0;
    const experience = this.tutor?.experience || '';
    return rating ? `${rating} | ${experience}` : experience;
  }

  get rateDisplay(): number {
    return this.tutor?.hourlyRate ?? this.tutor?.fees ?? this.tutor?.price ?? 0;
  }

  get ratingCount(): number {
    return this.tutor?.champsLiked ?? this.tutor?.rating ?? this.tutor?.hearts ?? (Array.isArray(this.tutor?.likes) ? this.tutor!.likes!.length : 0) ?? 0;
  }

  /**
   * Format levels/classes for display
   */
  private formatLevels(levels: string[]): string {
    if (!levels || levels.length === 0) return '';
    return levels.map(l => {
      // Convert GRADE_10 to Class 10, etc.
      if (l.startsWith('GRADE_')) {
        return `Class ${l.replace('GRADE_', '')}`;
      }
      if (l.startsWith('CLASS_')) {
        return `Class ${l.replace('CLASS_', '')}`;
      }
      // Convert underscores and capitalize
      return l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }).join(', ');
  }

  /**
   * Format availability days for display
   */
  private formatDays(availability: string | string[]): string {
    if (!availability) return '';
    if (typeof availability === 'string') return availability;
    const dayMap: Record<string, string> = {
      'MONDAY': 'Mon',
      'TUESDAY': 'Tue',
      'WEDNESDAY': 'Wed',
      'THURSDAY': 'Thu',
      'FRIDAY': 'Fri',
      'SATURDAY': 'Sat',
      'SUNDAY': 'Sun'
    };
    return availability.map(d => dayMap[d] || d).join(', ');
  }

  /**
   * Format time for display
   */
  private formatTimeDisplay(isoTime: string): string {
    if (!isoTime) return '';
    try {
      const date = new Date(isoTime);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  }

  /**
   * Get timing string
   */
  private getTimingString(tutor: ITutor): string {
    const days = this.formatDays(tutor.availability || '');
    const startTime = this.formatTimeDisplay(tutor.startTime || '');
    const endTime = this.formatTimeDisplay(tutor.endTime || '');
    
    if (days && startTime && endTime) {
      return `${days} - ${startTime}-${endTime}`;
    }
    return days || 'Schedule not available';
  }

  get roleDisplay(): string {
    return this.tutor?.description || this.tutor?.qualification || 'Subject Expert';
  }

  get levelsDisplay(): string {
    return this.formatLevels(this.tutor?.levels || []) || 'All Levels';
  }

  get timingDisplay(): string {
    return this.getTimingString(this.tutor);
  }

 
  onViewProfileClick(): void {
    this.viewProfileClick.emit(this.tutor);
    // Navigate to tutor profile page using name as slug when id not available
    const id = (this.tutor.id || this.tutor.name || 'tutor').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    this.router.navigate(['/tutor', id]);
  }

 
  onCardClick(): void {
    this.onViewProfileClick();
  }

  onCardKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onViewProfileClick();
    }
  }
}
