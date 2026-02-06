import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { CoinService } from '../../../services/coin.service';

@Component({
    selector: 'app-coin-purchase',
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulCardHeaderComponent, EmptyStateComponent],
    templateUrl: './coin-purchase.component.html',
    styleUrls: ['./coin-purchase.component.scss']
})
export class CoinPurchaseComponent implements OnInit {

    coinTotal: number = 0;

    constructor(private router: Router, private coinService: CoinService) {}

    ngOnInit() {
        // Subscribe to total coins updates
        this.coinService.totalCoins$.subscribe(total => {
            this.coinTotal = total;
        });
        
        // Use cached total if available
        this.coinTotal = this.coinService.getTotalCoins();
    }

    onBack() {
        this.router.navigate(['/authed', 'coin']);
    }
}