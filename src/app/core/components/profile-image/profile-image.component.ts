import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getProfileImageInitials } from '../../utils/profile-image.util';

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

  imageFailed = false;

  get showImage(): boolean {
    const source = String(this.src || '').trim();
    // Legacy directory mappings used a generic diamond image when no photo
    // existed. Treat that asset as missing so names get the intended initials.
    const isGenericPlaceholder = /(?:Image-Tutor|Image-Academy|Image-Counsel(?:or|ler)|Image-Sports|Image-Book|Image-Station(?:e|ar)y|default-avatar|placeholder-avatar|category-counsel(?:ors?|lers?)|category-sports|category-book|category-station(?:e|ar)y|book-store|station(?:e|ar)y(?:-shop)?)[^/]*\.(?:png|jpe?g|webp|svg)(?:$|[?#])/i.test(source);
    return !!source && !isGenericPlaceholder && !this.imageFailed;
  }

  getProfileImageInitials(): string {
    return getProfileImageInitials(this.name);
  }

  ngOnChanges(): void {
    this.imageFailed = false;
  }

  onImageError(): void {
    this.imageFailed = true;
  }
}
