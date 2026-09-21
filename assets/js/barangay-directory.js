/**
 * BetterAlbay — Barangay directory renderer
 *
 * Renders the complete list of barangays in the Province of Albay from the
 * verified PSA dataset in `data/population_2024.json` and provides
 * client-side search, filtering, sorting, paging and CSV export.
 *
 * Every figure shown comes straight from the Philippine Statistics Authority
 * 2024 Census of Population. Nothing is estimated or synthesised: if a value
 * is absent in the source it is rendered as "--".
 *
 * Expected markup (see government/barangays.html):
 *   [data-brgy-root]                  wrapper; renderer no-ops when missing
 *   #brgy-search                      text input
 *   #brgy-lgu                         <select> of LGUs (populated here)
 *   #brgy-type                        <select> all|city|municipality
 *   #brgy-pob                         checkbox - poblacion barangays only
 *   #brgy-reset                       button
 *   #brgy-count                       result summary
 *   #brgy-body                        row container
 *   #brgy-more                        "show more" button (optional)
 *   #brgy-empty                       empty state (optional)
 *   [data-sort]                       sort buttons in the table head
 */

(function () {
  'use strict';

  var DATA_URL = '../data/population_2024.json';
  var PAGE_STEP = 120;
  var DEBOUNCE_MS = 130;

  var SORT_KEYS = { pop: 1, name: 1, lgu: 1 };

  /**
   * Population is the natural default ranking; the other two keys are
   * alphabetical so they only ever run ascending.
   */
  var SORT_DEFAULT_DIR = { pop: -1, name: 1, lgu: 1 };

  /* ---------------------------------------------------------------- *
   * Formatting helpers
   * ---------------------------------------------------------------- */

  function fmtInt(n) {
    if (n === null || n === undefined || n === '' || isNaN(n)) return '--';
    return Number(n).toLocaleString('en-PH');
  }

  function fmtDec(n, places) {
    if (n === null || n === undefined || n === '' || isNaN(n)) return '--';
    return Number(n).toLocaleString('en-PH', {
      minimumFractionDigits: places,
      maximumFractionDigits: places,
    });
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------------------------------------------------------- *
   * State
   * ---------------------------------------------------------------- */

  var state = {
    all: [],
    filtered: [],
    visible: PAGE_STEP,
    query: '',
    lgu: '',
    type: 'all',
    pob: false,
    sortKey: 'pop',
    sortDir: -1,
  };

  var el = {};

  function cacheEls() {
    el.search = document.getElementById('brgy-search');
    el.lgu = document.getElementById('brgy-lgu');
    el.type = document.getElementById('brgy-type');
    el.pob = document.getElementById('brgy-pob');
    el.reset = document.getElementById('brgy-reset');
    el.count = document.getElementById('brgy-count');
    el.body = document.getElementById('brgy-body');
    el.more = document.getElementById('brgy-more');
    el.empty = document.getElementById('brgy-empty');
    el.csv = document.getElementById('brgy-csv');
  }

  /* ---------------------------------------------------------------- *
   * Data loading
   * ---------------------------------------------------------------- */

  function flatten(pop) {
    var rows = [];
    (pop.lgus || []).forEach(function (lgu) {
      (lgu.barangays || []).forEach(function (b) {
        rows.push({
          name: b.name,
          psgc: b.psgc_code || '',
          psgc10: b.psgc_10digit || '',
          poblacion: !!b.is_poblacion,
          pop2015: b.population_2015,
          pop2020: b.population_2020,
          pop2024: b.population_2024,
          hhPop2024: b.household_population_2024,
          hh2024: b.households_2024,
          lgu: lgu.name,
          lguType: lgu.type,
          lguClass: lgu.official_name || lgu.name,
          capital: !!lgu.is_capital,
          _name: String(b.name).toLowerCase(),
          _lgu: String(lgu.name).toLowerCase(),
        });
      });
    });
    return rows;
  }

  /* ---------------------------------------------------------------- *
   * Filtering, sorting
   * ---------------------------------------------------------------- */

  function applyFilters() {
    var q = state.query;
    var ql = q.toLowerCase();

    state.filtered = state.all.filter(function (r) {
      if (state.lgu && r.lgu !== state.lgu) return false;
      if (state.type === 'city' && r.lguType !== 'city') return false;
      if (state.type === 'municipality' && r.lguType !== 'municipality') return false;
      if (state.pob && !r.poblacion) return false;
      if (ql && r._name.indexOf(ql) === -1 && r._lgu.indexOf(ql) === -1) return false;
      return true;
    });

    var dir = state.sortDir;
    var key = state.sortKey;

    state.filtered.sort(function (a, b) {
      if (key === 'name') return dir * a.name.localeCompare(b.name);
      if (key === 'lgu') {
        var byLgu = a.lgu.localeCompare(b.lgu);
        if (byLgu !== 0) return dir * byLgu;
        return b.pop2024 - a.pop2024;
      }
      var av = a.pop2024 === null || a.pop2024 === undefined ? -1 : a.pop2024;
      var bv = b.pop2024 === null || b.pop2024 === undefined ? -1 : b.pop2024;
      if (av === bv) return a.name.localeCompare(b.name);
      return dir * (av - bv);
    });
  }

  /* ---------------------------------------------------------------- *
   * Rendering
   * ---------------------------------------------------------------- */

  function lguCell(r) {
    return (
      '<span class="brgy-col-lgu">' +
      esc(r.lgu) +
      (r.capital ? ' <span class="pill pill-capital">Capital</span>' : '') +
      '</span>'
    );
  }

  function nameCell(r) {
    return (
      '<span class="brgy-col-name brgy-name">' +
      esc(r.name) +
      (r.poblacion ? '<span class="pill pill-pob">Poblacion</span>' : '') +
      '</span>'
    );
  }

  function rowHtml(r) {
    return (
      '<div class="dir-row brgy-row">' +
      lguCell(r) +
      nameCell(r) +
      '<span class="brgy-col-pop num">' +
      fmtInt(r.pop2024) +
      '</span>' +
      '<span class="brgy-col-hh num">' +
      fmtInt(r.hh2024) +
      '</span>' +
      '<span class="brgy-col-code num"><span class="pill pill-code">' +
      esc(r.psgc10 || r.psgc) +
      '</span></span>' +
      '</div>'
    );
  }

  function render() {
    var total = state.all.length;
    var shown = Math.min(state.visible, state.filtered.length);
    var slice = state.filtered.slice(0, shown);
    var residents = state.filtered.reduce(function (sum, r) {
      return sum + (r.pop2024 || 0);
    }, 0);
    var households = state.filtered.reduce(function (sum, r) {
      return sum + (r.hh2024 || 0);
    }, 0);

    if (el.body) el.body.innerHTML = slice.map(rowHtml).join('');

    if (el.count) {
      el.count.innerHTML =
        'Showing <strong>' +
        fmtInt(shown) +
        '</strong> of <strong>' +
        fmtInt(state.filtered.length) +
        '</strong> barangay' +
        (state.filtered.length === 1 ? '' : 's') +
        (state.filtered.length !== total ? ' (filtered from ' + fmtInt(total) + ')' : '') +
        ' &middot; ' +
        fmtInt(residents) +
        ' residents &middot; ' +
        fmtInt(households) +
        ' households (2024 Census)';
    }

    if (el.more) {
      el.more.hidden = shown >= state.filtered.length;
      el.more.textContent =
        shown >= state.filtered.length
          ? ''
          : 'Show ' +
            fmtInt(Math.min(PAGE_STEP, state.filtered.length - shown)) +
            ' more of ' +
            fmtInt(state.filtered.length - shown) +
            ' remaining';
    }

    if (el.empty) el.empty.hidden = state.filtered.length !== 0;

    // Reflect sort direction on the header buttons.
    var wrap = document.querySelector('[data-brgy-root]');
    if (wrap) {
      Array.prototype.forEach.call(wrap.querySelectorAll('[data-sort]'), function (btn) {
        var key = btn.getAttribute('data-sort');
        var on = key === state.sortKey;
        btn.classList.toggle('is-active', on);
        var arrow = btn.querySelector('.bi');
        if (arrow)
          arrow.className =
            'bi ' + (on && state.sortDir === 1 ? 'bi-sort-down-alt' : 'bi-sort-down');
      });
    }
  }

  function refresh(keepPage) {
    applyFilters();
    if (!keepPage) state.visible = PAGE_STEP;
    render();
  }

  /* ---------------------------------------------------------------- *
   * Interaction
   * ---------------------------------------------------------------- */

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function csv() {
    var head = [
      'PSGC',
      'LGU',
      'Type',
      'Barangay',
      'Poblacion',
      'Population 2015',
      'Population 2020',
      'Population 2024',
      'Household population 2024',
      'Households 2024',
    ];
    var lines = [head.join(',')];
    state.filtered.forEach(function (r) {
      lines.push(
        [
          r.psgc10 || r.psgc,
          '"' + String(r.lgu).replace(/"/g, '""') + '"',
          r.lguType,
          '"' + String(r.name).replace(/"/g, '""') + '"',
          r.poblacion ? 'yes' : 'no',
          r.pop2015 === null || r.pop2015 === undefined ? '' : r.pop2015,
          r.pop2020 === null || r.pop2020 === undefined ? '' : r.pop2020,
          r.pop2024 === null || r.pop2024 === undefined ? '' : r.pop2024,
          r.hhPop2024 === null || r.hhPop2024 === undefined ? '' : r.hhPop2024,
          r.hh2024 === null || r.hh2024 === undefined ? '' : r.hh2024,
        ].join(',')
      );
    });
    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'albay-barangays-2024-census.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function wire() {
    var wrap = document.querySelector('[data-brgy-root]');
    if (!wrap) return;

    if (el.search) {
      el.search.addEventListener(
        'input',
        debounce(function () {
          state.query = el.search.value.trim();
          refresh();
        }, DEBOUNCE_MS)
      );
    }

    if (el.lgu) {
      el.lgu.addEventListener('change', function () {
        state.lgu = el.lgu.value;
        refresh();
      });
    }

    if (el.type) {
      el.type.addEventListener('change', function () {
        state.type = el.type.value;
        refresh();
      });
    }

    if (el.pob) {
      el.pob.addEventListener('change', function () {
        state.pob = el.pob.checked;
        refresh();
      });
    }

    if (el.reset) {
      el.reset.addEventListener('click', function () {
        if (el.search) el.search.value = '';
        if (el.lgu) el.lgu.value = '';
        if (el.type) el.type.value = 'all';
        if (el.pob) el.pob.checked = false;
        state.query = '';
        state.lgu = '';
        state.type = 'all';
        state.pob = false;
        refresh();
      });
    }

    if (el.more) {
      el.more.addEventListener('click', function () {
        state.visible += PAGE_STEP;
        render();
      });
    }

    if (el.csv) el.csv.addEventListener('click', csv);

    Array.prototype.forEach.call(wrap.querySelectorAll('[data-sort]'), function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-sort');
        if (key === state.sortKey && key === 'pop') {
          // Population is the only column that is meaningful in both directions.
          state.sortDir = -state.sortDir;
        } else {
          state.sortKey = SORT_KEYS[key] ? key : 'pop';
          state.sortDir = SORT_DEFAULT_DIR[state.sortKey];
        }
        refresh();
      });
    });
  }

  /* ---------------------------------------------------------------- *
   * Boot
   * ---------------------------------------------------------------- */

  function fillLguOptions(pop) {
    if (!el.lgu) return;
    var opts = ['<option value="">All LGUs and cities</option>'];
    (pop.lgus || []).forEach(function (l) {
      opts.push(
        '<option value="' +
          esc(l.name) +
          '">' +
          esc(l.name) +
          ' (' +
          (l.type === 'city' ? 'City' : 'Municipality') +
          ', ' +
          fmtInt(l.barangay_count) +
          ')</option>'
      );
    });
    el.lgu.innerHTML = opts.join('');
  }

  /**
   * The LGU directory links here with ?lgu=<name> so people can jump straight
   * from a city or municipality card to that LGU's barangays.
   */
  function applyQueryParam() {
    if (!el.lgu) return;
    var wanted = null;
    try {
      wanted = new URLSearchParams(window.location.search).get('lgu');
    } catch (e) {
      return;
    }
    if (!wanted) return;
    var match = null;
    Array.prototype.forEach.call(el.lgu.options, function (opt) {
      if (opt.value && opt.value.toLowerCase() === wanted.toLowerCase()) match = opt.value;
    });
    if (match) {
      el.lgu.value = match;
      state.lgu = match;
    }
  }

  function fillStats(pop) {
    var t = pop.province_totals || {};
    var set = function (id, value) {
      var n = document.getElementById(id);
      if (n) n.textContent = value;
    };
    var avgSize =
      t.households_2024 && t.household_population_2024
        ? t.household_population_2024 / t.households_2024
        : null;
    set('brgy-stat-count', fmtInt(pop.total_barangays));
    set('brgy-stat-pop', fmtInt(t.population_2024));
    set('brgy-stat-hh', fmtInt(t.households_2024));
    set('brgy-stat-lgu', fmtInt(pop.lgu_count));
    set('brgy-stat-size', fmtDec(avgSize, 2));
  }

  function boot() {
    cacheEls();
    var wrap = document.querySelector('[data-brgy-root]');
    if (!wrap) return;
    wire();

    fetch(DATA_URL, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (pop) {
        if (pop._status && pop._status !== 'verified') {
          throw new Error('Dataset is not marked verified.');
        }
        state.all = flatten(pop);
        fillLguOptions(pop);
        fillStats(pop);
        applyQueryParam();
        refresh();
      })
      .catch(function (err) {
        if (el.body) {
          el.body.innerHTML =
            '<div class="dir-empty"><i class="bi bi-exclamation-triangle"></i>' +
            'Barangay data could not be loaded (' +
            esc(err.message) +
            ').</div>';
        }
        if (el.count) el.count.textContent = '';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
