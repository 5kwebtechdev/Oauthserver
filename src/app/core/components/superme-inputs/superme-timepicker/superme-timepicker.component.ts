import {
  Component,
  forwardRef,
  HostListener,
  Input,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  FormControl,
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
  @ViewChild('hourInput') hourInputRef!: ElementRef;
  @ViewChild('minuteInput') minuteInputRef!: ElementRef;
  @ViewChild('clockSvg') clockSvgRef!: ElementRef<SVGSVGElement>;
  showPopup = false;
  selectedHour = 12;
  selectedMinute = 0;
  ampm: 'AM' | 'PM' = 'AM';
  selecting = 'hour'; // or 'minute'
  hasValue = false; // whether a time has been confirmed / written
  isDragging = false;
  // editing buffers to allow clearing the input for typing
  editingField: 'hour' | 'minute' | null = null;
  hourBuffer: string = '';
  minuteBuffer: string = '';

  onChange: any = () => { };
  onTouched: any = () => { };

  get timeString(): string {
    const h = this.selectedHour.toString().padStart(2, '0');
    const m = this.selectedMinute.toString().padStart(2, '0');
    return `${h}:${m} ${this.ampm}`;
  }

  writeValue(value: string): void {
    if (value) {
      const [time, period] = value.split(' ');
      const [hour, minute] = time.split(':').map(Number);
      this.selectedHour = hour;
      this.selectedMinute = minute;
      this.ampm = period as 'AM' | 'PM';
      this.hasValue = true;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  togglePopup() {
    this.showPopup = !this.showPopup;
  }

  startEdit(field: 'hour' | 'minute') {
    this.selecting = field;
    this.editingField = field;
    if (field === 'hour') this.hourBuffer = '';
    else this.minuteBuffer = '';
    // focus the input element after change detection
    setTimeout(() => {
      try {
        if (field === 'hour') this.hourInputRef?.nativeElement?.focus();
        else this.minuteInputRef?.nativeElement?.focus();
      } catch (e) { }
    });
  }

  selectTime(unit: number) {
    if (this.selecting === 'hour') {
      this.selectedHour = unit;
      this.hourBuffer = this.selectedHour.toString().padStart(2, '0');
    } else {
      this.selectedMinute = unit;
      this.minuteBuffer = this.selectedMinute.toString().padStart(2, '0');
    }
    // If user was in edit mode for this field, finalize the edit so the chosen
    // digit remains visible even if they click elsewhere without typing.
    if (this.editingField === this.selecting) {
      this.editingField = null;
    }
    // Notify parent form/model immediately when a value is chosen from the clock
    // so validations (like end-time-after-start) can run without requiring the
    // user to press OK.
    try { this.onChange(this.timeString); } catch (e) { }
  }

  finishEdit(field: 'hour' | 'minute') {
    // When the input loses focus, ensure the displayed value reflects the
    // currently selected time instead of an empty buffer.
    if (field === 'hour') {
      if (!this.hourBuffer) this.hourBuffer = this.selectedHour.toString().padStart(2, '0');
    } else {
      if (!this.minuteBuffer) this.minuteBuffer = this.selectedMinute.toString().padStart(2, '0');
    }
    this.editingField = null;
    // propagate final value to parent model as user finishes editing
    try { this.onChange(this.timeString); } catch (e) { }
  }

  onHourInput(event: any) {
    const raw = (event.target.value || '').replace(/[^0-9]/g, '').slice(0, 2);
    // update buffer so template shows the typed digits while editing
    this.hourBuffer = raw;
    event.target.value = raw.padStart(raw.length < 2 ? raw.length : 2, raw.length ? '' : '');
    if (raw.length === 0) return;
    const num = Number(raw);
    // clamp hours 1-12 (treat 0 as 12 when typed as '00')
    let val = num;
    if (raw === '00') val = 12;
    if (val < 1) val = 1;
    if (val > 12) val = 12;
    this.selectedHour = val;
    // if user typed two digits, auto-focus minutes
    if (raw.length === 2) {
      try {
        this.minuteInputRef.nativeElement.focus();
        this.editingField = 'minute';
        this.minuteBuffer = '';
      } catch (e) { }
    }
  }

  onMinuteInput(event: any) {
    const raw = (event.target.value || '').replace(/[^0-9]/g, '').slice(0, 2);
    // update buffer so template shows the typed digits while editing
    this.minuteBuffer = raw;
    event.target.value = raw.padStart(raw.length < 2 ? raw.length : 2, raw.length ? '' : '');
    if (raw.length === 0) return;
    const num = Number(raw);
    let val = num;
    if (val < 0) val = 0;
    if (val > 59) val = 59;
    this.selectedMinute = val;
  }

  setAMPM(period: 'AM' | 'PM') {
    this.ampm = period;
  }

  confirm() {
    if (this.selecting == 'hour') {
      this.selecting = 'minute';
      return;
    }
    this.onChange(this.timeString);
    this.hasValue = true;
    this.showPopup = false;
    console.log('confirm clicekd' + this.showPopup);
  }

  cancel() {
    this.showPopup = false;
  }

  getHandAngle(): number {
    const unit = this.selecting === 'hour' ? 12 : 60;
    const value = this.selecting === 'hour' ? (this.selectedHour % 12) : this.selectedMinute;
    return (360 / unit) * value;
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
    // Both hour and minute faces show 12 evenly-spaced marks
    // (hours: 1-12, minutes: 00, 05, 10 ... 55)
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


  @HostListener('document:click', ['$event.target'])
  public onClickOutside(targetElement: any) {
    // if (this.showPopup && !this.popupRef.nativeElement.contains(targetElement)) {
    //   this.showPopup = false;
    // }
  }

  /**
   * Translate a pointer position into the hour/minute value it corresponds
   * to on the clock face, based on the angle from the clock's center.
   */
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

  /**
   * Start dragging the clock hand. Also handles a simple tap/click
   * by immediately selecting the value under the pointer.
   */
  onClockPointerDown(event: PointerEvent): void {
    this.isDragging = true;
    const target = event.target as Element;
    try { target.setPointerCapture?.(event.pointerId); } catch (e) { }
    this.selectTime(this.getValueFromPointer(event));
    event.preventDefault();
  }

  /** Continuously update the selected value while dragging the clock hand. */
  onClockPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;
    this.selectTime(this.getValueFromPointer(event));
    event.preventDefault();
  }

  /** Stop dragging the clock hand. */
  onClockPointerUp(event: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    const target = event.target as Element;
    try { target.releasePointerCapture?.(event.pointerId); } catch (e) { }
  }

  clicked() {
    console.log('clicked');
    this.showPopup = true;
    console.log(this.showPopup);
  }
}
