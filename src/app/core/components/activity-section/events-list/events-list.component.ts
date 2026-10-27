import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription, catchError, forkJoin, of } from 'rxjs';
import { EventApi, EventDto, EventTypeDto } from '../../../api/event.api';
import { ProfileSelectorService } from '../../../services/profile-selector-service';
import {
  EVENT_CATEGORIES, EventCategory, EventListMode, PersonalEventOccurrence,
  eventCategory, eventOccurrences, localDay
} from '../personal-event-occurrences';

interface EventPill {
  key: EventCategory | 'all';
  label: string;
  icon: string | null;
  count: number;
}

@Component({
  standalone: true,
  selector: 'app-personal-events-list',
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './events-list.component.html',
  styleUrls: ['./events-list.component.scss']
})
export class EventsListComponent implements OnDestroy {
  mode: EventListMode = 'upcoming';
  selectedCategory: EventCategory | 'all' = 'all';
  query = '';
  loading = false;
  error = '';
  events: EventDto[] = [];
  eventTypes: EventTypeDto[] = [];
  private today = localDay(new Date())!;
  private readonly origin = typeof history !== 'undefined'
    && typeof history.state?.origin === 'string'
    && history.state.origin.startsWith('/') && !history.state.origin.startsWith('//')
      ? history.state.origin : '/authed/activity-page';
  private readonly subscriptions = new Subscription();
  private requestId = 0;

  constructor(
    private readonly api: EventApi,
    private readonly router: Router,
    private readonly profileSelector: ProfileSelectorService
  ) {
    this.subscriptions.add(profileSelector.childChanged$.subscribe(() => this.load()));
  }

  ionViewWillEnter(): void {
    this.today = localDay(new Date())!;
    this.load();
  }

  ngOnDestroy(): void {
    this.requestId++;
    this.subscriptions.unsubscribe();
  }

  load(): void {
    const id = ++this.requestId;
    this.loading = true;
    this.error = '';
    this.subscriptions.add(forkJoin({
      events: this.api.getEvents(),
      types: this.api.getEventTypes().pipe(catchError(() => of([] as EventTypeDto[])))
    }).subscribe({
      next: ({ events, types }) => {
        if (id !== this.requestId) return;
        const apiEvents = Array.isArray(events) ? events : [];
        this.events = apiEvents.length ? apiEvents : this.calendarFallbackEvents();
        this.eventTypes = Array.isArray(types) ? types : [];
        this.loading = false;
      },
      error: () => {
        if (id !== this.requestId) return;
        this.loading = false;
        this.events = this.calendarFallbackEvents();
        if (!this.events.length) this.error = 'Could not load events. Please try again.';
      }
    }));
  }

  private calendarFallbackEvents(): EventDto[] {
    const state = typeof history === 'undefined' ? null : history.state;
    const selectedChildId = this.profileSelector.getChildId();
    if (selectedChildId == null || String(state?.childId) !== String(selectedChildId)
      || !Array.isArray(state?.calendarEvents)) return [];

    const seen = new Set<string>();
    return state.calendarEvents.filter((item: any) => {
      const id = Number(item?.id);
      const date = localDay(item?.eventDate);
      if (!Number.isFinite(id) || !date || !String(item?.name || '').trim()) return false;
      const key = `${id}:${item.eventDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }) as EventDto[];
  }

  get occurrences(): PersonalEventOccurrence[] {
    const items = this.events.reduce<PersonalEventOccurrence[]>(
      (all, event) => all.concat(eventOccurrences(event, this.today, this.mode)), []);
    return items.sort((a, b) => this.mode === 'upcoming'
      ? a.date.getTime() - b.date.getTime()
      : b.date.getTime() - a.date.getTime());
  }

  get pills(): EventPill[] {
    const items = this.occurrences;
    const categories = EVENT_CATEGORIES.map(category => ({
      ...category,
      count: items.filter(item => this.categoryOf(item.event) === category.key).length
    })).filter(pill => pill.count > 0 || pill.key === this.selectedCategory)
      .sort((a, b) => b.count - a.count);
    return [{ key: 'all', label: 'All', icon: null, count: items.length }, ...categories];
  }

  get visibleOccurrences(): PersonalEventOccurrence[] {
    const query = this.query.trim().toLowerCase();
    return this.occurrences.filter(item => {
      const category = this.categoryOf(item.event);
      return (this.selectedCategory === 'all' || category === this.selectedCategory)
        && (!query || item.event.name.toLowerCase().includes(query) || category.includes(query));
    });
  }

  categoryOf(event: EventDto): EventCategory {
    return eventCategory(event, this.eventTypes);
  }

  iconOf(event: EventDto): string | null {
    return EVENT_CATEGORIES.find(category => category.key === this.categoryOf(event))?.icon ?? null;
  }

  dateLabel(item: PersonalEventOccurrence): string {
    return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(item.date);
  }

  countdown(item: PersonalEventOccurrence): string {
    const days = Math.round((Date.UTC(item.date.getFullYear(), item.date.getMonth(), item.date.getDate())
      - Date.UTC(this.today.getFullYear(), this.today.getMonth(), this.today.getDate())) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days === -1) return 'Yesterday';
    return days > 0 ? `In ${days} days` : `${Math.abs(days)} days ago`;
  }

  selectMode(mode: EventListMode): void {
    this.mode = mode;
    this.selectedCategory = 'all';
  }

  openEvent(item: PersonalEventOccurrence): void {
    void this.router.navigate(['/authed/event-detail', item.event.id], {
      state: { event: item.event, origin: this.router.url }
    });
  }

  addEvent(): void {
    void this.router.navigate(['/authed/activity-input'], {
      queryParams: { createType: 'events' },
      state: { currentActive: 'events', origin: this.router.url }
    });
  }

  back(): void {
    void this.router.navigateByUrl(this.origin);
  }

  trackOccurrence(_index: number, item: PersonalEventOccurrence): string { return item.key; }
  trackPill(_index: number, pill: EventPill): string { return pill.key; }
}
