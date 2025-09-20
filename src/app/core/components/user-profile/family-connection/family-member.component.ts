import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';

@Component({
  standalone: true,
  selector: 'family-member',
  imports: [CommonModule, IonicModule, MindfulBadgeComponent],
  templateUrl: './family-member.component.html',
  styleUrls: ['./family-member.component.scss']
})
export class FamilyMemberComponent {
  @Input() name: string = '';
  @Input() age: string = '';
  @Input() active: boolean = false;
  @Input() avatarUrl?: string;

  @Output() activeChange = new EventEmitter<boolean>();

  toggleActive() {
    this.active = !this.active;
    this.activeChange.emit(this.active);
  }
}
