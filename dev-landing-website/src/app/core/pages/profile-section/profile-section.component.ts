import { Component, OnInit, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { FooterComponent } from '../../components/footer/footer.component';
import { UserProfileSidebarComponent } from '../../components/user-profile-sidebar/user-profile-sidebar.component';
import { SupermeButtonComponent } from '../../components/superme-button/superme-button.component';
import { SupermeBirthdaypickerComponent } from '../../components/superme-inputs/superme-birthdaypicker/superme-birthdaypicker.component';
import { SupermeToggleComponent } from '../../components/superme-selectors/superme-toggle/superme-toggle.component';
import {
  SupermeFactsComponent,
  FaqItem,
} from '../../components/superme-facts/superme-facts.component';
import { FamilyConnectionComponent } from '../../components/family-connection/family-connection.component';
import {
  AuthService,
  FamilyMember,
  FamilyDetailsResponse,
  EditProfilePayload,
  EditProfileResponse,
} from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { MoodService } from '../../services/mood.service';
import { ChildSelfImageService } from '../../services/child-self-image.service';
import { ParentImageService } from '../../services/parent-image.service';
import { VibesDisplayResponse } from '../../models/mood.model';
import { Router, RouterModule } from '@angular/router';
import { SupermeTimepickerComponent } from '../../components/superme-inputs/superme-timepicker/superme-timepicker.component';
import { CoinHelplineComponent } from '../coin-section/coin-helpline/coin-helpline.component';

@Component({
  selector: 'profile-section',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    FormsModule,
    RouterModule,
    PublicNavbarComponent,
    FooterComponent,
    UserProfileSidebarComponent,
    SupermeButtonComponent,
    SupermeFactsComponent,
    SupermeToggleComponent,
    FamilyConnectionComponent,
    SupermeBirthdaypickerComponent,
    SupermeTimepickerComponent,
    CoinHelplineComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile-section.component.html',
  styleUrls: ['./profile-section.component.scss'],
})
export class ProfileSectionComponent implements OnInit {
  user: any = {
    name: 'User',
    age: 0,
    email: '',
    // keep the fields navbar expects
    coins: 0,
    days: 0,
    badges: 0,
    trophies: 0,
    streaks: 0,
    gems: 0,
    avatar: 'assets/icon/child-avatar.png',
    relationship: null,
  };

  // Local user avatar URL
  userAvatarUrl: string = '/assets/Icons-Neutral/Child Avatar.png';
  avatarImageName: string | null = null;
  // Selected avatar image name to send to API (e.g. "Image-Onboarding-Avatar-Male2.png")
  avatarImageNameToSend: string = '';

  // Full avatar map matching ChildSelfImageService (key → alt name + filename)
  private readonly AVATAR_MAP = [
    {
      key: 1,
      alt: 'Avatar 1',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female1.png',
      file: 'Image-Onboarding-Avatar-Female1.png',
    },
    {
      key: 2,
      alt: 'Avatar 2',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female2.png',
      file: 'Image-Onboarding-Avatar-Female2.png',
    },
    {
      key: 3,
      alt: 'Avatar 3',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female3.png',
      file: 'Image-Onboarding-Avatar-Female3.png',
    },
    {
      key: 4,
      alt: 'Avatar 4',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female4.png',
      file: 'Image-Onboarding-Avatar-Female4.png',
    },
    {
      key: 5,
      alt: 'Avatar 5',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female5.png',
      file: 'Image-Onboarding-Avatar-Female5.png',
    },
    {
      key: 6,
      alt: 'Avatar 6',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female6.png',
      file: 'Image-Onboarding-Avatar-Female6.png',
    },
    {
      key: 7,
      alt: 'Avatar 7',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png',
      file: 'Image-Onboarding-Avatar-Male1.png',
    },
    {
      key: 8,
      alt: 'Avatar 8',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male2.png',
      file: 'Image-Onboarding-Avatar-Male2.png',
    },
    {
      key: 9,
      alt: 'Avatar 9',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male3.png',
      file: 'Image-Onboarding-Avatar-Male3.png',
    },
    {
      key: 10,
      alt: 'Avatar 10',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male4.png',
      file: 'Image-Onboarding-Avatar-Male4.png',
    },
    {
      key: 11,
      alt: 'Avatar 11',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male5.png',
      file: 'Image-Onboarding-Avatar-Male5.png',
    },
    {
      key: 12,
      alt: 'Avatar 12',
      url: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male6.png',
      file: 'Image-Onboarding-Avatar-Male6.png',
    },
  ];

  // Family data
  creator: FamilyMember | null = null;
  members: FamilyMember[] = [];

  // form model (binds to template)
  avatarName: string = '';
  fullName: string = '';
  dob: string = '';
  gender: 'male' | 'female' | '' = '';
  phoneCountry: string = '+91';
  phoneNumber: string = '';
  emailInput: string = '';

  // validation flags
  ageError: boolean = false;
  isLoading: boolean = false;
  isSaving: boolean = false;
  formDirty: boolean = false;
  emailChanged: boolean = false;
  emailVerified: boolean = false;
  toastMessage: string = '';
  toastVisible: boolean = false;
  toastIsError: boolean = false;
  private toastTimer: any = null;

  // store initial values for change detection
  private initialValues: {
    avatarName: string;
    avatarImageNameToSend: string;
    fullName: string;
    dob: string;
    gender: string;
    phoneCountry: string;
    phoneNumber: string;
    emailInput: string;
  } | null = null;

  // UI selection state for which panel is open (edit, password, pet, etc.)
  selectedItem: string = 'edit';
  showHelpline = false;

  // password form model
  currentPassword: string = '';
  newPassword: string = '';
  retypePassword: string = '';
  passwordMismatch: boolean = false;
  passwordChanging: boolean = false;
  passwordChangeSuccess: boolean = false;
  passwordChangeError: string = '';
  @ViewChild('passwordForm') passwordForm!: NgForm;

  // notifications model
  notificationList = [
    {
      key: 'push',
      title: 'Habit Reminders',
      desc: 'Get nudges for habits (e.g., study, exercise). Your panda will cheer you on!',
    },
    {
      key: 'email',
      title: 'Milestone Progress',
      desc: 'Get alerts when you are close to unlocking badges',
    },
    {
      key: 'sms',
      title: 'New Content & Features',
      desc: 'Discover new courses, quizes, puzzles and ways to level up your skills.',
    },
    {
      key: 'weekly',
      title: 'Coin & Reward Alerts',
      desc: 'Get notified when you earn coins, unlock rewards, or can redeem something special.',
    },
  ];

  notificationsSettings: { [k: string]: boolean } = {};
  notificationsDirty: boolean = false;

  // Quiet hours start/end (displayed and editable via timepicker)
  quietStart: string = '10:30 PM';
  quietEnd: string = '07:30 AM';

  // Keep a private reference so the imported standalone component is treated as "used"
  // by the language service (prevents false 'not used in template' diagnostics).
  // This has no runtime effect.
  private _timepickerRef = SupermeTimepickerComponent;

  // pet selection model
  pets = [
    {
      id: 'panda',
      name: 'Bao the Mindful Panda',
      bullets: ['Your gentle guide to inner peace', 'Celebrates small acts of kindness'],
      img: 'assets/Images-Pet/Panda-Age2-Base.png',
      isLocked: false,
    },
    {
      id: 'dragon',
      name: 'Zuki the Fierce Dragon',
      bullets: ['Loves big ideas and bold moves', 'Celebrates when you go on streaks'],
      img: 'assets/Images-Pet/Dragon-Age2-Base.png',
      isLocked: true,
    },
    {
      id: 'owl',
      name: 'Luna the Wise Owl',
      bullets: ['Your midnight study buddy', 'Celebrates "aha" moments'],
      img: 'assets/Images-Pet/Owl-Age2-Base.png',
      isLocked: true,
    },
    {
      id: 'llama',
      name: 'Koda the Chill Llama',
      bullets: ['Master of staying cool under pressure', 'Loves colorful, quirky adventures'],
      img: 'assets/Images-Pet/Llama-Age2-Base.png',
      isLocked: true,
    },
  ];

  selectedPetIndex: number = 0;

  selectPet(i: number) {
    if (this.pets[i]?.isLocked) return;
    this.selectedPetIndex = i;
  }

  updatePet() {
    const pet = this.pets[this.selectedPetIndex];
    if (pet) {
      // set the user's avatar to the pet image (in a real app call backend)
      this.user.avatar = pet.img;
      console.log('Pet updated to', pet.id);
    }
  }

  // membership model
  membership = {
    plan: 'Elite Club',
    status: 'Active',
    renewalDate: 'April 25, 2025',
    costText: '₹150/month',
    paymentMethodIcon: 'assets/icon/coin-large.png',
    billingEmail: 'b.....@oksbi',
    benefits: ['Premium Content', 'Trophy boost', 'Cultural & faith learnings'],
  };

  // billing UI state
  showBillingDetails: boolean = false;

  // simple payment history demo
  paymentHistory: Array<{ date: string; desc: string; amountText: string; provider?: string }> = [
    {
      date: 'March 25, 2025',
      desc: 'Membership: March 25 - April 25',
      amountText: '₹150',
      provider: 'GPay',
    },
    {
      date: 'February 25, 2025',
      desc: 'Membership: Feb 25 - March 25',
      amountText: '₹150',
      provider: 'GPay',
    },
    {
      date: 'January 25, 2025',
      desc: 'Membership: Jan 25 - Feb 25',
      amountText: '₹150',
      provider: 'GPay',
    },
  ];

  // Refer-a-friend model
  referralCode: string = '';
  referralCodeLoading: boolean = false;
  // optional gift artwork (set to an asset path to use an image instead of the icon)
  // using provided asset path for referral gift illustration
  giftImg: string = 'assets/images/referral-gift.png';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private moodService: MoodService,
    private childSelfImageService: ChildSelfImageService,
    public parentImageService: ParentImageService,
    private router: Router,
  ) {}

  // Parental control steps
  parentalSteps: string[] = [
    'Did your parent already set this up? If yes, click done',
    'If not, open Settings and then tap on Apps',
    'Click on "Special app access"',
    'Go to "Usage Access" and then allow permission for our App',
    'Then go Back and click on "Display over other apps"',
    'Give permission for our App',
    'Tap on Done when you are finished',
  ];

  parentalDone: boolean = false;

  // Family model
  family = {
    name: "Chandran's Family",
    active: true,
    createdOn: 'Mar 15 2025',
    owner: { initials: 'CH', name: 'Chandran', age: 35, roleLabel: 'Parent / Creator', avatar: '' },
    members: [
      {
        id: 'm1',
        name: 'Still Panda',
        age: 12,
        role: 'Child',
        avatar: 'assets/images/panda-avatar-1.png',
        isYou: false,
      },
      {
        id: 'm2',
        name: 'Lara',
        age: 32,
        role: 'Parent',
        avatar: 'assets/images/panda-avatar-2.png',
        isYou: false,
      },
      {
        id: 'm3',
        name: 'Still Panda',
        age: 12,
        role: 'Child / You',
        avatar: 'assets/images/panda-avatar-3.png',
        isYou: true,
      },
    ] as Array<{
      id: string;
      name: string;
      age: number;
      role: string;
      avatar: string;
      isYou?: boolean;
    }>,
  };

  doneParental() {
    this.parentalDone = true;
    console.log('Parental setup completed (user clicked Done)');
    // In a real app, track analytics or call backend if needed
  }

  faqs: FaqItem[] = [
    {
      question: 'How does this work?',
      answer:
        'Copy the code and share it with a friend. When they sign up with your code both of you get rewards.',
    },
    {
      question: 'The code is not working',
      answer: 'Make sure the friend enters the code on signup. If issues persist contact support.',
    },
    {
      question: 'I cannot copy the code',
      answer: 'Press the copy button to copy the code. You can also share via WhatsApp directly.',
    },
  ];

  // Family-specific FAQs (used by the family view)
  familyFaqs: FaqItem[] = [
    {
      question: 'How do I invite family members?',
      answer:
        'Use the referral code or invite link in the Family section to invite members to your family.',
    },
    {
      question: 'Can I remove a member?',
      answer: 'Yes — the family creator (parent) can remove members from the family settings.',
    },
    {
      question: 'Will my data be retained if family is removed?',
      answer:
        'Yes — your personal learning data remains safe. Family-specific links will be cleared.',
    },
  ];

  toggleFaq(i: number) {
    this.faqs[i].open = !this.faqs[i].open;
  }

  copyReferralCode() {
    const text = this.referralCode || '';
    if (!text) return;
    try {
      if (navigator && (navigator as any).clipboard && (navigator as any).clipboard.writeText) {
        (navigator as any).clipboard
          .writeText(text)
          .then(() => {
            console.log('Referral code copied');
          })
          .catch((err: any) => {
            console.warn('Clipboard write failed', err);
          });
      } else {
        // fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        console.log('Referral code copied (fallback)');
      }
    } catch (e) {
      console.error('Copy failed', e);
    }
  }

  inviteViaWhatsApp() {
    const message = encodeURIComponent(
      `Join me on SuperMe! Use my referral code ${this.referralCode} to get rewards.`,
    );
    const url = `https://wa.me/?text=${message}`;
    try {
      window.open(url, '_blank');
    } catch (e) {
      console.error('Could not open WhatsApp share', e);
    }
  }

  // Feedback & Suggestions model
  feedbackRating: number | null = null; // 1..4
  feedbackText1: string = '';
  feedbackText2: string = '';
  submitting: boolean = false;
  feedbackSubmitted: boolean = false;

  submitFeedback() {
    if (this.submitting) return;
    this.submitting = true;
    const payload = {
      rating: this.feedbackRating,
      feedback1: this.feedbackText1,
      feedback2: this.feedbackText2,
      user: this.user.email,
    };
    console.log('Submitting feedback', payload);
    setTimeout(() => {
      this.submitting = false;
      this.feedbackRating = null;
      this.feedbackText1 = '';
      this.feedbackText2 = '';
      this.feedbackSubmitted = true;
    }, 800);
  }

  // Help & Support model
  faqCategories: { category: string; items: FaqItem[] }[] = [
    {
      category: 'Account & Access',
      items: [
        {
          question: "What if I can't log in?",
          answer:
            "Try resetting your password from the login screen. If the problem persists, contact support and we'll help you regain access.",
        },
        {
          question: 'How do I reconnect with my family?',
          answer:
            'Go to My Family in the profile menu and use the family code or invite link to reconnect with your family members.',
        },
        {
          question: 'What if my pet disappeared?',
          answer:
            "Don't worry! Your pet is safe. Go to Change Your Pet in the profile menu to find and reselect your buddy.",
        },
        {
          question: 'How do I change my password?',
          answer:
            'Go to Password and Security in the profile menu and tap Change Password to update your credentials.',
        },
      ],
    },
    {
      category: 'Pets & Rewards',
      items: [
        {
          question: 'How do I earn more coins?',
          answer:
            'Complete habits, tasks, quizzes, and journal entries daily to earn coins. Streaks give bonus rewards!',
        },
        {
          question: "Why won't my pet wear the accessory I bought?",
          answer:
            'Make sure the accessory is compatible with your pet. Go to your pet screen and tap the accessory to equip it.',
        },
        {
          question: 'Can I trade pets with friends?',
          answer:
            'Pet trading is not available yet, but we are working on social features. Stay tuned!',
        },
        {
          question: 'How do I customize my pet?',
          answer:
            'Go to Change Your Pet in the profile menu. You can select your pet and equip accessories from your collection.',
        },
      ],
    },
    {
      category: 'Habits & Tasks',
      items: [
        {
          question: "Why isn't my habit marked as done?",
          answer:
            'Make sure you tapped the complete button before midnight. Habits reset daily so they must be checked off each day.',
        },
        {
          question: 'Can I edit a habit after creating it?',
          answer:
            'Yes! Open the habit from your habit list and tap the edit icon to change the name, schedule, or goal.',
        },
        {
          question: 'What if I miss a streak?',
          answer:
            'Missing a day breaks your streak. You can use a streak buyback with coins to restore it if you have enough balance.',
        },
        {
          question: "How do I delete a habit I don't want anymore?",
          answer: 'Open the habit, tap the options menu, and select Delete. This cannot be undone.',
        },
      ],
    },
    {
      category: 'Parent Controls',
      items: [
        {
          question: 'Why did my parents block an app?',
          answer:
            'Your parent may have set restrictions on certain content or features. Talk to them or ask them to adjust settings in the Parent Dashboard.',
        },
        {
          question: 'Can I hide my journal from parents?',
          answer:
            'Journal entries are private by default. Parents with linked accounts may have view access depending on settings.',
        },
        {
          question: 'Why is my screen time limited?',
          answer:
            'Your parent has set a daily screen time limit through Parental Controls. Ask them to adjust it if needed.',
        },
        {
          question: 'How can I ask my parents to unblock something?',
          answer:
            'You can send a request through the app or speak to your parent directly. They can update permissions from the Parent Dashboard.',
        },
      ],
    },
    {
      category: 'Troubleshooting',
      items: [
        {
          question: 'What if the app crashes during my habit?',
          answer:
            'Your progress is auto-saved. Restart the app and check your habit — it should still show the progress you made.',
        },
        {
          question: "What if my rewards don't load?",
          answer:
            'Check your internet connection and try refreshing. If the issue continues, contact support with a screenshot.',
        },
        {
          question: 'Why is the pet animation glitchy?',
          answer:
            'Try closing and reopening the app. If the issue persists on your device, let us know and we will look into it.',
        },
        {
          question: "What if my progress didn't save?",
          answer:
            'Progress is synced when you have an internet connection. Make sure you are online and try again. Contact support if data is missing.',
        },
      ],
    },
  ];

  toggleHelpFaq(catIndex: number, itemIndex: number) {
    const item = this.faqCategories[catIndex].items[itemIndex];
    item.open = !item.open;
  }

  startSupportChat() {
    // Placeholder: open support chat or mailto for now
    try {
      window.open('mailto:support@yourapp.com?subject=Support%20Request', '_blank');
    } catch (e) {
      console.error('Could not start chat', e);
    }
  }

  // Policies panel state
  selectedPolicyTab: 'terms' | 'privacy' = 'privacy';

  // Terms and privacy content (use same font/family in styles)
  termsHtml: string = `
    <h4>What do we collect?</h4>
    <p>[App Name] is designed to help you build healthy habits while having fun with your virtual pet. By using this app, you agree to:</p>
    <ul>
      <li>Use the app responsibly (no bullying, cheating, or harmful behavior).</li>
      <li>Be at least 11 years old or have parental consent if younger.</li>
      <li>Let parents manage your account's privacy settings and purchases.</li>
      <li>Follow community guidelines to keep the app safe for everyone.</li>
    </ul>
    <p>We may update these terms occasionally. Continued use means you accept the changes. Violating rules may result in account suspension.</p>
  `;

  privacyHtml: string = `
    <h4>What do we collect?</h4>
    <p>We collect minimal personal information required to operate the service: basic account details, device identifiers, and usage statistics. We use this data to:</p>
    <ul>
      <li>Provide and improve the service</li>
      <li>Personalize your experience</li>
      <li>Process transactions and support</li>
    </ul>
    <p>We do not sell your personal data. For more details, contact support@yourapp.com.</p>
  `;

  selectPolicyTab(tab: 'terms' | 'privacy') {
    this.selectedPolicyTab = tab;
  }

  // Delete My Data state and handler
  deleteConfirmChecked: boolean = false;
  deleting: boolean = false;

  deleteAccount() {
    if (!this.deleteConfirmChecked || this.deleting) return;
    this.deleting = true;
    console.log('Deleting user data for', this.user.email);
    // Simulate delete action (replace with API call in real app)
    setTimeout(() => {
      // demo: clear some user fields and go back to edit panel
      this.user = {
        name: '',
        age: 0,
        email: '',
        coins: 0,
        trophies: 0,
        streaks: 0,
        gems: 0,
        avatar: '',
      } as any;
      this.deleting = false;
      this.deleteConfirmChecked = false;
      this.selectedItem = 'edit';
      console.log('User data deleted (demo)');
    }, 900);
  }

  openBillingDetails() {
    // show billing details view inside membership panel
    this.showBillingDetails = true;
    console.log('Open billing details for', this.membership.plan);
    // scroll the membership card into view when billing details are opened
    try {
      setTimeout(() => {
        const el = document.querySelector('.membership-card') as HTMLElement | null;
        const offset = 80; // pixels of extra space from top
        if (el) {
          // compute the top position and apply an offset so the panel isn't flush to the very top
          const rect = el.getBoundingClientRect();
          const top = Math.max(window.scrollY + rect.top - offset, 0);
          window.scrollTo({ top, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    } catch (e) {
      console.warn('Auto-scroll to billing failed', e);
    }
  }

  closeBillingDetails() {
    this.showBillingDetails = false;
  }

  renewMembership() {
    console.log('Renew membership clicked');
    // TODO: hook to payment flow
  }

  cancelMembership() {
    console.log('Cancel membership clicked');
    // TODO: show confirm & call backend
  }

  isParent(): boolean {
    return (this.user?.relationship ?? '').toString().toUpperCase() === 'PARENT';
  }

  showToast(message: string, isError = false): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastIsError = isError;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
    }, 3000);
  }

  // Called from template on any field change to recompute dirty state
  checkDirty(): void {
    if (!this.initialValues) {
      this.formDirty = true;
      return;
    }
    const iv = this.initialValues;
    const currentPhone = `${this.phoneCountry}${(this.phoneNumber || '').replace(/\D/g, '')}`;
    const initialPhone = `${iv.phoneCountry}${(iv.phoneNumber || '').replace(/\D/g, '')}`;
    this.emailChanged = (iv.emailInput || '') !== (this.emailInput || '');
    if (this.emailChanged) {
      this.emailVerified = false;
    } else {
      // Email typed back to original — reset OTP state
      this.otpSent = false;
      this.emailVerified = false;
    }
    this.formDirty =
      (iv.fullName || '') !== (this.fullName || '') ||
      (iv.dob || '') !== (this.dob || '') ||
      (iv.gender || '') !== (this.gender || '') ||
      currentPhone !== initialPhone ||
      this.emailChanged ||
      (iv.avatarName || '') !== (this.avatarName || '') ||
      (iv.avatarImageNameToSend || '') !== (this.avatarImageNameToSend || '');
  }

  // Called when user picks a new avatar image in the sidebar picker
  onAvatarSelected(url: string): void {
    const entry = this.AVATAR_MAP.find((a) => a.url === url || a.url === url.replace(/^\//, ''));
    if (entry) {
      this.userAvatarUrl = entry.url;
      this.avatarImageName = entry.alt;
      this.avatarImageNameToSend = entry.file;
      this.user = { ...this.user, avatarUrl: entry.url };
      this.checkDirty();
    }
  }

  // compute and set age from dob when necessary
  updateAgeFromDob() {
    if (!this.dob) return;
    const b = new Date(this.dob);
    if (isNaN(b.getTime())) return;
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    this.user.age = age;
    // Validate age for child role (cannot be more than 24 years old)
    this.ageError = age > 24;
  }

  /**
   * Handler for `superme-birthdaypicker` output. Normalizes selected Date to YYYY-MM-DD string
   * and updates age/validation.
   */
  onDobSelected(date: Date | string) {
    if (!date) return;
    const d = new Date(date as any);
    if (isNaN(d.getTime())) return;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    this.dob = `${y}-${m}-${day}`;
    this.updateAgeFromDob();
    this.validateAge();
  }

  updateInfo() {
    if (this.isSaving) return;

    // Basic client-side validation (keep UI unchanged)
    if (!this.fullName || !this.fullName.trim()) {
      console.error('[ProfileSection] Full name is required');
      return;
    }
    if (!this.dob) {
      console.error('[ProfileSection] Date of birth is required');
      return;
    }
    if (!this.gender) {
      console.error('[ProfileSection] Gender is required');
      return;
    }

    // Phone validation: treat empty as invalid here because template marks it required,
    // but also validate pattern/length for selected country
    if (!this.isPhoneValid(this.phoneNumber)) {
      console.error('[ProfileSection] Invalid phone number for', this.phoneCountry);
      return;
    }

    // Basic email check
    if (!this.emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.emailInput)) {
      console.error('[ProfileSection] Invalid email');
      return;
    }

    // Block update if email changed but not yet verified via OTP
    if (this.emailChanged && !this.emailVerified) {
      this.showToast('Please verify your new email before updating.', true);
      return;
    }

    // Build a payload that contains only changed fields
    const payload = this.buildChangedPayload();
    if (!payload || Object.keys(payload).length === 0) {
      console.log('[ProfileSection] No changes detected. Nothing to update.');
      return;
    }

    this.isSaving = true;
    console.log('[ProfileSection] Updating profile (changed fields only):', payload);

    this.authService.editProfile(payload).subscribe({
      next: (response: EditProfileResponse) => {
        this.isSaving = false;
        console.log('[ProfileSection] Profile updated successfully:', response);

        // Update local user object
        this.user.name = response.name || this.user.name;
        this.user.age = response.age || this.user.age;
        this.user.email = response.email || this.user.email;
        this.user.gender = response.gender || this.user.gender;
        if (response.avatar && response.avatar.avatarName)
          this.avatarName = response.avatar.avatarName;

        // Use avatar URL directly from API response
        const updatedAvatarUrl = response.avatar?.url || this.userAvatarUrl;

        // Persist everything back to localStorage so re-init reads fresh data
        try {
          const userData = localStorage.getItem('user_data');
          if (userData) {
            const parsed = JSON.parse(userData);
            if (response.name) parsed.name = response.name;
            if (response.email) parsed.email = response.email;
            if (response.phone) parsed.phone = response.phone;
            if (response.gender) parsed.gender = response.gender;
            if (response.age !== undefined) parsed.age = response.age;
            if (response.dateOfBirth) parsed.dateOfBirth = response.dateOfBirth;
            parsed.avatar = {
              ...(parsed.avatar || {}),
              ...(response.avatar || {}),
              url: updatedAvatarUrl,
            };
            localStorage.setItem('user_data', JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('[ProfileSection] Error updating localStorage:', e);
        }

        // Update user service — this refreshes both navbars dynamically
        this.userService.updateUserProfile({
          name: response.name || this.user.name,
          email: response.email || this.user.email,
          phone: response.phone || this.phoneCountry + this.phoneNumber,
          age: response.age || this.user.age,
          gender: (response.gender || this.user.gender)?.toLowerCase() as 'male' | 'female',
          avatarUrl: updatedAvatarUrl,
        });

        // Also update the avatar shown in this component
        this.userAvatarUrl = updatedAvatarUrl;
        this.user = {
          ...this.user,
          avatarUrl: updatedAvatarUrl,
          name: response.name || this.user.name,
        };

        // refresh stored initial values so button disables again
        this.storeInitialValues();
        this.showToast('Profile updated successfully!');

        console.log('[ProfileSection] Profile saved successfully!');
      },
      error: (error) => {
        this.isSaving = false;
        console.error('[ProfileSection] Failed to update profile:', error);
      },
    });
  }

  /**
   * Capture the initial values for change detection
   */
  private storeInitialValues(): void {
    this.initialValues = {
      avatarName: this.avatarName || '',
      avatarImageNameToSend: this.avatarImageNameToSend || '',
      fullName: this.fullName || '',
      dob: this.dob || '',
      gender: this.gender || '',
      phoneCountry: this.phoneCountry || '',
      phoneNumber: this.phoneNumber || '',
      emailInput: this.emailInput || '',
    };
    this.formDirty = false;
    this.emailChanged = false;
    this.emailVerified = false;
    console.log('[ProfileSection] Initial values stored:', this.initialValues);
  }

  private hasFieldChanged(field: string, current: any): boolean {
    if (!this.initialValues) return true;
    const init = (this.initialValues as any)[field];
    return (init || '') !== (current || '');
  }

  private buildChangedPayload(): any | null {
    if (!this.initialValues) {
      return {
        avatarName: this.avatarName || undefined,
        avatarImageName: this.avatarImageNameToSend || undefined,
        name: this.fullName?.trim() || undefined,
        dateOfBirth: this.formatDateForBackend(this.dob || ''),
        gender: this.gender ? this.gender.toUpperCase() : undefined,
        phone: this.phoneCountry + (this.phoneNumber || ''),
        email: this.emailInput || undefined,
      };
    }

    const payload: any = {};
    if (this.hasFieldChanged('fullName', this.fullName)) payload.name = this.fullName?.trim();
    const formattedDob = this.formatDateForBackend(this.dob || '');
    if (this.hasFieldChanged('dob', this.dob) && formattedDob) payload.dateOfBirth = formattedDob;
    if (this.hasFieldChanged('gender', this.gender))
      payload.gender = this.gender ? this.gender.toUpperCase() : '';
    const currentPhoneFull = `${this.phoneCountry}${(this.phoneNumber || '').replace(/\D/g, '')}`;
    const initialPhoneFull = `${this.initialValues.phoneCountry}${(this.initialValues.phoneNumber || '').replace(/\D/g, '')}`;
    if (currentPhoneFull !== initialPhoneFull) payload.phone = currentPhoneFull;
    if (this.hasFieldChanged('emailInput', this.emailInput))
      payload.email = this.emailInput?.trim();
    if (this.hasFieldChanged('avatarName', this.avatarName))
      payload.avatarName = this.avatarName?.trim();
    if (this.hasFieldChanged('avatarImageNameToSend', this.avatarImageNameToSend))
      payload.avatarImageName = this.avatarImageNameToSend;

    return Object.keys(payload).length ? payload : null;
  }

  private formatDateForBackend(dateString: string): string {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return dateString;
    }
  }

  // Basic phone helpers
  private get currentPhoneLength(): number {
    if (this.phoneCountry === '+91') return 10;
    if (this.phoneCountry === '+1') return 10;
    if (this.phoneCountry === '+44') return 10;
    return 10;
  }

  get phoneMaxLength(): number {
    return this.currentPhoneLength;
  }

  isPhoneValid(phoneValue: string | null | undefined): boolean {
    if (!phoneValue) return false; // template marks phone required
    const clean = (phoneValue || '').replace(/\D/g, '');
    return clean.length === this.currentPhoneLength;
  }

  isEmailValid(email?: string | null): boolean {
    if (!email) return false;
    const v = (email || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  getPhoneErrorMessage(): string {
    return `Please enter a valid ${this.currentPhoneLength} digit phone number for ${this.phoneCountry}`;
  }

  // Numeric-only input handler for phone inputs (bound in template if needed later)
  onKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onPhoneInput(event: any): void {
    const input = event?.target as HTMLInputElement | undefined;
    if (!input) return;
    const numeric = input.value.replace(/[^0-9]/g, '').slice(0, this.currentPhoneLength);
    this.phoneNumber = numeric;
    try {
      input.setSelectionRange(numeric.length, numeric.length);
    } catch {}
    this.checkDirty();
  }

  /**
   * Trigger phone verification flow (placeholder).
   * In a real app this should call an API to send an OTP / verification code.
   */
  verifyPhone(): void {
    if (!this.isPhoneValid(this.phoneNumber)) {
      console.warn(
        '[ProfileSection] Cannot verify: invalid phone number',
        this.phoneCountry + this.phoneNumber,
      );
      return;
    }

    const fullPhone = `${this.phoneCountry}${this.phoneNumber}`;
    // mask phone like +91 78924**059
    const clean = (this.phoneNumber || '').replace(/\D/g, '');
    let masked = clean;
    if (clean.length >= 8) {
      const first = clean.slice(0, 5);
      const last = clean.slice(-3);
      masked = `${first}**${last}`;
    } else if (clean.length >= 4) {
      const first = clean.slice(0, Math.max(1, clean.length - 3));
      const last = clean.slice(-3);
      masked = `${first}**${last}`;
    }
    const target = `${this.phoneCountry} ${masked}`;
    // Simulate sending OTP, then open modal
    console.log('[ProfileSection] Sending OTP to', fullPhone);
    setTimeout(() => {
      this.openVerifyModal('phone', target);
    }, 300);
  }

  /**
   * Trigger email verification flow (placeholder).
   * In a real app this should call an API to send a verification email or code.
   */
  verifyEmail(): void {
    const email = (this.emailInput || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    const parts = email.split('@');
    let masked = email;
    if (parts.length === 2) {
      const visible = parts[0].slice(0, Math.min(2, parts[0].length));
      masked = `${visible}***@${parts[1]}`;
    }

    // If OTP already sent, reopen modal and resume existing timer (don't resend)
    if (this.otpSent) {
      this.showVerifyModal = true;
      if (this.countdownSeconds > 0 && !this._countdownTimer) {
        this._startCountdown();
      }
      return;
    }

    // Open modal immediately, send OTP in background
    this.otpSent = true;
    this.countdownSeconds = 120; // set once on first send
    this.openVerifyModal('email', masked);

    this.authService.registerRequestOtp(email).subscribe({
      next: () => {},
      error: (err: any) => {
        this.otpSent = false;
        this.closeVerifyModal();
        this.showToast(err?.error?.message || 'Failed to send OTP. Please try again.', true);
      },
    });
  }

  resendOtp(): void {
    const email = (this.emailInput || '').trim();
    this.authService.registerRequestOtp(email).subscribe({
      next: () => {
        this.otp = ['', '', '', ''];
        this.countdownSeconds = 120;
        this._startCountdown();
        this.showToast('OTP resent successfully!');
      },
      error: (err: any) => {
        this.showToast(err?.error?.message || 'Failed to resend OTP.', true);
      },
    });
  }

  // Modal / OTP state
  showVerifyModal: boolean = false;
  verifyMode: 'phone' | 'email' | null = null;
  maskedTarget: string = '';
  otp: string[] = ['', '', '', ''];
  countdownSeconds: number = 120;
  otpSent: boolean = false;
  private _countdownTimer: any = null;

  get minutes(): string {
    const m = Math.floor(this.countdownSeconds / 60);
    return String(m);
  }

  get secondsPadded(): string {
    const s = this.countdownSeconds % 60;
    return s < 10 ? '0' + s : String(s);
  }

  openVerifyModal(mode: 'phone' | 'email', target: string): void {
    this.verifyMode = mode;
    this.maskedTarget = target;
    this.otp = ['', '', '', ''];
    this.showVerifyModal = true;
    // Start timer only on first open (not on reopen after close)
    if (!this._countdownTimer && this.countdownSeconds > 0) {
      this._startCountdown();
    }
  }

  closeVerifyModal(): void {
    this.showVerifyModal = false;
    this.verifyMode = null;
    this.otpSent = false;
    this.otp = ['', '', '', ''];
    this.countdownSeconds = 0;
    this._clearCountdown();
  }

  private _startCountdown(): void {
    if (this._countdownTimer) clearInterval(this._countdownTimer);
    this._countdownTimer = setInterval(() => {
      if (this.countdownSeconds > 0) {
        this.countdownSeconds -= 1;
      } else {
        this._clearCountdown(); // stop timer, modal stays open
      }
    }, 1000);
  }

  private _clearCountdown(): void {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }

  onOtpInput(event: any, index: number): void {
    const val = (event.target.value || '').replace(/[^0-9]/g, '').slice(0, 1);
    this.otp[index] = val;
    event.target.value = val;
    // move focus to next input if filled
    if (val && index < this.otp.length - 1) {
      const inputs = Array.from(
        document.querySelectorAll('.verify-modal .otp-box'),
      ) as HTMLInputElement[];
      if (inputs[index + 1]) inputs[index + 1].focus();
    }
  }

  isOtpComplete(): boolean {
    return this.otp.every((d) => d && d.length === 1);
  }

  confirmOtp(): void {
    if (!this.isOtpComplete()) return;
    const code = this.otp.join('');

    if (this.verifyMode === 'email') {
      const email = (this.emailInput || '').trim();
      this.authService.registerVerifyOtp(email, code).subscribe({
        next: () => {
          this.emailVerified = true;
          this.closeVerifyModal();
          this.showToast('Email verified successfully!');
        },
        error: (err: any) => {
          this.showToast(err?.error?.message || 'Invalid OTP. Please try again.', true);
        },
      });
    } else {
      this.closeVerifyModal();
    }
  }

  // Age calculation + validation matching MindfulBuddy rules
  get calculatedAge(): string {
    if (!this.dob) return '';
    const birth = new Date(this.dob);
    if (isNaN(birth.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? `${age} year${age !== 1 ? 's' : ''} old` : '';
  }

  validateAge(): void {
    this.ageError = false;
    if (!this.dob) return;
    const birth = new Date(this.dob);
    if (isNaN(birth.getTime())) return;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    const rel = String(this.user?.relationship || '').toLowerCase();
    if (rel === 'child') {
      if (age > 18) this.ageError = true; // child cannot be older than 18
    } else if (rel === 'parent') {
      if (age < 24) this.ageError = true; // parent cannot be less than 24
    }
  }

  changePassword() {
    // basic client-side validation
    // ensure mismatch flag is up to date
    this.checkPasswordMatch();
    if (!this.currentPassword || !this.newPassword || this.passwordMismatch) {
      return;
    }

    this.passwordChanging = true;
    this.passwordChangeError = '';
    this.passwordChangeSuccess = false;

    this.authService
      .changePassword(this.currentPassword, this.newPassword, this.retypePassword)
      .subscribe({
        next: () => {
          this.passwordChanging = false;
          this.passwordChangeSuccess = true;
          this.passwordMismatch = false;
          if (this.passwordForm) {
            this.passwordForm.resetForm();
          }
          this.showToast('Password changed successfully!');
        },
        error: (error) => {
          this.passwordChanging = false;
          const msg =
            error?.error?.message || error?.error || 'Failed to change password. Please try again.';
          this.passwordChangeError = msg;
          this.showToast(msg, true);
        },
      });
  }

  // called when the new or retype password fields change to update mismatch state
  checkPasswordMatch() {
    this.passwordMismatch = !!(
      this.newPassword &&
      this.retypePassword &&
      this.newPassword !== this.retypePassword
    );
  }

  ngOnInit(): void {
    const nav = (history && (history.state as any)) as any;
    if (nav && nav.user) {
      this.user = { ...this.user, ...nav.user };
    }
    if (nav?.section === 'notifications') {
      this.selectedItem = 'notifications';
    }

    // Load user data from localStorage (set during login)
    this.loadUserDataFromStorage();
    // Load user stats from localStorage first, then API if not available
    this.loadUserStatsFromStorage();
    // Load family details if user is a parent
    if (this.user?.relationship === 'PARENT') {
      this.loadFamilyDetails();
    }
    // Load referral code
    this.loadReferralCode();

    // Subscribe to user profile changes
    this.userService.getUserProfile$().subscribe((profile) => {
      if (profile && this.user) {
        this.user.name = profile.name || 'User';
        // Update form fields if they are empty
        if (!this.avatarName) this.avatarName = profile.name || '';
        if (!this.emailInput) this.emailInput = profile.email || '';
      }
    });

    // Initialize age validation
    this.updateAgeFromDob();

    // Initialize notifications settings with sensible defaults
    const defaults: { [k: string]: boolean } = {
      push: true,
      email: true,
      sms: false,
      weekly: true,
      rewards: true,
      appUpdates: true,
    };

    // load from localStorage if available (simple demo persistence)
    try {
      const saved = localStorage.getItem('superme.notifications');
      if (saved) {
        this.notificationsSettings = { ...defaults, ...JSON.parse(saved) };
      } else {
        this.notificationsSettings = { ...defaults };
      }
    } catch (e) {
      this.notificationsSettings = { ...defaults };
    }
  }

  /**
   * Load user data from localStorage and map to component properties
   */
  private loadUserDataFromStorage(): void {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const parsedData = JSON.parse(userData);
        console.log('[ProfileSection] Loaded user_data from localStorage:', parsedData);

        // Use avatar URL from API (stored in localStorage after save), fall back to local resolution
        const apiAvatarUrl = parsedData.avatar?.url;
        const resolved = this.childSelfImageService.resolveAvatarFromUser(parsedData);
        this.userAvatarUrl = apiAvatarUrl || resolved.url || this.userAvatarUrl;
        if (resolved.alt) {
          this.avatarImageName = resolved.alt;
          const entry = this.AVATAR_MAP.find((a) => a.alt === resolved.alt);
          if (entry) this.avatarImageNameToSend = entry.file;
        }

        // Map user basic info
        this.user = {
          ...this.user,
          name: parsedData.name || 'User',
          email: parsedData.email,
          phone: parsedData.phone,
          age: parsedData.age,
          gender: parsedData.gender,
          avatarUrl: this.userAvatarUrl,
          relationship: parsedData.relationship,
        };

        // Update form fields — avatarName is the in-app nickname stored on the avatar object
        this.avatarName = parsedData.avatar?.avatarName || '';
        this.fullName = parsedData.name || '';
        this.emailInput = parsedData.email || '';

        // Parse phone number
        if (parsedData.phone) {
          const phone = parsedData.phone;
          if (phone.startsWith('+91')) {
            this.phoneCountry = '+91';
            this.phoneNumber = phone.replace('+91', '');
          } else if (phone.startsWith('+1')) {
            this.phoneCountry = '+1';
            this.phoneNumber = phone.replace('+1', '');
          } else if (phone.startsWith('+44')) {
            this.phoneCountry = '+44';
            this.phoneNumber = phone.replace('+44', '');
          } else {
            this.phoneNumber = phone;
          }
        }

        // Parse date of birth
        if (parsedData.dateOfBirth) {
          this.dob = parsedData.dateOfBirth.substring(0, 10); // Format: YYYY-MM-DD
        }

        // Set gender
        if (parsedData.gender) {
          this.gender = parsedData.gender.toLowerCase() as 'male' | 'female';
        }

        // Load referral code from user data if available
        if (parsedData.referralCode) {
          this.referralCode = parsedData.referralCode;
        }

        console.log('[ProfileSection] Mapped user info:', {
          name: this.user.name,
          age: this.user.age,
          avatarUrl: this.userAvatarUrl,
          avatarImageName: this.avatarImageName,
          relationship: this.user.relationship,
        });
        // store initial values for change detection
        this.storeInitialValues();
      }
    } catch (e) {
      console.error('[ProfileSection] Error loading user_data from localStorage:', e);
    }
  }

  /**
   * Load user statistics from localStorage first, then fetch from API if not available
   */
  private loadUserStatsFromStorage(): void {
    // Try to load from localStorage first
    const cachedStats = this.userService.getUserStats();

    if (cachedStats) {
      // Use cached stats
      this.user.coins = cachedStats.coins;
      this.user.streaks = cachedStats.streaks;
      this.user.days = cachedStats.days;
      this.user.badges = cachedStats.badges;

      console.log('[ProfileSection] Loaded stats from localStorage:', cachedStats);
    } else {
      // No cached stats, fetch from API
      console.log('[ProfileSection] No cached stats, fetching from API...');
      this.loadUserStatsFromAPI();
    }
  }

  /**
   * Load user statistics from the vibes/display endpoint and cache them
   */
  private loadUserStatsFromAPI(): void {
    this.moodService.getVibesDisplay().subscribe({
      next: (data: VibesDisplayResponse[]) => {
        // The API returns an array, get the first item (current user's data)
        if (data && data.length > 0) {
          const userStats = data[0];
          this.user.coins = userStats.coins || 0;
          this.user.streaks = userStats.streak || 0;
          this.user.trophies = userStats.trophies || 0;
          this.user.badges = userStats.badges || 0;
          this.user.days = userStats.trophies || 0;

          // Cache the stats in localStorage
          this.userService.saveUserStats({
            coins: this.user.coins,
            streaks: this.user.streaks,
            days: this.user.days,
            badges: this.user.badges,
          });

          console.log('[ProfileSection] Loaded and cached stats from API:', {
            coins: this.user.coins,
            streaks: this.user.streaks,
            days: this.user.days,
            badges: this.user.badges,
          });
        }
      },
      error: (error) => {
        console.error('[ProfileSection] Failed to load user stats:', error);
        // Keep default values (0) on error
      },
    });
  }

  /**
   * Load family details from API
   */
  private loadFamilyDetails(): void {
    this.authService.getFamilyDetails().subscribe({
      next: (response: FamilyDetailsResponse) => {
        if (response.family) {
          const members = Array.isArray(response.family.members) ? response.family.members : [];
          this.creator = response.family.creator;
          this.members = members;

          // Update family model for family panel
          this.family = {
            name: response.family.familyName,
            active: response.family.status === 'ACTIVE',
            createdOn: response.family.createdOn,
            owner: {
              initials: this.getInitial(response.family.creator.name),
              name: response.family.creator.name,
              age: response.family.creator.age,
              roleLabel:
                response.family.creator.relationship +
                (response.family.creator.you ? ' / You' : ''),
              avatar: response.family.creator.avatarName,
            },
            members: members.map((m) => ({
              id: 'm' + m.userId,
              name: m.name,
              age: m.age,
              role: m.relationship + (m.you ? ' / You' : ''),
              avatar: m.avatarName,
              isYou: m.you,
            })),
          };

          console.log('[ProfileSection] Loaded family details:', {
            creator: this.creator,
            members: this.members,
          });
        }
      },
      error: (error: any) => {
        console.error('[ProfileSection] Failed to load family details:', error);
      },
    });
  }

  /**
   * Load or generate referral code
   */
  private loadReferralCode(): void {
    // Check if we already have it from user data
    if (this.referralCode) return;

    // Try to get from localStorage first
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed.referralCode) {
          this.referralCode = parsed.referralCode;
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    // Generate from API if not found
    this.referralCodeLoading = true;
    this.authService.generateReferralCode().subscribe({
      next: (response) => {
        this.referralCode = response.referralCode;
        this.referralCodeLoading = false;
        console.log('[ProfileSection] Generated referral code:', this.referralCode);
      },
      error: (error) => {
        console.error('[ProfileSection] Failed to generate referral code:', error);
        this.referralCodeLoading = false;
      },
    });
  }

  // Return the uppercase initial for a given name
  getInitial(name?: string): string {
    try {
      if (!name) return '?';
      return name.trim().charAt(0).toUpperCase();
    } catch {
      return '?';
    }
  }

  isFemale(member?: any): boolean {
    try {
      return !!(member && (member as any).gender === 'female');
    } catch {
      return false;
    }
  }

  /**
   * Resolve avatar URL+alt for a family member.
   */
  getMemberAvatar(member: FamilyMember | null): { url: string | null; alt: string | null } | null {
    if (!member) return null;

    try {
      const rel = String(member.relationship || '').toLowerCase();

      if (rel === 'child') {
        const resolved = this.childSelfImageService.resolveAvatarForMember(member as any);
        return resolved || { url: null, alt: null };
      }

      return null;
    } catch (e) {
      console.error('[ProfileSection] getMemberAvatar error', e);
      return null;
    }
  }

  openItem(key: string) {
    // set the selected UI panel so the template can switch
    this.selectedItem = key;
    console.log('open item', key);
    // after changing the selected panel, ensure the main form area is visible
    // use a short timeout so Angular has updated the DOM
    try {
      setTimeout(() => {
        const el = document.querySelector('.profile-main') as HTMLElement | null;
        const offset = 80; // pixels of extra space from top
        if (el) {
          const rect = el.getBoundingClientRect();
          const top = Math.max(window.scrollY + rect.top - offset, 0);
          window.scrollTo({ top, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    } catch (e) {
      // don't crash if DOM APIs are unavailable
      console.warn('Auto-scroll failed', e);
    }
  }

  onNotificationChange() {
    this.notificationsDirty = true;
  }

  saveNotificationSettings() {
    try {
      localStorage.setItem('superme.notifications', JSON.stringify(this.notificationsSettings));
      this.notificationsDirty = false;
      console.log('Notifications saved', this.notificationsSettings);
      // In a real app, call backend API to persist settings
    } catch (e) {
      console.error('Failed to save notifications settings', e);
    }
  }

  resetNotificationSettings() {
    // Reset to default values
    this.notificationList.forEach((n) => {
      // default true for push/email/weekly/rewards/appUpdates, false for sms
      this.notificationsSettings[n.key] = n.key !== 'sms';
    });
    this.notificationsDirty = true;
  }

  // (toggleSelfMode implemented below with instruction hide behavior)

  logout() {
    console.log('[ProfileSection] Logging out...');

    // Clear authentication data using auth service
    this.authService.logout();

    // Clear user profile
    this.userService.clearUserProfile();

  }
}
