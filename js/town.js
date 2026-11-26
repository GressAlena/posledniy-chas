'use strict';
/* ============================================================
   ГОРОД: семь мест, куда можно сходить до темноты
   ============================================================ */
const Town = {};

/* Меню места: build() -> [{t, dis, fn}]. Крутится, пока игрок не уйдёт. */
async function locMenu(name, greet, build, again) {
  let prompt = greet;
  for (;;) {
    const opts = build().filter(Boolean);
    opts.push({ t: 'Вернуться в лавку', exit: true });
    const c = await ask(name, prompt, opts.map(function (o) { return { t: o.t, dis: o.dis }; }));
    const o = opts[c];
    if (o.exit) return;
    const r = await o.fn();
    guard();
    prompt = typeof r === 'string' ? r : (again || 'Что-нибудь ещё?');
  }
}
function consRow(name, n, desc, act, price, can) {
  return '<div class="row"><div class="grow">' + name + ' <span class="owned">×' + n + '</span><small>' + desc + '</small></div>' +
    '<button data-act="' + act + '"' + (can ? '' : ' disabled') + '>Купить за ' + price + '</button></div>';
}
function zoneWord(it) { return ' <span style="color:#8f8668">· ' + (Econ.home(G, it) === 'shelf' ? 'витрина' : 'кладовая') + '</span>'; }

/* ---------- Сенной рынок: Фрося ---------- */
function marketBuy() {
  return listScreen('Сенной рынок · лоток Фроси', function () {
    let h = '<h3>Товар <small>чистый, без клейма и без торга · свободно мест: ' + Econ.room(G) + '</small></h3>';
    if (!G.mkt.length) h += '<div class="empty">Лоток пуст. Фрося лузгает семечки и смотрит на тебя с уважением.</div>';
    h += '<div class="grid">';
    G.mkt.forEach(function (it) {
      h += itemCardHTML(it, '<button data-act="buy" data-uid="' + it.uid + '"' + (G.money >= it.price && Econ.room(G) > 0 ? '' : ' disabled') + '>Купить за ' + it.price + '</button>');
    });
    h += '</div><h3>Для верстака</h3>' + consRow(EXTRA_CONS.kit.name, G.kit, EXTRA_CONS.kit.desc, 'kit', EXTRA_CONS.kit.price, G.money >= EXTRA_CONS.kit.price);
    return h;
  }, function (b) {
    if (b.dataset.act === 'buy') {
      const it = findUid(G.mkt, +b.dataset.uid);
      if (!it || G.money < it.price || Econ.room(G) <= 0) return Sfx.deny();
      G.mkt.splice(G.mkt.indexOf(it), 1);
      const p = it.price; delete it.price;
      Econ.buyItem(G, it, p); Sfx.coin(); moneyPop(-p); G.flags.frosyaDeal = true;
    } else if (b.dataset.act === 'kit') {
      if (G.money < EXTRA_CONS.kit.price) return Sfx.deny();
      G.kit++; pay(EXTRA_CONS.kit.price); G.flags.frosyaDeal = true;
    }
  });
}
function marketSell() {
  const shown = function (it) { return it.known.exact ? Econ.junkPrice(G, it) : Math.max(1, Math.round(Econ.estimate(G, it).mid * (G.rep >= 60 ? 0.55 : 0.5))); };
  return listScreen('Сенной рынок · сбыть залежалое', function () {
    let h = '<div class="quip"><b>Фрося:</b>«Беру всё. Полцены — если настоящее. Подделку чую носом, за неё — гроши. С осадком? Мне без разницы, у меня покупатель небрезгливый.»</div>';
    if (!Econ.all(G).length) h += '<div class="empty">Продавать нечего.</div>';
    h += '<div class="grid">';
    Econ.all(G).forEach(function (it) {
      h += itemCardHTML(it, '<button data-act="sell" data-uid="' + it.uid + '">Продать за ' + shown(it) + '</button>', zoneWord(it));
    });
    return h + '</div>';
  }, function (b) {
    if (b.dataset.act !== 'sell') return;
    const it = findUid(Econ.all(G), +b.dataset.uid);
    if (!it) return;
    const p = it.fake && !it.known.fake ? Econ.junkPrice(G, it) : shown(it);
    if (it.fake && !it.known.fake) toast('Фрося нюхает вещь и морщится: «Подделка, милок. ' + gr(p) + ' — и то из жалости».', 'bad');
    Econ.sellItem(G, it, p); Sfx.coin(); moneyPop(p); G.flags.frosyaDeal = true;
  });
}
async function marketRumor() {
  pay(5); G.day.rumor = true;
  if (G.rumorTrue) await say('Фрося', 'Это-то? Чистая правда, милок. Мне кума сказала, а куме — тот, кто сам видел. Закупайся, не прогадаешь.');
  else await say('Фрося', 'Брехня! Газетчик наш пьёт с понедельника, вот и пишет что попало. Не будет этого. Деньги побереги.');
  toast(G.rumorTrue ? 'Слух верен: завтра так и будет.' : 'Слух ложный: завтра случится что-то другое.', G.rumorTrue ? 'good' : 'bad');
}
Town.market = async function () {
  await arrive({ look: LOOKS.frosya, back: true });
  if (!G.flags.metFrosya) {
    G.flags.metFrosya = true;
    await say('Торговка', 'А-а, из Матвеевой лавки! Проходи, гляди. Фрося я. Беру всё, продаю всё, знаю всех.');
    await say('Фрося', 'У меня без торга: цена на бирке. Дороже, чем у твоего хромого, зато без клейма и без вопросов. А что залежалось — неси: полцены, зато сразу и деньгами.');
  }
  await locMenu('Фрося', pick(['Ну, чего изволишь?', 'Гляди, выбирай. Руками не трогай: тут есть такое, что само потрогает.']), function () {
    return [
      { t: 'Купить товар и ремнаборы', fn: marketBuy },
      { t: 'Сбыть залежалое за полцены', dis: !Econ.all(G).length, fn: marketSell },
      { t: G.day.rumor ? 'Газетный слух уже проверен' : 'Проверить газетный слух (5 грошей)', dis: !!G.day.rumor || G.money < 5 || !G.rumor, fn: marketRumor },
      { t: 'Расспросить Фросю', fn: function () { return topics('Фрося', 'Спрашивай. Язык без костей, а сплетня без пошлины.', TALK.frosya, '«Хватит сплетен»', 'Ещё чего рассказать?'); } }
    ];
  }, 'Ещё чего?');
  await say('Фрося', pick(['Ступай с богом. И по сторонам гляди: смеркается.', 'Заходи ещё. Только засветло!']));
  await depart(true);
};

