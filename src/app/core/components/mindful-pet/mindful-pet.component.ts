import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'mindful-pet',
  standalone: true,
  imports: [NgIf, NgClass, IonicModule],
  templateUrl: './mindful-pet.component.html',
  styleUrls: ['./mindful-pet.component.scss']
})
export class MindfulPetComponent {
  @Input() name: string = 'Buddy';
  @Input() mood: 'happy' | 'sleepy' | 'playful' | 'sad' = 'happy';
  @Input() image: string = '/assets/app-assets/pet-default.svg';

  @Output() petClick = new EventEmitter<void>();

  onClick() {
    this.petClick.emit();
  }
}
