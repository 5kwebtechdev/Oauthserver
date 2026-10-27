import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupermeCardHeaderComponent } from '../../superme-navigator/superme-card-header/superme-card-header.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { CoinService, CoinHistoryItem } from '../../../services/coin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-coin-purchase',
    standalone: true,
    imports: [CommonModule, IonicModule, SupermeCardHeaderComponent, EmptyStateComponent],
    templateUrl: './coin-purchase.component.html',
    styleUrls: ['./coin-purchase.component.scss']
})
export class CoinPurchaseComponent implements OnInit, OnDestroy, ViewWillEnter {

    coinTotal: number = 0;
    isLoading: boolean = false;
    private destroy$ = new Subject<void>();

    constructor(private router: Router, private coinService: CoinService, private auth: AuthService) {}

    ngOnInit() {
        this.loadCoins();
    }

    ionViewWillEnter() {
        this.loadCoins();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadCoins(): void {
        this.isLoading = true;
        const history = this.auth.isParentUser()
            ? this.coinService.loadAccountCoinHistory()
            : this.coinService.loadCoinHistory();
        history
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response?.totalCoins != null) {
                        this.coinTotal = response.totalCoins;
                    } else if (response?.history) {
                        this.coinTotal = response.history.reduce(
                            (sum: number, item: CoinHistoryItem) => sum + item.amount, 0
                        );
                    }
                    this.isLoading = false;
                },
                error: () => {
                    this.isLoading = false;
                }
            });
    }

    onBack() {
        this.router.navigate(['/authed', 'coin']);
    }
}