/* ---------- Дом Агаты ---------- */
function agataBuy() {
  const herb = function (id) { return Math.max(2, Math.round(ITEM_BY_ID[id].base * G.market.med * 0.75)); };
  const left = function () { return 3 - (G.day.herbs || 0); };
  return listScreen('Дом Агаты · травы и снадобья', function () {
    let h = '<h3>Запасы</h3>';
    h += consRow('Чай с чабрецом', G.tea, '+25 рассудка. У Агаты дешевле, чем у Яши.', 'tea', 22, G.money >= 22);
    h += consRow('Четверговая соль', G.salt, 'Снимает «осадок» с вещи. Нужна и для полынной свечи.', 'salt', 26, G.money >= 26);
    if (G.recipes.candle) h += consRow(EXTRA_CONS.candle.name, G.candle, EXTRA_CONS.candle.desc, 'candle', EXTRA_CONS.candle.price, G.money >= EXTRA_CONS.candle.price);
    h += '<h3>Сырьё для верстака <small>сегодня Агата отпустит ещё ' + left() + ' · свободно мест: ' + Econ.room(G) + '</small></h3>';
    ['valerian', 'wormwood'].forEach(function (id) {
      const d = ITEM_BY_ID[id];
      h += '<div class="row"><img class="ico" src="' + Art.icon(d.icon) + '"><div class="grow">' + d.name + '<small>' + d.desc + ' Идёт в дело: ' + (id === 'valerian' ? 'сонные капли.' : 'грудной сбор, ладанка, свеча.') + '</small></div>' +
        '<button data-act="herb" data-id="' + id + '"' + (G.money >= herb(id) && Econ.room(G) > 0 && left() > 0 ? '' : ' disabled') + '>Купить за ' + herb(id) + '</button></div>';
    });
    return h;
  }, function (b) {
    const a = b.dataset.act;
    const bought = function () { if (!G.flags.agataBuy) { G.flags.agataBuy = true; G.agata++; } };
    if (a === 'tea') { if (G.money < 22) return Sfx.deny(); G.tea++; pay(22); bought(); }
    else if (a === 'salt') { if (G.money < 26) return Sfx.deny(); G.salt++; pay(26); bought(); }
    else if (a === 'candle') { if (G.money < EXTRA_CONS.candle.price) return Sfx.deny(); G.candle++; pay(EXTRA_CONS.candle.price); bought(); }
    else if (a === 'herb') {
      const id = b.dataset.id, p = herb(id);
      if (G.money < p || Econ.room(G) <= 0 || left() <= 0) return Sfx.deny();
      const it = Econ.makeItem(G, id, { cond: 1 });
      it.known = { exact: true, fake: false, cursed: false, stolen: false };
      Econ.buyItem(G, it, p, 'store'); Sfx.coin(); moneyPop(-p);
      G.day.herbs = (G.day.herbs || 0) + 1; bought();
    }
  });
}
async function agataBrew() {
  G.day.brew = true;
  if (G.agata < 1) pay(10);
  Sfx.sip(); addSanity(15);
  await say('Агата', G.agata >= 1 ? 'Пей. Даром. Мне для тебя не жалко, а ему с дарёного взять нечего.' : 'Пей, пока горячий. Мята, пустырник и ещё кое-что, о чём тебе знать не надо.');
  return 'Полегчало? Ну то-то. Ещё что-нибудь?';
}
Town.agata = async function () {
  await arrive({ look: LOOKS.agata, back: true });
  setMood('happy');
  if (!G.flags.agataHome) {
    G.flags.agataHome = true;
    await say('Агата', 'Ну вот и свиделись при свете. Садись к печке. Чай — в чашке, а не в счёт.');
    await say('Агата', 'У меня тут и сборы, и соль четверговая — дешевле, чем у Яши. И говорить можно: стены у меня свои, не то что в лавке.');
  }
  await locMenu('Агата', 'Чего тебе, душа моя?', function () {
    return [
      { t: 'Купить чай, соль и травы', fn: agataBuy },
      { t: G.day.brew ? 'Отвар на сегодня выпит' : 'Попросить успокоительный отвар' + (G.agata >= 1 ? ' (даром)' : ' (10 грошей)'),
        dis: !!G.day.brew || (G.agata < 1 && G.money < 10) || G.sanity >= G.maxSanity, fn: agataBrew },
      { t: 'Расспросить Агату', fn: function () { return topics('Агата', 'Спрашивай. Здесь можно.', TALK.agata, '«Спасибо, Агата»', 'Ещё что, душа моя?'); } }
    ];
  }, 'Ещё что, душа моя?');
  await say('Агата', pick(['Ступай. И колокольчик слушай.', 'Иди, пока светло. Я в окошко погляжу, как дойдёшь.']));
  await depart(true);
};

