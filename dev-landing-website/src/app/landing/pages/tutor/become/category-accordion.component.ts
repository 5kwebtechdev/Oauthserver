import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectComponent } from './multi-select.component';
import { GroupedMultiSelectComponent, OptionGroup } from './grouped-multi-select.component';

export type CategoryId = 'school' | 'college' | 'languages' | 'hobbies' | 'exams' | 'sports' | 'others';
export type CategoryData = Record<string, string[] | string>;

export interface CategoryField {
  id: string;
  label: string;
  required: boolean;
  placeholder: string;
  options: string[];
  groups?: OptionGroup[];
  type: 'multiselect' | 'grouped-multiselect' | 'text';
}

export const ALL_CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'school', label: 'School' },
  { id: 'college', label: 'College' },
  { id: 'languages', label: 'Languages' },
  { id: 'hobbies', label: 'Hobbies' },
  { id: 'exams', label: 'Exams' },
  { id: 'sports', label: 'Sports' },
  { id: 'others', label: 'Others' },
];

export const CATEGORY_FIELDS: Record<CategoryId, CategoryField[]> = {
  school: [
    {
      id: 'board', label: 'Board', required: true, type: 'multiselect', placeholder: 'Select Boards',
      options: ['CBSE', 'ICSE', 'IB', 'State Board', 'IGCSE', 'NIOS'],
    },
    {
      id: 'class', label: 'Class', required: true, type: 'multiselect', placeholder: 'Select Classes',
      options: [
        'Nursery & KG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
        'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12',
      ],
    },
    {
      id: 'subjects', label: 'Subjects', required: true, type: 'multiselect', placeholder: 'Select Subjects',
      options: [
        'Mathematics', 'Science', 'English', 'Physics', 'Chemistry', 'Biology', 'Hindi',
        'Social Studies', 'Accountancy', 'Economics', 'Business Studies', 'Computer Science',
        'Sanskrit', 'Environmental Studies (EVS)', 'Commerce',
        'History', 'Political Science', 'Geography', 'French', 'Spoken English',
      ],
    },
  ],
  college: [
    {
      id: 'degreeStream', label: 'Degree/Stream', required: true, type: 'multiselect', placeholder: 'Select Degree/Stream',
      options: [
        'Engineering (B.E / B.Tech / M.Tech)', 'Medical (MBBS / BDS / BAMS / BHMS)', 'Commerce (B.Com / M.Com)',
        'Management (BBA / MBA)', 'Science (B.Sc / M.Sc)', 'Arts & Humanities (BA / MA)', 'Law (LLB / LLM)',
        'Chartered Courses (CA / CS / CMA)', 'Computer Applications (BCA / MCA)', 'Pharmacy & Nursing (B.Pharm / B.Sc Nursing)',
      ],
    },
    {
      id: 'year', label: 'Year', required: true, type: 'multiselect', placeholder: 'Select Year',
      options: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
    },
  ],
  languages: [
    {
      id: 'languages', label: 'Languages', required: true, type: 'multiselect', placeholder: 'Select Languages',
      options: [
        'English', 'French', 'German', 'Spanish', 'Hindi', 'Sanskrit', 'Japanese', 'Mandarin (Chinese)', 'Korean',
        'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Kannada', 'Malayalam', 'Punjabi', 'Gujarati', 'Arabic', 'Russian',
        'IELTS / TOEFL Prep',
      ],
    },
    {
      id: 'proficiency', label: 'Level / Proficiency', required: true, type: 'multiselect', placeholder: 'Select Level / Proficiency',
      options: ['Beginner', 'Intermediate', 'Advanced', 'Professional / Business'],
    },
  ],
  hobbies: [
    {
      id: 'skill', label: 'Skill', required: true, type: 'grouped-multiselect', placeholder: 'Select Skills',
      options: [],
      groups: [
        { group: 'Musical Instruments', items: ['Guitar (Acoustic/Electric)', 'Piano', 'Violin', 'Drums', 'Flute'] },
        { group: 'Vocal Music', items: ['Indian Classical', 'Western Vocals', 'Bollywood'] },
        { group: 'Dance', items: ['Bharatanatyam', 'Bollywood', 'Hip Hop', 'Salsa'] },
        { group: 'Art & Craft', items: ['Drawing & Sketching', 'Painting', 'Calligraphy'] },
        { group: 'Lifestyle & Others', items: ['Yoga & Meditation', 'Chess', 'Cooking', 'Baking', 'Photography'] },
      ],
    },
    {
      id: 'proficiency', label: 'Level / Proficiency', required: true, type: 'multiselect', placeholder: 'Select Level / Proficiency',
      options: ['Beginner', 'Intermediate', 'Advanced', 'Certification / Grade Exams'],
    },
    {
      id: 'ageGroup', label: 'Age Group', required: true, type: 'multiselect', placeholder: 'Select Age Group',
      options: ['Kids (Below 13)', 'Teens (13-18)', 'Adults'],
    },
  ],
  exams: [
    {
      id: 'targetExams', label: 'Target Exams', required: true, type: 'multiselect', placeholder: 'Select Target Exams',
      options: [
        'JEE Mains / Advanced (IIT)', 'NEET (Medical)', 'GATE (Graduate Engineering)', 'CET / State Entrances',
        'UPSC (Civil Services / IAS)', 'SSC (CGL / CHSL / MTS)', 'Banking (IBPS / SBI / RBI)', 'Railways (RRB)',
        'Defence (NDA / CDS / AFCAT)', 'Teaching (CTET / NET)', 'CAT (IIMs)', 'GMAT (Study Abroad MBA)',
        'XAT / SNAP / NMAT', 'IPMAT (Integrated BBA+MBA)', 'IELTS / TOEFL / PTE (English)', 'GRE (MS in US/Europe)',
        'SAT (Undergrad Abroad)', 'CLAT (Law)', 'CA / CS / CMA (Foundation & Inter)',
      ],
    },
  ],
  sports: [
    {
      id: 'activities', label: 'Activities', required: true, type: 'multiselect', placeholder: 'Select Activities',
      options: [
        'Cricket', 'Badminton', 'Football', 'Swimming', 'Pickleball', 'Tennis', 'Table Tennis', 'Basketball',
        'Martial Arts', 'Skating', 'Athletics', 'Volleyball', 'Personal Training / Fitness',
      ],
    },
    {
      id: 'ageGroup', label: 'Age Group', required: true, type: 'multiselect', placeholder: 'Select Age Group',
      options: ['Kids (Below 13)', 'Teens (13-18)', 'Adults'],
    },
  ],
  others: [
    {
      id: 'skill', label: 'Skill', required: true, type: 'multiselect', placeholder: 'Select Skills',
      options: [
        'Artificial Intelligence (AI) & Machine Learning', 'Generative AI Tools', 'Data Science & Analytics',
        'Digital Marketing', 'Stock Market & Trading', 'Web & App Development', 'Graphic Design', 'Video Editing',
        'Fashion Designing & Tailoring', 'Makeup & Hairstyling', 'Interior Design', 'Photography',
      ],
    },
    {
      id: 'level', label: 'Level', required: true, type: 'multiselect', placeholder: 'Select Level',
      options: ['Beginner', 'Intermediate', 'Advanced'],
    },
  ],
};

