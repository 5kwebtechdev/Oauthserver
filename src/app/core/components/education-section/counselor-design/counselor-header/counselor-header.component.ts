import { EduHubCityService } from '../../../../services/eduhub-city.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { EduHubCitySelectorComponent } from '../../eduhub-city-selector/eduhub-city-selector.component';
import { PetAgeService } from '../../../../services/pet-age.service';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { ReferBannerComponent } from '../refer-banner/refer-banner.component';
import { CounselorFiltersComponent } from '../counselor-filters/counselor-filters.component';
import { CounselorFilterState } from '../counselor-filters/counselor-filters.data';

/** One country's background layers. Two exist only while cross-fading between countries. */
interface SceneSet {
  id: number;
  scene: string;
  /** The set shown on open, which runs the parallax. Later swaps just fade in. */
  intro: boolean;
}

/** Longest we hold the intro back while layer images decode (slow devices / cold cache). */
const DECODE_TIMEOUT_MS = 800;

/** Scroll distance (px) over which the header goes from the full view to the collapsed bar. */
const COLLAPSE_DISTANCE = 72;

/** How long scrolling must be quiet before a half-collapsed header finishes its move. */
const SETTLE_DELAY_MS = 120;

/**
 * EduHub › Counselor header (Figma: SuperMeapp › Counselor-Header, node 27447:17892).
 *
 * Motion:
 *  - Intro (plays once per mount): one camera pull-back across depth layers. Every layer shares
 *    the same duration and easing; only the amplitude changes with depth (sky ≈ static,
 *    skyline small, foreground trees + pet large).
 *  - Loops: the location pin hops (gravity arc, squash on landing); the pet stays still.
 *    "Counselor" keeps re-drawing its underline with a sheen + settle pop. Loops pause off-screen.
 *  - Headline: both lines slide in during the intro, then stay still. Once the camera settles,
 *    the underline draws in under "Counselor" and its loop (redraw, sheen, pop) takes over.
 *  - prefers-reduced-motion: everything renders in its final state with no movement.
 *
 * Below the scene: the "Know a Counselor?" referral banner and the filter bar + sheet.
 *
 * Scrolling (Swiggy pattern): the nav and filter bar pin to the top; the scene, headline and banner
 * scroll away behind them. The nav turns white and the hero recedes and fades as the user scrolls,
 * and all of it reverses on the way back to the top.
 */
const DEFAULT_PET = 'panda';
const PETS = [DEFAULT_PET, 'llama', 'owl', 'dragon'];

@Component({
  standalone: true,
  selector: 'app-counselor-header',
  imports: [EduHubCitySelectorComponent, ReferBannerComponent, CounselorFiltersComponent],
  templateUrl: './counselor-header.component.html',
  styleUrls: ['./counselor-header.component.scss', './counselor-header-pet.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-ready]': 'ready()',
    '[class.is-offscreen]': 'offscreen()',
    '[class.is-pinned]': 'pinned()',
    '[class.is-stuck]': 'stuck()',
  },
})
export class CounselorHeaderComponent {
  readonly country = input('India');
  readonly countryFlag = input('🇮🇳');
  /** City on the second chip; null shows a "Select city" prompt. */
  readonly place = input<string | null>('Mumbai');
  /** Country code picking the background: the folder in assets/counselor-header/bg. */
  readonly scene = input('in');
  private readonly locationCountry = toSignal(inject(EduHubCityService).country$, { initialValue: 'IN' });
  private readonly selectedScene = computed(() => this.locationCountry().toLowerCase());
  /** Folder holding the header layers (see src/assets/counselor-header). */
  readonly assetBase = input('assets/counselor-header');
  /** The pet the user chose for the whole app: panda, llama, owl or dragon. Anything else shows the panda. */
  readonly pet = input('panda');

  readonly back = output<void>();
  readonly countryClick = output<void>();
  readonly placeClick = output<void>();
  readonly search = output<void>();
  /** "Refer for listing" CTA. */
  readonly refer = output<void>();
  /** Ticked options, each time filters are applied or a one-tap chip changes. */
  readonly filterState = input<CounselorFilterState>({ selections: {} });
  readonly filtersChange = output<CounselorFilterState>();

  private readonly pets = inject(PetAgeService);
  private readonly petState = toSignal(this.pets.petData$, { initialValue: this.pets.getCurrentPetData() });
  protected readonly activePet = computed(() => {
    const pet = this.petState().petType || DEFAULT_PET;
    return PETS.includes(pet) ? pet : DEFAULT_PET;
  });
  /** Only the chosen pet's images are requested, so the others cost nothing. */
  protected readonly petAssets = computed(() => `${this.assetBase()}/pets/${this.activePet()}`);

  /** Starts the intro once the layers are decoded, so nothing pops in mid-animation. */
  protected readonly ready = signal(false);
  protected readonly offscreen = signal(false);
  protected readonly sceneSets = signal<SceneSet[]>([]);
  /** The nav's background has turned white. */
  protected readonly pinned = signal(false);
  /** The filter bar has reached the nav and is pinned under it. */
  protected readonly stuck = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private nextSetId = 0;

