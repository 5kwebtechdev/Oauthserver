import { NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Input, computed, inject, output, signal, viewChild } from '@angular/core';
import { showSheetInFrame, slideCloseDialog } from '../../counselor-design/shared/sheet-dialog';
import {
  COMMON_FILTER_FIELDS,
  TUTOR_FILTER_CATEGORIES,
  TutorFilterCategory,
  TutorFilterField,
  TutorFilterState,
  optionValue,
} from './tutor-filters.data';

const CATEGORY_TAB = 'category';
const EMPTY: TutorFilterState = { category: null, selections: {} };

const SETTLE_MS = 240;
/** Drag-to-dismiss: past a quarter of the sheet, or a flick (px per ms). */
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY = 0.5;

/**
 * Filter bar + slide-up filter sheet (Zepto / Instamart pattern).
 *
 * Flow: pick one category (from the bar or the sheet) -> that category's fields appear as chips
 * and as tabs in the sheet -> tick any number of options per field -> Apply.
 * Sort and Mode are always available and survive a category change.
 *
 * Category chips in the bar apply at once. Everything in the sheet is a draft until Apply, so
 * closing it (X, backdrop, drag down, Esc) discards the changes. The sheet is a native <dialog>:
 * it sits in the browser's top layer above any clipping parent and traps focus for free.
 */
@Component({
  selector: 'app-tutor-filters',
  imports: [NgTemplateOutlet],
  templateUrl: './tutor-filters.component.html',
  styleUrl: './tutor-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TutorFiltersComponent {
  /** Emits on every committed change: a category chip, removing it, or Apply. */
  readonly filtersChange = output<TutorFilterState>();

  protected readonly categories = TUTOR_FILTER_CATEGORIES;
  protected readonly commonFields = COMMON_FILTER_FIELDS;
  protected readonly categoryTab = CATEGORY_TAB;
  protected readonly optionValue = optionValue;

  protected readonly applied = signal<TutorFilterState>(EMPTY);
  @Input() set filterState(state: TutorFilterState) {
    this.applied.set(state);
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    inject(Router).events.pipe(takeUntilDestroyed(destroyRef)).subscribe(event => {
      if (event instanceof NavigationStart) this.sheet()?.nativeElement.close();
    });
    destroyRef.onDestroy(() => this.sheet()?.nativeElement.close());
  }

  protected readonly draft = signal<TutorFilterState>(EMPTY);
  protected readonly activeTab = signal(CATEGORY_TAB);

  protected readonly appliedCategory = computed(() => this.findCategory(this.applied().category));
  protected readonly draftCategory = computed(() => this.findCategory(this.draft().category));
  protected readonly draftFields = computed(() => [...(this.draftCategory()?.fields ?? []), ...this.commonFields]);
  protected readonly activeField = computed(() => this.draftFields().find((field) => field.id === this.activeTab()));
  /** Category counts as one filter, plus every ticked option. */
  protected readonly appliedCount = computed(() => this.countAll(this.applied()));
  protected readonly draftCount = computed(() => this.countAll(this.draft()));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly sheet = viewChild<ElementRef<HTMLDialogElement>>('sheet');
  private readonly pane = viewChild.required<ElementRef<HTMLElement>>('pane');

  private closing = false;
  private drag: { startY: number; startTime: number } | null = null;

  // Bar ------------------------------------------------------------------------------------------

  protected selectCategory(id: string): void {
    this.commit({ category: id, selections: this.commonSelections(this.applied()) });
    this.bar().nativeElement.scrollLeft = 0; // the new chips start at the left edge
  }

  protected clearCategory(): void {
    this.commit({ category: null, selections: this.commonSelections(this.applied()) });
  }

  protected openSheet(tab = CATEGORY_TAB): void {
    this.draft.set(this.applied());
    this.setTab(tab);
    showSheetInFrame(this.sheet()!.nativeElement, this.host.nativeElement);
  }

  protected countOf(state: TutorFilterState, fieldId: string): number {
    return state.selections[fieldId]?.length ?? 0;
  }

  // Sheet ----------------------------------------------------------------------------------------

  protected setTab(tab: string): void {
    this.activeTab.set(tab);
    this.pane().nativeElement.scrollTop = 0;
  }

  /** Fields differ per category, so switching drops their ticks, then moves on to the first field. */
  protected pickCategory(category: TutorFilterCategory): void {
    if (this.draft().category !== category.id) {
      this.draft.update((state) => ({ category: category.id, selections: this.commonSelections(state) }));
    }
    this.setTab(category.fields[0].id);
  }

  protected isSelected(fieldId: string, value: string): boolean {
    return this.draft().selections[fieldId]?.includes(value) ?? false;
  }

  protected toggleOption(field: TutorFilterField, value: string): void {
    this.draft.update((state) => {
      const current = state.selections[field.id] ?? [];
      const others = field.single ? [] : current.filter((item) => item !== value);
      const next = current.includes(value) ? others : [...others, value];
      return { ...state, selections: { ...state.selections, [field.id]: next } };
    });
  }

  protected clearAll(): void {
    this.draft.set(EMPTY);
    this.setTab(CATEGORY_TAB);
  }

  protected apply(): void {
    this.commit(this.draft());
    this.closeSheet();
  }

  /** A click on ::backdrop reports the dialog itself; the panel covers everything else. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.sheet()!.nativeElement) {
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
    await slideCloseDialog(this.sheet()!.nativeElement);
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
      this.sheet()!.nativeElement.style.transform = `translateY(${distance}px)`;
    }
  }

  protected onGrabEnd(event: PointerEvent): void {
    if (!this.drag) {
      return;
    }
    const el = this.sheet()!.nativeElement;
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

  private commit(state: TutorFilterState): void {
    this.applied.set(state);
    this.filtersChange.emit(state);
  }

  private commonSelections(state: TutorFilterState): TutorFilterState['selections'] {
    const selections: TutorFilterState['selections'] = {};
    for (const field of this.commonFields) {
      selections[field.id] = state.selections[field.id] ?? [];
    }
    return selections;
  }

  private findCategory(id: string | null): TutorFilterCategory | undefined {
    return this.categories.find((category) => category.id === id);
  }

  private countAll(state: TutorFilterState): number {
    const ticked = Object.values(state.selections).reduce((sum, values) => sum + values.length, 0);
    return ticked + (state.category ? 1 : 0);
  }
}
