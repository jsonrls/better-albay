#!/usr/bin/env node
/**
 * Albay news → news.json sync engine.
 *
 * Complements scripts/sync-facebook.js (which covers the official LGU Facebook
 * Page). This one covers *press coverage of Albay*: it queries the Bing News
 * RSS endpoint for each of the province's 18 cities and municipalities, keeps
 * only headlines that explicitly name Albay or one of those places, collapses
 * duplicate coverage of the same story across outlets, and merges the result
 * into data/news.json.
 *
 * Every published item is real and attributable:
 *   - title   comes from the publisher's own headline
 *   - summary is the publisher's own excerpt, as syndicated
 *   - url     is the publisher's own article (or its MSN mirror)
 *   - source  is the publishing newsroom, resolved from the URL host
 *   - date    is the article's publication date
 *   - image   is the publisher's own lead image for that story, read from the
 *             Open Graph / Twitter card tags it publishes for link previews
 * Nothing is invented, and the fetch is repeatable — re-running refreshes the
 * feed rather than appending to it.
 *
 * The static front-end (assets/js/news.js and assets/js/fb-feed.js) renders the
 * resulting file unchanged.
 *
 * OPTIONAL ENV:
 *   NEWS_WINDOW_DAYS   only keep articles published within N days (default 180)
 *   NEWS_MAX_ITEMS     max news-sourced items kept in the feed (default 60)
 *   NEWS_JSON_PATH     output path (default <repo>/data/news.json)
 *   NEWS_QUERIES       comma-separated query override (default: the 18 LGUs)
 *   NEWS_FIXTURE       path to a saved-feed JSON file `{ "feeds": ["<xml>"] }`
 *                      — bypasses the network (for local testing / dry runs)
 *   NEWS_DRY_RUN       when "1", print the result and do not write
 *   NEWS_SKIP_IMAGES   when "1", do not look up lead images (fast local runs)
 *   NEWS_ENRICH_ONLY   when "1", skip the feeds and only fill in missing lead
 *                      images on the existing news.json
 *
 * Behaviour on failure: if every query fails, or nothing survives curation,
 * the existing news.json is left untouched, so a bad run can never blank out
 * the live news.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { isValidItem, categorize } = require('./sync-facebook.js');

const CONFIG = {
  windowDays: parseInt(process.env.NEWS_WINDOW_DAYS || '180', 10),
  maxItems: parseInt(process.env.NEWS_MAX_ITEMS || '60', 10),
  newsPath: process.env.NEWS_JSON_PATH || path.resolve(__dirname, '..', 'data', 'news.json'),
  fixture: process.env.NEWS_FIXTURE || '',
  dryRun: process.env.NEWS_DRY_RUN === '1',
  skipImages: process.env.NEWS_SKIP_IMAGES === '1',
  enrichOnly: process.env.NEWS_ENRICH_ONLY === '1',
  queries: (process.env.NEWS_QUERIES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36 BetterAlbay/1.0 (+news-sync)';

const FEED_ENDPOINT = 'https://www.bing.com/news/search?format=RSS&count=50&q=';

// Albay's 3 cities and 15 municipalities, plus the province itself. Each LGU is
// its own query because the feed returns a different slice per term.
const DEFAULT_QUERIES = [
  'Albay',
  'Province of Albay',
  'Mayon Volcano',
  'Mayon alert level',
  'Albay dengue',
  'Bicol Region',
  'Legazpi City',
  'Ligao City',
  'Tabaco City',
  'Daraga Albay',
  'Guinobatan Albay',
  'Polangui Albay',
  'Camalig Albay',
  'Bacacay Albay',
  'Libon Albay',
  'Oas Albay',
  'Tiwi Albay',
  'Malinao Albay',
  'Pio Duran Albay',
  'Santo Domingo Albay',
  'Rapu-Rapu Albay',
  'Manito Albay',
  'Jovellar Albay',
  'Malilipot Albay',
];

// A headline is Albay news only if it names Albay or one of its 18 LGUs.
// Region-wide "Bicol" stories that never name the province are out of scope.
const PLACES = [
  'albay',
  'legazpi',
  'ligao',
  'tabaco',
  'mayon',
  'daraga',
  'malinao',
  'camalig',
  'guinobatan',
  'polangui',
  'tiwi',
  'manito',
  'bacacay',
  'jovellar',
  'pio duran',
  'rapu-rapu',
  'rapu rapu',
  'malilipot',
  'santo domingo',
  'sto. domingo',
  'libon',
];
const PLACE_RE = new RegExp(`\\b(${PLACES.join('|')})\\b`, 'i');

// Aggregated service pages, not journalism.
const JUNK_TITLE_RE =
  /(10-day|weather forecast|forecaststar|star_ratehome|horoscope|lottery|live updates:|\bwatch live\b)/i;

// ---------------------------------------------------------------------------
// Text hygiene
// ---------------------------------------------------------------------------

function decodeEntities(input) {
  return String(input == null ? '' : input)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&hellip;/gi, '…')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&amp;/gi, '&'); // must stay last
}

function safeCodePoint(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch (e) {
    return '';
  }
}

function stripTags(input) {
  return String(input == null ? '' : input)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]*>/g, ' ');
}

function collapseWhitespace(input) {
  return String(input == null ? '' : input)
    .replace(/\r/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(input) {
  return collapseWhitespace(decodeEntities(stripTags(input)));
}

// ---------------------------------------------------------------------------
// RSS parsing
// ---------------------------------------------------------------------------

function pickTag(raw, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
  const m = String(raw).match(re);
  return m ? m[1] : '';
}

/**
 * Bing wraps every article link in an apiclick redirect but puts the real
 * publisher URL in its `url` parameter, so the origin can be recovered exactly.
 */
