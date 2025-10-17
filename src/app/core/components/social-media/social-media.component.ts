import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'social-media',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-media.component.html',
  styleUrls: ['./social-media.component.scss']
})
export class SocialMediaComponent {
  /** variant controls rendering behavior; "login-with" shows provider icons for sign-in */
  @Input() variant?: string;
  links = [
    { name: 'facebook', label: 'Facebook', icon: 'facebook', url: 'https://www.facebook.com' },
    { name: 'instagram', label: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/supermeappofficial/' },
    { name: 'youtube', label: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com' },
    { name: 'x', label: 'X', icon: 'x', url: 'https://twitter.com' }
  ];

  open(link: { name: string; url?: string }) {
    if (link.url) {
      // Open social link in a new tab/window
      window.open(link.url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Fallback: log if no URL is available
    console.warn('No URL configured for social link', link.name);
  }
}
