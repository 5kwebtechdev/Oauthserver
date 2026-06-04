# Mindful-Buddy Development Guidelines

## Build/Configuration Instructions

### Prerequisites
- Node.js (latest LTS version recommended)
- npm (comes with Node.js)
- Ionic CLI: `npm install -g @ionic/cli`
- Angular CLI: `npm install -g @angular/cli`


### Project Setup
1. Clone the repository
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Start the development server: `npm start`

### Build for Production
- Web: `npm run build`
- Android: `ionic capacitor build android`
- iOS: `ionic capacitor build ios`

### Environment Configuration
- Environment files are located in `src/environments/`
- For production builds, update `environment.prod.ts`


## Testing Information

### Running Tests
- Run all tests: `npm test`
- Run tests with coverage: `ng test --code-coverage`
- Run tests in CI mode (single run): `ng test --watch=false`

### Test Configuration
- Tests are configured using Karma and Jasmine
- Configuration files:
  - `karma.conf.js`: Karma configuration
  - `tsconfig.spec.json`: TypeScript configuration for tests
  - `src/test.ts`: Test entry point

