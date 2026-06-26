import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { ModalController } from '@ionic/angular';
import { TutorApi } from '../../../api/tutor.api';
import { TutorCategory, TutorCategoryField, TutorCategoryOption, TutorCategoriesResponse, FilterGroup, FilterOption, SelectedFilters } from '../../../models/tutor.model';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { TutorService } from '../../../services/tutor.service';

@Component({
  selector: 'tutor-all-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SupermeNavigatorComponent, SupermeButtonComponent],
  templateUrl: './tutor-all-filter.component.html',
  styleUrls: ['./tutor-all-filter.component.scss']
})
export class TutorAllFilterComponent implements OnInit, AfterViewInit, OnDestroy {
  /** List of available filter labels */
  @Input() filters: string[] = [];

  /** Previously applied filters to pre-populate selections */
  @Input() initialFilters: SelectedFilters | null = null;

  /** Loading state */
  isLoading = false;

  /** Error state */
  errorMessage: string | null = null;

  /** API data */
  private apiCategories: TutorCategory[] = [];

  /** Topbar-slider categories for slider */
  categories: Array<{ key: string; label: string; icon: string }> = [];

  /** Topbar-slider active category */
  selectedCategory: string | null = null;

  /** Sidebar groups generated from selected topbar category */
  sidebarGroups: FilterGroup[] = [];
  selectedSidebar: string | null = null;
  selectedSubFilters: FilterOption[] = [];

  /** Currently checked subfilters mapped by fieldKey */
  selectedFiltersMap: Map<string, Set<string>> = new Map();

  /** Computed number of matching tutors for current selection. null = no interaction yet */
  resultCount: number | null = null;

  /** Mapping of category icons (fallback if API doesn't provide iconUrl) */
  private categoryIconMap: Record<string, string> = {
    SCHOOL: 'assets/Icons-Neutral/Tutors-School.png',
    COLLEGE: 'assets/Icons-Neutral/Tutors-College.png',
    HOBBIES: 'assets/Icons-Neutral/Tutors-Hobbies.png',
    SPORTS: 'assets/Icons-Neutral/Tutors-Sports.png',
    EXAMS: 'assets/Icons-Neutral/Tutors-Exams.png',
    LANGUAGES: 'assets/Icons-Neutral/Tutors-Language.png',
    OTHERS: 'assets/Icons-Neutral/Tutors-Others.png'
  };

  ngOnInit(): void {
    this.loadTutorCategories();
  }

  /**
   * Load tutor categories from API
   */
  private loadTutorCategories(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.tutorApi.getTutorCategories()
      .pipe(finalize(() => {
        this.isLoading = false;
        // Initialize swiper after data loads and view updates
        setTimeout(() => this.initSwiper(), 100);
      }))
      .subscribe({
        next: (categories) => {
          this.apiCategories = categories;
          this.mapCategoriesToUI(categories);

          // Restore previously applied category, or default to first
          const restoreCategory = this.initialFilters?.categoryKey ?? (this.categories.length > 0 ? this.categories[0].key : null);
          if (restoreCategory) {
            this.selectedCategory = restoreCategory;
            this.setSidebarForCategory(restoreCategory);
          }

          // Pre-populate selected filters from initialFilters
          if (this.initialFilters?.filters) {
            Object.entries(this.initialFilters.filters).forEach(([fieldKey, values]) => {
              if (values.length > 0) {
                this.selectedFiltersMap.set(fieldKey, new Set(values));
              }
            });
          }
        },
        error: (error) => {
          console.error('[TutorAllFilter] Error loading categories:', error);
          this.errorMessage = 'Failed to load filter categories. Please try again.';
          // Use fallback data if API fails
          this.useFallbackData();
        }
      });
  }

  /**
   * Map API categories to UI structure
   */
  private mapCategoriesToUI(categories: TutorCategory[]): void {
    this.categories = categories.map(cat => ({
      key: cat.categoryKey,
      label: cat.categoryName,
      icon: cat.iconUrl || this.categoryIconMap[cat.categoryKey] || 'assets/Icons-Neutral/Tutors-Others.png'
    }));
  }

