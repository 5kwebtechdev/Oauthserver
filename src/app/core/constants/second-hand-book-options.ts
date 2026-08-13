/**
 * Shared Second-Hand Books taxonomy.
 *
 * Buyer preferences, seller creation and any future edit/filter screens must
 * read these values rather than introducing their own partial option lists.
 */
export type SecondHandBookType = 'school' | 'college' | 'exam' | 'general';

export interface SecondHandBookDropdownOption {
  key: string;
  value: string;
}

const asDropdownOptions = (values: readonly string[]): SecondHandBookDropdownOption[] =>
  values.map(value => ({ key: value, value }));

export const SECOND_HAND_BOOK_TYPES: ReadonlyArray<{ value: SecondHandBookType; label: string }> = [
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'exam', label: 'Exam Prep' },
  { value: 'general', label: 'General' }
];

export const SCHOOL_CLASS_OPTIONS = asDropdownOptions([
  'Nursery',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12'
]);

export const SCHOOL_BOARD_OPTIONS = asDropdownOptions([
  'CBSE',
  'ICSE',
  'State Board',
  'IB',
  'Other'
]);

export const SCHOOL_SUBJECT_OPTIONS = asDropdownOptions([
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Hindi',
  'History',
  'Geography',
  'Economics',
  'Computer Science'
]);

export const COLLEGE_DEGREE_STREAM_OPTIONS = asDropdownOptions([
  'Engineering (B.Tech / B.E)',
  'Medicine (MBBS / BDS)',
  'Commerce (B.Com / MBA)',
  'Arts / Humanities (BA / MA)',
  'Science (B.Sc / M.Sc)',
  'Law (LLB)',
  'Other'
]);

export const COLLEGE_YEAR_OPTIONS = asDropdownOptions([
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5'
]);

/**
 * Figma explicitly supplies the Engineering mapping. Other streams are kept
 * empty until a real product/API mapping is available instead of showing
 * fabricated subjects.
 */
export const COLLEGE_SUBJECTS_BY_DEGREE: Readonly<Record<string, SecondHandBookDropdownOption[]>> = {
  'Engineering (B.Tech / B.E)': asDropdownOptions([
    'Engineering Mathematics',
    'Data Structures & Algorithms',
    'Electronic Devices & Circuits',
    'Engineering Mechanics',
    'Thermodynamics',
    'Other'
  ])
};

export const EXAM_PREP_TARGET_EXAM_OPTIONS = asDropdownOptions([
  'JEE Main / Advanced',
  'NEET / AIIMS',
  'UPSC Civil Services',
  'CAT / MBA Entrance',
  'GATE',
  'SSC / CGL',
  'Banking (IBPS / SBI)',
  'NDA / Defence',
  'Other'
]);

export const GENERAL_GENRE_OPTIONS = asDropdownOptions([
  'Mystery / thriller',
  'Romance',
  'Science Fiction',
  'Fantasy',
  'Historical Fiction',
  'Classic Literature',
  'Biography / Memoir',
  'Mythology',
  'Horror',
  'Other'
]);

export const GENERAL_LANGUAGE_OPTIONS = asDropdownOptions([
  'English',
  'Hindi',
  'Marathi',
  'Tamil',
  'Telugu',
  'Bengali',
  'Kannada',
  'Other'
]);

export function collegeSubjectsForDegree(degree: string | null | undefined): SecondHandBookDropdownOption[] {
  return degree ? [...(COLLEGE_SUBJECTS_BY_DEGREE[degree] ?? [])] : [];
}

export function dropdownOptions(values: readonly string[]): SecondHandBookDropdownOption[] {
  return asDropdownOptions(values);
}
