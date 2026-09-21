const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { buildServiceCard, fetchServices } = require('../../assets/js/services-category.js');
const copy = require('../../data/service-guide-copy.json');
const root = path.resolve(__dirname, '../..');

test('every generated guide has accessible preparation, summary and related navigation', () => {
  for (const file of fs
    .readdirSync(path.join(root, 'service-details'))
    .filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, 'service-details', file), 'utf8');
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, file);
    assert.equal((html.match(/<details /g) || []).length, 2, file);
    assert.match(html, /<ol class="guide-steps">/);
    assert.match(html, /sg-general/);
    assert.match(html, /<dl class="guide-summary">/);
    assert.ok(!html.includes('<style>'), file + ' retains obsolete styles');
    for (const [, key] of html.matchAll(/data-i18n="(sg-[^"]+)"/g)) {
      for (const lang of ['en', 'fil', 'bcl'])
        assert.ok(copy[lang][key], `${file}: ${lang} ${key}`);
    }
  }
});
test('nonlinked services have no false guide action', () => {
  assert.ok(
    !buildServiceCard({ id: 'example', title: 'Example', url: '../services/health' }).includes(
      'View guide'
    )
  );
});
test('load failure is distinguishable from an empty service list', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(fetchServices('/test'), /503/);
    global.fetch = async () => ({ ok: true, json: async () => ({ services: [] }) });
    assert.deepEqual(await fetchServices('/test'), []);
  } finally {
    global.fetch = original;
  }
});
test('guide and category generation is idempotent', () => {
  const files = [
    'assets/js/translations.js',
    ...['services', 'service-details'].flatMap((dir) =>
      fs
        .readdirSync(path.join(root, dir))
        .filter((f) => f.endsWith('.html'))
        .map((f) => dir + '/' + f)
    ),
  ];
  const before = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
  for (const script of [
    'sync-service-guide-copy.js',
    'build-services-pages.js',
    'build-service-guides.js',
  ])
    execFileSync(process.execPath, [path.join(root, 'scripts', script)]);
  files.forEach((file, i) =>
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), before[i], file)
  );
});
