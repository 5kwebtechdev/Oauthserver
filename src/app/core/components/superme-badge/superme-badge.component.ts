import { booleanAttribute, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgClass, NgIf } from "@angular/common";
import { CoerceBoolean } from "../../coerceBoolean.decorator";

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'superme-badge',
  standalone: true,
  templateUrl: './superme-badge.component.html',
  styleUrls: ['./superme-badge.component.scss'],
  imports: [
    NgIf,
    NgClass
  ]
})
export class SupermeBadgeComponent implements OnInit {
  @Input()
  text: string = "Undefined";

  @Input()
  type !: string;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  disabled: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  large: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  medium: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  inactive: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  circle: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  active: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  showDelete: boolean = false;

  @Output() deleteClick = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
    if (!this.text || this.text === 'Undefined') {
      if (this.type) {
        const words = this.type.replace(/[\-_]+/g, ' ').split(' ');
        this.text = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }

}
