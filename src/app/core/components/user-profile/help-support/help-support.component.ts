import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../..//components/mindful-navigator/mindful-navigator.component';
import { ProfileFactsComponent } from '../profile-facts/profile-facts.component';

@Component({
  standalone: true,
  selector: 'help-support',
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, ProfileFactsComponent],
  templateUrl: './help-support.component.html',
  styleUrls: ['./help-support.component.scss']
})
export class HelpSupportComponent {
  showContactForm = false;

  toggleContactForm() {
    this.showContactForm = !this.showContactForm;
  }

  onSubmitContact() {
    console.log('Contact form submitted (stub)');
    this.showContactForm = false;
  }
}
