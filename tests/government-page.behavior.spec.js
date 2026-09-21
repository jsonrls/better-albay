const { test, expect } = require('@playwright/test');

test('government page renders Albay provincial leadership, representatives, SP members, and 18 LGUs from officials.json', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.route('**/*', (route) => {
    const hostname = new URL(route.request().url()).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
      ? route.continue()
      : route.abort();
  });

  await page.goto('/government/index.html', { waitUntil: 'networkidle' });

  // 1. Page Header & SEO
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Government Structure & Officials'
  );
  await expect(page.locator('.page-header-desc')).toContainText(
    'Meet the leadership and offices serving Albay'
  );

  // 2. Executive Leadership (Governor & Vice Governor)
  await expect(page.locator('.executive-card')).toHaveCount(2);
  await expect(page.getByText('Hon. Noel E. Rosal')).toBeVisible();
  await expect(page.getByText('Hon. Farida “Diday” S. Co').first()).toBeVisible();
  await expect(page.getByText('pgasecretariat@gmail.com', { exact: true })).toBeVisible();
  await expect(page.getByText('(052) 742-6377')).toBeVisible();

  // Appointed officials
  await expect(page.getByText('Engr. Raul E. Rosal')).toBeVisible();
  await expect(page.getByText('Dr. Karl Hegel M. Ante')).toBeVisible();

  // 3. Congressional Representatives (3 districts)
  const repCards = page.locator('.rep-card');
  await expect(repCards.filter({ hasText: 'Hon. Cielo Krisel Lagman' })).toHaveCount(1);
  await expect(repCards.filter({ hasText: 'Hon. Carlos Andes Loria' })).toHaveCount(1);
  await expect(repCards.filter({ hasText: 'Hon. Adrian E. Salceda' })).toHaveCount(1);

  // 4. Sangguniang Panlalawigan Members (12 board members)
  const spGrid = page.locator('#sp-grid');
  const spCards = spGrid.locator('.sp-card');
  await expect(spCards).toHaveCount(12);
  await expect(spGrid.getByText('Hon. Sheina Marie Onrubia-Dela Cruz')).toBeVisible();
  await expect(spGrid.getByText('Hon. Juan Miguel Ricardo Salceda')).toBeVisible();
  await expect(spGrid.getByText('Hon. Patricia Gonzales-Alsua')).toBeVisible();

  // District tabs filter on Sangguniang Panlalawigan
  await page.locator('button[data-sp-filter="1"]').click();
  await expect(page.locator('#sp-grid .sp-card:visible')).toHaveCount(3);

  await page.locator('button[data-sp-filter="2"]').click();
  await expect(page.locator('#sp-grid .sp-card:visible')).toHaveCount(3);

  await page.locator('button[data-sp-filter="3"]').click();
  await expect(page.locator('#sp-grid .sp-card:visible')).toHaveCount(4);

  await page.locator('button[data-sp-filter="ex"]').click();
  await expect(page.locator('#sp-grid .sp-card:visible')).toHaveCount(2);

  await page.locator('button[data-sp-filter="all"]').click();
  await expect(page.locator('#sp-grid .sp-card:visible')).toHaveCount(12);

  // 5. Local Government Units Directory (18 LGUs)
  const lguGrid = page.locator('#lgu-grid');
  const lguCards = lguGrid.locator('.lgu-card');
  await expect(lguCards).toHaveCount(18);

  // 3 Cities & 15 Municipalities
  await expect(lguGrid.getByText('Legazpi City')).toBeVisible();
  await expect(lguGrid.getByText('Ligao City')).toBeVisible();
  await expect(lguGrid.getByText('Tabaco City')).toBeVisible();
  await expect(lguGrid.getByText('Tiwi')).toBeVisible();
  await expect(lguGrid.getByText('Daraga')).toBeVisible();

  // Test Classification filter
  const typeSelect = page.locator('#lgu-type-select');
  await typeSelect.selectOption('city');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(3);

  await typeSelect.selectOption('municipality');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(15);

  await typeSelect.selectOption('all');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(18);

  // Test District filter
  const distSelect = page.locator('#lgu-district-select');
  await distSelect.selectOption('1');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(6);

  await distSelect.selectOption('2');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(5);

  await distSelect.selectOption('3');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(7);

  // Test Combined filter (District 1 + Municipalities = 5)
  await distSelect.selectOption('1');
  await typeSelect.selectOption('municipality');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(5);

  // Reset dropdowns to all
  await distSelect.selectOption('all');
  await typeSelect.selectOption('all');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(18);

  // Test Search filter by LGU name
  const searchInput = page.locator('#lgu-search-input');
  await searchInput.fill('Tiwi');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(1);
  await expect(page.locator('#lgu-grid .lgu-card:visible').first()).toContainText('Tiwi');

  // Test Search filter by Mayor name
  await searchInput.fill('Bombales');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(1);
  await expect(page.locator('#lgu-grid .lgu-card:visible').first()).toContainText('Bacacay');

  // Test Search filter with role combinations (e.g. "Tiwi mayor", "Legazpi mayor")
  await searchInput.fill('Tiwi mayor');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(1);
  await expect(page.locator('#lgu-grid .lgu-card:visible').first()).toContainText('Tiwi');

  await searchInput.fill('Legazpi mayor');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(1);
  await expect(page.locator('#lgu-grid .lgu-card:visible').first()).toContainText('Legazpi City');

  // Test Search by capital
  await searchInput.fill('capital');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(1);
  await expect(page.locator('#lgu-grid .lgu-card:visible').first()).toContainText('Legazpi City');

  // Test Search by district ordinal
  await searchInput.fill('1st district');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(6);

  // Test Search filter by Councilor name (with auto-expand, highlight and count preservation)
  await searchInput.fill('Rañola');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(1);
  await expect(page.locator('#lgu-grid .lgu-card:visible').first()).toContainText('Legazpi City');
  await expect(page.locator('.councilor-tag.match')).toContainText('Rañola');

  // Verify that toggling after auto-expansion preserves the councilor count
  const legazpiCard = page.locator('#lgu-grid .lgu-card:visible').first();
  const legazpiToggleBtn = legazpiCard.locator('.council-toggle-btn');
  await expect(legazpiToggleBtn).toContainText('Hide Councilors');
  await legazpiToggleBtn.click();
  await expect(legazpiToggleBtn).toContainText('View Councilors (10)');
  await legazpiToggleBtn.click();
  await expect(legazpiToggleBtn).toContainText('Hide Councilors');

  // Test Reset button
  const resetBtn = page.locator('#lgu-reset-btn');
  await resetBtn.click();
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(18);

  // Test Councilor Toggle on an LGU card
  const firstCard = lguCards.first();
  const toggleBtn = firstCard.locator('.council-toggle-btn');
  await expect(toggleBtn).toBeVisible();
  await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
  await toggleBtn.click();
  await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
  await expect(firstCard.locator('.councilor-tag-list')).toBeVisible();
  await toggleBtn.click();
  await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

  // Test Empty Search state
  await searchInput.fill('NonexistentPlace999');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(0);
  await expect(page.locator('#lgu-empty-notice')).toBeVisible();
  await searchInput.fill('');
  await expect(page.locator('#lgu-grid .lgu-card:visible')).toHaveCount(18);

  // 6. Sources & Provenance Disclosure
  const sourcesSection = page.locator('#transparency-provenance');
  await expect(sourcesSection).toBeVisible();
  await expect(sourcesSection).toContainText('Official Source Pointers');
  await expect(sourcesSection).toContainText('Scope & Limitations Notice');
  await expect(sourcesSection.getByText('House of Representatives (20th Congress)')).toBeVisible();
  await expect(sourcesSection.getByText('DILG Local Officials Archive')).toBeVisible();

  // 7. Navigation and Breadcrumbs
  await expect(page.locator('.breadcrumbs a[data-i18n="nav-home"]')).toBeVisible();
  await expect(page.locator('.breadcrumbs span[data-i18n="nav-government"]')).toBeVisible();

  // 8. Translation switcher (switching to Filipino updates dropdowns and footer)
  const filBtn = page.locator('button[data-lang="fil"]');
  if (await filBtn.isVisible()) {
    await filBtn.click();
    await expect(page.locator('.site-footer')).toContainText('LGU Albay');
    await page.locator('button[data-lang="en"]').click();
  }

  // 9. No JavaScript runtime errors
  expect(errors).toEqual([]);
});

test('government page councilor roster is accessible in DOM when JavaScript is disabled', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.route('**/*', (route) => {
    const hostname = new URL(route.request().url()).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
      ? route.continue()
      : route.abort();
  });

  await page.goto('/government/index.html', { waitUntil: 'domcontentloaded' });

  // With semantic <details>/<summary>, all councilors are present in DOM without JS
  const lguCards = page.locator('.lgu-card');
  await expect(lguCards).toHaveCount(18);
  await expect(page.locator('.councilor-tag-list')).toHaveCount(18);
  await expect(page.getByText('Hon. Vicente F. Baltazar III')).toBeAttached();
  await expect(page.getByText('Hon. Alan O. Rañola')).toBeAttached();

  await context.close();
});
