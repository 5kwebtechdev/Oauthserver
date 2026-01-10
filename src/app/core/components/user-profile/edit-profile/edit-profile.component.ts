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

  // Avatar selection
  avatarSelected: any = null;
  public avatars = [
    { key: 1, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female1.png' },
    { key: 2, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female2.png' },
    { key: 3, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female3.png' },
    { key: 4, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female4.png' },
    { key: 5, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female5.png' },
    { key: 6, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female6.png' },
    { key: 7, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png' },
    { key: 8, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male2.png' },
    { key: 9, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male3.png' },
    { key: 10, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male4.png' },
    { key: 11, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male5.png' },
    { key: 12, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male6.png' },
  ];

  // Birthday picker control
  openBirthdayPicker = false;
  // Account relationship: 'child' | 'parent' | 'self'
  accountType: 'child' | 'parent' | 'self' | null = null;

  // Age validation error (empty when valid)
  ageError: string = '';

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
    // First try to get from UserService (user_profile in localStorage)
    let userProfile = this.userService.getUserProfile();

    // If not available, try to read from user_data (set during login)
    if (!userProfile) {
      try {
        const userData = localStorage.getItem('user_data');
        if (userData) {
          const parsedData = JSON.parse(userData);
          console.log('[EditProfile] Loaded user_data from login:', parsedData);
          // Map login response structure to UserProfile
          userProfile = {
            userId: parsedData.id,
            name: parsedData.name,
            email: parsedData.email,
            phone: parsedData.phone,
            dob: parsedData.dateOfBirth,
            gender: parsedData.gender?.toLowerCase() as 'male' | 'female',
            avatarUrl: parsedData.avatar?.url,
            avatarName: parsedData.avatar?.avatarName,
            relationship: parsedData.relationship as 'CHILD' | 'PARENT' | 'SELF'
          };
        }
      } catch (e) {
        console.error('[EditProfile] Error loading user_data:', e);
      }
    }

    if (userProfile) {
      // Populate form with existing data
      this.fullName = userProfile.name || '';
      // Normalize stored gender values and pre-select on edit
      const storedGender = userProfile.gender ? String(userProfile.gender).toLowerCase() : '';
      this.gender = storedGender === 'male' ? 'Male' : storedGender === 'female' ? 'Female' : null;

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

      // Set initial avatar selection if avatar name matches one of the available avatars
      if (userProfile.avatarName) {
        const avatarKey = userProfile.avatarName.replace('avatar', '');
        const numKey = parseInt(avatarKey, 10);
        if (!isNaN(numKey) && numKey > 0) {
          this.avatarSelected = numKey;
        }
      }

      // Determine accountType from stored relationship (CHILD/PARENT/SELF from API)
      if (userProfile.relationship) {
        const rel = userProfile.relationship.toLowerCase();
        if (rel === 'child' || rel === 'parent' || rel === 'self') {
          this.accountType = rel as 'child' | 'parent' | 'self';
          console.log('[EditProfile] Account type set to:', this.accountType);
        }
      }

      // Validate age on load if DOB exists
      if (userProfile.dob) {
        this.validateAge();
      }
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

    // Include selected avatar if user has chosen one
    if (this.avatarSelected) {
      payload.avatarName = `avatar${this.avatarSelected}`;
    } else if (this.avatarName?.trim() && this.avatarName.trim() !== this.currentUserData?.avatarName) {
      // Fallback to avatarName if it's different from current
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

    // Validate age constraints based on account type
    this.validateAge();
  }

  /**
   * Calculate age in years from selected date of birth
   */
  get calculatedAge(): string {
    const dobValue = this.profileForm.get('dob')?.value;
    if (!dobValue) {
      return '';
    }

    const birthDate = new Date(dobValue);
    if (isNaN(birthDate.getTime())) {
      return '';
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 0 ? `${age} year${age !== 1 ? 's' : ''} old` : '';
  }

  /**
   * Validate age limits depending on selected account type
   */
  validateAge(): void {
    this.ageError = '';
    const dobValue = this.profileForm.get('dob')?.value;
    if (!dobValue) return;

    const birthDate = new Date(dobValue);
    if (isNaN(birthDate.getTime())) return;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (this.accountType === 'child') {
      if (age > 18) {
        this.ageError = 'Your age cannot be more than 18 years old for child role';
      }
    } else if (this.accountType === 'parent') {
      if (age < 24) {
        this.ageError = 'Your age cannot be less than 24 years old for parent role';
      }
    }
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

  /**
   * Get filtered avatars for the selected gender
   */
  get avatarsFiltered(): any[] {
    // Prefer the currently selected gender in the form. If that's empty,
    // fallback to the loaded user data gender so avatars appear on edit.
    let selectedGender = this.gender;
    if (!selectedGender && this.currentUserData && this.currentUserData.gender) {
      const g = String(this.currentUserData.gender).toLowerCase();
      if (g === 'male') selectedGender = 'Male';
      if (g === 'female') selectedGender = 'Female';
    }

    if (!selectedGender) return [];
    return this.avatars.filter(a => a.gender === selectedGender);
  }

  /**
   * Select an avatar and update the profile
   */
  selectAvatar(avatar: any): void {
    if (!avatar) return;
    this.avatarSelected = avatar.key;
    // Log the selection
    console.log('[EditProfile] Avatar selected:', avatar.key, avatar.value);
  }
}
