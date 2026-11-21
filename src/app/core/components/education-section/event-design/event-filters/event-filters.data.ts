import { DatePreset, DateRange } from './event-dates';

/**
 * Event and workshop filters: Sort, Mode and Date.
 * The UI is generated from this data: edit it to add, rename or remove a field or an option.
 */

export interface EventFilterField {
  id: string;
  label: string;
  options: string[];
  /** One choice only (radio) instead of the default multi-select. */
  single?: boolean;
  /** Shows the date calendar instead of a list of options. */
  calendar?: boolean;
}

/** What the filters currently hold: the ticked option values per field, and the chosen dates. */
export interface EventFilterState {
  selections: Record<string, string[]>;
  dateRange: DateRange | null;
}

export const SORT_FIELD_ID = 'sort';
export const DATE_FIELD_ID = 'date';
export const SORT_LOW_TO_HIGH = 'Price: Low to High';
export const SORT_HIGH_TO_LOW = 'Price: High to Low';

const SORT_FIELD: EventFilterField = {
  id: SORT_FIELD_ID,
  label: 'Sort',
  options: [SORT_LOW_TO_HIGH, SORT_HIGH_TO_LOW],
  single: true,
};

const MODE_FIELD: EventFilterField = { id: 'mode', label: 'Mode', options: ['Online', 'Offline'] };

const DATE_FIELD: EventFilterField = { id: DATE_FIELD_ID, label: 'Date', options: [], calendar: true };

/** Tabs in the filter sheet. */
export const EVENT_FILTER_FIELDS = [SORT_FIELD, MODE_FIELD, DATE_FIELD];

/** Dropdown chips in the filter bar. */
export const BAR_FILTER_FIELDS = [SORT_FIELD, MODE_FIELD];

/** One-tap date chips in the filter bar. */
export const QUICK_DATES: { preset: DatePreset; label: string }[] = [
  { preset: 'today', label: 'Today' },
  { preset: 'tomorrow', label: 'Tomorrow' },
  { preset: 'weekend', label: 'This weekend' },
];
