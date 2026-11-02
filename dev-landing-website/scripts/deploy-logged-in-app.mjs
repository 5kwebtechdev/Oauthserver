import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

// Local builds should stay fast and side-effect free. The production website
// workflow builds on the Linux web server where /var/www contains the current
// logged-in bundle served at /app/.
if (process.platform !== 'linux' || !existsSync('/var/www')) {
  console.log('Skipping logged-in app deployment outside the production web server.');
  process.exit(0);
}

function findAppIndexes(root) {
  const queue = [root];
  const matches = [];
  while (queue.length) {
    const current = queue.shift();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.name === 'index.html') {
        try {
          if (readFileSync(fullPath, 'utf8').includes('<base href="/app/">')) matches.push(fullPath);
        } catch {
          // Ignore unreadable files and keep looking for the active bundle.
        }
      }
    }
  }
  return matches;
}

const appIndexes = findAppIndexes('/var/www');
const scoreAppIndex = (indexPath) => {
  const normalized = indexPath.toLowerCase();
  let score = 0;
  if (dirname(indexPath).endsWith('/app')) score += 100;
  if (normalized.includes('backup')) score -= 1000;
  if (normalized.includes('.deploy-superme-app') || normalized.includes('node_modules')) score -= 1000;
  return score;
};
const liveIndex = appIndexes.sort((left, right) => scoreAppIndex(right) - scoreAppIndex(left))[0];
if (!liveIndex) throw new Error('Unable to locate the live /app/ document root.');

const liveAppDir = dirname(liveIndex);
// A clean extraction prevents deleted components/assets from surviving builds.
const appSourceDir = mkdtempSync(resolve(process.cwd(), '.deploy-superme-app-'));
const sourceArchive = resolve(process.cwd(), 'deploy/logged-in-app-source.tar.gz');

if (!existsSync(sourceArchive)) throw new Error('Logged-in app source archive is missing.');

// Assets belong to the same source snapshot, never to a previous live bundle.
// Split archive parts stay below the repository's individual-file size limit.
const archiveParts = readdirSync(resolve('deploy'))
  .filter(name => /^logged-in-app-assets\.tar\.gz\.part-\d+$/.test(name)).sort();
if (!archiveParts.length) throw new Error('Logged-in app asset snapshot is missing.');
execFileSync('tar', ['-xzf', sourceArchive, '-C', appSourceDir], { stdio: 'inherit' });
execFileSync('tar', ['-xzf', '-', '-C', appSourceDir], {
  input: Buffer.concat(archiveParts.map(name => readFileSync(resolve('deploy', name)))),
  stdio: ['pipe', 'inherit', 'inherit']
});

const run = (command, args) => execFileSync(command, args, { cwd: appSourceDir, stdio: 'inherit' });
run('npm', ['ci', '--legacy-peer-deps']);
run('npm', ['run', 'build', '--', '--configuration', 'production', '--base-href', '/app/']);

const builtAppDir = join(appSourceDir, 'www');
if (!existsSync(join(builtAppDir, 'index.html'))) throw new Error('Logged-in app build output is missing.');

// Publish hashed bundles/assets before switching the entry document.
for (const name of readdirSync(builtAppDir).filter(name => name !== 'index.html')) {
  cpSync(join(builtAppDir, name), join(liveAppDir, name), { recursive: true, force: true });
}
cpSync(join(builtAppDir, 'index.html'), join(liveAppDir, 'index.html'));
rmSync(appSourceDir, { recursive: true }); // Only the mkdtemp build directory above.
console.log(`Logged-in app deployed to ${liveAppDir}`);
