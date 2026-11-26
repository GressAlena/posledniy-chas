'use strict';
/* ============================================================
   КОНЦОВКИ — по четыре плана на каждую, тем же «киноязыком»,
   что и вступление (кисти и сцены — из js/intro.js, KINO).
   Свои декорации: лавка изнутри в перспективе, крыльцо крупно,
   зеркало через плечо, чёрная книга, письмо при лампе, паперть,
   колокольня, кукла, станционный буфет. Из вступления — город,
   Сенная (ночью и утром), вокзал, стол с письмом, гроссбух;
   из игры — изба Агаты и мастерская Гофмана.
   Подписи — абзацы концовки из ENDINGS (js/story.js).
   ============================================================ */
(function () {
  if (typeof Film === 'undefined' || !Film.define || typeof KINO === 'undefined') return;
  const KN = KINO, P = HD.api, W = 384, H = 216;
  const R = KN.R, E = KN.E, poly = KN.poly, line = KN.line, LG = KN.LG, RG = KN.RG, layer = KN.layer, blurred = KN.blurred;
  const camIn = KN.camIn, cam = KN.cam, txt = KN.txt, lighter = KN.lighter, gl = KN.gl, soft = KN.soft, bloom = KN.bloom, person = KN.person;
  const clamp = KN.clamp, ease = KN.ease, seg = KN.seg, lerp = KN.lerp, hsh = KN.hsh, HAND = KN.HAND, SERIF = KN.SERIF;
  const PV = KN.PV, Q = KN.Q, L3 = KN.L3;
  function X() { return KN.ctx(); }   // текущий холст: кадр или слой, в который сейчас рисуем
  const CACHE = {};
  function once(k, fn) { if (!CACHE[k]) CACHE[k] = fn(); return CACHE[k]; }

  /* ============================================================
     ОБЩИЕ КИСТИ
     ============================================================ */
  function maskL(a, col, lights) {
    return layer(function () {
      const c = X();
      c.fillStyle = 'rgba(' + col + ',' + a + ')'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'destination-out';
      lights.forEach(function (l) {
        const k = l[3] === undefined ? 1 : l[3];
        c.save(); c.translate(l[0], l[1]); if (l[4]) c.scale(1, l[4]);
        const q = c.createRadialGradient(0, 0, 0, 0, 0, l[2]);
        q.addColorStop(0, 'rgba(0,0,0,' + k + ')'); q.addColorStop(0.45, 'rgba(0,0,0,' + (k * 0.55).toFixed(3) + ')'); q.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = q; c.fillRect(-l[2], -l[2], l[2] * 2, l[2] * 2); c.restore();
      });
      c.globalCompositeOperation = 'source-over';
    });
  }
  /* темнота с «окнами» света: [x, y, радиус, сила, сплющенность] */
  function lightMask(a, col, lights) { X().drawImage(maskL(a, col, lights), 0, 0, W, H); }
  function vign(a, cx, cy, r0) { R(0, 0, W, H, RG(cx || 192, cy || 108, r0 || 60, 250, [0, 'rgba(0,0,0,0)', 0.55, 'rgba(0,0,0,' + (a * 0.35).toFixed(3) + ')', 1, 'rgba(0,0,0,' + a + ')'])); }
  function desat(a) { if (!(a > 0)) return; const c = X(); c.save(); c.globalCompositeOperation = 'saturation'; c.fillStyle = 'rgba(128,128,128,' + clamp(a).toFixed(3) + ')'; c.fillRect(0, 0, W, H); c.restore(); }
  function fp(f, fill) { const c = X(); c.beginPath(); f(c); c.fillStyle = fill; c.fill(); }
  function damask(x0, y0, w, h, col, a, sc) {
    const c = X(); sc = sc || 1; c.fillStyle = 'rgba(' + col + ',' + a + ')';
    const dx = 20 * sc, dy = 16 * sc;
    for (let y = y0 + 6 * sc, row = 0; y < y0 + h + dy; y += dy, row++) for (let x = x0 + (row % 2) * dx / 2; x < x0 + w + dx; x += dx) {
      c.beginPath(); c.moveTo(x, y - 6 * sc); c.bezierCurveTo(x + 4 * sc, y - 2 * sc, x + 4 * sc, y + 2 * sc, x, y + 5 * sc); c.bezierCurveTo(x - 4 * sc, y + 2 * sc, x - 4 * sc, y - 2 * sc, x, y - 6 * sc); c.fill();
      c.beginPath(); c.ellipse(x - 4 * sc, y + 3 * sc, 1.8 * sc, 0.8 * sc, 0.6, 0, 6.28); c.fill(); c.beginPath(); c.ellipse(x + 4 * sc, y + 3 * sc, 1.8 * sc, 0.8 * sc, -0.6, 0, 6.28); c.fill();
    }
  }
  function plankWall(x0, y0, w, h, base, seed, ph) {
    const r = P.RNG(seed); ph = ph || 4.2;
    for (let y = y0; y < y0 + h; y += ph) {
      const t = 0.82 + r() * 0.32;
      R(x0, y, w, ph, LG(0, y, 0, y + ph, [0, P.sh(base, t * 1.32), 0.2, P.sh(base, t), 0.85, P.sh(base, t * 0.8), 1, P.sh(base, t * 0.4)]));
      for (let i = 0; i < 4; i++) { const gy = y + 0.6 + r() * (ph - 1.2); line(x0, gy, x0 + w, gy + (r() - 0.5) * 0.5, 'rgba(10,5,2,' + (0.08 + r() * 0.14).toFixed(2) + ')', 0.16); }
      if (r() < 0.7) E(x0 + r() * w, y + ph / 2, 1.3, 0.6, 'rgba(10,5,2,0.4)');
      for (let k = 0; k < 2; k++) { const jx = x0 + r() * w; line(jx, y, jx, y + ph, 'rgba(0,0,0,0.5)', 0.22); E(jx + 1.4, y + ph / 2, 0.3, 0.3, 'rgba(30,26,22,0.8)'); }
    }
  }
  function breath(x, y, now, a, dir) { for (let i = 0; i < 5; i++) { const p = ((now / 2800 + i / 5) % 1); soft(x + (dir || 1) * p * 9, y - p * 7, 1 + p * 5, 0.8 + p * 3.4, '236,238,242', a * Math.sin(p * Math.PI)); } }
  function birds(now, n, x0, y0, vx, vy, col, sc, seed) {
    const c = X(); sc = sc || 1; c.save(); c.strokeStyle = col; c.lineWidth = 0.5 * sc; c.beginPath();
    for (let i = 0; i < n; i++) {
      const t = now / 1000, bx = x0 + t * vx + (hsh(i + (seed || 0)) - 0.5) * 60 * sc, by = y0 + t * vy + (hsh(i + 9 + (seed || 0)) - 0.5) * 24 * sc, w = Math.sin(now / (90 + i * 7) + i) * 1.6 * sc, s = 2.6 * sc;
      c.moveTo(bx - s, by - w); c.quadraticCurveTo(bx - s * 0.4, by - 0.3 * sc, bx, by + 0.3 * sc); c.quadraticCurveTo(bx + s * 0.4, by - 0.3 * sc, bx + s, by - w);
    }
    c.stroke(); c.restore();
  }
  function snowFx(now, n, a, seed) {
    const c = X(), r = P.RNG(seed || 5); c.save(); c.fillStyle = 'rgba(245,248,255,' + a + ')'; c.beginPath();
    for (let i = 0; i < n; i++) { const z = 0.4 + r() * 0.9, x = ((r() * (W + 40) + Math.sin(now / (900 + i * 13) + i) * 8 * z + now / 1000 * 4) % (W + 40)) - 20, y = (r() * H + now / 1000 * 10 * z) % H, s = 0.4 * z; c.moveTo(x + s, y); c.arc(x, y, s, 0, 6.2832); }
    c.fill(); c.restore();
  }
  function pigeon(x, y, s, now, i, col) {
    const c = X(), peck = Math.sin(now / 380 + i * 2.1) > 0.75 ? 1 : 0;
    c.save(); c.translate(x, y); c.scale(s, s);
    E(0, -2.6, 4.2, 2.6, col || '#6a6a72'); E(-3.6, -2.2, 2.2, 1.1, col || '#5a5a62', 0.3);
    E(3.4, -4.6 + peck * 2, 1.7, 1.6, col || '#76767e'); poly([4.9, -4.6 + peck * 2, 6.4, -4 + peck * 2, 4.9, -3.6 + peck * 2], '#3a3030');
    line(0, 0, -0.6, 1.6, '#a05a4a', 0.35); line(1.4, 0, 1.4, 1.6, '#a05a4a', 0.35);
    c.restore();
  }

  /* ============================================================
     СИЛУЭТЫ
     ============================================================ */
  /* старик сидит в профиль, лицом вправо; (x,y) — где он сидит. o.watch — часы у уха, o.lean — голова откинута */
  const OB = [
    function (c) { c.moveTo(11, -4); c.lineTo(16.5, -4); c.lineTo(18, 15.5); c.lineTo(13, 15.5); c.closePath(); },
    function (c) { c.roundRect(12, 14, 10.5, 3.6, 1.5); },
    function (c) { c.moveTo(-6, 1); c.quadraticCurveTo(-6, -9, 2, -10.5); c.lineTo(17, -8.6); c.quadraticCurveTo(19.5, -5, 17.5, -2); c.lineTo(-6, 2.4); c.closePath(); },
    function (c) { c.moveTo(-8.5, 1.5); c.bezierCurveTo(-11.5, -12, -10.5, -27, -4, -34); c.quadraticCurveTo(1, -37, 6.4, -33.6); c.bezierCurveTo(9.4, -26, 8.4, -12, 7.4, -1.5); c.closePath(); }
  ];
  const O_KNEE = function (c) { c.moveTo(-1, -29); c.quadraticCurveTo(7, -20, 13, -11.5); c.lineTo(10.8, -10); c.quadraticCurveTo(5, -18, -3, -26); c.closePath(); };
  const O_EAR = function (c) { c.moveTo(4, -30.5); c.quadraticCurveTo(11.6, -27, 11.2, -23.6); c.quadraticCurveTo(9.4, -30, 7.6, -37); c.lineTo(5.2, -36.6); c.quadraticCurveTo(7.2, -31.6, 3.6, -28); c.closePath(); };
  const O_LAP = function (c) { c.moveTo(3, -30); c.quadraticCurveTo(9, -21, 12.4, -12.4); c.lineTo(10, -11.2); c.quadraticCurveTo(6.4, -19, 1.4, -27); c.closePath(); };
  const OH = [
    function (c) { c.rect(-0.8, -38, 3.6, 4.6); },
    function (c) { c.ellipse(1.6, -40.8, 5.3, 5.2, 0, 0, 6.2832); },
    function (c) { c.moveTo(5.4, -42.4); c.lineTo(8.4, -38.4); c.lineTo(6.4, -37.6); c.closePath(); }
  ];
  const O_HAIR = function (c) { c.moveTo(-3.6, -38); c.bezierCurveTo(-5.4, -43, -2.4, -47.2, 2.4, -46.4); c.bezierCurveTo(5.4, -46, 6.6, -44.6, 6.4, -43.4); c.bezierCurveTo(3, -44.4, -0.4, -43, -0.6, -38.6); c.closePath(); };
  const O_BEARD = function (c) { c.moveTo(1.6, -38.2); c.quadraticCurveTo(1.8, -30.6, 5.6, -30.2); c.quadraticCurveTo(8.6, -32.6, 7.6, -37); c.quadraticCurveTo(4.6, -35.6, 1.6, -38.2); c.closePath(); };
  const O_CAP = function (c) { c.moveTo(-4.8, -42.6); c.bezierCurveTo(-5.6, -48.4, 4.4, -49.6, 6.2, -44.4); c.lineTo(10, -43.4); c.lineTo(9.8, -42.3); c.lineTo(5.2, -42.4); c.quadraticCurveTo(0, -41.6, -4.8, -42.6); c.closePath(); };
  const O_NAPE = function (c) { c.moveTo(-4.6, -42.6); c.quadraticCurveTo(-6, -40, -3.8, -37.2); c.lineTo(-1.8, -38.2); c.quadraticCurveTo(-3, -40.2, -2.4, -42.4); c.closePath(); };
  function oldSit(x, y, s, now, o) {
    o = o || {};
    const c = X(), arm = o.watch ? O_EAR : O_LAP;
    c.save(); c.translate(x, y); c.scale(s * (o.flip ? -1 : 1), s);
    if (o.a !== undefined) c.globalAlpha *= o.a;
    const coat = LG(-10, 0, 10, 0, [0, o.c0 || '#0b0c0f', 1, o.c1 || '#1d1e23']);
    const put = function (body, hair, dx, dy, rim) {
      c.save(); c.translate(dx, dy);
      OB.concat([arm, O_KNEE]).forEach(function (f) { fp(f, body); });
      c.translate(1, -35); c.rotate(o.lean || 0); c.translate(-1, 35);
      OH.forEach(function (f) { fp(f, body); });
      if (!rim) fp(function (cc) { cc.ellipse(4.4, -40.2, 2.6, 3.6, 0, 0, 6.2832); }, 'rgba(120,88,66,0.3)');
      if (o.cap) { fp(O_NAPE, hair); fp(O_CAP, rim ? body : '#0c0c0e'); } else fp(O_HAIR, hair);
      fp(O_BEARD, hair);
      c.restore();
    };
    if (o.rim) put(o.rim, o.rim, o.rimDx === undefined ? -0.7 : o.rimDx, o.rimDy === undefined ? -0.5 : o.rimDy, true);
    put(coat, o.hair || '#4a4743', 0, 0, false);
    if (o.cap) { c.save(); c.translate(1, -35); c.rotate(o.lean || 0); c.translate(-1, 35); line(5.4, -42.6, 9.8, -42.4, 'rgba(255,220,180,0.25)', 0.25); c.restore(); }
    c.save(); c.translate(1, -35); c.rotate(o.lean || 0); c.translate(-1, 35);
    c.strokeStyle = 'rgba(200,196,188,0.28)'; c.lineWidth = 0.18;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(2.4 + i * 0.8, -37.2 + i * 0.1); c.quadraticCurveTo(2.8 + i * 0.7, -34, 3.6 + i * 0.5, -31.2 + Math.abs(i - 3) * 0.3); c.stroke(); }
    c.restore();
    if (o.watch) {
      E(7.6, -39.4, 1.8, 1.8, P.brassG(5.8, 9.4)); E(7.6, -39.4, 1.2, 1.2, '#d8d0b8');
      if (now && (now % 1000) < 120) gl(7.6, -39.6, 4, '255,240,200', 0.7);
      c.strokeStyle = 'rgba(210,180,110,0.7)'; c.lineWidth = 0.22; c.beginPath(); c.moveTo(7.6, -37.6); c.quadraticCurveTo(8.6, -34, 7, -31); c.stroke();
    }
    c.restore();
  }
  /* рука в перчатке: (x,y) — запястье, ang — куда смотрят пальцы; o.pinch — щепотью, o.cuff — белая манжета */
  function glove(x, y, ang, s, o) {
    o = o || {};
    const c = X();
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s * (o.mirror ? -1 : 1));
    if (o.a !== undefined) c.globalAlpha *= o.a;
    const sleeve = function (cc) { cc.moveTo(-70, -12); cc.bezierCurveTo(-40, -12.6, -16, -11, -5, -9.4); cc.quadraticCurveTo(-1.6, 0, -5, 9.4); cc.bezierCurveTo(-16, 11.2, -40, 12.8, -70, 12.4); cc.closePath(); };
    const palm = function (cc) { cc.moveTo(-4.4, -7.2); cc.bezierCurveTo(2, -9.2, 8, -7.8, 11.6, -5.2); cc.bezierCurveTo(12.8, -1, 12.6, 2.6, 11.4, 4.8); cc.bezierCurveTo(7, 7.6, 1, 8, -4.4, 7.2); cc.closePath(); };
    /* палец: от основания вдоль +x, сужается к кончику; curl — загиб вниз */
    const finger = function (L, w, curl) { return function (cc) { cc.moveTo(0, -w / 2); cc.bezierCurveTo(L * 0.5, -w * 0.54, L * 0.86, -w * 0.42 + curl * 0.5, L, -w * 0.1 + curl); cc.quadraticCurveTo(L + w * 0.38, curl + w * 0.12, L * 0.97, w * 0.3 + curl); cc.bezierCurveTo(L * 0.8, w * 0.5 + curl * 0.5, L * 0.4, w * 0.54, 0, w / 2); cc.closePath(); }; };
    const fingers = o.pinch ? [[10.4, -4.4, 9, 2.8, 0.1, 0.6], [10.8, -1.6, 7, 2.8, 0.42, 1.6], [10.2, 1.1, 6, 2.6, 0.62, 1.6], [9.2, 3.5, 5, 2.3, 0.75, 1.3]]
      : [[10.4, -4.8, 12.4, 2.8, -0.1, 0.4], [10.8, -1.9, 13.6, 2.8, -0.02, 0.6], [10.4, 0.9, 12.6, 2.7, 0.06, 0.8], [9.4, 3.4, 10, 2.4, 0.16, 0.8]];
    const thumb = o.pinch ? [3.4, -6.2, 12.6, 3.4, -0.22, 0.3] : [2.6, -6.2, 11.4, 3.4, -0.62, 0.4];
    const all = function (sl, gv, dx, dy) {
      c.save(); c.translate(dx, dy);
      if (!o.noSleeve) fp(sleeve, sl);
      fp(palm, gv);
      fingers.concat([thumb]).forEach(function (f) { c.save(); c.translate(f[0], f[1]); c.rotate(f[4]); fp(finger(f[2], f[3], f[5]), gv); c.restore(); });
      c.restore();
    };
    if (o.rim) all(o.rim, o.rim, o.rimDx || 0, o.rimDy === undefined ? -0.9 : o.rimDy);
    all(LG(0, -12, 0, 12, [0, o.s0 || '#1c1c20', 0.5, '#0c0c0e', 1, '#040405']), LG(0, -9, 0, 8, [0, o.g0 || '#2e2c2e', 0.4, o.g1 || '#100f11', 1, '#040404']), 0, 0);
    if (!o.noSleeve) { [[-56, -6, -14, -4], [-48, 2, -12, 3.6], [-34, -9, -10, -7]].forEach(function (f) { line(f[0], f[1], f[2], f[3], 'rgba(255,230,200,0.06)', 0.8); line(f[0], f[1] + 1, f[2], f[3] + 1, 'rgba(0,0,0,0.5)', 0.6); }); }
    if (o.cuff) { c.beginPath(); c.moveTo(-7.4, -9.4); c.lineTo(-4.8, -9.2); c.quadraticCurveTo(-2.2, 0, -4.8, 9.2); c.lineTo(-7.4, 9.4); c.quadraticCurveTo(-4.8, 0, -7.4, -9.4); c.fillStyle = '#cfc8bc'; c.fill(); }
    const sh = 'rgba(255,230,200,' + (o.sheen === undefined ? 0.22 : o.sheen) + ')';
    c.strokeStyle = sh; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-2, -7.2); c.bezierCurveTo(4, -8.6, 9, -7.2, 11.4, -5); c.stroke();
    fingers.forEach(function (f) { c.save(); c.translate(f[0], f[1]); c.rotate(f[4]); line(1, -f[3] * 0.3, f[2] * 0.6, -f[3] * 0.32, sh, 0.35); c.restore(); });
    c.restore();
  }
  function hero(x, y, h, o) { person(x, y, h, Object.assign({ col: '#07080a', scarf: true }, o || {})); }
  /* Прохор со спины, сидит у огня, лицом влево; руки протянуты к печи */
  const PK = [
    function (c) { c.moveTo(-14, 0); c.bezierCurveTo(-16, -20, -15, -38, -7, -47); c.quadraticCurveTo(4, -54, 12, -46); c.bezierCurveTo(16, -34, 17, -16, 15, 0); c.closePath(); },
    function (c) { c.ellipse(-4.6, -57, 6, 6.8, -0.2, 0, 6.2832); },
    function (c) { c.moveTo(-11.4, -59.6); c.bezierCurveTo(-11.6, -68.6, 3.4, -70.4, 2.8, -61.4); c.lineTo(-3, -60.2); c.closePath(); },
    function (c) { c.moveTo(-9.6, -60.8); c.lineTo(-16.4, -59.6); c.lineTo(-16.2, -58.4); c.lineTo(-9, -59.2); c.closePath(); },
    function (c) { c.moveTo(9, -46); c.quadraticCurveTo(-8, -46, -31, -37.4); c.lineTo(-31.6, -32); c.quadraticCurveTo(-10, -37, 10, -36); c.closePath(); },
    function (c) { c.moveTo(-4, -47); c.quadraticCurveTo(-18, -48, -34, -43.4); c.lineTo(-34, -39.4); c.quadraticCurveTo(-18, -42, -5, -40); c.closePath(); }
  ];
  const PK_H = [[-34.6, -35, 4.2, 2.8, 0.3], [-37, -41.6, 3.8, 2.6, 0.1]];
  function prokhor(x, y, s, now) {
    const c = X();
    c.save(); c.translate(x, y); c.scale(s, s);
    c.save(); c.translate(-0.9, -0.4); PK.forEach(function (f) { fp(f, 'rgba(255,140,60,0.55)'); }); PK_H.forEach(function (h) { E(h[0], h[1], h[2], h[3], 'rgba(255,150,70,0.7)', h[4]); }); c.restore();
    const body = LG(-36, 0, 16, 0, [0, '#2a140c', 0.45, '#0c0706', 1, '#050404']);
    PK.forEach(function (f) { fp(f, body); });
    [[-28, -38, 0, -44], [-30, -44.6, -6, -46.4], [-12, -22, -14, -6]].forEach(function (l) { line(l[0], l[1], l[2], l[3], 'rgba(255,130,60,0.18)', 0.5); });
    PK_H.forEach(function (h) { E(h[0], h[1], h[2], h[3], '#1e1210', h[4]); E(h[0] - h[2] * 0.5, h[1], h[2] * 0.6, h[3] * 0.7, 'rgba(255,110,50,0.35)', h[4]); for (let k = 0; k < 4; k++) E(h[0] - h[2] - 1, h[1] - 1.6 + k * 1.1, 1.4, 0.5, '#1e1210', h[4]); });
    c.restore();
    gl(x - 36 * s, y - 38 * s, 10, '255,120,50', 0.2 + Math.sin(now / 150) * 0.04);
  }

  /* ============================================================
     A. ЛАВКА ИЗНУТРИ — перспектива, от прилавка к входной двери.
     Метры; глаз в (0,0,0), y — вниз; пол AF, потолок AC, задняя стена AZ
     ============================================================ */
  const pvA = PV(192, 96, 150), AX = 2.9, AF = 1.6, AC = -1.7, AZ = 5.2;
  const DA = { x0: -0.45, x1: 0.55, y0: 1.6, y1: -0.62 };
  const WA = { x0: -2.5, x1: -0.95, y0: 0.62, y1: -0.98 };
  const CT = { x0: 1.72, y: 0.62, z0: 1.15, z1: 4.0 };
  const MRA = { y: -0.5, z: 3.0, hz: 0.3, hy: 0.48 };
  const LAMPA = [2.3, 0.62, 2.25];
  const SHELF = { x0: -2.9, x1: -2.4, z0: 1.55, z1: 4.95, ys: [1.28, 0.7, 0.12, -0.44, -1.0], top: -1.52 };
  const DOLLZ = 2.95;
  function pa(x, y, z) { return pvA(x, y, z); }
  function pm(p) { return pvA(p[0], p[1], p[2]); }
  function qa(pts, f) { Q(pvA, pts, f); }
  function la(a, b, col, w) { L3(pvA, a, b, col, w); }
  function sA(z) { return 150 / z; }
  function bw(x, y) { return pa(x, y, AZ); }
  const CKA = (function () { const z = AZ - 0.25, s = sA(z), a = pa(1.0, -1.1, z), b = pa(1.62, AF, z); return { x0: a[0], y0: a[1], x1: b[0], y1: b[1], s: s, fx: (a[0] + b[0]) / 2, fy: a[1] + 0.26 * s }; })();
  const BELLA = (function () { const z = AZ - 0.06, p = pa(DA.x1 - 0.2, DA.y1 - 0.02, z); return { x: p[0], y: p[1], s: sA(z) }; })();
  const LAMPF = (function () { const p = pa(LAMPA[0], LAMPA[1] - 0.27, LAMPA[2]); return { x: p[0], y: p[1], s: sA(LAMPA[2]) }; })();

  /* улица за окном и дверью: дом напротив, фонарь, мостовая */
  function outsideA(mode) {
    const c = X(), night = mode === 'night', zf = 15, s = sA(zf);
    const p0 = bw(-AX, AC), p1 = bw(AX, AF);
    c.save(); c.beginPath(); c.rect(p0[0] - 1, p0[1] - 1, p1[0] - p0[0] + 2, p1[1] - p0[1] + 2); c.clip();
    R(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1], night ? LG(0, p0[1], 0, 112, [0, '#04060c', 1, '#18202a']) : LG(0, p0[1], 0, 112, [0, '#a898aa', 0.6, '#f0c4a4', 1, '#ffe2bc']));
    const gy = pa(0, AF, zf)[1];
    R(p0[0], gy, p1[0] - p0[0], p1[1] - gy, night ? LG(0, gy, 0, p1[1], [0, '#1c2026', 1, '#0c0e10']) : LG(0, gy, 0, p1[1], [0, '#d6b6a2', 1, '#8a766e']));
    for (let z = AZ + 0.2; z < zf; z += 0.4) { const a = pa(-3, AF, z), b = pa(3, AF, z); line(a[0], a[1], b[0], b[1], night ? 'rgba(0,0,0,0.3)' : 'rgba(90,60,50,0.22)', 0.25); }
    const r = P.RNG(31);
    for (let hx = -7.5; hx < 7.5;) {
      const w = 2.6 + r() * 2.2, top = -1.4 - r() * 2.4, k = Math.floor(r() * 3);
      const a = pa(hx, top, zf), b = pa(hx + w, AF, zf);
      R(a[0], a[1], b[0] - a[0], b[1] - a[1], night ? ['#151a20', '#1a1d24', '#121820'][k] : ['#e2bfa2', '#d6b49e', '#e8cbb0'][k]);
      poly([a[0] - s * 0.15, a[1], b[0] + s * 0.15, a[1], b[0] - s * 0.5, a[1] - s * 0.8, a[0] + s * 0.5, a[1] - s * 0.8], night ? '#0c0f14' : '#9a8484');
      for (let wy = top + 0.6; wy < AF - 1.2; wy += 1.5) for (let wx = hx + 0.5; wx + 0.6 < hx + w - 0.3; wx += 1.15) {
        const lit = night && r() < 0.18, q = pa(wx, wy, zf);
        R(q[0], q[1], 0.6 * s, 0.95 * s, lit ? '#e8a858' : (night ? '#07090c' : '#8e8e9c'));
        if (!night) R(q[0], q[1], 0.6 * s, 0.35 * s, 'rgba(255,240,220,0.35)');
      }
      R(a[0], b[1] - 0.25 * s, b[0] - a[0], 0.25 * s, night ? 'rgba(0,0,0,0.4)' : 'rgba(80,60,60,0.25)');
      hx += w + 0.08;
    }
    const lz = 8.5, ls = sA(lz), lp = pa(-1.7, AF, lz), lt = pa(-1.7, -1.3, lz);
    R(lp[0] - 0.04 * ls, lt[1], 0.08 * ls, lp[1] - lt[1], night ? '#06080a' : '#3a3434');
    poly([lt[0] - 0.16 * ls, lt[1], lt[0] + 0.16 * ls, lt[1], lt[0] + 0.11 * ls, lt[1] - 0.42 * ls, lt[0] - 0.11 * ls, lt[1] - 0.42 * ls], night ? 'rgba(255,214,150,0.95)' : 'rgba(210,214,218,0.7)');
    poly([lt[0] - 0.2 * ls, lt[1] - 0.42 * ls, lt[0] + 0.2 * ls, lt[1] - 0.42 * ls, lt[0], lt[1] - 0.6 * ls], night ? '#06080a' : '#3a3434');
    if (night) { gl(lt[0], lt[1] - 0.2 * ls, 30, '255,190,120', 0.5); gl(lt[0], lp[1], 26, '255,180,110', 0.2, 6); }
    else gl(250, 74, 90, '255,230,190', 0.5);
    c.fillStyle = night ? 'rgba(120,132,146,0.32)' : 'rgba(255,236,222,0.42)'; c.fillRect(p0[0], gy - 18, p1[0] - p0[0], 40);
    c.restore();
  }
  /* товар на полке: (x,y) — середина основания, s — пикселей на метр */
  function itemA(kind, x, y, s, r) {
    const c = X();
    if (kind === 0) P.bottle(x, y, 0.08 * s, (0.22 + r() * 0.12) * s, ['#2a4a3a', '#5a2a1a', '#3a3a5a', '#4a3a14'][Math.floor(r() * 4)]);
    else if (kind === 1) {
      const n = 3 + Math.floor(r() * 3), w = 0.034 * s;
      for (let j = 0; j < n; j++) { const h = (0.18 + r() * 0.08) * s, bx = x - n * w / 2 + j * w; R(bx, y - h, w * 0.92, h, ['#5a1a14', '#1a3a2a', '#3a2a5a', '#6a4a1a', '#2a2a2a'][Math.floor(r() * 5)]); R(bx, y - h * 0.82, w * 0.92, 0.012 * s, 'rgba(220,190,120,0.5)'); }
    } else if (kind === 2) {
      const w = 0.17 * s, h = 0.2 * s;
      P.rr(x - w / 2, y - h, w, h, 0.02 * s, LG(x - w / 2, 0, x + w / 2, 0, [0, '#2a1408', 0.5, '#6a3a18', 1, '#1a0a02']));
      c.beginPath(); c.arc(x, y - h, w / 2, Math.PI, 0); c.fillStyle = '#4a2810'; c.fill();
      P.face(x, y - h * 0.62, 0.05 * s, { plain: true });
    } else if (kind === 3) {
      const w = (0.16 + r() * 0.1) * s, h = (0.1 + r() * 0.06) * s;
      P.rr(x - w / 2, y - h, w, h, 0.01 * s, LG(0, y - h, 0, y, [0, ['#6a3a1a', '#3a2a4a', '#2a3a2a'][Math.floor(r() * 3)], 1, '#140a04']));
      R(x - w / 2, y - h, w, Math.max(0.3, 0.012 * s), 'rgba(220,180,110,0.45)');
    } else if (kind === 4) {
      R(x - 0.012 * s, y - 0.28 * s, 0.024 * s, 0.28 * s, P.brassG(x - 0.012 * s, x + 0.012 * s));
      E(x, y, 0.06 * s, 0.015 * s, P.brassG(x - 0.06 * s, x + 0.06 * s));
      P.candleBody(x, y - 0.28 * s, 0.1 * s, 0.024 * s, '#e0d4b4');
    } else if (kind === 5) {
      c.beginPath(); c.moveTo(x - 0.05 * s, y); c.bezierCurveTo(x - 0.1 * s, y - 0.1 * s, x - 0.08 * s, y - 0.2 * s, x - 0.025 * s, y - 0.24 * s); c.lineTo(x + 0.025 * s, y - 0.24 * s); c.bezierCurveTo(x + 0.08 * s, y - 0.2 * s, x + 0.1 * s, y - 0.1 * s, x + 0.05 * s, y); c.closePath();
      c.fillStyle = LG(x - 0.1 * s, 0, x + 0.1 * s, 0, [0, '#1a2a3a', 0.4, '#4a6a8a', 1, '#0a1420']); c.fill();
    } else if (kind === 6) {
      const w = 0.32 * s;
      E(x, y - 0.03 * s, w * 0.4, 0.03 * s, P.brassG(x - w * 0.4, x + w * 0.4));
      c.beginPath(); c.moveTo(x - w * 0.3, y - 0.05 * s); c.bezierCurveTo(x - w * 0.62, y - 0.18 * s, x - w * 0.6, y - 0.34 * s, x - w * 0.3, y - 0.4 * s); c.lineTo(x + w * 0.3, y - 0.4 * s); c.bezierCurveTo(x + w * 0.6, y - 0.34 * s, x + w * 0.62, y - 0.18 * s, x + w * 0.3, y - 0.05 * s); c.closePath();
      c.fillStyle = P.brassG(x - w * 0.6, x + w * 0.6); c.fill();
      R(x - w * 0.12, y - 0.5 * s, w * 0.24, 0.1 * s, P.brassG(x - w * 0.12, x + w * 0.12));
      line(x + w * 0.55, y - 0.2 * s, x + w * 0.75, y - 0.17 * s, '#8a6a2a', Math.max(0.3, 0.02 * s));
    } else if (kind === 7 && s > 36) P.iconP(x - 0.08 * s, y - 0.22 * s, 0.16 * s, 0.21 * s, '#6a1a14', '#1a2a4a', Math.floor(r() * 99));
    else {
      c.beginPath(); c.moveTo(x - 0.04 * s, y); c.quadraticCurveTo(x - 0.1 * s, y - 0.12 * s, x - 0.03 * s, y - 0.2 * s); c.lineTo(x - 0.035 * s, y - 0.26 * s); c.lineTo(x + 0.035 * s, y - 0.26 * s); c.lineTo(x + 0.03 * s, y - 0.2 * s); c.quadraticCurveTo(x + 0.1 * s, y - 0.12 * s, x + 0.04 * s, y); c.closePath();
      c.fillStyle = LG(x - 0.1 * s, 0, x + 0.1 * s, 0, [0, '#3a2a1a', 0.45, '#b08a5a', 1, '#2a1a0a']); c.fill();
    }
  }
  /* кукла-наследник на верхней полке — мелко */
  function dollMini(x, y, s) {
    const c = X(), h = 0.44 * s;
    c.beginPath(); c.moveTo(x - 0.07 * s, y); c.quadraticCurveTo(x - 0.08 * s, y - h * 0.5, x - 0.045 * s, y - h * 0.66); c.lineTo(x + 0.045 * s, y - h * 0.66); c.quadraticCurveTo(x + 0.08 * s, y - h * 0.5, x + 0.07 * s, y); c.closePath(); c.fillStyle = '#121218'; c.fill();
    R(x - 0.05 * s, y - h * 0.69, 0.1 * s, 0.03 * s, '#8a1c14');
    E(x, y - h * 0.8, 0.045 * s, 0.055 * s, RG(x - 0.015 * s, y - h * 0.84, 0, 0.06 * s, [0, '#f4ece4', 1, '#a89a8a']));
    E(x, y - h * 0.87, 0.05 * s, 0.03 * s, '#1e140c');
    E(x - 0.016 * s, y - h * 0.8, 0.008 * s, 0.006 * s, '#14141c'); E(x + 0.016 * s, y - h * 0.8, 0.008 * s, 0.006 * s, '#14141c');
  }
  function roomL(mode, o) {
    o = o || {};
    const night = mode === 'night';
    return layer(function () {
      const c = X();
      outsideA(mode);
      const wallA = night ? '#111b17' : '#1d2b25', wallB = night ? '#17231e' : '#273830', wood = night ? '#1c1108' : '#2a1a0e';
      // потолок: доски вдоль
      qa([[-AX, AC, 0.9], [AX, AC, 0.9], [AX, AC, AZ], [-AX, AC, AZ]], night ? '#0c0806' : '#1c140e');
      for (let x = -AX; x <= AX + 0.01; x += 0.34) la([x, AC, 0.9], [x, AC, AZ], 'rgba(0,0,0,0.5)', 0.3);
      // пол: доски, стыки, потёртости
      qa([[-AX, AF, 0.9], [AX, AF, 0.9], [AX, AF, AZ], [-AX, AF, AZ]], night ? '#170d06' : '#2a1a0e');
      for (let x = -AX; x <= AX + 0.01; x += 0.19) la([x, AF, 0.9], [x, AF, AZ], 'rgba(0,0,0,0.55)', 0.3);
      const fr = P.RNG(7);
      for (let i = 0; i < 46; i++) { const x = -AX + Math.floor(fr() * 30) * 0.19, z = 1.1 + fr() * 4; la([x, AF, z], [x + 0.19, AF, z], 'rgba(0,0,0,0.6)', 0.35); }
      for (let i = 0; i < 26; i++) { const x = -AX + fr() * 5.8, z = 1.2 + fr() * 3.8; la([x, AF, z], [x, AF, z + 0.3 + fr() * 0.8], 'rgba(255,210,160,0.05)', 0.4); }
      // ковёр
      qa([[-0.95, AF, 2.2], [0.95, AF, 2.2], [0.95, AF, 4.5], [-0.95, AF, 4.5]], '#3a1410');
      qa([[-0.84, AF, 2.34], [0.84, AF, 2.34], [0.84, AF, 4.36], [-0.84, AF, 4.36]], '#5e2016');
      qa([[-0.64, AF, 2.6], [0.64, AF, 2.6], [0.64, AF, 4.1], [-0.64, AF, 4.1]], '#30100c');
      for (let z = 2.7; z < 4.0; z += 0.26) { const a = pa(0, AF, z), s = sA(z); E(a[0], a[1], 0.26 * s, 0.03 * s, 'rgba(160,90,40,0.25)'); }
      // боковые стены: обои в полоску с узором, панели, плинтус
      [-1, 1].forEach(function (sd) {
        const x = sd * AX;
        qa([[x, AC, 0.9], [x, AC, AZ], [x, AF, AZ], [x, AF, 0.9]], wallB);
        for (let z = 0.95; z < AZ; z += 0.2) la([x, AC, z], [x, 0.82, z], 'rgba(0,0,0,0.16)', 0.22);
        for (let z = 1.0; z < AZ; z += 0.4) for (let y = -1.5; y < 0.7; y += 0.36) { const p = pa(x, y + (Math.round(z * 2.5) % 2) * 0.18, z), s = sA(z); E(p[0], p[1], 0.022 * s, 0.06 * s, 'rgba(130,170,150,0.1)'); }
        qa([[x, 0.82, 0.9], [x, 0.82, AZ], [x, AF, AZ], [x, AF, 0.9]], wood);
        la([x, 0.82, 0.9], [x, 0.82, AZ], 'rgba(255,210,160,0.18)', 0.5);
        for (let z = 1.0; z < AZ - 0.3; z += 0.72) qa([[x, 0.94, z + 0.08], [x, 0.94, z + 0.62], [x, 1.46, z + 0.62], [x, 1.46, z + 0.08]], 'rgba(0,0,0,0.28)');
        la([x, 1.52, 0.9], [x, 1.52, AZ], 'rgba(0,0,0,0.5)', 0.6);
      });
      // задняя стена с проёмами окна и двери
      const w0 = bw(-AX, AC), w1 = bw(AX, AF), wa = bw(WA.x0, WA.y1), wb = bw(WA.x1, WA.y0), da = bw(DA.x0, DA.y1), db = bw(DA.x1, DA.y0), sz = sA(AZ);
      c.save(); c.beginPath(); c.rect(w0[0], w0[1], w1[0] - w0[0], w1[1] - w0[1]); c.rect(wa[0], wa[1], wb[0] - wa[0], wb[1] - wa[1]); c.rect(da[0], da[1], db[0] - da[0], db[1] - da[1]); c.clip('evenodd');
      R(w0[0], w0[1], w1[0] - w0[0], w1[1] - w0[1], LG(0, w0[1], 0, w1[1], [0, wallA, 1, wallB]));
      const pw = bw(0, 0.82)[1];
      damask(w0[0], w0[1], w1[0] - w0[0], pw - w0[1], '130,170,150', 0.1, 0.62);
      P.tex(w0[0], w0[1], w1[0] - w0[0], w1[1] - w0[1], 0.4, 'overlay', 'mot', 1.2);
      R(w0[0], pw, w1[0] - w0[0], w1[1] - pw, wood); R(w0[0], pw, w1[0] - w0[0], 0.6, 'rgba(255,210,160,0.18)');
      for (let x = w0[0] + 3; x < w1[0] - 10; x += 21) P.rr(x, pw + 3, 17, w1[1] - pw - 6, 0.6, 'rgba(0,0,0,0.25)');
      c.restore();
      // витрина изнутри: товар силуэтами на свету, золотые буквы задом наперёд, переплёт, подоконник, шторы
      const ww = wb[0] - wa[0], wh = wb[1] - wa[1], sil = night ? 'rgba(4,6,10,0.94)' : 'rgba(34,20,16,0.93)', by = wb[1];
      R(wa[0], by - 2.2, ww, 2.2, sil);
      const u = sz / 10;
      // самовар: поддон, тулово, конфорка, ручки, кран
      const sx = wa[0] + ww * 0.24, sb = by - 2.2;
      E(sx, sb - 0.3 * u, 1.6 * u, 0.3 * u, sil); R(sx - 0.5 * u, sb - 1.0 * u, 1.0 * u, 0.8 * u, sil);
      c.beginPath(); c.moveTo(sx - 1.5 * u, sb - 1.0 * u); c.bezierCurveTo(sx - 2.6 * u, sb - 2.0 * u, sx - 2.4 * u, sb - 3.6 * u, sx - 1.2 * u, sb - 4.2 * u); c.lineTo(sx + 1.2 * u, sb - 4.2 * u); c.bezierCurveTo(sx + 2.4 * u, sb - 3.6 * u, sx + 2.6 * u, sb - 2.0 * u, sx + 1.5 * u, sb - 1.0 * u); c.closePath(); c.fillStyle = sil; c.fill();
      R(sx - 0.7 * u, sb - 5.0 * u, 1.4 * u, 0.8 * u, sil); E(sx, sb - 5.2 * u, 1.1 * u, 0.3 * u, sil); R(sx - 0.25 * u, sb - 5.9 * u, 0.5 * u, 0.7 * u, sil);
      c.strokeStyle = sil; c.lineWidth = 0.35 * u; [-1, 1].forEach(function (sd) { c.beginPath(); c.arc(sx + sd * 2.4 * u, sb - 3.4 * u, 0.6 * u, 0, 6.28); c.stroke(); });
      c.beginPath(); c.moveTo(sx + 0.6 * u, sb - 2.0 * u); c.lineTo(sx + 2.6 * u, sb - 1.6 * u); c.lineTo(sx + 2.6 * u, sb - 1.0 * u); c.stroke();
      // каминные часы со светлым циферблатом
      const kx = wa[0] + ww * 0.6;
      R(kx - 1.5 * u, sb - 2.6 * u, 3.0 * u, 2.6 * u, sil); c.beginPath(); c.arc(kx, sb - 2.6 * u, 1.5 * u, Math.PI, 0); c.fillStyle = sil; c.fill(); R(kx - 1.9 * u, sb - 0.4 * u, 3.8 * u, 0.4 * u, sil);
      E(kx, sb - 2.5 * u, 0.85 * u, 0.85 * u, night ? 'rgba(150,150,140,0.5)' : 'rgba(230,210,180,0.55)');
      // подсвечник на три свечи
      const cx2 = wa[0] + ww * 0.42;
      R(cx2 - 0.12 * u, sb - 3.4 * u, 0.24 * u, 3.4 * u, sil); E(cx2, sb - 0.2 * u, 0.8 * u, 0.25 * u, sil);
      c.beginPath(); c.moveTo(cx2 - 1.2 * u, sb - 3.0 * u); c.quadraticCurveTo(cx2, sb - 1.8 * u, cx2 + 1.2 * u, sb - 3.0 * u); c.stroke();
      [-1.2, 0, 1.2].forEach(function (d) { R(cx2 + d * u - 0.15 * u, sb - (d ? 4.0 : 4.6) * u, 0.3 * u, 1.0 * u, sil); });
      // ваза с сухими ветками
      const vx = wa[0] + ww * 0.83;
      c.beginPath(); c.moveTo(vx - 0.6 * u, sb); c.quadraticCurveTo(vx - 1.6 * u, sb - 1.4 * u, vx - 0.4 * u, sb - 2.6 * u); c.lineTo(vx + 0.4 * u, sb - 2.6 * u); c.quadraticCurveTo(vx + 1.6 * u, sb - 1.4 * u, vx + 0.6 * u, sb); c.closePath(); c.fillStyle = sil; c.fill();
      c.lineWidth = 0.15 * u; [[-1.6, -6.4], [0.4, -7.2], [1.8, -5.6], [-0.6, -6.8]].forEach(function (b) { c.beginPath(); c.moveTo(vx, sb - 2.6 * u); c.quadraticCurveTo(vx + b[0] * 0.3 * u, sb - 4.6 * u, vx + b[0] * u, sb + b[1] * u); c.stroke(); });
      c.save(); c.translate(wa[0] + ww / 2, wa[1] + wh * 0.24); c.scale(-1, 1); txt('ЛОМБАРД', 0, 0, 'bold ' + (0.2 * sz).toFixed(1) + 'px ' + SERIF, night ? 'rgba(200,170,110,0.42)' : 'rgba(140,100,40,0.6)', 'center', '1px'); c.restore();
      const mx = wa[0] + ww / 2, hy = wa[1] + wh * 0.34;
      R(mx - 0.9, wa[1], 1.8, wh, '#1a1008'); R(wa[0], hy - 0.7, ww, 1.4, '#1a1008');
      const t = 0.09 * sz;
      R(wa[0] - t, wa[1] - t, ww + 2 * t, t, '#2a1a0e'); R(wa[0] - t, wa[1], t, wh, '#22150a'); R(wb[0], wa[1], t, wh, '#22150a');
      qa([[WA.x0 - 0.12, WA.y0, AZ - 0.2], [WA.x1 + 0.12, WA.y0, AZ - 0.2], [WA.x1 + 0.12, WA.y0, AZ], [WA.x0 - 0.12, WA.y0, AZ]], '#3a2414');
      qa([[WA.x0 - 0.12, WA.y0, AZ - 0.2], [WA.x1 + 0.12, WA.y0, AZ - 0.2], [WA.x1 + 0.12, WA.y0 + 0.06, AZ - 0.2], [WA.x0 - 0.12, WA.y0 + 0.06, AZ - 0.2]], '#160c05');
      const gp = pa(WA.x1 - 0.22, WA.y0, AZ - 0.1), gs = sA(AZ - 0.1);
      poly([gp[0] - 0.06 * gs, gp[1], gp[0] + 0.06 * gs, gp[1], gp[0] + 0.08 * gs, gp[1] - 0.1 * gs, gp[0] - 0.08 * gs, gp[1] - 0.1 * gs], '#7a3a20');
      for (let i = 0; i < 8; i++) { const an = -2.2 + i * 0.6, lx = gp[0] + Math.cos(an) * 0.14 * gs, ly = gp[1] - 0.13 * gs + Math.sin(an) * 0.08 * gs; E(lx, ly, 0.04 * gs, 0.03 * gs, night ? '#14241a' : '#2a4a24'); }
      [[-0.03, -0.24], [0.04, -0.27], [0.0, -0.3]].forEach(function (f) { E(gp[0] + f[0] * gs, gp[1] + f[1] * gs, 0.025 * gs, 0.025 * gs, night ? '#5a1210' : '#b02a20'); });
      [[WA.x0 - 0.2, WA.x0 + 0.24, 1], [WA.x1 - 0.24, WA.x1 + 0.2, -1]].forEach(function (d) {
        const a = pa(d[0], WA.y1 - 0.16, AZ - 0.08), b = pa(d[1], WA.y0 + 0.02, AZ - 0.08);
        const L0 = Math.min(a[0], b[0]), L1 = Math.max(a[0], b[0]), yt = a[1], yb = b[1], yk = yt + (yb - yt) * 0.6;
        const outer = d[2] > 0 ? L0 : L1, inner = d[2] > 0 ? L1 : L0, pinch = outer + (inner - outer) * 0.4;
        c.beginPath(); c.moveTo(outer, yt); c.lineTo(inner, yt); c.quadraticCurveTo(inner, yk - (yk - yt) * 0.35, pinch, yk); c.quadraticCurveTo(inner, yk + (yb - yk) * 0.45, inner + (inner - outer) * 0.1, yb); c.lineTo(outer, yb); c.closePath();
        c.fillStyle = LG(L0, 0, L1, 0, d[2] > 0 ? [0, '#2a0604', 0.6, '#6a140e', 1, '#3a0806'] : [0, '#3a0806', 0.4, '#6a140e', 1, '#2a0604']); c.fill();
        for (let k = 1; k < 4; k++) { const fx = outer + (pinch - outer) * k / 4; line(fx, yt, fx, yk, 'rgba(10,0,0,0.45)', 0.4); line(fx, yk, outer + (inner - outer) * k / 4, yb, 'rgba(10,0,0,0.45)', 0.4); }
        E(pinch, yk, 1.2, 0.8, '#b08a3a');
      });
      line(pa(WA.x0 - 0.25, WA.y1 - 0.16, AZ - 0.08)[0], pa(0, WA.y1 - 0.16, AZ - 0.08)[1], pa(WA.x1 + 0.25, WA.y1 - 0.16, AZ - 0.08)[0], pa(0, WA.y1 - 0.16, AZ - 0.08)[1], '#8a6a2a', 0.7);
      // дверной проём: наличник, порог, гвоздь слева
      const dt = 0.1 * sz;
      R(da[0] - dt, da[1] - dt, (db[0] - da[0]) + 2 * dt, dt, '#2e1c0e'); R(da[0] - dt, da[1], dt, db[1] - da[1], '#26170b'); R(db[0], da[1], dt, db[1] - da[1], '#26170b');
      line(da[0] - dt, da[1] - dt, db[0] + dt, da[1] - dt, 'rgba(255,210,160,0.22)', 0.4);
      qa([[DA.x0 - 0.05, AF - 0.03, AZ - 0.12], [DA.x1 + 0.05, AF - 0.03, AZ - 0.12], [DA.x1 + 0.05, AF - 0.03, AZ], [DA.x0 - 0.05, AF - 0.03, AZ]], '#3a2616');
      const nl = bw(DA.x0 - 0.24, -0.34); E(nl[0], nl[1], 0.55, 0.55, '#7a7a80'); E(nl[0] - 0.15, nl[1] - 0.15, 0.2, 0.2, 'rgba(255,255,255,0.5)');
      // напольные часы справа от двери
      const K = CKA;
      R(K.x0, K.y0, K.x1 - K.x0, K.y1 - K.y0, LG(K.x0, 0, K.x1, 0, [0, '#1a0a02', 0.4, '#4a2a12', 1, '#120602']));
      poly([K.x0 - 1.5, K.y0, K.fx, K.y0 - 0.16 * K.s, K.x1 + 1.5, K.y0], '#3a1e0c');
      P.face(K.fx, K.fy, 0.19 * K.s, { paper: '#e0d4b4' });
      R(K.fx - 0.15 * K.s, K.fy + 0.32 * K.s, 0.3 * K.s, 1.12 * K.s, '#0a0502');
      // картина справа: ночная река
      const pc0 = bw(1.95, -1.05), pc1 = bw(2.6, -0.4);
      R(pc0[0] - 1.4, pc0[1] - 1.4, pc1[0] - pc0[0] + 2.8, pc1[1] - pc0[1] + 2.8, P.goldG(pc0[0], pc0[1], pc1[0], pc1[1]));
      R(pc0[0], pc0[1], pc1[0] - pc0[0], pc1[1] - pc0[1], LG(0, pc0[1], 0, pc1[1], [0, '#0e1420', 0.6, '#1c2430', 1, '#0a0c10']));
      E((pc0[0] + pc1[0]) / 2 + 3, pc0[1] + 7, 0.8, 0.8, 'rgba(255,210,150,0.8)');
      // стеллаж слева
      const S = SHELF, ir = P.RNG(17), zm = (S.z0 + S.z1) / 2;
      qa([[S.x0 + 0.005, S.top, S.z0], [S.x0 + 0.005, S.top, S.z1], [S.x0 + 0.005, AF, S.z1], [S.x0 + 0.005, AF, S.z0]], '#0e0804');
      qa([[S.x0, S.top, S.z0], [S.x1, S.top, S.z0], [S.x1, S.top, S.z1], [S.x0, S.top, S.z1]], '#22140a');
      S.ys.forEach(function (y) { qa([[S.x0, y, S.z0], [S.x1, y, S.z0], [S.x1, y, S.z1], [S.x0, y, S.z1]], y > 0 ? '#3a2414' : '#1c1108'); });
      const items = [];
      S.ys.forEach(function (y, li) {
        for (let zz = S.z0 + 0.12; zz < S.z1 - 0.08; zz += 0.17 + ir() * 0.18) {
          if (Math.abs(zz - zm) < 0.09) continue;
          if (li === 4 && Math.abs(zz - DOLLZ) < 0.16) continue;
          const kind = li === 4 ? [7, 2, 5, 8, 3][Math.floor(ir() * 5)] : (li === 0 ? [6, 3, 3, 8, 6][Math.floor(ir() * 5)] : [0, 0, 1, 1, 2, 3, 4, 5, 8][Math.floor(ir() * 9)]);
          items.push([zz, y, kind, ir() * 1000 | 0]);
        }
      });
      if (o.doll) items.push([DOLLZ, S.ys[4], -1, 0]);
      const drawIt = function (it) { const p = pa(S.x0 + 0.24, it[1], it[0]), s = sA(it[0]); if (it[2] === -1) dollMini(p[0], p[1], s); else itemA(it[2], p[0], p[1], s, P.RNG(it[3])); };
      const upright = function (z) {
        qa([[S.x0, S.top, z], [S.x1, S.top, z], [S.x1, AF, z], [S.x0, AF, z]], '#1c1108');
        qa([[S.x1, S.top, z - 0.03], [S.x1, S.top, z + 0.03], [S.x1, AF, z + 0.03], [S.x1, AF, z - 0.03]], '#3a2414');
        la([S.x1, S.top, z - 0.03], [S.x1, AF, z - 0.03], 'rgba(255,210,160,0.15)', 0.4);
      };
      upright(S.z1);
      items.filter(function (it) { return it[0] > zm; }).sort(function (a, b) { return b[0] - a[0]; }).forEach(drawIt);
      upright(zm);
      items.filter(function (it) { return it[0] < zm; }).sort(function (a, b) { return b[0] - a[0]; }).forEach(drawIt);
      upright(S.z0);
      S.ys.forEach(function (y) { qa([[S.x1, y, S.z0], [S.x1, y, S.z1], [S.x1, y + 0.045, S.z1], [S.x1, y + 0.045, S.z0]], '#4a2e18'); la([S.x1, y, S.z0], [S.x1, y, S.z1], 'rgba(255,210,160,0.22)', 0.35); });
      qa([[S.x1, S.top - 0.1, S.z0], [S.x1, S.top - 0.1, S.z1], [S.x1, S.top + 0.04, S.z1], [S.x1, S.top + 0.04, S.z0]], '#3a2414');
      // правая стена: зеркало в золочёной раме, картинка
      const mc = pa(AX, MRA.y, MRA.z), ms = sA(MRA.z);
      const ell3 = function (k, fill) { c.beginPath(); for (let i = 0; i <= 40; i++) { const an = i / 40 * 6.2832, p = pa(AX - 0.005, MRA.y + Math.sin(an) * MRA.hy * k, MRA.z + Math.cos(an) * MRA.hz * k); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); } c.closePath(); c.fillStyle = fill; c.fill(); };
      const mg = P.goldG(mc[0] - 0.2 * ms, mc[1] - 0.6 * ms, mc[0] + 0.2 * ms, mc[1] + 0.6 * ms);
      ell3(1.22, 'rgba(0,0,0,0.4)'); ell3(1.18, mg); ell3(1.1, '#2a1a06'); ell3(1.06, mg);
      ell3(1, LG(mc[0], mc[1] - 0.5 * ms, mc[0], mc[1] + 0.5 * ms, night ? [0, '#2a3634', 1, '#0c1412'] : [0, '#5a6a66', 1, '#24302c']));
      lighter(function () { const a = pa(AX - 0.01, MRA.y - 0.4, MRA.z + 0.12), b = pa(AX - 0.01, MRA.y + 0.4, MRA.z - 0.1); line(a[0], a[1], b[0], b[1], 'rgba(255,255,255,0.08)', 3); });
      const pi0 = pa(AX - 0.005, -1.0, 4.5), pi1 = pa(AX - 0.005, -0.3, 3.85);
      qa([[AX - 0.005, -1.02, 4.52], [AX - 0.005, -1.02, 3.83], [AX - 0.005, -0.28, 3.83], [AX - 0.005, -0.28, 4.52]], P.goldG(pi1[0], pi0[1], pi0[0], pi1[1]));
      qa([[AX - 0.01, -0.98, 4.48], [AX - 0.01, -0.98, 3.87], [AX - 0.01, -0.32, 3.87], [AX - 0.01, -0.32, 4.48]], '#1a1410');
      // прилавок вдоль правой стены
      qa([[CT.x0, CT.y, CT.z0], [CT.x0, CT.y, CT.z1], [CT.x0, AF, CT.z1], [CT.x0, AF, CT.z0]], night ? '#1e1108' : '#2a170b');
      for (let z = CT.z0 + 0.1; z < CT.z1 - 0.3; z += 0.7) { qa([[CT.x0, 0.76, z + 0.08], [CT.x0, 0.76, z + 0.6], [CT.x0, 1.42, z + 0.6], [CT.x0, 1.42, z + 0.08]], 'rgba(0,0,0,0.3)'); la([CT.x0, 0.76, z + 0.08], [CT.x0, 0.76, z + 0.6], 'rgba(255,210,160,0.14)', 0.4); }
      qa([[CT.x0, 1.48, CT.z0], [CT.x0, 1.48, CT.z1], [CT.x0, AF, CT.z1], [CT.x0, AF, CT.z0]], '#0e0704');
      qa([[CT.x0 - 0.04, CT.y, CT.z0], [AX, CT.y, CT.z0], [AX, CT.y, CT.z1 + 0.04], [CT.x0 - 0.04, CT.y, CT.z1 + 0.04]], night ? '#2e1a0c' : '#3e2614');
      qa([[CT.x0 - 0.04, CT.y, CT.z0], [CT.x0 - 0.04, CT.y, CT.z1 + 0.04], [CT.x0 - 0.04, CT.y + 0.05, CT.z1 + 0.04], [CT.x0 - 0.04, CT.y + 0.05, CT.z0]], '#4a2e18');
      la([CT.x0 - 0.04, CT.y, CT.z0], [CT.x0 - 0.04, CT.y, CT.z1 + 0.04], 'rgba(255,210,160,0.35)', 0.5);
      // на прилавке: гроссбух, звонок, весы
      qa([[1.95, CT.y - 0.005, 3.05], [2.32, CT.y - 0.03, 3.05], [2.32, CT.y - 0.03, 3.5], [1.95, CT.y - 0.005, 3.5]], '#d8ccaa');
      qa([[2.32, CT.y - 0.03, 3.05], [2.66, CT.y - 0.005, 3.05], [2.66, CT.y - 0.005, 3.5], [2.32, CT.y - 0.03, 3.5]], '#cfc2a0');
      for (let i = 1; i < 6; i++) { la([2.0, CT.y - 0.01, 3.05 + i * 0.07], [2.28, CT.y - 0.025, 3.05 + i * 0.07], 'rgba(60,40,30,0.35)', 0.25); la([2.36, CT.y - 0.025, 3.05 + i * 0.07], [2.62, CT.y - 0.01, 3.05 + i * 0.07], 'rgba(60,40,30,0.35)', 0.25); }
      const bp = pa(2.02, CT.y, 3.8), bs = sA(3.8);
      c.beginPath(); c.moveTo(bp[0] - 0.05 * bs, bp[1]); c.bezierCurveTo(bp[0] - 0.05 * bs, bp[1] - 0.06 * bs, bp[0] + 0.05 * bs, bp[1] - 0.06 * bs, bp[0] + 0.05 * bs, bp[1]); c.closePath(); c.fillStyle = P.brassG(bp[0] - 0.05 * bs, bp[0] + 0.05 * bs); c.fill();
      E(bp[0], bp[1] - 0.065 * bs, 0.01 * bs, 0.01 * bs, '#e8d090');
      const sp2 = pa(2.5, CT.y, 3.65), ss2 = sA(3.65);
      R(sp2[0] - 0.006 * ss2, sp2[1] - 0.22 * ss2, 0.012 * ss2, 0.22 * ss2, P.brassG(sp2[0] - 1, sp2[0] + 1)); line(sp2[0] - 0.12 * ss2, sp2[1] - 0.2 * ss2, sp2[0] + 0.12 * ss2, sp2[1] - 0.2 * ss2, '#a08040', 0.5);
      [-0.12, 0.12].forEach(function (dx) { line(sp2[0] + dx * ss2, sp2[1] - 0.2 * ss2, sp2[0] + dx * ss2, sp2[1] - 0.1 * ss2, 'rgba(160,130,70,0.6)', 0.2); E(sp2[0] + dx * ss2, sp2[1] - 0.09 * ss2, 0.05 * ss2, 0.012 * ss2, P.brassG(sp2[0] + (dx - 0.05) * ss2, sp2[0] + (dx + 0.05) * ss2)); });
      // лампа на прилавке
      const lb = pa(LAMPA[0], LAMPA[1], LAMPA[2]), ls = sA(LAMPA[2]);
      soft(lb[0] + 0.05 * ls, lb[1] + 0.01 * ls, 0.12 * ls, 0.025 * ls, '0,0,0', 0.5);
      E(lb[0], lb[1], 0.07 * ls, 0.018 * ls, P.brassG(lb[0] - 0.07 * ls, lb[0] + 0.07 * ls));
      R(lb[0] - 0.016 * ls, lb[1] - 0.1 * ls, 0.032 * ls, 0.1 * ls, P.brassG(lb[0] - 0.016 * ls, lb[0] + 0.016 * ls));
      E(lb[0], lb[1] - 0.14 * ls, 0.06 * ls, 0.05 * ls, 'rgba(200,150,70,0.55)');
      R(lb[0] - 0.035 * ls, lb[1] - 0.2 * ls, 0.07 * ls, 0.022 * ls, P.brassG(lb[0] - 0.035 * ls, lb[0] + 0.035 * ls));
      c.beginPath(); c.moveTo(lb[0] - 0.026 * ls, lb[1] - 0.2 * ls); c.bezierCurveTo(lb[0] - 0.055 * ls, lb[1] - 0.25 * ls, lb[0] - 0.05 * ls, lb[1] - 0.3 * ls, lb[0] - 0.018 * ls, lb[1] - 0.33 * ls); c.lineTo(lb[0] - 0.018 * ls, lb[1] - 0.44 * ls); c.lineTo(lb[0] + 0.018 * ls, lb[1] - 0.44 * ls); c.lineTo(lb[0] + 0.018 * ls, lb[1] - 0.33 * ls); c.bezierCurveTo(lb[0] + 0.05 * ls, lb[1] - 0.3 * ls, lb[0] + 0.055 * ls, lb[1] - 0.25 * ls, lb[0] + 0.026 * ls, lb[1] - 0.2 * ls); c.closePath();
      c.fillStyle = 'rgba(230,240,240,0.1)'; c.fill(); c.strokeStyle = 'rgba(255,240,220,0.3)'; c.lineWidth = 0.3; c.stroke();
      // балки и подвесная лампа
      [1.95, 3.05, 4.15].forEach(function (z) {
        qa([[-AX, AC + 0.2, z], [AX, AC + 0.2, z], [AX, AC + 0.2, z + 0.2], [-AX, AC + 0.2, z + 0.2]], '#140a04');
        qa([[-AX, AC, z], [AX, AC, z], [AX, AC + 0.2, z], [-AX, AC + 0.2, z]], '#2a1709');
        la([-AX, AC + 0.2, z], [AX, AC + 0.2, z], 'rgba(255,200,150,0.12)', 0.4);
      });
      const hl = pa(0, -0.95, 3.15), hs = sA(3.15), ht = pa(0, AC + 0.2, 3.15);
      line(hl[0], ht[1], hl[0], hl[1] - 0.12 * hs, '#1a1410', 0.5);
      R(hl[0] - 0.03 * hs, hl[1] - 0.16 * hs, 0.06 * hs, 0.05 * hs, P.brassG(hl[0] - 0.03 * hs, hl[0] + 0.03 * hs));
      poly([hl[0] - 0.2 * hs, hl[1], hl[0] + 0.2 * hs, hl[1], hl[0] + 0.07 * hs, hl[1] - 0.13 * hs, hl[0] - 0.07 * hs, hl[1] - 0.13 * hs], LG(hl[0] - 0.2 * hs, 0, hl[0] + 0.2 * hs, 0, [0, '#081e10', 0.45, '#225a34', 0.6, '#2e7444', 1, '#081e10']));
      R(hl[0] - 0.2 * hs, hl[1], 0.4 * hs, 0.012 * hs, '#c8a050');
      // свет
      const wc = [(wa[0] + wb[0]) / 2, (wa[1] + wb[1]) / 2], dc = [(da[0] + db[0]) / 2, (da[1] + db[1]) / 2];
      if (night) {
        lightMask(0.6, '2,3,7', [[LAMPF.x, LAMPF.y + 12, 210, 1, 0.75], [wc[0], wc[1], 64, 0.6], [dc[0], dc[1], 40, 0.45]]);
        lighter(function () { c.fillStyle = RG(LAMPF.x, LAMPF.y, 0, 240, [0, 'rgba(255,160,80,0.3)', 0.35, 'rgba(255,130,60,0.1)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, W, H); });
        const m2 = pa(AX - 0.02, MRA.y + 0.05, MRA.z - 0.05); gl(m2[0], m2[1], 6, '255,190,120', 0.35);
      } else {
        // косые лучи из витрины на пол
        const dir = [0.3, 0.5], fl = function (x, y) { const tt = Math.min((AF - y) / dir[1], AZ - 1.0); return pa(x + dir[0] * tt, AF, AZ - tt); };
        const f0 = fl(WA.x0, WA.y0), f1 = fl(WA.x1, WA.y0), f2 = fl(WA.x1, WA.y1), f3 = fl(WA.x0, WA.y1);
        lightMask(0.4, '10,12,24', [[wc[0], wc[1], 140, 1, 1.1], [dc[0], dc[1], 100, 0.9, 1.4], [(f0[0] + f2[0]) / 2, (f0[1] + f2[1]) / 2, 110, 0.7, 0.45]]);
        lighter(function () {
          poly([wa[0], wa[1], wb[0], wa[1], f2[0], f2[1], f3[0], f3[1]], LG(0, wa[1], 0, f3[1], [0, 'rgba(255,200,150,0.14)', 1, 'rgba(255,190,140,0)']));
          poly([wa[0], wb[1], wb[0], wb[1], f1[0], f1[1], f0[0], f0[1]], LG(0, wb[1], 0, f0[1], [0, 'rgba(255,200,150,0.1)', 1, 'rgba(255,190,140,0.03)']));
          poly([f0[0], f0[1], f1[0], f1[1], f2[0], f2[1], f3[0], f3[1]], 'rgba(255,196,150,0.12)');
        });
        gl(wc[0], wc[1], 90, '255,210,170', 0.3); gl(dc[0], dc[1], 50, '255,214,176', 0.3);
      }
      vign(0.5, 192, 100, 70);
    });
  }
  /* дверь лавки: открыта на op (0..1), петли слева, открывается внутрь */
  function doorLeaf(op, night) {
    const a = op * 1.3, ca = Math.cos(a), sa = Math.sin(a), wd = DA.x1 - DA.x0;
    const M = function (u, v) { return [DA.x0 + u * wd * ca, lerp(DA.y0, DA.y1, v), AZ - 0.02 - u * wd * sa]; };
    const qd = function (u0, v0, u1, v1, f) { qa([M(u0, v0), M(u1, v0), M(u1, v1), M(u0, v1)], f); };
    const ln = function (a0, b0, col, w) { const p = pm(a0), q = pm(b0); line(p[0], p[1], q[0], q[1], col, w); };
    if (op > 0.02) { const e0 = M(1, 0), e1 = M(1, 1); qa([e0, e1, [e1[0] + 0.05 * sa, e1[1], e1[2] + 0.05 * ca], [e0[0] + 0.05 * sa, e0[1], e0[2] + 0.05 * ca]], '#0e0804'); }
    qd(0, 0, 1, 1, night ? '#1e1208' : '#2c1b0e');
    qd(0.14, 0.6, 0.86, 0.93, night ? 'rgba(30,44,60,0.55)' : 'rgba(255,226,196,0.42)');
    for (let u = 0.16; u < 0.86; u += 0.045) ln(M(u, 0.6), M(u, 0.93), 'rgba(240,232,214,0.13)', 0.3);
    ln(M(0.5, 0.6), M(0.5, 0.93), '#140c06', 0.7); ln(M(0.14, 0.77), M(0.86, 0.77), '#140c06', 0.7);
    qd(0.14, 0.08, 0.46, 0.52, 'rgba(0,0,0,0.3)'); qd(0.54, 0.08, 0.86, 0.52, 'rgba(0,0,0,0.3)');
    ln(M(0.14, 0.52), M(0.46, 0.52), 'rgba(255,210,160,0.15)', 0.3); ln(M(0.54, 0.52), M(0.86, 0.52), 'rgba(255,210,160,0.15)', 0.3);
    ln(M(0, 1), M(1, 1), 'rgba(255,210,160,0.12)', 0.4);
    const hp = pm(M(0.9, 0.5)); E(hp[0], hp[1], 0.9, 0.9, P.brassG(hp[0] - 1, hp[0] + 1));
  }
  /* колокольчик на пружине над дверью */
  function bellA(sw) {
    const c = X(), s = BELLA.s * 2.3, x = BELLA.x, y = BELLA.y;
    line(x - 0.1 * s, y, x + 0.01 * s, y, '#141210', 0.02 * s);
    c.save(); c.translate(x, y); c.rotate(sw || 0);
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 0.006 * s; c.beginPath(); for (let i = 0; i < 7; i++) c.lineTo((i % 2 ? 0.015 : -0.015) * s, i * 0.01 * s); c.stroke();
    c.beginPath(); c.moveTo(-0.016 * s, 0.06 * s); c.bezierCurveTo(-0.028 * s, 0.075 * s, -0.032 * s, 0.1 * s, -0.048 * s, 0.115 * s); c.lineTo(0.048 * s, 0.115 * s); c.bezierCurveTo(0.032 * s, 0.1 * s, 0.028 * s, 0.075 * s, 0.016 * s, 0.06 * s); c.closePath();
    c.fillStyle = LG(-0.048 * s, 0, 0.048 * s, 0, [0, '#4a3410', 0.4, '#f0d080', 1, '#3a2408']); c.fill();
    E(0, 0.122 * s, 0.01 * s, 0.01 * s, '#3a2a10');
    c.restore();
  }
  function pendA(now, stop) {
    const K = CKA, s = K.s, x = K.fx, y = K.fy + 0.34 * s, c = X();
    c.save(); c.beginPath(); c.rect(x - 0.15 * s, y, 0.3 * s, 1.08 * s); c.clip();
    c.translate(x, y); c.rotate(stop ? 0 : Math.sin(now / 520) * 0.12);
    R(-0.008 * s, 0, 0.016 * s, 0.8 * s, P.brassG(-0.01 * s, 0.01 * s)); E(0, 0.86 * s, 0.07 * s, 0.07 * s, P.brassG(-0.07 * s, 0.07 * s));
    c.restore();
  }
  function doorRect() { const da = bw(DA.x0, DA.y1), db = bw(DA.x1, DA.y0); return [da[0], da[1], db[0] - da[0], db[1] - da[1]]; }
  /* кадр лавки: o.open, o.who (в проёме), o.inside (в лавке), o.bell, o.lampOff, o.before, o.after */
  function roomF(t, now, L, o) {
    o = o || {};
    const c = X(), night = L.mode === 'night', dr = doorRect(), wa = bw(WA.x0, WA.y1), wb = bw(WA.x1, WA.y0);
    c.drawImage(L.room, 0, 0, W, H);
    c.save(); c.beginPath(); c.rect(wa[0], wa[1], wb[0] - wa[0], wb[1] - wa[1]); c.rect(dr[0], dr[1], dr[2], dr[3]); c.clip();
    P.fog(wa[1] + 16, 52, now, 5, night ? 0.45 : 0.5, night ? '140,152,166' : '255,236,222', 9);
    c.restore();
    if (o.who) { c.save(); c.beginPath(); c.rect(dr[0], dr[1], dr[2], dr[3]); c.clip(); o.who(dr); c.restore(); }
    pendA(now, o.stopClock);
    if (o.before) o.before();
    const op = o.open || 0;
    if (op > 0.02 && !night) lighter(function () { const a = pa(DA.x0, AF, AZ), b = pa(DA.x1, AF, AZ), d = pa(DA.x1 + 0.5, AF, AZ - 2.6), e = pa(DA.x0 + 0.2, AF, AZ - 2.6); poly([a[0], a[1], b[0], b[1], d[0], d[1], e[0], e[1]], 'rgba(255,200,150,' + (0.16 * op).toFixed(3) + ')'); });
    doorLeaf(op, night);
    bellA(o.bell || 0);
    if (o.inside) o.inside();
    if (night && !o.lampOff) { P.flame(LAMPF.x, LAMPF.y + 2.6, 0.75, now, 2, '255,160,70', 0); bloom(LAMPF.x, LAMPF.y + 1, 64, '255,170,90', 0.3); }
    if (!night) P.motes(now, 60, 60, 200, 130, 46, 8, '255,230,190', 0.55);
    if (o.after) o.after();
  }

  /* ============================================================
     K. КРЫЛЬЦО ЛАВКИ КРУПНО — фасад анфас, рассвет слева
     ============================================================ */
  const DS = { x0: 168, x1: 238, y0: 28, y1: 170, gx0: 176, gx1: 230, gy0: 36, gy1: 94 };
  function doorstepL(o) {
    o = o || {};
    return layer(function () {
      const c = X();
      // низ вывески и карниз
      R(0, 0, W, 10, '#10201a'); R(0, 2, W, 6, '#13261f'); R(0, 8.4, W, 0.8, 'rgba(176,146,84,0.9)'); R(0, 10, W, 4, '#24160c');
      for (let x = 2; x < W; x += 6) R(x, 12.2, 3, 1.8, '#1a100a');
      R(0, 14, W, 3, 'rgba(0,0,0,0.45)');
      // обшивка доской
      plankWall(0, 14, W, 140, '#4a3020', 61);
      // цоколь из плитняка
      R(0, 152, W, 20, '#56524c');
      const rs = P.RNG(4);
      for (let row = 0; row < 2; row++) for (let x = -rs() * 20; x < W; x += 22 + rs() * 16) { P.rr(x + 0.6, 152.6 + row * 9.6, 20 + rs() * 10, 8.6, 1.2, P.sh('#6a665e', 0.85 + rs() * 0.3)); }
      P.tex(0, 152, W, 20, 0.5, 'overlay', 'mot', 1.3);
      R(0, 152, W, 1.2, 'rgba(0,0,0,0.4)');
      // водосточная труба
      R(14, 0, 7, 166, LG(14, 0, 21, 0, [0, '#26282a', 0.4, '#6a6e6c', 1, '#181a1a']));
      for (let y = 20; y < 160; y += 44) R(12, y, 11, 2.4, '#1a1c1c');
      c.beginPath(); c.moveTo(14, 160); c.quadraticCurveTo(14, 168, 6, 170); c.lineTo(0, 170); c.lineTo(0, 164); c.lineTo(5, 164); c.quadraticCurveTo(8, 163, 8, 158); c.closePath(); c.fillStyle = '#3a3c3c'; c.fill();
      // объявление «РОЗЫСК»: бумага, оттиск цилиндра, оборванный угол
      c.save(); c.translate(74, 92); c.rotate(-0.04);
      c.beginPath(); c.moveTo(-23, -30); c.lineTo(23, -30); c.lineTo(23, 18); c.lineTo(14, 22); c.lineTo(18, 28); c.lineTo(-23, 30); c.closePath();
      c.fillStyle = LG(0, -30, 0, 30, [0, '#ddd3b8', 1, '#bcb092']); c.fill();
      c.save(); c.clip(); P.tex(-24, -31, 48, 62, 0.5, 'multiply', 'mot', 0.5); c.restore();
      txt('РОЗЫСК', 0, -21, 'bold 7.4px ' + SERIF, '#2a1a12', 'center', '1px');
      line(-18, -17, 18, -17, 'rgba(40,20,10,0.5)', 0.4);
      person(0, 6, 20, { hat: 'top', thin: 0.75, long: true, col: 'rgba(30,20,14,0.85)' });
      for (let i = 0; i < 4; i++) line(-17, 11 + i * 3.4, 17 - (i % 2) * 6, 11 + i * 3.4, 'rgba(40,30,20,0.35)', 0.5);
      poly([14, 22, 23, 18, 21, 25], '#a89a7c');
      c.restore();
      soft(78, 96, 30, 36, '0,0,0', 0.12);
      // фонарь-бра на кронштейне
      R(128, 40, 3, 6, '#141210'); line(129, 42, 112, 42, '#141210', 1.2); c.strokeStyle = '#141210'; c.lineWidth = 0.6; c.beginPath(); c.arc(120, 45, 4, Math.PI, 0); c.stroke();
      line(112, 42, 112, 47, '#141210', 0.5);
      poly([105, 50, 119, 50, 117, 66, 107, 66], 'rgba(200,206,210,0.55)'); poly([103, 50, 121, 50, 112, 45], '#181614'); R(105, 66, 14, 2, '#181614');
      line(112, 50, 112, 66, 'rgba(0,0,0,0.5)', 0.4); E(112, 62, 1.4, 2, 'rgba(60,60,60,0.6)');
      // дверь: наличник с карнизиком, полотно, стекло с тюлем и золотыми буквами, филёнки, ручка, накладка
      R(DS.x0 - 12, DS.y0 - 14, DS.x1 - DS.x0 + 24, 6, '#3a2616'); R(DS.x0 - 14, DS.y0 - 16, DS.x1 - DS.x0 + 28, 2.4, '#4a3220');
      R(DS.x0 - 14, DS.y0 - 8, DS.x1 - DS.x0 + 28, 2, 'rgba(0,0,0,0.5)');
      R(DS.x0 - 10, DS.y0 - 8, 10, DS.y1 - DS.y0 + 8, LG(DS.x0 - 10, 0, DS.x0, 0, [0, '#4a3020', 0.5, '#3a2616', 1, '#22140a']));
      R(DS.x1, DS.y0 - 8, 10, DS.y1 - DS.y0 + 8, LG(DS.x1, 0, DS.x1 + 10, 0, [0, '#22140a', 0.5, '#3a2616', 1, '#2a1a0e']));
      R(DS.x0, DS.y0 - 8, DS.x1 - DS.x0, 8, '#2e1c10');
      R(DS.x0, DS.y0, DS.x1 - DS.x0, DS.y1 - DS.y0, LG(DS.x0, 0, DS.x1, 0, [0, '#3e2616', 0.5, '#33200f', 1, '#28180a']));
      R(DS.gx0 - 2, DS.gy0 - 2, DS.gx1 - DS.gx0 + 4, DS.gy1 - DS.gy0 + 4, '#1a0e06');
      [[DS.gx0, 201], [205, DS.gx1]].forEach(function (g) {
        c.save(); c.beginPath(); c.rect(g[0], DS.gy0, g[1] - g[0], DS.gy1 - DS.gy0); c.clip();
        R(g[0], DS.gy0, g[1] - g[0], DS.gy1 - DS.gy0, LG(0, DS.gy0, 0, DS.gy1, [0, '#2a2a34', 1, '#121218']));
        R(g[0], DS.gy0, g[1] - g[0], DS.gy1 - DS.gy0, LG(g[0], 0, g[1], 0, [0, 'rgba(220,210,190,0.1)', 0.3, 'rgba(220,210,190,0.2)', 0.55, 'rgba(220,210,190,0.08)', 0.8, 'rgba(220,210,190,0.18)', 1, 'rgba(220,210,190,0.06)']));
        for (let x = g[0] + 1; x < g[1]; x += 2.6) line(x, DS.gy0, x + 0.3, DS.gy1, 'rgba(225,215,195,0.07)', 0.3);
        lighter(function () { R(g[0], DS.gy0, g[1] - g[0], DS.gy1 - DS.gy0, LG(g[0], DS.gy0, g[1], DS.gy1, [0, 'rgba(160,140,170,0.22)', 0.5, 'rgba(255,200,170,0.1)', 1, 'rgba(60,70,90,0.05)'])); poly([g[0] + 4, DS.gy0, g[0] + 9, DS.gy0, g[0] + 2, DS.gy1, g[0] - 3, DS.gy1], 'rgba(255,255,255,0.07)'); });
        c.restore();
      });
      c.save(); c.font = 'italic bold 8px ' + SERIF; c.textAlign = 'center';
      c.fillStyle = 'rgba(20,10,4,0.6)'; c.fillText('Последний час', 203.4, 54.4);
      c.fillStyle = LG(0, 47, 0, 55, [0, '#fff0c0', 0.5, '#d8a848', 1, '#8a6020']); c.fillText('Последний час', 203, 54); c.restore();
      [[176, 104, 25, 56], [205, 104, 25, 56]].forEach(function (p) {
        R(p[0], p[1], p[2], p[3], 'rgba(0,0,0,0.35)'); R(p[0] + 1.5, p[1] + 1.5, p[2] - 3, p[3] - 3, LG(p[0], p[1], p[0] + p[2], p[1] + p[3], [0, '#4a3020', 1, '#2a180c']));
        R(p[0] + 4, p[1] + 4, p[2] - 8, p[3] - 8, LG(p[0], p[1], p[0] + p[2], p[1] + p[3], [0, '#3e2818', 1, '#2e1c0e']));
        line(p[0] + 1.5, p[1] + 1.5, p[0] + p[2] - 1.5, p[1] + 1.5, 'rgba(255,210,160,0.2)', 0.4);
      });
      R(192, 98.4, 22, 3, P.brassG(192, 214)); R(193, 99.2, 20, 1.2, '#140c06');
      R(228.6, 112, 4.6, 16, LG(228.6, 0, 233.2, 0, [0, '#6a4a1a', 0.5, '#e0c070', 1, '#5a3a10'])); E(231, 123, 0.8, 1.4, '#140c06');
      c.beginPath(); c.roundRect(222, 109, 10, 3, 1.4); c.fillStyle = P.brassG(222, 232); c.fill();
      R(DS.x0 + 3, 164.4, DS.x1 - DS.x0 - 6, 3.6, LG(0, 164.4, 0, 168, [0, '#5e4a2a', 1, '#2a1c0c'])); R(DS.x0 + 3, 164.4, DS.x1 - DS.x0 - 6, 0.5, 'rgba(255,230,180,0.22)');
      // витрина справа
      const vx0 = 258, vy0 = 26, vy1 = 150;
      R(vx0, vy0, W - vx0, vy1 - vy0, '#22140a'); R(vx0, vy0, 2, vy1 - vy0, 'rgba(255,210,160,0.15)');
      c.save(); c.beginPath(); c.rect(vx0 + 8, vy0 + 8, W - vx0, vy1 - vy0 - 16); c.clip();
      R(vx0 + 8, vy0 + 8, W - vx0, vy1 - vy0 - 16, LG(0, vy0, 0, vy1, [0, '#1a1a20', 1, '#0a0a0e']));
      R(vx0 + 8, vy0 + 8, 12, vy1 - vy0 - 16, LG(vx0 + 8, 0, vx0 + 20, 0, [0, '#5a100a', 1, '#2a0604']));
      [72, 104].forEach(function (sy) { R(vx0 + 20, sy, W, 2, '#1a0e06'); for (let i = 0; i < 10; i++) { const ix = vx0 + 28 + i * 11; R(ix, sy - 8 - (i % 3) * 3, 6, 8 + (i % 3) * 3, 'rgba(40,24,14,0.9)'); } });
      E(330, 128, 9, 9, P.brassG(321, 339)); E(330, 128, 7, 7, '#d8d0b8'); P.hands(330, 128, 7, 2.75, 45);
      lighter(function () {
        R(vx0 + 8, vy0 + 8, W - vx0, vy1 - vy0 - 16, LG(0, vy0, 0, vy1, [0, 'rgba(170,150,190,0.26)', 0.6, 'rgba(255,190,160,0.14)', 1, 'rgba(90,90,120,0.08)']));
        poly([280, vy0, 300, vy0, 262, vy1, 242, vy1], 'rgba(255,255,255,0.07)'); poly([320, vy0, 326, vy0, 300, vy1, 294, vy1], 'rgba(255,255,255,0.06)');
      });
      c.restore();
      c.save(); c.font = 'bold 15px ' + SERIF; c.textAlign = 'left'; c.letterSpacing = '3px';
      c.fillStyle = 'rgba(20,10,4,0.6)'; c.fillText('ЛОМБАРД', 286.6, 52.6); c.fillStyle = LG(0, 40, 0, 53, [0, '#fff0c0', 0.5, '#d8a848', 1, '#8a6020']); c.fillText('ЛОМБАРД', 286, 52); c.letterSpacing = '0px'; c.restore();
      R(vx0 - 2, vy1, W - vx0 + 4, 6, LG(0, vy1, 0, vy1 + 6, [0, '#8a8478', 1, '#4a4640'])); R(vx0 - 2, vy1, W - vx0 + 4, 0.8, 'rgba(255,240,220,0.5)');
      // ступени, тротуар, бордюр, мостовая
      R(150, 170, 106, 3.6, '#9a948a'); R(150, 173.6, 106, 6.6, '#625e58'); R(150, 170, 106, 0.6, 'rgba(255,240,220,0.5)');
      R(138, 180.2, 130, 3.6, '#8e887e'); R(138, 183.8, 130, 6.4, '#56524c'); R(138, 180.2, 130, 0.6, 'rgba(255,240,220,0.45)');
      P.tex(138, 170, 130, 20, 0.45, 'overlay', 'mot', 0.9);
      R(0, 190, W, 11, '#6a6662'); for (let x = 20; x < W; x += 52) line(x, 190, x - 6, 201, 'rgba(0,0,0,0.35)', 0.5); line(0, 195.4, W, 195.4, 'rgba(0,0,0,0.18)', 0.4);
      P.tex(0, 190, W, 11, 0.4, 'overlay', 'mot', 1.1);
      R(0, 201, W, 3, '#8a8680'); R(0, 201, W, 0.6, 'rgba(255,240,220,0.4)');
      P.cobbles(204, 216, '#4a4650', 9);
      // рассвет слева: тёплый свет по доскам, тени вправо от выступов
      R(DS.x1 + 10, DS.y0 - 10, 14, DS.y1 - DS.y0 + 10, 'rgba(14,10,24,0.3)');
      R(DS.x0 - 14, DS.y0 - 6, DS.x1 - DS.x0 + 38, 6, 'rgba(14,10,24,0.35)');
      poly([121, 50, 132, 54, 132, 74, 121, 68], 'rgba(14,10,24,0.22)');
      poly([256, 173.6, 268, 173.6, 272, 180, 256, 180], 'rgba(14,10,24,0.35)'); poly([268, 183.8, 282, 183.8, 288, 190, 268, 190], 'rgba(14,10,24,0.35)');
      lighter(function () { R(0, 0, W, H, LG(0, 0, W, 0, [0, o.time === 'morning' ? 'rgba(255,230,200,0.14)' : 'rgba(255,160,100,0.26)', 0.55, 'rgba(255,170,110,0.06)', 1, 'rgba(0,0,0,0)'])); });
      R(0, 0, W, H, LG(0, 0, W, 0, [0, 'rgba(20,20,44,0)', 0.6, 'rgba(20,20,44,0.1)', 1, 'rgba(20,20,44,0.32)']));
      R(0, 0, W, 40, LG(0, 0, 0, 40, [0, 'rgba(0,0,0,0.45)', 1, 'rgba(0,0,0,0)']));
      vign(0.45, 200, 120, 80);
    });
  }
  /* коврик у двери; lift — угол приподнят */
  function doorMat(lift) {
    const c = X(), l = lift || 0;
    c.beginPath(); c.moveTo(178, 171.4); c.lineTo(228, 171.4); c.lineTo(230, 169.4); c.lineTo(180 - l * 3, 168.6 - l * 5); c.closePath();
    c.fillStyle = '#3a2a1a'; c.fill();
    for (let x = 181; x < 228; x += 2.2) line(x, 169.2, x + 0.5, 171.2, 'rgba(0,0,0,0.35)', 0.3);
    line(178, 171.4, 228, 171.4, 'rgba(255,220,180,0.3)', 0.3);
  }
  /* колокольчик за стеклом двери */
  function bellBehindGlass(sw) {
    const c = X();
    c.save(); c.beginPath(); c.rect(205, DS.gy0, DS.gx1 - 205, DS.gy1 - DS.gy0); c.clip();
    c.globalAlpha = 0.7;
    line(219, DS.gy0, 219, DS.gy0 + 4, '#0a0806', 0.6);
    c.translate(219, DS.gy0 + 4); c.rotate(sw);
    c.strokeStyle = '#2a2a2a'; c.lineWidth = 0.4; c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(i % 2 ? 1 : -1, i * 0.9); c.stroke();
    c.beginPath(); c.moveTo(-1.2, 5); c.bezierCurveTo(-2, 6.4, -2.4, 8.6, -3.8, 9.8); c.lineTo(3.8, 9.8); c.bezierCurveTo(2.4, 8.6, 2, 6.4, 1.2, 5); c.closePath();
    c.fillStyle = LG(-3.8, 0, 3.8, 0, [0, '#3a2a10', 0.4, '#d8b868', 1, '#2a1808']); c.fill();
    c.restore();
  }
  function porchShot(t, k, now, L, o) {
    camIn(o.z, o.fx, o.fy, function () {
      X().drawImage(L.ds, 0, 0, W, H);
      doorMat(0);
      if (o.pulse) gl(200, 90, 200, '255,220,180', o.pulse);
      soft(166, 186, 26, 4, '0,0,0', 0.45);
      oldSit(152, 171, 1.32, now, { watch: true, cap: true, rim: 'rgba(255,196,150,0.75)', rimDx: -0.6, rimDy: -0.35, hair: '#55524d' });
      breath(163, 120, now, 0.3, 1);
      P.fog(150, 66, now, 4, 0.34, '236,226,226', 3);
    });
  }

  /* ============================================================
     B. ЗЕРКАЛО ЧЕРЕЗ ПЛЕЧО — ты спиной к нам, с лампой
     ============================================================ */
  const MO = { x: 206, y: 92, rx: 50, ry: 72 };
  function mirrorL(room) {
    return layer(function () {
      const c = X();
      R(0, 0, W, H, LG(0, 0, 0, H, [0, '#0d1713', 1, '#16221d']));
      damask(0, 0, W, 170, '120,160,140', 0.12, 1.1);
      P.tex(0, 0, W, H, 0.45, 'overlay', 'mot', 1.4);
      R(0, 170, W, 46, LG(0, 170, 0, 216, [0, '#2a180c', 1, '#120a04'])); R(0, 170, W, 1, 'rgba(255,210,160,0.2)');
      for (let x = 6; x < W; x += 64) P.rr(x, 178, 54, 34, 1, 'rgba(0,0,0,0.3)');
      soft(MO.x + 10, MO.y + 12, MO.rx * 1.6, MO.ry * 1.4, '0,0,0', 0.8);
      const gg = P.goldG(MO.x - 60, MO.y - 90, MO.x + 60, MO.y + 90);
      E(MO.x, MO.y, MO.rx + 13, MO.ry + 13, gg); E(MO.x, MO.y, MO.rx + 9.6, MO.ry + 9.6, '#2a1a06');
      E(MO.x, MO.y, MO.rx + 8, MO.ry + 8, P.goldG(MO.x - 50, MO.y - 80, MO.x + 50, MO.y + 80)); E(MO.x, MO.y, MO.rx + 3, MO.ry + 3, '#3a2408');
      for (let i = 0; i < 40; i++) { const a = i / 40 * 6.2832, bx = MO.x + Math.cos(a) * (MO.rx + 11.3), by = MO.y + Math.sin(a) * (MO.ry + 11.3); E(bx, by, 1.6, 1.6, P.goldG(bx - 2, by - 2, bx + 2, by + 2)); }
      c.save(); c.translate(MO.x, MO.y - MO.ry - 14);
      for (let k = -4; k <= 4; k++) { c.save(); c.rotate(k * 0.3); E(0, -7, 2.6, 8, P.goldG(-3, -15, 3, 0)); c.restore(); }
      E(0, 0, 5, 3.4, gg); c.restore();
      c.save(); c.translate(MO.x, MO.y + MO.ry + 13); [-1, 1].forEach(function (sd) { for (let k = 0; k < 4; k++) E(sd * (5 + k * 6), -k * 1.6, 4.6, 2, P.goldG(-20, -6, 20, 6), sd * (0.3 + k * 0.15)); }); E(0, 0, 4, 4, gg); c.restore();
      c.save(); c.beginPath(); c.ellipse(MO.x, MO.y, MO.rx, MO.ry, 0, 0, 6.2832); c.clip();
      blurred(1.3, function () { const c2 = X(); c2.save(); c2.translate(W, 0); c2.scale(-1, 1); c2.drawImage(room, -60, -46, W * 1.4, H * 1.4); c2.restore(); });
      R(0, 0, W, H, 'rgba(8,12,12,0.5)');
      const r = P.RNG(9); for (let i = 0; i < 30; i++) { const a = r() * 6.28, d = 0.82 + r() * 0.18; soft(MO.x + Math.cos(a) * MO.rx * d, MO.y + Math.sin(a) * MO.ry * d, 2 + r() * 6, 2 + r() * 5, '60,56,44', 0.4); }
      c.restore();
    });
  }
  /* отражение в зеркале: ты с лампой; age — 0 (как сейчас) … 1 (старик) */
  function reflL(age) {
    return layer(function () {
      const c = X();
      c.save(); c.beginPath(); c.ellipse(MO.x, MO.y, MO.rx, MO.ry, 0, 0, 6.2832); c.clip();
      blurred(0.9, function () {
        const fx = 192, fy = 236, h = age ? 146 : 158, hy = fy - h * 0.94;
        person(fx, fy, h, { col: '#060708', scarf: !age, thin: age ? 1.06 : 1, flare: age ? 1.2 : 0, rim: 'rgba(255,160,90,0.3)', rimDy: 1.2 });
        soft(fx + 1, hy + 5, 5.4, 7.4, '255,160,90', 0.4); soft(fx - 10, hy + 40, 16, 22, '255,150,80', 0.12);
        if (age) {
          soft(fx - 5.8, hy - 0.6, 2.8, 4.8, '200,196,188', 0.8); soft(fx + 5.8, hy - 0.6, 2.8, 4.8, '200,196,188', 0.8);
          soft(fx, hy - 5.4, 6, 2.6, '196,192,184', 0.45);
          soft(fx, hy + 10.5, 5, 7.6, '220,214,204', 0.95); soft(fx, hy + 13.5, 3.6, 4.4, '255,200,150', 0.5);
          soft(fx, hy + 5.4, 3.8, 1.3, '210,204,196', 0.65);
        }
      });
      c.restore();
    });
  }
  function heroBackL() { return layer(function () { blurred(3.4, function () { hero(84, 330, 236, { col: '#030304', rim: 'rgba(255,160,90,0.45)', rimDx: 2.4, rimDy: 0.6 }); }); }); }
  /* o.who — есть ли отражение; o.age — 0..1 */
  function mirrorF(now, L, o) {
    const c = X();
    c.drawImage(L.m, 0, 0, W, H);
    c.save(); c.beginPath(); c.ellipse(MO.x, MO.y, MO.rx, MO.ry, 0, 0, 6.2832); c.clip();
    const lx = 178, ly = 150, ag = o.age || 0;
    if (o.who) { c.save(); c.globalAlpha = 1 - ag; c.drawImage(L.ry, 0, 0, W, H); c.globalAlpha = ag; c.drawImage(L.ro, 0, 0, W, H); c.restore(); }
    bloom(lx, ly, 46, '255,170,90', 0.5); P.flame(lx, ly + 2, 0.9, now, 3, '255,150,60', 0);
    lighter(function () { poly([MO.x - 30, MO.y - MO.ry, MO.x - 16, MO.y - MO.ry, MO.x - 48, MO.y + MO.ry, MO.x - 62, MO.y + MO.ry], 'rgba(255,255,255,0.05)'); });
    R(0, 0, W, H, RG(MO.x, MO.y, MO.rx * 0.6, MO.ry * 1.1, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.5)']));
    c.restore();
    // ты — спиной, не в фокусе; лампа в руке ниже кадра
    lighter(function () { c.fillStyle = RG(150, 232, 0, 230, [0, 'rgba(255,150,70,0.28)', 0.4, 'rgba(255,120,50,0.08)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, W, H); });
    c.drawImage(L.fg, 0, 0, W, H);
    bloom(158, 222, 90, '255,160,80', 0.4);
  }

  /* ============================================================
     C. ЧЁРНАЯ КНИГА: стол при свече, рука в перчатке
     ============================================================ */
  const BK = KN.BK, pg = KN.pg, onPage = KN.onPage;
  const CANDLE = { x: 352, y: 150, h: 48 };
  function bookEnvL() {
    return layer(function () {
      const c = X();
      blurred(3.6, function () {
        R(0, 0, W, 52, '#0c0806');
        [16, 34].forEach(function (y) { R(120, y, 170, 2, '#2a1a0e'); for (let i = 0; i < 14; i++) R(124 + i * 12, y - 9 - (i % 3) * 2, 7, 9 + (i % 3) * 2, ['#1a2a22', '#3a1a14', '#22223a', '#3a2a10'][i % 4]); });
        for (let i = 0; i < 9; i++) gl(20 + i * 44 + hsh(i) * 10, 12 + hsh(i + 4) * 26, 3 + hsh(i + 2) * 4, '255,170,90', 0.45);
        E(318, 26, 20, 26, '#4a3818'); E(318, 26, 17, 23, '#141c1a');
      });
      R(0, 44, W, H - 44, LG(0, 44, 0, H, [0, '#140a05', 0.5, '#1e1007', 1, '#0e0703']));
      for (let y = 46; y < H; y += 12) R(0, y, W, 0.5, 'rgba(0,0,0,0.4)');
      const r = P.RNG(5);
      for (let i = 0; i < 220; i++) { const y = 46 + r() * 170, x = r() * W, l = 10 + r() * 40; line(x, y, x + l, y + (r() - 0.5), 'rgba(10,4,0,' + (0.1 + r() * 0.2).toFixed(2) + ')', 0.2); }
      P.tex(0, 44, W, 172, 0.3, 'overlay', 'mot', 0.9);
      R(0, 44, W, 1.2, 'rgba(255,170,100,0.18)');
      // чернильница с красными чернилами, перо
      soft(40, 76, 22, 6, '0,0,0', 0.5);
      R(26, 58, 18, 16, LG(26, 0, 44, 0, [0, '#0a0a10', 0.5, '#2a2a3a', 1, '#05050a'])); R(28, 54, 14, 4, P.brassG(28, 42)); E(35, 56, 5, 1.2, '#4a0a08');
      c.beginPath(); c.moveTo(36, 56); c.quadraticCurveTo(20, 32, 4, 14); c.lineTo(6, 12); c.quadraticCurveTo(22, 30, 38, 55); c.closePath(); c.fillStyle = '#16100c'; c.fill();
      // свеча в подсвечнике, натёки воска
      soft(CANDLE.x + 16, CANDLE.y + 2, 26, 6, '0,0,0', 0.55);
      E(CANDLE.x, CANDLE.y, 12, 3, P.brassG(CANDLE.x - 12, CANDLE.x + 12)); E(CANDLE.x, CANDLE.y - 1.4, 9, 2, '#5a3a14');
      P.candleBody(CANDLE.x, CANDLE.y - 1, CANDLE.h, 7, '#e8dcbc');
      [[-2.6, 8], [1.4, 14], [3, 6]].forEach(function (d) { R(CANDLE.x + d[0], CANDLE.y - CANDLE.h, 1.4, d[1], 'rgba(240,230,205,0.9)'); E(CANDLE.x + d[0] + 0.7, CANDLE.y - CANDLE.h + d[1], 0.9, 1.1, 'rgba(240,230,205,0.9)'); });
      lighter(function () { c.fillStyle = RG(CANDLE.x, CANDLE.y - CANDLE.h - 6, 0, 320, [0, 'rgba(255,150,70,0.34)', 0.35, 'rgba(255,120,50,0.1)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, W, H); });
    });
  }
  function namesPage(u0, u1, seed, n, col, heir) {
    const r = P.RNG(seed), names = ['Крюк С. Ф.', 'Вересов И. И.', 'Градов П. А.', 'Сорин М. И.', 'Шмидт А.', 'Полякова Е.', 'Бурцев Н.', 'Яша Хромой', 'Агата В.', 'Прохор', 'Гофман О.', 'Лиза Г.', 'Никодим', 'Фрося', 'Вельц Л.', 'Ермолаев', 'Сажина М.', 'Трофимов', 'Кузьмина А.', 'Орлов Д.'];
    const what = ['тень', 'отражение', 'походка', 'имя', 'сон', '7 ночей', 'голос', 'память', 'моргание', 'смех'];
    for (let i = 0; i < n; i++) {
      const v = 0.08 + i * 0.064; if (v > 0.96) break;
      const a = pg(u0, v), b = pg(u1, v); line(a[0], a[1] + 1, b[0], b[1] + 1, 'rgba(120,40,30,0.18)', 0.2);
      const nm = names[Math.floor(r() * names.length)], wt = what[Math.floor(r() * what.length)];
      onPage(u0 + 0.02, v, function () { txt(nm, 0, 0, '5.4px ' + HAND, col); txt(wt, 64, 0, 'italic 4.6px ' + HAND, col); });
    }
    if (heir) onPage(u0 + 0.02, 0.08 + n * 0.064, function () { txt('Наследник', 0, 0, '6px ' + HAND, 'rgba(120,16,10,0.95)'); txt('всё', 64, 0, 'italic 5px ' + HAND, 'rgba(120,16,10,0.95)'); });
  }
  /* открытая книга; o.side: 'both' | 'right'; o.blank — правая страница пуста; o.heir — внизу «Наследник» */
  function bookPagesL(o) {
    o = o || {};
    return layer(function () {
      const c = X();
      soft(BK.cx + 16, BK.top + BK.h * 0.62, 184, 88, '0,0,0', 0.72);
      const c0 = pg(-1.07, -0.045), c1 = pg(1.07, -0.045), c2 = pg(1.07, 1.05), c3 = pg(-1.07, 1.05);
      poly([c0[0], c0[1], c1[0], c1[1], c2[0], c2[1] + 5, c3[0], c3[1] + 5], LG(0, c0[1], 0, c2[1], [0, '#18141c', 1, '#07060a']));
      const g0 = pg(-1.055, -0.03), g1 = pg(1.055, -0.03), g2 = pg(1.055, 1.035), g3 = pg(-1.055, 1.035);
      c.strokeStyle = 'rgba(200,160,80,0.55)'; c.lineWidth = 0.35; c.beginPath(); c.moveTo(g0[0], g0[1]); c.lineTo(g1[0], g1[1]); c.lineTo(g2[0], g2[1] + 3); c.lineTo(g3[0], g3[1] + 3); c.closePath(); c.stroke();
      R(c3[0] + 4, c3[1] + 0.6, (c2[0] - c3[0]) - 8, 3.8, LG(0, c3[1], 0, c3[1] + 4, [0, '#9a1c12', 1, '#3a0806']));
      for (let i = 0; i < 7; i++) line(c3[0] + 5, c3[1] + 1 + i * 0.5, c2[0] - 5, c2[1] + 1 + i * 0.5, 'rgba(40,0,0,0.35)', 0.12);
      [[-1, 0], [0, 1]].forEach(function (pp, side) {
        const a = pg(pp[0], 0), b = pg(pp[1], 0), d = pg(pp[1], 1), e = pg(pp[0], 1);
        c.save(); c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - 2.5, b[0], b[1]); c.lineTo(d[0], d[1]); c.quadraticCurveTo((e[0] + d[0]) / 2, d[1] - 2, e[0], e[1]); c.closePath();
        c.fillStyle = LG(a[0], 0, b[0], 0, side ? [0, '#6a5a40', 0.08, '#c0b08a', 0.3, '#d6c8a4', 1, '#bfb08a'] : [0, '#bfb08a', 0.7, '#d6c8a4', 0.92, '#bcac86', 1, '#6a5a40']); c.fill();
        c.clip(); P.tex(Math.min(a[0], e[0]) - 2, a[1] - 4, Math.abs(b[0] - a[0]) + 40, BK.h + 8, 0.4, 'multiply', 'mot', 0.5);
        const r = P.RNG(side + 3); for (let i = 0; i < 6; i++) soft(lerp(a[0], b[0], r()), lerp(a[1], e[1], r()), 6 + r() * 12, 4 + r() * 8, '120,80,40', 0.08);
        c.restore();
      });
      R(BK.cx - 0.8, BK.top, 1.6, BK.h, 'rgba(30,10,6,0.55)'); soft(BK.cx, BK.top + BK.h / 2, 6, BK.h / 2, '0,0,0', 0.25);
      namesPage(-0.96, -0.06, 3, 14, 'rgba(110,26,18,0.8)');
      if (!o.blank) namesPage(0.06, 0.96, 4, o.heir ? 12 : 14, 'rgba(110,26,18,0.8)', o.heir);
      const sp = pg(0, 0.02), sb = pg(0.03, 1.07);
      c.beginPath(); c.moveTo(sp[0] - 1, sp[1]); c.lineTo(sp[0] + 1.6, sp[1]); c.lineTo(sb[0] + 2.6, sb[1] + 14); c.lineTo(sb[0] + 0.8, sb[1] + 11); c.lineTo(sb[0] - 1, sb[1] + 14); c.closePath(); c.fillStyle = '#0a0a0c'; c.fill();
    });
  }
  function candleTop(now, k) { k = k === undefined ? 1 : k; P.flame(CANDLE.x, CANDLE.y - CANDLE.h - 1.2, 2.3 * k, now, 3, '255,150,60', 0); bloom(CANDLE.x, CANDLE.y - CANDLE.h - 6, 96, '255,160,80', 0.32 * k); }
  /* страница перелистывается справа налево; возвращает точку внешнего края (для руки) */
  function pageTurn(f) {
    if (f <= 0 || f >= 1) return null;
    const c = X(), w = Math.cos(f * Math.PI), lift = Math.sin(f * Math.PI), up = lift * 30, k = 1 - Math.abs(w) * 0.45;
    const st = pg(0, 0), sb = pg(0, 1), ot = pg(w * 0.97, 0), ob = pg(w * 0.97, 1);
    ot[1] -= up * k; ob[1] -= up * 0.8 * k;
    soft((st[0] + ot[0]) / 2 + w * 10, (st[1] + sb[1]) / 2 + 8, Math.abs(ot[0] - st[0]) * 0.6 + 10, 64, '0,0,0', 0.3 * lift + 0.05);
    const ct = [(st[0] + ot[0]) / 2 + w * 8, Math.min(st[1], ot[1]) - up * 0.35], cb = [(sb[0] + ob[0]) / 2 + w * 8, Math.min(sb[1], ob[1]) - up * 0.3];
    c.beginPath(); c.moveTo(st[0], st[1]); c.quadraticCurveTo(ct[0], ct[1], ot[0], ot[1]); c.lineTo(ob[0], ob[1]); c.quadraticCurveTo(cb[0], cb[1], sb[0], sb[1]); c.closePath();
    c.fillStyle = LG(st[0], 0, ot[0] + (w > 0 ? 0.01 : -0.01), 0, w > 0 ? [0, '#8a7a5a', 0.25, '#c8b994', 0.75, '#e2d6b6', 1, '#d0c29e'] : [0, '#6a5a40', 0.3, '#b8a882', 0.8, '#d6c8a4', 1, '#e8dcbe']); c.fill();
    c.save(); c.clip(); P.tex(Math.min(st[0], ot[0]) - 2, Math.min(ot[1], st[1]) - 4, Math.abs(ot[0] - st[0]) + 4, BK.h + 30, 0.35, 'multiply', 'mot', 0.5); c.restore();
    c.strokeStyle = 'rgba(255,240,210,0.35)'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(ot[0], ot[1]); c.lineTo(ob[0], ob[1]); c.stroke();
    return ot;
  }
  /* тень Кредитора от свечи ложится через стол: цилиндр, плечи */
  function shadowL() {
    return layer(function () { blurred(3.2, function () { const c = X(); c.save(); c.translate(372, 268); c.rotate(-0.98); c.transform(1, 0, -0.12, 1, 0, 0); person(0, 0, 250, { col: '#000', hat: 'top', thin: 0.8, long: true }); c.restore(); }); });
  }
  function creditorShadow(a, dx, sway) {
    if (a <= 0.01) return;
    const c = X(), sh = once('cr_shadow', shadowL);
    c.save(); c.globalAlpha = a; c.translate(372 + (dx || 0), 268); c.rotate(sway || 0); c.translate(-372, -268); c.drawImage(sh, 0, 0, W, H); c.restore();
  }

  /* ============================================================
     L. ПИСЬМО ПЛЕМЯННИКУ — прилавок ночью, лампа, лист
     ============================================================ */
  const SH = { cx: 206, top: 50, h: 140, half: 80, grow: 12 };
  function shp(u, v) { return [SH.cx + u * (SH.half + v * SH.grow), SH.top + v * SH.h]; }
  function onSheet(u, v, fn) { const o = shp(u, v), sx = (SH.half + v * SH.grow) / SH.half, k = u * SH.grow / SH.h, c = X(); c.save(); c.translate(o[0], o[1]); c.transform(sx, 0, k * 0.86, 0.86, 0, 0); try { fn(); } finally { c.restore(); } }
  function letterL() {
    return layer(function () {
      const c = X();
      blurred(3.4, function () {
        R(0, 0, W, 60, '#120d0a');
        for (let x = -8; x < W; x += 24) R(x, 0, 20, 60, 'rgba(40,52,46,0.2)');
        [16, 34].forEach(function (y) { R(150, y, 140, 2, '#3a2412'); for (let i = 0; i < 13; i++) { const bx = 154 + i * 10; R(bx, y - 8 - (i % 3) * 2, 6, 8 + (i % 3) * 2, ['#2a4a3a', '#5a2a1a', '#3a3a5a', '#6a4a20'][i % 4]); gl(bx + 4, y - 6, 3, '255,200,130', 0.45); } });
        E(330, 30, 20, 28, '#6a5020'); E(330, 30, 17, 25, '#1c2624');
      });
      R(0, 44, W, H - 44, LG(0, 44, 0, H, [0, '#1c0e06', 0.5, '#2a1609', 1, '#1a0c04']));
      for (let y = 46; y < H; y += 11) R(0, y, W, 0.5, 'rgba(0,0,0,0.4)');
      const r = P.RNG(8);
      for (let i = 0; i < 200; i++) { const y = 46 + r() * 170, x = r() * W, l = 10 + r() * 40; line(x, y, x + l, y + (r() - 0.5), 'rgba(10,4,0,' + (0.1 + r() * 0.2).toFixed(2) + ')', 0.2); }
      P.tex(0, 44, W, 172, 0.3, 'overlay', 'mot', 0.9);
      lighter(function () { c.fillStyle = RG(36, 74, 0, 290, [0, 'rgba(255,150,70,0.42)', 0.4, 'rgba(255,120,50,0.12)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, W, H); });
      // лист
      soft(SH.cx + 14, SH.top + SH.h * 0.62, 110, 90, '0,0,0', 0.6);
      const a = shp(-1, 0), b = shp(1, 0), d = shp(1, 1), e = shp(-1, 1);
      c.save(); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.lineTo(e[0], e[1]); c.closePath();
      c.fillStyle = LG(a[0], a[1], d[0], d[1], [0, '#ece2c8', 0.6, '#ded2b4', 1, '#c8b896']); c.fill(); c.clip();
      P.tex(e[0] - 4, a[1] - 4, d[0] - e[0] + 8, SH.h + 8, 0.3, 'multiply', 'mot', 0.5);
      c.restore();
      // конверт справа, очки слева
      c.save(); c.translate(334, 168); c.rotate(-0.12);
      P.softRect(-34, -20, 68, 40, 3, 0.5); R(-34, -20, 68, 40, LG(0, -20, 0, 20, [0, '#e4d8bc', 1, '#c2b08c']));
      poly([-34, -20, 34, -20, 0, 4], 'rgba(120,100,70,0.18)'); line(-34, -20, 0, 4, 'rgba(90,70,50,0.3)', 0.4); line(34, -20, 0, 4, 'rgba(90,70,50,0.3)', 0.4);
      txt('Наследнику', 0, 13, 'italic 6.4px ' + HAND, 'rgba(40,24,30,0.85)', 'center');
      c.restore();
      const g1 = [96, 182], g2 = [116, 186];
      soft(g1[0] + 14, g1[1] + 4, 24, 6, '0,0,0', 0.3);
      [g1, g2].forEach(function (g) { E(g[0], g[1], 7, 5, 'rgba(220,235,240,0.12)'); c.strokeStyle = '#3a3a3e'; c.lineWidth = 0.6; c.beginPath(); c.ellipse(g[0], g[1], 7, 5, 0, 0, 6.28); c.stroke(); E(g[0] - 2, g[1] - 1.6, 2, 0.8, 'rgba(255,255,255,0.35)', -0.4); });
      line(g1[0] + 7, g1[1], g2[0] - 7, g2[1], '#3a3a3e', 0.6); line(g1[0] - 7, g1[1], g1[0] - 22, g1[1] - 7, '#3a3a3e', 0.5);
      // чернильница
      soft(352, 74, 20, 6, '0,0,0', 0.5);
      R(338, 58, 16, 14, LG(338, 0, 354, 0, [0, '#0a0a14', 0.5, '#2a2a40', 1, '#05050a'])); R(340, 54, 12, 4, P.brassG(340, 352));
      KN.lamp7(40, 118);
    });
  }
  const QUILL = function (x, y, a) {
    const c = X();
    c.save(); c.translate(x, y); c.rotate(-0.55 + (a || 0));
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(6, -8, 22, -24, 46, -40); c.bezierCurveTo(36, -26, 20, -12, 4, -1); c.closePath(); c.fillStyle = LG(0, 0, 40, -36, [0, '#cfc6b4', 0.5, '#f4efe4', 1, '#b8ae9a']); c.fill();
    c.strokeStyle = 'rgba(120,110,90,0.5)'; c.lineWidth = 0.25; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(18, -16, 46, -40); c.stroke();
    for (let k = 0; k < 14; k++) { c.beginPath(); c.moveTo(6 + k * 2.8, -4 - k * 2.6); c.lineTo(10 + k * 2.6, -2 - k * 2.2); c.stroke(); }
    R(-0.5, -0.5, 1.2, 1.2, '#1a1414');
    c.restore();
  };
  function writeF(t, now, lines) {
    let at = 500, qx = null, qy = 0;
    lines.forEach(function (l) {
      const dur = l.s.length * 60, p = seg(t, at, at + dur);
      if (p > 0) onSheet(-0.86, l.v, function () {
        const c = X(); c.font = '6.2px ' + HAND; const w = c.measureText(l.s).width;
        c.save(); c.beginPath(); c.rect(-2, -14, (w + 6) * p, 20); c.clip();
        c.fillStyle = 'rgba(28,18,36,0.18)'; c.fillText(l.s, 0.3, 0.2); c.fillStyle = 'rgba(28,18,36,0.9)'; c.fillText(l.s, 0, 0); c.restore();
      });
      if (p > 0 && p < 1) { const c = X(); c.font = '6.2px ' + HAND; const w = c.measureText(l.s).width, o = shp(-0.86, l.v), sx = (SH.half + l.v * SH.grow) / SH.half; qx = o[0] + w * p * sx; qy = o[1] - 1; }
      at += dur + 450;
    });
    return qx === null ? null : [qx, qy];
  }

  /* ============================================================
     E. ПАПЕРТЬ СОБОРА УТРОМ — портал, ступени в инее
     ============================================================ */
  function cathedralL() {
    return layer(function () {
      const c = X();
      blurred(1.2, function () {
        const c2 = X();
        R(0, 0, W, 152, LG(0, 0, 0, 152, [0, '#a6a098', 1, '#8a847c']));
        for (let y = 8; y < 152; y += 13) line(0, y, W, y, 'rgba(60,50,40,0.25)', 0.5);
        for (let y = 8, row = 0; y < 152; y += 13, row++) for (let x = (row % 2) * 18; x < W; x += 36) line(x, y, x, y + 13, 'rgba(60,50,40,0.16)', 0.4);
        P.tex(0, 0, W, 152, 0.5, 'overlay', 'mot', 1.4);
        [[64, 26], [294, 26]].forEach(function (cl) {
          R(cl[0], 0, cl[1], 152, LG(cl[0], 0, cl[0] + cl[1], 0, [0, '#6a645c', 0.3, '#bab4aa', 0.7, '#a49e94', 1, '#5a544c']));
          for (let k = 1; k < 6; k++) line(cl[0] + k * cl[1] / 6, 0, cl[0] + k * cl[1] / 6, 140, 'rgba(50,40,30,0.25)', 0.5);
          R(cl[0] - 4, 136, cl[1] + 8, 16, '#8a847a'); R(cl[0] - 4, 136, cl[1] + 8, 1, 'rgba(255,250,240,0.5)');
        });
        [[98, '#7e786e'], [86, '#68625a'], [74, '#524c44']].forEach(function (a) {
          c2.beginPath(); c2.moveTo(192 - a[0], 152); c2.lineTo(192 - a[0], 86); c2.arc(192, 86, a[0], Math.PI, 0); c2.lineTo(192 + a[0], 152); c2.closePath(); c2.fillStyle = a[1]; c2.fill();
          c2.strokeStyle = 'rgba(255,250,240,0.22)'; c2.lineWidth = 0.8; c2.beginPath(); c2.arc(192, 86, a[0], Math.PI, 0); c2.stroke();
        });
        c2.beginPath(); c2.moveTo(130, 152); c2.lineTo(130, 86); c2.arc(192, 86, 62, Math.PI, 0); c2.lineTo(254, 152); c2.closePath(); c2.fillStyle = '#2a2622'; c2.fill();
        R(130, 74, 124, 4, '#4a4438');
        c2.save(); c2.beginPath(); c2.arc(192, 86, 60, Math.PI, 0); c2.closePath(); c2.clip();
        R(130, 24, 124, 62, LG(0, 24, 0, 86, [0, '#1a1a24', 1, '#2a2a36']));
        P.iconP(177, 38, 30, 34, '#7a1a14', '#1a2a4a', 4);
        c2.restore();
        R(132, 78, 120, 74, LG(132, 0, 252, 0, [0, '#1e120a', 0.5, '#32200f', 1, '#1a0e06']));
        for (let x = 136; x < 250; x += 7) line(x, 78, x, 152, 'rgba(0,0,0,0.35)', 0.5);
        [92, 118, 142].forEach(function (y) { R(132, y, 120, 3.4, '#14100c'); for (let x = 136; x < 250; x += 8) E(x, y + 1.7, 0.9, 0.9, '#4a4440'); });
        line(192, 78, 192, 152, '#0a0604', 1.2);
        [184, 200].forEach(function (x) { c2.strokeStyle = '#3a3430'; c2.lineWidth = 1; c2.beginPath(); c2.arc(x, 112, 4, 0, 6.28); c2.stroke(); });
        poly([193, 78, 200, 80, 200, 152, 193, 152], 'rgba(255,170,90,0.55)');
        gl(197, 120, 30, '255,170,90', 0.4);
        person(198, 152, 66, { col: '#0a0806', long: true, flare: 2.4, a: 0.9 });
        line(192, 74, 192, 84, '#2a2420', 0.4); E(192, 87, 2.2, 2.8, 'rgba(160,20,20,0.8)'); gl(192, 86, 5, '255,120,60', 0.5);
      });
      // площадка и ступени
      const steps = [[150, 12], [162, 10], [172, 11], [183, 12], [195, 12], [207, 9]];
      steps.forEach(function (s, i) {
        R(-10, s[0], W + 20, s[1], LG(0, s[0], 0, s[0] + s[1], [0, '#b8b4ae', 0.28, '#9a968e', 0.3, '#6a6660', 1, '#4a4642']));
        R(-10, s[0], W + 20, 0.8, 'rgba(255,255,255,0.65)');
        P.tex(-10, s[0], W + 20, s[1], 0.4, 'overlay', 'mot', 1.1 + i * 0.1);
      });
      for (let x = 30; x < W; x += 58) line(x, 150, x - 2, 162, 'rgba(0,0,0,0.25)', 0.5);
      const r = P.RNG(5); for (let i = 0; i < 900; i++) { const s = steps[Math.floor(r() * steps.length)], x = r() * W, y = s[0] + Math.pow(r(), 2.4) * s[1] * 0.5; E(x, y, 0.3, 0.22, 'rgba(255,255,255,' + (0.2 + r() * 0.6).toFixed(2) + ')'); }
      poly([50, 152, 98, 152, 70, 216, 6, 216], 'rgba(20,24,44,0.22)'); poly([280, 152, 328, 152, 300, 216, 236, 216], 'rgba(20,24,44,0.2)');
      lighter(function () { R(0, 0, W, H, LG(W, 0, 0, 0, [0, 'rgba(255,210,160,0.22)', 0.6, 'rgba(255,200,150,0.05)', 1, 'rgba(0,0,0,0)'])); });
      R(0, 0, W, H, LG(0, 0, 0, H, [0, 'rgba(40,50,80,0.18)', 1, 'rgba(10,12,30,0.25)']));
      vign(0.55, 230, 140, 80);
    });
  }
  function topHat(hx, hy, s, now) {
    const c = X();
    c.save(); c.translate(hx, hy); c.scale(s, s);
    soft(-6, 13, 34, 6, '0,0,0', 0.55);
    c.beginPath(); c.ellipse(0, -4, 24, 6.4, 0, 0, 6.28); c.fillStyle = '#0c0c0e'; c.fill();
    c.beginPath(); c.moveTo(-15, -4); c.lineTo(-13, 12); c.quadraticCurveTo(0, 15, 13, 12); c.lineTo(15, -4); c.closePath(); c.fillStyle = LG(-15, 0, 15, 0, [0, '#060607', 0.55, '#24242a', 0.8, '#3a3a42', 1, '#060607']); c.fill();
    R(-14.6, 2, 29.2, 3, '#1a1014');
    c.strokeStyle = 'rgba(255,220,180,0.5)'; c.lineWidth = 0.5; c.beginPath(); c.ellipse(0, -4, 24, 6.4, 0, -0.5, 1.2); c.stroke();
    c.save(); c.beginPath(); c.ellipse(0, -4, 15, 4, 0, 0, 6.28); c.clip(); R(-16, -9, 32, 10, '#050506');
    const r = P.RNG(4); for (let i = 0; i < 48; i++) { const x = -13 + r() * 26, y = -7.4 + r() * 5.8; E(x, y, 1.8, 0.8, r() < 0.6 ? P.brassG(x - 1.8, x + 1.8) : '#b8b8c0', r() - 0.5); }
    c.restore();
    for (let i = 0; i < 6; i++) { const ph = (now / 1700 + i * 0.37) % 1; if (ph < 0.12) gl(-11 + i * 4.6, -5 + (i % 2) * 2, 3, '255,255,240', 0.7 * Math.sin(ph / 0.12 * Math.PI)); }
    c.restore();
  }

  /* ============================================================
     F. КОЛОКОЛЬНЯ НА РАССВЕТЕ — арки, город внизу, немой колокол
     ============================================================ */
  const ARCH = [[16, 104], [140, 104], [264, 104]];
  function belfryL() {
    return layer(function () {
      const c = X();
      R(0, 0, W, H, LG(0, 0, 0, 160, [0, '#5a6a92', 0.45, '#d8a8a0', 0.75, '#ffcca0', 1, '#f6dcbc']));
      gl(332, 120, 130, '255,226,180', 0.6); gl(332, 122, 26, '255,250,232', 0.9);
      blurred(1.4, function () {
        const c2 = X(), rr = P.RNG(14);
        [[128, '#b48a8e', 0.55], [136, '#8e6a74', 0.8], [146, '#5e4652', 1]].forEach(function (pl, pi) {
          let x = -10;
          while (x < W + 10) {
            const w = 8 + rr() * 14, h = 6 + rr() * 12 + pi * 3;
            c2.globalAlpha = pl[2]; R(x, pl[0] - h, w, h + 40, pl[1]); poly([x - 1, pl[0] - h, x + w / 2, pl[0] - h - 4 - pi, x + w + 1, pl[0] - h], pl[1]);
            if (rr() < 0.3) R(x + w * 0.7, pl[0] - h - 6, 1.6, 6, pl[1]);
            if (pi === 2 && rr() < 0.35) R(x + 2, pl[0] - h + 4, 1.6, 2, 'rgba(255,210,150,0.8)');
            x += w + rr() * 3;
          }
          c2.globalAlpha = 1;
        });
        R(52, 102, 7, 30, '#8e6a74'); poly([50, 102, 61, 102, 55.5, 94], '#8e6a74'); gl(55.5, 100, 4, '255,90,60', 0.6);
        KN.onion5(250, 118, 10, 14, KN.gold5(250, 10)); R(246, 118, 8, 14, '#8e6a74'); line(250, 104, 250, 98, '#c8a050', 0.5);
        R(0, 150, W, 10, LG(0, 150, 0, 160, [0, '#e8c8b4', 1, '#b8a0a0']));
        P.fog(130, 30, 0, 0, 0.6, '255,232,220', 4);
      });
      c.save(); c.beginPath(); c.rect(0, 0, W, H);
      ARCH.forEach(function (a) { c.moveTo(a[0], 152); c.lineTo(a[0], 66); c.arc(a[0] + a[1] / 2, 66, a[1] / 2, Math.PI, 0); c.lineTo(a[0] + a[1], 152); c.closePath(); });
      c.fillStyle = '#2a201c'; c.fill('evenodd');
      c.clip('evenodd'); P.tex(0, 0, W, H, 0.5, 'overlay', 'mot', 1.3);
      for (let y = 6; y < 200; y += 9) line(0, y, W, y, 'rgba(0,0,0,0.25)', 0.4);
      c.restore();
      ARCH.forEach(function (a) {
        R(a[0] + a[1] - 7, 66, 7, 86, LG(a[0] + a[1] - 7, 0, a[0] + a[1], 0, [0, '#3a2e28', 1, '#6a5446']));
        c.strokeStyle = 'rgba(255,200,150,0.55)'; c.lineWidth = 0.9; c.beginPath(); c.arc(a[0] + a[1] / 2, 66, a[1] / 2, Math.PI * 1.15, Math.PI * 2); c.lineTo(a[0] + a[1], 152); c.stroke();
        R(a[0] - 3, 150, a[1] + 6, 6, '#3a2e28'); R(a[0] - 3, 150, a[1] + 6, 0.8, 'rgba(255,210,170,0.5)');
      });
      R(0, 156, W, 22, '#241a16');
      R(0, 176, W, 40, LG(0, 176, 0, 216, [0, '#3a2a1e', 1, '#1a120c'])); P.boards(0, 176, W, 40, 5, '#3a2a1e', 3);
      lighter(function () { ARCH.forEach(function (a) { poly([a[0] - 30, 178, a[0] + a[1] - 30, 178, a[0] + a[1] - 60, 216, a[0] - 60, 216], 'rgba(255,190,130,0.12)'); }); });
      R(0, 0, W, 16, LG(0, 0, 0, 16, [0, '#1a120c', 1, '#3a2a1e'])); R(0, 14, W, 3, '#120c08');
      R(176, 0, 40, 30, LG(176, 0, 216, 0, [0, '#2a1c12', 0.5, '#4a3424', 1, '#1a120a']));
      [184, 208].forEach(function (x) { R(x - 2, 26, 4, 14, '#1a1410'); });
      // малые колокола слева
      line(22, 74, 112, 74, '#1a120c', 2.4);
      [[38, 9], [60, 11], [84, 8], [102, 7]].forEach(function (b) {
        line(b[0], 74, b[0], 78, '#1a120c', 0.8);
        c.beginPath(); c.moveTo(b[0] - b[1] * 0.4, 78); c.bezierCurveTo(b[0] - b[1] * 0.5, 78 + b[1] * 0.6, b[0] - b[1] * 0.6, 78 + b[1], b[0] - b[1] * 0.8, 78 + b[1] * 1.2); c.lineTo(b[0] + b[1] * 0.8, 78 + b[1] * 1.2); c.bezierCurveTo(b[0] + b[1] * 0.6, 78 + b[1], b[0] + b[1] * 0.5, 78 + b[1] * 0.6, b[0] + b[1] * 0.4, 78); c.closePath();
        c.fillStyle = '#2a1c10'; c.fill(); c.strokeStyle = 'rgba(255,200,140,0.5)'; c.lineWidth = 0.5; c.stroke();
        line(b[0], 78 + b[1] * 1.2, b[0] + 30 - b[0] * 0.2, 150, 'rgba(60,46,34,0.8)', 0.3);
      });
      // большой немой колокол
      const bx = 196, top = 40, lip = 168, hw = 74;
      c.beginPath(); c.moveTo(bx - 26, top); c.bezierCurveTo(bx - 40, top, bx - 44, top + 20, bx - 44, top + 46); c.bezierCurveTo(bx - 44, lip - 42, bx - 56, lip - 14, bx - hw, lip - 4); c.quadraticCurveTo(bx - hw - 3, lip + 2, bx - hw + 4, lip + 3); c.lineTo(bx + hw - 4, lip + 3); c.quadraticCurveTo(bx + hw + 3, lip + 2, bx + hw, lip - 4); c.bezierCurveTo(bx + 56, lip - 14, bx + 44, lip - 42, bx + 44, top + 46); c.bezierCurveTo(bx + 44, top + 20, bx + 40, top, bx + 26, top); c.closePath();
      c.fillStyle = LG(bx - hw, 0, bx + hw, 0, [0, '#120a04', 0.25, '#2e1e0c', 0.5, '#3e2a12', 0.78, '#5a3e1a', 0.92, '#8a6430', 1, '#2a1a08']); c.fill();
      c.save(); c.clip();
      [[top + 30, 3], [top + 36, 1.4], [lip - 24, 3.4], [lip - 16, 1.4]].forEach(function (b) { R(bx - hw, b[0], hw * 2, b[1], 'rgba(255,200,130,0.12)'); R(bx - hw, b[0] + b[1], hw * 2, 0.6, 'rgba(0,0,0,0.4)'); });
      for (let i = 0; i < 16; i++) E(bx - 40 + i * 5.4, top + 33, 0.9, 1.1, 'rgba(255,210,140,0.25)');
      R(bx - 10, top + 52, 20, 26, 'rgba(255,200,130,0.1)'); R(bx - 8, top + 54, 16, 22, 'rgba(0,0,0,0.25)'); person(bx, top + 75, 18, { col: 'rgba(255,210,150,0.12)', long: true });
      lighter(function () { R(bx + 20, top, hw, lip - top + 6, LG(bx + 20, 0, bx + hw, 0, [0, 'rgba(255,170,100,0)', 1, 'rgba(255,170,100,0.25)'])); });
      c.restore();
      c.strokeStyle = 'rgba(255,200,140,0.8)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(bx + 30, top + 1); c.bezierCurveTo(bx + 42, top + 3, bx + 44, top + 22, bx + 44, top + 46); c.bezierCurveTo(bx + 44, lip - 42, bx + 56, lip - 14, bx + hw, lip - 4); c.stroke();
      c.strokeStyle = 'rgba(255,200,140,0.25)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(bx - 44, top + 46); c.bezierCurveTo(bx - 44, lip - 42, bx - 56, lip - 14, bx - hw, lip - 4); c.stroke();
      E(bx, lip + 2, hw - 5, 4.4, '#0a0604'); E(bx, lip + 2.6, hw - 9, 3, '#050302');
      E(bx + 6, lip + 1, 6, 5, '#140c06');
      c.beginPath(); c.moveTo(bx + 10, lip + 2); c.quadraticCurveTo(bx + 60, lip + 12, 330, 150); c.strokeStyle = 'rgba(80,62,44,0.9)'; c.lineWidth = 0.8; c.stroke();
      c.beginPath(); c.moveTo(bx - 20, top); c.bezierCurveTo(bx - 22, top - 14, bx - 6, top - 16, bx - 4, top - 2); c.moveTo(bx + 20, top); c.bezierCurveTo(bx + 22, top - 14, bx + 6, top - 16, bx + 4, top - 2); c.strokeStyle = '#1a1008'; c.lineWidth = 3; c.stroke();
      // голуби на парапетах
      [[40, 150], [62, 150], [300, 150], [344, 150]].forEach(function (p, i) { pigeon(p[0], p[1], 1.1, 0, i, '#2a2426'); });
      R(0, 0, W, H, LG(0, 0, 0, H, [0, 'rgba(20,14,30,0.2)', 1, 'rgba(10,6,4,0.4)']));
    });
  }

  /* ============================================================
     I. КУКЛА НА ПОЛКЕ — макро, бирка, перевод фокуса
     ============================================================ */
  const DL = { x: 176, eyeY: 70, ex: [169.6, 182.4] };
  function dollBgL() {
    return layer(function () {
      blurred(3.4, function () {
        R(0, 0, W, 160, LG(0, 0, 0, 160, [0, '#16221c', 1, '#26342c'])); damask(0, 0, W, 160, '120,150,130', 0.14, 1.6);
        P.bottle(46, 156, 18, 54, '#2a4a3a'); P.bottle(74, 156, 13, 40, '#5a2a1a');
        E(104, 132, 14, 14, P.brassG(90, 118)); E(104, 132, 11, 11, '#e8e0c8');
        P.rr(290, 118, 52, 38, 2, LG(0, 118, 0, 156, [0, '#6a3a1a', 1, '#2a140a']));
        for (let i = 0; i < 7; i++) gl(30 + i * 56, 30 + hsh(i) * 60, 6 + hsh(i + 3) * 8, '255,200,140', 0.35);
      });
      R(0, 156, W, 4, LG(0, 156, 0, 160, [0, '#7a5434', 1, '#4a2e18'])); R(0, 156, W, 0.8, 'rgba(255,220,180,0.4)');
      R(0, 160, W, 10, LG(0, 160, 0, 170, [0, '#3a2414', 1, '#1a0e06'])); R(0, 170, W, 46, LG(0, 170, 0, 216, [0, '#0e0804', 1, '#040202']));
    });
  }
  function dollPaint(iris) {
    const c = X(), x = DL.x;
    soft(x + 6, 154, 34, 5, '0,0,0', 0.6);
    // пальто, пуговицы, сапожки, ручки
    c.beginPath(); c.moveTo(x - 25, 152); c.quadraticCurveTo(x - 24, 118, x - 16, 98); c.quadraticCurveTo(x, 92, x + 16, 98); c.quadraticCurveTo(x + 24, 118, x + 25, 152); c.closePath();
    c.fillStyle = LG(x - 25, 0, x + 25, 0, [0, '#08080c', 0.45, '#22222c', 0.7, '#2c2c38', 1, '#08080c']); c.fill();
    line(x, 100, x, 150, 'rgba(0,0,0,0.5)', 0.6); for (let i = 0; i < 4; i++) E(x + 2.4, 106 + i * 11, 1.1, 1.1, '#9a8a60');
    [[-11, 1], [7, 1]].forEach(function (b) { P.rr(x + b[0], 151, 8, 5, 1.6, '#100c0a'); });
    [-1, 1].forEach(function (sd) { c.beginPath(); c.moveTo(x + sd * 15, 100); c.quadraticCurveTo(x + sd * 23, 116, x + sd * 20, 132); c.lineTo(x + sd * 15, 131); c.quadraticCurveTo(x + sd * 17, 116, x + sd * 11, 104); c.closePath(); c.fillStyle = '#16161e'; c.fill(); E(x + sd * 18, 134, 3, 3.4, RG(x + sd * 17, 133, 0, 4, [0, '#f2eae2', 1, '#a89a8c'])); });
    // шарф
    c.beginPath(); c.moveTo(x - 14, 95); c.quadraticCurveTo(x, 102, x + 14, 95); c.lineTo(x + 14, 100.6); c.quadraticCurveTo(x, 108, x - 14, 100.6); c.closePath(); c.fillStyle = '#8a1a12'; c.fill();
    c.beginPath(); c.moveTo(x - 6, 102); c.lineTo(x - 10, 128); c.lineTo(x - 4.6, 128); c.lineTo(x - 1.4, 103); c.closePath(); c.fillStyle = '#7a160e'; c.fill();
    for (let i = 0; i < 6; i++) line(x - 9 + i * 0.7, 108 + i * 3.4, x - 4.6 + i * 0.5, 108 + i * 3.4, 'rgba(40,0,0,0.4)', 0.3);
    // голова: фарфор
    soft(x, 92, 12, 4, '0,0,0', 0.5);
    E(x, 70, 15, 18, RG(x - 4, 63, 1, 21, [0, '#fbf4ec', 0.55, '#e2d4c6', 0.85, '#b8a596', 1, '#8a786a']));
    E(x, 87, 7, 3, 'rgba(120,90,80,0.25)');
    soft(x - 8.6, 78, 4.4, 3, '214,120,120', 0.3); soft(x + 8.6, 78, 4.4, 3, '214,120,120', 0.3);
    // глаза: белки, (радужка), веко, ресницы, брови
    DL.ex.forEach(function (ex) {
      c.save(); c.beginPath(); c.ellipse(ex, DL.eyeY, 3.8, 2.3, 0, 0, 6.28); c.clip();
      R(ex - 4, DL.eyeY - 3, 8, 6, '#ece4da');
      if (iris) { E(ex, DL.eyeY + 0.2, 2, 2, RG(ex, DL.eyeY, 0, 2, [0, '#5a4234', 0.7, '#2e221c', 1, '#140e0a'])); E(ex, DL.eyeY + 0.2, 0.9, 0.9, '#050404'); E(ex - 0.6, DL.eyeY - 0.5, 0.45, 0.45, 'rgba(255,255,255,0.9)'); }
      R(ex - 4, DL.eyeY - 3, 8, 1.6, 'rgba(60,40,30,0.25)');
      c.restore();
      c.strokeStyle = 'rgba(40,24,18,0.85)'; c.lineWidth = 0.55; c.beginPath(); c.ellipse(ex, DL.eyeY, 3.9, 2.4, 0, 3.3, 6.1); c.stroke();
      for (let k = 0; k < 5; k++) { const a = 3.5 + k * 0.6, sx = ex + Math.cos(a) * 3.9, sy = DL.eyeY + Math.sin(a) * 2.4; line(sx, sy, sx + Math.cos(a) * 1, sy + Math.sin(a) * 1.2, 'rgba(30,18,12,0.7)', 0.25); }
      c.strokeStyle = 'rgba(110,76,54,0.6)'; c.lineWidth = 0.5; c.beginPath(); c.ellipse(ex, DL.eyeY - 4.2, 3.8, 1.6, 0, 3.4, 6.0); c.stroke();
    });
    soft(x, 75, 2, 3.6, '150,110,90', 0.25); E(x - 1.1, 77.4, 0.5, 0.35, 'rgba(120,70,60,0.5)'); E(x + 1.1, 77.4, 0.5, 0.35, 'rgba(120,70,60,0.5)');
    c.beginPath(); c.moveTo(x - 3.4, 81.6); c.quadraticCurveTo(x - 1.6, 80.2, x, 81.2); c.quadraticCurveTo(x + 1.6, 80.2, x + 3.4, 81.6); c.quadraticCurveTo(x, 84.6, x - 3.4, 81.6); c.fillStyle = '#b05a56'; c.fill(); line(x - 3, 81.7, x + 3, 81.7, 'rgba(80,20,20,0.6)', 0.35);
    // трещина
    c.strokeStyle = 'rgba(50,34,28,0.75)'; c.lineWidth = 0.35; c.beginPath(); c.moveTo(x + 4, 53.4); c.lineTo(x + 5.6, 58); c.lineTo(x + 4.4, 61.6); c.lineTo(x + 7, 66.4); c.lineTo(x + 6.4, 72); c.stroke();
    c.strokeStyle = 'rgba(255,250,240,0.5)'; c.lineWidth = 0.25; c.beginPath(); c.moveTo(x + 4.4, 53.4); c.lineTo(x + 6, 58); c.lineTo(x + 4.8, 61.6); c.lineTo(x + 7.4, 66.4); c.stroke();
    // волосы: тёмные локоны
    c.beginPath(); c.moveTo(x - 16, 72); c.bezierCurveTo(x - 19, 50, x - 8, 46, x, 47); c.bezierCurveTo(x + 9, 46, x + 19, 50, x + 16, 72); c.bezierCurveTo(x + 13, 62, x + 9, 56, x + 2, 56); c.bezierCurveTo(x - 4, 55, x - 12, 60, x - 16, 72); c.closePath();
    c.fillStyle = LG(0, 46, 0, 72, [0, '#3a2618', 1, '#1a0e08']); c.fill();
    for (let i = 0; i < 9; i++) { const a = 3.4 + i * 0.36, cx = x + Math.cos(a) * 15.6, cy = 66 + Math.sin(a) * 17; E(cx, cy, 3.4, 3, i % 2 ? '#2a1a10' : '#3a2418'); }
    [-1, 1].forEach(function (sd) { for (let k = 0; k < 4; k++) E(x + sd * (16.4 + (k % 2)), 70 + k * 5, 2.6, 2.8, k % 2 ? '#2a1a10' : '#3a2418'); });
    for (let i = 0; i < 8; i++) { c.strokeStyle = 'rgba(200,150,100,0.25)'; c.lineWidth = 0.3; c.beginPath(); c.arc(x - 10 + i * 3, 51 + Math.abs(i - 3.5) * 0.8, 2.4, 3.6, 5.6); c.stroke(); }
    // свет: тень на всём, узкий луч наискось через глаза
    R(0, 0, W, 156, 'rgba(10,14,12,0.42)');
    P.shaft(70, -10, 60, 250, 170, 110, '255,214,170', 0.12);
    gl(x - 2, 68, 20, '255,224,190', 0.16);
  }
  function tagPaint(text) {
    const c = X();
    c.strokeStyle = 'rgba(210,200,170,0.85)'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(DL.x + 19, 134); c.quadraticCurveTo(DL.x + 50, 152, 252, 146); c.stroke();
    c.save(); c.translate(300, 168); c.rotate(-0.07);
    P.softRect(-50, -26, 104, 54, 4, 0.55);
    c.beginPath(); c.moveTo(-50, -18); c.lineTo(-42, -26); c.lineTo(54, -26); c.lineTo(54, 28); c.lineTo(-42, 28); c.lineTo(-50, 20); c.closePath();
    c.fillStyle = LG(0, -26, 0, 28, [0, '#ece2c4', 1, '#c8ba96']); c.fill(); c.save(); c.clip(); P.tex(-52, -28, 108, 58, 0.35, 'multiply', 'mot', 0.4); c.restore();
    E(-42, 1, 2.6, 2.6, '#c8b88e'); E(-42, 1, 1.6, 1.6, '#0a0604');
    if (text) ['Наследник.', 'Состояние хорошее.', 'Память — частично.', 'Цена договорная.'].forEach(function (s, i) { txt(s, -32, -12 + i * 11, 'italic 8.4px ' + HAND, 'rgba(30,20,30,0.92)'); });
    c.restore();
  }
  function tagText(t) {
    const c = X();
    c.save(); c.translate(300, 168); c.rotate(-0.07);
    ['Наследник.', 'Состояние хорошее.', 'Память — частично.', 'Цена договорная.'].forEach(function (s, i) {
      const p = seg(t, 600 + i * 1150, 1500 + i * 1150); if (p <= 0) return;
      c.font = 'italic 8.4px ' + HAND; const w = c.measureText(s).width;
      c.save(); c.beginPath(); c.rect(-33, -22 + i * 11, (w + 4) * p, 14); c.clip(); txt(s, -32, -12 + i * 11, 'italic 8.4px ' + HAND, 'rgba(30,20,30,0.92)'); c.restore();
    });
    c.restore();
  }

  /* ============================================================
     J. СТАНЦИОННЫЙ БУФЕТ — окно на перрон, стакан в подстаканнике
     ============================================================ */
  function buffetL(view) {
    return layer(function () {
      const c = X(), g0 = 14, g1 = 370, gy1 = 126;
      R(0, 0, W, H, '#1a120c'); P.tex(0, 0, W, H, 0.4, 'overlay', 'mot', 1.2);
      R(g0 - 9, 0, g1 - g0 + 18, gy1 + 9, '#20160c');
      c.save(); c.beginPath(); c.rect(g0, 0, g1 - g0, gy1); c.clip();
      c.drawImage(view, g0 - 30, -52, (g1 - g0) + 60, ((g1 - g0) + 60) * H / W);
      R(g0, 0, g1 - g0, gy1, 'rgba(6,10,18,0.32)');
      const r = P.RNG(12);
      for (let i = 0; i < 560; i++) { const x = g0 + r() * (g1 - g0), y = r() * gy1, s = 0.35 + r() * r() * 1.9; E(x, y, s, s * 1.12, 'rgba(0,0,0,0.25)'); E(x - s * 0.15, y - s * 0.2, s * 0.72, s * 0.78, 'rgba(180,190,205,0.14)'); E(x - s * 0.32, y - s * 0.38, s * 0.24, s * 0.24, 'rgba(255,236,210,0.55)'); }
      for (let i = 0; i < 14; i++) { const x = g0 + r() * (g1 - g0), y0 = r() * 60, l = 20 + r() * 60; c.strokeStyle = 'rgba(190,200,215,0.12)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x, y0); c.bezierCurveTo(x + 1, y0 + l * 0.3, x - 1, y0 + l * 0.6, x + 0.6, y0 + l); c.stroke(); }
      R(g0, gy1 - 40, g1 - g0, 40, LG(0, gy1 - 40, 0, gy1, [0, 'rgba(150,160,170,0)', 1, 'rgba(150,160,170,0.24)']));
      soft(84, 70, 18, 14, '255,190,120', 0.18);
      c.restore();
      R(188, 0, 7, gy1, '#20160c'); R(g0, 34, g1 - g0, 4, '#20160c'); line(195, 0, 195, gy1, 'rgba(255,200,150,0.12)', 0.4);
      R(g0 - 14, gy1 + 6, g1 - g0 + 28, 7, LG(0, gy1 + 6, 0, gy1 + 13, [0, '#4a3220', 1, '#1a0e06']));
      // скатерть
      poly([-60, 138, W + 60, 138, W + 160, 216, -160, 216], LG(0, 138, 0, 216, [0, '#b8b2a6', 0.4, '#d8d2c6', 1, '#ece6da']));
      for (let i = -8; i <= 8; i++) line(192 + i * 26, 138, 192 + i * 62, 216, 'rgba(90,80,70,0.08)', 0.6);
      R(-10, 138, W + 20, 1.2, 'rgba(255,255,255,0.5)'); R(-10, 139.2, W + 20, 3, 'rgba(0,0,0,0.18)');
      // газета
      c.save(); c.translate(118, 196); c.rotate(-0.1); P.softRect(-48, -18, 96, 40, 3, 0.35);
      R(-48, -18, 96, 40, '#d2cab4'); txt('ВЕСТНИК', 0, -9, 'bold 7.4px ' + SERIF, 'rgba(30,24,20,0.85)', 'center', '1.4px'); line(-44, -6, 44, -6, 'rgba(30,24,20,0.5)', 0.4);
      for (let col = 0; col < 3; col++) for (let i = 0; i < 6; i++) line(-44 + col * 30, -2 + i * 3.2, -18 + col * 30, -2 + i * 3.2, 'rgba(40,30,20,0.3)', 0.5);
      c.restore();
      // сахар на блюдце
      E(176, 166, 16, 4.2, 'rgba(0,0,0,0.15)'); E(176, 164, 15, 4, '#eeeae2'); E(176, 163.6, 11, 2.6, '#dcd6cc');
      [[170, 160], [178, 159], [182, 161]].forEach(function (s) { R(s[0], s[1] - 4, 5, 5, '#f8f6f0'); R(s[0], s[1] - 4, 5, 1, '#ffffff'); R(s[0] + 3.6, s[1] - 4, 1.4, 5, 'rgba(0,0,0,0.08)'); });
      // лампа с тканевым абажуром
      soft(84, 170, 26, 5, '0,0,0', 0.4);
      E(74, 168, 12, 3, P.brassG(62, 86)); R(72.6, 118, 2.8, 50, P.brassG(72, 76));
      poly([50, 120, 98, 120, 90, 94, 58, 94], LG(50, 0, 98, 0, [0, '#c89868', 0.5, '#f0d0a0', 1, '#b08050'])); for (let i = 0; i < 10; i++) line(52 + i * 4.8, 120, 59 + i * 3.4, 94, 'rgba(120,70,30,0.25)', 0.4);
      for (let i = 0; i < 16; i++) line(50 + i * 3.1, 120, 50 + i * 3.1, 123.4, 'rgba(150,90,40,0.7)', 0.4);
      // подстаканник со стаканом
      // кайма скатерти
      R(-10, 204, W + 20, 5, 'rgba(150,40,30,0.55)'); for (let i = 0; i < 48; i++) { E(4 + i * 8, 206.5, 2, 1.2, 'rgba(240,230,220,0.5)'); }
      // подстаканник с гранёным стаканом
      const x = 244, gt = 112, hb = 148;
      soft(x + 30, 196, 40, 5, '0,0,0', 0.3); soft(x + 4, 196, 22, 5, '0,0,0', 0.45);
      c.save(); c.beginPath(); c.moveTo(x - 16, gt); c.lineTo(x - 14.6, 188); c.lineTo(x + 14.6, 188); c.lineTo(x + 16, gt); c.closePath(); c.clip();
      R(x - 18, gt, 36, 80, 'rgba(210,225,230,0.1)');
      R(x - 18, gt + 7, 36, 80, LG(x - 16, 0, x + 16, 0, [0, 'rgba(70,22,4,0.9)', 0.35, 'rgba(150,58,12,0.84)', 0.6, 'rgba(176,74,18,0.8)', 1, 'rgba(60,18,4,0.9)']));
      for (let fx = x - 16; fx < x + 16; fx += 4.6) { R(fx, gt, 0.7, 80, 'rgba(255,255,255,0.1)'); R(fx + 2.3, gt, 0.5, 80, 'rgba(0,0,0,0.12)'); }
      lighter(function () { R(x - 12.6, gt + 2, 2, 40, 'rgba(255,255,255,0.14)'); R(x + 8.6, gt + 2, 1.2, 40, 'rgba(255,255,255,0.08)'); R(x - 10, gt + 14, 14, 30, 'rgba(255,140,50,0.08)'); });
      c.restore();
      E(x, gt + 7, 15.4, 2.6, 'rgba(110,40,8,0.95)'); E(x + 2, gt + 6.6, 11, 1.6, 'rgba(200,110,40,0.55)'); E(x - 4, gt + 6.6, 1.4, 0.6, 'rgba(255,240,210,0.8)');
      E(x - 6, gt + 6.8, 5.6, 1.3, 'rgba(240,210,80,0.85)'); E(x - 6, gt + 6.8, 4.4, 0.9, 'rgba(252,240,170,0.8)'); for (let k = 0; k < 6; k++) line(x - 6, gt + 6.8, x - 6 + Math.cos(k) * 4.4, gt + 6.8 + Math.sin(k) * 0.9, 'rgba(220,190,60,0.7)', 0.2);
      line(x + 5, gt + 10, x - 8, gt - 30, '#c8ccd4', 1.1); E(x - 8.5, gt - 31.6, 1.5, 2.6, '#d8dce2', -0.33); line(x + 5, gt + 10, x - 8, gt - 30, 'rgba(255,255,255,0.5)', 0.3);
      c.strokeStyle = 'rgba(230,240,245,0.6)'; c.lineWidth = 0.5; c.beginPath(); c.ellipse(x, gt, 16, 2.6, 0, 0, 6.28); c.stroke();
      c.beginPath(); c.moveTo(x - 16.4, hb); c.lineTo(x - 15.4, 190); c.quadraticCurveTo(x, 194, x + 15.4, 190); c.lineTo(x + 16.4, hb); c.quadraticCurveTo(x, hb + 3, x - 16.4, hb); c.closePath();
      c.fillStyle = LG(x - 17, 0, x + 17, 0, [0, '#3a3a40', 0.2, '#c8c8ce', 0.42, '#7a7a82', 0.68, '#dcdce2', 1, '#2e2e34']); c.fill();
      c.save(); c.clip();
      for (let i = 0; i < 6; i++) { const ax = x - 13 + i * 5.2; c.beginPath(); c.moveTo(ax - 1.1, 184); c.lineTo(ax - 1.1, 164); c.arc(ax, 164, 1.1, Math.PI, 0); c.lineTo(ax + 1.1, 184); c.closePath(); c.fillStyle = 'rgba(110,36,8,0.8)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.25; c.stroke(); }
      for (let i = 0; i < 3; i++) { c.strokeStyle = 'rgba(40,40,46,0.45)'; c.lineWidth = 0.35; c.beginPath(); c.moveTo(x - 16, hb + 6 + i * 1.6); c.quadraticCurveTo(x, hb + 9 + i * 1.6, x + 16, hb + 6 + i * 1.6); c.stroke(); }
      c.restore();
      R(x - 16.4, hb, 32.8, 2, '#e6e6ec'); E(x, 190.6, 18, 4, LG(x - 18, 0, x + 18, 0, [0, '#2e2e34', 0.4, '#c8c8d0', 1, '#24242a']));
      c.strokeStyle = LG(x + 14, 0, x + 30, 0, [0, '#4a4a52', 0.5, '#d8d8e0', 1, '#3a3a42']); c.lineWidth = 2.4; c.beginPath(); c.moveTo(x + 15.6, hb + 6); c.bezierCurveTo(x + 29, hb + 6, x + 29, 182, x + 15.4, 182); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x + 17, hb + 5); c.bezierCurveTo(x + 27, hb + 5, x + 27.6, 170, x + 26, 176); c.stroke();
      // свет лампы
      lighter(function () { c.fillStyle = RG(74, 108, 0, 300, [0, 'rgba(255,170,90,0.36)', 0.35, 'rgba(255,140,60,0.12)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, W, H); });
      vign(0.55, 200, 120, 80);
    });
  }

  /* ============================================================
     G/H. ЛОКАЦИИ ИГРЫ (изба Агаты, мастерская Гофмана) — целиком, со светом
     ============================================================ */
  function locPrep(id, L) { LAVKA.prep(id, L); }
  function locDraw(id, now, L, o) { LAVKA.draw(id, now, L, o); }

  /* ============================================================
     ПЛАНЫ ИЗ ВСТУПЛЕНИЯ
     ============================================================ */
  function townDawn() { const ab = once('t_ab', function () { return KN.s5Above({ dawn: true }); }); return { above: ab, water: once('t_w', function () { return KN.s5Water(ab); }), fore: once('t_f', KN.s5Fore) }; }
  function drawTown(L) { const c = X(); c.drawImage(L.above, 0, 0, W, H); c.drawImage(L.water, 0, 0, W, H); }
  function ledgerPaid(t, k, now, L) {
    const q = ease(k);
    camIn(lerp(1, 1.16, q), lerp(196, 236, q), lerp(110, 100, q), function () {
      X().drawImage(L.back, 0, 0, W, H);
      KN.onPage(0.08, 0.16, function () { txt('Долг Кредитору', 0, 0, 'bold 9px ' + HAND, 'rgba(40,16,10,0.9)'); });
      [0.27, 0.36, 0.45, 0.54].forEach(function (v, i) { KN.onPage(0.12, v, function () { txt('ночь ' + (i + 4) + '-я', 0, 0, 'italic 7px ' + HAND, 'rgba(40,30,20,0.8)'); txt('— ' + (180 - i * 40) + ' гр.', 52, 0, 'italic 7px ' + HAND, 'rgba(40,30,20,0.8)'); }); });
      const p = seg(t, 2200, 3600);
      if (p > 0) KN.onPage(0.08, 0.6, function () { const c = X(); c.strokeStyle = 'rgba(70,12,10,0.9)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(0, -30); c.lineTo(96 * p, -30 + Math.sin(p * 9) * 1.4); c.stroke(); c.beginPath(); c.moveTo(0, -26); c.lineTo(96 * p, -24); c.stroke(); });
      const s = seg(t, 4100, 4400);
      if (s > 0) KN.onPage(0.5, 0.78, function () { const c = X(); c.save(); c.rotate(-0.16); c.scale(1.6 - s * 0.6, 1.6 - s * 0.6); c.globalAlpha = s; c.strokeStyle = 'rgba(170,20,20,0.85)'; c.lineWidth = 1.2; c.strokeRect(-36, -11, 72, 16); txt('УПЛАЧЕНО', 0, 1.6, 'bold 11px ' + SERIF, 'rgba(170,20,20,0.85)', 'center'); c.restore(); });
      P.flame(36, 66, 2.2, now, 2, '255,150,60', 0); bloom(36, 62, 80, '255,160,80', 0.3);
      P.motes(now, 20, 20, 160, 120, 30, 6, '255,220,170', 0.5);
    });
  }
  /* Сенная: ночь и утро одной и той же улицы */
  const pv6 = KN.pv6;
  function streetLights(now, a) {
    if (a <= 0.01) return;
    KN.LMP6.forEach(function (z, i) { const tp = pv6(-4.55, -2.9, z), s = 140 / z, f = 1 + Math.sin(now / (80 + i * 23) + i) * 0.07; bloom(tp[0], tp[1] - 0.34 * s, (1.9 * s + 8) * f, '255,196,120', 0.6 * a); });
    const wv = pv6(5.2, -0.4, 6.5); gl(wv[0], wv[1], 40, '255,170,80', 0.22 * a);
    KN.SHOPL6.forEach(function (l, i) { const p = pv6(l[0], l[1], l[2]), s = 140 / l[2]; bloom(p[0], p[1], (0.9 * s + 6) * (1 + Math.sin(now / (70 + i * 31)) * 0.06), '255,200,130', 0.55 * a); });
  }
  function chimneySmoke(now, x, y, a) { for (let j = 0; j < 7; j++) { const p = ((now / 5200 + j / 7) % 1); soft(x + p * 16 + Math.sin(p * 5 + j) * 2, y - p * 26, 1.6 + p * 7, 1.4 + p * 5, '226,222,226', a * (1 - p)); } }

  /* ============================================================
     ПЛАНЫ КОНЦОВОК
     ============================================================ */
  const ENDS = {
    bell: [
      { d: 10000, cues: [[200, 'bigBell'], [2600, 'bigBell'], [5000, 'bigBell'], [7400, 'bigBell'], [600, 'dawn']],
        prep: function (L) { L.t = townDawn(); },
        draw: function (t, k, now, L) {
          const q = ease(k);
          camIn(lerp(1, 1.08, q), lerp(192, 176, q), lerp(112, 104, q), function () {
            drawTown(L.t);
            for (let i = 0; i < 5; i++) { const p = ((now / 2400 + i / 5) % 1), r = 4 + p * 220; X().strokeStyle = 'rgba(255,240,210,' + (0.28 * (1 - p)).toFixed(3) + ')'; X().lineWidth = 1.2 * (1 - p) + 0.2; X().beginPath(); X().arc(152, 95, r, 0, 6.28); X().stroke(); }
            for (let i = 0; i < 9; i++) { const p = ((now / 9000 + hsh(i)) % 1), bx = 152 + (hsh(i + 2) - 0.5) * 30 + p * (hsh(i + 5) - 0.3) * 160, by = 92 - p * 70, w = Math.sin(now / (100 + i * 9) + i) * 1.4; line(bx - 2.4, by - w, bx, by, 'rgba(40,30,40,0.7)', 0.45); line(bx, by, bx + 2.4, by - w, 'rgba(40,30,40,0.7)', 0.45); }
            const fy = lerp(104, 176, ease(seg(t, 0, 9000)));
            P.fog(fy, 70, now, 4, 0.6 - q * 0.25, '250,230,225', 4);
            P.fog(fy + 24, 70, now + 3000, 7, 0.65, '245,225,222', 5);
            X().drawImage(L.t.fore, 0, 0, W, H);
          });
        } },
      { d: 10000, cues: [[400, 'bigBell'], [3000, 'bigBell'], [5600, 'bigBell'], [8200, 'bigBell']],
        prep: function (L) { L.ds = once('ds_dawn', function () { return doorstepL({ time: 'dawn' }); }); },
        draw: function (t, k, now, L) {
          const q = ease(k), pulse = [400, 3000, 5600, 8200].reduce(function (a, b) { return Math.max(a, t > b ? Math.max(0, 0.12 * (1 - (t - b) / 900)) : 0); }, 0);
          porchShot(t, k, now, L, { z: lerp(1.25, 1.62, q), fx: lerp(196, 178, q), fy: lerp(128, 138, q), pulse: pulse });
        } },
      { d: 9500, cues: [[800, 'coin']],
        prep: function (L) { L.sq = once('cathedral', cathedralL); },
        draw: function (t, k, now, L) {
          const q = ease(k);
          camIn(lerp(1.05, 1.5, q), lerp(200, 236, q), lerp(112, 150, q), function () {
            X().drawImage(L.sq, 0, 0, W, H);
            topHat(240, 160, 1.05, now);
            pigeon(300, 170, 1.2, now, 1); pigeon(318, 182, 1.25, now, 2, '#7a7a82'); pigeon(96, 172, 1.15, now, 3);
            lighter(function () { P.shaft(380, -10, 90, 250, 216, 130, '255,220,170', 0.12); });
            snowFx(now, 90, 0.75, 7);
          });
          P.fog(110, 100, now, 2, 0.22, '235,238,245', 5);
        } },
      { d: 10500,
        prep: function (L) { L.day = once('s6_day', function () { return KN.s6Back({ day: 1 }); }); },
        draw: function (t, k, now, L) {
          const q = ease(k), p = ease(seg(t, 500, 10500)), pr = pv6;
          camIn(lerp(1.02, 1.12, q), 192, lerp(104, 100, q), function () {
            const c = X(); c.drawImage(L.day, 0, 0, W, H);
            bloom(188, 96, 60, '255,230,190', 0.4);
            chimneySmoke(now, 265, 26, 0.35); chimneySmoke(now + 2000, 118, 34, 0.3);
            const zz = lerp(7.2, 30, p), X0 = lerp(3.2, 0.5, p), s = 140 / zz, f = pr(X0, 1.7, zz);
            c.save(); c.translate(f[0], f[1]); c.transform(1, 0, -0.5, 0.5, 0, 0); c.scale(1, -1); person(0, 0, 1.75 * s, { col: 'rgba(20,18,30,0.35)', bag: true }); c.restore();
            hero(f[0], f[1], 1.75 * s, { bag: true, walk: now / 520, rim: 'rgba(255,220,180,0.5)', rimDy: -1, a: 1 - p * 0.3 });
            birds(now, 6, 120, 60, 26, -4, '#2a2a30', 1, 3);
            P.fog(92, 40, now, 3, 0.35, '250,226,214', 4);
          });
        } }
    ],
    dawn: [
      { d: 10500, cues: [[600, 'creak']],
        prep: function (L) { L.room = once('room_dawn', function () { return roomL('dawn'); }); L.mode = 'dawn'; },
        draw: function (t, k, now, L) {
          const q = ease(k);
          camIn(lerp(1.02, 1.18, q), lerp(192, 190, q), lerp(104, 100, q), function () {
            roomF(t, now, L, { open: 0.42,
              before: function () {
                for (let i = 0; i < 9; i++) {
                  const ph = ((now / 7000 + hsh(i)) % 1), sx = (hsh(i + 3) - 0.5) * 4, sy = 0.4 + hsh(i + 5) * 1.0, sz = 1.6 + hsh(i + 7) * 2.6;
                  const x = lerp(sx, 0.1, ph), y = lerp(sy, 0.6, ph), z = lerp(sz, AZ + 0.8, ph), p = pa(x, y, z), s = sA(z);
                  soft(p[0], p[1], 0.9 * s, 0.45 * s, '214,210,212', 0.34 * Math.sin(ph * Math.PI) * (1 - q * 0.7));
                }
              },
              after: function () { for (let i = 0; i < 6; i++) { const p = ((now / 3200 + i / 6) % 1); soft(LAMPF.x + Math.sin(p * 6 + i) * 2 * p, LAMPF.y - 2 - p * 26, 0.8 + p * 3, 0.8 + p * 4, '200,196,196', 0.4 * (1 - p)); } } });
          });
          lighter(function () { R(0, 0, W, H, 'rgba(255,190,140,' + (0.05 + q * 0.08).toFixed(3) + ')'); });
        } },
      { d: 10000, cues: [[600, 'tick'], [1600, 'tick'], [2600, 'tick'], [3600, 'tick'], [4600, 'tick'], [5600, 'tick']],
        prep: function (L) { L.ds = once('ds_dawn', function () { return doorstepL({ time: 'dawn' }); }); },
        draw: function (t, k, now, L) { const q = ease(k); porchShot(t, k, now, L, { z: lerp(2.3, 1.4, q), fx: lerp(166, 190, q), fy: lerp(122, 132, q) }); } },
      { d: 10000, cues: [[2800, 'click'], [6200, 'bell']],
        prep: function (L) { L.ds = once('ds_dawn', function () { return doorstepL({ time: 'dawn' }); }); },
        draw: function (t, k, now, L) {
          const up = ease(seg(t, 4800, 7400));
          camIn(lerp(2.6, 2.1, up), lerp(198, 204, up), lerp(166, 70, up), function () {
            X().drawImage(L.ds, 0, 0, W, H);
            const ph = seg(t, 600, 4400), dn = ease(seg(ph, 0, 0.45)), back = ease(seg(ph, 0.7, 1)), lift = ph > 0.35 && ph < 0.75 ? Math.sin(seg(ph, 0.35, 0.75) * Math.PI) : 0;
            doorMat(lift);
            if (ph > 0.55) { E(184, 171.6, 2.6, 0.7, P.brassG(181, 187)); if (ph > 0.6 && ph < 0.85) gl(184, 171.4, 5, '255,230,180', 0.5); }
            if (ph > 0 && ph < 1) {
              const hx = lerp(262, 186, dn) + back * 80, hy = lerp(140, 167, dn) - back * 34;
              if (ph < 0.58) { E(hx + 3.4, hy - 0.4, 1.7, 1.7, P.brassG(hx + 1.7, hx + 5.1)); E(hx + 3.4, hy - 0.4, 0.8, 0.8, '#3a2a14'); R(hx - 4.6, hy - 0.9, 6.6, 1, P.brassG(hx - 4.6, hx + 2)); R(hx - 4.6, hy, 1, 1.6, P.brassG(hx - 4.6, hx - 3.6)); R(hx - 2.6, hy, 1, 1.2, P.brassG(hx - 2.6, hx - 1.6)); }
              glove(hx + 7, hy - 5.4, 2.45, 0.42, { pinch: true, rim: 'rgba(255,200,150,0.45)', rimDx: -0.5, s0: '#18161a' });
            }
            const sw = t > 6200 ? Math.sin((t - 6200) / 140) * 0.5 * Math.max(0, 1 - (t - 6200) / 2600) : 0;
            bellBehindGlass(sw);
            if (t > 6200 && t < 6800) gl(219, DS.gy0 + 12, 8, '255,230,170', 0.4 * (1 - (t - 6200) / 600));
            P.fog(150, 66, now, 4, 0.3, '236,226,226', 3);
          });
        } },
      { d: 11000, cues: [[500, 'whistle'], [1100, 'chug']],
        prep: function (L) {
          L.t = townDawn();
          L.br = once('bridge', function () { return layer(function () { const c = X(), y = 154; R(-10, y - 6, W + 20, 6, '#3a3040'); R(-10, y - 7, W + 20, 1.4, '#6a5a64'); for (let x = -10; x < W + 20; x += 6) R(x, y - 13, 0.8, 6, '#3a3040'); R(-10, y - 13, W + 20, 0.8, '#3a3040'); for (let x = -10; x < W + 20; x += 54) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 26); c.lineTo(x + 9, y + 26); c.lineTo(x + 9, y + 12); c.quadraticCurveTo(x + 31.5, y - 4, x + 54, y + 12); c.lineTo(x + 54, y); c.closePath(); c.fillStyle = '#2e2634'; c.fill(); } line(-10, y - 7, W + 20, y - 7, 'rgba(255,214,170,0.35)', 0.4); }); });
        },
        draw: function (t, k, now, L) {
          const q = ease(k);
          camIn(lerp(1, 1.06, q), 192, lerp(114, 110, q), function () {
            drawTown(L.t);
            gl(250, 150, 60 + q * 40, '255,236,190', 0.3 + q * 0.2);
            P.fog(140, 40, now, 3, 0.55, '250,230,225', 6);
            X().drawImage(L.br, 0, 0, W, H);
            const off = -120 + ease(seg(t, 0, 10500)) * 560, y = 147;
            for (let i = 0; i < 5; i++) { const x = off - 26 * (i + 1); P.rr(x, y - 9, 24, 8, 0.8, '#2a2430'); for (let j = 0; j < 4; j++) R(x + 3 + j * 5.4, y - 7, 3, 2.4, 'rgba(255,214,160,0.55)'); }
            P.rr(off - 2, y - 11, 16, 10, 1, '#1e1a24'); R(off + 6, y - 15, 3, 5, '#1e1a24');
            for (let i = 0; i < 10; i++) { const p = ((now / 3200 + i / 10) % 1); soft(off + 7 - p * 70, y - 17 - p * 16, 2 + p * 7, 1.6 + p * 5, '255,236,228', 0.5 * (1 - p)); }
            X().drawImage(L.t.fore, 0, 0, W, H);
          });
        } }
    ],
    keeper: [
      { d: 9000, cues: [[2300, 'scratch'], [4200, 'stamp']],
        prep: function (L) { L.back = once('ledger', function () { return KN.s7Back(); }); },
        draw: function (t, k, now, L) { ledgerPaid(t, k, now, L); } },
      { d: 10500,
        prep: function (L) { L.n = once('street', function () { return KN.s6Back(); }); L.d = once('s6_day', function () { return KN.s6Back({ day: 1 }); }); },
        draw: function (t, k, now, L) {
          const cyc = (t / 3000) % 1, day = clamp(0.5 + Math.cos(cyc * Math.PI * 2) * 0.9);
          camIn(1.06, 196, 102, function () {
            const c = X(); c.drawImage(L.n, 0, 0, W, H); c.save(); c.globalAlpha = day; c.drawImage(L.d, 0, 0, W, H); c.restore();
            streetLights(now, 1 - day);
            for (let i = 0; i < 6; i++) { const x = ((t / 4 + i * 90) % 480) - 60; soft(x, 12 + (i % 3) * 8, 46, 5, day > 0.5 ? '255,250,250' : '40,46,56', 0.25); }
            if (day > 0.5) { const r = P.RNG(Math.floor(t / 300)), pr = pv6; for (let i = 0; i < 4; i++) { const zz = 6 + r() * 26, s = 140 / zz, f = pr(-3 + r() * 6, 1.7, zz); person(f[0], f[1], 1.75 * s, { col: 'rgba(30,30,36,' + (0.6 * day).toFixed(2) + ')', blur: 1.4, walk: now / 150 + i, hat: r() < 0.3 ? 'bowler' : null }); } }
            if (day < 0.5) KN.rain(now, { n: 50, len: 4, spd: 0.25, a: 0.1 * (1 - day * 2), seed: 8, ang: -0.08 });
            P.fog(80, 70, now, 3, 0.25, day > 0.5 ? '250,230,220' : '140,140,142', 3);
          });
        } },
      { d: 10500, cues: [[5000, 'breath']],
        prep: function (L) { const rn = once('room_night', function () { return roomL('night'); }); L.m = once('mirror', function () { return mirrorL(rn); }); L.fg = once('hero_back', heroBackL); L.ry = once('refl_y', function () { return reflL(0); }); L.ro = once('refl_o', function () { return reflL(1); }); },
        draw: function (t, k, now, L) {
          const q = ease(k), age = ease(seg(t, 2200, 8800));
          camIn(lerp(1.02, 1.14, q), lerp(196, 200, q), lerp(104, 96, q), function () { mirrorF(now, L, { who: true, age: age }); });
        } },
      { d: 11500, cues: [[500, 'scratch'], [2600, 'scratch'], [4900, 'scratch'], [7200, 'scratch']],
        prep: function (L) { L.bg = once('letter', letterL); },
        draw: function (t, k, now, L) {
          const q = ease(k);
          camIn(lerp(1.02, 1.2, q), lerp(198, 204, q), lerp(108, 100, q), function () {
            X().drawImage(L.bg, 0, 0, W, H);
            const qp = writeF(t, now, [{ s: 'Здравствуй. Ты меня не знаешь.', v: 0.13 }, { s: 'Лавка «Последний час» — теперь твоя.', v: 0.25 }, { s: 'Правила — в гроссбухе. Не нарушай их.', v: 0.37 }, { s: 'И не бойся колокольчика.', v: 0.49 }]);
            const hp = qp || shp(0.5, 0.62);
            QUILL(hp[0], hp[1] + (qp ? 0 : 6), qp ? Math.sin(now / 90) * 0.04 : 0.2);
            soft(hp[0] + 16, hp[1] + 12, 16, 8, '20,10,4', 0.35); soft(hp[0] + 8, hp[1] + 6, 6, 3, '20,10,4', 0.3);
            P.flame(40, 69, 2.2, now, 2, '255,150,60', 0); bloom(40, 64, 84, '255,160,80', 0.32);
            P.motes(now, 20, 20, 170, 120, 30, 6, '255,220,170', 0.45);
          });
        } }
    ],
    creditor: [
      { d: 9500, cues: [[700, 'page'], [2500, 'page'], [4300, 'page'], [6100, 'page']],
        prep: function (L) { L.env = once('bk_env', bookEnvL); L.b = once('bk_open', function () { return bookPagesL(); }); },
        draw: function (t, k, now, L) {
          const q = ease(k);
          camIn(lerp(1.02, 1.12, q), lerp(200, 212, q), lerp(110, 104, q), function () {
            const c = X(); c.drawImage(L.env, 0, 0, W, H); c.drawImage(L.b, 0, 0, W, H);
            const sp = Math.min(1, t / 6000), ph = (t / lerp(1500, 2400, sp)) % 1;
            if (t < 7400) pageTurn(ease(ph));
            creditorShadow(0.4, 0, Math.sin(now / 2200) * 0.02);
            candleTop(now);
          });
        } },
      { d: 9500, cues: [[3000, 'whisper']],
        prep: function (L) { L.env = once('bk_env', bookEnvL); L.b = once('bk_blank', function () { return bookPagesL({ blank: true }); }); },
        draw: function (t, k, now, L) {
          const q = ease(k);
          camIn(lerp(1.12, 1.36, q), lerp(236, 250, q), lerp(112, 110, q), function () {
            const c = X(); c.drawImage(L.env, 0, 0, W, H); c.drawImage(L.b, 0, 0, W, H);
            const m = pg(0.5, 0.5); gl(m[0], m[1], 60, '255,240,210', 0.08 + Math.sin(now / 900) * 0.03);
            const hov = 1 - ease(seg(t, 6400, 8400)), qx = 266 + Math.sin(now / 800) * 3 * hov, qy = 104 + Math.sin(now / 600) * 2 * hov + (1 - hov) * 14;
            soft(qx - 16 + (1 - hov) * 12, qy + 20 - (1 - hov) * 12, 24, 5, '0,0,0', 0.25 + (1 - hov) * 0.2);
            const dr = seg(t, 4200, 4700), bl = ease(seg(t, 4700, 6200));
            if (dr > 0 && dr < 1) E(qx, qy + 2 + dr * 14, 0.7, 1.1, 'rgba(90,10,8,0.95)');
            if (bl > 0) { E(qx, qy + 16.5, 0.6 + bl * 2.6, 0.4 + bl * 1.4, 'rgba(110,14,10,0.85)'); E(qx + bl * 2.4, qy + 17, bl * 0.9, bl * 0.5, 'rgba(110,14,10,0.7)'); }
            QUILL(qx, qy, (1 - hov) * 0.5);
            candleTop(now);
          });
        } },
      { d: 10500, cues: [[3400, 'creak'], [3500, 'bell']],
        prep: function (L) { L.room = once('room_night', function () { return roomL('night'); }); L.mode = 'night'; },
        draw: function (t, k, now, L) {
          const q = ease(k), op = ease(seg(t, 3200, 5200)) * 0.85, p = ease(seg(t, 4600, 9800));
          camIn(lerp(1.3, 1.6, q), lerp(188, 186, q), lerp(98, 100, q), function () {
            const nl = bw(DA.x0 - 0.24, -0.34), ss = sA(AZ), flt = op * Math.sin(now / 300) * 0.05;
            roomF(t, now, L, { open: op, bell: t > 3500 ? Math.sin((t - 3500) / 120) * 0.5 * Math.max(0, 1 - (t - 3500) / 2600) : 0,
              before: function () {
                const c = X(); c.save(); c.translate(nl[0], nl[1]); c.rotate(Math.sin(now / 1400) * 0.04 + flt);
                person(0, 1.75 * ss * 0.98, 1.75 * ss, { col: '#010102', a: 0.85, flare: 2, blur: 0.8 + Math.sin(now / 500) * 0.3 });
                c.restore();
              },
              who: p > 0.3 ? function () { const zz = lerp(AZ + 0.1, AZ + 3, p), pp = pa(0.1, AF, zz), s = sA(zz); hero(pp[0], pp[1], 1.8 * s, { hat: 'top', thin: 0.8, long: true, walk: now / 600, a: 1 - p * 0.8, blur: p * 1.2 }); } : null,
              inside: p <= 0.3 ? function () { const zz = lerp(AZ - 0.7, AZ + 0.1, p / 0.3), pp = pa(0.1, AF, zz), s = sA(zz); hero(pp[0], pp[1], 1.8 * s, { hat: 'top', thin: 0.8, long: true, walk: p > 0 ? now / 600 : 0, rim: 'rgba(255,170,100,0.3)', rimDx: 0.8 }); } : null });
          });
        } },
      { d: 10500,
        prep: function (L) { L.out = once('s1o', KN.s1Outside); L.room = once('s1r', KN.s1Room); L.desk = once('s1d', KN.s1Desk); },
        draw: function (t, k, now, L) {
          const q = ease(k), fl = 1 + Math.sin(now / 83) * 0.05;
          camIn(lerp(1, 1.1, q), lerp(192, 140, q), lerp(108, 80, q), function () {
            const c = X(); c.drawImage(L.out, 0, 0, W, H);
            c.save(); c.beginPath(); c.rect(KN.WN.x, KN.WN.y, KN.WN.w, KN.WN.h); c.clip();
            KN.rain(now, { n: 80, len: 5, spd: 0.3, a: 0.14, seed: 2, ang: -0.12 });
            line(160, 126, 160, 60, '#0a0c10', 1.2); gl(160, 58, 30, '255,210,150', 0.5);
            person(150, 126, 50 * ease(seg(t, 1500, 4000)) + 0.01, { hat: 'top', thin: 0.75, long: true, col: '#020203', a: ease(seg(t, 1500, 4000)) });
            c.restore();
            c.drawImage(L.room, 0, 0, W, H);
            c.drawImage(L.desk, 0, 0, W, H);
            c.save(); c.translate(200, 150); c.rotate(0.06); P.softRect(-40, -22, 80, 44, 3, 0.45); R(-40, -22, 80, 44, LG(0, -22, 0, 22, [0, '#ece2c8', 1, '#c4b08a'])); for (let i = 0; i < 6; i++) line(-32, -14 + i * 6, 30 - (i % 2) * 10, -14 + i * 6, 'rgba(30,20,36,0.6)', 0.4); c.restore();
            P.flame(314, 141.4, 2.0, now, 1, '255,150,60', 0); bloom(314, 136, 70, '255,160,80', 0.3 * fl);
          });
        } }
    ],
    pawn: [
      { d: 8500, cues: [[2700, 'thud']],
        prep: function (L) { L.env = once('bk_env', bookEnvL); L.b = once('bk_heir', function () { return bookPagesL({ heir: true }); }); },
        draw: function (t, k, now, L) {
          const cl = ease(seg(t, 1300, 2700)), c = X();
          camIn(lerp(1.06, 1.12, ease(k)), 206, 110, function () {
            c.drawImage(L.env, 0, 0, W, H);
            const sp = pg(0, 0)[0];
            if (cl <= 0) c.drawImage(L.b, 0, 0, W, H);
            else {
              c.save(); c.beginPath(); c.rect(sp, 0, W, H); c.clip(); c.drawImage(L.b, 0, 0, W, H); c.restore();
              const w = Math.cos(cl * Math.PI), lift = Math.sin(cl * Math.PI), pts = [];
              for (let i = 0; i <= 10; i++) { const v = i / 10, u = -w * 1.06; const p = pg(u, lerp(-0.045, 1.05, v)); pts.push(p[0], p[1] - lift * 22 * (1 - Math.abs(u) * 0.3)); }
              const s0 = pg(0, 1.05), s1 = pg(0, -0.045);
              soft(sp + (pts[10] - sp) * 0.5, pg(0, 0.6)[1] + 8, 60 * lift + 10, 70, '0,0,0', 0.4);
              poly(pts.concat([s0[0], s0[1], s1[0], s1[1]]), w > 0 ? LG(sp, 0, pts[10], 0, [0, '#a89874', 1, '#d6c8a4']) : LG(sp, 0, pts[10] + 0.01, 0, [0, '#1a161e', 0.7, '#0c0a10', 1, '#2a2430']));
              if (cl >= 1) {
                const g0 = pg(0.08, 0.04), g1 = pg(0.98, 0.04), g2 = pg(0.98, 1.0), g3 = pg(0.08, 1.0);
                c.strokeStyle = 'rgba(200,160,80,0.6)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(g0[0], g0[1]); c.lineTo(g1[0], g1[1]); c.lineTo(g2[0], g2[1]); c.lineTo(g3[0], g3[1]); c.closePath(); c.stroke();
                const m = pg(0.53, 0.5); c.save(); c.translate(m[0], m[1]); c.strokeStyle = 'rgba(210,170,90,0.7)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-7, -10); c.lineTo(7, -10); c.lineTo(-7, 10); c.lineTo(7, 10); c.closePath(); c.stroke(); c.restore();
              }
            }
            const go = ease(seg(t, 3600, 6600));
            creditorShadow(0.46 * (1 - go), go * 140, Math.sin(cl * Math.PI) * 0.06);
            const pd = seg(t, 2700, 4600); if (pd > 0 && pd < 1) P.motes(now, 190, 70, 150, 90, 50, 2, '220,210,190', 0.7 * (1 - pd));
            candleTop(now, 1 - seg(t, 4800, 8000) * 0.7);
          });
          R(0, 0, W, H, 'rgba(0,0,0,' + (seg(t, 5200, 8400) * 0.75).toFixed(3) + ')');
        } },
      { d: 10000,
        prep: function (L) { L.room = once('room_dawn_doll', function () { return roomL('dawn', { doll: true }); }); L.mode = 'dawn'; },
        draw: function (t, k, now, L) {
          const q = ease(seg(t, 1500, 8800)), dp = pa(SHELF.x0 + 0.24, SHELF.ys[4], DOLLZ), ds = sA(DOLLZ);
          camIn(lerp(1.02, 1.9, q), lerp(192, 104, q), lerp(104, 56, q), function () {
            roomF(t, now, L, { after: function () {
              R(0, 0, W, H, RG(dp[0], dp[1] - 0.2 * ds, 20, 200, [0, 'rgba(0,0,0,0)', 0.5, 'rgba(4,4,10,' + (0.25 * q).toFixed(3) + ')', 1, 'rgba(4,4,10,' + (0.5 * q).toFixed(3) + ')']));
              gl(dp[0], dp[1] - 0.24 * ds, 0.6 * ds, '255,220,170', 0.45 * q);
              P.shaft(dp[0] + 70, dp[1] - 50, 10, dp[0], dp[1] - 0.2 * ds, 26, '255,220,170', 0.14 * q);
            } });
          });
        } },
      { d: 11500, cues: [[7600, 'creak']],
        prep: function (L) {
          L.bg = once('doll_bg', dollBgL);
          L.dS = once('doll_s', function () { return layer(function () { blurred(0.3, function () { dollPaint(false); }); }); });
          L.dB = once('doll_b', function () { return layer(function () { blurred(2.6, function () { dollPaint(true); }); }); });
          L.tS = once('tag_s', function () { return layer(function () { tagPaint(false); }); });
          L.tB = once('tag_b', function () { return layer(function () { blurred(2.4, function () { tagPaint(true); }); }); });
        },
        draw: function (t, k, now, L) {
          const q = ease(k), fo = ease(seg(t, 5400, 7000));
          camIn(lerp(1.02, 1.12, q), lerp(206, 196, q), lerp(110, 104, q), function () {
            const c = X(); c.drawImage(L.bg, 0, 0, W, H);
            c.save(); c.globalAlpha = 1 - fo; c.drawImage(L.dB, 0, 0, W, H); c.globalAlpha = fo; c.drawImage(L.dS, 0, 0, W, H); c.restore();
            if (fo > 0) {
              const look = ease(seg(t, 7400, 8200)) * 1.1;
              c.save(); c.globalAlpha = fo;
              DL.ex.forEach(function (ex) {
                c.save(); c.beginPath(); c.ellipse(ex, DL.eyeY, 3.8, 2.3, 0, 0, 6.28); c.clip();
                const ix = ex + look * (ex < DL.x ? 1 : 0.8);
                E(ix, DL.eyeY + 0.2, 2, 2, RG(ix, DL.eyeY, 0, 2, [0, '#5a4234', 0.7, '#2e221c', 1, '#140e0a'])); E(ix, DL.eyeY + 0.2, 0.9, 0.9, '#050404'); E(ix - 0.6, DL.eyeY - 0.5, 0.45, 0.45, 'rgba(255,255,255,0.9)');
                R(ex - 4, DL.eyeY - 3, 8, 1.6, 'rgba(60,40,30,0.25)');
                c.restore();
              });
              const tq = seg(t, 8800, 10800); if (tq > 0) { E(DL.ex[1] + 1.4, DL.eyeY + 3 + tq * 10, 0.6, 0.9, 'rgba(225,235,245,0.85)'); gl(DL.ex[1] + 1.4, DL.eyeY + 3 + tq * 10, 1.6, '220,235,255', 0.4); }
              c.restore();
            }
            c.save(); c.globalAlpha = 1 - fo; c.drawImage(L.tS, 0, 0, W, H); tagText(t); c.restore();
            c.save(); c.globalAlpha = fo; c.drawImage(L.tB, 0, 0, W, H); c.restore();
            P.motes(now, 60, 0, 240, 200, 40, 5, '255,230,190', 0.5);
          });
        } },
      { d: 9500, cues: [[1400, 'bell'], [1500, 'door']],
        prep: function (L) { L.room = once('room_dawn_doll', function () { return roomL('dawn', { doll: true }); }); L.mode = 'dawn'; },
        draw: function (t, k, now, L) {
          const op = ease(seg(t, 1500, 3400)) * 0.9, p = ease(seg(t, 2600, 9000));
          camIn(lerp(1.42, 1.62, ease(k)), 190, 100, function () {
            const zz = lerp(AZ + 1.6, AZ - 0.9, p), pp = pa(0.15, AF, zz), s = sA(zz);
            roomF(t, now, L, { open: op, bell: t > 1400 ? Math.sin((t - 1400) / 120) * 0.5 * Math.max(0, 1 - (t - 1400) / 2600) : 0,
              who: zz >= AZ ? function () { hero(pp[0], pp[1], 1.78 * s, { hat: 'bowler', scarf: false, col: '#040506', walk: now / 640, rim: 'rgba(255,220,180,0.55)', rimDy: -1.2, a: 0.95 }); } : null,
              inside: zz < AZ ? function () {
                const c = X(); c.save(); c.translate(pp[0], pp[1]); c.transform(1, 0, 0.3, 0.55, 0, 0); c.scale(1, -1); person(0, 0, 1.78 * s, { col: 'rgba(10,6,10,0.45)' }); c.restore();
                hero(pp[0], pp[1], 1.78 * s, { hat: 'bowler', scarf: false, col: '#040506', walk: now / 640, rim: 'rgba(255,220,180,0.5)', rimDy: -1.2 });
              } : null });
          });
        } }
    ],
    mad: [
      { d: 9500,
        prep: function (L) { L.room = once('room_night', function () { return roomL('night'); }); L.mode = 'night'; },
        draw: function (t, k, now, L) {
          const q = ease(k), z = lerp(1.6, 3.6, ease(seg(t, 300, 8000)));
          camIn(z, lerp(190, BELLA.x, q), lerp(100, BELLA.y + 8, q), function () {
            roomF(t, now, L, { bell: Math.sin(now / 140) * 0.42 * (t > 500 ? 1 : 0),
              after: function () {
                const ring = 1 - seg(t, 2500, 6500);
                for (let i = 0; i < 4; i++) { const p = ((now / 900 + i / 4) % 1), r = 3 + p * 30; X().strokeStyle = 'rgba(255,230,190,' + (0.3 * (1 - p) * ring).toFixed(3) + ')'; X().lineWidth = 0.4; X().beginPath(); X().arc(BELLA.x, BELLA.y + 6, r, 0, 6.28); X().stroke(); }
              } });
          });
          desat(0.25 + q * 0.7);
          R(0, 0, W, H, 'rgba(14,14,16,' + (q * 0.35).toFixed(2) + ')');
        } },
      { d: 10500, cues: [[4000, 'whisper']],
        prep: function (L) { const rn = once('room_night', function () { return roomL('night'); }); L.m = once('mirror', function () { return mirrorL(rn); }); L.fg = once('hero_back', heroBackL); },
        draw: function (t, k, now, L) {
          camIn(lerp(1.02, 1.1, ease(k)), 200, 100, function () { mirrorF(now, L, { who: false }); });
          desat(0.35);
        } },
      { d: 11000,
        prep: function (L) { L.st = once('street', function () { return KN.s6Back(); }); },
        draw: function (t, k, now, L) {
          const p = ease(seg(t, 800, 10500)), pr = KN.pv6;
          camIn(lerp(1, 1.1, ease(k)), 188, 104, function () {
            X().drawImage(L.st, 0, 0, W, H);
            KN.LMP6.forEach(function (z) { const tp = pr(-4.55, -2.9, z), s = 140 / z; bloom(tp[0], tp[1] - 0.34 * s, 1.9 * s + 8, '255,196,120', 0.55); });
            const zz = lerp(5, 26, p), s = 140 / zz, f = pr(0.4, 1.7, zz);
            hero(f[0], f[1], 1.8 * s, { a: 1 - p * 0.8, walk: -now / 600, face: 'rgba(170,175,172,0.5)', blur: p * 1.6 });
            P.fog(60, 150, now, 3, 0.3 + p * 0.45, '150,150,154', 3);
            KN.rain(now, { n: 70, len: 4, spd: 0.2, a: 0.12, seed: 8, ang: -0.08 });
          });
        } },
      { d: 11000, cues: [[6500, 'bell']],
        prep: function (L) { L.st = once('street', function () { return KN.s6Back(); }); },
        draw: function (t, k, now, L) {
          const p = ease(seg(t, 500, 10500)), pr = KN.pv6;
          camIn(lerp(2.2, 2.5, ease(k)), 188, 98, function () {
            X().drawImage(L.st, 0, 0, W, H);
            R(0, 0, W, H, 'rgba(110,112,116,0.45)');
            gl(188, 96, 18, '255,180,100', 0.55); soft(188, 98, 6, 4, '255,190,110', 0.7);
            const zz = lerp(9, 40, p), s = 140 / zz, f = pr(0.2, 1.7, zz);
            hero(f[0], f[1], 1.8 * s, { a: 0.9, walk: now / 700, long: true, rim: 'rgba(255,180,110,0.3)', rimDx: -0.6 });
            P.fog(60, 120, now, 3, 0.55, '140,144,148', 1); P.fog(90, 90, now + 3000, 6, 0.45, '140,144,148', 4);
          });
        } }
    ],
    shadow: [
      { d: 10500, cues: [[400, 'dawn']],
        prep: function (L) { L.b = once('belfry', belfryL); },
        draw: function (t, k, now, L) {
          const q = ease(k);
          camIn(lerp(1.02, 1.2, q), lerp(196, 236, q), lerp(108, 128, q), function () {
            X().drawImage(L.b, 0, 0, W, H);
            soft(282, 200, 26, 4, '0,0,0', 0.5);
            oldSit(266, 196, 1.62, now, { lean: -0.32, rim: 'rgba(255,206,160,0.85)', rimDx: 0.7, rimDy: -0.45, hair: '#625e58', c0: '#0e0b0a', c1: '#241c18' });
            P.shaft(330, 60, 90, 190, 216, 150, '255,210,160', 0.07); P.shaft(210, 60, 70, 90, 216, 130, '255,210,160', 0.05);
            P.motes(now, 160, 50, 200, 150, 50, 5, '255,236,200', 0.6);
            birds(now, 5, 60, 100, 18, -6, 'rgba(40,30,40,0.6)', 0.8, 11);
          });
        } },
      { d: 10500, cues: [[300, 'crackle'], [3000, 'crackle'], [6000, 'crackle']],
        prep: function (L) { locPrep('agata', L); },
        draw: function (t, k, now, L) {
          const q = ease(k);
          camIn(lerp(1.62, 1.85, q), lerp(80, 64, q), lerp(86, 92, q), function () {
            locDraw('agata', now, L, {
              mid: function () { LAVKA.npc(LOOKS.prohor, { x: 150, blink: blinkAt(now, 4100) }); },
              after: function () {
                const c = X(), burn = seg(t, 0, 10000);
                c.save(); P.arch(28, 84, 44, 34); c.clip();
                // книга долгов в огне: чёрный переплёт, толстый блок, страницы корчатся и тлеют по краям
                c.save(); c.translate(50, 112); c.rotate(-0.05);
                soft(0, 1, 18, 3, '0,0,0', 0.6);
                P.rr(-16, -5, 32, 6, 0.8, LG(0, -5, 0, 1, [0, '#2a0c0a', 1, '#080202'])); R(-16, -5, 32, 0.8, 'rgba(255,120,50,0.6)');
                R(-14.6, -9, 29.2, 4.2, LG(0, -9, 0, -4.8, [0, '#d8b080', 1, '#7a4a28'])); for (let i = 0; i < 6; i++) line(-14.6, -8.4 + i * 0.7, 14.6, -8.4 + i * 0.7, 'rgba(60,24,10,0.5)', 0.15);
                for (let i = 0; i < 7; i++) {
                  const ph = (now / 1300 + i * 0.29) % 1, a = -0.2 - burn * 0.5 - Math.sin(ph * Math.PI) * 0.9, bx = -12 + i * 4;
                  c.save(); c.translate(bx, -9); c.rotate(a);
                  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(2, -5, 0.6, -9 + burn * 3); c.lineTo(2.6, -8.6 + burn * 3); c.quadraticCurveTo(3.6, -4, 2.6, 0); c.closePath();
                  c.fillStyle = 'rgba(' + (220 - burn * 120 | 0) + ',' + (180 - burn * 130 | 0) + ',' + (130 - burn * 110 | 0) + ',0.95)'; c.fill();
                  c.strokeStyle = 'rgba(255,150,50,0.9)'; c.lineWidth = 0.35; c.beginPath(); c.moveTo(0.6, -9 + burn * 3); c.lineTo(2.6, -8.6 + burn * 3); c.stroke();
                  c.restore();
                }
                c.restore();
                for (let i = 0; i < 6; i++) { const x = 34 + i * 6.2, h = 7 + Math.sin(now / (60 + i * 13) + i) * 3 + Math.sin(now / 27 + i) * 1.2; c.beginPath(); c.moveTo(x - 2.4, 114); c.quadraticCurveTo(x - 1.6, 114 - h * 0.6, x + Math.sin(now / 80 + i) * 1.2, 114 - h); c.quadraticCurveTo(x + 1.6, 114 - h * 0.6, x + 2.4, 114); c.closePath(); c.fillStyle = RG(x, 112, 0, h, [0, 'rgba(255,240,190,0.9)', 0.4, 'rgba(255,160,60,0.75)', 1, 'rgba(200,50,10,0)']); c.fill(); }
                for (let i = 0; i < 5; i++) { const p = ((now / 2200 + i / 5) % 1); c.save(); c.translate(40 + i * 5 + p * 6, 102 - p * 20); c.rotate(p * 4); R(-1.2, -0.8, 2.4, 1.6, 'rgba(40,30,30,' + (0.8 * (1 - p)).toFixed(2) + ')'); E(0, 0, 0.6, 0.4, 'rgba(255,140,60,' + (0.8 * (1 - p)).toFixed(2) + ')'); c.restore(); }
                c.restore();
                gl(50, 104, 80, '255,120,40', 0.2 + Math.sin(now / 140) * 0.03);
                // Прохор: сидит у печи вполоборота, в картузе, тянет руки к огню
              } });
          });
        } },
      { d: 10500, cues: [[600, 'tick'], [900, 'chime'], [1300, 'tick'], [1900, 'tick'], [2500, 'tick']],
        prep: function (L) { locPrep('clock', L); },
        draw: function (t, k, now, L) {
          const q = ease(k), run = ease(seg(t, 500, 2000));
          camIn(1.46, lerp(140, 246, q), 74, function () {
            locDraw('clock', now, L, {
              back: function () {
                const c = X(), r = P.RNG(3);
                P.clocks.forEach(function (cl) { const sp = 0.3 + r() * 3, base = r() * 12; P.face(cl[0], cl[1], cl[2], { wood: cl[3] === 2, paper: cl[3] === 1 ? '#e0d8c0' : undefined, h: 2.75 + run * (base + now / 1000 * sp / 60), m: (45 + run * (base * 60 + now / 1000 * sp)) % 60 }); });
                P.face(192, 27, 9.6, { paper: '#e8dcbc', h: 2.75 + run * now / 600000, m: (45 + run * now / 10000) % 60 });
                [[24, 26], [363, 26]].forEach(function (cq, i) {
                  P.face(cq[0], cq[1], 10, { paper: '#ece2c8', h: 2.75 + run * (i * 5 + now / 300000), m: (45 + run * now / 5000 * (i + 1)) % 60 });
                  c.save(); c.beginPath(); c.rect(cq[0] - 10.6, 40.6, 21.2, 54.8); c.clip(); R(cq[0] - 11, 40, 22, 56, '#0c0602');
                  c.save(); c.translate(cq[0], 42); c.rotate(Math.sin(now / 520 + i) * 0.3 * run); R(-0.4, 0, 0.8, 40, P.brassG(-0.5, 0.5)); E(0, 42, 4.4, 4.4, P.brassG(-4.4, 4.4)); c.restore();
                  c.restore();
                });
              },
              after: function () { KN.lighter(function () { P.shaft(330, 0, 70, 250, 150, 200, '255,230,180', 0.1); }); P.motes(now, 0, 0, W, 120, 60, 9, '255,230,180', 0.5); } });
          });
        } },
      { d: 10500, cues: [[2200, 'glass']],
        prep: function (L) { L.day = once('s6_day_nosign', function () { return KN.s6Back({ day: 1, sign: false }); }); },
        draw: function (t, k, now, L) {
          const q = ease(k), sw = ease(seg(t, 2000, 5200)), pr = pv6, X6 = 5.2 - 0.08;
          camIn(lerp(1.08, 2.4, q), lerp(200, 280, q), lerp(100, 58, q), function () {
            const c = X(); c.drawImage(L.day, 0, 0, W, H);
            bloom(188, 96, 60, '255,230,190', 0.35);
            if (sw < 1) { c.save(); c.globalAlpha = 1 - sw; KN.wallText(pr, X6, 7.75, -1, -2.4, 0.52, 'ЛОМБАРД', 'bold', '#dcc386', 'rgba(4,14,10,0.9)', 0.05); c.restore(); }
            if (sw > 0) { c.save(); c.globalAlpha = sw; KN.wallText(pr, X6, 7.55, -1, -2.68, 0.25, 'ЧАСЫ · ПОЧИНКА', 'bold', '#ecd8a0', 'rgba(4,14,10,0.9)', 0.03); KN.wallText(pr, X6, 7.55, -1, -2.33, 0.25, 'ЗАКЛАД — ДАРОМ', 'bold', '#ecd8a0', 'rgba(4,14,10,0.9)', 0.03); c.restore(); }
            if (sw > 0.2 && sw < 0.9) { const p = pr(X6, -2.6, 7.6); gl(p[0], p[1], 14, '255,240,200', 0.5 * Math.sin((sw - 0.2) / 0.7 * Math.PI)); }
            chimneySmoke(now, 265, 26, 0.3);
            birds(now, 5, 60, 40, 22, -3, '#2a2a30', 0.9, 5);
            P.fog(96, 22, now, 3, 0.45, '250,228,216', 4);
          });
        } }
    ],
    ferry: [
      { d: 11500, cues: [[400, 'drip']],
        prep: function (L) {
          const dusk = once('t_dusk', function () { return KN.s5Above(); });
          L.ab = once('t_dusk_fade', function () { return layer(function () { const c = X(); c.drawImage(dusk, 0, 0, W, H); c.globalCompositeOperation = 'destination-in'; c.save(); c.translate(192, 136); c.scale(1, 0.42); c.fillStyle = RG(0, 0, 30, 175, [0, 'rgba(0,0,0,1)', 0.55, 'rgba(0,0,0,0.85)', 1, 'rgba(0,0,0,0)']); c.fillRect(-W, -H * 3, W * 2, H * 6); c.restore(); c.globalCompositeOperation = 'source-over'; }); });
          L.boat = once('boat', function () { return layer(function () { const c = X(); c.beginPath(); c.moveTo(10, 30); c.quadraticCurveTo(20, 48, 60, 50); c.lineTo(180, 50); c.quadraticCurveTo(214, 46, 226, 26); c.lineTo(214, 28); c.lineTo(16, 30); c.closePath(); c.fillStyle = LG(0, 26, 0, 50, [0, '#4a3420', 0.4, '#2a1a0c', 1, '#0a0604']); c.fill(); c.save(); c.clip(); for (let k = 0; k < 5; k++) line(0, 33 + k * 3.6, 240, 33 + k * 3.6 - 0.6, 'rgba(0,0,0,0.45)', 0.4); P.tex(0, 26, 240, 26, 0.4, 'overlay'); c.restore(); R(16, 27, 200, 3, LG(0, 27, 0, 30, [0, '#6a4a2a', 1, '#2a1a0a'])); line(16, 27.2, 216, 25.4, 'rgba(255,214,170,0.3)', 0.4); line(198, 28, 196, -6, '#2a1a0c', 1.4); line(196, -6, 190, -3, '#2a1a0c', 0.8); poly([186.4, 0, 193.6, 0, 192.8, 10, 187.2, 10], 'rgba(255,200,120,0.45)'); R(185.6, -2, 8.8, 2.2, '#151515'); R(186.4, 10, 7.2, 1.6, '#151515'); }, 240, 60); });
        },
        draw: function (t, k, now, L) {
          const c = X(), p = ease(k);
          R(0, 0, W, H, LG(0, 0, 0, 124, [0, '#080a18', 0.5, '#2a2440', 0.85, '#7a4a48', 1, '#a86a50']));
          const sc = lerp(0.62, 0.3, p), ox = lerp(92, 112, p);
          c.save(); c.translate(ox, 120); c.scale(sc, sc); c.translate(-W / 2, -150); c.drawImage(L.ab, 0, 0, W, H); c.restore();
          P.fog(70, 70, now, 3, 0.35 + p * 0.55, '150,154,168', 3);
          R(0, 120, W, 96, LG(0, 120, 0, 216, [0, '#20242c', 1, '#06080a']));
          c.save(); c.strokeStyle = 'rgba(170,185,195,0.1)'; c.lineWidth = 0.3; c.beginPath();
          for (let i = 0; i < 70; i++) { const y = 122 + (i * 3.7) % 90, x = ((i * 57 - now / (24 - (y - 120) / 6)) % (W + 40) + W + 40) % (W + 40) - 20; c.moveTo(x, y); c.lineTo(x + 6 + (y - 120) / 6, y); }
          c.stroke(); c.restore();
          const b = Math.sin(now / 1100) * 1.4, a = Math.sin(now / 1500) * 0.02;
          c.save(); c.translate(252, 160 + b); c.rotate(a); c.scale(1.25, 1.25);
          person(-80, 22, 76, { col: '#060708', hat: 'cap', long: true, rim: 'rgba(255,190,120,0.25)', rimDx: 0.8 });
          line(-72, -16, -50, 70, '#2a1a0e', 1.4);
          person(-20, 26, 46, { col: '#08090a', noArms: true, scarf: true, flip: true });
          c.drawImage(L.boat, -120, -22, 240, 60);
          P.flame(70, -14, 0.9, now, 12, '255,170,80', 0.16);
          c.restore();
          for (let i = 0; i < 10; i++) { const y = 190 + i * 2.4; soft(340 + Math.sin(now / 500 + i) * 1.4, y, 2 + i * 0.3, 0.5, '255,190,110', 0.3 - i * 0.025); }
          P.fog(150, 60, now, 8, 0.3, '150,154,168', 6);
        } },
      { d: 10500, cues: [[600, 'sip']],
        prep: function (L) {
          L.view = once('st_view', function () { const b = KN.s4Back(), f = KN.s4Front({ noHero: true }); return layer(function () { blurred(2.6, function () { const c = X(); c.drawImage(b, 0, 0, W, H); c.drawImage(f, 0, 0, W, H); }); }); });
          L.bf = once('buffet', function () { return buffetL(L.view); });
        },
        draw: function (t, k, now, L) {
          const q = ease(k);
          camIn(lerp(1.04, 1.18, q), lerp(206, 232, q), lerp(110, 126, q), function () {
            const c = X(); c.drawImage(L.bf, 0, 0, W, H);
            c.save(); c.beginPath(); c.rect(14, 0, 356, 126); c.clip();
            const off = ((t / 10500) * 520) - 140;
            for (let i = 0; i < 9; i++) { const x = 400 - off - i * 40; soft(x, 74, 14, 6, '255,200,130', 0.4); }
            for (let i = 0; i < 6; i++) { const p = ((now / 2600 + i / 6) % 1), x = 14 + hsh(i) * 356; line(x, p * 140 - 20, x + 0.4, p * 140 - 6, 'rgba(200,210,225,0.18)', 0.6); }
            c.restore();
            lighter(function () { for (let i = 0; i < 7; i++) { const p = ((now / 2800 + i / 7) % 1); soft(244 + Math.sin(now / 700 + i + p * 5) * 4 * p, 108 - p * 56, 3 + p * 9, 2 + p * 7, '240,240,235', 0.16 * (1 - p)); } });
            bloom(74, 112, 70, '255,180,110', 0.25 * (1 + Math.sin(now / 90) * 0.03));
          });
        } },
      { d: 10500, cues: [[5200, 'tick'], [5400, 'chime']],
        prep: function (L) { L.back = once('s4b', KN.s4Back); L.front = once('s4f_nohero', function () { return KN.s4Front({ noHero: true }); }); },
        draw: function (t, k, now, L) {
          const pr = KN.pv4, q = ease(k);
          camIn(lerp(1, 1.12, q), lerp(200, 226, q), lerp(104, 98, q), function () {
            const c = X(); c.drawImage(L.back, 0, 0, W, H); c.drawImage(L.front, 0, 0, W, H);
            KN.ZL4.forEach(function (z, i) { const p = pr(1.8, -2.0, z), s = 110 / z; bloom(p[0], p[1], (1.8 * s + 10) * (1 + Math.sin(now / (90 + i * 17) + i) * 0.06), '255,190,110', 0.55); });
            const cc = pr(1.8, -2.55, 12), s12 = 110 / 12, snap = t > 5200;
            P.face(cc[0], cc[1], 0.31 * s12, { plain: true, paper: '#e8dcbc', h: snap ? 2.75 : (2.75 + now / 300) % 12, m: snap ? 45 : (now / 20) % 60 });
            if (t > 5200 && t < 5600) gl(cc[0], cc[1], 10, '255,255,240', 0.4);
            const fp6 = pr(1.1, 1.5, 5.6), fs = 110 / 5.6;
            c.save(); c.translate(fp6[0], fp6[1]); c.transform(1, 0, 0.9, 0.34, 0, 0); c.scale(1, -1); c.globalAlpha = 0.62; person(0, 0, 1.75 * fs, { col: '#000', scarf: true }); c.restore();
            hero(fp6[0], fp6[1], 1.75 * fs, { rim: 'rgba(255,200,140,0.55)', rimDy: -1.4 });
            P.fog(54, 80, now, 3, 0.3, '150,148,150', 2);
            KN.rain(now, { n: 100, len: 3, spd: 0.16, a: 0.12, seed: 5, ang: -0.1, y1: 140 });
          });
        } },
      { d: 10500, cues: [[300, 'drip']],
        prep: function (L) { L.out = once('s1o', KN.s1Outside); L.room = once('s1r', KN.s1Room); L.desk = once('s1d', KN.s1Desk); },
        draw: function (t, k, now, L) {
          const q = ease(k), fl = 1 + Math.sin(now / 83) * 0.05;
          camIn(lerp(1, 1.16, q), lerp(192, 206, q), lerp(108, 150, q), function () {
            const c = X(); c.drawImage(L.out, 0, 0, W, H);
            c.save(); c.beginPath(); c.rect(KN.WN.x, KN.WN.y, KN.WN.w, KN.WN.h); c.clip(); KN.rain(now, { n: 80, len: 5, spd: 0.3, a: 0.14, seed: 2, ang: -0.12 }); c.restore();
            c.drawImage(L.room, 0, 0, W, H); c.drawImage(L.desk, 0, 0, W, H);
            c.save(); c.translate(200, 168); c.rotate(-0.07); R(-48, -3, 96, 6, '#0a0a0a'); R(-48, -3, 96, 1, 'rgba(255,255,255,0.15)'); c.restore();
            P.flame(314, 141.4, 2.0, now, 1, '255,150,60', 0); bloom(314, 136, 70, '255,160,80', 0.3 * fl);
          });
        } }
    ]
  };
  ENDS.keeper2 = [
    { d: 10000,
      prep: function (L) { L.room = once('room_night', function () { return roomL('night'); }); L.mode = 'night'; },
      draw: function (t, k, now, L) {
        const q = ease(k), a = 1 - ease(seg(t, 2400, 7000)), wp = pa(2.08, CT.y, 2.75), ws = sA(2.75), mc = pa(AX, MRA.y, MRA.z);
        camIn(lerp(2.0, 2.3, q), lerp(wp[0] - 6, mc[0] - 14, ease(seg(t, 5000, 9600))), lerp(wp[1] - 10, mc[1] + 8, ease(seg(t, 5000, 9600))), function () {
          roomF(t, now, L, { after: function () {
            if (a <= 0) return;
            const c = X(); c.save(); c.globalAlpha = a;
            soft(wp[0] + 2, wp[1] + 1, 0.12 * ws, 0.03 * ws, '0,0,0', 0.5);
            E(wp[0], wp[1], 0.085 * ws, 0.03 * ws, P.brassG(wp[0] - 0.085 * ws, wp[0] + 0.085 * ws)); E(wp[0], wp[1] - 0.004 * ws, 0.068 * ws, 0.022 * ws, '#ece4cc');
            c.strokeStyle = 'rgba(210,180,110,0.8)'; c.lineWidth = 0.3; c.beginPath(); c.moveTo(wp[0] + 0.085 * ws, wp[1]); c.quadraticCurveTo(wp[0] + 0.16 * ws, wp[1] + 0.03 * ws, wp[0] + 0.2 * ws, wp[1] + 0.005 * ws); c.stroke();
            gl(wp[0], wp[1], 0.1 * ws, '255,230,180', 0.25 * a);
            c.restore();
          } });
        });
      } },
    ENDS.keeper[1], ENDS.keeper[0], ENDS.keeper[3]
  ];

  /* ============================================================
     ЛАВКА КАК В ИГРЕ (js/lavka.js): интерьер и фасад той же планировки,
     персонажи — игровые, пиксельные. Эти планы заменяют прежние.
     ============================================================ */
  const LVS = LAVKA.LV;
  function lv(o) { LAVKA.reset(); Object.keys(o || {}).forEach(function (k) { LVS[k] = o[k]; }); }
  const HERO_LOOK = { skin: '#caa68a', coat: '#24262d', coat2: '#17181d', hair: '#2a1e16', hairStyle: 'short', hat: 'cap', hatCol: '#131317', scarf: '#6e2622', headW: 23, headH: 28, bodyW: 56, tall: 0 };
  const HERO_TOP = Object.assign({}, HERO_LOOK, { hat: 'tophat', hatCol: '#08080a', scarf: null, coat: '#0e0e12', coat2: '#c8c8c0' });
  const OLD_LOOK = Object.assign({}, HERO_LOOK, { skin: '#c4a48c', hair: '#c8c4bc', hat: 'none', beard: 'full', beardCol: '#d0cbc2', wrinkles: true, scarf: '#5a2420' });
  const BUYER_LOOK = { skin: '#d0b8a0', coat: '#2a2622', coat2: '#4a3a2a', hair: '#3a2a1a', hairStyle: 'short', hat: 'bowler', hatCol: '#16140f', beard: 'mustache', beardCol: '#3a2a1a', headW: 25, headH: 28, bodyW: 62, tall: -1 };
  function bellCurve(t, t0, dur) { return t > t0 && t - t0 < dur ? Math.sin((t - t0) / 55) * Math.exp(-(t - t0) / 520) * 0.9 : 0; }
  function blinkAt(now, per) { return (now % per) < 130; }
  /* отражение в зеркале лавки: игровой портрет, уменьшенный в раму */
  function mirrorBust(look, a, m, now) {
    if (a <= 0.01) return;
    const s = 0.42; LAVKA.npc(look, { x: 192, blink: blinkAt(now, 3900), tf: [m.cx - 192 * s, (m.cy - 21) - 55 * s, s], a: a * 0.78 });
    R(m.cx - m.rx, m.cy - m.ry, m.rx * 2, m.ry * 2, 'rgba(16,26,30,' + (0.28 * a).toFixed(3) + ')');
  }
  function padlock(x, y) {
    const c = X();
    c.strokeStyle = '#4a4a50'; c.lineWidth = 0.9; c.beginPath(); c.arc(x, y, 1.9, Math.PI, 0); c.stroke();
    P.rr(x - 2.8, y, 5.6, 4.6, 0.8, LG(x - 2.8, 0, x + 2.8, 0, [0, '#3a3a40', 0.45, '#8a8a92', 1, '#2a2a30'])); E(x, y + 2, 0.5, 0.9, '#0a0a0c');
  }
  function glassBell(sw) {
    const c = X(); c.save(); c.globalAlpha = 0.8; c.translate(236, 100.4); c.rotate(sw);
    line(0, 0, 0, 1.6, '#1a1410', 0.4);
    c.beginPath(); c.moveTo(-0.8, 1.6); c.bezierCurveTo(-1.2, 2.6, -1.4, 4, -2.2, 4.6); c.lineTo(2.2, 4.6); c.bezierCurveTo(1.4, 4, 1.2, 2.6, 0.8, 1.6); c.closePath();
    c.fillStyle = LG(-2.2, 0, 2.2, 0, [0, '#3a2a10', 0.4, '#d8b868', 1, '#2a1808']); c.fill(); c.restore();
  }
  /* туман, вползающий в открытую дверь и расползающийся по лавке (как в игре) */
  function roomFog(now, p) {
    if (p <= 0 || p >= 1) return;
    const a = Math.min(1, p * 6) * (1 - p) * (1 - p), spread = 30 + p * 150;
    for (let i = 0; i < 9; i++) { const ph = hsh(i * 3.1), x = 192 + (ph - 0.5) * spread * 2 + Math.sin(now / 900 + i) * 6, y = 82 + p * 22 + hsh(i + 7) * 30; soft(x, y, 26 + p * 30, 12 + p * 10, '170,182,184', 0.32 * a); }
  }
  /* тень в цилиндре висит на гвозде у двери — пиксельным силуэтом */
  function hangingShadow(now, flut) {
    const c = X(), nx = 142, ny = 23, sw = Math.sin(now / 1400) * 0.04 + flut * Math.sin(now / 160) * 0.05;
    E(nx, ny, 0.6, 0.6, '#7a7a80');
    c.save(); c.translate(nx, ny); c.rotate(sw); c.translate(-nx, -ny);
    LAVKA.pixels(function () {
      const r = Art.api.R, col = '#040707';
      r(nx - 1, ny, 2, 3, col); r(nx - 4, ny + 2, 9, 10, col); r(nx - 6, ny + 11, 13, 2, col);
      r(nx - 3, ny + 13, 7, 9, col); r(nx - 7, ny + 22, 15, 6, col); r(nx - 8, ny + 27, 17, 44, col); r(nx - 9, ny + 60, 19, 12, col);
    }, null, 0.72);
    c.restore();
  }
  let OFFC = null;
  /* кадр целиком во внекадровый холст — для наплыва двух разных декораций */
  function offscreen(fn) {
    if (!OFFC) OFFC = P.mkL();
    const x = OFFC.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, OFFC.width, OFFC.height); x.setTransform(KN.K, 0, 0, KN.K, 0, 0);
    P.into(OFFC, function () { KN.begin(); fn(); });
    KN.begin();
    return OFFC;
  }

  /* --- БЛАГОВЕСТ --- */
  ENDS.bell[1] = { d: 10000, cues: [[400, 'bigBell'], [3000, 'bigBell'], [5600, 'bigBell'], [8200, 'bigBell']],
    prep: function (L) { locPrep('facade_dawn', L); },
    draw: function (t, k, now, L) {
      const q = ease(k), pulse = [400, 3000, 5600, 8200].reduce(function (a, b) { return Math.max(a, t > b ? Math.max(0, 1 - (t - b) / 1400) : 0); }, 0);
      lv({ winWho: false, plate: 'Закрыто' });
      camIn(lerp(1.3, 1.62, q), lerp(212, 216, q), lerp(130, 140, q), function () {
        locDraw('facade_dawn', now, L, {
          mid: function () { LAVKA.matvey(213, 172, now); },
          after: function () {
            breath(220, 137, now, 0.3, 1);
            if (pulse > 0) { gl(70, 10, 260, '255,226,190', 0.07 * pulse); for (let i = 0; i < 3; i++) { const r = 20 + (1 - pulse) * 200 + i * 18; X().strokeStyle = 'rgba(255,240,215,' + (0.1 * pulse).toFixed(3) + ')'; X().lineWidth = 0.6; X().beginPath(); X().arc(40, -10, r, 0, 6.28); X().stroke(); } }
            P.fog(150, 60, now, 4, 0.28, '240,226,224', 3);
          } });
      });
    } };
  ENDS.bell[2] = { d: 9500, cues: [[800, 'coin']],
    prep: function (L) { locPrep('church', L); },
    draw: function (t, k, now, L) {
      const q = ease(k);
      camIn(lerp(1.12, 1.36, q), lerp(196, 212, q), lerp(88, 96, q), function () {
        locDraw('church', now, L, {
          mid: function () { LAVKA.npc(LOOKS.nikodim, { x: 192, blink: blinkAt(now, 4300) }); },
          front: function () { topHat(232, 112, 0.42, now); },
          after: function () {
            P.shaft(40, 50, 30, 150, 140, 90, '255,214,170', 0.18); P.shaft(344, 50, 30, 240, 140, 90, '255,214,170', 0.18);
            gl(232, 110, 16, '255,220,150', 0.14);
            P.motes(now, 40, 40, 300, 100, 50, 6, '255,230,190', 0.5);
          } });
      });
    } };
  ENDS.bell[3] = { d: 10500, cues: [[1800, 'click']],
    prep: function (L) { locPrep('facade_day', L); },
    draw: function (t, k, now, L) {
      const q = ease(k), p1 = seg(t, 2600, 4000), p2 = seg(t, 4000, 10500);
      lv({ winWho: false, plate: 'Закрыто' });
      camIn(lerp(1.18, 1.06, q), lerp(226, 214, q), lerp(128, 122, q), function () {
        locDraw('facade_day', now, L, {
          back: function () { if (t > 1800) padlock(243, 140); },
          mid: function () { const x = p1 < 1 ? lerp(238, 228, p1) : 228 + p2 * 210, y = lerp(172, 190, p1), mv = (p1 > 0 && p1 < 1) || p2 > 0; LAVKA.hero(x, y, p2 > 0 ? 1 : -1, (now / 650) % 1, mv, now); },
          after: function () { birds(now, 5, 40, 40, 20, -3, 'rgba(30,30,36,0.7)', 0.8, 2); if (t > 1800 && t < 2300) gl(243, 142, 6, '255,240,200', 0.5 * (1 - (t - 1800) / 500)); }
        });
      });
    } };
  /* --- РАССВЕТ --- */
  ENDS.dawn[0] = { d: 10500, cues: [[600, 'creak']],
    prep: function (L) { locPrep('lavka_dawn', L); },
    draw: function (t, k, now, L) {
      const q = ease(k);
      lv({ open: 0.5, lampOn: false, sconceOn: false, time: [6, 5], rain: false });
      camIn(lerp(1.04, 1.22, q), 192, lerp(96, 88, q), function () {
        locDraw('lavka_dawn', now, L, {
          mid: function () {
            for (let i = 0; i < 12; i++) {
              const ph = ((now / 6500 + hsh(i)) % 1), sx = hsh(i + 3) * 384, sy = 60 + hsh(i + 5) * 70, x = lerp(sx, 192, ph), y = lerp(sy, 84, ph), s = 1 - ph * 0.7;
              soft(x, y, 34 * s, 16 * s, '220,214,214', 0.3 * Math.sin(ph * Math.PI) * (1 - q * 0.6));
            }
          },
          front: function () { for (let i = 0; i < 7; i++) { const p = ((now / 3200 + i / 7) % 1); soft(57 + Math.sin(p * 6 + i) * 2 * p, 96 - p * 30, 0.8 + p * 4, 1 + p * 5, '200,196,196', 0.45 * (1 - p)); } }
        });
      });
      lighter(function () { R(0, 0, W, H, 'rgba(255,190,140,' + (0.03 + q * 0.06).toFixed(3) + ')'); });
    } };
  ENDS.dawn[1] = { d: 10000, cues: [[600, 'tick'], [1600, 'tick'], [2600, 'tick'], [3600, 'tick'], [4600, 'tick'], [5600, 'tick']],
    prep: function (L) { locPrep('facade_dawn', L); },
    draw: function (t, k, now, L) {
      const q = ease(k);
      lv({ winWho: false, plate: 'Закрыто' });
      camIn(lerp(1.85, 1.3, q), lerp(218, 214, q), lerp(134, 134, q), function () {
        locDraw('facade_dawn', now, L, { mid: function () { LAVKA.matvey(213, 172, now); }, after: function () { breath(220, 137, now, 0.3, 1); P.fog(150, 60, now, 4, 0.28, '240,226,224', 3); } });
      });
    } };
  ENDS.dawn[2] = { d: 10000, cues: [[2600, 'click'], [6200, 'bell']],
    prep: function (L) { locPrep('facade_dawn', L); },
    draw: function (t, k, now, L) {
      const q = ease(k), bend = t > 3400 && t < 5000 ? 3 : 0, leave = seg(t, 5300, 9800), sw = t > 6200 ? Math.sin((t - 6200) / 130) * 0.6 * Math.max(0, 1 - (t - 6200) / 2600) : 0;
      lv({ winWho: false, plate: 'Закрыто', doorWho: function () { glassBell(sw); } });
      camIn(lerp(1.9, 1.7, q), lerp(228, 224, q), lerp(138, 144, q), function () {
        locDraw('facade_dawn', now, L, {
          back: function () {
            if (t > 2600) padlock(243, 140);
            P.rr(214, 170.4, 28, 1.8, 0.4, '#3a2a1a'); for (let x = 215; x < 241; x += 1.6) line(x, 170.5, x + 0.3, 172.1, 'rgba(0,0,0,0.35)', 0.25);
            if (t > 4400) { E(216.6, 171.8, 1.3, 0.45, P.brassG(215.3, 217.9)); if (t < 5200) gl(216.6, 171.6, 4, '255,230,180', 0.5); }
          },
          mid: function () { const x = leave > 0 ? lerp(238, 150, leave) : 238, y = leave > 0 ? lerp(172 + bend, 190, Math.min(1, leave * 2.5)) : 172 + bend; LAVKA.hero(x, y, -1, (now / 650) % 1, leave > 0 && leave < 1, now); },
          after: function () { if (t > 2600 && t < 3100) gl(243, 142, 6, '255,240,200', 0.5 * (1 - (t - 2600) / 500)); P.fog(156, 60, now, 4, 0.26, '240,226,224', 3); }
        });
      });
    } };
  /* --- ХОЗЯИН ЛАВКИ --- */
  ENDS.keeper[1] = { d: 10500,
    prep: function (L) { L.n = {}; L.d = {}; locPrep('facade_night', L.n); locPrep('facade_day', L.d); },
    draw: function (t, k, now, L) {
      const cyc = (t / 2800) % 1, day = clamp(0.5 + Math.cos(cyc * Math.PI * 2) * 1.4);
      const night = function () { lv({ plate: 'Открыто' }); locDraw('facade_night', now, L.n, {}); };
      let off = null;
      if (day > 0.01 && day < 0.99) off = offscreen(function () { camIn(1.1, 200, 118, night); });
      camIn(1.1, 200, 118, function () {
        if (day <= 0.01) night();
        else { lv({ winWho: false, plate: 'Закрыто' }); locDraw('facade_day', now, L.d, {}); }
      });
      if (off) { const c = X(); c.save(); c.globalAlpha = 1 - day; c.drawImage(off, 0, 0, W, H); c.restore(); }
      for (let i = 0; i < 5; i++) { const x = ((t / 3 + i * 110) % 560) - 90; soft(x, 14 + (i % 3) * 9, 60, 7, day > 0.5 ? '255,255,255' : '30,40,44', 0.18); }
    } };
  ENDS.keeper[2] = { d: 10500, cues: [[5000, 'breath']],
    prep: function (L) { locPrep('lavka_night', L); },
    draw: function (t, k, now, L) {
      const q = ease(k), age = ease(seg(t, 2200, 8600));
      lv({ mirror: function (n, m) { mirrorBust(HERO_LOOK, 1 - age, m, now); mirrorBust(OLD_LOOK, age, m, now); } });
      camIn(lerp(2.3, 2.6, q), 270, lerp(62, 60, q), function () { locDraw('lavka_night', now, L, {}); });
    } };
  ENDS.keeper2[0] = { d: 10000,
    prep: function (L) { locPrep('lavka_night', L); },
    draw: function (t, k, now, L) {
      const a = 1 - ease(seg(t, 2400, 6600)), pan = ease(seg(t, 5000, 9600));
      lv({});
      camIn(2.2, lerp(206, 268, pan), lerp(124, 66, pan), function () {
        locDraw('lavka_night', now, L, { front: function () {
          if (a <= 0.01) return;
          const c = X(), x = 204, y = 131; c.save(); c.globalAlpha = a;
          P.softRect(x - 5, y + 0.6, 12, 2, 1, 0.4);
          E(x, y, 4.4, 1.8, P.brassG(x - 4.4, x + 4.4)); E(x, y - 0.3, 3.4, 1.3, '#ece4cc'); E(x, y - 0.3, 0.3, 0.2, '#2a1a0a');
          c.strokeStyle = 'rgba(210,180,110,0.8)'; c.lineWidth = 0.25; c.beginPath(); c.moveTo(x + 4.4, y); c.quadraticCurveTo(x + 8, y + 1.6, x + 11, y + 0.4); c.stroke(); E(x - 4.6, y - 0.4, 0.7, 0.6, P.brassG(x - 5.3, x - 3.9));
          gl(x, y, 6, '255,230,180', 0.2 * a); c.restore();
        } });
      });
    } };
  /* --- НОВЫЙ КРЕДИТОР --- */
  ENDS.creditor[2] = { d: 10500, cues: [[3600, 'bell'], [3700, 'door']],
    prep: function (L) { locPrep('lavka_night', L); },
    draw: function (t, k, now, L) {
      const q = ease(k), op = ease(seg(t, 3600, 5200)) * 0.9, out = seg(t, 4400, 6200);
      lv({ open: op, bell: bellCurve(t, 3600, 2400) });
      camIn(lerp(1.35, 1.55, q), lerp(186, 180, q), lerp(76, 78, q), function () {
        locDraw('lavka_night', now, L, {
          back: function () { hangingShadow(now, op); },
          mid: function () { if (out < 1) LAVKA.npc(HERO_TOP, { x: 192, dy: Math.round(out * 6), a: 1 - out, blink: blinkAt(now, 3300) }); roomFog(now, seg(t, 3600, 10500)); }
        });
      });
    } };
  /* --- ЗАЛОГ --- */
  ENDS.pawn[1] = { d: 10000,
    prep: function (L) { locPrep('lavka_dawn_doll', L); },
    draw: function (t, k, now, L) {
      const q = ease(seg(t, 1200, 8800));
      lv({ lampOn: false, sconceOn: false, time: [7, 10], rain: false });
      camIn(lerp(1.04, 2.4, q), lerp(192, 340, q), lerp(100, 44, q), function () {
        locDraw('lavka_dawn_doll', now, L, { after: function () { P.shaft(250, -10, 20, 352, 40, 26, '255,220,170', 0.24 * q); gl(352, 36, 12, '255,226,190', 0.3 * q); } });
      });
    } };
  ENDS.pawn[3] = { d: 9500, cues: [[1400, 'bell'], [1450, 'door']],
    prep: function (L) { locPrep('lavka_dawn', L); },
    draw: function (t, k, now, L) {
      const q = ease(k), op = ease(seg(t, 1400, 2400)) * 0.8 * (1 - ease(seg(t, 4400, 5400))), inn = ease(seg(t, 2700, 4300)), ap = seg(t, 1500, 2700);
      lv({ open: op, bell: bellCurve(t, 1400, 2600), lampOn: false, sconceOn: false, time: [7, 30], rain: false,
        doorWho: function () { if (inn < 0.6) LAVKA.pixels(function () { const r = Art.api.R, k2 = ease(ap), hg = 30 + k2 * 40, wd = 10 + k2 * 10; r(192 - wd / 2, 126 - hg, wd, hg, '#0a0d0d'); r(192 - wd / 4, 126 - hg - wd / 2, wd / 2, wd / 2, '#0a0d0d'); r(192 - wd / 3, 126 - hg - wd / 2 - 1, wd / 1.5, 1, '#0a0d0d'); }, null, 1 - inn); } });
      camIn(lerp(1.2, 1.42, q), 192, lerp(84, 80, q), function () {
        locDraw('lavka_dawn', now, L, { mid: function () { if (inn > 0) LAVKA.npc(BUYER_LOOK, { x: 192, dy: Math.round((1 - inn) * 8), a: inn, blink: blinkAt(now, 3700) }); roomFog(now, seg(t, 1500, 9500)); } });
      });
    } };
  /* --- ПУСТОЙ --- */
  ENDS.mad[0] = { d: 9500,
    prep: function (L) { locPrep('lavka_night', L); },
    draw: function (t, k, now, L) {
      const q = ease(k), z = lerp(1.25, 3.4, ease(seg(t, 300, 8200)));
      lv({ bell: Math.sin(now / 140) * 0.5 * (t > 500 ? 1 : 0) });
      camIn(z, lerp(200, 234, q), lerp(80, 36, q), function () {
        locDraw('lavka_night', now, L, { after: function () {
          const ring = 1 - seg(t, 2500, 6500);
          for (let i = 0; i < 4; i++) { const p = ((now / 900 + i / 4) % 1), r = 2 + p * 22; X().strokeStyle = 'rgba(255,230,190,' + (0.3 * (1 - p) * ring).toFixed(3) + ')'; X().lineWidth = 0.3; X().beginPath(); X().arc(234, 31, r, 0, 6.28); X().stroke(); }
        } });
      });
      desat(0.25 + q * 0.7);
      R(0, 0, W, H, 'rgba(14,14,16,' + (q * 0.35).toFixed(2) + ')');
    } };
  ENDS.mad[1] = { d: 10500, cues: [[4000, 'whisper']],
    prep: function (L) { locPrep('lavka_night', L); },
    draw: function (t, k, now, L) {
      const q = ease(k), fade = 1 - ease(seg(t, 1200, 6200));
      lv({ mirror: function (n, m) { mirrorBust(HERO_LOOK, fade, m, now); } });
      camIn(lerp(2.3, 2.55, q), 270, 60, function () { locDraw('lavka_night', now, L, {}); });
      desat(0.35);
    } };
  /* --- КВИТАНЦИЯ № 1 --- */
  ENDS.shadow[3] = { d: 10500, cues: [[2200, 'glass']],
    prep: function (L) { locPrep('facade_day_nosign', L); },
    draw: function (t, k, now, L) {
      const q = ease(k), sw = ease(seg(t, 2000, 5200));
      lv({ plate: 'Открыто' });
      camIn(lerp(1.15, 2.1, q), lerp(206, 194, q), lerp(118, 80, q), function () {
        locDraw('facade_day_nosign', now, L, {
          back: function () {
            const c = X(); c.save(); c.globalAlpha = 1 - sw; LAVKA.signText('ЛОМБАРД', now); c.restore();
            c.save(); c.globalAlpha = sw; LAVKA.signText('ЧАСЫ · ПОЧИНКА\nЗАКЛАД — ДАРОМ', now); c.restore();
            if (sw > 0.2 && sw < 0.9) gl(194, 74, 30, '255,240,200', 0.4 * Math.sin((sw - 0.2) / 0.7 * Math.PI));
          },
          mid: function () { LAVKA.hero(300, 190, -1, 0, false, now); },
          after: function () { birds(now, 5, 60, 30, 22, -3, 'rgba(30,30,36,0.7)', 0.9, 5); }
        });
      });
    } };
  ENDS.keeper2[1] = ENDS.keeper[1]; ENDS.keeper2[3] = ENDS.keeper[3];

  /* ---------- регистрация ---------- */
  Object.keys(ENDS).forEach(function (id) {
    Film.define(id, function () {
      const text = (typeof ENDINGS !== 'undefined' && ENDINGS[id]) ? ENDINGS[id].text : [];
      return ENDS[id].map(function (s, i) {
        const L = {};
        return { cap: text[i] || '', d: s.d, cues: s.cues, prep: function () { s.prep(L); }, draw: function (t, k, now) { KN.begin(); s.draw(t, k, now, L); } };
      });
    }, function () { Object.keys(CACHE).forEach(function (k) { delete CACHE[k]; }); });
  });
})();
