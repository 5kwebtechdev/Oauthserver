import { articleRoute } from './article-route';

describe('articleRoute', () => {
    it('uses the backend slug without deriving it from the title', () => {
        expect(articleRoute({ id: 81, slug: 'believe-in-yourself' }))
            .toEqual(['/article', 'believe-in-yourself']);
    });

    it('reads the slug carried by an existing article card', () => {
        expect(articleRoute({ id: 119, rawData: { slug: 'why-comparing-yourself-online-feels-so-powerful' } }))
            .toEqual(['/article', 'why-comparing-yourself-online-feels-so-powerful']);
    });

    it('preserves ID navigation only for a legacy card without a slug', () => {
        expect(articleRoute({ id: 52, rawData: { title: 'An article' } }))
            .toEqual(['/content/article', 52]);
    });
});
