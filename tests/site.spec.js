const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows name and role', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Erik H. Stenersen');
  await expect(page.getByText('QA Chapter Lead at Salonkee')).toBeVisible();
});

test('summary count matches the number of PASS lines', async ({ page }) => {
  const passes = await page.locator('.run b', { hasText: 'PASS' }).count();
  await expect(page.locator('#sum')).toHaveText(`${passes} passed, 0 failed`);
});

test('every link points to a real https address', async ({ page }) => {
  const hrefs = await page.locator('main a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) expect(href).toMatch(/^https:\/\/[^/]+\.[a-z]{2,}/);
});

test('experience is grouped by area and each group runs newest first', async ({ page }) => {
  const heads = await page.locator('.exp-group > h3').allTextContents();
  expect(heads).toEqual(['Quality and testing', 'Process and marketing', 'Design and creative work', 'Education', 'Earlier work']);
  for (const group of await page.locator('.exp-group').all()) {
    const years = (await group.locator('.when').allTextContents()).filter((t) => /^\d{4}$/.test(t)).map(Number);
    expect([...years].sort((a, b) => b - a)).toEqual(years);
    for (const y of years) expect(y).toBeLessThanOrEqual(new Date().getFullYear());
  }
});

test('hospitality is kept apart from the testing roles', async ({ page }) => {
  await expect(page.locator('#exp-qa')).not.toContainText('Hospitality');
  await expect(page.locator('#exp-early')).toContainText('Hospitality');
});

test('images have alt text', async ({ page }) => {
  const missing = await page.locator('img:not([alt])').count();
  expect(missing).toBe(0);
});

test('no horizontal scroll on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('bug hunt plants five bugs, counts them, and resets cleanly', async ({ page }) => {
  const cleanSummary = await page.locator('#sum').textContent();
  await page.getByRole('button', { name: 'Start bug hunt' }).click();
  await expect(page.locator('#hunt-count')).toHaveText('0/5 filed');

  const bugs = page.locator('[data-bug]');
  expect(await bugs.count()).toBe(5);
  for (let i = 0; i < 5; i++) await bugs.nth(i).click();

  await expect(page.locator('#hunt-count')).toHaveText('5/5 filed');
  await expect(page.locator('#hunt-win')).toBeVisible();

  await page.getByRole('button', { name: 'Stop and reset' }).click();
  await expect(page.locator('#hunt-win')).toBeHidden();
  await expect(page.locator('#sum')).toHaveText(cleanSummary);
  await expect(page.getByText('Seleium')).toHaveCount(0);
});

test('experience opens a role to show its test cases', async ({ page }) => {
  const second = page.locator('.role-d', { hasText: 'Functional Test Analyst' });
  await expect(second).not.toHaveAttribute('open', '');
  await second.locator('summary').click();
  await expect(second.getByText('ran exploratory and regression testing')).toBeVisible();
});

test('command palette opens with the keyboard, filters, and navigates', async ({ page }) => {
  await page.keyboard.press('Control+k');
  await expect(page.locator('#palette')).toBeVisible();
  await page.locator('#palette-input').fill('luup');
  await expect(page.locator('#palette-list li').first()).toContainText('Luup');
  await page.keyboard.press('Enter');
  await expect(page.locator('#palette')).toBeHidden();
  await expect(page.locator('#luup')).toBeInViewport();
});

test('palette shows a helpful message when nothing matches', async ({ page }) => {
  await page.getByRole('button', { name: /Jump to/ }).click();
  await page.locator('#palette-input').fill('zzzz');
  await expect(page.locator('#palette-list .empty')).toBeVisible();
});

test('theme toggle switches and remembers the theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.getByRole('button', { name: /Switch between light and dark/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('run bar reports the current section while scrolling', async ({ page }) => {
  await page.locator('#experience').scrollIntoViewIfNeeded();
  await expect(page.locator('#suite')).toContainText('experience');
});

test('languages are listed separately from tools', async ({ page }) => {
  const tools = await page.locator('#tools .chips').first().textContent();
  expect(tools).not.toMatch(/Danish|French|German|Luxembourgish|English/);
  await expect(page.locator('#languages')).toBeVisible();
});

test('phone screenshot has alt text and the Luup link goes to luup.lu', async ({ page }) => {
  await expect(page.locator('.phone img')).toHaveAttribute('alt', /Luup/);
  await expect(page.getByRole('link', { name: 'Open luup.lu' })).toHaveAttribute('href', 'https://luup.lu');
});

test('share preview uses the share card, not a page screenshot', async ({ page }) => {
  const img = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(img).toBe('https://megaschein.github.io/images/share-card.png');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /Stenersen/);
});
