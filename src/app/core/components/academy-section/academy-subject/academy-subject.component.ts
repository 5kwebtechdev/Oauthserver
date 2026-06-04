import { Component, Input, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NavigationService } from '../../../services/navigation.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AcademyService, Course } from '../../../services/academy.service';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';

@Component({
  selector: 'app-academy-subject',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulCardHeaderComponent],
  templateUrl: './academy-subject.component.html',
  styleUrls: ['./academy-subject.component.scss']
})
export class AcademySubjectComponent implements OnInit {
  @Input() title: string | undefined;
  @Input() description: string | undefined;

  category: string = '';
  categoryTitle: string = '';
  categorySubtitle: string = '';
  isLoading: boolean = false;

  // Course model from API
  lessons: Array<{
    title: string;
    meta: string;
    coins: number;
    badge: string;
    thumb: string;
    coinIcon: string;
    courseId?: string;
    rawCourse?: Course;
  }> = [];

  // Category title mapping
  private categoryTitles: { [key: string]: { title: string; subtitle: string } } = {
    'MANAGING_MONEY': { title: 'Managing Money', subtitle: 'Spend smart • Save more • Use it well' },
    'COMMUNICATION': { title: 'Communication', subtitle: 'Express yourself • Listen well • Connect better' },
    'MEDITATION': { title: 'Meditation', subtitle: 'Breathe deep • Stay calm • Find peace' },
    'CULTURAL_VALUES': { title: 'Cultural Values', subtitle: 'Respect all • Embrace diversity • Grow together' }
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private academyService: AcademyService,
    private navigation: NavigationService
  ) { }

  ngOnInit() {
    // Get category from query params
    this.route.queryParams.subscribe(params => {
      this.category = params['category'] || 'MANAGING_MONEY';
      const categoryInfo = this.categoryTitles[this.category];
      this.categoryTitle = categoryInfo?.title || 'Academy';
      this.categorySubtitle = categoryInfo?.subtitle || '';
      this.loadCourses();
    });
  }

  loadCourses() {
    this.academyService.getCourses().subscribe({
      next: (courses: Course[]) => {
        console.log('All courses from API:', courses);
        console.log('Current category:', this.category);

        // Filter courses by category only (removed enabled filter for testing)
        const filteredCourses = courses.filter(
          course => course.category === this.category
        );

        console.log('Filtered courses:', filteredCourses);

        // Map courses to lesson display format
        this.lessons = filteredCourses.map(course => ({
          title: course.courseName,
          meta: `${course.noOfLessons} ${course.noOfLessons === 1 ? 'lesson' : 'lessons'} • ${course.duration} min`,
          coins: course.totalCoins || 0,
          badge: this.formatDifficulty(course.difficulty || 'BEGINNER'),
          thumb: this.convertDriveLink(course.thumbnailUrl || ''),
          coinIcon: 'assets/Icons-Neutral/Icons-Coins.png',
          courseId: course.id?.toString(),
          rawCourse: course
        }));

        console.log('Mapped lessons:', this.lessons);
      },
      error: (error) => {
        console.error('Error loading courses:', error);
      }
    });
  }

  formatDifficulty(difficulty: string): string {
    const difficultyMap: { [key: string]: string } = {
      'BEGINNER': 'Beginner',
      'INTERMEDIATE': 'Intermediate',
      'ADVANCED': 'Advanced',
      'PRO': 'Pro'
    };
    return difficultyMap[difficulty] || difficulty;
  }

  // Convert Google Drive sharing link to direct image URL
  convertDriveLink(url: string): string {
    if (!url) return '/assets/Images-Transparent/Academy-Course-Thubmnail1.png';

    // Check if it's a Google Drive link
    if (url.includes('drive.google.com')) {
      // Extract file ID from various Google Drive URL formats
      let fileId = '';

      // Format: https://drive.google.com/file/d/FILE_ID/view
      const viewMatch = url.match(/\/file\/d\/([^\/]+)/);
      if (viewMatch) {
        fileId = viewMatch[1];
      }

      // Format: https://drive.google.com/open?id=FILE_ID
      const openMatch = url.match(/[?&]id=([^&]+)/);
      if (openMatch) {
        fileId = openMatch[1];
      }

      // If we found a file ID, convert to thumbnail URL (works better for images)
      if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }

    // Return original URL if not a Drive link or already in correct format
    return url;
  }

  goBack() {
    this.navigation.back();
  }

  // currently selected course to show in the course detail component
  selectedCourse: { id: string; title: string; lessons: number; duration: string; level: string; description: string; image?: string } | null = null;

  openCourseByTitle(title: string) {
    const match = this.lessons.find(l => l.title === title);
    if (!match) return;

    // prefer to use courseId from API if available, otherwise fallback to title-based id
    const id = match.courseId || (match.title === 'Budgeting Basics' ? 'budget-1' : match.title.toLowerCase().replace(/\s+/g, '-'));

    // navigate to the course route and pass the full course object in navigation state so
    // the `AcademyCourseComponent` can use it directly (avoids re-fetch)
    this.router.navigate(['/authed/academy/course', id], { state: { course: match.rawCourse } });
  }

  closeCourse() {
    this.selectedCourse = null;
  }

  onLessonStart(event: { courseId: string; lessonIndex: number }) {
    console.log('lessonStart', event);
    // Close the panel or navigate to the lesson page
    this.closeCourse();
    // e.g. this.router.navigate(['/academy', event.courseId, 'lesson', event.lessonIndex]);
  }

  startFirstLesson() {
    if (!this.selectedCourse) return;
    this.onLessonStart({ courseId: this.selectedCourse.id, lessonIndex: 0 });
  }
}
