/**
 * One-shot content fill for the Services category pages.
 *
 * `assets/js/translations.js` already carried the full key scaffold for the ten
 * Services categories (`cert-`, `biz-`, `tax-`, `social-`, `health-`, `agri-`,
 * `infra-`, `edu-`, `safety-`, `env-` x `page-title` / `page-desc` /
 * `page-badge`), but every one of those keys held the placeholder string
 * "Information pending verification." - the same value as the ~2,800 other
 * unimplemented keys. This script gives the Services ones real text, in all
 * three languages, and adds the handful of new keys the category layout needs.
 *
 * Values are deliberately factual and non-numeric: they describe what each
 * category covers, and never state a fee or a processing time. Those stay in
 * `data/services.json`, where a test pins them to "Not verified" until a real
 * figure is sourced.
 *
 * Titles reuse the `category` values already present in `data/services.json`,
 * so the page heading and the data cannot drift apart.
 *
 * Run: node scripts/fill-services-i18n.js
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TABLE = path.resolve(__dirname, '../assets/js/translations.js');

/** Categories, keyed by the i18n prefix their scaffold already uses. */
const CATEGORIES = {
  cert: {
    en: [
      'Certificates & Vital Records',
      'Certificates',
      'Documents issued by the Local Civil Registrar and by barangay offices.',
    ],
    fil: [
      'Mga Sertipiko at Mahahalagang Rekord',
      'Mga Sertipiko',
      'Mga dokumentong inisyu ng Local Civil Registrar at ng mga barangay.',
    ],
    bcl: [
      'Mga Sertipiko asin Mahahalagang Rekord',
      'Mga Sertipiko',
      'Mga dokumentong ipinupublikar kan Local Civil Registrar asin kan mga barangay.',
    ],
  },
  biz: {
    en: [
      'Business, Trade & Investment',
      'Business',
      'Permits, licences and registrations for operating a business in Albay.',
    ],
    fil: [
      'Negosyo, Kalakalan at Pamumuhunan',
      'Negosyo',
      'Mga permit, lisensya at rehistro para sa pagpapatakbo ng negosyo sa Albay.',
    ],
    bcl: [
      'Negosyo, Kalakalan asin Pamumuhunan',
      'Negosyo',
      'Mga permit, lisensya asin rehistro para sa pagpadalagan nin negosyo sa Albay.',
    ],
  },
  tax: {
    en: [
      'Taxation & Payments',
      'Tax Payments',
      'Property, business and other payments collected by the Provincial Treasurer.',
    ],
    fil: [
      'Pagbubuwis at Pagbabayad',
      'Pagbabayad ng Buwis',
      'Mga bayarin sa ari-arian, negosyo at iba pang koleksyon ng Provincial Treasurer.',
    ],
    bcl: [
      'Pagbubuwis asin Pagbabayad',
      'Pagbabayad nin Buwis',
      'Mga bayad sa propyedad, negosyo asin iba pang koleksyon kan Provincial Treasurer.',
    ],
  },
  social: {
    en: [
      'Social Services & Assistance',
      'Social Services',
      'Assistance programmes for residents in need, through the MSWDO.',
    ],
    fil: [
      'Serbisyong Panlipunan at Tulong',
      'Serbisyong Panlipunan',
      'Mga programang tulong para sa mga residenteng nangangailangan, sa pamamagitan ng MSWDO.',
    ],
    bcl: [
      'Serbisyong Panlipunan asin Tabang',
      'Serbisyong Panlipunan',
      'Mga programang tabang para sa mga residenteng nangangaipo, paagi sa MSWDO.',
    ],
  },
  health: {
    en: [
      'Health & Wellness',
      'Health',
      'Health services, health certificates and medical assistance.',
    ],
    fil: [
      'Kalusugan at Kagalingan',
      'Kalusugan',
      'Mga serbisyong pangkalusugan, sertipiko pangkalusugan at tulong medikal.',
    ],
    bcl: [
      'Kalusugan asin Karahayan',
      'Kalusugan',
      'Mga serbisyong pangkalusugan, sertipiko pangkalusugan asin tabang medikal.',
    ],
  },
  agri: {
    en: [
      'Agriculture & Economic Development',
      'Agriculture',
      'Support and assistance for farmers, fisherfolk and agricultural livelihoods.',
    ],
    fil: [
      'Agrikultura at Pag-unlad Pang-ekonomiya',
      'Agrikultura',
      'Suporta at tulong para sa mga magsasaka, mangingisda at kabuhayang pang-agrikultura.',
    ],
    bcl: [
      'Agrikultura asin Pag-uswag Pang-ekonomiya',
      'Agrikultura',
      'Suporta asin tabang para sa mga parauma, parasira asin kabuhayan na pang-agrikultura.',
    ],
  },
  infra: {
    en: [
      'Infrastructure & Public Works',
      'Infrastructure',
      'Building, occupancy and public works services from the Engineering Office.',
    ],
    fil: [
      'Imprastraktura at Pagawain Publiko',
      'Imprastraktura',
      'Mga serbisyo sa gusali, occupancy at pagawain publiko mula sa Engineering Office.',
    ],
    bcl: [
      'Imprastraktura asin Gibuhon Publiko',
      'Imprastraktura',
      'Mga serbisyo sa gusali, occupancy asin gibuhon publiko hali sa Engineering Office.',
    ],
  },
  edu: {
    en: [
      'Education & Scholarship',
      'Education',
      'Scholarship and student assistance programmes for Albay residents.',
    ],
    fil: [
      'Edukasyon at Iskolarship',
      'Edukasyon',
      'Mga programa ng iskolarship at tulong sa mag-aaral para sa mga residente ng Albay.',
    ],
    bcl: [
      'Edukasyon asin Iskolarship',
      'Edukasyon',
      'Mga programa nin iskolarship asin tabang sa estudyante para sa mga residente kan Albay.',
    ],
  },
  safety: {
    en: [
      'Public Safety & Security',
      'Public Safety',
      'Emergency response and disaster preparedness services.',
    ],
    fil: [
      'Kaligtasan at Seguridad Publiko',
      'Kaligtasan Publiko',
      'Mga serbisyo sa pagtugon sa emergency at paghahanda sa sakuna.',
    ],
    bcl: [
      'Kaligtasan asin Seguridad Publiko',
      'Kaligtasan Publiko',
      'Mga serbisyo sa pagtugon sa emergency asin pag-andam sa kalamidad.',
    ],
  },
  env: {
    en: [
      'Environment & Natural Resources',
      'Environment',
      'Environmental permits and waste management services.',
    ],
    fil: [
      'Kapaligiran at Likas na Yaman',
      'Kapaligiran',
      'Mga permit pangkapaligiran at serbisyo sa pamamahala ng basura.',
    ],
    bcl: [
      'Kapalibutan asin Likas na Yaman',
      'Kapalibutan',
      'Mga permit pangkapalibutan asin serbisyo sa pagmaneho nin basura.',
    ],
  },
};

