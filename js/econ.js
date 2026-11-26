'use strict';
/* ============================================================
   ЭКОНОМИКА: рынок, оценка, торг, кладовая/витрина, верстак,
   генерация ночи. Чистая логика без DOM — работает и в Node.
   ============================================================ */
if (typeof require !== 'undefined' && typeof CATS === 'undefined') {
  Object.assign(globalThis, require('./data.js'));
}

const Econ = {};

Econ.rnd = function (a, b) { return a + Math.random() * (b - a); };
Econ.irnd = function (a, b) { return Math.floor(Econ.rnd(a, b + 1)); };
Econ.chance = function (p) { return Math.random() < p; };
Econ.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
Econ.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
Econ.wpick = function (arr, wf) {
  let sum = 0;
  const ws = arr.map(function (x) { const w = Math.max(0, wf(x)); sum += w; return w; });
  if (sum <= 0) return arr[0];
  let r = Math.random() * sum;
  for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
};
Econ.shuffle = function (a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};

/* ---------- Константы баланса и уровни сложности ---------- */
Econ.BASE = {
  nights: 7,
  humans: [5, 6, 7, 7, 7, 8, 5],        // живых посетителей за ночь
  hollows: [0, 1, 2, 2, 2, 3, 2],
  hollowSanity: 10, hollowMaxSanity: 5,
  cursedDrain: 6, nightDrain: 4,
  weissMult: 1.7,
  hours: 3,                              // вечерних часов на прогулки по городу
  satur: 0.94                            // каждая продажа сбивает цену категории
};
Econ.DIFF = {
  easy: { name: 'Лёгкая', note: 'Долг меньше, покупатели щедрее, туман милосерднее. Чтобы посмотреть сюжет.',
    debt: 700, rate: 0.03, ratedNamed: 0.05, due: { 3: 100, 5: 330 }, startMoney: 240,
    buyMult: 1.18, purse: 1.2, hollowAdd: 0, drain: 0.75, oil: 8, tellsAdd: 1, insp: 3 },
  normal: { name: 'Обычная', note: 'Честной торговли хватает впритык. Придётся считать, мастерить и ходить по городу.',
    debt: 1200, rate: 0.05, ratedNamed: 0.08, due: { 3: 180, 5: 560 }, startMoney: 200,
    buyMult: 1.06, purse: 1.0, hollowAdd: 0, drain: 1, oil: 12, tellsAdd: 0, insp: 2 },
  hard: { name: 'Тяжёлая', note: 'Долг огромен, кошельки тощие, Пустых больше и распознать их труднее.',
    debt: 1600, rate: 0.06, ratedNamed: 0.09, due: { 3: 260, 5: 800 }, startMoney: 170,
    buyMult: 1.0, purse: 0.9, hollowAdd: 1, drain: 1.3, oil: 15, tellsAdd: -1, insp: 2 }
};
Econ.B = {};
Econ.setDiff = function (id) {
  const d = Econ.DIFF[id] || Econ.DIFF.normal;
  Object.keys(Econ.B).forEach(function (k) { delete Econ.B[k]; });
  Object.assign(Econ.B, Econ.BASE, d);
  Econ.B.id = Econ.DIFF[id] ? id : 'normal';
};
Econ.setDiff('normal');

/* ---------- Новая игра ---------- */
Econ.newGame = function (diff) {
  Econ.setDiff(diff);
  const B = Econ.B;
  const s = {
    v: 2, diff: B.id,
    night: 1, money: B.startMoney, debt: B.debt, paid: 0, rate: B.rate, named: false, strikes: 0,
    sanity: 100, maxSanity: 100, rep: 50, marks: 0,
    shelf: [], store: [], slots: 8, storeSlots: 12, tableSlots: 4,
    tea: 1, salt: 0, kit: 0, candle: 0,
    upg: {},
    market: {}, mods: { wealth: 1, desperate: 1, extra: 0 },
    eventId: 'open', nextEventId: null, rumor: '', rumorTrue: true, usedEvents: ['open'],
    yasha: [], batch: false, mkt: [], finds: [], order: null, hours: B.hours, day: {},
    key: {}, flags: {}, asked: {}, recipes: {}, gradov: 0, agata: 0, bell: 0, weissSold: 0,
    hollowServed: 0, hollowRefused: 0, humansRefused: 0,
    uid: 1,
    stats: { bought: 0, sold: 0, earned: 0, spent: 0, bestDeal: 0, screams: 0, crafted: 0 }
  };
  CAT_KEYS.forEach(function (k) { s.market[k] = 1; });
  RECIPES.forEach(function (r) { if (r.src === 'start') s.recipes[r.id] = true; });
  Econ.prepareDay(s, true);
  return s;
};

