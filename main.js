(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const lightScheme = matchMedia('(prefers-color-scheme: light)');

  /* ---------- helpers ---------- */
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const palette = () => {
    const cs = getComputedStyle(root);
    const v = (n) => cs.getPropertyValue(n).trim();
    return { bg2: v('--bg-2'), fg: v('--fg-rgb'), accent: v('--accent-rgb') };
  };
  const rgba = (rgb, a) => `rgba(${rgb}, ${a})`;

  /* ---------- nav: scrolled state + active section ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = [...document.querySelectorAll('.nav nav a')];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.hash === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => { const s = document.querySelector(a.hash); if (s) spy.observe(s); });

  /* ---------- scroll reveal ---------- */
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      reveal.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el));

  /* ---------- hero: flow field ---------- */
  const canvas = document.getElementById('field');
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  const LINK = 112;          // max distance for point-to-point lines
  const REACH = 150;         // cursor influence radius
  let W = 0, H = 0, dpr = 1, pts = [], t = 0, visible = true, raf = 0;
  const mouse = { x: -9999, y: -9999 };
  let pal = palette();

  const seedPoints = () => {
    const rnd = mulberry32(7);
    const n = Math.min(170, Math.floor((W * H) / 7500));
    pts = Array.from({ length: n }, (_, i) => ({
      x: rnd() * W, y: rnd() * H, vx: 0, vy: 0,
      r: 1 + rnd() * 1.2, hot: i % 11 === 0,
    }));
  };

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedPoints();
    if (reduceMotion.matches) { for (let i = 0; i < 140; i++) step(); draw(); }
  };

  const step = () => {
    t += 16;
    for (const p of pts) {
      const a = Math.sin(p.x * 0.0021 + t * 0.00018) * 2 + Math.cos(p.y * 0.0027 - t * 0.00013) * 2;
      p.vx = p.vx * 0.94 + Math.cos(a) * 0.07;
      p.vy = p.vy * 0.94 + Math.sin(a) * 0.07;
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < REACH && d > 0.1) {
        const f = (1 - d / REACH) * 1.1;
        p.vx += (dx / d) * f; p.vy += (dy / d) * f;
      }
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], dx = a.x - b.x, dy = a.y - b.y;
        if (Math.abs(dx) > LINK || Math.abs(dy) > LINK) continue;
        const d = Math.hypot(dx, dy);
        if (d < LINK) {
          ctx.strokeStyle = rgba(a.hot || b.hot ? pal.accent : pal.fg, (1 - d / LINK) * (a.hot || b.hot ? 0.5 : 0.3));
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      // cursor tether
      const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (md < REACH * 1.3) {
        ctx.strokeStyle = rgba(pal.accent, (1 - md / (REACH * 1.3)) * 0.55);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    for (const p of pts) {
      if (p.hot) {
        ctx.fillStyle = rgba(pal.accent, 0.14);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = p.hot ? rgba(pal.accent, 1) : rgba(pal.fg, 0.85);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.hot ? p.r + 0.8 : p.r, 0, 6.283); ctx.fill();
    }
  };

  const loop = () => {
    raf = 0;
    if (!visible || document.hidden || reduceMotion.matches) return;
    step(); draw();
    raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(hero);
  document.addEventListener('visibilitychange', kick);
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(resize, 120); });

  /* ---------- project thumbnails (seeded, abstract) ---------- */
  const TW = 520, TH = 340;
  const patterns = {
    // blood-cell scan with a classification box
    cells(c, r, p) {
      for (let i = 0; i < 28; i++) {
        const x = r() * TW, y = r() * TH, rad = 12 + r() * 20;
        c.strokeStyle = rgba(p.fg, 0.28); c.lineWidth = 1.2;
        c.beginPath(); c.arc(x, y, rad, 0, 6.283); c.stroke();
        c.strokeStyle = rgba(p.fg, 0.12);
        c.beginPath(); c.arc(x, y, rad * 0.45, 0, 6.283); c.stroke();
      }
      const x = 250, y = 150, s = 62;
      c.fillStyle = rgba(p.accent, 0.16); c.beginPath(); c.arc(x, y, 26, 0, 6.283); c.fill();
      c.strokeStyle = rgba(p.accent, 1); c.lineWidth = 1.6;
      c.beginPath(); c.arc(x, y, 26, 0, 6.283); c.stroke();
      c.setLineDash([5, 4]); c.strokeRect(x - s / 2, y - s / 2, s, s); c.setLineDash([]);
      c.fillStyle = rgba(p.accent, 1); c.font = '500 11px ui-monospace, Menlo, monospace';
      c.fillText('cell_03  0.97', x - s / 2, y - s / 2 - 8);
    },
    // stacked feed cards, one highlighted
    feed(c, r, p) {
      const cw = 230, ch = 112, cx = (TW - cw) / 2;
      [-1, 0, 1].forEach((k) => {
        const y = 114 + k * (ch + 14), hl = k === 0;
        c.fillStyle = hl ? rgba(p.accent, 0.1) : rgba(p.fg, 0.04);
        c.strokeStyle = hl ? rgba(p.accent, 0.9) : rgba(p.fg, 0.16); c.lineWidth = 1.3;
        c.beginPath(); c.roundRect(cx, y, cw, ch, 10); c.fill(); c.stroke();
        c.fillStyle = rgba(p.fg, hl ? 0.2 : 0.1);
        c.beginPath(); c.roundRect(cx + 12, y + 12, 64, 40, 6); c.fill();
        for (let l = 0; l < 3; l++) {
          c.fillStyle = hl && l === 0 ? rgba(p.accent, 0.9) : rgba(p.fg, 0.2);
          c.fillRect(cx + 88, y + 16 + l * 12, 40 + r() * 90, 5);
        }
        for (let q = 0; q < 3; q++) {
          c.strokeStyle = rgba(p.fg, hl && q === 1 ? 0.8 : 0.2);
          c.beginPath(); c.roundRect(cx + 12 + q * 70, y + 68, 62, 28, 14); c.stroke();
        }
      });
    },
    // layered satellite-signal waves
    waves(c, r, p) {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const y0 = 40 + i * 24, amp = 8 + r() * 18, f = 0.012 + r() * 0.012, ph = r() * 6.283;
        c.strokeStyle = i === 7 ? rgba(p.accent, 1) : rgba(p.fg, 0.1 + (i / n) * 0.3);
        c.lineWidth = i === 7 ? 1.8 : 1.1;
        c.beginPath();
        for (let x = 0; x <= TW; x += 4) {
          const y = y0 + Math.sin(x * f + ph) * amp;
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
      const hx = 330, hy = 40 + 7 * 24;
      c.fillStyle = rgba(p.accent, 0.2); c.beginPath(); c.arc(hx, hy, 16, 0, 6.283); c.fill();
      c.fillStyle = rgba(p.accent, 1); c.beginPath(); c.arc(hx, hy, 4, 0, 6.283); c.fill();
    },
    // semester schedule grid
    calendar(c, r, p) {
      const cols = 14, rows = 7, s = 26, g = 8;
      const ox = (TW - (cols * (s + g) - g)) / 2, oy = (TH - (rows * (s + g) - g)) / 2;
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const v = r(), x = ox + j * (s + g), y = oy + i * (s + g);
        c.fillStyle = v > 0.9 ? rgba(p.accent, 1) : rgba(p.fg, v > 0.45 ? 0.2 : 0.06);
        c.beginPath(); c.roundRect(x, y, s, s, 5); c.fill();
      }
      c.strokeStyle = rgba(p.accent, 1); c.lineWidth = 1.6;
      c.beginPath(); c.roundRect(ox + 5 * (s + g) - 4, oy + 3 * (s + g) - 4, s + 8, s + 8, 8); c.stroke();
    },
    // city map: street grid, an accident zone, and a safe route around it
    city(c, r, p) {
      const xs = [50, 140, 230, 320, 410, 470], ys = [50, 115, 180, 245, 300];
      c.lineWidth = 1;
      c.strokeStyle = rgba(p.fg, 0.13);
      xs.forEach((x) => { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, TH); c.stroke(); });
      ys.forEach((y) => { c.beginPath(); c.moveTo(0, y); c.lineTo(TW, y); c.stroke(); });
      for (let i = 0; i < 9; i++) {      // a few filled blocks for texture
        const x = xs[Math.floor(r() * (xs.length - 1))] + 8, y = ys[Math.floor(r() * (ys.length - 1))] + 8;
        c.fillStyle = rgba(p.fg, 0.05); c.fillRect(x, y, 74, 49);
      }
      const zx = 320, zy = 180;           // incident zone
      c.fillStyle = rgba(p.accent, 0.16); c.beginPath(); c.arc(zx, zy, 42, 0, 6.283); c.fill();
      c.strokeStyle = rgba(p.accent, 0.9); c.setLineDash([5, 4]); c.lineWidth = 1.4;
      c.beginPath(); c.arc(zx, zy, 42, 0, 6.283); c.stroke(); c.setLineDash([]);
      c.fillStyle = rgba(p.accent, 1);
      c.beginPath(); c.moveTo(zx, zy - 11); c.lineTo(zx + 10, zy + 8); c.lineTo(zx - 10, zy + 8); c.closePath(); c.fill();
      const path = (pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); };
      c.strokeStyle = rgba(p.fg, 0.4); c.setLineDash([2, 6]); c.lineWidth = 1.6;
      path([[50, 300], [320, 300], [320, 50], [470, 50]]);   // naive route, through the zone
      c.setLineDash([]); c.strokeStyle = rgba(p.fg, 0.95); c.lineWidth = 2.4; c.lineJoin = 'round';
      path([[50, 300], [230, 300], [230, 115], [410, 115], [410, 50], [470, 50]]);   // safe route
      c.fillStyle = p.bg2; c.strokeStyle = rgba(p.fg, 1); c.lineWidth = 2;
      c.beginPath(); c.arc(50, 300, 6, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = rgba(p.fg, 1); c.beginPath(); c.arc(470, 50, 6, 0, 6.283); c.fill();
    },
    // doorway head counting: dense heads, tracks, boxes, and a counting line
    crowd(c, r, p) {
      const lineY = 190;
      const heads = [];
      for (let row = 0; row < 7; row++) {
        const y = 36 + row * 42;
        const n = 5 + Math.floor(r() * 2);
        for (let k = 0; k < n; k++) heads.push([112 + (k + 0.5) * (296 / n) + (r() - 0.5) * 26, y + (r() - 0.5) * 16]);
      }
      heads.forEach(([x, y]) => {
        const crossed = y > lineY;
        const col = crossed ? p.accent : p.fg;
        const len = 26 + r() * 22;
        const g = c.createLinearGradient(x, y - len, x, y);
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, crossed ? 0.55 : 0.28));
        c.strokeStyle = g; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(x, y - len); c.lineTo(x, y); c.stroke();
        c.fillStyle = rgba(col, crossed ? 0.95 : 0.7);
        c.beginPath(); c.arc(x, y, 7.5, 0, 6.283); c.fill();
        c.strokeStyle = rgba(col, crossed ? 0.9 : 0.35); c.lineWidth = 1;
        c.strokeRect(x - 11, y - 11, 22, 22);
      });
      c.setLineDash([7, 5]); c.strokeStyle = rgba(p.accent, 1); c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(70, lineY); c.lineTo(TW - 70, lineY); c.stroke(); c.setLineDash([]);
      [70, TW - 70].forEach((x) => { c.fillStyle = rgba(p.accent, 1); c.fillRect(x - 3, lineY - 9, 6, 18); });
      c.fillStyle = rgba(p.accent, 1); c.font = '500 12px ui-monospace, Menlo, monospace';
      c.fillText('IN ' + heads.filter((h) => h[1] > lineY).length, 24, 32);
    },
    // Connect Four board
    connect4(c, r, p) {
      const cols = 7, rows = 6, s = 46, ox = (TW - cols * s) / 2 + s / 2, oy = (TH - rows * s) / 2 + s / 2;
      const grid = Array.from({ length: cols }, () => []);
      for (let m = 0; m < 22; m++) {
        const col = Math.floor(r() * cols);
        if (grid[col].length < rows) grid[col].push(m % 2);
      }
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const v = grid[i][j], x = ox + i * s, y = oy + (rows - 1 - j) * s;
        if (v === undefined) { c.strokeStyle = rgba(p.fg, 0.14); c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 17, 0, 6.283); c.stroke(); }
        else {
          c.fillStyle = v === 0 ? rgba(p.accent, 1) : rgba(p.fg, 0.75);
          c.beginPath(); c.arc(x, y, 17, 0, 6.283); c.fill();
        }
      }
    },
  };

  const drawThumbs = () => {
    const pal2 = palette();
    document.querySelectorAll('.thumb').forEach((cv) => {
      const k = cv.dataset.kind, fn = patterns[k];
      if (!fn) return;
      const d = 2;
      cv.width = TW * d; cv.height = TH * d;
      const c = cv.getContext('2d');
      c.setTransform(d, 0, 0, d, 0, 0);
      c.fillStyle = pal2.bg2; c.fillRect(0, 0, TW, TH);
      fn(c, mulberry32(+cv.dataset.seed || 1), pal2);
    });
  };

  /* ---------- LeetCode terrain profile ---------- */
  const perm = new Uint8Array(512);
  (() => {
    let seed = 20260;
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  const fade = (q) => q * q * q * (q * (q * 6 - 15) + 10);
  const mix = (a, b, q) => a + (b - a) * q;
  const grad = (h, x, y, z) => {
    h &= 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  function noise(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z;
    const xi = X & 255, yi = Y & 255, zi = Z & 255;
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[xi] + yi, AA = perm[A] + zi, AB = perm[A + 1] + zi;
    const B = perm[xi + 1] + yi, BA = perm[B] + zi, BB = perm[B + 1] + zi;
    return mix(
      mix(mix(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
          mix(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      mix(mix(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
          mix(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
      w);
  }

  (() => {
    const svg = document.getElementById('profile-svg');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    const W = 1000, H = 300, base = H, scale = 245 / 229;
    const cum = [0, 51, 200, 229];          // easy 51, medium 149, hard 29
    const damp = [0, 0.5, 0.8, 1];
    const N = 120;
    const xs = Array.from({ length: N + 1 }, (_, i) => (i / N) * W);
    const shared = (x) => 58 * noise(x / 250 + 1.3, 0.7, 2.2) + 20 * noise(x / 85 + 5.1, 2.2, 1.1);
    const ridge = (k) => xs.map((x) => {
      if (k === 0) return base;
      return base - cum[k] * scale - shared(x) * damp[k] - 3 * noise(x / 70 + k * 7.7, k * 1.9, 3.3);
    });
    const R = [0, 1, 2, 3].map(ridge);
    const pts = (arr) => arr.map((y, i) => xs[i].toFixed(1) + ',' + y.toFixed(1));
    const add = (name, attrs) => {
      const n = document.createElementNS(NS, name);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      svg.appendChild(n);
    };

    [50, 100, 150, 200, 229].forEach((c) => {
      const y = (base - c * scale).toFixed(1);
      add('line', { x1: 0, x2: W, y1: y, y2: y, class: 'grid' });
    });
    const cls = ['band-easy', 'band-medium', 'band-hard'];
    for (let k = 1; k <= 3; k++) {
      const top = pts(R[k]);
      add('polygon', { points: top.concat(pts(R[k - 1]).reverse()).join(' '), class: cls[k - 1] });
      for (const q of [0.2, 0.4, 0.6, 0.8]) {
        const line = R[k].map((y, i) => y * q + R[k - 1][i] * (1 - q));
        add('polyline', { points: pts(line).join(' '), class: 'strata' });
      }
      add('polyline', { points: top.join(' '), class: 'ridge' });
    }
    // sit each label in the middle of its band
    const xi = Math.round(0.07 * N);
    [['.t-easy', 1], ['.t-medium', 2], ['.t-hard', 3]].forEach(([sel, k]) => {
      const mid = (R[k][xi] + R[k - 1][xi]) / 2;
      svg.parentElement.querySelector(sel).style.bottom = (((H - mid) / H) * 100).toFixed(2) + '%';
    });
  })();
  document.querySelectorAll('#profile').forEach((el) => reveal.observe(el));

  // count-up for the headline number
  const counter = document.querySelector('[data-count]');
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    const target = +counter.dataset.count;
    if (reduceMotion.matches) return;
    const t0 = performance.now(), dur = 1400;
    const tick = (now) => {
      const k = Math.min((now - t0) / dur, 1);
      counter.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }).observe(counter);

  /* ---------- theme changes + init ---------- */
  const refreshTheme = () => { pal = palette(); drawThumbs(); if (reduceMotion.matches) draw(); };
  lightScheme.addEventListener('change', refreshTheme);
  reduceMotion.addEventListener('change', () => { resize(); kick(); });

  const start = () => { resize(); drawThumbs(); kick(); };
  start();
  // webfonts shift hero height; re-measure once they land
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { resize(); });
})();
