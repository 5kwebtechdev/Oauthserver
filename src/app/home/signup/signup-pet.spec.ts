import { SignupComponent } from './signup.component';

describe('Signup pet continuation', () => {
  let component: any;
  let savedRole: string | null;
  let savedPet: string | null;

  beforeEach(() => {
    savedRole = sessionStorage.getItem('signup_role');
    savedPet = sessionStorage.getItem('signup_pet');
    component = Object.create(SignupComponent.prototype);
    Object.assign(component, {
      step: 4,
      selectedPetIndex: 0,
      pets: [{ apiName: 'PANDA' }, { apiName: 'OWL' }],
      registrationInProgress: false,
      managedChildSignup: false,
      onboardingState: { updateRegistrationDraft: jasmine.createSpy() },
      authService: {
        isLoggedIn: () => false,
        getUserRelationship: () => 'SELF'
      },
      core: { triggerToasrt: jasmine.createSpy() }
    });
    spyOn(component, 'registerChildOrSelfFromSession');
    spyOn(component, 'savePostFamilyChildPet');
    spyOn(component, 'createManagedChildAccount');
    spyOn(component, 'navigateToSignupStep');
  });

  afterEach(() => {
    for (const [key, value] of [['signup_role', savedRole], ['signup_pet', savedPet]]) {
      if (value === null) sessionStorage.removeItem(key!);
      else sessionStorage.setItem(key!, value!);
    }
  });

  for (const role of ['self', 'child']) {
    it(`saves the chosen pet before advancing for unlinked ${role}`, () => {
      sessionStorage.setItem('signup_role', role);
      component.proceedWithAvatar();
      expect(component.registerChildOrSelfFromSession).toHaveBeenCalledOnceWith(role, true);
      expect(sessionStorage.getItem('signup_pet')).toBe('PANDA');
      expect(component.navigateToSignupStep).not.toHaveBeenCalled();
    });
  }

  it('preserves the linked child profile-save flow', () => {
    sessionStorage.setItem('signup_role', 'child');
    component.authService.isLoggedIn = () => true;
    component.authService.getUserRelationship = () => 'CHILD';
    component.proceedWithAvatar();
    expect(component.savePostFamilyChildPet).toHaveBeenCalledOnceWith('PANDA');
    expect(component.registerChildOrSelfFromSession).not.toHaveBeenCalled();
  });

  it('preserves managed child registration', () => {
    sessionStorage.setItem('signup_role', 'child');
    component.managedChildSignup = true;
    component.proceedWithAvatar();
    expect(component.createManagedChildAccount).toHaveBeenCalledOnceWith('PANDA');
  });

  it('requires an explicit pet selection', () => {
    component.selectedPetIndex = null;
    component.proceedWithAvatar();
    expect(component.core.triggerToasrt).toHaveBeenCalled();
    expect(component.registerChildOrSelfFromSession).not.toHaveBeenCalled();
  });

  it('ignores repeated Next and pet changes while saving', () => {
    component.registrationInProgress = true;
    component.proceedWithAvatar();
    component.selectPet(1);
    expect(component.selectedPetIndex).toBe(0);
    expect(component.registerChildOrSelfFromSession).not.toHaveBeenCalled();
  });

  it('browses pets with arrows without changing the selected pet', () => {
    const slidePrev = jasmine.createSpy('slidePrev');
    const slideNext = jasmine.createSpy('slideNext');
    component.swiperRef = { nativeElement: { swiper: { slidePrev, slideNext, isBeginning: false, isEnd: false } } };

    component.movePetCarousel('next');
    component.movePetCarousel('previous');

    expect(slideNext).toHaveBeenCalledTimes(1);
    expect(slidePrev).toHaveBeenCalledTimes(1);
    expect(component.selectedPetIndex).toBe(0);
    expect(sessionStorage.getItem('signup_pet')).toBe(savedPet);
  });
});
