import { Component, Input } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  selector: 'trophy-transaction-card',
  standalone: true,
  imports: [CommonModule, NgIf],
  templateUrl: './trophy-transaction-card.component.html',
  styleUrls: ['./trophy-transaction-card.component.scss']
})
export class TrophyTransactionCardComponent {
  @Input() title = '';
  @Input() difficulty?: string;
  @Input() earnedOn?: string;
  @Input() avatar?: string;
  @Input() points?: number | string;
  @Input() contentType?: string;
  @Input() thumbnailUrl?: string | null;

  get avatarLetter(): string {
    if (this.contentType) return this.contentType.charAt(0).toUpperCase();
    return '★';
  }

  get avatarColor(): string {
    const ct = (this.contentType || '').toLowerCase();
    if (ct.includes('quiz'))     return '#F97316';
    if (ct.includes('puzzle'))   return '#8B5CF6';
    if (ct.includes('article'))  return '#3B82F6';
    if (ct.includes('journal'))  return '#10B981';
    if (ct.includes('lesson') || ct.includes('learning') || ct.includes('academy')) return '#6366F1';
    if (ct.includes('habit'))    return '#EC4899';
    if (ct.includes('task'))     return '#14B8A6';
    if (ct.includes('streak'))   return '#F59E0B';
    if (ct.includes('challenge'))return '#EF4444';
    return '#90214D';
  }
}
