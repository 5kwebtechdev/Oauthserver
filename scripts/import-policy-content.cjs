// Migrate existing policy copy into the app without the legacy website shell.
// Usage: node scripts/import-policy-content.cjs /path/to/SuperMeWebsiteFE
// Emits an apply_patch document; does not modify either repository.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.join(process.argv[2], 'src/app/core/pages/footer-pages');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const clean = html => html
  .replace(/<app-(?:public-navbar|common-footer)><\/app-(?:public-navbar|common-footer)>/g, '')
  .replace(/\(click\)="scrollToSection\('([^']+)'\)"/g, 'href="#$1"')
  .replace(/<!--[^]*?-->/g, '').trim();
const terms = clean(read('terms-use/terms-use.component.html'));
const privacy = clean(read('privacy-policy-page/privacy-policy-page.component.html'));
const childSource = ts.createSourceFile('child.ts', read('child-safety-page/child-safety-page.component.ts'), ts.ScriptTarget.Latest, true);
const cards = [];
function visit(node) {
  if (ts.isPropertyDeclaration(node) && node.name.getText(childSource) === 'safetyCards') {
    for (const item of node.initializer.elements) {
      const card = {};
      for (const prop of item.properties) {
        if (ts.isPropertyAssignment(prop) && ts.isStringLiteral(prop.initializer)) card[prop.name.getText(childSource)] = prop.initializer.text;
      }
      cards.push(card);
    }
  }
  ts.forEachChild(node, visit);
}
visit(childSource);
const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const child = '<h1>Child Safety, Our Top Priority</h1><p>See how SuperMe keeps every child secure, supported, and empowered online.</p>' + cards.map(c => `<section><h2>${escape(c.title)}</h2><h3>${escape(c.subtitle)}</h3><p>${escape(c.description)}</p></section>`).join('\n') + '<h2>Questions About Your Child’s Safety?</h2><p>Email: <a href="mailto:supermeappofficial@gmail.com">supermeappofficial@gmail.com</a></p>';
const faq = read('faq-page/faq-page.component.ts').split("id: 'refund-cancellation'")[1];
const answers = [...faq.matchAll(/answer: '([^']+)'/g)].map(m => m[1]);
if (cards.length !== 9 || answers.length !== 4) throw new Error('Policy source shape changed; inspect before importing.');
const refund = '<h1>Refund &amp; Cancellation</h1>' + answers.map(a => `<p>${escape(a)}</p>`).join('\n');
const content = '// Existing published policy copy, migrated from SuperMeWebsiteFE.\n' +
  'export const POLICY_CONTENT: Record<string, string> = ' + JSON.stringify({ terms, privacy, 'child-safety': child, refund }, null, 2) + ';\n';
process.stdout.write('*** Begin Patch\n*** Add File: src/app/core/components/user-profile/our-policies/policy-content.ts\n' + content.split('\n').map(line => '+' + line).join('\n') + '\n*** End Patch\n');
