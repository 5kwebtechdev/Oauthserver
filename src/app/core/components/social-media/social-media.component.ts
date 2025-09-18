import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'social-media',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-media.component.html',
  styleUrls: ['./social-media.component.scss']
})
export class SocialMediaComponent {
  links = [
    { name: 'facebook', label: 'Facebook', icon: 'facebook' },
    { name: 'instagram', label: 'Instagram', icon: 'instagram' },
    { name: 'youtube', label: 'YouTube', icon: 'youtube' },
    { name: 'x', label: 'X', icon: 'x' }
  ];

  open(link: { name: string }) {
    // placeholder: wiring for opening links (platform-specific)
    console.log('Open social link', link.name);
  }
}
