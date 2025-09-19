import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'profile-edit-input',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile-edit-input.component.html',
  styleUrls: ['./profile-edit-input.component.scss']
})
export class ProfileEditInputComponent {
  @Input() title = '';
  @Input() description = '';

  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  @Input() value: string | null = null;

  @Input() errorMessage: string | null = null;
  @Input() showError: boolean = false;

  @Output() valueChange = new EventEmitter<string | null>();

  onInput(event: Event) {
    const v = (event.target as HTMLInputElement).value;
    this.value = v;
    this.valueChange.emit(v);
  }
}
