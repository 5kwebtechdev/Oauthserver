import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { ViewAllComponent } from '../../superme-navigator/view-all/view-all.component';

@Component({
  selector: 'our-policies',
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent, ViewAllComponent],
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

  openFullPolicies(tab: 'terms' | 'privacy') {
    const url = tab === 'privacy'
      ? 'https://supermeapp.com/privacy'
      : 'https://supermeapp.com/terms-use';
    try {
      window.open(url, '_blank');
    } catch (e) {
      console.warn('Could not open policies:', e);
    }
  }
}