  /**
   * Fallback to hardcoded data (PRD-correct) if API fails.
   * Populates full option lists so all 7 categories are usable offline.
   */
  private useFallbackData(): void {
    this.apiCategories = this.buildFallbackCategories();
    this.mapCategoriesToUI(this.apiCategories);

    const defaultKey = this.initialFilters?.categoryKey ?? (this.categories.length > 0 ? this.categories[0].key : null);
    if (defaultKey) {
      this.selectedCategory = defaultKey;
      this.setSidebarForCategory(defaultKey);
    }

    setTimeout(() => this.initSwiper(), 100);
  }

  /** Returns the full PRD-defined category/filter structure used as offline fallback */
  private buildFallbackCategories(): TutorCategory[] {
    const opt = (id: number, value: string, label: string, order: number): TutorCategoryOption =>
      ({ id, optionValue: value, optionLabel: label, displayOrder: order, isActive: true, createdAt: '' });

    const commonFields = (startOrder: number): TutorCategoryField[] => [
      {
        id: 900, fieldType: 'MULTI_SELECT', fieldKey: 'tutorType', fieldLabel: 'Tutor Type',
        isRequired: false, isFilterable: true, displayOrder: startOrder, validationRules: null, createdAt: '',
        options: [opt(9001, 'INDIVIDUAL', 'Individual Tutor', 1), opt(9002, 'ACADEMY', 'Academy', 2)]
      },
      {
        id: 901, fieldType: 'MULTI_SELECT', fieldKey: 'mode', fieldLabel: 'Mode',
        isRequired: false, isFilterable: true, displayOrder: startOrder + 1, validationRules: null, createdAt: '',
        options: [opt(9011, 'ONLINE', 'Online', 1), opt(9012, 'OFFLINE', 'Offline', 2)]
      },
      {
        id: 902, fieldType: 'MULTI_SELECT', fieldKey: 'location', fieldLabel: 'Location',
        isRequired: false, isFilterable: true, displayOrder: startOrder + 2, validationRules: null, createdAt: '',
        options: [
          opt(9021, 'NEARBY', 'Nearby (5 km radius)', 1),
          opt(9022, 'CHENNAI', 'Chennai', 2),
          opt(9023, 'BANGALORE', 'Bangalore', 3),
          opt(9024, 'MUMBAI', 'Mumbai', 4),
          opt(9025, 'HYDERABAD', 'Hyderabad', 5),
          opt(9026, 'DELHI', 'Delhi', 6),
          opt(9027, 'KOLKATA', 'Kolkata', 7)
        ]
      }
    ];

    const base = (id: number, key: string, name: string, order: number): Omit<TutorCategory, 'fields'> => ({
      id, categoryName: name, categoryKey: key, description: '',
      iconUrl: this.categoryIconMap[key] || null,
      displayOrder: order, isActive: true, createdAt: '', updatedAt: null
    });

    return [
      {
        ...base(1, 'SCHOOL', 'School', 1),
        fields: [
          {
            id: 101, fieldType: 'MULTI_SELECT', fieldKey: 'class', fieldLabel: 'Class',
            isRequired: false, isFilterable: true, displayOrder: 1, validationRules: null, createdAt: '',
            options: [
              opt(1011, 'NURSERY_KG', 'Nursery & KG', 1),
              opt(1012, 'CLASS_1', 'Class 1', 2), opt(1013, 'CLASS_2', 'Class 2', 3),
              opt(1014, 'CLASS_3', 'Class 3', 4), opt(1015, 'CLASS_4', 'Class 4', 5),
              opt(1016, 'CLASS_5', 'Class 5', 6), opt(1017, 'CLASS_6', 'Class 6', 7),
              opt(1018, 'CLASS_7', 'Class 7', 8), opt(1019, 'CLASS_8', 'Class 8', 9),
              opt(1020, 'CLASS_9', 'Class 9', 10), opt(1021, 'CLASS_10', 'Class 10', 11),
              opt(1022, 'CLASS_11', 'Class 11', 12), opt(1023, 'CLASS_12', 'Class 12', 13)
            ]
          },
          {
            id: 102, fieldType: 'MULTI_SELECT', fieldKey: 'subjects', fieldLabel: 'Subjects',
            isRequired: false, isFilterable: true, displayOrder: 2, validationRules: null, createdAt: '',
            options: [
              opt(1031, 'MATHEMATICS', 'Mathematics', 1), opt(1032, 'SCIENCE', 'Science', 2),
              opt(1033, 'ENGLISH', 'English', 3), opt(1034, 'PHYSICS', 'Physics', 4),
              opt(1035, 'CHEMISTRY', 'Chemistry', 5), opt(1036, 'BIOLOGY', 'Biology', 6),
              opt(1037, 'HINDI', 'Hindi', 7), opt(1038, 'SOCIAL_STUDIES', 'Social Studies', 8),
              opt(1039, 'ACCOUNTANCY', 'Accountancy', 9), opt(1040, 'ECONOMICS', 'Economics', 10),
              opt(1041, 'BUSINESS_STUDIES', 'Business Studies', 11),
              opt(1042, 'COMPUTER_SCIENCE', 'Computer Science', 12),
              opt(1043, 'SANSKRIT', 'Sanskrit', 13),
              opt(1044, 'EVS', 'Environmental Studies (EVS)', 14),
              opt(1045, 'COMMERCE', 'Commerce', 15), opt(1046, 'HISTORY', 'History', 16),
              opt(1047, 'POLITICAL_SCIENCE', 'Political Science', 17),
              opt(1048, 'GEOGRAPHY', 'Geography', 18), opt(1049, 'FRENCH', 'French', 19),
              opt(1050, 'SPOKEN_ENGLISH', 'Spoken English', 20)
            ]
          },
          {
            id: 103, fieldType: 'MULTI_SELECT', fieldKey: 'board', fieldLabel: 'Board',
            isRequired: false, isFilterable: true, displayOrder: 3, validationRules: null, createdAt: '',
            options: [
              opt(1061, 'CBSE', 'CBSE', 1), opt(1062, 'ICSE', 'ICSE', 2),
              opt(1063, 'IB', 'IB', 3), opt(1064, 'STATE_BOARD', 'State Board', 4),
              opt(1065, 'IGCSE', 'IGCSE', 5), opt(1066, 'NIOS', 'NIOS', 6)
            ]
          },
          ...commonFields(4)
        ]
      },
      {
        ...base(2, 'COLLEGE', 'College', 2),
        fields: [
          {
            id: 201, fieldType: 'MULTI_SELECT', fieldKey: 'degreeStream', fieldLabel: 'Degree/Stream',
            isRequired: false, isFilterable: true, displayOrder: 1, validationRules: null, createdAt: '',
            options: [
              opt(2011, 'ENGINEERING', 'Engineering', 1), opt(2012, 'MEDICAL', 'Medical', 2),
              opt(2013, 'COMMERCE', 'Commerce', 3), opt(2014, 'MANAGEMENT', 'Management', 4),
              opt(2015, 'SCIENCE', 'Science', 5), opt(2016, 'ARTS_HUMANITIES', 'Arts & Humanities', 6),
              opt(2017, 'LAW', 'Law', 7), opt(2018, 'CHARTERED_COURSES', 'Chartered Courses', 8),
              opt(2019, 'COMPUTER_APPLICATIONS', 'Computer Applications', 9),
              opt(2020, 'PHARMACY_NURSING', 'Pharmacy & Nursing', 10)
            ]
          },
          {
            id: 202, fieldType: 'MULTI_SELECT', fieldKey: 'year', fieldLabel: 'Year',
            isRequired: false, isFilterable: true, displayOrder: 2, validationRules: null, createdAt: '',
            options: [
              opt(2021, '1ST_YEAR', '1st Year', 1), opt(2022, '2ND_YEAR', '2nd Year', 2),
              opt(2023, '3RD_YEAR', '3rd Year', 3), opt(2024, '4TH_YEAR', '4th Year', 4),
              opt(2025, '5TH_YEAR', '5th Year', 5)
            ]
          },
          ...commonFields(3)
        ]
      },
      {
        ...base(3, 'LANGUAGES', 'Language', 3),
        fields: [
          {
            id: 301, fieldType: 'MULTI_SELECT', fieldKey: 'languages', fieldLabel: 'Languages',
            isRequired: false, isFilterable: true, displayOrder: 1, validationRules: null, createdAt: '',
            options: [
              opt(3011, 'ENGLISH', 'English', 1), opt(3012, 'FRENCH', 'French', 2),
              opt(3013, 'GERMAN', 'German', 3), opt(3014, 'SPANISH', 'Spanish', 4),
              opt(3015, 'HINDI', 'Hindi', 5), opt(3016, 'SANSKRIT', 'Sanskrit', 6),
              opt(3017, 'JAPANESE', 'Japanese', 7), opt(3018, 'MANDARIN', 'Mandarin', 8),
              opt(3019, 'KOREAN', 'Korean', 9), opt(3020, 'TAMIL', 'Tamil', 10),
              opt(3021, 'TELUGU', 'Telugu', 11), opt(3022, 'MARATHI', 'Marathi', 12),
              opt(3023, 'BENGALI', 'Bengali', 13), opt(3024, 'KANNADA', 'Kannada', 14),
              opt(3025, 'MALAYALAM', 'Malayalam', 15), opt(3026, 'PUNJABI', 'Punjabi', 16),
              opt(3027, 'GUJARATI', 'Gujarati', 17), opt(3028, 'ARABIC', 'Arabic', 18),
              opt(3029, 'RUSSIAN', 'Russian', 19), opt(3030, 'IELTS_TOEFL', 'IELTS/TOEFL Prep', 20)
            ]
          },
          {
            id: 302, fieldType: 'MULTI_SELECT', fieldKey: 'level', fieldLabel: 'Level',
            isRequired: false, isFilterable: true, displayOrder: 2, validationRules: null, createdAt: '',
            options: [
              opt(3031, 'BEGINNER', 'Beginner', 1), opt(3032, 'INTERMEDIATE', 'Intermediate', 2),
              opt(3033, 'ADVANCED', 'Advanced', 3),
              opt(3034, 'PROFESSIONAL_BUSINESS', 'Professional/Business', 4)
            ]
          },
          ...commonFields(3)
        ]
      },
      {
        ...base(4, 'HOBBIES', 'Hobbies', 4),
        fields: [
          {
            id: 401, fieldType: 'MULTI_SELECT', fieldKey: 'skill', fieldLabel: 'Skill',
            isRequired: false, isFilterable: true, displayOrder: 1, validationRules: null, createdAt: '',
            options: [
              opt(4011, 'GUITAR_ACOUSTIC', 'Guitar (Acoustic)', 1),
              opt(4012, 'GUITAR_ELECTRIC', 'Guitar (Electric)', 2),
              opt(4013, 'PIANO', 'Piano', 3), opt(4014, 'VIOLIN', 'Violin', 4),
              opt(4015, 'DRUMS', 'Drums', 5), opt(4016, 'FLUTE', 'Flute', 6),
              opt(4017, 'INDIAN_CLASSICAL_VOCAL', 'Indian Classical Vocal', 7),
              opt(4018, 'WESTERN_VOCALS', 'Western Vocals', 8),
              opt(4019, 'BOLLYWOOD_VOCAL', 'Bollywood Vocal', 9),
              opt(4020, 'BHARATANATYAM', 'Bharatanatyam', 10),
              opt(4021, 'BOLLYWOOD_DANCE', 'Bollywood Dance', 11),
              opt(4022, 'HIP_HOP', 'Hip Hop', 12), opt(4023, 'SALSA', 'Salsa', 13),
              opt(4024, 'DRAWING_SKETCHING', 'Drawing & Sketching', 14),
              opt(4025, 'PAINTING', 'Painting', 15), opt(4026, 'CALLIGRAPHY', 'Calligraphy', 16),
              opt(4027, 'YOGA_MEDITATION', 'Yoga & Meditation', 17),
              opt(4028, 'CHESS', 'Chess', 18), opt(4029, 'COOKING', 'Cooking', 19),
              opt(4030, 'BAKING', 'Baking', 20), opt(4031, 'PHOTOGRAPHY', 'Photography', 21)
            ]
          },
          {
            id: 402, fieldType: 'MULTI_SELECT', fieldKey: 'level', fieldLabel: 'Level',
            isRequired: false, isFilterable: true, displayOrder: 2, validationRules: null, createdAt: '',
            options: [
              opt(4041, 'BEGINNER', 'Beginner', 1), opt(4042, 'INTERMEDIATE', 'Intermediate', 2),
              opt(4043, 'ADVANCED', 'Advanced', 3), opt(4044, 'CERTIFICATION', 'Certification', 4)
            ]
          },
          {
            id: 403, fieldType: 'MULTI_SELECT', fieldKey: 'ageGroup', fieldLabel: 'Age Group',
            isRequired: false, isFilterable: true, displayOrder: 3, validationRules: null, createdAt: '',
            options: [
              opt(4051, 'KIDS', 'Kids (<13)', 1), opt(4052, 'TEENS', 'Teens (13–18)', 2),
              opt(4053, 'ADULTS', 'Adults', 3)
            ]
          },
          ...commonFields(4)
        ]
      },
      {
        ...base(5, 'EXAMS', 'Exams', 5),
        fields: [
          {
            id: 501, fieldType: 'MULTI_SELECT', fieldKey: 'targetExam', fieldLabel: 'Target Exam',
            isRequired: false, isFilterable: true, displayOrder: 1, validationRules: null, createdAt: '',
            options: [
              opt(5011, 'JEE', 'JEE', 1), opt(5012, 'NEET', 'NEET', 2),
              opt(5013, 'GATE', 'GATE', 3), opt(5014, 'CET', 'CET', 4),
              opt(5015, 'UPSC', 'UPSC', 5), opt(5016, 'SSC', 'SSC', 6),
              opt(5017, 'BANKING', 'Banking', 7), opt(5018, 'RAILWAYS', 'Railways', 8),
              opt(5019, 'DEFENCE', 'Defence', 9), opt(5020, 'TEACHING', 'Teaching', 10),
              opt(5021, 'CAT', 'CAT', 11), opt(5022, 'GMAT', 'GMAT', 12),
              opt(5023, 'XAT', 'XAT', 13), opt(5024, 'IPMAT', 'IPMAT', 14),
              opt(5025, 'IELTS_TOEFL', 'IELTS/TOEFL', 15), opt(5026, 'GRE', 'GRE', 16),
              opt(5027, 'SAT', 'SAT', 17), opt(5028, 'CLAT', 'CLAT', 18),
              opt(5029, 'CA_CS_CMA', 'CA/CS/CMA', 19)
            ]
          },
          ...commonFields(2)
        ]
      },
      {
        ...base(6, 'SPORTS', 'Sports', 6),
        fields: [
          {
            id: 601, fieldType: 'MULTI_SELECT', fieldKey: 'activities', fieldLabel: 'Activities',
            isRequired: false, isFilterable: true, displayOrder: 1, validationRules: null, createdAt: '',
            options: [
              opt(6011, 'CRICKET', 'Cricket', 1), opt(6012, 'BADMINTON', 'Badminton', 2),
              opt(6013, 'FOOTBALL', 'Football', 3), opt(6014, 'SWIMMING', 'Swimming', 4),
              opt(6015, 'PICKLEBALL', 'Pickleball', 5), opt(6016, 'TENNIS', 'Tennis', 6),
              opt(6017, 'TABLE_TENNIS', 'Table Tennis', 7),
              opt(6018, 'BASKETBALL', 'Basketball', 8),
              opt(6019, 'MARTIAL_ARTS', 'Martial Arts', 9),
              opt(6020, 'SKATING', 'Skating', 10), opt(6021, 'ATHLETICS', 'Athletics', 11),
              opt(6022, 'VOLLEYBALL', 'Volleyball', 12),
              opt(6023, 'PERSONAL_TRAINING', 'Personal Training', 13)
            ]
          },
          {
            id: 602, fieldType: 'MULTI_SELECT', fieldKey: 'ageGroup', fieldLabel: 'Age Group',
            isRequired: false, isFilterable: true, displayOrder: 2, validationRules: null, createdAt: '',
            options: [
              opt(6031, 'KIDS', 'Kids (<13)', 1), opt(6032, 'TEENS', 'Teens (13–18)', 2),
              opt(6033, 'ADULTS', 'Adults', 3)
            ]
          },
          ...commonFields(3)
        ]
      },
      {
        ...base(7, 'OTHERS', 'Others', 7),
        fields: [
          {
            id: 701, fieldType: 'MULTI_SELECT', fieldKey: 'skill', fieldLabel: 'Skill',
            isRequired: false, isFilterable: true, displayOrder: 1, validationRules: null, createdAt: '',
            options: [
              opt(7011, 'AI_ML', 'AI & ML', 1), opt(7012, 'GEN_AI', 'Gen AI', 2),
              opt(7013, 'DATA_SCIENCE', 'Data Science', 3),
              opt(7014, 'DIGITAL_MARKETING', 'Digital Marketing', 4),
              opt(7015, 'STOCK_MARKET', 'Stock Market', 5),
              opt(7016, 'WEB_APP_DEV', 'Web/App Dev', 6),
              opt(7017, 'GRAPHIC_DESIGN', 'Graphic Design', 7),
              opt(7018, 'VIDEO_EDITING', 'Video Editing', 8),
              opt(7019, 'FASHION', 'Fashion', 9), opt(7020, 'MAKEUP', 'Makeup', 10),
              opt(7021, 'INTERIOR_DESIGN', 'Interior Design', 11),
              opt(7022, 'PHOTOGRAPHY', 'Photography', 12)
            ]
          },
          {
            id: 702, fieldType: 'MULTI_SELECT', fieldKey: 'level', fieldLabel: 'Level',
            isRequired: false, isFilterable: true, displayOrder: 2, validationRules: null, createdAt: '',
            options: [
              opt(7031, 'BEGINNER', 'Beginner', 1), opt(7032, 'INTERMEDIATE', 'Intermediate', 2),
              opt(7033, 'ADVANCED', 'Advanced', 3)
            ]
          },
          ...commonFields(3)
        ]
      }
    ];
  }

