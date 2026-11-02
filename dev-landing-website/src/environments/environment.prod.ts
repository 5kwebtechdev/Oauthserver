export const environment = {
  production: true,
  apiUrl: 'https://api.supermeapp.com/v1',
  // The marketing website remains on supermeapp.com. Authentication and all
  // logged-in routes are served by the browser build of SuperMeAppFE so the
  // same role-aware UI is shared with mobile_app_code without duplication.
  // The navbar appends /login or /signup to this base URL.
  mobileAppUrl: 'https://supermeapp.com/app',
  // apiAuthToken should NOT be hardcoded in production
  // Users must login to get their own token stored in localStorage
  apiAuthToken: '',
  // googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY'
};
