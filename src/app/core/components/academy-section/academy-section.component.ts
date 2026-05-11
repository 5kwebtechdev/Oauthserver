import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { MindfulCardHeaderComponent } from '../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../mindful-navigator/view-all/view-all.component';
import { AcademyService } from '../../services/academy.service';

export interface CourseCard {
  id: string;
  title: string;
  lessons: number;
  duration: string;
  level: string;
  description: string;
  image?: string;
}

const FALLBACK_IMAGES = [
  '/assets/Images-Transparent/Academy-Course-Thubmnail3.png',
  '/assets/Images-Transparent/Academy-Course-Thubmnail4.png',
  '/assets/Images-Transparent/Academy-Course-Thubmnail5.png',
];

@Component({
  selector: 'academy-section',
  templateUrl: './academy-section.component.html',
  styleUrls: ['./academy-section.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulButtonComponent, MindfulCardHeaderComponent, ViewAllComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AcademySectionComponent implements OnInit {
  courses: CourseCard[] = [];
  loading = true;

  constructor(private router: Router, private academyService: AcademyService) {}

  ngOnInit(): void {
    this.academyService.getCourses().subscribe({
      next: (res) => {
        this.courses = res.map((c, i) => ({
          id: String(c.id),
          title: c.courseName,
          lessons: c.noOfLessons ?? 0,
          duration: c.duration ? `${c.duration} min` : '',
          level: c.difficulty ?? '',
          description: c.description ?? '',
          image: FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onViewAll(): void {
    this.router.navigate(['/authed/academy']);
  }

  onStart(course: CourseCard): void {
    this.router.navigate(['/authed/academy/course', course.id], { state: { course } });
  }
}
