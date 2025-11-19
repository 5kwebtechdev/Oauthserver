import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthApi } from '../../api/auth.api';
import { MoodService } from '../../services/mood.service';
import { VibesDisplayResponse } from '../../models/mood.model';

export interface MoodOption { key: string; label: string; emoji?: string }

@Component({
  selector: 'mood-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mood-selector.component.html',
  styleUrls: ['./mood-selector.component.scss']
})
export class MoodSelectorComponent {
  @Input() options: MoodOption[] = [
    { key: 'happy', label: 'Happy', emoji: '😄' },
    { key: 'sad', label: 'Sad', emoji: '😔' },
    { key: 'anxious', label: 'Anxious', emoji: '😰' },
    { key: 'neutral', label: 'Okay', emoji: '🙂' }
  ];
  @Input() value: string | null = null;
  @Output() valueChange = new EventEmitter<string>();

  vibes: VibesDisplayResponse[] = [];
  private setsToday = 0;

  // popup state
  showPopup = false;
  popupSelection: string | null = null;
  // Exact icon files found in the repo
  popupOptions = [
    { src: '/assets/Images-Transparent/Image-Mood-Very happy.png', label: 'Very happy' },
    { src: '/assets/Images-Transparent/Image-Mood-Happy.png', label: 'Happy' },
    { src: '/assets/Images-Transparent/Image-Mood-Excited.png', label: 'Excited' },
    { src: '/assets/Images-Transparent/Image-Mood-Sad.png', label: 'Sad' },
    { src: '/assets/Images-Transparent/Image-Mood-Upset.png', label: 'Very sad' },
    { src: '/assets/Images-Transparent/Image-Mood-Nervous.png', label: 'Nervous' },
    { src: '/assets/Images-Transparent/Mood-emoji-neutral-home.png', label: 'neutral' }
  ];

  ngOnInit() {
    this.getTodayVibe();
    this.loadDailySetCount();
  }

  getTodayVibe() {
    // Use the shared MoodService instead of making a direct HTTP call
    // This will share the same API request with UserDashboardComponent
    this.moodService.getVibesDisplay().subscribe({
      next: (res) => {
        console.debug('[MoodSelector] Vibes display:', res);
        this.vibes = Array.isArray(res) ? res : [];

        // Derive a simple current value for the existing header from the first item
        const first = this.vibes[0];
        if (first && first.mood) {
          this.value = first.mood?.toLowerCase?.() || 'neutral';
        } else {
          this.value = 'neutral';
        }
        this.valueChange.emit(this.value || 'neutral');
      },
      error: (err) => {
        console.error('Failed to fetch vibes display', err);
        this.vibes = [];
        this.value = 'neutral';
      }
    });
  }

  select(m: MoodOption) {
    this.value = m.key;
    this.valueChange.emit(this.value);
  }

  // Popup helpers
  openPopup() {
    if (!this.canSetVibe) return;
    this.popupSelection = null; this.showPopup = true;
  }
  closePopup() { this.showPopup = false }
  choosePopup(src: string) { this.popupSelection = src }
  constructor(
    private http: HttpClient,
    private authApi: AuthApi,
    private moodService: MoodService
  ) { }

  setVibe() {
    if (!this.popupSelection) return;

    const opt = this.popupOptions.find(p => p.src === this.popupSelection);
    let vibeKey = '';
    if (opt && opt.label) {
      const lab = opt.label.toLowerCase();
      if (lab.includes('happy')) vibeKey = 'happy';
      else if (lab.includes('excited')) vibeKey = 'excited';
      else if (lab.includes('sad')) vibeKey = 'sad';
      else if (lab.includes('nervous') || lab.includes('neutral')) vibeKey = 'neutral';
      else vibeKey = lab.replace(/\s+/g, '_');
    }

    if (!vibeKey && this.value && !String(this.value).startsWith('asset:')) {
      vibeKey = String(this.value);
    }

    const url = `${environment.apiUrl}/mood/vibes/set`;
    const body = { vibe: vibeKey || 'neutral' };
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let token = this.authApi?.getToken?.() || (environment && environment.apiAuthToken) || null;

    console.debug('[MoodSelector] sending vibe', body, 'token present?', !!token);
    if (token) headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);

