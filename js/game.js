/* =========================================================================
   深淵迴響 Abyss Echo — 主程式（單機 Roguelike 動作射擊）
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var cv = $('game');
  var ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  var frame = $('frame');

  var errEl = $('errlog');
  window.addEventListener('error', function (e) {
    if (errEl) errEl.textContent += 'ERROR: ' + e.message + ' @' + (e.lineno || 0) + ':' + (e.colno || 0) + '\n';
  });

  /* ------------------------------------------------------------------ */
  var VW = 480, VH = 270, TILE = 16;
  var RW = 640, RH = 352, WALLT = 16;
  var FLOORS_PER_CHAPTER = 10;
  var TAU = Math.PI * 2;

  var D = window.DATA;
  var RARITY = D.RARITY, HEROES = D.HEROES, WEAPONS = D.WEAPONS, TIERS = D.TIERS;
  var ENEMIES = D.ENEMIES, BOSSES = D.BOSSES, STATS = D.STATS, EQUIP_SLOTS = D.EQUIP_SLOTS;
  var CHESTS = D.CHESTS, DROPPABLE = D.DROPPABLE;
  var ULT = D.ULTIMATES, DIFFICULTY = D.DIFFICULTY;
  var THEMES = D.THEMES, CHAPTERS = D.CHAPTERS, PREMIUM = D.PREMIUM_WEAPON;
  var PREMIUM_WEAPONS = D.PREMIUM_WEAPONS, MYTHIC_PRICE = D.MYTHIC_PRICE, LEGEND_PRICE = D.LEGEND_PRICE;
  var TALENTS = D.TALENTS;
  var FPS = D.FLOORS_PER_STAGE, SPC = D.STAGES_PER_CHAPTER;   // 10 層一小關 · 3 小關一章
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* 分級鑰匙 */
  function emptyKeys() { return { bronze: 0, silver: 0, gold: 0, mythic: 0 }; }
  function totalKeys(k) {
    if (!k) return 0;
    if (typeof k === 'number') return k;
    return (k.bronze || 0) + (k.silver || 0) + (k.gold || 0) + (k.mythic || 0);
  }
  function keyLabel(id) {
    for (var i = 0; i < D.KEY_TYPES.length; i++) if (D.KEY_TYPES[i].id === id) return D.KEY_TYPES[i].name;
    return '鑰匙';
  }
  function rollKeyType() {
    var r = Math.random();
    for (var i = 0; i < D.KEY_TYPES.length; i++) {
      if (r < D.KEY_TYPES[i].drop) return D.KEY_TYPES[i].id;
      r -= D.KEY_TYPES[i].drop;
    }
    return null;
  }

  /* 把本局的鑰匙存進局外倉庫 */
  function importSave(obj) {
    if (!obj || typeof obj !== 'object') { toast('存檔格式錯誤'); return false; }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(obj));
      save = loadSave();
      writeSave();
      refreshTitle();
      refreshVault();
      toast('存檔已匯入');
      return true;
    } catch (e) { toast('存檔格式錯誤'); return false; }
  }

  function bankRunKeys() {
    if (!save.keyTypes) save.keyTypes = { bronze: 0, silver: 0, gold: 0, mythic: 0, pink: 0 };
    if (run && run.keys) {
      save.keyTypes.bronze = (save.keyTypes.bronze || 0) + (run.keys.bronze || 0);
      save.keyTypes.silver = (save.keyTypes.silver || 0) + (run.keys.silver || 0);
      save.keyTypes.gold = (save.keyTypes.gold || 0) + (run.keys.gold || 0);
      save.keyTypes.mythic = (save.keyTypes.mythic || 0) + (run.keys.mythic || 0);
      save.keyTypes.pink = (save.keyTypes.pink || 0) + (run.keys.pink || 0);
    }
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function normAng(a) {
    if (!isFinite(a)) return 0;
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
  }

  /* ---------------- 存檔 ---------------- */
  var SAVE_KEY = 'abyssEcho.save.v4';
  var OLD_KEYS = ['abyssEcho.save.v3', 'abyssEcho.save.v2', 'abyssEcho.save.v1'];
  var DEFAULT_SAVE = {
    v: 4, gems: 0, keys: 0,
    unlocked: { knight: true },
    up: { hp: 0, atk: 0, spd: 0, coin: 0, crit: 0, luck: 0 },
    metaItems: [], metaEquipped: [],
    premium: false, premiumWeapons: {}, mythicWeapons: [], forgedWeapons: [], loadout: null, extraSlots: 0,
    chapterUp: {}, ultimate: false, forgedEquip: {},
    keyTypes: { bronze: 0, silver: 0, gold: 0, mythic: 0 },
    chapterUnlocked: 1, chapterCleared: {},
    runSave: null,
    bag: [], bagMats: 0, talentSeen: {},
    best: 0, runs: 0, hero: 'knight'
  };
  var save = loadSave();

  /* 一次性歸檔：把所有「以前模擬購買」的解鎖清空，改成必須真實付款 */
  function archiveOldPurchases() {
    if (!save || save.ownerMode) return false;
    if (save.purchaseArchiveV1) return false;
    save.purchaseArchiveV1 = true;
    save.premiumWeapons = {};
    save.forgedEquip = {};
    save.metaItems = [];
    save.forgedWeapons = (save.forgedWeapons || []).filter(function (w) { return w && w.rarity < 4; });
    save.ultimate = false;
    save.paidUnlock = false;
    try { writeSave(); } catch (e) {}
    return true;
  }
  var archivedNow = archiveOldPurchases();

  function loadSave() {
    var out = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) raw = localStorage.getItem(SAVE_KEY + '.bak');
      if (!raw) for (var i = 0; i < OLD_KEYS.length && !raw; i++) raw = localStorage.getItem(OLD_KEYS[i]);
      if (raw) {
        var s = JSON.parse(raw);
        out.gems = s.gems || 0;
        out.keys = s.keys || 0;
        out.best = s.best || 0;
        out.runs = s.runs || 0;
        out.hero = s.hero || 'knight';
        out.premium = !!s.premium;
        out.chapterUnlocked = s.chapterUnlocked || 1;
        out.extraSlots = s.extraSlots || 0;
        if (s.chapterUp) out.chapterUp = s.chapterUp;
        out.ultimate = !!s.ultimate;
        if (s.forgedEquip) out.forgedEquip = s.forgedEquip;
        else if (s.equipUnlock) out.forgedEquip = {};
        if (s.keyTypes) { for (var kt in out.keyTypes) out.keyTypes[kt] = s.keyTypes[kt] || 0; }
        else if (typeof s.keys === 'number') out.keyTypes.bronze = s.keys || 0;
        if (s.chapterCleared) out.chapterCleared = s.chapterCleared;
        if (s.premiumWeapons) out.premiumWeapons = s.premiumWeapons;
        if (Array.isArray(s.mythicWeapons)) out.mythicWeapons = s.mythicWeapons;
        if (Array.isArray(s.forgedWeapons)) out.forgedWeapons = s.forgedWeapons;
        if (s.loadout) out.loadout = s.loadout;
        if (s.runSave) out.runSave = s.runSave;
        if (s.unlocked) for (var k in s.unlocked) if (s.unlocked[k]) out.unlocked[k] = true;
        if (s.up) { for (var u in s.up) out.up[u] = s.up[u] || 0; }
        if (Array.isArray(s.metaItems)) out.metaItems = s.metaItems;
        if (Array.isArray(s.metaEquipped)) out.metaEquipped = s.metaEquipped;
        /* 通用合併：任何沒列在上面的欄位也要保留，避免新增欄位或旗標被重置 */
        for (var key in s) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
          if (!(key in out)) out[key] = s[key];
        }
        /* 這些旗標一旦為 true 就必須保留（付費、主人版、歸檔） */
        out.paidUnlock = !!(s.paidUnlock || out.paidUnlock);
        out.ownerMode = !!(s.ownerMode || out.ownerMode);
        out.purchaseArchiveV1 = !!(s.purchaseArchiveV1 || out.purchaseArchiveV1);
      }
    } catch (e) {}

    /* ---- v2 資料遷移：清空所有人的武器與裝備（保留魔晶／章節／永久強化／解鎖碼） ---- */
    var needMigrate = false;
    if (!out.lockResetV2) {
      out.premiumWeapons = {};
      out.mythicWeapons = [];
      out.forgedWeapons = [];
      out.forgedEquip = {};
      out.metaItems = [];
      out.metaEquipped = [];
      out.loadout = null;
      out.lockResetV2 = true;
      needMigrate = true;
    }
    /* 付費內容一律回到鎖定狀態，必須重新輸入解鎖碼 */
    out.paidUnlock = false;
    if (needMigrate) {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(out)); } catch (e2) {}
    }
    return out;
  }
  /* ---- CrazyGames Data Module：雲端存檔（沒有 SDK 時自動回退 localStorage） ---- */
  function cgData() {
    try {
      var S = window.CrazyGames && window.CrazyGames.SDK;
      return (S && S.data) ? S.data : null;
    } catch (e) { return null; }
  }
  function cloudSave(raw) {
    var d = cgData();
    if (!d || typeof d.setItem !== 'function') return;
    try { d.setItem(SAVE_KEY, raw); } catch (e) {}
  }
  function cloudPull() {
    var d = cgData();
    if (!d || typeof d.getItem !== 'function') return false;
    try {
      var v = d.getItem(SAVE_KEY);
      if (!v || v.length < 20) return false;
      var local = null;
      try { local = localStorage.getItem(SAVE_KEY); } catch (e) {}
      if (!local) {
        localStorage.setItem(SAVE_KEY, v);
        localStorage.setItem(SAVE_KEY + '.bak', v);
        return true;
      }
    } catch (e) {}
    return false;
  }
  /* SDK 載入後：本地沒存檔就從雲端拉回來 */
  (function initCloud() {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (cgData()) {
        clearInterval(t);
        if (cloudPull()) { try { location.reload(); } catch (e) {} }
      }
      if (tries > 20) clearInterval(t);
    }, 500);
  })();

  function writeSave() {
    try {
      var raw = JSON.stringify(save);
      localStorage.setItem(SAVE_KEY, raw);
      /* 備份：主存檔損壞或寫入中斷時可還原 */
      localStorage.setItem(SAVE_KEY + '.bak', raw);
      cloudSave(raw);
    } catch (e) {}
  }

  /* 關閉 / 切到背景前強制寫檔，避免「大退後強化消失」 */
  try {
    window.addEventListener('pagehide', function () { try { writeSave(); } catch (e) {} });
    window.addEventListener('beforeunload', function () { try { writeSave(); } catch (e) {} });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { try { writeSave(); } catch (e) {} }
    });
  } catch (e) {}

  var UPGRADES = [
    { id: 'hp', name: '體魄', desc: '生命上限 +14', max: 10, cost: function (l) { return 40 + l * 30; } },
    { id: 'atk', name: '鋒銳', desc: '攻擊力 +8%', max: 10, cost: function (l) { return 50 + l * 35; } },
    { id: 'spd', name: '疾行', desc: '移動速度 +4%', max: 10, cost: function (l) { return 35 + l * 25; } },
    { id: 'coin', name: '貪婪', desc: '起始金幣 +40', max: 10, cost: function (l) { return 30 + l * 20; } },
    { id: 'crit', name: '致命', desc: '暴擊率 +2%', max: 10, cost: function (l) { return 60 + l * 40; } },
    { id: 'luck', name: '幸運', desc: '稀有度 +4%', max: 10, cost: function (l) { return 55 + l * 40; } },
    { id: 'armor', name: '堅甲', desc: '受到傷害 -2%', max: 10, cost: function (l) { return 65 + l * 45; } },
    { id: 'ls', name: '嗜血', desc: '生命竊取 +1%', max: 10, cost: function (l) { return 70 + l * 50; } },
    { id: 'en', name: '靈能', desc: '能量上限 +12', max: 10, cost: function (l) { return 40 + l * 30; } },
    { id: 'regen', name: '再生', desc: '生命回復 +6%', max: 10, cost: function (l) { return 45 + l * 35; } },
    { id: 'magnet', name: '磁力', desc: '拾取範圍 +20%', max: 10, cost: function (l) { return 35 + l * 25; } },
    { id: 'keyfind', name: '尋寶', desc: '鑰匙掉落 +10%', max: 10, cost: function (l) { return 50 + l * 35; } }
  ];

  /* 每個永久強化欄位的上限：基礎 10，每解鎖一章 +10 */
  function upCap(u) {
    var bonus = Math.max(0, (save.chapterUnlocked || 1) - 1) * 10;
    return (u ? u.max : 10) + bonus;
  }

  /* ---------------- 狀態 ---------------- */
  var mode = 'title';
  var run = null;
  var heroSel = save.hero || 'knight';
  var time = 0, lastTs = 0;
  var keys = {};
  var mouse = { x: VW / 2, y: VH / 2, down: false };
  var pending = { dash: false, skill: false, interact: false };
  var toastT = 0, bannerT = 0;
  var hudIconTick = 0;
  var QUALITY = 1;
  var DEMO = /[?&]demo\b/.test(location.search);
  var demoOn = DEMO;

  /* ---------------- 縮放 ---------------- */
  function resize() {
    var vv = window.visualViewport;
    var vw = vv ? vv.width : window.innerWidth;
    var vh = vv ? vv.height : window.innerHeight;
    var s = Math.min(vw / VW, vh / VH);
    var scale = s >= 2 ? Math.floor(s * 4) / 4 : Math.max(0.5, Math.round(s * 100) / 100);
    var fw = Math.round(VW * scale), fh = Math.round(VH * scale);
    /* 保險：永遠不超出可視區域，避免被裁掉一半造成「整體向下」 */
    if (fw > vw) { scale = vw / VW; fw = Math.floor(VW * scale); fh = Math.floor(VH * scale); }
    if (fh > vh) { scale = vh / VH; fw = Math.floor(VW * scale); fh = Math.floor(VH * scale); }
    frame.style.width = fw + 'px';
    frame.style.height = fh + 'px';
    frame.style.fontSize = clamp(Math.round(fh / 24), 11, 21) + 'px';
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  window.addEventListener('load', function () { resize(); setTimeout(resize, 250); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) resize(); });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
    window.visualViewport.addEventListener('scroll', resize);
  }

  /* ---------------- 選單切換 ---------------- */
  var SCREENS = ['screen-title', 'screen-heroes', 'screen-upgrade', 'screen-help', 'screen-pause', 'screen-end', 'screen-stats', 'screen-difficulty', 'screen-stageclear', 'screen-vault', 'screen-shop', 'screen-bag', 'screen-runshop', 'screen-chapters', 'screen-chapterclear', 'screen-talents', 'screen-settings'];

  function showScreen(id) {
    SCREENS.forEach(function (s) {
      var el = $(s);
      if (el) el.classList.toggle('hidden', s !== id);
    });
    var hud = $('hud');
    if (hud) hud.classList.toggle('hidden', !(id === null));
    var pr = $('prompt');
    if (pr && id !== null) pr.classList.add('hidden');
    var tc = $('touch');
    if (tc) tc.classList.toggle('hidden', !(id === null && IS_TOUCH));
    if (id !== null) closeChest();
  }

  /* 按鈕按下的動畫（每種按鈕的顏色與節奏不同） */
  function installButtonFx() {
    document.addEventListener('pointerdown', function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('button') : null;
      if (!b || b.disabled) return;
      /* 畫面上的技能／大招／觸控按鈕不做任何 DOM 改寫，避免影響遊戲操作 */
      if (b.closest && (b.closest('#hud') || b.closest('#touch'))) return;
      b.classList.add('btn-fx');
      var r = document.createElement('span');
      r.className = 'ripple';
      var rect = b.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 0.45;
      r.style.width = r.style.height = size + 'px';
      r.style.left = (ev.clientX - rect.left - size / 2) + 'px';
      r.style.top = (ev.clientY - rect.top - size / 2) + 'px';
      var cs = getComputedStyle(b);
      r.style.color = cs.color || '#fff';
      b.appendChild(r);
      setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 520);
      b.classList.remove('pressed');
      void b.offsetWidth;
      b.classList.add('pressed');
      setTimeout(function () { b.classList.remove('pressed'); }, 180);
    }, true);
  }

  /* =====================================================================
     首次遊玩教學（30 秒內讓玩家知道怎麼玩）
     ===================================================================== */
  var TUT_STEPS = [
    { icon: 'WASD', title: 'Move', text: 'WASD / arrows on PC. On mobile: drag the left half of the screen.' },
    { icon: '🖱', title: 'Shoot', text: 'Hold left click to fire. On mobile: hold ATTACK (auto-aims the nearest enemy).' },
    { icon: 'SPACE', title: 'Dash', text: 'Space to dash — you are invincible during the roll. Mobile: DASH button.' },
    { icon: 'Q', title: 'Skill & Ultimate', text: 'SHIFT = hero skill, Q = ultimate when the energy bar is full.' },
    { icon: 'F', title: 'Chests & Bag', text: 'Press F to open chests. Weapons go to your BAG (B) — fuse 3 of a kind into a higher tier.' },
    { icon: 'FLOOR', title: 'Portal & Chapters', text: 'Clear the room, press F at the portal. Every 10 floors a new chapter and a boss.' },
    { icon: '★', title: 'Upgrades & Vault', text: 'Spend crystals on permanent upgrades. Shop items unlock free — just press and wait 30s.' }
  ];
  var tutMoveAcc = 0;
  var tutResume = false;
  var tutIdx = 0;

  function renderTutorial() {
    var st = TUT_STEPS[tutIdx];
    var icon = $('tutIcon'), title = $('tutTitle'), text = $('tutText'), step = $('tutStep');
    if (icon) icon.textContent = st.icon;
    if (title) title.textContent = st.title;
    if (text) text.textContent = st.text;
    if (step) step.textContent = (tutIdx + 1) + ' / ' + TUT_STEPS.length;
  }

  function maybeShowTutorial() {
    return; /* 已改為主畫面導覽 */
    if (!run || save.tutV3) return;
    tutIdx = 0;
    tutMoveAcc = 0;
    renderTutorial();
    var box = $('tutorial');
    if (box) box.classList.remove('hidden');
    /* 教學期間暫停遊戲：怪物不會偷打 */
    if (mode === 'play') { tutResume = true; mode = 'tutorial'; }
  }

  function endTutorial() {
    var box = $('tutorial');
    if (box) box.classList.add('hidden');
    save.tutV3 = true;
    writeSave();
    if (tutResume && mode === 'tutorial') { mode = 'play'; tutResume = false; }
    if (window.SFX && SFX.level) SFX.level();
  }

  /* 遊戲內自動前進：真的做了動作才換下一步 */
  var tutAutoT = 0;
  function tickTutorial(dt) {
    tutAutoT += dt;
    /* 8 秒後自動進下一步，玩家不會卡住 */
    if (tutAutoT > 8) { tutAutoT = 0; if (tutIdx < TUT_STEPS.length - 1) { tutIdx++; renderTutorial(); } else endTutorial(); }
    if (save.tutV3 || !run || !run.player) return;
    var box = $('tutorial');
    if (!box || box.classList.contains('hidden')) return;
    if (tutIdx === 0) {
      tutMoveAcc += dt;
      if (tutMoveAcc > 0.35 && (keys['w'] || keys['a'] || keys['s'] || keys['d'])) {
        tutIdx = 1; renderTutorial();
      }
    } else if (tutIdx === 1) {
      if ((run.shots || 0) > 2 || keys[' '] || mouse.down) { tutIdx = 2; renderTutorial(); }
    } else if (tutIdx === 2) {
      if (run.cleared) endTutorial();
    }
  }

    bind('btnTutSkip', function () { endTutorial(); });


  /* 背包按鈕：固定在右下角，任何時候都看得到、都按得到 */
  function refreshBagBtn() {
    var b = document.getElementById('hudBag');
    if (!b) return;
    b.style.display = 'block';
    b.style.position = 'fixed';
    b.style.right = '12px';
    b.style.bottom = '16px';
    b.style.zIndex = '1200';
    b.style.pointerEvents = 'auto';
    b.style.opacity = '1';
    b.style.visibility = 'visible';
  }

  function menuMode(m) {
    if (SFX.setScene && m !== null && (!run || m === 'title' || m === 'end')) SFX.setScene('menu');
    mode = m;
    refreshBagBtn();
    if (m === 'title') { showScreen('screen-title'); refreshTitle(); }
    else if (m === 'heroes') { showScreen('screen-heroes'); refreshHeroes(); }
    else if (m === 'upgrade') { showScreen('screen-upgrade'); refreshUpgrades(); }
    else if (m === 'help') { showScreen('screen-help'); }
    else if (m === 'pause') { showScreen('screen-pause'); refreshPause(); if (window.Ads && Ads.gameplayStop) Ads.gameplayStop(); }
    else if (m === 'stats') { showScreen('screen-stats'); refreshStats(); }
    else if (m === 'settings') { showScreen('screen-settings'); if (syncSettingsUi) syncSettingsUi(); }
    else if (m === 'difficulty') { showScreen('screen-difficulty'); refreshDifficulty(); }
    else if (m === 'vault') { showScreen('screen-vault'); refreshVault(); }
    else if (m === 'shop') { showScreen('screen-shop'); refreshShop(); }
    else if (m === 'bag') { showScreen('screen-bag'); refreshBag(); }
    else if (m === 'chapters') { showScreen('screen-chapters'); refreshChapters(); }
    else if (m === 'chapterclear') { showScreen('screen-chapterclear'); }
  }

  function setThemeVar(color) {
    try { document.documentElement.style.setProperty('--theme', color); } catch (e) {}
  }

  function drawTitleOrnaments() {
    var l = $('logoL'), r = $('logoR');
    if (l && l.getContext) {
      var g1 = l.getContext('2d');
      g1.clearRect(0, 0, 40, 40);
      Art.glow(g1, 20, 20, 16, 'rgba(243,194,80,.6)', 0.8);
      Art.drawWeaponIcon(g1, 'sword', 20, 22, 2.2, '#f3c250');
    }
    if (r && r.getContext) {
      var g2 = r.getContext('2d');
      g2.clearRect(0, 0, 40, 40);
      Art.glow(g2, 20, 20, 16, 'rgba(176,124,240,.6)', 0.8);
      Art.drawWeaponIcon(g2, 'blade', 20, 22, 2.2, '#c9b6ff');
    }
  }

  function refreshTitle() {
    $('gemText').textContent = save.gems;
    var vm = $('verMini');
    if (vm) vm.textContent = window.GAME_VERSION || '0.00.00';
    var b = $('bestText');
    b.textContent = save.best > 0 ? '最佳紀錄：抵達第 ' + save.best + ' 層' : '最佳紀錄：尚未出發';
    var cb = $('btnContinue');
    if (cb) {
      var has = hasRunSave();
      cb.classList.toggle('hidden', !has);
      if (has) cb.textContent = '繼續冒險 · 第 ' + (save.runSave.floor + 1) + ' 層';
    }
    refreshCarousel();
    refreshQuickUp();
    /* 主按鈕標題依章節改變 */
    try {
      var mega = document.querySelector('#btnPlay .mega-label');
      if (mega) {
        var ci = typeof chapterSel === 'number' ? chapterSel : (save.chapterChoice || 0);
        var ch0 = CHAPTERS[ci] || CHAPTERS[0];
        var th0 = ch0 && THEMES[ch0.theme];
        mega.textContent = th0 ? ('進入' + th0.name) : '進入地下城';
      }
    } catch (e) {}
  }

  /* ---------------- 封面 3D 角色轉盤 ---------------- */
  var heroIdx = Math.max(0, D.HERO_IDS.indexOf(heroSel));

  function refreshCarousel() {
    /* 主畫面的角色轉盤已移除，角色改由「角色」按鈕進入 */
    return;
  }

  function refreshCarouselLegacy() {
    var wrap = null;
    if (!wrap) return;
    wrap.innerHTML = '';
    var ids = D.HERO_IDS;
    for (var i = 0; i < ids.length; i++) {
      var off = i - heroIdx;
      if (Math.abs(off) > 2) continue;
      var id = ids[i], h = HEROES[id];
      var locked = !save.unlocked[id];
      var card = document.createElement('div');
      card.className = 'c-card' + (off === 0 ? ' active' : '') + (locked ? ' locked' : '');
      card.style.transform = 'translate(-50%,-50%) translateX(' + (off * 56) + '%) scale(' +
        (1 - Math.min(2, Math.abs(off)) * 0.22).toFixed(3) + ') rotateY(' + (-off * 34) + 'deg)';
      card.style.opacity = off === 0 ? '1' : '0.5';
      card.style.zIndex = String(10 - Math.abs(off));
      card.innerHTML = '<canvas width="120" height="112"></canvas><span class="nm">' + h.name + '</span>';
      var cvs = card.querySelector('canvas');
      if (cvs) {
        var g = cvs.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.save();
        g.translate(60, 88);
        g.scale(3.2, 3.2);
        Art.drawHero(g, h.kind, 0, 0, 0.8, 1, 0, {}, h.palette);
        g.restore();
      }
      card.addEventListener('click', (function (idx) {
        return function () { pickHero(idx); };
      })(i));
      wrap.appendChild(card);
    }
    var cur = HEROES[heroSel];
    var info = null;
    if (info) {
      var u = ULT[cur.id] || {};
      info.innerHTML = '<b>' + cur.name + '</b> · ' + cur.skill.name +
        '<br><span class="ult">終極：' + (u.name || '—') + '</span>' +
        (save.unlocked[cur.id] ? '' : ' · <b>未解鎖</b>');
    }
    var cnt = null;
    if (cnt) cnt.textContent = Object.keys(save.unlocked).filter(function (k) { return save.unlocked[k]; }).length + '/13';
  }

  function pickHero(i) {
    var id = D.HERO_IDS[i];
    if (!id) return;
    if (!save.unlocked[id]) {
      clickHero(id);
      heroIdx = i;
      refreshCarousel();
      return;
    }
    heroSel = id;
    save.hero = id;
    writeSave();
    heroIdx = i;
    SFX.buy();
    refreshCarousel();
  }

  /* ---------------- 封面右側：快速強化 ---------------- */
  function refreshQuickUp() {
    /* 主畫面的快速強化已移除，改由「強化」按鈕進入 */
    return;
  }

  function refreshQuickUpLegacy() {
    var el = null;
    if (!el) return;
    el.innerHTML = '';
    UPGRADES.forEach(function (u) {
      var lv = save.up[u.id] || 0;
      var maxed = lv >= u.max;
      var cost = u.cost(lv);
      var row = document.createElement('div');
      row.className = 'qu-row';
      var pips = '';
      for (var i = 0; i < u.max; i++) pips += '<i class="' + (i < lv ? 'on' : '') + '"></i>';
      row.innerHTML =
        '<div><div class="nm"><span>' + u.name + '</span><i>' + (maxed ? 'MAX' : cost) + '</i></div>' +
        '<div class="pips">' + pips + '</div></div>' +
        '<button class="' + (maxed ? '' : 'primary') + '"' + (maxed ? ' disabled' : '') + '>+</button>';
      var btn = row.querySelector('button');
      if (btn && !maxed) {
        btn.addEventListener('click', function () {
          if (save.gems < cost) { toast('魔晶不足'); SFX.dry(); return; }
          save.gems -= cost;
          save.up[u.id] = lv + 1;
          writeSave();
          SFX.level();
          toast(u.name + ' Lv.' + (lv + 1));
          refreshQuickUp();
          refreshTitle();
        });
      }
      el.appendChild(row);
    });
    var qg = null;
    if (qg) qg.textContent = save.gems;
  }

  /* ---------------- 難度 ---------------- */
  function refreshDifficulty() {
    var grid = $('diffGrid');
    if (!grid) return;
    grid.innerHTML = '';
    DIFFICULTY.forEach(function (d) {
      var card = document.createElement('div');
      card.className = 'diff-card';
      card.style.setProperty('--dc', d.color);
      var stars = d.id === 'easy' ? '★' : (d.id === 'normal' ? '★★' : '★★★');
      card.innerHTML =
        '<div class="dstars">' + stars + '</div>' +
        '<div class="dname">' + d.name + '</div>' +
        '<div class="dsub">' + d.sub + '</div>' +
        '<div class="drow"><span>敵人生命</span><b>×' + d.hp.toFixed(2) + '</b></div>' +
        '<div class="drow"><span>敵人傷害</span><b>×' + d.dmg.toFixed(2) + '</b></div>' +
        '<div class="drow"><span>魔晶獎勵</span><b>' + Math.round(d.gems * 100) + '%</b></div>' +
        '<div class="drow"><span>幸運加成</span><b>+' + Math.round(d.luck * 100) + '%</b></div>' +
        '<div class="dnote">' + d.note + '</div>';
      card.addEventListener('click', function () {
        startRun(heroSel, d.id, chapterSel);
      });
      grid.appendChild(card);
    });
  }


  /* ---------------- 主畫面導覽（第一次開遊戲時逐個功能介紹） ---------------- */
  var TOUR_STEPS = [
    { sel: '#btnPlay', text: 'Play — start a run. Pick a chapter and difficulty next.' },
    { sel: '#btnHeroes', text: 'Heroes — choose who you play as.' },
    { sel: '#btnUpgrade', text: 'Upgrades — spend crystals on permanent stats.' },
    { sel: '#btnVault', text: 'Vault — your gear, chests and the Recycle area.' },
    { sel: '#btnShop', text: 'Shop — every item is free: press and wait 30s.' },
    { sel: '#btnBag', text: 'Bag — weapons found in runs (in-run only).' },
    { sel: '#btnHelp', text: 'Controls — keyboard and touch layout.' },
    { sel: '#btnSettings', text: 'Settings — audio, quality, language, save export.' },
    { sel: '#btnNews', text: 'News — patch notes and pinned free-unlock info.' }
  ];
  var tourIdx = 0, tourEl = null;

  function tourClear() {
    if (tourEl && tourEl.parentNode) tourEl.parentNode.removeChild(tourEl);
    tourEl = null;

    save.tourDone = true;
    writeSave();
  }

  function tourShow(i) {
    var st = TOUR_STEPS[i];
    var el = document.querySelector(st.sel);
    if (!el) { tourNext(); return; }
    var r = el.getBoundingClientRect();
    var pad = 8;
    var x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad);
    var w = r.width + pad * 2, h = r.height + pad * 2;
    var vw = window.innerWidth, vh = window.innerHeight;

    if (!tourEl) {
      tourEl = document.createElement('div');
      tourEl.className = 'tour';
      document.body.appendChild(tourEl);
    }
    tourEl.innerHTML =
      '<div class="tour-mask" style="left:0;top:0;width:' + vw + 'px;height:' + y + 'px"></div>' +
      '<div class="tour-mask" style="left:0;top:' + (y + h) + 'px;width:' + vw + 'px;height:' + Math.max(0, vh - y - h) + 'px"></div>' +
      '<div class="tour-mask" style="left:0;top:' + y + 'px;width:' + x + 'px;height:' + h + 'px"></div>' +
      '<div class="tour-mask" style="left:' + (x + w) + 'px;top:' + y + 'px;width:' + Math.max(0, vw - x - w) + 'px;height:' + h + 'px"></div>' +
      '<div class="tour-frame" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px"></div>' +
      '<div class="tour-tip" style="left:' + tipLeft(r) + 'px;top:' + tipTop(r) + 'px;width:340px">' +
      '<div class="tour-step">' + (i + 1) + ' / ' + TOUR_STEPS.length + '</div>' +
      '<p>' + st.text + '</p>' +
      '<div class="tour-row"><button class="tour-skip">Skip</button>' +
      '<button class="tour-next primary">' + (i === TOUR_STEPS.length - 1 ? 'Got it' : 'Next') + '</button></div>' +
      '</div>';
    var next = tourEl.querySelector('.tour-next');
    var skip = tourEl.querySelector('.tour-skip');
    if (next) next.addEventListener('click', function () { tourNext(); });
    if (skip) skip.addEventListener('click', function () { tourClear(); });
  }

  function tipLeft(r) {
    return Math.min(window.innerWidth - 356, Math.max(12, r.left + r.width / 2 - 170));
  }
  function tipTop(r) {
    var t = r.bottom + 22;
    if (t > window.innerHeight - 190) t = Math.max(12, r.top - 178);
    return t;
  }

  function tourNext() {
    tourIdx++;
    if (tourIdx >= TOUR_STEPS.length) { tourClear(); return; }
    tourShow(tourIdx);
  }

  function startTour() {
    if (save.tourDone) return;
    tourIdx = 0;
    tourShow(0);
  }
  window.__startTour = startTour;
  window.__tourClear = tourClear;


  /* ---------------- 新手教學關（Training Chamber） ---------------- */
  var TRAIN_STEPS = [
    { key: 'move',  icon: 'WASD',  text: 'Move with WASD (mobile: drag the left half)' },
    { key: 'shoot', icon: '🖱',    text: 'Hold Left Click / ATTACK to shoot' },
    { key: 'skill', icon: 'SHIFT', text: 'Press SHIFT / SKILL to use your hero skill' },
    { key: 'dash',  icon: 'SPACE', text: 'Press SPACE / DASH to dodge (brief invulnerability)' },
    { key: 'ult',   icon: 'Q',     text: 'Press Q / ULTIMATE to unleash your ultimate' }
  ];
  var trainStep = 0;

  function spawnTrainingDummy() {
    if (!run) return;
    var p = run.player;
    var a = Math.random() * Math.PI * 2;
    var d = 90;
    var e = addEnemy({
      base: 'slime', name: 'Training Dummy', arch: 'walker', pal: { a: '#8cf0ff', b: '#3a6ea5', c: '#ffffff' },
      uid: 'train', hpMul: 0.6, dmgMul: 0, spdMul: 0, scale: 1.1, trait: 'none'
    }, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
    if (e) { e.dmg = 0; e.spd = 0; e.training = true; e.hp = e.maxHp = 40; }
  }

  function trainBar(step) {
    var box = document.getElementById('tutorial');
    if (!box) return;
    var st = TRAIN_STEPS[step];
    document.getElementById('tutIcon').textContent = st.icon;
    document.getElementById('tutTitle').textContent = 'Training';
    document.getElementById('tutText').textContent = st.text;
    document.getElementById('tutStep').textContent = (step + 1) + ' / ' + TRAIN_STEPS.length;
    box.classList.remove('hidden');
  }

  function trainDone(key) {
    if (!run || !run.training) return;
    if (TRAIN_STEPS[trainStep] && TRAIN_STEPS[trainStep].key !== key) return;
    trainStep++;
    try { if (SFX.level) SFX.level(); } catch (e) {}
    if (trainStep >= TRAIN_STEPS.length) {
      run.training = null;
      save.trainingDone = true;
      writeSave();
      var tb = document.getElementById('tutorial');
      if (tb) tb.classList.add('hidden');
      banner('Training complete', 'The abyss awaits');
      toast('Training complete — good luck!');
      return;
    }
    trainBar(trainStep);
    run.enemies = [];
    spawnTrainingDummy();
  }

  function startTraining(heroId, diffId, chapterId) {
    startRun(heroId, diffId, chapterId, { training: true });
    run.training = true;
    run.enemies = [];
    trainStep = 0;
    spawnTrainingDummy();
    trainBar(0);
  }

  /* ---------------- 隱藏試煉 ---------------- */
  function spawnRushBoss() {
    var keysList = Object.keys(BOSSES);
    var idx = run.rush.index;
    var id = keysList[(idx * 3 + 1) % keysList.length];
    spawnBoss(id, 0.85 + idx * 0.3);
    run.cam.shake = 8;
    addParticles(run.player.x, run.player.y, 26, '#ff5ce0', { speed: 240 });
  }

  function enterSecret() {
    if (!run || run.rush) return;
    run.secretDoor = null;
    run.rush = { left: 5, index: 1 };
    run.enemies = [];
    run.bullets = [];
    run.props = [];
    run.cleared = false;
    run.portal = null;
    run.chest = null;
    run.items = [];
    run.clouds = [];
    spawnRushBoss();
    banner('隱藏試煉', '連續 5 名首領');
    SFX.roar();
  }

  /* ---------------- 天賦：傳送門後三選一 ---------------- */
  function openTalents() {
    if (mode !== 'play' || !run) return;
    var pool = TALENTS.slice();
    var picks = [];
    /* 第一張固定是「本角色專屬天賦」（未拿過才出現） */
    var hid = (run.player && run.player.hero && run.player.hero.id) || 'default';
    var hkey = 'hero_' + hid;
    if (!run.talents[hkey]) {
      var ht = (D.HERO_TALENTS && (D.HERO_TALENTS[hid] || D.HERO_TALENTS.default)) || { name: '專屬', desc: '', color: '#cfc6ee' };
      picks.push({ id: hkey, name: '專屬 · ' + ht.name, desc: ht.desc, color: ht.color });
    }
    for (var i = 0; i < 3 - picks.length && pool.length; i++) {
      picks.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
    }
    /* 保險：永遠湊滿 3 張 */
    while (picks.length < 3) picks.push(TALENTS[randInt(0, TALENTS.length - 1)]);
    run.talentChoices = picks;
    mode = 'talent';
    showScreen('screen-talents');
    renderTalents(picks);
    SFX.level();
  }

  function renderTalents(list) {
    var wrap = $('talentCards');
    if (!wrap) return;
    wrap.innerHTML = '';
    list.forEach(function (t, idx) {
      var card = document.createElement('div');
      card.className = 'talent-card';
      card.style.setProperty('--tc', t.color);
      card.innerHTML =
        '<div class="tal-key">' + (idx + 1) + '</div>' +
        '<div class="tal-name">' + t.name + '</div>' +
        '<div class="tal-desc">' + t.desc + '</div>';
      card.addEventListener('click', function () { pickTalent(t.id); });
      wrap.appendChild(card);
    });
  }

  function pickTalent(id) {
    if (mode !== 'talent' || !run) return;
    var t = null;
    for (var i = 0; i < TALENTS.length; i++) if (TALENTS[i].id === id) t = TALENTS[i];
    run.talents[id] = (run.talents[id] || 0) + 1;
    if (id === 'lifesteal') run.player.lifestealPct += 0.06;
    if (id.indexOf('hero_') === 0) run.heroTalent = id.slice(5);
    /* 天賦 → 祝福欄 */
    if (!run.blessings) run.blessings = [];
    var bless = t;
    if (!bless && id.indexOf('hero_') === 0) {
      var htB = (D.HERO_TALENTS && (D.HERO_TALENTS[run.heroTalent] || D.HERO_TALENTS.default)) || {};
      bless = { name: '專屬 · ' + (htB.name || ''), color: htB.color || '#cfc6ee' };
    }
    if (bless && run.blessings.length < 8) run.blessings.push({ name: bless.name, color: bless.color || '#cfc6ee' });
    if (run.player.talents !== run.talents) run.player.talents = run.talents;
    recalcStats(run.player);
    if (t) toast('獲得天賦：' + t.name);
    else if (id.indexOf('hero_') === 0) {
      var ht2 = (D.HERO_TALENTS && (D.HERO_TALENTS[run.heroTalent] || D.HERO_TALENTS.default)) || {};
      toast('專屬天賦：' + (ht2.name || ''));
    }
    SFX.level();
    mode = 'play';
    showScreen(null);
    nextFloor();
  }

  function skipTalent() {
    if (mode !== 'talent') return;
    mode = 'play';
    showScreen(null);
    nextFloor();
  }

  function hasTalent(id) {
    return !!(run && run.talents && run.talents[id]);
  }
  var chapterSel = 0;

  function refreshChapters() {
    var grid = $('chapterGrid');
    if (!grid) return;
    grid.innerHTML = '';
    CHAPTERS.forEach(function (ch, i) {
      var th = THEMES[ch.theme];
      var unlocked = i < (save.chapterUnlocked || 1);
      var cleared = !!(save.chapterCleared && save.chapterCleared[i]);
      var card = document.createElement('div');
      card.className = 'chapter-card' + (unlocked ? '' : ' locked') + (cleared ? ' cleared' : '');
      card.style.setProperty('--accent', th.accent);
      card.innerHTML =
        '<div class="ch-no">CHAPTER ' + (i + 1) + '</div>' +
        '<div class="ch-name">' + th.name + '</div>' +
        '<div class="ch-sub">30 層 · 3 小關</div>' +
        '<div class="ch-state">' + (cleared ? '★ 已通關（可重複挑戰）' : (unlocked ? '可挑戰' : '未解鎖')) + '</div>';
      card.addEventListener('click', function () {
        if (!unlocked) { toast('先通關前面的章節'); SFX.dry(); return; }
        chapterSel = i;
        save.chapterChoice = i;
        writeSave();
        setThemeVar(th.accent);
        menuMode('difficulty');
      });
      grid.appendChild(card);
    });
  }

  function chapterComplete() {
    if (mode === 'chapterclear' || mode === 'end') return;
    var ci = chapterIndex(run.floor);
    var reached = run.floor + 1;
    var keys = totalKeys(run.keys);
    var gems = Math.round((run.kills * 2 + 300 + keys * 4) * run.diff.gems);
    save.gems += gems;
    save.keys += keys;
    bankRunKeys();
    if (!save.chapterCleared) save.chapterCleared = {};
    save.chapterCleared[ci] = true;
    save.chapterUnlocked = Math.max(save.chapterUnlocked || 1, ci + 2);
    save.best = Math.max(save.best, reached);
    save.runSave = null;
    writeSave();

    mode = 'chapterclear';
    var th = THEMES[CHAPTERS[ci % CHAPTERS.length].theme];
    $('ccTitle').textContent = '第 ' + (ci + 1) + ' 章 通關';
    $('ccSub').textContent = th.name + ' 已淨空 · 下一章已解鎖';
    $('ccStats').innerHTML = [
      ['章節', th.name],
      ['擊殺數', run.kills],
      ['鑰匙', '+' + keys],
      ['魔晶', '+' + gems]
    ].map(function (r) { return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('');
    showScreen('screen-chapterclear');
    SFX.win();
  }

  function backToTitle() {
    run = null;
    mode = 'title';
    showScreen('screen-title');
    refreshTitle();
    SFX.stopMusic();
  }

  /* ---------------- 逐層自動存檔 ---------------- */
  function saveRunSnapshot() {
    if (!run || !run.player) return;
    var w = run.player.weapon;
    save.runSave = {
      hero: run.hero.id,
      diff: run.diff.id,
      floor: run.floor,
      hp: Math.max(1, Math.round(run.player.hp)),
      energy: Math.round(run.player.energy),
      coins: run.coins,
      kills: run.kills,
      keys: run.keys && run.keys.bronze != null ? { bronze: run.keys.bronze, silver: run.keys.silver, gold: run.keys.gold, mythic: run.keys.mythic } : run.keys || 0,
      weapon: { id: w.baseId || w.id, rarity: w.rarity },
      equip: run.player.equipment
    };
    writeSave();
  }

  function hasRunSave() {
    return !!(save.runSave && typeof save.runSave.floor === 'number');
  }

  function resumeRun() {
    var s = save.runSave;
    if (!s) return;
    startRun(s.hero, s.diff, chapterIndex(s.floor));
    run.floor = s.floor;
    buildFloor(s.floor);
    run.coins = s.coins || 0;
    run.kills = s.kills || 0;
    run.keys = s.keys || 0;
    run.player.equipment = (s.equip || []).slice();
    recalcStats(run.player);
    run.player.hp = clamp(s.hp, 1, run.player.maxHp);
    run.player.energy = clamp(s.energy, 0, run.player.maxEnergy);
    if (s.weapon && WEAPONS[s.weapon.id]) run.player.weapon = rollWeapon(s.weapon.id, s.weapon.rarity || 0);
    refreshWeaponCard();
    refreshEquipStrip();
    save.runSave = null;
    writeSave();
    banner('繼續冒險', '第 ' + (s.floor + 1) + ' 層');
  }

  /* ---------------- 開場動畫 ---------------- */
  var cineT = 0;
  var CINE_LEN = 4.8;

  function startCine() {
    if (/[?&]nocine/.test(location.search)) return false;
    mode = 'cine';
    cineT = 0;
    showScreen('none');
    return true;
  }

  function endCine() {
    if (mode !== 'cine') return;
    mode = 'title';
    showScreen('screen-title');
    refreshTitle();
  }

  function drawCine(t) {
    var W = VW, H = VH;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#04030a';
    ctx.fillRect(0, 0, W, H);

    /* 1) 光核爆閃 */
    if (t < 1.2) {
      var p = t / 1.2;
      Art.glow(ctx, W / 2, H / 2, 20 + p * 190, 'rgba(255,255,255,' + (0.9 - p * 0.5) + ')', 1);
      ctx.fillStyle = 'rgba(255,255,255,' + (p > 0.75 ? (1 - p) * 0.85 : 0) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    /* 2) 速度線 + 角色衝過 */
    if (t >= 0.8 && t < 2.6) {
      var q = (t - 0.8) / 1.8;
      ctx.save();
      ctx.globalAlpha = 0.5 * (1 - q);
      ctx.strokeStyle = '#b9a8ff';
      for (var i = 0; i < 26; i++) {
        var y = (i * 37 + t * 420) % H;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y - 8);
        ctx.stroke();
      }
      ctx.restore();
      var heroes = ['knight', 'mage', 'ranger', 'samurai', 'assassin'];
      for (var h = 0; h < heroes.length; h++) {
        var hx = -80 + ((t - 0.8 - h * 0.12) * 520);
        if (hx < -60 || hx > W + 60) continue;
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.translate(hx, H * 0.62 + (h % 2) * 26);
        ctx.scale(2.2, 2.2);
        Art.drawHero(ctx, HEROES[heroes[h]].kind, 0, 0, t * 3, 1, 1, {}, HEROES[heroes[h]].palette);
        ctx.restore();
      }
    }

    /* 3) 標題砸落 */
    if (t >= 2.2) {
      var k = Math.min(1, (t - 2.2) / 0.55);
      var ease = 1 - Math.pow(1 - k, 3);
      var sc = 1.7 - 0.7 * ease;
      ctx.save();
      ctx.translate(W / 2, H * 0.42);
      ctx.scale(sc, sc);
      ctx.globalAlpha = ease;
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#f3c250';
      ctx.shadowColor = 'rgba(243,194,80,.9)';
      ctx.shadowBlur = 22;
      ctx.fillText('深淵迴響', 0, 0);
      ctx.shadowBlur = 0;
      ctx.font = 'bold 12px "Segoe UI", "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(234,226,255,.98)';
      ctx.shadowColor = 'rgba(160,140,240,.75)';
      ctx.shadowBlur = 8;
      ctx.fillText('A B Y S S   ·   E C H O', 0, 19);
      ctx.shadowBlur = 0;
      ctx.restore();

      var ct = document.getElementById('cineTag');
      if (ct) {
        if (t > 0.6) { ct.classList.remove('hidden'); }
        if (t > 4.4) { ct.classList.add('hidden'); }
      }

      if (k >= 1) {
        var ringT = (t - 2.75);
        if (ringT > 0 && ringT < 0.6) {
          ctx.globalAlpha = 1 - ringT / 0.6;
          ctx.strokeStyle = '#ffe6a1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(W / 2, H * 0.42, 20 + ringT * 260, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      /* 4) 副標 */
      if (t > 3.2) {
        ctx.globalAlpha = Math.min(1, (t - 3.2) / 0.6);
        ctx.textAlign = 'center';
        /* 副標改由 DOM 顯示，避免放大模糊 */

        ctx.globalAlpha = 1;
      }
    }

    /* 跳過提示 */
    if (t > 0.6) {
      ctx.textAlign = 'right';
      ctx.font = '8px "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(160,150,190,.7)';
      ctx.fillText('點擊或按任意鍵跳過', W - 12, H - 12);
      ctx.textAlign = 'left';
    }
  }
  var shopBuying = 0;
  var shopPending = null;

  function isMetaEquipped(uid) {
    return (save.metaEquipped || []).indexOf(uid) >= 0;
  }

  function metaFind(uid) {
    var inv = save.metaItems || [];
    for (var i = 0; i < inv.length; i++) if (inv[i].uid === uid) return inv[i];
    return null;
  }

  var vaultTab = 'equip';
  function switchVaultTab(which) {
    vaultTab = which;
    var eq = $('vaultPaneEquip'), ch = $('vaultPaneChest');
    var be = $('vaultTabEquip'), bc = $('vaultTabChest');
    if (eq) eq.classList.toggle('hidden', which !== 'equip');
    if (ch) ch.classList.toggle('hidden', which !== 'chest');
    if (be) be.classList.toggle('on', which === 'equip');
    if (bc) bc.classList.toggle('on', which === 'chest');
  }

  function renderRecycle() {
    var box = document.getElementById('vaultRecycle');
    if (!box) return;
    box.innerHTML = '';
    var items = save.metaItems || [];
    if (!items.length) {
      box.innerHTML = '<span class="rc-empty">沒有可回收的裝備</span>';
      return;
    }
    items.slice().forEach(function (it) {
      var rar = RARITY[it.rarity] || RARITY[0];
      var gain = 12 + it.rarity * 26;
      var el = document.createElement('span');
      el.className = 'rc-item';
      el.innerHTML = '<i style="color:' + rar.color + ';font-style:normal">' + rar.name + '</i> ' + it.name +
        ' <button>回收 +' + gain + '</button>';
      el.querySelector('button').addEventListener('click', function () {
        var idx = save.metaItems.indexOf(it);
        if (idx < 0) return;
        save.metaItems.splice(idx, 1);
        save.metaEquipped = (save.metaEquipped || []).filter(function (u) { return u !== it.uid; });
        save.gems += gain;
        writeSave();
        refreshVault();
        SFX.buy();
        toast('回收 ' + it.name + ' · +' + gain + ' 魔晶');
      });
      box.appendChild(el);
    });
  }

  function refreshVault() {
    var kEl = $('vaultKeys');
    if (kEl) {
      if (!save.keyTypes) save.keyTypes = { bronze: 0, silver: 0, gold: 0, mythic: 0, pink: 0 };
      kEl.innerHTML =
        '<i style="color:#c8a06a;font-style:normal">' + (save.keyTypes.bronze || 0) + '</i>' +
        '<i style="color:#cfd8ec;font-style:normal">' + (save.keyTypes.silver || 0) + '</i>' +
        '<i style="color:#f3c250;font-style:normal">' + (save.keyTypes.gold || 0) + '</i>' +
        '<i style="color:#ff3bd4;font-style:normal">' + (save.keyTypes.pink || 0) + '</i>';
    }
    var pkText = $('pinkKeyText');
    if (pkText) pkText.textContent = '粉紅鎖匙 ' + ((save.keyTypes && save.keyTypes.pink) || 0) + ' 把';
    var pkBtn = $('btnPinkChest');
    if (pkBtn) pkBtn.disabled = !(save.keyTypes && save.keyTypes.pink > 0);
    renderRecycle();
    var inv = $('vaultInv');
    if (inv) {
      inv.innerHTML = '';
      if (!save.metaItems.length) {
        inv.innerHTML = '<div class="vault-empty">還沒有裝備。<br>打倒頭目可獲得鑰匙，用鑰匙開寶箱。</div>';
      }
      save.metaItems.forEach(function (it) {
        var rar = RARITY[it.rarity];
        var on = isMetaEquipped(it.uid);
        var card = document.createElement('div');
        card.className = 'meta-item' + (on ? ' on' : '') +
          (it.rarity >= 4 ? (it.rarity >= 5 ? ' mythic' : ' legend') : '');
        card.style.setProperty('--rc', rar.color);
        card.innerHTML =
          '<canvas width="34" height="34"></canvas>' +
          '<div class="mi-name">' + it.name + '</div>' +
          '<div class="mi-stat">' + it.stats.map(function (s) { return STATS[s.key].fmt(s.value); }).join(' · ') + '</div>' +
          (on ? '<b class="mi-on">已裝備</b>' : '') +
          '<button class="info-btn tiny" title="詳細資訊">i</button>';
        var cvs = card.querySelector('canvas');
        if (cvs) Art.drawEquipIcon(cvs.getContext('2d'), it.icon, 17, 17, 1.3, rar.color, it.rarity);
        card.addEventListener('click', function () { toggleMeta(it.uid); });
        var ib2 = card.querySelector('.info-btn');
        if (ib2) ib2.addEventListener('click', function (ev) { ev.stopPropagation(); infoEquip(it); });
        inv.appendChild(card);
      });
    }
    var slotWrap = $('vaultSlots');
    if (slotWrap) {
      slotWrap.innerHTML = '';
      for (var i = 0; i < D.META_SLOTS + (save.extraSlots || 0); i++) {
        var stype = EQUIP_SLOTS[i % EQUIP_SLOTS.length];
        var uid = (save.metaEquipped || [])[i];
        var it = uid ? metaFind(uid) : null;
        var slot = document.createElement('div');
        slot.className = 'vault-slot' + (it ? ' filled' : '');
        slot.title = stype.name;
        if (it) slot.style.setProperty('--rc', RARITY[it.rarity].color);
        slot.innerHTML = it
          ? '<canvas width="28" height="28"></canvas>'
          : '<span>' + stype.name + '</span>';
        if (it) Art.drawEquipIcon(slot.querySelector('canvas').getContext('2d'), it.icon, 14, 14, 1.1, RARITY[it.rarity].color, it.rarity);
        slotWrap.appendChild(slot);
      }
    }
  }

  function toggleMeta(uid) {
    if (!save.metaEquipped) save.metaEquipped = [];
    var idx = save.metaEquipped.indexOf(uid);
    if (idx >= 0) { save.metaEquipped[idx] = null; SFX.buy(); }
    else {
      var it = metaFind(uid);
      if (!it) return;
      var total = D.META_SLOTS + (save.extraSlots || 0);
      /* 1) 同部位已佔 → 取代 */
      for (var si = 0; si < total; si++) {
        var cur = save.metaEquipped[si];
        var cm = cur ? metaFind(cur) : null;
        if (cm && cm.slot === it.slot) {
          save.metaEquipped[si] = uid; SFX.level(); writeSave(); refreshVault(); return;
        }
      }
      /* 2) 對應類型的空位 */
      for (var si2 = 0; si2 < total; si2++) {
        if (EQUIP_SLOTS[si2 % EQUIP_SLOTS.length].key === it.slot && !save.metaEquipped[si2]) {
          save.metaEquipped[si2] = uid; SFX.level(); writeSave(); refreshVault(); return;
        }
      }
      /* 3) 塞進同類型欄位 */
      for (var si3 = 0; si3 < total; si3++) {
        if (EQUIP_SLOTS[si3 % EQUIP_SLOTS.length].key === it.slot) {
          save.metaEquipped[si3] = uid; SFX.level(); writeSave(); refreshVault(); return;
        }
      }
      toast('沒有可用的 ' + it.slotName + ' 欄位'); SFX.dry();
      return;
    }
    writeSave();
    refreshVault();
  }

  /* 合成：同部位、同等級兩件 → 升一級（最高神話） */
  /* 合成成本：需要 3 件同部位同等級 + 魔晶，等級越高越貴 */
  function fuseCost(rarity) {
    return 60 + rarity * 90;
  }

  function fuseEquip() {
    var items = save.metaItems || [];
    for (var r = 0; r < 5; r++) {
      for (var si = 0; si < EQUIP_SLOTS.length; si++) {
        var key = EQUIP_SLOTS[si].key;
        var pair = items.filter(function (it) { return it.rarity === r && it.slot === key; });
        if (pair.length >= 3) {
          var cost = fuseCost(r);
          if ((save.gems || 0) < cost) {
            toast('魔晶不足，合成需要 ' + cost);
            SFX.dry();
            return;
          }
          var a = pair[0], b = pair[1], c = pair[2];
          var fresh = rollEquipSlot(a.slot, r + 1);
          fresh.uid = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 9999);
          save.gems -= cost;
          save.metaItems = items.filter(function (x) { return x !== a && x !== b && x !== c; });
          save.metaItems.push(fresh);
          save.metaEquipped = (save.metaEquipped || []).filter(function (u) {
            return u !== a.uid && u !== b.uid && u !== c.uid;
          });
          writeSave();
          refreshVault();
          SFX.level();
          toast('合成成功：' + fresh.name + '（' + RARITY[r + 1].name + '，- ' + cost + ' 魔晶）');
          return;
        }
      }
    }
    toast('沒有可合成的裝備（需要同部位同等級 3 件）');
    SFX.dry();
  }

  /* 局外粉紅寶箱：用粉紅鎖匙開啟，必出傳說／神話裝備 */
  function openPinkChest() {
    if (!save.keyTypes) save.keyTypes = { bronze: 0, silver: 0, gold: 0, mythic: 0, pink: 0 };
    if ((save.keyTypes.pink || 0) < 1) { toast('需要粉紅鎖匙（首領極低機率掉落）'); SFX.dry(); return; }
    if ((save.metaItems || []).length >= 24) { toast('寶庫已滿（24）'); return; }
    save.keyTypes.pink--;
    var rar = Math.random() < 0.25 ? 5 : 4;
    var it = rollEquip(rar);
    it.uid = 'pk' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 9999);
    save.metaItems.push(it);
    writeSave();
    refreshVault();
    SFX.win();
    banner('粉紅寶箱', (RARITY[rar].name) + '級 · ' + it.name);
    toast('開出：' + it.name);
  }

  function openKeyChest(tier) {
    tier = tier | 0;
    var type = ['bronze', 'silver', 'gold'][tier] || 'bronze';
    var label = keyLabel(type);
    if (!save.keyTypes) save.keyTypes = { bronze: 0, silver: 0, gold: 0, mythic: 0 };
    if ((save.keyTypes[type] || 0) < 1) { toast('需要 ' + label + ' 才能開啟'); SFX.dry(); return; }
    if ((save.metaItems || []).length >= 24) { toast('寶庫已滿（24）'); return; }
    save.keyTypes[type]--;
    var rar = rarityRoll(0.2 + tier * 0.3, 0.12);
    var it = rollEquip(rar);
    it.uid = 'm' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 9999);
    save.metaItems.push(it);
    writeSave();
    refreshVault();
    SFX.level();
    toast('開出：' + it.name);
  }

  /* =====================================================================
     背包：存入 / 合成
     ===================================================================== */
  var BAG_CAP = 6;

  function equipFromBag(idx) {
    if (!run) return;
    var it = (run.bag || [])[idx];
    if (!it) return;
    var old = run.player.weapon;
    run.player.weapon = rollWeapon(it.id, it.rarity || 2);
    run.bag.splice(idx, 1);
    if (old) run.bag.push({ id: old.id, rarity: old.rarity || 2, uid: 's' + Date.now().toString(36) });
    refreshWeaponCard();
    refreshBag();
    SFX.buy();
    toast('已裝備 ' + (WEAPONS[it.id] ? WEAPONS[it.id].name : '武器'));
  }

  /* 賣出背包武器（寶箱欄位已滿時可自己挑一件低階的賣掉） */
  function sellFromBag(idx) {
    if (!run) return;
    var it = (run.bag || [])[idx];
    if (!it) return;
    var price = [8, 18, 34, 70, 140, 280][it.rarity] || 10;
    var nm = (WEAPONS[it.id] || {}).name || '武器';
    run.bag.splice(idx, 1);
    run.coins += price;
    SFX.buy();
    toast('賣出 ' + nm + ' · +' + price + ' 金幣');
    /* 寶箱裡面還有待放入的武器的話，賣完就自動收下 */
    if (run.pendingBagWeapon) {
      var pw = run.pendingBagWeapon;
      run.pendingBagWeapon = null;
      if (run.bag.length < BAG_CAP) run.bag.push(pw);
      refreshBag();
      return;
    }
    refreshBag();
  }

  function dropFromBag(idx) {
    if (!run) return;
    var it = (run.bag || [])[idx];
    if (!it) return;
    var nm = (WEAPONS[it.id] || {}).name || '武器';
    run.bag.splice(idx, 1);
    refreshBag();
    SFX.dry();
    toast('已丟棄 ' + nm);
  }

  function refreshBag() {
    var list = $('bagList');
    if (!list) return;
    list.innerHTML = '';
    var bag = (run && run.bag) || [];
    if (!run) {
      list.innerHTML = '<p class="bag-empty">背包只存在於地牢之內。<br>進入地牢後，戰鬥中得到的武器會放進這裡，<strong>不能帶出地牢</strong>。</p>';
      return;
    }
    var head = document.createElement('div');
    head.className = 'bag-head';
    head.innerHTML = '<b>背包 ' + bag.length + ' / ' + BAG_CAP + '</b>' +
      '<span>點「裝備」立刻換上，換下的武器會留在背包（上限 ' + BAG_CAP + ' 把）</span>';
    list.appendChild(head);
    if (!bag.length) {
      var em = document.createElement('p');
      em.className = 'bag-empty';
      em.innerHTML = '背包是空的。<br>擊敗敵人或打倒首領有機率掉落武器。';
      list.appendChild(em);
      return;
    }
    bag.forEach(function (it, idx) {
      var w = WEAPONS[it.id] || {};
      var rar = RARITY[it.rarity] || RARITY[0];
      var equipped = run.player.weapon && run.player.weapon.id === it.id;
      var card = document.createElement('div');
      card.className = 'bag-group' + (equipped ? ' on' : '');
      card.style.setProperty('--rc', rar.color);
      var cvs = document.createElement('canvas');
      cvs.width = 46; cvs.height = 36;
      var meta = document.createElement('div');
      meta.className = 'bag-meta';
      meta.innerHTML = '<b>' + (w.name || it.id) + '</b>' +
        '<span>' + rar.name + ' · 傷害 ' + Math.round((w.dmg || 10) * rar.mult) + (equipped ? ' · 使用中' : '') + '</span>';
      var btn = document.createElement('button');
      btn.textContent = equipped ? '使用中' : '裝備';
      btn.disabled = !!equipped;
      btn.addEventListener('click', function () { equipFromBag(idx); });
      var drop = document.createElement('button');
      drop.className = 'ghost bag-drop';
      drop.textContent = '丟棄';
      drop.addEventListener('click', function () { dropFromBag(idx); });
      var sell = document.createElement('button');
      sell.className = 'ghost bag-sell';
      sell.textContent = '賣出';
      sell.addEventListener('click', function () { sellFromBag(idx); });
      card.appendChild(cvs);
      card.appendChild(meta);
      card.appendChild(btn);
      card.appendChild(sell);
      card.appendChild(drop);
      if (it.rarity >= 4) card.classList.add('shiny');
      list.appendChild(card);
      var g2 = cvs.getContext('2d');
      if (g2) {
        g2.imageSmoothingEnabled = false;
        Art.glow(g2, 23, 18, 18, rar.glow, 0.6);
        Art.drawWeaponIcon(g2, w.shape || 'gun', 23, 18, 1.6, rar.color, it.rarity, it.id);
      }
    });
    /* 同型 3 把可合成 */
    var groups = {};
    bag.forEach(function (it) {
      var w = WEAPONS[it.id] || {};
      var key = (w.shape || 'gun') + '|' + it.rarity;
      if (!groups[key]) groups[key] = { shape: w.shape || 'gun', rarity: it.rarity, n: 0 };
      groups[key].n++;
    });
    Object.keys(groups).forEach(function (key) {
      var g = groups[key];
      if (g.n < 3 || g.rarity >= 5) return;
      var rar2 = RARITY[g.rarity] || RARITY[0];
      var fuseBtn = document.createElement('button');
      fuseBtn.className = 'bag-fuse';
      fuseBtn.textContent = '合成 3 把 ' + rar2.name + ' → ' + (RARITY[g.rarity + 1] || rar2).name;
      fuseBtn.addEventListener('click', function () { fuseBag(g.shape, g.rarity); });
      list.appendChild(fuseBtn);
    });
  }

  /* 同型 3 把 → 高一階 1 把（只在局內，背包不帶出地牢） */
  function fuseBag(shape, rarity) {
    if (!run) { toast('背包只在地牢內使用'); return; }
    var bag = run.bag || (run.bag = []);
    var picked = [];
    for (var i = bag.length - 1; i >= 0 && picked.length < 3; i--) {
      var w = WEAPONS[bag[i].id] || {};
      if ((w.shape || 'gun') === shape && bag[i].rarity === rarity) picked.push(i);
    }
    if (picked.length < 3) { toast('材料不足（需要 3 把同型同階）'); SFX.dry(); return; }
    picked.forEach(function (idx) { bag.splice(idx, 1); });
    var nextRar = Math.min(5, rarity + 1);
    var pool = D.weaponsOfTier(nextRar);
    var nid = pool.length ? pick(pool) : 'pistol';
    bag.push({ id: nid, rarity: nextRar, uid: 'f' + Date.now().toString(36) });
    SFX.win();
    var rar = RARITY[nextRar];
    banner('合成成功', rar.name + '級 · ' + (WEAPONS[nid] ? WEAPONS[nid].name : ''));
    refreshBag();
  }

  /* =====================================================================
     傳說 / 神話武器特殊效果（依武器類型對應，只有稀有度 4 以上生效）
     ===================================================================== */
  var WEAPON_SPECIAL_BY_SHAPE = {    staff:     { kind: 'chain',  name: '連鎖', desc: '命中後連鎖 1 個鄰近敵人' },
    scepter:   { kind: 'chain',  name: '雷鏈', desc: '命中後連鎖 2 個鄰近敵人' },
    blade:     { kind: 'frost',  name: '霜噬', desc: '命中減速 2 秒' },
    knife:     { kind: 'frost',  name: '寒刃', desc: '命中減速 1.5 秒' },
    hammer:    { kind: 'quake',  name: '震地', desc: '命中濺射周圍小範圍' },
    orb:       { kind: 'void',   name: '虛空', desc: '命中吸取 4% 生命' },
    crossbow:  { kind: 'pierce', name: '貫穿', desc: '額外貫穿 +1' },
    launcher:  { kind: 'blast',  name: '爆裂', desc: '命中引發小爆炸' },
    chaos:     { kind: 'blast',  name: '混沌', desc: '命中引發大爆炸' },
    sword:     { kind: 'quake',  name: '斷空', desc: '揮擊濺射周圍' },
    bow:       { kind: 'pierce', name: '穿雲', desc: '額外貫穿 +1' },
    rifle:     { kind: 'pierce', name: '穿甲', desc: '額外貫穿 +1' },
    shotgun:   { kind: 'blast',  name: '霰爆', desc: '命中引發小爆炸' },
    wand:      { kind: 'frost',  name: '冰語', desc: '命中減速 1.5 秒' },
    pistol:    { kind: 'chain',  name: '連彈', desc: '命中後連鎖 1 個目標' }
  };

  /* =====================================================================
     戰場廢墟（焦土）：爆炸與擊殺會在現場留下永久焦痕
     ===================================================================== */
  function addRuin(x, y, r) {
    if (!run) return;
    if (!run.ruins) run.ruins = [];
    if (run.ruins.length > 90) run.ruins.shift();
    run.ruins.push({ x: x, y: y, r: r || 26, t: 0, seed: Math.random() * 10 });
  }

  function ruinBonusAt(x, y) {
    if (!run || !run.ruins) return 1;
    for (var i = 0; i < run.ruins.length; i++) {
      var ru = run.ruins[i];
      if (Math.hypot(ru.x - x, ru.y - y) < ru.r) return 1.25;
    }
    return 1;
  }

  function drawRuins() {
    if (!run.ruins || !run.ruins.length) return;
    for (var i = 0; i < run.ruins.length; i++) {
      var ru = run.ruins[i];
      ctx.save();
      ctx.translate(ru.x, ru.y);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#241a14';
      ctx.beginPath();
      ctx.ellipse(0, 0, ru.r, ru.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#3a2418';
      ctx.beginPath();
      ctx.ellipse(ru.seed * 2, 2, ru.r * 0.62, ru.r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#0e0a08';
      ctx.lineWidth = 1;
      for (var c = 0; c < 3; c++) {
        var a = ru.seed + c * 2.1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * ru.r * 0.9, Math.sin(a) * ru.r * 0.45);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5 + Math.sin(time * 3 + ru.seed) * 0.3;
      ctx.fillStyle = '#ff7a3c';
      ctx.fillRect(Math.cos(ru.seed) * ru.r * 0.4 - 1, Math.sin(ru.seed) * ru.r * 0.2 - 1, 2, 2);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  /* 特殊效果遞迴保護（濺射傷害會再次進入 damageEnemy） */
  var specialDepth = 0;

  function weaponSpecial(w) {    if (!w || (w.rarity || 0) < 4) return null;
    return WEAPON_SPECIAL_BY_SHAPE[w.shape] || { kind: 'blast', name: '秘能', desc: '命中引發小爆炸' };
  }

  function applyWeaponSpecial(en, w, dmg) {
    var sp = weaponSpecial(w);
    if (!sp) return;
    var p = run.player;
    /* 稀有度越高，特殊效果越強（神話額外強化） */
    var rm = (w.rarity || 4) >= 5 ? 1.75 : 1.0;
    if (sp.kind === 'chain') {
      var maxChain = (sp.name === '雷鏈' ? 2 : 1) + ((w.rarity || 0) >= 5 ? 1 : 0);
      var hitCount = 0;
      for (var i = 0; i < run.enemies.length && hitCount < maxChain; i++) {
        var o = run.enemies[i];
        if (o === en || o.dead) continue;
        if (Math.hypot(o.x - en.x, o.y - en.y) < 80 * rm) {
          damageEnemy(o, dmg * 0.45 * rm, Math.atan2(o.y - en.y, o.x - en.x), 20);
          run.beams.push({ x1: en.x, y1: en.y, x2: o.x, y2: o.y, t: 0, max: 0.16, color: '#8cf0ff' });
          hitCount++;
        }
      }
    } else if (sp.kind === 'frost') {
      en.slowT = Math.max(en.slowT || 0, 2 * rm);
    } else if (sp.kind === 'quake') {
      areaDamage(en.x, en.y, 46 * rm, dmg * 0.35 * rm, 60, '#c8a06a');
    } else if (sp.kind === 'blast') {
      areaDamage(en.x, en.y, 54 * rm, dmg * 0.45 * rm, 80, '#ffb347');
    } else if (sp.kind === 'void') {
      p.hp = Math.min(p.maxHp, p.hp + Math.max(1, dmg * 0.04 * rm));
    }
    /* 神話武器：命中時額外打出一次閃光爆炸 */
    if ((w.rarity || 0) >= 5) {
      run.impacts.push({ x: en.x, y: en.y, t: 0.25, max: 0.25, r: 46, color: '#ff3bd4' });
      addParticles(en.x, en.y, 8, '#ff9cf0', { speed: 180 });
    }
  }

  /* 真正解鎖付費武器 */
  function unlockPremiumWeapon(id) {
    if (!id || !WEAPONS[id]) return false;
    if (!save.premiumWeapons) save.premiumWeapons = {};
    save.premiumWeapons[id] = true;
    if (id === 'chaos') save.premium = true;
    writeSave();
    try { refreshShop(); } catch (e1) {}
    try { refreshTitle(); } catch (e2) {}
    return true;
  }

  /* 30 秒免費解鎖（取代原本的付費禮包） */
  function timedUnlock(title, cb) {
    var left = 30;
    var el = document.createElement('div');
    el.className = 'timed-unlock';
    el.innerHTML = '<div class="tu-box"><b>' + title + '</b>' +
      '<p>Unlocking in <span class="tu-num">30</span>s</p>' +
      '<div class="tu-bar"><i></i></div>' +
      '<p class="tu-note">Free — just wait. Close anytime to cancel.</p>' +
      '<button class="tu-close">Close</button></div>';
    document.body.appendChild(el);
    var num = el.querySelector('.tu-num');
    var bar = el.querySelector('.tu-bar i');
    var closed = false;
    var timer = setInterval(function () {
      if (closed) return;
      left--;
      if (num) num.textContent = Math.max(0, left);
      if (bar) bar.style.width = ((30 - left) / 30 * 100) + '%';
      if (left <= 0) {
        clearInterval(timer);
        try { el.remove(); } catch (e) {}
        try { cb(); } catch (e) {}
      }
    }, 1000);
    var closeBtn = el.querySelector('.tu-close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      closed = true;
      clearInterval(timer);
      try { el.remove(); } catch (e) {}
      toast('Cancelled');
    });
  }
  window.__timedUnlock = timedUnlock;
  /* 禮包（原 HK$1 / HK$8）改為 30 秒免費解鎖全部內容 */
  window.__packUnlock = function (label) {
    timedUnlock(label + ' — free unlock', function () {
      try {
        if (!save.premiumWeapons) save.premiumWeapons = {};
        PREMIUM_WEAPONS.forEach(function (pw) { save.premiumWeapons[pw.id] = true; });
        save.ultimate = true;
        save.paidUnlock = true;
        writeSave();
        toast('All premium content unlocked');
        try { SFX.win(); } catch (e) {}
        refreshShop();
      } catch (e) {}
    });
  };

  function refreshShop() {
    var list = $('shopList');
    if (list) {
      list.innerHTML = '';
      PREMIUM_WEAPONS.forEach(function (pw) {
        var w = WEAPONS[pw.id];
        var owned = !!(save.premiumWeapons && save.premiumWeapons[pw.id]);
        var buying = shopBuying > 0 && shopPending === pw.id;
        var card = document.createElement('div');
        card.className = 'shop-item' + (owned ? ' owned' : '');
        card.innerHTML =
          '<canvas width="52" height="40"></canvas>' +
          '<div class="si-body"><div class="si-name">' + (w ? w.name : pw.id) +
          '<span class="si-tag">' + pw.tag + '</span></div>' +
          '<div class="si-desc">' + pw.desc + '</div></div>' +
          '<div class="si-act">' +
          (owned
            ? '<button class="si-load' + (save.loadout === pw.id ? ' on' : '') + '">' + (save.loadout === pw.id ? '出戰中' : '帶入遊戲') + '</button>'
            : '<button class="si-buy" data-id="' + pw.id + '">' + (buying ? 'Confirming…' : 'Unlock (30s)') + '</button>') +
          '</div>';
        var cvs = card.querySelector('canvas');
        if (cvs && w) {
          var g = cvs.getContext('2d');
          g.imageSmoothingEnabled = false;
          Art.glow(g, 26, 22, 24, 'rgba(255,93,168,.45)', 0.7);
          Art.drawWeaponIcon(g, w.shape, 26, 24, 1.9, '#ff8ac8', 4, pw.id);
        }
        var buy = card.querySelector('.si-buy');
        /* 付費武器唯一取得方式：輸入解鎖碼 */
        if (buy) buy.addEventListener('click', function () {
          timedUnlock((w ? w.name : pw.id) + ' — free unlock', function () {
            var ok = false;
            try { ok = unlockPremiumWeapon(pw.id); } catch (e) { ok = false; }
            toast(ok ? 'Unlocked ' + (w ? w.name : pw.id) : 'Unlock failed');
            if (ok) { try { SFX.win(); } catch (e) {} refreshShop(); }
          });
        });
        var load = card.querySelector('.si-load');
        if (load) load.addEventListener('click', function () { setLoadout(pw.id); });
        list.appendChild(card);
      });
    }

    var myth = $('mythicBox');
    if (myth) {
      myth.innerHTML = '';
      renderForge(myth, 4, LEGEND_PRICE, '傳說兵器');
      renderForge(myth, 5, MYTHIC_PRICE, '神話兵器');
    }

    var slotBox = $('slotBox');
    if (slotBox) {
      slotBox.innerHTML = '';
      var total = D.META_SLOTS + (save.extraSlots || 0);
      var sh = document.createElement('div');
      sh.className = 'forge-head';
      sh.innerHTML = '<span>裝備欄上限</span><b>' + total + ' / 8</b>';
      slotBox.appendChild(sh);
      var sb = document.createElement('button');
      sb.className = 'mythic-buy';
      sb.textContent = total >= 8 ? '已達上限' : '擴充 +1（$4）';
      sb.disabled = total >= 8;
      sb.addEventListener('click', function () { buySlot(); });
      slotBox.appendChild(sb);
    }

    var ultBox = $('ultBox');
    if (ultBox) {
      ultBox.innerHTML = '';
      /* 隱藏武器：解鎖全部付費武器後才顯示（未解鎖時整塊隱藏） */
      ultBox.style.display = save.ultimate ? '' : 'none';
      if (save.ultimate) {
        var uh = document.createElement('div');
        uh.className = 'forge-head';
        uh.innerHTML = '<span>究極兵器</span><b>已解鎖</b>';
        ultBox.appendChild(uh);
        var ub = document.createElement('button');
        ub.className = 'mythic-buy';
        ub.textContent = '究極·核彈（設為出戰）';
        ub.addEventListener('click', function () { setLoadout(D.ULTIMATE_WEAPON); });
        ultBox.appendChild(ub);
      }
    }

    var unbox = $('equipUnlockBox');
    if (unbox) {
      /* 商店層寶箱：讓玩家直接用鑰匙選購／開啟 */
      var chestWrap = document.getElementById('shopChestBox');
      if (!chestWrap) {
        chestWrap = document.createElement('div');
        chestWrap.id = 'shopChestBox';
        chestWrap.className = 'shop-chest-box';
        unbox.parentNode.insertBefore(chestWrap, unbox);
      }
      chestWrap.innerHTML = '<div class="forge-head"><span>寶箱（用鑰匙開啟）</span><b>' +
        ((save.keyTypes && save.keyTypes.bronze) || 0) + ' 銅 / ' +
        ((save.keyTypes && save.keyTypes.silver) || 0) + ' 銀 / ' +
        ((save.keyTypes && save.keyTypes.gold) || 0) + ' 金 / ' +
        ((save.keyTypes && save.keyTypes.pink) || 0) + ' 粉紅</b></div>';
      var chestRow = document.createElement('div');
      chestRow.className = 'shop-chest-row';
      [[0, '木箱 · 銅鑰匙'], [1, '鐵箱 · 銀鑰匙'], [2, '金箱 · 金鑰匙']].forEach(function (pair) {
        var b = document.createElement('button');
        b.textContent = pair[1];
        b.addEventListener('click', function () { openKeyChest(pair[0]); });
        chestRow.appendChild(b);
      });
      var pb = document.createElement('button');
      pb.className = 'pink';
      pb.textContent = '粉紅寶箱 · 粉紅鎖匙';
      pb.addEventListener('click', function () { openPinkChest(); });
      chestRow.appendChild(pb);
      chestWrap.appendChild(chestRow);
      unbox.innerHTML = '';
      renderEquipForge(unbox, D.LEGEND_EQUIP, '傳說裝備');
      renderEquipForge(unbox, D.MYTHIC_EQUIP, '神話裝備');
    }

    var st = $('shopStatus');
    if (st) st.textContent = '解鎖的裝備會放入寶庫、也會出現在寶箱裡，可以穿戴在對應部位。';
  }

  /* 裝備商店：列出 5 件傳說 + 5 件神話供解鎖 */
  function renderEquipForge(container, list, title) {
    if (!list || !list.length) return;
    var rar = RARITY[list[0].rarity];
    var box = document.createElement('div');
    box.className = 'forge-box';
    box.style.setProperty('--rc', rar.color);
    var head = document.createElement('div');
    head.className = 'forge-head';
    head.innerHTML = '<span>' + title + '</span><b>' + list.length + ' 件</b>';
    box.appendChild(head);
    var row = document.createElement('div');
    row.className = 'forge-list';
    list.forEach(function (e) {
      var owned = !!(save.forgedEquip && save.forgedEquip[e.id]);
      var item = document.createElement('div');
      item.className = 'forge-item' + (owned ? ' on' : '');
      var cvs = document.createElement('canvas');
      cvs.width = 44; cvs.height = 34;
      var meta = document.createElement('div');
      meta.className = 'fi-meta';
      meta.innerHTML = '<b>' + e.name + '</b><span>' + (e.stats[0] ? STATS[e.stats[0].key].fmt(e.stats[0].value) : '') + '</span>';
      var btn = document.createElement('button');
      btn.textContent = owned ? 'Unlocked' : 'Unlock (30s)';
      btn.disabled = owned;
      btn.addEventListener('click', function () {
        /* 真實付款：用裝備碼解鎖，不再模擬購買 */
        if (window.Unlock && Unlock.openEquip) Unlock.openEquip(e.id, e.rarity);
        else buyEquipUnlock(e.id);
      });
      var info = document.createElement('button');
      info.className = 'info-btn tiny';
      info.textContent = 'i';
      info.addEventListener('click', function (ev) { ev.stopPropagation(); infoEquip(e); });
      item.appendChild(cvs);
      item.appendChild(meta);
      item.appendChild(btn);
      item.appendChild(info);
      row.appendChild(item);
      var g = cvs.getContext('2d');
      g.imageSmoothingEnabled = false;
      Art.glow(g, 22, 17, 20, rar.glow, 0.6);
      Art.drawEquipIcon(g, e.icon, 22, 17, 1.5, rar.color, e.rarity);
    });
    box.appendChild(row);
    container.appendChild(box);
  }

  function buyEquipUnlock(id) {
    if (shopBuying > 0) return;
    if (save.forgedEquip && save.forgedEquip[id]) return;
    shopPending = { kind: 'equipItem', id: id };
    shopBuying = 1.5;
    SFX.buy();
    refreshShop();
  }

  function buyPremium(id) {
    if (shopBuying > 0) return;
    if (!save.premiumWeapons) save.premiumWeapons = {};
    if (save.premiumWeapons[id]) return;
    shopPending = { kind: 'premium', id: id };
    shopBuying = 1.5;
    SFX.buy();
    refreshShop();
  }

  function finishBuy() {
    shopBuying = 0;
    var pend = shopPending;
    shopPending = null;
    if (!pend) { refreshShop(); return; }
    if (pend.kind === 'premium') {
      if (!save.premiumWeapons) save.premiumWeapons = {};
      save.premiumWeapons[pend.id] = true;
      if (pend.id === 'chaos') save.premium = true;
      save.loadout = save.loadout || pend.id;
      toast((WEAPONS[pend.id] ? WEAPONS[pend.id].name : pend.id) + ' 已解鎖！');
    } else if (pend.kind === 'forged') {
      var id = pend.id || pick(D.weaponsOfTier(pend.rarity));
      if (!id) { refreshShop(); return; }
      if (!save.forgedWeapons) save.forgedWeapons = [];
      save.forgedWeapons.push({ id: id, rarity: pend.rarity, uid: 'f' + Date.now().toString(36) });
      save.loadout = id;
      toast((WEAPONS[id] ? WEAPONS[id].name : id) + ' 已解鎖！');
      /* 傳說 + 神話武器全解鎖 → 究極核彈 */
      checkUltimateUnlock();
    } else if (pend.kind === 'slot') {
      save.extraSlots = Math.min(4, (save.extraSlots || 0) + 1);
      toast('裝備欄 +1（目前 ' + (D.META_SLOTS + save.extraSlots) + ' 格）');
    } else if (pend.kind === 'equipItem') {
      var tpl = null;
      D.LEGEND_EQUIP.concat(D.MYTHIC_EQUIP).forEach(function (e) { if (e.id === pend.id) tpl = e; });
      if (tpl) {
        if (!save.forgedEquip) save.forgedEquip = {};
        save.forgedEquip[tpl.id] = true;
        var copy = JSON.parse(JSON.stringify(tpl));
        copy.uid = 'e' + Date.now().toString(36) + Math.floor(Math.random() * 999);
        copy.slotName = (EQUIP_SLOTS.filter(function (s) { return s.key === copy.slot; })[0] || {}).name || '';
        copy.specialName = (D.EQUIP_SPECIALS.filter(function (s) { return s.id === copy.special; })[0] || {}).name || '';
        copy.specialDesc = (D.EQUIP_SPECIALS.filter(function (s) { return s.id === copy.special; })[0] || {}).desc || '';
        copy.score = copy.stats.reduce(function (a, s) { return a + (s.key === 'hp' ? s.value / 20 : s.value); }, 0);
        if (!save.metaItems) save.metaItems = [];
        save.metaItems.push(copy);
        toast(tpl.name + ' 已解鎖並放入寶庫！');
        SFX.win();
      }
    }
    writeSave();
    SFX.win();
    refreshShop();
  }

  function checkUltimateUnlock() {
    if (save.ultimate) return;
    var forgeIds = (save.forgedWeapons || []).map(function (f) { return f.id; });
    var need = D.weaponsOfTier(4).concat(D.weaponsOfTier(5));
    var ok = need.every(function (id) { return forgeIds.indexOf(id) >= 0; });
    if (ok) {
      save.ultimate = true;
      toast('究極·核彈 已解鎖！');
      SFX.win();
    }
  }

  function buySlot() {
    if (shopBuying > 0) return;
    if ((save.extraSlots || 0) >= 4) { toast('已達上限'); return; }
    shopPending = { kind: 'slot' };
    shopBuying = 1.5;
    SFX.buy();
    refreshShop();
  }

  function buyMythic() {
    buyForged(5, null);
  }

  function ownedForged(id) {
    var list = (save.forgedWeapons || []).concat(save.mythicWeapons || []);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return true;
    return false;
  }

  function buyForged(rarity, id) {
    if (shopBuying > 0) return;
    if (id && ownedForged(id)) { setLoadout(id); return; }
    shopPending = { kind: 'forged', rarity: rarity, id: id };
    shopBuying = 1.5;
    SFX.buy();
    refreshShop();
  }

  function renderForge(container, rarity, price, title) {
    if (!container) return;
    var rar = RARITY[rarity];
    var box = document.createElement('div');
    box.className = 'forge-box' + (rarity === 5 ? ' mythic' : '');
    box.style.setProperty('--rc', rar.color);

    var head = document.createElement('div');
    head.className = 'forge-head';
    head.innerHTML = '<span>' + title + '</span><b>Free · 30s unlock</b>';
    box.appendChild(head);

    var list = document.createElement('div');
    list.className = 'forge-list';
    D.weaponsOfTier(rarity).forEach(function (id) {
      var w = WEAPONS[id];
      var own = ownedForged(id);
      var on = save.loadout === id;
      var item = document.createElement('div');
      item.className = 'forge-item' + (on ? ' on' : '');

      var cvs = document.createElement('canvas');
      cvs.width = 44; cvs.height = 34;

      var meta = document.createElement('div');
      meta.className = 'fi-meta';
      meta.innerHTML = '<b>' + w.name + '</b><span>傷害 ' + Math.round(w.dmg * rar.mult) + '</span>';

      var btn = document.createElement('button');
      btn.textContent = own ? (on ? 'Equipped' : 'Equip') : 'Unlock (30s)';
      if (own && on) btn.disabled = true;
      btn.addEventListener('click', function () {
        if (own) setLoadout(id);
        else timedUnlock(w.name + ' — free unlock', function () {
          if (window.Unlock && Unlock.openGift) Unlock.openGift();
          else buyForged(rarity, id);
        });
      });

      var ib3 = document.createElement('button');
      ib3.className = 'info-btn tiny';
      ib3.textContent = 'i';
      ib3.addEventListener('click', function (ev) { ev.stopPropagation(); infoWeapon(id, rarity); });

      item.appendChild(cvs);
      item.appendChild(meta);
      item.appendChild(btn);
      item.appendChild(ib3);
      list.appendChild(item);

      var g = cvs.getContext('2d');
      g.imageSmoothingEnabled = false;
      Art.glow(g, 22, 17, 20, rar.glow, 0.6);
      Art.drawWeaponIcon(g, w.shape, 22, 17, 1.6, rar.color, 4, id);
    });
    box.appendChild(list);
    container.appendChild(box);
  }

  function setLoadout(id) {
    save.loadout = save.loadout === id ? null : id;
    writeSave();
    SFX.level();
    toast(save.loadout ? '出戰武器：' + (WEAPONS[id] ? WEAPONS[id].name : id) : '已取消出戰武器');
    refreshShop();
  }

  function pickWeaponForRarity(r) {
    var pool = weaponPool();
    var exact = pool.filter(function (id) { return (WEAPONS[id].tier || 0) === r; });
    if (exact.length && Math.random() < 0.72) return pick(exact);
    var lower = pool.filter(function (id) { return (WEAPONS[id].tier || 0) <= r; });
    return pick(lower.length ? lower : pool);
  }

  function weaponPool() {
    var pool = D.DROPPABLE.slice();
    for (var id in (save.premiumWeapons || {})) {
      if (save.premiumWeapons[id] && pool.indexOf(id) < 0 && WEAPONS[id]) pool.push(id);
    }
    if (save.ultimate && pool.indexOf(D.ULTIMATE_WEAPON) < 0) pool.push(D.ULTIMATE_WEAPON);
    return pool;
  }

  /* ---------------- 詳細資訊彈窗 ---------------- */
  var infoOpen = false;

  function showInfo(cfg) {
    var panel = $('infoPanel');
    var modal = $('infoModal');
    if (!panel || !modal) return;
    var color = cfg.color || '#a07bff';
    panel.style.setProperty('--ic', color);
    var rows = (cfg.rows || []).map(function (r) {
      return '<div class="info-row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
    }).join('');
    panel.innerHTML =
      '<div class="info-glow"></div>' +
      '<button class="info-close" title="關閉">×</button>' +
      '<div class="info-top">' +
      '<canvas class="info-icon" width="120" height="96"></canvas>' +
      '<div><h3 class="info-title">' + cfg.title + '</h3>' +
      '<p class="info-sub">' + (cfg.subtitle || '') + '</p></div></div>' +
      '<div class="info-rows">' + rows + '</div>' +
      (cfg.desc ? '<p class="info-desc">' + cfg.desc + '</p>' : '') +
      '<div class="info-foot">點擊 × 或背景關閉</div>';
    var cvs = panel.querySelector('.info-icon');
    if (cvs && cfg.draw) {
      var g = cvs.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.save();
      g.translate(60, 56);
      cfg.draw(g);
      g.restore();
    }
    var closeBtn = panel.querySelector('.info-close');
    if (closeBtn) closeBtn.addEventListener('click', hideInfo);
    modal.classList.remove('hidden');
    infoOpen = true;
  }

  function hideInfo() {
    var modal = $('infoModal');
    if (modal) modal.classList.add('hidden');
    infoOpen = false;
  }

  /* 點擊背景關閉資訊彈窗 */
  document.addEventListener('click', function (ev) {
    var modal = $('infoModal');
    if (infoOpen && modal && ev.target === modal) hideInfo();
  });

  function infoHero(id) {
    var h = HEROES[id] || HEROES.knight;
    var u = ULT[id] || {};
    showInfo({
      title: h.name + ' · ' + h.title,
      subtitle: '技能與大招',
      color: h.palette.c,
      rows: [
        ['生命', h.hp], ['移速', h.spd], ['能量', h.en], ['攻擊', '×' + h.atk.toFixed(2)],
        ['技能', h.skill.name + '（CD ' + h.skill.cd + 's）'],
        ['大招', u.name || '—']
      ],
      desc: '<b>技能：</b>' + h.skill.desc + '<br><b>大招：</b>' + (u.desc || ''),
      draw: function (g) { g.scale(2.4, 2.4); Art.drawHero(g, h.kind, 0, 0, 0.7, 1, 0, {}, h.palette); }
    });
  }

  function infoEquip(it) {
    var rar = RARITY[it.rarity];
    showInfo({
      title: it.name,
      subtitle: rar.name + ' · ' + it.slotName,
      color: rar.color,
      rows: it.stats.map(function (s) { return [STATS[s.key].name, STATS[s.key].fmt(s.value)]; })
        .concat(it.special ? [['特殊效果', it.specialName + '：' + it.specialDesc]] : []),
      desc: '合成兩件同部位同等級的裝備，可以升一級（最高神話）。',
      draw: function (g) { g.scale(3.2, 3.2); Art.drawEquipIcon(g, it.icon, 0, 0, 1.0, rar.color, it.rarity); }
    });
  }

  /* 武器背景故事 */
  var WEAPON_LORE = {
    chaos: '從深淵混沌中誕生的禁忌兵器，據說每一發砲彈都禁錮著一個被吞噬的靈魂。',
    frostcannon: '採自永冬極地的寒核鍛造，扣下扳機的瞬間，敵人的血液也跟著結凍。',
    thunder: '以雷神之名鑄成的火器，槍口噴吐的是天罰的閃電，凡人僅能仰望。',
    meteor: '能引導墜落星辰的權杖，每一擊都是從天而降的災厄。',
    genesis: '創世之初的第一道光芒，傳說它曾親手分割了光與暗。',
    apocalypse: '末日預言中現身的終焉之器，其出世之日，三界為之震動。',
    eternalstar: '一顆永恆恆星的碎片，光芒穿越億萬光年而不滅，如今為你所用。',
    abysseye: '深淵之眼凝視眾生，被它盯上的獵物，無論躲到何處都無所遁形。',
    primordial: '太初混沌凝結而成的兵器，時間與空間在它面前都失去了意義。',
    longnight: '永夜君王的佩劍，劍身流淌著吞噬一切光芒的黑暗。',
    reddragon: '以赤龍之心為爐火鍛造的巨炮，每一發都是焚天的龍息。',
    judgment: '天界審判庭的權杖，凡人舉起它，便成了代行神罰的裁決者。',
    voidfang: '虛空深處獠牙化成的法器，無聲無息地獵殺。',
    dawnbreaker: '破曉時分的第一縷晨光凝成之劍，揮動間驅散一切黑暗。'
  };

  function weaponLore(w) {
    if (WEAPON_LORE[w.id]) return WEAPON_LORE[w.id];
    var tier = w.tier;
    if (tier === 0) return '一把樸實無華的武器，是每一位冒險者夢想起航的起點。';
    if (tier === 1) return '經過工匠細心打磨的可靠武器，陪伴旅人走過無數險地。';
    if (tier === 2) return '罕見的利器，劍身隱約透出魔力的微光。';
    if (tier === 3) return '傳說工坊的傑作，據說只有被選中之人才能駕馭。';
    if (tier === 4) return '古代英雄的隨身兵器，歲月沒能磨去它的鋒芒。';
    if (tier === 5) return '從混沌誕生的終極武器，凡人僅窺一眼便會感到顫慄。';
    return '深淵迴響中的一件兵器。';
  }

  function infoWeapon(id, rarity) {
    var w = WEAPONS[id];
    if (!w) return;
    var rar = RARITY[rarity == null ? (w.tier || 0) : rarity];
    var DPS = Math.round(w.dmg * (w.pellets || 1) / Math.max(0.08, w.rate) * rar.mult);
    showInfo({
      title: w.name,
      subtitle: rar.name + (w.tier != null ? ' · T' + w.tier : ''),
      color: rar.color,
      rows: [
        ['單發傷害', Math.round(w.dmg * rar.mult)],
        ['每秒傷害', DPS],
        ['射速', w.rate + 's'],
        ['彈數', w.pellets || 1],
        ['穿透', w.pierce || 0],
        ['爆炸', w.splash ? Math.round(w.splash) : '—'],
        ['特殊', [w.homing ? '追蹤' : '', w.chain ? '連鎖' + w.chain : '', w.burn ? '燃燒' : '', w.poison ? '中毒' : '', w.slow ? '減速' : '', w.boomerang ? '迴旋' : '', w.burst ? '連發' : '', w.melee ? '近戰' : ''].filter(Boolean).join('、') || '—']
      ],
      desc: '<b>背景：</b>' + weaponLore(w) + '<br><b>說明：</b>' + (w.melee ? '近戰武器，靠近敵人揮擊。' : '遠程武器，按住射擊。'),
      draw: function (g) { g.scale(3.0, 3.0); Art.drawWeaponIcon(g, w.shape, 0, 0, 1.0, rar.color, 5, w.id); }
    });
  }

  /* 選角頁：角色動態預覽 + 技能展示 */
  var heroAnimT = 0;
  function animateHeroPreview(dt) {
    return; /* 新版選角頁為靜態立繪 */
    heroAnimT += dt;
    var box = $('heroDetail');
    if (!box) return;
    var cvs = box.querySelector('.hd-por');
    if (!cvs || !cvs.getContext) return;
    var h = HEROES[heroSel] || HEROES.knight;
    var g = cvs.getContext('2d');
    g.clearRect(0, 0, cvs.width, cvs.height);
    g.imageSmoothingEnabled = false;
    /* 地面光環 */
    g.save();
    g.globalAlpha = 0.35;
    g.fillStyle = h.palette.c;
    g.beginPath();
    g.ellipse(60, 65, 20, 4.5, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    /* 角色：上下浮動 + 走路 */
    g.save();
    g.translate(60, 54 + Math.sin(heroAnimT * 3) * 1.6);
    g.scale(2.0, 2.0);
    Art.drawHero(g, h.kind, 0, 0, heroAnimT, 1, Math.sin(heroAnimT * 3) > 0.55 ? 1 : 0, {}, h.palette);
    g.restore();
    /* 技能展示：每 2.6 秒一次技能環 */
    var ph = heroAnimT % 2.6;
    if (ph < 0.85) {
      var k = ph / 0.85;
      g.save();
      g.globalAlpha = Math.max(0, 1 - k);
      g.strokeStyle = h.palette.d;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(60, 48, 12 + k * 28, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
  }

  function heroArt(id) {
    var h = HEROES[id] || {};
    var sid = (h.palette && h.palette.spriteId) || 'hollow';
    return 'assets/heroes/' + sid + '/portrait.png';
  }

  function refreshHeroes() {
    var strip = $('heroGrid');
    if (!strip) return;
    strip.innerHTML = '';
    var ids = D.HERO_IDS;
    ids.forEach(function (id) {
      var h = HEROES[id];
      if (!h) return;
      var locked = !save.unlocked[id];
      var card = document.createElement('button');
      card.className = 'hcell' + (locked ? ' locked' : '') + (heroSel === id ? ' sel' : '');
      card.style.setProperty('--hc', h.palette.c);
      card.innerHTML = '<img src="' + heroArt(id) + '" alt="' + h.name + '" draggable="false">' +
        '<span>' + h.name + '</span>' +
        (locked ? '<i class="hlock">' + h.cost + '</i>' : '');
      card.addEventListener('click', function () { clickHero(id); });
      strip.appendChild(card);
    });
    renderHeroDetail(heroSel);
  }

  /* 角色詳情：技能 + 大招 + 數值 */
  function renderHeroDetail(id) {
    var h = HEROES[id] || HEROES[D.HERO_IDS[0]];
    if (!h) return;
    var big = $('heroBigArt');
    if (big) big.src = heroArt(id);
    var bn = $('heroBigName');
    if (bn) bn.textContent = h.name;
    var br = $('heroBigRole');
    if (br) br.textContent = h.title;
    try {
      var stage = document.querySelector ? document.querySelector('.hero-stage') : null;
      if (stage && stage.style) stage.style.setProperty('--hc', h.palette.c);
    } catch (e) {}

    var u = (window.ULT && ULT[id]) || {};
    var locked = !save.unlocked[id];
    var box = $('heroDetail');
    if (!box) return;
    box.innerHTML =
      '<div class="hi-head"><b>' + h.name + '</b><span>' + h.title + '</span></div>' +
      '<div class="hi-stats">' +
      '<div><i>HP</i><b>' + h.hp + '</b></div>' +
      '<div><i>SPD</i><b>' + h.spd + '</b></div>' +
      '<div><i>EN</i><b>' + h.en + '</b></div>' +
      '<div><i>ATK</i><b>x' + h.atk.toFixed(2) + '</b></div>' +
      '</div>' +
      '<div class="hi-block"><span class="k">SKILL</span><b>' + h.skill.name + '</b>' +
      '<p>' + h.skill.desc + '</p></div>' +
      (u.name ? '<div class="hi-block"><span class="k">ULTIMATE</span><b>' + u.name + '</b><p>' + (u.desc || '') + '</p></div>' : '') +
      (locked ? '<button class="hi-unlock">Unlock - ' + h.cost + ' crystals</button>' : '');
    var ub = box.querySelector('.hi-unlock');
    if (ub) ub.addEventListener('click', function () { tryUnlockHero(id); });
  }

  function clickHero(id) {
    var h = HEROES[id];
    /* 未解鎖也可以預覽（看技能、大招、數值），解鎖用詳情頁的按鈕 */
    if (!save.unlocked[id]) {
      heroSel = id;
      refreshHeroes();
      toast('預覽中：' + h.name + ' 尚未解鎖');
      SFX.dry();
      return;
    }
    heroSel = id;
    save.hero = id;
    writeSave();
    SFX.buy();
    refreshHeroes();
  }

  function tryUnlockHero(id) {
    var h = HEROES[id];
    if (save.unlocked[id]) { clickHero(id); return; }
    if (save.gems < h.cost) {
      toast('魔晶不足，需要 ' + h.cost + '（目前 ' + save.gems + '）');
      SFX.dry();
      return;
    }
    save.gems -= h.cost;
    save.unlocked[id] = true;
    writeSave();
    SFX.level();
    toast('解鎖角色：' + h.name);
    heroSel = id;
    save.hero = id;
    writeSave();
    refreshHeroes();
    refreshTitle();
  }

  /* ---------------- 章節永久強化 ---------------- */
  function chapterUpBonus() {
    var b = { hpPct: 0, atkPct: 0, spdPct: 0, critPct: 0, luckPct: 0, armorPct: 0, coinPct: 0, lsPct: 0, enPct: 0, regenPct: 0, ratePct: 0 };
    D.CHAPTER_UPGRADES.forEach(function (u) {
      var lv = (save.chapterUp && save.chapterUp[u.id]) || 0;
      if (lv > 0 && b[u.stat] != null) b[u.stat] += u.v * lv;
    });
    return b;
  }

  var upPage = 0;

  function refreshUpgrades() {
    $('gemText2').textContent = save.gems;
    var list = $('upList');
    if (!list) return;
    list.innerHTML = '';
    var PER_PAGE = 6;
    var pages = Math.max(1, Math.ceil(UPGRADES.length / PER_PAGE));
    if (upPage >= pages) upPage = pages - 1;
    if (upPage < 0) upPage = 0;
    var cap = upCap(UPGRADES[0]);
    UPGRADES.slice(upPage * PER_PAGE, upPage * PER_PAGE + PER_PAGE).forEach(function (u) {
      var lv = save.up[u.id] || 0;
      var capU = upCap(u);
      var maxed = lv >= capU;
      var cost = u.cost(lv);
      var row = document.createElement('div');
      row.className = 'up-row';
      var pct = Math.round(lv / capU * 100);
      row.innerHTML =
        '<div><div class="nm">' + u.name + '</div><div class="ds">' + u.desc + '</div></div>' +
        '<div class="pips"><i class="on" style="width:' + pct + '%"></i></div>' +
        '<div class="lvtext">Lv ' + lv + ' / ' + capU + '</div>' +
        '<button class="' + (maxed ? '' : 'primary') + '"' + (maxed ? ' disabled' : '') + '>' +
        (maxed ? '滿級' : cost + ' 魔晶') + '</button>';
      var btn = row.querySelector('button');
      if (!maxed && btn) {
        btn.addEventListener('click', function () {
          if (save.gems < cost) { toast('魔晶不足'); SFX.dry(); return; }
          save.gems -= cost;
          save.up[u.id] = lv + 1;
          writeSave();
          SFX.level();
          toast(u.name + ' 提升到 Lv.' + (lv + 1));
          refreshUpgrades();
        });
      }
      list.appendChild(row);
    });

    /* 分頁：每解鎖一章上限 +10，超出就翻到下一頁 */
    var pager = document.createElement('div');
    pager.className = 'up-pager';
    pager.innerHTML =
      '<button class="ghost" id="upPrev"' + (upPage === 0 ? ' disabled' : '') + '>上一頁</button>' +
      '<span>第 ' + (upPage + 1) + ' / ' + pages + ' 頁 · 目前上限 ' + cap + '</span>' +
      '<button class="ghost" id="upNext"' + (upPage >= pages - 1 ? ' disabled' : '') + '>下一頁</button>';
    list.appendChild(pager);
    var prev = pager.querySelector('#upPrev');
    if (prev) prev.addEventListener('click', function () { upPage = Math.max(0, upPage - 1); refreshUpgrades(); });
    var next = pager.querySelector('#upNext');
    if (next) next.addEventListener('click', function () { upPage = Math.min(pages - 1, upPage + 1); refreshUpgrades(); });

    /* 章節強化：通關章節解鎖，效果疊加 */
    var dvd = document.createElement('div');
    dvd.className = 'up-divider';
    dvd.textContent = '章節強化 · 通關章節解鎖 · 可疊加';
    list.appendChild(dvd);

    D.CHAPTER_UPGRADES.forEach(function (u) {
      var unlocked = (save.chapterUnlocked || 1) >= u.chapter;
      var lv = (save.chapterUp && save.chapterUp[u.id]) || 0;
      var maxed = lv >= u.max;
      var cost = 60 + lv * 40;
      var row = document.createElement('div');
      row.className = 'up-row chapter' + (unlocked ? '' : ' locked');
      var pips = '';
      for (var i = 0; i < u.max; i++) pips += '<i class="' + (i < lv ? 'on' : '') + '"></i>';
      row.innerHTML =
        '<div><div class="nm">第 ' + u.chapter + ' 章 · ' + u.name + '</div>' +
        '<div class="ds">' + (unlocked ? u.desc : '通關第 ' + u.chapter + ' 章解鎖') + '</div></div>' +
        '<div class="pips">' + pips + '</div>' +
        '<button class="' + (unlocked && !maxed ? 'primary' : '') + '"' + (unlocked && !maxed ? '' : ' disabled') + '>' +
        (!unlocked ? '未解鎖' : (maxed ? '滿級' : cost + ' 魔晶')) + '</button>';
      var cbtn = row.querySelector('button');
      if (unlocked && !maxed && cbtn) {
        cbtn.addEventListener('click', function () {
          if (save.gems < cost) { toast('魔晶不足'); SFX.dry(); return; }
          save.gems -= cost;
          save.chapterUp[u.id] = lv + 1;
          writeSave();
          SFX.level();
          toast(u.name + ' Lv.' + (lv + 1));
          refreshUpgrades();
          refreshTitle();
        });
      }
      list.appendChild(row);
    });
  }

  function refreshPause() {
    if (!run) return;
    var p = run.player;
    $('pauseInfo').innerHTML =
      '<span>第 ' + (run.floor + 1) + ' 層</span><span>金幣 ' + run.coins + '</span><span>擊殺 ' + run.kills + '</span>';
    var el = $('pauseStats');
    if (el) {
      el.innerHTML =
        '<div><span>生命</span><b>' + Math.ceil(p.hp) + ' / ' + p.maxHp + '</b></div>' +
        '<div><span>攻擊</span><b>×' + p.atkMul.toFixed(2) + '</b></div>' +
        '<div><span>移速</span><b>' + Math.round(p.spd) + '</b></div>' +
        '<div><span>暴擊</span><b>' + Math.round(p.critPct * 100) + '%</b></div>' +
        '<div><span>幸運</span><b>' + Math.round(p.luckPct * 100) + '%</b></div>' +
        '<div><span>減傷</span><b>' + Math.round(p.dmgReduce * 100) + '%</b></div>';
    }
  }

  function refreshStats() {
    if (!run) return;
    var p = run.player;
    var el = $('statsBody');
    if (!el) return;
    var rows = [
      ['生命', Math.ceil(p.hp) + ' / ' + p.maxHp],
      ['能量', Math.floor(p.energy) + ' / ' + Math.round(p.maxEnergy)],
      ['攻擊倍率', '×' + p.atkMul.toFixed(2)],
      ['移動速度', Math.round(p.spd)],
      ['暴擊率', Math.round(p.critPct * 100) + '%'],
      ['幸運', Math.round(p.luckPct * 100) + '%'],
      ['生命竊取', Math.round(p.lifestealPct * 100) + '%'],
      ['減傷', Math.round(p.dmgReduce * 100) + '%'],
      ['金幣加成', '+' + Math.round((p.coinMul - 1) * 100) + '%'],
      ['武器', p.weapon.name]
    ];
    var html = rows.map(function (r) { return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('');
    html += '<div class="eq-title">裝備（' + p.equipment.length + ' / 4）</div>';
    if (!p.equipment.length) html += '<div class="eq-empty">尚未裝備任何物品</div>';
    p.equipment.forEach(function (it) {
      html += '<div class="eq-row"><span style="color:' + RARITY[it.rarity].color + '">' + it.name + '</span><b>' +
        it.stats.map(function (s) { return STATS[s.key].fmt(s.value); }).join(' · ') + '</b></div>';
    });
    el.innerHTML = html;
  }

  function toast(msg) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    toastT = 2.0;
  }
  function banner(text, sub, color) {
    var el = $('banner');
    if (!el) return;
    el.innerHTML = text + (sub ? '<small>' + sub + '</small>' : '');
    el.style.color = '#fff';
    el.classList.remove('hidden');
    bannerT = 1.6;
  }

  /* ------------------------------------------------------------------
     角色 / 數值
     ------------------------------------------------------------------ */
  function makePlayer(h) {
    var p = {
      hero: h,
      x: RW / 2, y: RH / 2 + 90,
      vx: 0, vy: 0, r: 6.5,
      hp: h.hp, maxHp: h.hp,
      spd: h.spd,
      energy: h.en, maxEnergy: h.en,
      baseRegen: 9 + h.en * 0.035,
      atkMul: 1, atkBase: h.atk,
      critPct: 0.05, luckPct: 0, lifestealPct: 0, dmgReduce: 0, coinMul: 1,
      baseLuck: 0, regenMul: 1,
      ultCharge: 0, ultReady: false, ultLock: 0, ultCd: 0, hurtFlash: 0,
      aim: -Math.PI / 2, face: 1,
      fireCd: 0, dryCd: 0,
      dashCd: 0, dashT: 0, dashA: 0,
      skillCd: 0,
      invuln: 0,
      shieldT: 0, rageT: 0,
      walk: 0,
      weapon: rollWeapon('pistol', 0),
      equipment: [],
      talents: {},
      buffs: { dmg: 0, spd: 0, rate: 0, crit: 0, freeAmmo: 0, autoFire: 0, lifesteal: 0 },
      burst: null
    };
    recalcStats(p);
    p.hp = p.maxHp;
    p.energy = p.maxEnergy;
    return p;
  }

  function metaStats() {
    var out = { atk: 0, spd: 0, hp: 0, crit: 0, luck: 0, regen: 0, coin: 0, lifesteal: 0, armor: 0 };
    var inv = save.metaItems || [];
    (save.metaEquipped || []).forEach(function (uid) {
      var it = null;
      for (var i = 0; i < inv.length; i++) if (inv[i].uid === uid) { it = inv[i]; break; }
      if (!it) return;
      it.stats.forEach(function (s) { if (out[s.key] != null) out[s.key] += s.value; });
    });
    return out;
  }

  function recalcStats(p) {
    var h = p.hero;
    var atk = h.atk * (1 + (save.up.atk || 0) * 0.08);
    var spd = h.spd * (1 + (save.up.spd || 0) * 0.04);
    var maxHp = h.hp + (save.up.hp || 0) * 14;
    var crit = 0.05, luck = 0, ls = 0, dr = 0, coin = 1, regen = 1;
    /* 永久強化（新增 8 種） */
    crit += (save.up.crit || 0) * 0.02;
    luck += (save.up.luck || 0) * 0.04;
    dr += (save.up.armor || 0) * 0.02;
    ls += (save.up.ls || 0) * 0.01;
    regen *= 1 + (save.up.regen || 0) * 0.06;
    p.pickupMul = 1 + (save.up.magnet || 0) * 0.2;
    p.keyFind = (save.up.keyfind || 0) * 0.10;
    p.equipThorns = 0;
    p.equipBlast = false;
    p.aegis = false;
    p.starburst = false;
    p.killHeal = 0;
    p.voidwalk = false;
    p.dashMul = 1;
    p.regenPulse = false;
    p.eternal = false;
    p.abyssalGear = false;

    p.equipment.forEach(function (it) {
      it.stats.forEach(function (s) {
        if (s.key === 'atk') atk *= (1 + s.value);
        else if (s.key === 'spd') spd *= (1 + s.value);
        else if (s.key === 'hp') maxHp += s.value;
        else if (s.key === 'crit') crit += s.value;
        else if (s.key === 'luck') luck += s.value;
        else if (s.key === 'regen') regen *= (1 + s.value);
        else if (s.key === 'coin') coin += s.value;
        else if (s.key === 'lifesteal') ls += s.value;
        else if (s.key === 'armor') dr += s.value;
      });
      /* 傳說以上的特殊效果 */
      if (it.special === 'leech') ls += 0.04;
      else if (it.special === 'guard') dr += 0.06;
      else if (it.special === 'greed') coin += 0.15;
      else if (it.special === 'swift') spd *= 1.08;
      else if (it.special === 'thorns') p.equipThorns += 10;
      else if (it.special === 'blast') p.equipBlast = true;
      else if (it.special === 'aegis') p.aegis = true;
      else if (it.special === 'starburst') p.starburst = true;
      else if (it.special === 'bloodpact') p.killHeal += 4;
      else if (it.special === 'voidwalk') p.voidwalk = true;
      else if (it.special === 'gale') p.dashMul = 0.7;
      else if (it.special === 'genesis') p.regenPulse = true;
      else if (it.special === 'eternal') p.eternal = true;
      else if (it.special === 'abyssal') p.abyssalGear = true;
      else if (it.special === 'primordial') { atk *= 1.12; dr += 0.08; }
      else if (it.special === 'fate') { luck += 0.2; crit += 0.06; }
    });

    var hpRatio = p.maxHp > 0 ? p.hp / p.maxHp : 1;
    var mg = metaStats();
    atk *= (1 + mg.atk);
    spd *= (1 + mg.spd);
    maxHp += mg.hp;
    crit += mg.crit;
    luck += mg.luck;
    regen *= (1 + mg.regen);
    coin += mg.coin;
    ls += mg.lifesteal;
    dr += mg.armor;

    /* 局外裝備（寶庫）的特殊效果也要生效 */
    (save.metaEquipped || []).forEach(function (uid) {
      var it = metaFind(uid);
      if (!it || !it.special) return;
      var sp = it.special;
      if (sp === 'leech') ls += 0.04;
      else if (sp === 'guard') dr += 0.06;
      else if (sp === 'greed') coin += 0.15;
      else if (sp === 'swift') spd *= 1.08;
      else if (sp === 'thorns') p.equipThorns += 10;
      else if (sp === 'blast') p.equipBlast = true;
      else if (sp === 'aegis') { p.aegis = true; dr += 0.12; hp *= 1.08; }
      else if (sp === 'starburst') { p.starburst = true; atk *= 1.18; crit += 0.08; }
      else if (sp === 'bloodpact') { p.killHeal += 4; ls += 0.05; }
      if (it.id === 'e_blood') p.hpRegenPerSec = (p.hpRegenPerSec || 0) + 1;
      else if (sp === 'voidwalk') { p.voidwalk = true; spd *= 1.08; dr += 0.05; }
      else if (sp === 'gale') { p.dashMul = Math.min(p.dashMul, 0.7); spd *= 1.05; }
      else if (sp === 'genesis') { p.regenPulse = true; atk *= 1.10; hp *= 1.15; }
      else if (sp === 'eternal') { p.eternal = true; atk *= 1.16; crit += 0.06; }
      else if (sp === 'abyssal') { p.abyssalGear = true; ls += 0.06; atk *= 1.12; }
      else if (sp === 'primordial') { atk *= 1.12; dr += 0.08; }
      else if (sp === 'fate') { luck += 0.2; crit += 0.06; }
      else if (sp === 'mythforge') { atk *= 1.2; hp *= 1.2; }
      else if (sp === 'soulbind') { p.soulbind = true; ls += 0.08; }
      else if (sp === 'chronos') { p.chronos = true; spd *= 1.1; }
    });

    /* 天賦加成 */
    var TL = p.talents || {};
    if (TL.swift) spd *= 1 + 0.12 * TL.swift;
    if (TL.vitality) maxHp *= 1 + 0.20 * TL.vitality;
    if (TL.greed) coin += 0.25 * TL.greed;
    if (TL.fortune) luck += 0.08 * TL.fortune;
    if (TL.executioner) atk *= 1 + 0.12 * TL.executioner;
    if (TL.vampire) ls += 0.03 * TL.vampire;
    if (TL.resilience) dr += 0.10 * TL.resilience;
    if (p.comboStacks > 0) atk *= 1 + 0.04 * p.comboStacks;
    if (p.abyssalStacks > 0 && p.abyssalGear) atk *= 1 + 0.03 * p.abyssalStacks;
    /* 章節永久強化 */
    var cb = chapterUpBonus();
    atk *= 1 + cb.atkPct;
    spd *= 1 + cb.spdPct;
    maxHp *= 1 + cb.hpPct;
    crit += cb.critPct;
    luck += cb.luckPct;
    dr += cb.armorPct;
    coin += cb.coinPct;
    ls += cb.lsPct;
    regen *= 1 + cb.regenPct;
    p.rateMul = 1 + cb.ratePct;
    p.enMul = 1 + cb.enPct;
    if (p.hero) p.maxEnergy = Math.round((p.hero.en + (save.up.en || 0) * 12) * p.enMul * ((run && run.heroTalent === 'tech') ? 1.25 : 1));

    /* 免費玩家補正：章節越深，基礎武器也跟著成長，不用課金也能通關 */
    var ci0 = (typeof run !== 'undefined' && run) ? chapterIndex(run.floor) : 0;
    atk *= 1 + ci0 * 0.09;

    /* 角色專屬天賦（數值型） */
    var htA = (run && run.heroTalent) || '';
    if (htA === 'ranger') { crit += 0.10; luck += 0.10; }
    else if (htA === 'samurai') { crit += 0.05; atk *= 1.08; }
    else if (htA === 'paladin') { regen *= 1.4; dr += 0.08; }
    else if (htA === 'berserker') { atk *= 1 + (1 - hpRatio) * 0.35; }
    else if (htA === 'dragonkin') { dr += 0.12; p.equipThorns += 8; }
    else if (htA === 'gunslinger') { regen *= 1.35; }
    else if (htA === 'monk') { p.dashMul = Math.min(p.dashMul || 1, 0.6); }
    else if (htA === 'voidlord') { atk *= 1.18; }
    else if (htA === 'sunpriest') { regen *= 1.6; dr += 0.10; }

    p.atkMul = atk;
    p.spd = spd;
    p.maxHp = Math.round(maxHp);
    p.hp = Math.min(p.hp, p.maxHp);
    if (p.hp <= 0) p.hp = Math.max(1, Math.round(p.maxHp * hpRatio));
    p.critPct = clamp(crit, 0, 0.85);
    p.luckPct = luck + (p.baseLuck || 0);
    p.lifestealPct = ls;
    p.dmgReduce = clamp(dr, 0, 0.6);
    p.coinMul = coin;
    p.regenMul = regen;
  }

  /* ---------------- 武器擲骰 ---------------- */
  function rarityRoll(bonus, luck) {
    /* 傳說/神話需先解鎖對應裝備才會掉落 */
    var maxR = 3;
    if (save.forgedEquip) {
      var hasM = D.MYTHIC_EQUIP.some(function (e) { return save.forgedEquip[e.id]; });
      var hasL = D.LEGEND_EQUIP.some(function (e) { return save.forgedEquip[e.id]; });
      if (hasM) maxR = 5; else if (hasL) maxR = 4;
    }
    var w = RARITY.map(function (r, i) {
      var weight = r.weight;
      if (i > 0) weight *= (1 + (bonus || 0) * 2.2 + (luck || 0) * 1.5);
      if (i > maxR) weight = 0;
      return weight;
    });
    var total = w.reduce(function (a, b) { return a + b; }, 0);
    var roll = Math.random() * total;
    for (var i = 0; i < w.length; i++) {
      roll -= w[i];
      if (roll <= 0) return i;
    }
    return 0;
  }

  function rollWeapon(id, rarity) {
    var t = WEAPONS[id] || WEAPONS.pistol;
    var r = clamp(rarity || 0, 0, 5);
    var inst = {};
    for (var k in t) inst[k] = t[k];
    inst.rarity = r;
    inst.baseId = t.id;
    inst.dmg = Math.round(t.dmg * RARITY[r].mult);
    if (inst.rate) inst.rate = +(t.rate * (1 - r * 0.02)).toFixed(3);
    /* 全域射程強化 */
    if (inst.speed) inst.speed = Math.round(t.speed * 1.3);
    if (inst.life) inst.life = Math.round(t.life * 1.25 * 100) / 100;
    if (inst.melee && inst.range) inst.range = Math.round(t.range * 1.2);
    if (r >= 3 && !inst.pierce) inst.pierce = 1;
    if (r >= 4) inst.critBonus = 0.15;
    return inst;
  }

  function rollEquip(rarity, luck) {
    var r = clamp(rarity || 0, 0, 5);
    /* 已解鎖的傳說／神話裝備也會出現在寶箱裡 */
    if (save.forgedEquip) {
      var owned = D.LEGEND_EQUIP.concat(D.MYTHIC_EQUIP).filter(function (e) { return save.forgedEquip[e.id]; });
      if (owned.length && Math.random() < 0.22) {
        var tpl = owned[Math.floor(Math.random() * owned.length)];
        var c = JSON.parse(JSON.stringify(tpl));
        c.uid = 'e' + Date.now().toString(36) + Math.floor(Math.random() * 999);
        c.slotName = (EQUIP_SLOTS.filter(function (s) { return s.key === c.slot; })[0] || {}).name || '';
        c.specialName = (D.EQUIP_SPECIALS.filter(function (s) { return s.id === c.special; })[0] || {}).name || '';
        c.specialDesc = (D.EQUIP_SPECIALS.filter(function (s) { return s.id === c.special; })[0] || {}).desc || '';
        c.score = c.stats.reduce(function (a, s) { return a + (s.key === 'hp' ? s.value / 20 : s.value); }, 0);
        return c;
      }
    }
    var slot = pick(EQUIP_SLOTS);
    var pool = slot.pool.slice();
    var count = 1 + Math.min(3, Math.floor(r * 0.75) + (Math.random() < 0.35 ? 1 : 0));
    var stats = [];
    for (var i = 0; i < count && pool.length; i++) {
      var key = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      var def = STATS[key];
      var t = (r + 1) / 5;
      var val = def.base + (def.max - def.base) * t * rand(0.7, 1.15);
      if (key === 'hp') val = Math.round(val);
      else val = Math.round(val * 1000) / 1000;
      stats.push({ key: key, value: val });
    }
    var special = null;
    if (r >= 4) special = pick(D.EQUIP_SPECIALS);
    return {
      slot: slot.key, slotName: slot.name, icon: slot.icon,
      name: (special ? special.name + '·' : '') + pick(D.EQUIP_PREFIX) + slot.name,
      rarity: r, stats: stats,
      special: special ? special.id : null,
      specialName: special ? special.name : null,
      specialDesc: special ? special.desc : null,
      score: stats.reduce(function (a, s) { return a + (s.key === 'hp' ? s.value / 20 : s.value); }, 0)
    };
  }

  /* 依指定部位擲裝備（合成用） */
  function rollEquipSlot(slotKey, rarity) {
    var slot = EQUIP_SLOTS.filter(function (s) { return s.key === slotKey; })[0] || EQUIP_SLOTS[0];
    var it = rollEquip(rarity);
    it.slot = slot.key;
    it.slotName = slot.name;
    it.icon = slot.icon;
    return it;
  }

  function addEquipment(item) {
    var p = run.player;
    var same = -1;
    for (var i = 0; i < p.equipment.length; i++) {
      if (p.equipment[i].slot === item.slot) { same = i; break; }
    }
    if (same >= 0) {
      if (p.equipment[same].score >= item.score) {
        run.coins += 40;
        toast(item.slotName + ' 欄位已有更好的裝備，轉換為 40 金幣');
        recalcStats(p);
        refreshEquipStrip();
        return;
      }
      p.equipment[same] = item;
      recalcStats(p);
      refreshEquipStrip();
      return;
    } else if (p.equipment.length < 4) {
      p.equipment.push(item);
    } else {
      var weakest = 0;
      for (var i = 1; i < p.equipment.length; i++) {
        if (p.equipment[i].rarity < p.equipment[weakest].rarity ||
          (p.equipment[i].rarity === p.equipment[weakest].rarity && p.equipment[i].score < p.equipment[weakest].score)) {
          weakest = i;
        }
      }
      if (p.equipment[weakest].score >= item.score) {
        run.coins += 40;
        toast('裝備欄已滿，轉換為 40 金幣');
        recalcStats(p);
        refreshEquipStrip();
        return;
      }
      var old = p.equipment[weakest];
      p.equipment[weakest] = item;
      toast('替換了 ' + old.name);
    }
    recalcStats(p);
    refreshEquipStrip();
  }

  /* ------------------------------------------------------------------
     章節
     ------------------------------------------------------------------ */
  function chapterIndex(floor) { return Math.floor(floor / (FPS * SPC)); }
  function stageIndex(floor) { return Math.floor(floor / FPS); }
  function stageInChapter(floor) { return Math.floor(floor / FPS) % SPC; }
  function isStageBoss(floor) { return (floor + 1) % FPS === 0; }
  function chapterDef(floor) { return CHAPTERS[chapterIndex(floor) % CHAPTERS.length]; }
  function themeFor(floor) { return THEMES[chapterDef(floor).theme]; }
  function tierOf(floor) {
    var ci = chapterIndex(floor);
    var th = THEMES[CHAPTERS[ci % CHAPTERS.length].theme];
    return { name: th.name, accent: th.accent, index: ci, stage: stageInChapter(floor) + 1 };
  }

  function genWalls(floor, boss) {
    var walls = [
      { x: 0, y: 0, w: RW, h: WALLT },
      { x: 0, y: RH - WALLT, w: RW, h: WALLT },
      { x: 0, y: 0, w: WALLT, h: RH },
      { x: RW - WALLT, y: 0, w: WALLT, h: RH }
    ];
    if (boss) return walls;
    var n = randInt(3, 5);
    for (var i = 0; i < n; i++) {
      var horiz = Math.random() < 0.5;
      var w = (horiz ? randInt(3, 7) : randInt(1, 2)) * TILE;
      var h = (horiz ? randInt(1, 2) : randInt(2, 5)) * TILE;
      var maxX = Math.max(4, Math.floor((RW - w) / TILE) - 4);
      var maxY = Math.max(4, Math.floor((RH - h) / TILE) - 4);
      var x = randInt(3, maxX) * TILE;
      var y = randInt(3, maxY) * TILE;
      if (Math.abs((x + w / 2) - RW / 2) < 150 && Math.abs((y + h / 2) - RH / 2) < 120) continue;
      walls.push({ x: x, y: y, w: w, h: h });
    }
    return walls;
  }

  function hitWalls(x, y, r, walls) {
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      var cx = clamp(x, w.x, w.x + w.w);
      var cy = clamp(y, w.y, w.y + w.h);
      var dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  function resolveWalls(e, walls) {
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      var cx = clamp(e.x, w.x, w.x + w.w);
      var cy = clamp(e.y, w.y, w.y + w.h);
      var dx = e.x - cx, dy = e.y - cy;
      var d2 = dx * dx + dy * dy;
      if (d2 >= e.r * e.r) continue;
      if (d2 > 0.0001) {
        var d = Math.sqrt(d2);
        var push = (e.r - d) / d;
        e.x += dx * push;
        e.y += dy * push;
      } else {
        var l = e.x - w.x, rr2 = (w.x + w.w) - e.x;
        var tt = e.y - w.y, bb = (w.y + w.h) - e.y;
        var m = Math.min(l, rr2, tt, bb);
        if (m === l) e.x = w.x - e.r;
        else if (m === rr2) e.x = w.x + w.w + e.r;
        else if (m === tt) e.y = w.y - e.r;
        else e.y = w.y + w.h + e.r;
      }
    }
  }

  function resolveProps(e, props) {
    for (var i = 0; i < props.length; i++) {
      var w = props[i];
      if (w.dead) continue;
      var dx = e.x - w.x, dy = e.y - w.y;
      var rr2 = e.r + w.r;
      var d2 = dx * dx + dy * dy;
      if (d2 >= rr2 * rr2 || d2 < 0.001) continue;
      var d = Math.sqrt(d2);
      e.x += dx / d * (rr2 - d);
      e.y += dy / d * (rr2 - d);
    }
  }

  function buildFloor(f) {
    run.floor = f;
    var ci = chapterIndex(f);
    var th = themeFor(f);
    var boss = isStageBoss(f);
    var st = stageInChapter(f) + 1;
    run.chapterIndex = ci;
    run.stage = st;
    run.theme = th;
    run.tier = { name: th.name, accent: th.accent, index: ci, stage: st };
    run.roster = D.makeSpecies(ci, st - 1, 4, f * 7 + 3);
    run.walls = genWalls(f, boss);
    run.bg = Art.buildRoom(run.walls, RW, RH, 1000 + f * 77, th);
    run.bullets = [];
    run.enemies = [];
    run.pickups = [];
    run.parts = [];
    run.texts = [];
    run.items = [];
    run.props = [];
    run.clouds = [];
    run.impacts = [];
    run.hitstop = 0;
    run.cleared = false;
    run.stageCleared = false;
    run.portal = null;
    run.chest = null;
    run.swing = null;
    run.boss = null;
    /* 每一層都是獨立區域：地形破壞、核彈、掉落演出全部不帶過去 */
    run.ruins = [];
    run.dropFx = [];
    run.bossDeath = [];
    run.shopRoom = false;
    run.merchant = null;
    run.nukes = [];
    run.nukesIn = [];
    run.nukeCall = null;
    run.alarmT = 0;
    run.snapshots = [];
    run.torches = [
      { x: RW / 2, y: 18 }, { x: RW / 2, y: RH - 20 },
      { x: 18, y: RH / 2 }, { x: RW - 18, y: RH / 2 }
    ];

    var p = run.player;
    p.x = RW / 2;
    p.y = RH / 2 + 90;
    p.vx = 0; p.vy = 0;
    p.invuln = 1.0;
    p.shieldT = 0;
    p.ultLock = 0;

    genProps(f, boss);
    spawnEnemies(f, th, boss);
    setThemeVar(th.accent);
    if (SFX.setScene) SFX.setScene(boss ? 'boss' : 'battle');

    /* 隱藏裂隙：機率很低；第 5 關固定出現方便測試 */
    run.secretDoor = null;
    if (!boss && !run.rush && Math.random() < 0.001) {
      var sd = findSpawnPos();
      run.secretDoor = { x: clamp(sd.x, 90, RW - 90), y: clamp(sd.y, 90, RH - 90), t: 0 };
    }

    run.cam.x = clamp(p.x - VW / 2, 0, RW - VW);
    run.cam.y = clamp(p.y - VH / 2, 0, RH - VH);
    run.cam.shake = 0;
    if (run.talents && run.talents.barrier) run.player.shieldT = Math.max(run.player.shieldT || 0, 6);
    /* 龍鱗壁壘：每層開始獲得護盾 */
    if (run.player.aegis) run.player.shieldT = Math.max(run.player.shieldT || 0, 5);
    run.floorIntro = 1.35;   /* 進入新樓層的轉場動畫 */
    saveRunSnapshot();
  }

  var PROP_DEF = {
    crate: { hp: 18, r: 9, drop: 'coin' },
    barrel: { hp: 22, r: 9, drop: 'energy' },
    bomb: { hp: 14, r: 10, drop: 'bomb' },
    pot: { hp: 8, r: 8, drop: 'coin' },
    /* 章節專屬可破壞物 */
    lavaRock: { hp: 30, r: 10, drop: 'coin', hazard: true },
    vinepot: { hp: 16, r: 8, drop: 'heart' },
    crystal: { hp: 26, r: 10, drop: 'key' }
  };

  function genProps(f, boss) {
    if (boss) return;
    var n = randInt(5, 9);
    for (var i = 0; i < n; i++) {
      var type = pick(['crate', 'crate', 'barrel', 'pot', 'bomb', 'bomb']);
      var th0 = themeFor(f);
      if (th0.deco === 'lava' || th0.deco === 'ember') type = pick(['lavaRock', 'barrel', 'crate', 'lavaRock']);
      else if (th0.deco === 'vine') type = pick(['crate', 'vinepot', 'vinepot', 'barrel']);
      else if (th0.deco === 'ice' || th0.deco === 'crystal') type = pick(['crystal', 'crystal', 'crate', 'barrel']);
      var def = PROP_DEF[type];
      var spot = null;
      for (var t = 0; t < 40; t++) {
        var x = rand(WALLT + 30, RW - WALLT - 30);
        var y = rand(WALLT + 30, RH - WALLT - 30);
        if (hitWalls(x, y, def.r + 6, run.walls)) continue;
        if (Math.abs(x - RW / 2) < 70 && Math.abs(y - (RH / 2 + 90)) < 70) continue;
        if (Math.abs(x - RW / 2) < 60 && Math.abs(y - (RH / 2)) < 60) continue;
        if (Math.abs(x - RW / 2) < 70 && y < 110) continue;   // 別擋住傳送門
        spot = { x: x, y: y };
        break;
      }
      if (!spot) continue;
      run.props.push({
        type: type, x: spot.x, y: spot.y, r: def.r,
        hp: def.hp, maxHp: def.hp, flash: 0, dead: false
      });
    }
  }

  /* 整體怪物強度（第二階段改版：全部模式 +20% 生命、+15% 傷害） */
  var ENEMY_BUFF = 1.45;
  var ENEMY_BUFF_DMG = 1.3;

  function addEnemy(sp, x, y) {
    var def = ENEMIES[sp.base] || ENEMIES.slime;
    var f = run.floor, ci = chapterIndex(f);
    var hpMul = (1 + f * ((D.BALANCE && D.BALANCE.enemyHpPerFloor) || 0.022) + ci * 0.06) * run.diff.hp * sp.hpMul * (sp.trait === 'shield' ? 1.2 : 1) * ENEMY_BUFF;
    var dmgMul = (1 + f * ((D.BALANCE && D.BALANCE.enemyDmgPerFloor) || 0.014) + ci * 0.035) * run.diff.dmg * sp.dmgMul * ENEMY_BUFF_DMG;
    var e = {
      kind: sp.base, name: sp.name, arch: sp.arch, pal: (function(p0,k){ var o={}; for (var q in p0) o[q]=p0[q]; o.sprite = (window.Art && Art.mobSpriteFor) ? Art.mobSpriteFor(k) : null; return o; })(sp.pal, sp.base), uid: sp.uid,
      trait: sp.trait || 'none', elite: !!sp.elite, sp: sp,
      behavior: sp.behavior || 'chase', behaviorT: rand(1.2, 3),
      x: x, y: y, vx: 0, vy: 0,
      r: def.r * (0.94 + sp.hpMul * 0.1) * (sp.scale || 1),
      spd: def.spd * sp.spdMul,
      hp: def.hp * hpMul, maxHp: def.hp * hpMul,
      dmg: def.dmg * dmgMul, coin: def.coin,
      flash: 0, touchCd: 0, shootT: rand(0.4, 2), t: rand(0, 6),
      kx: 0, ky: 0, state: 'idle', timer: 0, face: 1,
      walk: 0, dead: false, seed: rand(0, 10),
      ranged: sp.ranged || 0, burn: 0, poison: 0, slowT: 0, rootT: 0
    };
    run.enemies.push(e);
    return e;
  }

  function spawnBoss(forceId, scale) {
    var ci = chapterIndex(run.floor);
    var st = stageInChapter(run.floor);
    var order = (D.BOSS_ORDER && D.BOSS_ORDER.length) ? D.BOSS_ORDER : ['warden'];
    /* 依章節×小關輪替：18 隻首領剛好 6 章一循環，
       同一章節的三隻必定與前三章（9 隻）完全不重複 */
    var slot = ((ci * 3 + st) % order.length + order.length) % order.length;
    var bossId = forceId || order[slot];
    var def = BOSSES[bossId] || BOSSES.warden;
    var hpMul = (1 + ci * 0.18 + st * 0.05) * run.diff.hp * (scale || 1);
    var b = {
      kind: 'boss', name: def.name, arch: 'tank', pal: def.pal, bossId: bossId,
      x: RW / 2, y: 110, vx: 0, vy: 0, r: def.r,
      hp: def.hp * hpMul, maxHp: def.hp * hpMul,
      dmg: def.dmg * (1 + ci * 0.05) * run.diff.dmg, coin: def.coin,
      flash: 0, touchCd: 0, t: 0, kx: 0, ky: 0,
      state: 'idle', timer: 0, face: 1, walk: 0, dead: false,
      boss: true, atkT: 1.5, chargeT: 0, chargeA: 0, seed: 0, beamT: 0, beamA: 0,
      pattern: def.pattern || 'radial',
      burn: 0, poison: 0, slowT: 0, rootT: 0, trait: 'none'
    };
    run.enemies.push(b);
    run.boss = b;
  }

  function spawnEnemies(f, th, boss) {
    if (run && run.training) return;
    if (boss) { spawnBoss(); return; }
    var st = stageInChapter(f);
    var n = 4 + st * 2 + Math.min(4, chapterIndex(f));
    for (var i = 0; i < n; i++) {
      var pos = findSpawnPos();
      addEnemy(run.roster[i % run.roster.length], pos.x, pos.y);
    }
    /* 精英變體：更高的血量與金色外觀 */
    if (Math.random() < 0.3 + st * 0.1) {
      var base = run.roster[randInt(0, run.roster.length - 1)];
      var sp = {
        uid: base.uid + '_elite', base: base.base, arch: base.arch,
        name: '精英·' + base.name,
        pal: {
          body: D.shiftHex(base.pal.body, 0.55, 1.15, 1.12),
          dark: D.shiftHex(base.pal.dark, 0.55, 1.1, 1.0),
          accent: '#ffe6a1', eye: '#ff3b3b'
        },
        hpMul: base.hpMul * 2.2, spdMul: base.spdMul * 0.95,
        dmgMul: base.dmgMul * 1.3, trait: 'shield', ranged: base.ranged, elite: true
      };
      var pos2 = findSpawnPos();
      addEnemy(sp, pos2.x, pos2.y).elite = true;
    }
  }

  /* 在指定點附近找一個真正可站立、可互動的空地 */
  function findFreeSpotNear(cx, cy, rad) {
    function blocked(x, y) {
      if (x < WALLT + rad || x > RW - WALLT - rad) return true;
      if (y < WALLT + rad || y > RH - WALLT - rad) return true;
      if (hitWalls(x, y, rad, run.walls)) return true;
      for (var i = 0; i < run.props.length; i++) {
        var pr = run.props[i];
        if (pr.dead) continue;
        if (Math.hypot(pr.x - x, pr.y - y) < rad + (pr.r || 10) + 6) return true;
      }
      return false;
    }
    if (!blocked(cx, cy)) return { x: cx, y: cy };
    for (var ring = 1; ring <= 14; ring++) {
      for (var a = 0; a < 16; a++) {
        var ang = (a / 16) * Math.PI * 2 + ring * 0.23;
        var x = cx + Math.cos(ang) * ring * 14;
        var y = cy + Math.sin(ang) * ring * 14;
        if (!blocked(x, y)) return { x: x, y: y };
      }
    }
    return { x: cx, y: cy };
  }

  function findSpawnPos() {
    var p = run.player;
    for (var i = 0; i < 70; i++) {
      var x = rand(WALLT + 24, RW - WALLT - 24);
      var y = rand(WALLT + 24, RH - WALLT - 24);
      if (hitWalls(x, y, 24, run.walls)) continue;
      if (Math.hypot(x - p.x, y - p.y) < 160) continue;
      return { x: x, y: y };
    }
    return { x: rand(80, RW - 80), y: rand(80, 120) };
  }

  /* ------------------------------------------------------------------
     粒子 / 文字 / 毒霧
     ------------------------------------------------------------------ */
  function addParticles(x, y, n, color, opt) {
    opt = opt || {};
    n = Math.max(1, Math.round(n * QUALITY));
    if (run && run.parts.length > 900) n = Math.min(n, 2);
    for (var i = 0; i < n; i++) {
      var a = rand(0, TAU), sp = opt.speed || rand(40, 160);
      run.parts.push({
        x: x, y: y,
        vx: Math.cos(a) * sp * rand(0.3, 1),
        vy: Math.sin(a) * sp * rand(0.3, 1),
        life: rand(0.25, 0.6), max: 0.6,
        color: color, size: opt.size || rand(1, 2.4),
        grav: opt.grav == null ? 0 : opt.grav
      });
    }
  }
  function addText(x, y, str, color, size) {
    run.texts.push({ x: x, y: y, vy: -34, life: 0.7, max: 0.7, str: str, color: color || '#fff', size: size || 8 });
  }

  /* ------------------------------------------------------------------
     戰鬥
     ------------------------------------------------------------------ */
  function playerAtk(p) {
    var b = p.buffs.dmg > 0 ? 1.45 : 1;
    return p.atkMul * b;
  }

  function fireWeapon() {
    var p = run.player, w = p.weapon;
    if (p.fireCd > 0) return;

    if (w.melee) {
      p.fireCd = w.rate / ((p.buffs.rate > 0 ? 1.6 : 1) * (p.rateMul || 1));
      run.shots++;
    if (run.training) trainDone('shoot');
      run.swing = { t: 0, dur: 0.16, ang: p.aim, range: w.range, color: w.color };
      var hits = 0;
      for (var i = run.enemies.length - 1; i >= 0; i--) {
        var e = run.enemies[i];
        var d = dist(p, e);
        if (d > w.range + e.r) continue;
        var ang = Math.atan2(e.y - p.y, e.x - p.x);
        if (Math.abs(normAng(ang - p.aim)) <= w.arc / 2) {
          damageEnemy(e, w.dmg * playerAtk(p), ang, w.knock, w);
          hits++;
        }
      }
      if (w.splash) splashDamage(p.x + Math.cos(p.aim) * w.range * 0.7, p.y + Math.sin(p.aim) * w.range * 0.7, w.splash, w.dmg * 0.5, false);
      if (hits) SFX.hit();
      SFX.shoot('sword');
      return;
    }

    var cost = w.cost || 0;
    if (p.buffs.freeAmmo > 0) cost = 0;
    cost = Math.max(0, cost - ((p.talents && p.talents.energy) || 0));
    if (p.energy < cost) {
      if (p.dryCd <= 0) { SFX.dry(); p.dryCd = 0.45; }
      return;
    }
    p.energy -= cost;
    p.fireCd = w.rate / (p.buffs.rate > 0 ? 1.6 : 1);
    run.shots++;

    if (w.beam) { fireBeam(w); return; }

    SFX.shoot(w.sound || familyOf(w.shape) || 'pistol');
    var shots = w.burst || 1;
    shootOnce(p, w);
    if (shots > 1) p.burst = { w: w, left: shots - 1, timer: 0.07 };
  }

  /* 武器家族：決定槍口與彈道特效 */
  function familyOf(shape) {
    if (shape === 'cannon' || shape === 'launcher') return 'cannon';
    if (shape === 'pistol' || shape === 'smg' || shape === 'rifle' || shape === 'chaos') return 'gun';
    if (shape === 'bow' || shape === 'crossbow') return 'bow';
    if (shape === 'wand' || shape === 'staff' || shape === 'orb' || shape === 'scepter') return 'magic';
    return 'melee';
  }

  function shootOnce(p, w) {
    /* 究極核彈：5 秒警報倒數後從天而降，砸向場地正中央 */
    if (w.nuke) {
      if (run.nukeCall) { toast('核彈已經在來襲途中'); SFX.dry(); return; }
      run.nukeCall = { t: 5, x: RW / 2, y: RH / 2 };
      run.alarmT = 0;
      toast('⚠ 核彈呼叫！5 秒後落下');
      if (SFX.startSiren) SFX.startSiren();
      else if (SFX.alarm) SFX.alarm();
      run.cam.shake = Math.max(run.cam.shake, 3);
      return;
    }
    var T = p.talents || {};
    var n = (w.pellets || 1) + (T.multishot || 0);
    var critMul = 2 * (1 + 0.3 * (T.headshot || 0));
    var GS = p.atkStyle || null;
    var crit = Math.random() < (p.critPct + (p.buffs.crit > 0 ? 0.4 : 0) + (w.critBonus || 0) + (T.crit || 0) * 0.18);
    for (var k = 0; k < n; k++) {
      var ang = p.aim + rand(-w.spread, w.spread);
      spawnBullet({
        x: p.x + Math.cos(ang) * 9,
        y: p.y - 4 + Math.sin(ang) * 9,
        ang: ang,
        speed: w.speed,
        dmg: w.dmg * playerAtk(p) * (crit ? critMul : 1),
        life: w.life,
        r: w.r,
        pierce: (w.pierce || 0) + (T.pierce || 0) * 2 + (GS && GS.pierce ? GS.pierce : 0),
        knock: w.knock || 0,
        color: GS && GS.color ? GS.color : w.color,
        splash: (w.splash || 0) + (T.explode || 0) * 22 + (p.equipBlast ? 16 : 0) + (GS && GS.splash ? GS.splash : 0),
        friendly: true,
        kind: w.id,
        family: familyOf(w.shape),
        crit: crit,
        homing: (w.homing || 0) + (T.homing || 0) * 1.5 + (GS && GS.homing ? GS.homing : 0),
        bounce: (w.bounce || 0) + (T.bounce || 0),
        chain: (w.chain || 0) + (T.chain || 0) * 2,
        boomerang: !!w.boomerang || !!(T.boomerang),
        burn: (w.burn || 0) + (T.burn || 0) * 3,
        poison: (w.poison || 0) + (T.venom || 0) * 2,
        slow: (w.slow || 0) + (T.frostbite || 0) * 1.5,
        heal: w.heal || 0,
        nuke: !!w.nuke
      });
    }
    if (GS && GS.heal) {
      p.hp = Math.min(p.maxHp, p.hp + GS.heal * n * 0.25);
    }
    run.cam.shake = Math.max(run.cam.shake, w.splash > 40 ? 3 : 1.2);
    var fam = familyOf(w.shape);
    run.muzzles.push({
      x: p.x + Math.cos(p.aim) * 11,
      y: p.y - 4 + Math.sin(p.aim) * 11,
      ang: p.aim, family: fam, color: w.color, t: 0, max: fam === 'cannon' ? 0.2 : 0.12
    });
    if (run.muzzles.length > 26) run.muzzles.shift();
    /* 槍口火光 */
    var mzx = p.x + Math.cos(p.aim) * 11, mzy = p.y - 4 + Math.sin(p.aim) * 11;
    addParticles(mzx, mzy, fam === 'cannon' ? 6 : 3, w.color, { speed: fam === 'cannon' ? 150 : 100 });
    run.impacts.push({ x: mzx, y: mzy, t: 0.1, max: 0.1, r: fam === 'cannon' ? 9 : 6, color: w.color });
  }

  function fireBeam(w) {
    var p = run.player;
    var ang = p.aim;
    var maxLen = 620;
    var step = 6;
    var len = maxLen;
    for (var d = 0; d < maxLen; d += step) {
      var x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d;
      if (x < WALLT || x > RW - WALLT || y < WALLT || y > RH - WALLT || hitWalls(x, y, 1, run.walls)) {
        len = d;
        break;
      }
    }
    run.beams = run.beams || [];
    run.beams.push({ x: p.x, y: p.y - 4, ang: ang, len: len, t: 0.12, color: w.color });
    var ex = p.x + Math.cos(ang) * len, ey = p.y - 4 + Math.sin(ang) * len;
    for (var i = 0; i < run.enemies.length; i++) {
      var e = run.enemies[i];
      var dx = e.x - p.x, dy = e.y - (p.y - 4);
      var proj = dx * Math.cos(ang) + dy * Math.sin(ang);
      if (proj < 0 || proj > len) continue;
      var perp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang));
      if (perp < e.r + 7) damageEnemy(e, w.dmg * playerAtk(p), ang, 30, w);
    }
    addParticles(ex, ey, 8, w.color, { speed: 120 });
    run.cam.shake = Math.max(run.cam.shake, 3);
    SFX.shoot('laser');
  }

  function spawnBullet(o) {
    run.bullets.push({
      x: o.x, y: o.y,
      vx: Math.cos(o.ang) * o.speed,
      vy: Math.sin(o.ang) * o.speed,
      r: o.r, dmg: o.dmg, life: o.life, max: o.life,
      friendly: !!o.friendly, pierce: o.pierce || 0, hit: [],
      color: o.color, knock: o.knock || 0, splash: o.splash || 0,
      kind: o.kind || '', dead: false, crit: !!o.crit,
      homing: o.homing || 0, bounce: o.bounce || 0, chain: o.chain || 0,
      boomerang: !!o.boomerang, age: 0,
      burn: o.burn || 0, poison: o.poison || 0, slow: o.slow || 0, heal: o.heal || 0,
      isChild: !!o.isChild, nuke: !!o.nuke
    });
  }

  function enemyBullet(x, y, ang, speed, dmg, opt) {
    opt = opt || {};
    run.bullets.push({
      x: x, y: y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      r: opt.r || 2.6, dmg: dmg, life: opt.life || 2.4, max: opt.life || 2.4,
      friendly: false, pierce: 0, hit: [], color: opt.color || '#ff6b5e',
      knock: 0, splash: 0, kind: '', dead: false, crit: false,
      homing: opt.homing || 0, bounce: 0, chain: 0, boomerang: false, age: 0,
      burn: opt.burn || 0, poison: opt.poison || 0, slow: 0, heal: 0
    });
  }

  function applyStatus(e, w) {
    if (!w) return;
    if (w.burn) { e.burn = Math.max(e.burn, w.burn); e.burnDps = 6 + run.floor * 0.6; }
    if (w.poison) { e.poison = Math.max(e.poison, w.poison); e.poisonDps = 4 + run.floor * 0.5; }
    if (w.slow) e.slowT = Math.max(e.slowT, w.slow);
  }

  function damageEnemy(e, dmg, ang, knock, w) {
    if (e.dead) return;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    e.flash = 1;
    /* 命中特效：頓幀 + 衝擊環 */
    run.hitstop = Math.min(0.06, (run.hitstop || 0) + 0.006 + Math.min(0.02, dmg * 0.0004));
    /* 站在廢墟上的敵人受到額外傷害 */
    dmg = Math.round(dmg * ruinBonusAt(e.x, e.y));
    /* 元素融合：天賦與武器融合，額外附帶元素 */
    if (run.talents && run.talents.fusion) {
      if (run.talents.burn) applyStatus(e, { burn: 3 });
      else if (run.talents.venom) applyStatus(e, { poison: 2 });
      else if (run.talents.frostbite) e.slowT = Math.max(e.slowT || 0, 1.6);
    }
    if (!run.impacts) run.impacts = [];
    run.impacts.push({
      x: e.x, y: e.y - e.r * 0.4, t: 0.2, max: 0.2,
      r: 5 + Math.min(20, dmg * 0.14),
      color: (w && w.crit) ? '#ffe6a1' : '#ffffff'
    });
    addParticles(e.x, e.y, 4, (w && w.crit) ? '#ffe6a1' : '#ffffff', { speed: 220 });
    if (knock) {
      e.kx += Math.cos(ang) * knock * (e.boss ? 0.08 : 0.5);
      e.ky += Math.sin(ang) * knock * (e.boss ? 0.08 : 0.5);
    }
    applyStatus(e, w);
    var crit = w && w.crit;
    addText(e.x + rand(-4, 4), e.y - e.r - 4, dmg, crit ? '#ffd166' : '#ffffff', crit ? 10 : 8);
    addParticles(e.x, e.y, 3, '#ffd9a0', { speed: 90 });
    var pc = run.player;
    var ls = pc.lifestealPct + (pc.buffs.lifesteal > 0 ? 0.15 : 0);
    if (ls > 0) pc.hp = Math.min(pc.maxHp, pc.hp + dmg * ls);
    if (pc.ultLock <= 0 && pc.ultCharge < 100) pc.ultCharge = Math.min(100, pc.ultCharge + dmg * 0.07);
    /* 傳說／神話武器的特殊效果（以玩家目前武器為準；避免濺射遞迴） */
    var curW = (pc && pc.weapon) || w;
    if (curW && (curW.rarity || 0) >= 4 && !curW._noSpecial && specialDepth === 0) {
      specialDepth++;
      try { applyWeaponSpecial(e, curW, dmg); } catch (ex) {} finally { specialDepth--; }
    }
    SFX.hit();
    /* 已移除「攻擊敵人就自己扣血」的反彈；困難模式改由敵人主動攻擊時反傷 */
    if (e.hp <= 0) killEnemy(e);
  }

  /* 毒氣持續傷害（困難模式） */
  function updatePoison(dt) {
    var p = run && run.player;
    if (!p || !p.poisonT) return;
    p.poisonT -= dt;
    p.poisonTick = (p.poisonTick || 0) + dt;
    if (p.poisonTick >= 1) {
      p.poisonTick = 0;
      p.hp = Math.max(1, p.hp - 2);
      addText(p.x, p.y - 20, '-2', '#8be08b', 8);
    }
    if (p.poisonT < 0) p.poisonT = 0;
  }

  function splashDamage(x, y, radius, dmg, hurtsPlayer) {
    for (var i = run.enemies.length - 1; i >= 0; i--) {
      var e = run.enemies[i];
      if (e.dead) continue;
      var d = Math.hypot(e.x - x, e.y - y);
      if (d < radius + e.r) {
        damageEnemy(e, dmg * (1 - d / (radius + e.r)) * 0.9, Math.atan2(e.y - y, e.x - x), 80);
      }
    }
    if (hurtsPlayer) {
      var dp = Math.hypot(run.player.x - x, run.player.y - y);
      if (dp < radius) hurtPlayer(18);
    }
    addParticles(x, y, 12, '#ffb347', { speed: 200, grav: 40 });
    addParticles(x, y, 6, '#ffffff', { speed: 300 });
    if (!run.impacts) run.impacts = [];
    run.impacts.push({ x: x, y: y, t: 0.3, max: 0.3, r: radius * 0.9, color: '#ffb347' });
    if (run.booms) run.booms.push({ x: x, y: y, t: 0, max: 0.38, scale: clamp(radius / 42, 0.9, 2.8) });
    run.cam.shake = Math.max(run.cam.shake, 4);
    SFX.boom();
  }

  /* =====================================================================
     首領死亡演出 + 掉落系統
     ===================================================================== */
  function spawnBossLoot(boss) {
    if (!run) return;
    run.bossDeath = run.bossDeath || [];
    run.bossDeath.push({ x: boss.x, y: boss.y, t: 0, max: 2.4, pal: boss.pal || {}, kind: boss.bossId || 'warden' });

    /* 掉落 2~4 件武器，稀有度依樓層深度提升 */
    var ci = chapterIndex(run.floor);
    var count = 2 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0);
    run.dropFx = run.dropFx || [];
    for (var i = 0; i < count; i++) {
      var roll = Math.random() + ci * 0.05;
      var rarity = roll > 0.94 ? 5 : (roll > 0.74 ? 4 : (roll > 0.4 ? 3 : 2));
      var pool = D.weaponsOfTier(rarity);
      var wid = pool.length ? pick(pool) : 'pistol';
      var ang = -Math.PI / 2 + (i - (count - 1) / 2) * 0.55;
      /* 先入局內背包，動畫只是演出（不帶出地牢） */
      if (!run.bag) run.bag = [];
      run.bag.push({ id: wid, rarity: rarity, uid: 'b' + Date.now().toString(36) + '_' + i });
      run.dropFx.push({
        x: boss.x, y: boss.y - 6,
        vx: Math.cos(ang) * (110 + Math.random() * 60),
        vy: Math.sin(ang) * (150 + Math.random() * 60) - 60,
        t: 0, max: 1.15 + i * 0.08,
        weapon: wid, rarity: rarity, landed: false, spin: Math.random() * Math.PI
      });
    }
  }

  /* 掉落動畫結束 → 放進背包 */
  function landDrop(d) {
    var w = WEAPONS[d.weapon];
    var rar = RARITY[d.rarity] || RARITY[0];
    addText(d.x, d.y - 18, (w ? w.name : d.weapon) + ' 入袋', rar.color, 9);
    if (d.rarity >= 4) {
      run.flash = Math.max(run.flash, 0.35);
      run.cam.shake = Math.max(run.cam.shake, 6);
      if (SFX.win) SFX.win();
      banner(rar.name + '級武器！', (w ? w.name : '') + ' 已放入背包');
    } else if (SFX.coin) {
      SFX.coin();
    }
  }

  function updateBossDeath(dt) {
    if (!run) return;
    if (run.dropFx) {
      for (var i = run.dropFx.length - 1; i >= 0; i--) {
        var d = run.dropFx[i];
        d.t += dt;
        d.vy += 320 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.spin += dt * 6;
        if (!d.landed && (d.t >= d.max || d.y > RH - WALLT - 20)) {
          d.landed = true;
          d.vx = 0; d.vy = 0;
          landDrop(d);
          d.t = 0;
          d.max = 3.6;
          d.pickup = true;
        }
        if (d.pickup && d.t > d.max) run.dropFx.splice(i, 1);
      }
    }
    if (run.bossDeath) {
      for (var b = run.bossDeath.length - 1; b >= 0; b--) {
        run.bossDeath[b].t += dt;
        if (run.bossDeath[b].t > run.bossDeath[b].max) run.bossDeath.splice(b, 1);
      }
    }
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    run.kills++;
    run.player.ultCharge = Math.min(100, run.player.ultCharge + (run.player.ultLock > 0 ? 0 : 12));
    addParticles(e.x, e.y, e.boss ? 60 : 10, e.boss ? '#ff8a5c' : '#e2574c', { speed: e.boss ? 260 : 140 });
    SFX.kill();
    if (e.boss) {
      run.cam.shake = 10;
      SFX.boom();
      for (var i = 0; i < 30; i++) addPickup(e.x + rand(-50, 50), e.y + rand(-40, 40), 'coin', 2);
      run.bossDefeated = true;
      /* 首領死亡演出 + 直接掉落（不再給獎勵寶箱） */
      spawnBossLoot(e);
      /* 隱藏試煉：連續 5 名首領 */
      if (run.rush) {
        run.rush.index++;
        run.rush.left--;
        if (run.rush.left > 0) {
          run.keys.bronze = (run.keys.bronze || 0) + 1;
          run.player.hp = Math.min(run.player.maxHp, run.player.hp + run.player.maxHp * 0.18);
          run.enemies = run.enemies.filter(function (en) { return !en.dead; });
          /* 3 秒首領降生動畫，之後才出現下一個首領 */
          run.rushWait = 3;
          run.rush.index++;
          run.rush.left--;
          banner('隱藏試煉 ' + run.rush.index + ' / 5', '首領降生中…');
          SFX.roar();
          return;
        }
        run.rush = null;
        run.coins += 400;
        run.keys.bronze = (run.keys.bronze || 0) + 6;
        run.keys.gold = (run.keys.gold || 0) + 1;
        if (!save.forgedWeapons) save.forgedWeapons = [];
        var mid = pick(D.weaponsOfTier(5));
        if (mid) {
          save.forgedWeapons.push({ id: mid, rarity: 5, uid: 'f' + Date.now().toString(36) });
          save.loadout = mid;
        }
        writeSave();
        toast('隱藏試煉完成：' + (mid ? WEAPONS[mid].name : '神話武器') + ' 入手');
        banner('試煉完成', '神話武器入手');
        nextFloor();
        return;
      }
      run.keys.bronze = (run.keys.bronze || 0) + 2 + Math.min(4, chapterIndex(run.floor));
      if (chapterIndex(run.floor) >= 1) run.keys.silver = (run.keys.silver || 0) + 1;
      if (chapterIndex(run.floor) >= 3) run.keys.gold = (run.keys.gold || 0) + 1;
      /* 首領有極低機率（約 0.03%）掉粉紅鎖匙，和神話武器同級 */
      if (Math.random() < 0.0003) {
        run.keys.pink = (run.keys.pink || 0) + 1;
        addText(e.x, e.y - 20, '粉紅鎖匙', '#ff3bd4', 10);
      }
      /* 不立即彈出結算：先讓死亡與掉落動畫播完，再開特殊傳送門 */
      run.bossExitPending = 2.6;
      run.portal = null;
      run.chest = null;
      return;
    }
    /* 鑰匙掉落：不同種類掉落率不同 */
    var ktDrop = rollKeyType();
    if (ktDrop) addPickup(e.x, e.y, 'key', 1, ktDrop);
    if (run.player.keyFind > 0 && Math.random() < run.player.keyFind) {
      addPickup(e.x, e.y, 'key', 1, 'bronze');
    }
    /* 天賦：擊殺觸發 */
    if (run.player.talents) {
      var TLk = run.player.talents;
      if (TLk.bloodlust) run.player.hp = Math.min(run.player.maxHp, run.player.hp + 3 * TLk.bloodlust);
      if (TLk.chainblast) areaDamage(e.x, e.y, 62, 16 * TLk.chainblast, 120, '#ffb347');
      if (TLk.combo) {
        run.player.comboStacks = Math.min(5, (run.player.comboStacks || 0) + 1);
        run.player.comboT = 4;
        recalcStats(run.player);
      }
    }

    /* 裝備特殊效果：擊殺觸發 */
    var pl = run.player;
    if (run.heroTalent === 'knight') pl.shieldT = Math.max(pl.shieldT || 0, 1.5);
    else if (run.heroTalent === 'assassin') { pl.buffs.spd = 2; pl.buffs.crit = 2; }
    else if (run.heroTalent === 'necromancer') pl.hp = Math.min(pl.maxHp, pl.hp + 5);
    /* 焦土天賦：擊殺留下廢墟 */
    if (run.talents && run.talents.ruin) addRuin(e.x, e.y, 26);
    if (pl.killHeal) pl.hp = Math.min(pl.maxHp, pl.hp + pl.killHeal);
    if (pl.abyssalGear) {
      pl.abyssalStacks = Math.min(5, (pl.abyssalStacks || 0) + 1);
      recalcStats(pl);
    }

    var coins = Math.round(e.coin * run.player.coinMul);
    /* 分裂型：死亡時炸成兩隻小的 */
    if (e.behavior === 'split' && !e.noSplit && e.sp) {
      for (var s = 0; s < 2; s++) {
        var child = addEnemy(e.sp, e.x + rand(-16, 16), e.y + rand(-16, 16));
        child.hp = child.maxHp = Math.max(6, e.maxHp * 0.3);
        child.r *= 0.7;
        child.spd *= 1.15;
        child.noSplit = true;
        child.behavior = 'chase';
        addParticles(child.x, child.y, 6, e.pal.accent, { speed: 120 });
      }
    }
    for (var c = 0; c < coins; c++) addPickup(e.x + rand(-6, 6), e.y + rand(-6, 6), 'coin', 1);
    /* 普通敵人有機率掉落武器（等級越高越少見） */
    var dChance = 0.015 + (run.player.luckPct || 0) * 0.2 + Math.min(0.015, run.floor * 0.0003);
    if (Math.random() < dChance) {
      var dr = Math.random() + (run.player.luckPct || 0) * 0.6 + Math.min(0.1, run.floor * 0.0035);
      /* 傳說 0.08%、神話 0.02%（粉紅寶箱才是穩定來源） */
      var drRar = dr > 0.9999 ? 5 : (dr > 0.999 ? 4 : (dr > 0.99 ? 3 : 2));
      var dPool = D.weaponsOfTier(drRar);
      var dWid = dPool.length ? pick(dPool) : 'pistol';
      if (!run.bag) run.bag = [];
      if (run.bag.length >= BAG_CAP) {
        addText(e.x, e.y - 14, '背包已滿', '#ff8a8a', 8);
      } else {
        run.bag.push({ id: dWid, rarity: drRar, uid: 'd' + Date.now().toString(36) + Math.floor(Math.random() * 999) });
        if (!run.dropFx) run.dropFx = [];
        run.dropFx.push({
          x: e.x, y: e.y, vx: rand(-60, 60), vy: -160, t: 0, max: 0.9,
          weapon: dWid, rarity: drRar, landed: false, spin: Math.random() * Math.PI
        });
        var drName = RARITY[drRar] ? RARITY[drRar].name : '';
        addText(e.x, e.y - 14, drName + ' 武器入袋', (RARITY[drRar] || RARITY[0]).color, 8);
      }
    }
    if (Math.random() < 0.10) addPickup(e.x, e.y, 'heart', 1);
    if (Math.random() < 0.16) addPickup(e.x, e.y, 'energy', 1);
  }

  function hurtPlayer(dmg) {
    var p = run.player;
    if (mode !== 'play' || p.invuln > 0) return;
    /* 虛空符印：10% 完全閃避 */
    if (p.voidwalk && Math.random() < 0.1) {
      addText(p.x, p.y - 18, '閃避', '#8cf0ff', 9);
      p.invuln = 0.35;
      SFX.dry();
      return;
    }
    /* 永恆之心：致命傷時滿血復活（每局一次） */
    if (p.eternal && !p.eternalUsed && p.hp - dmg <= 0) {
      p.eternalUsed = true;
      p.hp = p.maxHp;
      p.invuln = 2.2;
      banner('永恆之心', '致命傷被逆轉，生命全滿');
      addParticles(p.x, p.y, 40, '#ffe6a1', { speed: 240 });
      run.cam.shake = Math.max(run.cam.shake, 10);
      SFX.win();
      return;
    }
    var real = dmg * (1 - p.dmgReduce) * (p.buffs.dmg > 0 && p.buffs.rage ? 0.7 : 1);
    p.hp = Math.max(0, p.hp - real);
    /* 困難模式：敵人打我們時才反傷（玩家自己攻擊不會扣血） */
    if (run.diff && run.diff.reflect && run.diff.reflect > 0 && run.player.invuln <= 0) {
      var src = null;
      for (var ri = 0; ri < run.enemies.length; ri++) {
        var er = run.enemies[ri];
        if (!er.dead && Math.hypot(er.x - run.player.x, er.y - run.player.y) < 46) { src = er; break; }
      }
      if (src) {
        var back = real * run.diff.reflect;
        if (back >= 1) {
          src.hp -= back;
          addText(src.x, src.y - 22, '-' + Math.round(back), '#8cf0ff', 8);
          if (src.hp <= 0) killEnemy(src);
        }
      }
    }
    p.invuln = 0.75;
    p.hurtFlash = 0.32;
    if (p.talents && p.talents.thorns) areaDamage(p.x, p.y, 78, 22 * p.talents.thorns, 140, '#c7f08a');
    if (p.talents && p.talents.reflective) areaDamage(p.x, p.y, 84, 14 * p.talents.reflective, 120, '#bff3ff');
    if (p.equipThorns) areaDamage(p.x, p.y, 70, p.equipThorns, 100, '#c7f08a');
    run.cam.shake = Math.max(run.cam.shake, 5);
    addParticles(p.x, p.y, 8, '#ff6b5e', { speed: 130 });
    addText(p.x, p.y - 16, '-' + Math.round(real), '#ff6b5e', 9);
    /* 困難模式：敵人攻擊附帶毒氣 */
    if (run.diff && run.diff.poison && Math.random() < 0.45) {
      p.poisonT = Math.max(p.poisonT || 0, 3);
      addText(p.x, p.y - 26, '中毒', '#8be08b', 9);
    }
    SFX.hurt();
    if (p.hp <= 0) {
      /* 永恆庇佑：致命傷保留 1 點生命（每輪一次） */
      if (p.eternal && !p.eternalUsed) {
        p.eternalUsed = true;
        p.hp = 1;
        p.invuln = 2.0;
        run.flash = 0.4;
        run.cam.shake = 10;
        toast('永恆庇佑：保留 1 點生命！');
        SFX.level();
        return;
      }
      p.hp = 0;
      if (run.rewind > 0) doRewind();
      else endRun();
    }
    /* 虛空步：受傷時周圍敵人減速 */
    if (p.voidwalk) {
      for (var vi = 0; vi < run.enemies.length; vi++) {
        var ve = run.enemies[vi];
        if (!ve.dead && Math.hypot(ve.x - p.x, ve.y - p.y) < 150) ve.slowT = Math.max(ve.slowT, 1.5);
      }
      addParticles(p.x, p.y, 12, '#b07cf0', { speed: 140 });
    }
  }

  /* ---------------- 回聲倒帶（本作獨有）：死亡時倒退 3 秒 ---------------- */
  function pushSnapshot() {
    if (!run) return;
    var p = run.player;
    run.snapshots.push({
      p: { x: p.x, y: p.y, hp: p.hp, energy: p.energy, ult: p.ultCharge },
      e: run.enemies.map(function (en) {
        return { ref: en, x: en.x, y: en.y, hp: en.hp, dead: en.dead };
      })
    });
    if (run.snapshots.length > 8) run.snapshots.shift();
  }

  function doRewind() {
    if (!run || !run.snapshots.length) { endRun(); return; }
    run.rewindPending = run.snapshots.pop();
    run.rewindAnim = 1.0;        /* 巨大時鐘倒退 1 秒，之後才回到 3 秒前 */
    run.player.hp = 1;
    run.player.invuln = 2.2;
    run.rewind--;
    run.flash = 0;
    run.bullets = [];
    SFX.skill();
  }

  function applyRewind() {
    var s = run.rewindPending;
    run.rewindPending = null;
    if (!s) return;
    var p = run.player;
    p.x = s.p.x; p.y = s.p.y;
    p.hp = Math.max(1, Math.round(s.p.hp > 0 ? s.p.hp : p.maxHp * 0.4));
    p.energy = s.p.energy;
    p.ultCharge = s.p.ult;
    p.invuln = 1.3;
    p.hurtFlash = 0;
    s.e.forEach(function (rec) {
      if (!rec || !rec.ref) return;
      rec.ref.x = rec.x; rec.ref.y = rec.y;
      rec.ref.hp = rec.hp; rec.ref.dead = rec.dead;
    });
    run.bullets = [];
    run.impacts = [];
    run.nukesIn = [];
    run.flash = 0.4;
    run.cam.shake = 8;
    run.snapshots = [];
    toast('回聲倒帶：回到 3 秒前');
    SFX.level();
  }

  function addPickup(x, y, type, val, keyType) {
    run.pickups.push({
      x: x, y: y, vx: rand(-40, 40), vy: rand(-40, 40),
      type: type, val: val || 1, keyType: keyType || 'bronze', t: rand(0, 6), dead: false
    });
  }

  /* ---------------- 技能 ---------------- */
  /* 技能／大招共用的施放演出：彩色擴散環 + 粒子 + 鏡頭震動 + 短暫閃光 */
  function castFx(color, radius) {
    if (!run) return;
    var p = run.player;
    var col = color || (p && p.hero && p.hero.palette && p.hero.palette.c) || '#ffffff';
    for (var i = 0; i < 3; i++) {
      run.impacts.push({
        x: p.x, y: p.y, t: 0.34 + i * 0.12, max: 0.34 + i * 0.12,
        r: (radius || 90) * (0.65 + i * 0.45), color: col
      });
    }
    addParticles(p.x, p.y, 30, col, { speed: 280 });
    run.cam.shake = Math.max(run.cam.shake, 5);
    run.flash = Math.max(run.flash, 0.14);
  }

  function useSkill() {
    if (run && run.training) trainDone('skill');
    var p = run.player;
    if (p.skillCd > 0) return;
    var sk = p.hero.skill;
    p.skillCd = sk.cd * 0.65 * ((run.heroTalent === 'mage') ? 0.75 : 1);
    SFX.skill();
    run.cam.shake = Math.max(run.cam.shake, 3);
    castFx(p.hero.palette.c, 95);

    switch (sk.kind) {
      case 'meteorcall': {
        /* 隕星呼喚：前方連續 4 顆隕石 */
        for (var mi = 0; mi < 4; mi++) {
          (function (m) {
            ultDelay(0.12 + m * 0.14, function () {
              var a2 = p.aim + (m - 1.5) * 0.22;
              var tx2 = clamp(p.x + Math.cos(a2) * (90 + m * 34), WALLT + 20, RW - WALLT - 20);
              var ty2 = clamp(p.y + Math.sin(a2) * (90 + m * 34), WALLT + 20, RH - WALLT - 20);
              splashDamage(tx2, ty2, 58, 52 * playerAtk(p), false);
              run.impacts.push({ x: tx2, y: ty2, t: 0.3, max: 0.3, r: 46, color: '#ffd166' });
            });
          })(mi);
        }
        break;
      }
      case 'timeslow':
        for (var ti = 0; ti < run.enemies.length; ti++) {
          var te = run.enemies[ti];
          if (!te.dead) te.rootT = Math.max(te.rootT, 3);
        }
        run.impacts.push({ x: p.x, y: p.y, t: 0.5, max: 0.5, r: 150, color: '#a8fff0' });
        addParticles(p.x, p.y, 26, '#a8fff0', { speed: 220 });
        break;
      case 'breath': {
        /* 龍息：扇形烈焰 */
        for (var bi = 0; bi < 9; bi++) {
          var ba = p.aim + (bi - 4) * 0.11;
          spawnBullet({
            x: p.x, y: p.y - 4, ang: ba, speed: 300 + bi * 12, dmg: 22 * playerAtk(p),
            life: 0.55, r: 4.2, color: '#ff7a3c', friendly: true, pierce: 3, burn: 3, knock: 40
          });
        }
        addParticles(p.x + Math.cos(p.aim) * 20, p.y - 4 + Math.sin(p.aim) * 20, 24, '#ffb347', { speed: 220 });
        break;
      }
      case 'shield':
        p.shieldT = 2.4; p.invuln = Math.max(p.invuln, 2.4);
        addParticles(p.x, p.y, 18, '#ffe6a1', { speed: 150 });
        break;
      case 'nova':
        areaDamage(p.x, p.y, 118, 44, 240, '#c9a6ff');
        break;
      case 'dash':
        p.dashT = 0.26; p.dashA = p.aim; p.buffs.rate = 3;
        addParticles(p.x, p.y, 16, '#57e0a8', { speed: 170 });
        break;
      case 'holy':
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3);
        areaDamage(p.x, p.y, 130, 55, 200, '#ffe6a1');
        addParticles(p.x, p.y, 30, '#ffe6a1', { speed: 200 });
        break;
      case 'blink': {
        var tx = clamp(p.x + Math.cos(p.aim) * 130, WALLT + 10, RW - WALLT - 10);
        var ty = clamp(p.y + Math.sin(p.aim) * 130, WALLT + 10, RH - WALLT - 10);
        if (!hitWalls(tx, ty, p.r + 2, run.walls)) { p.x = tx; p.y = ty; }
        p.buffs.crit = 3; p.invuln = Math.max(p.invuln, 0.5);
        addParticles(p.x, p.y, 20, '#b07cf0', { speed: 190 });
        break;
      }
      case 'rockets':
        for (var i = 0; i < 5; i++) {
          spawnBullet({
            x: p.x, y: p.y - 4, ang: p.aim + (i - 2) * 0.22, speed: 260, dmg: 34 * playerAtk(p),
            life: 1.6, r: 3.6, color: '#ff9a5c', friendly: true, splash: 34, homing: 3.2, knock: 60
          });
        }
        break;
      case 'wave': {
        var hits = 0;
        for (var j = 0; j < run.enemies.length; j++) {
          var e = run.enemies[j];
          var d = dist(p, e);
          if (d > 150) continue;
          var a = Math.atan2(e.y - p.y, e.x - p.x);
          if (Math.abs(normAng(a - p.aim)) < 0.85) {
            damageEnemy(e, 70 * playerAtk(p), a, 260);
            hits++;
          }
        }
        addParticles(p.x + Math.cos(p.aim) * 40, p.y + Math.sin(p.aim) * 40, 24, '#ffd98a', { speed: 220 });
        run.cam.shake = Math.max(run.cam.shake, 5);
        break;
      }
      case 'drain': {
        var healed = 0;
        for (var k = run.enemies.length - 1; k >= 0; k--) {
          var en = run.enemies[k];
          if (dist(p, en) < 155) {
            damageEnemy(en, 44 * playerAtk(p), Math.atan2(p.y - en.y, p.x - en.x), 40);
            healed += 8;
          }
        }
        p.hp = Math.min(p.maxHp, p.hp + healed);
        addParticles(p.x, p.y, 30, '#8be08b', { speed: 180 });
        break;
      }
      case 'rage':
        p.buffs.dmg = 6; p.buffs.spd = 6; p.buffs.rage = 6;
        addParticles(p.x, p.y, 24, '#ff7a3c', { speed: 200 });
        break;
      case 'cloud':
        run.clouds.push({
          x: p.x + Math.cos(p.aim) * 70, y: p.y + Math.sin(p.aim) * 70,
          r: 70, life: 5, max: 5, dps: 16, color: '#a8e05a', poison: true
        });
        break;
      case 'roots': {
        for (var m = 0; m < run.enemies.length; m++) {
          var en2 = run.enemies[m];
          if (dist(p, en2) < 170) {
            en2.rootT = 2.5;
            damageEnemy(en2, 20 * playerAtk(p), 0, 0);
          }
        }
        addParticles(p.x, p.y, 26, '#c7f08a', { speed: 210 });
        break;
      }
      case 'slash':
        run.slashes = run.slashes || [];
        run.slashes.push({ x: p.x, y: p.y - 4, ang: p.aim, len: 280, t: 0.2 });
        for (var q = 0; q < run.enemies.length; q++) {
          var en3 = run.enemies[q];
          var dx = en3.x - p.x, dy = en3.y - (p.y - 4);
          var proj = dx * Math.cos(p.aim) + dy * Math.sin(p.aim);
          if (proj < 0 || proj > 280) continue;
          var perp = Math.abs(-dx * Math.sin(p.aim) + dy * Math.cos(p.aim));
          if (perp < 26) damageEnemy(en3, 95 * playerAtk(p), p.aim, 120);
        }
        run.cam.shake = Math.max(run.cam.shake, 6);
        break;
      case 'bulletstorm':
        for (var b = 0; b < 18; b++) {
          spawnBullet({
            x: p.x, y: p.y - 4, ang: b / 18 * TAU, speed: 320, dmg: 14 * playerAtk(p),
            life: 0.9, r: 2.2, color: '#ffd166', friendly: true, knock: 30
          });
        }
        break;
    }
  }

  /* ---------------- 終極大招 ---------------- */
  function useUlt() {
    if (run && run.training) trainDone('ult');
    if (!run || mode !== 'play') return;
    var p = run.player;
    if (p.ultCharge < 100) { toast('大招尚未充能'); SFX.dry(); return; }
    if (p.ultCd > 0) { toast('大招冷卻中 ' + p.ultCd.toFixed(1) + ' 秒'); SFX.dry(); return; }
    var u = ULT[p.hero.id];
    if (!u) return;
    p.ultCharge = 0;
    p.ultReady = false;
    p.ultCd = (D.ULT_CD && D.ULT_CD[p.hero.id]) || 12;
    p.ultLock = 1.4;
    SFX.skill();
    SFX.roar();
    run.cam.shake = Math.max(run.cam.shake, 11);
    castFx(p.hero.palette.c, 130);
    addParticles(p.x, p.y, 46, '#ffe6a1', { speed: 300 });
    run.parts.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.6, max: 0.6, color: '#ffe6a1', size: 0, grav: 0, ring: 170 });
    castUlt(u.kind, p);
    if (u.kind !== 'swordfall') {
      run.ultFx.push({ kind: u.kind, t: 0, max: 1.15, x: p.x, y: p.y, ang: p.aim, color: p.hero.palette.c });
    }
    banner(u.name, '終極大招');
    SFX.level();
  }

  /* 大招出傷延遲：視覺落地瞬間才結算 */
  function ultDelay(delay, fn) {
    if (run) run.ultQueue.push({ t: delay, fn: fn });
  }

  function castUlt(kind, p) {
    var i, e;
    var atkM = playerAtk(p);
    switch (kind) {
      case 'starfall': {
        for (var sf = 0; sf < 8; sf++) {
          (function (n) {
            ultDelay(0.1 + n * 0.09, function () {
              var sx2 = WALLT + 40 + Math.random() * (RW - WALLT * 2 - 80);
              var sy2 = WALLT + 40 + Math.random() * (RH - WALLT * 2 - 80);
              splashDamage(sx2, sy2, 70, 120 * atkM, false);
            });
          })(sf);
        }
        run.cam.shake = 16;
        break;
      }
      case 'temporal':
        for (var tp = 0; tp < run.enemies.length; tp++) {
          var tpe = run.enemies[tp];
          if (!tpe.dead) tpe.rootT = Math.max(tpe.rootT, 4);
        }
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35);
        run.flash = 0.35;
        addParticles(p.x, p.y, 40, '#a8fff0', { speed: 260 });
        break;
      case 'dragonform':
        p.buffs.dmg = 8; p.buffs.spd = 8;
        for (var df = 0; df < 14; df++) {
          var dfa = p.aim + (df - 7) * 0.09;
          spawnBullet({
            x: p.x, y: p.y - 4, ang: dfa, speed: 340, dmg: 30 * atkM,
            life: 0.7, r: 5, color: '#ff7a3c', friendly: true, pierce: 4, burn: 4, knock: 60
          });
        }
        addParticles(p.x, p.y, 50, '#ffb347', { speed: 300 });
        break;
      case 'swordfall': {
        var sx = p.x + Math.cos(p.aim) * 60;
        var sy = p.y + Math.sin(p.aim) * 60;
        var gx = clamp(sx, WALLT + 50, RW - WALLT - 50);
        var gy = clamp(sy, WALLT + 50, RH - WALLT - 50);
        run.ultSword = { x: gx, y: gy, t: 0, max: 1.05, dmg: 220 };
        /* 劍尖插入大地的一瞬間才出傷 */
        ultDelay(0.62, function () {
          for (var i2 = run.enemies.length - 1; i2 >= 0; i2--) {
            var e2 = run.enemies[i2];
            damageEnemy(e2, 220 * atkM, Math.atan2(e2.y - p.y, e2.x - p.x), 260);
          }
          for (var sq = 0; sq < 4; sq++) {
            run.impacts.push({
              x: gx, y: gy, t: 0.45 + sq * 0.14, max: 0.45 + sq * 0.14,
              r: 110 + sq * 60, color: '#ffe6a1'
            });
          }
          addParticles(gx, gy, 40, '#ffe6a1', { speed: 320 });
          run.cam.shake = 20;
        });
        break;
      }
      case 'smite':
        for (i = run.enemies.length - 1; i >= 0; i--) {
          e = run.enemies[i];
          run.beams.push({ x: e.x, y: e.y - 46, ang: Math.PI / 2, len: 64, t: 0.25, color: '#ffe6a1' });
        }
        ultDelay(0.25, function () {
          for (var i3 = run.enemies.length - 1; i3 >= 0; i3--) {
            damageEnemy(run.enemies[i3], 150 * atkM, 0, 120);
          }
          run.cam.shake = 14;
        });
        break;
      case 'meteor': {
        var txs = [], tys = [];
        for (var k = 0; k < 3; k++) {
          var ang = p.aim + (k - 1) * 0.4;
          txs.push(p.x + Math.cos(ang) * (115 + k * 45));
          tys.push(p.y + Math.sin(ang) * (115 + k * 45));
        }
        for (var m = 0; m < 3; m++) {
          (function (tx, ty) {
            ultDelay(0.3 + m * 0.18, function () {
              splashDamage(tx, ty, 68, 95 * atkM, false);
            });
          })(txs[m], tys[m]);
        }
        break;
      }
      case 'arrowrain':
        p.buffs.rate = 4; p.buffs.autoFire = 4;
        break;
      case 'bastion':
        p.shieldT = 5; p.invuln = Math.max(p.invuln, 5);
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
        addParticles(p.x, p.y, 30, '#ffe6a1', { speed: 200 });
        break;
      case 'mark': {
        var mx = clamp(p.x + Math.cos(p.aim) * 150, WALLT + 12, RW - WALLT - 12);
        var my = clamp(p.y + Math.sin(p.aim) * 150, WALLT + 12, RH - WALLT - 12);
        if (!hitWalls(mx, my, p.r + 2, run.walls)) { p.x = mx; p.y = my; }
        ultDelay(0.16, function () {
          areaDamage(p.x, p.y, 125, 120, 220, '#b07cf0');
        });
        p.buffs.crit = 3;
        break;
      }
      case 'orbital': {
        var snap = run.enemies.slice(0, 8);
        for (i = 0; i < snap.length; i++) {
          e = snap[i];
          if (!e || e.dead) continue;
          run.beams.push({ x: e.x, y: WALLT, ang: Math.PI / 2, len: e.y - WALLT, t: 0.3, color: '#8cf0ff' });
        }
        ultDelay(0.3, function () {
          var sn = run.enemies.slice(0, 8);
          for (var o = 0; o < sn.length; o++) {
            if (sn[o] && !sn[o].dead) damageEnemy(sn[o], 130 * atkM, 0, 60);
          }
          run.cam.shake = 12;
        });
        break;
      }
      case 'shockwave':
        ultDelay(0.28, function () {
          for (var w = run.enemies.length - 1; w >= 0; w--) {
            var ew = run.enemies[w];
            var aa = Math.atan2(ew.y - p.y, ew.x - p.x);
            ew.kx += Math.cos(aa) * 420;
            ew.ky += Math.sin(aa) * 420;
            damageEnemy(ew, 95 * atkM, aa, 0);
          }
          run.cam.shake = 13;
        });
        break;
      case 'legion':
        for (i = 0; i < 24; i++) {
          spawnBullet({
            x: p.x, y: p.y - 4, ang: i / 24 * TAU, speed: 190, dmg: 26 * atkM,
            life: 2.2, r: 3, color: '#8be08b', friendly: true, homing: 4.5, pierce: 1, knock: 30
          });
        }
        break;
      case 'bloodrage':
        p.buffs.dmg = 10; p.buffs.spd = 10; p.buffs.lifesteal = 10;
        addParticles(p.x, p.y, 30, '#ff7a3c', { speed: 240 });
        break;
      case 'philosopher':
        run.clouds.push({ x: p.x, y: p.y, r: 120, life: 6, max: 6, dps: 22, color: '#a8e05a', poison: true });
        ultDelay(0.3, function () {
          for (var ph = run.enemies.length - 1; ph >= 0; ph--) {
            var ep = run.enemies[ph];
            ep.poison = Math.max(ep.poison, 6);
            ep.poisonDps = 18;
            damageEnemy(ep, 30 * atkM, 0, 0);
          }
        });
        break;
      case 'forest':
        ultDelay(0.25, function () {
          for (var fo = run.enemies.length - 1; fo >= 0; fo--) {
            var ef = run.enemies[fo];
            ef.rootT = 4;
            damageEnemy(ef, 85 * atkM, 0, 0);
          }
        });
        addParticles(p.x, p.y, 40, '#c7f08a', { speed: 280 });
        break;
      case 'iai': {
        var angles = [p.aim, p.aim + 2.1, p.aim - 2.1];
        for (var s = 0; s < angles.length; s++) {
          run.slashes.push({ x: p.x, y: p.y - 4, ang: angles[s], len: 320, t: 0.28 });
        }
        ultDelay(0.1, function () {
          for (var ss = 0; ss < angles.length; ss++) {
            var a2b = angles[ss];
            for (var i4 = run.enemies.length - 1; i4 >= 0; i4--) {
              var e4 = run.enemies[i4];
              var dx = e4.x - p.x, dy = e4.y - (p.y - 4);
              var proj = dx * Math.cos(a2b) + dy * Math.sin(a2b);
              if (proj < 0 || proj > 320) continue;
              var perp = Math.abs(-dx * Math.sin(a2b) + dy * Math.cos(a2b));
              if (perp < 30) damageEnemy(e4, 110 * atkM, a2b, 160);
            }
          }
          run.cam.shake = 12;
        });
        break;
      }
      case 'waltz':
        for (var wave = 0; wave < 2; wave++) {
          for (i = 0; i < 24; i++) {
            spawnBullet({
              x: p.x, y: p.y - 4, ang: i / 24 * TAU + wave * 0.13, speed: 330,
              dmg: 18 * atkM, life: 1.1, r: 2.2, color: '#ffd166', friendly: true, knock: 40
            });
          }
        }
        p.buffs.freeAmmo = 3;
        break;
    }
  }

  /* 核彈：究極武器的最終審判 */
  function nukeExplosion(x, y) {
    if (!run) return;
    run.flash = 1.0;
    run.cam.shake = 44;
    /* 核彈把戰場夷為廢墟 */
    addRuin(x, y, 120);
    for (var rb = 0; rb < 10; rb++) {
      addRuin(x + rand(-110, 110), y + rand(-70, 70), 22 + Math.random() * 26);
    }
    var p = run.player;
    for (var i = run.enemies.length - 1; i >= 0; i--) {
      var e = run.enemies[i];
      /* 核彈：全場任何生物直接秒殺 */
      if (Math.hypot(e.x - x, e.y - y) < 999) {
        damageEnemy(e, 999999, Math.atan2(e.y - y, e.x - x), 380);
      }
    }
    /* 秒殺後立刻判定房間淨空（避免在寶箱/結算畫面時漏掉） */
    checkCleared();
    /* 多層巨大爆炸貼圖 */
    for (var b = 0; b < 4; b++) {
      run.booms.push({ x: x + rand(-26, 26), y: y + rand(-18, 18), t: 0, max: 0.5 + b * 0.16, scale: 4.2 - b * 0.7 });
    }
    /* 七重衝擊波 */
    for (var r = 0; r < 7; r++) {
      run.impacts.push({ x: x, y: y, t: 0.45 + r * 0.15, max: 0.45 + r * 0.15, r: 80 + r * 68, color: '#ffe6a1' });
    }
    /* 衝擊波本體：碰到即死（不論數值），持續 1.2 秒 */
    if (!run.nukeWaves) run.nukeWaves = [];
    run.nukeWaves.push({ x: x, y: y, t: 0, max: 1.2, maxR: 620 });
    /* 蕈狀雲：主菇 + 副菇，多層菇傘會一層層堆上去 */
    run.nukes.push({ x: x, y: y, t: 0, max: 3.4, smoke: false, h: 1.0 });
    run.nukes.push({ x: x + 40, y: y + 12, t: 0, max: 2.6, smoke: false, h: 0.62 });
    run.nukes.push({ x: x - 44, y: y + 16, t: 0, max: 2.4, smoke: false, h: 0.55 });
    /* 黑煙：上升並緩慢消散 */
    run.nukes.push({ x: x - 18, y: y + 6, t: 0, max: 3.8, smoke: true });
    run.nukes.push({ x: x + 22, y: y - 8, t: 0, max: 4.4, smoke: true });
    run.nukes.push({ x: x + 4, y: y - 30, t: 0, max: 4.8, smoke: true });
    run.nukes.push({ x: x - 46, y: y - 20, t: 0, max: 4.0, smoke: true });
    addParticles(x, y, 120, '#ffd166', { speed: 520 });
    addParticles(x, y, 60, '#ff7a3c', { speed: 340 });
    addParticles(x, y, 30, '#ffffff', { speed: 620 });
    if (SFX.nuke) SFX.nuke(); else { SFX.boom(); SFX.roar(); }
  }

  function areaDamage(x, y, radius, dmg, knock, color) {
    for (var i = run.enemies.length - 1; i >= 0; i--) {
      var e = run.enemies[i];
      if (dist({ x: x, y: y }, e) < radius) {
        damageEnemy(e, dmg * playerAtk(run.player), Math.atan2(e.y - y, e.x - x), knock);
      }
    }
    addParticles(x, y, 28, color, { speed: 220 });
    run.parts.push({ x: x, y: y, vx: 0, vy: 0, life: 0.4, max: 0.4, color: color, size: 0, grav: 0, ring: radius });
    run.cam.shake = Math.max(run.cam.shake, 5);
  }
  /* ------------------------------------------------------------------
     更新：玩家
     ------------------------------------------------------------------ */
  function update(dt) {
    var p = run.player;
    run.t += dt;
    /* 回聲倒帶：畫面凍結，等時鐘播完才還原 */
    if (run.rewindAnim > 0) {
      run.rewindAnim -= dt;
      if (run.rewindAnim <= 0) applyRewind();
      return;
    }
    if (!run.beams) run.beams = [];
    if (run.pendingClear) { run.pendingClear = false; checkCleared(); }
    if (!run.slashes) run.slashes = [];

    /* 計時器 */
    ['invuln', 'dashCd', 'skillCd', 'fireCd', 'dryCd', 'shieldT', 'rageT', 'ultLock', 'ultCd', 'hurtFlash'].forEach(function (k) {
      if (p[k] > 0) p[k] -= dt;
    });
    ['dmg', 'spd', 'rate', 'crit', 'rage', 'freeAmmo', 'autoFire', 'lifesteal'].forEach(function (k) {
      if (p.buffs[k] > 0) p.buffs[k] -= dt;
    });

    /* 瞄準 */
    var aimAng = Math.atan2((mouse.y + run.cam.y) - p.y, (mouse.x + run.cam.x) - p.x);
    var wantFire = mouse.down;
    if (touch.aim.on) {
      aimAng = touch.aim.mag > 0.18 ? aimAssist(p, touch.aim.ang) : autoAimAngle(p);
      wantFire = true;
    }
    p.aim = aimAng;
    p.face = Math.cos(p.aim) >= 0 ? 1 : -1;

    /* 大招：千箭之雨自動鎖敵 */
    if (p.buffs.autoFire > 0) {
      var autoT = nearestEnemy(p);
      if (autoT) {
        p.aim = Math.atan2(autoT.y - p.y, autoT.x - p.x);
        p.face = Math.cos(p.aim) >= 0 ? 1 : -1;
        wantFire = true;
      }
    }

    /* 移動 */
    var ix = 0, iy = 0;
    if (touch.move.on) {
      ix = touch.move.dx; iy = touch.move.dy;
    } else {
      if (keys['a'] || keys['arrowleft']) ix--;
      if (keys['d'] || keys['arrowright']) ix++;
      if (keys['w'] || keys['arrowup']) iy--;
      if (keys['s'] || keys['arrowdown']) iy++;
    }
    var len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }

    if (pending.dash && p.dashCd <= 0) {
      p.dashT = 0.16;
      p.dashA = len > 0 ? Math.atan2(iy, ix) : p.aim;
      p.dashCd = 0.5 * (p.dashMul || 1);
      p.invuln = Math.max(p.invuln, 0.28);
      if (run && run.training) trainDone('dash');
      SFX.dash();
      addParticles(p.x, p.y, 8, '#c8d2e6', { speed: 90 });
    }
    pending.dash = false;
    if (pending.skill) { useSkill(); pending.skill = false; }

    if (run && run.training && (ix || iy)) trainDone('move');
    if (ix || iy) {
      if (Math.abs(ix) > Math.abs(iy)) p.dir = ix > 0 ? 'right' : 'left';
      else p.dir = iy > 0 ? 'down' : 'up';
    }
    var spdNow = p.spd * (p.buffs.spd > 0 ? 1.2 : 1);
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.x += Math.cos(p.dashA) * 430 * dt;
      p.y += Math.sin(p.dashA) * 430 * dt;
      p.walk = 1;
    } else {
      p.x += ix * spdNow * dt;
      p.y += iy * spdNow * dt;
      p.walk = len > 0 ? 1 : 0;
    }
    resolveWalls(p, run.walls);
    resolveProps(p, run.props);
    p.x = clamp(p.x, p.r + WALLT - 2, RW - WALLT + 2 - p.r);
    p.y = clamp(p.y, p.r + WALLT - 2, RH - WALLT + 2 - p.r);

    p.energy = Math.min(p.maxEnergy, p.energy + p.baseRegen * p.regenMul * dt);

    /* 連發 */
    if (p.burst) {
      p.burst.timer -= dt;
      if (p.burst.timer <= 0) {
        p.burst.left--;
        shootOnce(p, p.burst.w);
        p.burst.timer = 0.07;
        if (p.burst.left <= 0) p.burst = null;
      }
    }
    if (wantFire) fireWeapon();

    /* 敵人 */
    for (var i = run.enemies.length - 1; i >= 0; i--) {
      var e = run.enemies[i];
      if (e.dead) { run.enemies.splice(i, 1); continue; }
      updateEnemy(e, dt, p);
    }

    for (var bi = run.booms.length - 1; bi >= 0; bi--) {
      var boom = run.booms[bi];
      boom.t += dt;
      if (boom.t >= boom.max) run.booms.splice(bi, 1);
    }
    /* 天賦：連擊衰減 / 寒域光環 */
    if (p.comboT > 0) {
      p.comboT -= dt;
      if (p.comboT <= 0 && p.comboStacks > 0) { p.comboStacks = 0; recalcStats(p); }
    }
    if (run.talents && run.talents.slowaura) {
      var auraR = 86 + run.talents.slowaura * 12;
      for (var ai = 0; ai < run.enemies.length; ai++) {
        var ae = run.enemies[ai];
        if (!ae.dead && Math.hypot(ae.x - p.x, ae.y - p.y) < auraR) ae.slowT = Math.max(ae.slowT, 0.35);
      }
    }

    /* 大招出傷佇列 */
    for (var qi = run.ultQueue.length - 1; qi >= 0; qi--) {
      run.ultQueue[qi].t -= dt;
      if (run.ultQueue[qi].t <= 0) {
        var qf = run.ultQueue[qi].fn;
        run.ultQueue.splice(qi, 1);
        try { qf(); } catch (err2) {}
      }
    }

    /* 天罰聖劍 */
    if (run.ultSword) {
      var us = run.ultSword;
      us.t += dt;
      if (us.t >= us.max) { run.ultSword = null; }
    }

    /* 核彈倒數：警報持續響，5 秒後真的落下 */
    if (run.nukeCall) {
      run.nukeCall.t -= dt;
      if (run.nukeCall.t <= 0) {
        run.nukesIn.push({ x: run.nukeCall.x, y: run.nukeCall.y, t: 0, max: 1.15 });
        run.nukeCall = null;
        if (SFX.stopSiren) SFX.stopSiren();
        SFX.roar();
      }
    }
    /* 核彈閃白 + 蕈狀雲 */
    if (run.flash > 0) run.flash -= dt * 1.6;
    for (var ni2 = run.nukesIn.length - 1; ni2 >= 0; ni2--) {
      var nk4 = run.nukesIn[ni2];
      nk4.t += dt;
      if (nk4.t >= nk4.max) {
        run.nukesIn.splice(ni2, 1);
        nukeExplosion(nk4.x, nk4.y);
      }
    }
    if (run.introT > 0) run.introT -= dt;
    if (run.floorIntro > 0) run.floorIntro -= dt;
    /* 每 0.4 秒記錄一次快照（回聲倒帶用） */
    run.snapT = (run.snapT || 0) + dt;
    if (run.snapT >= 0.4) { run.snapT = 0; pushSnapshot(); }
    for (var ni = run.nukes.length - 1; ni >= 0; ni--) {
      run.nukes[ni].t += dt;
      if (run.nukes[ni].t >= run.nukes[ni].max) run.nukes.splice(ni, 1);
    }

    for (var mi = run.muzzles.length - 1; mi >= 0; mi--) {
      var mz = run.muzzles[mi];
      mz.t += dt;
      if (mz.t >= mz.max) run.muzzles.splice(mi, 1);
    }
    for (var fi = run.ultFx.length - 1; fi >= 0; fi--) {
      var fx = run.ultFx[fi];
      fx.t += dt;
      if (fx.t >= fx.max) run.ultFx.splice(fi, 1);
    }
    /* 創世循環：每 8 秒回復 6% 生命 */
    if (p.regenPulse) {
      p.regenT = (p.regenT || 0) + dt;
      if (p.regenT >= 8) {
        p.regenT = 0;
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.06);
        addText(p.x, p.y - 20, '+生命', '#8be08b', 8);
      }
    }

    /* 防止敵人卡在牆內（只有真正深入牆內才推開，避免怪物一直「漂移」） */
    run.stuckT = (run.stuckT || 0) + dt;
    if (run.stuckT > 1) {
      run.stuckT = 0;
      for (var se = 0; se < run.enemies.length; se++) {
        var ee = run.enemies[se];
        if (ee.dead) continue;
        if (ee._stuckCd > 0) { ee._stuckCd -= 1; continue; }
        if (!hitWalls(ee.x, ee.y, ee.r * 0.3, run.walls)) { ee._stuckN = 0; continue; }
        ee._stuckN = (ee._stuckN || 0) + 1;
        if (ee._stuckN < 3) continue;
        ee._stuckN = 0;
        ee._stuckCd = 4;
        var foundSpot = false;
        for (var tr = 1; tr <= 10 && !foundSpot; tr++) {
          for (var ta = 0; ta < 12; ta++) {
            var fx = ee.x + Math.cos(ta / 12 * TAU) * (tr * 12);
            var fy = ee.y + Math.sin(ta / 12 * TAU) * (tr * 12);
            if (fx < WALLT + ee.r + 2 || fx > RW - WALLT - ee.r - 2) continue;
            if (fy < WALLT + ee.r + 2 || fy > RH - WALLT - ee.r - 2) continue;
            if (hitWalls(fx, fy, ee.r + 2, run.walls)) continue;
            ee.x = fx; ee.y = fy; foundSpot = true; break;
          }
        }
        if (!foundSpot) { ee.x = RW / 2; ee.y = RH / 2 + 40; }
      }
    }

    updateBossDeath(dt);
    updatePoison(dt);
    if (run.player && run.player.hpRegenPerSec) {
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + run.player.hpRegenPerSec * dt);
    }
    /* 核彈衝擊波：掃到即死 */
    if (run.nukeWaves && run.nukeWaves.length) {
      for (var nw = run.nukeWaves.length - 1; nw >= 0; nw--) {
        var wv = run.nukeWaves[nw];
        wv.t += dt;
        var prog = Math.min(1, wv.t / wv.max);
        var radius = wv.maxR * (1 - Math.pow(1 - prog, 2));
        var snap = run.enemies.slice();
        for (var ne = 0; ne < snap.length; ne++) {
          var ee = snap[ne];
          if (!ee || ee.dead) continue;
          if (Math.hypot(ee.x - wv.x, ee.y - wv.y) <= radius) {
            damageEnemy(ee, 999999, Math.atan2(ee.y - wv.y, ee.x - wv.x), 260);
          }
        }
        if (wv.t >= wv.max) run.nukeWaves.splice(nw, 1);
      }
    }
    /* 隱藏試煉：首領降生倒數（3 秒） */
    if (run.rushWait > 0) {
      run.rushWait -= dt;
      run.cam.shake = Math.max(run.cam.shake, 2.5);
      if (Math.random() < 0.35) {
        addParticles(RW / 2 + rand(-40, 40), 70 + rand(0, 30), 2, '#ff5ce0', { speed: 90 });
      }
      if (run.rushWait <= 0) {
        run.rushWait = 0;
        run.impacts.push({ x: RW / 2, y: 90, t: 0.6, max: 0.6, r: 150, color: '#ff5ce0' });
        run.cam.shake = Math.max(run.cam.shake, 10);
        spawnRushBoss();
        banner('隱藏試煉 ' + run.rush.index + ' / 5', '首領降臨');
        SFX.boom();
      }
    }
    /* 首領死亡後延遲開啟特殊傳送門 */
    if (run.bossExitPending > 0) {
      run.bossExitPending -= dt;
      if (run.bossExitPending <= 0) {
        var bp = findFreeSpotNear(RW / 2, RH / 2, 26);
        run.portal = { x: bp.x, y: bp.y, t: 0, color: '#ff7a3c', bossExit: true };
        banner('首領隕落', '特殊傳送門已開啟');
        SFX.portal();
      }
    }
    updateBullets(dt);
    updateClouds(dt);

    /* 毒霧 */
    for (var c = run.clouds.length - 1; c >= 0; c--) {
      var cl = run.clouds[c];
      cl.life -= dt;
      if (cl.life <= 0) { run.clouds.splice(c, 1); continue; }
      if (Math.random() < 0.3) addParticles(cl.x + rand(-cl.r, cl.r), cl.y + rand(-cl.r, cl.r), 1, cl.color, { speed: 12 });
      for (var ci = 0; ci < run.enemies.length; ci++) {
        var ce = run.enemies[ci];
        if (Math.hypot(ce.x - cl.x, ce.y - cl.y) < cl.r + ce.r) {
          ce.poison = Math.max(ce.poison, 0.4);
          ce.poisonDps = cl.dps;
          if (cl.slow) ce.slowT = Math.max(ce.slowT, 0.8);
        }
      }
    }

    /* 毒霧 */
    for (var k = run.pickups.length - 1; k >= 0; k--) {
      var pk = run.pickups[k];
      pk.t += dt;
      var dp = dist(pk, p);
      if (dp < (60 + ((run.player.talents && run.player.talents.magnet) || 0) * 70) * (run.player.pickupMul || 1)) {
        var a = Math.atan2(p.y - pk.y, p.x - pk.x);
        pk.x += Math.cos(a) * 230 * dt;
        pk.y += Math.sin(a) * 230 * dt;
      }
      if (dp < 11) {
        if (pk.type === 'coin') { run.coins += pk.val; SFX.coin(); }
        else if (pk.type === 'heart') { p.hp = Math.min(p.maxHp, p.hp + 12); SFX.heal(); }
        else if (pk.type === 'key') {
          var kt3 = pk.keyType || 'bronze';
          run.keys[kt3] = (run.keys[kt3] || 0) + 1;
          SFX.buy();
          addText(p.x, p.y - 18, '+' + keyLabel(kt3), '#ffe6a1', 8);
        }
        else { p.energy = Math.min(p.maxEnergy, p.energy + 22); }
        run.pickups.splice(k, 1);
      }
    }

    /* 粒子 / 文字 */
    for (var m = run.parts.length - 1; m >= 0; m--) {
      var pt = run.parts[m];
      pt.life -= dt;
      if (pt.life <= 0) { run.parts.splice(m, 1); continue; }
      if (!pt.ring) {
        pt.x += pt.vx * dt; pt.y += pt.vy * dt;
        pt.vy += (pt.grav || 0) * dt;
        pt.vx *= 0.94; pt.vy *= 0.94;
      }
    }
    for (var q = run.texts.length - 1; q >= 0; q--) {
      var tx = run.texts[q];
      tx.life -= dt;
      tx.y += tx.vy * dt;
      tx.vy += 40 * dt;
      if (tx.life <= 0) run.texts.splice(q, 1);
    }
    for (var im = run.impacts.length - 1; im >= 0; im--) {
      run.impacts[im].t -= dt;
      if (run.impacts[im].t <= 0) run.impacts.splice(im, 1);
    }
    for (var b = run.beams.length - 1; b >= 0; b--) {
      run.beams[b].t -= dt;
      if (run.beams[b].t <= 0) run.beams.splice(b, 1);
    }
    for (var s2 = run.slashes.length - 1; s2 >= 0; s2--) {
      run.slashes[s2].t -= dt;
      if (run.slashes[s2].t <= 0) run.slashes.splice(s2, 1);
    }

    if (run.swing) {
      run.swing.t += dt;
      if (run.swing.t > run.swing.dur) run.swing = null;
    }
    if (run.portal) run.portal.t += dt;

    /* 傳送門 → 先選天賦 */
    /* 傳送門不再自動傳送，改由玩家按 F 決定 */

    updateInteract(p);
    checkCleared();

    var tx2 = clamp(p.x - VW / 2, 0, Math.max(0, RW - VW));
    var ty2 = clamp(p.y - VH / 2, 0, Math.max(0, RH - VH));
    run.cam.x += (tx2 - run.cam.x) * Math.min(1, dt * 9);
    run.cam.y += (ty2 - run.cam.y) * Math.min(1, dt * 9);
    run.cam.shake = Math.max(0, run.cam.shake - dt * 26);
  }

  /* 怪物特殊行為：投擲 / 狙擊 / 環繞 / 瞬移 / 分裂 / 蛛網 / 召喚 */
  function updateEnemyBehavior(e, dt, p, d, a) {
    if (!e.behavior || e.behavior === 'chase') return;
    e.behaviorT = (e.behaviorT == null ? rand(1.2, 3) : e.behaviorT) - dt;
    if (e.behaviorT > 0) return;
    switch (e.behavior) {
      case 'lob':
        if (d < 330) {
          enemyBullet(e.x, e.y - 6, a, 155, e.dmg * 0.8, { color: e.pal.accent, r: 4, life: 1.7 });
          addParticles(e.x, e.y - 6, 4, e.pal.accent, { speed: 70 });
          SFX.shoot('staff');
        }
        e.behaviorT = rand(2.0, 3.2);
        break;
      case 'snipe':
        if (d < 400) {
          run.beams.push({ x: e.x, y: e.y - 8, ang: a, len: 400, t: 0.1, color: e.pal.accent });
          var dx = p.x - e.x, dy = p.y - (e.y - 8);
          var proj = dx * Math.cos(a) + dy * Math.sin(a);
          var perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
          if (proj > 0 && proj < 400 && perp < 12) hurtPlayer(e.dmg * 0.7);
          run.impacts.push({ x: e.x, y: e.y - 8, t: 0.2, max: 0.2, r: 16, color: e.pal.accent });
          SFX.shoot('laser');
        }
        e.behaviorT = rand(2.6, 3.8);
        break;
      case 'orbit':
        for (var k = -1; k <= 1; k++) enemyBullet(e.x, e.y - 6, a + k * 0.5, 190, e.dmg * 0.5, { color: e.pal.accent });
        e.behaviorT = rand(1.6, 2.4);
        break;
      case 'blink':
        if (d > 60) {
          addParticles(e.x, e.y, 10, e.pal.accent, { speed: 130 });
          e.x = clamp(p.x + rand(-55, 55), WALLT + 14, RW - WALLT - 14);
          e.y = clamp(p.y + rand(-55, 55), WALLT + 14, RH - WALLT - 14);
          addParticles(e.x, e.y, 10, e.pal.accent, { speed: 130 });
        }
        e.behaviorT = rand(2.4, 3.6);
        break;
      case 'web':
        run.clouds.push({ x: e.x, y: e.y, r: 46, life: 4, max: 4, dps: 4, color: e.pal.accent, poison: true, slow: true });
        e.behaviorT = rand(3.2, 4.5);
        break;
      case 'summon':
        if ((run.roster || []).length) {
          addEnemy(pick(run.roster), e.x + rand(-22, 22), e.y + rand(-22, 22));
          addParticles(e.x, e.y, 10, e.pal.accent, { speed: 120 });
        }
        e.behaviorT = rand(2.8, 4.0);
        break;
      case 'split':
        e.behaviorT = rand(1.5, 2.5);
        break;
    }
  }

  function updateEnemy(e, dt, p) {
    e.t += dt;
    if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 5);
    if (e.touchCd > 0) e.touchCd -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    if (e.rootT > 0) e.rootT -= dt;

    /* 持續傷害 */
    if (e.burn > 0) {
      e.burn -= dt;
      e.hp -= (e.burnDps || 8) * dt;
      if (Math.random() < 0.25) addParticles(e.x, e.y, 1, '#ff9a3c', { speed: 20 });
      if (e.hp <= 0) { killEnemy(e); return; }
    }
    if (e.poison > 0) {
      e.poison -= dt;
      e.hp -= (e.poisonDps || 5) * dt;
      if (Math.random() < 0.2) addParticles(e.x, e.y, 1, '#a8e05a', { speed: 20 });
      if (e.hp <= 0) { killEnemy(e); return; }
    }

    var dx = p.x - e.x, dy = p.y - e.y;
    var d = Math.max(0.001, Math.hypot(dx, dy));
    var a = Math.atan2(dy, dx);
    e.face = dx >= 0 ? 1 : -1;

    var speedMul = (e.slowT > 0 ? 0.55 : 1) * (e.rootT > 0 ? 0 : 1);

    if (e.kind === 'boss') {
      updateBoss(e, dt, p, d, a);
    } else if (e.arch === 'blob') {
      var pulse = 0.55 + 0.45 * Math.max(0, Math.sin(e.t * 4.5));
      e.vx = Math.cos(a) * e.spd * pulse * speedMul;
      e.vy = Math.sin(a) * e.spd * pulse * speedMul;
      e.walk = pulse;
    } else if (e.arch === 'flyer') {
      var wob = Math.sin(e.t * 6 + e.seed) * 0.9;
      e.vx = Math.cos(a + wob) * e.spd * 0.75 * speedMul;
      e.vy = Math.sin(a + wob) * e.spd * 0.75 * speedMul;
      e.walk = 1;
      if (e.ranged) {
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 300) {
          e.shootT = e.ranged;
          enemyBullet(e.x, e.y - 6, a, 170, e.dmg * 0.7, { color: e.pal.accent });
          SFX.shoot('staff');
        }
      }
    } else if (e.arch === 'caster') {
      if (d < 130) { e.vx = -Math.cos(a) * e.spd * speedMul; e.vy = -Math.sin(a) * e.spd * speedMul; }
      else if (d > 190) { e.vx = Math.cos(a) * e.spd * speedMul; e.vy = Math.sin(a) * e.spd * speedMul; }
      else {
        e.vx = Math.cos(a + Math.PI / 2) * e.spd * 0.7 * speedMul;
        e.vy = Math.sin(a + Math.PI / 2) * e.spd * 0.7 * speedMul;
      }
      e.shootT -= dt;
      if (e.shootT <= 0 && d < 320) {
        e.shootT = e.ranged || 1.7;
        enemyBullet(e.x, e.y - 8, a, 155, e.dmg * 0.85, { color: e.pal.accent });
        SFX.shoot('staff');
      }
      e.walk = 0.6;
    } else if (e.arch === 'charger') {
      e.timer -= dt;
      if (e.state === 'idle') {
        e.vx = Math.cos(a) * e.spd * 0.55 * speedMul;
        e.vy = Math.sin(a) * e.spd * 0.55 * speedMul;
        e.walk = 1;
        if (d < 240 && e.timer <= 0) { e.state = 'wind'; e.timer = 0.5; }
      } else if (e.state === 'wind') {
        e.vx = 0; e.vy = 0; e.walk = 0;
        e.windA = a;
        if (e.timer <= 0) { e.state = 'charge'; e.timer = 0.45; SFX.dash(); }
      } else if (e.state === 'charge') {
        e.vx = Math.cos(e.windA) * 340 * speedMul;
        e.vy = Math.sin(e.windA) * 340 * speedMul;
        e.walk = 1;
        addParticles(e.x, e.y + 4, 1, e.pal.dark, { speed: 30 });
        if (e.timer <= 0) { e.state = 'rest'; e.timer = 0.8; }
      } else {
        e.vx *= 0.9; e.vy *= 0.9;
        if (e.timer <= 0) { e.state = 'idle'; e.timer = rand(0.6, 1.3); }
      }
    } else {
      /* tank */
      e.vx = Math.cos(a) * e.spd * speedMul;
      e.vy = Math.sin(a) * e.spd * speedMul;
      e.walk = 1;
      if (e.ranged) {
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 300) {
          e.shootT = e.ranged;
          for (var kk = -1; kk <= 1; kk++) enemyBullet(e.x, e.y - 10, a + kk * 0.2, 150, e.dmg * 0.5, { color: e.pal.accent });
        }
      }
    }

    if (e.rootT > 0) { e.vx = 0; e.vy = 0; }
    updateEnemyBehavior(e, dt, p, d, a);

    e.x += (e.vx + e.kx) * dt;
    e.y += (e.vy + e.ky) * dt;
    e.kx *= 0.86;
    e.ky *= 0.86;
    resolveWalls(e, run.walls);
    resolveProps(e, run.props);
    e.x = clamp(e.x, e.r + WALLT - 2, RW - WALLT + 2 - e.r);
    e.y = clamp(e.y, e.r + WALLT - 2, RH - WALLT + 2 - e.r);

    if (d < e.r + p.r + 1 && e.touchCd <= 0 && e.rootT <= 0) {
      var dmg = e.dmg * (e.arch === 'charger' && e.state === 'charge' ? 1.3 : 1);
      hurtPlayer(dmg);
      e.touchCd = 0.6;
      e.kx -= Math.cos(a) * 80;
      e.ky -= Math.sin(a) * 80;
    }
  }

  function updateBoss(b, dt, p, d, a) {
    b.t += dt;
    b.atkT -= dt;
    var enraged = b.hp / b.maxHp < 0.45;
    var spd = enraged ? 50 : 34;
    var speedMul = b.rootT > 0 ? 0 : (b.slowT > 0 ? 0.6 : 1);

    if (b.chargeT > 0) {
      b.chargeT -= dt;
      b.vx = Math.cos(b.chargeA) * 360 * speedMul;
      b.vy = Math.sin(b.chargeA) * 360 * speedMul;
      addParticles(b.x, b.y + 8, 1, b.pal.accent, { speed: 50 });
      if (b.chargeT <= 0) {
        run.impacts.push({ x: b.x, y: b.y + 4, t: 0.35, max: 0.35, r: 80, color: b.pal.accent });
        run.cam.shake = Math.max(run.cam.shake, 9);
        if (Math.hypot(p.x - b.x, p.y - b.y) < 86) hurtPlayer(b.dmg * 0.8);
        addParticles(b.x, b.y + 6, 16, b.pal.accent, { speed: 220 });
        SFX.boom();
      }
    } else {
      b.vx = Math.cos(a) * spd * speedMul;
      b.vy = Math.sin(a) * spd * speedMul;
    }

    if (b.atkT <= 0 && b.rootT <= 0) {
      var r = Math.random();
      var pat = b.pattern || 'radial';

      if (pat === 'beam' && r < 0.45) {
        b.beamT = 0.75;
        b.beamA = a;
        b.warnT = 0.55;
        run.impacts.push({ x: b.x, y: b.y, t: 0.55, max: 0.55, r: 74, color: '#ff3b3b' });
        addText(b.x, b.y - b.r - 18, '⚠ 準備發射', '#ff7a7a', 9);
        b.atkT = 3.2;
        SFX.roar();
      } else if (pat === 'summon' && r < 0.4) {
        var pool2 = run.roster || [];
        for (var kk = 0; kk < 3 && pool2.length; kk++) addEnemy(pick(pool2), b.x + rand(-60, 60), b.y + rand(20, 70));
        addParticles(b.x, b.y, 20, b.pal.accent, { speed: 160 });
        b.atkT = 2.8;
      } else if (pat === 'charge' && r < 0.55) {
        b.chargeA = a;
        b.chargeT = 0.45;
        b.warnT = 0.45;
        run.impacts.push({ x: b.x, y: b.y, t: 0.45, max: 0.45, r: 64, color: '#ff9a3c' });
        addText(b.x, b.y - b.r - 18, '⚠ 衝撞', '#ffb36b', 9);
        b.atkT = 2.2;
        SFX.roar();
      } else if (pat === 'missiles' && r < 0.55) {
        for (var mi = 0; mi < 3; mi++) {
          enemyBullet(b.x, b.y - 18, a + (mi - 1) * 0.35, 150, b.dmg * 0.5, { color: '#ff9a5c', r: 4, homing: 2.2 });
        }
        SFX.shoot('rpg');
        b.atkT = enraged ? 1.0 : 1.4;
      } else if (pat === 'minigun' && r < 0.6) {
        for (var mg = 0; mg < 6; mg++) {
          enemyBullet(b.x, b.y - 16, a + rand(-0.09, 0.09), 330, b.dmg * 0.22, { color: '#ffe066', r: 2 });
        }
        SFX.shoot('smg');
        b.atkT = enraged ? 1.0 : 1.5;
      } else if (r < 0.42) {
        var n = enraged ? 30 : 22;
        var col = b.pal.accent;
        for (var i = 0; i < n; i++) {
          enemyBullet(b.x, b.y - 14, b.t * 0.6 + i * TAU / n, 150, b.dmg * 0.55, { color: col });
        }
        SFX.shoot('staff');
        b.atkT = enraged ? 1.0 : 1.4;
      } else if (r < 0.74) {
        for (var j = -1; j <= 1; j++) enemyBullet(b.x, b.y - 14, a + j * 0.22, 225, b.dmg * 0.7, { color: b.pal.accent });
        SFX.shoot('shotgun');
        b.atkT = enraged ? 0.8 : 1.1;
      } else if (r < 0.9) {
        b.chargeA = a;
        b.chargeT = 0.5;
        SFX.roar();
        b.atkT = 3.0;
      } else {
        var pool = run.roster || [];
        for (var k = 0; k < 2 && pool.length; k++) addEnemy(pick(pool), b.x + rand(-50, 50), b.y + rand(20, 60));
        b.atkT = 3.4;
      }
    }

    /* 掃射光束 */
    if (b.beamT > 0) {
      b.beamT -= dt;
      var bang = b.beamA;
      run.beams.push({ x: b.x, y: b.y - 14, ang: bang, len: 430, t: 0.09, color: b.pal.accent });
      if (Math.random() < 0.7) {
        addParticles(b.x + Math.cos(bang) * rand(20, 240), b.y - 14 + Math.sin(bang) * rand(20, 240), 1, b.pal.accent, { speed: 40 });
      }
      var bdx = p.x - b.x, bdy = p.y - (b.y - 14);
      var bproj = bdx * Math.cos(bang) + bdy * Math.sin(bang);
      var bperp = Math.abs(-bdx * Math.sin(bang) + bdy * Math.cos(bang));
      if (bproj > 0 && bproj < 430 && bperp < 14) hurtPlayer(b.dmg * 1.4 * dt * 6);
    }
  }

  function updateBullets(dt) {
    var p = run.player;
    for (var i = run.bullets.length - 1; i >= 0; i--) {
      var b = run.bullets[i];
      b.life -= dt;
      b.age += dt;

      if (b.life <= 0) {
        if (b.nuke) nukeExplosion(b.x, b.y);
        else if (b.splash) splashDamage(b.x, b.y, b.splash, b.dmg * 0.5, false);
        run.bullets.splice(i, 1);
        continue;
      }

      /* 追蹤 */
      if (b.homing && b.friendly) {
        var best = null, bestD = 1e9;
        for (var h = 0; h < run.enemies.length; h++) {
          var he = run.enemies[h];
          var hd = Math.hypot(he.x - b.x, he.y - b.y);
          if (hd < bestD) { bestD = hd; best = he; }
        }
        if (best && bestD < 420) {
          var want = Math.atan2(best.y - b.y, best.x - b.x);
          var cur = Math.atan2(b.vy, b.vx);
          var sp = Math.hypot(b.vx, b.vy);
          var na = cur + clamp(normAng(want - cur), -b.homing * dt, b.homing * dt);
          b.vx = Math.cos(na) * sp;
          b.vy = Math.sin(na) * sp;
        }
      }

      /* 迴旋刃返回 */
      if (b.boomerang) {
        if (b.age > 0.32) {
          var ba = Math.atan2(p.y - b.y, p.x - b.x);
          var bsp = Math.hypot(b.vx, b.vy);
          var na2 = Math.atan2(b.vy, b.vx) + clamp(normAng(ba - Math.atan2(b.vy, b.vx)), -6 * dt, 6 * dt);
          b.vx = Math.cos(na2) * bsp;
          b.vy = Math.sin(na2) * bsp;
          if (Math.hypot(p.x - b.x, p.y - b.y) < 12) { run.bullets.splice(i, 1); continue; }
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      /* 可破壞物件 */
      var hitProp = false;
      for (var pr = 0; pr < run.props.length; pr++) {
        var prop = run.props[pr];
        if (prop.dead) continue;
        if (Math.hypot(prop.x - b.x, prop.y - b.y) < prop.r + b.r) {
          damageProp(prop, b.dmg);
          if (b.splash) splashDamage(b.x, b.y, b.splash, b.dmg * 0.5, false);
          if (b.bounce > 0) { b.bounce--; b.vx *= -0.8; b.vy *= -0.8; b.x -= b.vx * dt * 2; b.y -= b.vy * dt * 2; }
          else { run.bullets.splice(i, 1); hitProp = true; }
          break;
        }
      }
      if (hitProp) continue;

      /* 撞牆 */
      var wallHit = (b.x < WALLT || b.x > RW - WALLT || b.y < WALLT || b.y > RH - WALLT || hitWalls(b.x, b.y, b.r, run.walls));
      if (wallHit) {
        if (b.bounce > 0) {
          b.bounce--;
          if (b.x < WALLT || b.x > RW - WALLT || hitWalls(b.x, b.y, b.r, run.walls)) b.vx *= -1;
          if (b.y < WALLT || b.y > RH - WALLT) b.vy *= -1;
          b.x = clamp(b.x, WALLT + 2, RW - WALLT - 2);
          b.y = clamp(b.y, WALLT + 2, RH - WALLT - 2);
        } else {
          if (b.nuke) nukeExplosion(b.x, b.y);
          else if (b.splash) splashDamage(b.x, b.y, b.splash, b.dmg * 0.5, false);
          else addParticles(b.x, b.y, 3, b.color, { speed: 70 });
          run.bullets.splice(i, 1);
        }
        continue;
      }

      if (b.friendly) {
        var removed = false;
        for (var e2 = 0; e2 < run.enemies.length; e2++) {
          var en = run.enemies[e2];
          if (en.dead) continue;
          if (b.hit.indexOf(en) >= 0) continue;
          if (Math.hypot(b.x - en.x, b.y - en.y) < en.r + b.r) {
            damageEnemy(en, b.dmg, Math.atan2(b.vy, b.vx), b.knock, b);
            /* 星爆：暴擊時引發小爆炸 */
            if (b.crit && run.player.starburst) splashDamage(b.x, b.y, 38, b.dmg * 0.45, false);
            /* 天賦：分裂彈 */
            if (run.player.talents && run.player.talents.split && !b.isChild) {
              for (var sp2 = -1; sp2 <= 1; sp2 += 2) {
                spawnBullet({
                  x: b.x, y: b.y, ang: Math.atan2(b.vy, b.vx) + sp2 * 0.55,
                  speed: 280, dmg: b.dmg * 0.45, life: 0.5, r: 1.9,
                  color: b.color, friendly: true, isChild: true, knock: 20
                });
              }
            }
            if (b.heal) p.hp = Math.min(p.maxHp, p.hp + b.heal);
            if (b.chain) {
              var jumps = b.chain, source = en;
              for (var ch = 0; ch < jumps; ch++) {
                var next = null, nd = 150;
                for (var en3 = 0; en3 < run.enemies.length; en3++) {
                  var cand = run.enemies[en3];
                  if (cand === source || cand.dead) continue;
                  var dd = Math.hypot(cand.x - source.x, cand.y - source.y);
                  if (dd < nd) { nd = dd; next = cand; }
                }
                if (!next) break;
                damageEnemy(next, b.dmg * 0.55, Math.atan2(next.y - source.y, next.x - source.x), 20, b);
                source = next;
              }
            }
            b.hit.push(en);
            if (b.nuke) {
              nukeExplosion(b.x, b.y);
              run.bullets.splice(i, 1); removed = true; break;
            }
            if (b.splash) { splashDamage(b.x, b.y, b.splash, b.dmg * 0.6, false); run.bullets.splice(i, 1); removed = true; break; }
            if (b.pierce > 0) b.pierce--;
            else { run.bullets.splice(i, 1); removed = true; break; }
          }
        }
        if (removed) continue;
      } else {
        if (Math.hypot(b.x - p.x, b.y - p.y) < p.r + b.r) {
          if (p.shieldT > 0 && p.hero.skill.kind === 'shield') {
            addPickup(p.x + rand(-8, 8), p.y + rand(-8, 8), 'coin', 1);
            addParticles(b.x, b.y, 5, '#ffe6a1', { speed: 80 });
            run.bullets.splice(i, 1);
            continue;
          }
          if (p.invuln <= 0) {
            hurtPlayer(b.dmg);
            addParticles(b.x, b.y, 4, '#ff6b5e', { speed: 80 });
          }
          run.bullets.splice(i, 1);
          continue;
        }
      }
    }
  }

  function updateClouds() {}

  /* ---------------- 可破壞物件 ---------------- */
  function damageProp(prop, dmg) {
    if (prop.dead) return;
    prop.hp -= dmg;
    prop.flash = 1;
    addParticles(prop.x, prop.y - 6, 3, '#c8a06a', { speed: 80 });
    if (prop.hp <= 0) destroyProp(prop);
  }

  function destroyProp(prop) {
    if (prop.dead) return;
    prop.dead = true;
    SFX.kill();
    if (prop.type === 'bomb') {
      splashDamage(prop.x, prop.y, 62, 46, true);
      for (var i = 0; i < run.props.length; i++) {
        var other = run.props[i];
        if (other !== prop && !other.dead && Math.hypot(other.x - prop.x, other.y - prop.y) < 62) {
          damageProp(other, 40);
        }
      }
      return;
    }
    addParticles(prop.x, prop.y - 4, 8, '#c8a06a', { speed: 120 });
    var roll = Math.random();
    if (prop.type === 'crate') {
      if (roll < 0.6) for (var c = 0; c < 3; c++) addPickup(prop.x + rand(-8, 8), prop.y, 'coin', 1);
      else if (roll < 0.8) addPickup(prop.x, prop.y, 'heart', 1);
      else addPickup(prop.x, prop.y, 'energy', 1);
    } else if (prop.type === 'barrel') {
      for (var e = 0; e < 2; e++) addPickup(prop.x + rand(-8, 8), prop.y, 'energy', 1);
      if (roll < 0.4) addPickup(prop.x, prop.y, 'coin', 1);
    } else {
      if (roll < 0.5) addPickup(prop.x, prop.y, 'coin', 2);
      else addPickup(prop.x, prop.y, 'energy', 1);
    }
  }

  /* ------------------------------------------------------------------
     樓層切換 / 結束
     ------------------------------------------------------------------ */
  function nextFloor() {
    var p = run.player;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.08);
    p.energy = p.maxEnergy;
    SFX.portal();
    var nf = run.floor + 1;
    if (nf + 1 > save.best) save.best = nf + 1;
    buildFloor(nf);
    if (isStageBoss(nf)) {
      banner('第 ' + (nf + 1) + ' 層', 'STAGE BOSS');
      SFX.roar();
    } else {
      banner('第 ' + (nf + 1) + ' 層', themeFor(nf).name + ' · 關 ' + (stageInChapter(nf) + 1) + '/3');
    }
  }

  function checkCleared() {
    if (!run || run.shopRoom) return;
    if (run.cleared || run.stageCleared) return;
    /* 結算時機可能在寶箱/結算畫面，先記下來，回到遊戲再補 */
    if (mode !== 'play') { run.pendingClear = true; return; }
    /* 清掉已死亡的殘留（若死亡發生在寶箱/結算畫面，屍體不會被 update 移除） */
    for (var de = run.enemies.length - 1; de >= 0; de--) {
      if (run.enemies[de].dead) run.enemies.splice(de, 1);
    }
    if (run.enemies.length > 0) return;
    run.cleared = true;
    SFX.level();
    banner('房間淨空', '傳送門已出現');
    run.chest = null;

    /* 傳送門 / 商店一律找「沒有牆、沒有障礙物」的空地 */
    var ppos = findFreeSpotNear(RW / 2, 62, 22);
    run.portal = { x: ppos.x, y: ppos.y, t: 0, color: run.tier.accent };

    /* 局內不再出現粉紅寶箱（改到局外寶庫開啟） */
    run.chest = null;
  }

  /* =====================================================================
     傳送門後的「商店空間」：進入後才出現商店，離開再選天賦
     ===================================================================== */
  /* 走進商店房間：獨立場景，可走動、走近商品按 F 購買 */
  function enterShopRoom() {
    if (!run) return;
    run.shopRoom = true;
    run.enemies = [];
    run.bullets = [];
    run.pickups = [];
    run.props = [];
    run.chest = null;
    run.items = [];
    run.ruins = [];
    run.dropFx = [];
    run.bossDeath = [];
    run.nukes = [];
    run.nukesIn = [];
    run.nukeCall = null;
    run.walls = [];
    run.bg = Art.buildRoom(run.walls, RW, RH, 991, themeFor(run.floor));
    var offers = makeShopOffers();
    offers.forEach(function (o, i) {
      run.items.push({
        x: RW / 2 - 120 + i * 80, y: RH / 2 - 6,
        kind: o.kind, weaponId: o.weaponId, rarity: o.rarity,
        name: o.name, desc: o.desc, price: o.price, bought: false
      });
    });
    run.merchant = { x: RW / 2, y: RH / 2 - 62 };
    run.portal = { x: RW / 2, y: 58, t: 0, color: run.tier.accent, shopExit: true };
    run.player.x = RW / 2;
    run.player.y = RH - 64;
    run.cam.x = clamp(run.player.x - VW / 2, 0, Math.max(0, RW - VW));
    run.cam.y = clamp(run.player.y - VH / 2, 0, Math.max(0, RH - VH));
    run.cleared = true;
    mode = 'play';
    showScreen(null);
    if (SFX.setScene) SFX.setScene('menu');
    banner('地牢商人', '走近商品按 F 購買 · 北方出口離開');
    SFX.level();
  }

  function makeShopOffers() {
    var offers = [];
    offers.push({ kind: 'heal', name: '治療藥水', desc: '回復 55 生命', price: 30, bought: false });
    for (var i = 0; i < 3; i++) {
      var rr = Math.random() + (run.player.luckPct || 0) * 0.5 + Math.min(0.14, run.floor * 0.004) - i * 0.12;
      var wr = rr > 0.9 ? 5 : (rr > 0.66 ? 4 : 3);
      var pool = D.weaponsOfTier(wr);
      var wid = pool.length ? pick(pool) : 'pistol';
      var priceMap = { 3: 70, 4: 150, 5: 260 };
      offers.push({
        kind: 'weapon', weaponId: wid, rarity: wr,
        name: (WEAPONS[wid] ? WEAPONS[wid].name : '武器'),
        desc: (RARITY[wr] ? RARITY[wr].name : '') + '級 · 傷害 ' +
          Math.round((WEAPONS[wid] ? WEAPONS[wid].dmg : 10) * (RARITY[wr] ? RARITY[wr].mult : 1)),
        price: priceMap[wr] || 90, bought: false
      });
    }
    return offers;
  }

  function openRunShop() {
    if (!run) return;
    mode = 'shoproom';
    run.shopOffers = makeShopOffers();
    renderRunShop();
    showScreen('screen-runshop');
    if (SFX.setScene) SFX.setScene('menu');
  }

  function renderRunShop() {
    var wrap = $('runShopList');
    if (!wrap) return;
    wrap.innerHTML = '';
    var coin = $('runShopCoins');
    if (coin) coin.textContent = run.coins;
    (run.shopOffers || []).forEach(function (o, idx) {
      var card = document.createElement('div');
      card.className = 'shop-room-item' + (o.bought ? ' bought' : '');
      var rar = o.rarity ? (RARITY[o.rarity] || RARITY[0]) : null;
      if (rar) card.style.setProperty('--rc', rar.color);
      card.innerHTML =
        '<div class="sri-name">' + o.name + '</div>' +
        '<div class="sri-desc">' + o.desc + '</div>';
      var btn = document.createElement('button');
      btn.textContent = o.bought ? '已購買' : (o.price + ' 金幣');
      btn.disabled = o.bought || run.coins < o.price;
      btn.addEventListener('click', function () { buyRunShopItem(idx); });
      card.appendChild(btn);
      wrap.appendChild(card);
    });
  }

  function buyRunShopItem(idx) {
    var o = (run.shopOffers || [])[idx];
    if (!o || o.bought) return;
    if (run.coins < o.price) { toast('金幣不足'); SFX.dry(); return; }
    run.coins -= o.price;
    o.bought = true;
    if (o.kind === 'heal') {
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + 55);
      toast('生命 +55'); SFX.heal();
    } else if (o.weaponId) {
      if (!run.bag) run.bag = [];
      if (run.bag.length >= BAG_CAP) {
        toast('背包已滿（' + BAG_CAP + ' 把），先裝備或合成再買');
      } else {
        run.bag.push({ id: o.weaponId, rarity: o.rarity, uid: 's' + Date.now().toString(36) + idx });
        toast('買下 ' + o.name + '，已放入背包');
        SFX.buy();
      }
    }
    renderRunShop();
  }

  function leaveRunShop() {
    if (SFX.setScene) SFX.setScene('battle');
    mode = 'play';
    showScreen(null);
    openTalents();
  }

  /* 小關（每 10 層）完成 → 詢問是否繼續 */
  function clearStage() {
    if (mode === 'stageclear' || mode === 'end' || mode === 'chapterclear') return;
    run.stageCleared = true;
    if (SFX.setScene) SFX.setScene('victory');
    run.keys.bronze = (run.keys.bronze || 0) + 2;
    if (stageInChapter(run.floor) >= SPC - 1) { chapterComplete(); return; }
    mode = 'stageclear';
    var reached = run.floor + 1;
    var ci = chapterIndex(run.floor) + 1;
    var st = stageInChapter(run.floor) + 1;
    var chapterDone = st === SPC;
    $('scTitle').textContent = chapterDone ? '第 ' + ci + ' 章 完成' : '第 ' + ci + ' 章 · 第 ' + st + ' 小關 完成';
    $('scSub').textContent = chapterDone
      ? '你打穿了這個章節，下一章是全新的敵人與場景'
      : '繼續前往下一個小關，或帶著獎勵離開';
    var rows = [
      ['抵達層數', reached],
      ['擊殺數', run.kills],
      ['鑰匙', '+' + run.keys],
      ['魔晶（離開時結算）', '≈ ' + Math.round((run.kills * 2 + reached * 8 + Math.floor(reached / FPS) * 40 + run.keys * 4) * run.diff.gems)]
    ];
    $('scStats').innerHTML = rows.map(function (r) {
      return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
    }).join('');
    $('btnStageNext').textContent = chapterDone ? '進入第 ' + (ci + 1) + ' 章' : '繼續下一小關';
    showScreen('screen-stageclear');
    SFX.win();
  }

  function stageNext() {
    if (mode !== 'stageclear') return;
    mode = 'play';
    showScreen(null);
    nextFloor();
    SFX.portal();
  }

  /* 打完首領後走進特殊傳送門 → 直接前往下一關 */
  function advanceAfterBoss() {
    if (!run) return;
    run.stageCleared = true;
    if (SFX.setScene) SFX.setScene('victory');
    if (stageInChapter(run.floor) >= SPC - 1) { chapterComplete(); return; }
    mode = 'play';
    showScreen(null);
    nextFloor();
    SFX.portal();
  }

  function endRun(quit) {
    if (mode === 'end') return;
    if (window.Ads && Ads.gameplayStop) Ads.gameplayStop();
    if (SFX.stopSiren) SFX.stopSiren();
    mode = 'end';
    var reached = run.floor + 1;
    var keys = totalKeys(run.keys);
    var gems = Math.round((run.kills * 2 + reached * 8 + Math.floor(reached / FPS) * 40 + keys * 4) * run.diff.gems);
    save.gems += gems;
    save.keys += keys;
    bankRunKeys();
    save.runSave = null;
    save.best = Math.max(save.best, reached);
    save.runs++;
    writeSave();

    $('endTitle').textContent = quit ? '帶著獎勵離開' : '你倒下了';
    $('endSub').textContent = '第 ' + reached + ' 層 · 第 ' + (chapterIndex(run.floor) + 1) + ' 章 ' +
      (stageInChapter(run.floor) + 1) + '/' + SPC + ' · ' + run.diff.name;
    var rows = [
      ['抵達層數', reached],
      ['擊殺數', run.kills],
      ['金幣', run.coins],
      ['鑰匙', '+' + keys + '（共 ' + save.keys + '）'],
      ['本輪魔晶', '+' + gems],
      ['魔晶總計', save.gems]
    ];
    $('endStats').innerHTML = rows.map(function (r) {
      return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
    }).join('');
    if (quit) SFX.level(); else SFX.die();
    showScreen('screen-end');
  }

  function startRun(heroId, diffId, chIdx, opts) {
    if (SFX.stopSiren) SFX.stopSiren();
    if (window.Ads && Ads.gameplayStart) Ads.gameplayStart();
    setTimeout(refreshBagBtn, 0);
    var h = HEROES[heroId] || HEROES.knight;
    if (!save.unlocked[h.id]) h = HEROES.knight;
    var diff = DIFFICULTY.filter(function (d) { return d.id === diffId; })[0] || DIFFICULTY[1];
    var startFloor = clamp(chIdx | 0, 0, CHAPTERS.length - 1) * FPS * SPC;
    keys = {};
    pending.dash = pending.skill = pending.interact = false;
    mouse.down = false;
    touch.move.on = false;
    touch.aim.on = false;

    run = {
      hero: h, player: makePlayer(h), diff: diff,
      floor: startFloor, coins: (save.up.coin || 0) * 40,
      kills: 0, shots: 0, keys: emptyKeys(), talents: {}, t: 0,
      walls: [], bg: null, tier: { name: themeFor(startFloor).name, accent: themeFor(startFloor).accent },
      roster: [], theme: themeFor(startFloor), stage: 1,
      enemies: [], bullets: [], pickups: [], parts: [], texts: [], items: [],
      props: [], clouds: [], beams: [], slashes: [], impacts: [], booms: [], muzzles: [], ultFx: [], ultQueue: [], nukes: [], nukesIn: [], nukeCall: null, alarmT: 0, rewindAnim: 0, rewindPending: null, flash: 0, introT: 1.0, floorIntro: 0, snapshots: [], snapT: 0, rewind: 1, hitstop: 0, dropFx: [], bossDeath: [], ruins: [], bag: [], blessings: [],
      portal: null, chest: null, swing: null, boss: null, torches: [], ultSword: null,
      cleared: false, stageCleared: false, bossDefeated: false,
      cam: { x: 0, y: 0, shake: 0 }
    };
    if (opts && opts.training) { run.training = true; run.enemies = []; }
    mode = 'play';
    showScreen(null);
    run.player.talents = run.talents;
    run.player.baseLuck = diff.luck;
    recalcStats(run.player);
    run.player.hp = run.player.maxHp;
    run.player.energy = run.player.maxEnergy;

    /* 出戰武器：已購買的付費 / 神話武器，以及究極核彈 */
    if (save.loadout) {
      var lw = null;
      if (save.loadout === D.ULTIMATE_WEAPON && save.ultimate) {
        lw = { id: D.ULTIMATE_WEAPON, rarity: 4 };
      } else {
        var lists = [save.mythicWeapons || [], save.forgedWeapons || []];
        for (var li = 0; li < lists.length && !lw; li++) {
          for (var i = 0; i < lists[li].length; i++) {
            if (lists[li][i].id === save.loadout) { lw = { id: save.loadout, rarity: lists[li][i].rarity || 5 }; break; }
          }
        }
        if (!lw && save.premiumWeapons && save.premiumWeapons[save.loadout]) lw = { id: save.loadout, rarity: 4 };
      }
      if (lw && WEAPONS[lw.id]) run.player.weapon = rollWeapon(lw.id, lw.rarity);
    }

      var hIc = $('skHeroIc');
      if (hIc && hIc.getContext) {
        var hg = hIc.getContext('2d');
        hg.clearRect(0, 0, 34, 34);
        Art.drawSkillIcon(hg, h.skill.kind, 17, 17, 1.7, h.palette.d);
      }
      var uIc = $('skUltIc');
      if (uIc && uIc.getContext) {
        var ug = uIc.getContext('2d');
        ug.clearRect(0, 0, 34, 34);
        Art.drawUltIcon(ug, ULT[h.id] ? ULT[h.id].kind : 'default', 17, 17, 1.7, h.palette.c);
      }
      /* 手機觸控鈕也要有圖標 */
      var tSk = $('tSkillIc');
      if (tSk && tSk.getContext) {
        var tg1 = tSk.getContext('2d');
        tg1.clearRect(0, 0, 40, 40);
        Art.drawSkillIcon(tg1, h.skill.kind, 20, 20, 2.0, h.palette.d);
      }
      var tUl = $('tUltIc');
      if (tUl && tUl.getContext) {
        var tg2 = tUl.getContext('2d');
        tg2.clearRect(0, 0, 40, 40);
        Art.drawUltIcon(tg2, ULT[h.id] ? ULT[h.id].kind : 'default', 20, 20, 2.0, h.palette.c);
      }

    buildFloor(startFloor);
    refreshEquipStrip();
    refreshWeaponCard();
    banner('第 ' + (startFloor + 1) + ' 層', themeFor(startFloor).name + ' · 關 1/3');
    SFX.startMusic();

    if (IS_TOUCH && !hintShown) {
      hintShown = true;
      var th = $('touchHint');
      if (th) {
        th.classList.remove('hidden');
        clearTimeout(hintTimer);
        hintTimer = setTimeout(hideTouchHint, 9000);
      }
    }
  }

  /* ---------------- 脫離卡死 ---------------- */
  function unstick() {
    if (!run) return;
    var p = run.player;
    var best = null, bestD = 1e9;
    for (var r = 0; r <= 260; r += 12) {
      for (var a = 0; a < TAU; a += Math.PI / 8) {
        var x = p.x + Math.cos(a) * r;
        var y = p.y + Math.sin(a) * r;
        if (x < WALLT + p.r + 4 || x > RW - WALLT - p.r - 4) continue;
        if (y < WALLT + p.r + 4 || y > RH - WALLT - p.r - 4) continue;
        if (hitWalls(x, y, p.r + 3, run.walls)) continue;
        var blocked = false;
        for (var i = 0; i < run.props.length; i++) {
          var pr = run.props[i];
          if (!pr.dead && Math.hypot(pr.x - x, pr.y - y) < pr.r + p.r + 3) { blocked = true; break; }
        }
        if (blocked) continue;
        var d = Math.hypot(x - p.x, y - p.y);
        if (d < bestD) { bestD = d; best = { x: x, y: y }; }
      }
      if (best) break;
    }
    if (!best) best = { x: RW / 2, y: RH / 2 };
    p.x = best.x;
    p.y = best.y;
    p.vx = 0; p.vy = 0;
    p.invuln = Math.max(p.invuln, 1.2);
    run.cam.x = clamp(p.x - VW / 2, 0, RW - VW);
    run.cam.y = clamp(p.y - VH / 2, 0, RH - VH);
    addParticles(p.x, p.y, 16, '#8cf0ff', { speed: 160 });
    SFX.portal();
    toast('已脫離卡點');
  }
  /* ------------------------------------------------------------------
     寶箱：三選一（絕不強制替換武器）
     ------------------------------------------------------------------ */
  var chestChoices = [];

  function openChest(chest) {
    if (!chest) return;
    var p = run.player;
    /* 粉紅寶箱：需要粉紅鎖匙，開出傳說或神話武器 */
    if (chest.pink) {
      if ((run.keys.pink || 0) <= 0) {
        toast('需要粉紅鎖匙（首領掉落）');
        SFX.dry();
        return;
      }
      run.keys.pink--;
      chest.open = true;
      var prRar = Math.random() < 0.25 ? 5 : 4;
      var prPool = D.weaponsOfTier(prRar);
      var prWid = prPool.length ? pick(prPool) : 'pistol';
      if (!run.bag) run.bag = [];
      if (run.bag.length < BAG_CAP) {
        run.bag.push({ id: prWid, rarity: prRar, uid: 'p' + Date.now().toString(36) });
      }
      var prRarDef = RARITY[prRar];
      run.bossDeath.push({ x: chest.x, y: chest.y, t: 0, max: 1.2, pink: true });
      run.impacts.push({ x: chest.x, y: chest.y, t: 0.5, max: 0.5, r: 140, color: prRarDef.color });
      run.cam.shake = Math.max(run.cam.shake, 8);
      addParticles(chest.x, chest.y, 34, prRarDef.color, { speed: 220 });
      banner('粉紅寶箱', prRarDef.name + '級 · ' + ((WEAPONS[prWid] || {}).name || '武器') + '（已放入背包）');
      SFX.win();
      return;
    }
    var tier = CHESTS[chest.tier] || CHESTS[0];
    /* 地城內的寶箱不需要鑰匙；只有局外寶庫的寶箱才要 */
    var list = [];

    var wr = rarityRoll(tier.rarityBonus, p.luckPct);
    var w1 = rollWeapon(pickWeaponForRarity(wr), wr);
    list.push({ kind: 'weapon', rarity: wr, weapon: w1 });

    /* 裝備機率調降（約 45%），其餘換成晶石補給 */
    if (Math.random() < 0.3) {
      var eq = rollEquip(rarityRoll(tier.rarityBonus * 0.7, p.luckPct));
      list.push({ kind: 'equip', rarity: eq.rarity, equip: eq });
    } else {
      list.push({
        kind: 'supply', rarity: 2,
        coins: randInt(tier.coins[0], tier.coins[1]) * 2,
        gems: randInt(6, 14) + chest.tier * 6,
        heal: 26 + run.floor
      });
    }
    /* 晶石補給（機率提高） */
    if (Math.random() < 0.75) {
      list.push({
        kind: 'supply', rarity: 1,
        coins: randInt(tier.coins[0], tier.coins[1]),
        gems: randInt(8, 18) + chest.tier * 8,
        heal: 18 + run.floor
      });
    }
    if (chest.tier >= 3) {
      var w2 = rollWeapon(pickWeaponForRarity(Math.min(5, rarityRoll(tier.rarityBonus + 0.15, p.luckPct) + 1)), Math.min(5, rarityRoll(tier.rarityBonus + 0.15, p.luckPct) + 1));
      list.push({ kind: 'weapon', rarity: w2.rarity, weapon: w2 });
    }

    chestChoices = list;
    mode = 'chest';
    renderChestModal(tier, list);
  }

  function closeChest() {
    var m = $('chestModal');
    if (m) m.classList.add('hidden');
    if (mode === 'chest') mode = 'play';
  }

  function renderChestModal(tier, list) {
    var m = $('chestModal');
    if (!m) return;
    $('chestTitle').textContent = tier.name;
    $('chestTitle').style.color = tier.accent;
    var wrap = $('chestCards');
    wrap.innerHTML = '';
    list.forEach(function (c, idx) {
      var rar = RARITY[c.rarity] || RARITY[0];
      var card = document.createElement('div');
      card.className = 'loot-card';
      card.style.setProperty('--rc', rar.color);
      var title = '', lines = [], iconKind = 'weapon', iconArg = 'pistol';

      if (c.kind === 'weapon') {
        title = c.weapon.name;
        lines = ['傷害 ' + c.weapon.dmg, '射速 ' + (1 / c.weapon.rate).toFixed(1) + '/秒'];
        iconArg = c.weapon.shape;
      } else if (c.kind === 'equip') {
        title = c.equip.name;
        lines = c.equip.stats.map(function (s) { return STATS[s.key].name + ' ' + STATS[s.key].fmt(s.value); });
        iconKind = 'equip';
        iconArg = c.equip.icon;
      } else {
        title = '補給';
        lines = ['金幣 +' + c.coins, '生命 +' + c.heal];
        iconKind = 'coin';
      }

      card.innerHTML =
        '<div class="loot-rar">' + rar.name + '</div>' +
        '<canvas class="loot-icon" width="56" height="56"></canvas>' +
        '<h4>' + title + '</h4>' +
        '<div class="loot-lines">' + lines.map(function (l) { return '<span>' + l + '</span>'; }).join('') + '</div>' +
        '<div class="loot-key">' + (idx + 1) + '</div>';

      var cvs = card.querySelector('.loot-icon');
      var g = cvs.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, 56, 56);
      Art.fillRR(g, 7, 7, 42, 42, 21, 'rgba(0,0,0,.32)');
      Art.glow(g, 28, 30, 24, rar.glow, 0.6);
      if (iconKind === 'weapon') Art.drawWeaponIcon(g, iconArg, 28, 30, 2.9, '#e7edfb');
      else if (iconKind === 'equip') Art.drawEquipIcon(g, iconArg, 28, 30, 2.3, '#e7edfb');
      else {
        Art.fillRR(g, 17, 19, 22, 22, 11, '#a8791d');
        Art.fillRR(g, 20, 22, 16, 16, 8, '#f3c250');
        Art.fillRR(g, 24, 26, 8, 8, 4, '#fff3cf');
      }

      card.addEventListener('click', function () { chooseChest(idx); });
      wrap.appendChild(card);
    });
    m.classList.remove('hidden');
  }

  function chooseChest(idx) {
    if (mode !== 'chest') return;
    var c = chestChoices[idx];
    if (!c) return;
    var p = run.player;
    if (c.kind === 'weapon') {
      if (!run.bag) run.bag = [];
      if (run.bag.length >= BAG_CAP) {
        /* 背包滿了：請玩家自己挑一件賣掉，再收下寶箱武器 */
        run.pendingBagWeapon = c.weapon;
        toast('背包已滿，請賣出一件武器');
        run.chest = null;
        chestChoices = [];
        closeChest();
        menuMode('bag');
        return;
      }
      run.bag.push({ id: c.weapon.id, rarity: c.weapon.rarity, uid: 'c' + Date.now().toString(36) });
      refreshBag();
      toast('已放入背包：' + c.weapon.name);
      SFX.buy();
    } else if (c.kind === 'equip') {
      addEquipment(c.equip);
      SFX.level();
    } else {
      run.coins += c.coins;
      p.hp = Math.min(p.maxHp, p.hp + c.heal);
      if (c.gems) {
        save.gems += c.gems;
        writeSave();
        addText(p.x, p.y - 30, '+' + c.gems + ' 魔晶', '#8cf0ff', 10);
      }
      SFX.heal();
      toast('+' + c.coins + ' 金幣' + (c.gems ? ' · +' + c.gems + ' 魔晶' : ''));
    }
    if (run.chest) run.chest.open = true;
    run.chest = null;
    chestChoices = [];
    closeChest();
  }

  /* ------------------------------------------------------------------
     互動
     ------------------------------------------------------------------ */
  var promptEl = $('prompt');
  var activePrompt = null;

  function updateInteract(p) {
    var best = null, bestD = 52, label = '';
    if (run.chest && !run.chest.open) {
      var d1 = Math.hypot(p.x - run.chest.x, p.y - (run.chest.y - 3));
      if (d1 < bestD) {
        best = run.chest; bestD = d1;
        label = run.chest.pink
          ? ((run.keys.pink || 0) > 0 ? '開啟粉紅寶箱' : '需要粉紅鎖匙')
          : '開啟寶箱';
      }
    }
    if (run.secretDoor) {
      var d3 = dist(p, run.secretDoor);
      if (d3 < bestD) { best = run.secretDoor; bestD = d3; label = '進入隱藏裂隙'; }
    }
    if (run.portal) {
      var dP = dist(p, run.portal);
      if (dP < bestD) {
        best = run.portal; bestD = dP;
        label = run.portal.bossExit ? '進入下一關'
          : (run.portal.shopExit ? '離開商店'
            : (run.cleared ? '進入傳送門' : '傳送門（淨空後開啟）'));
      }
    }
    for (var i = 0; i < run.items.length; i++) {
      var it = run.items[i];
      if (it.bought) continue;
      var d2 = dist(p, it);
      if (d2 < bestD) { best = it; bestD = d2; label = '購買 ' + it.name + ' · ' + it.price + ' 金幣'; }
    }
    activePrompt = best ? { target: best, label: label, dist: bestD } : null;

    /* 提示文字固定在畫面下方（不再跟著物件跑，避免與物件位置對不上） */
    if (promptEl) {
      if (activePrompt) {
        promptEl.classList.remove('hidden');
        promptEl.innerHTML = '<kbd>F</kbd>' + label;
      } else {
        promptEl.classList.add('hidden');
      }
    }

    if (pending.interact) {
      pending.interact = false;
      if (activePrompt) {
        var t = activePrompt.target;
        if (t === run.chest) openChest(t);
        else if (t === run.portal) {
          if (t.bossExit) advanceAfterBoss();
          else if (t.shopExit) openTalents();
          else {
            /* 商店每 5 層最多一次，其餘直接前往天賦 */
            var sinceShop = (run.lastShopFloor == null) ? 99 : (run.floor - run.lastShopFloor);
            if (sinceShop >= 5 && Math.random() < 0.55) {
              run.lastShopFloor = run.floor;
              enterShopRoom();
            } else {
              openTalents();
            }
          }
        }
        else if (t === run.secretDoor) enterSecret();
        else buyItem(t);
      }
    }
  }

  function buyItem(it) {
    if (it.bought) return;
    if (run.coins < it.price) { toast('金幣不足（需要 ' + it.price + '）'); SFX.dry(); return; }
    run.coins -= it.price;
    it.bought = true;
    var p = run.player;
    if (it.kind === 'heal') { p.hp = Math.min(p.maxHp, p.hp + 55); SFX.heal(); toast('生命 +55'); }
    else if (it.kind === 'equip') { addEquipment(rollEquip(rarityRoll(0.15, p.luckPct))); SFX.level(); }
    else if (it.weaponId) {
      var wFixed = WEAPONS[it.weaponId];
      if (wFixed) {
        p.weapon = rollWeapon(it.weaponId, it.rarity || 3);
        refreshWeaponCard();
        toast('取得 ' + (WEAPONS[it.weaponId] ? WEAPONS[it.weaponId].name : '武器'));
        SFX.buy();
      }
    }
    else {
      var w = rollWeapon(pickWeaponForRarity(rarityRoll(0.15, p.luckPct)), rarityRoll(0.15, p.luckPct));
      p.weapon = w;
      refreshWeaponCard();
      toast('取得 ' + w.name);
      SFX.buy();
    }
  }

  /* ------------------------------------------------------------------
     封面：公會大廳（人物 + 怪物 + 傳送門 + 視差）
     ------------------------------------------------------------------ */
  var COVER_HEROES = ['knight', 'mage', 'ranger', 'samurai', 'paladin', 'assassin', 'dragonkin'];
  var COVER_MONSTERS = ['slime', 'bat', 'skel', 'golem', 'plague', 'mech', 'wraith'];
  var COVER_ORDER = ['dungeon', 'sky', 'city', 'heaven', 'lava', 'void'];
  var coverForce = -1;
  (function () {
    var mm = location.search.match(/[?&]cover=(\d+)/);
    if (mm) coverForce = parseInt(mm[1], 10) % COVER_ORDER.length;
  })();

  function mixHex(a, b, k) {
    var na = parseInt(a.slice(1), 16), nb = parseInt(b.slice(1), 16);
    var ar = (na >> 16) & 255, ag = (na >> 8) & 255, ab = na & 255;
    var br = (nb >> 16) & 255, bg = (nb >> 8) & 255, bb = nb & 255;
    return 'rgb(' + Math.round(ar + (br - ar) * k) + ',' +
      Math.round(ag + (bg - ag) * k) + ',' + Math.round(ab + (bb - ab) * k) + ')';
  }

  function drawCover(t) {
    var W = VW, H = VH;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);

    var px = 0, py = 0;
    if (!IS_TOUCH) {
      px = mouse.x / W - 0.5;
      py = mouse.y / H - 0.5;
    }

    /* 每 8 秒換一個場景主題，最後 30% 時間平滑過渡 */
    var seg = 8;
    var idx = coverForce >= 0 ? coverForce : Math.floor(t / seg) % COVER_ORDER.length;
    var nidx = (idx + 1) % COVER_ORDER.length;
    var raw = (t % seg) / seg;
    var k = raw < 0.7 ? 0 : (raw - 0.7) / 0.3;
    var A = THEMES[COVER_ORDER[idx]] || THEMES.dungeon;
    var B = THEMES[COVER_ORDER[nidx]] || A;
    var accent = mixHex(A.accent, B.accent, k);
    var sky0 = mixHex(A.sky[0], B.sky[0], k);
    var sky1 = mixHex(A.sky[1], B.sky[1], k);

    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, sky0);
    g.addColorStop(0.55, sky1);
    g.addColorStop(1, '#05030a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* 流動極光：讓背景不會是單調黑紫 */
    for (var a = 0; a < 3; a++) {
      var ax = W * (0.22 + a * 0.28) + Math.sin(t * 0.25 + a * 1.7) * 46;
      var ay = H * (0.24 + a * 0.13) + Math.cos(t * 0.2 + a) * 22;
      Art.glow(ctx, ax, ay, 140, accent, 0.17);
      Art.glow(ctx, ax + 64, ay + 36, 96, mixHex(A.accent, '#ffffff', 0.45), 0.09);
    }

    /* 主題裝飾層 */
    var deco = A.deco;
    if (deco === 'window') {
      for (var bld = 0; bld < 10; bld++) {
        var bw = 34 + ((bld * 37) % 30);
        var bh = 44 + ((bld * 53) % 74);
        var bx = bld * 54 - 26 - px * 22;
        ctx.fillStyle = 'rgba(5,7,14,.72)';
        ctx.fillRect(bx, H - bh - 10, bw, bh + 10);
        for (var wy = 0; wy < Math.floor(bh / 12); wy++) {
          for (var wx = 0; wx < Math.floor(bw / 10); wx++) {
            if ((bld * 7 + wy * 3 + wx) % 5 === 0) {
              ctx.fillStyle = 'rgba(120,200,255,.20)';
              ctx.fillRect(bx + 4 + wx * 10, H - bh - 4 + wy * 12, 4, 4);
            }
          }
        }
      }
    } else if (deco === 'cloud') {
      for (var cl = 0; cl < 7; cl++) {
        var cxx = ((cl * 97 + t * 7) % (W + 140)) - 70 - px * 16;
        var cyy = 36 + (cl * 37) % 120;
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = '#bfe8ff';
        ctx.beginPath();
        ctx.ellipse(cxx, cyy, 52, 16, 0, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else if (deco === 'ray') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var ry = 0; ry < 6; ry++) {
        var lx = 20 + ry * 84 + Math.sin(t * 0.3 + ry) * 14;
        var lg = ctx.createLinearGradient(lx, 0, lx + 54, H);
        lg.addColorStop(0, 'rgba(255,235,170,.16)');
        lg.addColorStop(1, 'rgba(255,235,170,0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(lx, 0); ctx.lineTo(lx + 22, 0); ctx.lineTo(lx + 84, H); ctx.lineTo(lx + 52, H);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    } else if (deco === 'star') {
      for (var st = 0; st < 46; st++) {
        var sx = (st * 131) % W, sy = (st * 71) % (H * 0.72);
        ctx.globalAlpha = 0.2 + 0.55 * Math.abs(Math.sin(t * 1.4 + st));
        ctx.fillStyle = st % 6 === 0 ? '#e2d4ff' : '#ffffff';
        ctx.fillRect(sx | 0, sy | 0, 1, 1);
      }
      ctx.globalAlpha = 1;
    } else if (deco === 'ember') {
      Art.glow(ctx, W / 2, H * 0.98, 230, 'rgba(255,120,40,.32)', 0.6);
      for (var bk = 0; bk < 14; bk++) {
        var bx2 = ((bk * 89 + t * 22) % (W + 30)) - 15;
        var by2 = H - ((bk * 53 + t * 44) % (H * 0.4));
        ctx.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(t + bk));
        ctx.fillStyle = bk % 3 === 0 ? '#ffd166' : '#ff7a3c';
        ctx.fillRect(bx2 | 0, by2 | 0, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    /* 傳送門 */
    ctx.save();
    ctx.translate(-px * 10, -py * 6);
    Art.glow(ctx, W * 0.5, H * 0.42, 160, accent, 0.45);
    Art.glow(ctx, W * 0.5, H * 0.42, 64, 'rgba(255,255,255,.28)', 0.5);
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.42, 46 + i * 14, t * 0.35 + i * 2, t * 0.35 + i * 2 + Math.PI * 1.35);
      ctx.strokeStyle = i === 1 ? 'rgba(255,255,255,.45)' : accent;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    /* 地面 */
    Art.glow(ctx, W * 0.5, H * 0.99, 190, accent, 0.5);
    var fg = ctx.createLinearGradient(0, H * 0.86, 0, H);
    fg.addColorStop(0, 'rgba(4,3,8,0)');
    fg.addColorStop(1, 'rgba(4,3,8,.92)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, H * 0.86, W, H * 0.14);

    var pl = ctx.createRadialGradient(W * 0.5, 258, 8, W * 0.5, 258, 250);
    pl.addColorStop(0, accent);
    pl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = pl;
    ctx.fillRect(0, 196, W, 74);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.fillRect(0, 258, W, 1);

    /* 英雄（放大，站在底部） */
    var lineup = COVER_HEROES.slice();
    if (heroSel && lineup.indexOf(heroSel) < 0) lineup[lineup.length - 1] = heroSel;
    for (var h = 0; h < lineup.length; h++) {
      var hero = HEROES[lineup[h]] || HEROES.knight;
      var hxx = 58 + h * 38 + px * 12;
      var hyy = 256 - Math.abs(Math.sin(t * 1.5 + h * 0.9)) * 2;
      ctx.save();
      ctx.translate(hxx, hyy);
      ctx.scale(2.25, 2.25);
      Art.drawHero(ctx, hero.kind, 0, 0, t + h * 0.7, 1, Math.sin(t * 1.5 + h) > 0.9 ? 1 : 0, {}, hero.palette);
      ctx.restore();
    }

    /* 怪物（右側） */
    for (var m = 0; m < COVER_MONSTERS.length; m++) {
      var mk = COVER_MONSTERS[m];
      var def = ENEMIES[mk];
      if (!def) continue;
      var mx = 300 + (m % 4) * 44 + px * 22;
      var my0 = m >= 4 ? 198 : 256;
      var bob = Math.sin(t * 2 + m * 1.3) * 2;
      var isFly = def.arch === 'flyer';
      var my = (isFly ? my0 - 32 : my0) + bob;
      Art.drawEnemy(ctx, def.arch, mx, my, t + m, -1, 0, 0.6, def.pal, isFly ? 1.6 : 1.5);
    }

    /* 前景火星 */
    for (var e = 0; e < 26; e++) {
      var ex = ((e * 97 + t * (10 + (e % 5) * 4)) % (W + 40)) - 20;
      var ey = H - ((e * 53 + t * (16 + (e % 4) * 6)) % (H * 0.8));
      ctx.globalAlpha = 0.16 + 0.42 * Math.abs(Math.sin(t * 2 + e));
      ctx.fillStyle = e % 4 === 0 ? accent : '#ffffff';
      var sz = e % 3 === 0 ? 2 : 1;
      ctx.fillRect(ex | 0, ey | 0, sz, sz);
      ctx.globalAlpha = 1;
    }
  }

  /* ------------------------------------------------------------------
     繪圖
     ------------------------------------------------------------------ */
  /* 大招演出（每個 kind 一套） */
  function drawUltFx(f) {
    var k = clamp(f.t / f.max, 0, 1);
    var fade = 1 - k;
    var c = f.color || '#ffe6a1';
    ctx.save();
    switch (f.kind) {
      case 'meteor': {
        for (var m = 0; m < 3; m++) {
          var ma = f.ang + (m - 1) * 0.4;
          var mx = f.x + Math.cos(ma) * (115 + m * 45);
          var my = f.y + Math.sin(ma) * (115 + m * 45) - (1 - k) * 180;
          Art.glow(ctx, mx, my, 26, 'rgba(255,140,60,.9)', fade);
          ctx.fillStyle = '#ffd166';
          ctx.beginPath();
          ctx.arc(mx, my, 7 + (1 - k) * 5, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,120,50,' + fade + ')';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx - Math.cos(ma) * 0.001, my - 60);
          ctx.stroke();
        }
        break;
      }
      case 'arrowrain': {
        for (var a = 0; a < 14; a++) {
          var aa = f.ang + (a - 7) * 0.13;
          var len = 40 + k * 240;
          ctx.strokeStyle = 'rgba(140,255,200,' + fade + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(f.x + Math.cos(aa) * 12, f.y + Math.sin(aa) * 12);
          ctx.lineTo(f.x + Math.cos(aa) * len, f.y + Math.sin(aa) * len);
          ctx.stroke();
        }
        break;
      }
      case 'bastion': {
        ctx.globalAlpha = fade * 0.6;
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 40 + k * 60, 0, TAU);
        ctx.stroke();
        for (var p2 = 0; p2 < 4; p2++) {
          var pa = p2 * Math.PI / 2 + 0.4;
          ctx.fillStyle = 'rgba(255,230,161,' + (fade * 0.5) + ')';
          ctx.fillRect(f.x + Math.cos(pa) * 40 - 3, f.y - 120 + k * 60, 6, 120);
        }
        break;
      }
      case 'mark': {
        ctx.strokeStyle = 'rgba(180,120,255,' + fade + ')';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(f.x - 60, f.y - 60); ctx.lineTo(f.x + 60, f.y + 60);
        ctx.moveTo(f.x + 60, f.y - 60); ctx.lineTo(f.x - 60, f.y + 60);
        ctx.stroke();
        break;
      }
      case 'orbital': {
        for (var o = 0; o < 6; o++) {
          var ox = f.x + (o - 2.5) * 44;
          ctx.fillStyle = 'rgba(140,240,255,' + (fade * 0.75) + ')';
          ctx.fillRect(ox - 5, 0, 10, f.y + 30);
        }
        break;
      }
      case 'shockwave': {
        for (var s2 = 0; s2 < 3; s2++) {
          var sk = clamp(k * 1.6 - s2 * 0.2, 0, 1);
          ctx.globalAlpha = (1 - sk) * 0.8;
          ctx.strokeStyle = c;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(f.x, f.y, 20 + sk * 260, 0, TAU);
          ctx.stroke();
        }
        break;
      }
      case 'legion': {
        for (var l = 0; l < 24; l++) {
          var la = l * TAU / 24 + k * 2.2;
          var lr = k * 170;
          ctx.globalAlpha = fade;
          Art.glow(ctx, f.x + Math.cos(la) * lr, f.y + Math.sin(la) * lr, 10, '#b07cf0', 0.8);
        }
        break;
      }
      case 'bloodrage': {
        ctx.globalAlpha = fade * 0.55;
        ctx.fillStyle = '#ff3b3b';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 34 + Math.sin(k * 12) * 6, 0, TAU);
        ctx.fill();
        for (var b2 = 0; b2 < 10; b2++) {
          ctx.fillStyle = 'rgba(255,80,60,' + fade + ')';
          ctx.fillRect(f.x + (b2 - 5) * 12, f.y + 20 - k * 90 - (b2 % 3) * 14, 3, 10);
        }
        break;
      }
      case 'philosopher': {
        for (var g2 = 0; g2 < 7; g2++) {
          var ga = g2 * TAU / 7;
          var gr = 50 + k * 90;
          Art.glow(ctx, f.x + Math.cos(ga) * gr, f.y + Math.sin(ga) * gr, 30, 'rgba(120,220,90,.7)', fade * 0.8);
        }
        break;
      }
      case 'forest': {
        for (var t2 = 0; t2 < 10; t2++) {
          var ta = t2 * TAU / 10 + 0.3;
          var tx2 = f.x + Math.cos(ta) * (40 + k * 120);
          var h2 = 30 + k * 60;
          ctx.strokeStyle = 'rgba(110,230,140,' + fade + ')';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(tx2, f.y + 10);
          ctx.quadraticCurveTo(tx2 + 10, f.y - h2 * 0.6, tx2 + 4, f.y - h2);
          ctx.stroke();
        }
        break;
      }
      case 'iai': {
        for (var i2 = 0; i2 < 3; i2++) {
          var ik = clamp(k * 1.5 - i2 * 0.18, 0, 1);
          ctx.globalAlpha = (1 - ik) * 0.9;
          ctx.strokeStyle = '#dff6ff';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(f.x, f.y, 60 + ik * 90, f.ang - 1.2, f.ang + 1.2);
          ctx.stroke();
        }
        break;
      }
      case 'waltz': {
        for (var w2 = 0; w2 < 26; w2++) {
          var wa = w2 * TAU / 26 + k * 4;
          var wr = 20 + k * 150;
          ctx.fillStyle = '#ffe6a1';
          ctx.globalAlpha = fade;
          ctx.fillRect(f.x + Math.cos(wa) * wr - 2, f.y + Math.sin(wa) * wr - 2, 4, 4);
        }
        break;
      }
      case 'smite': {
        for (var sm = 0; sm < 6; sm++) {
          var smx = f.x + ((sm * 53) % 220) - 110;
          ctx.globalAlpha = fade * 0.8;
          ctx.fillStyle = 'rgba(255,240,190,.8)';
          ctx.fillRect(smx - 4, 0, 8, f.y + 40);
        }
        break;
      }
    }
    ctx.restore();
  }

  /* 回聲倒帶：巨大時鐘往回走 */
  function drawRewindClock(t) {
    var k = 1 - clamp(t, 0, 1);
    var cx = VW / 2, cy = VH / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(40,10,60,.55)';
    ctx.fillRect(0, 0, VW, VH);
    /* 放射線 */
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = 'rgba(200,150,255,.45)';
    for (var i = 0; i < 24; i++) {
      var a = i / 24 * TAU + k * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
      ctx.lineTo(cx + Math.cos(a) * 320, cy + Math.sin(a) * 320);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    /* 鐘面 */
    var R = 78;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = 'rgba(12,8,20,.88)'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#c9a6ff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R - 6, 0, TAU);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(200,150,255,.4)'; ctx.stroke();
    /* 刻度 */
    for (var s2 = 0; s2 < 12; s2++) {
      var sa = s2 / 12 * TAU;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(sa) * (R - 12), cy + Math.sin(sa) * (R - 12));
      ctx.lineTo(cx + Math.cos(sa) * (R - 3), cy + Math.sin(sa) * (R - 3));
      ctx.lineWidth = s2 % 3 === 0 ? 3 : 1.5;
      ctx.strokeStyle = s2 % 3 === 0 ? '#ffe6a1' : 'rgba(220,210,255,.5)';
      ctx.stroke();
    }
    /* 指針：逆時針旋轉 */
    var handA = -k * TAU * 1.6 - Math.PI / 2;
    ctx.strokeStyle = '#ff5ce0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(handA) * (R - 20), cy + Math.sin(handA) * (R - 20)); ctx.stroke();
    ctx.strokeStyle = '#ffe6a1'; ctx.lineWidth = 3;
    var handB = -k * TAU * 3.6 - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(handB) * (R - 34), cy + Math.sin(handB) * (R - 34)); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, TAU); ctx.fill();
    /* 文字 */
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Noto Sans TC", sans-serif';
    ctx.fillStyle = '#e2d4ff';
    ctx.shadowColor = 'rgba(200,150,255,.9)'; ctx.shadowBlur = 12;
    ctx.fillText('回 聲 倒 帶', cx, cy + R + 28);
    ctx.shadowBlur = 0;
    ctx.font = '9px "Noto Sans TC", sans-serif';
    ctx.fillStyle = 'rgba(220,210,255,.85)';
    ctx.fillText('時間倒流中…', cx, cy + R + 44);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  /* 進入新樓層的轉場卡 */
  function drawFloorIntro(k) {
    /* k: 0 → 1 */
    var ease = k < 0.25 ? k / 0.25 : (k > 0.8 ? (1 - k) / 0.2 : 1);
    var acc = (run.theme && run.theme.accent) || '#a07bff';
    ctx.save();
    ctx.fillStyle = 'rgba(4,3,8,' + (0.55 * ease).toFixed(3) + ')';
    ctx.fillRect(0, 0, VW, VH);
    /* 斜切色帶 */
    var by = VH * 0.36, bh = VH * 0.28;
    ctx.fillStyle = 'rgba(10,7,18,' + (0.92 * ease).toFixed(3) + ')';
    ctx.fillRect(0, by, VW, bh);
    ctx.fillStyle = acc;
    ctx.globalAlpha = 0.9 * ease;
    ctx.fillRect(0, by, VW, 2);
    ctx.fillRect(0, by + bh - 2, VW, 2);
    ctx.globalAlpha = 1;
    /* 掃描光 */
    var sx = ((k * 1.6) % 1) * VW;
    var lg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,.16)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, by, VW, bh);
    /* 文字 */
    ctx.globalAlpha = ease;
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "Noto Sans TC", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = acc;
    ctx.shadowBlur = 14;
    ctx.fillText('第 ' + (run.floor + 1) + ' 層', VW / 2, by + bh * 0.52);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 10px "Noto Sans TC", sans-serif';
    ctx.fillStyle = acc;
    ctx.fillText(((run.theme && run.theme.name) || '') + ' · 小關 ' + (stageInChapter(run.floor) + 1) + '/3', VW / 2, by + bh * 0.78);
    /* 進度條 */
    var pw = VW * 0.46, px2 = (VW - pw) / 2, py2 = by + bh - 12;
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.fillRect(px2, py2, pw, 3);
    ctx.fillStyle = acc;
    ctx.fillRect(px2, py2, pw * Math.min(1, k * 1.2), 3);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* 可互動物件的地面提示圈（畫在世界座標，和物件完全對齊） */
  function drawInteractHints() {
    var p = run.player;
    var list = [];
    if (run.chest && !run.chest.open) list.push({ x: run.chest.x, y: run.chest.y });
    if (run.secretDoor) list.push({ x: run.secretDoor.x, y: run.secretDoor.y });
    for (var i = 0; i < run.items.length; i++) {
      if (!run.items[i].bought) list.push({ x: run.items[i].x, y: run.items[i].y });
    }
    for (var k = 0; k < list.length; k++) {
      var o = list[k];
      var d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d > 120) continue;
      var near = d < 52;
      var pulse = 0.5 + Math.sin(time * 5) * 0.5;
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.strokeStyle = near ? 'rgba(255,230,161,.95)' : 'rgba(255,230,161,.32)';
      ctx.lineWidth = near ? 1.5 : 1;
      var rr = 15 + (near ? pulse * 2.5 : 0);
      ctx.beginPath();
      ctx.ellipse(0, 4, rr, rr * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (near) {
        var by = -26 - pulse * 2;
        ctx.fillStyle = 'rgba(8,6,14,.92)';
        ctx.strokeStyle = 'rgba(243,194,80,.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-9, by - 8, 18, 13, 3);
        else ctx.rect(-9, by - 8, 18, 13);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffe6a1';
        ctx.font = 'bold 9px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('F', 0, by + 1);
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }
  }

  /* 首領死亡動畫 + 掉落物動畫 */
  function drawBossDeathAndDrops() {
    if (run.bossDeath) {
      for (var b = 0; b < run.bossDeath.length; b++) {
        var d = run.bossDeath[b];
        var k = d.t / d.max;
        ctx.save();
        ctx.translate(d.x, d.y);
        /* 三層擴散衝擊環 */
        for (var r = 0; r < 3; r++) {
          var kk = clamp(k * 1.25 - r * 0.18, 0, 1);
          if (kk <= 0 || kk >= 1) continue;
          ctx.globalAlpha = (1 - kk) * 0.75;
          ctx.strokeStyle = r === 0 ? '#fff2c8' : (r === 1 ? '#ff8a5c' : '#b07cf0');
          ctx.lineWidth = 5 * (1 - kk) + 1;
          ctx.beginPath();
          ctx.arc(0, 0, 18 + kk * 150, 0, Math.PI * 2);
          ctx.stroke();
        }
        /* 垂直光柱 */
        if (k < 0.6) {
          var lg = ctx.createLinearGradient(0, -220, 0, 0);
          lg.addColorStop(0, 'rgba(255,240,200,0)');
          lg.addColorStop(1, 'rgba(255,240,200,' + (0.55 * (1 - k / 0.6)).toFixed(3) + ')');
          ctx.globalAlpha = 1;
          ctx.fillStyle = lg;
          ctx.fillRect(-26 * (1 - k), -220, 52 * (1 - k), 220);
        }
        /* 爆炸碎片 */
        ctx.globalAlpha = 1;
        for (var s = 0; s < 14; s++) {
          var a = s / 14 * Math.PI * 2 + k * 2.2;
          var rr = 12 + k * 120;
          ctx.fillStyle = s % 2 ? '#ffd166' : '#ff5d4a';
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.fillRect(Math.cos(a) * rr - 2, Math.sin(a) * rr - 2, 4, 4);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
    if (run.dropFx) {
      for (var i = 0; i < run.dropFx.length; i++) {
        var w = run.dropFx[i];
        var rar = RARITY[w.rarity] || RARITY[0];
        ctx.save();
        ctx.translate(w.x, w.y);
        if (w.pickup) {
          var pul = 0.6 + Math.sin(time * 6 + i) * 0.4;
          Art.glow(ctx, 0, 0, 18, rar.color, 0.35 + pul * 0.3);
          Art.drawWeaponIcon(ctx, (WEAPONS[w.weapon] || {}).shape || 'pistol', 0, 0, 1.5, rar.color, rar.rarity, w.weapon);
          /* 稀有度光柱 */
          ctx.globalAlpha = 0.35 + pul * 0.25;
          var g2 = ctx.createLinearGradient(0, -40, 0, 0);
          g2.addColorStop(0, 'rgba(255,255,255,0)');
          g2.addColorStop(1, rar.color);
          ctx.fillStyle = g2;
          ctx.fillRect(-5, -40, 10, 40);
          ctx.globalAlpha = 1;
        } else {
          ctx.rotate(w.spin);
          Art.glow(ctx, 0, 0, 22, rar.color, 0.8);
          Art.drawWeaponIcon(ctx, (WEAPONS[w.weapon] || {}).shape || 'pistol', 0, 0, 1.7, rar.color);
        }
        ctx.restore();
      }
    }
  }

  /* 粉紅寶箱（需要粉紅鎖匙） */
  function drawPinkChest(chest) {
    var x = chest.x, y = chest.y;
    var bob = Math.sin(time * 3) * 1.2;
    Art.glow(ctx, x, y - 6 + bob, 30, 'rgba(255,59,212,.6)', 0.7);
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = '#7a1a5a';
    ctx.fillRect(-11, -8, 22, 12);
    ctx.fillStyle = '#ff3bd4';
    ctx.fillRect(-11, -8, 22, 3);
    ctx.fillRect(-2, -8, 4, 12);
    ctx.fillStyle = '#ffd1f4';
    ctx.fillRect(-3, -4, 6, 3);
    if (!chest.open) {
      ctx.fillStyle = '#a82484';
      ctx.fillRect(-11, -13, 22, 5);
      ctx.fillStyle = '#ff8ce8';
      ctx.fillRect(-4, -12, 8, 2);
    }
    ctx.restore();
  }

  /* 商店房間的裝飾：地毯、貨架、吊燈 */
  function drawShopDecor() {
    var cx = RW / 2;
    /* 地毯 */
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#5a1f2e';
    ctx.beginPath();
    ctx.ellipse(cx, RH / 2 + 6, 150, 54, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#c9971f';
    ctx.beginPath();
    ctx.ellipse(cx, RH / 2 + 6, 128, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    /* 兩側貨架 */
    for (var side = -1; side <= 1; side += 2) {
      var sx = cx + side * 170;
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(sx - 26, RH / 2 - 76, 52, 8);
      ctx.fillRect(sx - 26, RH / 2 - 30, 52, 8);
      ctx.fillRect(sx - 28, RH / 2 - 80, 5, 84);
      ctx.fillRect(sx + 23, RH / 2 - 80, 5, 84);
      for (var it = 0; it < 3; it++) {
        ctx.fillStyle = ['#8a5a2a', '#6a4a92', '#2f6a4a'][it];
        ctx.fillRect(sx - 20 + it * 15, RH / 2 - 90, 11, 12);
      }
    }
    /* 吊燈 */
    for (var l = 0; l < 3; l++) {
      var lx = cx - 110 + l * 110;
      Art.glow(ctx, lx, 40, 46, 'rgba(255,200,110,.55)', 0.6);
      ctx.fillStyle = '#ffe6a1';
      ctx.beginPath();
      ctx.arc(lx, 40, 5 + Math.sin(time * 2 + l) * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,90,50,.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, 34);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* 商店房間裡的商人（純裝飾，購買用商品） */
  function drawMerchant(x, y) {
    var bob = Math.sin(time * 2) * 1.5;
    ctx.save();
    ctx.translate(x, y + bob);
    Art.glow(ctx, 0, -6, 34, 'rgba(255,214,120,.5)', 0.6);
    ctx.fillStyle = '#3a2a5a';
    ctx.beginPath();
    ctx.moveTo(-12, 12); ctx.lineTo(-7, -10); ctx.lineTo(7, -10); ctx.lineTo(12, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6a4a92';
    ctx.fillRect(-5, -8, 10, 18);
    ctx.fillStyle = '#241a3a';
    ctx.beginPath();
    ctx.arc(0, -13, 8, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-8, -13, 16, 5);
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(-3, -12, 2, 2);
    ctx.fillRect(1, -12, 2, 2);
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(13, 3, 4, 0, Math.PI * 2);
    ctx.fill();
    Art.glow(ctx, 13, 3, 16, 'rgba(255,180,90,.7)', 0.8);
    ctx.restore();
  }

  function render() {
    /* 每幀完整重置繪圖狀態（部分瀏覽器出錯後會殘留旋轉/位移/混合模式） */
    try { if (typeof ctx.reset === 'function') ctx.reset(); } catch (eR) {}
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    try { ctx.setLineDash([]); } catch (eL) {}
    ctx.clearRect(0, 0, VW, VH);
    if (!run) return;

    var cam = run.cam;
    var shx = (Math.random() - 0.5) * cam.shake;
    var shy = (Math.random() - 0.5) * cam.shake;

    ctx.save();
    ctx.translate(-Math.round(cam.x + shx), -Math.round(cam.y + shy));

    ctx.drawImage(run.bg, 0, 0);
    drawRuins();

    for (var t = 0; t < run.torches.length; t++) Art.drawTorch(ctx, run.torches[t].x, run.torches[t].y, time);
    if (run.portal) Art.drawPortal(ctx, run.portal.x, run.portal.y, time, run.portal.color);
    if (run.portal && run.portal.bossExit) {
      /* 首領傳送門：外圈脈動 + 上升光束，和普通傳送門區分 */
      var kp = 0.5 + Math.sin(time * 4) * 0.5;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,122,60,' + (0.5 + kp * 0.5).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(run.portal.x, run.portal.y, 26 + kp * 6, (26 + kp * 6) * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      var bg3 = ctx.createLinearGradient(0, run.portal.y - 120, 0, run.portal.y);
      bg3.addColorStop(0, 'rgba(255,122,60,0)');
      bg3.addColorStop(1, 'rgba(255,180,90,' + (0.25 + kp * 0.2).toFixed(2) + ')');
      ctx.fillStyle = bg3;
      ctx.fillRect(run.portal.x - 14, run.portal.y - 120, 28, 120);
      ctx.restore();
    }
    if (run.chest) {
      if (run.chest.pink) drawPinkChest(run.chest);
      else Art.drawChest(ctx, run.chest.x, run.chest.y, time, run.chest.open, run.chest.tier);
    }
    if (run.secretDoor) Art.drawSecretDoor(ctx, run.secretDoor.x, run.secretDoor.y, time, '#ff5ce0');
    for (var s = 0; s < run.items.length; s++) drawShopItem(run.items[s]);
    if (run.shopRoom) drawShopDecor();
    if (run.merchant) drawMerchant(run.merchant.x, run.merchant.y);
    drawInteractHints();
    drawBossDeathAndDrops();

    for (var pr = 0; pr < run.props.length; pr++) {
      var prop = run.props[pr];
      if (prop.dead) continue;
      Art.drawProp(ctx, prop.type, prop.x, prop.y, time, prop.flash);
      if (prop.flash > 0) prop.flash = Math.max(0, prop.flash - 0.08);
    }

    for (var k = 0; k < run.pickups.length; k++) {
      var pk = run.pickups[k];
      Art.drawPickup(ctx, pk.type, pk.x, pk.y, time + pk.t);
    }

    /* 大招演出 */
    for (var uf = 0; uf < run.ultFx.length; uf++) drawUltFx(run.ultFx[uf]);

    /* 槍口特效（依武器家族不同） */
    for (var mzf = 0; mzf < run.muzzles.length; mzf++) {
      var mz2 = run.muzzles[mzf];
      var mk2 = 1 - mz2.t / mz2.max;
      ctx.save();
      ctx.translate(mz2.x, mz2.y);
      ctx.rotate(mz2.ang);
      ctx.globalAlpha = mk2;
      if (mz2.family === 'cannon') {
        Art.glow(ctx, 6, 0, 16, mz2.color, 0.9);
        ctx.fillStyle = '#fff3cf';
        ctx.beginPath(); ctx.arc(4, 0, 7 * mk2 + 2, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath(); ctx.arc(11, 0, 4 * mk2, 0, TAU); ctx.fill();
      } else if (mz2.family === 'gun') {
        ctx.fillStyle = mz2.color;
        ctx.beginPath();
        ctx.moveTo(0, -3); ctx.lineTo(13 * mk2 + 4, 0); ctx.lineTo(0, 3);
        ctx.closePath(); ctx.fill();
      } else if (mz2.family === 'bow') {
        ctx.strokeStyle = 'rgba(255,255,255,.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke();
        ctx.fillStyle = mz2.color;
        ctx.fillRect(2, -1, 9 * mk2, 2);
      } else if (mz2.family === 'magic') {
        ctx.strokeStyle = mz2.color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(2, 0, 5 + 6 * (1 - mk2), 0, TAU); ctx.stroke();
        Art.glow(ctx, 2, 0, 12, mz2.color, mk2);
      }
      ctx.restore();
    }

    /* 天罰聖劍：巨劍從天而降 */
    if (run.ultSword) {
      var us2 = run.ultSword;
      var uk = clamp(us2.t / us2.max, 0, 1);
      var dropY = us2.y - 300 + Math.min(1, uk * 1.6) * 300;
      ctx.save();
      ctx.translate(us2.x, dropY);
      ctx.rotate(-0.12);
      var lg2 = ctx.createLinearGradient(0, -300, 0, 10);
      lg2.addColorStop(0, 'rgba(255,230,161,0)');
      lg2.addColorStop(1, 'rgba(255,230,161,.9)');
      ctx.fillStyle = lg2;
      ctx.fillRect(-28, -300, 56, 310);
      if (Art.texReady('sword')) {
        /* 使用 CC0 巨劍貼圖（劍尖朝下） */
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 0.97;
        ctx.save();
        ctx.rotate(Math.PI);
        ctx.drawImage(Art.TEX.sword, 0, 0, 256, 256, -75, -75, 150, 150);
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#c8b070';
        ctx.fillRect(-30, 44, 60, 9);
      } else {
        ctx.fillStyle = '#f7f1d8';
        ctx.beginPath();
        ctx.moveTo(0, -78); ctx.lineTo(15, -22); ctx.lineTo(15, 44); ctx.lineTo(-15, 44); ctx.lineTo(-15, -22);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.fillRect(-3, -74, 6, 112);
        ctx.fillStyle = '#c8b070';
        ctx.fillRect(-30, 44, 60, 9);
        ctx.fillRect(-5, 53, 10, 30);
        ctx.fillStyle = '#8a6a2a';
        ctx.fillRect(-8, 80, 16, 7);
      }
      ctx.restore();
      if (uk > 0.8) {
        ctx.save();
        ctx.globalAlpha = (1 - uk) * 1.4;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(us2.x - 90, us2.y - 90, 180, 180);
        ctx.restore();
      }
    }

    /* 進入新樓層轉場 */
    if (run.floorIntro > 0) drawFloorIntro(1 - clamp(run.floorIntro / 1.35, 0, 1));

    /* 核彈來襲警報 */
    if (run.nukeCall) {
      var nkCnt = Math.max(0, run.nukeCall.t);
      ctx.save();
      var pulse = 0.16 + Math.abs(Math.sin(time * 8)) * 0.2;
      var vg2 = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.22, VW / 2, VH / 2, VW * 0.78);
      vg2.addColorStop(0, 'rgba(255,0,0,0)');
      vg2.addColorStop(1, 'rgba(255,30,30,' + pulse.toFixed(3) + ')');
      ctx.fillStyle = vg2;
      ctx.fillRect(0, 0, VW, VH);
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#ff5a5a';
      ctx.shadowColor = 'rgba(255,60,60,.95)';
      ctx.shadowBlur = 14;
      ctx.fillText('⚠ 核彈來襲  ' + nkCnt.toFixed(1) + ' 秒', VW / 2, 28);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
      ctx.restore();
    }

    /* 投下中的核彈（從天而降，落點在場地正中央） */
    for (var nin = 0; nin < run.nukesIn.length; nin++) {
      var nk3 = run.nukesIn[nin];
      var nkp = clamp(nk3.t / nk3.max, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.45 + Math.abs(Math.sin(time * 16)) * 0.3;
      ctx.strokeStyle = '#ff3b3b';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(nk3.x, nk3.y, 46 + nkp * 70, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#ff3b3b';
      ctx.beginPath(); ctx.arc(nk3.x, nk3.y, 34 + nkp * 60, 0, TAU); ctx.fill();
      ctx.restore();
      var by = nk3.y - 340 + nkp * 340;
      ctx.save();
      ctx.translate(nk3.x, by);
      Art.glow(ctx, 0, 0, 30, 'rgba(255,120,40,.9)', 0.9);
      ctx.fillStyle = '#2a2a34';
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4a4a58';
      ctx.fillRect(-3.5, -21, 7, 9);
      ctx.fillStyle = '#ff7a3c';
      ctx.fillRect(-2, -25, 4, 5);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(-5, -18); ctx.lineTo(0, -52 - nkp * 24); ctx.lineTo(5, -18);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    /* 蕈狀雲 */
    for (var nk = 0; nk < run.nukes.length; nk++) {
      var nk2 = run.nukes[nk];
      var nkp = clamp(nk2.t / nk2.max, 0, 1);
      if (nk2.smoke) {
        /* 黑煙：越大越淡，慢慢往上飄 */
        ctx.save();
        ctx.globalAlpha = 0.5 * (1 - nkp);
        ctx.fillStyle = '#1a1620';
        for (var sm2 = 0; sm2 < 3; sm2++) {
          ctx.beginPath();
          ctx.arc(nk2.x + (sm2 - 1) * 14, nk2.y - nkp * 90 - sm2 * 10, 16 + nkp * 30 + sm2 * 5, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 0.25 * (1 - nkp);
        ctx.fillStyle = '#2c2632';
        ctx.beginPath();
        ctx.arc(nk2.x, nk2.y - nkp * 120, 24 + nkp * 40, 0, TAU);
        ctx.fill();
        ctx.restore();
        continue;
      }
      ctx.save();
      var H = (nk2.h || 1) * 92;
      ctx.translate(nk2.x, nk2.y);
      /* ===== 菇柱：底下粗、上面細，帶熱氣流 ===== */
      var stemTop = -nkp * H * 0.62;
      ctx.globalAlpha = 0.7 * (1 - nkp * 0.7);
      var sg = ctx.createLinearGradient(0, 0, 0, stemTop);
      sg.addColorStop(0, '#3a2418');
      sg.addColorStop(0.45, '#8a4a22');
      sg.addColorStop(1, '#ff9a3c');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-20 - nkp * 10, 0);
      ctx.lineTo(20 + nkp * 10, 0);
      ctx.lineTo(13, stemTop);
      ctx.lineTo(-13, stemTop);
      ctx.closePath();
      ctx.fill();
      /* 柱上熱流 */
      ctx.globalAlpha = 0.35 * (1 - nkp);
      for (var sf2 = 0; sf2 < 5; sf2++) {
        var fy = stemTop * (0.25 + sf2 * 0.16) + Math.sin(time * 4 + sf2) * 3;
        ctx.fillStyle = sf2 % 2 ? '#ffd166' : '#ff7a3c';
        ctx.beginPath();
        ctx.arc(Math.sin(time * 3 + sf2 * 2) * 6, fy, 3 + sf2 * 0.6, 0, TAU);
        ctx.fill();
      }
      /* ===== 重重疊疊的菇傘（5 層） ===== */
      for (var L = 0; L < 5; L++) {
        var lp = clamp(nkp * 1.15 - L * 0.09, 0, 1);
        if (lp <= 0) continue;
        var ly = -nkp * H * (0.55 + L * 0.19);
        var lr = (30 + L * 4) * (0.35 + lp * 1.15) * (1 - L * 0.09);
        var alpha = (1 - nkp) * (0.9 - L * 0.12);
        ctx.globalAlpha = alpha;
        /* 傘的熱光 */
        Art.glow(ctx, 0, ly, lr * 1.5, L < 2 ? 'rgba(255,150,60,.95)' : 'rgba(255,214,120,.8)', 0.85);
        /* 傘面（扁圓） */
        var cg = ctx.createRadialGradient(0, ly, lr * 0.15, 0, ly, lr);
        cg.addColorStop(0, L === 0 ? '#fff3cf' : '#ffd166');
        cg.addColorStop(0.55, L < 2 ? '#ff8a3c' : '#e0662a');
        cg.addColorStop(1, '#5a2a12');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(0, ly, lr, lr * 0.55, 0, 0, TAU);
        ctx.fill();
        /* 傘緣亮邊 */
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = '#ffe6a1';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, ly, lr * 0.96, lr * 0.52, 0, 0.15, Math.PI - 0.15);
        ctx.stroke();
        /* 上層滾動的煙團 */
        if (L >= 2) {
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillStyle = '#4a3a2a';
          for (var pb = 0; pb < 3; pb++) {
            var pa = time * 1.6 + pb * 2.1 + L;
            ctx.beginPath();
            ctx.arc(Math.cos(pa) * lr * 0.55, ly - lr * 0.28 + Math.sin(pa * 1.3) * 4, lr * 0.3, 0, TAU);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    /* 爆炸貼圖（CC0 sprite sheet，載入失敗時退回程序化圓環） */
    for (var bi2 = 0; bi2 < run.booms.length; bi2++) {
      var bm = run.booms[bi2];
      var kk = clamp(bm.t / bm.max, 0, 1);
      if (Art.texReady('explosion')) {
        var fr = Math.min(6, Math.floor(kk * 7));
        var sz = 32 * (0.7 + kk * 0.55) * bm.scale;
        ctx.save();
        ctx.globalAlpha = 1 - kk * 0.3;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(Art.TEX.explosion, fr * 32, 0, 32, 32, bm.x - sz / 2, bm.y - sz / 2, sz, sz);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = (1 - kk) * 0.8;
        ctx.strokeStyle = '#ffb347';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bm.x, bm.y, 8 + kk * 34 * bm.scale, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }

    var drawables = [];
    for (var e = 0; e < run.enemies.length; e++) drawables.push({ y: run.enemies[e].y, kind: 'enemy', ref: run.enemies[e] });
    drawables.push({ y: run.player.y, kind: 'player', ref: run.player });
    drawables.sort(function (a, b) { return a.y - b.y; });
    for (var d = 0; d < drawables.length; d++) {
      if (drawables[d].kind === 'player') drawPlayer(run.player);
      else drawEnemy(drawables[d].ref);
    }

    if (run.swing) {
      var sw = run.swing;
      var k2 = 1 - sw.t / sw.dur;
      ctx.save();
      ctx.translate(run.player.x, run.player.y - 4);
      ctx.rotate(sw.ang);
      ctx.globalAlpha = 0.7 * k2;
      ctx.beginPath();
      ctx.arc(0, 0, sw.range * (1.05 - 0.25 * (1 - k2)), -0.95, 0.95);
      ctx.lineWidth = 5 * k2 + 1;
      ctx.strokeStyle = sw.color || '#ffffff';
      ctx.stroke();
      ctx.restore();
    }

    /* 磁軌光束 */
    for (var bm = 0; bm < run.beams.length; bm++) {
      var beam = run.beams[bm];
      var ak = clamp(beam.t / 0.12, 0, 1);
      ctx.save();
      ctx.globalAlpha = ak;
      ctx.strokeStyle = beam.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y);
      ctx.lineTo(beam.x + Math.cos(beam.ang) * beam.len, beam.y + Math.sin(beam.ang) * beam.len);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    /* 居合刀光 */
    for (var sl = 0; sl < run.slashes.length; sl++) {
      var sa = run.slashes[sl];
      var sk = clamp(sa.t / 0.2, 0, 1);
      ctx.save();
      ctx.globalAlpha = sk;
      ctx.translate(sa.x, sa.y);
      ctx.rotate(sa.ang);
      if (Art.texReady('slash')) {
        ctx.imageSmoothingEnabled = false;
        var slw = sa.len * (0.7 + 0.3 * sk);
        var slh = sa.len * 0.55;
        ctx.drawImage(Art.TEX.slash, 0, 0, 256, 192, 0, -slh / 2, slw, slh);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath();
        ctx.moveTo(0, -3); ctx.lineTo(sa.len, -16); ctx.lineTo(sa.len, 16); ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    /* 毒霧 */
    for (var cl = 0; cl < run.clouds.length; cl++) {
      var cloud = run.clouds[cl];
      var ca = clamp(cloud.life / cloud.max, 0, 1) * 0.35;
      ctx.save();
      ctx.globalAlpha = ca;
      ctx.fillStyle = cloud.color;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    /* 毒霧 */
    for (var ip = 0; ip < run.impacts.length; ip++) {
      var imp = run.impacts[ip];
      var ik = 1 - imp.t / imp.max;
      ctx.globalAlpha = Math.max(0, 1 - ik) * 0.9;
      ctx.strokeStyle = imp.color;
      ctx.lineWidth = 2.2 * (1 - ik) + 0.6;
      ctx.beginPath();
      ctx.arc(imp.x, imp.y, imp.r * (0.25 + ik), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.lineCap = 'round';
    for (var b = 0; b < run.bullets.length; b++) {
      var bl = run.bullets[b];
      var tail = bl.family === 'bow' ? 0.062 : bl.family === 'cannon' ? 0.048 :
        bl.family === 'magic' ? 0.042 : 0.03;
      /* 外圈光暈 */
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = bl.color;
      ctx.lineWidth = bl.r * 4.2;
      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y);
      ctx.lineTo(bl.x - bl.vx * tail, bl.y - bl.vy * tail);
      ctx.stroke();
      /* 彈體 */
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = bl.r * 1.7;
      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y);
      ctx.lineTo(bl.x - bl.vx * tail, bl.y - bl.vy * tail);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = bl.crit ? '#ffe6a1' : '#ffffff';
      ctx.fillRect(bl.x - 1, bl.y - 1, 2, 2);
    }

    for (var pt = 0; pt < run.parts.length; pt++) {
      var pa = run.parts[pt];
      var al = clamp(pa.life / pa.max, 0, 1);
      if (pa.ring) {
        ctx.globalAlpha = al * 0.5;
        ctx.beginPath();
        ctx.arc(pa.x, pa.y, pa.ring * (1 - al * 0.7), 0, TAU);
        ctx.strokeStyle = pa.color;
        ctx.lineWidth = 3 * al + 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = al;
        ctx.fillStyle = pa.color;
        ctx.fillRect(pa.x | 0, pa.y | 0, Math.max(1, pa.size | 0), Math.max(1, pa.size | 0));
        ctx.globalAlpha = 1;
      }
    }

    ctx.textAlign = 'center';
    for (var tt = 0; tt < run.texts.length; tt++) {
      var x2 = run.texts[tt];
      ctx.globalAlpha = clamp(x2.life / x2.max, 0, 1);
      ctx.font = 'bold ' + x2.size + 'px monospace';
      ctx.fillStyle = 'rgba(0,0,0,.8)';
      ctx.fillText(x2.str, x2.x + 1, x2.y + 1);
      ctx.fillStyle = x2.color;
      ctx.fillText(x2.str, x2.x, x2.y);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';

    /* 環境微塵 */
    for (var du = 0; du < 12; du++) {
      var ddx = (du * 137 + time * 7) % RW;
      var ddy = (du * 211 + Math.sin(time * 0.6 + du) * 24 + time * 5) % RH;
      ctx.globalAlpha = 0.10 + 0.10 * Math.abs(Math.sin(time + du));
      ctx.fillStyle = '#b9a8ff';
      ctx.fillRect(ddx | 0, ddy | 0, 1, 1);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    /* 章節氛圍色（讓每個場景的色調明顯不同） */
    if (run.theme && run.theme.fog) {
      ctx.fillStyle = run.theme.fog;
      ctx.fillRect(0, 0, VW, VH);
    }

    /* 螢幕暗角 */
    ctx.drawImage(getVignette(), 0, 0);

    /* 進入地牢動畫 */
    if (run.introT > 0) {
      var ik = 1 - clamp(run.introT, 0, 1);
      ctx.save();
      ctx.fillStyle = 'rgba(4,3,8,' + Math.min(1, Math.max(0, 1 - ik * 1.7)).toFixed(3) + ')';
      ctx.fillRect(0, 0, VW, VH);
      ctx.globalAlpha = Math.max(0, 1 - ik * 1.5);
      ctx.strokeStyle = (run.theme && run.theme.accent) || '#a07bff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(VW / 2, VH / 2, 26 + ik * 280, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = Math.max(0, 1 - ik * 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('進 入 地 牢', VW / 2, VH / 2 + 4);
      ctx.textAlign = 'left';
      ctx.restore();
    }

    /* 回聲倒帶時鐘 */
    if (run.rewindAnim > 0) drawRewindClock(run.rewindAnim);

    /* 核彈閃白 */
    if (run.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + clamp(run.flash, 0, 0.85).toFixed(3) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }

    if (run.player.hurtFlash > 0) {
      ctx.fillStyle = 'rgba(226,87,76,' + (run.player.hurtFlash / 0.32 * 0.30).toFixed(3) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }
  }

  var vignetteCache = null;
  function getVignette() {
    if (vignetteCache) return vignetteCache;
    var c = document.createElement('canvas');
    c.width = VW; c.height = VH;
    var g = c.getContext('2d');
    var rg = g.createRadialGradient(VW / 2, VH / 2, VH * 0.34, VW / 2, VH / 2, VH * 0.86);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, 'rgba(0,0,0,.42)');
    g.fillStyle = rg;
    g.fillRect(0, 0, VW, VH);
    vignetteCache = c;
    return c;
  }

  function drawPlayer(p) {
    var flick = p.invuln > 0 && Math.floor(time * 20) % 2 === 0;
    Art.glow(ctx, p.x, p.y, 30, 'rgba(190,210,255,.22)', 0.45);
    ctx.globalAlpha = flick ? 0.5 : 1;
    Art.drawHero(ctx, p.hero.kind, p.x, p.y, time + p.walk * 0.2, p.face, p.walk,
      { skill: p.shieldT > 0 || p.buffs.rage > 0, dir: p.dir || 'down', cast: (p.fireFlash || 0) > 0, scale: 1.22 }, p.hero.palette);
    ctx.globalAlpha = 1;
  }

  function drawEnemy(e) {
    if (e.boss) {
      Art.drawBoss(ctx, e.bossId, e.x, e.y, time + e.t, e.face, e.flash, e.pal, e.hp / e.maxHp);
      /* 首領血條：直接畫在首領正上方 */
      var bw = 86, bh = 7;
      var bx = e.x - bw / 2, by = e.y - e.r - 26;
      ctx.save();
      ctx.fillStyle = 'rgba(6,4,12,.85)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      var ratio = clamp(e.hp / e.maxHp, 0, 1);
      var bg2 = ctx.createLinearGradient(bx, by, bx, by + bh);
      bg2.addColorStop(0, '#ff6b6b');
      bg2.addColorStop(1, '#a1123a');
      ctx.fillStyle = bg2;
      ctx.fillRect(bx, by, bw * ratio, bh);
      ctx.strokeStyle = 'rgba(255,220,160,.75)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
      /* 名字 */
      ctx.font = 'bold 8px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe6a1';
      ctx.shadowColor = 'rgba(0,0,0,.9)';
      ctx.shadowBlur = 3;
      ctx.fillText(e.name || 'BOSS', e.x, by - 4);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
      ctx.restore();
      /* 首領預警：衝撞 / 光束 */
      if (e.chargeT > 0) {
        ctx.save();
        ctx.globalAlpha = 0.30 + Math.abs(Math.sin(time * 20)) * 0.3;
        ctx.strokeStyle = '#ff5d4a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.chargeA) * 200, e.y + Math.sin(e.chargeA) * 200);
        ctx.stroke();
        ctx.restore();
      }
      if (e.beamT > 0) {
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.abs(Math.sin(time * 24)) * 0.35;
        ctx.strokeStyle = e.pal.accent;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - 14);
        ctx.lineTo(e.x + Math.cos(e.beamA) * 430, e.y - 14 + Math.sin(e.beamA) * 430);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    } else {
      Art.drawEnemy(ctx, e.arch, e.x, e.y, time + e.t, e.face, e.flash, e.walk, e.pal, 1);
    }
    if (e.burn > 0) Art.glow(ctx, e.x, e.y - 6, 12, 'rgba(255,154,60,.8)', 0.4);
    if (e.poison > 0) Art.glow(ctx, e.x, e.y - 6, 12, 'rgba(168,224,90,.8)', 0.35);
    if (e.rootT > 0) {
      ctx.strokeStyle = '#c7f08a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(e.x, e.y + e.r * 0.5, e.r + 3, 0, TAU);
      ctx.stroke();
    }
    if (!e.boss && e.hp < e.maxHp) {
      var w = 16, hp = clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w, 2);
      ctx.fillStyle = hp > 0.5 ? '#59cf74' : (hp > 0.25 ? '#f3c250' : '#e2574c');
      ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w * hp, 2);
    }
  }

  function drawShopItem(it) {
    Art.drawPedestal(ctx, it.x, it.y, time);
    if (it.bought) return;
    var bob = Math.sin(time * 3 + it.x * 0.1) * 2;
    var x = it.x, y = it.y - 12 + bob;
    if (it.kind === 'heal') {
      Art.glow(ctx, x, y, 10, 'rgba(226,87,76,.7)', 0.5);
      ctx.fillStyle = '#e2574c';
      ctx.beginPath();
      ctx.moveTo(x, y + 4); ctx.bezierCurveTo(x - 8, y - 2, x - 4, y - 8, x, y - 3);
      ctx.bezierCurveTo(x + 4, y - 8, x + 8, y - 2, x, y + 4);
      ctx.fill();
    } else if (it.kind === 'equip') {
      Art.drawEquipIcon(ctx, 'amulet', x, y, 1, '#b07cf0');
    } else {
      Art.drawChest(ctx, x, y + 6, time, false, 1);
    }
  }

  /* ------------------------------------------------------------------
     HUD
     ------------------------------------------------------------------ */
  var hudCache = {};
  function hud(id) {
    if (!hudCache[id]) hudCache[id] = $(id);
    return hudCache[id];
  }

  function refreshWeaponCard() {
    if (!run) return;
    var w = run.player.weapon;
    var rar = RARITY[w.rarity] || RARITY[0];
    var nameEl = hud('weaponText');
    if (nameEl) {
      nameEl.textContent = w.name;
      nameEl.style.color = rar.color;
    }
    var cvs = hud('weaponIcon');
    if (cvs && cvs.getContext) {
      var g = cvs.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, cvs.width, cvs.height);
      Art.drawWeaponIcon(g, w.shape, cvs.width / 2, cvs.height / 2, 1.5, rar.color, (w.rarity || 3), w.id);
    }
  }

  function refreshEquipStrip() {
    if (!run) return;
    var bl = run.blessings || [];
    for (var i = 0; i < 4; i++) {
      var cvs = hud('eq' + i);
      if (!cvs || !cvs.getContext) continue;
      var g = cvs.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, cvs.width, cvs.height);
      var b = bl[i];
      if (!b) {
        g.globalAlpha = 0.22;
        Art.drawEquipIcon(g, 'sigil', cvs.width / 2, cvs.height / 2, 0.9, '#6b7492');
        g.globalAlpha = 1;
      } else {
        g.globalAlpha = 0.95;
        Art.glow(g, cvs.width / 2, cvs.height / 2, 13, b.color, 0.7);
        Art.drawEquipIcon(g, 'sigil', cvs.width / 2, cvs.height / 2, 0.95, b.color);
        g.globalAlpha = 1;
      }
      var slot = $('eqSlot' + i);
      if (slot) {
        slot.style.setProperty('--rc', b ? b.color : 'rgba(255,255,255,.12)');
        slot.title = b ? ('祝福：' + b.name) : '祝福空位';
      }
    }
  }

  /* 重畫技能／大招圖標（每幀守護，避免任何一次清空後永久空白） */
  function paintSkillIcons() {
    if (!run || !run.player || !run.player.hero) return;
    var h = run.player.hero;
    var hIc = $('skHeroIc');
    if (hIc && hIc.getContext) {
      var hg = hIc.getContext('2d');
      hg.clearRect(0, 0, hIc.width, hIc.height);
      Art.drawSkillIcon(hg, h.skill.kind, hIc.width / 2, hIc.height / 2, 1.7, h.palette.d);
    }
    var uIc = $('skUltIc');
    if (uIc && uIc.getContext) {
      var ug = uIc.getContext('2d');
      ug.clearRect(0, 0, uIc.width, uIc.height);
      Art.drawUltIcon(ug, ULT[h.id] ? ULT[h.id].kind : 'default', uIc.width / 2, uIc.height / 2, 1.7, h.palette.c);
    }
    var tSk = $('tSkillIc');
    if (tSk && tSk.getContext) {
      var tg1 = tSk.getContext('2d');
      tg1.clearRect(0, 0, tSk.width, tSk.height);
      Art.drawSkillIcon(tg1, h.skill.kind, tSk.width / 2, tSk.height / 2, 2.0, h.palette.d);
    }
    var tUl = $('tUltIc');
    if (tUl && tUl.getContext) {
      var tg2 = tUl.getContext('2d');
      tg2.clearRect(0, 0, tUl.width, tUl.height);
      Art.drawUltIcon(tg2, ULT[h.id] ? ULT[h.id].kind : 'default', tUl.width / 2, tUl.height / 2, 2.0, h.palette.c);
    }
    /* 保險：技能格與觸控鈕絕不被隱藏／被冷卻遮罩蓋滿 */
    ['skHero', 'skUlt', 'skDash'].forEach(function (id) {
      var el = $(id);
      if (el) { el.classList.remove('hidden'); el.style.visibility = 'visible'; el.style.opacity = '1'; }
    });
    ['tSkill', 'tUlt', 'tDash'].forEach(function (id) {
      var el = $(id);
      if (el) { el.classList.remove('hidden'); el.style.visibility = 'visible'; el.style.opacity = '1'; }
    });
    if (IS_TOUCH && touchEls) {
      if (touchEls.skillCd) touchEls.skillCd.style.opacity = run.player.skillCd > 0 ? '0.45' : '0';
      if (touchEls.dashCd) touchEls.dashCd.style.opacity = run.player.dashCd > 0 ? '0.45' : '0';
    }
    var hcCool = $('skHeroCool');
    if (hcCool && run.player.skillCd <= 0) hcCool.style.height = '0%';
    var dCool = $('skDashCool');
    if (dCool && run.player.dashCd <= 0) dCool.style.height = '0%';
  }

  function updateHud() {
    if (!run) return;
    /* 每 10 幀重畫技能圖標，避免任何清空後變空白 */
    hudIconTick = (hudIconTick + 1) % 10;
    if (hudIconTick === 0) paintSkillIcons();
    var p = run.player;

    hud('hpFill').style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
    hud('hpText').textContent = Math.ceil(p.hp) + ' / ' + Math.round(p.maxHp);
    hud('enFill').style.width = clamp(p.energy / p.maxEnergy * 100, 0, 100) + '%';
    hud('enText').textContent = Math.floor(p.energy) + ' / ' + Math.round(p.maxEnergy);
    hud('coinText').textContent = run.coins;
    hud('keyText').innerHTML =
      '<i style="color:#c8a06a;font-style:normal">' + (run.keys.bronze || 0) + '</i>' +
      '<i style="color:#cfd8ec;font-style:normal">' + (run.keys.silver || 0) + '</i>' +
      '<i style="color:#f3c250;font-style:normal">' + (run.keys.gold || 0) + '</i>' +
      '<i style="color:#ff3bd4;font-style:normal">' + (run.keys.mythic || 0) + '</i>';
    var rwEl = $('rewindText');
    if (rwEl) rwEl.textContent = run.rewind > 0 ? run.rewind : '0';
    hud('floorText').textContent = run.floor + 1;
    hud('chapterText').textContent = (run.chapterIndex + 1) + '-' + run.stage + ' ' + run.tier.name;
    hud('chapterText').style.color = run.tier.accent;
    hud('killText').textContent = run.kills;

    /* 技能 CD：藍色進度由下往上推進 */
    var dashReady = p.dashCd <= 0;
    hud('skDash').classList.toggle('ready', dashReady);
    hud('skDashCool').style.height = dashReady ? '0%' : clamp((1 - p.dashCd / 0.5) * 100, 0, 100) + '%';
    hud('skDashT').textContent = dashReady ? '就緒' : p.dashCd.toFixed(1);

    var skReady = p.skillCd <= 0;
    hud('skHero').classList.toggle('ready', skReady);
    hud('skHeroCool').style.height = skReady ? '0%' : clamp((1 - p.skillCd / p.hero.skill.cd) * 100, 0, 100) + '%';
    hud('skHeroT').textContent = skReady ? '就緒' : p.skillCd.toFixed(1);
    hud('skHeroName').innerHTML = p.hero.skill.name + '<em>Shift</em>';

    var uReady = p.ultCharge >= 100;
    hud('skUlt').classList.toggle('ready', uReady);
    hud('skUltFill').style.height = clamp(p.ultCharge, 0, 100) + '%';
    hud('skUltT').textContent = p.ultCd > 0 ? p.ultCd.toFixed(1) + 's' : (uReady ? 'READY' : Math.floor(p.ultCharge) + '%');
    hud('skUltName').innerHTML = ((ULT[p.hero.id] || {}).name || '大招') + '<em>Q</em>';

    var dtg = hud('diffTagName');
    if (dtg) {
      dtg.textContent = run.diff.name;
      dtg.style.color = run.diff.color;
    }

    hud('enemyTag').textContent = run.cleared ? '房間已淨空' : '剩餘 ' + run.enemies.length;

    /* 首領血條改畫在首領頭上（畫布內），關閉原本的頂部血條 */
    var bb = hud('bossBar');
    if (bb) bb.classList.add('hidden');

    if (IS_TOUCH && touchEls) {
      var dR = clamp(p.dashCd / 0.62, 0, 1);
      var sR = clamp(p.skillCd / p.hero.skill.cd, 0, 1);
      if (touchEls.dashCd) touchEls.dashCd.style.opacity = dR > 0.02 ? String(0.55 + dR * 0.4) : '0';
      if (touchEls.skillCd) touchEls.skillCd.style.opacity = sR > 0.02 ? String(0.55 + sR * 0.4) : '0';
      if (touchEls.use) touchEls.use.classList.toggle('hidden', !activePrompt);
      if (touchEls.skill) {
        var sSpan = touchEls.skill.querySelector('span');
        if (sSpan) sSpan.textContent = p.skillCd > 0 ? p.skillCd.toFixed(1) : '技能';
      }
      if (touchEls.dash) {
        var dSpan = touchEls.dash.querySelector('span');
        if (dSpan) dSpan.textContent = p.dashCd > 0 ? p.dashCd.toFixed(1) : '衝刺';
      }
      if (touchEls.ult) {
        touchEls.ult.classList.toggle('ready', uReady);
        var span = touchEls.ult.querySelector('span');
        if (span) span.textContent = uReady ? '大招' : Math.floor(p.ultCharge) + '%';
      }
    }
  }

  /* ------------------------------------------------------------------
     觸控
     ------------------------------------------------------------------ */
  var IS_TOUCH = (function () {
    try {
      if (/[?&]touch=1/.test(location.search)) return true;
      if (/[?&]touch=0/.test(location.search)) return false;
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
      return ('ontouchstart' in window) && (navigator.maxTouchPoints || 0) > 0;
    } catch (e) { return false; }
  })();

  var touch = {
    move: { on: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0, mag: 0 },
    aim: { on: false, id: -1, ang: -Math.PI / 2, mag: 0, ox: 0, oy: 0 }
  };

  function nearestEnemy(p) {
    var best = null, bd = 1e9;
    for (var i = 0; i < run.enemies.length; i++) {
      var e = run.enemies[i];
      var d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best && bd < 520 ? best : null;
  }

  function autoAimAngle(p) {
    var e = nearestEnemy(p);
    if (e) return Math.atan2(e.y - p.y, e.x - p.x);
    return p.aim;
  }

  function aimAssist(p, ang) {
    var best = ang, bestDiff = 0.38;
    for (var i = 0; i < run.enemies.length; i++) {
      var e = run.enemies[i];
      var dx = e.x - p.x, dy = e.y - p.y;
      if (Math.hypot(dx, dy) > 360) continue;
      var a = Math.atan2(dy, dx);
      var diff = Math.abs(normAng(a - ang));
      if (diff < bestDiff) { bestDiff = diff; best = a; }
    }
    return best;
  }

  var touchEls = null;
  var touchInited = false;
  var hintTimer = null;
  var hintShown = false;
  function hideTouchHint() {
    var el = $('touchHint');
    if (el) el.classList.add('hidden');
  }

  function initTouch() {
    if (!IS_TOUCH || touchInited) return;
    touchInited = true;
    document.body.classList.add('touch-mode');

    var zone = $('moveZone'), stick = $('stick'), knob = $('knob');
    var bAim = $('tAim'), bSkill = $('tSkill'), bDash = $('tDash'), bUse = $('tUse'), bPause = $('tPause'), bUlt = $('tUlt');
    touchEls = {
      aim: bAim, skill: bSkill, dash: bDash, use: bUse, ult: bUlt,
      aimCd: bAim ? bAim.querySelector('.cd') : null,
      skillCd: bSkill ? bSkill.querySelector('.cd') : null,
      dashCd: bDash ? bDash.querySelector('.cd') : null
    };
    var R = 56;

    function stickMove(ev) {
      var dx = ev.clientX - touch.move.ox;
      var dy = ev.clientY - touch.move.oy;
      var d = Math.hypot(dx, dy);
      var cl = Math.min(1, d / R);
      var nx = d > 0.001 ? dx / d : 0, ny = d > 0.001 ? dy / d : 0;
      touch.move.dx = nx * cl; touch.move.dy = ny * cl; touch.move.mag = cl;
      if (knob) knob.style.transform = 'translate(calc(-50% + ' + (nx * R * cl).toFixed(1) + 'px), calc(-50% + ' + (ny * R * cl).toFixed(1) + 'px))';
    }

    if (zone) {
      zone.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        if (mode !== 'play' || touch.move.on) return;
        touch.move.on = true; touch.move.id = ev.pointerId;
        touch.move.ox = ev.clientX; touch.move.oy = ev.clientY;
        touch.move.dx = 0; touch.move.dy = 0; touch.move.mag = 0;
        var r = frame.getBoundingClientRect();
        if (stick) {
          stick.style.left = (ev.clientX - r.left) + 'px';
          stick.style.top = (ev.clientY - r.top) + 'px';
          stick.classList.add('on');
        }
        if (knob) knob.style.transform = 'translate(-50%,-50%)';
        hideTouchHint();
      });
    }

    if (bAim) {
      bAim.addEventListener('pointerdown', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        if (mode !== 'play') return;
        touch.aim.on = true; touch.aim.id = ev.pointerId; touch.aim.mag = 0;
        var r = bAim.getBoundingClientRect();
        touch.aim.ox = r.left + r.width / 2;
        touch.aim.oy = r.top + r.height / 2;
        bAim.classList.add('active');
        hideTouchHint();
      });
    }

    window.addEventListener('pointermove', function (ev) {
      if (touch.move.on && ev.pointerId === touch.move.id) stickMove(ev);
      if (touch.aim.on && ev.pointerId === touch.aim.id) {
        var dx = ev.clientX - touch.aim.ox;
        var dy = ev.clientY - touch.aim.oy;
        var d = Math.hypot(dx, dy);
        touch.aim.mag = Math.min(1, d / 62);
        if (d > 10) touch.aim.ang = Math.atan2(dy, dx);
      }
    }, { passive: true });

    function release(ev) {
      if (touch.move.on && ev.pointerId === touch.move.id) {
        touch.move.on = false; touch.move.id = -1;
        touch.move.dx = 0; touch.move.dy = 0; touch.move.mag = 0;
        if (stick) stick.classList.remove('on');
      }
      if (touch.aim.on && ev.pointerId === touch.aim.id) {
        touch.aim.on = false; touch.aim.id = -1; touch.aim.mag = 0;
        if (bAim) bAim.classList.remove('active');
      }
    }
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    function tap(btn, fn) {
      if (!btn) return;
      btn.addEventListener('pointerdown', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        if (mode !== 'play') return;
        fn();
      });
    }
    tap(bSkill, function () { pending.skill = true; });
    tap(bDash, function () { pending.dash = true; });
    tap(bUse, function () { pending.interact = true; });
    tap(bUlt, function () { useUlt(); });
    tap(bPause, function () { menuMode('pause'); });
  }

  /* ------------------------------------------------------------------
     主迴??     ------------------------------------------------------------------ */
  var slowFrames = 0;
  var loadT = 0;

  function loop(ts) {
    requestAnimationFrame(loop);
    if (!lastTs) lastTs = ts;
    var rawDt = (ts - lastTs) / 1000;
    var dt = rawDt;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    time += dt;

    /* 卡頓偵測：連續掉幀就重置輸入並脫困，避免搖桿卡死 */
    if (rawDt > 0.45) slowFrames++; else slowFrames = 0;
    if (slowFrames >= 3) {
      slowFrames = 0;
      keys = {};
      mouse.down = false;
      touch.move.on = false;
      touch.aim.on = false;
      if (run && mode === 'play') unstick();
    }

    try {
      if (mode === 'cine') {
        cineT += dt;
        if (cineT >= CINE_LEN) endCine();
        else drawCine(cineT);
        return;
      }

      /* 載入畫面 */
      if (mode === 'loading') {
        loadT += dt;
        var pr = Art.texturesProgress ? Art.texturesProgress() : 1;
        var fill = $('loadFill');
        if (fill && fill.style) fill.style.width = Math.round(pr * 100) + '%';
        var pct = $('loadPct');
        if (pct) pct.textContent = Math.round(pr * 100) + '%';
        if ((pr >= 1 && loadT > 0.7 && (!window.Content || window.Content.isLoaded())) || loadT > 7) {
          var ls = $('loadingScreen');
          if (ls) ls.classList.add('hidden');
          if (!/[?&]nocine/.test(location.search)) startCine();
          else { mode = 'title'; showScreen('screen-title'); refreshTitle(); }
        }
        return;
      }

      if (toastT > 0) {
        toastT -= dt;
        if (toastT <= 0) { var te = $('toast'); if (te) te.classList.add('hidden'); }
      }
      if (shopBuying > 0) {
        shopBuying -= dt;
        if (shopBuying <= 0) finishBuy();
      }
      if (bannerT > 0) {
        bannerT -= dt;
        if (bannerT <= 0) { var be = $('banner'); if (be) be.classList.add('hidden'); }
      }

      if (mode === 'play' || mode === 'bag' || mode === 'tutorial') refreshBagBtn();
      var ta = document.getElementById('titleArt');
      if (ta) { if (mode === 'title') ta.classList.add('on'); else ta.classList.remove('on'); }
      if (mode === 'title' && !save.tourDone && !window.__tourStarted) {
        window.__tourStarted = true;
        setTimeout(function () { try { startTour(); } catch (e) {} }, 900);
      }
      /* 新手引導：遊戲暫停中，但仍可偵測玩家是否真的按了按鍵 */
      if (mode === 'tutorial') tickTutorial(dt);

      if ((mode === 'play' || mode === 'chest' || mode === 'stageclear' || mode === 'talent' || mode === 'shoproom') && run) {
        if (demoOn) demoBot(dt);
        if (mode === 'play') {
          var sdt = dt;
          if (run.hitstop > 0) {
            run.hitstop = Math.max(0, run.hitstop - dt);
            sdt = dt * 0.22;
          }
          update(sdt);
          updateHud();
        }
      }
      if (run) render();
      else drawCover(time);
      if (mode === 'heroes') animateHeroPreview(dt);
    } catch (err) {
      if (window.console && console.error) console.error('frame error', err);
      /* 例外可能發生在 save/restore 之間，重置繪圖狀態避免畫面漂移 */
      try { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; } catch (e2) {}
      keys = {};
      mouse.down = false;
      touch.move.on = false;
      touch.aim.on = false;
    }
  }

  /* ------------------------------------------------------------------
     DEMO 機器人
     ------------------------------------------------------------------ */
  function demoFreeAt(x, y) {
    if (x < WALLT + 14 || x > RW - WALLT - 14 || y < WALLT + 14 || y > RH - WALLT - 14) return false;
    if (hitWalls(x, y, 10, run.walls)) return false;
    for (var i = 0; i < run.props.length; i++) {
      var pr = run.props[i];
      if (!pr.dead && Math.hypot(pr.x - x, pr.y - y) < pr.r + 12) return false;
    }
    return true;
  }

  function demoBot(dt) {
    if (!run || !run.player) return;
    if (mode === 'shoproom') {
      /* 買得起就買，然後繼續前進 */
      var offers = run.shopOffers || [];
      for (var oi = 0; oi < offers.length; oi++) {
        if (!offers[oi].bought && run.coins >= offers[oi].price) buyRunShopItem(oi);
      }
      leaveRunShop();
      return;
    }
    if (mode === 'chest') {
      chooseChest(Math.floor(Math.random() * chestChoices.length));
      return;
    }
    if (mode === 'stageclear') { stageNext(); return; }
    if (mode === 'talent') {
      if (run && run.talentChoices && run.talentChoices.length) pickTalent(pick(run.talentChoices).id);
      else skipTalent();
      return;
    }
    var p = run.player;
    /* 長時間沒有擊殺 → 直接靠近最近的敵人，避免子彈被牆擋住卡死 */
    if (run._lastKills !== run.kills) { run._lastKills = run.kills; run._noKillT = 0; }
    run._noKillT = (run._noKillT || 0) + dt;
    if (run._noKillT > 5) {
      run._noKillT = 0;
      var near = null, nd = 1e9;
      for (var ni = 0; ni < run.enemies.length; ni++) {
        var en0 = run.enemies[ni];
        if (en0.dead) continue;
        var dd0 = Math.hypot(en0.x - p.x, en0.y - p.y);
        if (dd0 < nd) { nd = dd0; near = en0; }
      }
      if (near) {
        var tx0 = clamp(near.x + 26, WALLT + 14, RW - WALLT - 14);
        var ty0 = clamp(near.y, WALLT + 14, RH - WALLT - 14);
        if (!hitWalls(tx0, ty0, p.r + 2, run.walls)) { p.x = tx0; p.y = ty0; }
        else unstick();
      } else unstick();
    }
    var tgt = null, best = 1e9;
    for (var i = 0; i < run.enemies.length; i++) {
      var e = run.enemies[i];
      if (e.dead) continue;
      var d = dist(p, e);
      if (d < best) { best = d; tgt = e; }
    }
    keys['w'] = keys['a'] = keys['s'] = keys['d'] = false;

    /* 卡住偵測 */
    if (p._sx == null) { p._sx = p.x; p._sy = p.y; p._st = 0; }
    p._st += dt;
    if (p._st > 1.4) {
      if (Math.hypot(p.x - p._sx, p.y - p._sy) < 10) {
        if (run.chest && dist(p, run.chest) > 40) unstick();
      }
      p._sx = p.x; p._sy = p.y; p._st = 0;
    }

    var want = null;
    if (tgt) {
      mouse.x = tgt.x - run.cam.x;
      mouse.y = tgt.y - run.cam.y;
      mouse.down = true;
      var a = Math.atan2(tgt.y - p.y, tgt.x - p.x);
      want = best > 105 ? a : (best < 62 ? a + Math.PI : a + Math.PI / 2);
      if (best < 55 && p.dashCd <= 0) pending.dash = true;
      if (p.skillCd <= 0 && best < 130) pending.skill = true;
    } else {
      mouse.down = false;
      if (run.chest && !run.chest.open) {
        if (dist(p, run.chest) < 30) pending.interact = true;
        else want = Math.atan2(run.chest.y - p.y, run.chest.x - p.x);
      } else if (run.portal) {
        want = Math.atan2(run.portal.y - p.y, run.portal.x - p.x);
      }
    }

    if (want == null) return;
    /* 抵達傳送門就按 F 進入（傳送門改為手動開啟） */
    if (run.portal && Math.hypot(p.x - run.portal.x, p.y - run.portal.y) < 28) pending.interact = true;
    /* 障礙物閃避：挑第一個沒被擋住的方向 */
    var offsets = [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.4, -2.4, Math.PI];
    var chosen = want;
    for (var c = 0; c < offsets.length; c++) {
      var a2 = want + offsets[c];
      if (demoFreeAt(p.x + Math.cos(a2) * 34, p.y + Math.sin(a2) * 34)) { chosen = a2; break; }
    }
    var mx = Math.cos(chosen), my = Math.sin(chosen);
    if (mx > 0.3) keys['d'] = true; else if (mx < -0.3) keys['a'] = true;
    if (my > 0.3) keys['s'] = true; else if (my < -0.3) keys['w'] = true;
  }
  /* ------------------------------------------------------------------
     輸入
     ------------------------------------------------------------------ */
  function keyName(ev) {
    var k = ev.key;
    if (k === ' ') return ' ';
    return k.toLowerCase();
  }

  document.addEventListener('keydown', function (ev) {
    var k = keyName(ev);
    /* 教學中：任意鍵／空白／Enter 都能前進 */
    if (mode === 'tutorial') {
      if (k === 'escape') { endTutorial(); ev.preventDefault(); return; }
      if (k === ' ' || k === 'enter' || k === 'arrowright') {
        if (tutIdx < TUT_STEPS.length - 1) { tutIdx++; renderTutorial(); if (SFX.level) SFX.level(); }
        else endTutorial();
        ev.preventDefault();
        return;
      }
    }
    if (mode === 'cine') { ev.preventDefault(); endCine(); return; }
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].indexOf(k) >= 0) ev.preventDefault();
    keys[k] = true;

    if (mode === 'chest') {
      if (k === 'escape' || k === 'f') { closeChest(); return; }
      if (k >= '1' && k <= '4') { chooseChest(parseInt(k, 10) - 1); return; }
      return;
    }

    if (mode === 'talent') {
      if (k === '1' || k === '2' || k === '3') {
        var idx = parseInt(k, 10) - 1;
        if (run && run.talentChoices && run.talentChoices[idx]) pickTalent(run.talentChoices[idx].id);
        return;
      }
      if (k === 'escape') { skipTalent(); return; }
    }
    if (k === 'p' || k === 'escape') {
      if (mode === 'play') { menuMode('pause'); return; }
      if (mode === 'pause') { mode = 'play'; showScreen(null); return; }
      if (mode === 'tutorial') { endTutorial(); return; }
    }
    if (k === 'escape') {
      if (legalOpenFlag) { hideLegal(); return; }
      if (infoOpen) { hideInfo(); return; }
      if (mode === 'pause') { mode = 'play'; showScreen(null); return; }
      return;
      if (mode === 'play') { menuMode('pause'); }
      else if (mode === 'pause') { mode = 'play'; showScreen(null); }
      else if (mode === 'stats') { menuMode('pause'); }
      else if (mode === 'end') { run = null; mode = 'title'; showScreen('screen-title'); refreshTitle(); }
      else if (mode !== 'title' && mode !== 'stageclear') { menuMode('title'); }
      return;
    }
    if (k === 'm') { var m = SFX.toggleMute(); toast(m ? '已靜音' : '音效開啟'); return; }
    if (k === 'b') {
      if (mode === 'play') { menuMode('bag'); return; }
      if (mode === 'bag') { mode = 'play'; showScreen(null); if (SFX.setScene) SFX.setScene('battle'); return; }
    }
    if (k === 'tab') {
      if (mode === 'play') menuMode('stats');
      else if (mode === 'stats') { mode = 'play'; showScreen(null); }
      return;
    }
    if (k === 'u' && mode === 'play') { unstick(); return; }

    if (mode !== 'play') return;
    if (k === ' ') pending.dash = true;
    if (k === 'shift') pending.skill = true;
    if (k === 'f') pending.interact = true;
    if (k === 'q') useUlt();
  });

  document.addEventListener('keyup', function (ev) {
    keys[keyName(ev)] = false;
  });

  window.addEventListener('blur', function () {
    keys = {};
    mouse.down = false;
    if (mode === 'play') menuMode('pause');
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && mode === 'play') {
      keys = {};
      mouse.down = false;
      touch.move.on = false;
      touch.aim.on = false;
      menuMode('pause');
    }
  });

  function checkOrientation() {
    /* 已移除「請橫向」提示；此函式保留為空以避免舊呼叫點出錯 */
  }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);

  function unlockAudioOnce() { try { SFX.unlock(); } catch (e) {} }
  document.addEventListener('pointerdown', unlockAudioOnce, { once: true, passive: true });
  document.addEventListener('touchstart', unlockAudioOnce, { once: true, passive: true });

  function canvasPos(ev) {
    var r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * VW, y: (ev.clientY - r.top) / r.height * VH };
  }
  cv.addEventListener('mousemove', function (ev) {
    var pos = canvasPos(ev);
    mouse.x = pos.x; mouse.y = pos.y;
  });
  cv.addEventListener('mousedown', function (ev) {
    if (mode === 'cine') { endCine(); return; }
    if (ev.button === 0) { mouse.down = true; SFX.unlock(); }
  });
  window.addEventListener('mouseup', function (ev) {
    if (ev.button === 0) mouse.down = false;
  });
  cv.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

  /* ------------------------------------------------------------------
     選單按鈕
     ------------------------------------------------------------------ */
  function bind(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }

  bind('btnPlay', function () { SFX.unlock(); menuMode('chapters'); });
  bind('btnContinue', function () { SFX.unlock(); resumeRun(); });
  bind('btnChapterBack', function () { menuMode('title'); });
  bind('btnCCBack', function () { backToTitle(); });
  bind('btnDiffBack', function () { menuMode('chapters'); });
  bind('btnVault', function () { menuMode('vault'); });
  bind('btnShop', function () { menuMode('shop'); });
  bind('btnPinkChest', function () { openPinkChest(); });
  /* ---------------- 條款 / 隱私權 ---------------- */
  var legalCache = {};
  var legalOpenFlag = false;
  function showLegal(kind) {
    var isTerms = kind === 'terms';
    var title = $('legalTitle'), body = $('legalBody'), modal = $('legalModal');
    legalOpenFlag = true;
    if (title) title.textContent = isTerms ? '服務條款' : '隱私權政策';
    if (modal) {
      modal.classList.remove('hidden');
      /* 點背景也可關閉（只綁一次） */
      if (!modal._wired) {
        modal._wired = true;
        /* 用 pointerdown 而非 click：手機與觸控也一定能關 */
        modal.addEventListener('pointerdown', function (ev) {
          if (ev.target === modal) hideLegal();
        });
      }
    }
    if (!body) return;
    var file = 'legal/' + (isTerms ? 'terms' : 'privacy') + '.html';
    if (legalCache[kind]) { body.innerHTML = legalCache[kind]; return; }
    body.textContent = '載入中…';
    if (typeof fetch !== 'function') { body.textContent = '無法載入文件（瀏覽器不支援）'; return; }
    fetch(file, { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (html) {
      var m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      var inner = m ? m[1] : html;
      legalCache[kind] = inner;
      body.innerHTML = inner;
      if (window.I18N && I18N.lang() !== 'tw') {
        try { I18N.apply(); } catch (e) {}
      }
    }).catch(function () {
      body.innerHTML = '<p>無法載入文件。請直接開啟 <code>' + file + '</code></p>';
    });
  }
  function hideLegal() {
    legalOpenFlag = false;
    var m = $('legalModal');
    if (m) m.classList.add('hidden');
  }
  bind('btnTerms', function () { showLegal('terms'); });
  bind('btnPrivacy', function () { showLegal('privacy'); });
  bind('btnTermsTitle', function () { showLegal('terms'); });
  bind('btnPrivacyTitle', function () { showLegal('privacy'); });
  bind('btnLegalClose', function () { hideLegal(); });
  bind('btnLegalClose2', function () { hideLegal(); });
  bind('btnLegalX', function () { hideLegal(); });

  /* ---------------- 設置 ---------------- */
  function syncSettingsUi() {
    var m = $('setMusic'), s = $('setSfx'), mv = $('setMusicVal'), sv = $('setSfxVal');
    var mVol = Math.round((SFX.getMusicVolume ? SFX.getMusicVolume() : 1) * 100);
    var sVol = Math.round((SFX.getSfxVolume ? SFX.getSfxVolume() : 1) * 100);
    if (m) m.value = mVol;
    if (s) s.value = sVol;
    if (mv) mv.textContent = mVol + '%';
    if (sv) sv.textContent = sVol + '%';
    var q = $('setQuality');
    if (q && save.settings) q.value = save.settings.quality || 'mid';
    var lg = $('setLang');
    if (lg && window.I18N) lg.value = I18N.lang();
    var info = $('setSaveInfo');
    if (info) {
      var bytes = 0;
      try { bytes = (localStorage.getItem(SAVE_KEY) || '').length; } catch (e) {}
      info.textContent = '存檔大小約 ' + Math.round(bytes / 1024 * 10) / 10 + ' KB · 雲端不需登入';
    }
  }
  bind('btnSettings', function () {
    if (!save.settings) save.settings = { quality: 'mid' };
    syncSettingsUi();
    menuMode('settings');
  });
  bind('btnSettingsBack', function () { menuMode('title'); });
  bind('setMusic', function () {});  (function () {
    var m = $('setMusic');
    if (m) m.addEventListener('input', function () {
      SFX.setMusicVolume(parseFloat(m.value) / 100);
      $('setMusicVal').textContent = m.value + '%';
    });
    var s = $('setSfx');
    if (s) s.addEventListener('input', function () {
      SFX.setSfxVolume(parseFloat(s.value) / 100);
      $('setSfxVal').textContent = s.value + '%';
    });
    var q = $('setQuality');
    if (q) q.addEventListener('change', function () {
      if (!save.settings) save.settings = {};
      save.settings.quality = q.value;
      QUALITY = q.value === 'high' ? 1.35 : (q.value === 'low' ? 0.55 : 1);
      writeSave();
    });
    var lg = $('setLang');
    if (lg) lg.addEventListener('change', function () {
      if (window.I18N) I18N.setLang(lg.value);
    });
  })();
  bind('btnExportSave', function () {
    try {
      var raw = localStorage.getItem(SAVE_KEY) || '{}';
      var blob = new Blob([raw], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'abyss-echo-save-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast('存檔已匯出');
    } catch (e) { toast('匯出失敗'); }
  });
  bind('btnImportSave', function () {
    var f = $('importOutFile');
    if (f) f.click();
  });
  (function () {
    var f = $('importOutFile');
    if (!f) return;
    f.addEventListener('change', function () {
      var file = f.files && f.files[0];
      if (!file) return;
      var fr = new FileReader();
      fr.onload = function () {
        var ok = false;
        try { ok = window.Updater && Updater.importSave(String(fr.result)); } catch (e) { ok = false; }
        toast(ok ? '存檔已匯入，重新載入…' : '匯入失敗');
        if (ok) setTimeout(function () { location.reload(); }, 700);
      };
      fr.readAsText(file);
    });
  })();
  bind('btnExportOut', function () {
    if (window.Updater && Updater.exportSave()) toast('存檔已匯出');
    else toast('匯出失敗');
  });
  bind('btnImportOut', function () {
    var f = $('importOutFile');
    if (f) f.click();
  });
  (function () {
    var f = $('importOutFile');
    if (!f) return;
    f.addEventListener('change', function () {
      var file = f.files && f.files[0];
      if (!file) return;
      var fr = new FileReader();
      fr.onload = function () {
        var ok = false;
        try { ok = window.Updater && Updater.importSave(String(fr.result)); } catch (e) { ok = false; }
        toast(ok ? '存檔已匯入，重新載入…' : '匯入失敗');
        if (ok) setTimeout(function () { location.reload(); }, 700);
      };
      fr.readAsText(file);
    });
  })();

  window.__bagTap = function (ev) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    if (mode === 'bag') { mode = 'play'; showScreen(null); if (SFX.setScene) SFX.setScene('battle'); return; }
    if (mode === 'play' || mode === 'tutorial') {
      if (mode === 'tutorial') { var tb = document.getElementById('tutorial'); if (tb) tb.classList.add('hidden'); }
      menuMode('bag');
    }
  };
  bind('hudBag', function () { if (mode === 'play' || mode === 'bag') menuMode('bag'); if (window.SFX && SFX.level) SFX.level(); });
  bind('btnBag', function () { menuMode('bag'); });
  bind('btnRunShopLeave', function () { leaveRunShop(); });
  bind('btnBagPause', function () { menuMode('bag'); });
  bind('btnBagBack', function () {
    if (run && run.player) { mode = 'play'; showScreen(null); if (SFX.setScene) SFX.setScene('battle'); }
    else menuMode('title');
  });
  bind('btnVaultBack', function () { menuMode('title'); });
  bind('btnShopBack', function () { menuMode('title'); });
  bind('btnFuse', function () { fuseEquip(); });
  bind('vaultTabEquip', function () { switchVaultTab('equip'); });
  bind('vaultTabChest', function () { switchVaultTab('chest'); });
  bind('btnKeyChest0', function () { openKeyChest(0); });
  bind('btnKeyChest1', function () { openKeyChest(1); });
  bind('btnKeyChest2', function () { openKeyChest(2); });
  bind('btnSkipTalent', function () { skipTalent(); });
  bind('btnStageNext', function () { stageNext(); });
  bind('btnStageLeave', function () { if (run) endRun(true); });
  bind('btnBuyPremium', function () { buyPremium(); });
  bind('carPrev', function () { pickHero((heroIdx + D.HERO_IDS.length - 1) % D.HERO_IDS.length); });
  bind('carNext', function () { pickHero((heroIdx + 1) % D.HERO_IDS.length); });
  bind('btnHeroes', function () { menuMode('heroes'); });
  bind('btnUpgrade', function () { menuMode('upgrade'); });
  bind('btnHelp', function () { menuMode('help'); });
  bind('btnHeroBack', function () { menuMode('title'); });
  bind('btnUpBack', function () { menuMode('title'); });
  bind('btnHelpBack', function () { menuMode('title'); });
  bind('btnStartRun', function () {
    SFX.unlock();
    if (!save.unlocked[heroSel]) { toast('請先解鎖這個角色'); SFX.dry(); return; }
    menuMode('difficulty');
  });
  bind('btnExportSave', function () {
    if (window.Updater && Updater.exportSave()) toast('存檔已匯出');
    else toast('匯出失敗');
  });
  bind('btnImportSave', function () {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        var ok = window.Updater && Updater.importSave(String(fr.result));
        toast(ok ? '存檔已匯入，重新載入…' : '存檔格式錯誤');
        if (ok) setTimeout(function () { location.reload(); }, 700);
      };
      fr.readAsText(f);
    };
    inp.click();
  });
  bind('btnResume', function () { mode = 'play'; showScreen(null); });
  bind('btnRestart', function () { startRun(run ? run.hero.id : heroSel, run ? run.diff.id : 'normal'); });
  bind('btnQuit', function () { if (run) endRun(true); });
  bind('btnAgain', function () { startRun(run ? run.hero.id : heroSel, run ? run.diff.id : 'normal'); });
  bind('btnEndHome', function () {
    run = null;
    mode = 'title';
    showScreen('screen-title');
    refreshTitle();
    SFX.stopMusic();
  });
  bind('btnStats', function () { menuMode('stats'); });
  bind('btnStatsBack', function () { mode = 'play'; showScreen(null); });
  bind('btnUnstick', function () { if (mode === 'play') unstick(); });
  bind('btnUnstick2', function () { if (!run) return; unstick(); mode = 'play'; showScreen(null); });
  bind('chestSkip', function () { closeChest(); });

  /* ------------------------------------------------------------------
     開發 / 測試鉤子
     ------------------------------------------------------------------ */
  window.__game = {
    startRun: startRun,
    state: function () { return { mode: mode, run: run, save: save }; },
    debug: {
      gotoFloor: function (n) { if (run) buildFloor(clamp(n, 0, 999)); },
      killAll: function () {
        if (!run) return;
        run.enemies.slice().forEach(function (e) { e.hp = 0; killEnemy(e); });
      },
      moveTo: function (x, y) { if (run) { run.player.x = x; run.player.y = y; } },
      heal: function () { if (run) run.player.hp = run.player.maxHp; },
      forceTouch: function (on) {
        IS_TOUCH = !!on;
        document.body.classList.toggle('touch-mode', !!on);
        if (on) initTouch();
      },
      touchState: function () { return touch; },
      isTouch: function () { return IS_TOUCH; },
      setDemo: function (v) { demoOn = !!v; },
      giveWeapon: function (id, rar) {
        if (!run) return;
        run.player.weapon = rollWeapon(id, rar || 0);
        refreshWeaponCard();
      },
      giveEquip: function (rar) {
        if (!run) return;
        addEquipment(rollEquip(rar == null ? 2 : rar));
      },
      openChest: function (tier) {
        if (!run) return;
        if (!run.chest || !run.chest.pink) {
          run.chest = { x: run.player.x, y: run.player.y, open: false, tier: tier == null ? 2 : tier };
        }
        openChest(run.chest);
      },
      chestChoices: function () { return chestChoices; },
      chooseChest: chooseChest,
      closeChest: closeChest,
      unstick: unstick,
      spawnProp: function (type, x, y) {
        if (!run) return;
        var def = PROP_DEF[type] || PROP_DEF.crate;
        run.props.push({ type: type, x: x, y: y, r: def.r, hp: def.hp, maxHp: def.hp, flash: 0, dead: false });
      },
      props: function () { return run ? run.props : []; },
      damageProp: function (i, dmg) {
        if (!run || !run.props[i]) return;
        damageProp(run.props[i], dmg == null ? 999 : dmg);
      },
      inWall: function (x, y) { return run ? hitWalls(x, y, run.player.r, run.walls) : false; },
      tierName: function () { return run ? run.tier.name : ''; },
      stageState: function () {
        return run ? {
          mode: mode, floor: run.floor, chapter: run.chapterIndex, stage: run.stage,
          stageCleared: run.stageCleared, keys: run.keys, impacts: run.impacts.length
        } : null;
      },
      stageNext: stageNext,
      endRun: endRun,
      giveKeys: function (n) {
        if (run && run.keys) run.keys.bronze = (run.keys.bronze || 0) + (n || 1);
        if (!save.keyTypes) save.keyTypes = { bronze: 0, silver: 0, gold: 0, mythic: 0 };
        save.keyTypes.bronze = (save.keyTypes.bronze || 0) + (n || 1);
        save.keys = (save.keys || 0) + (n || 1);
        writeSave();
      },
      openKeyChest: openKeyChest,
      meta: function () { return { items: save.metaItems, equipped: save.metaEquipped }; },
      toggleMeta: toggleMeta,
      buyPremium: buyPremium,
      premium: function () { return { owned: save.premium, buying: shopBuying }; },
      weaponPool: function () { return weaponPool(); },
      endCine: endCine,
      startCine: startCine,
      cineInfo: function () { return { mode: mode, t: cineT }; },
      hasRunSave: hasRunSave,
      runSave: function () { return save.runSave; },
      resumeRun: resumeRun,
      clearRunSave: function () { save.runSave = null; writeSave(); },
      chapters: function () { return { unlocked: save.chapterUnlocked, cleared: save.chapterCleared }; },
      chapterComplete: chapterComplete,
      chapterUp: function () { return save.chapterUp || {}; },
      chapterUpBonus: chapterUpBonus,
      buyChapterUp: function (id) {
        var u = null;
        D.CHAPTER_UPGRADES.forEach(function (x) { if (x.id === id) u = x; });
        if (!u) return false;
        var lv = (save.chapterUp && save.chapterUp[u.id]) || 0;
        if (lv >= u.max) return false;
        if ((save.chapterUnlocked || 1) < u.chapter) return false;
        var cost = 60 + lv * 40;
        if (save.gems < cost) return false;
        save.gems -= cost;
        save.chapterUp[u.id] = lv + 1;
        writeSave();
        if (run) recalcStats(run.player);
        return true;
      },
      ultFx: function () { return run ? run.ultFx.length : 0; },
      ultSword: function () { return !!(run && run.ultSword); },
      muzzles: function () { return run ? run.muzzles.length : 0; },
      bossBarVisible: function () { return !!(run && run.boss && !run.boss.dead); },
      /* 單把付費武器（真實付款後的武器碼兌換） */
      grantWeapon: function (id) {
        if (!id || !WEAPONS[id]) return false;
        if (!save.premiumWeapons) save.premiumWeapons = {};
        save.premiumWeapons[id] = true;
        if (id === 'chaos') save.premium = true;
        writeSave();
        try { refreshShop(); } catch (e1) {}
        try { refreshTitle(); } catch (e2) {}
        return true;
      },
      weaponOwned: function (id) { return !!(save.premiumWeapons && save.premiumWeapons[id]); },
      /* 裝備（EQP 碼）：真實付款後解鎖 */
      grantEquip: function (id) {
        if (!id) return false;
        if (!save.forgedEquip) save.forgedEquip = {};
        save.forgedEquip[id] = true;
        if (!save.metaItems) save.metaItems = [];
        if (save.metaItems.indexOf(id) < 0) save.metaItems.push(id);
        writeSave();
        try { refreshShop(); } catch (e1) {}
        try { refreshVault(); } catch (e2) {}
        return true;
      },
      isPaid: function () { return !!save.paidUnlock; },
      bag: function () { return (run && run.bag) || []; },
      fuse: function (shape, rarity) { fuseBag(shape, rarity); return ((run && run.bag) || []).length; },
      giveWeaponToBag: function (id, rarity) {
        if (!run) return 0;
        if (!run.bag) run.bag = [];
        run.bag.push({ id: id, rarity: rarity, uid: 't' + Date.now().toString(36) });
        return run.bag.length;
      },
      addRuin: function (x, y, r) { addRuin(x, y, r); return run ? run.ruins.length : 0; },
      ruins: function () { return run ? (run.ruins || []).length : 0; },
      heroTalent: function () { return run ? run.heroTalent || null : null; },
      dropFxCount: function () { return run ? (run.dropFx || []).length : 0; },
      shopInfo: function () {
        return run ? { count: run.items.length, lastShopFloor: run.lastShopFloor } : { count: 0, lastShopFloor: null };
      },
      interact: function () { pending.interact = true; return true; },
      shopOffers: function () { return run ? (run.shopOffers || []) : []; },
      buyOffer: function (i) { buyRunShopItem(i); return true; },
      leaveShop: function () { leaveRunShop(); return true; },
      bagCap: function () { return BAG_CAP; },
      nukeState: function () { return run ? { call: !!run.nukeCall, nukes: run.nukes.length, incoming: run.nukesIn.length } : null; },
      startNuke: function () { if (run) { run.nukeCall = { t: 5, x: 320, y: 176 }; } return true; },
      equipFromBag: function (i) { equipFromBag(i); return true; },
      dropFromBag: function (i) { dropFromBag(i); return true; },
      forceShop: function () { if (run) { run.lastShopFloor = run.floor; enterShopRoom(); } return true; },      shopRoom: function () { return !!(run && run.shopRoom); },
      givePinkKey: function (n) { if (run) run.keys.pink = (run.keys.pink || 0) + (n || 1); return run ? (run.keys.pink || 0) : 0; },
      setUp: function (k, v) { if (!save.up) save.up = {}; save.up[k] = v; writeSave(); return save.up[k]; },
      skipTutorial: function () { save.tutorialDone = true; writeSave(); return true; },
      tutorialShown: function () { return !!(mode === 'tutorial'); },
      showTutorial: function () {
        tutIdx = 0;
        renderTutorial();
        var box = $('tutorial');
        if (box) box.classList.remove('hidden');
        mode = 'tutorial';
        return true;
      },
      tutStep: function () { return tutIdx; },
      tutVisible: function () { var b = $('tutorial'); return !!(b && !b.classList.contains('hidden')); },
      openLegal: function (kind) { showLegal(kind || 'terms'); return true; },
      closeLegal: function () { hideLegal(); return true; },
      legalOpen: function () { return legalOpenFlag; },
      saveRoundtrip: function () { writeSave(); var reloaded = loadSave(); save = reloaded; return JSON.parse(JSON.stringify(save.up)); },
      bossId: function () { return run && run.boss ? run.boss.bossId : null; },
      spawnPinkChest: function () {
        if (!run) return false;
        run.chest = { x: run.player.x + 20, y: run.player.y, open: false, pink: true, tier: 2 };
        return true;
      },
      chest: function () { return run ? run.chest : null; },
      bossDeathFx: function () { return run ? (run.bossDeath || []).length : 0; },
      forcePlay: function () { mode = 'play'; showScreen(null); return mode; },
      openTalents: function () { openTalents(); return run ? (run.talentChoices || []).length : 0; },
      giveAllTalents: function () {
        if (!run) return 0;
        TALENTS.forEach(function (t) { run.talents[t.id] = 1; });
        run.heroTalent = (run.player.hero && run.player.hero.id) || 'knight';
        recalcStats(run.player);
        return Object.keys(run.talents).length;
      },
      castSkill: function () { if (run) { run.player.skillCd = 0; useSkill(); } return true; },
      castUlt: function () {
        if (!run) return false;
        run.player.ultCharge = 100;
        useUlt();
        return true;
      },
      /* 究極神秘武器禮包：解鎖全部傳說（tier4）＋神話（tier5）武器 */
      grantWeaponPack: function () {
        if (!save.forgedWeapons) save.forgedWeapons = [];
        var have = {};
        save.forgedWeapons.forEach(function (w) { if (w && w.id) have[w.id] = true; });
        var added = 0;
        [4, 5].forEach(function (tier) {
          D.weaponsOfTier(tier).forEach(function (id) {
            if (have[id]) return;
            save.forgedWeapons.push({ id: id, rarity: tier, uid: 'gift' + id + Date.now().toString(36) });
            added++;
          });
        });
        writeSave();
        try { refreshShop(); } catch (e1) {}
        try { refreshTitle(); } catch (e2) {}
        try { checkUltimateUnlock(); } catch (e3) {}
        return added;
      },
      /* 主人模式：全部武器免費、全部角色解鎖（專屬版本用） */
      ownerMode: function () {
        save.ownerMode = true;
        D.HERO_IDS.forEach(function (id) { save.unlocked[id] = true; });
        if (!save.forgedWeapons) save.forgedWeapons = [];
        var have = {};
        save.forgedWeapons.forEach(function (w) { if (w && w.id) have[w.id] = true; });
        for (var t = 0; t <= 5; t++) {
          D.weaponsOfTier(t).forEach(function (id) {
            if (have[id]) return;
            save.forgedWeapons.push({ id: id, rarity: t, uid: 'own' + id + Date.now().toString(36) });
          });
        }
        if (!save.metaItems) save.metaItems = [];
        D.LEGEND_EQUIP.concat(D.MYTHIC_EQUIP).forEach(function (e) {
          if (save.metaItems.indexOf(e.id) < 0) save.metaItems.push(e.id);
        });
        save.gems = Math.max(save.gems || 0, 99999);
        save.ultimate = true;
        save.paidUnlock = true;
        writeSave();
        try { refreshShop(); } catch (e4) {}
        try { refreshTitle(); } catch (e5) {}
        try { refreshHeroes(); } catch (e6) {}
        return true;
      },
      grantPaid: function () {
        save.paidUnlock = true;
        D.HERO_IDS.forEach(function (id) {
          if (D.HEROES[id] && D.HEROES[id].paid) save.unlocked[id] = true;
        });
        if (!save.forgedWeapons) save.forgedWeapons = [];
        var hasChaos = save.forgedWeapons.some(function (w) { return w && w.id === 'chaos'; });
        if (!hasChaos) {
          save.forgedWeapons.push({ id: 'chaos', rarity: 5, uid: 'paid' + Date.now().toString(36) });
        }
        writeSave();
        try { refreshHeroes(); } catch (e1) {}
        try { refreshShop(); } catch (e2) {}
        try { refreshTitle(); } catch (e3) {}
        return true;
      },
      hitWallsAt: function (x, y, r) { return run ? hitWalls(x, y, r == null ? 14 : r, run.walls) : false; },
      interactDist: function () { return activePrompt ? activePrompt.dist : -1; },
      infoState: function () { return infoOpen; },
      unlockHero: tryUnlockHero,
      openInfo: function (id) { infoWeapon(id, 5); },
      closeInfo: hideInfo,
      ultimate: function () { return !!save.ultimate; },
      equipUnlockState: function () { return save.forgedEquip || {}; },
      buyEquipUnlock: buyEquipUnlock,
      forceForge: function (id) {
        if (!save.forgedWeapons) save.forgedWeapons = [];
        save.forgedWeapons.push({
          id: id, rarity: (WEAPONS[id] && WEAPONS[id].tier) || 4,
          uid: 'f' + Date.now().toString(36) + Math.floor(Math.random() * 9999)
        });
        checkUltimateUnlock();
        writeSave();
      },
      nukeFx: function () { return run ? run.nukes.length : 0; },
      nukesIn: function () { return run ? run.nukesIn.length : 0; },
      nukeCall: function () { return run && run.nukeCall ? run.nukeCall.t : 0; },
      nukeTarget: function () {
        if (run && run.nukeCall) return { x: run.nukeCall.x, y: run.nukeCall.y };
        return run && run.nukesIn[0] ? { x: run.nukesIn[0].x, y: run.nukesIn[0].y } : null;
      },
      roomCenter: function () { return { x: RW / 2, y: RH / 2 }; },
      fireOnce: function () { if (run && mode === 'play') shootOnce(run.player, run.player.weapon); },
      rewindAnim: function () { return run ? run.rewindAnim : 0; },
      hurt: function (n) { if (run && mode === 'play') { run.player.invuln = 0; hurtPlayer(n || 9999); } },
      rewind: function () { return run ? run.rewind : 0; },
      snapshots: function () { return run ? run.snapshots.length : 0; },
      bankRunKeys: bankRunKeys,
      keyTypes: function () { return save.keyTypes; },
      family: function (id) { return familyOf((WEAPONS[id] || {}).shape); },
      unlockPremium: function (id) {
        if (!save.premiumWeapons) save.premiumWeapons = {};
        save.premiumWeapons[id] = true;
        writeSave();
      },
      premiumOwned: function () { return save.premiumWeapons || {}; },
      shopBuy: buyPremium,
      shopState: function () { return { buying: shopBuying, pending: shopPending }; },
      buyMythic: buyMythic,
      buyForged: buyForged,
      forged: function () { return save.forgedWeapons || []; },
      weaponTiers: function () {
        var o = {};
        for (var t = 0; t <= 5; t++) o[t] = D.weaponsOfTier(t).length;
        return o;
      },
      behaviors: function () {
        var o = {};
        (run ? run.roster : []).forEach(function (sp) { o[sp.behavior] = (o[sp.behavior] || 0) + 1; });
        return o;
      },
      mythics: function () { return save.mythicWeapons || []; },
      getLoadout: function () { return save.loadout; },
      setLoadout: setLoadout,
      bossPattern: function () { return run && run.boss ? run.boss.pattern : null; },
      chargeUlt: function (v) { if (run) run.player.ultCharge = clamp(v == null ? 100 : v, 0, 100); },
      setKeys: function (n) { if (run) run.keys = { bronze: n | 0, silver: n | 0, gold: n | 0, mythic: n | 0 }; },
      keysTotal: function () { return totalKeys(run && run.keys); },
      secretDoor: function () { return run ? run.secretDoor : null; },
      enterSecret: enterSecret,
      rushState: function () { return run ? run.rush : null; },
      talents: function () { return run ? run.talents : null; },
      talentChoices: function () { return run ? run.talentChoices : null; },
      openTalents: openTalents,
      pickTalent: pickTalent,
      skipTalent: skipTalent,
      useUlt: useUlt,
      ultInfo: function () {
        if (!run) return null;
        var u = ULT[run.hero.id] || {};
        return { charge: run.player.ultCharge, name: u.name, kind: u.kind };
      },
      difficulty: function () { return run ? run.diff : null; },
      diffs: function () { return DIFFICULTY; },
      pickHero: function (id) {
        if (!HEROES[id]) return;
        heroSel = id;
        heroIdx = D.HERO_IDS.indexOf(id);
        refreshCarousel();
      }
    }
  };

  /* ------------------------------------------------------------------
     啟動
     ------------------------------------------------------------------ */
  resize();
  initTouch();
  Art.loadTextures();
  function paintVersionTag() {
    var el = $('verTag');
    if (!el) return;
    var v = (window.GAME_VERSION || '0.00.00');
    el.textContent = v;
    el.title = '點擊檢查更新';
  }

  /* 讓 updater.js 也能跳提示 */
  window.__toast = toast;
  /* 讓 updater.js 知道「玩家正在戰鬥中」，避免更新把進行中的一局踢掉 */
  window.__inRun = function () {
    return mode === 'play' || mode === 'chest' || mode === 'stageclear' || mode === 'talent' || mode === 'pause';
  };

  /* 把 14 張英雄素材依序套到角色上（其餘沿用程序化） */
  /* 11 隻新角色：把 spriteId 綁到對應英雄 id（其餘沿用舊貼圖） */
  (function bindHeroSprites() {
    var MAP = ['sable', 'cinder', 'nix', 'lumen', 'wraith', 'grub', 'thorne', 'hollow', 'ferrum', 'morrigan', 'vesper'];
    var ids = (D.HERO_IDS || Object.keys(HEROES)).slice();
    for (var hi = 0; hi < ids.length; hi++) {
      var hh = HEROES[ids[hi]];
      if (!hh || !hh.palette) continue;
      if (hi < MAP.length) hh.palette.spriteId = MAP[hi];
    }
  })();
  WEAPONS.chaos = PREMIUM;
  refreshTitle();
  drawTitleOrnaments();
  paintVersionTag();
  installButtonFx();
  /* 套用畫面品質設定 */
  (function applyQuality() {
    var q = (save.settings && save.settings.quality) || 'mid';
    QUALITY = q === 'high' ? 1.35 : (q === 'low' ? 0.55 : 1);
  })();
  /* 大廳 BGM：瀏覽器要求先有使用者互動才能播音 */
  (function armMenuMusic() {
    function kick() {
      try {
        if (SFX.setScene) SFX.setScene('menu');
        if (SFX.startMusic) SFX.startMusic();
      } catch (e) {}
      try {
        if (document.removeEventListener) document.removeEventListener('pointerdown', kick);
        if (document.removeEventListener) document.removeEventListener('keydown', kick);
      } catch (e) {}
    }
    try { if (SFX.setScene) SFX.setScene('menu'); } catch (e) {}
    try { if (SFX.startMusic) SFX.startMusic(); } catch (e) {}
    try {
      if (document.addEventListener) {
        document.addEventListener('pointerdown', kick);
        document.addEventListener('keydown', kick);
      }
    } catch (e) {}
  })();
  var skipLoading = DEMO || /[?&](nocine|screen=|demo=1)/.test(location.search);
  if (skipLoading) {
    mode = 'title';
    showScreen('screen-title');
    var lsk = $('loadingScreen');
    if (lsk) lsk.classList.add('hidden');
    if (!/[?&]nocine/.test(location.search) && !DEMO) startCine();
  } else {
    showScreen('none');
    mode = 'loading';
  }
  requestAnimationFrame(loop);
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { showScreen('none'); startCine(); }
  });

  if (DEMO) {
    var cm = location.search.match(/[?&]chapter=(\d+)/);
    var cIdx = cm ? Math.max(0, Math.min(CHAPTERS.length - 1, parseInt(cm[1], 10) - 1)) : 0;
    setTimeout(function () { startRun('knight', 'normal', cIdx); }, 60);
  }
  if (/[?&]screen=difficulty/.test(location.search)) {
    setTimeout(function () { menuMode('difficulty'); }, 50);
  }
  if (/[?&]screen=heroes/.test(location.search)) {
    setTimeout(function () { menuMode('heroes'); }, 50);
  }
  if (/[?&]screen=vault/.test(location.search)) {
    setTimeout(function () { menuMode('vault'); }, 50);
  }
  if (/[?&]screen=shop/.test(location.search)) {
    setTimeout(function () { menuMode('shop'); }, 50);
  }
  if (/[?&]screen=talents/.test(location.search)) {
    setTimeout(function () {
      startRun('knight', 'normal', 0);
      setTimeout(function () { openTalents(); }, 150);
    }, 50);
  }
  if (/[?&]screen=rewind/.test(location.search)) {
    setTimeout(function () {
      startRun('knight', 'normal', 0);
      setTimeout(function () { if (run) { run.player.invuln = 0; hurtPlayer(99999); } }, 400);
    }, 50);
  }
  if (/[?&]screen=nuke/.test(location.search)) {
    setTimeout(function () {
      save.ultimate = true;
      save.loadout = 'nova';
      startRun('knight', 'normal', 0);
      setTimeout(function () {
        if (run) {
          run.player.weapon = rollWeapon('nova', 4);
          shootOnce(run.player, run.player.weapon);
        }
      }, 300);
    }, 50);
  }
  if (/[?&]screen=upgrade/.test(location.search)) {
    save.gems = Math.max(save.gems, 3000);
    save.chapterUnlocked = Math.max(save.chapterUnlocked || 1, 6);
    setTimeout(function () { menuMode('upgrade'); }, 50);
  }
  if (/[?&]screen=info/.test(location.search)) {
    setTimeout(function () { menuMode('heroes'); setTimeout(function () { infoHero('knight'); }, 120); }, 50);
  }
  if (/[?&]screen=chapters/.test(location.search)) {
    setTimeout(function () { menuMode('chapters'); }, 50);
  }
  if (/[?&]screen=stage/.test(location.search)) {
    setTimeout(function () {
      startRun('knight', 'normal');
      setTimeout(function () { if (run) clearStage(); }, 200);
    }, 50);
  }
  /* 測試用：直接開一個金箱看三選一畫面 */
  if (/[?&]screen=chest/.test(location.search)) {
    setTimeout(function () {
      startRun('knight', 'normal');
      setTimeout(function () {
        if (run) {
          run.chest = { x: run.player.x, y: run.player.y - 20, open: false, tier: 2 };
          openChest(run.chest);
        }
      }, 150);
    }, 50);
  }
})();
