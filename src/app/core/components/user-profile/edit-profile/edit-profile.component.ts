import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeInputsModule } from '../../superme-inputs/superme-inputs.module';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { CountriesService, Country } from '../../../services/countries.service';
import { Subscription, Subject, of } from 'rxjs';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { AuthService as PackageAuthService } from '../../../../../package/api/auth.service';
import { AuthService as CoreAuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';
import { UserProfile, UserService } from '../../../services/user.service';
import { finalize, debounceTime, distinctUntilChanged, switchMap, filter, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ApiGender, toApiGender, toStoredGender } from '../../../models/gender.model';
import { AvatarDefinition, AvatarService } from '../../../services/avatar.service';

type ProfileGender = 'Male' | 'Female' | 'PreferNotToSay';

@Component({
  selector: 'edit-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule, SupermeNavigatorComponent, SupermeInputsModule, SupermeButtonComponent, ProfileEditInputComponent],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

  // Country and phone related
  showCountryCodeModal = false;
  selectedCountry!: Country;
  countries: Country[] = [];
  countrySearch: string = '';
  private subscription = new Subscription();

  get filteredCountries(): Country[] {
    const q = this.countrySearch.trim().toLowerCase();
    if (!q) return this.countries;
    return this.countries.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }

  // Loading state
  isSubmitting = false;

  // Verification states
  isPhoneVerifying = false;
  isEmailVerifying = false;
  phoneVerificationError: string | null = null;
  emailVerificationError: string | null = null;
  phoneVerified = false;
  emailVerified = false;

  // OTP Modal states
  showPhoneOtpModal = false;
  showEmailOtpModal = false;
  maskedPhone = '';
  maskedEmail = '';
  currentVerificationType: 'phone' | 'email' | null = null;

  // Inline OTP state (4 digits)
  otp: string[] = ['', '', '', ''];
  otpError: string | null = null;
  otpInvalid = false;
  otpVerifying = false;

  // Timer and resend
  timeLeft = 120; // seconds
  timerSub: any = null;
  isExpired = false;
  resendCooldown = 0;
  resendSub: any = null;
  isResendDisabled = false;

  // Form with proper validators
  profileForm = new FormGroup({
    // Date of birth is optional — user can update their profile without it.
    dob: new FormControl<string | null>(null, []),
    // Phone is optional now — user can update profile without providing phone
    phone: new FormControl<string | null>(null, []),
    email: new FormControl<string | null>(null, [Validators.required, Validators.email]),
  });

  // `username` is the preferred in-app identity. Older profiles may not have
  // one yet, so the username field falls back to the avatar name until it is
  // created by the user.
  username: string | null = null;
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

  gender: ProfileGender | null = null;

  // Avatar selection
  avatarSelected: string | null = null;

  // Birthday picker control
  openBirthdayPicker = false;

  /**
   * Provide a null-safe initial date for the birthday picker.
   * Returns `string | Date | undefined` as expected by the picker input.
   */
  public get birthdayInitialDate(): string | Date | undefined {
    const val = this.profileForm.get('dob')?.value;
    return val == null ? undefined : val;
  }

  /** Value shown in the Username field. Null is the only fallback signal. */
  public get displayUsername(): string {
    return this.username !== null ? this.username : (this.avatarName || '');
  }
  // Account relationship: 'child' | 'parent' | 'self'
  accountType: 'child' | 'parent' | 'self' | null = null;

  // Age validation error (empty when valid)
  ageError: string = '';

  // Store current user data from backend
  currentUserData: any = null;

  // Store avatarId from backend for update payload
  private currentAvatarId: number | null = null;

  // Track initial values to detect changes
  private initialValues: {
    fullName: string | null;
    gender: ProfileGender | null;
    dob: string | null;
    phone: string | null;
    email: string | null;
    avatarSelected: any;
    username: string | null;
    avatarName: string | null;
    selectedCountryCode: string;
  } | null = null;

  constructor(
    private countriesService: CountriesService,
    private authService: PackageAuthService,
    private coreAuthService: CoreAuthService,
    private coreService: CoreService,
    private userService: UserService,
    private router: Router,
    private avatarService: AvatarService
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

    this.subscription.add(
      this.profileForm.get('dob')!.valueChanges.subscribe(() => this.ensureAvatarSelectionIsValid())
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
    this.subscription.add(
      this.authService.getProfileFromAPI().subscribe({
        next: (data) => {
          console.log('[EditProfile] Loaded profile from API:', data);
          this.prefillFormFromUserData(data);
        },
        error: (err) => {
          console.error('[EditProfile] Failed to load profile from API:', err);
        }
      })
    );
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

    // 2. Auto-fill Gender from current and legacy backend values
    if (userData.gender) {
      this.gender = this.normalizeProfileGender(userData.gender);
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

    // 7. Prefer the server username in the identity field. A null username is
    // an intentional legacy state, so keep the avatar name as its fallback.
    this.username = userData.username != null ? String(userData.username) : null;

    // 8. Auto-fill the same avatar for every role using the shared mapping.
    {
      const avatarInfo = userData.avatar || {};
      this.avatarName = userData.avatarName || avatarInfo.avatarName || this.avatarName;
      const avatarImageName = userData.avatarImageName || avatarInfo.avatarImageName;
      const avatarIdentifier = avatarImageName || userData.avatarName || avatarInfo.avatarName;

      // Store avatarId from API response (flat format)
      if (userData.avatarId != null) {
        this.currentAvatarId = userData.avatarId;
      }

      if (avatarIdentifier) {
        this.avatarImageName = avatarIdentifier;
        console.log('[EditProfile] Avatar Image Name set to:', this.avatarImageName);
      }

      if (avatarIdentifier) {
        // Resolve legacy and current identifiers through the same role/age
        // mapping used by signup. This also maps an older standard Parent
        // avatar onto the matching dedicated Parent artwork.
        const avatar = this.avatarService.getAvatarForUser({
          ...userData,
          relationship: this.accountType || relationship,
          dateOfBirth: userData.dateOfBirth || userData.dob,
          gender: this.gender || userData.gender,
          avatarImageName: avatarIdentifier
        });
        const allowedAvatar = this.getEquivalentAllowedAvatar(avatar);
        if (allowedAvatar) {
          this.avatarSelected = allowedAvatar.key;
          this.avatarImageName = allowedAvatar.imageName;
          console.log('[EditProfile] Avatar selected by image name:', allowedAvatar.key);
        }
      }
    }

    // 9. Store current user data for reference
    this.currentUserData = userData;

    // 10. Validate age based on account type
    if (userData.dateOfBirth || userData.dob) {
      this.validateAge();
    }

    // 11. Store initial values for change detection
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
    if (payload.username !== undefined) updatedProfile.username = payload.username;
    if (payload.email !== undefined) updatedProfile.email = payload.email;
    if (payload.phone !== undefined) updatedProfile.phone = payload.phone;
    if (payload.dateOfBirth !== undefined) updatedProfile.dob = payload.dateOfBirth;
    if (payload.gender !== undefined) updatedProfile.gender = this.normalizeStoredGender(payload.gender);
    if (payload.avatarName !== undefined) {
      // avatarName remains as textual identifier only
      updatedProfile.avatarName = payload.avatarName;
    }
    // Only use avatarImageName to derive avatarUrl
    if (payload.avatarImageName) {
      updatedProfile.avatarUrl = this.deriveAvatarUrlFromImageName(payload.avatarImageName);
      updatedProfile.avatarImageName = payload.avatarImageName;
    }

    // Update the UserService with the new profile
    this.userService.setUserProfile(updatedProfile);
    console.log('[EditProfile] Updated UserService immediately with:', updatedProfile);
  }

  /**
   * Derive avatar URL from avatar image name
   */
  private deriveAvatarUrlFromImageName(imageName: string): string | undefined {
    return this.avatarService.getAvatarAsset(imageName)?.value;
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
      if (payload.username !== undefined) updateData.username = payload.username;
      
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
      username: this.username,
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

  /**
   * Returns true when the current phone value is different from the stored initial value.
   * This normalizes both values to the full international string (country code + digits)
   * so that deleting and retyping the same value does not count as a change.
   */
  public isPhoneChangedForVerify(): boolean {
    try {
      if (!this.initialValues) return true;
      const currentPhoneRaw = (this.profileForm.get('phone')?.value || '').toString().replace(/\D/g, '');
      const initialPhoneRaw = (this.initialValues.phone || '').toString().replace(/\D/g, '');
      const currentFull = `${this.selectedCountry?.code || ''}${currentPhoneRaw}`;
      const initialFull = `${this.initialValues.selectedCountryCode || ''}${initialPhoneRaw}`;
      return currentFull !== initialFull;
    } catch (e) {
      return true;
    }
  }

  /**
   * Returns true when the current email value is different from the stored initial value.
   * Comparison is case-insensitive and trims whitespace so deleting+retyping the same
   * address will not mark it as changed.
   */
  public isEmailChangedForVerify(): boolean {
    try {
      if (!this.initialValues) return true;
      const current = (this.profileForm.get('email')?.value || '').toString().trim().toLowerCase();
      const initial = (this.initialValues.email || '').toString().trim().toLowerCase();
      return current !== initial;
    } catch (e) {
      return true;
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

    // Date of birth and gender are optional — users may save their profile
    // without providing them, and add them later if they choose to.

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

    if (this.isEmailChangedForVerify() && !this.emailVerified) {
      this.coreService.triggerToasrt('Please verify your new email before updating profile.');
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
          // this.router.navigate(['/authed/user-profile']);

    // Submit to backend
    this.isSubmitting = true;
    this.subscription.add(
      this.authService.updateProfileOnAPI(payload)
        .pipe(finalize(() => { this.isSubmitting = false; }))
        .subscribe({
          next: (rawResponse) => {
            this.coreService.triggerToasrt('Profile updated successfully!', 'success');

            // Backend may return plain text instead of JSON — parse safely
            let response: any = rawResponse;
            if (typeof rawResponse === 'string') {
              try { response = JSON.parse(rawResponse); } catch { response = null; }
            }

            if (response && typeof response === 'object') {
              // Response is a JSON object — sync profile from it
              const avatarImgName = response.avatarImageName || response.avatar?.avatarImageName;
              if (response.username !== undefined) {
                this.username = response.username != null ? String(response.username) : null;
              }
              this.userService.updateUserProfile({
                name: response.name,
                username: response.username,
                email: response.email,
                phone: response.phone,
                gender: this.normalizeStoredGender(response.gender),
                dob: response.dateOfBirth,
                avatarUrl: avatarImgName ? this.deriveAvatarUrlFromImageName(avatarImgName) : undefined,
                avatarName: response.avatarName || response.avatar?.avatarName,
                avatarImageName: avatarImgName
              });

              if (avatarImgName) this.avatarImageName = avatarImgName;
              if (response.avatarId != null) this.currentAvatarId = response.avatarId;

              this.currentUserData = response;
              this.syncUserDataStorage(response);
              this.storeInitialValues();
            }
            // Always navigate back on success regardless of response shape
            this.router.navigate(['/authed/user-profile']);
          },
          error: (error) => {
            console.error('Profile update error:', error);

            if (error?.status === 400 && error?.error?.message === 'Avatar name can be changed only once') {
              this.avatarSuggestionError = error.error.message || 'Avatar name can be changed only once';
              this.avatarSuggestions = [];
              this.showAvatarSuggestions = false;
              return;
            }

            let errorMessage = 'Failed to update profile. Please try again.';
            if (error?.error?.message) {
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
      const dobRaw = this.profileForm.get('dob')?.value;
      const base: any = {
        name: this.fullName?.trim(),
        gender: this.gender ? this.toApiGender(this.gender) : undefined,
        email: this.profileForm.get('email')!.value!.trim(),
        ...(this.username !== null
          ? { username: this.username.trim() }
          : { avatarName: this.avatarName?.trim() || undefined }),
        ...(this.avatarSelected ? { avatarImageName: this.avatarService.getAvatarAsset(this.avatarSelected)?.imageName } : {}),
      };
      if (dobRaw) {
        base.dateOfBirth = this.formatDateForBackend(dobRaw);
      }
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
    if (currentGender && currentGender !== initialGender) payload.gender = this.toApiGender(currentGender);

    // Phone - compare normalized full phone with country code
    const currentPhoneFull = `${this.selectedCountry.code}${(this.profileForm.get('phone')?.value || '').replace(/\D/g, '')}`;
    const initialPhoneFull = `${this.initialValues.selectedCountryCode || ''}${(this.initialValues.phone || '').replace(/\D/g, '')}`;
    if (currentPhoneFull !== initialPhoneFull) payload.phone = currentPhoneFull;

    // Email (case-insensitive trim)
    const currentEmail = (this.profileForm.get('email')?.value || '').trim().toLowerCase();
    const initialEmail = (this.initialValues.email || '').trim().toLowerCase();
    if (currentEmail && currentEmail !== initialEmail) payload.email = this.profileForm.get('email')!.value!.trim();

    // Avatar selection
    if (this.avatarSelected !== this.initialValues.avatarSelected && this.avatarSelected) {
      const sel = this.avatarService.getAvatarAsset(this.avatarSelected);
      if (sel) payload.avatarImageName = sel.imageName;
    }

    // Persist the edited identity under the same field that was displayed.
    // Legacy profiles (username === null) continue using avatarName.
    const currentIdentity = this.displayUsername.trim();
    const initialIdentity = this.initialValues.username !== null
      ? (this.initialValues.username || '').trim()
      : (this.initialValues.avatarName || '').trim();
    if (currentIdentity !== initialIdentity) {
      if (this.username !== null) {
        payload.username = currentIdentity;
      } else {
        payload.avatarName = currentIdentity;
      }
    }

    if (Object.keys(payload).length === 0) return null;

    // Preserve the server's legacy avatar id only when no new Figma avatar was selected.
    if (!payload.avatarId && this.currentAvatarId != null) payload.avatarId = this.currentAvatarId;
    if (!payload.avatarName && this.avatarName?.trim()) payload.avatarName = this.avatarName.trim();
    if (!payload.avatarImageName && this.avatarImageName?.trim()) payload.avatarImageName = this.avatarImageName.trim();

    return payload;
  }

  /**
   * Sync the backend response into `user_data` (localStorage + AuthService's
   * in-memory BehaviorSubject) so already-loaded pages — like the Profile
   * screen's age display — reflect the change immediately instead of only
   * after a fresh logout/login reloads everything from scratch.
   */
  private syncUserDataStorage(response: any): void {
    try {
      const merged: any = {};
      if (response.id !== undefined) merged.id = response.id;
      if (response.name !== undefined) merged.name = response.name;
      if (response.username !== undefined) merged.username = response.username;
      if (response.email !== undefined) merged.email = response.email;
      if (response.phone !== undefined) merged.phone = response.phone;
      if (response.dateOfBirth !== undefined) merged.dateOfBirth = response.dateOfBirth;
      if (response.gender !== undefined) merged.gender = response.gender;
      if (response.avatar !== undefined) merged.avatar = response.avatar;
      if (response.avatarImageName !== undefined) merged.avatarImageName = response.avatarImageName;

      // The Profile page displays a precomputed `age` field rather than
      // deriving it live from dateOfBirth, so it must be refreshed here too —
      // otherwise a stale `age` silently overrides the new date of birth.
      if (response.age !== undefined) {
        merged.age = response.age;
      } else if (response.dateOfBirth !== undefined) {
        const computedAge = this.calculateAgeFromDob(response.dateOfBirth);
        if (computedAge !== null) merged.age = computedAge;
      }

      // IMPORTANT: this.authService is PackageAuthService (a different class
      // from package/api/auth.service.ts) — the Profile page actually reads
      // from CoreAuthService.userData$, so updates must go through that one.
      this.coreAuthService.updateUserData(merged);
      console.log('[EditProfile] Synced user_data via CoreAuthService.updateUserData', merged);
    } catch (e) {
      console.error('[EditProfile] Failed to sync user_data:', e);
    }
  }

  /**
   * Same age-calculation logic used elsewhere in the app (AuthService's
   * extractAgeFromUserData) so the recomputed value stays consistent.
   */
  private calculateAgeFromDob(dob: string): number | null {
    return this.avatarService.calculateAge(dob);
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

  openCountryCodeModal(): void {
    this.countrySearch = '';
    this.showCountryCodeModal = true;
  }

  closeCountryCodeModal(): void {
    this.countrySearch = '';
    this.showCountryCodeModal = false;
  }

  onCountrySearch(event: Event): void {
    this.countrySearch = (event.target as HTMLInputElement).value;
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

  onUsernameChange(value: string | null): void {
    // Clear any previous avatar-suggestion error when user types manually
    this.avatarSuggestionError = null;
    if (this.username !== null) {
      this.username = value || '';
    } else {
      this.avatarName = value || '';
    }
    const v = (value || '').toString();
    this.validateAvatarUsername(v);
    if (v.trim().length >= 4) {
      this.avatarInput$.next(v.trim());
    } else {
      // hide/clear suggestions when input too short
      this.avatarSuggestions = [];
      this.showAvatarSuggestions = false;
    }
  }

  /** Backwards-compatible handler for any existing callers. */
  onAvatarNameChange(value: string | null): void {
    this.onUsernameChange(value);
  }

  onSuggestionSelected(s: string): void {
    if (this.username !== null) {
      this.username = s;
    } else {
      this.avatarName = s;
    }
    this.avatarSuggestions = [];
    this.showAvatarSuggestions = false;
    this.avatarSuggestionError = null;
    this.validateAvatarUsername(s);
  }

  /** Apply the PRD username rules while the user types in Edit Profile. */
  private validateAvatarUsername(value: string): void {
    if (!value) {
      this.avatarNameError = 'Username is required.';
      this.showAvatarNameError = true;
    } else if (/\s/.test(value)) {
      this.avatarNameError = "Spaces aren't allowed. Use _ instead";
      this.showAvatarNameError = true;
    } else if (value.length < 3) {
      this.avatarNameError = 'Minimum 3 characters required.';
      this.showAvatarNameError = true;
    } else if (value.length > 20) {
      this.avatarNameError = 'Maximum limit is 20 characters';
      this.showAvatarNameError = true;
    } else if (/[A-Z]/.test(value)) {
      this.avatarNameError = 'Only lowercase letters allowed';
      this.showAvatarNameError = true;
    } else if (!/^[a-z0-9_]+$/.test(value)) {
      this.avatarNameError = 'Only letters, numbers, and underscore are allowed.';
      this.showAvatarNameError = true;
    } else {
      this.avatarNameError = null;
      this.showAvatarNameError = false;
    }
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

  private getApiErrorMessage(error: any, fallback: string): string {
    const errorBody = error?.error;

    if (typeof errorBody === 'string') {
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed?.message) return parsed.message;
      } catch (e) {
        return errorBody || fallback;
      }
    }

    if (errorBody?.message) return errorBody.message;
    if (errorBody?.error?.message) return errorBody.error.message;
    if (error?.message) return error.message;
    return fallback;
  }

  openBirthdayPickerNow(): void {
    this.openBirthdayPicker = true;
  }

  onEmailChange(value: string | null): void {
    const control = this.profileForm.get('email');
    if (!control) return;
    control.setValue(value);
    try { control.markAsDirty(); } catch (e) { }
    this.emailVerified = false;
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
    const age = this.avatarService.calculateAge(dobValue);
    return age === null ? '' : `${age} year${age !== 1 ? 's' : ''} old`;
  }

  /**
   * Validate age limits depending on selected account type
   */
  validateAge(): void {
    this.ageError = '';
    const dobValue = this.profileForm.get('dob')?.value;
    if (!dobValue) return;

    const age = this.avatarService.calculateAge(dobValue);
    if (age === null) return;

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
   * Returns true when any field has invalid data — disables the Update Info button.
   */
  get isFormInvalid(): boolean {
    // Full name: required, max 40 chars
    if (!this.fullName?.trim() || this.showFullNameError) return true;

    // Date of birth: optional — only block saving if an entered value fails
    // the age-range check, not for being empty.
    if (this.profileForm.get('dob')?.value && !!this.ageError) return true;

    // Gender: optional

    // Phone: optional — validate only when a value is present
    const phone = this.profileForm.get('phone')?.value;
    if (phone && !this.isPhoneValid(phone)) return true;

    // Email: required and must pass format validation
    if (this.profileForm.get('email')?.invalid) return true;

    // Avatar name: max 20 chars (shown error means invalid)
    if (this.showAvatarNameError) return true;

    return false;
  }

  /**
   * Get filtered avatars for the selected gender
   */
  get avatarsFiltered(): AvatarDefinition[] {
    const selectedGender = this.gender || this.normalizeProfileGender(this.currentUserData?.gender);
    return this.avatarService.getAvatarsForUser(
      this.profileForm.get('dob')?.value,
      selectedGender,
      this.getAvatarRelationship()
    );
  }

  selectGender(gender: ProfileGender): void {
    this.gender = gender;
    this.ensureAvatarSelectionIsValid();
  }

  private normalizeProfileGender(value: unknown): ProfileGender | null {
    const normalized = toApiGender(value);
    if (normalized === 'male') return 'Male';
    if (normalized === 'female') return 'Female';
    if (normalized === 'prefer_not_to_say') return 'PreferNotToSay';
    return null;
  }

  private toApiGender(gender: ProfileGender): ApiGender {
    return toApiGender(gender);
  }

  private normalizeStoredGender(value: unknown): UserProfile['gender'] {
    return toStoredGender(value);
  }

  /**
   * Select an avatar and update the profile
   */
  selectAvatar(avatar: AvatarDefinition): void {
    if (!avatar) return;
    this.avatarSelected = avatar.key;
    this.avatarImageName = avatar.imageName;
    this.currentAvatarId = null;
    console.log('[EditProfile] Avatar selected:', {
      key: avatar.key,
      imageName: this.avatarImageName,
      path: avatar.value
    });
  }

  private ensureAvatarSelectionIsValid(): void {
    if (!this.avatarSelected) return;
    const currentAvatar = this.avatarService.getAvatarAsset(this.avatarSelected);
    const allowedAvatar = this.getEquivalentAllowedAvatar(currentAvatar);
    if (!allowedAvatar) {
      this.avatarSelected = null;
      this.avatarImageName = null;
      return;
    }

    // When DOB or gender changes, retain the same avatar position but switch
    // to the artwork belonging to the new age/gender/role group.
    this.avatarSelected = allowedAvatar.key;
    this.avatarImageName = allowedAvatar.imageName;
  }

  private getEquivalentAllowedAvatar(avatar: AvatarDefinition | null): AvatarDefinition | null {
    const options = this.avatarsFiltered;
    if (!options.length) return null;
    if (!avatar) return options[0];

    return options.find(option => option.key === avatar.key)
      || options.find(option => option.gender === avatar.gender && option.index === avatar.index)
      || options.find(option => option.index === avatar.index)
      || options[0];
  }

  private getAvatarRelationship(): 'child' | 'parent' | 'self' | undefined {
    if (this.accountType) return this.accountType;

    const relationship = this.currentUserData?.relationship
      || this.currentUserData?.relationshipType
      || this.coreAuthService.getUserData()?.relationship
      || this.coreAuthService.getUserData()?.relationshipType;
    const normalized = String(relationship || '').trim().toLowerCase();
    return normalized === 'child' || normalized === 'parent' || normalized === 'self'
      ? normalized
      : undefined;
  }

  /**
   * Verify phone number
   */
  verifyPhone(): void {
    const phoneValue = this.profileForm.get('phone')?.value;

    if (!phoneValue || !this.isPhoneValid(phoneValue)) {
      this.phoneVerificationError = this.getPhoneErrorMessage();
      return;
    }

    // No backend integration for now — just open the OTP modal for local testing
    const fullPhone = `${this.selectedCountry.code}${phoneValue.replace(/\D/g, '')}`;
    this.phoneVerificationError = null;
    this.maskedPhone = fullPhone;
    this.clearOtp();
    this.currentVerificationType = 'phone';
    this.showPhoneOtpModal = true;
    this.startOtpTimer();
    console.log('[EditProfile] (no-api) Opening Phone OTP modal for', fullPhone);
  }

  /**
   * Verify email address
   */
  verifyEmail(): void {
    const emailValue = this.profileForm.get('email')?.value;

    if (!emailValue || this.profileForm.get('email')?.invalid) {
      this.emailVerificationError = 'Please enter a valid email address';
      return;
    }

    const newEmail = emailValue.trim();
    this.emailVerificationError = null;
    this.isEmailVerifying = true;

    this.subscription.add(
      this.authService.requestEmailChangeOtp(newEmail)
        .pipe(finalize(() => { this.isEmailVerifying = false; }))
        .subscribe({
          next: (response) => {
            this.maskedEmail = newEmail;
            this.clearOtp();
            this.currentVerificationType = 'email';
            this.showEmailOtpModal = true;
            this.startOtpTimer();
            this.coreService.triggerToasrt(response?.message || 'OTP sent successfully!', 'success');
            console.log('[EditProfile] Email change OTP requested:', response);
          },
          error: (error) => {
            const errorMsg = this.getApiErrorMessage(error, 'Failed to send OTP. Please try again.');
            this.emailVerificationError = errorMsg;
            this.coreService.triggerToasrt(errorMsg);
            console.error('[EditProfile] Email change OTP request error:', error);
          }
        })
    );
  }

  /**
   * Handle OTP confirmation from modal
   */
  onOtpConfirm(otp: string): void {
    if (otp === 'RESEND_OTP') {
      // Resend OTP
      this.resendOtp();
      return;
    }

    if (this.currentVerificationType === 'phone') {
      this.verifyPhoneOtp(otp);
    } else if (this.currentVerificationType === 'email') {
      this.verifyEmailOtp(otp);
    }
  }

  /**
   * Verify phone OTP
   */
  private verifyPhoneOtp(otp: string): void {
    const phoneValue = this.profileForm.get('phone')?.value;
    if (!phoneValue) return;
    
    const fullPhone = `${this.selectedCountry.code}${phoneValue.replace(/\D/g, '')}`;

    this.subscription.add(
      this.authService.verifyPhoneOtp(fullPhone, otp)
        .subscribe({
          next: (response) => {
            this.phoneVerified = true;
            this.coreService.triggerToasrt('Phone verified successfully!', 'success');
            this.showPhoneOtpModal = false;
            console.log('[EditProfile] Phone OTP verified:', response);
          },
          error: (error) => {
            const errorMsg = error?.error?.message || 'Incorrect OTP';
            this.markInvalid(errorMsg);
            console.error('[EditProfile] Phone OTP verification error:', error);
          }
        })
    );
  }

  /**
   * Verify email OTP
   */
  private verifyEmailOtp(otp: string): void {
    const emailValue = this.profileForm.get('email')?.value;
    if (!emailValue) return;
    const newEmail = emailValue.trim();

    this.subscription.add(
      this.authService.verifyEmailChangeOtp(otp)
        .subscribe({
          next: (response) => {
            this.emailVerified = true;
            this.updateUserDataInLocalStorage({ email: newEmail });
            this.updateUserServiceImmediately({ email: newEmail });
            if (this.currentUserData) {
              this.currentUserData = { ...this.currentUserData, email: newEmail };
            }
            this.syncUserDataStorage({ email: newEmail });
            this.storeInitialValues();
            this.coreService.triggerToasrt(response?.message || 'Email updated successfully', 'success');
            this.closeOtpModal();
            console.log('[EditProfile] Email OTP verified:', response);
          },
          error: (error) => {
            const errorMsg = this.getApiErrorMessage(error, 'Invalid OTP. Please check and try again.');
            this.markInvalid(errorMsg);
            console.error('[EditProfile] Email OTP verification error:', error);
          }
        })
    );
  }

  /**
   * Resend OTP
   */
  private resendOtp(): void {
    if (this.currentVerificationType === 'phone') {
      const phoneValue = this.profileForm.get('phone')?.value;
      if (!phoneValue) return;
      
      const fullPhone = `${this.selectedCountry.code}${phoneValue.replace(/\D/g, '')}`;

      this.subscription.add(
        this.authService.sendPhoneOtp(fullPhone)
          .subscribe({
            next: (response) => {
              this.coreService.triggerToasrt('OTP resent successfully!', 'success');
              console.log('[EditProfile] Phone OTP resent:', response);
            },
            error: (error) => {
              const errorMsg = error?.error?.message || 'Failed to resend OTP.';
              this.coreService.triggerToasrt(errorMsg);
              console.error('[EditProfile] Resend phone OTP error:', error);
            }
          })
      );
    } else if (this.currentVerificationType === 'email') {
      const emailValue = this.profileForm.get('email')?.value;
      if (!emailValue) return;
      const newEmail = emailValue.trim();

      this.subscription.add(
        this.authService.requestEmailChangeOtp(newEmail)
          .subscribe({
            next: (response) => {
              this.maskedEmail = newEmail;
              this.clearOtp();
              this.otpError = null;
              this.otpInvalid = false;
              this.otpVerifying = false;
              this.startOtpTimer();
              this.coreService.triggerToasrt(response?.message || 'OTP resent successfully!', 'success');
              console.log('[EditProfile] Email change OTP resent:', response);
            },
            error: (error) => {
              const errorMsg = this.getApiErrorMessage(error, 'Failed to resend OTP.');
              this.coreService.triggerToasrt(errorMsg);
              console.error('[EditProfile] Resend email change OTP error:', error);
            }
          })
      );
    }
  }

  /**
   * Close OTP modal
   */
  closeOtpModal(): void {
    this.showPhoneOtpModal = false;
    this.showEmailOtpModal = false;
    this.currentVerificationType = null;
    this.stopOtpTimer();
    this.stopResendCooldown();
    this.clearOtp();
    this.otpError = null;
    this.otpInvalid = false;
    this.otpVerifying = false;
  }

  /* ----------------- OTP helper methods inlined ----------------- */
  private startOtpTimer(seconds: number = 120): void {
    this.timeLeft = seconds;
    this.isExpired = false;
    if (this.timerSub) this.stopOtpTimer();
    this.timerSub = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.isExpired = true;
        this.stopOtpTimer();
      }
    }, 1000);
  }

  private stopOtpTimer(): void {
    if (this.timerSub) {
      clearInterval(this.timerSub);
      this.timerSub = null;
    }
  }

  get formattedOtpTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Dead simple OTP handlers
  onOtpInput(event: any, index: number): void {
    const el = event.target as HTMLInputElement;
    let val = (el.value || '').replace(/[^0-9]/g, ''); // only digits
    
    // If input is being cleared (empty or only non-numeric), handle deletion
    if (!val || val.length === 0) {
      this.otp[index] = '';
      el.value = '';
      return;
    }
    
    // Take only the first digit
    if (val.length > 1) val = val.charAt(0);
    
    this.otp[index] = val;
    el.value = val;
    
    // Auto-advance to next input if digit entered and not the last input
    if (val && index < this.otp.length - 1) {
      setTimeout(() => {
        const next = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
        if (next) {
          next.focus();
          next.select();
        }
      }, 10);
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      event.preventDefault();
      this.otp[index] = '';
      (event.target as HTMLInputElement).value = '';
      if (index > 0) {
        const prev = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
        if (prev) prev.focus();
      }
    }
    // Handle Enter key to move to next input
    if (event.key === 'Enter' && index < this.otp.length - 1) {
      event.preventDefault();
      const next = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
      if (next) next.focus();
    }
    // Handle arrow keys for navigation
    if (event.key === 'ArrowRight' && index < this.otp.length - 1) {
      const next = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
      if (next) next.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      const prev = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
      if (prev) prev.focus();
    }
  }

  onOtpKeyup(event: KeyboardEvent, index: number): void {
    // no-op
  }

  // onOtpKeyUp removed — using input + keydown handlers for reliable IME behaviour

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const data = event.clipboardData?.getData('text') || '';
    const digits = data.replace(/[^0-9]/g, '');
    
    // Fill inputs with digits
    for (let i = 0; i < this.otp.length && i < digits.length; i++) {
      this.otp[i] = digits[i];
      const inp = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
      if (inp) inp.value = digits[i];
    }
    
    // Focus next empty or last
    const nextEmpty = this.otp.findIndex(d => !d);
    if (nextEmpty >= 0) {
      const inp = document.getElementById(`otp-input-${nextEmpty}`) as HTMLInputElement;
      if (inp) inp.focus();
    }
    
    // Auto-submit if all filled
    if (this.otp.every(d => d)) this.verifyOtp();
  }

  onOtpFocus(event: FocusEvent, index: number): void {
    (event.target as HTMLInputElement).select();
  }

  private getOtpValue(): string {
    return this.otp.join('');
  }

  isOtpComplete(): boolean {
    return this.otp.every(d => d !== '');
  }

  verifyOtp(): void {
    if (!this.isOtpComplete()) {
      this.otpError = 'Please enter all 4 digits';
      this.otpInvalid = true;
      return;
    }
    const code = this.getOtpValue();
    this.otpVerifying = true;
    // route to existing confirmation handler
    this.onOtpConfirm(code);
  }

  markInvalid(message: string = 'Incorrect OTP'): void {
    this.otpInvalid = true;
    this.otpError = message;
    this.otpVerifying = false;
    this.clearOtp();
    setTimeout(() => {
      if (this.otpInputs && this.otpInputs.first) {
        try { this.otpInputs.first.nativeElement.focus(); } catch (e) {}
      }
    }, 100);
  }

  markVerified(): void {
    this.otpInvalid = false;
    this.otpError = null;
    this.otpVerifying = false;
    this.stopOtpTimer();
  }

  private clearOtp(): void {
    this.otp = ['', '', '', ''];
    if (this.otpInputs) {
      this.otpInputs.forEach(i => { try { i.nativeElement.value = ''; } catch (e) {} });
    }
  }

  private startResendCooldown(seconds: number = 30): void {
    this.resendCooldown = seconds;
    this.isResendDisabled = true;
    if (this.resendSub) this.stopResendCooldown();
    this.resendSub = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        this.stopResendCooldown();
      }
    }, 1000);
  }

  private stopResendCooldown(): void {
    if (this.resendSub) {
      clearInterval(this.resendSub);
      this.resendSub = null;
    }
    this.isResendDisabled = false;
    this.resendCooldown = 0;
  }

  handleResendClick(): void {
    if (this.isResendDisabled) return;
    // trigger backend resend
    this.resendOtp();
    // start cooldown
    this.startResendCooldown();
  }

  /**
   * Return masked display value for modal subtitle
   */
  getMaskedDisplay(): string {
    if (this.currentVerificationType === 'email') {
      const e = this.maskedEmail || '';
      const parts = e.split('@');
      if (parts.length !== 2) return e;
      const local = parts[0];
      const domain = parts[1];
      const first = local.slice(0, 2);
      const last = local.slice(-3);
      return `${first}*****${last}@${domain}`;
    } else if (this.currentVerificationType === 'phone') {
      const p = this.maskedPhone || '';
      const digits = p.replace(/\D/g, '');
      if (digits.length <= 6) return p;
      const cc = p.replace(digits, '').trim();
      const first = digits.slice(0, 5);
      const last = digits.slice(-3);
      return `${cc} ${first}**${last}`;
    }
    return '';
  }
}
