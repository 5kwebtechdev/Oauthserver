import { Tutor, TutorCategory } from './tutor.model';

export interface TeachingGroup { key: string; title: string; rows: { label: string; value: string }[]; }
const schemas = [
  { key: 'SCHOOL', title: 'School', fields: [['Subjects', 'subject'], ['Class', 'class|grade|standard'], ['Board', 'board']] },
  { key: 'COLLEGE', title: 'College', fields: [['Degree / Stream', 'degree|stream|course'], ['Year', 'year']] },
  { key: 'LANGUAGES', title: 'Languages', fields: [['Languages', 'language'], ['Level', 'level|proficiency']] },
  { key: 'HOBBIES', title: 'Hobbies', fields: [['Skill', 'skill|hobb|instrument|activity'], ['Level', 'level'], ['Age Group', 'age']] },
  { key: 'EXAMS', title: 'Exams', fields: [['Exams', 'exam|test'], ['Subjects', 'subject'], ['Level', 'level']] },
  { key: 'SPORTS', title: 'Sports', fields: [['Activities', 'sport|activit'], ['Age Group', 'age']] },
  { key: 'OTHERS', title: 'Others', fields: [['Skill', 'skill|subject|course'], ['Level', 'level']] }
];
const keyOf = (value: string) => {
  const key = value.replace(/[^a-z]/gi, '').toUpperCase();
  return ({ LANGUAGE: 'LANGUAGES', EXAM: 'EXAMS', OTHER: 'OTHERS', HOBBY: 'HOBBIES' } as Record<string, string>)[key] || key;
};
function valuesOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.reduce<string[]>((all, item) => all.concat(valuesOf(item)), []);
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return valuesOf(item['optionLabel'] ?? item['label'] ?? item['optionValue'] ?? item['value']);
  }
  return value == null ? [] : String(value).split(',').map(x => x.trim()).filter(Boolean);
}

/** Keep different teaching categories separate, even when they share field labels. */
export function teachingGroups(tutor: Tutor, categories: TutorCategory[] = [], selectedKey = ''): TeachingGroup[] {
  const groups = new Map<string, TeachingGroup>();
  for (const mapping of tutor.categoryMappings || []) {
    const category = categories.find(c => String(c.id) === String(mapping.categoryId));
    const schema = category ? schemas.find(s => s.key === keyOf(category.categoryKey)) : schemas[Number(mapping.categoryId) - 1];
    if (!schema || (selectedKey && schema.key !== keyOf(selectedKey))) continue;
    let options: Record<string, unknown>;
    try {
      let raw: unknown = mapping.selectedFieldOptions;
      if (typeof raw === 'string') raw = JSON.parse(raw);
      if (typeof raw === 'string') raw = JSON.parse(raw);
      options = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    } catch { continue; }
    const group = groups.get(schema.key) || { key: schema.key, title: schema.title, rows: [] };
    for (const [label, pattern] of schema.fields) {
      const values = Object.entries(options).filter(([key]) => {
        if (/mode|location|tutor.?type/i.test(key)) return false;
        if (label === 'Skill' && /level|proficiency|age/i.test(key)) return false;
        return new RegExp(pattern, 'i').test(key);
      }).reduce<string[]>((all, [key, raw]) => {
        const field = category?.fields?.find(f => f.fieldKey.toLowerCase() === key.toLowerCase());
        return all.concat(valuesOf(raw).map(value => field?.options?.find(o => o.optionValue.toLowerCase() === value.toLowerCase())?.optionLabel || value.replace(/_/g, ' ')));
      }, []);
      if (!values.length) continue;
      const existing = group.rows.find(row => row.label === label);
      const combined = Array.from(new Set([...(existing?.value.split(', ') || []), ...values]));
      if (existing) existing.value = combined.join(', ');
      else group.rows.push({ label, value: combined.join(', ') });
    }
    if (group.rows.length) groups.set(schema.key, group);
  }
  return schemas.map(s => groups.get(s.key)).filter((g): g is TeachingGroup => !!g);
}

export function teachingSummary(tutor: Tutor, categories: TutorCategory[] = [], selectedKey = ''): string {
  const groups = teachingGroups(tutor, categories, selectedKey);
  const values = Array.from(new Set(groups.reduce<string[]>((all, group) => all.concat(group.rows[0]?.value.split(', ') || []), [])));
  const items = values.length ? values : (selectedKey ? [] : tutor.subjects || []);
  return items.slice(0, 3).join(', ') + (items.length > 3 ? ` +${items.length - 3}` : '');
}
