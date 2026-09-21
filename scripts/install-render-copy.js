#!/usr/bin/env node
/**
 * Install the statistics-dashboard and directory copy into assets/js/translations.js.
 *
 * The renderers mark their own text with `data-i18n` keys. This script is the one
 * place those keys' three-language values are written into the table, so the
 * renderer and the table cannot drift apart silently.
 *
 * Two properties this script deliberately enforces:
 *
 *   1. Idempotent - keys already in the table are left untouched, so it is safe to
 *      re-run after adding a key to render-copy.json.
 *   2. Placeholder parity - every language must use the same set of `{{name}}`
 *      placeholders as English. A translation that drops one would silently delete
 *      a figure from the page, which for this project is worse than leaving the
 *      string untranslated.
 *
 * Usage:
 *   node scripts/install-render-copy.js           # dry run
 *   node scripts/install-render-copy.js --write   # apply
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const TABLE = path.join(ROOT, 'assets/js/translations.js');
const COPY = path.join(__dirname, 'render-copy.json');

/**
 * Keys whose elements no longer exist anywhere, or whose names were superseded.
 *
 * - stats-view-all-22-barangays: its value also hard-coded a figure ('View all
 *   720 barangays') that the renderer now passes as a parameter, so the value
 *   would have overwritten a live count on every language change.
 * - fb-date / fb-month-*: renamed to date-short / month-* once news.js began
 *   formatting dates from the same table. The keys are no longer specific to the
 *   Facebook feed, and leaving the old names in place would strand 13 keys in
 *   three languages that nothing reads.
 */
const RETIRED = [
  'stats-view-all-22-barangays',
  'fb-date',
  'fb-month-jan',
  'fb-month-feb',
  'fb-month-mar',
  'fb-month-apr',
  'fb-month-may',
  'fb-month-jun',
  'fb-month-jul',
  'fb-month-aug',
  'fb-month-sep',
  'fb-month-oct',
  'fb-month-nov',
  'fb-month-dec',
];

const MARKER = '    // Renderer copy (see scripts/install-render-copy.js)';
/** Earlier runs wrote a narrower marker; both delimit the same generated block. */
const isMarker = (line) => /^ {4}\/\/ .*copy \(see scripts\/install-render-copy\.js\)$/.test(line);
const LANGS = ['en', 'fil', 'bcl'];
const BLOCK_OPEN = /^ {2}(en|fil|bcl): \{$/;
const BLOCK_CLOSE = /^ {2}\},$/;
const KEY_LINE = /^ {4}'((?:[^'\\]|\\.)*)':/;

const write = process.argv.includes('--write');

const copy = JSON.parse(fs.readFileSync(COPY, 'utf8'));
delete copy._comment;

const paramsOf = (text) => (text.match(/\{\{(\w+)\}\}/g) || []).sort().join(',');

const keys = Object.keys(copy).sort();
for (const key of keys) {
  const entry = copy[key];
  for (const lang of LANGS) {
    if (typeof entry[lang] !== 'string' || !entry[lang]) {
      throw new Error(`${key} is missing a ${lang} value`);
    }
    if (paramsOf(entry[lang]) !== paramsOf(entry.en)) {
      throw new Error(
        `${key}: ${lang} placeholders [${paramsOf(entry[lang])}] do not match English [${paramsOf(entry.en)}]`
      );
    }
  }
}

const escapeForJs = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

let lines = fs.readFileSync(TABLE, 'utf8').split('\n');

// ---- retire dead keys -------------------------------------------------------
let retired = 0;
lines = lines.filter((line) => {
  const match = KEY_LINE.exec(line);
  if (!match || !RETIRED.includes(match[1])) return true;
  retired += 1;
  return false;
});

// ---- locate the three language blocks --------------------------------------
const blocks = [];
lines.forEach((line, index) => {
  const open = BLOCK_OPEN.exec(line);
  if (open) {
    blocks.push({ lang: open[1], start: index, end: -1, added: 0 });
    return;
  }
  if (blocks.length && blocks[blocks.length - 1].end === -1 && BLOCK_CLOSE.test(line)) {
    blocks[blocks.length - 1].end = index;
  }
});
if (blocks.length !== LANGS.length || blocks.some((b) => b.end === -1)) {
  throw new Error(
    `expected ${LANGS.length} closed language blocks, found ${JSON.stringify(blocks)}`
  );
}

// ---- insert any key a block does not already have ---------------------------
const output = [];
let cursor = 0;

for (const block of blocks) {
  const bodyLines = lines.slice(block.start + 1, block.end);
  const present = new Set();
  let match;
  const body = bodyLines.join('\n');
  const scan = new RegExp(KEY_LINE.source, 'gm');
  while ((match = scan.exec(body))) present.add(match[1]);

  const owned = new Set(keys);
  const missing = keys.filter((key) => !present.has(key));
  block.added = missing.length;

  // This script owns every key in render-copy.json: drop the previous run's
  // marker and keys so re-running regenerates that block in one deterministic
  // place instead of accumulating a second copy further down the language.
  const kept = bodyLines.filter((line) => {
    if (isMarker(line)) return false;
    const match = KEY_LINE.exec(line);
    return !(match && owned.has(match[1]));
  });
  while (kept.length && kept[kept.length - 1].trim() === '') kept.pop();

  const generated = keys.length
    ? ['', MARKER, ...keys.map((key) => `    '${key}': '${escapeForJs(copy[key][block.lang])}',`)]
    : [];

  output.push(...lines.slice(cursor, block.start + 1), ...kept, ...generated);
  cursor = block.end;
}
output.push(...lines.slice(cursor));

const next = output.join('\n');

// ---- verify before writing --------------------------------------------------
// The table is the last top-level assignment before TranslationEngine, so its
// closer has to be found from that landmark: a plain indexOf would stop at the
// first `\n};` in the file, whatever that happens to be.
const start = next.indexOf('const translations = {');
const engineAt = next.indexOf('\nconst TranslationEngine = {');
const end = next.lastIndexOf('\n};', engineAt === -1 ? next.length : engineAt);
if (start === -1 || end < start) {
  throw new Error('could not locate the translations object in the table');
}
const table = vm.runInNewContext(
  `(function () { ${next.slice(start, end + 3)} return translations; })()`,
  {}
);

for (const block of blocks) {
  for (const key of keys) {
    if (table[block.lang][key] !== copy[key][block.lang]) {
      throw new Error(`${key}: ${block.lang} did not round-trip`);
    }
  }
}
for (const key of RETIRED) {
  for (const lang of LANGS) {
    if (key in table[lang]) throw new Error(`${key} survived retirement in ${lang}`);
  }
}

const size = Object.keys(table.en).length;
console.log(
  `retired ${retired} line(s), added ${blocks.map((b) => `${b.lang}+${b.added}`).join(' ')}`
);
console.log(
  `table: en=${Object.keys(table.en).length} fil=${Object.keys(table.fil).length} bcl=${Object.keys(table.bcl).length}`
);
if (size !== Object.keys(table.fil).length || size !== Object.keys(table.bcl).length) {
  throw new Error('language blocks are no longer the same size');
}

if (!write) {
  console.log('dry run - pass --write to apply');
} else {
  fs.writeFileSync(TABLE, next);
  console.log(`wrote ${TABLE}`);
}
