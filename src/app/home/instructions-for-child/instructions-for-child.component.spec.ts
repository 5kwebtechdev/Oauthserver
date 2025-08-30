import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { InstructionsForChildComponent } from './instructions-for-child.component';

describe('InstructionsForChildComponent', () => {
  let component: InstructionsForChildComponent;
  let fixture: ComponentFixture<InstructionsForChildComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      queryParams: of({ role: 'child' })
    };

    await TestBed.configureTestingModule({
      declarations: [InstructionsForChildComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InstructionsForChildComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should always navigate to join-family', () => {
    component.proceedNext();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home/join-family'], { queryParams: { role: 'child' } });
  });
});