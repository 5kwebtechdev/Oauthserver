import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CoinListComponent } from '../coin-list/coin-list.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
  selector: 'app-coin-page',
  standalone: true,
  imports: [CommonModule, IonicModule, CoinListComponent, MindfulButtonComponent],
  templateUrl: './coin-page.component.html',
  styleUrls: ['./coin-page.component.scss']
})
export class CoinPageComponent {
  message = 'Hello from Coin Page!';

  // values provided to the coin-list in the template
  coinLabel = 'Panda Superhero Cape';
  coinDate = new Date('2025-04-11');
  coinCount = 23;

  // dummy list of coin items (one original + 5 more)
  coinItems = [
    { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Panda Superhero Cape', count: 23, date: new Date('2025-04-11') },
    { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Moonlight Mug', count: 120, date: new Date('2025-06-02') },
    { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Zen Garden Kit', count: 75, date: new Date('2025-05-18') },
    { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Cozy Blanket', count: 200, date: new Date('2025-03-30') },
    { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Glow Stick Set', count: 40, date: new Date('2025-07-09') },
    { icon: '/assets/app-assets/Panda Sitting Tired.svg', label: 'Starry Night Lamp', count: 150, date: new Date('2025-02-21') }
  ];
}