/* ---------- Мастерская Гофмана: Лиза ---------- */
function lizaFee(it) { return 8 + Math.round(Econ.faceValue(G, it) * 0.07); }
function lizaRepair() {
  return listScreen('Мастерская Гофмана · починка', function () {
    const fix = Econ.all(G).filter(Econ.canRepair);
    let h = '<div class="quip"><b>Лиза:</b>«Поднимаю состояние на ступень. Дорогую вещь чинить дороже, зато и прибавит она больше. Дешёвую выгоднее чинить самому — ремнабором.»</div>';
    if (!fix.length) h += '<div class="empty">Чинить нечего.</div>';
    fix.forEach(function (it) {
      const d = ITEM_BY_ID[it.id], fee = lizaFee(it), up = Math.round(Econ.faceValue(G, it) * (CONDS[it.cond + 1].m / CONDS[it.cond].m - 1));
      h += '<div class="row" data-tipuid="' + regTip(it) + '"><img class="ico" src="' + Art.icon(d.icon) + '"><div class="grow">' + d.name + '<small>' + CONDS[it.cond].n + ' → ' + CONDS[it.cond + 1].n + ' · цена вырастет примерно на ' + up + '</small></div>' +
        '<button data-act="fix" data-uid="' + it.uid + '"' + (G.money >= fee ? '' : ' disabled') + '>Починить за ' + fee + '</button></div>';
    });
    return h;
  }, function (b) {
    if (b.dataset.act !== 'fix') return;
    const it = findUid(Econ.all(G), +b.dataset.uid);
    if (!it || !Econ.canRepair(it) || G.money < lizaFee(it)) return Sfx.deny();
    pay(lizaFee(it)); it.cond++; G.flags.lizaPaid = true; Sfx.good();
  });
}
async function lizaKit() {
  G.kit++; pay(14); G.flags.lizaPaid = true;
  return 'Держите. Пружинки не растеряйте. Ещё что-нибудь?';
}
async function lizaDecoy() {
  const w = Econ.findById(G, 'pocketwatch')[0];
  await say('Лиза', 'Копию отцовской работы? Без нутра? …Чертежи у меня. Нужен корпус — ваши карманные часы — и вечер работы.');
  const c = await ask('Лиза', 'Пятьдесят грошей. И я не спрашиваю, кому вы собираетесь их показать.', ['Отдать карманные часы и 50 грошей', '«Я ещё подумаю»']);
  if (c !== 0) return 'Подумайте. Чертежи никуда не денутся.';
  Econ.removeItem(G, w); pay(50); G.key.decoy = 'have'; G.flags.lizaPaid = true; syncScene();
  await narr('Она работает молча, не поднимая головы. Вынимает из корпуса стрелки, потом — всё остальное. Когда заканчивает, за окном уже синеет.');
  await say('Лиза', 'Готово. Они тикают. Но в них ничего нет. Тот, кто откроет, это поймёт. Вопрос только — когда.');
  toast('Получено: пустые часы (под прилавком).', 'good');
  return 'Что-нибудь ещё?';
}
Town.clock = async function () {
  await arrive({ look: LOOKS.liza, back: true });
  if (!G.flags.metLiza) {
    G.flags.metLiza = true;
    await say('Девушка в фартуке', 'Мастерская закры… А. Вы из лавки. Отец говорил, что вы приедете. Не вы именно — кто-нибудь.');
    await say('Лиза', 'Лиза Гофман. Чиню всё, что тикает, блестит или открывается. Ремнаборы продаю — если руки свои есть.');
    await narr('На стене — десятка три часов. Все стоят. Все показывают без четверти три.');
  }
  await locMenu('Лиза', 'Чем могу?', function () {
    const o = [
      { t: 'Отдать вещь в починку', dis: !Econ.all(G).some(Econ.canRepair), fn: lizaRepair },
      { t: 'Купить ремнабор (14 грошей)', dis: G.money < 14, fn: lizaKit }
    ];
    if (G.flags.knowVessel && !G.key.decoy) o.push({ t: 'Заказать пустые часы (карманные часы + 50)', dis: !Econ.findById(G, 'pocketwatch').length || G.money < 50, fn: lizaDecoy });
    o.push({ t: 'Расспросить Лизу', fn: function () { return topics('Лиза', 'Спрашивайте. Только руки у меня заняты, я буду слушать так.', TALK.liza, '«Не буду отвлекать»', 'Что-то ещё?'); } });
    return o;
  });
  await say('Лиза', pick(['Идите. Темнеет рано.', 'До свидания. И… не верьте часам в вашей лавке.']));
  await depart(true);
};

