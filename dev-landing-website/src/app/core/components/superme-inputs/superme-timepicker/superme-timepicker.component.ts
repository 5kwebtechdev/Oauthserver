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
  standalone: true,
})
export class SupermeTimepickerComponent implements ControlValueAccessor {
  @Input() disabled = false;
  @Input() placeholder: string = 'Time';

  @ViewChild('popup') popupRef!: ElementRef;
  @ViewChild('inputRef') inputRef!: ElementRef;
  @ViewChild('hourInput') hourInputRef!: ElementRef;
  @ViewChild('minuteInput') minuteInputRef!: ElementRef;
  showPopup = false;
  selectedHour = 12;
  selectedMinute = 0;
  ampm: 'AM' | 'PM' = 'AM';
  selecting = 'hour'; // or 'minute'
  hasValue = false; // whether a time has been confirmed / written
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
    // If user was in edit mode for this field, finalize the edit
    if (this.editingField === this.selecting) {
      this.editingField = null;
    }
    // Notify parent form/model immediately when a value is chosen from the clock
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
    this.hourBuffer = raw;
    event.target.value = raw.padStart(raw.length < 2 ? raw.length : 2, raw.length ? '' : '');
    if (raw.length === 0) return;
    const num = Number(raw);
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
    const unit = this.selecting === 'hour' ? 12 : 60;
    const angle = (360 / unit) * index;
    return `rotate(${angle})`;
  }

  isSelected(index: number): boolean {
    if (this.selecting === 'hour') {
      return (index === 0 ? 12 : index) === this.selectedHour;
    }
    return index === this.selectedMinute;
  }


  @HostListener('document:click', ['$event.target'])
  public onClickOutside(targetElement: any) {
    // if (this.showPopup && !this.popupRef.nativeElement.contains(targetElement)) {
    //   this.showPopup = false;
    // }
  }

  clicked() {
    console.log('clicked');
    this.showPopup = true;
    // allow DOM to update, then position popup relative to the input
    setTimeout(() => this.positionPopup(), 0);
    console.log(this.showPopup);
  }

  positionPopup() {
    try {
      if (!this.popupRef || !this.inputRef) return;
      const popupEl = this.popupRef.nativeElement as HTMLElement;
      const inputEl = this.inputRef.nativeElement as HTMLElement;
      if (!popupEl || !inputEl) return;

      const rect = inputEl.getBoundingClientRect();
      // Position popup below the input using fixed positioning so it doesn't inherit parent overflow
      popupEl.style.position = 'fixed';
      // reset temporary values before measuring
      popupEl.style.left = '0px';
      popupEl.style.top = '0px';
      popupEl.style.minWidth = `${Math.max(180, rect.width)}px`;

      // measure and adjust to keep within viewport
      requestAnimationFrame(() => {
        try {
          const popupRect = popupEl.getBoundingClientRect();
          const pad = 8;
          const viewportW = window.innerWidth || document.documentElement.clientWidth;
          const viewportH = window.innerHeight || document.documentElement.clientHeight;

          let left = rect.left;
          let top = rect.bottom + 8; // default below input

          // If popup would overflow right edge, shift left
          if (left + popupRect.width + pad > viewportW) {
            left = Math.max(pad, viewportW - popupRect.width - pad);
          }

          // If popup would overflow bottom edge, place it above the input
          if (top + popupRect.height + pad > viewportH) {
            top = rect.top - popupRect.height - 8;
            // if still negative, clamp to pad
            if (top < pad) top = pad;
          }

          // clamp left to avoid negative
          if (left < pad) left = pad;

          popupEl.style.left = `${Math.round(left)}px`;
          popupEl.style.top = `${Math.round(top)}px`;
          popupEl.style.zIndex = '10020';
        } catch (e) {
          // fallback: place below input
          popupEl.style.top = `${rect.bottom + 8}px`;
          popupEl.style.left = `${rect.left}px`;
        }
      });
    } catch (e) {
      console.warn('Failed to position timepicker popup', e);
    }
  }
}
