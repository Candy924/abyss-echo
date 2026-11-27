/* =========================================================================
   updater.js — 雲端版本檢查 / 免清進度更新 / 存檔備份
   -------------------------------------------------------------------------
   核心原則：
   1. 更新只換「程式與素材快取」，**絕不碰 localStorage 的存檔**
   2. 玩家可以選擇立即更新或稍後
   3. 提供存檔匯出／匯入，換裝置或誤刪都能救回
   4. 提供 F2 開發者熱改面板（貼上 content.json 即刻生效）
   ========================================================================= */
window.Updater = (function () {
  'use strict';

  var BUILD_KEY = 'abyss.build';
  var CHECK_MS = 15 * 1000;   /* 每 15 秒檢查一次 */
  var remote = null;
  var reloading = false;

  function $(id) { return document.getElementById(id); }

  function toast(msg) {
    if (window.__toast) { try { window.__toast(msg); } catch (e) {} }
  }

  function localBuild() {
    try { return Number(localStorage.getItem(BUILD_KEY) || 0); } catch (e) { return 0; }
  }

  function fetchVersion() {
    return fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function showBar(v) {
    var bar = $('updateBar');
    if (bar) {
      var txt = $('updateText');
      if (txt) txt.textContent = '有新版本 v' + v.build + (v.notes ? ' · ' + v.notes : '');
      bar.classList.remove('hidden');
    }
    /* 左下角版本號直接變成「可更新」按鈕 */
    var tag = $('verTag');
    if (tag) {
      tag.classList.add('has-update');
      tag.textContent = '↑ ' + (v.version || ('v' + v.build)) + ' 可更新';
      tag.title = '點擊立即更新';
    }
    toast('有新版本 ' + (v.version || v.build) + '，點左下角更新');
  }

  function hideBar() {
    var bar = $('updateBar');
    if (bar) bar.classList.add('hidden');
    var tag = $('verTag');
    if (tag) {
      tag.classList.remove('has-update');
      tag.textContent = window.GAME_VERSION || '0.00.00';
      tag.title = '點擊檢查更新';
    }
  }

  /* 只清快取與 SW，不動存檔 */
  function applyUpdate(auto) {
    if (reloading) return;
    reloading = true;
    hideBar();
    try {
      if (auto) sessionStorage.setItem('abyss.autoUpdated', '1');
      localStorage.setItem(BUILD_KEY, String(remote ? remote.build : Date.now()));
      if (remote && remote.version) sessionStorage.setItem('abyss.updatedTo', remote.version);
    } catch (e) {}
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      try {
        /* 加上時間戳，強制瀏覽器跟伺服器要最新的 HTML 與程式 */
        var base = location.pathname + '?u=' + Date.now();
        if (location.hash) base += location.hash;
        location.replace(base);
      } catch (e) {
        try { location.reload(); } catch (e2) {}
      }
    }
    var jobs = [];
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.unregister(); }));
        }).catch(function () {}));
      }
    } catch (e) {}
    try {
      if (window.caches) {
        jobs.push(caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (k) { return caches.delete(k); }));
        }).catch(function () {}));
      }
    } catch (e) {}
    Promise.all(jobs).then(finish, finish);
    setTimeout(finish, 1500);
  }

  function check() {
    return fetchVersion().then(function (v) {
      if (!v || !v.build) return;
      remote = v;
      /* 版本號以伺服器為準（左下角顯示） */
      try {
        var tag = $('verTag');
        if (tag && v.version && !tag.classList.contains('has-update')) tag.textContent = v.version;
      } catch (e) {}
      var local = null;
      try { local = localStorage.getItem(BUILD_KEY); } catch (e) {}
      if (!local) {
        try { localStorage.setItem(BUILD_KEY, String(v.build)); } catch (e2) {}
        return;
      }
      var localVer = window.GAME_VERSION || '';
      /* 兩種情況都要更新：build 較新，或「畫面上跑的版本」跟伺服器不一樣（PWA 卡舊檔） */
      var needUpdate = Number(v.build) > Number(local);
      if (!needUpdate && v.version && localVer && v.version !== localVer) needUpdate = true;
      if (needUpdate) selfHeal(v);
    });
  }

  /* 已加入主畫面的 PWA 常常卡在舊的 JS，這裡做「自我修復」：
     偵測到跑的版本跟伺服器不同，就自動清快取重載（每個版本只做一次，避免迴圈） */
  function selfHeal(v) {
    /* 戰鬥中不要自動重載，只顯示提示，讓玩家自己選擇 */
    if (window.__inRun && window.__inRun()) { showBar(v); return; }
    var key = 'abyss.healedFor';
    var done = '';
    try { done = sessionStorage.getItem(key) || ''; } catch (e) {}
    if (done === String(v.version || v.build)) { showBar(v); return; }
    try { sessionStorage.setItem(key, String(v.version || v.build)); } catch (e) {}
    showBar(v);
    applyUpdate(true);
  }

  /* ---------------- 存檔備份 ---------------- */
  function collectSaves() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('abyss') === 0) out[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return out;
  }

  function exportSave() {
    var payload = { game: 'abyss-echo', at: new Date().toISOString(), saves: collectSaves() };
    var text = JSON.stringify(payload, null, 2);
    try {
      var blob = new Blob([text], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'abyss-save-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      return true;
    } catch (e) {
      try { navigator.clipboard.writeText(text); return true; } catch (e2) { return false; }
    }
  }

  function importSave(text) {
    try {
      var j = JSON.parse(text);
      var saves = j.saves || j;
      var n = 0;
      Object.keys(saves).forEach(function (k) {
        if (k.indexOf('abyss') === 0 && typeof saves[k] === 'string') {
          localStorage.setItem(k, saves[k]);
          n++;
        }
      });
      return n > 0;
    } catch (e) { return false; }
  }

  /* ---------------- F2 開發者熱改面板 ---------------- */
  function openDevPanel() {
    var old = $('devPatch');
    if (old) { old.remove(); return; }
    var box = document.createElement('div');
    box.id = 'devPatch';
    box.innerHTML =
      '<h4>開發者熱改（貼上 content.json 內容）</h4>' +
      '<textarea id="devPatchText" spellcheck="false">{ "weapons": { "chaos": { "dmg": 80 } } }</textarea>' +
      '<div class="dev-btns">' +
      '<button id="devApply">套用</button>' +
      '<button id="devClose">關閉</button>' +
      '</div>' +
      '<p id="devMsg"></p>';
    document.body.appendChild(box);
    var close = $('devClose');
    if (close) close.addEventListener('click', function () { box.remove(); });
    var apply = $('devApply');
    if (apply) apply.addEventListener('click', function () {
      var msg = $('devMsg');
      try {
        var json = JSON.parse($('devPatchText').value);
        var n = window.Content ? window.Content.apply(json) : 0;
        if (msg) msg.textContent = '已套用 ' + n + ' 個欄位（重新開始一局生效）';
        try { localStorage.setItem('abyss.devPatch', JSON.stringify(json)); } catch (e) {}
      } catch (e) {
        if (msg) msg.textContent = 'JSON 格式錯誤';
      }
    });
  }

  /* ---------------- 啟動 ---------------- */
  function boot() {
    check();
    setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) check();
    });
    /* 已加入主畫面的 PWA：從背景回來 / 前進後退快取還原時也要檢查 */
    window.addEventListener('pageshow', function (ev) { check(); });
    window.addEventListener('focus', function () { check(); });
    window.addEventListener('online', function () { check(); });
    var btn = $('btnUpdateNow');
    if (btn) btn.addEventListener('click', applyUpdate);
    var later = $('btnUpdateLater');
    if (later) later.addEventListener('click', hideBar);
    /* 左下角版本號也能直接更新（有新版本時） */
    var tag = $('verTag');
    if (tag) {
      tag.addEventListener('click', function () {
        if (remote && Number(remote.build) > localBuild()) { applyUpdate(); return; }
        toast('檢查中…');
        check().then(function () {
          if (remote && Number(remote.build) > localBuild()) toast('找到新版本，點左下角更新');
          else toast('已是最新版本');
        });
      });
    }
    /* 剛更新完的提示 */
    try {
      var autoOk = sessionStorage.getItem('abyss.autoUpdated');
      if (autoOk) {
        sessionStorage.removeItem('abyss.autoUpdated');
        setTimeout(function () { toast('已自動更新到最新版本'); }, 900);
      }
      var done = sessionStorage.getItem('abyss.updatedTo');
      if (done) {
        sessionStorage.removeItem('abyss.updatedTo');
        setTimeout(function () { toast('已更新至 ' + done); }, 1200);
      }
    } catch (e) {}
    /* 新 Service Worker 接手時自動重載一次（不清存檔） */
    try {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (!reloading) { reloading = true; location.reload(); }
        });
      }
    } catch (e) {}
    /* 開發者熱改：先套用上次的覆寫 */
    try {
      var saved = localStorage.getItem('abyss.devPatch');
      if (saved && window.Content) window.Content.apply(JSON.parse(saved));
    } catch (e) {}
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'F2') { ev.preventDefault(); openDevPanel(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return {
    check: check,
    apply: applyUpdate,
    exportSave: exportSave,
    importSave: importSave,
    devPanel: openDevPanel
  };
})();