  /**
   * Set sidebar filters based on selected category
   */
  private setSidebarForCategory(categoryKey: string): void {
    const category = this.apiCategories.find(cat => cat.categoryKey === categoryKey);

    if (category && category.fields.length > 0) {
      // Map API fields to sidebar groups
      this.sidebarGroups = category.fields
        .filter(field => field.isFilterable)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(field => ({
          label: field.fieldLabel,
          fieldKey: field.fieldKey,
          isRequired: field.isRequired,
          isFilterable: field.isFilterable,
          items: field.options
            .filter(opt => opt.isActive)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map(opt => ({
              id: opt.id,
              value: opt.optionValue,
              label: opt.optionLabel,
              displayOrder: opt.displayOrder
            }))
        }));

      // Select first sidebar group by default
      if (this.sidebarGroups.length > 0) {
        this.selectedSidebar = this.sidebarGroups[0].label;
        this.selectedSubFilters = this.sidebarGroups[0].items;
      } else {
        this.selectedSidebar = null;
        this.selectedSubFilters = [];
      }
    } else {
      // No fields found, clear sidebar
      this.sidebarGroups = [];
      this.selectedSidebar = null;
      this.selectedSubFilters = [];
    }

  }

  /**
   * Select a sidebar filter group
   */
  selectSidebar(filterLabel: string): void {
    this.selectedSidebar = filterLabel;
    const group = this.sidebarGroups.find(g => g.label === filterLabel);
    this.selectedSubFilters = group ? group.items : [];
  }

