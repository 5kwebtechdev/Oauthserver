import { LearningCardData } from './learning.models';

/** Use the backend's stored slug; old cached cards can still open by ID. */
export function articleRoute(item: Pick<LearningCardData, 'id' | 'slug' | 'rawData'>): Array<string | number> {
    const raw = item.rawData as { slug?: unknown } | undefined;
    const slug = String(item.slug || raw?.slug || '').trim();
    return slug ? ['/article', slug] : ['/content/article', item.id];
}
