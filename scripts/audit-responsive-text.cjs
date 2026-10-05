// Read-only inventory, not a visual accessibility pass. Flags require selector
// review: icons, charts and picker wheels can legitimately use pixel geometry.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const patterns = {
  pixelFont: /font-size\s*:\s*\d+(?:\.\d+)?px/g,
  pixelLineHeight: /line-height\s*:\s*\d+(?:\.\d+)?px/g,
  fixedHeight: /(?<![\w-])height\s*:\s*\d+(?:\.\d+)?px/g,
  nowrap: /white-space\s*:\s*nowrap/g,
  blockedScaling: /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?|setTextZoom\s*\(|text-size-adjust\s*:\s*(?:none|100%)/g,
};
const findings = [];
let scanned = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!/\.(scss|css|html|ts|java|xml)$/.test(file) || /\.spec\.ts$/.test(file)) continue;
    scanned++;
    const source = fs.readFileSync(file, 'utf8');
    const counts = {};
    for (const [key, pattern] of Object.entries(patterns)) {
      const matches = [...source.matchAll(pattern)];
      if (matches.length) counts[key] = matches.length;
    }
    if (Object.keys(counts).length) findings.push({ file: path.relative(root, file).replaceAll('\\', '/'), ...counts });
  }
}
walk(path.join(root, 'src'));
walk(path.join(root, 'android/app/src/main'));
console.log(JSON.stringify({ scanned, note: 'Static candidates, including comments and superseded rules; not confirmed defects.', findings }, null, 2));
