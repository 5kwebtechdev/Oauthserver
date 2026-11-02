import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriesCardComponent } from './categories-card.component';

describe('CategoriesCardComponent', () => {
  let component: CategoriesCardComponent;
  let fixture: ComponentFixture<CategoriesCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriesCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    component.title = 'Test Title';
    fixture.detectChanges();
    const titleElement = fixture.nativeElement.querySelector(
      '.categories-card-title'
    );
    expect(titleElement.textContent).toContain('Test Title');
  });

  it('should show coming soon badge when enabled', () => {
    component.comingSoon = true;
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector(
      '.coming-soon-badge'
    );
    expect(badge).toBeTruthy();
  });

  it('should hide coming soon badge when disabled', () => {
    component.comingSoon = false;
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector(
      '.coming-soon-badge'
    );
    expect(badge).toBeFalsy();
  });

  it('should display image with correct src', () => {
    const testImageUrl = 'https://example.com/test.jpg';
    component.imageUrl = testImageUrl;
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('.card-image');
    expect(image.src).toContain(testImageUrl);
  });

  it('should use property1 as image alt text', () => {
    component.property1 = 'Girls Uniform';
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('.card-image');
    expect(image.alt).toBe('Girls Uniform');
  });
});
