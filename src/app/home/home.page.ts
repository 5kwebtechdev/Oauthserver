import { Component } from '@angular/core';
import {Router} from "@angular/router";

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {

  currentSlide = 0;
  touchStartX = 0;
  touchEndX = 0;

  slides = [
    {
      image: 'assets/onboarding/onboarding_1.svg',
      title: 'Stick to cool habits!',
      subtitle: [
        'Track your tasks.',
        'Earn fun rewards.',
        'Keep going strong.'
      ],
      background: 'linear-gradient(169.84deg, #F28745 0%, #F6AC72 52.35%, #EE6621 98.8%)',
      color: '#772817',
      next_color: "#FAD2AE"
    },
    {
      image: 'assets/onboarding/onboarding_2.svg',
      title: 'Level Up Your Day!',
      subtitle: [
        'Custom challenges.',
        'Daily streaks.',
        'Crush your goals.'
      ],
      background: 'linear-gradient(169.84deg, #ED84A0 0%, #F4ADBF 52.35%, #E1527C 98.8%)',
      color: '#7C1F47',
      next_color: "#F9D2DC"
    },
    {
      image: 'assets/onboarding/onboarding_3.svg',
      title: 'Join the Club!',
      subtitle: [
        'Share progress.',
        'Stay motivated.',
        'Celebrate wins.'
      ],
      background: 'linear-gradient(169.84deg, #8B8DCB 0%, #A1A7D8 52.35%, #7471BA 98.8%)',
      color: '#46456A',
      next_color: "#D6DBEF"
    }
  ];

  constructor(private router: Router) {
    // Initialize the first slide
    this.currentSlide = 0;

  }

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }

  handleSwipe() {
    const deltaX = this.touchEndX - this.touchStartX;
    if (deltaX > 50 && this.currentSlide > 0) {
      this.currentSlide--;
    } else if (deltaX < -50 && this.currentSlide < this.slides.length - 1) {
      this.currentSlide++;
    }
  }

  setSlide(index: number) {
    this.currentSlide = index;
  }

  nextSlide() {
    if (this.currentSlide < this.slides.length - 1) {
      this.currentSlide++;
    }else{
      this.router.navigateByUrl('home/login');
    }
  }

}
/* Onboarding-Value-Proposition-Screen */
