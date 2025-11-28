import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultPageComponent } from './result-page.component';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('ResultPageComponent', () => {
  let component: ResultPageComponent;
  let fixture: ComponentFixture<ResultPageComponent>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        IonicModule.forRoot(),
        ResultPageComponent
      ],
      providers: [
        { provide: Router, useValue: routerSpyObj }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultPageComponent);
    component = fixture.componentInstance;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with badges', () => {
    expect(component.quizAceBadge).toBeDefined();
    expect(component.puzzleMasterBadge).toBeDefined();
    expect(component.quizAceBadge.name).toBe('Quiz Ace');
    expect(component.puzzleMasterBadge.name).toBe('Puzzle Master');
  });

  it('should navigate on cancel', () => {
    component.onCancel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate on continue', () => {
    component.onContinue();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });
});