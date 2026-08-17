import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { JournalAvailabilityService } from '../../services/journal-availability.service';

@Component({
  selector: 'quick-access-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quick-access-section.component.html',
  styleUrls: ['./quick-access-section.component.scss']
})
export class QuickAccessSectionComponent {
  checkingJournalAvailability = false;

  constructor(
    private router: Router,
    private toastController: ToastController,
    private journalAvailability: JournalAvailabilityService
  ) { }

  openJournal(event: Event): void {
    event.preventDefault();
    if (this.checkingJournalAvailability) return;

    this.checkingJournalAvailability = true;
    this.journalAvailability.allowForTheDay()
      .pipe(finalize(() => this.checkingJournalAvailability = false))
      .subscribe({
        next: response => {
          if (response?.allowForTheDay) {
            this.router.navigate(['/authed/journal-input']).catch(() => { });
            return;
          }
          this.showJournalAlreadyAddedMessage();
        },
        // Do not prevent journaling if availability cannot be checked (for
        // example, a temporary network failure). The add endpoint remains the
        // final server-side safeguard.
        error: () => this.router.navigate(['/authed/journal-input']).catch(() => { })
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
