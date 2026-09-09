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
    return !!this.src?.trim() && !this.imageFailed;
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
