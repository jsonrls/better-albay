#!/usr/bin/env node
/**
 * Stamp every `?v=` cache-busting query in the HTML with a content hash of the
 * asset it points at.
 *
 * WHY THIS EXISTS
 * ---------------
 * `?v=` values used to be typed by hand (fb-feed.js?v=1.2.0 and friends). Nothing
 * checked them, so editing a script without remembering to bump its query shipped
 * the new HTML against the *old* bytes - and because sw.js serves static assets
 * stale-while-revalidate, the stale copy wins for returning visitors. The result
 * was a feature that only appeared on a visitor's second visit: the marked-up
 * element was there, but the code that populates it was not.
 *
 * Deriving the value from the file's own content removes the human step. The hash
 * only changes when the bytes change, so this is idempotent: re-running it on an
 * unchanged tree rewrites nothing, and it cannot churn the diff.
 *
 * Existing `?v=` queries are rewritten from the asset's bytes. Assets referenced
 * without one are left alone - with one deliberate exception: an asset the
 * service worker does not precache must carry a stamp, because nothing else will
 * ever refresh it (see mustStamp below).
 *
 * Usage:
 *   node scripts/stamp-assets.js           # apply
 *   node scripts/stamp-assets.js --check   # exit 1 if any stamp is stale (CI)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

const SKIP_DIRS = new Set([
  'dist',
  'node_modules',
  '.git',
  '.next',
  'react-app',
  'test-results',
  'backup-restore-points',
]);

/** `../assets/js/fb-feed.js?v=1.2.0`, `assets/css/style.css?v=9.9.9`, ... */
const REFERENCE =
  /(?<prefix>(?:\.\.\/|\/)*assets\/(?:js|css)\/[\w.-]+\.(?:js|css))\?v=(?<stamp>[\w.]+)/g;

/**
 * An asset reference with no query, and nothing that would make one invalid.
 * The lookahead stops at the delimiter that ends the URL, so a reference that
 * already carries `?v=` is left for REFERENCE to handle.
 */
const UNSTAMPED = /(?<prefix>(?:\.\.\/|\/)*assets\/(?:js|css)\/[\w.-]+\.(?:js|css))(?=["'\s>])/g;

/**
 * Which assets have to carry a stamp, even where the markup does not already
 * have one. The rule is derived from the service worker rather than listed by
 * hand, because the property that decides it is already written down there.
 *
 * sw.js precaches the application shell - main.js, info-bar.js, the four layout
 * stylesheets, the logos, the manifest. Those URLs are fetched once at install
 * time and stored under their version-less keys, and `activate` deletes the
 * whole previous cache when CACHE_VERSION changes. So the shell refreshes itself
 * on every deploy, and a query on those URLs would be actively harmful: the
 * precache entry is looked up by exact URL, so `main.js?v=abc` would miss the
 * precached `main.js` and strand it - meaning the offline shell would stop
 * working for the sake of a stamp it does not need.
 *
 * Every *other* asset is reached through the runtime static cache, which is
 * stale-while-revalidate keyed by exact URL. On the first page view after a
 * deploy the previous worker is still in control and answers from cache, so the
 * bare URL returns the previous bytes - and the visitor sees last deploy's
 * behaviour with this deploy's markup. Nothing else ever refreshes that entry:
 * the version-less URL stays identical forever, so it is a permanent cache hit.
 * A content stamp changes the key, so the new bytes are fetched on that first
 * view.
 *
 * This is what made the i18n table print `{{month}} {{day}}, {{year}}` at real
 * readers, and what would have made the news list keep its old English date
 * format after the renderer learned to localise it.
 */
function mustStamp() {
  const swPath = path.join(ROOT, 'sw.js');
  const sw = fs.readFileSync(swPath, 'utf8');
  const at = sw.indexOf('PRECACHE_URLS');
  const end = at === -1 ? -1 : sw.indexOf('];', at);
  if (end === -1) {
    // Refusing to guess: an empty set would stamp the precached shell and break
    // offline, and a full set would leave every runtime asset stale.
    throw new Error(
      'sw.js: could not read PRECACHE_URLS, so there is no way to tell which assets the shell precaches'
    );
  }
  const precached = new Set(
    (sw.slice(at, end).match(/'[^']+'/g) || [])
      .map((literal) => literal.slice(1, -1))
      .map((url) => url.replace(/^\//, ''))
  );
  // The rule, applied to every asset the pages reference: precached is exempt.
  return (relative) => !precached.has(relative);
}

const SHOULD_STAMP = mustStamp();

function htmlFiles(dir = ROOT, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.htaccess') continue;
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('backup-restore-point-')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(full, found);
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

/** Short, stable fingerprint of an asset's bytes. */
function fingerprint(assetPath) {
  return crypto.createHash('sha1').update(fs.readFileSync(assetPath)).digest('hex').slice(0, 10);
}

const stale = [];
let updated = 0;

/** Resolve a page-relative asset reference. Paths are written relative to the
 * page, but every asset lives under the repo root, so stripping the leading
 * `../`/`/` segments is enough. */
function resolveAsset(prefix) {
  const relative = prefix.replace(/^(?:\.\.\/|\/)+/, '');
  return { relative, absolute: path.join(ROOT, relative) };
}

for (const file of htmlFiles()) {
  const source = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Re-derive every stamp that is already there.
  let next = source.replace(REFERENCE, (match, prefix, stamp) => {
    const { absolute } = resolveAsset(prefix);
    if (!fs.existsSync(absolute)) return match;

    const want = fingerprint(absolute);
    if (want === stamp) return match;

    changed = true;
    stale.push(`${path.relative(ROOT, file)}: ${path.basename(absolute)} ${stamp} -> ${want}`);
    return `${prefix}?v=${want}`;
  });

  // 2. Add one to the assets that cannot go without (see SHOULD_STAMP).
  next = next.replace(UNSTAMPED, (match, prefix) => {
    const { relative, absolute } = resolveAsset(prefix);
    if (!SHOULD_STAMP(relative) || !fs.existsSync(absolute)) return match;

    const want = fingerprint(absolute);
    changed = true;
    stale.push(`${path.relative(ROOT, file)}: ${path.basename(absolute)} (no stamp) -> ${want}`);
    return `${prefix}?v=${want}`;
  });

  if (changed) {
    updated += 1;
    if (!CHECK) fs.writeFileSync(file, next);
  }
}

if (!stale.length) {
  console.log('asset stamps: all current');
  process.exit(0);
}

for (const line of stale) console.log(`  ${line}`);

if (CHECK) {
  console.error(
    `\n${stale.length} asset stamp(s) out of date. Run: node scripts/stamp-assets.js\n` +
      'A missing or stale stamp serves the previous bytes of an edited asset to returning visitors.'
  );
  process.exit(1);
}

console.log(`asset stamps: updated ${stale.length} reference(s) in ${updated} file(s)`);
