/**
 * Guards the Facebook feed section: its translation keys, its date formatting and
 * the two contracts that make the section behave the same on both pages.
 *
 * Three failures motivated these tests, all of which shipped silently:
 *
 *   1. `fb-feed.js` was edited without moving its `?v=` query. sw.js serves static
 *      assets stale-while-revalidate, so returning visitors kept the old bytes and
 *      the "the live timeline isn't loading" note either never appeared or appeared
 *      seconds late. `?v=` values are now derived from the asset hash by
 *      scripts/stamp-assets.js, and this test runs that tool in check mode.
 *   2. The feed markup had no `data-i18n` at all and `fb-feed.js` hardcoded English
 *      month abbreviations. Because the self-hosted list is the layer that always
 *      renders, that made the section English-only in Filipino and Central Bikol
 *      - and the i18n engine keeps the English default without complaining.
 *   3. The note that explains the fallback is revealed by the CSS sibling selector
 *      `#fb-feed[data-fb-live='false'] ~ .home-fb-note`, which needs the two
 *      elements to share a parent and `fb-feed.js` to publish the attribute. A
 *      nesting change or a renamed class breaks it invisibly.
 *   4. `translations.js` was referenced with no `?v=` at all, so the keys added by
 *      the fix for (2) did not reach a returning visitor until their *second*
 *      view - the first one rendered `{{month}} {{day}}, {{year}}` where the date
 *      belonged. The last test guards the URL and the precache list for that.
 *
 * Run: node --test tests/unit/fb-feed-i18n.test.cjs
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'assets/js/fb-feed.js');
const CSS = path.join(ROOT, 'assets/css/style.css');
const TABLE = path.join(ROOT, 'assets/js/translations.js');

const LANGS = ['en', 'fil', 'bcl'];
/** Both pages that load the feed script, and the container each renders into. */
const PAGES = ['index.html', 'news/index.html'];

const scriptSource = fs.readFileSync(SCRIPT, 'utf8');
const cssSource = fs.readFileSync(CSS, 'utf8');
const html = Object.fromEntries(
  PAGES.map((page) => [page, fs.readFileSync(path.join(ROOT, page), 'utf8')])
);

const tableSource = fs.readFileSync(TABLE, 'utf8');
const start = tableSource.indexOf('const translations = {');
const end = tableSource.indexOf('\n};', start);
assert.ok(start > -1 && end > start, 'could not locate the translations table');

const translations = vm.runInNewContext(
  `(function () { ${tableSource.slice(start, end + 3)} return translations; })()`,
  {}
);

/**
 * Keys the renderer passes to its translation helpers. Matching every `fb-*` string
 * literal would also sweep up the class names it writes (`fb-post-text`,
 * `fb-feed-local`, ...), which are not keys at all. The calendar keys carry no
 * `fb-` prefix because news.js formats dates from the same table entries.
 */
const inRenderer = Array.from(
  new Set(
    Array.from(
      scriptSource.matchAll(/(?:tText|tHtml|i18nAttr)\(\s*'((?:[^'\\]|\\.)*)'/g),
      (m) => m[1]
    )
  )
)
  .filter((key) => /^(?:fb|date)-[a-z0-9-]+$/.test(key))
  .sort();

/** Keys the markup names in a `data-i18n="fb-*"` attribute. */
const inMarkup = Array.from(
  new Set(
    PAGES.flatMap((page) =>
      (html[page].match(/data-i18n="(fb-[a-z0-9-]+)"/g) || []).map((m) => m.slice(11, -1))
    )
  )
).sort();

/** The month table the renderer walks, in the order a Date reports months. */
const monthKeys = (scriptSource.match(/'month-[a-z]{3}'/g) || []).map((k) => k.slice(1, -1));
const MONTH_ORDER = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

/** Every key the feed section can ask the table for, from markup or renderer. */
const referenced = Array.from(new Set([...inRenderer, ...inMarkup, ...monthKeys])).sort();
const paramsOf = (text) => (text.match(/\{\{(\w+)\}\}/g) || []).sort().join(',');

