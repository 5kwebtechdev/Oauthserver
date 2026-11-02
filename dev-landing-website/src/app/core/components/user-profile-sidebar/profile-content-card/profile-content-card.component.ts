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
    @Input() active: boolean = false;

    constructor(private sanitizer: DomSanitizer) { }

    get sanitizedIcon(): SafeHtml | null {
        const svg = this.iconName ? ICONS[this.iconName] : null;
        if (svg) {
            // Normalize presentation attributes so CSS can control icon color.
            // Replace hard-coded hex fills/strokes (e.g. fill="#282527") with
            // presentation values that follow currentColor. We only replace
            // exact hex fills/strokes, leaving values like "none" untouched.
            const replaced = svg
                .replace(/fill=\"#[0-9A-Fa-f]{3,6}\"/g, 'fill="currentColor"')
                .replace(/stroke=\"#[0-9A-Fa-f]{3,6}\"/g, 'stroke="currentColor"');

            return this.sanitizer.bypassSecurityTrustHtml(replaced);
        }
        return null;
    }

    @Output() select = new EventEmitter<void>();

    onClick() {
        this.select.emit();
    }
}
