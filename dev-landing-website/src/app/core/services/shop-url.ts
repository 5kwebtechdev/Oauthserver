/** Public category names follow the Shop URL specification, never database IDs. */
export function shopSlug(value: string): string {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function shopCategorySlug(value: string): string {
  const slug = shopSlug(value);
  return ({ 'school-uniform': 'uniforms', 'school-uniforms': 'uniforms',
    textbooks: 'school-books', textbook: 'school-books',
    'entrance-exam': 'competitive-exams', 'entrance-exam-books': 'competitive-exams',
    'general-books': 'story-books', stationary: 'stationery' } as Record<string, string>)[slug] || slug;
}

export function shopCategoryPath(value: string): string {
  const slug = shopCategorySlug(value);
  return `/shop/${['competitive-exams', 'story-books'].includes(slug) ? 'books/' : ''}${slug}`;
}

export function shopHierarchySlug(value: string): string {
  const slug = shopSlug(value);
  return ({ belt: 'belts', shirt: 'shirts', trouser: 'trousers', notebook: 'notebooks',
    pencil: 'pencils', pen: 'pens', bag: 'bags', accessory: 'accessories' } as Record<string, string>)[slug] || slug;
}

export function shopCategoryUrl(category: string, hierarchy: string[] = []): string {
  return [shopCategoryPath(category), ...hierarchy.filter(v => v && v !== 'all').map(shopHierarchySlug)].join('/');
}
