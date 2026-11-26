'use strict';
/* ============================================================
   ПОСЛЕДНИЙ ЧАС — интерфейс и ход игры
   ============================================================ */
let G = null;                         // состояние партии (см. Econ.newGame)
const A = Art.S;                      // состояние сцены
const B = Econ.B;                     // баланс текущей сложности (объект меняется на месте)
const SAVE_KEY = 'lasthour.save.v2', OLD_SAVE_KEY = 'lasthour.save.v1', SET_KEY = 'lasthour.settings.v1', END_KEY = 'lasthour.endings.v2';
const ENDINGS_TOTAL = 8;
let SET = { vol: 0.7, screamers: true, speed: 2 };
let TS = 1;                           // масштаб времени (для автотеста)
let phase = 'title';                  // title | intro | evening | town | night | dawn | ending
let nightEv = null;                   // счётчики текущей ночи
let hubTab = 'news';
let screenHandler = null, modalHandler = null;

const $ = function (s) { return document.querySelector(s); };
const game = $('#game');
const pick = Econ.pick, chance = Econ.chance;
function now() { return performance.now(); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms * TS); }); }
function later(ms, fn) { setTimeout(fn, ms * TS); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fmt(s, p) { return s.replace('{p}', p); }
function plural(n, a, b, c) { n = Math.abs(n) % 100; const k = n % 10; if (n > 10 && n < 20) return c; if (k > 1 && k < 5) return b; if (k === 1) return a; return c; }
function gr(n) { return n + ' ' + plural(n, 'грош', 'гроша', 'грошей'); }
function timeStr(m) { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; }

class Ending extends Error { constructor(id) { super('ending:' + id); this.id = id; } }
function guard() { if (G && (phase === 'night' || phase === 'town') && G.sanity <= 0) throw new Ending('mad'); }

/* ---------- раскладка ---------- */
function fit() {
  const w = Math.min(window.innerWidth, window.innerHeight * 16 / 9);
  game.style.setProperty('--u', (w / 384) + 'px');
}
window.addEventListener('resize', fit);

/* ---------- настройки и сохранение ---------- */
function loadSettings() { try { const s = JSON.parse(localStorage.getItem(SET_KEY)); if (s) SET = Object.assign(SET, s); } catch (e) {} }
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) {} }
function save() { try { const c = Object.assign({}, G); delete c.log; localStorage.setItem(SAVE_KEY, JSON.stringify(c)); } catch (e) {} }
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_SAVE_KEY); } catch (e) {} }
function loadEndings() { try { return JSON.parse(localStorage.getItem(END_KEY)) || []; } catch (e) { return []; } }

/* ---------- сцена и HUD ---------- */
function syncScene() {
  if (!G) return;
  A.stock = G.shelf.map(function (it) { return { icon: ITEM_BY_ID[it.id].icon, cursed: !!(it.cursed && it.known.cursed) }; });
  A.slots = G.slots; A.upg = G.upg; A.tea = G.tea; A.salt = G.salt; A.sanity = G.sanity;
  if (typeof Room !== 'undefined') Room.sync();
}
function hud() {
  if (!G) return;
  $('#h-night').textContent = Math.min(7, G.night);
  $('#h-time').textContent = timeStr(A.minutes);
  $('#h-money').textContent = G.money;
  $('#h-debt').textContent = G.debt;
  $('#h-sanity').style.width = G.sanity + '%';
  $('#h-sanmax').style.width = (100 - G.maxSanity) + '%';
  $('#h-rep').style.width = G.rep + '%';
  $('#b-tea').textContent = 'Чай ×' + G.tea;
  $('#b-tea').disabled = G.tea <= 0;
  $('#b-candle').textContent = 'Свеча ×' + G.candle;
  $('#b-candle').classList.toggle('hidden', !G.candle);
  game.classList.toggle('s-low', G.sanity < 40);
  game.classList.toggle('s-crit', G.sanity < 20);
  A.sanity = G.sanity;
  Sfx.setTension(1 - G.sanity / 100);
}
function showHud(on) { $('#hud').classList.toggle('hidden', !on); }

function toast(text, cls) {
  const t = document.createElement('div');
  t.className = 'tst ' + (cls || ''); t.textContent = text;
  const box = $('#toast'); box.appendChild(t);
  while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(function () { t.remove(); }, 4600);
}
function pop(text, x, y, cls) {
  const p = document.createElement('div');
  p.className = 'pop ' + (cls || ''); p.textContent = text; p.style.left = x + '%'; p.style.top = y + '%';
  $('#pops').appendChild(p);
  setTimeout(function () { p.remove(); }, 1700);
}
function hintOnce(key, text) {
  if (!G || G.flags['h_' + key]) return;
  G.flags['h_' + key] = true; toast(text, 'hint');
}
function moneyPop(d) { if (d) pop((d > 0 ? '+' : '−') + Math.abs(d), 27, 7, d > 0 ? 'pos' : 'neg'); hud(); }
function addSanity(d) {
  Econ.addSanity(G, d);
  if (d) pop((d > 0 ? '+' : '−') + Math.abs(d) + ' рассудок', 46, 7, d > 0 ? 'pos' : 'neg');
  hud();
}
function addRep(d) { Econ.addRep(G, d); hud(); }
function setMood(m) { if (A.customer) A.customer.mood = m; }
function pay(n) { G.money -= n; Sfx.coin(); moneyPop(-n); }
function gain(n) { G.money += n; Sfx.coin(); moneyPop(n); }
function learn(id, quiet) {
  if (G.recipes[id]) return false;
  G.recipes[id] = true;
  const r = RECIPE_BY_ID[id], name = r.cons ? EXTRA_CONS[r.cons].name : ITEM_BY_ID[id].name;
  if (!quiet) toast('Новый рецепт для верстака: «' + name + '».', 'good');
  return true;
}

/* ============================================================
   ПОДСКАЗКИ ПРИ НАВЕДЕНИИ
   ============================================================ */
const TIP = {};                        // uid -> вещь (всё, что сейчас нарисовано на экране)
function regTip(it) { TIP[it.uid] = it; return it.uid; }
function recipeUses(id) {
  const out = [];
  RECIPES.forEach(function (r) {
    if (!G || !G.recipes[r.id]) return;
    if (r.a !== id && r.b !== id) return;
    const other = r.a === id ? (r.b ? ITEM_BY_ID[r.b].name : 'четверговая соль') : ITEM_BY_ID[r.a].name;
    out.push('+ ' + other + ' → ' + (r.cons ? EXTRA_CONS[r.cons].name : ITEM_BY_ID[r.id].name));
  });
  return out;
}
function tipHTML(it) {
  const d = ITEM_BY_ID[it.id], ck = it.cursed && it.known.cursed;
  let h = '<b>' + esc(d.name) + '</b><small>' + CATS[d.cat] + ' · ' + CONDS[it.cond].n + '</small>';
  h += '<div class="tp-est">' + estText(it) + (it.cost ? ' <i>· взято за ' + it.cost + '</i>' : '') + '</div>';
  const fl = flagsHTML(it);
  if (fl) h += '<div class="tp-fl">' + fl + '</div>';
  else if (it.known.exact) h += '<div class="tp-fl"><span class="fl ok">осмотрено: чисто</span></div>';
  h += '<p>' + esc(ck && d.cdesc ? d.cdesc : d.desc) + '</p>';
  const use = recipeUses(it.id);
  if (use.length) h += '<p class="tp-use">Верстак: ' + esc(use.join('; ')) + '</p>';
  return h;
}
function showTip(html, e) {
  const t = $('#tip'), r = game.getBoundingClientRect();
  if (t.dataset.h !== html) { t.innerHTML = html; t.dataset.h = html; }
  t.classList.remove('hidden');
  const x = e.clientX - r.left, y = e.clientY - r.top, w = t.offsetWidth, h = t.offsetHeight;
  t.style.left = Math.max(2, Math.min(r.width - w - 2, x + 14)) + 'px';
  t.style.top = Math.max(2, (y + 18 + h > r.height) ? y - h - 10 : y + 18) + 'px';
}
function hideTip() { $('#tip').classList.add('hidden'); }
document.addEventListener('mousemove', function (e) {
  A.mouse = canvasPos(e);
  if (!G) return hideTip();
  const el = e.target.closest ? e.target.closest('[data-tipuid],[data-tipk],[data-tip]') : null;
  if (el) {
    if (el.dataset.tipuid && TIP[el.dataset.tipuid]) return showTip(tipHTML(TIP[el.dataset.tipuid]), e);
    if (el.dataset.tipk && KEY_ITEMS[el.dataset.tipk]) { const K = KEY_ITEMS[el.dataset.tipk]; return showTip('<b>' + esc(K.name) + '</b><small>особая вещь</small><p>' + esc(K.desc) + '</p>', e); }
    if (el.dataset.tip) return showTip('<p>' + esc(el.dataset.tip) + '</p>', e);
  }
  if (e.target.id === 'scene' && (phase === 'night' || phase === 'evening')) {
    const i = Art.shelfAt(A.mouse.x, A.mouse.y);
    if (i >= 0 && G.shelf[i]) return showTip(tipHTML(G.shelf[i]), e);
  }
  hideTip();
});

/* ============================================================
   ДИАЛОГ
   ============================================================ */
let bottomMode = null;
function showBottom(mode, size) {
  bottomMode = mode;
  const b = $('#bottom');
  b.classList.remove('hidden');
  b.classList.toggle('xtall', size === 'x');
  b.classList.toggle('m-dlg', mode === 'dlg');     // разговор и мысли — без панели, субтитрами поверх сцены
  ['dlg', 'trade', 'sale'].forEach(function (m) { $('#' + m).classList.toggle('hidden', m !== mode); });
}
function hideBottom() { bottomMode = null; $('#bottom').classList.add('hidden'); }

const dlg = { typing: false, finish: null, resolve: null, choice: null, timer: 0 };
const OFFSCREEN = { 'Матвей': 1, 'Голос из зеркала': 1 };
function voicePitch(name) {
  if (!name) return 0;
  if (name === 'Кредитор' || name === '???') return 72;
  if (OFFSCREEN[name]) return 96;
  if (A.customer && A.customer.hollow) return 118;
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return 210 + h % 260;
}
function say(name, text, o) {
  guard();
  o = o || {};
  showBottom('dlg');
  $('#dlg-name').textContent = name || '';
  $('#dlg').classList.toggle('narr', !name);
  $('#dlg-choices').innerHTML = '';
  $('#dlg-next').classList.remove('on');
  const tx = $('#dlg-text'); tx.textContent = '';
  const cu = A.customer;
  const talk = !!(name && cu && !OFFSCREEN[name] && !o.notalk);
  const pitch = voicePitch(name);
  return new Promise(function (res) {
    let i = 0;
    dlg.typing = true; if (talk) cu.talk = true;
    const done = function () {
      clearInterval(dlg.timer); tx.textContent = text; dlg.typing = false; dlg.finish = null;
      if (cu) cu.talk = false;
      if (o.nowait) { dlg.resolve = null; res(); } else $('#dlg-next').classList.add('on');
    };
    dlg.finish = done;
    dlg.resolve = o.nowait ? null : function () { dlg.resolve = null; $('#dlg-next').classList.remove('on'); res(); };
    const per = TS < 1 ? 60 : 1;
    let lastBlip = 0;
    dlg.timer = setInterval(function () {
      i += per; tx.textContent = text.slice(0, i);
      const t = now();
      if (pitch && t - lastBlip > 55 && text[i - 1] !== ' ') { lastBlip = t; Sfx.blip(pitch + (i % 5) * 6); }
      if (i >= text.length) done();
    }, Math.max(4, Math.round(44 / SET.speed)));
  });
}
function narr(text) { return say('', text); }
function advance() {
  if (dlg.typing && dlg.finish) dlg.finish();
  else if (dlg.resolve) { Sfx.click(); dlg.resolve(); }
}
function choose(opts) {
  guard();
  const box = $('#dlg-choices'); box.innerHTML = '';
  box.classList.toggle('many', opts.length > 4);
  return new Promise(function (res) {
    opts.forEach(function (o, i) {
      const b = document.createElement('button'); b.className = 'ch' + (o && o.seen ? ' seen' : '');
      const t = typeof o === 'string' ? o : o.t;
      b.innerHTML = '<i>' + (i + 1) + '</i>' + esc(t);
      if (o && o.dis) b.disabled = true;
      b.addEventListener('click', function (e) { e.stopPropagation(); box.innerHTML = ''; dlg.choice = null; Sfx.click(); res(i); });
      box.appendChild(b);
    });
    dlg.choice = function (n) { const b = box.children[n]; if (b && !b.disabled) b.click(); };
  });
}
async function ask(name, text, opts) { await say(name, text, { nowait: true }); return choose(opts); }
$('#dlg').addEventListener('click', advance);

/* Расспросы: вопросы не исчезают. Заданные помечаются галочкой, к ним можно вернуться —
   и в этом разговоре, и в любой следующий раз. list: [{id, q, a: [реплики] | async fn, cond, once}] */
async function topics(name, prompt, list, exitLabel, again) {
  for (;;) {
    const avail = list.filter(function (t) { return (!t.cond || t.cond()) && !(t.once && G.asked[t.id]); });
    const opts = avail.map(function (t) { return { t: (G.asked[t.id] ? '✓ ' : '') + t.q, seen: !!G.asked[t.id] }; });
    opts.push(exitLabel || '«Пока всё»');
    const c = await ask(name, prompt, opts);
    if (c >= avail.length) return;
    const t = avail[c];
    const first = !G.asked[t.id];
    G.asked[t.id] = true;
    if (typeof t.a === 'function') await t.a(first);
    else for (let i = 0; i < t.a.length; i++) { const l = t.a[i]; if (l[0] === '*') await narr(l.slice(1)); else await say(name, l); }
    prompt = again || 'Что-нибудь ещё?';
  }
}

