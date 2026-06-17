import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeInputsModule } from '../../superme-inputs/superme-inputs.module';

@Component({
    selector: 'membership-section',
    standalone: true,
    imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeInputsModule],
    templateUrl: './membership-section.component.html',
    styleUrls: ['./membership-section.component.scss']
})
export class MembershipSectionComponent {
    constructor() { }
}
