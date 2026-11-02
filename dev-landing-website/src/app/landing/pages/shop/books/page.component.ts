import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FeatureWrapperComponent } from '../../feature-wrapper/feature-wrapper.component';

@Component({
  selector: 'app-books-page',
  standalone: true,
  imports: [FeatureWrapperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-feature-wrapper
    [title]="pageTitle"
    description="Skip the queues. Skip the stress. Get School Essentials delivered at your doorstep. Shop textbooks, uniforms and essentials at click of a button."
    visualSrc="assets/Landing/1b52a3e597a9517c588bb2f3abf62e7635fdcdc7.png"
    accentColor="#e1527c"
    visualAspectRatio="752 / 392"
    badge="Launching Soon"
    preCTAText="Use other features while you wait"
    preCTAMobileText="Try SuperMe app for free"
  ></app-feature-wrapper>`,
})
export class BooksPageComponent {
  readonly pageTitle: string;

  constructor(route: ActivatedRoute) {
    const path = route.snapshot.routeConfig?.path;
    this.pageTitle = path === 'entrance-exam-books' ? 'Entrance Exam Books'
      : path === 'general-books' ? 'General Books' : 'Shop';
  }
}
