const { test, expect } = require('@playwright/test');

test.describe('Full Website BCL Language Conversion', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('bs-vol-popup-v1', '1');
    });
    await page.route('**/*', (route) => {
      const hostname = new URL(route.request().url()).hostname;
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
        ? route.continue()
        : route.abort();
    });
  });

  test('Homepage converts completely to Central Bikol (BCL)', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

    // Initial state check - English
    const bclBtn = page.locator('.lang-selector button[data-lang="bcl"]').first();
    await expect(bclBtn).toBeVisible();

    // Switch language to BCL
    await bclBtn.click();
    await expect(bclBtn).toHaveClass(/active/);

    // 1. Navigation items
    await expect(page.locator('a[data-i18n="nav-home"]')).toHaveText('Harong');
    await expect(page.locator('a[data-i18n="nav-services"]')).toHaveText('Mga Serbisyo');
    await expect(page.locator('a[data-i18n="nav-government"]')).toHaveText('Gobyerno');
    await expect(page.locator('a[data-i18n="nav-statistics"]')).toHaveText('Estadistika');
    await expect(page.locator('a[data-i18n="nav-transparency"]')).toHaveText('Kalinawan');
    await expect(page.locator('a[data-i18n="nav-contact"]')).toHaveText('Kontak');

    // 2. Hotline bar
    await expect(page.locator('[data-i18n="hotline-bar-national"]').first()).toContainText(
      'Nasyonal na emerhensya'
    );
    await expect(page.locator('[data-i18n="hotline-bar-all"]').first()).toContainText(
      'Gabos na Albay hotline'
    );

    // 3. Hero section
    await expect(page.locator('[data-i18n="hero-welcome"]')).toContainText('Maogmang Pag-abot');
    await expect(page.locator('[data-i18n="hero-subtitle"]')).toContainText(
      'Makaakses sa mga serbisyo'
    );

    // 4. History timeline
    await expect(page.locator('[data-i18n="home-brief-history-of-albay"]')).toContainText(
      'Maikling Kasaysayan kan Albay'
    );
    await expect(page.locator('[data-i18n="history-200bc-title"]')).toContainText(
      'Mga Enot na Nag-erok'
    );

    // 5. Civic Map toolbar
    await expect(page.locator('[data-i18n="map-filter-all"]')).toContainText('Gabos');
    await expect(page.locator('[data-i18n="map-filter-cities"]')).toContainText('Mga Syudad');
    await expect(page.locator('[data-i18n="map-filter-municipalities"]')).toContainText(
      'Mga Banwaan'
    );

    // 6. Quiz trigger button
    await expect(page.locator('#albay-quiz-start span')).toContainText('Kuaon an Quiz');

    // 7. Footer
    await expect(page.locator('[data-i18n="home-quick-links"]')).toContainText(
      'Marikas na mga Link'
    );
    await expect(page.locator('[data-i18n="home-resources"]')).toContainText('Mga Ginikanan');

    // 8. Switching back to English restores English seamlessly
    const enBtn = page.locator('.lang-selector button[data-lang="en"]').first();
    await enBtn.click();
    await expect(page.locator('a[data-i18n="nav-home"]')).toHaveText('Home');
    await expect(page.locator('[data-i18n="hero-welcome"]')).toContainText(
      'Welcome to BetterAlbay.org'
    );
    await expect(page.locator('#albay-quiz-start span')).toContainText('Take the Quiz');
  });

  test('Government Directory converts completely to Central Bikol (BCL)', async ({ page }) => {
    await page.goto('/government/index.html', { waitUntil: 'domcontentloaded' });

    const bclBtn = page.locator('.lang-selector button[data-lang="bcl"]').first();
    await bclBtn.click();

    // 1. Page Header & Badge
    await expect(page.locator('[data-i18n="gov-page-badge"]')).toContainText(
      'Direktoryo kan Gobyerno'
    );
    await expect(page.locator('[data-i18n="gov-page-title"]')).toContainText(
      'Estruktura kan Gobyerno'
    );
    await expect(page.locator('[data-i18n="gov-page-desc"]')).toContainText(
      'Midbiron an pamamayo asin mga opisina'
    );

    // 2. Statistics summary strip
    await expect(page.locator('[data-i18n="gov-stat-districts"]')).toContainText(
      'Mga Distritong Kongresyonal'
    );
    await expect(page.locator('[data-i18n="gov-stat-execs"]')).toContainText(
      'Mga Ehekutibo kan Probinsya'
    );
    await expect(page.locator('[data-i18n="gov-stat-sp"]')).toContainText('Mga Miyembro kan Board');
    await expect(page.locator('[data-i18n="gov-stat-lgus"]')).toContainText(
      'Mga Syudad asin Banwaan'
    );

    // 3. Executive Branch
    await expect(page.locator('[data-i18n="gov-section-exec"]')).toContainText('Sangay Ehekutibo');
    await expect(page.locator('[data-i18n="gov-section-exec-title"]')).toContainText(
      'Pamamayo kan Gobyerno Probinsyal'
    );

    // 4. Legislative Branch (SP)
    await expect(page.locator('[data-i18n="gov-section-leg"]')).toContainText('Sangay Lehislatibo');
    await expect(page.locator('[data-i18n="gov-section-sp-heading"]')).toContainText(
      'Sangguniang Panlalawigan'
    );
    await expect(page.locator('[data-i18n="gov-badge-presiding-officer"]')).toContainText(
      'Namamayong Opisyal'
    );

    // 5. Local Governance
    await expect(page.locator('[data-i18n="gov-badge-local-governance"]')).toContainText(
      'Lokal na Pamamahala'
    );
    await expect(page.locator('[data-i18n="gov-section-lgu-heading"]')).toContainText(
      'Direktoryo kan mga Syudad asin Banwaan'
    );
    await expect(page.locator('[data-i18n="gov-search-label"]')).toContainText(
      'Maghanap sa Direktoryo'
    );
  });

  test('Emergency hotlines directory converts completely to Central Bikol (BCL)', async ({
    page,
  }) => {
    await page.goto('/contact/index.html', { waitUntil: 'domcontentloaded' });

    const bclBtn = page.locator('.lang-selector button[data-lang="bcl"]').first();
    await bclBtn.click();

    // 1. Directory heading and guidance
    await expect(page.locator('[data-i18n="hotline-dir-heading"]')).toContainText(
      'Mga pang-emerhensyang hotline kan Albay'
    );
    await expect(page.locator('[data-i18n="hotline-dir-sub"]')).toContainText(
      'Tawagan tulos an tamang opisina'
    );

    // 2. Search & Category controls
    await expect(page.locator('[data-i18n="hotline-search-label"]')).toContainText(
      'Maghanap nin hotline'
    );
    await expect(page.locator('[data-i18n="hotline-category-all"]')).toContainText(
      'Gabos na kategorya'
    );
  });

  test('Language choice persists across page navigations', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

    // Switch to BCL on homepage
    const bclBtn = page.locator('.lang-selector button[data-lang="bcl"]').first();
    await bclBtn.click();
    await expect(page.locator('a[data-i18n="nav-home"]')).toHaveText('Harong');

    // Navigate to Government page
    await page.locator('.main-nav a[data-i18n="nav-government"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-i18n="gov-page-badge"]')).toContainText(
      'Direktoryo kan Gobyerno'
    );
    await expect(page.locator('.main-nav a[data-i18n="nav-home"]')).toHaveText('Harong');
    await expect(page.locator('.lang-selector button[data-lang="bcl"]').first()).toHaveClass(
      /active/
    );

    // Navigate to Contact page
    await page.locator('.main-nav a[data-i18n="nav-contact"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-i18n="hotline-dir-heading"]')).toContainText(
      'Mga pang-emerhensyang hotline kan Albay'
    );
    await expect(page.locator('.lang-selector button[data-lang="bcl"]').first()).toHaveClass(
      /active/
    );

    // Navigate back to Homepage
    await page.locator('.main-nav a[data-i18n="nav-home"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-i18n="hero-welcome"]')).toContainText(
      'Maogmang Pag-abot sa BetterAlbay.org'
    );
    await expect(page.locator('.lang-selector button[data-lang="bcl"]').first()).toHaveClass(
      /active/
    );
  });
});