    this.http.post(url, body, { headers }).subscribe({
      next: () => {
        // Only update UI on success
        this.value = 'asset:' + this.popupSelection;
        this.valueChange.emit(this.value);
        this.incrementDailySetCount();
        this.showPopup = false;
        // Clear the cache so next call fetches fresh data
        this.moodService.clearVibesDisplayCache();
      },
      error: (err) => {
        console.error('Failed to set vibe', err);
        // Do NOT change mood on error; keep previous state
        this.showPopup = false;
      }
    });
  }

  // Helpers to determine active asset vs unicode emoji
  get isAssetActive() {
    return !!this.value && this.value.toString().startsWith('asset:');
  }
  get activeAssetSrc() {
    if (!this.isAssetActive) return null;
    return (this.value as string).replace(/^asset:/, '');
  }

  get activeEmoji() {
    const m = this.options.find(x => x.key === this.value) || this.options[0];
    return m?.emoji || '🙂';
  }
  get activeLabel() {
    const vibe = this.vibes[0];
    if (vibe && vibe.mood) {
      return vibe.mood;
    }
    const m = this.options.find(x => x.key === this.value) || this.options[0];
    return m?.label || '';
  }
  get activeSubtitle() {
    const vibe = this.vibes[0];
    if (!vibe) return '';

    const totalHabits = Number(vibe.totalHabits || 0);
    const totalTasks = Number(vibe.totalTasks || 0);
    const completedHabits = Number(vibe.completedHabits || 0);
    const completedTasks = Number(vibe.completedTasks || 0);

    const hasCounts = totalHabits > 0 || totalTasks > 0;
    const allCompleted = hasCounts && (completedHabits === totalHabits) && (completedTasks === totalTasks);

    if (hasCounts) {
      if (allCompleted && vibe.completedStateDescription) {
        return vibe.completedStateDescription;
      }
      // Exact phrasing requested
      return `${totalHabits} habits & ${totalTasks} tasks awaits.`;
    }

    if (!hasCounts && vibe.emptyStateDescription) {
      return vibe.emptyStateDescription;
    }

    if (vibe.description) {
      return vibe.description;
    }

    return '';
  }
  get progressPercent() {
    const vibe = this.vibes[0];
    if (vibe) {
      const total = Number(vibe.totalHabits || 0) + Number(vibe.totalTasks || 0);
      const done = Number(vibe.completedHabits || 0) + Number(vibe.completedTasks || 0);
      if (total > 0) {
        const pct = Math.max(0, Math.min(100, (done / total) * 100));
        return Math.round(pct);
      }
      if (typeof vibe.progressPercentage === 'number') {
        return Math.round(Math.max(0, Math.min(100, vibe.progressPercentage)));
      }
    }
    // Fallback: Map mood index to percent for visual bar
    const idx = this.options.findIndex(x => x.key === this.value);
    const pos = idx === -1 ? 0 : idx;
    return Math.round(((pos + 1) / this.options.length) * 100);
  }

  get currentVibe(): VibesDisplayResponse | null {
    return this.vibes[0] || null;
  }

  trackByUserId = (_: number, item: VibesDisplayResponse) => item?.userId ?? _;

  // Daily set limit helpers (max 2 per day)
  get canSetVibe(): boolean {
    return this.setsToday < 2;
  }
  private loadDailySetCount() {
    try {
      const key = this.dailyKey();
      const raw = localStorage.getItem(key);
      this.setsToday = raw ? parseInt(raw, 10) || 0 : 0;
    } catch { this.setsToday = 0; }
  }
  private incrementDailySetCount() {
    try {
      this.setsToday = Math.min(2, (this.setsToday || 0) + 1);
      localStorage.setItem(this.dailyKey(), String(this.setsToday));
    } catch { /* ignore */ }
  }
  private dailyKey() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `vibe_sets_${yyyy}-${mm}-${dd}`;
  }
}
