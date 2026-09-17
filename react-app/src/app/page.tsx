'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import SearchAutocomplete from '@/components/SearchAutocomplete';

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <>
      {/* Hero Section */}
      <section className="home-hero-v2">
        <div className="container">
          <div className="home-hero-v2-inner">
            <div className="home-hero-v2-text">
              <h1>{t('hero-welcome')}</h1>
              <p>{t('hero-subtitle')}</p>
              <div className="home-hero-v2-actions">
                <Link href="/services" className="btn btn-primary">
                  {t('hero-browse-services')} <i className="bi bi-arrow-right"></i>
                </Link>
                <Link href="/contact" className="btn btn-outline">
                  {t('hero-contact-us')}
                </Link>
              </div>
            </div>
            <div className="home-hero-v2-search">
              <div className="home-search-box">
                <h2>
                  <i className="bi bi-search"></i> {t('hero-find-service')}
                </h2>
                <form className="search-form" role="search" onSubmit={(e) => e.preventDefault()}>
                  <div className="search-input-wrapper">
                    <SearchAutocomplete placeholder={t('hero-search-placeholder')} />
                    <button type="submit" className="search-submit-btn" aria-label="Search">
                      <i className="bi bi-arrow-right"></i>
                    </button>
                  </div>
                </form>
                <div className="home-search-tags">
                  <span>{t('hero-popular')}</span>
                  <Link href="/service-details/birth-certificate">
                    {t('hero-birth-certificate')}
                  </Link>
                  <Link href="/service-details/business-permits-licensing">
                    {t('hero-business-permit')}
                  </Link>
                  <Link href="/service-details/municipal-treasurer">
                    {t('hero-real-property-tax')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Appointment Services CTA */}
      <section className="appointment-cta-section">
        <div className="container">
          <h2>Appointments</h2>
          <p>
            Online appointment booking is not available through this site. Consult the official
            government website for current options.
          </p>
          <p>
            <a href="https://albay.gov.ph/">Visit the official Albay government website</a>
          </p>
        </div>
      </section>

      {/* Popular Services */}
      <section className="section">
        <div className="container">
          <div className="home-section-header">
            <h2>{t('section-popular')}</h2>
            <p>{t('popular-services-subtitle')}</p>
          </div>
          <div className="home-services-grid">
            <Link href="/services/certificates" className="home-service-card">
              <div className="home-service-icon">
                <i className="bi bi-file-earmark-text-fill"></i>
              </div>
              <div className="home-service-content">
                <h3>{t('service-certificates')}</h3>
                <p>{t('service-certificates-desc')}</p>
              </div>
              <i className="bi bi-arrow-right home-service-arrow"></i>
            </Link>
            <Link href="/services/business" className="home-service-card">
              <div className="home-service-icon">
                <i className="bi bi-shop"></i>
              </div>
              <div className="home-service-content">
                <h3>{t('service-business')}</h3>
                <p>{t('service-business-desc')}</p>
              </div>
              <i className="bi bi-arrow-right home-service-arrow"></i>
            </Link>
            <Link href="/services/tax-payments" className="home-service-card">
              <div className="home-service-icon">
                <i className="bi bi-cash-coin"></i>
              </div>
              <div className="home-service-content">
                <h3>{t('service-tax')}</h3>
                <p>{t('service-tax-desc')}</p>
              </div>
              <i className="bi bi-arrow-right home-service-arrow"></i>
            </Link>
            <Link href="/services/social-services" className="home-service-card">
              <div className="home-service-icon">
                <i className="bi bi-people-fill"></i>
              </div>
              <div className="home-service-content">
                <h3>{t('service-social')}</h3>
                <p>{t('service-social-desc')}</p>
              </div>
              <i className="bi bi-arrow-right home-service-arrow"></i>
            </Link>
            <Link href="/services/health" className="home-service-card">
              <div className="home-service-icon">
                <i className="bi bi-heart-pulse-fill"></i>
              </div>
              <div className="home-service-content">
                <h3>{t('service-health')}</h3>
                <p>{t('service-health-desc')}</p>
              </div>
              <i className="bi bi-arrow-right home-service-arrow"></i>
            </Link>
            <Link href="/services" className="home-service-card home-service-card--all">
              <div className="home-service-icon">
                <i className="bi bi-grid-fill"></i>
              </div>
              <div className="home-service-content">
                <h3>{t('btn-view-all-services')}</h3>
                <p>{t('popular-browse-directory')}</p>
              </div>
              <i className="bi bi-arrow-right home-service-arrow"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="home-stats-v2">
        <div className="container">
          <h2>Albay population</h2>
          <p className="home-stat-card-value">1,374,768</p>
          <p>2020 Census of Population and Housing — province of Albay.</p>
          <a href="https://psa.gov.ph/content/highlights-region-v-bicol-region-population-2020-census-population-and-housing-2020-cph">
            Source: Philippine Statistics Authority, 2020 Census
          </a>
        </div>
      </section>

      {/* Weather & Map */}
      <section className="section weather-map-section">
        <div className="container">
          <div className="home-stats-v2-header">
            <h2>{t('weather-map-title')}</h2>
          </div>
          <div className="weather-map-grid">
            <div className="weather-column">
              <div id="weather-container" aria-live="polite">
                <div className="weather-widget" role="region" aria-label="Current weather in Albay">
                  <div className="weather-current">
                    <div className="weather-current-icon">
                      <i className="bi bi-cloud-sun-fill"></i>
                    </div>
                    <div className="weather-current-info">
                      <div className="weather-current-temp">29°C</div>
                      <div className="weather-current-condition">{t('weather-mainly-clear')}</div>
                      <div className="weather-current-location">
                        <i className="bi bi-geo-alt"></i> {t('weather-location')}
                      </div>
                    </div>
                  </div>
                  <div className="weather-stats">
                    <div className="weather-stat">
                      <i className="bi bi-droplet"></i>
                      <span>65%</span>
                    </div>
                    <div className="weather-stat">
                      <i className="bi bi-wind"></i>
                      <span>12 km/h</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="map-column">
              <div className="map-card">
                <h2>Albay location</h2>
                <p>The embedded map is unavailable while its location details are verified.</p>
                <a href="https://albay.gov.ph/">Official Albay website</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brief History of Albay */}
      <section className="section history-section">
        <div className="container">
          <h2>History of Albay</h2>
          <p>A source-checked history of Albay is not yet available on this site.</p>
          <p>
            <a href="https://albay.gov.ph/">Visit the official Albay government website</a>
          </p>
        </div>
      </section>

      {/* Latest Updates */}
      <section className="section">
        <div className="container">
          <div className="home-section-header">
            <h2>{t('section-updates')}</h2>
            <Link href="/news" className="home-section-link">
              <span>{t('btn-view-all')}</span> <i className="bi bi-arrow-right"></i>
            </Link>
          </div>
          <div className="home-news-grid">
            <p>
              Verified Albay news is not yet available.{' '}
              <a href="https://albay.gov.ph/">Official Albay government website</a>
            </p>
          </div>
        </div>
      </section>

      {/* Municipal Leadership */}
      <section className="section home-leadership-section">
        <div className="container">
          <h2>Albay officials</h2>
          <p>An up-to-date Albay officials directory is not available on this site yet.</p>
          <p>
            <a href="https://albay.gov.ph/">Visit the official Albay government website</a>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Contact information</h2>
          <p>Current office contacts and hours are not verified on this site.</p>
          <a href="https://albay.gov.ph/">Visit the official Albay government website</a>
        </div>
      </section>

      {/* Albay Quiz CTA */}
      <section className="quiz-cta-section">
        <div className="container">
          <h2>Albay Quiz</h2>
          <p>The quiz is unavailable while its questions are verified.</p>
          <p>
            <a href="https://albay.gov.ph/">Visit the official Albay government website</a>
          </p>
        </div>
      </section>
    </>
  );
}
