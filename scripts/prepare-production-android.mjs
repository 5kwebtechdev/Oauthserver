import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(cli, args, env = process.env) {
  const result = spawnSync(process.execPath, [resolve(root, cli), ...args], {
    cwd: root, env, stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('node_modules/@angular/cli/bin/ng.js', ['build', '--configuration', 'production', '--base-href', '/']);
run('node_modules/@capacitor/cli/bin/capacitor', ['sync', 'android'], {
  ...process.env, SUPERME_ANDROID_PRODUCTION: 'true',
});
const config = JSON.parse(readFileSync(resolve(root, 'android/app/src/main/assets/capacitor.config.json'), 'utf8'));
if (config.server?.hostname !== 'app.supermeapp.com' || config.server?.androidScheme !== 'https' || config.server?.url) {
  throw new Error('Production Android origin verification failed. Do not publish this build.');
}
console.log('Production Android assets ready: https://app.supermeapp.com');