/** Label and notice keys the new layout needs. */
const COMMON = {
  en: {
    'label-fee': 'Fee:',
    'label-time': 'Time:',
    'offices-title': 'Responsible Offices',
    'svc-verification-notice':
      'Requirements, fees and processing times for Albay services have not been verified. Confirm them with the responsible office before applying.',
    'svc-loading': 'Loading services...',
    'svc-empty': 'No services are listed for this category yet.',
  },
  fil: {
    'label-fee': 'Bayad:',
    'label-time': 'Oras:',
    'offices-title': 'Mga Responsableng Opisina',
    'svc-verification-notice':
      'Ang mga kinakailangan, bayad at oras ng pagproseso para sa mga serbisyo ng Albay ay hindi pa na-verify. Kumpirmahin ang mga ito sa responsableng opisina bago mag-apply.',
    'svc-loading': 'Naglo-load ng mga serbisyo...',
    'svc-empty': 'Wala pang nakalistang serbisyo sa kategoryang ito.',
  },
  bcl: {
    'label-fee': 'Bayad:',
    'label-time': 'Oras:',
    'offices-title': 'Mga Responsableng Opisina',
    'svc-verification-notice':
      'An mga kinakaipuhan, bayad asin oras kan pagproseso para sa mga serbisyo kan Albay dai pa na-beripikar. Kumpirmaron an mga ini sa responsableng opisina bago mag-apply.',
    'svc-loading': 'Naglo-load nin mga serbisyo...',
    'svc-empty': 'Wara pa nakalista na serbisyo sa kategoryang ini.',
  },
};

