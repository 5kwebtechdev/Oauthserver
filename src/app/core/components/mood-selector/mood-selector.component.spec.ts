import { MoodSelectorComponent } from './mood-selector.component';

describe('MoodSelectorComponent (sanity)', () => {
  it('should be creatable', () => {
    const cmp = new MoodSelectorComponent();
    expect(cmp).toBeTruthy();
  });
});
