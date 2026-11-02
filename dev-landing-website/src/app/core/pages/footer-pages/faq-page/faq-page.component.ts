import { AfterViewInit, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PublicNavbarComponent } from '../../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../../landing/components/common-footer/common-footer.component';
import { SupermeFactsComponent } from '../../../components/superme-facts/superme-facts.component';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  id: string;
  title: string;
  items: FAQItem[];
}

@Component({
  selector: 'app-faq-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PublicNavbarComponent,
    CommonFooterComponent,
    SupermeFactsComponent
  ],
  templateUrl: './faq-page.component.html',
  styleUrls: ['./faq-page.component.scss']
})
export class FaqPageComponent implements AfterViewInit {
  faqSections: FAQSection[] = [
    {
      id: 'about-superme',
      title: 'About SuperMe',
      items: [
        {
          question: 'What is SuperMe?',
          answer:
            'SuperMe is a growth app built on four foundations — Habit Formation, Task Management, Time Management, and Learning. Together, they help you build discipline, stay organised, and keep growing every day through quizzes, challenges, daily habits, and tasks.'
        },
        {
          question: 'Who is SuperMe for?',
          answer:
            'SuperMe is designed for anyone and everyone, with age-specific quizzes, challenges, and growth activities.'
        },
        {
          question: 'What makes SuperMe different?',
          answer:
            'Most apps focus only on academic subjects. SuperMe combines: Habit Formation, Task Management, Time Management, and Learning.'
        },
        {
          question: 'What skills does SuperMe help build?',
          answer:
            'SuperMe focuses on real-world skills such as habit formation, curiosity and critical thinking, reading and comprehension, focus and discipline, goal setting, and independent learning.'
        }
      ]
    },
    {
      id: 'account-setup',
      title: 'Account Setup',
      items: [
        {
          question: 'What are the different login types available and how do I choose?',
          answer:
            'SuperMe offers three types of logins: Self Login for independent users, Parent Login for parents managing children, and Child Login for children under a parent account.'
        },
        { question: 'What is Self Login in SuperMe?', answer: 'Self Login is designed for users who want to use SuperMe independently without any control.' },
        { question: 'What is Parent Login in SuperMe?', answer: "Parent Login is designed for parents to manage, assign, and monitor their child's activities and tasks." },
        { question: 'What is Child Login in SuperMe?', answer: 'Child Login is designed for younger users who can use the app under a parent-managed account.' },
        { question: 'Can a parent add more than one child?', answer: 'Yes. Parents can add and manage two child logins and in total 4 members are allowed under one family login.' },
        { question: 'How does a child log in to SuperMe?', answer: 'Child users can log in by selecting Child Role and entering credentials provided by the parent.' },
        { question: 'What if the parent does not have an account yet?', answer: 'Parent users need to create their own account first. A Family Code is generated after signup and can be shared with the child.' },
        { question: 'Can a child create an account without a parent?', answer: 'No, a child account is linked to a parent account for supervision and management.' },
        { question: 'How do I invite my friends?', answer: 'Tap Refer a Friend in profile to get your referral code. You earn 100 reward coins for every successful referral.' }
      ]
    },
    {
      id: 'learning-experience',
      title: 'Learning Experience',
      items: [
        { question: 'How does learning work in SuperMe?', answer: 'Children learn through Quizzes, Puzzles, Articles, and Academy. Each activity is designed to take 5–10 minutes.' },
        { question: 'How often is new content added?', answer: 'New content is regularly added to keep the learning experience fresh and engaging.' }
      ]
    },
    {
      id: 'coins-and-rewards',
      title: 'Coins and Rewards',
      items: [
        { question: 'How do I earn coins?', answer: 'You earn coins by completing habits, tasks, quizzes, puzzles, reading articles, and finishing courses. Bonus coins are available for streaks and achievements.' },
        { question: 'What are streaks and rewards?', answer: 'Streaks encourage consistency by rewarding regular activity completion with higher rewards and achievements.' }
      ]
    },
    {
      id: 'find-a-tutor',
      title: 'Find a Tutor',
      items: [
        { question: 'What is the SuperMe Tutor platform?', answer: 'SuperMe helps users find and connect with verified tutors and academies across subjects, exams, skills, sports, and languages in online and offline modes.' },
        { question: 'Who can use the tutor feature?', answer: 'The tutor platform is available for anyone looking for academic, language, hobby, exam, or skill-based learning support.' },
        { question: 'Are tutors verified?', answer: 'SuperMe includes a verification system to identify trusted tutors. Users should still do their due diligence before contacting.' },
        { question: 'How to contact a tutor?', answer: 'You need an account to contact tutors on SuperMe. After signup, browse tutor profiles and book.' }
      ]
    },
    {
      id: 'help-section',
      title: 'Help Section',
      items: [
        { question: 'Which devices support SuperMe?', answer: 'SuperMe is available on Android, iOS, and web browsers.' },
        { question: 'How do I change my password?', answer: 'Go to Profile, then Password and security, and update your password.' },
        { question: 'Can I edit an activity after creating it?', answer: 'Long-press the activity card to open details, then tap Edit.' },
        { question: 'How do I delete an activity I no longer want?', answer: 'Long-press the habit card, open Edit, then select Delete.' },
        { question: 'How do I create a new habit or task for my child?', answer: 'Tap the Plus (+) icon on home, enter details, and submit. Parent approval is required before activation.' },
        { question: 'How to delete an account?', answer: 'You can delete your account from Profile in the app. Certain conditions must be met before successful deletion.' }
      ]
    },
    {
      id: 'tutor-onboarding',
      title: 'Tutor Onboarding',
      items: [
        { question: 'Who can become a tutor on SuperMe?', answer: 'Anyone with teaching knowledge or experience can join, including individual tutors, professionals, and academies.' },
        { question: 'What information is required to create a tutor profile?', answer: 'To get listed on SuperMe, tutors need to provide contact details, qualifications, location, and related profile information.' },
        { question: 'Are tutor profiles verified?', answer: 'Yes. SuperMe verifies tutor profiles for identity and credentials. Accurate documents help speed onboarding.' }
      ]
    },
    {
      id: 'refund-cancellation',
      title: 'Refund & Cancellation',
      items: [
        { question: 'Can I return a product if I change my mind?', answer: 'No. Purchases are final and are not eligible for cancellation, return, exchange or refund unless the product listing expressly offers a return option.' },
        { question: 'Can I get a refund if I ordered the wrong size or colour?', answer: 'No. Please check the product details, size chart and variant carefully before ordering.' },
        { question: 'What if my product arrives damaged?', answer: 'Contact SuperMeApp within 24 hours, with your order details and photographs/video of the package and product. We will investigate and, where appropriate, arrange a replacement, repair, refund or other remedy.' },
        { question: 'What if I receive the wrong product?', answer: 'Contact SuperMeApp within 24 hours. If verification confirms that SuperMeApp or the seller supplied the wrong item, an appropriate remedy may be provided, subject to applicable law.' },
        { question: 'What if something is missing from my order?', answer: 'Report the missing item promptly with your order number and shipment details. We may verify the package contents and delivery records before providing an appropriate remedy.' },
        { question: 'What if the product is defective?', answer: 'Please contact support with evidence of the defect. Depending on the product and circumstances, we may arrange repair, replacement, refund or another remedy, including under an applicable manufacturer warranty.' },
        { question: 'How long do I have to report a problem?', answer: 'Please report issues within 24 hours of delivery. This helps us investigate quickly. Mandatory legal rights are not excluded by this recommended reporting period.' },
        { question: 'Do I need to provide photos or videos?', answer: 'For damaged, defective or incorrect-item claims, photos or video may be requested to help verify the issue.' },
        { question: 'Will I get a refund for shipping charges?', answer: 'If a refund is approved, the treatment of shipping and other charges depends on the circumstances, the applicable seller terms and applicable law.' },
        { question: 'How will an approved refund be paid?', answer: 'Refunds are normally made to the original payment method, unless another method is agreed or required. Your bank or payment provider may require additional processing time.' },
        { question: 'Can I cancel my order after placing it?', answer: 'Orders once placed cannot be cancelled.' },
        { question: 'What happens if I refuse delivery?', answer: 'If the order is correct and you refuse delivery because you changed your mind, the order may not qualify for a refund. Any handling of delivery or return-to-sender costs will be subject to applicable law and the order terms.' },
        { question: 'Are digital products refundable?', answer: 'No, digital products, credits, subscriptions and services are non-refundable after delivery, activation or consumption unless the listing says otherwise or a refund is required by applicable law.' },
        { question: 'Does this policy override consumer rights?', answer: 'No. This Policy is not intended to remove any mandatory consumer protection, warranty, cancellation or other legal rights that cannot lawfully be excluded.' },
        { question: 'Who should I contact for a complaint?', answer: 'Use the SuperMeApp in-app support channel or supermeapp@gmail.com. For formal grievances, contact the designated Grievance Officer at the details published on SuperMeApp.' }
      ]
    }
  ];

  constructor(private readonly route: ActivatedRoute) {}

  ngAfterViewInit(): void {
    if (this.route.snapshot.data['scrollToRefund']) {
      this.scrollToRefundAfterAssetsLoad();
    }
  }

  private scrollToRefundAfterAssetsLoad(): void {
    const pendingImages = Array.from(document.images).filter((image) => !image.complete);
    const assetsReady = pendingImages.map(
      (image) =>
        new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        }),
    );

    const scrollToRefund = () =>
      requestAnimationFrame(() => this.scrollToSection('refund-cancellation'));

    Promise.all(assetsReady).then(scrollToRefund);
    window.setTimeout(scrollToRefund, 1200);
  }

  scrollToSection(sectionId: string): void {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
