import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICONS, IconName } from './icons';

@Component({
  selector: 'profile-content-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-content-card.component.html',
  styleUrls: ['./profile-content-card.component.scss']
})
export class ProfileContentCardComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() iconSrc: string = '/assets/icons/user-circle.svg';
  @Input() iconName?: IconName;

  constructor(private sanitizer: DomSanitizer) {}

  get sanitizedIcon(): SafeHtml | null {
    const svg = this.iconName ? ICONS[this.iconName] : null;
    if (svg) return this.sanitizer.bypassSecurityTrustHtml(svg);
    return null;
  }

  @Output() select = new EventEmitter<void>();

  onClick() {
    this.select.emit();
  }
}
