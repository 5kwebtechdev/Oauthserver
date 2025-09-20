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
}