/* ---------- Рынок и новый день ---------- */
Econ.prepareDay = function (s, first) {
  if (!first) {
    const ev = EVENT_BY_ID[s.nextEventId] || EVENT_BY_ID.open;
    s.eventId = ev.id;
    CAT_KEYS.forEach(function (k) {
      let m = 1 + (s.market[k] - 1) * 0.45;       // вчерашний ажиотаж остывает
      m *= (ev.fx[k] || 1);
      m *= Econ.rnd(0.95, 1.05);
      s.market[k] = Econ.clamp(m, 0.5, 2.1);
    });
    s.mods = { wealth: ev.wealth || 1, desperate: ev.desperate || 1, extra: ev.extra || 0 };
  }
  // событие на завтра + слух
  const pool = EVENTS.filter(function (e) { return s.usedEvents.indexOf(e.id) < 0; });
  const next = pool.length ? Econ.pick(pool) : Econ.pick(EVENTS.slice(1));
  s.nextEventId = next.id;
  s.usedEvents.push(next.id);
  if (Econ.chance(0.8) || pool.length < 2) {
    s.rumor = next.rumor; s.rumorTrue = true;
  } else {
    const liar = Econ.pick(pool.filter(function (e) { return e.id !== next.id; }));
    s.rumor = liar.rumor; s.rumorTrue = false;
  }
  s.yasha = Econ.yashaStock(s);
  s.batch = (s.night === 5 && !s.flags.yashaGone);
  s.mkt = Econ.marketStock(s);
  s.finds = Econ.graveFinds(s);
  s.hours = Econ.B.hours;
  s.day = {};
  s.insp = Econ.B.insp + (s.upg.loupe ? 2 : 0);
  // заказ: «принесите к завтрашней ночи»
  if (s.order && s.order.due < s.night) s.order = null;
  if (!s.order && s.night < Econ.B.nights && Econ.chance(0.7)) s.order = Econ.makeOrder(s);
};

Econ.def = function (it) { return ITEM_BY_ID[it.id]; };

/* Цена вещи, будь она подлинной */
Econ.faceValue = function (s, it) {
  const d = ITEM_BY_ID[it.id];
  return d.base * CONDS[it.cond].m * s.market[d.cat];
};
/* Настоящая рыночная цена */
Econ.realValue = function (s, it) {
  return Econ.faceValue(s, it) * (it.fake ? 0.15 : 1);
};
/* То, что видит игрок: вилка или точная цена после осмотра */
Econ.estimate = function (s, it) {
  if (it.known && it.known.exact) {
    const v = Math.max(1, Math.round(Econ.realValue(s, it)));
    return { exact: v, lo: v, hi: v, mid: v };
  }
  const w = s.upg.scales ? 0.09 : 0.27;
  const c = Econ.faceValue(s, it) * (1 + it.bias * w);
  const lo = Math.max(1, Math.round(c * (1 - w))), hi = Math.max(2, Math.round(c * (1 + w)));
  return { exact: 0, lo: lo, hi: hi, mid: Math.round((lo + hi) / 2) };
};

Econ.makeItem = function (s, id, o) {
  o = o || {};
  return {
    uid: s.uid++, id: id,
    cond: o.cond != null ? o.cond : Econ.wpick([0, 1, 2], function (c) { return [0.3, 0.5, 0.2][c]; }),
    fake: !!o.fake, cursed: !!o.cursed, stolen: !!o.stolen,
    bias: Econ.rnd(-0.6, 0.6),
    known: o.known || {}, cost: 0
  };
};
Econ.inspect = function (it) {
  it.known = { exact: true, fake: it.fake, cursed: it.cursed, stolen: it.stolen };
};
Econ.wild = function (cat) { return ITEMS.filter(function (d) { return !d.craft && (!cat || d.cat === cat); }); };

