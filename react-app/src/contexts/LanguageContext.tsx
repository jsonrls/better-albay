'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Translation data
const translations: Record<string, Record<string, string>> = {
  en: {
    'history-1946': 'Information pending verification.',
    'history-1941': 'Information pending verification.',
    'history-1901': 'Information pending verification.',
    'history-1574': 'Information pending verification.',
    'health-network-6':
      'Health emergency and disaster response, including Mayon eruption preparedness',
    'health-network-5': 'PhilHealth enrollment and universal health care assistance',
    'health-network-4':
      'Provincial Health Office public health programs — immunization, maternal care, TB-DOTS',
    'health-network-3': 'District health offices covering the 1st, 2nd, and 3rd districts of Albay',
    'health-network-2': 'Barangay Health Stations and Barangay Health Workers across 720 barangays',
    'health-network-1': 'Rural Health Units in all 15 municipalities and 3 component cities',
    'health-hospital-ziga-address': 'Tabaco City',
    'health-hospital-ziga-desc':
      'A provincial hospital serving the communities of northern Albay from Tabaco City.',
    'health-hospital-ziga': 'Ziga Memorial Hospital',
    'health-hospital-provincial-address': 'Legazpi City',
    'health-hospital-provincial-desc':
      'Provincial government hospital services based in Legazpi City — the institution from which the Bicol Regional Training and Teaching Hospital grew before its turnover to the Department of Health.',
    'health-hospital-provincial': 'Albay Provincial Hospital',
    'health-hospital-brtth-address': 'Legazpi City',
    'health-hospital-brtth-desc':
      'Founded in 1918 during the American period, it began as the Albay Provincial Hospital before its turnover to the DOH. Designated a training and teaching hospital in February 1973, it was upgraded in 1994 to the tertiary regional hospital it is today.',
    'health-hospital-brtth': 'Bicol Regional Training and Teaching Hospital (BRTTH)',
    'history-2020': 'Information pending verification.',
    'history-2006': 'Information pending verification.',
    'history-1945': 'Information pending verification.',
    'history-1898': 'Information pending verification.',
    'history-1834': 'Information pending verification.',
    'history-1814': 'Information pending verification.',
    'history-1569': 'Information pending verification.',
    'nav-home': 'Home',
    'nav-services': 'Services',
    'nav-government': 'Government',
    'nav-statistics': 'Statistics',
    'nav-legislative': 'Legislative',
    'nav-transparency': 'Transparency',
    'nav-contact': 'Contact',

    // Appointment CTA
    'appointment-cta-heading':
      'Enhancing Appointment Services of the Office of the Provincial Governor of Albay',
    'appointment-cta-subtitle': 'No lines. No back-and-forth. Just efficient appointments.',
    'appointment-schedule-btn': 'Schedule Appointment',
    'appointment-create-btn': 'Create Account',

    // Hero Section
    'hero-welcome': 'Welcome to BetterAlbay.org',
    'hero-subtitle':
      'Access government services, information, and resources for the people of Albay, Philippines.',
    'hero-find-service': 'Find a Service',

    // Popular Services
    'section-popular': 'Popular Services',
    'service-certificates': 'Certificates',
    'service-certificates-desc': 'Birth, marriage, death certificates',
    'service-business': 'Business Permits',
    'service-business-desc': 'New permits and renewals',
    'service-tax': 'Tax Payments',
    'service-tax-desc': 'Property and business taxes',
    'service-social': 'Social Services',
    'service-social-desc': 'Senior citizen & PWD services',
    'service-health': 'Health Services',
    'service-health-desc': 'Medical assistance & programs',
    'btn-view-all-services': 'View All Services',

    // Latest Updates
    'section-updates': 'Latest Updates',
    'btn-view-all': 'View All',

    // Provincial Leadership
    'section-leadership': 'Provincial Leadership',
    'title-mayor': 'Governor',
    'title-vice-mayor': 'Vice Governor',
    'btn-view-officials': 'View All Officials',

    // Contact Section
    'section-contact': 'Contact Information',
    'contact-phone': 'Phone',
    'contact-email': 'Email',
    'contact-address': 'Address',
    'contact-hours': 'Mon-Fri: 8:00 AM - 5:00 PM',
    'contact-response': "We'll respond within 24 hours",
    'contact-municipal-hall': 'Albay Provincial Capitol',

    // Services Page
    'services-title': 'Municipal Services Directory',
    'services-subtitle': 'Browse all services offered by the Province of Albay',
    'life-events-title': 'Browse by Life Event',
    'life-events-subtitle': "Find services based on what's happening in your life",
    'life-starting-business': 'Starting a Business',
    'life-getting-married': 'Getting Married',
    'life-having-baby': 'Having a Baby',
    'life-financial-help': 'Need Financial Help',
    'life-senior': 'Senior Citizen Services',
    'life-pwd': 'Person with Disability',
    'life-building': 'Building/Home Improvement',
    'life-trouble': 'Got in Trouble',

    // Service Categories
    'cat-certificates': 'Certificates & Vital Records',
    'cat-certificates-desc': 'Birth, death, marriage certificates, and other vital records.',
    'cat-business': 'Business & Trade',
    'cat-business-desc': 'Business permits, licenses, and trade registration services.',
    'cat-social': 'Social Services',
    'cat-social-desc':
      'Welfare programs, senior citizen services, PWD benefits, and financial aid.',
    'cat-health': 'Health & Wellness',
    'cat-health-desc': 'Vaccination programs, health certificates, and medical assistance.',
    'cat-tax': 'Taxation & Payments',
    'cat-tax-desc': 'Property tax, business tax, payments, and tax clearance.',
    'cat-agriculture': 'Agriculture',
    'cat-agriculture-desc':
      'Agricultural loans, crop insurance, fertilizer assistance, and training.',
    'cat-infrastructure': 'Infrastructure',
    'cat-infrastructure-desc':
      'Construction permits, road maintenance requests, and public facilities.',
    'cat-education': 'Education & Scholarship',
    'cat-education-desc': 'Scholarship programs, student assistance, and educational grants.',
    'cat-safety': 'Public Safety',
    'cat-safety-desc': 'Emergency services, disaster preparedness, and community safety programs.',
    'cat-environment': 'Environment',
    'cat-environment-desc': 'Environmental permits, waste management, and conservation programs.',

    // FAQ Page
    'faq-title': 'Frequently Asked Questions',
    'faq-subtitle': 'Find answers to common questions about municipal services',
    'faq-general': 'General Questions',
    'faq-certificates': 'Certificates & Documents',
    'faq-business': 'Business & Permits',
    'faq-payments': 'Payments & Fees',
    'faq-social': 'Social Services',
    'faq-technical': 'Technical Questions',
    'faq-still-questions': 'Still have questions?',
    'faq-contact-help':
      "If you didn't find the answer you were looking for, please don't hesitate to contact us.",

    // Common Labels
    'label-fee': 'Fee:',
    'label-time': 'Time:',
    'label-free': 'Free',
    'label-varies': 'Varies',
    'label-walk-in': 'Walk-in',
    'label-seasonal': 'Seasonal',
    'label-1-day': '1 day',
    'label-1-2-days': '1-2 days',
    'label-3-5-days': '3-5 days',
    'section-responsible-offices': 'Responsible Offices',

    // Health Page
    'health-page-title': 'Health Services',
    'health-page-desc': 'Medical consultations, vaccinations, and health programs',
    'health-page-badge': 'Health',
    'health-consultation': 'Medical Consultation',
    'health-consultation-desc': 'Free consultation at Rural Health Units',
    'health-vaccination': 'Vaccination Programs',
    'health-vaccination-desc': 'Free immunization for children and adults',
    'health-prenatal': 'Prenatal Care',
    'health-prenatal-desc': 'Free prenatal checkups and services',
    'health-dental': 'Dental Services',
    'health-dental-desc': 'Basic dental care and extraction',
    'health-stats-title': 'Health Statistics',
    'health-rhu': 'Rural Health Units',
    'health-bhw': 'Barangay Health Workers',
    'health-hospitals-title': 'Hospitals in the Area',
    'label-schedule-varies': 'Schedule varies',
    'label-by-appointment': 'By appointment',
    'label-free-subsidy': 'Free (subsidy)',
    'label-1-3-days': '1-3 days',
    'health-maternal': 'Maternal Care',
    'health-maternal-desc': 'Prenatal and postnatal health services',
    'health-medicine': 'Medicine Assistance',
    'health-medicine-desc': 'Financial assistance for medicines through MSWDO',
    'health-stat-facilities': 'LGUs with Rural Health Units',
    'health-stat-hospitals': 'Major Public Hospitals',
    'health-stat-mho': 'Provincial Health Office',
    'health-section-hospitals': 'Public Hospitals in Albay',
    'health-section-mho': 'Provincial Health Office',
    'health-bhs-subtitle':
      'Provincial hospitals and rural health units serving all 18 LGUs and 720 barangays of Albay.',
    'health-mho-title': 'Albay Provincial Health Office (PHO)',
    'health-mho-desc':
      'The Provincial Health Office oversees public health programs, district hospitals, and rural health units across the province’s three districts.',
    'health-service-lying-in': 'Lying-in Facility',
    'health-service-laboratory': 'Laboratory Services',
    'health-service-immunization': 'Immunization',
    'health-service-prenatal': 'Prenatal Care',
    'health-service-family-planning': 'Family Planning',
    'health-service-tb-dots': 'TB-DOTS',
    'health-hivcare-cta-eyebrow': 'Official DOH-Sourced Directory',
    'health-hivcare-cta-heading': 'Find HIV Treatment & Care Facilities Near You',
    'health-hivcare-cta-desc':
      'A searchable, mobile-first web directory of all 338 DOH-designated HIV treatment and care facilities in the Philippines, sourced from DOH Circular No. 2026-0065.',
    'health-hivcare-cta-btn': 'Find HIV Care Facilities',
    'health-hivcare-cta-stat-facilities': 'Facilities Nationwide',
    'health-hivcare-cta-stat-mobile': 'Mobile-Friendly Search',
    'health-hivcare-cta-stat-verified': 'DOH-Verified Listings',

    // Agriculture Page
    'agri-page-title': 'Agriculture Services',
    'agri-page-desc': 'Support for farmers and agricultural development',
    'agri-page-badge': 'Agriculture',
    'agri-seedling': 'Seedling Distribution',
    'agri-seedling-desc': 'Free seeds and seedlings for farmers',
    'agri-equipment': 'Farm Equipment',
    'agri-equipment-desc': 'Equipment rental and assistance',
    'agri-livelihood': 'Livelihood Programs',
    'agri-livelihood-desc': 'Training and support for farmers',
    'agri-office-mao': 'Municipal Agriculture Office',
    'agri-office-mao-desc':
      'RSBSA registration, certifications, rice/corn programs, livestock, fishery services',

    // Ordinance Framework Page
    'ord-page-title': 'Ordinance Framework',
    'ord-page-desc': 'Municipal ordinances enacted by the Sangguniang Panlalawigan ng Albay',
    'ord-page-badge': 'Legislative',
    'ord-what-is': 'What is an Ordinance?',
    'ord-what-is-p1':
      'A municipal ordinance is a local law enacted by the Sangguniang Bayan (Municipal Council) that governs the municipality and its residents. Ordinances have the force and effect of law within the territorial jurisdiction of the municipality.',
    'ord-what-is-p2':
      'Ordinances may cover various subjects including but not limited to: taxation, business regulations, public safety, environmental protection, traffic management, and zoning.',
    'ord-categories-title': 'Ordinance Categories',
    'ord-cat-revenue': 'Revenue & Taxation',
    'ord-cat-business': 'Business & Trade',
    'ord-cat-safety': 'Public Safety',
    'ord-cat-environment': 'Environment',
    'ord-cat-traffic': 'Traffic & Transportation',
    'ord-cat-zoning': 'Zoning & Land Use',
    'ord-2025-title': '2025 Ordinances',
    'ord-2025-subtitle':
      'Official ordinances enacted by the Sangguniang Panlalawigan ng Albay in 2025',
    'ord-table-number': 'Ordinance No.',
    'ord-table-title': 'Title',
    'ord-table-date': 'Session Date',
    'ord-view-all': 'View All Ordinances on SB Website',

    // Resolution Framework Page
    'reso-page-title': 'Resolution Framework',
    'reso-page-desc': 'Resolutions passed by the Sangguniang Panlalawigan ng Albay',
    'reso-page-badge': 'Legislative',
    'reso-what-is': 'What is a Resolution?',
    'reso-what-is-p1':
      'A resolution is a formal expression of the opinion or will of the Sangguniang Bayan. Unlike ordinances, resolutions do not have the force and effect of law but serve as official statements of the legislative body.',
    'reso-what-is-p2':
      'Resolutions are commonly used for: commendations, requests to higher government agencies, expressions of support or opposition, and administrative matters of the Sangguniang Bayan.',
    'reso-types-title': 'Types of Resolutions',
    'reso-type-commendation': 'Commendation',
    'reso-type-request': 'Request/Appeal',
    'reso-type-support': 'Support/Endorsement',
    'reso-type-condolence': 'Condolence',
    'reso-type-authorization': 'Authorization',
    'reso-type-appropriation': 'Appropriation',
    'reso-2026-title': '2026 Resolutions',
    'reso-2026-subtitle':
      'Official resolutions passed by the Sangguniang Panlalawigan ng Albay in 2026',
    'reso-2025-title': '2025 Resolutions',
    'reso-2025-subtitle':
      'Official resolutions passed by the Sangguniang Panlalawigan ng Albay in 2025',
    'reso-table-number': 'Resolution No.',
    'reso-table-title': 'Title',
    'reso-table-date': 'Session Date',
    'reso-view-all': 'View All Resolutions on SB Website',

    // Business Services Page
    'biz-page-title': 'Business Services',
    'biz-page-desc': 'Permits, licenses, and support for businesses in Albay',
    'biz-page-badge': 'Business',
    'biz-permit-new': 'Business Permit (New)',
    'biz-permit-new-desc': "Apply for a new mayor's permit for your business",
    'biz-permit-renew': 'Business Permit Renewal',
    'biz-permit-renew-desc': 'Renew your annual business permit',
    'biz-closure': 'Business Closure',
    'biz-closure-desc': 'Process business closure and clearance',
    'biz-cedula': 'Cedula (CTC)',
    'biz-cedula-desc': 'Community tax certificate for individuals and businesses',
    'biz-online-badge': 'Online Services via Filipizen',
    'biz-online-title': 'Online Business Transactions',
    'biz-online-subtitle':
      'Complete your business transactions online through the official Filipizen portal',
    'biz-billing': 'Business Online Billing & Payment',
    'biz-billing-desc': 'View and pay your business tax bills online',

    // Tax & Payments Page
    'tax-page-title': 'Tax & Payments',
    'tax-page-desc': 'Property tax, business tax, and other municipal payments',
    'tax-page-badge': 'Tax & Payments',
    'tax-property': 'Real Property Tax',
    'tax-property-desc': 'Annual tax on land and improvements',
    'tax-business': 'Business Tax',
    'tax-business-desc': 'Quarterly and annual business tax payments',
    'tax-online-badge': 'Online Services via Filipizen',
    'tax-online-title': 'Online Tax Transactions',
    'tax-online-subtitle':
      'Complete your tax payments online through the official Filipizen portal',

    // Social Services Page
    'social-page-title': 'Social Services',
    'social-page-desc': 'Support programs for vulnerable sectors and communities',
    'social-page-badge': 'Social Services',
    'social-senior': 'Senior Citizen ID',
    'social-senior-desc': 'ID for citizens 60 years and above',
    'social-pwd': 'PWD ID',
    'social-pwd-desc': 'Identification for persons with disabilities',
    'social-assistance': 'Financial Assistance',
    'social-assistance-desc': 'Emergency financial aid for medical, burial, and education',

    // Education Page
    'edu-page-title': 'Education Services',
    'edu-page-desc': 'Scholarship programs and educational assistance',
    'edu-page-badge': 'Education',
    'edu-scholarship': 'Scholarship Programs',
    'edu-scholarship-desc': 'Municipal scholarships for students',
    'edu-training': 'Educational Assistance',
    'edu-training-desc': 'Financial aid for education',

    // Infrastructure Page
    'infra-page-title': 'Infrastructure Services',
    'infra-page-desc': 'Building permits, construction, and engineering services',
    'infra-page-badge': 'Infrastructure',
    'infra-building': 'Building Permit',
    'infra-building-desc': 'Permit for new construction and renovation',
    'infra-occupancy': 'Occupancy Permit',
    'infra-occupancy-desc': 'Certificate of occupancy for completed buildings',
    'infra-engineering': 'Engineering Services',
    'infra-engineering-desc': 'Technical assistance and plan review',

    // Public Safety Page
    'safety-page-title': 'Public Safety Services',
    'safety-page-desc': 'Emergency response and disaster preparedness',
    'safety-page-badge': 'Public Safety',
    'safety-disaster': 'Emergency Response',
    'safety-disaster-desc': '24/7 emergency response and rescue services',
    'safety-relief': 'Disaster Assistance',
    'safety-relief-desc': 'Relief goods and evacuation support',
    'safety-preparedness': 'Disaster Preparedness',
    'safety-preparedness-desc': 'Training and resources for disaster readiness',

    // Environment Page
    'env-page-title': 'Environment Services',
    'env-page-desc': 'Waste management and environmental protection',
    'env-page-badge': 'Environment',
    'env-waste': 'Garbage Collection',
    'env-waste-desc': 'Waste collection schedules by barangay',
    'env-recycling': 'Recycling Program',
    'env-recycling-desc': 'Segregation and recycling initiatives',

    // Header Dropdown Items
    'dropdown-certificates': 'Certificates',
    'dropdown-business': 'Business',
    'dropdown-tax-payments': 'Tax Payments',
    'dropdown-social-services': 'Social Services',
    'dropdown-health': 'Health',
    'dropdown-agriculture': 'Agriculture',
    'dropdown-infrastructure': 'Infrastructure',
    'dropdown-education': 'Education',
    'dropdown-public-safety': 'Public Safety',
    'dropdown-environment': 'Environment',
    'dropdown-ordinance-framework': 'Ordinance Framework',
    'dropdown-resolution-framework': 'Resolution Framework',

    // Homepage - Hero
    'hero-browse-services': 'Browse Services',
    'hero-contact-us': 'Contact Us',
    'hero-search-placeholder': 'e.g., birth certificate, business permit',
    'hero-popular': 'Popular:',
    'hero-birth-certificate': 'Birth Certificate',
    'hero-business-permit': 'Business Permit',
    'hero-real-property-tax': 'Real Property Tax',

    // Homepage - Popular Services
    'popular-services-subtitle': 'Quick access to frequently requested municipal services',
    'popular-browse-directory': 'Browse complete directory',

    // Homepage - Stats
    'stats-at-a-glance': 'Albay at a Glance',
    'stats-view-statistics': 'View Statistics',
    'stats-population-label': 'Population',
    'stats-population-source': 'PSA 2020 Census',
    'stats-barangays-label': 'Barangays',
    'stats-barangays-source': 'Administrative Units',
    'stats-municipality-label': 'Province',
    'stats-municipality-source': 'Income Classification',
    'stats-land-area-label': 'Land Area',
    'stats-land-area-source': 'Total Provincial Land Area',
    'weather-map-title': 'Weather and Map of Albay',
    'weather-mainly-clear': 'Mainly clear',
    'weather-location': 'Legazpi City, Albay',
    'home-brief-history-of-albay': 'Brief History of Albay',
    'history-title': 'Brief History of Albay',
    'history-1760': 'Information pending verification.',
    'history-1767': 'Information pending verification.',
    'history-1768': 'Information pending verification.',
    'history-1851': 'Information pending verification.',
    'history-1853': 'Information pending verification.',
    'history-1889': 'Information pending verification.',
    'history-1957': 'Information pending verification.',
    'history-once-largest-title': 'Information pending verification.',
    'history-once-largest-desc': 'Information pending verification.',
    'history-urban-planning-title': 'Information pending verification.',
    'history-urban-planning-desc': 'Information pending verification.',
    'news-announcement': 'Announcement',
    'news-project': 'Project',
    'news-advisory': 'Advisory',
    'news-business-permit-title': 'BetterAlbay.org Is Now Online',
    'news-business-permit-desc':
      'The community-built transparency portal for Albay Province has launched its first release.',
    'news-market-title': 'Community Volunteers Welcome',
    'news-market-desc':
      'Developers, researchers, and writers can help gather and verify public data for the portal.',
    'news-power-title': 'Official Data Sources Being Compiled',
    'news-power-desc':
      'Officials, demographics, and services data are being compiled from official government portals.',
    'quiz-title': 'Albay Quiz',
    'quiz-subtitle': 'How well do you know Albay, Philippines?',
    'quiz-description':
      "Evaluate your familiarity with the province's heritage, cultural identity, and geographic significance through an interactive knowledge assessment designed to showcase one of Bicol Region's most prominent localities.",
    'quiz-take': 'Take the Quiz',

    // Footer
    'footer-tagline':
      'Empowering the people of Albay with transparent access to the services, programs, and public funds of LGU Albay.',
    'footer-quick-links': 'Quick Links',
    'footer-resources': 'Resources',
    'footer-albay-quiz': 'Albay Quiz',
    'footer-sitemap': 'Sitemap',
    'footer-citizens-charter': "Citizen's Charter",
    'footer-terms': 'Terms of Use',
    'footer-privacy': 'Privacy Policy',
    'footer-accessibility': 'Accessibility',
    'footer-faq': 'FAQ',
    'footer-open-data': 'Open Data Philippines',
    'footer-foi': 'Freedom of Information',
    'footer-lgu-portal': 'Official LGU Albay Portal',
    'footer-sb': 'Sangguniang Bayan',
    'footer-lgu-facebook': 'LGU Albay Facebook',
    'footer-blgf': 'BLGF Portal',
    'footer-cmci': 'CMCI DTI Portal',
    'footer-cost': 'Cost to the People of Albay =',
    'footer-volunteer': 'Volunteer with us',
    'footer-contribute': 'Contribute code with us',
    'footer-copyright-text': 'BetterAlbay.org',
    'footer-copyright-disclaimer':
      'Verify current information with the responsible government office.',
    'footer-skip-to-main': 'Skip to main content',
  },
  fil: {
    'history-1946': 'Information pending verification.',
    'history-1941': 'Information pending verification.',
    'history-1901': 'Information pending verification.',
    'history-1574': 'Information pending verification.',
    'health-hospital-ziga-address': 'Lungsod ng Tabaco',
    'health-hospital-ziga': 'Ziga Memorial Hospital',
    'health-hospital-provincial-address': 'Lungsod ng Legazpi',
    'health-hospital-provincial': 'Albay Provincial Hospital',
    'health-hospital-brtth-address': 'Lungsod ng Legazpi',
    'health-hospital-brtth': 'Bicol Regional Training and Teaching Hospital (BRTTH)',
    'health-section-bhs': 'Panlalawigang Network ng Kalusugan',
    'history-2020': 'Information pending verification.',
    'history-2006': 'Information pending verification.',
    'history-1945': 'Information pending verification.',
    'history-1898': 'Information pending verification.',
    'history-1834': 'Information pending verification.',
    'history-1814': 'Information pending verification.',
    'history-1569': 'Information pending verification.',
    'nav-home': 'Tahanan',
    'nav-services': 'Mga Serbisyo',
    'nav-government': 'Pamahalaan',
    'nav-statistics': 'Estadistika',
    'nav-legislative': 'Lehislatura',
    'nav-transparency': 'Transparensiya',
    'nav-contact': 'Makipag-ugnayan',

    // Appointment CTA
    'appointment-cta-heading':
      'Pagpapahusay ng Serbisyo sa Appointment ng Tanggapan ng Gubernador ng Lalawigan ng Albay',
    'appointment-cta-subtitle': 'Walang pila. Walang pabalik-balik. Mahusay na appointment lang.',
    'appointment-schedule-btn': 'Mag-iskedyul ng Appointment',
    'appointment-create-btn': 'Gumawa ng Account',

    // Hero Section
    'hero-welcome': 'Maligayang Pagdating sa BetterAlbay.org',
    'hero-subtitle':
      'I-access ang mga serbisyo ng pamahalaan, impormasyon, at mga mapagkukunan para sa mga mamamayan ng Albay, Philippines.',
    'hero-find-service': 'Maghanap ng Serbisyo',

    // Popular Services
    'section-popular': 'Mga Sikat na Serbisyo',
    'service-certificates': 'Mga Sertipiko',
    'service-certificates-desc': 'Sertipiko ng kapanganakan, kasal, at kamatayan',
    'service-business': 'Mga Permit sa Negosyo',
    'service-business-desc': 'Bagong permit at pag-renew',
    'service-tax': 'Pagbabayad ng Buwis',
    'service-tax-desc': 'Buwis sa ari-arian at negosyo',
    'service-social': 'Serbisyong Panlipunan',
    'service-social-desc': 'Serbisyo para sa senior citizen at PWD',
    'service-health': 'Serbisyong Pangkalusugan',
    'service-health-desc': 'Tulong medikal at mga programa',
    'btn-view-all-services': 'Tingnan Lahat ng Serbisyo',

    // Latest Updates
    'section-updates': 'Pinakabagong mga Update',
    'btn-view-all': 'Tingnan Lahat',

    // Provincial Leadership
    'section-leadership': 'Pamunuan ng Lalawigan',
    'title-mayor': 'Gobernador',
    'title-vice-mayor': 'Bise Gobernador',
    'btn-view-officials': 'Tingnan Lahat ng Opisyal',

    // Contact Section
    'section-contact': 'Impormasyon sa Pakikipag-ugnayan',
    'contact-phone': 'Telepono',
    'contact-email': 'Email',
    'contact-address': 'Adres',
    'contact-hours': 'Lunes-Biyernes: 8:00 AM - 5:00 PM',
    'contact-response': 'Sasagutin namin sa loob ng 24 na oras',
    'contact-municipal-hall': 'Kapitolyo ng Lalawigan',

    // Services Page
    'services-title': 'Direktoryo ng Serbisyong Munisipal',
    'services-subtitle': 'Tingnan ang lahat ng serbisyong inaalok ng Lalawigan ng Albay',
    'life-events-title': 'Maghanap Ayon sa Pangyayari sa Buhay',
    'life-events-subtitle': 'Hanapin ang mga serbisyo batay sa nangyayari sa iyong buhay',
    'life-starting-business': 'Magsimula ng Negosyo',
    'life-getting-married': 'Magpakasal',
    'life-having-baby': 'Magkaanak',
    'life-financial-help': 'Kailangan ng Tulong Pinansyal',
    'life-senior': 'Serbisyo para sa Senior Citizen',
    'life-pwd': 'Taong may Kapansanan',
    'life-building': 'Pagtatayo/Pagpapabuti ng Bahay',
    'life-trouble': 'Nalagay sa Problema',

    // Service Categories
    'cat-certificates': 'Mga Sertipiko at Vital Records',
    'cat-certificates-desc':
      'Sertipiko ng kapanganakan, kamatayan, kasal, at iba pang vital records.',
    'cat-business': 'Negosyo at Kalakalan',
    'cat-business-desc':
      'Mga permit sa negosyo, lisensya, at serbisyo sa pagpaparehistro ng kalakalan.',
    'cat-social': 'Serbisyong Panlipunan',
    'cat-social-desc':
      'Mga programa sa kapakanan, serbisyo para sa senior citizen, benepisyo ng PWD, at tulong pinansyal.',
    'cat-health': 'Kalusugan at Kagalingan',
    'cat-health-desc': 'Mga programa sa bakuna, health certificates, at tulong medikal.',
    'cat-tax': 'Pagbubuwis at Pagbabayad',
    'cat-tax-desc': 'Buwis sa ari-arian, buwis sa negosyo, pagbabayad, at tax clearance.',
    'cat-agriculture': 'Agrikultura',
    'cat-agriculture-desc':
      'Mga pautang sa agrikultura, insurance sa pananim, tulong sa pataba, at pagsasanay.',
    'cat-infrastructure': 'Imprastraktura',
    'cat-infrastructure-desc':
      'Mga permit sa konstruksyon, kahilingan sa pagpapanatili ng kalsada, at pampublikong pasilidad.',
    'cat-education': 'Edukasyon at Iskolarship',
    'cat-education-desc':
      'Mga programa sa iskolarship, tulong sa estudyante, at mga grant sa edukasyon.',
    'cat-safety': 'Kaligtasan ng Publiko',
    'cat-safety-desc':
      'Mga serbisyong pang-emergency, paghahanda sa sakuna, at mga programa sa kaligtasan ng komunidad.',
    'cat-environment': 'Kapaligiran',
    'cat-environment-desc':
      'Mga permit sa kapaligiran, pamamahala ng basura, at mga programa sa konserbasyon.',

    // FAQ Page
    'faq-title': 'Mga Madalas Itanong',
    'faq-subtitle':
      'Hanapin ang mga sagot sa mga karaniwang tanong tungkol sa mga serbisyong munisipal',
    'faq-general': 'Mga Pangkalahatang Tanong',
    'faq-certificates': 'Mga Sertipiko at Dokumento',
    'faq-business': 'Negosyo at Permit',
    'faq-payments': 'Pagbabayad at Bayarin',
    'faq-social': 'Serbisyong Panlipunan',
    'faq-technical': 'Mga Teknikal na Tanong',
    'faq-still-questions': 'May tanong pa ba kayo?',
    'faq-contact-help':
      'Kung hindi ninyo nakita ang sagot na hinahanap, huwag mag-atubiling makipag-ugnayan sa amin.',

    // Common Labels - Filipino
    'label-fee': 'Bayad:',
    'label-time': 'Oras:',
    'label-free': 'Libre',
    'label-varies': 'Nag-iiba',
    'label-walk-in': 'Walk-in',
    'label-seasonal': 'Pana-panahon',
    'label-1-day': '1 araw',
    'label-1-2-days': '1-2 araw',
    'label-3-5-days': '3-5 araw',
    'section-responsible-offices': 'Mga Responsableng Opisina',

    // Health Page - Filipino
    'health-page-title': 'Serbisyong Pangkalusugan',
    'health-page-desc': 'Mga konsultasyong medikal, bakuna, at programa sa kalusugan',
    'health-page-badge': 'Kalusugan',
    'health-consultation': 'Konsultasyong Medikal',
    'health-consultation-desc': 'Libreng konsultasyon sa Rural Health Units',
    'health-vaccination': 'Mga Programa sa Bakuna',
    'health-vaccination-desc': 'Libreng immunization para sa mga bata at matatanda',
    'health-prenatal': 'Prenatal Care',
    'health-prenatal-desc': 'Libreng prenatal checkups at serbisyo',
    'health-dental': 'Serbisyong Dental',
    'health-dental-desc': 'Basic dental care at bunot',
    'health-stats-title': 'Estadistika ng Kalusugan',
    'health-rhu': 'Rural Health Units',
    'health-bhw': 'Barangay Health Workers',
    'health-hospitals-title': 'Mga Ospital sa Lugar',
    'label-schedule-varies': 'Iba-iba ang iskedyul',
    'label-by-appointment': 'Sa pamamagitan ng appointment',
    'label-free-subsidy': 'Libre (subsidiya)',
    'label-1-3-days': '1-3 araw',
    'health-maternal': 'Pangangalaga sa Ina',
    'health-maternal-desc': 'Serbisyo sa kalusugan bago at pagkatapos manganak',
    'health-medicine': 'Tulong sa Gamot',
    'health-medicine-desc': 'Tulong pinansyal para sa gamot sa pamamagitan ng MSWDO',
    'health-stat-facilities': 'Kabuuang Pasilidad sa Kalusugan',
    'health-stat-hospitals': 'Mga Pangunahing Ospital',
    'health-stat-mho': 'Opisina ng Kalusugan ng Munisipalidad',
    'health-section-hospitals': 'Mga Pampublikong Ospital sa Albay',
    'health-section-mho': 'Panlalawigang Opisina ng Kalusugan',
    'health-bhs-subtitle':
      'Mga panlalawigang ospital at rural health units na naglilingkod sa 18 LGU at 720 barangay ng Albay.',
    'health-mho-title': 'Albay Provincial Health Office (PHO)',
    'health-mho-desc':
      'Ang Municipal Health Office ay nagbibigay ng pangunahing serbisyo sa kalusugan kabilang ang lying-in facility at laboratory services. Ito ang pangunahing public health center ng munisipalidad.',
    'health-service-lying-in': 'Lying-in Facility',
    'health-service-laboratory': 'Serbisyo sa Laboratoryo',
    'health-service-immunization': 'Immunisasyon',
    'health-service-prenatal': 'Pangangalaga Bago Manganak',
    'health-service-family-planning': 'Pagpaplano ng Pamilya',
    'health-service-tb-dots': 'TB-DOTS',
    'health-pltciluis-a-tiam-medical-center': 'PLTCI-Luis A. Tiam Medical Center',
    'health-a-tertiary-level-philhealthaccredited-private':
      'A tertiary level, PhilHealth-accredited pribadong hospital nagbibigay ng komprehensibong mga serbisyong medikal.',
    'health-medical-mission-group-hospital-health-services':
      'Medical Mission Group Hospital & Health Mga serbisyo Cooperative',
    'health-also-known-as-new-mmg-hospital-providing-quality':
      'Also known as Bagong MMG Hospital, nagbibigay ng quality mga serbisyo sa kalusugan sa ang community.',
    'health-bintawan-road-brgy-quezon': 'Bintawan Road, Brgy. Quezon',
    'health-salubris-inc-salubris-medical-center': 'SALUBRIS, INC. (Salubris Medical Center)',
    'health-private-medical-center-offering-various':
      'Pribado medical center offering various healthcare and diagnostic mga serbisyo.',
    'health-hivcare-cta-eyebrow': 'Opisyal na Direktoryo mula sa DOH',
    'health-hivcare-cta-heading': 'Hanapin ang Pasilidad para sa Paggamot at Pangangalaga sa HIV',
    'health-hivcare-cta-desc':
      'A searchable, mobile-first web directory of all 338 DOH-designated HIV treatment and care facilities in the Philippines, sourced from DOH Circular No. 2026-0065.',
    'health-hivcare-cta-btn': 'Find HIV Care Facilities',
    'health-hivcare-cta-stat-facilities': 'Pasilidad sa Buong Bansa',
    'health-hivcare-cta-stat-mobile': 'Mobile-Friendly na Paghahanap',
    'health-hivcare-cta-stat-verified': 'Beripikado ng DOH',

    // Agriculture Page - Filipino
    'agri-page-title': 'Serbisyong Agrikultura',
    'agri-page-desc': 'Suporta para sa mga magsasaka at pag-unlad ng agrikultura',
    'agri-page-badge': 'Agrikultura',
    'agri-seedling': 'Pamamahagi ng Binhi',
    'agri-seedling-desc': 'Libreng buto at binhi para sa mga magsasaka',
    'agri-equipment': 'Kagamitan sa Bukid',
    'agri-equipment-desc': 'Renta at tulong sa kagamitan',
    'agri-livelihood': 'Mga Programa sa Kabuhayan',
    'agri-livelihood-desc': 'Pagsasanay at suporta para sa mga magsasaka',
    'agri-office-mao': 'Opisina ng Agrikultura ng Munisipalidad',
    'agri-office-mao-desc':
      'Pagpaparehistro sa RSBSA, mga sertipikasyon, programa sa palay/mais, livestock, serbisyo sa pangisdaan',

    // Ordinance Framework Page - Filipino
    'ord-page-title': 'Balangkas ng Ordinansa',
    'ord-page-desc': 'Mga ordinansang ipinasa ng Sangguniang Panlalawigan ng Albay',
    'ord-page-badge': 'Lehislatura',
    'ord-what-is': 'Ano ang Ordinansa?',
    'ord-what-is-p1':
      'Ang munisipal na ordinansa ay lokal na batas na ipinasa ng Sangguniang Bayan (Konseho ng Munisipalidad) na namamahala sa munisipalidad at mga residente nito. Ang mga ordinansa ay may bisa at epekto ng batas sa saklaw ng munisipalidad.',
    'ord-what-is-p2':
      "Ang mga ordinansa ay maaaring sumasaklaw sa iba't ibang paksa kabilang ngunit hindi limitado sa: pagbubuwis, regulasyon sa negosyo, kaligtasang pampubliko, proteksyon sa kapaligiran, pamamahala ng trapiko, at zoning.",
    'ord-categories-title': 'Mga Kategorya ng Ordinansa',
    'ord-cat-revenue': 'Kita at Pagbubuwis',
    'ord-cat-business': 'Negosyo at Kalakalan',
    'ord-cat-safety': 'Kaligtasang Pampubliko',
    'ord-cat-environment': 'Kapaligiran',
    'ord-cat-traffic': 'Trapiko at Transportasyon',
    'ord-cat-zoning': 'Zoning at Paggamit ng Lupa',
    'ord-2025-title': 'Mga Ordinansa ng 2025',
    'ord-2025-subtitle':
      'Mga opisyal na ordinansang ipinasa ng Sangguniang Panlalawigan ng Albay sa 2025',
    'ord-table-number': 'Numero ng Ordinansa',
    'ord-table-title': 'Pamagat',
    'ord-table-date': 'Petsa ng Sesyon',
    'ord-view-all': 'Tingnan Lahat ng Ordinansa sa SB Website',

    // Resolution Framework Page - Filipino
    'reso-page-title': 'Balangkas ng Resolusyon',
    'reso-page-desc': 'Mga resolusyong ipinasa ng Sangguniang Panlalawigan ng Albay',
    'reso-page-badge': 'Lehislatura',
    'reso-what-is': 'Ano ang Resolusyon?',
    'reso-what-is-p1':
      'Ang resolusyon ay pormal na pagpapahayag ng opinyon o kalooban ng Sangguniang Bayan. Hindi tulad ng mga ordinansa, ang mga resolusyon ay walang bisa at epekto ng batas ngunit nagsisilbing opisyal na pahayag ng lehislatura.',
    'reso-what-is-p2':
      'Ang mga resolusyon ay karaniwang ginagamit para sa: mga pagpupugay, mga kahilingan sa mas mataas na ahensya ng pamahalaan, mga pagpapahayag ng suporta o pagtutol, at mga administratibong bagay ng Sangguniang Bayan.',
    'reso-types-title': 'Mga Uri ng Resolusyon',
    'reso-type-commendation': 'Pagpupugay',
    'reso-type-request': 'Kahilingan/Apela',
    'reso-type-support': 'Suporta/Endorsement',
    'reso-type-condolence': 'Pakikiramay',
    'reso-type-authorization': 'Awtorisasyon',
    'reso-type-appropriation': 'Apropriyasyon',
    'reso-2026-title': 'Mga Resolusyon ng 2026',
    'reso-2026-subtitle':
      'Mga opisyal na resolusyong ipinasa ng Sangguniang Panlalawigan ng Albay sa 2026',
    'reso-2025-title': 'Mga Resolusyon ng 2025',
    'reso-2025-subtitle':
      'Mga opisyal na resolusyong ipinasa ng Sangguniang Panlalawigan ng Albay sa 2025',
    'reso-table-number': 'Numero ng Resolusyon',
    'reso-table-title': 'Pamagat',
    'reso-table-date': 'Petsa ng Sesyon',
    'reso-view-all': 'Tingnan Lahat ng Resolusyon sa SB Website',

    // Business Services Page - Filipino
    'biz-page-title': 'Serbisyo sa Negosyo',
    'biz-page-desc': 'Mga permit, lisensya, at suporta para sa mga negosyo sa Albay',
    'biz-page-badge': 'Negosyo',
    'biz-permit-new': 'Permit ng Negosyo (Bago)',
    'biz-permit-new-desc': "Mag-apply ng bagong mayor's permit para sa iyong negosyo",
    'biz-permit-renew': 'Pag-renew ng Permit ng Negosyo',
    'biz-permit-renew-desc': 'I-renew ang taunang permit ng negosyo',
    'biz-closure': 'Pagsasara ng Negosyo',
    'biz-closure-desc': 'Proseso ng pagsasara at clearance ng negosyo',
    'biz-cedula': 'Sedula (CTC)',
    'biz-cedula-desc': 'Community tax certificate para sa mga indibidwal at negosyo',
    'biz-online-badge': 'Online Services sa pamamagitan ng Filipizen',
    'biz-online-title': 'Online na Transaksyon sa Negosyo',
    'biz-online-subtitle':
      'Kumpletuhin ang iyong mga transaksyon sa negosyo online sa pamamagitan ng opisyal na portal ng Filipizen',
    'biz-billing': 'Online Billing at Pagbabayad ng Negosyo',
    'biz-billing-desc': 'Tingnan at bayaran ang iyong business tax bills online',

    // Tax & Payments Page - Filipino
    'tax-page-title': 'Buwis at Pagbabayad',
    'tax-page-desc': 'Buwis sa ari-arian, buwis sa negosyo, at iba pang bayarin sa munisipalidad',
    'tax-page-badge': 'Buwis at Pagbabayad',
    'tax-property': 'Real Property Tax',
    'tax-property-desc': 'Taunang buwis sa lupa at mga pagpapabuti',
    'tax-business': 'Buwis sa Negosyo',
    'tax-business-desc': 'Quarterly at taunang pagbabayad ng buwis sa negosyo',
    'tax-online-badge': 'Online Services sa pamamagitan ng Filipizen',
    'tax-online-title': 'Online na Transaksyon sa Buwis',
    'tax-online-subtitle':
      'Kumpletuhin ang iyong mga pagbabayad ng buwis online sa pamamagitan ng opisyal na portal ng Filipizen',

    // Social Services Page - Filipino
    'social-page-title': 'Serbisyong Panlipunan',
    'social-page-desc': 'Mga programa ng suporta para sa mga vulnerable na sektor at komunidad',
    'social-page-badge': 'Serbisyong Panlipunan',
    'social-senior': 'Senior Citizen ID',
    'social-senior-desc': 'ID para sa mga mamamayang 60 taong gulang pataas',
    'social-pwd': 'PWD ID',
    'social-pwd-desc': 'Pagkakakilanlan para sa mga may kapansanan',
    'social-assistance': 'Tulong Pinansyal',
    'social-assistance-desc': 'Emergency na tulong pinansyal para sa medikal, libing, at edukasyon',

    // Education Page - Filipino
    'edu-page-title': 'Serbisyong Pang-edukasyon',
    'edu-page-desc': 'Mga programa ng iskolarship at tulong pang-edukasyon',
    'edu-page-badge': 'Edukasyon',
    'edu-scholarship': 'Mga Programa ng Iskolarship',
    'edu-scholarship-desc': 'Mga iskolarship ng munisipalidad para sa mga estudyante',
    'edu-training': 'Tulong Pang-edukasyon',
    'edu-training-desc': 'Tulong pinansyal para sa edukasyon',

    // Infrastructure Page - Filipino
    'infra-page-title': 'Serbisyong Imprastraktura',
    'infra-page-desc': 'Building permits, konstruksyon, at serbisyong engineering',
    'infra-page-badge': 'Imprastraktura',
    'infra-building': 'Building Permit',
    'infra-building-desc': 'Permit para sa bagong konstruksyon at renovation',
    'infra-occupancy': 'Occupancy Permit',
    'infra-occupancy-desc': 'Certificate of occupancy para sa natapos na mga gusali',
    'infra-engineering': 'Serbisyong Engineering',
    'infra-engineering-desc': 'Teknikal na tulong at pagsusuri ng plano',

    // Public Safety Page - Filipino
    'safety-page-title': 'Serbisyong Pangkaligtasan',
    'safety-page-desc': 'Tugon sa emergency at paghahanda sa kalamidad',
    'safety-page-badge': 'Kaligtasang Pampubliko',
    'safety-disaster': 'Tugon sa Emergency',
    'safety-disaster-desc': '24/7 na tugon at serbisyong rescue sa emergency',
    'safety-relief': 'Tulong sa Kalamidad',
    'safety-relief-desc': 'Relief goods at suporta sa paglikas',
    'safety-preparedness': 'Paghahanda sa Kalamidad',
    'safety-preparedness-desc': 'Pagsasanay at mga resources para sa disaster readiness',

    // Environment Page - Filipino
    'env-page-title': 'Serbisyong Pangkapaligiran',
    'env-page-desc': 'Pamamahala ng basura at proteksyon sa kapaligiran',
    'env-page-badge': 'Kapaligiran',
    'env-waste': 'Pangongolekta ng Basura',
    'env-waste-desc': 'Mga iskedyul ng pangongolekta ng basura ayon sa barangay',
    'env-recycling': 'Programa sa Recycling',
    'env-recycling-desc': 'Segregasyon at mga inisyatiba sa recycling',

    // Header Dropdown Items
    'dropdown-certificates': 'Mga Sertipiko',
    'dropdown-business': 'Negosyo',
    'dropdown-tax-payments': 'Pagbabayad ng Buwis',
    'dropdown-social-services': 'Serbisyong Panlipunan',
    'dropdown-health': 'Kalusugan',
    'dropdown-agriculture': 'Agrikultura',
    'dropdown-infrastructure': 'Imprastraktura',
    'dropdown-education': 'Edukasyon',
    'dropdown-public-safety': 'Kaligtasang Pampubliko',
    'dropdown-environment': 'Kapaligiran',
    'dropdown-ordinance-framework': 'Balangkas ng Ordinansa',
    'dropdown-resolution-framework': 'Balangkas ng Resolusyon',

    // Homepage - Hero
    'hero-browse-services': 'Tingnan ang mga Serbisyo',
    'hero-contact-us': 'Makipag-ugnayan',
    'hero-search-placeholder': 'hal., birth certificate, business permit',
    'hero-popular': 'Sikat:',
    'hero-birth-certificate': 'Birth Certificate',
    'hero-business-permit': 'Permit sa Negosyo',
    'hero-real-property-tax': 'Buwis sa Ari-arian',

    // Homepage - Popular Services
    'popular-services-subtitle':
      'Mabilis na access sa mga madalas na hinihinging serbisyo ng munisipalidad',
    'popular-browse-directory': 'Tingnan ang kumpletong direktoryo',

    // Homepage - Stats
    'stats-at-a-glance': 'Isang Tingin sa Albay',
    'stats-view-statistics': 'Tingnan ang Estadistika',
    'stats-population-label': 'Populasyon',
    'stats-population-source': 'PSA 2020 Census',
    'stats-barangays-label': 'Mga Barangay',
    'stats-barangays-source': 'Mga Yunit Administratibo',
    'stats-municipality-label': 'Lalawigan',
    'stats-municipality-source': 'Klasipikasyon ng Kita',
    'stats-land-area-label': 'Lawak ng Lupa',
    'stats-land-area-source': 'Kabuuang Lawak ng Munisipalidad',

    // Homepage - Weather & Map
    'weather-map-title': 'Panahon at Mapa ng Albay',
    'weather-mainly-clear': 'Halos maaliwalas',
    'weather-location': 'Lungsod ng Legazpi, Albay',
    'home-brief-history-of-albay': 'Maikling Kasaysayan ng Albay',
    'history-title': 'Maikling Kasaysayan ng Albay',
    'history-1760': 'Information pending verification.',
    'history-1767': 'Information pending verification.',
    'history-1768': 'Information pending verification.',
    'history-1851': 'Information pending verification.',
    'history-1853': 'Information pending verification.',
    'history-1889': 'Information pending verification.',
    'history-1957': 'Information pending verification.',
    'history-once-largest-title': 'Information pending verification.',
    'history-once-largest-desc': 'Information pending verification.',
    'history-urban-planning-title': 'Information pending verification.',
    'history-urban-planning-desc': 'Information pending verification.',
    'news-announcement': 'Anunsyo',
    'news-project': 'Proyekto',
    'news-advisory': 'Abiso',
    'news-business-permit-title': 'Online Na Ang BetterAlbay.org',
    'news-business-permit-desc':
      'Inilunsad na ang unang release ng transparency portal para sa Lalawigan ng Albay, binuo ng komunidad.',
    'news-market-title': 'Welcome Mga Boluntaryo',
    'news-market-desc':
      'Maaaring tumulong ang mga developer, mananaliksik, at manunulat sa pangangalap at pagpapatunay ng pampublikong datos.',
    'news-power-title': 'Binubuo ang mga Opisyal na Pinagkukunan ng Datos',
    'news-power-desc':
      'Kinokolekta ang datos ng mga opisyal, demograpiya, at serbisyo mula sa mga opisyal na portal ng gobyerno.',
    'quiz-title': 'Albay Quiz',
    'quiz-subtitle': 'Gaano mo kakilala ang Albay, Philippines?',
    'quiz-description':
      'Suriin ang iyong kaalaman sa pamana, pagkakakilanlan sa kultura, at kahalagahang heograpiko ng lalawigan sa pamamagitan ng isang interactive na pagtatasa ng kaalaman na idinisenyo upang ipakita ang isa sa mga pinakatanyag na lokalidad ng Bicol Region.',
    'quiz-take': 'Subukin ang Quiz',

    // Footer
    'footer-tagline':
      'Pagbibigay-kapangyarihan sa mga tao ng Albay na may transparent na access sa mga serbisyo, programa, at pampublikong pondo ng LGU Albay.',
    'footer-quick-links': 'Mga Mabilisang Link',
    'footer-resources': 'Mga Mapagkukunan',
    'footer-albay-quiz': 'Albay Quiz',
    'footer-sitemap': 'Mapa ng Site',
    'footer-citizens-charter': "Citizen's Charter",
    'footer-terms': 'Mga Tuntunin ng Paggamit',
    'footer-privacy': 'Patakaran sa Privacy',
    'footer-accessibility': 'Aksesibilidad',
    'footer-faq': 'FAQ',
    'footer-open-data': 'Open Data Philippines',
    'footer-foi': 'Kalayaan sa Impormasyon',
    'footer-lgu-portal': 'Opisyal na Portal ng LGU Albay',
    'footer-sb': 'Sangguniang Bayan',
    'footer-lgu-facebook': 'LGU Albay Facebook',
    'footer-blgf': 'BLGF Portal',
    'footer-cmci': 'CMCI DTI Portal',
    'footer-cost': 'Gastos sa mga Tao ng Albay =',
    'footer-volunteer': 'Mag-volunteer sa amin',
    'footer-contribute': 'Mag-ambag ng code sa amin',
    'footer-copyright-text': 'BetterAlbay.org',
    'footer-copyright-disclaimer':
      'Kumpirmahin ang kasalukuyang impormasyon sa tanggapan ng pamahalaang may pananagutan.',
    'footer-skip-to-main': 'Lumaktaw sa pangunahing nilalaman',
  },
  bik: {
    // Central Bikol — core UI strings.
    // Keys not listed here automatically fall back to English via t().
    // Community contributors are welcome to expand this set.

    // Navigation
    'nav-home': 'Harong',
    'nav-services': 'Mga Serbisyo',
    'nav-government': 'Gobyerno',
    'nav-statistics': 'Estadistika',
    'nav-legislative': 'Lehislatibo',
    'nav-transparency': 'Transparansiya',
    'nav-contact': 'Kontak',

    // Hero Section
    'hero-welcome': 'Dagos sa BetterAlbay.org!',
    'hero-subtitle':
      'Akseson an mga serbisyo kan gobyerno, impormasyon, asin mga rekursos para sa mga taga-Albay, Pilipinas.',
    'hero-find-service': 'Hanapon an Serbisyo',

    // Appointment CTA
    'appointment-cta-heading':
      'Pinapakarhay an mga Serbisyo nin Appointment kan Opisina nin Gobernador kan Albay',
    'appointment-cta-subtitle': 'Mayo singil. Mayo balikan. Marhay na appointment sana.',
    'appointment-schedule-btn': 'Mag-iskedyul nin Appointment',
    'appointment-create-btn': 'Gumibo nin Account',

    // Popular Services
    'section-popular': 'Mga Popular na Serbisyo',
    'service-certificates': 'Mga Sertipiko',
    'service-certificates-desc': 'Sertipiko kan pagkamundag, kasal, asin kagadanan',
    'service-business': 'Permit sa Negosyo',
    'service-business-desc': 'Bagong permit asin pag-renew',
    'service-tax': 'Pagbayad nin Buwis',
    'service-tax-desc': 'Buwis sa pagsadiri asin negosyo',
    'service-social': 'Serbisyong Sosyal',
    'service-social-desc': 'Serbisyo para sa senior citizen asin PWD',
    'service-health': 'Serbisyo sa Salog',
    'service-health-desc': 'Tabang medikal asin mga programa',
    'btn-view-all-services': 'Hilingon an gabos na Serbisyo',

    // Latest Updates / Stats / History / Weather
    'section-updates': 'Mga Pinakabagong Update',
    'btn-view-all': 'Hilingon Gabos',
    'stats-at-a-glance': 'An Albay Sa Sarong Dolok',
    'stats-view-statistics': 'Hilingon an Estadistika',
    'stats-population-label': 'Populasyon',
    'stats-barangays-label': 'Barangay',
    'stats-municipality-label': 'Probinsya',
    'stats-land-area-label': 'Hiwas nin Daga',
    'weather-map-title': 'Panahon asin Mapa kan Albay',
    'weather-location': 'Syudad nin Legazpi, Albay',
    'history-title': 'Information pending verification.',

    // Provincial Leadership
    'section-leadership': 'Mga Lider kan Probinsya',
    'title-mayor': 'Gobernador',
    'title-vice-mayor': 'Bise Gobernador',
    'btn-view-officials': 'Hilingon an Gabos na Opisyal',

    // Contact Section
    'section-contact': 'Impormasyon sa Pakikipag-ugnayan',
    'contact-phone': 'Telepono',
    'contact-email': 'Email',
    'contact-address': 'Direksyon',
    'contact-hours': 'Mon-Fri: 8:00 AM - 5:00 PM',
    'contact-response': 'Masimbag kami sa laog nin 24 oras',
    'contact-municipal-hall': 'Kapitolyo kan Probinsya',

    // Quiz
    'quiz-title': 'Albay Quiz',
    'quiz-subtitle': 'Gurano mo kamidbid an Albay, Philippines?',
    'quiz-description':
      'Suriaron an saimong kaaraman dapit sa pamana, kultural na pagkamidbid, asin importansyang heograpiko kan probinsya paagi sa sarong interactive na pagtimbang nin kaaraman na dinisenyo tanganing ipahiling an saro sa mga pinakabantog na lokalidad kan Rehiyon Bikol.',
    'quiz-take': 'Ponan an Quiz',

    // Footer
    'footer-tagline':
      'Nagtatao nin kapangyarihan sa mga taga-Albay na may transparan na akses sa mga serbisyo, programa, asin pampublikong pondo kan LGU Albay.',
    'footer-quick-links': 'Mga Madaling Link',
    'footer-resources': 'Mga Rekurso',
    'footer-albay-quiz': 'Albay Quiz',
    'footer-sitemap': 'Mapa kan Site',
    'footer-citizens-charter': "Citizen's Charter",
    'footer-terms': 'Mga Termino nin Paggamit',
    'footer-privacy': 'Patakaran sa Privacy',
    'footer-accessibility': 'Aksesibilidad',
    'footer-cost': 'Gastos sa mga Tawo kan Albay =',
    'footer-volunteer': 'Magboluntaryo kaming',
    'footer-contribute': 'Magtabang nin kodigo',
    'footer-copyright-text': 'BetterAlbay.org',
  },
};

