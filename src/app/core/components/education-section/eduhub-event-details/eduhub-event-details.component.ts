import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Share } from '@capacitor/share';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { calendarOutline, locationOutline, personOutline, attachOutline, openOutline, documentTextOutline, lockClosedOutline, callOutline } from 'ionicons/icons';

import { FooterComponent } from '../../footer/footer.component';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';
import { AuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';
import { UserService } from '../../../services/user.service';
import { EduHubEventEntityType, EduHubEventItem, EduHubEventsService } from '../../../services/eduhub-events.service';
import { EDUHUB_FAQS } from '../eduhub-faqs';
import { ShareLinkService } from '../../../services/share-link.service';

interface EventDetailRouteData {
  entityType?: EduHubEventEntityType;
  title?: string;
}

@Component({
  selector: 'app-eduhub-event-details',
  standalone: true,
  imports: [CommonModule, IonicModule, FooterComponent, ProfileImageComponent],
  templateUrl: './eduhub-event-details.component.html',
  styleUrls: ['./eduhub-event-details.component.scss']
})
export class EduHubEventDetailsComponent implements OnInit {
  entityType: EduHubEventEntityType = 'Events';
  title = 'Events';
  item: EduHubEventItem | null = null;
  errorMessage = '';
  unlockInProgress = false;
  likeInProgress = false;
  imageFullscreen = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly location: Location,
    private readonly core: CoreService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly eventsService: EduHubEventsService,
    private readonly shareLinks: ShareLinkService
  ) {
    addIcons({ calendarOutline, locationOutline, personOutline, attachOutline, openOutline, documentTextOutline, lockClosedOutline, callOutline });
  }

  ngOnInit(): void {
    const data = this.route.snapshot.data as EventDetailRouteData;
    this.entityType = data.entityType === 'Workshop' ? 'Workshop' : 'Events';
    this.title = data.title === 'Workshops' ? 'Workshops' : 'Events';

    const id = Number(this.route.snapshot.paramMap.get('id'));
    const fromNavigation = history.state?.listing as EduHubEventItem | undefined;
    const fromSession = this.readStoredItem(id);
    const candidate = fromNavigation?.id === id ? fromNavigation : fromSession;

    if (candidate) {
      this.item = candidate;
      return;
    }

    this.errorMessage = `This ${this.entityType === 'Workshop' ? 'workshop' : 'event'} is no longer available. Return to the list and choose it again.`;
  }

  goBack(): void {
    this.location.back();
  }

  get image(): string {
    return this.item?.imageUrls?.find(url => typeof url === 'string' && url.trim())?.trim() ?? '';
  }

  openImage(): void {
    if (this.image) {
      this.imageFullscreen = true;
      return;
    }
    this.core.triggerToasrt('No profile picture available for this listing.', 'info');
  }
  closeImage(): void { this.imageFullscreen = false; }

  @HostListener('document:keydown.escape')
  onEscapeImage(): void { if (this.imageFullscreen) this.closeImage(); }

  get publicLocation(): string {
    if (!this.item) return '';
    return [this.item.city, this.item.state]
      .map(value => String(value ?? '').trim())
      .filter(Boolean)
      .join(', ');
  }

  get displayName(): string {
    return this.firstText(this.item?.title, this.item?.name) || (this.entityType === 'Workshop' ? 'Workshop' : 'Event');
  }

  get schedule(): string {
    const start = this.formatDate(this.item?.startDt);
    const end = this.formatDate(this.item?.endDt);
    return start && end && start !== end ? `${start} – ${end}` : start || end;
  }

  get organizer(): string {
    return this.firstText(this.item?.organizer, this.item?.contactPerson);
  }

  get description(): string {
    return this.firstText(this.item?.description, this.item?.bio);
  }

  get venue(): string {
    if (!this.item) return '';
    return this.item.unlocked
      ? this.firstText(this.item.exactLocation, this.item.address, this.item.venue, this.publicLocation)
      : this.publicLocation;
  }

  get feeLabel(): string {
    if (this.item?.isFree) return 'FREE';
    if (this.item?.fee == null) return 'Contact for pricing';
    const fee = Number(this.item?.fee);
    if (!Number.isFinite(fee)) return '';
    return fee === 0
      ? 'FREE'
      : `₹ ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(fee)} / Person`;
  }

  get registrationUrl(): string {
    if (!this.item?.unlocked || !this.item.regLink) return '';
    try {
      const url = new URL(this.item.regLink);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  readonly faqs = EDUHUB_FAQS['eventsWorkshops'];

  /** Only render a coin cost when the API supplied a usable amount. */
  get unlockCost(): number | null {
    const cost = Number(this.item?.unlockCost);
    return Number.isFinite(cost) && cost > 0 ? cost : null;
  }

  get favourite(): boolean {
    return !!this.item?.likedBySelf;
  }

  toggleFavourite(): void {
    if (!this.item || this.likeInProgress) return;

    const nextLiked = !this.item.likedBySelf;
    const previousLiked = this.item.likedBySelf;
    const previousCount = this.item.champsLiked;

    this.item.likedBySelf = nextLiked;
    this.item.champsLiked = Math.max(0, (Number(this.item.champsLiked) || 0) + (nextLiked ? 1 : -1));
    this.likeInProgress = true;

    this.eventsService.toggleLike(this.item.id, nextLiked).subscribe({
      next: response => {
        this.likeInProgress = false;
        if (!this.item) return;
        if (typeof response.likedBySelf === 'boolean') this.item.likedBySelf = response.likedBySelf;
        if (typeof response.champsLiked === 'number') this.item.champsLiked = response.champsLiked;
      },
      error: () => {
        this.likeInProgress = false;
        if (!this.item) return;
        this.item.likedBySelf = previousLiked;
        this.item.champsLiked = previousCount;
        this.core.triggerToasrt('Unable to update like. Please try again.', 'error');
      }
    });
  }

  onImageError(): void {
    if (this.item) this.item.imageUrls = [];
  }

  async shareItem(): Promise<void> {
    if (!this.item) return;
    try {
      await Share.share({
        title: this.displayName,
        text: `View ${this.displayName}${this.publicLocation ? ` in ${this.publicLocation}` : ''} on SuperMe EduHub.`,
        url: this.shareLinks.buildListingLink(this.entityType === 'Workshop' ? 'workshop' : 'event', this.item.id)
      });
    } catch (error) {
      const message = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
      if (!message.includes('cancel') && !message.includes('dismiss')) {
        this.core.triggerToasrt('Unable to share this listing. Please try again.', 'error');
      }
    }
  }

  unlockContactDetails(): void {
    if (!this.item || this.item.unlocked || this.unlockInProgress) return;

    this.unlockInProgress = true;
    this.eventsService.unlockContact(this.item.id).subscribe({
      next: response => {
        const unlockedRecord = this.unwrapUnlockResponse(response);
        this.item = { ...this.item!, ...unlockedRecord, unlocked: true };
        this.unlockInProgress = false;

        const coinsSpent = Number(unlockedRecord?.coinsSpent ?? 0);
        if (coinsSpent > 0) {
          // First-time unlock: coins were actually deducted — confirm that
          // and refresh the visible wallet balance from the response.
          this.core.triggerToasrt(`${coinsSpent} coins deducted. Contact details unlocked.`, 'success');
          this.updateCoinBalance(unlockedRecord);
        } else {
          // Repeat tap on an already-unlocked listing — no coins moved, so
          // just reveal the contact info without a coin animation/toast.
          this.core.triggerToasrt('Contact details unlocked.', 'success');
        }
      },
      error: (error: unknown) => {
        this.unlockInProgress = false;
        const message = String((error as { error?: { message?: string }; message?: string })?.error?.message
          ?? (error as { message?: string })?.message
          ?? 'Unable to unlock these details. Please try again.');
        this.core.triggerToasrt(message, 'error');
      }
    });
  }

  private readStoredItem(id: number): EduHubEventItem | null {
    if (!Number.isFinite(id)) return null;
    try {
      const raw = sessionStorage.getItem(`superme_eduhub_${this.entityType.toLowerCase()}_${id}`);
      const item = raw ? JSON.parse(raw) as EduHubEventItem : null;
      return item?.id === id ? item : null;
    } catch {
      return null;
    }
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  }

  private firstText(...values: Array<string | null | undefined>): string {
    return values.map(value => String(value ?? '').trim()).find(Boolean) ?? '';
  }

  /** Mirrors the Tutor/Academy unlock-contact coin-balance refresh (see tutor-profile.component.ts). */
  private updateCoinBalance(response: any): void {
    const amount = Number(response?.remainingBalance ?? response?.data?.remainingBalance);
    if (!Number.isFinite(amount)) {
      this.userService.refreshStats().subscribe();
      return;
    }
    const coins = Math.max(0, amount);
    this.authService.updateUserData({ coins });
    const stats = this.userService.getUserStats();
    if (stats) this.userService.saveUserStats({ ...stats, coins });
    else this.userService.refreshStats().subscribe();
  }

  private unwrapUnlockResponse(response: Partial<EduHubEventItem> | { data?: Partial<EduHubEventItem> }): Partial<EduHubEventItem> {
    const payload = response as { data?: Partial<EduHubEventItem> };
    return payload?.data && typeof payload.data === 'object'
      ? payload.data
      : response as Partial<EduHubEventItem>;
  }
}
