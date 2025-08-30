import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { JoinFamily2Component } from './join-family2.component';
import { CoreService } from '../../core/services/core.service';

describe('JoinFamily2Component', () => {
  let component: JoinFamily2Component;
  let fixture: ComponentFixture<JoinFamily2Component>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockCoreService: jasmine.SpyObj<CoreService>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockCoreService = jasmine.createSpyObj('CoreService', ['triggerToasrt']);
    mockActivatedRoute = {
      queryParams: of({ role: 'parent' })
    };

    await TestBed.configureTestingModule({
      declarations: [JoinFamily2Component],
      imports: [ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: CoreService, useValue: mockCoreService }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(JoinFamily2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with parent role from query params', () => {
    expect(component.userRole).toBe('parent');
  });

  it('should navigate to join-family when join mode is selected', () => {
    component.selectMode('join');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home/join-family'], { queryParams: { role: 'parent' } });
  });

  it('should validate family name form', () => {
    const familyNameControl = component.familyForm.get('familyName');
    
    // Test required validation
    familyNameControl?.setValue('');
    expect(familyNameControl?.invalid).toBeTruthy();
    
    // Test minlength validation
    familyNameControl?.setValue('a');
    expect(familyNameControl?.invalid).toBeTruthy();
    
    // Test valid input
    familyNameControl?.setValue('Test Family');
    expect(familyNameControl?.valid).toBeTruthy();
  });

  it('should show error message for invalid form submission', () => {
    component.familyForm.get('familyName')?.setValue('');
    component.createFamily();
    expect(mockCoreService.triggerToasrt).toHaveBeenCalledWith('Please enter a valid family name (2-30 characters)');
  });
});