import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Share } from '@capacitor/share';
import { IonicModule } from '@ionic/angular';

import { FooterComponent } from '../../footer/footer.component';
import { AuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';
import { UserService } from '../../../services/user.service';
import { EduHubEventEntityType, EduHubEventItem, EduHubEventsService } from '../../../services/eduhub-events.service';

interface EventDetailRouteData {
  entityType?: EduHubEventEntityType;
  title?: string;
}

@Component({
  selector: 'app-eduhub-event-details',
  standalone: true,
  imports: [CommonModule, IonicModule, FooterComponent],
  templateUrl: './eduhub-event-details.component.html',
  styleUrls: ['./eduhub-event-details.component.scss']
})
export class EduHubEventDetailsComponent implements OnInit {
  entityType: EduHubEventEntityType = 'Events';
  title = 'Events';
  item: EduHubEventItem | null = null;
  errorMessage = '';
  favourite = false;
  unlockInProgress = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly location: Location,
    private readonly core: CoreService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly eventsService: EduHubEventsService
  ) {}

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
      this.favourite = this.isStoredFavourite(candidate.id);
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

  get publicLocation(): string {
    if (!this.item) return '';
    const cityAndState = [this.item.city, this.item.state]
      .map(value => String(value ?? '').trim())
      .filter(Boolean)
      .join(', ');
    return cityAndState || String(this.item.address ?? '').trim();
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
      ? String(this.item.exactLocation || this.item.address || this.publicLocation).trim()
      : this.publicLocation;
  }

  get feeLabel(): string {
    const fee = Number(this.item?.fee);
    if (!Number.isFinite(fee)) return '';
    return fee === 0
      ? 'FREE'
      : `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(fee)}`;
  }

  /** Only render a coin cost when the API supplied a usable amount. */
  get unlockCost(): number | null {
    const cost = Number(this.item?.unlockCost);
    return Number.isFinite(cost) && cost > 0 ? cost : null;
  }

  toggleFavourite(): void {
    if (!this.item) return;
    this.favourite = !this.favourite;
    this.persistFavourite(this.item.id, this.favourite);
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
        url: window.location.href
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
      : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  private firstText(...values: Array<string | null | undefined>): string {
    return values.map(value => String(value ?? '').trim()).find(Boolean) ?? '';
  }

  private favouritesKey(): string {
    return `superme_eduhub_${this.entityType.toLowerCase()}_favourites_${this.authService.getUserId() ?? 'guest'}`;
  }

  private isStoredFavourite(itemId: number): boolean {
    try {
      const favourites = JSON.parse(localStorage.getItem(this.favouritesKey()) ?? '[]');
      return Array.isArray(favourites) && favourites.map(Number).includes(itemId);
    } catch {
      return false;
    }
  }

  private persistFavourite(itemId: number, selected: boolean): void {
    try {
      const current = JSON.parse(localStorage.getItem(this.favouritesKey()) ?? '[]');
      const favourites = new Set<number>(Array.isArray(current) ? current.map(Number).filter(Number.isFinite) : []);
      if (selected) favourites.add(itemId); else favourites.delete(itemId);
      localStorage.setItem(this.favouritesKey(), JSON.stringify([...favourites]));
    } catch {
      // Favourite state is non-critical and remains usable in this view.
    }
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
