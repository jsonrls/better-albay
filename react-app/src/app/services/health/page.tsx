'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HealthPage() {
  const { t } = useLanguage();

  return (
    <>
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">{t('nav-home')}</Link>
          <span>/</span>
          <Link href="/services">{t('nav-services')}</Link>
          <span>/</span>
          <span aria-current="page">{t('health-page-title')}</span>
        </nav>
      </div>
      <section className="page-header">
        <div className="container">
          <div className="page-header-content">
            <span className="page-header-badge">
              <i className="bi bi-heart-pulse-fill" aria-hidden="true" />
              <span>{t('health-page-badge')}</span>
            </span>
            <h1>{t('health-page-title')}</h1>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <p>
            Albay-specific requirements, fees, and processing times have not been verified. Confirm
            these with the responsible government office before applying.
          </p>
          <p>A verified local health facility directory is not yet available on this site.</p>
          <p>
            <a href="https://albay.gov.ph/">Official Albay government website</a>
          </p>
          <h2>Related services</h2>
          <ul>
            <li>
              <Link href="/services">Browse all services</Link>
            </li>
            <li>
              <Link href="/services/social-services">Social services</Link>
            </li>
            <li>
              <Link href="/services/public-safety">Public safety and emergency contacts</Link>
            </li>
          </ul>
          <p>
            National emergency: <a href="tel:911">911</a>
          </p>
          <p>
            <a href="https://ehotlines.e.gov.ph/">Official emergency directory</a>
          </p>
        </div>
      </section>
    </>
  );
}
