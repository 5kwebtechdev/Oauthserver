import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
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
  @Input() suggestions: string[] = [];
  @Input() showSuggestions: boolean = false;
  @Input() suggestionError: string | null = null;

  @Output() suggestionSelected = new EventEmitter<string>();

  @Input() errorMessage: string | null = null;
  @HostBinding('class.has-error')
  @Input() showError: boolean = false;

  @Output() valueChange = new EventEmitter<string | null>();

  onInput(event: Event) {
    const v = (event.target as HTMLInputElement).value;
    this.value = v;
    this.valueChange.emit(v);
  }

  onSuggestionClick(s: string) {
    this.value = s;
    // When the user clicks a suggestion, emit only suggestionSelected
    // so parent can handle it without treating it as a manual input change.
    this.suggestionSelected.emit(s);
  }
}
