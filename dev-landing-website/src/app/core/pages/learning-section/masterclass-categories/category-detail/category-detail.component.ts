import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { FooterComponent } from 'src/app/core/components/footer/footer.component';
import { AcademyCardComponent } from 'src/app/core/components/academy-section/academy-card/academy-card.component';
import { Category } from '../../../../models/category.model';
import { CategoryService } from '../../../../services/category.service';
import { Course } from '../../../../models/course.model';
import { CourseService } from '../../../../services/course.service';
import { AuthService } from '../../../../services/auth.service';

const DEFAULT_AGE = 9;

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [CommonModule, PublicNavbarComponent, FooterComponent, AcademyCardComponent],
  templateUrl: './category-detail.component.html',
  styleUrls: ['./category-detail.component.scss']
})
export class CategoryDetailComponent implements OnInit {
  category: Category | null = null;
  courses: Course[] = [];

  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private categoryService: CategoryService,
    private courseService: CourseService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const categoryId = Number(this.route.snapshot.paramMap.get('id'));
    const navigatedCategory = (history.state as { category?: Category })?.category ?? null;

    if (navigatedCategory) {
      this.category = navigatedCategory;
      this.loadCourses();
    } else if (categoryId) {
      // Page was opened directly (e.g. refresh) without router state - resolve
      // the category from the full list first.
      this.resolveCategoryThenLoadCourses(categoryId);
    } else {
      this.errorMessage = 'Category not found.';
    }
  }

  /** Re-fetches the course list for the current category. Bound to the retry button. */
  loadCourses(): void {
    if (!this.category) return;

    this.isLoading = true;
    this.errorMessage = null;

    const age = this.resolveAge();

    this.courseService.getCoursesByAge(age, this.category.id).subscribe({
      next: (courses) => {
        this.courses = (courses ?? []).filter(c => c.category === this.category!.categoryName);
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Unable to load courses.';
        this.isLoading = false;
      }
    });
  }

  formatDifficulty(difficulty: string): string {
    const map: Record<string, string> = {
      BEGINNER: 'Beginner',
      INTERMEDIATE: 'Intermediate',
      ADVANCED: 'Advanced'
    };
    return map[(difficulty || '').toUpperCase()] || difficulty;
  }

  trackByCourseId(_index: number, course: Course): number {
    return course.id;
  }

  onCourseClick(course: Course): void {
    this.router.navigate(['/masterclass/course', course.id]);
  }

  goBack(): void {
    this.location.back();
  }

  private resolveCategoryThenLoadCourses(categoryId: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.category = (categories ?? []).find(c => c.id === categoryId) ?? null;

        if (!this.category) {
          this.isLoading = false;
          this.errorMessage = 'Category not found.';
          return;
        }

        this.loadCourses();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Unable to load courses.';
      }
    });
  }

  /** Prefers the logged-in user's stored age, falling back to a date-of-birth calculation. */
  private resolveAge(): number {
    const user = this.authService.getUserData();

    if (user?.age) {
      return user.age;
    }

    if (user?.dateOfBirth) {
      const computed = this.calculateAge(new Date(user.dateOfBirth));
      if (computed !== null) return computed;
    }

    return DEFAULT_AGE;
  }

  private calculateAge(dob: Date): number | null {
    if (isNaN(dob.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }
}