/* ---------- экраны и модальные окна ---------- */
function showScreen(html, cls, handler) {
  const s = $('#screen'); s.className = cls || ''; s.innerHTML = html; screenHandler = handler || null;
}
function hideScreen() { const s = $('#screen'); s.className = 'hidden'; s.innerHTML = ''; screenHandler = null; hideTip(); }
$('#screen').addEventListener('click', function (e) {
  const b = e.target.closest('button, [data-act]');
  if (screenHandler) screenHandler(b && !b.disabled ? b : null, e);
});
function openModal(title, html, handler) {
  $('#modal-box').innerHTML = '<div class="m-head"><div class="m-title">' + title + '</div><button data-act="close">Закрыть</button></div>' + html;
  $('#modal').classList.remove('hidden'); modalHandler = handler || null;
}
function closeModal() {
  $('#modal').classList.add('hidden'); modalHandler = null; hideTip();
  if (bottomMode === 'sale' && sale) { saleSync(); saleRender(); }
}
function modalOpen() { return !$('#modal').classList.contains('hidden'); }
$('#modal').addEventListener('click', function (e) {
  if (e.target.id === 'modal') return closeModal();
  const b = e.target.closest('button, [data-act]');
  if (!b || b.disabled) return;
  if (b.dataset.act === 'close') { Sfx.click(); return closeModal(); }
  if (modalHandler) modalHandler(b);
});
async function card(h, p) {
  const c = $('#card');
  c.innerHTML = '<h1>' + h + '</h1><p>' + p + '</p>';
  c.classList.remove('hidden'); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
  c.style.animationDuration = (3.4 * TS) + 's';
  await sleep(3300);
  c.classList.add('hidden');
}
function waitScreenBtn(act) {
  return new Promise(function (res) { screenHandler = function (b) { if (b && b.dataset.act === act) { Sfx.click(); res(); } }; });
}
/* Экран-список (рынок, починка, освящение…): act(кнопка) меняет состояние, список перерисовывается */
function listScreen(title, render, act) {
  return new Promise(function (res) {
    const draw = function () {
      const old = document.querySelector('.tl-body'), sc = old ? old.scrollTop : 0;
      showScreen('<div class="tl"><div class="tl-head"><div class="m-title">' + title + '</div><div class="tl-money">в кассе <b>' + G.money + '</b></div><button data-act="back" class="primary">Назад</button></div><div class="tl-body">' + render() + '</div></div>', 'dim',
        function (b) {
          if (!b) return;
          if (b.dataset.act === 'back') { Sfx.click(); hideScreen(); return res(); }
          act(b); syncScene(); hud(); draw();
        });
      const nb = document.querySelector('.tl-body'); if (nb) nb.scrollTop = sc;
    };
    draw();
  });
}

/* ============================================================
   СКРИМЕРЫ
   ============================================================ */
const SCARES = {
  hollow: { kind: 'face', dur: 1150 }, window: { kind: 'face', dur: 1150 }, mirror: { kind: 'face', dur: 1150 },
  doll: { kind: 'face', dur: 1150 }, creditor: { kind: 'face', dur: 1250 },
  hands: { kind: 'hands', dur: 1500 }, eyes: { kind: 'eyes', dur: 2600 }, rise: { kind: 'rise', dur: 1900 },
  static: { kind: 'static', dur: 1100 }, match: { kind: 'match', dur: 2300 }
};
let lastScare = '';
function scareSound(kind, dur) {
  if (kind === 'hands') { [0, 0.09, 0.17, 0.25, 0.33, 0.42, 0.5, 0.58].forEach(function (f, i) { later(f * dur, function () { Sfx.bang(0.6 + i * 0.06); }); }); later(0.66 * dur, Sfx.scream); }
  else if (kind === 'eyes') { Sfx.whisper(); later(0.36 * dur, Sfx.whisper); later(0.72 * dur, Sfx.shriek); }
  else if (kind === 'rise') { Sfx.growl(); later(0.62 * dur, Sfx.scream); }
  else if (kind === 'static') { Sfx.staticN(dur / 1000 * Math.max(TS, 0.2)); later(0.58 * dur, Sfx.shriek); }
  else if (kind === 'match') { later(0.2 * dur, Sfx.match); later(0.846 * dur, Sfx.scream); }
  else Sfx.scream();
}
/* Видения: сцена вместо случайного лица. Звуки — по таймлайну сцены; громкие
   (с тряской кадра) звучат, только если скримеры включены. */
function playCue(c) {
  if (c === 'knock1') return Sfx.knock(1, false);
  if (c === 'knock3') return Sfx.knock(3, true);
  if (c === 'chime13') { for (let i = 0; i < 13; i++) later(i * 292, function () { Sfx.chime(1); }); return; }
  if (Sfx[c]) Sfx[c]();
}
function shakeOnce() { game.classList.add('shake'); setTimeout(function () { game.classList.remove('shake'); }, 260); }
async function vision(id, o) {
  o = o || {};
  const D = Visions.get(id); if (!D) return;
  hideTip(); A.roomHL = null;
  const soft = !SET.screamers;
  if (D.scare) { if (nightEv) nightEv.screams++; if (G) G.stats.screams++; lastScare = id; }
  game.classList.add('vision');
  const v = { id: id, t0: now(), k: Math.max(TS, 0.005), soft: soft, o: o };
  A.vision = v;
  D.cues.forEach(function (c) {
    if (soft && c[2] === 'loud') return;
    later(c[0], function () { if (A.vision !== v) return; playCue(c[1]); if (c[2] === 'loud') shakeOnce(); });
  });
  if (D.hold) {
    await new Promise(function (res) {
      const done = function (e) { if (e.type === 'keydown' && !/^( |Enter|Escape)$/.test(e.key)) return; document.removeEventListener('pointerdown', done, true); document.removeEventListener('keydown', done, true); e.stopPropagation(); e.preventDefault(); Sfx.page(); res(); };
      setTimeout(function () { document.addEventListener('pointerdown', done, true); document.addEventListener('keydown', done, true); }, 250 * TS);
      if (TS < 0.5) setTimeout(res, 50);
    });
  } else await sleep(D.dur);
  if (A.vision === v) A.vision = null;
  game.classList.remove('vision');
  if (D.scare && !o.free && G) addSanity(-(o.cost || 5));
}
const SCARE2VISION = { hands: 'window', window: 'window', rise: 'under', match: 'match', mirror: 'behind', hollow: 'behind', static: 'behind', doll: 'shelf', creditor: 'creditor', eyes: 'eyes' };
async function screamer(type, o) {
  if (SCARE2VISION[type] && typeof Visions !== 'undefined') return vision(SCARE2VISION[type], o);
  o = o || {};
  const K = SCARES[type] || SCARES.hollow;
  if (nightEv) nightEv.screams++;
  if (G) G.stats.screams++;
  lastScare = type;
  hideTip();
  if (SET.screamers) {
    game.classList.add('scream');
    A.screamer = { type: type, kind: K.kind, t0: now(), dur: K.dur * Math.max(TS, 0.2) };
    scareSound(K.kind, K.dur);
    await sleep(K.dur);
    A.screamer = null;
    game.classList.remove('scream');
  } else {
    A.flash = 1; Sfx.thud(); Sfx.sting();
    await sleep(700);
    A.flash = 0;
  }
  if (!o.free && G) addSanity(-5);
}
/* выбрать страх из списка, не повторяя предыдущий */
function scare(list, o) {
  let l = list.filter(function (x) { return x !== lastScare; });
  if (!l.length) l = list;
  return screamer(pick(l), o);
}

/* ============================================================
   ПОСЕТИТЕЛИ: вход, выход
   ============================================================ */
async function arrive(o) {
  const tells = o.tells || {};
  const cu = { look: o.look, tells: tells, hollow: !!o.hollow, kind: o.kind || '', mood: 'neutral', seed: Math.random() * 10, doll: !!o.doll, alpha: 0, approach: 0, inT: 0, outT: 0 };
  A.customer = cu;
  if (o.back) { cu.inT = now(); await sleep(800); return cu; }
  cu.approach = now();
  await sleep(950);
  cu.approach = 0;
  A.doorT = now(); Sfx.door();
  if (o.bellEarly) { /* колокольчик уже прозвенел */ }
  else if (!tells.bell) { A.bellT = now(); Sfx.bell(G && G.upg.bell, o.softBell); pop(o.softBell ? 'дзынь…' : 'дзынь!', 59, 15, 'ding'); }
  cu.inT = now();
  if (tells.lamp) A.greenTarget = 1;
  await sleep(850);
  return cu;
}
async function depart(quiet) {
  const cu = A.customer;
  if (!cu) return;
  cu.outT = now(); A.item = null;
  if (!quiet) { A.doorT = now(); Sfx.door(0.6); }
  await sleep(620);
  if (A.customer === cu) A.customer = null;
  A.greenTarget = 0;
}
/* Полынная свеча: честный ответ на вопрос «кто передо мной» */
function useCandle() {
  if (!G || G.candle <= 0) return;
  const cu = A.customer;
  if (phase !== 'night' || !cu || cu.alpha < 0.5) return toast('Свечу зажигают при посетителе. Сейчас перед прилавком никого. Кажется.');
  if (cu.candle) return toast('Свеча уже сказала своё.');
  G.candle--; cu.candle = true; Sfx.match(); hud();
  if (cu.kind === 'creditor') { toast('Свеча гаснет, не успев разгореться. Фитиль покрывается инеем.', 'bad'); return; }
  if (cu.kind === 'ghost') { toast('Пламя дрожит и тянется к девочке, но остаётся золотым. Не живая. И не Пустая.', 'hint'); return; }
  if (cu.kind === 'debtor') { toast('Пламя ровное, только тень от него падает не туда. Живой. Пока.', 'hint'); return; }
  if (cu.hollow) { A.greenTarget = 1; Sfx.whisper(); toast('Пламя ложится набок и зеленеет. Перед тобой — Пустой.', 'bad'); }
  else toast('Пламя ровное и золотое. Перед тобой живой человек.', 'good');
}

/* ============================================================
   ТОРГ: посетитель продаёт игроку
   ============================================================ */
let tradeResolve = null, tp = null;
const OPEN_SELL = ['Прошу {p}.', 'Хочу за это {p}.', '{p} — и забирайте.'];

function jit(n) {                       // при низком рассудке цифры «плывут»
  if (!G || phase !== 'night' || G.sanity >= 35) return n;
  const k = (35 - G.sanity) / 100 * 1.3;
  return Math.max(1, Math.round(n * (1 + Econ.rnd(-k, k))));
}
function estShort(it) {
  const e = Econ.estimate(G, it);
  return e.exact ? '' + e.exact : jit(e.lo) + '–' + jit(e.hi);
}
function estText(it) {
  const e = Econ.estimate(G, it);
  return e.exact ? 'Цена: <b>' + e.exact + '</b>' : 'Оценка: <b>' + jit(e.lo) + '–' + jit(e.hi) + '</b>';
}
function flagsHTML(it, hotWord) {
  let s = '';
  if (it.known.fake) s += '<span class="fl fake">подделка</span>';
  if (it.known.cursed && it.cursed) s += '<span class="fl cursed">с осадком</span>';
  if (it.known.stolen) s += '<span class="fl stolen">' + (hotWord || 'краденое') + '</span>';
  return s;
}
function patHTML(deal) {
  const mx = Math.min(4, deal.maxPatience), cur = Math.max(0, Math.min(mx, deal.patience));
  return '<span class="pat"><small>терпение</small>' + '●'.repeat(cur) + '○'.repeat(mx - cur) + '</span>';
}
function renderTrade() {
  const v = tp, it = v.item, d = it ? ITEM_BY_ID[it.id] : null, deal = v.deal;
  const cardv = v.card || {};
  const iconSpec = it ? d.icon : cardv.icon;
  let flags = it ? flagsHTML(it) : '';
  if (it && it.known.exact && !flags) flags = '<span class="fl ok">чисто</span>';
  const desc = it ? ((it.known.cursed && it.cursed && d.cdesc) ? d.cdesc : d.desc) : cardv.desc;
  const insp = (it && !it.known.exact) ? '<button class="t-insp" data-act="inspect"' + (G.insp > 0 ? '' : ' disabled') + '>Осмотреть с лупой (осталось ' + G.insp + ')</button>' : '';
  const lo = 1, hi = Math.max(2, deal.ask);
  v.lo = lo; v.hi = hi; v.price = Math.max(lo, Math.min(hi, v.price));
  const uses = it ? recipeUses(it.id) : [];
  $('#trade').innerHTML =
    '<div class="t-item"><img class="ico" src="' + Art.icon(iconSpec) + '">' +
      '<div class="t-iname">' + esc(it ? d.name : cardv.name) + '</div>' +
      '<div class="t-imeta">' + (it ? CATS[d.cat] + ' · ' + CONDS[it.cond].n : (cardv.meta || '')) + '</div>' +
      '<div class="t-est">' + (it ? estText(it) : (cardv.est || '')) + '</div>' +
      '<div class="t-flags">' + flags + '</div>' +
      '<div class="t-desc">' + esc(desc || '') + (uses.length ? '<br><span class="tp-use">Верстак: ' + esc(uses[0]) + '</span>' : '') + '</div>' + insp + '</div>' +
    '<div class="t-mid"><div class="t-who">' + esc(v.who) + patHTML(deal) + '</div>' +
      '<div class="t-line">«' + esc(v.line) + '»</div>' +
      '<div class="t-their">Просит: <b>' + deal.ask + '</b></div></div>' +
    '<div class="t-ctl"><div class="t-cap">Твоё предложение (в кассе ' + G.money + ')</div>' +
      '<div class="t-price"><button data-d="-10">−10</button><button data-d="-1">−1</button><span id="t-val">' + v.price + '</span><button data-d="1">+1</button><button data-d="10">+10</button></div>' +
      '<input type="range" id="t-range" min="' + lo + '" max="' + hi + '" value="' + v.price + '">' +
      '<div class="t-btns"><button class="primary" data-act="offer" style="grid-column:1/-1">Предложить <span class="pv">' + v.price + '</span></button>' +
      '<button data-act="accept">Взять за ' + deal.ask + '</button><button data-act="refuse">Отказаться</button></div></div>';
}
function setTradePrice(p) {
  if (!tp) return;
  tp.price = Math.max(tp.lo, Math.min(tp.hi, Math.round(p)));
  const v = $('#t-val'); if (v) v.textContent = tp.price;
  const r = $('#t-range'); if (r) r.value = tp.price;
  const pv = document.querySelector('#trade .pv'); if (pv) pv.textContent = tp.price;
}
function tradeInput(view) {
  guard();
  tp = view; renderTrade(); showBottom('trade');
  return new Promise(function (res) { tradeResolve = res; });
}
function tradeAct(type) {
  if (!tradeResolve || !tp) return;
  const r = tradeResolve; tradeResolve = null;
  Sfx.click();
  r({ type: type, price: tp.price });
}
$('#trade').addEventListener('click', function (e) {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.d) { setTradePrice(tp.price + (+b.dataset.d)); Sfx.blip(700); return; }
  if (b.dataset.act) tradeAct(b.dataset.act);
});
$('#trade').addEventListener('input', function (e) { if (e.target.id === 't-range') setTradePrice(+e.target.value); });

