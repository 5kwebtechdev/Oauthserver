import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PublicNavbarComponent } from '../../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../../landing/components/common-footer/common-footer.component';

interface PrivacySection {
  icon: string;
  title: string;
  subsections: {
    subtitle: string;
    content: string;
  }[];
}

@Component({
  selector: 'app-privacy-policy-page',
  standalone: true,
  imports: [
    CommonModule,
     RouterModule,
    PublicNavbarComponent,
    CommonFooterComponent
  ],
  templateUrl: './privacy-policy-page.component.html',
  styleUrls: ['./privacy-policy-page.component.scss']
})
export class PrivacyPolicyPageComponent {

  constructor(private router: Router) {}

  scrollToSection(sectionId: string): void {
    this.router.navigate([], { fragment: sectionId }).then(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
  privacySections: PrivacySection[] = [
    {
      icon: 'person',
      title: 'What We Collect',
      subsections: [
        {
          subtitle: 'Personal Information',
          content: "We collect basic information like email addresses and your child's age to provide our services and ensure they receive age-appropriate content. We never collect full names or addresses of children under 13."
        },
        {
          subtitle: 'Data Usage',
          content: 'We collect data about how you and your child use our application, including features accessed, time spent on the app, and preferences. This helps us improve the user experience and develop better educational content.'
        },
        {
          subtitle: 'Location Information',
          content: 'We collect country-level location data only to comply with regional regulations and provide appropriate content. We never track precise location data of children.'
        }
      ]
    },
    {
      icon: 'shield',
      title: 'Data Security',
      subsections: [
        {
          subtitle: 'Encryption',
          content: 'All personal data is protected using industry-standard AES-256 encryption both in transit and at rest. Our databases are secured behind multiple firewalls.'
        },
        {
          subtitle: 'Breach Response',
          content: 'In the unlikely event of a data breach, we will notify affected users within 72 hours and work with authorities to mitigate any potential harm.'
        },
        {
          subtitle: 'Third-Party Security',
          content: "We carefully vet all third-party service providers to ensure they maintain similar security standards and comply with relevant children's privacy regulations."
        }
      ]
    },
    {
      icon: 'border_color',
      title: 'Your Control',
      subsections: [
        {
          subtitle: 'Parent Dashboard',
          content: "Parents have complete access to a secure dashboard where they can view, edit, or delete any data associated with their family's account at any time."
        },
        {
          subtitle: 'Data Deletion',
          content: 'You can request complete deletion of your account and all associated data through your account settings or by contacting our support team. We will process your request within 30 days.'
        },
        {
          subtitle: 'Data Export',
          content: "We provide a simple tool to export all your family's data in common formats (CSV or PDF), accessible through your account settings."
        }
      ]
    },
    {
      icon: 'article',
      title: 'Updates To Privacy Policy',
      subsections: [
        {
          subtitle: 'Change Frequency',
          content: 'We review our privacy policy at least quarterly to ensure it remains current with our practices and applicable laws. Material changes are always communicated to users.'
        },
        {
          subtitle: 'Notification of Changes',
          content: "When we make significant changes to our privacy policy, we'll notify you via email and through an in-app notification. Minor changes will be noted on our website."
        },
        {
          subtitle: 'Previous Versions',
          content: 'We maintain an archive of previous privacy policy versions that can be accessed through our website, ensuring transparency about how our policies have evolved.'
        }
      ]
    }
  ];

  contactTeam(): void {
    // TODO: Implement contact functionality
    console.log('Contact team clicked');
  }
}
