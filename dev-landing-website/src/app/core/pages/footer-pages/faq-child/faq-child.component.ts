import { Component } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../../components/footer/footer.component';
import { SupermeFactsComponent } from '../../../components/superme-facts/superme-facts.component';

interface FAQItem {
  question: string;
  answer?: string;
}

interface FAQCategory {
  icon: string;
  title: string;
  items: FAQItem[];
}

@Component({
  selector: 'app-faq-child',
  standalone: true,
  imports: [
    CommonModule,
    PublicNavbarComponent,
    FooterComponent,
    SupermeFactsComponent
  ],
  templateUrl: './faq-child.component.html',
  styleUrls: ['./faq-child.component.scss']
})
export class FaqChildComponent {
  faqCategories: FAQCategory[] = [
    {
      icon: 'person',
      title: 'Account & Access',
      items: [
        { question: "Why can’t I log in?", answer: '' },
        { question: 'How do I reconnect with Mom/Dad?', answer: '' },
        { question: 'My pet disappeared! Help!', answer: '' }
      ]
    },
    {
      icon: 'rewarded_ads',
      title: 'Pets & Rewards',
      items: [
        { question: 'How do I earn more coins?', answer: '' },
        { question: "Why won’t my pet wear the accessory I bought?", answer: '' },
        { question: 'Can I trade pets with friends?', answer: '' }
      ]
    },
    {
      icon: 'add_task',
      title: 'Habits & Tasks',
      items: [
        { question: "Why isn’t my habit marked as done?", answer: '' },
        { question: 'Can I edit a habit after creating it?', answer: '' },
        { question: 'What if I miss a streak?', answer: '' }
      ]
    },
    {
      icon: 'supervisor_account',
      title: 'Parent Controls',
      items: [
        { question: 'Why did Mom/Dad block an app?', answer: '' },
        { question: 'Can I hide my journal from parents?', answer: '' },
        { question: 'Why is my screen time limited?', answer: '' }
      ]
    },
    {
      icon: 'help',
      title: 'Troubleshooting',
      items: [
        { question: 'The app crashed mid-habit! What now?', answer: '' },
        { question: "My rewards didn’t load!", answer: '' },
        { question: 'Why is the pet animation glitchy?', answer: '' }
      ]
    }
  ];

  contactTeam(): void {
    // TODO: Implement contact functionality
    console.log('Contact team clicked');
  }
}
