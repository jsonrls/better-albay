# News Curation Workflow

How the **Latest Updates** (homepage) and **News** page are kept up to date.

## How it works

Both sections are rendered by [`assets/js/news.js`](../assets/js/news.js) from a single
file: [`data/news.json`](../data/news.json). The homepage shows the 3 most recent items;
the News page shows all of them, newest first. No backend is involved — it is a static
JSON file served from cPanel.

To avoid hand-editing JSON, use the curation tool:

```
admin/news-editor.html
```

This is an **internal tool**. It is excluded from the production build
([`build.sh`](../build.sh)), so it is never deployed publicly. You run it locally.

## Adding or editing an update

1. Start the local server from the project root:

   ```bash
   npm run dev          # serves on http://localhost:8000
   ```

2. Open **<http://localhost:8000/admin/news-editor.html>**. It loads the current
   `data/news.json` automatically.
3. Click **Add new update** (or **Edit** on an existing entry) and fill in:
   - **Title** (≤120 chars) and **Summary** (≤300 chars)
   - **Date**, **Category label**, and **Badge color** (`info` blue / `success` green
     / `warning` amber — common categories auto-pick a color)
   - **Link URL** (optional) — e.g. the original Facebook post; adds a "Read more" link
     on the News page card and makes the homepage title link out
   - **ID** auto-fills from the title and must be unique
     The live preview shows the resulting News-page card. Validation blocks bad entries.
4. Click **Save update**.
5. Click **Download news.json**.
6. Replace [`data/news.json`](../data/news.json) with the downloaded file, commit, and
   deploy (`npm run build` → upload `dist/`).

`Copy JSON` and `Import file…` are available if you prefer pasting, or want to resume
editing a file you saved earlier.

## Schema

```jsonc
{
  "news": [
    {
      "id": "unique-slug", // required, lowercase + dashes
      "title": "string", // required, ≤120 chars
      "date": "YYYY-MM-DD", // required
      "category": "Announcement", // required label shown on the badge
      "badge": "info", // required: info | success | warning
      "summary": "string", // required, ≤300 chars
      "url": "https://...", // optional outbound link (or null)
      "source": "View on Facebook", // optional link label (defaults to "Read more")
    },
  ],
}
```

`news.js` escapes all fields before rendering and ignores non-`http(s)` URLs, so the
feed is safe even if an automated source appends items in the same shape.

## Automated sources

`data/news.json` is fed by two scripts that write the same array and merge with each
other automatically. Each owns a distinct id prefix, and each preserves the other's
items plus anything hand-curated, so the file never loses entries.

| Script                     | Id prefix | Source                         | Credentials       |
| -------------------------- | --------- | ------------------------------ | ----------------- |
| `scripts/sync-news.js`     | `news-`   | Bing News RSS (press coverage) | none              |
| `scripts/sync-facebook.js` | `fb-`     | Facebook Graph API (LGU page)  | `FB_ACCESS_TOKEN` |
| `admin/news-editor.html`   | any       | manual curation                | none              |

Both run on a schedule via [`news-sync.yml`](../.github/workflows/news-sync.yml) and
[`facebook-sync.yml`](../.github/workflows/facebook-sync.yml). Those two workflows share
a `news-json` concurrency group, because both scripts read-modify-write the same file.

### The envelope

Every automated run rewrites the envelope around the array:

```jsonc
{
  "_status": "verified", // renderers refuse to display draft/unverified
  "_retrieved": "YYYY-MM-DD",
  "_source": "Bing News RSS (publisher headlines, excerpts and links)",
  "_notes": "...", // provenance + attribution policy
  "news": [], // the array from the schema above
}
```

`news.js` and `fb-feed.js` skip the whole payload when `_status` is `draft` or
`unverified`, and skip individual items carrying either value. Merging is therefore
status-blind by design: a run cannot resurrect withdrawn content, and cannot publish
unverified content.

### Press coverage — `scripts/sync-news.js`

No credentials required. Queries the Bing News RSS endpoint once per Albay LGU
(24 queries), then keeps only items that pass all of these rules:

- **Attributable.** The title, excerpt and link are the publisher's own, as syndicated.
  Nothing is generated, rewritten or extrapolated. The excerpt is truncated at 300
  characters, with a trailing `…` marking a truncation, never a quotation.
- **Geographically scoped.** The _headline alone_ must name Albay or one of its 18
  cities and municipalities. Excerpts are boilerplate-heavy and are deliberately not
  used for this test, so region-wide and neighbouring-province stories stay out.
- **Current.** Within `NEWS_WINDOW_DAYS` (default 180). The publisher's own `YYYY/MM/DD`
  URL path overrides the feed's pubDate, so an aggregator that re-crawls an old article
  cannot present years-old coverage as breaking news.
- **One card per story.** Headlines from different outlets are collapsed when 60% of the
  shorter headline's significant words also appear in the other.
- **Not a service page.** Weather forecasts, horoscopes and lottery results are dropped.

Each item is badged by an ordered keyword rule set over the headline, falling back to
`categorize()` from `sync-facebook.js` so both feeds share one vocabulary. Source labels
resolve from the URL host first (`pna.gov.ph` → _Philippine News Agency_) and the feed's
syndication label second, so an MSN mirror still credits the newsroom that filed it.

Configuration:

| Variable           | Default          | Purpose                                    |
| ------------------ | ---------------- | ------------------------------------------ |
| `NEWS_WINDOW_DAYS` | `180`            | Recency window in days                     |
| `NEWS_MAX_ITEMS`   | `60`             | Cap on published items                     |
| `NEWS_JSON_PATH`   | `data/news.json` | Output path                                |
| `NEWS_QUERIES`     | 24 LGU queries   | Comma-separated query override             |
| `NEWS_FIXTURE`     | –                | `{ "feeds": [...] }` to bypass the network |
| `NEWS_DRY_RUN`     | –                | `1` prints the result without writing      |

```bash
node scripts/sync-news.js          # fetch, curate, merge, write if changed
NEWS_DRY_RUN=1 node scripts/sync-news.js
```

Re-running is safe: the run replaces every `news-` item, keeps all others, and reports
`No changes` when the output is byte-identical. If every query fails it aborts without
touching the file, and if curation yields nothing it leaves the existing feed in place —
evidence the page reflects a real news cycle rather than a fetch failure.

`tests/unit/verified-content.test.cjs` guards this feed. It asserts the envelope, and
that every published item is renderable (`isValidItem`), uniquely and lowercase-identified,
inside the recency window, newest-first, badged from the allowed set, and headed by a
headline that names an Albay place.
