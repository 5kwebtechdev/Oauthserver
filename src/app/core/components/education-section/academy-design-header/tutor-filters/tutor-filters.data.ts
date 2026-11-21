import type { SelectedFilters } from '../../../../models/tutor.model';

/**
 * Filter tree from "EduHub_Phase 1.5 - Tutor & Academy Sub-Categories".
 * Hobbies follows Figma instead (SuperMeapp › Hobbies section, node 21877:44824).
 * Sort and Mode are common to every category; location lives in the header's city chip.
 * The UI is generated entirely from this data: edit it to add, rename or remove a category,
 * a field or an option. No template changes needed.
 */

export interface TutorFilterGroup {
  /** Heading above the options; omitted when a field has one flat list. */
  label?: string;
  options: string[];
}

export interface TutorFilterField {
  id: string;
  label: string;
  groups: TutorFilterGroup[];
  /** One choice only (radio) instead of the default multi-select. */
  single?: boolean;
}

export interface TutorFilterCategory {
  id: string;
  label: string;
  fields: TutorFilterField[];
}

/** What the filters currently hold: one category, and the ticked option values per field. */
export interface TutorFilterState {
  category: string | null;
  selections: Record<string, string[]>;
}

/** Same word can sit in two groups (Bollywood: vocal and dance), so values carry their group. */
export function optionValue(group: TutorFilterGroup, option: string): string {
  return group.label ? `${group.label}: ${option}` : option;
}

const field = (id: string, label: string, options: string[]): TutorFilterField => ({
  id,
  label,
  groups: [{ options }],
});

export const SORT_FIELD_ID = 'sort';
export const SORT_LOW_TO_HIGH = 'Price: Low to High';
export const SORT_HIGH_TO_LOW = 'Price: High to Low';

/** Shown for every category, and before one is picked. Kept when the category changes. */
export const COMMON_FILTER_FIELDS: TutorFilterField[] = [
  { ...field(SORT_FIELD_ID, 'Sort', [SORT_LOW_TO_HIGH, SORT_HIGH_TO_LOW]), single: true },
  field('mode', 'Mode', ['Online', 'Offline']),
];

const AGE_GROUP = ['Kids (<13)', 'Teens (13–18)', 'Adults'];

