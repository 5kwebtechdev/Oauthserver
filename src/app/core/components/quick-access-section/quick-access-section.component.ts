import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { filter, finalize, takeUntil } from 'rxjs/operators';
import { JournalAvailabilityService } from '../../services/journal-availability.service';
import { RefreshService } from '../../services/refresh.service';

@Component({
  selector: 'quick-access-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quick-access-section.component.html',
  styleUrls: ['./quick-access-section.component.scss']
})
export class QuickAccessSectionComponent implements OnInit, OnDestroy {
  checkingJournalAvailability = false;
  journalAvailable: boolean | null = null;
  private readonly destroy$ = new Subject<void>();
  private availabilityRequest?: Subscription;

  constructor(
    private router: Router,
    private journalAvailability: JournalAvailabilityService,
    private refreshService: RefreshService,
  ) { }

  ngOnInit(): void {
    this.refreshJournalAvailability();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter(event => /^\/(?:authed(?:\/home|\/user-dashboard)?|home|user-dashboard)\/?(?:[?#]|$)/.test(event.urlAfterRedirects)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.refreshJournalAvailability());
    this.refreshService.journalAdded$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      // A completed save is authoritative; an older availability request
      // must not replace it with the pre-save state.
      this.availabilityRequest?.unsubscribe();
      this.journalAvailable = false;
    });
    this.refreshService.refresh$.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshJournalAvailability());
    this.refreshService.journalTodayCleared$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.availabilityRequest?.unsubscribe();
      this.journalAvailable = true;
    });
  }

  ngOnDestroy(): void {
    this.availabilityRequest?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState === 'visible') this.refreshJournalAvailability();
  }

  openJournal(event: Event): void {
    event.preventDefault();
    if (this.checkingJournalAvailability) return;

    this.checkingJournalAvailability = true;
    this.availabilityRequest = this.journalAvailability.allowForTheDay()
      .pipe(finalize(() => this.checkingJournalAvailability = false))
      .subscribe({
        next: response => {
          this.journalAvailable = response?.allowForTheDay === true;
          if (response?.allowForTheDay) {
            this.router.navigate(['/journal-input']).catch(() => { });
            return;
          }
          void this.router.navigate(['/authed/journal-output'], { queryParams: { day: 'today' } });
        },
        // Do not prevent journaling if availability cannot be checked (for
        // example, a temporary network failure). The add endpoint remains the
        // final server-side safeguard.
        error: () => {
          if (this.journalAvailable === false) {
            void this.router.navigate(['/authed/journal-output'], { queryParams: { day: 'today' } });
            return;
          }
          this.router.navigate(['/journal-input']).catch(() => { });
        }
      });
  }

  private refreshJournalAvailability(): void {
    this.availabilityRequest?.unsubscribe();
    this.checkingJournalAvailability = true;
    this.availabilityRequest = this.journalAvailability.allowForTheDay()
      .pipe(
        finalize(() => this.checkingJournalAvailability = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: response => this.journalAvailable = response?.allowForTheDay === true,
        // Preserve the previous behavior during a temporary availability API
        // failure: journaling remains accessible and the add endpoint is the
        // final server-side safeguard.
        error: () => this.journalAvailable ??= true
      });
  }

}
