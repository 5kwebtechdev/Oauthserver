import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FooterComponent } from '../footer/footer.component';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../../environments/environment';

interface AnalyticStat {
  label: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
  completionRate: number | null;
}

interface AnalyticsOverview {
  habits: AnalyticStat[];
  tasks: AnalyticStat[];
  mood: AnalyticStat[];
  knowledgeGained: AnalyticStat[];
  journal: AnalyticStat[];
  achievements: AnalyticStat[];
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, IonicModule, FooterComponent],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent implements OnInit {
  loading = true;
  error = false;
  data: AnalyticsOverview | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.fetchOverview();
  }

  private fetchOverview(): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: token?.startsWith('Bearer ') ? token : `Bearer ${token}`
    });
    this.http
      .get<AnalyticsOverview>(`${environment.apiUrl}/screen-analytics/overview`, { headers })
      .subscribe({
        next: (res) => { this.data = res; this.loading = false; },
        error: () => { this.error = true; this.loading = false; }
      });
  }

  retryLoad(): void {
    this.loading = true;
    this.error = false;
    this.fetchOverview();
  }

  cardIcon(icon: string): string {
    const map: Record<string, string> = {
      'arrow-up':  'assets/Icons-Neutral/Icon-Streak-3D.png',
      'bar-chart': 'assets/Icons-Neutral/TotalActiveDays-3D.png',
      'quiz':      'assets/Icons-Neutral/Icon-Content-Quiz.png',
      'puzzle':    'assets/Icons-Neutral/Icon-Content-Puzzle.png',
      'article':   'assets/Icons-Neutral/Icon-Content-Articles.png',
      'lesson':    'assets/Icons-Neutral/Icon-BestStreak-3D.png',
      'journal':   'assets/Icons-Neutral/Icon-Notes-3D.png',
      'badge':     'assets/Icons-Neutral/Icon-Badge.png',
      'trophy':    'assets/Icons-Neutral/Icon-Trophy.png',
      'streak':    'assets/Icons-Neutral/Icon-Streak-3D.png',
      'coin':      'assets/Icons-Neutral/Icons-Coins.png',
    };
    return map[icon] || 'assets/Icons-Neutral/Icon-SuccessRate.png';
  }

  moodEmoji(value: string): string {
    const map: Record<string, string> = {
      HAPPY: '😊', EXCITED: '🤩', CALM: '😌', GREAT: '😄',
      UPSET: '😔', SAD: '😢', ANGRY: '😠', ANXIOUS: '😰',
      TIRED: '😴', BORED: '😑', OKAY: '🙂', NEUTRAL: '😐',
    };
    return map[(value || '').toUpperCase()] ?? '😊';
  }

  moodLabel(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  skeletonItems = [1, 2, 3, 4, 5, 6];
}
