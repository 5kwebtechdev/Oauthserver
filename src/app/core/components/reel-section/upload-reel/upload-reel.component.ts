import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulCardHeaderComponent } from 'src/app/core/components/mindful-navigator/mindful-card-header/mindful-card-header.component';
import { IonicModule } from '@ionic/angular';

@Component({
    selector: 'upload-reel',
    templateUrl: './upload-reel.component.html',
    styleUrls: ['./upload-reel.component.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulCardHeaderComponent]
})
export class UploadReelComponent {
    @Input() items: any[] = [];

    goBack() {
        try {
            if (window && window.history && window.history.length > 1) {
                window.history.back();
                return;
            }
        } catch (e) {
        }
        return;
    }
}
