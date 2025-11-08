import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthApi } from '../../api/auth.api';

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
    { src: '/assets/Images-Transparent/Image-Mood-Nervous.png', label: 'Neutral' }
  ];

  ngOnInit() {
    this.getTodayVibe();
  }

  getTodayVibe() {
    const url = `${environment.apiUrl}/mood/vibes/today`;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = this.authApi?.getToken?.() || environment.apiAuthToken || null;
    if (token) headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);

    this.http.get<{ mood: string; imagePath?: string; date?: string }>(url, { headers }).subscribe({
      next: (res) => {
        console.debug('[MoodSelector] Today’s vibe:', res);
        if (res.imagePath) {
          // set the mood as an asset image
          this.value = 'asset:' + res.imagePath;
        } else if (res.mood) {
          // fallback to emoji key
          this.value = res.mood;
        } else {
          this.value = 'neutral';
        }
        this.valueChange.emit(this.value);
      },
      error: (err) => {
        console.error('Failed to fetch today’s vibe', err);
        this.value = 'neutral';
      }
    });
  }

  select(m: MoodOption) {
    this.value = m.key;
    this.valueChange.emit(this.value);
  }

  // Popup helpers
  openPopup() { this.popupSelection = null; this.showPopup = true }
  closePopup() { this.showPopup = false }
  choosePopup(src: string) { this.popupSelection = src }
  constructor(private http: HttpClient, private authApi: AuthApi) { }

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
        this.value = 'asset:' + this.popupSelection;
        this.valueChange.emit(this.value);
        this.showPopup = false;
      },
      error: (err) => {
        console.error('Failed to set vibe', err);
        this.value = 'asset:' + this.popupSelection;
        this.valueChange.emit(this.value);
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
    const m = this.options.find(x => x.key === this.value) || this.options[0];
    return m?.label || '';
  }
  get activeSubtitle() {
    // Simple subtitle based on mood — small reusable text
    return `${this.options.length} habits & 3 quests await.`;
  }
  get progressPercent() {
    // Map mood index to percent for visual bar
    const idx = this.options.findIndex(x => x.key === this.value);
    const pos = idx === -1 ? 0 : idx;
    return Math.round(((pos + 1) / this.options.length) * 100);
  }
}
