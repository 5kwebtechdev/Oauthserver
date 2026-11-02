import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LandingFooterComponent } from '../../landing/components/footer/footer.component';
import { LandingNavbarComponent } from '../../landing/components/navbar/navbar.component';

@Component({
  standalone: true,
  imports: [LandingNavbarComponent, LandingFooterComponent, RouterLink],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
})
export class NotFoundComponent implements OnInit {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  ngOnInit(): void {
    this.title.setTitle('Page Not Found | SuperMeApp');
    this.meta.updateTag({ name: 'robots', content: 'noindex,follow' });
    this.document.querySelector('link[rel="canonical"]')?.remove();
  }
}
