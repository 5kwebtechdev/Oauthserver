import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonFooterComponent } from '../common-footer/common-footer.component';

@Component({
  selector: 'app-landing-footer',
  standalone: true,
  imports: [CommonModule, CommonFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class LandingFooterComponent {
  private readonly assetRoot = 'assets/Landing/figma-logged-out';

  readonly ctaBackgroundSrc = `${this.assetRoot}/cta-background.svg`;
  readonly petsSrc = 'assets/Landing/a02667fb8cf13894ff6ff69e69803291bc9cbc49.png';
  readonly petsShadowSrc = `${this.assetRoot}/pets-shadow.svg`;
  readonly complianceSrc = `${this.assetRoot}/badge-compliance.svg`;
  readonly dataSecureSrc = `${this.assetRoot}/badge-data-secure.svg`;
  readonly parentApprovedSrc = `${this.assetRoot}/badge-parent-approved.svg`;
}
