import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MindfulTagsComponent } from './mindful-tags.component';

describe('MindfulTagsComponent', () => {
  let component: MindfulTagsComponent;
  let fixture: ComponentFixture<MindfulTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MindfulTagsComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MindfulTagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