  /**
   * Select a category from topbar
   */
  selectCategory(categoryKey: string): void {
    this.selectedCategory = categoryKey;
    this.setSidebarForCategory(categoryKey);
  }

  /**
   * Toggle a sub-filter option
   */
  onToggleSubFilter(item: FilterOption, checked: boolean): void {
    const group = this.sidebarGroups.find(g => g.label === this.selectedSidebar);
    if (!group) return;

    const fieldKey = group.fieldKey;

    if (!this.selectedFiltersMap.has(fieldKey)) {
      this.selectedFiltersMap.set(fieldKey, new Set());
    }

    const fieldSet = this.selectedFiltersMap.get(fieldKey)!;

    if (checked) {
      fieldSet.add(item.value);
    } else {
      fieldSet.delete(item.value);
      // If no values remain for this field, remove the key from the map
      if (fieldSet.size === 0) {
        this.selectedFiltersMap.delete(fieldKey);
      }
    }

    // User interaction begins: compute and show count
    this.updateResultCount();
  }

  /**
   * Check if a sub-filter is selected
   */
  isSubFilterSelected(item: FilterOption): boolean {
    const group = this.sidebarGroups.find(g => g.label === this.selectedSidebar);
    if (!group) return false;

    const fieldSet = this.selectedFiltersMap.get(group.fieldKey);
    return fieldSet ? fieldSet.has(item.value) : false;
  }

