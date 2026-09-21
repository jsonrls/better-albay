const { test, expect } = require('@playwright/test');

test.describe('Albay Civic Map Component', () => {
  test('entire Albay civic map renders with all 18 LGUs, Capitol, and filter controls', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Suppress the volunteer popup so it doesn't intercept clicks
    await page.addInitScript(() => {
      try {
        localStorage.setItem('bs-vol-popup-v1', '1');
      } catch (e) {}
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Map container and card must be visible
    const mapCard = page.locator('.map-card');
    await page.evaluate(() => document.querySelector('.map-card')?.scrollIntoView());
    await expect(mapCard).toBeVisible();

    const title = mapCard.locator('.map-toolbar-title');
    await expect(title).toContainText('Civic Map of Albay');

    // Filter buttons
    const filterAll = mapCard.locator('.map-filter-btn[data-filter="all"]');
    const filterCity = mapCard.locator('.map-filter-btn[data-filter="city"]');
    const filterMuni = mapCard.locator('.map-filter-btn[data-filter="municipality"]');
    const filterCivic = mapCard.locator('.map-filter-btn[data-filter="civic"]');

    await expect(filterAll).toBeVisible();
    await expect(filterCity).toBeVisible();
    await expect(filterMuni).toBeVisible();
    await expect(filterCivic).toBeVisible();
    await expect(filterAll).toHaveClass(/active/);

    // Map container exists
    const mapContainer = page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    // Attribution bar
    const attribution = mapCard.locator('.map-attribution');
    await expect(attribution).toBeVisible();
    await expect(attribution).toContainText('18 LGUs');

    const resetBtn = mapCard.locator('#map-reset-bounds');
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toContainText('Fit Entire Albay');

    // Wait for either Leaflet interactive map to initialize or iframe fallback to settle
    const isLeaflet = await Promise.race([
      page
        .waitForSelector('#map-container[data-map-loaded="leaflet"]', { timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .waitForSelector('#map-container iframe.map-iframe', { timeout: 8000 })
        .then(() => false)
        .catch(() => false),
    ]);

    if (isLeaflet) {
      // All civic pins should be rendered (22 total: 18 LGUs + Capitol + Mayon + BRHMC + APSEMO)
      const pins = mapContainer.locator('.civic-pin');
      await expect(pins).toHaveCount(22);

      // Get initial zoom level
      const getZoom = () => page.evaluate(() => window.MapComponent?.map?.getZoom());
      const initialZoom = await getZoom();

      // Filter: Cities (3 component cities: Legazpi, Ligao, Tabaco)
      await filterCity.click();
      await expect(filterCity).toHaveClass(/active/);
      await expect(filterAll).not.toHaveClass(/active/);
      await expect(mapContainer.locator('.civic-pin')).toHaveCount(3);
      // Zoom should NOT change when switching filters
      expect(await getZoom()).toBe(initialZoom);

      // Click on a city pin and verify popup opens with civic info
      const cityPin = mapContainer.locator('.civic-marker-city').first();
      await cityPin.click({ force: true });
      const popup = mapContainer.locator('.civic-popup-card');
      await expect(popup).toBeVisible();
      await expect(popup).toContainText('City');

      // Filter: Municipalities (15 municipalities)
      await filterMuni.click();
      await expect(filterMuni).toHaveClass(/active/);
      await expect(mapContainer.locator('.civic-pin')).toHaveCount(15);
      expect(await getZoom()).toBe(initialZoom);

      // Filter: Capitol & Civic (Capitol, Mayon, BRHMC, APSEMO = 4)
      await filterCivic.click();
      await expect(filterCivic).toHaveClass(/active/);
      await expect(mapContainer.locator('.civic-pin')).toHaveCount(4);
      expect(await getZoom()).toBe(initialZoom);

      // Filter: All (Restores 22)
      await filterAll.click();
      await expect(filterAll).toHaveClass(/active/);
      await expect(mapContainer.locator('.civic-pin')).toHaveCount(22);
      expect(await getZoom()).toBe(initialZoom);

      // Reset button click
      await resetBtn.click();
    } else {
      // Fallback iframe should cover Albay bounding box
      const iframe = mapContainer.locator('iframe.map-iframe');
      await expect(iframe).toBeVisible();
      const src = await iframe.getAttribute('src');
      expect(src).toContain('123.35');
      expect(src).toContain('13.1391');
    }

    expect(errors).toEqual([]);
  });

  test('map toolbar wraps responsively without horizontal overflow at mobile widths', async ({
    page,
  }) => {
    // Suppress the volunteer popup
    await page.addInitScript(() => {
      try {
        localStorage.setItem('bs-vol-popup-v1', '1');
      } catch (e) {}
    });

    for (const width of [320, 375, 576, 768]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const mapCard = page.locator('.map-card');
      await page.evaluate(() => document.querySelector('.map-card')?.scrollIntoView());
      await expect(mapCard).toBeVisible();

      // Ensure page does not have horizontal scrollbar
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });
});
