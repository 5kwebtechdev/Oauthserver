import { MOOD_ASSETS } from '../../models/mood-assets';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PetAgeService, PetMood } from '../../services/pet-age.service';

export type HomeMood = 'happy' | 'excited' | 'anxious' | 'sad' | 'frustrated' | 'calm';
interface MoodPresentation { label: string; before: string; emphasis: string; after: string; petMood: PetMood; }
const STATES: Record<HomeMood | 'default', MoodPresentation> = {
  happy: { label: 'Happy', before: 'I love days like this. Especially with you around. ', emphasis: "Wouldn't trade it", after: ' 🐼', petMood: 'happy' },
  excited: { label: 'Excited', before: 'I can feel it from here. Something is about to happen. ', emphasis: 'Tell me everything', after: ' 🐼', petMood: 'playful' },
  anxious: { label: 'Anxious', before: "There's a lot going on in that head of yours. I get it. ", emphasis: "I'm right here", after: ' 🐼', petMood: 'curious' },
  sad: { label: 'Sad', before: "I'm not going to tell you it's fine. Not every day is. I'm ", emphasis: 'not going anywhere', after: ' though 🤍', petMood: 'tired' },
  frustrated: { label: 'Frustrated', before: "Some things are just frustrating. You don't need to justify that to anyone. ", emphasis: 'I hear you', after: ' 🐼', petMood: 'anger' },
  calm: { label: 'Calm', before: 'This is a good pace. No rush, no noise, nothing extra. ', emphasis: 'I like it here', after: ' with you 🌿', petMood: 'base' },
  default: { label: '', before: "I'm wondering how you're doing today. Genuinely curious. Tell me your mood and ", emphasis: "I'll match it", after: ' 🐼', petMood: 'base' }
};
const BIRTHDAY_POSITIVE: MoodPresentation = { label: '', before: "Today belongs to you. And I'm spending every bit of it right here. ", emphasis: 'Lucky me.', after: ' 🎂', petMood: 'happy' };
const BIRTHDAY_NEGATIVE: MoodPresentation = { label: '', before: "Birthdays don't always feel how you expect. Still here though. ", emphasis: 'Cake counts.', after: ' 🎂', petMood: 'tired' };

export function normalizeHomeMood(value: string | null | undefined): HomeMood | null {
  const key = String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  const aliases: Record<string, HomeMood> = { happy: 'happy', 'very happy': 'happy', excited: 'excited', anxious: 'anxious', nervous: 'anxious', sad: 'sad', upset: 'frustrated', frustrated: 'frustrated', calm: 'calm', neutral: 'calm' };
  return aliases[key] ?? null;
}

export function homeLeaderboardRankLabel(rank: number | null | undefined): string {
  if (rank == null || !Number.isInteger(rank) || rank < 1) return 'Leaderboard';
  return rank > 100 ? '#100+' : `#${rank}`;
}

@Component({
  selector: 'app-home-mood-header', standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home-mood-header.component.html', styleUrls: ['./home-mood-header.component.scss']
})
export class HomeMoodHeaderComponent {
  readonly isNativeIos = Capacitor.getPlatform() === 'ios';
  @Input() mood: HomeMood | null = null;
  @Input() birthday = false;
  @Input() period: 'morning' | 'evening' | 'night' = 'morning';
  @Input() streaks = 0;
  @Input() trophies = 0;
  @Input() badges = 0;
  @Input() leaderboardRank: number | null = null;
  @Input() canEditMood = true;
  @Input() moodPickerOpen = false;
  @Output() moodEdit = new EventEmitter<void>();
  constructor(private readonly pets: PetAgeService) {}
  get state(): MoodPresentation {
    if (!this.birthday) return STATES[this.mood ?? 'default'];
    const birthdayState = this.mood === 'sad' || this.mood === 'anxious' || this.mood === 'frustrated' ? BIRTHDAY_NEGATIVE : BIRTHDAY_POSITIVE;
    return { ...birthdayState, label: STATES[this.mood ?? 'default'].label };
  }
  get pet(): string { return this.pets.getCurrentPetType() || 'panda'; }
  get petMoodImage(): string {
    if (this.birthday) {
      return `assets/figma/home-birthday/pets-${this.birthdayNegative && this.pet !== 'panda' ? 'negative' : 'positive'}.png`;
    }
    return `assets/figma/home-mood-header/${this.pet}-latest-moods.png`;
  }
  get birthdayNegative(): boolean { return this.mood === 'sad' || this.mood === 'anxious' || this.mood === 'frustrated'; }
  get emojiImage(): string { return this.mood ? MOOD_ASSETS[this.mood] : ''; }
  get messageEnding(): string {
    const emoji: Record<string, string> = { panda: '🐼', dragon: '🐉', llama: '🦙', owl: '🦉' };
    return this.state.after.replace('🐼', emoji[this.pet] || '🐼');
  }
  get leaderboardRankLabel(): string { return homeLeaderboardRankLabel(this.leaderboardRank); }
}
