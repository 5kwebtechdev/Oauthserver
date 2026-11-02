import { Component } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule, NgFor } from '@angular/common';
import { Router } from '@angular/router';
import { FooterComponent } from '../../../components/footer/footer.component';

interface HowItWorksCard {
  icon: string;
  title: string;
  points: string[];
}

@Component({
  selector: 'app-how-works-page',
  standalone: true,
  imports: [
    CommonModule,
    NgFor,
    PublicNavbarComponent,
    FooterComponent
  ],
  templateUrl: './how-works-page.component.html',
  styleUrls: ['./how-works-page.component.scss']
})
export class HowWorksPageComponent {
  // Figma assets for icons
  readonly habitsIcon = 'https://www.figma.com/api/mcp/asset/0f7ff0b2-d9bb-4f1b-8f18-ae171d25b077';
  readonly feelingsIcon = 'https://www.figma.com/api/mcp/asset/82b293a7-4984-461b-af6e-4950d5176e77';
  readonly puzzlesIcon = 'https://www.figma.com/api/mcp/asset/368247f2-c463-4881-9ec8-60375b4d2afc';
  readonly coinsIcon = 'https://www.figma.com/api/mcp/asset/1ccb6116-ac91-49c7-bc6f-139335b7e347';
  readonly tutorIcon = 'https://www.figma.com/api/mcp/asset/c380f334-b9e2-41de-9506-13ae17e2b829';

  constructor(private router: Router) {}

  cards: HowItWorksCard[] = [
    {
      icon: this.habitsIcon,
      title: 'Choose Habits, Set Routines',
      points: [
        'Add habits/ tasks like "Math Practice" or "Water Plants"',
        'Assign to morning/evening/night',
        'Get notifications based on frequency'
      ]
    },
    {
      icon: this.feelingsIcon,
      title: 'Log Feelings, Boost Progress',
      points: [
        'Log how you feel at any particular time you open',
        'Pet reacts (e.g. jumps when happy)',
        'Your app experience will change accordingly'
      ]
    },
    {
      icon: this.puzzlesIcon,
      title: 'Solve Puzzles, Ace Quizzes',
      points: [
        'Earn coins by solving math/brain teasers',
        'The content will be segmented by difficulty level',
        'Compete with other users on leaderboards'
      ]
    },
    {
      icon: this.coinsIcon,
      title: 'Earn & Spend Your Coins',
      points: [
        'Earn coins from activities that you complete successfully',
        'Spend on pet accessories, games, or buying back streaks',
        'Parents can also contribute to your wealth'
      ]
    },
    {
      icon: this.tutorIcon,
      title: 'Connect with Top Tutors',
      points: [
        'View our curated tutors list',
        'Read reviews and pick your tutors',
        'After Parental approval, start you learning journey'
      ]
    }
  ];

  navigateToFaq() {
    this.router.navigate(['/faq']);
  }
}
