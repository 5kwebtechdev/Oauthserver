import { booleanAttribute, Component, Input, OnInit, NgModule } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { CoerceBoolean } from '../../../coerceBoolean.decorator';

export interface CategoriesCardConfig {
  title?: string;
  comingSoon?: boolean;
  imageUrl?: string;
  property1?:
    | 'Accessories'
    | 'Books'
    | 'Boys Uniform'
    | 'Entrance Exam'
    | 'Footwear'
    | 'General Books'
    | 'Girls Uniform';
}

@Component({
  selector: 'categories-card',
  standalone: true,
  templateUrl: './categories-card.component.html',
  styleUrls: ['./categories-card.component.scss'],
  imports: [NgIf]
})
export class CategoriesCardComponent implements OnInit {
  @Input()
  title: string = 'Book Stores';

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  comingSoon: boolean = true;

  @Input()
  imageUrl: string = 'https://www.figma.com/api/mcp/asset/9dd94b0a-1b57-45b8-970e-95a5d04364b1';

  @Input()
  property1: 'Accessories' | 'Books' | 'Boys Uniform' | 'Entrance Exam' | 'Footwear' | 'General Books' | 'Girls Uniform' = 'Boys Uniform';

  constructor() {}

  ngOnInit(): void {}
}

@NgModule({
  imports: [CommonModule, CategoriesCardComponent],
  declarations: [],
  exports: [CategoriesCardComponent],
})
export class CategoriesCardModule {}