/* ---------- Собор: отец Никодим ---------- */
function churchBless() {
  return listScreen('Собор · освятить вещь', function () {
    const cur = Econ.all(G).filter(function (it) { return it.cursed && it.known.cursed; });
    let h = '<div class="quip"><b>Отец Никодим:</b>«Святая вода отпускает то, что в вещи застряло. После этого она — просто вещь. Собиратель из „Якоря“ за такую уже не переплатит.»</div>';
    if (!cur.length) h += '<div class="empty">Вещей с осадком, о которых ты знаешь, нет.</div>';
    h += '<div class="grid">';
    cur.forEach(function (it) { h += itemCardHTML(it, '<button data-act="bless" data-uid="' + it.uid + '"' + (G.money >= 35 ? '' : ' disabled') + '>Освятить за 35</button>', zoneWord(it)); });
    return h + '</div>';
  }, function (b) {
    if (b.dataset.act !== 'bless') return;
    const it = findUid(Econ.all(G), +b.dataset.uid);
    if (!it || G.money < 35) return Sfx.deny();
    pay(35); it.cursed = false; it.known.cursed = false; Sfx.salt();
    toast('Вода на вещи вскипает и высыхает. «' + ITEM_BY_ID[it.id].name + '» больше не холодит пальцы.', 'good');
  });
}
async function churchConfess() {
  pay(15); G.day.confess = true;
  await narr('Ты говоришь долго. О вещах, о ценах, о тех, кто входит без звона. Он не перебивает.');
  addSanity(18); Sfx.good();
  if (G.marks > 0) await say('Отец Никодим', 'Зарубок на вашей двери — ' + G.marks + '. Бог простит. Косяк — нет: что вырезано, то вырезано. Но больше не режьте.');
  else await say('Отец Никодим', 'Вы торгуете с живыми и не торгуете с прочими. В Мглове это уже почти святость.');
  return 'Ступайте с миром. Или у вас ещё дело?';
}
async function churchDonate() {
  const need = G.flags.tongueReturned ? 60 : 200;
  const c = await ask('Отец Никодим', 'В кружке — ' + G.bell + ' из ' + need + '. Сколько положите? Помните: это не покупка. За дарёное ничего не причитается.',
    [{ t: 'Положить 25', dis: G.money < 25 }, { t: 'Положить 50', dis: G.money < 50 }, { t: 'Положить 100', dis: G.money < 100 }, 'Не сейчас']);
  if (c === 3) return 'Как знаете. Кружка у выхода.';
  const n = [25, 50, 100][c], was = Story.bellReady();
  G.money -= n; G.bell += n; Sfx.coin(); moneyPop(-n); addRep(Math.round(n / 25)); addSanity(2);
  if (!was && Story.bellReady()) {
    Sfx.bigBell();
    await say('Отец Никодим', 'Хватит. Господи, хватит! Литейщик обещал управиться к седьмой ночи. В три часа пополуночи Благовест ударит — впервые за тридцать лет.');
    toast('Колокол будет готов к седьмой ночи.', 'good');
  } else await say('Отец Никодим', 'Спаси вас Бог. Монеты тёплые — значит, от живого.');
  return 'Что-нибудь ещё?';
}
async function churchTongue() {
  A.item = KEY_ITEMS.tongue.icon;
  await narr('Ты разворачиваешь подрясник. Железо глухо гудит — и под сводами ему отзывается что-то огромное и немое.');
  setMood('sad');
  await say('Отец Никодим', 'Это… Откуда?! Тридцать лет… Я думал, он на дне реки.');
  const c = await ask('Отец Никодим', 'Сколько вы за него хотите? У меня только кружка. Я отдам кружку.', ['«Нисколько. Даром»', '«Пока оставлю у себя»']);
  A.item = null;
  if (c !== 0) return 'Понимаю. Такие вещи не отдают сгоряча.';
  G.key.tongue = 'church'; G.flags.tongueReturned = true; addSanity(10); addRep(5); setMood('happy'); Sfx.good();
  await say('Отец Никодим', 'Даром. Вы понимаете, что сделали? Он не сможет его забрать. Подаренное в его книгу не ложится.');
  if (Story.bellReady()) { Sfx.bigBell(); await say('Отец Никодим', 'И денег в кружке уже довольно. В седьмую ночь, в три часа, Благовест ударит.'); toast('Колокол будет готов к седьмой ночи.', 'good'); }
  else await say('Отец Никодим', 'Осталось собрать шестьдесят — на верёвки и звонаря. В кружке сейчас ' + G.bell + '. Но это должны быть дарёные деньги.');
  return 'Что-нибудь ещё?';
}
Town.church = async function () {
  await arrive({ look: LOOKS.nikodim, back: true });
  if (!G.flags.metNikodim) {
    G.flags.metNikodim = true;
    await say('Священник', 'Мир вам. Вы из лавки — вижу по глазам: так смотрят те, кто по ночам считает чужие вещи.');
    await say('Отец Никодим', 'Отец Никодим. Исповедую, освящаю, собираю на колокол. Осуждать не стану: я сам покупал у вашего дяди обереги. Тайком.');
  }
  await locMenu('Отец Никодим', 'С чем пришли?', function () {
    const o = [
      { t: G.day.confess ? 'Исповедь сегодня уже была' : 'Исповедаться (15 грошей на свечи)', dis: !!G.day.confess || G.money < 15 || G.sanity >= G.maxSanity, fn: churchConfess },
      { t: 'Освятить вещь с осадком (35 грошей)', dis: !Econ.all(G).some(function (it) { return it.cursed && it.known.cursed; }), fn: churchBless },
      { t: Story.bellReady() ? 'Колокол уже льют' : 'Пожертвовать на колокол', dis: Story.bellReady() || G.money < 25, fn: churchDonate }
    ];
    if (G.key.tongue === 'have') o.push({ t: 'Показать язык колокола', fn: churchTongue });
    o.push({ t: 'Расспросить отца Никодима', fn: function () { return topics('Отец Никодим', 'Спрашивайте. Здесь можно говорить вслух — под этими сводами он не слышит.', TALK.nikodim, '«Благодарю, отче»', 'Что ещё вас тревожит?'); } });
    return o;
  });
  await say('Отец Никодим', pick(['Идите с Богом. И заприте ставни.', 'Храни вас Господь. Особенно после трёх.']));
  await depart(true);
};

