import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'quick-access-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quick-access-section.component.html',
  styleUrls: ['./quick-access-section.component.scss']
})
export class QuickAccessSectionComponent {}
