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
    isHeader?: boolean;
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

/**
 * Tutor API Response Models - Based on /v1/tutors endpoint
 */

export interface CategoryMapping {
    id: number;
    tutorId: number;
    categoryId: number;
    selectedFieldOptions: string | Record<string, unknown> | null;
    expertiseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    yearsOfExperience: number;
    isAcceptingStudents: boolean;
    maxStudentsPerBatch: number;
    currentStudents: number;
    categoryHourlyRate: number;
    categoryBatchRate: number;
    description: string;
    studentCount: number;
    categoryRating: number | null;
    totalReviews: number;
    lastClassTaught: string | null;
    classesCompleted: number;
    coursesCompleted: number;
    createdAt: string;
    updatedAt: string;
}

export interface TutorLike {
    id: number;
    tutorId: number;
    userId: number;
    createdAt: string;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type Experience = 'FRESHER' | 'PLUS_1' | 'PLUS_2' | 'PLUS_3' | 'PLUS_5' | 'PLUS_10';
export type EntityType = 'SELF' | 'SCHOOL' | 'TUITION' | 'COLLEGE' | 'COACHING' | 'ACADEMY';
export type FeeType = 'PER_HOUR' | 'PER_MONTH' | 'PER_SESSION' | 'PER_COURSE' | 'PER_SUBJECT';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type ContactMode = 'VIDEO_CALL' | 'IN_PERSON' | 'PHONE_CALL' | 'CHAT' | 'HYBRID';

export interface Tutor {
    id: number;
    name: string;
    age: number;
    phone: string;
    email: string;
    gender: Gender;
    qualification: string;
    experience: Experience;
    entityType: EntityType;
    entityName: string;
    subjects: string[];
    location: string;
    addressLine?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    profilePicUrl: string;
    startTime: string;
    endTime: string;
    feeType: FeeType | null;
    fees: number | null;
    levels: string[];
    documentsVerificationUrl: string;
    hourlyRate: number;
    availability: DayOfWeek[];
    contactModes: ContactMode[];
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    isVerified: boolean;
    verificationNotes: string | null;
    adminNotes: string | null;
    lastLoginAt: string | null;
    totalStudents: number;
    rating: number | null;
    totalReviews: number;
    likes: TutorLike[];
    likedByUser?: boolean;
    categoryMappings: CategoryMapping[];
    active: boolean;
    verified: boolean;
    validForVerification: boolean;
    categoryIds: number[];
    champsLiked: number;
}

/**
 * Simplified Tutor interface for list display
 */
export interface TutorListItem {
    id: number;
    name: string;
    avatar: string;
    description: string;
    rating: number;
    champsLiked?: number;
    likedByUser?: boolean;
    experience: string;
    qualification: string;
    hourlyRate: number;
    feeLabel?: string;
    location: string;
    subjects: string[];
    levels: string[];
    availability: string[];
    startTime: string;
    endTime: string;
    contactModes: string[];
    createdAt: string;
    totalStudents: number;
}

/**
 * Filter options for tutor search
 */
export interface TutorFilters {
    search?: string;
    subjects?: string[];
    levels?: string[];
    minRate?: number;
    maxRate?: number;
    availability?: DayOfWeek[];
    contactModes?: ContactMode[];
    location?: string;
    experience?: Experience;
}

/**
 * Sort options for tutor list
 */
export type TutorSortOption = 'alphabets' | 'mostLiked' | 'experience' | 'recent';

/**
 * Helper function to convert API Tutor to TutorListItem
 */
export function toTutorListItem(tutor: Tutor): TutorListItem {
    // Prefer the direct numeric yearsOfExperience the admin entered per mapping;
    // fall back to the top-level experience enum only when none is set.
    const maxYearsFromMappings = (tutor.categoryMappings || [])
        .reduce((max, m) => Math.max(max, m.yearsOfExperience || 0), 0);

    let experienceStr: string;
    if (maxYearsFromMappings > 0) {
        experienceStr = `${maxYearsFromMappings}+ years Exp`;
    } else if (tutor.experience && tutor.experience !== 'FRESHER') {
        experienceStr = formatExperience(tutor.experience);
    } else {
        experienceStr = 'Fresher';
    }

    return {
        id: tutor.id,
        name: tutor.name,
        avatar: tutor.profilePicUrl || 'assets/Images-Transparent/Image-Tutor.png',
        description: tutor.subjects?.length > 0
            ? tutor.subjects.join(', ')
            : `${tutor.qualification} Specialist`,
        champsLiked: tutor.champsLiked || 0,
        likedByUser: !!tutor.likedByUser,
        rating: tutor.champsLiked || tutor.likes?.length || 0,
        experience: experienceStr,
        qualification: tutor.qualification,
        hourlyRate: tutor.hourlyRate || tutor.fees || 0,
        location: tutor.location,
        subjects: tutor.subjects || [],
        levels: tutor.levels || [],
        availability: tutor.availability || [],
        startTime: tutor.startTime,
        endTime: tutor.endTime,
        contactModes: tutor.contactModes || [],
        createdAt: tutor.createdAt,
        totalStudents: tutor.totalStudents || 0
    };
}

/**
 * Helper function to format experience
 */
export function formatExperience(exp: Experience | string): string {
    const expMap: Record<string, string> = {
        'FRESHER': 'Fresher',
        'PLUS_1': '1+ years Exp',
        'PLUS_2': '2+ years Exp',
        'PLUS_3': '3+ years Exp',
        'PLUS_5': '5+ years Exp',
        'PLUS_10': '10+ years Exp'
    };
    if (expMap[exp]) return expMap[exp];

    // Academy-style range enums, e.g. RANGE_1_3 -> "1-3 years Exp", RANGE_10_PLUS -> "10+ years Exp"
    if (typeof exp === 'string' && exp.startsWith('RANGE_')) {
        const parts = exp.replace('RANGE_', '').split('_');
        if (parts.length === 2) {
            const [from, to] = parts;
            return /plus/i.test(to) ? `${from}+ years Exp` : `${from}-${to} years Exp`;
        }
    }

    return exp;
}

/**
 * Helper function to format availability days
 */
export function formatAvailability(days: DayOfWeek[] | string[]): string {
    const dayMap: Record<string, string> = {
        'MONDAY': 'Mon',
        'TUESDAY': 'Tue',
        'WEDNESDAY': 'Wed',
        'THURSDAY': 'Thu',
        'FRIDAY': 'Fri',
        'SATURDAY': 'Sat',
        'SUNDAY': 'Sun'
    };
    return days.map(d => dayMap[d] || d).join(', ');
}

/**
 * Helper function to format time from ISO string
 */
export function formatTime(isoTime: string): string {
    if (!isoTime) return '';
    try {
        const date = new Date(isoTime);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return '';
    }
}

/**
 * Helper function to get experience years as number
 */
export function getExperienceYears(exp: Experience | string): number {
    const expMap: Record<string, number> = {
        'FRESHER': 0,
        'PLUS_1': 1,
        'PLUS_2': 2,
        'PLUS_3': 3,
        'PLUS_5': 5,
        'PLUS_10': 10
    };
    if (expMap[exp] !== undefined) return expMap[exp];

    // Academy-style range enums, e.g. RANGE_1_3 -> 3, RANGE_10_PLUS -> 10
    if (typeof exp === 'string' && exp.startsWith('RANGE_')) {
        const parts = exp.replace('RANGE_', '').split('_');
        if (parts.length === 2) {
            const from = parseInt(parts[0], 10) || 0;
            const to = parseInt(parts[1], 10);
            return isNaN(to) ? from : to;
        }
    }

    return 0;
}

/**
 * Helper function to format levels for display
 */
export function formatLevels(levels: string[]): string {
    if (!levels || levels.length === 0) return '';
    return levels.map(l => {
        // Convert GRADE_10 to Class 10, etc.
        if (l.startsWith('GRADE_')) {
            return `Class ${l.replace('GRADE_', '')}`;
        }
        if (l.startsWith('CLASS_')) {
            return `Class ${l.replace('CLASS_', '')}`;
        }
        // Convert underscores and capitalize
        return l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }).join(', ');
}

/**
 * Helper function to format contact modes
 */
export function formatContactModes(modes: ContactMode[] | string[]): string {
    const modeMap: Record<string, string> = {
        'VIDEO_CALL': 'Online',
        'IN_PERSON': 'Offline',
        'PHONE_CALL': 'Phone',
        'CHAT': 'Chat',
        'HYBRID': 'Hybrid'
    };
    return modes.map(m => modeMap[m] || m).join(', ');
}
