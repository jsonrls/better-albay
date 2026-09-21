/**
 * BetterAlbay — Local Government Unit directory
 *
 * Renders the 18 cities and municipalities of the Province of Albay by
 * joining two verified datasets:
 *
 *   data/population_2024.json  PSA 2024 Census of Population (land area,
 *                              population, households, barangay counts)
 *   data/cmci_2024.json        DTI Cities and Municipalities Competitiveness
 *                              Index 2024 (income/legal class, mayor,
 *                              office address, contact details, rankings)
 *
 * Only values that exist in a source are rendered. Contact details that the
 * source records as unavailable ("NDA", "N/A") are omitted rather than shown
 * as blank placeholders.
 *
 * Expected markup (see government/index.html):
 *   [data-lgu-root]   wrapper; renderer no-ops when missing
 *   #lgu-grid         card container
 *   #lgu-search       text input
 *   #lgu-type         <select> all|city|municipality
 *   #lgu-sort         <select>
 *   #lgu-count        result summary
 *   #lgu-reset        button
 *   #lgu-stat-*       stat strip values
 */

(function () {
  'use strict';

  var POP_URL = '../data/population_2024.json';
  var CMCI_URL = '../data/cmci_2024.json';
  var DEBOUNCE_MS = 130;

  var SORTS = {
    'rank-asc': function (a, b) {
      return (a.provinceRank || 99) - (b.provinceRank || 99);
    },
    'pop-desc': function (a, b) {
      return (b.pop2024 || 0) - (a.pop2024 || 0);
    },
    'name-asc': function (a, b) {
      return a.name.localeCompare(b.name);
    },
    'brgy-desc': function (a, b) {
      return (b.barangayCount || 0) - (a.barangayCount || 0);
    },
  };

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

  /**
   * CMCI records the LGU website as free text: some entries hold notes
   * instead of a URL, and most municipal entries point at a Facebook page
   * rather than a government site. Only treat a value as a link when it
   * looks like a host name, and label social pages honestly.
   */
  var SOCIAL_LABELS = [
    [/^(www\.)?(facebook|fb)\.com$/i, 'Facebook', 'bi-facebook'],
    [/^fb\.me$/i, 'Facebook', 'bi-facebook'],
    [/^(www\.)?instagram\.com$/i, 'Instagram', 'bi-instagram'],
    [/^ig\.me$/i, 'Instagram', 'bi-instagram'],
    [/^(www\.)?(twitter|x)\.com$/i, 'X', 'bi-twitter-x'],
    [/^(www\.)?youtube\.com$/i, 'YouTube', 'bi-youtube'],
    [/^youtu\.be$/i, 'YouTube', 'bi-youtube'],
  ];

  function website(value) {
    if (!value) return null;
    var v = String(value).trim();
    if (!/^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(v)) return null;
    var url = /^https?:\/\//i.test(v) ? v : 'https://' + v;
    var host = url
      .replace(/^https?:\/\//i, '')
      .split(/[/?#]/)[0]
      .toLowerCase();
    for (var i = 0; i < SOCIAL_LABELS.length; i++) {
      if (SOCIAL_LABELS[i][0].test(host)) {
        return { url: url, label: SOCIAL_LABELS[i][1], icon: SOCIAL_LABELS[i][2] };
      }
    }
    return { url: url, label: 'Website', icon: 'bi-globe2' };
  }

  /**
   * CMCI writes "Tel: 052-487-5196", "Tel: NDA", and at least one
   * placeholder ("09170000000"). Keep only values a resident could dial.
   */
  function phone(value) {
    if (!value) return null;
    var v = String(value)
      .replace(/^\s*(tel|telephone|contact)\s*:?\s*/i, '')
      .trim();
    if (!v || /^(nda|n\/a|na|none|-+)$/i.test(v)) return null;
    var digits = v.replace(/\D/g, '');
    if (digits.length < 7) return null;
    if (/(\d)\1{4,}/.test(digits)) return null;
    return v;
  }

  /* ---------------------------------------------------------------- *
   * State
   * ---------------------------------------------------------------- */

  var state = {
    all: [],
    query: '',
    type: 'all',
    sort: 'rank-asc',
  };

  var el = {};

  function cacheEls() {
    el.grid = document.getElementById('lgu-grid');
    el.search = document.getElementById('lgu-search');
    el.type = document.getElementById('lgu-type');
    el.sort = document.getElementById('lgu-sort');
    el.reset = document.getElementById('lgu-reset');
    el.count = document.getElementById('lgu-count');
    el.empty = document.getElementById('lgu-empty');
  }

  /* ---------------------------------------------------------------- *
   * Data
   * ---------------------------------------------------------------- */

  function join(pop, cmci) {
    var byName = {};
    (cmci.lgus || []).forEach(function (l) {
      byName[l.name] = l;
    });

    return (pop.lgus || []).map(function (l) {
      var c = byName[l.name] || {};
      return {
        name: l.name,
        officialName: l.official_name || l.name,
        type: l.type,
        capital: !!l.is_capital,
        psgc: l.psgc_code || '',
        psgc10: l.psgc_10digit || '',
        barangayCount: l.barangay_count,
        pop2015: l.population_2015,
        pop2020: l.population_2020,
        pop2024: l.population_2024,
        area: l.land_area_km2,
        density: l.density_2024,
        growth: l.change_2020_2024,
        households: l.households_2024,
        lguClass: c.category || (l.type === 'city' ? 'City' : 'Municipality'),
        mayor: c.mayor || null,
        address: c.address || null,
        contact: phone(c.contact),
        site: website(c.website),
        provinceRank: c.province_rank || null,
        nationalRank: c.overall ? c.overall.rank : null,
        score: c.overall ? c.overall.score : null,
        _name: String(l.name).toLowerCase(),
        _official: String(l.official_name || '').toLowerCase(),
        _mayor: String(c.mayor || '').toLowerCase(),
      };
    });
  }

  /* ---------------------------------------------------------------- *
   * Rendering
   * ---------------------------------------------------------------- */

  function cardHtml(r) {
    var classPill =
      '<span class="pill ' +
      (r.type === 'city' ? 'pill-city' : 'pill-municipality') +
      '">' +
      esc(r.lguClass) +
      '</span>';
    var capitalPill = r.capital ? '<span class="pill pill-capital">Capital</span>' : '';
    var ay = '<i class="bi bi-person-badge" aria-hidden="true"></i>';

    var lead = r.mayor
      ? '<div class="lgu-lead">' +
        ay +
        '<span>Mayor <strong>' +
        esc(r.mayor) +
        '</strong></span></div>'
      : '';

    var contactBits = [];
    if (r.address) contactBits.push('<i class="bi bi-geo-alt"></i> ' + esc(r.address));
    if (r.contact) contactBits.push('<i class="bi bi-telephone"></i> ' + esc(r.contact));
    var contact = contactBits.length
      ? '<div class="lgu-contact">' + contactBits.join('<br />') + '</div>'
      : '';

    var links = [];
    if (r.psgc) {
      links.push(
        '<a href="../statistics/#cmci-' +
          esc(r.psgc) +
          '"><i class="bi bi-bar-chart-line" aria-hidden="true"></i> Competitiveness results</a>'
      );
    }
    links.push(
      '<a href="barangays.html?lgu=' +
        encodeURIComponent(r.name) +
        '"><i class="bi bi-signpost-split" aria-hidden="true"></i> Barangays</a>'
    );
    if (r.site) {
      links.push(
        '<a href="' +
          esc(r.site.url) +
          '" target="_blank" rel="noopener noreferrer"><i class="bi ' +
          esc(r.site.icon) +
          '" aria-hidden="true"></i> ' +
          esc(r.site.label) +
          '</a>'
      );
    }

    var rankLine = r.provinceRank
      ? 'Rank ' +
        esc(r.provinceRank) +
        ' of 18 in Albay' +
        (r.nationalRank ? ' · Rank ' + esc(r.nationalRank) + ' nationally in its class' : '')
      : '--';

    return (
      '<article class="lgu-card">' +
      '<div class="lgu-head">' +
      '<div class="lgu-mark' +
      (r.capital ? ' capital' : '') +
      '"><i class="bi ' +
      (r.type === 'city' ? 'bi-building' : 'bi-house-door') +
      '" aria-hidden="true"></i></div>' +
      '<div><h3 class="lgu-name">' +
      esc(r.name) +
      '</h3><div class="lgu-pills">' +
      classPill +
      capitalPill +
      '</div></div>' +
      '</div>' +
      '<dl class="lgu-stats">' +
      '<div><dt>Population 2024</dt><dd>' +
      fmtInt(r.pop2024) +
      '</dd></div>' +
      '<div><dt>Households</dt><dd>' +
      fmtInt(r.households) +
      '</dd></div>' +
      '<div><dt>Land area</dt><dd>' +
      (r.area === null || r.area === undefined ? '--' : fmtDec(r.area, 2) + ' km²') +
      '</dd></div>' +
      '<div><dt>Barangays</dt><dd>' +
      fmtInt(r.barangayCount) +
      '</dd></div>' +
      '<div><dt>Density 2024</dt><dd>' +
      fmtInt(r.density) +
      ' / km²</dd></div>' +
      '<div><dt>Growth 2020–2024</dt><dd>' +
      (r.growth === null || r.growth === undefined
        ? '--'
        : (r.growth > 0 ? '+' : '') + fmtDec(r.growth, 2) + '%') +
      '</dd></div>' +
      '</dl>' +
      lead +
      contact +
      '<div class="lgu-rank">' +
      rankLine +
      '</div>' +
      '<div class="lgu-links">' +
      links.join('') +
      '</div>' +
      '</article>'
    );
  }

  function apply() {
    var q = state.query.toLowerCase();
    var rows = state.all.filter(function (r) {
      if (state.type === 'city' && r.type !== 'city') return false;
      if (state.type === 'municipality' && r.type !== 'municipality') return false;
      if (
        q &&
        r._name.indexOf(q) === -1 &&
        r._official.indexOf(q) === -1 &&
        r._mayor.indexOf(q) === -1
      )
        return false;
      return true;
    });
    rows.sort(SORTS[state.sort] || SORTS['rank-asc']);

    if (el.grid) el.grid.innerHTML = rows.map(cardHtml).join('');
    if (el.empty) el.empty.hidden = rows.length !== 0;
    if (el.count) {
      var pop = rows.reduce(function (s, r) {
        return s + (r.pop2024 || 0);
      }, 0);
      el.count.innerHTML =
        'Showing <strong>' +
        fmtInt(rows.length) +
        '</strong> of <strong>' +
        fmtInt(state.all.length) +
        '</strong> cities and municipalities &middot; ' +
        fmtInt(pop) +
        ' residents (2024 Census)';
    }
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

  function wire() {
    if (el.search) {
      el.search.addEventListener(
        'input',
        debounce(function () {
          state.query = el.search.value.trim();
          apply();
        }, DEBOUNCE_MS)
      );
    }
    if (el.type) {
      el.type.addEventListener('change', function () {
        state.type = el.type.value;
        apply();
      });
    }
    if (el.sort) {
      el.sort.addEventListener('change', function () {
        state.sort = el.sort.value;
        apply();
      });
    }
    if (el.reset) {
      el.reset.addEventListener('click', function () {
        if (el.search) el.search.value = '';
        if (el.type) el.type.value = 'all';
        if (el.sort) el.sort.value = 'rank-asc';
        state.query = '';
        state.type = 'all';
        state.sort = 'rank-asc';
        apply();
      });
    }
  }

  /* ---------------------------------------------------------------- *
   * Boot
   * ---------------------------------------------------------------- */

  function fillStats(rows) {
    var set = function (id, value) {
      var n = document.getElementById(id);
      if (n) n.textContent = value;
    };
    set('lgu-stat-count', fmtInt(rows.length));
    set(
      'lgu-stat-cities',
      fmtInt(
        rows.filter(function (r) {
          return r.type === 'city';
        }).length
      )
    );
    set(
      'lgu-stat-munis',
      fmtInt(
        rows.filter(function (r) {
          return r.type === 'municipality';
        }).length
      )
    );
    set(
      'lgu-stat-brgys',
      fmtInt(
        rows.reduce(function (s, r) {
          return s + (r.barangayCount || 0);
        }, 0)
      )
    );
    set(
      'lgu-stat-pop',
      fmtInt(
        rows.reduce(function (s, r) {
          return s + (r.pop2024 || 0);
        }, 0)
      )
    );
  }

  function boot() {
    cacheEls();
    if (!document.querySelector('[data-lgu-root]')) return;
    wire();

    Promise.all([
      fetch(POP_URL, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('population data: HTTP ' + r.status);
        return r.json();
      }),
      fetch(CMCI_URL, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('competitiveness data: HTTP ' + r.status);
        return r.json();
      }),
    ])
      .then(function (res) {
        var pop = res[0];
        var cmci = res[1];
        if (pop._status && pop._status !== 'verified')
          throw new Error('population data unverified');
        if (cmci._status && cmci._status !== 'verified')
          throw new Error('competitiveness data unverified');
        state.all = join(pop, cmci);
        fillStats(state.all);
        apply();
      })
      .catch(function (err) {
        if (el.grid) {
          el.grid.innerHTML =
            '<div class="dir-empty" style="grid-column:1/-1"><i class="bi bi-exclamation-triangle"></i>' +
            'The LGU directory could not be loaded (' +
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
