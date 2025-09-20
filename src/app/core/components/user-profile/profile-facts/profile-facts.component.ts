import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'profile-facts',
  imports: [CommonModule, IonicModule],
  templateUrl: './profile-facts.component.html',
  styleUrls: ['./profile-facts.component.scss']
})
export class ProfileFactsComponent implements OnInit {
  @Input() faqs: Array<{ question: string; answer?: string }> = [];
  @Input() heading: string = `FAQ's`;

  ngOnInit(): void {
    if (!this.faqs || this.faqs.length === 0) {
      this.faqs = [
        { question: 'Who is in my family here?', answer: '' },
        { question: 'What does “Active” mean?', answer: '' },
        { question: 'Can I remove family members from here?', answer: '' },
        { question: 'What if I joined the wrong family by mistake?', answer: '' }
      ];
    }
  }
}
