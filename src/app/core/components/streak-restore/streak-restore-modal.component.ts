import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';
import {
  StreakRestoreApi,
  StreakStatus
} from '../../api/streak-restore.api';
import { CustomToastService } from '../../services/custom-toast.service';
import { StreakMilestoneComponent } from '../streak-milestone/streak-milestone.component';

@Component({
  selector: 'app-streak-restore-modal',
  templateUrl: './streak-restore-modal.component.html',
  styleUrls: ['./streak-restore-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, HttpClientModule, StreakMilestoneComponent]
})
export class StreakRestoreModalComponent implements OnInit {
  @Input() restoreToStreak: number = 0;
  @Input() restoreCost: number = 5;
  @Input() userCoins: number = 0;
  @Input() userId!: number;

  streakStatus: StreakStatus | null = null;
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
    this.loadStreakStatus();
  }

  loadStreakStatus(): void {
    this.isLoading = true;
    this.errorMessage = '';
    if (!Number.isFinite(this.userId) || this.userId <= 0) {
      this.isLoading = false;
      this.notEligible = true;
      this.notEligibleMessage = 'Unable to identify the user for streak restore.';
      return;
    }

    this.streakRestoreApi.getStreakStatus(this.userId).subscribe({
      next: (data) => {
        this.isLoading = false;
        if (!data.canRestore) {
          this.notEligible = true;
          this.notEligibleMessage = "The restore window for your login streak has already closed.";
          return;
        }
        this.streakStatus = data;
        this.restoreToStreak = data.restoreToStreak ?? this.restoreToStreak;
        this.restoreCost = data.restoreCost ?? this.restoreCost;
        this.userCoins = Number(data.coins ?? this.userCoins);
        this.notEnoughCoins = this.userCoins < this.restoreCost;
      },
      error: () => {
        this.isLoading = false;
        this.notEligible = true;
        this.notEligibleMessage = 'Unable to check your streak restore right now. Please try again later.';
      }
    });
  }

  get canRestore(): boolean {
    return !!this.streakStatus?.canRestore && !this.notEnoughCoins && !this.isRestoring;
  }

  restore(): void {
    if (!this.canRestore) return;

    this.isRestoring = true;
    this.errorMessage = '';

    this.streakRestoreApi.postRestoreStreak(this.userId).subscribe({
      next: (result) => {
        this.isRestoring = false;
        const remainingCoins = result.coins
          ?? result.userCoins
          ?? Math.max(0, this.userCoins - this.restoreCost);
        this.dismiss({ success: true, userCoins: remainingCoins });
      },
      error: (err) => {
        this.isRestoring = false;
        console.error('[StreakRestore][DEBUG] restore failed. status=', err?.status, 'error=', err?.error, 'full=', err);
        const msg: string = err?.error?.message || (typeof err?.error === 'string' ? err.error : '') || '';
        if (msg.toLowerCase().includes('not enough coins') || msg.toLowerCase().includes('insufficient coins')) {
          this.errorMessage = "You don't have enough coins";
        } else if (msg.toLowerCase().includes('window expired') || msg.toLowerCase().includes('restore window')) {
          this.toastService.error('Too late! The restore window has closed.');
          this.dismiss(null);
        } else if (msg.toLowerCase().includes('no streak available')) {
          this.dismiss(null);
        } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('already restored')) {
          this.errorMessage = 'This login streak has already been restored or is no longer available.';
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
