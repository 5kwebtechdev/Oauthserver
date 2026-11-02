import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import svgPaths from '../../imports/svg-dzw4twdr8x';
import mobileBlobPaths from '../../imports/svg-qyz3id1pem';

const POINTS = [
  {
    label: 'Self : ',
    subtitle: 'Your Growth, Your Rules',
    description: 'Stay productive without burning out and build habits that actually stick. 100% private. Your journey, your progress, for your eyes only.',
  },
  {
    label: 'Child : ',
    subtitle: 'Grow With Your Family',
    description: "Growing up is way more fun when everyone's on your side! Unlock powerful growth tools, sync your progress with your parents, and show off your wins.",
  },
  {
    label: 'Parent : ',
    subtitle: 'Guide, Reward, Celebrate',
    description: 'Set your child up for success by building confidence, accountability, and healthy habits. Download the app and support their growth from Day 1.',
  },
];

@Component({
  selector: 'app-one-app-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './one-app.component.html',
})
export class OneAppSectionComponent {
  imgRole = 'assets/Landing/99ac1b343121a88e7f8f93a3f9f27de9dd38db64.png';
  points = POINTS;

  blueBlob = svgPaths.p182be400;
  pinkBlob = svgPaths.p12b14c00;
  greenBlob = svgPaths.p4ed3400;
  orangeBlob = svgPaths.p14812700;

  mobileBlueBlob = mobileBlobPaths.p3aebb270;
  mobilePinkBlob = mobileBlobPaths.p1e584e00;
  mobileGreenBlob = mobileBlobPaths.p28b75640;
  mobileOrangeBlob = mobileBlobPaths.p3dd6e380;
}
