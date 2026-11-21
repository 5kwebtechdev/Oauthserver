const CLOSE_MS = 220;

/**
 * Opens a <dialog> so it lines up exactly with `frame` (the screen's own element), whatever the
 * device width. A modal dialog is sized against the browser window, not the app, so it has to be
 * told where the app's screen is.
 */
export function showSheetInFrame(el: HTMLDialogElement, frame: HTMLElement): void {
  const fit = () => {
    const { left, width } = frame.getBoundingClientRect();
    el.style.width = `${width}px`;
    el.style.marginLeft = `${left}px`;
  };
  fit();
  window.addEventListener('resize', fit);
  el.addEventListener('close', () => window.removeEventListener('resize', fit), { once: true });
  el.showModal();
}

/** Slides an open <dialog> off the screen with its backdrop, then closes it. */
export async function slideCloseDialog(el: HTMLDialogElement): Promise<void> {
  if (!el.open) {
    return;
  }

  const animations: Animation[] = [];
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const from = getComputedStyle(el).transform;
    const timing = { duration: CLOSE_MS, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' } as const;
    animations.push(
      el.animate({ transform: [from === 'none' ? 'translateY(0)' : from, 'translateY(100%)'] }, timing),
      el.animate({ opacity: [1, 0] }, { ...timing, pseudoElement: '::backdrop' }),
    );
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  }

  el.close();
  animations.forEach((animation) => animation.cancel());
  el.style.transform = '';
}
