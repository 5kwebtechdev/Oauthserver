import { Component } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../../components/footer/footer.component';

interface HelpTopic {
  title: string;
  items: string[];
}

interface ContactOption {
  icon: string;
  title: string;
  subtitle: string;
  actionText?: string;
  actionType?: 'button' | 'link';
}

@Component({
  selector: 'app-help-centre-page',
  standalone: true,
  imports: [
    CommonModule,
    PublicNavbarComponent,
    FooterComponent
  ],
  templateUrl: './help-centre-page.component.html',
  styleUrls: ['./help-centre-page.component.scss']
})
export class HelpCentrePageComponent {
  helpTopics: HelpTopic[] = [
    {
      title: 'Account & Access',
      items: [
        'Reset Password',
        'Update Parent Email',
        'Recover Child Account',
        'Link Multiple Children',
        'Transfer to New Device'
      ]
    },
    {
      title: 'Parental Controls',
      items: [
        'Set Screen Time Limits',
        'Review Activity Reports',
        'Block/Allow Apps',
        'Approve Friend Connections',
        'Set Content Filters'
      ]
    },
    {
      title: 'Billing & Subscriptions',
      items: [
        'Update Payment Method',
        'Cancel Subscription',
        'Request Refund',
        'Family Plan Setup',
        'Fix Failed Payments'
      ]
    }
  ];

  contactOptions: ContactOption[] = [
    {
      icon: 'chat',
      title: 'Live Chat',
      subtitle: 'Average wait time: 2 minutes',
      actionText: 'Chat Now',
      actionType: 'button'
    },
    {
      icon: 'mail',
      title: 'Email',
      subtitle: 'Max Response within 24 hours',
      actionText: 'support@yourapp.com',
      actionType: 'link'
    },
    {
      icon: 'call',
      title: 'Helpline',
      subtitle: 'Available 24/7',
      actionText: '1-800-123-4567',
      actionType: 'link'
    }
  ];

  // Get icon based on topic title
  getTopicIcon(title: string): string {
    const iconMap: { [key: string]: string } = {
      'Account & Access': 'lock',
      'Parental Controls': 'shield',
      'Billing & Subscriptions': 'lock'
    };
    return iconMap[title] || 'lock';
  }

  onChatNow(): void {
    console.log('Opening live chat...');
    // TODO: Implement live chat functionality
  }

  onContactEmail(): void {
    window.location.href = 'mailto:support@yourapp.com';
  }

  onContactPhone(): void {
    window.location.href = 'tel:1-800-123-4567';
  }

  navigateToFAQ(): void {
    window.location.href = '/faq';
  }
}
