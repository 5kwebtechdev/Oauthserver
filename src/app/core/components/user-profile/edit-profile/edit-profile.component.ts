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
  avatarImageName: string | null = '';  // New field for avatar image name (e.g., 'Avatar 8', 'Avatar 11')
  fullName: string | null = '';

  // gender selected in template. 'Male' | 'Female' | null (match backend format)
  gender: 'Male' | 'Female' | null = null;

  // Avatar selection
  avatarSelected: any = null;
  public avatars = [
    { key: 1, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female1.png', imageName: 'Avatar 1' },
    { key: 2, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female2.png', imageName: 'Avatar 2' },
    { key: 3, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female3.png', imageName: 'Avatar 3' },
    { key: 4, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female4.png', imageName: 'Avatar 4' },
    { key: 5, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female5.png', imageName: 'Avatar 5' },
    { key: 6, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female6.png', imageName: 'Avatar 6' },
    { key: 7, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png', imageName: 'Avatar 7' },
    { key: 8, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male2.png', imageName: 'Avatar 8' },
    { key: 9, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male3.png', imageName: 'Avatar 9' },
    { key: 10, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male4.png', imageName: 'Avatar 10' },
    { key: 11, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male5.png', imageName: 'Avatar 11' },
    { key: 12, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male6.png', imageName: 'Avatar 12' },
  ];

  // Birthday picker control
  openBirthdayPicker = false;
  // Account relationship: 'child' | 'parent' | 'self'
  accountType: 'child' | 'parent' | 'self' | null = null;

  // Age validation error (empty when valid)
  ageError: string = '';

  // Store current user data from backend
  currentUserData: any = null;

  // Track initial values to detect changes
  private initialValues: {
    fullName: string | null;
    gender: 'Male' | 'Female' | null;
    dob: string | null;
    phone: string | null;
    email: string | null;
    avatarSelected: any;
    selectedCountryCode: string;
  } | null = null;

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
      console.log('[EditProfile] Autofilling form with user data:', userProfile);

      // 1. Auto-fill Full Name
      this.fullName = userProfile.name || '';
      console.log('[EditProfile] Full Name set to:', this.fullName);

      // 2. Auto-fill Gender - normalize to 'Male' or 'Female'
      const storedGender = userProfile.gender ? String(userProfile.gender).toLowerCase() : '';
      this.gender = storedGender === 'male' ? 'Male' : storedGender === 'female' ? 'Female' : null;
      console.log('[EditProfile] Gender set to:', this.gender);

      // 3. Auto-fill Date of Birth
      if (userProfile.dob) {
        this.profileForm.patchValue({ dob: userProfile.dob });
        console.log('[EditProfile] DOB set to:', userProfile.dob);
      }

      // 4. Auto-fill Email
      if (userProfile.email) {
        this.profileForm.patchValue({ email: userProfile.email });
        console.log('[EditProfile] Email set to:', userProfile.email);
      }

      // 5. Auto-fill Phone with Country Code
      if (userProfile.phone) {
        const phoneWithCode = userProfile.phone;
        console.log('[EditProfile] Phone value from data:', phoneWithCode);

        // Try to find matching country code
        const matchingCountry = this.countries.find(c => phoneWithCode.startsWith(c.code));
        if (matchingCountry) {
          this.selectedCountry = matchingCountry;
          const phoneNumber = phoneWithCode.substring(matchingCountry.code.length);
          this.profileForm.patchValue({ phone: phoneNumber });
          console.log('[EditProfile] Phone number extracted:', phoneNumber, 'Country:', matchingCountry.name);
        } else {
          this.profileForm.patchValue({ phone: phoneWithCode });
          console.log('[EditProfile] No matching country code found, using raw phone:', phoneWithCode);
        }
      }

      // 6. Auto-fill Avatar Name (for non-parent accounts)
      if (userProfile.relationship?.toUpperCase() !== 'PARENT') {
        this.avatarName = userProfile.avatarName || '';
        // Try to auto-detect avatar image name from stored data if available
        if (userProfile.avatarName) {
          const match = userProfile.avatarName.match(/\d+/);
          if (match) {
            const numKey = parseInt(match[0], 10);
            const avatar = this.avatars.find(a => a.key === numKey);
            if (avatar) {
              this.avatarImageName = avatar.imageName;
              console.log('[EditProfile] Avatar Image Name set to:', this.avatarImageName);
            }
          }
        }
        console.log('[EditProfile] Avatar Name set to:', this.avatarName);
      }

      // Store current user data for reference
      this.currentUserData = userProfile;

      // 7. Auto-select Avatar based on stored avatar name
      if (userProfile.avatarName) {
        // Extract numeric key from avatar name (e.g., 'pare261551' or 'avatar5')
        const match = userProfile.avatarName.match(/\d+/);
        if (match) {
          const numKey = parseInt(match[0], 10);
          if (numKey > 0 && numKey <= this.avatars.length) {
            this.avatarSelected = numKey;
            console.log('[EditProfile] Avatar selected:', numKey);
          }
        }
      }

      // 8. Determine Account Type from stored relationship
      if (userProfile.relationship) {
        const rel = userProfile.relationship.toLowerCase();
        if (rel === 'child' || rel === 'parent' || rel === 'self') {
          this.accountType = rel as 'child' | 'parent' | 'self';
          console.log('[EditProfile] Account type set to:', this.accountType);
        }
      }

      // 9. Validate age based on account type
      if (userProfile.dob) {
        this.validateAge();
      }

      // 10. Store initial values for change detection
      this.storeInitialValues();

      console.log('[EditProfile] Profile autofill complete');
    } else {
      console.warn('[EditProfile] No user profile data found to autofill');
    }
  }

  /**
   * Store initial values for change detection
   */
  private storeInitialValues(): void {
    this.initialValues = {
      fullName: this.fullName,
      gender: this.gender,
      dob: this.profileForm.get('dob')?.value || null,
      phone: this.profileForm.get('phone')?.value || null,
      email: this.profileForm.get('email')?.value || null,
      avatarSelected: this.avatarSelected,
      selectedCountryCode: this.selectedCountry.code
    };
    console.log('[EditProfile] Initial values stored:', this.initialValues);
  }

  /**
   * Check if a field has been changed from its initial value
   */
  private hasFieldChanged(fieldName: string, currentValue: any): boolean {
    if (!this.initialValues) return true;

    const initialValue = (this.initialValues as any)[fieldName];
    return initialValue !== currentValue;
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

    // Build payload with only changed fields
    const payload: any = {};

    // Check each field for changes and only include if changed
    if (this.hasFieldChanged('fullName', this.fullName)) {
      payload.name = this.fullName!.trim();
    }

    if (this.hasFieldChanged('dob', this.profileForm.get('dob')?.value)) {
      payload.dateOfBirth = this.formatDateForBackend(this.profileForm.get('dob')!.value!);
    }

    if (this.hasFieldChanged('gender', this.gender)) {
      payload.gender = this.gender!;
    }

    if (this.hasFieldChanged('phone', phoneValue) || this.hasFieldChanged('selectedCountryCode', this.selectedCountry.code)) {
      payload.phone = `${this.selectedCountry.code}${phoneValue}`;
    }

    if (this.hasFieldChanged('email', this.profileForm.get('email')?.value)) {
      payload.email = this.profileForm.get('email')!.value!.trim();
    }

    // Check avatar changes
    if (this.hasFieldChanged('avatarSelected', this.avatarSelected)) {
      if (this.avatarSelected) {
        payload.avatarName = `avatar${this.avatarSelected}`;
        const selectedAvatarData = this.avatars.find(a => a.key === this.avatarSelected);
        if (selectedAvatarData) {
          payload.avatarImageName = selectedAvatarData.imageName;
        }
      } else if (this.avatarName?.trim() && this.avatarName.trim() !== this.currentUserData?.avatarName) {
        payload.avatarName = this.avatarName.trim();
        if (this.avatarImageName?.trim()) {
          payload.avatarImageName = this.avatarImageName.trim();
        }
      }
    }

    // If no changes detected, show message and return
    if (Object.keys(payload).length === 0) {
      this.coreService.triggerToasrt('No changes detected. Update a field to save.');
      return;
    }

    console.log('[EditProfile] Sending only changed fields:', payload);

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
            console.log('[EditProfile] Profile update response:', response);

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

              // Update avatar image name if available in response
              if (response.avatar?.avatarImageName) {
                this.avatarImageName = response.avatar.avatarImageName;
              }

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
      // Explicitly not including avatarName or avatarImageName
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
            console.log('[EditProfile] Profile update response:', response);

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

              // Update avatar image name if available
              if (response.avatar?.avatarImageName) {
                this.avatarImageName = response.avatar.avatarImageName;
              }
            }
          },
          error: (error) => {
            console.error('[EditProfile] Retry profile update error:', error);
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
    this.avatarImageName = avatar.imageName || `Avatar ${avatar.key}`;
    console.log('[EditProfile] Avatar selected:', {
      key: avatar.key,
      imageName: this.avatarImageName,
      path: avatar.value
    });
  }
}
