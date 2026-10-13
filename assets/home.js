// Home page: marquee driven by scroll speed, the ladder numeral, and the
// preview card that follows the pointer over the topic list.
(function () {
  const root = document.querySelector('[data-page]');
  const track = root.querySelector('[data-track]');
  const nums = Array.from(root.querySelectorAll('[data-num]'));

  // Headings of each topic page, shown in the hover preview.
  const T = [
    ['Topic 1: Data and Information Management', ['Daily Retail Operations described by DIKW', 'The Seven Information Quality Criteria', 'Entity Relationship Diagram']],
    ['Topic 2: Data Ethics, Privacy and Compliance with POPIA', ['Data Ethics and POPIA', 'CIA Triad', 'The AAA Model', 'POPIA Compliance Integration', 'Security and Access Control (CIA & AAA)']],
    ['Topic 3: Artificial Intelligence and Decision Support Systems', ['The Analytics Maturity Ladder', 'Decision Support Systems', 'Balancing Algorithmic Systems with Human Retail Intuition', 'Herbert Simon’s Decision-Making Process']],
    ['Topic 4: Enterprise Systems and Integration Issues', ['POS Cloud System Integration', 'The Integrated Process', 'Physical Servers (On premises) vs. Cloud Software (SaaS)']],
    ['Topic 5: Adapting and customising information systems', ['Why off-the-shelf software never fits perfectly', 'The spectrum of tailoring choices', 'Why customisation costs more later', 'APIs: customising without touching the code', 'Using the SDLC to manage the change', 'The South African picture', 'Design and Pedagogy of Reasoning']]
  ];

  let preview = null, pk = null, pl = null, hov = null, pop = 0;
  if (matchMedia('(pointer:fine)').matches) {
    preview = document.createElement('div');
    preview.className = 'preview';
    preview.setAttribute('aria-hidden', 'true');
    pk = document.createElement('span'); pk.className = 'pk';
    pl = document.createElement('ul');
    preview.append(pk, pl);
    root.appendChild(preview);
    const fill = i => {
      pk.textContent = T[i][0];
      pl.replaceChildren(...T[i][1].map(h => { const li = document.createElement('li'); li.textContent = h; return li; }));
    };
    fill(0);
    root.querySelectorAll('[data-topic]').forEach(a => {
      a.addEventListener('mouseenter', () => { hov = +a.dataset.topic; fill(hov); });
      a.addEventListener('mouseleave', () => { hov = null; });
    });
  }

  let lastY = scrollY, vel = 0, dir = 1, mq = 0;
  function frame(S, { cl, k }) {
    const dy = scrollY - lastY; lastY = scrollY; vel += (dy - vel) * 0.1;
    if (Math.abs(dy) > 0.5) dir = dy > 0 ? 1 : -1;
    if (track) {
      const half = track.scrollWidth / 2 || 1;
      mq -= (0.7 + Math.min(Math.abs(vel), 40) * 0.35) * dir * Math.max(k, 0.15);
      mq = ((mq % half) - half) % half;
      track.style.transform = `translate3d(${mq}px,0,0)`;
    }
    if (preview) {
      pop += ((hov != null ? 1 : 0) - pop) * 0.14;
      preview.style.opacity = pop.toFixed(3);
      preview.style.transform = `translate3d(${S.cx + 28}px, ${S.cy - 40}px, 0) rotate(${cl(S.vx * 0.9, -12, 12) * k}deg) scale(${0.85 + 0.15 * pop})`;
    }
  }

  function step(id, idx) {
    if (id !== 'intro') return;
    const n = String(idx + 1);
    nums.forEach(el => { el.textContent = n; });
  }

  TLMotion.start(root, { motion: () => 1, cursor: true, onFrame: frame, onStep: step });
})();
