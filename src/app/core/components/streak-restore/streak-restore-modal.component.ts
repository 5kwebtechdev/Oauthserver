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
          this.dismiss(null);
          return;
        }
        this.eligibility = data;
        this.notEnoughCoins = data.userCoins < data.restoreCost;
      },
      error: () => {
        this.isLoading = false;
        this.dismiss(null);
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
        const msg: string = err?.error?.message || '';
        if (msg.toLowerCase().includes('not enough coins')) {
          this.errorMessage = "You don't have enough coins";
        } else if (msg.toLowerCase().includes('window expired') || msg.toLowerCase().includes('restore window')) {
          this.toastService.error('Too late! The restore window has closed.');
          this.dismiss(null);
        } else if (msg.toLowerCase().includes('no streak available')) {
          this.dismiss(null);
        } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('already restored')) {
          this.errorMessage = 'This item could not be restored, please try another';
        } else {
          this.errorMessage = 'Something went wrong. Please try again.';
        }
      }
    });
  }

  dismiss(data: any): void {
    this.modalCtrl.dismiss(data);
  }
}
