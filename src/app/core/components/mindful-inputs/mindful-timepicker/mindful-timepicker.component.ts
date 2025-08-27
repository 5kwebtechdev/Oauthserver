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

  @ViewChild('popup') popupRef!: ElementRef;
  showPopup = false;
  selectedHour = 12;
  selectedMinute = 0;
  ampm: 'AM' | 'PM' = 'AM';
  selecting = 'hour'; // or 'minute'

  onChange: any = () => {};
  onTouched: any = () => {};

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

  setAMPM(period: 'AM' | 'PM') {
    this.ampm = period;
  }

  confirm() {
    if(this.selecting == 'hour'){
      this.selecting = 'minute';
      return;
    }
    this.onChange(this.timeString);
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
