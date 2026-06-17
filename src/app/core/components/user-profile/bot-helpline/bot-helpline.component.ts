import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';

@Component({
  standalone: true,
  selector: 'bot-helpline',
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent],
  templateUrl: './bot-helpline.component.html',
  styleUrls: ['./bot-helpline.component.scss']
})
export class BotHelplineComponent implements OnInit {
  email = 'supermeappofficial@gmail.com';

  constructor() { }

  ngOnInit(): void { }

}
