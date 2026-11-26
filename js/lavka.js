'use strict';
/* ============================================================
   ЛАВКА «ПОСЛЕДНИЙ ЧАС» В ВЫСОКОМ КАЧЕСТВЕ — для роликов.
   Точно по планировке игры (js/art.js): интерьер — окно со шторами,
   напольные часы, свидетельство и календарь, дверь с колокольчиком,
   овальное зеркало, бра, шкаф-витрина, прилавок со счётами и лампой;
   фасад — дощатый дом с зелёной вывеской, три шара, витрина, крыльцо.
   Регистрируются как места HD (P.loc): lavka_night|dawn|day,
   facade_night|dawn|day (+ варианты). Живое (дверь, колокольчик,
   зеркало, часы) управляется через LAVKA.LV из роликов.
   Персонажи — игровые, пиксельные (Art.api), поверх живописи.
   ============================================================ */
const LAVKA = (function () {
  if (typeof HD === 'undefined' || !HD.api) return null;
  const P = HD.api, W = 384, H = 216;
  const rect = P.rect, rr = P.rr, poly = P.poly, ell = P.ell, line = P.line, LG = P.LG, RG = P.RG, vg = P.vg, hg = P.hg;
  const glow = P.glow, shade = P.shade, tex = P.tex, fog = P.fog, shaft = P.shaft, puff = P.puff, softRect = P.softRect, motes = P.motes;
  const flame = P.flame, candleBody = P.candleBody, hands = P.hands, face = P.face, boards = P.boards, jar = P.jar, bottle = P.bottle;
  const goldG = P.goldG, brassG = P.brassG, sh = P.sh, RNG = P.RNG;
  function G() { return P.ctx(); }
  function hsh(i, m) { const x = Math.sin(i * 127.1 + (m || 0) * 311.7) * 43758.5453; return x - Math.floor(x); }
  function soft(fn, px) { P.blur(px, fn); }

  /* живое состояние: его выставляют ролики перед кадром */
  const LV = {
    open: 0, bell: 0, lampOn: true, sconceOn: true, time: [2, 45], stopClock: false,
    mirror: null, mirrorFog: 0, doorWho: null, winWho: null, cal: '7', rain: true, out: null
  };
  function resetLV() { LV.open = 0; LV.bell = 0; LV.lampOn = true; LV.sconceOn = true; LV.time = [2, 45]; LV.stopClock = false; LV.mirror = null; LV.mirrorFog = 0; LV.doorWho = null; LV.winWho = null; LV.rain = true; LV.out = null; LV.plate = null; }

  /* ============================================================
     ИНТЕРЬЕР
     ============================================================ */
  const WIN = { x: 20, y: 26, w: 64, h: 68 }, DG = { x: 171, y: 26, w: 42, h: 34 }, MIR = { cx: 270, cy: 58, rx: 17, ry: 29 }, CLK = { fx: 116, fy: 37 }, CY = 124;
  const SHELF = { x: 304, y: 18, w: 76, h: 100, rows: [46, 78, 110] };

  function lily(c, x, y) {
    c.beginPath(); c.moveTo(x, y - 3.6); c.bezierCurveTo(x + 1.5, y - 2, x + 1.3, y, x, y + 1); c.bezierCurveTo(x - 1.3, y, x - 1.5, y - 2, x, y - 3.6); c.fill();
    c.beginPath(); c.ellipse(x - 1.7, y + 0.5, 1.2, 0.45, 0.7, 0, 6.28); c.fill(); c.beginPath(); c.ellipse(x + 1.7, y + 0.5, 1.2, 0.45, -0.7, 0, 6.28); c.fill();
    c.fillRect(x - 1.5, y + 1.6, 3, 0.5); c.fillRect(x - 0.25, y + 1.6, 0.5, 1.8);
    c.beginPath(); c.moveTo(x - 4, y + 4.5); c.quadraticCurveTo(x - 2, y + 6.5, x, y + 5.2); c.quadraticCurveTo(x + 2, y + 6.5, x + 4, y + 4.5); c.lineTo(x + 4, y + 4.9); c.quadraticCurveTo(x + 2, y + 7, x, y + 5.7); c.quadraticCurveTo(x - 2, y + 7, x - 4, y + 4.9); c.fill();
  }
  function wallpaper(x, y, w, h, tone) {
    const c = G();
    rect(x, y, w, h, LG(0, y, 0, y + h, [0, sh('#1b2723', tone), 0.5, sh('#212e2a', tone), 1, sh('#1d2925', tone)]));
    for (let xx = x; xx < x + w; xx += 16) { rect(xx, y, 1, h, 'rgba(10,18,15,0.55)'); rect(xx + 8, y, 0.5, h, 'rgba(70,96,86,0.3)'); rect(xx + 1, y, 0.4, h, 'rgba(70,96,86,0.16)'); }
    c.save(); c.fillStyle = 'rgba(66,92,82,0.42)';
    for (let yy = y + 8, row = 0; yy < y + h + 4; yy += 14, row++) for (let xx = x + (row % 2) * 8 + 4; xx < x + w + 4; xx += 16) lily(c, xx, yy);
    c.restore();
    tex(x, y, w, h, 0.55, 'overlay', 'mot', 1.3); tex(x, y, w, h, 0.07, 'overlay');
  }
  /* филёнка: углублённая рамка и выпуклое поле */
  function panel(x, y, w, h, base) {
    rr(x - 0.6, y - 0.6, w + 1.2, h + 1.2, 0.8, 'rgba(0,0,0,0.45)');
    rr(x, y, w, h, 0.8, LG(0, y, 0, y + h, [0, sh(base, 1.25), 1, sh(base, 0.8)]));
    rr(x + 2, y + 2, w - 4, h - 4, 0.6, LG(x, y, x + w, y + h, [0, sh(base, 1.15), 0.5, base, 1, sh(base, 0.7)]));
    line(x + 0.6, y + 0.5, x + w - 0.6, y + 0.5, 'rgba(255,210,160,0.16)', 0.3); line(x + 0.5, y + 0.6, x + 0.5, y + h - 0.6, 'rgba(255,210,160,0.1)', 0.3);
    line(x + 0.6, y + h - 0.4, x + w - 0.6, y + h - 0.4, 'rgba(0,0,0,0.5)', 0.35);
  }
  function woodV(x, y, w, h, base, seed) { boards(x, y, w, h, Math.max(1.5, w), base, seed, true); }
  function moulding(x, y, w, h, base) {
    rect(x, y, w, h, LG(0, y, 0, y + h, [0, sh(base, 1.5), 0.18, sh(base, 1.15), 0.5, base, 0.8, sh(base, 0.6), 1, sh(base, 0.35)]));
    line(x, y + 0.2, x + w, y + 0.2, 'rgba(255,214,170,0.25)', 0.3);
  }

  /* предметы на полках шкафа (вид спереди) */
  function shelfItems(mode, o) {
    const c = G(), r = RNG(41);
    // верхняя полка (y=46): каминные часы, подсвечник, шкатулка, чайник; или кукла
    const y1 = 46, y2 = 78, y3 = 110;
    // каминные часы
    rr(307, y1 - 13, 13, 13, 1, LG(307, 0, 320, 0, [0, '#2a1408', 0.5, '#6a3a18', 1, '#1a0a02'])); c.beginPath(); c.arc(313.5, y1 - 13, 6.5, Math.PI, 0); c.fillStyle = '#4a2810'; c.fill();
    face(313.5, y1 - 9, 3.6, { plain: true, paper: '#e6dcc0' }); rect(306, y1 - 1.2, 15, 1.2, brassG(306, 321));
    // латунный подсвечник
    ell(327, y1 - 0.5, 3, 0.8, brassG(324, 330)); rect(326.4, y1 - 11, 1.2, 10.5, brassG(326, 328)); ell(327, y1 - 11, 1.8, 0.6, brassG(325, 329)); candleBody(327, y1 - 11.2, 3, 1.1, '#e6dcc0');
    if (o && o.doll) {
      // кукла-наследник: фарфоровая головка, тёмное пальтишко, красный шарф
      const dx = 352, dy = y1;
      poly([dx - 4, dy, dx + 4, dy, dx + 3, dy - 7, dx - 3, dy - 7], LG(dx - 4, 0, dx + 4, 0, [0, '#0e0e14', 0.5, '#2a2a36', 1, '#0a0a0e']));
      rect(dx - 3, dy - 8, 6, 1.4, '#8a1c14'); rect(dx + 1, dy - 7, 1.2, 4, '#7a160e');
      ell(dx, dy - 11, 3, 3.4, RG(dx - 1, dy - 12, 0, 3.6, [0, '#f6eee6', 1, '#b8a898']));
      ell(dx, dy - 13.2, 3.3, 1.8, '#2a1a10'); ell(dx - 3, dy - 11, 0.8, 1.8, '#2a1a10'); ell(dx + 3, dy - 11, 0.8, 1.8, '#2a1a10');
      ell(dx - 1.1, dy - 11, 0.45, 0.4, '#1a1410'); ell(dx + 1.1, dy - 11, 0.45, 0.4, '#1a1410'); ell(dx, dy - 9.6, 0.5, 0.25, '#a04a4a');
      // бирка на нитке
      line(dx + 2.5, dy - 5, dx + 6, dy + 3, 'rgba(220,210,180,0.7)', 0.15); rect(dx + 4.6, dy + 2.6, 4.6, 2.8, '#ddd2b0'); rect(dx + 5.2, dy + 3.4, 3, 0.3, '#5a4a3a');
    } else {
      rr(345, y1 - 5, 14, 5, 0.6, LG(0, y1 - 5, 0, y1, [0, '#5a2a3a', 1, '#2a0e18'])); rect(345, y1 - 5, 14, 0.6, '#c8a050'); ell(352, y1 - 2.6, 1, 0.7, '#e0c060');
    }
    // чайник
    ell(372, y1 - 4.5, 5, 4.4, LG(367, 0, 377, 0, [0, '#3a3a40', 0.4, '#b8b8c0', 0.6, '#d8d8e0', 1, '#3a3a40'])); rect(370, y1 - 9.6, 4, 1.4, '#8a8a92'); ell(372, y1 - 10, 1, 0.7, '#2a2a2e');
    line(377, y1 - 5, 380, y1 - 8, '#9a9aa2', 0.9); c.strokeStyle = '#8a8a92'; c.lineWidth = 0.7; c.beginPath(); c.arc(366.6, y1 - 4.5, 2.2, 1.6, 4.7); c.stroke();
    // средняя полка (y=78): бутыли, книги, карманные часы на цепочках, драгоценная шкатулка
    bottle(309, y2, 4.6, 14, '#2a4a3a'); bottle(315, y2, 3.6, 11, '#5a2a1a'); bottle(320, y2, 3.2, 9, '#3a3a5a');
    for (let i = 0; i < 5; i++) { const bh = 9 + (i % 3) * 1.5; rect(324 + i * 2.2, y2 - bh, 2, bh, ['#5a1a14', '#1a3a2a', '#3a2a5a', '#6a4a1a', '#2a2a2a'][i]); rect(324 + i * 2.2, y2 - bh + 2, 2, 0.4, 'rgba(220,190,120,0.6)'); }
    rect(336, y2 - 16, 3, 0.6, '#6a5a3a');
    for (let k = 0; k < 4; k++) { const hx = 345 + k * 8.5; line(hx, y2 - 30, hx, y2 - 21 - (k % 2) * 2, 'rgba(220,190,110,0.7)', 0.2); ell(hx, y2 - 18 - (k % 2) * 2, 3, 3, brassG(hx - 3, hx + 3)); ell(hx, y2 - 18 - (k % 2) * 2, 2.2, 2.2, '#e8e0c8'); hands(hx, y2 - 18 - (k % 2) * 2, 2.2, 2.75, 45); }
    rr(346, y2 - 7, 30, 7, 0.6, LG(0, y2 - 7, 0, y2, [0, '#6a3a1a', 1, '#2a140a'])); rect(346, y2 - 7, 30, 0.6, 'rgba(255,220,160,0.35)');
    ell(352, y2 - 3.6, 1.4, 1.2, '#b02a20'); ell(358, y2 - 3.6, 1.2, 1.1, '#2a6a8a'); ell(364, y2 - 3.6, 1.4, 1.2, '#e0c060'); ell(370, y2 - 3.6, 1.1, 1, '#3a8a4a');
    // нижняя полка (y=110): самовар, кувшин, свёрток, подзорная труба
    const sx = 316;
    ell(sx, y3 - 1, 7, 1.4, brassG(sx - 7, sx + 7)); rect(sx - 2.4, y3 - 4, 4.8, 3, brassG(sx - 2.4, sx + 2.4));
    c.beginPath(); c.moveTo(sx - 6, y3 - 4); c.bezierCurveTo(sx - 10, y3 - 9, sx - 9, y3 - 17, sx - 5, y3 - 19); c.lineTo(sx + 5, y3 - 19); c.bezierCurveTo(sx + 9, y3 - 17, sx + 10, y3 - 9, sx + 6, y3 - 4); c.closePath(); c.fillStyle = brassG(sx - 10, sx + 10); c.fill();
    rect(sx - 3, y3 - 23, 6, 4, brassG(sx - 3, sx + 3)); ell(sx, y3 - 23.4, 3.6, 1, brassG(sx - 3.6, sx + 3.6)); rect(sx - 0.8, y3 - 26, 1.6, 2.6, '#3a2a10');
    c.strokeStyle = brassG(sx - 12, sx + 12); c.lineWidth = 0.8; [-1, 1].forEach(function (sd) { c.beginPath(); c.arc(sx + sd * 10, y3 - 14, 2.2, 0, 6.28); c.stroke(); });
    line(sx + 3, y3 - 8, sx + 9, y3 - 7, '#8a6a2a', 0.9); rect(sx + 8.4, y3 - 7.4, 1.2, 2.2, '#8a6a2a');
    c.beginPath(); c.moveTo(331, y3); c.quadraticCurveTo(328, y3 - 6, 331.5, y3 - 11); c.lineTo(334.5, y3 - 11); c.quadraticCurveTo(338, y3 - 6, 335, y3); c.closePath(); c.fillStyle = LG(328, 0, 338, 0, [0, '#3a2a1a', 0.45, '#b08a5a', 1, '#2a1a0a']); c.fill();
    rr(346, y3 - 6, 14, 6, 2.4, LG(0, y3 - 6, 0, y3, [0, '#c8b890', 1, '#7a6a4a'])); line(349, y3 - 6, 349, y3, 'rgba(60,40,20,0.6)', 0.3); line(356, y3 - 6, 356, y3, 'rgba(60,40,20,0.6)', 0.3);
    c.save(); c.translate(372, y3 - 2); c.rotate(-0.3); rect(-7, -1.4, 14, 2.8, brassG(-7, 7)); rect(-7, -1.6, 3, 3.2, '#2a1a0e'); c.restore();
    // ценники на бечёвке
    [[310, y1], [327, y1], [372, y1], [313, y2], [330, y2], [316, y3], [353, y3]].forEach(function (q, i) { line(q[0] + 4, q[1] + 1, q[0] + 5, q[1] + 3.2, 'rgba(200,190,160,0.6)', 0.15); rect(q[0] + 4, q[1] + 3, 4.4, 2.6, '#d8ceb0'); rect(q[0] + 4.6, q[1] + 4, 2.8, 0.3, '#6a5a44'); });
    // стекло дверец: блики
    c.save(); c.beginPath(); c.rect(SHELF.x, SHELF.y, SHELF.w, SHELF.h); c.clip();
    c.globalCompositeOperation = 'lighter';
    [[SHELF.x + 18, 9], [SHELF.x + 28, 3], [SHELF.x + 58, 8], [SHELF.x + 68, 3]].forEach(function (q) { poly([q[0], SHELF.y, q[0] + q[1], SHELF.y, q[0] + q[1] - 34, SHELF.y + SHELF.h, q[0] - 34, SHELF.y + SHELF.h], 'rgba(200,220,230,0.04)'); });
    c.restore();
  }

  function roomBack(mode) {
    return function () {
      const c = G(), day = mode === 'day', dawn = mode === 'dawn';
      // потолок и карниз
      rect(0, 0, W, 14, LG(0, 0, 0, 14, [0, '#070504', 1, '#1a120c']));
      boards(0, 0, W, 12, 3.2, '#1c130c', 3); rect(0, 0, W, 12, 'rgba(0,0,0,0.45)');
      wallpaper(0, 12, W, 92, day ? 1.25 : (dawn ? 1.1 : 1));
      rect(0, 14, W, 28, LG(0, 14, 0, 42, [0, 'rgba(0,0,0,0.5)', 1, 'rgba(0,0,0,0)']));
      moulding(0, 12, W, 5, '#3a281b'); for (let x = 1; x < W; x += 3) rect(x, 15.4, 1.6, 1.2, '#140c07');
      // потёки сырости и пятна
      [[136, 17, 6, 40], [240, 17, 5, 60], [8, 17, 6, 26], [150, 17, 3, 70], [292, 17, 4, 34]].forEach(function (a) { rect(a[0], a[1], a[2], a[3] + 6, LG(0, a[1], 0, a[1] + a[3] + 6, [0, 'rgba(10,16,14,0.42)', 0.7, 'rgba(10,16,14,0.25)', 1, 'rgba(10,16,14,0)'])); });
      [[60, 22, 18], [246, 30, 14], [140, 80, 12], [372, 92, 16]].forEach(function (q) { puff(q[0], q[1], q[2], q[2] * 0.8, '60,50,30', 0.22); });
      // отклеившийся угол обоев: под ним штукатурка, бумага завернулась
      poly([134, 17, 143, 17, 143, 23.6], LG(134, 17, 143, 23, [0, '#5a5444', 1, '#3a3428'])); for (let k = 0; k < 3; k++) line(136 + k * 2.4, 17.6, 142, 18.4 + k * 1.6, 'rgba(0,0,0,0.25)', 0.2);
      softRect(136.6, 17.4, 5, 2.2, 0.8, 0.35);
      const pcg = G(); pcg.beginPath(); pcg.moveTo(134, 17); pcg.quadraticCurveTo(138.4, 17.6, 141.4, 18.4); pcg.quadraticCurveTo(139.2, 19.6, 136.6, 19.2); pcg.closePath(); pcg.fillStyle = LG(134, 17, 141, 19, [0, '#8a8268', 1, '#c4baa0']); pcg.fill();
      // нижние панели и поручень
      rect(0, 100, W, 26, LG(0, 100, 0, 126, [0, '#2e2018', 1, '#1e140e']));
      moulding(0, 100, W, 4, '#3a281b');
      for (let x = -10; x < W; x += 40) panel(x + 4.5, 107, 31, 14.5, '#2e2018');
      // ---- окно: наличник, откосы, подоконник (стекло, переплёт и шторы — живые)
      rect(12, 18, 80, 82, LG(12, 0, 92, 0, [0, '#3e2a1c', 0.5, '#2e1f15', 1, '#24170f'])); line(12, 18.2, 92, 18.2, 'rgba(255,210,160,0.25)', 0.3);
      rect(15, 21, 74, 78, '#0c0806');
      rect(9, 95, 86, 4, LG(0, 95, 0, 99, [0, '#5a3f2e', 0.3, '#3d2b20', 1, '#1a110b'])); rect(16, 99, 72, 4, LG(0, 99, 0, 103, [0, '#33231a', 1, '#160e08']));
      // зонт на крючке
      rect(2.4, 27, 5, 1.6, brassG(2.4, 7.4)); c.strokeStyle = '#2a1a0e'; c.lineWidth = 0.9; c.beginPath(); c.arc(5, 31, 2.4, 3.6, 7.4); c.stroke();
      c.beginPath(); c.moveTo(5.4, 33); c.bezierCurveTo(8.6, 40, 8.4, 56, 6, 64); c.lineTo(4.6, 64); c.bezierCurveTo(2.2, 56, 2.2, 40, 4.6, 33); c.closePath();
      c.fillStyle = LG(2, 0, 9, 0, [0, '#0e1014', 0.5, '#262c34', 1, '#0a0c10']); c.fill();
      for (let k = 0; k < 3; k++) line(4.2 + k * 1.2, 36, 4.6 + k * 0.6, 62, 'rgba(0,0,0,0.5)', 0.25);
      rect(5, 64, 0.6, 4, '#8a8a90'); puff(5.4, 68.6, 3, 0.8, '150,170,180', 0.25);
      // ---- напольные часы
      c.beginPath(); c.moveTo(100, 20); c.lineTo(100, 15); c.quadraticCurveTo(108, 9, 116, 10.4); c.quadraticCurveTo(124, 9, 132, 15); c.lineTo(132, 20); c.closePath(); c.fillStyle = LG(100, 0, 132, 0, [0, '#2a1a10', 0.3, '#5a3a20', 0.7, '#3a2414', 1, '#1a0e06']); c.fill();
      ell(116, 9, 1.6, 1.6, brassG(114.4, 117.6)); ell(102, 13.6, 1, 1, brassG(101, 103)); ell(130, 13.6, 1, 1, brassG(129, 131));
      rect(103, 20, 26, 64, LG(103, 0, 129, 0, [0, '#4a3020', 0.12, '#3a2416', 0.6, '#2a1a10', 1, '#120a05']));
      tex(103, 20, 26, 64, 0.35, 'overlay', 'mot', 0.8);
      rect(105, 25, 22, 24, '#160e08'); [[106.5, 26.5], [125.5, 26.5], [106.5, 47.5], [125.5, 47.5]].forEach(function (q) { ell(q[0], q[1], 1.3, 1.3, goldG(q[0] - 1.3, q[1] - 1.3, q[0] + 1.3, q[1] + 1.3)); });
      face(CLK.fx, CLK.fy, 9.2, { paper: '#dcd2b4', noHands: true });
      rect(106, 50, 20, 32, LG(106, 0, 126, 0, [0, '#4a3020', 1, '#2a1a10'])); rect(108, 52, 16, 28, '#080504');
      [[110, 58], [121, 61]].forEach(function (q) { line(q[0], 52, q[0], q[1], 'rgba(170,140,80,0.6)', 0.25); rr(q[0] - 1.3, q[1], 2.6, 9, 0.6, brassG(q[0] - 1.3, q[0] + 1.3)); });
      rect(103, 82, 26, 4, LG(0, 82, 0, 86, [0, '#5a3a20', 1, '#2a1a10'])); rect(105, 86, 22, 4, '#1e120a'); rr(106, 89.4, 3, 1.6, 0.4, '#140a04'); rr(123, 89.4, 3, 1.6, 0.4, '#140a04');
      // ---- свидетельство в рамке и календарь
      rect(133.4, 31.4, 17.2, 22.2, goldG(133, 31, 151, 54)); rect(135, 33, 14, 19, '#2a1b12');
      rect(136, 34, 12, 17, LG(0, 34, 0, 51, [0, '#d4c8a6', 1, '#b4a888'])); tex(136, 34, 12, 17, 0.3, 'multiply', 'mot', 0.4);
      P.ctx().font = 'bold 1.6px Georgia, serif'; c.fillStyle = 'rgba(60,40,30,0.8)'; c.textAlign = 'center'; c.fillText('СВИДЕТЕЛЬСТВО', 142, 36.8);
      for (let k = 0; k < 5; k++) line(137.5, 38.6 + k * 1.6, 146.5 - (k % 2) * 2, 38.6 + k * 1.6, 'rgba(70,60,50,0.5)', 0.25);
      ell(139, 48, 1.4, 1.4, '#8a2a20'); line(143, 48.4, 147, 48.4, 'rgba(40,30,20,0.6)', 0.25);
      ell(141, 59.6, 0.6, 0.6, '#7a7a80');
      rect(136, 62, 10, 3, LG(0, 62, 0, 65, [0, '#a03428', 1, '#6a1e16'])); rect(136, 65, 10, 11, LG(0, 65, 0, 76, [0, '#e2d8bc', 1, '#c8bc9c'])); for (let k = 0; k < 3; k++) line(136, 76 - k * 0.4, 146, 76 - k * 0.4, 'rgba(120,110,90,0.4)', 0.15);
      c.fillStyle = '#2a2420'; c.font = 'bold 6px Georgia, serif'; c.textAlign = 'center'; c.fillText(LV.cal, 141, 73.2);
      c.font = '1.4px Georgia, serif'; c.fillText('НОЯБРЬ', 141, 64.4);
      // ---- дверной наличник (проём и полотно — живые)
      rect(151, 13, 82, 113, LG(151, 0, 233, 0, [0, '#45301f', 0.08, '#3a281b', 0.92, '#2e1f15', 1, '#1a110c']));
      moulding(149, 11, 86, 4, '#3a281b');
      [[154.5, 16.5], [224.5, 16.5]].forEach(function (q) { rr(q[0], q[1], 5, 5, 0.5, '#3a281b'); ell(q[0] + 2.5, q[1] + 2.5, 1.6, 1.6, LG(q[0], q[1], q[0] + 5, q[1] + 5, [0, '#6a4a30', 1, '#1a100a'])); });
      rect(157, 17, 70, 109, '#0a0705');
      // кронштейн колокольчика
      rect(226, 23.6, 9, 0.9, '#5a4a2a'); rect(226, 23.6, 0.9, 5, '#5a4a2a');
      // ---- фото в овальном паспарту
      rect(233.6, 39.6, 12.8, 16.8, LG(234, 40, 246, 56, [0, '#3a2a1a', 1, '#160e08'])); rect(235, 41, 10, 14, '#d6ccae');
      ell(240, 48, 4, 6, LG(0, 42, 0, 54, [0, '#6e5e46', 1, '#3a3024'])); ell(240, 46.6, 1.6, 2, '#2a2218'); poly([236.6, 53.6, 237.6, 49.6, 242.4, 49.6, 243.4, 53.6], '#2a2218');
      // ---- зеркало: рама с гребнем (стекло — живое)
      softRect(MIR.cx - MIR.rx - 4, MIR.cy - MIR.ry - 2, MIR.rx * 2 + 10, MIR.ry * 2 + 10, 3, 0.4);
      line(MIR.cx, 13, MIR.cx - 9, MIR.cy - MIR.ry - 6, 'rgba(40,30,20,0.7)', 0.25); line(MIR.cx, 13, MIR.cx + 9, MIR.cy - MIR.ry - 6, 'rgba(40,30,20,0.7)', 0.25); ell(MIR.cx, 13, 0.7, 0.7, '#8a8a90');
      ell(MIR.cx, MIR.cy, MIR.rx + 6.2, MIR.ry + 6.2, '#1a1206');
      ell(MIR.cx, MIR.cy, MIR.rx + 5.4, MIR.ry + 5.4, goldG(MIR.cx - 23, MIR.cy - 35, MIR.cx + 23, MIR.cy + 35));
      ell(MIR.cx, MIR.cy, MIR.rx + 3.4, MIR.ry + 3.4, '#3a2a0e'); ell(MIR.cx, MIR.cy, MIR.rx + 2.6, MIR.ry + 2.6, goldG(MIR.cx - 20, MIR.cy - 32, MIR.cx + 20, MIR.cy + 32));
      ell(MIR.cx, MIR.cy, MIR.rx + 1, MIR.ry + 1, '#1e1608');
      for (let k = 0; k < 34; k++) { const a = k / 34 * 6.2832, bx = MIR.cx + Math.cos(a) * (MIR.rx + 4.4), by = MIR.cy + Math.sin(a) * (MIR.ry + 4.4); ell(bx, by, 0.75, 0.75, k % 2 ? '#6a5424' : goldG(bx - 1, by - 1, bx + 1, by + 1)); }
      const ct = MIR.cy - MIR.ry - 5;
      c.save(); c.translate(MIR.cx, ct); for (let k = -3; k <= 3; k++) { c.save(); c.rotate(k * 0.36); ell(0, -4, 1.3, 4, goldG(-2, -8, 2, 0)); c.restore(); } ell(0, 0, 2.6, 1.8, goldG(-3, -2, 3, 2)); c.restore();
      [-1, 1].forEach(function (d) { for (let k = 0; k < 3; k++) ell(MIR.cx + d * (6 + k * 3), ct + 1 - k * 1.2, 2, 0.9, goldG(MIR.cx - 14, ct - 4, MIR.cx + 14, ct + 2), d * (0.4 + k * 0.2)); });
      const cb = MIR.cy + MIR.ry + 5; c.save(); c.translate(MIR.cx, cb); [-1, 1].forEach(function (d) { for (let k = 0; k < 3; k++) ell(d * (2.4 + k * 2.6), -k * 0.6, 2, 0.9, goldG(-10, -3, 10, 3), d * (0.3 + k * 0.15)); }); ell(0, 0.6, 1.8, 1.8, goldG(-2, -1, 2, 3)); c.restore();
      // ---- бра со свечой
      rr(296, 46, 3, 9, 0.6, brassG(296, 299)); line(298.5, 50, 301, 50, '#8a6a2a', 0.8); rr(297.6, 44.4, 5.2, 1.8, 0.6, brassG(297.6, 302.8));
      candleBody(300.2, 44.6, 7, 2.6, '#e6dcbc');
      // ---- шкаф-витрина
      rect(SHELF.x - 5, SHELF.y - 6, SHELF.w + 10, SHELF.h + 12, '#1a110b');
      moulding(SHELF.x - 6.5, SHELF.y - 6.5, SHELF.w + 13, 4.4, '#3a281b');
      for (let x = SHELF.x - 4; x < SHELF.x + SHELF.w + 4; x += 3.2) rect(x, SHELF.y - 2, 1.6, 1.2, '#2a1b12');
      woodV(SHELF.x - 4, SHELF.y - 1, 4, SHELF.h + 3, '#33221a', 5); woodV(SHELF.x + SHELF.w, SHELF.y - 1, 4, SHELF.h + 3, '#2a1b12', 6);
      rect(SHELF.x, SHELF.y, SHELF.w, SHELF.h, LG(0, SHELF.y, 0, SHELF.y + SHELF.h, [0, '#100a06', 1, '#1a110b']));
      for (let x = SHELF.x + 8; x < SHELF.x + SHELF.w; x += 9) line(x, SHELF.y, x, SHELF.y + SHELF.h, 'rgba(0,0,0,0.5)', 0.4);
      SHELF.rows.forEach(function (y) { rect(SHELF.x, y, SHELF.w, 3, LG(0, y, 0, y + 3, [0, '#6a4a30', 0.3, '#3d2b1e', 1, '#1a100a'])); shade(SHELF.x + SHELF.w / 2, y + 4, SHELF.w / 2, 2.4, 0.5); });
      shelfItems(mode, roomBack.opts || {});
      woodV(SHELF.x + 36, SHELF.y, 3, SHELF.h, '#2a1b12', 7); ell(SHELF.x + 37.5, SHELF.y + 45, 0.6, 1, '#c8a650');
      moulding(SHELF.x - 5, SHELF.y + SHELF.h + 2, SHELF.w + 10, 4, '#2a1b12');
      // ---- общий свет стен: тёплое у лампы, холодное у окна
      if (dawn) { c.save(); c.globalCompositeOperation = 'lighter'; rect(0, 0, W, H, RG(52, 60, 10, 320, [0, 'rgba(255,190,140,0.14)', 0.5, 'rgba(200,150,120,0.05)', 1, 'rgba(0,0,0,0)'])); c.restore(); }
    };
  }
  /* переплёт окна, шторы, ламбрекен, герань — поверх живого стекла (кэш) */
  function roomMid(mode) {
    const c = G(), x = WIN.x, y = WIN.y, w = WIN.w, h = WIN.h;
    c.save(); c.beginPath(); c.rect(15, 21, 74, 78); c.rect(x, y, w, h); c.fillStyle = LG(0, 21, 0, 99, [0, '#4e3826', 1, '#2a1c10']); c.fill('evenodd'); c.restore();
    line(17, 23.4, 87, 23.4, 'rgba(255,210,160,0.2)', 0.3); line(x, y + h + 0.3, x + w, y + h + 0.3, 'rgba(0,0,0,0.6)', 0.6);
    rect(x + w / 2 - 1.4, y, 2.8, h, LG(x + w / 2 - 1.4, 0, x + w / 2 + 1.4, 0, [0, '#4e3826', 0.5, '#3a2818', 1, '#1a100a']));
    rect(x, y + h / 2 - 1.4, w, 2.8, LG(0, y + h / 2 - 1.4, 0, y + h / 2 + 1.4, [0, '#4e3826', 0.5, '#3a2818', 1, '#1a100a']));
    // герань в горшке
    const px = x + w - 22, py = y + h + 1;
    poly([px, py - 7, px + 11, py - 7, px + 10, py, px + 1, py], LG(px, 0, px + 11, 0, [0, '#9a5a34', 0.5, '#7a3a24', 1, '#4a2014'])); rect(px - 0.6, py - 8, 12.2, 1.6, '#a8603a');
    [[px + 2, py - 18], [px + 4, py - 13], [px + 8, py - 20], [px + 10, py - 14], [px + 9, py - 10], [px + 6, py - 16]].forEach(function (q, i) { line(px + 5.5, py - 7, q[0] + 1, q[1] + 1, '#3a4426', 0.4); ell(q[0] + 1, q[1] + 1, 2, 1.4, i % 2 ? '#4a5430' : '#3a4426', i * 0.5); });
    ell(px + 8.4, py - 22, 1.4, 1.2, '#7a2622'); ell(px + 7, py - 21.4, 1, 0.9, '#8a3a30'); ell(px + 3, py - 19.6, 0.8, 0.7, '#6a2a20');
    // шторы: бархат на подхватах
    const tie = y + Math.round(h * 0.58);
    [-1, 1].forEach(function (sd) {
      const outer = sd < 0 ? x - 8 : x + w + 8, inner = sd < 0 ? x + 5 : x + w - 5, pinch = sd < 0 ? x - 2 : x + w + 2;
      c.beginPath(); c.moveTo(outer, y - 5); c.lineTo(inner, y - 5); c.quadraticCurveTo(inner, tie - 16, pinch, tie); c.quadraticCurveTo(inner - sd * 1, tie + 14, inner + sd * 2, y + h + 2); c.lineTo(outer, y + h + 2); c.closePath();
      c.fillStyle = LG(Math.min(outer, inner), 0, Math.max(outer, inner), 0, sd < 0 ? [0, '#2a0c0e', 0.5, '#5a2224', 0.8, '#4a1a1c', 1, '#2a0c0e'] : [0, '#2a0c0e', 0.2, '#4a1a1c', 0.5, '#5a2224', 1, '#2a0c0e']); c.fill();
      c.save(); c.clip(); for (let k = 0; k < 6; k++) { const fx = outer + (inner - outer) * (k + 0.5) / 6; line(fx, y - 5, fx + (pinch - fx) * 0.6, tie, 'rgba(10,0,0,0.45)', 0.6); line(fx + (pinch - fx) * 0.6, tie, fx + sd * 1.5, y + h + 2, 'rgba(10,0,0,0.4)', 0.6); line(fx + 0.8, y - 5, fx + 0.8 + (pinch - fx) * 0.6, tie, 'rgba(140,60,60,0.25)', 0.4); } tex(Math.min(outer, inner) - 2, y - 6, 16, h + 10, 0.4, 'overlay', 'mot', 0.6); c.restore();
      const tx = sd < 0 ? x - 7 : x + w + 1;
      rr(tx, tie - 0.6, 6, 2.2, 0.8, brassG(tx, tx + 6)); line(tx + 3, tie + 1.6, tx + 3, tie + 5, '#a8843a', 0.5); ell(tx + 3, tie + 6, 1.2, 1.6, brassG(tx + 1.8, tx + 4.2));
    });
    // ламбрекен с бахромой, латунный карниз
    c.beginPath(); c.moveTo(x - 9, y - 8); c.lineTo(x + w + 9, y - 8); c.lineTo(x + w + 9, y - 3);
    for (let k = x + w + 9; k > x - 9; k -= 8) c.quadraticCurveTo(k - 4, y + 1.6, k - 8, y - 3);
    c.closePath(); c.fillStyle = LG(0, y - 8, 0, y + 1, [0, '#62302e', 0.4, '#4a1e20', 1, '#2a0e10']); c.fill();
    for (let k = x - 9; k < x + w + 9; k += 1.6) line(k, y - 2 + Math.abs(Math.sin((k - x) / 8 * Math.PI)) * 3.4, k, y + 0.4 + Math.abs(Math.sin((k - x) / 8 * Math.PI)) * 3.4, 'rgba(200,160,80,0.6)', 0.3);
    rr(x - 11, y - 10, w + 22, 2, 1, brassG(x - 11, x + w + 11)); ell(x - 12, y - 9, 1.6, 1.6, brassG(x - 13.6, x - 10.4)); ell(x + w + 12, y - 9, 1.6, 1.6, brassG(x + w + 10.4, x + w + 13.6));
  }
  /* что видно за окном и в двери */
  function outside(x, y, w, h, now, mode, far) {
    const c = G(), day = mode === 'day', dawn = mode === 'dawn';
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    if (dawn) rect(x, y, w, h, LG(0, y, 0, y + h, [0, '#9a8aa0', 0.5, '#e8b49a', 1, '#f6d2a8']));
    else if (day) rect(x, y, w, h, LG(0, y, 0, y + h, [0, '#8e9aa6', 1, '#c0c4c4']));
    else rect(x, y, w, h, LG(0, y, 0, y + h, [0, '#0c1416', 0.6, '#1c2628', 1, '#2a3634']));
    // дома напротив: силуэты в тумане, редкие тёплые окна
    const hb = y + h * (far ? 0.86 : 0.92), hc = dawn ? '#8a6e76' : (day ? '#7a7e84' : '#1a2426');
    [[x - 8, 26, 30], [x + 17, 22, 40], [x + 38, 28, 28], [x + 64, 26, 36]].forEach(function (hs, i) {
      const top = hb - hs[2];
      rect(hs[0], top, hs[1], hs[2] + 40, LG(hs[0], 0, hs[0] + hs[1], 0, [0, sh(hc, 1.15), 1, sh(hc, 0.8)]));
      poly([hs[0] - 1.5, top, hs[0] + hs[1] + 1.5, top, hs[0] + hs[1] - 5, top - 5, hs[0] + 5, top - 5], sh(hc, 0.7));
      line(hs[0] - 1.5, top, hs[0] + hs[1] + 1.5, top, dawn ? 'rgba(255,220,190,0.4)' : 'rgba(150,170,170,0.18)', 0.4);
      rect(hs[0] + hs[1] * 0.3, top - 10, 2.6, 6, sh(hc, 0.75));
      for (let wy = top + 5; wy < hb - 5; wy += 10) for (let wx = hs[0] + 3.5; wx < hs[0] + hs[1] - 4; wx += 7.5) {
        const lit = !day && !dawn && hsh(i * 13 + wx + wy, 4) > 0.82;
        rect(wx - 0.5, wy - 0.5, 3.4, 5.4, sh(hc, 0.7));
        rect(wx, wy, 2.4, 4.4, lit ? LG(0, wy, 0, wy + 4.4, [0, '#f0b868', 1, '#a8622a']) : (dawn ? 'rgba(255,214,176,0.55)' : (day ? 'rgba(200,210,220,0.5)' : 'rgba(4,8,10,0.6)')));
        if (lit) glow(wx + 1.2, wy + 2, 5, '255,180,100', 0.12);
      }
    });
    if (!day && !dawn) {
      // фонарь на той стороне
      const lx = x + w * 0.62; rect(lx, y + h * 0.22, 0.8, h, '#06090a'); poly([lx - 2, y + h * 0.22, lx + 2.8, y + h * 0.22, lx + 2.2, y + h * 0.22 - 4, lx - 1.4, y + h * 0.22 - 4], 'rgba(255,214,150,0.9)');
      glow(lx + 0.4, y + h * 0.22 - 2, 16, '255,200,130', 0.35);
    } else if (dawn) { glow(x + w * 0.7, y + h * 0.5, w * 0.8, '255,220,180', 0.45); }
    // туман
    fog(y + h * 0.3, h * 0.9, now, 5, dawn ? 0.5 : (day ? 0.45 : 0.7), dawn ? '255,232,222' : (day ? '220,224,226' : '120,136,134'), far ? 7 : 8);
    if (LV.rain && !dawn && !day) {
      c.save(); c.strokeStyle = 'rgba(190,210,210,0.22)'; c.lineWidth = 0.25; c.beginPath();
      const r = RNG(far ? 3 : 4); for (let i = 0; i < 40; i++) { const px = x + r() * w, py = y + ((r() * h + now * 0.12 * (0.7 + r() * 0.6)) % h); c.moveTo(px, py); c.lineTo(px - 0.6, py + 3); }
      c.stroke(); c.restore();
    }
    // запотевание, капли
    rect(x, y + h - 8, w, 8, LG(0, y + h - 8, 0, y + h, [0, 'rgba(180,196,194,0)', 1, 'rgba(180,196,194,0.18)']));
    const r2 = RNG(far ? 5 : 6);
    for (let i = 0; i < (far ? 34 : 18); i++) {
      const px = x + r2() * w, sp = 0.006 + r2() * 0.012, run = h + 12, cyc = run / sp * 2.2, t = (now + r2() * 9e4) % cyc;
      if (t > run / sp) { ell(px, y + 3 + r2() * h * 0.6, 0.35, 0.5, 'rgba(215,232,230,0.4)'); continue; }
      const dy = y - 6 + t * sp; line(px, dy - 7, px, dy, 'rgba(200,222,220,0.14)', 0.35); ell(px, dy, 0.4, 0.6, 'rgba(235,245,245,0.6)');
    }
    c.save(); c.globalCompositeOperation = 'lighter'; poly([x + w * 0.1, y, x + w * 0.25, y, x + w * 0.05, y + h, x - w * 0.1, y + h], 'rgba(255,255,255,0.04)'); c.restore();
    if (LV.out) LV.out(x, y, w, h, now, far);
    c.restore();
  }
  /* дверь: петли справа, ручка слева; op — насколько открыта (0..1) */
  function doorLeaf(now, mode) {
    const c = G(), op = LV.open, a = op * 1.3, cw = Math.cos(a), sn = Math.sin(a);
    const hx = 223, lw = 62, top = 21, bot = 126, fx = hx - lw * cw, ft = top - 7 * sn, fb = bot + 5 * sn;
    // проём: улица
    if (op > 0.01) {
      outside(161, 21, 62, 105, now, mode, false);
      if (LV.doorWho) { c.save(); c.beginPath(); c.rect(161, 21, 62, 105); c.clip(); LV.doorWho(now); c.restore(); }
      c.save(); c.globalCompositeOperation = 'lighter'; if (mode !== 'night') poly([161, 126, 223, 126, 238, 150, 150, 150], 'rgba(255,210,170,' + (0.1 * op).toFixed(3) + ')'); c.restore();
    }
    // полотно в перспективе: (u, v) → точка
    const M = function (u, v) { const xx = fx + (hx - fx) * u, yt = ft + (top - ft) * u, yb = fb + (bot - fb) * u; return [xx, yt + (yb - yt) * v]; };
    const Qd = function (u0, v0, u1, v1, f) { const p = [M(u0, v0), M(u1, v0), M(u1, v1), M(u0, v1)]; poly([p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]], f); };
    if (op > 0.02) { const e0 = M(0, 0), e1 = M(0, 1); poly([e0[0], e0[1], e0[0] - 3 * sn, e0[1] + 1, e1[0] - 3 * sn, e1[1] - 1, e1[0], e1[1]], '#140a05'); }
    Qd(0, 0, 1, 1, LG(fx, 0, hx, 0, [0, op > 0.02 ? '#3a281c' : '#33241a', 1, '#24170f']));
    // стекло двери: улица через тюль
    const gq = [M(0.15, 0.04), M(0.85, 0.04), M(0.85, 0.37), M(0.15, 0.37)];
    if (op < 0.02) outside(DG.x, DG.y, DG.w, DG.h, now + 4000, mode, true);
    else Qd(0.15, 0.04, 0.85, 0.37, mode === 'night' ? 'rgba(30,40,44,0.85)' : 'rgba(200,180,170,0.5)');
    Qd(0.13, 0.02, 0.87, 0.04, '#1a110c'); Qd(0.13, 0.37, 0.87, 0.39, '#0e0806'); Qd(0.13, 0.04, 0.15, 0.37, '#1a110c'); Qd(0.85, 0.04, 0.87, 0.37, '#0e0806');
    Qd(0.495, 0.04, 0.505, 0.37, '#140c08');
    c.save(); c.beginPath(); c.moveTo(gq[0][0], gq[0][1]); c.lineTo(gq[1][0], gq[1][1]); c.lineTo(gq[2][0], gq[2][1]); c.lineTo(gq[3][0], gq[3][1]); c.closePath(); c.clip();
    for (let u = 0.16; u < 0.85; u += 0.035) { const p0 = M(u, 0.04), p1 = M(u, 0.37); line(p0[0], p0[1], p1[0], p1[1], 'rgba(230,220,200,0.07)', 0.5); }
    c.restore();
    // нижние филёнки
    [[0.08, 0.46], [0.54, 0.92]].forEach(function (pu) {
      Qd(pu[0], 0.46, pu[1], 0.96, 'rgba(0,0,0,0.4)'); Qd(pu[0] + 0.02, 0.47, pu[1] - 0.02, 0.95, LG(fx, 0, hx, 0, [0, '#3a2a1c', 1, '#2a1c12']));
      Qd(pu[0] + 0.07, 0.5, pu[1] - 0.07, 0.92, 'rgba(0,0,0,0.12)');
      const a0 = M(pu[0] + 0.02, 0.47), a1 = M(pu[1] - 0.02, 0.47); line(a0[0], a0[1], a1[0], a1[1], 'rgba(255,210,160,0.15)', 0.3);
    });
    // засов, ручка
    const b0 = M(0.37, 0.4), b1 = M(0.86, 0.43); poly([b0[0], b0[1], b1[0], b0[1] + (b1[1] - b0[1]) * 0.2, b1[0], b1[1], b0[0], b1[1]], LG(0, b0[1], 0, b1[1], [0, '#5a6260', 1, '#202624']));
    const hp = M(0.05, 0.6); rr(hp[0], hp[1] - 2, 2.6, 9, 0.8, brassG(hp[0], hp[0] + 2.6)); rr(hp[0] - 1, hp[1] + 2, 4.4, 1.6, 0.6, brassG(hp[0] - 1, hp[0] + 3.4)); ell(hp[0] + 1.3, hp[1] + 6, 0.4, 0.7, '#0a0604');
    if (op > 0.02) { c.save(); c.globalCompositeOperation = 'lighter'; Qd(0, 0, 0.12, 1, 'rgba(255,220,180,' + (0.08 * op).toFixed(3) + ')'); c.restore(); }
  }
  function bellSwing(now) {
    const c = G(), a = LV.bell, ax = 234, ay = 27.4;
    c.save(); c.translate(ax, ay); c.rotate(a);
    line(0, -3.4, 0, 0.6, '#5a4a2a', 0.5);
    c.beginPath(); c.moveTo(-1.2, 0.4); c.bezierCurveTo(-1.8, 1.6, -2, 3.6, -3.2, 4.4); c.lineTo(3.2, 4.4); c.bezierCurveTo(2, 3.6, 1.8, 1.6, 1.2, 0.4); c.closePath();
    c.fillStyle = LG(-3.2, 0, 3.2, 0, [0, '#4a3410', 0.35, '#f0d080', 0.55, '#c8a040', 1, '#3a2408']); c.fill();
    ell(0, 4.8, 0.7, 0.7, '#3a2a10');
    c.restore();
  }
  function clockLive(now) {
    const c = G(), t = LV.time, s = LV.stopClock ? 0 : Math.sin(now / 500) * 0.2;
    hands(CLK.fx, CLK.fy, 9.2, t[0] + t[1] / 60, t[1], '#1a1410');
    c.save(); c.beginPath(); c.rect(108, 52, 16, 28); c.clip();
    c.translate(116, 53); c.rotate(s); line(0, 0, 0, 19, 'rgba(170,140,80,0.8)', 0.4); ell(0, 21, 3, 3, brassG(-3, 3)); ell(-0.8, 20.2, 0.9, 0.9, 'rgba(255,240,200,0.5)');
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; poly([118, 52, 123, 52, 113, 80, 108, 80], 'rgba(220,235,240,0.05)'); c.restore();
  }
  function mirrorLive(now, mode) {
    const c = G(), m = MIR;
    c.save(); c.beginPath(); c.ellipse(m.cx, m.cy, m.rx, m.ry, 0, 0, 6.2832); c.clip();
    rect(m.cx - m.rx, m.cy - m.ry, m.rx * 2, m.ry * 2, LG(m.cx - m.rx, m.cy - m.ry, m.cx + m.rx, m.cy + m.ry, mode === 'night' ? [0, '#34464a', 1, '#121a22'] : [0, '#6a7a7c', 1, '#2a3436']));
    // в зеркале — лавка: полки шкафа (наоборот), отсвет лампы
    for (let k = 0; k < 3; k++) rect(m.cx - m.rx, m.cy - 14 + k * 14, m.rx * 2, 1, 'rgba(60,40,26,0.5)');
    if (LV.lampOn && mode === 'night') glow(m.cx - 8, m.cy + 16, 12, '255,190,90', 0.35);
    if (LV.mirror) LV.mirror(now, m);
    if (LV.mirrorFog > 0) rect(m.cx - m.rx, m.cy - m.ry, m.rx * 2, m.ry * 2, 'rgba(200,216,214,' + (0.55 * LV.mirrorFog).toFixed(3) + ')');
    c.save(); c.globalCompositeOperation = 'lighter'; poly([m.cx - 13, m.cy - m.ry, m.cx - 7, m.cy - m.ry, m.cx - 15, m.cy + m.ry, m.cx - 21, m.cy + m.ry], 'rgba(255,255,255,0.06)'); c.restore();
    rect(m.cx - m.rx, m.cy - m.ry, m.rx * 2, m.ry * 2, RG(m.cx, m.cy, m.rx * 0.6, m.ry * 1.05, [0, 'rgba(0,0,0,0)', 1, 'rgba(20,16,8,0.5)']));
    [[-12, -18, 1.6], [-14, 8, 1.1], [9, 20, 1.6], [12, -10, 1.1], [-8, 24, 1.1], [5, -24, 1.1]].forEach(function (q) { puff(m.cx + q[0], m.cy + q[1], q[2] * 2, q[2] * 2, '60,48,26', 0.5); });
    c.restore();
  }
  function roomFront(mode) {
    return function () {
      const c = G();
      // столешница: доски, волокна, сучки, потёртости
      rect(0, CY, W, 17, '#4b3524'); boards(0, CY + 0.6, W, 16, 4, '#4e3826', 11);
      for (let i = 0; i < 4; i++) { const r = RNG(60 + i); for (let x = 0; x < W;) { const len = 70 + r() * 90; line(x + len, CY + 1 + i * 4, x + len, CY + 5 + i * 4, 'rgba(0,0,0,0.5)', 0.4); x += len; } }
      [[88, CY + 6], [228, CY + 10], [330, CY + 13]].forEach(function (q) { ell(q[0], q[1], 3, 1.4, '#2a1c12'); ell(q[0], q[1], 1.6, 0.7, '#4b3524'); });
      c.save(); c.globalCompositeOperation = 'lighter'; rect(150, CY + 1, 90, 15, RG(195, CY + 8, 4, 50, [0, 'rgba(255,220,170,0.07)', 1, 'rgba(0,0,0,0)'])); c.restore();
      c.strokeStyle = 'rgba(30,18,10,0.45)'; c.lineWidth = 0.5; c.beginPath(); c.ellipse(114, CY + 10, 5, 1.8, 0, 0, 6.28); c.stroke();
      rect(0, CY, W, 0.8, 'rgba(255,214,170,0.35)');
      rect(0, CY + 16, W, 4, LG(0, CY + 16, 0, CY + 20, [0, '#7a5a3e', 0.3, '#4a3424', 1, '#120a06']));
      rect(0, CY + 20, W, H - CY - 20, LG(0, CY + 20, 0, H, [0, '#2a1c14', 1, '#120a06']));
      boards(0, CY + 20, W, H - CY - 20, 12, '#261a12', 13, true);
      for (let x = 12; x < W; x += 60) panel(x, CY + 26, 48, 60, '#2a1c14');
      rect(0, CY + 20, W, 5, LG(0, CY + 20, 0, CY + 25, [0, 'rgba(0,0,0,0.55)', 1, 'rgba(0,0,0,0)']));
      rect(0, H - 8, W, 8, LG(0, H - 8, 0, H, [0, '#1a120a', 1, '#0a0604'])); line(0, H - 8, W, H - 8, 'rgba(255,210,160,0.12)', 0.4);
      // ящик
      rr(166, 148, 54, 20, 1, '#140c08'); panel(168, 150, 50, 16, '#3a281b'); rr(188, 155, 10, 2, 0.8, brassG(188, 198)); ell(193, 160, 0.6, 1, '#0a0604');
      // счёты
      softRect(5, CY + 14, 40, 2, 1.6, 0.4);
      rr(4, CY + 1, 42, 15, 0.8, LG(4, 0, 46, 0, [0, '#6a4a2c', 0.5, '#3a2414', 1, '#1a1008'])); rect(6, CY + 3, 38, 11, '#140c06');
      for (let rw = 0; rw < 4; rw++) {
        const y = CY + 4.4 + rw * 2.6, moved = [3, 6, 1, 4][rw];
        line(6, y, 44, y, '#7a7a72', 0.35);
        for (let k = 0; k < 10; k++) { const bx = 7.5 + k * 2.9 + (k >= 10 - moved ? 5 : 0); if (bx > 43) continue; const dk = k === 4 || k === 5; ell(bx, y, 1.2, 1, LG(bx - 1.2, y - 1, bx + 1.2, y + 1, dk ? [0, '#7a4a28', 1, '#2a1008'] : [0, '#f0c080', 1, '#7a4a18'])); }
      }
      rect(4, CY + 1, 42, 0.6, 'rgba(255,214,170,0.3)');
      // керосиновая лампа
      softRect(50, CY - 0.5, 16, 2, 1.4, 0.45);
      ell(57, CY - 0.4, 9, 1.6, brassG(48, 66));
      c.beginPath(); c.moveTo(53, CY - 1); c.bezierCurveTo(50.6, CY - 3, 50.6, CY - 6.6, 53.4, CY - 7.4); c.lineTo(60.6, CY - 7.4); c.bezierCurveTo(63.4, CY - 6.6, 63.4, CY - 3, 61, CY - 1); c.closePath(); c.fillStyle = brassG(50.6, 63.4); c.fill();
      rr(51, CY - 9.4, 12, 2.2, 0.6, brassG(51, 63)); rect(63, CY - 9.2, 2, 1.8, '#c8a650');
      c.beginPath(); c.moveTo(54, CY - 9.4); c.bezierCurveTo(51.6, CY - 12, 51.4, CY - 18, 53.8, CY - 21); c.lineTo(54.6, CY - 25.6); c.lineTo(59.4, CY - 25.6); c.lineTo(60.2, CY - 21); c.bezierCurveTo(62.6, CY - 18, 62.4, CY - 12, 60, CY - 9.4); c.closePath();
      c.fillStyle = 'rgba(200,220,226,0.12)'; c.fill(); c.strokeStyle = 'rgba(240,248,248,0.35)'; c.lineWidth = 0.3; c.stroke();
      line(53.4, CY - 12, 53.6, CY - 19, 'rgba(255,255,255,0.35)', 0.5); rect(55, CY - 27, 4, 1.4, '#5a4420');
      // касса: шкатулка с монетами и ассигнациями
      softRect(259, CY + 11, 30, 2, 1.4, 0.4);
      rr(258, CY - 6, 30, 10, 0.6, LG(0, CY - 6, 0, CY + 4, [0, '#3a2414', 1, '#140c06'])); rect(260, CY - 4.6, 26, 7, LG(0, CY - 4.6, 0, CY + 2.4, [0, '#5a1a14', 1, '#2a0a08'])); rect(258, CY - 6, 30, 0.6, '#a8843a');
      rr(258, CY + 4, 30, 9, 0.6, LG(0, CY + 4, 0, CY + 13, [0, '#4a3220', 1, '#1a100a'])); rect(260, CY + 5, 26, 6, '#120a06');
      [[258.5, CY + 4.5], [286.5, CY + 4.5], [258.5, CY + 11.5], [286.5, CY + 11.5]].forEach(function (q) { ell(q[0], q[1], 0.9, 0.9, brassG(q[0] - 0.9, q[0] + 0.9)); });
      line(272, CY + 5, 272, CY + 11, '#2a1c12', 0.6);
      [[263, CY + 7], [266.6, CY + 8], [263.8, CY + 9.2], [268, CY + 6.6]].forEach(function (q) { ell(q[0], q[1], 1.9, 0.8, brassG(q[0] - 1.9, q[0] + 1.9)); });
      rect(275, CY + 6, 9, 4, '#a8b898'); rect(276, CY + 7, 7, 0.4, '#5a6a4a'); rect(277, CY + 8.6, 8, 2.4, '#c8b8a0');
      // раскрытый гроссбух, перо, чернильница, свеча на блюдце
      softRect(313, CY + 12, 44, 2, 1.4, 0.45);
      rr(312, CY + 3, 44, 11, 0.6, LG(0, CY + 3, 0, CY + 14, [0, '#5a2a20', 1, '#2a0e0a']));
      poly([315, CY + 2, 333.6, CY + 2.6, 333.6, CY + 12.6, 315, CY + 12], LG(315, 0, 334, 0, [0, '#ece2c4', 1, '#c8bc98'])); poly([334.4, CY + 2.6, 354, CY + 2, 354, CY + 12, 334.4, CY + 12.6], LG(334, 0, 354, 0, [0, '#bcb090', 0.2, '#e2d8b8', 1, '#d4c8a8']));
      for (let i = 0; i < 4; i++) { line(317, CY + 4.4 + i * 2, 325 + (i * 5) % 7, CY + 4.4 + i * 2, 'rgba(70,60,50,0.7)', 0.25); line(337, CY + 4.4 + i * 2, 343 + (i * 7) % 9, CY + 4.4 + i * 2, 'rgba(70,60,50,0.7)', 0.25); line(327.6, CY + 4.4 + i * 2, 331.6, CY + 4.4 + i * 2, 'rgba(140,40,30,0.7)', 0.25); }
      rect(345, CY + 12, 0.8, 4, '#8a1a14');
      line(338, CY + 10, 352, CY + 4, '#2a2a30', 0.45); rect(351.6, CY + 3.6, 1.6, 0.6, '#b8b8c0');
      rr(357, CY - 1, 8, 7, 0.8, LG(357, 0, 365, 0, [0, '#3a3a4a', 0.3, '#14141a', 1, '#05050a'])); rr(358, CY - 3, 6, 2, 0.5, brassG(358, 364));
      c.beginPath(); c.moveTo(361, CY - 3); c.quadraticCurveTo(363.6, CY - 10, 367, CY - 18); c.lineTo(367.8, CY - 17.4); c.quadraticCurveTo(364.6, CY - 10, 361.8, CY - 3); c.closePath(); c.fillStyle = '#d8d4c8'; c.fill();
      for (let k = 0; k < 7; k++) line(362 + k * 0.7, CY - 5 - k * 1.8, 364 + k * 0.6, CY - 4 - k * 1.6, 'rgba(160,156,146,0.7)', 0.2);
      ell(374.5, CY + 0.6, 5.6, 1.2, brassG(369, 380)); candleBody(374.5, CY, 8, 4.4, '#ddd2b4');
    };
  }
  function roomLoc(mode, o) {
    o = o || {};
    let mid = null;
    const L = {
      dark: mode === 'night' ? 0.56 : (mode === 'dawn' ? 0.3 : 0.14),
      lights: mode === 'night' ? [[57, 104, 300], [52, 60, 70], [302, 46, 90], [192, 44, 46]] : [[52, 60, 260], [192, 44, 120], [300, 60, 140]],
      back: function () { roomBack.opts = o; roomBack(mode)(); roomBack.opts = null; },
      front: roomFront(mode),
      dyn: function (now) {
        outside(WIN.x, WIN.y, WIN.w, WIN.h, now, mode, true);
        if (!mid) mid = P.into(P.mkL(), function () { roomMid(mode); });
        G().drawImage(mid, 0, 0, W, H);
        doorLeaf(now, mode);
        bellSwing(now);
        clockLive(now);
        mirrorLive(now, mode);
      },
      fdyn: function (now) {
        if (mode !== 'night') motes(now, 20, 30, 200, 110, 50, 8, '255,230,190', 0.55, [20, 26, 84, 26, 260, 216, 120, 216]);
        else if (LV.lampOn) motes(now, 0, 40, 170, 100, 30, 3, '255,214,150', 0.5);
      },
      top: function (now) {
        if (LV.lampOn) { flame(57, CY - 11.6, 1.05, now, 2, '255,160,70', 0.12); glow(57, CY - 16, 26, '255,200,130', 0.22); }
        if (LV.sconceOn && mode !== 'day') { flame(300.2, 43.8, 0.62, now, 5, '255,160,70', 0.08); glow(300, 42, 18, '255,190,110', 0.2); }
        if (mode === 'dawn') { shaft(52, 30, 60, 210, 216, 190, '255,210,160', 0.12); glow(52, 60, 70, '255,214,170', 0.25); }
        if (mode === 'day') glow(52, 60, 80, '230,236,240', 0.2);
      }
    };
    return L;
  }

  /* ============================================================
     ФАСАД НА УЛИЦЕ
     ============================================================ */
  function farTown(mode, base) {
    const night = mode === 'night', dawn = mode === 'dawn', col = night ? '#16221e' : (dawn ? '#8a7480' : '#8c9298'), c = G();
    // луковка церкви
    rect(54, base - 38, 26, 38, col); poly([54, base - 38, 67, base - 46, 80, base - 38], col); rect(62, base - 56, 10, 16, col);
    c.beginPath(); c.moveTo(60, base - 56); c.bezierCurveTo(58, base - 62, 64, base - 66, 67, base - 70); c.bezierCurveTo(70, base - 66, 76, base - 62, 74, base - 56); c.closePath(); c.fillStyle = col; c.fill();
    rect(66.4, base - 78, 1.2, 8, col); rect(64.4, base - 75.6, 5.2, 0.9, col);
    // каланча
    rect(300, base - 66, 8, 66, col); rect(298, base - 70, 12, 4, col); rect(301, base - 80, 6, 10, col); rect(302, base - 86, 4, 6, col);
    if (night) ell(304, base - 76, 1, 1, 'rgba(220,90,60,0.6)');
    [[-4, 30, 58], [24, 28, 70], [88, 30, 52], [282, 30, 66], [318, 26, 54], [356, 34, 62]].forEach(function (b, i) {
      rect(b[0], base - b[2], b[1], b[2], col); poly([b[0] - 2, base - b[2], b[0] + b[1] + 2, base - b[2], b[0] + b[1] - 6, base - b[2] - 6, b[0] + 6, base - b[2] - 6], col);
      rect(b[0] + b[1] * 0.3, base - b[2] - 12, 3, 8, col);
      for (let k = 0; k < 6; k++) { const wx = b[0] + 4 + (k % 3) * 9, wy = base - b[2] + 8 + Math.floor(k / 3) * 14; if (wx > b[0] + b[1] - 4) continue; const lit = night && hsh(i * 7 + k, 2) > 0.7; rect(wx, wy, 3, 4, lit ? 'rgba(220,150,70,0.7)' : 'rgba(0,0,0,0.25)'); }
    });
  }
  function midHouse(x, base, w, h, mode, i) {
    const c = G(), night = mode === 'night', dawn = mode === 'dawn', col = night ? '#141c1c' : (dawn ? '#5c5660' : '#6c7074');
    rect(x, base - h, w, h, LG(x, 0, x + w, 0, [0, sh(col, 0.85), 0.5, col, 1, sh(col, 0.7)])); tex(x, base - h, w, h, 0.4, 'overlay', 'mot', 1.1);
    rect(x - 2, base - h - 1.6, w + 4, 2.4, sh(col, 0.6)); poly([x - 1, base - h - 1.6, x + w + 1, base - h - 1.6, x + w - 10, base - h - 8, x + 10, base - h - 8], night ? '#0e1414' : sh(col, 0.75));
    rect(x + w * 0.3, base - h - 14, 4, 8, sh(col, 0.7)); rect(x + w * 0.3 - 0.6, base - h - 14.6, 5.2, 1, sh(col, 0.5));
    rect(x, base - 6, w, 6, sh(col, 0.65)); line(x, base - h + 1.2, x + w, base - h + 1.2, 'rgba(255,255,255,0.08)', 0.4);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) {
      const wx = x + 6 + k * 14, wy = base - h + 6 + r * 24; if (wx + 7 > x + w - 2 || wy + 11 > base - 8) continue;
      const lit = night && hsh(i * 31 + r * 7 + k, 3) > 0.62;
      rect(wx - 1, wy - 1, 8, 13, sh(col, 0.55));
      if (lit) { rect(wx, wy, 6, 11, LG(0, wy, 0, wy + 11, [0, '#f2c070', 1, '#b06a2a'])); rect(wx, wy, 2.4, 11, 'rgba(110,30,20,0.6)'); glow(wx + 3, wy + 5, 10, '255,190,110', 0.12); }
      else { rect(wx, wy, 6, 11, dawn ? LG(0, wy, 0, wy + 11, [0, '#b8a0a8', 1, '#4a4048']) : (night ? '#060a0a' : LG(0, wy, 0, wy + 11, [0, '#a8b0b6', 1, '#4a5056']))); if (!night) { rect(wx - 3.4, wy, 3, 11, '#3a2e26'); rect(wx + 6.4, wy, 3, 11, '#3a2e26'); } }
      line(wx + 3, wy, wx + 3, wy + 11, sh(col, 0.5), 0.4); line(wx, wy + 4, wx + 6, wy + 4, sh(col, 0.5), 0.4); rect(wx - 1.4, wy + 11.4, 8.8, 0.8, 'rgba(255,255,255,0.12)');
    }
  }
  function signBoard(text, now) {
    const c = G();
    rect(131, 62, 126, 24, '#0e0804');
    rect(132, 63, 124, 22, LG(0, 63, 0, 85, [0, '#5e4229', 0.15, '#3a2616', 1, '#1a0f07']));
    const fx = 135, fy = 66, fw = 118, fh = 17;
    rect(fx, fy, fw, fh, LG(0, fy, 0, fy + fh, [0, '#1c3a2e', 0.45, '#13261f', 1, '#0c1a14'])); tex(fx, fy, fw, fh, 0.4, 'overlay', 'mot', 0.6);
    const r = RNG(111); for (let k = 0; k < 16; k++) { const px = fx + r() * fw, py = fy + r() * fh; if (r() > 0.5) line(px, py, px + 2 + r() * 5, py + (r() - 0.5), 'rgba(0,0,0,0.35)', 0.25); else ell(px, py, 0.6, 0.4, '#3a2a1c'); }
    c.strokeStyle = 'rgba(180,150,84,0.9)'; c.lineWidth = 0.6; c.beginPath(); c.roundRect(fx + 2.4, fy + 2.4, fw - 4.8, fh - 4.8, 2.4); c.stroke();
    signText(text, now);
    [152, 236].forEach(function (lx) { line(lx, 57, lx, 62, '#141a19', 0.8); line(lx, 57, lx + 3, 57, '#141a19', 0.8); poly([lx - 3.4, 61, lx + 3.4, 61, lx + 2.4, 63.4, lx - 2.4, 63.4], '#1c2422'); });
  }
  /* золотые буквы на эмали вывески; можно рисовать поверх пустой доски с прозрачностью */
  function signText(text, now) {
    const c = G(), fx = 135, fy = 66, fw = 118, fh = 17;
    if (text) {
      const lines = text.split('\n');
      c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      lines.forEach(function (tl, i) {
        const big = lines.length === 1, fs = big ? 10.6 : 5.6, ty = big ? fy + 12.6 : fy + 7.6 + i * 6.4;
        c.font = 'bold ' + fs + 'px "Palatino Linotype", "Book Antiqua", Georgia, serif'; c.letterSpacing = big ? '2.4px' : '0.8px';
        c.fillStyle = 'rgba(4,12,8,0.95)'; c.fillText(tl, fx + fw / 2 + 0.5, ty + 0.6);
        c.fillStyle = LG(0, ty - fs, 0, ty, [0, '#fff0c0', 0.4, '#e2c27e', 0.7, '#b8944a', 1, '#8a6a30']); c.fillText(tl, fx + fw / 2, ty);
        c.letterSpacing = '0px';
      });
      c.restore();
      if (lines.length === 1) [fx + 14, fx + fw - 14].forEach(function (dx) { const dy = fy + 8.5; poly([dx - 2.4, dy, dx, dy - 2.4, dx + 2.4, dy, dx, dy + 2.4], goldG(dx - 2, dy - 2, dx + 2, dy + 2)); line(dx < fx + fw / 2 ? dx - 7 : dx + 3, dy, dx < fx + fw / 2 ? dx - 3 : dx + 7, dy, 'rgba(160,130,70,0.8)', 0.4); });
      const t = (now % 9000) / 1500; if (t < 1) { c.save(); c.globalCompositeOperation = 'lighter'; const bx = fx + t * fw; poly([bx - 3, fy + 2, bx + 1, fy + 2, bx - 2, fy + fh - 2, bx - 6, fy + fh - 2], 'rgba(255,240,200,0.12)'); c.restore(); }
    }
  }
  function pawnBalls(now) {
    const c = G(), ir = '#2a3432';
    rect(94, 68, 22, 2, LG(0, 68, 0, 70, [0, '#4a5654', 1, '#1a2220'])); rect(113.6, 65.6, 3.4, 6.4, ir);
    c.strokeStyle = ir; c.lineWidth = 1; c.beginPath(); c.moveTo(115, 80); c.quadraticCurveTo(108, 72, 103, 70); c.stroke();
    c.lineWidth = 0.7; c.beginPath(); c.arc(92.6, 68, 1.6, -1.6, 1.6, true); c.stroke();
    for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(107 + k * 3, 72 + k * 1.6, 0.9, 0, 6.28); c.stroke(); }
    const sw = Math.sin(now / 1500) * 1.2;
    line(100, 70, 100 + sw * 0.5, 74.4, '#6a6a64', 0.4); line(95.6 + sw, 75, 104.6 + sw, 75, '#6a6a64', 0.5);
    [[97, 79], [104, 79], [100.5, 85.5]].forEach(function (b) {
      const bx = b[0] + sw, by = b[1];
      ell(bx + 0.6, by + 0.8, 3.6, 3.6, 'rgba(0,0,0,0.35)');
      ell(bx, by, 3.6, 3.6, RG(bx - 1.2, by - 1.4, 0.2, 4.6, [0, '#fff2c0', 0.3, '#e0b860', 0.7, '#9a7430', 1, '#4a3410']));
    });
    glow(100, 82, 12, '220,170,80', 0.08);
  }
  function facadeBack(mode, o) {
    return function () {
      const c = G(), night = mode === 'night', dawn = mode === 'dawn';
      vg(0, 0, W, 190, night ? '#071012' : (dawn ? '#4a4c6e' : '#7c8894'), night ? '#1e2b27' : (dawn ? '#e6b49a' : '#c8c8c4'));
      if (night) glow(62, 26, 76, '160,182,172', 0.14); else if (dawn) { glow(250, 150, 160, '255,210,170', 0.5); glow(250, 150, 40, '255,240,210', 0.5); }
      farTown(mode, 158);
      fog(70, 100, 0, 0, night ? 0.55 : 0.6, night ? '90,110,104' : (dawn ? '240,210,206' : '220,222,224'), 3);
      [[-16, 62, 74], [44, 62, 62], [280, 50, 70], [328, 70, 82]].forEach(function (b, i) { midHouse(b[0], 180, b[1], b[2], mode, i + 20); });
      rect(0, 178, W, 8, night ? '#0d1213' : '#3a3a3a');
      fog(120, 70, 0, 0, night ? 0.45 : 0.4, night ? '70,90,86' : (dawn ? '240,214,208' : '210,212,214'), 5);
      // ---- ломбард: кровля из крашеного железа, труба
      poly([108, 54, 280, 54, 270, 40, 118, 40], LG(0, 40, 0, 54, night ? [0, '#2c3a36', 1, '#141c1a'] : [0, '#4a5e58', 1, '#26322e']));
      for (let x = 116; x < 274; x += 6) line(x, 54, x + (x - 194) * 0.06, 40.5, night ? 'rgba(60,80,76,0.6)' : 'rgba(120,150,140,0.5)', 0.45);
      line(118, 40.3, 270, 40.3, night ? 'rgba(120,150,140,0.4)' : 'rgba(220,230,220,0.5)', 0.4);
      rect(258, 35, 12, 2, '#1e1410'); rect(260, 37, 8, 13, LG(260, 0, 268, 0, [0, '#4a302a', 1, '#22130f'])); for (let y = 39; y < 50; y += 2.6) line(260, y, 268, y, 'rgba(0,0,0,0.4)', 0.3);
      // карниз с сухариками
      moulding(112, 54.6, 164, 2.6, '#3e2a1a'); rect(116, 57, 156, 5, '#2a1b11'); for (let x = 118; x < 270; x += 4) rect(x, 59.6, 2, 2, '#140c06'); rect(116, 62, 156, 1, '#0e0806');
      // обшивка доской
      for (let y = 63; y < 172; y += 4) {
        const v = hsh(y, 31), base = night ? (v > 0.66 ? '#2b1c12' : v > 0.33 ? '#281a10' : '#2e1e13') : (v > 0.66 ? '#5a3e28' : v > 0.33 ? '#52381f' : '#5e4230');
        rect(122, y, 144, 4, LG(0, y, 0, y + 4, [0, sh(base, 1.3), 0.25, base, 0.85, sh(base, 0.8), 1, sh(base, 0.4)]));
        const r = RNG(y); for (let k = 0; k < 3; k++) { const gy = y + 0.8 + r() * 2.4; line(122, gy, 266, gy + (r() - 0.5) * 0.4, 'rgba(10,5,2,' + (0.1 + r() * 0.15).toFixed(2) + ')', 0.15); }
        const jx = 122 + Math.floor(hsh(y, 7) * 138); line(jx, y, jx, y + 4, 'rgba(0,0,0,0.5)', 0.3);
      }
      tex(122, 63, 144, 109, 0.3, 'overlay', 'mot', 1);
      for (let k = 0; k < 9; k++) rect(132 + k * 8 + hsh(k, 33) * 4, 156, 1.6, 10 + hsh(k, 34) * 8, LG(0, 156, 0, 172, [0, 'rgba(0,0,0,0.25)', 1, 'rgba(0,0,0,0)']));
      // пилястры
      [116, 266].forEach(function (px) { woodV(px, 62, 6, 110, night ? '#33221a' : '#5a3e2a', px); moulding(px - 2, 62, 10, 3, '#3a281b'); rect(px - 2, 167, 10, 5, LG(0, 167, 0, 172, [0, '#4a3424', 1, '#1a100a'])); });
      // вывеска
      signBoard(o.sign === undefined ? 'ЛОМБАРД' : o.sign, 5000);
      // витрина: рама (содержимое — живое)
      rect(128, 88, 76, 66, '#140c06'); rect(129, 89, 74, 64, LG(129, 89, 203, 153, [0, '#58402a', 0.1, '#3a2616', 1, '#24160c'])); rect(133, 93, 66, 56, '#0a0604');
      rect(125, 152, 82, 3, LG(0, 152, 0, 155, [0, '#5a4028', 1, '#24160c'])); rect(126, 155, 80, 1, '#0a0604');
      // дверь: наличник, филёнки (стекло — живое)
      rect(208, 92, 42, 80, '#140c07'); rect(211, 95, 36, 77, LG(211, 0, 247, 0, [0, '#3a2616', 0.1, '#2e1d10', 1, '#20140a']));
      rect(215, 99, 28, 30, '#0a0604');
      rect(211, 129, 36, 4, LG(0, 129, 0, 133, [0, '#46301a', 1, '#24160a']));
      [215, 230].forEach(function (px) { panel(px, 134, 13, 30, night ? '#2e1d10' : '#4a3018'); });
      rr(241.6, 145, 2.4, 6, 0.6, brassG(241.6, 244)); ell(242.8, 152.4, 0.5, 0.8, '#0a0604');
      rect(212, 165, 34, 3, LG(0, 165, 0, 168, [0, '#6a5a34', 1, '#2a2010']));
      rect(209, 169, 40, 3, LG(0, 169, 0, 172, [0, '#4e4c46', 1, '#2a2926']));
      // козырёк на кованых кронштейнах
      poly([200, 91, 258, 91, 252, 85, 206, 85], LG(0, 85, 0, 91, [0, night ? '#2c3836' : '#4a5a56', 1, night ? '#141c1a' : '#26302e'])); for (let k = 202; k < 258; k += 3) line(k, 91, k + (k - 229) * 0.1, 85.4, 'rgba(0,0,0,0.3)', 0.3);
      [209, 248].forEach(function (bx) { c.strokeStyle = '#121816'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(bx, 99); c.lineTo(bx, 91); c.moveTo(bx, 97); c.quadraticCurveTo(bx + (bx < 230 ? 4 : -4), 96, bx + (bx < 230 ? 5 : -5), 91); c.stroke(); });
      // фонарь у двери
      line(250, 99.5, 255, 99.5, '#141a19', 0.8); rect(254, 95, 7, 2, '#141a19'); poly([253.6, 97, 261.4, 97, 260.4, 105, 254.6, 105], night ? 'rgba(255,200,110,0.55)' : 'rgba(200,206,210,0.5)'); rect(253.4, 105, 8.2, 2, '#141a19'); line(257.5, 97, 257.5, 105, '#141a19', 0.4);
      // водосточная труба
      rect(272, 54, 8, 3, '#1e2624'); rect(274, 57, 3, 125, LG(274, 0, 277, 0, [0, '#2e3a38', 0.4, '#3a4846', 1, '#141a18'])); for (let y = 70; y < 180; y += 30) rect(273, y, 5, 1, '#121816'); poly([274, 181, 281, 181, 282, 183.4, 274, 183.4], '#1c2422');
      // цоколь из рваного камня
      rect(114, 172, 160, 14, '#121210');
      for (let ri = 0; ri < 2; ri++) { const y = 172 + ri * 7; for (let x = 114 - ri * 5; x < 274;) { const bw = 9 + Math.floor(hsh(x * 3 + ri, 41) * 9), x0 = Math.max(114, x), x1 = Math.min(274, x + bw - 1); if (x1 > x0) { rr(x0, y + 0.3, x1 - x0, 6, 1, LG(0, y, 0, y + 6, [0, sh(['#3a3934', '#403e38', '#36342f'][Math.floor(hsh(x, ri + 43) * 3)], night ? 0.8 : 1.6), 1, sh('#1e1d1a', night ? 1 : 1.8)])); if (hsh(x, ri + 44) > 0.7) puff(x0 + 2, y + 5, 2, 0.8, '40,60,36', 0.6); } x += bw; } }
      // крыльцо: три ступени, перила
      [[204, 254, 172], [200, 258, 177], [196, 262, 182]].forEach(function (s, i) {
        const x0 = s[0], x1 = s[1], y = s[2], w = x1 - x0, st = night ? '#3c3b37' : '#7a7870';
        rect(x0, y, w, 2, LG(0, y, 0, y + 2, [0, sh(st, 1.3), 1, st])); rect(x0, y + 2, w, 3, LG(0, y + 2, 0, y + 5, [0, sh(st, 0.6), 1, sh(st, 0.4)]));
        tex(x0, y, w, 5, 0.4, 'overlay', 'mot', 0.8); line(x0 + 3, y + 0.2, x1 - 3, y + 0.2, 'rgba(200,214,214,0.15)', 0.3);
      });
      [[204, 197, 1], [253, 260, -1]].forEach(function (p) {
        const xt = p[0], xb = p[1], ir = '#0e1413';
        line(xt, 150, xt, 172, ir, 0.9); line(xb, 163, xb, 182, ir, 0.9); line(xt, 150, xb, 163, ir, 1); line(xt, 151.2, xb, 164.2, '#1e2826', 0.4);
        const xm = (xt + xb) / 2; line(xm, 156.5, xm, 177, ir, 0.6);
        c.strokeStyle = ir; c.lineWidth = 0.6; c.beginPath(); c.arc(xb - p[2] * 1.6, 166, 1.4, 0, 6.28); c.stroke();
      });
      // уличный фонарь справа
      rect(326, 178, 10, 6, '#0c1110'); rect(328, 168, 6, 10, '#0e1413'); rect(330, 66, 2, 104, LG(330, 0, 332, 0, [0, '#1a2220', 1, '#0a0e0d'])); rect(328, 64, 6, 3, '#141c1b');
      rect(327, 63, 8, 2, '#0e1413'); poly([326, 55, 336, 55, 334, 63, 328, 63], night ? 'rgba(255,226,150,0.85)' : 'rgba(200,210,214,0.6)'); poly([325, 55, 337, 55, 331, 50], '#0e1413'); rect(330, 46, 2, 5, '#0e1413');
      // тротуар, бордюр, мостовая
      rect(0, 186, W, 30, night ? '#06090a' : '#2a2c2e');
      for (let x = -6; x < W; x += 21) { rr(x + 1, 187, 19.6, 5, 0.6, night ? '#1a2021' : '#6a6c6c'); line(x + 1, 187.2, x + 20, 187.2, 'rgba(255,255,255,' + (night ? 0.08 : 0.25) + ')', 0.3); }
      rect(0, 192, W, 2, night ? '#2a3031' : '#8a8c8a'); P.cobbles(194, 216, night ? '#161c1e' : '#4a4a50', 9);
      // лужи: в одной — витрина, в другой — фонарь (или небо)
      PUD.forEach(function (p) {
        c.save(); c.beginPath(); c.ellipse(p[0], p[1], p[2], p[3], 0, 0, 6.2832); c.clip();
        rect(p[0] - p[2], p[1] - p[3], p[2] * 2, p[3] * 2, night ? '#06090a' : (dawn ? '#9a8a96' : '#8a9096'));
        p[4].forEach(function (f) { for (let xx = f[0]; xx < f[1]; xx += 0.7) { const a = (0.35 + 0.65 * hsh(xx * 3, 77)) * f[3]; line(xx, p[1] - p[3], xx, p[1] + p[3], 'rgba(' + (night ? f[2] : '255,236,220') + ',' + (night ? a : a * 0.5).toFixed(3) + ')', 0.45); } });
        c.restore();
        c.save(); c.beginPath(); c.ellipse(p[0], p[1], p[2], p[3], 0, 0, 6.2832); c.strokeStyle = night ? 'rgba(60,72,74,0.6)' : 'rgba(255,255,255,0.3)'; c.lineWidth = 0.4; c.stroke(); c.restore();
      });
      if (!night) { c.save(); c.globalCompositeOperation = 'lighter'; rect(0, 0, W, H, LG(W, 0, 0, 0, [0, dawn ? 'rgba(255,170,120,0.14)' : 'rgba(255,250,240,0.05)', 1, 'rgba(0,0,0,0)'])); c.restore(); }
    };
  }
  /* в витрине: тёплая лавка, полки, хозяин за прилавком, лампа */
  function shopWindowIn(now, mode) {
    const c = G(), x = 133, y = 93, w = 66, h = 56, fl = 0.92 + Math.sin(now / 130) * 0.04 + Math.sin(now / 47) * 0.02, lit = mode !== 'day';
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    rect(x, y, w, h, lit ? RG(x + 28, y + 16, 1, 70, [0, 'rgb(' + (255 * fl | 0) + ',' + (210 * fl | 0) + ',' + (140 * fl | 0) + ')', 0.25, '#c88a40', 0.6, '#6a3818', 1, '#2a1408']) : LG(0, y, 0, y + h, [0, '#3a2a20', 1, '#1a100a']));
    for (let k = x + 2; k < x + w; k += 4) rect(k, y, 0.6, 40, 'rgba(40,16,4,0.18)');
    [y + 19, y + 32].forEach(function (sy, si) {
      rect(x, sy, w, 1.6, '#3a2010'); rect(x, sy, w, 0.5, lit ? '#c08048' : '#5a3a20');
      for (let k = 0; k < 12; k++) { const ix = x + 6 + k * 5 + hsh(k, si + 80) * 2, ih = 3 + hsh(k, si + 81) * 6; if (ix > x + w - 4 || (ix > x + 40 && ix < x + 56)) continue; rr(ix, sy - ih, 3, ih, 0.4, '#2a1408'); rect(ix, sy - ih, 0.6, ih, lit ? 'rgba(255,180,100,0.6)' : 'rgba(120,90,60,0.4)'); }
    });
    // хозяин за прилавком: склонился к счётам, контровой свет лампы
    if (LV.winWho !== false) {
      const ox = x + 50, oy = y + 16 + (Math.sin(now / 7000) > 0.6 ? 1.6 : 0), br = Math.sin(now / 1300) * 0.5, sc = '#1e0e06';
      c.beginPath(); c.moveTo(ox - 3, oy + 26); c.lineTo(ox - 2.6, oy + 15 - br); c.bezierCurveTo(ox - 1, oy + 10, ox + 2, oy + 9, ox + 6, oy + 9); c.bezierCurveTo(ox + 10, oy + 9, ox + 13, oy + 10, ox + 14, oy + 15 - br); c.lineTo(ox + 14.4, oy + 26); c.closePath(); c.fillStyle = sc; c.fill();
      rect(ox + 4.4, oy + 6.4, 3.2, 3.4, sc);
      ell(ox + 6, oy + 3.6, 3.4, 3.9, sc); ell(ox + 6.6, oy + 7.6, 2.4, 2.2, sc);
      c.beginPath(); c.moveTo(ox + 2.4, oy + 1.4); c.quadraticCurveTo(ox + 6, oy - 1.6, ox + 9.6, oy + 1.4); c.lineTo(ox + 10.6, oy + 2.6); c.lineTo(ox + 1.4, oy + 2.6); c.closePath(); c.fill();
      if (lit) { c.strokeStyle = 'rgba(230,150,64,0.75)'; c.lineWidth = 0.45; c.beginPath(); c.moveTo(ox + 2.6, oy + 2.6); c.quadraticCurveTo(ox + 2.4, oy + 5.6, ox + 4, oy + 8.6); c.moveTo(ox - 2.4, oy + 15); c.lineTo(ox - 2.8, oy + 25); c.stroke(); }
    }
    rect(x, y + 40, w, 3, '#4a2a14'); rect(x, y + 40, w, 0.6, lit ? '#d09050' : '#6a4a2a'); rect(x, y + 43, w, h - 43, '#20100a');
    line(x + 26, y, x + 26, y + 8, '#1a0c05', 0.5); poly([x + 21, y + 12, x + 31, y + 12, x + 28.4, y + 8, x + 23.6, y + 8], '#2a1a0c'); if (lit) { rect(x + 22, y + 11.6, 8, 0.8, '#ffe0a0'); glow(x + 26, y + 12, 10, '255,210,140', 0.4); }
    // на подоконнике: самовар, подсвечник, кувшин — силуэтами
    const by = y + h, sc = '#140904';
    // самовар: поддон, тулово, ручки, кран, конфорка с чайником
    ell(x + 10, by - 1, 5, 1.2, sc); rect(x + 8.4, by - 4, 3.2, 3, sc);
    c.beginPath(); c.moveTo(x + 6, by - 4); c.bezierCurveTo(x + 3.4, by - 7, x + 3.6, by - 12, x + 6.4, by - 13.6); c.lineTo(x + 13.6, by - 13.6); c.bezierCurveTo(x + 16.4, by - 12, x + 16.6, by - 7, x + 14, by - 4); c.closePath(); c.fillStyle = sc; c.fill();
    c.strokeStyle = sc; c.lineWidth = 0.8; [-1, 1].forEach(function (sd) { c.beginPath(); c.arc(x + 10 + sd * 7.4, by - 10, 1.4, 0, 6.28); c.stroke(); });
    line(x + 12, by - 6.4, x + 16.6, by - 5.6, sc, 0.9); rect(x + 16, by - 5.8, 1, 1.8, sc);
    rect(x + 8, by - 16, 4, 2.4, sc); ell(x + 10, by - 18, 3, 2.2, sc); rect(x + 9.4, by - 21, 1.2, 1.4, sc);
    if (lit) { line(x + 5, by - 12, x + 4.6, by - 6, 'rgba(230,150,70,0.8)', 0.4); ell(x + 8, by - 19, 0.9, 0.5, 'rgba(230,150,70,0.6)'); }
    rect(x + w - 11.4, by - 14, 0.9, 14, sc); rect(x + w - 15, by - 10, 9, 0.9, sc); [x + w - 15, x + w - 11, x + w - 7].forEach(function (cx2, i) { rect(cx2 - 0.5, by - 13 - (i === 1 ? 1 : 0), 1, 3, '#d8c8a0'); if (lit && Math.sin(now / 110 + i) > -0.6) ell(cx2, by - 14.6 - (i === 1 ? 1 : 0), 0.5, 0.9, '#ffd890'); });
    rr(x + w - 26, by - 7, 5, 7, 0.8, sc); rect(x + w - 25, by - 9, 3, 2, sc);
    // штора, ламбрекен
    rect(x, y, w, 2.6, '#4a1612'); for (let k = 0; k < w; k += 6) ell(x + k + 3, y + 2.6, 2.2, 1, '#4a1612');
    rect(x, y, 4, h, LG(x, 0, x + 4, 0, [0, '#3a100c', 0.5, '#5a1c16', 1, '#3a100c']));
    // стекло: отражение улицы, блики, капли
    rect(x, y + h - 18, w, 18, LG(0, y + h - 18, 0, y + h, [0, 'rgba(120,146,146,0)', 1, 'rgba(120,146,146,0.12)']));
    c.save(); c.globalCompositeOperation = 'lighter'; [0, 7].forEach(function (k) { poly([x + w - 18 + k, y, x + w - 13 + k, y, x + w - 31 + k, y + h, x + w - 36 + k, y + h], 'rgba(255,255,255,0.05)'); }); c.restore();
    if (mode === 'night') { const r = RNG(12); for (let i = 0; i < 12; i++) { const px = x + r() * w, py = y + ((r() * h + now * 0.01 * (1 + r())) % h); line(px, py - 4, px, py, 'rgba(200,222,220,0.18)', 0.3); ell(px, py, 0.35, 0.55, 'rgba(235,245,245,0.55)'); } }
    c.restore();
    // переплёт витрины
    rect(165, 93, 2, 56, LG(165, 0, 167, 0, [0, '#3e2a1a', 1, '#1a0e06'])); rect(133, 105, 66, 2, LG(0, 105, 0, 107, [0, '#3e2a1a', 1, '#1a0e06'])); rect(149, 93, 1, 12, '#2a1a0e'); rect(182, 93, 1, 12, '#2a1a0e');
  }
  function doorGlassOut(now, mode) {
    const c = G(), fl = 0.9 + Math.sin(now / 130) * 0.04, lit = mode !== 'day';
    c.save(); c.beginPath(); c.rect(216, 100, 26, 28); c.clip();
    rect(216, 100, 26, 28, lit ? LG(0, 100, 0, 128, [0, 'rgb(' + (150 * fl | 0) + ',' + (92 * fl | 0) + ',' + (40 * fl | 0) + ')', 1, '#2a1608']) : LG(0, 100, 0, 128, [0, '#4a4440', 1, '#1a1612']));
    rect(216, 100, 26, 28, 'rgba(210,180,140,0.14)'); for (let k = 217; k < 242; k += 2.4) line(k, 100, k, 128, 'rgba(60,30,10,0.3)', 0.5);
    if (LV.doorWho) LV.doorWho(now);
    c.restore();
    rect(228, 100, 2, 28, '#2a1a0e'); rect(216, 113, 26, 1.4, '#2a1a0e');
    rect(221, 106.6, 16, 6.4, '#d6c8a2'); c.save(); c.fillStyle = '#3a2a1a'; c.font = 'italic 2.1px Georgia, serif'; c.textAlign = 'center'; c.fillText(LV.plate || 'Открыто', 229, 110.8); c.restore();
    line(223, 104, 223, 106.6, '#1a1008', 0.3); line(235, 104, 235, 106.6, '#1a1008', 0.3);
  }
  const PUD = [[170, 202, 46, 2.6, [[135, 164, '230,150,70', 0.3], [168, 197, '230,150,70', 0.3]]], [312, 209, 34, 2.2, [[328, 334, '240,220,150', 0.45], [296, 304, '220,150,80', 0.14]]]];
  function ripples(now) {
    const c = G();
    PUD.forEach(function (p, i) {
      for (let k = 0; k < 3; k++) {
        const ph = now / 650 + hsh(i * 3 + k, 71), idx = Math.floor(ph), t = ph - idx;
        const px = p[0] + (hsh(i * 7 + k + idx * 13, 72) - 0.5) * p[2] * 1.4, py = p[1] + (hsh(i + k + idx * 5, 73) - 0.5) * p[3];
        c.strokeStyle = 'rgba(200,214,214,' + ((1 - t) * 0.4).toFixed(3) + ')'; c.lineWidth = 0.3; c.beginPath(); c.ellipse(px, py, 0.6 + t * 4, (0.6 + t * 4) * 0.3, 0, 0, 6.2832); c.stroke();
      }
    });
  }
  function facadeLoc(mode, o) {
    o = o || {};
    const night = mode === 'night';
    return {
      out: true,
      dark: night ? 0.34 : 0.04,
      lights: night ? [[166, 121, 70], [257, 101, 34], [331, 70, 60], [192, 70, 60], [331, 188, 50]] : [[192, 120, 300]],
      back: facadeBack(mode, o),
      front: function () {},
      dyn: function (now) {
        shopWindowIn(now, mode); doorGlassOut(now, mode); pawnBalls(now);
        const c = G();
        for (let k = 0; k < 8; k++) { const t = ((now / 4600) + k / 8) % 1; puff(264 + t * 14 + Math.sin(now / 900 + k) * 1.5, 33 - t * 24, 1 + t * 4, 1 + t * 3.4, night ? '120,136,132' : '220,220,224', (1 - t) * (t < 0.1 ? t * 10 : 1) * 0.3); }
        if (night) { ripples(now); for (let k = 0; k < 4; k++) { const t = (now / 620 + hsh(k, 91)) % 1; ell(203 + k * 16, 92 + t * (k === 0 || k === 3 ? 92 : 78), 0.35, 0.8, 'rgba(200,216,216,' + (0.45 * (1 - t * 0.5)).toFixed(3) + ')'); } }
        fog(150, 60, now, 4, night ? 0.4 : 0.35, night ? '110,130,126' : '240,226,222', 4);
      },
      fdyn: function (now) {
        if (night) {
          c2rain(now);
          const fl = 0.9 + Math.sin(now / 130) * 0.04;
          const c = G(); c.save(); c.globalCompositeOperation = 'lighter';
          poly([130, 186, 204, 186, 228, 216, 112, 216], LG(0, 186, 0, 216, [0, 'rgba(230,150,70,' + (0.18 * fl).toFixed(3) + ')', 1, 'rgba(230,150,70,0)']));
          c.restore();
        }
      },
      top: function (now) {
        if (!night) { glow(192, 190, 200, '255,210,180', 0.04); return; }
        const fl = 0.9 + Math.sin(now / 130) * 0.04;
        glow(331, 59, 46, '230,206,140', 0.24); shaft(331, 63, 8, 331, 186, 100, '230,206,140', 0.12);
        const c = G(); c.save(); c.translate(331, 189); c.scale(1, 0.22); glow(0, 0, 54, '230,206,140', 0.26); c.restore();
        glow(257, 101, 26, '255,190,90', 0.24 * fl); glow(152, 66, 16, '255,210,140', 0.16 * fl); glow(236, 66, 16, '255,210,140', 0.16 * fl); glow(166, 121, 64, '230,150,60', 0.1 * fl);
      }
    };
  }
  function c2rain(now) {
    const c = G();
    c.save(); c.lineWidth = 0.28;
    [[90, 4, 0.18, 0.09], [50, 7, 0.32, 0.13], [16, 12, 0.6, 0.12]].forEach(function (L, li) {
      c.strokeStyle = 'rgba(200,214,224,' + L[3] + ')'; c.beginPath(); const r = RNG(li + 3);
      for (let i = 0; i < L[0]; i++) { const sp = 0.7 + r() * 0.6, px = r() * W, py = (r() * H + now * L[2] * sp) % H; c.moveTo(px, py); c.lineTo(px - L[1] * 0.12, py + L[1]); }
      c.stroke();
    });
    c.restore();
  }

  /* ============================================================
     ПЕРСОНАЖИ ИГРЫ — пиксельные, поверх живописи
     ============================================================ */
  let PX = null;
  function pxCtx() { if (!PX) { PX = document.createElement('canvas'); PX.width = W; PX.height = H; } const k = PX.getContext('2d'); k.setTransform(1, 0, 0, 1, 0, 0); k.globalAlpha = 1; k.clearRect(0, 0, W, H); return k; }
  /* fn рисует пикселями (Art.api), результат ложится в кадр; tf — [tx, ty, s] сдвиг и масштаб */
  function pixels(fn, tf, alpha) {
    if (typeof Art === 'undefined' || !Art.api) return;
    const k = pxCtx(); Art.api.withCtx(k, fn);
    const c = G(); c.save(); c.imageSmoothingEnabled = false; if (alpha !== undefined) c.globalAlpha *= alpha;
    if (tf) { c.translate(tf[0], tf[1]); c.scale(tf[2], tf[2]); }
    c.drawImage(PX, 0, 0, W, H); c.restore();
  }
  /* посетитель за прилавком — как в игре (L — облик из LOOKS / ARCH) */
  function npc(L, o) { o = o || {}; pixels(function () { Art.api.drawPerson(L, Object.assign({ x: 192, dy: 0, alpha: 1, mood: 'neutral', blink: false, lx: 0, ly: 0 }, o)); }, o.tf, o.a); }
  function heroWalk(x, y, dir, ph, mv, now, tf, a) { pixels(function () { Art.api.drawHero(x, y, dir, ph, mv, now); }, tf, a); }
  /* дядя Матвей сидит на ступеньке, часы у уха; (x,y) — где он сидит */
  function matveyPx(x, y, now, tf, a) {
    pixels(function () {
      const R = Art.api.R, C = '#25262c', CD = '#16171b', CL = '#3e404a', SK = '#c8a68a', SKD = '#9a7a62', HR = '#cfcac0', HD = '#a8a49a', CAP = '#141418';
      const b = Math.sin(now / 1300) > 0.4 ? 1 : 0;
      R(x + 13, y + 16, 7, 3, '#0d0b0a'); R(x + 13, y + 18, 8, 1, '#1e1a16');
      R(x + 12, y + 4, 4, 12, '#121214'); R(x + 12, y + 4, 1, 12, '#202024');
      R(x - 3, y - 2, 17, 6, C); R(x - 3, y - 2, 17, 1, CL); R(x + 12, y - 1, 3, 5, CD);
      for (let yy = -28; yy < 0; yy++) { const t = (yy + 28) / 28, hw = 5 + t * 2.5, cx = 1 - (1 - t) * 1.5; R(Math.round(x + cx - hw), y + yy + b * (yy < -10 ? 1 : 0), Math.round(hw * 2), 1, C); R(Math.round(x + cx - hw), y + yy, 1, 1, CL); R(Math.round(x + cx + hw) - 1, y + yy, 1, 1, CD); }
      [-22, -16, -10].forEach(function (yy) { R(x + 3, y + yy + b, 1, 1, '#8a7a5a'); });
      R(x - 2, y - 24 + b, 3, 1, CD);
      R(x + 2, y - 22 + b, 3, 11, C); R(x + 4, y - 12 + b, 5, 3, C); R(x + 8, y - 12 + b, 3, 3, SK);
      for (let k = 0; k < 9; k++) R(x + 4 + Math.round(k * 0.5), y - 25 - k + b, 3, 1, k < 7 ? C : SK);
      R(x + 6, y - 37 + b, 3, 3, SKD);
      R(x + 8, y - 37 + b, 3, 3, '#c8a040'); R(x + 9, y - 36 + b, 1, 1, '#f0e0b0'); if ((now % 1000) < 120) R(x + 10, y - 38 + b, 1, 1, '#fff6d8');
      R(x - 3, y - 41 + b, 8, 10, SK); R(x - 3, y - 41 + b, 2, 9, SKD); R(x + 5, y - 38 + b, 1, 2, SK); R(x + 2, y - 38 + b, 1, 1, '#14100c'); R(x + 1, y - 39 + b, 3, 1, HD);
      R(x - 1, y - 33 + b, 7, 4, HR); R(x, y - 29 + b, 5, 2, HR); R(x + 1, y - 27 + b, 3, 1, HD); R(x + 1, y - 34 + b, 4, 1, HD);
      R(x - 4, y - 40 + b, 2, 6, HR); R(x - 4, y - 34 + b, 2, 1, HD);
      R(x - 4, y - 44 + b, 9, 4, CAP); R(x - 3, y - 45 + b, 7, 1, CAP); R(x + 4, y - 41 + b, 5, 1, '#0a0a0c'); R(x - 4, y - 41 + b, 9, 1, '#26262c');
    }, tf, a);
  }

  /* Пустой: тёмная фигура из тумана, пиксельная, с бледными точками глаз */
  function hollowPx(x, y, s, a, hat, now, seed) {
    const ox = 40, oy = 100;
    pixels(function () {
      const R0 = Art.api.R, R = function (a1, b1, w1, h1, c1) { R0(ox + a1, oy + b1, w1, h1, c1); }, col = '#050707', b = Math.sin(now / 420 + seed) > 0 ? 1 : 0;
      R(-7, -62 + b, 14, 52, col); R(-8, -40, 16, 30, col); R(-5, -10, 4, 10, col); R(1, -10, 4, 10, col);
      R(-4, -74 + b, 8, 12, col); R(-6, -63 + b, 12, 2, col);
      if (hat === 'top') { R(-4, -86 + b, 8, 12, col); R(-7, -75 + b, 14, 2, col); }
      else if (hat === 'bowler') { R(-4, -79 + b, 8, 5, col); R(-6, -75 + b, 12, 2, col); }
      if (Math.sin(now / 110 + seed * 3) > -0.85) { R(-2, -69 + b, 1, 1, '#d8d8c0'); R(1, -69 + b, 1, 1, '#d8d8c0'); }
    }, [x - ox * s, y - oy * s, s], a);
  }
  /* показ места HD целиком: дальний план, живое, персонажи, передний план, тьма, огни */
  function locPrep(id, L) {
    L.b = P.locBack(id); L.f = P.locFront(id);
    const Lc = P.loc[id];
    L.dark = P.into(P.mkL(), function () {
      const c = G(); c.fillStyle = 'rgba(2,3,6,' + Lc.dark + ')'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'destination-out';
      Lc.lights.forEach(function (l) { const q = c.createRadialGradient(l[0], l[1], 0, l[0], l[1], l[2]); q.addColorStop(0, 'rgba(0,0,0,1)'); q.addColorStop(0.45, 'rgba(0,0,0,0.55)'); q.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = q; c.fillRect(l[0] - l[2], l[1] - l[2], l[2] * 2, l[2] * 2); });
      c.globalCompositeOperation = 'source-over';
    });
  }
  /* o.back — поверх дальнего плана; o.mid — персонажи; o.front — поверх переднего плана, под тьмой; o.after — поверх всего */
  function locDraw(id, now, L, o) {
    const c = G(), Lc = P.loc[id]; o = o || {};
    c.drawImage(L.b, 0, 0, W, H);
    if (o.back) o.back();
    if (Lc.dyn) Lc.dyn(now);
    if (o.mid) o.mid();
    c.drawImage(L.f, 0, 0, W, H);
    if (Lc.fdyn) Lc.fdyn(now);
    if (o.front) o.front();
    c.drawImage(L.dark, 0, 0, W, H);
    if (Lc.top) Lc.top(now);
    if (o.after) o.after();
  }

  /* ============================================================
     РЕГИСТРАЦИЯ
     ============================================================ */
  P.loc.lavka_night = roomLoc('night'); P.loc.lavka_dawn = roomLoc('dawn'); P.loc.lavka_day = roomLoc('day');
  P.loc.lavka_dawn_doll = roomLoc('dawn', { doll: true });
  P.loc.facade_night = facadeLoc('night'); P.loc.facade_dawn = facadeLoc('dawn'); P.loc.facade_day = facadeLoc('day');
  P.loc.facade_day_nosign = facadeLoc('day', { sign: null });
  return { LV: LV, reset: resetLV, npc: npc, hero: heroWalk, matvey: matveyPx, hollow: hollowPx, pixels: pixels, signBoard: signBoard, signText: signText, prep: locPrep, draw: locDraw, MIR: MIR, CLK: CLK, WIN: WIN, CY: CY, SHELF: SHELF };
})();
