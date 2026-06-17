import { Component, Input, forwardRef, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { NgClass, NgIf, NgFor } from '@angular/common';
import {IonIcon} from "@ionic/angular/standalone";
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'superme-dropdown',
  templateUrl: './superme-dropdown.component.html',
  styleUrls: ['./superme-dropdown.component.scss'],
  imports: [
    NgIf,
    NgClass,
    NgFor,
    IonIcon
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SupermeDropdownComponent),
      multi: true
    }
  ]
})
export class SupermeDropdownComponent implements ControlValueAccessor, OnInit {
  @Input() label: string = '';
  @Input() options: { key: string; value: string }[] = [];
  @Input() width: 'fit' | 'medium' | 'full-width' = 'medium';
  isOpen: boolean = false;
  selectedOption: any = null;
  private onChange: any = () => {};
  private onTouched: any = () => {};
  constructor() {}
  ngOnInit() {
    console.log('');
  }
  writeValue(value: any): void {
    if (value !== undefined && value !== null) {
      this.selectedOption = value;
    }
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    // This method is optional for ControlValueAccessor
  }
  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    this.onTouched();
  }
  selectOption(option: any): void {
    this.selectedOption = option;
    this.onChange(option);
    this.isOpen = false;
  }
}
