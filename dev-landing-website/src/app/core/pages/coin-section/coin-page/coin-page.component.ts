import { Component, OnInit } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FooterComponent } from '../../../components/footer/footer.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { SupermeEmptyStateComponent } from '../../../components/superme-empty-state/superme-empty-state.component';
import { CoinCardComponent } from '../coin-card/coin-card.component';
import { RedeemCardComponent } from '../redeem-card/redeem-card.component';
import { CoinHelplineComponent } from '../coin-helpline/coin-helpline.component';
import { CoinService, CoinItem, CoinHistoryItem } from '../../../services/coin.service';
import { AdSliderComponent } from '../../../components/ad-slider/ad-slider.component';

type Category = 'Pets' | 'Accessories';

@Component({
  selector: 'sm-coin-page',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, PublicNavbarComponent, FooterComponent, SupermeButtonComponent, SupermeEmptyStateComponent, CoinCardComponent, CoinHelplineComponent, AdSliderComponent],
  templateUrl: './coin-page.component.html',
  styleUrls: ['./coin-page.component.scss']
})
export class CoinPageComponent implements OnInit {
  // Coin values from API
  totalCoins = 0;
  isLoading = false;
  coinItems: CoinItem[] = [];

  // sample redeem items
  redeemItems: Record<Category, { title: string; imageSrc: string; cost: number }[]> = {
    Pets: [
      { title: 'Koda the Chill Llama', imageSrc: '/assets/Landing/Images-Pet/Image-Llama-Happy.png', cost: 50 },
      { title: 'Luna the Wise Owl', imageSrc: '/assets/Landing/Images-Pet/Image-Owl-Happy.png', cost: 50 },
      { title: 'Zuki the Fierce Dragon', imageSrc: '/assets/Landing/Images-Pet/Image-Dragon-Happy.png', cost: 50 }
    ],
    Accessories: [
      { title: 'Torso Armor Sash', imageSrc: '/assets/Landing/Images-Pet/accessories/Accessory-%20Torso%20Armor%20Sash.png', cost: 120 },
      { title: 'Scholars Crown', imageSrc: '/assets/Landing/Images-Pet/accessories/Accessory-%20Scholar%27s%20Crown.png', cost: 80 },
      { title: 'Royal Ermine Cape', imageSrc: '/assets/Landing/Images-Pet/accessories/Accessory-%20Royal%20Ermine%20Cape.png', cost: 200 },
      { title: 'Excellence Pendant', imageSrc: '/assets/Landing/Images-Pet/accessories/Accessory-%20Excellence%20Pendant.png', cost: 50 }
    ]
  };

  selectedCategory: Category = 'Pets';

  // whether redeem view is active (shows redeem-container)
  redeemActive = false;

  // whether coin helpline panel is visible
  showHelpline = false;

  // confirm modal state
  showConfirm = false;
  selectedItem: { title: string; imageSrc: string; cost: number } | null = null;

  openConfirm(item: { title: string; imageSrc: string; cost: number }) {
    this.selectedItem = item;
    this.showConfirm = true;
  }

  cancelConfirm() {
    this.showConfirm = false;
    this.selectedItem = null;
  }

  confirmRedeem() {
    if (!this.selectedItem) return;
    const cost = Number(this.selectedItem.cost) || 0;
    if (this.totalCoins >= cost) {
      this.totalCoins = this.totalCoins - cost;
    }
    this.cancelConfirm();
  }

  // toggle redeem view
  toggleRedeem() {
    this.redeemActive = !this.redeemActive;
  }

  // toggle visibility of the coin helpline
  toggleHelpline() {
    const next = !this.showHelpline;
    this.showHelpline = next;
    if (next) {
      // When helpline opens, hide other panels and any open confirm modal
      this.redeemActive = false;
      this.showConfirm = false;
    }
  }

  // select category for redeem
  selectCategory(category: Category) {
    this.selectedCategory = category;
  }

  // Formatted coin list for display (derived from coinItems)
  get coinsList() {
    return [...this.coinItems]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(item => ({
      title: item.label,
      date: item.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      imageSrc: item.icon,
      changeIcon: '/assets/icon/currency-icon.png',
      changeValue: item.count,
      contentType: item.contentType,
      dayLabel: this.getDayLabel(item.date)
    }));
  }

  get groupedCoinsList() {
    const groups: { label: string; items: any[] }[] = [];

    this.coinsList.forEach(item => {
      let group = groups.find(g => g.label === item.dayLabel);
      if (!group) {
        group = { label: item.dayLabel, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });

    return groups;
  }

  constructor(private coinService: CoinService) { }

  ngOnInit(): void {
    this.loadCoinHistory();
  }

  /**
   * Load coin history from API
   */
  loadCoinHistory(): void {
    this.isLoading = true;
    this.coinService.loadCoinHistory().subscribe({
      next: (response) => {
        if (response) {
          this.totalCoins = response.totalCoins;
          this.coinItems = this.coinService.mapHistoryToCoinItems(response.history);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading coin history:', error);
        this.isLoading = false;
      }
    });
  }

  private getDayLabel(date: Date): string {
    const today = this.startOfDay(new Date());
    const itemDay = this.startOfDay(date);
    const diffDays = Math.round((today.getTime() - itemDay.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
