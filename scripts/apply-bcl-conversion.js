/**
 * Scripts to add comprehensive BCL/FIL/EN keys and enhance TranslationEngine.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TABLE = path.resolve(__dirname, '../assets/js/translations.js');
const LANGS = ['en', 'fil', 'bcl'];

const NEW_KEYS = {
  'nav-transparency': {
    en: 'Transparency',
    fil: 'Transparensiya',
    bcl: 'Kalinawan',
  },
  // History section
  'history-200bc-title': {
    en: 'Early Inhabitants & Pre-Colonial Era',
    fil: 'Mga Unang Nanirahan at Panahon Bago ang Kolonyal',
    bcl: 'Mga Enot na Nag-erok asin Panahon Bago an Kolonyal',
  },
  'history-200bc-desc': {
    en: 'Long before Spanish arrival, Albay harbored structured, self-sustaining indigenous societies. Archaeological excavations in Camalig’s Hoyop-hoyopan Cave show continuous human habitation dating back to the Early Iron Age (200 BC to 900 AD). The region was natively known as Ibat, and later Libog, and was ruled by localized chieftains, most notably the ancient chief Gat Ibal.',
    fil: 'Bago pa man dumating ang mga Espanyol, ang Albay ay mayroon nang organisado at nagsasariling mga pamayanang katutubo. Ang mga nahukay sa Yungib ng Hoyop-hoyopan sa Camalig ay nagpapakita ng tuloy-tuloy na paninirahan ng tao mula pa noong Early Iron Age (200 BC hanggang 900 AD). Ang rehiyon ay katutubong tinawag na Ibat, at kalaunan ay Libog, at pinamunuan ng mga lokal na pinuno, lalo na ang sinaunang pinunong si Gat Ibal.',
    bcl: 'Bago pa man nag-abot an mga Espanyol, an Albay igwa na nin organisado asin nagsasadiring mga komunidad nin katutubo. An mga nakotkot sa Lungib nin Hoyop-hoyopan sa Camalig nagpapahiling nin tuloy-tuloy na pag-erok nin tawo poon pa kan Early Iron Age (200 BC hanggang 900 AD). An rehiyon dating inaapod na Ibat, dangan Libog, asin pinamayohan nin mga lokal na lider, urog na si Gat Ibal.',
  },
  'history-1569-title': {
    en: 'First Spanish Contact',
    fil: 'Unang Pakikipag-ugnayan sa mga Espanyol',
    bcl: 'Enot na Pakikipag-ugnayan sa mga Espanyol',
  },
  'history-1569-desc': {
    en: 'Spanish contact with Albay began when Captain Luis Enríquez de Guzmán, leading a reconnaissance detachment from a larger Spanish expedition, crossed from the islands of Burias and Ticao to explore the coastal settlements of the Bicol peninsula.',
    fil: 'Nagsimula ang pakikipag-ugnayan ng Espanyol sa Albay nang si Kapitan Luis Enríquez de Guzmán, na namumuno sa isang grupo mula sa mas malaking ekspedisyon ng Espanya, ay tumawid mula sa mga isla ng Burias at Ticao upang galugarin ang mga baybaying pamayanan ng tangway ng Bicol.',
    bcl: 'Nagpoon an pakikipag-ugnayan kan Espanyol sa Albay kan si Kapitan Luis Enríquez de Guzmán, na namayo sa sarong grupo hale sa mas dakulang ekspidisyon nin Espanya, nagbalyo hale sa mga isla nin Burias asin Ticao tanganing suysuyon an mga baybayon na banwaan kan rawis nin Bikol.',
  },
  'history-1573-title': {
    en: 'Inland Exploration and Settlement',
    fil: 'Panggagalugad sa Loob ng Lupain at Pamayanan',
    bcl: 'Pagsusubaybay sa Kadagaan asin Pagpatindog nin Pamayanan',
  },
  'history-1573-desc': {
    en: 'The Spanish conquistador Juan de Salcedo penetrated deeper into the Bicol peninsula from the north, marching as far south as Libon. There, he established the settlement of Santiago de Libon, firmly planting Spanish presence in the region.',
    fil: 'Ang conquistador na Espanyol na si Juan de Salcedo ay pumasok nang mas malalim sa tangway ng Bicol mula sa hilaga, nagmartsa patimog hanggang sa Libon. Doon, itinatag niya ang pamayanan ng Santiago de Libon, na matatag na nagtanim ng presensya ng Espanya sa rehiyon.',
    bcl: 'Si Juan de Salcedo, sarong conquistador na Espanyol, naglaog nin hararom sa rawis nin Bikol hale sa amihanan, nagmartsa pasiring sa timog sagkod sa Libon. Duman, ipinatindog niya an pamayanan nin Santiago de Libon, na nagpatalubo kan presensya nin Espanya sa rehiyon.',
  },
  'history-1578-title': {
    en: 'Evangelization and Town Foundations',
    fil: 'Ebanghelisasyon at Pagtatatag ng mga Bayan',
    bcl: 'Ebanghelisasyon asin Pagtindog nin mga Banwaan',
  },
  'history-1578-desc': {
    en: 'Franciscan missionaries assumed primary responsibility for the evangelization of the Bicol region. By 1579, missionaries Father Pablo de Jesús and Father Bartolomé Ruiz formally established Camalig as a town and independent parish, making it the oldest formal municipal organization in Albay.',
    fil: 'Ang mga misyonerong Pransiskano ang umako ng pangunahing responsibilidad sa ebanghelisasyon ng rehiyon ng Bicol. Noong 1579, pormal na itinatag nina Padre Pablo de Jesús at Padre Bartolomé Ruiz ang Camalig bilang isang bayan at malayang parokya, kaya ito ang pinakamatandang pormal na organisasyong munisipal sa Albay.',
    bcl: 'An mga misyonerong Pransiskano an nagkua kan pangenot na paninimbagan sa ebanghelisasyon kan rehiyon Bikol. Kan 1579, pormal na ipinatindog ninda Padre Pablo de Jesús asin Padre Bartolomé Ruiz an Camalig bilang banwaan asin independyenteng parokya, na nagin pinakagurang na pormal na organisasyong munisipal sa Albay.',
  },
  'history-1636-title': {
    en: 'Creation of Ibalon Province',
    fil: 'Pagkakatatag ng Lalawigan ng Ibalon',
    bcl: 'Pagtugdas kan Probinsya nin Ibalon',
  },
  'history-1636-desc': {
    en: 'Initially, the entire Bicol peninsula was managed as a single administrative unit. In 1636, the Spanish Crown formally divided the region into two, establishing the southeastern portion as the independent province of Ibalon (the colonial precursor to Albay), with Sorsogon serving as its administrative capital.',
    fil: 'Noong una, ang buong tangway ng Bicol ay pinamahalaan bilang isang yunit administratibo. Noong 1636, pormal na hinati ng Korona ng Espanya ang rehiyon sa dalawa, itinatag ang timog-silangang bahagi bilang malayang lalawigan ng Ibalon (ang naunang anyo ng Albay), kung saan ang Sorsogon ang naging kabiserang administratibo.',
    bcl: 'Kan enot, an enterong rawis nin Bikol pigpadalagan bilang sarong yunit administratibo. Kan 1636, pormal na binaranga kan Korona nin Espanya an rehiyon sa duwa, asin ipinatindog an timog-sirangan na parte bilang independyenteng probinsya nin Ibalon (an dating porma kan Albay), na may Sorsogon bilang kapitolyo administratibo.',
  },
  'history-1814-title': {
    en: 'The Great Eruption of Mayon',
    fil: 'Ang Malagim na Pagputok ng Bulkang Mayon',
    bcl: 'An Makuring Pagputok kan Bulkan Mayon',
  },
  'history-1814-desc': {
    en: 'Mayon Volcano experienced its most violent and destructive eruption in recorded history. The catastrophic event completely buried the town of Cagsawa and destroyed several other surrounding municipalities, killing thousands. Survivors were forced to relocate to higher ground, establishing the present-day town of Daraga.',
    fil: 'Naranasan ng Bulkang Mayon ang pinakamalupit at pinakamapanirang pagputok sa naitalang kasaysayan. Biyang ibinaon ng sakuna ang bayan ng Cagsawa at nawasak ang iba pang karatig-bayan, na ikinasawi ng libo-libo. Ang mga nakaligtas ay napilitang lumipat sa mas mataas na lugar, na naging bayan ng Daraga ngayon.',
    bcl: 'Nakaeksperyensya an Bulkan Mayon kan pinakamakuri asin pinakamapanlaglag na pagputok sa nakatalang kasaysayan. An makuring pangyayaring ini biyong naglubong sa banwaan nin Cagsawa asin nagraot nin nagkapirang kataid na banwaan, na naggadan nin rinibong tawo. An mga nakaligtas napiritan magbalyo sa mas halangkaw na lugar, na nagin banwaan kan Daraga ngonian.',
  },
  'history-1846-title': {
    en: 'Administrative Reorganization',
    fil: 'Administratibong Muling Pag-oorganisa',
    bcl: 'Administratibong Reorganisasyon',
  },
  'history-1846-desc': {
    en: 'Governor-General Narciso Clavería issued an executive decree that significantly reshaped the province’s borders. The islands of Masbate, Ticao, and Burias were detached from Albay to form an independent military district. Albay was then divided into four contiguous districts: Iraya, Cordillera (Tabaco), Sorsogon, and Catanduanes.',
    fil: 'Naglabas si Gobernador-Heneral Narciso Clavería ng isang kautusang tagapagpaganap na malaking nagbago sa mga hangganan ng lalawigan. Ang mga isla ng Masbate, Ticao, at Burias ay inihiwalay sa Albay upang bumuo ng isang malayang distritong militar. Pagkatapos ay hinati ang Albay sa apat na magkakatabing distrito: Iraya, Cordillera (Tabaco), Sorsogon, at Catanduanes.',
    bcl: 'Nagpaluwas si Gobernador-Heneral Narciso Clavería nin sarong dekrito ehekutibo na nagbago kan mga linderos kan probinsya. An mga isla nin Masbate, Ticao, asin Burias isinuway sa Albay tanganing magbilog nin sarong independyenteng distritong militar. Dangan binaranga an Albay sa apat na magkatakod na distrito: Iraya, Cordillera (Tabaco), Sorsogon, asin Catanduanes.',
  },
  'history-1898-title': {
    en: 'The Philippine Revolution',
    fil: 'Ang Rebolusyong Pilipino',
    bcl: 'An Rebolusyon kan Pilipinas',
  },
  'history-1898-desc': {
    en: 'As Spanish colonial power collapsed, Albay became an active theater of the Philippine Revolution. A provisional revolutionary government of Albay was formally established, with Anacleto Solano taking office as the provisional president, while Major General Vito Belarmino commanded the Filipino army in the province.',
    fil: 'Nang bumagsak ang kapangyarihan ng mga Espanyol, naging aktibong bahagi ang Albay ng Rebolusyong Pilipino. Pormal na itinatag ang pansamantalang pamahalaang rebolusyonaryo ng Albay, kung saan si Anacleto Solano ang naging pansamantalang pangulo, habang pinamunuan ni Heneral Vito Belarmino ang hukbong Pilipino sa lalawigan.',
    bcl: 'Kan magbagsak an kapangyarihan kan mga Espanyol, an Albay nagin aktibong parte kan Rebolusyon kan Pilipinas. Pormal na ipinatindog an probisyonal na gobyerno rebolusyonaryo kan Albay, na may Anacleto Solano bilang probisyonal na presidente, mantang si Heneral Vito Belarmino an namayo sa hukbong Pilipino sa probinsya.',
  },
  'history-1901-title': {
    en: 'American Occupation and Resistance',
    fil: 'Pananakop ng Amerikano at Paglaban',
    bcl: 'Pananakop kan Amerikano asin Pagtumang',
  },
  'history-1901-desc': {
    en: 'Following the capture of the province by American forces, a civil government was established in Albay. However, local resistance fiercely continued under the leadership of Simeon Ola. Ola and his men famously defied American authority through guerilla warfare well after the civil government was installed, eventually becoming the last Filipino general to surrender.',
    fil: 'Kasunod ng pagbihag sa lalawigan ng mga pwersang Amerikano, itinatag ang pamahalaang sibil sa Albay. Gayunpaman, matinding nagpatuloy ang lokal na paglaban sa ilalim ng pamumuno ni Simeon Ola. Tanyag na nilabanan ni Ola at ng kanyang mga kasama ang awtoridad ng Amerikano sa pamamagitan ng pakikidigmang gerilya, at kalaunan ay naging huling heneral na Pilipinong sumuko.',
    bcl: 'Pakatapos madakop an probinsya kan mga pwersang Amerikano, sarong gobyerno sibil an ipinatindog sa Albay. Alagad, padagos an maisog na pagtumang kan mga lokal sa pamamayo ni Simeon Ola. Si Ola asin an saiyang mga kaibahan maisog na nagtumang sa awtoridad kan Amerikano paagi sa gerilya, asin siya an nagin huring heneral na Pilipino na nagsuko.',
  },
  'history-1941-title': {
    en: 'World War II Japanese Occupation',
    fil: 'Ikalawang Digmaang Pandaigdig at Pananakop ng Hapon',
    bcl: 'Ikaduwang Gerang Pangkinaban asin Pananakop kan Hapon',
  },
  'history-1941-desc': {
    en: 'During the Second World War, the Kimura Detachment of the Japanese Imperial Forces landed in and occupied Legazpi, swiftly taking control of the Bicol Peninsula despite the defense mounted by local Philippine Constabulary units.',
    fil: 'Noong Ikalawang Digmaang Pandaigdig, ang Kimura Detachment ng Sandatahang Lakas ng Hapon ay dumaong at sumakop sa Legazpi, mabilis na kinontrol ang Tangway ng Bicol sa kabila ng pagtatanggol ng mga lokal na yunit ng Philippine Constabulary.',
    bcl: 'Kaidtong Ikaduwang Gerang Pangkinaban, an Kimura Detachment kan Hukbong Hapon nagduong asin suminakop sa Legazpi, marikas na kinontrol an Rawis nin Bikol sa ibong kan pagdepensa kan mga lokal na yunit kan Philippine Constabulary.',
  },
  'history-cagsawa-title': {
    en: 'The Cagsawa Legacy',
    fil: 'Ang Pamana ng Cagsawa',
    bcl: 'An Pamana kan Cagsawa',
  },
  'history-cagsawa-desc': {
    en: 'The catastrophic February 1, 1814 eruption of Mayon completely buried Cagsawa, leading survivors to relocate and establish the modern town of Daraga.',
    fil: 'Ang malagim na pagputok ng Mayon noong Pebrero 1, 1814 ay ganap na nagbaon sa Cagsawa, na nagbunsod sa mga nakaligtas na lumipat at itatag ang modernong bayan ng Daraga.',
    bcl: 'An makuring pagputok kan Mayon kan Pebrero 1, 1814 biyong naglubong sa Cagsawa, na nagdara sa mga nakaligtas na magbalyo asin magtugdas kan banwaan nin Daraga ngonian.',
  },
  'history-ola-title': {
    en: 'Last General to Surrender',
    fil: 'Huling Heneral na Sumuko',
    bcl: 'Huring Heneral na Nagsuko',
  },
  'history-ola-desc': {
    en: 'Albay was the stronghold of General Simeon Ola of Guinobatan, who led fierce resistance and became the last Filipino revolutionary general to surrender.',
    fil: 'Ang Albay ang naging kuta ni Heneral Simeon Ola ng Guinobatan, na namuno sa matapang na paglaban at naging huling heneral na rebolusyonaryong Pilipinong sumuko.',
    bcl: 'An Albay an kuta ni Heneral Simeon Ola kan Guinobatan, na namayo sa maisog na pagtumang asin nagin huring rebolusyonaryong heneral na Pilipino na nagsuko.',
  },
  'history-roots-title': {
    en: 'Ancient Roots',
    fil: 'Sinaunang Pinagmulan',
    bcl: 'Suanoy na Ginikanan',
  },
  'history-roots-desc': {
    en: 'Archaeological excavations at Camalig’s Hoyop-hoyopan Cave revealed continuous human habitation dating back to the Early Iron Age (200 BC to 900 AD).',
    fil: 'Ang mga arkeolohikal na paghuhukay sa Yungib ng Hoyop-hoyopan sa Camalig ay nagpakita ng tuloy-tuloy na paninirahan ng tao mula pa noong Early Iron Age (200 BC hanggang 900 AD).',
    bcl: 'An mga arkeolohikal na pagkotkot sa Lungib nin Hoyop-hoyopan sa Camalig nagpahiling nin tuloy-tuloy na pag-erok nin tawo poon pa kan Early Iron Age (200 BC hanggang 900 AD).',
  },

  // Civic Map
  'map-civic-title': {
    en: 'Civic Map of Albay',
    fil: 'Sibikong Mapa ng Albay',
    bcl: 'Mapa Sibiko kan Albay',
  },
  'map-filter-all': {
    en: 'All (18 LGUs)',
    fil: 'Lahat (18 LGU)',
    bcl: 'Gabos (18 LGU)',
  },
  'map-filter-cities': {
    en: 'Cities (3)',
    fil: 'Mga Lungsod (3)',
    bcl: 'Mga Syudad (3)',
  },
  'map-filter-municipalities': {
    en: 'Municipalities (15)',
    fil: 'Mga Bayan (15)',
    bcl: 'Mga Banwaan (15)',
  },
  'map-filter-civic': {
    en: 'Capitol & Civic',
    fil: 'Kapitolyo at Sibiko',
    bcl: 'Kapitolyo asin Sibiko',
  },
  'map-coverage-text': {
    en: 'Province of Albay • 18 LGUs (3 Cities, 15 Municipalities)',
    fil: 'Lalawigan ng Albay • 18 LGU (3 Lungsod, 15 Bayan)',
    bcl: 'Probinsya nin Albay • 18 LGU (3 Syudad, 15 Banwaan)',
  },
  'map-fit-bounds': {
    en: 'Fit Entire Albay',
    fil: 'Iakma sa Buong Albay',
    bcl: 'Ibagay sa Enterong Albay',
  },
  'map-directory': {
    en: 'Directory',
    fil: 'Direktoryo',
    bcl: 'Direktoryo',
  },

  // Volunteer Modal
  'vol-popup-heading': {
    en: 'Be Part of Something Greater',
    fil: 'Maging Bahagi ng Mas Dakilang Layunin',
    bcl: 'Maging Parte nin Mas Dakulang Katuyuhan',
  },
  'vol-popup-sub': {
    en: 'Albay, Philippines deserves a world-class digital government. Help us build it.',
    fil: 'Karapat-dapat ang Albay, Pilipinas sa isang world-class na digital na pamahalaan. Tulungan kaming itatag ito.',
    bcl: 'Dapat sana sa Albay, Pilipinas an primera-klaseng digital na gobyerno. Tabangi kaming itindog ini.',
  },
  'vol-popup-lead': {
    en: 'We are looking for passionate Albayanos who want to serve their community through their craft.',
    fil: 'Naghahanap kami ng mga masigasig na Albayano na nais maglingkod sa kanilang komunidad sa pamamagitan ng kanilang galing.',
    bcl: 'Naghahanap kami nin mga madunong asin maigot na Albayano na gustong magserbi sa saindang komunidad paagi sa saindang abilidad.',
  },
  'vol-popup-role-dev': {
    en: 'Software Dev',
    fil: 'Software Dev',
    bcl: 'Software Dev',
  },
  'vol-popup-role-uiux': {
    en: 'UI/UX Design',
    fil: 'Disenyo ng UI/UX',
    bcl: 'Disenyo nin UI/UX',
  },
  'vol-popup-role-graphic': {
    en: 'Graphic Design',
    fil: 'Graphic Design',
    bcl: 'Graphic Design',
  },
  'vol-popup-role-content': {
    en: 'Content Creation',
    fil: 'Paggawa ng Nilalaman',
    bcl: 'Paggibo nin Kontento',
  },
  'vol-popup-role-marketing': {
    en: 'Digital Marketing',
    fil: 'Digital Marketing',
    bcl: 'Digital Marketing',
  },
  'vol-popup-cta': {
    en: 'I Want to Volunteer',
    fil: 'Nais Kong Magboluntaryo',
    bcl: 'Gusto Kong Magboluntaryo',
  },
  'vol-popup-dismiss': {
    en: 'Maybe Later',
    fil: 'Mamaya Na Lang',
    bcl: 'Sa Sunod Na Lang',
  },

  // Albay Quiz
  'quiz-heading': {
    en: 'Albay Quiz',
    fil: 'Pagsusulit sa Albay',
    bcl: 'Albay Quiz',
  },
  'quiz-btn-take': {
    en: 'Take the Quiz',
    fil: 'Kunin ang Pagsusulit',
    bcl: 'Kuaon an Quiz',
  },
  'quiz-btn-continue': {
    en: 'Continue quiz',
    fil: 'Ipagpatuloy ang Pagsusulit',
    bcl: 'Ipadagos an Quiz',
  },
  'quiz-btn-view': {
    en: 'View results',
    fil: 'Tingnan ang Resulta',
    bcl: 'Hilingon an Resulta',
  },
  'quiz-btn-close': {
    en: 'Close quiz',
    fil: 'Isara ang Pagsusulit',
    bcl: 'Isara an Quiz',
  },
  'quiz-btn-try-again': {
    en: 'Try again',
    fil: 'Subukan Muli',
    bcl: 'Magprobar Ulit',
  },
  'quiz-complete-title': {
    en: 'Quiz complete',
    fil: 'Tapos na ang Pagsusulit',
    bcl: 'Tapos na an Quiz',
  },
  'quiz-action-close': {
    en: 'Close',
    fil: 'Isara',
    bcl: 'Isara',
  },

  // Emergency Bar & Directory
  'hotline-bar-national': {
    en: 'National emergency: 911',
    fil: 'Pambansang emerhensiya: 911',
    bcl: 'Nasyonal na emerhensya: 911',
  },
  'hotline-bar-all': {
    en: 'All Albay hotlines',
    fil: 'Lahat ng Albay hotline',
    bcl: 'Gabos na Albay hotline',
  },
  'hotline-dir-heading': {
    en: 'Albay emergency hotlines',
    fil: 'Mga pang-emerhensiyang hotline ng Albay',
    bcl: 'Mga pang-emerhensyang hotline kan Albay',
  },
  'hotline-dir-sub': {
    en: 'Call the appropriate office directly using the numbers below.',
    fil: 'Tawagan agad ang angkop na tanggapan gamit ang mga numero sa ibaba.',
    bcl: 'Tawagan tulos an tamang opisina gamit an mga numero sa ibaba.',
  },
  'hotline-search-label': {
    en: 'Search hotlines',
    fil: 'Maghanap ng hotline',
    bcl: 'Maghanap nin hotline',
  },
  'hotline-search-placeholder': {
    en: 'Office, municipality, or number',
    fil: 'Tanggapan, bayan, o numero',
    bcl: 'Opisina, banwaan, o numero',
  },
  'hotline-category-label': {
    en: 'Category',
    fil: 'Kategorya',
    bcl: 'Kategorya',
  },
  'hotline-category-all': {
    en: 'All categories',
    fil: 'Lahat ng kategorya',
    bcl: 'Gabos na kategorya',
  },
  'hotline-btn-clear': {
    en: 'Clear filters',
    fil: 'Linisin ang mga filter',
    bcl: 'Halion an mga filter',
  },
  'hotline-jump-note': {
    en: 'Jumping to a category clears filters.',
    fil: 'Ang paglipat sa kategorya ay nag-aalis ng mga filter.',
    bcl: 'An paglukso sa kategorya naghahali kan mga filter.',
  },
  'hotline-no-match-title': {
    en: 'No hotlines match your search.',
    fil: 'Walang hotline na tumutugma sa iyong paghahanap.',
    bcl: 'Mayong hotline na nagtutugma sa saindong paghanap.',
  },
  'hotline-no-match-desc': {
    en: 'Try another office, municipality, or number, or clear your filters.',
    fil: 'Subukan ang ibang tanggapan, bayan, o numero, o linisin ang mga filter.',
    bcl: 'Magprobar nin ibang opisina, banwaan, o numero, o halion an mga filter.',
  },

  // Government page
  'gov-page-badge': {
    en: 'Government Directory',
    fil: 'Direktoryo ng Pamahalaan',
    bcl: 'Direktoryo kan Gobyerno',
  },
  'gov-page-title': {
    en: 'Government Structure & Officials',
    fil: 'Balangkas ng Pamahalaan at mga Opisyal',
    bcl: 'Estruktura kan Gobyerno asin mga Opisyal',
  },
  'gov-page-desc': {
    en: 'Meet the leadership and offices serving Albay',
    fil: 'Kilalanin ang pamunuan at mga tanggapang naglilingkod sa Albay',
    bcl: 'Midbiron an pamamayo asin mga opisina na naglilingkod sa Albay',
  },
  'gov-stat-districts': {
    en: 'Congressional Districts',
    fil: 'Mga Distritong Kongresyonal',
    bcl: 'Mga Distritong Kongresyonal',
  },
  'gov-stat-execs': {
    en: 'Provincial Executives',
    fil: 'Mga Ehekutibo ng Lalawigan',
    bcl: 'Mga Ehekutibo kan Probinsya',
  },
  'gov-stat-sp': {
    en: 'Provincial Board Members',
    fil: 'Mga Kasapi ng Sangguniang Panlalawigan',
    bcl: 'Mga Miyembro kan Board kan Probinsya',
  },
  'gov-stat-lgus': {
    en: 'Cities & Municipalities',
    fil: 'Mga Lungsod at Bayan',
    bcl: 'Mga Syudad asin Banwaan',
  },
  'gov-stat-officials': {
    en: 'Documented Officials',
    fil: 'Naitatalang mga Opisyal',
    bcl: 'Nailistang mga Opisyal',
  },
  'gov-section-exec': {
    en: 'Executive Branch',
    fil: 'Sangay na Tagapagpaganap',
    bcl: 'Sangay Ehekutibo',
  },
  'gov-section-exec-title': {
    en: 'Provincial Government Leadership',
    fil: 'Pamunuan ng Pamahalaang Panlalawigan',
    bcl: 'Pamamayo kan Gobyerno Probinsyal',
  },
  'gov-section-exec-desc': {
    en: 'The executive leadership steering the Provincial Government of Albay (PGA)',
    fil: 'Ang ehekutibong pamunuan na nagpapatakbo sa Pamahalaang Panlalawigan ng Albay (PGA)',
    bcl: 'An ehekutibong pamamayo na nagpapadalagan kan Gobyerno Probinsyal kan Albay (PGA)',
  },
  'gov-section-leg': {
    en: 'Legislative Branch',
    fil: 'Sangay na Tagapagbatas',
    bcl: 'Sangay Lehislatibo',
  },
  'gov-section-sp-title': {
    en: 'Sangguniang Panlalawigan of Albay',
    fil: 'Sangguniang Panlalawigan ng Albay',
    bcl: 'Sangguniang Panlalawigan kan Albay',
  },
  'gov-section-congress-title': {
    en: 'Congressional Representatives',
    fil: 'Mga Kinatawan sa Kongreso',
    bcl: 'Mga Representante sa Kongreso',
  },
  'gov-section-house-reps': {
    en: 'House of Representatives',
    fil: 'Kapulungan ng mga Kinatawan',
    bcl: 'Kamara de Representantes',
  },
  'gov-section-lgus-title': {
    en: 'Local Government Units',
    fil: 'Mga Yunit ng Lokal na Pamahalaan',
    bcl: 'Mga Yunit nin Lokal na Gobyerno',
  },
  'gov-cities-title': {
    en: 'Component Cities',
    fil: 'Mga Nakapaloob na Lungsod',
    bcl: 'Mga Komponenteng Syudad',
  },
  'gov-municipalities-title': {
    en: 'Municipalities',
    fil: 'Mga Bayan',
    bcl: 'Mga Banwaan',
  },

  // Footer & Common
  'footer-cost-label': {
    en: 'Cost to the People of Albay =',
    fil: 'Gastos sa Mamamayan ng Albay =',
    bcl: 'Gastos sa mga Tawo kan Albay =',
  },
  'footer-disclaimer-text': {
    en: 'Verify current information with the responsible government office.',
    fil: 'Kumpirmahin ang kasalukuyang impormasyon sa responsableng tanggapan ng pamahalaan.',
    bcl: 'Kumpirmaron an presenteng impormasyon sa responsableng opisina kan gobyerno.',
  },
  'footer-official-site-label': {
    en: 'Official Albay government website',
    fil: 'Opisyal na website ng pamahalaan ng Albay',
    bcl: 'Opisyal na website kan gobyerno nin Albay',
  },
  'weather-forecast-heading': {
    en: '5-Day Forecast',
    fil: '5-Araw na Ulat Panahon',
    bcl: '5-Aldaw na Prediksyon',
  },
  'weather-today-label': {
    en: 'Today',
    fil: 'Ngayon',
    bcl: 'Ngonian',
  },
  'gov-section-congress-badge': {
    en: 'National Representation',
    fil: 'Pambansang Kinatawan',
    bcl: 'Pambansang Representasyon',
  },
  'gov-section-congress-desc': {
    en: 'Albay members of the House of Representatives (20th Congress of the Philippines)',
    fil: 'Mga kasapi ng Albay sa Kapulungan ng mga Kinatawan (ika-20 Kongreso ng Pilipinas)',
    bcl: 'Mga miyembro kan Albay sa Kamara de Representantes (ika-20 na Kongreso kan Pilipinas)',
  },
  'gov-section-sp-heading': {
    en: 'Sangguniang Panlalawigan Members',
    fil: 'Mga Kasapi ng Sangguniang Panlalawigan',
    bcl: 'Mga Miyembro kan Sangguniang Panlalawigan',
  },
  'gov-section-sp-desc': {
    en: 'Provincial board members enacting ordinances, resolutions, and budgets for Albay',
    fil: 'Mga kasapi ng panlalawigang lupon na nagpapatibay ng mga ordinansa, resolusyon, at badyet para sa Albay',
    bcl: 'Mga miyembro kan panlalawigang hunta na nagpapanday nin mga ordinansa, resolusyon, asin badyet para sa Albay',
  },
  'gov-badge-presiding-officer': {
    en: 'Presiding Officer',
    fil: 'Tagapangulong Opisyal',
    bcl: 'Namamayong Opisyal',
  },
  'gov-vgov-presiding-desc': {
    en: 'Vice Governor • Ex-officio Presiding Officer of the Sangguniang Panlalawigan',
    fil: 'Bise Gobernador • Ex-officio na Tagapangulong Opisyal ng Sangguniang Panlalawigan',
    bcl: 'Bise Gobernador • Ex-officio na Namamayong Opisyal kan Sangguniang Panlalawigan',
  },
  'gov-sp-filter-all': {
    en: 'All Seats (12)',
    fil: 'Lahat ng Upuan (12)',
    bcl: 'Gabos na Tukawan (12)',
  },
  'gov-sp-filter-1': {
    en: '1st District (3)',
    fil: 'Ika-1 Distrito (3)',
    bcl: 'Enot na Distrito (3)',
  },
  'gov-sp-filter-2': {
    en: '2nd District (3)',
    fil: 'Ika-2 Distrito (3)',
    bcl: 'Ikaduwang Distrito (3)',
  },
  'gov-sp-filter-3': {
    en: '3rd District (4)',
    fil: 'Ika-3 Distrito (4)',
    bcl: 'Ikatolong Distrito (4)',
  },
  'gov-sp-filter-ex': {
    en: 'Ex-Officio & Others (2)',
    fil: 'Ex-Officio at Iba Pa (2)',
    bcl: 'Ex-Officio asin Iba Pa (2)',
  },
  'gov-badge-local-governance': {
    en: 'Local Governance',
    fil: 'Lokal na Pamamahala',
    bcl: 'Lokal na Pamamahala',
  },
  'gov-section-lgu-heading': {
    en: 'Cities & Municipalities Directory',
    fil: 'Direktoryo ng mga Lungsod at Bayan',
    bcl: 'Direktoryo kan mga Syudad asin Banwaan',
  },
  'gov-section-lgu-desc': {
    en: 'Elected Mayors, Vice Mayors, and Councilors across all 18 local government units of Albay',
    fil: 'Mga inihalal na Alkalde, Bise Alkalde, at Konsehal sa lahat ng 18 yunit ng lokal na pamahalaan sa Albay',
    bcl: 'Mga elehidong Alkalde, Bise Alkalde, asin Konsehal sa gabos na 18 yunit nin lokal na gobyerno sa Albay',
  },
  'gov-search-label': {
    en: 'Search Directory',
    fil: 'Maghanap sa Direktoryo',
    bcl: 'Maghanap sa Direktoryo',
  },
  'gov-search-placeholder': {
    en: 'City, municipality, mayor, vice mayor, or councilor name…',
    fil: 'Pangalan ng lungsod, munisipalidad, alkalde, bise alkalde, o konsehal…',
    bcl: 'Pangaran nin syudad, banwaan, alkalde, bise alkalde, o konsehal…',
  },
  'gov-filter-class-label': {
    en: 'LGU Classification',
    fil: 'Uri ng LGU',
    bcl: 'Klasipikasyon kan LGU',
  },
  'gov-filter-all-lgus': {
    en: 'All LGUs (18)',
    fil: 'Lahat ng LGU (18)',
    bcl: 'Gabos na LGU (18)',
  },
  'gov-filter-cities-only': {
    en: 'Cities only (3)',
    fil: 'Mga Lungsod lamang (3)',
    bcl: 'Mga Syudad sana (3)',
  },
  'gov-filter-mun-only': {
    en: 'Municipalities only (15)',
    fil: 'Mga Bayan lamang (15)',
    bcl: 'Mga Banwaan sana (15)',
  },
  'gov-filter-district-label': {
    en: 'District',
    fil: 'Distrito',
    bcl: 'Distrito',
  },
  'gov-filter-all-districts': {
    en: 'All Districts (3)',
    fil: 'Lahat ng Distrito (3)',
    bcl: 'Gabos na Distrito (3)',
  },
  'gov-filter-d1-lgus': {
    en: '1st District (6 LGUs)',
    fil: 'Ika-1 Distrito (6 na LGU)',
    bcl: 'Enot na Distrito (6 na LGU)',
  },
  'gov-filter-d2-lgus': {
    en: '2nd District (5 LGUs)',
    fil: 'Ika-2 Distrito (5 na LGU)',
    bcl: 'Ikaduwang Distrito (5 na LGU)',
  },
  'gov-filter-d3-lgus': {
    en: '3rd District (7 LGUs)',
    fil: 'Ika-3 Distrito (7 na LGU)',
    bcl: 'Ikatolong Distrito (7 na LGU)',
  },
  'gov-btn-reset': {
    en: 'Reset',
    fil: 'I-reset',
    bcl: 'I-reset',
  },
  'gov-link-barangays': {
    en: 'Albay 720 Barangays',
    fil: 'Albay 720 na mga Barangay',
    bcl: 'Albay 720 na mga Barangay',
  },
  'gov-empty-notice': {
    en: 'No local government unit or official matches your filter criteria. Try adjusting the search term or resetting the filters.',
    fil: 'Walang yunit ng lokal na pamahalaan o opisyal na tumutugma sa iyong pamantayan. Subukang baguhin ang paghahanap o i-reset ang mga filter.',
    bcl: 'Mayong yunit nin lokal na gobyerno o opisyal na nagtutugma sa saindong basehan. Probaran na liwaton an paghanap o i-reset an mga pansara.',
  },
  'gov-sources-heading': {
    en: 'Official Sources & Transparency',
    fil: 'Mga Opisyal na Pinagmulan at Pagiging Bukas',
    bcl: 'Mga Opisyal na Ginikanan asin Pagigin Bukas',
  },
  'gov-sources-title': {
    en: 'Information Transparency & Provenance',
    fil: 'Pagiging Bukas ng Impormasyon at Pinagmulan',
    bcl: 'Kalinawan kan Impormasyon asin Ginikanan',
  },
  'gov-sources-desc': {
    en: 'Data on this page is compiled from public directories and verifiable government records. BetterAlbay is an independent civic tech project under BetterGov.ph.',
    fil: 'Ang datos sa pahinang ito ay tinipon mula sa mga pampublikong direktoryo at mapapatunayang mga talaan ng gobyerno. Ang BetterAlbay ay isang malayang proyektong civic tech sa ilalim ng BetterGov.ph.',
    bcl: 'An datos sa pahinang ini tinipon hale sa mga pampublikong direktoryo asin mapapatunayang mga rekord kan gobyerno. An BetterAlbay sarong independyenteng proyektong civic tech sa irarom kan BetterGov.ph.',
  },
  'gov-source-pointers': {
    en: 'Official Source Pointers',
    fil: 'Mga Opisyal na Link ng Pinagmulan',
    bcl: 'Mga Opisyal na Link kan Ginikanan',
  },
  'gov-scope-limitations': {
    en: 'Scope & Limitations Notice',
    fil: 'Pansin sa Saklaw at mga Limitasyon',
    bcl: 'Paisi dapit sa Sakop asin mga Limitasyon',
  },
  'gov-btn-barangays': {
    en: 'Barangays',
    fil: 'Mga Barangay',
    bcl: 'Mga Barangay',
  },
  'gov-btn-stats': {
    en: 'Statistics',
    fil: 'Estadistika',
    bcl: 'Estadistika',
  },
  'gov-view-councilors': {
    en: 'View Councilors',
    fil: 'Tingnan ang mga Konsehal',
    bcl: 'Hilingon an mga Konsehal',
  },
  'gov-hide-councilors': {
    en: 'Hide Councilors',
    fil: 'Itago ang mga Konsehal',
    bcl: 'Itago an mga Konsehal',
  },
  'hotline-results-count': {
    en: 'Showing {{visible}} of {{total}} contacts',
    fil: 'Ipinapakita ang {{visible}} sa {{total}} mga kontak',
    bcl: 'Pighihiling an {{visible}} sa {{total}} mga kontak',
  },
};

function quote(value) {
  return JSON.stringify(value);
}

function setKey(block, key, value) {
  const match = block.match(new RegExp(`(\\n\\s*)['"]${key}['"]\\s*:\\s*(['"][\\s\\S]*?['"]),`));
  if (match) {
    const indent = match[1];
    return {
      block: block.replace(match[0], `${indent}'${key}': ${quote(value)},`),
      changed: true,
    };
  }
  return { block, changed: false };
}

function applyKeys() {
  let source = fs.readFileSync(TABLE, 'utf8');

  for (const lang of LANGS) {
    const tableStart = source.indexOf('const translations = {');
    const tableEnd = source.indexOf('\n};', tableStart);
    const body = source.slice(tableStart, tableEnd + 3);

    const start = body.indexOf(`\n  ${lang}: {`);
    if (start === -1) throw new Error(`could not find the "${lang}" block`);

    const following = LANGS.slice(LANGS.indexOf(lang) + 1)
      .map((next) => body.indexOf(`\n  ${next}: {`))
      .filter((at) => at !== -1);
    const end = following.length ? Math.min(...following) : body.length;

    let block = body.slice(start, end);
    let replaced = 0;
    let inserted = 0;

    for (const [key, values] of Object.entries(NEW_KEYS)) {
      const val = values[lang];
      const res = setKey(block, key, val);
      if (res.changed) {
        block = res.block;
        replaced++;
      } else {
        const insertionMarker = '// Service guide copy START';
        const at = block.indexOf(insertionMarker);
        if (at !== -1) {
          block = block.slice(0, at) + `'${key}': ${quote(val)},\n    ` + block.slice(at);
          inserted++;
        } else {
          const opener = `\n  ${lang}: {`;
          const atOpener = block.indexOf(opener);
          block =
            block.slice(0, atOpener + opener.length) +
            `\n    '${key}': ${quote(val)},` +
            block.slice(atOpener + opener.length);
          inserted++;
        }
      }
    }

    source = source.slice(0, tableStart + start) + block + source.slice(tableStart + end);
    console.log(`${lang}: ${replaced} replaced, ${inserted} inserted`);
  }

  fs.writeFileSync(TABLE, source);
}

applyKeys();
