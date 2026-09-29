import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlanceBlankState } from './glance-blank-state';

@Component({
  selector: 'glance-blank-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="blank" [attr.data-blank-state]="state.key" [attr.data-figma-frame]="state.frame">
      <div class="art" [style.width.px]="state.width" [style.aspect-ratio]="state.width + '/' + state.height">
        <img [src]="state.image" alt="" [style.width]="state.crop.width" [style.height]="state.crop.height"
          [style.left]="state.crop.left" [style.top]="state.crop.top">
      </div>
      <div class="copy">
        <h4 [class.capitalize]="state.capitalize">{{ state.title }}</h4>
        <p [style.max-width.px]="state.textWidth">{{ state.description }}</p>
      </div>
      <div class="actions" [class.single]="!state.secondary" [style.margin-top.px]="(state.footerGap || 12) - 12">
        <button *ngIf="state.secondary" type="button" class="secondary" (click)="secondary.emit()">{{ state.secondary }}</button>
        <button type="button" class="primary" [class.primary--attention]="state.primary.startsWith('Add ')" (click)="primary.emit()">{{ state.primary }}</button>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .blank { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; font-family: var(--font-sans, 'Nunito', sans-serif); }
    .art { position: relative; max-width: 100%; overflow: hidden; flex-shrink: 0; }
    .art img { position: absolute; display: block; max-width: none; pointer-events: none; }
    .copy { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; text-align: center; }
    h4 { margin: 0; color: #282527; font: 700 20px/1.4 var(--font-sans, 'Nunito', sans-serif); }
    h4.capitalize { text-transform: capitalize; }
    p { margin: 0; width: 100%; color: #6b656a; font: 600 13px/18px var(--font-sans, 'Nunito', sans-serif); }
    .actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; }
    .actions.single { justify-content: center; }
    button { min-height: 34px; padding: 7px 15px; border-radius: 16px; font: 700 13px/18px var(--font-sans, 'Nunito', sans-serif); cursor: pointer; }
    .primary { width: 128px; padding-inline: 8px; border: 0; background: var(--blank-primary, #432477); color: white; }
    .primary--attention {
      position: relative; isolation: isolate; transform-origin: center;
      box-shadow: 0 0 0 1px rgba(139,141,203,.2), 0 2px 8px rgba(67,36,119,.12);
      animation: add-cta-breathe 12s ease-in-out infinite;
    }
    .primary--attention::before {
      content: ''; position: absolute; inset: 2px; border-radius: inherit;
      pointer-events: none; opacity: 0;
      background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,.04) 40%, rgba(255,255,255,.2) 50%, rgba(255,255,255,.04) 60%, transparent 75%);
      background-size: 300% 100%; background-position: 100% 0;
      animation: add-cta-sheen 12s ease-in-out infinite;
    }
    .primary--attention::after {
      content: ''; position: absolute; inset: 0; border-radius: inherit;
      padding: 2px; pointer-events: none;
      background: linear-gradient(120deg, #8b8dcb, #eb4b84, #f6ac72, #8b8dcb);
      background-size: 200% 200%;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      animation: add-cta-highlight 12s ease-in-out infinite;
    }
    @keyframes add-cta-highlight {
      0%, 15%, 100% { background-position: 0% 50%; opacity: .65; }
      40%, 65% { background-position: 100% 50%; opacity: .95; }
      85% { background-position: 0% 50%; opacity: .65; }
    }
    @keyframes add-cta-breathe {
      0%, 15%, 70%, 100% { transform: scale(1); box-shadow: 0 0 0 1px rgba(139,141,203,.2), 0 2px 8px rgba(67,36,119,.12); }
      35% { transform: scale(1.008); box-shadow: 0 0 0 1px rgba(235,75,132,.25), 0 2px 10px rgba(139,141,203,.2); }
      50% { transform: scale(1); box-shadow: 0 0 0 1px rgba(246,172,114,.2), 0 2px 8px rgba(67,36,119,.12); }
    }
    @keyframes add-cta-sheen {
      0%, 48% { opacity: 0; background-position: 100% 0; }
      51% { opacity: .8; }
      62% { opacity: .8; background-position: 0% 0; }
      65%, 100% { opacity: 0; background-position: 0% 0; }
    }
    .primary--attention:active { animation: none; transform: scale(1); }
    @media (prefers-reduced-motion: reduce) {
      .primary--attention { animation: none; transform: none; }
      .primary--attention::before { animation: none; opacity: 0; }
      .primary--attention::after { animation: none; opacity: .8; }
    }
    .secondary { border: 1.5px solid transparent; background: linear-gradient(white,white) padding-box, linear-gradient(120deg,var(--blank-border,#8b8dcb),#f6ac72,#85b1b5,#eb4b84) border-box; color: var(--blank-accent,#524f84); text-transform: capitalize; }
    .blank[data-blank-state="timetable-empty"] button { box-sizing: border-box; height: 34.2px; padding: 0 16px; line-height: 1.4; }
    .blank[data-blank-state="timetable-empty"] .primary--attention { animation: none; transform: none; box-shadow: none; }
    .blank[data-blank-state="timetable-empty"] .primary--attention::before,
    .blank[data-blank-state="timetable-empty"] .primary--attention::after { content: none; }
    button:focus-visible { outline: 2px solid #432477; outline-offset: 3px; }
    @media(max-width: 359px) { h4 { font-size: 18px; } }
  `]
})
export class GlanceBlankStateComponent {
  @Input({ required: true }) state!: GlanceBlankState;
  @Output() primary = new EventEmitter<void>();
  @Output() secondary = new EventEmitter<void>();
}
