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

  const capacitor = (window as any).Capacitor;
  const isNativeShell = window.location.protocol === 'capacitor:' ||
    !!(capacitor?.isNativePlatform?.());

  if (isNativeShell) {
    // Let the branded native splash finish its short reveal before handing the
    // screen to Angular. The native launch window is intentionally plain white,
    // so this loader also prevents a blank WebView frame during bootstrap.
    const remaining = Math.max(0, 2600 - (performance.now() - loaderStartedAt));
    window.setTimeout(() => {
      startupLoader.classList.add('superme-web-loader--leaving');
      window.setTimeout(() => startupLoader.remove(), 360);
    }, remaining);
    return;
  }

  // Avoid a distracting flash on fast devices while still handing control to
  // Angular quickly. The loader is removed after its short fade transition.
  const remaining = Math.max(0, 650 - (performance.now() - loaderStartedAt));
  window.setTimeout(() => {
    startupLoader.classList.add('superme-web-loader--leaving');
    window.setTimeout(() => startupLoader.remove(), 420);
  }, remaining);
};

platformBrowserDynamic().bootstrapModule(AppModule)
  .then(hideStartupLoader)
  .catch(err => {
    hideStartupLoader();
    console.log(err);
  });
