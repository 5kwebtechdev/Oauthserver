import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { eduHubProfileFrame } from './eduhub-profile-frame';

@Component({
  selector: 'app-eduhub-initials',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span *ngIf="frame as visual" class="frame" role="img"
      [attr.aria-label]="(name || 'Listing') + ' initials'"
      [style.width.px]="visual.width" [style.height.px]="visual.height"
      [style.transform]="'translate(-50%, -50%) scale(' + scale + ')'">
      <img class="art" [src]="'assets/figma/eduhub-initials/' + visual.asset" alt="" aria-hidden="true"
        [style.width.%]="visual.imageWidth" [style.height.%]="visual.imageHeight"
        [style.left.%]="visual.imageLeft" [style.top.%]="visual.imageTop">
      <span class="initials" aria-hidden="true" [style.left.px]="visual.textX"
        [style.top.px]="visual.textY">{{ initials }}</span>
    </span>
  `,
  styles: [`
    :host { position: absolute; inset: 0; display: block; overflow: hidden; background: #fff; }
    .frame { position: absolute; top: 50%; left: 50%; display: block; overflow: hidden; transform-origin: center; }
    .art { position: absolute; max-width: none; object-fit: fill; pointer-events: none; }
    .initials { position: absolute; transform: translateX(-50%); color: #282527;
      font: 700 24px/33px Nunito, sans-serif; white-space: nowrap; }
  `]
})
export class EduhubInitialsComponent {
  @Input() category = '';
  @Input() name = '';
  @Input() scale = 2;

  get frame() { return eduHubProfileFrame(this.category); }

  get initials(): string {
    const words = String(this.name || '').trim().split(/\s+/)
      .map(word => word.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean);
    if (words.length > 1) return (Array.from(words[0])[0] + Array.from(words[words.length - 1])[0]).toLocaleUpperCase();
    return (Array.from(words[0] || '').slice(0, 2).join('') || 'SM').toLocaleUpperCase();
  }
}
