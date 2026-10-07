import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { of } from 'rxjs';
import { AcademyCourseComponent } from './academy-course.component';
import { AcademyService, CourseDetailResponse, CourseMetadata } from '../../../services/academy.service';
import { CoinService } from '../../../services/coin.service';
import { NavigationService } from '../../../services/navigation.service';

describe('Course learning metadata', () => {
  let fixture: ComponentFixture<AcademyCourseComponent>;
  const image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const item = (order: number): CourseMetadata => ({ id: order, order, text: `Learning ${order}`, imageUrl: image });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademyCourseComponent],
      providers: [
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: AcademyService, useValue: {} },
        { provide: NavigationService, useValue: {} },
        { provide: CoinService, useValue: { getTotalCoins: () => 0, loadCoinHistory: () => of({ totalCoins: 0 }) } }
      ]
    }).overrideProvider(ModalController, { useValue: {} }).compileComponents();
    fixture = TestBed.createComponent(AcademyCourseComponent);
    fixture.componentInstance.course = { id: 'preview', title: 'Course', lessons: 0, duration: '0 min', level: 'Beginner', description: '', image: image };
  });

  function render(metadata: CourseMetadata[] | null | undefined) {
    fixture.componentInstance.courseDetail = { courseMetadata: metadata } as CourseDetailResponse;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  for (const count of [1, 3, 5]) {
    it(`renders exactly ${count} API cards`, () => {
      const root = render(Array.from({ length: count }, (_, i) => item(i + 1)));
      expect(root.querySelectorAll('.learning-summary__item').length).toBe(count);
      expect(root.querySelector('.learning-summary')?.textContent).not.toContain('Think');
    });
  }

  for (const metadata of [null, undefined, []]) {
    it(`hides the section for ${JSON.stringify(metadata)} metadata`, () => {
      expect(render(metadata).querySelector('.learning-summary')).toBeNull();
    });
  }

  it('sorts without changing the API array', () => {
    const metadata = [item(30), item(2), item(10)];
    const root = render(metadata);
    expect(Array.from(root.querySelectorAll('.learning-summary__item strong')).map(el => el.textContent?.trim()))
      .toEqual(['Learning 2', 'Learning 10', 'Learning 30']);
    expect(metadata.map(entry => entry.order)).toEqual([30, 2, 10]);
  });

  it('keeps text without an image and skips missing or blank text', () => {
    const root = render([{ text: 'Text only', order: 1 }, { imageUrl: image }, { text: '   ' }]);
    expect(root.querySelectorAll('.learning-summary__item').length).toBe(1);
    expect(root.querySelector('.learning-summary__item img')).toBeNull();
    expect(root.querySelector('.learning-summary__item')?.textContent).toContain('Text only');
  });

  it('hides a failed image while preserving its learning text', () => {
    const root = render([item(1)]);
    const img = root.querySelector('.learning-summary__item img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(img.hidden).toBeTrue();
    expect(root.querySelector('.learning-summary__item')?.textContent).toContain('Learning 1');
  });
});
