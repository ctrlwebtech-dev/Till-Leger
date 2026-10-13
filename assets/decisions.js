// Decisions page: the ladder numeral follows the pinned tier, the DSS inputs
// drift toward the hub as the section scrolls in, and Choice C lights up once
// Step 3 is on screen. motion.js drives everything else.
(function () {
  const root = document.querySelector('[data-page]');
  const nums = Array.from(root.querySelectorAll('[data-num]'));
  const sec = root.querySelector('[data-converge]');
  const dss = sec.querySelector('[data-dss]');
  const srcs = Array.from(sec.querySelectorAll('[data-src]'));
  const pickStep = root.querySelector('[data-picks]');
  const pickCard = root.querySelector('[data-choice="' + pickStep.dataset.picks + '"]');

  function onStep(id, idx) {
    if (id === 'ladder') nums.forEach(el => { el.textContent = String(idx + 1); });
  }

  function converge(S, { cl, ease, k, s }) {
    const r = sec.getBoundingClientRect(), H = innerHeight, p = ease(cl((H * 0.75 - r.top) / (H * 0.7)));
    // Stacked on phones, so the pull is mostly vertical; keep it small there.
    const amt = innerWidth <= 760 ? 0.3 : 1;
    const d = dss.getBoundingClientRect(), cx = d.left + d.width / 2, cy = d.top + d.height / 2;
    srcs.forEach((el, i) => {
      el.style.transform = 'none';
      const b = el.getBoundingClientRect(), dx = cx - (b.left + b.width / 2), dy = cy - (b.top + b.height / 2);
      const pull = 0.5 - 0.5 * Math.cos(s * 0.9 + i * 0.8);
      const f = ((1 - p) * -0.25 + p * 0.18 * pull) * amt;
      el.style.transform = `translate3d(${dx * f + Math.sin(s + i) * 6 * k}px, ${dy * f + Math.cos(s * 0.8 + i) * 8 * k}px, 0)`;
      el.style.opacity = 0.2 + 0.8 * p;
    });
    dss.style.transform = `scale(${0.7 + 0.3 * p + Math.sin(s * 1.8) * 0.02 * k}) translate3d(${S.mx * 10 * k}px, ${S.my * 10 * k}px, 0)`;

    const top = pickStep.getBoundingClientRect().top;
    pickCard.classList.toggle('picked', top < H * 0.7);
  }

  TLMotion.start(root, { motion: () => 1, cursor: true, onStep, onFrame: converge });
})();
