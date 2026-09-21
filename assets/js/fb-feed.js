/**
 * Hybrid "Latest Updates" feed for the homepage.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Facebook Page Plugin (the embedded timeline iframe) is fundamentally
 * unreliable for most visitors in modern browsers: it depends on third-party
 * cookies / partitioned storage (blocked by default in current Chrome, Safari
 * and Firefox) and is routinely stripped by ad/tracker blockers. When that
 * happens it renders a blank white box — which is exactly what was reported on
 * the live cPanel site even though the page is public and the CSP fully allows
 * Facebook.
 *
 * STRATEGY (progressive enhancement, graceful degradation)
 * --------------------------------------------------------
 *   1. Immediately render a self-hosted feed from data/news.json — the same
 *      file scripts/sync-facebook.js writes Facebook posts into. This always
 *      works (same-origin, no cookies, unblockable) and is the base layer.
 *   2. Lazily probe the live Facebook Page Plugin. We can't read a cross-origin
 *      iframe's contents, but a working plugin postMessages its parent for
 *      sizing. If we receive a message FROM OUR iframe within a timeout, the
 *      plugin genuinely hydrated → reveal it and hide the self-hosted list.
 *      Otherwise we discard the iframe and the reliable feed stays in place.
 *
 * The section therefore can never be empty, and visitors whose browsers still
 * support the embed continue to get the live Facebook timeline.
 */
