import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { buttonStyles } from '../mindful-button/button.types';

export interface MindfulPopupCTA {
  text: string;
  action?: string;
  callback?: () => void;
  type?: 'primary' | 'secondary';
  disabled?: boolean;
  // optional: if provided, popup will render a <mindful-button> with these options
  buttonStyle?: buttonStyles;
  buttonMedium?: boolean;
  buttonLarge?: boolean;
}

export interface MindfulPopupConfig {
  image?: string;
  imageAlt?: string;
  heading?: string;
  subtitle?: string;
  primaryCTA?: MindfulPopupCTA;
  secondaryCTA?: MindfulPopupCTA;
  showShareButton?: boolean;
  showCloseButton?: boolean;
  backdrop?: boolean;
}

@Component({
  selector: 'app-mindful-popup',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulButtonComponent],
  templateUrl: './mindful-popup.component.html',
  styleUrls: ['./mindful-popup.component.scss']
})
export class MindfulPopupComponent implements OnInit {
  @Input() config: MindfulPopupConfig = {};
  @Input() isVisible: boolean = false;

  // Individual properties for backwards compatibility and direct usage
  @Input() image?: string;
  @Input() imageAlt?: string = 'Mindful Buddy';
  @Input() heading?: string;
  @Input() subtitle?: string;
  @Input() primaryCTA?: MindfulPopupCTA;
  @Input() secondaryCTA?: MindfulPopupCTA;
  @Input() showShareButton?: boolean = false;
  @Input() showCloseButton?: boolean = true;
  @Input() backdrop?: boolean = true;

  // Outputs
  @Output() primaryAction = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();
  @Output() shareAction = new EventEmitter<void>();
  @Output() closeAction = new EventEmitter<void>();
  @Output() backdropClick = new EventEmitter<void>();

  // Computed properties
  get finalConfig(): MindfulPopupConfig {
    return {
      image: this.config.image || this.image,
      imageAlt: this.config.imageAlt || this.imageAlt,
      heading: this.config.heading || this.heading,
      subtitle: this.config.subtitle || this.subtitle,
      primaryCTA: this.config.primaryCTA || this.primaryCTA,
      secondaryCTA: this.config.secondaryCTA || this.secondaryCTA,
      showShareButton: this.config.showShareButton ?? this.showShareButton,
      showCloseButton: this.config.showCloseButton ?? this.showCloseButton,
      backdrop: this.config.backdrop ?? this.backdrop
    };
  }

  get hasImage(): boolean {
    return !!(this.finalConfig.image);
  }

  /**
   * Detect whether the configured image is the reel upload success image.
   * We use this to apply a special sizing class so that only this image
   * renders at the requested 178x121px size.
   */
  get isReelSuccessImage(): boolean {
    const img = this.finalConfig.image || '';
    return img.includes('Image-Reel-Success.png');
  }

  get hasHeading(): boolean {
    return !!(this.finalConfig.heading);
  }

  get hasSubtitle(): boolean {
    return !!(this.finalConfig.subtitle);
  }

  get hasPrimaryCTA(): boolean {
    return !!(this.finalConfig.primaryCTA);
  }

  get hasSecondaryCTA(): boolean {
    return !!(this.finalConfig.secondaryCTA);
  }

  get hasTwoCTAs(): boolean {
    return this.hasPrimaryCTA && this.hasSecondaryCTA;
  }

  get hasOneCTA(): boolean {
    return (this.hasPrimaryCTA || this.hasSecondaryCTA) && !this.hasTwoCTAs;
  }

  get hasAnyContent(): boolean {
    return this.hasImage || this.hasHeading || this.hasSubtitle;
  }

  constructor(private sanitizer: DomSanitizer) { }

  /** Return heading HTML with newlines converted to <br/> and marked safe for innerHTML binding */
  get headingHtml(): SafeHtml {
    const h = this.finalConfig.heading || '';
    const html = h.replace(/\n/g, '<br/>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  ngOnInit(): void { }

  onPrimaryClick(): void {
    const cta = this.finalConfig.primaryCTA;
    if (cta?.callback) {
      cta.callback();
    }
    this.primaryAction.emit();
  }

  onSecondaryClick(): void {
    const cta = this.finalConfig.secondaryCTA;
    if (cta?.callback) {
      cta.callback();
    }
    this.secondaryAction.emit();
  }

  onShareClick(): void {
    this.shareAction.emit();
  }

  onCloseClick(): void {
    this.closeAction.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget && this.finalConfig.backdrop) {
      this.backdropClick.emit();
    }
  }

  // Utility methods for external use
  show(): void {
    this.isVisible = true;
  }

  hide(): void {
    this.isVisible = false;
  }

  toggle(): void {
    this.isVisible = !this.isVisible;
  }
}