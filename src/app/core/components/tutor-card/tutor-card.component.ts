import { Component, Input } from '@angular/core';
import { NgStyle } from "@angular/common";
import { IonicModule } from "@ionic/angular";

@Component({
  selector: 'tutor-card',
  templateUrl: './tutor-card.component.html',
  styleUrls: ['./tutor-card.component.scss'],
  imports: [NgStyle, IonicModule],
  standalone: true
})
export class TutorCardComponent {
  @Input() name: string = '';
  @Input() avatar: string = '';
  @Input() description: string = '';
  @Input() rating: number = 0;
  @Input() experience: string = '';
  @Input() isOnline: boolean = false;
}