(function () {
  'use strict';

  var MAX_ITEMS = 3; // posts shown in the self-hosted feed (≈ the 700px plugin it stands in for)
  var PROBE_TIMEOUT_MS = 4500; // how long to wait for the FB plugin to prove it hydrated
  var SUPPORTED_BADGES = { info: 1, success: 1, warning: 1 };

  // Last render's inputs, so a language switch can rebuild the list without
  // re-fetching data/news.json (and without disturbing the live-feed probe).
  var lastArticles = null;
  var lastPageUrl = null;

  // The feed only exists on the homepage (root), but mirror news.js's path guard
  // so it keeps working if the markup is ever reused under a sub-path.
  var NEWS_DATA_URL =
    window.location.pathname.indexOf('/news') !== -1 ? '../data/news.json' : 'data/news.json';

  // --- small, self-contained sanitizers (kept local so this file has no deps) ---

  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeBadge(badge) {
    return SUPPORTED_BADGES[badge] ? badge : 'info';
  }

  // Only allow http(s) and site-relative URLs through to href attributes.
  function safeUrl(url) {
    if (!url) return '';
    var u = String(url).trim();
    if (/^https?:\/\//i.test(u) || u.charAt(0) === '/' || u.charAt(0) === '#') {
      return esc(u);
    }
    return '';
  }

  // --- i18n ------------------------------------------------------------------
  //
  // The page's TranslationEngine reads only five data-i18n* attributes and writes
  // `element.textContent`, so it cannot translate a string this renderer builds by
  // concatenating a label with a date or a figure. Emitting the key as well as the
  // English text gets both: the key lets the engine re-translate the element later,
  // the text is what a reader sees if the engine never loads.

  function currentLang() {
    if (!window.TranslationEngine || !window.TranslationEngine.getCurrentLanguage) return 'en';
    try {
      return window.TranslationEngine.getCurrentLanguage() || 'en';
    } catch (e) {
      return 'en';
    }
  }

  /** Text, already translated where the table has a value for the key. */
  function tText(key, fallback, params) {
    if (!window.TranslationEngine || !window.TranslationEngine.getTranslation) return fallback;
    try {
      return window.TranslationEngine.getTranslation(key, currentLang(), params) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  /** `data-i18n` attributes, for an element with no icon or link inside it. */
  function i18nAttr(key, params) {
    var attrs = ' data-i18n="' + esc(key) + '"';
    if (params) attrs += ' data-i18n-params="' + esc(JSON.stringify(params)) + '"';
    return attrs;
  }

  /**
   * Translated text wrapped in its own element, for copy that sits beside an icon
   * or a link. The wrapper is what the engine rewrites, so the surrounding markup
   * survives translation intact.
   */
  function tHtml(key, fallback, params) {
    return '<span' + i18nAttr(key, params) + '>' + esc(fallback) + '</span>';
  }

  // Month names come from the table rather than `Intl`. Intl carries no Central
  // Bikol data, and an unresolvable locale tag resolves silently to the
  // *browser's* default locale - which would print German months on a Central
  // Bikol page for a visitor whose browser is German. Our own keys are
  // deterministic in all three.
  // The keys are shared with news.js, which formats dates for the news list, so
  // they are named for the calendar rather than for this feed.
  var MONTH_KEYS = [
    'month-jan',
    'month-feb',
    'month-mar',
    'month-apr',
    'month-may',
    'month-jun',
    'month-jul',
    'month-aug',
    'month-sep',
    'month-oct',
    'month-nov',
    'month-dec',
  ];
  var MONTH_EN = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  /**
   * A feed date in the page's current language. The element that receives this
   * deliberately carries no `data-i18n`: the sentence is assembled from three
   * table keys at render time, so pinning those values into a `data-i18n-params`
   * attribute would freeze the month name in English on every language switch.
   */
  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return esc(dateStr);
    return tText('date-short', '{{month}} {{day}}, {{year}}', {
      month: tText(MONTH_KEYS[d.getMonth()], MONTH_EN[d.getMonth()]),
      day: String(d.getDate()),
      year: String(d.getFullYear()),
    });
  }

  function sortByDateDesc(articles) {
    return articles.slice().sort(function (a, b) {
      var ta = new Date((a.date || '') + 'T00:00:00').getTime();
      var tb = new Date((b.date || '') + 'T00:00:00').getTime();
      if (isNaN(ta)) ta = -Infinity;
      if (isNaN(tb)) tb = -Infinity;
      return tb - ta;
    });
  }

  // --- self-hosted feed rendering -------------------------------------------

  // Resolve the avatar path relative to where the page lives.
  var AVATAR_SRC =
    window.location.pathname.indexOf('/news') !== -1
      ? '../assets/images/logo/albay-pio.jpg'
      : 'assets/images/logo/albay-pio.jpg';

  function renderLocalFeed(container, articles, pageUrl) {
    lastArticles = articles;
    lastPageUrl = pageUrl;

    var items = sortByDateDesc(articles).slice(0, MAX_ITEMS);
    var safePage = safeUrl(pageUrl) || 'https://www.facebook.com';

    var html = '';

    if (!items.length) {
      html +=
        '<article class="fb-post fb-post--empty">' +
        '<p class="fb-post-text"' +
        i18nAttr('fb-empty') +
        '>' +
        tText('fb-empty', 'Verified Albay news is not yet available.') +
        '</p>' +
        '<a class="fb-post-link" href="' +
        safePage +
        '" target="_blank" rel="noopener noreferrer">' +
        tHtml('fb-empty-cta', 'See the latest on Facebook') +
        ' <i class="bi bi-arrow-right" aria-hidden="true"></i></a>' +
        '</article>';
    } else {
      for (var i = 0; i < items.length; i++) {
        var a = items[i];
        var badge = safeBadge(a.badge);
        var title = esc(a.title);
        var url = safeUrl(a.url);

        // Byline. data/news.json is written by two syncs: scripts/sync-facebook.js
        // (ids prefixed `fb-` — genuine posts from the page) and
        // scripts/sync-news.js (ids prefixed `news-` — third-party press
        // coverage). Name each row's real origin, since crediting a
        // Philippine News Agency story to our own page would be a false
        // attribution.
        var isPagePost = typeof a.id === 'string' && a.id.indexOf('fb-') === 0;
        // `LGU Albay` is the page's own name and `a.source` comes from the dataset,
        // so neither is translated; only this generic fallback is.
        var byline = isPagePost
          ? esc('LGU Albay')
          : esc(a.source) || tHtml('fb-byline-fallback', 'Albay news');

        html += '<article class="fb-post">';

        // Author row — avatar + byline + date + category badge
        html += '<div class="fb-post-author">';
        html +=
          '<img src="' +
          AVATAR_SRC +
          '" class="fb-post-avatar" ' +
          'width="36" height="36" alt="" aria-hidden="true" loading="lazy">';
        html += '<div class="fb-post-author-info">';
        html += '<span class="fb-post-page-name">' + byline + '</span>';
        html += '<time class="fb-post-date">' + formatDate(a.date) + '</time>';
        html += '</div>';
        if (a.category) {
          html +=
            '<span class="fb-post-badge fb-post-badge--' +
            badge +
            '">' +
            esc(a.category) +
            '</span>';
        }
        html += '</div>';

        // Post body
        html += '<div class="fb-post-body">';
        if (title) {
          html += '<h4 class="fb-post-title">';
          html += url
            ? '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + title + '</a>'
            : title;
          html += '</h4>';
        }
        if (a.summary) {
          html += '<p class="fb-post-text">' + esc(a.summary) + '</p>';
        }
        html += '</div>';

        if (url) {
          // The byline above already names the publication, so the link only
          // has to carry the action.
          var label = esc(a.source)
            ? tHtml('fb-read-full', 'Read full story')
            : tHtml('fb-read-more', 'Read more');
          html +=
            '<a class="fb-post-link" href="' +
            url +
            '" target="_blank" rel="noopener noreferrer">' +
            label +
            ' <i class="bi bi-arrow-right" aria-hidden="true"></i></a>';
        }

        html += '</article>';
      }
    }

    // Mount into a reusable wrapper. A re-render (the language switch) must not
    // rewrite the container's children: by then the probe may have promoted a live
    // Facebook iframe into it, and `container.innerHTML =` would destroy that
    // iframe along with the timeline it is displaying.
    var list = container.querySelector('[data-fb-local]');
    if (!list) {
      list = document.createElement('div');
      list.className = 'fb-feed-local';
      list.setAttribute('data-fb-local', '');
      container.appendChild(list);
    }
    list.innerHTML = html;
  }

  // --- live Facebook plugin probe -------------------------------------------

  function buildPluginIframe(pageUrl) {
    var href = encodeURIComponent(pageUrl);
    var src =
      'https://www.facebook.com/plugins/page.php?href=' +
      href +
      '&tabs=timeline&width=500&height=700&small_header=true' +
      '&adapt_container_width=true&hide_cover=true&show_facepile=false';

    var iframe = document.createElement('iframe');
    iframe.title = 'Latest posts from the Official LGU Albay Facebook Page';
    iframe.src = src;
    iframe.width = '100%';
    iframe.height = '700';
    iframe.scrolling = 'no';
    iframe.frameBorder = '0';
    iframe.allowFullscreen = true;
    iframe.setAttribute('allow', 'encrypted-media; clipboard-write; web-share');
    iframe.className = 'fb-page-plugin fb-live-frame';
    return iframe;
  }

  /**
   * Loads the FB plugin off-screen and only reveals it if it proves it hydrated.
   * Detection: a working plugin postMessages its parent window for sizing. We
   * accept the message only when event.source is our own iframe's window, so
   * other embeds (maps, etc.) can't trigger a false positive.
   */
  function probeLiveFeed(container, pageUrl) {
    var iframe = buildPluginIframe(pageUrl);
    var clip = container.querySelector('.fb-live-clip');
    if (!clip) {
      clip = document.createElement('div');
      clip.className = 'fb-live-clip';
      container.appendChild(clip);
    }
    // Off-screen but fully laid out, so the plugin can measure and render.
    clip.style.position = 'absolute';
    clip.style.top = '0';
    clip.style.left = '0';
    clip.style.width = '100%';
    clip.style.height = '630px';
    clip.style.overflow = 'hidden';
    clip.style.opacity = '0';
    clip.style.pointerEvents = 'none';
    clip.setAttribute('aria-hidden', 'true');
    clip.setAttribute('tabindex', '-1');
    clip.appendChild(iframe);

    var settled = false;
    var timer = null;

    function cleanup() {
      iframe.removeEventListener('load', succeed);
      window.removeEventListener('message', onMessage);
      iframe.removeEventListener('error', fail);
      if (timer) clearTimeout(timer);
    }

    function onMessage(e) {
      if (settled || !iframe.contentWindow) return;
      var fromOurIframe = e.source === iframe.contentWindow;
      var fromFacebook = typeof e.origin === 'string' && /\.facebook\.com$/.test(e.origin);
      if (fromOurIframe && fromFacebook) succeed();
    }

    function succeed() {
      if (settled) return;
      settled = true;
      cleanup();
      var list = container.querySelector('[data-fb-local]');
      if (list) list.hidden = true;
      // Promote the clip container into normal flow.
      clip.style.position = 'relative';
      clip.style.top = '';
      clip.style.left = '';
      clip.style.width = '100%';
      clip.style.height = '630px';
      clip.style.overflow = 'hidden';
      clip.style.opacity = '1';
      clip.style.pointerEvents = 'auto';
      clip.removeAttribute('aria-hidden');
      clip.removeAttribute('tabindex');

      iframe.style.position = 'relative';
      iframe.style.top = '';
      iframe.style.left = '';
      iframe.style.width = '100%';
      iframe.style.height = '700px';
      iframe.style.marginTop = '-70px';
      iframe.style.opacity = '1';
      iframe.style.pointerEvents = 'auto';
      iframe.removeAttribute('aria-hidden');
      iframe.removeAttribute('tabindex');
      container.setAttribute('data-fb-live', 'true');
    }

    function fail() {
      if (settled) return;
      settled = true;
      cleanup();
      if (clip && clip.parentNode) clip.parentNode.removeChild(clip);
      container.setAttribute('data-fb-live', 'false');
    }

    iframe.addEventListener('load', succeed);
    window.addEventListener('message', onMessage);
    iframe.addEventListener('error', fail);
    timer = setTimeout(fail, PROBE_TIMEOUT_MS);
  }

  // Defer the (heavy, third-party) probe until the feed is near the viewport so
  // it never competes with the initial page load.
  function scheduleProbe(container, pageUrl) {
    function start() {
      probeLiveFeed(container, pageUrl);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              io.disconnect();
              start();
              return;
            }
          }
        },
        { rootMargin: '300px 0px' }
      );
      io.observe(container);
    } else {
      setTimeout(start, 1200);
    }
  }

  // --- bootstrap -------------------------------------------------------------

  function init() {
    var container = document.getElementById('fb-feed');
    if (!container) return;
    var pageUrl = container.getAttribute('data-fb-page') || 'https://www.facebook.com';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', NEWS_DATA_URL, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var articles = [];
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          articles =
            data &&
            data._status !== 'draft' &&
            data._status !== 'unverified' &&
            Array.isArray(data.news)
              ? data.news.filter(function (article) {
                  return article && article._status !== 'draft' && article._status !== 'unverified';
                })
              : [];
        } catch (e) {
          articles = [];
        }
      }
      // Always render the reliable base layer (empty-state included), then probe.
      // Publishing the state here — rather than waiting for the probe to settle —
      // lets the page explain the fallback the moment it is on screen; the probe
      // is deferred until the section is near the viewport, so on a long page it
      // can be seconds before it runs. succeed() flips this to 'true'.
      renderLocalFeed(container, articles, pageUrl);
      container.setAttribute('data-fb-live', 'false');
      scheduleProbe(container, pageUrl);
    };
    xhr.onerror = function () {
      renderLocalFeed(container, [], pageUrl);
      container.setAttribute('data-fb-live', 'false');
      scheduleProbe(container, pageUrl);
    };
    xhr.send();

    // Rebuild the list in the newly chosen language. The date and the byline are
    // assembled from several table keys at render time, so re-rendering is simpler
    // and more reliable than retranslating those fragments through the DOM.
    // Skipped when the live timeline won the probe, since the list is hidden
    // behind it and nobody would see the work.
    document.addEventListener('languageChanged', function () {
      if (lastArticles === null) return;
      if (container.getAttribute('data-fb-live') === 'true') return;
      renderLocalFeed(container, lastArticles, lastPageUrl);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
