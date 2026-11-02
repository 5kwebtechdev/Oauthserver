import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PublicNavbarComponent } from '../../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../../landing/components/common-footer/common-footer.component';

@Component({
  selector: 'app-terms-use',
  templateUrl: './terms-use.component.html',
  styleUrls: ['./terms-use.component.scss'],
  standalone: true,
  imports: [CommonModule,RouterModule, PublicNavbarComponent, CommonFooterComponent]
})
export class TermsUseComponent {
  lastUpdated: string = 'October 15, 2025';
  
 constructor(private router: Router) {}

  scrollToSection(sectionId: string): void {
    this.router.navigate([], { fragment: sectionId }).then(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}