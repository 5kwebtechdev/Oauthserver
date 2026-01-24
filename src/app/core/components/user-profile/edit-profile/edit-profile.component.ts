import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { CountriesService, Country } from '../../../services/countries.service';
import { Subscription, Subject, of } from 'rxjs';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { AuthService as PackageAuthService, EditProfilePayload } from '../../../../../package/api/auth.service';
import { AuthService as CoreAuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';
import { UserService } from '../../../services/user.service';
import { finalize, debounceTime, distinctUntilChanged, switchMap, filter, catchError } from 'rxjs/operators';

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
    // Phone is optional now — user can update profile without providing phone
    phone: new FormControl<string | null>(null, []),
    email: new FormControl<string | null>(null, [Validators.required, Validators.email]),
  });

  avatarName: string | null = '';
  avatarImageName: string | null = '';  // New field for avatar image name (e.g., 'Avatar 8', 'Avatar 11')
  fullName: string | null = '';
  // Inline full name validation state
  fullNameError: string | null = null;
  showFullNameError = false;

  // Avatar suggestions
  private avatarInput$ = new Subject<string>();
  avatarSuggestions: string[] = [];
  showAvatarSuggestions = false;
  avatarSuggestionError: string | null = null;
  // Inline avatar name validation state
  avatarNameError: string | null = null;
  showAvatarNameError = false;

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
    avatarName: string | null;
    selectedCountryCode: string;
  } | null = null;

  constructor(
    private countriesService: CountriesService,
    private authService: PackageAuthService,
    private coreAuthService: CoreAuthService,
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

    // Subscribe to user data changes from CoreAuthService (primary source of truth)
    this.subscription.add(
      this.coreAuthService.userData$.subscribe(userData => {
        if (userData) {
          console.log('[EditProfile] Received user data from CoreAuthService:', userData);
          this.prefillFormFromUserData(userData);
        }
      })
    );

    // Load current user profile data (fallback for initial load)
    this.loadUserProfile();

    // Avatar suggestions stream: debounce and call API when at least 4 chars
    this.subscription.add(
      this.avatarInput$.pipe(
        // Wait 3 seconds after the user stops typing before calling the API
        debounceTime(3000),
        distinctUntilChanged(),
        filter(s => (s || '').trim().length >= 4),
        switchMap(s => this.authService.getAvatarSuggestions((s || '').trim()).pipe(
          catchError(() => of([]))
        ))
      ).subscribe((list: string[] | any) => {
        this.avatarSuggestions = Array.isArray(list) ? list : [];
        this.showAvatarSuggestions = this.avatarSuggestions.length > 0;
      })
    );
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
          // Use the helper method to prefill form
          this.prefillFormFromUserData(parsedData);
          return;
        }
      } catch (e) {
        console.error('[EditProfile] Error loading user_data:', e);
      }
    }

    if (userProfile) {
      console.log('[EditProfile] Loading from UserService:', userProfile);
      // Map UserService profile to user_data format and prefill
      const mappedData = {
        id: userProfile.userId,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        dateOfBirth: userProfile.dob,
        gender: userProfile.gender,
        relationship: userProfile.relationship,
        avatar: {
          url: userProfile.avatarUrl,
          avatarName: userProfile.avatarName
        }
      };
      this.prefillFormFromUserData(mappedData);
    } else {
      console.warn('[EditProfile] No user profile data found to autofill');
    }
  }

  /**
   * Prefill form from user data object (from CoreAuthService or localStorage)
   */
  private prefillFormFromUserData(userData: any): void {
    if (!userData) return;

    console.log('[EditProfile] Prefilling form with user data:', userData);

    // 1. Auto-fill Full Name
    if (userData.name) {
      this.fullName = userData.name;
      console.log('[EditProfile] Full Name set to:', this.fullName);
    }

    // 2. Auto-fill Gender - normalize to 'Male' or 'Female'
    if (userData.gender) {
      const genderStr = String(userData.gender).toLowerCase();
      this.gender = genderStr === 'male' ? 'Male' : genderStr === 'female' ? 'Female' : null;
      console.log('[EditProfile] Gender set to:', this.gender, 'from:', userData.gender);
    }

    // 3. Auto-fill Date of Birth
    if (userData.dateOfBirth || userData.dob) {
      const dobValue = userData.dateOfBirth || userData.dob;
      this.profileForm.patchValue({ dob: dobValue });
      console.log('[EditProfile] DOB set to:', dobValue);
    }

    // 4. Auto-fill Email
    if (userData.email) {
      this.profileForm.patchValue({ email: userData.email });
      console.log('[EditProfile] Email set to:', userData.email);
    }

    // 5. Auto-fill Phone — strip any country code so the input only shows the local number
    if (userData.phone) {
      const phoneWithCode = userData.phone;
      console.log('[EditProfile] Phone value from data:', phoneWithCode);

      // Try to detect a matching country and set it, but always show only the local number
      const matchingCountry = this.countries.find(c => phoneWithCode.startsWith(c.code));
      if (matchingCountry) {
        this.selectedCountry = matchingCountry;
      }

      const localNumber = this.normalizePhoneForInput(phoneWithCode);
      this.profileForm.patchValue({ phone: localNumber });
      console.log('[EditProfile] Phone number (local) set to:', localNumber, 'Country:', this.selectedCountry?.name);
    }

    // 6. Determine Account Type from stored relationship
    const relationship = userData.relationship || userData.relationshipType;
    if (relationship) {
      const rel = String(relationship).toLowerCase();
      if (rel === 'child' || rel === 'parent' || rel === 'self') {
        this.accountType = rel as 'child' | 'parent' | 'self';
        console.log('[EditProfile] Account type set to:', this.accountType);
      }
    }

    // 7. Auto-fill Avatar for non-parent accounts
    if (this.accountType !== 'parent') {
      // Get avatar info from nested avatar object or top-level properties
      const avatarInfo = userData.avatar || {};
      const avatarName = avatarInfo.avatarName || userData.avatarName;
      const avatarImageName = avatarInfo.avatarImageName || userData.avatarImageName;

      if (avatarName) {
        this.avatarName = avatarName;
        console.log('[EditProfile] Avatar Name set to:', this.avatarName);

        // Extract numeric key from avatar name (e.g., 'pare261551' or 'avatar5')
        const match = avatarName.match(/\d+/);
        if (match) {
          const numKey = parseInt(match[0], 10);
          if (numKey > 0 && numKey <= this.avatars.length) {
            this.avatarSelected = numKey;
            console.log('[EditProfile] Avatar selected (key):', numKey);

            // Set avatar image name from avatars array
            const avatar = this.avatars.find(a => a.key === numKey);
            if (avatar) {
              this.avatarImageName = avatar.imageName;
              console.log('[EditProfile] Avatar Image Name set to:', this.avatarImageName);
            }
          }
        }
      }

      // Override with explicit avatarImageName if provided
      if (avatarImageName) {
        this.avatarImageName = avatarImageName;
        console.log('[EditProfile] Avatar Image Name overridden to:', this.avatarImageName);

        // Try to find and select the matching avatar by imageName
        const avatar = this.avatars.find(a => a.imageName === avatarImageName);
        if (avatar) {
          this.avatarSelected = avatar.key;
          console.log('[EditProfile] Avatar selected by imageName:', avatar.key);
        }
      }
    }

    // 8. Store current user data for reference
    this.currentUserData = userData;

    // 9. Validate age based on account type
    if (userData.dateOfBirth || userData.dob) {
      this.validateAge();
    }

    // 10. Store initial values for change detection
    this.storeInitialValues();

    console.log('[EditProfile] Profile autofill complete');
  }

  /**
   * Update UserService immediately when API call is made to notify subscribers
   */
  private updateUserServiceImmediately(payload: any): void {
    // Get current user profile
    const currentProfile = this.userService.getUserProfile();

    // Create updated profile by merging current profile with new values
    const updatedProfile: any = {};

    // Copy all existing profile properties
    if (currentProfile) {
      Object.assign(updatedProfile, currentProfile);
    }

    // Update with new values from payload
    if (payload.name !== undefined) updatedProfile.name = payload.name;
    if (payload.email !== undefined) updatedProfile.email = payload.email;
    if (payload.phone !== undefined) updatedProfile.phone = payload.phone;
    if (payload.dateOfBirth !== undefined) updatedProfile.dob = payload.dateOfBirth;
    if (payload.gender !== undefined) updatedProfile.gender = payload.gender.toLowerCase() === 'male' ? 'male' : 'female';
    if (payload.avatarName !== undefined) {
      updatedProfile.avatarName = payload.avatarName;
      // Update avatar URL if avatarImageName is provided
      if (payload.avatarImageName) {
        updatedProfile.avatarUrl = this.deriveAvatarUrlFromImageName(payload.avatarImageName);
      } else {
        // Otherwise try to derive from avatarName
        updatedProfile.avatarUrl = this.deriveAvatarUrlFromName(payload.avatarName);
      }
    } else if (payload.avatarImageName) {
      // If only avatarImageName is provided
      updatedProfile.avatarUrl = this.deriveAvatarUrlFromImageName(payload.avatarImageName);
    }

    // Update the UserService with the new profile
    this.userService.setUserProfile(updatedProfile);
    console.log('[EditProfile] Updated UserService immediately with:', updatedProfile);
  }

  /**
   * Derive avatar URL from avatar image name
   */
  private deriveAvatarUrlFromImageName(imageName: string): string | undefined {
    if (!imageName) return undefined;

    // Extract number from avatar name like "Avatar 3"
    const match = imageName.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      // Determine gender based on the number (even = female, odd = male, or based on your logic)
      const isFemale = num <= 6; // First 6 avatars are female
      const gender = isFemale ? 'Female' : 'Male';
      return `/assets/Images-Transparent/Image-Onboarding-Avatar-${gender}${num}.png`;
    }
    return undefined;
  }

  /**
   * Derive avatar URL from avatar name (e.g., "avatar3" -> extract number)
   */
  private deriveAvatarUrlFromName(avatarName: string): string | undefined {
    if (!avatarName) return undefined;

    // Extract number from avatar name like "avatar3", "pare261551", etc.
    const match = avatarName.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      // Validate that it's a valid avatar number (1-12)
      if (num >= 1 && num <= 12) {
        // Determine gender based on the number (first 6 are female, next 6 are male)
        const isFemale = num <= 6;
        const gender = isFemale ? 'Female' : 'Male';
        return `/assets/Images-Transparent/Image-Onboarding-Avatar-${gender}${num}.png`;
      }
    }
    return undefined;
  }

  /**
   * Update user_data in localStorage and notify all subscribers via CoreAuthService
   */
  private updateUserDataInLocalStorage(payload: any): void {
    try {
      // Build the update object matching the user_data structure
      const updateData: any = {};
      
      if (payload.name !== undefined) updateData.name = payload.name;
      if (payload.email !== undefined) updateData.email = payload.email;
      if (payload.phone !== undefined) updateData.phone = payload.phone;
      if (payload.dateOfBirth !== undefined) updateData.dateOfBirth = payload.dateOfBirth;
      if (payload.gender !== undefined) updateData.gender = payload.gender;
      
      // Handle avatar as nested object
      if (payload.avatarName !== undefined || payload.avatarImageName !== undefined) {
        const currentUserData = this.coreAuthService.getUserData();
        updateData.avatar = { ...(currentUserData?.avatar || {}) };
        if (payload.avatarName) updateData.avatar.avatarName = payload.avatarName;
        if (payload.avatarImageName) updateData.avatar.avatarImageName = payload.avatarImageName;
      }
      
      // Use CoreAuthService to update and broadcast to all subscribers
      this.coreAuthService.updateUserData(updateData);
      console.log('[EditProfile] Updated user_data via CoreAuthService');
    } catch (e) {
      console.error('[EditProfile] Failed to update user_data:', e);
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
      avatarName: this.avatarName,
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
    // Phone is optional: validate only when user has entered a phone
    if (phoneValue && !this.isPhoneValid(phoneValue)) {
      this.coreService.triggerToasrt(this.getPhoneErrorMessage());
      this.profileForm.get('phone')?.markAsDirty();
      return;
    }

    if (!this.profileForm.get('email')?.valid) {
      this.coreService.triggerToasrt('Please enter a valid email address');
      this.profileForm.get('email')?.markAsDirty();
      return;
    }

    // Build payload containing only changed fields
    const payload = this.buildChangedPayload();

    // If no changes detected, show message and return
    if (!payload || Object.keys(payload).length === 0) {
      this.coreService.triggerToasrt('No changes detected. Update a field to save.');
      return;
    }

    console.log('[EditProfile] Sending only changed fields:', payload);

    // Update localStorage immediately before sending API request
    this.updateUserDataInLocalStorage(payload);

    // Update UserService immediately to notify subscribers
    this.updateUserServiceImmediately(payload);

    // Submit to backend
    this.isSubmitting = true;
    this.subscription.add(
      this.authService.editProfile(payload)
        .pipe(finalize(() => { this.isSubmitting = false; }))
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

              if (response.avatar?.avatarImageName) {
                this.avatarImageName = response.avatar.avatarImageName;
              }

              this.currentUserData = response;
              // Also sync legacy localStorage user_data (login cache) if present
              this.syncUserDataStorage(response);
              // update stored initial values after successful update
              this.storeInitialValues();
            }
          },
          error: (error) => {
            console.error('Profile update error:', error);

            // Restore previous user profile in UserService if API call failed
            if (this.currentUserData) {
              this.userService.setUserProfile(this.currentUserData);
              console.log('[EditProfile] Restored previous user profile after API failure');
            }

            // If backend returns the specific avatar-change limit message, show it in
            // the avatar suggestions area instead of a toast.
            if (error?.status === 400 && error?.error?.message === 'Avatar name can be changed only once') {
              this.avatarSuggestionError = error.error.message || 'Avatar name can be changed only once';
              // Ensure suggestions list is hidden when showing the error
              this.avatarSuggestions = [];
              this.showAvatarSuggestions = false;
              return;
            }

            let errorMessage = 'Failed to update profile. Please try again.';

            if (error?.status === 404 && error?.error?.message?.includes('Avatar')) {
              errorMessage = 'Avatar not found. Profile updated without avatar changes.';
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
   * Build a payload that contains only fields that changed (normalized comparisons).
   * Returns null/{} when nothing changed.
   */
  private buildChangedPayload(): any | null {
    if (!this.initialValues) {
      // If we don't have initial values, be conservative and send everything
      const phoneRaw = (this.profileForm.get('phone')?.value || '').replace(/\D/g, '');
      const base: any = {
        name: this.fullName?.trim(),
        dateOfBirth: this.formatDateForBackend(this.profileForm.get('dob')!.value!),
        gender: this.gender,
        email: this.profileForm.get('email')!.value!.trim(),
        ...(this.avatarSelected ? { avatarName: `avatar${this.avatarSelected}` } : {}),
      };
      if (phoneRaw) {
        base.phone = `${this.selectedCountry.code}${phoneRaw}`;
      }
      return base;
    }

    const payload: any = {};

    // Name
    const currentName = this.fullName?.trim() || '';
    const initialName = this.initialValues.fullName?.trim() || '';
    if (currentName && currentName !== initialName) payload.name = currentName;

    // DOB (normalize to YYYY-MM-DD)
    const currentDob = this.formatDateForBackend(this.profileForm.get('dob')?.value || '');
    const initialDob = this.initialValues.dob ? this.formatDateForBackend(this.initialValues.dob) : '';
    if (currentDob && currentDob !== initialDob) payload.dateOfBirth = currentDob;

    // Gender
    const currentGender = this.gender || null;
    const initialGender = this.initialValues.gender || null;
    if (currentGender !== initialGender) payload.gender = currentGender;

    // Phone - compare normalized full phone with country code
    const currentPhoneFull = `${this.selectedCountry.code}${(this.profileForm.get('phone')?.value || '').replace(/\D/g, '')}`;
    const initialPhoneFull = `${this.initialValues.selectedCountryCode || ''}${(this.initialValues.phone || '').replace(/\D/g, '')}`;
    if (currentPhoneFull !== initialPhoneFull) payload.phone = currentPhoneFull;

    // Email (case-insensitive trim)
    const currentEmail = (this.profileForm.get('email')?.value || '').trim().toLowerCase();
    const initialEmail = (this.initialValues.email || '').trim().toLowerCase();
    if (currentEmail && currentEmail !== initialEmail) payload.email = this.profileForm.get('email')!.value!.trim();

    // Avatar selection (numeric avatar key)
    // NOTE: selecting an avatar image should only send `avatarImageName`.
    // `avatarName` is considered a user-provided custom name and should only be
    // sent when explicitly edited by the user.
    if (this.avatarSelected !== this.initialValues.avatarSelected) {
      if (this.avatarSelected) {
        const selectedAvatarData = this.avatars.find(a => a.key === this.avatarSelected);
        if (selectedAvatarData) {
          // send only the image name when user picks an avatar image
          payload.avatarImageName = selectedAvatarData.imageName;
        }
      } else if (this.avatarName && this.avatarName.trim() && this.avatarName.trim() !== this.currentUserData?.avatarName) {
        // avatar selection cleared but the user provided a custom name -> send it
        payload.avatarName = this.avatarName.trim();
        if (this.avatarImageName?.trim()) payload.avatarImageName = this.avatarImageName.trim();
      } else if (!this.avatarSelected && this.avatarName && this.avatarName.trim()) {
        // if avatarSelected cleared but avatarName present and differs
        payload.avatarName = this.avatarName.trim();
        if (this.avatarImageName?.trim()) payload.avatarImageName = this.avatarImageName.trim();
      }
    } else {
      // avatarSelected unchanged, but custom name might have changed
      const currentAvatarName = this.avatarName?.trim() || '';
      const initialAvatarName = this.initialValues.avatarName?.trim() || '';
      if (currentAvatarName && currentAvatarName !== initialAvatarName) {
        payload.avatarName = currentAvatarName;
        if (this.avatarImageName?.trim()) payload.avatarImageName = this.avatarImageName.trim();
      }
      // If the avatar name was prefilled and the user didn't change it,
      // include the prefilled/avatar name in the payload so backend receives it as-is.
      if (initialAvatarName && currentAvatarName === initialAvatarName) {
        payload.avatarName = currentAvatarName;
        if (this.avatarImageName?.trim()) payload.avatarImageName = this.avatarImageName.trim();
      }
    }

    // If there are any other changes to send, include an avatar name automatically:
    // priority: user-edited `avatarName` > generated from `avatarSelected` > existing backend `avatarName`.
    if (Object.keys(payload).length) {
      const currentAvatarName = this.avatarName?.trim();
      if (!payload.avatarName) {
        if (currentAvatarName) {
          payload.avatarName = currentAvatarName;
        } else if (this.avatarSelected) {
          payload.avatarName = `avatar${this.avatarSelected}`;
        } else if (this.currentUserData?.avatarName) {
          payload.avatarName = this.currentUserData.avatarName;
        }
      }

      // ensure avatarImageName is sent when available
      if (!payload.avatarImageName) {
        if (this.avatarImageName?.trim()) payload.avatarImageName = this.avatarImageName.trim();
        else if (this.avatarSelected) {
          const sel = this.avatars.find(a => a.key === this.avatarSelected);
          if (sel) payload.avatarImageName = sel.imageName;
        }
      }
      return payload;
    }

    return null;
  }

  /**
   * Sync the backend response into legacy `user_data` localStorage (login cache)
   * so other parts that read from `user_data` stay consistent.
   */
  private syncUserDataStorage(response: any): void {
    try {
      const raw = localStorage.getItem('user_data');
      if (!raw) return;

      const parsed = JSON.parse(raw);
      // Merge known fields from response into the stored object
      const merged = { ...parsed };
      if (response.id !== undefined) merged.id = response.id;
      if (response.name !== undefined) merged.name = response.name;
      if (response.email !== undefined) merged.email = response.email;
      if (response.phone !== undefined) merged.phone = response.phone;
      if (response.dateOfBirth !== undefined) merged.dateOfBirth = response.dateOfBirth;
      if (response.gender !== undefined) merged.gender = response.gender;
      if (response.avatar !== undefined) merged.avatar = response.avatar;

      localStorage.setItem('user_data', JSON.stringify(merged));
      console.log('[EditProfile] Synced user_data in localStorage');
    } catch (e) {
      console.error('[EditProfile] Failed to sync user_data in localStorage:', e);
    }
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
    // mark phone as dirty so validation appears while typing
    try { this.profileForm.get('phone')?.markAsDirty(); } catch (e) { }

    setTimeout(() => {
      try { input.setSelectionRange(numericValue.length, numericValue.length); } catch (e) { }
    }, 0);
  }

  onAvatarNameChange(value: string | null): void {
    // Clear any previous avatar-suggestion error when user types manually
    this.avatarSuggestionError = null;
    this.avatarName = value || '';
    const v = (this.avatarName || '').toString();
    // Inline validation: max 20 chars
    if (v.length > 20) {
      this.avatarNameError = 'Maximum limit is 20 characters';
      this.showAvatarNameError = true;
    } else {
      this.avatarNameError = null;
      this.showAvatarNameError = false;
    }
    if (v.trim().length >= 4) {
      this.avatarInput$.next(v.trim());
    } else {
      // hide/clear suggestions when input too short
      this.avatarSuggestions = [];
      this.showAvatarSuggestions = false;
    }
  }

  onSuggestionSelected(s: string): void {
    this.avatarName = s;
    this.avatarSuggestions = [];
    this.showAvatarSuggestions = false;
    this.avatarSuggestionError = null;
    // clear inline avatar validation when a suggestion is chosen
    this.avatarNameError = null;
    this.showAvatarNameError = false;
  }

  onFullNameChange(value: string | null): void {
    this.fullName = value || '';
    const v = (this.fullName || '').toString();
    if (v.length > 40) {
      this.fullNameError = 'Maximum limit is 40 characters';
      this.showFullNameError = true;
    } else {
      this.fullNameError = null;
      this.showFullNameError = false;
    }
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

  /**
   * Normalize a phone value for display in the phone input by removing any
   * leading country code (e.g., +91) and non-digit characters. Prefer the
   * selectedCountry code, then fall back to known countries. If no code is
   * detected and the number is longer than the expected phone length, return
   * the last N digits.
   */
  private normalizePhoneForInput(phoneWithCode: string): string {
    if (!phoneWithCode) return '';

    // keep only digits
    const digits = (phoneWithCode + '').replace(/\D/g, '');

    // try selected country first
    const selCode = (this.selectedCountry?.code || '').replace(/\D/g, '');
    if (selCode && digits.startsWith(selCode)) {
      return digits.substring(selCode.length);
    }

    // try to detect any known country code from the loaded countries
    for (const c of this.countries || []) {
      const codeDigits = (c.code || '').replace(/\D/g, '');
      if (codeDigits && digits.startsWith(codeDigits)) {
        return digits.substring(codeDigits.length);
      }
    }

    // fallback: if we know expected phone length for selected country, use last N digits
    const expected = this.selectedCountry?.phoneLength || 0;
    if (expected && digits.length > expected) {
      return digits.slice(-expected);
    }

    return digits;
  }

  // Phone helpers copied from login
  get currentPhoneLength(): number {
    return this.selectedCountry?.phoneLength || 0;
  }

  isPhoneValid(phoneValue: string | null | undefined): boolean {
    // Phone is optional — treat empty phone as valid. When provided, enforce length.
    if (!phoneValue) return true;
    const cleanPhone = phoneValue.replace(/\D/g, '');
    return cleanPhone.length === this.currentPhoneLength;
  }

  getPhoneErrorMessage(): string {
    return `Please enter a valid ${this.currentPhoneLength} digit phone number for ${this.selectedCountry?.name}`;
  }

  openBirthdayPickerNow(): void {
    this.openBirthdayPicker = true;
  }

  onEmailChange(value: string | null): void {
    const control = this.profileForm.get('email');
    if (!control) return;
    control.setValue(value);
    try { control.markAsDirty(); } catch (e) { }
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
      } else if (age < 8) {
        this.ageError = 'Your age cannot be less than 8 years old';
      }
    } else if (this.accountType === 'parent') {
      if (age < 24) {
        this.ageError = 'Your age cannot be less than 24 years old for parent role';
      }
    } else if (this.accountType === 'self') {
      if (age < 8) {
        this.ageError = 'Your age cannot be less than 8 years old';
      }
    }
  }

  /**
   * Retry profile update without avatar if avatar 404 error occurs
   */
  private retryProfileUpdateWithoutAvatar(): void {
    const phoneRaw = (this.profileForm.get('phone')?.value || '').replace(/\D/g, '');

    const payload: EditProfilePayload = {
      name: this.fullName!.trim(),
      dateOfBirth: this.formatDateForBackend(this.profileForm.get('dob')!.value!),
      gender: this.gender!,
      email: this.profileForm.get('email')!.value!.trim()
      // Explicitly not including avatarName or avatarImageName
    } as any;

    if (phoneRaw) {
      payload.phone = `${this.selectedCountry.code}${phoneRaw}`;
    }

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
              // Sync legacy login cache as well
              this.syncUserDataStorage(response);
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
