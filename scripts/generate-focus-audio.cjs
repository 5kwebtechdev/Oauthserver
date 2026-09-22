// Original synthetic demo loops. No third-party recordings or licensing dependencies.
// Regenerate with: node scripts/generate-focus-audio.cjs
const fs = require('node:fs');
const path = require('node:path');
const rate = 22050, seconds = 16, length = rate * seconds;
const output = path.join(__dirname, '../src/assets/audio/focus');
fs.mkdirSync(output, {recursive: true});
let seed = 22;
const noise = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2147483648 - 1; };
for (const name of ['lofi', 'ocean', 'rain', 'forest']) {
  const wav = Buffer.alloc(44 + length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(length * 2, 40);
  let low = 0;
  for (let i = 0; i < length; i++) {
    const t = i / rate, n = noise(); low = .98 * low + .02 * n;
    let v = 0;
    if (name === 'rain') v = n * .18 + low * 1.4;
    if (name === 'ocean') v = low * 4 * (.4 + .6 * Math.pow(Math.sin(Math.PI * t / 8), 2));
    if (name === 'forest') {
      const chirp = t % 2;
      v = low * 1.2 + (chirp < .25 ? .16 * Math.sin(2 * Math.PI * (1400 * chirp + 1500 * chirp * chirp)) * Math.sin(Math.PI * chirp / .25) : 0);
    }
    if (name === 'lofi') {
      const beat = t % .8, chord = [130.81, 164.81, 196][Math.floor(t / 4) % 3];
      v = .13 * Math.sin(2 * Math.PI * chord * t) + .07 * Math.sin(2 * Math.PI * chord * 1.5 * t)
        + .24 * Math.exp(-beat * 24) * Math.sin(2 * Math.PI * 60 * beat) + n * .025;
    }
    // Short fades remove discontinuities at the loop seam.
    const fade = Math.min(1, t / .04, (seconds - t) / .04);
    wav.writeInt16LE(Math.round(Math.max(-.9, Math.min(.9, v * fade)) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(output, name + '.wav'), wav);
}
console.log('Created four local focus audio loops');
