import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';
import {
  StreakRestoreApi,
  EligibleItem,
  StreakRestoreEligibility
} from '../../api/streak-restore.api';
import { CustomToastService } from '../../services/custom-toast.service';

@Component({
  selector: 'app-streak-restore-modal',
  templateUrl: './streak-restore-modal.component.html',
  styleUrls: ['./streak-restore-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, HttpClientModule]
})
export class StreakRestoreModalComponent implements OnInit {
  @Input() restoreToStreak: number = 0;
  @Input() restoreCost: number = 5;
  @Input() userCoins: number = 0;

  eligibility: StreakRestoreEligibility | null = null;
  selectedItem: EligibleItem | null = null;
  isLoading = true;
  isRestoring = false;
  notEnoughCoins = false;
  errorMessage = '';
  notEligible = false;
  notEligibleMessage = '';

  constructor(
    private modalCtrl: ModalController,
    private streakRestoreApi: StreakRestoreApi,
    private toastService: CustomToastService
  ) {}

  ngOnInit(): void {
    this.loadEligibility();
  }

  loadEligibility(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.streakRestoreApi.getRestoreEligibility().subscribe({
      next: (data) => {
        this.isLoading = false;
        if (!data.canRestore || data.eligibleItems.length === 0) {
          this.notEligible = true;
          this.notEligibleMessage = !data.canRestore
            ? "The restore window for yesterday's streak has already closed."
            : "There's nothing from yesterday left to restore.";
          return;
        }
        this.eligibility = data;
        this.notEnoughCoins = data.userCoins < data.restoreCost;
      },
      error: () => {
        this.isLoading = false;
        this.notEligible = true;
        this.notEligibleMessage = 'Unable to check your streak restore right now. Please try again later.';
      }
    });
  }

  selectItem(item: EligibleItem): void {
    if (this.notEnoughCoins) return;
    this.selectedItem = this.selectedItem?.id === item.id ? null : item;
  }

  get canRestore(): boolean {
    return !!this.selectedItem && !this.notEnoughCoins && !this.isRestoring;
  }

  restore(): void {
    if (!this.canRestore || !this.selectedItem) return;

    this.isRestoring = true;
    this.errorMessage = '';

    this.streakRestoreApi.postRestoreStreak(this.selectedItem.id, this.selectedItem.type).subscribe({
      next: (result) => {
        this.isRestoring = false;
        this.dismiss({ success: true, userCoins: result.userCoins });
      },
      error: (err) => {
        this.isRestoring = false;
        console.error('[StreakRestore][DEBUG] restore failed. status=', err?.status, 'error=', err?.error, 'full=', err);
        const msg: string = err?.error?.message || (typeof err?.error === 'string' ? err.error : '') || '';
        if (msg.toLowerCase().includes('not enough coins')) {
          this.errorMessage = "You don't have enough coins";
        } else if (msg.toLowerCase().includes('window expired') || msg.toLowerCase().includes('restore window')) {
          this.toastService.error('Too late! The restore window has closed.');
          this.dismiss(null);
        } else if (msg.toLowerCase().includes('no streak available')) {
          this.dismiss(null);
        } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('already restored')) {
          this.errorMessage = 'This item could not be restored, please try another';
        } else if (err?.status === 401 || err?.status === 403) {
          this.errorMessage = 'Your session expired. Please log out and back in, then try again.';
        } else if (err?.status === 0) {
          this.errorMessage = 'No connection. Check your internet and try again.';
        } else {
          // Surface the status/raw message so this is diagnosable without device console access.
          const detail = msg || (err?.status ? `status ${err.status}` : 'unknown error');
          this.errorMessage = `Something went wrong (${detail}). Please try again.`;
        }
      }
    });
  }

  dismiss(data: any): void {
    this.modalCtrl.dismiss(data);
  }
}
