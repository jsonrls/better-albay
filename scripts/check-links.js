#!/usr/bin/env node
/**
 * Audit every internal link in the site against the clean-URL scheme.
 *
 * The site ships pretty URLs (`/services/certificates`) with Apache mod_rewrite
 * mapping them onto `.html` files (`.`htaccess`, "Serve .html files for clean
 * URLs"). A link is only broken if it resolves to neither a real file, nor
 * `X.html`, nor a directory holding an `index.html`.
 *
 * Usage: node scripts/check-links.js [--verbose]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
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

/** A target is reachable if the file, its `.html` sibling, or its index exists. */
function resolves(abs) {
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return true;
  if (fs.existsSync(abs + '.html')) return true;
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    return fs.existsSync(path.join(abs, 'index.html'));
  }
  return false;
}

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
const pages = walk(ROOT);
const broken = [];
const checked = new Set();

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  for (const match of html.matchAll(/\shref="([^"]*)"/g)) {
    let href = match[1].trim();

    if (href === '' || EXTERNAL.test(href)) continue;
    if (/\.(?:css|js|png|jpe?g|svg|webp|ico|json|webmanifest|xml|txt|pdf)$/i.test(href)) continue;

    href = href.split('#')[0].split('?')[0];
    if (href === '') continue;

    const key = `${rel} -> ${href}`;
    if (checked.has(key)) continue;
    checked.add(key);

    // Root-relative links resolve from the doc root; relative ones from the page.
    const abs = href.startsWith('/')
      ? path.join(ROOT, href)
      : path.resolve(path.dirname(file), href);

    if (!resolves(abs)) broken.push(key);
  }
}

console.log(`scanned ${pages.length} page(s), ${checked.size} internal link(s)`);

if (broken.length === 0) {
  console.log('all internal links resolve');
} else {
  console.log(`\n${broken.length} unresolved link(s):`);
  for (const entry of broken.slice(0, 60)) console.log('  ' + entry);
  if (broken.length > 60) console.log(`  ... and ${broken.length - 60} more`);
}

process.exit(broken.length === 0 ? 0 : 1);
