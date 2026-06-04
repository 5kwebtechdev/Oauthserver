import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';

@Component({
    selector: 'membership-section',
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulInputsModule],
    templateUrl: './membership-section.component.html',
    styleUrls: ['./membership-section.component.scss']
})
export class MembershipSectionComponent {
    constructor() { }
}
