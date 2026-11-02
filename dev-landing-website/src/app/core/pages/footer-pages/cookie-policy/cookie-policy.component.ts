import { Component } from '@angular/core';
import { PublicNavbarComponent } from '../../../components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../../landing/components/common-footer/common-footer.component';

@Component({
  selector: 'app-cookie-policy',
  standalone: true,
  imports: [PublicNavbarComponent, CommonFooterComponent],
  templateUrl: './cookie-policy.component.html',
  styleUrls: ['../privacy-policy-page/privacy-policy-page.component.scss'],
})
export class CookiePolicyComponent {}