function resolveLink(link) {
  const raw = decodeEntities(link).trim();
  const embedded = raw.match(/[?&]url=([^&]+)/);
  if (!embedded) return raw;
  try {
    return decodeURIComponent(embedded[1]);
  } catch (e) {
    return raw;
  }
}

function parseFeed(xml) {
  const blocks = String(xml || '').match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  return blocks.map((raw) => ({
    title: cleanText(pickTag(raw, 'title')),
    url: resolveLink(pickTag(raw, 'link')),
    date: cleanText(pickTag(raw, 'pubDate')),
    sourceLabel: cleanText(pickTag(raw, 'News:Source')),
    summary: cleanText(pickTag(raw, 'description')).replace(/\s*\.\.\.$/, '…'),
  }));
}

// ---------------------------------------------------------------------------
// Lead images
// ---------------------------------------------------------------------------

/**
 * Bing's RSS carries a headline, an excerpt and a link — no image — so the
 * article's own lead image is read from the Open Graph / Twitter card tags the
 * publisher already emits for social link previews. That is what makes the
 * preview the publisher's own picture of that story instead of a stock stand-in.
 *
 * Two of the newsrooms here serve those tags only to recognised preview
 * crawlers, so the lookup falls back to the two crawler identities whose whole
 * purpose is reading exactly these tags. The browser identity is tried first
 * because it is the honest one for a server-side fetch, and a readable response
 * with no tags ends the chain — a normal page therefore costs one request.
 */
const IMAGE_USER_AGENTS = [
  USER_AGENT,
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Mozilla/5.0 (compatible; Twitterbot/1.0)',
];