/**
 * Start-tag index of the element that CONTAINS the element at `pos`. `pos` is an
 * attribute's offset inside an element's own start tag, so the stack walk returns
 * that element first and its parent second. Returning an index rather than a tag
 * name lets two callers compare structurally: two `<div>`s are not necessarily the
 * same parent, and a nesting change is exactly the regression being guarded here.
 */
const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
const TAG = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)\s*>/g;

function parentStart(source, pos) {
  const stack = [];
  TAG.lastIndex = 0;
  let match;
  while ((match = TAG.exec(source)) !== null) {
    if (match.index >= pos) break;
    const [, closing, name, , selfClose] = match;
    const lower = name.toLowerCase();
    if (closing) stack.pop();
    else if (!selfClose && !VOID.has(lower)) stack.push({ lower, start: match.index });
  }
  // stack[len - 1] is the element that owns `pos`; its parent is one level up.
  return stack.length >= 2 ? stack[stack.length - 2] : null;
}

test('the feed section only uses keys that exist in all three languages', () => {
  assert.ok(referenced.length >= 30, `expected at least 30 feed keys, found ${referenced.length}`);

  for (const lang of LANGS) {
    const missing = referenced.filter((key) => !translations[lang][key]);
    assert.deepStrictEqual(missing, [], `feed keys with no ${lang} value: ${missing.join(', ')}`);
  }
});

test('the date sentence and its month names come from the table, not from Intl', () => {
  // Intl carries no Central Bikol data and resolves an unknown locale tag to the
  // *visitor's* locale, so `toLocaleDateString` would print German months on a
  // Central Bikol page for a German visitor. The table is the only correct source.
  assert.doesNotMatch(
    scriptSource,
    /toLocaleDateString|toLocaleString|Intl\./,
    'feed dates must be formatted from the translation table, not from Intl'
  );

  assert.strictEqual(
    paramsOf(translations.en['date-short']),
    '{{day}},{{month}},{{year}}',
    'date-short must interpolate the month, day and year'
  );
  for (const lang of LANGS.slice(1)) {
    assert.strictEqual(
      paramsOf(translations[lang]['date-short']),
      paramsOf(translations.en['date-short']),
      `date-short placeholders differ in ${lang} — the month would go missing`
    );
  }

  assert.deepStrictEqual(
    monthKeys,
    MONTH_ORDER.map((m) => `month-${m}`),
    'the renderer must walk twelve month keys in calendar order'
  );
  for (const key of monthKeys) {
    for (const lang of LANGS) {
      assert.ok(translations[lang][key], `${key} has no ${lang} value`);
    }
  }

  // Filipino and Central Bikol both abbreviate the Spanish-derived month names,
  // so the two sets are authored identically (Ene, Peb, ... Set, Okt, Nob, Dis).
  // A divergence is far more likely to be a typo - `Sep` once slipped into one
  // language for September while the other eleven stayed Spanish - than a real
  // distinction. If a translator ever does want them to differ, update this
  // expectation and say why.
  for (const [index, key] of monthKeys.entries()) {
    assert.strictEqual(
      translations.bcl[key],
      translations.fil[key],
      `${key}: Central Bikol is "${translations.bcl[key]}" but Filipino is ` +
        `"${translations.fil[key]}" - the shared Spanish-derived abbreviations have drifted`
    );
    assert.notStrictEqual(
      translations.en[key],
      undefined,
      `${key} is missing its English abbreviation for month ${index + 1}`
    );
  }
});

