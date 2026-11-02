import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingNavbarComponent } from './navbar.component';

describe('LandingNavbarComponent desktop dropdowns', () => {
  let component: LandingNavbarComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LandingNavbarComponent],
      providers: [provideRouter([])],
    });
    component = TestBed.createComponent(LandingNavbarComponent).componentInstance;
  });

  it('toggles a parent without navigating and opens only one dropdown', () => {
    component.toggleDropdown(0);
    expect(component.openDropdownIndex).toBe(0);
    component.toggleDropdown(1);
    expect(component.openDropdownIndex).toBe(1);
    component.toggleDropdown(1);
    expect(component.openDropdownIndex).toBeNull();
  });

  it('switches between Get Listed and the main navigation', () => {
    component.toggleDropdown(0);
    component.toggleGetListed();
    expect(component.openDropdownIndex).toBeNull();
    expect(component.getListedOpen).toBeTrue();
    component.toggleDropdown(2);
    expect(component.getListedOpen).toBeFalse();
    expect(component.openDropdownIndex).toBe(2);
  });

  it('closes on Escape and outside click, but not a click inside the navigation', () => {
    component.toggleDropdown(0);
    component.onDocumentClick({ target: document.createElement('main') } as unknown as MouseEvent);
    expect(component.openDropdownIndex).toBeNull();
    component.toggleDropdown(0);
    const nav = document.createElement('div');
    nav.className = 'desktop-navigation';
    component.onDocumentClick({ target: nav } as unknown as MouseEvent);
    expect(component.openDropdownIndex).toBe(0);
    component.onEscape();
    expect(component.openDropdownIndex).toBeNull();
  });
});
