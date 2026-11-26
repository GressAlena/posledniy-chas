'use strict';
/* ============================================================
   ЗВУК: всё синтезируется на лету через WebAudio, без файлов.
   ============================================================ */
const Sfx = (function () {
  let ac = null, master, comp, sfxG, musG, noiseBuf, shaper;
  let vol = 0.7, tension = 0, amb = null, musTimer = 0, hbTimer = 0, tickTimer = 0, tickN = 0, organ = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 10; comp.attack.value = 0.002; comp.release.value = 0.2;
    master = ac.createGain(); master.gain.value = vol;
    master.connect(comp); comp.connect(ac.destination);
    sfxG = ac.createGain(); sfxG.connect(master);
    musG = ac.createGain(); musG.gain.value = 1; musG.connect(master);
    const len = ac.sampleRate * 2;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    shaper = ac.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) { const x = i / 256 - 1; curve[i] = Math.tanh(x * 6); }
    shaper.curve = curve; shaper.connect(sfxG);
  }
  function ok() { return !!ac; }
  function now() { return ac.currentTime; }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(type, f, t, a, peak, d, dest, f2) {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    const g = ac.createGain(); env(g, t, a, peak, d);
    o.connect(g); g.connect(dest || sfxG); o.start(t); o.stop(t + a + d + 0.05);
    return o;
  }
  function nz(t, a, peak, d, ftype, freq, q, dest) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = q || 1;
    const g = ac.createGain(); env(g, t, a, peak, d);
    s.connect(f); f.connect(g); g.connect(dest || sfxG);
    s.start(t, Math.random()); s.stop(t + a + d + 0.05);
    return f;
  }

  /* ---------- эффекты ---------- */
  function bell(silver, soft) {
    if (!ok()) return; const t = now(), b = silver ? 2093 : 1760, k = soft ? 0.3 : 1;
    [0, 0.17, soft ? 9 : 0.36].forEach(function (dt, i) {
      if (dt > 5) return;
      tone('sine', b, t + dt, 0.002, 0.17 * k * (1 - i * 0.25), 1.1);
      tone('sine', b * 1.498, t + dt, 0.002, 0.08 * k, 0.7);
      tone('sine', b * 2.01, t + dt, 0.002, 0.04 * k, 0.4);
    });
  }
  function door(q) {
    if (!ok()) return; const t = now(), k = q || 1;
    const o = tone('sawtooth', 120, t, 0.06, 0.035 * k, 0.5, null, 64);
    o.detune.setValueAtTime(0, t); o.detune.linearRampToValueAtTime(300, t + 0.2); o.detune.linearRampToValueAtTime(-200, t + 0.5);
    nz(t, 0.01, 0.1 * k, 0.3, 'lowpass', 320, 1);
    tone('sine', 70, t + 0.45, 0.002, 0.25 * k, 0.12, null, 45);
  }
  function coin() {
    if (!ok()) return; const t = now();
    tone('sine', 2400, t, 0.001, 0.08, 0.12); tone('sine', 3200, t + 0.06, 0.001, 0.07, 0.16); tone('sine', 2800, t + 0.12, 0.001, 0.05, 0.2);
  }
  function blip(p) { if (!ok()) return; tone('square', p, now(), 0.001, 0.012, 0.03); }
  function click() { if (!ok()) return; tone('square', 520, now(), 0.001, 0.02, 0.04); }
  function deny() { if (!ok()) return; const t = now(); tone('square', 150, t, 0.002, 0.04, 0.1); tone('square', 110, t + 0.09, 0.002, 0.04, 0.14); }
  function page() { if (!ok()) return; nz(now(), 0.02, 0.07, 0.2, 'bandpass', 2600, 0.7); }
  function knock(n, hard) {
    if (!ok()) return; const t = now();
    for (let i = 0; i < (n || 3); i++) {
      tone('sine', 95, t + i * 0.24, 0.002, hard ? 0.8 : 0.5, 0.14, null, 48);
      nz(t + i * 0.24, 0.001, hard ? 0.4 : 0.22, 0.05, 'lowpass', 600, 1);
    }
  }
  function scratch() {
    if (!ok()) return; const t = now();
    for (let i = 0; i < 4; i++) { const f = nz(t + i * 0.42, 0.05, 0.12, 0.32, 'bandpass', 2400, 6); f.frequency.linearRampToValueAtTime(900, t + i * 0.42 + 0.35); }
  }
  function thud() { if (!ok()) return; const t = now(); tone('sine', 62, t, 0.005, 0.75, 0.55, null, 30); nz(t, 0.002, 0.2, 0.2, 'lowpass', 200, 1); }
  function chime(n) {
    if (!ok()) return; const t = now();
    for (let i = 0; i < n; i++) { tone('sine', 220, t + i * 1.0, 0.005, 0.22, 1.6); tone('sine', 554, t + i * 1.0, 0.005, 0.07, 1.2); tone('triangle', 110, t + i * 1.0, 0.005, 0.18, 1.8); }
  }
  function whisper() {
    if (!ok()) return; const t = now();
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(1400, t); f.frequency.linearRampToValueAtTime(2800, t + 0.8); f.frequency.linearRampToValueAtTime(1600, t + 1.9);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 10; i++) { const tt = t + i * 0.19; g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.11, tt + 0.05); g.gain.linearRampToValueAtTime(0.008, tt + 0.16); }
    g.gain.linearRampToValueAtTime(0.0001, t + 2.1);
    const pn = ac.createStereoPanner ? ac.createStereoPanner() : null;
    s.connect(f); f.connect(g);
    if (pn) { pn.pan.setValueAtTime(-0.8, t); pn.pan.linearRampToValueAtTime(0.8, t + 2); g.connect(pn); pn.connect(sfxG); } else g.connect(sfxG);
    s.start(t); s.stop(t + 2.2);
  }
  function sting() {
    if (!ok()) return; const t = now();
    [55, 58.27, 82.41, 116.5].forEach(function (f) { tone('triangle', f, t, 0.01, 0.2, 2.8); });
    tone('sine', 1975, t, 0.3, 0.02, 2.2); tone('sine', 2093, t, 0.3, 0.02, 2.2);
    nz(t, 0.01, 0.18, 1.2, 'lowpass', 160, 1);
  }
  function scream() {
    if (!ok()) return; const t = now();
    nz(t, 0.004, 0.95, 0.95, 'bandpass', 1500, 0.5);
    nz(t, 0.004, 0.5, 0.7, 'highpass', 4000, 1);
    [311, 466, 587, 740, 933].forEach(function (f, i) {
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * (0.9 + Math.random() * 0.2), t);
      o.frequency.exponentialRampToValueAtTime(f * (1.6 + i * 0.07), t + 0.55);
      o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 1.05);
      const g = ac.createGain(); env(g, t, 0.004, 0.2, 1.0);
      const l = ac.createOscillator(); l.frequency.value = 23 + i * 7; const lg = ac.createGain(); lg.gain.value = 40;
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + 1.1);
      o.connect(g); g.connect(shaper); o.start(t); o.stop(t + 1.1);
    });
    tone('sine', 50, t, 0.004, 0.9, 0.6, null, 28);
  }
  /* удар ладонью в стекло */
  function bang(k) {
    if (!ok()) return; const t = now(), v = k || 1;
    tone('sine', 140, t, 0.002, 0.9 * v, 0.16, null, 50);
    nz(t, 0.001, 0.5 * v, 0.07, 'bandpass', 900, 0.8);
    tone('sine', 2300 + Math.random() * 500, t + 0.01, 0.001, 0.05 * v, 0.25);
  }
  /* металлический визг */
  function shriek() {
    if (!ok()) return; const t = now();
    [1180, 1570, 2090].forEach(function (f, i) {
      const o = ac.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.25); o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.9);
      const l = ac.createOscillator(); l.frequency.value = 31 + i * 9; const lg = ac.createGain(); lg.gain.value = 90;
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + 1);
      const g = ac.createGain(); env(g, t, 0.003, 0.12, 0.9);
      o.connect(g); g.connect(shaper); o.start(t); o.stop(t + 1);
    });
    nz(t, 0.003, 0.6, 0.8, 'highpass', 3000, 1);
  }
  /* низкий рык из-под пола */
  function growl() {
    if (!ok()) return; const t = now();
    [41, 43.5, 61].forEach(function (f) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.5, t + 1.1);
      const l = ac.createOscillator(); l.frequency.value = 17; const lg = ac.createGain(); lg.gain.value = 9;
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + 1.3);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
      o.connect(g); g.connect(shaper); o.start(t); o.stop(t + 1.3);
    });
  }
  function staticN(d) { if (!ok()) return; const t = now(); nz(t, 0.002, 0.5, d || 0.9, 'highpass', 1200, 0.5); nz(t, 0.002, 0.25, d || 0.9, 'bandpass', 300, 2); }
  function match() { if (!ok()) return; const t = now(); const f = nz(t, 0.01, 0.2, 0.3, 'bandpass', 5200, 2); f.frequency.linearRampToValueAtTime(2400, t + 0.3); nz(t + 0.28, 0.02, 0.06, 0.9, 'lowpass', 900, 1); }
  /* большой колокол собора */
  function bigBell() {
    if (!ok()) return; const t = now();
    [98, 196.5, 247, 294, 392, 494].forEach(function (f, i) { tone('sine', f, t, 0.004, 0.32 / (1 + i * 0.6), 4.5 - i * 0.4); });
    nz(t, 0.001, 0.2, 0.05, 'bandpass', 1200, 1);
  }
  function sip() { if (!ok()) return; const t = now(); nz(t, 0.05, 0.05, 0.25, 'bandpass', 900, 3); tone('sine', 660, t + 0.35, 0.01, 0.04, 0.4); tone('sine', 880, t + 0.5, 0.01, 0.03, 0.5); }
  function saltS() { if (!ok()) return; const t = now(); nz(t, 0.01, 0.1, 0.35, 'highpass', 5000, 1); tone('sine', 1320, t + 0.2, 0.01, 0.05, 0.8); }
  function dawn() { if (!ok()) return; const t = now(); [261.63, 329.63, 392, 523.25].forEach(function (f, i) { tone('sine', f, t + i * 0.5, 0.2, 0.07, 2.4); tone('triangle', f / 2, t + i * 0.5, 0.2, 0.04, 2.4); }); }
  function good() { if (!ok()) return; const t = now(); tone('sine', 660, t, 0.005, 0.06, 0.2); tone('sine', 990, t + 0.1, 0.005, 0.06, 0.35); }
  function step(k) {                    // шаг по мокрой мостовой
    if (!ok()) return; const t = now(); k = k || 1;
    nz(t, 0.003, 0.045 * k, 0.07, 'lowpass', 480 + Math.random() * 120, 1);
    nz(t + 0.01, 0.002, 0.012 * k, 0.06, 'bandpass', 2400 + Math.random() * 600, 2);
  }
  function glass() { if (!ok()) return; const t = now(); tone('sine', 1900, t, 0.001, 0.05, 0.08); tone('sine', 1700, t + 0.12, 0.001, 0.05, 0.08); }
  /* для видений: дыхание у самого лица, тиканье, треск стекла, лопата, скрип, «тсс» */
  function breath() { if (!ok()) return; const t = now(); const f = nz(t, 0.25, 0.22, 1.1, 'bandpass', 700, 0.9); f.frequency.linearRampToValueAtTime(380, t + 1.1); }
  function tick(k) { if (!ok()) return; const t = now(); tone('square', 3200, t, 0.0005, 0.03 * (k || 1), 0.02); nz(t, 0.0005, 0.04 * (k || 1), 0.02, 'highpass', 4000, 1); }
  function crack() { if (!ok()) return; const t = now(); for (let i = 0; i < 6; i++) { nz(t + i * 0.035 + Math.random() * 0.02, 0.0005, 0.25 - i * 0.03, 0.05, 'highpass', 2500 + i * 300, 1); } tone('sine', 3100, t, 0.001, 0.05, 0.4); }
  function dig() { if (!ok()) return; const t = now(); nz(t, 0.01, 0.35, 0.25, 'lowpass', 420, 1); nz(t + 0.02, 0.005, 0.08, 0.12, 'bandpass', 1600, 2); }
  function creak() { if (!ok()) return; const t = now(); const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t); o.frequency.linearRampToValueAtTime(110, t + 0.9); const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 8; const g = ac.createGain(); env(g, t, 0.08, 0.12, 0.9); o.connect(f); f.connect(g); g.connect(sfxG); o.start(t); o.stop(t + 1.1); }
  function hush() { if (!ok()) return; const t = now(); nz(t, 0.08, 0.16, 0.7, 'bandpass', 5200, 2); }
  function drip() { if (!ok()) return; const t = now(); const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(500, t + 0.08); const g = ac.createGain(); env(g, t, 0.001, 0.08, 0.12); o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + 0.2); }
  /* для видеозаставок: паровоз, огонь в печи, штамп */
  function whistle() {
    if (!ok()) return; const t = now();
    [[466, 0.05], [554, 0.04], [698, 0.025]].forEach(function (p) { const o = tone('triangle', p[0], t, 0.25, p[1], 1.9, null, p[0] * 0.94); o.detune.setValueAtTime(-30, t); o.detune.linearRampToValueAtTime(0, t + 0.3); });
    nz(t, 0.2, 0.05, 1.8, 'bandpass', 1500, 2);
  }
  function chug(n) { if (!ok()) return; const t = now(); for (let i = 0; i < (n || 6); i++) nz(t + i * 0.36, 0.01, 0.18 * (1 - i / ((n || 6) + 2)), 0.22, 'lowpass', 700, 1); }
  function crackle() { if (!ok()) return; const t = now(); nz(t, 0.3, 0.05, 1.6, 'lowpass', 900, 1); for (let i = 0; i < 14; i++) nz(t + Math.random() * 1.8, 0.0005, 0.08 + Math.random() * 0.1, 0.02, 'highpass', 2500 + Math.random() * 2000, 1); }
  function thunder() {
    if (!ok()) return; const t = now();
    nz(t, 0.01, 0.35, 0.3, 'lowpass', 1400, 1);
    nz(t + 0.12, 0.5, 0.42, 3.4, 'lowpass', 180, 0.7);
    nz(t + 0.5, 0.8, 0.25, 2.6, 'lowpass', 90, 0.7);
    tone('sine', 44, t + 0.1, 0.5, 0.22, 2.8, null, 30);
  }
  function stamp() { if (!ok()) return; const t = now(); tone('sine', 90, t, 0.002, 0.5, 0.16, null, 50); nz(t, 0.001, 0.2, 0.08, 'lowpass', 1200, 1); }

  /* ---------- фон: гул, ветер, дождь, шкатулочная мелодия ---------- */
  function startAmbient() {
    if (!ok() || amb) return;
    const t = now();
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 3); g.connect(musG);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.connect(g);
    const oscs = [];
    [[55, 'sine', 0.2], [55.6, 'sine', 0.17], [82.6, 'triangle', 0.06], [41.2, 'sine', 0.12]].forEach(function (d) {
      const o = ac.createOscillator(); o.type = d[1]; o.frequency.value = d[0];
      const og = ac.createGain(); og.gain.value = d[2]; o.connect(og); og.connect(lp); o.start(t); oscs.push(o);
    });
    // ветер
    const w = ac.createBufferSource(); w.buffer = noiseBuf; w.loop = true;
    const wf = ac.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 420; wf.Q.value = 1.2;
    const wl = ac.createOscillator(); wl.frequency.value = 0.07; const wlg = ac.createGain(); wlg.gain.value = 220;
    wl.connect(wlg); wlg.connect(wf.frequency); wl.start(t);
    const wg = ac.createGain(); wg.gain.value = 0.05; w.connect(wf); wf.connect(wg); wg.connect(g); w.start(t);
    // дождь
    const r = ac.createBufferSource(); r.buffer = noiseBuf; r.loop = true;
    const rf = ac.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 2600;
    const rg = ac.createGain(); rg.gain.value = 0.014; r.connect(rf); rf.connect(rg); rg.connect(g); r.start(t);
    // звон напряжения
    const hi1 = ac.createOscillator(); hi1.frequency.value = 1864; const hi2 = ac.createOscillator(); hi2.frequency.value = 1975;
    const hg = ac.createGain(); hg.gain.value = 0; hi1.connect(hg); hi2.connect(hg); hg.connect(g); hi1.start(t); hi2.start(t);
    amb = { g: g, hg: hg, nodes: oscs.concat([w, wl, r, hi1, hi2]) };
    scheduleNote();
  }
  function stopAmbient() {
    if (!amb) return;
    const a = amb; amb = null; clearTimeout(musTimer);
    const t = now(); a.g.gain.cancelScheduledValues(t); a.g.gain.setValueAtTime(a.g.gain.value, t); a.g.gain.linearRampToValueAtTime(0.0001, t + 1.2);
    setTimeout(function () { a.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); }, 1400);
  }
  const SCALE = [220, 261.63, 293.66, 329.63, 349.23, 415.3, 440, 523.25];
  let lastNote = 3;
  function scheduleNote() {
    clearTimeout(musTimer);
    musTimer = setTimeout(function () {
      if (!amb) return;
      const t = now();
      lastNote = Math.max(0, Math.min(SCALE.length - 1, lastNote + Math.floor(Math.random() * 5) - 2));
      let f = SCALE[lastNote];
      if (tension > 0.5 && Math.random() < tension) f *= 1 + (Math.random() - 0.5) * 0.07;   // расстроенная шкатулка
      const n = Math.random() < 0.35 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const ff = i ? SCALE[Math.max(0, lastNote - 2)] : f;
        tone('sine', ff * 2, t + i * 0.28, 0.003, 0.045, 1.9, musG);
        tone('triangle', ff * 4, t + i * 0.28, 0.003, 0.012, 0.6, musG);
      }
      scheduleNote();
    }, 2200 + Math.random() * 5200 - tension * 1200);
  }
  function setTension(x) {
    tension = Math.max(0, Math.min(1, x));
    if (amb) amb.hg.gain.setTargetAtTime(tension > 0.45 ? (tension - 0.45) * 0.012 : 0, now(), 0.8);
    clearInterval(hbTimer); hbTimer = 0;
    if (tension > 0.62 && ok()) {
      const beat = function () {
        if (!ok()) return; const t = now(), k = 0.25 + (tension - 0.62) * 1.4;
        tone('sine', 58, t, 0.004, k, 0.13, null, 38); tone('sine', 52, t + 0.17, 0.004, k * 0.7, 0.12, null, 36);
      };
      hbTimer = setInterval(beat, 980 - (tension - 0.62) * 900);
    }
  }
  function ticking(on) {
    clearInterval(tickTimer); tickTimer = 0;
    if (on) tickTimer = setInterval(function () {
      if (!ok()) return;
      nz(now(), 0.001, 0.028, 0.02, 'bandpass', (tickN++ % 2) ? 2600 : 3300, 4);
    }, 1000);
  }
  /* низкий «орган» Кредитора */
  function drone(on) {
    if (!ok()) return;
    if (on && !organ) {
      const t = now(), g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 2.5);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.connect(g); g.connect(musG);
      const os = [36.71, 43.65, 55, 58.27, 110.4].map(function (f) {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const og = ac.createGain(); og.gain.value = 0.11; o.connect(og); og.connect(lp); o.start(t); return o;
      });
      organ = { g: g, os: os };
    } else if (!on && organ) {
      const o = organ; organ = null; const t = now();
      o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(o.g.gain.value, t); o.g.gain.linearRampToValueAtTime(0.0001, t + 2);
      setTimeout(function () { o.os.forEach(function (x) { try { x.stop(); } catch (e) {} }); }, 2200);
    }
  }
  function setVolume(v) { vol = v; if (master) master.gain.setTargetAtTime(v, now(), 0.05); }

  return {
    init: init, bell: bell, door: door, coin: coin, blip: blip, click: click, deny: deny, page: page, knock: knock, scratch: scratch,
    thud: thud, chime: chime, whisper: whisper, sting: sting, scream: scream, sip: sip, salt: saltS, dawn: dawn, good: good, glass: glass, step: step,
    bang: bang, shriek: shriek, growl: growl, staticN: staticN, match: match, bigBell: bigBell,
    breath: breath, tick: tick, crack: crack, dig: dig, creak: creak, hush: hush, drip: drip, whistle: whistle, chug: chug, crackle: crackle, stamp: stamp, thunder: thunder,
    startAmbient: startAmbient, stopAmbient: stopAmbient, setTension: setTension, ticking: ticking, drone: drone, setVolume: setVolume
  };
})();
