import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** "Know an Organizer?" banner (Figma: SuperMeapp › Frame 44233, node 27345:15037). */
@Component({
  standalone: true,
  selector: 'app-event-design-refer',
  template: `
    <img class="rb-icon" [src]="assetBase() + '/refer-megaphone.webp'" alt="" />
    <div class="rb-text">
      <p class="rb-title">Know an Organizer?</p>
      <p class="rb-sub">Refer them to get listed on Eduhub.</p>
    </div>
    <button type="button" class="rb-cta" (click)="refer.emit()">Refer for listing</button>
  `,
  styleUrl: './refer-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferBannerComponent {
  readonly assetBase = input('assets/event-header');
  readonly refer = output<void>();
}