/* ---------- Вдовье кладбище: Прохор ---------- */
function graveFinds() {
  return listScreen('Вдовье кладбище · находки Прохора', function () {
    let h = '<div class="quip"><b>Прохор:</b>«Что с чем лежало — не скажу. Лупы у меня нет, совести тоже. Берёшь как есть.»</div>';
    if (!G.finds.length) h += '<div class="empty">Мешок пуст. Земля сегодня больше ничего не отдала.</div>';
    h += '<div class="grid">';
    G.finds.forEach(function (it) {
      h += itemCardHTML(it, '<button data-act="buy" data-uid="' + it.uid + '"' + (G.money >= it.price && Econ.room(G) > 0 ? '' : ' disabled') + '>Купить за ' + it.price + '</button>');
    });
    return h + '</div>';
  }, function (b) {
    if (b.dataset.act !== 'buy') return;
    const it = findUid(G.finds, +b.dataset.uid);
    if (!it || G.money < it.price || Econ.room(G) <= 0) return Sfx.deny();
    G.finds.splice(G.finds.indexOf(it), 1);
    const p = it.price; delete it.price;
    Econ.buyItem(G, it, p, 'store'); Sfx.coin(); moneyPop(-p);
  });
}
async function graveDig() {
  G.day.dig = true;
  Sfx.thud();
  await narr('Прохор молча протягивает лопату. Земля у ограды мягкая, будто её недавно трогали. Изнутри.');
  addSanity(-6);
  if (chance(0.3)) {
    await narr('Лопата во что-то упирается. Ты наклоняешься разгрести руками.');
    await vision('roots');
    await narr('…Корни. Это были корни. Белые, тонкие, в пять отростков каждый.');
  }
  const it = Econ.graveItem(G, 0.45);
  Econ.addItem(G, it, 'store'); G.stats.bought++; syncScene();
  const d = ITEM_BY_ID[it.id];
  await narr('На штык глубины — свёрток в истлевшей холстине. Внутри: «' + d.name + '». ' + (it.cursed ? 'Вещь холодная. Холоднее земли.' : 'Обычная вещь. Насколько здесь бывает обычное.'));
  if (it.cursed) { it.known.cursed = true; Sfx.whisper(); }
  toast('Найдено: «' + d.name + '» (в кладовой).', it.cursed ? 'bad' : 'good');
  return 'Ну, есть улов? Яму зарой. Тут незарытых и так хватает.';
}
async function graveWalk() {
  G.flags.sawGraves = true;
  await narr('Четыре камня в ряд, у самой ограды. «С. Ф. Крюк». «П. А. Градов». «И. С. Вересов». «М. И. Сорин». У каждого дата смерти — седьмая ночь.');
  await narr('Земля над ними ровная, непросевшая. Под такими камнями никто не лежит.');
  await narr('Пятая яма — свежая. Камень уже привезли: стоит рядом, лицом к ограде. Ты обходишь его.');
  Sfx.sting();
  await narr('На камне пока только фамилия. Сорин. И место под имя.');
  addSanity(-4); G.flags.knowGrave = true;
  return 'Насмотрелись глаза? Я ж говорил: живые сюда к вечеру не ходят.';
}
async function graveGift() {
  A.item = KEY_ITEMS.locket.icon;
  await narr('Под рябиной — один камень на двоих: «Анна Реева и дочь Таисия». Вокруг, по мокрой траве, — следы маленьких босых ног. К камню. И ни одного — от камня.');
  const c = await ask('', 'Медальон в ладони тёплый — впервые с тех пор, как он у тебя.', ['Положить медальон на камень. Даром', 'Оставить у себя']);
  A.item = null;
  if (c !== 0) return 'Ну и ладно. Мёртвые не торопят.';
  G.key.locket = 'given'; G.flags.graveGift = true; Sfx.good();
  await narr('Ты кладёшь медальон на камень. Птичка на крышке на миг кажется живой. Ветра нет — а рябина над могилой вздыхает всеми листьями разом.');
  addSanity(12); addRep(3);
  await narr('Когда ты оглядываешься от калитки, на камне ничего нет. А следов на траве — вдвое больше: рядом с маленькими легли большие.');
  toast('Медальон возвращён. Даром — а значит, навсегда.', 'good');
  return 'Лежит, значит. Ну и правильно. Я с той могилы больше ничего не трону. Слово.';
}
Town.cemetery = async function () {
  await arrive({ look: LOOKS.prohor, back: true });
  if (!G.flags.prohorHome) {
    G.flags.prohorHome = true;
    await say('Могильщик', 'Живой? Живые сюда к вечеру не ходят.');
    await say('Прохор', 'А, из лавки. Прохор я. Есть находки — недорого. А хочешь — сам копни, вон там, у ограды, где ничьё. Лопату дам. За то, что выкопаешь, не отвечаю.');
  }
  await locMenu('Прохор', 'Чего надо?', function () {
    const o = [
      { t: 'Посмотреть находки Прохора', dis: !G.finds.length, fn: graveFinds },
      { t: G.day.dig ? 'Яма на сегодня уже выкопана' : 'Копать самому (−6 рассудка, вещь даром)', dis: !!G.day.dig || Econ.room(G) <= 0, fn: graveDig }
    ];
    if (!G.flags.sawGraves) o.push({ t: 'Пройтись между могил', fn: graveWalk });
    if (G.key.locket === 'have' && G.flags.knowTasya) o.push({ t: 'Отнести медальон на могилу Реевых', fn: graveGift });
    o.push({ t: 'Расспросить Прохора', fn: function () { return topics('Прохор', 'Спрашивай. Только я не из говорливых.', TALK.prohor, '«Ладно, Прохор»', 'Ещё чего?'); } });
    return o;
  }, 'Ещё чего?');
  await say('Прохор', pick(['Иди. И не оглядывайся у калитки: примета.', 'Ступай. Свидимся. Тут все свидятся.']));
  await depart(true);
};

