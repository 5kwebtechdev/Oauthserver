/**
 * Tutor Categories API Response Models
 * Based on {{host}}/v1/tutors/categories endpoint
 */

export interface TutorCategoryOption {
    id: number;
    optionValue: string;
    optionLabel: string;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
}

export interface TutorCategoryField {
    id: number;
    fieldType: 'MULTI_SELECT' | 'SINGLE_SELECT' | 'TEXT' | 'NUMBER';
    fieldKey: string;
    fieldLabel: string;
    isRequired: boolean;
    isFilterable: boolean;
    displayOrder: number;
    validationRules: any | null;
    createdAt: string;
    options: TutorCategoryOption[];
}

export interface TutorCategory {
    id: number;
    categoryName: string;
    categoryKey: string;
    description: string;
    iconUrl: string | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
    fields: TutorCategoryField[];
}

export type TutorCategoriesResponse = TutorCategory[];

/**
 * Internal UI models for filter display
 */
export interface FilterGroup {
    label: string;
    fieldKey: string;
    items: FilterOption[];
    isRequired: boolean;
    isFilterable: boolean;
}

export interface FilterOption {
    id: number;
    value: string;
    label: string;
    displayOrder: number;
}

/**
 * Selected filter state for API submission
 */
export interface SelectedFilters {
    categoryKey: string;
    filters: {
        [fieldKey: string]: string[];
    };
}
