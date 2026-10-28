import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { EventApi, EventDto } from '../../../api/event.api';
import { HabitService } from '../habit.service';
import { getEventTypeIcon } from '../event-type-icon';

type EventDetailData = Partial<EventDto> & {
  title?: string; startDate?: string; notes?: string; description?: string;
};

@Component({
  standalone: true,
  selector: 'app-event-detail',
  imports: [CommonModule, IonicModule],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss']
})
export class EventDetailComponent implements OnInit {
  event: EventDetailData | null = null;
  loading = true;
  error = '';
  deleting = false;
  private origin = '/authed/home';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private events: EventApi,
    private alerts: AlertController,
    private habits: HabitService
  ) {}

  ngOnInit(): void {
    const state = history.state || {};
    if (typeof state.origin === 'string' && state.origin.startsWith('/authed/')) this.origin = state.origin;
    this.event = state.event || null;
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading = false; this.error = 'Event not found.'; return; }
    this.loadEvent(id);
  }

  ionViewWillEnter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !this.loading) this.loadEvent(id);
  }

  private loadEvent(id: string): void {
    this.events.getEvent(id).subscribe({
      next: response => {
        this.event = response;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        if (!this.event) this.error = 'Could not load this event.';
      }
    });
  }

  get eventName(): string { return this.event?.name || this.event?.title || 'Event'; }
  get eventDate(): string { return String(this.event?.eventStartDate || this.event?.eventDate || this.event?.startDate || ''); }
  get eventEndDate(): string { return String(this.event?.eventEndDate || this.eventDate); }
  get eventTypeIcon(): string { return getEventTypeIcon(this.event?.eventType, this.eventName); }
  get eventNote(): string { return this.event?.note || this.event?.notes || this.event?.description || ''; }
  get timeLabel(): string {
    if (this.event?.allDay) return 'All day';
    const start = String(this.event?.startTime || '').slice(0, 5);
    const end = String(this.event?.endTime || '').slice(0, 5);
    return start && end ? `${start} – ${end}` : 'Time not set';
  }
  get recurrenceLabel(): string {
    const values: Record<string, string> = { ONE_TIME: 'Does not repeat', MONTHLY: 'Monthly', YEARLY: 'Yearly' };
    return values[String(this.event?.recurrence || '').toUpperCase()] || 'Does not repeat';
  }

  back(): void { void this.router.navigateByUrl(this.origin); }

  edit(): void {
    if (!this.event) return;
    void this.router.navigate(['/authed/activity-input'], {
      queryParams: { editEventId: this.event.id },
      state: {
        habit: { ...this.event, type: 'events' },
        currentActive: 'events',
        origin: this.router.url
      }
    });
  }

  async confirmDelete(): Promise<void> {
    if (!this.event || this.deleting) return;
    const alert = await this.alerts.create({
      header: 'Delete event?',
      message: `Delete “${this.eventName}”? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => { void this.deleteEvent(); } }
      ]
    });
    await alert.present();
  }

  private deleteEvent(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || this.deleting) return;
    this.deleting = true;
    this.events.deleteEvent(id).subscribe({
      next: () => {
        this.habits.notifyEventDeleted();
        this.back();
      },
      error: () => {
        this.deleting = false;
        this.error = 'Could not delete the event. Please try again.';
      }
    });
  }
}