// Ordered most-specific first: og:image:secure_url before og:image, and both
// attribute orders, because publishers emit the content attribute on either side.
const IMAGE_PATTERNS = [
  /<meta[^>]+property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image:secure_url["']/i,
  /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
  /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
  /<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
];

const IMAGE_TIMEOUT_MS = 20000;
// Meta tags live in <head>; capping the body keeps a huge article (or an
// accidental binary response) from being buffered in full.
const IMAGE_HTML_LIMIT = 400000;
const IMAGE_CONCURRENCY = 6;
// Other outlets' links for the same story that may be tried when the surviving
// link yields no image (an MSN mirror, or a newsroom that blocks us entirely).
const IMAGE_STORY_ALTERNATES = 3;

/**
 * Absolute https URL, or ''.
 *
 * Relative and protocol-relative values are resolved against the article URL,
 * because publishers do emit both. Plain http is rejected rather than upgraded:
 * the site is served over HTTPS, so an http preview would be blocked as mixed
 * content — a silent blank image is worse than no preview at all.
 */
function normalizeImageUrl(raw, base) {
  const value = decodeEntities(String(raw == null ? '' : raw)).trim();
  if (!value || /^data:/i.test(value)) return '';
  try {
    const resolved = new URL(value, base || undefined);
    return resolved.protocol === 'https:' ? resolved.href : '';
  } catch (e) {
    return '';
  }
}

/** The article's own lead image, or '' when it publishes none. */
function extractLeadImage(html, base) {
  const head = String(html || '');
  for (const pattern of IMAGE_PATTERNS) {
    const match = head.match(pattern);
    if (match) {
      const image = normalizeImageUrl(match[1], base);
      if (image) return image;
    }
  }
  return '';
}

async function fetchLeadImageOnce(url, userAgent) {
  const res = await fetch(url, {
    headers: {
      'user-agent': userAgent,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'upgrade-insecure-requests': '1',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
  });
  if (!res.ok) return { status: res.status, image: '' };
  const html = (await res.text()).slice(0, IMAGE_HTML_LIMIT);
  return { status: res.status, image: extractLeadImage(html, url) };
}

/**
 * Lead image for one article URL, memoised for the life of a run so the same
 * link is never fetched twice.
 *
 * A response we could read (anything but 401/403) ends the chain: the page
 * simply carries no usable image, and asking again under another crawler
 * identity would be noise.
 */
async function fetchLeadImage(url, cache) {
  const key = String(url || '');
  if (!key) return '';
  if (cache && cache.has(key)) return cache.get(key);

  let found = '';
  for (const userAgent of IMAGE_USER_AGENTS) {
    let result;
    try {
      result = await fetchLeadImageOnce(key, userAgent);
    } catch (e) {
      continue; // timeout / DNS / reset — try the next identity
    }
    if (result.image) {
      found = result.image;
      break;
    }
    if (result.status !== 403 && result.status !== 401) break;
  }

  if (cache) cache.set(key, found);
  return found;
}

/** Run `worker` over `values` with a bounded number of in-flight requests. */
async function mapLimit(values, limit, worker) {
  const queue = values.slice();
  const size = Math.max(1, Math.min(limit, queue.length || 1));
  const runners = [];
  for (let i = 0; i < size; i++) {
    runners.push(
      (async () => {
        while (queue.length) await worker(queue.shift());
      })()
    );
  }
  await Promise.all(runners);
}

/**
 * Attach the publisher's lead image to each curated item.
 *
 * A story filed by several outlets collapses to one card, so when the link that
 * survived curation yields nothing — an MSN mirror is client-rendered and
 * carries no tags at all — the other outlets' links for the same story are
 * tried before giving up. They illustrate the same event, so the preview stays
 * truthful, and a syndicated mirror no longer costs the card its picture.
 */
async function attachLeadImages(items, alternatesByUrl, cache) {
  await mapLimit(items, IMAGE_CONCURRENCY, async (item) => {
    const alternates = (alternatesByUrl && alternatesByUrl.get(item.url)) || [];
    const candidates = [item.url].concat(alternates).slice(0, IMAGE_STORY_ALTERNATES + 1);
    for (const url of candidates) {
      const image = await fetchLeadImage(url, cache);
      if (image) {
        item.image = image;
        return;
      }
    }
    item.image = '';
  });
  return items;
}

// ---------------------------------------------------------------------------
// Relevance + recency
// ---------------------------------------------------------------------------

function matchesAlbay(item) {
  return PLACE_RE.test(titleOf(item) || '');
}

// A publisher path like /2025/02/03/slug/ is the publisher's own record of when
// the article ran.
const URL_DATE_RE = /\/(20\d{2})\/(\d{2})\/(\d{2})(?:\/|$)/;
const DATE_TOLERANCE_MS = 3 * 86400000;

/**
 * Publication date, in milliseconds.
 *
 * Aggregators re-date an article when they re-crawl it, so a feed pubDate can
 * be years later than the story. When the article URL embeds its own YYYY/MM/DD
 * path and that disagrees with the feed by more than a few days, the publisher's
 * URL wins — otherwise syndicated re-crawls would surface years-old coverage as
 * breaking news, and would slip past the recency window.
 */
function publishedAt(item) {
  const feed = Date.parse(item.date || '');
  const feedValid = Number.isFinite(feed);
  const match = String(item.url || '').match(URL_DATE_RE);
  if (!match) return feedValid ? feed : NaN;

  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return feedValid ? feed : NaN;

  const fromUrl = Date.UTC(parseInt(match[1], 10), month - 1, day);
  if (!Number.isFinite(fromUrl)) return feedValid ? feed : NaN;
  if (!feedValid) return fromUrl;
  return Math.abs(feed - fromUrl) > DATE_TOLERANCE_MS ? fromUrl : feed;
}

function withinWindow(item, now, windowDays) {
  const t = publishedAt(item);
  if (!Number.isFinite(t)) return false;
  const age = now - t;
  return age >= -2 * 86400000 && age <= windowDays * 86400000;
}

function isUsable(item) {
  return Boolean(
    item.title &&
    item.summary &&
    item.url &&
    /^https?:\/\//i.test(item.url) &&
    !JUNK_TITLE_RE.test(item.title)
  );
}

// ---------------------------------------------------------------------------
// Duplicate-story collapsing
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'in',
  'on',
  'to',
  'and',
  'as',
  'at',
  'for',
  'with',
  'by',
  'over',
  'from',
  'its',
  'this',
  'that',
  'is',
  'are',
  'be',
  'new',
  'set',
  'amid',
  'into',
  'out',
  'up',
  'after',
  'before',
]);