async function doInspect(it) {
  if (!it || G.insp <= 0) return;
  G.insp--; Econ.inspect(it); Sfx.page();
  const d = ITEM_BY_ID[it.id];
  if (it.fake) toast('Под лупой: клеймо криво, металл не тот. Подделка.', 'bad');
  if (it.stolen) toast('На вещи метка владельца. Краденое: на витрине инспектор его найдёт.', 'bad');
  if (it.cursed) {
    Sfx.whisper(); toast('Пальцы стынут. ' + d.cdesc, 'bad'); addSanity(-2);
    if (nightEv && nightEv.screams < 2 && chance(0.12)) await scare(['doll', 'eyes']);
  }
  if (!it.fake && !it.stolen && !it.cursed) toast('Вещь чистая. Цена известна точно.', 'good');
}

/* Посетитель продаёт игроку. Возвращает {ok, price} | {ok:false, why} */
async function haggleSell(o) {
  const deal = o.deal;
  let line = o.opener, price = Math.max(1, Math.round(deal.ask * 0.6));
  for (;;) {
    const act = await tradeInput({ kind: 'sell', who: o.who, line: line, deal: deal, item: o.item, card: o.card, price: price });
    price = act.price;
    if (act.type === 'inspect') { await doInspect(o.item); continue; }
    if (act.type === 'refuse') return { ok: false, why: 'refused' };
    const x = act.type === 'accept' ? deal.ask : act.price;
    if (x > G.money) { Sfx.deny(); toast('В кассе не хватает грошей.', 'bad'); continue; }
    if (o.item && Econ.room(G) <= 0) { Sfx.deny(); toast('Некуда класть: и витрина, и кладовая забиты.', 'bad'); continue; }
    const r = Econ.sellerOffer(deal, x);
    if (r.type === 'accept') return { ok: true, price: r.price };
    if (r.type === 'leave') return { ok: false, why: 'left', insult: r.insult };
    setMood(r.insult ? 'angry' : 'sad');
    if (o.hollow) line = 'Нет. ' + r.price + '.';
    else line = r.insult ? pick(o.temper.insultSell) + ' Моя цена — ' + r.price + '.' : fmt(pick(o.temper.counterSell), r.price);
    price = Math.min(Math.max(price, x), r.price);
  }
}

/* ============================================================
   ПРОДАЖА: витрина → стол → покупатель
   ============================================================ */
let sale = null, saleResolve = null;
const SALE_LEVELS = [[-0.2, 'скидка 20%'], [-0.1, 'скидка 10%'], [0, 'по рынку'], [0.1, '+10%'], [0.2, '+20%'], [0.35, '+35%']];
function saleRef(it) { return Math.max(1, Econ.estimate(G, it).mid); }
function saleOffers() { return sale.table.map(function (r) { return { it: r.it, price: r.price, ref: r.ref }; }); }
function saleRow(uid) { return sale.table.find(function (r) { return r.it.uid === uid; }); }
function saleSync() {                   // вещь могли унести в кладовую, пока шёл торг
  sale.table = sale.table.filter(function (r) { return G.shelf.indexOf(r.it) >= 0; });
}
function saleRender() {
  const s = sale, p = s.prof;
  const disc = Math.max(p.disc, Econ.cartDiscount(saleOffers()));
  const bonus = Econ.budgetBonus(p, disc), total = p.budget + bonus, left = total - p.spent;
  let wants;
  if (s.hollow) wants = 'Ему подойдёт <b class="w1">любое</b>. Платит, не глядя.';
  else wants = 'Ищет: <b class="w1">' + CATS[p.wants[0]] + '</b>' + (p.second.length ? '<br>Присматривается: <b class="w2">' + CATS[p.second[0]] + '</b>' : '') ;
  let shelf = '';
  const onTable = {};
  s.table.forEach(function (r) { onTable[r.it.uid] = 1; });
  G.shelf.forEach(function (it) {
    if (onTable[it.uid]) return;
    const m = Econ.match(p, it);
    shelf += tileHTML(it, { act: 'add', cls: m >= 1 ? 'w1' : m >= 0.8 ? 'w2' : '' });
  });
  if (!shelf) shelf = '<div class="s-none">' + (G.shelf.length ? 'Всё выложено на стол.' : 'Витрина пуста. Товар из кладовой выкладывается через «Лавку».') + '</div>';
  let table = '';
  s.table.forEach(function (r) {
    const d = ITEM_BY_ID[r.it.id]; regTip(r.it);
    let note = '';
    if (r.why === 'price') note = r.counter ? '<button class="cnt" data-act="counter" data-uid="' + r.it.uid + '">дорого · отдать за ' + r.counter + '</button>' : '<span class="bad">слишком дорого</span>';
    else if (r.why === 'budget') note = r.counter ? '<button class="cnt" data-act="counter" data-uid="' + r.it.uid + '">есть только ' + r.counter + '</button>' : '<span class="bad">не по карману</span>';
    else if (r.why === 'cat') note = '<span class="bad">не интересует</span>';
    const dl = Math.round((r.price / r.ref - 1) * 100);
    table += '<div class="trow' + (r.why ? ' rej' : '') + '" data-tipuid="' + r.it.uid + '">' +
      '<img class="ico" src="' + Art.icon(d.icon) + '" data-act="untable" data-uid="' + r.it.uid + '">' +
      '<div class="tprice"><button data-act="dn" data-uid="' + r.it.uid + '">−</button><b>' + r.price + '</b><button data-act="up" data-uid="' + r.it.uid + '">+</button></div>' +
      '<div class="tdl ' + (dl < 0 ? 'pos' : dl > 0 ? 'neg' : '') + '">' + (dl ? (dl > 0 ? '+' : '') + dl + '%' : 'рынок') + '</div>' +
      '<div class="tnote">' + note + '</div></div>';
  });
  for (let i = s.table.length; i < G.tableSlots; i++) table += '<div class="trow empty"></div>';
  let lv = '';
  SALE_LEVELS.forEach(function (l) { lv += '<button data-act="level" data-l="' + l[0] + '" class="' + (s.level === l[0] ? 'on' : '') + (l[0] < 0 ? ' disc' : '') + '">' + l[1] + '</button>'; });
  const sum = s.table.reduce(function (a, r) { return a + r.price; }, 0);
  $('#sale').innerHTML =
    '<div class="s-left"><div class="t-who">' + esc(s.who) + patHTML(p) + '</div>' +
      '<div class="s-wants">' + wants + '</div>' +
      '<div class="s-budget" data-tip="Сколько покупатель готов оставить в лавке. Скидка от рыночной цены растягивает кошелёк: −10% к цене — примерно +15% к сумме.">Готов потратить: <b>' + left + '</b>' + (p.spent ? ' <small>(уже отдал ' + p.spent + ')</small>' : '') +
      (bonus ? '<div class="s-bonus">скидка ' + Math.round(disc * 100) + '% → кошелёк +' + bonus + '</div>' : '') +
      '<div class="bbar"><i style="width:' + Math.max(0, Math.min(100, Math.round(left / Math.max(1, total) * 100))) + '%"></i></div></div>' +
      '<div class="s-line">«' + esc(s.line) + '»</div></div>' +
    '<div class="s-mid"><div class="s-cap">Витрина <small>клик — выложить на стол</small><button class="s-store" data-act="store">Кладовая…</button></div><div class="s-shelf">' + shelf + '</div>' +
      '<div class="s-cap">Стол <small>' + s.table.length + ' из ' + G.tableSlots + ' · клик по вещи — убрать</small></div><div class="s-table">' + table + '</div></div>' +
    '<div class="s-right"><div class="s-cap">Цены для этого покупателя</div><div class="s-levels">' + lv + '</div>' +
      '<div class="s-total">На столе на <b>' + sum + '</b></div>' +
      '<button class="primary" data-act="offer"' + (s.table.length ? '' : ' disabled') + '>Назвать цену</button>' +
      '<button data-act="end">' + (p.bought ? 'Проводить' : 'Ничего не продавать') + '</button></div>';
}
function saleInput() {
  guard();
  saleRender(); showBottom('sale', 'x');
  return new Promise(function (res) { saleResolve = res; });
}
function saleAct(a) {
  if (!saleResolve) return;
  const r = saleResolve; saleResolve = null; Sfx.click(); r(a);
}
function saleClear() { sale.table.forEach(function (r) { r.why = null; r.counter = 0; }); }
$('#sale').addEventListener('click', function (e) {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled || !sale || !saleResolve) return;
  const a = b.dataset.act, uid = +b.dataset.uid;
  if (a === 'add') {
    if (sale.table.length >= G.tableSlots) { Sfx.deny(); return toast('На столе больше нет места. Убери что-нибудь или купи у Яши широкий прилавок.'); }
    const it = G.shelf.find(function (x) { return x.uid === uid; }); if (!it) return;
    const ref = saleRef(it);
    sale.table.push({ it: it, ref: ref, price: Math.max(1, Math.round(ref * (1 + sale.level))), why: null, counter: 0 });
    Sfx.blip(520); hideTip(); saleRender();
  } else if (a === 'untable') {
    sale.table = sale.table.filter(function (r) { return r.it.uid !== uid; });
    Sfx.blip(380); hideTip(); saleRender();
  } else if (a === 'up' || a === 'dn') {
    const r = saleRow(uid); if (!r) return;
    const step = Math.max(1, Math.round(r.ref * 0.05));
    r.price = Math.max(1, r.price + (a === 'up' ? step : -step)); r.why = null; r.counter = 0;
    Sfx.blip(700); saleRender();
  } else if (a === 'level') {
    sale.level = +b.dataset.l;
    sale.table.forEach(function (r) { r.price = Math.max(1, Math.round(r.ref * (1 + sale.level))); });
    saleClear(); Sfx.blip(600); saleRender();
  } else if (a === 'store') { openShop(); }
  else if (a === 'offer') saleAct({ type: 'offer' });
  else if (a === 'counter') saleAct({ type: 'counter', uid: uid });
  else if (a === 'end') saleAct({ type: 'end' });
});
function saleLine(res, arch, hollow) {
  if (hollow) return res.sold.length ? pick(HOLLOW.ok) : 'Много. Меньше.';
  const T = LINES[arch.temper], SL = SALE_LINES[arch.temper];
  const pr = res.rejected.find(function (r) { return r.why === 'price'; }), bd = res.rejected.find(function (r) { return r.why === 'budget'; });
  const ct = res.rejected.find(function (r) { return r.why === 'cat'; });
  let s = '';
  if (res.sold.length) s = (res.rejected.length ? pick(SL.some) : pick(T.okBuy)) + ' ';
  if (pr) s += res.insult ? pick(T.insultBuy) : (res.sold.length || !pr.counter ? pick(SL.pricey) : fmt(pick(T.counterBuy), pr.counter));
  else if (bd) s += pick(SL.broke);
  else if (ct && !res.sold.length) s += pick(T.wrongItem);
  return s.trim() || pick(T.okBuy);
}
/* o: {who, arch, hollow, prof, opener}. Возвращает {sold, total, left} */
async function runSale(o) {
  const hollow = o.hollow, arch = o.arch;
  sale = { prof: o.prof, who: o.who, hollow: hollow, table: [], level: 0, line: o.opener };
  hintOnce('sale', 'Кликай по вещам на витрине — они лягут на стол. Задай цены и жми «Назвать цену». Скидка растягивает кошелёк покупателя, наценка испытывает терпение.');
  let sold = 0, total = 0, left = false;
  const commit = function (it, price) {
    Econ.cartCommit(G, sale.prof, it, price);
    sale.table = sale.table.filter(function (r) { return r.it !== it; });
    sold++; total += price; G.log.deals++;
    if (!hollow) {
      if (it.fake) G.soldFakes.push(1);
      if (it.cursed) G.guilt.push({ name: ITEM_BY_ID[it.id].name, knew: !!it.known.cursed });
    }
  };
  for (;;) {
    const act = await saleInput();
    if (act.type === 'end') break;
    if (act.type === 'counter') {
      const r = saleRow(act.uid);
      if (!r || !r.counter) continue;
      const lim = Econ.budgetLeft(sale.prof);
      const price = Math.min(r.counter, lim);
      if (price < 1) { r.why = 'budget'; r.counter = 0; continue; }
      commit(r.it, price); Sfx.coin(); moneyPop(price); syncScene(); setMood('happy');
      sale.table.forEach(function (x) { if (x.why === 'budget') { x.counter = 0; } });
      sale.line = hollow ? pick(HOLLOW.ok) : pick(LINES[arch.temper].okBuy);
    } else {
      saleClear();
      const res = Econ.cartOffer(G, sale.prof, saleOffers());
      let sum = 0;
      res.sold.forEach(function (x) { commit(x.it, x.price); sum += x.price; });
      res.rejected.forEach(function (x) { const r = sale.table.find(function (y) { return y.it === x.it; }); if (r) { r.why = x.why; r.counter = x.counter; } });
      if (sum) { Sfx.coin(); moneyPop(sum); syncScene(); }
      setMood(res.insult ? 'angry' : res.sold.length ? 'happy' : res.rejected.length ? 'sad' : 'neutral');
      sale.line = saleLine(res, arch, hollow);
      if (res.leave) { left = true; break; }
    }
    if (sold && Econ.budgetLeft(sale.prof) < 2) break;                 // кошелёк пуст
  }
  const disc = sale.prof.disc;
  hideTip(); sale = null;
  if (sold && !hollow) { Econ.addRep(G, disc >= 0.08 ? 2 : 1); if (disc >= 0.08) hintOnce('discrep', 'Скидку в Мглове запоминают: репутация растёт быстрее.'); }
  syncScene(); hud();
  return { sold: sold, total: total, left: left };
}

/* ============================================================
   ОБЫЧНЫЙ ПОСЕТИТЕЛЬ (живой или Пустой)
   ============================================================ */
