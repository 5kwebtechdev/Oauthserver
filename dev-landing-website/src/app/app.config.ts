import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter , withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { IonicModule } from '@ionic/angular';

import { routes } from './app.routes';
// import { withRouterConfig } from '@angular/router';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    importProvidersFrom(IonicModule.forRoot()),
    // provideRouter(routes, withRouterConfig(({ 
    //   scrollPositionRestoration: 'enabled',
    //   anchorScrolling: 'enabled'
    // } as any))),
     provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      })
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideClientHydration(withEventReplay())
  ]
};
