// Verify the real avatar resolver against the packaged files before copying to iOS.
// The legacy root artwork stays in src/assets for recovery; angular.json excludes
// only superseded files. Do not exclude the two legacy fallback images still used.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/app/core/services/avatar.service.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, experimentalDecorators: true }
}).outputText;
const context = {
  exports: {},
  require(name) {
    if (name !== '@angular/core') throw new Error(`Review new AvatarService dependency: ${name}`);
    return { Injectable: () => value => value };
  }
};
vm.runInNewContext(compiled, context);
const avatars = new context.exports.AvatarService().getAllAvatars();
const required = new Set(avatars.map(avatar => avatar.value));
required.add('assets/figma/avatars/below-11-male-1.webp');
required.add('assets/figma/avatars/18-plus-male-1.webp');
for (const asset of required) {
  const original = fs.readFileSync(path.join(root, 'src', asset));
  const packaged = fs.readFileSync(path.join(root, 'www', asset));
  if (!original.equals(packaged)) throw new Error(`Avatar changed during packaging: ${asset}`);
}
console.log(`Verified ${avatars.length} current avatars and both legacy fallback images: packaged bytes unchanged.`);
