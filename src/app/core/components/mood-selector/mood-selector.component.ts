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
type PopupMoodOption = { src: string; label: string; vibe: string; art: string };

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
  /** Retains the most recently confirmed API mood while the display request refreshes. */
  private savedMoodKey: string | null = null;

  // selection state
  popupSelection: string | null = null;
  /** A user can reopen the picker after saving a mood by using the edit button. */
  pickerOpen = false;
  limitInfoVisible = false;
  // blocked-tooltip state
  blockedTooltipVisible = false;
  private blockedTooltipTimer: any = null;

  private readonly neutralAsset = 'assets/Images-Transparent/Mood-emoji-neutral-home.png';

  // Mood to asset mapping (backend mood -> asset path)
  private readonly moodAssetMap: Record<string, string> = {
    'HAPPY': 'assets/figma/child-home/moods/happy.svg',
    'VERY HAPPY': 'assets/figma/child-home/moods/happy.svg',
    'EXCITED': 'assets/figma/child-home/moods/excited.svg',
    'NERVOUS': 'assets/figma/child-home/moods/anxious.svg',
    'ANXIOUS': 'assets/figma/child-home/moods/anxious.svg',
    'SAD': 'assets/figma/child-home/moods/sad.svg',
    'UPSET': 'assets/figma/child-home/moods/frustrated.svg',
    'FRUSTRATED': 'assets/figma/child-home/moods/frustrated.svg',
    'NEUTRAL': 'assets/figma/child-home/moods/Calm.svg'
  };

  private readonly moodLabelMap: Record<string, string> = {
    'HAPPY': 'Happy',
    'VERY HAPPY': 'Very Happy',
    'EXCITED': 'Excited',
    'NERVOUS': 'Anxious',
    'ANXIOUS': 'Anxious',
    'SAD': 'Sad',
    'UPSET': 'Frustrated',
    'FRUSTRATED': 'Frustrated',
    'NEUTRAL': 'Neutral'
  };

  // Popup options - Neutral is NOT shown in popup, only as default
  popupOptions: PopupMoodOption[] = [
    { src: 'assets/figma/child-home/moods/happy.svg', label: 'Happy', vibe: 'HAPPY', art: 'happy' },
    { src: 'assets/figma/child-home/moods/excited.svg', label: 'Excited', vibe: 'EXCITED', art: 'excited' },
    { src: 'assets/figma/child-home/moods/anxious.svg', label: 'Anxious', vibe: 'NERVOUS', art: 'anxious' },
    { src: 'assets/figma/child-home/moods/sad.svg', label: 'Sad', vibe: 'SAD', art: 'sad' },
    { src: 'assets/figma/child-home/moods/frustrated.svg', label: 'Frustrated', vibe: 'UPSET', art: 'frustrated' },
    { src: 'assets/figma/child-home/moods/Calm.svg', label: 'Calm', vibe: 'NEUTRAL', art: 'calm' }
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
          this.savedMoodKey = moodUpper;
          const assetPath = this.moodAssetMap[moodUpper];
          this.value = assetPath
            ? 'asset:' + assetPath
            : 'asset:' + this.moodAssetMap['NEUTRAL'];
        } else {
          this.savedMoodKey = null;
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

  /** Show the picker again without discarding the mood already saved by the API. */
  editMood(): void {
    if (this.isParent) return;
    this.popupSelection = null;
    this.limitInfoVisible = false;
    this.pickerOpen = true;
  }

  toggleLimitInfo(): void {
    this.limitInfoVisible = !this.limitInfoVisible;
  }

  /** The summary is API driven, so it remains correct after navigation or a new login. */
  get hasSavedMood(): boolean {
    const mood = String(this.savedMoodKey || this.activeVibe?.mood || '').trim().toUpperCase();
    return !!mood;
  }

  get showMoodPicker(): boolean {
    return !this.hasSavedMood || this.pickerOpen;
  }

  get moodSetsLabel(): string {
    return `${Math.min(Math.max(this.setsToday, 0), 2)}/2`;
  }

  /**
   * Keep the selected treatment in sync with both a newly tapped option and
   * the mood currently returned by the API. This makes the active mood clear
   * when the card is reopened without changing the server-side selection flow.
   */
  isMoodSelected(option: { src: string }): boolean {
    return this.popupSelection
      ? this.popupSelection === option.src
      : this.displayAssetSrc === option.src;
  }

  // Big preview circle: shows the tapped option, falling back to today's current/neutral mood
  get popupPreviewSrc(): string {
    return this.popupSelection || this.displayAssetSrc || this.neutralAsset;
  }
  get popupPreviewLabel(): string {
    const opt = this.popupOptions.find(p => p.src === this.popupSelection);
    if (opt?.label) {
      return opt.label;
    }
    const moodKey = (this.savedMoodKey || this.activeVibe?.mood || 'NEUTRAL').toUpperCase();
    return this.moodLabelMap[moodKey] || 'Neutral';
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
        this.savedMoodKey = vibeKey;
        this.incrementDailySetCount();
        this.popupSelection = null;
        this.pickerOpen = false;
        this.limitInfoVisible = false;
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
    return this.neutralAsset || null;
  }

  get activeEmoji() {
    // Don't show unicode if asset is visible
    if (this.displayAssetSrc) return '';
    const m = this.options.find(x => x.key === this.value) || this.options[0];
    return m?.emoji || '';
  }
  get activeLabel() {
    const moodKey = this.savedMoodKey || this.activeVibe?.mood;
    if (moodKey) {
      const moodUpper = String(moodKey).toUpperCase();
      return this.moodLabelMap[moodUpper] || moodKey;
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
  trackByMood = (_: number, item: PopupMoodOption) => item.vibe;

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
    const userId = this.authService.getUserId() || 'anonymous';
    return `vibe_sets_${userId}_${yyyy}-${mm}-${dd}`;
  }
}
