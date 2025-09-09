import {booleanAttribute, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {NgClass, NgIf} from "@angular/common";
import {buttonStyles} from "./button.types";
import {CoerceBoolean} from "../../coerceBoolean.decorator";

@Component({
  standalone: true,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mindful-button',
  templateUrl: './mindful-button.component.html',
  styleUrls: ['./mindful-button.component.scss'],
  imports: [
    NgClass,
    NgIf
  ]
})

export class MindfulButtonComponent implements OnInit {

  @Input()
  type !: buttonStyles;

  @Input()
  text: string = "Undefined";

  @Input({transform: booleanAttribute})
  @CoerceBoolean()
  medium: boolean = false;

  @Input({transform: booleanAttribute})
  @CoerceBoolean()
  large: boolean = false

  // @Input()
  // width: string = "auto";

  @Input({transform: booleanAttribute})
  @CoerceBoolean()
  disabled: boolean = false

  constructor() { }

  ngOnInit(): void {
    if(!this.type){
      console.error("MindfulButtonComponent: type is required", this.text);
    }
  }
}
