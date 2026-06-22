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

  @ViewChild('popup') popupRef!: ElementRef;
  @ViewChild('hourInput') hourInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('minuteInput') minuteInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('clockSvg') clockSvgRef!: ElementRef<SVGSVGElement>;

  showPopup = false;
  selectedHour = 12;
  selectedMinute = 0;
  ampm: 'AM' | 'PM' = 'AM';
  selecting: 'hour' | 'minute' = 'hour';
  hasValue = false;
  isDragging = false;

  editingField: 'hour' | 'minute' | null = null;
  hourBuffer: string = '12';
  minuteBuffer: string = '00';

  /** Start position of the current pointer-down, used to distinguish tap vs drag. */
  private tapStartPos: { x: number; y: number } | null = null;

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
      this.hourBuffer = this.selectedHour.toString().padStart(2, '0');
      this.minuteBuffer = this.selectedMinute.toString().padStart(2, '0');
      this.hasValue = true;
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  openPopup() {
    if (this.disabled) return;
    this.selecting = 'hour';
    this.editingField = null;
    this.hourBuffer = this.selectedHour.toString().padStart(2, '0');
    this.minuteBuffer = this.selectedMinute.toString().padStart(2, '0');
    this.showPopup = true;
    this.onTouched();
  }

  cancel() {
    this.showPopup = false;
    this.editingField = null;
  }

  confirm() {
    this.finishEdit('hour');
    this.finishEdit('minute');
    this.onChange(this.timeString);
    this.hasValue = true;
    this.showPopup = false;
    this.editingField = null;
  }

  startEdit(field: 'hour' | 'minute') {
    this.selecting = field;
    this.editingField = field;
    if (field === 'hour') {
      this.hourBuffer = this.selectedHour.toString().padStart(2, '0');
    } else {
      this.minuteBuffer = this.selectedMinute.toString().padStart(2, '0');
    }
    // Use a small delay so Ionic WebView registers the focus and shows the keyboard
    setTimeout(() => {
      try {
        const el = field === 'hour'
          ? this.hourInputRef?.nativeElement
          : this.minuteInputRef?.nativeElement;
        if (el) {
          el.focus();
          el.select();
        }
      } catch (e) {}
    }, 50);
  }

  finishEdit(field: 'hour' | 'minute') {
    if (field === 'hour') {
      if (!this.hourBuffer) this.hourBuffer = this.selectedHour.toString().padStart(2, '0');
    } else {
      if (!this.minuteBuffer) this.minuteBuffer = this.selectedMinute.toString().padStart(2, '0');
    }
    if (this.editingField === field) this.editingField = null;
    try { this.onChange(this.timeString); } catch (e) {}
  }

  onHourInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Strip non-digits, cap at 2 chars
    const raw = input.value.replace(/\D/g, '').slice(0, 2);
    this.hourBuffer = raw;

    if (!raw.length) return;

    const num = parseInt(raw, 10);
    let val = raw === '00' ? 12 : num;
    if (val < 1) val = 1;
    if (val > 12) val = 12;
    this.selectedHour = val;

    // After 2 digits, auto-advance to minute
    if (raw.length === 2) {
      this.selecting = 'minute';
      this.editingField = 'minute';
      this.minuteBuffer = this.selectedMinute.toString().padStart(2, '0');
      setTimeout(() => {
        try {
          this.minuteInputRef?.nativeElement?.focus();
          this.minuteInputRef?.nativeElement?.select();
        } catch (e) {}
      }, 50);
    }

    try { this.onChange(this.timeString); } catch (e) {}
  }

  onMinuteInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '').slice(0, 2);
    this.minuteBuffer = raw;

    if (!raw.length) return;

    const num = parseInt(raw, 10);
    this.selectedMinute = Math.min(59, Math.max(0, num));

    try { this.onChange(this.timeString); } catch (e) {}
  }

  setAMPM(period: 'AM' | 'PM') {
    this.ampm = period;
    try { this.onChange(this.timeString); } catch (e) {}
  }

  selectTime(unit: number) {
    if (this.selecting === 'hour') {
      this.selectedHour = unit;
      this.hourBuffer = unit.toString().padStart(2, '0');
    } else {
      this.selectedMinute = unit;
      this.minuteBuffer = unit.toString().padStart(2, '0');
    }
    if (this.editingField === this.selecting) this.editingField = null;
    try { this.onChange(this.timeString); } catch (e) {}
  }

  getHandAngle(): number {
    if (this.selecting === 'hour') {
      return (360 / 12) * (this.selectedHour % 12);
    }
    return (360 / 60) * this.selectedMinute;
  }

  getHandX(): number {
    const angle = this.getHandAngle();
    return 100 + 60 * Math.sin((angle * Math.PI) / 180);
  }

  getHandY(): number {
    const angle = this.getHandAngle();
    return 100 - 60 * Math.cos((angle * Math.PI) / 180);
  }

  getTransform(index: number): string {
    const angle = (360 / 12) * index;
    const radius = 77;
    const radians = (angle * Math.PI) / 180;
    const x = radius * Math.sin(radians);
    const y = -radius * Math.cos(radians);
    return `translate(${x} ${y})`;
  }

  isSelected(index: number): boolean {
    if (this.selecting === 'hour') {
      return (index === 0 ? 12 : index) === this.selectedHour;
    }
    return (index * 5) === this.selectedMinute;
  }

  private getValueFromPointer(event: PointerEvent): number {
    const svg = this.clockSvgRef.nativeElement;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 200;
    const y = ((event.clientY - rect.top) / rect.height) * 200;
    const dx = x - 100;
    const dy = y - 100;

    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    if (this.selecting === 'hour') {
      let value = Math.round(angle / 30) % 12;
      if (value === 0) value = 12;
      return value;
    }
    return Math.round(angle / 6) % 60;
  }

  onClockPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.isDragging = true;
    this.tapStartPos = { x: event.clientX, y: event.clientY };
    // Capture on the SVG element itself — keeps pointermove firing even when
    // the pointer moves outside the SVG bounds (fixes counter-clockwise drag)
    try { this.clockSvgRef.nativeElement.setPointerCapture(event.pointerId); } catch (e) {}
    this.selectTime(this.getValueFromPointer(event));
  }

  onClockPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    this.selectTime(this.getValueFromPointer(event));
  }

  onClockPointerUp(event: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    try { this.clockSvgRef.nativeElement.releasePointerCapture(event.pointerId); } catch (e) {}

    // Auto-advance from hour → minute on a single tap (pointer barely moved)
    if (this.tapStartPos && this.selecting === 'hour') {
      const dx = event.clientX - this.tapStartPos.x;
      const dy = event.clientY - this.tapStartPos.y;
      if (Math.sqrt(dx * dx + dy * dy) < 8) {
        setTimeout(() => { this.selecting = 'minute'; }, 180);
      }
    }
    this.tapStartPos = null;
  }
}
