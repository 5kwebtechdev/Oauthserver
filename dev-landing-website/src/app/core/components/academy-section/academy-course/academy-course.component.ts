import { Component, OnInit, inject } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FooterComponent } from '../../footer/footer.component';
import { AcademyCardComponent } from '../academy-card/academy-card.component';
import { AcademyService, CourseDisplay, CategoryCard } from '../../../services/academy.service';

@Component({
    selector: 'app-academy-course',
    standalone: true,
    imports: [CommonModule, PublicNavbarComponent, FooterComponent, AcademyCardComponent],
    templateUrl: './academy-course.component.html',
    styleUrls: ['./academy-course.component.scss']
})
export class AcademyCourseComponent implements OnInit {
    private location = inject(Location);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private academyService = inject(AcademyService);

    // Current category info
    category: string = 'MANAGING_MONEY';
    categoryInfo: CategoryCard | undefined;

    // Course header info
    course = {
        title: 'Managing Money',
        subtitle: 'Spend smart · Save more · Use it well'
    };

    // Courses list from API
    courses: CourseDisplay[] = [];

    // Loading/error states
    get isLoading() {
        return this.academyService.isLoadingCourses();
    }

    get error() {
        return this.academyService.error();
    }

    ngOnInit(): void {
        // Get category from query params
        this.route.queryParams.subscribe(params => {
            this.category = params['category'] || 'MANAGING_MONEY';
            this.categoryInfo = this.academyService.getCategoryInfo(this.category);

            // Update header
            if (this.categoryInfo) {
                this.course.title = this.categoryInfo.title;
                this.course.subtitle = this.categoryInfo.subtitle;
            }

            this.loadCourses();
        });
    }

    /**
     * Load courses for the current category
     */
    private loadCourses(): void {
        this.academyService.getCoursesByCategory(this.category).subscribe({
            next: (courses) => {
                this.courses = courses;
            },
            error: (err) => {
                console.error('Failed to load courses:', err);
            }
        });
    }

    /**
     * Navigate back to academy home
     */
    onBackClick(): void {
        this.router.navigate(['/home/academy']);
    }

    /**
     * Navigate to course lesson page
     */
    onCardClick(course: CourseDisplay): void {
        this.router.navigate(['/home/academy/lesson', course.id], {
            state: { course }
        });
    }

    /**
     * Retry loading on error
     */
    retry(): void {
        this.academyService.invalidateCache();
        this.loadCourses();
    }
}
