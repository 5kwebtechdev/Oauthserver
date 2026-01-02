
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';

@Component({
    selector: 'my-orders',
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent],
    templateUrl: './my-orders.components.html',
    styleUrls: ['./my-orders.components.scss']
})
export class MyOrdersComponent {
    goBack(): void {
        try { window.history.back(); } catch (e) { }
    }
}
