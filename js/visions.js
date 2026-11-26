'use strict';
/* ============================================================
   ВИДЕНИЯ: короткие сцены вместо случайных «лиц на весь экран».
   Каждая показывает то, что героиня на самом деле видит, — с нарастанием,
   и пугает тем, что уместно здесь и сейчас. Если скримеры выключены
   (soft), резкий финал заменяется затемнением, а громкие звуки — тихими.
   Время в сценах — в «базовых» миллисекундах, независимо от TS.
   ============================================================ */
const Visions = (function () {
  const P = Art.api, W = Art.W, H = Art.H, S = Art.S;
  const R = P.R, ell = P.ell, pline = P.pline, glow = P.glow, hsh = P.hsh, sh = P.sh;
  let ov = null, tmp = null;
  const cx = function () { return P.ctx(); };
  function seg(t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }
  function ease(x) { return x * x * (3 - 2 * x); }
  function rnd(a) { return (Math.random() - 0.5) * a; }
  function black(a) { if (a <= 0) return; const g = cx(); g.fillStyle = 'rgba(0,0,0,' + Math.min(1, a).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
  function grain(n, a) { const g = cx(); for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + (a * 2.5) + ')'; g.fillRect(Math.random() * W | 0, Math.random() * H | 0, 1 + (Math.random() * 2 | 0), 1); } }
  function vign(a) { const g = cx(), gr = g.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 230); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + a + ')'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  /* темнота с пятнами света: [x, y, радиус, сила] */
  function light(ls, dk) {
    if (!ov) ov = P.mk(W, H);
    const o = ov.getContext('2d');
    o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, W, H); o.fillStyle = 'rgba(2,3,4,' + dk + ')'; o.fillRect(0, 0, W, H);
    o.globalCompositeOperation = 'destination-out';
    ls.forEach(function (l) {
      if (l[2] <= 1) return;
      const k = l[3] == null ? 1 : l[3], gr = o.createRadialGradient(l[0], l[1], 1, l[0], l[1], l[2]);
      gr.addColorStop(0, 'rgba(0,0,0,' + k + ')'); gr.addColorStop(0.5, 'rgba(0,0,0,' + (k * 0.6) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = gr; o.fillRect(0, 0, W, H);
    });
    cx().drawImage(ov, 0, 0);
  }
  function warm(x, y, r, a, col) { const g = cx(); g.globalCompositeOperation = 'lighter'; glow(x, y, r, col || '255,170,80', a); g.globalCompositeOperation = 'source-over'; }
  /* лавка крупным планом */
  function zoomShop(now, x, y, z) {
    if (!tmp) tmp = P.mk(W, H);
    const hl = S.roomHL; S.roomHL = null;
    P.withCtx(tmp.getContext('2d'), function () { P.shop(now); });
    S.roomHL = hl;
    const g = cx(), w = W / z, h = H / z;
    x = Math.max(w / 2, Math.min(W - w / 2, x)); y = Math.max(h / 2, Math.min(H - h / 2, y));
    g.imageSmoothingEnabled = false;
    g.drawImage(tmp, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h), 0, 0, W, H);
    return [x, y];
  }
  function Z(x0, y0, z) { return { x: function (x) { return (x - x0) * z + W / 2; }, y: function (y) { return (y - y0) * z + H / 2; }, z: z }; }
  function shake(g, k) { g.translate(Math.round(rnd(k)), Math.round(rnd(k))); }
  /* ладонь: пальцы вверх (rot — поворот) */
  function palm(x, y, s, col, rot) {
    const g = cx(); g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s);
    g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 11, 13, 0, 0, Math.PI * 2); g.fill();
    [[-9, -26, 4, 20], [-3, -32, 4, 24], [3, -31, 4, 23], [9, -25, 4, 18]].forEach(function (f) { g.beginPath(); g.ellipse(f[0], f[1] + f[3] / 2 - 2, f[2] / 2 + 0.6, f[3] / 2, 0, 0, Math.PI * 2); g.fill(); });
    g.beginPath(); g.ellipse(-13, 2, 3.4, 9, -0.7, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  /* ---------- яма: стены, пласты, корни ---------- */
  function root(x, y, len, seed, col) {                       // корень свисает из стены: тонкий, извилистый
    let px = x, py = y;
    for (let s = 0; s < len; s++) {
      const nx = px + Math.round((hsh(s, seed) - 0.5) * 4), ny = py + 3;
      pline(px, py, nx, ny, col); px = nx; py = ny;
      if (hsh(s, seed + 1) > 0.78) pline(px, py, px + (hsh(s, seed + 2) > 0.5 ? 4 : -4), py + 3, col);
    }
  }
  function pit(depth) {
    const g = cx();
    R(0, 0, W, H, '#2a1c10');
    for (let y = 0; y < 150; y += 4) { const v = hsh(Math.floor(y / 4), 501); R(0, y, W, 4, v > 0.7 ? '#4a3420' : v > 0.4 ? '#3e2c1a' : '#352616'); }
    for (let i = 0; i < 120; i++) R(Math.floor(hsh(i, 502) * W), Math.floor(hsh(i, 503) * 150), 2 + Math.floor(hsh(i, 504) * 5), 1, hsh(i, 505) > 0.5 ? '#5a4228' : '#1e140a');
    for (let i = 0; i < 14; i++) R(Math.floor(hsh(i, 510) * W), Math.floor(hsh(i, 511) * 140), 3 + Math.floor(hsh(i, 512) * 3), 2, '#6a6458');   // камешки
    for (let i = 0; i < 7; i++) root(80 + Math.floor(hsh(i, 506) * 230), 2 + Math.floor(hsh(i, 507) * 60), 8 + Math.floor(hsh(i, 508) * 10), 520 + i * 7, '#9a8a6a');
    g.fillStyle = '#160e07'; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 0); g.lineTo(104, 150); g.lineTo(0, 216); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(W, 0); g.lineTo(W - 64, 0); g.lineTo(W - 104, 150); g.lineTo(W, 216); g.closePath(); g.fill();
    g.fillStyle = '#3a2816'; g.beginPath(); g.moveTo(104, 150); g.lineTo(W - 104, 150); g.lineTo(W, 216); g.lineTo(0, 216); g.closePath(); g.fill();
    for (let i = 0; i < 40; i++) R(60 + Math.floor(hsh(i, 513) * 260), 152 + Math.floor(hsh(i, 514) * 60), 3, 2, hsh(i, 515) > 0.5 ? '#4a3420' : '#241808');
    if (depth != null && depth > 0) { g.fillStyle = 'rgba(58,40,22,' + Math.min(1, depth).toFixed(3) + ')'; g.beginPath(); g.ellipse(192, 188, 160, 44, 0, 0, Math.PI * 2); g.fill(); for (let i = 0; i < 30; i++) R(80 + Math.floor(hsh(i, 516) * 220), 160 + Math.floor(hsh(i, 517) * 50), 4, 2, 'rgba(30,20,10,' + depth.toFixed(2) + ')'); }
  }
  function lid(x, cover, open) {                              // крышка гроба, cover — сколько ещё под землёй
    const g = cx();
    g.save(); g.beginPath(); g.moveTo(112, 156); g.lineTo(272, 156); g.lineTo(302, 214); g.lineTo(82, 214); g.closePath(); g.clip();
    if (open > 0) {                                            // внутри: сатин, пусто, жестянка
      R(82, 156, 220, 60, '#3a3040');
      for (let k = 0; k < 10; k++) R(90 + k * 22, 158, 3, 58, '#4e4258');
      R(82, 156, 220, 4, '#1a1418');
      R(104, 168, 30, 18, '#8a8a7a'); R(104, 168, 30, 2, '#b8b8a8'); R(108, 173, 22, 9, '#8a2a20'); R(111, 176, 16, 1, '#e0d0a0'); R(111, 179, 12, 1, '#e0d0a0');
    }
    g.translate(x, 0);
    R(82, 156, 220, 60, '#6a4428');
    for (let k = 0; k < 6; k++) { R(82, 158 + k * 10, 220, 1, '#3a2414'); R(82, 159 + k * 10, 220, 1, '#8a5a34'); }
    [[116, 160], [268, 160], [104, 206], [280, 206]].forEach(function (n) { R(n[0], n[1], 3, 3, '#2a1a0e'); R(n[0], n[1], 1, 1, '#9a7a4a'); });
    if (cover < 1) { g.save(); g.translate(192 - P.sfWidth('НЕ ЗДЕСЬ'), 176); g.scale(2, 2); P.sfText('НЕ ЗДЕСЬ', 0, 0, 'rgba(230,206,160,' + (1 - cover).toFixed(3) + ')', 'rgba(30,16,8,' + (0.8 * (1 - cover)).toFixed(3) + ')'); g.restore(); }
    if (cover > 0) { g.fillStyle = 'rgba(58,40,22,' + cover.toFixed(3) + ')'; g.fillRect(82, 156, 220, 60); for (let i = 0; i < 20; i++) R(90 + Math.floor(hsh(i, 518) * 200), 160 + Math.floor(hsh(i, 519) * 50), 5, 2, 'rgba(30,20,10,' + cover.toFixed(2) + ')'); }
    g.restore();
  }
  function shadowHero(x, y, a) {                               // тень героини на стене ямы: картуз, плечи
    const g = cx(); g.save(); g.filter = 'blur(1.5px)'; g.fillStyle = 'rgba(8,4,2,' + a + ')';
    g.beginPath(); g.ellipse(x, y, 15, 18, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(x - 2, y - 16, 20, 7, -0.08, 0, Math.PI * 2); g.fill(); g.fillRect(x - 6, y - 22, 26, 5);
    g.beginPath(); g.moveTo(x - 8, y + 14); g.quadraticCurveTo(x - 46, y + 22, x - 50, y + 96); g.lineTo(x + 50, y + 96); g.quadraticCurveTo(x + 46, y + 22, x + 8, y + 14); g.closePath(); g.fill();
    g.restore();
  }
  function shadowTall(x, y, a, reach) {                        // высокая тень в цилиндре: длинная, узкая
    const g = cx(); g.save(); g.filter = 'blur(1.5px)'; g.fillStyle = 'rgba(8,4,2,' + a + ')';
    g.beginPath(); g.ellipse(x, y, 11, 17, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x - 10, y - 14); g.lineTo(x - 9, y - 50); g.lineTo(x + 9, y - 50); g.lineTo(x + 10, y - 14); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(x, y - 14, 22, 4, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x - 6, y + 14); g.quadraticCurveTo(x - 30, y + 24, x - 26, y + 140); g.lineTo(x + 26, y + 140); g.quadraticCurveTo(x + 30, y + 24, x + 6, y + 14); g.closePath(); g.fill();
    if (reach > 0) {                                           // длинная рука тянется к её плечу
      g.lineCap = 'round'; g.strokeStyle = 'rgba(8,4,2,' + a + ')'; g.lineWidth = 6;
      const ex = x - 26 - reach * 30, ey = y + 30 + reach * 4, hx = x - 30 - reach * 62, hy = y + 40 + reach * 16;
      g.beginPath(); g.moveTo(x - 20, y + 24); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke(); g.lineWidth = 2.5;
      for (let f = 0; f < 4; f++) { g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(hx - 10 - f, hy - 6 + f * 4, hx - 18 - f * 2, hy + f * 5 + 4); g.stroke(); }
    }
    g.restore();
  }
  /* дядя Матвей: старик с бородой, запавшие глаза; mouth — насколько открыт рот */
  function oldFace(x, y, s, mouth, wide) {
    const g = cx(); g.save(); g.translate(x, y); g.scale(s, s);
    const fg = g.createLinearGradient(-20, -26, 20, 26); fg.addColorStop(0, '#b6b2a4'); fg.addColorStop(1, '#5e5c54');
    g.fillStyle = fg; g.beginPath(); g.ellipse(0, 0, 18, 24, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d8d6cc'; g.beginPath(); g.ellipse(0, -20, 16, 8, 0, Math.PI, Math.PI * 2); g.fill();          // седые волосы
    g.fillStyle = '#c8c6bc'; g.beginPath(); g.moveTo(-15, 6); g.quadraticCurveTo(-14, 30, 0, 34); g.quadraticCurveTo(14, 30, 15, 6); g.quadraticCurveTo(0, 12, -15, 6); g.fill();   // борода
    g.fillStyle = 'rgba(30,26,22,0.55)'; g.beginPath(); g.ellipse(-7, -4, 5.5, 4.5, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(7, -4, 5.5, 4.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0c0a08'; g.beginPath(); g.ellipse(-7, -4, 2.2 + wide, 1.6 + wide, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(7, -4, 2.2 + wide, 1.6 + wide, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8e6da'; g.fillRect(-8, -5, 1, 1); g.fillRect(6, -5, 1, 1);
    g.fillStyle = 'rgba(40,34,30,0.6)'; g.fillRect(-12, -11, 9, 1); g.fillRect(3, -11, 9, 1); g.fillRect(-1, -2, 2, 8);   // брови, нос
    g.fillStyle = '#1a0a08'; g.beginPath(); g.ellipse(0, 12, 4 + mouth, 1 + mouth * 3, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  /* бледные пальцы из земли (или корни — если real) */
  function fingers(cx0, cy0, k, real, t) {
    const g = cx(); g.save(); g.lineCap = 'round';
    for (let f = 0; f < 5; f++) {
      const bx = cx0 - 34 + f * 16 + Math.round(hsh(f, 540) * 6), by = 216, len = (40 + hsh(f, 541) * 22) * k;
      const curl = (f < 2 ? 1 : f > 2 ? -1 : 0.2) * (0.4 + k * 0.9);
      let px = bx, py = by, ang = -Math.PI / 2 + (f - 2) * 0.18;
      for (let s = 0; s < 3; s++) {
        const nx = px + Math.cos(ang) * len / 3, ny = py + Math.sin(ang) * len / 3;
        g.strokeStyle = real ? '#8a7656' : '#d6d0c2'; g.lineWidth = real ? 2.2 - s * 0.5 : 4 - s * 0.7;
        g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
        if (!real) { g.fillStyle = '#b8b0a0'; g.fillRect(Math.round(nx) - 1, Math.round(ny), 3, 1); }   // суставы
        else if (s === 1) { g.strokeStyle = '#6a5a40'; g.lineWidth = 1; g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + 5, ny + 3); g.stroke(); }
        px = nx; py = ny; ang += curl * 0.55;
      }
      if (!real && k > 0.5) { g.fillStyle = '#6a6050'; g.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2); }   // ноготь в земле
    }
    g.restore();
  }

  const V = {};
  /* ---------- могила звонаря: лопата, крышка «НЕ ЗДЕСЬ», пустой гроб и вторая тень ---------- */
  V.grave = {
    dur: 9200, scare: true,
    cues: [[620, 'dig'], [1420, 'dig'], [2220, 'dig'], [2900, 'thud'], [3300, 'page'], [4700, 'whisper'], [5400, 'creak'], [7000, 'whisper'], [7850, 'sting'], [8200, 'breath', 'loud'], [8350, 'thud', 'loud']],
    draw: function (t, v, now) {
      const g = cx();
      const fl = 0.85 + Math.sin(now / 90) * 0.06 + Math.sin(now / 37) * 0.04;
      const dig = seg(t, 0, 3000), cover = 1 - ease(seg(t, 3200, 5000)), open = ease(seg(t, 5400, 6400));
      const out = !v.soft && t > 8200;
      g.save(); if (t > 2880 && t < 3050) shake(g, 3);
      pit(1 - dig * 0.7);
      if (t > 2800) lid(open * 150, cover, open);
      // лопата: три удара и четвёртый — о дерево
      [[300, 1000], [1100, 1800], [1900, 2600], [2600, 3100]].forEach(function (s) {
        if (t < s[0] || t > s[1]) return;
        const k = seg(t, s[0], s[1]), down = k < 0.45 ? ease(k / 0.45) : 1 - ease((k - 0.45) / 0.55);
        const bx = 236 + (1 - down) * 60, by = 64 + down * 110;
        g.save(); g.lineCap = 'round'; g.strokeStyle = '#3a2a1c'; g.lineWidth = 5; g.beginPath(); g.moveTo(bx + 90, by - 150); g.lineTo(bx + 8, by - 10); g.stroke();
        g.strokeStyle = '#5a4430'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx + 89, by - 151); g.lineTo(bx + 7, by - 11); g.stroke(); g.restore();
        g.fillStyle = '#5e5e58'; g.beginPath(); g.moveTo(bx - 16, by - 4); g.lineTo(bx + 18, by - 16); g.lineTo(bx + 26, by + 16); g.quadraticCurveTo(bx + 6, by + 34, bx - 6, by + 26); g.closePath(); g.fill();
        g.fillStyle = '#8a8a82'; g.fillRect(bx - 14, by - 4, 30, 2);
        if (k > 0.45 && k < 0.9) for (let i = 0; i < 9; i++) R(bx + 10 + rnd(36) + (k - 0.45) * 80, by - (k - 0.45) * 150 + rnd(24), 4, 3, '#2e2216');
      });
      // руки разгребают землю с крышки
      if (t > 3200 && t < 5200) {
        const k = (t - 3200) / 400, hx = 150 + Math.sin(k * Math.PI) * 60, hy = 176 + Math.cos(k * 2) * 6;
        [[hx, hy, -0.3], [hx + 70, hy + 4, 0.3]].forEach(function (h) { palm(h[0], h[1], 0.9, '#c8b6a0', h[2] + Math.PI / 2 * (h[2] < 0 ? -1 : 1) * 0.6); R(h[0] - 8, h[1] + 12, 18, 30, '#22242a'); });
      }
      // тени на стене ямы
      if (t > 6000) shadowHero(178, 64, 0.72 * seg(t, 6000, 6600));
      if (t > 6900) shadowTall(250, 40 + (1 - seg(t, 6900, 7700)) * 40, 0.8 * seg(t, 6900, 7400), ease(seg(t, 7500, 8200)));
      // фонарь на краю ямы
      const lit = out ? 0 : (v.soft ? 1 - seg(t, 8000, 8800) : 1);
      light([[130, 10, 400 * fl * lit, 1]], 0.86);
      warm(130, 10, 260, 0.2 * fl * lit);
      if (out) {
        black(1);
        if (t > 8400 && t < 8900 && Math.floor(now / 70) % 5) { R(206, 6, 2, 2, '#d8dccc'); R(214, 6, 2, 2, '#d8dccc'); }   // кто-то смотрит в яму сверху
      }
      g.restore();
      grain(160, 0.05); vign(0.7);
      black(seg(t, 8700, 9200));
    }
  };
  /* ---------- корни: пальцы из земли хватают руку… это корни ---------- */
  V.roots = {
    dur: 5200, scare: true,
    cues: [[400, 'dig'], [2300, 'scratch'], [3350, 'shriek', 'loud'], [3360, 'sting']],
    draw: function (t, v, now) {
      const g = cx(), fl = 0.88 + Math.sin(now / 80) * 0.05;
      const grip = ease(seg(t, 2400, 3300)), real = t > 3500;
      g.save(); if (!v.soft && t > 3340 && t < 3700) shake(g, 5);
      pit(0.85);
      const hx = 196 + Math.sin(t / 260) * (t < 2300 ? 30 : 0), hy = 170;
      palm(hx, hy, 1, '#c8b6a0', Math.PI / 2 * 0.6); R(hx - 10, hy + 12, 20, 40, '#22242a');
      if (t > 2200) { fingers(hx + 6, 0, seg(t, 2200, 2900) * (1 + grip * 0.3), real, t); fingers(hx - 44, 0, seg(t, 2400, 3100), real, t); }
      light([[140, 10, 380 * fl, 1]], 0.86);
      warm(140, 10, 240, 0.2 * fl);
      g.restore();
      if (!v.soft && t > 3340 && t < 3420) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(0, 0, W, H); }
      grain(140, 0.05); vign(0.7);
      black(seg(t, 4500, 5200));
    }
  };
  /* ---------- витрина: вещь с осадком у самого стекла, ладони изнутри ---------- */
  V.shelf = {
    dur: 6400, scare: true,
    cues: [[800, 'knock1'], [1300, 'knock1'], [1750, 'knock1'], [3400, 'glass'], [4300, 'glass'], [5200, 'crack', 'loud'], [5210, 'sting']],
    draw: function (t, v, now) {
      const g = cx(), zz = 1 + ease(seg(t, 0, 700)) * 1.7, zc = 384 - 384 / zz / 2, ccx = 192 + (Math.min(342, zc) - 192) * ease(seg(t, 0, 700));
      g.save(); if (!v.soft && t > 5200 && t < 5550) shake(g, 4);
      zoomShop(now, ccx, 66, zz);
      if (t > 600) {
        const z = Z(ccx, 66, zz), gx0 = z.x(304), gx1 = z.x(380), gy0 = z.y(18), gy1 = z.y(118), mx = (gx0 + gx1) / 2;
        g.save(); g.beginPath(); g.rect(gx0, gy0, gx1 - gx0, gy1 - gy0); g.clip();
        const k = seg(t, 600, 900), tr = t < 2200 ? Math.round(rnd(2)) : 0;
        g.globalAlpha = k;                                          // вещь стоит вплотную к стеклу
        if (v.o.icon) P.drawIcon(v.o.icon, mx - 21 + tr, 92, 3);
        g.globalAlpha = 1;
        const fog = ease(seg(t, 2200, 3400));                       // стекло запотевает изнутри
        if (fog > 0) { g.fillStyle = 'rgba(190,206,204,' + (0.38 * fog).toFixed(3) + ')'; g.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0); g.globalAlpha = fog; P.drawFogBlobs(gx0, gy0 + 20, gx1 - gx0, gy1 - gy0 - 20, now, 6); g.globalAlpha = 1; }
        const p1 = seg(t, 3400, 3700), p2 = seg(t, 4300, 4600), dr = seg(t, 4700, 5300);  // маленькие ладони изнутри, потом сползают
        if (p1 > 0) palm(mx - 40, 100 + dr * 26, 0.9, 'rgba(40,52,52,' + (0.85 * p1).toFixed(3) + ')', -0.15);
        if (p2 > 0) palm(mx + 38, 90 + dr * 30, 1.0, 'rgba(40,52,52,' + (0.85 * p2).toFixed(3) + ')', 0.2);
        if (dr > 0) { g.fillStyle = 'rgba(30,40,40,0.45)'; [-52, -46, -40, -33, 26, 33, 40, 47].forEach(function (dx, i) { g.fillRect(mx + dx, (i < 4 ? 78 : 66) + 26 * dr, 2, dr * 60); }); }
        if (!v.soft && t > 5200) {                                  // стекло трескается
          g.strokeStyle = 'rgba(230,240,240,0.85)'; g.lineWidth = 1;
          for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3; g.beginPath(); g.moveTo(mx, 100); let x = mx, y = 100; for (let s = 0; s < 4; s++) { x += Math.cos(a + hsh(i * 4 + s, 9) - 0.5) * 22; y += Math.sin(a + hsh(i * 4 + s, 10) - 0.5) * 22; g.lineTo(x, y); } g.stroke(); }
        }
        g.restore();
      }
      g.restore();
      grain(100, 0.04); vign(0.6);
      black(seg(t, 5600, 6400));
    }
  };
  /* ---------- окно: кто-то подходит из тумана, протирает стекло, пишет «ВПУСТИ», бьёт ладонями ---------- */
  V.window = {
    dur: 6800, scare: true,
    cues: [[2600, 'glass'], [3700, 'scratch'], [4800, 'bang', 'loud'], [5000, 'bang', 'loud'], [5010, 'sting']],
    draw: function (t, v, now) {
      const g = cx();
      g.save(); if (!v.soft && t > 4800 && t < 5400) shake(g, 4);
      const c0 = zoomShop(now, 52, 60, 3.0), z = Z(c0[0], c0[1], 3.0);
      const gx0 = z.x(20), gy0 = z.y(26), gw = 64 * 3, gh = 68 * 3;
      g.save(); g.beginPath(); g.rect(gx0, gy0, gw, gh); g.clip();
      const near = ease(seg(t, 0, 1600)), sx = W / 2, by = gy0 + gh;
      const s = 0.3 + near * 0.66, a = 0.25 + near * 0.6 - seg(t, 5800, 6800) * 0.8, hy = by - 150 * s;
      g.fillStyle = 'rgba(170,186,184,0.5)'; g.fillRect(gx0, gy0, gw, gh);                  // туман за стеклом
      P.drawFogBlobs(gx0, gy0 + 20, gw, gh - 20, now, 7);
      g.fillStyle = 'rgba(10,14,14,' + Math.max(0, a).toFixed(3) + ')';                       // силуэт сквозь туман
      g.beginPath(); g.ellipse(sx, hy, 30 * s, 38 * s, 0, 0, Math.PI * 2); g.fill(); g.fillRect(sx - 12 * s, hy, 24 * s, 50 * s);
      g.beginPath(); g.moveTo(sx - 80 * s, by); g.quadraticCurveTo(sx - 70 * s, by - 100 * s, sx, by - 104 * s); g.quadraticCurveTo(sx + 70 * s, by - 100 * s, sx + 80 * s, by); g.closePath(); g.fill();
      g.fillStyle = 'rgba(200,214,212,0.16)'; g.fillRect(gx0, gy0, gw, gh);                  // запотевшее стекло
      if (t > 1600 && t < 2800) { const b = 0.5 + 0.5 * Math.sin(t / 300); g.fillStyle = 'rgba(230,236,236,' + (0.3 * b).toFixed(3) + ')'; g.beginPath(); g.ellipse(sx, hy + 24, 20, 10, 0, 0, Math.PI * 2); g.fill(); }
      const wipe = seg(t, 2600, 3300);                                                     // протёртая пальцем полоса — в ней кожа и один глаз
      if (wipe > 0) {
        const wx0 = sx - 46, ww = 92 * wipe, wy = hy - 14;
        g.save(); g.beginPath();
        for (let x = 0; x <= ww; x += 4) g.lineTo(wx0 + x, wy + Math.sin(x / 9) * 2);
        for (let x = ww; x >= 0; x -= 4) g.lineTo(wx0 + x, wy + 20 + Math.sin(x / 7 + 1) * 3);
        g.closePath(); g.clip();
        R(wx0 - 4, wy - 6, 110, 34, '#7e8c84');                                          // серая кожа вплотную к стеклу
        for (let i = 0; i < 30; i++) R(wx0 + Math.floor(hsh(i, 560) * 100), wy + Math.floor(hsh(i, 561) * 26), 2, 1, '#6a766e');
        const look = t < 3500 ? Math.sin(t / 140) * 5 : 0, ex = sx + 10;
        ell(ex, wy + 10, 13, 7, '#c8c4b0'); ell(ex + look, wy + 10, 6, 6, '#3a4a3a'); ell(ex + look, wy + 10, 3, 3, '#020202'); R(ex + look - 2, wy + 7, 2, 1, '#f0f0e0');
        g.strokeStyle = 'rgba(150,40,40,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(ex - 12, wy + 9); g.lineTo(ex - 7, wy + 11); g.moveTo(ex + 12, wy + 12); g.lineTo(ex + 8, wy + 10); g.stroke();
        R(ex - 15, wy + 2, 30, 2, '#4e5a54');                                             // веко сверху, без ресниц
        g.restore();
        g.fillStyle = 'rgba(30,40,40,0.35)'; for (let k = 0; k < 6; k++) g.fillRect(wx0 + 4 + k * 15, wy + 20, 2, 6 + (k * 7) % 9);   // потёки
      }
      const wr = seg(t, 3600, 4700);                                                       // «ВПУСТИ» зеркально, пальцем снаружи
      if (wr > 0) {
        g.save(); g.translate(sx, gy0 + 140); g.scale(-3, 3);
        const word = 'ВПУСТИ', n = Math.ceil(word.length * wr);
        P.sfText(word.slice(0, n), -P.sfWidth(word) / 2, 0, 'rgba(70,84,84,0.95)', 'rgba(200,214,212,0.35)');
        g.restore();
      }
      const slam = seg(t, 4800, 4900), slam2 = seg(t, 5000, 5100), slide = seg(t, 5500, 6600);
      if (slam > 0) palm(sx - 54, gy0 + 120 + slide * 50, v.soft ? 1.6 : 1.6 + (1 - slam) * 0.4, 'rgba(160,172,166,0.92)', -0.2);
      if (slam2 > 0) palm(sx + 58, gy0 + 112 + slide * 56, v.soft ? 1.7 : 1.7 + (1 - slam2) * 0.4, 'rgba(160,172,166,0.92)', 0.25);
      g.restore();
      g.restore();
      grain(110, 0.04); vign(0.65);
      black(seg(t, 6100, 6800));
    }
  };
  /* ---------- под прилавком: девочка в мокром платье царапает пол ---------- */
  V.under = {
    dur: 6600, scare: true,
    cues: [[500, 'match'], [1000, 'scratch'], [1900, 'scratch'], [2400, 'drip'], [3000, 'hush'], [4300, 'breath'], [4700, 'sting']],
    draw: function (t, v, now) {
      const g = cx();
      R(0, 0, W, H, '#0a0806');
      for (let k = 0; k < 4; k++) { R(0, 40 + k * 46, W, 3, '#2a1c12'); R(0, 40 + k * 46, W, 1, '#3e2a1c'); }   // полки
      R(0, 0, W, 10, '#2a1c14'); g.fillStyle = 'rgba(255,190,100,0.12)'; g.fillRect(0, 10, W, 4);
      [[280, 120, 40, 30, '#3a2a1a'], [330, 160, 30, 28, '#2e2216'], [300, 74, 26, 20, '#33251a']].forEach(function (b) { R(b[0], b[1], b[2], b[3], b[4]); R(b[0], b[1], b[2], 1, sh(b[4], 1.4)); });
      // девочка в углу, спиной; мокрые волосы, белая рубашка. Крупно — свет спички падает прямо на неё
      const turn = ease(seg(t, 3400, 4400)), sc = t < 2600 ? Math.sin(t / 90) : 0, fx = 150, fy = 112;
      g.save(); g.translate(fx, fy); g.scale(1.6, 1.6);
      g.fillStyle = '#c8c3b4'; g.beginPath(); g.moveTo(-24, 52); g.quadraticCurveTo(-28, 10, -6, 4); g.lineTo(8, 4); g.quadraticCurveTo(28, 10, 26, 52); g.closePath(); g.fill();
      g.fillStyle = '#a8a394'; g.fillRect(-24, 36, 50, 16); for (let k = 0; k < 6; k++) g.fillRect(-20 + k * 8, 18, 1, 30);   // мокрые складки
      g.fillStyle = 'rgba(60,70,70,0.35)'; g.fillRect(-24, 44, 50, 8);
      const hx = turn * 5;
      g.fillStyle = '#d2cec2'; g.beginPath(); g.ellipse(hx + turn * 3, -8, 11, 13, 0, 0, Math.PI * 2); g.fill();
      if (turn > 0.3) {                                                     // поворачивается: серое лицо, тёмные провалы глаз, вода изо рта
        const a = seg(turn, 0.3, 1); g.globalAlpha = a;
        g.fillStyle = '#9a968a'; g.beginPath(); g.ellipse(hx + 6, -6, 6, 11, 0, -Math.PI / 2, Math.PI / 2); g.fill();
        g.fillStyle = '#0a0a0a'; g.beginPath(); g.ellipse(hx + 1, -10, 2.4, 1.6, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(hx + 8, -10, 2, 1.6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1a0a0a'; g.fillRect(hx + 3, -1, 4, 2);
        g.fillStyle = 'rgba(110,140,140,0.8)'; g.fillRect(hx + 5, 1, 1, 8 + Math.sin(now / 200) * 2);
        g.globalAlpha = 1;
      }
      g.fillStyle = '#0b0c0d';                                                // мокрые волосы облепили голову и плечи
      g.beginPath(); g.ellipse(hx - turn * 3, -12, 12, 10, 0, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 9; k++) g.fillRect(hx - 12 + k * 2.6 - turn * (k < 4 ? 4 : 0), -10, 1.6, 20 + (k * 7) % 10 - (turn > 0.5 && k > 4 ? 12 : 0));
      const ax = 18 + sc * 3;                                                 // рука царапает доски
      g.strokeStyle = '#c8c3b4'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(14, 14); g.lineTo(ax + 8, 50); g.stroke();
      g.lineWidth = 1; g.strokeStyle = '#8a7a6a'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(ax + 6 + k * 2, 51); g.lineTo(ax + 9 + k * 2, 55); g.stroke(); }
      if (t > 2800 && t < 3600) { g.fillStyle = '#c8c3b4'; g.fillRect(-14, -22, 2, 8); }                      // палец поднят — «тсс»
      g.restore();
      R(0, 196, W, 20, '#1a120a'); for (let k = 0; k < 9; k++) R(k * 46, 196, 1, 20, '#0e0904');           // половицы
      if (t > 2600) P.sfText('ОН СЛЫШИТ', 196, 202, 'rgba(190,160,120,' + (0.9 * seg(t, 2600, 3200)).toFixed(3) + ')');
      if (t > 2000) { g.fillStyle = 'rgba(120,150,160,0.35)'; g.beginPath(); g.ellipse(fx + 10, 200, 46 * seg(t, 2000, 4000), 4, 0, 0, Math.PI * 2); g.fill(); }
      // спичка в твоей руке
      const on = t > 500 && t < (v.soft ? 4600 : 4450), mx = 262, my = 200 - seg(t, 0, 600) * 20;
      if (t > 300) { R(mx - 2, my - 14, 2, 20, '#e0d0b0'); palm(mx + 8, my + 10, 0.7, '#c8b6a0', -0.5); R(mx + 12, my + 14, 40, 9, '#22242a'); }
      const bend = seg(t, 4200, 4450);
      if (on) { const f = 1 + Math.sin(now / 45) * 0.1; R(mx - 2 - bend * 6, my - 20, 3, 6, '#ffd070'); R(mx - 1 - bend * 6, my - 18, 1, 3, '#fff4c8'); light([[mx - 40, my - 40, 250 * f * (1 - bend * 0.6), 1]], 0.93); warm(mx, my - 18, 130, 0.26); }
      else black(0.97);
      if (t > 300 && t < 500) for (let i = 0; i < 6; i++) R(mx + rnd(14), my - 16 + rnd(8), 1, 1, '#ffd070');
      grain(160, 0.05); vign(0.7);
      black(seg(t, 5800, 6600));
    }
  };
  /* ---------- зеркало: за твоим отражением кто-то стоит ---------- */
  V.behind = {
    dur: 6200, scare: true,
    cues: [[1600, 'thud'], [2600, 'thud'], [3600, 'whisper'], [4300, 'sting'], [5000, 'shriek', 'loud']],
    draw: function (t, v, now) {
      const g = cx();
      const c0 = zoomShop(now, 270, 58, 3.2), z = Z(c0[0], c0[1], 3.2);
      const mx = z.x(270), my = z.y(58), rx = 17 * 3.2, ry = 29 * 3.2;
      g.save(); g.beginPath(); g.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2); g.clip();
      const gr = g.createLinearGradient(0, my - ry, 0, my + ry); gr.addColorStop(0, '#121a1e'); gr.addColorStop(1, '#070a0d'); g.fillStyle = gr; g.fillRect(mx - rx, my - ry, rx * 2, ry * 2);
      R(mx - rx, my + 20, rx * 2, 3, '#1e1610'); R(mx + 20, my - 60, 14, 60, '#0e1215');            // отражение лавки: прилавок, дверной косяк
      warm(mx - 40, my + 50, 70, 0.2);
      // фигура позади: ближе после каждого «моргания»
      const st = t < 1600 ? 0 : t < 2600 ? 1 : t < 3600 ? 2 : 3, fs = [0.38, 0.62, 0.9, 1.1][st], fx = mx + [28, 24, 22, 16][st], fy = my - 18 + [-14, -4, 4, 8][st];
      if (t > 700) {
        g.save(); g.globalAlpha = Math.min(1, seg(t, 700, 1500) + (st ? 1 : 0)); if (st < 2) g.filter = 'blur(' + (st ? 0.8 : 1.4) + 'px)';
        g.fillStyle = '#030405'; g.beginPath(); g.moveTo(fx - 32 * fs, fy + 140 * fs); g.quadraticCurveTo(fx - 26 * fs, fy + 26 * fs, fx, fy + 20 * fs); g.quadraticCurveTo(fx + 26 * fs, fy + 26 * fs, fx + 32 * fs, fy + 140 * fs); g.closePath(); g.fill();
        g.fillRect(fx - 4 * fs, fy + 8 * fs, 8 * fs, 16 * fs);
        const snap = !v.soft && t > 5000 ? 1 : 0, lean = st >= 3 ? ease(seg(t, 3600, 4300)) * 16 : 0, fx2 = fx - lean;
        const fg = g.createLinearGradient(0, fy - 26 * fs, 0, fy + 12 * fs); fg.addColorStop(0, '#a6aaa2'); fg.addColorStop(1, '#4e524c');
        g.fillStyle = fg; g.beginPath(); g.ellipse(fx2, fy - 6 * fs, 9 * fs, 21 * fs, snap ? 0 : -0.18, 0, Math.PI * 2); g.fill();     // длинное узкое лицо
        g.fillStyle = '#060606';
        g.beginPath(); g.ellipse(fx2 - 3.5 * fs, fy - 10 * fs, (2.4 + snap) * fs, (1.4 + snap * 1.4) * fs, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(fx2 + 3.5 * fs, fy - 10 * fs, (2.4 + snap) * fs, (1.4 + snap * 1.4) * fs, 0, 0, Math.PI * 2); g.fill();
        if (snap) { R(fx2 - 4 * fs, fy - 11 * fs, 1, 1, '#e8e8d8'); R(fx2 + 3 * fs, fy - 11 * fs, 1, 1, '#e8e8d8'); }
        g.fillRect(fx2 - 4 * fs, fy + 4 * fs, 8 * fs, Math.max(1, (1 + snap * 3) * fs));                 // рот — тонкая щель
        if (st >= 3) { g.strokeStyle = '#8e928a'; g.lineCap = 'round'; for (let f = 0; f < 4; f++) { g.lineWidth = 2.2; g.beginPath(); g.moveTo(fx - 20, my + 30 + f * 3); g.quadraticCurveTo(fx - 34, my + 26 + f * 4, fx - 46 - f * 3, my + 32 + f * 5); g.stroke(); } }
        g.restore();
      }
      // отражение героини: картуз, красный шарф, лицо в полутени. Под конец оно поворачивается к нему — само — и улыбается
      const look = ease(seg(t, 4300, 5000)), hx = mx - 10, hy = my + 18;
      g.fillStyle = '#181a20'; g.beginPath(); g.moveTo(hx - 50, hy + 80); g.quadraticCurveTo(hx - 44, hy + 30, hx, hy + 26); g.quadraticCurveTo(hx + 44, hy + 30, hx + 50, hy + 80); g.closePath(); g.fill();
      R(hx - 15, hy + 18, 30, 10, '#5e2220'); R(hx - 15, hy + 18, 30, 2, '#7e3230'); R(hx - 6, hy + 12, 12, 7, '#6e5848');
      g.fillStyle = '#b09682'; g.beginPath(); g.ellipse(hx + look * 4, hy, 15, 19, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(40,26,20,0.55)'; g.beginPath(); g.ellipse(hx + 6 + look * 4, hy + 1, 9, 18, 0, -Math.PI / 2, Math.PI / 2); g.fill();   // полутень
      const ex = look * 6;
      R(hx - 8 + ex, hy - 3, 4, 2, '#1e140e'); R(hx + 3 + ex, hy - 3, 4, 2, '#1e140e'); R(hx - 9 + ex, hy - 6, 6, 1, '#4a3428'); R(hx + 2 + ex, hy - 6, 6, 1, '#4a3428');
      R(hx + ex * 0.6, hy, 1, 5, '#7a6252');
      if (look < 0.6) R(hx - 4, hy + 9, 8, 1, '#5a3a30');
      else { R(hx - 2 + ex, hy + 9, 9, 1, '#4a2a24'); R(hx + 7 + ex, hy + 8, 2, 1, '#4a2a24'); R(hx - 3 + ex, hy + 8, 1, 1, '#4a2a24'); }
      R(hx - 17 + look * 3, hy - 24, 32, 9, '#141418'); R(hx - 15 + look * 3, hy - 26, 28, 3, '#1c1c22'); R(hx - 20 + look * 8, hy - 15, 22, 3, '#0a0a0e');
      g.fillStyle = 'rgba(200,216,214,' + (0.6 * seg(t, 5300, 6000)).toFixed(3) + ')'; g.fillRect(mx - rx, my - ry, rx * 2, ry * 2);
      g.restore();
      [1600, 2600, 3600].forEach(function (b) { if (t > b - 90 && t < b + 60) black(1); });
      grain(120, 0.04); vign(0.75);
      black(seg(t, 5700, 6200));
    }
  };
  /* ---------- спичка: кто-то стоит вплотную, улыбается и задувает огонь ---------- */
  V.match = {
    dur: 5800, scare: true,
    cues: [[600, 'match'], [3000, 'sting'], [4000, 'breath'], [4700, 'knock3', 'loud']],
    draw: function (t, v, now) {
      const g = cx();
      R(0, 0, W, H, '#000');
      if (t < 900) { if (t > 600) for (let i = 0; i < 8; i++) R(196 + rnd(24), 186 + rnd(10), 1, 1, '#ffd070'); grain(60, 0.03); return; }
      const out = t > 4300, bend = seg(t, 3950, 4300), f = 1 + Math.sin(now / 45) * 0.08;
      R(0, 176, W, 40, '#2a1c12'); R(0, 176, W, 1, '#5a4030');                            // край прилавка
      // пальто вплотную, дышит
      const br = Math.sin(t / 700) * 2, lean = ease(seg(t, 3800, 4300)) * 26;
      R(110, 40 + br, 164, 140, '#16141a'); R(186, 40 + br, 2, 136, '#0a090c');
      [70, 100, 130].forEach(function (y) { R(178, y + br, 4, 4, '#3a3428'); });
      R(150, 20 + br, 84, 26, '#16141a');
      // нижняя половина лица в свете снизу; выше носа — тьма. Улыбка тянется дальше, чем бывает у людей
      const fy = 46 + lean * 1.4 + br, sm = ease(seg(t, 3000, 3800));
      const jg = g.createLinearGradient(0, fy - 22, 0, fy + 24); jg.addColorStop(0, 'rgba(40,40,36,0)'); jg.addColorStop(0.45, '#6e7068'); jg.addColorStop(1, '#b4b6aa');
      g.fillStyle = jg; g.beginPath(); g.moveTo(166, fy - 22); g.quadraticCurveTo(164, fy + 8, 178, fy + 20); g.quadraticCurveTo(192, fy + 28, 206, fy + 20); g.quadraticCurveTo(220, fy + 8, 218, fy - 22); g.closePath(); g.fill();
      R(184, fy + 22, 16, 1, '#8a8c82');
      const mw = 9 + sm * 22, my2 = fy + 6;                                                  // рот: тонкие губы, уголки вверх
      g.strokeStyle = '#1a0c0c'; g.lineWidth = 1.5 + sm; g.beginPath(); g.moveTo(192 - mw, my2 - sm * 8); g.quadraticCurveTo(192, my2 + 4 + sm * 3, 192 + mw, my2 - sm * 8); g.stroke();
      if (sm > 0.4) { g.fillStyle = '#b8b098'; [-10, -6, -1, 3, 8, 12].forEach(function (k, i) { g.fillRect(192 + k, my2 + 1 + (i % 2), 2, 2 + (i % 3)); }); }
      if (lean > 8) { const a = seg(lean, 8, 36); g.globalAlpha = a; R(188, fy - 14, 8, 9, '#7a7c72'); R(188, fy - 7, 2, 2, '#141210'); R(194, fy - 7, 2, 2, '#141210'); g.globalAlpha = 1; }   // кончик носа, ноздри
      // рука со спичкой
      R(190, 168, 2, 26, '#e0d0b0'); palm(198, 206, 0.75, '#c8b6a0', -0.5); R(204, 210, 30, 8, '#22242a');
      if (!out) { R(189 - bend * 8, 160 - bend * 2, 3, 8, '#ffd070'); R(190 - bend * 8, 162, 1, 4, '#fff4c8'); light([[191, 150, 240 * f * (1 - bend * 0.7), 1]], 0.95); warm(191, 160, 130, 0.3); }
      else { black(0.985); R(190, 160, 1, 3, 'rgba(120,120,120,0.6)'); g.fillStyle = 'rgba(160,160,160,0.18)'; g.fillRect(189 + rnd(2), 140 - seg(t, 4300, 5200) * 30, 2, 18); }
      if (!v.soft && t > 4700 && t < 4900) { g.save(); shake(g, 5); g.restore(); black(0.4); }
      grain(150, 0.05); vign(0.8);
      black(seg(t, 5300, 5800));
    }
  };
  /* ---------- шкатулка Агаты: часы без стрелок, в стекле — лицо, трещина ---------- */
  V.box = {
    dur: 6400, scare: true,
    cues: [[300, 'creak'], [1700, 'tick'], [1950, 'tick'], [2200, 'tick'], [2450, 'tick'], [2750, 'tick'], [3100, 'tick'], [3500, 'tick'], [4400, 'crack'], [4410, 'sting']],
    draw: function (t, v, now) {
      const g = cx();
      R(0, 0, W, H, '#1a110a');
      for (let k = 0; k < 9; k++) R(0, k * 24, W, 1, '#24180f');
      const op = ease(seg(t, 200, 1500));
      R(92, 60, 200, 130, '#2a1c14'); R(92, 60, 200, 2, '#4a3220');
      [[92, 60], [286, 60], [92, 184], [286, 184]].forEach(function (c) { R(c[0], c[1], 6, 6, '#b8923e'); });
      R(100, 68, 184, 114, '#4a0e14');                                                    // бархат
      for (let k = 0; k < 6; k++) R(100, 72 + k * 18, 184, 1, '#3a0a10');
      const wx = 192, wy = 126;
      ell(wx, wy, 40, 40, '#8a8a90'); ell(wx, wy, 36, 36, '#c9c9d2'); ell(wx, wy, 32, 32, '#e8e4d8');
      R(wx - 3, wy - 50, 6, 10, '#8a8a90'); ell(wx, wy - 52, 6, 4, '#8a8a90');
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; R(Math.round(wx + Math.sin(a) * 26) - 1, Math.round(wy - Math.cos(a) * 26) - 1, 2, 2, '#3a3a40'); }
      R(wx - 1, wy - 1, 2, 2, '#3a3a40');                                                  // стрелок нет
      const face = ease(seg(t, 3200, 4400));
      if (face > 0) {                                                                      // в стекле — дядя Матвей
        g.save(); g.beginPath(); g.ellipse(wx, wy, 32, 32, 0, 0, Math.PI * 2); g.clip();
        g.globalAlpha = 0.8 * face;
        oldFace(wx, wy + 2, 0.95, face * 3, face * 0.8);
        g.globalAlpha = 1; g.restore();
      }
      if (t > 4400) { g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(wx - 28, wy - 14); g.lineTo(wx - 6, wy - 2); g.lineTo(wx + 4, wy + 16); g.lineTo(wx + 26, wy + 20); g.moveTo(wx - 6, wy - 2); g.lineTo(wx + 8, wy - 26); g.stroke(); }
      if (op < 1) {                                                                        // крышка поднимается
        const lh = (1 - op) * 130;
        R(92, 60 + 130 - lh, 200, lh, '#3a2a22'); R(92, 60 + 130 - lh, 200, 2, '#5a4030');
      } else { R(92, 34, 200, 26, '#3a2a22'); R(92, 34, 200, 2, '#5a4030'); }
      light([[60, 40, 300, 1]], 0.8); warm(60, 40, 200, 0.18);
      if (!v.soft && t > 4400 && t < 4600) black(0.5);
      grain(100, 0.04); vign(0.6);
      black(seg(t, 5600, 6400));
    }
  };
  /* ---------- проснувшееся зеркало: дядя Матвей пытается сказать, его утаскивают ---------- */
  V.matvey = {
    dur: 6600, scare: true,
    cues: [[1200, 'knock1'], [2300, 'whisper'], [3700, 'growl'], [4600, 'scratch'], [4650, 'shriek', 'loud'], [4660, 'sting']],
    draw: function (t, v, now) {
      const g = cx();
      g.save(); if (!v.soft && t > 4600 && t < 5100) shake(g, 4);
      const c0 = zoomShop(now, 270, 58, 3.2), z = Z(c0[0], c0[1], 3.2);
      const mx = z.x(270), my = z.y(58), rx = 17 * 3.2, ry = 29 * 3.2;
      g.save(); g.beginPath(); g.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2); g.clip();
      R(mx - rx, my - ry, rx * 2, ry * 2, '#0a0e12');
      const pull = ease(seg(t, 4600, 5200)), s = (0.4 + ease(seg(t, 2200, 3200)) * 0.75) * (1 - pull * 0.9), a = seg(t, 2200, 2800) * (1 - pull);
      if (a > 0) {
        const fx = mx, fy = my - 6;
        g.globalAlpha = a;
        g.fillStyle = '#16161a'; g.beginPath(); g.moveTo(fx - 50 * s, fy + 110 * s); g.quadraticCurveTo(fx - 44 * s, fy + 30 * s, fx, fy + 26 * s); g.quadraticCurveTo(fx + 44 * s, fy + 30 * s, fx + 50 * s, fy + 110 * s); g.closePath(); g.fill();
        const talk = t < 3700 ? Math.abs(Math.sin(t / 110)) * 3 : 3.5;
        oldFace(fx, fy, s * 1.3, talk, t > 3600 ? 0.8 : 0);
        if (t > 3600) {                                                                    // чёрные руки из глубины хватают за плечи
          const k = ease(seg(t, 3600, 4400));
          g.save(); g.lineCap = 'round'; g.strokeStyle = '#020203';
          [-1, 1].forEach(function (sd) {
            const sx0 = fx + sd * 80, sy0 = fy - 90, ex = fx + sd * 34 * s, ey = fy + 34 * s, hx = sx0 + (ex - sx0) * k, hy = sy0 + (ey - sy0) * k;
            g.lineWidth = 7; g.beginPath(); g.moveTo(sx0, sy0); g.quadraticCurveTo(fx + sd * 70, fy - 10, hx, hy); g.stroke();
            g.lineWidth = 2.5; for (let f = 0; f < 4; f++) { g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(hx - sd * (4 + f * 3), hy + 8, hx - sd * (6 + f * 4), hy + 16 + f); g.stroke(); }
          });
          g.restore();
        }
        g.globalAlpha = 1;
      }
      if (pull > 0) { g.strokeStyle = 'rgba(200,210,210,0.5)'; g.lineWidth = 1; for (let f = 0; f < 4; f++) { g.beginPath(); g.moveTo(mx - 20 + f * 10, my + 20); g.lineTo(mx - 24 + f * 10, my + 20 - pull * 60); g.stroke(); } }
      const fog = seg(t, 0, 1200) * (1 - seg(t, 2000, 2600) * 0.7);
      g.fillStyle = 'rgba(200,216,214,' + (0.55 * fog).toFixed(3) + ')'; g.fillRect(mx - rx, my - ry, rx * 2, ry * 2);
      if (t > 1200) palm(mx - 20, my + 30, 1, 'rgba(60,70,70,' + (0.6 * (1 - seg(t, 2400, 3000))).toFixed(3) + ')', 0.1);
      g.restore(); g.restore();
      grain(110, 0.04); vign(0.75);
      black(seg(t, 5800, 6600));
    }
  };
  /* ---------- Кредитор вплотную: цилиндр, тьма вместо лица, перчатка закрывает глаза ---------- */
  V.creditor = {
    dur: 4400, scare: true,
    cues: [[800, 'growl'], [1700, 'breath'], [2700, 'sting'], [2710, 'thud', 'loud']],
    draw: function (t, v, now) {
      const g = cx();
      if (t < 800) { P.shop(now); black(seg(t, 0, 800) * 0.6); return; }
      g.save(); if (!v.soft && t > 2700 && t < 3000) shake(g, 5);
      R(0, 0, W, H, '#060506');
      warm(40, 120, 200, 0.16);
      const k = 1 + ease(seg(t, 1500, 2800)) * 0.7, cxk = 192, cyk = 96;                  // он наклоняется всё ближе
      g.save(); g.translate(cxk, cyk); g.scale(k, k); g.translate(-cxk, -cyk);
      g.fillStyle = '#020203';
      g.beginPath(); g.moveTo(-20, 216); g.quadraticCurveTo(10, 150, 130, 140); g.lineTo(254, 140); g.quadraticCurveTo(374, 150, 404, 216); g.closePath(); g.fill();   // плечи
      g.fillStyle = '#c8c4b4'; g.beginPath(); g.moveTo(164, 140); g.lineTo(192, 196); g.lineTo(220, 140); g.closePath(); g.fill();           // воротничок
      g.fillStyle = '#4a0808'; g.beginPath(); g.moveTo(180, 142); g.lineTo(192, 176); g.lineTo(204, 142); g.closePath(); g.fill();           // галстук
      g.fillStyle = '#020203'; g.beginPath(); g.ellipse(192, 104, 46, 50, 0, 0, Math.PI * 2); g.fill();                                     // голова — тьма
      R(146, -40, 92, 104, '#020203'); R(112, 58, 160, 10, '#020203'); R(146, 50, 92, 7, '#3a0606');                                          // цилиндр
      g.fillStyle = 'rgba(255,190,110,0.22)'; g.fillRect(112, 58, 60, 1); g.fillRect(146, -40, 1, 98); g.fillRect(126, 150, 1, 30);          // отсвет лампы по краю
      if (Math.floor(now / 90) % 17) { R(176, 96, 3, 2, '#e8e4d0'); R(205, 96, 3, 2, '#e8e4d0'); }
      g.restore();
      g.restore();
      grain(140, 0.05); vign(0.75);      black(seg(t, v.soft ? 2400 : 2900, v.soft ? 3200 : 3000));
    }
  };
  /* ---------- ЗАЛОГ: книга, твоё имя, на полке новая вещь ---------- */
  V.pawn = {
    dur: 5600, scare: false,
    cues: [[600, 'page'], [2600, 'thud'], [3600, 'sting']],
    draw: function (t, v, now) {
      const g = cx();
      if (t < 3000) {
        R(0, 0, W, H, '#0c0806');
        R(70, 40, 244, 150, '#0e0c0a'); R(80, 46, 110, 138, '#d8ceb0'); R(194, 46, 110, 138, '#d0c6a6'); R(190, 46, 4, 138, '#9a8a66');
        for (let k = 0; k < 11; k++) { R(90, 58 + k * 11, 70 + (k * 13) % 24, 1, '#6a6050'); R(204, 58 + k * 11, 60 + (k * 7) % 30, 1, '#6a6050'); }
        const w = seg(t, 600, 2000), word = 'НАСЛЕДНИК';
        const n = Math.ceil(word.length * w);
        P.sfText(word.slice(0, n), 206, 172, '#3a0a08');
        const close = ease(seg(t, 2200, 2700));
        if (close > 0) { R(194 - close * 114, 46, close * 114, 138, '#141016'); R(194 - close * 114, 46, 2, 138, '#2a2030'); }
        light([[192, 110, 220, 1]], 0.7); warm(192, 110, 160, 0.14);
      } else {
        P.shop(now);
        const k = seg(t, 3000, 3600);
        R(307, 30, 14, 15, 'rgba(0,0,0,0)');
        g.globalAlpha = k;                                                                  // на верхней полке — новая вещь: ты
        R(310, 34, 4, 4, '#caa68a'); R(309, 32, 6, 2, '#131317'); R(309, 38, 6, 7, '#24262d'); R(311, 38, 2, 2, '#6e2622');
        R(315, 40, 3, 2, '#d8ceb0'); g.globalAlpha = 1;
        black(0.25 + seg(t, 4400, 5600) * 0.75);
      }
      grain(80, 0.04);
    }
  };
  /* ---------- ПУСТОЙ: глаза в темноте, потом все смотрят на тебя ---------- */
  V.eyes = {
    dur: 4400, scare: true,
    cues: [[0, 'whisper'], [1500, 'whisper'], [3500, 'shriek', 'loud']],
    draw: function (t, v, now) {
      const g = cx(); R(0, 0, W, H, '#000');
      const p = Math.min(1, t / 2800), n = Math.floor(Math.pow(p, 1.4) * 30) + 1, centre = ease(seg(t, 2800, 3200)), shut = t > 3200 && t < 3500;
      if (!shut && t < 3500) for (let i = 0; i < n; i++) {
        // глаз: миндалевидный разрез во тьме, веки, радужка; дальние — тусклее
        const x = 20 + hsh(i, 1) * (W - 40), y = 18 + hsh(i, 2) * (H - 36), r = 4 + hsh(i, 3) * 6, d = 0.45 + hsh(i, 4) * 0.55;
        const open = Math.min(1, (p * 30 - i) / 2.5) * (Math.sin(now / (300 + i * 37) + i) > 0.97 ? 0.15 : 1);
        if (open <= 0.05) continue;
        const tx = S.mouse.x + (W / 2 - S.mouse.x) * centre, ty = S.mouse.y + (H / 2 - S.mouse.y) * centre, dx = tx - x, dy = ty - y, dd = Math.max(1, Math.hypot(dx, dy));
        g.save(); g.globalAlpha = d;
        g.beginPath(); g.moveTo(x - r * 1.7, y); g.quadraticCurveTo(x, y - r * 1.15 * open, x + r * 1.7, y); g.quadraticCurveTo(x, y + r * 0.9 * open, x - r * 1.7, y); g.closePath();
        g.fillStyle = '#bdb6a2'; g.fill(); g.clip();
        g.fillStyle = 'rgba(120,30,20,0.35)'; g.fillRect(x - r * 1.7, y - 1, r * 0.8, 1); g.fillRect(x + r, y, r * 0.7, 1);
        const ix = x + dx / dd * r * 0.7, iy = y + dy / dd * r * 0.35;
        ell(ix, iy, r * 0.62, r * 0.62, '#4a3a22'); ell(ix, iy, r * 0.3, r * 0.3, '#050505'); R(ix - r * 0.3, iy - r * 0.35, 1, 1, '#f0ece0');
        g.restore();
        g.strokeStyle = 'rgba(30,20,16,' + d + ')'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - r * 1.8, y); g.quadraticCurveTo(x, y - r * 1.25 * open, x + r * 1.8, y); g.stroke();
      }
      if (!v.soft && t > 3500 && t < 4000) {                                                  // все разом закрылись — и открылся один, огромный
        const k = ease(seg(t, 3500, 3700));
        g.save(); g.beginPath(); g.moveTo(10, 108); g.quadraticCurveTo(192, 108 - 120 * k, 374, 108); g.quadraticCurveTo(192, 108 + 96 * k, 10, 108); g.closePath();
        g.fillStyle = '#c4bca6'; g.fill(); g.clip();
        g.fillStyle = 'rgba(140,30,20,0.5)'; for (let i = 0; i < 9; i++) { g.fillRect(20 + i * 10, 104 + (i % 3) * 3, 40, 1); g.fillRect(300 - i * 9, 106 + (i % 2) * 4, 40, 1); }
        ell(192, 108, 52, 52, '#3e2e1a'); ell(192, 108, 20 - k * 8, 20 - k * 8, '#000'); R(176, 92, 4, 3, '#f0ece0');
        g.restore();
      }      grain(90, 0.05);
      black(seg(t, 4000, 4400));
    }
  };
  /* ---------- часы бьют тринадцать: дверца футляра открывается ---------- */
  V.clock13 = {
    dur: 5200, scare: false,
    cues: [[400, 'chime13']],
    draw: function (t, v, now) {
      const g = cx(), z = 2.6;
      zoomShop(now, 116, 52, z);
      const strikes = Math.min(13, Math.floor(seg(t, 400, 4200) * 13.99));
      const ROM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'], ph = (seg(t, 400, 4200) * 13.99) % 1;
      if (strikes) { g.globalCompositeOperation = 'lighter'; glow(116 * 0 + W / 2, 70, 120, '255,200,120', 0.12 * (1 - ph)); g.globalCompositeOperation = 'source-over'; g.font = 'italic 22px Georgia, serif'; g.textAlign = 'center'; g.fillStyle = strikes === 13 ? 'rgba(220,80,60,' + (1 - ph * 0.5) + ')' : 'rgba(240,226,190,' + (0.9 - ph * 0.6) + ')'; g.fillText(ROM[strikes], W / 2 + 120, 200); }
      if (t > 4200) { const k = ease(seg(t, 4200, 5000)); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(W / 2 - 26, 110, 52 * k, 90); R(W / 2 - 26 + 52 * k, 110, 4, 90, '#3a281b'); }
      vign(0.5);
    }
  };
  /* ---------- фотография над прилавком: с каждой ночью человек в цилиндре ближе ---------- */
  V.photo = {
    dur: 999999, scare: false, hold: true, cues: [],
    draw: function (t, v, now) {
      const g = cx(), st = v.o.stage || 0;
      R(0, 0, W, H, '#0c0806');
      R(102, 8, 180, 200, '#2a1b12'); R(106, 12, 172, 192, '#1a120c');
      const sep = function (k) { const a = Math.round(170 * k), b = Math.round(140 * k), c = Math.round(100 * k); return 'rgb(' + a + ',' + b + ',' + c + ')'; };
      R(114, 20, 156, 176, sep(0.62));
      for (let y = 20; y < 196; y += 2) { g.fillStyle = 'rgba(60,40,20,' + (0.05 + 0.04 * Math.sin(y)).toFixed(3) + ')'; g.fillRect(114, y, 156, 1); }
      R(124, 40, 136, 120, sep(0.45));                                                     // фасад лавки
      R(124, 34, 136, 8, sep(0.35)); P.sfText('ПОСЛЕДНИЙ ЧАС', 140, 36, sep(0.85));
      R(176, 70, 34, 90, sep(0.12));                                                       // тёмный проём двери
      R(132, 70, 34, 40, sep(0.3)); R(218, 70, 34, 40, sep(0.3));
      R(114, 160, 156, 36, sep(0.5));
      // Крюк с дочерью у входа
      R(146, 104, 18, 56, sep(0.2)); ell(155, 96, 7, 8, sep(0.72)); R(148, 98, 14, 6, sep(0.25)); R(150, 104, 10, 4, sep(0.3));
      R(168, 128, 12, 32, sep(0.75)); ell(174, 122, 5, 6, sep(0.72)); R(170, 117, 8, 4, sep(0.3));
      // он: в проёме → за Крюком → рука на плече девочки → смотрит в объектив
      if (st >= 1) {
        const px = [0, 193, 168, 182][st], py = [0, 84, 88, 92][st], s = [0, 0.7, 0.95, 1.05][st];
        R(px - 8 * s, py, 16 * s, 70 * s, sep(0.08)); R(px - 7 * s, py - 26 * s, 14 * s, 14 * s, sep(0.08)); R(px - 11 * s, py - 13 * s, 22 * s, 3 * s, sep(0.08));
        ell(px, py - 6 * s, 6 * s, 7 * s, st >= 3 ? sep(0.8) : sep(0.15));
        if (st >= 3) { R(px - 3 * s, py - 8 * s, 2, 2, '#f0f0e0'); R(px + 2 * s, py - 8 * s, 2, 2, '#f0f0e0'); pline(Math.round(px + 6 * s), Math.round(py + 10 * s), 176, 120, sep(0.08)); }
      }
      for (let i = 0; i < 40; i++) R(114 + Math.floor(hsh(i, 61) * 156), 20 + Math.floor(hsh(i, 62) * 176), 1, 1, 'rgba(240,230,200,0.3)');
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(114, 20, 6, 176); g.fillRect(264, 20, 6, 176);
      g.fillStyle = '#c8b890'; g.font = 'italic 9px Georgia, serif'; g.textAlign = 'center'; g.fillText('«Последний час». Открытие. 7 ноября', 192, 206);
      vign(0.6);
    }
  };

  /* ---------- проигрывание ---------- */
  function draw(now) {
    const v = S.vision; if (!v) return false;
    const D = V[v.id]; if (!D) { S.vision = null; return false; }
    const t = (now - v.t0) / v.k;
    if (t > D.dur && !D.hold) { R(0, 0, W, H, '#000'); return true; }
    D.draw(Math.max(0, t), v, now);
    return true;
  }
  return { V: V, draw: draw, get: function (id) { return V[id]; } };
})();