/* ---------- Сыскное отделение: Градов ---------- */
const ARCHIVE = [
  ['Дело № 1. Крюк Савелий Фомич, соборный звонарь',
    'Открыл ссудную лавку «Последний час» в тот год, когда замолчал Благовест. В описи первой ночи значится: «язык колокольный, кованый, 1 шт. — принят в заклад от самого владельца».',
    'Заимодавец не установлен. Пропал на седьмую ночь. В лавке найдено: зеркало овальное в латунной раме; цилиндр мужской (изъят, из хранилища исчез).'],
  ['Дело № 2. Градов Пётр Аркадьевич, пристав в отставке',
    'Принял лавку по письму нотариуса. На шестой день облил помещение керосином и поджёг. Свидетели видели пламя до рассвета. Наутро здание найдено неповреждённым. Зеркало — на прежнем месте.',
    'Пометка следователя на полях: «Лампа в лавке горела своя. Чужого огня при нём не было. Он был там один».'],
  ['Дело № 3. Вересов Илья Саввич',
    'На шестой день переправился через реку с одним чемоданом. Перевозчик показал: высадил на том берегу живым и при тени.',
    'На седьмую ночь Вересова видели на Соборной: шёл спиной вперёд, тени не отбрасывал, спрашивал у прохожих «что-нибудь тёплое». Пометка: «От долга уехать нельзя. Уехать можно только от себя».'],
  ['Дело № 4. Сорин Матвей Ильич',
    'Вёл записи. Последний лист, его рукой: «Он берёт только проданное и заложенное. Дарёное — не берёт: не может. В дом, где горит чужая лампа, не входит. Колокола не слышит».',
    '«Счёт закрывает только час самого должника — значит, час надо спрятать. Гофман сделает. Агата сохранит». Пропал на седьмую ночь. Зеркало — на прежнем месте.']
];
async function stationArchive() {
  for (let i = 0; i < ARCHIVE.length; i++) {
    Sfx.page();
    const f = ARCHIVE[i];
    showScreen('<div class="letter file"><p class="file-h">' + esc(f[0]) + '</p><p>' + esc(f[1]) + '</p><p>' + esc(f[2]) + '</p>' +
      '<button data-act="go">' + (i < ARCHIVE.length - 1 ? 'Следующее дело ▸' : 'Закрыть шкаф') + '</button></div>', 'dim');
    await waitScreenBtn('go');
  }
  hideScreen();
  G.flags.knowLaws = true; G.flags.knowIlya = true; G.flags.knowBell = true;
  if (!G.flags.archive) {
    G.flags.archive = true; G.gradov++;
    await say('Градов', 'Вы дочитали до конца. Ваши предшественники не открывали и первой папки.');
    await say('Градов', 'Заметьте: в каждом деле хозяин был один. Некому было ни дать, ни посветить, ни позвонить. Я это запомнил. Запомните и вы.');
    toast('Градов оценил, что архив прочитан. Важное записано в гроссбух.', 'good');
    return 'Что-нибудь ещё?';
  }
  return 'Перечитали? Там ничего не изменилось. Я проверяю каждое утро.';
}
async function stationSurrender() {
  const hot = Econ.all(G).filter(function (it) { return it.stolen && it.known.stolen; });
  hot.forEach(function (it) { Econ.removeItem(G, it); });
  syncScene(); addRep(2);
  if (!G.flags.surrendered) { G.flags.surrendered = true; G.gradov++; }
  await say('Градов', 'Вещей: ' + hot.length + '. Принято по описи. Сами принесли — значит, без штрафа.');
  await say('Градов', 'Знаете, за тридцать лет из вашей лавки мне не приносили ничего, кроме неприятностей. Благодарю.');
  return 'Что-нибудь ещё?';
}
Town.station = async function () {
  await arrive({ look: LOOKS.gradov, back: true });
  if (!G.flags.gradovHome) {
    G.flags.gradovHome = true;
    await say('Градов', 'Вы пришли сами. Это уже необычно: прежние хозяева обходили отделение по другой стороне улицы.');
    await say('Градов', 'Архив — в том шкафу. Четыре дела, по одному на каждого. С собой не выдаю. Читайте здесь.');
  }
  await locMenu('Градов', 'Слушаю вас.', function () {
    return [
      { t: G.flags.archive ? 'Перечитать дела прежних хозяев' : 'Читать архив: дела прежних хозяев', fn: stationArchive },
      { t: 'Сдать краденое добровольно', dis: !Econ.all(G).some(function (it) { return it.stolen && it.known.stolen; }), fn: stationSurrender },
      { t: 'Расспросить инспектора', fn: function () { return topics('Градов', 'Спрашивайте. Я на службе.', TALK.gradov, '«Вопросов нет»', 'Что-нибудь ещё?'); } }
    ];
  });
  await say('Градов', pick(['Идите. И заприте за собой — я про лавку.', 'Всего доброго. Насколько это здесь возможно.']));
  await depart(true);
};

