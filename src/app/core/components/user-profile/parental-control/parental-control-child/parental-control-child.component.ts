import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../../mindful-navigator/mindful-navigator.component';
import { InstructioListComponent } from '../../family-connection/instructio-list';
import { MindfulButtonComponent } from '../../../mindful-button/mindful-button.component';
import { MindfulInputsModule } from '../../../mindful-inputs/mindful-inputs.module';

@Component({
    selector: 'parental-control-child',
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent, InstructioListComponent, MindfulButtonComponent, MindfulInputsModule],
    templateUrl: './parental-control-child.component.html',
    styleUrls: ['./parental-control-child.component.scss']
})
export class ParentalControlChildComponent {
    showParentalControlBlank: boolean = false;
    // Controls the visibility of the request extend popup
    showRequestPopup: boolean = false;
    // Tracks which app the user is requesting an extension for
    requestTargetAppId: string | null = null;

    // Blocked / tracked apps displayed in the App Blocker list
    blockedApps: Array<{
        id: string;
        name: string;
        iconType: 'svg' | 'img';
        svg?: string; // inline svg string (if iconType === 'svg')
        imgSrc?: string; // asset path (if iconType === 'img')
        time: string;
    }> = [
            {
                id: 'youtube',
                name: 'YouTube',
                iconType: 'svg',
                // we will keep the inline svg markup in the template where appropriate
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
                imgSrc: '/assets/app-assets/ClashOfClans-icon.png',
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
        // Open the request popup and remember which app was targeted
        this.requestTargetAppId = appId;
        this.showRequestPopup = true;
    }

    selectDuration(duration: any) {
        // Deselect all options first
        this.durationOptions.forEach(option => option.selected = false);
        // Select the clicked option
        duration.selected = true;
    }

    closeRequestPopup() {
        // Close the popup and reset selection/target
        this.showRequestPopup = false;
        this.requestTargetAppId = null;
        this.durationOptions.forEach(option => option.selected = false);
    }

    sendRequest() {
        // Implement the actual send request flow here (API call / notification)
        const selected = this.durationOptions.find(d => d.selected);
        console.log('Sending request for', this.requestTargetAppId, 'duration:', selected?.label);
        // For now, just close the popup after "sending"
        this.closeRequestPopup();
    }
}