import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PublicNavbarComponent } from '../../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../components/common-footer/common-footer.component';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

export interface PublicTutorProfile {
  id: string;
  name: string;
  headline: string;
  avatar: string;
  experience: string;
  likes: string;
  students: string;
  subjects: string;
  classLevels: string;
  boards: string;
  mode: string;
  languages: string;
  qualification: string;
  schedule: string;
  location: string;
  mapQuery: string;
  rate: string;
}

const EMPTY_PROFILE: PublicTutorProfile = {
  id: '',
  name: '',
  headline: '',
  avatar: 'assets/images/Tutor Name.png',
  experience: '',
  likes: '',
  students: '',
  subjects: '',
  classLevels: '',
  boards: '',
  mode: '',
  languages: '',
  qualification: '',
  schedule: '',
  location: '',
  mapQuery: '',
  rate: '',
};

const DAY_MAP: Record<string, string> = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
};

function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m}${period}`;
}

function mapApiToProfile(src: any, id: string): PublicTutorProfile {
  const days = Array.isArray(src.availability)
    ? src.availability.map((d: string) => DAY_MAP[d] ?? d).join(', ')
    : '';
  const timeRange = src.startTime && src.endTime
    ? ` - ${formatTime(src.startTime)} - ${formatTime(src.endTime)}`
    : '';

  const subjects = Array.isArray(src.subjects) ? src.subjects.join(', ') : (src.subjects ?? '');
  const classes  = Array.isArray(src.classes)  ? src.classes.join(', ')  : (src.classes  ?? '');
  const boards   = Array.isArray(src.boards)   ? src.boards.join(', ')   : (src.boards   ?? '');
  const languages = Array.isArray(src.languages) ? src.languages.join(', ') : (src.languages ?? '');
  const modes    = Array.isArray(src.modes)    ? src.modes.join(', ')    : (src.mode ?? src.modes ?? '');

  const location = [src.address, src.city, src.state].filter(Boolean).join(', ');

  return {
    id,
    name: src.name ?? '',
    headline: src.qualification ?? src.subjectExpertise ?? src.description ?? '',
    avatar: src.profilePicUrl ?? src.avatar ?? 'assets/images/Tutor Name.png',
    experience: src.experience ?? '',
    likes: src.champsLiked != null ? `${src.champsLiked} likes` : (src.hearts != null ? `${src.hearts} likes` : ''),
    students: src.studentsCount != null ? `${src.studentsCount} students` : '',
    subjects,
    classLevels: classes,
    boards,
    mode: modes,
    languages,
    qualification: src.qualification ?? '',
    schedule: days ? `${days}${timeRange}` : '',
    location,
    mapQuery: location || src.name,
    rate: src.fees != null ? String(src.fees) : (src.hourlyRate != null ? String(src.hourlyRate) : ''),
  };
}

@Component({
  selector: 'app-tutor-public-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicNavbarComponent, CommonFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page.component.html',
})
export class TutorPublicProfilePageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  profile = signal<PublicTutorProfile>(EMPTY_PROFILE);
  isLoading = signal(true);
  error = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (environment.apiAuthToken) {
      const token = environment.apiAuthToken.startsWith('Bearer ')
        ? environment.apiAuthToken
        : `Bearer ${environment.apiAuthToken}`;
      headers = headers.set('Authorization', token);
    }

    this.http.get<any>(`${environment.apiUrl}/tutors/${id}`, { headers }).subscribe({
      next: (res) => {
        const src = res?.data ?? res?.tutor ?? res;
        this.profile.set(mapApiToProfile(src, id));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set(true);
      },
    });
  }

  mapHref(): string {
    const q = this.profile().mapQuery;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  contactNow(): void {
    const tutorId = this.profile().id;
    const protectedProfileUrl = `/tutor/${tutorId}`;

    if (this.authService.isLoggedIn()) {
      this.router.navigateByUrl(protectedProfileUrl);
      return;
    }

    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: protectedProfileUrl },
    });
  }
}
