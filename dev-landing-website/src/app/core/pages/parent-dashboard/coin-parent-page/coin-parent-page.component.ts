import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CoinService, CoinItem } from '../../../services/coin.service';
import { PublicNavbarComponent } from '../../../components/public-navbar/public-navbar.component';
import { CoinCardComponent } from '../../coin-section/coin-card/coin-card.component';
import { CoinHelplineComponent } from '../../coin-section/coin-helpline/coin-helpline.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { SupermeEmptyStateComponent } from '../../../components/superme-empty-state/superme-empty-state.component';
import { AdSliderComponent } from '../../../components/ad-slider/ad-slider.component';

@Component({
  selector: 'app-coin-parent-page',
  standalone: true,
  imports: [CommonModule, NgIf, PublicNavbarComponent, CoinCardComponent, CoinHelplineComponent, SupermeButtonComponent, SupermeEmptyStateComponent, AdSliderComponent],
  templateUrl: './coin-parent-page.component.html',
  styleUrls: ['./coin-parent-page.component.scss']
})
export class CoinParentPageComponent implements OnInit, OnDestroy {
  totalCoins = 0;
  coinsList: CoinItem[] = [];
  showHelpline = false;
  isLoading = true;

  private coinsSub?: Subscription;
  private historySub?: Subscription;

  constructor(private router: Router, private coinService: CoinService) {}

  get coinAmount(): string {
    return this.totalCoins.toLocaleString();
  }

  ngOnInit() {
    this.coinsSub = this.coinService.totalCoins$.subscribe(c => this.totalCoins = c);
    this.historySub = this.coinService.coinHistory$.subscribe(history => {
      this.coinsList = this.coinService.mapHistoryToCoinItems(history);
    });
    this.coinService.loadCoinHistory().subscribe({
      next: () => this.isLoading = false,
      error: () => this.isLoading = false
    });
  }

  ngOnDestroy() {
    this.coinsSub?.unsubscribe();
    this.historySub?.unsubscribe();
  }

  toggleHelpline() {
    this.showHelpline = !this.showHelpline;
  }

  navigateToCoinPack() {
    this.router.navigate(['/coin-pack']);
  }
}
