'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import copy from '../../../../../data/service-guide-copy.json';
import serviceData from '../../../../../data/services.json';
import '../../../../../assets/css/services.css';

const icons: Record<string, string> = {
  vaccination: 'bi-shield-plus',
  'health-certificate': 'bi-clipboard2-pulse',
  'medical-assistance': 'bi-hospital',
  'prenatal-checkup': 'bi-heart-pulse',
};

export default function HealthPage() {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState('');
  const lang = language === 'bik' ? 'bcl' : language;
  const strings: Record<string, string> = copy[lang];
  const label = (key: string) => strings[key] || t(key);
  const services = serviceData.services.filter((service) => service.categoryId === 'health');
  const visible = services.filter((service) =>
    [
      label(`sg-title-${service.id}`),
      label(`sg-desc-${service.id}`),
      service.title,
      ...service.keywords,
    ]
      .join(' ')
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase())
  );

  return (
    <div className="services-page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <a href="/">{t('nav-home')}</a>
          <span>/</span>
          <a href="/services/">{t('nav-services')}</a>
          <span>/</span>
          <span aria-current="page">{label('health-page-title')}</span>
        </nav>
      </div>
      <section className="page-header">
        <div className="container">
          <div className="page-header-content">
            <span className="page-header-badge">
              <i className="bi bi-heart-pulse-fill" aria-hidden="true" />
              {label('health-page-badge')}
            </span>
            <h1>{label('health-page-title')}</h1>
            <p className="page-header-desc">{label('health-page-desc')}</p>
            <div className="page-header-search">
              <form
                className="search-form"
                role="search"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="search-input-wrapper">
                  <i className="bi bi-search search-icon" aria-hidden="true" />
                  <input
                    type="search"
                    id="service-search"
                    className="service-search-input"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={label('sg-health-search')}
                    aria-label={label('sg-health-search')}
                    autoComplete="off"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <p className="service-notice">
            <i className="bi bi-info-circle" aria-hidden="true" />
            <span>{label('svc-verification-notice')}</span>
          </p>
          <div className="grid grid-3" aria-live="polite">
            {visible.map((service) => (
              <div className="service-item-card" key={service.id}>
                <h2 className="service-item-title">
                  <i className={`bi ${icons[service.id]}`} aria-hidden="true" />
                  <span>{label(`sg-title-${service.id}`)}</span>
                </h2>
                <p className="service-item-desc">{label(`sg-desc-${service.id}`)}</p>
                <span className="service-card-action">{label('sg-confirm')}</span>
              </div>
            ))}
            {visible.length === 0 && (
              <div className="service-grid-status">
                <p>{label('sg-no-results')}</p>
                <button type="button" className="btn btn-secondary" onClick={() => setQuery('')}>
                  {label('sg-clear-search')}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="section bg-alt">
        <div className="container guide-columns">
          <section className="guide-panel">
            <h2>{label('sg-resources')}</h2>
            <p>{label('sg-directory')}</p>
            <a className="guide-resource" href="https://albay.gov.ph/">
              {label('sg-official')} ↗
            </a>
            <a className="guide-resource" href="tel:911">
              {label('sg-emergency')}: 911
            </a>
            <a className="guide-resource" href="/contact/#hotlines-hospitals" lang="en">
              Hospital hotlines
            </a>
            <a className="guide-resource" href="/contact/#hotlines-rural-health-unit" lang="en">
              Rural health unit hotlines
            </a>
            <a className="guide-resource" href="/contact/#emergency-hotlines" lang="en">
              All Albay hotlines
            </a>
          </section>
          <section className="guide-panel">
            <h2>{label('sg-related')}</h2>
            <a className="guide-resource" href="/services/">
              {label('sg-all')}
            </a>
            <a className="guide-resource" href="/services/social-services">
              {t('dropdown-social-services')}
            </a>
            <a className="guide-resource" href="/services/public-safety">
              {t('dropdown-public-safety')}
            </a>
          </section>
        </div>
      </section>
    </div>
  );
}
