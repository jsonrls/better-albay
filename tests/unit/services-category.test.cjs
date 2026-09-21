const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const {
  OFFICES,
  DEFAULT_ICON,
  escapeHtml,
  isRealText,
  iconFor,
  detailUrlFor,
  selectCategoryServices,
  selectCategoryOffices,
  buildServiceCard,
  buildOfficeCard,
  renderCategory,
} = require('../../assets/js/services-category.js');
const renderer = require('../../assets/js/services-category.js');

const root = path.resolve(__dirname, '../..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

/** The placeholder that stands in for text no one has verified yet. */
const PLACEHOLDER = 'Information pending verification.';

/** The ten category pages, with the i18n prefix each one uses. */
const PAGES = [
  ['certificates', 'cert'],
  ['business', 'biz'],
  ['tax-payments', 'tax'],
  ['social-services', 'social'],
  ['health', 'health'],
  ['agriculture', 'agri'],
  ['infrastructure', 'infra'],
  ['education', 'edu'],
  ['public-safety', 'safety'],
  ['environment', 'env'],
];

const LANGS = ['en', 'fil', 'bcl'];

/** Loads the translation table out of assets/js/translations.js. */
function loadTranslations() {
  const src = read('assets/js/translations.js');
  const start = src.indexOf('const translations = {');
  const end = src.indexOf('\n};', start);
  return vm.runInNewContext(
    '(function(){' + src.slice(start, end + 3) + ' return translations;})()',
    {}
  );
}

const translations = loadTranslations();
const services = JSON.parse(read('data/services.json')).services;

test('the renderer exposes the surface the category pages use', () => {
  for (const name of [
    'OFFICES',
    'DEFAULT_ICON',
    'escapeHtml',
    'isRealText',
    'iconFor',
    'detailUrlFor',
    'selectCategoryServices',
    'selectCategoryOffices',
    'buildServiceCard',
    'buildOfficeCard',
    'renderCategory',
  ]) {
    assert.ok(name in renderer, `missing export: ${name}`);
  }
});

test('every category page renders its heading from a translation key', () => {
  for (const [category, prefix] of PAGES) {
    const html = read(`services/${category}.html`);

    const h1 = html.match(/<h1([^>]*)>([\s\S]*?)<\/h1>/);
    assert.ok(h1, `${category}.html has no <h1>`);
    assert.match(
      h1[1],
      new RegExp(`data-i18n="${prefix}-page-title"`),
      `${category}.html <h1> is not bound to ${prefix}-page-title`
    );

    // The old stub pages carried the same unverified caveat as body copy and a
    // hardcoded <ul> of links; both are replaced by the rendered cards.
    assert.ok(
      !html.includes('Albay-specific requirements'),
      `${category}.html still carries the old placeholder paragraph`
    );
    assert.ok(
      !/<ul>[\s\S]{0,400}service-details/.test(html),
      `${category}.html still lists services by hand`
    );

    assert.match(
      html,
      /data-i18n="svc-verification-notice"/,
      `${category}.html lost the verification notice`
    );
  }
});

test('each category page mounts the renderer once, for its own category', () => {
  for (const [category, prefix] of PAGES) {
    const html = read(`services/${category}.html`);

    const loads = html.match(/services-category\.js/g) || [];
    assert.equal(loads.length, 1, `${category}.html should load services-category.js exactly once`);

    const mount = html.match(/id="services-category"[^>]*/);
    assert.ok(mount, `${category}.html has no services-category mount point`);
    assert.match(mount[0], new RegExp(`data-category="${category}"`));

    // The badge is the one piece of the header that is not the heading itself.
    assert.match(html, new RegExp(`data-i18n="${prefix}-page-badge"`));
    assert.match(html, new RegExp(`data-i18n="${prefix}-page-desc"`));
  }
});

test('the category headings carry real text in every language', () => {
  for (const [, prefix] of PAGES) {
    for (const suffix of ['page-title', 'page-badge', 'page-desc']) {
      const key = `${prefix}-${suffix}`;
      for (const lang of LANGS) {
        const value = translations[lang][key];
        assert.ok(value, `${lang} is missing ${key}`);
        assert.notEqual(value, PLACEHOLDER, `${lang} ${key} is still a placeholder`);
      }
    }
  }
});

test('the shared layout labels carry real text in every language', () => {
  for (const key of [
    'label-fee',
    'label-time',
    'offices-title',
    'svc-verification-notice',
    'svc-loading',
    'svc-empty',
  ]) {
    for (const lang of LANGS) {
      const value = translations[lang][key];
      assert.ok(value, `${lang} is missing ${key}`);
      assert.notEqual(value, PLACEHOLDER, `${lang} ${key} is still a placeholder`);
    }
  }
});

test('every office listed by the renderer is a real record with a detail page', () => {
  for (const [category, ids] of Object.entries(OFFICES)) {
    assert.ok(
      PAGES.some(([page]) => page === category),
      `${category} is not one of the ten category pages`
    );

    for (const id of ids) {
      const record = services.find((service) => service.id === id);
      assert.ok(record, `${category} lists "${id}", which is not in services.json`);
      assert.equal(record.categoryId, category, `${id} is filed under ${record.categoryId}`);
      assert.match(record.url, /^\.\.\/service-details\//, `${id} has no detail page to link to`);
    }
  }
});

test('no service record is dropped or shown twice', () => {
  for (const [category] of PAGES) {
    const all = services.filter((service) => service.categoryId === category);
    const cards = selectCategoryServices(services, category);
    const offices = selectCategoryOffices(services, category);

    assert.ok(cards.length > 0, `${category} rendered no services`);
    assert.equal(
      cards.length + offices.length,
      all.length,
      `${category} dropped or duplicated a record`
    );

    const ids = new Set([...cards, ...offices].map((record) => record.id));
    assert.equal(ids.size, all.length, `${category} has a repeated record`);
  }
});

test('service cards only link when the service has a detail page', () => {
  for (const record of services) {
    const markup = buildServiceCard(record);
    const linked = detailUrlFor(record) !== '';

    if (linked) {
      assert.match(
        markup,
        /^<a class="service-item-card service-item-link" href="\.\.\/service-details\//
      );
    } else {
      assert.match(markup, /^<div class="service-item-card">/);
      assert.ok(!markup.includes('href='), `${record.id} links to a page that does not exist`);
    }

    assert.ok(markup.includes(escapeHtml(record.title)), `${record.id} lost its title`);
  }
});

test('the fee and time row stays out until a real value is verified', () => {
  // Every service in the data is unverified, so no card may claim a fee.
  for (const record of services) {
    const markup = buildServiceCard(record);
    assert.ok(
      !markup.includes('service-item-meta'),
      `${record.id} shows an unverified fee or time`
    );
    assert.ok(!markup.includes('Not verified'), `${record.id} shows the raw unverified marker`);
    assert.ok(!markup.includes(PLACEHOLDER), `${record.id} shows placeholder text`);
  }

  // Adding a verified fee is all it takes for the row to appear.
  const verified = { ...services[0], fee: '₱150', processingTime: '15-30 mins' };
  const markup = buildServiceCard(verified);
  assert.match(markup, /class="service-item-meta"/);
  assert.match(markup, /data-i18n="label-fee"/);
  assert.match(markup, /₱150/);
  assert.match(markup, /data-i18n="label-time"/);
  assert.match(markup, /15-30 mins/);
});

test('renderCategory fills the grid and toggles the offices band', () => {
  const withOffices = {
    grid: { innerHTML: '' },
    section: { hidden: true },
    officeGrid: { innerHTML: '' },
  };

  const cards = renderCategory('certificates', services, withOffices);
  assert.equal(cards, selectCategoryServices(services, 'certificates').length);
  assert.equal(withOffices.section.hidden, false);
  assert.match(withOffices.officeGrid.innerHTML, /class="office-card"/);

  const withoutOffices = {
    grid: { innerHTML: '' },
    section: { hidden: true },
    officeGrid: { innerHTML: '' },
  };

  renderCategory('health', services, withoutOffices);
  assert.equal(
    withoutOffices.section.hidden,
    true,
    'the offices band should hide when there are none'
  );
  assert.equal(withoutOffices.officeGrid.innerHTML, '');
});

test('renderCategory falls back to a message when a category is empty', () => {
  const fake = {
    grid: { innerHTML: '' },
    section: { hidden: true },
    officeGrid: { innerHTML: '' },
  };
  renderCategory('does-not-exist', services, fake);
  assert.match(fake.grid.innerHTML, /data-i18n="svc-empty"/);
});

test('helpers treat the unverified markers as empty', () => {
  assert.equal(isRealText('Not verified'), false);
  assert.equal(isRealText('have not been verified yet'), false);
  assert.equal(isRealText('Information pending verification.'), false);
  assert.equal(isRealText('   '), false);
  assert.equal(isRealText(undefined), false);
  assert.equal(isRealText('₱150'), true);

  assert.equal(
    escapeHtml('<b>"x" & \'y\'</b>'),
    '&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;'
  );
  assert.equal(iconFor('police-clearance'), 'bi-shield-check');
  assert.equal(iconFor('nothing-matches-this'), DEFAULT_ICON);
  assert.equal(iconFor(undefined), DEFAULT_ICON);

  const office = buildOfficeCard({
    id: 'civil-registrar',
    title: 'Municipal Civil Registrar',
    url: '../service-details/civil-registrar.html',
  });
  assert.match(
    office,
    /^<a class="office-card" href="\.\.\/service-details\/civil-registrar\.html">/
  );
  assert.ok(
    !office.includes('office-card-desc'),
    'an unverified description should not be rendered'
  );
});