  /**
   * Get number of selected options for a field
   */
  getSelectedCount(fieldKey: string): number {
    const set = this.selectedFiltersMap.get(fieldKey);
    return set ? set.size : 0;
  }

  /**
   * Check if any filters are currently selected
   */
  hasSelectedFilters(): boolean {
    return this.selectedFiltersMap.size > 0;
  }

  /**
   * Clear all selected filters
   */
  clearAll(): void {
    this.selectedFiltersMap.clear();
    this.resultCount = null;
    // Dismiss modal with clearAll flag so parent can refetch all tutors from API
    this.modalCtrl.dismiss({ clearAll: true });
  }

  /**
   * Get selected filters for API submission
   */
  getSelectedFilters(): SelectedFilters | null {
    if (!this.selectedCategory) return null;

    const filters: { [fieldKey: string]: string[] } = {};

    this.selectedFiltersMap.forEach((values, fieldKey) => {
      if (values.size > 0) {
        filters[fieldKey] = Array.from(values);
      }
    });

    return {
      categoryKey: this.selectedCategory,
      filters
    };
  }

  /**
   * Show result with selected filters
   */
  showResult(): void {
    const selectedFilters = this.getSelectedFilters();
    console.log('[TutorAllFilter] Selected filters:', selectedFilters);

    // update count right before dismiss (optional)
    this.updateResultCount();

    // Close modal and pass selected filters
    this.modalCtrl.dismiss({
      filters: selectedFilters
    });
  }

