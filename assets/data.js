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
  const chipPos = vals.map(() => {
    const sx = -0.25 + rnd() * 1.3, sy = -0.15 + rnd() * 1.2, tx = 0.12 + rnd() * 0.68, ty = 0.8 + rnd() * 0.12;
    return { sx, sy, tx, ty };
  });
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
  const narrow = window.matchMedia('(max-width: 760px)');

  function pyramid(S, { cl, ease, k, s }) {
    const pin = S.pins.dikw; if (!pin) return;
    const pp = pin.pp, W = pyr.offsetWidth, Hh = pyr.offsetHeight;
    pyr.style.transform = `rotateX(${(8 + S.my * -10) * k}deg) rotateY(${S.mx * 16 * k}deg)`;
    const r = 50 + S.mx * 18 * k, gap = (3 + (S.my + 1) * 5) * k;
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
    });
    const conv = ease(cl((pp - 0.6) * 1.1));
    chips.forEach(el => {
      const i = +el.dataset.chip, c = chipPos[i];
      const bob = Math.sin(s * (0.8 + (i % 5) * 0.13) + i) * 14 * k;
      let x = (c.sx + (c.tx - c.sx) * conv) * W + S.mx * (20 + (i % 4) * 14) * k;
      let y = (c.sy + (c.ty - c.sy) * conv) * Hh + bob * (1 - conv) + S.my * (16 + (i % 3) * 10) * k;
      // On phones keep each chip inside the clipped scene so no word is cut.
      if (narrow.matches) {
        const lo = 4 - pyr.offsetLeft, hi = scene.clientWidth - pyr.offsetLeft - el.offsetWidth - 4;
        x = Math.max(lo, Math.min(hi, x));
        y = Math.max(4 - pyr.offsetTop, Math.min(scene.clientHeight - pyr.offsetTop - el.offsetHeight - 4, y));
      }
      el.style.opacity = Math.min(cl(pin.p * 12 + 0.6), 1 - conv);
      el.style.transform = `translate3d(${x}px, ${y}px, 40px) rotate(${(1 - conv) * ((i % 7) - 3) * 4}deg) scale(${1 - conv * 0.4})`;
    });
    valbar.style.transform = `scaleY(${cl((pp - 0.5) / 4)})`;
  }

  TLMotion.start(root, { motion: () => 1, cursor: true, onFrame: pyramid });
})();
