// ERD press run. The group's ERD as four real tables; the three crow's-foot
// connectors are measured from the rows they join, then drawn on as the reader
// scrolls the pinned section. data.js hands motion.js frames and step changes
// in through TLErd.frame and TLErd.step; this file runs no loop of its own
// (the one exception is the short WAAPI dot run on hover).
(function () {
  const sec = document.getElementById('erd');
  if (!sec) return;
  const sheet = sec.querySelector('.sheet'), win = sec.querySelector('.win'), canvas = sec.querySelector('.canvas');
  const svg = sec.querySelector('svg.ink'), stage = sec.querySelector('.stage');
  const NS = 'http://www.w3.org/2000/svg';

  // Reduced motion: drop the pin before data.js starts motion.js, which caches
  // [data-pin] on its first frame. The section then reads as a static figure.
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm) { sec.removeAttribute('data-pin'); sec.classList.add('calm'); }
  const phone = matchMedia('(max-width: 760px)');
  const desk = matchMedia('(min-width: 1024px)');

  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = x => 1 - Math.pow(1 - x, 3);
  const easeIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const backOut = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

  const plate = {};
  sec.querySelectorAll('.plate').forEach(p => { plate[p.dataset.table] = p; });
  const TABLES = Object.keys(plate);
  // Steps follow the bullets: CUSTOMER, SALE, Product, Line_Item.
  const TABLE_STEP = { customer: 1, sale: 2, product: 3, line_item: 4 };
  // Each relation joins a PK row (the one side) to an FK row (the many side).
  const RELS = {
    cs: { pk: 'customer', fk: 'sale', col: 'customer_id', lane: .22, step: 5 },
    sl: { pk: 'sale', fk: 'line_item', col: 'sale_id', lane: .5, step: 6 },
    pl: { pk: 'product', fk: 'line_item', col: 'product_id', lane: .78, step: 7 },
  };
  const LINKS = { customer: ['cs'], sale: ['cs', 'sl'], line_item: ['sl', 'pl'], product: ['pl'] };
  const row = (t, c) => plate[t].querySelector(`tr[data-col="${c}"]`);
  const G = {};
  Object.keys(RELS).forEach(r => {
    const g = svg.querySelector(`g[data-rel="${r}"]`);
    const hd = [0, 1, 2].map(i => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', i ? 'hdot m' : 'hdot'); c.setAttribute('r', '3.5');
      g.appendChild(c); return c;
    });
    G[r] = {
      g, hit: g.querySelector('.hit'), base: g.querySelector('.base'), ghost: g.querySelector('path.ghost'), ink: g.querySelector('path.ink'),
      one: g.querySelector('.one'), bar: g.querySelector('.one line'), prongs: Array.from(g.querySelectorAll('.many line')),
      many: g.querySelector('.many'), dots: Array.from(g.querySelectorAll('circle.dot')), hdots: hd, open: 1,
    };
    G[r].dots.forEach((d, i) => { if (i) d.classList.add('m'); });
  });

  // ---------- Geometry ----------
  // Canvas-local box from offsets, which ignore the transforms (feed, camera,
  // fit) that would skew getBoundingClientRect.
  function off(el) {
    let x = 0, y = 0;
    for (let e = el; e && e !== canvas; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }
  const HOP = 5, R = 6, FOOT = 12, SPREAD = 9;
  // Orthogonal path through pts with rounded corners; hops are x positions on
  // horizontal runs where the line jumps another (drawn as a small arc, up).
  function pathD(pts, hops) {
    const f = n => +n.toFixed(2);
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`, cur = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i], last = i === pts.length - 1;
      const ux = Math.sign(p[0] - cur[0]), uy = Math.sign(p[1] - cur[1]);
      const end = last ? p : [p[0] - ux * R, p[1] - uy * R];
      if (uy === 0) {
        hops.filter(h => (h - cur[0]) * ux > HOP && (end[0] - h) * ux > HOP).sort((a, b) => (a - b) * ux).forEach(h => {
          d += ` L${f(h - ux * HOP)} ${f(p[1])} A${HOP} ${HOP} 0 0 ${ux > 0 ? 1 : 0} ${f(h + ux * HOP)} ${f(p[1])}`;
        });
      }
      d += ` L${f(end[0])} ${f(end[1])}`;
      if (!last) {
        const n = pts[i + 1], vx = Math.sign(n[0] - p[0]), vy = Math.sign(n[1] - p[1]);
        d += ` Q${f(p[0])} ${f(p[1])} ${f(p[0] + vx * R)} ${f(p[1] + vy * R)}`;
        cur = [p[0] + vx * R, p[1] + vy * R];
      }
    }
    return d;
  }
  const segs = pts => pts.slice(1).map((p, i) => [pts[i], p]);
  const GEO = {};
  function route() {
    if (typeof cells !== 'undefined') cells.forEach(o => { o.b = null; });
    const box = {};
    TABLES.forEach(t => { box[t] = off(plate[t]); });
    const mid = 380;
    const Lo = Math.max(box.customer.x + box.customer.w, box.line_item.x + box.line_item.w) + 14;
    const Hi = Math.min(box.sale.x, box.product.x) - 14;
    Object.entries(RELS).forEach(([r, d]) => {
      const pb = box[d.pk], fb = box[d.fk];
      const pr = off(row(d.pk, d.col)), fr = off(row(d.fk, d.col));
      const pL = pb.x < mid, fL = fb.x < mid;
      const px = pL ? pb.x + pb.w : pb.x, pd = pL ? 1 : -1;
      const fx = fL ? fb.x + fb.w : fb.x, fd = fL ? 1 : -1;
      const y1 = pr.y + pr.h / 2, y2 = fr.y + fr.h / 2, xl = Lo + d.lane * (Hi - Lo);
      
      GEO[r] = { pts: [[px, y1], [xl, y1], [xl, y2], [fx, y2]], px, pd, fx, fd, y1, y2, xl, pr, fr, hops: [] };
    });
    // Crossings: a horizontal run of one relation over a vertical run of another.
    const names = Object.keys(GEO);
    names.forEach(a => names.forEach(b => {
      if (a === b) return;
      segs(GEO[a].pts).forEach(([p, q]) => {
        if (p[1] !== q[1]) return;
        segs(GEO[b].pts).forEach(([s, t]) => {
          if (s[0] !== t[0]) return;
          const x = s[0], y = p[1];
          if (x > Math.min(p[0], q[0]) && x < Math.max(p[0], q[0]) && y > Math.min(s[1], t[1]) && y < Math.max(s[1], t[1])) {
            GEO[a].hops.push(x);
            if (!(a === 'cs' && b === 'sl')) console.warn('ERD: unexpected crossing', a, b);
          }
        });
      });
    }));
    names.forEach(r => {
      const g = GEO[r], e = G[r], d = pathD(g.pts, g.hops);
      [e.hit, e.base, e.ghost, e.ink].forEach(p => p.setAttribute('d', d));
      const bx = g.px + g.pd * 9;
      setLine(e.bar, bx, g.y1 - 7, bx, g.y1 + 7);
      g.fork = [g.fx + g.fd * FOOT, g.y2];
      g.tot = e.ink.getTotalLength();
      setFoot(r, e.open);
      // Phone camera: a frame around each end of the connector.
      const end = (b, x) => { const l = Math.min(b.x, x - 44), rr = Math.max(b.x + b.w, x + 44); return { x: l - 8, y: b.y - 60, w: rr - l + 16, h: b.h + 120 }; };
      g.camA = end(g.pr, g.px); g.camB = end(g.fr, g.fx);
    });
  }
  function setLine(l, x1, y1, x2, y2) {
    l.setAttribute('x1', x1.toFixed(2)); l.setAttribute('y1', y1.toFixed(2));
    l.setAttribute('x2', x2.toFixed(2)); l.setAttribute('y2', y2.toFixed(2));
  }
  function setFoot(r, open) {
    const g = GEO[r], e = G[r]; if (!g) return;
    e.open = open;
    const [fx, fy] = g.fork;
    [-1, 0, 1].forEach((s, i) => setLine(e.prongs[i], fx, fy, g.fx, fy + s * SPREAD * open));
  }

  // ---------- Fit and camera ----------
  const cam = { sc: 1, tx: 0, ty: 0, set: false };
  let W = { w: 760, h: 560 };
  function layout() {
    if (calm) { canvas.style.transform = ''; win.style.height = ''; return; }
    const ww = win.clientWidth;
    if (phone.matches) {
      win.style.height = '';
      W = { w: ww, h: win.clientHeight, fit: Math.min(1, ww / 760) };
    } else {
      const st = getComputedStyle(stage), sp = getComputedStyle(sheet);
      const pad = parseFloat(sp.paddingTop) + parseFloat(sp.paddingBottom);
      const maxH = desk.matches
        ? innerHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom) - pad
        : innerHeight * .58;
      // The sheet hugs the scaled canvas and sits on the right gutter, so on
      // large screens it grows toward the gutter instead of floating.
      const cap = desk.matches ? (innerWidth >= 1500 ? 1.4 : 1.2) : 1;
      // Room is the figure's grid column, not the window, which this sets.
      const cols = st.gridTemplateColumns.split(' ').map(parseFloat);
      const room = desk.matches ? cols[cols.length - 1] - parseFloat(sp.paddingLeft) - parseFloat(sp.paddingRight) : ww;
      const fit = Math.min(cap, room / 760, maxH / 560);
      win.style.height = (560 * fit).toFixed(1) + 'px';
      win.style.width = desk.matches ? (760 * fit).toFixed(1) + 'px' : '';
      W = { w: desk.matches ? 760 * fit : ww, h: 560 * fit, fit };
      cam.sc = fit; cam.tx = desk.matches ? 0 : (ww - 760 * fit) / 2; cam.ty = 0;
      applyCam();
    }
  }
  function applyCam() { canvas.style.transform = `translate(${cam.tx.toFixed(2)}px, ${cam.ty.toFixed(2)}px) scale(${cam.sc.toFixed(4)})`; }
  function camTarget(rect) {
    const sc = Math.min(1, W.w / rect.w, W.h / rect.h);
    // Centre the framed rect, even past the canvas edge, so a table in the
    // right column keeps its border and margin in view.
    return { sc, tx: W.w / 2 - (rect.x + rect.w / 2) * sc, ty: W.h / 2 - (rect.y + rect.h / 2) * sc };
  }

  // ---------- Lit state ----------
  let hot = null, relAt = null, at = calm ? 99 : 0, lag = 0;
  // Only what is already on the sheet can be lit: a table once it has fed in,
  // a connector once its line has drawn.
  const tableUp = t => at >= TABLE_STEP[t] + .1;
  const relUp = r => at >= RELS[r].step + lag + .2;
  const rows = Array.from(sec.querySelectorAll('tr[data-link]'));
  const refs = Array.from(sec.querySelectorAll('b[data-ref]'));
  function apply() {
    const rels = (hot ? (LINKS[hot] || [hot]) : (relAt ? [relAt] : [])).filter(r => !hot || relUp(r));
    const tabs = new Set();
    rels.forEach(r => { tabs.add(RELS[r].pk); tabs.add(RELS[r].fk); });
    if (hot && plate[hot]) tabs.add(hot);
    sec.classList.toggle('focus', rels.length > 0);
    if (hot) sheet.dataset.hot = hot; else delete sheet.dataset.hot;
    TABLES.forEach(t => plate[t].classList.toggle('on', tabs.has(t)));
    Object.keys(G).forEach(r => G[r].g.classList.toggle('on', rels.includes(r)));
    rows.forEach(tr => tr.classList.toggle('lit', rels.includes(tr.dataset.link)));
    refs.forEach(b => b.classList.toggle('lit', !!hot && tabs.has(b.dataset.ref)));
    return rels;
  }
  function setHot(v) {
    if (v && (plate[v] ? !tableUp(v) : !relUp(v))) v = null;
    if (hot === v) return;
    const before = hot ? (LINKS[hot] || [hot]).filter(relUp) : [];
    hot = v;
    const now = apply();
    if (!calm) now.filter(r => !before.includes(r)).forEach(runDots);
  }
  // A single ink dot runs from the bar to the fork, then splits along the prongs.
  function runDots(r) {
    const g = GEO[r], e = G[r]; if (!g || !e.ink.animate) return;
    const len = g.tot - FOOT, N = 16, kf = [];
    for (let i = 0; i <= N; i++) {
      const p = e.ink.getPointAtLength(len * easeIO(i / N));
      kf.push({ transform: `translate(${p.x}px, ${p.y}px)`, opacity: i === 0 ? 0 : 1 });
    }
    e.hdots[0].animate(kf, { duration: 420, easing: 'linear' });
    const [fx, fy] = g.fork;
    [-1, 0, 1].forEach((s, i) => {
      const d = i === 1 ? e.hdots[0] : e.hdots[i === 0 ? 1 : 2];
      d.animate([
        { transform: `translate(${fx}px, ${fy}px)`, opacity: 1 },
        { transform: `translate(${g.fx}px, ${fy + s * SPREAD}px)`, opacity: 1, offset: .7 },
        { transform: `translate(${g.fx}px, ${fy + s * SPREAD}px)`, opacity: 0 },
      ], { duration: 240, delay: 420, easing: 'ease-out' });
    });
  }

  // Hover, focus and touch. Hover holds no state of its own beyond `hot`.
  TABLES.forEach(t => {
    const p = plate[t];
    p.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') setHot(t); });
    p.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch' && (hot === t || LINKS[t].includes(hot)) && document.activeElement !== p) setHot(null); });
    p.addEventListener('focus', () => setHot(t));
    p.addEventListener('blur', () => { if (hot === t) setHot(null); });
    p.addEventListener('pointerup', e => { if (e.pointerType === 'touch') setHot(hot === t ? null : t); });
  });
  // A key row (PK or FK) lights only its own connector; leaving it hands the
  // light back to the table under the pointer.
  rows.forEach(tr => {
    const t = tr.closest('.plate').dataset.table;
    tr.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') setHot(tr.dataset.link); });
    tr.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch' && hot === tr.dataset.link) setHot(plate[t].matches(':hover') ? t : null); });
  });
  Object.keys(G).forEach(r => {
    G[r].hit.addEventListener('pointerenter', () => setHot(r));
    G[r].hit.addEventListener('pointerleave', () => { if (hot === r) setHot(null); });
  });
  refs.forEach(b => {
    b.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') setHot(b.dataset.ref); });
    b.addEventListener('pointerleave', () => { if (hot === b.dataset.ref) setHot(null); });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && hot) setHot(null); });
  document.addEventListener('pointerdown', e => { if (hot && !sheet.contains(e.target)) setHot(null); });

  // ---------- Choreography ----------
  // Every value below is a function of pp (the pin's step position), so
  // scrolling back up reverses the press frame for frame.
  const cache = new WeakMap();
  const put = (el, k, v) => {
    let c = cache.get(el); if (!c) cache.set(el, c = {});
    if (c[k] !== v) { c[k] = v; if (k[0] === '-') el.style.setProperty(k, v); else el.style[k] = v; }
  };
  const P = {};
  TABLES.forEach(t => {
    const p = plate[t];
    P[t] = {
      press: p.querySelector('.press'), regs: Array.from(p.querySelectorAll('.reg')),
      trs: Array.from(p.querySelectorAll('tbody tr')), keys: Array.from(p.querySelectorAll('.k')),
      slot: sec.querySelector(`.slots [data-of="${t}"]`), ghosts: Array.from(sec.querySelectorAll(`.ghost[data-of="${t}"]`)),
    };
  });
  const segsBar = Array.from(sec.querySelectorAll('.progress i'));
  const steps = Array.from(sec.querySelectorAll('[data-step]'));
  // Ghost sheets fan down-right behind SALE and down-left behind LINE_ITEM,
  // away from the connectors.
  const FAN_DIR = { sale: 1, line_item: -1 };
  function paintGhosts(t, fan) {
    P[t].ghosts.forEach((gh, i) => {
      const n = i + 1;
      put(gh, 'transform', `translate(${(FAN_DIR[t] * 10 * n * fan).toFixed(2)}px, ${(10 * n * fan).toFixed(2)}px)`);
      put(gh, 'opacity', fan > 0.01 ? '1' : '0');
    });
  }

  let painted = false;
  function frame(S, h) {
    if (calm) return;
    const pin = S.pins.erd; if (!pin) return;
    const rc = pin.rc;
    if (painted && (rc.bottom < 0 || rc.top > innerHeight)) return;
    painted = true;
    const pp = pin.pp, k = h.k, tsec = h.s, H = innerHeight;
    // Phones follow each connector with the camera, so its line draws
    // later in the step, after the camera has shown the one end.
    lag = phone.matches ? .4 : 0;
    if (at !== pp) {
      at = pp;
      if (hot && (plate[hot] ? !tableUp(hot) : !relUp(hot))) setHot(null);
      // Unprinted tables are not focus stops; their slot is empty paper.
      TABLES.forEach(t => { const on = tableUp(t); if (plate[t].tabIndex !== (on ? 0 : -1)) plate[t].tabIndex = on ? 0 : -1; });
    }
    // Once the pin lets go (after the full hold on the finished sheet), fade
    // the stage as it starts to slide toward the nav.
    put(stage, 'opacity', rc.bottom < H ? cl((rc.bottom - H * .84) / (H * .16)).toFixed(3) : '1');

    // Tables: feed, register the colour plates, roll the rows, stamp the keys.
    TABLES.forEach(t => {
      const s = TABLE_STEP[t], q = cl((pp - s + 0.1) / 0.6), E = P[t], el = plate[t];
      const feed = ease(cl(q / 0.3));
      const mis = q < .35 ? 1 : 1 - backOut(cl((q - .35) / .35));
      const roll = cl((q - .3) / .35);
      const reg = q < .62 ? 0 : q < .7 ? (q - .62) / .08 : 1 - cl((q - .7) / .15);
      el.classList.toggle('moving', q > 0 && q < 1);
      put(E.press, '--o', feed.toFixed(3));
      put(E.press, '--ty', (-40 * (1 - feed) * k).toFixed(2));
      put(E.press, '--rot', (-1.5 * (1 - feed) * k).toFixed(3));
      put(E.press, '--mis', (cl(mis, -.08, 1) * k).toFixed(3));
      put(E.press, '--roll', roll.toFixed(3));
      put(E.press, '--rv', roll > 0 && roll < 1 ? '1' : '0');
      E.regs.forEach(r => { put(r, '--reg', reg.toFixed(3)); put(r, '--rs', (1.3 - .3 * cl((q - .62) / .08)).toFixed(3)); });
      const n = E.trs.length, rr = roll * n;
      E.trs.forEach((tr, i) => put(tr, '--lt', (roll < 1 ? cl(1 - Math.abs(rr - (i + .5)) / 1.4) : 0).toFixed(3)));
      const nk = E.keys.length, span = .23 / nk;
      E.keys.forEach((kk, i) => {
        const u = cl((q - .72 - i * span) / span);
        put(kk, '--st', cl(backOut(u), 0, 1.1).toFixed(3));
        put(kk, '--ring', (Math.sin(Math.PI * u) * k).toFixed(3));
      });
      put(E.slot, 'opacity', (1 - feed).toFixed(3));
    });

    // Connectors: bar, rule, crow's foot, then packets from one side to many.
    const fans = { sale: 0, line_item: 0 };
    Object.entries(RELS).forEach(([r, d], ri) => {
      const s = d.step + lag, q = cl((pp - s + 0.1) / 0.6), e = G[r], g = GEO[r];
      if (!g) return;
      const draw = ease(cl(q / 0.5));
      put(e.one, 'transform', `scaleY(${cl((q - .05) / .1).toFixed(3)})`);
      put(e.ink, 'strokeDashoffset', (1 - draw).toFixed(4));
      put(e.ghost, 'strokeDashoffset', (1 - draw).toFixed(4));
      put(e.ghost, 'transform', `translate(calc(${((1 - q) * 1.5 + .5).toFixed(2)}px + var(--press-nx, 0) * .5px), ${((1 - q) * 1.5 + .5).toFixed(2)}px)`);
      put(e.many, 'opacity', cl((q - .4) / .05).toFixed(3));
      const open = ease(cl((q - .45) / .15));
      if (Math.abs(open - e.open) > .001) setFoot(r, open);
      const up = ease(cl((q - .45) / .3)), down = cl((q - .8) / .2);
      fans[d.fk] = Math.max(fans[d.fk], up * (1 - .65 * down));

      // Packets loop while this connector's step is up, and on all three once
      // the sheet is complete. Reduced motion never reaches here.
      const live = q >= .6 && (Math.abs(pp - s - .5) < .6 || pp > 8);
      if (live) {
        const f = (tsec * .3 + ri * .33) % 1, len = g.tot - FOOT;
        if (f < .7) {
          const p = e.ink.getPointAtLength(len * easeIO(f / .7));
          put(e.dots[0], 'transform', `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px)`);
          put(e.dots[0], 'opacity', cl(f / .05).toFixed(2));
          e.dots.slice(1).forEach(dd => put(dd, 'opacity', '0'));
        } else {
          const u = ease(cl((f - .7) / .14)), a = (1 - cl((f - .84) / .12)).toFixed(2), [fx, fy] = g.fork;
          [1, 0, 2].forEach((di, i) => {
            const y = fy + (i - 1) * SPREAD * u, x = fx + (g.fx - fx) * u;
            put(e.dots[di], 'transform', `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`);
            put(e.dots[di], 'opacity', a);
          });
        }
      } else e.dots.forEach(dd => put(dd, 'opacity', '0'));
    });
    paintGhosts('sale', fans.sale);
    paintGhosts('line_item', fans.line_item);

    // Dim the tables off the current connector; lift it once the sheet is whole.
    const nextRel = pin.idx >= 5 && pin.idx <= 7 ? ['cs', 'sl', 'pl'][pin.idx - 5] : null;
    if (nextRel !== relAt) { relAt = nextRel; apply(); }
    // A segment lights as its step becomes current.
    segsBar.forEach((el, i) => el.classList.toggle('on', pp >= i + .95));

    // Phone camera: whole sheet, then each table at full size, then each
    // connector: hold on its one end, pan along the line as it draws, hold on
    // its many end. The whole sheet again only for the last stretch.
    if (phone.matches) {
      const st = Math.min(8, Math.floor(pp + 0.1));
      let rect = { x: 0, y: 0, w: 760, h: 560 };
      if (st >= 1 && st <= 4) {
        const t = TABLES.find(x => TABLE_STEP[x] === st), b = off(plate[t]);
        rect = { x: b.x - 16, y: b.y - 16, w: b.w + 32, h: b.h + 32 };
      } else if (st >= 5 && st <= 7) {
        const r = ['cs', 'sl', 'pl'][st - 5], g = GEO[r];
        const u = easeIO(cl((pp - st - .3) / .3)), A = g.camA, B = g.camB;
        // Mid-pan the frame widens to hold both ends, so the camera never
        // rests on an empty gutter between them.
        const m = Math.sin(Math.PI * u), x0 = Math.min(A.x, B.x), y0 = Math.min(A.y, B.y);
        const Uw = Math.max(A.x + A.w, B.x + B.w) - x0, Uh = Math.max(A.y + A.h, B.y + B.h) - y0;
        const lerp = (p, q, t) => p + (q - p) * t;
        rect = { x: lerp(lerp(A.x, B.x, u), x0, m), y: lerp(lerp(A.y, B.y, u), y0, m), w: lerp(lerp(A.w, B.w, u), Uw, m), h: lerp(lerp(A.h, B.h, u), Uh, m) };
      }
      const tg = camTarget(rect), a = cam.set ? .12 : 1;
      cam.sc += (tg.sc - cam.sc) * a; cam.tx += (tg.tx - cam.tx) * a; cam.ty += (tg.ty - cam.ty) * a; cam.set = true;
      applyCam();
    }
    cull();
  }

  // Phones: rows the camera has left, wholly or in part, are hidden, so they
  // never show as cut words or count as text under the nav or the heading.
  const cells = [];
  TABLES.forEach(t => plate[t].querySelectorAll('caption, tr').forEach(el => cells.push({ el, t })));
  function cull() {
    const on = phone.matches && !calm;
    cells.forEach(o => {
      let vis = true;
      if (on) {
        const b = o.b || (o.b = off(o.el));
        const x0 = cam.tx + b.x * cam.sc, y0 = cam.ty + b.y * cam.sc;
        // Only rows wholly inside the window show, so no word is cut at its edge.
        vis = x0 >= -1 && x0 + b.w * cam.sc <= W.w + 1 && y0 >= -1 && y0 + b.h * cam.sc <= W.h + 1;
      }
      put(o.el, 'visibility', vis ? '' : 'hidden');
    });
  }

  function step(id, idx) {
    if (id !== 'erd') return;
    sec.dataset.at = idx;
    steps.forEach(el => el.classList.toggle('cur', +el.dataset.step === idx));
  }

  // ---------- Init ----------
  route();
  layout();
  if (calm) {
    paintGhosts('sale', .35); paintGhosts('line_item', .35);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { route(); layout(); });
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => { route(); layout(); });
    ro.observe(win); TABLES.forEach(t => ro.observe(plate[t]));
  } else addEventListener('resize', () => { route(); layout(); });
  phone.addEventListener && phone.addEventListener('change', () => { cam.set = false; layout(); });

  window.TLErd = { frame, step, route };
})();
