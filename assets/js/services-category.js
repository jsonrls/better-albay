/* Better Albay - Services Category Page JavaScript */

/**
 * Renders a Services category page from data/services.json.
 *
 * The ten category pages (certificates, business, tax-payments, ...) share one
 * layout, so the cards are built from the same records the search index uses
 * rather than being hand-written per page. That keeps the pages and the data
 * from drifting apart, and it means a fee or a processing time starts showing
 * up on its card the moment a real value is added to the JSON - no markup
 * change required.
 *
 * Every field is treated as optional. Today no Albay fee has been verified, so
 * the Fee/Time row simply is not emitted; the page carries one shared notice
 * instead of repeating the same caveat on all 57 cards.
 */

/**
 * Records whose detail page is an office rather than a counter service. These
 * are shown in the "Responsible Offices" band, and omitted from the service
 * grid - the same split the reference layout uses.
 * @type {Object<string, string[]>}
 */
const OFFICES = {
  certificates: ['civil-registrar'],
  business: [
    'business-permits-licensing',
    'tricycle-franchising',
    'seedo-slaughterhouse',
    'seedo-public-market',
  ],
  'tax-payments': [
    'municipal-treasurer',
    'municipal-budget',
    'municipal-accounting',
    'property-declaration',
    'municipal-assessor',
  ],
  infrastructure: ['municipal-engineering', 'municipal-planning'],
  agriculture: ['municipal-agriculture'],
  'social-services': ['mswdo-services'],
};

/**
 * Icon lookup, searched in order against the record id. The first fragment
 * that appears wins, so the more specific entries come first.
 * @type {Array<[string, string]>}
 */
const ICON_RULES = [
  ['police-clearance', 'bi-shield-check'],
  ['barangay-id', 'bi-person-badge'],
  ['barangay-clearance', 'bi-house-check'],
  ['senior-citizen-id', 'bi-person-vcard'],
  ['pwd-id', 'bi-person-vcard'],
  ['solo-parent-id', 'bi-person-vcard'],
  ['birth-certificate', 'bi-file-earmark-text'],
  ['marriage-certificate', 'bi-heart'],
  ['death-certificate', 'bi-file-earmark-x'],
  ['health-certificate', 'bi-clipboard2-pulse'],
  ['tax-clearance', 'bi-receipt'],
  ['environmental-clearance', 'bi-tree'],
  ['tree-cutting-permit', 'bi-tree'],
  ['building-permit', 'bi-building-gear'],
  ['occupancy-permit', 'bi-house-gear'],
  ['sanitary-permit', 'bi-droplet'],
  ['business-permit', 'bi-clipboard-check'],
  ['tricycle-franchising', 'bi-scooter'],
  ['slaughterhouse', 'bi-shop'],
  ['public-market', 'bi-shop-window'],
  ['cedula', 'bi-card-text'],
  ['vaccination', 'bi-syringe'],
  ['prenatal-checkup', 'bi-heart-pulse'],
  ['medical-assistance', 'bi-hospital'],
  ['financial-assistance', 'bi-cash-stack'],
  ['burial-assistance', 'bi-flower1'],
  ['fertilizer-assistance', 'bi-flower3'],
  ['agricultural-loan', 'bi-cash-coin'],
  ['crop-insurance', 'bi-shield-shaded'],
  ['student-assistance', 'bi-backpack2'],
  ['scholarship', 'bi-mortarboard'],
  ['real-property-tax', 'bi-house-door'],
  ['business-tax', 'bi-briefcase'],
  ['property-declaration', 'bi-file-earmark-ruled'],
  ['road-maintenance', 'bi-cone-striped'],
  ['emergency-response', 'bi-telephone-outbound'],
  ['disaster-preparedness', 'bi-exclamation-triangle'],
  ['waste-management', 'bi-recycle'],
  ['civil-registrar', 'bi-building'],
  ['business-permits-licensing', 'bi-clipboard-check'],
  ['treasurer', 'bi-cash-coin'],
  ['budget', 'bi-graph-up'],
  ['accounting', 'bi-calculator'],
  ['assessor', 'bi-clipboard-data'],
  ['engineering', 'bi-tools'],
  ['planning', 'bi-map'],
  ['agriculture', 'bi-flower1'],
  ['mswdo', 'bi-people'],
];

