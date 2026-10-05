import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { IonicModule } from '@ionic/angular';

import { FooterComponent } from '../footer/footer.component';
import { SupermeDropdownComponent } from '../superme-dropdown/superme-dropdown.component';
import { ProfileImageComponent } from '../profile-image/profile-image.component';
import { ProfileFactsComponent } from '../user-profile/profile-facts/profile-facts.component';
import { EDUHUB_FAQS } from '../education-section/eduhub-faqs';
import { BookListing, BookListingCondition, BookListingCreateRequest, BookListingPage, BookListingType, BookListingsService } from '../../services/book-listings.service';
import { AuthService } from '../../services/auth.service';
import { INDIA_STATES, INDIA_STATE_OPTIONS } from '../../constants/india-location-options';
import { LocationService } from '../../services/location.service';
import { ShareLinkService } from '../../services/share-link.service';
import {
  COLLEGE_DEGREE_STREAM_OPTIONS,
  COLLEGE_YEAR_OPTIONS,
  EXAM_PREP_TARGET_EXAM_OPTIONS,
  GENERAL_GENRE_OPTIONS,
  GENERAL_LANGUAGE_OPTIONS,
  SCHOOL_BOARD_OPTIONS,
  SCHOOL_CLASS_OPTIONS,
  SCHOOL_SUBJECT_OPTIONS,
  SECOND_HAND_BOOK_TYPES,
  SecondHandBookDropdownOption,
  SecondHandBookType,
  collegeSubjectsForDegree,
  dropdownOptions
} from '../../constants/second-hand-book-options';

type BookType = SecondHandBookType;
type SecondHandBooksView = 'choice' | 'buyer' | 'listings' | 'my-listings' | 'book-details' | 'seller' | 'seller-success';
type ListingEntryPoint = 'buyer' | 'seller' | 'my-listings';
type ListingFilter = 'active' | 'sold' | 'review';
type ListingAction = 'delete' | 'sold';
type ListingDetailsOrigin = 'listings' | 'my-listings';
type ContactMethod = 'call' | 'email';
type SellerStep = 1 | 2 | 3 | 4;
type SellerListingType = 'sell' | 'donate';

interface BuyerPreferences {
  bookType: BookType;
  classLevel: string;
  board: string;
  subject: string;
  degree: string;
  stream: string;
  year: string;
  exam: string;
  genre: string;
  language: string;
  title: string;
  author: string;
}

interface PreferenceField {
  key: keyof BuyerPreferences;
  label: string;
  placeholder: string;
  options: SecondHandBookDropdownOption[];
  fullWidth?: boolean;
}

interface ListingDetailField {
  label: string;
  value: string;
  icon: string;
  lockedLabel?: string;
}

interface SellerListingDraft {
  bookType: BookType;
  classLevel: string;
  board: string;
  subject: string;
  degree: string;
  stream: string;
  year: string;
  exam: string;
  genre: string;
  language: string;
  title: string;
  authorPublisher: string;
  condition: BookListingCondition;
  listingType: SellerListingType;
  originalPrice: string;
  sellingPrice: string;
  negotiable: boolean;
  state: string;
  city: string;
  address: string;
  landmark: string;
  additionalNote: string;
  contactNumber: string;
  confirmed: boolean;
}

interface SellerConditionOption {
  value: BookListingCondition;
  label: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-second-hand-books',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, FooterComponent, SupermeDropdownComponent, ProfileImageComponent, ProfileFactsComponent],
  templateUrl: './second-hand-books.component.html',
  styleUrls: ['./second-hand-books.component.scss']
})
export class SecondHandBooksComponent implements OnInit, OnDestroy {
  readonly secondHandBookFaqs = EDUHUB_FAQS['secondHandBooks'];
  readonly bookTypes: Array<{ value: BookType; label: string; icon: string }> = SECOND_HAND_BOOK_TYPES.map(type => ({
    ...type,
    icon: `assets/figma/second-hand-books/book-type-${type.value}.svg`
  }));
  readonly sellerBookTypes: Array<{ value: BookType; label: string; icon: string }> = SECOND_HAND_BOOK_TYPES.map(type => ({
    ...type,
    icon: `assets/figma/second-hand-books/seller/book-${type.value}.svg`
  }));
  readonly sellerConditions: SellerConditionOption[] = [
    { value: 'NEW', label: 'New', description: 'Never used. No marks or damage.', icon: 'assets/figma/second-hand-books/seller/condition-new.svg' },
    { value: 'LIKE_NEW', label: 'Like New', description: 'Used once or twice. No writing or highlights.', icon: 'assets/figma/second-hand-books/seller/condition-like-new.svg' },
    { value: 'GOOD', label: 'Good', description: 'Some use, minor wear. Pages intact.', icon: 'assets/figma/second-hand-books/seller/condition-good.svg' },
    { value: 'ACCEPTABLE', label: 'Acceptable', description: 'Heavily used, may have notes. Still readable.', icon: 'assets/figma/second-hand-books/seller/condition-acceptable.svg' }
  ];
  readonly sellerPhotoSlots = [
    { label: 'Front Cover', icon: 'assets/figma/second-hand-books/seller/photo-front.svg' },
    { label: 'Back Cover', icon: 'assets/figma/second-hand-books/seller/photo-back.svg' },
    { label: 'Inside Pages', icon: 'assets/figma/second-hand-books/seller/photo-pages.svg' }
  ];
  readonly sellerStateDropdownOptions = dropdownOptions(INDIA_STATE_OPTIONS);
  readonly schoolClassOptions = SCHOOL_CLASS_OPTIONS;
  readonly schoolBoardOptions = SCHOOL_BOARD_OPTIONS;
  readonly schoolSubjectOptions = SCHOOL_SUBJECT_OPTIONS;
  readonly collegeDegreeStreamOptions = COLLEGE_DEGREE_STREAM_OPTIONS;
  readonly collegeYearOptions = COLLEGE_YEAR_OPTIONS;
  readonly examTargetOptions = EXAM_PREP_TARGET_EXAM_OPTIONS;
  readonly generalGenreOptions = GENERAL_GENRE_OPTIONS;
  readonly generalLanguageOptions = GENERAL_LANGUAGE_OPTIONS;
  readonly dropdownChevronAsset = 'assets/figma/second-hand-books/seller/chevron-left.svg';
  readonly dropdownSearchAsset = 'assets/figma/parent-eduhub-inner/search.svg';

