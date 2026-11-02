import { Component } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../../../components/footer/footer.component';

interface BlogPost {
  image: string;
  label: string;
  title: string;
  description: string;
  readTime: string;
}

@Component({
  selector: 'app-blog-page',
  standalone: true,
  imports: [CommonModule, PublicNavbarComponent, FooterComponent],
  templateUrl: './blog-page.component.html',
  styleUrls: ['./blog-page.component.scss']
})
export class BlogPageComponent {
  blogPosts: BlogPost[] = [
    {
      image: 'assets/Landing/Images-Thumbnails/Image-About-Blog1.jpg',
      label: 'Digital Detox',
      title: 'How to Reduce Screen Time for Teens Without Arguments: 3 Pediatrician-Approved Methods',
      description: "Step-by-step plan to balance Fortnite and homework. Includes free 'Screen Time Agreement' PDF.",
      readTime: '7 min read'
    },
    {
      image: 'assets/Landing/Images-Thumbnails/Image-About-Blog2.jpg',
      label: 'Study Habits',
      title: "Best Time Table for Class 10 Students: IIT Professor's 2024 Method",
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

  onExploreBlogs(): void {
    console.log('Explore all blogs clicked');
    // Could implement pagination or redirect to a full listing
  }

  onReadBlog(post: BlogPost): void {
    console.log('Read blog:', post.title);
    // Navigate to blog detail page when available
  }
}
