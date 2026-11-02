import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcademyFulllessonPageComponent } from './academy-fulllesson-page.component';

describe('AcademyFulllessonPageComponent', () => {
  let component: AcademyFulllessonPageComponent;
  let fixture: ComponentFixture<AcademyFulllessonPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AcademyFulllessonPageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AcademyFulllessonPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});