/* ---------- Кладовая и витрина ---------- */
Econ.all = function (s) { return s.shelf.concat(s.store); };
Econ.room = function (s) { return (s.slots - s.shelf.length) + (s.storeSlots - s.store.length); };
Econ.home = function (s, it) { return s.shelf.indexOf(it) >= 0 ? 'shelf' : s.store.indexOf(it) >= 0 ? 'store' : null; };
Econ.addItem = function (s, it, prefer) {
  const order = prefer === 'store' ? ['store', 'shelf'] : ['shelf', 'store'];
  for (let i = 0; i < 2; i++) {
    const z = order[i], cap = z === 'shelf' ? s.slots : s.storeSlots;
    if (s[z].length < cap) { s[z].push(it); return z; }
  }
  return null;
};
Econ.removeItem = function (s, it) {
  let i = s.shelf.indexOf(it);
  if (i >= 0) { s.shelf.splice(i, 1); return true; }
  i = s.store.indexOf(it);
  if (i >= 0) { s.store.splice(i, 1); return true; }
  return false;
};
Econ.moveItem = function (s, it) {                 // витрина <-> кладовая
  const from = Econ.home(s, it);
  if (!from) return false;
  const to = from === 'shelf' ? 'store' : 'shelf', cap = to === 'shelf' ? s.slots : s.storeSlots;
  if (s[to].length >= cap) return false;
  s[from].splice(s[from].indexOf(it), 1); s[to].push(it);
  return true;
};
Econ.findById = function (s, id) {
  return Econ.all(s).filter(function (it) { return it.id === id; });
};

/* ---------- Что принёс продавец ---------- */
Econ.genSellerItem = function (s, arch, hollow) {
  const cat = Econ.pick(arch.sells.length ? arch.sells : CAT_KEYS);
  const defs = Econ.wild(cat);
  // к поздним ночам дорогие вещи встречаются чаще
  const k = 0.5 - s.night * 0.06;
  const d = Econ.wpick(defs, function (x) { return 1 / Math.pow(x.base, k); });
  const fakeable = d.base >= 60 && d.cat !== 'med' && d.cat !== 'charm';
  return Econ.makeItem(s, d.id, {
    fake: !hollow && fakeable && Econ.chance(arch.fake),
    cursed: hollow ? true : Econ.chance(Math.min(0.9, d.curse * arch.curseM)),
    stolen: !hollow && Econ.chance(arch.stolen)
  });
};

/* ---------- Торг: посетитель продаёт игроку ---------- */
Econ.sellerDeal = function (s, arch, it, hollow) {
  const P = Econ.faceValue(s, it);
  let ask, res, patience;
  if (hollow) {
    ask = Math.max(3, Math.round(P * Econ.rnd(0.12, 0.22)));
    res = Math.max(1, Math.round(ask * 0.4));
    patience = 9;
  } else {
    ask = Math.max(3, Math.round(P * arch.ask * Econ.rnd(0.92, 1.08)));
    res = Math.round(P * arch.res * Econ.rnd(0.88, 1.12) * s.mods.desperate);
    if (it.fake && arch.fake >= 0.2) res = Math.round(res * 0.55);   // жулик знает, что сбывает
    res = Math.max(1, Math.min(res, ask - 1));
    patience = arch.patience;
  }
  return { kind: 'sell', ask: ask, res: res, patience: patience, maxPatience: patience, face: P };
};
Econ.sellerOffer = function (deal, x) {
  if (x >= deal.ask) return { type: 'accept', price: deal.ask };
  if (x >= deal.res) return { type: 'accept', price: x };
  const insult = x < deal.res * 0.5;
  deal.patience -= insult ? 2 : 1;
  if (deal.patience <= 0) return { type: 'leave', insult: insult };
  deal.ask = Math.max(Math.ceil(deal.res * 1.1), Math.round(deal.ask - (deal.ask - deal.res) * Econ.rnd(0.3, 0.5)));
  return { type: 'counter', price: deal.ask, insult: insult };
};

