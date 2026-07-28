import { SupermePetComponent } from './superme-pet.component';
import { PetAgeService } from '../../services/pet-age.service';

describe('SupermePetComponent', () => {
  let petAgeService: PetAgeService;

  beforeEach(() => {
    localStorage.clear();
    petAgeService = new PetAgeService();
  });

  it('creates', () => {
    const c = new SupermePetComponent(petAgeService);
    expect(c).toBeTruthy();
  });

  it('uses the pet returned by the user API', () => {
    petAgeService.syncFromUserPet({
      id: 5,
      petName: 'Owl-Age1-Happy.png',
      url: 'src/main/resources/pets/Owl-Age1-Happy.png'
    });

    const component = new SupermePetComponent(petAgeService);
    component.ngOnInit();

    expect(component.pet).toBe('owl');
    expect(component.currentImage).toContain('Owl-Age1-Base.png');
    component.ngOnDestroy();
  });
});
