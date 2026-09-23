import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Share } from '@capacitor/share';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';
import { EduHubEventEntityType, EduHubEventItem, EduHubEventsService } from '../../../services/eduhub-events.service';
import { CoreService } from '../../../services/core.service';
import { ShareLinkService } from '../../../services/share-link.service';

@Component({
  selector: 'app-eduhub-event-card',
  standalone: true,
  imports: [CommonModule, ProfileImageComponent],
  templateUrl: './eduhub-event-card.component.html',
  styleUrls: ['./eduhub-event-card.component.scss']
})
export class EduHubEventCardComponent {
  @Input({ required: true }) item!: EduHubEventItem;
  @Input() entityType: EduHubEventEntityType = 'Events';
  @Output() viewDetails = new EventEmitter<EduHubEventItem>();
  likeInProgress = false;

  constructor(private events: EduHubEventsService, private core: CoreService, private shareLinks: ShareLinkService) {}

  getImage(item: EduHubEventItem): string {
    return (item.imageUrls ?? []).find(url => typeof url === 'string' && url.trim())?.trim() ?? '';
  }

  getDisplayName(item: EduHubEventItem): string {
    return this.text(item.title, item.name) || (this.entityType === 'Workshop' ? 'Workshop' : 'Event');
  }

  getLocation(item: EduHubEventItem): string {
    const location = [item.city, item.state].map(value => String(value ?? '').trim()).filter(Boolean).join(', ');
    return location || (item.unlocked ? this.text(item.exactLocation, item.address, item.venue) : '');
  }

  getEventMeta(item: EduHubEventItem): string {
    const start = this.date(item.startDt);
    const end = this.date(item.endDt);
    const schedule = start && end && start !== end ? `${start} – ${end}` : start || end;
    const venue = item.unlocked ? this.text(item.exactLocation, item.address, item.venue) : '';
    const organizer = this.text(item.organizer);
    return [schedule, venue, organizer ? `By ${organizer}` : ''].filter(Boolean).join(' • ');
  }

  getFeeLabel(item: EduHubEventItem): string {
    if (item.isFree) return 'FREE';
    if (item.fee == null) return 'Contact for pricing';
    const fee = Number(item.fee);
    if (!Number.isFinite(fee)) return 'Contact for pricing';
    return fee === 0 ? 'FREE' : `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(fee)}`;
  }

  isFavourite(item: EduHubEventItem): boolean { return !!item.likedBySelf; }

  toggleFavourite(item: EduHubEventItem): void {
    if (this.likeInProgress) return;
    const previousLiked = item.likedBySelf;
    const previousCount = item.champsLiked;
    const nextLiked = !previousLiked;
    item.likedBySelf = nextLiked;
    item.champsLiked = Math.max(0, (Number(previousCount) || 0) + (nextLiked ? 1 : -1));
    this.likeInProgress = true;
    this.events.toggleLike(item.id, nextLiked).subscribe({
      next: response => {
        this.likeInProgress = false;
        if (typeof response.likedBySelf === 'boolean') item.likedBySelf = response.likedBySelf;
        if (typeof response.champsLiked === 'number') item.champsLiked = response.champsLiked;
      },
      error: () => {
        this.likeInProgress = false;
        item.likedBySelf = previousLiked;
        item.champsLiked = previousCount;
        this.core.triggerToasrt('Unable to update like. Please try again.', 'error');
      }
    });
  }

  async shareItem(item: EduHubEventItem): Promise<void> {
    const name = this.getDisplayName(item);
    const location = this.getLocation(item);
    try {
      await Share.share({ title: name, text: `View ${name}${location ? ` in ${location}` : ''} on SuperMe EduHub.`,
        url: this.shareLinks.buildListingLink(this.entityType === 'Workshop' ? 'workshop' : 'event', item.id) });
    } catch (error) {
      if (!/cancel|dismiss|abort/i.test(String((error as Error)?.message ?? error))) {
        this.core.triggerToasrt('Unable to share this listing. Please try again.', 'error');
      }
    }
  }

  private text(...values: Array<string | null | undefined>): string {
    return values.map(value => String(value ?? '').trim()).find(Boolean) ?? '';
  }

  private date(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }
}
