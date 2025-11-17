import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { FooterComponent } from '../footer/footer.component';
import { MindfulSpeechBubbleComponent } from '../mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../mindful-pet/mindful-pet.component';

interface CoinItem {
    icon: string;
    label: string;
    count: number;
    date: Date;
}

@Component({
    selector: 'app-coin-section',
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulButtonComponent, FooterComponent, MindfulSpeechBubbleComponent, MindfulPetComponent],
    templateUrl: './coin-section.component.html',
    styleUrls: ['./coin-section.component.scss']
})
export class CoinSectionComponent {
    coinTotal: number | string = 0;
    message = "Whoa! That's a lot of coins! Let's go dress me up or grab something shiny!";
    coinItems: CoinItem[] = [
        { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Panda Superhero Cape', count: 23, date: new Date('2025-04-11') },
        { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Moonlight Mug', count: 120, date: new Date('2025-06-02') },
        { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Zen Garden Kit', count: 75, date: new Date('2025-05-18') },
        { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Cozy Blanket', count: 200, date: new Date('2025-03-30') },
        { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Glow Stick Set', count: 40, date: new Date('2025-07-09') },
        { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Starry Night Lamp', count: 150, date: new Date('2025-02-21') }
    ];

    constructor(private router: Router) {
        const nav = this.router.getCurrentNavigation?.();
        if (nav?.extras && (nav.extras as any).state?.coins !== undefined) {
            this.coinTotal = (nav.extras as any).state.coins;
        }
    }
}
