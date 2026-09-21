(function () {
  'use strict';
  var directory = document.getElementById('emergency-hotlines');
  if (!directory) return;
  var controls = directory.querySelector('.emergency-filters');
  var search = document.getElementById('hotline-search');
  var category = document.getElementById('hotline-category');
  var clear = document.getElementById('hotline-clear');
  var count = document.getElementById('hotline-result-count');
  var empty = document.getElementById('hotline-empty');
  var groups = Array.prototype.slice.call(directory.querySelectorAll('.emergency-category'));
  var cards = [];

  function normalize(text) {
    return text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  }

  groups.forEach(function (group) {
    Array.prototype.forEach.call(group.querySelectorAll('.emergency-card'), function (card) {
      cards.push({
        node: card,
        category: group.dataset.category,
        text: normalize(group.querySelector('h3').textContent + ' ' + card.textContent),
      });
    });
  });

  function filter() {
    var query = normalize(search.value);
    var visible = 0;
    cards.forEach(function (card) {
      var matches =
        (!category.value || category.value === card.category) && card.text.indexOf(query) !== -1;
      card.node.hidden = !matches;
      if (matches) visible++;
    });
    groups.forEach(function (group) {
      group.hidden = !group.querySelector('.emergency-card:not([hidden])');
    });
    if (
      window.TranslationEngine &&
      typeof window.TranslationEngine.t === 'function' &&
      window.TranslationEngine.currentLang !== 'en'
    ) {
      var template = window.TranslationEngine.t('hotline-results-count');
      if (template && template.indexOf('{{visible}}') !== -1) {
        count.textContent = template
          .replace('{{visible}}', visible)
          .replace('{{total}}', cards.length);
      } else {
        count.textContent = 'Showing ' + visible + ' of ' + cards.length + ' contacts';
      }
    } else {
      count.textContent = 'Showing ' + visible + ' of ' + cards.length + ' contacts';
    }
    empty.hidden = visible !== 0;
    clear.hidden = !search.value && !category.value;
  }

  function reset() {
    search.value = '';
    category.value = '';
    filter();
  }
  search.addEventListener('input', filter);
  category.addEventListener('change', filter);
  clear.addEventListener('click', function () {
    reset();
    search.focus();
  });
  directory.querySelector('.emergency-jumps').addEventListener('click', function (event) {
    var link = event.target.closest('a');
    if (!link) return;
    var heading = document.getElementById(link.hash.slice(1));
    if (!heading) return;
    reset();
    heading.focus({ preventScroll: true });
  });
  controls.hidden = false;
  document.getElementById('hotline-jump-guidance').hidden = false;
  document.addEventListener('languageChanged', filter);
  filter();
})();
