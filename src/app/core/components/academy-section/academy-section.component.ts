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
  fallbackImage?: string;
}

const FALLBACK_IMAGES = [
  '/assets/Images-Transparent/Academy-Course-Thubmnail1.png',
  '/assets/Images-Transparent/Academy-Course-Thubmnail2.png',
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
        this.courses = res.map((c, i) => {
          const fallbackImage = this.getFallbackImage(c.courseName, i);

          return {
            id: String(c.id),
            title: c.courseName,
            lessons: c.noOfLessons ?? 0,
            duration: c.duration ? `${c.duration} min` : '',
            level: c.difficulty ?? '',
            description: c.description ?? '',
            image: this.normalizeImageUrl(c.thumbnailUrl || '', fallbackImage),
            fallbackImage,
          };
        });
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

  onCourseImageError(event: Event, course: CourseCard): void {
    const fallbackImage = course.fallbackImage || FALLBACK_IMAGES[0];
    course.image = fallbackImage;

    const image = event.target as HTMLImageElement | null;
    if (image && image.getAttribute('src') !== fallbackImage) {
      image.src = fallbackImage;
    }
  }

  private getFallbackImage(title: string | undefined, index: number): string {
    const normalizedTitle = (title || '').toLowerCase();

    if (normalizedTitle.includes('money') || normalizedTitle.includes('budget')) {
      return FALLBACK_IMAGES[0];
    }

    return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  }

  private normalizeImageUrl(url: string, fallback: string): string {
    const trimmedUrl = (url || '').trim();
    if (!trimmedUrl) return fallback;

    const driveFileId = this.getGoogleDriveFileId(trimmedUrl);
    if (driveFileId) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w512`;
    }

    if (/^data:image\//i.test(trimmedUrl) || /^https?:\/\//i.test(trimmedUrl)) {
      return trimmedUrl;
    }

    if (trimmedUrl.startsWith('//')) {
      return `https:${trimmedUrl}`;
    }

    if (/^\/?assets\//i.test(trimmedUrl)) {
      return trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`;
    }

    if (/^Academy-Course-Thubmnail/i.test(trimmedUrl)) {
      return `/assets/Images-Transparent/${trimmedUrl}`;
    }

    if (/^Images-/i.test(trimmedUrl)) {
      return `/assets/${trimmedUrl}`;
    }

    return `/${trimmedUrl.replace(/^\/+/, '')}`;
  }

  private getGoogleDriveFileId(url: string): string | null {
    const viewMatch = url.match(/\/file\/d\/([^\/?]+)/);
    if (viewMatch?.[1]) return viewMatch[1];

    const openMatch = url.match(/[?&]id=([^&]+)/);
    if (openMatch?.[1]) return openMatch[1];

    const lh3Match = url.match(/googleusercontent\.com\/d\/([^\/?]+)/);
    return lh3Match?.[1] || null;
  }
}
