import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-child-safety-card',
  templateUrl: './child-safety-card.component.html',
  styleUrls: ['./child-safety-card.component.scss'],
  standalone: true
})
export class ChildSafetyCardComponent {
  /**
   * Title shown in the header area
   */
  @Input() title: string = 'Mandatory Parental Consent';

  /**
   * Subtitle / heading under the title
   */
  @Input() subtitle: string = 'No Child Account Without Parent Approval';

  /**
   * Body description text
   */
  @Input() description: string = `SuperMe requires verifiable parental consent before any child can create an account or use the Services, as required by COPPA and applicable privacy laws. By using SuperMe, you represent that you are the parent or guardian of any minor and explicitly consent to that minor's use of the app.`;

  /**
   * SVG path data rendered inside a 32x32 icon.
   */
  @Input() iconPath: string = 'M16 1L4 6V13C4 20.05 8.84 26.64 16 28C23.16 26.64 28 20.05 28 13V6L16 1ZM16 4.28L25 8.28V13C25 18.73 21.32 23.99 16 25.33C10.68 23.99 7 18.73 7 13V8.28L16 4.28Z';
}
