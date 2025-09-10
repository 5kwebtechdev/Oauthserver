import {Component, Input, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'typical-page',
  templateUrl: './typical-page.component.html',
  styleUrls: ['./typical-page.component.scss'],
  standalone: true,
  imports: [
    // Ionic components used in template
    IonicModule
  ],
})
export class TypicalPageComponent {
  @Input()
  title: string = '';

  @Input()
  description: string = '';

  constructor() { }
}
