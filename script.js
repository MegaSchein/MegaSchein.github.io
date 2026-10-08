(() => {
  /* ---------- bug hunt ---------- */
  const bugs = [...document.querySelectorAll('[data-bug]')];
  const toggle = document.getElementById('hunt-toggle');
  const hintBtn = document.getElementById('hunt-hint');
  const count = document.getElementById('hunt-count');
  const tickets = document.getElementById('hunt-tickets');
  const win = document.getElementById('hunt-win');
  const huntBar = document.querySelector('.hunt-bar');
  const found = new Set();
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hunting = false;
  const run = document.querySelector('.run');
  // once the intro has played, the lines no longer depend on its animation
  setTimeout(() => run.classList.add('settled'), 3200);

  const TICKETS = {
    count: { id: 'BUG-101', title: 'Test summary says undefined and NaN', sev: 'high' },
    typo: { id: 'BUG-102', title: 'Typo in the very first sentence', sev: 'low' },
    date: { id: 'BUG-103', title: 'A job that starts in the year 2091', sev: 'medium' },
    name: { id: 'BUG-104', title: 'My name is crooked', sev: 'cosmetic' },
    image: { id: 'BUG-105', title: 'The Luup screenshot failed to load', sev: 'high' },
  };

  const plant = (bug) => {
    bug.classList.add('is-bugged');
    if (bug.dataset.bugged !== undefined) { bug.dataset.clean = bug.textContent; bug.textContent = bug.dataset.bugged; }
    if (bug.dataset.buggedSrc) { bug.dataset.cleanSrc = bug.getAttribute('src'); bug.setAttribute('src', bug.dataset.buggedSrc); }
    bug.tabIndex = 0;
  };

  const repair = (bug) => {
    bug.classList.remove('is-bugged', 'hint');
    bug.style.removeProperty('--warm');
    if (bug.dataset.clean !== undefined) { bug.textContent = bug.dataset.clean; delete bug.dataset.clean; }
    if (bug.dataset.cleanSrc) { bug.setAttribute('src', bug.dataset.cleanSrc); delete bug.dataset.cleanSrc; }
    bug.removeAttribute('tabindex');
  };

  const addTicket = (key) => {
    const t = TICKETS[key];
    const li = document.createElement('li');
    const parts = [['t-id', t.id], ['t-title', t.title], [`t-sev sev-${t.sev}`, t.sev], ['t-fixed', 'fixed']];
    for (const [cls, text] of parts) {
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = text;
      li.append(span);
    }
    tickets.append(li);
  };

  const render = () => {
    const all = found.size === bugs.length;
    count.textContent = `${found.size}/${bugs.length} filed`;
    win.hidden = !all;
    hintBtn.hidden = !hunting || all;
    huntBar.classList.toggle('won', all);
  };

  const file = (bug) => {
    if (!hunting || found.has(bug.dataset.bug)) return;
    found.add(bug.dataset.bug);
    repair(bug);
    bug.classList.add('fixed');
    setTimeout(() => bug.classList.remove('fixed'), 1400);
    addTicket(bug.dataset.bug);
    render();
  };

  const start = () => {
    hunting = true;
    run.classList.add('settled');
    document.body.classList.add('hunt');
    bugs.forEach(plant);
    toggle.textContent = 'Stop and reset';
    toggle.setAttribute('aria-pressed', 'true');
    count.hidden = false;
    render();
  };

  const stop = () => {
    hunting = false;
    document.body.classList.remove('hunt');
    bugs.forEach((bug) => { repair(bug); bug.classList.remove('fixed'); });
    found.clear();
    tickets.replaceChildren();
    toggle.textContent = 'Start bug hunt';
    toggle.setAttribute('aria-pressed', 'false');
    count.hidden = true;
    win.hidden = true;
    hintBtn.hidden = true;
    huntBar.classList.remove('won');
  };

  const hint = () => {
    const left = bugs.filter((b) => !found.has(b.dataset.bug));
    if (!left.length) return;
    const mid = innerHeight / 2;
    left.sort((a, b) => Math.abs(a.getBoundingClientRect().top - mid) - Math.abs(b.getBoundingClientRect().top - mid));
    const target = left[0];
    target.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
    target.classList.add('hint');
    setTimeout(() => target.classList.remove('hint'), 3200);
  };

  toggle.addEventListener('click', () => (hunting ? stop() : start()));
  hintBtn.addEventListener('click', hint);

  document.addEventListener('click', (e) => {
    const bug = e.target.closest('[data-bug]');
    if (!bug) return;
    if (hunting && !found.has(bug.dataset.bug) && bug.closest('summary')) e.preventDefault();
    file(bug);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const bug = e.target.closest && e.target.closest('[data-bug]');
    if (bug && hunting) { e.preventDefault(); file(bug); }
  });

  /* warmer / colder: bugs glow as the mouse gets close */
  let warmQueued = false;
  let pointerX = 0;
  let pointerY = 0;
  document.addEventListener('pointermove', (e) => {
    if (!hunting || e.pointerType === 'touch') return;
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (warmQueued) return;
    warmQueued = true;
    requestAnimationFrame(() => {
      warmQueued = false;
      for (const bug of bugs) {
        if (found.has(bug.dataset.bug)) continue;
        const r = bug.getBoundingClientRect();
        const dx = Math.max(r.left - pointerX, 0, pointerX - r.right);
        const dy = Math.max(r.top - pointerY, 0, pointerY - r.bottom);
        const warmth = Math.max(0, 1 - Math.hypot(dx, dy) / 240);
        bug.style.setProperty('--warm', `${Math.round(warmth * 100)}%`);
      }
    });
  }, { passive: true });

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const isDark = () =>
    root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const toggleTheme = () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
  };
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  /* ---------- run bar ---------- */
  const fill = document.getElementById('progress-fill');
  const suite = document.getElementById('suite');
  const sections = [...document.querySelectorAll('[data-suite]')];
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 1;
    fill.style.transform = `scaleX(${pct})`;
    let current = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.4) current = s;
    suite.textContent = `suite: ${current.dataset.suite} ${Math.round(pct * 100)}%`;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();

  /* ---------- contact ---------- */
  // The address is put together here, so it never sits in the page source for scrapers to harvest.
  const mailAddress = ['stenersenerik', 'yahoo.com'].join('@');
  const emailLink = document.getElementById('email-link');
  emailLink.href = `mailto:${mailAddress}`;
  document.getElementById('email-wrap').hidden = false;

  /* ---------- command palette ---------- */
  const dialog = document.getElementById('palette');
  const input = document.getElementById('palette-input');
  const list = document.getElementById('palette-list');
  const go = (id) => () => document.getElementById(id).scrollIntoView();
  const commands = [
    { label: 'Go to: what I do', run: go('about') },
    { label: 'Go to: Luup', run: go('luup') },
    { label: 'Go to: experience', run: go('experience') },
    { label: 'Go to: beyond testing', run: go('beyond') },
    { label: 'Go to: tools', run: go('tools') },
    { label: 'Go to: contact', run: go('contact') },
    { label: 'Start or stop the bug hunt', run: () => toggle.click() },
    { label: 'Switch theme', run: toggleTheme },
    { label: 'Email me', run: () => { location.href = emailLink.href; } },
    { label: 'Open LinkedIn', run: () => open('https://www.linkedin.com/in/stenersen/', '_blank', 'noopener') },
    { label: 'Open GitHub', run: () => open('https://github.com/MegaSchein', '_blank', 'noopener') },
    { label: 'Open luup.lu', run: () => open('https://luup.lu', '_blank', 'noopener') },
  ];
  let shown = commands;
  let active = 0;

  const draw = () => {
    list.replaceChildren();
    if (!shown.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No match. Try "luup" or "theme".';
      list.append(li);
      return;
    }
    shown.forEach((c, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      li.textContent = c.label;
      li.addEventListener('click', () => choose(i));
      list.append(li);
    });
  };
  const choose = (i) => {
    const c = shown[i];
    if (!c) return;
    dialog.close();
    c.run();
  };
  const openPalette = () => {
    input.value = '';
    shown = commands;
    active = 0;
    draw();
    dialog.showModal();
    input.focus();
  };

  document.getElementById('palette-open').addEventListener('click', openPalette);
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      dialog.open ? dialog.close() : openPalette();
    }
  });
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    shown = commands.filter((c) => c.label.toLowerCase().includes(q));
    active = 0;
    draw();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(shown.length - 1, active + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  /* ---------- photo carousel ---------- */
  const track = document.getElementById('car-track');
  const slides = [...track.querySelectorAll('.slide')];
  const countEl = document.getElementById('car-count');
  const playBtn = document.getElementById('car-play');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = Math.floor(Math.random() * slides.length);
  let userPaused = reduceMotion;
  let hovering = false;
  let timer = null;
  let animatingUntil = 0;

  const showCount = () => { countEl.textContent = `${index + 1} of ${slides.length}`; };
  const goTo = (n, smooth = true) => {
    index = (n + slides.length) % slides.length;
    const s = slides[index];
    animatingUntil = Date.now() + 900;
    track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.clientWidth) / 2, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
    showCount();
  };
  const stopTimer = () => { clearInterval(timer); timer = null; };
  const startTimer = () => {
    stopTimer();
    if (!userPaused && !hovering && !document.hidden) timer = setInterval(() => goTo(index + 1), 5000);
  };

  document.getElementById('car-prev').addEventListener('click', () => { goTo(index - 1); startTimer(); });
  document.getElementById('car-next').addEventListener('click', () => { goTo(index + 1); startTimer(); });
  playBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    playBtn.textContent = userPaused ? 'Play' : 'Pause';
    playBtn.setAttribute('aria-label', userPaused ? 'Start the slideshow' : 'Pause the slideshow');
    startTimer();
  });
  const carousel = document.getElementById('carousel');
  carousel.addEventListener('mouseenter', () => { hovering = true; stopTimer(); });
  carousel.addEventListener('mouseleave', () => { hovering = false; startTimer(); });
  carousel.addEventListener('focusin', () => { hovering = true; stopTimer(); });
  carousel.addEventListener('focusout', () => { hovering = false; startTimer(); });
  document.addEventListener('visibilitychange', startTimer);
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
  });
  let settle;
  track.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      if (Date.now() < animatingUntil) return;
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      slides.forEach((s, i) => { if (Math.abs(s.offsetLeft + s.clientWidth / 2 - mid) < Math.abs(slides[best].offsetLeft + slides[best].clientWidth / 2 - mid)) best = i; });
      index = best;
      showCount();
    }, 120);
  }, { passive: true });
  playBtn.textContent = userPaused ? 'Play' : 'Pause';
  playBtn.setAttribute('aria-label', userPaused ? 'Start the slideshow' : 'Pause the slideshow');
  goTo(index, false);
  startTimer();
})();
