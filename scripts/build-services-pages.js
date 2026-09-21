/**
 * Rebuilds the ten Services category pages to the shared layout.
 *
 * Each page keeps its own navigation, footer and search band; only the body of
 * <main> below the search band is regenerated, plus the page title tags and the
 * script tag for the renderer. Re-running is safe - the same input produces the
 * same output.
 *
 * Run: node scripts/build-services-pages.js
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SERVICES_DIR = path.resolve(__dirname, '../services');

/**
 * Page definitions. `title`, `badge` and `desc` must stay identical to the
 * matching `<prefix>-page-title` / `-page-badge` / `-page-desc` values in
 * assets/js/translations.js, so the server-rendered text and the translations
 * agree.
 */
const PAGES = [
  {
    file: 'certificates.html',
    category: 'certificates',
    prefix: 'cert',
    icon: 'bi-file-earmark-text-fill',
    title: 'Certificates & Vital Records',
    badge: 'Certificates',
    desc: 'Documents issued by the Local Civil Registrar and by barangay offices.',
  },
  {
    file: 'business.html',
    category: 'business',
    prefix: 'biz',
    icon: 'bi-briefcase-fill',
    title: 'Business, Trade & Investment',
    badge: 'Business',
    desc: 'Permits, licences and registrations for operating a business in Albay.',
  },
  {
    file: 'tax-payments.html',
    category: 'tax-payments',
    prefix: 'tax',
    icon: 'bi-cash-coin',
    title: 'Taxation & Payments',
    badge: 'Tax Payments',
    desc: 'Property, business and other payments collected by the Provincial Treasurer.',
  },
  {
    file: 'social-services.html',
    category: 'social-services',
    prefix: 'social',
    icon: 'bi-people-fill',
    title: 'Social Services & Assistance',
    badge: 'Social Services',
    desc: 'Assistance programmes for residents in need, through the MSWDO.',
  },
  {
    file: 'health.html',
    category: 'health',
    prefix: 'health',
    icon: 'bi-heart-pulse-fill',
    title: 'Health & Wellness',
    badge: 'Health',
    desc: 'Health services, health certificates and medical assistance.',
  },
  {
    file: 'agriculture.html',
    category: 'agriculture',
    prefix: 'agri',
    icon: 'bi-flower1',
    title: 'Agriculture & Economic Development',
    badge: 'Agriculture',
    desc: 'Support and assistance for farmers, fisherfolk and agricultural livelihoods.',
  },
  {
    file: 'infrastructure.html',
    category: 'infrastructure',
    prefix: 'infra',
    icon: 'bi-building-gear',
    title: 'Infrastructure & Public Works',
    badge: 'Infrastructure',
    desc: 'Building, occupancy and public works services from the Engineering Office.',
  },
  {
    file: 'education.html',
    category: 'education',
    prefix: 'edu',
    icon: 'bi-mortarboard-fill',
    title: 'Education & Scholarship',
    badge: 'Education',
    desc: 'Scholarship and student assistance programmes for Albay residents.',
  },
  {
    file: 'public-safety.html',
    category: 'public-safety',
    prefix: 'safety',
    icon: 'bi-shield-fill-check',
    title: 'Public Safety & Security',
    badge: 'Public Safety',
    desc: 'Emergency response and disaster preparedness services.',
  },
  {
    file: 'environment.html',
    category: 'environment',
    prefix: 'env',
    icon: 'bi-tree-fill',
    title: 'Environment & Natural Resources',
    badge: 'Environment',
    desc: 'Environmental permits and waste management services.',
  },
];

/** Escapes the `&` in a heading for HTML text. */
function heading(text) {
  return text.replace(/&/g, '&amp;');
}

