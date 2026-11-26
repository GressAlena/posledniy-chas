'use strict';
/* ============================================================
   ГОЛОВОЛОМКИ: часы (выставить стрелки), кодовый замок (четыре колеса),
   рваный плакат (повернуть обрывки). Каждая возвращает Promise<boolean>:
   true — решено, false — отошли, не решив.
   ============================================================ */
const Puzzles = (function () {
  function frame(title, body, foot) {
    return '<div class="pz"><div class="pz-head">' + title + '</div>' + body + '<div class="pz-foot">' + foot + '<button data-act="pzback">Отойти</button></div></div>';
  }
  /* ---------- часы: target = минуты от полуночи по циферблату (12 ч) ---------- */
  function clock(o) {
    if (window.__autoPuzzle) return Promise.resolve(true);
    return new Promise(function (res) {
      let h = o.h != null ? o.h : 9, m = o.m != null ? o.m : 10, hand = 'm';
      const draw = function () {
        const ma = m / 60 * Math.PI * 2, ha = ((h % 12) + m / 60) / 12 * Math.PI * 2;
        let s = '<svg class="pz-clock" viewBox="-110 -110 220 220"><circle r="104" fill="#3a281b"/><circle r="98" fill="#b08a3a"/><circle r="92" fill="#e2d8bc"/>';
        for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 84 : 76; s += '<line x1="' + (Math.sin(a) * r0).toFixed(1) + '" y1="' + (-Math.cos(a) * r0).toFixed(1) + '" x2="' + (Math.sin(a) * 88).toFixed(1) + '" y2="' + (-Math.cos(a) * 88).toFixed(1) + '" stroke="#2a2018" stroke-width="' + (i % 5 ? 1 : 3) + '"/>'; }
        ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach(function (t, i) { const a = i / 12 * Math.PI * 2; s += '<text x="' + (Math.sin(a) * 62).toFixed(1) + '" y="' + (-Math.cos(a) * 62 + 6).toFixed(1) + '" text-anchor="middle" class="pz-num">' + t + '</text>'; });
        s += '<line x1="0" y1="0" x2="' + (Math.sin(ha) * 46).toFixed(1) + '" y2="' + (-Math.cos(ha) * 46).toFixed(1) + '" stroke="' + (hand === 'h' ? '#7a1a10' : '#1a1410') + '" stroke-width="7" stroke-linecap="round"/>';
        s += '<line x1="0" y1="0" x2="' + (Math.sin(ma) * 76).toFixed(1) + '" y2="' + (-Math.cos(ma) * 76).toFixed(1) + '" stroke="' + (hand === 'm' ? '#7a1a10' : '#1a1410') + '" stroke-width="4" stroke-linecap="round"/>';
        s += '<circle r="6" fill="#8a6a2a"/><circle r="108" fill="transparent" data-act="dial"/></svg>';
        const body = '<p class="pz-txt">' + o.text + '</p><div class="pz-row">' + s +
          '<div class="pz-side"><div class="pz-tg"><button data-act="hand" data-h="h" class="' + (hand === 'h' ? 'on' : '') + '">Часовая</button><button data-act="hand" data-h="m" class="' + (hand === 'm' ? 'on' : '') + '">Минутная</button></div>' +
          '<div class="pz-tg"><button data-act="step" data-d="-1">◂ назад</button><button data-act="step" data-d="1">вперёд ▸</button></div>' +
          '<small>Кликни по циферблату — выбранная стрелка встанет туда.</small><div class="pz-time">' + (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + '</div></div></div>';
        showScreen(frame(o.title, body, '<button data-act="pzok" class="primary">' + (o.ok || 'Отпустить маятник') + '</button>'), 'dim puz', handler);
      };
      const handler = function (b, e) {
        if (!b) return;
        const a = b.getAttribute('data-act');
        if (a === 'dial') {
          const svg = b.ownerSVGElement, r = svg.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
          let an = Math.atan2(x, -y); if (an < 0) an += Math.PI * 2;
          // часовая стрелка стоит между цифрами (в 2:45 — почти у тройки), поэтому клик по ней учитывает минуты
          if (hand === 'm') m = Math.round(an / (Math.PI * 2) * 12) % 12 * 5; else h = ((Math.round(an / (Math.PI * 2) * 12 - m / 60) % 12) + 12) % 12;
          if (Sfx.tick) Sfx.tick(); draw(); return;
        }
        if (a === 'hand') { hand = b.dataset.h; Sfx.click(); return draw(); }
        if (a === 'step') { const d = +b.dataset.d; if (hand === 'm') { m += d * 5; if (m >= 60) { m -= 60; h = (h + 1) % 12; } if (m < 0) { m += 60; h = (h + 11) % 12; } } else h = (h + d + 12) % 12; if (Sfx.tick) Sfx.tick(); return draw(); }
        if (a === 'pzback') { Sfx.click(); hideScreen(); return res(false); }
        if (a === 'pzok') {
          const ok = (h % 12) === (o.th % 12) && m === o.tm;
          if (ok) { hideScreen(); return res(true); }
          Sfx.deny(); toast(o.fail || 'Маятник качнулся — и замер. Не то время.');
        }
      };
      draw();
    });
  }
  /* ---------- кодовый замок: четыре колеса с цифрами ---------- */
  function lock(o) {
    if (window.__autoPuzzle) return Promise.resolve(true);
    return new Promise(function (res) {
      const v = [0, 0, 0, 0];
      const draw = function () {
        let w = '<div class="pz-lock">';
        v.forEach(function (d, i) { w += '<div class="pz-wheel"><button data-act="w" data-i="' + i + '" data-d="1">▲</button><div class="pz-dig"><i>' + ((d + 9) % 10) + '</i><b>' + d + '</b><i>' + ((d + 1) % 10) + '</i></div><button data-act="w" data-i="' + i + '" data-d="-1">▼</button></div>'; });
        w += '</div>';
        showScreen(frame(o.title, '<p class="pz-txt">' + o.text + '</p>' + w, '<button data-act="pzok" class="primary">' + (o.ok || 'Повернуть ручку') + '</button>'), 'dim puz', handler);
      };
      const handler = function (b) {
        if (!b) return;
        const a = b.dataset.act;
        if (a === 'w') { const i = +b.dataset.i; v[i] = (v[i] + (+b.dataset.d) + 10) % 10; if (Sfx.tick) Sfx.tick(1.4); return draw(); }
        if (a === 'pzback') { Sfx.click(); hideScreen(); return res(false); }
        if (a === 'pzok') {
          if (v.join('') === o.code) { hideScreen(); return res(true); }
          Sfx.deny(); toast(o.fail || 'Ручка не поворачивается.');
        }
      };
      draw();
    });
  }
  /* ---------- рваный плакат: 3×3 обрывка, клик — повернуть на четверть ---------- */
  function tiles(o) {
    if (window.__autoPuzzle) return Promise.resolve(true);
    return new Promise(function (res) {
      const N = 3, src = document.createElement('canvas'); src.width = o.w; src.height = o.h;
      Art.api.withCtx(src.getContext('2d'), function () { o.paint(); });
      const rot = [];
      for (let i = 0; i < N * N; i++) rot.push(o.rot ? o.rot[i] : 1 + Math.floor(Math.random() * 3));
      const tw = o.w / N, th = o.h / N, cache = {};
      const tile = function (i, r) {
        const k = i + ':' + r; if (cache[k]) return cache[k];
        const c = document.createElement('canvas'); c.width = tw; c.height = th; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
        x.translate(tw / 2, th / 2); x.rotate(r * Math.PI / 2); x.translate(-tw / 2, -th / 2);
        x.drawImage(src, (i % N) * tw, Math.floor(i / N) * th, tw, th, 0, 0, tw, th);
        return (cache[k] = c.toDataURL());
      };
      const draw = function (done) {
        let g = '<div class="pz-tiles' + (done ? ' done' : '') + '" style="aspect-ratio:' + o.w + '/' + o.h + '">';
        for (let i = 0; i < N * N; i++) g += '<button data-act="t" data-i="' + i + '" style="background-image:url(' + tile(i, rot[i]) + ')"></button>';
        g += '</div>';
        showScreen(frame(o.title, '<p class="pz-txt">' + o.text + '</p>' + g, done ? '<button data-act="pzdone" class="primary">' + (o.ok || 'Дальше') + '</button>' : ''), 'dim puz', handler);
      };
      const handler = function (b) {
        if (!b) return;
        const a = b.dataset.act;
        if (a === 't') { const i = +b.dataset.i; rot[i] = (rot[i] + 1) % 4; Sfx.page(); const ok = rot.every(function (r) { return r === 0; }); if (ok) Sfx.good(); return draw(ok); }
        if (a === 'pzback') { Sfx.click(); hideScreen(); return res(false); }
        if (a === 'pzdone') { Sfx.click(); hideScreen(); return res(true); }
      };
      draw(false);
    });
  }
  return { clock: clock, lock: lock, tiles: tiles };
})();
