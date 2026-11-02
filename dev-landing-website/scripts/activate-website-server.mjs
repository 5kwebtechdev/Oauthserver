import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Use the same production-only boundary as deploy-logged-in-app.mjs.
// The existing CI workflow restarts and saves this PM2 process afterwards.
if (process.platform === 'linux' && existsSync('/var/www')) {
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8' }));
  const current = processes.find(process => process.name === 'superme');
  // PM2 reload preserves pm_exec_path. Migrate the legacy built-in server once;
  // subsequent deployments simply reload this application's server.
  if (current && current.pm2_env.pm_exec_path !== resolve('scripts/serve-website.mjs')) {
    execFileSync('pm2', ['delete', 'superme'], { stdio: 'inherit' });
  }
  execFileSync('pm2', ['startOrReload', 'deploy/ecosystem.config.cjs', '--update-env'], { stdio: 'inherit' });
  let healthy = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const valid = await fetch('http://127.0.0.1:4200/blogs');
      const invalid = await fetch('http://127.0.0.1:4200/this-page-does-not-exist-12345');
      if (valid.status === 200 && invalid.status === 404) { healthy = true; break; }
    } catch { /* Allow the process to start. */ }
    await new Promise(done => setTimeout(done, 1000));
  }
  if (!healthy) throw new Error('Website server failed its 200/404 health check');
}
