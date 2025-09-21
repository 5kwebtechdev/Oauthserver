import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';

@Component({
  selector: 'our-policies',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent],
  templateUrl: './our-policies.component.html',
  styleUrls: ['./our-policies.component.scss']
})
export class OurPoliciesComponent {
  @Input() compact = false;

  selectedTab: 'terms' | 'privacy' = 'terms';

  selectTab(tab: 'terms' | 'privacy'){
    this.selectedTab = tab;
  }

  openFullPolicies() {
    // Placeholder: open an external or internal policies page.
    // Replace URL with the real policies route when available.
    try {
      window.open('/assets/policies/full-policies.html', '_blank');
    } catch (e) {
      console.warn('Could not open policies:', e);
    }
  }
}
