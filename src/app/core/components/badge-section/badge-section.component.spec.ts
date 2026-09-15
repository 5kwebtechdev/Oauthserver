import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgeSectionComponent } from './badge-section.component';
import { IonicModule } from '@ionic/angular';
import { SupermeInputsModule } from '../superme-inputs/superme-inputs.module';

describe('BadgeSectionComponent', () => {
    let component: BadgeSectionComponent;
    let fixture: ComponentFixture<BadgeSectionComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BadgeSectionComponent, IonicModule.forRoot(), SupermeInputsModule]
        }).compileComponents();

        fixture = TestBed.createComponent(BadgeSectionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have 6 badges', () => {
        expect(component.badges.length).toBe(6);
    });

    it('should have recent achievement', () => {
        expect(component.recentAchievement).toBeDefined();
        // expect(component.recentAchievement.badgeName).toBe('Streak Star');
    });

    it('should calculate completion percentage correctly', () => {
        const testBadge = {
            id: 'test',
            name: 'Test Badge',
            description: 'Test',
            iconUrl: 'test.webp',
            currentProgress: 8,
            targetProgress: 12,
            isLocked: false
        };

        const percentage = component.getCompletionPercentage(testBadge);
        expect(percentage).toBe(67); // 8/12 * 100 = 66.67, rounded to 67
    });

    it('should return 0 for locked badges', () => {
        const lockedBadge = {
            id: 'locked',
            name: 'Locked Badge',
            description: 'Locked',
            iconUrl: 'locked.webp',
            currentProgress: 5,
            targetProgress: 10,
            isLocked: true
        };

        const percentage = component.getCompletionPercentage(lockedBadge);
        expect(percentage).toBe(0);
    });

    it('should handle back button click', () => {
        spyOn(console, 'log');
        component.onBackClick();
        expect(console.log).toHaveBeenCalledWith('Back button clicked');
    });

    it('should handle share button click', () => {
        spyOn(console, 'log');
        component.onShareClick();
        expect(console.log).toHaveBeenCalledWith('Share button clicked');
    });
});
