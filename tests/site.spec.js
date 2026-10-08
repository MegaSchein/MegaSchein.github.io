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
  const all = await page.locator('main a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  const hrefs = all.filter((h) => !h.startsWith('mailto:'));
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

test.describe('bug hunt', () => {
  const start = (page) => page.getByRole('button', { name: 'Start bug hunt' }).click();

  test('the page is clean until the hunt starts', async ({ page }) => {
    await expect(page.locator('.is-bugged')).toHaveCount(0);
    await expect(page.locator('#sum')).toHaveText('4 passed, 0 failed');
    await expect(page.getByText('qualiyt')).toHaveCount(0);
    await expect(page.locator('.hunt-bar button', { hasText: 'hint' })).toBeHidden();
  });

  test('starting plants five visible bugs', async ({ page }) => {
    await start(page);
    await expect(page.locator('#hunt-count')).toHaveText('0/5 filed');
    await expect(page.locator('.is-bugged')).toHaveCount(5);
    await expect(page.locator('#sum')).toHaveText('undefined passed, NaN failed');
    await expect(page.getByText('qualiyt')).toBeVisible();
    await expect(page.locator('.when', { hasText: '2091' })).toBeVisible();
    await expect(page.locator('img[data-bug="image"]')).toHaveAttribute('src', /missing/);
    await expect(page.locator('#hunt-hint')).toBeVisible();
  });

  test('filing a bug fixes it straight away and adds a ticket', async ({ page }) => {
    await start(page);
    await page.locator('#sum').click();
    await expect(page.locator('#sum')).toHaveText('4 passed, 0 failed');
    await expect(page.locator('#hunt-count')).toHaveText('1/5 filed');
    const ticket = page.locator('#hunt-tickets li');
    await expect(ticket).toHaveCount(1);
    await expect(ticket.first()).toContainText('BUG-101');
    await expect(ticket.first()).toContainText('fixed');
    // the same bug cannot be filed twice
    await page.locator('#sum').click();
    await expect(page.locator('#hunt-count')).toHaveText('1/5 filed');
  });

  test('filing the broken image restores the screenshot', async ({ page }) => {
    await start(page);
    await page.locator('img[data-bug="image"]').click();
    await expect(page.locator('img[data-bug="image"]')).toHaveAttribute('src', 'images/luup-home.png');
  });

  test('finding all five wins and stopping resets everything', async ({ page }) => {
    await start(page);
    for (const id of ['name', 'count', 'typo', 'date', 'image']) await page.locator(`[data-bug="${id}"]`).click();
    await expect(page.locator('#hunt-count')).toHaveText('5/5 filed');
    await expect(page.locator('#hunt-tickets li')).toHaveCount(5);
    await expect(page.locator('#hunt-win')).toBeVisible();
    await expect(page.locator('#hunt-hint')).toBeHidden();
    await expect(page.locator('.is-bugged')).toHaveCount(0);
    await page.getByRole('button', { name: 'Stop and reset' }).click();
    await expect(page.locator('#hunt-win')).toBeHidden();
    await expect(page.locator('#hunt-tickets li')).toHaveCount(0);
    await expect(page.locator('#sum')).toHaveText('4 passed, 0 failed');
  });

  test('stopping part-way puts every bug back', async ({ page }) => {
    await start(page);
    await page.locator('#hunt-hint').click();
    await page.getByRole('button', { name: 'Stop and reset' }).click();
    await expect(page.locator('.is-bugged')).toHaveCount(0);
    await expect(page.locator('.hint')).toHaveCount(0);
    await expect(page.locator('img[data-bug="image"]')).toHaveAttribute('src', 'images/luup-home.png');
    await expect(page.locator('.when', { hasText: '2091' })).toHaveCount(0);
  });

  test('the hint highlights a bug that is still there', async ({ page }) => {
    await start(page);
    await page.locator('#hunt-hint').click();
    await expect(page.locator('.is-bugged.hint')).toHaveCount(1);
    const hinted = await page.locator('.is-bugged.hint').getAttribute('data-bug');
    await page.locator(`[data-bug="${hinted}"]`).click();
    await expect(page.locator('#hunt-count')).toHaveText('1/5 filed');
  });

  test('bugs glow as the mouse gets closer', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await start(page);
    const box = await page.locator('#sum').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => page.locator('#sum').evaluate((el) => el.style.getPropertyValue('--warm'))).toBe('100%');
    await page.mouse.move(2, 880);
    await expect.poll(() => page.locator('#sum').evaluate((el) => parseInt(el.style.getPropertyValue('--warm'), 10))).toBeLessThan(100);
  });

  test('a keyboard user can file a bug with Enter', async ({ page }) => {
    await start(page);
    await page.locator('#sum').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#hunt-count')).toHaveText('1/5 filed');
  });

  test('the page still fits a phone while bugs are planted', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await start(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});

test('experience opens a role to show its test cases', async ({ page }) => {
  const second = page.locator('.role-d', { hasText: 'Functional Test Analyst' });
  await expect(second).not.toHaveAttribute('open', '');
  await second.locator('summary').click();
  await expect(second.getByText('Ran exploratory and regression testing')).toBeVisible();
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
  expect(lines.join(' ')).toContain('replaces repetitive manual work with scripts and automated tests');
  expect(lines.join(' ')).not.toMatch(/7 working days|7 days/);
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

test('What I do adds new facts, and the 7 days stays with the For-Sight project', async ({ page }) => {
  const about = await page.locator('#about').innerText();
  expect(about).not.toMatch(/seven working days|7 working days/);
  expect(about).toContain('Cypress tests that run in CI/CD');
  await expect(page.locator('#exp-qa')).toContainText('saved the business 7 working days a year');
});

test('Beyond testing no longer links to the old Wix site', async ({ page }) => {
  const html = await page.locator('#beyond').innerHTML();
  expect(html).not.toContain('wixsite.com');
});

test('role recaps are written as sentences, not lowercase fragments', async ({ page }) => {
  const items = await page.locator('.cases li').allTextContents();
  expect(items.length).toBeGreaterThan(15);
  for (const text of items) {
    expect(text, text).toMatch(/^[A-Z]/);
    expect(text, text).toMatch(/\.$/);
  }
});

test('past roles are in the past tense', async ({ page }) => {
  const qa = (await page.locator('.role-d', { hasText: 'Sep 2022 to Jul 2025' }).locator('.cases').textContent()).trim();
  expect(qa).toMatch(/^Built and maintained/);
  expect(qa).not.toMatch(/\b(designs|builds|oversees|onboards)\b/);
});

test('the colour scheme is blue and gold, not the Luup green', async ({ page }) => {
  const hero = await page.locator('.hero').evaluate((el) => getComputedStyle(el).backgroundColor);
  const [r, g, b] = hero.match(/\d+/g).map(Number);
  expect(b).toBeGreaterThan(g);
  expect(b).toBeGreaterThan(r);
  const ticker = await page.locator('.ticker').evaluate((el) => getComputedStyle(el).backgroundColor);
  const [tr, tg, tb] = ticker.match(/\d+/g).map(Number);
  expect(tb).toBeGreaterThan(tg);
  expect(tb).toBeGreaterThan(tr);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#050A1E');
});

test('the summary line stays visible after its bug is filed', async ({ page }) => {
  await page.waitForTimeout(3300); // let the intro animation finish
  await page.getByRole('button', { name: 'Start bug hunt' }).click();
  await page.locator('#sum').click();
  await page.waitForTimeout(2000); // after the fixed flash has ended, when a restarted fade-in would be hiding it
  await expect(page.locator('#sum')).toHaveText('4 passed, 0 failed');
  // read once, without retrying, so a line that comes back later still fails
  const opacity = await page.locator('#sum').evaluate((el) => getComputedStyle(el).opacity);
  expect(opacity).toBe('1');
});

test('JavaScript is listed with the tools and in the skills ticker', async ({ page }) => {
  await expect(page.locator('#tools .chips').first().locator('li', { hasText: /^JavaScript$/ })).toHaveCount(1);
  const tools = await page.locator('#tools .chips').first().textContent();
  expect(tools).not.toMatch(/Danish|French|German|Luxembourgish|English/);
  expect(await page.locator('.ticker-track span', { hasText: /^JavaScript$/ }).count()).toBeGreaterThanOrEqual(1);
});

test.describe('contact', () => {
  test('Email is a link in the same row as LinkedIn and GitHub', async ({ page }) => {
    const row = page.locator('#contact .lede');
    await expect(row.getByRole('link')).toHaveText(['Email', 'LinkedIn', 'GitHub']);
    await expect(row.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:stenersenerik@yahoo.com');
  });

  test('there are no extra contact buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Copy address' })).toHaveCount(0);
    await expect(page.locator('#email-copy, #email-note, .contact-actions')).toHaveCount(0);
  });

  test('the address is not in the raw page source for scrapers', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).not.toContain('stenersenerik');
    expect(html).not.toContain('yahoo.com');
  });

  test('the palette has an email command', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.locator('#palette-input').fill('email');
    await expect(page.locator('#palette-list li').first()).toContainText('Email me');
  });

  test('the email link can be reached from the keyboard', async ({ page }) => {
    await page.locator('#email-link').focus();
    await expect(page.locator('#email-link')).toBeFocused();
  });
});

test('the Wookie Productions card is black and white with a red watch button', async ({ page }) => {
  const card = page.locator('.card-music');
  expect(await card.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(15, 15, 15)');
  expect(await card.locator('h3').evaluate((el) => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
  const watch = card.getByRole('link', { name: 'Watch on YouTube' });
  await expect(watch).toHaveAttribute('href', 'https://www.youtube.com/user/WookiePr0ductions/');
  expect(await watch.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(215, 0, 0)');
});

test('the B2C app work is described as stewardship, as on LinkedIn', async ({ page }) => {
  const text = await page.locator('body').textContent();
  expect(text).not.toMatch(/took charge/i);
  await expect(page.locator('.role-d', { hasText: 'Sep 2022 to Jul 2025' })).toContainText('Acted as steward of the Salonkee B2C app project');
  await expect(page.locator('#about')).toContainText('kept the B2C app launch moving');
});
