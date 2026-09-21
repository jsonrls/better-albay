/**
 * BetterAlbay — Government Directory Interactive Behaviors
 * Sourced from data/officials.json
 */
(function () {
  'use strict';

  var DATA_URL = '../data/officials.json';

  function normalize(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initProvincialBoardFilter();
    initLguDirectory();
    initCouncilorToggles();
    fetchOfficialsData();
  });

  /* ------------------------------------------------------------------ *
   * Sangguniang Panlalawigan Filter Tabs
   * ------------------------------------------------------------------ */
  function initProvincialBoardFilter() {
    var buttons = document.querySelectorAll('[data-sp-filter]');
    var cards = document.querySelectorAll('.sp-card');
    if (!buttons.length || !cards.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.getAttribute('data-sp-filter');
        buttons.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        cards.forEach(function (card) {
          var cardDist = card.getAttribute('data-district');
          if (filter === 'all' || cardDist === filter) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * LGU Toolbar, Search & Filters
   * ------------------------------------------------------------------ */
  function initLguDirectory() {
    var searchInput = document.getElementById('lgu-search-input');
    var typeSelect = document.getElementById('lgu-type-select');
    var distSelect = document.getElementById('lgu-district-select');
    var resetBtn = document.getElementById('lgu-reset-btn');
    var countEl = document.getElementById('lgu-results-count');
    var emptyNotice = document.getElementById('lgu-empty-notice');
    var cards = document.querySelectorAll('#lgu-grid .lgu-card');

    if (!cards.length) return;

    var lguData = Array.from(cards).map(function (card) {
      var name = card.getAttribute('data-name') || '';
      var type = card.getAttribute('data-type') || '';
      var district = card.getAttribute('data-district') || '';
      var corpus = card.getAttribute('data-corpus') || '';
      var councilTags = Array.from(card.querySelectorAll('.councilor-tag'));
      var details = card.querySelector('.councilors-collapse');
      var summary = card.querySelector('.council-toggle-btn');

      return {
        card: card,
        name: name,
        type: type,
        district: district,
        corpus: normalize(corpus),
        councilTags: councilTags,
        details: details,
        summary: summary,
      };
    });

    function applyFilters() {
      var rawQuery = searchInput ? searchInput.value.trim() : '';
      var queryWords = normalize(rawQuery).split(' ').filter(Boolean);
      var selectedType = typeSelect ? typeSelect.value : 'all';
      var selectedDist = distSelect ? distSelect.value : 'all';

      var visibleCount = 0;

      lguData.forEach(function (item) {
        var matchesType = selectedType === 'all' || item.type === selectedType;
        var matchesDist = selectedDist === 'all' || item.district === selectedDist;

        var matchesQuery =
          queryWords.length === 0 ||
          queryWords.every(function (word) {
            return item.corpus.indexOf(word) !== -1;
          });

        var isVisible = matchesType && matchesDist && matchesQuery;

        if (isVisible) {
          visibleCount++;
          item.card.style.display = '';

          // If searching specifically, highlight matching councilor tags and expand
          if (queryWords.length > 0) {
            var hasCouncilorMatch = false;
            item.councilTags.forEach(function (tag) {
              var official = normalize(tag.getAttribute('data-official') || tag.textContent);
              var tagMatches = queryWords.some(function (w) {
                return official.indexOf(w) !== -1;
              });
              if (tagMatches) {
                tag.classList.add('match');
                hasCouncilorMatch = true;
              } else {
                tag.classList.remove('match');
              }
            });

            if (hasCouncilorMatch && item.details) {
              item.details.open = true;
              item.details.setAttribute('data-auto-opened', 'true');
              if (item.summary) {
                item.summary.setAttribute('aria-expanded', 'true');
                var label = item.summary.querySelector('span');
                var isBcl =
                  window.TranslationEngine && window.TranslationEngine.currentLang === 'bcl';
                var isFil =
                  window.TranslationEngine && window.TranslationEngine.currentLang === 'fil';
                var hideTxt = isBcl
                  ? 'Itago an mga Konsehal'
                  : isFil
                    ? 'Itago ang mga Konsehal'
                    : 'Hide Councilors';
                if (label) label.textContent = hideTxt;
              }
            } else if (
              !hasCouncilorMatch &&
              item.details &&
              item.details.getAttribute('data-auto-opened') === 'true'
            ) {
              item.details.open = false;
              item.details.removeAttribute('data-auto-opened');
              if (item.summary) {
                item.summary.setAttribute('aria-expanded', 'false');
                var count = item.summary.getAttribute('data-count') || item.councilTags.length;
                var label = item.summary.querySelector('span');
                var isBcl =
                  window.TranslationEngine && window.TranslationEngine.currentLang === 'bcl';
                var isFil =
                  window.TranslationEngine && window.TranslationEngine.currentLang === 'fil';
                var viewTxt = isBcl
                  ? 'Hilingon an mga Konsehal'
                  : isFil
                    ? 'Tingnan ang mga Konsehal'
                    : 'View Councilors';
                if (label) label.textContent = viewTxt + ' (' + count + ')';
              }
            }
          } else {
            // Remove highlight and collapse if previously auto-opened by search
            item.councilTags.forEach(function (tag) {
              tag.classList.remove('match');
            });
            if (item.details && item.details.getAttribute('data-auto-opened') === 'true') {
              item.details.open = false;
              item.details.removeAttribute('data-auto-opened');
              if (item.summary) {
                item.summary.setAttribute('aria-expanded', 'false');
                var count = item.summary.getAttribute('data-count') || item.councilTags.length;
                var label = item.summary.querySelector('span');
                var isBcl =
                  window.TranslationEngine && window.TranslationEngine.currentLang === 'bcl';
                var isFil =
                  window.TranslationEngine && window.TranslationEngine.currentLang === 'fil';
                var viewTxt = isBcl
                  ? 'Hilingon an mga Konsehal'
                  : isFil
                    ? 'Tingnan ang mga Konsehal'
                    : 'View Councilors';
                if (label) label.textContent = viewTxt + ' (' + count + ')';
              }
            }
          }
        } else {
          item.card.style.display = 'none';
        }
      });

      if (countEl) {
        var isBcl = window.TranslationEngine && window.TranslationEngine.currentLang === 'bcl';
        var isFil = window.TranslationEngine && window.TranslationEngine.currentLang === 'fil';
        if (isBcl) {
          countEl.textContent =
            'Pighihiling an ' + visibleCount + ' sa ' + lguData.length + ' mga LGU';
        } else if (isFil) {
          countEl.textContent =
            'Ipinapakita ang ' + visibleCount + ' sa ' + lguData.length + ' mga LGU';
        } else {
          countEl.textContent =
            'Showing ' +
            visibleCount +
            ' of ' +
            lguData.length +
            (lguData.length === 1 ? ' LGU' : ' LGUs');
        }
      }

      if (emptyNotice) {
        emptyNotice.hidden = visibleCount > 0;
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }
    if (typeSelect) {
      typeSelect.addEventListener('change', applyFilters);
    }
    if (distSelect) {
      distSelect.addEventListener('change', applyFilters);
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (searchInput) searchInput.value = '';
        if (typeSelect) typeSelect.value = 'all';
        if (distSelect) distSelect.value = 'all';
        lguData.forEach(function (item) {
          if (item.details) {
            item.details.open = false;
            item.details.removeAttribute('data-auto-opened');
          }
          if (item.summary) {
            item.summary.setAttribute('aria-expanded', 'false');
            var count = item.summary.getAttribute('data-count') || item.councilTags.length;
            var label = item.summary.querySelector('span');
            var isBcl = window.TranslationEngine && window.TranslationEngine.currentLang === 'bcl';
            var isFil = window.TranslationEngine && window.TranslationEngine.currentLang === 'fil';
            var viewTxt = isBcl
              ? 'Hilingon an mga Konsehal'
              : isFil
                ? 'Tingnan ang mga Konsehal'
                : 'View Councilors';
            if (label) label.textContent = viewTxt + ' (' + count + ')';
          }
          item.councilTags.forEach(function (tag) {
            tag.classList.remove('match');
          });
        });
        applyFilters();
      });
    }

    document.addEventListener('languageChanged', function () {
      applyFilters();
    });

    applyFilters();
  }

  /* ------------------------------------------------------------------ *
   * Councilor Accordion Toggles
   * ------------------------------------------------------------------ */
  function initCouncilorToggles() {
    var detailsList = document.querySelectorAll('.councilors-collapse');

    detailsList.forEach(function (details) {
      var summary = details.querySelector('.council-toggle-btn');
      if (!summary) return;

      var label = summary.querySelector('span');
      var count = summary.getAttribute('data-count') || '';

      details.addEventListener('toggle', function () {
        var isOpen = details.open;
        summary.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        // If user manually toggled, remove auto-opened marker so search doesn't override manual intent
        if (details.hasAttribute('data-auto-opened')) {
          details.removeAttribute('data-auto-opened');
        }

        if (label) {
          var isBcl = window.TranslationEngine && window.TranslationEngine.currentLang === 'bcl';
          var isFil = window.TranslationEngine && window.TranslationEngine.currentLang === 'fil';
          var viewTxt = isBcl
            ? 'Hilingon an mga Konsehal'
            : isFil
              ? 'Tingnan ang mga Konsehal'
              : 'View Councilors';
          var hideTxt = isBcl
            ? 'Itago an mga Konsehal'
            : isFil
              ? 'Itago ang mga Konsehal'
              : 'Hide Councilors';
          label.textContent = isOpen ? hideTxt : viewTxt + (count ? ' (' + count + ')' : '');
        }
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Fetch Officials Data Verification
   * ------------------------------------------------------------------ */
  function fetchOfficialsData() {
    if (typeof fetch !== 'function') return;

    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + DATA_URL + ': ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        window.__BETTERALBAY_OFFICIALS__ = payload;
      })
      .catch(function (err) {
        // Progressive enhancement: static markup already present
        if (window.console && console.warn) {
          console.warn('Albay officials JSON live probe note:', err.message);
        }
      });
  }
})();
