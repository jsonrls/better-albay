/**
 * Transparency Page V2 - Interactive Financial Dashboard
 * Modern, minimal design with smooth animations
 *
 * Every figure rendered here is read from `data/fiscal_transparency.json`; none
 * are hardcoded. While that file is marked "_status": "draft" (or carries no
 * fiscal years) the section shows a "not yet available" state instead of
 * placeholder numbers, so the page can never publish unverified finance data.
 */

const FISCAL_DATA_URL = '../data/fiscal_transparency.json';

// Quarter map ({ q1: {...}, q2: {...} }) for the selected year, populated at
// runtime from that JSON.
let FINANCIAL_DATA = {};

// The payload as loaded, and which fiscal year is on screen.
let FISCAL_PAYLOAD = null;
let currentYear = null;

// Chart instances
let incomeChart = null;
let expenditureChart = null;
let currentQuarter = 'q1';

/**
 * Format number as Philippine Peso in millions
 */
function formatPeso(value) {
  return `₱${value.toFixed(2)} M`;
}

/**
 * Calculate percentage
 */
function calcPercent(value, total) {
  if (!total) return '—';
  return ((value / total) * 100).toFixed(1) + '%';
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * A quarter is only usable when every figure it renders is a real number.
 */
function isValidQuarter(quarter) {
  if (!quarter || typeof quarter !== 'object') return false;

  const { income, expenditures, netIncome, fundBalance } = quarter;

  return Boolean(
    income &&
    expenditures &&
    isFiniteNumber(income.local) &&
    isFiniteNumber(income.external) &&
    isFiniteNumber(income.total) &&
    isFiniteNumber(expenditures.gps) &&
    isFiniteNumber(expenditures.social) &&
    isFiniteNumber(expenditures.economic) &&
    isFiniteNumber(expenditures.debt) &&
    isFiniteNumber(expenditures.total) &&
    isFiniteNumber(netIncome) &&
    isFiniteNumber(fundBalance)
  );
}

/**
 * Flatten one fiscal year's `quarters` into the { q1: {...}, q2: {...} } shape
 * this dashboard renders.
 *
 * `year` selects the fiscal year; when it is omitted the most recent year in
 * the file is used. Years are never merged: every annual filing carries a `q4`
 * entry, so merging would silently discard all but the last one.
 *
 * Expected file shape once figures are published:
 *
 *   {
 *     "_status": "final",
 *     "fiscal_years": [
 *       { "year": 2026, "quarters": { "q1": { "income": {...}, ... } } }
 *     ]
 *   }
 *
 * Draft payloads, an empty `fiscal_years`, or a year holding no usable quarter
 * deliberately yield {} — see data/fiscal_transparency.json:
 * "Do not display estimated values."
 */
function buildQuarterMap(payload, year) {
  const map = {};

  if (!payload || payload._status === 'draft') return map;
  if (!Array.isArray(payload.fiscal_years)) return map;

  const years = payload.fiscal_years.filter(
    (fiscalYear) =>
      fiscalYear &&
      typeof fiscalYear === 'object' &&
      fiscalYear.quarters &&
      typeof fiscalYear.quarters === 'object'
  );

  const target =
    year === undefined || year === null
      ? years.reduce(
          (latest, fiscalYear) =>
            latest === null || Number(fiscalYear.year) > Number(latest.year) ? fiscalYear : latest,
          null
        )
      : years.find((fiscalYear) => Number(fiscalYear.year) === Number(year));

  if (!target) return map;

  Object.keys(target.quarters).forEach((key) => {
    if (isValidQuarter(target.quarters[key])) map[key] = target.quarters[key];
  });

  return map;
}

/**
 * Fiscal years that actually carry at least one usable quarter, newest first.
 */
function listFiscalYears(payload) {
  if (!payload || payload._status === 'draft' || !Array.isArray(payload.fiscal_years)) return [];

  return payload.fiscal_years
    .filter((fiscalYear) => {
      if (!fiscalYear || !fiscalYear.quarters || typeof fiscalYear.quarters !== 'object') {
        return false;
      }
      return Object.keys(fiscalYear.quarters).some((key) =>
        isValidQuarter(fiscalYear.quarters[key])
      );
    })
    .map((fiscalYear) => Number(fiscalYear.year))
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => b - a);
}

/**
 * Quarter keys in calendar order, so the toggle never shows q10 before q2.
 */