/**
 * Most helpers here take a parsed article, but `isSameStory` is conveniently
 * called with two bare headlines. Accepting either shape in one place keeps
 * callers from silently comparing `"[object Object]"` to itself.
 */
function titleOf(value) {
  if (value && typeof value === 'object') return value.title;
  return value;
}

function titleTokens(title) {
  return new Set(
    String(titleOf(title) || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !STOP_WORDS.has(w))
  );
}

/**
 * Two headlines describe the same story when most of the shorter headline's
 * significant words appear in the other — e.g. "Albay declares state of
 * calamity over dengue outbreak" and "Albay under state of calamity as dengue
 * cases hit 1,785". Measured against the shorter set so a terse headline still
 * matches a verbose one.
 */
function isSameStory(a, b) {
  const A = titleTokens(a);
  const B = titleTokens(b);
  if (!A.size || !B.size) return false;
  let shared = 0;
  for (const word of A) if (B.has(word)) shared++;
  return shared / Math.min(A.size, B.size) >= 0.6;
}

/**
 * The deduped stories, each paired with the links of the other outlets that
 * filed the same story. Dedupe keeps the newest filing, which may be a mirror
 * that carries no image, so those alternates are what let the lead-image
 * lookup still find a picture for the event.
 */
function storyGroups(items) {
  const byDate = items.slice().sort((a, b) => publishedAt(b) - publishedAt(a));
  const groups = [];
  for (const item of byDate) {
    const duplicate = groups.find((group) => isSameStory(group.keep.title, item.title));
    if (duplicate) duplicate.alternates.push(item.url);
    else groups.push({ keep: item, alternates: [] });
  }
  return groups;
}

function dedupeStories(items) {
  return storyGroups(items).map((group) => group.keep);
}

// ---------------------------------------------------------------------------
// Attribution
// ---------------------------------------------------------------------------

// Newsrooms that syndicate through MSN still name the origin in the feed, so
// the label is used when the article host is a mirror rather than an origin.
const PUBLISHER_ALIASES = {
  'philippine daily inquirer': 'Philippine Daily Inquirer',
  'inquirer.net': 'Philippine Daily Inquirer',
  'inquirer business': 'Inquirer Business',
  'philippine news agency': 'Philippine News Agency',
  pna: 'Philippine News Agency',
  'philippine information agency': 'Philippine Information Agency',
  gov: 'Philippine Information Agency',
  'gma network': 'GMA News',
  'gma news': 'GMA News',
  gmanetwork: 'GMA News',
  'manila times': 'The Manila Times',
  manilatimes: 'The Manila Times',
  'manila standard': 'Manila Standard',
  manilastandard: 'Manila Standard',
  'manila bulletin': 'Manila Bulletin',
  'philippine star': 'The Philippine Star',
  'philstar.com': 'The Philippine Star',
  'daily tribune': 'Daily Tribune',
  'the daily tribune': 'Daily Tribune',
  'business mirror': 'BusinessMirror',
  businessmirror: 'BusinessMirror',
  'journal online': 'Journal Online',
  dzrh: 'DZRH News',
  rpnradio: 'RPN Radio',
  'the chronicle': 'The Chronicle',
  thechronicle: 'The Chronicle',
  msn: 'MSN News',
  'top gear philippines': 'Top Gear Philippines',
  'visayan daily star': 'The Visayan Daily Star',
  'the visayan daily star': 'The Visayan Daily Star',
  bulatlat: 'Bulatlat',
};

