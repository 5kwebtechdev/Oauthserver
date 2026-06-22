import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-img',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton-image.component.html',
  styleUrls: ['./skeleton-image.component.scss'],
})
export class SkeletonImageComponent implements OnInit, OnChanges {
  @Input() src: string = '';
  @Input() alt: string = '';
  @Input() circle = false;
  @Input() objectFit: 'cover' | 'contain' = 'cover';
  /** Optional fallback src shown if the primary src fails to load. */
  @Input() fallback?: string;

  /** Emitted when the image fails and no fallback is available (or fallback also failed). */
  @Output() imgError = new EventEmitter<Event>();

  @HostBinding('class.sk-host') readonly hostClass = true;

  currentSrc: string = '';
  loaded = false;
  private usedFallback = false;

  ngOnInit() {
    this.currentSrc = this.src;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['src']) {
      this.currentSrc = this.src;
      this.loaded = false;
      this.usedFallback = false;
    }
  }

  onLoad() {
    this.loaded = true;
  }

  onError(e: Event) {
    if (this.fallback && !this.usedFallback) {
      this.usedFallback = true;
      this.currentSrc = this.fallback;
      this.loaded = false;
    } else {
      this.loaded = true;
      this.imgError.emit(e);
    }
  }
}
