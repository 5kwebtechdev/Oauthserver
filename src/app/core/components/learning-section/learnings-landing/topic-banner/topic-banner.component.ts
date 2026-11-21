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

export type LearningTopic = 'articles' | 'masterclass';

/** Longest we hold the animation back while the layer images decode (slow devices / cold cache). */
const DECODE_TIMEOUT_MS = 800;

const DEFAULT_PET = 'panda';
const PETS = [DEFAULT_PET, 'dragon', 'llama', 'owl'];

/** Headline word, spoken tagline, and the arc drawn under the word (from Figma, one per topic). */
const COPY: Record<LearningTopic, { word: string; tagline: string; underlineBox: string; underline: string }> = {
  articles: {
    word: 'Article',
    tagline: 'Informative, interesting, insightful',
    underlineBox: '0 0 122.108 9.99424',
    underline: 'M2.54583 4.02159C1.75746 4.1297 1.0495 4.54685 0.578822 5.18853C0.108077 5.82979 -0.086834 6.64305 0.035851 7.44211C0.158536 8.24117 0.588445 8.9585 1.22989 9.429C1.87139 9.89992 2.67188 10.0855 3.45638 9.95209C3.45638 9.95209 3.45638 9.95209 3.45638 9.95209C5.32839 9.63333 7.28667 9.33288 9.22063 9.05228C44.1489 4.39595 79.8265 1.85305 114.996 5.45498C116.927 5.67469 118.906 5.92948 120.821 6.20799C121.112 6.25025 121.41 6.17417 121.648 5.99916C121.887 5.82399 122.047 5.56423 122.094 5.27435C122.141 4.98447 122.071 4.68744 121.9 4.44592C121.728 4.20455 121.47 4.03847 121.181 3.98689C121.181 3.98689 121.181 3.98689 121.181 3.98689C119.251 3.64268 117.257 3.32252 115.31 3.03787C79.8491 -1.72364 43.9956 -0.302504 8.47859 3.28734C6.50159 3.51051 4.49515 3.75424 2.54583 4.02159Z',
  },
  masterclass: {
    word: 'MasterClass',
    tagline: 'Learn, explore, advance',
    underlineBox: '0 0 140.11 9.99298',
    underline: 'M2.60459 4.01361C1.81444 4.10768 1.09851 4.51211 0.615146 5.14427C0.131731 5.77606 -0.0795271 6.58381 0.0270021 7.38349C0.133531 8.18317 0.548879 8.90745 1.18083 9.39065C1.81283 9.87423 2.60966 10.0771 3.39688 9.96107C3.39688 9.96107 3.39688 9.96107 3.39688 9.96107C5.57022 9.64032 7.83571 9.33902 10.0749 9.05739C50.4619 4.39226 91.5102 1.85326 132.112 5.45667C134.343 5.67683 136.631 5.93252 138.844 6.21201C139.136 6.24887 139.433 6.16719 139.668 5.98726C139.904 5.80721 140.059 5.54366 140.1 5.25225C140.141 4.96084 140.064 4.66478 139.887 4.42684C139.711 4.18905 139.448 4.02886 139.157 3.98387C139.157 3.98387 139.157 3.98387 139.157 3.98387C136.931 3.63944 134.629 3.31907 132.386 3.03455C91.5288 -1.71994 50.3303 -0.303573 9.42987 3.28079C7.15314 3.50375 4.84565 3.74693 2.60459 4.01361Z',
  },
};

/**
 * Learnings › Articles and MasterClass banners, "Article Time!" / "MasterClass Time!"
 * (Figma: SuperMeapp › Learnings-Articles 27986:52964 and the MasterClass screen 27986:53246).
 *
 * Motion:
 *  - Headline: same as the Quiz banner. The line slides up once, the arc under the word draws in,
 *    then keeps being wiped and re-drawn with a sheen across the word and a small settle pop.
 *  - Pet: it blinks, and its three yellow rays shrink and expand.
 *  - Articles only: a very faint ripple spreads from where the pet's finger touches the tablet.
 *  - Loops pause while the banner is off screen. prefers-reduced-motion: nothing moves.
 *
 * All four pets (panda, dragon, llama, owl) run the same animation; `pet` picks which one shows.
 * Timings live at the top of topic-banner.component.scss and topic-banner-pet.scss.
 */
@Component({
  standalone: true,
  selector: 'app-topic-banner',
  templateUrl: './topic-banner.component.html',
  styleUrls: ['./topic-banner.component.scss', './topic-banner-pet.scss', './topic-banner-pets.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Learning theme, so the V1 theme tokens resolve to the Learnings colours inside the banner.
    '[class]': "'sm-theme-learning tb--' + topic()",
    '[class.is-ready]': 'ready()',
    '[class.is-offscreen]': 'offscreen()',
  },
})
export class TopicBannerComponent {
  /** Which banner this is. */
  readonly topic = input.required<LearningTopic>();
  /** Folder holding the banner art (see src/assets/topic-banner). */
  readonly assetBase = input('assets/topic-banner');
  /** The pet the user chose for the whole app: panda, dragon, llama or owl. Anything else shows the panda. */
  readonly pet = input(DEFAULT_PET);

  protected readonly copy = computed(() => COPY[this.topic()]);
  protected readonly activePet = computed(() => (PETS.includes(this.pet()) ? this.pet() : DEFAULT_PET));
  protected readonly topicAssets = computed(() => `${this.assetBase()}/${this.topic()}`);
  /** Only the chosen pet's images are requested, so the others cost nothing. */
  protected readonly petAssets = computed(() => `${this.topicAssets()}/pets/${this.activePet()}`);

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
