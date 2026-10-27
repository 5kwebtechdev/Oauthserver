// Extract original embedded raster artwork and Figma crop geometry, without redrawing it.
// Usage: node scripts/extract-badge-figma-assets.mjs /path/to/Assets.svg
import fs from 'node:fs';
const svg = fs.readFileSync(process.argv[2], 'utf8');
const folder = 'src/assets/figma/badges';
fs.mkdirSync(folder, { recursive: true });
const attrs = s => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
const images = {};
for (const match of svg.matchAll(/<image\b[^>]*\/>/g)) {
  const a = attrs(match[0]);
  const data = a['xlink:href'].match(/^data:image\/(png|jpeg);base64,(.*)$/);
  if (!data) throw new Error('Unexpected image encoding');
  const file = `${a.id}.${data[1]}`;
  fs.writeFileSync(`${folder}/${file}`, Buffer.from(data[2], 'base64'));
  images[a.id] = { src: `${folder.replace('src/', '')}/${file}`, width: +a.width, height: +a.height };
}
const categories = ['coin-chaser','quiz-ace','speed-reader','habit-flow','daily-grit','task-crusher','daily-learner','pet-squad','creator-mode','like-magnet','streak-peak','crown-collector','squad-builder','lesson-sharp','journal-flow'];
const result = {};
for (let i = 0; i < 77; i++) {
  const id = `${i}_0_1`;
  const group = svg.match(new RegExp(`<g clip-path="url\\(#clip${id}\\)">\\s*(<rect[^>]+>)`));
  const rect = attrs(group[1]);
  const clip = attrs(svg.match(new RegExp(`<clipPath id="clip${id}">\\s*(<rect[^>]+>)`))[1]);
  const use = attrs(svg.match(new RegExp(`<pattern id="pattern${id}"[^>]*>\\s*(<use[^>]+>)`))[1]);
  const [a,, ,d,e,f] = use.transform.match(/matrix\(([^)]+)\)/)[1].split(/\s+/).map(Number);
  const [cx,cy] = clip.transform.match(/translate\(([^)]+)\)/)[1].split(/\s+/).map(Number);
  const image = images[use['xlink:href'].slice(1)];
  const key = i < 75 ? `${categories[Math.floor(i/5)]}-${i%5+1}` : i === 75 ? 'individual-habit' : 'individual-task';
  result[key] = { src: image.src, ratio: +clip.width / +clip.height,
    clip: `inset(${Math.max(0,+rect.y-cy)/+clip.height*100}% ${Math.max(0,cx + +clip.width - +rect.x - +rect.width)/+clip.width*100}% ${Math.max(0,cy + +clip.height - +rect.y - +rect.height)/+clip.height*100}% ${Math.max(0,+rect.x-cx)/+clip.width*100}%)`,
    width: +rect.width*a*image.width/+clip.width*100,
    height: +rect.height*d*image.height/+clip.height*100,
    left: (+rect.x + +rect.width*e-cx)/+clip.width*100,
    top: (+rect.y + +rect.height*f-cy)/+clip.height*100 };
}
fs.writeFileSync('src/app/core/components/badge-section/badge-art.generated.ts',
  '// Generated from Figma node 288-2520 within 288-78. Do not substitute artwork.\n' +
  'export interface BadgeArt { src: string; ratio: number; clip: string; width: number; height: number; left: number; top: number; }\n' +
  'export const BADGE_ART: Readonly<Record<string, BadgeArt>> = ' + JSON.stringify(result, null, 2) + ';\n');
console.log(`Extracted ${Object.keys(images).length} original images and ${Object.keys(result).length} Figma crops.`);
if (process.argv[3]) {
  const screens = fs.readFileSync(process.argv[3], 'utf8');
  for (const match of screens.matchAll(/<image\b[^>]*\/>/g)) {
    const a = attrs(match[0]);
    if (!['image24_0_1', 'image25_0_1'].includes(a.id)) continue;
    const data = a['xlink:href'].match(/^data:image\/(png|jpeg);base64,(.*)$/);
    fs.writeFileSync(`${folder}/screen-${a.id}.${data[1]}`, Buffer.from(data[2], 'base64'));
  }
}
