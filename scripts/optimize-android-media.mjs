/**
 * Android-only, lossless media packaging. All source assets and application URLs
 * stay unchanged. OptimizedMediaWebViewClient serves the generated aliases with
 * the correct MIME type, including dynamically constructed image URLs.
 * `cap copy` restores the original package before every run.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import sharp from 'sharp';

if (process.env.CAPACITOR_PLATFORM_NAME !== 'android') process.exit(0);
const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'android/app/src/main/assets/public');
const sourceDir = path.join(root, 'src/assets');
const mediaDir = path.join(publicDir, '_superme-media');
const manifestFile = path.join(publicDir, '_superme-media.json');
const reportDir = path.join(root, 'artifacts/android-size');
const cacheDir = path.join(root, 'artifacts/android-size/media-cache');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const exactEncoder = spawnSync('cwebp', ['-version'], { encoding: 'utf8' });
const hasExactEncoder = exactEncoder.status === 0;
const mime = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

async function files(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]))).flat().sort();
}
async function inventory(dir) {
  const result = {};
  for (const file of await files(dir)) {
    const data = await fs.readFile(file);
    result[path.relative(dir, file).split(path.sep).join('/')] = { bytes: data.length, sha256: sha(data) };
  }
  return result;
}

function animatedPng(input) {
  // Some PNG decoders expose only the first APNG frame in metadata().pages.
  // Inspect the PNG control chunk as well so animations are never flattened.
  for (let offset = 8; offset + 12 <= input.length;) {
    const length = input.readUInt32BE(offset);
    if (input.toString('ascii', offset + 4, offset + 8) === 'acTL') return true;
    offset += 12 + length;
  }
  return false;
}

// Running twice must never optimize the already-generated media a second time.
try {
  await fs.access(manifestFile);
  throw new Error('Optimized media already exists. Run cap copy android to restore originals first.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }

const sourceBefore = await inventory(sourceDir);
const before = await inventory(publicDir);
// Capacitor begins loading index.html while its Activity is being created.
// Keep first-paint artwork physical, even before the media client is installed.
const startupHtml = await fs.readFile(path.join(publicDir, 'index.html'), 'utf8');
const startupAssets = new Set([...startupHtml.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(match => match[1].replace(/^\//, '')).filter(value => value.startsWith('assets/')));
const manifest = { version: 1, entries: {} };
const report = { beforeBytes: 0, afterBytes: 0, compressed: [], duplicates: [], skipped: [], preservedFiles: [], sourceAssetsUnchanged: false };
report.encoder = hasExactEncoder ? `cwebp ${exactEncoder.stdout.trim()} (-lossless -exact)` : 'sharp lossless (non-identical candidates retained as PNG)';
const candidates = new Map();
const stored = new Map();
const conversionCache = new Map();
await fs.mkdir(mediaDir, { recursive: true });
await fs.mkdir(cacheDir, { recursive: true });

async function losslessWebp(input, filename) {
  const key = sha(input);
  if (conversionCache.has(key)) return conversionCache.get(key);
  const originalMeta = await sharp(input).metadata();
  let result = { data: input, extension: '.png', verified: false };
  // Keep animated images intact. Never flatten animation frames.
  if (!animatedPng(input) && (originalMeta.pages ?? 1) <= 1 && originalMeta.depth === 'uchar') {
    // libwebp's exact flag also preserves RGB values underneath fully
    // transparent pixels. Sharp does not currently expose this encoder flag.
    let output;
    const cacheFile = path.join(cacheDir, `${key}.webp`);
    try {
      try { output = await fs.readFile(cacheFile); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        output = hasExactEncoder
          ? execFileSync('cwebp', ['-quiet', '-lossless', '-exact', '-metadata', 'all', '-m', '6', filename, '-o', '-'], { maxBuffer: 64 * 1024 * 1024, timeout: 60000 })
          : await sharp(input).keepMetadata().webp({ lossless: true, effort: 6 }).toBuffer();
      }
    } catch (error) {
      report.skipped.push({ path: path.relative(publicDir, filename), reason: 'Encoder could not safely process this image; original retained' });
      conversionCache.set(key, result);
      return result;
    }
    if (output.length + 1024 < input.length) {
      const original = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const converted = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const nextMeta = await sharp(output).metadata();
      const identical = original.info.width === converted.info.width && original.info.height === converted.info.height
        && original.data.equals(converted.data)
        && (originalMeta.orientation ?? 1) === (nextMeta.orientation ?? 1)
        && (!originalMeta.icc || originalMeta.icc.equals(nextMeta.icc ?? Buffer.alloc(0)));
      if (identical) {
        result = { data: output, extension: '.webp', verified: true, width: original.info.width, height: original.info.height };
        await fs.writeFile(cacheFile, output);
      }
    }
  }
  conversionCache.set(key, result);
  return result;
}

async function alias(relative, data, extension) {
  const digest = sha(data);
  const name = `${digest}${extension}`;
  if (!stored.has(name)) {
    await fs.writeFile(path.join(mediaDir, name), data);
    stored.set(name, true);
  }
  manifest.entries[`/${relative}`] = { asset: `public/_superme-media/${name}`, mime: mime[extension] };
}

let processed = 0;
for (const [relative, info] of Object.entries(before)) {
  const extension = path.extname(relative).toLowerCase();
  // Mood SVG hashes are deliberately pinned by verify-mood-assets.mjs.
  // Fonts, audio, JSON, HTML, JS, CSS and animations remain byte-for-byte intact.
  // Rank artwork may use verified lossless WebP input; the sharing renderer
  // exports a PNG attachment. Original source artwork remains untouched.
  if (!relative.startsWith('assets/') || startupAssets.has(relative) || !mime[extension] || info.bytes < 16384 || extension === '.svg') continue;
  const input = await fs.readFile(path.join(publicDir, relative));
  const candidate = extension === '.png' ? await losslessWebp(input, path.join(publicDir, relative)) : { data: input, extension };
  const key = `${sha(candidate.data)}${candidate.extension}`;
  if (candidate.verified) {
    await alias(relative, candidate.data, candidate.extension);
    report.compressed.push({ path: relative, before: input.length, after: candidate.data.length, width: candidate.width, height: candidate.height, rgbaIdentical: true });
  } else {
    const previous = candidates.get(key);
    if (previous) {
      if (!manifest.entries[`/${previous}`]) await alias(previous, candidate.data, candidate.extension);
      await alias(relative, candidate.data, candidate.extension);
      report.duplicates.push({ path: relative, sameAs: previous, bytes: input.length });
    } else candidates.set(key, relative);
  }
  if (++processed % 25 === 0) console.log(`Android lossless media: checked ${processed} files`);
}
await fs.writeFile(`${manifestFile}.tmp`, JSON.stringify(manifest));
await fs.rename(`${manifestFile}.tmp`, manifestFile);
for (const original of Object.keys(manifest.entries)) await fs.unlink(path.join(publicDir, original.substring(1)));

// Verify every original path is either physically preserved or resolves to an
// existing verified media object. No other files may disappear or change.
const after = await inventory(publicDir);
for (const [relative, info] of Object.entries(before)) {
  const entry = manifest.entries[`/${relative}`];
  if (entry) {
    const target = entry.asset.substring('public/'.length);
    assert(after[target], `Missing optimized asset for ${relative}`);
    if (!report.compressed.some(item => item.path === relative)) assert.equal(after[target].sha256, info.sha256, `Non-identical duplicate: ${relative}`);
  } else {
    assert.deepEqual(after[relative], info, `Unexpected change or removal: ${relative}`);
    report.preservedFiles.push(relative);
  }
}
assert.deepEqual(await inventory(sourceDir), sourceBefore, 'Shared source assets changed');
report.sourceAssetsUnchanged = true;
report.beforeBytes = Object.values(before).reduce((n, entry) => n + entry.bytes, 0);
report.afterBytes = Object.values(after).reduce((n, entry) => n + entry.bytes, 0);
report.savedBytes = report.beforeBytes - report.afterBytes;
report.aliasCount = Object.keys(manifest.entries).length;
report.uniqueMediaObjects = stored.size;
report.originalInventory = before;
report.outputInventory = after;
await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(path.join(reportDir, 'lossless-media.json'), JSON.stringify(report, null, 2));
console.log(`Android media: ${(report.savedBytes / 1e6).toFixed(2)} MB saved; ${report.compressed.length} pixel-identical conversions, ${report.duplicates.length} duplicates, ${report.aliasCount} preserved URL aliases. Source assets unchanged.`);
