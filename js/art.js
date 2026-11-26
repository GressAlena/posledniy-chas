'use strict';
/* ============================================================
   ГРАФИКА: процедурный пиксель-арт 384x216.
   Лавка, посетители, иконки вещей, скримеры.
   ============================================================ */
const Art = (function () {
  const W = 384, H = 216;
  let cv, c, g;                 // g — текущий контекст, в который рисует R()
  let bg, fg, lightC, lightX, vig;

  const WIN = { x: 20, y: 26, w: 64, h: 68 };
  const DG = { x: 173, y: 28, w: 38, h: 30 };          // стекло двери
  const MIR = { cx: 270, cy: 58, rx: 17, ry: 29 };
  const CLK = { x: 103, y: 20, w: 26, h: 64, fx: 116, fy: 37 };
  const SHELF = { x: 304, y: 18, w: 76, h: 100, rows: [46, 78, 110] };
  const CY = 124;                                       // кромка прилавка
  const CX = 192;                                       // где стоит посетитель

  /* Состояние сцены — его меняет main.js */
  const S = {
    mode: 'title', minutes: 21 * 60 + 30, green: 0, greenTarget: 0, dark: 0, dawn: 0, lampOn: true,
    customer: null, bellT: -1e9, doorT: -1e9, knockT: -1e9, item: null,
    stock: [], slots: 8, sanity: 100, upg: {}, tea: 0, silver: false,
    win: null, mirror: { fog: 0, face: 0 }, screamer: null, loc: null, peek: null,
    mouse: { x: 192, y: 100 }, flash: 0, street: null, room: {}, roomHL: null, vision: null
  };

  /* ---------- утилиты ---------- */
  const shadeCache = {};
  function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function sh(h, f) {
    const k = h + '|' + f;
    if (shadeCache[k]) return shadeCache[k];
    if (h[0] !== '#') return h;
    const a = rgb(h), cl = function (v) { return Math.max(0, Math.min(255, Math.round(v * f))); };
    return (shadeCache[k] = 'rgb(' + cl(a[0]) + ',' + cl(a[1]) + ',' + cl(a[2]) + ')');
  }
  function mix(h1, h2, t) {
    const a = rgb(h1), b = rgb(h2);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }
  function R(x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function ell(x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); g.fill(); }
  function mk(w, h) { const k = document.createElement('canvas'); k.width = w; k.height = h; return k; }

  /* ============================================================
     ИКОНКИ ВЕЩЕЙ (сетка 14x14)
     ============================================================ */
  const ICON = {
    watch: function (r, a, b) { r(6, 0, 2, 2, a); r(4, 3, 6, 10, a); r(3, 4, 8, 8, a); r(2, 5, 10, 6, a); r(4, 5, 6, 6, b); r(5, 4, 4, 8, b); r(7, 6, 1, 3, '#222'); r(7, 8, 2, 1, '#222'); },
    wrist: function (r, a, b) { r(5, 0, 4, 14, a); r(5, 0, 1, 14, sh(a, 0.7)); r(3, 4, 8, 6, '#c9c9d2'); r(4, 5, 6, 4, b); r(7, 6, 1, 2, '#222'); r(7, 7, 2, 1, '#222'); },
    alarm: function (r, a, b) { r(3, 1, 3, 2, '#c9c9d2'); r(8, 1, 3, 2, '#c9c9d2'); r(3, 3, 8, 8, a); r(2, 4, 10, 6, a); r(4, 4, 6, 6, b); r(7, 5, 1, 3, '#222'); r(7, 7, 2, 1, '#222'); r(3, 11, 2, 2, '#333'); r(9, 11, 2, 2, '#333'); },
    mantel: function (r, a, b) { r(1, 11, 12, 2, a); r(2, 3, 10, 8, sh(a, 0.8)); r(4, 1, 6, 2, a); r(6, 0, 2, 1, a); r(5, 4, 4, 5, b); r(7, 5, 1, 2, '#222'); r(7, 6, 2, 1, '#222'); r(3, 10, 8, 1, a); },
    ring: function (r, a, b) { r(4, 5, 6, 1, a); r(3, 6, 1, 5, a); r(10, 6, 1, 5, sh(a, 0.7)); r(4, 11, 6, 1, sh(a, 0.7)); r(5, 2, 4, 3, b); r(5, 2, 1, 1, '#fff'); },
    chain: function (r, a) { for (let i = 0; i < 5; i++) { r(2 + i, 1 + i * 2, 1, 2, a); r(11 - i, 1 + i * 2, 1, 2, sh(a, 0.8)); } r(6, 10, 2, 3, a); r(6, 10, 1, 1, '#fff'); },
    brooch: function (r, a, b) { r(3, 4, 8, 6, a); r(4, 3, 6, 8, a); r(5, 5, 4, 4, b); r(5, 5, 1, 1, '#fff'); r(7, 7, 2, 2, sh(b, 0.7)); },
    earrings: function (r, a, b) { r(3, 1, 1, 4, a); r(10, 1, 1, 4, a); r(2, 5, 3, 3, b); r(9, 5, 3, 3, b); r(3, 9, 1, 2, b); r(10, 9, 1, 2, b); r(2, 5, 1, 1, '#fff'); r(9, 5, 1, 1, '#fff'); },
    book: function (r, a, b) { r(2, 1, 10, 12, a); r(2, 1, 2, 12, sh(a, 0.6)); r(11, 2, 1, 10, '#d8d0b8'); r(6, 5, 3, 3, b); r(5, 10, 5, 1, b); },
    bottle: function (r, a, b) { r(6, 0, 2, 1, '#8a6a4a'); r(6, 1, 2, 3, a); r(4, 4, 6, 9, a); r(5, 7, 4, 5, b); r(5, 5, 4, 2, '#e0d8c0'); r(4, 4, 1, 9, sh(a, 1.3)); },
    pouch: function (r, a, b) { r(6, 1, 2, 2, b); r(5, 3, 4, 1, b); r(4, 4, 6, 8, a); r(3, 6, 8, 5, a); r(6, 7, 2, 2, b); r(3, 6, 1, 5, sh(a, 1.3)); },
    horseshoe: function (r, a) { r(4, 1, 6, 2, a); r(3, 2, 2, 10, a); r(9, 2, 2, 10, sh(a, 0.8)); r(2, 11, 3, 1, a); r(9, 11, 3, 1, a); r(3, 5, 1, 1, '#111'); r(10, 5, 1, 1, '#111'); r(3, 8, 1, 1, '#111'); r(10, 8, 1, 1, '#111'); },
    cross: function (r, a) { r(6, 0, 2, 1, sh(a, 0.7)); r(6, 1, 2, 12, a); r(3, 4, 8, 2, a); r(6, 1, 1, 12, sh(a, 1.2)); },
    stone: function (r, a) { r(3, 4, 8, 7, a); r(4, 3, 6, 9, a); r(6, 6, 2, 3, '#0a0a0a'); r(4, 4, 2, 1, sh(a, 1.3)); r(9, 9, 2, 2, sh(a, 0.7)); },
    doll: function (r, a, b) { r(4, 0, 6, 2, '#3a2a1a'); r(5, 1, 4, 4, a); r(4, 1, 1, 4, '#3a2a1a'); r(9, 1, 1, 4, '#3a2a1a'); r(6, 3, 1, 1, '#111'); r(8, 3, 1, 1, '#111'); r(4, 5, 6, 7, b); r(3, 8, 8, 4, b); r(2, 6, 2, 3, a); r(10, 6, 2, 3, a); r(5, 12, 1, 2, a); r(8, 12, 1, 2, a); },
    box: function (r, a, b) { r(2, 4, 10, 2, sh(a, 1.3)); r(2, 6, 10, 6, a); r(2, 6, 10, 1, sh(a, 0.6)); r(6, 6, 2, 2, b); r(2, 12, 2, 1, sh(a, 0.6)); r(10, 12, 2, 1, sh(a, 0.6)); },
    raven: function (r, a, b) { r(3, 13, 8, 1, '#5a4030'); r(4, 5, 6, 6, a); r(8, 2, 4, 4, a); r(12, 4, 2, 1, '#3a3a3a'); r(10, 3, 1, 1, b || '#c8c8c8'); r(1, 8, 4, 2, a); r(6, 11, 1, 2, '#3a3a3a'); r(8, 11, 1, 2, '#3a3a3a'); r(5, 6, 3, 2, '#2a2a36'); },
    eye: function (r, a, b) { r(3, 4, 8, 6, a); r(4, 3, 6, 8, a); r(5, 5, 4, 4, b); r(6, 6, 2, 2, '#000'); r(5, 5, 1, 1, '#fff'); },
    mask: function (r, a) { r(3, 1, 8, 11, a); r(4, 12, 6, 1, a); r(4, 4, 2, 2, '#2a2a2a'); r(8, 4, 2, 2, '#2a2a2a'); r(6, 6, 2, 3, sh(a, 0.8)); r(5, 10, 4, 1, '#3a3a3a'); r(10, 2, 1, 9, sh(a, 0.8)); },
    amber: function (r, a, b) { r(3, 3, 8, 9, a); r(4, 2, 6, 11, a); r(5, 5, 4, 3, b); r(5, 8, 1, 2, b); r(8, 8, 1, 2, b); r(4, 3, 1, 2, '#f8d070'); },
    lamp: function (r, a, b) { r(6, 0, 2, 2, a); r(5, 2, 4, 6, '#506068'); r(6, 4, 2, 3, b); r(5, 8, 4, 3, a); r(4, 11, 6, 2, sh(a, 0.8)); },
    spoons: function (r, a) { for (let i = 0; i < 3; i++) { r(2 + i * 4, 1, 2, 4, a); r(3 + i * 4, 5, 1, 8, sh(a, 0.85)); r(2 + i * 4, 1, 1, 1, '#fff'); } },
    candle: function (r, a, b) { r(6, 0, 2, 2, '#ffb040'); r(6, 2, 2, 4, b); r(4, 6, 6, 1, a); r(6, 7, 2, 5, a); r(4, 12, 6, 1, sh(a, 0.8)); },
    razor: function (r, a, b) { r(2, 4, 9, 3, a); r(2, 6, 9, 1, '#fff'); r(8, 7, 5, 3, b); r(8, 7, 1, 1, '#c8a040'); },
    umbrella: function (r, a, b) { r(4, 1, 6, 2, a); r(2, 3, 10, 3, a); r(2, 6, 2, 1, a); r(6, 6, 2, 1, a); r(10, 6, 2, 1, a); r(7, 6, 1, 6, b); r(5, 12, 3, 1, b); r(5, 11, 1, 1, b); },
    ward: function (r, a, b) { r(4, 1, 6, 2, a); r(3, 2, 2, 10, a); r(9, 2, 2, 10, sh(a, 0.8)); r(2, 11, 3, 1, a); r(9, 11, 3, 1, a); r(6, 4, 2, 9, b); r(5, 6, 4, 2, b); },
    lantern: function (r, a, b) { r(6, 0, 2, 1, a); r(5, 1, 4, 1, a); r(4, 2, 6, 1, a); r(4, 3, 1, 8, a); r(9, 3, 1, 8, sh(a, 0.8)); r(5, 3, 4, 8, '#506068'); r(6, 5, 2, 4, b); r(3, 11, 8, 2, sh(a, 0.8)); },
    cane: function (r, a, b) { r(3, 1, 4, 1, a); r(3, 1, 1, 3, a); r(6, 1, 1, 12, a); r(7, 3, 1, 7, b); r(7, 3, 1, 1, '#fff'); r(6, 12, 1, 1, '#8a6a2a'); },
    theatre: function (r, a, b) { r(1, 2, 12, 11, a); r(2, 3, 10, 9, '#1a1014'); r(1, 2, 12, 1, sh(a, 1.4)); r(2, 3, 2, 9, sh(a, 0.8)); r(10, 3, 2, 9, sh(a, 0.8)); r(6, 5, 2, 2, b); r(5, 7, 4, 4, b); r(6, 6, 1, 1, '#111'); r(4, 8, 1, 2, b); r(9, 8, 1, 2, b); },
    tongue: function (r, a, b) { r(6, 0, 2, 2, b); r(6, 2, 2, 7, a); r(5, 8, 4, 2, a); r(4, 10, 6, 3, a); r(5, 13, 4, 1, a); r(4, 10, 1, 3, b); },
    kit: function (r, a, b) { r(5, 2, 4, 1, b); r(5, 2, 1, 2, b); r(8, 2, 1, 2, b); r(1, 4, 12, 8, a); r(1, 4, 12, 1, sh(a, 1.4)); r(6, 7, 2, 2, b); r(1, 11, 12, 1, sh(a, 0.6)); },
    key: function (r, a, b) { r(1, 4, 5, 6, a); r(2, 5, 3, 4, b); r(6, 6, 7, 2, a); r(6, 7, 7, 1, sh(a, 0.7)); r(9, 8, 1, 3, a); r(11, 8, 2, 3, a); r(1, 4, 5, 1, sh(a, 1.3)); },
    ticket: function (r, a, b) { r(2, 1, 10, 12, a); r(2, 1, 10, 1, sh(a, 1.12)); r(11, 1, 1, 12, sh(a, 0.8)); r(4, 3, 6, 1, b); r(4, 5, 6, 1, b); r(4, 7, 5, 1, b); r(4, 9, 3, 1, b); r(8, 9, 3, 3, '#8a2a20'); },
    shovel: function (r, a, b) { r(6, 0, 2, 8, a); r(4, 0, 6, 1, a); r(4, 8, 6, 4, b); r(5, 12, 4, 1, b); r(6, 13, 2, 1, b); r(4, 8, 1, 4, sh(b, 1.3)); },
    scroll: function (r, a, b) { r(3, 2, 8, 10, a); r(2, 1, 10, 2, sh(a, 0.8)); r(2, 11, 10, 2, sh(a, 0.8)); r(4, 5, 6, 1, b); r(4, 7, 5, 1, b); r(4, 9, 6, 1, b); },
    locket: function (r, a, b) { r(6, 0, 2, 1, a); r(5, 1, 1, 2, a); r(8, 1, 1, 2, a); r(4, 4, 6, 8, a); r(5, 3, 4, 10, a); r(6, 6, 3, 2, b); r(5, 7, 1, 1, b); r(8, 8, 1, 2, b); r(4, 4, 1, 3, '#fff'); }
  };
  function drawIcon(spec, x, y, s) {
    const f = ICON[spec[0]]; if (!f) return;
    f(function (rx, ry, rw, rh, col) { R(x + rx * s, y + ry * s, rw * s, rh * s, col); }, spec[1], spec[2]);
  }
  const iconCache = {};
  function icon(spec) {
    const k = spec.join('|');
    if (iconCache[k]) return iconCache[k];
    const k2 = mk(14, 14), old = g;
    g = k2.getContext('2d'); drawIcon(spec, 0, 0, 1); g = old;
    return (iconCache[k] = k2.toDataURL());
  }

  /* ============================================================
     СТАТИЧНЫЕ СЛОИ
     ============================================================ */
  function buildLayers() {
    bg = mk(W, H); fg = mk(W, H); lightC = mk(W, H); lightX = lightC.getContext('2d'); vig = mk(W, H);
    g = bg.getContext('2d');
    // ---- обои: тёмно-зелёный дамаск в полоску, выцветший
    R(0, 0, W, 104, '#202d29');
    for (let x = 0; x < W; x += 16) { R(x, 0, 1, 104, '#1a2522'); R(x + 8, 0, 1, 104, '#25332e'); }
    const DM = ['..#..', '.#.#.', '#.#.#', '.#.#.', '..#..', '..#..', '.###.'];
    for (let y = 20, row = 0; y < 98; y += 14, row++) for (let x = (row % 2) * 8 + 2; x < W; x += 16) {
      DM.forEach(function (ln, r) { for (let k = 0; k < 5; k++) if (ln[k] === '#') R(x + k, y + r, 1, 1, '#2b3b35'); });
    }
    // тень под потолком, карниз
    const cg = g.createLinearGradient(0, 14, 0, 40); cg.addColorStop(0, 'rgba(0,0,0,0.45)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = cg; g.fillRect(0, 14, W, 26);
    R(0, 12, W, 5, '#2a1c13'); R(0, 12, W, 1, '#3e2a1c'); R(0, 16, W, 1, '#0e0906');
    // потёки сырости и пятна
    g.fillStyle = 'rgba(10,16,14,0.32)';
    [[136, 17, 6, 40], [240, 17, 5, 60], [8, 17, 6, 26], [150, 17, 3, 70], [292, 17, 4, 34]].forEach(function (a) { g.fillRect(a[0], a[1], a[2], a[3]); g.fillRect(a[0] + 1, a[1] + a[3], a[2] - 2, 6); });
    [[60, 22, 18], [246, 30, 14], [140, 80, 12]].forEach(function (q) {
      const sg = g.createRadialGradient(q[0], q[1], 1, q[0], q[1], q[2]); sg.addColorStop(0, 'rgba(60,50,30,0.22)'); sg.addColorStop(1, 'rgba(60,50,30,0)');
      g.fillStyle = sg; g.fillRect(q[0] - q[2], q[1] - q[2], q[2] * 2, q[2] * 2);
    });
    // отклеившийся угол обоев
    R(132, 17, 10, 6, '#4a4438'); R(133, 18, 6, 3, '#56503f');
    for (let r = 0; r < 6; r++) R(142 - r, 17 + r, r + 1, 1, '#34463e');
    R(136, 23, 7, 1, '#0e1412');
    // ---- нижние панели (филёнки) и поручень
    R(0, 100, W, 26, '#2b1e17');
    R(0, 100, W, 4, '#3a281b'); R(0, 100, W, 1, '#55402c'); R(0, 103, W, 1, '#1a100a');
    for (let x = -10; x < W; x += 40) {
      R(x + 4, 107, 32, 15, '#1e140e'); R(x + 5, 108, 30, 13, '#30221a');
      R(x + 5, 108, 30, 1, '#45311f'); R(x + 5, 108, 1, 13, '#3c2a1c'); R(x + 5, 120, 30, 1, '#1a110b'); R(x + 34, 108, 1, 13, '#1a110b');
      R(x + 8, 111, 24, 7, '#2c1f17');
    }
    // ---- дверь в наличнике
    R(151, 13, 82, 3, '#3a281b'); R(151, 13, 82, 1, '#55402c');
    R(153, 16, 78, 110, '#2e1f15'); R(153, 16, 1, 110, '#45301f'); R(230, 16, 1, 110, '#1a110c');
    R(154, 16, 6, 5, '#3a281b'); R(224, 16, 6, 5, '#3a281b'); R(156, 17, 2, 2, '#55402c'); R(226, 17, 2, 2, '#55402c');   // розетки
    R(157, 17, 70, 109, '#120c09'); R(161, 21, 62, 105, '#2a1c15');
    R(161, 21, 1, 105, '#3a281d'); R(222, 21, 1, 105, '#1a110c');
    R(170, 25, 44, 36, '#1a110c'); R(170, 25, 44, 1, '#3e2a1e'); R(170, 60, 44, 1, '#0e0806'); R(171, 26, 42, 34, '#120c09');
    [166, 194].forEach(function (px) {
      R(px, 69, 24, 52, '#1e140e'); R(px + 2, 71, 20, 48, '#2e2016');
      R(px + 2, 71, 20, 1, '#40301f'); R(px + 2, 71, 1, 48, '#3a2a1c'); R(px + 2, 118, 20, 1, '#160e09'); R(px + 21, 71, 1, 48, '#1a110b');
      R(px + 5, 74, 14, 42, '#291b13');
    });
    R(161, 122, 62, 4, '#33231a'); R(161, 122, 62, 1, '#45301f');
    R(163, 76, 4, 13, '#6a4c1e'); R(163, 76, 1, 13, '#a8823a'); R(162, 80, 7, 2, '#b8923e'); R(162, 80, 2, 1, '#f0d890'); R(164, 85, 1, 2, '#0a0604');
    R(198, 63, 16, 5, '#202624'); R(198, 63, 16, 1, '#3a4240'); R(184, 64, 16, 3, '#2e3432'); R(184, 64, 16, 1, '#4a5452'); R(186, 62, 2, 2, '#2e3432');  // засов
    // кронштейн колокольчика
    R(226, 24, 9, 1, '#5a4a2a'); R(226, 24, 1, 5, '#5a4a2a'); R(234, 24, 1, 3, '#5a4a2a');
    // ---- окно: наличник, переплёт, подоконник
    R(12, 18, 80, 82, '#2e1f15'); R(12, 18, 80, 1, '#45301f'); R(12, 18, 1, 82, '#3e2a1c');
    R(15, 21, 74, 78, '#120c09'); R(17, 23, 70, 73, '#3a2818'); R(17, 23, 70, 1, '#4e3826');
    R(9, 95, 86, 4, '#3d2b20'); R(9, 95, 86, 1, '#5a3f2e'); R(10, 99, 84, 1, '#1a110b'); R(16, 100, 72, 3, '#33231a');
    // зонт на крючке у окна
    R(3, 28, 4, 2, '#8a6a2a'); R(5, 30, 1, 3, '#3a2a1a'); R(4, 33, 1, 1, '#3a2a1a');
    for (let r = 0; r < 30; r++) { const wd = r < 4 ? 2 : r < 26 ? 4 - Math.floor(r / 12) : 2; R(5 - Math.floor(wd / 2), 34 + r, wd, 1, '#14181c'); }
    R(5, 64, 1, 4, '#6a6a70'); R(4, 40, 1, 18, '#262c32');
    // ---- часы в резном футляре
    R(101, 16, 30, 4, '#3a281b'); R(101, 16, 30, 1, '#55402c');
    for (let r = 0; r < 4; r++) { R(101 + r, 16 - r - 1, 6, 1, '#3a281b'); R(125 - r, 16 - r - 1, 6, 1, '#3a281b'); }
    R(114, 12, 4, 4, '#8a6a2a'); R(115, 11, 2, 1, '#c8a650'); R(102, 13, 2, 3, '#8a6a2a'); R(128, 13, 2, 3, '#8a6a2a');
    R(103, 20, 26, 64, '#2a1b12'); R(103, 20, 3, 64, '#3a281b'); R(104, 20, 1, 64, '#4a3422'); R(126, 20, 3, 64, '#1c120c');
    R(105, 25, 22, 24, '#1e140d'); [[106, 26], [124, 26], [106, 46], [124, 46]].forEach(function (q) { R(q[0], q[1], 2, 2, '#8a6a2a'); });
    ell(CLK.fx, CLK.fy, 10.5, 10.5, '#5e4620'); ell(CLK.fx, CLK.fy, 10, 10, '#b08a3a'); ell(CLK.fx, CLK.fy, 9, 9, '#d9cfb2');
    ell(CLK.fx - 2, CLK.fy - 2, 5, 5, 'rgba(255,255,240,0.18)');
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6, big = i % 3 === 0;
      g.fillStyle = big ? '#2a2018' : '#5a5040';
      g.fillRect(Math.round(CLK.fx + Math.sin(a) * 7.4 - 0.5), Math.round(CLK.fy - Math.cos(a) * 7.4 - 0.5), big ? 2 : 1, big ? 2 : 1);
    }
    R(106, 50, 20, 32, '#3a281b'); R(106, 50, 20, 1, '#4e3826'); R(108, 52, 16, 28, '#0e0906');
    [[110, 58], [121, 61]].forEach(function (q) { R(q[0], 52, 1, q[1] - 52, '#5a4a2a'); R(q[0] - 1, q[1], 3, 9, '#8a6a2a'); R(q[0] - 1, q[1], 1, 9, '#c8a650'); });   // гири
    R(103, 82, 26, 4, '#3a281b'); R(103, 82, 26, 1, '#4e3826'); R(111, 86, 10, 3, '#2a1b12'); R(114, 89, 4, 2, '#8a6a2a');
    // ---- свидетельство в рамке и отрывной календарь
    R(134, 32, 16, 21, '#2a1b12'); R(134, 32, 16, 1, '#4a3422'); R(136, 34, 12, 17, '#c4b896');
    for (let k = 0; k < 5; k++) R(138, 37 + k * 2, 4 + (k * 3) % 5, 1, '#7a7260');
    R(138, 47, 2, 2, '#8a2a20'); R(144, 46, 3, 3, '#9a8a50');
    R(139, 60, 1, 2, '#5a4a2a'); R(136, 62, 10, 3, '#7a2a20'); R(136, 65, 10, 11, '#d2c8a8'); R(137, 75, 8, 1, '#b8ae8e');   // число рисуется каждый кадр
    // ---- фотография в овальном паспарту
    R(234, 40, 12, 16, '#2a1b12'); R(234, 40, 12, 1, '#4a3422'); R(235, 41, 10, 14, '#141010');
    ell(240, 48, 4, 6, '#6e5e46'); R(238, 46, 2, 2, '#3a3024'); R(241, 45, 2, 3, '#3a3024'); R(237, 49, 4, 5, '#2e261c'); R(240, 48, 4, 6, '#3a3024');
    // ---- зеркало в золочёной раме с гребешком
    ell(MIR.cx + 2, MIR.cy + 3, MIR.rx + 6, MIR.ry + 6, 'rgba(0,0,0,0.35)');
    ell(MIR.cx, MIR.cy, MIR.rx + 6, MIR.ry + 6, '#2a2010'); ell(MIR.cx, MIR.cy, MIR.rx + 5, MIR.ry + 5, '#7a6230');
    ell(MIR.cx, MIR.cy, MIR.rx + 3.5, MIR.ry + 3.5, '#a88a40'); ell(MIR.cx, MIR.cy, MIR.rx + 2, MIR.ry + 2, '#5a4820'); ell(MIR.cx, MIR.cy, MIR.rx + 1, MIR.ry + 1, '#2e2410');
    for (let k = 0; k < 30; k++) {
      const a = k / 30 * Math.PI * 2, bx = MIR.cx + Math.cos(a) * (MIR.rx + 4.2), by = MIR.cy + Math.sin(a) * (MIR.ry + 4.2);
      R(Math.round(bx), Math.round(by), 1, 1, k % 2 ? '#6a5424' : (Math.sin(a) < 0 && Math.cos(a) < 0.3 ? '#f0d890' : '#d0b060'));
    }
    const ct = MIR.cy - MIR.ry - 5;
    [3, 5, 7, 9, 11].forEach(function (wd, r) { R(MIR.cx - Math.floor(wd / 2), ct - 5 + r, wd, 1, '#a88a40'); });
    for (let k = -4; k <= 4; k += 2) R(MIR.cx + k, ct - 3, 1, 3, '#6a5424');
    R(MIR.cx - 1, ct - 7, 3, 2, '#d0b060');
    [-1, 1].forEach(function (d) { R(MIR.cx + d * 7 - (d < 0 ? 2 : 0), ct - 1, 3, 2, '#8a7236'); R(MIR.cx + d * 10 - (d < 0 ? 1 : 0), ct - 3, 2, 2, '#8a7236'); R(MIR.cx + d * 11, ct - 5, 1, 2, '#8a7236'); });
    const cb = MIR.cy + MIR.ry + 5;
    [9, 7, 5, 3].forEach(function (wd, r) { R(MIR.cx - Math.floor(wd / 2), cb + r, wd, 1, r ? '#8a7236' : '#a88a40'); });
    R(MIR.cx, MIR.cy - MIR.ry - 16, 1, 5, '#1a1410');
    // ---- бра со свечой между зеркалом и витриной
    R(296, 46, 3, 9, '#6a4c1e'); R(296, 46, 1, 9, '#a8823a'); R(297, 50, 4, 1, '#8a6a2a'); R(298, 45, 5, 2, '#8a6a2a'); R(298, 45, 5, 1, '#c8a650');
    R(299, 38, 3, 7, '#e2d8bc'); R(299, 38, 1, 7, '#f4ecd4'); R(301, 41, 1, 3, '#cfc4a4');
    // ---- витрина-шкаф: карниз, стойки, стеклянные дверцы
    R(SHELF.x - 5, SHELF.y - 6, SHELF.w + 10, SHELF.h + 12, '#1c120c');
    R(SHELF.x - 6, SHELF.y - 6, SHELF.w + 12, 4, '#3a281b'); R(SHELF.x - 6, SHELF.y - 6, SHELF.w + 12, 1, '#55402c');
    for (let x = SHELF.x - 4; x < SHELF.x + SHELF.w + 4; x += 4) R(x, SHELF.y - 2, 2, 1, '#2a1b12');
    R(SHELF.x - 4, SHELF.y - 1, 4, SHELF.h + 3, '#33221a'); R(SHELF.x - 4, SHELF.y - 1, 1, SHELF.h + 3, '#4a3422');
    R(SHELF.x + SHELF.w, SHELF.y - 1, 4, SHELF.h + 3, '#2a1b12');
    R(SHELF.x, SHELF.y, SHELF.w, SHELF.h, '#130d09');
    for (let x = SHELF.x + 8; x < SHELF.x + SHELF.w; x += 9) R(x, SHELF.y, 1, SHELF.h, '#0f0a07');
    SHELF.rows.forEach(function (y) { R(SHELF.x, y, SHELF.w, 3, '#3d2b1e'); R(SHELF.x, y, SHELF.w, 1, '#5a4030'); R(SHELF.x, y + 3, SHELF.w, 1, '#0a0604'); });
    R(SHELF.x + 36, SHELF.y, 3, SHELF.h, '#2a1b12'); R(SHELF.x + 36, SHELF.y, 1, SHELF.h, '#3a281b');                    // средняя стойка дверец
    R(SHELF.x + 37, SHELF.y + 44, 1, 2, '#c8a650');
    R(SHELF.x - 5, SHELF.y + SHELF.h + 2, SHELF.w + 10, 4, '#2a1b12'); R(SHELF.x - 5, SHELF.y + SHELF.h + 2, SHELF.w + 10, 1, '#3e2a1c');
    // ---- передний план: прилавок из досок
    g = fg.getContext('2d');
    R(0, CY, W, 17, '#4b3524');
    for (let b = 0; b < 4; b++) {
      const y0 = CY + 1 + b * 4;
      for (let x = 0; x < W;) {
        const len = 70 + Math.floor(hsh(x + b * 31, 131) * 90), v = hsh(x + b * 7, 132);
        R(x, y0, len, 4, v > 0.66 ? '#4e3826' : v > 0.33 ? '#483222' : '#523b28');
        R(x, y0 + 3, len, 1, '#3a281b'); R(x + len - 1, y0, 1, 4, '#2e2016');
        x += len;
      }
    }
    g.fillStyle = 'rgba(40,26,16,0.5)';
    for (let i = 0; i < 40; i++) { const x = Math.floor(hsh(i, 133) * W), y = CY + 2 + Math.floor(hsh(i, 134) * 13); g.fillRect(x, y, 6 + Math.floor(hsh(i, 135) * 18), 1); }
    [[88, CY + 6], [228, CY + 10], [330, CY + 13]].forEach(function (q) { ell(q[0], q[1], 3, 1.5, '#33241a'); ell(q[0], q[1], 1.5, 0.8, '#4b3524'); });   // сучки
    g.fillStyle = 'rgba(255,220,170,0.05)'; g.fillRect(150, CY + 1, 90, 15);                                                   // вытерто руками
    g.strokeStyle = 'rgba(30,18,10,0.45)'; g.lineWidth = 1; g.beginPath(); g.ellipse(114, CY + 10, 5, 2, 0, 0, Math.PI * 2); g.stroke();   // след от стакана
    g.fillStyle = 'rgba(255,230,190,0.08)'; for (let i = 0; i < 8; i++) g.fillRect(140 + i * 23, CY + 4 + (i * 5) % 9, 3, 1);       // царапины
    R(0, CY, W, 1, '#6e5038');
    R(0, CY + 16, W, 1, '#7a5a3e'); R(0, CY + 17, W, 2, '#3a281b'); R(0, CY + 19, W, 1, '#120a06');
    R(0, CY + 20, W, H - CY - 20, '#2a1c14');
    for (let x = 12; x < W; x += 60) { R(x, CY + 26, 48, 60, '#241810'); R(x, CY + 26, 48, 1, '#35251a'); R(x, CY + 26, 1, 60, '#33231a'); }
    // счёты
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(6, CY + 15, 40, 2);
    R(4, CY + 1, 42, 15, '#3a2414'); R(4, CY + 1, 42, 1, '#6a4a2c'); R(4, CY + 1, 1, 15, '#5a3c22'); R(4, CY + 15, 42, 1, '#1a1008');
    R(6, CY + 3, 38, 11, '#1a1008');
    for (let r = 0; r < 4; r++) {
      const y = CY + 4 + r * 3, moved = [3, 6, 1, 4][r];
      R(6, y, 38, 1, '#5a5a52');
      for (let k = 0; k < 10; k++) {
        const bx = 7 + k * 3 + (k >= 10 - moved ? 6 : 0);                                   // откинутые косточки
        if (bx > 41) continue;
        const dark = k === 4 || k === 5;
        R(bx, y - 1, 2, 2, dark ? '#4a2210' : '#c08a44'); R(bx, y - 1, 1, 1, dark ? '#6a3a20' : '#eab872');
      }
    }
    // керосиновая лампа
    R(48, CY - 1, 18, 2, '#6a4c1e'); R(48, CY - 1, 18, 1, '#a8823a');
    [6, 10, 12, 12, 12, 8].forEach(function (wd, r) { const x = 57 - wd / 2; R(x, CY - 7 + r, wd, 1, r < 2 ? '#a8843a' : '#8a6a2a'); R(x, CY - 7 + r, 1, 1, '#d0aa56'); R(x + wd - 1, CY - 7 + r, 1, 1, '#5a4418'); });
    R(51, CY - 9, 12, 2, '#7a5c24'); R(51, CY - 9, 12, 1, '#b8923e'); R(63, CY - 9, 2, 2, '#c8a650');
    [6, 6, 6, 6, 6, 8, 10, 10, 10, 10, 10, 10, 10, 10, 8, 8].forEach(function (wd, r) {
      const x = 57 - wd / 2, y = CY - 25 + r;
      g.fillStyle = 'rgba(170,200,210,0.15)'; g.fillRect(x, y, wd, 1);
      g.fillStyle = 'rgba(235,245,245,0.3)'; g.fillRect(x, y, 1, 1);
      g.fillStyle = 'rgba(235,245,245,0.12)'; g.fillRect(x + wd - 1, y, 1, 1);
    });
    g.fillStyle = 'rgba(20,16,12,0.3)'; g.fillRect(54, CY - 25, 6, 2);
    R(55, CY - 27, 4, 2, '#7a5c24');
    // касса: открытая шкатулка с монетами и ассигнациями
    R(258, CY - 6, 30, 10, '#22160e'); R(258, CY - 6, 30, 1, '#8a6a2a'); R(260, CY - 4, 26, 7, '#2e1e12');
    R(258, CY + 4, 30, 9, '#2a1c12'); R(258, CY + 4, 30, 1, '#4a3220'); R(260, CY + 5, 26, 6, '#1a110b');
    [[258, CY + 4], [286, CY + 4], [258, CY + 11], [286, CY + 11]].forEach(function (q) { R(q[0], q[1], 2, 2, '#b8923e'); });
    R(272, CY + 5, 1, 6, '#2a1c12');
    [[262, CY + 6], [266, CY + 7], [263, CY + 8]].forEach(function (q) { R(q[0], q[1], 4, 2, '#d8b040'); R(q[0], q[1], 4, 1, '#f0d070'); });
    R(275, CY + 6, 9, 4, '#a8b898'); R(276, CY + 7, 7, 1, '#7a8a6a'); R(277, CY + 9, 8, 2, '#c8b8a0');
    // раскрытый гроссбух
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(313, CY + 13, 44, 2);
    R(312, CY + 3, 44, 11, '#3a1a14'); R(312, CY + 3, 44, 1, '#5a2a20');
    R(315, CY + 2, 19, 10, '#d8ceb0'); R(335, CY + 2, 19, 10, '#d0c6a6'); R(333, CY + 2, 2, 10, '#9a8a66'); R(315, CY + 2, 19, 1, '#ece2c4');
    for (let i = 0; i < 4; i++) { R(317, CY + 4 + i * 2, 8 + (i * 5) % 7, 1, '#6a6050'); R(337, CY + 4 + i * 2, 6 + (i * 7) % 9, 1, '#6a6050'); R(328, CY + 4 + i * 2, 4, 1, '#8a3a2a'); }
    R(345, CY + 12, 1, 4, '#8a1a14');
    pline(338, CY + 10, 352, CY + 4, '#2a2a30'); R(352, CY + 4, 2, 1, '#b8b8c0');
    // чернильница с пером
    R(357, CY - 1, 8, 7, '#14141a'); R(357, CY - 1, 1, 7, '#3a3a4a'); R(358, CY - 3, 6, 2, '#8a6a2a'); R(358, CY - 3, 6, 1, '#c8a650');
    pline(361, CY - 3, 366, CY - 17, '#d0d0c8');
    for (let k = 0; k < 6; k++) { R(362 + Math.floor(k * 0.7), CY - 6 - k * 2, 2, 1, '#a8a8a0'); }
    // свеча на блюдце
    R(369, CY, 11, 2, '#8a6a2a'); R(369, CY, 11, 1, '#c8a650'); R(372, CY - 8, 5, 8, '#ddd2b4'); R(372, CY - 8, 1, 8, '#f0e8d0');
    R(371, CY - 4, 1, 3, '#ddd2b4'); R(374, CY - 9, 1, 1, '#2a2420');
    // ---- виньетка
    const vx = vig.getContext('2d');
    const vg = vx.createRadialGradient(W / 2, H / 2 - 20, 70, W / 2, H / 2 - 20, 230);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)');
    vx.fillStyle = vg; vx.fillRect(0, 0, W, H);
    g = c;
  }

  /* ============================================================
     ДИНАМИКА ЛАВКИ
     ============================================================ */
  function drawFogGlass(x, y, w, h, now, far) {
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, mix('#1c2628', '#66767c', S.dawn)); grd.addColorStop(1, mix('#35443f', '#a0acaa', S.dawn));
    g.fillStyle = grd; g.fillRect(x, y, w, h);
    if (far) {
      const c1 = mix('#172020', '#4a5658', S.dawn), c2 = mix('#141c1c', '#465254', S.dawn), lit = 0.6 * (1 - S.dawn);
      house(x - 3, y + h, 24, 20, 7, c1, 40, now, lit);
      house(x + 19, y + h, 16, 30, 6, c2, 41, now, lit);
      house(x + 39, y + h, 27, 16, 8, c1, 42, now, lit);
      R(x + 47, y + 20, 1, h - 20, '#0e1414'); R(x + 45, y + 16, 5, 5, '#101616');
      g.fillStyle = 'rgba(235,205,125,0.55)'; g.fillRect(x + 46, y + 17, 3, 3);
      glow(x + 47.5, y + 18.5, 16, '235,205,125', 0.16);
      cone(x + 47.5, y + 20, 3, 26, h - 20, '235,205,125', 0.06);
    }
  }
  /* ---------- ТУМАН ----------
     Три слоя тайлящейся пиксельной текстуры (фрактальный шум, растр Байера):
     крупные клубы, средние пряди и быстрые тонкие струйки. Слои плывут с разной
     скоростью (параллакс) и медленно «дышат», меняя форму. */
  const FOG_TW = 256;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const FOG_LAYERS = [
    { cx: 64, cy: 22, thr: 0.40, soft: 0.40, a: 0.30, sp: 0.0022, col: [150, 172, 168], seed: 11 },
    { cx: 40, cy: 11, thr: 0.47, soft: 0.34, a: 0.30, sp: 0.0050, col: [178, 196, 192], seed: 23 },
    { cx: 36, cy: 5, thr: 0.56, soft: 0.26, a: 0.26, sp: 0.0105, col: [205, 218, 214], seed: 37 }
  ];
  const fogCache = {};
  function vnoise(u, v, per, seed) {          // value noise, периодичный по u
    const i0 = Math.floor(u), j0 = Math.floor(v), fu = u - i0, fv = v - j0;
    const su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
    const a = ((i0 % per) + per) % per, b = (a + 1) % per;
    const n00 = hsh(a + j0 * 157, seed), n10 = hsh(b + j0 * 157, seed);
    const n01 = hsh(a + (j0 + 1) * 157, seed), n11 = hsh(b + (j0 + 1) * 157, seed);
    return (n00 + (n10 - n00) * su) * (1 - sv) + (n01 + (n11 - n01) * su) * sv;
  }
  function fogTex(h, li, tint) {
    const key = h + '|' + li + '|' + tint;
    if (fogCache[key]) return fogCache[key];
    const Lr = FOG_LAYERS[li], tw = FOG_TW, k = mk(tw, h), kx = k.getContext('2d'), img = kx.createImageData(tw, h), d = img.data;
    const per = Math.max(1, Math.round(tw / Lr.cx));
    const col = tint === 'g' ? [Lr.col[0] * 0.55, Math.min(255, Lr.col[1] * 1.12), Lr.col[2] * 0.75] : Lr.col;
    for (let py = 0; py < h; py++) {
      const vf = Math.pow(Math.sin(Math.PI * (py + 0.5) / h), 1.3);
      for (let px = 0; px < tw; px++) {
        let n = 0, amp = 0.55, norm = 0, u = px / tw * per, v = py / Lr.cy, p = per;
        for (let o = 0; o < 4; o++) { n += vnoise(u, v, p, Lr.seed + o * 7) * amp; norm += amp; u *= 2; v *= 2; p *= 2; amp *= 0.5; }
        n /= norm;
        let a = (n - Lr.thr) / Lr.soft; a = a < 0 ? 0 : a > 1 ? 1 : a * a * (3 - 2 * a);
        a *= vf;
        const q = Math.floor(a * 4 + BAYER[(py & 3) * 4 + (px & 3)] / 16) / 4;   // 5 уровней с растром
        const o4 = (py * tw + px) * 4;
        d[o4] = col[0]; d[o4 + 1] = col[1]; d[o4 + 2] = col[2]; d[o4 + 3] = Math.round(Math.min(1, q) * 255 * Lr.a);
      }
    }
    kx.putImageData(img, 0, 0);
    return (fogCache[key] = k);
  }
  function fogLayer(x, y, w, h, now, li, alpha, tint) {
    if (alpha <= 0.01) return;
    const Lr = FOG_LAYERS[li], tex = fogTex(h, li, tint);
    const off = (now * Lr.sp + Lr.seed * 53 + x * 0.7) % FOG_TW;
    const bob = Math.round(Math.sin(now / (2600 + li * 700) + li * 2) * 2);
    const base = g.globalAlpha;
    // «дыхание»: два смещённых экземпляра слоя перетекают друг в друга
    const br = 0.5 + 0.5 * Math.sin(now / (5200 + li * 1300) + li);
    [[0, 1 - br * 0.55], [FOG_TW * 0.5, br * 0.55]].forEach(function (pass) {
      g.globalAlpha = base * alpha * pass[1];
      let sx = x - ((off + pass[0]) % FOG_TW);
      for (; sx < x + w; sx += FOG_TW) g.drawImage(tex, Math.round(sx), y + bob);
    });
    g.globalAlpha = base;
  }
  function drawFogBlobs(x, y, w, h, now, n) {
    h = Math.max(8, Math.round(h)); y = Math.round(y);
    const k = Math.min(1.15, 0.4 + n * 0.08);
    const gk = (S.mode === 'shop' || S.mode === 'title') ? S.green : 0;
    g.save(); g.beginPath(); g.rect(x, y - 3, w, h + 6); g.clip();
    for (let li = 0; li < FOG_LAYERS.length; li++) {
      fogLayer(x, y, w, h, now, li, k * (1 - gk), 'n');
      if (gk > 0.02) fogLayer(x, y, w, h, now, li, k * gk * 1.2, 'g');
    }
    g.restore();
  }
  /* мягкое свечение вместо жёсткого круга */
  function glow(x, y, r, rgb, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')');
    gr.addColorStop(0.35, 'rgba(' + rgb + ',' + (a * 0.4).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  /* конус света от фонаря, видимый в тумане */
  function cone(x, y, topW, botW, h, rgb, a) {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = gr; g.beginPath();
    g.moveTo(x - topW / 2, y); g.lineTo(x + topW / 2, y); g.lineTo(x + botW / 2, y + h); g.lineTo(x - botW / 2, y + h); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  /* капли, сползающие по стеклу */
  function drawDrops(x, y, w, h, now, n) {
    for (let i = 0; i < n; i++) {
      const sp = 0.006 + hsh(i, 5) * 0.012, run = h + 12, cyc = run / sp * 2.2;
      const t = (now + hsh(i, 6) * 9e4) % cyc, dx0 = x + 2 + Math.floor(hsh(i, 7) * (w - 4));
      if (t > run / sp) {                             // капля висит и ждёт
        const hy = y + 3 + Math.floor(hsh(i, 8) * h * 0.5);
        g.fillStyle = 'rgba(215,232,230,0.35)'; g.fillRect(dx0, hy, 1, 2);
        continue;
      }
      const dy = y - 6 + t * sp, wob = Math.floor(hsh(i * 13 + Math.floor(dy / 7), 9) * 3) - 1;
      g.fillStyle = 'rgba(200,222,220,0.16)'; g.fillRect(dx0 + wob, Math.round(dy - 9), 1, 9);
      g.fillStyle = 'rgba(232,244,242,0.6)'; g.fillRect(dx0 + wob, Math.round(dy), 1, 2);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(dx0 + wob, Math.round(dy), 1, 1);
    }
  }

  function drawWindow(now) {
    const x = WIN.x, y = WIN.y, w = WIN.w, h = WIN.h;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    drawFogGlass(x, y, w, h, now, true);
    const wn = S.win;
    if (wn) {
      const t = now - wn.t0, base = y + h;
      if (wn.kind === 'pass') {
        const fx = x - 8 + (t / wn.dur) * (w + 16), bob = Math.sin(t / 160) > 0 ? 1 : 0;
        R(fx - 3, base - 38 + bob, 7, 40, '#0b1010'); R(fx - 2, base - 45 + bob, 5, 7, '#0b1010');
      } else if (wn.kind === 'stand') {
        const a = Math.min(1, t / 900) * Math.min(1, Math.max(0, (wn.dur - t) / 500));
        g.globalAlpha = a;
        R(x + 12, base - 52, 11, 54, '#090d0d'); R(x + 14, base - 61, 7, 9, '#090d0d');
        if (wn.hat) { R(x + 12, base - 62, 11, 1, '#090d0d'); R(x + 14, base - 72, 7, 10, '#090d0d'); }
        if (wn.eyes && Math.sin(now / 90) > -0.8) { R(x + 15, base - 57, 1, 1, '#d8d8b8'); R(x + 19, base - 57, 1, 1, '#d8d8b8'); }
        g.globalAlpha = 1;
      } else if (wn.kind === 'face') {
        const a = Math.min(1, t / 250);
        g.globalAlpha = a;
        const fx = x + w / 2 + Math.sin(now / 50) * 0.6, fy = y + h / 2 + 4;
        ell(fx, fy + 30, 26, 22, '#0a0e0e');
        ell(fx, fy, 14, 19, '#96a39a');
        ell(fx - 5, fy - 4, 3.5, 4.5, '#000'); ell(fx + 5, fy - 4, 3.5, 4.5, '#000');
        ell(fx, fy + 9, 4, 5 + Math.sin(now / 200) * 1.5, '#050000');
        R(fx - 15, fy - 20, 3, 26, '#0a0c0c'); R(fx - 9, fy - 20, 2, 12, '#0a0c0c'); R(fx + 11, fy - 20, 3, 30, '#0a0c0c'); R(fx + 4, fy - 20, 2, 9, '#0a0c0c');
        ell(x + 9, fy + 6, 5, 6, '#8a978e'); ell(x + w - 9, fy + 2, 5, 6, '#8a978e');
        g.globalAlpha = 1;
      }
    }
    drawFogBlobs(x, y + 6, w, h - 4, now, 6);
    g.fillStyle = 'rgba(190,210,210,0.18)';
    for (let i = 0; i < 11; i++) g.fillRect(Math.floor(x + (i * 23 + now * 0.05) % w), Math.floor(y + (i * 41 + now * 0.2) % h), 1, 3);
    // запотевшие углы стекла
    g.fillStyle = 'rgba(180,196,194,0.10)'; g.fillRect(x, y + h - 6, w, 6); g.fillRect(x, y + h - 3, w, 3);
    drawDrops(x, y, w, h, now, 9);
    g.restore();
    // переплёт рамы
    R(x + w / 2 - 1, y, 3, h, '#3a2818'); R(x + w / 2 - 1, y, 1, h, '#4e3826'); R(x + w / 2 + 1, y, 1, h, '#1a100a');
    R(x, y + h / 2 - 1, w, 3, '#3a2818'); R(x, y + h / 2 - 1, w, 1, '#4e3826'); R(x, y + h / 2 + 1, w, 1, '#1a100a');
    windowDressing(x, y, w, h, now);
  }

  /* засохшая герань в горшке, бархатные шторы на подхватах, ламбрекен, карниз */
  function windowDressing(x, y, w, h, now) {
    const px = x + w - 22, py = y + h + 1;
    pline(px + 5, py - 7, px + 2, py - 18, '#4a4426'); pline(px + 5, py - 7, px + 8, py - 20, '#4a4426'); pline(px + 5, py - 7, px + 10, py - 14, '#4a4426');
    [[px + 1, py - 19], [px + 3, py - 14], [px + 7, py - 21], [px + 10, py - 15], [px + 9, py - 11]].forEach(function (q, i) { R(q[0], q[1], 3, 2, i % 2 ? '#4a5430' : '#3a4426'); R(q[0], q[1] + 2, 1, 1, '#5a4a26'); });
    R(px + 7, py - 23, 3, 2, '#6a2622'); R(px + 8, py - 24, 1, 1, '#8a3a30');
    R(px, py - 7, 11, 2, '#8a4a2c'); R(px + 1, py - 5, 9, 5, '#7a3a24'); R(px + 1, py - 5, 1, 5, '#9a5a34'); R(px + 9, py - 5, 1, 5, '#5a2a1a');
    // шторы
    const base = '#4a1e20', lt = '#62302e', dk = '#2a0e10', tie = y + Math.round(h * 0.58);
    [-1, 1].forEach(function (side) {
      for (let yy = y - 4; yy < y + h + 1; yy++) {
        let wd;
        if (yy < tie) wd = 12 - Math.round((yy - y + 4) / (tie - y + 4) * 6);
        else wd = 6 + Math.round(Math.min(1, (yy - tie) / 14) * 5);
        const x0 = side < 0 ? x - 7 : x + w + 7 - wd;
        R(x0, yy, wd, 1, base);
        for (let k = 1; k < wd; k += 3) { R(x0 + k, yy, 1, 1, lt); if (k + 1 < wd) R(x0 + k + 1, yy, 1, 1, dk); }
      }
      const tx = side < 0 ? x - 7 : x + w + 1;
      R(tx, tie, 6, 2, '#a8843a'); R(tx, tie, 6, 1, '#d0aa56');
      R(tx + (side < 0 ? 5 : 0), tie + 2, 1, 4, '#a8843a'); R(tx + (side < 0 ? 4 : -1), tie + 6, 3, 2, '#c89a46');
    });
    // ламбрекен с бахромой
    R(x - 8, y - 7, w + 16, 4, base); R(x - 8, y - 7, w + 16, 1, lt);
    for (let k = 0; k < w + 16; k += 8) { R(x - 8 + k, y - 3, 6, 1, base); R(x - 7 + k, y - 2, 4, 1, base); R(x - 6 + k, y - 1, 2, 1, '#a8843a'); }
    // латунный карниз с наконечниками
    R(x - 10, y - 9, w + 20, 2, '#8a6a2a'); R(x - 10, y - 9, w + 20, 1, '#c8a650');
    R(x - 12, y - 10, 3, 3, '#a8843a'); R(x + w + 9, y - 10, 3, 3, '#a8843a');
  }

  function drawDoor(now) {
    const x = DG.x, y = DG.y, w = DG.w, h = DG.h;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    drawFogGlass(x, y, w, h, now, false);
    drawFogBlobs(x, y, w, h, now + 9000, 4);
    drawDrops(x, y, w, h, now + 4000, 4);
    const cu = S.customer;
    if (cu && cu.approach) {                       // силуэт за дверью перед тем, как войти
      const k = Math.min(1, (now - cu.approach) / 900);
      const hgt = 10 + k * 22, wd = 6 + k * 12;
      R(x + w / 2 - wd / 2, y + h - hgt, wd, hgt, '#080b0b'); R(x + w / 2 - wd / 4, y + h - hgt - wd / 2, wd / 2, wd / 2, '#080b0b');
    }
    if (S.peek) {                                   // кто-то смотрит через стекло
      const pt = now - S.peek.t0;
      if (pt > S.peek.dur) S.peek = null;
      else {
        g.globalAlpha = Math.min(1, pt / 120) * Math.min(1, (S.peek.dur - pt) / 160);
        ell(x + w / 2, y + 17, 9, 12, '#96a39a'); ell(x + w / 2 - 4, y + 14, 2.5, 3, '#000'); ell(x + w / 2 + 4, y + 14, 2.5, 3, '#000');
        ell(x + w / 2, y + 23, 3, 2 + Math.sin(now / 60), '#0a0000'); R(x + w / 2 - 12, y + 30, 24, 4, '#0a0e0e');
        g.globalAlpha = 1;
      }
    }
    g.restore();
    R(x + w / 2 - 1, y, 1, h, '#120c09');
    // тряска двери от стука
    const kt = now - S.knockT;
    if (kt < 900 && Math.floor(kt / 60) % 2 === 0) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(161, 21, 62, 105); }
    // дверь открыта
    const dt = now - S.doorT;
    if (dt < 1100) {
      const a = dt < 200 ? dt / 200 : Math.max(0, 1 - (dt - 500) / 600);
      g.fillStyle = 'rgba(6,10,10,' + (0.9 * Math.min(1, a)).toFixed(3) + ')'; g.fillRect(161, 21, 62, 105);
      g.globalAlpha = Math.min(1, a); drawFogBlobs(161, 40, 62, 86, now, 8); g.globalAlpha = 1;
    }
  }

  let fogTmp = null;
  /* туман, вползший с улицы в открытую дверь, расползается по лавке и тает */
  function drawRoomFog(now) {
    const dt = now - S.doorT;
    if (dt < 0 || dt > 6500) return;
    const p = dt / 6500, a = Math.min(1, dt / 600) * (1 - p) * (1 - p);
    const spread = 34 + p * 120, x0 = Math.round(192 - spread), w = Math.round(spread * 2), y0 = Math.round(66 + p * 12);
    // рисуем во временный слой и растворяем боковые края, чтобы не было ровных границ
    if (!fogTmp) fogTmp = mk(W, H);
    const tx = fogTmp.getContext('2d'), old = g;
    tx.clearRect(0, 0, W, H);
    g = tx; drawFogBlobs(x0, y0, w, 58, now + 3000, 7); g = old;
    tx.globalCompositeOperation = 'destination-in';
    const fade = tx.createLinearGradient(x0, 0, x0 + w, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.3, 'rgba(0,0,0,1)'); fade.addColorStop(0.7, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    tx.fillStyle = fade; tx.fillRect(x0, y0 - 4, w, 66);
    tx.globalCompositeOperation = 'source-over';
    g.globalAlpha = a * 0.85; g.drawImage(fogTmp, 0, 0); g.globalAlpha = 1;
  }

  function drawBell(now) {
    const t = now - S.bellT;
    const a = t < 2200 ? Math.sin(t / 55) * Math.exp(-t / 520) * 1.0 : 0;
    const ax = 234, ay = 27;
    const bx = ax + Math.sin(a) * 6, by = ay + Math.cos(a) * 3;
    const col = S.upg.bell ? '#dcdce6' : '#c8a040', col2 = S.upg.bell ? '#9a9aa8' : '#8a6a20';
    R(ax, ay, 1, 2, '#5a4a2a');
    R(bx - 2, by, 5, 4, col); R(bx - 3, by + 4, 7, 1, col); R(bx - 2, by, 1, 4, col2); R(bx, by + 5, 1, 1, '#3a2a10');
  }

  function drawClock(now) {
    const m = S.minutes, fx = CLK.fx, fy = CLK.fy;
    const ah = ((m / 60) % 12) / 12 * Math.PI * 2, am = (m % 60) / 60 * Math.PI * 2;
    g.strokeStyle = '#1a1410'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.sin(ah) * 4.5, fy - Math.cos(ah) * 4.5); g.stroke();
    g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.sin(am) * 7, fy - Math.cos(am) * 7); g.stroke();
    R(fx - 0.5, fy - 0.5, 1, 1, '#000');
    const sw = Math.sin(now / 500) * 5;
    g.strokeStyle = '#5a4a2a'; g.beginPath(); g.moveTo(116, 53); g.lineTo(116 + sw, 72); g.stroke();
    ell(116 + sw, 73, 3, 3, '#b8923e'); R(115 + sw, 72, 1, 1, '#f0d890');
    R(fx - 1, fy - 1, 2, 2, '#8a6a2a');
    g.fillStyle = 'rgba(220,235,240,0.07)';
    g.beginPath(); g.moveTo(118, 52); g.lineTo(123, 52); g.lineTo(113, 80); g.lineTo(108, 80); g.closePath(); g.fill();
    g.fillStyle = 'rgba(220,235,240,0.12)'; g.fillRect(123, 52, 1, 28);
  }

  function drawMirror(now) {
    const m = MIR;
    g.save(); g.beginPath(); g.ellipse(m.cx, m.cy, m.rx, m.ry, 0, 0, Math.PI * 2); g.clip();
    const grd = g.createLinearGradient(m.cx - m.rx, m.cy - m.ry, m.cx + m.rx, m.cy + m.ry);
    grd.addColorStop(0, '#3a4d52'); grd.addColorStop(1, '#17202a');
    g.fillStyle = grd; g.fillRect(m.cx - m.rx, m.cy - m.ry, m.rx * 2, m.ry * 2);
    glow(m.cx - 10, m.cy + 18, 9, S.green > 0.3 ? '120,255,170' : '255,190,90', 0.32);
    const cu = S.customer;
    if (cu && !cu.tells.mirror && cu.alpha > 0.02) {
      const L = cu.look, hy = m.cy - 4 + Math.round((L.tall || 0) * 0.45);
      g.globalAlpha = cu.alpha;
      const top = (L.hat && L.hat !== 'none') ? L.hatCol : (L.hairStyle === 'bald' ? L.skin : L.hair);
      R(m.cx - 14, hy + 14, 28, 40, sh(L.coat, 0.75)); R(m.cx - 14, hy + 14, 28, 2, sh(L.coat, 1.1));
      R(m.cx - 3, hy + 10, 6, 5, sh(L.skin, 0.5));
      R(m.cx - 6, hy - 2, 12, 13, sh(top, 0.9)); R(m.cx - 5, hy - 3, 10, 1, sh(top, 0.9));
      if (L.hat === 'tophat') { R(m.cx - 5, hy - 14, 10, 12, sh(top, 0.9)); R(m.cx - 9, hy - 2, 18, 2, sh(top, 0.9)); }
      if (L.hat === 'bowler') { R(m.cx - 9, hy + 1, 18, 2, sh(top, 0.9)); }
      if (L.hairStyle === 'long') { R(m.cx - 7, hy, 14, 22, sh(L.hair, 0.8)); }
      g.globalAlpha = 1;
    }
    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = 0; i < 6; i++) g.fillRect(m.cx - 13 + i * 2, m.cy - 20 + i * 4, 2, 7);
    for (let i = 0; i < 4; i++) g.fillRect(m.cx + 2 + i * 2, m.cy + 4 + i * 4, 1, 5);
    const mv = g.createRadialGradient(m.cx, m.cy, m.rx * 0.6, m.cx, m.cy, m.ry * 1.05);
    mv.addColorStop(0, 'rgba(0,0,0,0)'); mv.addColorStop(1, 'rgba(20,16,8,0.45)');
    g.fillStyle = mv; g.fillRect(m.cx - m.rx, m.cy - m.ry, m.rx * 2, m.ry * 2);
    g.fillStyle = 'rgba(48,38,22,0.4)';
    [[-12, -18, 3], [-14, 8, 2], [9, 20, 3], [12, -10, 2], [-8, 24, 2], [5, -24, 2]].forEach(function (q) { g.fillRect(m.cx + q[0], m.cy + q[1], q[2], q[2]); g.fillRect(m.cx + q[0] + 1, m.cy + q[1] - 1, 1, 1); });
    if (S.mirror.fog > 0) { g.fillStyle = 'rgba(200,216,214,' + (0.55 * S.mirror.fog).toFixed(3) + ')'; g.fillRect(m.cx - m.rx, m.cy - m.ry, m.rx * 2, m.ry * 2); }
    if (S.mirror.face > 0) {
      g.globalAlpha = S.mirror.face;
      const fx = m.cx + Math.sin(now / 70) * 0.5, fy = m.cy;
      R(fx - 12, fy + 14, 24, 30, '#0c0e10');
      R(fx - 7, fy - 11, 14, 19, '#9aa098'); R(fx - 6, fy - 12, 12, 1, '#9aa098'); R(fx - 5, fy + 8, 10, 3, '#9aa098');
      R(fx - 8, fy - 12, 16, 3, '#77776f'); R(fx - 8, fy - 10, 2, 9, '#77776f'); R(fx + 6, fy - 10, 2, 9, '#77776f');
      R(fx - 5, fy - 5, 4, 3, '#040404'); R(fx + 1, fy - 5, 4, 3, '#040404');
      R(fx - 6, fy + 3, 12, 9, '#7c7c74'); R(fx - 3, fy + 3, 6, 2, '#0a0606');
      g.globalAlpha = 1;
    }
    // при низком рассудке в зеркале иногда стоит кто-то ещё
    if (S.sanity < 35 && !S.mirror.face && Math.sin(now / 1900) > 0.93) {
      R(m.cx + 4, m.cy - 2, 7, 30, 'rgba(0,0,0,0.6)'); R(m.cx + 5, m.cy - 8, 5, 6, 'rgba(0,0,0,0.6)');
    }
    g.restore();
  }

  function drawShelf(now) {
    for (let i = 0; i < 12; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const x = SHELF.x + 3 + col * 18, y = SHELF.rows[row] - 14;
      if (i >= S.slots) continue;
      const it = S.stock[i];
      if (!it) continue;
      drawIcon(it.icon, x, y, 1);
      if (it.cursed) {
        const a = 0.35 + 0.25 * Math.sin(now / 400 + i);
        g.fillStyle = 'rgba(170,70,220,' + a.toFixed(3) + ')'; g.fillRect(x + 1, y + 14, 12, 1);
      }
    }
    for (let i = 0; i < Math.min(12, S.slots); i++) {                                       // ценники на бечёвке
      if (!S.stock[i]) continue;
      const x = SHELF.x + 3 + (i % 4) * 18, ry = SHELF.rows[Math.floor(i / 4)];
      R(x + 10, ry + 3, 1, 1, '#8a8270'); R(x + 8, ry + 4, 5, 3, '#d8ceb0'); R(x + 9, ry + 5, 3, 1, '#7a6a50');
    }
    g.save(); g.beginPath(); g.rect(SHELF.x, SHELF.y, SHELF.w, SHELF.h); g.clip();
    g.fillStyle = 'rgba(200,220,230,0.045)';
    [[SHELF.x + 20, 10], [SHELF.x + 30, 4], [SHELF.x + 60, 9], [SHELF.x + 70, 3]].forEach(function (q) {
      g.beginPath(); g.moveTo(q[0], SHELF.y); g.lineTo(q[0] + q[1], SHELF.y); g.lineTo(q[0] + q[1] - 34, SHELF.y + SHELF.h); g.lineTo(q[0] - 34, SHELF.y + SHELF.h); g.closePath(); g.fill();
    });
    g.restore();
    const sc = S.lampOn ? Math.max(0, 1 - S.dark * 1.6) : 0;
    if (sc > 0.05) {
      const fh = 2 + (Math.sin(now / 80) + Math.sin(now / 31) > 0.3 ? 1 : 0);
      R(300, 38 - fh, 1, fh, sc > 0.5 ? '#ffcf60' : '#d09040'); R(300, 37, 1, 1, '#fff4c8');
    } else R(300, 36, 1, 2, 'rgba(120,120,120,0.5)');
    if (S.slots < 12) {                            // третья полка заколочена
      const y = SHELF.rows[1] + 4;
      R(SHELF.x, y, SHELF.w, 26, '#0c0806');
      for (let i = 0; i < 4; i++) R(SHELF.x + 2 + i * 19, y + 2, 15, 23, i % 2 ? '#2a1d14' : '#261a12');
      R(SHELF.x, y + 8, SHELF.w, 3, '#35251a'); R(SHELF.x, y + 18, SHELF.w, 3, '#35251a');
      R(SHELF.x + 6, y + 9, 1, 1, '#8a8a8a'); R(SHELF.x + 68, y + 9, 1, 1, '#8a8a8a'); R(SHELF.x + 6, y + 19, 1, 1, '#8a8a8a'); R(SHELF.x + 68, y + 19, 1, 1, '#8a8a8a');
    }
  }

  /* ---------- посетитель ---------- */
  function hatExtra(L) { return L.hat === 'tophat' ? 22 : L.hat === 'bowler' ? 9 : (L.hat && L.hat !== 'none') ? 5 : (L.hairStyle === 'bun' ? 6 : 1); }

  function drawShadow(L, o) {
    const cx = o.x + 16, sy = 88 + (L.tall || 0) + 3, bw = L.bodyW, hw = L.headW, hh = L.headH, he = hatExtra(L);
    g.save(); g.filter = 'blur(2.5px)';
    g.fillStyle = 'rgba(0,0,0,' + (0.42 * o.alpha).toFixed(3) + ')';
    g.fillRect(Math.round(cx - bw / 2 - 2), sy, bw + 4, 60);
    g.fillRect(Math.round(cx - hw / 2 - 1), sy - 6 - hh - he, hw + 3, hh + 6 + he);
    if (L.hat === 'tophat' || L.hat === 'bowler') g.fillRect(Math.round(cx - hw / 2 - 6), sy - 7 - hh, hw + 12, 3);
    g.restore();
  }

  function drawPerson(L, o) {
    const cx = o.x, sy = 88 + (L.tall || 0) + (o.dy || 0);
    const bw = L.bodyW, hw = L.headW, hh = L.headH;
    const hx = Math.round(cx - hw / 2), hy = sy - 5 - hh;
    const skin = L.skin, skinS = sh(skin, 0.78), skinD = sh(skin, 0.5), skinL = sh(skin, 1.1);
    const coat = L.coat, coat2 = L.coat2;
    function inset(r) {
      if (r <= 0) return 3; if (r === 1) return 2; if (r === 2) return 1;
      const b = hh - 1 - r;
      if (b <= 0) return L.child ? 4 : 5; if (b === 1) return L.child ? 3 : 4; if (b === 2) return 3; if (b === 3) return 2; if (b <= 5) return 1;
      return 0;
    }
    // --- тело
    // покатые плечи: от шеи к рукавам
    const nh = Math.min(bw / 2 - 2, hw / 2 + 5);
    for (let r = 0; r < 6; r++) {
      const half = Math.round(nh + (bw / 2 - nh) * Math.sin((r + 1) / 6 * Math.PI / 2));
      R(cx - half, sy + r, half * 2, 1, coat);
      R(cx + half - Math.min(7, half - nh + 2), sy + r, Math.min(7, half - nh + 2), 1, sh(coat, 0.68));
      R(cx - half, sy + r, 1, 1, sh(coat, 1.35));
    }
    R(cx - bw / 2, sy + 6, bw, 60, coat);
    R(cx + bw / 2 - 7, sy + 6, 7, 60, sh(coat, 0.68)); R(cx - bw / 2, sy + 6, 2, 60, sh(coat, 1.35));
    // тёплый отсвет лампы по левому контуру и шов рукава
    g.fillStyle = 'rgba(255,184,100,0.28)'; g.fillRect(Math.round(cx - bw / 2), sy + 6, 1, 60);
    R(cx - bw / 2 + 6, sy + 8, 1, 50, sh(coat, 0.82)); R(cx + bw / 2 - 8, sy + 8, 1, 50, sh(coat, 0.55));
    R(cx - bw / 2 + 9, sy + 14, 1, 40, sh(coat, 0.75)); R(cx + bw / 2 - 11, sy + 14, 1, 40, sh(coat, 0.6));
    R(cx - 4, sy - 7, 8, 8, skinS);
    const shirt = L.voidFace ? '#c8c8c0' : (L.hat === 'wimple' ? '#e8e4dc' : sh(coat, 0.45));
    for (let i = 0; i < 13; i++) { const w2 = 6.5 - i * 0.5; R(cx - w2, sy + i, w2 * 2, 1, shirt); }
    for (let i = 0; i < 13; i++) { R(cx - 7.5 + i * 0.5, sy + i, 1, 1, coat2); R(cx + 6.5 - i * 0.5, sy + i, 1, 1, coat2); }
    for (let i = 0; i < 3; i++) R(cx - 1, sy + 16 + i * 7, 2, 2, L.buttons ? '#c8a040' : sh(coat, 0.45));
    if (L.buttons) { R(cx - bw / 2 + 4, sy + 3, 9, 2, '#c8a040'); R(cx + bw / 2 - 13, sy + 3, 9, 2, '#8a7030'); R(cx - 9, sy + 16, 2, 2, '#c8a040'); R(cx + 7, sy + 16, 2, 2, '#8a7030'); }
    if (L.voidFace) { R(cx - 1, sy + 1, 2, 9, '#5a0808'); }
    if (L.apron) { R(cx - bw / 2 + 8, sy + 17, bw - 16, 50, L.apron); R(cx - bw / 2 + 8, sy + 17, bw - 16, 1, sh(L.apron, 1.3)); R(cx - 9, sy + 5, 1, 12, L.apron); R(cx + 8, sy + 5, 1, 12, L.apron); }
    if (L.cross) { R(cx - 5, sy + 2, 1, 13, '#8a7030'); R(cx + 4, sy + 2, 1, 13, '#8a7030'); R(cx - 1, sy + 14, 2, 10, '#c8a040'); R(cx - 3, sy + 17, 6, 2, '#c8a040'); }
    if (L.collar === 'fur') {
      R(cx - hw / 2 - 6, sy - 3, hw + 12, 9, coat2);
      g.fillStyle = sh(coat2, 1.3); for (let i = 0; i < hw + 10; i += 3) g.fillRect(Math.round(cx - hw / 2 - 5 + i), sy - 2 + (i % 2) * 3, 1, 2);
      R(cx - 4, sy - 7, 8, 5, skinS);
    }
    if (L.scarf) { R(cx - 10, sy - 4, 20, 6, L.scarf); R(cx - 10, sy + 1, 20, 1, sh(L.scarf, 0.7)); R(cx + 2, sy + 2, 5, 14, sh(L.scarf, 0.85)); }
    if (L.hat === 'wimple') { R(cx - 12, sy - 4, 24, 9, '#e8e4dc'); R(cx - 12, sy + 4, 24, 1, '#b8b4ac'); }
    if (L.child && o.doll) {
      const dx = cx - bw / 2 - 7;
      R(dx + 1, sy + 4, 5, 5, '#d8d0c0'); R(dx, sy + 3, 7, 2, '#5a4a3a'); R(dx + 2, sy + 6, 1, 1, '#111'); R(dx + 4, sy + 6, 1, 1, '#111');
      R(dx, sy + 9, 7, 11, '#5a6a7a'); R(dx + 5, sy + 10, 5, 3, skin);
    }
    // --- голова
    const face = L.voidFace ? '#040405' : skin;
    for (let r = 0; r < hh; r++) { const ins = inset(r); R(hx + ins, hy + r, hw - ins * 2, 1, face); }
    if (!L.voidFace) {
      for (let r = 2; r < hh - 1; r++) { const ins = inset(r); R(hx + hw - ins - 3, hy + r, 3, 1, skinS); }
      for (let r = 4; r < hh - 6; r++) R(hx + inset(r), hy + r, 1, 1, skinL);
      const earY = hy + Math.round(hh * 0.42);
      R(hx - 2, earY, 2, 5, skin); R(hx + hw, earY, 2, 5, skinS);
    }
    // --- волосы
    const hair = L.hair, hairS = sh(hair, 0.7);
    function cap(h, ext) { ext = ext || 0; for (let r = 0; r < h; r++) { const ins = Math.max(0, inset(r) - 1); R(hx + ins - ext, hy - 1 + r, hw - ins * 2 + ext * 2, 1, hair); } }
    switch (L.hairStyle) {
      case 'short': cap(5); R(hx, hy + 4, 2, 6, hair); R(hx + hw - 2, hy + 4, 2, 6, hairS); break;
      case 'side': cap(5); R(hx + 1, hy + 4, Math.round(hw * 0.55), 2, hair); R(hx, hy + 4, 2, 5, hair); R(hx + hw - 2, hy + 4, 2, 7, hairS); break;
      case 'shaggy': cap(6, 1); R(hx - 2, hy + 2, 3, 8, hair); R(hx + hw - 1, hy + 2, 3, 9, hairS); R(hx + 3, hy + 5, 3, 2, hair); R(hx + 9, hy + 5, 4, 3, hair); R(hx + hw - 6, hy + 5, 3, 2, hair); R(hx + 4, hy - 3, 3, 2, hair); R(hx + hw - 8, hy - 3, 4, 2, hair); break;
      case 'bun': cap(5); R(cx - 4, hy - 6, 9, 6, hair); R(cx - 3, hy - 7, 7, 1, hair); R(hx, hy + 4, 2, 7, hair); R(hx + hw - 2, hy + 4, 2, 7, hairS); break;
      case 'long': cap(6, 1); R(hx - 3, hy + 2, 4, hh + 8, hair); R(hx + hw - 1, hy + 2, 4, hh + 8, hairS); R(hx + 1, hy + 5, 4, 2, hair); R(hx + hw - 6, hy + 5, 3, 1, hair); break;
    }
    // --- лицо
    const eyeY = hy + Math.round(hh * 0.44), ex = Math.round(hw * 0.24) + 1;
    const mouthY = hy + Math.round(hh * 0.77);
    const big = L.child ? 1 : 0;
    const mood = o.mood || 'neutral';
    if (L.voidFace) {
      if (!o.blink) { R(cx - ex, eyeY, 1, 1, '#e0e0c8'); R(cx + ex - 1, eyeY, 1, 1, '#e0e0c8'); }
      if (o.wide) { R(cx - 6, mouthY, 12, 1, '#d8d8c8'); R(cx - 7, mouthY - 1, 1, 1, '#d8d8c8'); R(cx + 6, mouthY - 1, 1, 1, '#d8d8c8'); }
    } else {
      [cx - ex, cx + ex].forEach(function (x0) {
        if (o.hollowEyes) { R(x0 - 3, eyeY - 1, 6, 4 + big, '#000'); return; }
        if (L.eyes === 'blind') { R(x0 - 2, eyeY, 5, 3, '#c4ccd0'); R(x0 - 2, eyeY - 1, 5, 1, skinD); R(x0 - 2, eyeY + 3, 5, 1, skinS); return; }
        if (o.blink) { R(x0 - 2, eyeY + 1, 5, 1, skinD); return; }
        R(x0 - 2, eyeY, 5, 3 + big, '#e6e2d6');
        R(x0 - 1 + o.lx, eyeY + (o.ly > 0 ? 1 : 0), 2 + big, 2 + big, '#120e0c');
        R(x0 - 2, eyeY - 1, 5, 1, skinD);
        if (L.wrinkles || L.child) R(x0 - 2, eyeY + 3 + big, 5, 1, skinS);
      });
      const browC = sh(L.hairStyle === 'bald' ? '#3a3030' : hair, 0.55);
      if (mood === 'angry') {
        R(cx - ex - 3, eyeY - 4, 3, 1, browC); R(cx - ex, eyeY - 3, 3, 1, browC); R(cx + ex - 2, eyeY - 3, 3, 1, browC); R(cx + ex + 1, eyeY - 4, 3, 1, browC);
      } else if (mood === 'sad') {
        R(cx - ex - 3, eyeY - 3, 3, 1, browC); R(cx - ex, eyeY - 4, 3, 1, browC); R(cx + ex - 2, eyeY - 4, 3, 1, browC); R(cx + ex + 1, eyeY - 3, 3, 1, browC);
      } else { R(cx - ex - 3, eyeY - 3, 6, 1, browC); R(cx + ex - 2, eyeY - 3, 6, 1, browC); }
      if (L.child) { R(cx - 1, eyeY + 5, 2, 2, skinS); }
      else { R(cx - 1, eyeY + 3, 2, 5, skinS); R(cx - 2, eyeY + 7, 4, 1, skinD); }
      if (L.rednose) R(cx - 2, eyeY + 5, 4, 3, '#b25a48');
      if (L.wrinkles) { R(hx + 5, hy + 5, hw - 10, 1, skinS); R(hx + 6, hy + 7, hw - 12, 1, skinS); R(cx - 6, mouthY - 3, 1, 3, skinS); R(cx + 5, mouthY - 3, 1, 3, skinS); }
      if (L.scar) { R(cx + 3, eyeY + 4, 1, 2, '#7a3a3a'); R(cx + 4, eyeY + 6, 1, 2, '#7a3a3a'); R(cx + 5, eyeY + 8, 1, 2, '#7a3a3a'); }
      const bc = L.beardCol || hair;
      if (L.beard === 'stubble') {
        g.fillStyle = 'rgba(30,25,20,0.3)';
        for (let r = Math.round(hh * 0.62); r < hh; r++) { const ins = inset(r); for (let x = hx + ins + (r % 2); x < hx + hw - ins; x += 2) g.fillRect(x, hy + r, 1, 1); }
      } else if (L.beard === 'full') {
        for (let r = Math.round(hh * 0.64); r < hh + 4; r++) { const ins = r < hh ? inset(r) : (r - hh + 5); R(hx + ins - 1, hy + r, hw - ins * 2 + 2, 1, bc); }
        R(cx - 5, mouthY - 2, 10, 2, sh(bc, 0.85));
      } else if (L.beard === 'mustache') { R(cx - 5, mouthY - 2, 10, 2, bc); R(cx - 6, mouthY - 1, 1, 2, bc); R(cx + 5, mouthY - 1, 1, 2, bc); }
      const mc = L.beard === 'full' ? sh(bc, 0.35) : '#5a2a26';
      if (o.wide) {
        R(cx - 8, mouthY - 1, 16, 3, '#0a0404'); for (let i = 0; i < 7; i++) R(cx - 7 + i * 2, mouthY - 1, 1, 2, '#d8d4c4');
        R(cx - 9, mouthY - 2, 1, 1, '#0a0404'); R(cx + 8, mouthY - 2, 1, 1, '#0a0404');
      } else if (o.talk) { R(cx - 2, mouthY, 5, 2, '#2a100e'); if (L.goldtooth) R(cx + 1, mouthY, 1, 1, '#e0b030'); }
      else if (mood === 'happy') { R(cx - 3, mouthY, 6, 1, mc); R(cx - 4, mouthY - 1, 1, 1, mc); R(cx + 3, mouthY - 1, 1, 1, mc); if (L.goldtooth) R(cx + 1, mouthY, 1, 1, '#e0b030'); }
      else if (mood === 'angry' || mood === 'sad') { R(cx - 3, mouthY, 6, 1, mc); R(cx - 4, mouthY + 1, 1, 1, mc); R(cx + 3, mouthY + 1, 1, 1, mc); }
      else R(cx - 3, mouthY, 6, 1, mc);
      if (L.glasses) {
        [cx - ex, cx + ex].forEach(function (x0) {
          R(x0 - 4, eyeY - 2, 8, 1, '#16161a'); R(x0 - 4, eyeY + 3, 8, 1, '#16161a'); R(x0 - 4, eyeY - 2, 1, 6, '#16161a'); R(x0 + 3, eyeY - 2, 1, 6, '#16161a');
          g.fillStyle = 'rgba(255,220,150,0.7)'; g.fillRect(x0 - 3, eyeY - 1, 1, 1);
        });
        R(cx - ex + 4, eyeY, Math.max(1, ex * 2 - 8), 1, '#16161a');
      }
    }
    // --- головные уборы
    const hc = L.hatCol || '#111';
    switch (L.hat) {
      case 'cap': R(hx - 1, hy - 3, hw + 2, 6, hc); R(hx + 1, hy - 4, hw - 2, 1, hc); R(hx - 3, hy + 2, Math.round(hw * 0.65), 2, sh(hc, 0.6)); break;
      case 'bowler': R(hx + 2, hy - 9, hw - 4, 9, hc); R(hx + 1, hy - 7, hw - 2, 7, hc); R(hx - 4, hy - 1, hw + 8, 2, hc); R(hx + 1, hy - 3, hw - 2, 1, sh(hc, 1.6)); break;
      case 'tophat': R(hx + 1, hy - 22, hw - 2, 22, hc); R(hx + 1, hy - 5, hw - 2, 2, '#3a0808'); R(hx - 5, hy - 1, hw + 10, 3, hc); R(hx + 1, hy - 22, 1, 17, sh('#1a1a22', 1)); break;
      case 'kerchief': R(hx - 1, hy - 2, hw + 2, 8, hc); R(hx + 1, hy - 3, hw - 2, 1, hc); R(hx - 2, hy + 4, 3, hh - 2, hc); R(hx + hw - 1, hy + 4, 3, hh - 2, sh(hc, 0.7)); R(cx - 3, hy + hh - 1, 6, 4, hc);
        g.fillStyle = sh(hc, 1.5); for (let i = 0; i < hw; i += 4) g.fillRect(hx + i, hy + 1 + (i % 8 ? 0 : 2), 1, 1); break;
      case 'hood': R(hx - 4, hy - 5, hw + 8, 10, hc); R(hx - 2, hy - 6, hw + 4, 1, hc); R(hx - 5, hy + 3, 5, hh + 4, hc); R(hx + hw, hy + 3, 5, hh + 4, sh(hc, 0.7));
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(hx, hy + 5, hw, 3); break;
      case 'veil': R(hx + 2, hy - 7, hw - 4, 6, hc); R(hx - 2, hy - 2, hw + 4, 2, hc); R(hx + hw - 6, hy - 10, 3, 4, '#5a1a2a');
        g.fillStyle = 'rgba(10,6,10,0.5)';
        for (let r = 0; r < Math.round(hh * 0.62); r++) for (let x = hx + (r % 2); x < hx + hw; x += 2) g.fillRect(x, hy + r, 1, 1); break;
      case 'wimple': R(hx - 2, hy - 1, hw + 4, 5, '#e8e4dc'); R(hx - 2, hy + 3, 2, hh, '#e8e4dc'); R(hx + hw, hy + 3, 2, hh, '#c8c4bc');
        R(hx - 4, hy - 4, hw + 8, 4, hc); R(hx - 6, hy - 1, 4, hh + 12, hc); R(hx + hw + 2, hy - 1, 4, hh + 12, hc); break;
      case 'officer': R(hx - 2, hy - 8, hw + 4, 7, hc); R(hx - 1, hy - 2, hw + 2, 2, '#7a1a1a'); R(cx - 1, hy - 7, 3, 3, '#c8a040'); R(hx - 1, hy, hw + 2, 2, '#08080a'); break;
    }
  }

  function drawCustomer(now) {
    const cu = S.customer;
    if (!cu) return;
    const L = cu.look;
    let a = 1, dy = 0;
    if (cu.outT) { const p = Math.min(1, (now - cu.outT) / 550); a = 1 - p; dy = p * 6; }
    else if (cu.inT) { const p = Math.min(1, (now - cu.inT) / 700); a = p; dy = (1 - p) * 8; }
    else a = 0;
    cu.alpha = a;
    if (a <= 0.01) return;
    const hollow = !!cu.hollow;
    const breath = (hollow || L.voidFace) ? 0 : (Math.sin(now / 1100 + cu.seed) > 0.55 ? 1 : 0);
    // моргание
    if (!cu.nextBlink) cu.nextBlink = now + 1500 + Math.random() * 3000;
    let blink = false;
    if (now > cu.nextBlink) { if (now > cu.nextBlink + 130) cu.nextBlink = now + 1800 + Math.random() * 3500; else blink = true; }
    let hollowEyes = !!cu.tells.eyes;
    if (hollowEyes) blink = false;
    // галлюцинации: при низком рассудке и у живых на миг чернеют глаза
    if (!hollowEyes && S.sanity < 30 && !L.voidFace) {
      if (Math.sin(now / 613 + cu.seed * 7) > 0.985 - (30 - S.sanity) * 0.002) hollowEyes = true;
    }
    const o = {
      x: CX, dy: Math.round(dy) + breath, alpha: a, mood: cu.mood, blink: blink, hollowEyes: hollowEyes,
      lx: Math.max(-1, Math.min(1, Math.round((S.mouse.x - CX) / 70))), ly: S.mouse.y > 110 ? 1 : 0,
      talk: cu.talk && Math.floor(now / 110) % 2 === 0, wide: cu.wide, doll: cu.doll
    };
    if (!cu.tells.shadow && !(S.mode === 'loc' && LOC[S.loc] && LOC[S.loc].out)) drawShadow(L, o);
    g.globalAlpha = a;
    drawPerson(L, o);
    g.globalAlpha = 1;
    cu._dy = o.dy;
  }

  /* руки посетителя на прилавке: рисуются поверх столешницы */
  function drawHands(now) {
    const cu = S.customer;
    if (!cu || !cu.alpha || cu.alpha <= 0.01 || S.mode !== 'shop') return;
    const L = cu.look, dy = Math.max(0, cu._dy || 0);
    const pale = L.voidFace || cu.hollow;
    const skin = pale ? '#b8bcb4' : L.skin, skinS = sh(skin, 0.72), skinD = sh(skin, 0.5);
    const cuff = L.coat, cuffD = sh(L.coat, 0.6);
    const off = Math.round(L.bodyW / 2) - 3;
    g.globalAlpha = cu.alpha;
    [-1, 1].forEach(function (side, si) {
      const hx = CX + side * off - (side < 0 ? 9 : 0), hy = CY - 4 + dy;
      // рукав
      R(hx - 1, hy - 5, 11, 5, cuff); R(hx - 1, hy - 1, 11, 1, cuffD); R(side < 0 ? hx - 1 : hx + 9, hy - 5, 1, 5, cuffD);
      // кисть: ладонь и четыре пальца к центру
      R(hx, hy, 9, 3, skin); R(hx, hy + 2, 9, 1, skinS);
      const tap = !cu.talk && Math.floor((now + cu.seed * 997 + si * 300) / 140) % 9 === 0;
      for (let f = 0; f < 4; f++) {
        const fx = side < 0 ? hx + 9 : hx - 1, len = pale ? 4 + (f % 2) : 2;
        const lift = (tap && f === 1) ? 1 : 0;
        const x0 = side < 0 ? fx : fx - len + 1;
        R(x0, hy + f * 0.75 - lift, len, 1, f === 3 ? skinS : skin);
      }
      R(side < 0 ? hx + 2 : hx + 4, hy - 1, 3, 1, skinD);   // костяшки в тени манжеты
      if (L.ring && si === 1) R(hx + 3, hy + 1, 1, 1, '#e0b030');
      // тень от руки на столешнице
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(hx, hy + 3, 10, 2);
    });
    g.globalAlpha = 1;
  }

  /* пылинки, медленно плывущие в свете лампы */
  function drawDust(now) {
    if (!S.lampOn) return;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const t = now / 1000 * (0.12 + hsh(i, 3) * 0.2);
      const r = 14 + hsh(i, 1) * 110, a0 = hsh(i, 2) * Math.PI * 2 + t * 0.3;
      const x = 57 + Math.cos(a0) * r * 1.2 + Math.sin(t * 2 + i) * 4;
      const y = 92 + Math.sin(a0) * r * 0.55 - ((now / 60 * hsh(i, 4)) % 30) + 15;
      const tw = 0.5 + 0.5 * Math.sin(now / 500 + i * 1.7);
      const al = (1 - r / 130) * 0.5 * tw;
      if (al <= 0.02) continue;
      g.fillStyle = S.green > 0.3 ? 'rgba(160,255,190,' + al.toFixed(3) + ')' : 'rgba(255,214,150,' + al.toFixed(3) + ')';
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    g.globalCompositeOperation = 'source-over';
  }

  function drawCounterTop(now) {
    g.drawImage(fg, 0, 0);
    // пламя
    if (S.lampOn) {
      const f = Math.sin(now / 90) + Math.sin(now / 37) * 0.5;
      const fh = 6 + Math.round(f);
      const c1 = S.green > 0.3 ? '#8affb0' : '#ffd070', c2 = S.green > 0.3 ? '#d8ffe4' : '#fff4c8';
      R(56, CY - 10 - fh, 2, fh, c1); R(56, CY - 9 - Math.round(fh / 2), 2, Math.round(fh / 2), c2); R(55, CY - 12, 4, 3, c1);
    }
    // улучшения на прилавке
    if (S.upg.scales) { R(296, CY - 1, 12, 2, '#8a6a2a'); R(301, CY - 12, 2, 11, '#a08040'); R(291, CY - 12, 22, 1, '#a08040'); R(291, CY - 11, 1, 5, '#6a5a3a'); R(312, CY - 11, 1, 5, '#6a5a3a'); R(288, CY - 6, 7, 2, '#b8923e'); R(309, CY - 6, 7, 2, '#b8923e'); }
    if (S.upg.loupe) { ell(240, CY + 7, 4, 3, '#b8923e'); ell(240, CY + 7, 3, 2, '#7a9aa0'); R(244, CY + 8, 7, 2, '#3a2a1a'); }
    if (S.tea > 0) {
      R(96, CY + 2, 9, 7, '#d8d0c0'); R(105, CY + 4, 2, 3, '#d8d0c0'); R(97, CY + 3, 7, 1, '#6a3a1a'); R(94, CY + 9, 13, 1, '#b8b0a0');
      g.fillStyle = 'rgba(220,220,220,0.25)';
      for (let i = 0; i < 3; i++) g.fillRect(98 + i * 2 + Math.round(Math.sin(now / 400 + i) * 1), CY - 3 - ((now / 120 + i * 3) % 6), 1, 2);
    }
    if (S.salt > 0) { R(120, CY + 5, 8, 4, '#8a8478'); R(121, CY + 4, 6, 2, '#f0f0ea'); }
    // вещь на прилавке
    if (S.item) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(176, CY + 12, 32, 3);
      drawIcon(S.item, 178, CY - 14, 2);
    }
  }

  function drawLight(now) {
    const fl = 1 + Math.sin(now / 130) * 0.015 + Math.sin(now / 47) * 0.01 + (Math.random() < 0.02 ? -0.05 : 0);
    const dark = Math.min(0.97, 0.87 + S.dark * 0.1 - S.dawn * 0.5);
    const sconce = Math.max(0, 1 - S.dark * 1.6);
    lightX.globalCompositeOperation = 'source-over';
    lightX.clearRect(0, 0, W, H);
    lightX.fillStyle = 'rgba(3,5,8,' + dark.toFixed(3) + ')';
    lightX.fillRect(0, 0, W, H);
    if (S.lampOn) {
      lightX.globalCompositeOperation = 'destination-out';
      const rad = (275 - S.dark * 130) * fl;
      const gr = lightX.createRadialGradient(57, 104, 6, 57, 104, rad);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.86)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lightX.fillStyle = gr; lightX.fillRect(0, 0, W, H);
      // слабый свет из окна
      const g2 = lightX.createRadialGradient(52, 60, 4, 52, 60, 60);
      g2.addColorStop(0, 'rgba(0,0,0,0.5)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      lightX.fillStyle = g2; lightX.fillRect(0, 0, 140, 140);
      if (sconce > 0.02) {                       // свеча в бра у витрины
        const g3 = lightX.createRadialGradient(300, 38, 2, 304, 50, 72 * fl);
        g3.addColorStop(0, 'rgba(0,0,0,' + (0.8 * sconce).toFixed(3) + ')'); g3.addColorStop(0.45, 'rgba(0,0,0,' + (0.4 * sconce).toFixed(3) + ')'); g3.addColorStop(1, 'rgba(0,0,0,0)');
        lightX.fillStyle = g3; lightX.fillRect(220, 0, 164, 140);
      }
    }
    g.drawImage(lightC, 0, 0);
    if (S.dawn > 0.02) {                          // утренний свет из окна
      g.globalCompositeOperation = 'lighter';
      const gd = g.createRadialGradient(52, 60, 10, 52, 60, 300);
      gd.addColorStop(0, 'rgba(255,214,160,' + (0.34 * S.dawn).toFixed(3) + ')'); gd.addColorStop(0.5, 'rgba(230,190,150,' + (0.12 * S.dawn).toFixed(3) + ')'); gd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gd; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }
    if (S.lampOn) {
      g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(57, 104, 2, 57, 104, 150 * fl);
      const gk = S.green;
      const r0 = Math.round(255 - gk * 190), g0 = Math.round(150 + gk * 105), b0 = Math.round(50 + gk * 90);
      gr.addColorStop(0, 'rgba(' + r0 + ',' + g0 + ',' + b0 + ',0.30)'); gr.addColorStop(0.3, 'rgba(' + r0 + ',' + g0 + ',' + b0 + ',0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      if (gk > 0.02) { g.fillStyle = 'rgba(20,150,80,' + (0.1 * gk).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }   // в лавке кто-то лишний
      if (sconce > 0.02) {
        g.globalCompositeOperation = 'lighter';
        const g4 = g.createRadialGradient(300, 37, 1, 300, 42, 46 * fl);
        g4.addColorStop(0, 'rgba(255,170,80,' + (0.26 * sconce).toFixed(3) + ')'); g4.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = g4; g.fillRect(250, 0, 134, 100);
        g.globalCompositeOperation = 'source-over';
      }
    }
  }

  const DARK_EYES = [[352, 34], [318, 70], [368, 100], [142, 30], [240, 104], [6, 66], [296, 8], [100, 96]];
  function drawFx(now) {
    // глаза в темноте
    if (S.sanity < 50 && S.mode === 'shop') {
      const n = Math.min(DARK_EYES.length, 1 + Math.floor((50 - S.sanity) / 8));
      for (let i = 0; i < n; i++) {
        if (Math.sin(now / (700 + i * 90) + i * 1.7) > 0.72) {
          const e = DARK_EYES[i], col = S.sanity < 25 ? '#b02020' : '#c8b8a0';
          R(e[0], e[1], 1, 1, col); R(e[0] + 3, e[1], 1, 1, col);
        }
      }
    }
    // зерно
    for (let i = 0; i < 70; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.12)';
      g.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 1, 1);
    }
    g.drawImage(vig, 0, 0);
    // пульс безумия
    if (S.sanity < 40 && S.mode === 'shop') {
      const a = (1 - S.sanity / 40) * 0.28 * (0.55 + 0.45 * Math.sin(now / 380));
      const gr = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 220);
      gr.addColorStop(0, 'rgba(90,0,0,0)'); gr.addColorStop(1, 'rgba(110,0,0,' + a.toFixed(3) + ')');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      if (Math.random() < (40 - S.sanity) * 0.003) {
        const y = Math.floor(Math.random() * 150), h = 2 + Math.floor(Math.random() * 8);
        g.drawImage(cv, 0, y, W, h, Math.floor((Math.random() - 0.5) * 12), y, W, h);
      }
    }
    if (S.flash > 0) { g.fillStyle = 'rgba(0,0,0,' + Math.min(1, S.flash).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
  }

  /* отрывной календарь: число текущей ночи; при низком рассудке иногда мелькает 13 */
  const DIG = ['###/#.#/#.#/#.#/###', '.#/##/.#/.#/.#', '###/..#/###/#../###', '###/..#/.##/..#/###', '#.#/#.#/###/..#/..#', '###/#../###/..#/###', '###/#../###/#.#/###', '###/..#/.#./.#./.#.', '###/#.#/###/#.#/###', '###/#.#/###/..#/###'].map(function (s) { return s.split('/'); });
  function digits(t, x, y, col) {
    for (let i = 0; i < t.length; i++) { const gl = DIG[+t[i]]; for (let r = 0; r < 5; r++) for (let k = 0; k < gl[r].length; k++) if (gl[r][k] === '#') R(x + k, y + r, 1, 1, col); x += gl[0].length + 1; }
  }
  function drawCalendar(now) {
    const rm = S.room || {};
    let n = String(rm.calDay || 1);
    if (S.sanity < 30 && Math.sin(now / 900) > 0.97) n = '13';
    let w = 0; for (let i = 0; i < n.length; i++) w += DIG[+n[i]][0].length + 1;
    digits(n, Math.round(141 - (w - 1) / 2), 67, n === '13' ? '#6a1a14' : '#2a2420');
    R(138, 73, 6, 1, '#a89e7e');                                              // «ноябрь» мелко
    if (rm.calNote) { R(144, 66, 1, 1, '#4a4a52'); R(143, 70, 2, 1, '#4a4a52'); }   // карандашная пометка
  }
  /* то, что в лавке изменилось из-за находок: часы открыты, ящик выдвинут, обои отклеены */
  function drawRoomState(now) {
    const rm = S.room || {};
    if (rm.clockOpen) { R(108, 52, 16, 28, '#2a1b12'); R(106, 52, 3, 28, '#3a281b'); R(107, 52, 1, 28, '#4e3826'); g.globalAlpha = 0.9; R(125, 50, 4, 32, '#3a281b'); R(125, 50, 1, 32, '#55402c'); g.globalAlpha = 1; }
    if (rm.wallPeeled) { R(132, 17, 12, 12, '#3a3428'); for (let k = 0; k < 4; k++) R(134 + k * 2, 20, 1, 6, '#1a1410'); R(133, 27, 9, 1, '#1a1410'); R(144, 17, 4, 12, '#4a4438'); }
    if (rm.potDug) { R(62, 90, 11, 2, '#3a2a1a'); R(64, 89, 3, 1, '#2a1e12'); }
  }
  function drawDrawer() {                                                   // ящик под прилавком (виден, когда нет диалога)
    const rm = S.room || {};
    if (!rm.drawerOpen) {
      R(166, 148, 54, 20, '#140c08'); R(168, 150, 50, 16, '#3a281b'); R(168, 150, 50, 1, '#55402c'); R(168, 165, 50, 1, '#1a110b');
      R(170, 152, 46, 12, '#33231a'); R(188, 155, 10, 2, '#b8923e'); R(188, 155, 10, 1, '#f0d890'); R(192, 159, 2, 3, '#0a0604');
      return;
    }
    R(162, 146, 62, 26, '#140c08'); R(164, 148, 58, 22, '#3a281b'); R(164, 148, 58, 1, '#55402c');
    R(167, 150, 52, 11, '#0e0906');
    R(176, 151, 32, 10, '#3a3a3e'); R(176, 151, 32, 1, '#5a5a60');
    if (!rm.boxOpen) for (let k = 0; k < 4; k++) { R(179 + k * 7, 154, 5, 5, '#c8c0a0'); R(181 + k * 7, 155, 1, 3, '#2a2420'); }
    else { R(176, 143, 32, 8, '#4a4a50'); R(176, 143, 32, 1, '#6a6a70'); R(178, 153, 28, 6, '#141416'); }
    R(186, 164, 14, 2, '#b8923e');
  }
  function drawHL() {                                                       // уголки вокруг того, что под курсором
    const r = S.roomHL; if (!r) return;
    const a = 0.55 + 0.25 * Math.sin(performance.now() / 300), col = 'rgba(255,214,140,' + a.toFixed(3) + ')';
    const x0 = Math.round(r[0]) - 1, y0 = Math.round(r[1]) - 1, x1 = Math.round(r[2]) + 1, y1 = Math.round(r[3]) + 1, k = 3;
    g.fillStyle = col;
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(function (c2) {
      g.fillRect(c2[2] > 0 ? c2[0] : c2[0] - k + 1, c2[1], k, 1); g.fillRect(c2[0], c2[3] > 0 ? c2[1] : c2[1] - k + 1, 1, k);
    });
  }
  let lastT = 0;
  function drawShop(now) {
    const dt = Math.min(200, Math.max(0, now - lastT)); lastT = now;
    S.green += (S.greenTarget - S.green) * (1 - Math.exp(-dt / 260));
    g.drawImage(bg, 0, 0);
    drawCalendar(now);
    drawRoomState(now);
    drawWindow(now);
    drawDoor(now);
    drawClock(now);
    drawMirror(now);
    drawShelf(now);
    drawBell(now);
    drawRoomFog(now);
    drawCustomer(now);
    drawCounterTop(now);
    drawHands(now);
    drawDrawer();
    drawLight(now);
    drawDust(now);
    drawFx(now);
    drawHL();
  }

  /* ============================================================
     ТИТУЛЬНАЯ СЦЕНА: лавка снаружи
     ============================================================ */
  /* антиквенный пиксельный шрифт для вывески: высота 9, толстые основные штрихи, засечки */
  const GLYPH = {
    'Л': ['..######', '...#.##.', '...#.##.', '...#.##.', '..##.##.', '..#..##.', '..#..##.', '.##..##.', '##..####'],
    'О': ['..####..', '.##..##.', '##....##', '##....##', '##....##', '##....##', '##....##', '.##..##.', '..####..'],
    'М': ['###...###', '.##...##.', '.###.###.', '.##.#.##.', '.##.#.##.', '.##...##.', '.##...##.', '.##...##.', '####.####'],
    'Б': ['#######.', '.##...#.', '.##.....', '.#####..', '.##..##.', '.##...##', '.##...##', '.##..##.', '######..'],
    'А': ['...##....', '...###...', '..#.##...', '..#.##...', '.#...##..', '.#######.', '#.....##.', '#.....##.', '###..####'],
    'Р': ['######..', '.##..##.', '.##...##', '.##...##', '.##..##.', '.#####..', '.##.....', '.##.....', '####....'],
    'Д': ['..######.', '...#..##.', '...#..##.', '...#..##.', '..#...##.', '..#...##.', '.#....##.', '#########', '#.......#'],
    'Ъ': ['####....', '#.##....', '..##....', '..#####.', '..##..##', '..##..##', '..##..##', '..##.##.', '.#####..']
  };
  function signTextWidth(txt) { let w = 0; for (let i = 0; i < txt.length; i++) w += (GLYPH[txt[i]] ? GLYPH[txt[i]][0].length : 4) + (i ? 2 : 0); return w; }
  /* буквы краской «под золото»: тень, светлый верх, облупившиеся точки и редкий отблеск */
  function drawSignText(txt, x, y, now) {
    const t = (now % 9000) / 1500, bx = x - 6 + t * (signTextWidth(txt) + 12);
    [0, 1].forEach(function (pass) {
      let cx = x;
      for (let i = 0; i < txt.length; i++) {
        const gl = GLYPH[txt[i]]; if (!gl) { cx += 6; continue; }
        for (let r = 0; r < gl.length; r++) for (let c2 = 0; c2 < gl[r].length; c2++) {
          if (gl[r][c2] !== '#') continue;
          const px = cx + c2, py = y + r;
          if (pass === 0) { R(px + 1, py + 1, 1, 1, '#06110c'); continue; }
          const wear = hsh(px * 7 + py * 13, 99);
          if (wear > 0.965) continue;                                                      // краска облезла
          let col = r === 0 ? '#e8d6a2' : r >= gl.length - 2 ? '#b09860' : '#d4be86';
          if (wear > 0.9) col = '#8e7c50';
          if (t < 1 && Math.abs(px - bx - (py - y) * 0.6) < 1.2) col = '#fff4cc';           // отблеск сусального золота
          R(px, py, 1, 1, col);
        }
        cx += gl[0].length + 2;
      }
    });
  }
  /* вывеска: деревянная рама, эмаль бутылочного цвета, золотая окантовка и ромбы */
  function drawSign(now, fl) {
    R(131, 62, 126, 24, '#0e0804');
    R(132, 63, 124, 22, '#3a2616'); R(132, 63, 124, 1, '#5e4229'); R(132, 63, 1, 22, '#4e3622');
    R(132, 84, 124, 1, '#1a0f07'); R(255, 63, 1, 22, '#1e1208'); R(134, 65, 120, 1, '#24160c');
    const fx = 135, fy = 66, fw = 118, fh = 17;
    R(fx, fy, fw, fh, '#13261f');
    g.fillStyle = 'rgba(255,214,150,' + (0.07 * fl).toFixed(3) + ')'; g.fillRect(fx, fy, fw, 7);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(fx, fy + 12, fw, 5);
    for (let k = 0; k < 14; k++) {                                                          // трещинки и сколы эмали
      const px = fx + Math.floor(hsh(k, 111) * fw), py = fy + Math.floor(hsh(k, 112) * fh);
      if (hsh(k, 113) > 0.5) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px, py, 2 + Math.floor(hsh(k, 114) * 5), 1); }
      else R(px, py, 1, 1, '#3a2a1c');
    }
    const pc = '#9a8452';                                                                   // окантовка со скруглёнными углами
    R(fx + 4, fy + 2, fw - 8, 1, pc); R(fx + 4, fy + fh - 3, fw - 8, 1, pc);
    R(fx + 2, fy + 4, 1, fh - 8, pc); R(fx + fw - 3, fy + 4, 1, fh - 8, pc);
    [[fx + 3, fy + 3], [fx + fw - 4, fy + 3], [fx + 3, fy + fh - 4], [fx + fw - 4, fy + fh - 4]].forEach(function (q) { R(q[0], q[1], 1, 1, pc); });
    const tw = signTextWidth('ЛОМБАРД'), tx = Math.round(fx + fw / 2 - tw / 2), ty = fy + 4;
    [tx - 9, tx + tw + 8].forEach(function (dx) {                                          // ромбы по бокам
      const dy = fy + 8;
      R(dx - 2, dy, 5, 1, pc); R(dx - 1, dy - 1, 3, 3, pc); R(dx, dy - 2, 1, 5, pc); R(dx, dy, 1, 1, '#e0cc94');
      R(dx < tx ? dx - 7 : dx + 3, dy, 5, 1, '#6e5e3a');
    });
    drawSignText('ЛОМБАРД', tx, ty, now);
    // фонарики-«гусиные шеи» над вывеской
    [152, 236].forEach(function (lx) { R(lx, 57, 1, 5, '#141a19'); R(lx, 57, 3, 1, '#141a19'); R(lx - 3, 61, 7, 2, '#1c2422'); R(lx - 2, 63, 5, 1, '#ffe0a0'); });
  }

  /* знак ломбарда: три золотых шара на кованом кронштейне, покачиваются на ветру */
  function drawPawnBalls(now) {
    const ir = '#323c3a', hi = '#4a5654';
    R(94, 68, 22, 2, ir); R(94, 68, 22, 1, hi);                                             // кронштейн из стены
    R(114, 66, 3, 6, ir);                                                                   // крепление к пилястре
    pline(115, 80, 104, 70, ir);                                                            // укосина
    R(92, 66, 2, 1, ir); R(91, 67, 1, 2, ir); R(92, 69, 2, 1, ir);                          // завиток на конце
    for (let k = 0; k < 3; k++) R(106 + k * 3, 71 + k * 2, 2, 1, hi);                       // ажур
    const sw = Math.round(Math.sin(now / 1500) * 1.2);
    R(100, 70, 1, 3, '#5a5a54'); R(100 + Math.round(sw / 2), 73, 1, 2, '#5a5a54');          // цепочка
    R(96 + sw, 75, 9, 1, '#5a5a54');
    [[97, 76], [104, 76], [100, 83]].forEach(function (b) {
      const bx = b[0] + sw, by = b[1];
      [3, 5, 7, 7, 7, 5, 3].forEach(function (wd, r) { R(bx - Math.floor(wd / 2), by + r, wd, 1, r < 2 ? '#d2ae56' : r > 4 ? '#7a5c26' : '#ad8a3e'); });
      R(bx - 2, by + 1, 2, 1, '#f8e8b0'); R(bx - 2, by + 2, 1, 1, '#f0d890'); R(bx + 2, by + 4, 1, 1, '#5e4420');
    });
    g.globalCompositeOperation = 'lighter'; glow(100, 81, 10, '220,170,80', 0.08); g.globalCompositeOperation = 'source-over';
  }

  /* пиксельная линия (Брезенхэм) */
  function pline(x0, y0, x1, y1, col) {
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (let n = 0; n < 200; n++) {
      R(x0, y0, 1, 1, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }

  /* каменное крыльцо в три ступени с коваными перилами */
  function drawPorch(now, fl) {
    const steps = [[204, 254, 172], [200, 258, 177], [196, 262, 182]];
    steps.forEach(function (s, i) {
      const x0 = s[0], x1 = s[1], y = s[2], w = x1 - x0;
      R(x0, y, w, 2, '#3c3b37'); R(x0, y, w, 1, '#4c4b46');                                  // проступь
      R(x0, y + 2, w, 3, '#252523'); R(x0, y + 2, w, 1, '#1a1a18');                          // подступёнок
      R(x0, y, 1, 5, '#1c1c1a'); R(x1 - 1, y, 1, 5, '#1c1c1a');
      for (let k = 0; k < 5; k++) {                                                         // сколы и истёртость
        const px = x0 + 2 + Math.floor(hsh(k + i * 9, 121) * (w - 4));
        R(px, y, 2, 1, hsh(k + i * 9, 122) > 0.5 ? '#2e2d2a' : '#55534d');
      }
      g.fillStyle = 'rgba(190,210,210,0.07)'; g.fillRect(x0 + 3, y, w - 6, 1);              // мокрый блеск
    });
    // тёплый свет из дверного стекла на верхней ступени
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(220,150,70,' + (0.12 * fl).toFixed(3) + ')'; g.fillRect(214, 172, 30, 2);
    g.globalCompositeOperation = 'source-over';
    // перила: стойки, поручень, балясины и завиток внизу
    const ir = '#0e1413', hi = '#1e2826';
    [[204, 197, 1], [253, 260, -1]].forEach(function (p) {
      const xt = p[0], xb = p[1], d = p[2];
      R(xt, 150, 1, 22, ir); R(xt - d, 150, 1, 22, hi);
      R(xb, 163, 1, 19, ir); R(xb + (d > 0 ? 1 : -1) * -1, 163, 1, 19, hi);
      pline(xt, 150, xb, 163, ir); pline(xt, 151, xb, 164, hi);
      const xm = Math.round((xt + xb) / 2); R(xm, 157, 1, 20, ir);
      R(xb - d, 164, 1, 1, ir); R(xb - 2 * d, 165, 1, 2, ir); R(xb - d, 167, 1, 1, ir);    // завиток
      R(xb - 1, 181, 3, 1, ir);
    });
  }

  /* ============================================================
     ТИТУЛ: ломбард на мокрой ночной улице
     ============================================================ */
  // дома: [x, ширина, высота]
  const TITLE_FAR = [[-4, 30, 58], [24, 28, 70], [88, 30, 52], [282, 30, 66], [318, 26, 54], [356, 34, 62]];
  const TITLE_MID = [[-16, 62, 74], [44, 62, 62], [280, 50, 70], [328, 70, 82]];

  /* дымок из трубы */
  function smoke(x, y, now, seed, a) {
    for (let k = 0; k < 8; k++) {
      const t = ((now / 4600) + k / 8 + hsh(seed, 1)) % 1;
      const px = x + t * 14 + Math.sin(now / 900 + k + seed) * 1.5, py = y - t * 22;
      const s = 1 + Math.floor(t * 3), al = (1 - t) * (t < 0.1 ? t * 10 : 1) * a;
      g.fillStyle = 'rgba(140,156,152,' + al.toFixed(3) + ')';
      g.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
    }
  }

  /* дом: штукатурка, низкая вальмовая кровля со свесом, трубы, окна в откосах
     с переплётами и подоконниками; окна иногда зажигаются и гаснут */
  function house(x, base, w, h, rh, col, i, now, lit, o) {
    o = o || {};
    const top = base - h, hex = col[0] === '#';
    const roof = hex ? sh(col, 0.8) : col, dk = hex ? sh(col, 0.6) : col, lt = hex ? sh(col, 1.35) : col;
    R(x, top, w, h, col);
    const rr = Math.min(rh, 6);
    R(x - 2, top - 1, w + 4, 2, dk);                                                    // свес карниза
    for (let r = 0; r < rr; r++) R(x - 1 + (r + 1) * 2, top - 2 - r, w + 2 - (r + 1) * 4, 1, roof);
    const nch = 1 + (i % 2);
    for (let k = 0; k < nch; k++) {
      const chx = x + Math.round(w * (k ? 0.74 : 0.3)) - 1, cht = top - rr - 4 - (i + k) % 3;
      R(chx, cht, 3, top - cht - 1, roof); R(chx - 1, cht, 5, 1, dk);
      if (o.smoke) smoke(chx + 1, cht - 1, now, i * 3 + k, o.smoke);
    }
    R(x, top + 1, w, 1, lt);                                                            // тяга карниза
    if (o.plinth) R(x, base - 5, w, 5, dk);
    const ww = o.ww || 4, wh = o.wh || 6, gx = o.gx || 9, gy = o.gy || 14;
    const cols = Math.max(1, Math.floor((w - 4) / gx)), rows = Math.max(1, Math.floor((h - 8) / gy));
    const x0 = x + Math.round((w - (cols - 1) * gx - ww) / 2);
    for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) {
      const wx = x0 + c2 * gx, wy = top + 5 + r * gy;
      if (wy + wh > base - (o.plinth ? 7 : 2)) continue;
      const k = i * 31 + r * 7 + c2, on = lit > 0 && hsh(k, Math.floor(now / 9000 + hsh(k, 2) * 9)) > 0.72;
      R(wx - 1, wy - 1, ww + 2, wh + 2, dk);
      if (on) {
        R(wx, wy, ww, wh, 'rgba(206,140,62,' + (0.85 * lit).toFixed(2) + ')');
        R(wx, wy + 1, ww, Math.ceil(wh / 2), 'rgba(250,198,118,' + (0.4 * lit).toFixed(2) + ')');
        if (hsh(k, 3) > 0.45) R(wx, wy, Math.max(1, Math.floor(ww / 2) - 1), wh, 'rgba(96,34,22,' + (0.55 * lit).toFixed(2) + ')');
      } else {
        R(wx, wy, ww, wh, hex ? sh(col, 0.5) : col);
        if (hex) R(wx + ww - 1, wy, 1, 1, sh(col, 1.2));                                // блик на тёмном стекле
      }
      if (ww >= 4) { R(wx + Math.floor(ww / 2), wy, 1, wh, dk); R(wx, wy + Math.floor(wh / 3), ww, 1, dk); }
      R(wx - 1, wy + wh + 1, ww + 2, 1, lt);
    }
  }

  /* церковь с луковкой и пожарная каланча — далеко, в тумане */
  function church(x, base, col) {
    R(x, base - 38, 26, 38, col);
    for (let r = 0; r < 4; r++) R(x + 1 + r * 2, base - 39 - r, 24 - r * 4, 1, col);
    R(x + 8, base - 56, 10, 14, col);
    [4, 6, 7, 7, 6, 5, 3, 2, 1, 1].forEach(function (hw, r) { R(x + 13 - hw, base - 57 - r, hw * 2, 1, col); });
    R(x + 12, base - 73, 2, 7, col); R(x + 10, base - 70, 6, 1, col); R(x + 11, base - 68, 4, 1, col);
  }
  function watchtower(x, base, col, now) {
    R(x, base - 66, 8, 66, col); R(x - 2, base - 70, 12, 4, col); R(x - 3, base - 71, 14, 1, col);
    R(x + 1, base - 80, 6, 10, col); R(x + 2, base - 84, 4, 4, col); R(x + 3, base - 90, 2, 6, col);
    if (Math.sin(now / 1400) > 0) R(x + 3, base - 78, 2, 2, 'rgba(200,80,50,0.5)');      // дежурный огонёк
  }

  /* лужа: неровное пятно; refl — что в ней отражается */
  function puddle(cx, y, w, h, seed, now, refl) {
    for (let r = 0; r < h; r++) {
      const t = (r + 0.5) / h, half = w / 2 * Math.sqrt(1 - (2 * t - 1) * (2 * t - 1)) * (0.86 + hsh(r + seed, 61) * 0.2);
      const lx = Math.round(cx - half), rx = Math.round(cx + half);
      R(lx, y + r, rx - lx, 1, '#090d0e');
      if (r === 0) R(lx + 2, y, rx - lx - 4, 1, '#1a2426');
      refl.forEach(function (f) {
        const jit = Math.round(Math.sin(now / 210 + r * 1.7 + seed) * 1);
        const a0 = Math.max(lx, f.x0 + jit), a1 = Math.min(rx, f.x1 + jit);
        for (let px = a0; px < a1; px++) {                       // вертикальные дрожащие блики
          const st = 0.35 + 0.65 * hsh(px * 3 + Math.floor(now / 260 + r * 0.3), 77);
          g.fillStyle = 'rgba(' + f.col + ',' + (f.a * st * (1 - t * 0.6)).toFixed(3) + ')'; g.fillRect(px, y + r, 1, 1);
        }
      });
    }
    // круги от капель
    for (let k = 0; k < 3; k++) {
      const ph = now / 650 + hsh(seed + k, 71), idx = Math.floor(ph), t = ph - idx;
      const px = cx + (hsh(seed * 7 + k + idx * 13, 72) - 0.5) * w * 0.7, py = y + h * (0.3 + hsh(seed + k + idx * 5, 73) * 0.4);
      const rad = 0.8 + t * 4;
      g.strokeStyle = 'rgba(200,214,214,' + ((1 - t) * 0.4).toFixed(3) + ')'; g.lineWidth = 1;
      g.beginPath(); g.ellipse(px, py, rad, rad * 0.35, 0, 0, Math.PI * 2); g.stroke();
    }
  }

  /* дождь: три слоя глубины, косые струи, подсветка в лучах фонарей, брызги */
  const RAIN = [
    { n: 80, len: 3, sp: 0.16, a: 0.08, w: 0.2 },
    { n: 55, len: 6, sp: 0.27, a: 0.13, w: 0.23 },
    { n: 24, len: 11, sp: 0.46, a: 0.2, w: 0.27 }
  ];
  function drawRain(now, lamps) {
    g.lineWidth = 1;
    const span = H + 30;
    RAIN.forEach(function (L, li) {
      for (let i = 0; i < L.n; i++) {
        const y = ((now * L.sp * (0.85 + hsh(i, li * 9 + 2) * 0.3) + hsh(i, li * 9 + 1) * span) % span) - 15;
        const x = ((hsh(i, li * 9 + 3) * (W + 60) + y * L.w) % (W + 60)) - 30;
        let a = L.a, col = '186,204,208';
        lamps.forEach(function (lp) {
          if (y < lp.y || y > lp.y + lp.h) return;
          const d = (y - lp.y) / lp.h, hw = lp.top / 2 + (lp.bot - lp.top) / 2 * d, dx = Math.abs(x - lp.x);
          if (dx < hw) { a += (1 - dx / hw) * (1 - d * 0.6) * lp.k; col = lp.col; }
        });
        g.strokeStyle = 'rgba(' + col + ',' + Math.min(0.75, a).toFixed(3) + ')';
        g.beginPath(); g.moveTo(x + 0.5, y); g.lineTo(x + 0.5 - L.len * L.w, y - L.len); g.stroke();
      }
    });
    const slot = Math.floor(now / 85);
    g.fillStyle = 'rgba(200,214,216,0.28)';
    for (let k = 0; k < 18; k++) {
      const s = k * 97 + slot * 13, x = Math.floor(hsh(s, 51) * W), y = 188 + Math.floor(hsh(s, 52) * 27);
      g.fillRect(x, y - 1, 1, 1); g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1);
    }
  }

  /* витрина изнутри: тёплая лампа, полки, хозяин за прилавком, самовар на окне */
  function shopWindowInside(x, y, w, h, now, fl, who) {
    const gr = g.createRadialGradient(x + 26, y + 13, 1, x + 28, y + 20, 64);
    gr.addColorStop(0, 'rgb(' + Math.round(255 * fl) + ',' + Math.round(214 * fl) + ',' + Math.round(140 * fl) + ')');
    gr.addColorStop(0.22, 'rgb(' + Math.round(214 * fl) + ',' + Math.round(140 * fl) + ',' + Math.round(66 * fl) + ')');
    gr.addColorStop(0.6, '#6a3818'); gr.addColorStop(1, '#2a1408');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(40,16,4,0.18)'; for (let k = x + 2; k < x + w; k += 4) g.fillRect(k, y, 1, 40);      // обои в полоску
    // полки с товаром
    [y + 19, y + 32].forEach(function (sy, si) {
      R(x, sy, w, 2, '#3a2010'); R(x, sy, w, 1, '#9a6430');
      for (let k = 0; k < 12; k++) {
        const ix = x + 6 + k * 5 + Math.floor(hsh(k, si + 80) * 2), ih = 3 + Math.floor(hsh(k, si + 81) * 6);
        if (ix > x + w - 4 || (ix > x + 40 && ix < x + 56)) continue;
        R(ix, sy - ih, 3, ih, '#2a1408'); R(ix, sy - ih, 1, ih, '#a8703a');
        if (hsh(k, si + 82) > 0.7) R(ix + 1, sy - ih - 1, 1, 1, '#2a1408');
      }
    });
    // хозяин за прилавком (дышит, иногда наклоняется к счётам)
    const bend = Math.sin(now / 7000) > 0.6 ? 2 : 0, br = Math.sin(now / 1300) > 0.3 ? 1 : 0;
    const ox = x + 46, oy = y + 16 + bend;
    if (who === false) {                                          // хозяйка вышла: за прилавком пусто, только табурет
      R(ox + 1, y + 34, 10, 2, '#1e0e06'); R(ox + 2, y + 36, 1, 4, '#1e0e06'); R(ox + 9, y + 36, 1, 4, '#1e0e06');
    } else {
    R(ox + 3, oy, 6, 7, '#1e0e06'); R(ox + 2, oy + 1, 8, 4, '#1e0e06'); R(ox + 4, oy - 1, 4, 1, '#1e0e06');
    R(ox + 4, oy + 7, 4, 2, '#1e0e06');
    for (let r = 0; r < 4; r++) R(ox + 2 - r, oy + 9 + r - br, 8 + r * 2, 1, '#1e0e06');
    R(ox - 2, oy + 13 - br, 16, 20, '#1e0e06');
    R(ox + 2, oy + 1, 1, 5, '#c07a38'); R(ox - 2, oy + 13 - br, 1, 12, '#a0642e');                     // контровой свет лампы
    }
    // прилавок внутри
    R(x, y + 40, w, 3, '#4a2a14'); R(x, y + 40, w, 1, '#b07438'); R(x, y + 43, w, h - 43, '#24120a');
    // висячая лампа
    R(x + 26, y, 1, 8, '#1a0c05');
    for (let r = 0; r < 4; r++) R(x + 24 - r, y + 8 + r, 5 + r * 2, 1, '#2a1a0c');
    R(x + 22, y + 12, 9, 1, '#e0a050'); R(x + 25, y + 12, 3, 2, '#fff4d0');
    // на подоконнике: самовар, подсвечник, кувшин
    const by = y + h;
    [8, 10, 12, 12, 12, 11, 10, 8, 6, 6, 8, 8, 4, 2].forEach(function (ww, r) { R(x + 10 - ww / 2, by - 3 - r, ww, 1, '#140904'); });
    R(x + 6, by - 3, 2, 3, '#140904'); R(x + 12, by - 3, 2, 3, '#140904');
    R(x + 16, by - 9, 3, 1, '#140904'); R(x + 18, by - 9, 1, 2, '#140904');                             // краник
    R(x + 4, by - 14, 1, 5, '#140904'); R(x + 15, by - 14, 1, 5, '#140904');                            // ручки
    R(x + 5, by - 15, 1, 9, '#d08a40'); R(x + 9, by - 17, 1, 2, '#d08a40');
    R(x + w - 11, by - 14, 1, 14, '#140904'); R(x + w - 14, by - 1, 7, 1, '#140904');
    R(x + w - 15, by - 10, 9, 1, '#140904'); R(x + w - 15, by - 13, 1, 3, '#140904'); R(x + w - 7, by - 13, 1, 3, '#140904');
    if (Math.sin(now / 110) > -0.5) { R(x + w - 15, by - 15, 1, 2, '#ffd890'); R(x + w - 7, by - 15, 1, 2, '#ffd890'); R(x + w - 11, by - 16, 1, 2, '#ffe8b0'); }
    R(x + w - 26, by - 7, 5, 7, '#140904'); R(x + w - 25, by - 9, 3, 2, '#140904'); R(x + w - 26, by - 7, 1, 5, '#b07038');
    // занавеска: ламбрекен и боковая драпировка
    R(x, y, w, 3, '#4a1612'); for (let k = 0; k < w; k += 6) R(x + k + 1, y + 3, 4, 1, '#4a1612');
    R(x, y, 4, h, '#3a100c'); R(x + 1, y + 3, 1, h - 3, '#5a1c16'); R(x + 4, y + 3, 1, h - 6, '#3a100c');
    // стекло: улица в нём отражается, блики, запотевание, капли
    g.fillStyle = 'rgba(120,146,146,0.07)'; g.fillRect(x, y + h - 18, w, 18);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let k = 0; k < 2; k++) {
      g.beginPath(); g.moveTo(x + w - 18 + k * 7, y); g.lineTo(x + w - 13 + k * 7, y); g.lineTo(x + w - 31 + k * 7, y + h); g.lineTo(x + w - 36 + k * 7, y + h); g.closePath(); g.fill();
    }
    drawDrops(x, y, w, h, now, 12);
  }

  function drawShopFront(now, fl, who) {
    // --- кровля: крашеное кровельное железо
    R(108, 54, 172, 3, '#0d1211');
    for (let r = 0; r < 14; r++) R(112 + r * 3, 53 - r, 164 - r * 6, 1, r === 13 ? '#2c3a36' : (r > 10 ? '#202b28' : '#1a2321'));
    for (let x = 116; x < 274; x += 6) {
      const top = 53 - Math.min(13, Math.floor(Math.min(x - 112, 276 - x) / 3));
      R(x, top + 1, 1, 53 - top, '#232e2b');
    }
    // труба с дымом
    R(260, 37, 8, 13, '#3a2420');
    for (let y = 39; y < 50; y += 3) { R(260, y, 8, 1, '#22130f'); R(260 + ((y / 3) % 2 ? 2 : 5), y - 2, 1, 2, '#22130f'); }
    R(259, 37, 1, 13, '#4a302a'); R(258, 35, 12, 2, '#1e1410');
    smoke(264, 33, now, 5, 0.22);
    // --- карниз с сухариками
    R(114, 56, 160, 1, '#3e2a1a'); R(116, 57, 156, 5, '#2a1b11');
    for (let x = 118; x < 270; x += 4) R(x, 60, 2, 2, '#1a100a');
    R(116, 62, 156, 1, '#0e0806');
    // --- стены: горизонтальная обшивка доской
    for (let y = 63; y < 172; y += 4) {
      const v = hsh(y, 31);
      R(122, y, 144, 4, v > 0.66 ? '#2b1c12' : v > 0.33 ? '#281a10' : '#2e1e13');
      R(122, y, 144, 1, '#35241a'); R(122, y + 3, 144, 1, '#170e08');
      R(122 + Math.floor(hsh(y, 7) * 138), y + 1, 1, 2, '#1a1009');
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';                                                    // потёки под окном
    for (let k = 0; k < 9; k++) g.fillRect(132 + k * 8 + Math.floor(hsh(k, 33) * 4), 156, 2, 10 + Math.floor(hsh(k, 34) * 8));
    // пилястры по углам
    [116, 266].forEach(function (px) {
      R(px, 62, 6, 110, '#33221a'); R(px, 62, 1, 110, '#4a3322'); R(px + 5, 62, 1, 110, '#1a100a');
      R(px - 2, 62, 10, 3, '#3a281b'); R(px - 2, 62, 10, 1, '#4e3826'); R(px - 2, 167, 10, 5, '#3a281b');
    });
    // --- вывеска и знак ломбарда
    drawSign(now, fl);
    drawPawnBalls(now);
    // --- витрина
    R(128, 88, 76, 66, '#1a0f08'); R(129, 89, 74, 64, '#3a2616'); R(129, 89, 74, 1, '#58402a'); R(129, 89, 1, 64, '#4a3420');
    shopWindowInside(133, 93, 66, 56, now, fl, who);
    R(165, 93, 2, 56, '#2a1a0e'); R(165, 93, 1, 56, '#3e2a1a');
    R(133, 105, 66, 2, '#2a1a0e'); R(133, 105, 66, 1, '#3e2a1a');
    R(149, 93, 1, 12, '#2a1a0e'); R(182, 93, 1, 12, '#2a1a0e');
    R(125, 152, 82, 3, '#3a2616'); R(125, 152, 82, 1, '#5a4028'); R(126, 155, 80, 1, '#120a05');
    // --- дверь: филёнки, остеклённый верх с табличкой
    R(208, 92, 42, 80, '#140c07'); R(211, 95, 36, 77, '#2a1a0e'); R(211, 95, 1, 77, '#3a2616');
    R(215, 99, 28, 30, '#120a05');
    const dg = g.createLinearGradient(0, 100, 0, 128);
    dg.addColorStop(0, 'rgb(' + Math.round(150 * fl) + ',' + Math.round(92 * fl) + ',' + Math.round(40 * fl) + ')'); dg.addColorStop(1, '#2a1608');
    g.fillStyle = dg; g.fillRect(216, 100, 26, 28);
    g.fillStyle = 'rgba(210,180,140,0.16)'; g.fillRect(216, 100, 26, 28);
    g.fillStyle = 'rgba(60,30,10,0.35)'; for (let k = 218; k < 242; k += 3) g.fillRect(k, 100, 1, 28);   // складки тюля
    R(228, 100, 2, 28, '#2a1a0e'); R(216, 113, 26, 1, '#2a1a0e');
    R(223, 104, 1, 3, '#1a1008'); R(234, 104, 1, 3, '#1a1008'); R(221, 107, 16, 6, '#d2c29a'); R(223, 109, 12, 1, '#4a3a24'); R(225, 111, 8, 1, '#7a6a4a');
    drawDrops(216, 100, 26, 28, now + 2000, 4);
    R(211, 129, 36, 4, '#33210f'); R(211, 129, 36, 1, '#46301a');
    [215, 230].forEach(function (px) {
      R(px, 134, 13, 30, '#1e1208'); R(px + 1, 135, 11, 28, '#2e1d10');
      R(px + 1, 135, 11, 1, '#45301c'); R(px + 1, 135, 1, 28, '#3c2817'); R(px + 1, 162, 11, 1, '#160d06'); R(px + 11, 135, 1, 28, '#1a1008');
      R(px + 3, 138, 7, 22, '#2a1a0e');
    });
    R(242, 146, 2, 4, '#b8923e'); R(242, 146, 1, 1, '#f0d890'); R(242, 152, 1, 2, '#0a0604');
    R(212, 165, 34, 3, '#4a3c22'); R(212, 165, 34, 1, '#6a5a34');
    R(209, 169, 40, 3, '#3a3934'); R(209, 169, 40, 1, '#4e4c46');                             // порог
    // козырёк над дверью на кованых кронштейнах, с него капает
    for (let r = 0; r < 6; r++) R(205 - r, 85 + r, 48 + r * 2, 1, r === 5 ? '#2c3836' : '#1a2321');
    for (let k = 200; k < 258; k += 3) R(k, 91, 2, 1, '#2c3836');
    [209, 248].forEach(function (bx) { R(bx, 92, 1, 7, '#121816'); R(bx + (bx < 230 ? 1 : -2), 98, 2, 1, '#121816'); R(bx + (bx < 230 ? 2 : -2), 96, 1, 2, '#121816'); });
    for (let k = 0; k < 4; k++) {
      const t = (now / 620 + hsh(k, 91)) % 1;
      g.fillStyle = 'rgba(200,216,216,' + (0.45 * (1 - t * 0.5)).toFixed(3) + ')'; g.fillRect(203 + k * 16, Math.round(92 + t * (k === 0 || k === 3 ? 92 : 78)), 1, 2);
    }
    // настенный фонарь у двери
    R(250, 99, 5, 1, '#141a19'); R(254, 95, 7, 2, '#141a19'); R(255, 94, 5, 1, '#141a19');
    g.fillStyle = 'rgba(255,200,110,' + (0.55 * fl).toFixed(3) + ')'; g.fillRect(255, 97, 5, 8);
    R(257, 99, 1, 3, '#fff0c0'); R(254, 97, 1, 8, '#141a19'); R(260, 97, 1, 8, '#141a19'); R(254, 105, 7, 2, '#141a19'); R(256, 107, 3, 1, '#141a19');
    // водосточная труба
    R(272, 54, 8, 3, '#1e2624'); R(274, 57, 3, 125, '#1c2422'); R(274, 57, 1, 125, '#2e3a38');
    for (let y = 70; y < 180; y += 30) R(273, y, 5, 1, '#121816');
    R(274, 181, 7, 2, '#1c2422');
    // цоколь из рваного камня
    R(114, 172, 160, 14, '#121210');
    for (let ri = 0; ri < 2; ri++) {
      const y = 172 + ri * 7;
      for (let x = 114 - ri * 5; x < 274;) {
        const bw = 9 + Math.floor(hsh(x * 3 + ri, 41) * 9), x0 = Math.max(114, x), x1 = Math.min(274, x + bw - 1);
        if (x1 > x0) {
          R(x0, y, x1 - x0, 6, ['#2a2926', '#302e2a', '#262522'][Math.floor(hsh(x, ri + 43) * 3)]);
          R(x0, y, x1 - x0, 1, '#3e3c37'); R(x1 - 1, y + 1, 1, 5, '#1a1917');
          if (hsh(x, ri + 44) > 0.7) R(x0 + 1, y + 5, 3, 1, '#1e281c');
        }
        x += bw;
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(114, 179, 160, 7);
    drawPorch(now, fl);
  }

  function drawStreetLamp(now, lampF) {
    R(326, 178, 10, 6, '#0c1110'); R(325, 183, 12, 2, '#0c1110'); R(328, 168, 6, 10, '#0e1413');
    R(330, 66, 2, 104, '#0c1110'); R(330, 66, 1, 104, '#1a2220');
    R(329, 120, 4, 2, '#141c1b'); R(329, 150, 4, 2, '#141c1b'); R(328, 64, 6, 3, '#141c1b');
    R(327, 63, 8, 2, '#0e1413'); R(326, 53, 10, 2, '#0e1413'); R(328, 51, 6, 2, '#0e1413'); R(330, 48, 2, 3, '#0e1413');
    g.fillStyle = 'rgba(255,226,150,' + (0.85 * lampF).toFixed(3) + ')'; g.fillRect(327, 55, 8, 8);
    R(327, 55, 1, 8, '#0e1413'); R(331, 55, 1, 8, '#0e1413'); R(334, 55, 1, 8, '#0e1413');
    if (lampF > 0.5) R(329, 58, 2, 3, '#fff6d8');
  }

  function drawTitle(now) {
    const fl = 0.86 + Math.sin(now / 130) * 0.04 + Math.sin(now / 47) * 0.02 + (Math.random() < 0.02 ? -0.12 : 0);
    const lampF = (Math.sin(now / 1700) > 0.965 && Math.random() < 0.5) ? 0.3 : 1;
    // небо и луна за туманом
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#071012'); grd.addColorStop(0.55, '#142019'); grd.addColorStop(1, '#1e2b27');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    glow(62, 26, 76, '160,182,172', 0.12);
    // дальний город: крыши, луковка церкви, каланча
    church(54, 158, '#18241f');
    watchtower(300, 160, '#18241f', now);
    TITLE_FAR.forEach(function (b, i) { house(b[0], 160, b[1], b[2], 4, '#18241f', i, now, 0.3, { ww: 3, wh: 4, gx: 7, gy: 11 }); });
    drawFogBlobs(0, 74, W, 100, now, 8);
    // средний план: двухэтажные дома по сторонам
    TITLE_MID.forEach(function (b, i) { house(b[0], 180, b[1], b[2], 5, '#101818', i + 20, now, 0.85, { ww: 6, wh: 9, gx: 14, gy: 24, plinth: true, smoke: 0.14 }); });
    R(0, 180, W, 6, '#0d1213');
    drawFogBlobs(0, 120, W, 66, now + 2500, 5);
    // ломбард
    drawShopFront(now, fl);
    // тротуар из плит и бордюр
    R(0, 186, W, 30, '#06090a');
    for (let x = -6; x < W; x += 21) { R(x + 1, 187, 20, 5, '#1a2021'); R(x + 1, 187, 20, 1, '#262e2f'); }
    R(0, 192, W, 2, '#2a3031'); R(0, 192, W, 1, '#3a4243');
    // мостовая: булыжник в перспективе
    let yy = 195;
    [4, 5, 6, 7].forEach(function (rh, r) {
      const sw = rh * 2 + 3;
      for (let x = -((r % 2) * Math.floor(sw / 2)); x < W; x += sw) {
        const v = hsh(x * 5 + r, 47);
        R(x + 1, yy, sw - 2, rh - 1, v > 0.66 ? '#161c1e' : v > 0.33 ? '#131a1b' : '#192022');
        R(x + 2, yy, sw - 4, 1, '#263031');
        if (v > 0.85) R(x + 3, yy + 1, 2, 1, '#34403f');
      }
      yy += rh;
    });
    // лужи: в одной отражается витрина, в другой — фонарь
    puddle(170, 200, 96, 5, 3, now, [
      { x0: 135, x1: 164, col: '220,146,70', a: 0.26 * fl }, { x0: 168, x1: 197, col: '220,146,70', a: 0.26 * fl }]);
    puddle(312, 207, 70, 4, 9, now, [
      { x0: 328, x1: 334, col: '240,220,150', a: 0.4 * lampF }, { x0: 296, x1: 304, col: '220,150,80', a: 0.12 * fl }]);
    // свет из окна ложится на тротуар, тень от переплёта
    g.globalCompositeOperation = 'lighter';
    const sp = g.createLinearGradient(0, 186, 0, 216);
    sp.addColorStop(0, 'rgba(230,150,70,' + (0.2 * fl).toFixed(3) + ')'); sp.addColorStop(1, 'rgba(230,150,70,0)');
    g.fillStyle = sp; g.beginPath(); g.moveTo(130, 186); g.lineTo(204, 186); g.lineTo(228, 216); g.lineTo(112, 216); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.moveTo(165, 186); g.lineTo(167, 186); g.lineTo(171, 216); g.lineTo(166, 216); g.closePath(); g.fill();
    // уличный фонарь (изредка мигает) и тот, кто под ним стоит
    drawStreetLamp(now, lampF);
    const cyc = (now / 1000) % 26;
    if (cyc > 14 && cyc < 21) {
      const a = Math.min(1, (cyc - 14) * 2) * Math.min(1, (21 - cyc) * 3);
      g.globalAlpha = a;
      R(342, 124, 14, 62, '#040606'); R(345, 112, 8, 12, '#040606'); R(342, 110, 14, 2, '#040606'); R(345, 92, 8, 18, '#040606');
      if (Math.sin(now / 120) > -0.7) { R(347, 116, 1, 1, '#d8d8c0'); R(350, 116, 1, 1, '#d8d8c0'); }
      g.globalAlpha = 1;
    }
    // туман у земли
    drawFogBlobs(0, 156, W, 56, now + 5000, 4);
    // свет: фонари рассеиваются в тумане
    g.globalCompositeOperation = 'lighter';
    glow(331, 59, 46, '230,206,140', 0.22 * lampF);
    cone(331, 63, 8, 100, 124, '230,206,140', 0.085 * lampF);
    g.save(); g.translate(331, 189); g.scale(1, 0.22); glow(0, 0, 54, '230,206,140', 0.26 * lampF); g.restore();
    glow(257, 101, 28, '255,190,90', 0.22 * fl);
    glow(152, 66, 16, '255,210,140', 0.16 * fl); glow(236, 66, 16, '255,210,140', 0.16 * fl);
    glow(166, 121, 64, '230,150,60', 0.08 * fl);
    g.globalCompositeOperation = 'source-over';
    // дождь поверх всего; струи вспыхивают в лучах фонаря и витрины
    drawRain(now, [
      { x: 331, y: 63, h: 124, top: 8, bot: 100, k: 0.55 * lampF, col: '255,236,180' },
      { x: 166, y: 150, h: 66, top: 70, bot: 116, k: 0.3 * fl, col: '255,196,120' },
      { x: 257, y: 104, h: 60, top: 10, bot: 50, k: 0.3 * fl, col: '255,206,140' }
    ]);
    drawFx(now);
  }

  /* ============================================================
     ГОРОД: вечерние локации
     ============================================================ */
  function sky(c1, c2, h) {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fillRect(0, 0, W, h);
  }
  function clockFace(x, y, r, rim) {              // все часы Гофмана стоят на без четверти три
    ell(x, y, r + 1.5, r + 1.5, rim); ell(x, y, r, r, '#cfc6a8');
    g.strokeStyle = '#1a1410'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + r * 0.5, y - r * 0.12); g.stroke();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - r * 0.8, y); g.stroke();
  }
  const LOC = {
    market: { out: true, dark: 0.42, lights: [[68, 72, 70], [318, 72, 70], [192, 76, 120]],
      back: function () {
        sky('#161e2c', '#6a4f4a', 126);
        for (let i = 0; i < 8; i++) {
          const hx = i * 52 - 10, hy = 66 + (i * 17) % 24;
          R(hx, hy, 48, 70, i % 2 ? '#121822' : '#161c26'); R(hx + 10, hy - 9, 7, 9, '#121822');
          R(hx + 8 + (i * 7) % 20, hy + 12, 5, 6, i % 3 ? '#0c1016' : '#8a6a30');
        }
        R(296, 22, 18, 110, '#0e141c'); R(300, 8, 10, 16, '#0e141c'); R(304, 0, 2, 9, '#0e141c'); R(301, 3, 8, 2, '#0e141c');
        R(0, 124, W, 92, '#1a1714');
        for (let i = 0; i < 50; i++) R((i * 61) % W, 128 + (i * 13) % 80, 10, 1, '#221e1a');
        [[12, '#7a2e2a'], [262, '#2e5a48']].forEach(function (s) {
          const x = s[0];
          R(x + 4, 52, 3, 74, '#2a1c12'); R(x + 104, 52, 3, 74, '#2a1c12');
          for (let k = 0; k < 11; k++) { R(x + k * 10, 44, 10, 12, k % 2 ? s[1] : '#c8b890'); R(x + k * 10 + 2, 56, 6, 3, k % 2 ? s[1] : '#c8b890'); }
          R(x, 42, 110, 2, '#3a2a1c');
          R(x + 2, 100, 108, 5, '#4b3524'); R(x + 2, 105, 108, 20, '#2a1c14');
          for (let k = 0; k < 9; k++) R(x + 8 + k * 11, 92 + (k % 3) * 2, 7, 8 - (k % 3) * 2, ['#8a6a2a', '#5a7a5a', '#a04030', '#c9c9d2', '#6a4a2a'][k % 5]);
          R(x + 56, 58, 1, 10, '#1a1410'); R(x + 53, 68, 7, 9, '#3a2a1a'); R(x + 55, 70, 3, 5, '#ffcf70');
        });
      },
      front: function () {
        R(96, 124, 192, 6, '#5a4030'); R(96, 124, 192, 1, '#7a5a40'); R(100, 130, 184, 30, '#3a2a1c');
        for (let k = 0; k < 10; k++) R(104 + k * 20, 132, 1, 26, '#2a1c12');
        ell(118, 168, 16, 16, '#1c140e'); ell(118, 168, 11, 11, '#3a2a1c'); ell(266, 168, 16, 16, '#1c140e'); ell(266, 168, 11, 11, '#3a2a1c');
        [['alarm', '#a04030', '#e8e2c8'], ['book', '#2a4a3a', '#e0c070'], ['lamp', '#a08040', '#ffcf70'], ['spoons', '#c9c9d2'], ['doll', '#e8dcd0', '#6a2a3a'], ['umbrella', '#1a1a22', '#6a4a2a'], ['horseshoe', '#6a6a70']]
          .forEach(function (ic, k) { drawIcon(ic, 104 + k * 26, 110, 1); });
      },
      dyn: function (now) { drawFogBlobs(0, 90, W, 50, now, 6); } },

    agata: { dark: 0.5, lights: [[49, 100, 84], [192, 72, 124]],
      back: function () {
        R(0, 0, W, 126, '#3a2a1e');
        for (let x = 0; x < W; x += 16) R(x, 0, 1, 126, '#2e2118');
        for (let y = 20; y < 126; y += 26) R(0, y, W, 1, '#32241a');
        R(0, 0, W, 8, '#241810');
        for (let k = 0; k < 16; k++) {
          const x = 14 + k * 23, h = 14 + (k * 7) % 12;
          R(x + 3, 8, 1, 5, '#8a7a5a'); R(x, 12, 7, h, ['#5a6a3a', '#7a7a3a', '#6a5a7a', '#8a6a3a'][k % 4]); R(x + 1, 12 + h, 5, 3, ['#4a5a2a', '#6a6a2a', '#5a4a6a', '#7a5a2a'][k % 4]);
        }
        R(14, 44, 70, 82, '#b8b0a0'); R(14, 44, 70, 3, '#d8d0c0');
        for (let y = 56; y < 124; y += 12) R(14, y, 70, 1, '#9a9282');
        for (let x = 26; x < 84; x += 12) R(x, 47, 1, 79, '#9a9282');
        R(32, 90, 34, 28, '#140c08'); R(30, 88, 38, 2, '#5a5248');
        R(292, 38, 56, 52, '#120c09'); R(296, 42, 48, 44, '#1e2a30'); R(319, 42, 2, 44, '#120c09'); R(296, 63, 48, 2, '#120c09'); R(288, 90, 64, 3, '#5a3f2e');
        R(290, 36, 10, 56, '#6a3a3a'); R(340, 36, 10, 56, '#6a3a3a');
        [56, 80, 106].forEach(function (y, r) {
          R(102, y, 58, 2, '#523a28');
          for (let k = 0; k < 6; k++) { R(105 + k * 9, y - 9, 6, 9, ['#5a7a5a', '#7a4a2a', '#3a2a4a', '#8a8a5a'][(k + r) % 4]); R(105 + k * 9, y - 10, 6, 1, '#c8c0a0'); }
          R(228, y, 52, 2, '#523a28');
          for (let k = 0; k < 5; k++) R(231 + k * 10, y - 8, 7, 8, ['#8a6a3a', '#5a6a7a', '#6a3a3a'][(k + r) % 3]);
        });
        R(356, 40, 18, 22, '#6b5628'); R(358, 42, 14, 18, '#3a1a1a'); ell(365, 49, 4, 4, '#c8a040'); R(364, 62, 2, 4, '#a04030');
      },
      front: function () {
        R(0, 124, W, 8, '#5a4030'); R(0, 124, W, 1, '#7a5a40'); R(0, 132, W, 84, '#2a1c14');
        R(110, 96, 22, 28, '#b8923e'); R(108, 100, 26, 4, '#d8b25e'); R(114, 88, 14, 8, '#b8923e'); R(118, 80, 6, 8, '#8a6a2a'); R(102, 108, 6, 2, '#b8923e'); R(134, 106, 8, 3, '#b8923e'); R(112, 96, 3, 28, '#e8d08a');
        R(146, 116, 9, 8, '#d8d0c0'); R(155, 118, 2, 4, '#d8d0c0'); R(290, 116, 9, 8, '#d8d0c0');
        R(250, 119, 26, 5, '#5a6a3a'); R(262, 117, 4, 2, '#8a7a5a'); R(318, 112, 16, 12, '#6a4a2a'); R(318, 112, 16, 2, '#f0f0ea');
      },
      dyn: function (now) {
        for (let k = 0; k < 5; k++) { const h = 7 + Math.sin(now / (90 + k * 23) + k) * 4; R(36 + k * 6, 116 - h, 4, h, k % 2 ? '#ffb040' : '#e06020'); }
      } },

    clock: { dark: 0.5, lights: [[58, 98, 84], [192, 72, 124]],
      back: function () {
        R(0, 0, W, 126, '#1c2824');
        for (let x = 0; x < W; x += 14) for (let y = 6; y < 124; y += 14) R(x + ((y / 14) % 2) * 7, y, 2, 2, '#243430');
        [[30, 30, 12], [66, 58, 8], [28, 80, 9], [98, 28, 7], [116, 70, 11], [142, 34, 6], [252, 30, 8], [278, 66, 12], [312, 30, 10], [344, 62, 8], [358, 26, 6], [318, 96, 7], [74, 100, 7], [240, 78, 6]]
          .forEach(function (q, i) {
            if (i % 3 === 0) { R(q[0] - q[2] - 3, q[1] - q[2] - 5, q[2] * 2 + 6, q[2] * 3 + 18, '#2a1b12'); R(q[0], q[1] + q[2] + 2, 1, q[2] + 6, '#8a6a2a'); ell(q[0], q[1] + q[2] * 2 + 9, 2.5, 2.5, '#b8923e'); }
            clockFace(q[0], q[1], q[2], i % 2 ? '#8a6a2a' : '#5a4a3a');
          });
        R(174, 12, 36, 30, '#3a281b'); R(170, 8, 44, 6, '#523a28'); R(188, 16, 8, 7, '#0e0906'); clockFace(192, 32, 6, '#8a6a2a');
      },
      front: function () {
        R(0, 124, W, 9, '#4b3524'); R(0, 124, W, 1, '#6e5038'); R(0, 133, W, 83, '#2a1c14');
        R(72, 92, 2, 32, '#5a5a62'); R(58, 88, 16, 4, '#5a5a62'); ell(56, 98, 9, 6, '#7a9aa0'); ell(56, 98, 7, 4, '#a8c8d0');
        [[120, 118, 5], [134, 120, 3], [300, 118, 6], [316, 120, 3], [254, 120, 4]].forEach(function (q) { ell(q[0], q[1], q[2], q[2], '#b8923e'); ell(q[0], q[1], q[2] * 0.4, q[2] * 0.4, '#3a2a1a'); });
        R(146, 121, 20, 2, '#c9c9d2'); R(226, 120, 18, 2, '#8a6a4a'); R(226, 120, 5, 2, '#c9c9d2');
        drawIcon(['watch', '#c9c9d2', '#e8e2c8'], 270, 110, 1); drawIcon(['alarm', '#a04030', '#e8e2c8'], 338, 110, 1);
      } },

    church: { dark: 0.58, lights: [[59, 90, 64], [327, 90, 64], [192, 72, 116]],
      back: function () {
        R(0, 0, W, 126, '#16161e');
        for (let y = 10; y < 126; y += 16) for (let x = ((y / 16) % 2) * 20; x < W; x += 40) R(x, y, 38, 1, '#1e1e28');
        [[26, 22], [322, 22]].forEach(function (w) { ell(w[0] + 18, w[1] + 12, 18, 14, '#283850'); R(w[0], w[1] + 12, 36, 62, '#283850'); R(w[0] + 17, w[1], 2, 74, '#101018'); R(w[0], w[1] + 40, 36, 2, '#101018'); });
        R(120, 14, 144, 112, '#4a3a1a'); R(124, 18, 136, 108, '#2a1a12');
        for (let r = 0; r < 2; r++) for (let k = 0; k < 5; k++) {
          const x = 128 + k * 26, y = 22 + r * 50;
          R(x, y, 22, 44, k % 2 ? '#3a1a1a' : '#1a2a3a'); R(x, y, 22, 1, '#8a7236');
          ell(x + 11, y + 13, 5, 5, '#c8a040'); ell(x + 11, y + 13, 3, 3, '#6a4a3a'); R(x + 6, y + 19, 10, 22, k % 2 ? '#5a2a2a' : '#2a3a5a');
        }
        R(120, 12, 144, 3, '#8a7236'); R(188, 0, 8, 12, '#8a7236'); R(184, 3, 16, 3, '#8a7236');
        [88, 282].forEach(function (x) { R(x, 0, 16, 126, '#262630'); R(x, 0, 3, 126, '#30303c'); R(x - 3, 118, 22, 8, '#30303c'); });
        R(366, 0, 1, 104, '#8a7a5a'); R(364, 104, 5, 8, '#8a7a5a');
        [[58, 96], [326, 96]].forEach(function (q) { R(q[0], q[1], 2, 30, '#8a7236'); R(q[0] - 8, q[1], 18, 2, '#8a7236'); for (let k = 0; k < 4; k++) R(q[0] - 7 + k * 5, q[1] - 7, 2, 7, '#e8e0c8'); });
      },
      front: function () {
        R(0, 124, W, 6, '#3a2a1c'); R(0, 124, W, 1, '#5a4030'); R(0, 130, W, 86, '#1e140e');
        R(250, 104, 26, 20, '#3a2a1c'); R(250, 104, 26, 2, '#8a7236'); R(259, 107, 8, 2, '#0a0806'); R(262, 111, 2, 9, '#8a7236'); R(259, 114, 8, 2, '#8a7236');
        for (let k = 0; k < 7; k++) R(112 + k * 5, 114, 3, 10, '#e8e0c8');
      },
      dyn: function (now) {
        [[58, 96], [326, 96]].forEach(function (q, j) {
          for (let k = 0; k < 4; k++) { const f = Math.sin(now / (70 + k * 19) + k + j) > 0 ? 1 : 0; R(q[0] - 7 + k * 5, q[1] - 10 - f, 2, 3 + f, '#ffcf70'); }
        });
      } },

    cemetery: { out: true, dark: 0.56, lights: [[300, 34, 80], [192, 78, 112]],
      back: function () {
        sky('#0a1016', '#243230', 126);
        glow(300, 34, 46, '200,210,190', 0.16);
        ell(300, 34, 12, 12, '#c8d0c0'); ell(296, 31, 3, 3, '#aab2a2'); ell(304, 38, 2, 2, '#b4bcac'); ell(302, 28, 1.5, 1.5, '#b4bcac');
        g.fillStyle = 'rgba(20,30,30,0.35)'; for (let k = 0; k < 4; k++) g.fillRect(278 + k * 3, 30 + k * 3, 44 - k * 6, 1);   // облако по луне
        R(0, 98, W, 118, '#121a16'); ell(120, 99, 160, 12, '#121a16'); ell(320, 100, 120, 10, '#121a16');
        R(338, 62, 30, 40, '#0c1210'); R(346, 48, 14, 16, '#0c1210'); R(352, 38, 2, 12, '#0c1210'); R(349, 42, 8, 2, '#0c1210');
        R(40, 30, 6, 72, '#0a0e0c');
        g.strokeStyle = '#0a0e0c'; g.lineWidth = 2;
        [[46, 44, 26, -8], [40, 52, -24, -10], [46, 62, 20, -4], [42, 36, -14, -16], [46, 34, 16, -18]].forEach(function (b) {
          g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] + b[2], b[1] + b[3]); g.lineTo(b[0] + b[2] * 1.5, b[1] + b[3] * 2.2); g.stroke();
        });
        for (let i = 0; i < 14; i++) {
          const x = 70 + (i * 47) % 270, y = 78 + (i * 29) % 26, col = y < 90 ? '#0e1412' : '#0a0e0c';
          if (i % 3 === 0) { R(x, y + 8, 12, 16, col); ell(x + 6, y + 8, 6, 5, col); }
          else { R(x + 4, y, 2, 24, col); R(x - 1, y + 6, 12, 2, col); if (i % 2) R(x + 1, y + 13, 8, 2, col); }
        }
      },
      front: function () {
        ell(292, 130, 40, 9, '#040606'); ell(248, 128, 22, 9, '#1c1610'); ell(242, 124, 12, 6, '#241c14');
        R(228, 94, 2, 34, '#5a4a3a'); R(224, 88, 10, 8, '#8a8a90');
        for (let x = 0; x < W; x += 9) { R(x, 128, 1, 30, '#060808'); R(x - 1, 126, 3, 2, '#060808'); }
        R(0, 134, W, 1, '#060808'); R(0, 152, W, 2, '#060808'); R(0, 154, W, 62, '#0c1210');
      },
      dyn: function (now) { drawFogBlobs(0, 78, W, 64, now, 10); } },

    station: { dark: 0.5, lights: [[77, 104, 92], [192, 72, 122]],
      back: function () {
        R(0, 0, W, 126, '#28302e'); R(0, 88, W, 38, '#2b1e17'); R(0, 88, W, 2, '#3d2b20');
        for (let x = 0; x < W; x += 24) R(x, 90, 1, 36, '#20150f');
        R(14, 16, 92, 110, '#3a2a1c'); R(14, 16, 92, 3, '#523a28');
        for (let r = 0; r < 6; r++) for (let k = 0; k < 4; k++) { const x = 18 + k * 22, y = 22 + r * 17; R(x, y, 20, 15, '#2a1c12'); R(x + 7, y + 8, 6, 2, '#8a7236'); R(x + 5, y + 2, 10, 4, '#c8c0a0'); }
        R(250, 20, 60, 44, '#b8ae8e'); R(250, 20, 60, 1, '#3a2a1c');
        g.strokeStyle = '#5a4a3a'; g.lineWidth = 1;
        [[254, 50, 300, 30], [262, 24, 270, 60], [280, 24, 296, 60], [254, 36, 306, 44]].forEach(function (l) { g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.stroke(); });
        g.strokeStyle = '#3a5a7a'; g.beginPath(); g.moveTo(252, 58); g.lineTo(272, 52); g.lineTo(290, 58); g.lineTo(308, 50); g.stroke();
        R(277, 38, 3, 3, '#a02020');
        R(126, 18, 30, 38, '#6b5628'); R(129, 21, 24, 32, '#1a1a22'); ell(141, 32, 6, 7, '#8a7a6a'); R(133, 40, 16, 13, '#2a3a5a');
        R(324, 24, 46, 56, '#120c09'); R(328, 28, 38, 48, '#1e2a30'); for (let x = 334; x < 366; x += 8) R(x, 28, 1, 48, '#0a0a0c'); R(328, 50, 38, 1, '#0a0a0c');
      },
      front: function () {
        R(0, 124, W, 8, '#3d2b1e'); R(0, 124, W, 1, '#5a4030'); R(0, 132, W, 84, '#241810');
        R(76, 100, 2, 24, '#8a7236'); R(68, 122, 18, 2, '#8a7236'); R(62, 92, 30, 9, '#2e6a4a'); R(62, 92, 30, 2, '#4a9a6a');
        for (let k = 0; k < 4; k++) R(262 + k * 2, 119 - k * 5, 44, 5, k % 2 ? '#8a7a5a' : '#a89a72');
        R(120, 118, 30, 6, '#d8ceb0'); R(124, 120, 20, 1, '#8a8270'); R(124, 122, 16, 1, '#8a8270'); R(326, 114, 8, 10, '#14141a'); R(329, 104, 1, 12, '#d0d0c8');
      } },

    river: { out: true, dark: 0.5, lights: [[341, 76, 74], [192, 78, 112]],
      back: function () {
        sky('#121a24', '#56524e', 94);
        // тот берег: ельник, крыши, колокольня — силуэтами сквозь туман
        R(0, 86, W, 8, '#0e1418');
        for (let x = 0; x < W; x += 3) {
          const t = hsh(x, 21), hgt = 6 + Math.floor(t * 14);
          if (x > 150 && x < 236) continue;
          for (let r = 0; r < hgt; r += 2) { const half = Math.max(0, Math.round((r / hgt) * 3)); R(x + 1 - half, 86 - hgt + r, 1 + half * 2, 2, '#0e1418'); }
        }
        [[152, 18, 12], [172, 22, 9], [196, 16, 14], [214, 20, 10]].forEach(function (b, i) {
          R(b[0], 86 - b[2], b[1], b[2], '#101820');
          for (let r = 0; r < 6; r++) R(b[0] + r, 86 - b[2] - 6 + r, b[1] - r * 2, 1, '#101820');
          if (i % 2 === 0) R(b[0] + 5, 86 - b[2] + 3, 2, 3, 'rgba(232,170,80,0.55)');
        });
        R(236, 52, 8, 34, '#101820'); R(238, 46, 4, 6, '#101820'); R(239, 40, 2, 6, '#101820'); R(237, 42, 6, 1, '#101820');
        R(0, 94, W, 122, '#0c141a');
        // отражение того берега в чёрной воде
        for (let y = 95; y < 106; y += 2) { g.fillStyle = 'rgba(14,20,24,' + (0.9 - (y - 95) * 0.07).toFixed(2) + ')'; for (let x = (y % 4) * 2; x < W; x += 7) g.fillRect(x, y, 4, 1); }
      },
      front: function () {
        R(268, 112, 96, 10, '#16100c'); R(274, 122, 84, 5, '#0e0a08'); R(262, 108, 10, 6, '#16100c'); R(360, 108, 10, 6, '#16100c'); R(268, 112, 96, 1, '#3a2a1c');
        R(340, 78, 2, 34, '#2a1c12'); R(336, 72, 10, 8, '#3a2a1a'); R(339, 74, 4, 4, '#ffcf70'); R(296, 104, 30, 3, '#2a1c12');
        R(40, 124, 222, 6, '#4b3524'); R(40, 124, 222, 1, '#6e5038');
        for (let x = 40; x < 262; x += 22) R(x, 124, 1, 6, '#2a1c12');
        R(40, 130, 222, 86, '#1e140e');
        [52, 116, 252].forEach(function (x) { R(x, 100, 6, 60, '#2a1c12'); R(x - 1, 100, 8, 2, '#4b3524'); });
        g.strokeStyle = '#6a5a3a'; g.lineWidth = 1; g.beginPath(); g.moveTo(55, 106); g.quadraticCurveTo(86, 118, 119, 106); g.stroke();
      },
      dyn: function (now) {
        g.fillStyle = 'rgba(150,170,180,0.10)';
        for (let i = 0; i < 26; i++) { const y = 98 + (i * 7) % 50, x = (i * 71 + Math.sin(now / 900 + i) * 8) % W; g.fillRect(Math.round(x), y, 10 + (i * 5) % 16, 1); }
        if (Math.sin(now / 1300) > -0.3) { R(232, 84, 2, 2, '#e8c070'); g.fillStyle = 'rgba(232,192,112,0.22)'; g.fillRect(232, 96, 2, 14); }
        drawFogBlobs(0, 70, W, 60, now, 9);
      } }
  };
  const locCache = {};
  function locLayer(id) {
    if (locCache[id]) return locCache[id];
    const L = LOC[id], b = mk(W, H), f = mk(W, H), old = g;
    g = b.getContext('2d'); L.back();
    g = f.getContext('2d'); L.front();
    g = old;
    return (locCache[id] = { b: b, f: f });
  }
  function drawLoc(now) {
    const id = LOC[S.loc] ? S.loc : 'market', L = LOC[id], ly = locLayer(id);
    g.drawImage(ly.b, 0, 0);
    if (L.dyn) L.dyn(now);
    drawCustomer(now);
    g.drawImage(ly.f, 0, 0);
    lightX.globalCompositeOperation = 'source-over';
    lightX.clearRect(0, 0, W, H);
    lightX.fillStyle = 'rgba(3,5,8,' + L.dark + ')';
    lightX.fillRect(0, 0, W, H);
    lightX.globalCompositeOperation = 'destination-out';
    L.lights.forEach(function (l, i) {
      const fl = 1 + Math.sin(now / (120 + i * 31)) * 0.03;
      const gr = lightX.createRadialGradient(l[0], l[1], 3, l[0], l[1], l[2] * fl);
      gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lightX.fillStyle = gr; lightX.fillRect(0, 0, W, H);
    });
    g.drawImage(lightC, 0, 0);
    g.globalCompositeOperation = 'lighter';
    L.lights.forEach(function (l, i) {
      if (i === L.lights.length - 1) return;                 // последний источник — просто «видно собеседника»
      const gr = g.createRadialGradient(l[0], l[1], 2, l[0], l[1], l[2] * 0.7);
      gr.addColorStop(0, id === 'cemetery' ? 'rgba(170,190,180,0.14)' : 'rgba(255,170,70,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    g.globalCompositeOperation = 'source-over';
    drawFx(now);
  }

  /* ============================================================
     УЛИЦА: вечерняя прогулка по Мглову (боковая прокрутка).
     Статичное нарисовано один раз в больших холстах (дальний план,
     средний план, сама улица); живое — поверх и только то, что в кадре.
     ============================================================ */
  /* Три улицы. Старые места нарисованы в «сквозных» координатах одной длинной
     ленты (x 0..2700); на каждой улице её кусок seg = [от, до, сдвиг] стоит со сдвигом.
     Новые дома (и переходы между улицами) нарисованы сразу в координатах улицы. */
  const GY = 190;
  const STREETS = {
    bereg: {
      name: 'Береговая улица', W: 1130, seg: [0, 604, 0], left: null, right: 'sennaya',
      areas: [[0, 'Перевозная пристань'], [300, 'Береговая улица'], [1000, 'Подъём на Сенную']],
      places: [
        { id: 'river', x0: 0, x1: 300, door: 134, hot: [14, 104, 240, 192] },
        { id: 'station', x0: 300, x1: 520, door: 410, hot: [306, 24, 514, 186] },
        { id: 'bereg>sennaya', portal: 'sennaya', x0: 1046, x1: 1130, door: 1090, hot: [1050, 96, 1128, 192] }
      ],
      lamps: [238, 600, 948], lanterns: [[729, 118], [876, 138]],
      puddles: [[380, 203, 50, 4, 2], [706, 206, 70, 4, 4], [905, 201, 44, 3, 6]]
    },
    sennaya: {
      name: 'Сенная улица', W: 1720, seg: [604, 1556, -200], left: 'bereg', right: 'sloboda',
      areas: [[0, 'Спуск к реке'], [90, 'Сенная улица'], [960, 'Сенная площадь'], [1290, 'Сенная улица'], [1626, 'Застава']],
      places: [
        { id: 'sennaya>bereg', portal: 'bereg', x0: 0, x1: 84, door: 40, hot: [2, 96, 82, 192] },
        { id: 'clock', x0: 410, x1: 580, door: 516, hot: [414, 4, 574, 186] },
        { id: 'shop', x0: 680, x1: 900, door: 829, hot: [704, 36, 882, 186] },
        { id: 'market', x0: 960, x1: 1280, door: 1138, hot: [966, 104, 1274, 186] },
        { id: 'sennaya>sloboda', portal: 'sloboda', x0: 1636, x1: 1720, door: 1680, hot: [1640, 70, 1718, 192] }
      ],
      lamps: [196, 642, 931, 1340, 1606], lanterns: [[166, 134], [1416, 128], [1568, 132]],
      puddles: [[150, 204, 60, 4, 8], [418, 201, 56, 4, 1], [770, 200, 96, 5, 3], [912, 207, 70, 4, 9], [1306, 203, 40, 3, 5], [1560, 203, 50, 3, 10]]
    },
    sloboda: {
      name: 'Слободская улица', W: 1464, seg: [1556, 2700, -1236], left: 'sennaya', right: null,
      areas: [[0, 'Слобода'], [580, 'Соборная площадь'], [990, 'Вдовья застава']],
      places: [
        { id: 'sloboda>sennaya', portal: 'sennaya', x0: 0, x1: 70, door: 36, hot: [2, 70, 68, 192] },
        { id: 'agata', x0: 324, x1: 524, door: 488, hot: [354, 72, 516, 186] },
        { id: 'church', x0: 594, x1: 934, door: 764, hot: [602, 0, 888, 186] },
        { id: 'cemetery', x0: 1004, x1: 1324, door: 1146, hot: [1010, 80, 1234, 186] }
      ],
      lamps: [182, 526, 969, 1342], broken: 1342, crows: 914, lanterns: [],
      puddles: [[160, 205, 56, 4, 12], [454, 206, 66, 4, 7], [768, 204, 84, 4, 11], [1156, 207, 60, 4, 13]]
    }
  };
  const SIDS = ['bereg', 'sennaya', 'sloboda'];
  /* где на новых улицах оказалась точка старой ленты */
  function remap(ox) {
    for (let i = 0; i < SIDS.length; i++) { const s = STREETS[SIDS[i]].seg; if (ox >= s[0] && ox < s[1]) return { sid: SIDS[i], x: ox + s[2] }; }
    return { sid: 'sloboda', x: ox + STREETS.sloboda.seg[2] };
  }
  const SL = {};                       // готовые слои улиц: world, far, mid и что на них живёт
  let OX = 0, CUR = null;              // при постройке: сдвиг куска ленты и куда записывать окна, дым, насесты

  /* ---------- маленький шрифт для вывесок (5 px) ---------- */
  const SF = {
    'А': ['.##.', '#..#', '####', '#..#', '#..#'], 'Б': ['####', '#...', '###.', '#..#', '###.'], 'В': ['###.', '#..#', '###.', '#..#', '###.'],
    'Г': ['####', '#...', '#...', '#...', '#...'], 'Д': ['.##.', '.#.#', '.#.#', '####', '#..#'], 'Е': ['####', '#...', '###.', '#...', '####'],
    'З': ['###.', '...#', '.##.', '...#', '###.'], 'И': ['#..#', '#.##', '##.#', '#..#', '#..#'], 'К': ['#..#', '#.#.', '##..', '#.#.', '#..#'],
    'Л': ['.###', '.#.#', '.#.#', '.#.#', '##.#'], 'М': ['#...#', '##.##', '#.#.#', '#...#', '#...#'], 'Н': ['#..#', '#..#', '####', '#..#', '#..#'],
    'О': ['.##.', '#..#', '#..#', '#..#', '.##.'], 'П': ['####', '#..#', '#..#', '#..#', '#..#'], 'Р': ['###.', '#..#', '###.', '#...', '#...'],
    'С': ['.###', '#...', '#...', '#...', '.###'], 'Т': ['###', '.#.', '.#.', '.#.', '.#.'], 'Ф': ['.###.', '#.#.#', '#.#.#', '.###.', '..#..'],
    'Ч': ['#..#', '#..#', '.###', '...#', '...#'], 'Ъ': ['##..', '.#..', '.###', '.#.#', '.###'], 'Ы': ['#...#', '#...#', '###.#', '#.#.#', '###.#'],
    'I': ['#', '#', '#', '#', '#'], '·': ['.', '.', '#', '.', '.'], ' ': ['..', '..', '..', '..', '..'],
    'Я': ['.###', '#..#', '.###', '.#.#', '#..#'], 'У': ['#..#', '#..#', '.###', '...#', '###.'], 'Ь': ['#...', '#...', '###.', '#..#', '###.'],
    'Ш': ['#.#.#', '#.#.#', '#.#.#', '#.#.#', '#####'], 'Х': ['#..#', '#..#', '.##.', '#..#', '#..#'], 'Ж': ['#.#.#', '#.#.#', '.###.', '#.#.#', '#.#.#'],
    'Ц': ['#..#', '#..#', '#..#', '####', '...#'], 'Ю': ['#..#.', '#.#.#', '###.#', '#.#.#', '#..#.'], 'Э': ['###.', '...#', '.###', '...#', '###.'],
    '◂': ['..#', '.##', '###', '.##', '..#'], '▸': ['#..', '##.', '###', '##.', '#..'], '№': ['#..#.##', '##.#.##', '#.##...', '#..#.##', '#..#...'],
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#', '##', '.#', '.#', '.#'], '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '.##', '..#', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'], '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'], '.': ['.', '.', '.', '.', '#'], ',': ['.', '.', '.', '#', '#'], '«': ['....', '.#.#', '#.#.', '.#.#', '....'], '»': ['....', '#.#.', '.#.#', '#.#.', '....']
  };
  function sfWidth(t) { let w = 0; for (let i = 0; i < t.length; i++) w += (SF[t[i] === 'Й' ? 'И' : t[i]] || SF[' '])[0].length + 1; return w - 1; }
  function sfText(t, x, y, col, shc) {
    [shc, col].forEach(function (cc, pass) {
      if (!cc) return;
      let cx = x;
      for (let i = 0; i < t.length; i++) {
        const ch = t[i], gl = SF[ch === 'Й' ? 'И' : ch] || SF[' '];
        for (let r = 0; r < 5; r++) for (let k = 0; k < gl[r].length; k++) if (gl[r][k] === '#') R(cx + k + (pass ? 0 : 1), y + r + (pass ? 0 : 1), 1, 1, cc);
        if (ch === 'Й') R(cx + 1 + (pass ? 0 : 1), y - 2 + (pass ? 0 : 1), 2, 1, cc);
        cx += gl[0].length + 1;
      }
    });
  }

  /* ---------- стены, окна, крыши ---------- */
  function plaster(x, y, w, h, col, seed) {
    R(x, y, w, h, col);
    const dk = sh(col, 0.84), lt = sh(col, 1.12), n = Math.floor(w * h / 36);
    for (let k = 0; k < n; k++) {
      const px = x + Math.floor(hsh(k, seed) * w), py = y + Math.floor(hsh(k, seed + 1) * h);
      R(px, py, 1 + Math.floor(hsh(k, seed + 2) * 3), 1, hsh(k, seed + 3) > 0.5 ? dk : lt);
    }
    g.fillStyle = 'rgba(0,0,0,0.13)';                                                     // потёки
    for (let k = 0; k < w / 12; k++) g.fillRect(x + Math.floor(hsh(k, seed + 4) * (w - 3)), y, 2 + Math.floor(hsh(k, seed + 5) * 3), Math.floor(h * (0.15 + hsh(k, seed + 6) * 0.5)));
    for (let k = 0; k < Math.floor(w / 70); k++) {                                         // обвалилась штукатурка — виден кирпич
      const px = x + 6 + Math.floor(hsh(k, seed + 7) * (w - 22)), py = y + 6 + Math.floor(hsh(k, seed + 8) * Math.max(1, h - 22));
      const bw = 7 + Math.floor(hsh(k, seed + 9) * 7), bh = 4 + Math.floor(hsh(k, seed + 10) * 4);
      R(px, py, bw, bh, '#2a1a16');
      for (let r = 0; r < bh; r += 3) for (let c2 = (r % 6 ? -3 : 0); c2 < bw; c2 += 6) { const a = Math.max(0, c2), b = Math.min(bw, c2 + 5); if (b > a) R(px + a, py + r, b - a, Math.min(2, bh - r), hsh(c2 + r * 7, seed) > 0.5 ? '#4a2c24' : '#3e241e'); }
      R(px - 1, py - 1, bw + 2, 1, lt);
    }
  }
  function brick(x, y, w, h, col, seed) {
    R(x, y, w, h, sh(col, 0.62));
    for (let r = 0, yy = y; yy < y + h; r++, yy += 3) {
      for (let xx = x - (r % 2) * 3; xx < x + w; xx += 6) {
        const x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + 5);
        if (x1 <= x0) continue;
        const v = hsh(xx * 3 + r * 17, seed);
        R(x0, yy, x1 - x0, Math.min(2, y + h - yy), v > 0.86 ? sh(col, 1.18) : v < 0.18 ? sh(col, 0.84) : col);
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.15)';
    for (let k = 0; k < w / 16; k++) g.fillRect(x + Math.floor(hsh(k, seed + 9) * (w - 3)), y, 3, Math.floor(h * (0.2 + hsh(k, seed + 8) * 0.5)));
  }
  function rust(x, y, w, h, col) {                       // рустованный камень первого этажа
    R(x, y, w, h, col);
    for (let yy = y, r = 0; yy < y + h; yy += 7, r++) {
      R(x, yy, w, 1, sh(col, 1.18)); R(x, Math.min(y + h - 1, yy + 6), w, 1, sh(col, 0.58));
      for (let xx = x + (r % 2) * 12; xx < x + w; xx += 24) R(xx, yy + 1, 1, 5, sh(col, 0.68));
    }
  }
  function logs(x, y, w, h, col, seed) {                 // бревенчатый сруб
    for (let yy = y, r = 0; yy < y + h; yy += 5, r++) {
      const cc = hsh(r, seed) > 0.5 ? col : sh(col, 0.9);
      R(x, yy, w, 5, cc); R(x, yy, w, 1, sh(col, 1.25)); R(x, yy + 4, w, 1, sh(col, 0.5));
      for (let k = 0; k < w / 26; k++) R(x + Math.floor(hsh(k + r * 7, seed + 1) * (w - 4)), yy + 2, 3 + Math.floor(hsh(k, r + seed) * 4), 1, sh(col, 0.72));
      [x - 3, x + w].forEach(function (ex) { R(ex, yy, 3, 5, sh(col, 1.08)); R(ex, yy + 2, 1, 1, sh(col, 0.6)); R(ex + 2, yy + 1, 1, 3, sh(col, 0.75)); });
    }
  }
  function cornice(x, y, w, col) {
    const lt = sh(col, 1.3), dk = sh(col, 0.55);
    R(x - 3, y, w + 6, 2, lt); R(x - 3, y + 2, w + 6, 1, dk);
    R(x - 1, y + 3, w + 2, 3, col);
    for (let k = x; k < x + w; k += 4) R(k, y + 4, 2, 2, dk);                               // сухарики
    R(x - 1, y + 6, w + 2, 1, dk);
  }
  function roofTin(x, y, w, rh, col) {                    // кровельное железо с фальцами
    for (let r = 0; r < rh; r++) R(x + r * 2, y - r, w - r * 4, 1, r === rh - 1 ? sh(col, 1.35) : col);
    for (let k = x + 4; k < x + w - 4; k += 6) { const t = Math.min(rh, Math.floor(Math.min(k - x, x + w - k) / 2)); if (t > 1) R(k, y - t + 1, 1, t, sh(col, 1.22)); }
  }
  function chimney(x, y, h, col, smk) {
    R(x, y, 6, h, col); R(x - 1, y, 8, 2, sh(col, 0.6)); R(x, y + 2, 1, h - 2, sh(col, 1.25));
    for (let yy = y + 4; yy < y + h; yy += 3) R(x, yy, 6, 1, sh(col, 0.72));
    if (smk && CUR) CUR.smoke.push([x + 3 + OX, y - 1, CUR.smoke.length]);
  }
  /* окно на улице: откос, рама, стекло с отражением неба, подоконник, наличник.
     Окно запоминается: вечером его можно зажечь поверх готовой картинки. */
  function swin(x, y, w, h, o) {
    o = o || {};
    const wall = o.wall || '#3a3a34', fr = o.fr || '#17120d', hi = sh(wall, 1.3), dk = sh(wall, 0.5);
    const top = o.arch ? Math.round(w / 2.4) : 0;
    R(x - 2, y - 2, w + 4, h + 4, dk); if (top) ell(x + w / 2, y, w / 2 + 2, top + 2, dk);
    R(x - 1, y - 1, w + 2, h + 2, fr); if (top) ell(x + w / 2, y, w / 2 + 1, top + 1, fr);
    R(x, y, w, h, '#0d1416'); if (top) ell(x + w / 2, y, w / 2, top, '#0d1416');
    const gr = g.createLinearGradient(x, y - top, x + w, y + h);
    gr.addColorStop(0, 'rgba(130,150,150,0.18)'); gr.addColorStop(0.5, 'rgba(130,150,150,0.02)'); gr.addColorStop(1, 'rgba(130,150,150,0.1)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    const n = CUR ? CUR.swin.length : 0;
    const wi = { x: x, y: y, w: w, h: h, top: top, fr: fr, s: n * 13 + 5 + (CUR ? CUR.seed : 0), lit: o.lit == null ? 0.45 : o.lit, cur: o.cur || '#5a1e16', bars: !!o.bars, always: !!o.always, dim: o.dim || 1 };
    mull(wi);
    if (CUR) CUR.swin.push(Object.assign({}, wi, { x: x + OX }));
    R(x - 3, y + h + 1, w + 6, 2, hi); R(x - 3, y + h + 3, w + 6, 1, dk);
    if (o.ped) for (let r = 0; r < 4; r++) R(x - 4 + r * 2, y - top - 4 - r, w + 8 - r * 4, 1, r === 3 ? sh(wall, 0.7) : hi);
    else if (o.hood) { R(x - 3, y - top - 5, w + 6, 2, hi); R(x - 3, y - top - 3, w + 6, 1, dk); }
    if (o.key) R(x + Math.floor(w / 2) - 1, y - top - 3, 3, 4, hi);
    if (o.shut) [x - Math.ceil(w / 2) - 3, x + w + 3].forEach(function (sx) {
      const sw2 = Math.ceil(w / 2);
      R(sx, y - 1, sw2, h + 2, o.shut); R(sx, y - 1, sw2, 1, sh(o.shut, 1.3)); R(sx, y - 1, 1, h + 2, sh(o.shut, 1.2));
      for (let yy = y + 2; yy < y + h; yy += 3) R(sx + 1, yy, sw2 - 2, 1, sh(o.shut, 0.72));
      R(sx + Math.floor(sw2 / 2) - 1, y + Math.floor(h / 2) - 1, 2, 2, sh(o.shut, 1.4));             // ромбик
    });
  }
  function mull(wi) {
    R(wi.x + Math.floor(wi.w / 2), wi.y - wi.top, 1, wi.h + wi.top, wi.fr);
    R(wi.x, wi.y + Math.floor(wi.h * 0.38), wi.w, 1, wi.fr);
    if (wi.bars) { for (let k = wi.x + 1; k < wi.x + wi.w; k += 3) R(k, wi.y - wi.top, 1, wi.h + wi.top, '#08090a'); R(wi.x, wi.y + wi.h - 3, wi.w, 1, '#08090a'); }
  }
  function winOn(wi, d, now) {
    if (wi.always) return 1;
    const slot = hsh(wi.s, 4) > 0.78 ? Math.floor(now / 21000 + hsh(wi.s, 3) * 7) : 0;      // некоторые окна гаснут и зажигаются
    return hsh(wi.s, 40 + slot) < wi.lit * (0.3 + 0.7 * d) ? 1 : 0;
  }
  function litWin(wi, now, k) {
    const x = wi.x, y = wi.y, w = wi.w, h = wi.h, s = wi.s;
    const fl = 0.86 + 0.1 * Math.sin(now / (260 + (s % 9) * 37) + s) - (hsh(Math.floor(now / 140), s) > 0.985 ? 0.2 : 0);
    const a = (0.92 * fl * k).toFixed(3);
    const gr = g.createLinearGradient(0, y - wi.top, 0, y + h);
    gr.addColorStop(0, 'rgba(255,206,122,' + a + ')'); gr.addColorStop(1, 'rgba(172,90,36,' + a + ')');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    if (wi.top) { g.beginPath(); g.ellipse(x + w / 2, y, w / 2, wi.top, 0, Math.PI, Math.PI * 2); g.fill(); }
    g.globalAlpha = Math.min(1, k * 1.2);
    const cw = Math.max(1, Math.floor(w * 0.22));
    R(x, y, cw, h, wi.cur); R(x + w - cw, y, cw, h, wi.cur); R(x, y, w, 1, wi.cur);
    if (hsh(s, 5) > 0.6) {                                                                     // кто-то проходит по комнате
      const t = (now / 11000 + hsh(s, 6)) % 1;
      if (t < 0.3) { const px = x + 1 + Math.round(t / 0.3 * (w - 4)), py = y + Math.floor(h * 0.28); R(px, py + 3, 3, h - Math.floor(h * 0.28) - 3, 'rgba(36,16,8,0.8)'); R(px, py, 2, 3, 'rgba(36,16,8,0.8)'); }
    }
    g.globalAlpha = 1;
    mull(wi);
  }

  /* ---------- фонари ---------- */
  function lampPost(lx) {
    const o = lx - 331;
    R(o + 326, 178, 10, 6, '#0c1110'); R(o + 325, 183, 12, 2, '#0c1110'); R(o + 328, 168, 6, 10, '#0e1413');
    R(o + 330, 66, 2, 104, '#0c1110'); R(o + 330, 66, 1, 104, '#1a2220');
    R(o + 329, 120, 4, 2, '#141c1b'); R(o + 329, 150, 4, 2, '#141c1b'); R(o + 328, 64, 6, 3, '#141c1b');
    R(o + 324, 70, 14, 1, '#141c1b');                                                         // перекладина для лестницы фонарщика
    R(o + 327, 63, 8, 2, '#0e1413'); R(o + 326, 53, 10, 2, '#0e1413'); R(o + 328, 51, 6, 2, '#0e1413'); R(o + 330, 48, 2, 3, '#0e1413');
    R(o + 327, 55, 8, 8, '#1c2624'); R(o + 327, 55, 1, 8, '#0e1413'); R(o + 331, 55, 1, 8, '#0e1413'); R(o + 334, 55, 1, 8, '#0e1413');
  }
  function lampLit(lx, f) {
    const o = lx - 331;
    g.fillStyle = 'rgba(255,226,150,' + (0.85 * f).toFixed(3) + ')'; g.fillRect(o + 327, 55, 8, 8);
    R(o + 327, 55, 1, 8, '#0e1413'); R(o + 331, 55, 1, 8, '#0e1413'); R(o + 334, 55, 1, 8, '#0e1413');
    if (f > 0.5) R(o + 329, 58, 2, 3, '#fff6d8');
  }

  /* ---------- деревья ---------- */
  function branch(x, y, ang, len, depth, seed, col) {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    pline(Math.round(x), Math.round(y), Math.round(x2), Math.round(y2), col);
    if (depth >= 3) pline(Math.round(x) + 1, Math.round(y), Math.round(x2) + 1, Math.round(y2), col);
    if (depth <= 0) return;
    if (CUR && depth === 2 && hsh(seed, 9) > 0.55 && Math.abs(Math.cos(ang)) > 0.35) CUR.perch.push([Math.round(x2) + OX, Math.round(y2), CUR.perch.length]);
    const n = 2 + (hsh(seed, 3) > 0.6 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const a2 = ang + (k - (n - 1) / 2) * (0.5 + hsh(seed + k, 4) * 0.45) + (hsh(seed + k, 5) - 0.5) * 0.35;
      branch(x2, y2, a2, len * (0.55 + hsh(seed + k, 6) * 0.2), depth - 1, seed * 3 + k + 1, col);
    }
  }
  function bareTree(x, base, h, seed, col) {
    const lean = (hsh(seed, 1) - 0.5) * 12, th = Math.round(h * 0.5);
    for (let yy = 0; yy < th; yy++) { const t = yy / th, w2 = Math.max(1, Math.round(3 - t * 1.6)); R(Math.round(x + lean * t * t) - w2, base - yy, w2 * 2, 1, col); }
    R(x - 5, base - 2, 10, 2, col);
    branch(x + lean, base - th, -Math.PI / 2 + (hsh(seed, 2) - 0.5) * 0.3, h * 0.42, 4, seed, col);
  }
  function onion(cx, base, hw0, hgt, col, hi, dk) {          // луковичный купол
    for (let yy = 0; yy < hgt; yy++) {
      const t = yy / hgt;
      const hw = t < 0.35 ? hw0 * (1 + 0.28 * Math.sin(t / 0.35 * Math.PI / 2)) : hw0 * 1.28 * Math.pow(Math.cos((t - 0.35) / 0.65 * Math.PI / 2), 1.3);
      const y = base - yy, w2 = Math.round(hw);
      if (w2 <= 0) continue;
      R(cx - w2, y, w2 * 2, 1, col);
      R(cx - Math.round(w2 * 0.55), y, Math.max(1, Math.round(w2 * 0.22)), 1, hi);
      R(cx + Math.round(w2 * 0.55), y, Math.max(1, w2 - Math.round(w2 * 0.55)), 1, dk);
      [-2, -1, 1, 2].forEach(function (k) { R(cx + Math.round(k * w2 * 0.42), y, 1, 1, dk); });
    }
  }
  function crossO(cx, top, col) { R(cx, top, 1, 12, col); R(cx - 3, top + 3, 7, 1, col); R(cx - 2, top + 1, 5, 1, col); R(cx - 3, top + 8, 1, 1, col); R(cx - 2, top + 7, 1, 1, col); R(cx + 2, top + 7, 1, 1, col); R(cx + 3, top + 6, 1, 1, col); }

  /* ---------- дальний и средний планы ---------- */
  function hills(fw, base, col) { for (let x = 0; x < fw; x++) { const hh = 10 + Math.sin(x / 64) * 5 + Math.sin(x / 19 + 1) * 2; R(x, Math.round(base - hh), 1, Math.round(hh) + 12, col); } }
  function forest(x0, x1, base, col, seed) {
    for (let x = x0; x < x1; x += 2) {
      const th = 9 + Math.floor(hsh(x, seed) * 16);
      for (let r = 0; r < th; r++) R(x - Math.floor((th - r) / 4), base - r, 1 + Math.floor((th - r) / 2), 1, col);
    }
  }
  function gable(x, base, w, h, col, seed) {                 // деревенский дом с высокой крышей (силуэт)
    R(x, base - h, w, h, col);
    for (let r = 0; r < Math.round(w * 0.55); r++) { const hw = Math.round(w / 2 + 2 - r * (w / 2 + 2) / (w * 0.55)); if (hw > 0) R(x + w / 2 - hw, base - h - r, hw * 2, 1, col); }
    if (hsh(seed, 1) > 0.4) R(x + Math.round(w * 0.7), base - h - Math.round(w * 0.4), 3, Math.round(w * 0.3), col);
  }
  /* дальний план: у каждой улицы свой горизонт */
  const FAR = {
    bereg: function (fw) {                                     // тот берег, мост, мачты
      for (let x = 0; x < fw; x++) { const hh = 6 + Math.sin(x / 41) * 3 + hsh(Math.floor(x / 4), 207) * 5; R(x, Math.round(150 - hh), 1, Math.round(hh) + 30, '#17221e'); }
      for (let i = 0, x = 40; x < fw; i++) { const w = 14 + Math.floor(hsh(i, 208) * 14); house(x, 152, w, 8 + Math.floor(hsh(i, 209) * 10), 3, '#1a2521', i + 40, 0, 0.2, { ww: 2, wh: 3, gx: 6, gy: 8 }); x += w + 10 + Math.floor(hsh(i, 210) * 40); }
      const by = 132, bx0 = 120, bx1 = Math.min(fw - 20, 560);         // длинный мост на сваях, середина обвалилась
      for (let x = bx0; x < bx1; x++) { if (x > 300 && x < 330) continue; R(x, by, 1, 3, '#1c2824'); if (x % 24 === 0) R(x, by + 3, 2, 22, '#1c2824'); }
      for (let x = bx0; x < bx1; x += 6) { if (x > 300 && x < 330) continue; R(x, by - 4, 1, 4, '#1c2824'); }
      R(bx0, by - 4, bx1 - bx0, 1, '#1c2824');
      for (let i = 0; i < 7; i++) { const mx = 150 + i * 63 + Math.floor(hsh(i, 211) * 30); if (mx > fw - 10) break; R(mx, 112 + (i % 3) * 6, 1, 60, '#1a2420'); R(mx - 6, 124 + (i % 3) * 6, 12, 1, '#1a2420'); }
      watchtower(Math.min(fw - 30, 600), 150, '#1a2521', 0);
    },
    sennaya: function (fw) {                                   // крыши города, каланча, купол собора
      hills(fw, 164, '#15201c');
      const col = '#19251f';
      for (let i = 0, x = 6; x < fw - 10; i++) {
        const w = 22 + Math.floor(hsh(i, 201) * 18), h = 30 + Math.floor(hsh(i, 202) * 40);
        house(x, 168, w, h, 4, col, i + 60, 0, 0.3, { ww: 3, wh: 4, gx: 7, gy: 11 });
        x += w + 2 + Math.floor(hsh(i, 203) * 12);
      }
      watchtower(Math.round(fw * 0.32), 168, col, 0); church(Math.round(fw * 0.86), 168, col);
    },
    sloboda: function (fw) {                                   // лес, поле, кресты на холме
      hills(fw, 162, '#15201c');
      forest(0, fw, 160, '#17221d', 205);
      for (let i = 0, x = 20; x < fw * 0.6; i++) { const w = 16 + Math.floor(hsh(i, 213) * 10); gable(x, 166, w, 10 + Math.floor(hsh(i, 214) * 6), '#19251f', i); x += w + 14 + Math.floor(hsh(i, 215) * 30); }
      for (let k = 0; k < 9; k++) { const cx = Math.round(fw * 0.7) + k * 11; R(cx, 140 - (k % 3) * 2, 1, 8, '#1a2420'); R(cx - 2, 142 - (k % 3) * 2, 5, 1, '#1a2420'); }
    }
  };
  const MID = {
    bereg: function (mw) {                                     // склады с лебёдками, мачты барж
      for (let i = 0, x = 260; x < mw - 20; i++) {
        const w = 54 + Math.floor(hsh(i, 321) * 40), h = 50 + Math.floor(hsh(i, 322) * 30), col = i % 2 ? '#121a18' : '#151d1b';
        R(x, 184 - h, w, h, col);
        for (let r = 0; r < Math.round(w / 3); r++) R(x + r * 1.5, 184 - h - r, w - r * 3, 1, col);
        R(x + Math.round(w / 2) - 1, 184 - h - Math.round(w / 3) - 2, 22, 2, '#0e1413');
        R(x + Math.round(w / 2) + 19, 184 - h - Math.round(w / 3), 1, 18, '#0e1413');
        for (let k = 0; k < Math.floor(w / 16); k++) R(x + 6 + k * 16, 184 - h + 14, 5, 7, i % 3 ? '#0c1211' : 'rgba(170,110,50,0.35)');
        x += w + 30 + Math.floor(hsh(i, 323) * 60);
      }
      for (let i = 0; i < 5; i++) { const mx = 200 + i * 150 + Math.floor(hsh(i, 324) * 50); if (mx > mw) break; R(mx, 70, 2, 116, '#101615'); R(mx - 14, 92, 30, 1, '#101615'); pline(mx, 72, mx + 26, 150, '#101615'); pline(mx, 72, mx - 22, 150, '#101615'); }
    },
    sennaya: function (mw) {
      for (let i = 0, x = 10; x < mw - 30; i++) {
        const w = 46 + Math.floor(hsh(i, 311) * 30), h = 56 + Math.floor(hsh(i, 312) * 36);
        house(x, 184, w, h, 5, i % 3 ? '#111a19' : '#141d1b', i + 80, 0, 0.8, { ww: 6, wh: 9, gx: 14, gy: 24, plinth: true });
        x += w + 6 + Math.floor(hsh(i, 313) * 30);
      }
    },
    sloboda: function (mw) {                                   // избы с высокими крышами, заборы, деревья
      for (let i = 0, x = 10; x < mw - 30; i++) {
        const w = 40 + Math.floor(hsh(i, 331) * 20);
        gable(x, 184, w, 34 + Math.floor(hsh(i, 332) * 14), i % 2 ? '#111a18' : '#131c1a', i + 3);
        if (i % 2) R(x + Math.round(w / 2) - 3, 184 - 24, 6, 8, 'rgba(170,110,50,0.3)');
        for (let k = x + w; k < x + w + 26; k += 3) R(k, 170, 1, 14, '#0f1514');
        x += w + 26 + Math.floor(hsh(i, 333) * 40);
        if (hsh(i, 334) > 0.5) { bareTree(x - 10, 184, 60 + Math.floor(hsh(i, 335) * 30), i * 7 + 5, '#121a18'); }
      }
    }
  };

  /* ---------- земля ---------- */
  function groundStatic(x0, x1) {
    R(x0, 186, x1 - x0, 30, '#06090a');
    for (let x = x0 - (x0 % 21); x < x1; x += 21) {
      R(Math.max(x0, x + 1), 187, 20, 5, '#1a2021'); R(Math.max(x0, x + 1), 187, 20, 1, '#262e2f');
      if (hsh(x, 3) > 0.75) R(x + 4 + Math.floor(hsh(x, 4) * 10), 189, 5, 1, '#111617');
    }
    R(x0, 192, x1 - x0, 2, '#2a3031'); R(x0, 192, x1 - x0, 1, '#3a4243');
    let yy = 195;
    [4, 5, 6, 7].forEach(function (rh, r) {
      const sw = rh * 2 + 3;
      for (let x = x0 - (x0 % sw) - (r % 2) * Math.floor(sw / 2); x < x1; x += sw) {
        if (x + sw < x0) continue;
        const v = hsh(x * 5 + r, 47);
        R(Math.max(x0, x + 1), yy, sw - 2, rh - 1, v > 0.66 ? '#161c1e' : v > 0.33 ? '#131a1b' : '#192022');
        R(Math.max(x0, x + 2), yy, sw - 4, 1, '#263031');
        if (v > 0.85) R(x + 3, yy + 1, 2, 1, '#34403f');
      }
      yy += rh;
    });
  }

  /* ---------- 1. Пристань ---------- */
  function riverStatic() {
    // тот берег: лес, крыши, всё серое от тумана
    for (let x = 0; x < 240; x++) {
      const hh = 6 + Math.sin(x / 23) * 3 + hsh(Math.floor(x / 3), 341) * 7;
      R(x, Math.round(114 - hh), 1, Math.round(hh) + 6, '#2a3533');
    }
    house(60, 118, 20, 12, 3, '#2a3533', 90, 0, 0, { ww: 2, wh: 3, gx: 6, gy: 8 });
    house(150, 118, 26, 14, 3, '#2a3533', 91, 0, 0, { ww: 2, wh: 3, gx: 6, gy: 8 });
    // река
    const wg = g.createLinearGradient(0, 118, 0, 216);
    wg.addColorStop(0, '#3a4644'); wg.addColorStop(0.08, '#26322f'); wg.addColorStop(0.35, '#121b1a'); wg.addColorStop(1, '#04080a');
    g.fillStyle = wg; g.fillRect(0, 118, 240, 98);
    R(0, 118, 240, 1, '#4a5654');                                                           // кромка того берега
    for (let i = 0; i < 70; i++) {                                                          // рябь: дальше — мельче
      const y = 120 + Math.floor(Math.pow(hsh(i, 342), 1.4) * 66), len = 2 + Math.floor((y - 116) / 6);
      R(Math.floor(hsh(i, 343) * 236), y, len, 1, y < 132 ? 'rgba(170,186,182,0.16)' : 'rgba(150,170,166,0.08)');
    }
    // набережная: гранитная стенка, где кончается мостовая
    R(230, 186, 10, 30, '#26282a'); R(230, 186, 1, 30, '#3a3c3e');
    for (let y = 190; y < 216; y += 6) R(230, y, 10, 1, '#16181a');
    // настил причала на сваях, верёвочные перила
    for (let px = 22; px < 232; px += 26) { R(px, 190, 3, 26, '#1a140e'); R(px, 190, 1, 26, '#2a2016'); R(px - 1, 206, 5, 1, 'rgba(160,180,176,0.18)'); }
    R(14, 185, 218, 4, '#3a2c1e'); R(14, 185, 218, 1, '#5a4630');
    for (let k = 14; k < 232; k += 7) R(k, 185, 1, 4, '#24190f');
    R(14, 189, 218, 3, '#20160d'); R(14, 192, 218, 1, '#0c0805');
    for (let px = 20; px < 232; px += 34) R(px, 170, 2, 15, '#24190f');
    for (let px = 20; px + 34 < 232; px += 34) for (let k = 0; k <= 34; k++) R(px + k, 171 + Math.round(Math.sin(k / 34 * Math.PI) * 4), 1, 1, '#3a3020');
    // вывеска «ПЕРЕВОЗ» на двух столбах
    R(190, 150, 2, 35, '#1c140c'); R(226, 150, 2, 35, '#1c140c');
    R(186, 146, 46, 11, '#2a1e12'); R(186, 146, 46, 1, '#4a3622'); R(187, 147, 44, 9, '#1e1610');
    sfText('ПЕРЕВОЗ', 189, 149, '#c8b890', '#0a0604');
    // сарай рыбаков: просмолённые доски, сети, корзины
    const sx = 252;
    for (let x = sx; x < sx + 48; x += 4) { R(x, 138, 4, 48, hsh(x, 321) > 0.5 ? '#1c1814' : '#211b15'); R(x, 138, 1, 48, '#2c251d'); }
    for (let r = 0; r < 9; r++) R(sx - 4, 130 + r, 56, 1, r === 0 ? '#2e3836' : '#1c2422');
    for (let k = sx - 4; k < sx + 52; k += 5) R(k, 131, 1, 8, '#2a3432');
    R(sx + 6, 150, 14, 36, '#0a0806'); R(sx + 6, 150, 14, 1, '#2c251d'); R(sx + 19, 151, 1, 35, '#3a2a18');
    g.strokeStyle = 'rgba(150,150,130,0.32)'; g.lineWidth = 1;                              // сеть на стене
    for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(sx + 24 + k * 4, 140); g.lineTo(sx + 46, 162 - k * 3); g.stroke(); g.beginPath(); g.moveTo(sx + 24 + k * 4, 140); g.lineTo(sx + 24, 150 + k * 4); g.stroke(); }
    [[sx + 26, 180, 7], [sx + 36, 182, 6], [sx + 2, 182, 5]].forEach(function (b) {            // корзины
      for (let r = 0; r < b[2]; r++) R(b[0] - b[2] + Math.floor(r / 3), b[1] - r, b[2] * 2 - Math.floor(r / 3) * 2, 1, r % 2 ? '#4a3a22' : '#3a2c18');
    });
    R(sx + 42, 166, 2, 20, '#3a2c18'); R(sx + 40, 164, 6, 3, '#4a3a26');                  // весло у стены
  }

  /* ---------- 2. Сыскное отделение ---------- */
  function stationStatic() {
    const x0 = 306, w = 208;
    plaster(x0, 52, w, 62, '#4c4330', 401);
    rust(x0, 114, w, 62, '#36352f');
    R(x0, 176, w, 10, '#24231e'); R(x0, 176, w, 1, '#3c3a33');
    R(x0, 111, w, 4, '#5a5646'); R(x0, 111, w, 1, '#6a6656'); R(x0, 115, w, 1, '#1e1d19');
    [x0, x0 + w - 6].forEach(function (px) { R(px, 52, 6, 60, '#575040'); R(px, 52, 1, 60, '#6a624e'); R(px + 5, 52, 1, 60, '#3a3326'); });
    cornice(x0, 44, w, '#4a4434');
    R(x0 + 2, 36, w - 4, 8, '#4a4434'); R(x0 + 2, 36, w - 4, 1, '#5e5644'); R(x0 + 2, 43, w - 4, 1, '#2a261c');
    for (let k = x0 + 8; k < x0 + w - 8; k += 10) R(k, 38, 6, 4, '#3e3a2c');              // балясник аттика
    R(409, 6, 1, 30, '#1a1a18'); R(410, 8, 1, 2, '#2a2a26');                               // флагшток без флага
    [316, 340, 364, 404, 444, 468, 492].forEach(function (wx) { swin(wx, 62, 12, 24, { wall: '#4c4330', ped: true, lit: 0.35, cur: '#3a3a2a' }); });
    [318, 342, 466, 490].forEach(function (wx) { swin(wx, 134, 12, 24, { wall: '#36352f', arch: true, bars: true, lit: 0.3, key: true, cur: '#2a2a22' }); });
    // портик: колонны, антаблемент с надписью, фронтон
    for (let r = 0; r < 12; r++) {
      R(366 + r * 4, 103 - r, 88 - r * 8, 1, '#3e392c');
      R(366 + r * 4, 103 - r, 5, 1, '#6e6652'); R(366 + 83 - r * 4, 103 - r, 5, 1, '#575040');
    }
    ell(410, 97, 5, 3, '#2a271f'); R(408, 96, 4, 2, '#5a5444');
    R(364, 103, 92, 1, '#6e6652');
    R(366, 104, 88, 10, '#4e4838'); R(366, 104, 88, 1, '#6a624e'); R(366, 113, 88, 1, '#24211a');
    const t = 'СЫСКНОЕ ОТДЕЛЕНИЕ', tw = sfWidth(t);
    sfText(t, Math.round(410 - tw / 2), 106, '#c2b27e', '#1a170f');
    [374, 440].forEach(function (cx) {
      R(cx - 2, 114, 10, 3, '#6a624e'); R(cx, 117, 6, 55, '#5a5444'); R(cx, 117, 1, 55, '#6e6854'); R(cx + 5, 117, 1, 55, '#36322a');
      for (let k = 120; k < 170; k += 6) R(cx + 2, k, 1, 4, '#4a4536');                   // каннелюры
      R(cx - 1, 172, 8, 4, '#4e4838');
    });
    R(396, 118, 28, 58, '#141210');                                                       // дверь
    for (let r = 0; r < 6; r++) R(398 + Math.floor(r / 2), 126 - r, 24 - Math.floor(r / 2) * 2, 1, '#2a3032');   // фрамуга
    R(398, 128, 24, 48, '#2a1c12'); R(409, 128, 2, 48, '#140c08');
    [399, 412].forEach(function (px) { R(px + 1, 131, 8, 18, '#22160e'); R(px + 1, 152, 8, 20, '#22160e'); R(px + 1, 131, 8, 1, '#3a2a1a'); R(px + 1, 152, 8, 1, '#3a2a1a'); });
    R(407, 150, 1, 3, '#b8923e'); R(412, 150, 1, 3, '#b8923e');
    R(384, 140, 6, 8, '#6a5a2c'); R(385, 141, 4, 6, '#3a3018');                           // медная табличка
    [390, 428].forEach(function (lx) { R(lx, 128, 5, 1, '#121414'); R(lx, 129, 1, 2, '#121414'); R(lx, 131, 5, 7, '#1a2422'); R(lx, 138, 5, 1, '#121414'); });
    [[370, 176, 80], [366, 179, 88], [362, 182, 96]].forEach(function (s) { R(s[0], s[1], s[2], 3, '#3a3934'); R(s[0], s[1], s[2], 1, '#4c4b46'); });
    R(362, 185, 96, 1, '#1c1c1a');
    // полосатая будка без часового
    const bx = 470;
    for (let r = 0; r < 6; r++) R(bx - 1 + Math.floor(r / 2), 134 + r, 16 - Math.floor(r / 2) * 2, 1, '#1a1a18');
    R(bx, 140, 14, 46, '#c8c4b8');
    g.save(); g.beginPath(); g.rect(bx, 140, 14, 46); g.clip();
    for (let k = -50; k < 60; k += 8) { g.fillStyle = '#1a1a18'; g.beginPath(); g.moveTo(bx + k, 186); g.lineTo(bx + k + 4, 186); g.lineTo(bx + k + 50, 140); g.lineTo(bx + k + 46, 140); g.closePath(); g.fill(); }
    g.restore();
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(bx, 140, 14, 46);
    R(bx + 3, 148, 8, 34, '#060606'); ell(bx + 7, 148, 4, 3, '#060606');
  }

  /* ---------- проходной двор и тумба ---------- */
  function fillerA() {
    const x0 = 522, w = 76;
    plaster(x0, 72, w, 104, '#2e3531', 451);
    R(x0, 176, w, 10, '#1e2220');
    cornice(x0, 66, w, '#2a302c'); roofTin(x0 - 2, 65, w + 4, 6, '#1a2220');
    chimney(x0 + 54, 50, 10, '#3a2a24', true);
    R(530, 136, 28, 50, '#050707'); ell(544, 136, 14, 10, '#050707');                     // подворотня
    g.fillStyle = 'rgba(200,170,110,0.07)'; g.fillRect(540, 150, 8, 36);
    R(528, 124, 32, 2, '#3e4642');
    swin(532, 86, 10, 18, { wall: '#2e3531', hood: true, lit: 0.6 }); swin(550, 86, 10, 18, { wall: '#2e3531', hood: true, lit: 0.6, cur: '#2a3a4a' });
    swin(572, 86, 10, 18, { wall: '#2e3531', hood: true, lit: 0.6 }); swin(570, 140, 12, 20, { wall: '#2e3531', lit: 0.5, cur: '#4a3a1a' });
  }
  function fillerB() {
    brick(806, 150, 72, 36, '#2e201c', 471);                                              // глухая стена двора
    R(804, 146, 76, 4, '#3a3a36'); R(804, 146, 76, 1, '#4a4a46');
    R(828, 158, 20, 28, '#16100a'); R(829, 159, 18, 1, '#2a1e14'); R(837, 159, 1, 27, '#0c0806');
    // афишная тумба
    const tx = 784;
    R(tx, 130, 16, 54, '#2e2a22'); R(tx, 130, 2, 54, '#3e3a30'); R(tx + 13, 130, 3, 54, '#1a1812');
    [[131, 14, '#8a7e60'], [146, 12, '#6e5e48'], [160, 13, '#9a8c6c'], [173, 10, '#7a6c50']].forEach(function (p, i) {
      R(tx + 1, p[0], 14, p[1], p[2]); R(tx + 13, p[0], 2, p[1], sh(p[2], 0.6));
      for (let k = 0; k < 4; k++) R(tx + 3, p[0] + 2 + k * 3, 4 + Math.floor(hsh(k, i + 481) * 7), 1, 'rgba(30,20,10,0.6)');
      if (i === 1) { ell(tx + 7, p[0] + 5, 3, 3, '#2a2218'); R(tx + 5, p[0] + 8, 5, 3, '#2a2218'); }  // «Розыск»: чьё-то лицо
    });
    R(tx - 1, 127, 18, 3, '#1e1c16'); ell(tx + 8, 126, 8, 3, '#262420'); R(tx + 7, 120, 2, 4, '#1e1c16'); R(tx - 1, 184, 18, 2, '#1a1812');
  }
  function fillerC() {
    R(1102, 168, 58, 18, '#2c2c28'); R(1102, 166, 58, 2, '#3e3e3a');
    for (let k = 1104; k < 1160; k += 4) { R(k, 150, 1, 16, '#101414'); R(k - 1, 149, 3, 1, '#101414'); }
    R(1102, 154, 58, 1, '#101414'); R(1102, 162, 58, 1, '#101414');
    R(1140, 176, 18, 2, '#3a2a1a'); R(1141, 178, 1, 8, '#1a120a'); R(1156, 178, 1, 8, '#1a120a'); R(1140, 170, 18, 2, '#2e2216');   // скамейка
  }

  /* ---------- 3. Мастерская Гофмана ---------- */
  function clockStatic() {
    const x0 = 614, w = 160;
    brick(x0, 28, w, 148, '#3c2420', 501);
    R(x0, 176, w, 10, '#221a16'); R(x0, 176, w, 1, '#3a2e26');
    cornice(x0, 22, w, '#3a2a22'); roofTin(x0 - 2, 21, w + 4, 6, '#1e2624');
    chimney(x0 + 22, 4, 12, '#3a2420', true); chimney(x0 + w - 30, 6, 10, '#3a2420', false);
    R(x0, 64, w, 2, '#4e3229'); R(x0, 66, w, 1, '#241612'); R(x0, 100, w, 2, '#4e3229');
    [628, 664, 702, 740].forEach(function (wx) { swin(wx, 34, 14, 22, { wall: '#3c2420', hood: true, lit: 0.45 }); });
    [628, 664, 744].forEach(function (wx) { swin(wx, 72, 14, 22, { wall: '#3c2420', hood: true, lit: 0.55, cur: '#2a3a2a' }); });
    // витрина часовщика: бутылочно-зелёная деревянная рама и фриз с надписью
    R(620, 104, 148, 72, '#16241e'); R(620, 104, 148, 9, '#1c2e26'); R(620, 104, 148, 1, '#2e4438'); R(620, 112, 148, 1, '#0a120e');
    const t = 'ЧАСЫ · ГОФМАН'; sfText(t, Math.round(694 - sfWidth(t) / 2), 106, '#c9a24e', '#06100c');
    [622, 698, 730, 764].forEach(function (px) { R(px, 113, 4, 63, '#1e3028'); R(px, 113, 1, 63, '#2e4438'); });
    // большая витрина: полки, десятки часов, все стоят
    R(626, 116, 72, 52, '#140c08');
    [134, 150].forEach(function (sy) { R(626, sy, 72, 2, '#3a2414'); R(626, sy, 72, 1, '#6a4428'); });
    [[634, 126, 5], [648, 124, 4], [660, 127, 5], [674, 125, 3], [688, 126, 4], [636, 143, 4], [664, 142, 5], [676, 144, 3], [640, 160, 5], [656, 159, 4]].forEach(function (c2) { clockFace(c2[0], c2[1], c2[2], '#6a4a20'); });
    R(682, 138, 12, 30, '#2a1810'); R(683, 139, 10, 28, '#3a2416'); clockFace(688, 145, 4, '#8a6a2a');   // регулятор
    R(684, 152, 8, 13, '#1a0e08');
    R(626, 166, 72, 2, '#4a3020');
    // дверь с колокольчиком
    R(704, 116, 26, 60, '#0e1612'); R(706, 118, 22, 58, '#1a2a22'); R(706, 118, 22, 1, '#2e4438');
    R(709, 121, 16, 22, '#0d1416'); R(716, 121, 1, 22, '#1a2a22'); R(709, 131, 16, 1, '#1a2a22');
    R(709, 147, 16, 26, '#14221c'); R(710, 148, 14, 1, '#2a3e34');
    R(726, 150, 2, 3, '#b8923e'); R(716, 112, 3, 3, '#a8842e');
    // правое окно — мастерская, где работает Лиза
    R(736, 116, 26, 52, '#100a06'); R(748, 116, 1, 52, '#1e3028');
    R(733, 168, 32, 2, '#2e4438');
    R(620, 168, 82, 2, '#2e4438'); R(620, 170, 82, 6, '#14201a');
    // часы на кронштейне над дверью: тоже без четверти три
    R(714, 70, 5, 3, '#141414'); pline(716, 72, 716, 76, '#141414'); pline(712, 70, 720, 70, '#141414');
    R(711, 68, 1, 2, '#141414'); R(720, 68, 1, 2, '#141414');
    ell(716, 86, 10, 10, '#1a1410'); clockFace(716, 86, 8, '#8a6a2a');
    R(715, 96, 3, 3, '#1a1410');
  }

  /* ---------- 4. Сенной рынок ---------- */
  function awning(x0, x1, y, h, c1, c2) {
    for (let x = x0; x < x1; x += 6) {
      const cc = ((x - x0) / 6) % 2 ? c1 : c2;
      R(x, y, Math.min(6, x1 - x), h, cc); R(x + 1, y + h, Math.min(4, x1 - x - 1), 2, cc); R(x + 2, y + h + 2, Math.min(2, x1 - x - 2), 1, cc);
      R(x, y, Math.min(6, x1 - x), 1, sh(cc, 1.25));
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0, y + h - 3, x1 - x0, 3);
  }
  function marketStatic() {
    // гостиные ряды в глубине площади
    const ax0 = 1168, ax1 = 1474;
    plaster(ax0, 114, ax1 - ax0, 54, '#34322a', 601);
    R(ax0, 168, ax1 - ax0, 18, '#1a1a16');
    R(ax0, 110, ax1 - ax0, 4, '#46443a'); R(ax0, 113, ax1 - ax0, 1, '#1e1d18');
    roofTin(ax0 - 2, 109, ax1 - ax0 + 4, 5, '#1c2422');
    R(1306, 90, 20, 18, '#3a382e'); onion(1316, 92, 8, 22, '#2a3a34', '#4a5a52', '#1a2420'); crossO(1316, 62, '#2a2a26');
    for (let x = ax0 + 6; x < ax1 - 14; x += 22) {
      R(x, 128, 16, 40, '#0e0c0a'); ell(x + 8, 128, 8, 6, '#0e0c0a');
      R(x - 3, 124, 1, 44, '#4a473c'); if (CUR) CUR.arc.push(x + 8 + OX);
    }
    // ворота с надписью
    [1176, 1250].forEach(function (px) { R(px, 120, 4, 66, '#2a1e14'); R(px, 120, 1, 66, '#3e2c1c'); });
    R(1170, 109, 86, 12, '#2a1e12'); R(1170, 109, 86, 1, '#4a3622'); R(1171, 110, 84, 10, '#1a2a22');
    const t = 'СЕННОЙ РЫНОК'; sfText(t, Math.round(1213 - sfWidth(t) / 2), 112, '#d0c090', '#081008');
    // лоток с горшками
    [1264, 1314].forEach(function (px) { R(px, 130, 3, 56, '#2a1e14'); });
    awning(1258, 1322, 124, 10, '#6a2a24', '#a89a78');
    R(1260, 160, 58, 26, '#2a1c12'); R(1260, 160, 58, 2, '#4a3622'); for (let k = 1262; k < 1318; k += 8) R(k, 163, 1, 23, '#1a120a');
    [[1268, 4, '#6a3a22'], [1278, 5, '#5a3020'], [1290, 3, '#7a6a5a'], [1300, 4, '#6a3a22'], [1310, 3, '#4a5a4a']].forEach(function (p) { ell(p[0], 160 - p[1], p[1], p[1], p[2]); R(p[0] - 1, 158 - p[1] * 2, 3, 2, p[2]); R(p[0] - p[1] + 1, 158 - p[1], 1, 2, sh(p[2], 1.4)); });
    // лоток Фроси: всё на свете
    [1328, 1398].forEach(function (px) { R(px, 122, 3, 64, '#2a1e14'); });
    awning(1322, 1404, 116, 11, '#2a4a3a', '#a89a78');
    R(1331, 130, 67, 30, '#16120e');
    for (let k = 1334; k < 1396; k += 9) { R(k, 130, 1, 4, '#3a3a36'); }
    ell(1336, 138, 3, 4, '#3a3a30'); R(1336, 132, 1, 3, '#3a3a36');                         // сковородки на крючьях
    ell(1344, 139, 3, 3, '#4a3a2a'); R(1344, 133, 1, 3, '#3a3a36');
    R(1384, 133, 1, 3, '#3a3a36'); for (let r = 0; r < 7; r++) R(1381, 136 + r, 7, 1, r % 3 ? 'rgba(0,0,0,0)' : '#5a4a30');   // клетка
    for (let k = 0; k < 4; k++) R(1381 + k * 2, 136, 1, 7, '#5a4a30');
    // стулья вверх ногами на навесе
    R(1336, 106, 10, 2, '#2a1e14'); R(1337, 100, 1, 6, '#2a1e14'); R(1344, 100, 1, 6, '#2a1e14');
    R(1380, 105, 12, 2, '#2a1e14'); R(1381, 98, 1, 7, '#2a1e14'); R(1390, 98, 1, 7, '#2a1e14'); R(1360, 108, 14, 8, '#3a2a1a'); R(1360, 108, 14, 1, '#4a3a26');
    R(1324, 160, 78, 26, '#2e2016'); R(1324, 160, 78, 2, '#5a4630'); for (let k = 1326; k < 1402; k += 9) R(k, 163, 1, 23, '#1a120a');
    // на прилавке: книги, утюг, подсвечник, самовар
    [[1332, '#5a2a1e'], [1332, '#2a3a4a'], [1333, '#4a4a2a']].forEach(function (b, i) { R(b[0], 157 - i * 2, 12 - i, 2, b[1]); });
    R(1348, 155, 8, 5, '#1e1e1e'); R(1350, 153, 4, 2, '#1e1e1e');
    R(1374, 150, 1, 10, '#8a7040'); R(1371, 158, 7, 2, '#8a7040'); R(1373, 148, 3, 2, '#d8d0b8');
    [6, 8, 9, 9, 9, 8, 7, 5, 4, 4, 6, 3].forEach(function (ww, r) { R(1390 - Math.floor(ww / 2), 159 - r, ww, 1, r < 5 ? '#8a6a2a' : '#a8843a'); });
    R(1388, 158, 1, 1, '#f0d890'); R(1394, 153, 2, 1, '#6a5020');
    // воз с сеном
    R(1408, 160, 62, 5, '#3a2a1a'); R(1408, 160, 62, 1, '#5a4228');
    ell(1439, 150, 31, 12, '#4a3e22'); ell(1436, 146, 24, 9, '#5a4c2a');
    for (let k = 0; k < 26; k++) { const sx = 1412 + Math.floor(hsh(k, 621) * 54), sy = 140 + Math.floor(hsh(k, 622) * 18); R(sx, sy, 3, 1, hsh(k, 623) > 0.5 ? '#6a5a34' : '#3a3018'); }
    [1420, 1458].forEach(function (wx) {
      g.strokeStyle = '#1e140c'; g.lineWidth = 2; g.beginPath(); g.arc(wx, 175, 10, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 1; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.beginPath(); g.moveTo(wx, 175); g.lineTo(wx + Math.cos(a) * 9, 175 + Math.sin(a) * 9); g.stroke(); }
      R(wx - 1, 174, 3, 3, '#2a1e14');
    });
    pline(1470, 164, 1486, 184, '#2a1e14'); pline(1470, 165, 1486, 185, '#2a1e14');
    // бочка и ящики
    R(1232, 168, 11, 18, '#3a2816'); R(1231, 171, 13, 1, '#1a1a18'); R(1231, 181, 13, 1, '#1a1a18'); R(1233, 168, 1, 18, '#4e3a22');
    R(1402, 174, 10, 12, '#4a3822'); R(1402, 174, 10, 1, '#6a5232'); R(1406, 174, 1, 12, '#2a1e12');
  }
  function fillerD() {
    const x0 = 1486, w = 68;
    plaster(x0, 92, w, 84, '#3a3a30', 651);
    R(x0, 176, w, 10, '#22221e'); cornice(x0, 86, w, '#36362c'); roofTin(x0 - 2, 85, w + 4, 5, '#1c2422');
    swin(1496, 104, 12, 20, { wall: '#3a3a30', hood: true, lit: 0.5 }); swin(1530, 104, 12, 20, { wall: '#3a3a30', hood: true, lit: 0.5, cur: '#3a2a4a' });
    swin(1530, 142, 12, 20, { wall: '#3a3a30', lit: 0.4 });
    // водоразборная колонка
    R(1499, 158, 5, 28, '#1a2220'); R(1498, 156, 7, 3, '#222c2a'); R(1500, 158, 1, 28, '#2a3634');
    R(1504, 168, 5, 2, '#1a2220'); R(1508, 170, 1, 2, '#1a2220');
    pline(1498, 160, 1490, 150, '#1a2220'); R(1489, 149, 2, 2, '#222c2a');
  }

  /* ---------- 5. Дом Агаты ---------- */
  function agataStatic() {
    // рябина
    bareTree(1574, 186, 90, 71, '#1a1612');
    for (let k = 0; k < 70; k++) {
      const a = hsh(k, 711) * Math.PI * 2, r = Math.sqrt(hsh(k, 712)) * 24;
      ell(1574 + Math.cos(a) * r * 1.2, 112 + Math.sin(a) * r * 0.8, 3, 2, hsh(k, 713) > 0.5 ? '#1e2618' : '#283220');
    }
    for (let k = 0; k < 16; k++) {
      const bx = 1556 + Math.floor(hsh(k, 714) * 38), by = 98 + Math.floor(hsh(k, 715) * 30);
      R(bx, by, 2, 2, '#8a2418'); R(bx + 1, by + 1, 2, 1, '#b03420'); R(bx - 1, by + 2, 2, 1, '#6a1a12');
    }
    // сруб на каменном подклете
    logs(1598, 120, 102, 56, '#3a2a1c', 701);
    R(1594, 176, 110, 10, '#2a2824'); for (let k = 1596; k < 1702; k += 9) R(k, 177 + (k % 2), 7, 4, '#34322c');
    // фронтон: кровля, доски, причелины с подзором, «полотенце»
    for (let yy = 74; yy <= 122; yy++) {
      const t = (yy - 74) / 48, half = Math.round(t * 62);
      if (half > 7) { R(1649 - half + 7, yy, (half - 7) * 2, 1, '#33271b'); for (let k = 1649 - half + 8; k < 1649 + half - 7; k += 5) R(k, yy, 1, 1, '#241a10'); }
      R(1649 - half - 2, yy, 8, 1, '#221c18'); R(1649 + half - 6, yy, 8, 1, '#221c18');
      R(1649 - half + 5, yy, 2, 1, '#5e6c70'); R(1649 + half - 7, yy, 2, 1, '#5e6c70');
      if (yy % 4 === 0 && half > 8) { R(1649 - half + 7, yy, 2, 2, '#5e6c70'); R(1649 + half - 9, yy, 2, 2, '#5e6c70'); }
    }
    R(1647, 70, 4, 6, '#221c18'); R(1648, 76, 2, 10, '#5e6c70');
    for (let r = 0; r < 4; r++) R(1646 + (r % 2), 86 + r * 2, 4, 2, '#5e6c70');
    swin(1644, 98, 10, 10, { wall: '#33271b', always: true, cur: '#6a3a20', fr: '#2a2016' });
    // окна в резных наличниках со ставнями
    [1610, 1643, 1676].forEach(function (wx) {
      swin(wx, 142, 12, 16, { wall: '#3a2a1c', always: true, cur: '#7a3a1e', fr: '#4e5c60', shut: '#4a585c' });
      for (let r = 0; r < 5; r++) R(wx - 3 + r, 137 - r, 18 - r * 2, 1, '#5e6c70');           // кокошник
      R(wx + 5, 130, 2, 3, '#5e6c70'); R(wx - 3, 137, 1, 2, '#5e6c70'); R(wx + 14, 137, 1, 2, '#5e6c70');
      R(wx - 2, 161, 16, 2, '#5e6c70'); R(wx + 2, 163, 8, 2, '#5e6c70'); R(wx + 4, 165, 4, 1, '#5e6c70');
    });
    // пучки трав под стрехой
    for (let k = 0; k < 11; k++) {
      const hx = 1600 + k * 9 + Math.floor(hsh(k, 721) * 3);
      R(hx + 1, 120, 1, 3, '#2a2016');
      [1, 2, 3, 3, 2].forEach(function (ww, r) { R(hx + 1 - Math.floor(ww / 2), 123 + r, ww, 1, ['#3a4a26', '#4a4a28', '#5a3a24', '#2e3e22'][(k + r) % 4]); });
    }
    // сени и крыльцо с навесом на резных столбиках
    for (let x = 1702; x < 1750; x += 4) { R(x, 124, 4, 52, hsh(x, 731) > 0.5 ? '#34281c' : '#30251a'); R(x, 124, 1, 52, '#40321f'); }
    for (let r = 0; r < 8; r++) R(1700 + r, 116 + r, 52 - r * 2, 1, r === 0 ? '#2e3a38' : '#221c18');
    R(1716, 140, 16, 36, '#0e0906'); R(1716, 140, 16, 1, '#40321f');
    for (let r = 0; r < 4; r++) R(1706 - r, 130 + r, 36 + r * 2, 1, r === 3 ? '#2e3a38' : '#221c18');
    [1708, 1738].forEach(function (px) { R(px, 134, 2, 42, '#40321f'); R(px - 1, 146, 4, 3, '#4a3a24'); R(px - 1, 160, 4, 3, '#4a3a24'); });
    [[1710, 176, 30], [1708, 179, 34], [1706, 182, 38]].forEach(function (s) { R(s[0], s[1], s[2], 3, '#3a2c1c'); R(s[0], s[1], s[2], 1, '#54402a'); });
    R(1740, 134, 5, 1, '#121414'); R(1742, 135, 1, 2, '#121414'); R(1740, 137, 5, 6, '#1a2422'); R(1740, 143, 5, 1, '#121414');
    chimney(1676, 82, 14, '#3a2a24', true);
    // штакетник с калиткой
    for (let x = 1582; x < 1830; x += 4) {
      if (x > 1702 && x < 1748) continue;
      const lean = hsh(x, 741) > 0.92 ? 1 : 0, miss = hsh(x, 742) > 0.95;
      if (miss) continue;
      R(x + lean, 162, 2, 24, hsh(x, 743) > 0.5 ? '#2e2418' : '#33291c'); R(x + lean, 161, 1, 1, '#2e2418'); R(x + lean, 162, 1, 24, '#3e3222');
    }
    R(1582, 167, 120, 2, '#261e14'); R(1582, 180, 120, 2, '#261e14'); R(1748, 167, 82, 2, '#261e14'); R(1748, 180, 82, 2, '#261e14');
    R(1702, 162, 3, 24, '#3a2c1c'); R(1746, 162, 3, 24, '#3a2c1c');
    for (let x = 1705; x < 1714; x += 3) R(x, 160 + Math.floor((x - 1705) / 3), 2, 24, '#2a2016');      // распахнутая калитка
  }
  function fillerE() {
    R(1772, 168, 24, 18, '#2e2216'); for (let yy = 168; yy < 186; yy += 4) R(1772, yy, 24, 1, '#40301e');   // колодезный сруб
    R(1770, 166, 28, 2, '#3a2a1a');
    R(1804, 112, 4, 74, '#2a2016'); R(1804, 112, 1, 74, '#3a2c1c'); R(1802, 110, 8, 3, '#2a2016');          // журавль
    pline(1776, 92, 1836, 138, '#2a2016'); pline(1776, 93, 1836, 139, '#2a2016');
    R(1834, 136, 6, 6, '#2a2620');
    R(1776, 93, 1, 58, '#3a3226'); R(1773, 151, 7, 6, '#2a2016'); R(1773, 151, 7, 1, '#4a3a24');
  }

  /* ---------- 6. Собор ---------- */
  function churchStatic() {
    const C = '#4a4840', CD = '#36352f', CL = '#5c5a50';
    // колокольня: ярус звона пуст — колокол тридцать лет как молчит
    plaster(1840, 76, 38, 110, C, 801);
    cornice(1840, 70, 38, C); plaster(1844, 22, 30, 48, C, 802); cornice(1844, 16, 30, C);
    R(1848, 0, 22, 16, CD); R(1849, 0, 1, 16, CL);
    R(1850, 30, 18, 34, '#090a0a'); ell(1859, 30, 9, 7, '#090a0a');
    R(1850, 34, 18, 2, '#2a241c'); R(1858, 36, 2, 3, '#1a1612');                          // балка и пустой крюк
    R(1849, 64, 20, 2, CL);
    swin(1853, 112, 12, 24, { wall: C, arch: true, lit: 0.4, dim: 0.55, cur: '#3a2010' });
    // низкая дверь колокольни: окованная, на ржавом замке
    R(1849, 152, 20, 34, CD); ell(1859, 152, 10, 6, CD);
    R(1851, 154, 16, 32, '#24180e'); ell(1859, 154, 8, 4, '#24180e');
    [160, 172].forEach(function (yy) { R(1851, yy, 16, 2, '#121212'); R(1852, yy, 1, 1, '#3a3a36'); R(1865, yy, 1, 1, '#3a3a36'); });
    R(1859, 152, 1, 34, '#140c06');
    R(1862, 166, 4, 4, '#4a3a22'); R(1863, 164, 2, 2, '#2a2016'); R(1863, 167, 1, 2, '#120c06');
    // основной объём
    plaster(1880, 66, 244, 120, C, 803);
    R(1880, 176, 244, 10, CD); R(1880, 176, 244, 1, CL);
    cornice(1880, 58, 244, C);
    [1880, 1934, 2066, 2118].forEach(function (px) { R(px, 66, 6, 110, CL); R(px + 5, 66, 1, 110, CD); R(px - 1, 66, 8, 3, '#6a685c'); });
    [1898, 1914, 2084, 2100].forEach(function (wx) { swin(wx, 92, 10, 34, { wall: C, arch: true, lit: 0.85, dim: 0.6, cur: '#3a2010', key: true }); });
    [1900, 2086].forEach(function (wx) { ell(wx + 9, 148, 5, 5, CD); ell(wx + 9, 148, 4, 4, '#141414'); });
    // центральный притвор с фронтоном
    plaster(1954, 84, 92, 92, '#504e45', 804);
    for (let r = 0; r < 17; r++) {
      R(1950 + r * 3, 83 - r, 100 - r * 6, 1, '#403e37');
      R(1950 + r * 3, 83 - r, 4, 1, '#6a685c'); R(1950 + 96 - r * 3, 83 - r, 4, 1, '#55534a');
    }
    ell(2000, 74, 6, 6, '#2a2418'); ell(2000, 74, 5, 5, '#3a3020'); R(1999, 71, 2, 6, '#7a6436'); R(1997, 73, 6, 2, '#7a6436');
    R(1950, 84, 100, 3, CL); R(1950, 87, 100, 1, CD);
    // портал: уступы арки, дверь с коваными полосами, икона над входом
    [[1970, 30, '#3e3c35'], [1976, 24, '#2e2d28'], [1982, 18, '#1e1d1a']].forEach(function (a) {
      R(a[0], 116, a[1] * 2, 60, a[2]); ell(a[0] + a[1], 116, a[1], a[1] * 0.8, a[2]);
    });
    R(1986, 132, 28, 44, '#1e140c'); R(1999, 132, 2, 44, '#0e0906');
    [138, 152, 166].forEach(function (yy) { R(1986, yy, 28, 1, '#3a3430'); });
    for (let k = 1988; k < 2014; k += 4) { R(k, 140, 1, 1, '#5a5048'); R(k, 160, 1, 1, '#5a5048'); }
    ell(2000, 124, 8, 6, '#2a2216'); ell(2000, 124, 5, 4, '#1a140c'); R(1998, 122, 4, 6, '#3a2a1a');
    // ступени
    [[1958, 176, 84], [1954, 179, 92], [1950, 182, 100]].forEach(function (s) { R(s[0], s[1], s[2], 3, '#3a3934'); R(s[0], s[1], s[2], 1, '#4e4d48'); });
    [1948, 2052].forEach(function (px) { R(px, 160, 2, 26, '#121414'); R(px - 2, 151, 6, 1, '#121414'); R(px - 2, 152, 1, 7, '#121414'); R(px + 3, 152, 1, 7, '#121414'); R(px - 2, 159, 6, 1, '#121414'); });
    // барабан и главный купол — уходит выше кадра
    plaster(1974, 42, 52, 18, C, 805);
    cornice(1974, 36, 52, C);
    [1982, 1997, 2012].forEach(function (wx) { swin(wx, 46, 6, 10, { wall: C, arch: true, lit: 0.6, dim: 0.5, cur: '#3a2010' }); });
    onion(2000, 36, 21, 46, '#5a4a26', '#9a8448', '#3a3018');
    crossO(2000, -22, '#5a4a26');
    // малые главки по углам
    [1890, 2114].forEach(function (cx) { R(cx - 4, 52, 8, 6, C); onion(cx, 52, 5, 16, '#5a4a26', '#9a8448', '#3a3018'); crossO(cx, 24, '#2a2620'); });
  }
  function fillerF() {
    bareTree(2178, 186, 104, 91, '#161412');
    R(2186, 170, 52, 16, '#2c2c28'); R(2186, 168, 52, 2, '#3e3e3a');
  }

  /* ---------- 7. Вдовье кладбище ---------- */
  function cemeteryStatic() {
    // часовня в глубине
    plaster(2276, 112, 28, 48, '#3e3c36', 901);
    for (let r = 0; r < 8; r++) R(2274 + r * 2, 111 - r, 32 - r * 4, 1, '#22201c');
    onion(2290, 103, 4, 14, '#2a3632', '#4a5a52', '#1a2220'); crossO(2290, 77, '#2a2a26');
    R(2286, 130, 8, 30, '#0a0a0a'); ell(2290, 130, 4, 3, '#0a0a0a');
    bareTree(2318, 170, 112, 37, '#141412'); bareTree(2508, 170, 118, 53, '#141412');
    // кресты и камни над стеной
    [[2252, 136], [2266, 142], [2326, 126], [2342, 134], [2440, 124], [2468, 136], [2478, 146], [2488, 130], [2530, 132], [2546, 140]].forEach(function (p, i) {
      const x = p[0], top = p[1], cc = i % 2 ? '#141513' : '#191a17';
      R(x, top, 2, 36, cc); R(x, top, 1, 36, '#2c2c28');
      R(x - 4, top + 7, 10, 2, cc); R(x - 2, top + 3, 6, 1, cc); R(x - 4, top + 7, 10, 1, '#2c2c28');
      pline(x - 3, top + 18, x + 4, top + 15, cc); pline(x - 3, top + 19, x + 4, top + 16, cc);
      if (i % 3 === 1) { R(x - 5, top + 9, 1, 5, '#3a2424'); R(x + 6, top + 9, 1, 3, '#3a2424'); }       // выцветший венок
    });
    [[2300, 150, 9], [2352, 140, 10], [2420, 142, 9], [2456, 148, 8], [2510, 138, 12]].forEach(function (s) {
      R(s[0], s[1] + 4, s[2], 24, '#1e1e1b'); ell(s[0] + s[2] / 2, s[1] + 4, s[2] / 2, 4, '#1e1e1b'); R(s[0] + 1, s[1] + 2, 1, 26, '#34332e');
    });
    // сторожка Прохора
    for (let x = 2414; x < 2462; x += 4) R(x, 124, 4, 40, hsh(x, 911) > 0.5 ? '#2a2016' : '#2e2318');
    for (let r = 0; r < 12; r++) R(2410 + r * 2, 123 - r, 56 - r * 4, 1, r === 0 ? '#2a3432' : '#1c1814');
    swin(2430, 132, 10, 10, { wall: '#2a2016', always: true, cur: '#4a2a14', fr: '#1a120c' });
    chimney(2448, 104, 12, '#3a2a24', true);
    // ограда: беленая стена, кирпичные столбы, пики
    for (let x = 2244; x < 2556; x++) {
      if (x >= 2356 && x < 2408) continue;
      R(x, 160, 1, 26, hsh(Math.floor(x / 3), 921) > 0.88 ? '#2e2d29' : '#3c3b35');
    }
    for (let k = 0; k < 14; k++) { const px = 2246 + Math.floor(hsh(k, 922) * 300); if (px > 2350 && px < 2412) continue; R(px, 164 + Math.floor(hsh(k, 923) * 14), 4 + Math.floor(hsh(k, 924) * 6), 3, '#2a1c18'); }
    R(2244, 157, 112, 3, '#4c4a43'); R(2408, 157, 148, 3, '#4c4a43');
    for (let x = 2250; x < 2556; x += 48) {
      if (x > 2340 && x < 2412) continue;
      brick(x, 148, 8, 38, '#3a2420', 925); R(x - 1, 146, 10, 3, '#4c4a43');
    }
    for (let x = 2246; x < 2556; x += 3) {
      if (x >= 2354 && x < 2410) continue;
      R(x, 147, 1, 10, '#0e1010'); R(x - 1, 148, 3, 1, '#0e1010');
    }
    // ворота с аркой и крестом; правая створка приоткрыта
    [2356, 2400].forEach(function (px) { brick(px, 116, 8, 70, '#3a2420', 931); R(px - 1, 114, 10, 3, '#4c4a43'); ell(px + 4, 111, 3, 3, '#4c4a43'); });
    g.strokeStyle = '#0e1010'; g.lineWidth = 2; g.beginPath(); g.ellipse(2382, 120, 18, 12, 0, Math.PI, Math.PI * 2); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.ellipse(2382, 120, 14, 8, 0, Math.PI, Math.PI * 2); g.stroke();
    for (let k = 2368; k < 2398; k += 4) { const t = (k - 2382) / 16; R(k, Math.round(120 - Math.sqrt(Math.max(0, 1 - t * t)) * 10), 1, 3, '#0e1010'); }
    crossO(2382, 96, '#0e1010'); R(2383, 96, 1, 12, '#0e1010'); R(2379, 99, 7, 1, '#0e1010');
    for (let x = 2365; x < 2382; x += 3) R(x, 122, 1, 64, '#0e1010');
    R(2364, 128, 18, 1, '#0e1010'); R(2364, 178, 18, 1, '#0e1010');
    for (let x = 2394; x < 2400; x += 2) R(x, 124 + (x - 2394), 1, 62 - (x - 2394), '#0e1010');
    R(2394, 130, 6, 1, '#0e1010');
    R(2412, 138, 1, 48, '#121414'); R(2412, 138, 5, 1, '#121414');                        // столб с фонарём Прохора
  }
  function endStatic() {
    for (let x = 2566; x < 2626; x += 5) { const lean = Math.floor((x - 2566) / 14); R(x + lean, 162 + Math.floor(hsh(x, 951) * 6), 3, 24, '#221c14'); }
    R(2566, 170, 60, 2, '#1c160e');
    R(2612, 136, 2, 50, '#221c14');
    for (let r = 0; r < 7; r++) R(2604, 138 + r, 22 + (r < 4 ? r : 6 - r), 1, '#2a2218');
    bareTree(2650, 186, 80, 113, '#141210');
  }

  /* ============================================================
     НОВЫЕ ДОМА: мимо них просто проходишь (но что-то можно рассмотреть)
     ============================================================ */
  function sign(cx, y, t, bg, fg) {                          // доска с надписью
    const tw = sfWidth(t);
    R(cx - tw / 2 - 4, y - 2, tw + 8, 9, '#1a120a'); R(cx - tw / 2 - 3, y - 1, tw + 6, 7, bg || '#2a1e12'); R(cx - tw / 2 - 3, y - 1, tw + 6, 1, sh(bg || '#2a1e12', 1.5));
    sfText(t, Math.round(cx - tw / 2), y, fg || '#c8b890', '#0a0604');
  }
  function door(x, y, w, h, col) {
    R(x - 2, y - 2, w + 4, h + 2, sh(col, 0.5)); R(x, y, w, h, col); R(x, y, w, 1, sh(col, 1.4));
    const pw = Math.floor((w - 3) / 2);
    [x + 1, x + 2 + pw].forEach(function (px) { R(px, y + 3, pw, Math.floor(h * 0.4), sh(col, 0.8)); R(px, y + 6 + Math.floor(h * 0.4), pw, Math.floor(h * 0.45), sh(col, 0.8)); R(px, y + 3, pw, 1, sh(col, 1.2)); });
    R(x + w - 4, y + Math.floor(h * 0.55), 2, 2, '#b8923e');
  }
  function steps(x, w, n) { for (let k = 0; k < n; k++) { R(x - k * 2, 186 - (n - k) * 3, w + k * 4, 3, '#3a3934'); R(x - k * 2, 186 - (n - k) * 3, w + k * 4, 1, '#4c4b46'); } }
  function crate(x, y, s, col) { R(x, y, s, s, col); R(x, y, s, 1, sh(col, 1.3)); R(x, y + s - 1, s, 1, sh(col, 0.6)); R(x, y, 1, s, sh(col, 1.15)); pline(x + 1, y + 1, x + s - 2, y + s - 2, sh(col, 0.7)); R(x + s - 1, y, 1, s, sh(col, 0.6)); }
  function barrel(x, y, col) { R(x, y, 10, 16, col); R(x - 1, y + 3, 12, 10, col); R(x - 1, y + 3, 12, 1, '#1a1a18'); R(x - 1, y + 12, 12, 1, '#1a1a18'); R(x + 1, y, 1, 16, sh(col, 1.3)); R(x, y, 10, 1, sh(col, 1.4)); }
  function postSign(x, t, dir) {                              // столб-указатель с названием улицы
    R(x, 132, 2, 54, '#1a140e'); R(x + 1, 132, 1, 54, '#2a2016');
    const tw = sfWidth(t) + 10, bx = dir < 0 ? x - tw + 4 : x - 2;
    R(bx, 124, tw, 10, '#1a120a'); R(bx + 1, 125, tw - 2, 8, '#2a3a4a'); R(bx + 1, 125, tw - 2, 1, '#4a5a6a');
    sfText((dir < 0 ? '◂ ' : '') + t + (dir > 0 ? ' ▸' : ''), bx + 3, 127, '#e0d8c0', '#0a1018');
  }
  /* --- Береговая --- */
  function warehouse(x0) {
    const w = 150, cx = x0 + w / 2;
    brick(x0, 76, w, 100, '#3a2a22', 1001);
    R(x0, 176, w, 10, '#1e1814'); R(x0, 176, w, 1, '#34302a');
    for (let r = 0; r < 26; r++) { const hw = Math.round(w / 2 + 3 - r * 3); if (hw <= 2) break; R(cx - hw, 76 - r, hw * 2, 1, r ? '#33251e' : '#4a362c'); R(cx - hw - 2, 76 - r, 3, 1, '#1e2826'); R(cx + hw - 1, 76 - r, 3, 1, '#1e2826'); }
    ell(cx, 62, 7, 7, '#151210'); ell(cx, 62, 5, 5, '#0d1416'); R(cx, 57, 1, 10, '#151210'); R(cx - 5, 62, 10, 1, '#151210');
    R(cx - 2, 50, 34, 3, '#2a1e14'); R(cx - 2, 50, 34, 1, '#3e2c1c'); R(cx + 28, 53, 1, 44, '#4a4030'); R(cx + 26, 97, 5, 2, '#3a3a36'); R(cx + 27, 99, 2, 3, '#3a3a36');
    sign(cx, 98, 'ПАКГАУЗ');
    R(cx - 31, 110, 62, 66, '#140e08');
    for (let x = cx - 30; x < cx + 30; x += 6) { R(x, 111, 5, 65, hsh(x, 1002) > 0.5 ? '#3a2a1a' : '#33251a'); R(x, 111, 1, 65, '#46341f'); }
    pline(cx - 29, 174, cx - 2, 114, '#2a1e12'); pline(cx + 29, 174, cx + 2, 114, '#2a1e12');
    R(cx - 33, 138, 66, 4, '#1a1a1a'); R(cx - 33, 138, 66, 1, '#3a3a3a'); R(cx - 4, 141, 8, 9, '#4a3a22'); R(cx - 2, 138, 4, 3, '#2a2016'); R(cx - 1, 144, 2, 3, '#120c06');
    swin(x0 + 12, 92, 12, 18, { wall: '#3a2a22', arch: true, bars: true, lit: 0.12 }); swin(x0 + w - 24, 92, 12, 18, { wall: '#3a2a22', arch: true, bars: true, lit: 0.12 });
    crate(x0 + 4, 162, 14, '#4a3822'); crate(x0 + 18, 166, 10, '#3e2e1c'); crate(x0 + 7, 150, 12, '#433220');
    barrel(x0 + w - 16, 170, '#3a2816'); barrel(x0 + w - 28, 172, '#33230f');
    R(x0 + 40, 182, 18, 2, 'rgba(0,0,0,0.3)');
  }
  function tavern(x0) {
    const w = 132, wall = '#3e3a2e', cx = x0 + w / 2;
    plaster(x0, 60, w, 116, wall, 1011);
    R(x0, 176, w, 10, '#24231e'); cornice(x0, 54, w, '#36342a'); roofTin(x0 - 2, 53, w + 4, 6, '#1c2422');
    chimney(x0 + 20, 36, 14, '#3a2a24', true); chimney(x0 + w - 26, 38, 12, '#3a2a24', false);
    R(x0, 112, w, 3, '#4c483a'); R(x0, 115, w, 1, '#1e1d18');
    [x0 + 12, x0 + 40, x0 + 82, x0 + 110].forEach(function (wx, i) { swin(wx, 70, 12, 22, { wall: wall, hood: true, lit: i === 1 ? 0.9 : 0.55, cur: '#5a2a16' }); });
    R(x0 + 4, 118, w - 8, 10, '#1a2a2a'); R(x0 + 4, 118, w - 8, 1, '#2e4444'); R(x0 + 4, 127, w - 8, 1, '#0a1212');
    sfText('ТРАКТИР ЯКОРЬ', Math.round(cx - sfWidth('ТРАКТИР ЯКОРЬ') / 2), 120, '#d8c88a', '#060c0c');
    [x0 + 12, x0 + 100].forEach(function (wx) { swin(wx, 136, 18, 22, { wall: wall, lit: 0.3, shut: '#2e3a34' }); });
    door(cx - 10, 134, 20, 42, '#2a1a10'); steps(cx - 12, 24, 2);
    R(cx + 22, 100, 18, 2, '#141414'); R(cx + 38, 100, 1, 6, '#141414');       // кронштейн с якорем
    R(cx + 32, 106, 12, 12, '#2a1e12'); R(cx + 33, 107, 10, 10, '#1a2a2a');
    R(cx + 37, 108, 2, 7, '#c8a050'); R(cx + 35, 109, 6, 1, '#c8a050'); R(cx + 34, 113, 1, 2, '#c8a050'); R(cx + 41, 113, 1, 2, '#c8a050'); R(cx + 35, 115, 6, 1, '#c8a050'); ell(cx + 38, 108, 1.5, 1.5, '#c8a050');
    R(cx - 30, 180, 14, 4, '#3a2a1a'); R(cx - 26, 176, 5, 4, '#1e1a14');                      // забытый сапог у порога
  }
  function stairsUp(x0) {                                     // гранитная стенка и лестница наверх, на Сенную
    R(x0 + 30, 96, 100, 90, '#26282a');
    for (let y = 98; y < 186; y += 8) { R(x0 + 30, y, 100, 1, '#1a1c1e'); for (let x = x0 + 30 + (y % 16 ? 0 : 10); x < x0 + 130; x += 20) R(x, y, 1, 8, '#1a1c1e'); }
    R(x0 + 30, 96, 100, 2, '#3a3c3e');
    for (let k = 0; k < 15; k++) { const sx = x0 + 6 + k * 5, sy = 186 - k * 6; R(sx, sy, 40, 6, '#3a3934'); R(sx, sy, 40, 1, '#4e4d48'); R(sx, sy + 5, 40, 1, '#1a1a18'); }
    pline(x0 + 4, 160, x0 + 80, 90, '#0e1413'); pline(x0 + 4, 161, x0 + 80, 91, '#1e2826');
    for (let k = 0; k < 8; k++) { const px = x0 + 6 + k * 10; R(px, 160 - k * 9, 1, 24, '#0e1413'); }
    R(x0 + 84, 60, 2, 36, '#0e1413'); R(x0 + 80, 56, 10, 6, '#1c2624');
    for (let i = 0; i < 3; i++) R(x0 + 92 + i * 14, 70 - i * 6, 12, 26 + i * 6, '#111816');
    postSign(x0 + 10, 'СЕННАЯ', 1);
  }
  /* --- Сенная --- */
  function stairsDown(x0) {                                   // парапет над рекой и спуск
    for (let x = x0; x < x0 + 84; x += 1) { const t = x - x0; if (t > 26 && t < 58) continue; R(x, 160, 1, 26, t % 12 < 2 ? '#2e3032' : '#3a3c3e'); }
    R(x0, 156, 27, 4, '#4a4c4e'); R(x0 + 58, 156, 26, 4, '#4a4c4e');
    for (let k = 0; k < 6; k++) { R(x0 + 28 + k * 5, 186 - k * 2, 30 - k * 5, 2, '#2e2d29'); }
    R(x0 + 26, 186, 32, 30, '#0a0c0c');
    postSign(x0 + 70, 'БЕРЕГОВАЯ', -1);
  }
  function bakery(x0) {
    const w = 132, wall = '#4a4032', cx = x0 + w / 2;
    plaster(x0, 64, w, 112, wall, 1021);
    R(x0, 176, w, 10, '#26231e'); cornice(x0, 58, w, '#3e3628'); roofTin(x0 - 2, 57, w + 4, 6, '#1e2624');
    chimney(x0 + 98, 40, 14, '#3a2a24', true);
    [x0 + 14, x0 + 46, x0 + 78, x0 + 108].forEach(function (wx) { swin(wx, 72, 12, 22, { wall: wall, ped: true, lit: 0.5, cur: '#6a4a22' }); });
    sign(cx, 106, 'БУЛОЧНАЯ ШТЕРНА', '#3a2410', '#e8c878');
    R(x0 + 8, 118, 70, 50, '#120c08'); R(x0 + 9, 119, 68, 48, '#2a1c10');
    [134, 150].forEach(function (sy) { R(x0 + 9, sy, 68, 2, '#4a3420'); });
    [[x0 + 16, 130], [x0 + 34, 131], [x0 + 52, 129], [x0 + 20, 146], [x0 + 46, 147]].forEach(function (b) { for (let r = 0; r < 4; r++) R(b[0] - r, b[1] + r, 12 + r * 2, 1, r % 2 ? '#5a4024' : '#6a4a2a'); });
    R(x0 + 42, 119, 1, 48, '#120c08'); R(x0 + 9, 142, 68, 1, '#120c08');
    door(x0 + 90, 128, 22, 48, '#3a2414'); steps(x0 + 88, 26, 2);
    R(x0 + 118, 112, 14, 2, '#141414'); R(x0 + 130, 112, 1, 5, '#141414');                // крендель на кронштейне
    g.strokeStyle = '#c8963a'; g.lineWidth = 2; g.beginPath(); g.ellipse(x0 + 130, 124, 6, 5, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(x0 + 125, 128); g.lineTo(x0 + 135, 120); g.moveTo(x0 + 135, 128); g.lineTo(x0 + 125, 120); g.stroke(); g.lineWidth = 1;
  }
  function archHouse(x0) {
    const w = 168, wall = '#363c38';
    plaster(x0, 36, w, 140, wall, 1031); rust(x0, 120, w, 56, '#2e322e');
    R(x0, 176, w, 10, '#1e2220'); cornice(x0, 30, w, '#2e3430'); roofTin(x0 - 2, 29, w + 4, 6, '#1a2220');
    chimney(x0 + 30, 12, 12, '#3a2a24', true); chimney(x0 + 128, 14, 12, '#3a2a24', true);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) { if (r === 1 && (k === 2 || k === 3)) continue; swin(x0 + 10 + k * 26, 44 + r * 38, 12, 22, { wall: wall, hood: true, lit: 0.55, cur: ['#4a2a1a', '#2a3a4a', '#3a2a3a'][(k + r) % 3] }); }
    R(x0 + 60, 126, 48, 60, '#040606'); ell(x0 + 84, 126, 24, 14, '#040606');               // подворотня
    for (let x = x0 + 62; x < x0 + 108; x += 4) R(x, 132, 1, 54, '#121616');
    R(x0 + 60, 150, 48, 1, '#121616'); g.fillStyle = 'rgba(200,170,110,0.06)'; g.fillRect(x0 + 80, 150, 10, 36);
    R(x0 + 80, 104, 9, 8, '#2a3a4a'); sfText('7', x0 + 83, 106, '#e0d8c0');                  // номер дома
    [x0 + 14, x0 + 128].forEach(function (wx) { swin(wx, 138, 16, 22, { wall: '#2e322e', bars: true, lit: 0.3 }); });
    R(x0 + w - 6, 30, 4, 152, '#1c2422'); R(x0 + w - 6, 30, 1, 152, '#2e3a38');
  }
  function apothecary(x0) {
    const w = 124, wall = '#3a4440', cx = x0 + w / 2;
    plaster(x0, 62, w, 114, wall, 1041);
    R(x0, 176, w, 10, '#1e2422'); cornice(x0, 56, w, '#2e3834'); roofTin(x0 - 2, 55, w + 4, 6, '#1a2220');
    chimney(x0 + 18, 40, 12, '#3a2a24', true);
    [x0 + 12, x0 + 44, x0 + 76, x0 + 104].forEach(function (wx) { swin(wx, 70, 10, 22, { wall: wall, hood: true, lit: 0.4, cur: '#2a3a2a' }); });
    sign(cx, 104, 'АПТЕКА', '#14282a', '#d8e0d0');
    R(x0 + 10, 116, 62, 52, '#0e1412'); R(x0 + 11, 117, 60, 50, '#16201e');
    [134, 152].forEach(function (sy) { R(x0 + 11, sy, 60, 2, '#3a4440'); });
    [['#8a2a24', 16], ['#2a6a4a', 30], ['#2a4a8a', 44], ['#8a7a2a', 58]].forEach(function (j, i) { const jx = x0 + j[1]; R(jx, 124, 8, 10, j[0]); R(jx + 1, 121, 6, 3, '#c8c8c0'); R(jx + 1, 125, 2, 6, sh(j[0], 1.6)); R(jx, 142 + (i % 2) * 2, 6, 10, sh(j[0], 0.8)); R(jx + 1, 140 + (i % 2) * 2, 4, 2, '#c8c8c0'); });
    door(x0 + 82, 126, 22, 50, '#1e2e2a'); steps(x0 + 80, 26, 2);
    R(x0 + 108, 120, 8, 2, '#141414'); ell(x0 + 112, 130, 5, 6, '#2a2620'); R(x0 + 109, 124, 7, 3, '#3a3630');   // ступка
  }
  function postOffice(x0) {
    const w = 128, wall = '#4a2a22', cx = x0 + w / 2;
    brick(x0, 58, w, 118, wall, 1051);
    R(x0, 176, w, 10, '#221a16'); cornice(x0, 52, w, '#3a2420'); roofTin(x0 - 2, 51, w + 4, 6, '#1e2624');
    R(x0, 110, w, 2, '#5a3a2e');
    [x0 + 10, x0 + 34, x0 + 82, x0 + 106].forEach(function (wx) { swin(wx, 66, 12, 24, { wall: wall, arch: true, lit: 0.35 }); });
    sign(cx, 98, 'ПОЧТОВАЯ КОНТОРА', '#1e2a3e', '#e0d8c0');
    [x0 + 10, x0 + 100].forEach(function (wx) { swin(wx, 126, 18, 26, { wall: wall, arch: true, bars: true, lit: 0.25 }); });
    door(cx - 11, 124, 22, 52, '#2a1e14'); steps(cx - 13, 26, 2);
    R(cx + 18, 140, 12, 16, '#2a3a5a'); R(cx + 18, 140, 12, 1, '#4a5a7a'); R(cx + 20, 145, 8, 1, '#0a0e14'); R(cx + 21, 150, 6, 3, '#c8a050');   // почтовый ящик
  }
  function gate(x0, t, dir) {                                  // застава: два каменных столба
    [x0 + 8, x0 + 50].forEach(function (px) {
      R(px, 98, 14, 88, '#3e3c36'); R(px, 98, 2, 88, '#5a5850'); R(px + 12, 98, 2, 88, '#26251f');
      for (let y = 104; y < 186; y += 10) R(px, y, 14, 1, '#2e2c26');
      R(px - 2, 92, 18, 6, '#4c4a43'); R(px - 2, 92, 18, 1, '#6a685c'); ell(px + 7, 88, 5, 4, '#4c4a43');
    });
    R(x0 + 22, 108, 28, 2, '#0e1010'); for (let x = x0 + 22; x < x0 + 50; x += 3) R(x, 110, 1, 6, '#0e1010');
    g.fillStyle = 'rgba(160,170,160,0.08)'; g.fillRect(x0 + 22, 116, 28, 70);
    postSign(dir > 0 ? x0 + 4 : x0 + 64, t, dir);
  }
  /* --- Слобода --- */
  function izba(x0, w, seed, lit) {
    const cx = x0 + w / 2, top = 124;
    logs(x0, top, w, 52, '#3a2a1c', seed);
    R(x0 - 4, 176, w + 8, 10, '#2a2824');
    for (let yy = 80; yy <= top; yy++) { const half = Math.round((yy - 80) / (top - 80) * (w / 2 + 8)); R(cx - half, yy, half * 2, 1, yy % 3 ? '#2e2418' : '#261d13'); R(cx - half - 2, yy, 3, 1, '#1e1a16'); R(cx + half - 1, yy, 3, 1, '#1e1a16'); }
    R(cx - 1, 76, 3, 6, '#1e1a16');
    swin(cx - 5, 100, 10, 10, { wall: '#2e2418', always: !!lit, lit: lit ? 1 : 0.3, cur: '#6a3a20', fr: '#2a2016' });
    [x0 + 10, x0 + w - 24].forEach(function (wx, i) {
      swin(wx, 140, 12, 16, { wall: '#3a2a1c', lit: 0.6 - i * 0.2, cur: '#7a3a1e', fr: '#4e5c60', shut: '#4a585c' });
      for (let r = 0; r < 4; r++) R(wx - 2 + r, 135 - r, 16 - r * 2, 1, '#5e6c70');
      R(wx - 2, 159, 16, 2, '#5e6c70'); R(wx + 2, 161, 8, 2, '#5e6c70');
    });
    chimney(x0 + Math.round(w * 0.7), 88, 12, '#3a2a24', true);
    for (let x = x0 + w + 4; x < x0 + w + 30; x += 4) R(x, 164, 2, 22, '#2e2418');
    R(x0 + w + 4, 168, 26, 2, '#261e14'); R(x0 + w + 4, 180, 26, 2, '#261e14');
  }

  /* ---------- сборка улицы: старые места со сдвигом, новые дома, фонари ---------- */
  function oldPart(fn) { const s = STREETS[CUR.sid].seg; OX = s[2]; g.save(); g.translate(OX, 0); fn(); g.restore(); OX = 0; }
  const WORLD = {
    bereg: function () {
      riverStatic(); groundStatic(240, STREETS.bereg.W);
      oldPart(function () { stationStatic(); fillerA(); });
      warehouse(612); tavern(790); stairsUp(1000);
    },
    sennaya: function () {
      groundStatic(0, STREETS.sennaya.W);
      stairsDown(0); bakery(92); archHouse(234);
      oldPart(function () { clockStatic(); fillerB(); fillerC(); marketStatic(); fillerD(); });
      apothecary(1364); postOffice(1496); gate(1632, 'СЛОБОДА', 1);
    },
    sloboda: function () {
      groundStatic(0, STREETS.sloboda.W);
      gate(-8, 'СЕННАЯ', -1); izba(84, 86, 1061, true); izba(206, 72, 1071, false);
      oldPart(function () { agataStatic(); fillerE(); churchStatic(); fillerF(); cemeteryStatic(); endStatic(); });
    }
  };
  function buildStreet(sid) {
    if (SL[sid]) return SL[sid];
    const D = STREETS[sid], old = g;
    const L = { sid: sid, seed: SIDS.indexOf(sid) * 997, swin: [], smoke: [], arc: [], perch: [] };
    CUR = null; OX = 0;
    L.far = mk(W + Math.ceil(D.W * 0.25) + 8, H); g = L.far.getContext('2d'); FAR[sid](L.far.width);
    L.mid = mk(W + Math.ceil(D.W * 0.55) + 8, H); g = L.mid.getContext('2d'); MID[sid](L.mid.width);
    L.world = mk(D.W, H); g = L.world.getContext('2d');
    CUR = L; WORLD[sid](); D.lamps.forEach(lampPost); CUR = null;
    g = old;
    return (SL[sid] = L);
  }

  /* ---------- живое: люди, звери, огни ---------- */
  function drawBoat(now, L, fl) {
    const bob = Math.round(Math.sin(now / 1100) * 1.2), by = 182 + bob;
    // борт лодки: доски внакрой, нос и корма задраны
    for (let r = 0; r < 14; r++) {
      const t = r / 13, x0 = Math.round(26 + Math.pow(1 - t, 2) * 0 + t * 6), x1 = Math.round(108 - t * 4);
      R(x0, by - 12 + r, x1 - x0, 1, r % 4 === 0 ? '#3e2e1c' : r % 4 === 3 ? '#140e08' : '#2a1e12');
    }
    R(26, by - 12, 82, 1, '#5a4430'); R(28, by - 11, 78, 1, '#3a2a18');
    for (let r = 0; r < 6; r++) { R(22 - r, by - 13 - r, 6, 1, '#2a1e12'); R(104 + r, by - 13 - r, 5, 1, '#2a1e12'); }
    R(16, by - 19, 3, 2, '#5a4430'); R(109, by - 19, 3, 2, '#5a4430');
    g.fillStyle = 'rgba(255,190,100,' + (0.28 * fl).toFixed(3) + ')'; g.fillRect(30, by - 11, 26, 1); g.fillRect(34, by - 7, 16, 1);
    R(60, by - 16, 2, 5, '#1a120a'); R(56, by - 17, 10, 1, '#3a2a18');                        // уключина
    // Перевозчик: капюшон, два бельма, шест
    pline(78, by - 76, 98, by + 4, '#1e1810'); pline(79, by - 76, 99, by + 4, '#141008');
    for (let r = 0; r < 50; r++) { const hw = 4 + Math.round(r / 50 * 5); R(88 - hw, by - 60 + r, hw * 2, 1, r % 9 === 0 ? '#161818' : '#111313'); }
    R(83, by - 70, 10, 11, '#0f1011'); R(84, by - 72, 8, 2, '#0f1011'); R(85, by - 66, 6, 6, '#020303');
    if (Math.sin(now / 2300) > -0.85) { R(86, by - 64, 1, 1, '#b8bcb4'); R(89, by - 64, 1, 1, '#b8bcb4'); }
    R(82, by - 42, 3, 2, '#6a6458'); R(82, by - 30, 3, 2, '#6a6458');
    // фонарь на носу
    R(36, by - 36, 1, 29, '#1a140e'); R(36, by - 36, 7, 1, '#1a140e'); R(41, by - 35, 1, 2, '#1a140e');
    R(39, by - 33, 5, 1, '#1a140e'); g.fillStyle = 'rgba(255,200,110,' + (0.9 * fl).toFixed(3) + ')'; g.fillRect(39, by - 32, 5, 6); R(41, by - 30, 1, 2, '#fff2c8');
    R(39, by - 32, 1, 6, '#1a140e'); R(43, by - 32, 1, 6, '#1a140e'); R(39, by - 26, 5, 1, '#1a140e');
    L.push({ x: 41, y: by - 29, r: 46, col: '255,190,100', a: 0.24 });
    // отражение фонаря дрожит на воде под причалом
    for (let yy = 194; yy < 216; yy += 2) {
      const w2 = 2 + Math.floor((yy - 194) / 6), jx = Math.round(Math.sin(now / 240 + yy * 0.9) * 2);
      g.fillStyle = 'rgba(255,190,100,' + (0.3 * fl * (1 - (yy - 194) / 26)).toFixed(3) + ')'; g.fillRect(41 - w2 + jx, yy, w2 * 2, 1);
    }
  }
  function waterDyn(now) {
    for (let i = 0; i < 26; i++) {
      const y = 121 + Math.floor(hsh(i, 331) * 62), x = ((hsh(i, 332) * 240 + now * (0.004 + hsh(i, 333) * 0.006)) % 250) - 10, w2 = 3 + Math.floor(hsh(i, 334) * 9 * (y - 110) / 70);
      g.fillStyle = 'rgba(170,190,186,' + (0.05 + 0.05 * Math.sin(now / 700 + i)).toFixed(3) + ')'; g.fillRect(Math.round(x), y, w2, 1);
    }
    for (let i = 0; i < 14; i++) {
      const y = 194 + Math.floor(hsh(i, 335) * 20), x = ((hsh(i, 336) * 230 + now * 0.008) % 232) - 4;
      g.fillStyle = 'rgba(150,170,166,' + (0.06 + 0.05 * Math.sin(now / 500 + i)).toFixed(3) + ')'; g.fillRect(Math.round(x), y, 4 + i % 5, 1);
    }
    [[40, 109], [96, 107], [170, 110]].forEach(function (p, i) { if (Math.sin(now / (1700 + i * 400) + i * 2) > -0.6) { R(p[0], p[1], 1, 1, 'rgba(230,180,100,0.7)'); g.fillStyle = 'rgba(230,180,100,0.1)'; g.fillRect(p[0], p[1] + 10, 1, 7); } });
  }
  function drawFrosya(now) {
    const x = 1362, y = 160, br = Math.sin(now / 1100) > 0.4 ? 1 : 0, t = now % 5200, eat = t < 900;
    for (let r = 0; r < 22; r++) { const hw = 7 + Math.round(r * 0.25); R(x - hw, y - 22 + r + br, hw * 2, 1, r < 12 ? '#4a3a52' : '#3a2e30'); }
    for (let k = -8; k <= 8; k += 2) R(x + k, y - 10 + br + Math.abs(k) / 3, 1, 2, '#5a4a62');      // бахрома шали
    R(x - 4, y - 32 + br, 8, 9, '#c09a80'); R(x - 3, y - 26 + br, 2, 1, '#c07060'); R(x + 2, y - 26 + br, 2, 1, '#c07060');
    R(x - 2, y - 29 + br, 1, 1, '#2a1810'); R(x + 2, y - 29 + br, 1, 1, '#2a1810');
    if (eat && t > 300 && t < 700) R(x, y - 25 + br, 1, 1, '#2a1810');
    R(x - 5, y - 35 + br, 10, 4, '#8a3a28'); R(x - 5, y - 32 + br, 2, 9, '#8a3a28'); R(x + 3, y - 32 + br, 2, 9, '#8a3a28');
    R(x - 1, y - 23 + br, 3, 2, '#7a3022');
    [[-3, -34], [1, -33], [-4, -30], [4, -29]].forEach(function (p) { R(x + p[0], y + p[1] + br, 1, 1, '#c8a050'); });
    R(x - 11, y - 5, 6, 4, '#4a3a52'); R(x - 8, y - 2, 4, 2, '#c09a80');
    if (eat) { R(x + 4, y - 22 + br, 3, 12, '#4a3a52'); R(x + 2, y - 25 + br, 3, 3, '#c09a80'); }
    else { R(x + 5, y - 5, 6, 4, '#4a3a52'); R(x + 4, y - 2, 4, 2, '#c09a80'); }
    if (!eat && (t % 1300) < 200) R(x + 8, y - 1, 1, 1, '#d8c8a0');                         // шелуха на прилавке
  }
  function drawLiza(now, fl) {
    const gr = g.createRadialGradient(742, 150, 2, 742, 148, 30);
    gr.addColorStop(0, 'rgba(255,214,140,' + (0.9 * fl).toFixed(3) + ')'); gr.addColorStop(0.5, 'rgba(170,100,40,0.8)'); gr.addColorStop(1, 'rgba(40,20,8,0.95)');
    g.fillStyle = gr; g.fillRect(736, 116, 26, 52);
    R(736, 156, 26, 3, '#2a1a0e'); R(736, 156, 26, 1, '#7a5030');
    R(739, 148, 6, 3, '#1a3a26'); R(741, 151, 1, 5, '#141414');                            // зелёная лампа
    const hand = Math.round(Math.sin(now / 260) * 1);
    R(751, 128, 6, 6, '#160c06'); R(752, 126, 4, 2, '#160c06'); R(755, 125, 2, 2, '#160c06');
    for (let r = 0; r < 22; r++) R(749 + Math.floor(r / 6), 134 + r, 9, 1, '#160c06');
    R(745 + hand, 152, 7, 2, '#160c06');
    if (Math.sin(now / 900) > 0.2) R(750, 130, 1, 1, '#ffe8b0');                              // блик лупы в глазу
    R(748, 116, 1, 52, '#1e3028');
    g.fillStyle = 'rgba(160,190,180,0.06)'; g.fillRect(756, 116, 3, 52);
  }
  function drawCat(now, px) {
    const x = 1626, y = 160, near = Math.abs(px - x) < 90;
    R(x - 3, y - 6, 7, 6, '#0a0909'); R(x - 2, y - 7, 5, 1, '#0a0909');
    R(x + 1, y - 12, 5, 5, '#0a0909'); R(x + 1, y - 14, 1, 2, '#0a0909'); R(x + 5, y - 14, 1, 2, '#0a0909');
    const tw = Math.round(Math.sin(now / 650) * 2);
    pline(x - 3, y - 2, x - 6 + tw, y + 9, '#0a0909');
    if (near && Math.sin(now / 1900) > -0.7) { R(x + 2, y - 10, 1, 1, '#9af0a0'); R(x + 4, y - 10, 1, 1, '#9af0a0'); }
  }
  function drawCrows(now, cam, perch, from) {
    perch.forEach(function (p, i) {
      if (i % 2 || p[0] < from || p[0] < cam - 10 || p[0] > cam + W + 10) return;
      const x = p[0], y = p[1], look = Math.sin(now / (1700 + i * 230) + i) > 0.5 ? 1 : -1, caw = (now / 1000 + i * 3.7) % 9 < 0.4;
      R(x - 2, y - 4, 5, 3, '#060606'); R(x - 3, y - 3, 1, 2, '#060606');
      R(x + (look > 0 ? 2 : -2), y - 6 + (caw ? -1 : 0), 2, 2, '#060606'); R(x + (look > 0 ? 4 : -3), y - 5 + (caw ? -1 : 0), 1, 1, '#2a2620');
      R(x, y - 1, 1, 1, '#060606');
    });
  }
  function passerby(now, d, cam, sw) {
    if (d > 0.72) return;
    const span = sw + 600, x = sw + 300 - ((now * 0.021) % span);
    if (x < cam - 50 || x > cam + W + 50) return;
    const ph = (now / 540) % 1, s = Math.sin(ph * Math.PI * 2), y = 214, col = '#07090a';
    g.globalAlpha = 0.94 * (1 - d * 0.6);
    for (let r = 0; r < 40; r++) { const hw = 6 + Math.round(r / 40 * 6) + (r > 34 ? Math.round(s) : 0); R(x - hw, y - 42 + r, hw * 2, 1, col); }
    R(x - 5 + Math.round(s * 2), y - 3, 4, 3, col); R(x + 1 - Math.round(s * 2), y - 3, 4, 3, col);
    for (let r = 0; r < 20; r++) R(x - 4, y - 62 + r, 9, 1, col);
    R(x - 3, y - 70, 6, 8, col); R(x - 4, y - 72, 7, 3, col);
    pline(x + 2, y - 56, x + 3, y - 86, col);
    for (let r = 0; r < 9; r++) { const hw = Math.round(Math.sqrt(1 - Math.pow((9 - r) / 9.5, 2)) * 22); R(x + 3 - hw, y - 96 + r, hw * 2, 1, col); }
    for (let k = -2; k <= 2; k++) R(x + 3 + k * 10, y - 88 + Math.abs(k), 1, 2, col);
    g.globalAlpha = 1;
  }
  function drawGhost(gh, now) {
    if (!gh || gh.a <= 0.01) return;
    const x = Math.round(gh.x), y = GY;
    g.globalAlpha = gh.a;
    for (let r = 0; r < 70; r++) { const hw = 3 + Math.round(r / 70 * 4); R(x - hw, y - 72 + r, hw * 2, 1, '#030404'); }
    R(x - 3, y - 84, 6, 12, '#030404'); R(x - 2, y - 86, 4, 2, '#030404');
    R(x - 9, y - 70, 4, 34, '#030404'); R(x + 5, y - 70, 4, 34, '#030404');                  // слишком длинные руки
    if (Math.sin(now / 230) > -0.9) { R(x - 2, y - 80, 1, 1, '#d8dccc'); R(x + 1, y - 80, 1, 1, '#d8dccc'); }
    g.globalAlpha = 1;
  }

  /* ---------- наследник с фонарём ---------- */
  function drawHero(x, y, dir, ph, mv, now) {
    const s = mv ? Math.sin(ph * Math.PI * 2) : 0, c = mv ? Math.cos(ph * Math.PI * 2) : 0;
    const by = (mv ? Math.round(Math.abs(s) * 1.4) : 0) + (!mv && Math.sin(now / 1200) > 0.55 ? 1 : 0);
    const C = '#24262d', CD = '#17181d', CL = '#3c3f49', SC = '#6e2622', SK = '#caa68a', SKD = '#9c7a62', HT = '#131317', BT = '#0d0b0a';
    g.save(); g.translate(Math.round(x), Math.round(y)); if (dir < 0) g.scale(-1, 1);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(0, 0, 10, 1.6, 0, 0, Math.PI * 2); g.fill();
    const leg = function (off, lift, col) {
      const top = -18, fx = Math.round(off), kx = Math.round(off * 0.3), bot = -6 - lift;
      for (let yy = top; yy <= bot; yy++) { const t = (yy - top) / Math.max(1, bot - top); R(Math.round(kx + (fx - kx) * t) - 1, yy, 3, 1, col); }
      R(fx - 1, -7 - lift, 4, 5, BT); R(fx - 2, -2 - lift, 7, 2, BT); R(fx - 2, -1 - lift, 7, 1, '#1e1a16');
    };
    leg(-s * 5, c < 0 ? Math.round(-c * 2.5) : 0, '#121112');
    leg(s * 5, c > 0 ? Math.round(c * 2.5) : 0, '#1a181b');
    // задняя рука из-под пелерины
    const bs = Math.round(-s * 1.5);
    R(-9 + bs, -46 + by, 3, 7, CD); R(-9 + bs, -39 + by, 3, 2, '#241a14');
    // шинель
    const sway = mv ? -s * 1.2 - 1 : 0;
    for (let yy = -60; yy <= -15; yy++) {
      const t = (yy + 60) / 45, hw = 5.5 + t * 3.5, cx = sway * t * t;
      const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw), Y = yy + (yy < -22 ? by : Math.round(by / 2));
      R(x0, Y, x1 - x0, 1, yy === -15 ? CD : C); R(x0, Y, 2, 1, CD); R(x1 - 1, Y, 1, 1, CL);
      if (yy > -56 && yy < -17) R(Math.round(cx + hw * 0.4), Y, 1, 1, CD);
    }
    [-52, -45, -38, -31].forEach(function (yy) { const t = (yy + 60) / 45; R(Math.round(sway * t * t + (5.5 + t * 3.5) * 0.4) - 1, yy + by, 1, 1, '#7a6a44'); });
    R(-4, -40 + by, 2, 1, CD); R(-6, -39 + by, 4, 1, CD);                                    // хлястик
    // пелерина
    for (let yy = -61; yy <= -45; yy++) {
      const t = (yy + 61) / 16, hw = 6 + t * 5, cx = sway * 0.15 - 0.5, x0 = Math.round(cx - hw);
      R(x0, yy + by, Math.round(hw * 2), 1, yy === -45 ? CD : '#2a2c34'); R(x0, yy + by, 1, 1, CD); R(x0 + Math.round(hw * 2) - 1, yy + by, 1, 1, CL);
    }
    // рука с фонарём
    const as = mv ? Math.round(s * 1.5) : 0, hx = 6 + as, hy = -36 + by;
    for (let yy = -46; yy <= -37; yy++) { const xx = Math.round(4 + (hx - 4) * (yy + 46) / 9); R(xx - 1, yy + by, 3, 1, C); R(xx + 1, yy + by, 1, 1, CL); }
    R(hx - 1, hy, 3, 3, '#2a2018');
    const lsw = Math.round(Math.sin(now / 380) * (mv ? 1.5 : 0.6)), lx = hx + lsw, ly = hy + 2;
    R(lx, ly, 1, 2, '#3a2e1e'); R(lx - 2, ly + 2, 5, 1, '#2a2218');
    const lf = 0.85 + Math.sin(now / 90) * 0.08 + Math.sin(now / 37) * 0.05;
    g.fillStyle = 'rgba(255,206,120,' + Math.min(1, lf).toFixed(3) + ')'; g.fillRect(lx - 2, ly + 3, 5, 6);
    R(lx - 2, ly + 3, 1, 6, '#3a2e1e'); R(lx + 2, ly + 3, 1, 6, '#3a2e1e'); R(lx, ly + 5, 1, 2, '#fff6d8');
    R(lx - 2, ly + 9, 5, 1, '#2a2218'); R(lx - 1, ly + 10, 3, 1, '#2a2218');
    // воротник, шарф, голова, картуз
    R(-4, -64 + by, 8, 4, CD);
    R(-3, -62 + by, 7, 3, SC);
    const fl2 = Math.round(Math.sin(now / 260) * (mv ? 1.5 : 0.5));
    R(-7, -61 + by, 3, 2, SC); R(-9 + fl2, -60 + by, 3, 4, SC); R(-9 + fl2, -56 + by, 2, 2, '#4a1a18');
    R(-3, -73 + by, 7, 10, SK); R(-3, -73 + by, 2, 9, '#2a1e16'); R(-4, -71 + by, 1, 6, '#2a1e16');
    R(-1, -69 + by, 2, 3, SKD); R(4, -69 + by, 1, 2, SK); R(2, -70 + by, 1, 1, '#14100c'); R(1, -71 + by, 3, 1, '#2a1e16');
    R(-1, -64 + by, 5, 1, SKD); R(3, -66 + by, 1, 2, '#e8c0a0');
    R(-4, -78 + by, 9, 5, HT); R(-5, -79 + by, 10, 2, HT); R(-4, -74 + by, 9, 1, '#0a0a0c');
    R(4, -74 + by, 4, 1, '#060607'); R(5, -73 + by, 3, 1, '#060607'); R(-3, -79 + by, 6, 1, '#24242a');
    g.restore();
    return { x: x + dir * lx, y: y + ly + 6 };
  }

  /* ---------- туман ---------- */
  function fogPar(cam, p, y, h, now, n) {
    const off = Math.round(cam * p) % FOG_TW;
    g.save(); g.translate(-off, 0); drawFogBlobs(0, y, W + FOG_TW, h, now, n); g.restore();
  }
  function fogWall(cam, wx, side, now, d) {
    const sx = wx - cam;
    if ((side < 0 && sx + 60 < 0) || (side > 0 && sx - 60 > W)) return;
    const col = Math.round(96 - 60 * d) + ',' + Math.round(104 - 60 * d) + ',' + Math.round(102 - 58 * d);
    const a0 = sx - side * 40, a1 = sx + side * 96;
    const gr = g.createLinearGradient(a0, 0, a1, 0);
    gr.addColorStop(0, 'rgba(' + col + ',0)'); gr.addColorStop(0.55, 'rgba(' + col + ',0.82)'); gr.addColorStop(1, 'rgba(' + col + ',0.985)');
    g.fillStyle = gr;
    if (side < 0) g.fillRect(0, 0, Math.max(0, Math.round(a0)), H); else g.fillRect(Math.round(a0), 0, W - Math.round(a0), H);
    // клубы на границе — в отдельном слое, края растворяются
    if (!wallC) wallC = mk(W, H);
    const wx2 = wallC.getContext('2d'), old = g;
    wx2.globalCompositeOperation = 'source-over'; wx2.clearRect(0, 0, W, H);
    g = wx2;
    const bx = Math.round(sx - 130);
    for (let k = 0; k < 4; k++) drawFogBlobs(bx, 8 + k * 50, 260, 64, now + k * 1700, 12);
    g = old;
    wx2.globalCompositeOperation = 'destination-in';
    const m = wx2.createLinearGradient(sx - 120, 0, sx + 120, 0);
    m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(side < 0 ? 0.35 : 0.65, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    wx2.fillStyle = m; wx2.fillRect(0, 0, W, H);
    wx2.globalCompositeOperation = 'source-over';
    g.drawImage(wallC, 0, 0);
  }
  let wallC = null;

  /* ---------- кадр улицы ---------- */
  /* живое на кусках старой ленты: рисуется в старых координатах со сдвигом */
  function dynOld(sid, now, L, fl, st, d, lampsOn, cam) {
    const off = STREETS[sid].seg[2], n0 = L.length;
    const vis = function (a, b) { return b + off > cam - 30 && a + off < cam + W + 30; };
    g.save(); g.translate(off, 0);
    if (sid === 'bereg') {
      if (vis(0, 240)) waterDyn(now);
      if (vis(0, 120)) drawBoat(now, L, fl);
      if (vis(380, 440) && lampsOn) [390, 428].forEach(function (lx) { g.fillStyle = 'rgba(255,214,140,' + (0.85 * fl).toFixed(3) + ')'; g.fillRect(lx + 1, 132, 3, 5); L.push({ x: lx + 2, y: 134, r: 34, col: '255,200,120', a: 0.2 }); });
    }
    if (sid === 'sennaya') {
      if (vis(614, 774)) {
        g.globalCompositeOperation = 'lighter';
        const wg = g.createRadialGradient(660, 120, 2, 662, 140, 48);
        wg.addColorStop(0, 'rgba(255,190,100,' + (0.5 * fl).toFixed(3) + ')'); wg.addColorStop(1, 'rgba(255,150,60,0)');
        g.fillStyle = wg; g.fillRect(626, 116, 72, 52);
        g.globalCompositeOperation = 'source-over';
        if (S.sanity < 50) { const pa = Math.sin(now / 520) * 0.5; pline(688, 152, Math.round(688 + Math.sin(pa) * 8), Math.round(152 + Math.cos(pa) * 11), '#c8a050'); }
        g.fillStyle = 'rgba(255,200,120,' + (0.55 * fl).toFixed(3) + ')'; g.fillRect(709, 121, 16, 22); R(716, 121, 1, 22, '#1a2a22'); R(709, 131, 16, 1, '#1a2a22');
        g.fillStyle = 'rgba(200,220,215,0.05)'; for (let k = 0; k < 2; k++) g.fillRect(640 + k * 26, 116, 6, 52);
        drawLiza(now, fl);
        L.push({ x: 662, y: 140, r: 64, col: '255,180,90', a: 0.16 }, { x: 717, y: 132, r: 30, col: '255,190,110', a: 0.12 }, { x: 749, y: 145, r: 36, col: '255,200,120', a: 0.14 });
      }
      if (vis(880, 1110)) {
        g.save(); g.translate(800, 0); drawShopFront(now, fl, st.winFig ? 1 : false); g.restore();
        g.globalCompositeOperation = 'lighter';
        const sp = g.createLinearGradient(0, 186, 0, 216);
        sp.addColorStop(0, 'rgba(230,150,70,' + (0.2 * fl).toFixed(3) + ')'); sp.addColorStop(1, 'rgba(230,150,70,0)');
        g.fillStyle = sp; g.beginPath(); g.moveTo(930, 186); g.lineTo(1004, 186); g.lineTo(1028, 216); g.lineTo(912, 216); g.closePath(); g.fill();
        g.globalCompositeOperation = 'source-over';
        L.push({ x: 966, y: 121, r: 74, col: '230,150,60', a: 0.1 }, { x: 1029, y: 116, r: 40, col: '255,190,110', a: 0.1 }, { x: 1057, y: 101, r: 40, col: '255,190,90', a: 0.22 },
          { x: 952, y: 66, r: 22, col: '255,210,140', a: 0.16 }, { x: 1036, y: 66, r: 22, col: '255,210,140', a: 0.16 });
      }
      if (vis(1166, 1474)) {
        (SL.sennaya.arc).forEach(function (ax, i) { ax -= off; if (hsh(i, 61) > 0.45 && d > 0.1) { g.fillStyle = 'rgba(255,200,120,' + (0.7 * fl).toFixed(3) + ')'; g.fillRect(ax - 1, 134, 3, 4); L.push({ x: ax, y: 136, r: 22, col: '255,190,100', a: 0.1 }); } });
        [[1289, 138], [1351, 130]].forEach(function (p) {
          R(p[0], p[1] - 6, 1, 6, '#1a140e'); R(p[0] - 2, p[1], 5, 1, '#1a140e');
          g.fillStyle = 'rgba(255,206,120,' + (0.92 * fl).toFixed(3) + ')'; g.fillRect(p[0] - 2, p[1] + 1, 5, 6);
          R(p[0], p[1] + 3, 1, 2, '#fff2c8'); R(p[0] - 2, p[1] + 7, 5, 1, '#1a140e');
          L.push({ x: p[0], y: p[1] + 4, r: 50, col: '255,190,100', a: 0.22 });
        });
        drawFrosya(now);
      }
    }
    if (sid === 'sloboda') {
      if (vis(1560, 1760)) {
        drawCat(now, st.x - off);
        g.fillStyle = 'rgba(255,190,100,' + (0.8 * fl).toFixed(3) + ')'; g.fillRect(1731, 141, 1, 35);
        g.fillStyle = 'rgba(255,214,140,' + (0.88 * fl).toFixed(3) + ')'; g.fillRect(1741, 138, 3, 5);
        L.push({ x: 1742, y: 140, r: 40, col: '255,200,120', a: 0.2 }, { x: 1731, y: 158, r: 20, col: '255,180,90', a: 0.1 });
      }
      if (vis(1838, 2124)) {
        const ro = st.ropeStill ? 0 : Math.round(Math.sin(now / 1300) * 2);          // после колокольни верёвка больше не качается
        pline(1859, 36, 1859 + ro, 62, '#3a3024');
        if (st.belfryOpen) { R(1851, 154, 16, 32, '#050404'); ell(1859, 154, 8, 4, '#050404'); R(1851, 154, 3, 32, '#3a2a18'); R(1853, 154, 1, 32, '#4a3622'); }
        g.globalCompositeOperation = 'lighter'; glow(2000, 124, 12, '255,200,110', 0.3 * fl); g.globalCompositeOperation = 'source-over';
        [1949, 2053].forEach(function (lx) { g.fillStyle = 'rgba(255,214,140,' + (0.85 * fl).toFixed(3) + ')'; g.fillRect(lx - 1, 152, 4, 7); L.push({ x: lx, y: 155, r: 42, col: '255,200,120', a: 0.2 }); });
        L.push({ x: 2000, y: 124, r: 26, col: '255,200,110', a: 0.12 });
      }
      if (vis(2244, 2560)) {
        if (!st.shovelGone) { pline(2346, 150, 2352, 184, '#2a2016'); pline(2347, 150, 2353, 184, '#3a2c1c'); R(2350, 182, 6, 4, '#4a4a44'); R(2344, 149, 5, 2, '#2a2016'); }   // лопата Прохора
        if (st.dug) { ell(2306, 156, 9, 3, '#1a120c'); ell(2306, 155, 7, 2, '#2a1e14'); }                                        // разрытая могила
        R(2414, 139, 1, 2, '#121414'); g.fillStyle = 'rgba(255,206,130,' + (0.85 * fl).toFixed(3) + ')'; g.fillRect(2413, 141, 5, 6); R(2413, 147, 5, 1, '#121414');
        L.push({ x: 2415, y: 144, r: 44, col: '255,196,110', a: 0.22 });
      }
    }
    g.restore();
    for (let i = n0; i < L.length; i++) L[i].x += off;
  }
  /* фонарики у дверей новых домов */
  function wallLantern(x, y, fl, L) {
    R(x - 4, y - 3, 5, 1, '#141a19'); R(x, y - 2, 1, 2, '#141a19');
    g.fillStyle = 'rgba(255,200,110,' + (0.8 * fl).toFixed(3) + ')'; g.fillRect(x - 2, y, 5, 7);
    R(x, y + 2, 1, 3, '#fff0c0'); R(x - 3, y, 1, 7, '#141a19'); R(x + 3, y, 1, 7, '#141a19'); R(x - 3, y + 7, 7, 1, '#141a19');
    L.push({ x: x, y: y + 4, r: 38, col: '255,190,100', a: 0.2 });
  }
  function drawStreet(now) {
    const st = S.street; if (!st) return;
    const sid = STREETS[st.sid] ? st.sid : 'sennaya', D = STREETS[sid], SW = D.W;
    const sl = SL[sid] || buildStreet(sid);
    const d = st.d, cam = Math.max(0, Math.min(SW - W, Math.round(st.camX)));
    const fl = 0.86 + Math.sin(now / 130) * 0.04 + Math.sin(now / 47) * 0.02 + (Math.random() < 0.02 ? -0.12 : 0);
    const lampsOn = d > 0.2, vis = function (a, b) { return b > cam - 30 && a < cam + W + 30; };
    // небо: догорающая заря → ночь
    const sg = g.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, mix('#262836', '#071012', d)); sg.addColorStop(0.5, mix('#4a4048', '#142019', d)); sg.addColorStop(1, mix('#5e5048', '#1e2b27', d));
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    if (d < 0.6) glow(300 - cam * 0.05, 150, 190, '210,140,104', 0.14 * (1 - d / 0.6));
    if (d > 0.4) glow(70 - cam * 0.04, 26, 76, '160,182,172', 0.12 * (d - 0.4) / 0.6);
    g.drawImage(sl.far, -Math.round(cam * 0.25), 0);
    fogPar(cam, 0.3, 74, 100, now, 8);
    g.drawImage(sl.mid, -Math.round(cam * 0.55), 0);
    fogPar(cam, 0.6, 120, 66, now + 2500, 5);
    g.drawImage(sl.world, cam, 0, W, H, 0, 0, W, H);
    // живое в мировых координатах
    g.save(); g.translate(-cam, 0);
    const L = [];
    sl.swin.forEach(function (wi) {
      if (!vis(wi.x, wi.x + wi.w)) return;
      const k = winOn(wi, d, now);
      if (!k) return;
      litWin(wi, now, k * wi.dim);
      L.push({ x: wi.x + wi.w / 2, y: wi.y + wi.h / 2, r: 12 + wi.w, col: '255,180,90', a: 0.14 * wi.dim });
    });
    sl.smoke.forEach(function (sm) { if (vis(sm[0] - 10, sm[0] + 30)) smoke(sm[0], sm[1], now, sm[2] + 7, 0.16); });
    dynOld(sid, now, L, fl, st, d, lampsOn, cam);
    (D.lanterns || []).forEach(function (p) { if (vis(p[0] - 40, p[0] + 40)) wallLantern(p[0], p[1], fl, L); });
    if (D.crows != null && vis(D.crows, SW)) drawCrows(now, cam, sl.perch, D.crows);
    // фонари на столбах: с шести вечера фонарщик уже прошёл
    D.lamps.forEach(function (lx, i) {
      if (!vis(lx - 60, lx + 60) || !lampsOn) return;
      let f = (Math.sin(now / 1700 + i * 2.3 + sl.seed) > 0.965 && Math.random() < 0.5) ? 0.3 : 1;
      if (lx === D.broken) f = Math.random() < 0.35 ? 0.15 : 0.7;                              // последний фонарь в городе неисправен
      lampLit(lx, f);
      L.push({ x: lx, y: 59, r: 74, col: '230,206,140', a: 0.22 * f, lamp: f });
    });
    // лужи с отражениями ближайших огней
    D.puddles.forEach(function (p) {
      if (!vis(p[0] - p[2] / 2, p[0] + p[2] / 2)) return;
      const refl = [];
      L.forEach(function (l) { if (Math.abs(l.x - p[0]) < p[2] / 2 - 3 && l.y < 170) refl.push({ x0: Math.round(l.x - 3), x1: Math.round(l.x + 4), col: l.col, a: Math.min(0.42, l.a * 1.6) }); });
      if (sid === 'sennaya' && p[0] === 770) refl.push({ x0: 735, x1: 764, col: '220,146,70', a: 0.26 * fl }, { x0: 768, x1: 797, col: '220,146,70', a: 0.26 * fl });
      puddle(p[0], p[1], p[2], p[3], p[4], now, refl);
    });
    drawGhost(st.ghost, now);
    let lant = null;
    if (!st.hidden) lant = drawHero(st.x, GY, st.dir, st.ph, st.mv, now);
    if (lant) L.push({ x: lant.x, y: lant.y, r: 46, col: '255,190,100', a: 0.22 });
    passerby(now, d, cam, SW);
    g.restore();
    // сумерки: всё темнеет, кроме света
    const dark = 0.1 + 0.52 * d;
    lightX.globalCompositeOperation = 'source-over';
    lightX.clearRect(0, 0, W, H);
    lightX.fillStyle = 'rgba(' + Math.round(14 - 11 * d) + ',' + Math.round(12 - 7 * d) + ',' + Math.round(26 - 18 * d) + ',' + dark.toFixed(3) + ')';
    lightX.fillRect(0, 0, W, H);
    lightX.globalCompositeOperation = 'destination-out';
    L.forEach(function (l) {
      const x = l.x - cam; if (x < -l.r || x > W + l.r) return;
      const gr = lightX.createRadialGradient(x, l.y, 2, x, l.y, l.r);
      gr.addColorStop(0, 'rgba(0,0,0,0.9)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lightX.fillStyle = gr; lightX.fillRect(x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    });
    g.drawImage(lightC, 0, 0);
    g.globalCompositeOperation = 'lighter';
    const gk = 0.45 + 0.55 * d, rainL = [];
    L.forEach(function (l) {
      const x = l.x - cam; if (x < -l.r || x > W + l.r) return;
      glow(x, l.y, l.r * 0.62, l.col, l.a * gk);
      if (l.lamp) {
        cone(x, 63, 8, 100, 124, '230,206,140', 0.085 * l.lamp * gk);
        g.save(); g.translate(x, 189); g.scale(1, 0.22); glow(0, 0, 54, '230,206,140', 0.26 * l.lamp * gk); g.restore();
        rainL.push({ x: x, y: 63, h: 124, top: 8, bot: 100, k: 0.55 * l.lamp, col: '255,236,180' });
      }
    });
    if (lant) rainL.push({ x: lant.x - cam, y: lant.y - 10, h: 40, top: 20, bot: 50, k: 0.25, col: '255,210,150' });
    // искорки там, что стоит рассмотреть
    (st.glints || []).forEach(function (p, i) {
      const x = Math.round(p[0] - cam), y = Math.round(p[1]);
      if (x < -6 || x > W + 6) return;
      const t = (now / 1500 + i * 0.37) % 1, a = t < 0.45 ? Math.sin(t / 0.45 * Math.PI) : 0;
      if (a <= 0.02) return;
      g.fillStyle = 'rgba(255,236,180,' + (0.9 * a).toFixed(3) + ')'; g.fillRect(x, y - 2, 1, 5); g.fillRect(x - 2, y, 5, 1);
      g.fillStyle = 'rgba(255,236,180,' + (0.35 * a).toFixed(3) + ')'; g.fillRect(x - 1, y - 1, 3, 3);
    });
    g.globalCompositeOperation = 'source-over';
    fogPar(cam, 1, 156, 56, now + 5000, 4);
    if (st.wallL != null) fogWall(cam, st.wallL, -1, now, d);
    if (st.wallR != null) fogWall(cam, st.wallR, 1, now, d);
    drawRain(now, rainL);
    drawFx(now);
  }

  /* ============================================================
     СКРИМЕРЫ: лица и ещё пять видов страха
     ============================================================ */
  const SCR = {
    hollow: { skin: '#b9bdb0', bg: '#000' },
    window: { skin: '#8fa398', bg: '#020606', hair: 'wet' },
    mirror: { skin: '#a9a79b', bg: '#030506', hair: 'old' },
    doll: { skin: '#e6ddd2', bg: '#050203', hair: 'doll' },
    creditor: { skin: '#050506', bg: '#000', hair: 'hat' }
  };
  function rj(a) { return (Math.random() - 0.5) * a; }
  function hsh(i, m) { const x = Math.sin(i * 127.1 + m * 311.7) * 43758.5453; return x - Math.floor(x); }

  /* Лицо в локальных координатах (центр в нуле). k — насколько раскрыт рот */
  function faceCore(type, k, now) {
    const T = SCR[type] || SCR.hollow;
    if (type === 'creditor') {
      const rg = g.createRadialGradient(0, 0, 20, 0, 0, 170);
      rg.addColorStop(0, 'rgba(120,0,0,0.75)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(-220, -200, 440, 400);
    }
    ell(0, 128, 96, 56, '#08080a');
    if (T.hair === 'old') ell(0, 10, 72, 86, '#6c6c66');
    if (T.hair === 'doll') { ell(-52, -10, 30, 60, '#3a2414'); ell(52, -10, 30, 60, '#3a2414'); ell(0, -56, 62, 40, '#3a2414'); }
    ell(0, 0, 60, 80, T.skin);
    const gr = g.createRadialGradient(-12, -24, 8, 0, 0, 88);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 60, 80, 0, 0, Math.PI * 2); g.fill();
    if (T.hair === 'hat') { R(-48, -168, 96, 96, '#020203'); R(-78, -78, 156, 12, '#020203'); R(-48, -92, 96, 8, '#4a0606'); }
    if (T.hair === 'old') { ell(0, 66, 46, 36, '#77756c'); }
    if (T.hair === 'doll') { ell(-34, 22, 12, 8, 'rgba(200,90,90,0.45)'); ell(34, 22, 12, 8, 'rgba(200,90,90,0.45)'); }
    const eo = 1 + k * 0.3;
    if (type === 'creditor') {
      ell(-24, -14, 7 * eo, 7 * eo, '#f0f0e0'); ell(24, -14, 7 * eo, 7 * eo, '#f0f0e0');
      ell(-24 + rj(3), -14 + rj(3), 2, 2, '#000'); ell(24 + rj(3), -14 + rj(3), 2, 2, '#000');
    } else {
      ell(-25, -16, 17 * eo, 21 * eo, '#000'); ell(25, -18, 16 * eo, 23 * eo, '#000');
      if (type === 'doll') { ell(25, -18, 11, 11, '#dfe6e6'); ell(25 + rj(2), -18 + rj(2), 6, 6, '#3a6a8a'); ell(25, -18, 2.5, 2.5, '#000'); }
      else { R(-27 + rj(3), -18 + rj(3), 3, 3, '#fff'); R(24 + rj(3), -20 + rj(3), 3, 3, '#fff'); }
      R(-31, 0, 3, 36, '#000'); R(-22, 2, 2, 22, '#000'); R(27, 2, 3, 42, '#000'); R(20, 0, 2, 18, '#000');
      R(-5, 16, 3, 7, '#141414'); R(3, 16, 3, 7, '#141414');
    }
    const mh = (type === 'creditor' ? 8 : 10) + k * (type === 'creditor' ? 10 : 34) + Math.sin(now / 28) * 2.5;
    const mw = type === 'creditor' ? 40 : 24 + k * 5;
    g.save();
    g.beginPath(); g.ellipse(0, 50, mw, Math.max(1, mh), 0, 0, Math.PI * 2); g.clip();
    R(-60, 0, 120, 110, '#040000'); ell(0, 58, mw * 0.5, Math.max(1, mh * 0.6), '#3a0000');
    g.fillStyle = '#d6d2c0';
    const tn = type === 'creditor' ? 8 : 4;
    for (let i = -tn; i <= tn; i++) {
      g.fillRect(i * 5 - 2, 50 - mh, 4, 7 + (i % 2 ? 3 : 0));
      g.fillRect(i * 5 - 2, 50 + mh - 7 - (i % 2 ? 0 : 3), 4, 10);
    }
    g.restore();
    if (T.hair === 'wet') { g.fillStyle = '#080a0a'; for (let i = 0; i < 14; i++) g.fillRect(-62 + i * 9, -86, 5, 46 + ((i * 37) % 80)); }
    if (type === 'hollow') { g.fillStyle = '#1a1c1a'; for (let i = 0; i < 5; i++) g.fillRect(-30 + i * 14, -84, 2, 20 + (i * 13) % 22); }
    g.strokeStyle = type === 'doll' ? 'rgba(20,10,10,0.9)' : 'rgba(40,20,30,0.6)'; g.lineWidth = 1.5;
    [[-40, -40, -52, -64, -44, -78], [38, -44, 50, -60, 46, -80], [-44, 30, -56, 44, -50, 62], [14, -60, 6, -74, 12, -84]].forEach(function (l) {
      g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.lineTo(l[4], l[5]); g.stroke();
    });
  }
  /* Общая «грязь» поверх кадра: вспышка, красный тон, разрывы, шум, затухание */
  function scrPost(p, now, o) {
    o = o || {};
    if (!o.noflash && p < 0.07) { g.fillStyle = 'rgba(255,255,255,' + ((1 - p / 0.07) * 0.95).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
    g.fillStyle = 'rgba(130,0,0,' + ((o.red == null ? 0.16 : o.red) + 0.08 * Math.sin(now / 40)).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < (o.tear == null ? 6 : o.tear); i++) {
      const y = Math.floor(Math.random() * H), h = 2 + Math.floor(Math.random() * 12);
      g.drawImage(cv, 0, y, W, h, Math.floor(rj(46)), y, W, h);
    }
    for (let i = 0; i < 320; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.55)';
      g.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 1 + Math.floor(Math.random() * 3), 1);
    }
    if (p > 0.82) { g.fillStyle = 'rgba(0,0,0,' + ((p - 0.82) / 0.18).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
  }
  function lunge(type, p, now, scale, k) {
    g.save();
    g.translate(W / 2 + rj(16) * (1 - p * 0.4), H / 2 + 8 + rj(12) * (1 - p * 0.4));
    g.scale(scale, scale); g.rotate(rj(0.07));
    faceCore(type, k, now);
    g.restore();
  }

  /* 1. Лицо бросается на экран */
  function scrFace(sc, p, now) {
    R(0, 0, W, H, (SCR[sc.type] || SCR.hollow).bg);
    const k = 1 - Math.pow(1 - Math.min(1, p * 5), 3);
    lunge(sc.type, p, now, 0.22 + k * 0.95 + p * 0.4, k);
    scrPost(p, now);
  }
  /* 2. Ладони бьют в стекло — одна за другой, а между ними приближается лицо */
  const HANDS = [[60, 150, -0.3], [322, 142, 0.35], [118, 62, -0.9], [272, 58, 0.8], [30, 74, -1.2], [352, 84, 1.1], [150, 178, -0.1], [236, 176, 0.2], [196, 36, 0]];
  function hand(h, age) {
    g.save();
    g.translate(h[0] + (age < 1 ? rj(7) : 0), h[1] + (age < 1 ? rj(7) : 0)); g.rotate(h[2]);
    const s = age < 0.7 ? 1.3 : 1; g.scale(s, s);
    g.fillStyle = 'rgba(184,196,184,0.22)'; g.fillRect(-11, 10, 22, 34 * Math.min(1, age / 5));
    const col = age < 0.7 ? '#e4ece0' : '#aab4a8';
    ell(0, 0, 13, 15, col);
    g.fillStyle = col;
    for (let f = 0; f < 4; f++) g.fillRect(-13 + f * 7, -38 - ((f === 1 || f === 2) ? 5 : 0), 5, 28);
    g.rotate(-1); g.fillRect(8, -20, 5, 20);
    g.restore();
  }
  function scrHands(sc, p, now) {
    R(0, 0, W, H, '#020405');
    const far = Math.min(1, p * 1.25);
    g.save(); g.translate(W / 2 + rj(3), H / 2 - 4 + rj(3)); const s0 = 0.1 + far * far * 0.75; g.scale(s0, s0); faceCore('window', far > 0.8 ? 1 : 0.15, now); g.restore();
    const beat = p * 13;
    for (let i = 0; i < HANDS.length; i++) if (beat > i) hand(HANDS[i], beat - i);
    scrPost(p, now, { red: 0.08, tear: 3 });
  }
  /* 3. Темнота открывает глаза. Все смотрят на курсор. Потом — на тебя */
  function scrEyes(sc, p, now) {
    R(0, 0, W, H, '#000');
    const n = Math.floor(Math.pow(Math.min(1, p / 0.7), 1.6) * 64) + 1, mad = p > 0.72;
    for (let i = 0; i < n; i++) {
      const x = 14 + hsh(i, 1) * (W - 28), y = 14 + hsh(i, 2) * (H - 28), r = 3 + hsh(i, 3) * 7;
      const open = Math.min(1, (p * 64 / 0.7 - i) / 3 + 0.3);
      ell(x, y, r * 1.5, Math.max(0.6, r * open), mad ? '#e8c8c0' : '#d8d8c8');
      const dx = S.mouse.x - x, dy = S.mouse.y - y, d = Math.max(1, Math.hypot(dx, dy));
      const px = mad ? rj(1.5) : dx / d * r * 0.6, py = mad ? rj(1.5) : dy / d * r * 0.4;
      ell(x + px, y + py, mad ? r * 0.25 : r * 0.55, mad ? r * 0.25 : r * 0.55 * open, mad ? '#a00000' : '#000');
    }
    if (mad) lunge('hollow', p, now, 0.3 + (p - 0.72) * 5.5, 1);
    scrPost(p, now, { noflash: !mad || p > 0.79, red: mad ? 0.2 : 0, tear: mad ? 6 : 0 });
    if (mad && p < 0.76) { g.fillStyle = 'rgba(255,255,255,' + ((0.76 - p) / 0.04 * 0.9).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
  }
  /* 4. Что-то поднимается из-за прилавка */
  function scrRise(sc, p, now) {
    drawShop(now);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, H);
    if (p < 0.62) {
      const k = Math.pow(p / 0.62, 0.7), y = H + 70 - k * 150;
      g.save(); g.translate(W / 2 + rj(2), y + rj(2));
      ell(0, 0, 74, 92, '#0a0c0c'); ell(0, 6, 62, 80, '#8e9a90');
      g.fillStyle = '#0a0c0c'; for (let i = 0; i < 15; i++) g.fillRect(-66 + i * 9, -88, 5, 40 + ((i * 37) % 50));
      ell(-24, -10, 15, 18, '#000'); ell(24, -12, 14, 19, '#000');
      R(-25 + rj(2), -12 + rj(2), 3, 3, '#fff'); R(23 + rj(2), -14 + rj(2), 3, 3, '#fff');
      g.restore();
      scrPost(p, now, { noflash: true, red: 0.04, tear: 2 });
    } else {
      const q = (p - 0.62) / 0.38;
      R(0, 0, W, H, '#000');
      lunge('window', p, now, 0.9 + q * 0.9, 1);
      scrPost(p, now, { noflash: q > 0.15 });
      if (q < 0.15) { g.fillStyle = 'rgba(255,255,255,' + ((1 - q / 0.15) * 0.9).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
    }
  }
  /* 5. Помехи: игра «ломается», и в шуме на пару кадров проступает лицо */
  function scrStatic(sc, p, now) {
    for (let i = 0; i < 700; i++) {
      const v = Math.floor(Math.random() * 150);
      g.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 8) + ')';
      g.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 4 + Math.floor(Math.random() * 28), 1 + Math.floor(Math.random() * 3));
    }
    const band = (now / 3) % H;
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, band, W, 14);
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, (band + 90) % H, W, 30);
    if ((p > 0.26 && p < 0.34) || (p > 0.58 && p < 0.72)) {
      g.globalAlpha = 0.85; lunge(p < 0.5 ? 'mirror' : 'hollow', p, now, p < 0.5 ? 0.9 : 1.5, p < 0.5 ? 0.2 : 1); g.globalAlpha = 1;
    }
    if (p > 0.36 && p < 0.58 && Math.floor(now / 70) % 2) {
      g.fillStyle = '#e8e0d0'; g.font = 'bold 22px Georgia, serif'; g.textAlign = 'center';
      g.fillText('НЕ ОБОРАЧИВАЙСЯ', W / 2 + rj(4), H / 2 + rj(4));
    }
    for (let i = 0; i < 8; i++) { const y = Math.floor(Math.random() * H), h = 2 + Math.floor(Math.random() * 10); g.drawImage(cv, 0, y, W, h, Math.floor(rj(70)), y, W, h); }
    if (p > 0.9) { g.fillStyle = 'rgba(0,0,0,' + ((p - 0.9) / 0.1).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
  }
  /* 6. Темно. Чиркает спичка — и оказывается, что всё это время кто-то стоял вплотную */
  function scrMatch(sc, p, now) {
    R(0, 0, W, H, '#000');
    if (p < 0.3) {
      if (p > 0.2) for (let i = 0; i < 6; i++) R(W / 2 + rj(26), 176 + rj(12), 1, 1, '#ffd070');
      return;
    }
    const q = (p - 0.3) / 0.7, out = q > 0.78;
    g.save(); g.translate(W / 2 + rj(out ? 14 : 1.5), H / 2 - 6 + rj(out ? 10 : 1.5));
    const s = out ? 1.25 + (q - 0.78) * 3 : 0.92 + q * 0.12;
    g.scale(s, s); faceCore(sc.type === 'match' ? 'mirror' : sc.type, out ? 1 : 0.05, now); g.restore();
    if (!out) {
      const fl = 1 + Math.sin(now / 45) * 0.06;
      const gr = g.createRadialGradient(W / 2, 182, 8, W / 2, 182, 150 * fl);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0.97)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      const g2 = g.createRadialGradient(W / 2, 182, 2, W / 2, 182, 120);
      g2.addColorStop(0, 'rgba(255,170,60,0.45)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = g2; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      R(W / 2 - 1, 186, 2, 22, '#c8b090'); R(W / 2 - 1, 180 - Math.round(Math.sin(now / 40) * 1.5), 3, 7, '#ffd070'); R(W / 2, 182, 1, 4, '#fff4c8');
      for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 2, 1); }
    } else scrPost(p, now, { noflash: q > 0.84 });
    if (out && q < 0.84) { g.fillStyle = 'rgba(255,255,255,' + ((0.84 - q) / 0.06 * 0.9).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
  }
  const SCR_KIND = { hands: scrHands, eyes: scrEyes, rise: scrRise, static: scrStatic, match: scrMatch };
  function drawScreamer(sc, now) {
    const p = Math.min(1, (now - sc.t0) / sc.dur);
    (SCR_KIND[sc.kind] || scrFace)(sc, p, now);
  }

  /* ============================================================ */
  function render(now) {
    g = c;
    if (S.vision && typeof Visions !== 'undefined') { try { if (Visions.draw(now)) return; } catch (e) { console.error(e); S.vision = null; } }
    if (S.screamer) {
      if (now - S.screamer.t0 >= S.screamer.dur) S.screamer = null;
      else { drawScreamer(S.screamer, now); return; }
    }
    if (typeof HD !== 'undefined') { try { if (HD.render(now, S)) return; } catch (e) { console.error(e); HD.fail(); } }
    if (S.mode === 'title') drawTitle(now); else if (S.mode === 'loc') drawLoc(now); else if (S.mode === 'street') drawStreet(now); else drawShop(now);
  }

  function init(canvas) {
    cv = canvas; cv.width = W; cv.height = H;
    c = cv.getContext('2d'); c.imageSmoothingEnabled = false; g = c;
    buildLayers();
    // прогрев текстур тумана в фоне, по одной за раз, чтобы не было рывков
    const warm = [];
    [64, 30, 86, 58, 100, 70].forEach(function (h) { for (let li = 0; li < FOG_LAYERS.length; li++) { warm.push([h, li, 'n']); if (h !== 100 && h !== 70) warm.push([h, li, 'g']); } });
    (function step() { const w = warm.shift(); if (!w) return; fogTex(w[0], w[1], w[2]); setTimeout(step, 30); })();
  }

  /* Что под курсором (координаты холста) */
  function shelfAt(x, y) {
    if (S.mode !== 'shop') return -1;
    for (let i = 0; i < 12; i++) {
      const sx = SHELF.x + 3 + (i % 4) * 18, sy = SHELF.rows[Math.floor(i / 4)] - 14;
      if (x >= sx - 1 && x <= sx + 15 && y >= sy - 1 && y <= sy + 16) return i;
    }
    return -1;
  }
  function hit(x, y) {
    if (S.mode !== 'shop') return null;
    const m = MIR;
    const dx = (x - m.cx) / (m.rx + 4), dy = (y - m.cy) / (m.ry + 4);
    if (dx * dx + dy * dy <= 1) return 'mirror';
    if (x >= WIN.x - 4 && x <= WIN.x + WIN.w + 4 && y >= WIN.y - 4 && y <= WIN.y + WIN.h + 4) return 'window';
    if (x >= SHELF.x && x <= SHELF.x + SHELF.w && y >= SHELF.y && y <= SHELF.y + SHELF.h) return 'shelf';
    if (x >= CLK.x && x <= CLK.x + CLK.w && y >= CLK.y && y <= CLK.y + CLK.h) return 'clock';
    if (x >= 46 && x <= 68 && y >= CY - 30 && y <= CY + 2) return 'lamp';
    if (x >= 312 && x <= 356 && y >= CY && y <= CY + 14) return 'ledger';
    return null;
  }

  /* для видений и осмотра лавки: рисовать теми же кистями */
  function withCtx(k, fn) { const old = g; g = k; try { fn(); } finally { g = old; } }
  /* посетитель отдельным слоем — его кладёт поверх своей «живописи» HD-локация */
  let custC = null;
  function customerLayer(now) {
    if (!S.customer) return null;
    if (!custC) custC = mk(W, H);
    const k = custC.getContext('2d'); k.clearRect(0, 0, W, H);
    withCtx(k, function () { drawCustomer(now); });
    return custC;
  }
  const api = {
    R: R, ell: ell, pline: pline, glow: glow, sh: sh, mix: mix, hsh: hsh, mk: mk, drawIcon: drawIcon, drawFogBlobs: drawFogBlobs, drawDrops: drawDrops,
    sfText: sfText, sfWidth: sfWidth, digits: digits, drawPerson: drawPerson, drawHero: drawHero, withCtx: withCtx, customerLayer: customerLayer,
    shop: function (now) { drawShop(now); }, ctx: function () { return g; }, canvas: function () { return cv; },
    MIR: MIR, WIN: WIN, CLK: CLK, SHELF: SHELF, CY: CY
  };
  return { W: W, H: H, S: S, init: init, render: render, icon: icon, hit: hit, shelfAt: shelfAt, api: api, street: { GY: GY, streets: STREETS, sids: SIDS, remap: remap } };
})();
