import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthApi } from '../../api/auth.api';
import { MoodService } from '../../services/mood.service';
import { VibesDisplayResponse } from '../../models/mood.model';
import { AuthService } from '../../services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface MoodOption { key: string; label: string; emoji?: string }

@Component({
  selector: 'mood-selector',
  standalone: true,
  imports: [CommonModule, MindfulButtonComponent],
  templateUrl: './mood-selector.component.html',
  styleUrls: ['./mood-selector.component.scss']
})
export class MoodSelectorComponent {
  @Input() options: MoodOption[] = [];
  @Input() value: string | null = null;
  @Output() valueChange = new EventEmitter<string>();

  vibes: VibesDisplayResponse[] = [];
  private setsToday = 0;

  // popup state
  showPopup = false;
  popupSelection: string | null = null;
  // blocked-tooltip state
  blockedTooltipVisible = false;
  private blockedTooltipTimer: any = null;

  // Mood to asset mapping (backend mood -> asset path)
  private readonly moodAssetMap: Record<string, string> = {
    'HAPPY': '/assets/Images-Transparent/Image-Mood-Happy.png',
    'VERY HAPPY': '/assets/Images-Transparent/Image-Mood-Very happy.png',
    'SAD': '/assets/Images-Transparent/Image-Mood-Sad.png',
    'NERVOUS': '/assets/Images-Transparent/Image-Mood-Nervous.png',
    'UPSET': '/assets/Images-Transparent/Image-Mood-Upset.png',
    'EXCITED': '/assets/Images-Transparent/Image-Mood-Excited.png',
    'NEUTRAL': '/assets/Images-Transparent/Mood-emoji-neutral-home.png'
  };

  // Popup options - Neutral is NOT shown in popup, only as default
  popupOptions = [
    { src: '/assets/Images-Transparent/Image-Mood-Very happy.png', label: 'Very happy', vibe: 'VERY HAPPY' },
    { src: '/assets/Images-Transparent/Image-Mood-Happy.png', label: 'Happy', vibe: 'HAPPY' },
    { src: '/assets/Images-Transparent/Image-Mood-Excited.png', label: 'Excited', vibe: 'EXCITED' },
    { src: '/assets/Images-Transparent/Image-Mood-Sad.png', label: 'Sad', vibe: 'SAD' },
    { src: '/assets/Images-Transparent/Image-Mood-Upset.png', label: 'Upset', vibe: 'UPSET' },
    { src: '/assets/Images-Transparent/Image-Mood-Nervous.png', label: 'Nervous', vibe: 'NERVOUS' }
  ];

  ngOnInit() {
    this.getTodayVibe();
    this.loadDailySetCount();
  }

  // Fetch today's vibe via service
  getTodayVibe() {
    this.moodService.getVibesDisplay().subscribe({
      next: (res) => {
        console.debug('[MoodSelector] Vibes display:', res);
        this.vibes = Array.isArray(res) ? res : [];

        // Map backend mood to asset
        const first = this.vibes[0];
        if (first && first.mood) {
          const moodUpper = first.mood.toUpperCase();
          const assetPath = this.moodAssetMap[moodUpper];

          if (assetPath) {
            // Use asset
            this.value = 'asset:' + assetPath;
          } else {
            // Fallback neutral
            this.value = 'asset:' + this.moodAssetMap['NEUTRAL'];
          }
        } else {
          // No mood set -> neutral
            this.value = 'asset:' + this.moodAssetMap['NEUTRAL'];
        }
        this.valueChange.emit(this.value);
      },
      error: (err) => {
        console.error('Failed to fetch vibes display', err);
        this.vibes = [];
        // On error -> neutral
        this.value = 'asset:' + this.moodAssetMap['NEUTRAL'];
      }
    });
  }

  select(m: MoodOption) {
    this.value = m.key;
    this.valueChange.emit(this.value);
  }

  // Popup helpers
  openPopup() {
    // Prevent parents from opening popup
    const userRelationship = this.authService.getUserRelationship();
    if (userRelationship === 'PARENT') {
      return;
    }

    // Limit to 2 sets/day
    if (this.setsToday >= 2) {
      // Show a small inline tooltip explaining the limit
      this.showBlockedTooltip();
      return;
    }

    this.popupSelection = null;
    this.showPopup = true;
  }
  
