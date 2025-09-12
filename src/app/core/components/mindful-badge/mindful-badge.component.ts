import {booleanAttribute, Component, Input, OnInit} from '@angular/core';
import {NgClass, NgIf} from "@angular/common";
import {CoerceBoolean} from "../../coerceBoolean.decorator";

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mindful-badge',
  standalone: true,
  templateUrl: './mindful-badge.component.html',
  styleUrls: ['./mindful-badge.component.scss'],
  imports: [
    NgIf,
    NgClass
  ]
})
export class MindfulBadgeComponent {
  @Input()
  text: string = "Undefined";

  @Input()
  type !: string;

  @Input({transform: booleanAttribute})
  @CoerceBoolean()
  disabled: boolean = false;

  @Input({transform: booleanAttribute})
  @CoerceBoolean()
  large: boolean = false;

  @Input({transform: booleanAttribute})
  @CoerceBoolean()
  medium: boolean = false;

  @Input({transform: booleanAttribute})
  @CoerceBoolean()
  inactive: boolean = false;

  @Input({transform: booleanAttribute})
  @CoerceBoolean()
  circle: boolean = false;

  constructor() { }

}