  @ViewChild('categoriesSwiper', { read: ElementRef, static: false }) categoriesSwiperRef!: ElementRef;
  private swiperInstance: any | null = null;

  ngAfterViewInit() {
    // Swiper will be initialized after data loads
  }

  /**
   * Initialize Swiper slider
   */
  private initSwiper(): void {
    const win: any = typeof window !== 'undefined' ? window : null;

    // Destroy existing instance if any
    if (this.swiperInstance && typeof this.swiperInstance.destroy === 'function') {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }

    // Initialize new instance
    if (win && typeof win.Swiper === 'function' && this.categoriesSwiperRef?.nativeElement) {
      this.swiperInstance = new win.Swiper(this.categoriesSwiperRef.nativeElement, {
        slidesPerView: 'auto',
        spaceBetween: 12,
        freeMode: true,
        watchOverflow: true
      });
    }
  }

  ngOnDestroy() {
    if (this.swiperInstance && typeof this.swiperInstance.destroy === 'function') {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }
  }

  constructor(
    private modalCtrl: ModalController,
    private tutorApi: TutorApi,
    private tutorService: TutorService
  ) { }

  /** Update the computed result count based on current selections */
  private updateResultCount(): void {
    try {
      const sel = this.getSelectedFilters();
      // If there are no selected filters, treat as zero results (user expects no count)
      if (!sel || !sel.filters || Object.keys(sel.filters).length === 0) {
        this.resultCount = 0;
        return;
      }

      this.resultCount = this.tutorService.countForSelectedFilters(sel);
    } catch (e) {
      this.resultCount = 0;
    }
  }

  /**
   * Close modal without applying filters
   */
  close(): void {
    this.modalCtrl.dismiss();
  }
}
