'use strict';
/* ============================================================
   ЛАВКА ИЗНУТРИ: всё, что стоит и висит, можно рассмотреть.
   Вечером — «Оглядеться в лавке»: неспешный осмотр, находки, тайник дяди
   (календарь → герань → ящик прилавка → счёты → железный ящик → часы).
   Ночью клик по вещам даёт короткую заметку и не мешает торговле.
   ============================================================ */
const Room = (function () {
  let on = false, busy = false, hover = null, selItem = null, ui = null;
  const MIR = Art.api.MIR;
  function R0() { G.room = G.room || { cal: {} }; G.room.cal = G.room.cal || {}; return G.room; }
  function sync() {
    if (!G) return;
    const r = R0();
    A.room = { calDay: Math.min(7, G.night), calNote: !!r.cal[G.night], clockOpen: !!r.clockOpen, wallPeeled: !!r.peeled, potDug: !!r.potDug, drawerOpen: !!r.drawer, boxOpen: !!r.box };
  }
  /* карандашные пометки дяди — заранее, на листках будущих дней */
  const CAL = {
    1: ['1 ноября', '«Не отрывай. Пока я не вернусь. — М.» А сбоку, мелко, будто дописано позже: «Ключ — у той, что не цветёт».'],
    2: ['2 ноября', '«Часы врут. Наши должны стоять так же, как у Гофмана. Все. Всегда».'],
    3: ['3 ноября', '«Не смотри на фотографию долго. Он это чувствует».'],
    4: ['4 ноября', '«Счёты не трогай. Они помнят то, что я забуду».'],
    5: ['5 ноября', '«Пятая ночь. Дальше моих пометок нет. Дальше — твоя рука».'],
    6: ['6 ноября', 'Листок чистый. Только посередине — вмятина от карандаша, будто кто-то долго держал его у бумаги и так ничего и не написал.'],
    7: ['7 ноября', 'Красное число. Поверх него чужим, угловатым почерком: «Назови его». Чернила ещё влажные.']
  };
  const PHOTO = [
    'Старая фотография: лавка в день открытия. У двери — бородатый человек в армяке и девочка лет семи. Дверной проём за ними чёрный.',
    'В чёрном дверном проёме стоит человек в цилиндре. Вчера его там не было — в этом нет никаких сомнений.',
    'Человек в цилиндре стоит уже за спиной бородатого. Он больше не в проёме. Он вышел на свет.',
    'Его рука лежит на плече девочки. И он смотрит прямо в объектив. Прямо на тебя.'
  ];
  function photoStage() { const n = G.night; return n >= 7 ? 3 : n >= 5 ? 2 : n >= 3 ? 1 : 0; }

  async function n(t) { await narr(t); }
  const HS = [
    { id: 'pot', name: 'Засохшая герань', r: [60, 68, 77, 98],
      night: 'Герань засохла ещё при дяде. Поливать её некому — и незачем.',
      look: async function () {
        const r = R0();
        if (r.potDug) return n('Горшок с сухой геранью. Земля разворошена — здесь лежал ключик. На дне горшка до сих пор сыро.');
        await n('Герань засохла ещё при дяде. Стебли ломкие, как спички. Земля в горшке спеклась в камень.');
        const c = await ask('', r.cal[1] ? '«Ключ — у той, что не цветёт». Не цветёт здесь только она.' : 'Земля в горшке странно бугрится у самого края.', ['Расковырять землю', 'Оставить']);
        if (c !== 0) return;
        Sfx.dig();
        await n('Пальцы проламывают сухую корку. Под ней земля сырая и холодная — будто горшок стоял не на окне, а в погребе.');
        await n('В глубине — маленький латунный ключ на шнурке. Шнурок мокрый.');
        r.potDug = 1; Quest.give('drawerkey'); sync();
      } },
    { id: 'umbrella', name: 'Зонт на крючке', r: [1, 26, 9, 70],
      night: 'Дядин зонт. Мокрый. Хотя дядя умер в сухую неделю.',
      look: function () { return n('Дядин зонт. С него капает — тихо, ровно, на одну и ту же половицу. Дядя умер в сухую неделю. Половица под зонтом давно прогнила.'); } },
    { id: 'window', name: 'Окно на улицу', r: [12, 16, 92, 100],
      night: function () { return pick(['За окном туман. В тумане фонарь. Под фонарём — никого. Сейчас.', 'Стекло холодное и влажное с обеих сторон.', 'Туман так плотен, что кажется, будто улицу ещё не дорисовали.']); },
      look: function () { return n(G.hours > 0 ? 'За окном Сенная: мокрая мостовая, фонарщик с лестницей, афишная тумба. Отсюда видно, как туман подбирается к крыльцу — не спеша, как кот к блюдцу.' : 'За окном уже темно. Фонари горят через один. Туман лёг на мостовую и не дышит.'); } },
    { id: 'clock', name: 'Часы в резном футляре', r: [100, 9, 132, 92],
      night: function () { return 'На часах ' + timeStr(A.minutes) + '. ' + (A.minutes >= 27 * 60 ? 'Пора на засов.' : 'До трёх ещё есть время.'); },
      look: async function () {
        const r = R0();
        if (r.clockOpen) return n('Часы стоят на без четверти три — как у Гофмана. Дверца футляра приоткрыта. Маятник висит неподвижно, и тебе не хочется его трогать.');
        await n('Высокие часы в резном футляре. Идут. Тикают громче, чем положено: в тишине их слышно с улицы. Под маятником, в глубине футляра, — заводная скважина.');
        if (Pockets.has('clockkey')) return clockPuzzle();
        await n('Ключа от футляра нет. Дверца заперта.');
      },
      use: { clockkey: function () { return clockPuzzle(); } } },
    { id: 'peel', name: 'Отклеившиеся обои', r: [129, 14, 147, 28],
      night: 'Угол обоев отстаёт от стены. Под ним — что-то написано.',
      look: async function () {
        const r = R0();
        if (r.peeled) return n('Под обоями — столбики зарубок и имена. Крюк. Вересов. Градов. Сорин. У каждого — по семь зарубок. Ниже — место для ещё одного имени.');
        const c = await ask('', 'Угол обоев отклеился от сырости. Под ним темнеет штукатурка — и на ней что-то нацарапано.', ['Отклеить дальше', 'Не трогать']);
        if (c !== 0) return;
        Sfx.page(); r.peeled = 1; sync();
        await n('Обои отходят длинной полосой — легко, будто их приклеили на вчерашний клейстер. Под ними, на штукатурке, — столбики зарубок. По семь в каждом.');
        await n('Под столбиками имена: «Крюк». «Вересов». «Градов». «Сорин». Почерки разные. Нож, кажется, один.');
        await n('Ниже — ровный, чистый прямоугольник. Как будто место уже кто-то держит.');
        addSanity(-1);
      } },
    { id: 'cert', name: 'Свидетельство в рамке', r: [133, 30, 152, 56],
      night: 'Свидетельство на право торговли. Фамилии владельцев зачёркнуты, одна за другой.',
      look: function () { return n('Свидетельство на право торговли: «Ломбард «Последний час», учреждён 7 ноября». Владелец — «С. Ф. Крюк», зачёркнуто. Сверху — «Вересов», зачёркнуто. «Градов». «Сорин». Ниже — пустая строка, и чернила на ней блестят, будто их только что пролили.'); } },
    { id: 'cal', name: 'Отрывной календарь', r: [133, 58, 149, 78],
      night: function () { const c = CAL[Math.min(7, G.night)]; return c[0] + '. На листке карандашом: ' + c[1]; },
      look: async function () {
        const r = R0(), d = Math.min(7, G.night), c = CAL[d];
        Sfx.page();
        await n('Отрывной календарь. ' + c[0] + '. ' + (r.cal[d] ? 'Пометка на листке: ' : 'На листке — карандашная пометка. Почерк дяди Матвея: ') + c[1]);
        if (!r.cal[d]) { r.cal[d] = 1; sync(); if (d === 1) toast('Пометки дяди — в гроссбухе, в «Делах и слухах».', 'hint'); }
      } },
    { id: 'bell', name: 'Колокольчик над дверью', r: [223, 21, 239, 37],
      night: 'Колокольчик звенит только по живым. Сейчас он молчит.',
      look: function () { Sfx.glass(); return n('Ты трогаешь колокольчик пальцем. Он не звенит. Совсем. Колокольчик звонит только по живым — и почему-то тебе от этого не по себе.'); } },
    { id: 'bolt', name: 'Засов', r: [182, 59, 216, 71],
      night: function () { return G.upg.bolt ? 'Новый засов. Держит.' : 'Старый засов. Держит — пока его не проверяли.'; },
      look: function () { return n(G.upg.bolt ? 'Засов новый, кованый: Яша ставил. Держит — это главное.' : 'Засов старый, расшатанный. На двери под ним — глубокие царапины. Снаружи.'); } },
    { id: 'door', name: 'Дверь на улицу', r: [153, 14, 232, 126],
      night: 'Дверь. За стеклом — туман. Ночью её открывают другие.',
      look: async function () {
        const c = await ask('', G.hours > 0 ? 'Дверь на Сенную. До темноты ещё есть время.' : 'Дверь на Сенную. Уже темно — город закрывается.', ['Выйти в город', 'Остаться в лавке']);
        if (c === 0) { exit(true); Sfx.door(0.5); Street.enter('shop'); }
      } },
    { id: 'photo', name: 'Фотография', r: [231, 37, 249, 59],
      night: function () { return PHOTO[photoStage()]; },
      look: async function () {
        const r = R0(), st = photoStage();
        await vision('photo', { stage: st, free: true });
        await n(PHOTO[st]);
        r.photo = r.photo || 0;
        if (st > 0 && r.photo < st) { r.photo = st; addSanity(-1); }
      } },
    { id: 'mirror', name: 'Зеркало', ell: [MIR.cx, MIR.cy, MIR.rx + 4, MIR.ry + 4],
      night: null,
      look: function () {
        if (G.flags.mirrorAwake && !G.flags.mirrorScare) return mirrorScare();
        return n(G.sanity < 40 ? 'В зеркале — лавка. И ты. И кто-то за твоим плечом — ровно до тех пор, пока ты не обернёшься.' : 'В зеркале — пустая лавка и одно усталое лицо. Твоё. Кажется.');
      } },
    { id: 'sconce', name: 'Свеча в бра', r: [293, 33, 305, 57],
      night: 'Свеча в бра. Оплывает в сторону зеркала, хотя сквозняк тянет от двери.',
      look: function () { return n('Свеча в латунном бра. Оплывает в сторону зеркала — всегда в сторону зеркала, куда бы ни тянул сквозняк.'); } },
    { id: 'shelf', name: 'Витрина', r: [298, 10, 384, 122], night: null, look: function () { openShop(); } },
    { id: 'abacus', name: 'Счёты', r: [2, 123, 48, 142],
      night: 'Счёты. Костяшки откинуты: 3, 6, 1, 4. Дядя не велел их трогать.',
      look: function () { R0().abacus = 1; return n('Счёты с костяными костяшками. Четыре ряда. Костяшки откинуты вправо: в первом ряду — три, во втором — шесть, в третьем — одна, в четвёртом — четыре. Дядя запрещал их трогать. Даже пыль с них не стирал.'); } },
    { id: 'lamp', name: 'Керосиновая лампа', r: [46, 92, 68, 127],
      night: function () { return A.green > 0.5 ? 'Пламя зелёное и тянется вверх, будто его кто-то вдыхает.' : 'Лампа горит ровно. Керосина хватит до утра.'; },
      look: function () { return n('Керосиновая лампа. Пламя ровное, жёлтое. Дядя писал: если позеленеет — в лавке кто-то лишний.'); } },
    { id: 'tea', name: 'Чай', r: [92, 124, 110, 136], when: function () { return G.tea > 0; }, night: null, look: function () { drinkTea(); } },
    { id: 'cash', name: 'Касса', r: [256, 115, 291, 139],
      night: function () { return 'В кассе ' + gr(G.money) + '.'; },
      look: function () { return n('Касса. ' + gr(G.money) + '. Монеты холодные — все, кроме тех, что дал Кредитор: те тёплые, как живые.'); } },
    { id: 'ledger', name: 'Гроссбух', r: [310, 124, 358, 141], night: null, look: function () { openLedger(); } },
    { id: 'ink', name: 'Чернильница с пером', r: [355, 103, 368, 132],
      night: 'Перо сухое. Чернила в чернильнице — свежие.',
      look: function () { return n('Перо сухое, а чернила в чернильнице свежие, хотя никто их не доливал. По утрам на промокашке — отпечатки строчек, которых здесь никто не писал.'); } },
    { id: 'candle', name: 'Свеча на блюдце', r: [367, 110, 382, 128],
      night: 'Огарок на блюдце. Его не зажигали — а он всё короче.',
      look: function () { return n('Свеча на блюдце. Её ни разу не зажигали — а она с каждым вечером короче.'); } },
    { id: 'drawer', name: 'Ящик прилавка', r: [166, 148, 220, 170], explore: true,
      look: async function () {
        const r = R0();
        if (!r.drawer) {
          await n('Ящик под прилавком. Заперт. Скважина маленькая, под ключик с ноготь.');
          if (Pockets.has('drawerkey')) { const c = await ask('', 'В кармане — латунный ключик на мокром шнурке.', ['Отпереть ящик', 'Не сейчас']); if (c === 0) return openDrawer(); }
          return;
        }
        if (!r.box) return strongbox();
        await n('В ящике — пустой железный ящичек с откинутой крышкой. Пахнет керосином и старой бумагой.');
      },
      use: { drawerkey: function () { return R0().drawer ? n('Ящик уже открыт.') : openDrawer(); } } }
  ];
  const HB = {}; HS.forEach(function (h) { HB[h.id] = h; });

  /* ---------- тайник дяди ---------- */
  async function openDrawer() {
    const r = R0();
    Sfx.door(0.3); r.drawer = 1; Quest.take('drawerkey'); sync();
    await n('Ключик поворачивается мягко, как в смазанном. В ящике — тяжёлый железный ящичек. Вместо замка — четыре колёсика с цифрами.');
    await n('К крышке приклеена бумажка, рукой дяди: «Шифр помнят счёты».');
    return strongbox();
  }
  async function strongbox() {
    const r = R0();
    const ok = await Puzzles.lock({ title: 'Железный ящичек дяди', text: 'Четыре колеса с цифрами. На крышке, рукой дяди: «Шифр помнят счёты».' + (r.abacus ? '' : ' Счёты лежат на прилавке, слева, у лампы.'), code: '3614', fail: 'Ручка не поддаётся. Где-то внутри щёлкает — будто ящичек считает твои попытки.' });
    if (!ok) return;
    r.box = 1; sync(); Sfx.good();
    await n('Колёса щёлкают, крышка откидывается. Внутри — пачка ассигнаций, перевязанная бечёвкой, медный ключ странной формы и конверт.');
    gain(120);
    Quest.give('clockkey'); Quest.give('mletter');
    await n('Ключ похож на часовую стрелку: бородка — как остриё. На конверте: «Тому, кто останется после меня».');
  }
  async function clockPuzzle() {
    const r = R0();
    const ok = await Puzzles.clock({ title: 'Часы в резном футляре', text: 'Ключ-стрелка входит в скважину и проворачивается. Стрелки освободились — их можно переставить. Дядя писал: «Наши должны стоять так же, как у Гофмана».', th: 2, tm: 45, h: Math.floor(A.minutes / 60) % 12, m: Math.floor(A.minutes % 60 / 5) * 5, fail: 'Маятник качнулся — и замер. Часы не согласны с этим временем.' });
    if (!ok) return;
    Quest.take('clockkey');
    await vision('clock13', { free: true });
    r.clockOpen = 1; sync();
    await n('Часы бьют тринадцать раз. На тринадцатом дверца футляра открывается сама.');
    await n('За маятником, на гвозде, — огарок толстой свечи в бумажке и записка: «Заутренняя, пасхальная. Зажги, когда будет совсем худо. Хватит на одну ночь. — М.»');
    Quest.give('stub');
    await n('Часы больше не тикают. В лавке становится так тихо, что слышно, как туман трётся о стекло.');
  }

  /* ---------- где мышь ---------- */
  function hit(x, y) {
    for (let i = 0; i < HS.length; i++) {
      const h = HS[i];
      if (h.when && !h.when()) continue;
      if (h.explore && !on) continue;
      if (h.ell) { const dx = (x - h.ell[0]) / h.ell[2], dy = (y - h.ell[1]) / h.ell[3]; if (dx * dx + dy * dy <= 1) return h; continue; }
      if (x >= h.r[0] && x <= h.r[2] && y >= h.r[1] && y <= h.r[3]) return h;
    }
    return null;
  }
  function rectOf(h) { return h.ell ? [h.ell[0] - h.ell[2], h.ell[1] - h.ell[3], h.ell[0] + h.ell[2], h.ell[1] + h.ell[3]] : h.r; }
  function canHover() { return G && A.mode === 'shop' && !A.vision && !A.screamer && (on ? !busy : phase === 'night') && $('#screen').classList.contains('hidden') && !modalOpen(); }

  /* ---------- интерфейс осмотра ---------- */
  function buildUI() {
    if (ui) return;
    ui = document.createElement('div'); ui.id = 'room-ui'; ui.className = 'hidden';
    ui.innerHTML = '<div class="rm-top"><span class="rm-title">Лавка · вечер</span><span class="rm-help">наведи на вещь — подпись; клик — рассмотреть</span></div>' +
      '<div class="st-inv pk-bar hidden"></div><div class="st-sel hidden"></div>' +
      '<div class="rm-btns"><button data-rm="pockets">Карманы <kbd>I</kbd></button><button data-rm="back" class="primary">← К делам</button></div>';
    $('#game').appendChild(ui);
    ui.addEventListener('click', function (e) {
      if (!on || busy) return;
      const iv = e.target.closest('[data-inv]');
      if (iv) { e.stopPropagation(); hold(selItem === iv.dataset.inv ? null : iv.dataset.inv); Sfx.click(); return; }
      const b = e.target.closest('[data-rm], [data-pk]'); if (!b) return;
      e.stopPropagation();
      if (b.dataset.pk === 'open' || b.dataset.rm === 'pockets') Pockets.open(ctx());
      else if (b.dataset.rm === 'back') { Sfx.click(); exit(); }
    });
  }
  let label = null;
  function lab() { if (!label) { label = document.createElement('div'); label.className = 'st-label rm-label hidden'; $('#game').appendChild(label); } return label; }
  function showLabel() {
    const lb = lab();
    if (!hover || !canHover()) { lb.classList.add('hidden'); A.roomHL = null; return; }
    const r = rectOf(hover), txt = selItem && on ? Pockets.name(selItem) + ' → ' + hover.name : hover.name;
    if (lb.textContent !== txt) lb.textContent = txt;
    lb.classList.add('thing');
    lb.style.left = ((r[0] + r[2]) / 2 / Art.W * 100) + '%'; lb.style.top = (Math.max(16, r[1] - 1) / Art.H * 100) + '%';
    lb.classList.remove('hidden');
    A.roomHL = r;
  }
  function hold(id) { selItem = id && Pockets.has(id) ? id : null; invHTML(); }
  function invHTML() {
    if (!ui) return;
    if (selItem && !Pockets.has(selItem)) selItem = null;
    Pockets.fillBar(ui.querySelector('.st-inv'), selItem);
    const s = ui.querySelector('.st-sel');
    if (selItem) { s.innerHTML = 'В руке: <b>' + esc(Pockets.name(selItem)) + '</b> — кликни, к чему приложить · <i>Esc — убрать</i>'; s.classList.remove('hidden'); }
    else s.classList.add('hidden');
  }
  async function scene(fn) {
    if (busy) return;
    busy = true; hover = null; showLabel(); if (ui) ui.classList.add('hidden'); hideTip();
    try { await fn(); } catch (e) { if (e instanceof Ending) { on = false; return ending(e.id); } console.error(e); }
    hideBottom(); busy = false;
    if (on) { ui.classList.remove('hidden'); invHTML(); save(); }
  }
  function ctx() { return { hold: hold, run: scene }; }
  function enter() {
    if (!G || phase !== 'evening') return;
    on = true; busy = false; selItem = null; hover = null;
    hideScreen(); hideBottom(); closeModal(); hideTip();
    A.mode = 'shop'; A.loc = null; A.customer = null; A.item = null; A.minutes = 20 * 60 - G.hours * 60;
    sync(); showHud(true); hud(); buildUI(); ui.classList.remove('hidden'); invHTML();
    hintOnce('room', 'В лавке можно рассмотреть всё: наведи курсор — появится подпись, клик — подойти поближе. Найденное лежит в карманах.');
  }
  function exit(quiet) {
    A.roomHL = null; if (label) label.classList.add('hidden');
    if (!on) return;
    on = false; busy = false; selItem = null; hover = null; A.roomHL = null;
    if (ui) ui.classList.add('hidden'); lab().classList.add('hidden');
    hideBottom();
    if (!quiet && phase === 'evening') { save(); renderHub(); }
  }
  async function interact(h, item) {
    selItem = null; invHTML();
    if (h.id === 'shelf' || h.id === 'ledger' || h.id === 'tea') { h.look(); return; }
    return scene(async function () {
      if (item) { const f = h.use && h.use[item]; if (f) await f(); else await narr(pick(Quest.NOUSE)); }
      else await h.look();
    });
  }
  /* ночью: короткая заметка, ничего не останавливается */
  function nightLook(h) {
    if (h.id === 'mirror') return lookMirror();
    if (h.id === 'shelf') return openShop();
    if (h.id === 'ledger') return openLedger();
    if (h.id === 'tea') return drinkTea();
    if (h.id === 'cal') R0().cal[Math.min(7, G.night)] = 1, sync();
    const t = typeof h.night === 'function' ? h.night() : h.night;
    if (t) toast(t);
  }

  $('#scene').addEventListener('mousemove', function (e) {
    if (!G || A.mode !== 'shop' || !(on || phase === 'night')) { if (hover) { hover = null; showLabel(); } return; }
    const p = canvasPos(e);
    hover = canHover() ? hit(p.x, p.y) : null;
    showLabel();
    if (A.mode === 'shop') $('#scene').style.cursor = hover ? 'zoom-in' : '';
  });
  $('#scene').addEventListener('mouseleave', function () { hover = null; if (label) showLabel(); });
  $('#scene').addEventListener('click', function (e) {
    if (!G || A.mode !== 'shop' || A.vision || A.screamer) return;
    const p = canvasPos(e), h = hit(p.x, p.y);
    if (on) { if (busy) return; if (!h) { if (selItem) hold(null); return; } interact(h, selItem); return; }
    if (phase === 'night' && h) nightLook(h);
  });
  document.addEventListener('keydown', function (e) {
    if (!on || busy || modalOpen()) return;
    if (e.key === 'Escape') { if (selItem) hold(null); else exit(); }
    else if (e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); Pockets.open(ctx()); }
  });

  return {
    enter: enter, exit: exit, sync: sync, active: function () { return on; }, busy: function () { return busy; }, ctx: ctx,
    poke: function (id, item) { const h = HB[id]; if (!on || busy || !h) return false; interact(h, item); return true; },
    calNotes: function () { if (!G) return []; const r = R0(), L = []; Object.keys(r.cal).sort().forEach(function (d) { L.push('Календарь, ' + CAL[d][0] + ': ' + CAL[d][1]); }); return L; },
    journal: function () {
      if (!G) return [];
      const r = R0(), L = [];
      if (r.box && !r.clockOpen) L.push('Из железного ящичка дяди: ключ-стрелка от часов в лавке. «Наши должны стоять так же, как у Гофмана» — у Гофманов все часы стоят на без четверти три.');
      else if (r.drawer && !r.box) L.push('В ящике прилавка — железный ящичек с кодовым замком. «Шифр помнят счёты».');
      else if (Pockets.has('drawerkey') && !r.drawer) L.push('Латунный ключик из горшка с геранью. В прилавке есть запертый ящик.');
      else if (r.cal[1] && !r.potDug) L.push('«Ключ — у той, что не цветёт». В лавке не цветёт только засохшая герань на окне.');
      return L;
    }
  };
})();
