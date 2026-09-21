'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const copy = require('../data/service-guide-copy.json');
const file = path.join(root, 'assets/js/translations.js');
let source = fs.readFileSync(file, 'utf8');
for (const [lang, strings] of Object.entries(copy)) {
  const start = source.indexOf(`  ${lang}: {`);
  const end = source.indexOf('\n  },', start);
  if (start < 0 || end < 0) throw new Error(`Missing translation block: ${lang}`);
  let block = source.slice(start, end);
  block = block.replace(
    /\n    \/\/ Service guide copy START[\s\S]*?\/\/ Service guide copy END\n?/,
    ''
  );
  const newStrings = Object.fromEntries(
    Object.entries(strings).filter(([key]) => key.startsWith('sg-'))
  );
  block +=
    '\n    // Service guide copy START\n' +
    Object.entries(newStrings)
      .map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
      .join('\n') +
    '\n    // Service guide copy END\n';
  for (const key of ['services-title', 'services-subtitle']) {
    const pattern = new RegExp(`('${key}':\\s*)(?:'[^']*'|"[^"]*")`);
    if (!pattern.test(block)) throw new Error(`Missing translation key: ${lang}.${key}`);
    block = block.replace(pattern, (_, prefix) => prefix + JSON.stringify(strings[key]));
  }
  source = source.slice(0, start) + block + source.slice(end);
}
fs.writeFileSync(file, source);
