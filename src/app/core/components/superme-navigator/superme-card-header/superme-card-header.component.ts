import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'superme-card-header',
  imports: [CommonModule],
  templateUrl: './superme-card-header.component.html',
  styleUrls: ['./superme-card-header.component.scss']
})
export class SupermeCardHeaderComponent {
  @Input() title: string = '';
  @Input() subtitleLeft?: string;
  @Input() subtitleMiddle?: string;
  @Input() subtitleRight?: string;
  @Input() showBackArrow: boolean = false;
  @Output() backClick = new EventEmitter<void>();

  onBackClick() {
    this.backClick.emit();
  }
}
