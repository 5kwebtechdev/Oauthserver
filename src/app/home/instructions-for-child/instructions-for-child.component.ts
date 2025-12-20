import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ProfileFactsComponent, FaqItem, PROFILE_FAQS } from '../../core/components/user-profile/profile-facts/profile-facts.component';
import { MindfulButtonComponent } from '../../core/components/mindful-button/mindful-button.component';

@Component({
  selector: 'app-instructions-for-child',
  templateUrl: './instructions-for-child.component.html',
  styleUrls: ['./instructions-for-child.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ProfileFactsComponent, RouterModule, MindfulButtonComponent]
})
export class InstructionsForChildComponent implements OnInit {
  userRole: 'child' | 'parent' | 'self' = 'child';
  preLinkingFaqs: FaqItem[] = PROFILE_FAQS.filter(f => (f.section || '').toLowerCase() === 'onboarding' && (f.screen || '').toLowerCase().includes('instructions- child (pre linking)'));

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const role = params['role'];
      if (role && ['child', 'parent', 'self'].includes(role)) {
        this.userRole = role;
      }
    });
  }

  goBack() {
    this.router.navigate(['/home/sign-up'], { queryParams: { step: 3 } });
  }

  proceedNext() {
    this.router.navigate(['/home/join-family'], { queryParams: { role: this.userRole } });
  }
}