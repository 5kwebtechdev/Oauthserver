import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'section-coming-soon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './section-coming-soon.component.html',
  styleUrls: ['./section-coming-soon.component.scss'],
})
export class SectionComingSoonComponent {
  @Input() sectionName = 'this section';
  @Input() compact = false;
}
