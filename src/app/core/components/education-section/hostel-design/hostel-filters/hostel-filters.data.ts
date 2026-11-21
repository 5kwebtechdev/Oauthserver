/**
 * PG and hostel filters: the Sort used across EduHub, then Suitable for, Type, Room occupancy and Amenities.
 * The UI is generated from this data: edit it to add, rename or remove a field or an option.
 */

export interface HostelFilterField {
  id: string;
  label: string;
  options: string[];
  /** One choice only (radio) instead of the default multi-select. */
  single?: boolean;
}

/** What the filters currently hold: the ticked option values per field. */
export interface HostelFilterState {
  selections: Record<string, string[]>;
}

export const SUITABLE_FIELD_ID = 'suitable';
export const TYPE_FIELD_ID = 'type';
export const OCCUPANCY_FIELD_ID = 'occupancy';
export const AMENITIES_FIELD_ID = 'amenities';
export const SORT_FIELD_ID = 'sort';
export const SORT_LOW_TO_HIGH = 'Price: Low to High';
export const SORT_HIGH_TO_LOW = 'Price: High to Low';

/** Tabs in the filter sheet and dropdown chips in the filter bar, in this order. */
export const HOSTEL_FILTER_FIELDS: HostelFilterField[] = [
  { id: SORT_FIELD_ID, label: 'Sort', options: [SORT_LOW_TO_HIGH, SORT_HIGH_TO_LOW], single: true },
  { id: SUITABLE_FIELD_ID, label: 'Suitable for', options: ['Boys', 'Girls', 'Coed'] },
  { id: TYPE_FIELD_ID, label: 'Type', options: ['PG', 'Hostel'] },
  { id: OCCUPANCY_FIELD_ID, label: 'Room occupancy', options: ['Single', 'Double', 'Triple'] },
  {
    id: AMENITIES_FIELD_ID,
    label: 'Amenities',
    options: [
      'Wi-Fi',
      'AC',
      'Power backup',
      'Washing machine',
      'Laundry',
      'CCTV',
      'Parking',
      'Housekeeping',
      'Attached bathroom',
      'Geyser',
      'Study table',
      'Wardrobe',
    ],
  },
];