export function isCategoryComplete(id: CategoryId, data: CategoryData): boolean {
  return CATEGORY_FIELDS[id].every((f) => {
    if (!f.required) return true;
    const val = data[f.id];
    if (f.type === 'multiselect' || f.type === 'grouped-multiselect') {
      return Array.isArray(val) && val.length > 0;
    }
    return typeof val === 'string' && val.trim().length > 0;
  });
}

@Component({
  selector: 'app-category-accordion',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectComponent, GroupedMultiSelectComponent],
  template: `
    <div class="rounded-[6px] bg-white shadow-[0px_0px_2px_2px_rgba(107,101,106,0.1)]">
      <button
        type="button"
        (click)="open = !open"
        class="w-full flex items-center justify-between px-4 py-4 rounded-t-[6px] hover:bg-[rgba(40,37,39,0.02)] transition-colors"
      >
        <span class="text-[16px] font-semibold text-[#282527]" style="font-family:'Nunito',sans-serif">{{ label }}</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          class="opacity-70 text-[#282527] transition-transform duration-200"
          [class.rotate-180]="open">
          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div *ngIf="open" class="px-4 pb-6 border-t border-[rgba(40,37,39,0.08)] rounded-b-[6px]">
        <div class="pt-4 flex flex-col gap-6">
          <div *ngFor="let field of config" class="flex flex-col gap-3">
            <span class="text-[16px] font-semibold text-[#6b656a] tracking-[0.8px]" style="font-family:'Nunito',sans-serif">
              {{ field.label }}{{ field.required ? ' *' : '' }}
            </span>

            <app-grouped-multi-select
              *ngIf="field.type === 'grouped-multiselect' && field.groups"
              [groups]="field.groups"
              [selected]="asArray(data[field.id])"
              [placeholder]="field.placeholder"
              (selectedChange)="updateField(field.id, $event)"
            ></app-grouped-multi-select>

            <app-multi-select
              *ngIf="field.type === 'multiselect'"
              [options]="field.options"
              [selected]="asArray(data[field.id])"
              [placeholder]="field.placeholder"
              (selectedChange)="updateField(field.id, $event)"
            ></app-multi-select>

            <input
              *ngIf="field.type === 'text'"
              type="text"
              [ngModel]="asString(data[field.id])"
              (ngModelChange)="updateField(field.id, $event)"
              [placeholder]="field.placeholder"
              class="h-12 w-full px-4 rounded-[6px] border border-[rgba(40,37,39,0.2)] focus:border-[#90214d] text-[16px] font-semibold text-[#282527] placeholder:text-[rgba(40,37,39,0.5)] placeholder:font-semibold outline-none bg-white transition-colors"
              style="font-family:'Nunito',sans-serif"
              name="cat-{{ categoryId }}-{{ field.id }}"
            />
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CategoryAccordionComponent implements OnChanges {
  @Input() categoryId!: CategoryId;
  @Input() data: CategoryData = {};
  @Input() initialOpen = false;
  @Output() dataChange = new EventEmitter<CategoryData>();

  open = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialOpen']) {
      this.open = this.initialOpen;
    }
  }

  get config(): CategoryField[] {
    return CATEGORY_FIELDS[this.categoryId];
  }

  get label(): string {
    return ALL_CATEGORIES.find((c) => c.id === this.categoryId)!.label;
  }

  asArray(val: string[] | string | undefined): string[] {
    return Array.isArray(val) ? val : [];
  }

  asString(val: string[] | string | undefined): string {
    return typeof val === 'string' ? val : '';
  }

  updateField(fieldId: string, value: string[] | string): void {
    this.dataChange.emit({ ...this.data, [fieldId]: value });
  }
}
