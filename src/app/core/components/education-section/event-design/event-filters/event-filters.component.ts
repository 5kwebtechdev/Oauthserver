import { ChangeDetectionStrategy, Component, Input, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { showSheetInFrame, slideCloseDialog } from '../shared/sheet-dialog';
import { EventDateCalendarComponent } from './event-date-calendar.component';
import { DatePreset, DateRange, presetRange, rangeLabel, sameRange } from './event-dates';
import {
  BAR_FILTER_FIELDS,
  DATE_FIELD_ID,
  EVENT_FILTER_FIELDS,
  EventFilterField,
  EventFilterState,
  QUICK_DATES,
  SORT_FIELD_ID,
} from './event-filters.data';

const EMPTY: EventFilterState = { selections: {}, dateRange: null };

const SETTLE_MS = 240;
/** Drag-to-dismiss: past a quarter of the sheet, or a flick (px per ms). */
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY = 0.5;

/**
 * Filter bar + slide-up filter sheet (Zepto / Instamart pattern).
 *
 * The bar has the Filters button, Sort, Mode and Date dropdowns, and one-tap Today / Tomorrow / This
 * weekend chips. Those chips apply at once and fill the same dates the calendar holds, so only one
 * date choice is ever active. The Date chip opens the calendar on its own at full width; the Filters
 * button shows it as a tab beside Sort and Mode. Everything in the sheet is a draft until Apply, so
 * closing it (X, backdrop, drag down, Esc) discards the changes. The sheet is a native <dialog>: it
 * sits in the browser's top layer above any clipping parent and traps focus for free.
 */
@Component({
  standalone: true,
  selector: 'app-event-filters',
  imports: [EventDateCalendarComponent],
  templateUrl: './event-filters.component.html',
  styleUrl: './event-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventFiltersComponent {
  /** Emits on every committed change: a one-tap chip or Apply. */
  readonly filtersChange = output<EventFilterState>();

  protected readonly fields = EVENT_FILTER_FIELDS;
  protected readonly barFields = BAR_FILTER_FIELDS;
  protected readonly quickDates = QUICK_DATES;

  protected readonly applied = signal<EventFilterState>(EMPTY);

  @Input() set filterState(state: EventFilterState) {
    this.applied.set(state);
  }
  protected readonly draft = signal<EventFilterState>(EMPTY);
  protected readonly activeTab = signal(SORT_FIELD_ID);
  /** Opened from the Date chip: the calendar alone, without the tabs. */
  protected readonly dateOnly = signal(false);

  protected readonly activeField = computed(() => this.fields.find((field) => field.id === this.activeTab()));
  protected readonly appliedCount = computed(() => this.countAll(this.applied()));
  protected readonly draftCount = computed(() => this.countAll(this.draft()));
  /** The Date chip names custom dates. Dates matching a one-tap chip light up that chip instead. */
  protected readonly customDates = computed(() => {
    const range = this.applied().dateRange;
    return range && !QUICK_DATES.some(({ preset }) => this.isPresetRange(preset, range)) ? rangeLabel(range) : null;
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sheet = viewChild.required<ElementRef<HTMLDialogElement>>('sheet');
  private readonly pane = viewChild.required<ElementRef<HTMLElement>>('pane');

  private closing = false;
  private drag: { startY: number; startTime: number } | null = null;

  // Bar ------------------------------------------------------------------------------------------

  protected isQuickOn(preset: DatePreset): boolean {
    return this.isPresetRange(preset, this.applied().dateRange);
  }

  protected toggleQuick(preset: DatePreset): void {
    const dateRange = this.isQuickOn(preset) ? null : presetRange(preset, new Date());
    this.commit({ ...this.applied(), dateRange });
  }

  protected openSheet(tab = SORT_FIELD_ID): void {
    this.dateOnly.set(false);
    this.showSheet(tab);
  }

  protected openDates(): void {
    this.dateOnly.set(true);
    this.showSheet(DATE_FIELD_ID);
  }

  protected countOf(state: EventFilterState, fieldId: string): number {
    return fieldId === DATE_FIELD_ID ? Number(!!state.dateRange) : (state.selections[fieldId]?.length ?? 0);
  }

  // Sheet ----------------------------------------------------------------------------------------

  protected setTab(tab: string): void {
    this.activeTab.set(tab);
    this.pane().nativeElement.scrollTop = 0;
  }

  protected isSelected(fieldId: string, value: string): boolean {
    return this.draft().selections[fieldId]?.includes(value) ?? false;
  }

  protected toggleOption(field: EventFilterField, value: string): void {
    this.draft.update((state) => this.toggled(state, field, value));
  }

  protected setDates(dateRange: DateRange | null): void {
    this.draft.update((state) => ({ ...state, dateRange }));
  }

  protected clearAll(): void {
    this.draft.update((state) => (this.dateOnly() ? { ...state, dateRange: null } : EMPTY));
  }

  protected apply(): void {
    this.commit(this.draft());
    this.closeSheet();
  }

  /** A click on ::backdrop reports the dialog itself; the panel covers everything else. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.sheet().nativeElement) {
      this.closeSheet();
    }
  }

  protected onCancel(event: Event): void {
    event.preventDefault(); // Esc: run the slide-down instead of vanishing
    this.closeSheet();
  }

  protected async closeSheet(): Promise<void> {
    if (this.closing) {
      return;
    }
    this.closing = true;
    await slideCloseDialog(this.sheet().nativeElement);
    this.closing = false;
  }

  // Drag the grabber down to dismiss -------------------------------------------------------------

  protected onGrabStart(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.drag = { startY: event.clientY, startTime: event.timeStamp };
  }

  protected onGrabMove(event: PointerEvent): void {
    if (this.drag) {
      const distance = Math.max(0, event.clientY - this.drag.startY);
      this.sheet().nativeElement.style.transform = `translateY(${distance}px)`;
    }
  }

  protected onGrabEnd(event: PointerEvent): void {
    if (!this.drag) {
      return;
    }
    const el = this.sheet().nativeElement;
    const distance = Math.max(0, event.clientY - this.drag.startY);
    const velocity = distance / Math.max(1, event.timeStamp - this.drag.startTime);
    this.drag = null;

    if (distance > el.offsetHeight * DISMISS_FRACTION || velocity > DISMISS_VELOCITY) {
      this.closeSheet();
      return;
    }
    el.animate({ transform: [`translateY(${distance}px)`, 'translateY(0)'] }, { duration: SETTLE_MS, easing: 'ease-out' });
    el.style.transform = '';
  }

  // ----------------------------------------------------------------------------------------------

  private showSheet(tab: string): void {
    this.draft.set(this.applied());
    this.setTab(tab);
    showSheetInFrame(this.sheet().nativeElement, this.host.nativeElement);
  }

  private isPresetRange(preset: DatePreset, range: DateRange | null): boolean {
    return sameRange(range, presetRange(preset, new Date()));
  }

  private toggled(state: EventFilterState, field: EventFilterField, value: string): EventFilterState {
    const current = state.selections[field.id] ?? [];
    const others = field.single ? [] : current.filter((item) => item !== value);
    const next = current.includes(value) ? others : [...others, value];
    return { ...state, selections: { ...state.selections, [field.id]: next } };
  }

  private commit(state: EventFilterState): void {
    this.applied.set(state);
    this.filtersChange.emit(state);
  }

  private countAll(state: EventFilterState): number {
    return this.fields.reduce((sum, field) => sum + this.countOf(state, field.id), 0);
  }
}
