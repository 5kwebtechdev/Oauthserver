import { Component, Input } from '@angular/core';
import { Lesson } from '../lesson-list.component';

@Component({
  selector: 'app-lesson-card',
  templateUrl: './lesson-card.component.html',
  styleUrls: ['./lesson-card.component.scss']
})
export class LessonCardComponent {
  @Input() lesson!: Lesson;
}
