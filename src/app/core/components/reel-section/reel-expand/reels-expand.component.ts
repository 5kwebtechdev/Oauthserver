import { Component, OnDestroy, OnInit, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReelService } from '../../../services/reel.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReelBookmarksService } from '../../../services/reel-bookmarks.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'reels-expand',
  templateUrl: './reels-expand.component.html',
  styleUrls: ['./reels-expand.component.scss'],
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None
})
export class ReelsExpandComponent implements OnInit, OnDestroy {
  // whether overlay is visible
  public expanded = false;

  // playlist and current index for play-all behavior
  public playlist: any[] = [];
  public currentIndex = 0;
  public shareVisible = false;
  public videoProgress = 0;
  public optionsVisible = false;
  
  // play/pause state management
  public isPlaying = false;
  public showPlayPauseIndicator = false;
  private indicatorTimeout: any;
  private wasPlayingBeforeShare = false; // Track if video was playing before share popup
  private wasPlayingBeforeOptions = false;

  @ViewChild('playerVideo', { static: false }) playerVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('youtubePlayer', { static: false }) youtubePlayer?: ElementRef<HTMLIFrameElement>;

  private boundOpenSingle: any;
  private boundOpenPlayAll: any;
  private boundClose: any;
  private likeRequestInProgress = false;
  private touchStartY: number | null = null;
  private suppressNextMediaClick = false;
  private lastWheelNavigationAt = 0;

  constructor(
    private readonly reelService: ReelService,
    private readonly sanitizer: DomSanitizer,
    private readonly reelBookmarks: ReelBookmarksService
  ) {}

  ngOnInit(): void {
    // open single reel
    this.boundOpenSingle = (ev: any) => {
      try {
        const detail = ev && ev.detail;
        if (detail) {
          this.playlist = [detail];
          this.currentIndex = 0;
          this.prepareYoutubePlayer(this.current);
          this.expanded = true;
          
          // Add body class when opening
          document.body.classList.add('reel-expanded');
          
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
          // Keep the playlist light. Only the active YouTube player is prepared;
          // creating trusted iframe URLs for every off-screen reel is unnecessary.
          this.playlist = detail.slides;
          const requestedIndex = Number(detail.startIndex);
          this.currentIndex = Number.isInteger(requestedIndex)
            ? Math.min(Math.max(requestedIndex, 0), this.playlist.length - 1)
            : 0;
          this.prepareYoutubePlayer(this.current);
          this.expanded = true;
          
          // Add body class when opening
          document.body.classList.add('reel-expanded');
          
          setTimeout(() => this.playCurrent(), 50);
        }
      } catch (e) { /* ignore */ }
    };
    window.addEventListener('openReelPlayAll', this.boundOpenPlayAll as EventListener);

    // The persistent desktop header can return to Home while this player is
    // open. The dashboard route may be unchanged, so router navigation alone
    // does not destroy this component or dismiss its overlay.
    this.boundClose = () => this.close();
    window.addEventListener('closeReelExpanded', this.boundClose as EventListener);
  }

  ngOnDestroy(): void {
    if (this.boundOpenSingle) {
      window.removeEventListener('openReelExpanded', this.boundOpenSingle as EventListener);
    }
    if (this.boundOpenPlayAll) {
      window.removeEventListener('openReelPlayAll', this.boundOpenPlayAll as EventListener);
    }
    if (this.boundClose) {
      window.removeEventListener('closeReelExpanded', this.boundClose as EventListener);
    }
    
    // Clear any pending timeout
    if (this.indicatorTimeout) {
      clearTimeout(this.indicatorTimeout);
    }
    
    // Clean up body class on destroy
    document.body.classList.remove('reel-expanded');
  }

  get current() {
    return this.playlist && this.playlist[this.currentIndex] ? this.playlist[this.currentIndex] : null;
  }

  private notifyReelViewed(): void {
    const reelId = Number(this.current?.id);
    if (Number.isFinite(reelId)) {
      window.dispatchEvent(new CustomEvent('reelViewed', { detail: { id: reelId } }));
    }
  }

  close() {
    this.expanded = false;
    this.pauseVideo();
    this.playlist = [];
    this.currentIndex = 0;
    
    // Remove body class when closing
    document.body.classList.remove('reel-expanded');
  }

  // Debug method to test if the component is working
  testExpand() {
    console.log('🧪 TEST EXPAND: Testing reel expand component');
    const testSlide = {
      id: 999,
      title: 'Test Video',
      video: 'https://sample-videos.com/zip/10/mp4/480/mp4/SampleVideo_480x270_1mb.mp4',
      image: 'assets/app-assets/reel-1-placeholder.jpg'
    };
    
    this.playlist = [testSlide];
    this.currentIndex = 0;
    this.expanded = true;
    document.body.classList.add('reel-expanded');
    
    setTimeout(() => {
      console.log('🧪 TEST EXPAND: Calling playCurrent after timeout');
      this.playCurrent();
    }, 100);
  }

