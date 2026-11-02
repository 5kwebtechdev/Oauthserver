import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-referral-redirect',
  standalone: true,
  template: '',
})
export class ReferralRedirectComponent implements OnInit {
  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    this.router.navigate(['/'], {
      queryParams: code ? { code } : {},
      replaceUrl: true,
    });
  }
}
