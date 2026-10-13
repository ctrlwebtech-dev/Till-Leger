// Customise page: the risk chart grows as it scrolls in, table meters fill row
// by row, packets travel along the API links, and the SDLC phases tick off as
// they pass the middle of the screen. motion.js drives everything else.
(function () {
  const root = document.querySelector('[data-page]');
  const chart = root.querySelector('[data-spectrum]');
  const rows = Array.from(root.querySelectorAll('.tailor tbody tr'));
  const pkts = Array.from(root.querySelectorAll('[data-pkt]'));
  const phases = Array.from(root.querySelectorAll('[data-phase]'));
  const segs = Array.from(root.querySelectorAll('.progress i'));

  chart.style.setProperty('--p', 0);

  function frame(S, { cl, ease, k, s }) {
    const H = innerHeight;
    const r = chart.querySelector('.chart').getBoundingClientRect();
    chart.style.setProperty('--p', ease(cl((H * 0.95 - r.top) / (H * 0.5))).toFixed(3));

    rows.forEach(tr => { tr.classList.toggle('on', tr.getBoundingClientRect().top < H * 0.88); });

    // Reduced motion slows the packets rather than stopping them.
    pkts.forEach((el, i) => {
      const dir = +el.dataset.pkt, f = ((s * 0.28 * (0.3 + 0.7 * k) + i * 0.33) % 1);
      el.style.left = ((dir > 0 ? f : 1 - f) * 100).toFixed(2) + '%';
    });

    let done = 0;
    phases.forEach(li => {
      const on = li.getBoundingClientRect().top < H * 0.6;
      li.classList.toggle('done', on);
      if (on) done++;
    });
    segs.forEach((el, i) => el.classList.toggle('on', i < done));
  }

  TLMotion.start(root, { motion: () => 1, cursor: true, onFrame: frame });
})();