function corrupt(text) {
  const w = text.split(' ');
  w.splice(1 + Math.floor(Math.random() * Math.max(1, w.length - 1)), 0, pick(['(не оборачивайся)', '(он уже внутри)', '(посмотри в зеркало)', '(ты следующий)']));
  return w.join(' ');
}
function afterBuy(arch, item, price, deal, hollow, zone) {
  Sfx.coin(); moneyPop(-price); G.log.deals++;
  if (!hollow) {
    Econ.addRep(G, 1);
    if (arch && arch.temper === 'meek' && price >= deal.face * 0.5) { Econ.addRep(G, 2); toast('Честная цена. В Мглове такое запоминают.', 'good'); }
  }
  if (zone === 'store') hintOnce('store', 'Витрина полна — покупка ушла в кладовую. Переложить вещи можно в «Лавке».');
  syncScene(); hud();
}
async function refuseVisitor(who, arch, hollow) {
  if (hollow) {
    G.hollowRefused++;
    A.customer.wide = true; Sfx.sting();
    const l = pick(HOLLOW.refused);
    if (l[0] === '(') await narr(l.slice(1, -1)); else await say(who, l);
    addSanity(2);
    if (G.night >= 3 && chance(0.3)) nightEv.knock = true;
  } else {
    G.humansRefused++; setMood('angry');
    await say(who, pick(LINES[arch.temper].refused));
    addRep(-3);
    toast('Это был живой человек. Репутация −3.', 'bad');
  }
}
async function hollowAftermath() {
  Econ.mark(G); hud();
  if (A.customer) A.customer.wide = true;
  await narr(pick(['Монеты холодные и чуть влажные. Но настоящие.', 'Сделка закрыта. В лавке стало ощутимо холоднее.', 'Посетитель улыбается. Слишком широко. Слишком долго.']));
  toast('Сделка с Пустым. На косяке двери — новая зарубка. Предел рассудка −' + B.hollowMaxSanity + '. Следующая сделка ударит по рассудку сильнее.', 'bad');
  if (G.marks === Econ.MARK_LIMIT + 1) toast('Четвёртая зарубка. Теперь лавка тебя не отпустит: с таким косяком отсюда не уходят.', 'bad');
  if (!G.flags.firstHollow || chance(0.35)) {
    G.flags.firstHollow = true;
    if (nightEv.screams < 2) await scare(['hollow', 'rise', 'eyes']);
  }
}
async function buyerFlow(who, arch, hollow, prof, opener) {
  const temper = LINES[arch.temper];
  if (!G.shelf.length && G.store.length) hintOnce('emptyshelf', 'Витрина пуста, а в кладовой есть товар. Нажми «Кладовая…» и выложи вещи.');
  const r = await runSale({ who: who, arch: arch, hollow: hollow, prof: prof, opener: opener });
  if (r.sold) { setMood('happy'); await say(who, hollow ? pick(HOLLOW.bye) : pick(temper.bye)); }
  else if (r.left) { setMood('angry'); if (!hollow) Econ.addRep(G, -2); hud(); await say(who, hollow ? pick(HOLLOW.bye) : pick(temper.leaveBuy)); }
  else await say(who, hollow ? pick(HOLLOW.bye) : pick(temper.noItem));
  return r.sold > 0;
}
async function visitGeneric(v) {
  const arch = ARCH_BY_ID[v.arch], hollow = v.type === 'hollow';
  const tells = {};
  if (hollow) v.tells.forEach(function (t) { tells[t] = true; });
  let mode = v.mode;
  if (mode === 'buy' && (!Econ.all(G).length || (!hollow && !arch.buys.length))) mode = 'sell';
  if (mode === 'sell' && Econ.room(G) <= 0 && (hollow || arch.buys.length)) mode = 'buy';
  const who = arch.name, temper = LINES[arch.temper];
  await arrive({ look: arch.look, tells: tells, hollow: hollow });
  let item = null, prof = null, greet;
  if (mode === 'sell') {
    item = Econ.genSellerItem(G, arch, hollow);
    A.item = ITEM_BY_ID[item.id].icon;
    greet = hollow ? pick(HOLLOW.sell) : pick(arch.sell);
  } else {
    prof = Econ.buyerProfile(G, arch, hollow);
    greet = hollow ? pick(HOLLOW.buy) : ((chance(0.55) ? pick(arch.hi) + ' ' : '') + pick(BUY_ASK[prof.wants[0]]));
  }
  if (!hollow && G.sanity < 30 && chance(0.3)) greet = corrupt(greet);
  const c = await ask(who, greet, [mode === 'sell' ? 'Посмотреть, что принесли' : 'Показать товар', '«Лавка закрыта». Выставить за дверь']);
  if (c === 1) { await refuseVisitor(who, arch, hollow); await depart(); return; }
  let done = false;
  if (mode === 'sell') {
    const deal = Econ.sellerDeal(G, arch, item, hollow);
    const r = await haggleSell({ who: who, temper: temper, hollow: hollow, deal: deal, item: item, opener: hollow ? 'Цена. ' + deal.ask + '.' : fmt(pick(OPEN_SELL), deal.ask) });
    if (r.ok) {
      done = true;
      const zone = Econ.buyItem(G, item, r.price);
      A.item = null; afterBuy(arch, item, r.price, deal, hollow, zone); setMood('happy');
      await say(who, hollow ? pick(HOLLOW.ok) : pick(temper.okSell));
      // с деньгами в кармане человек не прочь оглядеться
      if (!hollow && arch.buys.length && G.shelf.length > 1 && r.price >= 12 && chance(0.3)) {
        const p2 = Econ.buyerProfile(G, arch, false);
        p2.budget = Math.max(8, Math.round(r.price * Econ.rnd(0.7, 1)));
        await say(who, pick(['Раз уж я при деньгах… покажите-ка, что у вас на витрине.', 'А впрочем, дайте взглянуть на товар. Деньги жгут карман.', 'Постойте. Я, пожалуй, кое-что присмотрю.']));
        await buyerFlow(who, arch, false, p2, 'Ищу: ' + CATS[p2.wants[0]].toLowerCase() + '. Много не потрачу.');
      }
    } else if (r.why === 'left') {
      setMood('angry'); if (!hollow) Econ.addRep(G, -2); hud();
      await say(who, hollow ? pick(HOLLOW.bye) : pick(temper.leaveSell));
    } else await say(who, hollow ? pick(HOLLOW.bye) : pick(temper.bye));
  } else {
    done = await buyerFlow(who, arch, hollow, prof, hollow ? 'Я заплачу. Сколько скажете.' : 'Показывайте. Только без лишнего.');
  }
  A.item = null;
  if (hollow && done) await hollowAftermath();
  await depart();
}
/* Заказчик: пришёл за вещью, о которой писал в газету */
async function visitOrder() {
  const o = G.order, arch = ARCH_BY_ID[o.arch], d = ITEM_BY_ID[o.id], who = arch.name, temper = LINES[arch.temper];
  await arrive({ look: arch.look });
  await say(who, pick(arch.hi) + ' Я по объявлению: «' + d.name + '». Нашлось?');
  const have = Econ.findById(G, o.id).sort(function (a, b) { return b.cond - a.cond; });
  if (have.length) {
    const it = have[0], price = Econ.orderPrice(G, o, it);
    A.item = d.icon;
    const c = await ask(who, 'Она самая. Как и обещано — ' + price + '.', ['Отдать заказ за ' + price, 'Оставить себе']);
    A.item = null;
    if (c === 0) {
      Econ.sellItem(G, it, price); Sfx.coin(); moneyPop(price); G.log.deals++; addRep(3); setMood('happy');
      if (it.fake) G.soldFakes.push(1);
      if (it.cursed) G.guilt.push({ name: d.name, knew: !!it.known.cursed });
      syncScene();
      await say(who, pick(temper.okBuy) + ' С вами можно иметь дело.');
    } else { setMood('angry'); addRep(-2); await say(who, pick(temper.refused)); }
  } else {
    setMood('sad'); addRep(-3);
    await say(who, pick(temper.noItem));
    toast('Заказ не выполнен. Репутация −3.', 'bad');
  }
  G.order = null;
  await depart();
}

/* ============================================================
   МЕЖДУ ПОСЕТИТЕЛЯМИ
   ============================================================ */
const WHISPERS = [
  'Тикают часы. Ты считаешь удары — их на один больше, чем должно быть.',
  'Из-под прилавка тянет холодом, как из открытого погреба.',
  'Тебе кажется, что в глубине лавки кто-то переставляет вещи. Тебе кажется.',
  'В зеркале лавка выглядит чуть иначе. Там на одну дверь больше.',
  'Кто-то дышит за твоей спиной в такт с тобой. Ты задерживаешь дыхание. Он — нет.',
  'Скрипят половицы. Там, где никого нет и быть не может.',
  'Лампа коптит. На секунду в стекле отражается не твоё лицо.',
  'Из гроссбуха выпадает листок. На нём твоим почерком: «уходи». Ты этого не писал. Не писала. Не писало.',
  'Под полом кладовой что-то глухо гудит — будто там качнули тяжёлое железо.'
];
const CURSED_ACTS = [
  '«{n}» тихо стучит. Изнутри.',
  'Ты замечаешь: «{n}» лежит ближе к краю, чем час назад.',
  'Тянет сыростью. «{n}» покрылась каплями, как стакан с ледяной водой.',
  'Ты отворачиваешься — и чувствуешь, что «{n}» смотрит тебе в затылок.'
];
async function between(i) {
  await sleep(450);
  const cursed = Econ.all(G).filter(function (it) { return it.cursed; });
  // вторая ночь: первый, кто стоит за окном
  if (G.night === 2 && i === 2 && !G.flags.n2win) {
    G.flags.n2win = true;
    A.win = { kind: 'stand', t0: now(), dur: 9000 * TS, eyes: true };
    await sleep(900); Sfx.glass();
    await narr('За окном кто-то стоит. Давно. Ты не помнишь, когда он подошёл.');
    A.win = null; addSanity(-2);
    await narr('Ты моргаешь — и там только туман и фонарь.');
    return;
  }
  // стук отвергнутого Пустого
  if (nightEv.knock && chance(0.6)) {
    nightEv.knock = false; A.knockT = now(); Sfx.knock(3, true);
    await narr('В дверь бьют. Трижды. Потом тишина — и кто-то дышит в замочную скважину.');
    if (G.upg.bolt) toast('Засов держит. Почти не страшно.', 'good'); else addSanity(-4);
    return;
  }
  // страх: каждый раз — другой, и всегда с причиной (вещь с осадком, окно, прилавок, зеркало)
  const p = Econ.clamp((55 - G.sanity) / 180 + G.marks * 0.025 + cursed.length * 0.035, 0, 0.3);
  if (i >= 1 && G.night >= 2 && nightEv.screams < 2 && chance(p)) {
    const opts = ['window', 'under', 'behind'].filter(function (k) { return k !== lastScare; });
    if (cursed.length && lastScare !== 'shelf') opts.push('shelf', 'shelf');
    const k = pick(opts);
    if (k === 'shelf') {
      const it = pick(cursed); it.known.cursed = true; syncScene();
      await narr('На витрине что-то тихо стукает о стекло. Изнутри. «' + ITEM_BY_ID[it.id].name + '» стоит у самого стекла — хотя её ставили в глубину.');
      await vision('shelf', { icon: ITEM_BY_ID[it.id].icon });
      await narr('Стекло витрины цело. На нём изнутри — два маленьких отпечатка ладоней. Ты стираешь их рукавом. Через минуту они проступают снова.');
    } else if (k === 'window') {
      A.win = { kind: 'stand', t0: now(), dur: 99999 * TS }; Sfx.glass();
      await narr('За окном кто-то стоит. Ты не помнишь, когда он подошёл. Он не уходит.');
      await vision('window');
      A.win = null;
      await narr('Стекло пустое. Только по запотевшему, с той стороны, медленно сползают буквы: «ВПУСТИ».');
    } else if (k === 'under') {
      await narr('Под прилавком скребётся. Мышь. Конечно, мышь. Ты чиркаешь спичкой и наклоняешься посмотреть.');
      await vision('under');
      await narr('Под прилавком пусто. На половицах — свежие царапины: «ОН СЛЫШИТ». И лужица речной воды, которая никак не высыхает.');
    } else {
      await narr('Ты ловишь своё отражение в зеркале. Что-то в нём не так. Не сразу понятно что: оно не моргает вместе с тобой.');
      await vision('behind');
      await narr('Ты оборачиваешься. За спиной никого. В зеркале — тоже. Только на плече остаются мокрые следы чьих-то пальцев.');
    }
    return;
  }
  // гаснет лампа
  if (G.night >= 3 && !nightEv.lampOut && chance(0.1 + (G.sanity < 50 ? 0.08 : 0))) {
    nightEv.lampOut = true;
    A.lampOn = false; Sfx.thud();
    await narr('Лампа гаснет. Сама. В темноте кто-то стоит совсем рядом: ты слышишь, как скрипит его пальто.');
    if (SET.screamers && nightEv.screams < 2 && chance(0.5)) {
      await narr('Ты нашариваешь спички.');
      await screamer('match');
      A.lampOn = true;
    } else {
      const t0 = now() - 5000;
      A.customer = { look: pick(ARCH).look, tells: { eyes: true, shadow: true, mirror: true }, hollow: true, mood: 'neutral', seed: 1, wide: true, alpha: 1, approach: 0, inT: t0, outT: 0 };
      A.lampOn = true; Sfx.sting();
      await sleep(380);
      A.customer = null;
      addSanity(-3);
    }
    await narr('Огонь возвращается. Перед прилавком пусто. На дереве — два влажных отпечатка ладоней.');
    return;
  }
  // ложные тревоги: страшно, но ничего не происходит
  if (G.night >= 2 && !nightEv.falseAlarm && chance(0.16)) {
    nightEv.falseAlarm = true;
    const k = Econ.irnd(0, 3);
    if (k === 0) {
      A.bellT = now(); Sfx.bell(G.upg.bell); pop('дзынь!', 59, 15, 'ding'); await sleep(500); A.doorT = now(); Sfx.door();
      await narr('Колокольчик звякнул. Дверь открылась — и закрылась. Никто не вошёл.');
      await narr('Колокольчик звонит только по живым. Значит, кто-то живой только что вышел. Но в лавке никого не было. Кроме тебя.');
    } else if (k === 1) {
      A.peek = { t0: now(), dur: 1400 * Math.max(TS, 0.3) }; Sfx.glass();
      await sleep(1500);
      await narr('За дверным стеклом на миг проступает лицо — прижатое так плотно, что нос расплющен. Потом стекло снова пустое. И чистое: ни следа дыхания.');
      addSanity(-1);
    } else if (k === 2) {
      Sfx.chime(2);
      await narr('Часы бьют. Ты считаешь: тринадцать. На циферблате при этом — ' + timeStr(A.minutes) + '.');
    } else {
      Sfx.thud();
      await narr(G.shelf.length ? 'С витрины что-то падает. Ты поднимаешь: «' + ITEM_BY_ID[pick(G.shelf).id].name + '». Вещь тёплая, будто её только что держали в руке.' : 'В кладовой что-то падает. Ты идёшь проверить. Всё на местах. Даже слишком.');
    }
    return;
  }
  // вещь с осадком даёт о себе знать
  if (cursed.length && chance(0.22)) {
    const it = pick(cursed); it.known.cursed = true; syncScene(); Sfx.whisper();
    await narr(pick(CURSED_ACTS).replace('{n}', ITEM_BY_ID[it.id].name));
    addSanity(-3);
    return;
  }
  if (G.sanity < 65 && chance(0.25)) {
    Sfx.whisper();
    await narr(pick(WHISPERS)); addSanity(-2);
    return;
  }
  if (chance(0.35)) {
    const w = { kind: chance(0.6) ? 'pass' : 'stand', t0: now(), dur: 5200, eyes: G.sanity < 60, hat: G.night >= 3 && chance(0.3) };
    A.win = w;
    setTimeout(function () { if (A.win === w) A.win = null; }, 5200);
  }
}

