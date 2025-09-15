import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewAllComponent } from './view-all.component';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';

describe('ViewAllComponent', () => {
  let component: ViewAllComponent;
  let fixture: ComponentFixture<ViewAllComponent>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);

    await TestBed.configureTestingModule({
      imports: [ViewAllComponent],
      providers: [{ provide: Router, useValue: routerSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewAllComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders fixed "View all" text', () => {
    const textEl = fixture.debugElement.query(By.css('.btn-text')).nativeElement;
    expect(textEl.textContent.trim()).toBe('View all');
  });

  it('emits clicked and navigates when href provided', async () => {
    const clickedSpy = jasmine.createSpy('clicked');
    component.href = '/test-url';
    component.clicked.subscribe(clickedSpy);
    fixture.detectChanges();

    const btn = fixture.debugElement.query(By.css('.view-all-btn'));
    btn.triggerEventHandler('click', null);
    await fixture.whenStable();

    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/test-url');
    expect(clickedSpy).toHaveBeenCalled();
  });
});
