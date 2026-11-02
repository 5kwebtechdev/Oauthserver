import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-superme-home-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './superme-home-header.component.html',
  styleUrls: ['./superme-home-header.component.scss']
})
export class SupermeHomeHeaderComponent {
  /** Title shown on the left (large) */
  @Input() title: string = 'Made by Kids, for Kids!';

  /** Subtitle / tagline shown under the title */
  @Input() subtitle: string = 'Watch reels • Create • Get Inspired';
  /** Optional subtitle passed as HTML (use when you need <span> or <br> elements) */
  @Input() subtitleHtml?: string | null = null;

  /** Link text shown on the right */
  @Input() linkText: string = 'View all';

  /** Link href (can be external or internal) */
  @Input() linkHref: string = '#';

  /** Optional router navigation state, passed through to [routerLink]'s [state]. */
  @Input() linkState?: { [key: string]: any };

  /** If true, show a small underline style under the link */
  @Input() underline: boolean = true;

  /** When true the component will render the link using [routerLink].
   * If undefined, the component auto-detects router links when `linkHref` starts with '/'.
   */
  @Input() isRouterLink?: boolean | null = null;

  /** Emitted when the link is clicked */
  @Output() linkClick = new EventEmitter<Event>();

  handleClick(ev: Event) {
    // If href is a placeholder '#', prevent navigation by default so host can handle it
    if (!this.linkHref || this.linkHref === '#') {
      ev.preventDefault();
    }
    this.linkClick.emit(ev);
  }

  /** Whether the component should use routerLink for the current href. */
  get useRouterLink(): boolean {
    if (this.isRouterLink != null) return !!this.isRouterLink;
    if (!this.linkHref) return false;
    if (this.linkHref === '#') return false;
    // treat absolute internal paths (starting with '/') as router links
    return this.linkHref.startsWith('/');
  }
}
