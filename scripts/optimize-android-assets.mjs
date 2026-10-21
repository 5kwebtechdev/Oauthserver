/** Android-only packaging cleanup. Source/website assets are never modified.
 * Run after `cap copy android`; that copy restores all originals before each run.
 * Every recompressed image must decode to identical RGBA pixels and dimensions.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

if (process.env.CAPACITOR_PLATFORM_NAME && process.env.CAPACITOR_PLATFORM_NAME !== 'android') process.exit(0);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'src/assets');
const outputRoot = path.join(root, 'android/app/src/main/assets/public');
const reportRoot = path.join(root, 'artifacts/android-size');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
async function files(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]))).flat();
}
async function inventory(dir) {
  return Object.fromEntries(await Promise.all((await files(dir)).map(async file => {
    const data = await fs.readFile(file);
    return [path.relative(dir, file), { bytes: data.length, sha256: hash(data) }];
  })));
}

// Legacy Figma tab exports. Runtime tabs use home-glance/*.webp or icons/*.svg.
// The only dynamic home-blank-states consumer is the closed GLANCE_BLANK_STATES
// table (habits/tasks/tasks-completed/planner/all/all-passed), not tab assets.
// Keep the shared originals: only these exact generated Android copies are omitted.
const omitted = [
  'tab-all.png', 'tab-habit.png', 'tab-habit-selected.png',
  'tab-task.png', 'tab-task-selected.png', 'tab-planner.png', 'tab-planner-selected.png'
].map(name => `assets/figma/home-blank-states/${name}`);

const sourcesBefore = await inventory(sourceRoot);
const before = await inventory(outputRoot);
const report = { omitted: [], optimized: [], unchangedImages: 0, sourceAssetsUnchanged: false, unexpectedMissingFiles: [] };
// Fail closed if one of the retired filenames becomes directly referenced again.
const referenceFiles = (await Promise.all(['src/app', 'src/theme', 'android/app/src/main/res', 'android/app/src/main/java']
  .map(dir => files(path.join(root, dir))))).flat().filter(file => /\.(ts|html|scss|css|json|xml|java|kt)$/.test(file));
const references = await Promise.all(referenceFiles.map(async file => [file, await fs.readFile(file, 'utf8')]));
for (const relative of omitted) {
  const name = path.basename(relative);
  const found = references.find(([, text]) => text.includes(name));
  if (found) throw new Error(`Retired asset referenced again: ${name} in ${found[0]}. Review the exclusion.`);
}

const cache = new Map();
async function compactPng(input) {
  const key = hash(input);
  if (cache.has(key)) return cache.get(key);
  const metadata = await sharp(input).metadata();
  if ((metadata.pages ?? 1) > 1) return input;
  const output = await sharp(input).keepMetadata().png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();
  if (output.length >= input.length) { cache.set(key, input); return input; }
  const original = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const candidate = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const nextMetadata = await sharp(output).metadata();
  if (original.info.width !== candidate.info.width || original.info.height !== candidate.info.height
      || !original.data.equals(candidate.data)
      || (metadata.icc && !metadata.icc.equals(nextMetadata.icc ?? Buffer.alloc(0)))) {
    throw new Error('Lossless image verification failed; original asset retained.');
  }
  cache.set(key, output);
  return output;
}

let processed = 0;
for (const [relative, info] of Object.entries(before)) {
  if (omitted.includes(relative) || info.bytes < 16384 || !/\.(png|svg)$/i.test(relative)) continue;
  const file = path.join(outputRoot, relative);
  const input = await fs.readFile(file);
  let output = input;
  if (/\.png$/i.test(relative)) {
    output = await compactPng(input);
  } else {
    let text = input.toString('utf8');
    for (const match of [...text.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)]) {
      const original = Buffer.from(match[1], 'base64');
      const compact = await compactPng(original);
      if (compact.length < original.length) text = text.replace(match[0], `data:image/png;base64,${compact.toString('base64')}`);
    }
    output = Buffer.from(text);
  }
  if (output.length < input.length) {
    await fs.writeFile(file, output);
    report.optimized.push({ path: relative, before: input.length, after: output.length, pixelsIdentical: true });
  } else report.unchangedImages++;
  if (++processed % 25 === 0) console.log(`Verified ${processed} images`);
}
for (const relative of omitted) {
  if (!before[relative]) continue;
  await fs.unlink(path.join(outputRoot, relative));
  report.omitted.push({ path: relative, bytes: before[relative].bytes, sourceRetained: true });
}
const after = await inventory(outputRoot);
report.sourceAssetsUnchanged = JSON.stringify(sourcesBefore) === JSON.stringify(await inventory(sourceRoot));
report.unexpectedMissingFiles = Object.keys(before).filter(name => !after[name] && !omitted.includes(name));
report.beforeBytes = Object.values(before).reduce((sum, entry) => sum + entry.bytes, 0);
report.afterBytes = Object.values(after).reduce((sum, entry) => sum + entry.bytes, 0);
report.savedBytes = report.beforeBytes - report.afterBytes;
await fs.mkdir(reportRoot, { recursive: true });
await fs.writeFile(path.join(reportRoot, 'optimization.json'), JSON.stringify(report, null, 2));
if (!report.sourceAssetsUnchanged || report.unexpectedMissingFiles.length) throw new Error('Asset inventory verification failed.');
console.log(`Android assets: saved ${(report.savedBytes / 1048576).toFixed(2)} MiB; ${report.optimized.length} lossless changes; ${report.omitted.length} retired generated copies omitted. Shared sources unchanged.`);