/* ---------- после трёх ---------- */
async function afterThree() {
  A.minutes = 27 * 60; hud();
  Sfx.chime(3);
  await narr('Часы бьют три.');
  A.knockT = now(); Sfx.knock(3);
  const c = await ask('', 'В дверь стучат. Трижды. Вежливо.', ['Задвинуть засов. Лавка закрыта', 'Открыть. Ещё один клиент — ещё одна сделка']);
  if (c === 0) {
    if (!G.upg.bolt && G.night >= 2 && chance(0.4)) {
      A.knockT = now(); Sfx.knock(4, true); await sleep(900); Sfx.scratch();
      await narr('Стук повторяется. Потом скребут — ногтями, сверху вниз, по всей двери.');
      addSanity(-4);
    } else await narr('За дверью ещё немного стоят. Потом уходят. Шагов не слышно.');
    return;
  }
  await nightGuest();
}
async function nightGuest() {
  const arch = pick(ARCH);
  await arrive({ look: arch.look, tells: { bell: true, mirror: true, shadow: true, eyes: true, lamp: true }, hollow: true });
  A.dark = 0.5;
  const who = 'Ночной гость';
  let done = false;
  const all = Econ.all(G);
  if (all.length && chance(0.5)) {
    const it = all.slice().sort(function (a, b) { return Econ.faceValue(G, b) - Econ.faceValue(G, a); })[0];
    const d = ITEM_BY_ID[it.id], price = Math.round(Econ.faceValue(G, it) * Econ.rnd(2.2, 2.7));
    A.item = d.icon;
    const c = await ask(who, 'У вас. Есть. «' + d.name + '». Я беру. ' + price + '.', ['Продать за ' + price, 'Отказать']);
    if (c === 0) { Econ.sellItem(G, it, price); Sfx.coin(); moneyPop(price); G.log.deals++; done = true; }
  } else {
    const id = pick(['mantel', 'brooch', 'grimoire', 'mask', 'chain', 'musicbox']);
    const it = Econ.makeItem(G, id, { cursed: true, cond: Econ.irnd(1, 2) });
    const d = ITEM_BY_ID[id], price = Math.max(5, Math.round(Econ.faceValue(G, it) * Econ.rnd(0.08, 0.14)));
    A.item = d.icon;
    const can = G.money >= price && Econ.room(G) > 0;
    const c = await ask(who, 'Возьмите. «' + d.name + '». Отдаю. ' + price + '. Мне. Хватит.', [{ t: can ? 'Купить за ' + price : 'Купить (нет денег или места)', dis: !can }, 'Отказать']);
    if (c === 0) { Econ.buyItem(G, it, price); Sfx.coin(); moneyPop(-price); G.log.deals++; done = true; }
  }
  A.item = null; syncScene();
  A.customer.wide = true;
  if (done) {
    Econ.mark(G); addSanity(-4);
    await say(who, 'Хорошо. Вы. Открываете. Я запомнил.');
    toast('Сделка после трёх. Новая зарубка. Предел рассудка −' + B.hollowMaxSanity + '.', 'bad');
  if (G.marks === Econ.MARK_LIMIT + 1) toast('Четвёртая зарубка. Теперь лавка тебя не отпустит: с таким косяком отсюда не уходят.', 'bad');
    if (chance(0.6)) await scare(['hollow', 'rise', 'hands']);
  } else {
    await narr('Поздно отказывать: дверь уже открыта. Он стоит и смотрит. Долго. Потом выходит — спиной вперёд.');
    addSanity(-6);
    if (chance(0.3)) await scare(['hollow', 'eyes']);
  }
  A.dark = 0;
  await depart();
}

/* ============================================================
   НОЧЬ
   ============================================================ */
const NIGHT_NAMES = ['ПЕРВАЯ', 'ВТОРАЯ', 'ТРЕТЬЯ', 'ЧЕТВЁРТАЯ', 'ПЯТАЯ', 'ШЕСТАЯ', 'СЕДЬМАЯ'];
const NIGHT_SUB = ['наследство', 'кто ходит в тумане', 'кредитор', 'шкатулка', 'вторая выплата', 'голос из зеркала', 'последний час'];

async function startNight() {
  Room.exit(true);
  hideScreen(); closeModal(); phase = 'night';
  try { await runNight(); }
  catch (e) {
    if (e instanceof Ending) { await ending(e.id); return; }
    console.error(e); toast('Ошибка: ' + e.message, 'bad'); throw e;
  }
}
async function runNight() {
  G.log = { spent: 0, earned: 0, profit: 0, sanityLost: 0, deals: 0 };
  G.soldFakes = []; G.guilt = [];
  G.insp = B.insp + (G.upg.loupe ? 2 : 0);
  nightEv = { screams: 0, knock: false };
  A.mode = 'shop'; A.loc = null;
  A.minutes = 21 * 60 + 30; A.dark = 0; A.dawn = 0; A.customer = null; A.item = null;
  syncScene(); hud(); hideBottom();
  await card('НОЧЬ ' + NIGHT_NAMES[G.night - 1], NIGHT_SUB[G.night - 1]);
  Sfx.ticking(true);
  if (G.night === 2) hintOnce('n2', 'Теперь любой посетитель может оказаться Пустым. Колокольчик, тень, зеркало, глаза, пламя — сверяйся с правилами.');
  if (!G.shelf.length && G.store.length) toast('Витрина пуста — покупателям нечего показать. Открой «Лавку» и выложи товар.', 'hint');
  const list = Econ.buildNight(G);
  const step = Math.floor(320 / list.length);
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    A.minutes = 21 * 60 + 30 + step * i + Econ.irnd(0, 8); hud();
    await sleep(600);
    if (v.type === 'story') await Story[v.id]();
    else if (v.type === 'order') { if (G.order) await visitOrder(); }
    else await visitGeneric(v);
    guard(); syncScene(); hud();
    if (i < list.length - 1) await between(i);
    guard();
  }
  if (G.night === 7) { await Story.finale(); throw new Ending('keeper'); }
  if (G.night !== 3 && G.night !== 5) await afterThree();
  guard();
  await dawn();
}

/* ---------- рассвет ---------- */
async function dawn() {
  phase = 'dawn'; Sfx.ticking(false); hideBottom(); A.customer = null; A.item = null;
  for (let i = 0; i <= 20; i++) { A.dawn = i / 20; await sleep(60); }
  Sfx.dawn();
  const log = G.log, r = Econ.dawn(G), L = [];
  L.push(['Выручка за ночь', '+' + log.earned, 'pos']);
  L.push(['Потрачено на покупки', '−' + log.spent, log.spent ? 'neg' : '']);
  L.push(['Керосин для лампы', '−' + r.oil, 'neg']);
  if (r.interest) L.push(['Проценты Кредитору (' + Math.round(G.rate * 100) + '% в сутки)', '+' + r.interest + ' к долгу', 'neg']);
  r.lines.forEach(function (x) { L.push([x[0], x[1] ? x[1] + ' рассудка' : '', 'neg', true]); });
  if (r.drain) L.push(['Вещи с осадком в лавке: ' + r.cursed + ' (в кладовой тянут вдвое слабее)', '−' + r.drain + ' рассудка', 'neg']);
  if (r.rest) L.push(['Под утро удаётся вздремнуть', '+' + r.rest + ' рассудка', 'pos']);
  if (r.complaints) L.push(['Покупатели вернулись с подделками: ' + r.complaints, 'репутация −' + r.complaints * 4, 'neg']);
  (G.guilt || []).forEach(function (gl) {
    if (!chance(0.6)) return;
    const d = gl.knew ? 5 : 2; Econ.addSanity(G, -d);
    L.push(['В утренней газете — заметка о несчастье. В описи вещей покойного: «' + gl.name + '». Ты её узнаёшь.', '−' + d + ' рассудка', 'neg', true]);
  });
  G.guilt = [];
  L.push(['В кассе', gr(G.money), '']);
  L.push(['Остаток долга', G.debt > 0 ? gr(G.debt) : 'погашен', G.debt > 0 ? '' : 'pos']);
  let html = '<div class="dawn"><h1>Рассвет. Ночь ' + G.night + ' позади</h1>';
  L.forEach(function (l, i) { html += '<div class="dl' + (l[3] ? ' note' : '') + '" style="animation-delay:' + (i * 0.22 * TS).toFixed(2) + 's"><span>' + esc(l[0]) + '</span><span class="' + l[2] + '">' + esc(l[1]) + '</span></div>'; });
  html += '<button class="primary go" data-act="go">Дальше ▸</button></div>';
  hud();
  showScreen(html, 'dim');
  await waitScreenBtn('go');
  hideScreen();
  if (G.sanity <= 0) throw new Ending('mad');
  if (G.night === 1) await Story.letter();
  G.night++;
  Econ.prepareDay(G, false);
  A.dawn = 0;
  evening();
}

/* ============================================================
   ВЕЧЕР: газета, Яша, лавка, верстак, гроссбух, город
   ============================================================ */
