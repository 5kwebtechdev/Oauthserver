/**
 * Counselor filters: Specialization, plus the Sort and Mode used across EduHub.
 * The UI is generated from this data: edit it to add, rename or remove a field or an option.
 */

export interface CounselorFilterField {
  id: string;
  label: string;
  options: string[];
  /** One choice only (radio) instead of the default multi-select. */
  single?: boolean;
}

/** What the filters currently hold: the ticked option values per field. */
export interface CounselorFilterState {
  selections: Record<string, string[]>;
}

export const SPECIALIZATION_FIELD_ID = 'specialization';
export const SORT_FIELD_ID = 'sort';
export const SORT_LOW_TO_HIGH = 'Price: Low to High';
export const SORT_HIGH_TO_LOW = 'Price: High to Low';

const SPECIALIZATION_FIELD: CounselorFilterField = {
  id: SPECIALIZATION_FIELD_ID,
  label: 'Specialization',
  options: [
    'Mental health',
    'Personality development',
    'Career counseling',
    'College admissions',
    'Childhood development',
  ],
};

const SORT_FIELD: CounselorFilterField = {
  id: SORT_FIELD_ID,
  label: 'Sort',
  options: [SORT_LOW_TO_HIGH, SORT_HIGH_TO_LOW],
  single: true,
};

const MODE_FIELD: CounselorFilterField = { id: 'mode', label: 'Mode', options: ['Online', 'Offline'] };

/** Tabs in the filter sheet. */
export const COUNSELOR_FILTER_FIELDS = [SPECIALIZATION_FIELD, SORT_FIELD, MODE_FIELD];

/** Dropdown chips in the filter bar. */
export const BAR_FILTER_FIELDS = [SORT_FIELD, MODE_FIELD];

/** One-tap chips in the filter bar. Trim or reorder this list to change which ones show. */
export const QUICK_SPECIALIZATIONS = SPECIALIZATION_FIELD.options;
