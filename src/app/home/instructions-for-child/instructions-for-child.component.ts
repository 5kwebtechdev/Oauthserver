import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-instructions-for-child',
  templateUrl: './instructions-for-child.component.html',
  styleUrls: ['./instructions-for-child.component.scss'],
  standalone: false
})
export class InstructionsForChildComponent implements OnInit {
  userRole: 'child' | 'parent' | 'self' = 'child';

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