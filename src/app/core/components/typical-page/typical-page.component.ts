import {Component, Input, OnInit} from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'typical-page',
  templateUrl: './typical-page.component.html',
  styleUrls: ['./typical-page.component.scss'],
  standalone: false,
})
export class TypicalPageComponent {
  @Input()
  title: string = '';

  @Input()
  description: string = '';

  constructor() { }
}
