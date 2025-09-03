import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from "@angular/common";
import { IonicModule } from "@ionic/angular";

@Component({
  selector: 'content-card',
  templateUrl: './content-card.component.html',
  styleUrls: ['./content-card.component.scss'],
  imports: [NgClass, NgIf, IonicModule],
  standalone: true
})
export class ContentCardComponent {
  @Input() title: string = '';
  @Input() imageUrl: string = '';
  @Input() difficulty: string = '';
  @Input() likes: number = 0;
  @Input() views: number = 0;
  @Input() isNew: boolean = false;
}