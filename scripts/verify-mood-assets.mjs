import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const relative = 'assets/figma/child-home/moods';
const source = path.join(root, 'src', relative);
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'normalized-v1/manifest.json'), 'utf8'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
for (const [name, entry] of Object.entries(manifest)) {
  assert.equal(hash(fs.readFileSync(path.join(source, `${name === 'calm' ? 'Calm' : name}.svg`))), entry.sourceSha256, `${name}: source changed; regenerate normalized artwork`);
  const asset = fs.readFileSync(path.join(source, `normalized-v1/${name}.svg`));
  assert.equal(hash(asset), entry.sha256, `${name}: normalized asset changed`);
  assert.match(asset.toString(), /width="100" height="100" viewBox="0 0 100 100"/);
  assert.equal(entry.faceWidth, 64);
  assert.equal(entry.faceBaseline, 88);
}
function scan(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) scan(file);
    else if (/\.(ts|html|scss)$/.test(file) && !file.endsWith('.spec.ts')) {
      const text = fs.readFileSync(file, 'utf8');
      assert(!/child-home\/moods\/(?!normalized-v1\/)/.test(text), `Retired mood path in ${file}`);
      assert(!/(entry-mood-art|mood-option-art|journal-option__image)--(calm|anxious|frustrated)/.test(text), `Per-mood size override in ${file}`);
    }
  }
}
scan(path.join(root, 'src/app'));
const outputs = process.argv.slice(2);
if (process.env.CAPACITOR_PLATFORM_NAME === 'android') outputs.push('android/app/src/main/assets/public');
if (process.env.CAPACITOR_PLATFORM_NAME === 'ios') outputs.push('ios/App/App/public');
for (const output of outputs) {
  const directory = path.join(root, output, relative);
  for (const [name, entry] of Object.entries(manifest)) {
    assert.equal(hash(fs.readFileSync(path.join(directory, `normalized-v1/${name}.svg`))), entry.sha256, `Stale ${name} in ${output}`);
  }
  assert.deepEqual(fs.readdirSync(directory).sort(), ['normalized-v1'], `Retired artwork packaged in ${output}`);
}
console.log('Mood assets verified: six matching canvases/face sizes, shared mappings, no retired paths or per-mood sizing.' + (process.argv.length > 2 ? ` Bundle hashes match: ${process.argv.slice(2).join(', ')}.` : ''));
