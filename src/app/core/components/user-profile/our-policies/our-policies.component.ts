import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { ViewAllComponent } from '../../superme-navigator/view-all/view-all.component';
import { POLICY_CONTENT } from './policy-content';

type PolicyTab = 'terms' | 'privacy' | 'child-safety' | 'refund';

@Component({
  selector: 'our-policies',
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent, ViewAllComponent],
  templateUrl: './our-policies.component.html',
  styleUrls: ['./our-policies.component.scss']
})
export class OurPoliciesComponent implements OnInit {
  @Input() compact = false;

  readonly tabs: { id: PolicyTab; title: string }[] = [
    { id: 'terms', title: 'Terms of Use' },
    { id: 'privacy', title: 'Privacy Policy' },
    { id: 'child-safety', title: 'Child Safety' },
    { id: 'refund', title: 'Refund & Cancellation' }
  ];
  selectedTab: PolicyTab = 'terms';
  showFullPolicy = false;
  get policyContent(): string { return POLICY_CONTENT[this.selectedTab]; }
  get policyTitle(): string { return this.tabs.find(tab => tab.id === this.selectedTab)!.title; }

  constructor(private route: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    // Check for tab query parameter
    this.route.queryParams.subscribe(params => {
      this.selectedTab = this.tabs.some(tab => tab.id === params['tab']) ? params['tab'] : 'terms';
      this.showFullPolicy = params['full'] === 'true' || this.selectedTab === 'child-safety' || this.selectedTab === 'refund';
    });
  }

  selectTab(tab: PolicyTab) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab } });
  }

  onContactSupport(): void {
    this.router.navigate(['/authed', 'bot-helpline']);
  }

  openFullPolicies(tab: PolicyTab) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab, full: 'true' } });
  }

  onPolicyClick(event: MouseEvent): void {
    const anchor = (event.target as Element).closest('a');
    const href = anchor?.getAttribute('href');
    if (href?.startsWith('#')) {
      event.preventDefault();
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
