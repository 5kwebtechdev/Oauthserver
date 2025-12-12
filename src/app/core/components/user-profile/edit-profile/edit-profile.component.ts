import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { CountriesService, Country } from '../../../services/countries.service';
import { Subscription } from 'rxjs';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { AuthService, EditProfilePayload } from '../../../../../package/api/auth.service';
import { CoreService } from '../../../services/core.service';
import { UserService } from '../../../services/user.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'edit-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, MindfulNavigatorComponent, MindfulInputsModule, MindfulButtonComponent, ProfileEditInputComponent],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent implements OnInit, OnDestroy {
  // Country and phone related
  showCountryCodeModal = false;
  selectedCountry!: Country;
  countries: Country[] = [];
  private subscription = new Subscription();

  // Loading state
  isSubmitting = false;

  // Form with proper validators
  profileForm = new FormGroup({
    dob: new FormControl<string | null>(null, [Validators.required]),
    phone: new FormControl<string | null>(null, [Validators.required]),
    email: new FormControl<string | null>(null, [Validators.required, Validators.email]),
  });

  avatarName: string | null = '';
  fullName: string | null = '';

  // gender selected in template. 'Male' | 'Female' | null (match backend format)
  gender: 'Male' | 'Female' | null = null;

  // Birthday picker control
  openBirthdayPicker = false;

  // Store current user data from backend
  currentUserData: any = null;

  constructor(
    private countriesService: CountriesService,
    private authService: AuthService,
    private coreService: CoreService,
    private userService: UserService
  ) {
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

    // Load current user profile data
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    const userProfile = this.userService.getUserProfile();

    if (userProfile) {
      // Populate form with existing data
      this.fullName = userProfile.name || '';
      this.gender = userProfile.gender === 'male' ? 'Male' : userProfile.gender === 'female' ? 'Female' : null;

      if (userProfile.dob) {
        this.profileForm.patchValue({ dob: userProfile.dob });
      }

      if (userProfile.email) {
        this.profileForm.patchValue({ email: userProfile.email });
      }

      if (userProfile.phone) {
        // Extract phone number without country code
        const phoneWithCode = userProfile.phone;
        // Try to find matching country code
        const matchingCountry = this.countries.find(c => phoneWithCode.startsWith(c.code));
        if (matchingCountry) {
          this.selectedCountry = matchingCountry;
          const phoneNumber = phoneWithCode.substring(matchingCountry.code.length);
          this.profileForm.patchValue({ phone: phoneNumber });
        } else {
          this.profileForm.patchValue({ phone: phoneWithCode });
        }
      }

      // Store avatar info - avatarName should come from backend avatar object
      this.avatarName = userProfile.avatarName || '';
      this.currentUserData = userProfile;
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  saveProfile(): void {
    // Validate required fields (avatarName is optional now)
    if (!this.fullName?.trim()) {
      this.coreService.triggerToasrt('Please enter your full name');
      return;
    }

    if (!this.profileForm.get('dob')?.value) {
      this.coreService.triggerToasrt('Please enter your date of birth');
      return;
    }

    if (!this.gender) {
      this.coreService.triggerToasrt('Please select your gender');
      return;
    }

    const phoneValue = this.profileForm.get('phone')?.value;
    if (!this.isPhoneValid(phoneValue)) {
      this.coreService.triggerToasrt(this.getPhoneErrorMessage());
      this.profileForm.get('phone')?.markAsDirty();
      return;
    }

    if (!this.profileForm.get('email')?.valid) {
      this.coreService.triggerToasrt('Please enter a valid email address');
      this.profileForm.get('email')?.markAsDirty();
      return;
    }

    // Transform data to match backend format
    const payload: EditProfilePayload = {
      name: this.fullName!.trim(),
      dateOfBirth: this.formatDateForBackend(this.profileForm.get('dob')!.value!),
      gender: this.gender!,
      phone: `${this.selectedCountry.code}${phoneValue}`,
      email: this.profileForm.get('email')!.value!.trim()
    };

    // Only include avatarName if user has provided one and it's different from current
    // Note: avatarName should be a reference to backend avatar (e.g., 'avatar1'), not free text
    if (this.avatarName?.trim() && this.avatarName.trim() !== this.currentUserData?.avatarName) {
      payload.avatarName = this.avatarName.trim();
    }

    // Submit to backend
    this.isSubmitting = true;
    this.subscription.add(
      this.authService.editProfile(payload)
        .pipe(
          finalize(() => {
            this.isSubmitting = false;
          })
        )
        .subscribe({
          next: (response) => {
            this.coreService.triggerToasrt('Profile updated successfully!');
            console.log('Profile update response:', response);

            // Update local user profile with response data
            if (response) {
              this.userService.updateUserProfile({
                name: response.name,
                email: response.email,
                phone: response.phone,
                gender: response.gender?.toLowerCase() as 'male' | 'female',
                dob: response.dateOfBirth,
                avatarUrl: response.avatar?.url,
                avatarName: response.avatar?.avatarName
              });
              this.currentUserData = response;
            }
          },
          error: (error) => {
            console.error('Profile update error:', error);

            // Handle specific error cases
            let errorMessage = 'Failed to update profile. Please try again.';

            if (error?.status === 404 && error?.error?.message?.includes('Avatar')) {
              errorMessage = 'Avatar not found. Profile updated without avatar changes.';
              // Retry without avatar if the error is about avatar
              this.retryProfileUpdateWithoutAvatar();
              return;
            } else if (error?.error?.message) {
              errorMessage = error.error.message;
            } else if (error?.message) {
              errorMessage = error.message;
            }

            this.coreService.triggerToasrt(errorMessage);
          }
        })
    );
  }

  /**
   * Format date to YYYY-MM-DD for backend
   */
  private formatDateForBackend(dateString: string): string {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    // Try to parse and format the date
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return dateString; // Return original if parsing fails
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
      try { input.setSelectionRange(numericValue.length, numericValue.length); } catch (e) { }
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

  openBirthdayPickerNow(): void {
    this.openBirthdayPicker = true;
  }

  birthdayChanged(date: any): void {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return;
    }

    // Update form control with YYYY-MM-DD format
    this.profileForm.patchValue({
      dob: parsedDate.toISOString().slice(0, 10)
    });

    // Close the picker after choosing a date
    this.openBirthdayPicker = false;
  }

  /**
   * Retry profile update without avatar if avatar 404 error occurs
   */
  private retryProfileUpdateWithoutAvatar(): void {
    const phoneValue = this.profileForm.get('phone')?.value;

    const payload: EditProfilePayload = {
      name: this.fullName!.trim(),
      dateOfBirth: this.formatDateForBackend(this.profileForm.get('dob')!.value!),
      gender: this.gender!,
      phone: `${this.selectedCountry.code}${phoneValue}`,
      email: this.profileForm.get('email')!.value!.trim()
      // Explicitly not including avatarName
    };

    this.isSubmitting = true;
    this.subscription.add(
      this.authService.editProfile(payload)
        .pipe(
          finalize(() => {
            this.isSubmitting = false;
          })
        )
        .subscribe({
          next: (response) => {
            this.coreService.triggerToasrt('Profile updated successfully (avatar unchanged)!');
            console.log('Profile update response:', response);

            // Update local user profile
            if (response) {
              this.userService.updateUserProfile({
                name: response.name,
                email: response.email,
                phone: response.phone,
                gender: response.gender?.toLowerCase() as 'male' | 'female',
                dob: response.dateOfBirth,
                avatarUrl: response.avatar?.url,
                avatarName: response.avatar?.avatarName
              });
            }
          },
          error: (error) => {
            console.error('Retry profile update error:', error);
            const errorMessage = error?.error?.message || error?.message || 'Failed to update profile.';
            this.coreService.triggerToasrt(errorMessage);
          }
        })
    );
  }
}