const YASHA_QUIPS = [
  'Бери разное и недорогое. Ночью спросят часы, а у тебя одни ложки — обидно. И всё до гроша не спускай: посетителям тоже платить.',
  'Слыхал, к тебе вчера заходил один... молчаливый. Не бери у них ничего. Или бери — но тогда не жалуйся.',
  'Сегодня придёт твой заимодавец. Я в такие ночи сижу дома и стараюсь не дышать.',
  'Градов по чётным ночам шарит по лавкам. Горячее держи в кладовой: на витрину он смотрит, в подсобку не лезет.',
  'Есть партия с Вдовьего кладбища. Оптом. Вейс такое с руками оторвёт. Только сам на них долго не смотри.',
  'Завтра седьмая. Завтра я к тебе, может, и не приду, хозяин, не серчай. Закупайся сегодня.',
  'Пришёл всё-таки. Сам не знаю зачем. Бери что хочешь. Может, ещё свидимся.'
];
function tileHTML(it, o) {
  o = o || {};
  const d = ITEM_BY_ID[it.id], ck = it.cursed && it.known.cursed;
  regTip(it);
  return '<div class="tile ' + (o.cls || '') + (ck ? ' cursedk' : '') + (it.known.fake ? ' fakek' : '') + (it.known.stolen ? ' hotk' : '') + '" data-tipuid="' + it.uid + '" data-uid="' + it.uid + '" data-act="' + (o.act || 'sel') + '">' +
    '<img class="ico" src="' + Art.icon(d.icon) + '"><span>' + (o.sub != null ? o.sub : estShort(it)) + '</span></div>';
}
function itemCardHTML(it, btns, extra) {
  const d = ITEM_BY_ID[it.id];
  const ck = it.cursed && it.known.cursed;
  regTip(it);
  return '<div class="it' + (ck ? ' cursedk' : '') + '" data-tipuid="' + it.uid + '"><img class="ico" src="' + Art.icon(d.icon) + '">' +
    '<div class="it-name">' + esc(d.name) + '</div><div class="it-meta">' + CATS[d.cat] + ' · ' + CONDS[it.cond].n + '</div>' +
    '<div class="it-est">' + estText(it) + (extra || '') + '</div>' +
    '<div class="it-btns">' + flagsHTML(it, 'горячее') + btns + '</div></div>';
}
function newsHTML() {
  const ev = EVENT_BY_ID[G.eventId];
  let rows = '';
  CAT_KEYS.forEach(function (k) {
    const dlt = Math.round((G.market[k] - 1) * 100);
    const cls = dlt >= 8 ? 'up' : dlt <= -8 ? 'down' : 'flat', ar = dlt >= 8 ? '▲' : dlt <= -8 ? '▼' : '●';
    rows += '<tr><td>' + CATS[k] + '</td><td class="' + cls + '">' + ar + ' ' + (dlt > 0 ? '+' : '') + dlt + '%</td></tr>';
  });
  let ads = '';
  if (G.order) {
    const d = ITEM_BY_ID[G.order.id], a = ARCH_BY_ID[G.order.arch];
    ads += '<div class="p-ad p-order"><b>Куплю: ' + esc(d.name) + '.</b> Заплачу на ' + Math.round((G.order.mult - 1) * 100) + '% выше рынка. Зайду ' + (G.order.due === G.night ? 'этой ночью' : 'завтра ночью') + '. — ' + esc(a.name) + '</div>';
  }
  for (let i = 0; i < (G.order ? 2 : 3); i++) ads += '<div class="p-ad">' + esc(ADS[(G.night * 3 + i + (G.uid % 5)) % ADS.length]) + '</div>';
  const chk = G.day.rumor ? '<p class="p-chk">' + (G.rumorTrue ? 'Фрося с Сенного божится: чистая правда.' : 'Фрося с Сенного фыркает: враньё, не будет этого.') + '</p>' : '';
  return '<div class="paper"><div class="p-title">Мгловский вестник</div>' +
    '<div class="p-sub">выпуск вечерний · ночь ' + G.night + '-я · цена один грош</div>' +
    '<div class="p-cols"><div><h2>' + esc(ev.head) + '</h2><p>' + esc(ev.body) + '</p>' +
    '<div class="p-h">Слухи на завтра</div><p class="p-rumor">' + esc(G.rumor || 'Слухов нет. Это само по себе слух.') + '</p>' + chk +
    '<p style="font-size:.8em;opacity:.75">Слухам в Мглове можно верить. Примерно в четырёх случаях из пяти.</p></div>' +
    '<div><div class="p-h">Цены на сегодня</div><table class="p-market">' + rows + '</table>' +
    '<p style="font-size:.8em;opacity:.75;margin-top:.8em">Процент — отклонение от обычной цены. Ажиотаж остывает за пару дней. Каждая твоя продажа немного сбивает цену в своей категории.</p></div></div>' +
    '<div class="p-ads"><div><div class="p-h">Объявления</div>' + ads + '</div>' +
    '<div><div class="p-h">Хроника</div><div class="p-chron">' + esc(CHRONICLE[Math.min(6, G.night - 1)]) + '</div></div></div></div>';
}
function yashaHTML() {
  if (G.flags.yashaGone) {
    return '<div class="quip">У чёрного хода никого. На ступеньке лежит Яшин картуз, полный тумана, как миска — молока.</div>' +
      '<div class="empty">Привоза больше не будет. Товар теперь — только на Сенном, на кладбище, у реки и у ночных посетителей.</div>' + consHTML();
  }
  let h = '<div class="quip"><b>Яша:</b>«' + esc(YASHA_QUIPS[Math.min(6, G.night - 1)]) + '»<button class="talk" data-act="talk">Расспросить Яшу</button></div>';
  h += '<h3>Привоз <small>свободно: витрина ' + (G.slots - G.shelf.length) + ', кладовая ' + (G.storeSlots - G.store.length) + '</small></h3>';
  if (!G.yasha.length) h += '<div class="empty">Всё разобрано. Яша пересчитывает гроши и насвистывает.</div>';
  h += '<div class="grid">';
  G.yasha.forEach(function (it) {
    const can = G.money >= it.price && Econ.room(G) > 0;
    h += itemCardHTML(it, '<button data-act="buy" data-uid="' + it.uid + '"' + (can ? '' : ' disabled') + '>Купить за ' + it.price + '</button>');
  });
  h += '</div>';
  if (G.batch) {
    const can = G.money >= 180 && Econ.room(G) >= 3;
    h += '<div class="row"><div class="grow">Партия с Вдовьего кладбища<small>Три диковины оптом. Все — с осадком. Вейс платит за такие заметно дороже рынка, но берёт не больше трёх за визит.</small></div>' +
      '<button class="danger" data-act="batch"' + (can ? '' : ' disabled') + '>Взять оптом за 180</button></div>';
  }
  return h + consHTML();
}
function consHTML() {
  let h = '<h3>Расходники</h3>';
  CONSUMABLES.forEach(function (cns) {
    h += '<div class="row"><div class="grow">' + cns.name + ' <span class="owned">×' + G[cns.id] + '</span><small>' + cns.desc + '</small></div>' +
      (G.flags.yashaGone ? '<span class="owned">у Агаты</span>' : '<button data-act="cons" data-id="' + cns.id + '"' + (G.money >= cns.price ? '' : ' disabled') + '>Купить за ' + cns.price + '</button>') + '</div>';
  });
  h += '<h3>Обустройство лавки</h3>';
  UPGRADES.forEach(function (u) {
    h += '<div class="row"><div class="grow">' + u.name + '<small>' + u.desc + '</small></div>' +
      (G.upg[u.id] ? '<span class="owned">куплено</span>' : G.flags.yashaGone ? '<span class="owned">некому привезти</span>' : '<button data-act="upg" data-id="' + u.id + '"' + (G.money >= u.price ? '' : ' disabled') + '>Купить за ' + u.price + '</button>') + '</div>';
  });
  return h;
}
/* ---------- лавка: витрина и кладовая ---------- */
let invSel = 0;
function findUid(list, uid) { return list.find(function (it) { return it.uid === uid; }); }
function invZone(zone, title, cap, note) {
  let h = '<h3>' + title + ' <small>' + G[zone].length + ' из ' + cap + ' · ' + note + '</small></h3><div class="inv">';
  G[zone].forEach(function (it) { h += tileHTML(it, { act: 'sel', cls: invSel === it.uid ? 'sel' : '' }); });
  for (let i = G[zone].length; i < cap; i++) h += '<div class="tile empty"></div>';
  return h + '</div>';
}
function shopHTML(night) {
  let h = invZone('shelf', 'Витрина', G.slots, 'отсюда вещи выкладывают на стол покупателю');
  h += invZone('store', 'Кладовая', G.storeSlots, 'запас и сырьё для верстака; инспектор сюда не заглядывает');
  const it = findUid(Econ.all(G), invSel);
  if (it) {
    const d = ITEM_BY_ID[it.id], ck = it.cursed && it.known.cursed, on = Econ.home(G, it) === 'shelf';
    const full = on ? G.store.length >= G.storeSlots : G.shelf.length >= G.slots;
    h += '<div class="inv-sel"><img class="ico" src="' + Art.icon(d.icon) + '"><div class="grow"><div class="it-name">' + esc(d.name) + ' <span class="it-meta">' + CATS[d.cat] + ' · ' + CONDS[it.cond].n + '</span></div>' +
      '<div class="it-est">' + estText(it) + (it.cost ? ' <span style="color:#8f8668">· взято за ' + it.cost + '</span>' : '') + ' ' + flagsHTML(it, 'краденое') + '</div>' +
      '<div class="it-desc">' + esc(ck && d.cdesc ? d.cdesc : d.desc) + '</div></div>' +
      '<div class="inv-btns"><button class="primary" data-act="move" data-uid="' + it.uid + '"' + (full ? ' disabled' : '') + '>' + (on ? '◂ В кладовую' : 'На витрину ▸') + '</button>' +
      (ck ? '<button data-act="salt" data-uid="' + it.uid + '"' + (G.salt > 0 ? '' : ' disabled') + '>Посыпать солью (' + G.salt + ')</button>' : '') +
      (night ? '' : '<button class="danger" data-act="toss" data-uid="' + it.uid + '">Выбросить</button>') + '</div></div>';
  } else h += '<div class="inv-sel hint">Клик по вещи — выбрать, второй клик — переложить. Наведи курсор, чтобы прочесть описание. Продаётся только то, что стоит на витрине.</div>';
  const keys = Object.keys(G.key).filter(function (k) { return KEY_ITEMS[k] && (G.key[k] === 'have' || G.key[k] === 'ward'); });
  if (keys.length) {
    h += '<h3>Под прилавком <small>особые вещи: места не занимают</small></h3>';
    keys.forEach(function (k) {
      const K = KEY_ITEMS[k];
      h += '<div class="row" data-tipk="' + k + '"><img class="ico" src="' + Art.icon(K.icon) + '"><div class="grow">' + K.name + (G.key[k] === 'ward' ? ' <span class="owned">сторожит лавку</span>' : '') + '<small>' + K.desc + '</small></div>' +
        (k === 'box' ? '<button class="danger" data-act="openbox">Открыть</button>' : '') + '</div>';
    });
  }
  h += '<div class="sched" style="margin-top:.8em">Запасы: чай ×' + G.tea + ' · соль ×' + G.salt + ' · ремнабор ×' + G.kit + ' · полынная свеча ×' + G.candle + '</div>';
  return h;
}
function shopAct(b, night) {             // true — надо перерисовать
  const a = b.dataset.act, uid = +b.dataset.uid;
  if (a === 'sel') {
    if (invSel === uid) { const it = findUid(Econ.all(G), uid); if (it && Econ.moveItem(G, it)) Sfx.blip(520); else Sfx.deny(); }
    else { invSel = uid; Sfx.blip(440); }
    return true;
  }
  if (a === 'move') { const it = findUid(Econ.all(G), uid); if (it && Econ.moveItem(G, it)) Sfx.blip(520); else Sfx.deny(); return true; }
  if (a === 'salt') { useSalt(uid); return true; }
  if (a === 'toss' && !night) {
    const it = findUid(Econ.all(G), uid);
    if (it) { Econ.removeItem(G, it); Sfx.thud(); toast('«' + ITEM_BY_ID[it.id].name + '» отправляется в мусорную яму за лавкой.'); invSel = 0; }
    return true;
  }
  if (a === 'openbox') {
    if (now() - boxArmed > 4000) { boxArmed = now(); b.textContent = 'Точно открыть? Агата просила не трогать'; Sfx.deny(); return false; }
    boxArmed = 0; openBox(); return false;
  }
  return false;
}
/* ---------- верстак ---------- */
function recipeName(r) { return r.cons ? EXTRA_CONS[r.cons].name + (r.n > 1 ? ' ×' + r.n : '') : ITEM_BY_ID[r.id].name; }
function benchHTML() {
  let h = '<div class="quip">Верстак дяди Матвея. Две вещи превращаются в одну — подороже и поинтереснее. Краденое после переделки уже никто не опознает; а вот осадок и подделка переходят в новую вещь.</div>';
  h += '<h3>Рецепты <small>известно ' + Object.keys(G.recipes).length + ' из ' + RECIPES.length + '</small></h3>';
  const part = function (id, it) {
    const d = ITEM_BY_ID[id];
    return '<span class="rc-in ' + (it ? 'have' : 'miss') + '"' + (it ? ' data-tipuid="' + regTip(it) + '"' : '') + '><img class="ico" src="' + Art.icon(d.icon) + '">' + esc(d.name) + '</span>';
  };
  RECIPES.forEach(function (r) {
    if (!G.recipes[r.id]) { h += '<div class="row rc unknown"><div class="grow">??? + ??? → ?<small>' + RECIPE_HINT[r.src] + '</small></div></div>'; return; }
    const inp = Econ.craftInputs(G, r);
    let out;
    if (r.cons) out = '<span class="rc-out"><img class="ico" src="' + Art.icon(['candle', '#5a6a3a', '#d8d8b0']) + '">' + recipeName(r) + '</span><small>' + EXTRA_CONS[r.cons].desc + '</small>';
    else { const d = ITEM_BY_ID[r.id]; out = '<span class="rc-out"><img class="ico" src="' + Art.icon(d.icon) + '">' + esc(d.name) + ' <b>≈ ' + Math.round(d.base * G.market[d.cat]) + '</b></span><small>' + CATS[d.cat] + '. ' + esc(d.desc) + '</small>'; }
    h += '<div class="row rc"><div class="grow"><div class="rc-line">' + part(r.a, inp.a) + ' + ' +
      (r.b ? part(r.b, inp.b) : '<span class="rc-in ' + (inp.salt ? 'have' : 'miss') + '">четверговая соль</span>') + ' → ' + out + '</div></div>' +
      '<button data-act="craft" data-id="' + r.id + '"' + (inp.ok ? '' : ' disabled') + '>Собрать</button></div>';
  });
  h += '<h3>Починка <small>ремнабор ×' + G.kit + ' · состояние вещи +1 ступень (продаются на Сенном и у Гофман)</small></h3>';
  const fix = Econ.all(G).filter(Econ.canRepair);
  if (!fix.length) h += '<div class="empty">Чинить нечего: всё либо в отличном состоянии, либо снадобья.</div>';
  fix.forEach(function (it) {
    const d = ITEM_BY_ID[it.id], gain2 = Math.round(Econ.faceValue(G, it) * (CONDS[it.cond + 1].m / CONDS[it.cond].m - 1));
    h += '<div class="row" data-tipuid="' + regTip(it) + '"><img class="ico" src="' + Art.icon(d.icon) + '"><div class="grow">' + esc(d.name) + '<small>' + CONDS[it.cond].n + ' → ' + CONDS[it.cond + 1].n + ' · цена вырастет примерно на ' + gain2 + '</small></div>' +
      '<button data-act="repair" data-uid="' + it.uid + '"' + (G.kit > 0 ? '' : ' disabled') + '>Починить</button></div>';
  });
  return h;
}
function benchAct(b) {
  const a = b.dataset.act;
  if (a === 'craft') {
    const r = RECIPE_BY_ID[b.dataset.id], res = Econ.craft(G, r);
    if (!res) return Sfx.deny();
    Sfx.good();
    if (res.cons) toast('Готово: ' + recipeName(r) + '.', 'good');
    else {
      const d = ITEM_BY_ID[res.item.id];
      toast('Собрано: «' + d.name + '». Лежит в кладовой.', 'good');
      if (res.woke) { res.item.known.cursed = true; Sfx.whisper(); toast('Когда ты затягиваешь последний винт, вещь вздрагивает. В неё что-то вселилось.', 'bad'); }
      else if (res.item.cursed) toast('Осадок перешёл в новую вещь. Пальцы стынут по-прежнему.', 'bad');
    }
  } else if (a === 'repair') {
    const it = findUid(Econ.all(G), +b.dataset.uid);
    if (!it || !Econ.repair(G, it)) return Sfx.deny();
    Sfx.good(); toast('«' + ITEM_BY_ID[it.id].name + '»: теперь состояние ' + CONDS[it.cond].n + '.', 'good');
  }
}
/* ---------- гроссбух ---------- */
function ledgerHTML(night) {
  const due3 = G.paid >= B.due[3] || G.debt <= 0, due5 = G.paid >= B.due[5] || G.debt <= 0;
  let h = '<div class="ledger"><h3>Долг Кредитору <small>сложность: ' + B.name.toLowerCase() + '</small></h3>';
  h += '<div><span class="big">' + G.debt + '</span> осталось · выплачено ' + G.paid + ' · ' + Math.round(G.rate * 100) + '% в сутки, начисляются на рассвете</div>';
  h += '<div class="sched">К третьей ночи — не менее ' + B.due[3] + ' <span class="' + (due3 ? 'done">✓' : (G.night > 3 ? 'late">просрочено' : 'late">ещё ' + (B.due[3] - G.paid))) + '</span> · ' +
    'к пятой — не менее ' + B.due[5] + ' <span class="' + (due5 ? 'done">✓' : (G.night > 5 ? 'late">просрочено' : 'late">ещё ' + (B.due[5] - G.paid))) + '</span> · на седьмую — всё.</div>';
  if (!night && G.debt > 0) {
    h += '<div class="pay">';
    [50, 100, 250].forEach(function (a) { h += '<button data-act="pay" data-n="' + a + '"' + (G.money >= a && G.debt >= a ? '' : ' disabled') + '>Внести ' + a + '</button>'; });
    h += '<button data-act="pay" data-n="' + Math.min(G.money, G.debt) + '"' + (G.money > 0 ? '' : ' disabled') + '>Внести всё (' + Math.min(G.money, G.debt) + ')</button></div>';
    h += '<div class="sched">Раньше платишь — меньше набегает процентов. Но пустая касса — пустая витрина.</div>';
  }
  if (G.strikes) h += '<div class="late">Просрочек: ' + G.strikes + '. Вторая станет последней.</div>';
  const jr = Story.journal();
  if (jr.length) {
    h += '<h3>Дела и слухи</h3><ul class="journal">';
    jr.forEach(function (l) { h += '<li>' + esc(l) + '</li>'; });
    h += '</ul>';
  }
  h += '<h3>Правила. Рукой дяди Матвея</h3><ol class="rules">';
  RULES.forEach(function (r, i) { h += '<li' + (i === RULES.length - 1 ? ' class="scrawl"' : '') + '>' + esc(r) + '</li>'; });
  h += '</ol><h3>Зарубки на дверном косяке</h3>';
  h += G.marks ? '<div class="marks">' + '|'.repeat(G.marks) + '</div><div class="sched">Каждая сделка с Пустым — зарубка. Каждая зарубка — минус ' + B.hollowMaxSanity + ' к пределу рассудка, навсегда, и каждая следующая сделка бьёт по рассудку больнее. Больше трёх зарубок — и лавка считает хозяина своим.</div>'
    : '<div class="sched">Пока ни одной. Косяк чист.</div>';
  h += '<h3>Учёт</h3><div class="sched">Куплено вещей: ' + G.stats.bought + ' · продано: ' + G.stats.sold + ' · собрано на верстаке: ' + G.stats.crafted + ' · выручено: ' + G.stats.earned + ' · лучшая сделка: +' + G.stats.bestDeal +
    '<br>Пустых выставлено за дверь: ' + G.hollowRefused + ' · живых — по ошибке: ' + G.humansRefused + '</div></div>';
  return h;
}
/* ---------- город ---------- */
function townHTML() {
  let h = '<div class="quip">До темноты: <span class="hours">' + '◆'.repeat(G.hours) + '◇'.repeat(Math.max(0, B.hours - G.hours)) + '</span> — ' +
    (G.hours ? 'каждая прогулка занимает час. Всюду не успеть: выбирай.' : 'темнеет. В тумане уже кто-то ходит. Пора открывать лавку.') + '</div><div class="locs">';
  LOCS.forEach(function (l) {
    const open = G.night >= l.from;
    h += '<div class="loc' + (open ? '' : ' closed') + '"><div class="loc-name">' + l.name + '</div><div class="loc-who">' + (open ? l.who : 'ты ещё не знаешь туда дороги') + '</div>' +
      '<div class="loc-desc">' + (open ? l.desc : 'Откроется с ' + l.from + '-й ночи.') + '</div>' +
      (open ? '<button data-act="go" data-id="' + l.id + '"' + (G.hours > 0 ? '' : ' disabled') + '>Идти · 1 час</button>' : '') + '</div>';
  });
  return h + '</div>';
}
/* Зайти в место на улице: час уходит, после разговора — снова на улицу, к той же двери */
async function goTown(id) {
  if (G.hours <= 0 || !Town[id]) return;
  Street.pause();
  G.hours--; hideScreen(); hideTip(); phase = 'town';
  A.mode = 'loc'; A.loc = id; A.customer = null; A.item = null;
  A.minutes = 20 * 60 - G.hours * 60; hud();
  Sfx.door(0.5);
  await card(LOC_BY_ID[id].name.toUpperCase(), 'вечер ' + G.night + '-й ночи');
  try { await Town[id](); guard(); }
  catch (e) {
    if (e instanceof Ending) { Street.stop(); A.mode = 'shop'; A.loc = null; await ending(e.id); return; }
    console.error(e); toast('Ошибка: ' + e.message, 'bad'); throw e;
  }
  A.customer = null; A.item = null; A.loc = null; hideBottom();
  syncScene(); hud(); save();
  Street.enter(id, { back: true });
}

