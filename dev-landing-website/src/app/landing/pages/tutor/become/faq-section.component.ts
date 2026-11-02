import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Faq {
  q: string;
  a: string;
}

@Component({
  selector: 'app-faq-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-3 sm:gap-4 -mt-[20px] -mb-[20px]">
      <h2 class="text-[18px] sm:text-[20px] font-semibold text-[#282527] tracking-[-1px] text-center" style="font-family:'Nunito',sans-serif">
        FAQ's
      </h2>
      <div class="flex flex-col gap-3 sm:gap-4">
        <div *ngFor="let faq of faqs; let i = index" class="bg-white rounded-[16px] shadow-[0px_0px_2px_2px_rgba(107,101,106,0.1)]">
          <button
            type="button"
            (click)="toggle(i)"
            class="w-full flex items-center justify-between pl-5 sm:pl-6 pr-6 sm:pr-8 pt-[20px] pb-[20px] sm:pt-[24px] sm:pb-[24px] text-left rounded-[16px] hover:bg-[rgba(40,37,39,0.01)] transition-colors"
          >
            <span class="text-[14px] sm:text-[16px] font-semibold text-[#282527] leading-[1.4] pr-3" style="font-family:'Nunito',sans-serif">
              {{ faq.q }}
            </span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              class="flex-shrink-0 text-[#282527] opacity-70 transition-transform duration-200"
              [class.rotate-180]="openIndex === i">
              <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div *ngIf="openIndex === i" class="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-[rgba(40,37,39,0.08)]">
            <p class="pt-4 text-[13px] sm:text-[14px] text-[rgba(40,37,39,0.7)] leading-[1.6]" style="font-family:'Nunito',sans-serif;font-weight:500">
              {{ faq.a }}
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class FaqSectionComponent {
  openIndex: number | null = null;

  faqs: Faq[] = [
    {
      q: 'How long does the approval process take?',
      a: "Our team reviews your application within 2–3 business days. Once approved, you'll receive a notification on your registered phone number and email address, and your profile will go live on SuperMe.",
    },
    {
      q: 'What documents should I upload for verification?',
      a: 'Please upload a government-issued ID (Aadhaar card, PAN card, or Passport), your highest educational qualification certificate, and any relevant teaching or professional certifications. A clear profile picture is mandatory for approval.',
    },
    {
      q: 'Can I teach both online and offline students?',
      a: 'Absolutely! You can select both Online and Offline as your teaching modes in Step 2. This lets you reach students in your local area as well as learners across the country.',
    },
    {
      q: 'How do I set my fees and availability?',
      a: 'In Step 2, use the Fees field to enter your rate and choose between Per Hour, Per Month, or Per Subject billing. You can add multiple time slots for different days and hours to accurately reflect your availability.',
    },
  ];

  toggle(i: number): void {
    this.openIndex = this.openIndex === i ? null : i;
  }
}