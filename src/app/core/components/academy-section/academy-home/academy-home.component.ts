import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { NavigationService } from '../../../services/navigation.service';
import { AcademyService, Course } from '../../../services/academy.service';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { MindfulSpeechBubbleComponent } from '../../mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';

@Component({
  selector: 'app-academy-home',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, MindfulCardHeaderComponent, MindfulSpeechBubbleComponent, MindfulPetComponent],
  templateUrl: './academy-home.component.html',
  styleUrls: ['./academy-home.component.scss']
})
export class AcademyHomeComponent {
  @Input() title: string | undefined;
  @Input() description: string | undefined;

  categoryCards: Array<{
    category: string;
    title: string;
    displayTitle: string;
    color: string;
    image: string;
    thumbnail?: string | null;
    courses?: Course[];
  }> = [
      { category: 'MANAGING_MONEY', title: 'Managing Money', displayTitle: 'Managing<br>Money', color: 'yellow', image: '/assets/Images-Transparent/Image-Academy-Cat1.png', thumbnail: null, courses: [] },
      { category: 'COMMUNICATION', title: 'Communication', displayTitle: 'Communication', color: 'purple', image: '/assets/Images-Transparent/Image-Academy-Cat2.png', thumbnail: null, courses: [] },
      { category: 'MEDITATION', title: 'Meditation', displayTitle: 'Meditation', color: 'pink', image: '/assets/Images-Transparent/Image-Academy-Cat3.png', thumbnail: null, courses: [] },
      { category: 'CULTURAL_VALUES', title: 'Cultural Values', displayTitle: 'Cultural<br>Values', color: 'green', image: '/assets/Images-Transparent/Image-Academy-Cat4.png', thumbnail: null, courses: [] }
    ];

  constructor(private router: Router, private academyService: AcademyService, private navigation: NavigationService) { }

  ngOnInit(): void {
    this.loadCourses();
  }

  private loadCourses(): void {
    this.academyService.getCourses().subscribe({
      next: (courses) => {
        // Group courses by category and set thumbnails/counts
        for (const card of this.categoryCards) {
          card.courses = courses.filter(c => c.category === card.category && (c.enabled ?? true));
          card.thumbnail = card.image;
        }
      },
      error: (err) => {
        console.error('Failed to load courses', err);
      }
    });
  }

  onBackClick(): void {
    this.navigation.back();
  }

  openSubject(category: string): void {
    // navigate to subject page with category as query param
    this.router.navigate(['/authed/academy/subject'], { queryParams: { category } });
  }
}
