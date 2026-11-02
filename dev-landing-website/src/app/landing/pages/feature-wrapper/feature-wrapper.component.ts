import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PublicNavbarComponent } from '../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../components/common-footer/common-footer.component';
import { FeaturePageComponent } from '../feature-page/feature-page.component';

@Component({
  selector: 'app-feature-wrapper',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicNavbarComponent, CommonFooterComponent, FeaturePageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col w-full min-h-screen bg-white">
      <app-public-navbar></app-public-navbar>
      <div style="padding-top: clamp(72px, 7vw, 104px)">
        <div class="py-[24px] min-[900px]:py-[32px]">
          <app-feature-page
            [title]="title"
            [description]="description"
            [visualSrc]="visualSrc"
            [accentColor]="accentColor"
            [visualAspectRatio]="visualAspectRatio"
            [badge]="badge"
            [preCTAText]="preCTAText"
            [preCTAMobileText]="preCTAMobileText"
            [relatedHref]="relatedHref"
            [relatedLabel]="relatedLabel"
          ></app-feature-page>
        </div>
      </div>
      <div class="mt-auto">
        <app-common-footer></app-common-footer>
      </div>
    </div>
  `,
})
export class FeatureWrapperComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() visualSrc = '';
  @Input() accentColor = '';
  @Input() visualAspectRatio = '752 / 403';
  @Input() badge = '';
  @Input() preCTAText = '';
  @Input() preCTAMobileText = '';
  @Input() relatedHref = '';
  @Input() relatedLabel = '';
}