/* ---------- Пристань: Перевозчик ---------- */
async function riverCatch() {
  pay(14); G.day.catch = (G.day.catch || 0) + 1;
  const it = Econ.riverItem(G); it.cost = 14;
  Econ.addItem(G, it, 'store'); G.stats.bought++; syncScene();
  const d = ITEM_BY_ID[it.id];
  await narr('Рыбак, не глядя, вытягивает из корзины мокрый свёрток. В мешковине — «' + d.name + '». ' + CONDS[it.cond].n[0].toUpperCase() + CONDS[it.cond].n.slice(1) + ', в тине.');
  if (it.cursed && chance(0.4)) { it.known.cursed = true; Sfx.whisper(); await narr('Вода с неё стекает не вниз, а к тебе.'); }
  toast('Улов: «' + d.name + '» (в кладовой).', 'hint');
  return 'Река отдала. Что ещё?';
}
async function riverFlee() {
  const fare = 100;
  await say('Перевозчик', gr(fare) + '. Вещи оставишь. Лавку оставишь.');
  if (G.flags.knowFerry) await say('Перевозчик', 'Был вопрос про Вересова. Я ответил. Я не отговариваю и не уговариваю. Я вожу.');
  else await say('Перевозчик', 'Долг я не вожу. Он добирается сам.');
  const c = await ask('Перевозчик', 'Садишься?', ['Сесть в лодку', 'Остаться на причале']);
  if (c !== 0) return 'Тогда не стой на краю. Вода любит тех, кто сомневается.';
  await narr('Ты ставишь ногу на борт. Лодка не качается — будто в неё никто не сел.');
  const c2 = await ask('', 'За спиной, в тумане, едва слышно звякает колокольчик лавки. Сам по себе.', ['Оттолкнуться от причала', 'Вернуться']);
  if (c2 !== 0) { await narr('Ты убираешь ногу. Перевозчик впервые поворачивает к тебе лицо — и ничего не говорит.'); return 'Значит, не сегодня.'; }
  pay(Math.min(fare, G.money));
  throw new Ending('ferry');
}
Town.river = async function () {
  await arrive({ look: LOOKS.ferryman, back: true });
  if (!G.flags.metFerry) {
    G.flags.metFerry = true;
    await narr('На причале пахнет тиной и керосином. У лодки стоит человек в капюшоне. Лица не разобрать — только борода и два бельма.');
    await say('Перевозчик', 'До заката вожу. Улов — в корзине у рыбаков, четырнадцать грошей, не глядя. Вопросы — по одному.');
  }
  await locMenu('Перевозчик', 'Ну.', function () {
    const o = [
      { t: (G.day.catch || 0) >= 2 ? 'Корзина рыбаков пуста' : 'Купить улов из сетей, не глядя (14 грошей)', dis: (G.day.catch || 0) >= 2 || G.money < 14 || Econ.room(G) <= 0, fn: riverCatch }
    ];
    if (G.night >= 4) o.push({ t: 'Уплыть из Мглова (100 грошей)', dis: G.money < 100, fn: riverFlee });
    o.push({ t: 'Расспросить Перевозчика', fn: function () { return topics('Перевозчик', 'Спрашивай.', TALK.ferryman, '«Ничего»', 'Ещё.'); } });
    return o;
  }, 'Ещё что.');
  await narr('Перевозчик отворачивается к воде. Разговор окончен.');
  await depart(true);
};
