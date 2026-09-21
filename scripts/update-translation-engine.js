/**
 * Script to upgrade TranslationEngine with full automatic untagged translation,
 * URL query support, cross-app localStorage syncing, and Node.js safety.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TABLE = path.resolve(__dirname, '../assets/js/translations.js');
let source = fs.readFileSync(TABLE, 'utf8');

// 1. Ensure Node.js safety at the bottom of translations.js
const oldBottom = `// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    TranslationEngine.init();
  });
} else {
  TranslationEngine.init();
}`;

const newBottom = `// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      TranslationEngine.init();
    });
  } else {
    TranslationEngine.init();
  }
}`;

if (source.includes(oldBottom)) {
  source = source.replace(oldBottom, newBottom);
}

// 2. Add phraseDictionary and untagged translation methods to TranslationEngine
const engineTarget = `const TranslationEngine = {
  currentLang: 'en',
  defaultLang: 'en',
  supportedLangs: ['en', 'fil', 'bcl'],
  langNames: {
    en: 'English',
    fil: 'Filipino',
    bcl: 'Central Bikol',
  },
  langCodes: {
    en: 'en',
    fil: 'fil',
    bcl: 'bcl',
  },
  initialized: false,
  observers: [],`;

const engineReplacement = `const TranslationEngine = {
  currentLang: 'en',
  defaultLang: 'en',
  supportedLangs: ['en', 'fil', 'bcl'],
  langNames: {
    en: 'English',
    fil: 'Filipino',
    bcl: 'Central Bikol',
  },
  langCodes: {
    en: 'en',
    fil: 'fil',
    bcl: 'bcl',
  },
  initialized: false,
  observers: [],
  _enMap: null,

  phraseDictionary: {
    bcl: {
      'Civic Map of Albay': 'Mapa Sibiko kan Albay',
      'All (18 LGUs)': 'Gabos (18 LGU)',
      'Cities (3)': 'Mga Syudad (3)',
      'Municipalities (15)': 'Mga Banwaan (15)',
      'Capitol & Civic': 'Kapitolyo asin Sibiko',
      'Capitol &amp; Civic': 'Kapitolyo asin Sibiko',
      'Fit Entire Albay': 'Ibagay sa Enterong Albay',
      'Fit Entire Albay Province': 'Ibagay sa Enterong Probinsya nin Albay',
      'Directory': 'Direktoryo',
      'Province of Albay • 18 LGUs (3 Cities, 15 Municipalities)': 'Probinsya nin Albay • 18 LGU (3 Syudad, 15 Banwaan)',
      'Early Inhabitants & Pre-Colonial Era': 'Mga Enot na Nag-erok asin Panahon Bago an Kolonyal',
      'First Spanish Contact': 'Enot na Pakikipag-ugnayan sa mga Espanyol',
      'Inland Exploration and Settlement': 'Pagsusubaybay sa Kadagaan asin Pagpatindog nin Pamayanan',
      'Evangelization and Town Foundations': 'Ebanghelisasyon asin Pagtindog nin mga Banwaan',
      'Creation of Ibalon Province': 'Pagtugdas kan Probinsya nin Ibalon',
      'The Great Eruption of Mayon': 'An Makuring Pagputok kan Bulkan Mayon',
      'Administrative Reorganization': 'Administratibong Reorganisasyon',
      'The Philippine Revolution': 'An Rebolusyon kan Pilipinas',
      'American Occupation and Resistance': 'Pananakop kan Amerikano asin Pagtumang',
      'World War II Japanese Occupation': 'Ikaduwang Gerang Pangkinaban asin Pananakop kan Hapon',
      'The Cagsawa Legacy': 'An Pamana kan Cagsawa',
      'Last General to Surrender': 'Huring Heneral na Nagsuko',
      'Ancient Roots': 'Suanoy na Ginikanan',
      'Be Part of Something Greater': 'Maging Parte nin Mas Dakulang Katuyuhan',
      'Albay, Philippines deserves a world-class digital government. Help us build it.': 'Dapat sana sa Albay, Pilipinas an primera-klaseng digital na gobyerno. Tabangi kaming itindog ini.',
      'We are looking for passionate Albayanos who want to serve their community through their craft.': 'Naghahanap kami nin mga madunong asin maigot na Albayano na gustong magserbi sa saindang komunidad paagi sa saindang abilidad.',
      'Software Dev': 'Software Dev',
      'UI/UX Design': 'Disenyo nin UI/UX',
      'Graphic Design': 'Graphic Design',
      'Content Creation': 'Paggibo nin Kontento',
      'Digital Marketing': 'Digital Marketing',
      'I Want to Volunteer': 'Gusto Kong Magboluntaryo',
      'Maybe Later': 'Sa Sunod Na Lang',
      'National emergency: 911': 'Nasyonal na emerhensya: 911',
      'National emergency': 'Nasyonal na emerhensya',
      'All Albay hotlines': 'Gabos na Albay hotline',
      'Albay emergency hotlines': 'Mga Pang-emerhensyang Hotline kan Albay',
      'Call the appropriate office directly using the numbers below.': 'Tawagan tulos an tamang opisina gamit an mga numero sa ibaba.',
      'Search hotlines': 'Maghanap nin hotline',
      'Office, municipality, or number': 'Opisina, banwaan, o numero',
      'Category': 'Kategorya',
      'All categories': 'Gabos na kategorya',
      'Clear filters': 'Halion an mga filter',
      'Provincial emergency contacts (PDRRMC)': 'Mga kontak sa emerhensya kan probinsya (PDRRMC)',
      'LGU quick response teams': 'Mga quick response team kan LGU',
      'Rural health units': 'Mga yunit nin salud sa baryo (RHU)',
      'Municipal disaster response (MDRRMO)': 'Pang-sakunang reaksyon kan banwaan (MDRRMO)',
      'City disaster response (CDRRMO)': 'Pang-sakunang reaksyon kan syudad (CDRRMO)',
      'City and municipal mayor’s offices': 'Mga opisina kan alkalde sa syudad asin banwaan',
      'Hospitals': 'Mga Ospital',
      'Fire stations (BFP)': 'Mga istasyon nin bumbero (BFP)',
      'Police stations (PNP)': 'Mga istasyon nin pulis (PNP)',
      'Coast Guard': 'Coast Guard',
      'Social welfare offices (C/MSWDO)': 'Mga opisina kan social welfare (C/MSWDO)',
      'No hotlines match your search.': 'Mayong hotline na nagtutugma sa saindong paghanap.',
      'Try another office, municipality, or number, or clear your filters.': 'Magprobar nin ibang opisina, banwaan, o numero, o halion an mga filter.',
      'Jumping to a category clears filters.': 'An paglukso sa kategorya naghahali kan mga filter.',
      'Cost to the People of Albay =': 'Gastos sa mga Tawo kan Albay =',
      'Verify current information with the responsible government office.': 'Kumpirmaron an presenteng impormasyon sa responsableng opisina kan gobyerno.',
      'Official Albay government website': 'Opisyal na website kan gobyerno nin Albay',
      'Verified open data': 'Beripikadong bukas na datos',
      'Government Directory': 'Direktoryo kan Gobyerno',
      'Government Structure & Officials': 'Estruktura kan Gobyerno asin mga Opisyal',
      'Congressional Districts': 'Mga Distritong Kongresyonal',
      'Provincial Executives': 'Mga Ehekutibo kan Probinsya',
      'Provincial Board Members': 'Mga Miyembro kan Board kan Probinsya',
      'Cities & Municipalities': 'Mga Syudad asin Banwaan',
      'Documented Officials': 'Nailistang mga Opisyal',
      'Executive Branch': 'Sangay Ehekutibo',
      'Provincial Government Leadership': 'Pamamayo kan Gobyerno Probinsyal',
      'The executive leadership steering the Provincial Government of Albay (PGA)': 'An ehekutibong pamamayo na nagpapadalagan kan Gobyerno Probinsyal kan Albay (PGA)',
      'Legislative Branch': 'Sangay Lehislatibo',
      'Sangguniang Panlalawigan of Albay': 'Sangguniang Panlalawigan kan Albay',
      'House of Representatives': 'Kamara de Representantes',
      'Congressional Representatives': 'Mga Representante sa Kongreso',
      'Local Government Units': 'Mga Yunit nin Lokal na Gobyerno',
      'Component Cities': 'Mga Komponenteng Syudad',
      'Component Cities (3)': 'Mga Komponenteng Syudad (3)',
      'Municipalities': 'Mga Banwaan',
      'Municipalities (15)': 'Mga Banwaan (15)',
      'Provincial Governor': 'Gobernador kan Probinsya',
      'Provincial Vice Governor': 'Bise Gobernador kan Probinsya',
      'Mayor': 'Alkalde',
      'Vice Mayor': 'Bise Alkalde',
      'City Mayor': 'Alkalde kan Syudad',
      'City Vice Mayor': 'Bise Alkalde kan Syudad',
      'Municipal Mayor': 'Alkalde kan Banwaan',
      'Municipal Vice Mayor': 'Bise Alkalde kan Banwaan',
      'City Councilors': 'Mga Konsehal kan Syudad',
      'Municipal Councilors': 'Mga Konsehal kan Banwaan',
      'Regular Board Members': 'Mga Regular na Miyembro kan Board',
      'Ex-Officio Board Members': 'Mga Ex-Officio na Miyembro kan Board',
      'Albay Quiz': 'Albay Quiz',
      'Take the Quiz': 'Kuaon an Quiz',
      'Continue quiz': 'Ipadagos an Quiz',
      'View results': 'Hilingon an Resulta',
      'Quiz complete': 'Tapos na an Quiz',
      'Try again': 'Magprobar Ulit',
      'Close quiz': 'Isara an Quiz',
      'Close': 'Isara',
      'Recent Searches': 'Kag-nahanap na Bago',
      'Popular Searches': 'Mga Popular na Paghanap',
      'Clear': 'Halion',
      'All': 'Gabos',
      '5-Day Forecast': '5-Aldaw na Prediksyon',
      'Today': 'Ngonian',
      'Mon-Fri: 8:00 AM - 5:00 PM': 'Lunes-Biyernes: 8:00 AM - 5:00 PM',
      'Monday - Friday': 'Lunes - Biyernes',
      'Saturday & Sunday': 'Sabado asin Domingo',
      'Lunch Break': 'Pangudto',
      'Break': 'Pahuway',
      'National & Local Holidays': 'Nasyonal asin Lokal na Piyesta Opisyal',
      'Open': 'Bukas',
      'Closed': 'Sado',
      'Partly cloudy': 'May kadikit na panganuron',
      'Mainly clear': 'Haros maliwanag',
      'Clear sky': 'Maliwanag na kalangitan',
      'Overcast': 'Malandong',
      'Rain': 'Uran',
      'Light rain': 'Dumarag na uran',
      'Moderate rain': 'Kusog-kusog na uran',
      'Heavy rain': 'Mabagsik na uran',
      'Thunderstorm': 'Daguldol asin kilat',
    },
    fil: {
      'Civic Map of Albay': 'Sibikong Mapa ng Albay',
      'All (18 LGUs)': 'Lahat (18 LGU)',
      'Cities (3)': 'Mga Lungsod (3)',
      'Municipalities (15)': 'Mga Bayan (15)',
      'Capitol & Civic': 'Kapitolyo at Sibiko',
      'Capitol &amp; Civic': 'Kapitolyo at Sibiko',
      'Fit Entire Albay': 'Iakma sa Buong Albay',
      'Fit Entire Albay Province': 'Iakma sa Buong Lalawigan ng Albay',
      'Directory': 'Direktoryo',
      'Province of Albay • 18 LGUs (3 Cities, 15 Municipalities)': 'Lalawigan ng Albay • 18 LGU (3 Lungsod, 15 Bayan)',
      'Early Inhabitants & Pre-Colonial Era': 'Mga Unang Nanirahan at Panahon Bago ang Kolonyal',
      'First Spanish Contact': 'Unang Pakikipag-ugnayan sa mga Espanyol',
      'Inland Exploration and Settlement': 'Panggagalugad sa Loob ng Lupain at Pamayanan',
      'Evangelization and Town Foundations': 'Ebanghelisasyon at Pagtatatag ng mga Bayan',
      'Creation of Ibalon Province': 'Pagkakatatag ng Lalawigan ng Ibalon',
      'The Great Eruption of Mayon': 'Ang Malagim na Pagputok ng Bulkang Mayon',
      'Administrative Reorganization': 'Administratibong Muling Pag-oorganisa',
      'The Philippine Revolution': 'Ang Rebolusyong Pilipino',
      'American Occupation and Resistance': 'Pananakop ng Amerikano at Paglaban',
      'World War II Japanese Occupation': 'Ikalawang Digmaang Pandaigdig at Pananakop ng Hapon',
      'The Cagsawa Legacy': 'Ang Pamana ng Cagsawa',
      'Last General to Surrender': 'Huling Heneral na Sumuko',
      'Ancient Roots': 'Sinaunang Pinagmulan',
      'Be Part of Something Greater': 'Maging Bahagi ng Mas Dakilang Layunin',
      'Albay, Philippines deserves a world-class digital government. Help us build it.': 'Karapat-dapat ang Albay, Pilipinas sa isang world-class na digital na pamahalaan. Tulungan kaming itatag ito.',
      'We are looking for passionate Albayanos who want to serve their community through their craft.': 'Naghahanap kami ng mga masigasig na Albayano na nais maglingkod sa kanilang komunidad sa pamamagitan ng kanilang galing.',
      'Software Dev': 'Software Dev',
      'UI/UX Design': 'Disenyo ng UI/UX',
      'Graphic Design': 'Graphic Design',
      'Content Creation': 'Paggawa ng Nilalaman',
      'Digital Marketing': 'Digital Marketing',
      'I Want to Volunteer': 'Nais Kong Magboluntaryo',
      'Maybe Later': 'Mamaya Na Lang',
      'National emergency: 911': 'Pambansang emerhensiya: 911',
      'National emergency': 'Pambansang emerhensiya',
      'All Albay hotlines': 'Lahat ng Albay hotline',
      'Albay emergency hotlines': 'Mga pang-emerhensiyang hotline ng Albay',
      'Call the appropriate office directly using the numbers below.': 'Tawagan agad ang angkop na tanggapan gamit ang mga numero sa ibaba.',
      'Search hotlines': 'Maghanap ng hotline',
      'Office, municipality, or number': 'Tanggapan, bayan, o numero',
      'Category': 'Kategorya',
      'All categories': 'Lahat ng kategorya',
      'Clear filters': 'Linisin ang mga filter',
      'Provincial emergency contacts (PDRRMC)': 'Mga pang-emerhensiyang kontak ng lalawigan (PDRRMC)',
      'LGU quick response teams': 'Mga quick response team ng LGU',
      'Rural health units': 'Mga rural health unit (RHU)',
      'Municipal disaster response (MDRRMO)': 'Pagtugon sa sakuna ng bayan (MDRRMO)',
      'City disaster response (CDRRMO)': 'Pagtugon sa sakuna ng lungsod (CDRRMO)',
      'City and municipal mayor’s offices': 'Mga tanggapan ng alkalde sa lungsod at bayan',
      'Hospitals': 'Mga Ospital',
      'Fire stations (BFP)': 'Mga himpilan ng pamatay-sunog (BFP)',
      'Police stations (PNP)': 'Mga himpilan ng pulisya (PNP)',
      'Coast Guard': 'Tanod Baybayin (Coast Guard)',
      'Social welfare offices (C/MSWDO)': 'Mga tanggapan ng kagalingang panlipunan (C/MSWDO)',
      'No hotlines match your search.': 'Walang hotline na tumutugma sa iyong paghahanap.',
      'Try another office, municipality, or number, or clear your filters.': 'Subukan ang ibang tanggapan, bayan, o numero, o linisin ang mga filter.',
      'Jumping to a category clears filters.': 'Ang paglipat sa kategorya ay nag-aalis ng mga filter.',
      'Cost to the People of Albay =': 'Gastos sa Mamamayan ng Albay =',
      'Verify current information with the responsible government office.': 'Kumpirmahin ang kasalukuyang impormasyon sa responsableng tanggapan ng pamahalaan.',
      'Official Albay government website': 'Opisyal na website ng pamahalaan ng Albay',
      'Verified open data': 'Beripikadong bukas na datos',
      'Government Directory': 'Direktoryo ng Pamahalaan',
      'Government Structure & Officials': 'Balangkas ng Pamahalaan at mga Opisyal',
      'Congressional Districts': 'Mga Distritong Kongresyonal',
      'Provincial Executives': 'Mga Ehekutibo ng Lalawigan',
      'Provincial Board Members': 'Mga Kasapi ng Sangguniang Panlalawigan',
      'Cities & Municipalities': 'Mga Lungsod at Bayan',
      'Documented Officials': 'Naitatalang mga Opisyal',
      'Executive Branch': 'Sangay na Tagapagpaganap',
      'Provincial Government Leadership': 'Pamunuan ng Pamahalaang Panlalawigan',
      'The executive leadership steering the Provincial Government of Albay (PGA)': 'Ang ehekutibong pamunuan na nagpapatakbo sa Pamahalaang Panlalawigan ng Albay (PGA)',
      'Legislative Branch': 'Sangay na Tagapagbatas',
      'Sangguniang Panlalawigan of Albay': 'Sangguniang Panlalawigan ng Albay',
      'House of Representatives': 'Kapulungan ng mga Kinatawan',
      'Congressional Representatives': 'Mga Kinatawan sa Kongreso',
      'Local Government Units': 'Mga Yunit ng Lokal na Pamahalaan',
      'Component Cities': 'Mga Nakapaloob na Lungsod',
      'Component Cities (3)': 'Mga Nakapaloob na Lungsod (3)',
      'Municipalities': 'Mga Bayan',
      'Municipalities (15)': 'Mga Bayan (15)',
      'Provincial Governor': 'Gobernador ng Lalawigan',
      'Provincial Vice Governor': 'Bise Gobernador ng Lalawigan',
      'Mayor': 'Alkalde',
      'Vice Mayor': 'Bise Alkalde',
      'City Mayor': 'Alkalde ng Lungsod',
      'City Vice Mayor': 'Bise Alkalde ng Lungsod',
      'Municipal Mayor': 'Alkalde ng Bayan',
      'Municipal Vice Mayor': 'Bise Alkalde ng Bayan',
      'City Councilors': 'Mga Konsehal ng Lungsod',
      'Municipal Councilors': 'Mga Konsehal ng Bayan',
      'Regular Board Members': 'Mga Regular na Kasapi ng Sangguniang Panlalawigan',
      'Ex-Officio Board Members': 'Mga Ex-Officio na Kasapi ng Sangguniang Panlalawigan',
      'Albay Quiz': 'Pagsusulit sa Albay',
      'Take the Quiz': 'Kunin ang Pagsusulit',
      'Continue quiz': 'Ipagpatuloy ang Pagsusulit',
      'View results': 'Tingnan ang Resulta',
      'Quiz complete': 'Tapos na ang Pagsusulit',
      'Try again': 'Subukan Muli',
      'Close quiz': 'Isara ang Pagsusulit',
      'Close': 'Isara',
      'Recent Searches': 'Kamakailang Paghahanap',
      'Popular Searches': 'Mga Popular na Paghahanap',
      'Clear': 'Linisin',
      'All': 'Lahat',
      '5-Day Forecast': '5-Araw na Ulat Panahon',
      'Today': 'Ngayon',
      'Mon-Fri: 8:00 AM - 5:00 PM': 'Lunes-Biyernes: 8:00 AM - 5:00 PM',
      'Monday - Friday': 'Lunes - Biyernes',
      'Saturday & Sunday': 'Sabado at Linggo',
      'Lunch Break': 'Tanghalian',
      'Break': 'Pahinga',
      'National & Local Holidays': 'Pambansa at Lokal na Piyesta Opisyal',
      'Open': 'Bukas',
      'Closed': 'Sarado',
    }
  },`;

if (source.includes(engineTarget)) {
  source = source.replace(engineTarget, engineReplacement);
}

// 3. Add getUrlLanguage and update init/storage methods
const initOld = `  init: function () {
    if (this.initialized) return;

    // Try to get saved language, then browser preference
    let savedLang = this.readStoredLang();
    if (!savedLang || !this.supportedLangs.includes(savedLang)) {
      savedLang = this.detectBrowserLanguage();
    }

    this.currentLang = savedLang;
    this.applyTranslations(this.currentLang);
    this.updateActiveButton(this.currentLang);
    this.setupEventListeners();
    this.setupMutationObserver();
    this.initialized = true;

    console.log('[TranslationEngine] Initialized with language:', this.currentLang);
  },

  /**
   * Read the saved language preference.
   *
   * Touching localStorage at all — even \`typeof localStorage\` — throws in
   * Safari private browsing and wherever site data is blocked. Because init()
   * ran before anything else on the page, that exception took the whole
   * translation engine down with it and left the page untranslated.
   *
   * @returns {string|null} Saved language code, or null when unavailable
   */
  readStoredLang: function () {
    try {
      return localStorage.getItem('selectedLang');
    } catch (e) {
      return null;
    }
  },

  /**
   * Persist the language preference, tolerating blocked or full storage.
   * @param {string} lang - Language code to save
   */
  storeLang: function (lang) {
    try {
      localStorage.setItem('selectedLang', lang);
    } catch (e) {
      // Preference will not survive the session, but the switch still applies.
    }
  },`;

const initNew = `  /**
   * Read language code from URL query parameter (?lang=bcl)
   */
  getUrlLanguage: function () {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const lang = params.get('lang');
        if (lang && this.supportedLangs.includes(lang.toLowerCase())) {
          return lang.toLowerCase();
        }
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
    return null;
  },

  /**
   * Initialize the translation engine
   */
  init: function () {
    if (this.initialized) return;

    // Build English inverse lookup map
    this.buildEnglishInverseMap();

    // Check URL query (?lang=bcl), then saved storage, then browser language
    let lang = this.getUrlLanguage();
    if (!lang || !this.supportedLangs.includes(lang)) {
      lang = this.readStoredLang();
    }
    if (!lang || !this.supportedLangs.includes(lang)) {
      lang = this.detectBrowserLanguage();
    }

    this.currentLang = lang;
    this.applyTranslations(this.currentLang);
    this.updateActiveButton(this.currentLang);
    this.setupEventListeners();
    this.setupMutationObserver();
    this.initialized = true;

    console.log('[TranslationEngine] Initialized with language:', this.currentLang);
  },

  /**
   * Build inverse lookup map of English text -> translation key
   */
  buildEnglishInverseMap: function () {
    if (this._enMap) return;
    this._enMap = new Map();
    if (translations && translations.en) {
      for (const [key, val] of Object.entries(translations.en)) {
        if (typeof val === 'string' && val.length > 1 && !val.includes('pending verification')) {
          this._enMap.set(val.trim(), key);
        }
      }
    }
  },

  /**
   * Read the saved language preference.
   * Checks both 'selectedLang' and 'betteralbay_lang' for cross-app parity.
   */
  readStoredLang: function () {
    try {
      return localStorage.getItem('selectedLang') || localStorage.getItem('betteralbay_lang');
    } catch (e) {
      return null;
    }
  },

  /**
   * Persist the language preference, tolerating blocked or full storage.
   */
  storeLang: function (lang) {
    try {
      localStorage.setItem('selectedLang', lang);
      localStorage.setItem('betteralbay_lang', lang);
    } catch (e) {
      // Preference will not survive the session, but the switch still applies.
    }
  },`;

if (source.includes(initOld)) {
  source = source.replace(initOld, initNew);
}

// 4. Add translateUntaggedContent to applyTranslations
const applyOld = `    // Translate alt texts
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      self.translateElement(el, lang);
    });

    // Update document language attribute
    document.documentElement.lang = this.langCodes[lang] || lang;

    // Save preference
    this.currentLang = lang;
    this.storeLang(lang);`;

const applyNew = `    // Translate alt texts
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      self.translateElement(el, lang);
    });

    // Automatically translate untagged content across the whole page
    this.translateUntaggedContent(lang);

    // Update document language attribute
    document.documentElement.lang = this.langCodes[lang] || lang;

    // Save preference
    this.currentLang = lang;
    this.storeLang(lang);`;

if (source.includes(applyOld)) {
  source = source.replace(applyOld, applyNew);
}

// 5. Add translateUntaggedContent implementation
const untaggedMethod = `  /**
   * Translate untagged leaf elements across the page using the phrase dictionary
   * and the English-to-key inverse lookup map.
   */
  translateUntaggedContent: function (lang) {
    if (typeof document === 'undefined') return;
    this.buildEnglishInverseMap();
    const self = this;
    const isEn = lang === 'en';
    const phrases = (this.phraseDictionary && this.phraseDictionary[lang]) || {};

    const candidates = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, button, label, summary, dt, dd, strong, b, em, th, td, option');
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.hasAttribute('data-i18n') || el.closest('[data-no-auto-translate]')) continue;
      if (el.children.length > 0) continue;

      const raw = el.textContent || '';
      const text = raw.trim();
      if (!text || text.length < 2) continue;

      if (isEn) {
        if (el.hasAttribute('data-i18n-orig')) {
          el.textContent = el.getAttribute('data-i18n-orig');
          el.removeAttribute('data-i18n-orig');
        }
      } else {
        const orig = el.getAttribute('data-i18n-orig') || text;
        let translation = null;

        if (phrases[orig]) {
          translation = phrases[orig];
        } else if (self._enMap && self._enMap.has(orig)) {
          const key = self._enMap.get(orig);
          if (translations[lang] && translations[lang][key]) {
            translation = translations[lang][key];
          }
        }

        if (translation && translation !== orig) {
          if (!el.hasAttribute('data-i18n-orig')) {
            el.setAttribute('data-i18n-orig', orig);
          }
          el.textContent = translation;
        }
      }
    }

    // Also translate untagged input placeholders
    const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
    for (let i = 0; i < inputs.length; i++) {
      const inp = inputs[i];
      if (inp.hasAttribute('data-i18n-placeholder')) continue;
      const ph = (inp.getAttribute('placeholder') || '').trim();
      if (!ph) continue;

      if (isEn) {
        if (inp.hasAttribute('data-orig-ph')) {
          inp.placeholder = inp.getAttribute('data-orig-ph');
          inp.removeAttribute('data-orig-ph');
        }
      } else {
        const orig = inp.getAttribute('data-orig-ph') || ph;
        const tr = phrases[orig] || (self._enMap && self._enMap.has(orig) && translations[lang] && translations[lang][self._enMap.get(orig)]);
        if (tr && tr !== orig) {
          if (!inp.hasAttribute('data-orig-ph')) inp.setAttribute('data-orig-ph', orig);
          inp.placeholder = tr;
        }
      }
    }
  },
`;

const insertBeforeNotify = `  /**
   * Switch to a different language
   */
  switchLanguage: function (lang) {`;

if (source.includes(insertBeforeNotify)) {
  source = source.replace(insertBeforeNotify, untaggedMethod + '\n' + insertBeforeNotify);
}

fs.writeFileSync(TABLE, source);
console.log('Successfully upgraded TranslationEngine in translations.js');
