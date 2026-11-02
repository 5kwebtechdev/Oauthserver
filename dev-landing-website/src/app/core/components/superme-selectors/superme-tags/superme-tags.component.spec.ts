import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupermeTagsComponent } from './superme-tags.component';

describe('SupermeTagsComponent', () => {
  let component: SupermeTagsComponent;
  let fixture: ComponentFixture<SupermeTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SupermeTagsComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SupermeTagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