/* ---------- Покупатель: интересы, кошелёк, готовность платить ---------- */
Econ.repFactor = function (s) { return 0.9 + s.rep / 100 * 0.25; };
/* Что хочет покупатель: горячие категории и то, что выставлено на витрине, — вероятнее */
Econ.pickWant = function (s, arch) {
  const cats = arch.buys.length ? arch.buys : CAT_KEYS;
  return Econ.wpick(cats, function (c) {
    const has = s.shelf.some(function (it) { return ITEM_BY_ID[it.id].cat === c; });
    return s.market[c] * (has ? 2.6 : 1);
  });
};
Econ.buyerProfile = function (s, arch, hollow) {
  const B = Econ.B;
  if (hollow) {
    return { hollow: true, wants: CAT_KEYS.slice(), second: [], budget: Math.round(Econ.rnd(170, 290) * (1 + s.night * 0.08)),
      k: Econ.rnd(1.55, 1.95), patience: 9, maxPatience: 9, spent: 0, bought: 0, disc: 0, noise: {} };
  }
  const main = Econ.pickWant(s, arch);
  const others = arch.buys.filter(function (c) { return c !== main; });
  const second = others.length && Econ.chance(0.7) ? [Econ.pick(others)] : [];
  const purse = (arch.purse || 80) * Econ.rnd(0.8, 1.25) * (1 + (s.night - 1) * 0.07) * s.mods.wealth * B.purse * (0.92 + s.rep / 100 * 0.2);
  return { hollow: false, wants: [main], second: second, budget: Math.max(12, Math.round(purse)),
    k: arch.max * B.buyMult * Econ.rnd(0.93, 1.07) * Econ.repFactor(s) * s.mods.wealth,
    patience: arch.patience, maxPatience: arch.patience, spent: 0, bought: 0, disc: 0, noise: {} };
};
/* 1 — то, за чем пришёл; 0.85 — тоже любопытно; 0.5 — возьмёт разве что по дешёвке */
Econ.match = function (prof, it) {
  const c = ITEM_BY_ID[it.id].cat;
  return prof.hollow || prof.wants.indexOf(c) >= 0 ? 1 : prof.second.indexOf(c) >= 0 ? 0.85 : 0.5;
};
Econ.wtp = function (s, prof, it) {
  if (!prof.noise[it.uid]) prof.noise[it.uid] = Econ.rnd(0.92, 1.08);
  return Math.max(1, Math.round(Econ.faceValue(s, it) * Econ.match(prof, it) * prof.k * prof.noise[it.uid]));
};
/* Скидка от рыночной оценки растягивает кошелёк: −10% к цене → +15% к тому, что он готов оставить в лавке */
Econ.cartDiscount = function (offers) {
  let r = 0, p = 0;
  offers.forEach(function (o) { r += o.ref; p += Math.min(o.price, o.ref); });
  return r > 0 ? Math.max(0, 1 - p / r) : 0;
};
Econ.budgetBonus = function (prof, disc) { return Math.round(prof.budget * Math.min(0.45, 1.5 * disc)); };
Econ.budgetLeft = function (prof) { return prof.budget + Econ.budgetBonus(prof, prof.disc) - prof.spent; };
/* offers: [{it, price, ref}] — что лежит на столе и почём. Ничего не продаёт сам: решает, что возьмут. */
Econ.cartOffer = function (s, prof, offers) {
  prof.disc = Math.max(prof.disc, Econ.cartDiscount(offers));
  let left = Econ.budgetLeft(prof);
  const res = { sold: [], rejected: [], insult: false };
  const cand = [];
  offers.forEach(function (o) {
    const w = Econ.wtp(s, prof, o.it), m = Econ.match(prof, o.it);
    if (o.price <= w) cand.push({ o: o, w: w, m: m });
    else if (m < 0.6 && o.price > w * 1.3) res.rejected.push({ it: o.it, why: 'cat', counter: 0 });
    else {
      const ins = o.price > w * 1.8;
      if (ins) res.insult = true;
      res.rejected.push({ it: o.it, why: 'price', counter: ins ? 0 : Math.max(1, Math.round(w * Econ.rnd(0.86, 0.97))) });
    }
  });
  cand.sort(function (a, b) { return (b.m - a.m) || ((b.w - b.o.price) / b.w - (a.w - a.o.price) / a.w); });
  cand.forEach(function (c) {
    if (c.o.price <= left) { left -= c.o.price; res.sold.push({ it: c.o.it, price: c.o.price }); }
    else res.rejected.push({ it: c.o.it, why: 'budget', counter: (left >= c.o.price * 0.7 && left >= 2) ? left : 0 });
  });
  if (res.rejected.some(function (r) { return r.why === 'price'; })) prof.patience -= res.insult ? 2 : 1;
  res.left = left;
  res.leave = prof.patience <= 0;
  return res;
};
Econ.cartCommit = function (s, prof, it, price) {
  Econ.sellItem(s, it, price);
  prof.spent += price; prof.bought++;
};

