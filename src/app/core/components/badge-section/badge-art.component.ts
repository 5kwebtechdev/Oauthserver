import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeArt } from './badge-art.generated';
@Component({
  selector: 'app-badge-art', standalone: true, imports: [CommonModule],
  template: `<span *ngIf="art; else direct" class="crop" [style.aspect-ratio]="art.ratio" [style.clip-path]="art.clip">
    <img [src]="art.src" [alt]="label" [style.width.%]="art.width" [style.height.%]="art.height" [style.left.%]="art.left" [style.top.%]="art.top" />
  </span><ng-template #direct><img *ngIf="src" class="direct" [src]="src" [alt]="label" (error)="src = null" /></ng-template>`,
  styles: [`:host{display:block;width:80px;height:80px;flex:none}.crop{display:block;position:relative;overflow:hidden;width:100%;max-height:100%}img{display:block}.crop img{position:absolute;max-width:none;pointer-events:none}.direct{width:100%;height:100%;object-fit:contain}`],
})
export class BadgeArtComponent {
  @Input() art: BadgeArt | null = null;
  @Input() src: string | null = null;
  @Input() label = '';
}
