import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulInputComponent } from '../../mindful-inputs/mindful-input.component';
import { MindfulSelectorsComponent } from '../../mindful-selectors/mindful-selectors.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { CountriesService, Country } from '../../../services/countries.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'edit-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, MindfulNavigatorComponent, MindfulInputsModule, MindfulInputComponent, MindfulSelectorsComponent, MindfulButtonComponent],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent implements OnInit, OnDestroy {
  // whether the birthday picker should show its trigger (bound from template)
  openBirthdayPicker = false;

  // local storage for selected DOB if a form control isn't wired
  selectedDob: string | null = null;

  // Country and phone related
  showCountryCodeModal = false;
  selectedCountry!: Country;
  countries: Country[] = [];
  private subscription = new Subscription();

  // placeholder form group in case the template relies on reactive forms
  // (the template uses formControlName="dob"). If the parent actually
  // provides a FormGroup via FormGroupDirective, this local group won't be used.
  profileForm = new FormGroup({
    // explicitly type the control so setValue(string) is allowed under strict templates
    dob: new FormControl<string | null>(null),
    phone: new FormControl<string | null>(null),
    email: new FormControl<string | null>(null),
  });

  // called by the birthday picker when a date is selected
  birthdayChanged(date: string) {
    // The birthday picker emits an ISO string (toISOString()).
    // We want to store only the date portion (YYYY-MM-DD) in the form control
    // so no time is included.
    this.selectedDob = date;
    let isoDateOnly: string | null = null;
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        isoDateOnly = d.toISOString().slice(0, 10);
      }
    } catch (e) {
      isoDateOnly = null;
    }

    // update form control if present
    if (this.profileForm?.get('dob')) {
      this.profileForm.get('dob')!.setValue(isoDateOnly);
    }

    // Close the picker UI if it is open (match signup behavior)
    this.openBirthdayPicker = false;
  }

  // open the birthday picker (template calls this on click)
  openBirthdayPickerNow() {
    // If the flag is already true (picker was opened previously and then closed
    // internally), toggle it false then true so the child's ngOnChanges sees a
    // transition and calls open() again. A short timeout yields a new change
    // detection cycle.
    if (this.openBirthdayPicker) {
      this.openBirthdayPicker = false;
      setTimeout(() => this.openBirthdayPicker = true, 50);
    } else {
      this.openBirthdayPicker = true;
    }
  }

  // gender selected in template. 'male' | 'female' | null
  gender: 'male' | 'female' | null = null;

  constructor(private countriesService: CountriesService) {
    // initialize selected country with service default
    this.selectedCountry = this.countriesService.getDefaultCountry();
  }

  ngOnInit(): void {
    // load countries
    this.subscription.add(
      this.countriesService.getCountries().subscribe({
        next: (countries) => {
          this.countries = countries;
        },
        error: () => {
          this.countries = [this.countriesService.getDefaultCountry()];
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  saveProfile(): void {
    // placeholder save — replace with real save logic to persist profileForm
    if (this.profileForm.valid) {
      console.log('Saving profile', this.profileForm.value);
    } else {
      console.log('Profile form invalid', this.profileForm.value);
      this.profileForm.markAllAsTouched();
    }
  }

  closeCountryCodeModal(): void {
    this.showCountryCodeModal = false;
  }

  // Only allow numeric input
  onKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  // Handle phone input to ensure only numbers
  onPhoneInput(event: any): void {
    const input = event.target;
    const value = input.value;
    const numericValue = value.replace(/[^0-9]/g, '');

    this.profileForm.patchValue({ phone: numericValue });

    setTimeout(() => {
      try { input.setSelectionRange(numericValue.length, numericValue.length); } catch (e) {}
    }, 0);
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.showCountryCodeModal = false;
    const phoneControl = this.profileForm.get('phone');
    if (phoneControl) {
      phoneControl.markAsUntouched();
      phoneControl.updateValueAndValidity();
    }
  }

  // Phone helpers copied from login
  get currentPhoneLength(): number {
    return this.selectedCountry?.phoneLength || 0;
  }

  isPhoneValid(phoneValue: string | null | undefined): boolean {
    if (!phoneValue) return false;
    const cleanPhone = phoneValue.replace(/\D/g, '');
    return cleanPhone.length === this.currentPhoneLength;
  }

  getPhoneErrorMessage(): string {
    return `Please enter a valid ${this.currentPhoneLength} digit phone number for ${this.selectedCountry?.name}`;
  }
}

