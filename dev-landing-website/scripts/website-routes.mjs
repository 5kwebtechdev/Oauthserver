import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';

// Generate from Angular declarations so new routes are included at build time.
export function websiteRoutes() {
  const paths = new Set();
  const modules = {
    './authentication/authentication.module': 'src/app/authentication/auth-routing.module.ts',
    './home/home.module': 'src/app/home/home-routing.module.ts'
  };
  function readRoutes(file, prefix = '') {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isVariableDeclaration(node) && ['routes', 'routeDefinitions'].includes(node.name.getText(source)) && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
        for (const route of node.initializer.elements) {
          if (!ts.isObjectLiteralExpression(route)) throw new Error(`Unsupported route in ${file}`);
          const fields = Object.fromEntries(route.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(source), p.initializer]));
          if (fields.matcher) {
            if (fields.matcher.getText(source) !== 'shopCategoryMatcher') throw new Error('Unknown route matcher');
            continue;
          }
          if (!fields.path || !ts.isStringLiteral(fields.path)) throw new Error(`Unsupported path in ${file}`);
          if (fields.path.text === '**') continue;
          const path = `${prefix}/${fields.path.text}`.replace(/\/$/, '') || '/';
          if (fields.children) throw new Error('Add nested-route support before deploying');
          if (fields.loadChildren) {
            const module = fields.loadChildren.getText(source).match(/import\(['"]([^'"]+)['"]\)/)?.[1];
            if (!modules[module]) throw new Error(`Unknown lazy route module: ${module}`);
            readRoutes(modules[module], path);
          } else paths.add(path);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  readRoutes('src/app/app.routes.ts');
  const patterns = [...paths].map(path => '^' + path.split('/').map(segment => segment.startsWith(':') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/') + (path === '/' ? '$' : '/?$'));
  // Match the existing shopCategoryMatcher, including its reserved segments.
  // Product/category existence is still resolved by the existing API flow.
  patterns.push('^/shop/(?!cart(?:/|$)|orders(?:/|$)|checkout(?:/|$)|school-details(?:/|$)|products(?:/|$))[^/]+(?:/[^/]+)*/?$');
  return { paths: [...paths], patterns };
}

if (process.argv.includes('--write')) {
  writeFileSync('dist/superme-website/routes.json', JSON.stringify(websiteRoutes()));
}
