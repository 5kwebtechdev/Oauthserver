import { Component } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../../components/footer/footer.component';
import { APP_STORE_URL } from '../../../constants/external-links';

interface Pet {
  name: string;
  description: string;
  imageUrl: string;
}

@Component({
  selector: 'app-pet-gallery-page',
  standalone: true,
  imports: [
    CommonModule,
    PublicNavbarComponent,
    FooterComponent
  ],
  templateUrl: './pet-gallery-page.component.html',
  styleUrls: ['./pet-gallery-page.component.scss']
})
export class PetGalleryPageComponent {
  pets: Pet[] = [
    {
      name: 'Zephyr the Panda',
      description: 'Unlocks Next-Level Focus',
      imageUrl: 'assets/Landing/Images-Pet/Image-Panda-Happy.png'
    },
    {
      name: 'Orion the Owl',
      description: 'Makes Boring Lessons Disappear',
      imageUrl: 'assets/Landing/Images-Pet/Image-Owl-Happy.png'
    },
    {
      name: 'Nova the Llama',
      description: 'Helps Bounce Back Stronger Every Time',
      imageUrl: 'assets/Landing/Images-Pet/Image-Llama-Happy.png'
    },
    {
      name: 'Phoenix the Dragon',
      description: 'Breathes celebratory rainbow fire',
      imageUrl: 'assets/Landing/Images-Pet/Image-Dragon-Happy.png'
    }
  ];

  googlePlayImage = '/assets/Icons-Neutral/Icons-GooglePlay.png';
  appleStoreImage = '/assets/icon/Apple.svg';
  readonly appStoreUrl = APP_STORE_URL;
}
