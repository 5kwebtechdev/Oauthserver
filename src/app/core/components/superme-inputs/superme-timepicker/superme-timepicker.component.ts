import {
  Component,
  forwardRef,
  Input,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

type WheelField = 'hour' | 'minute' | 'period';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'superme-timepicker',
  templateUrl: './superme-timepicker.component.html',
  styleUrls: ['./superme-timepicker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SupermeTimepickerComponent),
      multi: true,
    },
  ],
  standalone: false,
})
export class SupermeTimepickerComponent implements ControlValueAccessor {
  @Input() disabled = false;
  @Input() placeholder: string = 'Time';
  // Label shown in the popup title as "Set {label}" (e.g. "Start Time").
  @Input() label: string = 'Time';
  // Optional "h:mm AM/PM" string to seed the popup's wheel position when no
  // value is chosen yet (e.g. seed End Time from Start Time). Falls back to
  // the current time when not provided.
  @Input() seedTime: string | null = null;
  // Optional quick-pick durations (in minutes, e.g. [15, 30, 45, 60]) shown as
  // pills below the wheels — each jumps the wheels to seedTime + that many
  // minutes. Used for End Time; omitted (null) hides the row entirely.
  @Input() quickDurations: number[] | null = null;

  @ViewChild('popup') popupRef!: ElementRef;
  @ViewChild('hourWheel') hourWheelRef?: ElementRef<HTMLDivElement>;
  @ViewChild('minuteWheel') minuteWheelRef?: ElementRef<HTMLDivElement>;
  @ViewChild('periodWheel') periodWheelRef?: ElementRef<HTMLDivElement>;

  // Row height in px — must match $wheel-row-height in the stylesheet.
  readonly rowHeight = 44;
  readonly hoursList = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly minutesList = Array.from({ length: 60 }, (_, i) => i);
  readonly periodsList: Array<'AM' | 'PM'> = ['AM', 'PM'];

  showPopup = false;
  selectedHour = 12;
  selectedMinute = 0;
  ampm: 'AM' | 'PM' = 'AM';
  hasValue = false;
  selectedDurationMinutes: number | null = null;

  private scrollTimeouts: Record<WheelField, any> = { hour: null, minute: null, period: null };

  onChange: any = () => {};
  onTouched: any = () => {};

  get timeString(): string {
    const h = this.selectedHour.toString().padStart(2, '0');
    const m = this.selectedMinute.toString().padStart(2, '0');
    return `${h}:${m} ${this.ampm}`;
  }

  writeValue(value: string): void {
    if (value) {
      const [time, period] = value.trim().split(' ');
      const [hour, minute] = time.split(':').map(Number);
      if (!isNaN(hour)) this.selectedHour = hour;
      if (!isNaN(minute)) this.selectedMinute = minute;
      if (period === 'AM' || period === 'PM') this.ampm = period;
      this.hasValue = true;
    } else {
      // No time chosen (fresh form, or the parent explicitly cleared it e.g.
      // for a future date). Just reset hasValue here so the field shows its
      // placeholder instead of a stale time left over from a previous form
      // use — the actual wheel position gets (re-)seeded in openPopup(),
      // using whatever seedTime/now is current at the moment the user taps
      // it, not whatever it happened to be when this value was last cleared.
      this.hasValue = false;
    }
  }

