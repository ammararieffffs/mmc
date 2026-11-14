/* =====================================================================
   MMC — signal.js
   One beat clock for the whole site (120 BPM, 2-bar pattern).

   • Ghost mode (default, silent): the pattern is computed from the clock,
     and envelopes + a synthetic spectrum drive the visuals.
   • Live mode (user presses Play): the same pattern is synthesised with
     WebAudio (no samples, no licensed audio) and a real AnalyserNode
     feeds the visuals.

   Public API: window.MMC.signal
     .level            0–1 overall energy (kick-weighted)
     .kick/.snare/.hat 0–1 envelopes
     .bands            Float32Array(64) spectrum 0–1, low → high
     .wave             Float32Array(128) waveform −1–1
     .live, .muted     state flags
     .motion           false when the user prefers reduced motion
     .play() .pause() .toggle() .setMuted(bool)
     .setDrive(0–1)    GAIN knob
     .setTone(0–1)     pointer → filter cutoff
     .bump(amount)     manual punch (intro count-in)
     .onFrame(fn)      subscribe to per-frame updates
     .onState(fn)      subscribe to play/mute changes
   ===================================================================== */
(function () {
  "use strict";
  var MMC = (window.MMC = window.MMC || {});

  var BPM = 120;
  var STEP = 60 / BPM / 4;     // one 16th note in seconds
  var STEPS = 32;              // two bars

  // Pattern (1 = hit). Original groove written for MMC.
  var P = {
    kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0,  1,0,0,0, 0,0,1,0, 1,0,0,1, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,  0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,1],
    hat:   [1,0,1,0, 1,0,1,1, 1,0,1,0, 1,0,1,0,  1,0,1,0, 1,0,1,1, 1,0,1,0, 1,1,1,0],
    // bass: MIDI note or 0 (A minor riff)
    bass:  [33,0,0,33, 0,0,36,0, 33,0,0,31, 0,0,28,0,  33,0,0,33, 0,0,36,0, 38,0,0,40, 0,0,43,0]
  };

  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var S = {
    level: 0, kick: 0, snare: 0, hat: 0,
    bands: new Float32Array(64),
    wave: new Float32Array(128),
    step: 0, beat: 0,
    live: false, muted: false,
    motion: !reduceMQ.matches,
    drive: 0.4, tone: 0.5,
    _bump: 0
  };
  MMC.signal = S;
  reduceMQ.addEventListener && reduceMQ.addEventListener("change", function (e) { S.motion = !e.matches; });

  var frameSubs = [], stateSubs = [];
  S.onFrame = function (fn) { frameSubs.push(fn); };
  S.onState = function (fn) { stateSubs.push(fn); };
  function emitState() { stateSubs.forEach(function (fn) { try { fn(S); } catch (e) { console.error(e); } }); }

  // ---------- helpers ----------
  function lastHit(track, t) {
    // time since the most recent hit of `track` at song time t (seconds)
    var s = Math.floor(t / STEP);
    for (var k = 0; k < STEPS; k++) {
      var idx = ((s - k) % STEPS + STEPS) % STEPS;
      if (P[track][idx]) return t - (s - k) * STEP;
    }
    return 99;
  }
  function env(dt, decay) { return dt < 0 ? 0 : Math.exp(-dt * decay); }

  // ---------- clock ----------
  var t0 = performance.now() / 1000;
  function songTime() {
    if (S.live && audio.ctx) {
      var lat = audio.ctx.outputLatency || audio.ctx.baseLatency || 0;
      return Math.max(0, audio.ctx.currentTime - audio.start - lat);
    }
    return performance.now() / 1000 - t0;
  }

  // ---------- audio engine (created on first Play) ----------
  var audio = { ctx: null, master: null, analyser: null, shaper: null, filter: null, noise: null, start: 0, next: 0, step: 0, timer: 0 };
  var freqData = null, timeData = null;

  function makeCurve(amount) {
    var k = 2 + amount * 60, n = 1024, c = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = (i * 2) / n - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
    return c;
  }

  function initAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    var ctx = (audio.ctx = new AC());
    audio.master = ctx.createGain();
    audio.master.gain.value = 0.55;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    audio.analyser = ctx.createAnalyser();
    audio.analyser.fftSize = 256;
    audio.analyser.smoothingTimeConstant = 0.72;
    audio.master.connect(comp); comp.connect(audio.analyser); audio.analyser.connect(ctx.destination);

    // bass bus: filter → drive
    audio.filter = ctx.createBiquadFilter();
    audio.filter.type = "lowpass"; audio.filter.Q.value = 7;
    audio.shaper = ctx.createWaveShaper();
    audio.shaper.curve = makeCurve(S.drive); audio.shaper.oversample = "2x";
    var bassOut = ctx.createGain(); bassOut.gain.value = 0.42;
    audio.filter.connect(audio.shaper); audio.shaper.connect(bassOut); bassOut.connect(audio.master);
    setTone(S.tone);

    // shared noise buffer
    var len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    audio.noise = buf;

    freqData = new Uint8Array(audio.analyser.frequencyBinCount);
    timeData = new Uint8Array(audio.analyser.fftSize);
    return true;
  }

  function kick(t) {
    var c = audio.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.connect(g); g.connect(audio.master); o.start(t); o.stop(t + 0.4);
  }
  function noiseHit(t, hp, dur, vol) {
    var c = audio.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = audio.noise; f.type = "highpass"; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(audio.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function snare(t) {
    noiseHit(t, 1400, 0.2, 0.5);
    var c = audio.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(audio.master); o.start(t); o.stop(t + 0.14);
  }
  function hat(t, accent) { noiseHit(t, 7500, accent ? 0.06 : 0.035, accent ? 0.22 : 0.12); }
  function bass(t, midi) {
    var c = audio.ctx, f = 440 * Math.pow(2, (midi - 69) / 12), g = c.createGain();
    var o1 = c.createOscillator(), o2 = c.createOscillator();
    o1.type = "sawtooth"; o2.type = "square"; o1.frequency.value = f; o2.frequency.value = f * 1.005;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.35, t + STEP * 1.5); g.gain.exponentialRampToValueAtTime(0.001, t + STEP * 2.6);
    o1.connect(g); o2.connect(g); g.connect(audio.filter);
    o1.start(t); o2.start(t); o1.stop(t + STEP * 2.8); o2.stop(t + STEP * 2.8);
  }

  function schedule() {
    var c = audio.ctx;
    while (audio.next < c.currentTime + 0.12) {
      var i = audio.step % STEPS, t = audio.next;
      if (P.kick[i]) kick(t);
      if (P.snare[i]) snare(t);
      if (P.hat[i]) hat(t, i % 4 === 0);
      if (P.bass[i]) bass(t, P.bass[i]);
      audio.step++; audio.next += STEP;
    }
  }

  function setTone(v) {
    S.tone = v;
    if (audio.filter) audio.filter.frequency.setTargetAtTime(180 + Math.pow(v, 2) * 2600, audio.ctx.currentTime, 0.05);
  }


  /* ---------- instrument voices (user-triggered, sound must be on) ---------- */
  S.soundOn = false;
  function ensureAudio() { if (!audio.ctx && !initAudio()) return false; if (audio.ctx.state !== "running") audio.ctx.resume(); return true; }
  function pluck(t, freq, dur, bright, vol, dest) {
    var c = audio.ctx, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = "sawtooth"; o2.type = "triangle"; o.frequency.value = freq; o2.frequency.value = freq * 2.003;
    f.type = "lowpass"; f.Q.value = 2; f.frequency.setValueAtTime(bright, t); f.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 1.5), t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(dest || audio.master);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function tone(t, f0, f1, dur, vol, type) {
    var c = audio.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audio.master); o.start(t); o.stop(t + dur + 0.05);
  }
  var hz = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  var VOICES = {
    guitar: function (t) { [40, 47, 52, 55, 59, 64].forEach(function (m, i) { pluck(t + i * 0.018, hz(m), 2.2, 3200, 0.16, audio.shaper); }); },
    bass:   function (t) { pluck(t, hz(33), 1.6, 900, 0.5); pluck(t + 0.45, hz(40), 1.2, 800, 0.35); },
    kick:   function (t) { kick(t); },
    snare:  function (t) { snare(t); },
    hat:    function (t) { hat(t, true); hat(t + 0.125, false); hat(t + 0.25, false); },
    tom:    function (t) { tone(t, 180, 110, 0.5, 0.6); },
    floor:  function (t) { tone(t, 110, 65, 0.7, 0.7); },
    crash:  function (t) { noiseHit(t, 3200, 1.8, 0.35); },
    ride:   function (t) { noiseHit(t, 6000, 1.2, 0.15); tone(t, 2400, 2350, 1.4, 0.06, "triangle"); },
    keys:   function (t) { [60, 64, 67, 71, 74].forEach(function (m) { pluck(t, hz(m), 2.6, 2400, 0.09); var c = audio.ctx, o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = hz(m); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6); o.connect(g); g.connect(audio.master); o.start(t); o.stop(t + 2.7); }); },
    mic:    function (t) {
      var c = audio.ctx, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
      o.type = "sawtooth"; o.frequency.value = hz(57); lfo.frequency.value = 5.5; lg.gain.value = 3; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.12); g.gain.setValueAtTime(0.22, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      [[700, 8], [1150, 10], [2600, 12]].forEach(function (fq) { var b = c.createBiquadFilter(); b.type = "bandpass"; b.frequency.value = fq[0]; b.Q.value = fq[1]; o.connect(b); b.connect(g); });
      g.connect(audio.master); o.start(t); lfo.start(t); o.stop(t + 1.3); lfo.stop(t + 1.3);
    },
    desk:   function (t) {
      var c = audio.ctx, s = c.createBufferSource(), b = c.createBiquadFilter(), g = c.createGain();
      s.buffer = audio.noise; b.type = "bandpass"; b.Q.value = 6; b.frequency.setValueAtTime(200, t); b.frequency.exponentialRampToValueAtTime(6000, t + 1.2);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 1.0); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      s.connect(b); b.connect(g); g.connect(audio.master); s.start(t); s.stop(t + 1.5); kick(t + 1.2); noiseHit(t + 1.2, 3200, 1.2, 0.25);
    },
    stage:  function (t) { kick(t); noiseHit(t, 3200, 1.8, 0.35); VOICES.guitar(t); }
  };
  S.voice = function (name) {
    S.bump(1);
    if (!S.soundOn || !VOICES[name]) return false;
    if (!ensureAudio()) return false;
    VOICES[name](audio.ctx.currentTime + 0.02);
    return true;
  };
  S.enableSound = function (on) {
    S.soundOn = !!on;
    if (on) { if (!ensureAudio()) { S.soundOn = false; emitState(); return false; } S.setMuted(false); }
    else { if (S.live) S.pause(); if (audio.master) audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.02); }
    emitState(); return S.soundOn;
  };

  S.play = function () {
    if (S.live) return;
    if (!audio.ctx && !initAudio()) { console.warn("[MMC] Web Audio is not available in this browser."); return; }
    var c = audio.ctx;
    c.resume().then(function () {
      audio.start = c.currentTime + 0.06; audio.next = audio.start; audio.step = 0;
      audio.timer = setInterval(schedule, 25); schedule();
      S.live = true; emitState();
    });
  };
  S.pause = function () {
    if (!S.live) return;
    clearInterval(audio.timer); S.live = false;
    audio.ctx && audio.ctx.suspend();
    t0 = performance.now() / 1000; // restart ghost clock on the downbeat
    emitState();
  };
  S.toggle = function () { S.live ? S.pause() : S.play(); };
  S.setMuted = function (m) {
    S.muted = !!m;
    if (audio.master) audio.master.gain.setTargetAtTime(S.muted || !S.soundOn ? 0 : 0.55, audio.ctx.currentTime, 0.02);
    emitState();
  };
  S.setDrive = function (v) {
    S.drive = v;
    if (audio.shaper) audio.shaper.curve = makeCurve(v);
  };
  S.setTone = setTone;
  S.bump = function (a) { S._bump = Math.max(S._bump, a || 1); };

  // Never keep sound running in a background tab.
  document.addEventListener("visibilitychange", function () { if (document.hidden && S.live) S.pause(); });

  // ---------- per-frame update ----------
  var lastStep = -1, smooth = new Float32Array(64);
  function frame() {
    var t = songTime();
    var step = Math.floor(t / STEP);
    S.step = step % STEPS;
    if (step !== lastStep) { lastStep = step; if (step % 4 === 0) S.beat = (step / 4) % 8; }

    S.kick = env(lastHit("kick", t), 7);
    S.snare = env(lastHit("snare", t), 9);
    S.hat = env(lastHit("hat", t), 26);
    S._bump *= 0.9;

    var i;
    if (S.live && audio.analyser) {
      audio.analyser.getByteFrequencyData(freqData);
      audio.analyser.getByteTimeDomainData(timeData);
      // 128 bins → 64 bands, slightly log-weighted toward the lows
      for (i = 0; i < 64; i++) {
        var a = Math.floor(Math.pow(i / 64, 1.6) * 110), b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / 64, 1.6) * 110));
        var m = 0; for (var k = a; k < b; k++) m = Math.max(m, freqData[k]);
        S.bands[i] = S.muted ? S.bands[i] * 0.85 : m / 255;
      }
      for (i = 0; i < 128; i++) S.wave[i] = S.muted ? 0 : (timeData[i * 2] - 128) / 128;
      var e = 0; for (i = 0; i < 12; i++) e += S.bands[i]; e /= 12;
      S.level = Math.min(1, Math.max(S.muted ? 0 : e * 1.15, S.kick * 0.5, S._bump));
    } else {
      // synthetic spectrum shaped by the same groove
      var drv = 0.6 + S.drive * 0.8;
      for (i = 0; i < 64; i++) {
        var x = i / 63;
        var v = S.kick * Math.exp(-x * 9) * 1.0 +
                S.snare * Math.exp(-Math.pow((x - 0.38) * 5, 2)) * 0.7 +
                S.hat * Math.max(0, x - 0.55) * 1.5 +
                0.05 + 0.04 * Math.sin(t * 3 + i * 0.7);
        smooth[i] += (Math.min(1, v * drv) - smooth[i]) * 0.35;
        S.bands[i] = smooth[i];
      }
      for (i = 0; i < 128; i++) {
        var p = i / 128 * Math.PI * 2;
        S.wave[i] = (Math.sin(p * 2 + t * 6) * S.kick * 0.8 + Math.sin(p * 9 + t * 20) * S.snare * 0.3 + (Math.random() - 0.5) * S.hat * 0.3) * drv * 0.8;
      }
      S.level = Math.min(1, Math.max(S.kick * 0.9 + S.snare * 0.35, S._bump));
    }

    for (i = 0; i < frameSubs.length; i++) { try { frameSubs[i](S, t); } catch (err) { console.error(err); frameSubs.splice(i--, 1); } }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