const HOST_PUBLISHERS = {
  'pna.gov.ph': 'Philippine News Agency',
  'pia.gov.ph': 'Philippine Information Agency',
  'newsinfo.inquirer.net': 'Philippine Daily Inquirer',
  'opinion.inquirer.net': 'Philippine Daily Inquirer',
  'business.inquirer.net': 'Inquirer Business',
  'cebudailynews.inquirer.net': 'Cebu Daily News',
  'gmanetwork.com': 'GMA News',
  'rappler.com': 'Rappler',
  'philstar.com': 'The Philippine Star',
  'manilatimes.net': 'The Manila Times',
  'manilastandard.net': 'Manila Standard',
  'businessmirror.com.ph': 'BusinessMirror',
  'mb.com.ph': 'Manila Bulletin',
  'tribune.net.ph': 'Daily Tribune',
  'rpnradio.com': 'RPN Radio',
  'dzrh.com.ph': 'DZRH News',
  'bulatlat.com': 'Bulatlat',
  'visayandailystar.com': 'The Visayan Daily Star',
  'thechronicle.com.ph': 'The Chronicle',
  'journal.com.ph': 'Journal Online',
  'topgear.com.ph': 'Top Gear Philippines',
  'smninewschannel.com': 'SMNI News Channel',
};

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch (e) {
    return '';
  }
}

/** Resolve the publishing newsroom: URL host first, feed label second. */
function canonicalSource(item) {
  const host = hostOf(item.url);
  if (HOST_PUBLISHERS[host]) return HOST_PUBLISHERS[host];

  const label = String(item.sourceLabel || '')
    .replace(/\s+on\s+MSN$/i, '')
    .trim()
    .toLowerCase();
  if (PUBLISHER_ALIASES[label]) return PUBLISHER_ALIASES[label];
  if (label)
    return String(item.sourceLabel)
      .replace(/\s+on\s+MSN$/i, '')
      .trim();
  return host || 'News';
}

// ---------------------------------------------------------------------------
// Classification — deterministic, first rule wins
// ---------------------------------------------------------------------------

