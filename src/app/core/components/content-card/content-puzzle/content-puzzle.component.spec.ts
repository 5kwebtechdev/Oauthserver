import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentPuzzleComponent } from './content-puzzle.component';

describe('ContentPuzzleComponent', () => {
  let component: ContentPuzzleComponent;
  let fixture: ComponentFixture<ContentPuzzleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ContentPuzzleComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ContentPuzzleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
