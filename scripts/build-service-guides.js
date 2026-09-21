/** Regenerate guide bodies while preserving each page's existing site shell. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { PAGES, addStyles } = require('./build-services-pages');
const { escapeHtml, iconFor } = require('../assets/js/services-category');
const root = path.resolve(__dirname, '..');
const records = require('../data/services.json').services;
const copy = require('../data/service-guide-copy.json');
const text = (key) => `<span data-i18n="${key}">${escapeHtml(copy.en[key])}</span>`;
function guide(record) {
  const category = PAGES.find((p) => p.category === record.categoryId) || {
    prefix: 'nav',
    badge: 'Services',
    title: 'Services',
  };
  const categoryLink =
    record.categoryId === 'government' ? '../services/' : `../services/${record.categoryId}`;
  const summary = [
    ['office', 'bi-building'],
    ['requirements', 'bi-list-check'],
    ['fees', 'bi-cash-coin'],
    ['processing', 'bi-clock'],
  ];
  const related = records
    .filter(
      (r) =>
        r.categoryId === record.categoryId &&
        r.id !== record.id &&
        r.url.startsWith('../service-details/')
    )
    .slice(0, 3);
  return `<main id="main-content" class="services-page">
  <div class="container"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../" data-i18n="nav-home">Home</a><span>/</span><a href="../services/" data-i18n="nav-services">Services</a><span>/</span><a href="${categoryLink}" data-i18n="${category.prefix === 'nav' ? 'nav-services' : category.prefix + '-page-badge'}">${escapeHtml(category.badge)}</a><span>/</span><span aria-current="page">${text('sg-title-' + record.id)}</span></nav></div>
  <section class="page-header"><div class="container"><div class="page-header-content"><span class="page-header-badge"><i class="bi ${iconFor(record.id)}" aria-hidden="true"></i>${text('sg-guide')}</span><h1>${text('sg-title-' + record.id)}</h1><p class="page-header-desc">${text('sg-desc-' + record.id)}</p></div></div></section>
  <section class="section"><div class="container"><p class="service-notice"><i class="bi bi-info-circle" aria-hidden="true"></i><span data-i18n="svc-verification-notice">Requirements, fees and processing times for Albay services have not been verified. Confirm them with the responsible office before applying.</span></p><dl class="guide-summary">${summary.map(([key, icon]) => `<div><i class="bi ${icon}" aria-hidden="true"></i><dt>${text('sg-' + key)}</dt><dd>${text(key === 'office' ? 'sg-confirm' : 'sg-unknown')}</dd></div>`).join('')}</dl></div></section>
  <section class="section guide-preparation"><div class="container"><h2>${text('sg-before')}</h2><p class="section-intro">${text('sg-general')}</p><ol class="guide-steps">${[1, 2, 3].map((n) => `<li><span class="step-number" aria-hidden="true">${n}</span><h3>${text('sg-step' + n)}</h3><p>${text('sg-step' + n + '-desc')}</p></li>`).join('')}</ol></div></section>
  <section class="section"><div class="container guide-columns"><div><section class="guide-panel"><h2>${text('sg-checklist')}</h2><ul class="guide-checklist">${[1, 2, 3].map((n) => `<li>${text('sg-check' + n)}</li>`).join('')}</ul></section><section><h2>${text('sg-faq')}</h2>${[1, 2].map((n) => `<details class="guide-faq"><summary>${text('sg-q' + n)}</summary><p>${text('sg-a' + n)}</p></details>`).join('')}</section></div>
  <aside><section class="guide-panel"><h2>${text('sg-resources')}</h2><p>${text('sg-step1-desc')}</p><a class="guide-resource" href="https://albay.gov.ph/">${text('sg-official')} ↗</a></section><section class="guide-panel"><h2>${text('sg-related')}</h2>${related.map((r) => `<a class="guide-resource" href="${r.url.replace('.html', '')}">${text('sg-title-' + r.id)}</a>`).join('')}<a class="guide-resource" href="${categoryLink}" data-i18n="${category.prefix === 'nav' ? 'nav-services' : category.prefix + '-page-title'}">${escapeHtml(category.title)}</a><a class="guide-resource" href="../services/">${text('sg-all')}</a></section><section class="guide-panel"><h2>${text('sg-help')}</h2><a class="guide-resource" href="../contact/">${text('sg-contact')}</a></section></aside></div></section>
</main>`;
}
for (const file of fs
  .readdirSync(path.join(root, 'service-details'))
  .filter((f) => f.endsWith('.html'))) {
  const aliases = {
    'mswdo.html': 'mswdo-services',
    'municipal-civil-registrar.html': 'civil-registrar',
    'municipal-general-services.html': 'general-services',
  };
  const record = records.find(
    (r) => r.url === '../service-details/' + file || r.id === aliases[file]
  );
  if (!record) throw new Error('No service data for ' + file);
  const target = path.join(root, 'service-details', file);
  const before = fs.readFileSync(target, 'utf8');
  let after = before
    .replace(/\s*<style>[\s\S]*?<\/style>/g, '')
    .replace(/<main id="main-content"[^>]*>[\s\S]*?<\/main>/, guide(record));
  after = after.replace(/\s*<script>([\s\S]*?)<\/script>/g, (full, body) =>
    /querySelectorAll\('\.(?:scenario-tab|service-tab|program-tab|process-tab-btn|assessor-nav-btn)/.test(
      body
    )
      ? ''
      : full
  );
  after = addStyles(after);
  if (after !== before) fs.writeFileSync(target, after);
}
