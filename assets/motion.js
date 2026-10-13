(function () {
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = x => 1 - Math.pow(1 - x, 4);
  function start(root, opt = {}) {
    const S = { mx: 0, my: 0, tx: 0, ty: 0, px: innerWidth / 2, py: innerHeight / 2, cx: innerWidth / 2, cy: innerHeight / 2, vx: 0, sy: scrollY, t0: performance.now(), over: false, big: 0, pins: {} };
    const k0 = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.2 : 1;
    const mv = e => { S.tx = e.clientX / innerWidth * 2 - 1; S.ty = e.clientY / innerHeight * 2 - 1; S.px = e.clientX; S.py = e.clientY; S.over = !!(e.target.closest && e.target.closest('a,button,[data-hover]')); };
    addEventListener('pointermove', mv);
    let cur = null;
    if (opt.cursor !== false && matchMedia('(pointer:fine)').matches) {
      cur = document.createElement('div');
      cur.style.cssText = 'position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border:1.5px solid var(--color-text);border-radius:50%;pointer-events:none;z-index:90;mix-blend-mode:multiply';
      document.body.appendChild(cur);
    }
    const q = s => Array.from(root.querySelectorAll(s));
    let E = null, frame = 0, raf;
    const cache = () => { E = { depth: q('[data-depth]'), reveal: q('[data-reveal]'), pins: q('[data-pin]'), magnet: q('[data-magnet]'), bars: q('[data-bar]'), lines: q('[data-line]') }; };
    function tick(t) {
      raf = requestAnimationFrame(tick);
      if (frame++ % 30 === 0) cache();
      const k = (opt.motion ? opt.motion() : 1) * k0, H = innerHeight, s = t / 1000;
      S.mx += (S.tx - S.mx) * 0.06; S.my += (S.ty - S.my) * 0.06;
      const ox = S.cx; S.cx += (S.px - S.cx) * 0.16; S.cy += (S.py - S.cy) * 0.16; S.vx += ((S.cx - ox) - S.vx) * 0.2;
      S.sy += (scrollY - S.sy) * 0.1;
      root.style.setProperty('--press-nx', S.mx.toFixed(3)); root.style.setProperty('--press-ny', S.my.toFixed(3));
      E.depth.forEach((el, i) => {
        const d = +el.dataset.depth || 0, r = +el.dataset.rot || 0, sp = +el.dataset.speed || 0, ph = i * 1.7;
        const bx = Math.cos(s * (0.5 + d * 0.12) + ph) * 6 * k, by = Math.sin(s * (0.7 + d * 0.15) + ph) * 12 * k;
        const intro = ease(cl((t - S.t0 - 400 - i * 100) / 1400));
        el.style.transform = `translate3d(${S.mx * d * 38 * k + bx}px, ${S.my * d * 30 * k + by - S.sy * sp * k + (1 - intro) * 140}px, 0) rotate(${r * (0.4 + 0.6 * intro) + S.mx * d * 5 * k + Math.sin(s * 0.6 + ph) * 2.5 * k}deg)`;
        el.style.opacity = intro;
      });
      E.lines.forEach((el, i) => {
        const p = ease(cl((t - S.t0 - 150 - i * 160) / 1100));
        el.style.transform = `translate3d(${(i % 2 ? 1 : -1) * S.sy * 0.3 * k}px, ${(1 - p) * 105}%, 0) skewY(${(1 - p) * 6}deg)`;
      });
      E.reveal.forEach(el => {
        const top = el.getBoundingClientRect().top, p = ease(cl((H * 0.95 - top) / (H * 0.28)));
        el.style.opacity = p; el.style.transform = `translate3d(0, ${(1 - p) * 48}px, 0)`;
      });
      E.bars.forEach((el, i) => {
        const top = el.parentElement.getBoundingClientRect().top, p = ease(cl((H * 0.9 - top) / (H * 0.35) - (i % 12) * 0.04));
        el.style.transform = `scaleY(${p * (+el.dataset.bar || 0)})`;
      });
      E.pins.forEach(pin => {
        const rc = pin.getBoundingClientRect(), n = +pin.dataset.pin || 1, p = cl(-rc.top / (rc.height - H)), pp = cl(p * n, 0.5, n - 0.5);
        pin.querySelectorAll('[data-step]').forEach(el => {
          const dist = pp - (+el.dataset.step) - 0.5, v = cl(1 - Math.abs(dist) * 1.8);
          el.style.opacity = v; el.style.transform = `translate3d(0, ${-dist * 90}px, 0)`; el.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
        });
        pin.querySelectorAll('[data-rung]').forEach(el => { el.style.transform = `scaleX(${cl(pp + 0.5 - (+el.dataset.rung))})`; });
        const idx = Math.min(n - 1, Math.floor(pp)), prev = S.pins[pin.id];
        S.pins[pin.id] = { p, pp, idx, rc };
        if (opt.onStep && (!prev || prev.idx !== idx)) opt.onStep(pin.id, idx);
      });
      E.magnet.forEach(el => {
        const b = el.getBoundingClientRect(), ox2 = el._ox || 0, oy2 = el._oy || 0;
        const dx = S.px - (b.left - ox2 + b.width / 2), dy = S.py - (b.top - oy2 + b.height / 2), near = Math.hypot(dx, dy) < 110;
        el._ox = ox2 + ((near ? dx * 0.35 * k : 0) - ox2) * 0.15; el._oy = oy2 + ((near ? dy * 0.35 * k : 0) - oy2) * 0.15;
        el.style.transform = `translate3d(${el._ox}px, ${el._oy}px, 0)`;
      });
      if (cur) {
        S.big += ((S.over ? 1 : 0) - S.big) * 0.15;
        cur.style.transform = `translate3d(${S.cx}px, ${S.cy}px, 0) scale(${1 + S.big * 1.3})`;
        cur.style.background = `color-mix(in srgb, var(--color-accent-300) ${Math.round(S.big * 60)}%, transparent)`;
      }
      if (opt.onFrame) opt.onFrame(S, { cl, ease, k, t, s });
    }
    cache();
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); removeEventListener('pointermove', mv); if (cur) cur.remove(); };
  }
  window.TLMotion = { start, cl, ease };
})();
