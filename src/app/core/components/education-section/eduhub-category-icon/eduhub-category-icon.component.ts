import { Component, Input } from '@angular/core';

/** Original Figma artwork with its design crop, shared by Home and categories. */
@Component({
  selector: 'app-eduhub-category-icon',
  standalone: true,
  template: `<span class="artwork" [style.aspect-ratio]="visual.ratio">
    <img [src]="visual.src" alt="" [style.width.%]="visual.width"
      [style.height.%]="visual.height" [style.left.%]="visual.left" [style.top.%]="visual.top">
  </span>`,
  styles: [`
    :host { display:flex; width:100%; height:100%; align-items:center; justify-content:center; }
    .artwork { display:block; position:relative; width:100%; max-height:100%; overflow:hidden; }
    img { display:block; position:absolute; max-width:none; object-fit:contain; }
  `]
})
export class EduHubCategoryIconComponent {
  @Input() category = '';
  private readonly artwork: Record<string, { ratio: string; width: number; height: number; left: number; top: number }> = {
    tutors: { ratio:'707 / 708', width:100, height:100, left:0, top:0 },
    academies: { ratio:'657 / 512', width:107.73, height:138.41, left:-3.61, top:-19.43 },
    hostels: { ratio:'614 / 440', width:115.26, height:160.56, left:-7.63, top:-31.88 },
    events: { ratio:'625 / 484', width:113.38, height:146.32, left:-6.69, top:-23.34 },
    stationery: { ratio:'590 / 436', width:119.89, height:162.02, left:-10.42, top:-32.56 },
    'book-stores': { ratio:'587 / 452', width:120.58, height:156.36, left:-10.29, top:-31.42 },
    'sports-shops': { ratio:'598 / 496', width:118.19, height:142.82, left:-9.33, top:-18.91 },
    counselors: { ratio:'1', width:100, height:100, left:0, top:0 }
  };
  get visual() {
    const aliases: Record<string,string> = {
      'store-book-stores':'book-stores', 'store-stationery-shops':'stationery',
      'store-sports-shop':'sports-shops', 'store-second-hand-books':'second-hand-books'
    };
    const key = aliases[this.category] || this.category;
    // No replacement for pre-loved books was supplied in this Figma frame.
    if (key === 'second-hand-books') return {
      ratio:'1', width:100, height:100, left:0, top:0,
      src:'assets/figma/eduhub-navigation/second-hand-books.png'
    };
    return { ...(this.artwork[key] || this.artwork['tutors']),
      src:'assets/figma/eduhub-icons-2026/'+(this.artwork[key] ? key : 'tutors')+'.png' };
  }
}
