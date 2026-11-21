import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

/** Longest we hold the animation back while the layer images decode (slow devices / cold cache). */
const DECODE_TIMEOUT_MS = 800;

const DEFAULT_PET = 'panda';
const PETS = [DEFAULT_PET, 'dragon', 'llama', 'owl'];

/**
 * Learnings › Quiz tab banner, "Quiz Time!" (Figma: SuperMeapp › Learnings-Quiz, node 27968:51674).
 *
 * Motion:
 *  - Headline (same treatment as the EduHub "Tutor" / "Counselor" headers): the line slides up once,
 *    the arc under "Quiz" draws in, then keeps being wiped and re-drawn with a sheen across the word
 *    and a small settle pop.
 *  - Pet, one 8s loop: blinks -> tilts its head towards the clipboard -> the question lines and the
 *    four options appear on the sheet one after another -> the yellow rays shrink and expand ->
 *    the head comes back up, the sheet clears and the loop starts again.
 *  - Loops pause while the banner is off screen.
 *  - prefers-reduced-motion: the finished banner (filled sheet), nothing moves.
 *
 * All four pets (panda, dragon, llama, owl) run the same animation; `pet` picks which one shows.
 * Timings live at the top of quiz-banner.component.scss and quiz-banner-pet.scss.
 */
@Component({
  standalone: true,
  selector: 'app-quiz-banner',
  templateUrl: './quiz-banner.component.html',
  styleUrls: ['./quiz-banner.component.scss', './quiz-banner-pet.scss', './quiz-banner-pets.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Learning theme, so the V1 theme tokens resolve to the Learnings colours inside the banner.
    class: 'sm-theme-learning',
    '[class.is-ready]': 'ready()',
    '[class.is-offscreen]': 'offscreen()',
  },
})
export class QuizBannerComponent {
  /** Folder holding the banner art (see src/assets/quiz-banner). */
  readonly assetBase = input('assets/quiz-banner');
  /** The pet the user chose for the whole app: panda, dragon, llama or owl. Anything else shows the panda. */
  readonly pet = input(DEFAULT_PET);

  protected readonly activePet = computed(() => (PETS.includes(this.pet()) ? this.pet() : DEFAULT_PET));
  /** Only the chosen pet's images are requested, so the others cost nothing. */
  protected readonly petAssets = computed(() => `${this.assetBase()}/pets/${this.activePet()}`);

  /** Starts the animation once the layers are decoded, so nothing pops in half way through. */
  protected readonly ready = signal(false);
  protected readonly offscreen = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const el = this.host.nativeElement;

      const layers = Array.from(el.querySelectorAll<HTMLImageElement>('img[data-layer]'));
      const decoded = Promise.all(layers.map(img => img.decode().catch(() => undefined)));
      let destroyed = false;
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise(resolve => { timer = setTimeout(resolve, DECODE_TIMEOUT_MS); });
      Promise.race([decoded, timeout]).then(() => {
        clearTimeout(timer);
        if (!destroyed) this.ready.set(true);
      });

      const observer = new IntersectionObserver(([entry]) => this.offscreen.set(!entry.isIntersecting));
      observer.observe(el);
      this.destroyRef.onDestroy(() => { destroyed = true; clearTimeout(timer); observer.disconnect(); });
    });
  }
}
