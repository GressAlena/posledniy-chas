'use strict';
/* Отладка (в обычной игре не загружается).
   ?t=auto[&s=rand|honest|greedy][&d=easy|normal|hard][&town=1][&audio=1][&scr=0] — бот проходит игру целиком;
   ?t=title|diff|hub|cust|sale|loc|list|story|scream|dawn|letter|end|shop — быстрые переходы для скриншотов. */
(function () {
  const q = new URLSearchParams(location.search), mode = q.get('t');
  const out = document.createElement('pre'); out.id = 'devlog'; out.style.display = 'none'; document.body.appendChild(out);
  const log = function (s) { out.textContent += s + '\n'; };
  window.addEventListener('error', function (e) { log('ERROR ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
  window.addEventListener('unhandledrejection', function (e) { log('REJECT ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)); });
  const strat = q.get('s') || 'rand', diff = q.get('d') || 'normal', useTown = q.get('town') === '1';
  function clickBtn(b) { if (b && !b.disabled) { b.click(); return true; } return false; }
  function newLog() { return { spent: 0, earned: 0, profit: 0, sanityLost: 0, deals: 0 }; }
  const rnd = Math.random;

  let hubNight = 0, hubStep = 0, hubN = 0, listN = 0, curSale = null, ss = null, visited = {};
  function hubTick() {
    if (hubNight !== G.night) { hubNight = G.night; hubStep = 0; hubN = 0; }
    hubN++;
    if (hubStep === 0) {                                   // закупка у Яши
      if (hubTab !== 'yasha') { hubTab = 'yasha'; renderHub(); return; }
      const bs = Array.from(document.querySelectorAll('.hub-main [data-act=buy]:not([disabled])'));
      if (bs.length && Econ.room(G) > 3 && G.money > 70 && hubN < 12) { bs[0].click(); return; }
      if (G.sanity < 50 && G.money > 40 && G.tea < 1) { const t = document.querySelector('[data-act=cons][data-id=tea]:not([disabled])'); if (t) { t.click(); return; } }
      hubStep = 1; hubN = 0; return;
    }
    if (hubStep === 1) {                                   // прогулки по городу: выйти на улицу
      if (useTown && G.hours > 0 && hubN < 6) {
        const b = document.querySelector('[data-act=street]');
        if (b) { log('  street'); b.click(); return; }
      }
      hubStep = 1.5; hubN = 0; roomI = 0; return;
    }
    if (hubStep === 1.5) {                                 // оглядеться в лавке: тайник дяди
      if (q.get('room') !== '0' && roomI === 0) { const b = document.querySelector('[data-act=room]'); if (b) { log('  room'); b.click(); roomI = 1; return; } }
      hubStep = 2; hubN = 0; return;
    }
    if (hubStep === 2) {                                   // верстак
      if (hubTab !== 'bench') { hubTab = 'bench'; renderHub(); return; }
      const c = document.querySelector('.hub-main [data-act=craft]:not([disabled]), .hub-main [data-act=repair]:not([disabled])');
      if (c && hubN < 8) { log('  bench ' + (c.dataset.id || 'repair')); c.click(); return; }
      hubStep = 3; hubN = 0; return;
    }
    if (hubStep === 3) {                                   // раскладка: через интерфейс
      if (hubTab !== 'shop') { hubTab = 'shop'; renderHub(); return; }
      if (G.shelf.length < G.slots && G.store.length && hubN < 30) {
        const it = G.store.find(function (x) { return !(x.stolen && G.night % 2 === 0); });
        if (it) {
          const tile = document.querySelector('.hub-main .tile[data-uid="' + it.uid + '"]');
          if (tile) { tile.click(); const again = document.querySelector('.hub-main .tile[data-uid="' + it.uid + '"]'); if (again) again.click(); return; }
        }
      }
      hubStep = 4; return;
    }
    if (G.sanity < 50 && G.tea > 0) drinkTea();
    if (G.sanity < 45 && G.inv && G.inv.stub) { log('  stub'); Quest.ITEMS.stub.useSelf(); }
    const due = Econ.dueNow(G);
    if (due > 0 && G.money >= due + 20) Econ.payDebt(G, due);
    if (G.debt > 0 && G.money > 420) Econ.payDebt(G, G.money - 300);
    log('N' + G.night + ' start money=' + G.money + ' debt=' + G.debt + ' san=' + G.sanity + '/' + G.maxSanity + ' shelf=' + G.shelf.length + ' store=' + G.store.length + ' marks=' + G.marks + ' rep=' + G.rep + ' bell=' + G.bell + ' rec=' + Object.keys(G.recipes).length);
    hubTab = 'news'; renderHub();
    clickBtn(document.querySelector('[data-act=open]'));
  }
  let stN = 0, pokeN = 0, pokeNight = 0, roomI = 0;
  const QORDER = ['window', 'poster', 'pump', 'pletter', 'belfry', 'shovel', 'graves', 'net', 'cat', 'well', 'sentry', 'gates', 'izba'];
  const RORDER = ['cal', 'pot', 'drawer', 'abacus', 'clock', 'photo', 'peel', 'cert', 'bell'];
  function roomTick() {                                     // в лавке: пройти по вещам по порядку, потом обратно к делам
    if (Room.busy()) return;
    if (roomI >= 1 && roomI <= RORDER.length) { const id = RORDER[roomI - 1]; roomI++; log('  rlook ' + id); Room.poke(id); return; }
    roomI = 99; log('  room done ' + JSON.stringify(G.room)); Room.exit();
  }
  function streetTick() {                                   // на улице: рассмотреть, что блестит, зайти в места, потом домой
    if (Street.busy() || !Street.active()) return;
    if (pokeNight !== G.night) { pokeNight = G.night; pokeN = 0; }
    if (q.get('quest') !== '0' && pokeN < 10) {
      const qq = Quest.Q();
      for (let i = 0; i < QORDER.length; i++) {
        const id = QORDER[i], h = Quest.HB[id];
        if (!Street.hotOk(id) || !(!G.seenHot[id] || (h.hint && h.hint(qq)))) continue;
        pokeN++; log('  look ' + id); Street.poke(id); return;
      }
    }
    if (G.hours > 0 && stN++ < 8) {
      const ids = LOCS.filter(function (l) { return G.night >= l.from; }).map(function (l) { return l.id; });
      const fresh = ids.filter(function (id) { return !visited[id]; }), pool = fresh.length ? fresh : ids;
      const id = pool[Math.floor(rnd() * pool.length)];
      if (rnd() < 0.3) Street.map();
      visited[id] = (visited[id] || 0) + 1; log('  go ' + id);
      if (!Street.visit(id)) log('  visit refused ' + id);
      return;
    }
    stN = 0; hubStep = 1.5; hubN = 0; roomI = 0; log('  home');
    Street.exit(false);
  }
  function saleTick() {
    if (curSale !== sale) { curSale = sale; ss = { tried: {}, rounds: 0, level: false }; }
    const cnt = document.querySelector('#sale .cnt');
    if (cnt) { cnt.click(); return; }
    const rej = sale.table.find(function (r) { return r.why; });
    if (rej && ss.rounds >= 2) { const ic = document.querySelector('#sale .trow .ico[data-uid="' + rej.it.uid + '"]'); ss.tried[rej.it.uid] = 1; if (ic) { ic.click(); return; } }
    if (sale.table.length < G.tableSlots && !ss.filled) {
      const tiles = Array.from(document.querySelectorAll('#sale .s-shelf .tile')).filter(function (t) { return !ss.tried[t.dataset.uid]; });
      const best = tiles.filter(function (t) { return t.classList.contains('w1'); }).concat(tiles.filter(function (t) { return t.classList.contains('w2'); }));
      const t = best[0] || (ss.rounds === 0 && rnd() < 0.5 ? tiles[0] : null);
      if (t) { ss.tried[t.dataset.uid] = 1; t.click(); return; }
    }
    ss.filled = true;
    if (!sale.table.length || ss.rounds >= 3) { document.querySelector('#sale [data-act=end]').click(); return; }
    if (!ss.level) {
      ss.level = true;
      const want = ss.rounds === 0 ? (strat === 'rand' ? ['0.2', '0', '-0.1', '0.35'][Math.floor(rnd() * 4)] : '0.1') : ss.rounds === 1 ? '0' : '-0.1';
      const lb = document.querySelector('#sale [data-act=level][data-l="' + want + '"]');
      if (lb) { lb.click(); return; }
    }
    if (rnd() < 0.15) { const up = document.querySelector('#sale [data-act=up]'); if (up) up.click(); }
    ss.rounds++; ss.level = false; ss.filled = false;
    document.querySelector('#sale [data-act=offer]').click();
  }

  function tick() {
    try {
      if (!document.getElementById('modal').classList.contains('hidden')) { closeModal(); return; }
      if (document.querySelector('.diff')) { clickBtn(document.querySelector('[data-d=' + diff + ']')); return; }
      if (phase === 'title') { clickBtn(document.querySelector('[data-act=new]')); return; }
      if (phase === 'street' && bottomMode !== 'dlg' && document.getElementById('screen').classList.contains('hidden')) { streetTick(); return; }
      if (Room.active() && bottomMode !== 'dlg' && document.getElementById('screen').classList.contains('hidden') && !A.vision) { roomTick(); return; }
      const sc = document.getElementById('screen');
      if (!sc.classList.contains('hidden')) {
        if (document.querySelector('.diff')) { clickBtn(document.querySelector('[data-d=' + diff + ']')); return; }
        if (document.querySelector('.slides')) { sc.click(); return; }
        if (document.querySelector('.tl')) {
          const acts = Array.from(document.querySelectorAll('.tl-body button:not([disabled])'));
          if (acts.length && listN++ < 3 && G.money > 60) { acts[Math.floor(rnd() * acts.length)].click(); return; }
          listN = 0; document.querySelector('.tl [data-act=back]').click(); return;
        }
        if (document.querySelector('.hub')) { hubTick(); return; }
        const go = document.querySelector('#screen [data-act=go]'); if (go) { go.click(); return; }
        const menu = document.querySelector('#screen [data-act=menu]');
        if (menu && !window.__done) {
          window.__done = true;
          log('ENDING ' + document.querySelector('.ending h1').textContent + ' night=' + G.night + ' money=' + G.money + ' debt=' + G.debt + ' paid=' + G.paid + ' san=' + G.sanity + ' marks=' + G.marks +
            ' crafted=' + G.stats.crafted + ' sold=' + G.stats.sold + ' key=' + JSON.stringify(G.key) + ' visited=' + JSON.stringify(visited) +
            ' quest=' + JSON.stringify(G.quest || {}) + ' inv=' + Object.keys(G.inv || {}).join(','));
          document.title = 'DONE';
        }
        return;
      }
      if (bottomMode === 'dlg') {
        const all = Array.from(document.querySelectorAll('#dlg-choices button:not([disabled])'));
        if (all.length) {
          const txt = all.map(function (b) { return b.textContent; });
          let idx = all.map(function (b, i) { return i; }).filter(function (i) {
            return !all[i].classList.contains('seen') && (q.get('ferry') === '1' || !/Уплыть|Сесть в лодку|Оттолкнуться/.test(txt[i]));
          });
          if (!idx.length) idx = [all.length - 1];
          let pickI = idx[Math.floor(rnd() * idx.length)];
          const cu = A.customer;
          if (strat !== 'rand') {
            const refuseI = txt.findIndex(function (t) { return /Выставить за дверь/.test(t); });
            if (refuseI >= 0) pickI = (cu && cu.hollow && strat === 'honest') ? refuseI : 0;
            const bolt = txt.findIndex(function (t) { return /Задвинуть засов/.test(t); });
            if (bolt >= 0) pickI = strat === 'honest' ? bolt : 1;
            if (strat === 'honest') {
              ['Отклеить', 'Сложить обрывки', 'Расковырять', 'Отпереть ящик', 'Вытянуть конверт', 'Попробовать ключ', 'Взять лопату', 'Копать', 'Положить на прилавок квитанцию', 'Савелий Фомич', 'У меня ничего нет',
                'Взять шкатулку', 'Отдать медальон даром', 'Он не продаётся', 'Она не моя', 'Зовите меня хозяином', 'Заходил один', 'Открыть шкатулку', 'Отдать краденое', 'Отдать заказ', 'Он останется здесь', 'Он не мой', 'Нисколько. Даром', 'Положить медальон', 'Положить 50', 'Молчать'].forEach(function (k) {
                const j = txt.findIndex(function (t) { return t.indexOf(k) >= 0; }); if (j >= 0) pickI = j;
              });
              const pay = txt.findIndex(function (t) { return /^1Отдать \d+$/.test(t); }); if (pay >= 0) pickI = pay;
            }
          }
          all[pickI].click(); return;
        }
        advance(); return;
      }
      if (bottomMode === 'trade' && tp) {
        const d = tp.deal, r = rnd();
        if (tp.item && !tp.item.known.exact && G.insp > 0 && r < 0.3) { tradeAct('inspect'); return; }
        if (tp.item && tp.item.known.fake) { tradeAct('refuse'); return; }
        const est = tp.item ? Econ.estimate(G, tp.item).mid : 110;
        if (d.ask <= est * 0.62 && d.ask <= G.money) { tradeAct('accept'); return; }
        if (d.patience <= 1 || d.ask > G.money * 3) { tradeAct(d.ask <= est * 0.8 && d.ask <= G.money ? 'accept' : 'refuse'); return; }
        setTradePrice(Math.min(G.money, Math.round(Math.min(d.ask * 0.6, est * 0.45) + (d.maxPatience - d.patience) * est * 0.08))); tradeAct('offer'); return;
      }
      if (bottomMode === 'sale' && sale) { saleTick(); return; }
    } catch (e) { log('BOT ' + (e.stack || e.message)); }
  }

  function seed() {
    try { localStorage.removeItem('lasthour.save.v2'); } catch (e) {}
    G = Econ.newGame(diff); G.flags.yasha = true; G.flags.tongueAsked = true; G.flags.yashaLast = true;
    G.night = +(q.get('n') || 2); Econ.prepareDay(G, false);
    for (let i = 0; i < 9; i++) {
      const it = Econ.makeItem(G, ITEMS[(i * 7 + 3) % 31].id, {}); it.cost = 30;
      if (i === 1) { it.cursed = true; it.known.cursed = true; }
      if (i === 4) { it.stolen = true; it.known.stolen = true; }
      Econ.addItem(G, it, i >= 6 ? 'store' : 'shelf');
    }
    ['cough', 'wormwood', 'lamp'].forEach(function (id) { const it = Econ.makeItem(G, id, { cond: 1 }); it.known = { exact: true }; Econ.addItem(G, it, 'store'); });
    G.tea = 2; G.salt = 1; G.kit = 1; G.candle = 2; G.upg.scales = true; G.upg.loupe = true;
    G.key.box = 'have'; G.key.tongue = 'have'; G.bell = 75; G.flags.metTasya = true; G.flags.knowLaws = true;
    G.recipes.sleepdrops = true; G.recipes.candle = true;
    if (q.get('san')) G.sanity = +q.get('san');
    if (q.get('bell')) G.bell = +q.get('bell');
    if (q.get('money')) G.money = +q.get('money');
    if (q.get('marks')) G.marks = +q.get('marks');
    if (q.get('lamp') === '1') G.flags.gradovLamp = true;
    if (q.get('box')) G.key.box = q.get('box');
    if (q.get('decoy') === '1') G.key.decoy = 'have';
    if (q.get('ticket')) { G.quest = { window: 1, poster: 1, key: 1, notebook: q.get('ticket') !== 'nonb' ? 1 : 0, ticket: 1 }; G.inv = { ticket: true }; if (G.quest.notebook) G.inv.notebook = true; }
  }
  function enterNight() {
    hideScreen(); phase = 'night'; nightEv = { screams: 0, knock: false };
    G.log = newLog(); G.soldFakes = []; G.guilt = []; G.insp = 4;
    A.mode = 'shop'; A.loc = null; A.minutes = 23 * 60 + 10; hud();
  }

  if (q.get('hover')) setTimeout(function () {
    const el = document.querySelector(q.get('hover')); if (!el) return log('HOVER: no element');
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
  }, +(q.get('hat') || 2500));
  if (q.get('audio') === '1') {
    try {
      Sfx.init(); Sfx.setVolume(0.5); Sfx.startAmbient();
      ['bell', 'door', 'coin', 'click', 'deny', 'page', 'knock', 'scratch', 'thud', 'whisper', 'sting', 'scream', 'sip', 'salt', 'dawn', 'good', 'glass', 'bang', 'shriek', 'growl', 'staticN', 'match', 'bigBell'].forEach(function (k) {
        try { Sfx[k](); } catch (e) { log('SFX ' + k + ': ' + e.message); }
      });
      Sfx.blip(300); Sfx.chime(3); Sfx.setTension(0.9); Sfx.ticking(true); Sfx.drone(true); Sfx.bell(true, true);
      setTimeout(function () { try { Sfx.drone(false); Sfx.setTension(0.2); Sfx.stopAmbient(); Sfx.startAmbient(); log('SFX OK'); } catch (e) { log('SFX2 ' + e.message); } }, 300);
    } catch (e) { log('SFXINIT ' + e.message); }
  }
  if (mode === 'auto') {
    TS = 0.01; SET.screamers = q.get('scr') !== '0'; window.__autoPuzzle = true;
    if (q.get('hd') !== '1') window.__noHD = true;   // HD-кисть в программном рендере очень медленная; &hd=1 — проверить и её
    try { localStorage.removeItem('lasthour.save.v2'); } catch (e) {}
    setInterval(tick, 8);
  } else if (mode === 'title') {
    /* просто титульный экран */
  } else if (mode === 'diff') {
    chooseDiff();
  } else if (mode === 'scream') {
    A.mode = 'shop'; hideScreen(); game.classList.add('scream');
    const type = q.get('type') || 'hollow', K = SCARES[type] || SCARES.hollow, at = +(q.get('p') || 0.45);
    setInterval(function () { A.screamer = { type: type, kind: K.kind, t0: performance.now() - at * K.dur, dur: K.dur }; }, 4);
  } else if (mode === 'vision') {
    // ?t=vision&id=grave&ms=7800[&soft=1][&n=3] — кадр видения в момент ms
    TS = 0.02; seed();
    evening().then(function () {
      enterNight(); hideScreen(); A.mode = 'shop'; game.classList.add('vision'); TS = 1;
      const id = q.get('id') || 'grave', ms = +(q.get('ms') || 3000);
      const icon = ITEM_BY_ID[G.shelf[0].id].icon;
      setInterval(function () { A.vision = { id: id, t0: performance.now() - ms, k: 1, soft: q.get('soft') === '1', o: { icon: icon, stage: +(q.get('stage') || 2) } }; }, 4);
    });
  } else if (mode === 'filmplay') {
    // ?t=filmplay&id=intro[&hold=1][&esc=ms] — заставка «вживую»: каждые 400 мс жмётся пробел, в журнал — номер плана
    TS = 0.02; seed(); if (q.get('lite')) window.__filmLite = true;
    evening().then(function () {
      hideScreen(); TS = 1; window.__autoPuzzle = false;
      const drive = setInterval(function () { Art.render(performance.now()); }, +(q.get('fi') || 16));
      const press = setInterval(function () { document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); log('FILM ' + JSON.stringify(Film.state())); }, 400);
      if (q.get('esc')) setTimeout(function () { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); log('FILM esc'); }, +q.get('esc'));
      Film.play(q.get('id') || 'intro', { hold: q.get('hold') === '1' }).then(function (sk) { log('FILM DONE skipped=' + sk + ' state=' + JSON.stringify(Film.state()) + ' screen=' + document.getElementById('screen').className); clearInterval(press); setTimeout(function () { clearInterval(drive); }, 500); });
    });
  } else if (mode === 'filmperf') {
    // ?t=filmperf[&ids=intro,bell] — сколько мс рисуется кадр каждого плана (и нет ли ошибок)
    TS = 0.02; seed();
    evening().then(function () {
      hideScreen(); TS = 1;
      const ids = (q.get('ids') || 'intro,bell,dawn,keeper,keeper2,creditor,pawn,mad,shadow,ferry').split(',');
      ids.forEach(function (id) {
        for (let i = 0; i < 9; i++) {
          Film.dev(id, i, +(q.get('ms') || 4000));
          const errs = [], ce = console.error; console.error = function (e) { errs.push(String(e && e.stack || e)); };
          const hx = document.getElementById('hd').getContext('2d'), flush = function () { hx.getImageData(0, 0, 1, 1); };
          let t0 = performance.now();
          HD.render(performance.now(), Art.S); flush(); const first = performance.now() - t0;
          t0 = performance.now(); HD.render(performance.now(), Art.S); flush(); HD.render(performance.now(), Art.S); flush();
          log('PERF ' + id + ' ' + i + ' first=' + first.toFixed(0) + ' next=' + ((performance.now() - t0) / 2).toFixed(0) + (errs.length ? ' ERR ' + errs[0].slice(0, 300) : ''));
          console.error = ce;
          if (id === 'intro' ? i >= 7 : i >= 3) break;
        }
      });
      Film.stop(); log('PERF done');
    });
  } else if (mode === 'film') {
    // ?t=film&id=intro|bell|dawn|…&shot=0&ms=4000 — застывший кадр видеозаставки
    TS = 0.02; seed(); if (q.get('noblur')) window.__noBlur = true;
    evening().then(function () {
      hideScreen(); TS = 1; showHud(false); hideBottom();
      Film.dev(q.get('id') || 'intro', +(q.get('shot') || 0), +(q.get('ms') || 4000));
      // &clean=1 — без титров и кнопок (для скриншотов на страницу игры)
      if (q.get('clean')) { const st = document.createElement('style'); st.textContent = '.film-ui,.film-cap,.film-hint,.film-skip{display:none!important}'; document.head.appendChild(st); }
    });
  } else if (mode === 'room') {
    // ?t=room[&poke=cal][&hover=x,y] — осмотр лавки вечером
    TS = 0.02; seed();
    evening().then(function () {
      if (q.get('rm')) { G.room = JSON.parse(q.get('rm')); }
      Room.enter(); TS = 1;
      if (q.get('poke')) setTimeout(function () { Room.poke(q.get('poke'), q.get('item') || null); }, 300);
      if (q.get('mx')) setTimeout(function () {
        const sc = document.getElementById('scene'), r = sc.getBoundingClientRect();
        sc.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.left + (+q.get('mx')) / 384 * r.width, clientY: r.top + (+q.get('my')) / 216 * r.height }));
      }, 400);
      if (q.get('pockets') === '1') setTimeout(function () { Pockets.open(Room.ctx()); }, 500);
      const adv = +(q.get('adv') || 0); let k = 0;
      if (adv) { const t = setInterval(function () { if (k++ >= adv) { clearInterval(t); return; } advance(); }, 300); }
    });
  } else if (mode === 'puzzle') {
    TS = 0.02; seed();
    evening().then(function () {
      hideScreen(); TS = 1; const id = q.get('id') || 'clock';
      // real=1 — те же заголовки и подсказки, что в игре (для скриншотов); rot=0,1,2,… — свой разворот обрывков плаката
      const real = q.get('real'), rotQ = q.get('rot') ? q.get('rot').split(',').map(Number) : null;
      if (id === 'clock') Puzzles.clock({ title: 'Часы в резном футляре', text: real ? 'Ключ-стрелка входит в скважину и проворачивается. Стрелки освободились — их можно переставить. Дядя писал: «Наши должны стоять так же, как у Гофмана».' : 'Проверка', th: 2, tm: 45, h: +(q.get('h') || 9), m: +(q.get('m') || 10) });
      else if (id === 'lock') Puzzles.lock({ title: 'Железный ящичек дяди', text: real ? 'Четыре колеса с цифрами. На крышке, рукой дяди: «Шифр помнят счёты».' : 'Проверка', code: '3614' });
      else Puzzles.tiles({ title: 'Афишная тумба: «Розыск»', text: 'Кликни по обрывку, чтобы повернуть его.', w: 96, h: 120, paint: function () { Quest.__paint(); }, rot: q.get('solved') ? [3, 0, 0, 0, 0, 0, 0, 0, 0] : (rotQ || [2, 1, 3, 0, 2, 1, 3, 2, 1]) });
      // solved=1: последний поворот делаем «рукой», чтобы увидеть настоящий финал (сцепленный плакат и кнопку «Дальше»)
      if (id === 'tiles' && q.get('solved')) setTimeout(function () { const b = document.querySelector('.pz-tiles button'); if (b) b.click(); }, 300);
    });
  } else if (mode) {
    TS = 0.02; seed();
    if (mode === 'hub') evening().then(function () { hubTab = q.get('tab') || 'news'; if (q.get('sel')) invSel = G.shelf[1].uid; renderHub(); TS = 1; });
    else if (mode === 'cust' || mode === 'sale') {
      evening().then(function () {
        enterNight();
        const hollow = q.get('h') === '1';
        visitGeneric({ type: hollow ? 'hollow' : 'human', arch: q.get('a') || 'merchant', mode: mode === 'sale' ? 'buy' : 'sell', tells: (q.get('tells') || 'eyes,shadow,mirror,lamp,bell').split(',') });
        setTimeout(function () {
          TS = 1;
          if (q.get('stay') === '1') return;
          const c = document.querySelector('#dlg-choices button'); if (c) c.click();
          if (mode === 'sale') setTimeout(function () {
            Array.from(document.querySelectorAll('#sale .s-shelf .tile')).slice(0, 3).forEach(function () { const t = document.querySelector('#sale .s-shelf .tile.w1') || document.querySelector('#sale .s-shelf .tile'); if (t) t.click(); });
            if (q.get('offer') === '1') { const lb = document.querySelector('#sale [data-act=level][data-l="0.35"]'); if (lb) lb.click(); document.querySelector('#sale [data-act=offer]').click(); }
            else { const lb = document.querySelector('#sale [data-act=level][data-l="-0.1"]'); if (lb) lb.click(); }
          }, 300);
        }, 1200);
      });
    } else if (mode === 'loc') {
      evening().then(function () {
        hideScreen(); phase = 'town'; A.mode = 'loc'; A.loc = q.get('id') || 'market';
        Town[A.loc]().catch(function (e) { if (e instanceof Ending) ending(e.id); else log('TOWN ' + (e.stack || e)); });
        if (q.get('bot') === '1') { TS = 0.01; SET.screamers = false; setInterval(tick, 8); return; }
        const n = +(q.get('adv') || 3); let k = 0;
        const t = setInterval(function () { if (k++ >= n * 2) { clearInterval(t); TS = 1; return; } advance(); }, 300);
      });
    } else if (mode === 'street') {
      evening().then(function () {
        if (q.get('h') != null) G.hours = +q.get('h');
        G.map = { shop: true };
        if (q.get('known') === 'all') LOCS.forEach(function (l) { G.map[l.id] = true; });
        G.flags.h_street = q.get('hint') !== '1';
        if (q.get('hook') !== '1') G.day.stHook = true;
        if (q.get('san')) G.sanity = +q.get('san');
        syncScene();
        Street.enter(q.get('at') || 'shop');
        if (q.get('x')) Street.place(+q.get('x'), q.get('sid'));
        if (q.get('map') === '1') setTimeout(Street.map, 300);
        TS = 1;
        // имитация игрока: зажать клавишу, кликнуть по кадру, перейти по карте
        const key = function (type, code) { document.dispatchEvent(new KeyboardEvent(type, { code: code, key: code, bubbles: true })); };
        if (q.get('hold')) setTimeout(function () { key('keydown', q.get('hold')); setTimeout(function () { key('keyup', q.get('hold')); }, +(q.get('ht') || 1500)); }, 400);
        if (q.get('clickx')) setTimeout(function () {
          const sc = document.getElementById('scene'), r = sc.getBoundingClientRect();
          sc.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: r.left + (+q.get('clickx')) / 384 * r.width, clientY: r.top + (+(q.get('clicky') || 140)) / 216 * r.height }));
        }, 400);
        if (q.get('go')) setTimeout(function () {
          Street.map();
          setTimeout(function () { const b = document.querySelector('[data-go=' + q.get('go') + ']'); if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true })); else log('NO GO ' + q.get('go')); }, 300);
        }, 400);
        if (q.get('press')) setTimeout(function () { key('keydown', q.get('press')); key('keyup', q.get('press')); }, +(q.get('pt') || 3000));
        setInterval(function () { Street.update(performance.now()); }, 16);            // в headless rAF засыпает — двигаем время сами
        let fc = 0, cost = 0; const _r = Art.render;
        Art.render = function (t) { const t0 = performance.now(); _r(t); cost += performance.now() - t0; fc++; };
        setInterval(function () { log('fps=' + fc + ' ms/frame=' + (cost / Math.max(1, fc)).toFixed(1)); fc = 0; cost = 0; }, 1000);
        setInterval(function () { log('x=' + Math.round(Street.state.x) + ' cam=' + Math.round(Street.state.camX) + ' phase=' + phase + ' mode=' + A.mode + ' hours=' + G.hours + ' map=' + Object.keys(G.map || {}).join(',')); }, 1000);
      });
    } else if (mode === 'list') {
      evening().then(function () { hideScreen(); phase = 'town'; A.mode = 'loc'; A.loc = 'market'; marketBuy(); TS = 1; });
    } else if (mode === 'shop') {
      evening().then(function () { enterNight(); invSel = G.shelf[1].uid; openShop(); TS = 1; });
    } else if (mode === 'story') {
      evening().then(function () {
        enterNight();
        Story[q.get('id') || 'creditor1']().catch(function (e) { if (e instanceof Ending) ending(e.id); else log('STORY ' + (e.stack || e)); });
        if (q.get('bot') === '1') { TS = 0.01; SET.screamers = false; setInterval(tick, 8); return; }
        const n = +(q.get('adv') || 2); let k = 0;
        const t = setInterval(function () { if (k++ >= n * 2) { clearInterval(t); TS = 1; return; } advance(); }, 300);
      });
    } else if (mode === 'dawn') {
      evening().then(function () {
        enterNight(); G.log.earned = 340; G.log.spent = 120;
        G.guilt = [{ name: 'Фарфоровая кукла', knew: true }];
        dawn().catch(function (e) { log('DAWN ' + e.message); });
      });
    } else if (mode === 'letter') {
      evening().then(function () { hideScreen(); Story.letter(); });
    } else if (mode === 'end') { phase = 'night'; TS = q.get('watch') === '1' ? 1 : 0.01; SET.screamers = false; ending(q.get('id') || 'dawn'); }   // &watch=1 — ролик в обычном темпе
  }
})();
