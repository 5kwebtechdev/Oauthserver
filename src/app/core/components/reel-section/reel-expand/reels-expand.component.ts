import { Component, OnDestroy, OnInit, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeCardHeaderComponent } from '../../superme-navigator/superme-card-header/superme-card-header.component';

@Component({
  selector: 'reels-expand',
  templateUrl: './reels-expand.component.html',
  styleUrls: ['./reels-expand.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeCardHeaderComponent],
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
          this.playlist = detail.slides.slice();
          this.currentIndex = 0;
          this.expanded = true;
          
          // Add body class when opening
          document.body.classList.add('reel-expanded');
          
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
    const videoEl = this.playerVideo && this.playerVideo.nativeElement;
    if (videoEl && this.current) {
      // if current has a video URL use it, otherwise nothing to play
      const src = this.current.video || this.current.image || '';
      if (src) {
        // Set video source
        videoEl.src = this.current.video || this.current.image || '';
        videoEl.load();
        
        // Define event handlers
        const handleTimeUpdate = () => {
          if (videoEl.duration) {
            this.videoProgress = (videoEl.currentTime / videoEl.duration) * 100;
          }
        };
        
        const handleLoadedMetadata = () => {
          this.videoProgress = 0;
        };
        
        const handlePlay = () => {
          this.isPlaying = true;
        };
        
        const handlePause = () => {
          this.isPlaying = false;
        };
        
        const handleEnded = () => {
          this.onVideoEnded();
        };
        
        // Remove existing listeners and add new ones
        videoEl.removeEventListener('timeupdate', handleTimeUpdate);
        videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoEl.removeEventListener('play', handlePlay);
        videoEl.removeEventListener('pause', handlePause);
        videoEl.removeEventListener('ended', handleEnded);
        
        videoEl.addEventListener('timeupdate', handleTimeUpdate);
        videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoEl.addEventListener('play', handlePlay);
        videoEl.addEventListener('pause', handlePause);
        videoEl.addEventListener('ended', handleEnded);
        
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
    this.showPlayPauseIndicator = true;
    
    // Clear any existing timeout
    if (this.indicatorTimeout) {
      clearTimeout(this.indicatorTimeout);
    }
    
    // Hide indicator after 800ms
    this.indicatorTimeout = setTimeout(() => {
      this.showPlayPauseIndicator = false;
    }, 800);
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
    this.closeOptions();
    console.log('Delete Reel clicked', this.current);
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
    if (this.current) {
      this.current.liked = !this.current.liked;
      // Here you could also emit an event or call a service to persist the like
    }
  }

  toggleSave() {
    if (this.current) {
      this.current.saved = !this.current.saved;
      // Here you could also emit an event or call a service to persist the save
    }
  }

  private getCurrentLink() {
    return this.current && (this.current.link || this.current.url) ? (this.current.link || this.current.url) : window.location.href;
  }
}
