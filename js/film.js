'use strict';
/* ============================================================
   ВИДЕОЗАСТАВКИ. Вступление и концовки — короткое «кино»:
   несколько планов, камера медленно движется, внизу печатаются
   субтитры. Клик / пробел — дальше, Esc — пропустить.
   Рисуется HD-кистью (hd.js) поверх всей игры.
   ============================================================ */
const Film = (function () {
  const P = HD.api, W = 384, H = 216;
  const HAND = '"Segoe Script", "Segoe Print", "Georgia", serif';
  let c = null, cur = null;

  const clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  const ease = function (t) { t = clamp(t); return t * t * (3 - 2 * t); };
  const seg = function (t, a, b) { return clamp((t - a) / (b - a)); };
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  function R(x, y, w, h, f) { c.fillStyle = f; c.fillRect(x, y, w, h); }
  function E(x, y, rx, ry, f, rot) { P.ell(x, y, rx, ry, f, rot); }
  function cam(z, fx, fy, fn) { c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-fx, -fy); try { fn(); } finally { c.restore(); } }
  function txt(s, x, y, font, col, al, a) { c.save(); c.font = font; c.fillStyle = col; c.textAlign = al || 'left'; c.textBaseline = 'alphabetic'; if (a !== undefined) c.globalAlpha *= clamp(a); c.fillText(s, x, y); c.restore(); }
  function inL(layer, fn) { P.into(layer, function (x) { const o = c; c = x; try { fn(); } finally { c = o; } }); return layer; }
  function hsh(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  /* ============================================================
     ДЕКОРАЦИИ
     ============================================================ */
  function sky(st, h) { R(0, 0, W, h || H, P.LG(0, 0, 0, h || H, st)); }
  function stars(seed, n, ymax, now, a) {
    const r = P.RNG(seed);
    for (let i = 0; i < n; i++) { const x = r() * W, y = r() * ymax, s = 0.25 + r() * 0.35, tw = 0.55 + 0.45 * Math.sin(now / (500 + r() * 900) + r() * 6); E(x, y, s, s, 'rgba(225,232,240,' + ((0.15 + r() * 0.5) * tw * (a === undefined ? 1 : a)).toFixed(3) + ')'); }
  }
  function onion(x, y, w, h, f) {
    c.beginPath(); c.moveTo(x - w / 2, y);
    c.bezierCurveTo(x - w * 0.78, y - h * 0.45, x - w * 0.12, y - h * 0.72, x, y - h);
    c.bezierCurveTo(x + w * 0.12, y - h * 0.72, x + w * 0.78, y - h * 0.45, x + w / 2, y);
    c.closePath(); c.fillStyle = f; c.fill();
  }
  function churchSil(x, base, s, col, dome) {
    R(x - 22 * s, base - 30 * s, 44 * s, 30 * s, col); R(x - 9 * s, base - 44 * s, 18 * s, 14 * s, col);
    onion(x, base - 44 * s, 20 * s, 18 * s, dome || col); P.cross8(x, base - 62 * s, 9 * s, dome || col, 0.9 * s);
    [-16, 16].forEach(function (d) { R(x + d * s - 4 * s, base - 38 * s, 8 * s, 8 * s, col); onion(x + d * s, base - 38 * s, 10 * s, 9 * s, dome || col); });
  }
  function tower(x, base, s, col) {
    R(x - 6 * s, base - 50 * s, 12 * s, 50 * s, col); R(x - 4.5 * s, base - 64 * s, 9 * s, 14 * s, col);
    P.poly([x - 5 * s, base - 64 * s, x, base - 78 * s, x + 5 * s, base - 64 * s], col); P.cross8(x, base - 78 * s, 6 * s, col, 0.6 * s);
  }
  /* строй домов-силуэтов; окна гаснут по off(i) — город запирает ставни */
  function town(base, col, seed, o) {
    o = o || {};
    const r = P.RNG(seed); let x = o.x0 === undefined ? -10 : o.x0, wi = 0;
    while (x < (o.x1 === undefined ? W + 10 : o.x1)) {
      const w = (o.minW || 14) + r() * (o.varW || 14), h = (o.minH || 14) + r() * (o.varH || 18), roof = 4 + r() * 6;
      R(x, base - h, w, h, col); P.poly([x - 1, base - h, x + w / 2, base - h - roof, x + w + 1, base - h], col);
      if (r() < 0.6) R(x + w * (0.2 + r() * 0.5), base - h - roof - 3, 2, roof + 2, col);
      const rows = Math.max(1, Math.floor((h - 4) / 8)), cols = Math.max(1, Math.floor(w / 7));
      for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) {
        const id = wi++, lit = r() < (o.lit === undefined ? 0.45 : o.lit);
        const wx = x + 2.4 + cc * (w - 4.8) / cols, wy = base - h + 3 + rr * 8;
        if (!lit) continue;
        if (o.off && o.off(id)) { R(wx - 0.3, wy - 0.2, 2.8, 3.4, o.shut || 'rgba(40,26,16,0.9)'); continue; }
        R(wx, wy, 2.2, 3, o.win || 'rgba(255,190,100,0.85)');
        if (o.glow) P.glow(wx + 1.1, wy + 1.5, 5, '255,170,80', o.glow);
      }
      x += w + r() * 4;
    }
  }
  function bird(x, y, s, ph, col) {
    const w = Math.sin(ph);
    c.beginPath(); c.moveTo(x - 3 * s, y - w * 1.8 * s); c.quadraticCurveTo(x - 1.2 * s, y - 0.4 * s, x, y + 0.3 * s); c.quadraticCurveTo(x + 1.2 * s, y - 0.4 * s, x + 3 * s, y - w * 1.8 * s);
    c.strokeStyle = col; c.lineWidth = 0.55 * s; c.lineCap = 'round'; c.stroke(); c.lineCap = 'butt';
  }
  function flock(now, x0, y0, n, vx, vy, seed, col, s) {
    const r = P.RNG(seed);
    for (let i = 0; i < n; i++) bird(x0 + vx * now / 1000 + (r() - 0.5) * 50, y0 + vy * now / 1000 + (r() - 0.5) * 24, (s || 1) * (0.7 + r() * 0.5), now / (110 + r() * 40) + r() * 6, col || '#0a0a0e');
  }
  function puffs(now, x, y, n, life, dx, dy, col, size, seed) {
    const r = P.RNG(seed || 1);
    for (let i = 0; i < n; i++) {
      const p = ((now / life + i / n + r() * 0.1) % 1), s = (size || 6) * (0.4 + p * 1.6);
      E(x + dx * p + Math.sin(now / 700 + i) * 2 * p, y + dy * p, s, s * 0.8, 'rgba(' + (col || '200,200,205') + ',' + ((1 - p) * 0.35).toFixed(3) + ')');
    }
  }
  function rainStreaks(now, a, seed, n, x0, y0, w, h) {
    const r = P.RNG(seed);
    c.save(); c.strokeStyle = 'rgba(190,205,220,' + a + ')'; c.lineWidth = 0.25;
    for (let i = 0; i < n; i++) { const x = (x0 || 0) + r() * (w || W), sp = 0.7 + r() * 0.6, y = (y0 || 0) + ((r() * (h || H) + now * 0.25 * sp) % (h || H)); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 1.4, y + 7); c.stroke(); }
    c.restore();
  }
  /* капли на стекле: неподвижные и сползающие со следом */
  function glassDrops(x, y, w, h, now, seed, n) {
    const r = P.RNG(seed);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    for (let i = 0; i < (n || 60); i++) { const dx = x + r() * w, dy = y + r() * h, s = 0.3 + r() * 0.7; E(dx, dy, s, s * 1.1, 'rgba(160,180,200,0.22)'); E(dx - s * 0.3, dy - s * 0.4, s * 0.35, s * 0.35, 'rgba(255,255,255,0.35)'); }
    for (let i = 0; i < 12; i++) {
      const dx = x + r() * w, sp = 0.3 + r() * 0.8, p = ((now / 5000 * sp + r()) % 1), dy = y + p * (h + 10) - 5, s = 0.6 + r() * 0.6;
      c.strokeStyle = 'rgba(170,190,210,0.18)'; c.lineWidth = s * 0.8; c.beginPath(); c.moveTo(dx, dy - 14 * sp); c.lineTo(dx + Math.sin(dy * 0.2) * 0.4, dy); c.stroke();
      E(dx, dy, s, s * 1.3, 'rgba(190,210,225,0.35)'); E(dx - s * 0.3, dy - s * 0.5, s * 0.35, s * 0.35, 'rgba(255,255,255,0.5)');
    }
    c.restore();
  }
  /* силуэт человека: рост 60 условных единиц, ноги на (0,0) */
  function figPath(o) {
    const wk = o.walk === undefined ? 0 : Math.sin(o.walk), th = o.thin ? 0.72 : 1, fl = o.flare || 0, hem = o.long ? -6 : -17;
    c.beginPath();
    [-2.2 * th + wk * 2, 2.2 * th - wk * 2].forEach(function (x) {   // ноги сужаются к щиколотке, внизу ботинок
      c.moveTo(x - 1.7 * th, -24); c.lineTo(x + 1.7 * th, -24); c.lineTo(x + 1.1 * th, -1.8); c.lineTo(x + 1.7 * th, 0); c.lineTo(x - 1.7 * th, 0); c.lineTo(x - 1.1 * th, -1.8); c.closePath();
    });
    // все части обходятся по часовой стрелке — иначе на пересечениях заливка даёт «дыры»
    c.moveTo(-5 * th, -46); c.lineTo(5 * th, -46); c.bezierCurveTo(8 * th, -42, 8.6 * th, -28, 9.5 * th + fl, hem); c.lineTo(-9.5 * th - fl, hem); c.bezierCurveTo(-8.6 * th, -28, -8 * th, -42, -5 * th, -46); c.closePath();
    c.rect(-1.4, -49, 2.8, 4);
    c.moveTo(3.8, -51.5); c.ellipse(0, -51.5, 3.8, 4.6, 0, 0, 6.2832);
    if (!o.noArms) {
      c.moveTo(-6.4 * th, -44); c.lineTo(-4.8 * th, -42); c.lineTo(-6.8 * th - wk, -22.4); c.lineTo(-8.8 * th - wk, -23); c.closePath();
      c.moveTo(6.4 * th, -44); c.lineTo(8.8 * th + wk, -23); c.lineTo(6.8 * th + wk, -22.4); c.lineTo(4.8 * th, -42); c.closePath();
    }
    if (o.hat === 'top') { c.rect(-4.2, -67, 8.4, 12); c.rect(-7.2, -56.2, 14.4, 1.7); }
    else if (o.hat === 'cap') { c.moveTo(-4.4, -54); c.quadraticCurveTo(0, -60, 4.4, -54); c.lineTo(6.8, -53.2); c.lineTo(-4.4, -53.2); c.closePath(); }
    else if (o.hat === 'bowler') { c.moveTo(-4, -55); c.bezierCurveTo(-4.2, -61.6, 4.2, -61.6, 4, -55); c.closePath(); c.rect(-6.4, -55.6, 12.8, 1.5); }
    else if (o.hat === 'scarf') { c.moveTo(-4.8, -50); c.quadraticCurveTo(-5.2, -57.8, 0, -57.6); c.quadraticCurveTo(5.2, -57.8, 4.8, -50); c.lineTo(6.2, -44.6); c.lineTo(-6.2, -44.6); c.closePath(); }
    if (o.bag) { c.moveTo(7.6 + wk, -23); c.roundRect(7.6 + wk, -23, 9, 8, 1); }
    if (o.scarfTail) { c.moveTo(1, -46); c.lineTo(3.6, -46); c.lineTo(5.4, -33.6); c.lineTo(3.4, -33); c.closePath(); }
  }
  function fig(x, y, h, o) {
    o = o || {};
    const s = h / 60;
    c.save(); c.translate(x, y); c.scale(s * (o.flip ? -1 : 1), s);
    if (o.a !== undefined) c.globalAlpha *= clamp(o.a);
    if (o.rim) { c.save(); c.translate(o.rimDx || 0.8, 0); c.fillStyle = o.rim; figPath(o); c.fill(); c.restore(); }
    c.fillStyle = o.col || '#0a0b0d';
    if (o.blur > 0.05) {   // «размытие» без фильтра: несколько полупрозрачных копий со сдвигом
      const b = o.blur * 1.4 / s, base = c.globalAlpha;
      c.globalAlpha = base * 0.3;
      [[-b, 0], [b, 0], [0, -b * 0.7], [0, b * 0.7]].forEach(function (d) { c.save(); c.translate(d[0], d[1]); figPath(o); c.fill(); c.restore(); });
      c.globalAlpha = base * 0.55;
    }
    figPath(o); c.fill();
    if (o.face) E(0, -51.2, 2.9, 3.7, o.face);
    if (o.eyes) { E(-1.3, -52, 0.55, 0.38, o.eyes); E(1.3, -52, 0.55, 0.38, o.eyes); }
    c.restore();
  }
  /* старик сидит на ступеньке и слушает часы (смотрит вправо) */
  function oldMan(x, y, s, now, o) {
    o = o || {};
    const coat = '#2a2622', rim = o.rim || 'rgba(255,196,130,0.55)';
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#16130f';
    c.beginPath(); c.moveTo(9, -7); c.lineTo(15.4, -7); c.lineTo(16.4, 9); c.lineTo(11.6, 9); c.closePath(); c.fill();
    P.rr(10.6, 7.6, 8.4, 2.6, 1, '#0c0a08');
    c.beginPath(); c.moveTo(-5, -1); c.lineTo(-5, -10.6); c.quadraticCurveTo(6, -13, 16.4, -9.6); c.lineTo(16.4, -3.4); c.quadraticCurveTo(6, -2, -5, -1); c.closePath();
    c.fillStyle = P.LG(0, -12, 0, -1, [0, '#3a342c', 1, '#1a1612']); c.fill();
    c.beginPath(); c.moveTo(-7, -3); c.bezierCurveTo(-10.4, -14, -9.4, -27, -3.4, -32); c.lineTo(5, -32); c.bezierCurveTo(8.4, -25, 7, -13, 6.6, -5); c.closePath();
    c.fillStyle = P.LG(-9, 0, 8, 0, [0, '#14110e', 0.6, coat, 1, '#3e362c']); c.fill();
    c.save(); c.strokeStyle = rim; c.lineWidth = 0.5; c.beginPath(); c.moveTo(5.6, -31); c.bezierCurveTo(8.6, -25, 7.2, -13, 6.8, -6); c.stroke(); c.restore();
    c.beginPath(); c.moveTo(0, -29); c.quadraticCurveTo(8, -20, 13, -11); c.lineTo(10.6, -9.6); c.quadraticCurveTo(5, -18, -2.2, -26); c.closePath(); c.fillStyle = '#25201b'; c.fill();
    E(13.4, -10.4, 1.7, 1.3, '#c8a486');
    E(1.4, -38.4, 4.9, 4.7, '#9a968c');
    E(3, -36.8, 3.6, 4.1, P.LG(0, -40, 6, -33, [0, '#a88466', 1, '#e0bc98']));
    P.poly([6.2, -38, 7.6, -35.6, 6, -35.4], '#d8b290');
    c.beginPath(); c.moveTo(1.6, -35.4); c.quadraticCurveTo(2.4, -29.6, 5.2, -29.8); c.quadraticCurveTo(7.2, -31.6, 6.6, -34.4); c.closePath(); c.fillStyle = '#dcd8d0'; c.fill();
    R(4.2, -38.2, 1.3, 0.5, '#2a1a10');
    c.beginPath(); c.moveTo(3.6, -30); c.quadraticCurveTo(10.6, -27, 10.4, -24); c.quadraticCurveTo(8.6, -30, 6.6, -36); c.lineTo(4.4, -35.6); c.quadraticCurveTo(6.6, -31, 3.4, -27.6); c.closePath(); c.fillStyle = '#2e2924'; c.fill();
    E(5.8, -36.8, 1.4, 1.6, '#c8a486');
    const tick = Math.floor(now / 1000) % 2 === 0 && (now % 1000) < 140;
    E(6.8, -36.6, 1.5, 1.5, P.brassG(5.3, 8.3)); E(6.8, -36.6, 1, 1, '#ece4cc');
    c.strokeStyle = 'rgba(220,190,110,0.7)'; c.lineWidth = 0.2; c.beginPath(); c.moveTo(6.8, -35.2); c.quadraticCurveTo(7.6, -32, 6.4, -29.6); c.stroke();
    if (tick) P.glow(7, -37, 3, '255,240,200', 0.5);
    c.restore();
  }
  /* перо, которым пишут */
  function quill(x, y, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(10, -8, 34, -30); c.quadraticCurveTo(30, -18, 8, -3); c.closePath();
    c.fillStyle = P.LG(0, 0, 30, -26, [0, '#cfc6b4', 0.5, '#f0ece2', 1, '#b8ae9a']); c.fill();
    c.strokeStyle = 'rgba(120,110,90,0.6)'; c.lineWidth = 0.25; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(14, -10, 34, -30); c.stroke();
    for (let k = 0; k < 10; k++) { c.beginPath(); c.moveTo(6 + k * 2.6, -4 - k * 2.4); c.lineTo(9 + k * 2.4, -2 - k * 1.8); c.stroke(); }
    R(-0.4, -0.4, 1.2, 1.2, '#1a1414');
    c.restore();
  }

  /* ---------- стол у окна с письмом (вступление, переправа) ---------- */
  let deskC = null;
  function deskBack() {
    if (deskC) return deskC;
    deskC = inL(P.mkL(), function () {
      P.vg(0, 0, W, 126, '#0d0b0a', '#1c1612'); P.tex(0, 0, W, 126, 0.5, 'overlay', 'mot', 1.4);
      const x = 28, y = 10, w = 176, h = 106;
      R(x - 6, y - 6, w + 12, h + 12, P.LG(0, y, 0, y + h, [0, '#2a1c12', 1, '#120a04']));
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      R(x, y, w, h, P.LG(0, y, 0, y + h, [0, '#08111c', 0.65, '#162434', 1, '#22303e']));
      const r = P.RNG(3);
      for (let i = 0; i < 14; i++) { const bx = x - 10 + i * 15, bh = 22 + r() * 34; R(bx, y + h - bh, 15, bh, 'rgba(5,9,14,0.9)'); P.poly([bx - 1, y + h - bh, bx + 7.5, y + h - bh - 5, bx + 16, y + h - bh], 'rgba(5,9,14,0.9)'); }
      P.blur(2.4, function () { for (let i = 0; i < 46; i++) { const lx = x + r() * w, ly = y + 46 + r() * 56, rr = 1.2 + r() * 3.6; E(lx, ly, rr, rr, 'rgba(' + (r() < 0.75 ? '255,180,90' : '200,220,255') + ',' + (0.18 + r() * 0.4).toFixed(2) + ')'); } });
      c.restore();
      R(x + w / 2 - 2, y, 4, h, '#1a120a'); R(x, y + h / 2 - 2, w, 4, '#1a120a');
      R(x - 9, y + h + 5, w + 18, 4, P.LG(0, y + h + 5, 0, y + h + 9, [0, '#4a3220', 1, '#140c06']));
      R(0, 124, W, 92, P.LG(0, 124, 0, 216, [0, '#2a1a0e', 1, '#0a0604'])); P.boards(0, 124, W, 92, 16, '#2a1a0e', 4);
      R(0, 124, W, 1.2, 'rgba(255,200,140,0.15)');
      P.rr(318, 158, 16, 12, 1, P.LG(318, 0, 334, 0, [0, '#0a0a14', 0.5, '#2a2a40', 1, '#050508'])); E(326, 158, 5, 1.6, '#16161e');
    });
    return deskC;
  }
  function envelope(x, y, w, h, rot, o) {
    c.save(); c.translate(x, y); c.rotate(rot);
    P.softRect(-w / 2 + 3, -h / 2 + 4, w, h, 3, 0.55);
    R(-w / 2, -h / 2, w, h, P.LG(-w / 2, -h / 2, w / 2, h / 2, [0, '#ece2c8', 1, '#b4a484']));
    P.tex(-w / 2, -h / 2, w, h, 0.3, 'multiply', 'mot', 0.5);
    c.strokeStyle = 'rgba(90,70,40,0.45)'; c.lineWidth = 0.35;
    c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(0, h * 0.1); c.lineTo(w / 2, -h / 2); c.stroke();
    c.beginPath(); c.moveTo(-w / 2, h / 2); c.lineTo(-w * 0.12, h * 0.02); c.moveTo(w / 2, h / 2); c.lineTo(w * 0.12, h * 0.02); c.stroke();
    if (o.ribbon) { R(-w / 2, -2, w, 4, '#0a0a0a'); }
    [[0, 0, 6.4], [3.6, 2.6, 2.4], [-4, 2.2, 2], [2, -4.6, 2.2]].forEach(function (b) { E(b[0], h * 0.1 + b[1], b[2], b[2] * 0.9, P.RG(b[0] - 1, h * 0.1 + b[1] - 1, 0, b[2] + 1, [0, '#c83424', 0.7, '#8a1a10', 1, '#5a0a06'])); });
    txt('М', 0, h * 0.1 + 2.4, 'bold 6px Georgia, serif', 'rgba(70,10,4,0.75)', 'center');
    (o.lines || []).forEach(function (l, i) { txt(l, -w * 0.44, -h / 2 + 8 + i * 5.6, 'italic 4.2px ' + HAND, 'rgba(40,28,20,0.85)'); });
    if (o.stamp) { c.save(); c.translate(w * 0.32, h * 0.3); c.rotate(-0.25); c.strokeStyle = 'rgba(40,60,120,0.6)'; c.lineWidth = 0.5; c.beginPath(); c.arc(0, 0, 6, 0, 6.28); c.stroke(); txt('МГЛОВ', 0, 1.4, 'bold 3px Georgia, serif', 'rgba(40,60,120,0.6)', 'center'); c.restore(); }
    c.restore();
  }
  function deskShot(t, k, now, o) {
    const z = lerp(o.z0 || 1, o.z1 || 1.1, ease(k));
    cam(z, lerp(192, o.fx || 200, ease(k)), lerp(108, o.fy || 140, ease(k)), function () {
      c.drawImage(deskBack(), 0, 0, W, H);
      rainStreaks(now, 0.18, 7, 50, 28, 10, 176, 106);
      glassDrops(28, 10, 176, 106, now, 11, 70);
      const gust = o.gust ? Math.max(0, Math.sin(seg(t, 4200, 6000) * Math.PI)) : 0;
      envelope(196, 168, 92, 50, -0.08, { lines: o.lines, ribbon: o.ribbon, stamp: true });
      quill(300, 170, -0.4);
      P.candleBody(268, 172, 26, 4.4, '#e8dcbc');
      E(268, 172, 8, 2, P.brassG(260, 276)); R(266.6, 168, 2.8, 4, P.brassG(266.6, 269.4));
      c.save(); c.translate(268, 145.6); c.rotate(gust * 0.7); P.flame(0, 0, 1.7 - gust * 0.6, now, 1, '255,160,70', 0.2); c.restore();
      P.glow(268, 140, 120, '255,160,80', 0.06 + (1 - gust) * 0.05);
    });
  }

  /* ---------- лист письма крупно; строки проступают, как будто их читают ---------- */
  function paperShot(t, k, now, o) {
    R(0, 0, W, H, '#0b0806');
    P.glow(360, 20, 260, '255,160,80', 0.1, 'source-over');
    const fl = 1 + Math.sin(now / 90) * 0.02 + Math.sin(now / 37) * 0.01;
    cam(1.02 + ease(k) * 0.05, 192, (o.fy || 80) + (o.pan || 0) * ease(k), function () {
      c.save(); c.translate(192, 104); c.rotate(-0.022);
      c.drawImage(paperSheet(!o.noHead), -160, -138, 316, 306);
      (o.lines || []).forEach(function (ln) {
        const p = seg(t, ln.at, ln.at + ln.s.length * 45);
        if (p <= 0) return;
        c.save(); c.font = (ln.big ? 'bold ' : 'italic ') + (ln.size || 11) + 'px ' + HAND;
        const tw = c.measureText(ln.s).width, x0 = ln.x === undefined ? -126 : ln.x;
        c.beginPath(); c.rect(x0 - 2, ln.y - 16, tw * p + 4, 24); c.clip();
        c.fillStyle = ln.col || 'rgba(28,20,40,0.9)'; c.fillText(ln.s, x0, ln.y); c.restore();
        if (ln.under) { const q = seg(t, ln.at + ln.s.length * 45 + 200, ln.at + ln.s.length * 45 + 900); if (q > 0) { c.strokeStyle = 'rgba(28,20,40,0.7)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x0, ln.y + 3); c.lineTo(x0 + tw * q, ln.y + 3 + Math.sin(q * 6) * 0.6); c.stroke(); } }
        ln._end = x0 + tw;
      });
      if (o.blot) {
        const b = o.blot, p = ease(seg(t, b.at, b.at + 3800)), L = o.lines[b.line], bx = (L._end || 0) + 2, by = L.y - 3;
        if (p > 0) {
          (function () {
            const r = P.RNG(5);
            P.puff(bx, by, 22 * p, 16 * p, '60,40,30', 0.25);
            for (let i = 0; i < 12; i++) { const a = r() * 6.28, d = r() * 10 * p; E(bx + Math.cos(a) * d, by + Math.sin(a) * d * 0.7, (3 + r() * 6) * p, (3 + r() * 5) * p, 'rgba(18,10,22,0.95)'); }
            for (let i = 0; i < 6; i++) { const a = r() * 6.28, l = (12 + r() * 22) * p; c.strokeStyle = 'rgba(18,10,22,0.9)'; c.lineWidth = 0.8 * p; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + Math.cos(a) * l * 0.5 + 3, by + Math.sin(a) * l * 0.5, bx + Math.cos(a) * l, by + Math.sin(a) * l * 0.7); c.stroke(); }
          })();
          // чернила ползут вверх и складываются в силуэт цилиндра
          const q = ease(seg(t, b.at + 1800, b.at + 4400));
          if (q > 0) {
            const r2 = P.RNG(9), ink = 'rgba(18,10,22,0.92)';
            for (let i = 0; i < 16; i++) { const f = i / 15; if (f > q) break; E(bx + (r2() - 0.5) * 1.2, by - 9 - f * 18, 5.4 + (r2() - 0.5) * 1.4, 1.6 + r2(), ink); }
            if (q > 0.15) E(bx, by - 8.6, 11 * Math.min(1, q * 1.6), 1.7, ink);
            if (q > 0.9) for (let i = 0; i < 5; i++) E(bx + (r2() - 0.5) * 22, by - 4 + r2() * 10, 0.5 + r2() * 0.8, 0.5 + r2() * 0.8, ink);
            c.save(); c.globalCompositeOperation = 'lighter'; E(bx - 3, by - 20 * q, 0.8, 4 * q, 'rgba(120,110,140,' + (0.18 * q).toFixed(3) + ')'); c.restore();
          }
        }
      }
      if (o.sign) { const p = seg(t, o.sign.at, o.sign.at + 900); txt(o.sign.s, 120, o.sign.y, 'italic 8px ' + HAND, 'rgba(28,20,40,0.85)', 'right', p); }
      c.restore();
    });
    R(0, 0, W, H, P.RG(330, 0, 60, 380, [0, 'rgba(20,10,0,0)', 1, 'rgba(20,10,0,0.5)']));
    P.glow(350, 10, 120 * fl, '255,170,90', 0.05);
  }
  /* лист бумаги рисуется один раз и дальше берётся готовым */
  const SHEET = {};
  function paperSheet(head) {
    const key = head ? 'h' : 'n'; if (SHEET[key]) return SHEET[key];
    const L = P.mkL(316, 306);
    return (SHEET[key] = inL(L, function () {
      c.translate(8, 8);
      P.softRect(4, 4, 300, 290, 6, 0.7);
      R(0, 0, 300, 290, P.LG(0, 0, 300, 290, [0, '#efe4c8', 0.6, '#e0d2b0', 1, '#c0ae88']));
      P.tex(0, 0, 300, 290, 0.35, 'multiply', 'mot', 0.7); P.tex(0, 0, 300, 290, 0.07, 'overlay');
      R(0, 134, 300, 0.6, 'rgba(120,100,70,0.35)'); R(0, 134.6, 300, 1.2, 'rgba(255,255,255,0.22)');
      if (head) { txt('НОТАРИАЛЬНАЯ КОНТОРА г. МГЛОВА', 152, 26, 'bold 5px Georgia, serif', 'rgba(60,40,30,0.7)', 'center'); R(92, 30, 120, 0.4, 'rgba(60,40,30,0.5)'); }
    }));
  }

  /* ---------- вокзал: поезд уходит, на перроне остаёшься ты ---------- */
  function carriage(x, y, w, h, lit, now) {
    P.rr(x, y - h, w, h - 4, 1.4, P.LG(0, y - h, 0, y, [0, '#2a3a32', 0.5, '#1a2620', 1, '#0a100c']));
    P.rr(x - 1, y - h - 2.4, w + 2, 3.4, 1.6, '#141a18');
    for (let k = 0; k < Math.floor((w - 6) / 9); k++) {
      const wx = x + 5 + k * 9, l = lit && hsh(k + x * 0.1) > 0.25;
      R(wx, y - h + 5, 6, 5.4, l ? 'rgba(255,196,120,0.95)' : '#0a0e0c');
      if (l) { P.glow(wx + 3, y - h + 7.6, 9, '255,170,80', 0.18); if (hsh(k * 3.1 + x) > 0.6) R(wx + 2, y - h + 6.4, 2.4, 4, 'rgba(40,24,12,0.8)'); }
    }
    R(x + 1, y - 7, w - 2, 1, 'rgba(0,0,0,0.6)');
    [x + 8, x + 16, x + w - 16, x + w - 8].forEach(function (wx) { E(wx, y - 2, 3, 3, '#0a0a0a'); E(wx, y - 2, 1.2, 1.2, '#2a2a2a'); });
  }
  function loco(x, y, now) {
    R(x - 4, y - 21, 30, 13, P.LG(0, y - 21, 0, y - 8, [0, '#3a3a3e', 0.4, '#1a1a1e', 1, '#08080a']));
    E(x + 26, y - 14.5, 2, 6.5, '#1a1a1e');
    R(x - 18, y - 30, 16, 22, '#121416'); R(x - 20, y - 32, 20, 3, '#1a1c1e'); R(x - 15, y - 26, 8, 6, 'rgba(255,170,80,0.85)');
    R(x + 16, y - 30, 4, 9, '#0e0e10'); R(x + 14.6, y - 31.4, 6.8, 2, '#1a1a1c'); R(x + 5, y - 25, 4, 4, '#1a1a1c');
    P.poly([x + 26, y - 8, x + 34, y - 2, x + 26, y - 2], '#151515');
    E(x + 28, y - 18, 1.8, 1.8, '#ffe6b0'); P.glow(x + 28, y - 18, 30, '255,220,150', 0.2);
    [x - 12, x + 2, x + 14].forEach(function (wx, i) { E(wx, y - 4, i ? 4 : 3, i ? 4 : 3, '#0a0a0a'); E(wx, y - 4, 1.4, 1.4, '#3a3a3a'); });
  }
  function stationShot(t, k, now, o) {
    sky([0, '#060a10', 0.6, '#141c26', 1, '#262c32'], 150);
    stars(4, 30, 40, now, 0.6);
    town(112, '#10161c', 5, { lit: 0.18, minH: 8, varH: 14, minW: 10 });
    P.fog(60, 70, now, 3, 0.55, '150,160,170', 2);
    // вокзал слева
    R(-6, 52, 128, 98, P.LG(0, 52, 0, 150, [0, '#2a241e', 1, '#141210'])); P.tex(-6, 52, 128, 98, 0.4, 'overlay', 'mot', 1);
    P.poly([-12, 54, 58, 30, 128, 54], '#121416');
    [12, 44, 78].forEach(function (x, i) { R(x, 78, 16, 26, '#0c0a08'); R(x + 1.4, 79.4, 13.2, 23.2, i === 1 ? 'rgba(255,180,100,0.75)' : 'rgba(255,180,100,0.35)'); R(x + 7.4, 79, 1.2, 25, '#0c0a08'); R(x, 90, 16, 1.2, '#0c0a08'); });
    P.glow(52, 92, 30, '255,170,80', 0.12);
    P.rr(26, 58, 54, 12, 1, P.LG(0, 58, 0, 70, [0, '#3a2a1a', 1, '#1a1008'])); txt('МГЛОВ', 53, 67.4, 'bold 8.4px Georgia, serif', '#d8c08a', 'center');
    P.face(100, 64, 5.6, { wood: true });
    // навес над перроном
    R(0, 14, W, 5, '#0c0e10'); for (let x = 6; x < W; x += 6) P.poly([x - 3, 19, x, 23, x + 3, 19], '#0c0e10');
    [130, 250, 370].forEach(function (x) { R(x - 1.4, 19, 2.8, 131, P.LG(x - 1.4, 0, x + 1.4, 0, [0, '#08090a', 0.5, '#2a2c30', 1, '#060708'])); });
    // рельсы
    R(0, 140, W, 10, '#0c0c0e'); R(0, 141.4, W, 1, '#4a4c50'); R(0, 147, W, 1, '#3a3c40');
    for (let x = -4; x < W; x += 9) R(x, 142.4, 5, 4.6, '#1a140e');
    // поезд уходит вправо
    const off = -60 + ease(seg(t, 300, 9500)) * 520;
    for (let i = 0; i < 4; i++) carriage(off - 96 * (i + 1), 146, 92, 34, true, now);
    loco(off + 10, 146, now);
    puffs(now, off + 26, 110, 10, 2600, -90, -30, '190,190,195', 9, 3);
    // перрон
    R(0, 150, W, 66, P.LG(0, 150, 0, 216, [0, '#2a2c2e', 1, '#0e0f10'])); R(0, 150, W, 1.6, '#5a5c5e');
    for (let x = -8; x < W; x += 22) { c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.3; c.beginPath(); c.moveTo(x, 152); c.lineTo(x - 30, 216); c.stroke(); }
    // фонарь и его лужа
    R(248, 74, 2.4, 76, '#121416'); P.poly([244, 70, 254, 70, 252.6, 80, 245.4, 80], 'rgba(255,214,150,0.6)'); R(243, 68, 12, 2.4, '#121416');
    P.glow(249, 75, 70, '255,200,130', 0.16); E(249, 180, 40, 6, 'rgba(255,200,130,0.08)');
    P.shaft(249, 80, 8, 249, 196, 70, '255,210,150', 0.07, 2);
    // фигура с чемоданом
    fig(222, 196, 44, { bag: true, scarfTail: true, rim: 'rgba(255,200,140,0.55)', rimDx: 0.9, col: '#0b0c0e' });
    P.fog(130, 90, now, 6, 0.4, '160,168,175', 3);
    puffs(now + 1300, off - 140, 128, 8, 3600, -60, -16, '170,170,175', 12, 9);
  }

  /* ---------- город над рекой: туман поднимается, ставни закрываются ---------- */
  function townShot(t, k, now) {
    sky([0, '#0a1224', 0.5, '#24283c', 0.82, '#5a3e48', 1, '#7a4e3e'], 160);
    stars(8, 40, 60, now, 0.7);
    P.glow(300, 150, 120, '230,130,80', 0.12, 'source-over');
    // холм
    c.beginPath(); c.moveTo(0, 150); c.quadraticCurveTo(120, 96, 220, 110); c.quadraticCurveTo(300, 118, 384, 130); c.lineTo(384, 170); c.lineTo(0, 170); c.closePath(); c.fillStyle = '#0c1018'; c.fill();
    churchSil(150, 112, 0.9, '#0c1018', '#3a3020'); tower(236, 118, 0.7, '#0c1018');
    const p = seg(t, 1200, 8800);
    const off = function (i) { return hsh(i * 1.37) < p * 1.05; };
    town(124, '#0e121a', 21, { x0: -10, x1: 120, lit: 0.6, minH: 12, varH: 12, off: off, glow: 0.12 });
    town(132, '#0e121a', 22, { x0: 170, x1: 230, lit: 0.6, minH: 10, varH: 10, off: off, glow: 0.12 });
    town(140, '#0e121a', 23, { x0: 250, x1: 394, lit: 0.6, minH: 12, varH: 14, off: off, glow: 0.12 });
    town(162, '#080b10', 24, { lit: 0.5, minH: 14, varH: 12, minW: 16, off: function (i) { return hsh(i * 2.11 + 7) < p * 1.05; }, glow: 0.14 });
    // река
    R(0, 166, W, 50, P.LG(0, 166, 0, 216, [0, '#1a2230', 1, '#06080c']));
    for (let i = 0; i < 40; i++) { const y = 168 + (i * 7.7) % 46, x = (i * 53 + now / 60) % (W + 30) - 15; P.line(x, y, x + 8 + i % 7, y, 'rgba(180,170,180,0.07)', 0.3); }
    // туман поднимается от воды
    const fy = lerp(200, 104, ease(k));
    P.fog(fy, 90, now, 5, 0.3 + ease(k) * 0.45, '170,175,185', 4);
    P.fog(fy + 30, 80, now + 4000, 9, 0.35 + ease(k) * 0.3, '160,165,178', 5);
    flock(now - 1000, -40, 70, 7, 26, -2, 3, '#0a0a10', 1.1);
  }

  /* ---------- фасад лавки «Последний час» ---------- */
  function shopFront(t, now, o) {
    const day = o.day || 0, x0 = 96, x1 = 288, top = 30, base = 178;
    const mixc = function (a, b) { return P.mix(a, b, day); };
    // соседние дома
    [[-24, x0 - 3, 48, '#1c1e22', '#7a7064', 3], [x1 + 3, W + 24, 40, '#201e1c', '#8a7c66', 4]].forEach(function (hs) {
      R(hs[0], hs[2], hs[1] - hs[0], base - hs[2], P.LG(0, hs[2], 0, base, [0, mixc(hs[3], hs[4]), 1, mixc('#0a0a0c', '#4a443a')]));
      P.tex(hs[0], hs[2], hs[1] - hs[0], base - hs[2], 0.4, 'overlay', 'mot', 1.2);
      for (let r2 = 0; r2 < 2; r2++) for (let k2 = 0; k2 < 2; k2++) {
        const wx = hs[0] + 14 + k2 * 40, wy = hs[2] + 14 + r2 * 50; if (wx > hs[1] - 18) continue;
        R(wx - 2, wy - 2, 22, 32, mixc('#0e0c0a', '#4a3e30'));
        const shut = o.nshut === undefined ? (day > 0.5 ? 0 : 1) : o.nshut;
        R(wx, wy, 18, 28, shut ? mixc('#24180e', '#6a4a2a') : mixc('#121820', '#9ab0c0'));
        if (shut) for (let j = 0; j < 7; j++) R(wx, wy + 2 + j * 4, 18, 0.6, 'rgba(0,0,0,0.35)');
      }
    });
    // фасад
    R(x0, top, x1 - x0, base - top, P.LG(0, top, 0, base, [0, mixc('#2e2e2a', '#a89c84'), 1, mixc('#121212', '#5a5242')]));
    P.tex(x0, top, x1 - x0, base - top, 0.45, 'overlay', 'mot', 1.2);
    P.poly([x0 - 8, top - 3, x0 + 24, top - 26, x1 - 24, top - 26, x1 + 8, top - 3], mixc('#121416', '#4a4440'));
    R(x0 - 6, top - 4, x1 - x0 + 12, 5, P.LG(0, top - 4, 0, top + 1, [0, mixc('#3a3632', '#c0b49c'), 1, mixc('#0e0e0e', '#4a4236')]));
    R(x0 + 140, top - 36, 10, 14, mixc('#141414', '#5a504a'));
    // окна второго этажа
    [x0 + 22, x0 + 84, x0 + 146].forEach(function (wx, i) {
      R(wx - 3, top + 10, 30, 38, mixc('#16120e', '#6a5a44'));
      R(wx, top + 13, 24, 32, o.upLit && i === 1 ? 'rgba(255,180,100,0.7)' : mixc('#0e141a', '#a8bccc'));
      R(wx + 11.4, top + 13, 1.2, 32, mixc('#16120e', '#6a5a44')); R(wx, top + 28, 24, 1.2, mixc('#16120e', '#6a5a44'));
      R(wx - 4, top + 47, 32, 2.4, mixc('#2a2620', '#c8bca4'));
    });
    // вывеска
    const sy = 84;
    P.rr(x0 + 8, sy, x1 - x0 - 16, 17, 1.2, P.LG(0, sy, 0, sy + 17, [0, mixc('#2a1a0e', '#5a3a1e'), 1, mixc('#140a04', '#3a2410')]));
    c.strokeStyle = P.goldG(x0, sy, x1, sy + 17); c.lineWidth = 0.6; c.strokeRect(x0 + 10, sy + 2, x1 - x0 - 20, 13);
    const signs = o.sign || ['ПОСЛЕДНИЙ ЧАС'];
    if (o.sign2) { const q = clamp(o.sign2); c.save(); c.globalAlpha = 1 - q; txt(signs[0], 192, sy + 12.2, 'bold 10px Georgia, serif', '#d8b868', 'center'); c.restore(); txt(o.sign2text, 192, sy + 11.6, 'bold 7px Georgia, serif', '#e8d098', 'center', q); }
    else txt(signs[0], 192, sy + 12.2, 'bold 10px Georgia, serif', '#d8b868', 'center');
    // витрина
    const vx = x0 + 12, vy = 108, vw = 96, vh = 54;
    R(vx - 4, vy - 4, vw + 8, vh + 8, mixc('#1a1008', '#4a3420'));
    c.save(); c.beginPath(); c.rect(vx, vy, vw, vh); c.clip();
    if (o.lit) {
      R(vx, vy, vw, vh, P.LG(0, vy, 0, vy + vh, [0, '#6a3a18', 0.5, '#a8662a', 1, '#5a2e10']));
      P.glow(vx + 24, vy + 40, 40, '255,200,120', 0.4);
      [vy + 18, vy + 36].forEach(function (yy) { R(vx, yy, vw, 1.6, '#2a1608'); for (let j = 0; j < 9; j++) R(vx + 4 + j * 10, yy - 6 - (j % 3), 5, 6 + (j % 3), 'rgba(40,20,8,0.75)'); });
      E(vx + 76, vy + 26, 7, 11, 'rgba(30,16,6,0.85)'); E(vx + 76, vy + 26, 5.4, 9.4, o.mirrorCol || 'rgba(160,140,110,0.5)');
    } else {
      R(vx, vy, vw, vh, P.LG(0, vy, 0, vy + vh, [0, mixc('#0c1014', '#7a8a96'), 1, mixc('#06080a', '#4a5660')]));
      if (day > 0.3) { E(vx + 76, vy + 26, 7, 11, 'rgba(60,40,20,0.6)'); E(vx + 76, vy + 26, 5.4, 9.4, 'rgba(230,230,220,' + (0.5 * day).toFixed(2) + ')'); }
    }
    c.save(); c.globalCompositeOperation = 'lighter'; P.poly([vx + 6, vy, vx + 20, vy, vx + 4, vy + vh, vx - 10, vy + vh], 'rgba(255,255,255,0.05)'); c.restore();
    const sh = clamp(o.shut || 0);
    if (sh > 0) [0, 1].forEach(function (s) { const w = vw / 2 * sh, x = s ? vx + vw - w : vx; R(x, vy, w, vh, mixc('#2a1a0e', '#6a4a2a')); for (let j = 0; j < 9; j++) R(x, vy + 2 + j * 6, w, 0.8, 'rgba(0,0,0,0.4)'); });
    c.restore();
    R(vx + vw / 2 - 0.8, vy, 1.6, vh, mixc('#1a1008', '#4a3420'));
    // дверь
    const dx = x0 + 128, dw = 40, dy = 106;
    R(dx - 4, dy - 4, dw + 8, base - dy - 2, mixc('#140c06', '#3a2814'));
    R(dx, dy, dw, base - dy - 6, P.LG(dx, 0, dx + dw, 0, [0, mixc('#2a1a0e', '#6a4424'), 0.5, mixc('#3a2414', '#7a5030'), 1, mixc('#1a0e06', '#4a2e16')]));
    R(dx + 5, dy + 5, dw - 10, 24, o.lit ? 'rgba(255,190,110,0.8)' : mixc('#0a0e12', '#8a9aa6'));
    R(dx + dw / 2 - 0.6, dy + 5, 1.2, 24, mixc('#2a1a0e', '#6a4424'));
    P.rr(dx + 5, dy + 34, dw - 10, 28, 1, 'rgba(0,0,0,0.25)'); E(dx + dw - 7, dy + 40, 1.4, 1.4, P.brassG(dx + dw - 8.4, dx + dw - 5.6));
    if (o.lock) { R(dx + dw - 9, dy + 36.6, 4, 1, '#3a3a3e'); P.rr(dx + dw - 10, dy + 39, 6, 5, 1, P.LG(0, dy + 39, 0, dy + 44, [0, '#5a5a60', 1, '#2a2a2e'])); c.strokeStyle = '#4a4a50'; c.lineWidth = 0.7; c.beginPath(); c.arc(dx + dw - 7, dy + 39, 2, Math.PI, 0); c.stroke(); }
    // колокольчик над дверью (снаружи — кронштейн)
    R(dx + dw / 2 - 6, dy - 7, 12, 1, '#1a1a1a'); E(dx + dw / 2 + 5, dy - 4, 1.8, 2, P.brassG(dx + dw / 2 + 3, dx + dw / 2 + 7));
    // ступени
    R(dx - 8, base - 6, dw + 16, 3, mixc('#2a2a2a', '#8a8478')); R(dx - 12, base - 3, dw + 24, 3, mixc('#1e1e1e', '#7a7468'));
    // фонарь у двери
    const lx = x1 - 12;
    R(lx - 4, 102, 6, 1.2, '#121212'); R(lx - 4, 102, 1.2, 6, '#121212');
    P.poly([lx - 3, 104, lx + 3, 104, lx + 2.4, 113, lx - 2.4, 113], day > 0.5 ? 'rgba(200,210,220,0.3)' : 'rgba(255,200,120,0.55)');
    R(lx - 3.6, 102.6, 7.2, 1.6, '#121212'); R(lx - 3, 113, 6, 1.2, '#121212');
    // тротуар и мостовая
    R(-10, base, W + 20, 6, mixc('#1e2022', '#8a867c')); R(-10, base, W + 20, 1, mixc('#3a3c3e', '#b0aaa0'));
    P.cobbles(base + 6, 216, day > 0.5 ? '#5a5650' : '#1a1c1e', 9);
    if (o.lit) { P.glow(vx + vw / 2, base + 10, 70, '255,170,80', 0.12); E(vx + vw / 2, base + 16, 50, 4, 'rgba(255,170,80,0.08)'); }
    if (day < 0.5) { P.glow(lx, 108, 50, '255,190,110', 0.22 * (1 - day * 2)); flameAt(lx, 110.6, now, 0.7); }
  }
  function flameAt(x, y, now, s) { P.flame(x, y, s, now, x * 0.1, '255,170,80', 0.12); }

  /* ---------- лавка изнутри ---------- */
  const SHOPIN = {};
  function shopInBack(light) {
    if (SHOPIN[light]) return SHOPIN[light];
    const day = light === 'dawn' ? 1 : 0;
    return (SHOPIN[light] = inL(P.mkL(), function () {
      P.vg(0, 0, W, 112, day ? '#1c2a24' : '#0e1714', day ? '#2e3e36' : '#1c2925');
      c.fillStyle = day ? 'rgba(110,140,120,0.16)' : 'rgba(80,110,95,0.14)';
      for (let y = 6, row = 0; y < 112; y += 16, row++) for (let x = (row % 2) * 10; x < W + 10; x += 20) {
        c.beginPath(); c.moveTo(x, y - 6); c.bezierCurveTo(x + 4, y - 2, x + 4, y + 2, x, y + 5); c.bezierCurveTo(x - 4, y + 2, x - 4, y - 2, x, y - 6); c.fill();
        c.beginPath(); c.ellipse(x - 4, y + 3, 1.8, 0.8, 0.6, 0, 6.28); c.fill(); c.beginPath(); c.ellipse(x + 4, y + 3, 1.8, 0.8, -0.6, 0, 6.28); c.fill();
      }
      P.tex(0, 0, W, 112, 0.5, 'overlay', 'mot', 1.4);
      R(132, 18, 10, 7, 'rgba(70,64,52,0.8)'); P.poly([142, 18, 146, 18, 142, 25], 'rgba(30,40,36,0.9)');
      R(0, 108, W, 50, P.LG(0, 108, 0, 158, [0, '#3a2414', 1, '#140a04']));
      for (let x = -8; x < W; x += 40) { P.rr(x + 4, 114, 32, 20, 0.8, 'rgba(0,0,0,0.35)'); P.rr(x + 4.5, 114.5, 31, 19, 0.8, P.LG(0, 114, 0, 134, [0, '#2a180c', 1, '#3a2414'])); }
      R(0, 106, W, 3, P.LG(0, 106, 0, 109, [0, '#6a4a2a', 1, '#2a180a']));
      // окно слева
      const wx = 16, wy = 22, ww = 68, wh = 74;
      R(wx - 4, wy - 4, ww + 8, wh + 8, '#1a1008');
      c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip();
      R(wx, wy, ww, wh, day ? P.LG(0, wy, 0, wy + wh, [0, '#f0c888', 0.6, '#d89a5a', 1, '#a86a3a']) : P.LG(0, wy, 0, wy + wh, [0, '#0e1620', 1, '#1a2632']));
      for (let i = 0; i < 6; i++) R(wx - 4 + i * 13, wy + wh - 20 - (i * 7) % 16, 12, 40, day ? 'rgba(120,70,40,0.45)' : 'rgba(5,8,12,0.9)');
      P.fog(wy + 20, 60, 0, 0, day ? 0.6 : 0.7, day ? '255,230,200' : '150,165,180', 6);
      c.restore();
      R(wx + ww / 2 - 1, wy, 2, wh, '#1a1008'); R(wx, wy + wh / 2 - 1, ww, 2, '#1a1008');
      R(wx - 6, wy + wh + 3, ww + 12, 3, '#3a2414');
      // часы
      R(100, 14, 28, 96, P.LG(100, 0, 128, 0, [0, '#1a0a02', 0.4, '#4a2a12', 1, '#120602'])); P.poly([98, 14, 114, 6, 130, 14], '#3a1e0c');
      P.face(114, 30, 9, { paper: '#e8dcbc' }); R(104, 44, 20, 54, '#0c0602'); R(113.6, 46, 0.8, 34, P.brassG(113, 115)); E(114, 82, 4, 4, P.brassG(110, 118));
      // дверь
      R(152, 18, 80, 3, '#3a2414');
      R(156, 21, 72, 92, P.LG(156, 0, 228, 0, [0, '#1a0e06', 0.5, '#2e1c0e', 1, '#140a04']));
      c.save(); c.beginPath(); c.rect(164, 28, 56, 34); c.clip();
      R(164, 28, 56, 34, day ? P.LG(0, 28, 0, 62, [0, '#e8c898', 1, '#b88a5a']) : P.LG(0, 28, 0, 62, [0, '#101820', 1, '#1a2430']));
      P.fog(28, 40, 0, 0, 0.7, day ? '255,236,210' : '150,165,180', 7);
      c.restore();
      R(191, 28, 2, 34, '#1a0e06'); R(164, 44, 56, 1.6, '#1a0e06');
      P.rr(166, 68, 52, 38, 1, 'rgba(0,0,0,0.25)'); E(222, 80, 1.4, 1.4, P.brassG(220.6, 223.4));
      // зеркало
      E(276, 58, 21, 33, P.goldG(255, 25, 297, 91)); E(276, 58, 18.6, 30.4, '#2a1a08');
      E(276, 58, 17, 28.6, day ? P.LG(260, 30, 292, 86, [0, '#9aa8a4', 1, '#4a5652']) : P.LG(260, 30, 292, 86, [0, '#3a4644', 1, '#141c1a']));
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.2832; E(276 + Math.cos(a) * 20, 58 + Math.sin(a) * 32, 1.4, 1.4, P.goldG(270, 20, 282, 96)); }
      // полки
      R(302, 14, 80, 100, P.LG(302, 0, 382, 0, [0, '#1a0e06', 0.5, '#2a180c', 1, '#140a04']));
      const rr = P.RNG(17);
      [44, 76, 108].forEach(function (y) {
        R(302, y, 80, 2.4, P.LG(0, y, 0, y + 2.4, [0, '#6a4a2a', 1, '#2a180a']));
        let x = 306;
        while (x < 374) {
          const kind = rr(), w = 6 + rr() * 6;
          if (kind < 0.3) P.bottle(x + w / 2, y, w * 0.6, 12 + rr() * 6, ['#2a4a3a', '#5a2a1a', '#3a3a5a'][Math.floor(rr() * 3)]);
          else if (kind < 0.55) { for (let j = 0; j < 3; j++) P.rr(x + j * 2.4, y - 11 - (j % 2), 2.2, 11 + (j % 2), 0.3, ['#5a1a14', '#1a3a2a', '#3a2a5a'][j]); }
          else if (kind < 0.75) { E(x + w / 2, y - 5, 4.6, 4.6, P.brassG(x, x + w)); E(x + w / 2, y - 5, 3.4, 3.4, '#e8e0c8'); P.hands(x + w / 2, y - 5, 3.4, 2.75, 45); }
          else P.rr(x, y - 7, w, 7, 0.8, P.LG(0, y - 7, 0, y, [0, '#6a3a1a', 1, '#2a140a']));
          x += w + 2;
        }
      });
      // пол
      R(0, 158, W, 58, P.LG(0, 158, 0, 216, [0, '#2a1a0c', 1, '#0a0604'])); P.boards(0, 158, W, 58, 5, '#2a1a0c', 19);
    }));
  }
  function counter(now, o) {
    R(0, 170, W, 46, P.LG(0, 170, 0, 216, [0, '#2a1608', 1, '#0a0602'])); P.boards(0, 170, W, 46, 6, '#2a1608', 23, true);
    R(0, 164, W, 6, P.LG(0, 164, 0, 170, [0, '#7a5434', 0.3, '#4a2e18', 1, '#1a0e06'])); R(0, 164.2, W, 0.6, 'rgba(255,214,170,0.35)');
    if (o.ledger !== false) { P.poly([110, 166, 132, 156, 176, 156, 196, 166], '#d8ccaa'); P.poly([110, 166, 196, 166, 196, 168, 110, 168], '#5a1a14'); R(152.6, 156, 0.6, 10, 'rgba(0,0,0,0.3)'); }
    // керосиновая лампа
    const lx = 60;
    E(lx, 165, 9, 2, P.brassG(lx - 9, lx + 9)); c.beginPath(); c.ellipse(lx, 158, 7, 6, 0, 0, 6.28); c.fillStyle = 'rgba(120,150,140,0.45)'; c.fill();
    R(lx - 3, 140, 6, 12, 'rgba(220,230,230,0.25)'); R(lx - 3.4, 151, 6.8, 2, P.brassG(lx - 3.4, lx + 3.4));
    if (o.lamp) { P.flame(lx, 150, 1.3 * (o.lampK === undefined ? 1 : o.lampK), now, 2, '255,170,80', 0.2 * (o.lampK === undefined ? 1 : o.lampK)); }
    else if (o.smoke) puffs(now, lx, 138, 6, 3000, 6, -30, '150,150,150', 2, 4);
  }
  function shopIn(t, k, now, o) {
    c.drawImage(shopInBack(o.light), 0, 0, W, H);
    if (o.light === 'dawn') {
      P.shaft(50, 30, 60, 170, 216, 150, '255,210,150', 0.14, 3);
      P.motes(now, 30, 40, 160, 170, 50, 8, '255,230,190', 0.6, [20, 30, 84, 30, 250, 216, 90, 216]);
    }
    if (o.fog) {
      c.save(); c.beginPath(); c.rect(0, 0, W, 164); c.clip();
      for (let i = 0; i < 4; i++) { const p = ((now / 7000 + i / 4) % 1), x = lerp(40 + i * 60, 192, p), y = lerp(150, 60, p), a = Math.sin(p * Math.PI) * 0.6 * o.fog; P.puff(x, y, 46 * (1 - p * 0.6), 20 * (1 - p * 0.5), '200,205,210', a); }
      c.restore();
    }
    if (o.mirror) { c.save(); c.beginPath(); c.ellipse(276, 58, 17, 28.6, 0, 0, 6.28); c.clip(); o.mirror(t, k, now); c.restore(); }
    if (o.extra) o.extra(t, k, now);
    if (o.counter !== false) counter(now, o);
    if (!o.lamp && o.light !== 'dawn') return;
    if (o.lamp) { P.glow(60, 146, 150, '255,170,80', 0.12 * (o.lampK === undefined ? 1 : o.lampK)); }
  }

  /* ---------- колокол ---------- */
  function bellShape(x, y, r, ang, col) {
    c.save(); c.translate(x, y); c.rotate(ang);
    // плечи круглые, талия, раструб к краю
    c.beginPath(); c.moveTo(-r * 0.36, 0);
    c.bezierCurveTo(-r * 0.52, 0, -r * 0.56, r * 0.2, -r * 0.56, r * 0.45);
    c.bezierCurveTo(-r * 0.56, r * 0.82, -r * 0.78, r * 1.04, -r, r * 1.16);
    c.lineTo(r, r * 1.16);
    c.bezierCurveTo(r * 0.78, r * 1.04, r * 0.56, r * 0.82, r * 0.56, r * 0.45);
    c.bezierCurveTo(r * 0.56, r * 0.2, r * 0.52, 0, r * 0.36, 0); c.closePath();
    c.fillStyle = col || P.LG(-r, 0, r, 0, [0, '#2a1a0a', 0.25, '#7a5a2a', 0.42, '#e0c080', 0.55, '#a07a3a', 0.8, '#4a3214', 1, '#1a0e04']); c.fill();
    P.ell(0, r * 1.16, r, r * 0.09, '#3a2a14'); P.ell(0, r * 1.13, r * 0.96, r * 0.06, 'rgba(255,220,150,0.25)');
    [0.5, 0.62].forEach(function (k) { c.fillStyle = 'rgba(40,24,8,0.4)'; c.fillRect(-r * (0.56 + (k - 0.45) * 0.4), r * k, r * (1.12 + (k - 0.45) * 0.8), r * 0.03); });
    c.beginPath(); c.arc(0, -r * 0.08, r * 0.16, Math.PI, 0); c.strokeStyle = '#3a2a14'; c.lineWidth = r * 0.06; c.stroke();
    c.restore();
  }
  function belfry(t, k, now, o) {
    // небо рассвета (с запасом: камера здесь отъезжает)
    R(-220, -170, W + 440, H + 340, P.LG(0, -170, 0, H + 60, [0, '#1a2440', 0.4, '#3a4a6a', 0.65, '#c88a6a', 0.85, '#f0c080', 1, '#f8d8a0']));
    P.glow(320, 230, 220, '255,220,160', 0.35, 'source-over');
    flock(now, 120 + (o.birds || 0), 60, 9, 30, -10, 6, 'rgba(30,24,30,0.8)', 1.2);
    town(300, 'rgba(60,44,50,0.85)', 51, { x0: -220, x1: 620, lit: 0.1, minH: 14, varH: 20, minW: 18 });
    // башня
    const tx = 192, top = 40;
    R(tx - 58, top, 116, 330 - top, P.LG(tx - 58, 0, tx + 58, 0, [0, '#8a7c70', 0.4, '#e0d4c4', 0.7, '#c8b8a4', 1, '#6a5c50']));
    P.tex(tx - 58, top, 116, 330 - top, 0.4, 'overlay', 'mot', 1.2);
    [-46, 46].forEach(function (d) { R(tx + d - 10, 150, 20, 2.4, 'rgba(0,0,0,0.25)'); P.arch(tx + d - 7, 170, 14, 30); c.fillStyle = '#2a201a'; c.fill(); });
    R(tx - 64, 140, 128, 6, P.LG(0, 140, 0, 146, [0, '#f0e6d8', 1, '#8a7c6c']));
    R(tx - 64, top - 8, 128, 9, P.LG(0, top - 8, 0, top + 1, [0, '#f0e6d8', 1, '#8a7c6c']));
    // барабан и луковица
    R(tx - 26, top - 34, 52, 26, P.LG(tx - 26, 0, tx + 26, 0, [0, '#8a7c70', 0.4, '#e0d4c4', 1, '#6a5c50']));
    onion(tx, top - 34, 46, 44, P.goldG(tx - 23, top - 78, tx + 23, top - 34));
    P.cross8(tx, top - 80, 18, P.goldG(tx - 5, top - 98, tx + 5, top - 80), 1.6);
    // арка с колоколом
    P.arch(tx - 36, top + 14, 72, 96); c.fillStyle = '#1a1410'; c.fill();
    c.save(); P.arch(tx - 36, top + 14, 72, 96); c.clip();
    R(tx - 36, top + 14, 72, 96, P.LG(0, top + 14, 0, top + 110, [0, '#3a3040', 1, '#6a4a40']));
    R(tx - 36, top + 30, 72, 3, '#2a1e14');
    const sw = o.swing ? Math.sin(now / 700) * 0.42 * o.swing : 0;
    bellShape(tx, top + 33, 22, sw);
    c.save(); c.translate(tx, top + 33); c.rotate(sw * 0.4 - sw); R(-1, 18, 2, 14, '#1a1008'); E(0, 33, 3, 3, '#2a1a0a'); c.restore();
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 0.6; P.arch(tx - 36, top + 14, 72, 96); c.stroke();
    [-46, 46].forEach(function (d) { P.arch(tx + d - 7, top + 22, 14, 34); c.fillStyle = '#1a1410'; c.fill(); });
    // волны звона
    if (o.swing) for (let i = 0; i < 4; i++) { const p = ((now / 2400 + i / 4) % 1), r = 30 + p * 240; c.strokeStyle = 'rgba(255,240,210,' + (0.22 * (1 - p)).toFixed(3) + ')'; c.lineWidth = 1.4 * (1 - p) + 0.3; c.beginPath(); c.arc(tx, top + 50, r, 0, 6.28); c.stroke(); }
  }
  /* туман сползает вниз, к реке (рисуется уже без камеры) */
  function fogDown(k, now) {
    const fy = lerp(120, 190, ease(k));
    P.fog(fy, 100, now, 6, 0.8 - ease(k) * 0.25, '235,220,215', 4);
    P.fog(fy + 24, 90, now + 3000, 10, 0.75, '230,215,210', 5);
  }

  /* ---------- книга ---------- */
  function page(x, y, w, h, side, fn) {
    c.save(); c.beginPath();
    c.moveTo(x, y + 1.5); c.quadraticCurveTo(x + w / 2, y - 1, x + w, y + 1.5); c.lineTo(x + w, y + h - 1.5); c.quadraticCurveTo(x + w / 2, y + h + 1, x, y + h - 1.5); c.closePath();
    c.fillStyle = P.LG(x, 0, x + w, 0, side < 0 ? [0, '#e4d8b8', 0.8, '#d4c6a2', 1, '#8a7a5a'] : [0, '#8a7a5a', 0.2, '#d4c6a2', 1, '#e4d8b8']); c.fill();
    c.clip(); P.tex(x, y, w, h, 0.25, 'multiply', 'mot', 0.6);
    if (fn) { c.translate(x, y); fn(w, h); }
    c.restore();
  }
  function book(cx, cy, w, h, o) {
    o = o || {};
    const pw = w / 2, cl = clamp(o.close || 0), cov = o.cover || '#2a0e0a';
    P.softRect(cx - pw - 2, cy - h / 2 + 4, (cl > 0 ? pw : w) + 8, h + 6, 5, 0.6);
    P.rr(cx - pw - 4, cy - h / 2 - 3, (cl > 0 ? pw + 6 : w + 8), h + 7, 2, cov);
    for (let i = 0; i < 4; i++) { R(cx - pw - 2 + i * 0.4, cy - h / 2 - 1 + i * 0.5, pw, h, '#c8b890'); if (!cl) R(cx + 2 - i * 0.4, cy - h / 2 - 1 + i * 0.5, pw, h, '#c8b890'); }
    page(cx - pw, cy - h / 2, pw, h, -1, o.left);
    if (cl === 0) page(cx, cy - h / 2, pw, h, 1, o.right);
    else if (cl < 0.5) {
      // правая половина поднимается вместе с обложкой: уже и выше (перспектива)
      const ww = pw * (1 - cl * 2), lift = Math.sin(cl * Math.PI) * 10;
      P.rr(cx, cy - h / 2 - 3 - lift, ww + 3, h + 7 + lift * 2, 2, cov);
      page(cx, cy - h / 2 - lift, ww, h + lift * 2, 1, null);
      R(cx, cy - h / 2 - lift, ww, h + lift * 2, P.LG(cx, 0, cx + ww, 0, [0, 'rgba(0,0,0,0.1)', 1, 'rgba(0,0,0,' + (0.2 + cl).toFixed(2) + ')']));
    } else {
      const ww = pw * (cl * 2 - 1), lift = Math.sin(cl * Math.PI) * 10;
      P.rr(cx - ww, cy - h / 2 - 3 - lift, ww, h + 7 + lift * 2, 2, cov);
      R(cx - ww, cy - h / 2 - lift, ww, h + lift * 2, P.LG(cx - ww, 0, cx, 0, [0, 'rgba(255,255,255,0.06)', 1, 'rgba(0,0,0,0.3)']));
      if (o.title && cl > 0.9) txt(o.title, cx - pw / 2, cy + 2, 'bold 7px Georgia, serif', 'rgba(200,170,110,' + ((cl - 0.9) * 10 * 0.8).toFixed(2) + ')', 'center');
    }
    if (o.flip !== undefined && o.flip > 0 && o.flip < 1) {
      const f = o.flip, ww = pw * Math.abs(Math.cos(f * Math.PI)), x = f < 0.5 ? cx : cx - ww;
      c.save(); c.beginPath(); c.rect(x, cy - h / 2 - 3, ww, h + 6); c.clip();
      R(x, cy - h / 2 - 2 - Math.sin(f * Math.PI) * 4, ww, h + Math.sin(f * Math.PI) * 4, P.LG(x, 0, x + ww, 0, [0, '#e8dcbc', 1, '#a8987a']));
      c.restore();
    }
    R(cx - 0.6, cy - h / 2, 1.2, h, 'rgba(0,0,0,0.35)');
  }
  function handLines(w, h, seed, n, col, startY, a) {
    const r = P.RNG(seed);
    c.save(); c.strokeStyle = col || 'rgba(60,20,16,0.7)'; c.lineWidth = 0.35; if (a !== undefined) c.globalAlpha *= a;
    for (let i = 0; i < n; i++) {
      const y = (startY || 8) + i * 4.2; if (y > h - 4) break;
      let x = 5; c.beginPath(); c.moveTo(x, y);
      const end = w - 5 - r() * 12;
      while (x < end) { const s = 1 + r() * 3; c.quadraticCurveTo(x + s / 2, y - 1.4 * r(), x + s, y + (r() - 0.5) * 0.6); x += s; if (r() < 0.12) { x += 2; c.moveTo(x, y); } }
      c.stroke();
    }
    c.restore();
  }
  function bookShot(t, k, now, o) {
    R(0, 0, W, H, P.RG(192, 120, 20, 260, [0, o.bg0 || '#2a1a10', 1, '#050302']));
    P.tex(0, 0, W, H, 0.4, 'overlay', 'mot', 1.2);
    cam(lerp(o.z0 || 1, o.z1 || 1.08, ease(k)), 192, lerp(110, o.fy || 110, ease(k)), function () {
      book(192, 116, 236, 150, o);
      if (o.candle !== false) { P.candleBody(338, 196, 40, 6, '#e8dcbc'); P.flame(338, 155, 2, now, 3, '255,160,70', 0.16); P.glow(338, 150, 160, '255,160,80', 0.08); }
      if (o.after) o.after(t, k, now);
    });
  }

  /* ---------- зеркало крупно ---------- */
  function mirrorShot(t, k, now, o) {
    R(0, 0, W, H, '#0e1714');
    c.fillStyle = 'rgba(80,110,95,0.14)';
    for (let y = 6, row = 0; y < H; y += 26, row++) for (let x = (row % 2) * 16; x < W + 16; x += 32) { c.beginPath(); c.moveTo(x, y - 10); c.bezierCurveTo(x + 6, y - 3, x + 6, y + 3, x, y + 8); c.bezierCurveTo(x - 6, y + 3, x - 6, y - 3, x, y - 10); c.fill(); }
    P.tex(0, 0, W, H, 0.5, 'overlay', 'mot', 1.4);
    cam(lerp(1, 1.06, ease(k)), 192, 104, function () {
      E(192, 104, 66, 96, P.goldG(126, 8, 258, 200)); E(192, 104, 60, 90, '#1a0e04');
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832; E(192 + Math.cos(a) * 63, 104 + Math.sin(a) * 93, 3, 3, P.goldG(180, 0, 204, 216)); }
      c.save(); c.beginPath(); c.ellipse(192, 104, 57, 87, 0, 0, 6.2832); c.clip();
      R(120, 10, 150, 190, P.LG(0, 10, 0, 200, [0, o.glass0 || '#2a3634', 1, o.glass1 || '#0c1210']));
      if (o.inside) o.inside(t, k, now);
      c.save(); c.globalCompositeOperation = 'lighter'; P.poly([150, 10, 172, 10, 130, 200, 108, 200], 'rgba(255,255,255,0.05)'); c.restore();
      if (o.fogA) { c.globalAlpha = o.fogA; P.fog(30, 160, now, 2, 1, '200,210,205', 8); c.globalAlpha = 1; }
      c.restore();
    });
    if (o.front) o.front(t, k, now);
    P.glow(60, 200, 120, '255,170,80', 0.08);
  }
  /* лицо в зеркале: старик (morph 0) — смутный двойник (morph 1) */
  function mirrorFace(x, y, s, morph, a) {
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s);
    P.puff(0, 30, 44, 32, '10,12,12', 0.95);
    const skin = P.mix('#a89a88', '#c8b8a4', morph);
    E(0, 0, 15, 19, P.LG(-15, 0, 15, 0, [0, P.sh('#a89a88', 0.5), 0.5, skin, 1, P.sh('#a89a88', 0.45)]));
    c.save(); c.globalAlpha *= 1 - morph; E(0, -12, 16, 10, '#b8b4ac'); c.beginPath(); c.moveTo(-10, 6); c.quadraticCurveTo(0, 30, 10, 6); c.quadraticCurveTo(0, 12, -10, 6); c.fillStyle = '#d0ccc4'; c.fill(); c.restore();
    c.save(); c.globalAlpha *= morph; E(0, -12, 16.4, 9, '#1a1410'); R(-16, -12, 5, 22, '#1a1410'); R(11, -12, 5, 22, '#1a1410'); c.restore();
    E(-5.6, -1, 2.6, 1.3, '#1a1410'); E(5.6, -1, 2.6, 1.3, '#1a1410'); E(-5.6, -1, 0.8, 0.8, 'rgba(200,190,170,0.8)'); E(5.6, -1, 0.8, 0.8, 'rgba(200,190,170,0.8)');
    P.line(-8, -5, -3, -4.4, 'rgba(40,30,20,0.6)', 0.5); P.line(8, -5, 3, -4.4, 'rgba(40,30,20,0.6)', 0.5);
    P.line(0, 0, -1, 6, 'rgba(60,40,30,0.4)', 0.5); P.line(-3, 10, 3, 10, 'rgba(60,30,30,0.6)', 0.5);
    c.restore();
  }

  /* ---------- дверь изнутри: колокольчик, туман за стеклом ---------- */
  function doorShot(t, k, now, o) {
    R(0, 0, W, H, '#0c1310'); P.tex(0, 0, W, H, 0.5, 'overlay', 'mot', 1.4);
    const open = clamp(o.open || 0), dx = 120, dw = 144, dy = 30;
    R(dx - 10, dy - 10, dw + 20, 196, P.LG(0, 0, 0, 216, [0, '#3a2414', 1, '#140a04']));
    c.save(); c.beginPath(); c.rect(dx, dy, dw, 186); c.clip();
    R(dx, dy, dw, 186, P.LG(0, dy, 0, 216, [0, o.out0 || '#3a4650', 1, o.out1 || '#1a2228']));
    P.fog(dy, 190, now, 5, 0.8, o.fogCol || '180,190,198', 9);
    if (o.who) o.who(t, k, now);
    c.restore();
    const vis = dw * (1 - open * 0.86);
    R(dx, dy, vis, 186, P.LG(dx, 0, dx + vis, 0, [0, '#2a1a0e', 0.5, '#3a2414', 1, open > 0 ? '#120804' : '#2a1a0e']));
    if (vis > 30) {
      c.save(); c.beginPath(); c.rect(dx + vis * 0.1, dy + 12, vis * 0.8, 70); c.clip();
      R(dx, dy, dw, 100, P.LG(0, dy, 0, dy + 82, [0, o.out0 || '#3a4650', 1, o.out1 || '#1a2228']));
      P.fog(dy, 100, now, 5, 0.8, o.fogCol || '180,190,198', 10);
      if (o.whoGlass) o.whoGlass(t, k, now);
      c.restore();
      R(dx + vis * 0.5 - 1.4, dy + 12, 2.8, 70, '#2a1a0e'); R(dx + vis * 0.1, dy + 46, vis * 0.8, 2.6, '#2a1a0e');
      P.rr(dx + vis * 0.1, dy + 96, vis * 0.8, 70, 2, 'rgba(0,0,0,0.25)');
      E(dx + vis * 0.86, dy + 110, 3, 3, P.brassG(dx + vis * 0.86 - 3, dx + vis * 0.86 + 3));
    }
    // колокольчик на пружине
    const sw = o.bell ? Math.sin(now / 120) * 0.5 * Math.max(0, 1 - (t - (o.bellAt || 0)) / 2600) * (t > (o.bellAt || 0) ? 1 : 0) : 0;
    R(dx + dw / 2 - 1, 8, 2, 12, '#1a1a1a');
    c.save(); c.translate(dx + dw / 2, 20); c.rotate(sw);
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 0.6; c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo((i % 2 ? 2 : -2), i * 1.4); c.stroke();
    bellShape(0, 8, 7, 0, P.LG(-7, 0, 7, 0, [0, '#4a3410', 0.4, '#e8c878', 1, '#3a2408']));
    c.restore();
    if (o.desat) { c.save(); c.globalCompositeOperation = 'saturation'; R(0, 0, W, H, 'rgba(128,128,128,' + o.desat + ')'); c.restore(); }
  }

  /* ---------- поезд по мосту на рассвете ---------- */
  function bridgeShot(t, k, now, o) {
    sky([0, '#3a4a6a', 0.45, '#d89870', 0.75, '#f8c888', 1, '#f8e0b0'], 140);
    const sy = lerp(150, 116, ease(k));
    P.glow(270, sy, 90, '255,230,170', 0.5, 'source-over'); E(270, sy, 12, 12, '#fff4d8');
    town(140, 'rgba(70,50,60,0.7)', 31, { lit: 0, minH: 6, varH: 10 });
    R(0, 140, W, 76, P.LG(0, 140, 0, 216, [0, '#c8906a', 0.3, '#6a5060', 1, '#1a1a2a']));
    E(270, 150, 16, 50, 'rgba(255,230,170,0.25)');
    for (let i = 0; i < 40; i++) { const y = 142 + (i * 5.3) % 70, x = (i * 61 + now / 80) % (W + 30) - 15; P.line(x, y, x + 10, y, 'rgba(255,220,180,0.12)', 0.3); }
    P.fog(120, 70, now, 4, 0.55, '255,225,210', 3);
    // мост: каменные арки
    R(-10, 112, W + 20, 6, '#2a2028'); R(-10, 110, W + 20, 2, '#4a3a40');
    for (let x = -10; x < W + 20; x += 48) { c.beginPath(); c.moveTo(x, 118); c.lineTo(x, 150); c.lineTo(x + 8, 150); c.lineTo(x + 8, 130); c.quadraticCurveTo(x + 28, 116, x + 48, 130); c.lineTo(x + 48, 118); c.closePath(); c.fillStyle = '#241c24'; c.fill(); }
    for (let x = -10; x < W + 20; x += 6) R(x, 104, 0.8, 6, '#2a2028'); R(-10, 104, W + 20, 0.8, '#2a2028');
    // поезд
    const off = -100 + ease(seg(t, 0, 10000)) * 560;
    c.save(); c.translate(0, 112); c.scale(0.55, 0.55);
    for (let i = 0; i < 4; i++) carriage(off / 0.55 - 96 * (i + 1), 0, 92, 34, false, now);
    loco(off / 0.55 + 10, 0, now);
    c.restore();
    puffs(now, off + 14, 90, 10, 3200, -80, -26, '255,240,230', 8, 6);
    P.fog(150, 70, now, 9, 0.45, '255,225,210', 4);
  }

  /* ============================================================
     ПЛАНЫ: вступление
     ============================================================ */
  function introShots() {
    const debt = (typeof B !== 'undefined' && B && B.debt) ? B.debt : 1200;
    return [
      { cap: 'Письмо пришло в четверг.', d: 7000, cues: [[400, 'drip']],
        draw: function (t, k, now) { deskShot(t, k, now, { lines: ['Нотариальная контора г. Мглова', 'Наследнику М. И. Сорина.', 'В собственные руки.'], gust: true, z1: 1.14, fx: 196, fy: 150 }); } },
      { cap: 'Нотариус из города Мглова сообщал: ваш дядя, Матвей Ильич Сорин, «выбыл при невыясненных обстоятельствах».', d: 8000, cues: [[300, 'page']],
        draw: function (t, k, now) { paperShot(t, k, now, { lines: [
          { s: 'Уведомляю Вас, что дядя Ваш,', y: -76, at: 300 },
          { s: 'Матвей Ильич Сорин,', y: -58, at: 1700 },
          { s: 'выбыл при невыясненных', y: -40, at: 2800, under: true },
          { s: 'обстоятельствах.', y: -22, at: 4000, under: true }] }); } },
      { cap: 'Вам отошла его лавка — ломбард «Последний час».\nИ его долг.', d: 9000, cues: [[5200, 'whisper']],
        draw: function (t, k, now) { paperShot(t, k, now, { fy: 120, pan: 26, lines: [
          { s: 'Уведомляю Вас, что дядя Ваш,', y: -76, at: -99999 },
          { s: 'Матвей Ильич Сорин,', y: -58, at: -99999 },
          { s: 'выбыл при невыясненных', y: -40, at: -99999, under: true },
          { s: 'обстоятельствах.', y: -22, at: -99999, under: true },
          { s: 'По завещанию Вам отходит', y: 22, at: 200 },
          { s: 'его лавка — ломбард', y: 40, at: 1400 },
          { s: '«Последний час».', y: 58, at: 2400 },
          { s: 'А равно и долг: ' + debt + ' гр.', y: 76, at: 3400, col: 'rgba(60,14,14,0.95)' }],
          blot: { line: 7, at: 4700 }, sign: { s: 'Нотариус Вельц', y: 96, at: 3000 } }); } },
      { cap: 'Последний поезд высадил вас на пустом перроне.', d: 9500, cues: [[200, 'whistle'], [600, 'chug']],
        draw: function (t, k, now) { stationShot(t, k, now, {}); } },
      { cap: 'Туман здесь поднимается от реки каждый вечер — и город запирает ставни.', d: 9500, cues: [[2400, 'knock1'], [4100, 'knock1'], [6300, 'knock1']],
        draw: function (t, k, now) { townShot(t, k, now); } },
      { cap: 'Лавка работает только ночью. Так заведено: тем, кто выходит из тумана, тоже нужно где-то торговать.', d: 10000, cues: [[5200, 'bell']],
        draw: function (t, k, now) {
          cam(lerp(1, 1.08, ease(k)), 192, 120, function () {
            sky([0, '#05080c', 1, '#1a2226'], 120);
            shopFront(t, now, { day: 0, lit: true, nshut: 1 });
            [[30, 0.9, 1], [350, 0.8, -1], [310, 0.6, -1], [70, 0.55, 1]].forEach(function (f, i) {
              const p = ease(seg(t, 800 + i * 900, 9000)), x = f[0] + f[2] * p * 34, a = p * f[1] * 0.95;
              P.puff(x, 170 + p * 4, 26, 46, '150,162,168', 0.3 * a);
              fig(x, 196 + p * 4, 60 + p * 10, { thin: true, long: true, a: a, col: '#040506', walk: now / 900 + i, blur: 0.6 * (1 - p), face: 'rgba(170,180,175,' + (0.55 * a).toFixed(2) + ')', eyes: 'rgba(0,0,0,' + (0.8 * a).toFixed(2) + ')' });
            });
            P.fog(130, 90, now, 5, 0.55, '150,160,168', 1);
          });
        } },
      { cap: 'На прилавке лежит дядин гроссбух. На первой странице, его рукой: «ПРАВИЛА. Не нарушай. Я нарушил».', d: 10500, cues: [[300, 'page'], [1600, 'scratch'], [3600, 'scratch'], [5800, 'scratch'], [8600, 'breath']],
        draw: function (t, k, now) {
          const lk = 1 - seg(t, 8000, 9600) * 0.75;
          bookShot(t, k, now, { cover: '#3a1a10', z0: 1.04, z1: 1.18, fy: 104, candle: false,
            left: function (w, h) { handLines(w, h, 3, 30, 'rgba(40,30,20,0.55)', 10); },
            right: function (w, h) {
              txt('ПРАВИЛА.', 14, 30, 'bold 13px ' + HAND, 'rgba(40,16,10,0.9)', 'left', seg(t, 1200, 2400));
              txt('Не нарушай.', 14, 58, 'italic 11px ' + HAND, 'rgba(40,16,10,0.9)', 'left', seg(t, 3400, 4600));
              c.save(); c.translate(16, 86); c.rotate(-0.03); txt('Я нарушил.', 0, 0, 'italic 12px ' + HAND, 'rgba(90,16,10,0.95)', 'left', seg(t, 5600, 6800)); c.restore();
            },
            after: function () {
              const lx = 330;
              E(lx, 200, 18, 4, P.brassG(lx - 18, lx + 18)); c.beginPath(); c.ellipse(lx, 186, 15, 13, 0, 0, 6.28); c.fillStyle = 'rgba(120,150,140,0.45)'; c.fill();
              R(lx - 6, 140, 12, 32, 'rgba(220,230,230,0.22)'); R(lx - 7, 170, 14, 4, P.brassG(lx - 7, lx + 7));
              P.flame(lx, 168, 2.6 * lk, now, 2, '255,160,70', 0.2 * lk);
              // во тьме за гроссбухом — дядино зеркало; на стекле изнутри проступает ладонь
              E(40, 46, 26, 40, 'rgba(120,90,40,0.18)'); E(40, 46, 23, 37, 'rgba(10,14,13,0.9)');
              const q = seg(t, 7600, 9800);
              if (q > 0) {
                c.save(); c.globalAlpha = Math.min(1, q * 2) * (1 - seg(t, 9600, 10400)) * 0.55;
                P.puff(40, 50, 16, 22, '170,185,180', 0.25);
                E(40, 54, 6, 7, 'rgba(210,220,215,0.5)');
                [[-5, -6, -0.25], [-2, -9, -0.08], [1.6, -9.4, 0.06], [5, -7, 0.22]].forEach(function (f) { E(40 + f[0], 54 + f[1] - 4, 1.3, 5, 'rgba(210,220,215,0.5)', f[2]); });
                E(32, 54, 1.4, 4, 'rgba(210,220,215,0.5)', -0.9);
                c.restore();
              }
            } });
          R(0, 0, W, H, 'rgba(0,0,0,' + (0.5 * (1 - lk)).toFixed(3) + ')');
        } },
      { cap: '', d: 5200, title: true, cues: [[600, 'sting']],
        draw: function (t, k, now) {
          R(0, 0, W, H, '#000');
          P.fog(70, 110, now, 4, 0.35, '120,130,130', 1);
          const a = seg(t, 600, 2400) * (Math.random() < 0.03 ? 0.6 : 1), b = seg(t, 2200, 3400);
          c.save(); c.shadowColor = 'rgba(232,160,60,0.8)'; c.shadowBlur = 40;
          txt('ПОСЛЕДНИЙ ЧАС', 192, 106, 'bold 30px Georgia, serif', 'rgba(236,222,186,' + a.toFixed(3) + ')', 'center'); c.restore();
          txt('ломбард на краю тумана', 192, 128, 'italic 10px Georgia, serif', 'rgba(200,180,140,' + (b * 0.85).toFixed(3) + ')', 'center');
        } }
    ];
  }

  /* ============================================================
     ПЛАНЫ: концовки (подписи — из ENDINGS в story.js)
     ============================================================ */
  const porch = function (t, k, now, o) {
    sky([0, '#6a7a9a', 0.5, '#e0a880', 1, '#f8d0a0'], 120);
    cam(lerp(1.5, 1.75, ease(k)), 236, 140, function () {
      shopFront(t, now, { day: 0.75, lit: false, nshut: 0, lock: o.lock });
      P.shade(240, 174, 22, 3, 0.45);
      oldMan(232, 172.4, 0.78, now, {});
      puffs(now, 239, 140, 4, 2600, 6, -12, '255,250,240', 1.4, 2);
    });
    R(0, 0, W, H, P.LG(0, 0, W, 0, [0, 'rgba(255,200,140,0)', 1, 'rgba(255,190,130,0.14)']));
    P.fog(150, 70, now, 4, 0.3, '255,230,215', 2);
  };
  const ENDS = {
    bell: [
      { d: 9000, cues: [[200, 'bigBell'], [2600, 'bigBell'], [5000, 'bigBell'], [7400, 'bigBell']], draw: function (t, k, now) { cam(lerp(0.66, 0.74, ease(k)), 192, lerp(70, 80, ease(k)), function () { belfry(t, k, now, { swing: 1 }); }); fogDown(k, now); } },
      { d: 9000, cues: [[600, 'tick'], [1600, 'tick'], [2600, 'tick'], [3600, 'tick']], draw: function (t, k, now) { porch(t, k, now, {}); } },
      { d: 9000, cues: [[800, 'coin']], draw: function (t, k, now) { hatShot(t, k, now); } },
      { d: 9500, draw: function (t, k, now) { sky([0, '#8a9ab0', 1, '#e8d0b0'], 120); cam(lerp(1.1, 1, ease(k)), 192, 116, function () { shopFront(t, now, { day: 1, lit: false, lock: true, nshut: 0 }); }); flock(now, -30, 50, 4, 20, -3, 9, 'rgba(40,40,50,0.6)'); P.fog(160, 60, now, 3, 0.25, '255,240,230', 3); } }
    ],
    dawn: [
      { d: 9500, draw: function (t, k, now) { cam(lerp(1, 1.06, ease(k)), 192, 108, function () { shopIn(t, k, now, { light: 'dawn', fog: 1 - ease(k) * 0.6, lamp: false, smoke: true }); }); } },
      { d: 9000, cues: [[600, 'tick'], [1600, 'tick'], [2600, 'tick']], draw: function (t, k, now) { porch(t, k, now, {}); } },
      { d: 9000, cues: [[3400, 'bell']], draw: function (t, k, now) { thresholdShot(t, k, now); } },
      { d: 11000, cues: [[600, 'whistle'], [1200, 'chug']], draw: function (t, k, now) { bridgeShot(t, k, now, {}); } }
    ],
    keeper: [
      { d: 8500, cues: [[2400, 'scratch'], [4200, 'stamp']], draw: function (t, k, now) { paidShot(t, k, now); } },
      { d: 10000, draw: function (t, k, now) { lapseShot(t, k, now); } },
      { d: 10000, cues: [[5000, 'breath']], draw: function (t, k, now) { mirrorShot(t, k, now, { fogA: 0.3 + Math.sin(now / 1800) * 0.1, inside: function () { mirrorFace(192, 104, 1.6, ease(seg(t, 2500, 8500)), 0.9); } }); } },
      { d: 10000, cues: [[400, 'scratch'], [2400, 'scratch'], [4400, 'scratch']], draw: function (t, k, now) { writeShot(t, k, now); } }
    ],
    creditor: [
      { d: 9500, cues: [[600, 'page'], [2400, 'page'], [4200, 'page'], [6000, 'page']], draw: function (t, k, now) {
        const f = (t / 1800) % 1;
        bookShot(t, k, now, { cover: '#0a0a0c', bg0: '#1a1010', flip: t < 7200 ? f : undefined,
          left: function (w, h) { handLines(w, h, Math.floor(t / 1800) * 7 + 1, 30, 'rgba(90,16,14,0.7)', 10); },
          right: function (w, h) { handLines(w, h, Math.floor(t / 1800) * 7 + 2, 30, 'rgba(90,16,14,0.7)', 10); } }); } },
      { d: 9000, cues: [[3000, 'whisper']], draw: function (t, k, now) {
        bookShot(t, k, now, { cover: '#0a0a0c', bg0: '#140c0c', z1: 1.22,
          left: function (w, h) { handLines(w, h, 99, 30, 'rgba(90,16,14,0.7)', 10); },
          right: function (w, h) { P.glow(w / 2, h / 2, 50, '255,240,210', 0.08 + Math.sin(now / 900) * 0.03); },
          after: function () { quill(250 + Math.sin(now / 800) * 4, 100 + Math.sin(now / 600) * 3, -0.6); } }); } },
      { d: 10000, cues: [[5600, 'door']], draw: function (t, k, now) { nailShot(t, k, now); } },
      { d: 10000, draw: function (t, k, now) { otherCityShot(t, k, now); } }
    ],
    pawn: [
      { d: 8000, cues: [[3600, 'thud']], draw: function (t, k, now) {
        bookShot(t, k, now, { cover: '#0a0a0c', bg0: '#100a0a', close: ease(seg(t, 1200, 4000)), title: '', z1: 1.04,
          left: function (w, h) { handLines(w, h, 5, 30, 'rgba(90,16,14,0.7)', 10); },
          right: function (w, h) { handLines(w, h, 6, 14, 'rgba(90,16,14,0.7)', 10); txt('Наследник', 10, 78, 'italic 9px ' + HAND, 'rgba(110,16,14,0.9)'); },
          after: function () { const p = seg(t, 3800, 6000); if (p > 0 && p < 1) P.motes(now, 120, 60, 150, 90, 40, 2, '220,210,190', 0.6 * (1 - p)); } });
        R(0, 0, W, H, 'rgba(0,0,0,' + (seg(t, 5000, 7600) * 0.7).toFixed(3) + ')'); } },
      { d: 9500, draw: function (t, k, now) { const q = ease(seg(t, 1500, 8500)); cam(lerp(1, 2, q), lerp(192, 288, q), lerp(108, 54, q), function () { shopIn(t, k, now, { light: 'dawn', lamp: false, extra: function () { dollSmall(340, 44); } }); }); } },
      { d: 11000, cues: [[7600, 'creak']], draw: function (t, k, now) { dollShot(t, k, now); } },
      { d: 9000, cues: [[1400, 'bell'], [1500, 'door']], draw: function (t, k, now) { doorShot(t, k, now, { open: ease(seg(t, 1500, 3500)) * 0.8, bell: true, bellAt: 1400, who: function () { const p = ease(seg(t, 2500, 8000)); fig(192, 216, 120 + p * 30, { col: '#050607', a: 0.5 + p * 0.45, blur: 1.2 * (1 - p), hat: 'bowler' }); } }); } }
    ],
    mad: [
      { d: 9000, cues: [], draw: function (t, k, now) { doorShot(t, k, now, { bell: true, bellAt: 600, desat: 0.4 + ease(k) * 0.5 }); R(0, 0, W, H, 'rgba(20,20,20,' + (ease(k) * 0.35).toFixed(3) + ')'); } },
      { d: 10000, cues: [[4000, 'whisper']], draw: function (t, k, now) { mirrorShot(t, k, now, { glass0: '#3a4442', glass1: '#141a18',
        inside: function () { const K = P.K; c.save(); c.globalAlpha = 0.6; c.translate(384, 0); c.scale(-1, 1); c.drawImage(shopInBack('night'), 120 * K, 0, 150 * K, 150 * K, 120, 14, 150, 180); c.restore(); },
        front: function () { const p = ease(seg(t, 0, 3000)); fig(170, 236, 150, { col: '#030404', a: 0.95 * p, scarfTail: true }); } }); } },
      { d: 10500, draw: function (t, k, now) { backwardShot(t, k, now); } },
      { d: 10500, cues: [[6000, 'bell']], draw: function (t, k, now) { distantShot(t, k, now); } }
    ],
    shadow: [
      { d: 10000, cues: [[400, 'dawn'], [900, 'bigBell'], [3600, 'bigBell']], draw: function (t, k, now) { ringerShot(t, k, now); } },
      { d: 10000, cues: [[300, 'crackle'], [3000, 'crackle'], [6000, 'crackle']], draw: function (t, k, now) { stoveShot(t, k, now); } },
      { d: 10500, cues: [[600, 'tick'], [900, 'chime'], [1300, 'tick'], [1900, 'tick']], draw: function (t, k, now) { clocksShot(t, k, now); } },
      { d: 10500, draw: function (t, k, now) { sky([0, '#7a9ab8', 1, '#f0dcc0'], 120); cam(lerp(1.08, 1, ease(k)), 192, 116, function () { shopFront(t, now, { day: 1, lit: false, nshut: 0, sign2: ease(seg(t, 1500, 4500)), sign2text: 'ЧАСЫ · ПОЧИНКА · ЗАКЛАД — ДАРОМ' }); }); flock(now, -20, 40, 5, 24, -4, 4, 'rgba(40,40,50,0.6)'); P.fog(190, 40, now, 3, 0.3, '240,240,250', 3); } }
    ],
    ferry: [
      { d: 11000, cues: [[400, 'drip']], draw: function (t, k, now) { boatShot(t, k, now); } },
      { d: 9500, draw: function (t, k, now) { teaShot(t, k, now); } },
      { d: 10000, cues: [[5200, 'tick'], [5400, 'chime']], draw: function (t, k, now) { shadowShot(t, k, now); } },
      { d: 10000, cues: [[400, 'drip']], draw: function (t, k, now) { deskShot(t, k, now, { lines: ['Нотариальная контора г. Мглова', 'В собственные руки.'], ribbon: true, z1: 1.16, fx: 196, fy: 156 }); } }
    ]
  };
  ENDS.keeper2 = [
    { d: 9500, draw: function (t, k, now) { cam(lerp(1, 1.1, ease(k)), 200, 120, function () { shopIn(t, k, now, { light: 'night', lamp: true, extra: function () { const a = 1 - ease(seg(t, 2000, 7000)); if (a > 0) { c.save(); c.globalAlpha = a; E(240, 162, 8, 8, P.brassG(232, 248)); E(240, 162, 6, 6, '#e8e0c8'); P.glow(240, 162, 14, '255,230,180', 0.2 * a); c.restore(); } } }); }); } },
    ENDS.keeper[1], ENDS.keeper[0], ENDS.keeper[3]
  ];

  /* ---------- остальные планы концовок ---------- */
  function hatShot(t, k, now) {
    sky([0, '#5a6a80', 1, '#a8a49c'], 216);
    c.save(); c.globalAlpha = 0.7; churchSil(192, 110, 2.2, '#4a4e58', '#6a5a40'); c.restore();
    P.fog(40, 90, now, 2, 0.6, '200,205,212', 7);
    P.cobbles(110, 216, '#4a4c50', 12);
    c.save(); c.globalCompositeOperation = 'lighter'; P.tex(0, 110, W, 106, 0.12, 'source-over'); c.restore();
    cam(lerp(1, 1.18, ease(k)), 196, 158, function () {
      E(196, 176, 52, 9, 'rgba(0,0,0,0.4)');
      c.beginPath(); c.ellipse(196, 150, 40, 12, 0, 0, 6.28); c.fillStyle = '#0c0c0e'; c.fill();
      c.beginPath(); c.moveTo(170, 150); c.lineTo(174, 178); c.quadraticCurveTo(196, 184, 218, 178); c.lineTo(222, 150); c.closePath(); c.fillStyle = P.LG(170, 0, 222, 0, [0, '#060607', 0.5, '#1c1c20', 1, '#050506']); c.fill();
      R(171, 160, 50, 4, '#1a1014');
      c.save(); c.beginPath(); c.ellipse(196, 150, 26, 7, 0, 0, 6.28); c.clip(); R(160, 140, 80, 20, '#050506');
      const r = P.RNG(4); for (let i = 0; i < 60; i++) { const x = 172 + r() * 48, y = 144 + r() * 10, g = r() < 0.6; E(x, y, 2.6, 1.2, g ? P.brassG(x - 2.6, x + 2.6) : 'rgb(' + (150 + r() * 60 | 0) + ',' + (150 + r() * 60 | 0) + ',' + (160 + r() * 60 | 0) + ')', r() - 0.5); }
      c.restore();
      for (let i = 0; i < 5; i++) { const ph = (now / 1700 + i * 0.37) % 1; if (ph < 0.12) P.glow(180 + i * 8, 146 + (i % 2) * 5, 4, '255,255,240', 0.6 * Math.sin(ph / 0.12 * Math.PI)); }
      c.beginPath(); c.ellipse(196, 150, 40, 12, 0, 0, 6.28); c.strokeStyle = 'rgba(220,230,240,0.25)'; c.lineWidth = 0.5; c.stroke();
    });
    P.fog(150, 60, now, 3, 0.4, '220,225,232', 5);
  }
  function thresholdShot(t, k, now) {
    R(0, 0, W, H, P.LG(0, 0, 0, H, [0, '#4a3220', 1, '#1a0e06']));
    R(0, 0, 60, 120, P.LG(0, 0, 60, 0, [0, '#5a5650', 1, '#3a3632'])); P.tex(0, 0, 60, 120, 0.4, 'overlay', 'mot', 1);
    P.boards(60, 0, 324, 120, 9, '#5a3a20', 3, true);
    R(60, 0, 6, 120, P.LG(60, 0, 66, 0, [0, '#1a0e06', 1, '#3a2414']));
    [[84, 6, 120, 44], [222, 6, 120, 44], [84, 60, 120, 46], [222, 60, 120, 46]].forEach(function (p) {
      P.rr(p[0], p[1], p[2], p[3], 1, 'rgba(0,0,0,0.3)'); P.rr(p[0] + 1.4, p[1] + 1.4, p[2] - 2.8, p[3] - 2.8, 1, P.LG(0, p[1], 0, p[1] + p[3], [0, 'rgba(255,220,170,0.08)', 1, 'rgba(0,0,0,0.15)']));
    });
    R(66, 100, 318, 12, P.brassG(66, 384)); R(66, 100, 318, 0.6, 'rgba(255,240,200,0.6)');
    R(0, 112, W, 14, P.LG(0, 112, 0, 126, [0, '#8a6a4a', 1, '#3a2614'])); R(0, 112, W, 0.8, 'rgba(255,230,190,0.4)');
    R(0, 126, W, 90, P.LG(0, 126, 0, 216, [0, '#6a6460', 1, '#2a2826'])); P.tex(0, 126, W, 90, 0.4, 'overlay', 'mot', 1);
    R(0, 125, W, 3, '#0a0806');
    c.save(); c.globalCompositeOperation = 'lighter'; P.shaft(320, 0, 80, 200, 216, 200, '255,210,150', 0.12, 4); c.restore();
    const p = ease(seg(t, 1200, 5200)), kx = lerp(250, 180, p), ky = lerp(170, 128, p);
    c.save(); c.beginPath(); c.rect(0, 127, W, 100); c.clip();
    c.save(); c.translate(kx, ky); c.rotate(-0.5);
    E(0, 0, 7, 7, P.brassG(-7, 7)); E(0, 0, 3.6, 3.6, '#4a3a2a'); R(6, -1.4, 30, 2.8, P.brassG(6, 36)); R(28, 1.4, 3, 5, P.brassG(28, 31)); R(33, 1.4, 3, 7, P.brassG(33, 36));
    c.restore();
    const ha = 1 - seg(t, 5200, 6400);
    if (ha > 0) { c.save(); c.globalAlpha = ha; c.translate(kx + 12, ky + 14); c.rotate(-0.5); R(4, 0, 60, 20, '#1a1614'); E(0, 8, 9, 8, '#c8a486'); for (let i = 0; i < 3; i++) P.rr(-14, 2 + i * 4.4, 12, 3.6, 1.8, '#c0a080'); c.restore(); }
    c.restore();
    const sw = Math.sin(now / 160) * Math.max(0, 1 - (t - 3400) / 2600) * (t > 3400 ? 1 : 0);
    c.save(); c.globalAlpha = 0.3; c.translate(300, 8); c.rotate(sw * 0.5); c.strokeStyle = '#000'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 10); c.stroke(); bellShape(0, 10, 9, 0, '#000'); c.restore();
  }
  function paidShot(t, k, now) {
    bookShot(t, k, now, { cover: '#2a1a10', z1: 1.15, fy: 100,
      left: function (w, h) { handLines(w, h, 8, 30, 'rgba(40,30,20,0.55)', 10); },
      right: function (w, h) {
        txt('Долг Кредитору', 8, 22, 'bold 9px ' + HAND, 'rgba(40,16,10,0.9)');
        [36, 50, 64, 78].forEach(function (y, i) { txt('ночь ' + (i + 4) + '-я', 10, y, 'italic 7px ' + HAND, 'rgba(40,30,20,0.75)'); txt('— ' + (180 - i * 40), 70, y, 'italic 7px ' + HAND, 'rgba(40,30,20,0.75)'); });
        const p = seg(t, 2200, 3600); if (p > 0) { c.strokeStyle = 'rgba(60,10,10,0.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(6, 54); c.lineTo(6 + 100 * p, 54 + Math.sin(p * 9) * 2); c.stroke(); c.beginPath(); c.moveTo(6, 58); c.lineTo(6 + 100 * p, 62); c.stroke(); }
        const q = seg(t, 4100, 4400);
        if (q > 0) { c.save(); c.translate(64, 104); c.rotate(-0.18); c.scale(1.5 - q * 0.5, 1.5 - q * 0.5); c.globalAlpha = q; c.strokeStyle = 'rgba(170,20,20,0.85)'; c.lineWidth = 1.2; c.strokeRect(-40, -11, 80, 20); txt('УПЛАЧЕНО', 0, 5, 'bold 13px Georgia, serif', 'rgba(170,20,20,0.85)', 'center'); c.restore(); }
      } });
  }
  function lapseShot(t, k, now) {
    const cyc = (t / 2500) % 1, day = clamp(Math.sin(cyc * Math.PI * 2) * 0.8 + 0.5);
    sky([0, P.mix('#05080c', '#7a9ab8', day), 1, P.mix('#1a2226', '#e8d8c0', day)], 120);
    for (let i = 0; i < 6; i++) { const x = ((t / 6 + i * 90) % 480) - 60; E(x, 20 + (i % 3) * 10, 40, 4, 'rgba(' + (day > 0.5 ? '255,255,255' : '40,50,60') + ',0.25)'); }
    cam(1.04, 192, 116, function () { shopFront(t, now, { day: day, lit: day < 0.45, shut: day > 0.6 ? 0 : day < 0.3 ? 0 : 1, nshut: day > 0.5 ? 0 : 1 }); });
    const r = P.RNG(Math.floor(t / 300));
    if (day > 0.4) for (let i = 0; i < 3; i++) { const x = r() * W; fig(x, 200 + r() * 10, 40, { col: 'rgba(30,30,34,0.5)', blur: 1.2, walk: now / 200 }); }
  }
  function writeShot(t, k, now) {
    const lines = [
      { s: 'Здравствуй. Ты меня не знаешь.', y: -70 },
      { s: 'Лавка «Последний час» — теперь твоя.', y: -50 },
      { s: 'Правила — в гроссбухе. Не нарушай их.', y: -30 },
      { s: 'И не бойся колокольчика.', y: -10 }];
    let at = 400;
    lines.forEach(function (l) { l.at = at; at += l.s.length * 55 + 400; });
    paperShot(t, k, now, { lines: lines, noHead: true });
    let qx = 0, qy = 0;
    lines.forEach(function (l) { const p = seg(t, l.at, l.at + l.s.length * 45); if (p > 0 && p < 1) { qx = (l._end === undefined ? -126 + p * l.s.length * 5.4 : -126 + p * (l._end + 126)); qy = l.y; } });
    if (qx) cam(1.02 + ease(k) * 0.05, 192, 80, function () { c.save(); c.translate(192, 104); c.rotate(-0.022); quill(qx, qy - 1, -0.5); c.restore(); });
  }
  function nailShot(t, k, now) {
    R(0, 0, W, H, '#0e1714'); P.tex(0, 0, W, H, 0.5, 'overlay', 'mot', 1.4);
    c.fillStyle = 'rgba(80,110,95,0.14)';
    for (let y = 6, row = 0; y < H; y += 22, row++) for (let x = (row % 2) * 14; x < W; x += 28) { c.beginPath(); c.moveTo(x, y - 8); c.bezierCurveTo(x + 5, y - 2, x + 5, y + 2, x, y + 7); c.bezierCurveTo(x - 5, y + 2, x - 5, y - 2, x, y - 8); c.fill(); }
    // дверной проём справа: туман, уходящий силуэт в цилиндре
    R(250, 10, 110, 206, '#2a1a0e');
    c.save(); c.beginPath(); c.rect(258, 18, 94, 198); c.clip();
    R(258, 18, 94, 198, P.LG(0, 18, 0, 216, [0, '#5a6670', 1, '#2a3238']));
    P.fog(20, 200, now, 4, 0.9, '200,208,214', 3);
    const p = ease(seg(t, 2000, 9500));
    fig(300 + p * 20, 216 - p * 20, 150 - p * 90, { hat: 'top', thin: true, long: true, col: '#050506', a: 1 - p * 0.85, walk: now / 600 });
    c.restore();
    // гвоздь и тень на нём
    R(130, 40, 3, 3, '#2a2a2e'); E(131.5, 41.5, 2.2, 2.2, '#4a4a50');
    const sw = Math.sin(now / 1400) * 0.05;
    c.save(); c.translate(131.5, 42); c.rotate(sw);
    c.globalAlpha = 0.85;
    fig(0, 128, 130, { col: '#020203', flare: 2, blur: 0.8 + Math.sin(now / 500) * 0.3 });
    c.restore();
    P.glow(80, 200, 100, '255,170,80', 0.06);
  }
  function otherCityShot(t, k, now) {
    sky([0, '#04060a', 1, '#141a20'], 216);
    cam(lerp(1, 1.08, ease(k)), 192, 110, function () {
      R(150, 20, 220, 170, P.LG(0, 20, 0, 190, [0, '#2a1a16', 1, '#120a08'])); P.tex(150, 20, 220, 170, 0.5, 'overlay', 'mot', 1);
      for (let y = 24; y < 190; y += 5) P.line(150, y, 370, y, 'rgba(0,0,0,0.25)', 0.3);
      const wx = 220, wy = 50, ww = 80, wh = 90;
      R(wx - 5, wy - 5, ww + 10, wh + 10, '#1a100a');
      c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip();
      R(wx, wy, ww, wh, P.LG(0, wy, 0, wy + wh, [0, '#a86a30', 1, '#6a3a18']));
      P.glow(wx + 50, wy + 60, 40, '255,200,120', 0.4);
      fig(wx + 40, wy + wh + 20, 90, { col: 'rgba(30,16,8,0.9)', noArms: true });
      P.rr(wx + 44, wy + 52, 16, 12, 0.6, 'rgba(240,230,200,0.9)');
      c.restore();
      R(wx + ww / 2 - 1, wy, 2, wh, '#1a100a'); R(wx, wy + wh / 2, ww, 2, '#1a100a');
      R(0, 190, W, 26, '#0a0c0e');
    });
    R(70, 90, 2.4, 110, '#0c0e10'); P.poly([64, 84, 78, 84, 76, 96, 66, 96], 'rgba(220,230,220,0.35)'); P.glow(71, 90, 60, '200,220,210', 0.14);
    fig(80, 204, 96, { hat: 'top', thin: true, long: true, col: '#020203', a: ease(seg(t, 1500, 5000)) });
    P.fog(120, 100, now, 4, 0.55, '150,160,168', 6);
  }
  function dollSmall(x, y) {
    R(x - 4, y - 9, 8, 9, '#1a1a20'); E(x, y - 12, 3, 3.4, '#ece4dc'); E(x, y - 14, 3.2, 1.8, '#2a1a10'); R(x - 1, y - 9, 2, 1, '#6a2a2a');
  }
  function dollShot(t, k, now) {
    R(0, 0, W, H, P.LG(0, 0, 0, H, [0, '#24160c', 1, '#0c0604'])); P.tex(0, 0, W, H, 0.5, 'overlay', 'mot', 1.2);
    R(0, 150, W, 12, P.LG(0, 150, 0, 162, [0, '#6a4a2a', 1, '#2a180a'])); R(0, 162, W, 54, '#0a0604');
    c.save(); c.globalCompositeOperation = 'lighter'; P.shaft(60, 0, 60, 180, 216, 200, '255,220,170', 0.1, 4); c.restore();
    cam(lerp(1, 1.12, ease(k)), 180, 110, function () {
      // соседи по полке
      P.bottle(60, 150, 12, 34, '#2a4a3a'); E(100, 140, 10, 10, P.brassG(90, 110)); E(100, 140, 7.6, 7.6, '#e8e0c8'); P.hands(100, 140, 7.6, 2.75, 45);
      // кукла-наследник
      const x = 180;
      c.beginPath(); c.moveTo(x - 16, 150); c.quadraticCurveTo(x - 18, 112, x - 10, 98); c.lineTo(x + 10, 98); c.quadraticCurveTo(x + 18, 112, x + 16, 150); c.closePath(); c.fillStyle = P.LG(x - 18, 0, x + 18, 0, [0, '#0e0e12', 0.5, '#2a2a34', 1, '#0a0a0e']); c.fill();
      R(x - 10, 96, 20, 6, '#6a2a2a');
      E(x, 82, 13, 15, P.RG(x - 4, 78, 0, 18, [0, '#f8f0e8', 0.7, '#d8ccc0', 1, '#a89a8c']));
      c.beginPath(); c.arc(x, 78, 14, 3.3, 6.15); c.strokeStyle = '#2a1a10'; c.lineWidth = 6; c.stroke();
      const look = ease(seg(t, 6500, 7400)) * 1.6;
      [-5, 5].forEach(function (d) { E(x + d, 83, 2.8, 1.8, '#fff'); E(x + d + look, 83, 1.4, 1.4, '#2a3a5a'); E(x + d + look, 83, 0.6, 0.6, '#000'); });
      E(x - 9, 89, 2.4, 1.4, 'rgba(220,120,120,0.35)'); E(x + 9, 89, 2.4, 1.4, 'rgba(220,120,120,0.35)'); P.line(x - 2.4, 91, x + 2.4, 91, '#8a3a3a', 0.6);
      R(x - 12, 99, 1.6, 1.6, 'rgba(255,255,255,0.4)');
      P.line(x + 6, 82.6, x + 5.6, 85, 'rgba(140,40,30,0.6)', 0.2);
      const tq = seg(t, 8200, 9600); if (tq > 0) { E(x + 6.4, 86 + tq * 6, 0.6, 0.9, 'rgba(220,235,245,0.8)'); }
      // бирка на нитке
      c.strokeStyle = 'rgba(200,190,160,0.8)'; c.lineWidth = 0.3; c.beginPath(); c.moveTo(x + 8, 100); c.quadraticCurveTo(x + 30, 116, x + 40, 112); c.stroke();
      c.save(); c.translate(x + 74, 120); c.rotate(0.06);
      R(-34, -18, 76, 40, P.LG(0, -18, 0, 22, [0, '#e8dcbc', 1, '#c8b890'])); E(-30, -14, 1.4, 1.4, '#0a0604');
      const L = ['Наследник.', 'Состояние хорошее.', 'Память — частично.', 'Цена договорная.'];
      L.forEach(function (s, i) { txt(s, -26, -6 + i * 8, 'italic 6px ' + HAND, 'rgba(30,20,30,0.9)', 'left', seg(t, 800 + i * 1300, 1800 + i * 1300)); });
      c.restore();
    });
  }
  function backwardShot(t, k, now) {
    sky([0, '#2a3034', 1, '#5a6064'], 216);
    for (let i = 0; i < 6; i++) { const s = 1 / (1 + i * 0.5), x1 = 192 - 150 * s, x2 = 192 + 150 * s, y = 120 + 90 * s; [x1, x2].forEach(function (x) { R(x - 1 * s, y - 80 * s, 2 * s, 80 * s, 'rgba(20,24,26,' + (0.8 * s).toFixed(2) + ')'); P.glow(x, y - 80 * s, 16 * s, '255,210,150', 0.2 * s); }); }
    R(0, 140, W, 76, P.LG(0, 140, 0, 216, [0, '#4a5054', 1, '#2a2e30']));
    const p = ease(seg(t, 800, 10000)), s = lerp(1, 0.32, p), y = lerp(212, 150, p);
    fig(192, y, 130 * s, { col: '#0a0c0e', a: 1 - p * 0.75, walk: -now / 500, face: 'rgba(170,175,172,0.5)', scarfTail: true, blur: p * 2 });
    P.fog(40, 180, now, 3, 0.4 + p * 0.4, '170,176,180', 2);
  }
  function distantShot(t, k, now) {
    sky([0, '#06080a', 1, '#1a2024'], 216);
    P.puff(192, 119, 22, 14, '255,180,100', 0.75); P.puff(192, 103, 24, 4, '60,40,20', 0.7);
    P.glow(192, 118, 70, '255,170,90', 0.22);
    R(0, 140, W, 76, P.LG(0, 140, 0, 216, [0, '#12161a', 1, '#06080a']));
    E(192, 160, 80, 6, 'rgba(255,170,90,0.08)');
    const p = ease(seg(t, 500, 10000));
    fig(lerp(220, 196, p), lerp(214, 150, p), lerp(110, 30, p), { col: '#040506', walk: now / 700, long: true, a: 0.95, rim: 'rgba(255,180,110,0.25)', rimDx: -0.6 });
    P.fog(60, 160, now, 3, 0.65, '140,150,156', 1);
    P.fog(120, 100, now + 3000, 7, 0.45, '140,150,156', 4);
  }
  function ringerShot(t, k, now) {
    sky([0, '#f8d8a0', 0.6, '#e8a878', 1, '#8a6a7a'], 216);
    P.glow(192, 100, 200, '255,230,170', 0.3, 'source-over');
    flock(now, 80, 70, 6, 14, -6, 3, 'rgba(240,240,240,0.7)', 1.2);
    // стены звонницы: три арки
    c.fillStyle = '#4a3c34';
    R(0, 0, W, 20, P.LG(0, 0, 0, 20, [0, '#2a201a', 1, '#4a3c34']));
    [0, 128, 256].forEach(function (x, i) { R(x - 10, 0, 22, 216, P.LG(x - 10, 0, x + 12, 0, [0, '#2a201a', 0.5, '#6a5a4a', 1, '#2a201a'])); });
    R(378, 0, 10, 216, '#2a201a');
    R(0, 170, W, 46, P.LG(0, 170, 0, 216, [0, '#5a4a3a', 1, '#2a2018'])); P.boards(0, 170, W, 46, 6, '#5a4a3a', 2);
    c.save(); c.globalCompositeOperation = 'lighter'; P.shaft(192, 20, 100, 230, 216, 160, '255,220,160', 0.18, 4); c.restore();
    P.motes(now, 120, 30, 160, 150, 40, 5, '255,240,200', 0.6);
    // немой колокол и звонарь у него
    R(150, 22, 150, 6, P.LG(0, 22, 0, 28, [0, '#5a4430', 1, '#2a1e14']));
    R(224, 28, 4, 62, '#2a1a0e');
    bellShape(226, 88, 42, 0);
    for (let i = 0; i < 3; i++) R(204 - i * 6, 112 + i * 9, 44 + i * 12, 0.8, 'rgba(255,230,170,0.22)');
    const sx = 168, sy = 186;
    c.save(); c.translate(sx, sy);
    c.beginPath(); c.moveTo(-14, 0); c.lineTo(-10, -30); c.quadraticCurveTo(0, -38, 8, -30); c.lineTo(14, 0); c.closePath(); c.fillStyle = P.LG(-14, 0, 14, 0, [0, '#1a1612', 0.6, '#3a3228', 1, '#4a4034']); c.fill();
    c.beginPath(); c.moveTo(6, -4); c.lineTo(32, -6); c.lineTo(32, 0); c.lineTo(4, 2); c.closePath(); c.fillStyle = '#2a241c'; c.fill();
    // голова чуть склонена к колоколу, глаза закрыты, тихая улыбка в бороде
    c.rotate(0.12);
    E(0, -42, 6.4, 7.6, P.LG(-6, 0, 6, 0, [0, '#8a6448', 0.5, '#c8a486', 1, '#a07a5c']));
    E(-0.6, -47.4, 6.8, 4, '#c8c4bc');
    c.beginPath(); c.moveTo(-5.6, -40); c.quadraticCurveTo(-4, -29, 0, -28); c.quadraticCurveTo(4, -29, 5.6, -40); c.quadraticCurveTo(0, -37, -5.6, -40); c.fillStyle = '#d8d4cc'; c.fill();
    c.strokeStyle = 'rgba(40,24,14,0.75)'; c.lineWidth = 0.45;
    c.beginPath(); c.moveTo(-3.6, -43); c.quadraticCurveTo(-2.4, -42.2, -1.2, -43); c.stroke(); c.beginPath(); c.moveTo(1.2, -43); c.quadraticCurveTo(2.4, -42.2, 3.6, -43); c.stroke();
    c.beginPath(); c.moveTo(-1.6, -38.4); c.quadraticCurveTo(0, -37.4, 1.6, -38.4); c.stroke();
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; P.glow(sx, sy - 40, 30, '255,220,170', 0.2); c.restore();
  }
  function stoveShot(t, k, now) {
    cam(lerp(2.3, 2.5, ease(k)), 50, 100, function () {
      c.drawImage(P.locBack('agata'), 0, 0, W, H);
      c.save(); P.arch(28, 84, 44, 34); c.clip();
      R(28, 84, 44, 34, '#120602'); P.glow(50, 112, 30, '255,110,30', 0.6);
      const burn = seg(t, 0, 9000);
      c.save(); c.translate(50, 110); c.rotate(-0.08);
      P.rr(-14, -6, 28, 10, 0.8, P.LG(0, -6, 0, 4, [0, '#2a0a0a', 1, '#0a0202']));
      for (let i = 0; i < 6; i++) { const cv = Math.sin(now / 300 + i) * 1.4; c.beginPath(); c.moveTo(-10 + i * 4, -6); c.quadraticCurveTo(-8 + i * 4, -11 - cv - burn * 3, -6 + i * 4, -6); c.closePath(); c.fillStyle = 'rgba(230,210,170,' + (0.9 - burn * 0.6).toFixed(2) + ')'; c.fill(); }
      c.restore();
      for (let i = 0; i < 9; i++) { const x = 32 + i * 4.4, h = 10 + Math.sin(now / (60 + i * 13) + i) * 4 + Math.sin(now / 27 + i) * 1.6; c.beginPath(); c.moveTo(x - 3, 114); c.quadraticCurveTo(x - 2, 114 - h * 0.6, x + Math.sin(now / 80 + i) * 1.6, 114 - h); c.quadraticCurveTo(x + 2, 114 - h * 0.6, x + 3, 114); c.closePath(); c.fillStyle = P.RG(x, 112, 0, h, [0, 'rgba(255,240,190,0.95)', 0.4, 'rgba(255,160,60,0.85)', 1, 'rgba(200,50,10,0)']); c.fill(); }
      const r = P.RNG(Math.floor(now / 90)); for (let i = 0; i < 10; i++) E(30 + r() * 40, 110 - r() * 26, 0.3, 0.3, 'rgba(255,210,140,0.95)');
      c.restore();
      P.glow(50, 104, 60, '255,120,40', 0.2);
    });
    // руки греются у огня
    [[140, 1], [246, -1]].forEach(function (h) {
      c.save(); c.translate(h[0], 204); c.scale(h[1] * 1.3, 1.3); c.rotate(-0.45);
      R(-40, -10, 30, 22, '#1a1410'); E(-6, 0, 12, 9, '#a87a5a');
      for (let i = 0; i < 4; i++) P.rr(2, -8 + i * 4.4, 16 - Math.abs(i - 1.5) * 2, 3.8, 1.9, '#b8886a');
      c.globalCompositeOperation = 'lighter'; E(4, -2, 12, 8, 'rgba(255,140,60,0.25)');
      c.restore();
    });
    P.glow(192, 110, 220, '255,120,50', 0.08);
  }
  function clocksShot(t, k, now) {
    cam(lerp(1.15, 1.02, ease(k)), lerp(150, 200, ease(k)), 70, function () {
      c.drawImage(P.locBack('clock'), 0, 0, W, H);
      const run = ease(seg(t, 500, 2000)), r = P.RNG(3);
      P.clocks.forEach(function (q) { const sp = 0.3 + r() * 3, base = r() * 12; P.face(q[0], q[1], q[2], { wood: q[3] === 2, h: 2.75 + run * (base + now / 1000 * sp / 60), m: (45 + run * (base * 60 + now / 1000 * sp)) % 60 }); });
      P.face(192, 27, 9.6, { paper: '#e8dcbc', h: 2.75 + run * now / 600000, m: (45 + run * now / 10000) % 60 });
      [[24, 26], [363, 26]].forEach(function (q, i) {
        P.face(q[0], q[1], 10, { paper: '#ece2c8', h: 2.75 + run * (i * 5 + now / 300000), m: (45 + run * now / 5000 * (i + 1)) % 60 });
        c.save(); c.beginPath(); c.rect(q[0] - 10.6, 40.6, 21.2, 54.8); c.clip(); R(q[0] - 11, 40, 22, 56, '#0c0602');
        const a = Math.sin(now / 520 + i) * 0.3 * run; c.save(); c.translate(q[0], 42); c.rotate(a); R(-0.4, 0, 0.8, 40, P.brassG(-0.5, 0.5)); E(0, 42, 4.4, 4.4, P.brassG(-4.4, 4.4)); c.restore();
        c.restore();
      });
      P.motes(now, 0, 0, W, 120, 50, 9, '255,230,180', 0.5);
    });
    P.glow(60, 110, 140, '255,200,130', 0.1);
  }
  function boatShot(t, k, now) {
    sky([0, '#1a2028', 0.6, '#4a5056', 1, '#6a6e70'], 130);
    const p = ease(k);
    // Мглов на берегу слева: уменьшается и тонет в тумане
    c.save(); c.translate(lerp(90, 40, p), 122); c.scale(lerp(1, 0.45, p), lerp(1, 0.45, p));
    town(0, '#101418', 41, { x0: -120, x1: 120, lit: 0.3, glow: 0.1 }); churchSil(-20, -10, 1, '#101418', '#3a3020'); tower(60, -8, 0.8, '#101418');
    c.restore();
    P.fog(70, 80, now, 3, 0.3 + p * 0.6, '160,168,174', 3);
    R(0, 120, W, 96, P.LG(0, 120, 0, 216, [0, '#2a3238', 1, '#0a0e12']));
    for (let i = 0; i < 60; i++) { const y = 122 + (i * 3.7) % 90, x = ((i * 57 - now / (30 - (y - 120) / 6)) % (W + 40) + W + 40) % (W + 40) - 20; P.line(x, y, x + 6 + (y - 120) / 6, y, 'rgba(170,185,195,' + (0.06 + (y - 120) / 900).toFixed(3) + ')', 0.3); }
    // лодка
    const b = Math.sin(now / 1100) * 1.2, a = Math.sin(now / 1500) * 0.02;
    c.save(); c.translate(220, 170 + b); c.rotate(a);
    c.beginPath(); c.moveTo(-80, -6); c.quadraticCurveTo(-70, 16, -40, 18); c.lineTo(50, 18); c.quadraticCurveTo(76, 14, 86, -8); c.lineTo(-80, -6); c.closePath(); c.fillStyle = P.LG(0, -8, 0, 18, [0, '#4a3420', 1, '#0a0604']); c.fill();
    R(-80, -8, 166, 3, '#5a4028');
    fig(-60, -6, 64, { col: '#08090a', hat: 'cap', long: true });
    P.line(-52, -46, -30, 40, '#2a1a0e', 1.2);
    fig(20, -2, 40, { col: '#0a0b0c', noArms: true, scarfTail: true, flip: true });
    c.restore();
    P.fog(150, 60, now, 8, 0.35, '160,168,174', 6);
  }
  function teaShot(t, k, now) {
    R(0, 0, W, H, P.LG(0, 0, 0, H, [0, '#3a2a1c', 1, '#1a120a'])); P.tex(0, 0, W, H, 0.5, 'overlay', 'mot', 1.2);
    // окно буфета: поезд и перрон
    const wx = 40, wy = 16, ww = 220, wh = 110;
    R(wx - 6, wy - 6, ww + 12, wh + 12, '#2a1a0e');
    c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip();
    R(wx, wy, ww, wh, P.LG(0, wy, 0, wy + wh, [0, '#1a2430', 1, '#2a3440']));
    c.save(); c.translate(0, 0); for (let i = 0; i < 3; i++) carriage(wx - 40 + i * 96, wy + 90, 92, 34, true, now); c.restore();
    R(wx, wy + 90, ww, 30, '#1a1c1e'); P.glow(wx + 160, wy + 30, 40, '255,210,150', 0.2);
    puffs(now, wx + 200, wy + 40, 6, 3000, -40, -20, '200,200,205', 8, 4);
    c.restore();
    R(wx + ww / 2 - 2, wy, 4, wh, '#2a1a0e');
    // стол и чай
    R(0, 140, W, 76, P.LG(0, 140, 0, 216, [0, '#d8d0c0', 1, '#8a8274'])); for (let x = 0; x < W; x += 12) R(x, 140, 6, 76, 'rgba(160,40,30,0.08)');
    cam(lerp(1, 1.12, ease(k)), 220, 150, function () {
      E(220, 186, 30, 7, 'rgba(0,0,0,0.25)'); E(220, 184, 26, 6, '#ece6dc'); E(220, 183, 20, 4.4, '#d8d2c6');
      c.beginPath(); c.moveTo(206, 182); c.lineTo(204, 132); c.lineTo(236, 132); c.lineTo(234, 182); c.closePath(); c.fillStyle = 'rgba(150,70,20,0.75)'; c.fill();
      R(205, 132, 30, 4, 'rgba(255,255,255,0.15)');
      c.beginPath(); c.moveTo(205.6, 183); c.lineTo(204.6, 156); c.lineTo(235.4, 156); c.lineTo(234.4, 183); c.closePath(); c.fillStyle = P.brassG(204, 236); c.fill();
      for (let i = 0; i < 4; i++) { c.strokeStyle = 'rgba(60,40,10,0.4)'; c.lineWidth = 0.4; c.beginPath(); c.arc(212 + i * 6, 168, 2.4, 0, 6.28); c.stroke(); }
      c.save(); c.beginPath(); c.arc(240, 166, 7, -1.3, 1.3); c.strokeStyle = P.brassG(236, 247); c.lineWidth = 2; c.stroke(); c.restore();
      P.line(226, 132, 232, 116, '#c8c8d0', 0.6); E(222, 134, 7, 1.4, 'rgba(230,200,80,0.6)');
      R(258, 176, 6, 6, '#f4f2ea'); R(266, 178, 5, 5, '#f4f2ea');
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { const p = ((now / 2800 + i / 6) % 1); E(220 + Math.sin(now / 700 + i + p * 5) * 4 * p, 128 - p * 50, 3 + p * 8, 2 + p * 5, 'rgba(240,240,235,' + (0.12 * (1 - p)).toFixed(3) + ')'); }
      c.restore();
    });
    P.glow(300, 40, 160, '255,200,130', 0.1);
  }
  function shadowShot(t, k, now) {
    sky([0, '#04060a', 1, '#10161c'], 216);
    R(0, 140, W, 76, P.LG(0, 140, 0, 216, [0, '#2a2c2e', 1, '#0c0d0e'])); R(0, 140, W, 1.4, '#4a4c4e');
    const lx = 120;
    R(lx - 1.4, 50, 2.8, 92, '#0c0e10'); P.poly([lx - 6, 46, lx + 6, 46, lx + 4.6, 58, lx - 4.6, 58], 'rgba(255,220,160,0.7)');
    P.glow(lx, 52, 90, '255,210,150', 0.22); P.shaft(lx, 58, 10, lx, 190, 120, '255,210,150', 0.08, 2);
    E(lx, 172, 70, 10, 'rgba(255,210,150,0.07)');
    // часы на столбе
    const hx = 300, hy = 40;
    R(hx - 1, hy + 12, 2, 100, '#0c0e10');
    const snap = seg(t, 5200, 5300), sp = 1 - snap;
    P.face(hx, hy, 12, { paper: '#e8e0c8', h: snap ? 2.75 : (2.75 + now / 300) % 12, m: snap ? 45 : (now / 20) % 60 });
    if (t > 5200 && t < 5600) P.glow(hx, hy, 20, '255,255,240', 0.3);
    // ты — и тень не в ту сторону
    const fx = 220;
    fig(fx, 176, 70, { col: '#08090a', scarfTail: true, rim: 'rgba(255,210,150,0.4)', rimDx: -0.8 });
    // нормальная тень легла бы вправо, от фонаря; эта тянется к нему
    c.save(); c.translate(fx, 176); c.transform(1, 0, 1.4, 0.3, 0, 0); c.globalAlpha = 0.55;
    fig(0, 0, 70, { col: '#000', scarfTail: true }); c.restore();
    P.fog(100, 110, now, 4, 0.3, '150,160,168', 3);
  }

  /* ============================================================
     ПРОИГРЫВАТЕЛЬ
     ============================================================ */
  const CUE = {
    knock1: function () { Sfx.knock(1, false); }
  };
  const DEF = {}, DEFC = {};   // заставки из других файлов (вступление — js/intro.js) и их уборка памяти
  function define(id, fn, clean) { DEF[id] = fn; if (clean) DEFC[id] = clean; }
  function cleanup(id) { if (DEFC[id]) setTimeout(function () { if (!cur || cur.id !== id) try { DEFC[id](); } catch (e) {} }, 800); }
  const fast = function () { return TS < 0.5 || window.__autoPuzzle || window.__noHD || window.__filmLite; };
  /* тяжёлые слои плана рисуются заранее: первый — до показа, следующий — пока идёт текущий */
  function prepShot(s) { if (s && s.prep && !s._prepped) { s._prepped = true; try { s.prep(); } catch (e) { console.error(e); } } }
  function build(id) {
    if (DEF[id]) return DEF[id]();
    if (id === 'intro') return introShots();
    const list = ENDS[id]; if (!list) return null;
    const E = (typeof ENDINGS !== 'undefined' && ENDINGS[id]) ? ENDINGS[id].text : [];
    return list.map(function (s, i) { return { d: s.d, cues: s.cues, draw: s.draw, cap: E[i] || '' }; });
  }
  function capEl() { return document.querySelector('.film-cap'); }
  function setCap(s) { const e = capEl(); if (!e) return; e.textContent = ''; e.classList.toggle('on', !!s); }
  function ui() {
    showScreen('<div class="film-ui"><div class="film-cap"></div><div class="film-hint">▼</div><button class="film-skip" data-act="skip">Пропустить ▸▸</button></div>', 'film', function (b) {
      if (b && b.dataset.act === 'skip') { skip(); return; }
      advance();
    });
  }
  function keys(e) {
    if (!cur || cur.done) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); advance(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); skip(); }
  }
  function start(i) {
    cur.i = i; cur.t0 = performance.now(); cur.out = 0; cur.fired = {}; cur.typed = 0; cur.typeDone = false;
    setCap(cur.shots[i].cap);
    const h = document.querySelector('.film-hint'); if (h) h.style.opacity = '0';
    const nx = cur.shots[i + 1], me = cur;
    if (nx && nx.prep && !fast()) setTimeout(function () { if (cur === me) prepShot(nx); }, 500);
  }
  function advance() {
    if (!cur || cur.done) return;
    if (!cur.typeDone && cur.shots[cur.i].cap) { cur.typeAll = true; return; }
    if (!cur.out) cur.out = performance.now();
  }
  function finish(skipped) {
    if (!cur) return;
    const res = cur.res;
    document.removeEventListener('keydown', keys, true);
    if (cur.hold) { cur.done = true; cur.i = cur.shots.length - 1; cur.out = 0; cur.res = null; if (!cur.t0) cur.t0 = performance.now(); }
    else { cleanup(cur.id); cur = null; hideScreen(); }
    if (res) res(!!skipped);
  }
  function skip() {
    if (!cur || cur.done) return;
    if (cur.hold) { start(cur.shots.length - 1); cur.t0 = performance.now() - cur.shots[cur.i].d; }
    finish(true);
  }
  function play(id, o) {
    o = o || {};
    const shots = build(id);
    if (!shots || !shots.length) return Promise.resolve();
    stop();
    if (!fast()) prepShot(shots[0]);
    return new Promise(function (res) {
      cur = { id: id, shots: shots, res: res, hold: !!o.hold, done: false };
      ui(); start(0);
      document.addEventListener('keydown', keys, true);
      if (TS < 0.5 || window.__autoPuzzle) setTimeout(function () { if (cur && !cur.done) { if (cur.hold) start(shots.length - 1); finish(false); } }, 40);
    });
  }
  function stop() { if (!cur) return; document.removeEventListener('keydown', keys, true); cleanup(cur.id); cur = null; }
  function draw(now) {
    c = P.ctx();
    if (cur.frozen !== undefined) { cur.frames = (cur.frames || 0) + 1; if (cur.frames > 4) return; }   // отладочный стоп-кадр
    const sh = cur.shots[cur.i], t = cur.frozen !== undefined ? cur.frozen : now - cur.t0;
    if (!window.__filmLite) prepShot(sh);   // __filmLite — отладка: только логика смены планов, без рисования
    // звуки по таймлайну
    if (!cur.done && sh.cues) sh.cues.forEach(function (q, j) { if (!cur.fired[j] && t >= q[0]) { cur.fired[j] = true; try { (CUE[q[1]] || Sfx[q[1]] || function () {})(); } catch (e) {} } });
    // субтитры печатаются
    if (!cur.done && sh.cap) {
      const e = capEl(), n = cur.typeAll ? sh.cap.length : Math.floor(Math.max(0, t - 600) / 1000 * 42 * (typeof SET !== 'undefined' ? SET.speed : 1));
      if (e && n !== cur.typed) { cur.typed = Math.min(n, sh.cap.length); e.textContent = sh.cap.slice(0, cur.typed); }
      if (cur.typed >= sh.cap.length && !cur.typeDone) { cur.typeDone = true; cur.typeAt = t; cur.typeAll = false; const h = document.querySelector('.film-hint'); if (h) h.style.opacity = '1'; }
    } else if (!cur.done && !cur.typeDone) { cur.typeDone = true; cur.typeAt = t; }
    // сам кадр
    R(0, 0, W, H, '#000');
    c.save();
    if (!window.__filmLite) try { sh.draw(t, clamp(t / sh.d), now); } catch (err) { console.error(err); }
    c.restore();
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
    P.post(now, null, 0.85);
    // киношные поля и затемнение под субтитры
    R(0, 0, W, 9, '#000'); R(0, H - 9, W, 9, '#000');
    if (sh.cap && !cur.done) R(0, H - 60, W, 51, P.LG(0, H - 60, 0, H - 9, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.75)']));
    // переходы через чёрное
    let fade = 1 - seg(t, 0, 700);
    if (cur.out) fade = Math.max(fade, seg(now, cur.out, cur.out + 600));
    if (fade > 0) R(0, 0, W, H, 'rgba(0,0,0,' + fade.toFixed(3) + ')');
    if (cur.done || cur.frozen !== undefined) return;
    // смена плана
    const auto = Math.max(sh.d, (cur.typeAt || 0) + 2200 + (sh.cap || '').length * 30);
    if (!cur.out && t > auto) cur.out = now;
    if (cur.out && now - cur.out > 600) {
      if (cur.i + 1 < cur.shots.length) start(cur.i + 1);
      else finish();
    }
  }
  /* для отладки: застывший кадр */
  function dev(id, i, ms) {
    const shots = build(id); if (!shots) return;
    cur = { id: id, shots: shots, res: null, hold: false, done: false };
    ui(); start(Math.min(i, shots.length - 1)); cur.frozen = ms; cur.typeAll = true;
  }
  return { play: play, stop: stop, active: function () { return !!cur; }, draw: draw, dev: dev, define: define, has: function (id) { return id === 'intro' || !!ENDS[id] || !!DEF[id]; },
    state: function () { return cur ? { i: cur.i, n: cur.shots.length, done: cur.done, typed: cur.typed, out: !!cur.out } : null; } };
})();
