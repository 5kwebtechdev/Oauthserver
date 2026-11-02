import { COUNTRIES, DEFAULT_PHONE_COUNTRY, isValidListingPhone } from './phone-country';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ListingConfig } from './listing-config';
import {
  ListingBasicData,
  defaultBasic,
  isCounselorType,
  isEventType,
  isPgHostelType,
  isShopType,
} from './listing-shared';

@Component({
  selector: 'app-listing-step-one',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './step-one.component.html',
})
export class ListingStepOneComponent implements OnChanges {
  @Input({ required: true }) config!: ListingConfig;
  @Input() initialData: ListingBasicData | null = null;

  @Output() next = new EventEmitter<ListingBasicData>();

  form: ListingBasicData = defaultBasic();
  submitted = false;
  phoneTouched = false;
  readonly countries = COUNTRIES;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && this.initialData) {
      this.form = { ...defaultBasic(), ...this.initialData, phoneCountry: this.initialData.phoneCountry ?? DEFAULT_PHONE_COUNTRY };
    }
  }

  get isEvent(): boolean {
    return isEventType(this.config.type);
  }

  get isCounselor(): boolean {
    return isCounselorType(this.config.type);
  }

  get isShop(): boolean {
    return isShopType(this.config.type);
  }

  get isPgHostel(): boolean {
    return isPgHostelType(this.config.type);
  }

  get primaryLabel(): string {
    if (this.isEvent) {
      return `${this.config.type === 'event' ? 'Event' : 'Workshop'} Title`;
    }
    if (this.isCounselor) return 'Full Name';
    if (this.isPgHostel) return 'Listing Name';
    return 'Business / Listing Name';
  }

  get primaryValue(): string {
    return this.isEvent ? this.form.title : this.form.name;
  }

  set primaryValue(value: string) {
    if (this.isEvent) this.form.title = value;
    else this.form.name = value;
  }

  get isValid(): boolean {
    const primary = this.primaryValue?.trim();

    return Boolean(primary) && !this.phoneError && !this.additionalPhoneError(2) && !this.additionalPhoneError(3) && !this.emailError;
  }

  get phoneError(): string {
    if (!this.form.phone) return this.isPgHostel ? '' : 'Phone number is required';
    return isValidListingPhone(this.form.phone, this.form.phoneCountry)
      ? '' : 'Enter a valid phone number for the selected country';
  }

  get emailError(): string {
    const email = this.form.email.trim();
    if (!email) return 'Email is required for your submission acknowledgement';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? '' : 'Enter a valid email address';
  }

  additionalPhoneError(index: 2 | 3): string {
    const value = index === 2 ? this.form.phone2 : this.form.phone3;
    const country = index === 2 ? this.form.phone2Country : this.form.phone3Country;
    return !value || isValidListingPhone(value, country) ? '' : 'Enter a valid phone number for the selected country';
  }

  onAdditionalPhoneInput(index: 2 | 3, value: string): void {
    this.form[index === 2 ? 'phone2' : 'phone3'] = value.replace(/\D/g, '').slice(0, 17);
  }

  onPhoneInput(value: string): void {
    this.form.phone = value.replace(/\D/g, '').slice(0, 17);
  }

  handleNext(): void {
    this.submitted = true;
    if (!this.isValid) return;
    this.next.emit({ ...this.form });
  }
}
