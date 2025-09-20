import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { FamilyMemberComponent } from './family-member.component';
import { ProfileFactsComponent } from '../profile-facts/profile-facts.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
@Component({
  standalone: true,
  selector: 'family-connection',
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulBadgeComponent, FamilyMemberComponent, ProfileFactsComponent, MindfulPetComponent, MindfulButtonComponent],
  templateUrl: './family-connection.component.html',
  styleUrls: ['./family-connection.component.scss']
})
export class FamilyConnectionComponent {
  // Future inputs/outputs for family data can go here
  // Provide a default family name so the template binding has a defined property.
  // This can later be replaced with real data (Input, service, or route resolver).
  familyName: string = 'Your Family';

  // Example member states for rendering multiple family members. In a real app
  // these would come from a service or be passed in as inputs.
  members = [
    { id: 1, name: 'Yash', age: '12', active: false },
    { id: 2, name: 'Asha', age: '10', active: true },
    { id: 3, name: 'Sam', age: '8', active: false }
  ];

  onMemberActiveChange(memberId: number, active: boolean) {
    const m = this.members.find(x => x.id === memberId);
    if (m) m.active = active;
  }

  onRemovedPetClick() {
    // placeholder for any future action when the removed pet is clicked
    console.log('Removed pet clicked');
  }

  continueWithNewRole() {
    // placeholder action for continuing with a new role; wire navigation/modal here
    console.log('Continue with a new role clicked');
  }
}
