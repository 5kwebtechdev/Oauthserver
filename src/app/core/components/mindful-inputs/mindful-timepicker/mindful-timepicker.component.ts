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
  selector: 'mindful-timepicker',
  templateUrl: './mindful-timepicker.component.html',
  styleUrls: ['./mindful-timepicker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MindfulTimepickerComponent),
      multi: true,
    },
  ],
  standalone: false,
})
export class MindfulTimepickerComponent implements ControlValueAccessor {
  @Input() disabled = false;
  @Input() placeholder: string = 'Time';

  @ViewChild('popup') popupRef!: ElementRef;
  @ViewChild('hourInput') hourInputRef!: ElementRef;
  @ViewChild('minuteInput') minuteInputRef!: ElementRef;
  showPopup = false;
  selectedHour = 12;
  selectedMinute = 0;
  ampm: 'AM' | 'PM' = 'AM';
  selecting = 'hour'; // or 'minute'
  hasValue = false; // whether a time has been confirmed / written

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

  selectTime(unit: number) {
    if (this.selecting === 'hour') this.selectedHour = unit;
    else this.selectedMinute = unit;
  }

  onHourInput(event: any) {
    const raw = (event.target.value || '').replace(/[^0-9]/g, '').slice(0, 2);
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
      } catch (e) { }
    }
  }

  onMinuteInput(event: any) {
    const raw = (event.target.value || '').replace(/[^0-9]/g, '').slice(0, 2);
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
    console.log(this.showPopup);
  }
}