/* ---------- Сделки ---------- */
Econ.buyItem = function (s, it, price, prefer) {
  const z = Econ.addItem(s, it, prefer);
  if (!z) return null;
  s.money -= price; it.cost = price;
  s.stats.bought++; s.stats.spent += price;
  if (s.log) s.log.spent += price;
  return z;
};
Econ.sellItem = function (s, it, price) {
  Econ.removeItem(s, it);
  s.money += price;
  const cat = ITEM_BY_ID[it.id].cat;
  s.market[cat] = Math.max(0.5, s.market[cat] * Econ.B.satur);        // рынок насыщается
  s.stats.sold++; s.stats.earned += price;
  s.stats.bestDeal = Math.max(s.stats.bestDeal, price - (it.cost || 0));
  if (s.log) { s.log.earned += price; s.log.profit += price - (it.cost || 0); }
};
Econ.weissPrice = function (s, it) {
  return Math.round(Econ.faceValue(s, it) * (it.fake ? 1.1 : Econ.B.weissMult));
};
/* Фрося берёт что угодно, но за полцены; подделку чует сразу */
Econ.junkPrice = function (s, it) {
  return Math.max(1, Math.round(Econ.realValue(s, it) * (s.rep >= 60 ? 0.55 : 0.5)));
};

Econ.addSanity = function (s, d) {
  s.sanity = Econ.clamp(Math.round(s.sanity + d), 0, s.maxSanity);
  if (s.log && d < 0) s.log.sanityLost += -d;
};
Econ.addRep = function (s, d) { s.rep = Econ.clamp(s.rep + d, 0, 100); };
Econ.mark = function (s) {
  s.marks++; s.hollowServed++;
  s.maxSanity = Math.max(20, s.maxSanity - Econ.B.hollowMaxSanity);
  Econ.addSanity(s, -Econ.markCost(s));          // каждая следующая зарубка обходится дороже
};
Econ.markCost = function (s) { return Econ.B.hollowSanity + 2 * Math.max(0, s.marks - 1); };
Econ.MARK_LIMIT = 3;                              // больше зарубок — и лавка считает хозяина своим
Econ.payDebt = function (s, amt) {
  amt = Math.max(0, Math.min(amt, s.money, s.debt));
  s.money -= amt; s.debt -= amt; s.paid += amt;
  return amt;
};
Econ.dueNow = function (s) {
  const d = Econ.B.due[s.night];
  return d ? Math.max(0, Math.min(d - s.paid, s.debt)) : 0;
};

