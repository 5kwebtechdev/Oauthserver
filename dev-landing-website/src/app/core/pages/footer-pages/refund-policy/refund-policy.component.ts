import { Component } from '@angular/core';
import { PublicNavbarComponent } from '../../../components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../../landing/components/common-footer/common-footer.component';

@Component({
  selector: 'app-refund-policy',
  standalone: true,
  imports: [PublicNavbarComponent, CommonFooterComponent],
  templateUrl: './refund-policy.component.html',
  styleUrls: ['../terms-use/terms-use.component.scss'],
})
export class RefundPolicyComponent {}