translations.bcl = translations.bik;

type Language = 'en' | 'fil' | 'bcl' | 'bik';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    try {
      let stored = localStorage.getItem('selectedLang') || localStorage.getItem('betteralbay_lang');
      if (!stored && typeof document !== 'undefined' && document.cookie) {
        const match = document.cookie.match(/(?:^|;\s*)(?:selectedLang|betteralbay_lang)=([^;]+)/);
        if (match && match[1]) stored = decodeURIComponent(match[1]);
      }
      const savedLang = (stored === 'bik' ? 'bcl' : stored) as Language;
      if (savedLang && ['en', 'fil', 'bcl', 'bik'].includes(savedLang)) {
        setLanguageState(savedLang === 'bik' ? 'bcl' : savedLang);
      }
    } catch {
      // Browser privacy settings may disable storage; keep the default language.
    }
  }, []);

  const setLanguage = (lang: Language) => {
    const normalized = lang === 'bik' ? 'bcl' : lang;
    setLanguageState(normalized);
    try {
      localStorage.setItem('betteralbay_lang', normalized);
      localStorage.setItem('selectedLang', normalized);
    } catch {
      // Language selection still works for this session when storage is blocked.
    }
    try {
      if (typeof document !== 'undefined') {
        document.cookie = `selectedLang=${encodeURIComponent(normalized)};path=/;max-age=31536000;SameSite=Lax`;
        document.cookie = `betteralbay_lang=${encodeURIComponent(normalized)};path=/;max-age=31536000;SameSite=Lax`;
      }
    } catch {
      // Ignore cookie errors
    }
  };

  // Falls back to English for any key not yet translated into the active language
  const t = (key: string): string => {
    const targetLang = language === 'bik' ? 'bcl' : language;
    return (
      translations[targetLang]?.[key] ||
      translations['bik']?.[key] ||
      translations['en']?.[key] ||
      key
    );
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