  // First-layer click handler used by template to prevent opening popup when blocked
  onMoodClick() {
    // Prevent parents from opening popup
    const userRelationship = this.authService.getUserRelationship();
    if (userRelationship === 'PARENT') return;

    if (this.setsToday >= 2) {
      this.showBlockedTooltip();
      return;
    }

    this.openPopup();
  }
  closePopup() { this.showPopup = false }
  choosePopup(src: string) { this.popupSelection = src }

  showBlockedTooltip() {
    try {
      if (this.blockedTooltipTimer) {
        clearTimeout(this.blockedTooltipTimer);
        this.blockedTooltipTimer = null;
      }
    } catch {}
    this.blockedTooltipVisible = true;
    // Hide after 2.5s
    this.blockedTooltipTimer = setTimeout(() => {
      this.blockedTooltipVisible = false;
      this.blockedTooltipTimer = null;
    }, 4000);
  }
  constructor(
    private http: HttpClient,
    private authApi: AuthApi,
    private moodService: MoodService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) { }

  setVibe() {
    if (!this.popupSelection) return;

    // Safety guard: if we already hit the daily limit, don't attempt network call
    if (this.setsToday >= 2) {
      this.showBlockedTooltip();
      this.showPopup = false;
      return;
    }

    const opt = this.popupOptions.find(p => p.src === this.popupSelection);
    if (!opt) return;

    // Use popup vibe key
    const vibeKey = opt.vibe || 'NEUTRAL';

    const url = `${environment.apiUrl}/mood/vibes/set`;
    const body = { vibe: vibeKey };
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let token = this.authApi?.getToken?.() || (environment && environment.apiAuthToken) || null;

    console.debug('[MoodSelector] sending vibe', body, 'token present?', !!token);
    if (token) headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);

    this.http.post(url, body, { headers }).subscribe({
      next: () => {
        // On success: update UI
        this.value = 'asset:' + this.popupSelection;
        this.valueChange.emit(this.value);
        this.incrementDailySetCount();
        this.showPopup = false;
        // Clear cache and refresh
        this.moodService.clearVibesDisplayCache();
        this.getTodayVibe();
      },
      error: (err) => {
        console.error('Failed to set vibe', err);
        // Do NOT change mood on error; keep previous state
        this.showPopup = false;

        // Defensive: if server reports the daily limit, show blocked tooltip
        const serverMsg = err?.error?.message || err?.message || '';
        const m = String(serverMsg).toLowerCase();
        if (m.includes('you can set your mood only 2 times') || m.includes('only 2 times') || m.includes('twice')) {
          try {
            this.setsToday = 2;
            localStorage.setItem(this.dailyKey(), '2');
          } catch (e) { /* ignore */ }
          this.showBlockedTooltip();
        }
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

  // Active or neutral asset
  get displayAssetSrc(): string | null {
    const active = this.activeAssetSrc;
    if (active) return active;
    return this.moodAssetMap['NEUTRAL'] || null;
  }

  get activeEmoji() {
    // Don't show unicode if asset is visible
    if (this.displayAssetSrc) return '';
    const m = this.options.find(x => x.key === this.value) || this.options[0];
    return m?.emoji || '';
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

    // Prefer the backend-provided description field and display it as-is.
    return vibe.description || '';
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
    // Guard: avoid division by zero
    if (!this.options || this.options.length === 0) return 0;
    // Map mood index to percent for visual bar
    const idx = this.options.findIndex(x => x.key === this.value);
    const pos = idx === -1 ? 0 : idx;
    return Math.round(((pos + 1) / this.options.length) * 100);
  }

  get currentVibe(): VibesDisplayResponse | null {
    return this.vibes[0] || null;
  }

  get currentVibeTitleSafe(): SafeHtml | null {
    const v = this.currentVibe;
    if (!v || !v.title) return null;
    return this.sanitizer.bypassSecurityTrustHtml(v.title);
  }

  trackByUserId = (_: number, item: VibesDisplayResponse) => item?.userId ?? _;

  // Check if user can set vibe (for UI indicators)
  get canSetVibe(): boolean {
    const userRelationship = this.authService.getUserRelationship();
    if (userRelationship === 'PARENT') {
      return false;
    }
    return this.setsToday < 2;
  }

  get isParent(): boolean {
    return this.authService.getUserRelationship() === 'PARENT';
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
