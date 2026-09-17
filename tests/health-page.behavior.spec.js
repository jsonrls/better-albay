const { test, expect } = require('@playwright/test');

test('health information remains honest and interactive after page initialization', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) => {
    const hostname = new URL(route.request().url()).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await page.goto('/services/health.html', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(
    page.getByText(/Albay-specific requirements, fees, and processing times have not been verified/)
  ).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Filipino' }).click();
  await expect(page.locator('a[href="tel:911"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});
