import { ContentArticlesComponent } from './content-articles.component';

describe('ContentArticlesComponent', () => {
  it('should create', () => {
    const comp = new ContentArticlesComponent();
    expect(comp).toBeTruthy();
  });

  it('should expose articles list', () => {
    const comp = new ContentArticlesComponent();
    expect(Array.isArray(comp.articles)).toBe(true);
    expect(comp.articles.length).toBeGreaterThan(0);
  });
});
