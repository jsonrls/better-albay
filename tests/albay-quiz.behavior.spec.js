const { test, expect } = require('@playwright/test');
const data = require('../data/albay-quiz.json');
const { gotoFresh, waitForOpen } = require('./helpers/volunteer-modal');

test.use({ serviceWorkers: 'block' });

async function openQuiz(page) {
  await gotoFresh(page, { dismissed: true });
  await page.locator('#albay-quiz-start').click();
  await expect(page.locator('#albay-quiz-question')).toHaveText(data.questions[0].question);
}

test('real data, answer commitment, next gating, resume, and results', async ({ page }) => {
  await openQuiz(page);
  const dialog = page.locator('#albay-quiz');
  await expect(dialog.locator('.albay-quiz-option-text')).toHaveText(data.questions[0].options);
  await expect(dialog.getByRole('button', { name: 'Next question' })).toBeDisabled();
  await expect(dialog.locator('progress')).toHaveAttribute('value', '0');
  const correct = dialog.getByRole('button', { name: /B\. Legazpi City/ });
  await correct.click();
  await expect(correct).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog.locator('.albay-quiz-count--correct')).toHaveText('✓ Correct 1');
  await dialog.locator('.albay-quiz-option').first().dispatchEvent('click');
  await expect(dialog.locator('.albay-quiz-count--wrong')).toHaveText('× Incorrect 0');
  await dialog.getByRole('button', { name: 'Next question' }).click();
  await dialog.locator('.albay-quiz-option').first().click();
  await expect(dialog.locator('.albay-quiz-feedback')).toContainText('Not quite.');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('#albay-quiz-start')).toHaveText('Continue quiz');
  await expect(page.locator('#albay-quiz-start')).toBeFocused();
  await page.locator('#albay-quiz-start').click();
  await expect(dialog.locator('.albay-quiz-position')).toHaveText('Question 2 of 50');
  await expect(dialog.locator('.albay-quiz-feedback')).toContainText('Not quite.');
  await dialog.getByRole('button', { name: 'Next question' }).click();
  for (let i = 2; i < data.questions.length; i++) {
    await dialog
      .locator('.albay-quiz-option')
      .nth(data.questions[i].options.indexOf(data.questions[i].answer))
      .click();
    await dialog.getByRole('button', { name: i === 49 ? 'See results' : 'Next question' }).click();
  }
  await expect(dialog.locator('.albay-quiz-score')).toHaveText('49 / 50');
  await expect(dialog.locator('.albay-quiz-meta')).toHaveText('98% correct · 1 incorrect');
  await expect(dialog.locator('progress')).toHaveAttribute('value', '50');
  await page.keyboard.press('Escape');
  await expect(page.locator('#albay-quiz-start')).toHaveText('View results');
  await page.locator('#albay-quiz-start').click();
  await dialog.getByRole('button', { name: 'Try again' }).click();
  await expect(dialog.locator('.albay-quiz-position')).toHaveText('Question 1 of 50');
  await expect(dialog.locator('.albay-quiz-count--correct')).toHaveText('✓ Correct 0');
});

test('keyboard stays inside, no letter shortcut, scroll and focus restore', async ({ page }) => {
  await openQuiz(page);
  const before = await page.evaluate(() => -parseFloat(document.body.style.top));
  await expect(page.locator('#albay-quiz-question')).toBeFocused();
  await page.keyboard.press('a');
  await expect(page.locator('.albay-quiz-action')).toBeDisabled();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('#albay-quiz'))).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement.closest('#albay-quiz'))).toBe(true);
  expect(await page.evaluate(() => document.body.style.position)).toBe('fixed');
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe('');
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(2);
  await expect(page.locator('#albay-quiz-start')).toBeFocused();
});

test('loading can close; invalid data shows retry and retry uses real data', async ({ page }) => {
  let calls = 0;
  await gotoFresh(page, { dismissed: true });
  await page.route('**/data/albay-quiz.json', async (route) => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({ json: calls === 1 ? { ...data, total_items: 2 } : data });
  });
  await page.locator('#albay-quiz-start').click();
  await expect(page.getByText('Loading quiz…')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#albay-quiz')).not.toBeVisible();
  await page.waitForTimeout(250);
  await page.locator('#albay-quiz-start').click();
  await expect(page.getByText('The quiz could not load')).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('#albay-quiz-question')).toHaveText(data.questions[0].question);
});

test('quiz takes precedence over pending or already visible volunteer dialog', async ({ page }) => {
  await gotoFresh(page);
  await page.locator('#albay-quiz-start').dispatchEvent('click');
  await expect(page.locator('#albay-quiz-question')).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.locator('#vol-popup-overlay')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  await expect(page.locator('#vol-popup-overlay')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('bs-vol-popup-v1'))).toBeNull();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForOpen(page);
  await page.locator('#albay-quiz-start').dispatchEvent('click');
  await expect(page.locator('#vol-popup-overlay')).toHaveCount(0);
  await expect(page.locator('#albay-quiz-question')).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('bs-vol-popup-v1'))).toBeNull();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe('');
});

for (const size of [
  { width: 320, height: 568 },
  { width: 740, height: 320 },
]) {
  test(`responsive quiz ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openQuiz(page);
    expect(
      await page.locator('#albay-quiz').evaluate((el) => el.scrollWidth <= el.clientWidth)
    ).toBe(true);
    await page.locator('.albay-quiz-option').first().click();
    await page.getByRole('button', { name: 'Next question' }).click();
    await expect(page.locator('#albay-quiz-question')).toHaveText(data.questions[1].question);
    await expect(page.locator('#albay-quiz-question')).toBeFocused();
    await page.getByRole('button', { name: 'Close quiz', exact: true }).click();
    await expect(page.locator('#albay-quiz')).not.toBeVisible();
  });
}

for (const invalid of ['duplicate choices', 'missing answer', 'duplicate ids', 'network error']) {
  test(`rejects ${invalid} without exposing playable questions`, async ({ page }) => {
    await gotoFresh(page, { dismissed: true });
    const payload = JSON.parse(JSON.stringify(data));
    if (invalid === 'duplicate choices')
      payload.questions[0].options[0] = payload.questions[0].options[1];
    if (invalid === 'missing answer') payload.questions[0].answer = 'No matching choice';
    if (invalid === 'duplicate ids') payload.questions[1].id = payload.questions[0].id;
    await page.route('**/data/albay-quiz.json', (route) =>
      invalid === 'network error'
        ? route.fulfill({ status: 503 })
        : route.fulfill({ json: payload })
    );
    await page.locator('#albay-quiz-start').click();
    await expect(page.getByText('The quiz could not load')).toBeVisible();
    await expect(page.locator('.albay-quiz-option')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  });
}

test('question content is rendered as text', async ({ page }) => {
  await gotoFresh(page, { dismissed: true });
  const payload = JSON.parse(JSON.stringify(data));
  payload.questions[0].question = '<img src=x onerror="window.quizInjection=true">';
  await page.route('**/data/albay-quiz.json', (route) => route.fulfill({ json: payload }));
  await page.locator('#albay-quiz-start').click();
  await expect(page.locator('#albay-quiz-question')).toHaveText(payload.questions[0].question);
  await expect(page.locator('#albay-quiz-content img')).toHaveCount(0);
  expect(await page.evaluate(() => window.quizInjection)).toBeUndefined();
});
