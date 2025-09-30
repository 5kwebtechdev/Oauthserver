import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'reel-frame',
  templateUrl: './reel-frame.component.html',
  styleUrls: ['./reel-frame.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ReelFrameComponent {
  @Input() s: any;
  @Output() play = new EventEmitter<any>();
  @Output() toggleSave = new EventEmitter<any>();

  onPlay(e: Event) {
    e.stopPropagation();
    this.play.emit(this.s);
  }

  onToggleSave(e: Event) {
    e.stopPropagation();
    this.toggleSave.emit(this.s);
  }
}
