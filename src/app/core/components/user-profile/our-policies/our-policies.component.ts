import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';

@Component({
  selector: 'our-policies',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent],
  templateUrl: './our-policies.component.html',
  styleUrls: ['./our-policies.component.scss']
})
export class OurPoliciesComponent implements OnInit {
  @Input() compact = false;

  selectedTab: 'terms' | 'privacy' = 'terms';

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    // Check for tab query parameter
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'privacy') {
        this.selectedTab = 'privacy';
      } else if (params['tab'] === 'terms') {
        this.selectedTab = 'terms';
      }
    });
  }

  selectTab(tab: 'terms' | 'privacy') {
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