/* ---------- Поставщики ---------- */
Econ.yashaStock = function (s) {
  if (s.flags.yashaGone) return [];
  const n = s.night >= 4 ? 6 : 5;
  const cats = Econ.shuffle(CAT_KEYS.slice());
  const out = [];
  for (let i = 0; i < n; i++) {
    const cat = cats[i % cats.length];
    const d = Econ.wpick(Econ.wild(cat), function (x) { return 1 / Math.pow(x.base, 0.45); });
    const hot = i >= n - 2 && Econ.chance(0.6) && d.cat !== 'med';
    const it = Econ.makeItem(s, d.id, { stolen: hot, cond: Econ.wpick([0, 1, 2], function (c) { return [0.2, 0.55, 0.25][c]; }) });
    it.known = { exact: true, fake: false, cursed: false, stolen: hot };
    it.price = Math.max(2, Math.round(Econ.faceValue(s, it) * (hot ? Econ.rnd(0.42, 0.52) : Econ.rnd(0.62, 0.8)) * (s.flags.yashaFriend ? 0.9 : 1)));
    out.push(it);
  }
  return out;
};
/* «Партия с кладбища» — три диковины с осадком, оптом */
Econ.graveBatch = function (s) {
  const defs = ITEMS.filter(function (d) { return !d.craft && (d.cat === 'curio' || d.id === 'grimoire'); });
  const out = [];
  for (let i = 0; i < 3; i++) {
    const it = Econ.makeItem(s, Econ.pick(defs).id, { cursed: true, cond: Econ.irnd(0, 1) });
    it.known = { exact: true, fake: false, cursed: true, stolen: false };
    out.push(it);
  }
  return out;
};
/* Сенной рынок: чистый товар почти по рыночной цене */
Econ.marketStock = function (s) {
  const cats = Econ.shuffle(CAT_KEYS.slice()).slice(0, 4);
  return cats.map(function (cat) {
    const d = Econ.wpick(Econ.wild(cat), function (x) { return 1 / Math.pow(x.base, 0.35); });
    const it = Econ.makeItem(s, d.id, { cond: Econ.wpick([0, 1, 2], function (c) { return [0.25, 0.55, 0.2][c]; }) });
    it.known = { exact: true, fake: false, cursed: false, stolen: false };
    it.price = Math.max(2, Math.round(Econ.faceValue(s, it) * Econ.rnd(0.84, 0.96)));
    return it;
  });
};
/* Кладбище: находки Прохора — дёшево, но с землёй и не только */
Econ.graveItem = function (s, curseBonus) {
  const d = Econ.wpick(ITEMS.filter(function (x) { return !x.craft && (x.cat === 'jewel' || x.cat === 'curio' || x.cat === 'charm'); }),
    function (x) { return 1 / Math.pow(x.base, 0.3); });
  return Econ.makeItem(s, d.id, { cond: Econ.irnd(0, 1), cursed: Econ.chance(Math.min(0.92, d.curse * 2 + curseBonus)), stolen: Econ.chance(0.2) });
};
Econ.graveFinds = function (s) {
  const out = [];
  for (let i = 0; i < 2; i++) {
    const it = Econ.graveItem(s, 0.25);
    it.price = Math.max(3, Math.round(Econ.faceValue(s, it) * Econ.rnd(0.34, 0.46)));
    out.push(it);
  }
  return out;
};
/* Пристань: что принесли сети */
Econ.riverItem = function (s) {
  const d = Econ.wpick(ITEMS.filter(function (x) { return !x.craft && (x.cat === 'curio' || x.cat === 'ware' || x.cat === 'jewel' || x.cat === 'charm'); }),
    function (x) { return 1 / Math.pow(x.base, 0.7); });
  return Econ.makeItem(s, d.id, { cond: Econ.wpick([0, 1], function (c) { return [0.65, 0.35][c]; }), cursed: Econ.chance(Math.min(0.9, 0.3 + d.curse)) });
};

/* ---------- Заказы ---------- */
Econ.makeOrder = function (s) {
  const known = RECIPES.filter(function (r) { return s.recipes[r.id] && !r.cons; });
  let id;
  if (known.length && Econ.chance(0.4)) id = Econ.pick(known).id;
  else id = Econ.pick(ITEMS.filter(function (d) { return !d.craft && d.base >= 30 && d.base <= 220; })).id;
  const cat = ITEM_BY_ID[id].cat;
  const archs = ARCH.filter(function (a) { return a.buys.indexOf(cat) >= 0; });
  return { id: id, due: s.night + 1, mult: Math.round(Econ.rnd(1.55, 1.85) * 100) / 100, arch: (archs.length ? Econ.pick(archs) : ARCH_BY_ID.merchant).id };
};
Econ.orderPrice = function (s, o, it) {
  return Math.max(5, Math.round(Econ.faceValue(s, it) * o.mult));
};