/* ---------- сам вечер ---------- */
function hubHTML() {
  const tab = function (id, label) { return '<button data-tab="' + id + '" class="' + (hubTab === id ? 'on' : '') + '">' + label + '</button>'; };
  const body = hubTab === 'news' ? newsHTML() : hubTab === 'yasha' ? yashaHTML() : hubTab === 'shop' ? shopHTML(false) : hubTab === 'bench' ? benchHTML() : hubTab === 'town' ? townHTML() : ledgerHTML(false);
  let note = '';
  if (G.night >= 2) {
    const nd = G.night <= 3 ? 3 : G.night <= 5 ? 5 : 7;
    const need = nd === 7 ? G.debt : Math.max(0, Math.min(B.due[nd] - G.paid, G.debt));
    if (G.debt <= 0) note = '<div class="hub-note ok">Долг погашен. Но седьмая ночь всё равно наступит.</div>';
    else if (need > 0) note = '<div class="hub-note">' + (nd === G.night
      ? (nd === 7 ? 'Седьмая ночь. Кредитор заберёт весь остаток: ' + need + '.' : 'Этой ночью придёт Кредитор. Он ждёт ещё ' + need + '.')
      : 'К ' + (nd === 3 ? 'третьей' : nd === 5 ? 'пятой' : 'седьмой') + ' ночи Кредитор ждёт ещё ' + need + '.') + '</div>';
    else note = '<div class="hub-note ok">Ближайший взнос внесён.</div>';
  }
  return '<div class="hub"><div class="hub-tabs"><div class="hub-cap">Вечер · ночь ' + G.night + ' из 7</div>' +
    tab('news', 'Газета') + tab('yasha', 'Яша: привоз') + tab('shop', 'Лавка ' + G.shelf.length + '/' + G.slots + ' · ' + G.store.length + '/' + G.storeSlots) +
    tab('bench', 'Верстак') + tab('ledger', 'Гроссбух') +
    '<button data-act="street" class="street-btn" data-tip="Пройтись по Мглову до темноты. Ходьба времени не тратит — час уходит, только когда заходишь в дом.">Выйти в город <span class="hours">' + '◆'.repeat(G.hours) + '</span></button>' +
    '<button data-act="room" class="room-btn" data-tip="Осмотреть лавку: всё, что стоит и висит, можно рассмотреть. Времени не тратит.">Оглядеться в лавке</button>' + note +
    '<button data-act="open" class="primary open">Открыть лавку ▸</button></div>' +
    '<div class="hub-main' + (hubTab === 'news' ? ' np' : '') + '">' + body + '</div></div>';
}
function renderHub() {
  const main = document.querySelector('.hub-main'), sc = main ? main.scrollTop : 0;
  showScreen(hubHTML(), 'dim', hubAct);
  const m2 = document.querySelector('.hub-main'); if (m2) m2.scrollTop = sc;
  syncScene(); hud();
}
function useSalt(uid) {
  const it = findUid(Econ.all(G), uid);
  if (!it || G.salt <= 0) return;
  G.salt--; it.cursed = false; it.known.cursed = false; Sfx.salt();
  toast('Соль чернеет и шипит. «' + ITEM_BY_ID[it.id].name + '» — теперь просто вещь.', 'good');
}
async function openBox() {
  if (G.key.box !== 'have') return;
  G.key.box = 'opened';
  closeModal();
  const wasHub = phase === 'evening';
  if (wasHub) hideScreen();
  Sfx.sting(); await sleep(500);
  await vision('box', { free: true });
  addSanity(-15); G.money += 60; G.agata -= 2; hud();
  toast('Внутри — карманные часы без стрелок. Они тикали. Теперь — нет.', 'bad');
  toast('Под бархатом — 60 грошей. И чувство, будто сломано что-то чужое.', 'hint');
  if (wasHub && phase === 'evening') renderHub();
}
let boxArmed = 0;
async function hubTalk() {
  hideScreen();
  await arrive({ look: LOOKS.yasha, back: true });
  await Story.yashaTalk();
  await depart(true);
  hideBottom(); save(); renderHub();
}
function hubAct(b) {
  if (!b) return;
  if (b.dataset.tab) { hubTab = b.dataset.tab; Sfx.page(); const m = document.querySelector('.hub-main'); if (m) m.scrollTop = 0; return renderHub(); }
  const a = b.dataset.act;
  if (a === 'open') { Sfx.click(); return startNight(); }
  if (a === 'talk') { Sfx.click(); return hubTalk(); }
  if (a === 'go') { Sfx.click(); return goTown(b.dataset.id); }
  if (a === 'street') { Sfx.door(0.5); return Street.enter('shop'); }
  if (a === 'room') { Sfx.page(); return Room.enter(); }
  if (a === 'buy') {
    const it = findUid(G.yasha, +b.dataset.uid);
    if (!it || G.money < it.price || Econ.room(G) <= 0) return Sfx.deny();
    G.yasha.splice(G.yasha.indexOf(it), 1);
    const p = it.price; delete it.price;
    const z = Econ.buyItem(G, it, p, it.stolen ? 'store' : 'shelf');
    Sfx.coin(); moneyPop(-p);
    if (it.stolen && z === 'store') hintOnce('hot', 'Горячее Яша сам снёс в кладовую — подальше от глаз инспектора. На витрину выставляй на свой страх.');
  } else if (a === 'batch') {
    if (G.money < 180 || Econ.room(G) < 3) return Sfx.deny();
    G.money -= 180; G.batch = false;
    Econ.graveBatch(G).forEach(function (it) { it.cost = 60; Econ.addItem(G, it, 'store'); G.stats.bought++; });
    G.stats.spent += 180; Sfx.coin(); moneyPop(-180); Sfx.whisper();
    toast('Свёрток пахнет землёй. Пальцы стынут ещё до того, как он развёрнут. Всё — в кладовой.', 'bad');
  } else if (a === 'cons') {
    const cns = CONSUMABLES.find(function (x) { return x.id === b.dataset.id; });
    if (G.money < cns.price) return Sfx.deny();
    G.money -= cns.price; G[cns.id]++; Sfx.coin(); moneyPop(-cns.price);
  } else if (a === 'upg') {
    const u = UPGRADES.find(function (x) { return x.id === b.dataset.id; });
    if (G.money < u.price || G.upg[u.id]) return Sfx.deny();
    G.money -= u.price; G.upg[u.id] = true;
    if (u.id === 'shelf') G.slots += 4;
    if (u.id === 'table') G.tableSlots += 2;
    if (u.id === 'chest') G.storeSlots += 8;
    Sfx.good(); moneyPop(-u.price); toast(u.name + ': ' + u.desc, 'good');
  } else if (a === 'pay') {
    const n = Econ.payDebt(G, +b.dataset.n);
    if (n) { Sfx.coin(); moneyPop(-n); toast('Внесено ' + gr(n) + '. Запись в гроссбухе появляется сама.', 'good'); }
  } else if (a === 'craft' || a === 'repair') benchAct(b);
  else if (!shopAct(b, false)) return;
  save(); renderHub();
}
async function evening() {
  Room.exit(true);
  phase = 'evening';
  A.mode = 'shop'; A.loc = null; A.customer = null; A.item = null; A.dawn = 0; A.dark = 0; A.minutes = 20 * 60 - (G.hours || 0) * 60; A.lampOn = true;
  A.mirror.fog = 0; A.mirror.face = 0; A.greenTarget = 0; A.win = null;
  nightEv = null;
  Sfx.ticking(false); Sfx.drone(false);
  save(); syncScene(); showHud(true); hud(); hideBottom(); hideScreen();
  await Story.eveningEvent();
  hideBottom();
  if (G.night > 1 && G.money < 25 && Econ.all(G).length === 0 && !G.flags.mercy) {
    G.flags.mercy = true; G.money += 45;
    toast('Под дверью — узелок от Агаты: 45 грошей и записка «Даром. Так надёжнее».', 'good');
  }
  save();
  hubTab = 'news';
  renderHub();
}

/* ---------- ночные окна: лавка и гроссбух ---------- */
function openShop() {
  const render = function () {
    openModal('Лавка: витрина и кладовая', shopHTML(true), function (b) { if (shopAct(b, true)) { syncScene(); hud(); render(); } });
  };
  render();
}
function openLedger() { openModal('Гроссбух', ledgerHTML(phase !== 'evening'), null); Sfx.page(); }
function drinkTea() {
  if (!G || G.tea <= 0) return;
  if (G.sanity >= G.maxSanity) return toast('Рассудок и так ясен — насколько это здесь возможно.');
  if ((G.day.tea || 0) >= 3) return toast('Третья чашка за сутки была лишней: сердце колотится, чай больше не помогает. До завтра.', 'bad');
  G.day.tea = (G.day.tea || 0) + 1;
  G.tea--; Sfx.sip(); addSanity(25); syncScene();
  toast('Чабрец, мята и что-то горькое. Руки перестают дрожать.', 'good');
  if (phase === 'evening' && document.querySelector('.hub')) { save(); renderHub(); }
}
$('#b-tea').addEventListener('click', drinkTea);
$('#b-candle').addEventListener('click', useCandle);
function hudTab(tab, fallback) {
  if (!G) return;
  if (phase === 'evening' && document.querySelector('.hub')) { hubTab = tab; Sfx.page(); renderHub(); }
  else if (phase === 'night' || phase === 'street') fallback();
}
$('#b-shelf').addEventListener('click', function () { hudTab('shop', openShop); });
$('#b-ledger').addEventListener('click', function () { hudTab('ledger', openLedger); });
$('#b-set').addEventListener('click', function () { openSettings(); });

/* ---------- клики по сцене ---------- */
function canvasPos(e) {
  const r = $('#scene').getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * Art.W, y: (e.clientY - r.top) / r.height * Art.H };
}
async function mirrorScare() {
  G.flags.mirrorScare = true;
  A.mirror.fog = 0; A.mirror.face = 1; Sfx.sting();
  await sleep(450);
  await vision('matvey');
  A.mirror.face = 0;
  toast('Из зеркала смотрел дядя Матвей. Он что-то говорил. Слов не разобрать.', 'bad');
}
function lookMirror() {
  const cu = A.customer;
  if (G.flags.mirrorAwake && !G.flags.mirrorScare) return mirrorScare();
  if (A.mirror.fog > 0.5) return toast('Зеркало запотело. Изнутри.');
  if (!cu || cu.alpha < 0.5) return toast(G.sanity < 40 ? 'В зеркале — лавка. И ты. И кто-то за твоим плечом.' : 'В зеркале — пустая лавка и одно усталое лицо. Твоё.');
  if (cu.tells.mirror) toast('В зеркале — прилавок, лампа, дверь. Посетителя в зеркале нет.', 'bad');
  else toast('В зеркале — затылок посетителя. Всё как у людей.');
}
/* клики по вещам в лавке — в room.js */
$('#b-pockets').addEventListener('click', function () {
  if (!G) return;
  Pockets.open(Street.active() ? Street.ctx() : Room.active() ? Room.ctx() : null);
});

/* ---------- клавиатура ---------- */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { if (modalOpen()) closeModal(); return; }
  if (modalOpen()) return;
  if (e.code === 'KeyI' && G && (phase === 'night' || (phase === 'evening' && !Room.active())) && !A.vision) { e.preventDefault(); Pockets.open(null); return; }
  if (bottomMode === 'dlg') {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); }
    else if (/^[1-9]$/.test(e.key) && dlg.choice) dlg.choice(+e.key - 1);
  } else if (bottomMode === 'trade' && tp) {
    if (e.key === 'ArrowLeft') setTradePrice(tp.price - 1);
    else if (e.key === 'ArrowRight') setTradePrice(tp.price + 1);
    else if (e.key === 'ArrowDown') setTradePrice(tp.price - 10);
    else if (e.key === 'ArrowUp') setTradePrice(tp.price + 10);
    else if (e.key === 'Enter') tradeAct('offer');
    else return;
    e.preventDefault();
  } else if (bottomMode === 'sale' && sale) {
    if (e.key === 'Enter' && sale.table.length) { e.preventDefault(); saleAct({ type: 'offer' }); }
  }
});

