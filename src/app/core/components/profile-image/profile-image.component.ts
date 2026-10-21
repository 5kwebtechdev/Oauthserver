import { ChangeDetectionStrategy, Component, HostBinding, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getProfileImageInitials } from '../../utils/profile-image.util';
import { eduHubProfileFrame } from './eduhub-profile-frame';

@Component({
  selector: 'app-profile-image',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-image.component.html',
  styleUrls: ['./profile-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileImageComponent implements OnChanges {
  @Input() src: string | null | undefined;
  @Input() name: string | null | undefined;
  @Input() alt = '';
  @Input() fallbackCategory = '';

  get frame() { return eduHubProfileFrame(this.fallbackCategory); }

  @HostBinding('class.eduhub-fallback')
  get hasCategoryFallback(): boolean { return !this.showImage && !!this.frame; }

  @HostBinding('style.width.px')
  get fallbackWidth(): number | null { return this.hasCategoryFallback ? this.frame!.width : null; }

  @HostBinding('style.height.px')
  get fallbackHeight(): number | null { return this.hasCategoryFallback ? this.frame!.height : null; }

  get listingInitials(): string {
    const words = String(this.name || '').trim().split(/\s+/)
      .map(word => word.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean);
    return words.length > 1
      ? (Array.from(words[0])[0] + Array.from(words[words.length - 1])[0]).toLocaleUpperCase()
      : this.initials;
  }

  imageFailed = false;

  get showImage(): boolean {
    const source = String(this.src || '').trim();
    // Legacy directory mappings used a generic diamond image when no photo
    // existed. Treat that asset as missing so the neutral empty fallback is shown.
    const isGenericPlaceholder = /(?:Image-Tutor|Image-Academy|Image-Counsel(?:or|ler)|Image-Sports|Image-Book|Image-Station(?:e|ar)y|default-avatar|placeholder-avatar|category-counsel(?:ors?|lers?)|category-sports|category-book|category-station(?:e|ar)y|book-store|station(?:e|ar)y(?:-shop)?)[^/]*\.(?:png|jpe?g|webp|svg)(?:$|[?#])/i.test(source);
    return !!source && !isGenericPlaceholder && !this.imageFailed;
  }

  get initials(): string {
    return getProfileImageInitials(this.name);
  }

  ngOnChanges(): void {
    this.imageFailed = false;
  }

  onImageError(): void {
    this.imageFailed = true;
  }
}
