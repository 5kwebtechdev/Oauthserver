import { Component, OnInit, OnDestroy } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FooterComponent } from '../../../components/footer/footer.component';
import { JournalCardComponent } from '../journal-card/journal-card.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { SupermeEmptyStateComponent } from '../../../components/superme-empty-state/superme-empty-state.component';
import { JournalService, JournalEntry } from '../../../services/journal.service';

@Component({
  selector: 'app-journal-home',
  standalone: true,
  imports: [CommonModule, FooterComponent, PublicNavbarComponent, JournalCardComponent, SupermeButtonComponent, SupermeEmptyStateComponent],
  templateUrl: './journal-home.component.html',
  styleUrls: ['./journal-home.component.scss']
})
export class JournalHomeComponent implements OnInit, OnDestroy {
  // Entries from API
  entries: JournalEntry[] = [];
  parsedJournal: any[] = [];
  loading = false;

  // Currently displayed month
  displayedMonth!: Date;
  private currentMonthStart!: Date;
  private previousMonthStart!: Date;

  private subs = new Subscription();

  // Harmless reference so the imported SupermeButtonComponent is considered "used"
  // by the Angular language service / editor. No runtime effect.
  readonly _SupermeButtonRef = SupermeButtonComponent;

  constructor(private router: Router, private journalService: JournalService) { }

  ngOnInit(): void {
    const now = new Date();
    this.currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    this.previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    this.displayedMonth = new Date(this.currentMonthStart);

    this.subs.add(this.journalService.loading$.subscribe(l => this.loading = l));
    this.subs.add(
      this.journalService.entries$.subscribe(entries => {
        this.entries = entries;
        this.parsedJournal = entries.map(e => ({
          date: e.date,
          time: e.time || e.date,
          mood: e.mood || 'Calm',
          tags: e.tags,
          note: e.content,
          images: e.images || [],
          parsedDate: new Date(e.date),
          id: e.id
        }));
      })
    );

    this.fetchEntriesForDisplayedMonth();
  }

  private fetchEntriesForDisplayedMonth(): void {
    this.journalService.loadEntriesForMonth(
      this.displayedMonth.getFullYear(),
      this.displayedMonth.getMonth() + 1
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }


  addEntry() {
    // navigate to the journal input page
    this.router.navigate(['/home/journal-input']);
  }

  prevMonth() {
    // Allow switching back only from current month to previous month
    if (this.isCurrentMonthView) {
      this.displayedMonth = new Date(this.previousMonthStart);
      this.fetchEntriesForDisplayedMonth();
    }
  }

  nextMonth() {
    // Allow moving forward only from previous month to current month; prevent future months
    if (this.isPreviousMonthView) {
      this.displayedMonth = new Date(this.currentMonthStart);
      this.fetchEntriesForDisplayedMonth();
    }
  }

  get isCurrentMonthView(): boolean {
    return this.displayedMonth.getFullYear() === this.currentMonthStart.getFullYear()
      && this.displayedMonth.getMonth() === this.currentMonthStart.getMonth();
  }

  get isPreviousMonthView(): boolean {
    return this.displayedMonth.getFullYear() === this.previousMonthStart.getFullYear()
      && this.displayedMonth.getMonth() === this.previousMonthStart.getMonth();
  }

  onEmptyAction(): void {
    if (this.isCurrentMonthView) {
      this.addEntry();
    }
  }

  get emptyStateTitle(): string {
    return this.isCurrentMonthView ? 'We are waiting to hear about your day!' : 'No record found';
  }

  get emptyStateDescription(): string {
    return this.isCurrentMonthView ? 'Post your journal to keep your story alive' : 'There are no journal entries for this month.';
  }

  get emptyStateActionText(): string | undefined {
    return this.isCurrentMonthView ? 'Post Now' : undefined;
  }

  // Human-readable label like "April, 2025"
  get monthYearLabel(): string {
    const monthName = this.displayedMonth.toLocaleString('en-US', { month: 'long' });
    return `${monthName}, ${this.displayedMonth.getFullYear()}`;
  }

  // Filtered journal entries for the displayed month
  get filteredJournal(): any[] {
    return this.parsedJournal.filter(j => j.parsedDate.getFullYear() === this.displayedMonth.getFullYear() && j.parsedDate.getMonth() === this.displayedMonth.getMonth());
  }

  get hasEntryToday(): boolean {
    const today = new Date();
    return this.parsedJournal.some(j =>
      j.parsedDate.getFullYear() === today.getFullYear() &&
      j.parsedDate.getMonth() === today.getMonth() &&
      j.parsedDate.getDate() === today.getDate()
    );
  }

  deleteEntry(id: string): void {
    this.journalService.deleteEntry(id).subscribe();
  }
}
