const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  validProject,
  renderProjects,
  loadDPWHProjects,
} = require('../../assets/js/dpwh-projects.js');
const root = path.resolve(__dirname, '../..');
function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}
function container() {
  const body = { innerHTML: '' };
  const more = { innerHTML: '', querySelector: () => null };
  return {
    innerHTML: '',
    body,
    querySelector: (selector) => (selector === '#dpwh-table-body' ? body : more),
    querySelectorAll: () => [],
  };
}
test('draft and empty DPWH data display an unavailable state without zero totals', () => {
  for (const data of [{ _status: 'draft', projects: [] }, { projects: [] }]) {
    const target = container();
    renderProjects(target, data);
    assert.match(target.innerHTML, /Verified Albay project data is not yet available/);
    assert.doesNotMatch(target.innerHTML, /Total Investment/);
  }
});
test('valid DPWH rows render without summary, invalid rows are excluded, text is escaped', () => {
  const target = container();
  const project = { name: '<script>alert(1)</script>', category: 'Road', cost: 2500, status: 100 };
  renderProjects(target, { projects: [project, { ...project, cost: null }] });
  assert.match(target.body.innerHTML, /&lt;script&gt;/);
  assert.match(target.body.innerHTML, /2,500.00/);
  assert.doesNotMatch(target.body.innerHTML, /<script>/);
  assert.equal(validProject({ ...project, status: NaN }), false);
  assert.equal(validProject({ ...project, _status: 'draft' }), false);
});
test('DPWH HTTP failure produces a distinct visible failure state', async () => {
  const target = container();
  const originalFetch = global.fetch;
  const originalDocument = global.document;
  const originalError = console.error;
  global.document = { getElementById: () => target };
  global.fetch = async () => ({ ok: false, status: 503 });
  console.error = () => {};
  try {
    await loadDPWHProjects();
    assert.match(target.innerHTML, /could not be loaded/);
  } finally {
    global.fetch = originalFetch;
    global.document = originalDocument;
    console.error = originalError;
  }
});
test('all translation dictionaries parse and retired history values cannot restore Solano claims', () => {
  const context = {
    document: { readyState: 'loading', addEventListener: () => {} },
    module: { exports: {} },
  };
  vm.runInNewContext(read('assets/js/translations.js'), context);
  const dictionaries = context.module.exports.translations;
  for (const language of ['en', 'fil', 'ilo']) {
    assert.ok(dictionaries[language]);
    assert.doesNotMatch(dictionaries[language]['home-history-1760'], /Bintauan|Gaddang/);
    assert.doesNotMatch(
      dictionaries[language]['home-albay-municipal-hall-nueva-vizcaya-3708'],
      /3708|Municipal Hall/
    );
  }
});
test('static emergency contacts work without JavaScript including offline page', () => {
  for (const file of [
    'index.html',
    'offline.html',
    'contact/index.html',
    'services/public-safety.html',
    'government/officials.html',
  ]) {
    const source = read(file);
    assert.match(source, /href="tel:911"/);
    assert.match(source, /https:\/\/ehotlines.e.gov.ph\//);
    assert.doesNotMatch(source, /href="tel:(?!911")/);
  }
});
test('census is correctly dated and service records do not claim unverified fees', () => {
  for (const file of ['index.html', 'statistics/index.html']) {
    const source = read(file);
    assert.match(source, /1,374,768/);
    assert.match(source, /2020 Census/);
    assert.doesNotMatch(source, /69,296|16\.5167|121\.1833/);
  }
  for (const service of JSON.parse(read('data/services.json')).services) {
    assert.equal(service.fee, 'Not verified');
    assert.equal(service.processingTime, 'Not verified');
  }
});

test('navigation labels remain usable in all static languages', () => {
  const context = {
    document: { readyState: 'loading', addEventListener: () => {} },
    module: { exports: {} },
  };
  vm.runInNewContext(read('assets/js/translations.js'), context);
  const expected = {
    en: ['Home', 'Services'],
    fil: ['Tahanan', 'Mga Serbisyo'],
    ilo: ['Pagtaengan', 'Dagiti Serbisio'],
  };
  for (const [language, labels] of Object.entries(expected)) {
    assert.equal(context.module.exports.translations[language]['bc-home'], labels[0]);
    assert.equal(context.module.exports.translations[language]['bc-services'], labels[1]);
  }
});
