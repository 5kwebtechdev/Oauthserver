import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { FooterComponent } from '../footer/footer.component';

type BookType = 'school' | 'college' | 'exam' | 'general';
type SecondHandBooksView = 'choice' | 'buyer';
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
    { value: 'school', label: 'School', icon: 'school-outline' },
    { value: 'college', label: 'College', icon: 'business-outline' },
    { value: 'exam', label: 'Exam Prep', icon: 'document-text-outline' },
    { value: 'general', label: 'General', icon: 'book-outline' }
  ];

  view: SecondHandBooksView = 'choice';
  buyer: BuyerPreferences = this.createEmptyPreferences();

  constructor(
    private readonly location: Location,
    private readonly router: Router
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

    this.location.back();
  }

  searchBooks(): void {
    if (!this.isBuyerReady) return;

    this.savePreferences();
    this.openDynamicListings('buyer');
  }

  openSellerFlow(): void {
    this.openDynamicListings('seller');
  }

  openMyListings(): void {
    this.openDynamicListings('my-listings');
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
