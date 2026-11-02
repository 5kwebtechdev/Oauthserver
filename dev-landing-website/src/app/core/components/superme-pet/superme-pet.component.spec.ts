import { SupremePetComponent } from './superme-pet.component';
import { PetAgeService } from '../../services/pet-age.service';

describe('SupremePetComponent', () => {
    it('should create', () => {
        const mockPetAgeService = jasmine.createSpyObj('PetAgeService', ['getCurrentPetData']);
        const c = new SupremePetComponent(mockPetAgeService);
        expect(c).toBeTruthy();
    });
});
