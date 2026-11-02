import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { JournalCardComponent } from '../journal-card/journal-card.component';
import { SupermeHomeHeaderComponent } from '../../../components/superme-home-header';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { JournalService, JournalEntry } from '../../../services/journal.service';

@Component({
  selector: 'app-journal-dashboard',
  standalone: true,
  imports: [CommonModule, JournalCardComponent, SupermeHomeHeaderComponent, SupermeButtonComponent],
  templateUrl: './journal-dashboard.component.html',
  styleUrls: ['./journal-dashboard.component.scss']
})
export class JournalDashboardComponent implements OnInit, OnDestroy {
  journal: any[] = [];
  journalLoading = false;
  journalStart = 0;
  visibleCount = 3;

  journalSubtitleHtml: string = 'Track moods <span class="dot">·</span> Save <span class="dot">·</span> Feel Better';

  private journalSub?: Subscription;

  constructor(private journalService: JournalService) {
    this.updateVisibleCount();
  }

  @HostListener('window:resize')
  onResize() {
    const prev = this.visibleCount;
    this.updateVisibleCount();
    if (this.visibleCount !== prev) this.journalStart = 0;
  }

  private updateVisibleCount() {
    const w = window.innerWidth;
    this.visibleCount = w <= 640 ? 1 : w <= 768 ? 2 : 3;
  }

  get isJournalNextDisabled() {
    return this.journalStart + this.visibleCount >= this.journal.length;
  }

  ngOnInit(): void {
    this.loadJournalData();
  }

  ngOnDestroy(): void {
    if (this.journalSub) this.journalSub.unsubscribe();
  }

  journalPrev() {
    this.journalStart = Math.max(0, this.journalStart - this.visibleCount);
  }

  journalNext() {
    if (this.journalStart + this.visibleCount < this.journal.length) {
      this.journalStart += this.visibleCount;
    }
  }

  private loadJournalData(): void {
    this.journalLoading = true;
    this.journalSub = this.journalService.entries$.subscribe(entries => {
      this.journal = entries.map(e => ({
        id: e.id,
        date: e.date,
        mood: e.mood || 'Calm',
        tags: e.tags,
        note: e.content,
        images: e.images || [],
        time: e.time || e.date
      }));
      this.journalLoading = false;
    });

    this.journalService.loading$.subscribe(loading => {
      this.journalLoading = loading;
    });

    const now = new Date();
    this.journalService.loadEntriesForMonth(now.getFullYear(), now.getMonth() + 1).subscribe({
      error: (err) => {
        console.error('Failed to load journal entries', err);
        this.journalLoading = false;
      }
    });
  }

  private formatTime(time: string | Date | undefined): string {
    if (!time) return '';
    const d = time instanceof Date ? time : new Date(`1970-01-01T${time}`);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}