export const TUTOR_FILTER_CATEGORIES: TutorFilterCategory[] = [
  {
    id: 'school',
    label: 'School',
    fields: [
      field('class', 'Class', ['Nursery & KG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)]),
      field('subjects', 'Subjects', [
        'Mathematics',
        'Science',
        'English',
        'Physics',
        'Chemistry',
        'Biology',
        'Hindi',
        'Social Studies',
        'Accountancy',
        'Economics',
        'Business Studies',
        'Computer Science',
        'Sanskrit',
        'EVS',
        'Commerce',
        'History',
        'Political Science',
      ]),
      field('board', 'Board', ['CBSE', 'ICSE', 'IB', 'State Board', 'IGCSE', 'NIOS']),
    ],
  },
  {
    id: 'college',
    label: 'College',
    fields: [
      field('degree', 'Degree / Stream', [
        'Engineering',
        'Medical',
        'Commerce',
        'Management',
        'Science',
        'Arts & Humanities',
        'Law',
        'Chartered Courses',
        'Computer Applications',
        'Pharmacy & Nursing',
      ]),
      field('year', 'Year', ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']),
    ],
  },
  {
    id: 'languages',
    label: 'Languages',
    fields: [
      field('languages', 'Language(s)', [
        'English',
        'French',
        'German',
        'Spanish',
        'Hindi',
        'Sanskrit',
        'Japanese',
        'Mandarin',
        'Korean',
        'Tamil',
        'Telugu',
        'Marathi',
        'Bengali',
        'Kannada',
        'Malayalam',
        'Punjabi',
        'Gujarati',
        'Arabic',
        'Russian',
        'IELTS/TOEFL Prep',
      ]),
      field('level', 'Level', ['Beginner', 'Intermediate', 'Advanced', 'Professional/Business']),
    ],
  },
  {
    id: 'hobbies',
    label: 'Hobbies',
    fields: [
      {
        id: 'skill',
        label: 'Skill',
        groups: [
          {
            label: 'Musical Instruments',
            options: ['Guitar (Acoustic/Electric)', 'Piano', 'Violin', 'Drums', 'Flute'],
          },
          { label: 'Vocal Music', options: ['Indian Classical', 'Western Vocals', 'Bollywood'] },
          { label: 'Dance', options: ['Bharatanatyam', 'Bollywood', 'Hip Hop', 'Salsa'] },
          { label: 'Art & Craft', options: ['Drawing & Sketching', 'Painting', 'Calligraphy'] },
          { label: 'Lifestyle & Others', options: ['Yoga & Meditation', 'Chess', 'Cooking', 'Baking', 'Photography'] },
        ],
      },
      field('level', 'Level / Proficiency', ['Beginner', 'Intermediate', 'Advanced', 'Certification / Grade Exams']),
      field('age', 'Age Group', ['Kids (Below 13)', 'Teens (13-18)', 'Adults']),
    ],
  },
  {
    id: 'exams',
    label: 'Exams',
    fields: [
      field('exam', 'Target Exam', [
        'JEE',
        'NEET',
        'GATE',
        'CET',
        'UPSC',
        'SSC',
        'Banking',
        'Railways',
        'Defence',
        'Teaching',
        'CAT',
        'GMAT',
        'XAT',
        'IPMAT',
        'IELTS/TOEFL',
        'GRE',
        'SAT',
        'CLAT',
        'CA/CS/CMA',
      ]),
    ],
  },
  {
    id: 'sports',
    label: 'Sports',
    fields: [
      field('activities', 'Activities', [
        'Cricket',
        'Badminton',
        'Football',
        'Swimming',
        'Pickleball',
        'Tennis',
        'Table Tennis',
        'Basketball',
        'Martial Arts',
        'Skating',
        'Athletics',
        'Volleyball',
        'Personal Training',
      ]),
      field('age', 'Age Group', AGE_GROUP),
    ],
  },
  {
    id: 'others',
    label: 'Others',
    fields: [
      field('skill', 'Skill', [
        'AI & ML',
        'Gen AI',
        'Data Science',
        'Digital Marketing',
        'Stock Market',
        'Web/App Dev',
        'Graphic Design',
        'Video Editing',
        'Fashion',
        'Makeup',
        'Interior Design',
        'Photography',
      ]),
      field('level', 'Level', ['Beginner', 'Intermediate', 'Advanced']),
    ],
  },
];

const API_FIELD_KEYS: Record<string, string> = {
  age: 'ageGroup',
  degree: 'degreeStream',
  exam: 'targetExam',
};

const API_OPTION_KEYS: Record<string, string> = {
  'Nursery & KG': 'NURSERY_KG',
  'IELTS/TOEFL Prep': 'IELTS_TOEFL',
  'Musical Instruments: Guitar (Acoustic/Electric)': 'GUITAR',
  'Vocal Music: Bollywood': 'BOLLYWOOD_VOCAL',
  'Dance: Bollywood': 'BOLLYWOOD_DANCE',
  'Certification / Grade Exams': 'CERTIFICATION',
  'Kids (<13)': 'KIDS',
  'Kids (Below 13)': 'KIDS',
  'Teens (13–18)': 'TEENS',
  'Teens (13-18)': 'TEENS',
  'Gen AI': 'GEN_AI',
};

export function toDirectoryFilters(state: TutorFilterState): SelectedFilters | null {
  if (!state.category) return null;

  const filters: SelectedFilters['filters'] = {};
  for (const [key, values] of Object.entries(state.selections)) {
    // Price and teaching mode can be applied to the directory results directly,
    // including when the user has not selected a category.
    if (key === SORT_FIELD_ID || key === 'mode' || !values.length) continue;

    filters[API_FIELD_KEYS[key] ?? key] = values.map(value => {
      const label = value.split(': ').pop() ?? value;
      return API_OPTION_KEYS[value] ?? label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/_$/, '');
    });
  }
  return { categoryKey: state.category.toUpperCase(), filters };
}
