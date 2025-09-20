import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'mindful-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mindful-toggle.component.html',
  styleUrls: ['./mindful-toggle.component.scss']
})
export class MindfulToggleComponent {
  @Input() checked = false;
  @Input() disabled = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  @HostBinding('class.toggle-checked')
  get hostChecked() {
    return !!this.checked;
  }

  toggle() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.checkedChange.emit(this.checked);
  }

  onKeydown(event: KeyboardEvent) {
    if (this.disabled) return;
    const key = event.key;
    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      this.toggle();
    }
  }
}
