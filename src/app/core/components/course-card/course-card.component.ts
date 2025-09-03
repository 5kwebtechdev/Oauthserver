import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from "@angular/common";

@Component({
  selector: 'course-card',
  templateUrl: './course-card.component.html',
  styleUrls: ['./course-card.component.scss'],
  imports: [NgClass, NgIf],
  standalone: true
})
export class CourseCardComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() imageUrl: string = '';
  @Input() progress: number = 0;
  @Input() duration: string = '';
  @Input() isNew: boolean = false;
}