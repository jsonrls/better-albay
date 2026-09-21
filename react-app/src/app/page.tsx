'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import historyData from '../../../data/history.json';

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <>
      {/* Hero Section */}
      <section className="home-hero-v2">
        <div className="home-hero-media" aria-hidden="true">
          <video
            className="home-hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/assets/images/banners/mt-mayon-hero.webp"
            onCanPlay={(e) => e.currentTarget.classList.add('is-playing')}
            onPlay={(e) => e.currentTarget.classList.add('is-playing')}
          >
            <source src="/assets/images/banners/mt-mayon-hero.mp4" type="video/mp4" />
          </video>
          <div className="home-hero-clouds-drift" />
          <div className="home-hero-overlay" />
        </div>
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
      <section
        className="appointment-cta-section"
        aria-label="Governor's Office Appointment Services"
      >
        <div className="container">
          <div className="appointment-cta-inner">
            <div className="appointment-cta-animation" aria-hidden="true">
              <img
                src="/assets/images/illustrations/appointment-illustration.png"
                alt=""
                width={420}
                height={420}
                loading="lazy"
              />
            </div>
            <div className="appointment-cta-content">
              <h2 className="appointment-cta-heading">{t('appointment-cta-heading')}</h2>
              <p className="appointment-cta-subtitle">{t('appointment-cta-subtitle')}</p>
              <div className="appointment-cta-actions">
                <a
                  href="https://albay.gov.ph/"
                  className="appointment-cta-btn appointment-cta-btn--primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="bi bi-calendar-check" aria-hidden="true"></i>
                  <span>{t('appointment-schedule-btn')}</span>
                </a>
                <a
                  href="https://albay.gov.ph/"
                  className="appointment-cta-btn appointment-cta-btn--outline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="bi bi-person-plus" aria-hidden="true"></i>
                  <span>{t('appointment-create-btn')}</span>
                </a>
              </div>
            </div>
          </div>
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

      {/* Quick Stats: Albay at a Glance */}
      <section className="home-stats-v2">
        <div className="container">
          <div className="home-stats-v2-header">
            <h2>Albay at a Glance</h2>
            <Link href="/statistics" className="home-section-link">
              <i className="bi bi-arrow-right" aria-hidden="true"></i>
              <span>View Statistics</span>
            </Link>
          </div>
          <div className="home-stats-v2-grid">
            <Link href="/statistics" className="home-stat-card">
              <div className="home-stat-card-icon" aria-hidden="true">
                <i className="bi bi-people-fill"></i>
              </div>
              <div className="home-stat-card-content">
                <span className="home-stat-card-value">1,374,768</span>
                <span className="home-stat-card-label">Population</span>
                <span className="home-stat-card-source">2020 Census</span>
              </div>
            </Link>
            <Link href="/government" className="home-stat-card">
              <div className="home-stat-card-icon" aria-hidden="true">
                <i className="bi bi-geo-alt-fill"></i>
              </div>
              <div className="home-stat-card-content">
                <span className="home-stat-card-value">720</span>
                <span className="home-stat-card-label">Barangays</span>
                <span className="home-stat-card-source">Administrative Units</span>
              </div>
            </Link>
            <Link href="/statistics" className="home-stat-card">
              <div className="home-stat-card-icon" aria-hidden="true">
                <i className="bi bi-award-fill"></i>
              </div>
              <div className="home-stat-card-content">
                <span className="home-stat-card-value">1st Class</span>
                <span className="home-stat-card-label">Province</span>
                <span className="home-stat-card-source">Income Classification</span>
              </div>
            </Link>
            <Link href="/statistics" className="home-stat-card">
              <div className="home-stat-card-icon" aria-hidden="true">
                <i className="bi bi-rulers"></i>
              </div>
              <div className="home-stat-card-content">
                <span className="home-stat-card-value">2,514.74 km²</span>
                <span className="home-stat-card-label">Land Area</span>
                <span className="home-stat-card-source">Total Provincial Area</span>
              </div>
            </Link>
          </div>
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
                  <div className="weather-stats" role="list" aria-label="Weather details">
                    <div className="weather-stat" role="listitem" aria-label="Humidity 65 percent">
                      <i className="bi bi-droplet"></i>
                      <span>65%</span>
                    </div>
                    <div className="weather-stat" role="listitem" aria-label="Wind speed 12 km/h">
                      <i className="bi bi-wind"></i>
                      <span>12 km/h</span>
                    </div>
                  </div>
                  <div className="weather-forecast-section">
                    <div className="weather-forecast-header">
                      <span className="weather-forecast-title">5-Day Forecast</span>
                    </div>
                    <div
                      className="weather-forecast-strip weather-hourly"
                      role="list"
                      aria-label="Next 5-day weather forecast"
                    >
                      <div className="weather-forecast-day weather-hour" role="listitem">
                        <span className="weather-forecast-date weather-hour-time">Sun</span>
                        <i className="bi bi-cloud-sun-fill" aria-hidden="true"></i>
                        <span className="weather-forecast-temp weather-hour-temp">31°</span>
                        <span className="weather-forecast-min">25°</span>
                      </div>
                      <div className="weather-forecast-day weather-hour" role="listitem">
                        <span className="weather-forecast-date weather-hour-time">Mon</span>
                        <i className="bi bi-cloud-sun-fill" aria-hidden="true"></i>
                        <span className="weather-forecast-temp weather-hour-temp">32°</span>
                        <span className="weather-forecast-min">24°</span>
                      </div>
                      <div className="weather-forecast-day weather-hour" role="listitem">
                        <span className="weather-forecast-date weather-hour-time">Tue</span>
                        <i className="bi bi-cloud-rain-fill" aria-hidden="true"></i>
                        <span className="weather-forecast-temp weather-hour-temp">30°</span>
                        <span className="weather-forecast-min">25°</span>
                      </div>
                      <div className="weather-forecast-day weather-hour" role="listitem">
                        <span className="weather-forecast-date weather-hour-time">Wed</span>
                        <i className="bi bi-sun-fill" aria-hidden="true"></i>
                        <span className="weather-forecast-temp weather-hour-temp">31°</span>
                        <span className="weather-forecast-min">24°</span>
                      </div>
                      <div className="weather-forecast-day weather-hour" role="listitem">
                        <span className="weather-forecast-date weather-hour-time">Thu</span>
                        <i className="bi bi-cloud-sun-fill" aria-hidden="true"></i>
                        <span className="weather-forecast-temp weather-hour-temp">30°</span>
                        <span className="weather-forecast-min">25°</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="map-column">
              <div className="map-card">
                <div className="map-card-toolbar">
                  <div className="map-toolbar-title">
                    <i className="bi bi-map-fill" aria-hidden="true"></i>
                    <span>Civic Map of Albay</span>
                  </div>
                </div>
                <div
                  id="map-container"
                  role="region"
                  aria-label="Civic map of Albay, Philippines"
                  data-map-loaded="iframe"
                >
                  <iframe
                    id="osm-embed"
                    className="map-iframe"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=123.35%2C12.92%2C124.25%2C13.55&amp;layer=mapnik&amp;marker=13.1391%2C123.7434"
                    title="Civic Map of Albay Province, Philippines"
                    loading="lazy"
                    aria-label="OpenStreetMap showing the Province of Albay, Bicol Region"
                  ></iframe>
                </div>
                <div className="map-attribution">
                  <div className="map-attr-info">
                    <i className="bi bi-geo-alt-fill" aria-hidden="true"></i>
                    <span>Province of Albay &bull; 18 LGUs (3 Cities, 15 Municipalities)</span>
                  </div>
                  <div className="map-attr-actions">
                    <a href="/government" className="map-link-btn" title="View LGU directory">
                      <span>Directory</span>{' '}
                      <i className="bi bi-arrow-right" aria-hidden="true"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brief History of Albay */}
      <section className="section history-section">
        <div className="container">
          <div className="home-stats-v2-header">
            <h2>
              <i className="bi bi-book" aria-hidden="true"></i>
              <span>{t('home-brief-history-of-albay') || 'Brief History of Albay'}</span>
            </h2>
          </div>
          <div className="history-content">
            <div className="history-timeline">
              {historyData.map((item, idx) => (
                <div key={idx} className="timeline-item" data-year={item.date}>
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <span className="timeline-year">{item.date}</span>
                    <h4 className="timeline-title">{item.title}</h4>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="history-summary">
              <div className="history-card">
                <div className="history-card-icon">
                  <i className="bi bi-geo-alt-fill"></i>
                </div>
                <div className="history-card-content">
                  <h4>The Cagsawa Legacy</h4>
                  <p>
                    The catastrophic February 1, 1814 eruption of Mayon completely buried Cagsawa,
                    leading survivors to relocate and establish the modern town of Daraga.
                  </p>
                </div>
              </div>
              <div className="history-card">
                <div className="history-card-icon">
                  <i className="bi bi-award-fill"></i>
                </div>
                <div className="history-card-content">
                  <h4>Last General to Surrender</h4>
                  <p>
                    Albay was the stronghold of General Simeon Ola of Guinobatan, who led fierce
                    resistance and became the last Filipino revolutionary general to surrender.
                  </p>
                </div>
              </div>
              <div className="history-card">
                <div className="history-card-icon">
                  <i className="bi bi-compass"></i>
                </div>
                <div className="history-card-content">
                  <h4>Ancient Roots</h4>
                  <p>
                    Archaeological excavations at Camalig's Hoyop-hoyopan Cave revealed continuous
                    human habitation dating back to the Early Iron Age (200 BC to 900 AD).
                  </p>
                </div>
              </div>
            </div>
          </div>
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

      {/* Provincial Leadership */}
      <section className="section home-leadership-section">
        <div className="container">
          <div className="home-section-header">
            <h2>{t('section-leadership')}</h2>
            <Link href="/government" className="home-section-link">
              <i className="bi bi-arrow-right" aria-hidden="true"></i>{' '}
              <span>{t('btn-view-officials')}</span>
            </Link>
          </div>
          <div className="home-leadership-grid">
            <div className="home-leader-card">
              <span className="home-leader-badge">{t('title-mayor')}</span>
              <h3>Hon. Noel E. Rosal</h3>
              <div className="home-leader-contacts">
                <a href="mailto:pgasecretariat@gmail.com">
                  <i className="bi bi-envelope" aria-hidden="true"></i>{' '}
                  <span>pgasecretariat@gmail.com</span>
                </a>
                <a href="tel:0527426377">
                  <i className="bi bi-telephone" aria-hidden="true"></i> <span>(052) 742-6377</span>
                </a>
              </div>
            </div>
            <div className="home-leader-card">
              <span className="home-leader-badge">{t('title-vice-mayor')}</span>
              <h3>Hon. Farida “Diday” S. Co</h3>
              <div className="home-leader-contacts">
                <a href="mailto:vicepgasecretariat@gmail.com">
                  <i className="bi bi-envelope" aria-hidden="true"></i>{' '}
                  <span>vicepgasecretariat@gmail.com</span>
                </a>
                <a href="tel:09268284392">
                  <i className="bi bi-telephone" aria-hidden="true"></i>{' '}
                  <span>(0926) 828-4392</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="section">
        <div className="container">
          <div className="home-section-header">
            <h2>{t('section-contact')}</h2>
            <Link href="/contact" className="home-section-link">
              <i className="bi bi-arrow-right" aria-hidden="true"></i>{' '}
              <span>{t('btn-view-all')}</span>
            </Link>
          </div>
          <div className="home-contact-v2-grid">
            <a href="tel:0527426377" className="home-contact-v2-card">
              <div className="home-contact-v2-icon" aria-hidden="true">
                <i className="bi bi-telephone-fill"></i>
              </div>
              <div className="home-contact-v2-content">
                <h3>{t('contact-phone')}</h3>
                <p className="home-contact-v2-value">(052) 742-6377</p>
                <span className="home-contact-v2-note">{t('contact-hours')}</span>
              </div>
            </a>
            <a href="mailto:pgasecretariat@gmail.com" className="home-contact-v2-card">
              <div className="home-contact-v2-icon" aria-hidden="true">
                <i className="bi bi-envelope-fill"></i>
              </div>
              <div className="home-contact-v2-content">
                <h3>{t('contact-email')}</h3>
                <p className="home-contact-v2-value">pgasecretariat@gmail.com</p>
                <span className="home-contact-v2-note">{t('contact-response')}</span>
              </div>
            </a>
            <div className="home-contact-v2-card">
              <div className="home-contact-v2-icon" aria-hidden="true">
                <i className="bi bi-geo-alt-fill"></i>
              </div>
              <div className="home-contact-v2-content">
                <h3>{t('contact-address')}</h3>
                <p className="home-contact-v2-value">{t('contact-municipal-hall')}</p>
                <span className="home-contact-v2-note">Legazpi City, Albay</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Albay Quiz CTA */}
      <section className="quiz-cta-section" aria-label="Albay Quiz">
        <div className="container">
          <div className="quiz-cta-inner">
            <div className="quiz-cta-animation" aria-hidden="true">
              <dotlottie-player
                src="/assets/animation/ramonloganjr-exam.json"
                background="transparent"
                speed="1"
                loop
                autoplay
              ></dotlottie-player>
            </div>
            <div className="quiz-cta-content">
              <h2 className="quiz-cta-heading">{t('quiz-title')}</h2>
              <p className="quiz-cta-subtitle">{t('quiz-subtitle')}</p>
              <p className="quiz-cta-description">{t('quiz-description')}</p>
              <a href="#albay-quiz" className="quiz-cta-btn" id="albay-quiz-start">
                <i className="bi bi-play-circle-fill" aria-hidden="true"></i>{' '}
                <span>{t('quiz-take')}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
