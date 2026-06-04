import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { register } from 'swiper/element/bundle';

// Only register Swiper custom elements once (avoids errors during HMR/reloads)
try {
  if (typeof customElements !== 'undefined' && !customElements.get('swiper-container')) {
    register();
  }
} catch (e) {
  // If registration fails, log and continue — app can still run without web components
  // (Swiper is also used via global bundle in some modules)
  console.warn('Swiper register skipped or failed:', e);
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
