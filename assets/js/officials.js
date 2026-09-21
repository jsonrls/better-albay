/**
 * Elected officials directory — BetterAlbay.org
 *
 * Renders the city and municipal mayors and leadership of each of
 * Albay's 18 LGUs for the 2025–2028 term, unified with data/officials.json
 * and supplemented with official classifications and contact channels
 * from the DTI Cities and Municipalities Competitiveness Index (CMCI).
 *
 * Provincial leadership (Governor, Vice Governor, SP members, and
 * Congressional Representatives) is presented on the Government Overview page.
 */
(function () {
  'use strict';

  var OFFICIALS_URL = '../data/officials.json';
  var CMCI_URL = '../data/cmci_2024.json';
  var DEBOUNCE_MS = 130;

  var SORTS = {
    'lgu-asc': { key: 'name', dir: 1 },
    'mayor-asc': { key: 'mayorSort', dir: 1 },
    'class-asc': { key: 'type', dir: 1 },
    'pop-desc': { key: 'population', dir: -1 },
  };

  var state = { all: [], query: '', type: 'all', sort: 'lgu-asc' };
  var el = {};

  /* ---------------------------------------------------------------- *
   * Helpers
   * ---------------------------------------------------------------- */

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * CMCI's `website` column holds anything from a real URL to free text
   * ("facebook page: lgumanitoofficial@gmail.com") to a Facebook page.
   * Only emit an anchor when the value is actually a host name, and label
   * social pages as such so a Facebook page is never presented as the
   * LGU's own website.
   */
  function website(value) {
    if (!value) return null;
    var v = String(value).trim();
    if (!/^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(v)) return null;
    var url = /^https?:\/\//i.test(v) ? v : 'https://' + v;
    var host = url
      .replace(/^https?:\/\//i, '')
      .split(/[/?#]/)[0]
      .toLowerCase();
    var label = 'Website';
    if (/(^|\.)(facebook|fb)\.com$/.test(host) || host === 'fb.me') label = 'Facebook';
    else if (/(^|\.)instagram\.com$/.test(host) || host === 'ig.me') label = 'Instagram';
    else if (/(^|\.)(twitter|x)\.com$/.test(host)) label = 'X';
    else if (/(^|\.)youtube\.com$/.test(host) || host === 'youtu.be') label = 'YouTube';
    return { url: url, label: label };
  }

  /**
   * Contact strings carry a "Tel:" prefix, occasionally read "NDA", and in
   * at least one case are a placeholder ("09170000000"). Reject all three
   * rather than printing something a resident would dial and get nowhere.
   */
  function phone(value) {
    if (!value) return null;
    var v = String(value)
      .replace(/^\s*(tel|telephone|contact)\s*:?\s*/i, '')
      .trim();
    if (!v) return null;
    if (/^(nda|n\/a|na|none|-+)$/i.test(v)) return null;
    var digits = v.replace(/\D/g, '');
    if (digits.length < 7) return null;
    /* 09170000000 and friends: a run of five or more identical digits
       inside a phone number is a placeholder, not a number. */
    if (/(\d)\1{4,}/.test(digits)) return null;
    return v;
  }

  /* ---------------------------------------------------------------- *
   * Data
   * ---------------------------------------------------------------- */

  function surname(name) {
    var clean = String(name || '')
      .replace(/\(.*?\)/g, ' ')
      .replace(/\b(jr|sr|ii|iii|iv)\.?\b/gi, ' ')
      .replace(/[.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return '';
    var parts = clean.split(' ');
    return parts[parts.length - 1].toLowerCase();
  }

  function normalize(cmci, officials) {
    var offMayors = {};
    var offViceMayors = {};

    if (officials) {
      (officials.cities || []).forEach(function (c) {
        var key = (c.name || '')
          .replace(/\s+City$/i, '')
          .trim()
          .toLowerCase();
        if (c.mayor && c.mayor.name) offMayors[key] = c.mayor.name;
        if (c.vice_mayor && c.vice_mayor.name) offViceMayors[key] = c.vice_mayor.name;
      });
      (officials.municipalities || []).forEach(function (m) {
        var key = (m.name || '')
          .replace(/\s+City$/i, '')
          .trim()
          .toLowerCase();
        if (m.mayor && m.mayor.name) offMayors[key] = m.mayor.name;
        if (m.vice_mayor && m.vice_mayor.name) offViceMayors[key] = m.vice_mayor.name;
      });
    }

    return cmci.lgus
      .map(function (lgu) {
        var name = lgu.name || lgu.official_name || '';
        var key = name
          .replace(/\s+City$/i, '')
          .trim()
          .toLowerCase();
        var mayor = offMayors[key] || (lgu.mayor ? String(lgu.mayor).trim() : '');
        var viceMayor = offViceMayors[key] || '';
        var type = lgu.type === 'city' ? 'city' : 'municipality';
        return {
          name: name,
          officialName: lgu.official_name || name,
          type: type,
          lguClass: lgu.category || '',
          mayor: mayor,
          viceMayor: viceMayor,
          mayorSort: surname(mayor) || name.toLowerCase(),
          contact: phone(lgu.contact),
          site: website(lgu.website),
          psgc: lgu.psgc_code || '',
          population: lgu.population_2020 || 0,
          provinceRank: lgu.province_rank || '',
          _name: (name + ' ' + (lgu.official_name || '')).toLowerCase(),
          _mayor: (mayor + ' ' + viceMayor).toLowerCase(),
        };
      })
      .sort(function (a, b) {
        return (a.provinceRank || 99) - (b.provinceRank || 99);
      });
  }

  /* ---------------------------------------------------------------- *
   * Rendering
   * ---------------------------------------------------------------- */

  function rowHtml(r) {
    var links =
      '<div class="off-links">' +
      '<a href="../statistics/#cmci-' +
      esc(r.psgc) +
      '" title="Competitiveness results for ' +
      esc(r.name) +
      '"><i class="bi bi-graph-up" aria-hidden="true"></i><span>CMCI</span></a>' +
      '<a href="barangays.html?lgu=' +
      encodeURIComponent(r.name) +
      '" title="Barangays of ' +
      esc(r.name) +
      '"><i class="bi bi-diagram-3" aria-hidden="true"></i><span>Barangays</span></a>' +
      (r.site
        ? '<a href="' +
          esc(r.site.url) +
          '" target="_blank" rel="noopener noreferrer" title="' +
          esc(r.site.label + ' of ' + r.name) +
          '"><i class="bi bi-box-arrow-up-right" aria-hidden="true"></i><span>' +
          esc(r.site.label) +
          '</span></a>'
        : '') +
      '</div>';

    return (
      '<div class="dir-row off-row">' +
      '<div class="off-col-lgu">' +
      '<strong>' +
      esc(r.name) +
      '</strong> ' +
      (r.type === 'city'
        ? '<span class="pill pill-city">City</span>'
        : '<span class="pill pill-municipality">Municipality</span>') +
      (r.name === 'Legazpi' ? ' <span class="pill pill-capital">Capital</span>' : '') +
      '</div>' +
      '<div class="off-col-mayor">' +
      (r.mayor ? esc(r.mayor) : '<em>Not published</em>') +
      (r.viceMayor
        ? '<div class="off-vice-mayor"><small class="text-muted">VM: ' +
          esc(r.viceMayor) +
          '</small></div>'
        : '') +
      '</div>' +
      '<div class="off-col-class">' +
      (r.lguClass ? '<span class="pill pill-code">' + esc(r.lguClass) + '</span>' : '') +
      '</div>' +
      '<div class="off-col-contact' +
      (r.contact ? '' : ' is-empty') +
      '">' +
      (r.contact
        ? '<a href="tel:' + esc(r.contact.replace(/[^\d+]/g, '')) + '">' + esc(r.contact) + '</a>'
        : '') +
      '</div>' +
      links +
      '</div>'
    );
  }

  function apply() {
    var query = state.query.trim().toLowerCase();
    var rows = state.all.filter(function (r) {
      if (state.type !== 'all' && r.type !== state.type) return false;
      if (!query) return true;
      if (r._name.indexOf(query) !== -1) return true;
      if (r._mayor && r._mayor.indexOf(query) !== -1) return true;
      if (r.lguClass.toLowerCase().indexOf(query) !== -1) return true;
      return false;
    });

    var spec = SORTS[state.sort] || SORTS['lgu-asc'];
    rows = rows.slice().sort(function (a, b) {
      var av = a[spec.key];
      var bv = b[spec.key];
      if (av === bv) return a.name.localeCompare(b.name);
      return av < bv ? -spec.dir : spec.dir;
    });

    if (el.body) el.body.innerHTML = rows.map(rowHtml).join('');
    if (el.empty) el.empty.hidden = rows.length > 0;

    if (el.count) {
      var towns = rows.filter(function (r) {
        return r.type === 'municipality';
      }).length;
      var cities = rows.filter(function (r) {
        return r.type === 'city';
      }).length;
      var withContact = rows.filter(function (r) {
        return r.contact;
      }).length;
      el.count.innerHTML =
        'Showing <strong>' +
        rows.length +
        '</strong> of <strong>' +
        state.all.length +
        '</strong> mayors' +
        (query || state.type !== 'all' ? ' (filtered)' : '') +
        ' · <strong>' +
        cities +
        '</strong> ' +
        (cities === 1 ? 'city' : 'cities') +
        ' · <strong>' +
        towns +
        '</strong> ' +
        (towns === 1 ? 'municipality' : 'municipalities') +
        ' · <strong>' +
        withContact +
        '</strong> with a published contact number';
    }

    if (el.head) {
      el.head.querySelectorAll('button[data-sort]').forEach(function (btn) {
        var isActive = btn.getAttribute('data-sort') === state.sort;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-sort', isActive ? 'ascending' : 'none');
      });
    }
  }

  function fillStats() {
    var all = state.all;
    var set = function (id, value) {
      var node = document.getElementById(id);
      if (node) node.textContent = value;
    };
    set('off-stat-count', all.length);
    set(
      'off-stat-cities',
      all.filter(function (r) {
        return r.type === 'city';
      }).length
    );
    set(
      'off-stat-munis',
      all.filter(function (r) {
        return r.type === 'municipality';
      }).length
    );
    set(
      'off-stat-contacts',
      all.filter(function (r) {
        return r.contact;
      }).length
    );
  }

  /* ---------------------------------------------------------------- *
   * Wiring
   * ---------------------------------------------------------------- */

  function cacheEls() {
    el.body = document.getElementById('off-body');
    el.empty = document.getElementById('off-empty');
    el.count = document.getElementById('off-count');
    el.head = document.querySelector('.off-head');
    el.search = document.getElementById('off-search');
    el.type = document.getElementById('off-type');
    el.sort = document.getElementById('off-sort');
    el.reset = document.getElementById('off-reset');
  }

  function wire() {
    var timer = null;

    if (el.search) {
      el.search.addEventListener('input', function () {
        state.query = el.search.value;
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(apply, DEBOUNCE_MS);
      });
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
        state.query = '';
        state.type = 'all';
        state.sort = 'lgu-asc';
        if (el.search) el.search.value = '';
        if (el.type) el.type.value = 'all';
        if (el.sort) el.sort.value = 'lgu-asc';
        apply();
      });
    }

    if (el.head) {
      el.head.querySelectorAll('button[data-sort]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var target = btn.getAttribute('data-sort');
          state.sort = target;
          if (el.sort) el.sort.value = target;
          apply();
        });
      });
    }
  }

  function fail(message) {
    if (el.count) el.count.textContent = '';
    if (el.empty) {
      el.empty.hidden = false;
      el.empty.innerHTML =
        '<i class="bi bi-exclamation-triangle" aria-hidden="true"></i>' +
        '<p>' +
        esc(message) +
        ' Use the links on this page to check with the responsible office.</p>';
    }
  }

  function boot() {
    if (!document.getElementById('off-body')) return;

    cacheEls();

    Promise.all([
      window.fetch(OFFICIALS_URL, { cache: 'no-cache' }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }),
      window.fetch(CMCI_URL, { cache: 'no-cache' }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }),
    ])
      .then(function (results) {
        var officials = results[0];
        var cmci = results[1];

        if (!cmci || !Array.isArray(cmci.lgus) || !cmci.lgus.length) {
          throw new Error('no LGU records');
        }
        /* House rule: never publish unverified data. */
        if (cmci._status && cmci._status !== 'verified') {
          throw new Error('competitiveness data is not verified');
        }
        state.all = normalize(cmci, officials);
        fillStats();
        wire();
        apply();
      })
      .catch(function (err) {
        fail('The verified officeholder dataset could not be loaded (' + err.message + ').');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
