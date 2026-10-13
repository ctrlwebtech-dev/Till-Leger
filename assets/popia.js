// POPIA page: the pinned horizontal track of CIA, AAA and POPIA cards.
// motion.js handles the hero, reveals and the pin progress.
(function () {
  const root = document.querySelector('[data-page]');
  const tr = root.querySelector('[data-htrack]');
  const cards = Array.from(tr.querySelectorAll('[data-hcard]'));
  const items = Array.from(tr.querySelectorAll('.intro, [data-hcard]'));
  const tabs =Array.from(root.querySelectorAll('[data-gtab]'));
  const pbar = root.querySelector('[data-pbar]');
  let hx = 0, group = -1;

  function track(S, { k }) {
    const pin = S.pins.frameworks; if (!pin) return;
    const W = innerWidth, max = Math.max(0, tr.scrollWidth - W);
    hx += (-pin.p * max - hx) * 0.12;
    tr.style.transform = `translate3d(${hx}px,0,0)`;
    // Each card bobs and tilts away from the centre of the screen.
    cards.forEach((el, i) => {
      const b = el.getBoundingClientRect(), c = (b.left + b.width / 2) / W - 0.5;
      el.style.transform = `translate3d(0, ${Math.sin(S.sy * 0.004 + i) * 10 * k + Math.abs(c) * 40 * k}px, 0) rotate(${c * 6 * k}deg)`;
    });
    // Highlight the group whose intro or card sits nearest the centre.
    let best = items[0], bestD = Infinity;
    items.forEach(el => {
      const b = el.getBoundingClientRect(), d = Math.abs((b.left + b.width / 2) / W - 0.5);
      if (d < bestD) { bestD = d; best = el; }
    });
    const g = pin.p <= 0.02 ? 0 : +best.closest('[data-group]').dataset.group;
    if (g !== group) { group = g; tabs.forEach((t, i) => t.classList.toggle('on', i === g)); }
    pbar.style.transform = `scaleX(${pin.p})`;
  }

  TLMotion.start(root, { motion: () => 1, cursor: true, onFrame: track });
})();
