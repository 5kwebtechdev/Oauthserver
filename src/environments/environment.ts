// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8082/v1',
  // API token to include in Authorization header when calling certain endpoints
  apiAuthToken: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJhbGljZV8wMSIsImlhdCI6MTc1MTAxNzg0MiwiZXhwIjoxNzUxMTA0MjQyfQ.C2IZ05IGlWOxIZAaVasRwMQUy3om2Bt19GeW17vhyb8'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