  playCurrent() {
    this.pauseVideo();
    this.prepareYoutubePlayer(this.current);
    this.refreshCurrentStatus();
    this.notifyReelViewed();
    const videoEl = this.playerVideo && this.playerVideo.nativeElement;
    if (videoEl && this.current) {
      // if current has a video URL use it, otherwise nothing to play
      const src = this.current.video || this.current.image || '';
      if (src) {
        // Set video source
        videoEl.src = this.current.video || this.current.image || '';
        videoEl.load();
        
        // autoplay where possible
        const tryPlay = async () => {
          try { 
            await videoEl.play();
            this.isPlaying = true;
          } catch (e) { 
            this.isPlaying = false;
            /* ignore autoplay block */ 
          }
        };
        tryPlay();
      }
    }
  }

  pauseVideo() {
    const videoEl = this.playerVideo && this.playerVideo.nativeElement;
    try { 
      if (videoEl) { 
        videoEl.pause(); 
        this.isPlaying = false;
        videoEl.src = ''; 
      } 
    } catch (e) { /* ignore */ }
  }

  // New method for toggle play/pause on screen tap
  togglePlayPause(event: Event) {
    event.stopPropagation();
    if (this.suppressNextMediaClick) {
      this.suppressNextMediaClick = false;
      return;
    }

    if (this.current?.youtubeEmbedUrl) {
      this.isPlaying = !this.isPlaying;
      this.sendYoutubeCommand(this.isPlaying ? 'playVideo' : 'pauseVideo');
      this.showPlayPauseIndicatorBriefly();
      return;
    }

    const videoEl = this.playerVideo && this.playerVideo.nativeElement;
    
    if (!videoEl || !this.current?.video) {
      return;
    }
    
    // Check actual video state instead of relying on isPlaying flag
    if (videoEl.paused) {
      // Video is paused, so play it
      videoEl.play().then(() => {
        this.isPlaying = true;
      }).catch((error) => {
        this.isPlaying = false;
      });
    } else {
      // Video is playing, so pause it
      videoEl.pause();
      this.isPlaying = false;
    }
    
    // Show play/pause indicator briefly
    this.showPlayPauseIndicatorBriefly();
  }

  onVideoTimeUpdate(event: Event): void {
    const video = event.currentTarget as HTMLVideoElement;
    this.videoProgress = video.duration
      ? (video.currentTime / video.duration) * 100
      : 0;
  }

  onVideoMetadataLoaded(): void {
    this.videoProgress = 0;
  }

  onVideoPlay(): void {
    this.isPlaying = true;
  }

  onVideoPause(): void {
    this.isPlaying = false;
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartY = event.changedTouches[0]?.clientY ?? null;
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.touchStartY === null) {
      return;
    }

    const endY = event.changedTouches[0]?.clientY;
    const deltaY = typeof endY === 'number' ? endY - this.touchStartY : 0;
    this.touchStartY = null;

    if (Math.abs(deltaY) < 50) {
      return;
    }

