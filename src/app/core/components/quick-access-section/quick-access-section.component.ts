import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { filter, finalize, takeUntil } from 'rxjs/operators';
import { JournalAvailabilityService } from '../../services/journal-availability.service';

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

  constructor(
    private router: Router,
    private toastController: ToastController,
    private journalAvailability: JournalAvailabilityService
  ) { }

  ngOnInit(): void {
    this.refreshJournalAvailability();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter(event => event.urlAfterRedirects.startsWith('/authed/user-dashboard')),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.refreshJournalAvailability());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openJournal(event: Event): void {
    event.preventDefault();
    if (this.checkingJournalAvailability) return;

    this.checkingJournalAvailability = true;
    this.journalAvailability.allowForTheDay()
      .pipe(finalize(() => this.checkingJournalAvailability = false))
      .subscribe({
        next: response => {
          this.journalAvailable = response?.allowForTheDay === true;
          if (response?.allowForTheDay) {
            this.router.navigate(['/authed/journal-input']).catch(() => { });
            return;
          }
          this.showJournalAlreadyAddedMessage();
        },
        // Do not prevent journaling if availability cannot be checked (for
        // example, a temporary network failure). The add endpoint remains the
        // final server-side safeguard.
        error: () => {
          this.journalAvailable = true;
          this.router.navigate(['/authed/journal-input']).catch(() => { });
        }
      });
  }

  private refreshJournalAvailability(): void {
    if (this.checkingJournalAvailability) return;
    this.checkingJournalAvailability = true;
    this.journalAvailability.allowForTheDay()
      .pipe(
        finalize(() => this.checkingJournalAvailability = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: response => this.journalAvailable = response?.allowForTheDay === true,
        // Preserve the previous behavior during a temporary availability API
        // failure: journaling remains accessible and the add endpoint is the
        // final server-side safeguard.
        error: () => this.journalAvailable = true
      });
  }

  private async showJournalAlreadyAddedMessage(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'You have already added your journal for today. Come back tomorrow!',
      duration: 3200,
      position: 'bottom',
      color: 'medium'
    });
    await toast.present();
  }
}
