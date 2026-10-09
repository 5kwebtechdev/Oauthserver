import { Component, Input, OnDestroy, OnInit } from '@angular/core';
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
export class OurPoliciesComponent implements OnInit, OnDestroy {
  @Input() compact = false;
  private canonicalLink: HTMLLinkElement | null = null;
  private previousCanonicalHref: string | null = null;
  private createdCanonicalLink = false;

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
    if (this.router.url.split('?')[0].endsWith('/privacy-policy')) {
      this.canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!this.canonicalLink) {
        this.canonicalLink = document.createElement('link');
        this.canonicalLink.rel = 'canonical';
        document.head.appendChild(this.canonicalLink);
        this.createdCanonicalLink = true;
      } else {
        this.previousCanonicalHref = this.canonicalLink.href;
      }
      this.canonicalLink.href = 'https://supermeapp.com/app/privacy-policy';
    }
    // Check for tab query parameter
    this.route.queryParams.subscribe(params => {
      const isChildSafetyUrl = this.router.url.split('?')[0].endsWith('/privacy-policy');
      this.selectedTab = isChildSafetyUrl ? 'child-safety' :
        this.tabs.some(tab => tab.id === params['tab']) ? params['tab'] : 'terms';
      this.showFullPolicy = params['full'] === 'true' || this.selectedTab === 'child-safety' || this.selectedTab === 'refund';
    });
  }

  ngOnDestroy() {
    if (this.createdCanonicalLink) this.canonicalLink?.remove();
    else if (this.canonicalLink && this.previousCanonicalHref !== null) {
      this.canonicalLink.href = this.previousCanonicalHref;
    }
  }

  selectTab(tab: PolicyTab) {
    if (tab === 'child-safety') {
      this.router.navigateByUrl('/privacy-policy');
      return;
    }
    this.router.navigate(['/our-policies'], { queryParams: { tab } });
  }

  onContactSupport(): void {
    this.router.navigate(['/authed', 'bot-helpline']);
  }

  openFullPolicies(tab: PolicyTab) {
    if (tab === 'terms') {
      window.location.assign('https://supermeapp.com/terms-of-use');
      return;
    }
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
