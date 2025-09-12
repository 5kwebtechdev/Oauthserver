import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'share-reel',
  templateUrl: './share-reel.component.html',
  styleUrls: ['./share-reel.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ShareReelComponent {
  /**
   * Minimal input shape for a reel. If not provided the component
   * shows placeholder image/text. Using a PNG as requested.
   */
  @Input() reel: { title?: string; tags?: string; category?: string; image?: string } | null = null;

  // Default image (assumption): assets/app-assets/reel-share.png
  get imageSrc(): string {
    return this.reel && this.reel.image ? this.reel.image : 'assets/app-assets/reel-share.png';
  }

  onShare() {
    // small UX placeholder — real share integration is app-level
    // Keep logic minimal so this component is safe to include.
    const title = this.reel && this.reel.title ? this.reel.title : 'A reel from MindfulBuddy';
    try {
      if ((navigator as any).share) {
        (navigator as any).share({ title, text: title });
      } else {
        // fallback: copy to clipboard (best-effort)
        navigator.clipboard?.writeText(title);
      }
    } catch (e) {
      // ignore - this is a tiny UI component
    }
  }
}