  view: SecondHandBooksView = 'choice';
  buyer: BuyerPreferences = this.createEmptyPreferences();
  seller: SellerListingDraft = this.createEmptySellerDraft();
  sellerStep: SellerStep = 1;
  sellerPhotos: Array<File | null> = [null, null, null];
  sellerPhotoPreviews: Array<string | null> = [null, null, null];
  sellerValidationMessage = '';
  sellerSubmitError = '';
  sellerSubmitInProgress = false;
  listings: BookListing[] = [];
  listingsLoading = false;
  listingsError = '';
  selectedListingFilter: ListingFilter | null = null;
  selectedListing: BookListing | null = null;
  detailsOrigin: ListingDetailsOrigin = 'my-listings';
  listingDetailsLoading = false;
  listingDetailsError = '';
  listingAction: ListingAction | null = null;
  actionInProgress = false;
  actionError = '';
  shareError = '';
  contactUnlockInProgress = false;
  contactUnlockError = '';
  showContactSheet = false;
  selectedContactMethod: ContactMethod = 'call';
  contactLaunching = false;
  private readonly failedImages = new Set<string>();
  private buyerLocation: { lat: number; lng: number } | null = null;

  constructor(
    private readonly location: Location,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly bookListings: BookListingsService,
    private readonly locationService: LocationService,
    private readonly auth: AuthService,
    private readonly shareLinks: ShareLinkService
  ) {}

  ngOnInit(): void {
    this.restorePreferences();
    this.prefillSellerContact();
    const sharedId = Number(this.route.snapshot.queryParamMap.get('listingId'));
    if (Number.isFinite(sharedId) && sharedId > 0) {
      this.openSharedListing(sharedId);
    }
  }

  ngOnDestroy(): void {
    this.releaseSellerPhotoPreviews();
    this.restorePageScroll();
  }

  get selectFields(): PreferenceField[] {
    switch (this.buyer.bookType) {
      case 'college':
        return this.buyerCollegeSubjectOptions.length
          ? [
            { key: 'degree', label: 'Degree / Stream', placeholder: 'Select Degree / Stream', options: this.collegeDegreeStreamOptions, fullWidth: true },
            { key: 'year', label: 'Year / Semester', placeholder: 'Select year', options: this.collegeYearOptions },
            { key: 'subject', label: 'College Subject', placeholder: 'Select subject', options: this.buyerCollegeSubjectOptions }
          ]
          : [
            { key: 'degree', label: 'Degree / Stream', placeholder: 'Select Degree / Stream', options: this.collegeDegreeStreamOptions, fullWidth: true },
            { key: 'year', label: 'Year / Semester', placeholder: 'Select year', options: this.collegeYearOptions, fullWidth: true }
          ];
      case 'exam':
        return [
          { key: 'exam', label: 'Target Exam', placeholder: 'Select target exam', options: this.examTargetOptions, fullWidth: true }
        ];
      case 'general':
        return [
          { key: 'genre', label: 'Genre', placeholder: 'Select genre', options: this.generalGenreOptions },
          { key: 'language', label: 'Language', placeholder: 'Select language', options: this.generalLanguageOptions }
        ];
      default:
        return [
          { key: 'classLevel', label: 'Class', placeholder: 'Select Class', options: this.schoolClassOptions },
          { key: 'board', label: 'Board', placeholder: 'Select Board', options: this.schoolBoardOptions },
          { key: 'subject', label: 'Subject', placeholder: 'Select Subject', options: this.schoolSubjectOptions, fullWidth: true }
        ];
    }
  }

  get sellerCollegeSubjectOptions(): SecondHandBookDropdownOption[] {
    return collegeSubjectsForDegree(this.seller.degree);
  }

  get buyerCollegeSubjectOptions(): SecondHandBookDropdownOption[] {
    return collegeSubjectsForDegree(this.buyer.degree);
  }

  get sellerCityDropdownOptions(): SecondHandBookDropdownOption[] {
    return dropdownOptions(this.sellerCities);
  }

  get isBuyerReady(): boolean {
    const requiredSelections = this.selectFields.every(field => Boolean(this.buyer[field.key]));
    return requiredSelections && Boolean(this.buyer.title.trim()) && Boolean(this.buyer.author.trim());
  }

  get hasBuyerFilters(): boolean {
    return [
      this.buyer.classLevel,
      this.buyer.board,
      this.buyer.subject,
      this.buyer.degree,
      this.buyer.stream,
      this.buyer.year,
      this.buyer.exam,
      this.buyer.genre,
      this.buyer.language,
      this.buyer.title,
      this.buyer.author
    ].some(value => Boolean(value.trim()));
  }

  get sellerCities(): string[] {
    return this.seller.state ? (INDIA_STATES[this.seller.state] ?? []) : [];
  }

