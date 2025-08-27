import {Component, Input, OnInit, Output, EventEmitter, NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import {BadgeType} from "../mindful-badge/mindful-badge.interface";
import {CommonModule, NgForOf} from "@angular/common";
import {MindfulBadgeComponent} from "../mindful-badge/mindful-badge.component";
import {MindfulButtonComponent} from "../mindful-button/mindful-button.component";
import {CoerceBoolean} from "../../coerceBoolean.decorator";

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mindful-selectors',
  templateUrl: './mindful-selectors.component.html',
  styleUrls: ['./mindful-selectors.component.scss'],
  imports: [
    NgForOf,
    CommonModule,
    MindfulBadgeComponent,
    MindfulButtonComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MindfulSelectorsComponent implements OnInit {
  @Input() options: { key: any; value: string; type: any }[] = [];
  @Input() label?: string;
  @Input() formGroup!: FormGroup;
  @Input() formControlName!: string;
  @Input() componentType: 'button' | 'badge' = 'badge';
  @Input() size: 'small' | 'medium' | 'large' = 'small';
  @Output() selectedKeysChange = new EventEmitter<number[]>();

  @Input()
  @CoerceBoolean()
  singleSelection: boolean = false;

  @Input()
  @CoerceBoolean()
  circle: boolean = false;

  selectedKeys: any[] = [];

  ngOnInit(): void {
    const control = this.formGroup?.get(this.formControlName) as FormControl;
    if (control) {
      this.selectedKeys = control.value || [];
    }
  }

  toggleSelection(key: number): void {
    const control = this.formGroup?.get(this.formControlName) as FormControl;
    if(this.singleSelection){
      this.selectedKeys = [key];
    }else{
      if (this.selectedKeys.includes(key)) {
        this.selectedKeys = this.selectedKeys.filter(k => k !== key);
      } else {
        this.selectedKeys.push(key);
      }
    }

    if (control) {
      control.setValue(this.selectedKeys);
    } else {
      this.selectedKeysChange.emit(this.selectedKeys);
    }
  }
}