/** The markup that replaces everything in <main> after the search band. */
function bodyFor(page) {
  return `    <div class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="../" data-i18n="nav-home">Home</a>
        <span>/</span>
        <a href="./" data-i18n="nav-services">Services</a>
        <span>/</span>
        <span aria-current="page" data-i18n="${page.prefix}-page-title">${heading(page.title)}</span>
      </nav>
    </div>

    <section class="page-header">
      <div class="container">
        <div class="page-header-content">
          <span class="page-header-badge"><i class="bi ${page.icon}" aria-hidden="true"></i>
            <span data-i18n="${page.prefix}-page-badge">${heading(page.badge)}</span></span>
          <h1 data-i18n="${page.prefix}-page-title">${heading(page.title)}</h1>
          <p class="page-header-desc" data-i18n="${page.prefix}-page-desc">
            ${heading(page.desc)}
          </p>
          ${searchMarkup()}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <p class="service-notice">
          <i class="bi bi-info-circle" aria-hidden="true"></i>
          <span data-i18n="svc-verification-notice">Requirements, fees and processing times for Albay services have
            not been verified. Confirm them with the responsible office before applying.</span>
        </p>
        <div class="grid grid-3" id="services-category" data-category="${page.category}"
          data-src="../data/services.json">
          <p class="service-grid-status" data-i18n="svc-loading">Loading services...</p>
        </div>
      </div>
    </section>

    ${hotlineResources(page)}
    <section class="section section-compact bg-alt" id="services-offices" hidden>
      <div class="container">
        <h2 class="section-title-sm" data-i18n="offices-title">Responsible Offices</h2>
        <div class="office-cards-grid" id="offices-grid"></div>
      </div>
    </section>
`;
}

/** Replaces the <main> body below the search band. */
function replaceBody(html, page, seen) {
  const pattern = /<main id="main-content"[^>]*>[\s\S]*?<\/main>/;
  if (!pattern.test(html)) {
    seen.push(`${page.file}: main missing`);
    return html;
  }
  return html.replace(
    pattern,
    `<main id="main-content" class="services-page">\n${bodyFor(page)}  </main>`
  );
}

/** Points the title tags at the category heading. */
function replaceTitles(html, page) {
  const label = `${page.title} | BetterAlbay.org`;

  return html
    .replace(/(<title>)[^<]*(<\/title>)/, `$1${label}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${label}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${label}$2`);
}

/** Loads the renderer, right after the service search script. */
function addScript(html, page, seen) {
  if (html.includes('services-category.js')) return html;

  const pattern = /(<script defer src="\.\.\/assets\/js\/search\.js[^"]*"><\/script>\n)/;

  if (!pattern.test(html)) {
    seen.push(`${page.file}: could not locate the search.js script tag`);
    return html;
  }

  return html.replace(
    pattern,
    '$1  <script defer src="../assets/js/services-category.js"></script>\n'
  );
}

function main() {
  const problems = [];

  for (const page of PAGES) {
    const file = path.join(SERVICES_DIR, page.file);
    const before = fs.readFileSync(file, 'utf8');

    let after = replaceBody(before, page, problems);
    after = replaceTitles(after, page);
    after = addScript(after, page, problems);
    after = addStyles(after);

    if (after !== before) {
      fs.writeFileSync(file, after);
      console.log(`${page.file}: rewritten`);
    } else {
      console.log(`${page.file}: unchanged`);
    }
  }

  if (problems.length) {
    console.error('\nproblems:');
    for (const problem of problems) console.error(`  ${problem}`);
    process.exitCode = 1;
  }
}

function searchMarkup() {
  return `<div class="page-header-search"><form class="search-form" role="search"><div class="search-input-wrapper"><i class="bi bi-search search-icon" aria-hidden="true"></i><input type="search" id="service-search" class="service-search-input" placeholder="Search services..." data-i18n-placeholder="search-placeholder" aria-label="Search services" data-i18n-aria="search-aria-label" autocomplete="off" /></div></form></div>`;
}
function hotlineResources(page) {
  const links =
    page.category === 'health'
      ? [
          ['hospitals', 'Hospitals'],
          ['rural-health-unit', 'Rural health units'],
        ]
      : page.category === 'public-safety'
        ? [
            ['pnp', 'Police stations (PNP)'],
            ['bfp', 'Fire stations (BFP)'],
            ['pdrrmc', 'Provincial emergency contacts'],
            ['mdrrmo', 'Municipal disaster response'],
            ['cdrrmo', 'City disaster response'],
            ['coast-guard', 'Coast Guard'],
          ]
        : [];
  if (!links.length) return '';
  return `<section class="section bg-alt" lang="en"><div class="container"><h2>Emergency contacts</h2>
      <p>Find local offices and call numbers in the Albay hotline directory.</p>
      ${links.map(([anchor, label]) => `<a class="guide-resource" href="/contact/#hotlines-${anchor}">${label}</a>`).join('\n')}
    </div></section>`;
}
function addStyles(html) {
  return html.includes('assets/css/services.css')
    ? html
    : html.replace(
        '</head>',
        '<link rel="stylesheet" href="../assets/css/services.css" />\n</head>'
      );
}
if (require.main === module) main();
module.exports = { PAGES, searchMarkup, addStyles };
