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

test.describe('beyond testing', () => {
  test('photo carousel starts on a valid photo and moves with the buttons', async ({ page }) => {
    const total = await page.locator('#car-track .slide').count();
    expect(total).toBe(8);
    const start = Number((await page.locator('#car-count').textContent()).split(' ')[0]);
    expect(start).toBeGreaterThanOrEqual(1);
    expect(start).toBeLessThanOrEqual(total);
    await page.getByRole('button', { name: 'Next photo' }).click();
    const next = (start % total) + 1;
    await expect(page.locator('#car-count')).toHaveText(`${next} of ${total}`);
    await page.getByRole('button', { name: 'Previous photo' }).click();
    await expect(page.locator('#car-count')).toHaveText(`${start} of ${total}`);
  });

  test('slideshow can be paused and resumed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.reload();
    const play = page.locator('#car-play');
    await expect(play).toHaveText('Pause');
    await play.click();
    await expect(play).toHaveText('Play');
    await play.click();
    await expect(play).toHaveText('Pause');
  });

  test('slideshow starts paused when the visitor prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.locator('#car-play')).toHaveText('Play');
  });

  test('every photo and design image has a description', async ({ page }) => {
    const imgs = page.locator('#beyond img');
    const n = await imgs.count();
    expect(n).toBeGreaterThanOrEqual(17);
    for (let i = 0; i < n; i++) expect((await imgs.nth(i).getAttribute('alt'))?.length).toBeGreaterThan(8);
  });

  test('design work shows eight pieces and leaves out the Krav Maga one', async ({ page }) => {
    await expect(page.locator('.work li')).toHaveCount(8);
    const html = (await page.locator('#beyond').innerHTML()).toLowerCase();
    expect(html).not.toContain('krav');
  });

  test('the music and brand cards link to real pages', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Watch on YouTube' })).toHaveAttribute('href', 'https://www.youtube.com/user/WookiePr0ductions/');
    await expect(page.getByRole('link', { name: 'About Sound Advice' })).toHaveAttribute('href', 'https://erikhstenersen.wixsite.com/mysite/soundadvice');
    const html = await page.locator('#beyond').innerHTML();
    expect(html).not.toContain('soundadvice.store');
  });

  test('the co-founder is not named on the page', async ({ page }) => {
    expect(await page.locator('body').innerText()).not.toMatch(/Dina|Celina/);
  });
});

test('keyboard focus shows a visible outline', async ({ page }) => {
  await page.locator('#hunt-toggle').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const style = await page.locator('#hunt-toggle').evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(style).not.toBe('none');
});
