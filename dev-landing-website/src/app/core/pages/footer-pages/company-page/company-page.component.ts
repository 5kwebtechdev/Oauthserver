import { Component } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../../components/footer/footer.component';

interface BlogPost {
  image: string;
  label: string;
  title: string;
  description: string;
  readTime: string;
}

interface MediaArticle {
  source: string;
  date: string;
  title: string;
  description: string;
  link: string;
}

@Component({
  selector: 'app-company-page',
  standalone: true,
  imports: [
    CommonModule,
    PublicNavbarComponent,
    FooterComponent
  ],
  templateUrl: './company-page.component.html',
  styleUrls: ['./company-page.component.scss']
})
export class CompanyPageComponent {
  blogPosts: BlogPost[] = [
    {
      image: 'assets/Landing/Images-Thumbnails/Image-About-Blog1.jpg',
      label: 'Digital Detox',
      title: 'How to Reduce Screen Time for Teens Without Arguments: 3 Pediatrician-Approved Methods',
      description: 'Step-by-step plan to balance Fortnite and homework. Includes free \'Screen Time Agreement\' PDF.',
      readTime: '7 min read'
    },
    {
      image: 'assets/Landing/Images-Thumbnails/Image-About-Blog2.jpg',
      label: 'Study Habits',
      title: 'Best Time Table for Class 10 Students: IIT Professor\'s 2024 Method',
      description: 'Boost focus by 57% using circadian rhythm-aligned schedules. Works with CBSE/ICSE/State Boards.',
      readTime: '9 min read'
    },
    {
      image: 'assets/Landing/Images-Thumbnails/Image-About-Blog3.jpg',
      label: 'Teen Health',
      title: 'Yoga Poses for Exam Stress: 5 Asanas Recommended by NCERT',
      description: 'Reduce anxiety and improve memory retention with these easy poses. Video demo included.',
      readTime: '6 min read'
    }
  ];

  mediaPublications: string[] = [
    'The Times of India',
    'YourStory',
    'The Hindu',
    'Forbes India'
  ];

  mediaArticles: MediaArticle[] = [
    {
      source: 'YourStory',
      date: '15th May, 2025',
      title: 'Mindful Buddy Secures $5M to Expand AI-Powered Habit Coaching for Indian Teens',
      description: 'Startup\'s \'Family-First\' model attracts investors; plans to impact 1M+ families by 2025.',
      link: '#'
    },
    {
      source: 'The Hindu',
      date: '8th May, 2025',
      title: 'How This App Balances Tech & Tradition in Indian Parenting',
      description: 'Case study shows 68% reduction in screen-time fights using progress trackers.',
      link: '#'
    }
  ];

  onExploreBlogs(): void {
    console.log('Explore all blogs clicked');
    // Navigate to blogs page
  }

  onSeeCoverage(): void {
    console.log('See all coverage clicked');
    // Navigate to press/media page
  }

  onReadBlog(post: BlogPost): void {
    console.log('Read blog:', post.title);
    // Navigate to blog detail page
  }

  onReadArticle(article: MediaArticle): void {
    console.log('Read article:', article.title);
    window.open(article.link, '_blank');
  }
}