  private parseSeedTime(value: string | null): { hour: number; minute: number; period: 'AM' | 'PM' } | null {
    if (!value) return null;
    const [time, period] = value.trim().split(' ');
    if (period !== 'AM' && period !== 'PM') return null;
    const [hour, minute] = time.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute)) return null;
    return { hour, minute, period };
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  openPopup() {
    if (this.disabled) return;

    // Seed the wheel's starting position fresh every time it opens with no
    // value chosen yet — prefer seedTime (e.g. End Time seeding from
    // whatever Start Time currently is) over "now", since "now" is usually
    // already in the past for a same-day End Time and would make the very
    // first confirm attempt fail with a "time already passed" error.
    if (!this.hasValue) {
      const seeded = this.parseSeedTime(this.seedTime);
      if (seeded) {
        this.selectedHour = seeded.hour;
        this.selectedMinute = seeded.minute;
        this.ampm = seeded.period;
      } else {
        const now = new Date();
        let hour = now.getHours();
        const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
        if (hour === 0) hour = 12;
        else if (hour > 12) hour -= 12;
        this.selectedHour = hour;
        this.selectedMinute = now.getMinutes();
        this.ampm = period;
      }
    }

    // If the current value happens to equal one of the quick-duration
    // shortcuts (measured from seedTime), pre-highlight that pill.
    this.selectedDurationMinutes = this.quickDurations?.find(d => {
      const r = this.computeTimeFromDuration(d);
      return r.hour === this.selectedHour && r.minute === this.selectedMinute && r.period === this.ampm;
    }) ?? null;

    this.showPopup = true;
    this.onTouched();

    // Wait for the popup to render (it's behind *ngIf) before measuring/scrolling.
    setTimeout(() => this.scrollWheelsToCurrentValues(), 0);
  }

  cancel() {
    this.showPopup = false;
  }

  confirm() {
    this.onChange(this.timeString);
    this.hasValue = true;
    this.showPopup = false;
  }

  // Set while openPopup() is snapping the wheels to the seeded/current value,
  // so the resulting synthetic 'scroll' events don't get mistaken for a real
  // user pick and commit a spurious onChange before the user has touched anything.
  private isProgrammaticScroll = false;

  private scrollWheelsToCurrentValues() {
    this.isProgrammaticScroll = true;
    this.scrollWheelTo(this.hourWheelRef, this.hoursList.indexOf(this.selectedHour));
    this.scrollWheelTo(this.minuteWheelRef, this.minutesList.indexOf(this.selectedMinute));
    this.scrollWheelTo(this.periodWheelRef, this.periodsList.indexOf(this.ampm));
    setTimeout(() => { this.isProgrammaticScroll = false; }, 50);
  }

  private scrollWheelTo(ref: ElementRef<HTMLDivElement> | undefined, index: number, smooth = false) {
    const el = ref?.nativeElement;
    if (!el || index < 0) return;
    if (smooth) el.scrollTo({ top: index * this.rowHeight, behavior: 'smooth' });
    else el.scrollTop = index * this.rowHeight;
  }

  private computeTimeFromDuration(minutes: number): { hour: number; minute: number; period: 'AM' | 'PM' } {
    const base = this.parseSeedTime(this.seedTime) || { hour: this.selectedHour, minute: this.selectedMinute, period: this.ampm };
    let hour24 = base.hour % 12;
    if (base.period === 'PM') hour24 += 12;
    const total = (((hour24 * 60 + base.minute + minutes) % 1440) + 1440) % 1440;
    const hour24Result = Math.floor(total / 60);
    const minute = total % 60;
    const period: 'AM' | 'PM' = hour24Result >= 12 ? 'PM' : 'AM';
    const hour = hour24Result % 12 === 0 ? 12 : hour24Result % 12;
    return { hour, minute, period };
  }

  formatDuration(minutes: number): string {
    if (minutes % 60 === 0) {
      const hrs = minutes / 60;
      return `${hrs} hr${hrs > 1 ? 's' : ''}`;
    }
    return `${minutes} min`;
  }

  /** Jumps the wheels to seedTime + `minutes` — a genuine user pick, so it commits immediately. */
  selectDuration(minutes: number) {
    const result = this.computeTimeFromDuration(minutes);
    this.selectedHour = result.hour;
    this.selectedMinute = result.minute;
    this.ampm = result.period;
    this.selectedDurationMinutes = minutes;

    this.isProgrammaticScroll = true;
    this.scrollWheelTo(this.hourWheelRef, this.hoursList.indexOf(this.selectedHour), true);
    this.scrollWheelTo(this.minuteWheelRef, this.minutesList.indexOf(this.selectedMinute), true);
    this.scrollWheelTo(this.periodWheelRef, this.periodsList.indexOf(this.ampm), true);
    setTimeout(() => { this.isProgrammaticScroll = false; }, 400);

    try { this.onChange(this.timeString); } catch (e) {}
  }

  /**
   * Fires on every scroll tick so the highlighted row tracks the finger in
   * real time; the actual onChange (form value commit) is debounced until
   * scrolling settles so validation doesn't run mid-drag.
   */
  onWheelScroll(field: WheelField, el: HTMLDivElement) {
    const list: Array<number | 'AM' | 'PM'> =
      field === 'hour' ? this.hoursList : field === 'minute' ? this.minutesList : this.periodsList;
    const idx = Math.max(0, Math.min(list.length - 1, Math.round(el.scrollTop / this.rowHeight)));
    const value = list[idx];

    if (field === 'hour') this.selectedHour = value as number;
    else if (field === 'minute') this.selectedMinute = value as number;
    else this.ampm = value as 'AM' | 'PM';

    if (this.isProgrammaticScroll) return;

    // A manual scroll on any wheel overrides whatever quick-duration pill was selected.
    this.selectedDurationMinutes = null;

    clearTimeout(this.scrollTimeouts[field]);
    this.scrollTimeouts[field] = setTimeout(() => {
      try { this.onChange(this.timeString); } catch (e) {}
    }, 120);
  }
}
