const { test, expect } = require('@playwright/test');
const { blockThirdParty } = require('./helpers/volunteer-modal');

test.use({ serviceWorkers: 'block' });

test('complete static directory remains usable without JavaScript', async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: testInfo.project.use.baseURL,
  });
  const page = await context.newPage();
  await blockThirdParty(page);
  await page.goto('/contact/');
  await expect(page.locator('.emergency-card')).toHaveCount(115);
  await expect(page.locator('.emergency-phone')).toHaveCount(156);
  await expect(page.locator('.emergency-category')).toHaveCount(11);
  await expect(page.locator('.emergency-filters')).toBeHidden();
  await expect(page.locator('#hotline-jump-guidance')).toBeHidden();
  await expect(page.locator('.emergency-phone').first()).toHaveAttribute('href', 'tel:09544199935');
  await page.locator('.emergency-jumps a[href="#hotlines-coast-guard"]').click();
  await expect(page).toHaveURL(/#hotlines-coast-guard$/);
  await context.close();
});

test('search, category, zero state, clear and category jumps', async ({ page }) => {
  await blockThirdParty(page);
  await page.goto('/contact/');
  await expect(page.locator('.emergency-filters')).toBeVisible();
  await expect(page.locator('#hotline-jump-guidance')).toHaveText(
    'Jumping to a category clears filters.'
  );
  await expect(page.locator('#hotline-jump-guidance')).toBeVisible();
  const search = page.getByLabel('Search hotlines', { exact: true });
  await search.fill('09178503047');
  await expect(page.locator('.emergency-card:visible')).toHaveCount(1);
  await expect(page.locator('.emergency-card:visible')).toContainText('Centro');
  await search.fill('Upland');
  await expect(page.locator('.emergency-card:visible')).toHaveCount(1);
  await page.getByLabel('Category', { exact: true }).selectOption('hospitals');
  await expect(page.locator('#hotline-empty')).toBeVisible();
  await expect(page.locator('#hotline-result-count')).toHaveText('Showing 0 of 115 contacts');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(search).toBeFocused();
  await expect(page.locator('.emergency-card:visible')).toHaveCount(115);
  await search.fill('nonexistent');
  await page.locator('.emergency-jumps a[href="#hotlines-bfp"]').click();
  await expect(search).toHaveValue('');
  await expect(page.locator('#hotlines-bfp')).toBeFocused();
  await expect(page.locator('.emergency-card:visible')).toHaveCount(115);
  await page.getByLabel('Category', { exact: true }).selectOption('bfp');
  await expect(page.locator('.emergency-card:visible')).toHaveCount(20);
  await expect(page.locator('#hotline-result-count')).toHaveText('Showing 20 of 115 contacts');
});

test('320px layout wraps critical calls without cloned or moving links', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await blockThirdParty(page);
  await page.goto('/contact/');
  await expect(page.locator('.hotline-items > a')).toHaveCount(4);
  await expect(page.locator('.hotline-items-track')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const geometry = await page
    .locator('.emergency-phone, .emergency-critical a')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
      }))
    );
  expect(Math.min(...geometry.map((box) => box.height))).toBeGreaterThanOrEqual(44);
  expect(Math.min(...geometry.map((box) => box.width))).toBeGreaterThanOrEqual(44);
  const x = await page
    .locator('.hotline-item')
    .first()
    .evaluate((node) => node.getBoundingClientRect().x);
  await page.waitForTimeout(500);
  expect(
    await page
      .locator('.hotline-item')
      .first()
      .evaluate((node) => node.getBoundingClientRect().x)
  ).toBe(x);
  await page.goto('/offline.html');
  const offline = await page.locator('.hotline-number').evaluateAll((nodes) =>
    nodes.map((node) => ({
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
    }))
  );
  expect(Math.min(...offline.map((box) => box.height))).toBeGreaterThanOrEqual(44);
  expect(Math.min(...offline.map((box) => box.width))).toBeGreaterThanOrEqual(44);
});
