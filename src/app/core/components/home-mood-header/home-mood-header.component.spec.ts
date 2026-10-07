import { HomeMoodHeaderComponent, normalizeHomeMood } from './home-mood-header.component';
import { PetAgeService, PetType } from '../../services/pet-age.service';
import { MoodSelectorComponent } from '../mood-selector/mood-selector.component';
import { Subject } from 'rxjs';

describe('Header mood picker limits', () => {
  function picker() {
    const post = jasmine.createSpy('post').and.returnValue(new Subject());
    const component = new MoodSelectorComponent(
      { post } as any, { getToken: () => null } as any, {} as any,
      { getUserRelationship: () => 'CHILD' } as any
    );
    component.presentation = 'dialog';
    return { component, post };
  }
  it('lists popup moods in the requested order without changing API values', () => {
    const { component } = picker();
    expect(component.popupOptions.map(option => [option.label, option.vibe])).toEqual([
      ['Excited', 'EXCITED'],
      ['Happy', 'HAPPY'],
      ['Calm', 'NEUTRAL'],
      ['Anxious', 'NERVOUS'],
      ['Sad', 'SAD'],
      ['Frustrated', 'UPSET'],
    ]);
  });
  it('opens only when requested and closes without saving', () => {
    const { component, post } = picker();
    expect(component.dialogOpen).toBeFalse();
    component.editMood();
    expect(component.dialogOpen).toBeTrue();
    expect(component.showMoodPicker).toBeTrue();
    component.closeDialog();
    expect(component.dialogOpen).toBeFalse();
    expect(post).not.toHaveBeenCalled();
  });
  it('shows the limit and prevents a third save', () => {
    const { component, post } = picker();
    (component as any).setsToday = 2;
    spyOn(component, 'showBlockedTooltip');
    component.editMood();
    expect(component.dialogOpen).toBeTrue();
    expect(component.dailyLimitReached).toBeTrue();
    component.popupSelection = component.popupOptions[0].src;
    component.setVibe();
    expect(post).not.toHaveBeenCalled();
  });
  it('prevents duplicate save requests while saving', () => {
    const { component, post } = picker();
    component.popupSelection = component.popupOptions[0].src;
    component.setVibe();
    component.setVibe();
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe('Home mood header', () => {
  let pet: PetType;
  let component: HomeMoodHeaderComponent;
  beforeEach(() => {
    pet = 'panda';
    component = new HomeMoodHeaderComponent({ getCurrentPetType: () => pet } as PetAgeService);
  });

  it('keeps no mood distinct from a confirmed Calm selection', () => {
    expect(normalizeHomeMood(null)).toBeNull();
    expect(component.petMoodImage).toContain('panda-latest-moods.png');
    expect(component.state.emphasis).toBe("I'll match it");
    component.mood = normalizeHomeMood('NEUTRAL');
    expect(component.state.label).toBe('Calm');
    expect(component.petMoodImage).toContain('panda-latest-moods.png');
  });

  it('maps backend moods to all six Figma presentations', () => {
    for (const [apiMood, mood] of [['VERY HAPPY', 'happy'], ['EXCITED', 'excited'], ['NERVOUS', 'anxious'], ['SAD', 'sad'], ['UPSET', 'frustrated'], ['NEUTRAL', 'calm']] as const) {
      component.mood = normalizeHomeMood(apiMood);
      expect(component.mood).toBe(mood);
      expect(component.petMoodImage).toContain('panda-latest-moods.png');
      expect(component.state.label).toBeTruthy();
    }
  });

  it('follows the selected pet and never changes the time period on mood changes', () => {
    component.period = 'night';
    component.mood = 'excited';
    pet = 'dragon';
    expect(component.pet).toBe('dragon');
    expect(component.messageEnding).toContain('🐉');
    expect(component.state.petMood).toBe('playful');
    pet = 'owl';
    expect(component.pet).toBe('owl');
    expect(component.period).toBe('night');
  });

  it('uses the latest Figma mood sheet for all six moods of each pet', () => {
    for (const type of ['panda', 'owl', 'dragon', 'llama'] as const) {
      pet = type;
      for (const mood of ['happy', 'excited', 'anxious', 'sad', 'frustrated', 'calm'] as const) {
        component.mood = mood;
        expect(component.petMoodImage).toContain(`${type}-latest-moods.png`);
        expect(component.state.label.toLowerCase()).toBe(mood);
      }
    }
  });

  it('uses birthday artwork for every pet and both mood groups only when enabled', () => {
    component.birthday = true;
    for (const type of ['panda', 'owl', 'llama', 'dragon'] as const) {
      pet = type;
      component.mood = 'happy';
      expect(component.petMoodImage).toContain('pets-positive.png');
      expect(component.state.emphasis).toBe('Lucky me.');
      component.mood = 'sad';
      expect(component.petMoodImage).toContain(type === 'panda' ? 'pets-positive.png' : 'pets-negative.png');
      expect(component.state.emphasis).toBe('Cake counts.');
    }
    component.birthday = false;
    expect(component.petMoodImage).toContain('dragon-latest-moods.png');
  });
});
