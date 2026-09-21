/**
 * Guards the clean-URL contract and internal link integrity.
 *
 * The site ships pretty URLs (`/services/certificates`, no extension). Apache
 * maps them onto `.html` files via the mod_rewrite rules in `.htaccess`; the
 * `sitemap.xml`, the nav dropdowns, the category cards and `serve.py` all
 * assume that. Nothing in the HTML itself records the mapping, so a link to a
 * path that has no `.html` counterpart looks perfectly fine in the source and
 * only surfaces as a 404 in a browser.
 *
 * This walks every internal link on every page and asserts each one resolves
 * under the deployed rules. It also pins the three places the mapping is
 * defined so they cannot silently drift apart.
 *
 * Run: node --test tests/unit/link-integrity.test.cjs
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const SKIP_DIRS = new Set([
  'dist',
  'node_modules',
  '.git',
  '.next',
  'react-app',
  'test-results',
  'backup-restore-points',
  'tests',
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith('.html')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/** Links that are not filesystem paths. */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

/** Directories that are intentionally not pages of this site. */
const ASSET_EXT = /\.(?:css|js|png|jpe?g|svg|webp|ico|json|webmanifest|xml|txt|pdf)$/i;

/**
 * How the deployed stack resolves a path:
 *   1. an exact file wins;
 *   2. otherwise `<path>.html` (the `.htaccess` internal rewrite);
 *   3. otherwise a directory serving its `index.html`.
 */
function resolves(abs) {
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return true;
  if (fs.existsSync(abs + '.html')) return true;
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    return fs.existsSync(path.join(abs, 'index.html'));
  }
  return false;
}

/** Every internal link on every page, deduplicated as `page -> href`. */
function collectLinks() {
  const links = [];
  const seen = new Set();

  for (const file of walk(ROOT)) {
    const html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);

    for (const match of html.matchAll(/\shref="([^"]*)"/g)) {
      let href = match[1].trim();

      if (href === '' || EXTERNAL.test(href) || ASSET_EXT.test(href)) continue;

      href = href.split('#')[0].split('?')[0];
      if (href === '') continue;

      const key = `${rel} -> ${href}`;
      if (seen.has(key)) continue;
      seen.add(key);

      links.push({ rel, href, file });
    }
  }

  return links;
}

test('the site has pages to check', () => {
  assert.ok(walk(ROOT).length >= 40, 'too few pages found - did the walk break?');
});

test('every internal link resolves under the deployed clean-URL rules', () => {
  const failures = [];

  for (const { rel, href, file } of collectLinks()) {
    const abs = href.startsWith('/')
      ? path.join(ROOT, href)
      : path.resolve(path.dirname(file), href);

    // `..` above the document root has no meaning on a web server; Apache
    // clamps it, and so do we, rather than resolving outside the site.
    const relative = path.relative(ROOT, abs);
    if (relative.startsWith('..')) {
      failures.push(`${rel} -> ${href} (escapes the document root)`);
      continue;
    }

    if (!resolves(abs)) failures.push(`${rel} -> ${href} (404)`);
  }

  assert.deepStrictEqual(failures.slice(0, 40), [], 'unresolved internal links');
});

test('the nav dropdowns only point at pages that exist', () => {
  // The Services and Legislative menus are the two deepest navigational
  // surfaces; a bad entry there is the most likely thing a visitor clicks.
  // The nav is baked into every page, so index.html is representative.
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const bad = [];
  let seen = 0;

  for (const match of html.matchAll(/\shref="((?:services|legislative)\/[^"]*)"/g)) {
    const href = match[1];
    seen += 1;

    if (!resolves(path.join(ROOT, href))) bad.push(href);
  }

  assert.ok(seen >= 12, `expected the Services and Legislative menus, found ${seen} links`);
  assert.deepStrictEqual(bad, [], 'dropdown entries with no page behind them');
});

test('.htaccess still rewrites clean URLs onto .html files', () => {
  const rules = fs.readFileSync(path.join(ROOT, '.htaccess'), 'utf8');

  assert.match(
    rules,
    /RewriteCond %\{REQUEST_FILENAME\}\.html -f\s*\n\s*RewriteRule .*\$1\.html/,
    'the "serve .html for clean URLs" rewrite is missing or changed shape'
  );
});

test('.htaccess is shipped into dist', () => {
  // Without it every clean URL 404s in production.
  if (!fs.existsSync(path.join(ROOT, 'dist'))) return; // not built yet

  assert.ok(fs.existsSync(path.join(ROOT, 'dist/.htaccess')), 'dist/.htaccess is missing');
  assert.match(fs.readFileSync(path.join(ROOT, 'dist/.htaccess'), 'utf8'), /mod_rewrite/);
});

test('the dev servers emulate the clean-URL rewrite', () => {
  // `python3 -m http.server` has no rewrite step, so every clean URL 404s.
  // npm scripts must use serve.py, which does emulate it.
  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts;

  for (const name of ['dev', 'serve', 'serve:dist']) {
    assert.ok(scripts[name], `missing npm script: ${name}`);
    assert.ok(
      scripts[name].includes('serve.py'),
      `"${name}" must run serve.py (has no clean-URL support otherwise): ${scripts[name]}`
    );
  }

  assert.match(
    fs.readFileSync(path.join(ROOT, 'serve.py'), 'utf8'),
    /\.html/,
    'serve.py no longer attempts extension rewriting'
  );
});

test('sitemap.xml only lists URLs that exist', () => {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const site = 'https://betteralbay.org';
  const bad = [];

  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = match[1].trim();
    if (!url.startsWith(site)) continue;

    const target = url.slice(site.length) || '/';
    const abs = target.endsWith('/')
      ? path.join(ROOT, target, 'index.html')
      : path.join(ROOT, target);

    if (!resolves(abs)) bad.push(target);
  }

  assert.deepStrictEqual(bad, [], 'sitemap entries with no page');
});
