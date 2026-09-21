/**
 * Script to add data-i18n attributes to index.html for History, Civic Map, Volunteer Popup, and Quiz.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const INDEX_FILE = path.resolve(__dirname, '../index.html');
let html = fs.readFileSync(INDEX_FILE, 'utf8');

// 1. Civic Map
html = html.replace(
  '<span>Civic Map of Albay</span>',
  '<span data-i18n="map-civic-title">Civic Map of Albay</span>'
);
html = html.replace(
  '<button type="button" class="map-filter-btn active" data-filter="all" aria-pressed="true">All (18 LGUs)</button>',
  '<button type="button" class="map-filter-btn active" data-filter="all" aria-pressed="true" data-i18n="map-filter-all">All (18 LGUs)</button>'
);
html = html.replace(
  '<button type="button" class="map-filter-btn" data-filter="city" aria-pressed="false">Cities (3)</button>',
  '<button type="button" class="map-filter-btn" data-filter="city" aria-pressed="false" data-i18n="map-filter-cities">Cities (3)</button>'
);
html = html.replace(
  '<button type="button" class="map-filter-btn" data-filter="municipality" aria-pressed="false">Municipalities (15)</button>',
  '<button type="button" class="map-filter-btn" data-filter="municipality" aria-pressed="false" data-i18n="map-filter-municipalities">Municipalities (15)</button>'
);
html = html.replace(
  '<button type="button" class="map-filter-btn" data-filter="civic" aria-pressed="false">Capitol &amp; Civic</button>',
  '<button type="button" class="map-filter-btn" data-filter="civic" aria-pressed="false" data-i18n="map-filter-civic">Capitol &amp; Civic</button>'
);
html = html.replace(
  '<span>Province of Albay &bull; 18 LGUs (3 Cities, 15 Municipalities)</span>',
  '<span data-i18n="map-coverage-text">Province of Albay &bull; 18 LGUs (3 Cities, 15 Municipalities)</span>'
);
html = html.replace(
  '<span>Fit Entire Albay</span>',
  '<span data-i18n="map-fit-bounds">Fit Entire Albay</span>'
);
html = html.replace('<span>Directory</span>', '<span data-i18n="map-directory">Directory</span>');

// 2. History section
const historyReplacements = [
  {
    from: '<h4 class="timeline-title">Early Inhabitants &amp; Pre-Colonial Era</h4>\n                <p>\n                  Long before Spanish arrival, Albay harbored structured, self-sustaining indigenous societies. Archaeological excavations in Camalig\'s Hoyop-hoyopan Cave show continuous human habitation dating back to the Early Iron Age (200 BC to 900 AD). The region was natively known as Ibat, and later Libog, and was ruled by localized chieftains, most notably the ancient chief Gat Ibal.\n                </p>',
    to: '<h4 class="timeline-title" data-i18n="history-200bc-title">Early Inhabitants &amp; Pre-Colonial Era</h4>\n                <p data-i18n="history-200bc-desc">\n                  Long before Spanish arrival, Albay harbored structured, self-sustaining indigenous societies. Archaeological excavations in Camalig’s Hoyop-hoyopan Cave show continuous human habitation dating back to the Early Iron Age (200 BC to 900 AD). The region was natively known as Ibat, and later Libog, and was ruled by localized chieftains, most notably the ancient chief Gat Ibal.\n                </p>',
  },
  {
    from: '<h4 class="timeline-title">First Spanish Contact</h4>\n                <p>\n                  Spanish contact with Albay began when Captain Luis Enríquez de Guzmán, leading a reconnaissance detachment from a larger Spanish expedition, crossed from the islands of Burias and Ticao to explore the coastal settlements of the Bicol peninsula.\n                </p>',
    to: '<h4 class="timeline-title" data-i18n="history-1569-title">First Spanish Contact</h4>\n                <p data-i18n="history-1569-desc">\n                  Spanish contact with Albay began when Captain Luis Enríquez de Guzmán, leading a reconnaissance detachment from a larger Spanish expedition, crossed from the islands of Burias and Ticao to explore the coastal settlements of the Bicol peninsula.\n                </p>',
  },
  {
    from: '<h4 class="timeline-title">Inland Exploration and Settlement</h4>\n                <p>\n                  The Spanish conquistador Juan de Salcedo penetrated deeper into the Bicol peninsula from the north, marching as far south as Libon. There, he established the settlement of Santiago de Libon, firmly planting Spanish presence in the region.\n                </p>',
    to: '<h4 class="timeline-title" data-i18n="history-1573-title">Inland Exploration and Settlement</h4>\n                <p data-i18n="history-1573-desc">\n                  The Spanish conquistador Juan de Salcedo penetrated deeper into the Bicol peninsula from the north, marching as far south as Libon. There, he established the settlement of Santiago de Libon, firmly planting Spanish presence in the region.\n                </p>',
  },
  {
    from: '<h4 class="timeline-title">Evangelization and Town Foundations</h4>\n                <p>\n                  Franciscan missionaries assumed primary responsibility for the evangelization of the Bicol region. By 1579, missionaries Father Pablo de Jesús and Father Bartolomé Ruiz formally established Camalig as a town and independent parish, making it the oldest formal municipal organization in Albay.\n                </p>',
    to: '<h4 class="timeline-title" data-i18n="history-1578-title">Evangelization and Town Foundations</h4>\n                <p data-i18n="history-1578-desc">\n                  Franciscan missionaries assumed primary responsibility for the evangelization of the Bicol region. By 1579, missionaries Father Pablo de Jesús and Father Bartolomé Ruiz formally established Camalig as a town and independent parish, making it the oldest formal municipal organization in Albay.\n                </p>',
  },
  {
    from: '<h4 class="timeline-title">Creation of Ibalon Province</h4>\n                <p>\n                  Initially, the entire Bicol peninsula was managed as a single administrative unit. In 1636, the Spanish Crown formally divided the region into two, establishing the southeastern portion as the independent province of Ibalon (the colonial precursor to Albay), with Sorsogon serving as its administrative capital.\n                </p>',
    to: '<h4 class="timeline-title" data-i18n="history-1636-title">Creation of Ibalon Province</h4>\n                <p data-i18n="history-1636-desc">\n                  Initially, the entire Bicol peninsula was managed as a single administrative unit. In 1636, the Spanish Crown formally divided the region into two, establishing the southeastern portion as the independent province of Ibalon (the colonial precursor to Albay), with Sorsogon serving as its administrative capital.\n                </p>',
  },
  {
    from: '<h4 class="timeline-title">The Great Eruption of Mayon</h4>\n                <p>\n                  Mayon Volcano experienced its most violent and destructive eruption in recorded history. The catastrophic event completely buried the town of Cagsawa and destroyed several other surrounding municipalities, killing thousands. Survivors were forced to relocate to higher ground, establishing the present-day town of Daraga.\n                </p>',
    to: '<h4 class="timeline-title" data-i18n="history-1814-title">The Great Eruption of Mayon</h4>\n                <p data-i18n="history-1814-desc">\n                  Mayon Volcano experienced its most violent and destructive eruption in recorded history. The catastrophic event completely buried the town of Cagsawa and destroyed several other surrounding municipalities, killing thousands. Survivors were forced to relocate to higher ground, establishing the present-day town of Daraga.\n                </p>',
  },
  {
    from: '<h4 class="timeline-title">Administrative Reorganization</h4>\n                <p>\n                  Governor-General Narciso Clavería issued an executive decree that significantly reshaped the province\'s borders. The islands of Masbate, Ticao, and Burias were detached from Albay to form an independent military district. Albay was then divided into four contiguous districts: Iraya, Cordillera (Tabaco), Sorsogon, and Catanduanes.\n                </p>',
    to: '<h4 class="timeline-title" data-i18n="history-1846-title">Administrative Reorganization</h4>\n                <p data-i18n="history-1846-desc">\n                  Governor-General Narciso Clavería issued an executive decree that significantly reshaped the province’s borders. The islands of Masbate, Ticao, and Burias were detached from Albay to form an independent military district. Albay was then divided into four contiguous districts: Iraya, Cordillera (Tabaco), Sorsogon, and Catanduanes.\n                </p>',
  },
  {
    from: '<h4 class="timeline-title">The Philippine Revolution</h4>\n                <p>\n                  As Spanish colonial power collapsed, Albay became an active theater of the Philippine Revolution. A provisional revolutionary government of Albay was formally established, with Anacleto Solano taking office as the provisional president, while Major General Vito Belarmino commanded the Filipino army in the province.\n                </p>',
    to: '<h4 class="timeline-title" data-i18n="history-1898-title">The Philippine Revolution</h4>\n                <p data-i18n="history-1898-desc">\n                  As Spanish colonial power collapsed, Albay became an active theater of the Philippine Revolution. A provisional revolutionary government of Albay was formally established, with Anacleto Solano taking office as the provisional president, while Major General Vito Belarmino commanded the Filipino army in the province.\n                </p>',
  },
  {
    from: '<h4 class="timeline-title">American Occupation and Resistance</h4>\n                <p>\n                  Following the capture of the province by American forces, a civil government was established in Albay. However, local resistance fiercely continued under the leadership of Simeon Ola. Ola and his men famously defied American authority through guerilla warfare well after the civil government was installed, eventually becoming the last Filipino general to surrender.\n                </p>',
    to: '<h4 class="timeline-title" data-i18n="history-1901-title">American Occupation and Resistance</h4>\n                <p data-i18n="history-1901-desc">\n                  Following the capture of the province by American forces, a civil government was established in Albay. However, local resistance fiercely continued under the leadership of Simeon Ola. Ola and his men famously defied American authority through guerilla warfare well after the civil government was installed, eventually becoming the last Filipino general to surrender.\n                </p>',
  },
  {
    from: '<h4 class="timeline-title">World War II Japanese Occupation</h4>\n                <p>\n                  During the Second World War, the Kimura Detachment of the Japanese Imperial Forces landed in and occupied Legazpi, swiftly taking control of the Bicol Peninsula despite the defense mounted by local Philippine Constabulary units.\n                </p>',
    to: '<h4 class="timeline-title" data-i18n="history-1941-title">World War II Japanese Occupation</h4>\n                <p data-i18n="history-1941-desc">\n                  During the Second World War, the Kimura Detachment of the Japanese Imperial Forces landed in and occupied Legazpi, swiftly taking control of the Bicol Peninsula despite the defense mounted by local Philippine Constabulary units.\n                </p>',
  },
  {
    from: '<h4>The Cagsawa Legacy</h4>\n                <p>\n                  The catastrophic February 1, 1814 eruption of Mayon completely buried Cagsawa, leading survivors to relocate and establish the modern town of Daraga.\n                </p>',
    to: '<h4 data-i18n="history-cagsawa-title">The Cagsawa Legacy</h4>\n                <p data-i18n="history-cagsawa-desc">\n                  The catastrophic February 1, 1814 eruption of Mayon completely buried Cagsawa, leading survivors to relocate and establish the modern town of Daraga.\n                </p>',
  },
  {
    from: '<h4>Last General to Surrender</h4>\n                <p>\n                  Albay was the stronghold of General Simeon Ola of Guinobatan, who led fierce resistance and became the last Filipino revolutionary general to surrender.\n                </p>',
    to: '<h4 data-i18n="history-ola-title">Last General to Surrender</h4>\n                <p data-i18n="history-ola-desc">\n                  Albay was the stronghold of General Simeon Ola of Guinobatan, who led fierce resistance and became the last Filipino revolutionary general to surrender.\n                </p>',
  },
  {
    from: "<h4>Ancient Roots</h4>\n                <p>\n                  Archaeological excavations at Camalig's Hoyop-hoyopan Cave revealed continuous human habitation dating back to the Early Iron Age (200 BC to 900 AD).\n                </p>",
    to: '<h4 data-i18n="history-roots-title">Ancient Roots</h4>\n                <p data-i18n="history-roots-desc">\n                  Archaeological excavations at Camalig’s Hoyop-hoyopan Cave revealed continuous human habitation dating back to the Early Iron Age (200 BC to 900 AD).\n                </p>',
  },
];

for (const rep of historyReplacements) {
  if (html.includes(rep.from)) {
    html = html.replace(rep.from, rep.to);
  } else {
    console.warn('Could not match history block:', rep.from.slice(0, 40));
  }
}

// 3. Albay Quiz dialog
html = html.replace(
  '<h2 id="albay-quiz-title">Albay Quiz</h2>',
  '<h2 id="albay-quiz-title" data-i18n="quiz-heading">Albay Quiz</h2>'
);
html = html.replace(
  '<button type="button" class="albay-quiz-close" aria-label="Close quiz">Close <span aria-hidden="true">×</span></button>',
  '<button type="button" class="albay-quiz-close" aria-label="Close quiz"><span data-i18n="quiz-action-close">Close</span> <span aria-hidden="true">×</span></button>'
);

// 4. Volunteer modal
html = html.replace(
  '<h2 id="vol-popup-title" class="vol-popup-title">Be Part of Something Greater</h2>',
  '<h2 id="vol-popup-title" class="vol-popup-title" data-i18n="vol-popup-heading">Be Part of Something Greater</h2>'
);
html = html.replace(
  '<p class="vol-popup-header-sub">Albay, Philippines deserves a world-class digital government. Help us build it.\n        </p>',
  '<p class="vol-popup-header-sub" data-i18n="vol-popup-sub">Albay, Philippines deserves a world-class digital government. Help us build it.\n        </p>'
);
html = html.replace(
  '<p class="vol-popup-lead">We are looking for passionate <strong>Albayanos</strong> who want to serve their\n          community through their craft.</p>',
  '<p class="vol-popup-lead" data-i18n="vol-popup-lead">We are looking for passionate <strong>Albayanos</strong> who want to serve their\n          community through their craft.</p>'
);
html = html.replace(
  '<span>Software Dev</span>',
  '<span data-i18n="vol-popup-role-dev">Software Dev</span>'
);
html = html.replace(
  '<span>UI/UX Design</span>',
  '<span data-i18n="vol-popup-role-uiux">UI/UX Design</span>'
);
html = html.replace(
  '<span>Graphic Design</span>',
  '<span data-i18n="vol-popup-role-graphic">Graphic Design</span>'
);
html = html.replace(
  '<span>Content Creation</span>',
  '<span data-i18n="vol-popup-role-content">Content Creation</span>'
);
html = html.replace(
  '<span>Digital Marketing</span>',
  '<span data-i18n="vol-popup-role-marketing">Digital Marketing</span>'
);
html = html.replace(
  '<a href="mailto:volunteer@betteralbay.org" class="vol-popup-cta" rel="noopener">\n            <i class="bi bi-envelope-heart-fill" aria-hidden="true"></i>\n            I Want to Volunteer\n          </a>',
  '<a href="mailto:volunteer@betteralbay.org" class="vol-popup-cta" rel="noopener">\n            <i class="bi bi-envelope-heart-fill" aria-hidden="true"></i>\n            <span data-i18n="vol-popup-cta">I Want to Volunteer</span>\n          </a>'
);
html = html.replace(
  '<button class="vol-popup-skip" type="button">Maybe Later</button>',
  '<button class="vol-popup-skip" type="button" data-i18n="vol-popup-dismiss">Maybe Later</button>'
);

// 5. Footer disclaimers & cost
html = html.replace(
  '<span>Cost to the People of Albay =</span>',
  '<span data-i18n="footer-cost-label">Cost to the People of Albay =</span>'
);
html = html.replace(
  '<span class="footer-copyright-disclaimer">Verify current information with the responsible government\n            office.</span>',
  '<span class="footer-copyright-disclaimer" data-i18n="footer-disclaimer-text">Verify current information with the responsible government office.</span>'
);

fs.writeFileSync(INDEX_FILE, html);
console.log('Successfully tagged index.html with data-i18n');
