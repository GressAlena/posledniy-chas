'use strict';
/* ============================================================
   КАРМАНЫ: всё, что носишь с собой. Находки (G.inv) и особые вещи
   из сюжета (G.key[id] === 'have'). Окно с описанием: прочесть, взять
   в руку (чтобы приложить к чему-то на улице или в лавке), использовать.
   ============================================================ */
const Pockets = (function () {
  let sel = null, ctx = null;
  function def(id) { return id.slice(0, 2) === 'k:' ? KEY_ITEMS[id.slice(2)] : Quest.ITEMS[id]; }
  function list() {
    const out = [];
    if (!G) return out;
    Object.keys(G.inv || {}).forEach(function (k) { if (G.inv[k] && Quest.ITEMS[k]) out.push(k); });
    Object.keys(KEY_ITEMS).forEach(function (k) { if (G.key && G.key[k] === 'have') out.push('k:' + k); });
    return out;
  }
  function has(id) { return list().indexOf(id) >= 0; }
  function name(id) { const d = def(id); return d ? d.name : id; }
  /* полоска карманов (на улице и в лавке): клик — взять в руку */
  function fillBar(el, held) {
    if (!el) return;
    const ids = list().filter(function (k) { return k.slice(0, 2) !== 'k:'; });
    if (!ids.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    const h = '<span class="pk-cap" data-pk="open">Карманы <kbd>I</kbd></span>' + ids.map(function (k) {
      const it = def(k);
      return '<button data-inv="' + k + '" class="' + (held === k ? 'on' : '') + '" data-tip="' + esc(it.name + '. ' + it.desc + ' Клик — взять в руку.') + '"><img src="' + Art.icon(it.icon) + '"></button>';
    }).join('');
    if (el.innerHTML !== h) el.innerHTML = h;
    el.classList.remove('hidden');
  }
  function html() {
    const ids = list();
    if (sel && ids.indexOf(sel) < 0) sel = null;
    if (!sel && ids.length) sel = ids[0];
    if (!ids.length) return '<div class="pk"><div class="pk-empty">Карманы пусты. В Мглове многое можно найти — если смотреть внимательно: всё, что под курсором подписано, можно рассмотреть.</div></div>';
    let h = '<div class="pk"><div class="pk-grid">';
    ids.forEach(function (k) { const it = def(k); h += '<button class="pk-tile' + (k === sel ? ' on' : '') + (k.slice(0, 2) === 'k:' ? ' key' : '') + '" data-pk="sel" data-id="' + k + '"><img src="' + Art.icon(it.icon) + '"><span>' + esc(it.name) + '</span></button>'; });
    h += '</div>';
    const it = def(sel), q = sel.slice(0, 2) !== 'k:';
    h += '<div class="pk-card"><div class="pk-big"><img src="' + Art.icon(it.icon) + '"></div><div class="pk-name">' + esc(it.name) + '</div><div class="pk-kind">' + (q ? 'находка' : 'особая вещь') + '</div><p>' + esc(it.desc) + '</p><div class="pk-acts">';
    if (q && it.read) h += '<button data-pk="read">' + (it.readLabel || 'Прочесть') + '</button>';
    if (q && it.self && (!it.selfOk || it.selfOk())) h += '<button data-pk="self" class="primary">' + it.self + '</button>';
    if (q && ctx && ctx.hold && !it.noHold) h += '<button data-pk="hold">Взять в руку</button>';
    h += '</div>' + (q && ctx && ctx.hold && !it.noHold ? '<small>Вещь в руке можно приложить к чему-нибудь: кликни по нему.</small>' : '') + '</div></div>';
    return h;
  }
  function render() { openModal('Карманы', html(), act); }
  function act(b) {
    const a = b.dataset.pk;
    if (a === 'sel') { sel = b.dataset.id; Sfx.click(); return render(); }
    const it = def(sel); if (!it) return;
    if (a === 'hold') { closeModal(); if (ctx && ctx.hold) ctx.hold(sel); Sfx.click(); return; }
    if (a === 'read' || a === 'self') {
      const fn = a === 'read' ? it.read : it.useSelf, id = sel;
      closeModal();
      const run = ctx && ctx.run ? ctx.run : async function (f) {
        const hub = phase === 'evening' && !!document.querySelector('.hub');
        await f();
        if (hub && phase === 'evening' && !Street.active() && !Room.active()) renderHub();
      };
      run(async function () { await fn(id); hideBottom(); save(); });
    }
  }
  /* где сейчас игрок — оттуда и брать «руку» */
  function open(c) {
    if (!G) return;
    ctx = c || (typeof Room !== 'undefined' && Room.active() ? Room.ctx() : null);
    Sfx.page(); render();
  }
  return { list: list, has: has, name: name, def: def, fillBar: fillBar, open: open };
})();