/* ============================================================
   НАСТРОЙКИ, СПРАВКА, ТИТУЛ
   ============================================================ */
let wipeArmed = 0;
function openSettings() {
  const render = function () {
    openModal('Настройки',
      '<div class="set-row"><label>Громкость</label><input type="range" id="s-vol" min="0" max="100" value="' + Math.round(SET.vol * 100) + '"></div>' +
      '<div class="set-row"><label>Скримеры</label><button data-act="scr">' + (SET.screamers ? 'Включены' : 'Выключены') + '</button><small>Выключено — вместо резкого кадра и крика будет затемнение.</small></div>' +
      '<div class="set-row"><label>Скорость текста</label><input type="range" id="s-spd" min="1" max="4" step="1" value="' + SET.speed + '"></div>' +
      '<div class="set-row"><label>Экран</label><button data-act="fs">Во весь экран</button></div>' +
      (G ? '<div class="set-row"><label>Партия</label><button class="danger" data-act="quit">Выйти в главное меню</button><small>Прогресс сохраняется каждый вечер.</small></div>' : '') +
      (hasSave() ? '<div class="set-row"><label>Сохранение</label><button class="danger" data-act="wipe">Удалить сохранённую игру</button><small>' + (G ? 'Текущая партия будет стёрта, игра вернётся в меню.' : 'Кнопка «Продолжить» исчезнет.') + '</small></div>' : ''),
      function (b) {
        const a = b.dataset.act;
        if (a === 'scr') { SET.screamers = !SET.screamers; saveSettings(); render(); }
        else if (a === 'fs') {
          // на странице по ссылке браузер может не пустить во весь экран — тогда подсказка вместо тихой ошибки
          const no = function () { toast('Здесь браузер не даёт развернуть игру. Попробуй клавишу F11.'); };
          try {
            const p = document.fullscreenElement ? document.exitFullscreen() : (document.fullscreenEnabled !== false && document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen() : (no(), null));
            if (p && p.catch) p.catch(no);
          } catch (e) { no(); }
        }
        else if (a === 'quit') { closeModal(); location.reload(); }
        else if (a === 'wipe') {
          if (now() - wipeArmed > 4000) { wipeArmed = now(); b.textContent = 'Точно удалить? Нажми ещё раз'; Sfx.deny(); return; }
          wipeArmed = 0; wipeSave(); closeModal();
          if (G) location.reload(); else title();
        }
      });
    $('#s-vol').addEventListener('input', function (e) { SET.vol = e.target.value / 100; Sfx.setVolume(SET.vol); saveSettings(); });
    $('#s-vol').addEventListener('change', function () { Sfx.coin(); });
    $('#s-spd').addEventListener('input', function (e) { SET.speed = +e.target.value; saveSettings(); });
  };
  render();
}
function openHow() {
  openModal('Как играть',
    '<div class="how">' +
    '<p>Ты — наследник ломбарда «Последний час» в туманном городе Мглове. За тобой долг дяди, срок — <b>семь ночей</b>. Сумма зависит от сложности.</p>' +
    '<p><b>Вечером</b> читай газету: события двигают цены, слухи подсказывают, что подорожает завтра. Закупайся у Яши, мастери на <b>верстаке</b> (две вещи → одна подороже), раскладывай товар. До темноты есть три часа на <b>город</b>: выйди на улицу и пройдись по Мглову — рынок, травница, часовая мастерская, собор, кладбище, сыскное, пристань. У каждого места свои товары, услуги и тайны. Ходьба времени не тратит: час уходит, только когда заходишь в дом. Найденные места отмечаются на <b>карте</b> — по ней можно сразу перейти к нужной двери. Куда дороги ещё не знаешь, там стоит туман.</p>' +
    '<p><b>Кладовая и витрина.</b> Покупки попадают на витрину, а если она полна — в кладовую. Продаётся только то, что на витрине. В кладовой удобно держать сырьё и то, что не стоит показывать инспектору.</p>' +
    '<p><b>Ночью</b> приходят посетители. Продавцы несут вещи — сбивай цену, но следи за терпением. У покупателя видно, <b>что он ищет и сколько готов потратить</b>: выкладывай вещи с витрины на стол, назначай цены и жми «Назвать цену». Можно продать несколько вещей разом. <b>Скидка</b> растягивает его кошелёк и поднимает репутацию, наценка — испытывает терпение.</p>' +
    '<p><b>Лупа</b> (осмотр) показывает точную цену, подделки, краденое и вещи «с осадком». Наведи курсор на любую вещь, чтобы прочесть её описание.</p>' +
    '<p><b>Не все посетители — люди.</b> Правила дяди записаны в гроссбухе. Смотри на колокольчик, тень, отражение в зеркале (по зеркалу можно кликнуть), глаза и пламя лампы. Пустые платят щедро — и настоящими деньгами. Но каждая сделка с ними стоит рассудка.</p>' +
    '<p><b>Рассудок</b> упал до нуля — конец. Чай и исповедь лечат. Вещи с осадком — калечат (соль и святая вода их очищают).</p>' +
    '<p><b>Расспрашивай.</b> Вопросы в разговорах не исчезают: заданные помечаются галочкой, к ним можно вернуться. Важное записывается в гроссбух, в «Дела и слухи».</p>' +
    '<p>Управление: мышь. <kbd>Пробел</kbd> — дальше, <kbd>1</kbd>–<kbd>9</kbd> — выбор ответа, <kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> — цена в торге, <kbd>Enter</kbd> — предложить.</p>' +
    '<p>На улице: <kbd>←</kbd><kbd>→</kbd> или <kbd>A</kbd><kbd>D</kbd> — идти, <kbd>Shift</kbd> — быстрее, клик по мостовой — идти туда, клик по дому — подойти к двери, <kbd>E</kbd> — войти, <kbd>M</kbd> — карта. В Мглове три улицы: <b>Сенная</b> (твоя лавка), <b>Береговая</b> внизу у реки и <b>Слободская</b> за заставой. В конце улицы — переход на соседнюю.</p>' +
    '<p><b>Город и лавка хранят тайны.</b> Наведи курсор — появится подпись, а то, что поблёскивает, стоит осмотреть. В лавке можно рассмотреть всё: вечером нажми «Оглядеться в лавке». Найденное лежит в <b>карманах</b> (кнопка вверху или <kbd>I</kbd>): там можно прочесть письма и записки, а вещь — взять в руку и приложить к чему-нибудь кликом. Некоторые тайники открываются только головоломкой: подсказки разбросаны по лавке и городу.</p>' +
    '<p>В игре восемь концовок.</p></div>', null);
}
const ABOUT_URL = 'https://claude.ai/artifact/GNryULbNvQUBZ9VTAbrHm5';   // страница-визитка игры
function title() {
  if (typeof Film !== 'undefined') Film.stop();
  phase = 'title'; A.mode = 'title'; A.loc = null; G = null; A.screamer = null; A.customer = null;
  showHud(false); hideBottom(); closeModal(); hideTip();
  const ends = loadEndings();
  let armed = 0;
  showScreen(
    '<div class="title-logo"><div class="logo">ПОСЛЕДНИЙ ЧАС</div><div class="tag">ломбард на краю тумана</div></div>' +
    '<div class="menu"><button data-act="new" class="primary">Новая игра</button>' +
    '<button data-act="cont"' + (hasSave() ? '' : ' disabled') + '>Продолжить</button>' +
    '<button data-act="how">Как играть</button><button data-act="set">Настройки</button>' +
    (hasSave() ? '<button data-act="wipe" class="danger small">Удалить сохранение</button>' : '') + '</div>' +
    '<div class="endings-got">Открыто концовок: <b>' + ends.length + '</b> из ' + ENDINGS_TOTAL + (ends.length ? '<br>' + ends.map(function (id) { return ENDINGS[id] ? ENDINGS[id].title : ''; }).join(' · ') : '') + '</div>' +
    '<div class="warn">Внимание: резкие звуки и вспышки. Скримеры отключаются в настройках. Лучше играть в наушниках.</div>' +
    // в браузерной версии (по ссылке) — ссылка на страницу-визитку; в файловой и будущей стим-сборке её нет
    (/^https?:$/.test(location.protocol) ? '<a class="title-about" href="' + ABOUT_URL + '" target="_blank" rel="noopener">Об игре ↗</a>' : ''),
    '', function (b) {
      if (!b) return;
      const a = b.dataset.act; Sfx.click();
      if (a === 'new') newGame();
      else if (a === 'cont') continueGame();
      else if (a === 'how') openHow();
      else if (a === 'set') openSettings();
      else if (a === 'wipe') {
        if (now() - armed > 4000) { armed = now(); b.textContent = 'Точно удалить? Нажми ещё раз'; return; }
        wipeSave(); title();
      }
    });
}
function chooseDiff() {
  return new Promise(function (res) {
    let h = '<div class="diff"><h1>Сколько задолжал дядя?</h1><div class="diff-row">';
    ['easy', 'normal', 'hard'].forEach(function (id) {
      const d = Econ.DIFF[id];
      h += '<button data-d="' + id + '"><b>' + d.name + '</b><span>долг ' + d.debt + ' · ' + Math.round(d.rate * 100) + '% в сутки</span><small>' + d.note + '</small></button>';
    });
    h += '</div><button data-act="back">Назад</button>' + (hasSave() ? '<p>Новая партия заменит сохранённую.</p>' : '') + '</div>';
    showScreen(h, 'black', function (b) {
      if (!b) return;
      Sfx.click();
      if (b.dataset.act === 'back') res(null);
      else if (b.dataset.d) res(b.dataset.d);
    });
  });
}
async function slides(list) {
  showScreen('<div class="slides"><div class="slide-text"></div><div class="slide-hint">▼</div></div>', 'black');
  const tx = document.querySelector('.slide-text');
  for (let n = 0; n < list.length; n++) {
    const text = list[n];
    await new Promise(function (res) {
      let i = 0, typing = true;
      const t = setInterval(function () {
        i += TS < 1 ? 60 : 1; tx.textContent = text.slice(0, i);
        if (i % 3 === 0) Sfx.blip(160);
        if (i >= text.length) { clearInterval(t); typing = false; tx.textContent = text; }
      }, Math.max(4, Math.round(52 / SET.speed)));
      screenHandler = function () {
        if (typing) { clearInterval(t); typing = false; tx.textContent = text; }
        else { screenHandler = null; res(); }
      };
    });
  }
  hideScreen();
}
async function newGame() {
  const d = await chooseDiff();
  if (!d) return title();
  phase = 'intro';
  G = Econ.newGame(d);
  await Story.intro();
  evening();
}
function continueGame() {
  try { G = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { G = null; }
  if (!G || G.v !== 2) { G = null; wipeSave(); return title(); }
  Econ.setDiff(G.diff);
  evening();
}

/* ---------- концовка ---------- */
async function ending(id) {
  Street.stop(); Room.exit(true);
  phase = 'ending';
  Sfx.ticking(false); Sfx.drone(false); hideBottom(); closeModal(); hideScreen();
  if (id === 'mad') await screamer('eyes', { free: true });
  if (id === 'pawn') await vision('pawn', { free: true });
  A.customer = null; A.item = null; A.mirror.fog = 0; A.mirror.face = 0; A.dark = 0; A.greenTarget = 0;
  showHud(false);
  const E = ENDINGS[id] || ENDINGS.keeper;
  try {
    localStorage.removeItem(SAVE_KEY);
    const got = loadEndings(); const key = E.key || id;
    if (got.indexOf(key) < 0) { got.push(key); localStorage.setItem(END_KEY, JSON.stringify(got)); }
  } catch (e) {}
  if (E.loc) { A.mode = 'loc'; A.loc = E.loc; } else { A.mode = 'shop'; A.loc = null; }
  // концовка — видеозаставкой: абзацы идут субтитрами, потом итоговая карточка поверх последнего кадра
  const film = typeof Film !== 'undefined' && Film.has(id);
  let skipped = true;
  if (film) { skipped = await Film.play(id, { hold: true }); if (E.good) A.dawn = 1; }
  else if (E.good) { A.dawn = 1; A.lampOn = false; Sfx.dawn(); if (E.bell) { Sfx.bigBell(); later(1800, Sfx.bigBell); later(3600, Sfx.bigBell); } } else Sfx.sting();
  const s = G.stats;
  let html = '<div class="ending' + (E.bad ? ' bad' : '') + (film ? ' over-film' : '') + '"><h1>' + E.title + '</h1><div class="num">концовка ' + E.n + ' из ' + ENDINGS_TOTAL + ' · сложность: ' + B.name.toLowerCase() + '</div>';
  if (!film || skipped) E.text.forEach(function (p, i) { html += '<p style="animation-delay:' + ((0.8 + i * 1.8) * TS).toFixed(2) + 's">' + esc(p) + '</p>'; });
  const nP = (!film || skipped) ? E.text.length : 0;
  html += '<div class="stats" style="animation-delay:' + ((0.8 + nP * 1.8) * TS).toFixed(2) + 's">Ночей прожито: ' + Math.min(7, G.night) + ' · сделок: ' + (s.bought + s.sold) + ' · выручено: ' + s.earned +
    ' · выплачено Кредитору: ' + G.paid + '<br>Зарубок на косяке: ' + G.marks + ' · Пустых выставлено: ' + G.hollowRefused + ' · собрано на верстаке: ' + s.crafted + ' · скримеров пережито: ' + s.screams +
    '</div><button data-act="menu">В главное меню</button></div>';
  showScreen(html, film ? 'film-end' : (E.good ? 'soft' : 'black'), function (b) { if (b && b.dataset.act === 'menu') { A.lampOn = true; A.dawn = 0; title(); } });
}

/* ---------- запуск ---------- */
function frame() { const t = performance.now(); Street.update(t); Art.render(t); requestAnimationFrame(frame); }
function boot() {
  loadSettings();
  Art.init($('#scene'));
  fit();
  const first = function () { Sfx.init(); Sfx.setVolume(SET.vol); Sfx.startAmbient(); };
  document.addEventListener('pointerdown', first);
  document.addEventListener('keydown', first);
  requestAnimationFrame(frame);
  title();
  if (/[?&]t=/.test(location.search)) { const s = document.createElement('script'); s.src = 'js/dev.js'; document.body.appendChild(s); }
}
window.addEventListener('DOMContentLoaded', boot);
