import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

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
    { src: '/assets/icons/Mood-emoji-very-happy-home.svg', label: 'Very happy' },
    { src: '/assets/icons/Mood-emoji-happy-home.svg', label: 'Happy' },
    { src: '/assets/icons/Mood-emoji-excited-home.svg', label: 'Excited' },
    { src: '/assets/icons/Mood-emoji-sad-home.svg', label: 'Sad' },
    { src: '/assets/icons/Mood-emoji-very-depressed-home.svg', label: 'Very sad' },
    { src: '/assets/icons/Mood-emoji-No-emotion-home.svg', label: 'Neutral' }
  ];

  select(m: MoodOption) {
    this.value = m.key;
    this.valueChange.emit(this.value);
  }

  // Popup helpers
  openPopup(){ this.popupSelection = null; this.showPopup = true }
  closePopup(){ this.showPopup = false }
  choosePopup(src: string){ this.popupSelection = src }
  setVibe(){
    if(!this.popupSelection) return;
    // replace active emoji with chosen asset by emitting its src as a special key
    this.value = 'asset:' + this.popupSelection;
    this.valueChange.emit(this.value);
    this.showPopup = false;
  }

  // Helpers to determine active asset vs unicode emoji
  get isAssetActive(){
    return !!this.value && this.value.toString().startsWith('asset:');
  }
  get activeAssetSrc(){
    if(!this.isAssetActive) return null;
    return (this.value as string).replace(/^asset:/, '');
  }

  get activeEmoji(){
    const m = this.options.find(x=> x.key === this.value) || this.options[0];
    return m?.emoji || '🙂';
  }
  get activeLabel(){
    const m = this.options.find(x=> x.key === this.value) || this.options[0];
    return m?.label || '';
  }
  get activeSubtitle(){
    // Simple subtitle based on mood — small reusable text
    return `${this.options.length} habits & 3 quests await.`;
  }
  get progressPercent(){
    // Map mood index to percent for visual bar
    const idx = this.options.findIndex(x=> x.key === this.value);
    const pos = idx === -1 ? 0 : idx;
    return Math.round(((pos + 1) / this.options.length) * 100);
  }
}
