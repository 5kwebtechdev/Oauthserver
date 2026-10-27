/** Normalize the existing SVG exports, without changing their embedded artwork.
 * All faces share a 64-unit diameter and baseline on a 100x100 canvas.
 * Run explicitly when artwork changes; prebuild verifies the committed result.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'src/assets/figma/child-home/moods');
const destination = path.join(directory, 'normalized-v1');
const names = ['excited', 'happy', 'calm', 'anxious', 'sad', 'frustrated'];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const report = {};
fs.mkdirSync(destination, { recursive: true });
for (const name of names) {
  const source = fs.readFileSync(path.join(directory, `${name === 'calm' ? 'Calm' : name}.svg`), 'utf8');
  // librsvg does not decode embedded WebP; PNG substitution is analysis-only.
  const embedded = source.match(/data:image\/webp;base64,([^"\s]+)/);
  const png = await sharp(Buffer.from(embedded[1], 'base64')).png().toBuffer();
  const renderable = source.replace(embedded[0], `data:image/png;base64,${png.toString('base64')}`);
  const { data, info } = await sharp(Buffer.from(renderable), { density: 720 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(info.width * info.height);
  let alpha = [info.width, info.height, 0, 0];
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    const [r, g, b, a] = data.subarray(i, i + 4);
    if (a > 40) alpha = [Math.min(alpha[0], x), Math.min(alpha[1], y), Math.max(alpha[2], x), Math.max(alpha[3], y)];
    if (a > 100 && r > 150 && g > 55 && b < 140 && r > g * 1.08 && g > b * 1.3) mask[y * info.width + x] = 1;
  }
  // Largest connected warm-colored region is the face, excluding detached
  // stars/leaves/lightning. Measuring total artwork would shrink decorated moods.
  let face, largest = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    const queue = [start]; mask[start] = 0;
    let bounds = [info.width, info.height, 0, 0];
    for (let n = 0; n < queue.length; n++) {
      const p = queue[n], x = p % info.width, y = Math.floor(p / info.width);
      bounds = [Math.min(bounds[0], x), Math.min(bounds[1], y), Math.max(bounds[2], x), Math.max(bounds[3], y)];
      for (const next of [x ? p - 1 : -1, x + 1 < info.width ? p + 1 : -1, p - info.width, p + info.width]) {
        if (next >= 0 && next < mask.length && mask[next]) { mask[next] = 0; queue.push(next); }
      }
    }
    if (queue.length > largest) { largest = queue.length; face = bounds; }
  }
  if (!face || largest < 1000) throw new Error(`Cannot measure ${name}`);
  const scale = 64 / ((face[2] - face[0] + 1) / 10);
  const x = 50 - ((face[0] + face[2]) / 20) * scale;
  const y = 88 - (face[3] / 10) * scale;
  const artBounds = [alpha[0] / 10 * scale + x, alpha[1] / 10 * scale + y, alpha[2] / 10 * scale + x, alpha[3] / 10 * scale + y];
  if (artBounds.some(v => v < 0 || v > 100)) throw new Error(`Artwork would clip: ${name} ${artBounds}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g transform="translate(${x} ${y}) scale(${scale})">${source}</g></svg>\n`;
  fs.writeFileSync(path.join(destination, `${name}.svg`), svg);
  report[name] = { sourceSha256: hash(source), sha256: hash(svg), sourceCanvas: [info.width / 10, info.height / 10], visibleBounds: alpha.map(v => v / 10), faceBounds: face.map(v => v / 10), normalizedArtworkBounds: artBounds, faceWidth: 64, faceBaseline: 88 };
}
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