const NEWS_CATEGORY_RULES = [
  {
    category: 'Disaster',
    badge: 'warning',
    keywords: [
      'mayon',
      'volcan',
      'phivolcs',
      'ashfall',
      'ash fall',
      'ash plume',
      'ash emission',
      'eruption',
      'lava',
      'lahar',
      'alert level',
      'typhoon',
      'storm surge',
      'tropical depression',
      'flood',
      'landslide',
      'evacuat',
      'earthquake',
      'tsunami',
      'wildfire',
      'calamity',
      'heavy rain',
    ],
  },
  {
    category: 'Health',
    badge: 'warning',
    keywords: [
      'dengue',
      'outbreak',
      'epidemic',
      'pandemic',
      'measles',
      'influenza',
      'cholera',
      'disease',
      'virus',
      'vaccin',
      'hospital',
      'health',
      'medical',
      'medicine',
      'patient',
      'nutrition',
      'sanitation',
      'ambulance',
    ],
  },
  {
    category: 'Public Safety',
    badge: 'warning',
    keywords: [
      'police',
      'cops',
      'arrest',
      'nabbed',
      'suspect',
      'crime',
      'robbery',
      'shabu',
      'drug',
      'illegal drug',
      'killed',
      'clash',
      'rebel',
      'shooting',
      'stabbing',
      'accident',
      'injured',
      'rescue',
      'missing',
      'wanted',
    ],
  },
  {
    category: 'Infrastructure',
    badge: 'success',
    keywords: [
      'construction',
      'construct',
      'groundbreak',
      'inaugurat',
      'ribbon',
      'turnover',
      'turn-over',
      'turn over',
      'completed',
      'completion',
      'rehabilitat',
      'concreting',
      'bridge',
      'road',
      'highway',
      'dike',
      'seaport',
      'airport',
      'water system',
      'farm-to-market',
      'dpwh',
      'infrastructure',
      'electrification',
      'connectivity',
      'solar',
      'renewable',
    ],
  },
  {
    category: 'Education',
    badge: 'info',
    keywords: [
      'school',
      'student',
      'pupil',
      'universit',
      'college',
      'scholarship',
      'teacher',
      'education',
      'campus',
      'prisaa',
      'class suspension',
      'suspends classes',
      'graduat',
    ],
  },
  {
    category: 'Economy',
    badge: 'success',
    keywords: [
      'investment',
      'investor',
      'business',
      'econom',
      'inflation',
      'livelihood',
      'jobs',
      'employment',
      'market',
      'store',
      'enterprise',
      'tourism',
      'tourist',
      'revenue',
      'income',
      'trade',
      'export',
      'subsidy',
      'pension',
      'cash aid',
      'financial aid',
      'assistance',
      'empowers',
    ],
  },
  {
    category: 'Governance',
    badge: 'info',
    keywords: [
      'governor',
      'mayor',
      'vice mayor',
      'sangguniang',
      'board member',
      'ordinance',
      'resolution',
      'congressman',
      'representative',
      'senator',
      'dilg',
      'comelec',
      'election',
      'appoint',
      'oath',
      'proclaim',
      'holiday',
      'malacañang',
      'malacanang',
      'marcos',
      'declares',
      'budget',
      'sandiganbayan',
      'ombudsman',
      'graft',
      'court',
      'junks',
      'government',
      'capitol',
    ],
  },
  {
    category: 'Community',
    badge: 'success',
    keywords: [
      'festival',
      'fiesta',
      'celebration',
      'anniversary',
      'agri-festival',
      'parade',
      'concert',
      'exhibit',
      'games',
      'ceremony',
      'foundation',
      'brigade',
      'volunteer',
      'donat',
      'outreach',
      'medical mission',
      'serbisyo',
    ],
  },
  {
    category: 'Environment',
    badge: 'info',
    keywords: [
      'climate',
      'environment',
      'forest',
      'mangrove',
      'wildlife',
      'protected area',
      'pollution',
      'waste',
      'clean-up',
      'cleanup',
      'tree',
      'reef',
      'marine',
      'biodiversity',
    ],
  },
];

function classifyByRules(text) {
  for (const rule of NEWS_CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (text.indexOf(keyword) !== -1) return { category: rule.category, badge: rule.badge };
    }
  }
  return null;
}

/**
 * News headlines don't read like LGU Facebook posts, so they get their own
 * topic rules; the Facebook categorizer is still the final fallback so the two
 * feeds share a vocabulary and never disagree about a badge.
 *
 * The headline decides the topic. The excerpt is only consulted when the
 * headline alone is inconclusive, so that a passing mention of Mayon Volcano in
 * the body of a livelihood story doesn't retag it as a volcanic hazard.
 */
function classifyNews(item) {
  const title = String(item.title || '').toLowerCase();
  const full = `${title} ${String(item.summary || '')}`.toLowerCase();
  return classifyByRules(title) || classifyByRules(full) || categorize(full);
}

// ---------------------------------------------------------------------------
// Item construction
// ---------------------------------------------------------------------------

function slugify(title) {
  return String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
    .replace(/-+$/, '');
}

