import { Component, OnInit, Renderer2, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import {Router, ActivatedRoute} from "@angular/router";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {CoreService} from "../../core/services/core.service";
import { trigger, transition, style, animate } from '@angular/animations';


@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
  standalone: false,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in',
        style({ transform: 'translateX(-100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class SignupComponent implements AfterViewInit, OnInit {
  public signupForm: FormGroup;
  public profileForm:  FormGroup;
  public loginMode: 'email' | 'phone' = 'phone';
  public hidePassword = true;
  public whatsappConsent = true;
  public step !: number;

  public roleSelected !: 'child' | 'parent' | 'self';
  public gender !: 'male' | 'female';
  public avatarSelected:any;

  // Use an accessor so we can defensively guard and log unexpected changes
  private _openBirthdayPicker = false;
  public get openBirthdayPicker(): boolean {
    return this._openBirthdayPicker;
  }
  public set openBirthdayPicker(val: boolean) {
    // small debug log to catch unexpected auto-opens; safe to remove later
    if (val && !this._openBirthdayPicker) {
      console.debug('[Signup] openBirthdayPicker => true');
    } else if (!val && this._openBirthdayPicker) {
      console.debug('[Signup] openBirthdayPicker => false');
    }
    this._openBirthdayPicker = val;
  }
  public showAgeSuggestionModal = false;
  public computedAge: number | null = null;


  public stepDesciption = [
    'Sign Up to Begin',
    'Pick a Role to Move Forward',
    'Tell us about you',
    "They'll Grow with you, Cheer You on"
  ]

  public avatars = [
    {key: 1,gender: 'female', value: 'assets/app-assets/Onboarding-Avatars-female-1.svg'},
    {key: 2,gender: 'female', value: 'assets/app-assets/Onboarding-Avatars-female-2.svg'},
    {key: 3,gender: 'female', value: 'assets/app-assets/Onboarding-Avatars-female-3.svg'},
    {key: 4,gender: 'female', value: 'assets/app-assets/Onbarding-Avatars-female-4.svg'},
    {key: 5,gender: 'female', value: 'assets/app-assets/Onboarding-Avatars-female-5.svg'},
    {key: 6,gender: 'female', value: 'assets/app-assets/Onboarding-Avatars-female-6.svg'},
    {key: 7,gender: 'male', value: 'assets/app-assets/Onboarding-Avatars-male-1.svg'},
    {key: 8,gender: 'male', value: 'assets/app-assets/Onboarding-Avatars-male-2.svg'},
    {key: 9,gender: 'male', value: 'assets/app-assets/Onboarding-Avatars-male-3.svg'},
    {key: 10,gender: 'male', value: 'assets/app-assets/Onboarding-Avatars-male-4.svg'},
    {key: 11,gender: 'male', value: 'assets/app-assets/Onboarding-Avatars-male-5.svg'},
    {key: 12,gender: 'male', value: 'assets/app-assets/Onboarding-Avatars-male-6.svg'},
  ]

  @ViewChild('swiperEl', { static: false }) swiperEl?: ElementRef;
  @ViewChild('swiperEl', { static: false }) swiperRef!: ElementRef;

  images = [
    'https://picsum.photos/id/1011/600/400',
    'https://picsum.photos/id/1015/600/400',
    'https://picsum.photos/id/1019/600/400',
    'https://picsum.photos/id/1025/600/400',
  ];

  pets: any[] = [{
    name: 'Bubu the Panda',
    image: 'assets/app-assets/Onboarding-pet-selection-panda.svg',
    text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
  }, {
    name: 'Kiko the sky fox',
    image: 'assets/app-assets/Onboarding-pet-selection-sky-fox.svg',
    text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
  }, {
    name: 'Gradon the dragon',
    image: 'assets/app-assets/Onboarding-pet-selection-neon-dragon.svg',
    text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
  }]

  currentImage: any = this.pets[0];

  ngAfterViewInit(): void {
    if (!this.swiperRef?.nativeElement) {
      return;
    }
    const swiperEl = this.swiperRef.nativeElement;

    // Wait until Swiper instance is ready
    swiperEl.addEventListener('swiperinit', () => {
      const swiperInstance = swiperEl.swiper;
      this.currentImage = this.images[swiperInstance.realIndex];
    });

    swiperEl.addEventListener('swiperslidechange', () => {
      const swiperInstance = swiperEl.swiper;
      const realIndex = swiperInstance.realIndex;
      this.currentImage = this.pets[realIndex];
      console.log('Current image:', this.currentImage);
    });
  }

  ngOnInit(): void {
    // Defensive: ensure picker does not open automatically on init
    this.openBirthdayPicker = false;
  }

  attachSlideChangeListener(swiperEl: HTMLElement) {

  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private renderer: Renderer2,
    private router: Router,
    private core: CoreService
  ) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', []],
      phone: ['', []],
    });

    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      dob: [''],
    })
    this.route.queryParams.subscribe(params => {
      const stepParam = params['step'];
      this.step = Number(stepParam) || 1;
      this.renderer.setStyle(document.documentElement, '--step', this.step);
      // Ensure birthday picker doesn't open automatically when navigating to step 3
      this.openBirthdayPicker = false;
    })
  }

  get email() {
    return this.signupForm.get('email');
  }

  get phone(){
    return this.signupForm.get('phone');
  }
  get password(){
    return this.signupForm.get('password');
  }

  get name(){
    return this.profileForm.get('name');
  }

  switchMode(mode: 'email' | 'phone') {
    this.loginMode = mode;
  }

  signup(){
    this.router.navigate(['home/sign-up'], { queryParams: { step: 2 } });
  }

  dob(){
    return this.profileForm.get('dob');
  }

  proceedWithRole(){
    if(!this.roleSelected){
      this.core.triggerToasrt('Please select a role');
      return;
    }

    // proceed to next step without age validation
    this.router.navigate(['home/sign-up'], { queryParams: { step: 3 } });
  }

  proceedWithAvatar(){
    if(!this.avatarSelected){
      this.core.triggerToasrt('Please select an avatar');
      return;
    }

    // If role is 'self', complete signup and go to step 4 (pet selection)
    if (this.roleSelected === 'self') {
      this.router.navigate(['home/sign-up'], { queryParams: { step: 4 } });
      return;
    }

    // For child/parent: validate age and route accordingly
    const dobVal = this.profileForm.get('dob')?.value;
    const parsedDob = dobVal ? new Date(dobVal) : null;
    const age = parsedDob ? this.calculateAge(parsedDob) : null;

    if (age !== null) {
      // Child role: age < 24 is valid, age >= 24 shows popup
      if (this.roleSelected === 'child') {
        if (age < 24) {
          // Valid age for child role - go to child instructions
          this.router.navigate(['home/instructions-for-child'], { queryParams: { role: 'child' } });
          return;
        } else {
          // Age >= 24 - show suggestion popup
          this.showAgeSuggestionModal = true;
          return;
        }
      }
      
      // Parent role: age >= 24 is valid, age < 24 shows popup
      if (this.roleSelected === 'parent') {
        if (age >= 24) {
          // Valid age for parent role - go to parent instructions
          this.router.navigate(['home/instructions-for-parent'], { queryParams: { role: 'parent' } });
          return;
        } else {
          // Age < 24 - show suggestion popup repeatedly until correct age
          this.showAgeSuggestionModal = true;
          return;
        }
      }
    }

    // If no age provided, require age input
    if (age === null) {
      this.core.triggerToasrt('Please enter your date of birth');
      return;
    }

    // Fallback: continue to instructions with selected role
    this.router.navigate(['home/instructions-for-child'], { queryParams: { role: this.roleSelected } });
  }

  goBack(){
    if(this.step > 1){
      this.router.navigate(['home/sign-up'], { queryParams: { step: this.step-1 } });
    }
  }

  returnSameNumber(num: any){
    if(num === 1){
      return 'one';
    }else if(num === 2){
      return 'two';
    }else if (num === 3){
      return 'three';
    }else{
      return 'four';
    }
  }

  onSubmit() {
    if (this.signupForm.valid) {
      console.log(this.signupForm.value);
    }
  }

  onSlideChange() {
    console.log('Swiper slide change');
  }

  openBirthdayPickerNow() {
  // explicitly open the birthday picker only when user clicks the input
  this.openBirthdayPicker = true;
  }

  birthdayChanged(date: any){
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return;
    }

    this.profileForm.patchValue({
      dob: parsedDate.toISOString().slice(0, 10)
    })

    this.computedAge = this.calculateAge(parsedDate);
    // close the picker after choosing a date
    this.openBirthdayPicker = false;
    
    // Don't show popup automatically when birthday changes
    // Only show popup when user clicks Save & Continue with invalid age
  }

  private calculateAge(dob: Date): number | null {
    try {
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    } catch (e) {
      return null;
    }
  }

  closeAgeSuggestionModal(): void {
    this.showAgeSuggestionModal = false;
    // Reset the age modal state so it doesn't appear when navigating back to step 2
    // but can appear again if user clicks Save & Continue with wrong age
  }

  selectSelfRole(): void {
    this.roleSelected = 'self';
    this.showAgeSuggestionModal = false;
    // proceed directly to step 4 for Self role (pet selection)
    this.router.navigate(['home/sign-up'], { queryParams: { step: 4 } });
  }

  selectParentRole(): void {
    this.roleSelected = 'parent';
    this.showAgeSuggestionModal = false;
    // For child users switching to parent role, check age again
    const dobVal = this.profileForm.get('dob')?.value;
    const parsedDob = dobVal ? new Date(dobVal) : null;
    const age = parsedDob ? this.calculateAge(parsedDob) : null;
    
    if (age !== null && age >= 24) {
      // Age is valid for parent role, proceed to parent instructions
      this.router.navigate(['home/instructions-for-parent'], { queryParams: { role: 'parent' } });
    } else {
      // Stay on current step (step 3) so user can update their age
      // The validation will trigger again when they click Save & Continue
    }
  }

  protected readonly top = top;
}
