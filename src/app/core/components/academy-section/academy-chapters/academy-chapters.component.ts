import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-academy-chapters',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './academy-chapters.component.html',
  styleUrls: ['./academy-chapters.component.scss']
})
export class AcademyChaptersComponent {
  @Input() courseId: string | undefined;
  @Input() courseTitle: string | undefined;

  chapters: Array<{ title: string; summary?: string }> = [];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    this.loadChapters();
  }

  private loadChapters(): void {
    // Minimal stub: generate 5 chapters for any course. Replace with real data as needed.
    this.chapters = Array.from({ length: 5 }, (_, i) => ({
      title: `Chapter ${i + 1}`,
      summary: `Short summary for chapter ${i + 1}`
    }));
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}
