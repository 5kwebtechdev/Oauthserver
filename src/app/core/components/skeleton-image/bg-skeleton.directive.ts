import { Directive, ElementRef, Input, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appBgSkeleton]',
  standalone: true,
})
export class BgSkeletonDirective implements OnInit, OnChanges, OnDestroy {
  /** The image URL that will be used as the element's background-image. */
  @Input('appBgSkeleton') imageUrl: string = '';

  private pendingImg: HTMLImageElement | null = null;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit() { this.startLoad(); }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['imageUrl']) { this.startLoad(); }
  }

  private startLoad() {
    const el = this.el.nativeElement;

    if (!this.imageUrl) {
      el.classList.remove('bg-sk-loading');
      return;
    }

    if (this.pendingImg) {
      this.pendingImg.onload = null;
      this.pendingImg.onerror = null;
    }

    el.classList.add('bg-sk-loading');

    const img = new Image();
    const onDone = () => el.classList.remove('bg-sk-loading');
    img.onload = onDone;
    img.onerror = onDone;
    img.src = this.imageUrl;
    this.pendingImg = img;
  }

  ngOnDestroy() {
    if (this.pendingImg) {
      this.pendingImg.onload = null;
      this.pendingImg.onerror = null;
    }
  }
}