function sortQuarters(keys) {
  const order = ['q1', 'q2', 'q3', 'q4'];
  return [...keys].sort((a, b) => {
    const ia = order.indexOf(String(a).toLowerCase());
    const ib = order.indexOf(String(b).toLowerCase());
    if (ia === -1 && ib === -1) return String(a).localeCompare(String(b));
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/**
 * Load the transparency payload. Rejects so the caller can fall back to the
 * unavailable state.
 */
async function loadFinancialData() {
  const response = await fetch(FISCAL_DATA_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Fiscal data request failed (${response.status})`);
  return response.json();
}

/**
 * Parse numeric figures from string (e.g. "₱384.52 M", "24.5%", "₱2,006.31 M")
 */
function parseNumericString(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (trimmed === '—' || trimmed === '--') return null;
  const regex = /^([^\d\-+]*)([+-]?)([\d,]+(?:\.\d+)?)(.*)$/;
  const match = trimmed.match(regex);
  if (!match) return null;
  const rawPrefix = match[1];
  const sign = match[2];
  const numStr = match[3];
  const suffix = match[4];

  const cleanNumStr = numStr.replace(/,/g, '');
  const targetNum = parseFloat(cleanNumStr);
  if (Number.isNaN(targetNum)) return null;

  const fullPrefix = rawPrefix + (sign || '');
  const hasCommas = numStr.includes(',');
  const decIndex = numStr.indexOf('.');
  const decimals = decIndex >= 0 ? numStr.length - decIndex - 1 : 0;

  return {
    prefix: fullPrefix,
    number: sign === '-' ? -targetNum : targetNum,
    suffix,
    decimals,
    hasCommas,
  };
}

/**
 * Format intermediate value during roll
 */
function formatInterpValue(val, parsed) {
  const absVal = Math.abs(val);
  let numPart =
    parsed.decimals > 0 ? absVal.toFixed(parsed.decimals) : Math.round(absVal).toString();
  if (parsed.hasCommas) {
    const parts = numPart.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    numPart = parts.join('.');
  }
  let prefix = parsed.prefix;
  if (prefix === '+' && val <= 0) {
    prefix = '';
  } else if (val < 0 && !prefix.includes('-')) {
    prefix = '-' + prefix;
  }
  return prefix + numPart + parsed.suffix;
}

/**
 * Animate value change with smooth text roll / count-up
 */
function animateValue(element, newValue, forcedStart) {
  if (!element) return;
  if (typeof newValue !== 'string') newValue = String(newValue == null ? '' : newValue);

  const parsedTarget = parseNumericString(newValue);
  if (!parsedTarget) {
    element.textContent = newValue;
    return;
  }

  if (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    element.textContent = newValue;
    return;
  }

  if (element._rollAnimId) {
    cancelAnimationFrame(element._rollAnimId);
    element._rollAnimId = null;
  }

  let startNum = 0;
  if (typeof forcedStart === 'number') {
    startNum = forcedStart;
  } else {
    const currentParsed = parseNumericString(element.textContent);
    if (currentParsed && !Number.isNaN(currentParsed.number)) {
      startNum = currentParsed.number;
    }
  }

  const targetNum = parsedTarget.number;
  if (startNum === targetNum && element.textContent === newValue) {
    return;
  }

  const animDuration = 500;
  const startTime =
    typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

  element.classList.remove('rolling');
  void element.offsetWidth;
  element.classList.add('rolling');

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / animDuration);
    const ease = 1 - Math.pow(1 - progress, 4);
    const currentVal = startNum + (targetNum - startNum) * ease;

    if (progress < 1) {
      element.textContent = formatInterpValue(currentVal, parsedTarget);
      element._rollAnimId = requestAnimationFrame(step);
    } else {
      element.textContent = newValue;
      element._rollAnimId = null;
      setTimeout(() => {
        element.classList.remove('rolling');
      }, 100);
    }
  }

  if (typeof requestAnimationFrame === 'function') {
    element._rollAnimId = requestAnimationFrame(step);
  } else {
    element.textContent = newValue;
  }
}

/**
 * Update all displayed values for selected quarter
 */
function updateDisplay(quarter, forcedStart) {
  const data = FINANCIAL_DATA[quarter];
  if (!data) return;

  // Update metrics with smooth text roll
  animateValue(
    document.getElementById('sre-total-income'),
    formatPeso(data.income.total),
    forcedStart
  );
  animateValue(
    document.getElementById('sre-total-expense'),
    formatPeso(data.expenditures.total),
    forcedStart
  );
  animateValue(document.getElementById('sre-net-income'), formatPeso(data.netIncome), forcedStart);
  animateValue(
    document.getElementById('sre-fund-balance'),
    formatPeso(data.fundBalance),
    forcedStart
  );

  // Update income breakdown with smooth text roll
  const incomeTotal = data.income.total;
  animateValue(
    document.getElementById('sre-income-local'),
    formatPeso(data.income.local),
    forcedStart
  );
  animateValue(
    document.getElementById('sre-income-local-pct'),
    calcPercent(data.income.local, incomeTotal),
    forcedStart
  );
  animateValue(
    document.getElementById('sre-income-external'),
    formatPeso(data.income.external),
    forcedStart
  );
  animateValue(
    document.getElementById('sre-income-external-pct'),
    calcPercent(data.income.external, incomeTotal),
    forcedStart
  );

  // Update expenditure breakdown with smooth text roll
  const expTotal = data.expenditures.total;
  animateValue(
    document.getElementById('sre-exp-gps'),
    formatPeso(data.expenditures.gps),
    forcedStart
  );
  animateValue(
    document.getElementById('sre-exp-gps-pct'),
    calcPercent(data.expenditures.gps, expTotal),
    forcedStart
  );
  animateValue(
    document.getElementById('sre-exp-social'),
    formatPeso(data.expenditures.social),
    forcedStart
  );
  animateValue(
    document.getElementById('sre-exp-social-pct'),
    calcPercent(data.expenditures.social, expTotal),
    forcedStart
  );
  animateValue(
    document.getElementById('sre-exp-economic'),
    formatPeso(data.expenditures.economic),
    forcedStart
  );
  animateValue(
    document.getElementById('sre-exp-economic-pct'),
    calcPercent(data.expenditures.economic, expTotal),
    forcedStart
  );
  animateValue(
    document.getElementById('sre-exp-debt'),
    formatPeso(data.expenditures.debt),
    forcedStart
  );
  animateValue(
    document.getElementById('sre-exp-debt-pct'),
    calcPercent(data.expenditures.debt, expTotal),
    forcedStart
  );

  // Update charts
  if (incomeChart) {
    incomeChart.data.datasets[0].data = [data.income.local, data.income.external];
    incomeChart.update('active');
  }

  if (expenditureChart) {
    expenditureChart.data.datasets[0].data = [
      data.expenditures.gps,
      data.expenditures.social,
      data.expenditures.economic,
      data.expenditures.debt,
    ];
    expenditureChart.update('active');
  }
}

/**
 * Initialize charts with Chart.js
 */
function initCharts() {
  const incomeCtx = document.getElementById('incomeChartV2');
  const expenditureCtx = document.getElementById('expenditureChartV2');

  if (!incomeCtx || !expenditureCtx || typeof Chart === 'undefined') return;

  const data = FINANCIAL_DATA[currentQuarter];

  // Chart.js default options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    layout: {
      padding: 4,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        cornerRadius: 8,
        callbacks: {
          label: function (context) {
            return `₱${context.raw.toFixed(2)} M`;
          },
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 600,
      easing: 'easeOutQuart',
    },
  };

  // Income Chart
  incomeChart = new Chart(incomeCtx, {
    type: 'doughnut',
    data: {
      labels: ['Local Sources', 'External Sources'],
      datasets: [
        {
          data: [data.income.local, data.income.external],
          backgroundColor: ['#10b981', '#0ea5e9'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 0,
          hoverBorderWidth: 3,
          hoverBorderColor: '#ffffff',
        },
      ],
    },
    options: chartOptions,
  });

  // Store original colors for highlight/restore
  incomeChart._originalColors = ['#10b981', '#0ea5e9'];

  // Expenditure Chart
  expenditureChart = new Chart(expenditureCtx, {
    type: 'doughnut',
    data: {
      labels: ['General Public Services', 'Social Services', 'Economic Services', 'Debt Service'],
      datasets: [
        {
          data: [
            data.expenditures.gps,
            data.expenditures.social,
            data.expenditures.economic,
            data.expenditures.debt,
          ],
          backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 0,
          hoverBorderWidth: 3,
          hoverBorderColor: '#ffffff',
        },
      ],
    },
    options: chartOptions,
  });

  // Store original colors for highlight/restore
  expenditureChart._originalColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
}

/**
 * Render the fiscal-year selector. Only shown when the file holds more than
 * one year; year labels are numerals, so they need no translation.
 */
function buildYearSelector(years) {
  const host = document.querySelector('.sre-year-select');
  if (!host) return;

  host.innerHTML = '';

  if (years.length < 2) {
    host.hidden = true;
    return;
  }

  host.hidden = false;

  years.forEach((year) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sre-year-btn' + (year === currentYear ? ' active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', year === currentYear ? 'true' : 'false');
    btn.dataset.year = String(year);
    btn.textContent = String(year);

    btn.addEventListener('click', function () {
      const next = Number(this.dataset.year);
      if (next === currentYear) return;
      selectYear(next);
    });

    host.appendChild(btn);
  });
}

/**
 * Render the quarter toggle from the selected year's own quarters, using the
 * period labels carried in the data file (so a cumulative Q2 is never labelled
 * as if it covered April to June alone).
 */
function buildQuarterToggle(quarters) {
  const host = document.querySelector('.sre-period-toggle');
  if (!host) return;

  host.innerHTML = '';
  host.hidden = quarters.length === 0;

  quarters.forEach((key) => {
    const quarter = FINANCIAL_DATA[key];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sre-period-btn' + (key === currentQuarter ? ' active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', key === currentQuarter ? 'true' : 'false');
    btn.dataset.quarter = key;

    const code = document.createElement('span');
    code.className = 'sre-period-q';
    code.textContent = quarter.code || String(key).toUpperCase();

    const range = document.createElement('span');
    range.className = 'sre-period-range';
    range.textContent = quarter.periodLabel || '';

    btn.appendChild(code);
    btn.appendChild(range);

    btn.addEventListener('click', function () {
      if (key === currentQuarter) return;

      host.querySelectorAll('.sre-period-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');

      currentQuarter = key;
      updatePeriodLabels();
      updateDisplay(key);
    });

    host.appendChild(btn);
  });
}

/**
 * Show which period is on screen and link straight to the archived filing it
 * was transcribed from, so every figure can be checked against its source.
 */
function updatePeriodLabels() {
  const quarter = FINANCIAL_DATA[currentQuarter];
  if (!quarter) return;

  const caption = document.getElementById('sre-period-caption');
  if (caption) caption.textContent = quarter.period;

  const link = document.getElementById('sre-source-link');
  if (!link) return;

  const sources =
    FISCAL_PAYLOAD && Array.isArray(FISCAL_PAYLOAD._sources) ? FISCAL_PAYLOAD._sources : [];
  const match = sources.find((entry) => entry && entry.period === quarter.period);

  if (match && match.archived) {
    link.href = match.archived;
    // The words are copy, the period is a figure from the dataset, so the period
    // travels as an interpolation value and survives translation in place.
    link.setAttribute('data-i18n', 'sre-archived-filing');
    link.setAttribute('data-i18n-params', JSON.stringify({ period: quarter.period }));
    link.textContent = `${quarter.period} filing (archived PDF)`;
    if (window.TranslationEngine && TranslationEngine.translateElement) {
      TranslationEngine.translateElement(link, TranslationEngine.getCurrentLanguage());
    }
    link.hidden = false;
  } else {
    link.removeAttribute('href');
    link.hidden = true;
  }
}

/**
 * Switch to a fiscal year and render its first available quarter.
 */
function selectYear(year) {
  currentYear = Number(year);
  FINANCIAL_DATA = buildQuarterMap(FISCAL_PAYLOAD, currentYear);

  const quarters = sortQuarters(Object.keys(FINANCIAL_DATA));
  if (quarters.length === 0) {
    showUnavailableState();
    return;
  }

  currentQuarter = quarters[0];

  document.querySelectorAll('.sre-year-btn').forEach((btn) => {
    const isActive = Number(btn.dataset.year) === currentYear;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  buildQuarterToggle(quarters);
  updatePeriodLabels();
  const section = document.querySelector('.sre-section-v2');
  const isVisible = section && section.classList.contains('visible');
  updateDisplay(currentQuarter, isVisible ? undefined : 0);
}

/**
 * Initialize scroll animations
 */
function initScrollAnimations() {
  if (typeof IntersectionObserver === 'undefined') {
    // Fallback: show all elements
    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      el.classList.add('visible');
    });
    return;
  }

  let sectionRolled = false;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          if (entry.target.classList.contains('sre-section-v2') && !sectionRolled) {
            sectionRolled = true;
            if (FINANCIAL_DATA && currentQuarter && FINANCIAL_DATA[currentQuarter]) {
              updateDisplay(currentQuarter, 0);
            }
          }
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  document.querySelectorAll('.animate-on-scroll').forEach((el) => {
    observer.observe(el);
  });
}

/**
 * Initialize breakdown item hover effects
 */
function initBreakdownInteractions() {
  const items = document.querySelectorAll('.sre-breakdown-item');

  items.forEach((item) => {
    item.addEventListener('mouseenter', function () {
      const type = this.dataset.type;
      highlightChartSegment(type, true);
    });

    item.addEventListener('mouseleave', function () {
      const type = this.dataset.type;
      highlightChartSegment(type, false);
    });
  });
}

/**
 * Highlight chart segment on hover
 */
function highlightChartSegment(type, highlight) {
  const incomeTypes = ['local', 'external'];
  const expTypes = ['gps', 'social', 'economic', 'debt'];

  let chart = null;
  let index = -1;

  if (incomeTypes.includes(type)) {
    chart = incomeChart;
    index = incomeTypes.indexOf(type);
  } else if (expTypes.includes(type)) {
    chart = expenditureChart;
    index = expTypes.indexOf(type);
  }

  if (chart && index >= 0) {
    const dataset = chart.data.datasets[0];
    const numSegments = dataset.data.length;

    if (highlight) {
      // Dim other segments instead of displacing the hovered one
      const dimmedColors = dataset.backgroundColor.map((color, i) => {
        if (i === index) return color;
        // Add transparency to non-hovered segments
        return color + '40';
      });
      dataset.hoverBackgroundColor = dimmedColors;
      dataset.backgroundColor = dimmedColors;
      dataset.backgroundColor[index] = chart._originalColors[index];
    } else {
      // Restore all segments to original colors
      dataset.backgroundColor = [...chart._originalColors];
      dataset.hoverBackgroundColor = [...chart._originalColors];
    }
    chart.update('none');
  }
}

/**
 * Every element that renders a figure read from the data file.
 */
const FIGURE_ELEMENT_IDS = [
  'sre-total-income',
  'sre-total-expense',
  'sre-net-income',
  'sre-fund-balance',
  'sre-income-local',
  'sre-income-local-pct',
  'sre-income-external',
  'sre-income-external-pct',
  'sre-exp-gps',
  'sre-exp-gps-pct',
  'sre-exp-social',
  'sre-exp-social-pct',
  'sre-exp-economic',
  'sre-exp-economic-pct',
  'sre-exp-debt',
  'sre-exp-debt-pct',
];

/**
 * Hide the figure-driven dashboard and reveal the "not yet available" notice.
 * Every figure element is blanked so no stale value can remain on screen.
 */
function showUnavailableState() {
  FIGURE_ELEMENT_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });

  document
    .querySelectorAll('.sre-year-select, .sre-period-toggle, .sre-metrics-row, .sre-breakdown-v2')
    .forEach((el) => {
      el.style.display = 'none';
    });

  const caption = document.getElementById('sre-period-caption');
  if (caption) caption.textContent = '';

  const link = document.getElementById('sre-source-link');
  if (link) link.hidden = true;

  const status = document.getElementById('sre-unavailable');
  if (status) status.style.display = '';
}

/**
 * Initialize the page: load verified figures, then render or degrade gracefully.
 */
async function init() {
  initScrollAnimations();

  let payload = null;
  try {
    payload = await loadFinancialData();
  } catch (error) {
    console.warn('Fiscal transparency data could not be loaded:', error);
  }

  FISCAL_PAYLOAD = payload;

  const years = listFiscalYears(payload);
  if (years.length === 0) {
    showUnavailableState();
    return;
  }

  currentYear = years[0];
  buildYearSelector(years);

  const status = document.getElementById('sre-unavailable');
  if (status) status.style.display = 'none';

  selectYear(currentYear);

  if (Object.keys(FINANCIAL_DATA).length === 0) return;

  initCharts();
  initBreakdownInteractions();
}

// Run when DOM is ready
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FINANCIAL_DATA,
    FISCAL_DATA_URL,
    FIGURE_ELEMENT_IDS,
    formatPeso,
    calcPercent,
    isValidQuarter,
    buildQuarterMap,
    listFiscalYears,
    sortQuarters,
    showUnavailableState,
  };
}
