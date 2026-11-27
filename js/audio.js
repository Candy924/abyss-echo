/* =========================================================================
   audio.js — 全部音效由 WebAudio 即時合成（沒有 .mp3/.ogg 檔案）
   任何環境不支援 AudioContext 時，所有呼叫都安全地變成 no-op
   ========================================================================= */
window.SFX = (function () {
  'use strict';

  var ac = null, master = null, musicGain = null;
  var muted = false, musicOn = true;
  var musicVol = 1, sfxVol = 1;
  try {
    var mv = localStorage.getItem('abyssEcho.musicVol');
    if (mv != null) musicVol = Math.max(0, Math.min(1, parseFloat(mv) || 1));
    var sv = localStorage.getItem('abyssEcho.sfxVol');
    if (sv != null) sfxVol = Math.max(0, Math.min(1, parseFloat(sv) || 1));
  } catch (e) {}
  var musicTimer = null, step = 0;
  var siren = null;

  /* 真實空襲警報：兩支鋸齒波微失諧 + 低頻，做上升下降掃頻 */
  function startSiren() {
    var a = ensure();
    if (!a || muted || siren) return;
    try {
      var t0 = a.currentTime;
      var osc = a.createOscillator(); osc.type = 'sawtooth';
      var osc2 = a.createOscillator(); osc2.type = 'sawtooth';
      var sub = a.createOscillator(); sub.type = 'sine';
      var filt = a.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 1600; filt.Q.value = 5;
      var g = a.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.32, t0 + 0.5);
      var seg = 7, t = t0;
      for (var c = 0; c < 3; c++) {
        osc.frequency.setValueAtTime(340, t);
        osc.frequency.linearRampToValueAtTime(900, t + seg / 2);
        osc.frequency.linearRampToValueAtTime(340, t + seg);
        osc2.frequency.setValueAtTime(344, t);
        osc2.frequency.linearRampToValueAtTime(906, t + seg / 2);
        osc2.frequency.linearRampToValueAtTime(344, t + seg);
        sub.frequency.setValueAtTime(170, t);
        sub.frequency.linearRampToValueAtTime(300, t + seg / 2);
        sub.frequency.linearRampToValueAtTime(170, t + seg);
        t += seg;
      }
      filt.frequency.setValueAtTime(1100, t0);
      filt.frequency.linearRampToValueAtTime(2800, t0 + 5);
      osc.connect(filt); osc2.connect(filt); sub.connect(filt);
      filt.connect(g); g.connect(master);
      osc.start(t0); osc2.start(t0); sub.start(t0);
      siren = { osc: osc, osc2: osc2, sub: sub, g: g };
    } catch (e) { siren = null; }
  }

  function stopSiren() {
    if (!siren || !ac) return;
    var s = siren;
    siren = null;
    try {
      var t = ac.currentTime;
      s.g.gain.cancelScheduledValues(t);
      s.g.gain.setValueAtTime(Math.max(0.0002, s.g.gain.value), t);
      s.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      s.osc.stop(t + 0.45); s.osc2.stop(t + 0.45); s.sub.stop(t + 0.45);
    } catch (e) {}
  }

  function ensure() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.5;
      master.connect(ac.destination);
      musicGain = ac.createGain();
      musicGain.gain.value = 0.30;
      musicGain.connect(master);
    } catch (e) {
      ac = null;
    }
    return ac;
  }

  function env(node, t0, a, d, peak) {
    var g = node.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + a);
    g.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  /* 單音：可指定起訖頻率做滑音 */
  function tone(o) {
    var a = ensure();
    if (!a || muted) return;
    try {
      var t0 = a.currentTime + (o.delay || 0);
      var dur = o.dur || 0.1;
      var osc = a.createOscillator();
      var g = a.createGain();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(o.f, t0);
      if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + dur);
      env(g, t0, o.a || 0.004, dur, o.gain == null ? 0.15 : o.gain);
      osc.connect(g);
      g.connect(o.bus || master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.06);
    } catch (e) {}
  }

  /* 噪音：用 buffer 產生白噪音，可加濾波器掃頻 */
  function noise(o) {
    var a = ensure();
    if (!a || muted) return;
    try {
      var dur = o.dur || 0.12;
      var t0 = a.currentTime + (o.delay || 0);
      var len = Math.max(1, Math.floor(a.sampleRate * dur));
      var buf = a.createBuffer(1, len, a.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = a.createBufferSource();
      src.buffer = buf;
      var bp = a.createBiquadFilter();
      bp.type = o.filterType || 'bandpass';
      bp.frequency.setValueAtTime(o.freq || 1200, t0);
      if (o.sweep) bp.frequency.exponentialRampToValueAtTime(Math.max(60, o.sweep), t0 + dur);
      bp.Q.value = o.q || 1;
      var g = a.createGain();
      env(g, t0, 0.003, dur, o.gain == null ? 0.18 : o.gain);
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  /* ---------------- 音效表 ---------------- */
  var API = {
    unlock: function () { ensure(); },

    setMuted: function (v) {
      muted = !!v;
      if (master) master.gain.value = muted ? 0 : 0.5;
      try { localStorage.setItem('abyssEcho.muted', muted ? '1' : '0'); } catch (e) {}
    },
    /* 設定：音樂 / 音效音量（0~1） */
    setMusicVolume: function (v) {
      musicVol = Math.max(0, Math.min(1, v));
      if (musicGain) musicGain.gain.value = 0.30 * musicVol;
      try { localStorage.setItem('abyssEcho.musicVol', String(musicVol)); } catch (e) {}
    },
    setSfxVolume: function (v) {
      sfxVol = Math.max(0, Math.min(1, v));
      if (master && !muted) master.gain.value = 0.5 * sfxVol;
      try { localStorage.setItem('abyssEcho.sfxVol', String(sfxVol)); } catch (e) {}
    },
    getMusicVolume: function () { return musicVol; },
    getSfxVolume: function () { return sfxVol; },
    isMuted: function () { return muted; },
    toggleMute: function () { API.setMuted(!muted); return muted; },

    shoot: function (kind) {
      if (kind === 'shotgun' || kind === 'gun') { noise({ dur: 0.14, freq: 900, gain: 0.22 }); tone({ f: 220, f2: 90, dur: 0.1, type: 'square', gain: 0.1 }); }
      else if (kind === 'smg') { tone({ f: 620, f2: 380, dur: 0.045, type: 'square', gain: 0.07 }); }
      else if (kind === 'laser') { tone({ f: 1500, f2: 620, dur: 0.12, type: 'sawtooth', gain: 0.09 }); }
      else if (kind === 'staff' || kind === 'magic') { tone({ f: 420, f2: 900, dur: 0.16, type: 'sine', gain: 0.13 }); noise({ dur: 0.1, freq: 2400, gain: 0.05 }); }
      else if (kind === 'bow') { noise({ dur: 0.09, freq: 2600, sweep: 900, gain: 0.1 }); }
      else if (kind === 'sword' || kind === 'melee') { noise({ dur: 0.13, freq: 3200, sweep: 700, gain: 0.13, filterType: 'highpass' }); }
      else if (kind === 'rpg' || kind === 'cannon') { tone({ f: 160, f2: 60, dur: 0.24, type: 'sawtooth', gain: 0.16 }); noise({ dur: 0.2, freq: 600, gain: 0.14 }); }
      /* 追加武器的專屬音色 */
      else if (kind === 'thunder') { noise({ dur: 0.16, freq: 4200, sweep: 1200, gain: 0.16, filterType: 'highpass' }); tone({ f: 1800, f2: 300, dur: 0.18, type: 'sawtooth', gain: 0.09 }); }
      else if (kind === 'frost') { tone({ f: 2400, f2: 1200, dur: 0.22, type: 'triangle', gain: 0.10 }); noise({ dur: 0.18, freq: 3800, sweep: 1500, gain: 0.07, filterType: 'highpass' }); }
      else if (kind === 'quake') { tone({ f: 90, f2: 40, dur: 0.3, type: 'sawtooth', gain: 0.2 }); noise({ dur: 0.26, freq: 300, sweep: 80, gain: 0.16, filterType: 'lowpass' }); }
      else if (kind === 'meteor') { tone({ f: 1400, f2: 300, dur: 0.34, type: 'sine', gain: 0.11 }); noise({ dur: 0.3, freq: 800, sweep: 200, gain: 0.09 }); }
      else if (kind === 'void') { tone({ f: 120, f2: 320, dur: 0.3, type: 'sine', gain: 0.14 }); tone({ f: 640, f2: 160, dur: 0.26, type: 'triangle', gain: 0.07, delay: 0.03 }); }
      else if (kind === 'star') { tone({ f: 1320, dur: 0.1, type: 'sine', gain: 0.1 }); tone({ f: 1760, dur: 0.12, type: 'sine', gain: 0.08, delay: 0.06 }); tone({ f: 2200, dur: 0.14, type: 'sine', gain: 0.06, delay: 0.12 }); }
      else if (kind === 'bell') { tone({ f: 880, dur: 0.5, type: 'sine', gain: 0.12 }); tone({ f: 1320, dur: 0.4, type: 'sine', gain: 0.06, delay: 0.01 }); }
      else { tone({ f: 760, f2: 420, dur: 0.07, type: 'square', gain: 0.09 }); }
    },
    dry: function () { tone({ f: 180, f2: 120, dur: 0.05, type: 'square', gain: 0.05 }); },
    hit: function () { noise({ dur: 0.05, freq: 900, gain: 0.09 }); },
    kill: function () { tone({ f: 300, f2: 90, dur: 0.18, type: 'triangle', gain: 0.12 }); noise({ dur: 0.12, freq: 500, gain: 0.1 }); },
    hurt: function () { tone({ f: 260, f2: 80, dur: 0.26, type: 'sawtooth', gain: 0.18 }); noise({ dur: 0.14, freq: 400, gain: 0.1 }); },
    coin: function () { tone({ f: 1180, dur: 0.05, type: 'square', gain: 0.05 }); tone({ f: 1560, dur: 0.07, type: 'square', gain: 0.045, delay: 0.045 }); },
    heal: function () { tone({ f: 520, f2: 900, dur: 0.16, type: 'sine', gain: 0.12 }); tone({ f: 780, dur: 0.12, type: 'sine', gain: 0.08, delay: 0.1 }); },
    dash: function () { noise({ dur: 0.2, freq: 420, sweep: 3200, gain: 0.11, filterType: 'bandpass' }); },
    skill: function () { tone({ f: 300, f2: 1100, dur: 0.3, type: 'sine', gain: 0.16 }); noise({ dur: 0.3, freq: 1800, sweep: 300, gain: 0.1 }); },
    boom: function () { noise({ dur: 0.3, freq: 320, sweep: 70, gain: 0.24, filterType: 'lowpass' }); tone({ f: 120, f2: 45, dur: 0.3, type: 'sawtooth', gain: 0.16 }); },
    nuke: function () { noise({ dur: 1.1, freq: 160, sweep: 30, gain: 0.5, filterType: 'lowpass' }); tone({ f: 70, f2: 26, dur: 1.0, type: 'sawtooth', gain: 0.32 }); tone({ f: 1400, f2: 200, dur: 0.5, type: 'sine', gain: 0.12 }); },
    alarm: function () {
      /* 空襲警報（短版，沒有 startSiren 時的備援） */
      tone({ f: 880, f2: 620, dur: 0.28, type: 'square', gain: 0.10 });
      tone({ f: 660, f2: 440, dur: 0.30, type: 'square', gain: 0.09, delay: 0.30 });
      noise({ dur: 0.16, freq: 1200, gain: 0.04, filterType: 'bandpass' });
    },
    startSiren: startSiren,
    stopSiren: stopSiren,
    buy: function () { tone({ f: 660, dur: 0.07, type: 'square', gain: 0.09 }); tone({ f: 990, dur: 0.09, type: 'square', gain: 0.08, delay: 0.07 }); },
    portal: function () { tone({ f: 240, f2: 720, dur: 0.5, type: 'sine', gain: 0.14 }); noise({ dur: 0.5, freq: 700, sweep: 2600, gain: 0.07 }); },
    level: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone({ f: f, dur: 0.14, type: 'square', gain: 0.09, delay: i * 0.09 }); }); },
    die: function () { tone({ f: 330, f2: 50, dur: 0.9, type: 'sawtooth', gain: 0.18 }); noise({ dur: 0.7, freq: 500, sweep: 80, gain: 0.12 }); },
    roar: function () { tone({ f: 90, f2: 42, dur: 0.75, type: 'sawtooth', gain: 0.22 }); noise({ dur: 0.6, freq: 260, gain: 0.14 }); },
    win: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone({ f: f, dur: 0.22, type: 'triangle', gain: 0.1, delay: i * 0.13 }); }); }
  };

  /* ---------------- 極簡 chiptune 背景樂 ---------------- */
  var BASS = [55, 55, 82.4, 55, 73.4, 73.4, 98, 73.4, 55, 55, 82.4, 55, 65.4, 65.4, 87.3, 65.4];
  var ARP  = [220, 277, 330, 415, 220, 277, 330, 494, 220, 277, 330, 415, 196, 247, 294, 392];

  function transpose(arr, f) {
    return arr.map(function (v) { return Math.round(v * f); });
  }
  var BASS_HI = transpose(BASS, 1.122);
  var BASS_LO = transpose(BASS, 0.891);
  var ARP_HI = transpose(ARP, 1.189);
  var ARP_LO = transpose(ARP, 0.840);

  /* 場景定義：大廳 / 戰鬥 / 首領 / 勝利 */
  var musicScene = 'menu';
  var SCENES = {
    menu:    { ms: 185, bass: BASS,    arp: ARP,    lead: 'triangle', arpEvery: 2, arpVol: 0.18, drum: 'soft',  drumVol: 0.22 },
    battle:  { ms: 132, bass: BASS_HI, arp: ARP_HI, lead: 'square',   arpEvery: 1, arpVol: 0.22, drum: 'soft',  drumVol: 0.34 },
    boss:    { ms: 108, bass: BASS_LO, arp: ARP_HI, lead: 'sawtooth', arpEvery: 1, arpVol: 0.20, drum: 'heavy', drumVol: 0.44 },
    victory: { ms: 156, bass: BASS_HI, arp: BASS_HI, lead: 'triangle', arpEvery: 2, arpVol: 0.24, drum: 'none', drumVol: 0 }
  };

  function tickMusic() {
    if (!musicOn || muted) return;
    var a = ensure();
    if (!a) return;
    var S = SCENES[musicScene] || SCENES.menu;
    try {
      var i = step % 16;
      var t0 = a.currentTime;
      // bass
      var o = a.createOscillator(), g = a.createGain();
      o.type = 'triangle';
      o.frequency.value = S.bass[i];
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.5, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g); g.connect(musicGain);
      o.start(t0); o.stop(t0 + 0.26);
      // arp
      if (i % S.arpEvery === 0) {
        var o2 = a.createOscillator(), g2 = a.createGain();
        o2.type = S.lead;
        o2.frequency.value = S.arp[i];
        g2.gain.setValueAtTime(0.0001, t0);
        g2.gain.linearRampToValueAtTime(S.arpVol, t0 + 0.01);
        g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
        o2.connect(g2); g2.connect(musicGain);
        o2.start(t0); o2.stop(t0 + 0.2);
      }
      // 低音鼓
      if (S.drum !== 'none' && i % 4 === 0) {
        var d = a.createOscillator(), dg = a.createGain();
        d.type = 'sine';
        d.frequency.setValueAtTime(120, t0);
        d.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
        dg.gain.setValueAtTime(S.drumVol, t0);
        dg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
        d.connect(dg); dg.connect(musicGain);
        d.start(t0); d.stop(t0 + 0.2);
      }
      // 小鼓／金屬
      if (S.drum === 'heavy' && i % 8 === 4) {
        var nz = a.createBufferSource(), ng = a.createGain(), bp = a.createBiquadFilter();
        var len = Math.floor(a.sampleRate * 0.12);
        var buf = a.createBuffer(1, len, a.sampleRate);
        var ch = buf.getChannelData(0);
        for (var n = 0; n < len; n++) ch[n] = (Math.random() * 2 - 1) * (1 - n / len);
        nz.buffer = buf;
        bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8;
        ng.gain.setValueAtTime(0.28, t0);
        ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
        nz.connect(bp); bp.connect(ng); ng.connect(musicGain);
        nz.start(t0);
      }
      step++;
    } catch (e) {}
  }

  API.setScene = function (name) {
    if (!SCENES[name] || name === musicScene) return;
    musicScene = name;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (musicOn) API.startMusic();
  };
  API.scene = function () { return musicScene; };

  API.startMusic = function () {
    ensure();
    if (musicTimer) return;
    var S = SCENES[musicScene] || SCENES.menu;
    musicTimer = setInterval(tickMusic, S.ms);
  };
  API.stopMusic = function () {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  };
  API.setMusic = function (on) {
    musicOn = !!on;
    if (musicOn) API.startMusic(); else API.stopMusic();
  };

  return API;
})();
