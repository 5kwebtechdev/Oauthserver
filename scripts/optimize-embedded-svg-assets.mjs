/**
 * Losslessly compact SVG files that contain embedded PNG rasters.
 *
 * The SVG canvas, source pixel dimensions, and rendered pixels are preserved.
 * Only the embedded PNG encoding changes to lossless WebP, which is supported
 * by the iOS 16 WKWebView used by this app and by modern browsers.
 *
 * Requires the cwebp binary (WebP tools) to be available on PATH.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const defaultFiles = [
  'src/assets/figma/child-home/moods/Calm.svg',
  'src/assets/figma/child-home/moods/anxious.svg',
  'src/assets/figma/child-home/moods/excited.svg',
  'src/assets/figma/child-home/moods/frustrated.svg',
  'src/assets/figma/child-home/moods/happy.svg',
  'src/assets/figma/child-home/moods/sad.svg',
  'src/assets/icons/Habit.svg',
  'src/assets/icons/Task.svg',
];

const files = process.argv.slice(2).length > 0 ? process.argv.slice(2) : defaultFiles;
const embeddedPng = /data:image\/png;base64,([^"\s]+)/;

for (const relativePath of files) {
  const filePath = path.resolve(root, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');

  if (source.includes('data:image/webp;base64,')) {
    console.log(`Already optimized: ${relativePath}`);
    continue;
  }

  const match = source.match(embeddedPng);
  if (!match) {
    throw new Error(`No embedded PNG found in ${relativePath}`);
  }

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'superme-svg-'));
  const pngPath = path.join(temporaryDirectory, 'source.png');
  const webpPath = path.join(temporaryDirectory, 'source.webp');

  try {
    fs.writeFileSync(pngPath, Buffer.from(match[1], 'base64'));
    execFileSync('cwebp', ['-quiet', '-lossless', '-exact', pngPath, '-o', webpPath]);
    const webpBase64 = fs.readFileSync(webpPath).toString('base64');
    const optimized = source.replace(
      `data:image/png;base64,${match[1]}`,
      `data:image/webp;base64,${webpBase64}`,
    );
    fs.writeFileSync(filePath, optimized, 'utf8');
    console.log(`Optimized: ${relativePath}`);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}