/** Icon used when nothing in ICON_RULES matches. */
const DEFAULT_ICON = 'bi-file-earmark-text';

/**
 * Text fragments that carry no information, so the field that holds one is
 * treated as unset rather than being displayed.
 * @type {RegExp[]}
 */
const PLACEHOLDER_TEXT = [
  /^$/,
  /^not verified$/i,
  /have not been verified/i,
  /has not been verified/i,
  /information pending verification/i,
];

/**
 * Escapes a value for safe insertion into HTML.
 * @param {*} value - Any value
 * @returns {string} HTML-escaped string
 */
function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Whether a field holds real information worth rendering.
 * @param {*} value - Field value
 * @returns {boolean} True when the value should be displayed
 */
function isRealText(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return !PLACEHOLDER_TEXT.some((pattern) => pattern.test(trimmed));
}

/**
 * Resolves the icon class for a service.
 * @param {string} id - Service id
 * @returns {string} Bootstrap icon class
 */
function iconFor(id) {
  const needle = String(id || '').toLowerCase();
  const match = ICON_RULES.find(([fragment]) => needle.includes(fragment));
  return match ? match[1] : DEFAULT_ICON;
}

/**
 * The href a record should link to, or an empty string when the record has no
 * detail page of its own. Records without one point back at their category
 * page, which is not a useful destination from that page.
 * @param {Object} record - Service record
 * @returns {string} Href, or empty string
 */
function detailUrlFor(record) {
  const url = record && typeof record.url === 'string' ? record.url.trim() : '';
  return url.startsWith('../service-details/') ? url : '';
}

/**
 * The records that belong in a category's service grid.
 * @param {Array<Object>} records - All service records
 * @param {string} categoryId - Category to select
 * @returns {Array<Object>} Service records, offices excluded
 */
function selectCategoryServices(records, categoryId) {
  const offices = OFFICES[categoryId] || [];
  return (Array.isArray(records) ? records : []).filter(
    (record) => record && record.categoryId === categoryId && !offices.includes(record.id)
  );
}

/**
 * The office records a category delegates to.
 * @param {Array<Object>} records - All service records
 * @param {string} categoryId - Category to select
 * @returns {Array<Object>} Office records
 */
function selectCategoryOffices(records, categoryId) {
  const offices = OFFICES[categoryId] || [];
  return offices
    .map((id) =>
      (Array.isArray(records) ? records : []).find((record) => record && record.id === id)
    )
    .filter(Boolean);
}

/**
 * Builds one service card. Cards for services that have a detail page are
 * links; the rest are plain blocks, matching the reference layout.
 * @param {Object} record - Service record
 * @returns {string} Card markup
 */
function buildServiceCard(record) {
  const href = detailUrlFor(record);
  const icon = iconFor(record.id);
  const title = `<h3 class="service-item-title"><i class="bi ${icon}" aria-hidden="true"></i> <span data-i18n="sg-title-${escapeHtml(record.id)}">${escapeHtml(record.title)}</span></h3>`;

  const description = isRealText(record.description)
    ? `<p class="service-item-desc">${escapeHtml(record.description)}</p>`
    : `<p class="service-item-desc" data-i18n="sg-desc-${escapeHtml(record.id)}">${escapeHtml(serviceCopy(record, 'desc'))}</p>`;

  const meta = [];
  if (isRealText(record.fee)) {
    meta.push(`<span><strong data-i18n="label-fee">Fee:</strong> ${escapeHtml(record.fee)}</span>`);
  }
  if (isRealText(record.processingTime)) {
    meta.push(
      `<span><strong data-i18n="label-time">Time:</strong> ${escapeHtml(record.processingTime)}</span>`
    );
  }
  const metaMarkup = meta.length ? `<div class="service-item-meta">${meta.join('')}</div>` : '';

  if (href) {
    return `<a class="service-item-card service-item-link" href="${escapeHtml(href)}">${title}${description}${metaMarkup}<span class="service-card-action"><span data-i18n="sg-view">View guide</span><i class="bi bi-arrow-right" aria-hidden="true"></i></span></a>`;
  }
  return `<div class="service-item-card">${title}${description}${metaMarkup}<span class="service-card-action" data-i18n="sg-confirm">Confirm with the office</span></div>`;
}

