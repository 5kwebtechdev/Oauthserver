import { TutorCategory } from '../../../models/tutor.model';
import { TutorProfileComponent } from './tutor-profile.component';

describe('TutorProfileComponent category fields', () => {
  const field = (fieldKey: string, fieldLabel: string, options: Array<[string, string]>, displayOrder: number) => ({
    id: displayOrder,
    fieldType: 'MULTI_SELECT' as const,
    fieldKey,
    fieldLabel,
    isRequired: false,
    isFilterable: true,
    displayOrder,
    validationRules: null,
    createdAt: '',
    options: options.map(([optionValue, optionLabel], index) => ({
      id: index + 1,
      optionValue,
      optionLabel,
      displayOrder: index + 1,
      isActive: true,
      createdAt: ''
    }))
  });

  const categories: TutorCategory[] = [
    { id: 2, categoryKey: 'COLLEGE', categoryName: 'College', fields: [field('degree_stream', 'Degree / Stream', [['ENGINEERING', 'Engineering']], 1), field('year', 'Year', [['2ND_YEAR', '2nd Year']], 2)], displayOrder: 2 },
    { id: 3, categoryKey: 'LANGUAGE', categoryName: 'Language', fields: [field('language', 'Language', [['ENGLISH', 'English'], ['FRENCH', 'French']], 1), field('proficiency_level', 'Level of Proficiency', [['BEGINNER', 'Beginner']], 2)], displayOrder: 3 },
    { id: 4, categoryKey: 'HOBBIES', categoryName: 'Hobbies', fields: [field('hobby', 'Hobby', [['GUITAR', 'Guitar']], 1), field('proficiency_level', 'Proficiency Level', [['INTERMEDIATE', 'Intermediate']], 2), field('age_group', 'Age Group', [['ADULTS', 'Adults']], 3)], displayOrder: 4 },
    { id: 5, categoryKey: 'EXAMS', categoryName: 'Exams', fields: [field('target_exam', 'Target Exam', [['NEET', 'NEET']], 1)], displayOrder: 5 },
    { id: 6, categoryKey: 'SPORTS', categoryName: 'Sports', fields: [field('activity', 'Activity', [['CRICKET', 'Cricket']], 1), field('age_group', 'Age Group', [['TEENS', 'Teens']], 2)], displayOrder: 6 },
    { id: 7, categoryKey: 'OTHERS', categoryName: 'Others', fields: [field('skill', 'Skill / Course', [['DATA_SCIENCE', 'Data Science']], 1), field('skill_level', 'Skill Level', [['ADVANCED', 'Advanced']], 2)], displayOrder: 7 }
  ].map(category => ({
    description: '',
    iconUrl: null,
    isActive: true,
    createdAt: '',
    updatedAt: null,
    ...category
  }));

  let component: TutorProfileComponent;

  beforeEach(() => {
    component = new TutorProfileComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    component.tutor = {
      categoryMappings: [
        { categoryId: 2, selectedFieldOptions: { degree_stream: ['ENGINEERING'], year: ['2ND_YEAR'], mode: ['ONLINE'] } },
        { categoryId: 3, selectedFieldOptions: JSON.stringify({ language: 'ENGLISH,FRENCH', proficiency_level: 'BEGINNER', location: 'CHENNAI' }) },
        { categoryId: 4, selectedFieldOptions: { hobby: [{ optionValue: 'GUITAR' }], proficiency_level: ['INTERMEDIATE'], age_group: ['ADULTS'] } },
        { categoryId: 5, selectedFieldOptions: { target_exam: ['NEET'], tutor_type: ['INDIVIDUAL'] } },
        { categoryId: 6, selectedFieldOptions: { activity: ['CRICKET'], age_group: ['TEENS'] } },
        { categoryId: 7, selectedFieldOptions: { skill: ['DATA_SCIENCE'], skill_level: ['ADVANCED'] } }
      ]
    } as any;
  });

  [
    { key: 'COLLEGE', labels: ['Degree / Stream', 'Year'], values: ['Engineering', '2nd Year'] },
    { key: 'LANGUAGES', labels: ['Language', 'Level of Proficiency'], values: ['English, French', 'Beginner'] },
    { key: 'HOBBIES', labels: ['Hobby', 'Proficiency Level', 'Age Group'], values: ['Guitar', 'Intermediate', 'Adults'] },
    { key: 'EXAMS', labels: ['Target Exam'], values: ['NEET'] },
    { key: 'SPORTS', labels: ['Activity', 'Age Group'], values: ['Cricket', 'Teens'] },
    { key: 'OTHER', labels: ['Skill / Course', 'Skill Level'], values: ['Data Science', 'Advanced'] }
  ].forEach(testCase => {
    it(`renders API values for ${testCase.key}`, () => {
      component.categoryKey = testCase.key;

      const rows = (component as any).buildCategoryFieldRows(categories);

      expect(rows.map((row: any) => row.label)).toEqual(testCase.labels);
      expect(rows.map((row: any) => row.value)).toEqual(testCase.values);
      expect(rows.some((row: any) => ['Tutor Type', 'Mode', 'Location'].includes(row.label))).toBeFalse();
    });
  });
});
