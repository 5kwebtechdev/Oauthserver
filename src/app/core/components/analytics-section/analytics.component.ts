import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { FooterComponent } from '../footer/footer.component';

interface AnalyticStat {
  label: string;
  value: string | number | null;
  subtitle: string;
  icon?: string | null;
  iconUrl?: string | null;
  iconURL?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  categoryIconUrl?: string | null;
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

  private readonly iconFallbacks: Record<string, string> = {
    'arrow-up': 'assets/icons/insights-arrow-up.svg?v=20260715',
    'bar-chart': 'assets/icons/insights-bars.svg?v=20260715',
    'task-arrow-up': 'assets/icons/insights-task-arrow-up.svg?v=20260715',
    'task-bar-chart': 'assets/icons/insights-task-bars.svg?v=20260715',
    quiz: 'assets/icons/insights-lightning.svg?v=20260715',
    puzzle: 'assets/icons/insights-puzzle.svg?v=20260715',
    article: 'assets/icons/insights-book.svg?v=20260715',
    lesson: 'assets/icons/insights-cap.svg?v=20260715',
    journal: 'assets/icons/insights-journal.svg?v=20260715',
    mood: 'assets/icons/insights-mood-sun.svg?v=20260715',
    badge: 'assets/icons/insights-star.svg?v=20260715',
    trophy: 'assets/icons/insights-trophy.svg?v=20260715',
    streak: 'assets/icons/insights-flame.svg?v=20260715',
    coin: 'assets/icons/insights-coin.svg?v=20260715',
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private location: Location
  ) {}

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
        next: (res) => {
          this.data = res;
          this.loading = false;
        },
        error: () => {
          this.error = true;
          this.loading = false;
        }
      });
  }

  retryLoad(): void {
    this.loading = true;
    this.error = false;
    this.fetchOverview();
  }

  goBack(): void {
    this.location.back();
  }

  cardIcon(stat: AnalyticStat, fallback: string, variant = ''): string {
    const semanticIcon = variant && stat.icon ? `${variant}-${stat.icon}` : stat.icon;
    return this.apiIcon(stat) || this.localIcon(semanticIcon, fallback);
  }

  hasApiIcon(stat: AnalyticStat): boolean {
    return !!this.apiIcon(stat);
  }

  onIconError(event: Event, fallback: string): void {
    const image = event.target as HTMLImageElement | null;
    if (!image || image.dataset['fallbackApplied'] === 'true') return;

    image.dataset['fallbackApplied'] = 'true';
    image.classList.add('an-card-ico--fallback');
    image.src = this.iconFallbacks[fallback] || this.iconFallbacks['arrow-up'];
  }

  habitTaskFallback(index: number): string {
    return index % 2 === 0 ? 'arrow-up' : 'bar-chart';
  }

  taskFallback(index: number): string {
    return index % 2 === 0 ? 'task-arrow-up' : 'task-bar-chart';
  }

  knowledgeFallback(index: number): string {
    return ['quiz', 'puzzle', 'article', 'lesson'][index] || 'quiz';
  }

  achievementFallback(index: number): string {
    return ['badge', 'trophy', 'streak', 'coin'][index] || 'badge';
  }

  moodLabel(value: string | number | null): string {
    if (value === null || value === undefined || value === '') return '';
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  private apiIcon(stat: AnalyticStat): string {
    const candidates = [
      stat.iconUrl,
      stat.iconURL,
      stat.imageUrl,
      stat.thumbnailUrl,
      stat.categoryIconUrl,
      stat.image,
      stat.icon,
    ];

    for (const candidate of candidates) {
      const value = this.cleanImageValue(candidate);
      if (value && this.isImageReference(value)) return this.resolveImageUrl(value);
    }

    return '';
  }

  private cleanImageValue(value?: string | null): string {
    if (!value) return '';
    const trimmed = String(value).trim();
    const markdownUrl = trimmed.match(/\]\((https?:\/\/[^)]+)\)/i)?.[1];
    return (markdownUrl || trimmed).replace(/^['"]|['"]$/g, '');
  }

  private isImageReference(value: string): boolean {
    return /^(https?:)?\/\//i.test(value)
      || /^(data:image|blob:|assets\/)/i.test(value)
      || value.startsWith('/')
      || value.includes('/')
      || /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value);
  }

  private resolveImageUrl(value: string): string {
    if (/^(https?:\/\/|data:image|blob:|assets\/)/i.test(value)) return value;
    if (value.startsWith('//')) return `https:${value}`;

    const apiOrigin = environment.apiUrl.replace(/\/v1\/?$/i, '');
    if (value.startsWith('/')) return `${apiOrigin}${value}`;
    if (/^v1\//i.test(value)) return `${apiOrigin}/${value}`;
    return `${environment.apiUrl.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
  }

  private localIcon(icon: string | null | undefined, fallback: string): string {
    const key = String(icon || '')
      .trim()
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/_/g, '-')
      .toLowerCase();

    return this.iconFallbacks[key] || this.iconFallbacks[fallback] || this.iconFallbacks['arrow-up'];
  }
}
