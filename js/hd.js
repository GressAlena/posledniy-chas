'use strict';
/* ============================================================
   HD-ЖИВОПИСЬ. Места внутри (собор, кладбище, дом Агаты…) и
   видеозаставки рисуются не пиксельными блоками, а «кистью» на
   холсте 1536x864 — градиенты, свет, туман, мелкие детали.
   Координаты те же, что у пиксельной сцены: 384x216.
   Посетитель остаётся пиксельным и кладётся поверх.
   ============================================================ */
const HD = (function () {
  const W = 384, H = 216, K = 4;
  let cv = null, main = null, g = null, shown = false, broken = false;
  let lightL = null, vigL = null;

  /* ---------- холсты ---------- */
  function mkL(w, h, k) {
    k = k || K;
    const c = document.createElement('canvas'); c.width = Math.round((w || W) * k); c.height = Math.round((h || H) * k);
    c.getContext('2d').setTransform(k, 0, 0, k, 0, 0); return c;
  }
  function into(c, fn) { const old = g; g = c.getContext('2d'); try { fn(g); } finally { g = old; } return c; }

  /* ---------- случайность и цвет ---------- */
  function RNG(a) {
    a = (a * 2654435761) >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function sh(h, f) { const a = hex(h); return 'rgb(' + a.map(function (v) { return Math.max(0, Math.min(255, Math.round(v * f))); }).join(',') + ')'; }
  function mix(h1, h2, t) { const a = hex(h1), b = hex(h2); return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(',') + ')'; }
  function rgba(c, a) { return 'rgba(' + c + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; }

  /* ---------- кисти ---------- */
  function rect(x, y, w, h, f) { g.fillStyle = f; g.fillRect(x, y, w, h); }
  function rr(x, y, w, h, r, f) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = f; g.fill(); }
  function poly(p, f) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fillStyle = f; g.fill(); }
  function ell(x, y, rx, ry, f, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, 6.2832); g.fillStyle = f; g.fill(); }
  function line(x0, y0, x1, y1, c, w) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = c; g.lineWidth = w || 0.3; g.stroke(); }
  function pl(p, c, w, close) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); if (close) g.closePath(); g.strokeStyle = c; g.lineWidth = w || 0.3; g.stroke(); }
  function LG(x0, y0, x1, y1, st) { const q = g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) q.addColorStop(st[i], st[i + 1]); return q; }
  function RG(x, y, r0, r1, st) { const q = g.createRadialGradient(x, y, r0, x, y, r1); for (let i = 0; i < st.length; i += 2) q.addColorStop(st[i], st[i + 1]); return q; }
  function vg(x, y, w, h, c0, c1) { rect(x, y, w, h, LG(0, y, 0, y + h, [0, c0, 1, c1])); }
  function hg(x, y, w, h, st) { rect(x, y, w, h, LG(x, 0, x + w, 0, st)); }
  function glow(x, y, r, c, a, mode) {
    g.save(); g.globalCompositeOperation = mode || 'lighter';
    g.fillStyle = RG(x, y, 0, r, [0, rgba(c, a), 0.3, rgba(c, a * 0.45), 0.65, rgba(c, a * 0.12), 1, rgba(c, 0)]);
    g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }
  function shade(x, y, rx, ry, a) {
    g.save(); g.translate(x, y); g.scale(1, ry / rx);
    g.fillStyle = RG(0, 0, 0, rx, [0, 'rgba(0,0,0,' + a + ')', 1, 'rgba(0,0,0,0)']); g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
  }
  function scaleOf() { return g.getTransform().a; }
  function blur(px, fn) { if (window.__noBlur) { fn(); return; } g.save(); g.filter = 'blur(' + (px * scaleOf()).toFixed(2) + 'px)'; try { fn(); } finally { g.restore(); } }
  function arch(x, y, w, h) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); }
  function goldG(x0, y0, x1, y1) { return LG(x0, y0, x1, y1, [0, '#3e2a0c', 0.22, '#a8823a', 0.45, '#f2d88c', 0.6, '#c49a42', 1, '#3a260a']); }
  function brassG(x0, x1) { return LG(x0, 0, x1, 0, [0, '#2a1a08', 0.18, '#8a6a2c', 0.4, '#f0d690', 0.52, '#c89a46', 0.8, '#5a3e16', 1, '#1e1206']); }

  /* ---------- фактуры ---------- */
  let NZ = null, MOT = null;
  function noiseC() {
    if (NZ) return NZ;
    NZ = document.createElement('canvas'); NZ.width = NZ.height = 256;
    const x = NZ.getContext('2d'), d = x.createImageData(256, 256), r = RNG(5);
    for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255 | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); return NZ;
  }
  function motC() {
    if (MOT) return MOT;
    MOT = document.createElement('canvas'); MOT.width = MOT.height = 256;
    const x = MOT.getContext('2d'), r = RNG(9);
    x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 240; i++) {
      const px = r() * 256, py = r() * 256, rad = 6 + r() * 30, v = r() < 0.5 ? 0 : 255, a = 0.05 + r() * 0.12;
      for (let dx = -256; dx <= 256; dx += 256) for (let dy = -256; dy <= 256; dy += 256) {
        const q = x.createRadialGradient(px + dx, py + dy, 0, px + dx, py + dy, rad);
        q.addColorStop(0, 'rgba(' + v + ',' + v + ',' + v + ',' + a + ')'); q.addColorStop(1, 'rgba(' + v + ',' + v + ',' + v + ',0)');
        x.fillStyle = q; x.fillRect(px + dx - rad, py + dy - rad, rad * 2, rad * 2);
      }
    }
    return MOT;
  }
  /* фактура поверх уже закрашенного: шум (мелкий) или пятна (крупные) */
  function tex(x, y, w, h, a, mode, which, sc) {
    const p = g.createPattern(which === 'mot' ? motC() : noiseC(), 'repeat'), s = (sc || 1) / scaleOf();
    p.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
    g.save(); g.globalAlpha = a; g.globalCompositeOperation = mode || 'overlay'; g.fillStyle = p; g.fillRect(x, y, w, h); g.restore();
  }
  /* туман: бесшовные полосы мягких клубов, ползут по времени */
  const FOG = {};
  function fogT(i, c) {
    const key = i + '|' + c; if (FOG[key]) return FOG[key];
    const t = document.createElement('canvas'); t.width = 768; t.height = 160;
    const x = t.getContext('2d'), r = RNG(31 + i * 17);
    for (let k = 0; k < 90; k++) {
      const bx = r() * 768, by = 30 + r() * 100, rad = 24 + r() * 60, a = 0.05 + r() * 0.09;
      for (let dx = -768; dx <= 768; dx += 768) {
        const q = x.createRadialGradient(bx + dx, by, 0, bx + dx, by, rad);
        q.addColorStop(0, 'rgba(' + c + ',' + a + ')'); q.addColorStop(1, 'rgba(' + c + ',0)');
        x.fillStyle = q; x.fillRect(bx + dx - rad, by - rad, rad * 2, rad * 2);
      }
    }
    return (FOG[key] = t);
  }
  function fog(y, h, now, spd, a, c, i) {
    const t = fogT(i || 0, c || '190,200,200'), tw = W * 2, off = ((((now || 0) * (spd === undefined ? 4 : spd) / 1000) % tw) + tw) % tw;
    g.save(); g.globalAlpha = a;
    for (let x = -off; x < W; x += tw) g.drawImage(t, x, y, tw, h);
    g.restore();
  }
  /* луч света из окна */
  /* без фильтра размытия: мягкие края — из нескольких вложенных трапеций (дёшево в каждом кадре) */
  function shaft(x0, y0, w0, x1, y1, w1, c, a) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = LG(x0, y0, x1, y1, [0, rgba(c, a / 3), 0.6, rgba(c, a / 6), 1, rgba(c, 0)]);
    [1, 0.78, 0.56].forEach(function (k) {
      g.beginPath(); g.moveTo(x0 - w0 * k / 2, y0); g.lineTo(x0 + w0 * k / 2, y0); g.lineTo(x1 + w1 * k / 2, y1); g.lineTo(x1 - w1 * k / 2, y1); g.closePath(); g.fill();
    });
    g.restore();
  }
  /* мягкое пятно (вместо размытого эллипса) и мягкая тень прямоугольника */
  function puff(x, y, rx, ry, c, a) {
    g.save(); g.translate(x, y); g.scale(1, ry / rx);
    g.fillStyle = RG(0, 0, 0, rx, [0, rgba(c, a), 0.5, rgba(c, a * 0.6), 1, rgba(c, 0)]); g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
  }
  function softRect(x, y, w, h, s, a) {
    for (let i = 4; i >= 1; i--) { const e = s * i / 4; rr(x - e, y - e, w + 2 * e, h + 2 * e, e + 0.5, 'rgba(0,0,0,' + (a / 4).toFixed(3) + ')'); }
  }
  /* пылинки, медленно плывущие в свете */
  function motes(now, x, y, w, h, n, seed, c, a, clip) {
    const r = RNG(seed);
    g.save();
    if (clip) { g.beginPath(); g.moveTo(clip[0], clip[1]); for (let i = 2; i < clip.length; i += 2) g.lineTo(clip[i], clip[i + 1]); g.closePath(); g.clip(); }
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const bx = r(), by = r(), sp = 0.4 + r(), ph = r() * 6.28, sz = 0.16 + r() * 0.3;
      const px = x + ((((bx * w + Math.sin(now / 2600 * sp + ph) * 5 + now / 1400 * sp) % w) + w) % w);
      const py = y + ((((by * h + now / 2100 * sp + Math.cos(now / 2300 + ph) * 3) % h) + h) % h);
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(now / 700 * sp + ph));
      g.fillStyle = rgba(c, a * tw); g.beginPath(); g.arc(px, py, sz, 0, 6.2832); g.fill();
    }
    g.restore();
  }
  /* пламя свечи: язычок, синее донце, ореол */
  function flame(x, y, s, now, seed, c, ga) {
    const f = Math.sin(now / 83 + seed * 3.7) * 0.5 + Math.sin(now / 31 + seed * 1.3) * 0.25 + Math.sin(now / 191 + seed) * 0.25;
    const h = s * (3 + f * 0.6), w = s * 0.95, sw = Math.sin(now / 240 + seed * 5) * s * 0.4;
    glow(x, y - h * 0.4, s * 16, c || '255,150,60', (ga === undefined ? 0.11 : ga) + f * 0.02);
    glow(x, y - h * 0.4, s * 4.5, '255,205,130', 0.28);
    g.beginPath(); g.moveTo(x - w, y);
    g.bezierCurveTo(x - w * 1.1, y - h * 0.5, x + sw * 0.5, y - h * 0.7, x + sw, y - h);
    g.bezierCurveTo(x + sw * 0.5 + w * 0.4, y - h * 0.65, x + w * 1.1, y - h * 0.45, x + w, y);
    g.quadraticCurveTo(x, y + w * 0.9, x - w, y); g.closePath();
    g.fillStyle = RG(x, y - h * 0.25, 0, h * 0.95, [0, 'rgba(255,252,232,1)', 0.3, 'rgba(255,214,120,0.95)', 0.7, 'rgba(240,120,40,0.55)', 1, 'rgba(200,60,10,0)']); g.fill();
    ell(x, y - h * 0.08, w * 0.42, h * 0.16, 'rgba(110,140,255,0.35)');
  }
  function candleBody(x, y, h, w, col) {
    const c = col || '#e6d8b8';
    rect(x - w / 2, y - h, w, h, LG(x - w / 2, 0, x + w / 2, 0, [0, sh(c, 0.5), 0.35, c, 0.62, sh(c, 0.9), 1, sh(c, 0.42)]));
    ell(x, y - h, w / 2, w * 0.18, sh(c, 1.06));
    ell(x - w * 0.28, y - h + w * 0.7, w * 0.15, w * 0.55, sh(c, 1.02));
    line(x, y - h, x + 0.08, y - h - w * 0.4, '#1a1008', 0.2);
  }
  /* циферблат; все часы в Мглове стоят на без четверти три */
  function hands(x, y, r, h, m, col) {
    const ah = (h % 12) / 12 * 6.2832, am = m / 60 * 6.2832;
    g.save(); g.strokeStyle = col || '#1a120c'; g.lineCap = 'round';
    g.lineWidth = Math.max(0.25, r * 0.09); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(ah) * r * 0.5, y - Math.cos(ah) * r * 0.5); g.stroke();
    g.lineWidth = Math.max(0.18, r * 0.055); g.beginPath(); g.moveTo(x - Math.sin(am) * r * 0.12, y + Math.cos(am) * r * 0.12); g.lineTo(x + Math.sin(am) * r * 0.8, y - Math.cos(am) * r * 0.8); g.stroke();
    g.restore(); ell(x, y, Math.max(0.3, r * 0.08), Math.max(0.3, r * 0.08), col || '#1a120c');
  }
  function face(x, y, r, o) {
    o = o || {};
    ell(x + r * 0.08, y + r * 0.12, r * 1.2, r * 1.2, 'rgba(0,0,0,0.45)');
    ell(x, y, r * 1.16, r * 1.16, o.wood ? LG(x - r, y - r, x + r, y + r, [0, '#7a4a26', 0.5, '#3a200e', 1, '#1a0c04']) : LG(x - r, y - r, x + r, y + r, [0, '#f0d690', 0.4, '#a07a32', 1, '#2e1e08']));
    if (o.wood) ell(x, y, r * 1.02, r * 1.02, goldG(x - r, y - r, x + r, y + r));
    ell(x, y, r, r, RG(x - r * 0.3, y - r * 0.35, 0, r * 1.35, [0, o.paper || '#f0e8cc', 1, sh(o.paper || '#f0e8cc', 0.66)]));
    g.save(); g.strokeStyle = 'rgba(30,22,14,0.8)';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * 6.2832, big = i % 5 === 0;
      if (!big && r < 7) continue;
      g.lineWidth = big ? Math.max(0.2, r * 0.05) : 0.12;
      g.beginPath(); g.moveTo(x + Math.sin(a) * r * (big ? 0.76 : 0.86), y - Math.cos(a) * r * (big ? 0.76 : 0.86)); g.lineTo(x + Math.sin(a) * r * 0.92, y - Math.cos(a) * r * 0.92); g.stroke();
    }
    g.restore();
    if (r >= 9 && !o.plain) {
      g.save(); g.fillStyle = 'rgba(30,22,14,0.75)'; g.font = (r * 0.2).toFixed(2) + 'px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      ['XII', 'III', 'VI', 'IX'].forEach(function (t, i) { const a = i * 1.5708; g.fillText(t, x + Math.sin(a) * r * 0.6, y - Math.cos(a) * r * 0.6); });
      g.restore();
    }
    if (!o.noHands) hands(x, y, r, o.h === undefined ? 2.75 : o.h, o.m === undefined ? 45 : o.m);
    g.save(); g.globalCompositeOperation = 'lighter';
    ell(x - r * 0.32, y - r * 0.38, r * 0.5, r * 0.22, 'rgba(255,255,255,0.10)', -0.6); g.restore();
  }
  /* бревенчатая стена с паклей */
  function logs(x, y, w, h, lh, seed, base) {
    const r = RNG(seed), b = base || '#5a3c24';
    for (let yy = y; yy < y + h; yy += lh) {
      const t = 0.82 + r() * 0.3;
      rect(x, yy, w, lh, LG(0, yy, 0, yy + lh, [0, sh(b, t * 1.25), 0.25, sh(b, t), 0.8, sh(b, t * 0.5), 1, '#0e0804']));
      g.save(); g.lineWidth = 0.18;
      for (let i = 0; i < 7; i++) {
        g.strokeStyle = 'rgba(16,8,2,' + (0.15 + r() * 0.25).toFixed(2) + ')';
        const gy = yy + 1 + r() * (lh - 2.5), ph = r() * 6;
        g.beginPath(); g.moveTo(x, gy); for (let xx = x; xx <= x + w; xx += 6) g.lineTo(xx, gy + Math.sin(xx * 0.04 + ph) * 0.5); g.stroke();
      }
      g.restore();
      for (let i = 0; i < w / 50; i++) { const kx = x + r() * w, ky = yy + lh * (0.3 + r() * 0.35); ell(kx, ky, 1.6, 1, 'rgba(24,12,4,0.55)'); ell(kx, ky, 0.7, 0.45, 'rgba(8,4,1,0.8)'); }
      for (let i = 0; i < w / 60; i++) { const cx = x + r() * w; line(cx, yy + lh * 0.5, cx + 4 + r() * 8, yy + lh * 0.5 + (r() - 0.5), 'rgba(0,0,0,0.5)', 0.22); }
      for (let xx = x; xx < x + w; xx += 0.7) { const a = r(); if (a < 0.45) continue; g.fillStyle = 'rgba(160,128,84,' + (a * 0.4).toFixed(2) + ')'; g.fillRect(xx, yy + lh - 0.6 - r() * 0.8, 0.55, 0.4 + r() * 0.9); }
    }
  }
  /* доски (пол, прилавок): волокна, щели, шляпки гвоздей */
  function boards(x, y, w, h, bw, base, seed, vertical) {
    const r = RNG(seed);
    for (let p = 0; p < (vertical ? w : h); p += bw) {
      const t = 0.8 + r() * 0.35, c = sh(base, t);
      if (vertical) rect(x + p, y, Math.min(bw, w - p), h, LG(x + p, 0, x + p + bw, 0, [0, sh(base, t * 0.7), 0.15, c, 0.85, c, 1, sh(base, t * 0.55)]));
      else rect(x, y + p, w, Math.min(bw, h - p), LG(0, y + p, 0, y + p + bw, [0, sh(base, t * 1.15), 0.2, c, 0.9, c, 1, sh(base, t * 0.5)]));
      g.save(); g.lineWidth = 0.15;
      for (let i = 0; i < 5; i++) {
        g.strokeStyle = 'rgba(10,5,2,' + (0.12 + r() * 0.2).toFixed(2) + ')'; const o = p + 0.6 + r() * (bw - 1.2), ph = r() * 6;
        g.beginPath();
        if (vertical) { g.moveTo(x + o, y); for (let yy = y; yy <= y + h; yy += 5) g.lineTo(x + o + Math.sin(yy * 0.05 + ph) * 0.4, yy); }
        else { g.moveTo(x, y + o); for (let xx = x; xx <= x + w; xx += 5) g.lineTo(xx, y + o + Math.sin(xx * 0.05 + ph) * 0.4); }
        g.stroke();
      }
      g.restore();
    }
  }
  /* икона: позолоченный фон, нимб, лик, одежды, копоть времени */
  function iconP(x, y, w, h, robe, mantle, seed) {
    const r = RNG(seed);
    rect(x - 1.3, y - 1.3, w + 2.6, h + 2.6, goldG(x, y, x + w, y + h));
    rect(x, y, w, h, '#24160a');
    rect(x + 0.6, y + 0.6, w - 1.2, h - 1.2, LG(x, y, x + w, y + h, [0, '#6a4a1c', 0.35, '#c8a04a', 0.55, '#e2c070', 0.75, '#9a7630', 1, '#4a3212']));
    tex(x, y, w, h, 0.35, 'multiply', 'mot', 0.5);
    const cx = x + w / 2, hr = w * 0.17, hy = y + Math.min(h * 0.24, w * 0.42);
    ell(cx, hy, hr * 1.75, hr * 1.75, LG(cx - hr * 2, hy - hr * 2, cx + hr * 2, hy + hr * 2, [0, '#f8e098', 0.5, '#d8b058', 1, '#8a6424']));
    g.save(); g.strokeStyle = 'rgba(60,30,8,0.65)'; g.lineWidth = 0.22; g.beginPath(); g.arc(cx, hy, hr * 1.75, 0, 6.2832); g.stroke(); g.restore();
    g.beginPath(); g.moveTo(cx - hr * 0.9, hy + hr * 0.9);
    g.quadraticCurveTo(cx - w * 0.44, hy + hr * 1.8, x + w * 0.1, y + h - 0.8); g.lineTo(x + w * 0.9, y + h - 0.8);
    g.quadraticCurveTo(cx + w * 0.44, hy + hr * 1.8, cx + hr * 0.9, hy + hr * 0.9); g.closePath();
    g.fillStyle = LG(x, 0, x + w, 0, [0, sh(mantle, 0.45), 0.45, mantle, 1, sh(mantle, 0.4)]); g.fill();
    poly([cx - hr * 0.55, hy + hr * 1.3, cx + hr * 0.55, hy + hr * 1.3, cx + w * 0.16, y + h - 0.8, cx - w * 0.16, y + h - 0.8], LG(cx - w * 0.16, 0, cx + w * 0.16, 0, [0, sh(robe, 0.55), 0.5, robe, 1, sh(robe, 0.5)]));
    g.save(); g.strokeStyle = 'rgba(250,214,130,0.45)'; g.lineWidth = 0.18;
    for (let k = 0; k < 4; k++) { const fx = x + w * (0.18 + r() * 0.64); g.beginPath(); g.moveTo(fx, hy + hr * 2.2); g.quadraticCurveTo(fx + (r() - 0.5) * 3, y + h * 0.7, fx + (r() - 0.5) * 2, y + h - 1.5); g.stroke(); }
    g.restore();
    ell(cx, hy - hr * 0.15, hr * 1.02, hr * 1.25, '#2a1a0e');
    ell(cx, hy + hr * 0.05, hr * 0.8, hr * 1.02, LG(cx - hr, 0, cx + hr, 0, [0, '#4a2e18', 0.5, '#9a6c48', 1, '#3e2614']));
    ell(cx, hy + hr * 0.75, hr * 0.6, hr * 0.55, 'rgba(40,24,12,0.8)');
    rect(cx - hr * 0.45, hy - hr * 0.05, hr * 0.28, hr * 0.12, '#140a04'); rect(cx + hr * 0.17, hy - hr * 0.05, hr * 0.28, hr * 0.12, '#140a04');
    line(cx, hy + hr * 0.05, cx, hy + hr * 0.4, 'rgba(30,16,6,0.6)', 0.15);
    if (r() < 0.5) { rr(cx + w * 0.06, y + h * 0.5, w * 0.24, w * 0.3, 0.4, '#6a1a14'); rect(cx + w * 0.12, y + h * 0.53, w * 0.12, w * 0.2, 'rgba(230,190,100,0.6)'); }
    else ell(cx - w * 0.16, hy + hr * 2.6, hr * 0.38, hr * 0.5, '#9a6c48');
    rect(x, y, w, h, LG(0, y, 0, y + h, [0, 'rgba(12,6,2,0.5)', 0.45, 'rgba(12,6,2,0.12)', 1, 'rgba(12,6,2,0.35)']));
    g.save(); g.strokeStyle = 'rgba(20,10,2,0.35)'; g.lineWidth = 0.12;
    for (let k = 0; k < 6; k++) { let px = x + r() * w, py = y + r() * h; g.beginPath(); g.moveTo(px, py); for (let s = 0; s < 4; s++) { px += (r() - 0.5) * 5; py += (r() - 0.5) * 5; g.lineTo(px, py); } g.stroke(); }
    g.restore();
  }
  /* стеклянная банка / бутыль */
  function jar(x, y, w, h, liq, lv, cap, label) {
    g.save(); g.beginPath(); g.roundRect(x - w / 2, y - h, w, h, Math.min(w, h) * 0.2); g.clip();
    rect(x - w / 2, y - h, w, h, 'rgba(160,190,190,0.12)');
    if (liq) rect(x - w / 2, y - h * lv, w, h * lv, LG(x - w / 2, 0, x + w / 2, 0, [0, sh(liq, 0.5), 0.4, liq, 1, sh(liq, 0.35)]));
    if (label) rect(x - w * 0.36, y - h * 0.62, w * 0.72, h * 0.3, LG(0, y - h * 0.62, 0, y - h * 0.32, [0, '#d8cca8', 1, '#a89a76']));
    rect(x - w / 2 + w * 0.16, y - h + 0.6, w * 0.1, h - 1.2, 'rgba(255,255,255,0.28)');
    g.restore();
    g.save(); g.beginPath(); g.roundRect(x - w / 2, y - h, w, h, Math.min(w, h) * 0.2); g.strokeStyle = 'rgba(210,230,230,0.35)'; g.lineWidth = 0.22; g.stroke(); g.restore();
    if (cap) rr(x - w / 2 - 0.25, y - h - 1.3, w + 0.5, 1.6, 0.3, cap);
  }
  function bottle(x, y, w, h, c) {
    g.save(); g.beginPath();
    g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - h * 0.6); g.quadraticCurveTo(x - w / 2, y - h * 0.72, x - w * 0.18, y - h * 0.78);
    g.lineTo(x - w * 0.18, y - h); g.lineTo(x + w * 0.18, y - h); g.lineTo(x + w * 0.18, y - h * 0.78); g.quadraticCurveTo(x + w / 2, y - h * 0.72, x + w / 2, y - h * 0.6); g.lineTo(x + w / 2, y); g.closePath();
    g.fillStyle = LG(x - w / 2, 0, x + w / 2, 0, [0, sh(c, 0.35), 0.35, c, 0.55, sh(c, 1.3), 1, sh(c, 0.3)]); g.fill(); g.restore();
    rect(x - w * 0.3, y - h * 0.58, w * 0.12, h * 0.5, 'rgba(255,255,255,0.22)');
    rect(x - w * 0.2, y - h - 0.9, w * 0.4, 1, '#8a6a48');
  }
  /* восьмиконечный крест */
  function cross8(x, y, h, c, t) {
    t = t || h * 0.09;
    rect(x - t / 2, y - h, t, h, c);
    rect(x - h * 0.27, y - h * 0.74, h * 0.54, t, c);
    rect(x - h * 0.14, y - h * 0.88, h * 0.28, t * 0.8, c);
    g.save(); g.translate(x, y - h * 0.3); g.rotate(-0.38); rect(-h * 0.17, -t / 2, h * 0.34, t * 0.85, c); g.restore();
  }
  /* мокрая булыжная мостовая в перспективе */
  function cobbles(y0, y1, base, seed) {
    const r = RNG(seed);
    vg(0, y0, W, y1 - y0, sh(base, 0.7), sh(base, 1.1));
    let y = y0, rh = 2.2;
    while (y < y1) {
      const sw = rh * 2.4;
      for (let x = -((Math.round(y) % 2) * sw / 2) - r() * 3; x < W + sw; x += sw) {
        const t = 0.6 + r() * 0.6;
        ell(x + sw / 2, y + rh / 2, sw * 0.46, rh * 0.42, sh(base, t));
        ell(x + sw / 2 - sw * 0.1, y + rh * 0.32, sw * 0.24, rh * 0.12, 'rgba(200,210,220,' + (0.04 + r() * 0.08).toFixed(2) + ')');
      }
      y += rh; rh *= 1.12;
    }
  }

  /* ============================================================
     МЕСТА. back — дальний план (кэш), front — передний (кэш),
     dyn — живое за посетителем, fdyn — живое перед ним (под тьмой),
     top — огни поверх тьмы.
     ============================================================ */
  const LOC = {};

  /* ---------- СОБОР ---------- */
  const CH = (function () {
    const r = RNG(44), c = [];
    [[58, 97], [326, 97]].forEach(function (s) {
      for (let i = 0; i < 11; i++) { const a = (i / 11) * 6.2832 + r(), rx = 10 * Math.sqrt(r()); c.push([s[0] + Math.cos(a) * rx, s[1] + Math.sin(a) * rx * 0.22, 3 + r() * 7, 0.85 + r() * 0.35, r() * 10]); }
    });
    return c.sort(function (a, b) { return a[1] - b[1]; });
  })();
  LOC.church = {
    dark: 0.3, lights: [[58, 90, 70], [326, 90, 70], [192, 74, 120], [150, 62, 30], [234, 62, 30], [150, 112, 40]],
    back: function () {
      vg(0, 0, W, 126, '#060609', '#1a181e');
      tex(0, 0, W, 126, 0.6, 'overlay', 'mot', 1.6); tex(0, 0, W, 126, 0.07, 'overlay');
      // каменная кладка: едва видные швы
      g.save(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.2;
      for (let y = 8, row = 0; y < 124; y += 7, row++) { line(0, y, W, y, 'rgba(0,0,0,0.22)', 0.2); for (let x = (row % 2) * 9; x < W; x += 18) line(x, y, x, y + 7, 'rgba(0,0,0,0.18)', 0.2); }
      g.restore();
      // своды: арка над иконостасом и боковые
      [[192, 26, 100, 26], [40, 24, 56, 18], [344, 24, 56, 18]].forEach(function (a) {
        g.save(); g.beginPath(); g.ellipse(a[0], a[1], a[2], a[3], 0, Math.PI, 0); g.strokeStyle = '#2a2730'; g.lineWidth = 5; g.stroke();
        g.strokeStyle = 'rgba(150,120,70,0.25)'; g.lineWidth = 0.4; g.beginPath(); g.ellipse(a[0], a[1], a[2] - 2.6, a[3] - 2.6, 0, Math.PI, 0); g.stroke();
        g.restore();
      });
      // выцветшая фреска над подсвечниками
      [[72, 54], [312, 54]].forEach(function (f) {
        g.save(); g.globalAlpha = 0.16;
        ell(f[0], f[1] - 12, 6, 6, '#c8a050'); ell(f[0], f[1] - 12, 3.2, 3.8, '#6a4a34');
        poly([f[0] - 4, f[1] - 7, f[0] + 4, f[1] - 7, f[0] + 8, f[1] + 22, f[0] - 8, f[1] + 22], '#5a2a24');
        g.restore();
      });
      // окна: свинцовые ромбы, лунный свет, туман за стеклом
      [[22, 30], [326, 30]].forEach(function (wv) {
        const x = wv[0], y = wv[1], w = 36, h = 66;
        arch(x - 3, y - 3, w + 6, h + 6); g.fillStyle = '#060608'; g.fill();
        g.save(); arch(x, y, w, h); g.clip();
        rect(x, y, w, h, LG(0, y, 0, y + h, [0, '#4a6a8c', 0.5, '#2e4662', 1, '#1a2638']));
        glow(x + w / 2, y + 14, 30, '170,200,230', 0.25);
        fog(y + 20, 60, 0, 0, 0.6, '150,170,190', 2);
        g.strokeStyle = 'rgba(8,8,14,0.75)'; g.lineWidth = 0.35;
        for (let k = -80; k < 80; k += 5) { line(x + k, y, x + k + h, y + h, 'rgba(8,8,14,0.7)', 0.3); line(x + k + h, y, x + k, y + h, 'rgba(8,8,14,0.7)', 0.3); }
        rect(x + w / 2 - 0.8, y, 1.6, h, '#0a0a10'); rect(x, y + 34, w, 1.6, '#0a0a10');
        g.restore();
        rect(x - 4, y + h + 1, w + 8, 3, LG(0, y + h, 0, y + h + 4, [0, '#3a3640', 1, '#141218']));
      });
      // колонны
      [86, 280].forEach(function (x) {
        const w = 18;
        hg(x, 0, w, 124, [0, '#070709', 0.22, '#25232a', 0.42, '#3a363e', 0.68, '#1e1c24', 1, '#060608']);
        tex(x, 0, w, 124, 0.4, 'overlay', 'mot', 1);
        for (let y = 30; y < 110; y += 22) { rect(x, y, w, 1.2, 'rgba(160,120,60,0.18)'); }
        rect(x - 3, 13, w + 6, 5, LG(0, 13, 0, 18, [0, '#3a363e', 1, '#141218'])); rect(x - 2, 18, w + 4, 2.4, goldG(x - 2, 0, x + w + 2, 0));
        rect(x - 3.5, 116, w + 7, 8, LG(0, 116, 0, 124, [0, '#34303a', 1, '#100e14']));
      });
      // иконостас
      const ix0 = 108, ix1 = 276;
      rect(ix0 - 2, 22, ix1 - ix0 + 4, 102, LG(0, 22, 0, 124, [0, '#2a1c0a', 0.5, '#3a2810', 1, '#1a1006']));
      tex(ix0 - 2, 22, ix1 - ix0 + 4, 102, 0.3, 'overlay', 'mot', 0.7);
      // резной венец с крестом
      g.save(); g.beginPath(); g.moveTo(ix0, 24); g.quadraticCurveTo(192, -6, ix1, 24); g.lineTo(ix1, 27); g.quadraticCurveTo(192, -2, ix0, 27); g.closePath();
      g.fillStyle = goldG(ix0, 0, ix1, 0); g.fill(); g.restore();
      for (let k = 0; k < 9; k++) { const t = k / 8, cx = ix0 + (ix1 - ix0) * t, cy = 24 - Math.sin(t * Math.PI) * 14.5; ell(cx, cy - 1.6, 2, 2.6, goldG(cx - 2, cy - 4, cx + 2, cy)); }
      cross8(192, 8, 12, goldG(186, 0, 198, 8), 1.2);
      // ряды: деисусный (малые) и местный (большие), между ними резные пояса
      const robes = ['#6a1a18', '#1a2e5a', '#2a4a2a', '#5a1a3a', '#1a3a4a', '#6a3a14', '#2a2a5a', '#5a2018'];
      for (let i = 0; i < 8; i++) iconP(112 + i * 20.5, 30, 18, 16, robes[(i + 3) % 8], robes[i], 100 + i);
      [[22, 4], [47, 5], [120, 4]].forEach(function (b) { rect(ix0 - 2, b[0], ix1 - ix0 + 4, b[1], goldG(0, b[0], 0, b[0] + b[1])); for (let x = ix0; x < ix1; x += 4) ell(x + 2, b[0] + b[1] / 2, 0.9, b[1] * 0.3, 'rgba(60,36,8,0.55)'); });
      [[113, 24], [139, 24], [221, 24], [247, 24]].forEach(function (p, i) { iconP(p[0], 56, p[1] - 2, 60, robes[(i * 3 + 1) % 8], robes[(i * 3 + 4) % 8], 200 + i); });
      // царские врата
      g.save(); arch(165, 54, 54, 66); g.fillStyle = '#140a04'; g.fill(); g.clip();
      g.strokeStyle = goldG(165, 54, 219, 120); g.lineWidth = 0.7;
      for (let k = 0; k < 14; k++) { const cx = 168 + (k % 4) * 15 + (Math.floor(k / 4) % 2) * 7, cy = 66 + Math.floor(k / 4) * 15; g.beginPath(); g.arc(cx, cy, 4.5, 0.4, 5.6); g.stroke(); g.beginPath(); g.arc(cx + 3, cy + 2, 2, 3.5, 8.5); g.stroke(); }
      rect(191.4, 54, 1.2, 66, goldG(190, 0, 194, 0));
      [[178, 74], [206, 74], [178, 102], [206, 102]].forEach(function (m) { ell(m[0], m[1], 6, 7, goldG(m[0] - 6, m[1] - 7, m[0] + 6, m[1] + 7)); ell(m[0], m[1], 4.8, 5.8, '#3a2410'); ell(m[0], m[1] - 1.5, 1.8, 2.2, '#8a6040'); ell(m[0], m[1] - 2.2, 3, 3, 'rgba(230,190,90,0.35)'); });
      g.restore();
      // лампады на цепях
      [150, 234].forEach(function (x) {
        g.save(); g.strokeStyle = 'rgba(190,150,80,0.6)'; g.lineWidth = 0.25; g.setLineDash([0.6, 0.5]); line(x, 0, x, 56, 'rgba(190,150,80,0.6)', 0.25); g.restore();
        line(x - 2.6, 56, x, 52, 'rgba(190,150,80,0.6)', 0.2); line(x + 2.6, 56, x, 52, 'rgba(190,150,80,0.6)', 0.2);
        g.beginPath(); g.moveTo(x - 3, 56); g.quadraticCurveTo(x - 3.2, 61, x, 62.5); g.quadraticCurveTo(x + 3.2, 61, x + 3, 56); g.closePath();
        g.fillStyle = LG(x - 3, 0, x + 3, 0, [0, '#3a0606', 0.4, '#b02018', 0.6, '#e04a30', 1, '#3a0606']); g.fill();
        rect(x - 3.2, 55.4, 6.4, 0.9, goldG(x - 3, 0, x + 3, 0));
      });
      // подсвечники: латунная чаша с песком, тела свечей
      [58, 326].forEach(function (x) {
        rect(x - 1.1, 98, 2.2, 26, brassG(x - 1.1, x + 1.1));
        [104, 111, 118].forEach(function (y) { ell(x, y, 2.2, 1.1, brassG(x - 2.2, x + 2.2)); });
        ell(x, 123.5, 7, 1.6, brassG(x - 7, x + 7));
        ell(x, 97.6, 13.5, 3, brassG(x - 13.5, x + 13.5)); ell(x, 97, 12, 2.2, '#4a3a22'); tex(x - 12, 95, 24, 4, 0.4, 'overlay');
      });
      CH.forEach(function (c) { candleBody(c[0], c[1], c[2], c[3], '#e8d8a8'); });
      // верёвка колокола у правой стены
      g.save(); g.strokeStyle = '#6a5a3a'; g.lineWidth = 1; line(372, 0, 372, 104, '#5a4a30', 1);
      g.strokeStyle = 'rgba(20,14,6,0.6)'; g.lineWidth = 0.25; for (let y = 0; y < 104; y += 1.6) line(371.5, y, 372.5, y + 1, 'rgba(20,14,6,0.6)', 0.25); g.restore();
      ell(372, 106, 1.6, 3, '#7a2a20');
      // пол: каменные плиты в перспективе, отсветы
      vg(0, 120, W, 96, '#151319', '#060508');
      g.save(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.3;
      [124, 129, 136, 146, 160].forEach(function (y) { line(0, y, W, y, 'rgba(0,0,0,0.5)', 0.3); });
      for (let i = -14; i <= 14; i++) line(192 + i * 14, 120, 192 + i * 44, 216, 'rgba(0,0,0,0.45)', 0.3);
      g.restore();
      // лучи из окон
      shaft(40, 62, 30, 120, 150, 80, '130,160,205', 0.08, 2.5);
      shaft(344, 62, 30, 264, 150, 80, '130,160,205', 0.08, 2.5);
      // свет свечей на полу и колоннах
      glow(58, 124, 26, '255,170,80', 0.12); glow(326, 124, 26, '255,170,80', 0.12);
    },
    front: function () {
      const x0 = 92, x1 = 292, ty = 117;
      // свечной ящик: тёмный дуб, резные филёнки
      rect(x0 + 2, ty + 3, x1 - x0 - 4, 40, LG(0, ty, 0, ty + 30, [0, '#2a1a0e', 1, '#0e0804']));
      boards(x0 + 2, ty + 3, x1 - x0 - 4, 40, 6, '#2a1a0e', 7, true);
      for (let i = 0; i < 6; i++) {
        const px = x0 + 9 + i * 31.6;
        rr(px, ty + 8, 25, 22, 1, 'rgba(0,0,0,0.4)'); rr(px + 0.6, ty + 8.6, 23.8, 20.8, 1, LG(0, ty + 8, 0, ty + 30, [0, '#3a2414', 1, '#1a0e06']));
        line(px + 1, ty + 9, px + 24, ty + 9, 'rgba(255,200,140,0.2)', 0.25);
        cross8(px + 12.5, ty + 26, 12, 'rgba(200,160,80,0.35)', 0.9);
      }
      rect(x0, ty, x1 - x0, 3.4, LG(0, ty, 0, ty + 3.4, [0, '#7a5434', 0.3, '#4a2e18', 1, '#1a0e06']));
      line(x0, ty + 0.2, x1, ty + 0.2, 'rgba(255,214,160,0.45)', 0.3);
      // лоток с тонкими свечами
      rect(106, 110, 40, 7, LG(0, 110, 0, 117, [0, '#4a3018', 1, '#1e1208']));
      for (let i = 0; i < 16; i++) candleBody(108.5 + i * 2.35, 111, 5 + (i % 3) * 1.4, 1.1, '#efe2b4');
      rect(106, 110, 40, 1, 'rgba(255,220,160,0.25)');
      // латунный подсвечник с одной свечой
      ell(152, 116.6, 4, 1, brassG(148, 156)); rect(151.4, 109, 1.2, 7.6, brassG(151, 153)); ell(152, 109, 2.4, 0.8, brassG(149.6, 154.4));
      candleBody(152, 108.8, 6, 1.3, '#f0e4c0');
      // кружка для пожертвований
      rr(248, 100, 28, 17, 0.8, LG(0, 100, 0, 117, [0, '#4a2e18', 1, '#1a0e06']));
      rect(248, 100, 28, 1.2, '#7a5434'); rect(256, 103, 12, 1.2, '#050302');
      cross8(262, 115, 9, goldG(258, 106, 266, 115), 1);
      // книга записок
      poly([214, 116, 228, 113.2, 242, 116, 228, 117.4], '#d8cca8'); poly([214, 116, 228, 117.4, 228, 118, 214, 116.8], '#8a7a5a');
      for (let k = 0; k < 4; k++) { line(216 + k * 0.4, 115.4 - k * 0.5, 226, 114 - k * 0.5 + 0.8, 'rgba(40,30,20,0.4)', 0.15); line(230, 114.2 - k * 0.5 + 0.8, 240 - k * 0.4, 115.6 - k * 0.5, 'rgba(40,30,20,0.4)', 0.15); }
      // боковые плиты пола перед ящиком
      rect(0, 118, x0, 30, LG(0, 118, 0, 148, [0, '#14121a', 1, '#08070a'])); rect(x1, 118, W - x1, 30, LG(0, 118, 0, 148, [0, '#14121a', 1, '#08070a']));
    },
    dyn: function (now) {
      motes(now, 20, 50, 130, 100, 40, 3, '200,215,240', 0.5, [24, 62, 56, 62, 160, 150, 80, 150]);
      motes(now, 234, 50, 130, 100, 40, 4, '200,215,240', 0.5, [328, 62, 360, 62, 304, 150, 224, 150]);
      fog(0, 60, now, 2.5, 0.25, '120,110,100', 3);
    },
    top: function (now) {
      CH.forEach(function (c, i) { flame(c[0], c[1] - c[2] - 0.5, c[3] * 0.72, now, c[4], '255,150,60', 0.05); });
      [150, 234].forEach(function (x, i) { flame(x, 57.4, 0.6, now, 20 + i, '255,60,40', 0.05); glow(x, 59, 14, '255,60,40', 0.12); });
      flame(152, 102.6, 0.75, now, 33);
      glow(58, 90, 40, '255,170,90', 0.08); glow(326, 90, 40, '255,170,90', 0.08);
    }
  };

  /* ---------- ДОМ АГАТЫ ---------- */
  LOC.agata = {
    dark: 0.32, lights: [[50, 100, 96], [192, 74, 120], [366, 54, 34], [320, 62, 40], [120, 100, 46]],
    back: function () {
      logs(0, 0, W, 126, 9.6, 21);
      vg(0, 0, W, 50, 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0)');
      // матица и пучки трав
      rect(0, 4, W, 7, LG(0, 4, 0, 11, [0, '#3a2414', 0.4, '#24160a', 1, '#0a0602'])); tex(0, 4, W, 7, 0.4, 'overlay');
      const r = RNG(8), herbs = ['#5a6a2a', '#7a7a34', '#4a5a30', '#8a6a3a', '#6a5a7a', '#5a3a2a', '#7a6a2a'];
      [100, 112, 124, 136, 150, 166, 182, 200, 216, 230, 244, 258, 272, 286, 300, 318, 334].forEach(function (x, i) {
        const len = 14 + r() * 14, c = herbs[i % herbs.length];
        line(x, 11, x + (r() - 0.5), 14, '#8a7a5a', 0.25);
        if (i % 6 === 2) {  // коса чеснока
          for (let k = 0; k < 6; k++) ell(x + (k % 2 ? 1.2 : -1.2), 15 + k * 3.4, 2.1, 2, LG(x - 2, 0, x + 2, 0, [0, '#a89a80', 0.5, '#ece2cc', 1, '#8a7a66']));
          return;
        }
        if (i % 6 === 5) {  // связка сушёных грибов
          for (let k = 0; k < 6; k++) { ell(x, 15 + k * 3, 1.8, 1.1, '#6a4a2a'); rect(x - 0.3, 15 + k * 3, 0.6, 1.6, '#c8b090'); }
          line(x, 13, x, 33, 'rgba(160,140,100,0.6)', 0.2); return;
        }
        g.save(); g.lineWidth = 0.2;
        for (let k = 0; k < 14; k++) {
          const a = (r() - 0.5) * 0.7, l = len * (0.6 + r() * 0.4), ex = x + Math.sin(a) * l, ey = 14 + Math.cos(a) * l;
          g.strokeStyle = sh(c, 0.6 + r() * 0.6); g.beginPath(); g.moveTo(x, 14); g.quadraticCurveTo(x + Math.sin(a) * l * 0.3, 14 + l * 0.5, ex, ey); g.stroke();
          ell(ex, ey, 0.9 + r() * 0.8, 0.5 + r() * 0.4, sh(c, 0.7 + r() * 0.6), a + 1.2);
          if (c === '#6a5a7a') ell(ex, ey + 0.6, 0.6, 1.2, '#8a6aa0');
        }
        g.restore();
        rect(x - 1.5, 13, 3, 2, '#8a6a3a');
        if (i % 4 === 1) for (let k = 0; k < 7; k++) ell(x + (r() - 0.5) * 3, 14 + len * 0.7 + r() * 4, 0.7, 0.7, '#b0281c');
      });
      // печь: побелка, сажа, печурки, устье
      g.save();
      g.beginPath(); g.moveTo(4, 126); g.lineTo(4, 44); g.lineTo(0, 44); g.lineTo(0, 38); g.lineTo(100, 38); g.lineTo(100, 44); g.lineTo(98, 44); g.lineTo(98, 126); g.closePath();
      g.fillStyle = LG(0, 0, 100, 0, [0, '#8a8272', 0.3, '#cfc6b2', 0.7, '#bdb39e', 1, '#6a6254']); g.fill(); g.clip();
      tex(0, 38, 100, 88, 0.5, 'overlay', 'mot', 1.2); tex(0, 38, 100, 88, 0.08, 'overlay');
      shade(50, 82, 30, 18, 0.55);
      g.strokeStyle = 'rgba(60,50,40,0.5)'; g.lineWidth = 0.2;
      [[20, 50, 26, 70, 22, 80], [80, 60, 74, 74, 78, 90], [64, 120, 70, 108, 66, 100]].forEach(function (c) { g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]); g.lineTo(c[4], c[5]); g.stroke(); });
      g.restore();
      rect(0, 38, 100, 2, '#e0d8c6'); rect(0, 40, 100, 1.2, 'rgba(0,0,0,0.3)');
      // лежанка: лоскутное одеяло свисает
      for (let k = 0; k < 9; k++) rect(4 + k * 10.4, 33, 10.4, 6 + (k % 3), ['#7a2a24', '#c8b080', '#3a4a6a', '#8a5a2a', '#5a2a3a'][k % 5]);
      rect(4, 33, 94, 1, 'rgba(255,230,190,0.2)');
      // труба
      hg(60, 0, 26, 33, [0, '#7a7262', 0.4, '#c4bba6', 1, '#5a5244']); tex(60, 0, 26, 33, 0.4, 'overlay', 'mot', 1); vg(60, 0, 26, 18, 'rgba(10,8,6,0.8)', 'rgba(10,8,6,0)');
      // печурки
      [[12, 54], [26, 54], [12, 68]].forEach(function (p) { arch(p[0], p[1], 9, 9); g.fillStyle = '#1a140e'; g.fill(); shade(p[0] + 4.5, p[1] + 6, 4, 3, 0.6); });
      ell(30, 58, 2, 2.4, '#3a2a1a');
      // устье
      arch(28, 84, 44, 34); g.fillStyle = '#050302'; g.fill();
      g.save(); arch(28, 84, 44, 34); g.strokeStyle = '#4a4238'; g.lineWidth = 1.6; g.stroke(); g.restore();
      shade(50, 82, 24, 12, 0.7);
      // шесток, чугунок, крынка, ухват
      rect(20, 117, 62, 4, LG(0, 117, 0, 121, [0, '#d8d0bc', 1, '#7a7264']));
      ell(30, 113, 6, 4.6, LG(24, 0, 36, 0, [0, '#050505', 0.4, '#3a3a3a', 1, '#080808'])); ell(30, 109, 5, 1.2, '#1a1a1a'); ell(28.6, 111, 1.6, 2.4, 'rgba(255,255,255,0.12)');
      g.beginPath(); g.moveTo(74, 117); g.quadraticCurveTo(70, 110, 73, 106); g.lineTo(73, 104); g.lineTo(79, 104); g.lineTo(79, 106); g.quadraticCurveTo(82, 110, 78, 117); g.closePath();
      g.fillStyle = LG(70, 0, 82, 0, [0, '#5a2a14', 0.45, '#b06a3a', 1, '#4a200e']); g.fill(); rect(73, 104, 6, 1, '#3a1a0a');
      line(94, 126, 108, 62, '#3a2614', 1.1); g.save(); g.beginPath(); g.arc(108.5, 58.5, 3.4, 0.5, 3.6); g.strokeStyle = '#2a2a2a'; g.lineWidth = 0.8; g.stroke(); g.restore();
      // окно: резной наличник, переплёт, кружевные занавески
      const wx = 288, wy = 34, ww = 62, wh = 58;
      rect(wx - 6, wy - 9, ww + 12, wh + 15, LG(0, wy - 9, 0, wy + wh + 6, [0, '#d8d4c8', 1, '#9a968a']));
      tex(wx - 6, wy - 9, ww + 12, wh + 15, 0.4, 'overlay', 'mot', 1);
      g.save(); g.fillStyle = '#3a5a7a';
      g.beginPath(); g.moveTo(wx - 6, wy - 9); g.quadraticCurveTo(wx + ww / 2, wy - 22, wx + ww + 6, wy - 9); g.lineTo(wx + ww + 6, wy - 6); g.quadraticCurveTo(wx + ww / 2, wy - 17, wx - 6, wy - 6); g.closePath(); g.fill();
      for (let k = 0; k < 7; k++) ell(wx + 4 + k * 9, wy - 3, 2.2, 1.6, '#3a5a7a');
      g.restore();
      rect(wx, wy, ww, wh, '#1a120a');
      g.save(); g.beginPath(); g.rect(wx + 2, wy + 2, ww - 4, wh - 4); g.clip();
      rect(wx, wy, ww, wh, LG(0, wy, 0, wy + wh, [0, '#4a5e72', 1, '#2a3846']));
      for (let k = 0; k < 7; k++) { const tx = wx + 4 + k * 9; poly([tx, wy + wh, tx + 3, wy + 20 + (k * 7) % 14, tx + 6, wy + wh], 'rgba(16,24,30,0.7)'); }
      fog(wy, wh + 10, 0, 0, 0.9, '170,185,195', 1);
      g.restore();
      [[wx + ww / 2 - 0.8, wy, 1.6, wh], [wx, wy + wh / 2 - 0.8, ww, 1.6], [wx + ww / 4, wy, 1, wh], [wx + ww * 0.75, wy, 1, wh]].forEach(function (b) { rect(b[0], b[1], b[2], b[3], '#2a1c10'); });
      g.save(); g.globalCompositeOperation = 'lighter';
      [[wx + 3, wy + 3], [wx + ww - 3, wy + 3], [wx + 3, wy + wh - 3], [wx + ww - 3, wy + wh - 3]].forEach(function (c) { glow(c[0], c[1], 9, '220,235,245', 0.25); });
      g.restore();
      [0, 1].forEach(function (s) {
        const cx = s ? wx + ww + 1 : wx - 1, dir = s ? -1 : 1;
        g.beginPath(); g.moveTo(cx, wy - 2); g.lineTo(cx + dir * 15, wy - 2); g.quadraticCurveTo(cx + dir * 6, wy + 30, cx + dir * 4, wy + wh + 2); g.lineTo(cx, wy + wh + 2); g.closePath();
        g.fillStyle = 'rgba(236,230,214,0.82)'; g.fill();
        g.save(); g.clip(); g.fillStyle = 'rgba(120,110,90,0.35)'; for (let yy = wy; yy < wy + wh; yy += 2.4) for (let xx = cx - 16; xx < cx + 16; xx += 2.4) { g.beginPath(); g.arc(xx + (yy % 4.8 ? 1.2 : 0), yy, 0.45, 0, 6.28); g.fill(); } g.restore();
        rect(cx + dir * 5 - 1.5, wy + 30, 3, 2, '#a02a20');
      });
      rect(wx - 8, wy + wh + 3, ww + 16, 3, LG(0, wy + wh + 3, 0, wy + wh + 6, [0, '#5a3a20', 1, '#2a180a']));
      jar(wx + 10, wy + wh + 3, 5, 6, '#d8b070', 0.5); candleBody(wx + 10, wy + wh - 1, 2.5, 1.6, '#e8d8b0');
      g.beginPath(); g.moveTo(wx + 46, wy + wh + 3); g.lineTo(wx + 44.5, wy + wh - 2.5); g.lineTo(wx + 53.5, wy + wh - 2.5); g.lineTo(wx + 52, wy + wh + 3); g.closePath(); g.fillStyle = '#8a4a2a'; g.fill();
      for (let k = 0; k < 4; k++) line(wx + 49, wy + wh - 2.5, wx + 46 + k * 2, wy + wh - 8 - (k % 2) * 2, '#5a8a3a', 0.4);
      // полки со склянками
      [[104, 156], [228, 284]].forEach(function (sp, side) {
        [60, 84, 108].forEach(function (y, row) {
          rect(sp[0], y, sp[1] - sp[0], 2.2, LG(0, y, 0, y + 2.2, [0, '#6a4a2a', 1, '#2a1a0a'])); shade((sp[0] + sp[1]) / 2, y + 3, (sp[1] - sp[0]) / 2, 2, 0.6);
          const rr2 = RNG(60 + side * 10 + row); let x = sp[0] + 3;
          while (x < sp[1] - 5) {
            const w = 4 + rr2() * 4, h = 7 + rr2() * 9, kind = rr2();
            const liq = ['#8a4a1a', '#4a6a2a', '#7a1a1a', '#5a5a2a', '#3a4a5a', '#9a7a2a'][Math.floor(rr2() * 6)];
            if (kind < 0.55) jar(x + w / 2, y, w, h, liq, 0.4 + rr2() * 0.5, rr2() < 0.5 ? '#8a7a5a' : '#3a2a1a', rr2() < 0.6);
            else if (kind < 0.85) bottle(x + w / 2, y, w * 0.8, h * 1.1, liq);
            else { ell(x + w / 2, y - 1.5, w * 0.7, 1.6, '#6a4a2a'); ell(x + w / 2, y - 2.6, w * 0.6, 1.1, '#8a6a3a'); }
            x += w + 1 + rr2() * 2;
          }
        });
      });
      // красный угол: икона, рушник
      rect(354, 18, 24, 30, LG(354, 18, 378, 48, [0, '#3a2414', 1, '#1a0c04']));
      iconP(357, 21, 18, 24, '#7a1a14', '#1a2a5a', 77);
      g.save(); g.fillStyle = '#ece6d6';
      g.beginPath(); g.moveTo(352, 16); g.quadraticCurveTo(366, 24, 380, 16); g.lineTo(380, 20); g.quadraticCurveTo(366, 28, 352, 20); g.closePath(); g.fill();
      rect(351, 18, 3.2, 34, '#ece6d6'); rect(378, 18, 3.2, 34, '#ece6d6');
      for (let k = 0; k < 6; k++) { rect(351.4, 40 + k * 2, 2.4, 0.8, '#b0281c'); rect(378.4, 40 + k * 2, 2.4, 0.8, '#b0281c'); }
      g.restore();
      line(366, 48, 366, 52, 'rgba(190,150,80,0.6)', 0.2);
      g.beginPath(); g.moveTo(363.6, 52); g.quadraticCurveTo(363.4, 56, 366, 57); g.quadraticCurveTo(368.6, 56, 368.4, 52); g.closePath();
      g.fillStyle = LG(363, 0, 369, 0, [0, '#3a0606', 0.5, '#c02818', 1, '#3a0606']); g.fill();
      // пол
      boards(0, 124, W, 30, 4, '#3a2414', 5);
    },
    front: function () {
      // стол под вышитой скатертью
      rect(92, 117, 200, 4, LG(0, 117, 0, 121, [0, '#e8e2d2', 1, '#b8b0a0']));
      g.save(); g.beginPath(); g.moveTo(92, 120); g.lineTo(292, 120); g.lineTo(296, 146); g.lineTo(88, 146); g.closePath();
      g.fillStyle = LG(0, 120, 0, 146, [0, '#d8d0c0', 1, '#8a8274']); g.fill(); g.clip();
      for (let x = 92; x < 296; x += 7) { g.fillStyle = 'rgba(60,50,40,0.12)'; g.fillRect(x + 3, 120, 2.5, 26); }
      for (let x = 94; x < 294; x += 5) {
        g.fillStyle = '#a8241a'; g.beginPath(); g.moveTo(x, 127); g.lineTo(x + 2.5, 124.5); g.lineTo(x + 5, 127); g.lineTo(x + 2.5, 129.5); g.closePath(); g.fill();
        rect(x + 2, 126.4, 1, 1.2, '#e8e2d2');
      }
      rect(88, 131, 210, 0.8, '#a8241a'); rect(88, 122, 210, 0.8, '#a8241a');
      g.restore();
      // самовар
      const sx = 120;
      ell(sx, 117, 11, 2, 'rgba(0,0,0,0.4)');
      rect(sx - 7, 113, 14, 4, brassG(sx - 7, sx + 7)); rect(sx - 4, 110, 8, 3, brassG(sx - 4, sx + 4));
      g.beginPath(); g.moveTo(sx - 5, 110); g.bezierCurveTo(sx - 15, 106, sx - 13, 90, sx - 8, 88); g.lineTo(sx + 8, 88); g.bezierCurveTo(sx + 13, 90, sx + 15, 106, sx + 5, 110); g.closePath();
      g.fillStyle = brassG(sx - 13, sx + 13); g.fill();
      g.save(); g.clip();
      for (let k = 0; k < 6; k++) rect(sx - 13 + k * 4.4, 88, 0.5, 24, 'rgba(60,30,10,0.3)');
      ell(sx - 7, 98, 2.6, 7, 'rgba(255,140,60,0.35)'); ell(sx + 4, 96, 1, 6, 'rgba(255,250,220,0.6)');
      g.restore();
      rect(sx - 8.6, 86, 17.2, 2.4, brassG(sx - 9, sx + 9)); rect(sx - 5, 83, 10, 3, brassG(sx - 5, sx + 5));
      [[-1, sx - 14], [1, sx + 14]].forEach(function (hnd) { g.save(); g.beginPath(); g.arc(hnd[1] - hnd[0] * 2, 94, 3, hnd[0] < 0 ? 1.6 : -1.6, hnd[0] < 0 ? 4.7 : 1.6, hnd[0] > 0); g.strokeStyle = '#1a0e06'; g.lineWidth = 0.9; g.stroke(); g.restore(); });
      rect(sx + 7, 102, 5, 1.4, brassG(sx + 7, sx + 12)); rect(sx + 11, 102, 1.2, 3, '#a07a32'); ell(sx + 9, 101.6, 1.3, 1, '#2a1a0a');
      // заварочник на конфорке
      g.beginPath(); g.ellipse(sx, 78, 6, 4.6, 0, 0, 6.2832); g.fillStyle = RG(sx - 2, 76, 0, 7, [0, '#ffffff', 0.6, '#e6e0d6', 1, '#a8a296']); g.fill();
      [[-2.4, 77.4, '#c03020'], [2, 79, '#2a4a8a'], [0, 76, '#3a7a3a']].forEach(function (f) { ell(sx + f[0], f[1], 1.3, 1, f[2]); });
      ell(sx, 73.4, 2.6, 0.8, '#d8d0c4'); ell(sx, 72.8, 0.8, 0.6, '#c8a040');
      g.beginPath(); g.moveTo(sx + 5.4, 78); g.quadraticCurveTo(sx + 10, 77, sx + 10, 73.6); g.lineTo(sx + 9.2, 73.6); g.quadraticCurveTo(sx + 9, 76, sx + 5, 77); g.closePath(); g.fillStyle = '#d8d0c4'; g.fill();
      // чашки с блюдцами
      [148, 236].forEach(function (x) {
        ell(x, 117, 5.4, 1.3, '#d8d2c6'); ell(x, 116.6, 4.6, 0.9, '#f0ece4');
        g.beginPath(); g.moveTo(x - 3.4, 111); g.quadraticCurveTo(x - 3.2, 116.4, x, 116.6); g.quadraticCurveTo(x + 3.2, 116.4, x + 3.4, 111); g.closePath();
        g.fillStyle = LG(x - 3.4, 0, x + 3.4, 0, [0, '#b8b2a6', 0.4, '#ffffff', 1, '#a8a296']); g.fill();
        ell(x, 111, 3.4, 0.8, '#6a3a1a'); rect(x - 3.2, 112.4, 6.4, 0.6, '#2a4a8a'); rect(x - 3.4, 111, 6.8, 0.3, '#c8a040');
        g.save(); g.beginPath(); g.arc(x + 4.2, 113.2, 1.6, -1.4, 1.4); g.strokeStyle = '#e6e0d6'; g.lineWidth = 0.6; g.stroke(); g.restore();
      });
      // ступка с пестиком
      g.beginPath(); g.moveTo(254, 108); g.lineTo(266, 108); g.lineTo(264, 117); g.lineTo(256, 117); g.closePath(); g.fillStyle = brassG(254, 266); g.fill();
      ell(260, 108, 6, 1.3, '#3a2a1a'); line(262, 108, 268, 98, '#7a5a34', 1.6);
      // миска рябины
      g.beginPath(); g.ellipse(282, 115, 8, 3, 0, 0, 3.1416); g.fillStyle = LG(274, 0, 290, 0, [0, '#3a2210', 0.5, '#7a4a24', 1, '#2a180a']); g.fill();
      const rb = RNG(71); for (let k = 0; k < 22; k++) ell(276 + rb() * 12, 113.6 - rb() * 2.4, 1, 1, rb() < 0.5 ? '#c0301c' : '#8a1a10');
      // связка трав, ножницы
      g.save(); g.lineWidth = 0.25; for (let k = 0; k < 10; k++) { g.strokeStyle = sh('#6a7a3a', 0.7 + k * 0.05); line(206, 116.4, 224 + k * 0.6, 113 + k * 0.3, sh('#6a7a3a', 0.7 + k * 0.05), 0.25); ell(224 + k * 0.6, 113 + k * 0.3, 1, 0.5, '#5a7a2a', 0.3); } g.restore();
      rect(204, 115.6, 3, 1.4, '#a02a20');
      // пол
      rect(0, 121, 88, 30, LG(0, 121, 0, 150, [0, '#2a1a0c', 1, '#0e0804'])); rect(296, 121, 88, 30, LG(0, 121, 0, 150, [0, '#2a1a0c', 1, '#0e0804']));
    },
    fdyn: function (now) {
      // кошка спит на краю стола: дышит, иногда дёргает ухом
      const cx = 324, cy = 114, b = 1 + Math.sin(now / 900) * 0.035, ear = Math.sin(now / 3700) > 0.96 ? 1 : 0;
      ell(cx, cy + 2.6, 15, 2, 'rgba(0,0,0,0.35)');
      g.save(); g.translate(cx, cy); g.scale(1, b);
      ell(0, 0, 13, 6, LG(0, -6, 0, 6, [0, '#8a8478', 0.5, '#5a564e', 1, '#2a2824']));
      g.save(); g.beginPath(); g.ellipse(0, 0, 13, 6, 0, 0, 6.2832); g.clip();
      for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(-10 + k * 3.4, -3, 1, 4, 0.3, 0, 6.2832); g.fillStyle = 'rgba(30,28,24,0.45)'; g.fill(); }
      g.restore();
      g.restore();
      g.beginPath(); g.moveTo(cx + 12, cy + 2); g.quadraticCurveTo(cx + 4, cy + 9, cx - 12, cy + 4); g.strokeStyle = '#4a463e'; g.lineWidth = 2.2; g.stroke();
      ell(cx - 11, cy - 1, 5.6, 4.6, LG(0, cy - 6, 0, cy + 3, [0, '#8a8478', 1, '#3a3830']));
      poly([cx - 15.4, cy - 3.4, cx - 14, cy - 8.6 - ear, cx - 11.6, cy - 4.4], '#6a665c'); poly([cx - 10, cy - 4.6, cx - 8.4, cy - 9, cx - 6.4, cy - 3.6], '#6a665c');
      poly([cx - 14.6, cy - 4, cx - 14, cy - 7, cx - 12.6, cy - 4.4], '#a87a6a');
      line(cx - 14, cy - 0.6, cx - 12, cy - 0.2, '#1a1814', 0.35); line(cx - 9.6, cy - 0.4, cx - 7.8, cy - 0.8, '#1a1814', 0.35);
      ell(cx - 11.4, cy + 1.4, 0.7, 0.5, '#c88a80');
    },
    top: function (now) {
      // огонь в устье
      const f = Math.sin(now / 130) * 0.5 + Math.sin(now / 53) * 0.3;
      glow(50, 104, 70, '255,120,40', 0.16 + f * 0.03);
      g.save(); arch(28, 84, 44, 34); g.clip();
      glow(50, 116, 26, '255,90,20', 0.5);
      for (let k = 0; k < 4; k++) { g.save(); g.translate(36 + k * 9, 114); g.rotate(-0.2 + k * 0.13); rr(-5, -1.4, 10, 2.8, 1.2, '#1a0a04'); rect(-4.4, -1.4, 8.8, 0.8, 'rgba(255,120,30,0.5)'); g.restore(); }
      for (let k = 0; k < 7; k++) {
        const x = 34 + k * 5.4, h = 8 + Math.sin(now / (70 + k * 17) + k * 2) * 3.5 + Math.sin(now / 29 + k) * 1.2;
        g.beginPath(); g.moveTo(x - 3, 114); g.quadraticCurveTo(x - 2.4, 114 - h * 0.6, x + Math.sin(now / 90 + k) * 1.4, 114 - h); g.quadraticCurveTo(x + 2.4, 114 - h * 0.6, x + 3, 114); g.closePath();
        g.fillStyle = RG(x, 112, 0, h, [0, 'rgba(255,240,180,0.95)', 0.4, 'rgba(255,170,60,0.85)', 1, 'rgba(200,50,10,0)']); g.fill();
      }
      const r = RNG(Math.floor(now / 120));
      for (let k = 0; k < 6; k++) ell(32 + r() * 36, 112 - r() * 26, 0.35, 0.35, 'rgba(255,200,120,0.9)');
      g.restore();
      flame(366, 54.6, 0.6, now, 9, '255,60,40', 0.06); glow(366, 56, 14, '255,60,40', 0.14);
      flame(298, 87.2, 0.65, now, 4);
      // пар из самовара и чашек
      g.save(); g.globalCompositeOperation = 'lighter';
      [[120, 72, 1], [148, 110, 0.6], [236, 110, 0.6]].forEach(function (s, i) {
        for (let k = 0; k < 5; k++) {
          const p = ((now / 2600 + k / 5 + i * 0.3) % 1), y = s[1] - p * 22 * s[2], x = s[0] + Math.sin(now / 700 + k * 1.7 + p * 5) * 2.6 * p;
          ell(x, y, (1.5 + p * 4) * s[2], (1.2 + p * 3) * s[2], 'rgba(220,220,215,' + (0.12 * (1 - p)).toFixed(3) + ')');
        }
      });
      g.restore();
    }
  };

  /* ---------- ЧАСОВАЯ МАСТЕРСКАЯ ГОФМАНОВ ---------- */
  const CLKS = [[58, 24, 9, 0], [128, 26, 8, 1], [150, 42, 5, 0], [130, 62, 10, 2], [246, 28, 9, 3], [282, 22, 8, 0], [312, 34, 10, 2], [344, 22, 7, 1], [262, 62, 7, 0], [300, 68, 11, 2], [334, 62, 6, 0]];
  LOC.clock = {
    dark: 0.36, lights: [[52, 104, 76], [192, 72, 118], [346, 104, 36]],
    back: function () {
      vg(0, 0, W, 98, '#0e1715', '#1c2925');
      g.save(); g.fillStyle = 'rgba(80,110,95,0.16)';
      for (let y = 4, row = 0; y < 100; y += 14, row++) for (let x = (row % 2) * 9; x < W + 9; x += 18) {
        g.beginPath(); g.moveTo(x, y - 5); g.bezierCurveTo(x + 3.4, y - 2, x + 3.4, y + 1.6, x, y + 4.4); g.bezierCurveTo(x - 3.4, y + 1.6, x - 3.4, y - 2, x, y - 5); g.fill();
        ell(x - 3.6, y + 2.6, 1.6, 0.7, 'rgba(80,110,95,0.16)', 0.6); ell(x + 3.6, y + 2.6, 1.6, 0.7, 'rgba(80,110,95,0.16)', -0.6); rect(x - 0.25, y + 4.4, 0.5, 2.6, 'rgba(80,110,95,0.16)');
      }
      g.restore();
      tex(0, 0, W, 98, 0.55, 'overlay', 'mot', 1.4);
      vg(0, 0, W, 40, 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0)');
      // филёнки
      rect(0, 96, W, 28, LG(0, 96, 0, 124, [0, '#3a2414', 1, '#1a0e06']));
      rect(0, 96, W, 2, LG(0, 96, 0, 98, [0, '#6a4a2a', 1, '#2a180a']));
      for (let x = 4; x < W; x += 32) { rr(x, 101, 27, 19, 0.8, 'rgba(0,0,0,0.35)'); rr(x + 0.5, 101.5, 26, 18, 0.8, LG(0, 101, 0, 120, [0, '#2e1c0e', 1, '#3e2614'])); line(x + 1, 102, x + 26, 102, 'rgba(255,200,150,0.12)', 0.25); }
      // напольные часы за спиной мастера
      hg(173, 8, 38, 116, [0, '#1a0c04', 0.3, '#4a2a14', 0.55, '#5a3418', 1, '#140804']);
      g.beginPath(); g.moveTo(170, 12); g.lineTo(186, 3); g.lineTo(188, 6); g.lineTo(176, 12); g.closePath(); g.fillStyle = '#3a2010'; g.fill();
      g.beginPath(); g.moveTo(214, 12); g.lineTo(198, 3); g.lineTo(196, 6); g.lineTo(208, 12); g.closePath(); g.fill();
      ell(192, 4, 2, 2, goldG(190, 2, 194, 6));
      rect(170, 12, 44, 2.4, goldG(0, 12, 0, 14.4));
      rect(176, 15, 32, 22, '#120804'); face(192, 27, 9.6, { paper: '#e8dcbc' });
      g.save(); g.beginPath(); g.arc(192, 19.6, 6, Math.PI, 0); g.fillStyle = '#1a2a4a'; g.fill(); ell(189, 17, 2, 2, '#e8e0c0'); g.restore();
      // настенные часы
      CLKS.forEach(function (c) {
        if (c[3] === 3) for (let k = 0; k < 24; k++) { const a = k / 24 * 6.2832; line(c[0] + Math.cos(a) * c[2] * 1.2, c[1] + Math.sin(a) * c[2] * 1.2, c[0] + Math.cos(a) * c[2] * (k % 2 ? 1.6 : 1.85), c[1] + Math.sin(a) * c[2] * (k % 2 ? 1.6 : 1.85), goldG(c[0] - 20, c[1] - 20, c[0] + 20, c[1] + 20), 0.7); }
        if (c[3] === 1) { g.save(); g.translate(c[0], c[1]); g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832 + 0.39; g.lineTo(Math.cos(a) * c[2] * 1.35, Math.sin(a) * c[2] * 1.35); } g.closePath(); g.fillStyle = LG(-c[2], -c[2], c[2], c[2], [0, '#6a3a1a', 1, '#1a0a02']); g.fill(); g.restore(); }
        face(c[0], c[1], c[2], { wood: c[3] === 2, paper: c[3] === 1 ? '#e0d8c0' : undefined });
        if (c[3] === 2) { line(c[0], c[1] + c[2] * 1.2, c[0], c[1] + c[2] * 2.4, '#8a6a2a', 0.4); }
      });
      // регуляторы: высокие корпуса с маятниками (стоят)
      [[10, 38], [350, 376]].forEach(function (rg, i) {
        const x = rg[0], w = rg[1] - rg[0], cx = x + w / 2;
        rect(x, 12, w, 90, LG(x, 0, x + w, 0, [0, '#1a0a02', 0.3, '#5a3418', 0.6, '#4a2a12', 1, '#120602']));
        g.beginPath(); g.moveTo(x - 2, 12); g.lineTo(cx, 4); g.lineTo(x + w + 2, 12); g.closePath(); g.fillStyle = '#3a1e0c'; g.fill();
        face(cx, 26, 10, { paper: '#ece2c8' });
        rect(x + 3, 40, w - 6, 56, '#0c0602'); rect(x + 3.6, 40.6, w - 7.2, 54.8, 'rgba(120,150,150,0.08)');
        rect(cx - 0.4, 42, 0.8, 40, brassG(cx - 0.5, cx + 0.5)); ell(cx, 84, 4.4, 4.4, brassG(cx - 4.4, cx + 4.4)); ell(cx - 1.2, 83, 1.6, 1.6, 'rgba(255,240,200,0.4)');
        [cx - 4, cx + 4].forEach(function (wx2) { rect(wx2 - 0.15, 42, 0.3, 20 + i * 6, '#8a7a5a'); rect(wx2 - 1.3, 62 + i * 6, 2.6, 8, brassG(wx2 - 1.3, wx2 + 1.3)); });
        g.save(); g.globalCompositeOperation = 'lighter'; poly([x + 4, 41, x + 9, 41, x + 6, 95, x + 4, 95], 'rgba(255,255,255,0.05)'); g.restore();
      });
      // часы с кукушкой: дверка приоткрыта
      const kx = 91, ky = 30;
      g.beginPath(); g.moveTo(kx - 14, ky + 8); g.lineTo(kx, ky - 4); g.lineTo(kx + 14, ky + 8); g.closePath(); g.fillStyle = '#2a1608'; g.fill();
      rect(kx - 11, ky + 6, 22, 26, LG(kx - 11, 0, kx + 11, 0, [0, '#2a1608', 0.5, '#5a3418', 1, '#1a0c04']));
      for (let k = 0; k < 7; k++) { ell(kx - 12 + k * 4, ky + 31, 2.4, 1.6, '#3a5a2a', k * 0.6); ell(kx - 12 + k * 4, ky + 7.4, 2, 1.2, '#3a5a2a', -k * 0.5); }
      face(kx, ky + 21, 5, { plain: true, paper: '#e8dcc0' });
      rect(kx - 3, ky + 7.6, 6, 6, '#050302'); poly([kx + 3, ky + 7.6, kx + 6.4, ky + 6.4, kx + 6.4, ky + 14.6, kx + 3, ky + 13.6], '#6a4020');
      [[kx - 4, 70], [kx + 4, 84]].forEach(function (wv) { line(wv[0], ky + 32, wv[0], wv[1], '#8a7a5a', 0.25); g.beginPath(); g.ellipse(wv[0], wv[1] + 3, 1.6, 3.4, 0, 0, 6.28); g.fillStyle = LG(wv[0] - 2, 0, wv[0] + 2, 0, [0, '#3a2010', 0.5, '#7a4a20', 1, '#2a1408']); g.fill(); for (let k = 0; k < 4; k++) line(wv[0] - 1.4, wv[1] + 0.8 + k * 1.5, wv[0] + 1.4, wv[1] + 1.4 + k * 1.5, 'rgba(0,0,0,0.5)', 0.2); });
      // доска с карманными часами
      rect(112, 82, 44, 1.4, '#4a2a14');
      for (let k = 0; k < 6; k++) { const x = 116 + k * 7; line(x, 83, x, 88 + (k % 2) * 2, 'rgba(220,200,150,0.6)', 0.18); ell(x, 91 + (k % 2) * 2, 2.6, 2.6, brassG(x - 2.6, x + 2.6)); ell(x, 91 + (k % 2) * 2, 1.8, 1.8, '#e8e0c8'); hands(x, 91 + (k % 2) * 2, 1.8, 2.75, 45); }
      // полка с каминными часами, песочные часы, колпак
      rect(230, 92, 116, 2.4, LG(0, 92, 0, 94.4, [0, '#6a4a2a', 1, '#2a180a'])); shade(288, 95, 58, 2, 0.6);
      rect(236, 78, 16, 14, LG(236, 0, 252, 0, [0, '#2a1408', 0.5, '#6a3a18', 1, '#1a0a02'])); g.beginPath(); g.arc(244, 78, 8, Math.PI, 0); g.fillStyle = '#4a2810'; g.fill(); face(244, 80, 5, { plain: true });
      rect(262, 82, 12, 10, brassG(262, 274)); rect(263.4, 83.4, 9.2, 7.2, 'rgba(200,220,220,0.15)'); face(268, 86.8, 3, { plain: true }); rect(264, 80.4, 8, 1.6, brassG(264, 272));
      rect(284, 80, 9, 1.2, '#4a2a14'); rect(284, 91, 9, 1.2, '#4a2a14'); poly([285, 81.2, 292, 81.2, 288.5, 86, 285, 91, 292, 91, 288.5, 86], 'rgba(200,220,230,0.25)'); poly([286.4, 88.6, 290.6, 88.6, 292, 91, 285, 91], '#c8a868');
      g.save(); g.beginPath(); g.moveTo(306, 92); g.lineTo(306, 80); g.quadraticCurveTo(306, 72, 314, 72); g.quadraticCurveTo(322, 72, 322, 80); g.lineTo(322, 92); g.closePath(); g.fillStyle = 'rgba(180,200,210,0.1)'; g.fill(); g.strokeStyle = 'rgba(220,235,240,0.35)'; g.lineWidth = 0.25; g.stroke(); g.restore();
      ell(314, 84, 4, 4, brassG(310, 318)); ell(314, 84, 2.4, 2.4, '#3a2a14'); rect(305, 91, 18, 1.4, '#2a1608');
      // лампа с зелёным абажуром на шнуре
      line(52, 0, 52, 74, '#1a1a1a', 0.35);
      g.beginPath(); g.moveTo(43, 82); g.lineTo(47, 74); g.lineTo(57, 74); g.lineTo(61, 82); g.closePath(); g.fillStyle = LG(43, 0, 61, 0, [0, '#0a2a14', 0.4, '#2a7a44', 0.6, '#4aa064', 1, '#0a2a14']); g.fill();
      rect(43, 82, 18, 0.8, '#c8a050');
      shaft(52, 83, 15, 52, 124, 46, '255,220,150', 0.1, 1.5);
      // пол
      boards(0, 124, W, 30, 4, '#2a1a0c', 13);
    },
    front: function () {
      // верстак
      rect(0, 121, W, 30, LG(0, 121, 0, 151, [0, '#2a1608', 1, '#0e0602']));
      for (let x = 6; x < W; x += 64) { rr(x, 126, 56, 13, 0.8, 'rgba(0,0,0,0.4)'); rr(x + 0.5, 126.5, 55, 12, 0.8, LG(0, 126, 0, 139, [0, '#3a2210', 1, '#24140a'])); rr(x + 24, 131, 8, 2, 0.6, brassG(x + 24, x + 32)); }
      boards(0, 116, W, 5, 5, '#5a3a1e', 31);
      line(0, 116.2, W, 116.2, 'rgba(255,220,170,0.35)', 0.3);
      rr(26, 113.6, 128, 3, 0.6, LG(0, 113.6, 0, 116.6, [0, '#2a4a34', 1, '#142a1c']));
      // лупа на шарнирной лапе
      ell(40, 116, 6, 1.4, brassG(34, 46)); line(40, 115, 50, 96, '#5a5a62', 1.1); line(50, 96, 66, 99, '#5a5a62', 1); ell(50, 96, 1.2, 1.2, '#8a8a92');
      ell(70, 101, 6.4, 3.2, brassG(64, 76), 0.2); ell(70, 101, 5.2, 2.4, 'rgba(180,210,220,0.35)', 0.2); ell(68.6, 100.2, 2, 0.8, 'rgba(255,255,255,0.4)', 0.2);
      // вскрытые карманные часы
      ell(118, 112, 7.4, 2.6, 'rgba(0,0,0,0.35)');
      ell(106, 104, 6, 6.6, brassG(100, 112)); ell(106, 104, 4.8, 5.4, '#e8dcc0');
      ell(118, 110, 7, 4, brassG(111, 125)); ell(118, 109.6, 6, 3.2, '#2a1a0a');
      // инструменты
      line(132, 115, 146, 112, '#c8c8d0', 0.4); line(132, 115.6, 146, 113.4, '#a8a8b0', 0.4);
      [[150, '#7a1a14'], [153, '#2a3a6a'], [156, '#7a5a1a']].forEach(function (s) { rect(s[0] - 0.8, 104, 1.6, 6, s[1]); line(s[0], 104, s[0], 98, '#b8b8c0', 0.35); });
      jar(153, 116, 9, 7, null, 0, null);
      rr(86, 112, 10, 4.6, 0.8, '#111'); ell(86.2, 114.3, 0.8, 2.3, '#3a3a3a');
      rr(74, 113.4, 9, 2.6, 0.4, '#3a2a1a'); const rs = RNG(5); for (let k = 0; k < 12; k++) ell(75 + rs() * 7, 114 + rs() * 1.6, 0.25, 0.25, 'rgba(230,220,200,0.8)');
      // справа: разобранные каминные часы, шестерни, маслёнка, свеча
      rect(268, 98, 30, 18, LG(268, 0, 298, 0, [0, '#2a1408', 0.5, '#6a3a18', 1, '#1a0a02'])); ell(283, 106, 7, 7, '#120804');
      g.save(); g.strokeStyle = brassG(276, 290); g.lineWidth = 0.6; [[280, 104, 3.4], [286, 108, 2.4], [283, 101, 1.8]].forEach(function (q) { g.beginPath(); g.arc(q[0], q[1], q[2], 0, 6.28); g.stroke(); }); g.restore();
      [[306, 115, 3], [314, 115.6, 2], [300, 116, 1.6]].forEach(function (q) { ell(q[0], q[1], q[2], q[2] * 0.35, brassG(q[0] - q[2], q[0] + q[2])); });
      g.beginPath(); g.moveTo(322, 116); g.lineTo(323, 108); g.lineTo(329, 108); g.lineTo(330, 116); g.closePath(); g.fillStyle = brassG(322, 330); g.fill(); line(326, 108, 333, 100, '#a07a32', 0.6);
      ell(346, 116, 4, 0.9, brassG(342, 350)); rect(345.3, 109, 1.4, 7, brassG(345, 347)); candleBody(346, 109, 4, 1.4, '#ece0c0');
      rect(240, 106, 18, 10, LG(0, 106, 0, 116, [0, '#5a1a14', 1, '#2a0a06'])); rect(242, 100, 14, 6, LG(0, 100, 0, 106, [0, '#1a2a4a', 1, '#0a1428'])); rect(240, 106, 18, 0.6, '#c8a050');
    },
    fdyn: function (now) {
      // крутятся колёсики в открытых часах, качается баланс
      const a = now / 600;
      g.save(); g.beginPath(); g.ellipse(118, 109.6, 6, 3.2, 0, 0, 6.28); g.clip();
      [[115.5, 109.6, 2.4, 1], [120.4, 108.8, 1.7, -1.4], [118.6, 111.2, 1.2, 2]].forEach(function (q, i) {
        g.save(); g.translate(q[0], q[1]); g.scale(1, 0.55); g.rotate(a * q[3]);
        g.fillStyle = brassG(-q[2], q[2]); g.beginPath();
        for (let k = 0; k < 24; k++) { const r2 = k % 2 ? q[2] : q[2] * 0.82, b2 = k / 24 * 6.2832; g.lineTo(Math.cos(b2) * r2, Math.sin(b2) * r2); }
        g.closePath(); g.fill(); ell(0, 0, q[2] * 0.3, q[2] * 0.3, '#2a1a0a'); g.restore();
      });
      g.save(); g.translate(116, 108.6); g.scale(1, 0.55); g.rotate(Math.sin(now / 110) * 1.2); g.strokeStyle = '#d8c070'; g.lineWidth = 0.3; g.beginPath(); g.arc(0, 0, 1.6, 0, 6.28); g.moveTo(-1.6, 0); g.lineTo(1.6, 0); g.stroke(); g.restore();
      g.restore();
      motes(now, 30, 82, 46, 40, 26, 6, '255,230,170', 0.55, [44, 83, 60, 83, 76, 124, 28, 124]);
    },
    top: function (now) {
      glow(52, 84, 30, '255,210,140', 0.22); glow(52, 116, 34, '255,200,120', 0.1);
      flame(346, 108.6, 0.7, now, 3);
      // в приоткрытой дверке кукушки иногда блестят два глаза
      const t = (now % 9000) / 9000;
      if (t > 0.62 && t < 0.7) { const a = Math.sin((t - 0.62) / 0.08 * Math.PI); ell(89.6, 40.6, 0.4, 0.3, 'rgba(255,190,90,' + a.toFixed(2) + ')'); ell(92.2, 40.6, 0.4, 0.3, 'rgba(255,190,90,' + a.toFixed(2) + ')'); glow(91, 40.6, 4, '255,160,60', 0.2 * a); }
    }
  };

  /* ---------- СЫСКНОЕ ОТДЕЛЕНИЕ ---------- */
  LOC.station = {
    dark: 0.36, lights: [[77, 106, 80], [192, 72, 118], [358, 52, 44]],
    back: function () {
      vg(0, 0, W, 66, '#3e3a30', '#6a6452');
      tex(0, 0, W, 66, 0.6, 'overlay', 'mot', 1.4);
      vg(0, 66, W, 58, '#22302a', '#16201c'); tex(0, 66, W, 58, 0.5, 'overlay', 'mot', 1.2);
      rect(0, 64, W, 2.4, '#3a1e14'); rect(0, 64, W, 0.5, 'rgba(255,200,160,0.2)');
      vg(0, 0, W, 34, 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0)');
      const rs = RNG(12);
      for (let k = 0; k < 8; k++) { const x = rs() * W, y = 8 + rs() * 50, w = 6 + rs() * 12, h = 4 + rs() * 8; ell(x, y, w, h, 'rgba(150,140,110,0.18)', rs()); ell(x + 1, y + 1, w * 0.9, h * 0.9, 'rgba(0,0,0,0.12)', rs()); }
      for (let k = 0; k < 4; k++) { const x = 110 + rs() * 260; vg(x, 0, 3 + rs() * 4, 30 + rs() * 30, 'rgba(60,50,30,0.25)', 'rgba(60,50,30,0)'); }
      // картотека: десятки ящичков с бирками
      rect(8, 14, 96, 110, LG(8, 0, 104, 0, [0, '#1a0c04', 0.2, '#4a2a14', 0.8, '#3a2010', 1, '#120602']));
      rect(6, 12, 100, 4, LG(0, 12, 0, 16, [0, '#6a4224', 1, '#2a160a']));
      for (let r2 = 0; r2 < 8; r2++) for (let c2 = 0; c2 < 4; c2++) {
        const x = 12 + c2 * 22.4, y = 20 + r2 * 12.4, out = r2 === 5 && c2 === 1 ? 2.4 : 0;
        rr(x, y - out * 0.4, 20.6, 11, 0.5, LG(0, y, 0, y + 11, [0, out ? '#6a4224' : '#4e2e16', 1, '#2a160a']));
        rect(x + 6.6, y + 2 - out * 0.4, 7.4, 3.4, brassG(x + 6.6, x + 14)); rect(x + 7.3, y + 2.6 - out * 0.4, 6, 2.2, '#e0d6bc');
        line(x + 8, y + 3.6 - out * 0.4, x + 12.6, y + 3.6 - out * 0.4, 'rgba(40,30,20,0.6)', 0.2);
        g.save(); g.beginPath(); g.arc(x + 10.3, y + 7.6 - out * 0.4, 1.4, 0, 3.14); g.strokeStyle = brassG(x + 9, x + 12); g.lineWidth = 0.4; g.stroke(); g.restore();
        if (out) for (let k = 0; k < 6; k++) rect(x + 2 + k * 3, y - 3.6 - (k % 3), 2.4, 4, '#e8e0c8');
      }
      // розыскные листы
      [[114, 22, -0.05], [132, 30, 0.06]].forEach(function (p, i) {
        g.save(); g.translate(p[0] + 12, p[1] + 16); g.rotate(p[2]);
        rect(-12, -16, 24, 32, LG(0, -16, 0, 16, [0, '#d8ceb0', 1, '#a89c7c'])); tex(-12, -16, 24, 32, 0.3, 'multiply', 'mot', 0.6);
        g.fillStyle = '#2a1a0e'; g.font = 'bold 3.2px Georgia, serif'; g.textAlign = 'center'; g.fillText('РОЗЫСК', 0, -11.4);
        ell(0, -2, 5, 6.4, 'rgba(40,30,20,0.25)'); ell(0, -2.6, 3.4, 4.2, '#b8ac8c'); rect(-4.2, -9.6, 8.4, 4, '#2a2018'); rect(-6, -6, 12, 1.2, '#2a2018');
        rect(-7, 4, 14, 8, 'rgba(40,30,20,0.3)');
        for (let k = 0; k < 4; k++) line(-9, 7 + k * 2.2, 9 - (k % 2) * 4, 7 + k * 2.2, 'rgba(40,30,20,0.5)', 0.2);
        ell(0, -15, 0.8, 0.8, '#8a1a14');
        g.restore();
      });
      // настенный телефон
      rect(226, 26, 16, 30, LG(226, 0, 242, 0, [0, '#2a1408', 0.5, '#6a3a18', 1, '#1a0a02']));
      ell(230.6, 24.6, 3, 2.6, brassG(227.6, 233.6)); ell(237.4, 24.6, 3, 2.6, brassG(234.4, 240.4));
      ell(234, 36, 2.6, 2.6, '#111'); line(234, 38.6, 234, 42, '#111', 0.6); rect(243, 34, 1.6, 5, '#111');
      g.beginPath(); g.ellipse(224, 42, 1.6, 4, 0.2, 0, 6.28); g.fillStyle = '#111'; g.fill();
      g.beginPath(); g.moveTo(224, 46); g.quadraticCurveTo(220, 60, 230, 56); g.strokeStyle = '#222'; g.lineWidth = 0.4; g.stroke();
      // карта Мглова: река, три улицы, булавки и нитки
      g.save(); g.translate(286, 44); g.rotate(-0.015);
      rect(-34, -26, 68, 52, LG(-34, -26, 34, 26, [0, '#d8cca6', 1, '#9a8c68'])); tex(-34, -26, 68, 52, 0.35, 'multiply', 'mot', 0.5);
      g.beginPath(); g.moveTo(-34, 14); g.bezierCurveTo(-10, 6, 6, 22, 34, 12); g.lineTo(34, 26); g.lineTo(-34, 26); g.closePath(); g.fillStyle = 'rgba(70,100,120,0.5)'; g.fill();
      pl([-30, 8, -8, 2, 14, 4, 30, -2], 'rgba(60,40,20,0.8)', 0.6); pl([-14, -20, -10, -6, -8, 2], 'rgba(60,40,20,0.8)', 0.5); pl([8, -22, 12, -8, 14, 4], 'rgba(60,40,20,0.8)', 0.5); pl([18, -18, 26, -10, 30, -2], 'rgba(60,40,20,0.8)', 0.5);
      for (let k = 0; k < 14; k++) rect(-28 + (k % 7) * 8, -22 + Math.floor(k / 7) * 10 + (k % 3), 5, 4, 'rgba(60,40,20,0.25)');
      for (let k = 0; k < 4; k++) cross8(22 + k * 3, -14 + (k % 2) * 3, 2.4, 'rgba(60,40,20,0.6)', 0.3);
      g.font = 'bold 3.4px Georgia, serif'; g.fillStyle = 'rgba(40,24,10,0.85)'; g.textAlign = 'center'; g.fillText('МГЛОВ', 0, -20.4);
      const pins = [[-10, -6], [12, -8], [26, -10], [-2, 18], [-24, 6]];
      g.strokeStyle = 'rgba(170,20,20,0.75)'; g.lineWidth = 0.25;
      [[0, 1], [1, 2], [2, 3], [0, 4], [1, 3]].forEach(function (e) { line(pins[e[0]][0], pins[e[0]][1], pins[e[1]][0], pins[e[1]][1], 'rgba(170,20,20,0.75)', 0.25); });
      pins.forEach(function (p) { ell(p[0], p[1], 0.9, 0.9, '#b01818'); ell(p[0] - 0.3, p[1] - 0.3, 0.3, 0.3, '#ff8a8a'); });
      g.restore();
      [[322, 30, 0.1], [318, 62, -0.08], [250, 70, 0.05]].forEach(function (n) { g.save(); g.translate(n[0], n[1]); g.rotate(n[2]); rect(-5, -4, 10, 8, '#e8e0c0'); for (let k = 0; k < 3; k++) line(-4, -2 + k * 2, 3, -2 + k * 2, 'rgba(40,30,20,0.5)', 0.18); ell(0, -3.4, 0.6, 0.6, '#b01818'); g.restore(); });
      g.save(); g.translate(256, 26); g.rotate(-0.08); rect(-6, -7, 12, 14, '#e8e4d8'); rect(-5, -6, 10, 10, LG(0, -6, 0, 4, [0, '#7a7a74', 1, '#3a3a36'])); ell(0, -2, 2.2, 2.6, '#9a9a92'); rect(-2.6, -6, 5.2, 2.4, '#1a1a18'); rect(-4, -3.8, 8, 0.6, '#1a1a18');
      g.strokeStyle = 'rgba(180,20,20,0.8)'; g.lineWidth = 0.35; g.beginPath(); g.ellipse(0, -1, 4.6, 5.4, 0, 0, 6.28); g.stroke(); g.restore();
      // часы над столом
      face(192, 22, 8, { wood: true });
      // окно с решёткой, туман и дождь
      const wx = 338, wy = 20, ww = 40, wh = 64;
      rect(wx - 3, wy - 3, ww + 6, wh + 6, '#2a2620');
      g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
      rect(wx, wy, ww, wh, LG(0, wy, 0, wy + wh, [0, '#4a5a66', 1, '#24303a']));
      [0, 1, 2].forEach(function (k) { rect(wx + 4 + k * 13, wy + 30 - k * 6, 9, 40, 'rgba(20,28,34,0.6)'); });
      fog(wy, wh, 0, 0, 0.9, '160,175,185', 4);
      g.restore();
      rect(wx + ww / 2 - 0.8, wy, 1.6, wh, '#2a2620'); rect(wx, wy + wh / 2, ww, 1.6, '#2a2620');
      for (let k = 0; k < 5; k++) rect(wx + 3 + k * 8.4, wy - 2, 1.2, wh + 4, LG(wx + 3 + k * 8.4, 0, wx + 4.2 + k * 8.4, 0, [0, '#1a1a1c', 0.5, '#4a4a50', 1, '#0a0a0c']));
      rect(wx - 5, wy + wh + 2, ww + 10, 3, LG(0, wy + wh + 2, 0, wy + wh + 5, [0, '#5a5448', 1, '#2a2620']));
      // вешалка: шинель и котелок
      rect(326, 30, 1.6, 94, LG(326, 0, 327.6, 0, [0, '#1a0e06', 0.5, '#5a3a1e', 1, '#1a0e06']));
      g.beginPath(); g.moveTo(322, 36); g.quadraticCurveTo(315, 60, 318, 92); g.lineTo(334, 94); g.quadraticCurveTo(336, 60, 331, 36); g.closePath();
      g.fillStyle = LG(316, 0, 336, 0, [0, '#0e1012', 0.4, '#2a2e34', 1, '#0a0b0c']); g.fill();
      for (let k = 0; k < 3; k++) ell(326, 46 + k * 9, 0.6, 0.6, '#a08a4a');
      ell(327, 31, 6, 1.4, '#16181a'); g.beginPath(); g.ellipse(327, 30, 4, 4, 0, Math.PI, 0); g.fillStyle = '#1e2024'; g.fill();
      boards(0, 124, W, 30, 4.2, '#2a1c10', 17);
    },
    front: function () {
      // стол: зелёное сукно, филёнки, замочная скважина
      rect(28, 121, 328, 30, LG(0, 121, 0, 151, [0, '#2e1a0c', 1, '#0e0602']));
      for (let x = 34; x < 350; x += 54) { rr(x, 125, 48, 18, 0.8, 'rgba(0,0,0,0.4)'); rr(x + 0.5, 125.5, 47, 17, 0.8, LG(0, 125, 0, 143, [0, '#3a2412', 1, '#22140a'])); }
      ell(192, 130, 0.8, 1, '#0a0602'); rect(191.6, 130.6, 0.8, 1.6, '#0a0602');
      rect(24, 116, 336, 5, LG(0, 116, 0, 121, [0, '#6a4426', 0.3, '#3a2412', 1, '#1a0e06']));
      rect(34, 116.4, 316, 2.2, LG(0, 116, 0, 119, [0, '#2a5a3a', 1, '#16341e'])); tex(34, 116.4, 316, 2.2, 0.3, 'overlay');
      line(24, 116.2, 360, 116.2, 'rgba(255,220,170,0.3)', 0.3);
      // банковская лампа
      ell(77, 116, 9, 1.8, brassG(68, 86)); rect(76, 102, 2, 14, brassG(76, 78));
      g.beginPath(); g.moveTo(63, 102); g.quadraticCurveTo(77, 92, 91, 102); g.lineTo(91, 103.4); g.lineTo(63, 103.4); g.closePath();
      g.fillStyle = LG(0, 94, 0, 103, [0, '#4ab07a', 0.5, '#1e6a3e', 1, '#0a3018']); g.fill();
      g.save(); g.globalCompositeOperation = 'lighter'; ell(70, 98, 4, 1.2, 'rgba(200,255,220,0.25)', -0.3); g.restore();
      line(81, 116, 84, 108, '#c8a050', 0.25); ell(84, 108.4, 0.6, 0.9, '#8a6a2a');
      // стопки папок с бечёвкой
      [[100, 0], [101, 3.2], [99, 6.4], [102, 9.6]].forEach(function (p, i) {
        const y = 116 - p[1];
        rect(p[0], y - 3, 38, 3.2, LG(0, y - 3, 0, y, [0, ['#c8b48a', '#a89068', '#d0bc94', '#9a8a6a'][i], 1, '#6a5a3a']));
        for (let k = 0; k < 3; k++) line(p[0] + 1, y - 2.4 + k, p[0] + 37, y - 2.4 + k, 'rgba(240,235,220,0.5)', 0.12);
      });
      line(119, 103, 119, 116, '#8a6a3a', 0.35); line(100, 109.4, 140, 109.4, '#8a6a3a', 0.3);
      // открытое дело с фотокарточкой
      poly([232, 116, 236, 109, 274, 109, 278, 116], '#c8b080'); poly([236, 109.6, 254, 109.6, 254, 115.4, 234, 115.4], '#ece6d6'); poly([256, 109.6, 273.6, 109.6, 276, 115.4, 256, 115.4], '#ece6d6');
      for (let k = 0; k < 4; k++) line(258, 111 + k * 1.1, 272, 111 + k * 1.1, 'rgba(30,30,30,0.5)', 0.15);
      rect(240, 110.4, 7, 4.4, '#5a5a54'); ell(243.5, 112, 1.2, 1.4, '#8a8a84'); rect(242, 110.4, 3, 1, '#1a1a18');
      g.save(); g.translate(249, 113); g.rotate(-0.2); g.strokeStyle = 'rgba(160,20,20,0.7)'; g.lineWidth = 0.25; g.strokeRect(-3.4, -1.2, 6.8, 2.4); g.fillStyle = 'rgba(160,20,20,0.7)'; g.font = '1.4px Georgia, serif'; g.textAlign = 'center'; g.fillText('ДЕЛО 7', 0, 0.5); g.restore();
      // чернильница и перо, стакан чая в подстаканнике
      rr(150, 111, 7, 5, 0.6, LG(150, 0, 157, 0, [0, '#0a0a14', 0.5, '#3a3a5a', 1, '#05050a'])); line(153.5, 111, 159, 102, '#e8e0c8', 0.4);
      g.beginPath(); g.moveTo(296, 116); g.lineTo(295, 106); g.lineTo(303, 106); g.lineTo(302, 116); g.closePath(); g.fillStyle = 'rgba(160,80,30,0.65)'; g.fill();
      g.beginPath(); g.moveTo(295.6, 116); g.lineTo(295.2, 111); g.lineTo(302.8, 111); g.lineTo(302.4, 116); g.closePath(); g.fillStyle = brassG(295, 303); g.fill();
      g.save(); g.beginPath(); g.arc(304, 112.6, 1.8, -1.4, 1.4); g.strokeStyle = brassG(302, 306); g.lineWidth = 0.6; g.stroke(); g.restore();
      line(300, 106, 302.6, 101, '#c8c8d0', 0.3);
      // пепельница с папиросой, лупа
      ell(326, 115.4, 5, 1.4, '#3a3a3e'); ell(326, 115, 3.8, 0.9, '#1a1a1c'); line(326, 114.6, 332, 113.6, '#e8e4dc', 0.6); ell(332.2, 113.6, 0.4, 0.3, '#ff7a30');
      g.save(); g.beginPath(); g.arc(284, 113, 3.2, 0, 6.28); g.strokeStyle = brassG(281, 287); g.lineWidth = 0.6; g.stroke(); g.fillStyle = 'rgba(200,220,230,0.2)'; g.fill(); g.restore(); line(286.4, 115.2, 291, 117, '#2a1a0a', 1);
    },
    dyn: function (now) {
      // капли бегут по стеклу
      g.save(); g.beginPath(); g.rect(338, 20, 40, 64); g.clip();
      const r = RNG(3);
      for (let k = 0; k < 16; k++) {
        const x = 339 + r() * 38, sp = 0.4 + r(), p = ((now / 4000 * sp + r()) % 1), y = 18 + p * 70;
        line(x, y - 4 * sp, x + 0.2, y, 'rgba(200,215,225,0.25)', 0.25); ell(x + 0.2, y, 0.45, 0.6, 'rgba(220,235,245,0.45)');
      }
      fog(20, 64, now, 3, 0.35, '170,185,195', 5);
      g.restore();
    },
    top: function (now) {
      glow(77, 108, 36, '255,220,150', 0.2); glow(77, 116, 44, '255,210,140', 0.08);
      // дымок папиросы и пар от чая
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 8; k++) {
        const p = ((now / 3400 + k / 8) % 1), y = 113 - p * 30, x = 332.4 + Math.sin(now / 900 + k + p * 6) * 3 * p;
        ell(x, y, 0.5 + p * 2.6, 0.5 + p * 1.6, 'rgba(190,195,200,' + (0.18 * (1 - p)).toFixed(3) + ')');
      }
      for (let k = 0; k < 4; k++) { const p = ((now / 2400 + k / 4) % 1); ell(299 + Math.sin(now / 600 + k) * 1.4 * p, 105 - p * 14, 1 + p * 2.6, 0.8 + p * 1.8, 'rgba(220,220,215,' + (0.12 * (1 - p)).toFixed(3) + ')'); }
      g.restore();
    }
  };

  /* ---------- СЕННОЙ РЫНОК ---------- */
  LOC.market = {
    out: true, dark: 0.26, lights: [[62, 66, 64], [322, 66, 64], [192, 76, 124]],
    back: function () {
      vg(0, 0, W, 100, '#121a28', '#6a4e48');
      rect(0, 50, W, 50, LG(0, 50, 0, 100, [0, 'rgba(160,90,60,0)', 1, 'rgba(180,110,70,0.35)']));
      glow(290, 92, 90, '230,140,90', 0.18, 'source-over');
      g.save(); g.globalAlpha = 0.55; for (let k = 0; k < 6; k++) { ell(40 + k * 70, 22 + (k % 3) * 9, 50, 3.4, 'rgba(20,24,36,0.6)'); } g.restore();
      // дальний город за туманом
      const r = RNG(14);
      for (let x = 0; x < W; x += 14 + r() * 10) { const h = 22 + r() * 18, w = 14 + r() * 12; rect(x, 100 - h, w, h, '#3a3440'); poly([x - 1, 100 - h, x + w / 2, 100 - h - 6 - r() * 4, x + w + 1, 100 - h], '#3a3440'); if (r() < 0.5) rect(x + w * 0.7, 100 - h - 8, 2, 6, '#3a3440'); }
      ell(70, 64, 7, 8, '#3a3440'); rect(63, 64, 14, 20, '#3a3440'); poly([70, 48, 66, 58, 74, 58], '#3a3440'); cross8(70, 50, 6, '#3a3440', 0.6);
      rect(306, 40, 12, 60, '#34303c'); poly([304, 40, 312, 30, 320, 40], '#34303c'); rect(305, 52, 14, 2, '#2a2632');
      fog(46, 70, 0, 0, 0.8, '150,130,130', 6);
      for (let x = 0; x < W; x += 20 + r() * 12) { const h = 26 + r() * 14, w = 18 + r() * 12; rect(x, 104 - h, w, h, '#211e26'); poly([x - 1.5, 104 - h, x + w / 2, 104 - h - 8, x + w + 1.5, 104 - h], '#211e26'); for (let k = 0; k < 3; k++) if (r() < 0.45) rect(x + 3 + k * 5, 104 - h + 6 + (k % 2) * 7, 2.4, 3.4, 'rgba(240,170,80,0.7)'); if (r() < 0.6) rect(x + w * 0.2, 104 - h - 10, 2.4, 8, '#211e26'); }
      // мостовая
      cobbles(100, 216, '#2a2624', 5);
      // палатки с полосатыми навесами
      [[2, 124, '#8a2e26'], [260, 382, '#2e5a48']].forEach(function (s, si) {
        const x0 = s[0], x1 = s[1], w = x1 - x0;
        [x0 + 6, x1 - 6].forEach(function (px) { rect(px - 1.4, 38, 2.8, 86, LG(px - 1.4, 0, px + 1.4, 0, [0, '#1a0e06', 0.5, '#5a3a1e', 1, '#1a0e06'])); });
        // прилавок с товаром
        rect(x0 + 4, 96, w - 8, 4, LG(0, 96, 0, 100, [0, '#6a4a2a', 1, '#2a1a0a']));
        g.save(); g.beginPath(); g.rect(x0 + 4, 100, w - 8, 24); g.fillStyle = LG(0, 100, 0, 124, [0, si ? '#2a4a3a' : '#6a2a20', 1, '#140a06']); g.fill(); g.clip();
        for (let x = x0; x < x1; x += 5) rect(x + 2, 100, 2, 24, 'rgba(0,0,0,0.12)');
        g.restore();
        const rg = RNG(40 + si); let x = x0 + 8;
        while (x < x1 - 12) {
          const kind = Math.floor(rg() * 4);
          if (kind === 0) { ell(x + 6, 94, 7, 3.4, LG(0, 90, 0, 97, [0, '#7a5a2a', 1, '#3a2410'])); for (let k = 0; k < 7; k++) ell(x + 1.6 + k * 1.6, 91.2 - (k % 2), 1.4, 1.3, rg() < 0.7 ? '#a02a1a' : '#8a8a2a'); x += 14; }
          else if (kind === 1) { for (let k = 0; k < 3; k++) ell(x + 3 + k * 4.6, 92.4, 2.6, 2.4, LG(0, 90, 0, 95, [0, '#8aa060', 1, '#3a5a2a'])); x += 15; }
          else if (kind === 2) { for (let k = 0; k < 3; k++) rr(x + k * 4, 86, 3.6, 10, 1.6, ['#5a2a4a', '#2a4a6a', '#8a6a2a'][k]); x += 13; }
          else { jar(x + 3, 96, 5, 8, '#6a7a2a', 0.7, '#6a4a2a'); jar(x + 9, 96, 4.4, 6.4, '#8a3a1a', 0.6, '#6a4a2a'); x += 13; }
        }
        // навес
        g.save(); g.beginPath(); g.moveTo(x0, 30); g.lineTo(x1, 30); g.lineTo(x1 + 2, 50); g.lineTo(x0 - 2, 50); g.closePath(); g.clip();
        for (let k = 0; k < w / 9 + 1; k++) rect(x0 - 2 + k * 9, 30, 9, 22, k % 2 ? s[2] : '#cdbb92');
        rect(x0 - 2, 30, w + 4, 22, LG(0, 30, 0, 50, [0, 'rgba(0,0,0,0.5)', 0.6, 'rgba(0,0,0,0.1)', 1, 'rgba(255,220,180,0.12)']));
        for (let k = 0; k < w / 18; k++) rect(x0 + k * 18 + 4, 30, 6, 22, 'rgba(0,0,0,0.12)');
        g.restore();
        for (let k = 0; k < w / 9; k++) { g.beginPath(); g.arc(x0 + 2.5 + k * 9 + 2, 50, 4.5, 0, Math.PI); g.fillStyle = (k % 2 ? s[2] : '#cdbb92'); g.fill(); g.beginPath(); g.arc(x0 + 2.5 + k * 9 + 2, 50, 4.5, 0, Math.PI); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fill(); }
        rect(x0 - 2, 28.6, w + 4, 2, '#3a2a1c');
        // подвешенное: лапти, связки лука, корзины
        for (let k = 0; k < 5; k++) {
          const hx = x0 + 18 + k * (w - 36) / 4; if (Math.abs(hx - (si ? 322 : 62)) < 8) continue;
          line(hx, 50, hx, 56 + (k % 2) * 3, '#5a4a30', 0.25);
          if (k % 3 === 0) { for (let j = 0; j < 4; j++) ell(hx + (j % 2 ? 1 : -1), 58 + j * 2.6 + (k % 2) * 3, 1.8, 1.6, '#b08a4a'); }
          else if (k % 3 === 1) { g.beginPath(); g.ellipse(hx, 60 + (k % 2) * 3, 3, 4.4, 0, 0, 6.28); g.fillStyle = '#9a7a3a'; g.fill(); for (let j = 0; j < 4; j++) line(hx - 2.6, 57 + j * 2 + (k % 2) * 3, hx + 2.6, 57.6 + j * 2 + (k % 2) * 3, 'rgba(60,40,10,0.6)', 0.2); }
          else { g.beginPath(); g.moveTo(hx - 4, 57 + (k % 2) * 3); g.lineTo(hx + 4, 57 + (k % 2) * 3); g.lineTo(hx + 3, 63 + (k % 2) * 3); g.lineTo(hx - 3, 63 + (k % 2) * 3); g.closePath(); g.fillStyle = '#7a5a2a'; g.fill(); }
        }
        // фонарь
        const lx = si ? 322 : 62;
        line(lx, 50, lx, 58, '#2a2a2a', 0.35);
        poly([lx - 3, 60, lx + 3, 60, lx + 2.4, 69, lx - 2.4, 69], 'rgba(255,200,120,0.35)'); rect(lx - 3.4, 58.4, 6.8, 1.8, '#1a1a1a'); rect(lx - 2.8, 69, 5.6, 1.4, '#1a1a1a');
        line(lx - 2.8, 60, lx - 2.2, 69, '#1a1a1a', 0.4); line(lx + 2.8, 60, lx + 2.2, 69, '#1a1a1a', 0.4);
      });
      // лоток Фроси: задник с барахлом
      rect(124, 40, 136, 84, LG(0, 40, 0, 124, [0, '#1a1418', 1, '#0e0a0c'])); tex(124, 40, 136, 84, 0.3, 'overlay', 'mot', 1);
      for (let x = 124; x < 260; x += 6) rect(x, 40, 3, 84, 'rgba(255,255,255,0.02)');
      face(142, 58, 7, { wood: true });
      g.save(); g.beginPath(); g.ellipse(240, 60, 7, 10, 0, 0, 6.28); g.fillStyle = 'rgba(200,190,170,0.55)'; g.fill(); g.restore();
      for (let k = 0; k < 5; k++) line(233 + k * 3.4, 52, 234 + k * 3.4, 69, 'rgba(120,110,90,0.5)', 0.2);
      g.beginPath(); g.moveTo(230, 52); g.quadraticCurveTo(240, 46, 250, 52); g.strokeStyle = 'rgba(200,190,170,0.7)'; g.lineWidth = 0.4; g.stroke();
      g.save(); g.strokeStyle = '#b09a5a'; g.lineWidth = 0.3; g.beginPath(); g.ellipse(160, 90, 6, 2, 0, 0, 6.28); g.stroke();
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI; line(160 + Math.cos(a) * 6, 90, 160 + Math.cos(a) * 1.4, 77, '#b09a5a', 0.25); } g.restore();
      // вывеска «Сенной рынок» на цепях
      line(156, 0, 160, 12, '#2a2a2a', 0.35); line(228, 0, 224, 12, '#2a2a2a', 0.35);
      rr(150, 12, 84, 13, 1, LG(0, 12, 0, 25, [0, '#4a3420', 1, '#1e1208'])); boards(151, 13, 82, 11, 3.7, '#3a2814', 9);
      g.save(); g.fillStyle = '#d8b868'; g.font = 'bold 7px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowOffsetY = 0.5; g.fillText('СЕННОЙ РЫНОК', 192, 19.2); g.restore();
      // лужи с отсветами
      [[60, 140, 30, 3], [318, 136, 26, 2.6], [200, 160, 40, 3]].forEach(function (p) { ell(p[0], p[1], p[2], p[3], 'rgba(30,30,40,0.6)'); glow(p[0], p[1], p[2] * 0.6, '255,170,90', 0.12); });
    },
    front: function () {
      // колёса тележки по краям
      [96, 288].forEach(function (x) {
        g.save(); g.beginPath(); g.arc(x, 136, 15, 0, 6.28); g.strokeStyle = '#2a1a0c'; g.lineWidth = 2.6; g.stroke(); g.strokeStyle = '#5a3a1e'; g.lineWidth = 0.6; g.stroke();
        for (let k = 0; k < 10; k++) { const a = k / 10 * 6.2832; line(x, 136, x + Math.cos(a) * 14, 136 + Math.sin(a) * 14, '#3a2412', 1); }
        ell(x, 136, 2.6, 2.6, '#1a0e06'); g.restore();
      });
      // прилавок из грубых досок
      rect(100, 120, 184, 30, LG(0, 120, 0, 150, [0, '#3a2614', 1, '#120a04'])); boards(100, 120, 184, 30, 6, '#3a2614', 3, true);
      rect(98, 115, 188, 5, LG(0, 115, 0, 120, [0, '#7a5434', 0.3, '#4a3018', 1, '#1a0e06'])); line(98, 115.2, 286, 115.2, 'rgba(255,214,170,0.35)', 0.3);
      // грифельная доска «Всё по пять»
      rect(112, 126, 26, 14, '#5a3a1e'); rect(113.4, 127.4, 23.2, 11.2, '#1e2420');
      g.save(); g.fillStyle = 'rgba(230,230,220,0.85)'; g.font = 'italic 3.6px Georgia, serif'; g.textAlign = 'center'; g.fillText('всё по 5', 125, 134.4); g.restore();
      // товар: книги, подсвечник, кукла, будильник, лампа, кружка с ложками, подкова, зонт
      [['#5a1a14', 112, 4.4], ['#1a3a2a', 110.4, 3.2], ['#3a2a5a', 113, 3.6]].forEach(function (b, i) { rr(b[1], 115 - 2.6 - i * 2.6 - b[2] + 3.4, 20, 2.6, 0.4, b[0]); rect(b[1] + 1, 115 - 2.6 - i * 2.6 - b[2] + 3.8, 18, 0.4, 'rgba(230,200,120,0.5)'); });
      ell(140, 114.6, 3, 0.8, brassG(137, 143)); rect(139.3, 104, 1.4, 10.6, brassG(139, 141)); ell(140, 104, 1.8, 0.6, brassG(138, 142));
      // кукла: фарфоровое лицо, пустые глаза
      g.beginPath(); g.moveTo(150, 115); g.quadraticCurveTo(149, 106, 154, 104); g.quadraticCurveTo(159, 106, 158, 115); g.closePath(); g.fillStyle = '#6a2a3a'; g.fill();
      ell(154, 100.4, 3.2, 3.6, RG(153, 99.4, 0, 4, [0, '#f4ece4', 1, '#b8aca0'])); g.beginPath(); g.arc(154, 99.6, 3.6, 3.4, 6.1); g.strokeStyle = '#3a2a1a'; g.lineWidth = 1.2; g.stroke();
      ell(152.8, 100.6, 0.5, 0.6, '#1a1a1a'); ell(155.2, 100.6, 0.5, 0.6, '#1a1a1a'); line(153.4, 102.4, 154.6, 102.4, '#a04040', 0.25);
      // будильник
      ell(242, 109.6, 5, 5, brassG(237, 247)); ell(242, 109.6, 4, 4, '#ece4cc'); hands(242, 109.6, 4, 2.75, 45);
      ell(238.6, 104.2, 1.8, 1.2, brassG(236.8, 240.4)); ell(245.4, 104.2, 1.8, 1.2, brassG(243.6, 247.2)); line(239.6, 114, 238.4, 115.4, '#3a2a14', 0.6); line(244.4, 114, 245.6, 115.4, '#3a2a14', 0.6);
      // лампа
      ell(258, 114.6, 3.2, 0.9, brassG(255, 261)); g.beginPath(); g.ellipse(258, 110.4, 3, 3.4, 0, 0, 6.28); g.fillStyle = 'rgba(200,150,80,0.6)'; g.fill(); rect(256.6, 101, 2.8, 6.6, 'rgba(220,230,230,0.35)');
      // кружка с ложками
      rect(266, 108, 6, 7, LG(266, 0, 272, 0, [0, '#5a6a7a', 0.5, '#aab8c4', 1, '#3a4a5a'])); for (let k = 0; k < 3; k++) { line(267 + k * 1.6, 108, 266 + k * 2.6, 101, '#c8c8d0', 0.35); ell(266 + k * 2.6, 101, 0.8, 1.2, '#d8d8e0'); }
      // подкова
      g.save(); g.beginPath(); g.arc(279, 113, 3.2, 3.6, 5.8, true); g.strokeStyle = '#6a6a70'; g.lineWidth = 1.2; g.stroke(); g.restore();
      // зонт, прислонённый к прилавку
      line(286, 136, 296, 104, '#1a1a22', 0.6); g.beginPath(); g.moveTo(294, 110); g.quadraticCurveTo(299, 120, 291, 128); g.lineTo(288, 126); g.quadraticCurveTo(294, 118, 292, 108); g.closePath(); g.fillStyle = '#16161c'; g.fill();
      // мостовая по краям
      rect(0, 124, 84, 30, LG(0, 124, 0, 154, [0, 'rgba(26,24,24,0.85)', 1, '#0a0808'])); rect(300, 124, 84, 30, LG(0, 124, 0, 154, [0, 'rgba(26,24,24,0.85)', 1, '#0a0808']));
    },
    dyn: function (now) {
      fog(70, 70, now, 5, 0.35, '170,160,165', 7);
      // дым из труб
      g.save(); g.globalCompositeOperation = 'source-over';
      [[38, 66], [150, 70], [298, 68]].forEach(function (c, i) { for (let k = 0; k < 6; k++) { const p = ((now / 5200 + k / 6 + i * 0.2) % 1); ell(c[0] + p * 14 + Math.sin(now / 900 + k) * 1.4, c[1] - p * 26, 1.6 + p * 5, 1.2 + p * 3.4, 'rgba(70,64,72,' + (0.4 * (1 - p)).toFixed(3) + ')'); } });
      g.restore();
      // ворона на вывеске
      const cr = (now % 11000) / 11000, hop = cr > 0.8 && cr < 0.84 ? -1.4 : 0;
      g.save(); g.translate(216, 11 + hop);
      ell(0, 0, 3.4, 2.2, '#0a0a0c'); ell(2.8, -1.8, 1.6, 1.5, '#0a0a0c'); poly([4, -2, 6.2, -1.4, 4, -1.2], '#1a1a1c'); poly([-3, 0, -6.4, 1.4, -2.6, 1.4], '#0a0a0c');
      ell(3.3, -2.1, 0.3, 0.3, 'rgba(220,200,160,0.9)'); line(-0.6, 2, -0.6, 3.4, '#1a1a1a', 0.3); line(0.8, 2, 0.8, 3.4, '#1a1a1a', 0.3);
      g.restore();
    },
    top: function (now) {
      [62, 322].forEach(function (x, i) { flame(x, 66.4, 0.9, now, 5 + i, '255,160,70', 0.14); glow(x, 64, 30, '255,170,90', 0.1); });
      // морось
      g.save(); g.strokeStyle = 'rgba(190,200,215,0.18)'; g.lineWidth = 0.22;
      const r = RNG(Math.floor(now / 60));
      for (let k = 0; k < 40; k++) { const x = r() * W, y = r() * 150; line(x, y, x - 1.2, y + 6, 'rgba(190,200,215,0.16)', 0.2); }
      g.restore();
      fog(96, 60, now, 8, 0.28, '160,150,160', 8);
    }
  };

  /* ---------- ВДОВЬЕ КЛАДБИЩЕ ---------- */
  LOC.cemetery = {
    out: true, dark: 0.26, lights: [[300, 36, 96], [248, 96, 54], [192, 78, 122]],
    back: function () {
      vg(0, 0, W, 104, '#04070a', '#1a2422');
      const r = RNG(77);
      for (let k = 0; k < 60; k++) ell(r() * W, r() * 60, 0.25 + r() * 0.3, 0.25 + r() * 0.3, 'rgba(220,230,240,' + (0.2 + r() * 0.5).toFixed(2) + ')');
      // луна
      glow(300, 36, 80, '190,205,200', 0.16, 'source-over'); glow(300, 36, 30, '210,220,210', 0.25, 'source-over');
      ell(300, 36, 12, 12, RG(296, 32, 0, 14, [0, '#eef2e6', 0.7, '#c8d0c2', 1, '#9aa496']));
      [[296, 33, 3, 2.4], [304, 39, 2.2, 1.8], [302, 30, 1.4, 1.2], [295, 40, 1.8, 1.4]].forEach(function (m) { ell(m[0], m[1], m[2], m[3], 'rgba(120,135,125,0.4)'); });
      // ельник и часовня
      for (let x = -4; x < W; x += 3 + r() * 4) {
        const h = 10 + r() * 16, b = 96;
        g.beginPath(); g.moveTo(x - h * 0.28, b); for (let k = 0; k < 5; k++) { g.lineTo(x - h * 0.28 * (1 - k / 5), b - h * k / 5); g.lineTo(x - h * 0.12 * (1 - k / 5), b - h * k / 5 - 1); } g.lineTo(x, b - h);
        for (let k = 4; k >= 0; k--) { g.lineTo(x + h * 0.12 * (1 - k / 5), b - h * k / 5 - 1); g.lineTo(x + h * 0.28 * (1 - k / 5), b - h * k / 5); } g.closePath(); g.fillStyle = '#0d1515'; g.fill();
      }
      rect(330, 64, 24, 32, '#0b1212'); poly([328, 64, 342, 54, 356, 64], '#0b1212'); rect(338, 44, 8, 12, '#0b1212'); ell(342, 42, 5, 5.6, '#0b1212'); poly([342, 32, 340, 38, 344, 38], '#0b1212'); cross8(342, 33, 7, '#0b1212', 0.7);
      rect(340.6, 76, 3, 5, 'rgba(240,190,110,0.55)');
      fog(60, 60, 0, 0, 0.7, '150,170,165', 9);
      // земля
      vg(0, 96, W, 30, '#121a18', '#0a0e0c'); ell(140, 97, 170, 6, '#121a18'); ell(330, 98, 110, 5, '#121a18');
      // ряды могил: дальний, средний, ближний — всё темнее и чётче
      [[100, '#1a2422', 0.55, 7], [108, '#111917', 0.8, 10], [118, '#090d0c', 1, 14]].forEach(function (row, ri) {
        const rg = RNG(90 + ri); let x = -8 + rg() * 10;
        while (x < W) {
          const s = row[3] * (0.75 + rg() * 0.5), kind = rg(), tilt = (rg() - 0.5) * 0.2;
          if (!(ri === 2 && x > 216 && x < 276)) {
            g.save(); g.translate(x, row[0] + rg() * 3); g.rotate(tilt);
            if (kind < 0.45) { cross8(0, 0, s * 1.4, row[1], s * 0.12); if (ri === 2) { g.globalCompositeOperation = 'lighter'; rect(s * 0.06, -s * 1.4, s * 0.05, s * 1.4, 'rgba(120,140,130,0.25)'); } }
            else if (kind < 0.75) { g.beginPath(); g.moveTo(-s * 0.4, 0); g.lineTo(-s * 0.4, -s * 0.8); g.arc(0, -s * 0.8, s * 0.4, Math.PI, 0); g.lineTo(s * 0.4, 0); g.closePath(); g.fillStyle = row[1]; g.fill(); if (ri === 2) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(120,140,130,0.22)'; g.lineWidth = 0.3; g.stroke(); } }
            else { rect(-s * 0.06, -s * 1.3, s * 0.12, s * 1.3, row[1]); poly([-s * 0.4, -s * 1.1, 0, -s * 1.45, s * 0.4, -s * 1.1], row[1]); rect(-s * 0.32, -s * 0.9, s * 0.64, s * 0.1, row[1]); }
            g.restore();
            if (ri === 2 && kind > 0.85) { g.save(); g.strokeStyle = '#0a0e0d'; g.lineWidth = 0.4; g.strokeRect(x - s * 0.9, row[0] - s * 0.4, s * 1.8, s * 0.4); for (let k = 0; k < 6; k++) line(x - s * 0.9 + k * s * 0.36, row[0] - s * 0.6, x - s * 0.9 + k * s * 0.36, row[0], '#0a0e0d', 0.3); g.restore(); }
          }
          x += s * (1.4 + rg() * 1.6);
        }
        if (ri < 2) fog(row[0] - 20, 26, 0, 0, 0.5, '150,170,165', 10 + ri);
      });
      // ангел на постаменте
      rect(108, 98, 10, 20, '#0c1110'); rect(106, 96, 14, 3, '#0c1110');
      g.beginPath(); g.moveTo(113, 96); g.lineTo(110, 80); g.quadraticCurveTo(113, 74, 116, 80); g.lineTo(115, 96); g.closePath(); g.fillStyle = '#0c1110'; g.fill(); ell(113, 76, 2.2, 2.6, '#0c1110');
      g.beginPath(); g.moveTo(111, 80); g.quadraticCurveTo(100, 70, 102, 86); g.closePath(); g.fill(); g.beginPath(); g.moveTo(115, 80); g.quadraticCurveTo(126, 70, 124, 86); g.closePath(); g.fill();
      g.save(); g.globalCompositeOperation = 'lighter'; line(116, 80, 115, 96, 'rgba(120,140,130,0.3)', 0.4); g.restore();
      // мёртвое дерево
      g.save(); g.strokeStyle = '#050807'; g.lineCap = 'round';
      (function branch(x, y, a, l, w, d) {
        if (d > 6 || l < 2) return;
        const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
        g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + ex) / 2 + Math.sin(d * 3) * l * 0.15, (y + ey) / 2, ex, ey); g.stroke();
        const rb = RNG(d * 31 + Math.round(x * 7));
        branch(ex, ey, a - 0.35 - rb() * 0.4, l * (0.62 + rb() * 0.2), w * 0.62, d + 1);
        branch(ex, ey, a + 0.3 + rb() * 0.4, l * (0.6 + rb() * 0.2), w * 0.6, d + 1);
      })(40, 124, -1.45, 36, 5, 0);
      g.restore();
      // свежая могила Прохора: холм земли, лопата
      g.beginPath(); g.moveTo(216, 124); g.quadraticCurveTo(230, 104, 248, 106); g.quadraticCurveTo(266, 104, 280, 124); g.closePath();
      g.fillStyle = LG(0, 104, 0, 124, [0, '#3a2a1a', 1, '#140c06']); g.fill();
      tex(216, 104, 64, 20, 0.5, 'overlay', 'mot', 0.5);
      const rc = RNG(13); for (let k = 0; k < 26; k++) { const cx = 224 + rc() * 50, cy = 110 + rc() * 13; ell(cx, cy, 0.5 + rc() * 1.1, 0.35 + rc() * 0.6, rc() < 0.3 ? 'rgba(70,54,36,0.7)' : 'rgba(14,9,4,0.8)'); }
      line(266, 124, 262, 98, '#4a3420', 1); rect(259.6, 94, 5, 1.2, '#3a2a18'); g.save(); g.translate(266.4, 122); g.rotate(-0.15); rr(-2.6, -1, 5.2, 7, 1, LG(-2.6, 0, 2.6, 0, [0, '#3a3e40', 0.5, '#7a8084', 1, '#2a2e30'])); g.restore();
      // фонарь на шесте
      line(244, 124, 244, 88, '#2a1a0e', 0.9); line(244, 88, 249, 88, '#2a1a0e', 0.6);
      poly([246, 91, 252, 91, 251.4, 99, 246.6, 99], 'rgba(255,200,120,0.4)'); rect(245.6, 89.6, 6.8, 1.6, '#151515'); rect(246.2, 99, 5.6, 1.2, '#151515');
      // трава
      const rt = RNG(4); g.save(); g.lineWidth = 0.3;
      for (let k = 0; k < 260; k++) { const x = rt() * W, y = 112 + rt() * 14; g.strokeStyle = 'rgba(' + (20 + rt() * 20 | 0) + ',' + (30 + rt() * 24 | 0) + ',' + (26 + rt() * 14 | 0) + ',0.9)'; line(x, y, x + (rt() - 0.5) * 2, y - 1.6 - rt() * 3, g.strokeStyle, 0.3); }
      g.restore();
    },
    front: function () {
      // кованая ограда
      const top = 118;
      rect(0, top + 4, W, 1.4, LG(0, top + 4, 0, top + 5.4, [0, '#2a2e30', 1, '#060808'])); rect(0, top + 22, W, 1.4, '#0a0c0c');
      for (let x = 2, i = 0; x < W; x += 6.4, i++) {
        const bend = (i === 13 || i === 41) ? 0.12 : 0, h = (i === 27) ? 14 : 30;
        g.save(); g.translate(x, top + 34); g.rotate(bend);
        rect(-0.55, -h, 1.1, h, LG(-0.55, 0, 0.55, 0, [0, '#050606', 0.5, '#2a3032', 1, '#040505']));
        if (h > 20) { poly([-1.4, -h, 0, -h - 4.4, 1.4, -h], '#1a1e20'); line(0, -h - 4.2, 0.4, -h - 2, 'rgba(140,160,160,0.4)', 0.2); }
        g.restore();
        if (i % 2 === 0) { g.save(); g.beginPath(); g.arc(x + 3.2, top + 13, 2.4, 0, 6.28); g.strokeStyle = '#121618'; g.lineWidth = 0.5; g.stroke(); g.restore(); }
      }
      g.save(); g.globalCompositeOperation = 'source-atop'; rect(0, top - 4, W, 40, 'rgba(90,40,20,0.12)'); g.restore();
      // бурьян перед оградой
      const r = RNG(21); g.save(); g.lineWidth = 0.4;
      for (let k = 0; k < 220; k++) { const x = r() * W, y = 136 + r() * 12, h = 4 + r() * 9; g.strokeStyle = 'rgba(' + (12 + r() * 16 | 0) + ',' + (18 + r() * 18 | 0) + ',' + (14 + r() * 10 | 0) + ',1)'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 4, y - h * 0.6, x + (r() - 0.5) * 5, y - h); g.stroke(); }
      g.restore();
      rect(0, 140, W, 14, LG(0, 140, 0, 154, [0, 'rgba(6,9,8,0.6)', 1, '#050706']));
    },
    dyn: function (now) {
      // облака проплывают по луне
      g.save();
      for (let k = 0; k < 3; k++) { const x = ((now / 260 + k * 160) % 560) - 90; ell(x, 30 + k * 6, 46, 3.6, 'rgba(10,16,18,0.55)'); ell(x + 20, 33 + k * 6, 30, 2.4, 'rgba(10,16,18,0.45)'); }
      g.restore();
      fog(78, 50, now, 3, 0.5, '150,172,168', 12);
      // блуждающий огонёк в дальнем ряду
      const p = (now % 14000) / 14000, wx = 60 + p * 140, wy = 98 + Math.sin(now / 700) * 2, wa = Math.sin(p * Math.PI) * 0.6;
      glow(wx, wy, 7, '170,220,200', 0.25 * wa); ell(wx, wy, 0.6, 0.6, 'rgba(220,255,240,' + (0.8 * wa).toFixed(2) + ')');
      // вороны на дереве
      [[52, 92], [30, 98], [62, 104]].forEach(function (c, i) {
        const t = Math.sin(now / (1700 + i * 300) + i * 2) > 0.92 ? 1 : 0;
        g.save(); g.translate(c[0], c[1]); ell(0, 0, 2.2, 1.5, '#020303'); ell(1.6 + t * 0.4, -1.2 - t * 0.4, 1.1, 1, '#020303'); poly([2.4 + t * 0.4, -1.4 - t * 0.4, 3.8 + t * 0.6, -1 - t * 0.2, 2.4 + t * 0.4, -0.8], '#020303'); poly([-2, 0.2, -4.2, 1.2, -1.8, 1], '#020303'); g.restore();
      });
    },
    fdyn: function (now) { fog(100, 50, now, 6, 0.42, '160,180,175', 13); },
    top: function (now) {
      flame(249, 97.6, 0.9, now, 7, '255,170,80', 0.16); glow(249, 100, 28, '255,170,90', 0.08);
      g.save(); g.globalAlpha = 0.5 + Math.sin(now / 900) * 0.15; glow(342, 78, 5, '255,190,110', 0.25); g.restore();
    }
  };

  /* ---------- ПЕРЕВОЗНАЯ ПРИСТАНЬ ---------- */
  let boatC = null;
  function boat() {
    if (boatC) return boatC;
    boatC = mkL(110, 60);
    into(boatC, function () {
      g.beginPath(); g.moveTo(4, 30); g.quadraticCurveTo(10, 44, 30, 46); g.lineTo(86, 46); g.quadraticCurveTo(102, 42, 106, 26); g.lineTo(100, 28); g.lineTo(8, 30); g.closePath();
      g.fillStyle = LG(0, 28, 0, 46, [0, '#4a3420', 0.4, '#2a1a0c', 1, '#0a0604']); g.fill();
      g.save(); g.clip(); for (let k = 0; k < 4; k++) line(0, 32 + k * 3.4, 110, 32 + k * 3.4 - (k ? 0 : 0.5), 'rgba(0,0,0,0.45)', 0.3); tex(0, 26, 110, 22, 0.4, 'overlay'); g.restore();
      rect(8, 28, 92, 2, LG(0, 28, 0, 30, [0, '#6a4a2a', 1, '#2a1a0a'])); line(8, 28.2, 100, 26.4, 'rgba(255,214,170,0.25)', 0.3);
      line(30, 28, 18, 46, '#3a2814', 0.9); line(70, 28, 86, 46, '#3a2814', 0.9);
      // шест с фонарём на носу
      line(82, 28, 80, 6, '#2a1a0c', 0.9); line(80, 6, 76, 8, '#2a1a0c', 0.5);
      poly([73.6, 10, 78.4, 10, 77.8, 17, 74.2, 17], 'rgba(255,200,120,0.4)'); rect(73.2, 8.6, 5.6, 1.6, '#151515'); rect(73.8, 17, 4.4, 1.2, '#151515');
    });
    return boatC;
  }
  LOC.river = {
    out: true, dark: 0.3, lights: [[338, 72, 70], [192, 78, 122]],
    back: function () {
      vg(0, 0, W, 94, '#0a1018', '#4a4a4c');
      fog(30, 70, 0, 0, 0.5, '140,150,160', 14);
      const r = RNG(23);
      // тот берег: ельник, крыши, колокольня
      for (let x = -4; x < W; x += 2.6 + r() * 3) { if (x > 150 && x < 236) continue; const h = 6 + r() * 14; poly([x - h * 0.3, 88, x, 88 - h, x + h * 0.3, 88], '#151c22'); }
      [[150, 18, 12], [170, 22, 9], [194, 16, 14], [212, 20, 10]].forEach(function (b, i) {
        rect(b[0], 88 - b[2], b[1], b[2], '#18202a'); poly([b[0] - 1.5, 88 - b[2], b[0] + b[1] / 2, 88 - b[2] - 7, b[0] + b[1] + 1.5, 88 - b[2]], '#18202a');
        if (i % 2 === 0) rect(b[0] + 5, 88 - b[2] + 4, 2.4, 3, 'rgba(240,180,90,0.6)');
      });
      rect(234, 52, 9, 36, '#18202a'); poly([232, 52, 238.5, 42, 245, 52], '#18202a'); rect(237.4, 34, 2.2, 9, '#18202a'); rect(235.6, 37, 6, 1, '#18202a');
      fog(64, 40, 0, 0, 0.6, '150,160,168', 15);
      rect(0, 88, W, 4, '#141a20');
      // вода и отражение того берега
      vg(0, 92, W, 124, '#1e262c', '#06090c');
      g.save(); g.globalAlpha = 0.5; g.translate(0, 184); g.scale(1, -1);
      for (let x = -4; x < W; x += 3) { if (x > 150 && x < 236) continue; const h = 5 + ((x * 7) % 11); poly([x - h * 0.3, 92, x, 92 - h, x + h * 0.3, 92], '#10161c'); }
      g.restore();
      for (let k = 0; k < 120; k++) { const y = 94 + Math.pow(r(), 1.6) * 100, w = 3 + r() * 14 * (1 + (y - 94) / 40); line(r() * W, y, r() * W + w, y, 'rgba(150,170,180,' + (0.05 + r() * 0.08).toFixed(2) + ')', 0.25 + (y - 94) / 300); }
      // сваи в воде
      [[300, 3], [318, 2.6], [376, 3]].forEach(function (p) { rect(p[0], 96, p[1], 30, LG(p[0], 0, p[0] + p[1], 0, [0, '#0a0604', 0.5, '#3a2614', 1, '#0a0604'])); });
      // столб с табличкой «Перевоз»
      line(24, 124, 24, 76, '#2a1a0c', 1.6);
      g.save(); g.translate(24, 82); g.rotate(-0.04); rr(-14, -7, 28, 12, 0.8, LG(0, -7, 0, 5, [0, '#5a4028', 1, '#2a1a0c'])); boards(-13.4, -6.4, 26.8, 10.8, 3.6, '#4a3018', 2);
      g.fillStyle = '#d8c8a0'; g.font = 'bold 3.8px Georgia, serif'; g.textAlign = 'center'; g.fillText('ПЕРЕВОЗ', 0, -1.6); g.font = 'italic 2.4px Georgia, serif'; g.fillStyle = 'rgba(216,200,160,0.8)'; g.fillText('в один конец', 0, 2.6); g.restore();
    },
    front: function () {
      // настил причала
      rect(0, 116, 268, 6, LG(0, 116, 0, 122, [0, '#5a4028', 1, '#2a1a0c']));
      boards(0, 116, 268, 6, 1.5, '#4a3420', 41);
      for (let x = 0; x < 268; x += 14) { line(x, 116, x - 3, 122, 'rgba(0,0,0,0.6)', 0.3); ell(x + 6, 117, 0.3, 0.2, '#8a8a8a'); }
      rect(0, 122, 270, 5, LG(0, 122, 0, 127, [0, '#2a1a0c', 1, '#0a0604']));
      [38, 108, 178, 248].forEach(function (x) { rect(x, 122, 6, 36, LG(x, 0, x + 6, 0, [0, '#0a0604', 0.4, '#3a2614', 1, '#0a0604'])); });
      line(0, 116.2, 268, 116.2, 'rgba(255,214,170,0.25)', 0.3);
      // кнехт с бухтой каната
      rect(56, 106, 7, 10, LG(56, 0, 63, 0, [0, '#1a1a1c', 0.5, '#4a4a4e', 1, '#101012'])); ell(59.5, 106, 4.4, 1.4, '#3a3a3e');
      for (let k = 0; k < 4; k++) ell(72, 114.6 - k * 0.9, 7 - k * 0.6, 1.6, k % 2 ? '#8a7a5a' : '#6a5a3e');
      g.beginPath(); g.moveTo(60, 108); g.quadraticCurveTo(160, 124, 266, 112); g.strokeStyle = '#6a5a3e'; g.lineWidth = 0.6; g.stroke();
      // вода под настилом
      rect(0, 127, 270, 26, LG(0, 127, 0, 153, [0, '#080b0e', 1, '#030506']));
      for (let k = 0; k < 10; k++) line(10 + k * 26, 132 + (k % 3) * 4, 24 + k * 26, 132 + (k % 3) * 4, 'rgba(150,170,180,0.07)', 0.3);
      rect(270, 122, 114, 31, LG(0, 122, 0, 153, [0, 'rgba(10,14,18,0.5)', 1, 'rgba(3,5,6,0.9)']));
    },
    dyn: function (now) {
      // рябь и дорожка от фонаря
      g.save();
      for (let k = 0; k < 40; k++) { const y = 96 + (k * 7.3) % 60, x = ((k * 71 + now / (60 + k)) % (W + 40)) - 20; line(x, y, x + 6 + (k % 5) * 3, y, 'rgba(160,180,190,0.08)', 0.3); }
      for (let k = 0; k < 14; k++) { const y = 104 + k * 3.6, w = 2 + Math.sin(now / 300 + k * 1.7) * 1.4 + k * 0.2; ell(338 + Math.sin(now / 500 + k) * 1.2, y, w, 0.4, 'rgba(255,190,110,' + (0.32 - k * 0.018).toFixed(3) + ')'); }
      g.restore();
      // лодка покачивается
      const b = Math.sin(now / 1200) * 0.8, a = Math.sin(now / 1500) * 0.012;
      g.save(); g.translate(318, 114 + b); g.rotate(a); g.drawImage(boat(), -55, -46, 110, 60); g.restore();
      fog(78, 60, now, 6, 0.45, '150,162,170', 16);
    },
    fdyn: function (now) { fog(104, 46, now, 10, 0.3, '150,162,170', 17); },
    top: function (now) {
      const b = Math.sin(now / 1200) * 0.8;
      flame(339.5, 82.6 + b, 0.85, now, 12, '255,170,80', 0.16);
    }
  };

  /* ============================================================
     Сборка кадра
     ============================================================ */
  let lc = { id: null };
  function layers(id) {
    if (lc.id === id) return lc;
    const L = LOC[id], b = mkL(), f = mkL();
    into(b, function () { L.back(); }); into(f, function () { L.front(); });
    lc = { id: id, b: b, f: f }; return lc;
  }
  function lightPass(L, now) {
    if (!lightL) lightL = mkL(W, H, 1);
    const x = lightL.getContext('2d');
    x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H);
    x.fillStyle = 'rgba(2,3,6,' + L.dark + ')'; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'destination-out';
    L.lights.forEach(function (l, i) {
      const fl = 1 + Math.sin(now / (130 + i * 37) + i) * 0.03;
      const q = x.createRadialGradient(l[0], l[1], 2, l[0], l[1], l[2] * fl);
      q.addColorStop(0, 'rgba(0,0,0,1)'); q.addColorStop(0.5, 'rgba(0,0,0,0.55)'); q.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = q; x.fillRect(0, 0, W, H);
    });
    g.drawImage(lightL, 0, 0, W, H);
  }
  function vignette(a) {
    if (!vigL) vigL = into(mkL(W, H, 2), function () { g.fillStyle = RG(W / 2, H / 2 - 8, 70, 240, [0, 'rgba(0,0,0,0)', 0.55, 'rgba(0,0,0,0.22)', 1, 'rgba(0,0,0,0.85)']); g.fillRect(0, 0, W, H); });
    g.save(); g.globalAlpha = a === undefined ? 1 : a; g.drawImage(vigL, 0, 0, W, H); g.restore();
  }
  function grainF(a) {
    const p = g.createPattern(noiseC(), 'repeat'), s = 1 / scaleOf();
    p.setTransform(new DOMMatrix([s, 0, 0, s, Math.random() * 64, Math.random() * 64]));
    g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'overlay'; g.fillStyle = p; g.fillRect(0, 0, W, H); g.restore();
  }
  function post(now, S, vig) {
    grainF(0.07); vignette(vig === undefined ? 0.9 : vig);
    if (S && S.sanity < 40) {
      const a = (1 - S.sanity / 40) * 0.22 * (0.55 + 0.45 * Math.sin(now / 380));
      g.fillStyle = RG(W / 2, H / 2, 60, 230, [0, 'rgba(90,0,0,0)', 1, 'rgba(110,0,0,' + a.toFixed(3) + ')']); g.fillRect(0, 0, W, H);
    }
    if (S && S.flash > 0) rect(0, 0, W, H, 'rgba(0,0,0,' + Math.min(1, S.flash).toFixed(3) + ')');
  }
  function drawLoc(now, S) {
    const L = LOC[S.loc], ly = layers(S.loc);
    g.drawImage(ly.b, 0, 0, W, H);
    if (L.dyn) L.dyn(now);
    const cu = Art.api.customerLayer(now);
    if (cu) { g.imageSmoothingEnabled = false; g.drawImage(cu, 0, 0, W, H); g.imageSmoothingEnabled = true; }
    g.drawImage(ly.f, 0, 0, W, H);
    if (L.fdyn) L.fdyn(now);
    lightPass(L, now);
    if (L.top) L.top(now);
    post(now, S);
  }

  function init() {
    cv = document.getElementById('hd');
    if (!cv) { cv = document.createElement('canvas'); cv.id = 'hd'; const sc = document.getElementById('scene'); sc.parentNode.insertBefore(cv, sc.nextSibling); }
    cv.width = W * K; cv.height = H * K; main = cv.getContext('2d');
  }
  function show(on) { if (on === shown) return; shown = on; cv.classList.toggle('on', on); }
  function begin() { g = main; g.setTransform(K, 0, 0, K, 0, 0); g.imageSmoothingEnabled = true; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; }
  function render(now, S) {
    if (broken || window.__noHD) { if (shown) show(false); return false; }
    if (!cv) init();
    if (typeof Film !== 'undefined' && Film.active()) { begin(); Film.draw(now); show(true); return true; }
    if (S.mode === 'loc' && LOC[S.loc]) { begin(); drawLoc(now, S); show(true); return true; }
    show(false); return false;
  }
  function fail() { broken = true; if (cv) cv.classList.remove('on'); shown = false; }

  const api = {
    W: W, H: H, K: K, RNG: RNG, sh: sh, mix: mix, rgba: rgba, mkL: mkL, into: into, ctx: function () { return g; },
    rect: rect, rr: rr, poly: poly, ell: ell, line: line, pl: pl, LG: LG, RG: RG, vg: vg, hg: hg, glow: glow, shade: shade, blur: blur, arch: arch, puff: puff, softRect: softRect,
    goldG: goldG, brassG: brassG, tex: tex, fog: fog, shaft: shaft, motes: motes, flame: flame, candleBody: candleBody, hands: hands, face: face,
    logs: logs, boards: boards, iconP: iconP, jar: jar, bottle: bottle, cross8: cross8, cobbles: cobbles, vignette: vignette, grain: grainF, post: post,
    locBack: function (id) { return layers(id).b; }, locFront: function (id) { return layers(id).f; }, loc: LOC, clocks: CLKS
  };
  return { render: render, fail: fail, api: api, has: function (id) { return !!LOC[id]; } };
})();
