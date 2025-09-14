import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'reels-expand',
  templateUrl: './reels-expand.component.html',
  styleUrls: ['./reels-expand.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ReelsExpandComponent implements OnInit, OnDestroy {
  // small API for parent to control expansion state
  @Input() expanded = false;

  // currently opened reel detail for the expanded player
  public current: any = null;
  public shareVisible = false;

  // reference to the bound handler so we can remove it
  private boundHandler: any;

  ngOnInit(): void {
    // listen for a global CustomEvent 'openReelExpanded' dispatched by parent lists
    this.boundHandler = (ev: any) => {
      try {
        const detail = ev && ev.detail;
        if (detail) {
          this.current = detail;
          this.expanded = true;
        }
      } catch (e) { /* ignore malformed events */ }
    };
    window.addEventListener('openReelExpanded', this.boundHandler as EventListener);
  }

  ngOnDestroy(): void {
    if (this.boundHandler) {
      window.removeEventListener('openReelExpanded', this.boundHandler as EventListener);
    }
  }

  close() {
    this.expanded = false;
    this.current = null;
  }

  openShare(ev?: MouseEvent) {
    if (ev) { ev.stopPropagation(); }
    this.shareVisible = true;
  }

  closeShare() {
    this.shareVisible = false;
  }

  copyLink() {
    const url = this.getCurrentLink();
    if (!url) { return; }
    try {
      navigator.clipboard.writeText(url);
      // optionally show a tiny feedback - here we just close the popup
      this.closeShare();
    } catch (e) {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.closeShare();
    }
  }

  shareWhatsapp() {
    const url = encodeURIComponent(this.getCurrentLink() || window.location.href);
    const text = encodeURIComponent(`${this.current?.title || ''} - ${this.current?.author || ''}`);
    const shareUrl = `https://wa.me/?text=${text}%20${url}`;
    // open in new window/tab
    window.open(shareUrl, '_blank');
    this.closeShare();
  }

  private getCurrentLink() {
    // If the current item has an explicit link use it, otherwise default to current location
    return this.current && (this.current.link || this.current.url) ? (this.current.link || this.current.url) : window.location.href;
  }
}