const LANGS = ['en', 'fil', 'bcl'];

/** Escapes a value for a single-quoted JS string. */
function quote(value) {
  return "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

/**
 * Replaces the value bound to `<key>`, keeping the key's indentation.
 *
 * Prettier has wrapped some of the long values in this table across two lines,
 * so the value is located by scanning for its closing quote rather than by
 * matching a single line.
 */
function setKey(block, key, value) {
  const at = block.indexOf(`'${key}':`);
  if (at === -1) return { block, changed: false };

  const lineStart = block.lastIndexOf('\n', at) + 1;
  const indent = block.slice(lineStart, at);

  // Only rewrite when the key genuinely opens its own line.
  if (!/^\s*$/.test(indent)) return { block, changed: false };

  let cursor = at + key.length + 3;
  while (cursor < block.length && /\s/.test(block[cursor])) cursor += 1;
  if (block[cursor] !== "'") return { block, changed: false };

  // Walk to the closing quote, skipping over escaped characters.
  cursor += 1;
  while (cursor < block.length) {
    if (block[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (block[cursor] === "'") break;
    cursor += 1;
  }

  let after = cursor + 1;
  if (block[after] === ',') after += 1;

  return {
    block: block.slice(0, lineStart) + `${indent}'${key}': ${quote(value)},` + block.slice(after),
    changed: true,
  };
}

function main() {
  // The span offsets shift as blocks grow, so apply language by language,
  // re-locating the table each time rather than trying to batch it.
  let source = fs.readFileSync(TABLE, 'utf8');
  const summary = [];

  for (const lang of LANGS) {
    const tableStart = source.indexOf('const translations = {');
    const tableEnd = source.indexOf('\n};', tableStart);
    const body = source.slice(tableStart, tableEnd + 3);

    const start = body.indexOf(`\n  ${lang}: {`);
    if (start === -1) throw new Error(`could not find the "${lang}" block`);

    // The block runs to the next language opener, or to the table's end.
    const following = LANGS.slice(LANGS.indexOf(lang) + 1)
      .map((next) => body.indexOf(`\n  ${next}: {`))
      .filter((at) => at !== -1);
    const end = following.length ? Math.min(...following) : body.length;

    let block = body.slice(start, end);
    let replaced = 0;
    let inserted = 0;

    for (const [prefix, values] of Object.entries(CATEGORIES)) {
      const [title, badge, desc] = values[lang];

      for (const [suffix, value] of [
        ['page-title', title],
        ['page-badge', badge],
        ['page-desc', desc],
      ]) {
        const result = setKey(block, `${prefix}-${suffix}`, value);
        block = result.block;
        if (result.changed) replaced += 1;
      }
    }

    for (const [key, value] of Object.entries(COMMON[lang])) {
      const result = setKey(block, key, value);

      if (result.changed) {
        block = result.block;
        replaced += 1;
      } else {
        const opener = `\n  ${lang}: {`;
        const at = block.indexOf(opener);
        block =
          block.slice(0, at + opener.length) +
          `\n    '${key}': ${quote(value)},` +
          block.slice(at + opener.length);
        inserted += 1;
      }
    }

    source = source.slice(0, tableStart + start) + block + source.slice(tableStart + end);
    summary.push(`${lang}: ${replaced} replaced, ${inserted} added`);
  }

  fs.writeFileSync(TABLE, source);
  console.log(summary.join('\n'));
}

main();
