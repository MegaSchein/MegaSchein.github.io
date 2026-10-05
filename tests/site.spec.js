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
    expect(n).toBe(17);
    for (let i = 0; i < n; i++) expect((await imgs.nth(i).getAttribute('alt'))?.length).toBeGreaterThan(8);
  });

  test('design work shows seven pieces and leaves out the Krav Maga one', async ({ page }) => {
    await expect(page.locator('.work li')).toHaveCount(7);
    const html = (await page.locator('#beyond').innerHTML()).toLowerCase();
    expect(html).not.toContain('krav');
  });

  test('the music and brand cards link to real pages', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Watch on YouTube' })).toHaveAttribute('href', 'https://www.youtube.com/user/WookiePr0ductions/');
    await expect(page.getByRole('link', { name: 'Sound Advice on Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/_soundadvice_/');
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

test('page declares icons and every icon file exists', async ({ page, request }) => {
  const hrefs = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll((ls) => ls.map((l) => l.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThanOrEqual(3);
  for (const href of hrefs) expect((await request.get('/' + href)).status(), href).toBe(200);
});

test('carousel stays on the right photo when a late scroll event arrives mid-animation', async ({ page }) => {
  await page.waitForTimeout(400);
  const start = Number((await page.locator('#car-count').textContent()).split(' ')[0]);
  await page.locator('#car-next').click();
  await expect(page.locator('#car-count')).toHaveText(`${(start % 8) + 1} of 8`);
  // Put the track back where it was and fire a scroll event, as a slow device mid-animation would.
  await page.evaluate((from) => {
    const track = document.getElementById('car-track');
    const s = track.querySelectorAll('.slide')[from - 1];
    track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.clientWidth) / 2, behavior: 'instant' });
    track.dispatchEvent(new Event('scroll'));
  }, start);
  await page.waitForTimeout(250);
  await page.locator('#car-prev').click();
  await expect(page.locator('#car-count')).toHaveText(`${start} of 8`);
});

test('Luup sits inside Beyond testing, after the experience', async ({ page }) => {
  await expect(page.locator('#beyond #luup')).toHaveCount(1);
  await expect(page.locator('section#luup')).toHaveCount(0);
  const inOrder = await page.evaluate(() => {
    const y = (sel) => document.querySelector(sel).getBoundingClientRect().top + scrollY;
    return y('#experience') < y('#luup');
  });
  expect(inOrder).toBe(true);
});

test('hero introduces who Erik is with four facts in the same voice', async ({ page }) => {
  const lines = await page.locator('.run .l:not(.sum)').allTextContents();
  expect(lines).toHaveLength(4);
  expect(lines.join(' ')).toContain('co-founded a clothing brand about mental health');
  expect(lines.join(' ')).toContain('turns manual work into automations, once saved a business 7 working days a year');
  expect(lines.join(' ')).not.toContain('his own product');
});

test('Beyond testing keeps visitors on the page instead of sending them to Wix for more', async ({ page }) => {
  const hrefs = await page.locator('#beyond a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  for (const gone of ['/photography', '/visuals', '/projects']) {
    expect(hrefs.some((h) => h.endsWith(gone)), gone).toBe(false);
  }
  await expect(page.getByText('More photography')).toHaveCount(0);
  await expect(page.getByText('See all projects')).toHaveCount(0);
});

test('Sound Advice is described in the past tense', async ({ page }) => {
  const card = page.locator('.card-sound');
  await expect(card).toContainText('set out to start positive conversations');
  await expect(card).toContainText('Its motto was');
  await expect(card).not.toContainText('aims to');
});

test('What I do adds new facts instead of repeating the hero line', async ({ page }) => {
  const about = await page.locator('#about').innerText();
  expect(about).not.toMatch(/seven working days|7 working days/);
  expect(about).toContain('Cypress tests that run in CI/CD');
  await expect(page.locator('.run')).toContainText('7 working days a year');
});

test('Beyond testing no longer links to the old Wix site', async ({ page }) => {
  const html = await page.locator('#beyond').innerHTML();
  expect(html).not.toContain('wixsite.com');
});
