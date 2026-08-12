import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { FooterComponent } from '../footer/footer.component';
import { BookListing, BookListingType, BookListingsService } from '../../services/book-listings.service';
import { LocationService } from '../../services/location.service';

type BookType = 'school' | 'college' | 'exam' | 'general';
type SecondHandBooksView = 'choice' | 'buyer' | 'listings' | 'my-listings';
type ListingEntryPoint = 'buyer' | 'seller' | 'my-listings';

interface BuyerPreferences {
  bookType: BookType;
  classLevel: string;
  board: string;
  subject: string;
  degree: string;
  stream: string;
  exam: string;
  genre: string;
  title: string;
  author: string;
}

interface PreferenceField {
  key: keyof BuyerPreferences;
  label: string;
  options: string[];
}

@Component({
  selector: 'app-second-hand-books',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, FooterComponent],
  templateUrl: './second-hand-books.component.html',
  styleUrls: ['./second-hand-books.component.scss']
})
export class SecondHandBooksComponent implements OnInit {
  readonly bookTypes: Array<{ value: BookType; label: string; icon: string }> = [
    { value: 'school', label: 'School', icon: 'assets/figma/second-hand-books/book-type-school.svg' },
    { value: 'college', label: 'College', icon: 'assets/figma/second-hand-books/book-type-college.svg' },
    { value: 'exam', label: 'Exam Prep', icon: 'assets/figma/second-hand-books/book-type-exam.svg' },
    { value: 'general', label: 'General', icon: 'assets/figma/second-hand-books/book-type-general.svg' }
  ];

  view: SecondHandBooksView = 'choice';
  buyer: BuyerPreferences = this.createEmptyPreferences();
  listings: BookListing[] = [];
  listingsLoading = false;
  listingsError = '';
  private buyerLocation: { lat: number; lng: number } | null = null;

  constructor(
    private readonly location: Location,
    private readonly router: Router,
    private readonly bookListings: BookListingsService,
    private readonly locationService: LocationService
  ) {}

  ngOnInit(): void {
    this.restorePreferences();
  }

  get selectFields(): PreferenceField[] {
    switch (this.buyer.bookType) {
      case 'college':
        return [
          { key: 'degree', label: 'Degree', options: ['B.A.', 'B.Com', 'B.Sc.', 'B.Tech', 'M.A.', 'M.Sc.', 'Other'] },
          { key: 'stream', label: 'Stream', options: ['Arts', 'Commerce', 'Science', 'Engineering', 'Medical', 'Other'] },
          { key: 'subject', label: 'Subject', options: ['Mathematics', 'Science', 'English', 'Computer Science', 'Other'] }
        ];
      case 'exam':
        return [
          { key: 'exam', label: 'Exam', options: ['JEE', 'NEET', 'UPSC', 'CUET', 'SSC', 'Other'] },
          { key: 'subject', label: 'Subject', options: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'General Knowledge'] }
        ];
      case 'general':
        return [
          { key: 'genre', label: 'Genre', options: ['Fiction', 'Non-fiction', 'Biography', 'Self-help', 'Children', 'Other'] }
        ];
      default:
        return [
          { key: 'classLevel', label: 'Class', options: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'] },
          { key: 'board', label: 'Board', options: ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge'] },
          { key: 'subject', label: 'Subject', options: ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Other'] }
        ];
    }
  }

  get isBuyerReady(): boolean {
    const requiredSelections = this.selectFields.every(field => Boolean(this.buyer[field.key]));
    return requiredSelections && Boolean(this.buyer.title.trim()) && Boolean(this.buyer.author.trim());
  }

  openBuyer(): void {
    this.view = 'buyer';
  }

  selectBookType(bookType: BookType): void {
    this.buyer.bookType = bookType;
  }

  goBack(): void {
    if (this.view === 'buyer') {
      this.view = 'choice';
      return;
    }

    if (this.view === 'listings' || this.view === 'my-listings') {
      this.view = 'choice';
      return;
    }

    this.location.back();
  }

  searchBooks(): void {
    if (!this.isBuyerReady) return;

    this.savePreferences();
    this.view = 'listings';
    void this.loadPublicListings();
  }

  openSellerFlow(): void {
    this.openDynamicListings('seller');
  }

  openMyListings(): void {
    this.view = 'my-listings';
    this.listingsLoading = true;
    this.listingsError = '';
    this.bookListings.mine().subscribe({
      next: listings => { this.listings = Array.isArray(listings) ? listings : []; this.listingsLoading = false; },
      error: () => { this.listings = []; this.listingsLoading = false; this.listingsError = 'Unable to load your listings. Please try again.'; }
    });
  }

  unlockContact(listing: BookListing): void {
    if (listing.contactUnlocked) return;
    this.bookListings.unlockContact(listing.id).subscribe({
      next: updated => Object.assign(listing, updated),
      error: () => this.listingsError = 'Unable to unlock contact details. Please check your coins and try again.'
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
    const typeMap: Record<BookType, BookListingType> = { school: 'SCHOOL_TEXTBOOK', college: 'REFERENCE', exam: 'COMPETITIVE_EXAM', general: 'FICTION_NOVEL' };
    this.bookListings.list({ bookType: typeMap[this.buyer.bookType], userLat: this.buyerLocation?.lat, userLng: this.buyerLocation?.lng, page: 0, size: 20 }).subscribe({
      next: page => { this.listings = Array.isArray(page?.content) ? page.content : []; this.listingsLoading = false; },
      error: () => { this.listingsLoading = false; this.listingsError = 'Unable to load nearby books. Please try again.'; }
    });
  }

  private restorePreferences(): void {
    try {
      const saved = sessionStorage.getItem('superme_second_hand_books_preferences');
      if (!saved) return;

      const parsed = JSON.parse(saved) as Partial<BuyerPreferences>;
      if (parsed.bookType && this.bookTypes.some(type => type.value === parsed.bookType)) {
        this.buyer = { ...this.buyer, ...parsed };
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
      exam: '',
      genre: '',
      title: '',
      author: ''
    };
  }
}