    this.suppressNextMediaClick = true;
    if (deltaY < 0) {
      this.next();
    } else {
      this.prev();
    }
  }

  onWheel(event: WheelEvent): void {
    if (Math.abs(event.deltaY) < 30) {
      return;
    }

    const now = Date.now();
    if (now - this.lastWheelNavigationAt < 500) {
      return;
    }

    event.preventDefault();
    this.lastWheelNavigationAt = now;
    event.deltaY > 0 ? this.next() : this.prev();
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
      setTimeout(() => this.playCurrent());
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      setTimeout(() => this.playCurrent());
    }
  }

  openShare(ev?: MouseEvent) {
    if (ev) { ev.stopPropagation(); }
    
    // Store current playing state and pause video
    const videoEl = this.playerVideo && this.playerVideo.nativeElement;
    if (videoEl && !videoEl.paused) {
      this.wasPlayingBeforeShare = true;
      videoEl.pause();
      this.isPlaying = false;
    } else {
      this.wasPlayingBeforeShare = false;
    }
    
    this.shareVisible = true;
  }

  closeShare() {
    this.shareVisible = false;
    
    // Resume video if it was playing before share popup opened
    if (this.wasPlayingBeforeShare) {
      const videoEl = this.playerVideo && this.playerVideo.nativeElement;
      if (videoEl) {
        videoEl.play().then(() => {
          this.isPlaying = true;
        }).catch(() => {
          this.isPlaying = false;
        });
      }
    }
    
    this.wasPlayingBeforeShare = false;
  }

  openOptions(ev?: MouseEvent) {
    if (ev) { ev.stopPropagation(); }
    console.log('[ReelsExpand] openOptions clicked. optionsVisible(before)=', this.optionsVisible);
    const videoEl = this.playerVideo && this.playerVideo.nativeElement;
    if (videoEl && !videoEl.paused) {
      this.wasPlayingBeforeOptions = true;
      videoEl.pause();
      this.isPlaying = false;
      console.log('[ReelsExpand] Video was playing. Paused video for options.');
    } else {
      this.wasPlayingBeforeOptions = false;
      console.log('[ReelsExpand] Video was not playing before options.');
    }
    this.optionsVisible = true;
    console.log('[ReelsExpand] optionsVisible(after)=', this.optionsVisible);
  }

  closeOptions() {
    console.log('[ReelsExpand] closeOptions called.');
    this.optionsVisible = false;
    console.log('[ReelsExpand] optionsVisible(after close)=', this.optionsVisible);
    if (this.wasPlayingBeforeOptions) {
      const videoEl = this.playerVideo && this.playerVideo.nativeElement;
      if (videoEl) {
        videoEl.play().then(() => {
          this.isPlaying = true;
        }).catch(() => {
          this.isPlaying = false;
        });
      }
    }
    this.wasPlayingBeforeOptions = false;
  }

  editReel() {
    this.closeOptions();
    console.log('Edit Reel clicked', this.current);
  }

  deleteReel() {
    const reelId = this.current?.id;
    if (reelId === undefined || reelId === null) {
      return;
    }

    this.reelService.deleteReel(reelId).subscribe({
      next: () => {
        this.closeOptions();
        this.close();
      }
    });
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

  shareFacebook() {
    const url = encodeURIComponent(this.getCurrentLink() || window.location.href);
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    window.open(shareUrl, '_blank');
    this.closeShare();
  }

  shareTwitter() {
    const url = encodeURIComponent(this.getCurrentLink() || window.location.href);
    const text = encodeURIComponent(`${this.current?.title || ''} by ${this.current?.author || ''}`);
    const shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    window.open(shareUrl, '_blank');
    this.closeShare();
  }

  toggleLike() {
    const reel = this.current;
    if (!reel || this.likeRequestInProgress || reel.id === undefined || reel.id === null) {
      return;
    }

    this.likeRequestInProgress = true;
    this.reelService.toggleLike(reel.id).subscribe({
      next: result => {
        reel.liked = result.liked;
        reel.likeCount = result.likeCount;
        reel.likes = this.formatCount(result.likeCount);
        this.likeRequestInProgress = false;
      },
      error: () => {
        this.likeRequestInProgress = false;
      }
    });
  }

  toggleSave() {
    if (this.current) {
      this.current.saved = this.reelBookmarks.toggle(this.current.id);
    }
  }

  private getCurrentLink() {
    return this.current && (this.current.link || this.current.url) ? (this.current.link || this.current.url) : window.location.href;
  }

  private refreshCurrentStatus(): void {
    const reel = this.current;
    if (!reel || reel.id === undefined || reel.id === null) {
      return;
    }

    this.reelService.getStatus(reel.id).subscribe({
      next: status => {
        reel.liked = status.liked;
        reel.likeCount = status.likeCount;
        reel.likes = this.formatCount(status.likeCount);
        reel.commentCount = status.commentCount;
      }
    });
  }

  private formatCount(value: unknown): string {
    const count = Number(value) || 0;
    return count >= 1000
      ? `${Number((count / 1000).toFixed(count >= 10000 ? 0 : 1))}K`
      : String(count);
  }

  private prepareYoutubePlayer(reel: any): void {
    if (!reel) {
      return;
    }

    const videoId = this.extractYoutubeVideoId(reel?.videoId || reel?.link || reel?.url);
    if (!videoId) {
      reel.youtubeEmbedUrl = null;
      return;
    }

    if (reel.youtubeEmbedUrl && reel.preparedYoutubeVideoId === videoId) {
      return;
    }

    // YouTube requires an HTTP referrer or equivalent client identity. A
    // Capacitor iOS page uses a custom local scheme, so it cannot provide a
    // normal HTTP referrer and YouTube otherwise responds with player error
    // 153. Identify the native app with its public web origin; browsers keep
    // their actual origin so localhost and production web builds both work.
    const playerOrigin = Capacitor.isNativePlatform()
      ? 'https://supermeapp.com'
      : window.location.origin;
    const params = new URLSearchParams({
      autoplay: '1',
      playsinline: '1',
      rel: '0',
      enablejsapi: '1',
      controls: '0',
      origin: playerOrigin,
      widget_referrer: 'https://supermeapp.com'
    });
    const url = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
    reel.youtubeEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url) as SafeResourceUrl;
    reel.preparedYoutubeVideoId = videoId;
  }

  private extractYoutubeVideoId(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }

    const source = value.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(source)) {
      return source;
    }

    return source.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
    )?.[1];
  }

  private sendYoutubeCommand(command: 'playVideo' | 'pauseVideo'): void {
    this.youtubePlayer?.nativeElement.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func: command,
      args: []
    }), '*');
  }

  private showPlayPauseIndicatorBriefly(): void {
    this.showPlayPauseIndicator = true;
    if (this.indicatorTimeout) {
      clearTimeout(this.indicatorTimeout);
    }
    this.indicatorTimeout = setTimeout(() => {
      this.showPlayPauseIndicator = false;
    }, 800);
  }
}