  constructor() {
    effect(() => {
      const scene = this.selectedScene();
      const shown = untracked(this.sceneSets).slice(-1)[0];
      if (!shown) {
        this.sceneSets.set([{ id: this.nextSetId++, scene, intro: true }]);
      } else if (shown.scene !== scene) {
        this.swapScene(scene);
      }
    });

    afterNextRender(() => {
      const el = this.host.nativeElement;

      const layers = Array.from(el.querySelectorAll<HTMLImageElement>('img[data-layer]'));
      const decoded = Promise.all(layers.map((img) => img.decode().catch(() => undefined)));
      const timeout = new Promise((resolve) => setTimeout(resolve, DECODE_TIMEOUT_MS));
      Promise.race([decoded, timeout]).then(() => this.ready.set(true));

      const observer = new IntersectionObserver(([entry]) => this.offscreen.set(!entry.isIntersecting));
      observer.observe(el.querySelector('.th-top')!);
      this.destroyRef.onDestroy(() => observer.disconnect());

      this.trackScroll(el);
    });
  }

  protected layerUrl(scene: string, layer: 'sky' | 'skyline' | 'trees'): string {
    return `${this.assetBase()}/bg/${scene}/${layer}.webp`;
  }

  /** The cross-fade has finished, so older sets underneath can go. */
  protected onSceneShown(set: SceneSet, event: AnimationEvent): void {
    if (event.target === event.currentTarget && !set.intro) {
      this.sceneSets.update((sets) => sets.slice(sets.indexOf(set)));
    }
  }

  /** Loads the new background first, so the cross-fade never reveals a half-loaded image. */
  private async swapScene(scene: string): Promise<void> {
    const layers = (['sky', 'skyline', 'trees'] as const).map((layer) => {
      const image = new Image();
      image.src = this.layerUrl(scene, layer);
      return image.decode();
    });
    await Promise.all(layers.map(layer => layer.catch(() => undefined)));
    if (this.selectedScene() !== scene) {
      return; // the user has already picked another country
    }

    const set: SceneSet = { id: this.nextSetId++, scene, intro: false };
    const noFade = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.sceneSets.update((sets) => (noFade ? [set] : [...sets, set]));
  }

  /** Whether the filter bar is pinned, meaning the list below it has scrolled underneath. */
  isFilterBarPinned(): boolean {
    return this.stuck();
  }

  /** Distance from the top of the scroller to the bottom of the pinned bar. */
  pinnedBarHeight(): number {
    const filters = this.host.nativeElement.querySelector<HTMLElement>('.th-filters')!;
    return parseFloat(getComputedStyle(filters).top) + filters.offsetHeight;
  }

  /**
   * Drives the collapse. Measures how far the scene has moved past the pinned nav, which works in
   * any scroller (window, ion-content), and listens in the capture phase because scroll events
   * don't bubble.
   */
  private trackScroll(el: HTMLElement): void {
    const nav = el.querySelector<HTMLElement>('.th-nav')!;
    const top = el.querySelector<HTMLElement>('.th-top')!;
    const filters = el.querySelector<HTMLElement>('.th-filters')!;
    let frame = 0;
    let scroller: Element | Window = window;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let touching = false;

    const update = () => {
      frame = 0;
      const navBox = nav.getBoundingClientRect();
      const topBox = top.getBoundingClientRect();
      const scrolled = Math.min(Math.max(0, navBox.top - topBox.top), topBox.height);
      const progress = Math.min(scrolled / COLLAPSE_DISTANCE, 1);

      el.style.setProperty('--th-scroll', `${scrolled}px`);
      el.style.setProperty('--th-progress', String(progress));
      this.pinned.set(progress > 0.5);
      this.stuck.set(!!filters && filters.getBoundingClientRect().top - navBox.bottom < 0.5);
    };

    // The header never rests half-faded: when scrolling stops inside the collapse range, it
    // finishes the move in whichever direction is nearer.
    const settle = () => {
      if (touching) {
        return;
      }
      const scrollerTop = scroller instanceof Element ? scroller.getBoundingClientRect().top : 0;
      const offset = scrollerTop - top.getBoundingClientRect().top;
      const collapsedAt = COLLAPSE_DISTANCE - parseFloat(getComputedStyle(nav).top);
      if (offset > 0 && offset < collapsedAt) {
        scroller.scrollBy({
          top: offset < collapsedAt / 2 ? -offset : collapsedAt - offset,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
      }
    };
    const scheduleSettle = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, SETTLE_DELAY_MS);
    };

    const onScroll = (event: Event) => {
      frame ||= requestAnimationFrame(update);
      // Ignore other scrollers on the screen, like the filter bar or a sheet's list.
      const target = event.target;
      if (target === document || target === scroller || (target instanceof Element && target.contains(el))) {
        scroller = target === document ? window : (target as Element);
        scheduleSettle();
      }
    };

    const listeners = new AbortController();
    const options = { capture: true, passive: true, signal: listeners.signal };
    document.addEventListener('scroll', onScroll, options);
    // Ionic scrolls inside its shadow root; that scroll event does not reach document.
    const content = el.closest('ion-content');
    if (content) {
      void content.getScrollElement().then(scrollElement => {
        if (listeners.signal.aborted) return;
        scroller = scrollElement;
        scrollElement.addEventListener('scroll', onScroll, options);
        update();
      });
    }
    window.addEventListener('resize', () => (frame ||= requestAnimationFrame(update)), options);
    document.addEventListener('touchstart', () => (touching = true), options);
    for (const type of ['touchend', 'touchcancel']) {
      document.addEventListener(
        type,
        () => {
          touching = false;
          scheduleSettle();
        },
        options,
      );
    }
    update();

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
      listeners.abort();
    });
  }
}