/* ---------- Верстак ---------- */
Econ.craftInputs = function (s, r) {
  const take = function (id, skip) {
    const pool = s.store.concat(s.shelf).filter(function (it) { return it.id === id && it !== skip; });
    return pool.length ? pool[0] : null;
  };
  const a = take(r.a, null), b = r.b ? take(r.b, a) : null;
  const salt = !r.useSalt || s.salt > 0;
  return { a: a, b: b, salt: salt, ok: !!a && (!r.b || !!b) && salt };
};
Econ.craft = function (s, r) {
  const inp = Econ.craftInputs(s, r);
  if (!inp.ok) return null;
  Econ.removeItem(s, inp.a);
  if (inp.b) Econ.removeItem(s, inp.b);
  if (r.useSalt) s.salt--;
  s.stats.crafted++;
  if (r.cons) { s[r.cons] = (s[r.cons] || 0) + (r.n || 1); return { cons: r.cons, n: r.n || 1 }; }
  const a = inp.a, b = inp.b, d = ITEM_BY_ID[r.id];
  const inherited = a.cursed || b.cursed;
  const woke = !inherited && d.curse >= 0.3 && Econ.chance(0.35);       // в такие вещи вселяется само
  const it = Econ.makeItem(s, r.id, { cond: Math.floor((a.cond + b.cond) / 2), cursed: inherited || woke, fake: a.fake || b.fake, stolen: false });
  const exact = !!(a.known.exact && b.known.exact);
  it.known = { exact: exact, fake: exact && it.fake, cursed: (a.cursed && a.known.cursed) || (b.cursed && b.known.cursed) || false, stolen: false };
  it.cost = (a.cost || 0) + (b.cost || 0);
  Econ.addItem(s, it, 'store');
  return { item: it, woke: woke };
};
Econ.canRepair = function (it) { return it.cond < 2 && ITEM_BY_ID[it.id].cat !== 'med'; };
Econ.repair = function (s, it) {
  if (s.kit <= 0 || !Econ.canRepair(it)) return false;
  s.kit--; it.cond++;
  return true;
};

/* ---------- Состав ночи ---------- */
Econ.STORY = {
  1: [['agata1', 0]],
  2: [['tasya1', 1], ['gradov1', 3]],
  3: [['weiss1', 1]],
  4: [['agata2', 0], ['prohor', 2], ['gradov2', 4]],
  5: [['weiss2', 1]],
  6: [['tasya2', 1], ['gradov3', 3], ['mirror', 5]],
  7: []
};
Econ.TELLS = ['bell', 'mirror', 'shadow', 'eyes', 'lamp'];