test('both date renderers share one set of table keys', () => {
  // news.js formats the date on every news card; fb-feed.js formats the date on
  // every feed post. They sit on the same two pages, so if only one of them reads
  // the table the page shows two different languages for the same day - which is
  // exactly what happened when the feed was localised first.
  const newsSource = fs.readFileSync(path.join(ROOT, 'assets/js/news.js'), 'utf8');

  assert.doesNotMatch(
    newsSource,
    /toLocaleDateString|toLocaleString|Intl\./,
    'news dates must be formatted from the translation table, not from Intl'
  );

  const newsMonths = (newsSource.match(/'month-[a-z]{3}'/g) || []).map((k) => k.slice(1, -1));
  assert.deepStrictEqual(
    newsMonths,
    monthKeys,
    'the feed and the news list must read the same month keys in the same order'
  );
  assert.match(
    newsSource,
    /tText\('date-short'/,
    'news dates must use the shared date-short sentence'
  );
  assert.match(
    newsSource,
    /addEventListener\('languageChanged'/,
    'the news lists must be rebuilt when the reader switches language'
  );
});

test('the fallback explanation is reachable from the markup and the stylesheet', () => {
  for (const page of PAGES) {
    const source = html[page];
    const feed = source.indexOf('id="fb-feed"');
    assert.ok(feed > -1, `${page} is missing the #fb-feed container`);
    assert.match(
      source.slice(feed, feed + 400),
      /data-fb-page="https:\/\/www\.facebook\.com\/[^"]+"/,
      `${page} must tell fb-feed.js which Facebook page it is showing`
    );

    // The stylesheet reveals the note with a sibling selector, so the two
    // elements have to share a parent - a nesting change silently hides it.
    const note = source.indexOf('class="home-fb-note"');
    assert.ok(note > feed, `${page} must place the .home-fb-note after #fb-feed`);
    const feedParent = parentStart(source, feed);
    const noteParent = parentStart(source, note);
    assert.ok(feedParent && noteParent, `${page} could not be parsed for the sibling check`);
    assert.strictEqual(
      feedParent.start,
      noteParent.start,
      `${page}: .home-fb-note must be a sibling of #fb-feed, or the CSS reveal never fires`
    );

    assert.match(
      source.slice(note, note + 300),
      /data-i18n="fb-live-note"/,
      `${page} must load the explanation through the translation table`
    );
  }

  assert.match(
    cssSource,
    /#fb-feed\[data-fb-live='false'\]\s*~\s*\.home-fb-note\s*\{[^}]*display:\s*block/,
    'the stylesheet must still reveal .home-fb-note when the feed marks itself statically rendered'
  );
});

test('the renderer publishes its feed state on every path', () => {
  // The note's visibility depends on this attribute. It used to be published only
  // after the deferred probe timed out, which on a slow page meant the explanation
  // arrived seconds after the fallback list it describes.
  const published = (scriptSource.match(/setAttribute\('data-fb-live'/g) || []).length;
  assert.ok(
    published >= 3,
    `expected data-fb-live to be published on each outcome (found ${published} writes)`
  );
  assert.match(
    scriptSource,
    /addEventListener\('languageChanged'/,
    'the feed list must be rebuilt when the reader switches language'
  );
});

test('every ?v= cache-busting query matches the bytes of its asset', () => {
  // Runs the shipped stamper rather than re-deriving the hash, so the test and the
  // build cannot drift apart. Exits non-zero when any stamp is stale.
  execFileSync('node', [path.join(ROOT, 'scripts/stamp-assets.js'), '--check'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
});

test('the feed containers explain themselves when JavaScript is unavailable', () => {
  // The containers are rendered by news.js, which also owns the "no verified
  // stories yet" message - hardcoding that message would make it appear mid-fetch.
  // A <noscript> is invisible to a browser that runs scripts, so it carries the
  // no-JavaScript explanation without that risk.
  for (const page of PAGES) {
    const source = html[page];
    assert.doesNotMatch(
      source,
      /Verified Albay news is not yet available/,
      `${page} must not hardcode the renderer's empty state`
    );
  }

  for (const [page, gridId] of [
    ['index.html', 'home-news-grid'],
    ['news/index.html', 'news-grid'],
  ]) {
    const source = html[page];
    const grid = source.indexOf(`id="${gridId}"`);
    assert.ok(grid > -1, `${page} is missing #${gridId}`);

    // Scope the slice to the noscript block: the container's own `</div>` is not
    // the first closing tag once the fallback markup is inside it.
    const close = source.indexOf('</noscript>', grid);
    assert.ok(close > grid, `${page} #${gridId} needs a <noscript> fallback`);
    const body = source.slice(grid, close + '</noscript>'.length);
    assert.match(body, /<noscript>/, `${page} #${gridId} needs a <noscript> fallback`);
    assert.match(
      body,
      /JavaScript is needed to load the news list/,
      `${page} #${gridId} must say why the list is missing`
    );
    assert.match(
      body,
      /href="https:\/\/albay\.gov\.ph\/"/,
      `${page} #${gridId} must still offer a verified destination`
    );
  }
});

test('the i18n table is never requested under a version-less URL', () => {
  // Roughly a megabyte that changes whenever copy does. sw.js serves static assets
  // stale-while-revalidate keyed by the exact URL, so a version-less reference is a
  // cache hit against the *previous* worker on the first view after a deploy: every
  // key added since the reader's last visit is missing, and a string the renderer
  // assembles from the table degrades to its raw template.
  for (const page of PAGES) {
    assert.doesNotMatch(
      html[page],
      /assets\/js\/translations\.js(?!\?v=)/,
      `${page} must load translations.js with a ?v= stamp`
    );
    assert.match(
      html[page],
      /assets\/js\/translations\.js\?v=[\w.]+/,
      `${page} must load translations.js with a ?v= stamp`
    );
  }

  // Precaching the version-less URL would defeat the stamp: the entry could never
  // satisfy a stamped request, and the bare URL would still hand the old table to
  // anything that asked for it.
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const listAt = sw.indexOf('PRECACHE_URLS');
  assert.ok(listAt > -1, 'could not locate PRECACHE_URLS in sw.js');
  const list = sw.slice(listAt, sw.indexOf('];', listAt));
  assert.doesNotMatch(
    list,
    /['"]\/assets\/js\/translations\.js['"]/,
    'sw.js must not precache translations.js under its version-less URL'
  );
});

test('stamping follows the precache list: shell exempt, everything else stamped', () => {
  // The general form of the failure above. sw.js precaches the application shell
  // and deletes the previous cache when CACHE_VERSION changes, so the shell is
  // refreshed by the deploy itself - and a query on those URLs would miss the
  // precache entry and strand the offline shell. Every *other* asset is reached
  // through the runtime cache, stale-while-revalidate by exact URL, so its bare
  // URL is a permanent cache hit that never picks up new bytes. Two lists, two
  // opposite requirements, and scripts/stamp-assets.js derives which is which
  // from sw.js rather than keeping a second copy of it.
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const listAt = sw.indexOf('PRECACHE_URLS');
  assert.ok(listAt > -1, 'could not locate PRECACHE_URLS in sw.js');
  const precached = new Set(
    (sw.slice(listAt, sw.indexOf('];', listAt)).match(/'[^']+'/g) || [])
      .map((literal) => literal.slice(1, -1))
      .map((url) => url.replace(/^\//, ''))
  );
  assert.ok(precached.has('assets/js/main.js'), 'the precache list must still hold the shell');

  const SKIP = new Set([
    'dist',
    'node_modules',
    '.git',
    '.next',
    'react-app',
    'test-results',
    'backup-restore-points',
  ]);
  const pages = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      if (SKIP.has(entry.name) || entry.name.startsWith('backup-restore-point-')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) pages.push(full);
    }
  })(ROOT);

  // Both shapes in one pass: `path?v=x` and the bare `path` before a delimiter.
  const REFERENCED =
    /((?:\.\.\/|\/)*assets\/(?:js|css)\/[\w.-]+\.(?:js|css))(\?v=[\w.]+)?(?=["'\s>])/g;
  const unstamped = new Set();
  const stampedShell = new Set();

  for (const page of pages) {
    const relativePage = path.relative(ROOT, page);
    for (const [, prefix, query] of fs.readFileSync(page, 'utf8').matchAll(REFERENCED)) {
      const asset = prefix.replace(/^(?:\.\.\/|\/)+/, '');
      if (!fs.existsSync(path.join(ROOT, asset))) continue;
      if (query) {
        if (precached.has(asset)) stampedShell.add(`${relativePage}: ${asset}${query}`);
        continue;
      }
      // A version-less reference to a precached asset is fine - that is the point
      // of precaching it. Anything else will never be refreshed.
      if (!precached.has(asset)) unstamped.add(`${relativePage}: ${asset}`);
    }
  }

  assert.deepStrictEqual(
    [...stampedShell].sort(),
    [],
    'these shell assets carry a ?v= query, which strands their precache entry and breaks the offline shell'
  );
  assert.deepStrictEqual(
    [...unstamped].sort(),
    [],
    'these assets are not precached, so a version-less URL serves stale bytes on the first view after a deploy — run: node scripts/stamp-assets.js'
  );
});
