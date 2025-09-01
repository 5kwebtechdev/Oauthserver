import { Component, OnInit, OnDestroy } from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import { CountriesService, Country } from "../../core/services/countries.service";
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false,
})
export class LoginComponent implements OnInit, OnDestroy {
  public signInForm: FormGroup;
  public loginMode: 'email' | 'phone' = 'email';
  public hidePassword = true;
  public whatsappConsent = true;

  public showCountryCodeModal = false;
  public selectedCountry: Country;
  public countries: Country[] = [];
  private subscription = new Subscription();


  constructor(private fb: FormBuilder, private countriesService: CountriesService) {
    // Initialize with default country
    this.selectedCountry = this.countriesService.getDefaultCountry();
    this.signInForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', []],
      phone: ['', []],
    });
  }

  get email() {
    return this.signInForm.get('email');
  }

  get phone(){
    return this.signInForm.get('phone');
  }
  get password(){
    return this.signInForm.get('password');
  }

  switchMode(mode: 'email' | 'phone') {
    this.loginMode = mode;
  }

  onSubmit() {
    if (this.signInForm.valid) {
      console.log(this.signInForm.value);
    }
  }

  ngOnInit(): void {
    console.log('LoginComponent initialized');
    
    // Load countries from service
    this.subscription.add(
      this.countriesService.getCountries().subscribe({
        next: (countries) => {
          this.countries = countries;
          console.log('Countries loaded:', countries.length);
        },
        error: (error) => {
          console.error('Error loading countries:', error);
          // Fallback to default country if loading fails
          this.countries = [this.countriesService.getDefaultCountry()];
        }
      })
    );
    
    // Debug: check if flag is properly loaded
    console.log('Selected country flag:', this.selectedCountry.flag);
    console.log('Selected country code:', this.selectedCountry.code);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  openCountryCodeModal(): void {
    if (this.loginMode === 'phone') {
      this.showCountryCodeModal = true;
    }
  }

  closeCountryCodeModal(): void {
    this.showCountryCodeModal = false;
  }

  // Get current phone number length requirement
  get currentPhoneLength(): number {
    return this.selectedCountry.phoneLength;
  }

  // Validate phone number based on selected country
  isPhoneValid(phoneValue: string): boolean {
    if (!phoneValue) return false;
    const cleanPhone = phoneValue.replace(/\D/g, ''); // Remove non-digits
    return cleanPhone.length === this.currentPhoneLength;
  }

  // Format phone validation error message
  getPhoneErrorMessage(): string {
    return `Please enter a valid ${this.currentPhoneLength} digit phone number for ${this.selectedCountry.name}`;
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.showCountryCodeModal = false;
    
    // Clear phone validation when country changes
    const phoneControl = this.signInForm.get('phone');
    if (phoneControl) {
      phoneControl.markAsUntouched();
      phoneControl.updateValueAndValidity();
    }
  }

  // Only allow numeric input
  onKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Only allow numbers (0-9)
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }

  // Handle phone input to ensure only numbers
  onPhoneInput(event: any): void {
    const input = event.target;
    const value = input.value;
    // Remove any non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // Update the form control with clean numeric value
    this.signInForm.patchValue({
      phone: numericValue
    });
    
    // Set cursor position to end
    setTimeout(() => {
      input.setSelectionRange(numericValue.length, numericValue.length);
    }, 0);
  }
}
