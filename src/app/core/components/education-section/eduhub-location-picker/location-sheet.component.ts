import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { showSheetInFrame, slideCloseDialog } from '../counselor-design/shared/sheet-dialog';

export interface LocationOption {
  value: string;
  label: string;
}

/** Lists shorter than this don't need a search box. */
const SEARCH_FROM = 8;

/** Slide-up picker behind both header selectors: country, and that country's cities or states. */
@Component({
  standalone: true,
  selector: 'app-location-sheet',
  templateUrl: './location-sheet.component.html',
  styleUrl: './location-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationSheetComponent {
  readonly title = input.required<string>();
  readonly options = input.required<LocationOption[]>();
  readonly selected = input<string | null>(null);
  readonly pick = output<string>();

  protected readonly query = signal('');
  protected readonly showSearch = computed(() => this.options().length >= SEARCH_FROM);
  protected readonly visibleOptions = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.options().filter((option) => option.label.toLowerCase().includes(query));
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sheet = viewChild.required<ElementRef<HTMLDialogElement>>('sheet');
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  open(frame?: HTMLElement): void {
    this.query.set('');
    showSheetInFrame(this.sheet().nativeElement, frame || this.host.nativeElement);
    requestAnimationFrame(() => this.showSelected());
  }

  close(): Promise<void> {
    return slideCloseDialog(this.sheet().nativeElement);
  }

  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.sheet().nativeElement) {
      this.close();
    }
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  /** Long lists open with the current choice in view rather than at the top. */
  private showSelected(): void {
    const list = this.list().nativeElement;
    const row = list.querySelector<HTMLElement>('input:checked')?.closest('label');
    if (row) {
      list.scrollTop = row.offsetTop - list.offsetTop - list.clientHeight / 2;
    }
  }
}
