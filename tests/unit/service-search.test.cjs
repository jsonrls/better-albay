/**
 * Guards the service search box: where it is mounted, what it is wired to,
 * and where its result links actually point.
 *
 * Two things break silently here.
 *
 * 1. Coverage. The search is a plain `<script>` include, so a page that
 *    never gets it still renders perfectly - just with no search box. Only
 *    a test notices.
 *
 * 2. Result URLs. `data/services.json` stores every service `url` relative
 *    to the *services* folder, in two shapes: `../service-details/...` and
 *    bare filenames such as `certificates.html`. Anything that rewrites
 *    those for a different host page has to re-anchor both shapes at once.
 *    Getting that wrong produces a 404 on every result click, which no
 *    amount of eyeballing the rendered dropdown reveals.
 *
 * Run: node --test tests/unit/service-search.test.cjs
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..');
const SEARCH = path.join(ROOT, 'assets/js/search.js');
const TABLE = path.join(ROOT, 'assets/js/translations.js');
const SERVICES_DATA = path.join(ROOT, 'data/services.json');

const LANGS = ['en', 'fil', 'bcl'];

const searchSource = fs.readFileSync(SEARCH, 'utf8');

/** The search box must ride along on every page of these two sections. */
const HOST_DIRS = ['services', 'legislative'];

const hostPages = HOST_DIRS.flatMap((dir) =>
  fs
    .readdirSync(path.join(ROOT, dir))
    .filter((name) => name.endsWith('.html'))
    .map((name) => ({ dir, name, rel: `${dir}/${name}` }))
);

test('search host sections are not empty', () => {
  // A typo in a directory name would otherwise make every test below
  // vacuously pass.
  assert.ok(hostPages.length >= 13, `found only ${hostPages.length} host pages`);
});

test('every Services and Legislative page mounts the search box', () => {
  const missing = hostPages
    .filter(
      (page) => !fs.readFileSync(path.join(ROOT, page.rel), 'utf8').includes('id="service-search"')
    )
    .map((page) => page.rel);

  assert.deepStrictEqual(missing, [], 'pages without id="service-search"');
});

test('every Services and Legislative page loads search.js exactly once', () => {
  const bad = [];

  for (const page of hostPages) {
    const html = fs.readFileSync(path.join(ROOT, page.rel), 'utf8');
    const count = (html.match(/src="[^"]*assets\/js\/search\.js/g) || []).length;

    if (count !== 1) bad.push(`${page.rel} (${count})`);
  }

  assert.deepStrictEqual(bad, [], 'pages whose search.js include count is not 1');
});

test('every search box is translatable', () => {
  const bad = [];

  for (const page of hostPages) {
    const html = fs.readFileSync(path.join(ROOT, page.rel), 'utf8');

    for (const attr of [
      'data-i18n-placeholder="search-placeholder"',
      'data-i18n-aria="search-aria-label"',
    ]) {
      if (!html.includes(attr)) bad.push(`${page.rel} missing ${attr}`);
    }
  }

  assert.deepStrictEqual(bad, []);
});

test('the search keys exist in all three languages', () => {
  const source = fs.readFileSync(TABLE, 'utf8');
  const start = source.indexOf('const translations = {');
  const end = source.indexOf('\n};', start);

  assert.ok(start > -1 && end > start, 'could not locate the translations table');

  const translations = vm.runInNewContext(
    `(function () { ${source.slice(start, end + 3)} return translations; })()`,
    {}
  );

  for (const lang of LANGS) {
    assert.ok(translations[lang], `missing ${lang} block`);

    for (const key of ['search-placeholder', 'search-aria-label']) {
      const value = translations[lang][key];

      assert.ok(
        typeof value === 'string' && value.trim() !== '',
        `${lang}.${key} is missing or empty`
      );
    }
  }
});

/** Load search.js with a stubbed `window.location` and hand back its resolver. */
function resolverFor(pathname) {
  const sandbox = { window: { location: { pathname } } };

  vm.runInNewContext(searchSource, sandbox);

  const resolver =
    sandbox.window.BetterAlbaySearch && sandbox.window.BetterAlbaySearch.resolveResultUrl;

  assert.strictEqual(typeof resolver, 'function', 'search.js does not expose resolveResultUrl');

  return resolver;
}

test('search.js routes every result URL through resolveResultUrl', () => {
  // Definition plus the two call sites (render + form submit). A raw
  // `result.url` reaching an href would drop this below three.
  const calls = (searchSource.match(/resolveResultUrl\(/g) || []).length;

  assert.ok(calls >= 3, `resolveResultUrl is referenced only ${calls} time(s)`);
  assert.ok(
    !/href="\$\{result\.url\}/.test(searchSource),
    'a result href still interpolates the raw stored url'
  );
});

test('result URLs resolve to files that exist, from every host page', () => {
  const services = JSON.parse(fs.readFileSync(SERVICES_DATA, 'utf8')).services;
  const origin = 'https://example.test';

  // One page per host directory, plus a nested one, plus the site root.
  const hostPaths = ['/index.html', ...hostPages.map((page) => `/${page.rel}`)];

  const failures = [];

  for (const pathname of hostPaths) {
    const resolveResultUrl = resolverFor(pathname);

    for (const service of services) {
      let resolved;

      try {
        resolved = resolveResultUrl(service.url);
      } catch (error) {
        failures.push(`${pathname}: threw on ${service.url} (${error.message})`);
        continue;
      }

      // Absolute and root-relative targets are deliberately untouched.
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(service.url)) {
        assert.strictEqual(resolved, service.url, `${pathname}: ${service.url} was rewritten`);
        continue;
      }

      const target = new URL(resolved, origin + pathname).pathname;
      const onDisk = path.join(ROOT, target);

      if (!fs.existsSync(onDisk)) failures.push(`${pathname} -> ${service.url} -> ${target} (404)`);
    }
  }

  assert.deepStrictEqual(failures.slice(0, 20), [], 'unresolvable result links');
});

test('the two stored url shapes converge on the right folder', () => {
  const resolveResultUrl = resolverFor('/legislative/index.html');

  assert.strictEqual(
    resolveResultUrl('../service-details/birth-certificate.html'),
    '../service-details/birth-certificate.html'
  );
  assert.strictEqual(resolveResultUrl('certificates.html'), '../services/certificates.html');
  assert.strictEqual(
    resolveResultUrl('services/certificates.html'),
    '../services/certificates.html'
  );
  assert.strictEqual(resolveResultUrl('https://albay.gov.ph/'), 'https://albay.gov.ph/');
  assert.strictEqual(resolveResultUrl(''), '');
  assert.strictEqual(resolveResultUrl(null), '');
});

test('services category pages do not double up the services segment', () => {
  // The bug this guards: from inside /services/ the old code emitted
  // ../services/certificates.html, which resolves to /services/services/...
  for (const page of hostPages.filter((p) => p.dir === 'services')) {
    const resolveResultUrl = resolverFor(`/services/${page.name}`);

    for (const url of [
      'certificates.html',
      'business.html',
      '../service-details/mswdo-services.html',
    ]) {
      const target = new URL(resolveResultUrl(url), `https://example.test/services/${page.name}`)
        .pathname;

      assert.ok(!target.includes('/services/services/'), `${page.name}: ${url} -> ${target}`);
      assert.ok(fs.existsSync(path.join(ROOT, target)), `${page.name}: ${url} -> ${target} (404)`);
    }
  }
});
