/* =========================================================================
   content.js — 雲端內容包（熱更新數值，不用重新部署 JS）
   -------------------------------------------------------------------------
   玩法：把 content.json 放到網站根目錄（或任何網址），玩家下次開啟時
   遊戲會自動抓取並套用到 DATA，平衡性調整不必重新打包 HTML/JS。

   支援：
   - 同網域：content.json（預設）
   - 自訂網址：?content=https://xxx/content.json
   - 管理員開發者覆寫：localStorage['abyss.contentUrl']
   ========================================================================= */
window.Content = (function () {
  'use strict';

  var loaded = false;
  var raw = null;

  function url() {
    try {
      var q = location.search.match(/[?&]content=([^&]+)/);
      if (q) return decodeURIComponent(q[1]);
      var saved = localStorage.getItem('abyss.contentUrl');
      if (saved) return saved;
    } catch (e) {}
    return 'content.json';
  }

  /* 只允許修改「數值」，避免遠端內容塞入惡意程式碼 */
  function applyWeapons(list, D) {
    if (!list) return 0;
    var n = 0;
    for (var id in list) {
      var w = D.WEAPONS[id];
      if (!w) continue;
      var patch = list[id];
      for (var k in patch) {
        var v = patch[k];
        if (typeof v !== 'number' && typeof v !== 'string' && typeof v !== 'boolean') continue;
        if (k === 'id' || k === 'name' || k === 'shape') continue; /* 不覆寫識別欄位 */
        w[k] = v;
        n++;
      }
    }
    return n;
  }

  function applyEnemies(list, D) {
    if (!list) return 0;
    var n = 0;
    for (var id in list) {
      var e = D.ENEMIES[id];
      if (!e) continue;
      for (var k in list[id]) {
        var v = list[id][k];
        if (typeof v === 'number') { e[k] = v; n++; }
      }
    }
    return n;
  }

  function applyTalents(list, D) {
    if (!list) return 0;
    var n = 0;
    (D.TALENTS || []).forEach(function (t) {
      var p = list[t.id];
      if (!p) return;
      for (var k in p) {
        if (k === 'id') continue;
        if (typeof p[k] === 'number') { t[k] = p[k]; n++; }
      }
    });
    return n;
  }

  function applyDiff(list, D) {
    if (!list) return 0;
    var n = 0;
    (D.DIFFICULTY || []).forEach(function (d) {
      var p = list[d.id];
      if (!p) return;
      for (var k in p) {
        if (typeof p[k] === 'number') { d[k] = p[k]; n++; }
      }
    });
    return n;
  }

  function applyChests(list, D) {
    if (!list) return 0;
    var n = 0;
    (D.CHESTS || []).forEach(function (c, i) {
      var p = list[i] || list[c.id];
      if (!p) return;
      for (var k in p) {
        if (typeof p[k] === 'number' || typeof p[k] === 'string') { c[k] = p[k]; n++; }
      }
    });
    return n;
  }

  /* 套用一份內容包（物件），回傳套用的欄位數 */
  function apply(pack) {
    var D = window.DATA;
    if (!D || !pack) return 0;
    var n = 0;
    n += applyWeapons(pack.weapons, D);
    n += applyEnemies(pack.enemies, D);
    n += applyTalents(pack.talents, D);
    n += applyDiff(pack.difficulty, D);
    n += applyChests(pack.chests, D);
    /* 全域倍率（讓管理者調難度不必改每個敵人） */
    if (pack.balance) {
      D.BALANCE = Object.assign(D.BALANCE || {}, pack.balance);
      n += Object.keys(pack.balance).length;
    }
    raw = pack;
    return n;
  }

  function fetchAndApply() {
    var target = url();
    var bust = target + (target.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
    return fetch(bust, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        if (json) {
          var n = apply(json);
          try { localStorage.setItem('abyss.contentApplied', String(n)); } catch (e) {}
        }
        loaded = true;
      })
      .catch(function () { loaded = true; });
  }

  var p = fetchAndApply();
  /* 最多等 1.2 秒，避免離線或網路慢時卡住遊戲 */
  var ready = Promise.race([p, new Promise(function (r) { setTimeout(r, 1200); })]);

  return {
    apply: apply,
    ready: ready,
    isLoaded: function () { return loaded; },
    source: url,
    last: function () { return raw; }
  };
})();
