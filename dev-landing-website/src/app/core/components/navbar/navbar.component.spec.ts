import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('PublicNavbarComponent', () => {
  let component: PublicNavbarComponent;
  let fixture: ComponentFixture<PublicNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicNavbarComponent, RouterTestingModule]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PublicNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-name')?.textContent).toContain('Still Panda');
  });

  it('should display all navigation items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const navItems = compiled.querySelectorAll('.nav-item');
    expect(navItems.length).toBe(5);
  });

  it('should display all stats', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const statItems = compiled.querySelectorAll('.stat-item');
    expect(statItems.length).toBe(4);
  });

  it('should toggle profile menu on click', () => {
    const profileSection = fixture.nativeElement.querySelector('.profile-section') as HTMLElement;
    expect(component.showProfileMenu).toBeFalsy();
    
    profileSection.click();
    fixture.detectChanges();
    expect(component.showProfileMenu).toBeTruthy();
    
    profileSection.click();
    fixture.detectChanges();
    expect(component.showProfileMenu).toBeFalsy();
  });
});
