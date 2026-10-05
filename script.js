(() => {
  /* ---------- bug hunt ---------- */
  const bugs = [...document.querySelectorAll('[data-bug]')];
  const toggle = document.getElementById('hunt-toggle');
  const count = document.getElementById('hunt-count');
  const win = document.getElementById('hunt-win');
  const found = new Set();
  let hunting = false;

  const render = () => {
    count.textContent = `${found.size}/${bugs.length} filed`;
    win.hidden = found.size !== bugs.length;
  };

  const file = (bug) => {
    if (!hunting || found.has(bug.dataset.bug)) return;
    found.add(bug.dataset.bug);
    bug.classList.add('filed');
    render();
  };

  const start = () => {
    hunting = true;
    document.body.classList.add('hunt');
    bugs.forEach((bug) => {
      if (bug.dataset.bugged) {
        bug.dataset.clean = bug.textContent;
        bug.textContent = bug.dataset.bugged;
      }
      if (!bug.matches('details')) bug.tabIndex = 0;
    });
    toggle.textContent = 'Stop and reset';
    toggle.setAttribute('aria-pressed', 'true');
    count.hidden = false;
    render();
  };

  const stop = () => {
    hunting = false;
    document.body.classList.remove('hunt');
    bugs.forEach((bug) => {
      if (bug.dataset.clean) {
        bug.textContent = bug.dataset.clean;
        delete bug.dataset.clean;
      }
      bug.classList.remove('filed');
      bug.removeAttribute('tabindex');
    });
    found.clear();
    toggle.textContent = 'Start bug hunt';
    toggle.setAttribute('aria-pressed', 'false');
    count.hidden = true;
    win.hidden = true;
  };

  toggle.addEventListener('click', () => (hunting ? stop() : start()));
  document.addEventListener('click', (e) => {
    const bug = e.target.closest('[data-bug]');
    if (bug) file(bug);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const bug = e.target.closest && e.target.closest('[data-bug]');
    if (bug) file(bug);
  });

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
})();