Econ.buildNight = function (s) {
  const n = s.night, B = Econ.B;
  const story = (Econ.STORY[n] || []).slice();
  if (n === 6 && s.flags.decoySold) story.push(['weissHollow', 4]);
  const hollowN = B.hollows[n - 1] + (n >= 2 ? B.hollowAdd : 0) + Math.min(2, Math.floor(s.marks / 3));
  const humanN = Math.max(3, B.humans[n - 1] + s.mods.extra + (s.rep >= 70 ? 1 : 0) - (s.rep < 30 ? 1 : 0));
  const list = [];

  // живые
  const humans = [];
  for (let i = 0; i < humanN; i++) {
    const arch = Econ.wpick(ARCH, function (a) { return a.w; });
    const mode = Econ.chance(arch.bw / (arch.sw + arch.bw)) ? 'buy' : 'sell';
    humans.push({ type: 'human', arch: arch.id, mode: mode });
  }
  // не меньше половины покупателей, но хотя бы один продавец
  let buyers = humans.filter(function (h) { return h.mode === 'buy'; }).length;
  for (let i = 0; i < humans.length && buyers < Math.ceil(humanN * 0.55); i++) {
    if (humans[i].mode === 'sell' && ARCH_BY_ID[humans[i].arch].buys.length) { humans[i].mode = 'buy'; buyers++; }
  }
  if (buyers === humans.length && humans.length > 1) {
    const h = humans.find(function (x) { return ARCH_BY_ID[x.arch].sells.length; });
    if (h) h.mode = 'sell';
  }
  // пустые
  const tellsN = function () {
    let k;
    if (n <= 2) k = 3;
    else if (n === 3) k = Econ.irnd(2, 3);
    else if (n === 4) k = 2;
    else if (n <= 6) k = Econ.irnd(1, 2);
    else k = 1;
    return Econ.clamp(k + B.tellsAdd, 1, 4);
  };
  const hollows = [];
  for (let i = 0; i < hollowN; i++) {
    const tells = Econ.shuffle(Econ.TELLS.slice()).slice(0, tellsN());
    if (s.upg.bell && tells.indexOf('bell') < 0) tells[0] = 'bell';
    hollows.push({ type: 'hollow', arch: Econ.pick(ARCH).id, mode: Econ.chance(0.5) ? 'sell' : 'buy', tells: tells });
  }
  // перемешиваем, но первым всегда идёт живой
  const rest = Econ.shuffle(humans.slice(1).concat(hollows));
  list.push(humans[0]);
  rest.forEach(function (x) { list.push(x); });
  // заказчик
  if (s.order && s.order.due === n) list.splice(Math.min(2, list.length), 0, { type: 'order' });
  // сюжетные встречи — на свои места
  story.forEach(function (p) {
    const pos = Math.min(p[1], list.length);
    list.splice(pos, 0, { type: 'story', id: p[0] });
  });
  if (n === 1) list.push({ type: 'story', id: 'hollow1' });
  if (n === 3) list.push({ type: 'story', id: 'creditor1' });
  if (n === 5) list.push({ type: 'story', id: 'creditor2' });
  return list;
};

/* ---------- Рассвет ---------- */
Econ.cursedDrain = function (s) {
  const B = Econ.B;
  const a = s.shelf.filter(function (it) { return it.cursed; }).length;
  const b = s.store.filter(function (it) { return it.cursed; }).length;
  let drain = a * B.cursedDrain + b * Math.ceil(B.cursedDrain / 2);     // в кладовой, под замком, тянет вдвое слабее
  if (s.key.doll === 'ward') drain = Math.max(0, drain - B.cursedDrain);
  return { shelf: a, store: b, drain: Math.round(drain * B.drain) };
};
Econ.dawn = function (s) {
  const B = Econ.B, r = { lines: [] };
  // керосин
  const oil = Math.min(s.money, B.oil);
  s.money -= oil; r.oil = oil;
  if (oil < B.oil) { Econ.addSanity(s, -8); r.lines.push(['Керосина не хватило. Ты досиживаешь ночь в темноте.', -8]); }
  // бессонница
  Econ.addSanity(s, -Math.round(B.nightDrain * B.drain));
  // вещи с осадком
  Econ.all(s).forEach(function (it) {
    if (it.cursed && !it.known.cursed) {
      it.known.cursed = true;
      r.lines.push(['Всю ночь шептало: «' + ITEM_BY_ID[it.id].name + '». Теперь ты знаешь, что с ней не так.', 0]);
    }
  });
  const cd = Econ.cursedDrain(s);
  r.cursed = cd.shelf + cd.store; r.drain = cd.drain;
  if (cd.drain) Econ.addSanity(s, -cd.drain);
  // жалобы на подделки
  r.complaints = 0;
  (s.soldFakes || []).forEach(function () { if (Econ.chance(0.5)) { r.complaints++; Econ.addRep(s, -4); } });
  s.soldFakes = [];
  // проценты
  r.interest = 0;
  if (s.debt > 0) { r.interest = Math.ceil(s.debt * s.rate); s.debt += r.interest; }
  // короткий сон
  if (r.cursed === 0) { Econ.addSanity(s, 6); r.rest = 6; }
  return r;
};

if (typeof module !== 'undefined') module.exports = Econ;
