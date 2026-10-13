// Data page: the DIKW pyramid that builds itself as the reader scrolls the
// pinned section. motion.js drives everything else on the page.
(function () {
  const root = document.querySelector('[data-page]');
  const pyr = root.querySelector('[data-pyr]');

  // Loose field names from the ERD drift in, then sink into the Data layer.
  // Seeded so the scatter is the same on every load.
  const vals = ['customer_id', 'sale_id', 'total_amount', 'payment_method', 'loyalty_points', 'sale_datetime', 'product_id', 'full_name', 'email', 'phone', 'category', 'product_name', 'marketing_consent', 'Line_id', 'PK', 'FK', 'unit price', 'stock on hand', 'reorder level', 'CUSTOMER'];
  const keys = new Set(['PK', 'FK', 'customer_id', 'sale_id']);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Start points sit on a loose grid across the scene (see pyramid()), with a
  // little jitter so the names do not read as a table.
  const chipPos = vals.map(() => ({ jx: rnd(), jy: rnd(), tx: 0.12 + rnd() * 0.68, ty: 0.8 + rnd() * 0.12 }));
  vals.forEach((v, i) => {
    const el = document.createElement('span');
    el.className = keys.has(v) ? 'chip key' : 'chip';
    el.dataset.chip = i;
    el.textContent = v;
    pyr.appendChild(el);
  });

  const layers = Array.from(root.querySelectorAll('[data-layer]'));
  const chips = Array.from(root.querySelectorAll('[data-chip]'));
  const valbar = root.querySelector('[data-valbar]');
  const scene = pyr.parentElement;
  const narrow = window.matchMedia('(max-width: 760px), (max-width: 1024px) and (orientation: portrait)');
  const stepsCol = root.querySelector('.dikw .steps');
  const nav = document.querySelector('.site-nav');
  const segs = Array.from(root.querySelectorAll('.dikw .progress i'));

  // Quality criteria: each group's card lights its cells of the seven-cell
  // strip as it scrolls into view, and the side strip collects them.
  const cards = Array.from(root.querySelectorAll('.quality .test'));
  const sideCells = Array.from(root.querySelectorAll('.quality .seven.big i'));
  function quality() {
    const H = innerHeight, lit = new Set();
    cards.forEach(el => {
      const on = el.getBoundingClientRect().top < H * 0.72;
      el.classList.toggle('on', on);
      if (on) lit.add(el.dataset.g);
    });
    sideCells.forEach(el => el.classList.toggle('on', lit.has(el.dataset.g)));
  }

  function pyramid(S, { cl, ease, k, s }) {
    const pin = S.pins.dikw; if (!pin) return;
    const pp = pin.pp, W = pyr.offsetWidth, Hh = pyr.offsetHeight;
    pyr.style.transform = `rotateX(${(8 + S.my * -10) * k}deg) rotateY(${S.mx * 16 * k}deg)`;
    const r = 50 + S.mx * 18 * k, gap = (1 + (S.my + 1) * 2) * k;
    // Segmented progress under the heading: one segment per level reached.
    segs.forEach((el, i) => el.classList.toggle('on', pp >= i + 1.05));
    // Once the pin lets go, the whole stage dissolves as its text reaches the
    // nav, so the pyramid leaves with the text instead of sliding under the nav.
    const out = pin.rc.bottom < innerHeight
      ? cl((stepsCol.getBoundingClientRect().top - nav.getBoundingClientRect().bottom) / 70) : 1;
    stepsCol.parentElement.style.opacity = out;
    layers.forEach(el => {
      const i = +el.dataset.layer, a = ease(cl((pp - i - 0.7) * 1.5)), active = Math.floor(pp) - 1 === i;
      // ft/fb: half-width of the layer's top and bottom edge; r moves the ridge
      // between the two faces with the pointer.
      const ft = (3 - i) / 4, fb = (4 - i) / 4, rt = 50 + (r - 50) * ft, rb = 50 + (r - 50) * fb;
      const [L, R] = el.querySelectorAll('[data-face]');
      L.style.clipPath = `polygon(${50 - ft * 50}% 0, ${rt}% 0, ${rb}% 100%, ${50 - fb * 50}% 100%)`;
      R.style.clipPath = `polygon(${rt}% 0, ${50 + ft * 50}% 0, ${50 + fb * 50}% 100%, ${rb}% 100%)`;
      el.style.opacity = a;
      el.style.transform = `translate3d(${(1 - a) * (i % 2 ? 120 : -120)}px, ${(1 - a) * -320 - i * gap + Math.sin(s * 0.9 + i) * 3 * k}px, ${active ? 60 : 0}px) rotate(${(1 - a) * (i % 2 ? 14 : -14)}deg)`;
      el.style.filter = pp > 4 || active || a < 1 ? 'none' : 'saturate(.55) brightness(1.04)';
      el.classList.toggle('on', active);
    });
    const conv = ease(cl((pp - 0.6) * 1.1));
    chips.forEach(el => {
      const i = +el.dataset.chip, c = chipPos[i];
      const bob = Math.sin(s * (0.8 + (i % 5) * 0.13) + i) * 14 * k;
      // Start grid: four columns on wide stages, three on small ones, inside the
      // scene and clear of the rail on its left edge.
      const cols = narrow.matches ? 3 : 4, sw = scene.clientWidth, sh = scene.clientHeight;
      const cw = (sw - 24) / cols, col = i % cols, rw = Math.floor(i / cols);
      const sxp = 14 + col * cw + c.jx * Math.max(0, cw - el.offsetWidth - 8) - pyr.offsetLeft;
      const syp = (0.06 + rw * (narrow.matches ? 0.2 : 0.15) + c.jy * 0.03) * sh - pyr.offsetTop;
      const par = narrow.matches ? 0 : (1 - conv);
      let x = sxp + (c.tx * W - sxp) * conv + S.mx * 18 * k * par;
      let y = syp + (c.ty * Hh - syp) * conv + bob * (narrow.matches ? 0.4 : 1) * (1 - conv) + S.my * 14 * k * par;
      // Keep each chip inside the scene, right of the rail, so no word is cut.
      const lo = 12 - pyr.offsetLeft, hi = sw - pyr.offsetLeft - el.offsetWidth - 4;
      x = Math.max(lo, Math.min(hi, x));
      y = Math.max(4 - pyr.offsetTop, Math.min(sh - pyr.offsetTop - el.offsetHeight - 4, y));
      el.style.opacity = Math.min(cl(pin.p * 12 + 0.6), 1 - conv);
      el.style.transform = `translate3d(${x}px, ${y}px, 40px) rotate(${(1 - conv) * ((i % 7) - 3) * 4}deg) scale(${1 - conv * 0.4})`;
    });
    valbar.style.transform = `scaleY(${cl((pp - 0.5) / 4)})`;
  }

  // Pinned text steps, one at a time. motion.js crossfades neighbouring steps
  // at matching opacity, which prints two steps over each other at every
  // boundary. This runs after it each frame and restyles the steps of the two
  // pins on this page: a step is solid for the middle of its stretch, fades out
  // before the boundary, and the next one fades in only after a short blank.
  const pinSteps = {};
  ['dikw', 'erd'].forEach(id => {
    const sec = document.getElementById(id);
    if (sec) pinSteps[id] = Array.from(sec.querySelectorAll('[data-step]'));
  });
  function oneStep(S, { cl }) {
    Object.keys(pinSteps).forEach(id => {
      const pin = S.pins[id], els = pinSteps[id];
      if (!pin || !document.getElementById(id).hasAttribute('data-pin')) return;
      const last = els.reduce((m, el) => Math.max(m, +el.dataset.step), 0);
      els.forEach(el => {
        const st = +el.dataset.step;
        let dist = pin.pp - st - 0.5;
        if (st === last && dist > 0) dist = 0;
        const v = cl((0.44 - Math.abs(dist)) / 0.14);
        el.style.opacity = v.toFixed(3);
        el.style.transform = `translate3d(0, ${(-Math.sign(dist) * (1 - v) * 28).toFixed(1)}px, 0)`;
        el.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
      });
    });
  }

  TLMotion.start(root, { motion: () => 1, cursor: true,
    onFrame: (S, h) => { pyramid(S, h); oneStep(S, h); quality(); if (window.TLErd) TLErd.frame(S, h); },
    onStep: (id, idx) => { if (window.TLErd) TLErd.step(id, idx); } });
})();
