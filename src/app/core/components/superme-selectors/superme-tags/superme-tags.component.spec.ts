import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupermeTagsComponent } from './superme-tags.component';

describe('SupermeTagsComponent', () => {
  let component: SupermeTagsComponent;
  let fixture: ComponentFixture<SupermeTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupermeTagsComponent]
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

  it('allows only explicitly user-created server tags to be deleted', () => {
    component.serverManaged = true;
    component.options = [
      { key: 1, value: 'Study', system: true },
      { key: 2, value: 'My Tag', system: false },
      { key: 3, value: 'Unknown' }
    ];

    expect(component.canDeleteTag(1)).toBeFalse();
    expect(component.canDeleteTag(2)).toBeTrue();
    expect(component.canDeleteTag(3)).toBeFalse();
  });

  it('does not offer editing when the activity API has no update endpoint', () => {
    component.serverManaged = true;
    component.allowEdit = false;
    component.options = [{ key: 2, value: 'My Tag', system: false }];

    expect(component.canEditTag(2)).toBeFalse();
  });

  it('keeps local predefined tags protected while allowing local custom tags', () => {
    component.serverManaged = false;
    component.options = [
      { key: 1, value: 'Study' },
      { key: 2, value: 'My Tag', type: 'custom' }
    ];

    expect(component.canEditTag(1)).toBeFalse();
    expect(component.canDeleteTag(1)).toBeFalse();
    expect(component.canEditTag(2)).toBeTrue();
    expect(component.canDeleteTag(2)).toBeTrue();
  });
});