  get isSellerStepReady(): boolean {
    if (this.sellerStep === 1) {
      const hasBaseDetails = !!this.seller.title.trim() && !!this.seller.authorPublisher.trim();
      if (!hasBaseDetails) return false;
      if (this.seller.bookType === 'school') {
        return !!this.seller.classLevel && !!this.seller.board && !!this.seller.subject;
      }
      if (this.seller.bookType === 'college') {
        return !!this.seller.degree && !!this.seller.year
          && (!this.sellerCollegeSubjectOptions.length || !!this.seller.subject);
      }
      if (this.seller.bookType === 'exam') return !!this.seller.exam;
      return !!this.seller.genre && !!this.seller.language;
    }

    if (this.sellerStep === 2) return !!this.seller.condition;

    if (this.sellerStep === 3) {
      const originalPrice = Number(this.seller.originalPrice);
      if (!this.hasRequiredSellerPhotos || !Number.isFinite(originalPrice) || originalPrice <= 0) return false;
      if (this.seller.listingType === 'donate') return true;
      const sellingPrice = Number(this.seller.sellingPrice);
      return Number.isFinite(sellingPrice) && sellingPrice > 0 && sellingPrice <= originalPrice;
    }

    const localPhone = this.seller.contactNumber.replace(/\D/g, '');
    return !!this.seller.state && !!this.seller.city && !!this.seller.address.trim()
      && localPhone.length === 10 && this.seller.confirmed;
  }

  get sellerProgress(): number {
    return this.sellerStep * 25;
  }

  private get hasRequiredSellerPhotos(): boolean {
    // Cordova replaces window.File on mobile; input-selected browser files
    // therefore need to be checked without instanceof File.
    return this.sellerPhotoSlots.every((_, index) => {
      const photo = this.sellerPhotos[index];
      return !!photo && photo.size > 0 && photo.type.startsWith('image/');
    });
  }

  get sellerStepRequirement(): string {
    return this.sellerStep >= 3 && !this.isSellerStepReady ? this.sellerValidationError() : '';
  }

  get sellerPrimaryActionLabel(): string {
    if (this.sellerStep === 1) return 'Up Next: Condition';
    if (this.sellerStep === 2) return 'Up Next: Images & Price';
    if (this.sellerStep === 3) return 'Up Next: Location & Contact';
    return 'Submit for review';
  }

  get myListingTabs(): Array<{ value: ListingFilter; label: string; count: number }> {
    return [
      { value: 'active', label: 'Active', count: this.listingsForFilter('active').length },
      { value: 'sold', label: 'Sold', count: this.listingsForFilter('sold').length },
      { value: 'review', label: 'Under Review', count: this.listingsForFilter('review').length }
    ];
  }

  get visibleMyListings(): BookListing[] {
    return this.selectedListingFilter ? this.listingsForFilter(this.selectedListingFilter) : this.listings;
  }

  get selectedListingImages(): string[] {
    return this.selectedListing ? this.listingImages(this.selectedListing) : [];
  }

  get selectedListingDetails(): ListingDetailField[] {
    const listing = this.selectedListing;
    if (!listing) return [];

    const authorPublisher = this.stringValue(listing.authorPublisher, this.joinValues(listing.author, listing.publisher));
    const type = String(listing.bookType ?? '').trim().toUpperCase();
    const locked = !this.selectedListingContactVisible;
    const contactNumber = this.selectedListingPhone;
    const address = locked ? this.selectedListingPublicLocation : this.selectedListingFullAddress;
    const fields: Array<ListingDetailField | null> = [
      { label: 'Book Type', value: this.bookTypeLabel(listing.bookType), icon: 'library-outline' }
    ];

    if (type === 'SCHOOL_TEXTBOOK' || type === 'SCHOOL') {
      fields.push(
        this.detailField('Class', this.stringValue(listing.bookClass, listing.classLevel), 'school-outline'),
        this.detailField('Board', this.stringValue(listing.board), 'business-outline'),
        this.detailField('Subject', this.stringValue(listing.subject), 'folder-open-outline'),
        this.detailField('Author/Publisher', authorPublisher, 'color-wand-outline')
      );
    } else if (type === 'REFERENCE' || type === 'COLLEGE') {
      fields.push(
        this.detailField('Degree / Stream', this.stringValue(listing.degreeStream, this.joinValues(listing.degree, listing.stream)), 'school-outline'),
        this.detailField('Subject', this.stringValue(listing.subject), 'folder-open-outline'),
        this.detailField('Author/Publisher', authorPublisher, 'color-wand-outline')
      );
    } else if (type === 'COMPETITIVE_EXAM' || type === 'EXAM_PREP') {
      fields.push(
        this.detailField('Target Exam', this.stringValue(listing.targetExam, listing.exam), 'document-text-outline'),
        this.detailField('Author/Publisher', authorPublisher, 'color-wand-outline')
      );
    } else {
      fields.push(
        this.detailField('Genre', this.stringValue(listing.genre), 'globe-outline'),
        this.detailField('Author', this.stringValue(listing.author, listing.publisher), 'color-wand-outline')
      );
    }

    fields.push(
      { label: 'Condition', value: this.conditionLabel(listing.condition), icon: 'star-outline' },
      address ? {
        label: 'Location',
        value: address,
        icon: 'location-outline',
        lockedLabel: locked ? 'Full Address hidden' : undefined
      } : null,
      contactNumber ? {
        label: 'Contact Number',
        value: locked ? this.maskPhoneNumber(contactNumber) : contactNumber,
        icon: 'call-outline',
        lockedLabel: locked ? 'Contact hidden' : undefined
      } : null
    );

    return fields.filter((field): field is ListingDetailField => field != null);
  }

  get selectedListingNote(): string {
    if (!this.selectedListing) return '';
    return this.stringValue(this.selectedListing.sellerNote, this.selectedListing.note, this.selectedListing.description);
  }

  get selectedListingDiscount(): number | null {
    return this.selectedListing ? this.discountFor(this.selectedListing) : null;
  }

  get selectedListingIsNegotiable(): boolean {
    return !!this.selectedListing && this.isNegotiable(this.selectedListing);
  }

