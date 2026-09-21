/**
 * statistics-data.js
 * ---------------------------------------------------------------------------
 * Renders the Albay statistics dashboard from verified open data.
 *
 * Data sources (all fetched at runtime from ../data/)
 *   population_2024.json  PSA 2024 Census of Population. Province, 18 LGU and
 *                         720 barangay counts for 2015 / 2020 / 2024, plus
 *                         land area, population density and household counts.
 *   cmci_2024.json        DTI Cities and Municipalities Competitiveness Index
 *                         2024. 18 LGUs x 5 pillars x 50 indicators.
 *   fiscal_transparency.json
 *                         BLGF electronic Statements of Receipts and
 *                         Expenditures for the Provincial Government of Albay,
 *                         FY 2016 to Q2 2021, in PHP millions.
 *
 * Design contract
 *   Every DOM node emitted here uses a class that already exists in
 *   assets/css/statistics.css; no new CSS is introduced.
 *
 * Progressive enhancement
 *   If a dataset fails to load, the corresponding <section> keeps its
 *   server-rendered fallback text and an error notice is shown instead. The
 *   page never displays an invented number.
 */
(function () {
  'use strict';

  var DATA_BASE = '../data/';

  var PILLAR_META = {
    ed: { icon: 'bi-graph-up-arrow', short: 'Economic Dynamism' },
    ge: { icon: 'bi-building-check', short: 'Government Efficiency' },
    in: { icon: 'bi-signpost-split', short: 'Infrastructure' },
    re: { icon: 'bi-shield-check', short: 'Resiliency' },
    iv: { icon: 'bi-lightbulb', short: 'Innovation' },
  };
  var PILLAR_ORDER = ['ed', 'ge', 'in', 're', 'iv'];

  /* ------------------------------------------------------------------ *
   * utilities
   * ------------------------------------------------------------------ */

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escAttr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Build the attributes that mark an element's text for translation.
   *
   * A value from `data/*.json` is never translated; where a sentence contains
   * one, it is passed through `data-i18n-params` so the translated string keeps
   * its own word order around a figure the renderer supplies. Splitting the
   * sentence into fragments around the value would not survive translation.
   *
   * @param {string} key - Translation key
   * @param {Object} [params] - Values to interpolate into the translation
   * @returns {string} Attribute text, or '' when no key is given
   */
  function i18nAttr(key, params) {
    if (!key) return '';
    var attrs = ' data-i18n="' + escAttr(key) + '"';
    if (params) attrs += ' data-i18n-params="' + escAttr(JSON.stringify(params)) + '"';
    return attrs;
  }

  /**
   * Wrap text in an inline element the engine can replace. Needed where an
   * element holds an icon or other markup alongside the text, since the engine
   * replaces `textContent` and would take the markup with it.
   */
  function tr(key, text, params) {
    return '<span' + i18nAttr(key, params) + '>' + esc(text) + '</span>';
  }

  var numberFormat = new Intl.NumberFormat('en-PH');

  function num(value) {
    if (value == null || !isFinite(value)) return '--';
    return numberFormat.format(value);
  }

  function dec(value, places) {
    if (value == null || !isFinite(value)) return '--';
    return Number(value).toFixed(places == null ? 2 : places);
  }

  function pct(value, places) {
    if (value == null || !isFinite(value)) return '--';
    var v = Number(value).toFixed(places == null ? 2 : places);
    return (value > 0 ? '+' : '') + v + '%';
  }

  /**
   * A metric card's label and its provenance line. Each sits in its own element,
   * so each can carry its own translation key: they are separate strings and do
   * not translate as a unit.
   */
  function small(text, value, textKey, textParams, valueKey, valueParams) {
    return (
      '<div class="metric-label"' +
      i18nAttr(textKey, textParams) +
      '>' +
      esc(text) +
      '</div><div class="metric-source"' +
      i18nAttr(valueKey, valueParams) +
      '>' +
      esc(value) +
      '</div>'
    );
  }

  function fetchJson(file) {
    return fetch(DATA_BASE + file, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error(file + ' -> HTTP ' + res.status);
      return res.json();
    });
  }

  /* ------------------------------------------------------------------ *
   * reveal / animation
   * ------------------------------------------------------------------ */

  var NUMBER_SELECTOR =
    '.metric-value, .trend-stat-value, .economy-value, .pillar-score, .finance-card-value, .indicator-value';

  function parseNumericString(str) {
    if (!str || typeof str !== 'string') return null;
    var trimmed = str.trim();
    if (trimmed === '—' || trimmed === '--') return null;
    var regex = /^([^\d\-+]*)([+-]?)([\d,]+(?:\.\d+)?)(.*)$/;
    var match = trimmed.match(regex);
    if (!match) return null;
    var rawPrefix = match[1];
    var sign = match[2];
    var numStr = match[3];
    var suffix = match[4];

    var cleanNumStr = numStr.replace(/,/g, '');
    var targetNum = parseFloat(cleanNumStr);
    if (isNaN(targetNum)) return null;

    var fullPrefix = rawPrefix + (sign || '');
    var hasCommas = numStr.includes(',');
    var decIndex = numStr.indexOf('.');
    var decimals = decIndex >= 0 ? numStr.length - decIndex - 1 : 0;

    return {
      prefix: fullPrefix,
      number: sign === '-' ? -targetNum : targetNum,
      suffix: suffix,
      decimals: decimals,
      hasCommas: hasCommas,
    };
  }

  function formatInterpValue(val, parsed) {
    var absVal = Math.abs(val);
    var numPart =
      parsed.decimals > 0 ? absVal.toFixed(parsed.decimals) : Math.round(absVal).toString();
    if (parsed.hasCommas) {
      var parts = numPart.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      numPart = parts.join('.');
    }
    var prefix = parsed.prefix;
    if (prefix === '+' && val <= 0) {
      prefix = '';
    } else if (val < 0 && prefix.indexOf('-') === -1) {
      prefix = '-' + prefix;
    }
    return prefix + numPart + parsed.suffix;
  }

  function rollText(element, targetText, startVal, duration) {
    if (!element) return;
    if (typeof targetText !== 'string') targetText = String(targetText == null ? '' : targetText);

    var parsedTarget = parseNumericString(targetText);
    if (!parsedTarget) {
      element.textContent = targetText;
      return;
    }

    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      element.textContent = targetText;
      return;
    }

    if (element._rollAnimId) {
      cancelAnimationFrame(element._rollAnimId);
      element._rollAnimId = null;
    }

    var startNum = 0;
    if (typeof startVal === 'number') {
      startNum = startVal;
    } else {
      var currentParsed = parseNumericString(element.textContent);
      if (currentParsed && !isNaN(currentParsed.number)) {
        startNum = currentParsed.number;
      }
    }

    var targetNum = parsedTarget.number;
    if (startNum === targetNum && element.textContent === targetText) {
      return;
    }

    var animDuration = typeof duration === 'number' ? duration : 550;
    var startTime =
      typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

    element.classList.remove('number-rolling');
    void element.offsetWidth;
    element.classList.add('number-rolling');

    function step(now) {
      var elapsed = now - startTime;
      var progress = Math.min(1, elapsed / animDuration);
      var ease = 1 - Math.pow(1 - progress, 4);
      var currentVal = startNum + (targetNum - startNum) * ease;

      if (progress < 1) {
        element.textContent = formatInterpValue(currentVal, parsedTarget);
        element._rollAnimId = requestAnimationFrame(step);
      } else {
        element.textContent = targetText;
        element._rollAnimId = null;
        setTimeout(function () {
          element.classList.remove('number-rolling');
        }, 80);
      }
    }

    if (typeof requestAnimationFrame === 'function') {
      element._rollAnimId = requestAnimationFrame(step);
    } else {
      element.textContent = targetText;
    }
  }

  function rollNumbersIn(root, forceReRoll) {
    if (!root) return;
    var targets = [];
    if (root.matches && root.matches(NUMBER_SELECTOR)) {
      targets.push(root);
    }
    if (root.querySelectorAll) {
      var list = root.querySelectorAll(NUMBER_SELECTOR);
      for (var i = 0; i < list.length; i++) {
        targets.push(list[i]);
      }
    }
    for (var j = 0; j < targets.length; j++) {
      var el = targets[j];
      if (!forceReRoll && el._hasRolled) continue;
      el._hasRolled = true;
      rollText(el, el.textContent, 0);
    }
  }

  var revealObserver = null;

  function observeReveal(nodes) {
    if (!nodes || !nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (n) {
        n.classList.add('visible');
        animateBars(n);
        rollNumbersIn(n);
      });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            animateBars(entry.target);
            rollNumbersIn(entry.target);
            revealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
      );
    }
    Array.prototype.forEach.call(nodes, function (n) {
      revealObserver.observe(n);
    });
  }

  /** Apply stored widths so CSS transitions run once the node is on screen. */
  function animateBars(root) {
    if (!root || !root.querySelectorAll) return;
    var targets = root.querySelectorAll('[data-width]');
    Array.prototype.forEach.call(targets, function (el) {
      var w = el.getAttribute('data-width') || '0';
      if (el.classList.contains('indicator-fill')) {
        el.style.setProperty('--fill-width', w);
        el.classList.add('animated');
      } else {
        el.style.width = w;
      }
      el.removeAttribute('data-width');
    });
  }

  /* ------------------------------------------------------------------ *
   * chart helpers
   * ------------------------------------------------------------------ */

  var PALETTE = [
    '#1a5f2a',
    '#2e7d32',
    '#43a047',
    '#0d6efd',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#f59e0b',
    '#ef4444',
    '#14b8a6',
    '#ec4899',
    '#84cc16',
    '#06b6d4',
    '#f97316',
    '#a855f7',
    '#0ea5e9',
    '#22c55e',
    '#eab308',
  ];

  function hasChart() {
    return typeof window.Chart === 'function';
  }

  function makeChart(canvas, config) {
    if (!canvas || !hasChart()) return null;
    try {
      return new window.Chart(canvas.getContext('2d'), config);
    } catch (e) {
      return null;
    }
  }

  /**
   * Charts whose legends or axis titles are drawn copy, keyed by translation key.
   *
   * Chart.js paints its legend, tooltips and axis titles into a canvas, where the
   * i18n engine cannot reach them: they are not DOM text nodes, so none of the
   * five `data-i18n-*` selectors ever match them. Registering the chart here lets
   * that canvas-painted copy be relabelled when the language changes.
   */
  var chartCopy = [];

  function registerChartCopy(chart, spec) {
    if (chart) chartCopy.push({ chart: chart, spec: spec || {} });
    return chart;
  }

  /**
   * Read a translation for canvas-painted copy, falling back to the English text
   * the chart was built with when the engine or the key is unavailable.
   */
  function chartText(key, fallback, params) {
    if (!key || !window.TranslationEngine || !TranslationEngine.getTranslation) return fallback;
    try {
      return TranslationEngine.getTranslation(key, null, params) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function translateCharts() {
    chartCopy.forEach(function (entry) {
      var chart = entry.chart;
      var spec = entry.spec;
      if (!chart || !chart.data || typeof chart.update !== 'function') return;

      (spec.datasets || []).forEach(function (key, i) {
        var dataset = chart.data.datasets[i];
        if (dataset) dataset.label = chartText(key, dataset.label);
      });

      (spec.axes || []).forEach(function (axis) {
        var scale = chart.options && chart.options.scales && chart.options.scales[axis.scale];
        if (scale && scale.title) scale.title.text = chartText(axis.key, scale.title.text);
      });

      chart.update('none');
    });
  }

  function canvasWrap(heightClass, inner) {
    return (
      '<div class="chart-wrapper' + (heightClass ? ' ' + heightClass : '') + '">' + inner + '</div>'
    );
  }

  function sourceLine(label, url) {
    return (
      '<p class="data-source"><i class="bi bi-database-check" aria-hidden="true"></i>' +
      '<span' +
      i18nAttr('stats-source') +
      '>Source</span>: <a href="' +
      esc(url) +
      '" target="_blank" rel="noopener noreferrer">' +
      esc(label) +
      '</a></p>'
    );
  }

  /**
   * Section tag, heading and lead paragraph. Each is given its own key so the
   * three translate independently.
   *
   * @param {string} tag - Eyebrow label
   * @param {string} heading - Section heading
   * @param {string} blurb - Lead paragraph
   * @param {Object} [keys] - `tag`, `heading`, `blurb` and optional `blurbParams`
   */
  function sectionHeader(tag, heading, blurb, keys) {
    keys = keys || {};
    return (
      '<div class="section-header-minimal">' +
      (tag ? '<span class="section-tag"' + i18nAttr(keys.tag) + '>' + esc(tag) + '</span>' : '') +
      '<h2' +
      i18nAttr(keys.heading) +
      '>' +
      esc(heading) +
      '</h2>' +
      (blurb ? '<p' + i18nAttr(keys.blurb, keys.blurbParams) + '>' + esc(blurb) + '</p>' : '') +
      '</div>'
    );
  }

  function containerOf(section) {
    return section ? section.querySelector('.container') : null;
  }

  function setContent(section, html) {
    var container = containerOf(section);
    if (!container) return null;
    container.innerHTML = html;
    return container;
  }

  function showError(section, message, messageKey, params) {
    var container = containerOf(section);
    if (!container) return;
    var h2 = container.querySelector('h2');
    var heading = h2 ? h2.outerHTML : '';
    container.innerHTML =
      heading +
      '<p role="status"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i> ' +
      tr(messageKey, message, params) +
      '</p>' +
      sourceLine('PSA OpenSTAT \u2014 2024 Census of Population', 'https://openstat.psa.gov.ph');
  }

  /* ------------------------------------------------------------------ *
   * Derived figures
   * ------------------------------------------------------------------ */

  function lguByKey(pop) {
    var map = {};
    (pop.lgus || []).forEach(function (l) {
      map[l.psgc_10digit] = l;
    });
    return map;
  }

  function allBarangays(pop) {
    var out = [];
    (pop.lgus || []).forEach(function (l) {
      (l.barangays || []).forEach(function (b) {
        out.push({
          name: b.name,
          official_name: b.official_name,
          psgc_10digit: b.psgc_10digit,
          lgu: l.name,
          type: l.type,
          is_poblacion: b.is_poblacion,
          population_2015: b.population_2015,
          population_2020: b.population_2020,
          population_2024: b.population_2024,
          household_population_2024: b.household_population_2024,
          households_2024: b.households_2024,
        });
      });
    });
    return out;
  }

  /** Province-wide pillar totals + leaders, derived from the 18 LGU records. */
  function pillarSummary(cmci) {
    var totals = {};
    var best = {};
    PILLAR_ORDER.forEach(function (key) {
      totals[key] = 0;
      best[key] = null;
    });

    (cmci.lgus || []).forEach(function (lgu) {
      PILLAR_ORDER.forEach(function (key) {
        var p = lgu.pillars && lgu.pillars[key];
        if (!p) return;
        totals[key] += p.score || 0;
        if (!best[key] || (p.score || 0) > best[key].score) {
          best[key] = { score: p.score || 0, lgu: lgu.name, rank: p.rank };
        }
      });
    });

    var grand = PILLAR_ORDER.reduce(function (a, k) {
      return a + totals[k];
    }, 0);

    return {
      totals: totals,
      best: best,
      grand: grand,
      label: function (key) {
        return (cmci.pillars && cmci.pillars[key]) || PILLAR_META[key].short;
      },
    };
  }

  function classLabel(type) {
    if (type === 'city') return 'City';
    if (type === 'municipality') return 'Municipality';
    return 'LGU';
  }

  /* ------------------------------------------------------------------ *
   * 1. Key metrics
   * ------------------------------------------------------------------ */

  function renderMetrics(pop) {
    var section = document.querySelector('.stats-metrics');
    if (!section) return;
    var t = pop.province_totals;
    var cities = pop.lgus.filter(function (l) {
      return l.type === 'city';
    }).length;
    var avgHousehold =
      t.household_population_2024 && t.households_2024
        ? t.household_population_2024 / t.households_2024
        : null;

    /* `value` is a rendered figure and never translated; where a figure carries a
           unit word it is passed to the translation as a parameter instead. */
    var cards = [
      {
        icon: 'bi-people-fill',
        value: num(t.population_2024),
        label: 'Population',
        labelKey: 'stats-population',
        source: '2024 Census',
        sourceKey: 'stats-census-2024',
      },
      {
        icon: 'bi-house-door-fill',
        value: num(t.households_2024),
        label: 'Households',
        labelKey: 'stats-households',
        source: '2024 Census (private households)',
        sourceKey: 'stats-census-2024-private-households',
      },
      {
        icon: 'bi-arrows-expand',
        value: num(t.land_area_km2) + ' km\u00B2',
        label: 'Land Area',
        labelKey: 'stats-land-area',
        // Agency name: a citation, left in its own language on purpose.
        source: 'PSA / DENR Land Management Bureau',
      },
      {
        icon: 'bi-grid-3x3-gap-fill',
        value: num(t.density_2024),
        label: 'Population Density',
        labelKey: 'stats-density',
        source: 'persons per km\u00B2 (2024)',
        sourceKey: 'stats-persons-per-km2-2024',
      },
      {
        icon: 'bi-graph-up-arrow',
        value: pct(t.change_2020_2024, 2),
        label: 'Growth Rate',
        labelKey: 'stats-growth-rate',
        source: '2020 to 2024 census change',
        sourceKey: 'stats-census-change-2020-2024',
      },
      {
        icon: 'bi-building',
        value: num(cities) + ' cities',
        valueKey: 'stats-cities-count',
        valueParams: { count: num(cities) },
        label: 'Cities and Municipalities',
        labelKey: 'stats-cities-and-municipalities',
        source:
          num(pop.lgus.length) + ' LGUs, ' + num(pop.lgus.length - cities) + ' municipalities',
        sourceKey: 'stats-lgus-and-municipalities',
        sourceParams: {
          lgus: num(pop.lgus.length),
          municipalities: num(pop.lgus.length - cities),
        },
      },
      {
        icon: 'bi-geo-alt-fill',
        value: num(pop.total_barangays),
        label: 'Barangays',
        labelKey: 'stats-barangays',
        source: 'across all 18 LGUs',
        sourceKey: 'stats-across-all-18-lgus',
      },
      {
        icon: 'bi-people',
        value: dec(avgHousehold, 2),
        label: 'Average Household Size',
        labelKey: 'stats-average-household-size',
        source: 'persons per private household, 2024',
        sourceKey: 'stats-persons-per-private-household-2024',
      },
    ];

    var html =
      sectionHeader(
        'Demographics Overview',
        'Albay at a glance',
        'Official 2024 Census of Population counts for the Province of Albay, as published by the Philippine Statistics Authority.',
        {
          tag: 'stats-demographics',
          heading: 'stats-metrics-heading',
          blurb: 'stats-metrics-blurb',
        }
      ) +
      '<div class="metrics-grid">' +
      cards
        .map(function (c) {
          return (
            '<div class="metric-card">' +
            '<div class="metric-icon"><i class="bi ' +
            c.icon +
            '" aria-hidden="true"></i></div>' +
            '<div class="metric-value"' +
            i18nAttr(c.valueKey, c.valueParams) +
            '>' +
            esc(c.value) +
            '</div>' +
            small(c.label, c.source, c.labelKey, c.labelParams, c.sourceKey, c.sourceParams) +
            '</div>'
          );
        })
        .join('') +
      '</div>' +
      sourceLine(
        'Philippine Statistics Authority \u2014 2024 Census of Population',
        'https://openstat.psa.gov.ph'
      );

    var container = setContent(section, html);
    if (container) observeReveal(container.querySelectorAll('.metric-card'));
  }

  /* ------------------------------------------------------------------ *
   * 2. Population trends
   * ------------------------------------------------------------------ */

  function renderTrends(pop) {
    var section = document.querySelector('.stats-trends');
    if (!section) return;
    var t = pop.province_totals;

    var summary =
      '<div class="trends-summary">' +
      '<div class="trend-stat"><div class="trend-stat-label"' +
      i18nAttr('stats-census-2015') +
      '>2015 Census</div>' +
      '<div class="trend-stat-value">' +
      num(t.population_2015) +
      '</div></div>' +
      '<i class="bi bi-arrow-right trend-arrow" aria-hidden="true"></i>' +
      '<div class="trend-stat"><div class="trend-stat-label"' +
      i18nAttr('stats-census-2020') +
      '>2020 Census</div>' +
      '<div class="trend-stat-value">' +
      num(t.population_2020) +
      '</div></div>' +
      '<i class="bi bi-arrow-right trend-arrow" aria-hidden="true"></i>' +
      '<div class="trend-stat trend-stat-current"><div class="trend-stat-label"' +
      i18nAttr('stats-census-2024') +
      '>2024 Census</div>' +
      '<div class="trend-stat-value">' +
      num(t.population_2024) +
      '</div></div>' +
      '<div class="trend-stat trend-stat-growth"><div class="trend-stat-label"' +
      i18nAttr('stats-change-2020-2024') +
      '>Change 2020\u20132024</div>' +
      '<div class="trend-stat-value">' +
      pct(t.change_2020_2024, 2) +
      '</div></div>' +
      '</div>';

    var growth = pop.lgus
      .slice()
      .sort(function (a, b) {
        return (b.change_2020_2024 || 0) - (a.change_2020_2024 || 0);
      })
      .map(function (l) {
        var v = l.change_2020_2024;
        var cls = v > 0 ? 'trend-up' : v < 0 ? 'trend-down' : 'trend-stable';
        var icon = v > 0 ? 'bi-arrow-up-right' : v < 0 ? 'bi-arrow-down-right' : 'bi-dash';
        return (
          '<div class="barangay-row"><span class="rank">' +
          esc(classLabel(l.type).charAt(0)) +
          '</span><span class="name">' +
          esc(l.name) +
          '</span><span class="bar-wrap"><span class="bar" data-width="' +
          Math.min(100, Math.abs(v) * 12).toFixed(1) +
          '%"></span></span><span class="pop"><span class="pillar-trend ' +
          cls +
          '"><i class="bi ' +
          icon +
          '"></i>' +
          esc(pct(v, 1)) +
          '</span></span></div>'
        );
      })
      .join('');

    var html =
      sectionHeader(
        'Population Trends',
        'How Albay\u2019s population changed',
        'Three official censuses and the change in population between 2020 and 2024, for the province and for every city and municipality.',
        {
          tag: 'stats-trends-tag',
          heading: 'stats-trends-heading',
          blurb: 'stats-trends-blurb',
        }
      ) +
      summary +
      canvasWrap(
        '',
        '<canvas id="trendChart" data-i18n-aria="stats-population-chart-aria" aria-label="Albay population by census year"></canvas>'
      ) +
      '<div class="distribution-list" style="margin-top:32px">' +
      growth +
      '</div>' +
      sourceLine(
        'Philippine Statistics Authority \u2014 2024 Census of Population',
        'https://openstat.psa.gov.ph'
      );

    var container = setContent(section, html);
    if (!container) return;

    makeChart(document.getElementById('trendChart'), {
      type: 'line',
      data: {
        labels: ['2015', '2020', '2024'],
        datasets: [
          {
            label: 'Albay population',
            data: [t.population_2015, t.population_2020, t.population_2024],
            borderColor: '#1a5f2a',
            backgroundColor: 'rgba(26,95,42,0.12)',
            fill: true,
            tension: 0.3,
            pointRadius: 6,
            pointBackgroundColor: '#1a5f2a',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function (v) {
                return numberFormat.format(v);
              },
            },
          },
        },
      },
    });

    observeReveal(container.querySelectorAll('.trend-stat, .barangay-row'));
    animateBars(container);
  }

  /* ------------------------------------------------------------------ *
   * 3. Population by LGU
   * ------------------------------------------------------------------ */

  function renderDistribution(pop) {
    var section = document.querySelector('.stats-distribution');
    if (!section) return;

    var ranked = pop.lgus.slice().sort(function (a, b) {
      return b.population_2024 - a.population_2024;
    });
    var max = ranked[0] ? ranked[0].population_2024 : 1;

    var rows = ranked
      .map(function (l, i) {
        var rank = i + 1;
        return (
          '<div class="barangay-row" data-rank="' +
          rank +
          '"><span class="rank">#' +
          rank +
          '</span>' +
          '<span class="name">' +
          esc(l.name) +
          '</span>' +
          '<span class="bar-wrap"><span class="bar" data-width="' +
          ((l.population_2024 / max) * 100).toFixed(1) +
          '%"></span></span>' +
          '<span class="pop">' +
          num(l.population_2024) +
          '</span></div>'
        );
      })
      .join('');

    var top = pop.lgus.reduce(function (a, l) {
      return !a || l.density_2024 > a.density_2024 ? l : a;
    }, null);

    var html =
      sectionHeader(
        'Distribution',
        'Population by city and municipality',
        'All 18 local government units of Albay, ranked by their 2024 Census population. The capital, Legazpi, is the most populous and the most densely settled.',
        {
          tag: 'stats-distribution-tag',
          heading: 'stats-distribution-heading',
          blurb: 'stats-distribution-blurb',
        }
      ) +
      '<div class="distribution-layout">' +
      '<div class="distribution-chart"><canvas id="distributionChart" data-i18n-aria="stats-distribution-chart-aria" aria-label="Share of Albay population by LGU"></canvas></div>' +
      '<div class="distribution-list">' +
      rows +
      '</div>' +
      '</div>' +
      '<div class="economy-grid" style="margin-top:40px">' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-pin-map-fill"></i></div><div>' +
      '<div class="economy-value">' +
      esc(top ? top.name : '--') +
      '</div><div class="economy-label"' +
      i18nAttr('stats-most-densely-settled-lgu') +
      '>Most densely settled LGU</div>' +
      '<span class="economy-trend"><i class="bi bi-people"></i>' +
      num(top ? top.density_2024 : null) +
      ' ' +
      tr('stats-persons-per-km2', 'persons/km\u00B2') +
      '</span></div></div>' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-arrows-expand"></i></div><div>' +
      '<div class="economy-value">' +
      esc(
        pop.lgus.slice().sort(function (a, b) {
          return b.land_area_km2 - a.land_area_km2;
        })[0].name
      ) +
      '</div><div class="economy-label"' +
      i18nAttr('stats-largest-land-area') +
      '>Largest land area</div>' +
      '<span class="economy-trend"><i class="bi bi-rulers"></i>' +
      num(
        pop.lgus.slice().sort(function (a, b) {
          return b.land_area_km2 - a.land_area_km2;
        })[0].land_area_km2
      ) +
      ' km\u00B2</span></div></div>' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-geo-alt-fill"></i></div><div>' +
      '<div class="economy-value">' +
      num(pop.total_barangays) +
      '</div><div class="economy-label"' +
      i18nAttr('stats-barangays-province-wide') +
      '>Barangays province-wide</div>' +
      '<span class="economy-trend"><i class="bi bi-building"></i>' +
      num(pop.lgus.length) +
      ' ' +
      tr('stats-lgus', 'LGUs') +
      '</span></div></div>' +
      '</div>' +
      sourceLine(
        'Philippine Statistics Authority \u2014 2024 Census of Population',
        'https://openstat.psa.gov.ph'
      );

    var container = setContent(section, html);
    if (!container) return;

    makeChart(document.getElementById('distributionChart'), {
      type: 'doughnut',
      data: {
        labels: ranked.map(function (l) {
          return l.name;
        }),
        datasets: [
          {
            data: ranked.map(function (l) {
              return l.population_2024;
            }),
            backgroundColor: ranked.map(function (_, i) {
              return PALETTE[i % PALETTE.length];
            }),
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, padding: 8, font: { size: 10 } },
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var total = ctx.dataset.data.reduce(function (a, b) {
                  return a + b;
                }, 0);
                var share = total ? (ctx.parsed / total) * 100 : 0;
                return (
                  ctx.label +
                  ': ' +
                  numberFormat.format(ctx.parsed) +
                  ' (' +
                  share.toFixed(1) +
                  '%)'
                );
              },
            },
          },
        },
      },
    });

    observeReveal(container.querySelectorAll('.barangay-row, .economy-card'));
    animateBars(container);
  }

  /* ------------------------------------------------------------------ *
   * 4. Economic indicators (CMCI pillars, province aggregate)
   * ------------------------------------------------------------------ */

  function renderEconomy(pop, cmci, econ, cpi, agri) {
    var section = document.querySelector('.stats-economy');
    if (!section) return;

    var t = pop.province_totals;
    var fastest = pop.lgus.slice().sort(function (a, b) {
      return (b.change_2020_2024 || -99) - (a.change_2020_2024 || -99);
    })[0];

    var econCardsHtml = '';
    var sectorsHtml = '';

    if (econ && econ.summary && econ.annual_series) {
      var latestEcon = econ.annual_series[econ.annual_series.length - 1];
      var gpdpCurrent = latestEcon.current_prices_billion_php;
      var gpdpConstant = latestEcon.constant_2018_prices_billion_php;
      var realGrowth = latestEcon.real_growth_rate_pct;
      var latestCpiVal = cpi && cpi.latest_cpi ? cpi.latest_cpi.value : null;
      var latestCpiDate = cpi && cpi.latest_cpi ? (cpi.latest_cpi.month + ' ' + cpi.latest_cpi.year) : null;
      var agriVol = agri && agri.summary ? agri.summary.volume_2025_mt : null;
      var agriArea = agri && agri.summary ? agri.summary.area_2025_ha : null;
      var agriYield = agri && agri.summary ? agri.summary.yield_2025_mt_per_ha : null;

      econCardsHtml =
        '<div class="economy-grid">' +
        '<div class="economy-card"><div class="economy-icon"><i class="bi bi-cash-stack"></i></div><div>' +
        '<div class="economy-value">\u20B1' + dec(gpdpCurrent, 2) + 'B</div>' +
        '<div class="economy-label">Gross Provincial Domestic Product (Current Prices, 2025)</div>' +
        '<span class="economy-trend"><i class="bi bi-graph-up-arrow"></i>From \u20B1133.46B (2018) to \u20B1200.95B (2025)</span>' +
        '</div></div>' +
        '<div class="economy-card"><div class="economy-icon"><i class="bi bi-graph-up"></i></div><div>' +
        '<div class="economy-value">\u20B1' + dec(gpdpConstant, 2) + 'B</div>' +
        '<div class="economy-label">Real GPDP (Constant 2018 Prices, 2025)</div>' +
        '<span class="economy-trend"><i class="bi bi-arrow-up-right"></i>' + pct(realGrowth, 1) + ' real growth in 2025</span>' +
        '</div></div>' +
        '<div class="economy-card"><div class="economy-icon"><i class="bi bi-tags-fill"></i></div><div>' +
        '<div class="economy-value">' + (latestCpiVal != null ? dec(latestCpiVal, 1) : '--') + '</div>' +
        '<div class="economy-label">Consumer Price Index (2018=100' + (latestCpiDate ? ', ' + esc(latestCpiDate) : '') + ')</div>' +
        '<span class="economy-trend"><i class="bi bi-receipt"></i>Albay headline price index / cost of living</span>' +
        '</div></div>' +
        '<div class="economy-card"><div class="economy-icon"><i class="bi bi-flower1"></i></div><div>' +
        '<div class="economy-value">' + (agriVol ? num(Math.round(agriVol)) + ' MT' : '--') + '</div>' +
        '<div class="economy-label">Annual Palay (Rice) Harvested, 2025</div>' +
        '<span class="economy-trend"><i class="bi bi-geo-alt"></i>' + (agriArea ? num(Math.round(agriArea)) + ' ha (' + agriYield + ' MT/ha)' : 'Albay agricultural harvest') + '</span>' +
        '</div></div>' +
        '</div>';

      if (econ.macro_sectors_2025 && econ.macro_sectors_2025.length) {
        var macroRows = econ.macro_sectors_2025.map(function (m, idx) {
          return (
            '<div class="sc-row"><div class="sc-meta">' +
            '<span class="sc-dot" style="background-color:' + PALETTE[idx % PALETTE.length] + '"></span>' +
            '<span class="sc-name">' + esc(m.macro_sector) + ' (\u20B1' + dec(m.billion_php, 2) + 'B)</span>' +
            '</div>' +
            '<span class="sc-pct">' + dec(m.share_pct, 1) + '%</span>' +
            '<span class="sc-track"><span class="sc-fill" style="background-color:' +
            PALETTE[idx % PALETTE.length] +
            '" data-width="' + dec(m.share_pct, 1) + '%"></span></span></div>'
          );
        }).join('');

        sectorsHtml =
          '<div class="sectors-chart"><h4><i class="bi bi-pie-chart-fill"></i>' +
          'Albay economic output by major sector (Constant 2018 Prices, 2025)' +
          '</h4><div class="sc-bars">' +
          macroRows +
          '</div></div>';
      }
    } else {
      var summary = pillarSummary(cmci);
      var lguCount = Math.max(1, (cmci.lgus || []).length);
      var cards = PILLAR_ORDER.map(function (key) {
        var best = summary.best[key];
        var pillarLabel = summary.label(key);
        var leaderName = best ? best.lgu : '--';
        var leaderScore = dec(best ? best.score : null, 2);
        return (
          '<div class="economy-card">' +
          '<div class="economy-icon"><i class="bi ' +
          PILLAR_META[key].icon +
          '"></i></div>' +
          '<div><div class="economy-value">' +
          dec(summary.totals[key] / lguCount, 2) +
          '</div><div class="economy-label">' +
          tr(
            'stats-average-score-per-lgu',
            pillarLabel + ' \u2014 average score per LGU, ' + cmci.year,
            { pillar: pillarLabel, year: String(cmci.year) }
          ) +
          '</div>' +
          '<span class="economy-trend"><i class="bi bi-trophy"></i>' +
          tr('stats-leader', 'Leader: ' + leaderName + ' (' + leaderScore + ')', {
            name: leaderName,
            score: leaderScore,
          }) +
          '</span></div></div>'
        );
      }).join('');
      econCardsHtml = '<div class="economy-grid">' + cards + '</div>';
    }

    var demographicCardsHtml =
      '<div class="economy-grid" style="margin-top:32px">' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-people-fill"></i></div><div>' +
      '<div class="economy-value">' +
      num(t.population_2024) +
      '</div><div class="economy-label"' +
      i18nAttr('stats-provincial-population-2024') +
      '>Provincial population, 2024 Census</div>' +
      '<span class="economy-trend"><i class="bi bi-graph-up-arrow"></i>' +
      pct(t.change_2015_2024, 1) +
      ' ' +
      tr('stats-since-2015', 'since 2015') +
      '</span></div></div>' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-house-door-fill"></i></div><div>' +
      '<div class="economy-value">' +
      num(t.households_2024) +
      '</div><div class="economy-label"' +
      i18nAttr('stats-private-households-2024') +
      '>Private households, 2024</div>' +
      '<span class="economy-trend"><i class="bi bi-people"></i>' +
      dec(t.household_population_2024 / t.households_2024, 2) +
      ' ' +
      tr('stats-persons-each', 'persons each') +
      '</span></div></div>' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-arrow-up-right-circle-fill"></i></div><div>' +
      '<div class="economy-value">' +
      esc(fastest ? fastest.name : '--') +
      '</div><div class="economy-label"' +
      i18nAttr('stats-fastest-growing-lgu') +
      '>Fastest-growing LGU, 2020\u20132024</div>' +
      '<span class="economy-trend"><i class="bi bi-graph-up"></i>' +
      pct(fastest ? fastest.change_2020_2024 : null, 1) +
      '</span></div></div>' +
      '</div>';

    var sourceUrl = econ && econ._source_url ? econ._source_url : (cmci._source_url || 'https://openstat.psa.gov.ph');
    var sourceTitle = econ ? 'Philippine Statistics Authority \u2014 Provincial Product Accounts & OpenSTAT' : 'DTI Cities and Municipalities Competitiveness Index';

    var html =
      sectionHeader(
        'Economic Indicators',
        'Provincial economic accounts & indicators',
        'Official Gross Provincial Domestic Product (GPDP) and economic structure for Albay Province from the Philippine Statistics Authority (PSA) Provincial Product Accounts, alongside price and production indicators.',
        {
          tag: 'stats-economic',
          heading: 'stats-economy-heading',
          blurb: 'stats-economy-blurb',
        }
      ) +
      econCardsHtml +
      sectorsHtml +
      demographicCardsHtml +
      sourceLine(sourceTitle, sourceUrl);

    var container = setContent(section, html);
    if (!container) return;
    observeReveal(container.querySelectorAll('.economy-card, .sc-row'));
    animateBars(container);
  }

  /* ------------------------------------------------------------------ *
   * 4b. Provincial income \u2014 BLGF Statements of Receipts & Expenditures
   * ------------------------------------------------------------------ */

  /**
   * One row per complete fiscal year. `cumulative` is not the test: every period
   * in the source file is year-to-date within its own year, so Q1 2021 (FY 2016
   * Q1 in the raw file) is flagged `cumulative: true` too. The twelve-month
   * statements are the ones coded `FY`; the rest are part-years that would read
   * as a collapse in income if charted beside full years.
   */
  function fullYearPeriods(fiscal) {
    var years = (fiscal && fiscal.fiscal_years) || [];
    var rows = [];
    years.forEach(function (entry) {
      var keys = Object.keys(entry.quarters || {});
      if (!keys.length) return;
      var period = entry.quarters[keys[keys.length - 1]];
      if (period && period.code === 'FY') rows.push({ year: entry.year, period: period });
    });
    return rows;
  }

  function renderFinance(fiscal) {
    var section = document.querySelector('.stats-finance');
    if (!section) return;

    var series = fullYearPeriods(fiscal);

    if (!series.length) {
      setContent(
        section,
        sectionHeader(
          'Public Finance',
          'Provincial income and receipts',
          'Receipts and expenditures of the Provincial Government of Albay, as reported to the Bureau of Local Government Finance.',
          {
            tag: 'stats-fin-tag',
            heading: 'stats-fin-heading',
            blurb: 'stats-fin-blurb-empty',
          }
        ) +
          '<p role="status">' +
          tr(
            'stats-fin-no-complete-year',
            'No complete fiscal year of verified receipts data is available, so no income figure is shown here rather than an estimate of unknown provenance.'
          ) +
          '</p>' +
          sourceLine('Bureau of Local Government Finance', 'https://blgf.gov.ph/')
      );
      return;
    }

    var last = series[series.length - 1];
    var inc = last.period.income || {};
    var localShare = inc.total ? (inc.local / inc.total) * 100 : null;
    var peso = function (value) {
      return '\u20B1' + dec(value, 2) + 'M';
    };

    var fundBalance = peso(last.period.fundBalance);
    var periodLabel = String(last.period.period == null ? '' : last.period.period);
    var cards =
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-cash-stack"></i></div><div>' +
      '<div class="economy-value">' +
      peso(inc.total) +
      '</div><div class="economy-label">' +
      tr('stats-fin-total-receipts', 'Total receipts, ' + periodLabel, { period: periodLabel }) +
      '</div><span class="economy-trend"><i class="bi bi-calendar3"></i>' +
      esc(last.period.periodLabel) +
      ' ' +
      esc(last.year) +
      '</span></div></div>' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-bank"></i></div><div>' +
      '<div class="economy-value">' +
      peso(inc.local) +
      '</div><div class="economy-label"' +
      i18nAttr('stats-fin-raised-locally') +
      '>Raised locally \u2014 taxes, fees and economic enterprises</div>' +
      '<span class="economy-trend"><i class="bi bi-pie-chart-fill"></i>' +
      dec(localShare, 1) +
      ' ' +
      tr('stats-fin-percent-of-total', '% of total receipts') +
      '</span></div></div>' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-arrow-down-left-circle"></i></div><div>' +
      '<div class="economy-value">' +
      peso(inc.external) +
      '</div><div class="economy-label"' +
      i18nAttr('stats-fin-national-transfers') +
      '>National transfers \u2014 internal revenue allotment and national wealth shares</div>' +
      '<span class="economy-trend"><i class="bi bi-pie-chart-fill"></i>' +
      dec(localShare == null ? null : 100 - localShare, 1) +
      ' ' +
      tr('stats-fin-percent-of-total', '% of total receipts') +
      '</span></div></div>' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-graph-up-arrow"></i></div><div>' +
      '<div class="economy-value">' +
      peso(last.period.netIncome) +
      '</div><div class="economy-label"' +
      i18nAttr('stats-fin-net-income') +
      '>Net income \u2014 receipts less expenditures</div>' +
      '<span class="economy-trend"><i class="bi bi-wallet2"></i>' +
      tr('stats-fin-fund-balance', fundBalance + ' fund balance at year end', {
        amount: fundBalance,
      }) +
      '</span></div></div>';

    var labels = series.map(function (row) {
      return String(row.year);
    });
    var pick = function (key) {
      return series.map(function (row) {
        return row.period.income ? row.period.income[key] : null;
      });
    };

    var html =
      sectionHeader(
        'Public Finance',
        'Provincial income and receipts',
        'Where the Provincial Government of Albay\u2019s income comes from, from the statements of receipts and expenditures it files with the Bureau of Local Government Finance.',
        {
          tag: 'stats-fin-tag',
          heading: 'stats-fin-heading',
          blurb: 'stats-fin-blurb',
        }
      ) +
      '<div class="economy-grid">' +
      cards +
      '</div>' +
      '<div class="sectors-chart"><h4><i class="bi bi-bar-chart-fill"></i>' +
      tr(
        'stats-fin-receipts-by-source',
        'Receipts by source, per complete fiscal year (PHP millions)'
      ) +
      '</h4>' +
      canvasWrap(
        '',
        '<canvas id="incomeChart" data-i18n-aria="stats-fin-chart-aria" aria-label="Albay provincial receipts by source and fiscal year"></canvas>'
      ) +
      '</div>' +
      /* Split into three spans so the sentence keeps the live period value and
               the link to the budget page while each part stays translatable. */
      '<p role="status"><span' +
      i18nAttr('stats-fin-chart-note-a') +
      '>Only complete fiscal years are compared here. The most recent period on file is</span> ' +
      esc(fiscal._latest_period || '--') +
      '<span' +
      i18nAttr('stats-fin-chart-note-b') +
      '>, which covers half a year and is therefore left out of the chart; every period, including that one, is set out on the</span> ' +
      '<a href="../budget/"><span' +
      i18nAttr('stats-fin-budget-page-link') +
      '>budget and transparency page</span></a>.</p>' +
      '<p>' +
      tr(
        'stats-fin-amounts-note',
        'Amounts are the provincial government\u2019s own receipts, in PHP millions rounded to two decimal places. They do not include the income of Albay\u2019s cities and municipalities.'
      ) +
      '</p>' +
      sourceLine(
        'BLGF electronic Statements of Receipts and Expenditures \u2014 Provincial Government of Albay',
        'https://blgf.gov.ph/'
      );

    var container = setContent(section, html);
    if (!container) return;

    var incomeChart = makeChart(document.getElementById('incomeChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Raised locally',
            data: pick('local'),
            backgroundColor: '#1a5f2a',
          },
          {
            label: 'National transfers',
            data: pick('external'),
            backgroundColor: '#0d6efd',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { stacked: true },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: function (v) {
                return numberFormat.format(v);
              },
            },
          },
        },
      },
    });

    registerChartCopy(incomeChart, {
      datasets: ['stats-fin-legend-local', 'stats-fin-legend-national'],
    });

    observeReveal(container.querySelectorAll('.economy-card'));
  }

  /* ------------------------------------------------------------------ *
   * 5. Poverty statistics — PSA OpenSTAT full-year poverty tables
   * ------------------------------------------------------------------ */

  function renderPoverty(poverty) {
    var section = document.querySelector('.stats-poverty');
    if (!section) return;

    if (!poverty || !poverty.records || !poverty.records.length) {
      var fallbackHtml =
        sectionHeader(
          'Living Conditions',
          'Poverty statistics',
          'Poverty incidence for Albay\u2019s cities and municipalities is published by the Philippine Statistics Authority as a separate release, not as part of the census tables used elsewhere on this page.',
          {
            tag: 'stats-poverty-tag',
            heading: 'stats-poverty-heading',
            blurb: 'stats-poverty-blurb',
          }
        ) +
        '<p role="status">' +
        tr(
          'stats-poverty-not-ingested',
          'This project only publishes figures it can verify against a primary source. The official city and municipal poverty estimates are not yet ingested, so no poverty figure is shown here rather than an estimate of unknown provenance.'
        ) +
        '</p>' +
        '<p>' +
        '<a class="btn btn-primary" href="https://psa.gov.ph/statistics/poverty" target="_blank" rel="noopener noreferrer"><span' +
        i18nAttr('stats-psa-poverty-link') +
        '>PSA poverty statistics</span></a> ' +
        '<a class="btn btn-secondary" href="https://openstat.psa.gov.ph" target="_blank" rel="noopener noreferrer">PSA OpenSTAT</a>' +
        '</p>' +
        sourceLine(
          'Philippine Statistics Authority \u2014 Poverty statistics',
          'https://psa.gov.ph/statistics/poverty'
        );
      setContent(section, fallbackHtml);
      return;
    }

    var r2018 = poverty.records.find(function (r) { return r.year === 2018; }) || poverty.records[0];
    var r2021 = poverty.records.find(function (r) { return r.year === 2021; }) || poverty.records[1];
    var r2023 = poverty.records.find(function (r) { return r.year === 2023; }) || poverty.records[2];

    var change1821 = +(r2021.family_incidence_pct - r2018.family_incidence_pct).toFixed(1);
    var change2123 = +(r2023.family_incidence_pct - r2021.family_incidence_pct).toFixed(1);

    var cardsHtml =
      '<div class="poverty-comparison">' +
      '<div class="poverty-card">' +
      '<span class="poverty-year">2018</span>' +
      '<div class="poverty-rate"><span class="rate-value">' + dec(r2018.family_incidence_pct, 1) + '</span><span class="rate-symbol">%</span></div>' +
      '<div class="poverty-bar"><div class="poverty-fill" style="width:' + dec(r2018.family_incidence_pct, 1) + '%"></div></div>' +
      '<div class="poverty-ci">Threshold: ₱' + num(Math.round(r2018.per_capita_threshold_php)) + ' / cap</div>' +
      '<div class="poverty-ci">Population: ' + dec(r2018.population_incidence_pct, 1) + '%</div>' +
      '</div>' +
      '<div class="poverty-arrow" aria-hidden="true">' +
      '<i class="bi bi-arrow-right d-none d-md-block"></i>' +
      '<i class="bi bi-arrow-down d-md-none"></i>' +
      '<span class="poverty-change">' + (change1821 > 0 ? '+' : '') + change1821 + '%</span>' +
      '</div>' +
      '<div class="poverty-card">' +
      '<span class="poverty-year">2021</span>' +
      '<div class="poverty-rate"><span class="rate-value">' + dec(r2021.family_incidence_pct, 1) + '</span><span class="rate-symbol">%</span></div>' +
      '<div class="poverty-bar"><div class="poverty-fill" style="width:' + dec(r2021.family_incidence_pct, 1) + '%"></div></div>' +
      '<div class="poverty-ci">Threshold: ₱' + num(Math.round(r2021.per_capita_threshold_php)) + ' / cap</div>' +
      '<div class="poverty-ci">Population: ' + dec(r2021.population_incidence_pct, 1) + '%</div>' +
      '</div>' +
      '<div class="poverty-arrow" aria-hidden="true">' +
      '<i class="bi bi-arrow-right d-none d-md-block"></i>' +
      '<i class="bi bi-arrow-down d-md-none"></i>' +
      '<span class="poverty-change" style="color:var(--color-warning, #d97706)">' + (change2123 > 0 ? '+' : '') + change2123 + '%</span>' +
      '</div>' +
      '<div class="poverty-card poverty-card-2021 poverty-card-latest">' +
      '<div class="poverty-badge"><i class="bi bi-patch-check-fill"></i> Latest (2023)</div>' +
      '<span class="poverty-year">2023</span>' +
      '<div class="poverty-rate"><span class="rate-value">' + dec(r2023.family_incidence_pct, 1) + '</span><span class="rate-symbol">%</span></div>' +
      '<div class="poverty-bar"><div class="poverty-fill" style="width:' + dec(r2023.family_incidence_pct, 1) + '%"></div></div>' +
      '<div class="poverty-ci">Threshold: ₱' + num(Math.round(r2023.per_capita_threshold_php)) + ' / cap</div>' +
      '<div class="poverty-ci">95% CI: ' + dec(r2023.family_incidence_ci95_lower, 1) + '% \u2013 ' + dec(r2023.family_incidence_ci95_upper, 1) + '%</div>' +
      '</div>' +
      '</div>';

    var metricsGridHtml =
      '<div class="economy-grid" style="margin-top:32px">' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-wallet2"></i></div><div>' +
      '<div class="economy-value">₱' + num(Math.round(r2023.per_capita_threshold_php)) + '</div>' +
      '<div class="economy-label">Annual Per Capita Poverty Threshold, 2023</div>' +
      '<span class="economy-trend"><i class="bi bi-calendar3"></i>₱' + num(Math.round(r2023.per_capita_threshold_php / 12)) + ' per month per individual</span>' +
      '</div></div>' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-people-fill"></i></div><div>' +
      '<div class="economy-value">' + dec(r2023.population_incidence_pct, 1) + '%</div>' +
      '<div class="economy-label">Poverty Incidence among Population, 2023</div>' +
      '<span class="economy-trend"><i class="bi bi-info-circle"></i>Share of Albay residents below poverty line</span>' +
      '</div></div>' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-graph-down-arrow"></i></div><div>' +
      '<div class="economy-value">' + dec(r2023.poverty_gap_pct, 2) + '%</div>' +
      '<div class="economy-label">Poverty Gap Ratio, 2023</div>' +
      '<span class="economy-trend"><i class="bi bi-shield-check"></i>Income shortfall relative to poverty line</span>' +
      '</div></div>' +
      '<div class="economy-card"><div class="economy-icon"><i class="bi bi-check2-circle"></i></div><div>' +
      '<div class="economy-value">' + dec(r2023.family_incidence_cv, 1) + '%</div>' +
      '<div class="economy-label">Coefficient of Variation (Sample Precision)</div>' +
      '<span class="economy-trend"><i class="bi bi-patch-check"></i>High precision sample estimate (CV < 10%)</span>' +
      '</div></div>' +
      '</div>';

    var sourceHtml =
      sourceLine(
        'Philippine Statistics Authority (PSA) \u2014 OpenSTAT Poverty Statistics',
        poverty._source_url || 'https://openstat.psa.gov.ph'
      );

    var html =
      sectionHeader(
        'Living Conditions',
        'Poverty statistics',
        'Official per capita poverty threshold and family poverty incidence for the Province of Albay, drawn directly from the Philippine Statistics Authority (PSA) full-year poverty releases.',
        {
          tag: 'stats-poverty-tag',
          heading: 'stats-poverty-heading',
          blurb: 'stats-poverty-blurb',
        }
      ) +
      cardsHtml +
      metricsGridHtml +
      sourceHtml;

    var container = setContent(section, html);
    if (!container) return;
    observeReveal(container.querySelectorAll('.poverty-card, .economy-card'));
    animateBars(container);
  }

  /* ------------------------------------------------------------------ *
   * 6. Competitiveness index \u2014 tabbed CMCI dashboard
   * ------------------------------------------------------------------ */

  function pillarCard(key, pillar, cmci) {
    var meta = PILLAR_META[key];
    var label = (cmci.pillars && cmci.pillars[key]) || meta.short;
    var rankValue = pillar.rank == null ? '--' : pillar.rank;
    return (
      '<div class="cmci-pillar-card"><div class="pillar-icon"><i class="bi ' +
      meta.icon +
      '"></i></div><h4>' +
      esc(label) +
      '</h4><div class="pillar-score">' +
      dec(pillar.score, 2) +
      '</div><span class="pillar-trend trend-stable"><i class="bi bi-hash"></i>' +
      (pillar.category
        ? tr('stats-rank-in-category', 'Rank ' + rankValue + ' in ' + pillar.category, {
            rank: String(rankValue),
            category: pillar.category,
          })
        : tr('stats-rank-label', 'Rank ' + rankValue, { rank: String(rankValue) })) +
      '</span></div>'
    );
  }

  /**
   * Highest score any Albay LGU reached for each indicator code. CMCI indicator
   * scores are not all on a 0-100 scale, so bars are drawn relative to the
   * province's own best result instead of an assumed maximum.
   */
  function indicatorMaxima(cmci) {
    var max = {};
    (cmci.lgus || []).forEach(function (lgu) {
      PILLAR_ORDER.forEach(function (key) {
        var pillar = lgu.pillars && lgu.pillars[key];
        if (!pillar || !pillar.indicators) return;
        Object.keys(pillar.indicators).forEach(function (code) {
          var score = pillar.indicators[code].score;
          if (typeof score !== 'number' || !isFinite(score)) return;
          if (max[code] == null || score > max[code]) max[code] = score;
        });
      });
    });
    return max;
  }

  function indicatorCards(lgu, cmci, maxima) {
    var out = [];
    PILLAR_ORDER.forEach(function (key) {
      var pillar = lgu.pillars[key];
      if (!pillar || !pillar.indicators) return;
      Object.keys(pillar.indicators).forEach(function (code) {
        var ind = pillar.indicators[code];
        var meta = (cmci.indicators && cmci.indicators[code]) || {};
        var label = meta.label || code;
        var score = ind.score;
        var best = maxima[code];
        var pctWidth = 0;
        if (best > 0 && typeof score === 'number' && isFinite(score)) {
          pctWidth = Math.max(0, Math.min(100, (score / best) * 100));
        }
        out.push(
          '<div class="cmci-indicator-card">' +
            '<div class="indicator-header"><i class="bi ' +
            PILLAR_META[key].icon +
            '"></i>' +
            esc(label) +
            '</div>' +
            '<div class="indicator-value">' +
            dec(score, 4) +
            '</div>' +
            '<div class="indicator-bar"><div class="indicator-fill" data-width="' +
            pctWidth.toFixed(2) +
            '%" title="' +
            esc('Albay best: ' + dec(best, 4) + ' \u00B7 this LGU: ' + dec(score, 4)) +
            '"></div></div>' +
            '</div>'
        );
      });
    });
    return out.join('');
  }

  function renderCompetitive(pop, cmci) {
    var section = document.querySelector('.stats-competitive');
    if (!section) return;
    var container = containerOf(section);
    if (!container) return;

    var summary = pillarSummary(cmci);
    var lgus = cmci.lgus.slice().sort(function (a, b) {
      return b.overall.score - a.overall.score;
    });

    /* ---- tab bar: province overview + one tab per LGU ---- */
    var tabs = [
      '<button type="button" class="cmci-tab active" data-target="cmci-overview" aria-selected="true">' +
        '<i class="bi bi-map"></i><span' +
        i18nAttr('stats-province-overview') +
        '>Province overview</span></button>',
    ].concat(
      lgus.map(function (lgu, i) {
        return (
          '<button type="button" class="cmci-tab" data-target="cmci-' +
          esc(lgu.psgc_code || i) +
          '" aria-selected="false"><i class="bi bi-' +
          (lgu.type === 'city' ? 'buildings' : 'house') +
          '"></i>' +
          esc(lgu.name) +
          '</button>'
        );
      })
    );

    var panels = [
      '<div class="cmci-panel active" id="cmci-overview" role="tabpanel">' +
        buildOverviewPanel(lgus, summary, cmci) +
        '</div>',
    ].concat(
      lgus.map(function (lgu, i) {
        return (
          '<div class="cmci-panel" id="cmci-' +
          esc(lgu.psgc_code || i) +
          '" role="tabpanel" data-lgu="' +
          esc(lgu.psgc_code || i) +
          '"></div>'
        );
      })
    );

    var html =
      sectionHeader(
        'Competitiveness',
        'Cities and Municipalities Competitiveness Index',
        'Albay\u2019s 18 LGUs scored against five pillars and 50 indicators in the ' +
          cmci.year +
          ' CMCI, published by the Department of Trade and Industry.',
        {
          tag: 'stats-competitive-tag',
          heading: 'stats-competitive-heading',
          blurb: 'stats-competitive-blurb',
          blurbParams: { year: String(cmci.year) },
        }
      ) +
      '<div class="cmci-tabs" role="tablist">' +
      tabs.join('') +
      '</div>' +
      panels.join('') +
      sourceLine(
        'DTI Cities and Municipalities Competitiveness Index',
        cmci._source_url || 'https://cmci.dti.gov.ph/'
      ) +
      '<p class="data-source"><i class="bi bi-info-circle" aria-hidden="true"></i>' +
      tr(
        'stats-ranks-within-class-note',
        'Ranks shown are within each LGU\u2019s own LGU class (city or municipality class), not national rank, because CMCI ranks LGUs separately by class.'
      ) +
      '</p>';

    container.innerHTML = html;

    /* ---- tab behaviour + lazy panel population ---- */
    var maxima = indicatorMaxima(cmci);
    var rendered = {};
    function populate(panel) {
      if (!panel || rendered[panel.id]) return;
      var code = panel.getAttribute('data-lgu');
      var lgu = cmci.lgus.find(function (l) {
        return (l.psgc_code || '') === code;
      });
      if (!lgu) return;
      var pillarCards = PILLAR_ORDER.map(function (key) {
        var pillar = lgu.pillars[key];
        if (!pillar) return '';
        var withCat = Object.assign({}, pillar, {
          category: lgu.category || lgu.type,
        });
        return pillarCard(key, withCat, cmci);
      }).join('');

      panel.innerHTML =
        '<div class="cmci-overview-grid">' +
        pillarCards +
        '</div>' +
        '<div class="cmci-indicator-grid">' +
        indicatorCards(lgu, cmci, maxima) +
        '</div>' +
        '<div class="cmci-chart-container"><h4><i class="bi bi-radar"></i>' +
        esc(lgu.name) +
        ' ' +
        tr('stats-pillar-profile-vs-average', 'pillar profile vs. the Albay average') +
        '</h4>' +
        '<div class="chart-wrapper"><canvas id="' +
        panel.id +
        '-chart" data-i18n-aria="stats-pillar-profile-aria" aria-label="Pillar profile"></canvas></div></div>' +
        '<p class="data-source"><i class="bi bi-trophy" aria-hidden="true"></i>' +
        tr(
          'stats-overall-score-rank',
          'Overall score ' +
            dec(lgu.overall.score, 4) +
            ' \u2014 rank ' +
            lgu.overall.rank +
            ' among ' +
            lgu.category +
            ' LGUs. Provincial rank ' +
            lgu.province_rank +
            ' of ' +
            cmci.total_lgus +
            '. Mayor: ' +
            (lgu.mayor || 'not stated') +
            '.',
          {
            score: dec(lgu.overall.score, 4),
            rank: String(lgu.overall.rank),
            category: String(lgu.category),
            provinceRank: String(lgu.province_rank),
            total: String(cmci.total_lgus),
            /* A mayor's name is a proper noun and is never translated; only the
                           'not stated' fallback has a translation. */
            mayor: lgu.mayor || chartText('stats-not-stated', 'not stated'),
          }
        ) +
        '</p>';

      var averages = PILLAR_ORDER.map(function (key) {
        return summary.totals[key] / Math.max(1, cmci.lgus.length);
      });
      var own = PILLAR_ORDER.map(function (key) {
        return (lgu.pillars[key] && lgu.pillars[key].score) || 0;
      });

      var radarChart = makeChart(document.getElementById(panel.id + '-chart'), {
        type: 'radar',
        data: {
          labels: PILLAR_ORDER.map(function (key) {
            return summary.label(key);
          }),
          datasets: [
            {
              label: lgu.name,
              data: own,
              borderColor: '#1a5f2a',
              backgroundColor: 'rgba(26,95,42,0.2)',
              pointBackgroundColor: '#1a5f2a',
            },
            {
              label: 'Albay average',
              data: averages,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.12)',
              pointBackgroundColor: '#3b82f6',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              ticks: { backdropColor: 'transparent', font: { size: 9 } },
            },
          },
        },
      });

      registerChartCopy(radarChart, {
        datasets: [null, 'stats-albay-average'],
      });

      animateBars(panel);
      observeReveal(panel.querySelectorAll('.cmci-pillar-card, .cmci-indicator-card'));
      rendered[panel.id] = true;
    }

    function selectTab(target) {
      container.querySelectorAll('.cmci-tab').forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      var tab = container.querySelector('.cmci-tab[data-target="' + target + '"]');
      if (tab) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      }
      container.querySelectorAll('.cmci-panel').forEach(function (p) {
        p.classList.remove('active');
      });
      var panel = document.getElementById(target);
      if (panel) {
        panel.classList.add('active');
        populate(panel);
        rollNumbersIn(panel, true);
      }
      return !!panel;
    }

    container.querySelectorAll('.cmci-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        selectTab(tab.getAttribute('data-target'));
      });
    });

    /* Deep links from the LGU directory: /statistics/#cmci-050506000 */
    if (window.location.hash) {
      var wanted = window.location.hash.replace(/^#/, '');
      if (wanted && wanted !== 'cmci-overview' && document.getElementById(wanted)) {
        if (selectTab(wanted)) {
          window.requestAnimationFrame(function () {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      }
    }

    /* overview chart */
    var overviewChart = makeChart(document.getElementById('cmci-overview-chart'), {
      type: 'bar',
      data: {
        labels: lgus.map(function (l) {
          return l.name;
        }),
        datasets: [
          {
            label: 'Overall CMCI score',
            data: lgus.map(function (l) {
              return l.overall.score;
            }),
            backgroundColor: lgus.map(function (_, i) {
              return PALETTE[i % PALETTE.length];
            }),
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: function (ctx) {
                var l = lgus[ctx.dataIndex];
                return chartText(
                  'stats-rank-in-class',
                  l.category + ' \u2014 rank ' + l.overall.rank + ' in class',
                  { category: String(l.category), rank: String(l.overall.rank) }
                );
              },
            },
          },
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'CMCI score' } },
        },
      },
    });

    registerChartCopy(overviewChart, {
      datasets: ['stats-overall-cmci-score'],
      axes: [{ scale: 'y', key: 'stats-cmci-score-axis' }],
    });

    animateBars(container);
    observeReveal(container.querySelectorAll('.cmci-pillar-card, .cmci-indicator-card'));
  }

  function buildOverviewPanel(lgus, summary, cmci) {
    var lguCount = Math.max(1, lgus.length);
    var pillarCards = PILLAR_ORDER.map(function (key) {
      var best = summary.best[key];
      return (
        '<div class="cmci-pillar-card"><div class="pillar-icon"><i class="bi ' +
        PILLAR_META[key].icon +
        '"></i></div><h4>' +
        esc(summary.label(key)) +
        '</h4><div class="pillar-score">' +
        dec(summary.totals[key] / lguCount, 2) +
        '</div><span class="pillar-trend trend-up"><i class="bi bi-trophy"></i>' +
        esc(best ? best.lgu : '--') +
        '</span></div>'
      );
    }).join('');

    var lguCards = lgus
      .map(function (l, i) {
        var width = Math.min(100, (l.overall.score / 100) * 100);
        return (
          '<div class="cmci-indicator-card">' +
          '<div class="indicator-header"><i class="bi bi-building"></i>' +
          esc(l.name) +
          '</div>' +
          '<div class="indicator-value">' +
          dec(l.overall.score, 2) +
          '</div>' +
          '<div class="indicator-bar"><div class="indicator-fill" data-width="' +
          width.toFixed(2) +
          '%"></div></div>' +
          '<p class="data-source" style="margin-top:8px;text-align:left">' +
          tr('stats-rank-in-class', l.category + ' \u2014 rank ' + l.overall.rank + ' in class', {
            category: String(l.category),
            rank: String(l.overall.rank),
          }) +
          '</p>' +
          '</div>'
        );
      })
      .join('');

    return (
      '<div class="cmci-overview-grid">' +
      pillarCards +
      '</div>' +
      '<div class="cmci-chart-container"><h4><i class="bi bi-bar-chart-fill"></i>' +
      tr(
        'stats-overall-competitiveness-all-lgus',
        'Overall competitiveness score, all 18 Albay LGUs'
      ) +
      '</h4>' +
      '<div class="chart-wrapper"><canvas id="cmci-overview-chart" data-i18n-aria="stats-overview-chart-aria" aria-label="Overall CMCI score by LGU"></canvas></div></div>' +
      '<h4 class="cmci-chart-container" style="border:0;background:transparent;padding:24px 0 0"><i class="bi bi-list-ol"></i>' +
      tr('stats-score-class-rank-labour', 'Score, class rank and labour force indicators by LGU') +
      '</h4>' +
      '<div class="cmci-indicator-grid">' +
      lguCards +
      '</div>'
    );
  }

  /* ------------------------------------------------------------------ *
   * 7. Population bar chart + full barangay list
   * ------------------------------------------------------------------ */

  function renderBarChart(pop) {
    var section = document.querySelector('.stats-barchart');
    if (!section) return;
    var barangays = allBarangays(pop).sort(function (a, b) {
      return b.population_2024 - a.population_2024;
    });
    var top = barangays.slice(0, 20);
    var max = top[0] ? top[0].population_2024 : 1;

    var list = top
      .map(function (b, i) {
        return (
          '<div class="barangay-row" data-rank="' +
          (i + 1) +
          '"><span class="rank">#' +
          (i + 1) +
          '</span>' +
          '<span class="name" title="' +
          esc(b.lgu) +
          '">' +
          esc(b.name) +
          '</span>' +
          '<span class="bar-wrap"><span class="bar" data-width="' +
          ((b.population_2024 / max) * 100).toFixed(1) +
          '%"></span></span>' +
          '<span class="pop">' +
          num(b.population_2024) +
          '</span></div>'
        );
      })
      .join('');

    var barangayCount = num(pop.total_barangays);
    var html =
      sectionHeader(
        'Barangays',
        'The 20 most populous barangays',
        'Of Albay\u2019s ' +
          barangayCount +
          ' barangays, these had the largest 2024 Census populations.',
        {
          tag: 'stats-barchart-tag',
          heading: 'stats-barchart-heading',
          blurb: 'stats-barchart-blurb',
          blurbParams: { count: barangayCount },
        }
      ) +
      canvasWrap(
        'chart-wrapper-bar',
        '<canvas id="brgyChart" data-i18n-aria="stats-barchar-chart-aria" aria-label="Top 20 barangays by 2024 population"></canvas>'
      ) +
      '<div class="distribution-list" style="margin-top:32px">' +
      list +
      '</div>' +
      buildFullList(barangays) +
      sourceLine(
        'Philippine Statistics Authority \u2014 2024 Census of Population',
        'https://openstat.psa.gov.ph'
      );

    var container = setContent(section, html);
    if (!container) return;

    var brgyChart = makeChart(document.getElementById('brgyChart'), {
      type: 'bar',
      data: {
        labels: top.map(function (b) {
          return b.name;
        }),
        datasets: [
          {
            label: '2024 population',
            data: top.map(function (b) {
              return b.population_2024;
            }),
            backgroundColor: '#1a5f2a',
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: function (ctx) {
                var b = top[ctx.dataIndex];
                var people = numberFormat.format(b.population_2024);
                var homes = numberFormat.format(b.households_2024 || 0);
                return chartText(
                  'stats-barangay-tooltip',
                  b.lgu + ' \u2014 ' + people + ' persons, ' + homes + ' households',
                  { lgu: b.lgu, population: people, households: homes }
                );
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function (v) {
                return numberFormat.format(v);
              },
            },
          },
          y: { ticks: { font: { size: 11 } } },
        },
      },
    });

    registerChartCopy(brgyChart, {
      datasets: ['stats-2024-population'],
    });

    observeReveal(container.querySelectorAll('.barangay-row'));
    animateBars(container);
  }

  /**
   * Full 720-barangay table inside a <details>, built on first open so the
   * initial page load stays light.
   */
  function buildFullList(barangays) {
    /* The count travels as an interpolation value rather than sitting inside the
           translation: a hard-coded count in the table would overwrite the real one
           on any language change, and a translation must never override a figure. */
    var count = num(barangays.length);
    return (
      '<details class="more-barangays"><summary' +
      i18nAttr('stats-view-all-barangays', { count: count }) +
      '>' +
      'View all ' +
      count +
      ' barangays</summary>' +
      '<div class="distribution-list-full" data-full-list hidden></div>' +
      '</details>'
    );
  }

  function wireFullList(pop) {
    var details = document.querySelector('.more-barangays');
    if (!details) return;
    var target = details.querySelector('[data-full-list]');
    if (!target) return;
    var built = false;
    details.addEventListener('toggle', function () {
      if (!details.open || built) return;
      built = true;
      var byLgu = {};
      allBarangays(pop).forEach(function (b) {
        if (!byLgu[b.lgu]) byLgu[b.lgu] = [];
        byLgu[b.lgu].push(b);
      });
      var html = pop.lgus
        .map(function (l) {
          var rows = (byLgu[l.name] || []).slice().sort(function (a, b) {
            return b.population_2024 - a.population_2024;
          });
          var lguMax = rows.length ? rows[0].population_2024 : 1;
          var body = rows
            .map(function (b, i) {
              return (
                '<div class="barangay-row"><span class="rank">#' +
                (i + 1) +
                '</span><span class="name">' +
                esc(b.name) +
                (b.is_poblacion ? ' <span class="metric-source">(poblacion)</span>' : '') +
                '</span><span class="bar-wrap"><span class="bar" data-width="' +
                ((b.population_2024 / lguMax) * 100).toFixed(1) +
                '%"></span></span><span class="pop">' +
                num(b.population_2024) +
                '</span></div>'
              );
            })
            .join('');
          return (
            '<h4 style="margin:28px 0 10px;font-size:1rem">' +
            esc(l.name) +
            ' <span style="font-weight:400;color:var(--color-text-light);font-size:0.875rem">' +
            esc(classLabel(l.type)) +
            ' \u2014 ' +
            num(l.barangay_count) +
            ' barangays, ' +
            num(l.population_2024) +
            ' residents (2024)</span></h4>' +
            body
          );
        })
        .join('');
      target.innerHTML = html;
      target.hidden = false;
      animateBars(target);
      observeReveal(target.querySelectorAll('.barangay-row'));
    });
  }

  /* ------------------------------------------------------------------ *
   * boot
   * ------------------------------------------------------------------ */

  function boot() {
    /* preserve existing behaviour: reveal scroll-animated sections */
    observeReveal(document.querySelectorAll('.animate-on-scroll'));

    var results = {};

    fetchJson('population_2024.json')
      .then(function (pop) {
        results.pop = pop;
        renderMetrics(pop);
        renderTrends(pop);
        renderDistribution(pop);
        renderBarChart(pop);
        wireFullList(pop);
        return fetchJson('cmci_2024.json');
      })
      .then(function (cmci) {
        results.cmci = cmci;
        return Promise.all([
          fetchJson('economic_accounts.json').catch(function () { return null; }),
          fetchJson('cpi_inflation.json').catch(function () { return null; }),
          fetchJson('agriculture_palay.json').catch(function () { return null; }),
        ]).then(function (extra) {
          results.econ = extra[0];
          results.cpi = extra[1];
          results.agri = extra[2];
          if (results.pop) {
            renderEconomy(results.pop, cmci, results.econ, results.cpi, results.agri);
            renderCompetitive(results.pop, cmci);
          }
        });
      })
      .catch(function (err) {
        /* keep the server-rendered fallback text, make the reason visible */
        document
          .querySelectorAll('.stats-trends, .stats-distribution, .stats-barchart')
          .forEach(function (s) {
            showError(
              s,
              'This dashboard could not load its verified dataset (' +
                err.message +
                '). No figures are shown rather than unverified ones.',
              'stats-load-failed',
              { file: String(err.message) }
            );
          });
        if (window.console && console.warn) {
          console.warn('[statistics-data] load failed:', err);
        }
      })
      .then(function () {
        return fetchJson('poverty_statistics.json')
          .then(function (poverty) {
            renderPoverty(poverty);
          })
          .catch(function () {
            renderPoverty(null);
          });
      })
      .then(function () {
        /* let the i18n engine translate anything that arrived after load */
        if (window.TranslationEngine && TranslationEngine.applyTranslations) {
          try {
            TranslationEngine.applyTranslations(TranslationEngine.getCurrentLanguage());
          } catch (e) {
            /* non-fatal */
          }
        }
        /* Chart.js paints its legends and axis titles into a canvas, where the
                   engine cannot reach them. Relabel them now, and on every later switch. */
        translateCharts();
        document.addEventListener('languageChanged', translateCharts);
      });

    /* Fetched separately so a missing receipts file cannot blank the census
           sections, and a missing census file cannot blank the receipts section. */
    fetchJson('fiscal_transparency.json')
      .then(function (fiscal) {
        renderFinance(fiscal);
      })
      .catch(function (err) {
        var section = document.querySelector('.stats-finance');
        if (section) {
          setContent(
            section,
            sectionHeader(
              'Public Finance',
              'Provincial income and receipts',
              'Receipts and expenditures of the Provincial Government of Albay, as reported to the Bureau of Local Government Finance.',
              {
                tag: 'stats-fin-tag',
                heading: 'stats-fin-heading',
                blurb: 'stats-fin-blurb-empty',
              }
            ) +
              '<p role="status"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i> ' +
              tr(
                'stats-fin-load-failed',
                'The verified receipts dataset could not be loaded (' +
                  err.message +
                  '). No income figure is shown here rather than an unverified one.',
                { file: String(err.message) }
              ) +
              '</p>' +
              sourceLine('Bureau of Local Government Finance', 'https://blgf.gov.ph/')
          );
        }
        if (window.console && console.warn) {
          console.warn('[statistics-data] fiscal load failed:', err);
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
