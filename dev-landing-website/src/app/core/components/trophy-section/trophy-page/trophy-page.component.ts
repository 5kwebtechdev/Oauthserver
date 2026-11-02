import { Component, OnInit } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { Router } from '@angular/router';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { FooterComponent } from '../../footer';
import { SupermeEmptyStateComponent } from '../../superme-empty-state/superme-empty-state.component';
import { TrophyTransactionCardComponent } from '../trophy-transaction-card';
import { TrophyService, Trophy, GroupedTrophies } from '../../../services/trophy.service';

@Component({
    selector: 'app-trophy-page',
    standalone: true,
    imports: [CommonModule, NgIf, NgForOf, PublicNavbarComponent, TrophyTransactionCardComponent, FooterComponent, SupermeEmptyStateComponent],
    templateUrl: './trophy-page.component.html',
    styleUrls: ['./trophy-page.component.scss']
})
export class TrophyPageComponent implements OnInit {
    // Grouped transactions by month
    months: {
        title: string;
        transactions: { title: string; difficulty: string; earnedOn: string; avatar: string; points: number; contentType?: string; thumbnailUrl?: string | null }[];
    }[] = [];

    // Header values
    headerTitle = 'Your Trophy Trail';
    headerSubtitle = 'See wins · Know dates · Keep going';
    trophiesCount = 0;
    trophyImage = '/assets/Icons-Neutral/Icon-Trophy.png';

    // Loading state
    isLoading = false;
    errorMessage = '';

    constructor(
        private router: Router,
        private trophyService: TrophyService
    ) { }

    ngOnInit(): void {
        this.loadTrophies();
    }

    /**
     * Load trophies from API
     */
    loadTrophies(): void {
        this.isLoading = true;
        this.errorMessage = '';

        this.trophyService.fetchTrophies().subscribe({
            next: (response) => {
                this.trophiesCount = response.totalCount;
                const grouped = this.trophyService.groupTrophiesByMonth(response.trophies);
                this.months = this.mapGroupedTrophiesToMonths(grouped);
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Failed to load trophies:', error);
                this.errorMessage = error.message || 'Failed to load trophies. Please try again later.';
                this.isLoading = false;
                this.trophiesCount = 0;
                this.months = [];
            }
        });
    }

    /**
     * Map grouped trophies to display format
     */
    private mapGroupedTrophiesToMonths(grouped: GroupedTrophies[]): typeof this.months {
        return grouped.map(group => ({
            title: group.title,
            transactions: group.items.map(trophy => ({
                title: trophy.title,
                difficulty: trophy.difficulty,
                earnedOn: this.trophyService.formatEarnedOn(trophy.earnedOn),
                avatar: this.getTrophyAvatar(trophy.contentType),
                points: trophy.points,
                contentType: trophy.contentType,
                thumbnailUrl: trophy.categoryIconUrl
            }))
        }));
    }

    
    private getTrophyAvatar(contentType?: string): string {
        if (!contentType) return 'assets/Images-Thumbnails/brain-1.png';
        const ct = contentType.toLowerCase();
        if (ct.includes('quiz')) return 'assets/Images-Thumbnails/brain-1.png';
        if (ct.includes('challenge')) return 'assets/Images-Thumbnails/brain-2.png';
        if (ct.includes('habit')) return 'assets/Images-Thumbnails/brain-3.png';
        return 'assets/Images-Thumbnails/brain-1.png';
    }

    // Total transactions across months
    get totalTransactions(): number {
        return this.months.reduce((sum, m) => sum + (m.transactions?.length || 0), 0);
    }

    earnTrophies() {
        this.router.navigate(['/learning']);
    }

    
    getCategoryLetter(contentType?: string): string {
        return this.trophyService.getCategoryLetter(contentType);
    }


    getCategoryClass(contentType?: string): string {
        return this.trophyService.getCategoryClass(contentType);
    }
}
