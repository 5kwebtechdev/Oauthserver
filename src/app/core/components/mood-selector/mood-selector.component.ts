import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthApi } from '../../api/auth.api';
import { MoodService } from '../../services/mood.service';
import { VibesDisplayResponse } from '../../models/mood.model';
import { AuthService } from '../../services/auth.service';

export interface MoodOption { key: string; label: string; emoji?: string }

@Component({
  selector: 'mood-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mood-selector.component.html',
  styleUrls: ['./mood-selector.component.scss']
})
export class MoodSelectorComponent implements ViewWillEnter, OnChanges {
  @Input() options: MoodOption[] = [];
  @Input() value: string | null = null;
  /** When set (parent view), the mood-selector shows data for this specific child id */
  @Input() selectedChildId: string | number | null = null;
  /** Direct vibe data override — takes priority over API vibes array (used by parent view) */
  @Input() vibeOverride: VibesDisplayResponse | null = null;
  @Output() valueChange = new EventEmitter<string>();

  vibes: VibesDisplayResponse[] = [];
  private setsToday = 0;

  // selection state
  popupSelection: string | null = null;
  // blocked-tooltip state
  blockedTooltipVisible = false;
  private blockedTooltipTimer: any = null;

  // Mood to asset mapping (backend mood -> asset path)
  private readonly moodAssetMap: Record<string, string> = {
    'HAPPY': 'assets/figma/child-home/mood-happy.png',
    'VERY HAPPY': 'assets/figma/child-home/mood-excited.png',
    'SAD': 'assets/figma/child-home/mood-sad.png',
    'NERVOUS': 'assets/figma/child-home/mood-anxious.png',
    'UPSET': 'assets/figma/child-home/mood-frustrated.png',
    'EXCITED': 'assets/figma/child-home/mood-excited.png',
    'NEUTRAL': 'assets/Images-Transparent/Mood-emoji-neutral-home.png'
  };

  // Popup options - Neutral is NOT shown in popup, only as default
  popupOptions = [
    { src: 'assets/figma/child-home/mood-happy.png', label: 'Happy', vibe: 'HAPPY' },
    { src: 'assets/figma/child-home/mood-excited.png', label: 'Excited', vibe: 'EXCITED' },
    { src: 'assets/figma/child-home/mood-anxious.png', label: 'Anxious', vibe: 'NERVOUS' },
    { src: 'assets/figma/child-home/mood-sad.png', label: 'Sad', vibe: 'SAD' },
    { src: 'assets/figma/child-home/mood-frustrated.png', label: 'Frustrated', vibe: 'UPSET' }
  ];

  ngOnInit() {
    this.getTodayVibe();
    this.loadDailySetCount();
  }

  ionViewWillEnter(): void {
    this.getTodayVibe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vibeOverride'] && this.vibeOverride) {
      // Parent supplied data directly — update mood image immediately, no API call needed
      const moodUpper = (this.vibeOverride.mood || 'NEUTRAL').toUpperCase();
      const assetPath = this.moodAssetMap[moodUpper] || this.moodAssetMap['NEUTRAL'];
      this.value = 'asset:' + assetPath;
      this.valueChange.emit(this.value);
      return;
    }
    if (changes['selectedChildId'] && !changes['selectedChildId'].firstChange) {
      this.getTodayVibe();
    }
  }

  /** Returns the vibe for the currently selected child (or first if no id set) */
  private get activeVibe(): VibesDisplayResponse | null {
    // Direct override wins — no API lookup needed
    if (this.vibeOverride) return this.vibeOverride;
    if (!this.vibes.length) return null;
    if (this.selectedChildId != null) {
      const sid = String(this.selectedChildId);
      const match = this.vibes.find(v =>
        String((v as any).userId ?? (v as any).assignedTo) === sid
      );
      if (match) return match;
    }
    return this.vibes[0];
  }

  // Fetch today's vibe via service
  getTodayVibe() {
    this.moodService.getVibesDisplay().subscribe({
      next: (res) => {
        console.debug('[MoodSelector] Vibes display:', res);
        this.vibes = Array.isArray(res) ? res : [];

        const vibe = this.activeVibe;
        if (vibe && vibe.mood) {
          const moodUpper = vibe.mood.toUpperCase();
          const assetPath = this.moodAssetMap[moodUpper];
          this.value = assetPath
            ? 'asset:' + assetPath
            : 'asset:' + this.moodAssetMap['NEUTRAL'];
        } else {
          this.value = 'asset:' + this.moodAssetMap['NEUTRAL'];
        }
        this.valueChange.emit(this.value);
      },
      error: (err) => {
        console.error('Failed to fetch vibes display', err);
        this.vibes = [];
        this.value = 'asset:' + this.moodAssetMap['NEUTRAL'];
      }
    });
  }

  select(m: MoodOption) {
    this.value = m.key;
    this.valueChange.emit(this.value);
  }

  // Tapping a mood option — gated by the same daily-limit rule the submit button enforces
  choosePopup(src: string) {
    if (this.isParent) return;
    if (this.setsToday >= 2) {
      this.showBlockedTooltip();
      return;
    }
    this.popupSelection = src;
  }

  // Big preview circle: shows the tapped option, falling back to today's current/neutral mood
  get popupPreviewSrc(): string {
    return this.popupSelection || this.displayAssetSrc || this.moodAssetMap['NEUTRAL'];
  }
  get popupPreviewLabel(): string {
    const opt = this.popupOptions.find(p => p.src === this.popupSelection);
    return opt?.label || 'Neutral';
  }

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
    private authService: AuthService
  ) { }

  setVibe() {
    if (!this.popupSelection) return;

    // Safety guard: if we already hit the daily limit, don't attempt network call
    if (this.setsToday >= 2) {
      this.showBlockedTooltip();
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
        this.popupSelection = null;
        // Clear cache and refresh
        this.moodService.clearVibesDisplayCache();
        this.getTodayVibe();
      },
      error: (err) => {
        console.error('Failed to set vibe', err);
        // Do NOT change mood on error; keep previous state

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
    const vibe = this.activeVibe;
    if (vibe && vibe.mood) {
      return vibe.mood;
    }
    const m = this.options.find(x => x.key === this.value) || this.options[0];
    return m?.label || '';
  }
  get progressPercent() {
    const vibe = this.activeVibe;
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
