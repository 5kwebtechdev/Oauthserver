import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

/** A cut-out of the artwork, placed by its bounding box as a % of the artwork (the "stage"). */
interface Layer {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Loop length in seconds. */
  dur: number;
  /** Start offset in seconds, so neighbours never pulse in sync. */
  delay: number;
  /** Drift for ghosts, px. */
  dx?: number;
  dy?: number;
}

interface Point {
  left: number;
  top: number;
  dur: number;
  delay: number;
}

// Boxes come from cutting the 1806×871 artwork (see assets/halloween-header/bg). Ghosts carry a
// soft-edged copy of the artwork; the pumpkin / lantern / bulb layers hold only the amber light pixels.
const GHOSTS: Layer[] = [
  { id: 'ghost-1', left: 22.924, top: 38.347, width: 12.514, height: 24.799, dur: 5.2, delay: 0, dx: 1.2, dy: 3.2 },
  { id: 'ghost-2', left: 39.147, top: 53.617, width: 8.084, height: 14.007, dur: 4.4, delay: -1.6, dx: -0.9, dy: 2.4 },
  { id: 'ghost-3', left: 67.11, top: 48.794, width: 8.859, height: 17.222, dur: 5.9, delay: -3.1, dx: 1, dy: 3.6 },
];

const FACES: Layer[] = [
  { id: 'face-1', left: 0.443, top: 61.998, width: 7.973, height: 13.318, dur: 5.4, delay: 0 },
  { id: 'face-2', left: 80.177, top: 74.397, width: 8.527, height: 11.022, dur: 6.6, delay: -2.2 },
  { id: 'face-3', left: 73.976, top: 78.53, width: 4.983, height: 8.037, dur: 7.4, delay: -4.1 },
  { id: 'face-4', left: 95.017, top: 77.612, width: 4.651, height: 8.266, dur: 6, delay: -1.1 },
];

const LANTERNS: Layer[] = [
  { id: 'lantern-1', left: 5.537, top: 38.576, width: 4.762, height: 11.94, dur: 3.8, delay: -0.4 },
  { id: 'lantern-2', left: 90.808, top: 51.206, width: 4.208, height: 11.022, dur: 4.9, delay: -1.9 },
  { id: 'lantern-3', left: 77.962, top: 63.146, width: 4.097, height: 10.333, dur: 5.7, delay: -3.3 },
];

const BULBS: Layer[] = [
  { id: 'bulbs-a', left: 0.72, top: 44.776, width: 97.121, height: 36.051, dur: 3.2, delay: 0 },
  { id: 'bulbs-b', left: 8.527, top: 46.498, width: 81.285, height: 32.951, dur: 4.4, delay: -1.2 },
  { id: 'bulbs-c', left: 0, top: 46.843, width: 100, height: 32.951, dur: 5.3, delay: -2.6 },
  { id: 'bulbs-d', left: 4.54, top: 47.187, width: 89.203, height: 33.525, dur: 5.9, delay: -0.7 },
];

/**
 * The three bats painted into the artwork, lifted out into sprites so the same bats flap, circle and
 * occasionally fly off. `from`/`to` mark the torso (% of the sprite width) and `pivot` the shoulder
 * height (% of the sprite height): the two wings are the sprite either side of the torso, rotated
 * about the shoulder.
 */
interface BatSprite {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  from: number;
  to: number;
  pivot: number;
  /** Loitering circle: half-width / half-height in px and the time of each half-sweep in seconds. */
  lx: number;
  ly: number;
  tx: number;
  ty: number;
  /** Seconds per wing beat. */
  flap: number;
  /** Phase offset so the three bats never beat in unison. */
  phase: number;
  /**
   * Excursion across the sky. `exit` is where it leaves to and `enter` where it comes back
   * from, as a distance from home in % of the artwork width; negative is left of home.
   */
  tour?: { exit: number; enter: number; delay: number };
}

const BATS: BatSprite[] = [
  { id: 'bat-1', left: 65.615, top: 20.781, width: 5.426, height: 5.511, from: 39.3, to: 59.7, pivot: 52.7, lx: 3.4, ly: 2.2, tx: 3.9, ty: 2.9, flap: 0.34, phase: -0.1,
    tour: { exit: 50, enter: -75, delay: -3 } },
  {
    id: 'bat-2', left: 40.255, top: 47.302, width: 4.54, height: 4.707, from: 46.3, to: 66.2, pivot: 55.1, lx: 3, ly: 2, tx: 3.6, ty: 2.7, flap: 0.36, phase: -0.22,
    tour: { exit: -52, enter: 70, delay: -10 },
  },
  {
    id: 'bat-3', left: 59.302, top: 45.695, width: 5.537, height: 6.659, from: 44.5, to: 70.2, pivot: 45.7, lx: 3.2, ly: 2.2, tx: 4.2, ty: 3.1, flap: 0.33, phase: -0.05,
    tour: { exit: 50, enter: -75, delay: -17 },
  },
];

// Stars found in the artwork. Each one twinkles briefly, then rests for most of its 6–10s loop.
const STARS: Point[] = [
  { left: 29.679, top: 3.1, dur: 6.4, delay: -1 },
  { left: 58.195, top: 16.762, dur: 8.6, delay: -4.5 },
  { left: 46.95, top: 38.57, dur: 9.8, delay: -7 },
  { left: 92.19, top: 26.5, dur: 7.4, delay: -2.8 },
];

/**
 * Halloween home-hero header (Figma 27322:15893).
 *
 * The artwork is untouched: a `plate` (ghosts and bats lifted out) plus cut-out layers that reproduce it
 * exactly at rest. Only those layers animate — moon glow, floating ghosts, the painted bats (flapping,
 * circling, occasionally crossing the sky), pumpkin faces, lanterns and fairy lights, leaves that fall
 * and land on the meadow, and twinkling stars. The clouds stay still. Everything is transform / opacity
 * based, pauses off-screen and under `prefers-reduced-motion`.
 */
@Component({
  selector: 'app-halloween-background',
  templateUrl: './halloween-background.component.html',
  styleUrl: './halloween-background.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-paused]': 'paused()' },
})
export class HalloweenBackgroundComponent {
  protected readonly assets = 'assets/halloween-header';

  protected readonly ghosts = GHOSTS;
  protected readonly faces = FACES;
  protected readonly lanterns = LANTERNS;
  protected readonly bulbs = BULBS;
  protected readonly stars = STARS;
  protected readonly bats = BATS;

  private readonly onScreen = signal(true);
  private readonly tabVisible = signal(true);
  protected readonly paused = computed(() => !this.onScreen() || !this.tabVisible());

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    const destroyRef = inject(DestroyRef);

    // Don't animate what nobody can see: off-screen, or in a background tab.
    afterNextRender(() => {
      const observer = new IntersectionObserver(([entry]) => this.onScreen.set(entry.isIntersecting));
      const onVisibility = () => this.tabVisible.set(!document.hidden);
      observer.observe(host.nativeElement);
      document.addEventListener('visibilitychange', onVisibility);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
      });
    });
  }
}
