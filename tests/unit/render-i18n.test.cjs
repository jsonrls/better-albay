/**
 * Guards the contract between the statistics renderers and the translation table.
 *
 * The renderers mark their text with `data-i18n` keys; the table holds those keys'
 * three-language values. Nothing at runtime complains when the two disagree - the
 * i18n engine silently keeps the English default - so a missing or mistyped key
 * ships as an English-only string on an otherwise translated page. These tests make
 * that failure loud in CI instead.
 *
 * Run: node --test tests/unit/render-i18n.test.cjs
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..');
const RENDERER = path.join(ROOT, 'assets/js/statistics-data.js');
const TABLE = path.join(ROOT, 'assets/js/translations.js');

const LANGS = ['en', 'fil', 'bcl'];

const rendererSource = fs.readFileSync(RENDERER, 'utf8');
const tableSource = fs.readFileSync(TABLE, 'utf8');

const start = tableSource.indexOf('const translations = {');
const end = tableSource.indexOf('\n};', start);
assert.ok(start > -1 && end > start, 'could not locate the translations table');

const translations = vm.runInNewContext(
  `(function () { ${tableSource.slice(start, end + 3)} return translations; })()`,
  {}
);

/** Keys are string literals beginning with `stats-` and containing no selector syntax. */
const referenced = Array.from(
  new Set(
    (rendererSource.match(/['"]stats-[a-z0-9-]+['"]/g) || [])
      .map((literal) => literal.slice(1, -1))
      .filter((key) => /^stats-[a-z0-9-]+$/.test(key))
  )
).sort();

const paramsOf = (text) => (text.match(/\{\{(\w+)\}\}/g) || []).sort().join(',');

test('the table defines the same keys in all three languages', () => {
  const counts = LANGS.map((lang) => Object.keys(translations[lang]).length);
  assert.deepStrictEqual(counts, [counts[0], counts[0], counts[0]], `key counts differ: ${counts}`);
  assert.ok(counts[0] > 5000, `expected a full table, found ${counts[0]} keys`);
});

test('no translation value carries escaping artefacts', () => {
  // The table is single-quoted JavaScript, so the only backslash a value may
  // legitimately contain is an escaped apostrophe - which the parser removes.
  // A surviving backslash means a layer of escaping leaked into the text and
  // renders on screen, and `""` means a quote was escaped twice.
  const offenders = [];
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(translations[lang])) {
      if (typeof value !== 'string') continue;
      if (value.includes('\\')) offenders.push(`${lang} ${key}: backslash`);
      if (/"{2,}/.test(value)) offenders.push(`${lang} ${key}: doubled quote`);
    }
  }
  assert.deepStrictEqual(offenders, [], `escaping artefacts: ${offenders.slice(0, 5).join('; ')}`);
});

test('the renderer references translation keys', () => {
  assert.ok(
    referenced.length >= 60,
    `expected the renderers to reference at least 60 keys, found ${referenced.length}`
  );
});

test('every key the renderer uses exists in all three languages', () => {
  const missing = referenced.filter((key) => !translations.en[key]);
  assert.deepStrictEqual(missing, [], `keys with no English value: ${missing.join(', ')}`);

  for (const lang of LANGS.slice(1)) {
    const untranslated = referenced.filter((key) => !translations[lang][key]);
    assert.deepStrictEqual(
      untranslated,
      [],
      `keys with no ${lang} value: ${untranslated.join(', ')}`
    );
  }
});

test('every language uses the same interpolation values as English', () => {
  const broken = [];
  for (const key of referenced) {
    const expected = paramsOf(translations.en[key] || '');
    for (const lang of LANGS.slice(1)) {
      const actual = paramsOf(translations[lang][key] || '');
      if (actual !== expected) broken.push(`${key} (${lang}): [${actual}] != [${expected}]`);
    }
  }
  assert.deepStrictEqual(broken, [], broken.join('\n'));
});

/**
 * Where the renderer passes its own English text inline (the no-JavaScript and
 * pre-translation fallback), it must be the same sentence as the table's English
 * value. Otherwise the visible text changes the moment a language is applied,
 * even for an English visitor.
 */
test('inline English in the renderer matches the table', () => {
  const pairs = [];
  const pattern = /tr\(\s*'(stats-[a-z0-9-]+)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*[,)]/g;
  let match;
  while ((match = pattern.exec(rendererSource))) {
    const literal = match[2].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
    pairs.push({ key: match[1], literal, value: translations.en[match[1]] });
  }

  // Only literal second arguments are comparable; where the renderer concatenates
  // a figure into the sentence it passes it as a `{{param}}` instead and is
  // checked by the placeholder test above.
  assert.ok(pairs.length >= 12, `expected at least 12 inline fallbacks, found ${pairs.length}`);

  const mismatches = pairs
    .filter((pair) => pair.value && pair.literal !== pair.value)
    .map((pair) => `${pair.key}:\n  renderer: ${pair.literal}\n  table:    ${pair.value}`);
  assert.deepStrictEqual(mismatches, [], mismatches.join('\n'));
});

/**
 * Chart.js paints legends, axis titles and tooltips into a canvas, so the i18n
 * engine cannot reach them through the DOM. The renderer keeps a registry and
 * relabels the charts itself - which only works if something calls it.
 */
test('the chart relabelling path is wired up', () => {
  assert.ok(/function translateCharts\s*\(/.test(rendererSource), 'translateCharts is not defined');
  assert.ok(
    /document\.addEventListener\(\s*'languageChanged'/.test(rendererSource),
    'nothing listens for a language change, so charts keep their first language'
  );
  assert.ok(
    (rendererSource.match(/\btranslateCharts\(\)/g) || []).length >= 2,
    'translateCharts is defined but never called'
  );
  assert.ok(
    /registerChartCopy\(/.test(rendererSource),
    'no chart registers its copy, so its labels cannot be translated'
  );
});