function shortHash(input) {
  let hash = 2166136261;
  const str = String(input || '');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

function toIsoDate(item) {
  const t = publishedAt(item);
  if (!Number.isFinite(t)) return '';
  return new Date(t).toISOString().slice(0, 10);
}

function toItem(item) {
  const { category, badge } = classifyNews(item);
  const title = collapseWhitespace(item.title);
  return {
    id: `news-${slugify(title)}-${shortHash(item.url)}`,
    title,
    date: toIsoDate(item),
    category,
    badge,
    summary: collapseWhitespace(item.summary),
    url: item.url,
    source: canonicalSource(item),
    // Filled in by attachLeadImages; '' means the publishers published no
    // usable lead image, which the renderers treat as "no preview".
    image: '',
  };
}

// ---------------------------------------------------------------------------
// Curation pipeline
// ---------------------------------------------------------------------------

/** Usable, Albay-relevant, in-window items, deduped by headline. */
function relevantItems(rawItems, now, options) {
  const seen = new Set();
  const unique = [];

  for (const item of rawItems) {
    if (!isUsable(item) || !matchesAlbay(item) || !withinWindow(item, now, options.windowDays))
      continue;
    const key = slugify(item.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function curate(rawItems, now, options) {
  const items = dedupeStories(relevantItems(rawItems, now, options))
    .map(toItem)
    .filter(isValidItem);

  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, options.maxItems);
}

/**
 * `kept article URL -> the other outlets' URLs for the same story`, so the
 * lead-image lookup can fall back past a mirror that carries no preview tags.
 */
function storyAlternates(rawItems, now, options) {
  const map = new Map();
  for (const group of storyGroups(relevantItems(rawItems, now, options))) {
    map.set(group.keep.url, group.alternates.filter(Boolean));
  }
  return map;
}

// ---------------------------------------------------------------------------
// Merge: preserve Facebook + hand-curated entries, replace prior news entries
// ---------------------------------------------------------------------------

function mergeNews(existing, fresh, maxItems) {
  const others = (existing || []).filter((entry) => !String(entry.id || '').startsWith('news-'));
  const mine = fresh
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, maxItems);
  return others.concat(mine).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchFeed(query, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(FEED_ENDPOINT + encodeURIComponent(query), {
        headers: {
          'user-agent': USER_AGENT,
          accept: 'application/rss+xml, application/xml, text/xml',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      if (!/<item[\s>]/i.test(xml)) throw new Error('no <item> elements in response');
      return parseFeed(xml);
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const delay = Math.min(800 * Math.pow(2, attempt), 4000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

async function loadFixtures() {
  const saved = JSON.parse(fs.readFileSync(CONFIG.fixture, 'utf8'));
  const feeds = Array.isArray(saved) ? saved : saved.feeds || [];
  return feeds.map(parseFeed);
}

async function collect() {
  if (CONFIG.fixture) {
    console.log('Using fixture:', CONFIG.fixture);
    return loadFixtures();
  }

  const queries = CONFIG.queries.length ? CONFIG.queries : DEFAULT_QUERIES;
  const batches = [];
  let failures = 0;

  for (const query of queries) {
    try {
      const items = await fetchFeed(query);
      batches.push(items);
      console.log(`  ${query.padEnd(20)} ${String(items.length).padStart(3)} items`);
    } catch (err) {
      failures++;
      console.warn(`  ${query.padEnd(20)} failed: ${err.message}`);
    }
  }

  if (failures === queries.length) throw new Error('every feed query failed');
  return batches.flat();
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

function readExisting() {
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.newsPath, 'utf8'));
    return (data && data.news) || [];
  } catch (e) {
    return [];
  }
}

const ENVELOPE_NOTE =
  "Headlines, excerpts and links are the publishers' own, collected from the Bing News RSS " +
  'endpoint. Every headline names Albay or one of its 18 cities and municipalities, duplicates ' +
  'of the same story across outlets are collapsed, and excerpts are shown as syndicated (a ' +
  "trailing ellipsis means the excerpt is truncated). `image` is the publisher's own lead image " +
  'for that story, read from the Open Graph / Twitter card tags it publishes for link previews ' +
  '(an empty string means no such image was published or reachable). This file is generated by ' +
  'scripts/sync-news.js — edit that script, not this file.';

function serialize(news, retrieved) {
  return (
    JSON.stringify(
      {
        _status: 'verified',
        _retrieved: retrieved,
        _source: 'Bing News RSS (publisher headlines, excerpts and links)',
        _notes: ENVELOPE_NOTE,
        news,
      },
      null,
      2
    ) + '\n'
  );
}

function writeAtomic(filePath, content) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, filePath);
}

function reportChanged(changed) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed ? 'true' : 'false'}\n`);
  }
}

/**
 * NEWS_ENRICH_ONLY: no feed fetch — read the published file and fill in the
 * lead image on items that do not have one yet. Used to backfill images onto a
 * feed that was collected before the images existed, and to retry the ones
 * whose publisher was briefly unreachable.
 */
async function enrichExisting() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(CONFIG.newsPath, 'utf8'));
  } catch (e) {
    console.warn(`Could not read ${CONFIG.newsPath} — nothing to enrich.`);
    reportChanged(false);
    return;
  }

  const news = (data && data.news) || [];
  const targets = news.filter((item) => item && item.url && !item.image);
  if (!targets.length) {
    console.log('Every item already has a lead image — nothing to do.');
    reportChanged(false);
    return;
  }

  const cache = new Map();
  await attachLeadImages(targets, new Map(), cache);
  const found = targets.filter((item) => item.image).length;
  console.log(`  ${found}/${targets.length} missing lead images resolved.`);

  // The stored _retrieved date is kept: an enrich run adds pictures to the
  // stories already published, it does not re-date the collection.
  const next = serialize(news, data._retrieved || new Date().toISOString().slice(0, 10));
  let current = '';
  try {
    current = fs.readFileSync(CONFIG.newsPath, 'utf8');
  } catch (e) {
    /* handled above */
  }

  if (next === current) {
    console.log('No changes — news.json already up to date.');
    reportChanged(false);
    return;
  }

  if (CONFIG.dryRun) {
    console.log('Dry run — not writing.');
    reportChanged(false);
    return;
  }

  writeAtomic(CONFIG.newsPath, next);
  console.log(`Wrote ${CONFIG.newsPath}: ${news.length} items.`);
  reportChanged(true);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const now = Date.now();
  const retrieved = new Date(now).toISOString().slice(0, 10);

  if (CONFIG.enrichOnly) {
    console.log('Enrich-only run: adding missing lead images to the existing feed.');
    await enrichExisting();
    return;
  }

  console.log(`Collecting Albay coverage (window: ${CONFIG.windowDays} days)…`);
  const raw = await collect();
  console.log(`  ${raw.length} raw items.`);

  const curated = curate(raw, now, CONFIG);
  console.log(`  ${curated.length} items after relevance, recency and duplicate-story filtering.`);

  if (curated.length === 0) {
    console.warn('Nothing survived curation — leaving existing news.json untouched.');
    reportChanged(false);
    return;
  }

  if (CONFIG.skipImages) {
    console.log('  lead images skipped (NEWS_SKIP_IMAGES=1).');
  } else {
    // Alternates come from the raw feed, not the curated list: curation has
    // already dropped the other outlets' filings of each story.
    const cache = new Map();
    await attachLeadImages(curated, storyAlternates(raw, now, CONFIG), cache);
    console.log(
      `  ${curated.filter((item) => item.image).length}/${curated.length} items have a publisher lead image.`
    );
  }

  const merged = mergeNews(readExisting(), curated, CONFIG.maxItems);
  if (CONFIG.dryRun) {
    console.log(serialize(merged, retrieved));
    reportChanged(false);
    return;
  }

  const next = serialize(merged, retrieved);
  let current = '';
  try {
    current = fs.readFileSync(CONFIG.newsPath, 'utf8');
  } catch (e) {
    /* first run */
  }

  if (next === current) {
    console.log('No changes — news.json already up to date.');
    reportChanged(false);
    return;
  }

  writeAtomic(CONFIG.newsPath, next);
  const newsCount = merged.filter((e) => String(e.id).startsWith('news-')).length;
  console.log(
    `Wrote ${CONFIG.newsPath}: ${merged.length} items (${newsCount} news, ${merged.length - newsCount} other).`
  );
  reportChanged(true);
}

module.exports = {
  CONFIG,
  DEFAULT_QUERIES,
  decodeEntities,
  stripTags,
  cleanText,
  resolveLink,
  parseFeed,
  matchesAlbay,
  publishedAt,
  withinWindow,
  isUsable,
  titleTokens,
  isSameStory,
  storyGroups,
  dedupeStories,
  relevantItems,
  storyAlternates,
  extractLeadImage,
  normalizeImageUrl,
  attachLeadImages,
  fetchLeadImage,
  mapLimit,
  canonicalSource,
  classifyNews,
  classifyByRules,
  slugify,
  shortHash,
  toItem,
  curate,
  mergeNews,
  serialize,
};

if (require.main === module) {
  main().catch((err) => {
    console.error('Sync failed:', err.message);
    process.exit(1);
  });
}
