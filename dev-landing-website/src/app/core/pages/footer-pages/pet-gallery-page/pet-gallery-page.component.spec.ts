import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PetGalleryPageComponent } from './pet-gallery-page.component';

describe('PetGalleryPageComponent', () => {
  let component: PetGalleryPageComponent;
  let fixture: ComponentFixture<PetGalleryPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetGalleryPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PetGalleryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 4 pets in the array', () => {
    expect(component.pets.length).toBe(4);
  });

  it('should have correct pet names', () => {
    const petNames = component.pets.map(pet => pet.name);
    expect(petNames).toContain('Zephyr the Panda');
    expect(petNames).toContain('Orion the Owl');
    expect(petNames).toContain('Nova the Llama');
    expect(petNames).toContain('Phoenix the Dragon');
  });
});
