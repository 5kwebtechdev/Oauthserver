import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomSelectComponent } from './custom-select.component';
import { MultiSelectComponent } from './multi-select.component';
import { TimeSlotRowComponent, TimeSlot } from './time-slot-row.component';
import {
  CategoryAccordionComponent,
  ALL_CATEGORIES,
  CategoryId,
  CategoryData,
  isCategoryComplete,
} from './category-accordion.component';

const TEACHING_MODES = ['Online', 'Offline'];
const FEE_TYPES = ['Per Hour', 'Per Month', 'Per Subject'];
const EXPERIENCE_OPTIONS = ['1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'];
const LANGUAGES_SPOKEN = ['English', 'Hindi', 'Tamil', 'Telugu', 'Marathi'];

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function toMinutes(t: string): number {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const ALL_DAYS_LABEL = 'All days';
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function expandDays(days: string[]): string[] {
  if (days.includes(ALL_DAYS_LABEL)) return DAYS_OF_WEEK;
  return days;
}

function computeSlotErrors(slots: TimeSlot[]): string[] {
  return slots.map((slot, i) => {
    const { startTime, endTime, days } = slot;

    if (startTime && endTime) {
      if (toMinutes(endTime) <= toMinutes(startTime)) {
        return 'End time must be later than start time';
      }
    }

    for (let j = 0; j < i; j++) {
      const other = slots[j];
      if (!other.startTime || !other.endTime || !startTime || !endTime) continue;

      const timesOverlap =
        toMinutes(startTime) < toMinutes(other.endTime) && toMinutes(other.startTime) < toMinutes(endTime);
      const daysOverlap = expandDays(days).some((d) => expandDays(other.days).includes(d));

      if (timesOverlap && daysOverlap) {
        return 'This slot overlaps with an existing slot';
      }
    }

    return '';
  });
}

function isSlotFilled(slot: TimeSlot): boolean {
  return Boolean(slot.startTime && slot.endTime && slot.days.length > 0);
}

export interface Step2Data {
  teachingMode: string[];
  fees: string;
  feeType: string;
  address: string;
  languagesSpoken: string[];
  experience: string;
  qualification: string;
  slots: TimeSlot[];
  categories: CategoryId[];
  categoryData: Record<CategoryId, CategoryData>;
}

function defaultStep2(): Step2Data {
  return {
    teachingMode: [],
    fees: '',
    feeType: 'Per Hour',
    address: '',
    languagesSpoken: [],
    experience: '',
    qualification: '',
    slots: [{ id: generateId(), startTime: '', endTime: '', days: [] }],
    categories: [],
    categoryData: {
      school: {}, college: {}, languages: {}, hobbies: {}, exams: {}, sports: {}, others: {},
    },
  };
}

@Component({
  selector: 'app-tutor-step-two',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CustomSelectComponent,
    MultiSelectComponent,
    TimeSlotRowComponent,
    CategoryAccordionComponent,
  ],
  templateUrl: './step-two.component.html',
})
export class StepTwoComponent implements OnChanges {
  @Input() initialData: Step2Data | null = null;
  @Input() entityType?: string;
  @Output() next = new EventEmitter<Step2Data>();
  @Output() back = new EventEmitter<void>();

  readonly teachingModes = TEACHING_MODES;
  readonly feeTypes = FEE_TYPES;
  readonly experienceOptions = EXPERIENCE_OPTIONS;
  readonly languagesSpokenOptions = LANGUAGES_SPOKEN;
  readonly allCategories = ALL_CATEGORIES;

  form: Step2Data = defaultStep2();
  submitted = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && this.initialData) {
      this.form = { ...this.initialData };
    }
  }

  get isAcademy(): boolean {
    return this.entityType === 'Academy';
  }

  get slotErrors(): string[] {
    return computeSlotErrors(this.form.slots);
  }

  get firstSlotReady(): boolean {
    return isSlotFilled(this.form.slots[0]) && this.slotErrors[0] === '';
  }

  get hasSlotErrors(): boolean {
    return this.slotErrors.some(Boolean);
  }

  get allCategoriesComplete(): boolean {
    return this.form.categories.every((id) => isCategoryComplete(id, this.form.categoryData[id]));
  }

  get isValid(): boolean {
    return (
      this.form.teachingMode.length > 0 &&
      this.form.categories.length > 0 &&
      this.allCategoriesComplete &&
      !this.hasSlotErrors
    );
  }

  get categoryLabels(): string[] {
    return ALL_CATEGORIES.map((c) => c.label);
  }

  get selectedCategoryLabels(): string[] {
    return this.form.categories.map((id) => ALL_CATEGORIES.find((c) => c.id === id)!.label);
  }

  handleCategoryChange(labels: string[]): void {
    const ids = labels.map((l) => ALL_CATEGORIES.find((c) => c.label === l)!.id);
    this.form = { ...this.form, categories: ids };
  }

  updateCategoryData(id: CategoryId, data: CategoryData): void {
    this.form = { ...this.form, categoryData: { ...this.form.categoryData, [id]: data } };
  }

  addSlot(): void {
    this.form = {
      ...this.form,
      slots: [...this.form.slots, { id: generateId(), startTime: '', endTime: '', days: [] }],
    };
  }

  removeSlot(id: string): void {
    this.form = { ...this.form, slots: this.form.slots.filter((s) => s.id !== id) };
  }

  updateSlot(updated: TimeSlot): void {
    this.form = {
      ...this.form,
      slots: this.form.slots.map((s) => (s.id === updated.id ? updated : s)),
    };
  }

  handleNext(): void {
    this.submitted = true;
    if (this.isValid) this.next.emit(this.form);
  }

  handleBack(): void {
    this.back.emit();
  }
}