  get selectedListingIsFree(): boolean {
    return !!this.selectedListing && this.isListingFree(this.selectedListing);
  }

  get selectedListingContactUnlocked(): boolean {
    return this.selectedListing?.contactUnlocked === true;
  }

  get selectedListingContactVisible(): boolean {
    return this.isManagedListingDetails || this.selectedListingContactUnlocked;
  }

  get selectedListingPublicLocation(): string {
    if (!this.selectedListing) return '';
    return this.joinValues(this.selectedListing.city, this.selectedListing.state);
  }

  get selectedListingFullAddress(): string {
    if (!this.selectedListing) return '';
    return this.stringValue(this.selectedListing.sellerAddress, this.selectedListing.location, this.selectedListing.city, this.selectedListing.state);
  }

  get selectedListingPhone(): string {
    if (!this.selectedListing) return '';
    return this.stringValue(this.selectedListing.contactNumber, this.selectedListing.phone, this.selectedListing.sellerPhone);
  }

  get selectedListingEmail(): string {
    if (!this.selectedListing) return '';
    return this.stringValue(this.selectedListing['sellerEmail'], this.selectedListing['email'], this.selectedListing['contactEmail']);
  }

  get selectedListingUnlockCost(): number | null {
    const cost = Number(this.selectedListing?.unlockCost);
    return Number.isFinite(cost) && cost > 0 ? cost : null;
  }

  get isManagedListingDetails(): boolean {
    return this.detailsOrigin === 'my-listings';
  }

  get hasAvailableContactMethod(): boolean {
    return !!this.selectedListingPhone || !!this.selectedListingEmail;
  }

  get selectedContactActionLabel(): string {
    return this.selectedContactMethod === 'call' ? 'Call' : 'Email';
  }

  get canMarkSelectedListingAsSold(): boolean {
    return !!this.selectedListing && this.listingFilter(this.selectedListing) === 'active';
  }

  openBuyer(): void {
    this.view = 'buyer';
  }

  selectBookType(bookType: BookType): void {
    if (this.buyer.bookType === bookType) return;
    this.buyer.bookType = bookType;
    this.clearBuyerCategorySelections();
  }

  onBuyerPreferenceChanged(key: keyof BuyerPreferences): void {
    if (key === 'degree') this.buyer.subject = '';
  }

  resetBuyerFilters(): void {
    this.clearBuyerCategorySelections();
    this.buyer.title = '';
    this.buyer.author = '';
    this.savePreferences();
  }

  goBack(): void {
    if (this.view === 'seller') {
      this.sellerValidationMessage = '';
      this.sellerSubmitError = '';
      if (this.sellerStep > 1) {
        this.sellerStep = (this.sellerStep - 1) as SellerStep;
      } else {
        this.view = 'choice';
      }
      return;
    }

    if (this.view === 'seller-success') {
      this.view = 'choice';
      return;
    }

    if (this.view === 'buyer') {
      this.view = 'choice';
      return;
    }

    if (this.view === 'book-details') {
      this.closeContactSheet();
      this.selectedListing = null;
      this.listingDetailsError = '';
      this.contactUnlockError = '';
      this.view = this.detailsOrigin;
      return;
    }

    if (this.view === 'listings' || this.view === 'my-listings') {
      this.view = 'choice';
      return;
    }

    this.location.back();
  }

  searchBooks(): void {
    this.savePreferences();
    this.view = 'listings';
    void this.loadPublicListings();
  }

  openSellerFlow(): void {
    this.view = 'seller';
    this.sellerStep = 1;
    this.sellerValidationMessage = '';
    this.sellerSubmitError = '';
    this.prefillSellerContact();
  }

  selectSellerBookType(bookType: BookType): void {
    if (this.seller.bookType === bookType) return;
    this.seller.bookType = bookType;
    this.clearSellerCategorySelections();
    this.sellerValidationMessage = '';
  }

  onSellerDegreeChanged(): void {
    this.seller.subject = '';
    this.sellerValidationMessage = '';
  }

  selectSellerCondition(condition: BookListingCondition): void {
    this.seller.condition = condition;
    this.sellerValidationMessage = '';
  }

  setSellerListingType(listingType: SellerListingType): void {
    this.seller.listingType = listingType;
    if (listingType === 'donate') this.seller.sellingPrice = '0';
    this.sellerValidationMessage = '';
  }

  updateSellerState(): void {
    this.seller.city = '';
    this.sellerValidationMessage = '';
  }

  onSellerPhotoSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/') || file.size === 0) {
      this.sellerValidationMessage = 'Please choose a valid, non-empty image file.';
      return;
    }

    const previousPreview = this.sellerPhotoPreviews[index];
    if (previousPreview) URL.revokeObjectURL(previousPreview);
    this.sellerPhotos[index] = file;
    this.sellerPhotoPreviews[index] = URL.createObjectURL(file);
    this.sellerValidationMessage = '';
  }

  removeSellerPhoto(index: number): void {
    const preview = this.sellerPhotoPreviews[index];
    if (preview) URL.revokeObjectURL(preview);
    this.sellerPhotos[index] = null;
    this.sellerPhotoPreviews[index] = null;
  }

  continueSellerFlow(): void {
    this.sellerValidationMessage = '';
    this.sellerSubmitError = '';
    if (!this.isSellerStepReady) {
      this.sellerValidationMessage = this.sellerValidationError();
      return;
    }

    if (this.sellerStep < 4) {
      this.sellerStep = (this.sellerStep + 1) as SellerStep;
      return;
    }

    this.submitSellerListing();
  }

  resetSellerFlow(): void {
    this.releaseSellerPhotoPreviews();
    this.sellerPhotos = [null, null, null];
    this.sellerPhotoPreviews = [null, null, null];
    this.seller = this.createEmptySellerDraft();
    this.prefillSellerContact();
    this.sellerStep = 1;
    this.sellerValidationMessage = '';
    this.sellerSubmitError = '';
    this.view = 'seller';
  }

  backToHome(): void {
    this.view = 'choice';
    void this.router.navigate(['/home']).catch(() => this.router.navigate(['/authed']));
  }

  openMyListings(): void {
    this.view = 'my-listings';
    this.selectedListingFilter = null;
    this.selectedListing = null;
    this.listingDetailsError = '';
    this.loadMyListings();
  }

  selectListingFilter(filter: ListingFilter): void {
    this.selectedListingFilter = this.selectedListingFilter === filter ? null : filter;
  }

  retryMyListings(): void {
    this.loadMyListings();
  }

  openListingDetails(listing: BookListing, origin: ListingDetailsOrigin = this.view === 'my-listings' ? 'my-listings' : 'listings'): void {
    this.selectedListing = listing;
    this.detailsOrigin = origin;
    this.view = 'book-details';
    this.listingDetailsError = '';
    this.shareError = '';
    this.contactUnlockError = '';
    this.showContactSheet = false;
    this.loadListingDetails(listing.id);
  }

  retryListingDetails(): void {
    if (this.selectedListing) this.loadListingDetails(this.selectedListing.id);
  }

  async shareSelectedListing(): Promise<void> {
    const listing = this.selectedListing;
    if (!listing) return;

    this.shareError = '';
    try {
      await Share.share({
        title: listing.title,
        text: `View ${listing.title} on SuperMe.`,
        url: this.shareLinks.buildListingLink('book', listing.id)
      });
    } catch (error) {
      if (!this.isShareCancellation(error)) {
        this.shareError = 'Unable to share this listing right now. Please try again.';
      }
    }
  }

  unlockSelectedListingContact(): void {
    const listing = this.selectedListing;
    if (!listing || listing.contactUnlocked || this.contactUnlockInProgress) return;

    this.contactUnlockInProgress = true;
    this.contactUnlockError = '';
    this.bookListings.unlockContact(listing.id).subscribe({
      next: updated => {
        const unlockedListing = { ...listing, ...updated, contactUnlocked: updated.contactUnlocked ?? true } as BookListing;
        this.selectedListing = unlockedListing;
        this.replaceListing(unlockedListing);
        this.contactUnlockInProgress = false;
      },
      error: error => {
        this.contactUnlockInProgress = false;
        this.contactUnlockError = this.apiErrorMessage(error, 'Unable to unlock contact details. Please check your coins and try again.');
      }
    });
  }

  openContactSheet(): void {
    if (!this.selectedListingContactVisible || !this.hasAvailableContactMethod || this.contactLaunching) return;
    this.selectedContactMethod = this.selectedListingPhone ? 'call' : 'email';
    this.showContactSheet = true;
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';
  }

  closeContactSheet(): void {
    if (this.contactLaunching) return;
    this.showContactSheet = false;
    this.restorePageScroll();
  }

  selectContactMethod(method: ContactMethod): void {
    if ((method === 'call' && !this.selectedListingPhone) || (method === 'email' && !this.selectedListingEmail)) return;
    this.selectedContactMethod = method;
  }

  async confirmContact(): Promise<void> {
    if (this.contactLaunching) return;

    const url = this.selectedContactMethod === 'call'
      ? this.buildTelephoneUrl(this.selectedListingPhone)
      : this.buildEmailUrl(this.selectedListingEmail);
    if (!url) return;

    this.contactLaunching = true;
    try {
      await this.openExternalUrl(url);
      this.showContactSheet = false;
      this.restorePageScroll();
    } catch {
      this.contactUnlockError = 'Unable to open this contact option. Please try again.';
    } finally {
      this.contactLaunching = false;
    }
  }

  openActionConfirmation(action: ListingAction): void {
    if (!this.selectedListing || this.actionInProgress) return;
    this.actionError = '';
    this.listingAction = action;
  }

  closeActionConfirmation(): void {
    if (this.actionInProgress) return;
    this.listingAction = null;
    this.actionError = '';
  }

  confirmListingAction(): void {
    const listing = this.selectedListing;
    const action = this.listingAction;
    if (!listing || !action || this.actionInProgress) return;

    this.actionInProgress = true;
    this.actionError = '';
    if (action === 'delete') {
      this.bookListings.remove(listing.id).subscribe({
        next: () => {
          this.listings = this.listings.filter(item => item.id !== listing.id);
          this.selectedListing = null;
          this.completeListingAction();
        },
        error: () => this.failListingAction('Unable to delete this listing. Please try again.')
      });
      return;
    }

    this.bookListings.markAsSold(listing.id).subscribe({
      next: soldListing => {
        const replacement = { ...listing, ...soldListing, status: soldListing.status || 'SOLD' };
        this.replaceListing(replacement);
        this.selectedListing = replacement;
        this.selectedListingFilter = null;
        this.completeListingAction();
      },
      error: () => this.failListingAction('Unable to mark this listing as sold. Please try again.')
    });
  }

  listingImages(listing: BookListing): string[] {
    return (listing.imageUrls ?? []).filter(url => !!url && !this.failedImages.has(url));
  }

  markImageFailed(url: string): void {
    if (url) this.failedImages.add(url);
  }

  bookTypeLabel(bookType: BookListingType | string | null | undefined): string {
    const labels: Record<string, string> = {
      SCHOOL_TEXTBOOK: 'School',
      SCHOOL: 'School',
      REFERENCE: 'College',
      COLLEGE: 'College',
      COMPETITIVE_EXAM: 'Exam prep',
      EXAM_PREP: 'Exam prep',
      FICTION_NOVEL: 'General',
      GENERAL: 'General',
      CHILDRENS_BOOKS: 'Children’s books'
    };
    return labels[String(bookType ?? '')] ?? this.humanize(bookType || 'Book');
  }

  conditionLabel(condition: string | null | undefined): string {
    return this.humanize(condition || 'Not specified');
  }

  secondaryListingDetails(listing: BookListing): string {
    const type = String(listing.bookType ?? '');
    const source = type === 'SCHOOL_TEXTBOOK' || type === 'SCHOOL'
      ? [listing.board, listing.bookClass, listing.classLevel]
      : type === 'REFERENCE' || type === 'COLLEGE'
        ? [listing.degreeStream, listing.degree, listing.stream, listing.subject]
        : type === 'COMPETITIVE_EXAM' || type === 'EXAM_PREP'
          ? [listing.targetExam, listing.exam, listing.authorPublisher, listing.author, listing.publisher]
          : [listing.authorPublisher, listing.author, listing.genre, listing.publisher];
    return this.joinValues(...source) || this.conditionLabel(listing.condition);
  }

  listingLocation(listing: BookListing): string {
    return this.joinValues(listing.location, listing.address, listing.city, listing.state);
  }

  listingTypeIcon(listing: BookListing): string {
    const icons: Record<string, string> = {
      SCHOOL_TEXTBOOK: 'assets/figma/second-hand-books/listing-type-school.svg',
      SCHOOL: 'assets/figma/second-hand-books/listing-type-school.svg',
      FICTION_NOVEL: 'assets/figma/second-hand-books/listing-type-general.svg',
      GENERAL: 'assets/figma/second-hand-books/listing-type-general.svg',
      COMPETITIVE_EXAM: 'assets/figma/second-hand-books/listing-type-exam.svg',
      EXAM_PREP: 'assets/figma/second-hand-books/listing-type-exam.svg'
    };
    return icons[String(listing.bookType ?? '')] ?? 'assets/figma/second-hand-books/book-type-college.svg';
  }

  listingStatusBadge(listing: BookListing): string {
    const status = String(listing.status ?? '').trim().toUpperCase();
    if (status === 'SOLD') return 'assets/figma/second-hand-books/status-sold-badge.webp';
    if (status === 'PENDING' || status === 'UNDER_REVIEW' || status === 'REJECTED') {
      return 'assets/figma/second-hand-books/status-under-review-badge.webp';
    }
    return '';
  }

  selectedListingFilterLabel(): string {
    return this.selectedListingFilter === 'review' ? 'under-review' : this.selectedListingFilter ?? '';
  }

  discountFor(listing: BookListing): number | null {
    const discount = Number(listing.discountPercent);
    if (Number.isFinite(discount) && discount > 0) return Math.round(discount);
    const original = Number(listing.originalPrice);
    const selling = Number(listing.sellingPrice);
    return original > selling && original > 0 ? Math.round(((original - selling) / original) * 100) : null;
  }

  isNegotiable(listing: BookListing): boolean {
    return listing.negotiable === true || listing.priceNegotiable === true || listing.isPriceNegotiable === true;
  }

  isListingFree(listing: BookListing): boolean {
    return Number(listing.sellingPrice) === 0;
  }

  openListingCreation(): void {
    this.openSellerFlow();
  }

  trackByListing(_: number, listing: BookListing): number {
    return listing.id;
  }

  trackByListingTab(_: number, tab: { value: ListingFilter }): ListingFilter {
    return tab.value;
  }

  trackByDetailField(_: number, field: ListingDetailField): string {
    return field.label;
  }

  private loadMyListings(): void {
    this.listingsLoading = true;
    this.listingsError = '';
    this.bookListings.mine().subscribe({
      next: response => {
        this.listings = this.normalizeMyListings(response);
        this.listingsLoading = false;
      },
      error: () => { this.listings = []; this.listingsLoading = false; this.listingsError = 'Unable to load your listings. Please try again.'; }
    });
  }

  trackByBookType(_: number, type: { value: BookType }): BookType {
    return type.value;
  }

  trackByPreferenceField(_: number, field: PreferenceField): string {
    return field.key;
  }

  private openDynamicListings(entryPoint: ListingEntryPoint): void {
    sessionStorage.setItem('superme_second_hand_books_entry', entryPoint);
    void this.router.navigate(['/authed/education/shops'], {
      queryParams: { label: 'Second-hand Books' },
      state: { entryPoint, buyerPreferences: this.buyer }
    });
  }

  private async loadPublicListings(): Promise<void> {
    this.listingsLoading = true;
    this.listingsError = '';
    this.listings = [];
    try {
      const position = await this.locationService.getCurrentPosition();
      this.buyerLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch { this.buyerLocation = null; }
    const typeMap: Record<BookType, BookListingType> = { school: 'SCHOOL', college: 'COLLEGE', exam: 'EXAM_PREP', general: 'GENERAL' };
    this.bookListings.list({
      bookType: typeMap[this.buyer.bookType],
      bookClass: this.buyer.bookType === 'school' ? this.buyer.classLevel : undefined,
      board: this.buyer.bookType === 'school' ? this.buyer.board : undefined,
      subject: this.buyer.bookType === 'school' || this.buyer.bookType === 'college' ? this.buyer.subject : undefined,
      degreeStream: this.buyer.bookType === 'college' ? this.buyer.degree : undefined,
      year: this.buyer.bookType === 'college' ? this.buyer.year : undefined,
      targetExam: this.buyer.bookType === 'exam' ? this.buyer.exam : undefined,
      genre: this.buyer.bookType === 'general' ? this.buyer.genre : undefined,
      language: this.buyer.bookType === 'general' ? this.buyer.language : undefined,
      userLat: this.buyerLocation?.lat,
      userLng: this.buyerLocation?.lng,
      page: 0,
      size: 20
    }).subscribe({
      next: page => { this.listings = Array.isArray(page?.content) ? page.content : []; this.listingsLoading = false; },
      error: () => { this.listingsLoading = false; this.listingsError = 'Unable to load nearby books. Please try again.'; }
    });
  }

  private loadListingDetails(id: number): void {
    this.listingDetailsLoading = true;
    this.listingDetailsError = '';
    this.bookListings.get(id).subscribe({
      next: listing => {
        const mergedListing = { ...this.selectedListing, ...listing } as BookListing;
        this.selectedListing = mergedListing;
        this.replaceListing(mergedListing);
        this.listingDetailsLoading = false;
      },
      error: () => {
        this.listingDetailsLoading = false;
        this.listingDetailsError = 'Unable to load all book details. Please check your connection and retry.';
      }
    });
  }

  private openSharedListing(id: number): void {
    this.view = 'book-details';
    this.detailsOrigin = 'listings';
    this.listingDetailsLoading = true;
    this.listingDetailsError = '';
    this.bookListings.get(id).subscribe({
      next: listing => {
        this.selectedListing = listing;
        this.listings = [listing, ...this.listings.filter(item => item.id !== listing.id)];
        this.listingDetailsLoading = false;
      },
      error: () => {
        this.listingDetailsLoading = false;
        this.listingDetailsError = 'Unable to load this book listing. Please check your connection and retry.';
      }
    });
  }

  private listingsForFilter(filter: ListingFilter): BookListing[] {
    return this.listings.filter(listing => this.listingFilter(listing) === filter);
  }

  private listingFilter(listing: BookListing): ListingFilter {
    const status = String(listing.status ?? '').trim().toUpperCase();
    if (status === 'SOLD') return 'sold';
    if (status === 'APPROVED' || status === 'ACTIVE') return 'active';
    return 'review';
  }

  private normalizeMyListings(response: BookListing[] | BookListingPage): BookListing[] {
    if (Array.isArray(response)) return response;
    return Array.isArray(response?.content) ? response.content : [];
  }

  private replaceListing(updated: BookListing): void {
    this.listings = this.listings.map(listing => listing.id === updated.id ? updated : listing);
  }

  private completeListingAction(): void {
    this.listingAction = null;
    this.actionInProgress = false;
    this.view = 'my-listings';
  }

  private failListingAction(message: string): void {
    this.actionInProgress = false;
    this.actionError = message;
  }

  private detailField(label: string, value: string, icon: string): ListingDetailField | null {
    return value ? { label, value, icon } : null;
  }

  private maskPhoneNumber(phone: string): string {
    const prefix = phone.trim().match(/^\+\d{1,3}/)?.[0];
    return prefix ? `${prefix} **********` : '**********';
  }

  private buildTelephoneUrl(phone: string): string | null {
    const normalized = phone.replace(/(?!^\+)[^\d]/g, '');
    return normalized.replace(/\D/g, '').length >= 7 ? `tel:${normalized}` : null;
  }

  private buildEmailUrl(email: string): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    const subject = this.selectedListing ? `SuperMe enquiry for ${this.selectedListing.title}` : 'SuperMe book enquiry';
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}`;
  }

  private async openExternalUrl(url: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await AppLauncher.openUrl({ url });
        if (result.completed) return;
      } catch {
        // Fall through to the system browser below.
      }
    }
    window.location.assign(url);
  }

  private apiErrorMessage(error: unknown, fallback: string): string {
    const message = (error as { error?: { message?: unknown; error?: unknown }; message?: unknown })?.error?.message
      ?? (error as { error?: { error?: unknown } })?.error?.error
      ?? (error as { message?: unknown })?.message;
    return typeof message === 'string' && message.trim() ? message.trim() : fallback;
  }

  private restorePageScroll(): void {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  }

  private joinValues(...values: Array<unknown>): string {
    return values
      .map(value => this.stringValue(value))
      .filter((value): value is string => !!value)
      .join(' • ');
  }

  private stringValue(...values: Array<unknown>): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    }
    return '';
  }

  private humanize(value: string): string {
    return String(value)
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  private isShareCancellation(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return /cancel|dismiss|abort/i.test(message);
  }

  private submitSellerListing(): void {
    if (this.sellerSubmitInProgress || !this.isSellerStepReady) return;

    const photos = this.sellerPhotos.filter((photo): photo is File => photo !== null);
    if (photos.length !== 3) {
      this.sellerValidationMessage = 'Please add the front cover, back cover, and inside pages.';
      return;
    }

    this.sellerSubmitInProgress = true;
    this.sellerSubmitError = '';
    this.bookListings.create(this.buildSellerRequest(), photos).subscribe({
      next: listing => {
        this.listings = [listing, ...this.listings.filter(item => item.id !== listing.id)];
        this.sellerSubmitInProgress = false;
        this.view = 'seller-success';
      },
      error: error => {
        this.sellerSubmitInProgress = false;
        this.sellerSubmitError = this.apiErrorMessage(error, 'We could not submit your listing. Please try again.');
      }
    });
  }

  private buildSellerRequest(): BookListingCreateRequest {
    const typeMap: Record<BookType, BookListingCreateRequest['bookType']> = {
      school: 'SCHOOL', college: 'COLLEGE', exam: 'EXAM_PREP', general: 'GENERAL'
    };
    const isSchool = this.seller.bookType === 'school';
    const isCollege = this.seller.bookType === 'college';
    const isExam = this.seller.bookType === 'exam';
    const originalPrice = Number(this.seller.originalPrice);
    const sellingPrice = this.seller.listingType === 'donate' ? 0 : Number(this.seller.sellingPrice);

    return {
      bookType: typeMap[this.seller.bookType],
      title: this.seller.title.trim(),
      authorPublisher: this.seller.authorPublisher.trim(),
      bookClass: isSchool ? this.seller.classLevel : undefined,
      board: isSchool ? this.seller.board : undefined,
      subject: isSchool || (isCollege && this.seller.subject) ? this.seller.subject : undefined,
      degreeStream: isCollege ? this.seller.degree : undefined,
      year: isCollege ? this.seller.year : undefined,
      targetExam: isExam ? this.seller.exam : undefined,
      genre: this.seller.bookType === 'general' ? this.seller.genre : undefined,
      language: this.seller.bookType === 'general' ? this.seller.language : undefined,
      condition: this.seller.condition,
      sellerNote: this.seller.additionalNote.trim() || undefined,
      originalPrice,
      sellingPrice,
      negotiable: this.seller.listingType === 'sell' && this.seller.negotiable,
      listingType: this.seller.listingType === 'sell' ? 'SELL' : 'DONATE',
      state: this.seller.state,
      city: this.seller.city,
      address: this.seller.address.trim(),
      landmark: this.seller.landmark.trim() || undefined,
      additionalNote: this.seller.additionalNote.trim() || undefined
    };
  }

  private sellerValidationError(): string {
    if (this.sellerStep === 1) return 'Complete the required book details to continue.';
    if (this.sellerStep === 2) return 'Choose the book condition to continue.';
    if (this.sellerStep === 3) {
      if (!this.hasRequiredSellerPhotos) return 'Add all three required book photos to continue.';
      const originalPrice = Number(this.seller.originalPrice);
      if (!Number.isFinite(originalPrice) || originalPrice <= 0) return 'Enter an original price greater than ₹0 to continue.';
      const sellingPrice = Number(this.seller.sellingPrice);
      if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) return 'Enter a selling price greater than ₹0, or choose Donate.';
      return 'Selling price cannot be higher than the original price.';
    }
    if (!this.seller.state) return 'Select your state to continue.';
    if (!this.seller.city) return 'Select your city to continue.';
    if (!this.seller.address.trim()) return 'Enter your address to continue.';
    if (this.seller.contactNumber.replace(/\D/g, '').length !== 10) return 'Enter a valid 10-digit contact number.';
    return 'Confirm that your book details and condition are accurate to submit.';
  }

  private prefillSellerContact(): void {
    if (this.seller.contactNumber) return;
    const user = this.auth.getUserData();
    const phone = this.stringValue(user?.phone, user?.contactNumber, user?.mobile);
    this.seller.contactNumber = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
  }

  private releaseSellerPhotoPreviews(): void {
    this.sellerPhotoPreviews.forEach(preview => {
      if (preview) URL.revokeObjectURL(preview);
    });
  }

  private restorePreferences(): void {
    try {
      const saved = sessionStorage.getItem('superme_second_hand_books_preferences');
      if (!saved) return;

      const parsed = JSON.parse(saved) as Partial<BuyerPreferences>;
      if (parsed.bookType && this.bookTypes.some(type => type.value === parsed.bookType)) {
        this.buyer = { ...this.buyer, ...parsed };
        this.clearInvalidBuyerSelections();
      }
    } catch {
      sessionStorage.removeItem('superme_second_hand_books_preferences');
    }
  }

  private savePreferences(): void {
    sessionStorage.setItem('superme_second_hand_books_preferences', JSON.stringify(this.buyer));
  }

  private createEmptyPreferences(): BuyerPreferences {
    return {
      bookType: 'school',
      classLevel: '',
      board: '',
      subject: '',
      degree: '',
      stream: '',
      year: '',
      exam: '',
      genre: '',
      language: '',
      title: '',
      author: ''
    };
  }

  private createEmptySellerDraft(): SellerListingDraft {
    return {
      bookType: 'school', classLevel: '', board: '', subject: '', degree: '', stream: '', year: '', exam: '', genre: '', language: '',
      title: '', authorPublisher: '', condition: 'NEW', listingType: 'sell', originalPrice: '', sellingPrice: '', negotiable: false,
      state: '', city: '', address: '', landmark: '', additionalNote: '', contactNumber: '', confirmed: false
    };
  }

  private clearBuyerCategorySelections(): void {
    this.buyer.classLevel = '';
    this.buyer.board = '';
    this.buyer.subject = '';
    this.buyer.degree = '';
    this.buyer.stream = '';
    this.buyer.year = '';
    this.buyer.exam = '';
    this.buyer.genre = '';
    this.buyer.language = '';
  }

  private clearSellerCategorySelections(): void {
    this.seller.classLevel = '';
    this.seller.board = '';
    this.seller.subject = '';
    this.seller.degree = '';
    this.seller.stream = '';
    this.seller.year = '';
    this.seller.exam = '';
    this.seller.genre = '';
    this.seller.language = '';
  }

  private clearInvalidBuyerSelections(): void {
    const validForCurrentType = this.selectFields;
    const validKeys = new Set(validForCurrentType.map(field => field.key));
    (['classLevel', 'board', 'subject', 'degree', 'stream', 'year', 'exam', 'genre', 'language'] as Array<Exclude<keyof BuyerPreferences, 'bookType' | 'title' | 'author'>>)
      .filter(key => !validKeys.has(key))
      .forEach(key => { this.buyer[key] = ''; });

    if (this.buyer.bookType === 'college' && this.buyer.subject
      && !this.buyerCollegeSubjectOptions.some(option => option.value === this.buyer.subject)) {
      this.buyer.subject = '';
    }

    for (const field of this.selectFields) {
      const value = this.buyer[field.key];
      if (typeof value === 'string' && value && !field.options.some(option => option.value === value)) {
        (this.buyer as unknown as Record<string, string>)[field.key] = '';
      }
    }
  }
}
