import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentDescriptionComponent } from './content-description.component';

describe('ContentDescriptionComponent', () => {
  let component: ContentDescriptionComponent;
  let fixture: ComponentFixture<ContentDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentDescriptionComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ContentDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
