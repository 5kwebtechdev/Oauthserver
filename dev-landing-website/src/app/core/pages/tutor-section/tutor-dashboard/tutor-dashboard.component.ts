import { Component, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupermeHomeHeaderComponent } from '../../../components/superme-home-header';
import { TutorCardComponent } from '../tutor-card/tutor-card.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { TutorApi } from '../../../api/tutor.api';
import { ITutor } from '../../../models/tutor.model';

@Component({
  selector: 'app-tutor-dashboard',
  standalone: true,
  imports: [CommonModule, SupermeHomeHeaderComponent, TutorCardComponent, SupermeButtonComponent],
  templateUrl: './tutor-dashboard.component.html',
  styleUrls: ['./tutor-dashboard.component.scss']
})
export class TutorDashboardComponent implements OnInit {
  tutors: ITutor[] = [];
  @Output() viewProfileClick = new EventEmitter<any>();

  currentStart = 0;
  visibleCount = 3;

  constructor(private tutorApi: TutorApi) {
    this.updateVisibleCount();
  }

  ngOnInit() {
    this.tutorApi.getTutors().subscribe((tutors: ITutor[]) => {
      this.tutors = tutors
        .filter(t => t.createdAt)
        .sort((a: ITutor, b: ITutor) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 9);
    });
  }

  @HostListener('window:resize')
  onResize() {
    const prev = this.visibleCount;
    this.updateVisibleCount();
    if (this.visibleCount !== prev) this.currentStart = 0;
  }

  private updateVisibleCount() {
    const w = window.innerWidth;
    this.visibleCount = w <= 700 ? 1 : w <= 1100 ? 2 : 3;
  }

  prev() {
    this.currentStart = Math.max(0, this.currentStart - this.visibleCount);
  }

  next() {
    if (this.currentStart + this.visibleCount < this.tutors.length) {
      this.currentStart += this.visibleCount;
    }
  }

  get isNextDisabled() {
    return this.currentStart + this.visibleCount >= this.tutors.length;
  }

  onViewProfile(event: any) {
    this.viewProfileClick.emit(event);
  }
}