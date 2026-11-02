import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomSelectComponent } from './custom-select.component';
import { COUNTRIES, DEFAULT_PHONE_COUNTRY, isValidTutorPhone, PhoneCountry } from './phone-country';

export interface Step1Data {
  entityType: string;
  name: string;
  gender: string;
  phone: string;
  phoneCountry?: PhoneCountry;
  phone2?: string;
  phone3?: string;
  phone2Country?: PhoneCountry;
  phone3Country?: PhoneCountry;
  email: string;
  dateOfBirth: string; // yyyy-mm-dd, same format as before — nothing downstream changes
}

function isValidEmail(v: string): boolean {
  return v.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function isValidName(v: string): boolean {
  return v.trim().length >= 3;
}
function isValidDob(v: string): boolean {
  if (!v) return false;
  const dob = new Date(v);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(monthIdx: number, year: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

@Component({
  selector: 'app-tutor-step-one',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomSelectComponent],
  template: `
    <div class="flex flex-col gap-5 sm:gap-6">
      <!-- Row 1: Entity Type + Name + Gender -->
      <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
        <!-- Entity Type -->
        <div class="flex-1 w-full flex flex-col gap-2 sm:gap-3">
          <span class="text-[14px] sm:text-[16px] font-semibold text-[#282527] tracking-[0.8px] leading-[22.4px]" style="font-family:'Nunito',sans-serif">
            Entity Type *
          </span>
          <app-custom-select
            [options]="['Individual Tutor', 'Academy']"
            [value]="form.entityType"
            placeholder="Join as Tutor or Academy"
            (valueChange)="onEntityTypeChange($event)"
          ></app-custom-select>
        </div>

        <!-- Name -->
        <div class="flex-1 w-full flex flex-col gap-1.5">
          <div class="flex flex-col gap-2 sm:gap-3">
            <span class="text-[14px] sm:text-[16px] font-semibold text-[#282527] tracking-[0.8px] leading-[22.4px]" style="font-family:'Nunito',sans-serif">
              Name *
            </span>
            <input
              type="text"
              [(ngModel)]="form.name"
              placeholder="Full Name or Academy Name"
              (blur)="blur('name')"
              [ngClass]="nameError ? 'border-[#ce0800]' : 'border-[rgba(40,37,39,0.2)] focus:border-[#90214d]'"
              class="h-11 sm:h-12 w-full px-4 rounded-[6px] border text-[14px] sm:text-[16px] font-semibold text-[#282527] placeholder:text-[rgba(40,37,39,0.5)] placeholder:font-semibold outline-none transition-colors bg-white"
              style="font-family:'Nunito',sans-serif"
              name="name"
            />
          </div>
          <p *ngIf="nameError" class="text-[12px] sm:text-[13px] font-semibold text-[#ce0800] tracking-[0.65px]" style="font-family:'Nunito',sans-serif">
            {{ nameError }}
          </p>
        </div>

        <!-- Gender — hidden when entity is Academy -->
        <div *ngIf="!isAcademy" class="flex-1 w-full flex flex-col gap-2 sm:gap-3">
          <span class="text-[14px] sm:text-[16px] font-semibold text-[#282527] tracking-[0.8px] leading-[22.4px]" style="font-family:'Nunito',sans-serif">
            Gender
          </span>
          <app-custom-select
            [options]="['Male', 'Female']"
            [value]="form.gender"
            placeholder="Select gender"
            (valueChange)="form.gender = $event"
          ></app-custom-select>
        </div>
      </div>

      <!-- Row 2: Phone + Email -->
      <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
        <!-- Phone -->
        <div class="flex-1 w-full flex flex-col gap-1.5">
          <div class="flex flex-col gap-2 sm:gap-3">
            <span class="text-[14px] sm:text-[16px] font-semibold text-[#282527] tracking-[0.8px] leading-[22.4px]" style="font-family:'Nunito',sans-serif">
              Phone *
            </span>
            <div
              class="flex h-11 sm:h-12 w-full rounded-[6px] border overflow-hidden transition-colors"
              [ngClass]="phoneError ? 'border-[#bb2124]' : 'border-[rgba(40,37,39,0.2)] focus-within:border-[#90214d]'"
            >
              <select
                aria-label="Phone country and calling code"
                name="phoneCountry"
                [ngModel]="form.phoneCountry"
                (ngModelChange)="onPhoneCountryChange($event)"
                class="w-[120px] sm:w-[150px] min-w-0 px-2 bg-[#eaeaea] shrink-0 text-[14px] sm:text-[16px] font-semibold text-[#282527] outline-none"
                style="font-family:'Nunito',sans-serif"
              >
                <option *ngFor="let country of countries" [value]="country.code">
                  {{ country.name }} (+{{ country.callingCode }})
                </option>
              </select>
              <input
                type="tel"
                inputmode="numeric"
                maxlength="17"
                [ngModel]="form.phone"
                (ngModelChange)="onPhoneInput($event)"
                placeholder="Enter a valid mobile number"
                (blur)="blur('phone')"
                class="flex-1 min-w-0 w-full px-3 text-[14px] sm:text-[16px] font-semibold text-[#282527] placeholder:text-[rgba(40,37,39,0.5)] placeholder:font-semibold outline-none bg-white"
                style="font-family:'Nunito',sans-serif"
                name="phone"
              />
            </div>
          </div>
          <p *ngIf="phoneError; else phoneHint" class="text-[12px] sm:text-[13px] font-semibold text-[#bb2124]" style="font-family:'Nunito',sans-serif">
            {{ phoneError }}
          </p>
          <ng-template #phoneHint>
            <p class="text-[12px] sm:text-[13px] text-[#6b656a] leading-normal" style="font-family:'Nunito',sans-serif;font-weight:500">
              Please provide correct information for us to contact you
            </p>
          </ng-template>
        </div>

        <!-- Email -->
        <div class="flex-1 w-full flex flex-col gap-1.5">
          <div class="flex flex-col gap-2 sm:gap-3">
            <span class="text-[14px] sm:text-[16px] font-semibold text-[#282527] tracking-[0.8px] leading-[22.4px]" style="font-family:'Nunito',sans-serif">
              Email *
            </span>
            <input
              type="email"
              [(ngModel)]="form.email"
              placeholder="Enter Email"
              (blur)="blur('email')"
              [ngClass]="emailError ? 'border-[#bb2124]' : 'border-[rgba(40,37,39,0.2)] focus:border-[#90214d]'"
              class="h-11 sm:h-12 w-full px-4 rounded-[6px] border text-[14px] sm:text-[16px] font-semibold text-[#282527] placeholder:text-[rgba(40,37,39,0.5)] placeholder:font-semibold outline-none transition-colors bg-white"
              style="font-family:'Nunito',sans-serif"
              name="email" maxlength="254"
            />
          </div>
          <p *ngIf="emailError" class="text-[12px] sm:text-[13px] font-semibold text-[#bb2124]" style="font-family:'Nunito',sans-serif">
            {{ emailError }}
          </p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
        <div class="flex-1 w-full flex flex-col gap-1.5">
          <span class="text-[14px] sm:text-[16px] font-semibold text-[#282527]" style="font-family:'Nunito',sans-serif">Phone 2 (optional)</span>
          <div class="flex h-11 sm:h-12 w-full rounded-[6px] border overflow-hidden transition-colors"
            [ngClass]="additionalPhoneError(2) ? 'border-[#bb2124]' : 'border-[rgba(40,37,39,0.2)] focus-within:border-[#90214d]'">
            <select aria-label="Phone 2 country and calling code" name="phone2Country" [(ngModel)]="form.phone2Country"
              class="w-[120px] sm:w-[150px] min-w-0 px-2 bg-[#eaeaea] shrink-0 text-[14px] sm:text-[16px] outline-none" style="font-family:'Nunito',sans-serif">
              <option *ngFor="let country of countries" [value]="country.code">{{ country.name }} (+{{ country.callingCode }})</option>
            </select>
            <input type="tel" inputmode="numeric" maxlength="17" name="phone2" [ngModel]="form.phone2"
              (ngModelChange)="onAdditionalPhoneInput(2, $event)" placeholder="Enter additional phone number"
              class="flex-1 min-w-0 w-full px-3 text-[14px] sm:text-[16px] outline-none bg-white" style="font-family:'Nunito',sans-serif" />
          </div>
          <p *ngIf="form.phone2 && additionalPhoneError(2)" class="text-[12px] sm:text-[13px] font-semibold text-[#bb2124]">{{ additionalPhoneError(2) }}</p>
        </div>
        <div class="flex-1 w-full flex flex-col gap-1.5">
          <span class="text-[14px] sm:text-[16px] font-semibold text-[#282527]" style="font-family:'Nunito',sans-serif">Phone 3 (optional)</span>
          <div class="flex h-11 sm:h-12 w-full rounded-[6px] border overflow-hidden transition-colors"
            [ngClass]="additionalPhoneError(3) ? 'border-[#bb2124]' : 'border-[rgba(40,37,39,0.2)] focus-within:border-[#90214d]'">
            <select aria-label="Phone 3 country and calling code" name="phone3Country" [(ngModel)]="form.phone3Country"
              class="w-[120px] sm:w-[150px] min-w-0 px-2 bg-[#eaeaea] shrink-0 text-[14px] sm:text-[16px] outline-none" style="font-family:'Nunito',sans-serif">
              <option *ngFor="let country of countries" [value]="country.code">{{ country.name }} (+{{ country.callingCode }})</option>
            </select>
            <input type="tel" inputmode="numeric" maxlength="17" name="phone3" [ngModel]="form.phone3"
              (ngModelChange)="onAdditionalPhoneInput(3, $event)" placeholder="Enter additional phone number"
              class="flex-1 min-w-0 w-full px-3 text-[14px] sm:text-[16px] outline-none bg-white" style="font-family:'Nunito',sans-serif" />
          </div>
          <p *ngIf="form.phone3 && additionalPhoneError(3)" class="text-[12px] sm:text-[13px] font-semibold text-[#bb2124]">{{ additionalPhoneError(3) }}</p>
        </div>
      </div>

      <!-- Row 3: Date of Birth — three plain custom-select dropdowns, NOT a
           native <input type="date"> and NOT the shared onboarding
           superme-birthdaypicker component, so it can never inherit
           whatever global styling that component carries. Required for
           every submission, Academy included, so age is always guaranteed. -->
      <div class="flex flex-col gap-2 sm:gap-3">
        <span class="text-[14px] sm:text-[16px] font-semibold text-[#282527] tracking-[0.8px] leading-[22.4px]" style="font-family:'Nunito',sans-serif">
          Date of Birth *
        </span>
        <div class="flex gap-3 sm:gap-4">
          <div class="flex-1">
            <app-custom-select
              [options]="dayOptions"
              [value]="dobDay"
              [hasError]="!!dobError"
              placeholder="Day"
              (valueChange)="onDobPartChange('day', $event)"
            ></app-custom-select>
          </div>
          <div class="flex-[1.4]">
            <app-custom-select
              [options]="monthOptions"
              [value]="dobMonth"
              [hasError]="!!dobError"
              placeholder="Month"
              (valueChange)="onDobPartChange('month', $event)"
            ></app-custom-select>
          </div>
          <div class="flex-1">
            <app-custom-select
              [options]="yearOptions"
              [value]="dobYear"
              [hasError]="!!dobError"
              placeholder="Year"
              (valueChange)="onDobPartChange('year', $event)"
            ></app-custom-select>
          </div>
        </div>
        <p *ngIf="dobError" class="text-[12px] sm:text-[13px] font-semibold text-[#ce0800] tracking-[0.65px]" style="font-family:'Nunito',sans-serif">
          {{ dobError }}
        </p>
      </div>

      <!-- Next -->
      <div class="mt-2">
        <button
          type="button"
          (click)="handleNext()"
          [disabled]="!isValid"
          class="w-full py-3 rounded-[8px] text-[13px] font-bold text-[#fffeff] transition-opacity"
          [ngClass]="isValid ? 'opacity-100 hover:opacity-90' : 'opacity-50 cursor-not-allowed'"
          style="font-family:'Nunito',sans-serif;background:linear-gradient(-72.81deg, #90214d 0%, #cd3578 99.93%);border:1px solid #4a0d25;"
          [style.box-shadow]="isValid ? '0px 0px 0.5px rgba(144,33,77,0.2), inset 0px -2px 2px 0px #ea7cb5' : 'none'"
        >
          Next
        </button>
      </div>
    </div>
  `,
})
export class StepOneComponent implements OnChanges {
  @Input() initialData: Step1Data | null = null;
  @Output() next = new EventEmitter<Step1Data>();

  form: Step1Data = { entityType: '', name: '', gender: '', phone: '', phoneCountry: DEFAULT_PHONE_COUNTRY, phone2: '', phone3: '', phone2Country: DEFAULT_PHONE_COUNTRY, phone3Country: DEFAULT_PHONE_COUNTRY, email: '', dateOfBirth: '' };
  readonly countries = COUNTRIES;
  touched = { name: false, phone: false, email: false, dateOfBirth: false };

  dobDay = '';
  dobMonth = '';
  dobYear = '';

  readonly dayOptions = Array.from({ length: 31 }, (_, i) => String(i + 1));
  readonly monthOptions = MONTHS;
  readonly yearOptions = (() => {
    const currentYear = new Date().getFullYear();
    // 18+ requirement means the latest valid birth year is currentYear-18;
    // 100 years back covers any realistic applicant.
    const years: string[] = [];
    for (let y = currentYear - 18; y >= currentYear - 100; y--) years.push(String(y));
    return years;
  })();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && this.initialData) {
      this.form = { phone2: '', phone3: '', phone2Country: DEFAULT_PHONE_COUNTRY, phone3Country: DEFAULT_PHONE_COUNTRY, ...this.initialData, phoneCountry: this.initialData.phoneCountry ?? DEFAULT_PHONE_COUNTRY };
      if (this.form.dateOfBirth) {
        const [y, m, d] = this.form.dateOfBirth.split('-');
        this.dobYear = y ?? '';
        this.dobMonth = m ? MONTHS[parseInt(m, 10) - 1] : '';
        this.dobDay = d ? String(parseInt(d, 10)) : '';
      }
    }
  }

  get isAcademy(): boolean {
    return this.form.entityType === 'Academy';
  }

  get nameError(): string {
    if (this.touched.name && this.form.name.trim().length > 0 && !isValidName(this.form.name)) {
      return 'Minimum character limit is 3 characters';
    }
    if (this.touched.name && this.form.name.trim().length === 0) {
      return 'Name is required';
    }
    return '';
  }

  get phoneError(): string {
    return this.touched.phone && this.form.phone.length > 0 && !isValidTutorPhone(this.form.phone, this.form.phoneCountry) ? 'Invalid number' : '';
  }

  additionalPhoneError(index: 2 | 3): string {
    const value = index === 2 ? this.form.phone2 : this.form.phone3;
    const country = index === 2 ? this.form.phone2Country : this.form.phone3Country;
    return !value || isValidTutorPhone(value, country) ? '' : 'Enter a valid number for the selected country';
  }

  onAdditionalPhoneInput(index: 2 | 3, value: string): void {
    this.form[index === 2 ? 'phone2' : 'phone3'] = value.replace(/\D/g, '').slice(0, 17);
  }

  get emailError(): string {
    if (!this.touched.email) return '';
    if (!this.form.email.trim()) return 'Email is required for your submission acknowledgement';
    return isValidEmail(this.form.email) ? '' : 'Invalid email';
  }

  get dobError(): string {
    if (!this.touched.dateOfBirth) return '';
    if (!this.dobDay || !this.dobMonth || !this.dobYear) return 'Please select your full date of birth';
    return isValidDob(this.form.dateOfBirth) ? '' : 'You must be at least 18 years old';
  }

  get isValid(): boolean {
    return (
      this.form.entityType !== '' &&
      isValidName(this.form.name) &&
      isValidTutorPhone(this.form.phone, this.form.phoneCountry) &&
      !this.additionalPhoneError(2) && !this.additionalPhoneError(3) &&
      isValidEmail(this.form.email) &&
      isValidDob(this.form.dateOfBirth)
    );
  }

  onEntityTypeChange(v: string): void {
    this.form.entityType = v;
    if (v === 'Academy') this.form.gender = '';
  }

  onPhoneCountryChange(country: PhoneCountry): void {
    this.form.phoneCountry = country;
    this.touched.phone = this.form.phone.length > 0;
  }

  onPhoneInput(value: string): void {
    this.form.phone = value.replace(/\D/g, '').slice(0, 17);
  }

  onDobPartChange(part: 'day' | 'month' | 'year', value: string): void {
    if (part === 'day') this.dobDay = value;
    if (part === 'month') this.dobMonth = value;
    if (part === 'year') this.dobYear = value;
    this.rebuildDob();
  }

  private rebuildDob(): void {
    if (!this.dobDay || !this.dobMonth || !this.dobYear) {
      this.form.dateOfBirth = '';
      return;
    }
    const monthIdx = MONTHS.indexOf(this.dobMonth);
    const year = parseInt(this.dobYear, 10);
    let day = parseInt(this.dobDay, 10);
    // clamp day if it exceeds the selected month's real length (e.g. Feb 30)
    const maxDay = daysInMonth(monthIdx, year);
    if (day > maxDay) day = maxDay;
    const mm = String(monthIdx + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    this.form.dateOfBirth = `${year}-${mm}-${dd}`;
  }

  blur(field: keyof typeof this.touched): void {
    this.touched[field] = true;
  }

  handleNext(): void {
    this.touched = { name: true, phone: true, email: true, dateOfBirth: true };
    if (this.isValid) this.next.emit(this.form);
  }
}