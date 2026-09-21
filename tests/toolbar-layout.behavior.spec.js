const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

test.describe('Directory Toolbar & LGU Card Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/*', (route) => {
      const hostname = new URL(route.request().url()).hostname;
      return hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.includes('jsdelivr.net')
        ? route.continue()
        : route.abort();
    });
  });

  test('barangay directory toolbar has properly aligned search icon, non-truncating selects, and aligned buttons', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/government/barangays.html');

    // Wait for barangay data to finish loading and populate selects
    await expect(page.locator('#brgy-count')).toContainText('residents');

    // 1. Search icon vertical alignment relative to the input
    const searchInput = page.locator('#brgy-search');
    const searchIcon = page.locator('.dir-search-field .bi-search');

    await expect(searchInput).toBeVisible();
    await expect(searchIcon).toBeAttached();

    const inputBBox = await searchInput.boundingBox();
    const iconBBox = await searchIcon.boundingBox();

    expect(inputBBox).toBeTruthy();
    expect(iconBBox).toBeTruthy();

    const inputCenterY = inputBBox.y + inputBBox.height / 2;
    const iconCenterY = iconBBox.y + iconBBox.height / 2;

    // Search icon center must be aligned with the input's vertical center (within 3px tolerance)
    expect(Math.abs(inputCenterY - iconCenterY)).toBeLessThanOrEqual(3);

    // 2. City or municipality select width & option readability
    const lguSelect = page.locator('#brgy-lgu');
    await expect(lguSelect).toBeVisible();

    const selectBBox = await lguSelect.boundingBox();
    // At 1280px viewport, the LGU select must have ample width (at least 260px) to show long names
    expect(selectBBox.width).toBeGreaterThanOrEqual(260);

    // Select "Santo Domingo (Municipality, 23)" and verify value
    await lguSelect.selectOption('Santo Domingo');
    await expect(lguSelect).toHaveValue('Santo Domingo');
    await expect(page.locator('#brgy-count')).toContainText('filtered from 720');
    await expect(page.locator('.brgy-col-lgu').first()).toContainText('Santo Domingo');

    // 3. Poblacion checkbox container and Reset button alignment
    const pobCheck = page.locator('.dir-check');
    const resetBtn = page.locator('#brgy-reset');

    await expect(pobCheck).toBeVisible();
    await expect(resetBtn).toBeVisible();

    const pobBBox = await pobCheck.boundingBox();
    const resetBBox = await resetBtn.boundingBox();

    // The Poblacion container and Reset button must NOT overlap
    expect(pobBBox.x + pobBBox.width).toBeLessThanOrEqual(resetBBox.x + 1);

    // Reset button and inputs must have consistent 44px height (within 2px tolerance)
    expect(Math.abs(resetBBox.height - 44)).toBeLessThanOrEqual(2);
    expect(Math.abs(inputBBox.height - 44)).toBeLessThanOrEqual(2);

    // Bottom alignment of inputs and reset button on the desktop row
    const inputBottom = inputBBox.y + inputBBox.height;
    const resetBottom = resetBBox.y + resetBBox.height;
    expect(Math.abs(inputBottom - resetBottom)).toBeLessThanOrEqual(3);

    // Verify absence of awkward &nbsp; in reset field
    const resetField = page.locator('.dir-field-action');
    await expect(resetField.locator('.dir-field-label')).toHaveCount(0);

    // 4. Interactive filtering and Reset button functionality
    await searchInput.fill('San');
    await expect(page.locator('#brgy-count')).toContainText('filtered');

    const pobInput = page.locator('#brgy-pob');
    await pobInput.check();
    expect(await pobInput.isChecked()).toBe(true);

    // Click Reset
    await resetBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(lguSelect).toHaveValue('');
    expect(await pobInput.isChecked()).toBe(false);
    await expect(page.locator('#brgy-count')).toContainText('720');

    expect(errors).toEqual([]);
  });

  test('barangay toolbar wraps responsively on medium and mobile viewports without truncating', async ({
    page,
  }) => {
    // Test on laptop / narrow screen (992px)
    await page.setViewportSize({ width: 992, height: 700 });
    await page.goto('/government/barangays.html');
    await expect(page.locator('#brgy-count')).toContainText('residents');

    const lguSelect = page.locator('#brgy-lgu');
    const selectBBox = await lguSelect.boundingBox();
    // On 992px with wrapping, LGU select has comfortable room (>= 260px)
    expect(selectBBox.width).toBeGreaterThanOrEqual(260);

    // Test on mobile screen (375px)
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileInput = page.locator('#brgy-search');
    const mobileInputBBox = await mobileInput.boundingBox();
    // On mobile, the field stacks and spans full available width (> 300px)
    expect(mobileInputBBox.width).toBeGreaterThanOrEqual(300);

    const mobileReset = page.locator('#brgy-reset');
    const mobileResetBBox = await mobileReset.boundingBox();
    expect(mobileResetBBox.width).toBeGreaterThanOrEqual(300);
  });

  test('government index page LGU cards have 100% width View Councilors button and equally shared action buttons', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/government/index.html');

    // 1. Search icon in government toolbar is also vertically centered
    const lguSearchInput = page.locator('#lgu-search-input');
    const lguSearchIcon = page.locator('.dir-search-field .bi-search');
    await expect(lguSearchInput).toBeVisible();
    await expect(lguSearchIcon).toBeAttached();

    const searchBBox = await lguSearchInput.boundingBox();
    const iconBBox = await lguSearchIcon.boundingBox();
    const sCenterY = searchBBox.y + searchBBox.height / 2;
    const iCenterY = iconBBox.y + iconBBox.height / 2;
    expect(Math.abs(sCenterY - iCenterY)).toBeLessThanOrEqual(3);

    // 2. View Councilors toggle button is 100% width of its container
    const firstCard = page.locator('#lgu-grid .lgu-card').first();
    const councilorsCollapse = firstCard.locator('.councilors-collapse');
    const toggleBtn = firstCard.locator('.council-toggle-btn');

    await expect(toggleBtn).toBeVisible();
    const collapseBBox = await councilorsCollapse.boundingBox();
    const toggleBBox = await toggleBtn.boundingBox();

    // Toggle button width matches the councilors-collapse container width
    expect(Math.abs(toggleBBox.width - collapseBBox.width)).toBeLessThanOrEqual(2);

    // 3. The two action buttons below share 100% width of .lgu-links container equally
    const lguLinks = firstCard.locator('.lgu-links');
    const actionButtons = lguLinks.locator('a');

    await expect(actionButtons).toHaveCount(2);

    const linksBBox = await lguLinks.boundingBox();
    const btn1BBox = await actionButtons.nth(0).boundingBox();
    const btn2BBox = await actionButtons.nth(1).boundingBox();

    // The two buttons must have equal width (within 2px)
    expect(Math.abs(btn1BBox.width - btn2BBox.width)).toBeLessThanOrEqual(2);

    // Together with the gap, they must span the full container width
    const totalSpan = btn2BBox.x + btn2BBox.width - btn1BBox.x;
    expect(Math.abs(totalSpan - linksBBox.width)).toBeLessThanOrEqual(3);

    expect(errors).toEqual([]);
  });

  test('elected officials page toolbar has aligned controls and functional reset', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/government/officials.html');

    await expect(page.locator('#off-count')).toContainText('18');

    const searchInput = page.locator('#off-search');
    const searchIcon = page.locator('.dir-search-field .bi-search');
    await expect(searchInput).toBeVisible();
    await expect(searchIcon).toBeAttached();

    const inputBBox = await searchInput.boundingBox();
    const iconBBox = await searchIcon.boundingBox();
    const inputCenterY = inputBBox.y + inputBBox.height / 2;
    const iconCenterY = iconBBox.y + iconBBox.height / 2;
    expect(Math.abs(inputCenterY - iconCenterY)).toBeLessThanOrEqual(3);

    const resetBtn = page.locator('#off-reset');
    await expect(resetBtn).toBeVisible();
    const resetBBox = await resetBtn.boundingBox();
    expect(Math.abs(resetBBox.height - 44)).toBeLessThanOrEqual(2);

    // Verify absence of awkward &nbsp;
    const resetField = page.locator('.dir-field-action');
    await expect(resetField.locator('.dir-field-label')).toHaveCount(0);

    // Test filter & reset
    await searchInput.fill('Legazpi');
    await expect(page.locator('#off-count')).toContainText('1 of 18');

    await resetBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('#off-count')).toContainText('18 of 18');

    expect(errors).toEqual([]);
  });

  test('mobile header places logo on left and hamburger menu on far right', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    for (const width of [375, 768]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      const logo = page.locator('.header-inner .logo-container');
      const toggle = page.locator('.header-inner .mobile-menu-toggle');

      await expect(logo).toBeVisible();
      await expect(toggle).toBeVisible();

      const logoBox = await logo.boundingBox();
      const toggleBox = await toggle.boundingBox();
      const headerBox = await page.locator('.header-inner').boundingBox();

      expect(logoBox).toBeTruthy();
      expect(toggleBox).toBeTruthy();
      expect(headerBox).toBeTruthy();

      // Logo is near left edge of header
      expect(logoBox.x).toBeLessThan(headerBox.x + 30);

      // Toggle button is pushed to far right of header
      const toggleRight = toggleBox.x + toggleBox.width;
      const headerRight = headerBox.x + headerBox.width;
      expect(headerRight - toggleRight).toBeLessThanOrEqual(30);

      // Logo and toggle sit on opposite sides without overlap
      expect(logoBox.x + logoBox.width).toBeLessThan(toggleBox.x);
    }

    expect(errors).toEqual([]);
  });

  test('hotline bar items render as compact badges in a single horizontal row', async ({
    page,
  }) => {
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      const items = page.locator('.hotline-item');
      await expect(items).toHaveCount(4);

      const yPositions = await items.evaluateAll((nodes) =>
        nodes.map((n) => Math.round(n.getBoundingClientRect().y))
      );

      // All items in the hotline bar must share the exact same Y position (one single row)
      const firstY = yPositions[0];
      for (const y of yPositions) {
        expect(Math.abs(y - firstY)).toBeLessThanOrEqual(2);
      }

      // Ensure badges are compact (height <= 26px)
      const heights = await items.evaluateAll((nodes) =>
        nodes.map((n) => n.getBoundingClientRect().height)
      );
      for (const h of heights) {
        expect(h).toBeLessThanOrEqual(26);
      }
    }
  });

  test('mayon background and video are centered on smaller devices', async ({ page }) => {
    for (const width of [375, 768]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      const hero = page.locator('.home-hero-v2');
      const video = page.locator('.home-hero-video');

      await expect(hero).toBeVisible();
      await expect(video).toBeAttached();

      const bgPos = await hero.evaluate((el) => getComputedStyle(el).backgroundPosition);
      const objPos = await video.evaluate((el) => getComputedStyle(el).objectPosition);

      expect(bgPos).toContain('36%');
      expect(objPos).toContain('36%');
    }
  });

  test('weather stats (humidity and wind) are displayed below celsius in their own stats row', async ({
    page,
  }) => {
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript(() => {
        try {
          localStorage.setItem('bs-vol-popup-v1', '1');
        } catch (e) {}
      });
      await page.goto('/');

      const weatherWidget = page.locator('.weather-widget');
      await expect(weatherWidget).toBeVisible();

      const temp = weatherWidget.locator('.weather-current-temp');
      const stats = weatherWidget.locator('.weather-stats');
      await expect(temp).toBeVisible();
      await expect(stats).toBeVisible();

      // Ensure stats row is strictly below celsius temperature
      const tempBox = await temp.boundingBox();
      const statsBox = await stats.boundingBox();
      expect(tempBox).not.toBeNull();
      expect(statsBox).not.toBeNull();
      expect(statsBox.y).toBeGreaterThanOrEqual(tempBox.y + tempBox.height);

      // Verify the two stat items (humidity and wind) are present and in a horizontal row
      const statItems = stats.locator('.weather-stat');
      await expect(statItems).toHaveCount(2);

      const [stat1Box, stat2Box] = await Promise.all([
        statItems.nth(0).boundingBox(),
        statItems.nth(1).boundingBox(),
      ]);

      expect(stat1Box).not.toBeNull();
      expect(stat2Box).not.toBeNull();
      expect(stat2Box.x).toBeGreaterThan(stat1Box.x);

      if (width === 1280) {
        await weatherWidget.screenshot({
          path: '/Users/jaysonreales/.gemini/antigravity-cli/brain/d56975dd-9e32-4231-87f9-f2bf78e638ae/weather_widget_stats_below.png',
        });
      }
    }
  });

  test('displays the next 5 day forecast in a single row', async ({ page }) => {
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript(() => {
        try {
          localStorage.setItem('bs-vol-popup-v1', '1');
        } catch (e) {}
      });
      await page.goto('/');

      const weatherWidget = page.locator('.weather-widget');
      await expect(weatherWidget).toBeVisible();

      // Ensure 5-day forecast section and title are visible
      const forecastSection = weatherWidget.locator('.weather-forecast-section');
      await expect(forecastSection).toBeVisible();

      const forecastTitle = forecastSection.locator('.weather-forecast-title');
      await expect(forecastTitle).toContainText('5-Day Forecast');

      // Exactly 5 forecast days
      const days = forecastSection.locator('.weather-forecast-day');
      await expect(days).toHaveCount(5);

      // Verify all 5 days are in a single horizontal row (Y positions match)
      const boxes = [];
      for (let i = 0; i < 5; i++) {
        const box = await days.nth(i).boundingBox();
        expect(box).not.toBeNull();
        boxes.push(box);
      }

      const firstY = boxes[0].y;
      for (let i = 1; i < 5; i++) {
        // Top edge Y of all 5 cards should be within 4px of each other (single row)
        expect(Math.abs(boxes[i].y - firstY)).toBeLessThan(4);
        // X coordinates should be strictly ascending (left to right)
        expect(boxes[i].x).toBeGreaterThan(boxes[i - 1].x);
      }

      if (width === 1280) {
        await weatherWidget.screenshot({
          path: '/Users/jaysonreales/.gemini/antigravity-cli/brain/d56975dd-9e32-4231-87f9-f2bf78e638ae/weather_widget_5day.png',
        });
      }
    }
  });
});
