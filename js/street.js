'use strict';
/* ============================================================
   УЛИЦЫ: прогулка по Мглову до темноты. Три улицы:
   Береговая (пристань, сыскное) — Сенная (часовщик, лавка, рынок) — Слободская
   (Агата, собор, кладбище). На концах улиц — переходы: лестница к реке, застава.
   ← → или A/D — идти, Shift — быстрее; клик по мостовой — идти туда,
   клик по зданию — подойти к его двери; E / Enter — войти; M — карта.
   Сама ходьба времени не тратит: час уходит, только когда заходишь внутрь.
   ============================================================ */
const Street = (function () {
  const SP = Art.street, STR = SP.streets, SIDS = SP.sids, PB = {};
  SIDS.forEach(function (sid) { STR[sid].places.forEach(function (p) { p.sid = sid; PB[p.id] = p; }); });
  // находки квеста размечены в старых координатах одной длинной улицы — разносим по улицам
  Quest.HOTS.forEach(function (h) {
    if (h.sid) return;
    const m = SP.remap(h.x), d = m.x - h.x;
    h.sid = m.sid; h.x = m.x; h.r = [h.r[0] + d, h.r[1], h.r[2] + d, h.r[3]];
  });
  const SHOP_INFO = { name: 'Ломбард «Последний час»', who: 'твоя лавка', desc: 'Вернуться за прилавок: Яша, верстак, витрина. Или сразу открыть лавку на ночь.' };
  const PORTAL = {
    bereg: { who: 'спуск к реке', desc: 'Гранитная лестница вниз, к реке: пакгаузы, трактир, сыскное, пристань.' },
    sennaya: { who: 'наверх, в город', desc: 'Сенная: часовщик, твоя лавка, рынок.' },
    sloboda: { who: 'за заставу', desc: 'Слобода: дом Агаты, собор, Вдовье кладбище.' }
  };
  const ST = { sid: 'sennaya', x: 829, dir: -1, ph: 0, mv: false, camX: 600, d: 0, wallL: null, wallR: null, ghost: null, hidden: false };
  let on = false, busy = false, keys = {}, target = null, goal = null, run2 = false, last = 0, pushT = 0;
  let near = null, hover = null, prevTab = 'news', bumpT = 0, mapOpen = false, ghostCool = 8, lastHalf = 0, ui = null, uiKey = '', selItem = null;

  const D = function () { return STR[ST.sid]; };
  const PL = function () { return D().places; };
  const info = function (id) {
    if (id === 'shop') return SHOP_INFO;
    const p = PB[id];
    if (p && p.portal) return { name: STR[p.portal].name, who: PORTAL[p.portal].who, desc: PORTAL[p.portal].desc };
    return LOC_BY_ID[id];
  };
  function streetOpen(sid) { return STR[sid].places.some(function (p) { return !p.portal && isOpen(p.id); }); }
  function isOpen(id) {
    if (id === 'shop') return true;
    const p = PB[id];
    if (p && p.portal) return streetOpen(p.portal);
    return !!LOC_BY_ID[id] && G.night >= LOC_BY_ID[id].from;
  }
  const known = function (id) { const p = PB[id]; return !!p && !p.portal && !!(G.map && G.map[id]) && isOpen(id); };
  const darkness = function () { return Math.max(0, Math.min(1, 1 - G.hours / B.hours)); };
  const minX = function () { return ST.wallL != null ? ST.wallL + 36 : 24; };
  const maxX = function () { return ST.wallR != null ? ST.wallR - 36 : D().W - 24; };
  const clampX = function (x) { return Math.max(minX(), Math.min(maxX(), x)); };
  function clampCam(c) {
    const W = D().W;
    const lo = Math.max(0, ST.wallL != null ? ST.wallL - 150 : 0), hi = Math.min(W - Art.W, (ST.wallR != null ? ST.wallR + 150 : W) - Art.W);
    return Math.max(lo, Math.min(Math.max(lo, hi), c));
  }
  /* туман стоит там, куда пока «не знаешь дороги»: за первым закрытым местом в каждую сторону */
  function wallsFor(sid, x) {
    const L = STR[sid].places;
    let wl = null, wr = STR[sid].right ? null : STR[sid].W - 66;                   // за слободой — поле и туман
    for (let i = L.length - 1; i >= 0; i--) if (L[i].door < x && !isOpen(L[i].id)) { wl = L[i].x1; break; }
    for (let i = 0; i < L.length; i++) if (L[i].door > x && !isOpen(L[i].id)) { wr = L[i].x0; break; }
    return [wl, wr];
  }
  function calcWalls() { const w = wallsFor(ST.sid, ST.x); ST.wallL = w[0]; ST.wallR = w[1]; }
  function areaName(x) { const a = D().areas; let n = a[0][1]; a.forEach(function (q) { if (x >= q[0]) n = q[1]; }); return n; }
  function hotAt(wx, y) {
    const L = PL();
    for (let i = 0; i < L.length; i++) {
      const p = L[i], h = p.hot;
      if (wx >= h[0] && wx <= h[2] && y >= h[1] && y <= h[3] && isOpen(p.id) && p.door > minX() - 30 && p.door < maxX() + 30) return p;
    }
    return null;
  }
  /* то, что можно рассмотреть (квест), важнее двери дома, на котором оно висит */
  function hotOk(h) { return h.sid === ST.sid && G.night >= h.from && (!h.when || h.when(Quest.Q())) && h.x > minX() - 40 && h.x < maxX() + 40; }
  function spotAt(wx, y) {
    for (let i = 0; i < Quest.HOTS.length; i++) {
      const h = Quest.HOTS[i], r = h.r;
      if (wx >= r[0] && wx <= r[2] && y >= r[1] && y <= r[3] && hotOk(h)) return { hot: h, name: h.name, x: (r[0] + r[2]) / 2, top: r[1] - 2 };
    }
    const p = hotAt(wx, y);
    return p ? { place: p, name: info(p.id).name + (p.portal ? (p.door < D().W / 2 ? ' ◂' : ' ▸') : ''), x: p.door, top: Math.max(20, p.hot[1] + 4) } : null;
  }

  /* ---------- интерфейс поверх улицы ---------- */
  function buildUI() {
    if (ui) return;
    ui = document.createElement('div'); ui.id = 'street-ui'; ui.className = 'hidden';
    ui.innerHTML =
      '<div class="st-top"><span class="st-street"></span><span class="st-area"></span><span class="st-hours"></span></div>' +
      '<div class="st-help">← → идти · Shift — быстрее · клик — идти или рассмотреть · <b>E</b> — войти · <b>M</b> — карта</div>' +
      '<div class="st-inv pk-bar hidden"></div><div class="st-sel hidden"></div>' +
      '<div class="st-btns"><button data-st="map">Карта <kbd>M</kbd></button><button data-st="home">В лавку</button></div>' +
      '<div class="st-edge l hidden" data-st="edge"></div><div class="st-edge r hidden" data-st="edge"></div>' +
      '<div class="st-label hidden"></div>' +
      '<div class="st-panel hidden"></div>' +
      '<div class="st-map hidden"></div>' +
      '<div class="st-fade"></div>';
    $('#game').appendChild(ui);
    ui.addEventListener('click', function (e) {
      const iv = e.target.closest('[data-inv]');
      if (iv && on && !busy) { e.stopPropagation(); hold(selItem === iv.dataset.inv ? null : iv.dataset.inv); Sfx.click(); return; }
      const b = e.target.closest('[data-st], [data-go]');
      if (!b || b.disabled || !on) return;
      e.stopPropagation();
      if (b.dataset.go) return travel(b.dataset.go);
      const a = b.dataset.st;
      if (a === 'map') { Sfx.page(); openMap(); }
      else if (a === 'mapclose') { Sfx.page(); closeMap(); }
      else if (a === 'home') exit(false);
      else if (a === 'enter') tryEnter(b.dataset.id);
      else if (a === 'night') { Sfx.click(); exit(true); }
      else if (a === 'pockets') Pockets.open({ hold: hold, run: scene });
      else if (a === 'edge' && b.dataset.id) { Sfx.click(); walkTo(b.dataset.id); }
    });
  }
  function q(s) { return ui.querySelector(s); }
  function showUI(v) { if (ui) ui.classList.toggle('hidden', !v); }
  function topHTML() {
    const h = G.hours;
    const an = areaName(ST.x);
    q('.st-street').textContent = D().name;
    q('.st-area').textContent = an === D().name ? '' : an;
    q('.st-street').classList.toggle('solo', an === D().name);
    q('.st-hours').innerHTML = (h > 0 ? 'до темноты ' : 'стемнело ') + '<b>' + '◆'.repeat(h) + '</b>' + '◇'.repeat(Math.max(0, B.hours - h));
  }
  function panel() {
    const el = q('.st-panel');
    const key = near ? near.id + '|' + G.hours : '';
    if (key === uiKey) return;
    uiKey = key;
    if (!near) { el.classList.add('hidden'); return; }
    const inf = info(near.id);
    let h = '<div class="sp-text"><div class="sp-name">' + inf.name + ' <span class="sp-who">· ' + inf.who + '</span></div><div class="sp-desc">' +
      (near.id !== 'shop' && !near.portal && G.hours <= 0 ? '<span class="sp-shut">Темно. Здесь уже на засове — пора открывать свою лавку.</span>' : inf.desc) + '</div></div>';
    if (near.id === 'shop') h += '<div class="sp-btns"><button data-st="enter" data-id="shop">Зайти <kbd>E</kbd></button><button class="primary" data-st="night">Открыть на ночь ▸</button></div>';
    else if (near.portal) h += '<div class="sp-btns"><button class="primary" data-st="enter" data-id="' + near.id + '">Пройти ' + (near.door < D().W / 2 ? '◂' : '▸') + ' <kbd>E</kbd></button></div>';
    else if (G.hours > 0) h += '<div class="sp-btns"><button class="primary" data-st="enter" data-id="' + near.id + '">Войти · 1 час <kbd>E</kbd></button></div>';
    el.innerHTML = h; el.classList.remove('hidden');
  }
  /* табличка над зданием, на которое смотришь, и указатели к местам за краем экрана */
  function labels() {
    const lb = q('.st-label'), p = hover || (near ? { name: info(near.id).name, x: near.door, top: Math.max(20, near.hot[1] + 4) } : null);
    if (p && !mapOpen && !busy) {
      const sx = p.x - ST.camX;
      const txt = selItem && hover && hover.hot ? Pockets.name(selItem) + ' → ' + p.name : p.name;
      if (lb.textContent !== txt) lb.textContent = txt;
      lb.classList.toggle('thing', !!(hover && hover.hot));
      lb.style.left = (sx / Art.W * 100) + '%'; lb.style.top = (Math.max(18, p.top) / Art.H * 100) + '%';
      lb.classList.remove('hidden');
    } else lb.classList.add('hidden');
    const c0 = ST.camX, c1 = ST.camX + Art.W;
    [['l', -1], ['r', 1]].forEach(function (sd) {
      const el = q('.st-edge.' + sd[0]);
      let best = null;
      PL().forEach(function (pp) {
        if (sd[1] < 0 ? pp.door >= c0 + 6 : pp.door <= c1 - 6) return;
        if (pp.door < minX() - 40 || pp.door > maxX() + 40) return;
        if (!best || Math.abs(pp.door - ST.x) < Math.abs(best.door - ST.x)) best = pp;
      });
      const fog = sd[1] < 0 ? (ST.wallL != null && ST.wallL > c0 - 200) : (ST.wallR != null && ST.wallR < c1 + 200);
      let h = '';
      if (best) {
        const steps = Math.max(1, Math.round(Math.abs(best.door - ST.x) / 20));
        const kn = known(best.id) || best.portal || best.id === 'shop', nm = kn ? info(best.id).name : '?';
        h = (sd[1] < 0 ? '◂ ' : '') + nm + (sd[1] > 0 ? ' ▸' : '') + '<small>' + (kn ? '' : 'ещё не на карте · ') + '≈ ' + steps + ' ' + plural(steps, 'шаг', 'шага', 'шагов') + '</small>';
        el.dataset.id = best.id;
      } else if (fog) { h = (sd[1] < 0 ? '◂ ' : '') + 'туман' + (sd[1] > 0 ? ' ▸' : '') + '<small>дороги ещё не знаешь</small>'; el.dataset.id = ''; }
      if (el.innerHTML !== h) el.innerHTML = h;
      el.classList.toggle('hidden', !h);
    });
  }

  /* карманы: найденные вещи; клик — взять в руку, потом клик по тому, к чему приложить */
  function hold(id) { selItem = id && Pockets.has(id) ? id : null; invHTML(); }
  function invHTML() {
    if (!ui || !G) return;
    if (selItem && !Pockets.has(selItem)) selItem = null;
    Pockets.fillBar(q('.st-inv'), selItem);
    const s = q('.st-sel');
    if (selItem) { s.innerHTML = 'В руке: <b>' + esc(Pockets.name(selItem)) + '</b> — кликни, к чему приложить · <i>Esc — убрать</i>'; s.classList.remove('hidden'); }
    else s.classList.add('hidden');
  }
  /* сцена на улице: героиня останавливается, всё остальное ждёт */
  async function scene(fn) {
    if (busy || !on) return;
    busy = true; keys = {}; target = null; goal = null; ST.mv = false; hover = null;
    showUI(false); hideTip();
    try { await fn(); } catch (e) { if (e instanceof Ending) { stop(); return ending(e.id); } console.error(e); }
    hideBottom(); busy = false;
    if (on) { showUI(true); uiKey = '-'; panel(); invHTML(); labels(); save(); }
  }
  function interact(h, item) {
    if (!h) return;
    const cx = (h.r[0] + h.r[2]) / 2;
    ST.dir = cx < ST.x - 3 ? -1 : cx > ST.x + 3 ? 1 : ST.dir;
    selItem = null;
    return scene(async function () {
      const qq = Quest.Q();
      if (item) { const f = h.use && h.use[item]; if (f) await f(qq); else await narr(pick(Quest.NOUSE)); }
      else await h.look(qq);
      G.seenHot[h.id] = true;
    });
  }
  function arrive() {
    target = null;
    const gl = goal; goal = null;
    if (!gl) return;
    if (gl.place && PB[gl.place]) ST.dir = PB[gl.place].door < ST.x ? -1 : ST.dir;
    if (gl.hot) interact(Quest.HB[gl.hot], gl.item);
  }

  /* ---------- вход и выход ---------- */
  function placeAt(sid, x, dir) {
    ST.sid = sid; ST.x = x; calcWalls(); ST.x = clampX(x);
    ST.dir = dir; ST.mv = false; ST.ghost = null;
    ST.camX = clampCam(ST.x - Art.W / 2);
    target = null; goal = null; keys = {};
    near = nearest(); uiKey = '-';
  }
  function enter(atId, o) {
    o = o || {};
    if (!G) return;
    if (phase === 'evening') prevTab = hubTab === 'town' ? 'news' : hubTab;
    G.map = G.map || {}; G.map.shop = true;
    phase = 'street'; on = true; busy = false; keys = {}; target = null; goal = null; mapOpen = false;
    hideScreen(); hideBottom(); closeModal(); hideTip();
    A.mode = 'street'; A.loc = null; A.customer = null; A.item = null; A.street = ST;
    const p = PB[atId] || PB.shop;
    placeAt(p.sid, p.door, p.id === 'shop' ? -1 : 1);
    ST.hidden = false;
    if (p.id === 'shop') ST.camX = clampCam(p.door - 229);
    ST.d = darkness();
    A.minutes = 20 * 60 - G.hours * 60; showHud(true); hud();
    buildUI(); uiKey = '-'; showUI(true);
    q('.st-map').classList.add('hidden'); q('.st-fade').classList.remove('on');
    last = performance.now();
    panel(); topHTML(); labels();
    Quest.Q(); selItem = null; syncQuest(); invHTML();
    if (!o.back) later(450, function () { if (on && !busy && !G.day.stHook) scene(Quest.hook); });
    hintOnce('street', 'Это Мглов. Ходи стрелками или кликом по улице; у двери — E. В конце улицы — переход на соседнюю. Места, где ты побывала, отмечаются на карте (M).');
    if (o.back && G.hours <= 0) later(600, function () { toast('Смеркается. Фонарщик прошёл, лавки в городе закрываются. Пора открывать свою.', 'hint'); });
  }
  function pause() { on = false; busy = true; keys = {}; target = null; ST.mv = false; showUI(false); }
  function stop() { pause(); busy = false; }
  function exit(night) {
    if (!on) return;
    stop();
    phase = 'evening'; A.mode = 'shop'; A.street = null;
    Sfx.door(0.6);
    hubTab = prevTab || 'news';
    if (night) return startNight();
    save(); renderHub();
  }
  async function tryEnter(id) {
    if (busy || !on) return;
    if (id === 'shop') return exit(false);
    if (!isOpen(id)) return;
    const p = PB[id];
    if (p && p.portal) return cross(p);
    if (G.hours <= 0) { Sfx.deny(); toast('Темно. Здесь уже на засове. Пора открывать свою лавку.'); return; }
    Sfx.click();
    await goTown(id);
  }
  /* переход на соседнюю улицу: лестница или застава */
  function cross(p) {
    if (busy) return;
    busy = true; keys = {};
    const f = q('.st-fade'); f.classList.add('on'); if (Sfx.step) Sfx.step(1); Sfx.page();
    setTimeout(function () {
      const from = ST.sid, back = STR[p.portal].places.find(function (pp) { return pp.portal === from; });
      const W2 = STR[p.portal].W, inward = back.door < W2 / 2 ? 1 : -1;
      placeAt(p.portal, back.door + inward * 34, inward);
      G.map = G.map || {}; G.map['@' + p.portal] = true;
      panel(); topHTML(); labels(); syncQuest();
      f.classList.remove('on'); busy = false;
      toast(STR[p.portal].name + '.', 'hint');
    }, 420 * Math.max(TS, 0.05));
  }
  function walkTo(id) {
    const p = PB[id]; if (!p || p.sid !== ST.sid) return;
    goal = { place: id }; target = clampX(p.door); run2 = Math.abs(target - ST.x) > 200;
  }
  /* быстрый переход по карте: знакомой дорогой, дворами */
  function travel(id) {
    if (!(known(id) || id === 'shop') || busy) return;
    closeMap(); busy = true;
    const f = q('.st-fade'); f.classList.add('on'); Sfx.page();
    setTimeout(function () {
      const p = PB[id];
      placeAt(p.sid, p.door, p.door < ST.x ? -1 : 1);
      panel(); topHTML(); labels(); syncQuest();
      f.classList.remove('on'); busy = false;
    }, 420 * Math.max(TS, 0.05));
  }
  function nearest() {
    let n = null;
    PL().forEach(function (p) { if (isOpen(p.id) && Math.abs(p.door - ST.x) < 24 && (!n || Math.abs(p.door - ST.x) < Math.abs(n.door - ST.x))) n = p; });
    return n;
  }
  function bumped(side) {
    // упёрлась в конец улицы у перехода — переходим
    const end = PL().find(function (p) { return p.portal && isOpen(p.id) && Math.abs(p.door - ST.x) < 40 && (p.door - D().W / 2) * side > 0; });
    if (end) { if (!pushT) pushT = performance.now(); else if (performance.now() - pushT > 350) { pushT = 0; cross(end); } return; }
    if (performance.now() - bumpT < 3500) return;
    bumpT = performance.now();
    if (side < 0 && ST.wallL == null && !D().left) return toast('Дальше — только вода. Перевозчик смотрит на тебя и молчит.');
    if (side > 0 && !D().right && ST.wallR >= D().W - 70) return toast('Дальше дорога уходит в поле и пропадает в тумане. Там Мглов кончается.');
    const L = PL(); let next = null;
    if (side < 0) { for (let i = L.length - 1; i >= 0; i--) if (L[i].door < ST.x && !isOpen(L[i].id)) { next = L[i]; break; } }
    else { for (let i = 0; i < L.length; i++) if (L[i].door > ST.x && !isOpen(L[i].id)) { next = L[i]; break; } }
    let n = 0;
    if (next && next.portal) STR[next.portal].places.forEach(function (pp) { if (!pp.portal && LOC_BY_ID[pp.id] && (!n || LOC_BY_ID[pp.id].from < n)) n = LOC_BY_ID[pp.id].from; });
    else if (next && LOC_BY_ID[next.id]) n = LOC_BY_ID[next.id].from;
    toast('Туман стоит стеной. Дальше дороги ты пока не знаешь' + (n ? ' — узнаешь к ' + (n === 2 ? 'второй' : 'третьей') + ' ночи.' : '.'));
  }

  /* что видно на улице из-за квеста: кто в окне, открыта ли колокольня, где искорки */
  function syncQuest() {
    const qq = Quest.Q();
    ST.winFig = Quest.winFig(); ST.belfryOpen = !!qq.notebook; ST.ropeStill = !!qq.notebook; ST.shovelGone = !!G.inv.shovel; ST.dug = !!qq.ticket;
    ST.glints = Quest.HOTS.filter(function (h) {
      return hotOk(h) && (!G.seenHot[h.id] || (h.hint && h.hint(qq))) && (h.id !== 'window' || ST.winFig);
    }).map(function (h) { return [(h.r[0] + h.r[2]) / 2, Math.round((h.r[1] + h.r[3]) / 2)]; });
  }

  /* ---------- каждый кадр ---------- */
  function update(now) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    if (!on || !G) return;
    syncQuest();
    ST.d += (darkness() - ST.d) * Math.min(1, dt * 2);
    if (busy || mapOpen || modalOpen() || phase !== 'street') { ST.mv = false; labels(); return; }
    let dir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    if (dir) { target = null; goal = null; }
    else if (target != null) {
      const dx = target - ST.x;
      if (Math.abs(dx) < 1.5) { ST.x = target; arrive(); if (busy) { ST.mv = false; return; } }
      else dir = dx > 0 ? 1 : -1;
    }
    const fast = keys.run || (target != null && run2);
    if (dir) {
      const sp = fast ? 120 : 62;
      let nx = ST.x + dir * sp * dt;
      if (target != null && (target - ST.x) * dir <= sp * dt) nx = target;
      const cl = clampX(nx);
      if (cl !== nx) { if (target == null) bumped(dir); target = null; goal = null; } else pushT = 0;
      ST.x = cl;
      ST.dir = dir; ST.mv = true;
      ST.ph = (ST.ph + dt * sp / 40) % 1;
      const half = Math.floor(ST.ph * 2);
      if (half !== lastHalf) { lastHalf = half; if (Sfx.step) Sfx.step(fast ? 1.2 : 0.9); }
    } else { ST.mv = false; pushT = 0; }
    // камера с мёртвой зоной, плавно
    let t = ST.camX;
    const sx = ST.x - t;
    if (sx < 130) t = ST.x - 130; else if (sx > 254) t = ST.x - 254;
    t = clampCam(t);
    ST.camX += (t - ST.camX) * Math.min(1, dt * 7);
    // двери, отметки на карте, тот, кто стоит под фонарём
    const n = nearest();
    near = n; panel();
    PL().forEach(function (p) {
      if (p.portal || !isOpen(p.id) || (G.map && G.map[p.id]) || Math.abs(p.door - ST.x) > 170) return;
      G.map[p.id] = true; Sfx.page();
      toast('На карте отмечено: ' + info(p.id).name + '.', 'good');
    });
    ghostTick(dt);
    topHTML(); labels();
  }
  function ghostTick(dt) {
    const gh = ST.ghost;
    if (ST.d < 0.95) { ST.ghost = null; return; }
    if (!gh) {
      ghostCool -= dt; if (ghostCool > 0) return;
      const ahead = D().lamps.filter(function (lx) { const dx = (lx - ST.x) * ST.dir; return dx > 150 && dx < 320 && lx > minX() && lx < maxX(); });
      if (!ahead.length) { ghostCool = 3; return; }
      ahead.sort(function (a, b) { return Math.abs(a - ST.x) - Math.abs(b - ST.x); });
      ST.ghost = { x: ahead[0] + 12, a: 0, out: false };
      return;
    }
    const dist = Math.abs(ST.x - gh.x);
    if (!gh.out) { gh.a = Math.min(0.9, gh.a + dt * 0.45); if (dist < 84) { gh.out = true; Sfx.whisper(); } if (dist > 520) { ST.ghost = null; ghostCool = 6; } }
    else { gh.a -= dt * 2.6; if (gh.a <= 0) { ST.ghost = null; ghostCool = 40; } }
  }

  /* ---------- карта: три улицы ---------- */
  const PATHS = {
    bereg: [[176, 486], [206, 430], [236, 372], [272, 330], [306, 300]],
    sennaya: [[318, 292], [420, 300], [520, 296], [620, 288], [694, 296]],
    sloboda: [[706, 292], [786, 266], [860, 236], [930, 204], [984, 176]]
  };
  function mp(sid, x) {                                       // точка улицы на плане
    const P = PATHS[sid], t = Math.max(0, Math.min(1, x / STR[sid].W)) * (P.length - 1), i = Math.min(P.length - 2, Math.floor(t)), f = t - i;
    return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f];
  }
  function nrm(sid, x) { const a = mp(sid, Math.max(0, x - 20)), b = mp(sid, Math.min(STR[sid].W, x + 20)), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }
  const MAPN = { river: 'Пристань', station: 'Сыскное', clock: 'Мастерская Гофмана', shop: 'Ломбард', market: 'Сенной рынок', agata: 'Дом Агаты', church: 'Собор', cemetery: 'Вдовье кладбище' };
  const ICONS = {
    river: '<path d="M0 -8 V8 M-7 3 Q0 11 7 3 M-4 -5 H4"/><circle cx="0" cy="-9" r="2"/>',
    station: '<path d="M-7 -8 H7 V0 Q7 7 0 10 Q-7 7 -7 0 Z"/><path d="M-3 -2 H3 M0 -5 V4"/>',
    clock: '<circle r="8"/><path d="M0 0 L4 -1 M0 0 L-6 0"/>',
    shop: '<circle cx="-5" cy="-3" r="3.3"/><circle cx="5" cy="-3" r="3.3"/><circle cx="0" cy="5" r="3.3"/>',
    market: '<path d="M-9 -3 L-6 -8 H6 L9 -3 M-9 -3 Q-6 0 -3 -3 Q0 0 3 -3 Q6 0 9 -3 M-7 -1 V8 M7 -1 V8"/>',
    agata: '<path d="M0 9 V-2 M0 2 Q-7 0 -6 -7 Q0 -6 0 2 M0 -1 Q7 -3 6 -9 Q0 -8 0 -1"/>',
    church: '<path d="M-6 9 V0 H6 V9 M-5 0 Q-7 -5 0 -9 Q7 -5 5 0 M0 -9 V-14 M-2 -12 H2"/>',
    cemetery: '<path d="M0 -10 V10 M-6 -4 H6 M-3 -8 H3 M-4 6 L4 3"/>'
  };
  const ENTRY = { bereg: function () { return STR.bereg.places[2].door; }, sennaya: function () { return PB.shop.door; }, sloboda: function () { return STR.sloboda.places[0].door; } };
  function mapHTML() {
    let s = '<svg viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg"><defs>' +
      '<pattern id="hat" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="6" stroke="#6a5634" stroke-width="1.1" opacity=".55"/></pattern>' +
      '<pattern id="wav" width="22" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 Q5.5 1 11 5 T22 5" fill="none" stroke="#4a5a5a" stroke-width="1" opacity=".55"/></pattern>' +
      '<pattern id="fld" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".9" fill="#6a5634" opacity=".5"/></pattern>' +
      '<filter id="fog" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter></defs>';
    // река и тот берег
    s += '<path d="M0 0 H150 C120 120 170 230 140 330 C112 420 150 520 136 600 H0 Z" fill="url(#wav)"/>' +
      '<path d="M150 0 C120 120 170 230 140 330 C112 420 150 520 136 600" fill="none" stroke="#3a2c1a" stroke-width="2"/>' +
      '<path d="M44 0 C24 140 74 260 40 360 C18 450 60 520 44 600" fill="none" stroke="#3a2c1a" stroke-width="1.2" stroke-dasharray="6 5" opacity=".6"/>' +
      '<text x="86" y="200" transform="rotate(-80 86 200)" class="mp-riv">р. Мгла</text><text x="12" y="580" class="mp-faint">тот берег</text>';
    // кварталы вдоль улиц
    SIDS.forEach(function (sid, si) {
      const Wd = STR[sid].W;
      for (let x = 60; x < Wd - 40; x += 120) {
        if (sid === 'sennaya' && x > 900 && x < 1300) continue;                     // площадь
        if (sid === 'sloboda' && x > 560) continue;
        [1, -1].forEach(function (sd) {
          if (sid === 'bereg' && sd < 0) return;                                     // со стороны реки домов нет
          const p = mp(sid, x), n = nrm(sid, x), d0 = 22, d1 = 70 + (x % 3) * 8;
          const q2 = mp(sid, x + 80);
          const pts = [[p[0] + n[0] * d0 * sd, p[1] + n[1] * d0 * sd], [q2[0] + n[0] * d0 * sd, q2[1] + n[1] * d0 * sd], [q2[0] + n[0] * d1 * sd, q2[1] + n[1] * d1 * sd], [p[0] + n[0] * d1 * sd, p[1] + n[1] * d1 * sd]];
          s += '<path d="M' + pts.map(function (pp) { return pp[0].toFixed(1) + ' ' + pp[1].toFixed(1); }).join(' L') + ' Z" fill="url(#hat)" stroke="#3a2c1a" stroke-width="1.1"/>';
        });
      }
    });
    const sq = mp('sennaya', 1120); s += '<ellipse cx="' + sq[0] + '" cy="' + (sq[1] - 70) + '" rx="44" ry="34" fill="none" stroke="#3a2c1a" stroke-dasharray="4 4"/><text x="' + sq[0] + '" y="' + (sq[1] - 66) + '" class="mp-faint" text-anchor="middle">Сенная пл.</text>';
    const cm = mp('sloboda', 1160); s += '<rect x="' + (cm[0] - 60) + '" y="' + (cm[1] + 26) + '" width="80" height="90" fill="none" stroke="#3a2c1a" stroke-width="1.4"/>';
    for (let k = 0; k < 12; k++) { const cx = cm[0] - 48 + (k % 4) * 17, cy = cm[1] + 42 + Math.floor(k / 4) * 26; s += '<path d="M' + cx + ' ' + (cy - 5) + ' v10 M' + (cx - 3) + ' ' + (cy - 2) + ' h6" stroke="#3a2c1a" stroke-width="1"/>'; }
    s += '<rect x="900" y="60" width="96" height="90" fill="url(#fld)"/><text x="948" y="54" class="mp-faint" text-anchor="middle">поле</text>';
    // улицы
    SIDS.forEach(function (sid) {
      let pth = ''; const Wd = STR[sid].W;
      for (let x = 0; x <= Wd; x += Wd / 30) { const p = mp(sid, x); pth += (x ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' '; }
      s += '<path d="' + pth + '" fill="none" stroke="#3a2c1a" stroke-width="15" stroke-linecap="round"/><path d="' + pth + '" fill="none" stroke="#d8c8a0" stroke-width="11" stroke-linecap="round"/>';
      const a = mp(sid, Wd * 0.42), b = mp(sid, Wd * 0.58), ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, m = mp(sid, Wd / 2), n = nrm(sid, Wd / 2), off = sid === 'bereg' ? -16 : 16;
      s += '<text x="' + (m[0] + n[0] * off).toFixed(1) + '" y="' + (m[1] + n[1] * off + 4).toFixed(1) + '" transform="rotate(' + ang.toFixed(1) + ' ' + (m[0] + n[0] * off).toFixed(1) + ' ' + (m[1] + n[1] * off + 4).toFixed(1) + ')" class="mp-st" text-anchor="middle">' + STR[sid].name + '</text>';
    });
    const pr = mp('bereg', 40); s += '<path d="M' + pr[0] + ' ' + pr[1] + ' L' + (pr[0] - 44) + ' ' + (pr[1] + 8) + '" stroke="#3a2c1a" stroke-width="6"/>';   // причал
    // туман там, куда дороги ещё не знаешь
    SIDS.forEach(function (sid) {
      const w = sid === ST.sid ? [ST.wallL, ST.wallR] : wallsFor(sid, ENTRY[sid]()), Wd = STR[sid].W, segs = [];
      if (!streetOpen(sid)) segs.push([0, Wd]);
      else { if (w[0] != null) segs.push([0, w[0]]); if (w[1] != null && STR[sid].right) segs.push([w[1], Wd]); }
      segs.forEach(function (f) {
        s += '<g filter="url(#fog)">';
        for (let x = f[0]; x <= f[1]; x += 70) { const p = mp(sid, x); s += '<ellipse cx="' + p[0].toFixed(0) + '" cy="' + p[1].toFixed(0) + '" rx="64" ry="54" fill="#ece4d0" opacity=".94"/>'; }
        s += '</g>';
        if (f[1] - f[0] < 250) return;
        const m = mp(sid, (f[0] + f[1]) / 2); s += '<text x="' + m[0].toFixed(0) + '" y="' + (m[1] - 26).toFixed(0) + '" class="mp-fog" text-anchor="middle">туман</text>';
      });
    });
    // места
    let k = 0;
    SIDS.forEach(function (sid) {
      STR[sid].places.forEach(function (p) {
        if (p.portal || !isOpen(p.id)) return;
        const pt = mp(sid, p.door), n = nrm(sid, p.door), up = (k++) % 2 === 1, mx = pt[0], my = pt[1];
        const lx = mx + n[0] * (up ? -34 : 40), ly = my + n[1] * (up ? -34 : 40) + 4;
        if (known(p.id) || p.id === 'shop') {
          s += '<g class="mp-pl" data-go="' + p.id + '"><circle cx="' + mx + '" cy="' + my + '" r="26" fill="transparent"/>' +
            '<circle cx="' + mx + '" cy="' + my + '" r="14" fill="#efe4c8" stroke="#3a2c1a" stroke-width="1.6"/>' +
            '<g transform="translate(' + mx + ' ' + my + ')" fill="none" stroke="#2a1e12" stroke-width="1.6">' + ICONS[p.id] + '</g>' +
            '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" class="mp-name" text-anchor="middle">' + MAPN[p.id] + '</text></g>';
        } else {
          s += '<circle cx="' + mx + '" cy="' + my + '" r="12" fill="#e4d8b8" stroke="#6a5634" stroke-dasharray="3 3"/><text x="' + mx + '" y="' + (my + 6) + '" class="mp-q" text-anchor="middle">?</text>' +
            '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" class="mp-faint" text-anchor="middle">не отмечено</text>';
        }
      });
    });
    // ты здесь
    const me = mp(ST.sid, ST.x), hx = me[0], hy = me[1];
    s += '<g class="mp-me"><path d="M' + hx + ' ' + (hy - 4) + ' l-6 -14 a7 7 0 1 1 12 0 Z" fill="#8a1e14" stroke="#3a0a06"/><circle cx="' + hx + '" cy="' + (hy - 22) + '" r="2.6" fill="#efe4c8"/></g>';
    // картуш и роза ветров
    s += '<g class="mp-title"><rect x="330" y="20" width="340" height="62" fill="#e8dcbc" stroke="#3a2c1a" stroke-width="1.4"/><rect x="335" y="25" width="330" height="52" fill="none" stroke="#3a2c1a" stroke-width=".8"/>' +
      '<text x="500" y="52" text-anchor="middle" class="mp-h">План города Мглова</text><text x="500" y="70" text-anchor="middle" class="mp-sub">снят на глаз; поправки — рукою М. Сорина</text></g>';
    s += '<g transform="translate(935 545)" stroke="#3a2c1a" fill="none"><circle r="22"/><path d="M0 -30 L5 0 L0 30 L-5 0 Z" fill="#3a2c1a"/><path d="M-30 0 L0 4 L30 0 L0 -4 Z"/></g><text x="935" y="508" text-anchor="middle" class="mp-faint">С</text>';
    s += '</svg>';
    return '<div class="mp-sheet">' + s + '<div class="mp-foot"><span class="mp-leg"><i></i>ты здесь</span><span>Клик по отмеченному месту — пройти туда знакомой дорогой. Дорога времени не отнимает: час уходит, только когда заходишь внутрь.</span><button data-st="mapclose">Закрыть <kbd>M</kbd></button></div></div>';
  }
  function openMap() {
    if (busy || !on) return;
    mapOpen = true; keys = {}; target = null;
    const m = q('.st-map'); m.innerHTML = mapHTML(); m.classList.remove('hidden');
    q('.st-panel').classList.add('hidden');
  }
  function closeMap() {
    mapOpen = false; if (!ui) return;
    q('.st-map').classList.add('hidden'); uiKey = '-'; panel();
  }

  /* ---------- управление ---------- */
  const KL = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ShiftLeft: 'run', ShiftRight: 'run' };
  document.addEventListener('keydown', function (e) {
    if (!on || phase !== 'street') return;
    if (mapOpen) { if (e.key === 'Escape' || e.code === 'KeyM') { e.preventDefault(); Sfx.page(); closeMap(); } return; }
    if (modalOpen() || busy) return;
    if (e.key === 'Escape' && selItem) { hold(null); return; }
    if (KL[e.code]) { keys[KL[e.code]] = true; e.preventDefault(); return; }
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); if (near) tryEnter(near.id); }
    else if (e.code === 'KeyM') { e.preventDefault(); Sfx.page(); openMap(); }
    else if (e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); Pockets.open({ hold: hold, run: scene }); }
  });
  document.addEventListener('keyup', function (e) { if (KL[e.code]) keys[KL[e.code]] = false; });
  window.addEventListener('blur', function () { keys = {}; });
  $('#scene').addEventListener('click', function (e) {
    if (!on || busy || mapOpen || phase !== 'street') return;
    const p = canvasPos(e), wx = ST.camX + p.x, s = spotAt(wx, p.y);
    if (selItem && !(s && s.hot)) hold(null);                                // клик мимо — вещь обратно в карман
    if (s && s.hot) { goal = { hot: s.hot.id, item: selItem }; target = clampX(s.hot.x); }
    else if (s) { goal = { place: s.place.id }; target = clampX(s.place.door); }
    else { goal = null; target = clampX(wx); }
    run2 = e.detail >= 2 || Math.abs(target - ST.x) > 220;
    if (Math.abs(target - ST.x) < 1.5) { ST.x = target; arrive(); }
  });
  $('#scene').addEventListener('mousemove', function (e) {
    if (!on) { hover = null; return; }
    const p = canvasPos(e);
    hover = busy ? null : spotAt(ST.camX + p.x, p.y);
    $('#scene').style.cursor = hover ? (hover.hot ? 'zoom-in' : 'pointer') : '';
  });
  $('#scene').addEventListener('mouseleave', function () { hover = null; });

  return {
    enter: enter, exit: exit, pause: pause, stop: stop, update: update, hold: hold,
    ctx: function () { return { hold: hold, run: scene }; },
    visit: function (id) {
      if (!on || busy) return false; const p = PB[id]; if (!p || !isOpen(id) || G.hours <= 0) return false;
      placeAt(p.sid, p.door, 1); tryEnter(id); return true;
    },
    poke: function (id, item) {
      const h = Quest.HB[id]; if (!on || busy || !h) return false;
      if (h.sid !== ST.sid) { const wl = wallsFor(h.sid, h.x); if ((wl[0] != null && h.x < wl[0]) || (wl[1] != null && h.x > wl[1]) || !streetOpen(h.sid)) return false; placeAt(h.sid, h.x, 1); }
      if (!hotOk(h)) return false;
      ST.x = clampX(h.x); interact(h, item); return true;
    },
    hotOk: function (id) {
      const h = Quest.HB[id]; if (!h || G.night < h.from || (h.when && !h.when(Quest.Q())) || !streetOpen(h.sid)) return false;
      const wl = h.sid === ST.sid ? [ST.wallL, ST.wallR] : wallsFor(h.sid, ENTRY[h.sid]());
      return !((wl[0] != null && h.x < wl[0] + 4) || (wl[1] != null && h.x > wl[1] - 4));
    },
    busy: function () { return busy; }, active: function () { return on; }, state: ST,
    place: function (x, sid) { if (sid && STR[sid]) placeAt(sid, x, 1); ST.x = clampX(x); ST.camX = clampCam(ST.x - Art.W / 2); },
    map: openMap, cross: function (sid) { const p = PL().find(function (pp) { return pp.portal === sid; }); if (p && isOpen(p.id)) cross(p); }
  };
})();
