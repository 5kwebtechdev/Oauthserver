import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FooterComponent } from '../../../components/footer/footer.component';

interface CoinPack {
  id: string;
  name: string;
  price: number;
  coins: number;
  selected?: boolean;
}

@Component({
  selector: 'app-coin-pack-page',
  standalone: true,
  imports: [CommonModule, FooterComponent],
  templateUrl: './coin-pack-page.component.html',
  styleUrls: ['./coin-pack-page.component.scss']
})
export class CoinPackPageComponent {
  currentBalance = 25000;
  selectedPack: CoinPack | null = null;
  showSummary = false;

  coinPacks: CoinPack[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 50,
      coins: 100,
      selected: true
    },
    {
      id: 'popular',
      name: 'Popular',
      price: 100,
      coins: 200,
      selected: false
    }
  ];

  constructor(private router: Router) {
    // Set the first pack as selected by default
    this.selectedPack = this.coinPacks[0];
  }

  selectPack(pack: CoinPack) {
    // Unselect all packs
    this.coinPacks.forEach(p => p.selected = false);
    // Select the clicked pack
    pack.selected = true;
    this.selectedPack = pack;
  }

  onSelect() {
    if (this.selectedPack) {
      // Show summary view
      this.showSummary = true;
    }
  }

  goBack() {
    if (this.showSummary) {
      // If on summary view, go back to pack selection
      this.showSummary = false;
    } else {
      // If on pack selection, go back to parent dashboard
      this.router.navigate(['/parent-dashboard']);
    }
  }

  proceedWithPayment() {
    if (this.selectedPack) {
      console.log('Processing payment for:', this.selectedPack);
      // TODO: Implement actual payment logic
    }
  }
}
