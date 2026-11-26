'use strict';
/* ============================================================
   ВСТУПЛЕНИЕ — восемь планов «кино».
   1. Ночь, дождь, письмо на столе при свече; молния.
   2–3. Лист нотариуса крупно; из кляксы на слове «долг» встаёт цилиндр.
   4. Вокзал Мглова: поезд уходит в туман, на перроне остаёшься ты.
   5. Город над рекой на закате: туман встаёт, ставни закрываются.
   6. Сенная ночью: лавка горит, из тумана идут Пустые.
   7. Гроссбух дяди: правила проступают сами; лампа гаснет.
   8. Титул.
   Всё тяжёлое (фактуры, размытие глубины, отражения, перспектива)
   рисуется один раз в слои; в кадре — огонь, дождь, туман, движение.
   ============================================================ */
(function () {
  if (typeof Film === 'undefined' || !Film.define || typeof HD === 'undefined') return;
  const P = HD.api, W = 384, H = 216, K = P.K;
  const HAND = '"Segoe Script", "Segoe Print", "Georgia", serif';
  const SERIF = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';
  let c = null;

  /* ---------- кисти ---------- */
  const clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  const ease = function (t) { t = clamp(t); return t * t * (3 - 2 * t); };
  const seg = function (t, a, b) { return clamp((t - a) / (b - a)); };
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  function hsh(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function R(x, y, w, h, f) { c.fillStyle = f; c.fillRect(x, y, w, h); }
  function E(x, y, rx, ry, f, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, 6.2832); c.fillStyle = f; c.fill(); }
  function poly(p, f) { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fillStyle = f; c.fill(); }
  function line(x0, y0, x1, y1, col, w) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = col; c.lineWidth = w || 0.3; c.stroke(); }
  function LG(x0, y0, x1, y1, st) { const q = c.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) q.addColorStop(st[i], st[i + 1]); return q; }
  function RG(x, y, r0, r1, st) { const q = c.createRadialGradient(x, y, r0, x, y, r1); for (let i = 0; i < st.length; i += 2) q.addColorStop(st[i], st[i + 1]); return q; }
  function inL(L, fn) { P.into(L, function (x) { const o = c; c = x; try { fn(); } finally { c = o; } }); return L; }
  function layer(fn, w, h) { return inL(P.mkL(w, h), fn); }
  function blurred(px, fn, w, h) { const L = layer(fn, w, h); c.save(); c.filter = 'blur(' + (px * K).toFixed(1) + 'px)'; c.drawImage(L, 0, 0, w || W, h || H); c.restore(); }
  function cam(z, fx, fy, fn) { c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-fx, -fy); try { fn(); } finally { c.restore(); } }
  /* камера, которая не выезжает за край нарисованного слоя */
  function camIn(z, fx, fy, fn) { z = Math.max(1, z); const hw = W / 2 / z, hh = H / 2 / z; cam(z, Math.max(hw, Math.min(W - hw, fx)), Math.max(hh, Math.min(H - hh, fy)), fn); }
  function txt(s, x, y, font, col, al, ls) {
    c.font = font; c.fillStyle = col; c.textAlign = al || 'left'; c.textBaseline = 'alphabetic';
    if (ls) c.letterSpacing = ls; c.fillText(s, x, y); if (ls) c.letterSpacing = '0px';
  }
  function lighter(fn) { c.save(); c.globalCompositeOperation = 'lighter'; try { fn(); } finally { c.restore(); } }
  /* мягкое пятно — готовый спрайт: свет ('lighter') или тень/дымка (обычное наложение) */
  const SPR = {};
  function spr(col) {
    if (SPR[col]) return SPR[col];
    const s = document.createElement('canvas'); s.width = s.height = 128;
    const x = s.getContext('2d'), q = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    q.addColorStop(0, 'rgba(' + col + ',1)'); q.addColorStop(0.28, 'rgba(' + col + ',0.5)'); q.addColorStop(0.62, 'rgba(' + col + ',0.13)'); q.addColorStop(1, 'rgba(' + col + ',0)');
    x.fillStyle = q; x.fillRect(0, 0, 128, 128); return (SPR[col] = s);
  }
  function gl(x, y, rx, col, a, ry) { if (!(a > 0.003) || rx <= 0) return; ry = ry || rx; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, a); c.drawImage(spr(col), x - rx, y - ry, rx * 2, ry * 2); c.restore(); }
  function soft(x, y, rx, ry, col, a) { if (!(a > 0.003)) return; c.save(); c.globalAlpha = Math.min(1, a); c.drawImage(spr(col), x - rx, y - ry, rx * 2, ry * 2); c.restore(); }
  function bloom(x, y, r, col, a) { gl(x, y, r, col, a * 0.35); gl(x, y, r * 0.3, col, a * 0.6); gl(x, y, r * 0.08, '255,250,232', a); }
  /* дождь: все капли — одним штрихом */
  function rain(now, o) {
    const r = P.RNG(o.seed || 1), x0 = o.x0 || 0, y0 = o.y0 || 0, w = (o.x1 === undefined ? W : o.x1) - x0, h = (o.y1 === undefined ? H : o.y1) - y0;
    c.save(); c.strokeStyle = 'rgba(' + (o.col || '200,210,225') + ',' + o.a + ')'; c.lineWidth = o.lw || 0.3; c.beginPath();
    const dx = (o.ang === undefined ? -0.14 : o.ang) * o.len;
    for (let i = 0; i < o.n; i++) { const sp = 0.7 + r() * 0.6, px = x0 + r() * w, py = y0 + ((r() * h + now * o.spd * sp) % h); c.moveTo(px, py); c.lineTo(px + dx, py + o.len); }
    c.stroke(); c.restore();
  }
  function splash(now, o) {
    const r = P.RNG(o.seed || 3);
    c.save(); c.strokeStyle = 'rgba(210,220,235,' + o.a + ')'; c.lineWidth = 0.22; c.beginPath();
    for (let i = 0; i < o.n; i++) {
      const per = 280 + r() * 420, ph = ((now + r() * per) % per) / per, x = o.x0 + r() * (o.x1 - o.x0), y = o.y0 + r() * (o.y1 - o.y0);
      if (ph > 0.6) continue;
      const s = (0.3 + (y - o.y0) / (o.y1 - o.y0)) * ph * 3;
      c.moveTo(x + s, y); c.ellipse(x, y, s, s * 0.28, 0, 0, 6.2832);
    }
    c.stroke(); c.restore();
  }
  /* перспектива: точка схода (vx, vy), фокусное f; глаз в (0,0,0), y — вниз */
  function PV(vx, vy, f) { const fn = function (x, y, z) { return [vx + x * f / z, vy + y * f / z]; }; fn.f = f; return fn; }
  function Q(pr, pts, fill) { c.beginPath(); pts.forEach(function (q, i) { const p = pr(q[0], q[1], q[2]); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.fillStyle = fill; c.fill(); }
  function L3(pr, a, b, col, w) { const p = pr(a[0], a[1], a[2]), q = pr(b[0], b[1], b[2]); line(p[0], p[1], q[0], q[1], col, w); }

  /* ---------- человек-силуэт: рост 100, ступни в (0,0); все контуры по часовой ---------- */
  function personPath(o) {
    const wk = o.walk === undefined ? 0 : Math.sin(o.walk), th = o.thin || 1, hem = o.short ? -36 : (o.long ? -14 : -24), fl = (o.flare || 0) + Math.abs(wk) * 1.4;
    c.beginPath();
    [-4.2 * th + wk * 3, 4.2 * th - wk * 3].forEach(function (x) {
      c.moveTo(x - 3.3 * th, -42); c.lineTo(x + 3.3 * th, -42); c.lineTo(x + 2.1 * th, -3.4); c.lineTo(x + 3.4 * th, 0); c.lineTo(x - 3.4 * th, 0); c.lineTo(x - 2.3 * th, -3.4); c.closePath();
    });
    c.moveTo(-6 * th, -84);
    c.bezierCurveTo(-2, -85.6, 2, -85.6, 6 * th, -84);
    c.bezierCurveTo(12 * th, -83, 14 * th, -79, 13.6 * th, -72);
    c.bezierCurveTo(13 * th, -63, 11 * th, -57, 11.4 * th, -50);
    c.bezierCurveTo(12.4 * th, -40, (15 + fl) * th, -30, (16 + fl) * th, hem);
    c.quadraticCurveTo(0, hem + 2.4, (-16 - fl) * th, hem);
    c.bezierCurveTo((-15 - fl) * th, -30, -12.4 * th, -40, -11.4 * th, -50);
    c.bezierCurveTo(-11 * th, -57, -13 * th, -63, -13.6 * th, -72);
    c.bezierCurveTo(-14 * th, -79, -12 * th, -83, -6 * th, -84);
    c.closePath();
    c.rect(-2.6, -89, 5.2, 6);
    c.moveTo(6.2, -94); c.ellipse(0, -94, 6.2, 7.4, 0, 0, 6.2832);
    if (!o.noArms) {
      c.moveTo(-13.4 * th, -80); c.lineTo(-9.6 * th, -76); c.lineTo((-11.2 - wk * 2) * th, -45); c.lineTo((-15.4 - wk * 2) * th, -44); c.closePath();
      c.moveTo(13.4 * th, -80); c.lineTo((15.4 + wk * 2) * th, -44); c.lineTo((11.2 + wk * 2) * th, -45); c.lineTo(9.6 * th, -76); c.closePath();
    }
    if (o.hat === 'top') { c.rect(-5.6, -118, 11.2, 19); c.rect(-10, -100.4, 20, 2.6); }
    else if (o.hat === 'bowler') { c.moveTo(-6.4, -99); c.bezierCurveTo(-6.8, -109, 6.8, -109, 6.4, -99); c.closePath(); c.rect(-9.4, -100, 18.8, 2.2); }
    else if (o.hat === 'cap') { c.moveTo(-6.6, -97.4); c.quadraticCurveTo(0, -106, 6.6, -97.4); c.lineTo(9.4, -96.2); c.lineTo(-6.6, -96.2); c.closePath(); }
    if (o.scarf) { c.rect(-6.6, -86.5, 13.2, 4); c.moveTo(2, -84); c.lineTo(5.6, -84); c.lineTo(8, -64); c.lineTo(4.6, -63); c.closePath(); }
    if (o.bag) { c.moveTo(12, -17); c.roundRect(12, -17, 17, 17, 1.6); c.rect(17.5, -19.6, 6, 1.8); }
  }
  function person(x, y, h, o) {
    o = o || {};
    const s = h / 100;
    c.save(); c.translate(x, y); c.scale(s * (o.flip ? -1 : 1), s);
    if (o.a !== undefined) c.globalAlpha *= clamp(o.a);
    if (o.rim) { c.save(); c.translate(o.rimDx || 0, o.rimDy === undefined ? -1.3 : o.rimDy); c.fillStyle = o.rim; personPath(o); c.fill(); c.restore(); }
    const col = o.col || '#08090b';
    c.fillStyle = o.col2 ? LG(0, -110, 0, 0, [0, col, 1, o.col2]) : col;
    if (o.blur > 0.05) {
      const b = o.blur * 1.5 / s, base = c.globalAlpha;
      c.globalAlpha = base * 0.3;
      [[-b, 0], [b, 0], [0, -b * 0.7], [0, b * 0.7]].forEach(function (d) { c.save(); c.translate(d[0], d[1]); personPath(o); c.fill(); c.restore(); });
      c.globalAlpha = base * 0.55;
    }
    personPath(o); c.fill();
    if (o.face) E(0, -93.6, 5, 6.2, o.face);
    c.restore();
  }

  /* ============================================================
     1. ПИСЬМО ПРИШЛО В ЧЕТВЕРГ: ночь, дождь, свеча, молния
     ============================================================ */
  const WN = { x: 40, y: 2, w: 186, h: 124, bx: 133, by: [43, 84] };
  function s1Outside() {
    return layer(function () {
      R(0, 0, W, H, LG(0, 0, 0, 130, [0, '#03060c', 0.45, '#0a1220', 1, '#1a2636']));
      const rc = P.RNG(21);
      for (let i = 0; i < 18; i++) soft(30 + rc() * 220, 8 + rc() * 50, 26 + rc() * 30, 7 + rc() * 6, '34,46,64', 0.4);
      blurred(2.2, function () {
        const r = P.RNG(11);
        [[90, '#121a28'], [104, '#0c1220'], [120, '#070b14']].forEach(function (b, bi) {
          let x = 26;
          while (x < 240) {
            const w = 9 + r() * 15, h = 8 + r() * (bi === 0 ? 24 : 18), y = b[0];
            R(x, y - h, w, h + 60, b[1]);
            poly([x - 1, y - h, x + w / 2, y - h - 3 - r() * 6, x + w + 1, y - h], b[1]);
            if (r() < 0.55) R(x + w * (0.2 + r() * 0.6), y - h - 8, 1.6, 7, b[1]);
            for (let k = 0; k < 7; k++) if (r() < 0.32) R(x + 2 + r() * (w - 4), y - h + 3 + r() * (h - 3), 1.3, 1.8, 'rgba(255,' + (160 + r() * 50 | 0) + ',80,' + (0.55 + r() * 0.45).toFixed(2) + ')');
            x += w + r() * 3;
          }
        });
        E(200, 80, 7, 8, '#121a28'); R(193, 80, 14, 22, '#121a28'); poly([200, 64, 198, 72, 202, 72], '#121a28');
        [[70, 116], [150, 118], [212, 112]].forEach(function (l) { gl(l[0], l[1], 16, '255,180,100', 0.55); });
      });
      // огни, размытые дождём на стекле, — круги-«боке»
      const rb = P.RNG(5);
      for (let i = 0; i < 14; i++) {
        const x = 46 + rb() * 176, y = 84 + rb() * 40, rr = 1.4 + rb() * 3.2, col = rb() < 0.8 ? '255,176,96' : '160,195,255';
        E(x, y, rr, rr, 'rgba(' + col + ',' + (0.04 + rb() * 0.06).toFixed(3) + ')');
        c.strokeStyle = 'rgba(' + col + ',' + (0.05 + rb() * 0.06).toFixed(3) + ')'; c.lineWidth = 0.25; c.beginPath(); c.arc(x, y, rr, 0, 6.2832); c.stroke();
      }
    });
  }
  function s1Room() {
    return layer(function () {
      R(0, 0, W, H, LG(0, 0, W, 0, [0, '#0c0e0d', 0.55, '#15140f', 1, '#241d12']));
      for (let x = 0; x < W; x += 12) R(x, 0, 5, H, 'rgba(120,110,70,0.045)');
      for (let y = 8, row = 0; y < H; y += 18, row++) for (let x = (row % 2) * 6; x < W; x += 12) { c.beginPath(); c.moveTo(x, y - 4); c.quadraticCurveTo(x + 3, y, x, y + 4); c.quadraticCurveTo(x - 3, y, x, y - 4); c.fillStyle = 'rgba(150,130,80,0.06)'; c.fill(); }
      P.tex(0, 0, W, H, 0.55, 'overlay', 'mot', 1.4); P.tex(0, 0, W, H, 0.06, 'overlay');
      lighter(function () {
        c.fillStyle = RG(312, 140, 0, 210, [0, 'rgba(255,150,70,0.36)', 0.4, 'rgba(255,120,50,0.12)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, W, H);
        c.fillStyle = RG(130, 70, 0, 170, [0, 'rgba(80,110,165,0.12)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, W, H);
      });
      R(0, 0, W, 16, LG(0, 0, 0, 16, [0, 'rgba(0,0,0,0.6)', 1, 'rgba(0,0,0,0)']));
      // наличник, рама, дыра под стекло
      const w = WN;
      R(w.x - 10, 0, w.w + 20, w.h + 12, LG(w.x - 10, 0, w.x + w.w + 10, 0, [0, '#120a05', 0.5, '#1e1209', 1, '#352312']));
      R(w.x - 10, 0, 1.2, w.h + 12, 'rgba(0,0,0,0.6)'); R(w.x + w.w + 8.8, 0, 1.2, w.h + 12, 'rgba(255,190,120,0.25)');
      R(w.x - 4, 0, w.w + 8, w.h + 4, '#0a0604');
      c.clearRect(w.x, w.y, w.w, w.h);
      // переплёт: тёплая кромка со стороны свечи, холодная — со стороны окна
      [[w.bx - 2, w.y, 4, w.h]].concat(w.by.map(function (y) { return [w.x, y - 1.5, w.w, 3]; })).forEach(function (b) {
        R(b[0], b[1], b[2], b[3], '#120b06'); R(b[0] + b[2] - 0.6, b[1], 0.6, b[3], 'rgba(255,180,110,0.35)'); R(b[0], b[1], b[2], 0.5, 'rgba(255,180,110,0.25)');
      });
      // стекло: дымка снизу, неподвижные капли
      R(w.x, w.y + w.h - 30, w.w, 30, LG(0, w.y + w.h - 30, 0, w.y + w.h, [0, 'rgba(180,190,210,0)', 1, 'rgba(180,190,210,0.1)']));
      const rd = P.RNG(8);
      for (let i = 0; i < 150; i++) {
        const x = w.x + rd() * w.w, y = w.y + rd() * w.h, s = 0.25 + rd() * 0.75;
        if (Math.abs(x - w.bx) < 2.5) continue;
        E(x, y + s * 0.3, s, s * 1.15, 'rgba(0,0,0,0.25)'); E(x, y, s, s * 1.1, 'rgba(150,170,200,0.18)'); E(x - s * 0.3, y - s * 0.4, s * 0.3, s * 0.3, 'rgba(255,240,220,0.45)');
      }
      // подоконник
      R(w.x - 14, w.y + w.h, w.w + 28, 4, LG(0, w.y + w.h, 0, w.y + w.h + 4, [0, '#4a3220', 1, '#1a0e06']));
      R(w.x - 14, w.y + w.h, w.w + 28, 0.6, 'rgba(255,200,140,0.3)');
      // отрывной календарь: тридцатое, четверг
      const cx = 268, cy = 24;
      soft(cx - 4, cy + 26, 22, 30, '0,0,0', 0.5);
      R(cx - 15, cy - 4, 30, 6, LG(0, cy - 4, 0, cy + 2, [0, '#5a3a1e', 1, '#2a180a'])); E(cx, cy - 1, 2, 2, P.brassG(cx - 2, cx + 2));
      for (let i = 0; i < 3; i++) R(cx - 13 + i * 0.4, cy + 2 + i * 0.3, 26, 1.6, ['#c8bc9a', '#d4c8a8', '#bcb08e'][i]);
      R(cx - 13, cy + 3, 26, 34, LG(0, cy + 3, 0, cy + 37, [0, '#ece2c8', 1, '#cfc2a0']));
      P.tex(cx - 13, cy + 3, 26, 34, 0.2, 'multiply', 'mot', 0.4);
      txt('ОКТЯБРЬ', cx, cy + 9, 'bold 3.6px ' + SERIF, 'rgba(60,30,20,0.85)', 'center', '0.6px');
      txt('30', cx, cy + 25, 'bold 15px ' + SERIF, 'rgba(20,14,12,0.92)', 'center');
      txt('четверг', cx, cy + 33, 'italic 4px ' + SERIF, 'rgba(60,30,20,0.85)', 'center');
      lighter(function () { R(cx - 13, cy + 3, 26, 34, 'rgba(255,150,70,0.12)'); });
      // крючок с шарфом у края
      R(352, 34, 3, 2, '#3a2a1a');
      c.beginPath(); c.moveTo(350, 35); c.quadraticCurveTo(344, 70, 349, 104); c.lineTo(356, 104); c.quadraticCurveTo(360, 70, 356, 35); c.closePath(); c.fillStyle = LG(344, 0, 360, 0, [0, '#2a0e0c', 0.5, '#5a1e18', 1, '#1a0806']); c.fill();
      for (let i = 0; i < 6; i++) line(349 + i, 104, 349 + i, 108, '#4a1612', 0.4);
    });
  }
  function bookFace(x, y, w, h, d, col, edge) {
    poly([x, y - h, x + w, y - h, x + w + d * 0.45, y - h - d, x + d * 0.45, y - h - d], P.sh(col, 1.25));
    R(x, y - h, w, h, LG(0, y - h, 0, y, [0, P.sh(col, 1.1), 1, P.sh(col, 0.55)]));
    for (let k = 0; k < 2; k++) R(x + 6 + k * (w - 16), y - h + 0.6, 1, h - 1.2, 'rgba(220,180,90,0.55)');
    R(x + w * 0.3, y - h * 0.62, w * 0.4, h * 0.24, 'rgba(220,180,90,0.35)');
    poly([x + w, y - h, x + w + d * 0.45, y - h - d, x + w + d * 0.45, y - d, x + w, y], edge || '#d8caa6');
    for (let k = 1; k < 4; k++) line(x + w + 0.3, y - h + k * h / 4, x + w + d * 0.45, y - h + k * h / 4 - d, 'rgba(120,100,70,0.35)', 0.15);
  }
  function waxSeal(x, y, r) {
    c.beginPath();
    for (let i = 0; i <= 28; i++) { const a = i / 28 * 6.2832, n = 1 + 0.1 * Math.sin(a * 5 + 1) + 0.07 * Math.sin(a * 9 + 3); const px = x + Math.cos(a) * r * n, py = y + Math.sin(a) * r * n; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.closePath(); c.fillStyle = RG(x - r * 0.3, y - r * 0.35, 0, r * 1.3, [0, '#d8402c', 0.45, '#9a1a10', 1, '#4a0604']); c.fill();
    c.strokeStyle = 'rgba(60,4,2,0.7)'; c.lineWidth = 0.35; c.beginPath(); c.arc(x, y, r * 0.66, 0, 6.2832); c.stroke();
    txt('М', x + 0.3, y + r * 0.36 + 0.3, 'bold ' + (r * 0.95).toFixed(2) + 'px ' + SERIF, 'rgba(40,2,0,0.7)', 'center');
    txt('М', x, y + r * 0.36, 'bold ' + (r * 0.95).toFixed(2) + 'px ' + SERIF, 'rgba(230,110,90,0.55)', 'center');
    E(x - r * 0.38, y - r * 0.45, r * 0.32, r * 0.14, 'rgba(255,220,200,0.55)', -0.5);
  }
  function envelope1(x, y, w, h, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    soft(-w * 0.14, h * 0.18, w * 0.64, h * 0.66, '0,0,0', 0.8);
    R(-w / 2, -h / 2, w, h, LG(-w / 2, -h / 2, w / 2, h / 2, [0, '#cfc09a', 0.5, '#e4d6b4', 1, '#f2e8cc']));
    P.tex(-w / 2, -h / 2, w, h, 0.3, 'multiply', 'mot', 0.5);
    c.strokeStyle = 'rgba(80,60,30,0.38)'; c.lineWidth = 0.35;
    poly([-w / 2, -h / 2, 0, h * 0.12, w / 2, -h / 2, w / 2, -h / 2 + 1.2, 0, h * 0.12 + 1.2, -w / 2, -h / 2 + 1.2], 'rgba(60,40,20,0.12)');
    c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(0, h * 0.12); c.lineTo(w / 2, -h / 2); c.stroke();
    c.beginPath(); c.moveTo(-w / 2, h / 2); c.lineTo(-w * 0.1, h * 0.05); c.moveTo(w / 2, h / 2); c.lineTo(w * 0.1, h * 0.05); c.stroke();
    // загнутый уголок
    poly([w / 2, h / 2, w / 2 - 7, h / 2, w / 2, h / 2 - 6], '#b8a882'); poly([w / 2 - 7, h / 2, w / 2, h / 2 - 6, w / 2 - 6, h / 2 - 5.2], '#f6eed8');
    // марка с колоколом и штемпель
    const sx = w / 2 - 12, sy = -h / 2 + 9;
    R(sx - 6, sy - 7, 12, 14, '#efe8d6'); for (let i = 0; i < 6; i++) { E(sx - 6 + i * 2.4, sy - 7, 0.6, 0.6, '#cfc09a'); E(sx - 6 + i * 2.4, sy + 7, 0.6, 0.6, '#cfc09a'); }
    R(sx - 4.6, sy - 5.6, 9.2, 11.2, '#2a5a52'); R(sx - 3.8, sy - 4.8, 7.6, 9.6, '#3a7a6a');
    c.save(); c.translate(sx, sy - 2.6); c.scale(0.5, 0.5); c.beginPath(); c.moveTo(-1.6, 0); c.bezierCurveTo(-2.4, 2, -3, 5, -5, 6.4); c.lineTo(5, 6.4); c.bezierCurveTo(3, 5, 2.4, 2, 1.6, 0); c.closePath(); c.fillStyle = '#e8d8a0'; c.fill(); c.restore();
    txt('5 коп.', sx, sy + 4.6, 'bold 2.2px ' + SERIF, '#e8e0c8', 'center');
    c.strokeStyle = 'rgba(30,30,60,0.55)'; c.lineWidth = 0.4; c.beginPath(); c.arc(sx - 9, sy + 2, 6.2, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(sx - 9, sy + 2, 4.2, 0, 6.2832); c.stroke();
    txt('МГЛОВ', sx - 9, sy + 1.4, 'bold 2.1px ' + SERIF, 'rgba(30,30,60,0.6)', 'center'); txt('29.10', sx - 9, sy + 4, '1.8px ' + SERIF, 'rgba(30,30,60,0.6)', 'center');
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(sx - 1, sy - 3 + i * 2); for (let k = 0; k < 7; k++) c.lineTo(sx + k * 2, sy - 3 + i * 2 + (k % 2 ? 0.8 : -0.8)); c.stroke(); }
    // адрес
    txt('От нотариальной конторы г. Мглова', -w * 0.45, -h / 2 + 7, 'italic 3.4px ' + HAND, 'rgba(40,28,20,0.8)');
    txt('Наследнику', -w * 0.18, h * 0.3, '5.2px ' + HAND, 'rgba(26,18,30,0.92)');
    txt('М. И. Сорина', -w * 0.12, h * 0.3 + 6.4, '5.2px ' + HAND, 'rgba(26,18,30,0.92)');
    txt('в собственные руки', -w * 0.02, h * 0.3 + 12, 'italic 3.6px ' + HAND, 'rgba(26,18,30,0.8)');
    waxSeal(0, h * 0.11, 6.4);
    lighter(function () { R(-w / 2, -h / 2, w, h, LG(w / 2, 0, -w / 2, 0, [0, 'rgba(255,160,80,0.14)', 1, 'rgba(0,0,0,0)'])); });
    c.restore();
  }
  function watch1(x, y, r) {
    soft(x - r * 0.9, y + r * 0.3, r * 2, r * 0.9, '0,0,0', 0.7);
    // крышка открыта — лежит позади
    E(x + r * 0.2, y - r * 1.35, r * 1.05, r * 0.7, P.brassG(x - r, x + r)); E(x + r * 0.2, y - r * 1.35, r * 0.8, r * 0.5, '#7a5a24');
    for (let i = 0; i < 6; i++) { c.strokeStyle = 'rgba(255,220,150,0.25)'; c.lineWidth = 0.15; c.beginPath(); c.ellipse(x + r * 0.2, y - r * 1.35, r * 0.15 * i, r * 0.1 * i, 0, 0, 6.28); c.stroke(); }
    E(x, y, r * 1.14, r * 0.94, P.brassG(x - r, x + r)); E(x, y, r * 0.95, r * 0.78, '#f2e8cc');
    c.save(); c.translate(x, y); c.scale(1, 0.82);
    c.strokeStyle = 'rgba(30,22,14,0.8)';
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832; c.lineWidth = i % 3 ? 0.15 : 0.3; c.beginPath(); c.moveTo(Math.sin(a) * r * 0.72, -Math.cos(a) * r * 0.72); c.lineTo(Math.sin(a) * r * 0.88, -Math.cos(a) * r * 0.88); c.stroke(); }
    P.hands(0, 0, r * 0.86, 2.75, 45);
    c.restore();
    R(x - 0.8, y - r * 1.22, 1.6, 1.4, P.brassG(x - 1, x + 1)); c.strokeStyle = P.brassG(x - 2, x + 2); c.lineWidth = 0.4; c.beginPath(); c.arc(x, y - r * 1.45, 1.4, 0, 6.28); c.stroke();
    // цепочка
    for (let i = 0; i < 22; i++) { const p = i / 21, cx = x + 2 + p * r * 3.2, cy = y - r * 1.45 + Math.sin(p * 3.4) * r * 0.9 + p * r * 0.8; E(cx, cy, 0.55, 0.35, i % 2 ? '#c8a050' : '#8a6a2a', p * 2); }
    E(x - r * 0.35, y - r * 0.4, r * 0.4, r * 0.16, 'rgba(255,255,255,0.22)', -0.5);
  }
  function s1Desk() {
    return layer(function () {
      const y0 = 130;
      R(0, y0, W, H - y0, LG(0, y0, 0, H, [0, '#140a05', 0.3, '#22130a', 1, '#3a2213']));
      c.save(); c.beginPath(); c.rect(0, y0, W, H - y0); c.clip();
      const r = P.RNG(4);
      for (let i = -24; i <= 24; i++) line(192 + i * 8.6, y0, 192 + i * 30, H + 30, 'rgba(0,0,0,0.55)', 0.4);
      for (let i = 0; i < 220; i++) { const u = r() * 2 - 1, v0 = r(), v1 = v0 + 0.1 + r() * 0.3, xa = 192 + u * (100 + v0 * 260), xb = 192 + u * (100 + v1 * 260); line(xa, y0 + v0 * 90, xb, y0 + v1 * 90, 'rgba(10,4,0,' + (0.1 + r() * 0.2).toFixed(2) + ')', 0.18); }
      P.tex(0, y0, W, H - y0, 0.35, 'overlay', 'mot', 0.8);
      lighter(function () {
        c.fillStyle = RG(312, 176, 0, 170, [0, 'rgba(255,150,70,0.42)', 0.35, 'rgba(255,120,50,0.14)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, y0, W, H - y0);
        // окно бросает холодный свет на дальний край стола
        poly([40, y0, 226, y0, 250, y0 + 26, 20, y0 + 26], 'rgba(70,95,140,0.1)');
      });
      gl(312, 196, 6, '255,190,120', 0.22, 18);   // свеча отражается в лакированной столешнице
      c.restore();
      R(0, y0 - 1.2, W, 2.4, LG(0, y0 - 1.2, 0, y0 + 1.2, [0, '#3a2414', 1, '#0a0502']));
      // книги стопкой
      soft(30, 176, 46, 10, '0,0,0', 0.6);
      bookFace(6, 178, 62, 9, 14, '#4a1410'); bookFace(10, 169, 56, 8, 13, '#1a3022'); bookFace(4, 161, 60, 7, 12, '#3a2812');
      // чернильница с пером
      soft(88, 172, 18, 6, '0,0,0', 0.6);
      poly([86, 156, 104, 156, 108, 151, 90, 151], 'rgba(170,190,200,0.35)');
      R(86, 156, 18, 16, LG(86, 0, 104, 0, [0, 'rgba(20,20,40,0.95)', 0.4, 'rgba(50,50,80,0.9)', 1, 'rgba(10,10,20,0.95)']));
      R(87.4, 157, 1, 14, 'rgba(255,255,255,0.3)'); R(90, 148, 10, 4, P.brassG(90, 100));
      // перо: опахало с бородками, стержень
      c.beginPath(); c.moveTo(96, 149); c.bezierCurveTo(92, 132, 78, 112, 60, 94); c.bezierCurveTo(70, 100, 86, 108, 94, 122); c.bezierCurveTo(97, 130, 98, 140, 97, 148); c.closePath();
      c.fillStyle = LG(60, 94, 97, 149, [0, '#f4efe4', 0.6, '#ddd4c2', 1, '#a89c86']); c.fill();
      c.beginPath(); c.moveTo(95, 147); c.bezierCurveTo(88, 130, 80, 118, 62, 96); c.bezierCurveTo(72, 116, 80, 126, 88, 134); c.closePath(); c.fillStyle = 'rgba(150,140,120,0.35)'; c.fill();
      c.strokeStyle = 'rgba(110,100,80,0.45)'; c.lineWidth = 0.16;
      for (let k = 0; k < 18; k++) { const p = k / 17, x = lerp(95, 62, p), y = lerp(147, 96, p); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3.4 - p * 1.6, y - 1.2 - p * 0.6); c.stroke(); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2 + p, y + 1.6); c.stroke(); }
      line(96, 149, 61, 95, 'rgba(250,246,236,0.8)', 0.35);
      lighter(function () { line(97, 148, 66, 100, 'rgba(255,170,90,0.25)', 0.5); });
      // нож для бумаг
      soft(160, 200, 26, 4, '0,0,0', 0.5);
      c.save(); c.translate(158, 196); c.rotate(-0.12);
      poly([-30, 0, 10, -1.6, 14, 0, 10, 1.6], LG(0, -2, 0, 2, [0, '#f0f0f4', 0.5, '#9aa0a8', 1, '#4a4e54']));
      c.beginPath(); c.roundRect(14, -2.4, 16, 4.8, 2); c.fillStyle = LG(14, 0, 30, 0, [0, '#c8bca0', 1, '#8a7a5a']); c.fill();
      c.restore();
      envelope1(200, 168, 96, 52, -0.07);
      watch1(262, 192, 7);
      // подсвечник
      const kx = 314, ky = 178;
      soft(kx - 22, ky + 4, 30, 6, '0,0,0', 0.55);
      E(kx, ky, 19, 5.2, P.brassG(kx - 19, kx + 19)); E(kx, ky - 0.8, 16, 3.8, '#5a3a14'); E(kx, ky - 1, 15, 3.2, LG(kx - 15, 0, kx + 15, 0, [0, '#4a3010', 0.6, '#b08a40', 1, '#4a3010']));
      c.strokeStyle = P.brassG(kx + 14, kx + 26); c.lineWidth = 1.2; c.beginPath(); c.arc(kx + 20, ky - 4, 4, -1.2, 2.2); c.stroke();
      R(kx - 3.2, ky - 7, 6.4, 6, P.brassG(kx - 3.2, kx + 3.2));
      R(kx - 3.6, ky - 38, 7.2, 32, LG(kx - 3.6, 0, kx + 3.6, 0, [0, '#9a8a6a', 0.35, '#f4ead0', 0.65, '#e4d6b4', 1, '#7a6a4a']));
      E(kx, ky - 38, 3.6, 1.1, '#fff6dc');
      [[-3.4, -36, 1, 9], [2.8, -35, 0.9, 13], [-1.4, -33, 0.7, 6]].forEach(function (d) { E(kx + d[0], ky + d[1] + d[3] / 2, d[2], d[3] / 2, '#f2e6c4'); });
      line(kx, ky - 38, kx + 0.2, ky - 40, '#1a1008', 0.3);
    });
  }
  function s1Flash() {
    return layer(function () {
      blurred(1.4, function () {
        for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
          const x = 34 + i * 96 + j * 18, y = 134 + j * 20, w = 84, h = 16, sk = 22;
          poly([x, y, x + w, y, x + w + sk, y + h, x + sk, y + h], 'rgba(160,185,255,0.42)');
        }
        poly([236, 0, 384, 0, 384, 120, 250, 140], 'rgba(130,150,220,0.12)');
      });
    });
  }
  function lightning(t) { const a = Math.max(0, 1 - Math.abs(t - 4300) / 80), b = Math.max(0, 1 - Math.abs(t - 4480) / 130) * 0.85, d = t > 4480 ? Math.max(0, 0.22 * (1 - (t - 4480) / 900)) : 0; return Math.min(1, a + b + d); }
  function s1(t, k, now, L) {
    const fl = 1 + Math.sin(now / 83) * 0.05 + Math.sin(now / 31) * 0.03, fla = lightning(t), q = ease(k);
    camIn(lerp(1, 1.05, q), lerp(192, 186, q), lerp(108, 112, q), function () {
      c.drawImage(L.out, 0, 0, W, H);
      c.save(); c.beginPath(); c.rect(WN.x, WN.y, WN.w, WN.h); c.clip();
      rain(now, { n: 80, len: 5, spd: 0.3, a: 0.14, seed: 2, ang: -0.12 });
      rain(now, { n: 36, len: 11, spd: 0.55, a: 0.12, seed: 3, ang: -0.16, lw: 0.4 });
      if (fla > 0) R(WN.x, WN.y, WN.w, WN.h, 'rgba(195,210,255,' + (0.8 * fla).toFixed(3) + ')');
      c.restore();
      c.drawImage(L.room, 0, 0, W, H);
      // капли сползают по стеклу
      c.save(); c.beginPath(); c.rect(WN.x, WN.y, WN.w, WN.h); c.clip();
      const r = P.RNG(19);
      c.strokeStyle = 'rgba(170,190,215,0.18)'; c.lineWidth = 0.5; c.beginPath();
      const drops = [];
      for (let i = 0; i < 16; i++) { const x = WN.x + 4 + r() * (WN.w - 8), sp = 0.3 + r() * 0.8, p = (now / 6500 * sp + r()) % 1, y = WN.y - 6 + p * (WN.h + 12), s = 0.5 + r() * 0.6; c.moveTo(x, y - 16 * sp); c.lineTo(x + Math.sin(y * 0.3) * 0.3, y); drops.push([x, y, s]); }
      c.stroke();
      drops.forEach(function (d) { E(d[0], d[1] + d[2] * 0.4, d[2], d[2] * 1.3, 'rgba(0,0,0,0.3)'); E(d[0], d[1], d[2], d[2] * 1.25, 'rgba(180,200,225,0.35)'); E(d[0] - d[2] * 0.3, d[1] - d[2] * 0.5, d[2] * 0.34, d[2] * 0.34, 'rgba(255,240,220,0.6)'); });
      gl(194, 100, 8, '255,170,90', 0.22 * fl); gl(194, 100, 1.6, '255,230,180', 0.5 * fl);   // свеча отражается в стекле
      c.restore();
    });
    camIn(lerp(1, 1.16, q), lerp(192, 206, q), lerp(108, 150, q), function () {
      c.drawImage(L.desk, 0, 0, W, H);
      if (fla > 0) { c.save(); c.globalAlpha = fla; c.globalCompositeOperation = 'lighter'; c.drawImage(L.flash, 0, 0, W, H); c.restore(); }
      P.flame(314, 141.4, 2.0, now, 1, '255,150,60', 0);
      bloom(314, 136, 70, '255,160,80', 0.3 * fl);
      gl(300, 150, 150, '255,140,60', 0.05 * fl);
      P.motes(now, 250, 90, 120, 90, 26, 4, '255,220,170', 0.5);
    });
    if (fla > 0) R(0, 0, W, H, 'rgba(160,180,255,' + (0.12 * fla).toFixed(3) + ')');
  }

  /* ============================================================
     2–3. ЛИСТ ПИСЬМА КРУПНО
     ============================================================ */
  const PW = 300, PH = 360;
  let LETTER = null;
  function letterLines() {
    if (LETTER) return LETTER;
    const debt = (typeof B !== 'undefined' && B && B.debt) ? B.debt : 1200;
    LETTER = [
      { s: 'Настоящим уведомляю Вас,', y: 112 },
      { s: 'что дядя Ваш, Матвей Ильич Сорин,', y: 134 },
      { s: 'выбыл при невыясненных', y: 156, u: true },
      { s: 'обстоятельствах.', y: 178, u: true },
      { s: 'По завещанию Вам отходит его лавка —', y: 214 },
      { s: 'ломбард «Последний час» на Сенной,', y: 236 },
      { s: 'а равно и долг: ' + debt + ' грошей.', y: 258, red: true, key: 'а равно и долг' },
      { s: 'Приезжайте засветло.', y: 290, small: true }
    ];
    return LETTER;
  }
  function emblem(x, y) {
    c.save(); c.strokeStyle = 'rgba(60,40,28,0.75)'; c.fillStyle = 'rgba(60,40,28,0.75)'; c.lineWidth = 0.4;
    c.beginPath(); c.arc(x, y, 11, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(x, y, 9.6, 0, 6.2832); c.stroke();
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 7; i++) { const a = Math.PI / 2 + s * (0.5 + i * 0.32); E(x + Math.cos(a) * 7.6, y + Math.sin(a) * 7.6, 1.5, 0.6, 'rgba(60,40,28,0.7)', a + s * 0.9); }
    // ключ и весы
    c.beginPath(); c.arc(x, y - 3, 1.8, 0, 6.2832); c.stroke(); line(x, y - 1.2, x, y + 5, 'rgba(60,40,28,0.8)', 0.6); line(x, y + 3.4, x + 1.8, y + 3.4, 'rgba(60,40,28,0.8)', 0.5); line(x, y + 4.8, x + 1.4, y + 4.8, 'rgba(60,40,28,0.8)', 0.5);
    line(x - 5, y - 0.6, x + 5, y - 0.6, 'rgba(60,40,28,0.8)', 0.35);
    [-5, 5].forEach(function (d) { line(x + d, y - 0.6, x + d - 1.4, y + 2.4, 'rgba(60,40,28,0.7)', 0.2); line(x + d, y - 0.6, x + d + 1.4, y + 2.4, 'rgba(60,40,28,0.7)', 0.2); c.beginPath(); c.arc(x + d, y + 2.4, 1.5, 0, Math.PI); c.stroke(); });
    c.restore();
  }
  function s2Paper(head) {
    return layer(function () {
      const r = P.RNG(7);
      c.beginPath();
      for (let x = 2; x <= PW - 2; x += 1.6) c.lineTo(x, 2 + r() * 1.4);
      for (let y = 2; y <= PH - 2; y += 1.6) c.lineTo(PW - 2 - r() * 1.4, y);
      for (let x = PW - 2; x >= 2; x -= 1.6) c.lineTo(x, PH - 2 - r() * 1.4);
      for (let y = PH - 2; y >= 2; y -= 1.6) c.lineTo(2 + r() * 1.4, y);
      c.closePath();
      c.save(); c.clip();
      R(0, 0, PW, PH, LG(0, 0, PW, PH, [0, '#f0e4c6', 0.5, '#e6d6b2', 1, '#cbb68a']));
      for (let y = 0; y < PH; y += 0.9) R(0, y, PW, 0.22, 'rgba(120,100,60,0.035)');
      for (let x = 12; x < PW; x += 24) R(x, 0, 0.5, PH, 'rgba(120,100,60,0.05)');
      P.tex(0, 0, PW, PH, 0.35, 'multiply', 'mot', 0.6); P.tex(0, 0, PW, PH, 0.1, 'overlay');
      for (let i = 0; i < 420; i++) { const x = r() * PW, y = r() * PH, a = r() * 6.28, l = 0.8 + r() * 2.6; line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 'rgba(110,90,50,' + (0.06 + r() * 0.12).toFixed(2) + ')', 0.12); }
      for (let i = 0; i < 30; i++) { const x = r() * PW, y = r() * PH, s = 0.6 + r() * 3; soft(x, y, s * 2.2, s * 2.2, '140,90,40', 0.08 + r() * 0.14); E(x, y, s * 0.35, s * 0.35, 'rgba(120,70,30,' + (0.1 + r() * 0.16).toFixed(2) + ')'); }
      // кофейное кольцо — след стакана
      c.strokeStyle = 'rgba(130,80,40,0.12)'; c.lineWidth = 1.2; c.beginPath(); c.arc(256, 330, 22, 0, 6.2832); c.stroke(); c.lineWidth = 0.4; c.strokeStyle = 'rgba(130,80,40,0.18)'; c.beginPath(); c.arc(256, 330, 23, 0.3, 4.6); c.stroke();
      c.fillStyle = RG(PW / 2, PH / 2, PW * 0.28, PW * 0.9, [0, 'rgba(0,0,0,0)', 1, 'rgba(90,60,20,0.38)']); c.fillRect(0, 0, PW, PH);
      [124, 242].forEach(function (y) {
        R(0, y - 3, PW, 3, LG(0, y - 3, 0, y, [0, 'rgba(255,255,255,0)', 1, 'rgba(255,255,255,0.28)']));
        R(0, y, PW, 0.5, 'rgba(90,70,40,0.4)'); R(0, y + 0.5, PW, 5, LG(0, y, 0, y + 5, [0, 'rgba(60,40,20,0.2)', 1, 'rgba(60,40,20,0)']));
      });
      R(PW / 2, 0, 0.4, PH, 'rgba(90,70,40,0.16)');
      c.restore();
      if (head === false) return;
      emblem(PW / 2, 26);
      txt('НОТАРИАЛЬНАЯ КОНТОРА', PW / 2, 52, 'bold 7px ' + SERIF, 'rgba(50,34,24,0.85)', 'center', '1.6px');
      txt('г. Мглова · Сенная, 3', PW / 2, 61, 'italic 5px ' + SERIF, 'rgba(50,34,24,0.7)', 'center');
      line(70, 67, 140, 67, 'rgba(50,34,24,0.5)', 0.3); line(160, 67, 230, 67, 'rgba(50,34,24,0.5)', 0.3);
      c.save(); c.translate(150, 67); c.rotate(0.785); R(-1.4, -1.4, 2.8, 2.8, 'rgba(50,34,24,0.6)'); c.restore();
      txt('№ 1147', PW - 24, 18, '5px ' + SERIF, 'rgba(50,34,24,0.7)', 'right');
    }, PW, PH);
  }
  function s2Ink() {
    const lines = letterLines();
    return layer(function () {
      lines.forEach(function (l) {
        const font = (l.small ? 'italic 9.4px ' : '11px ') + HAND, col = l.red ? '78,18,12' : '28,18,36';
        c.font = font; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        c.fillStyle = 'rgba(' + col + ',0.16)';
        [[0.28, 0.1], [-0.25, 0], [0, 0.3], [0.1, -0.22]].forEach(function (d) { c.fillText(l.s, 26 + d[0], l.y + d[1]); });
        c.fillStyle = 'rgba(' + col + ',0.9)'; c.fillText(l.s, 26, l.y);
        l.w = c.measureText(l.s).width;
        if (l.key) l.kx = 26 + c.measureText(l.key).width;
        if (l.u) { c.strokeStyle = 'rgba(' + col + ',0.7)'; c.lineWidth = 0.55; c.beginPath(); c.moveTo(26, l.y + 3.4); for (let x = 0; x <= l.w; x += 4) c.lineTo(26 + x, l.y + 3.4 + Math.sin(x * 0.2) * 0.4); c.stroke(); }
      });
      txt('30 октября', PW - 26, 86, '9px ' + HAND, 'rgba(28,18,36,0.85)', 'right');
      // подпись и печать
      txt('Нотариус', 150, 322, 'italic 7px ' + HAND, 'rgba(28,18,36,0.8)');
      txt('Л. Вельц', 196, 330, '12px ' + HAND, 'rgba(28,18,36,0.9)');
      c.strokeStyle = 'rgba(28,18,36,0.75)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(196, 334); c.bezierCurveTo(230, 340, 262, 328, 270, 320); c.bezierCurveTo(262, 336, 220, 344, 200, 338); c.stroke();
      c.save(); c.translate(120, 322); c.rotate(-0.18);
      c.strokeStyle = 'rgba(80,60,150,0.55)'; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, 18, 0, 6.2832); c.stroke(); c.lineWidth = 0.4; c.beginPath(); c.arc(0, 0, 13, 0, 6.2832); c.stroke();
      const ring = 'НОТАРИУС · г. МГЛОВ · КОНТОРА № 3 · ';
      c.font = 'bold 3.2px ' + SERIF; c.fillStyle = 'rgba(80,60,150,0.6)'; c.textAlign = 'center';
      for (let i = 0; i < ring.length; i++) { const a = i / ring.length * 6.2832 - Math.PI / 2; c.save(); c.translate(Math.cos(a) * 15.2, Math.sin(a) * 15.2); c.rotate(a + Math.PI / 2); c.fillText(ring[i], 0, 1); c.restore(); }
      txt('Вельц', 0, 1.6, 'bold 4.4px ' + SERIF, 'rgba(80,60,150,0.6)', 'center');
      c.restore();
    }, PW, PH);
  }
  function s2Bg() {
    return layer(function () {
      blurred(3.2, function () {
        R(0, 0, W, H, '#140904'); P.boards(0, 0, W, H, 22, '#2a160a', 6);
        lighter(function () { c.fillStyle = RG(390, -10, 0, 330, [0, 'rgba(255,150,70,0.45)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, W, H); });
        bloom(372, 6, 50, '255,170,90', 0.6);
      });
    });
  }
  /* строки «проявляются», как будто их читают; schedule[i] — когда начинается строка i */
  function drawInk(ink, sched, t, extra) {
    const lines = letterLines();
    c.save(); c.beginPath(); let any = false;
    lines.forEach(function (l, i) { const at = sched[i]; if (at === undefined) return; const p = seg(t, at, at + l.s.length * 50); if (p <= 0) return; any = true; c.rect(24, l.y - 13, ((l.w || 200) + 6) * p, 19); });
    (extra || []).forEach(function (e) { if (t > e[4]) { any = true; c.rect(e[0], e[1], e[2] * seg(t, e[4], e[4] + 900), e[3]); } });
    if (any) { c.clip(); c.drawImage(ink, 0, 0, PW, PH); }
    c.restore();
  }
  function paperView(t, k, now, L, fy0, fy1, z0, z1, inner) {
    const fl = 1 + Math.sin(now / 90) * 0.03 + Math.sin(now / 37) * 0.015, q = ease(k);
    c.save(); c.translate(-lerp(0, 6, q), -lerp(0, 4, q)); c.drawImage(L.bg, -4, -4, W + 8, H + 8); c.restore();
    cam(lerp(z0, z1, q), 192, lerp(fy0, fy1, q), function () {
      c.save(); c.translate(42 + PW / 2, PH / 2 - 20); c.rotate(-0.016); c.translate(-PW / 2, -PH / 2);
      soft(PW / 2 + 6, PH / 2 + 8, PW * 0.62, PH * 0.6, '0,0,0', 0.75);
      c.drawImage(L.paper, 0, 0, PW, PH);
      inner();
      lighter(function () { c.fillStyle = RG(PW + 20, -10, 0, 300, [0, 'rgba(255,150,70,' + (0.16 * fl).toFixed(3) + ')', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, PW, PH); });
      c.restore();
    });
    R(0, 0, W, H, RG(330, 0, 60, 420, [0, 'rgba(20,10,0,0)', 1, 'rgba(20,10,0,0.55)']));
    P.motes(now, 200, 0, 184, 150, 22, 9, '255,220,170', 0.45);
  }
  /* чернила растекаются от слова «долг» и встают тенью в цилиндре */
  function blot(x, y, t, now) {
    const p = ease(seg(t, 5000, 7600));
    if (p <= 0) return;
    const R0 = 2.5 + p * 13, ink = 'rgba(10,8,16,0.95)';
    // бумага впитывает: бледный ореол, потом само пятно — округлое, с наплывами и потёками
    soft(x, y, R0 * 2.1, R0 * 1.5, '60,46,70', 0.35 * p);
    soft(x, y, R0 * 1.35, R0 * 1.05, '20,14,30', 0.5 * p);
    c.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * 6.2832, n = 1 + 0.12 * Math.sin(a * 3 + 1.3 + p) + 0.07 * Math.sin(a * 5 + 0.4) + 0.035 * Math.sin(a * 11 + 2) + (Math.abs(a - 1.6) < 0.25 ? 0.35 * p * (1 - Math.abs(a - 1.6) / 0.25) : 0);
      const px = x + Math.cos(a) * R0 * n, py = y + Math.sin(a) * R0 * n * 0.8;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath(); c.fillStyle = ink; c.fill();
    const r = P.RNG(17);
    for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = R0 * (1.25 + r() * 0.7), s = (0.3 + r() * 0.9) * p; E(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, s, s * 0.9, ink); }
    c.strokeStyle = 'rgba(10,8,16,0.4)'; c.lineWidth = 0.18;
    for (let i = 0; i < 10; i++) { const a = r() * 6.28, l = R0 * (1.05 + r() * 0.5); c.beginPath(); c.moveTo(x + Math.cos(a) * R0 * 0.95, y + Math.sin(a) * R0 * 0.76); c.lineTo(x + Math.cos(a + 0.05) * l, y + Math.sin(a + 0.05) * l * 0.8); c.stroke(); }
    E(x - R0 * 0.32, y - R0 * 0.28, R0 * 0.34, R0 * 0.11, 'rgba(255,255,255,' + (0.22 * p).toFixed(3) + ')', -0.4);
    E(x + R0 * 0.2, y + R0 * 0.36, R0 * 0.18, R0 * 0.05, 'rgba(255,255,255,' + (0.1 * p).toFixed(3) + ')', -0.2);
    // из пятна поднимается чернильная фигура в цилиндре
    const q = ease(seg(t, 6300, 8700));
    if (q > 0) {
      const hgt = 54 * q;
      soft(x, y - hgt * 0.5, hgt * 0.32, hgt * 0.6, '40,30,50', 0.3 * q);
      person(x + 1, y + 1, hgt, { col: 'rgba(10,8,16,0.94)', thin: 0.95, hat: 'top', blur: 0.28, flare: 1.5 });
      if (q > 0.6) for (let i = 0; i < 3; i++) { const dx = (hsh(i) - 0.5) * 6; E(x + dx, y - hgt * (0.2 + hsh(i + 5) * 0.3) + ((now / 900 + hsh(i)) % 1) * 4, 0.4, 0.8, ink); }
      if (t > 8900 && t < 9300) { E(x - 0.9, y - hgt * 0.94, 0.45, 0.3, 'rgba(230,220,200,0.9)'); E(x + 1.6, y - hgt * 0.94, 0.45, 0.3, 'rgba(230,220,200,0.9)'); }
    }
  }

  /* ============================================================
     4. ВОКЗАЛ: поезд уходит в туман, на перроне — ты
     ============================================================ */
  const pv4 = PV(236, 92, 110);
  const ZL4 = [6.8, 15.8, 24.8, 33.8, 42.8, 51.8];
  function s4Back() {
    return layer(function () {
      const pr = pv4;
      R(0, 0, W, H, LG(0, 0, 0, 130, [0, '#020409', 0.55, '#0a101a', 1, '#1c2026']));
      for (let i = 0; i < 12; i++) soft(20 + hsh(i) * 200, 6 + hsh(i + 3) * 40, 40, 8, '26,32,44', 0.5);
      gl(236, 92, 150, '110,102,90', 0.35); gl(236, 92, 46, '200,180,150', 0.25);
      // город за путями, в дымке
      blurred(1.5, function () {
        const r = P.RNG(3); let x = -4;
        while (x < 232) { const w = 6 + r() * 11, h = 4 + r() * 13, by = 94 + (232 - x) * 0.04; R(x, by - h, w, h + 10, '#121620'); poly([x - 0.6, by - h, x + w / 2, by - h - 2.5, x + w + 0.6, by - h], '#121620'); if (r() < 0.4) R(x + w * 0.6, by - h - 4, 1.2, 4, '#121620'); for (let k = 0; k < 3; k++) if (r() < 0.35) R(x + 1 + r() * (w - 2), by - h + 2 + r() * (h - 2), 0.9, 1.2, 'rgba(255,190,110,0.75)'); x += w + r() * 2; }
        E(120, 78, 4, 5, '#121620'); R(116, 78, 8, 14, '#121620');
      });
      // стена вокзала справа: кирпич; окна целиком под навесом (навес на высоте -3.4)
      Q(pr, [[9, -6.6, 1], [9, -6.6, 220], [9, 1.5, 220], [9, 1.5, 1]], LG(380, 0, 236, 0, [0, '#3a2820', 0.6, '#1e1612', 1, '#141012']));
      for (let y = 1.5; y > -6.6; y -= 0.28) L3(pr, [9, y, 1.2], [9, y, 140], 'rgba(0,0,0,0.25)', 0.18);
      Q(pr, [[8.98, 1.5, 1], [8.98, 1.5, 220], [8.98, 0.9, 220], [8.98, 0.9, 1]], '#2a1e18');                 // цоколь
      Q(pr, [[8.97, -3.05, 1], [8.97, -3.05, 220], [8.97, -3.3, 220], [8.97, -3.3, 1]], '#4a3a2e');            // карниз под навесом
      function archPts(x, z0, w, yb, ys) { const pts = [[x, yb, z0], [x, yb, z0 + w], [x, ys, z0 + w]]; for (let a = 0; a <= 10; a++) { const an = a / 10 * Math.PI; pts.push([x, ys - w / 2 * Math.sin(an), z0 + w / 2 + w / 2 * Math.cos(an)]); } pts.push([x, ys, z0]); return pts; }
      for (let i = 0; i < 8; i++) {
        if (i === 1) continue;                                   // здесь дверь
        const z0 = 5 + i * 7, w = 1.6, lit = i % 3 !== 2, s = 110 / (z0 + 0.8), lw = Math.max(0.15, 0.06 * s);
        Q(pr, archPts(8.97, z0 - 0.22, w + 0.44, 0.25, -1.75), '#4e3c2e');                                     // каменный наличник
        Q(pr, archPts(8.96, z0, w, 0.1, -1.95), lit ? '#d8944a' : '#121820');
        if (lit) { const m = pr(9, -1.2, z0 + w / 2); gl(m[0], m[1], 1.6 * s + 3, '255,170,80', 0.32); }
        L3(pr, [8.95, 0.1, z0 + w / 2], [8.95, -2.75, z0 + w / 2], '#140c08', lw);
        L3(pr, [8.95, -0.9, z0], [8.95, -0.9, z0 + w], '#140c08', lw); L3(pr, [8.95, -1.95, z0], [8.95, -1.95, z0 + w], '#140c08', lw);
        Q(pr, [[8.8, 0.25, z0 - 0.25], [8.8, 0.25, z0 + w + 0.25], [8.8, 0.38, z0 + w + 0.25], [8.8, 0.38, z0 - 0.25]], '#5a4a3a');   // подоконник
        Q(pr, [[8.95, -2.6, z0 + w / 2 - 0.18], [8.95, -2.6, z0 + w / 2 + 0.18], [8.95, -2.98, z0 + w / 2 + 0.22], [8.95, -2.98, z0 + w / 2 - 0.22]], '#5e4c3c');   // замковый камень
      }
      // дверь вокзала: двустворчатая, со стеклом и фрамугой, над ней фонарь
      Q(pr, archPts(8.97, 11.6, 2.2, 1.5, -1.9), '#4e3c2e');
      Q(pr, archPts(8.96, 11.8, 1.8, 1.5, -1.8), '#5a3418');
      Q(pr, [[8.95, -0.2, 11.95], [8.95, -0.2, 13.45], [8.95, -1.7, 13.45], [8.95, -1.7, 11.95]], '#e0a060');
      L3(pr, [8.94, 1.5, 12.7], [8.94, -1.8, 12.7], '#1a0e06', 0.4);
      const dl = pr(8.6, -2.95, 12.7); gl(dl[0], dl[1], 8, '255,190,110', 0.45);
      // путь: балласт, шпалы, рельсы
      Q(pr, [[-1.2, 2.6, 0.7], [-1.2, 2.6, 300], [-9, 2.6, 300], [-9, 2.6, 0.7]], LG(0, 92, 0, 216, [0, '#14120f', 1, '#2a2622']));
      P.tex(0, 92, 236, 124, 0.35, 'overlay');
      for (let z = 1; z < 70; z += 0.72) Q(pr, [[-4.7, 2.6, z], [-1.4, 2.6, z], [-1.4, 2.6, z + 0.24], [-4.7, 2.6, z + 0.24]], '#1e150c');
      [-2.3, -3.8].forEach(function (x) {
        Q(pr, [[x - 0.05, 2.45, 0.8], [x + 0.05, 2.45, 0.8], [x + 0.05, 2.45, 300], [x - 0.05, 2.45, 300]], '#4a4c50');
        L3(pr, [x + 0.04, 2.44, 0.9], [x + 0.04, 2.44, 200], 'rgba(220,210,200,0.55)', 0.3);
      });
      // второй путь, дощатый забор, семафор с зелёным огнём
      for (let z = 1.5; z < 60; z += 0.72) Q(pr, [[-8.0, 2.6, z], [-5.2, 2.6, z], [-5.2, 2.6, z + 0.22], [-8.0, 2.6, z + 0.22]], '#18120c');
      [-5.9, -7.4].forEach(function (x) { L3(pr, [x, 2.48, 1.2], [x, 2.48, 200], 'rgba(170,165,160,0.4)', 0.3); });
      Q(pr, [[-10, 2.6, 1], [-10, 2.6, 300], [-10, 0.2, 300], [-10, 0.2, 1]], '#0a0c0f');
      for (let z = 1.2; z < 40; z += 0.3) L3(pr, [-10, 2.6, z], [-10, 0.2 - hsh(z * 7) * 0.25, z], 'rgba(0,0,0,0.5)', Math.max(0.12, 0.03 * 110 / z));
      L3(pr, [-10, 0.9, 1.2], [-10, 0.9, 200], 'rgba(60,60,64,0.4)', 0.3);
      const sg = pr(-6.6, 2.6, 26), st = pr(-6.6, -3.4, 26), s26 = 110 / 26;
      line(sg[0], sg[1], st[0], st[1], '#08090b', 0.12 * s26);
      line(st[0], st[1] + 0.4 * s26, st[0] + 1.1 * s26, st[1] + 0.1 * s26, '#08090b', 0.18 * s26);
      E(st[0] - 0.05 * s26, st[1] + 0.7 * s26, 0.12 * s26, 0.12 * s26, '#7aff9a'); gl(st[0], st[1] + 0.7 * s26, 6, '90,255,140', 0.6);
    });
  }
  function car4(i, z0, z1, rear) {
    const pr = pv4; if (z1 < 0.9) return;
    const za = Math.max(z0, 0.9);
    Q(pr, [[-1.55, -2.55, za], [-1.55, -2.55, z1], [-1.55, 2.0, z1], [-1.55, 2.0, za]], '#18221e');
    Q(pr, [[-1.55, -2.55, za], [-1.55, -2.55, z1], [-1.72, -2.9, z1], [-1.72, -2.9, za]], '#0a0f0d');
    L3(pr, [-1.55, -2.0, za], [-1.55, -2.0, z1], 'rgba(200,170,110,0.25)', Math.max(0.15, 0.04 * 110 / za));
    for (let j = 0; j < 8; j++) {
      const w0 = z0 + 1.3 + j * 1.65, w1 = w0 + 1.05; if (w1 < za) continue;
      const lit = hsh(i * 13 + j) > 0.18, ww0 = Math.max(w0, za);
      Q(pr, [[-1.55, -1.62, ww0], [-1.55, -1.62, w1], [-1.55, -0.52, w1], [-1.55, -0.52, ww0]], lit ? '#f2b060' : '#0a0e0c');
      if (lit && hsh(i * 7 + j * 3) > 0.5) {
        const zc = (w0 + w1) / 2, p = pr(-1.55, -0.75, zc), s = 110 / zc;
        E(p[0], p[1] - s * 0.3, s * 0.14, s * 0.18, 'rgba(50,28,12,0.9)'); E(p[0], p[1] + s * 0.06, s * 0.3, s * 0.18, 'rgba(50,28,12,0.9)');
      }
    }
    Q(pr, [[-1.55, 1.15, za], [-1.55, 1.15, z1], [-1.55, 2.0, z1], [-1.55, 2.0, za]], '#080b0a');
    // филёнки и полоса по борту
    L3(pr, [-1.55, 0.2, za], [-1.55, 0.2, z1], 'rgba(200,170,100,0.2)', Math.max(0.15, 0.03 * 110 / za));
    for (let p = z0 + 2; p < z1 - 0.5; p += 2.4) if (p > za) L3(pr, [-1.55, -2.5, p], [-1.55, 1.1, p], 'rgba(0,0,0,0.35)', Math.max(0.12, 0.03 * 110 / p));
    if (rear && z0 > 0.9) {
      // торец последнего вагона: выгнутая крыша, тамбур с перилами, буфера, сцепка, хвостовые фонари
      const top = [];
      for (let a = 0; a <= 12; a++) { const x = -1.55 - 2.9 * a / 12; top.push([x, -2.55 - 0.42 * Math.sin(Math.PI * a / 12), z0]); }
      const pts = top.concat([[-4.45, 2.0, z0], [-1.55, 2.0, z0]]);
      const pa = pr(-1.55, -2.9, z0), pb = pr(-1.55, 2.0, z0);
      Q(pr, pts, LG(0, pa[1], 0, pb[1], [0, '#22302a', 0.5, '#16201c', 1, '#0a100e']));
      const pl = pr(-1.55, 0, z0), pf = pr(-4.45, 0, z0);
      lighter(function () { Q(pr, pts, LG(pl[0], 0, pf[0], 0, [0, 'rgba(255,190,120,0.12)', 0.4, 'rgba(0,0,0,0)'])); });
      Q(pr, [[-2.5, -2.25, z0], [-3.5, -2.25, z0], [-3.5, 1.95, z0], [-2.5, 1.95, z0]], '#080c0a');
      Q(pr, [[-2.68, -1.85, z0], [-3.32, -1.85, z0], [-3.32, -0.85, z0], [-2.68, -0.85, z0]], 'rgba(220,160,90,0.6)');
      L3(pr, [-1.75, 0.55, z0], [-4.25, 0.55, z0], '#2a3230', Math.max(0.2, 0.05 * 110 / z0));
      [-1.75, -2.4, -3.6, -4.25].forEach(function (x) { L3(pr, [x, 0.55, z0], [x, 1.7, z0], '#2a3230', Math.max(0.15, 0.04 * 110 / z0)); });
      L3(pr, [-1.6, -1.9, z0], [-4.4, -1.9, z0], 'rgba(200,170,100,0.25)', Math.max(0.15, 0.03 * 110 / z0));
      [-1.95, -4.05].forEach(function (x) { const b = pr(x, 1.62, z0), s = 110 / z0; E(b[0], b[1], 0.2 * s, 0.2 * s, '#0c0c0c'); E(b[0] - 0.05 * s, b[1] - 0.05 * s, 0.08 * s, 0.08 * s, 'rgba(200,200,210,0.35)'); });
      const hk = pr(-3.0, 1.7, z0), s0 = 110 / z0; R(hk[0] - 0.12 * s0, hk[1] - 0.06 * s0, 0.24 * s0, 0.24 * s0, '#0a0a0a');
      [-1.85, -4.15].forEach(function (x) { const b = pr(x, 1.1, z0); R(b[0] - 0.14 * s0, b[1] - 0.16 * s0, 0.28 * s0, 0.3 * s0, '#0a0a0a'); E(b[0], b[1], 0.08 * s0, 0.08 * s0, '#ff5040'); });
    }
  }
  function steam4(zf, ts) {
    const pr = pv4;
    for (let i = 13; i >= 0; i--) {
      const age = i * 0.34, tb = ts - age; if (tb < -2) continue;
      const zb = 3.2 + 1.1 * tb + 0.85 * Math.max(0, tb) * Math.max(0, tb) + 6 * 16.2 + 8;
      if (zb < 4) continue;
      const p = pr(-3 + age * 0.4, -3.7 - age * 0.55, zb), s = (1.4 + age * 1.3) * 110 / zb;
      soft(p[0], p[1], s, s * 0.8, '150,146,142', 0.55 * (1 - i / 14));
    }
  }
  function s4Front(o) {
    o = o || {};
    return layer(function () {
      const pr = pv4;
      // перрон: плиты, мокрый блеск, отражения фонарей
      Q(pr, [[-1.2, 1.5, 0.6], [-1.2, 1.5, 300], [9, 1.5, 300], [9, 1.5, 0.6]], LG(0, 92, 0, 216, [0, '#141517', 0.45, '#24272a', 1, '#34383c']));
      // фактура только по самому перрону (вне его слой прозрачный)
      c.save(); c.beginPath(); [[-1.2, 1.5, 0.6], [-1.2, 1.5, 300], [9, 1.5, 300], [9, 1.5, 0.6]].forEach(function (q, i) { const p = pr(q[0], q[1], q[2]); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.clip();
      P.tex(0, 92, W, 124, 0.4, 'overlay', 'mot', 1);
      c.restore();
      [-0.3, 0.9, 2.1, 3.3, 4.5, 5.7, 6.9, 8.1].forEach(function (x) { L3(pr, [x, 1.5, 0.8], [x, 1.5, 200], 'rgba(0,0,0,0.4)', 0.25); });
      for (let z = 1, i = 0; z < 90; z *= 1.16, i++) L3(pr, [-1.2, 1.5, z], [9, 1.5, z], 'rgba(0,0,0,0.35)', 0.25);
      Q(pr, [[-1.2, 1.5, 0.6], [-1.2, 1.5, 300], [-0.75, 1.5, 300], [-0.75, 1.5, 0.6]], '#4a4a46');
      Q(pr, [[-1.2, 1.5, 0.6], [-1.2, 1.5, 300], [-1.2, 1.78, 300], [-1.2, 1.78, 0.6]], '#1c1c1a');
      L3(pr, [-0.77, 1.49, 0.7], [-0.77, 1.49, 200], 'rgba(230,220,200,0.35)', 0.3);
      ZL4.forEach(function (z) {
        const a = pr(1.8, 1.5 + 1.7, z), s = 110 / z;
        gl(a[0], a[1], 0.5 * s + 1, '255,190,110', 0.32, 2.2 * s + 3);
        const b = pr(1.8, 1.5, z - 0.6); gl(b[0], b[1], 2.6 * s, '255,180,100', 0.18, 0.5 * s);
      });
      for (let i = 0; i < 5; i++) { const z = 2.4 + i * 3.1, x = -0.2 + hsh(i) * 6, p = pr(x, 1.5, z), s = 110 / z; E(p[0], p[1], (0.6 + hsh(i + 2)) * s, 0.12 * s, 'rgba(8,10,12,0.4)'); }
      // навес: потолок, балки, резной подзор
      Q(pr, [[-1.0, -3.4, 0.6], [-1.0, -3.4, 300], [9, -3.4, 300], [9, -3.4, 0.6]], '#0a0b0d');
      for (let z = 3; z < 120; z += 9) { Q(pr, [[-1.0, -3.4, z], [9, -3.4, z], [9, -3.05, z], [-1.0, -3.05, z]], '#121315'); }
      Q(pr, [[-1.0, -3.4, 0.6], [-1.0, -3.4, 300], [-1.0, -3.0, 300], [-1.0, -3.0, 0.6]], '#131416');
      for (let z = 0.9; z < 55; z += 0.5) Q(pr, [[-1.0, -3.0, z], [-1.0, -2.72, z + 0.25], [-1.0, -3.0, z + 0.5]], '#131416');
      // скамья у стены
      Q(pr, [[7.4, 1.0, 3.4], [7.4, 1.0, 6.2], [8.4, 1.0, 6.2], [8.4, 1.0, 3.4]], '#2a1a0e');
      Q(pr, [[8.4, 1.0, 3.4], [8.4, 1.0, 6.2], [8.4, -0.2, 6.2], [8.4, -0.2, 3.4]], '#1e120a');
      [3.6, 6.0].forEach(function (z) { L3(pr, [7.5, 1.5, z], [7.5, 1.0, z], '#0a0806', 1.2); });
      // колонны: у края (перед поездом) и у стены; с подкосами
      [-0.5, 4.2].forEach(function (x) {
        for (let n = 9; n >= 0; n--) {
          const z = 3 + n * 9, pb = pr(x, 1.5, z), pt = pr(x, -3.4, z), s = 110 / z, w = Math.max(0.5, 0.17 * s);
          R(pb[0] - w / 2, pt[1], w, pb[1] - pt[1], LG(pb[0] - w / 2, 0, pb[0] + w / 2, 0, [0, '#040405', 0.55, '#26272b', 1, '#060607']));
          R(pb[0] - w, pb[1] - 0.4 * s, w * 2, 0.4 * s, '#0e0e10');
          R(pb[0] - w * 0.9, pt[1] + 0.45 * s, w * 1.8, 0.14 * s, '#141416');
          L3(pr, [x, -2.5, z], [x, -3.4, z - 1.2], '#0e0f11', Math.max(0.2, 0.07 * s)); L3(pr, [x, -2.5, z], [x, -3.4, z + 1.2], '#0e0f11', Math.max(0.2, 0.07 * s));
          R(pb[0] + w * 0.2, pt[1], Math.max(0.2, w * 0.12), pb[1] - pt[1], 'rgba(255,200,140,0.22)');
        }
      });
      // фонари под навесом
      ZL4.slice().reverse().forEach(function (z) {
        const top = pr(1.8, -3.4, z), lp = pr(1.8, -2.0, z), s = 110 / z;
        line(top[0], top[1], lp[0], lp[1] - 0.4 * s, '#0c0c0e', Math.max(0.2, 0.04 * s));
        poly([lp[0] - 0.22 * s, lp[1] - 0.38 * s, lp[0] + 0.22 * s, lp[1] - 0.38 * s, lp[0] + 0.16 * s, lp[1] + 0.3 * s, lp[0] - 0.16 * s, lp[1] + 0.3 * s], 'rgba(255,214,150,0.92)');
        poly([lp[0] - 0.3 * s, lp[1] - 0.38 * s, lp[0] + 0.3 * s, lp[1] - 0.38 * s, lp[0], lp[1] - 0.62 * s], '#0c0c0e');
        R(lp[0] - 0.2 * s, lp[1] + 0.3 * s, 0.4 * s, 0.08 * s, '#0c0c0e');
      });
      // вокзальные часы на балке навеса, двусторонние; стоят на без четверти три
      (function () {
        const zc = 12, top = pr(1.8, -3.4, zc), cc = pr(1.8, -2.55, zc), s = 110 / zc;
        line(top[0], top[1], cc[0], cc[1] - 0.36 * s, '#0c0c0e', Math.max(0.3, 0.06 * s));
        E(cc[0], cc[1], 0.4 * s, 0.4 * s, '#0c0c0e'); E(cc[0], cc[1], 0.36 * s, 0.36 * s, P.brassG(cc[0] - 0.36 * s, cc[0] + 0.36 * s));
        P.face(cc[0], cc[1], 0.31 * s, { plain: true, paper: '#e8dcbc' });
        gl(cc[0], cc[1], 0.5 * s, '255,210,150', 0.12);
      })();
      // вывеска «МГЛОВ» на цепях, против света фонаря
      const zs = 5.4, sa = pr(0.4, -2.95, zs), sb = pr(3.2, -2.35, zs), s = 110 / zs;
      line(sa[0] + 4, pr(0, -3.4, zs)[1], sa[0] + 4, sa[1], '#2a2a2a', 0.3); line(sb[0] - 4, pr(0, -3.4, zs)[1], sb[0] - 4, sa[1], '#2a2a2a', 0.3);
      c.beginPath(); c.roundRect(sa[0], sa[1], sb[0] - sa[0], sb[1] - sa[1], 0.8); c.fillStyle = LG(0, sa[1], 0, sb[1], [0, '#2a1a0e', 1, '#140a04']); c.fill();
      c.strokeStyle = 'rgba(200,160,80,0.6)'; c.lineWidth = 0.4; c.strokeRect(sa[0] + 1.2, sa[1] + 1.2, sb[0] - sa[0] - 2.4, sb[1] - sa[1] - 2.4);
      txt('МГЛОВ', (sa[0] + sb[0]) / 2, sb[1] - 3.1, 'bold 8px ' + SERIF, '#e0c88a', 'center', '2px');
      if (o.noHero) return;
      // ты: спиной к нам, чемодан у ноги, тень тянется к нам, отражение в мокром
      const fz = 4.6, fp = pr(0.9, 1.5, fz), fs = 110 / fz, fh = 1.75 * fs;
      c.save(); c.globalAlpha = 0.5;
      const se = pr(0.35, 1.5, 2.9);
      c.beginPath(); c.moveTo(fp[0] - 0.25 * fs, fp[1]); c.lineTo(fp[0] + 0.25 * fs, fp[1]); c.lineTo(se[0] + 0.5 * fs, se[1]); c.lineTo(se[0] - 0.6 * fs, se[1]); c.closePath(); c.fillStyle = LG(0, fp[1], 0, se[1], [0, 'rgba(0,0,0,0.9)', 1, 'rgba(0,0,0,0)']); c.fill();
      c.restore();
      blurred(0.8, function () { c.save(); c.translate(fp[0], fp[1]); c.scale(1, -0.75); person(0, 0, fh, { col: 'rgba(5,6,8,0.32)', scarf: true, bag: true }); c.restore(); });
      person(fp[0], fp[1], fh, { col: '#07080a', col2: '#0c0d10', scarf: true, bag: true, rim: 'rgba(255,200,140,0.6)', rimDy: -1.4, rimDx: 0.5 });
    });
  }
  function s4(t, k, now, L) {
    const q = ease(k), ts = t / 1000, zr = 3.2 + 1.1 * ts + 0.85 * ts * ts, pr = pv4;
    camIn(lerp(1, 1.14, q), lerp(200, 230, q), lerp(104, 100, q), function () {
      c.drawImage(L.back, 0, 0, W, H);
      for (let i = 5; i >= 0; i--) car4(i, zr + i * 16.2, zr + i * 16.2 + 15, i === 0);
      steam4(zr, ts);
      c.drawImage(L.front, 0, 0, W, H);
      // окна вагонов бросают свет на мокрый край перрона
      for (let i = 0; i < 3; i++) for (let j = 0; j < 8; j++) {
        if (hsh(i * 13 + j) <= 0.18) continue;
        const zc = zr + i * 16.2 + 1.3 + j * 1.65 + 0.5; if (zc < 1.2 || zc > 45) continue;
        const p = pr(-0.7, 1.5, zc), s = 110 / zc; gl(p[0], p[1], 0.9 * s, '255,180,100', 0.28, 0.25 * s);
        const rr = pr(-1.0, 1.5 + 0.8, zc); gl(rr[0], rr[1], 0.25 * s, '255,180,100', 0.15, 0.8 * s);
      }
      // хвостовые огни
      if (zr > 1) [[-1.85, 1.1], [-4.15, 1.1]].forEach(function (l) { const p = pr(l[0], l[1], zr), s = 110 / zr; bloom(p[0], p[1], 1.6 * s + 6, '255,40,30', 0.6); });
      // фонари мерцают
      ZL4.forEach(function (z, i) { const p = pr(1.8, -2.0, z), s = 110 / z, f = 1 + Math.sin(now / (90 + i * 17) + i) * 0.06; bloom(p[0], p[1], (1.8 * s + 10) * f, '255,190,110', 0.55); });
      P.fog(54, 80, now, 3, 0.3, '150,148,150', 2);
      P.fog(90, 70, now + 4000, 6, 0.22, '150,148,150', 3);
      rain(now, { n: 120, len: 3, spd: 0.16, a: 0.13, seed: 5, ang: -0.1, y1: 140 });
      rain(now, { n: 30, len: 16, spd: 0.75, a: 0.13, seed: 6, ang: -0.12, lw: 0.5 });
      splash(now, { n: 40, x0: 190, x1: 384, y0: 130, y1: 210, a: 0.25 });
    });
  }

  /* ============================================================
     5. ГОРОД НАД РЕКОЙ: закат, туман встаёт, ставни закрываются
     ============================================================ */
  const SHORE = 150;
  /* холм: широкая площадка наверху (Соборная площадь), склон к реке */
  function hillY(x) { return 150 - 24 * Math.exp(-Math.pow((x - 190) / 150, 2)) - 8 * Math.exp(-Math.pow((x - 52) / 40, 2)); }
  let WIN5 = [], KAL5 = null, BAKE5 = false, RIM5 = '255,160,100';
  function rimLine(x0, y0, x1, y1, a) { line(x0, y0, x1, y1, 'rgba(' + RIM5 + ',' + a + ')', 0.35); }
  function addWin(x, y, w, h, lit, r, cross) {
    if (r() < lit) { const off = r(); if (!BAKE5) { WIN5.push({ x: x, y: y, w: w, h: h, off: off, cross: cross }); return; } R(x, y, w, h, 'rgba(255,196,120,0.8)'); if (cross) { line(x + w / 2, y, x + w / 2, y + h, 'rgba(50,26,12,0.8)', 0.22); line(x, y + h * 0.38, x + w, y + h * 0.38, 'rgba(50,26,12,0.8)', 0.22); } }
    else R(x, y, w, h, BAKE5 ? 'rgba(20,20,30,0.45)' : 'rgba(0,0,0,0.42)');
  }
  /* изба Слободы: сруб, высокая двускатная крыша, светёлка, белые наличники и ставни — как на улице */
  function izba5(x, base, w, h, col, rim, lit, r) {
    const roofC = P.sh(col, 0.78), rh = h * 0.9;
    R(x, base - h, w, h + 40, col);
    for (let y = base - h + 1.1; y < base; y += 1.3) line(x, y, x + w, y, 'rgba(0,0,0,0.22)', 0.15);
    poly([x - 1.4, base - h, x + w / 2, base - h - rh, x + w + 1.4, base - h], roofC);
    rimLine(x - 1.4, base - h, x + w / 2, base - h - rh, rim); rimLine(x + w / 2, base - h - rh, x + w + 1.4, base - h, rim * 1.3);
    addWin(x + w / 2 - 0.6, base - h - rh * 0.5, 1.2, 1.4, lit * 0.7, r, false);
    const n = w > 9 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const wx = x + (i + 0.5) * w / n - 0.7, wy = base - h * 0.72;
      R(wx - 0.5, wy - 0.6, 2.4, 2.8, 'rgba(215,208,190,0.42)');
      R(wx - 1.3, wy, 0.7, 1.9, 'rgba(70,92,104,0.65)'); R(wx + 2, wy, 0.7, 1.9, 'rgba(70,92,104,0.65)');
      addWin(wx, wy, 1.4, 1.9, lit, r, true);
    }
    if (r() < 0.6) { const cx = x + w * 0.7; R(cx, base - h - rh * 0.6 - 2, 1.4, 3, '#3a2420'); if (r() < 0.5) WIN5.smoke.push([cx + 0.7, base - h - rh * 0.6 - 2]); }
  }
  /* каменный дом Сенной: два этажа, вальмовая жестяная крыша, окна с крестовиной */
  function stone5(x, base, w, h, col, rim, lit, r) {
    const roofC = '#1a2422', dk = P.sh(col, 0.62);
    R(x, base - h, w, h + 40, col);
    R(x, base - 2, w, 2, dk);
    R(x - 0.8, base - h - 0.9, w + 1.6, 1, dk);
    const rh = 2.6 + r() * 2.4;
    poly([x - 0.8, base - h - 0.9, x + w + 0.8, base - h - 0.9, x + w - rh, base - h - 0.9 - rh, x + rh, base - h - 0.9 - rh], roofC);
    rimLine(x + rh, base - h - 0.9 - rh, x + w - rh, base - h - 0.9 - rh, rim); rimLine(x + w - rh, base - h - 0.9 - rh, x + w + 0.8, base - h - 0.9, rim * 1.2);
    [0.28, 0.72].forEach(function (f) { if (r() < 0.75) { const cx = x + w * f; R(cx - 0.7, base - h - rh - 2.6, 1.4, rh + 1.6, roofC); if (r() < 0.45) WIN5.smoke.push([cx, base - h - rh - 2.6]); } });
    const cols = Math.max(1, Math.floor((w - 1) / 3.6)), rows = Math.max(1, Math.min(4, Math.floor((h - 3) / 5.5)));
    for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) {
      const wx = x + (cc + 0.5) * w / cols - 0.75, wy = base - h + 2 + rr * 5;
      R(wx - 0.3, wy - 0.3, 2.1, 2.9, dk);
      addWin(wx, wy, 1.5, 2.3, lit, r, true);
      R(wx - 0.4, wy + 2.4, 2.3, 0.4, P.sh(col, 1.3));
    }
  }
  /* пакгауз Береговой: щипец к реке, большие ворота, балка лебёдки */
  function store5(x, base, w, h, col, rim, lit, r) {
    const dk = P.sh(col, 0.6), rh = 4 + r() * 3;
    R(x, base - h, w, h + 40, col);
    for (let y = base - h + 1; y < base; y += 1.2) line(x, y, x + w, y, 'rgba(0,0,0,0.15)', 0.12);
    poly([x - 1, base - h, x + w / 2, base - h - rh, x + w + 1, base - h], P.sh(col, 0.8));
    rimLine(x - 1, base - h, x + w / 2, base - h - rh, rim); rimLine(x + w / 2, base - h - rh, x + w + 1, base - h, rim * 1.2);
    P.arch(x + w / 2 - 2.4, base - 7, 4.8, 7); c.fillStyle = dk; c.fill();
    R(x + w / 2 - 0.4, base - h - rh * 0.5, 0.8, rh * 0.5 + 0.5, dk); line(x + w / 2, base - h - rh * 0.5, x + w / 2 + 3, base - h - rh * 0.5, dk, 0.5);
    for (let i = 0; i < 2; i++) addWin(x + 2 + i * (w - 5.5), base - h + 2, 1.5, 2, lit, r, true);
  }
  /* пожарная каланча, как на титульном экране: шахта, галерея, будка дозорного */
  function kalancha5(x, base, col) {
    R(x - 3.2, base - 52, 6.4, 60, col);
    for (let y = base - 48; y < base - 6; y += 9) R(x - 0.7, y, 1.4, 2.4, 'rgba(255,170,90,0.35)');
    R(x - 5.4, base - 54.5, 10.8, 1.6, col);
    for (let k = -5; k <= 5.1; k += 1.35) line(x + k, base - 54.5, x + k, base - 57.5, col, 0.3);
    line(x - 5.4, base - 57.5, x + 5.4, base - 57.5, col, 0.4);
    R(x - 2.6, base - 62, 5.2, 7.5, col); R(x - 1.6, base - 60.6, 3.2, 2.6, 'rgba(255,180,100,0.55)');
    poly([x - 3.4, base - 62, x, base - 66.5, x + 3.4, base - 62], col);
    line(x, base - 66.5, x, base - 73, col, 0.5);
    rimLine(x + 3.2, base - 52, x + 3.2, base, 0.3); rimLine(x, base - 66.5, x + 3.4, base - 62, 0.5); rimLine(x + 5.4, base - 54.5, x + 5.4, base - 57.5, 0.4);
    KAL5 = [x + 4.6, base - 56];
  }
  function onion5(x, b, w, h, fill) { c.beginPath(); c.moveTo(x - w / 2, b); c.bezierCurveTo(x - w * 0.8, b - h * 0.45, x - w * 0.12, b - h * 0.72, x, b - h); c.bezierCurveTo(x + w * 0.12, b - h * 0.72, x + w * 0.8, b - h * 0.45, x + w / 2, b); c.closePath(); c.fillStyle = fill; c.fill(); }
  function gold5(x, w) { return LG(x - w / 2, 0, x + w / 2, 0, [0, '#2a2014', 0.5, '#5e4620', 0.82, '#c8a050', 1, '#f6dc96']); }
  /* Собор — как на Соборной площади в игре: серый камень, пилястры, портик с фронтоном,
     барабан с окнами, главный купол и малые главки, колокольня слева с пустым ярусом звона */
  function sobor5(cx, base, dawn) {
    const C = dawn ? '#4c4a54' : '#2c2a31', CL = dawn ? '#5e5c66' : '#3c3a42', CD = dawn ? '#36343c' : '#1c1a20', warm = dawn ? 'rgba(255,200,140,0.3)' : 'rgba(255,175,90,0.55)';
    const bx = cx - 38;
    R(bx - 5, base - 40, 10, 41, C); R(bx - 4, base - 54, 8, 14, C);
    R(bx - 5.6, base - 41, 11.2, 1.2, CL); R(bx - 4.6, base - 55, 9.2, 1.2, CL);
    P.arch(bx - 2, base - 52, 4, 9); c.fillStyle = '#07060a'; c.fill();
    R(bx - 0.3, base - 51, 0.6, 1.4, '#2a2016');
    P.arch(bx - 1.6, base - 30, 3.2, 7); c.fillStyle = 'rgba(255,170,90,0.35)'; c.fill();
    R(bx - 2.6, base - 60, 5.2, 5, C); onion5(bx, base - 60, 6, 8, gold5(bx, 6)); P.cross8(bx, base - 68.4, 5, '#d8b060', 0.35);
    rimLine(bx + 5, base - 40, bx + 5, base, 0.3); rimLine(bx + 4, base - 54, bx + 4, base - 41, 0.35);
    R(cx - 28, base - 22, 56, 23, C);
    R(cx - 29, base - 23.2, 58, 1.4, CL);
    [-27, -13, 12, 26].forEach(function (d) { R(cx + d, base - 22, 1.2, 22, CL); });
    [-22, -18, 16, 20].forEach(function (d) { P.arch(cx + d - 1.1, base - 18, 2.2, 7); c.fillStyle = warm; c.fill(); gl(cx + d, base - 14, 4, '255,170,80', 0.25); });
    R(cx - 10, base - 24, 20, 25, CL);
    poly([cx - 11.5, base - 24, cx, base - 31, cx + 11.5, base - 24], C); line(cx - 11.5, base - 24, cx + 11.5, base - 24, CL, 0.5);
    rimLine(cx - 11.5, base - 24, cx, base - 31, 0.4); rimLine(cx, base - 31, cx + 11.5, base - 24, 0.55);
    E(cx, base - 26.8, 1.4, 1.4, '#3a3020');
    [-7.5, -3.2, 3.2, 7.5].forEach(function (d) { R(cx + d - 0.6, base - 22, 1.2, 20, '#4a4850'); });
    P.arch(cx - 2.2, base - 11, 4.4, 11); c.fillStyle = '#120c08'; c.fill();
    R(cx - 0.4, base - 8, 0.8, 7, 'rgba(255,170,90,0.4)');
    R(cx - 14, base - 1.5, 28, 1.5, CL); R(cx - 16, base, 32, 1.4, C);
    R(cx - 7, base - 37, 14, 14, C); R(cx - 8, base - 37.6, 16, 1.2, CL);
    [-4.4, 0, 4.4].forEach(function (d) { P.arch(cx + d - 0.9, base - 34.4, 1.8, 4.6); c.fillStyle = warm; c.fill(); });
    onion5(cx, base - 37.6, 17, 20, gold5(cx, 17)); E(cx + 3.4, base - 47, 1, 2.6, 'rgba(255,248,220,0.7)');
    P.cross8(cx, base - 57.8, 9, '#e0bc6c', 0.55);
    [-22, 22].forEach(function (d) { R(cx + d - 2.6, base - 29, 5.2, 6, C); onion5(cx + d, base - 29, 6.4, 8, gold5(cx + d, 6.4)); P.cross8(cx + d, base - 37.4, 4.4, '#d8b060', 0.3); });
    rimLine(cx + 28, base - 22, cx + 28, base, 0.35); rimLine(cx - 28, base - 23, cx + 28, base - 23, 0.3);
    gl(cx, base - 16, 34, '255,160,80', 0.1);
  }
  /* o.dawn — рассвет (для концовок): светлое небо, окна почти все погашены и нарисованы сразу */
  function s5Above(o) {
    o = o || {};
    WIN5 = []; WIN5.smoke = []; KAL5 = null; BAKE5 = !!o.dawn; RIM5 = o.dawn ? '255,214,170' : '255,160,100';
    return layer(function () {
      if (o.dawn) {
        R(0, 0, W, SHORE, LG(0, 0, 0, SHORE, [0, '#34446a', 0.38, '#7684a6', 0.68, '#d6a49a', 0.86, '#f2c6a0', 1, '#fbe0b6']));
        [[34, 8, 50], [60, 7, 58], [90, 6, 66]].forEach(function (b, bi) {
          const r = P.RNG(70 + bi);
          for (let i = 0; i < b[1]; i++) { const x = r() * (W + 80) - 40, w = b[2] * (0.6 + r() * 0.7), y = b[0] + (r() - 0.5) * 10; soft(x, y, w, w * 0.15, '110,104,140', 0.55); gl(x + w * 0.1, y + w * 0.06, w * 0.85, '255,200,160', 0.3, w * 0.06); }
        });
        gl(250, 152, 170, '255,214,160', 0.55); gl(250, 154, 50, '255,244,210', 0.7);
        c.beginPath(); c.moveTo(0, 132); for (let x = 0; x <= W; x += 8) c.lineTo(x, 128 - Math.sin(x * 0.02) * 6 - Math.sin(x * 0.07) * 2); c.lineTo(W, SHORE); c.lineTo(0, SHORE); c.closePath(); c.fillStyle = 'rgba(140,124,150,0.6)'; c.fill();
      } else {
        R(0, 0, W, SHORE, LG(0, 0, 0, SHORE, [0, '#060818', 0.35, '#161c3a', 0.6, '#433050', 0.78, '#9a5446', 0.9, '#d88050', 1, '#f0a868']));
        const rs = P.RNG(2);
        for (let i = 0; i < 70; i++) E(rs() * W, rs() * 60, 0.25 + rs() * 0.3, 0.25 + rs() * 0.3, 'rgba(230,235,255,' + (0.2 + rs() * 0.6).toFixed(2) + ')');
        gl(56, 26, 22, '200,210,255', 0.12); E(56, 26, 5.4, 5.4, '#ece6d0'); E(58.4, 24.6, 5, 5, '#0a0d22');
        [[30, 9, 46, 0.25], [54, 8, 54, 0.45], [80, 7, 62, 0.75], [106, 6, 70, 1]].forEach(function (b, bi) {
          const r = P.RNG(30 + bi);
          for (let i = 0; i < b[1]; i++) {
            const x = r() * (W + 80) - 40, w = b[2] * (0.6 + r() * 0.7), y = b[0] + (r() - 0.5) * 10;
            soft(x, y, w, w * 0.16, bi < 2 ? '24,22,46' : '50,34,58', 0.7);
            gl(x + w * 0.1, y + w * 0.07, w * 0.85, '240,130,80', 0.22 * b[3], w * 0.06);
          }
        });
        gl(236, 150, 150, '255,140,70', 0.5); gl(236, 152, 56, '255,210,140', 0.55);
        c.beginPath(); c.moveTo(0, 132); for (let x = 0; x <= W; x += 8) c.lineTo(x, 128 - Math.sin(x * 0.02) * 6 - Math.sin(x * 0.07) * 2); c.lineTo(W, SHORE); c.lineTo(0, SHORE); c.closePath(); c.fillStyle = 'rgba(80,60,90,0.6)'; c.fill();
      }
      const r = P.RNG(41), lit = o.dawn ? 0.18 : 1;
      // Слобода далеко на пологом холме: избы и деревья
      for (let i = 0; i < 40; i++) { const tx = r() * W; soft(tx, hillY(tx) + 1, 4 + r() * 4, 4 + r() * 3, o.dawn ? '70,60,84' : '30,22,38', 0.9); }
      let x = -6;
      while (x < W) { const w = 7 + r() * 5; izba5(x, hillY(x + w / 2) + 3, w, 4.5 + r() * 2, o.dawn ? '#4a4058' : '#2e2438', 0.45, 0.35 * lit, r); x += w + 1.5 + r() * 3; }
      c.beginPath(); c.moveTo(0, SHORE); for (let xx = 0; xx <= W; xx += 3) c.lineTo(xx, hillY(xx) + 2.4); c.lineTo(W, SHORE); c.closePath();
      c.fillStyle = o.dawn ? LG(0, 110, 0, SHORE, [0, '#3a3248', 1, '#262030']) : LG(0, 110, 0, SHORE, [0, '#18121f', 1, '#0d0a14']); c.fill();
      // собор позади домов Сенной: над крышами — барабан, купола и колокольня
      sobor5(190, 146, o.dawn);
      kalancha5(318, 150, o.dawn ? '#3a3444' : '#1c1824');
      for (let i = 0; i < 16; i++) { const tx = r() * W; soft(tx, 128 + r() * 8, 5 + r() * 5, 4 + r() * 3, o.dawn ? '50,44,60' : '16,12,22', 0.9); }
      // Сенная: плотный ряд каменных домов, перед собором — самые высокие
      x = -8;
      while (x < W) {
        const near = Math.abs(x + 7 - 190) < 64, w = 10 + r() * 8, h = near ? 22 + r() * 6 : 11 + r() * 8, bse = 138 + r() * 8;
        stone5(x, bse, w, h, (o.dawn ? ['#46505a', '#4c4650', '#544c48', '#44505a'] : ['#2a3434', '#2e2a30', '#34302a', '#283032'])[Math.floor(r() * 4)], o.dawn ? 0.35 : 0.25, 0.5 * lit, r);
        x += w + (near ? 0.25 : 0.6 + r() * 1.6);
      }
      c.fillStyle = LG(0, 110, 0, SHORE, [0, 'rgba(120,80,110,0)', 1, o.dawn ? 'rgba(220,190,190,0.18)' : 'rgba(120,80,110,0.12)']); c.fillRect(0, 100, W, SHORE - 100);
      // Береговая: пакгаузы у воды
      x = -10;
      while (x < W) { const w = 16 + r() * 14; store5(x, SHORE - 1, w, 8 + r() * 6, (o.dawn ? ['#3c3232', '#363036', '#40342e'] : ['#241c1c', '#1e1a1e', '#2a201c'])[Math.floor(r() * 3)], 0.14, 0.35 * lit, r); x += w + 1 + r() * 3; }
      R(0, SHORE - 2.5, W, 3, o.dawn ? '#1a1820' : '#08070c');
      BAKE5 = false;
    });
  }
  function s5Water(above) {
    return layer(function () {
      blurred(0.9, function () {
        for (let y = SHORE; y < H; y += 0.5) {
          const d = y - SHORE, sy = SHORE - 1 - d * 1.05; if (sy < 0) break;
          const off = Math.sin(y * 1.3) * (0.2 + d * 0.035) + Math.sin(y * 0.37 + 1) * d * 0.03;
          c.drawImage(above, 0, sy * K, W * K, 0.5 * K, off, y, W, 0.6);
        }
      });
      R(0, SHORE, W, H - SHORE, LG(0, SHORE, 0, H, [0, 'rgba(10,8,22,0.35)', 1, 'rgba(4,4,12,0.78)']));
      const r = P.RNG(9);
      for (let i = 0; i < 200; i++) { const y = SHORE + 1 + Math.pow(r(), 1.5) * 64, x = r() * W, w = 2 + r() * 10 * (1 + (y - SHORE) / 30), warm = Math.abs(x - 236) < 70 && r() < 0.7; line(x, y, x + w, y, warm ? 'rgba(255,170,110,' + (0.08 + r() * 0.2).toFixed(2) + ')' : 'rgba(150,140,190,' + (0.03 + r() * 0.07).toFixed(2) + ')', 0.25); }
    });
  }
  function s5Fore() {
    return layer(function () {
      const r = P.RNG(14);
      // мостки и лодка справа
      [300, 322, 344, 366, 388].forEach(function (x, i) { R(x, 150 - (i % 2) * 2, 2.4, 70, '#050408'); });
      R(292, 156, 100, 2.6, '#050408'); R(292, 158.6, 100, 0.6, 'rgba(255,160,110,0.18)');
      c.beginPath(); c.moveTo(232, 178); c.quadraticCurveTo(240, 186, 262, 186); c.lineTo(294, 186); c.quadraticCurveTo(304, 183, 308, 176); c.closePath(); c.fillStyle = '#050408'; c.fill();
      line(250, 178, 242, 160, '#050408', 0.8);
      c.save(); c.globalAlpha = 0.35; c.translate(0, 372); c.scale(1, -1); c.beginPath(); c.moveTo(232, 186); c.quadraticCurveTo(240, 194, 262, 194); c.lineTo(294, 194); c.quadraticCurveTo(304, 191, 308, 186); c.closePath(); c.fillStyle = '#050408'; c.fill(); c.restore();
      // камыш
      [[0, 80], [318, 384]].forEach(function (side) {
        for (let i = 0; i < 60; i++) {
          const x = side[0] + r() * (side[1] - side[0]), h = 24 + r() * 52, bend = (r() - 0.5) * 14;
          c.beginPath(); c.moveTo(x - 0.5, 218); c.quadraticCurveTo(x + bend * 0.5, 218 - h * 0.6, x + bend, 218 - h); c.quadraticCurveTo(x + bend * 0.5 + 0.5, 218 - h * 0.6, x + 0.6, 218); c.closePath(); c.fillStyle = '#030206'; c.fill();
          if (r() < 0.16) E(x + bend * 0.9, 218 - h * 0.86, 0.9, 3.4, '#030206', bend * 0.02);
        }
      });
    });
  }
  function s5(t, k, now, L) {
    const q = ease(k);
    camIn(lerp(1, 1.08, q), 192, lerp(118, 108, q), function () {
      c.drawImage(L.above, 0, 0, W, H); c.drawImage(L.water, 0, 0, W, H);
      // окна гаснут одно за другим — закрываются ставни
      WIN5.forEach(function (w) {
        const tc = 1300 + w.off * 8200;
        const s = t < tc ? 1 : 1 - clamp((t - tc) / 280);
        if (s <= 0) { R(w.x, w.y, w.w, w.h, 'rgba(40,24,14,0.9)'); return; }
        const ww = w.w * s;
        R(w.x + (w.w - ww) / 2, w.y, ww, w.h, 'rgba(255,196,110,0.95)');
        if (w.cross && s >= 1) { line(w.x + w.w / 2, w.y, w.x + w.w / 2, w.y + w.h, 'rgba(50,26,12,0.85)', 0.22); line(w.x, w.y + w.h * 0.38, w.x + w.w, w.y + w.h * 0.38, 'rgba(50,26,12,0.85)', 0.22); }
        if (s < 1) { R(w.x, w.y, (w.w - ww) / 2, w.h, 'rgba(40,24,14,0.9)'); R(w.x + (w.w + ww) / 2, w.y, (w.w - ww) / 2, w.h, 'rgba(40,24,14,0.9)'); }
        gl(w.x + w.w / 2, w.y + w.h / 2, w.w * 2.6 * s + 0.5, '255,170,80', 0.32);
        const ry = SHORE + (SHORE - w.y) * 1.05;
        if (ry < H - 2) gl(w.x + w.w / 2, ry, w.w * 0.6 + 0.4, '255,170,80', 0.22 * s, w.h * 2.6);
      });
      // дежурный огонёк на каланче
      if (KAL5) { const b = 0.5 + 0.5 * Math.sin(now / 520); E(KAL5[0], KAL5[1], 0.6, 0.6, 'rgba(255,90,60,' + (0.4 + 0.6 * b).toFixed(2) + ')'); gl(KAL5[0], KAL5[1], 5, '255,70,40', 0.35 * b); }
      // дым из труб
      WIN5.smoke.slice(0, 10).forEach(function (s, i) { for (let j = 0; j < 5; j++) { const p = ((now / 6000 + j / 5 + i * 0.13) % 1); soft(s[0] + p * 12, s[1] - p * 18, 1.5 + p * 5, 1.2 + p * 3.5, '70,56,80', 0.4 * (1 - p)); } });
      // рябь
      c.save(); c.strokeStyle = 'rgba(255,180,130,0.12)'; c.lineWidth = 0.25; c.beginPath();
      for (let i = 0; i < 40; i++) { const y = SHORE + 3 + (i * 5.7) % 60, x = ((i * 53 + now / 70) % (W + 30)) - 15; c.moveTo(x, y); c.lineTo(x + 6 + i % 9, y); }
      c.stroke(); c.restore();
      // туман встаёт от воды
      const fy = lerp(190, 100, ease(seg(t, 0, 9800)));
      P.fog(142, 30, now, 2, 0.35, '200,180,200', 7);
      P.fog(fy, 70, now, 4, 0.3 + 0.55 * q, '215,195,212', 4);
      P.fog(fy + 20, 80, now + 3000, 7, 0.38 + 0.5 * q, '200,182,202', 5);
      P.fog(fy + 44, 90, now + 6000, 10, 0.6 + 0.3 * q, '190,174,196', 6);
      if (q > 0.3) P.fog(fy - 16, 50, now + 9000, 5, (q - 0.3) * 0.5, '220,200,220', 8);
      c.drawImage(L.fore, 0, 0, W, H);
      // птицы
      for (let i = 0; i < 7; i++) { const bx = -30 + now / 1000 * 22 + (hsh(i) - 0.5) * 50, by = 70 - now / 1000 * 2.4 + (hsh(i + 3) - 0.5) * 20, w = Math.sin(now / (110 + hsh(i) * 40) + i) * 1.6; c.beginPath(); c.moveTo(bx - 2.6, by - w); c.quadraticCurveTo(bx - 1, by - 0.3, bx, by + 0.3); c.quadraticCurveTo(bx + 1, by - 0.3, bx + 2.6, by - w); c.strokeStyle = '#08060c'; c.lineWidth = 0.5; c.stroke(); }
    });
  }

  /* ============================================================
     6. СЕННАЯ НОЧЬЮ: лавка горит, из тумана идут Пустые
     ============================================================ */
  const pv6 = PV(188, 102, 140);
  /* утренний вариант той же улицы (для концовок): ставни распахнуты, фонари погашены. SIGN6 — рисовать ли буквы вывески в слое */
  let DAY6 = 0, SIGN6 = true;
  function d6(n, d) { return DAY6 ? d : n; }
  /* Сенная, как на улице в игре: справа — деревянный ломбард с зелёной вывеской и тремя шарами,
     за проулком — Сенной рынок с арками; слева — часовая мастерская Гофмана, дальше каменные дома */
  const RS6 = [[1.4, 4.6, -8.2, '#2c3634', 'plain'], [4.6, 10.2, -3.7, '#2e1e13', 'shop'], [10.2, 11.6, -7.0, '#141216', 'gap'], [11.6, 26, -3.7, '#4a4438', 'arcade'], [26, 34, -8.6, '#2c3434', 'plain'], [34, 46, -8.2, '#30302c', 'plain'], [46, 90, -9, '#2a2e2e', 'plain']];
  const LS6 = [[1.4, 8, -9, '#2e3232', 'plain'], [8, 15.5, -7.6, '#1e2c28', 'clock'], [15.5, 23, -9.6, '#2c2a2e', 'plain'], [23, 32, -8.2, '#30302c', 'plain'], [32, 44, -9.4, '#2a2e30', 'plain'], [44, 90, -8.4, '#282a2c', 'plain']];
  const LMP6 = [6, 17, 28, 39, 50];
  const SHOPL6 = [[5.0, -2.0, 5.5], [5.0, -2.0, 7.5]];
  /* надпись на стене в перспективе: каждая буква — в своей точке и своём масштабе.
     dz = +1 — буквы идут вглубь (левая стена), −1 — к нам (правая стена) */
  function wallText(pr, X, zc, dz, yb, hM, text, font, col, shc, ls) {
    c.save(); c.font = (font ? font + ' ' : '') + '10px ' + SERIF; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const k = hM / 7, sp = (ls || 0) / k;
    let total = 0; for (let i = 0; i < text.length; i++) total += c.measureText(text[i]).width + (i ? sp : 0);
    let z = zc - dz * total * k / 2;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], adv = c.measureText(ch).width, am = adv * k;
      if (ch !== ' ') {
        const p0 = pr(X, yb, z), p1 = pr(X, yb, z + dz * am), pd = pr(X, yb + 1, z);
        c.save(); c.translate(p0[0], p0[1]);
        c.transform((p1[0] - p0[0]) / adv, (p1[1] - p0[1]) / adv, (pd[0] - p0[0]) * k, (pd[1] - p0[1]) * k, 0, 0);
        if (shc) { c.fillStyle = shc; c.fillText(ch, 0.5, 0.5); }
        c.fillStyle = col; c.fillText(ch, 0, 0); c.restore();
      }
      z += dz * (am + (ls || 0));
    }
    c.restore();
  }
  function quad6(X, y0, y1, z0, z1, f) { Q(pv6, [[X, y0, z0], [X, y0, z1], [X, y1, z1], [X, y1, z0]], f); }
  function rect6(X, y0, y1, z0, z1, col, w) { const pr = pv6; L3(pr, [X, y0, z0], [X, y0, z1], col, w); L3(pr, [X, y1, z0], [X, y1, z1], col, w); L3(pr, [X, y0, z0], [X, y1, z0], col, w); L3(pr, [X, y0, z1], [X, y1, z1], col, w); }
  function win6(side, z0, z1, yb, yt, kind) {
    const pr = pv6, X = side * 5.2 - side * 0.02;
    if (DAY6) kind = 'day';
    quad6(X, yb + 0.12, yt - 0.12, z0 - 0.1, z1 + 0.1, 'rgba(0,0,0,0.35)');
    quad6(X, yb, yt, z0, z1, d6('#0a0806', '#2a2018'));
    const ins = 0.07, X2 = X - side * 0.01;
    if (kind === 'day') {
      // стекло, в нём утреннее небо; распахнутые ставни по бокам
      quad6(X2, yb - ins, yt + ins, z0 + ins, z1 - ins, '#8c96a2');
      quad6(X2, yb - ins, yt + (yb - yt) * 0.55, z0 + ins, z1 - ins, 'rgba(30,34,40,0.45)');
      L3(pr, [X2, yb, (z0 + z1) / 2], [X2, yt, (z0 + z1) / 2], '#2a2018', 0.4);
      L3(pr, [X2, yt + (yb - yt) * 0.38, z0], [X2, yt + (yb - yt) * 0.38, z1], '#2a2018', 0.4);
      [[z0 - 0.52, z0 - 0.05], [z1 + 0.05, z1 + 0.52]].forEach(function (sz) {
        quad6(X - side * 0.015, yb + 0.02, yt - 0.02, sz[0], sz[1], '#3e3024');
        for (let y = yb - 0.2; y > yt + 0.1; y -= 0.2) L3(pr, [X - side * 0.02, y, sz[0] + 0.04], [X - side * 0.02, y, sz[1] - 0.04], 'rgba(0,0,0,0.35)', 0.18);
      });
    } else if (kind === 'shut') {
      quad6(X2, yb - ins, yt + ins, z0 + ins, z1 - ins, '#2a1c12');
      for (let y = yb - 0.25; y > yt + 0.1; y -= 0.22) L3(pr, [X2, y, z0 + ins], [X2, y, z1 - ins], 'rgba(0,0,0,0.45)', 0.2);
      L3(pr, [X2, yb, (z0 + z1) / 2], [X2, yt, (z0 + z1) / 2], 'rgba(0,0,0,0.7)', 0.3);
    } else if (kind === 'dark') {
      quad6(X2, yb - ins, yt + ins, z0 + ins, z1 - ins, '#0c1016');
      L3(pr, [X2, yb, (z0 + z1) / 2], [X2, yt, (z0 + z1) / 2], '#0a0806', 0.4);
    } else {
      quad6(X2, yb - ins, yt + ins, z0 + ins, z1 - ins, kind === 'dim' ? '#7a4a22' : '#d8944a');
      if (kind === 'lit') quad6(X2, yb - ins, yt + ins, z1 - 0.38, z1 - ins, 'rgba(110,30,20,0.75)');   // занавеска
      L3(pr, [X2, yb, (z0 + z1) / 2], [X2, yt, (z0 + z1) / 2], '#0a0806', 0.4);
      L3(pr, [X2, yt + (yb - yt) * 0.38, z0], [X2, yt + (yb - yt) * 0.38, z1], '#0a0806', 0.4);
    }
    L3(pr, [X - side * 0.06, yb + 0.06, z0 - 0.12], [X - side * 0.06, yb + 0.06, z1 + 0.12], d6('rgba(150,140,120,0.35)', 'rgba(230,220,200,0.6)'), 0.3);   // подоконник
  }
  /* деревянный ломбард: обшивка доской, зелёная эмалевая вывеска, витрина с красными занавесками, три шара */
  function shop6(X, side, z0, z1, top) {
    const pr = pv6, Xi = X - side * 0.01;
    for (let y = 1.5; y > top; y -= 0.2) { L3(pr, [Xi, y, z0], [Xi, y, z1], 'rgba(0,0,0,0.4)', 0.22); L3(pr, [Xi, y - 0.05, z0], [Xi, y - 0.05, z1], 'rgba(255,200,150,0.05)', 0.2); }
    [z0 + 0.05, z1 - 0.32].forEach(function (z) { quad6(X - side * 0.05, 1.6, top, z, z + 0.27, d6('#36241a', '#6a4a32')); L3(pr, [X - side * 0.06, 1.6, z + 0.02], [X - side * 0.06, top, z + 0.02], 'rgba(255,200,150,0.18)', 0.25); });
    Q(pr, [[X, top, z0], [X, top, z1], [X - side * 0.5, top - 0.4, z1], [X - side * 0.5, top - 0.4, z0]], d6('#2a1b11', '#56392a'));
    Q(pr, [[X - side * 0.5, top - 0.4, z0], [X - side * 0.5, top - 0.4, z1], [X + side * 2.4, top - 2.8, z1 - 1.2], [X + side * 2.4, top - 2.8, z0 + 1.2]], d6('#1a2523', '#3a504c'));
    for (let z = z0 + 0.4; z < z1; z += 0.55) L3(pr, [X - side * 0.5, top - 0.4, z], [X + side * 2.4, top - 2.8, Math.min(Math.max(z, z0 + 1.2), z1 - 1.2)], 'rgba(70,92,88,0.45)', 0.2);
    Q(pr, [[X + side * 1.3, top - 1.6, 8.6], [X + side * 1.3, top - 1.6, 9.1], [X + side * 1.3, top - 3.6, 9.1], [X + side * 1.3, top - 3.6, 8.6]], d6('#3a2420', '#6a3e34'));
    // вывеска: тёмная рама, зелёная эмаль, золотая окантовка и буквы
    quad6(X - side * 0.04, -2.06, -3.24, 5.25, 9.85, '#2a1a0e');
    quad6(X - side * 0.06, -2.14, -3.16, 5.35, 9.75, '#13261f');
    quad6(X - side * 0.065, -2.14, -2.42, 5.35, 9.75, 'rgba(255,214,150,0.06)');
    rect6(X - side * 0.07, -2.24, -3.06, 5.5, 9.6, 'rgba(170,140,80,0.85)', 0.3);
    if (SIGN6) wallText(pr, X - side * 0.08, 7.75, -side, -2.4, 0.52, 'ЛОМБАРД', 'bold', '#dcc386', 'rgba(4,14,10,0.9)', 0.05);
    [5.78, 9.3].forEach(function (z) { Q(pr, [[X - side * 0.08, -2.65, z - 0.12], [X - side * 0.08, -2.52, z], [X - side * 0.08, -2.65, z + 0.12], [X - side * 0.08, -2.78, z]], '#c8a860'); });
    // фонарики под вывеской
    SHOPL6.forEach(function (l) { const p = pr(l[0], l[1], l[2]), s = 140 / l[2]; R(p[0] - 0.08 * s, p[1] - 0.12 * s, 0.16 * s, 0.2 * s, d6('rgba(255,214,150,0.95)', 'rgba(200,205,210,0.6)')); R(p[0] - 0.11 * s, p[1] - 0.16 * s, 0.22 * s, 0.05 * s, '#141210'); });
    // витрина
    quad6(X - side * 0.02, 1.15, -1.85, 5.0, 8.0, '#1a1008');
    quad6(X - side * 0.03, 1.0, -1.72, 5.15, 7.85, d6('#e8a454', '#5e4c44'));
    if (DAY6) quad6(X - side * 0.035, 1.0, -1.72, 6.6, 7.1, 'rgba(230,236,240,0.16)');
    for (let sy = 0.2; sy > -1.5; sy -= 0.72) {
      L3(pr, [X - side * 0.04, sy, 5.15], [X - side * 0.04, sy, 7.85], '#3a1e0a', 0.5);
      for (let z = 5.7; z < 7.3; z += 0.3) { const hh = 0.18 + hsh(z * 9 + sy) * 0.3; quad6(X - side * 0.04, sy, sy - hh, z, z + 0.18, 'rgba(60,30,10,0.8)'); }
    }
    [[5.15, 5.7], [7.3, 7.85]].forEach(function (cz) {
      quad6(X - side * 0.05, 1.0, -1.72, cz[0], cz[1], '#7a1812');
      for (let z = cz[0] + 0.1; z < cz[1]; z += 0.12) L3(pr, [X - side * 0.055, 1.0, z], [X - side * 0.055, -1.72, z], 'rgba(30,4,2,0.55)', 0.25);
    });
    quad6(X - side * 0.05, -1.72, -1.45, 5.15, 7.85, '#8a1e16');
    L3(pr, [X - side * 0.04, 1.0, 6.5], [X - side * 0.04, -1.72, 6.5], '#1a1008', 0.6);
    Q(pr, [[X - side * 0.25, 1.15, 4.95], [X - side * 0.25, 1.15, 8.05], [X - side * 0.25, 1.28, 8.05], [X - side * 0.25, 1.28, 4.95]], '#4a3220');
    // дверь с застеклённым верхом и табличкой
    quad6(X - side * 0.02, 1.6, -2.0, 8.45, 9.75, '#140c07');
    quad6(X - side * 0.03, 1.6, -1.9, 8.55, 9.65, '#2a1a0e');
    quad6(X - side * 0.04, -0.5, -1.8, 8.65, 9.55, d6('#c88a46', '#6c6a70'));
    quad6(X - side * 0.045, -1.0, -1.3, 8.85, 9.35, '#d2c29a');
    Q(pr, [[X - side * 0.4, 1.6, 8.35], [X - side * 0.4, 1.6, 9.85], [X - side * 0.4, 1.45, 9.85], [X - side * 0.4, 1.45, 8.35]], '#3a3a36');
    // три золотых шара на кованом кронштейне — знак ломбарда
    const zb = 4.75, s = 140 / zb, a0 = pr(X, -3.3, zb), a1 = pr(X - side * 1.45, -3.3, zb), br = pr(X, -2.6, zb), bm = pr(X - side * 0.8, -3.3, zb);
    line(a0[0], a0[1], a1[0], a1[1], '#2a3230', 0.09 * s); line(br[0], br[1], bm[0], bm[1], '#2a3230', 0.05 * s);
    c.strokeStyle = '#2a3230'; c.lineWidth = 0.04 * s; c.beginPath(); c.arc(a1[0] - side * 0.06 * s, a1[1] + 0.1 * s, 0.1 * s, -1.6, 1.6); c.stroke();
    const hc = pr(X - side * 1.15, -3.3, zb), bl = [[X - side * 0.97, -2.78], [X - side * 1.33, -2.78], [X - side * 1.15, -2.42]];
    line(hc[0], hc[1], hc[0], hc[1] + 0.3 * s, '#5a5a54', 0.025 * s); line(pr(bl[0][0], -3.0, zb)[0], pr(0, -3.0, zb)[1], pr(bl[1][0], -3.0, zb)[0], pr(0, -3.0, zb)[1], '#5a5a54', 0.03 * s);
    bl.forEach(function (b) { const p = pr(b[0], b[1], zb), r = 0.19 * s; E(p[0] + r * 0.15, p[1] + r * 0.15, r, r, 'rgba(0,0,0,0.4)'); E(p[0], p[1], r, r, RG(p[0] - r * 0.35, p[1] - r * 0.4, 0, r * 1.25, [0, '#fff2c0', 0.35, '#d8aa48', 1, '#6a4818'])); });
  }
  /* Сенной рынок: аркада, вывеска над арками */
  function arcade6(X, side, z0, z1, top) {
    const pr = pv6;
    Q(pr, [[X, top, z0], [X, top, z1], [X - side * 0.3, top - 0.45, z1], [X - side * 0.3, top - 0.45, z0]], d6('#5e584a', '#968e7a'));
    Q(pr, [[X - side * 0.3, top - 0.45, z0], [X - side * 0.3, top - 0.45, z1], [X - side * 0.3, top - 1.0, z1], [X - side * 0.3, top - 1.0, z0]], d6('#4a4438', '#7a7260'));
    quad6(X - side * 0.01, 1.6, 1.0, z0, z1, d6('#3a352c', '#625a4a'));
    let n = 0;
    for (let z = z0 + 0.6; z + 1.9 < z1; z += 2.55, n++) {
      const pts = [[X - side * 0.02, 1.6, z], [X - side * 0.02, 1.6, z + 1.9], [X - side * 0.02, -0.85, z + 1.9]];
      for (let a = 0; a <= 10; a++) { const an = a / 10 * Math.PI; pts.push([X - side * 0.02, -0.85 - 0.95 * Math.sin(an), z + 0.95 + 0.95 * Math.cos(an)]); }
      pts.push([X - side * 0.02, -0.85, z]);
      Q(pr, pts, d6('#0c0a08', '#26221c'));
      if (n === 2 && !DAY6) { const p = pr(X + side * 0.6, -0.5, z + 0.9); gl(p[0], p[1], 140 / z * 0.9, '255,170,80', 0.4); }
      Q(pr, [[X - side * 0.03, -1.7, z + 0.8], [X - side * 0.03, -1.7, z + 1.1], [X - side * 0.03, -1.95, z + 1.15], [X - side * 0.03, -1.95, z + 0.75]], d6('#6a6454', '#a49c88'));
    }
    quad6(X - side * 0.04, -2.1, -2.95, 13.2, 24.4, d6('#1a2824', '#26403a'));
    rect6(X - side * 0.05, -2.18, -2.87, 13.4, 24.2, 'rgba(200,190,150,0.6)', 0.25);
    wallText(pr, X - side * 0.06, 18.8, -side, -2.3, 0.5, 'СЕННОЙ РЫНОК', 'bold', '#d8cfa8', 'rgba(0,0,0,0.6)', 0.05);
  }
  /* часовая мастерская Гофмана: витрина с циферблатами, вывеска, часы на кронштейне — на без четверти три */
  function clockShop6(X, side, z0, z1) {
    const pr = pv6;
    quad6(X - side * 0.02, 0.95, -1.65, 9.0, 13.6, '#140e0a');
    quad6(X - side * 0.03, 0.85, -1.55, 9.12, 13.48, d6('#4a3a20', '#6e5e46'));
    [[9.7, -0.6, 0.26], [10.8, -0.9, 0.34], [11.9, -0.5, 0.22], [12.8, -0.8, 0.3]].forEach(function (q) {
      const p = pr(X - side * 0.04, q[1], q[2] > 0 ? q[0] : q[0]), a = pr(X - side * 0.04, q[1], q[0] - q[2]), b = pr(X - side * 0.04, q[1], q[0] + q[2]), s = 140 / q[0];
      E(p[0], p[1], Math.abs(b[0] - a[0]) / 2 + 0.1, q[2] * s, '#d8ccaa'); E(p[0], p[1], Math.abs(b[0] - a[0]) / 2 * 0.25, q[2] * s * 0.1, '#2a1a0a');
    });
    L3(pr, [X - side * 0.04, 0.85, 11.3], [X - side * 0.04, -1.55, 11.3], '#140e0a', 0.5);
    quad6(X - side * 0.02, 1.6, -2.0, 14.0, 14.95, '#120c08'); quad6(X - side * 0.03, -0.6, -1.8, 14.1, 14.85, '#3a2a14');
    quad6(X - side * 0.04, -2.05, -2.8, 9.0, 14.6, '#161210');
    rect6(X - side * 0.05, -2.12, -2.73, 9.15, 14.45, 'rgba(200,160,80,0.7)', 0.25);
    wallText(pr, X - side * 0.06, 11.8, side === -1 ? 1 : -1, -2.24, 0.42, 'ЧАСЫ · ГОФМАН', 'bold', '#c9a24e', 'rgba(0,0,0,0.7)', 0.05);
    const zc = 8.5, s = 140 / zc, a0 = pr(X, -2.95, zc), a1 = pr(X - side * 1.2, -2.95, zc), cc = pr(X - side * 0.95, -2.45, zc);
    line(a0[0], a0[1], a1[0], a1[1], '#1e1c1a', 0.07 * s);
    E(cc[0], cc[1], 0.36 * s, 0.36 * s, P.brassG(cc[0] - 0.36 * s, cc[0] + 0.36 * s));
    P.face(cc[0], cc[1], 0.3 * s, { plain: true, paper: '#e6dcbc' });
  }
  function facade6(side, sg) {
    const pr = pv6, X = side * 5.2, z0 = sg[0], z1 = sg[1], top = sg[2], kind = sg[4];
    if (kind === 'gap') {
      quad6(X, 1.6, top, z0, z1, d6('#09080b', '#3a3a40'));
      quad6(X + side * 3, 1.6, top, z0, z1, d6('#121015', '#4a4a52'));
      return;
    }
    const base = DAY6 ? P.sh(sg[3], kind === 'shop' ? 2.0 : (kind === 'arcade' ? 1.6 : 2.15)) : sg[3];
    quad6(X, 1.6, top, z0, z1, base);
    if (kind === 'shop') return shop6(X, side, z0, z1, top);
    if (kind === 'arcade') return arcade6(X, side, z0, z1, top);
    // каменный дом: цоколь, межэтажные тяги, карниз, жестяная вальмовая крыша, труба
    quad6(X - side * 0.01, 1.6, 1.05, z0, z1, P.sh(sg[3], d6(0.7, 1.5)));
    [-1.85, -4.85].forEach(function (y) { if (y > top + 0.5) L3(pr, [X - side * 0.02, y, z0], [X - side * 0.02, y, z1], d6('rgba(255,240,220,0.08)', 'rgba(255,240,220,0.22)'), 0.35); });
    Q(pr, [[X, top, z0], [X, top, z1], [X - side * 0.4, top - 0.4, z1], [X - side * 0.4, top - 0.4, z0]], P.sh(sg[3], d6(0.6, 1.3)));
    // утром дальние крыши на светлом небе читаются как паруса — их прячет дымка
    if (!(DAY6 && z0 > 20)) Q(pr, [[X - side * 0.4, top - 0.4, z0], [X - side * 0.4, top - 0.4, z1], [X + side * 2.8, top - 2.6, z1 - 1], [X + side * 2.8, top - 2.6, z0 + 1]], d6('#151c1c', '#3e4c4a'));
    if (hsh(z0 * 3 + side) > 0.35 && !(DAY6 && z0 > 20)) { const cz = z0 + (z1 - z0) * 0.6; Q(pr, [[X + side * 1.2, top - 1.5, cz], [X + side * 1.2, top - 1.5, cz + 0.6], [X + side * 1.2, top - 3.3, cz + 0.6], [X + side * 1.2, top - 3.3, cz]], d6('#2a1c18', '#5e3e34')); }
    const floors = [[0.85, -1.05], [-2.45, -4.25], [-5.45, -7.05]];
    floors.forEach(function (f, fi) {
      if (f[1] < top + 0.6) return;
      for (let z = z0 + 0.9; z + 1.0 < z1 - 0.4; z += 2.3) {
        if (kind === 'clock' && fi === 0) continue;
        const v = hsh(z * 7 + fi * 3 + side);
        let wk = v > 0.3 ? 'shut' : (v > 0.12 ? 'dark' : 'lit');
        if (fi === 0 && wk === 'lit') wk = 'shut';
        if (kind === 'clock' && fi === 1 && z > 11 && z < 13) wk = 'dim';
        if (fi === 0 && hsh(z * 5 + side) > 0.82) { quad6(X - side * 0.02, 1.6, -1.4, z, z + 1.1, d6('#0a0806', '#3a2a1e')); continue; }
        win6(side, z, z + 1.0, f[0], f[1], wk);
        if (kind === 'clock' && wk === 'dim' && !DAY6) {
          const p = pr(X, -3.2, z + 0.5), s = 140 / (z + 0.5);
          E(p[0], p[1] - s * 0.35, s * 0.17, s * 0.22, 'rgba(10,6,4,0.95)'); E(p[0], p[1] + s * 0.25, s * 0.34, s * 0.28, 'rgba(10,6,4,0.95)');
        }
      }
    });
    if (kind === 'clock') clockShop6(X, side, z0, z1);
  }
  function lamp6(z) {
    const pr = pv6, s = 140 / z, b = pr(-4.55, 1.55, z), tp = pr(-4.55, -2.9, z);
    R(b[0] - 0.05 * s, tp[1], 0.1 * s, b[1] - tp[1], d6('#0b0c0e', '#1a1c1e'));
    R(b[0] - 0.15 * s, b[1] - 0.55 * s, 0.3 * s, 0.55 * s, d6('#0e0f11', '#1c1e20'));
    R(b[0] - 0.3 * s, tp[1] + 0.1 * s, 0.6 * s, 0.05 * s, '#0b0c0e');
    const lx = tp[0], ly = tp[1];
    poly([lx - 0.22 * s, ly - 0.06 * s, lx + 0.22 * s, ly - 0.06 * s, lx + 0.15 * s, ly - 0.62 * s, lx - 0.15 * s, ly - 0.62 * s], d6('rgba(255,214,150,0.95)', 'rgba(196,202,206,0.7)'));
    poly([lx - 0.29 * s, ly - 0.62 * s, lx + 0.29 * s, ly - 0.62 * s, lx, ly - 0.86 * s], '#0b0c0e');
    R(lx - 0.24 * s, ly - 0.08 * s, 0.48 * s, 0.1 * s, '#0b0c0e');
    line(lx, ly - 0.62 * s, lx, ly - 0.06 * s, 'rgba(0,0,0,0.6)', Math.max(0.15, 0.03 * s));
  }
  function s6Back(o) {
    o = o || {};
    DAY6 = o.day ? 1 : 0; SIGN6 = o.sign !== false;
    try { return s6Paint(); } finally { DAY6 = 0; SIGN6 = true; }
  }
  function s6Paint() {
    return layer(function () {
      const pr = pv6;
      R(0, 0, W, H, LG(0, 0, 0, 110, DAY6 ? [0, '#58688a', 0.5, '#a89ea8', 1, '#ecc8aa'] : [0, '#030409', 1, '#141619']));
      if (DAY6) { gl(188, 96, 170, '255,214,170', 0.55); gl(188, 98, 50, '255,240,210', 0.5); } else gl(188, 70, 120, '90,92,100', 0.3);
      // улица и тротуары
      Q(pr, [[-4, 1.7, 1.2], [4, 1.7, 1.2], [4, 1.7, 300], [-4, 1.7, 300]], LG(0, 102, 0, 216, DAY6 ? [0, '#8a8088', 1, '#4a4a50'] : [0, '#1a1a1c', 1, '#262628']));
      [-1, 1].forEach(function (sd) {
        Q(pr, [[sd * 4, 1.55, 1.2], [sd * 5.2, 1.55, 1.2], [sd * 5.2, 1.55, 300], [sd * 4, 1.55, 300]], d6('#2a2a2c', '#6a6668'));
        Q(pr, [[sd * 4, 1.55, 1.2], [sd * 4, 1.7, 1.2], [sd * 4, 1.7, 300], [sd * 4, 1.55, 300]], d6('#141416', '#3a3a3c'));
        for (let z = 1.6; z < 60; z *= 1.12) L3(pr, [sd * 4, 1.55, z], [sd * 5.2, 1.55, z], 'rgba(0,0,0,0.35)', 0.25);
      });
      // булыжник
      let z = 1.6, row = 0;
      while (z < 44) {
        const dz = z < 6 ? 0.26 : (z < 16 ? 0.42 : 0.8), s = 140 / z, ry = Math.max(0.12, 0.09 * 1.7 * 140 / (z * z) * (dz / 0.26));
        for (let x = -4 + (row % 2) * 0.16; x < 4; x += 0.32) {
          const p = pr(x, 1.7, z), v = hsh(x * 13 + row * 7), cc = (DAY6 ? 56 + v * 34 : 22 + v * 22) | 0;
          E(p[0], p[1], 0.14 * s, Math.min(ry, 0.14 * s * 0.6), 'rgb(' + cc + ',' + cc + ',' + (cc + 4) + ')');
          if (v > 0.5) E(p[0] - 0.04 * s, p[1] - ry * 0.3, 0.06 * s, ry * 0.22, d6('rgba(190,200,215,0.12)', 'rgba(255,230,215,0.22)'));
        }
        z += dz; row++;
      }
      // дома: дальние раньше ближних
      RS6.slice().reverse().forEach(function (sg) { facade6(1, sg); });
      LS6.slice().reverse().forEach(function (sg) { facade6(-1, sg); });
      P.tex(0, 0, W, H, 0.3, 'overlay', 'mot', 1.3);
      // лужи и мокрые отражения
      if (!DAY6) {
        LMP6.forEach(function (zl) {
          const s = 140 / zl, a = pr(-4.1, 1.7 + 2.2, zl); gl(a[0], a[1], 0.3 * s + 0.5, '255,190,110', 0.35, 1.9 * s + 1);
          const pool = pr(-3.6, 1.7, zl); gl(pool[0], pool[1], 2.6 * s, '255,180,100', 0.3, 0.42 * s);
        });
        blurred(2, function () {
          const a = pr(5.2, 1.55, 5.1), b = pr(5.2, 1.55, 8.0), cc = pr(1.0, 1.7, 9.4), d = pr(1.4, 1.7, 4.4);
          poly([a[0], a[1], b[0], b[1], cc[0], cc[1], d[0], d[1]], 'rgba(255,170,80,0.32)');
          const r1 = pr(5.0, 2.6, 5.3), r2 = pr(5.0, 2.6, 7.8), r3 = pr(5.0, 4.4, 7.8), r4 = pr(5.0, 4.4, 5.3);
          poly([r1[0], r1[1], r2[0], r2[1], r3[0], r3[1], r4[0], r4[1]], 'rgba(255,170,80,0.3)');
        });
      } else {
        // мокрая мостовая отражает светлое небо в конце улицы
        blurred(2.4, function () { const a = pr(-1.6, 1.7, 60), b = pr(1.6, 1.7, 60), cc = pr(3, 1.7, 2.4), d = pr(-3, 1.7, 2.4); poly([a[0], a[1], b[0], b[1], cc[0], cc[1], d[0], d[1]], 'rgba(255,220,196,0.18)'); });
      }
      LMP6.slice().reverse().forEach(lamp6);
      // туман глотает даль
      c.fillStyle = RG(188, 96, 0, 175, DAY6 ? [0, 'rgba(250,226,206,0.9)', 0.22, 'rgba(226,206,198,0.5)', 1, 'rgba(160,150,150,0)'] : [0, 'rgba(118,116,112,0.78)', 0.25, 'rgba(80,80,82,0.42)', 1, 'rgba(20,20,22,0)']); c.fillRect(0, 0, W, H);
      if (DAY6) {
        // низкое солнце в конце улицы: тёплый свет по фасадам, края — в синеватой тени
        lighter(function () { c.fillStyle = RG(188, 98, 0, 230, [0, 'rgba(255,190,140,0.22)', 0.5, 'rgba(255,170,120,0.08)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, W, H); });
        R(0, 0, W, H, LG(0, 0, W, 0, [0, 'rgba(24,30,50,0.3)', 0.3, 'rgba(24,30,50,0)', 0.7, 'rgba(24,30,50,0)', 1, 'rgba(24,30,50,0.3)']));
      }
    });
  }
  const FIG6 = [[-1.3, 28, 0, 'top', 13], [2.1, 33, 1, null, 11], [0.4, 39, 2, null, 9], [-2.9, 35, 3, 'bowler', 12]];
  function s6(t, k, now, L) {
    const q = ease(k), pr = pv6;
    camIn(lerp(1, 1.12, q), 188, lerp(106, 101, q), function () {
      c.drawImage(L.back, 0, 0, W, H);
      LMP6.forEach(function (z, i) { const tp = pr(-4.55, -2.9, z), s = 140 / z, f = 1 + Math.sin(now / (80 + i * 23) + i) * 0.07; bloom(tp[0], tp[1] - 0.34 * s, (1.9 * s + 8) * f, '255,196,120', 0.6); });
      const wv = pr(5.2, -0.4, 6.5), f2 = 1 + Math.sin(now / 130) * 0.04;
      gl(wv[0], wv[1], 40 * f2, '255,170,80', 0.22);
      SHOPL6.forEach(function (l, i) { const p = pr(l[0], l[1], l[2]), s = 140 / l[2]; bloom(p[0], p[1], (0.9 * s + 6) * (1 + Math.sin(now / (70 + i * 31)) * 0.06), '255,200,130', 0.55); });
      // Пустые выходят из тумана
      FIG6.map(function (f) { return [f, f[1] - ease(seg(t, f[2] * 700, 11500)) * f[4]]; }).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (e) {
        const f = e[0], zz = e[1], s = 140 / zz, p = pr(f[0], 1.7, zz), a = clamp((40 - zz) / 15) * 0.95;
        soft(p[0], p[1] - 1.1 * s, 0.9 * s, 1.6 * s, '170,172,176', 0.28 * a);
        c.save(); c.translate(p[0], p[1]); c.scale(1, -0.55); person(0, 0, 2.05 * s, { col: '#050608', a: a * 0.22, thin: 0.72, long: true, hat: f[3] }); c.restore();
        person(p[0], p[1], 2.05 * s, { col: '#040506', a: a, thin: 0.72, long: true, hat: f[3], blur: (1 - a) * 1.4 + 0.2, walk: now / 900 + f[2] * 1.7, face: 'rgba(170,176,172,' + (0.35 * a).toFixed(2) + ')' });
      });
      P.fog(80, 80, now, 3, 0.35, '140,140,142', 3);
      P.fog(110, 70, now + 3000, 6, 0.3, '120,120,124', 4);
      rain(now, { n: 70, len: 4, spd: 0.2, a: 0.12, seed: 8, ang: -0.08 });
      rain(now, { n: 20, len: 14, spd: 0.7, a: 0.12, seed: 9, ang: -0.1, lw: 0.45 });
      splash(now, { n: 30, x0: 40, x1: 344, y0: 150, y1: 210, a: 0.22 });
    });
  }

  /* 6 (как в игре): та самая лавка на Сенной ночью, к ней из тумана идут Пустые */
  const HOL6 = [[-1, 0, 'top', 0.92, 1], [1, 900, null, 0.98, 2], [-1, 2300, 'bowler', 0.86, 3], [1, 3600, null, 0.9, 4], [-1, 5200, null, 0.95, 5]];
  function s6g(t, k, now, L) {
    const q = ease(k);
    LAVKA.reset(); LAVKA.LV.winWho = false; LAVKA.LV.plate = 'Открыто';
    camIn(lerp(1.0, 1.12, q), lerp(192, 196, q), lerp(112, 118, q), function () {
      LAVKA.draw('facade_night', now, L, {
        mid: function () {
          HOL6.forEach(function (h) {
            const p = seg(t, h[1], h[1] + 7600), side = h[0], x = side < 0 ? lerp(-30, 168 - h[4] * 6, ease(p)) : lerp(420, 290 + h[4] * 5, ease(p)), y = 190 + h[4] * 0.6;
            const a = clamp(p * 2.4) * 0.92;
            if (a > 0.01) LAVKA.hollow(x, y, h[3], a, h[2], now, h[4]);
          });
        },
        after: function () { P.fog(150, 66, now + 2000, 6, 0.32, '110,130,126', 6); }
      });
    });
  }

  /* ============================================================
     7. ГРОССБУХ: правила проступают сами; лампа гаснет
     ============================================================ */
  const BK = { cx: 200, top: 62, h: 124, half: 124, grow: 26 };
  function pg(u, v) { return [BK.cx + u * (BK.half + v * BK.grow), BK.top + v * BK.h]; }
  /* текст «на странице»: строка в точке (u, v), с наклоном и сжатием по ракурсу */
  function onPage(u, v, fn) {
    const o = pg(u, v), sx = (BK.half + v * BK.grow) / BK.half, k = (u + 0.25) * BK.grow / BK.h;
    c.save(); c.translate(o[0], o[1]); c.transform(sx, 0, k * 0.84, 0.84, 0, 0); try { fn(); } finally { c.restore(); }
  }
  function lamp7(x, base) {
    soft(x + 18, base + 2, 26, 6, '0,0,0', 0.5);
    E(x, base, 17, 4.4, P.brassG(x - 17, x + 17)); E(x, base - 1, 14, 3, '#5a3a14');
    R(x - 5, base - 14, 10, 13, P.brassG(x - 5, x + 5));
    E(x, base - 24, 14, 11, 'rgba(210,160,80,0.4)');
    c.save(); c.beginPath(); c.ellipse(x, base - 24, 14, 11, 0, 0, 6.28); c.clip(); R(x - 15, base - 22, 30, 14, 'rgba(170,110,40,0.55)'); c.restore();
    E(x - 6, base - 27, 2, 5, 'rgba(255,255,255,0.3)', 0.3);
    R(x - 8, base - 37, 16, 4, P.brassG(x - 8, x + 8)); R(x - 5.6, base - 43, 11.2, 6, P.brassG(x - 5.6, x + 5.6));
    c.beginPath(); c.moveTo(x - 5, base - 43); c.bezierCurveTo(x - 10, base - 50, x - 10, base - 60, x - 4, base - 68); c.lineTo(x - 3.6, base - 100); c.lineTo(x + 3.6, base - 100); c.lineTo(x + 4, base - 68); c.bezierCurveTo(x + 10, base - 60, x + 10, base - 50, x + 5, base - 43); c.closePath();
    c.fillStyle = 'rgba(230,240,240,0.08)'; c.fill(); c.strokeStyle = 'rgba(255,240,220,0.3)'; c.lineWidth = 0.3; c.stroke();
    R(x - 2.6, base - 98, 0.8, 28, 'rgba(255,255,255,0.22)'); E(x - 5, base - 55, 1, 5, 'rgba(255,255,255,0.25)');
  }
  function s7Back() {
    return layer(function () {
      // лавка за спиной — не в фокусе
      blurred(3.4, function () {
        R(0, 0, W, 60, '#120d0a');
        for (let x = -8; x < W; x += 24) R(x, 0, 20, 60, 'rgba(40,52,46,0.2)');
        [16, 34].forEach(function (y) { R(150, y, 120, 2, '#3a2412'); for (let i = 0; i < 12; i++) { const bx = 154 + i * 10; R(bx, y - 8 - (i % 3) * 2, 6, 8 + (i % 3) * 2, ['#2a4a3a', '#5a2a1a', '#3a3a5a', '#6a4a20'][i % 4]); gl(bx + 4, y - 6, 3, '255,200,130', 0.5); } });
        E(318, 30, 22, 30, '#6a5020'); E(318, 30, 19, 27, '#1c2624');
        gl(312, 26, 10, '255,190,120', 0.3);
        R(40, 0, 18, 60, '#2a160a'); E(49, 12, 6, 6, '#d8ccaa');
      });
      // прилавок: тёмный полированный дуб
      R(0, 44, W, H - 44, LG(0, 44, 0, H, [0, '#1c0e06', 0.5, '#2a1609', 1, '#1a0c04']));
      for (let y = 46; y < H; y += 11) R(0, y, W, 0.5, 'rgba(0,0,0,0.4)');
      const r = P.RNG(3);
      for (let i = 0; i < 200; i++) { const y = 46 + r() * 170, x = r() * W, l = 10 + r() * 40; line(x, y, x + l, y + (r() - 0.5), 'rgba(10,4,0,' + (0.1 + r() * 0.2).toFixed(2) + ')', 0.2); }
      P.tex(0, 44, W, 172, 0.3, 'overlay', 'mot', 0.9);
      R(0, 44, W, 1.4, 'rgba(255,190,120,0.25)');
      lighter(function () { c.fillStyle = RG(36, 70, 0, 280, [0, 'rgba(255,150,70,0.4)', 0.4, 'rgba(255,120,50,0.12)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, W, H); });
      gl(36, 140, 8, '255,190,120', 0.25, 30);
      // книга: обложка, срез страниц, страницы, тени
      soft(BK.cx + 14, BK.top + BK.h * 0.6, 170, 80, '0,0,0', 0.55);
      const c0 = pg(-1.04, -0.03), c1 = pg(1.04, -0.03), c2 = pg(1.04, 1.04), c3 = pg(-1.04, 1.04);
      poly([c0[0], c0[1], c1[0], c1[1], c2[0], c2[1] + 4, c3[0], c3[1] + 4], '#2a0c08');
      R(c3[0], c3[1], c2[0] - c3[0], 4, LG(0, c3[1], 0, c3[1] + 4, [0, '#c8a860', 1, '#7a5a24']));
      for (let i = 0; i < 8; i++) line(c3[0] + 2, c3[1] + 0.5 + i * 0.45, c2[0] - 2, c3[1] + 0.5 + i * 0.45, 'rgba(90,60,20,0.35)', 0.12);
      [[-1, 0], [0, 1]].forEach(function (pp, side) {
        const a = pg(pp[0], 0), b = pg(pp[1], 0), d = pg(pp[1], 1), e = pg(pp[0], 1);
        c.save(); c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - 2.5, b[0], b[1]); c.lineTo(d[0], d[1]); c.quadraticCurveTo((e[0] + d[0]) / 2, d[1] - 2, e[0], e[1]); c.closePath();
        c.fillStyle = LG(a[0], 0, b[0], 0, side ? [0, '#9a8a66', 0.08, '#d6c8a2', 0.3, '#ebdfbe', 1, '#d8caa4'] : [0, '#d4c6a0', 0.7, '#e8dcbc', 0.92, '#d2c49e', 1, '#9a8a66']); c.fill();
        c.clip(); P.tex(Math.min(a[0], e[0]) - 2, a[1] - 4, Math.abs(b[0] - a[0]) + 40, BK.h + 8, 0.3, 'multiply', 'mot', 0.5);
        c.restore();
      });
      R(BK.cx - 0.8, BK.top, 1.6, BK.h, 'rgba(40,20,10,0.4)');
      // левая страница: столбцы гроссбуха — все прежние хозяева
      for (let v = 0.12; v < 0.98; v += 0.075) { const a = pg(-0.97, v), b = pg(-0.04, v); line(a[0], a[1], b[0], b[1], 'rgba(70,90,140,0.25)', 0.2); }
      [-0.74, -0.28].forEach(function (u) { const a = pg(u, 0.05), b = pg(u, 0.97); line(a[0], a[1], b[0], b[1], 'rgba(170,40,30,0.45)', 0.3); });
      onPage(-0.95, 0.105, function () { txt('число', 0, 0, 'italic 4.6px ' + SERIF, 'rgba(60,40,30,0.6)'); });
      onPage(-0.7, 0.105, function () { txt('залогодатель', 0, 0, 'italic 4.6px ' + SERIF, 'rgba(60,40,30,0.6)'); });
      onPage(-0.25, 0.105, function () { txt('залог', 0, 0, 'italic 4.6px ' + SERIF, 'rgba(60,40,30,0.6)'); });
      [['7 нояб.', 'Крюк С. Ф.', 'тень, одна'], ['7 нояб.', 'Вересов И. И.', '7 ночей'], ['7 нояб.', 'Градов П. А.', '7 ночей'], ['7 нояб.', 'Сорин М. И.', '7 ночей'], ['7 нояб.', '', '']].forEach(function (row, i) {
        const v = 0.25 + i * 0.15, ink = i === 3 ? 'rgba(40,20,30,0.85)' : 'rgba(80,50,36,' + (0.55 + i * 0.06).toFixed(2) + ')';
        onPage(-0.95, v, function () { txt(row[0], 0, 0, '6px ' + HAND, ink); });
        if (row[1]) onPage(-0.7, v, function () { txt(row[1], 0, 0, '6.6px ' + HAND, ink); });
        if (row[2]) onPage(-0.25, v, function () { txt(row[2], 0, 0, '6px ' + HAND, ink); });
      });
      // правая страница: внизу — бледный список, не разобрать
      for (let i = 0; i < 6; i++) onPage(0.1, 0.66 + i * 0.055, function () {
        txt((i + 1) + '.', 0, 0, '4.6px ' + HAND, 'rgba(70,50,40,0.35)');
        c.strokeStyle = 'rgba(70,50,40,0.3)'; c.lineWidth = 0.3; c.beginPath(); c.moveTo(7, -1); for (let x = 7; x < 70 - i * 6; x += 2.4) c.lineTo(x, -1 + Math.sin(x * 1.7 + i) * 0.9); c.stroke();
      });
      // закладка
      const sp = pg(0, 0.02), sb = pg(0.04, 1.06);
      c.beginPath(); c.moveTo(sp[0] - 1, sp[1]); c.lineTo(sp[0] + 2, sp[1]); c.lineTo(sb[0] + 3, sb[1] + 12); c.lineTo(sb[0] + 1, sb[1] + 9); c.lineTo(sb[0] - 1, sb[1] + 12); c.closePath(); c.fillStyle = LG(sp[0], 0, sp[0] + 4, 0, [0, '#6a0c0a', 0.5, '#c02a20', 1, '#5a0a08']); c.fill();
      // очки на левой странице
      const g1 = pg(-0.84, 1.0), g2 = pg(-0.64, 1.02);
      soft(g1[0] + 14, g1[1] + 4, 24, 6, '0,0,0', 0.3);
      [g1, g2].forEach(function (g) { E(g[0], g[1], 7, 5, 'rgba(220,235,240,0.12)'); c.strokeStyle = '#3a3a3e'; c.lineWidth = 0.6; c.beginPath(); c.ellipse(g[0], g[1], 7, 5, 0, 0, 6.28); c.stroke(); E(g[0] - 2, g[1] - 1.6, 2, 0.8, 'rgba(255,255,255,0.35)', -0.4); });
      line(g1[0] + 7, g1[1], g2[0] - 7, g2[1], '#3a3a3e', 0.6); line(g1[0] - 7, g1[1], g1[0] - 22, g1[1] - 6, '#3a3a3e', 0.5);
      // чернильница с пером, колокольчик, монеты
      soft(356, 70, 20, 6, '0,0,0', 0.5);
      R(342, 54, 16, 14, LG(342, 0, 358, 0, [0, '#0a0a14', 0.5, '#2a2a40', 1, '#05050a'])); R(344, 50, 12, 4, P.brassG(344, 356));
      c.beginPath(); c.moveTo(350, 52); c.quadraticCurveTo(366, 30, 384, 12); c.lineTo(386, 14); c.quadraticCurveTo(368, 32, 352, 53); c.closePath(); c.fillStyle = '#1a120c'; c.fill();
      soft(372, 196, 26, 7, '0,0,0', 0.5);
      c.beginPath(); c.moveTo(352, 188); c.bezierCurveTo(352, 172, 356, 164, 362, 162); c.lineTo(366, 162); c.bezierCurveTo(372, 164, 376, 172, 376, 188); c.closePath(); c.fillStyle = P.brassG(352, 376); c.fill();
      E(364, 188, 12.4, 3, P.brassG(352, 376)); R(361.6, 146, 4.8, 17, LG(361, 0, 367, 0, [0, '#2a140a', 0.5, '#6a3a1a', 1, '#2a140a'])); E(364, 146, 3.4, 2.4, '#5a2e14');
      E(358, 176, 1.2, 6, 'rgba(255,240,200,0.45)');
      [[316, 196, 0], [326, 200, 1], [306, 202, 0], [320, 205, 1], [318, 193, 0]].forEach(function (co) { E(co[0], co[1], 5, 2, co[2] ? '#a8a8b0' : P.brassG(co[0] - 5, co[0] + 5)); E(co[0] - 1, co[1] - 0.5, 2, 0.6, 'rgba(255,255,255,0.3)'); });
      lamp7(36, 112);
    });
  }
  /* строка правил «проявляется»; shaky — дрожащая рука, сырые чернила */
  function rule(u, v, s, font, col, p, shaky) {
    if (p <= 0) return;
    onPage(u, v, function () {
      c.font = font; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      const w = c.measureText(s).width;
      if (!shaky) { c.save(); c.beginPath(); c.rect(-w / 2 - 2, -16, (w + 4) * p, 22); c.clip(); c.fillStyle = col.replace('A', '0.18'); c.fillText(s, 0.3, 0.2); c.fillStyle = col.replace('A', '0.9'); c.fillText(s, 0, 0); c.restore(); return; }
      c.textAlign = 'left'; let x = -w / 2;
      for (let i = 0; i < s.length; i++) {
        const cw = c.measureText(s[i]).width; if (i / s.length > p) break;
        c.save(); c.translate(x, (hsh(i * 3) - 0.5) * 1.4); c.rotate((hsh(i * 7) - 0.5) * 0.16);
        c.fillStyle = col.replace('A', '0.2'); c.fillText(s[i], 0.3, 0.3); c.fillStyle = col.replace('A', '0.92'); c.fillText(s[i], 0, 0);
        c.restore(); x += cw;
      }
    });
  }
  function s7(t, k, now, L) {
    const q = ease(k), dim = seg(t, 8200, 10400), fl = (1 + Math.sin(now / 83) * 0.06 + Math.sin(now / 29) * 0.03) * (1 - dim * 0.75);
    camIn(lerp(1, 1.18, q), lerp(196, 240, q), lerp(110, 100, q), function () {
      c.drawImage(L.back, 0, 0, W, H);
      rule(0.5, 0.17, 'ПРАВИЛА.', 'bold 13px ' + HAND, 'rgba(40,16,10,A)', seg(t, 1100, 2300));
      rule(0.5, 0.33, 'Не нарушай.', '11px ' + HAND, 'rgba(40,16,10,A)', seg(t, 3200, 4500));
      rule(0.5, 0.5, 'Я нарушил.', '11.6px ' + HAND, 'rgba(96,20,12,A)', seg(t, 5500, 7200), true);
      P.flame(36, 66, 2.2 * (1 - dim * 0.6), now, 2, '255,150,60', 0);
      bloom(36, 62, 80, '255,160,80', 0.32 * fl);
      gl(120, 100, 230, '255,140,60', 0.05 * fl);
      P.motes(now, 20, 20, 160, 120, 30, 6, '255,220,170', 0.5 * (1 - dim));
    });
    if (dim > 0) R(0, 0, W, H, 'rgba(0,0,0,' + (0.78 * dim).toFixed(3) + ')');
    // в зеркале за спиной — ладонь изнутри
    const hp = seg(t, 8600, 10200);
    if (hp > 0) {
      const a = Math.min(1, hp * 1.6) * 0.5;
      camIn(lerp(1, 1.18, q), lerp(196, 240, q), lerp(110, 100, q), function () {
        soft(318, 32, 12, 16, '170,190,185', a * 0.6);
        soft(318, 36, 4.4, 5.4, '215,225,220', a);
        [[-3.6, -5, -0.25], [-1.4, -7, -0.08], [1.2, -7.2, 0.06], [3.4, -5.4, 0.22]].forEach(function (f) { c.save(); c.translate(318 + f[0], 36 + f[1] - 2); c.rotate(f[2]); soft(0, 0, 1.1, 3.6, '215,225,220', a); c.restore(); });
        soft(312.6, 37, 1.2, 3, '215,225,220', a);
      });
    }
  }

  /* ============================================================
     8. ТИТУЛ
     ============================================================ */
  function s8Title() {
    return layer(function () {
      const T = 'ПОСЛЕДНИЙ ЧАС', y = 106;
      c.font = 'bold 27px ' + SERIF; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.letterSpacing = '3px';
      c.save(); c.shadowColor = 'rgba(255,160,60,0.75)'; c.shadowBlur = 16 * K; c.fillStyle = 'rgba(255,180,100,0.5)'; c.fillText(T, 192, y); c.restore();
      c.fillStyle = 'rgba(24,12,2,0.95)'; c.fillText(T, 192.5, y + 0.8);
      c.fillStyle = LG(0, y - 22, 0, y + 2, [0, '#fff4d0', 0.35, '#f2ca76', 0.55, '#a8722a', 0.72, '#e6b45c', 1, '#6a3e10']); c.fillText(T, 192, y);
      c.strokeStyle = 'rgba(255,240,200,0.3)'; c.lineWidth = 0.25; c.strokeText(T, 192, y);
      c.letterSpacing = '0px';
      // орнамент и маленькие часы на без четверти три
      [[54, 170], [214, 330]].forEach(function (s) { line(s[0], 118, s[1], 118, 'rgba(220,180,100,0.55)', 0.35); });
      [[170, 118], [214, 118]].forEach(function (p) { c.save(); c.translate(p[0], p[1]); c.rotate(0.785); R(-1.3, -1.3, 2.6, 2.6, 'rgba(220,180,100,0.7)'); c.restore(); });
      P.face(192, 118, 5.4, { plain: true });
      txt('ломбард на краю тумана', 192, 140, 'italic 9.5px ' + SERIF, 'rgba(215,195,150,0.85)', 'center', '1.2px');
    });
  }
  function s8(t, k, now, L) {
    R(0, 0, W, H, '#000');
    gl(192, 236, 220, '255,120,50', 0.14);
    P.fog(110, 110, now, 4, 0.3, '120,100,84', 1);
    for (let i = 0; i < 40; i++) {
      const per = 3800 + hsh(i) * 3000, p = ((now / per + hsh(i * 3)) % 1), x = 90 + hsh(i * 5) * 204 + Math.sin(p * 6 + i) * 6, y = 214 - p * 170, a = Math.sin(p * Math.PI) * 0.8;
      E(x, y, 0.35, 0.35, 'rgba(255,190,110,' + a.toFixed(3) + ')'); gl(x, y, 2.4, '255,150,60', a * 0.25);
    }
    const flick = (0.94 + Math.sin(now / 53) * 0.04 + Math.sin(now / 17) * 0.02) * (Math.floor(now / 97) % 41 === 0 ? 0.6 : 1);
    const a = seg(t, 500, 2600) * flick;
    cam(lerp(1, 1.04, ease(k)), 192, 112, function () { c.save(); c.globalAlpha = clamp(a); c.drawImage(L.title, 0, 0, W, H); c.restore(); });
    P.fog(150, 90, now + 5000, 7, 0.22, '120,100,84', 2);
  }

  /* ============================================================
     СБОРКА
     ============================================================ */
  const CACHE = {};
  function once(key, fn) { if (!CACHE[key]) CACHE[key] = fn(); return CACHE[key]; }
  /* кисти и готовые сцены — ими же нарисованы концовки (js/endings.js) */
  window.KINO = {
    W: W, H: H, K: K, HAND: HAND, SERIF: SERIF, ctx: function () { return c; }, begin: function () { c = P.ctx(); },
    clamp: clamp, ease: ease, seg: seg, lerp: lerp, hsh: hsh, R: R, E: E, poly: poly, line: line, LG: LG, RG: RG,
    layer: layer, blurred: blurred, cam: cam, camIn: camIn, txt: txt, lighter: lighter, gl: gl, soft: soft, bloom: bloom,
    rain: rain, splash: splash, PV: PV, Q: Q, L3: L3, person: person, wallText: wallText,
    s1Outside: s1Outside, s1Room: s1Room, s1Desk: s1Desk, WN: WN, s2Paper: s2Paper, PW: PW, PH: PH,
    s4Back: s4Back, s4Front: s4Front, pv4: pv4, ZL4: ZL4, s5Above: s5Above, s5Water: s5Water, s5Fore: s5Fore, SHORE: SHORE,
    s6Back: s6Back, pv6: pv6, LMP6: LMP6, SHOPL6: SHOPL6, lamp6: lamp6, s7Back: s7Back, pg: pg, onPage: onPage, BK: BK, lamp7: lamp7, rule: rule,
    sobor5: sobor5, onion5: onion5, gold5: gold5, waxSeal: waxSeal, watch1: watch1, bookFace: bookFace
  };
  Film.define('intro', function () {
    LETTER = null;
    const L = {};
    function shot(cap, d, cues, prep, draw) { return { cap: cap, d: d, cues: cues, prep: prep, draw: function (t, k, now) { c = P.ctx(); draw(t, k, now); } }; }
    return [
      shot('Письмо пришло в четверг.', 8500, [[300, 'drip'], [4600, 'thunder']],
        function () { L.s1 = { out: once('s1o', s1Outside), room: once('s1r', s1Room), desk: once('s1d', s1Desk), flash: once('s1f', s1Flash) }; },
        function (t, k, now) { s1(t, k, now, L.s1); }),
      shot('Нотариус из города Мглова сообщал: ваш дядя, Матвей Ильич Сорин, «выбыл при невыясненных обстоятельствах».', 8500, [[300, 'page']],
        function () { L.s2 = { bg: once('s2b', s2Bg), paper: once('s2p', s2Paper), ink: s2Ink() }; },
        function (t, k, now) { paperView(t, k, now, L.s2, 62, 124, 1.1, 1.14, function () { drawInk(L.s2.ink, [400, 1700, 3500, 4800], t, [[196, 72, 96, 20, 200]]); }); }),
      shot('Вам отошла его лавка — ломбард «Последний час».\nИ его долг.', 10000, [[5100, 'whisper'], [7000, 'hush']],
        function () { L.s3 = { bg: once('s2b', s2Bg), paper: once('s2p', s2Paper), ink: L.s2 ? L.s2.ink : s2Ink() }; },
        function (t, k, now) {
          paperView(t, k, now, L.s3, 168, 236, 1.18, 1.24, function () {
            drawInk(L.s3.ink, [-1e5, -1e5, -1e5, -1e5, 300, 1700, 3100, 4300], t, [[196, 72, 96, 20, -1e5], [98, 298, 192, 52, 4600]]);
            const l7 = letterLines()[6];
            if (l7.kx) blot(l7.kx + 1.5, l7.y - 4, t, now);
          });
        }),
      shot('Последний поезд высадил вас на пустом перроне.', 10000, [[150, 'whistle'], [600, 'chug']],
        function () { L.s4 = { back: once('s4b', s4Back), front: once('s4f', s4Front) }; },
        function (t, k, now) { s4(t, k, now, L.s4); }),
      shot('Туман здесь поднимается от реки каждый вечер — и город запирает ставни.', 10000, [[2500, 'knock1'], [3800, 'knock1'], [5400, 'knock1'], [7100, 'knock1']],
        function () { const ab = once('s5a', s5Above); L.s5 = { above: ab, water: once('s5w', function () { return s5Water(ab); }), fore: once('s5f', s5Fore) }; },
        function (t, k, now) { s5(t, k, now, L.s5); }),
      shot('Лавка работает только ночью. Так заведено: тем, кто выходит из тумана, тоже нужно где-то торговать.', 11500, [[1600, 'step'], [3100, 'step'], [4600, 'step'], [6100, 'step'], [7600, 'step'], [8600, 'whisper'], [9100, 'step']],
        function () { if (typeof LAVKA !== 'undefined' && LAVKA) { L.s6g = {}; LAVKA.prep('facade_night', L.s6g); } else L.s6 = { back: once('s6b', s6Back) }; },
        function (t, k, now) { if (L.s6g) s6g(t, k, now, L.s6g); else s6(t, k, now, L.s6); }),
      shot('На прилавке лежит дядин гроссбух. На первой странице, его рукой: «ПРАВИЛА. Не нарушай. Я нарушил».', 11000, [[300, 'page'], [1200, 'scratch'], [3300, 'scratch'], [5600, 'scratch'], [8700, 'breath']],
        function () { L.s7 = { back: once('s7b', s7Back) }; },
        function (t, k, now) { s7(t, k, now, L.s7); }),
      shot('', 6500, [[300, 'bigBell']],
        function () { L.s8 = { title: once('s8t', s8Title) }; },
        function (t, k, now) { s8(t, k, now, L.s8); })
    ];
  }, function () { Object.keys(CACHE).forEach(function (k) { delete CACHE[k]; }); LETTER = null; });   // после вступления слои не нужны
})();
