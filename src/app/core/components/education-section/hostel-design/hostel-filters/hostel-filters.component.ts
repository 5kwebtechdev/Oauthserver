import { ChangeDetectionStrategy, Component, Input, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { showSheetInFrame, slideCloseDialog } from '../shared/sheet-dialog';
import { HOSTEL_FILTER_FIELDS, HostelFilterField, HostelFilterState, SORT_FIELD_ID } from './hostel-filters.data';

const EMPTY: HostelFilterState = { selections: {} };

const SETTLE_MS = 240;
/** Drag-to-dismiss: past a quarter of the sheet, or a flick (px per ms). */
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY = 0.5;

/**
 * Filter bar + slide-up filter sheet (Zepto / Instamart pattern).
 *
 * The bar has the Filters button, then a dropdown chip for each field, which opens the sheet on that
 * field's tab. Everything in the sheet is a draft until Apply, so closing it (X, backdrop, drag down,
 * Esc) discards the changes.
 * The sheet is a native <dialog>: it sits in the browser's top layer above any clipping parent and
 * traps focus for free.
 */
@Component({
  standalone: true,
  selector: 'app-hostel-filters',
  templateUrl: './hostel-filters.component.html',
  styleUrl: './hostel-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostelFiltersComponent {
  /** Emits each time filters are applied. */
  readonly filtersChange = output<HostelFilterState>();

  protected readonly fields = HOSTEL_FILTER_FIELDS;

  protected readonly applied = signal<HostelFilterState>(EMPTY);

  @Input() set filterState(state: HostelFilterState) {
    this.applied.set(state);
  }
  protected readonly draft = signal<HostelFilterState>(EMPTY);
  protected readonly activeTab = signal(SORT_FIELD_ID);

  protected readonly activeField = computed(() => this.fields.find((field) => field.id === this.activeTab()));
  protected readonly appliedCount = computed(() => this.countAll(this.applied()));
  protected readonly draftCount = computed(() => this.countAll(this.draft()));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sheet = viewChild.required<ElementRef<HTMLDialogElement>>('sheet');
  private readonly pane = viewChild.required<ElementRef<HTMLElement>>('pane');

  private closing = false;
  private drag: { startY: number; startTime: number } | null = null;

  // Bar ------------------------------------------------------------------------------------------

  protected openSheet(tab = SORT_FIELD_ID): void {
    this.draft.set(this.applied());
    this.setTab(tab);
    showSheetInFrame(this.sheet().nativeElement, this.host.nativeElement);
  }

  protected countOf(state: HostelFilterState, fieldId: string): number {
    return state.selections[fieldId]?.length ?? 0;
  }

  // Sheet ----------------------------------------------------------------------------------------

  protected setTab(tab: string): void {
    this.activeTab.set(tab);
    this.pane().nativeElement.scrollTop = 0;
  }

  protected isSelected(fieldId: string, value: string): boolean {
    return this.draft().selections[fieldId]?.includes(value) ?? false;
  }

  protected toggleOption(field: HostelFilterField, value: string): void {
    this.draft.update((state) => this.toggled(state, field, value));
  }

  protected clearAll(): void {
    this.draft.set(EMPTY);
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

  private toggled(state: HostelFilterState, field: HostelFilterField, value: string): HostelFilterState {
    const current = state.selections[field.id] ?? [];
    const others = field.single ? [] : current.filter((item) => item !== value);
    const next = current.includes(value) ? others : [...others, value];
    return { selections: { ...state.selections, [field.id]: next } };
  }

  private commit(state: HostelFilterState): void {
    this.applied.set(state);
    this.filtersChange.emit(state);
  }

  private countAll(state: HostelFilterState): number {
    return Object.values(state.selections).reduce((sum, values) => sum + values.length, 0);
  }
}
