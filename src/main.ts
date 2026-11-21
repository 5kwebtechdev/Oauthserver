import { initializeSecureSession } from './app/core/storage/session-storage';
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

window.addEventListener('superme:secure-storage-error', () => {
  const existing = document.getElementById('secure-session-error');
  if (existing) return;
  const message = document.createElement('p');
  message.id = 'secure-session-error';
  message.textContent = 'Your session could not be saved securely. Please reopen the app before continuing.';
  message.setAttribute('role', 'alert');
  document.body.appendChild(message);
});

function showStartupFailure(stage: 'storage' | 'application', error: unknown): void {
  hideStartupLoader();
  // Only a non-sensitive stage is exposed; never print tokens or an OAuth response.
  console.error('Application startup failed at stage:', stage);
  const message = document.createElement('p');
  message.textContent = stage === 'storage'
    ? 'Unable to open secure storage (STARTUP-STORAGE). Please close and reopen the app. Existing session data has not been erased.'
    : 'Unable to start the app (STARTUP-APP). Please close and reopen it.';
  message.setAttribute('role', 'alert');
  document.body.appendChild(message);
}
initializeSecureSession().then(
  () => platformBrowserDynamic().bootstrapModule(AppModule).then(hideStartupLoader)
    .catch(error => showStartupFailure('application', error)),
  error => showStartupFailure('storage', error)
);
