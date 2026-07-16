import { PetMessagesService } from './pet-messages.service';

describe('PetMessagesService coin messages', () => {
    let service: PetMessagesService;

    beforeEach(() => {
        service = new PetMessagesService();
    });

    it('uses the low-balance message and base mood at zero coins', () => {
        const result = service.getMessage('coins', { totalCoins: 0 });

        expect(result.message).toContain("we don't have much right now");
        expect(result.mood).toBe('base');
    });

    it('keeps the low-balance message through 500 coins', () => {
        const result = service.getMessage('coins', { totalCoins: 500 });

        expect(result.message).toContain("we don't have much right now");
        expect(result.mood).toBe('base');
    });

    it('switches to the high-balance message and happy mood at 501 coins', () => {
        const result = service.getMessage('coins', { totalCoins: 501 });

        expect(result.message).toContain("That's a lot of coins");
        expect(result.mood).toBe('happy');
    });
});
