/* =========================================================
   pwa.js — PWA 註冊與 iOS「加入主畫面」提示
   - 只有 https / localhost 才會註冊 Service Worker（file:// 會自動跳過）
   - 不影響遊戲本身，任何錯誤都靜默處理
   ========================================================= */
(function () {
  'use strict';

  var status = { sw: false, standalone: false, ios: false, error: null };

  function isStandalone() {
    try {
      return window.navigator.standalone === true ||
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches);
    } catch (e) { return false; }
  }

  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  status.ios = isIOS;
  status.standalone = isStandalone();

  /* ---- 註冊 Service Worker ---- */
  var secure = location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';

  if ('serviceWorker' in navigator && secure) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' })
        .then(function (reg) {
          status.sw = true;
          status.reg = reg;
          /* 有新 SW 在等待 → 交給 Updater 顯示更新提示 */
          if (reg.waiting && window.Updater) window.Updater.check();
          reg.addEventListener && reg.addEventListener('updatefound', function () {
            var sw = reg.installing;
            if (!sw) return;
            sw.addEventListener('statechange', function () {
              if (sw.state === 'installed' && navigator.serviceWorker.controller && window.Updater) {
                window.Updater.check();
              }
            });
          });
          /* 每次回到前景就檢查有沒有新版本 */
          document.addEventListener('visibilitychange', function () {
            if (!document.hidden) { try { reg.update(); } catch (e) {} }
          });
        })
        .catch(function (err) { status.error = String(err); });
    });
  }

  /* ---- iOS Safari：提示加入主畫面（一次性） ---- */
  function showIOSTip() {
    if (!isIOS || status.standalone) return;
    var el = document.getElementById('iosTip');
    if (!el) return;
    var dismissed = false;
    try { dismissed = localStorage.getItem('abyssEcho.iosTip') === '1'; } catch (e) {}
    if (dismissed) return;
    setTimeout(function () { el.classList.remove('hidden'); }, 2600);
    var btn = document.getElementById('iosTipClose');
    if (btn) {
      btn.addEventListener('click', function () {
        el.classList.add('hidden');
        try { localStorage.setItem('abyssEcho.iosTip', '1'); } catch (e) {}
      });
    }
  }

  /* ---- Android / Chrome：安裝提示（可選） ---- */
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    status.canInstall = true;
  });

  status.install = function () {
    if (!deferredPrompt) return Promise.resolve(false);
    deferredPrompt.prompt();
    return deferredPrompt.userChoice.then(function (r) {
      deferredPrompt = null;
      return r && r.outcome === 'accepted';
    });
  };

  window.addEventListener('appinstalled', function () { status.canInstall = false; });

  /* ---- 直向提示已移除：改由 manifest 鎖定橫向 ---- */
  function initRotate() { /* no-op */ }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initRotate(); showIOSTip(); });
  } else {
    initRotate();
    showIOSTip();
  }

  window.__pwa = status;
})();
