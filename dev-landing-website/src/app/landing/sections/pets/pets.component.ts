import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pets-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pets.component.html',
  styleUrls: ['./pets.component.scss'],
})
export class PetsSectionComponent {
  pets = [
    { id: 'panda', name: 'Bao the Mindful Panda', image: 'assets/Landing/44dde6eb93cc2a1d029fa268fc2a55d8de2f2619.png', imageWidth: 500, imageHeight: 500, imgClass: 'absolute h-[108%] left-[-4%] max-w-none top-[-2%] w-[108%]' },
    { id: 'llama', name: 'Koda the Chill Llama', image: 'assets/Landing/ea45a13bfaa22fa581c61784cae0e436783e157c.png', imageWidth: 477, imageHeight: 523, imgClass: 'absolute h-[100.09%] left-[4.35%] max-w-none top-[-0.05%] w-[91.29%]' },
    { id: 'owl', name: 'Luna the Wise Owl', image: 'assets/Landing/70b63f6bcec100308a42303bb4d13167ac93f3f5.png', imageWidth: 1024, imageHeight: 1024, imgClass: 'absolute h-[150.29%] left-[-20.96%] max-w-none top-[-32.1%] w-[150.14%]' },
    { id: 'dragon', name: 'Zuki the Fierce Dragon', image: 'assets/Landing/2cfdf3734702ba32b0e79c602fa65160c81aa14e.png', imageWidth: 500, imageHeight: 500, imgClass: 'absolute h-[108.09%] left-[-5.84%] max-w-none top-[-1.77%] w-[108.23%]' },
  ];
}
