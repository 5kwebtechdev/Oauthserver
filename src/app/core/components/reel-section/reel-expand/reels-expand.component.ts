import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
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
  // whether overlay is visible
  public expanded = false;

  // playlist and current index for play-all behavior
  public playlist: any[] = [];
  public currentIndex = 0;
  public shareVisible = false;

  @ViewChild('playerVideo', { static: false }) playerVideo!: ElementRef<HTMLVideoElement>;

  private boundOpenSingle: any;
  private boundOpenPlayAll: any;

  ngOnInit(): void {
    // open single reel
    this.boundOpenSingle = (ev: any) => {
      try {
        const detail = ev && ev.detail;
        if (detail) {
          this.playlist = [detail];
          this.currentIndex = 0;
          this.expanded = true;
          // allow view to render then start playback
          setTimeout(() => this.playCurrent(), 50);
        }
      } catch (e) { /* ignore malformed events */ }
    };
    window.addEventListener('openReelExpanded', this.boundOpenSingle as EventListener);

    // open play-all for a category with slides array
    this.boundOpenPlayAll = (ev: any) => {
      try {
        const detail = ev && ev.detail;
        if (detail && Array.isArray(detail.slides)) {
          this.playlist = detail.slides.slice();
          this.currentIndex = 0;
          this.expanded = true;
          setTimeout(() => this.playCurrent(), 50);
        }
      } catch (e) { /* ignore */ }
    };
    window.addEventListener('openReelPlayAll', this.boundOpenPlayAll as EventListener);
  }

  ngOnDestroy(): void {
    if (this.boundOpenSingle) {
      window.removeEventListener('openReelExpanded', this.boundOpenSingle as EventListener);
    }
    if (this.boundOpenPlayAll) {
      window.removeEventListener('openReelPlayAll', this.boundOpenPlayAll as EventListener);
    }
  }

  get current() {
    return this.playlist && this.playlist[this.currentIndex] ? this.playlist[this.currentIndex] : null;
  }

  close() {
    this.expanded = false;
    this.pauseVideo();
    this.playlist = [];
    this.currentIndex = 0;
  }

  playCurrent() {
    this.pauseVideo();
    const videoEl = this.playerVideo && this.playerVideo.nativeElement;
    if (videoEl && this.current) {
      // if current has a video URL use it, otherwise nothing to play
      const src = this.current.video || this.current.image || '';
      if (src) {
        videoEl.src = this.current.video || this.current.image || '';
        videoEl.load();
        // autoplay where possible
        const tryPlay = async () => {
          try { await videoEl.play(); } catch (e) { /* ignore autoplay block */ }
        };
        tryPlay();
      }
    }
  }

  pauseVideo() {
    const videoEl = this.playerVideo && this.playerVideo.nativeElement;
    try { if (videoEl) { videoEl.pause(); videoEl.src = ''; } } catch (e) { /* ignore */ }
  }

  onVideoEnded() {
    // move to next item or close when done
    if (this.currentIndex < this.playlist.length - 1) {
      this.currentIndex += 1;
      setTimeout(() => this.playCurrent(), 120);
    } else {
      // finished playlist - keep open but stop playback
      this.pauseVideo();
    }
  }

  next() {
    if (this.currentIndex < this.playlist.length - 1) {
      this.currentIndex += 1;
      this.playCurrent();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      this.playCurrent();
    }
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
      this.closeShare();
    } catch (e) {
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
    window.open(shareUrl, '_blank');
    this.closeShare();
  }

  private getCurrentLink() {
    return this.current && (this.current.link || this.current.url) ? (this.current.link || this.current.url) : window.location.href;
  }
}
