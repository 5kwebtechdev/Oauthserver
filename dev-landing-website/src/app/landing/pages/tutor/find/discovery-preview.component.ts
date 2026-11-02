import { Component, Input, Output, EventEmitter } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { EduhubInitialsComponent } from '../../../components/eduhub-initials/eduhub-initials.component';
import { eduHubProfileFrame } from '../../../components/eduhub-initials/eduhub-profile-frame';

@Component({
  selector: 'app-discovery-preview',
  standalone: true,
  imports: [EduhubInitialsComponent],
  template: `
    <section class="discovery" aria-labelledby="discovery-title">
      <header><span class="eyebrow">EXPLORE SUPERME</span><h1 id="discovery-title">{{ title }}</h1>
        <p>{{ intro }}</p><span class="preview-note">A little discovery today. More possibilities with your free account.</span></header>
      @if (loading) {
        <div class="state" role="status"><span class="symbol">✦</span><h2>Finding your next discovery…</h2></div>
      } @else if (error) {
        <div class="state" role="alert"><span class="symbol">↻</span><h2>Let’s try that again</h2><p>We couldn’t refresh these listings. Please check your connection and try again.</p><button (click)="retry.emit()">Try again</button></div>
      } @else if (!items.length) {
        <div class="state"><span class="symbol">✦</span><h2>Nothing to explore yet</h2><p>Login or create your SuperMe account to discover more options near you.</p><a class="cta" [href]="loginUrl">Login / Create Account</a></div>
      } @else {
        <div class="toolbar"><span>{{ visibleItems.length }} previews to explore</span><label>Sort by <select (change)="sort.emit($any($event.target).value)"><option value="recently-added">Recently added</option><option value="alphabets">Name A–Z</option></select></label></div>
        <div class="cards" [class.visual-cards]="visual">
          @for (item of visibleItems; track $index) {
            <article>
              <div class="image">
                @if (!item.avatar && hasCategoryFrame) {
                  <app-eduhub-initials [category]="category" [name]="item.name" [scale]="visual ? 2.4 : 1.5" />
                } @else if (!item.avatar) {
                  <span class="fallback" aria-hidden="true">{{ initials(item.name) }}</span>
                }
                @if (item.avatar) {
                  <img [src]="item.avatar" [alt]="item.name" loading="lazy" (error)="onImageError(item)">
                }
              </div>
              <div class="copy">
                <h2>{{ item.name }}</h2>
              </div>
              <div class="locked"><svg width="22" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg><span>More to discover inside<small>Full details{{ contact ? ' & contact information' : '' }} with your free account</small></span></div>
              <a class="cta" [href]="loginUrl">{{ cta }}</a>
            </article>
          }
        </div>
        @if (isGatedPreview && items.length > visibleItems.length) {
          <div class="more-controls">
            @if (!showMoreGate) {
              <button type="button" class="more-button" (click)="showMoreGate = true">More</button>
            } @else {
              <div class="more-gate">
                <p>Log in to view more listings and categories.</p>
                <a class="cta" [href]="loginUrl">Login to View More</a>
              </div>
            }
          </div>
        }
        <aside><h2>Your next discovery starts here</h2><p>Create your free SuperMe account to explore full details and connect.</p><a class="cta" [href]="signupUrl">Create an Account to Explore More</a></aside>
      }
    </section>`,
  styleUrl: './discovery-preview.component.scss'
})
export class DiscoveryPreviewComponent {
  @Input() title = '';
  @Input() intro = '';
  @Input() category = '';
  @Input() items: any[] = [];
  @Input() loading = false;
  @Input() error = false;
  @Input() visual = false;
  @Input() contact = false;
  @Input() previewLimit = 0;
  @Output() retry = new EventEmitter<void>();
  @Output() sort = new EventEmitter<any>();
  readonly loginUrl = `${environment.mobileAppUrl}/login`;
  readonly signupUrl = `${environment.mobileAppUrl}/signup`;
  showMoreGate = false;
  get cta(): string { return this.contact ? 'Login to View More Details & Contact' : this.visual ? 'Login to View More' : 'Login to View More Details'; }
  get isGatedPreview(): boolean { return this.previewLimit > 0; }
  get visibleItems(): any[] { return this.isGatedPreview ? this.items.slice(0, this.previewLimit) : this.items; }
  get hasCategoryFrame(): boolean { return !!eduHubProfileFrame(this.category); }

  onImageError(item: { avatar?: string }): void { item.avatar = ''; }

  /** Show a deterministic two-letter avatar when a public listing has no photo. */
  initials(name: string): string {
    const words = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    const first = words[0].charAt(0);
    const second = words.length > 1 ? words[1].charAt(0) : words[0].charAt(1);
    return `${first}${second || ''}`.toUpperCase();
  }
}
