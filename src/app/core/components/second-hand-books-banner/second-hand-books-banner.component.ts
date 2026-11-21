import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-second-hand-books-banner',
  standalone: true,
  imports: [RouterLink],
  template: `<a routerLink="/second-hand-books" class="books-banner"
    aria-label="Second-hand Books. Pre-loved books at great prices. Browse Books">
    <img src="assets/figma/second-hand-books-placement/banner.png" alt="" decoding="async">
  </a>`,
  styles: [`
    :host { display:block; width:100%; }
    .books-banner { display:block; position:relative; width:100%; aspect-ratio:361 / 96; overflow:hidden; border-radius:16px; }
    img { position:absolute; width:105.54%; height:132.36%; max-width:none; left:-2.72%; top:-18.1%; }
    .books-banner:focus-visible { outline:2px solid #432477; outline-offset:3px; }
  `]
})
export class SecondHandBooksBannerComponent {}
