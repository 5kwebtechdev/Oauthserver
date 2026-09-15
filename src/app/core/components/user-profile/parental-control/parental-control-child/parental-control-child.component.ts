import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../../superme-navigator/superme-navigator.component';
import { SupermeInputsModule } from '../../../superme-inputs/superme-inputs.module';

@Component({
    selector: 'parental-control-child',
    standalone: true,
    imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeInputsModule],
    templateUrl: './parental-control-child.component.html',
    styleUrls: ['./parental-control-child.component.scss']
})
export class ParentalControlChildComponent {
    showParentalControlBlank: boolean = false;
    showRequestPopup: boolean = false;
    requestTargetAppId: string | null = null;

    blockedApps: Array<{
        id: string;
        name: string;
        iconType: 'svg' | 'img';
        svg?: string;
        imgSrc?: string;
        time: string;
    }> = [
            {
                id: 'youtube',
                name: 'YouTube',
                iconType: 'svg',
                svg: 'youtube',
                time: '1hr 5min'
            },
            {
                id: 'whatsapp',
                name: 'Whatsapp',
                iconType: 'svg',
                svg: 'whatsapp',
                time: '1hr 5min'
            },
            {
                id: 'clash',
                name: 'Clash of Clans',
                iconType: 'img',
                imgSrc: 'assets/app-assets/ClashOfClans-icon.webp',
                time: '45min'
            }
        ];

    durationOptions = [
        { label: '5 min', selected: false },
        { label: '15 min', selected: false },
        { label: '30 min', selected: false },
        { label: '1 hr', selected: false },
        { label: '2 hr', selected: false },
        { label: '3 hr', selected: false }
    ];

    instructions: string[] = [
        'Did your parent already set this up? If yes, click done',
        'If not, open Settings and then tap on Apps',
        'Click on "Special app access"',
        'Go to "Usage Access" and then allow permission for our App',
        'Then go Back and click on "Display over other apps"',
        'Give permission for our App',
        'Tap on Done when you are finished'
    ];

    constructor() { }

    onDone() {
        this.showParentalControlBlank = true;
    }

    requestExtend(appId: string) {
        this.requestTargetAppId = appId;
        this.showRequestPopup = true;
    }

    selectDuration(duration: any) {
        this.durationOptions.forEach(option => option.selected = false);
        duration.selected = true;
    }

    closeRequestPopup() {
        this.showRequestPopup = false;
        this.requestTargetAppId = null;
        this.durationOptions.forEach(option => option.selected = false);
    }

    sendRequest() {
        const selected = this.durationOptions.find(d => d.selected);
        console.log('Sending request for', this.requestTargetAppId, 'duration:', selected?.label);
        this.closeRequestPopup();
    }
}