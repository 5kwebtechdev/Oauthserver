// Package the existing SuperMe loader for the isolated native auth screen.
// Its markup and animation styles stay sourced from the Angular component.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
if ((process.env.CAPACITOR_PLATFORM_NAME || 'android') !== 'android') process.exit(0);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await fs.readFile(path.join(root, 'src/app/core/components/superme-loading/superme-loading.component.ts'), 'utf8');
const css = source.match(/styles: \[`([\s\S]*?)`\]/)?.[1];
const markup = source.match(/<div class="mb-loader"[\s\S]*?(?=\n\n    <div \*ngIf)/)?.[0];
if (!css || !markup) throw new Error('Existing SuperMe loader structure changed; review native export.');
const content = markup.replace(/\s\[style\.(?:width|height)\.px\]="size"/g, '').replace('<div class="mb-loader">', '<div class="mb-loader" style="width:100px;height:100px">');
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>${css} html,body{margin:0;height:100%;background:white} .mb-loader-overlay{background:white}</style></head><body><div class="mb-loader-overlay" role="status" aria-label="Loading">${content}</div></body></html>`;
const output = path.join(root, 'android/app/src/main/assets/auth-loader.html');
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, html);
console.log('Exported existing SuperMe loader for native auth.');
