// Systems page: the hub diagram. "separate systems" scatters the nodes with
// dashed manual links; "Integrated" pulls them into a ring around the cloud hub.
(function () {
  const root = document.querySelector('[data-page]');
  const D = root.querySelector('[data-diag]');
  const hub = D.querySelector('[data-hub]');
  const nodes = Array.from(D.querySelectorAll('[data-node]'));
  const wires = Array.from(D.querySelectorAll('[data-wire]'));
  const buttons = Array.from(root.querySelectorAll('[data-mode]'));
  let after = false, pos = null, hubA = 0;

  buttons.forEach(b => b.addEventListener('click', () => {
    after = b.dataset.mode === '1';
    buttons.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
  }));

  const wide = [[0.12, 0.18], [0.48, 0.1], [0.86, 0.22], [0.2, 0.78], [0.58, 0.62], [0.88, 0.82]];
  // Narrow stages: two staggered columns so the wrapped labels do not overlap.
  const narrow = [[0.26, 0.1], [0.74, 0.25], [0.28, 0.42], [0.72, 0.58], [0.26, 0.75], [0.74, 0.9]];
  let before = wide;
  // Before: wire i is a manual copy between nodes a and b.
  const manual = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 2], [4, 5]];

  function diagram(S, { k, s }) {
    const W = D.offsetWidth, H = D.offsetHeight;
    before = W < 520 ? narrow : wide;
    const N = before.length;
    const cx = W / 2, cy = H / 2, R = Math.min(W * 0.4, H * 0.4);
    if (!pos) pos = before.map(([x, y]) => ({ x: x * W, y: y * H }));
    hubA += ((after ? 1 : 0) - hubA) * 0.08;
    hub.style.transform = `translate3d(${cx + S.mx * 12 * k}px, ${cy + S.my * 12 * k}px, 0) scale(${hubA})`;
    hub.style.opacity = hubA;
    nodes.forEach(el => {
      const i = +el.dataset.node, a = (i / N) * Math.PI * 2 - Math.PI / 2;
      // Keep each label inside the stage so narrow screens do not clip it.
      const hw = el.offsetWidth / 2 + 4, hh = el.offsetHeight / 2 + 4;
      let tx = after ? cx + Math.cos(a) * R * 1.15 : before[i][0] * W;
      let ty = after ? cy + Math.sin(a) * R : before[i][1] * H;
      tx = Math.min(W - hw, Math.max(hw, tx)); ty = Math.min(H - hh, Math.max(hh, ty));
      const P = pos[i]; P.x += (tx - P.x) * 0.07; P.y += (ty - P.y) * 0.07;
      const bx = Math.sin(s * 0.8 + i * 1.3) * (after ? 4 : 12) * k, by = Math.cos(s * 0.7 + i) * (after ? 4 : 12) * k;
      P.rx = P.x + bx + S.mx * (8 + i * 3) * k; P.ry = P.y + by + S.my * (8 + i * 2) * k;
      el.style.left = P.rx + 'px'; el.style.top = P.ry + 'px';
      el.style.rotate = `${after ? 0 : ((i % 3) - 1) * 3}deg`;
    });
    wires.forEach(l => {
      const i = +l.dataset.wire, P = pos[i]; if (!P || P.rx == null) return;
      let x1, y1, x2, y2;
      if (after) { x1 = P.rx; y1 = P.ry; x2 = cx + S.mx * 12 * k; y2 = cy + S.my * 12 * k; }
      else { const [a, b] = manual[i], A = pos[a], Q = pos[b]; x1 = A.rx; y1 = A.ry; x2 = Q.rx; y2 = Q.ry; }
      l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('stroke', after ? 'var(--color-accent)' : 'var(--color-accent-2)');
      l.setAttribute('stroke-dasharray', after ? 'none' : '5 6');
      const c = D.querySelector(`[data-pulse="${i}"]`), f = (s * 0.5 + i * 0.17) % 1;
      c.setAttribute('cx', x1 + (x2 - x1) * f); c.setAttribute('cy', y1 + (y2 - y1) * f);
      c.setAttribute('opacity', hubA);
    });
  }

  TLMotion.start(root, { motion: () => 1, cursor: true, onFrame: diagram });
})();
