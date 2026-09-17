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

const startupLoader = document.getElementById('superme-web-loader');
const loaderStartedAt = performance.now();

const hideStartupLoader = () => {
  if (!startupLoader) return;

  // Keep the branded splash visible long enough for its reveal to complete on
  // every platform, then hand control to Angular's resolved route (login for
  // guests or the appropriate dashboard for signed-in users).
  const minimumDuration = 2600;
  const remaining = Math.max(0, minimumDuration - (performance.now() - loaderStartedAt));
  window.setTimeout(() => {
    startupLoader.classList.add('superme-web-loader--leaving');
    window.setTimeout(() => startupLoader.remove(), 360);
  }, remaining);

};

platformBrowserDynamic().bootstrapModule(AppModule)
  .then(hideStartupLoader)
  .catch(err => {
    hideStartupLoader();
    console.log(err);
  });