/**
 * Builds one office card.
 * @param {Object} record - Office record
 * @returns {string} Office card markup
 */
function buildOfficeCard(record) {
  const href = detailUrlFor(record);
  const icon = iconFor(record.id);
  const description = isRealText(record.description)
    ? `<p class="office-card-desc">${escapeHtml(record.description)}</p>`
    : '';

  const inner =
    `<div class="office-card-icon"><i class="bi ${icon}" aria-hidden="true"></i></div>` +
    `<div class="office-card-content"><h3 class="office-card-title"><span data-i18n="sg-title-${escapeHtml(record.id)}">${escapeHtml(record.title)}</span></h3>${description}</div>` +
    '<div class="office-card-arrow"><i class="bi bi-arrow-right" aria-hidden="true"></i></div>';

  if (href) {
    return `<a class="office-card" href="${escapeHtml(href)}">${inner}</a>`;
  }
  return `<div class="office-card">${inner}</div>`;
}

/**
 * Fills a category mount point with its services and offices.
 * @param {string} categoryId - Category id
 * @param {Array<Object>} records - All service records
 * @param {Object} [targets] - Overrides for the grid and offices section
 * @returns {number} Number of service cards rendered
 */
function renderCategory(categoryId, records, targets) {
  const grid = (targets && targets.grid) || document.getElementById('services-category');
  if (!grid) return 0;

  const services = selectCategoryServices(records, categoryId);

  grid.innerHTML = services.length
    ? services.map(buildServiceCard).join('')
    : '<p class="service-grid-status" data-i18n="svc-empty">No services are listed for this category yet.</p>';

  const section = (targets && targets.section) || document.getElementById('services-offices');
  const officeGrid = (targets && targets.officeGrid) || document.getElementById('offices-grid');
  const offices = selectCategoryOffices(records, categoryId);

  if (section && officeGrid) {
    officeGrid.innerHTML = offices.map(buildOfficeCard).join('');
    section.hidden = offices.length === 0;
  }

  return services.length;
}

/**
 * Fetches the service records.
 * @param {string} src - URL of the services data
 * @returns {Promise<Array<Object>>} Service records; rejects on network or HTTP failure
 */
function serviceCopy(record, field) {
  if (typeof window !== 'undefined' && window.TranslationEngine) {
    const key = `sg-${field}-${record.id}`;
    if (window.TranslationEngine.hasTranslation(key)) return window.TranslationEngine.t(key);
  }
  return `Guidance and office information for ${record.title}.`;
}
async function fetchServices(src) {
  try {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data.services) ? data.services : [];
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
}

/**
 * Renders the category named by the mount point.
 */
async function initServicesCategory() {
  const grid = document.getElementById('services-category');
  if (!grid) return;

  const categoryId = grid.dataset.category;
  const src = grid.dataset.src || '../data/services.json';
  if (!categoryId) {
    console.warn('[services-category] mount point has no data-category');
    return;
  }

  grid.setAttribute('aria-busy', 'true');
  try {
    const records = await fetchServices(src);
    renderCategory(categoryId, records, { grid });
  } catch (error) {
    grid.innerHTML =
      '<div class="service-grid-status" role="status"><p data-i18n="sg-error">Services could not be loaded. Please try again.</p><button type="button" class="btn btn-secondary" data-i18n="sg-retry">Try again</button></div>';
    grid.querySelector('button').addEventListener('click', initServicesCategory);
  } finally {
    grid.setAttribute('aria-busy', 'false');
    if (window.TranslationEngine)
      window.TranslationEngine.applyTranslations(window.TranslationEngine.getCurrentLanguage());
  }
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initServicesCategory);
}

// Export functions for testing (if module system is available)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OFFICES,
    ICON_RULES,
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
    fetchServices,
    initServicesCategory,
  };
}
