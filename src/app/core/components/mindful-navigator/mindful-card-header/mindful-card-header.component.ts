import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewAllComponent } from '../view-all/view-all.component';

@Component({
  standalone: true,
  selector: 'mindful-card-header',
  imports: [CommonModule, ViewAllComponent],
  templateUrl: './mindful-card-header.component.html',
  styleUrls: ['./mindful-card-header.component.scss']
})
export class MindfulCardHeaderComponent {
  @Input() title: string = '';
  @Input() subtitleLeft?: string;
  @Input() subtitleMiddle?: string;
  @Input() subtitleRight?: string;
}
