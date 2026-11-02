import { Component, OnInit, inject } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../footer/footer.component';
import { SupremePetBubbleComponent } from '../../superme-pet-bubble/superme-pet-bubble.component';
import { AcademyService, CategoryCard } from '../../../services/academy.service';
import { AdSliderComponent } from '../../ad-slider/ad-slider.component';

@Component({
    selector: 'app-academy-home',
    standalone: true,
    imports: [CommonModule, PublicNavbarComponent, FooterComponent, SupremePetBubbleComponent, AdSliderComponent],
    templateUrl: './academy-home.component.html',
    styleUrls: ['./academy-home.component.scss']
})
export class AcademyHomeComponent implements OnInit {
    private router = inject(Router);
    private academyService = inject(AcademyService);

    // Category cards with course counts
    categoryCards: CategoryCard[] = [];

    // Loading state from service
    get isLoading() {
        return this.academyService.isLoadingCourses();
    }

    get error() {
        return this.academyService.error();
    }

    ngOnInit(): void {
        this.loadCategories();
    }

    /**
     * Load courses and group by category
     */
    private loadCategories(): void {
        this.academyService.getCoursesGroupedByCategory().subscribe({
            next: (categories) => {
                this.categoryCards = categories;
            },
            error: (err) => {
                console.error('Failed to load categories:', err);
            }
        });
    }

    /**
     * Navigate to category course list
     */
    openCategory(category: string): void {
        this.router.navigate(['/home/academy/course'], {
            queryParams: { category }
        });
    }

    /**
     * Retry loading on error
     */
    retry(): void {
        this.academyService.invalidateCache();
        this.loadCategories();
    }

    // Legacy method - kept for backward compatibility
    onManagingMoneyClick(): void {
        this.openCategory('MANAGING_MONEY');
    }
}
