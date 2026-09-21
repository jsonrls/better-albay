const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  validProject,
  decodeProjects,
  renderProjects,
  loadDPWHProjects,
  stageOf,
  typeOf,
} = require('../../assets/js/dpwh-projects.js');
const {
  FIGURE_ELEMENT_IDS,
  isValidQuarter,
  buildQuarterMap,
  listFiscalYears,
  sortQuarters,
} = require('../../assets/js/transparency-v2.js');
const { isValidItem } = require('../../scripts/sync-facebook.js');
const {
  resolveLink,
  matchesAlbay,
  isSameStory,
  publishedAt,
  classifyNews,
  cleanText,
  extractLeadImage,
  normalizeImageUrl,
  storyGroups,
} = require('../../scripts/sync-news.js');
const root = path.resolve(__dirname, '../..');
function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
test('the published DPWH dataset decodes into reconciled, renderable contracts', () => {
  const payload = decodeProjects(JSON.parse(read('data/dpwh-projects.json')));
  assert.notEqual(payload._status, 'draft');
  assert.ok(Array.isArray(payload.projects) && payload.projects.length > 0);
  assert.ok(Array.isArray(payload._columns) && payload._columns.length > 0);
  assert.deepEqual(Object.keys(payload._dictionaries).sort(), [
    'category',
    'funding',
    'office',
    'program',
    'stage',
  ]);
  assert.match(payload._source.url, /^https:\/\/transparency\.dpwh\.gov\.ph\/$/);
  assert.match(payload._retrieved, /^\d{4}-\d{2}-\d{2}$/);

  // Every record must satisfy the renderer's own validity contract, or it is silently dropped.
  const invalid = payload.projects.filter((project) => !validProject(project));
  assert.equal(invalid.length, 0, `${invalid.length} contracts would be silently dropped`);

  // Costs must add up to the total the portal itself published, to the centavo.
  const total = payload.projects.reduce((sum, project) => sum + project.cost, 0);
  assert.equal(round2(total), payload._coverage.totalCost);
  assert.equal(payload.projects.length, payload._coverage.contracts);

  // Stage counts must be complete and must match the coverage block exactly.
  const stages = {};
  for (const project of payload.projects) {
    const stage = stageOf(project);
    stages[stage] = (stages[stage] || 0) + 1;
  }
  assert.deepEqual(stages, payload._coverage.byStage);
  assert.deepEqual(Object.keys(payload._coverage.byOffice).sort(), [
    'Albay 1st DEO',
    'Albay 2nd DEO',
    'Albay 3rd DEO',
  ]);

  // Unique contract ids, so no contract can be counted twice.
  assert.equal(
    new Set(payload.projects.map((project) => project.id)).size,
    payload.projects.length
  );

  // Decoding twice must be harmless, and the decoded payload must render.
  const target = container();
  renderProjects(target, decodeProjects(payload));
});
test('DPWH budget figures are never presented as amounts already paid', () => {
  assert.doesNotMatch(read('data/dpwh-projects.json'), /amountPaid/);
  assert.doesNotMatch(read('assets/js/dpwh-projects.js'), /amountPaid|Amount Paid/);
});
test('roadwork that merely mentions drainage is badged as a road, not flood control', () => {
  const row = (name) => ({ name, category: '' });
  assert.equal(typeOf(row('BIP: CONSTRUCTION OF ROAD WITH DRAINAGE SYSTEM ALONG MAYON')), 'roads');
  assert.equal(
    typeOf(row('CONSTRUCTION/UPGRADING OF DRAINAGE ALONG NATIONAL ROADS - SECTION 1')),
    'roads'
  );
  assert.equal(typeOf(row('CONSTRUCTION OF DRAINAGE CANAL, BARANGAY BONOT')), 'flood');
  assert.equal(typeOf(row('FLOOD CONTROL STRUCTURE ALONG NATIONAL ROAD')), 'flood');
  assert.equal(typeOf(row('CONSTRUCTION OF BRIDGE AND FLOOD CONTROL STRUCTURE')), 'bridges');

  // Nothing in the published dataset may describe itself as flood control and still be badged a
  // road, and every contract must land in a known bucket.
  const payload = JSON.parse(read('data/dpwh-projects.json'));
  const projects = decodeProjects(payload).projects;
  const buckets = new Set(['buildings', 'roads', 'bridges', 'flood', 'water', 'other']);
  for (const project of projects) {
    const type = typeOf(project);
    assert.ok(buckets.has(type), `${project.id} produced unknown type ${type}`);
    if (/flood|hydraul|dike|levee|desilt/i.test(project.name)) {
      assert.notEqual(type, 'roads', `${project.id} is badged a road: ${project.name}`);
    }
  }
});
test('all translation dictionaries parse and retired history values cannot restore Solano claims', () => {
  const context = {
    document: { readyState: 'loading', addEventListener: () => {} },
    module: { exports: {} },
  };
  vm.runInNewContext(read('assets/js/translations.js'), context);
  const dictionaries = context.module.exports.translations;
  for (const language of ['en', 'fil', 'bcl']) {
    assert.ok(dictionaries[language]);
    assert.doesNotMatch(dictionaries[language]['home-history-1760'], /Bintauan|Gaddang/);
    // Solano-fork address keys (e.g. home-albay-municipal-hall-nueva-vizcaya-3708) have been
    // removed from translations.js entirely. Verify they stay gone:
    assert.strictEqual(
      dictionaries[language]['home-albay-municipal-hall-nueva-vizcaya-3708'],
      undefined,
      'Legacy Solano address key must not be re-added'
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
    assert.match(source, /href="tel:09544199935"/);
    assert.match(source, /href="tel:09475700332"/);
    assert.match(source, /href="\/contact\/#emergency-hotlines"/);
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
    bcl: ['Harong', 'Mga Serbisyo'],
  };
  for (const [language, labels] of Object.entries(expected)) {
    assert.equal(context.module.exports.translations[language]['bc-home'], labels[0]);
    assert.equal(context.module.exports.translations[language]['bc-services'], labels[1]);
  }
});

// Arbitrary published-quarter fixture; deliberately unrelated to any real budget.
const publishedQuarter = {
  period: 'Q1 2026',
  periodLabel: 'Jan - Mar',
  income: { local: 10, external: 20, total: 30 },
  expenditures: { gps: 5, social: 4, economic: 3, debt: 1, total: 13 },
  netIncome: 17,
  fundBalance: 40,
};

test('published fiscal data exposes reconciled, numeric quarters only', () => {
  const payload = JSON.parse(read('data/fiscal_transparency.json'));
  assert.notEqual(payload._status, 'draft');
  assert.ok(Array.isArray(payload.fiscal_years));
  assert.ok(payload.fiscal_years.length > 0);

  const years = listFiscalYears(payload);
  assert.deepEqual(
    years,
    [...years].sort((a, b) => b - a)
  );
  assert.ok(years.length >= 2);

  let quarters = 0;
  for (const fiscalYear of payload.fiscal_years) {
    for (const [key, quarter] of Object.entries(fiscalYear.quarters)) {
      quarters += 1;
      const where = `${fiscalYear.year} ${key}`;
      assert.equal(isValidQuarter(quarter), true, `${where} must carry only numbers`);
      assert.equal(
        round2(quarter.income.local + quarter.income.external),
        quarter.income.total,
        `${where} income parts must add up to the published total`
      );
      assert.equal(
        round2(
          quarter.expenditures.gps +
            quarter.expenditures.social +
            quarter.expenditures.economic +
            quarter.expenditures.debt
        ),
        quarter.expenditures.total,
        `${where} expenditure parts must add up to the published total`
      );
      assert.equal(
        round2(quarter.income.total - quarter.expenditures.total),
        quarter.netIncome,
        `${where} income less expenditure must equal net operating income`
      );
      assert.ok(quarter.fundBalance > 0, `${where} needs a fund balance`);
    }
  }
  assert.ok(quarters >= 4);

  // The newest year must be the one the dashboard opens on, and its quarters ordered.
  assert.deepEqual(sortQuarters(Object.keys(buildQuarterMap(payload))), ['q1', 'q2']);
});

test('fiscal years are selected explicitly and never merged, so no year is dropped', () => {
  const payload = {
    fiscal_years: [
      { year: 2025, quarters: { q4: { ...publishedQuarter, period: 'FY 2025' } } },
      { year: 2026, quarters: { q1: publishedQuarter } },
    ],
  };
  assert.deepEqual(Object.keys(buildQuarterMap(payload)), ['q1']);
  assert.deepEqual(Object.keys(buildQuarterMap(payload, 2025)), ['q4']);
  assert.deepEqual(Object.keys(buildQuarterMap(payload, 2026)), ['q1']);
  assert.deepEqual(buildQuarterMap(payload, 1999), {});
  assert.deepEqual(listFiscalYears(payload), [2026, 2025]);
  assert.deepEqual(listFiscalYears({ _status: 'draft', fiscal_years: payload.fiscal_years }), []);
});

test('draft fiscal payloads stay empty even when they carry figures', () => {
  const payload = { _status: 'draft', fiscal_years: [{ quarters: { q1: publishedQuarter } }] };
  assert.deepEqual(buildQuarterMap(payload), {});
});

test('published fiscal years expose only validated quarters', () => {
  const map = buildQuarterMap({
    fiscal_years: [{ year: 2026, quarters: { q1: publishedQuarter } }],
  });
  assert.deepEqual(Object.keys(map), ['q1']);
  assert.deepEqual(map.q1, publishedQuarter);
});

test('quarters with missing or non-numeric figures are rejected', () => {
  const nonNumeric = {
    ...publishedQuarter,
    income: { ...publishedQuarter.income, total: '30' },
  };
  assert.deepEqual(buildQuarterMap({ fiscal_years: [{ quarters: { q1: nonNumeric } }] }), {});
  assert.equal(isValidQuarter(null), false);
  assert.equal(isValidQuarter({}), false);
});

test('budget page ships no hardcoded fiscal figures', () => {
  const source = read('budget/index.html');
  assert.deepEqual(source.match(/₱\s?[\d,]+(?:\.\d+)?/g) || [], []);
  assert.match(source, /id="sre-unavailable"/);
  assert.match(source, /Verified Albay financial data is not yet available/);
});

test('every dashboard figure id exists in the budget page', () => {
  const source = read('budget/index.html');
  for (const id of FIGURE_ELEMENT_IDS) {
    assert.ok(source.includes(`id="${id}"`), `${id} is missing from budget/index.html`);
  }
});

test('the published news feed carries only real, attributable Albay stories', () => {
  const feed = JSON.parse(read('data/news.json'));
  assert.equal(feed._status, 'verified');
  assert.match(feed._retrieved, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(feed._source, /Bing News RSS/);
  assert.ok(feed._notes.length > 40, 'the envelope must explain where the feed came from');
  assert.ok(Array.isArray(feed.news), 'news must be an array');
  assert.ok(feed.news.length >= 20, `expected a populated feed, got ${feed.news.length}`);

  const TITLE_MAX = 120;
  const SUMMARY_MAX = 300;
  const ids = new Set();
  const sources = new Set();
  let previewCount = 0;

  for (const item of feed.news) {
    // Reuse the Facebook sync's validator so both feeds agree on what the
    // renderers will accept, and so news.js's own filters can never drop these.
    assert.equal(isValidItem(item), true, `${item.id} is not renderable`);
    assert.ok(item.id.startsWith('news-'), `${item.id} must use the news- prefix`);
    assert.equal(item.id, item.id.toLowerCase(), `${item.id} must be lowercase`);
    assert.ok(!ids.has(item.id), `duplicate id ${item.id}`);
    ids.add(item.id);

    assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/, `bad date on ${item.id}`);
    assert.match(item.url, /^https:\/\/\S+$/, `bad url on ${item.id}`);
    assert.ok(item.title.length <= TITLE_MAX, `title too long on ${item.id}`);
    assert.ok(item.summary.length <= SUMMARY_MAX, `summary too long on ${item.id}`);
    assert.ok(['info', 'success', 'warning'].includes(item.badge), `bad badge on ${item.id}`);
    assert.ok(item.source.length > 0 && item.source.length <= 40, `bad source on ${item.id}`);
    sources.add(item.source);

    // A preview is the publisher's own photograph or nothing at all. It has to
    // be absolute https: a relative or http image would be blocked as mixed
    // content on this HTTPS-only site, and a broken picture reads worse than a
    // card that simply has no picture. An empty string is the honest "none".
    assert.equal(typeof item.image, 'string', `${item.id} must carry an image field`);
    if (item.image) {
      assert.match(item.image, /^https:\/\/\S+$/, `bad image on ${item.id}`);
      previewCount++;
    }

    // The headline itself must name Albay or one of its 18 LGUs. This is the
    // rule that keeps neighbouring-province coverage out of the feed, so a
    // future widening of the queries cannot quietly dilute the page.
    assert.equal(matchesAlbay(item), true, `${item.id} does not name an Albay place`);
    assert.equal(
      /(10-day|weather forecast|horoscope|lottery)/i.test(item.title),
      false,
      `${item.id} is not news`
    );
  }

  assert.ok(sources.size >= 5, `expected several newsrooms, got ${sources.size}`);

  // Not every newsroom publishes preview tags — some block the lookup outright
  // and the MSN mirrors ship no markup at all — so this floor is deliberately
  // low. It is here to catch the extraction silently breaking (every image
  // blank), not to pin today's coverage number.
  assert.ok(previewCount >= 5, `expected real previews, got ${previewCount}`);

  // Newest first, and every item inside the curation window.
  const retrieved = Date.parse(`${feed._retrieved}T00:00:00Z`);
  const window = 180 * 86400000 + 2 * 86400000;
  let previous = Infinity;
  for (const item of feed.news) {
    const at = Date.parse(`${item.date}T00:00:00Z`);
    assert.ok(at <= previous, `feed is not newest-first at ${item.id}`);
    previous = at;
    assert.ok(retrieved - at <= window, `${item.id} is older than the curation window`);
    assert.ok(at - retrieved <= 2 * 86400000, `${item.id} is dated in the future`);
  }
});

test('news curation resolves real publisher links, dedupes syndication and respects dates', () => {
  // Bing wraps the publisher URL in an apiclick redirect; the wrapper must be
  // unwrapped or every card would link back to the aggregator.
  const wrapped =
    'https://www.bing.com/news/apiclick.aspx?ref=FexRss&aid=&tid=abc' +
    '&url=https%3A%2F%2Fwww.pna.gov.ph%2Farticles%2F1284203&c=1';
  assert.equal(resolveLink(wrapped), 'https://www.pna.gov.ph/articles/1284203');
  assert.equal(
    resolveLink('https://www.pna.gov.ph/articles/1?x=1'),
    'https://www.pna.gov.ph/articles/1?x=1'
  );
  assert.equal(resolveLink('https://x.test/a?u=c&amp;d=e'), 'https://x.test/a?u=c&d=e');

  // Relevance is judged on the headline alone: excerpts are boilerplate-heavy
  // and drag in region-wide and neighbouring-province stories.
  assert.equal(matchesAlbay({ title: 'Albay declares state of calamity over dengue surge' }), true);
  assert.equal(matchesAlbay({ title: '276 Legazpi mothers get financial aid' }), true);
  assert.equal(matchesAlbay({ title: 'Mayon Volcano ash emission observed' }), true);
  assert.equal(matchesAlbay({ title: 'Daraga in Albay equips 54 barangays' }), true);
  assert.equal(matchesAlbay({ title: 'Bicol inflation slightly accelerates' }), false);
  assert.equal(matchesAlbay({ title: 'PCSO boosts healthcare in Bohol' }), false);
  assert.equal(matchesAlbay({ title: 'Naga City opens new park' }), false);

  // The same story filed by several outlets must collapse to one card, so the
  // 0.6 overlap is measured against the shorter headline.
  assert.equal(
    isSameStory(
      { title: 'Albay declares state of calamity over dengue surge' },
      { title: 'Albay under state of calamity as dengue cases hit 1,785' }
    ),
    true
  );
  assert.equal(
    isSameStory(
      { title: 'Mayon Volcano ash emission observed' },
      { title: 'P500,000 in suspected shabu seized from 2 drug suspects' }
    ),
    false
  );

  // An aggregator that re-crawls an old article assigns it a fresh pubDate, so
  // the publisher's own YYYY/MM/DD path has to win — otherwise years-old
  // coverage would be shown as breaking news and would slip past the window.
  const recrawled = {
    date: 'Tue, 15 Sep 2026 02:00:00 GMT',
    url: 'https://businessmirror.com.ph/2025/02/03/some-old-story/',
  };
  assert.equal(
    publishedAt(recrawled),
    Date.UTC(2025, 1, 3),
    'an embedded article date must override a re-crawl pubDate'
  );
  assert.equal(
    publishedAt({
      date: 'Tue, 15 Sep 2026 02:00:00 GMT',
      url: 'https://pna.gov.ph/articles/1284203',
    }),
    Date.parse('Tue, 15 Sep 2026 02:00:00 GMT'),
    'a URL without a date must not lose its pubDate'
  );

  // Topic comes from the headline; an excerpt that merely mentions Mayon must
  // not retag a livelihood story as a volcanic hazard.
  assert.equal(
    classifyNews({ title: 'Mayon Volcano ash emission observed', summary: '' }).badge,
    'warning'
  );
  assert.equal(
    classifyNews({ title: 'Mayon Volcano ash emission observed', summary: '' }).category,
    'Disaster'
  );
  assert.equal(
    classifyNews({
      title: 'DSWD livelihood program empowers Camalig artisans',
      summary: 'near Mayon Volcano',
    }).category,
    'Economy'
  );
  assert.equal(
    classifyNews({ title: 'Albay mobilizes village brigades vs dengue', summary: '' }).badge,
    'warning'
  );

  // Decoding is the last line of defence against publisher markup reaching the
  // page, and `&amp;` must be decoded last or `&amp;lt;` would become a tag.
  assert.equal(cleanText('<![CDATA[Ash&#241;fall &amp; lava]]>'), 'Ashñfall & lava');
  assert.equal(cleanText('a &lt;b&gt; c'), 'a <b> c');
});

test('the Facebook sync preserves the news envelope instead of erasing provenance', () => {
  const { readEnvelope, serialize } = require('../../scripts/sync-facebook.js');
  const feed = JSON.parse(read('data/news.json'));

  // The two syncs write different id prefixes into one array, so a Facebook run
  // has to refresh its own items without dropping the news sync's provenance —
  // including `_status`, which gates whether anything renders at all.
  const envelope = readEnvelope();
  for (const key of Object.keys(feed).filter((k) => k.startsWith('_'))) {
    assert.ok(key in envelope, `${key} was dropped from the envelope`);
  }
  assert.equal(envelope._status, feed._status);
  assert.match(envelope._retrieved, /^\d{4}-\d{2}-\d{2}$/);

  const written = JSON.parse(serialize([], envelope));
  assert.equal(written._status, 'verified');
  assert.equal(written._source, feed._source);
  assert.deepEqual(written.news, []);
});

/**
 * A renderer that cannot find its mount point fails silently: the section just
 * stays empty, which is indistinguishable from "we have no verified data yet".
 * Both feed scripts shipped the id they look up, but the ids were read from
 * each script's own source here so a rename on either side breaks this test
 * instead of quietly blanking the homepage.
 */
test('the homepage mounts the elements its feed scripts look up', () => {
  // Every page that loads a feed script, and the element that script looks up.
  // A renamed id on either side used to leave the page silently blank.
  const pages = {
    'index.html': {
      'assets/js/news.js': 'home-news-grid',
      'assets/js/fb-feed.js': 'fb-feed',
    },
    'news/index.html': {
      'assets/js/news.js': 'news-grid',
      'assets/js/fb-feed.js': 'fb-feed',
    },
  };

  for (const [page, mounts] of Object.entries(pages)) {
    const html = read(page);
    for (const [file, id] of Object.entries(mounts)) {
      const source = read(file);
      assert.match(
        source,
        new RegExp(`getElementById\\('${id}'\\)`),
        `${file} no longer looks up #${id} — update this test with the new id`
      );
      assert.match(html, new RegExp(file.replace(/\./g, '\\.')), `${page} must load ${file}`);
      assert.match(html, new RegExp(`id="${id}"`), `${page} is missing the #${id} mount point`);
    }

    // An empty-state string is the tell that the feed rendered but had nothing
    // to show; it must not be hardcoded into the markup, or it would show before
    // the fetch resolves and mask a broken mount.
    assert.doesNotMatch(html, /Verified Albay news is not yet available/);
  }
});

test('news previews come from the publisher\u2019s own tags, never a stand-in', () => {
  // The preview has to be the publisher's own lead photograph. The sync reads
  // the very Open Graph / Twitter card tags a newsroom emits so that links to
  // its stories unfurl with a picture — the same tags a social crawler reads —
  // and stores the result verbatim. There is no fallback artwork anywhere on
  // this path: no match means an empty string, and the card renders text-only.
  const page = (head) => `<html><head>${head}</head><body><p>story</p></body></html>`;

  // Every tag order the publishers actually use.
  assert.equal(
    extractLeadImage(
      page('<meta property="og:image" content="https://files01.pna.gov.ph/ograph/x.jpg">')
    ),
    'https://files01.pna.gov.ph/ograph/x.jpg'
  );
  assert.equal(
    extractLeadImage(page('<meta content="https://media.philstar.com/x.jpg" property="og:image">')),
    'https://media.philstar.com/x.jpg'
  );
  assert.equal(
    extractLeadImage(page('<meta name="twitter:image" content="https://images.gmanews.tv/x.jpg">')),
    'https://images.gmanews.tv/x.jpg'
  );
  assert.equal(
    extractLeadImage(page('<link rel="image_src" href="https://rpnradio.com/x.jpg">')),
    'https://rpnradio.com/x.jpg'
  );

  // A featured-image tag wins over a site-wide logo, so the card shows the
  // story's own picture rather than the masthead on every row.
  assert.equal(
    extractLeadImage(
      page(
        '<meta property="og:image" content="https://www.rappler.com/tachyon/news.jpg">' +
          '<meta name="twitter:image" content="https://www.rappler.com/logo.png">'
      )
    ),
    'https://www.rappler.com/tachyon/news.jpg'
  );

  // Relative and protocol-relative hrefs are resolved against the article, and
  // HTML entities in the URL are decoded before it is stored.
  assert.equal(
    extractLeadImage(
      page('<meta property="og:image" content="/img/lead.jpg">'),
      'https://thechronicle.com.ph/2026/09/15/story/'
    ),
    'https://thechronicle.com.ph/img/lead.jpg'
  );
  assert.equal(
    extractLeadImage(
      page('<meta property="og:image" content="//cdn.test.co/a.jpg">'),
      'https://x.test/p'
    ),
    'https://cdn.test.co/a.jpg'
  );
  assert.equal(
    extractLeadImage(
      page('<meta property="og:image" content="https://journal.com.ph/a.jpg?w=1&amp;h=2">')
    ),
    'https://journal.com.ph/a.jpg?w=1&h=2'
  );

  // Plain http is refused rather than upgraded: the site is HTTPS-only, so the
  // browser would block the image and the card would show a broken picture.
  assert.equal(normalizeImageUrl('http://pna.gov.ph/a.jpg', 'https://x.test/p'), '');
  // Inline data: URIs and non-URL junk are not publisher photographs.
  assert.equal(normalizeImageUrl('data:image/gif;base64,R0lGOD', 'https://x.test/p'), '');
  assert.equal(normalizeImageUrl('javascript:alert(1)', 'https://x.test/p'), '');
  assert.equal(normalizeImageUrl('', 'https://x.test/p'), '');
  assert.equal(normalizeImageUrl(null, 'https://x.test/p'), '');

  // A page that publishes nothing usable yields nothing — not a placeholder.
  assert.equal(extractLeadImage(page('<title>Story with no preview image</title>')), '');
  assert.equal(extractLeadImage(''), '');
});

test('a story filed by several outlets keeps their links as image fallbacks', () => {
  // Curated stories collapse across outlets, and the link that survives is
  // often an MSN mirror — client-rendered, with no preview tags at all. The
  // other outlets' links are kept so the lookup can fall back to a newsroom
  // that does publish a picture of the same event.
  const raw = [
    {
      title: 'Albay declares state of calamity over dengue surge',
      url: 'https://www.msn.com/en-ph/news/a/ar-AA1',
      date: 'Tue, 15 Sep 2026 02:00:00 GMT',
    },
    {
      title: 'Albay under state of calamity as dengue cases hit 1,785',
      url: 'https://www.pna.gov.ph/articles/1284203',
      date: 'Tue, 15 Sep 2026 03:00:00 GMT',
    },
    {
      title: 'Mayon Volcano ash emission observed',
      url: 'https://www.gmanetwork.com/news/mayon',
      date: 'Mon, 14 Sep 2026 02:00:00 GMT',
    },
  ];

  const groups = storyGroups(raw);
  assert.equal(groups.length, 2, 'the two dengue headlines are one story');
  assert.equal(groups[1].keep.url, 'https://www.gmanetwork.com/news/mayon');

  const dengue = groups.find((g) => /dengue/.test(g.keep.title.toLowerCase()));
  assert.ok(dengue, 'the dengue story must survive grouping');
  assert.ok(
    dengue.alternates.includes('https://www.msn.com/en-ph/news/a/ar-AA1') ||
      dengue.alternates.includes('https://www.pna.gov.ph/articles/1284203'),
    'the syndicated filing must remain reachable as a fallback link'
  );
  assert.equal(dengue.alternates.length, 1);
});

test('news renderers omit lead-image previews while preserving stored image metadata', () => {
  const news = read('assets/js/news.js');
  const fb = read('assets/js/fb-feed.js');

  for (const [file, source] of Object.entries({
    'assets/js/news.js': news,
    'assets/js/fb-feed.js': fb,
  })) {
    assert.doesNotMatch(
      source,
      /function imagePreview\(/,
      `${file} must not define a preview renderer`
    );
    assert.doesNotMatch(source, /imagePreview\(a\.image/, `${file} must not render article images`);
    assert.doesNotMatch(
      source,
      /(?:news-card-img|home-news-card-img|fb-post-img)/,
      `${file} must not emit preview containers`
    );
  }

  for (const file of ['assets/css/style.css', 'react-app/public/assets/css/style.css']) {
    const css = read(file);
    for (const selector of ['.news-card-img', '.home-news-card-img', '.fb-post-img']) {
      assert.ok(!css.includes(selector), `${selector} must be removed from ${file}`);
    }
  }

  // Image metadata remains in the curated dataset so editors do not destroy it
  // during a load-and-save cycle, even though public news cards no longer use it.
  const editor = read('admin/news-editor.html');
  assert.match(editor, /image: e\.image \|\| undefined/, 'the editor must load the image');
  assert.match(editor, /previous\.image/, 'the editor must preserve the image on save');
});

test('every statistics section is mounted and has a renderer', () => {
  // statistics-data.js replaces each of these sections with figures from a
  // verified dataset. A section the script never looks up keeps its
  // server-rendered "not yet available" text forever, which reads as missing
  // data even when the dataset is sitting on disk — the provincial receipts
  // section did exactly that, with data/fiscal_transparency.json already
  // shipped and already rendered on the budget page.
  const page = read('statistics/index.html');
  const script = read('assets/js/statistics-data.js');

  const sections = [
    'stats-metrics',
    'stats-trends',
    'stats-distribution',
    'stats-economy',
    'stats-poverty',
    'stats-competitive',
    'stats-barchart',
    'stats-finance',
  ];

  for (const name of sections) {
    assert.match(
      page,
      new RegExp(`class="[^"]*\\b${name}\\b`),
      `statistics/index.html has no .${name} section`
    );
    assert.match(
      script,
      new RegExp(`querySelector\\('\\.${name}'\\)`),
      `statistics-data.js never renders .${name} — it would show its placeholder forever`
    );
  }
});

test('every dataset the statistics dashboard charts is verified', () => {
  const script = read('assets/js/statistics-data.js');
  const files = [...script.matchAll(/fetchJson\('([^']+)'\)/g)].map((m) => m[1]);

  assert.ok(files.length >= 3, 'expected the dashboard to fetch its datasets');

  for (const file of new Set(files)) {
    const data = JSON.parse(read(`data/${file}`));
    // "final" is the stronger status used once a figure has been checked against
    // the primary document; both mean the value may be displayed.
    assert.ok(
      ['verified', 'final'].includes(data._status),
      `data/${file} is _status "${data._status}" — an unverified figure must not be charted`
    );
  }
});
