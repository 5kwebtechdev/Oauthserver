import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { InstructionsForParentComponent } from './instructions-for-parent.component';

describe('InstructionsForParentComponent', () => {
  let component: InstructionsForParentComponent;
  let fixture: ComponentFixture<InstructionsForParentComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      queryParams: of({ role: 'parent' })
    };

    await TestBed.configureTestingModule({
      declarations: [InstructionsForParentComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InstructionsForParentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to join-family2 on next', () => {
    component.proceedNext();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home/join-family2'], { queryParams: { role: 'parent' } });
  });
});