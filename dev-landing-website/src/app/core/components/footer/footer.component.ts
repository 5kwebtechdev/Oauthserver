import { Component } from '@angular/core';
import { CommonFooterComponent } from '../../../landing/components/common-footer/common-footer.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonFooterComponent],
  template: '<app-common-footer></app-common-footer>'
})
export class FooterComponent {}
