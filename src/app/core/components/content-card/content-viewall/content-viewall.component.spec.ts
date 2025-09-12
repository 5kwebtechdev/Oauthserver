import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentViewallComponent } from './content-viewall.component';

describe('ContentViewallComponent', () => {
  let component: ContentViewallComponent;
  let fixture: ComponentFixture<ContentViewallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContentViewallComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ContentViewallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
